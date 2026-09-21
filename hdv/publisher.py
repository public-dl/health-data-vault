"""Build candidates, validate, then explicitly approve immutable releases.

Collection/normalization never call approval. A candidate is not a public release.
"""
import argparse
import copy
import json
import shutil
import tempfile
from contextlib import contextmanager
from pathlib import Path

from .common import CONFIG, atomic_write, checked_path, digest, now, read_json, read_jsonl, write_json
from .insights import explain
from .normalizer import MUNICIPAL_SCOPE
from .public_validator import validate_public
from .validator import validate
from .rates import attach_rates
from .groups import group_evidence

PUBLIC_CONFIG = Path(__file__).parent / 'public_config/indicators.json'
GROUP_CONFIG = Path(__file__).parent / 'public_config/groups.json'


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)+'\n').encode()


@contextmanager
def locked(root):
    root = Path(root); root.mkdir(parents=True, exist_ok=True)
    path = root / '.publication.lock'
    with path.open('x', encoding='utf8') as f:
        f.write(now())
    try:
        yield
    finally:
        path.unlink()


def verified_records(root, run_id):
    run = checked_path(root, 'processed/'+run_id)
    # Validate copies, so building/reviewing never rewrites the input run.
    with tempfile.TemporaryDirectory(prefix='hdv-public-validate-') as directory:
        output = Path(directory)
        for name in ('collection.json', 'run.json', 'records.jsonl'):
            shutil.copyfile(run/name, output/name)
        report = validate(root, output)
        if report['errors'] or report['status'] not in ('passed', 'passed_with_warnings'):
            raise ValueError('Source validation failed')
        return read_jsonl(output/'validated_records.jsonl'), report


def make_payload(records, source_report, map_data, settings, registry, run_id, group_settings=None):
    selected = [s['indicator_id'] for s in settings]
    if not selected or len(selected) != len(set(selected)):
        raise ValueError('Empty/duplicate public indicator settings')
    registry = {i['indicator_id']: i for i in registry}
    for id in selected:
        if id not in registry or registry[id]['comparability_status'] != 'compatible':
            raise ValueError('Not compatible in the source definition registry: '+id)
    rows = [dict(r) for r in records if r['included'] and r['geography_level'] in ('municipality','prefecture_total')
            and r['indicator_id'] in selected]
    if not rows:
        raise ValueError('No public records')
    code_by_name = {f['properties']['name']: f['properties']['code'] for f in map_data['features']}
    if len(code_by_name) != len(map_data['features']):
        raise ValueError('Duplicate map names')
    names = {r['geography_name'] for r in rows if r['geography_level'] == 'municipality'}
    if names != set(code_by_name):
        raise ValueError('Map/statistical municipality mismatch')
    geos = {('prefecture_total', '県計'): dict(code='15', name='新潟県（県計）', original_name='県計', level='prefecture_total')}
    for name in names:
        geos[('municipality', name)] = dict(code=code_by_name[name], name=name, original_name=name, level='municipality')
    for r in rows:
        r['geography_code'] = geos[(r['geography_level'], r['geography_name'])]['code']
        r['record_id'] = digest(encoded([r['source_sha256'], r['source_sheet'], r['source_cell']]))[:24]
    rows.sort(key=lambda r: (r['indicator_id'], r['geography_code'], r['observation_fiscal_year']))
    denominators = attach_rates(rows, records, settings)
    years = sorted({r['observation_fiscal_year'] for r in rows})
    indicators = []
    insights = []
    for setting in settings:
        id = setting['indicator_id']
        source = registry[id]
        subset = [r for r in rows if r['indicator_id'] == id]
        # Fixed across years; classify reported counts, never a risk threshold.
        maximum = max((r['value'] for r in subset if r['geography_level'] == 'municipality'
                       and r['value_state'] in ('numeric','zero')), default=0)
        step = max(1, int((maximum+4)//5))
        indicators.append(dict(setting, unit=source['unit'], statistic='reported_count',
                               comparability_status=source['comparability_status'], intervals=source['intervals'],
                               map_breaks=[step*n for n in range(1,5)]))
        for geo in sorted(geos.values(), key=lambda g:g['code']):
            subset_geo = [r for r in subset if r['geography_code'] == geo['code']]
            for year in years:
                insights.append(dict(indicator_id=id, geography_code=geo['code'], observation_fiscal_year=year,
                                     measure='count',
                                     **explain([r for r in subset_geo if r['observation_fiscal_year'] <= year], geo['name'], source['unit'])))
                if setting.get('rate'):
                    rate_rows = [dict(r, **r['derived_rate']) for r in subset_geo if r['observation_fiscal_year'] <= year]
                    for r in rate_rows:
                        r['record_id'] += ':recipient_percentage'
                    insights.append(dict(indicator_id=id, geography_code=geo['code'], observation_fiscal_year=year,
                                         measure='rate', **explain(rate_rows, geo['name'], '%')))
    payload = dict(schema_version='public-2', input_run_id=run_id, population_scope=MUNICIPAL_SCOPE,
                years=years, indicators=indicators, geographies=sorted(geos.values(), key=lambda g:g['code']),
                records=rows, denominator_records=denominators, map=map_data, insights=insights,
                source_validation=dict(status=source_report['status'], errors=source_report['errors'],
                                       warnings=source_report['warnings'], regression=source_report['province_regression']['passed']),
                warnings=[f"入力全体には{source_report['warnings']}件の検証警告があります。公開候補の選択条件とは別に確認してください。",
                          map_data['metadata']['notice'],
                          '割合は当該報告の受診者に占める構成割合です。判定不能を分母に含みます。年齢・性別構成を調整した割合や疾病有病率ではありません。'])

    if group_settings is not None:
        payload['schema_version'] = 'public-3'
        payload['indicator_groups'] = copy.deepcopy(group_settings)
        by_id = {i['indicator_id']: i for i in indicators}
        for group in payload['indicator_groups']:
            for category in group['categories']:
                category['count_map_breaks'] = by_id[category['indicator_id']]['map_breaks']
        payload['composition_validation'] = group_evidence(payload)
    return payload


def build(root, run_id, geography, settings_path=PUBLIC_CONFIG, groups_path=GROUP_CONFIG):
    root = Path(root)
    records, report = verified_records(root, run_id)
    settings, map_data = read_json(settings_path), read_json(geography)
    group_bytes = Path(groups_path).read_bytes()
    payload = make_payload(records, report, map_data, settings, read_json(CONFIG/'indicators.json'), run_id, json.loads(group_bytes))
    result = validate_public(payload)
    if result['errors']:
        raise ValueError(result)
    content = encoded(payload); sha = digest(content)
    directory = root/'public/candidates'/sha
    with locked(root/'public'):
        if not directory.exists():
            directory.mkdir(parents=True)
            atomic_write(directory/'data.json', content)
            atomic_write(directory/'groups.json', group_bytes)
            write_json(directory/'manifest.json', dict(release_id=sha, data_sha256=sha, input_run_id=run_id,
                created_at=now(), settings_path=str(Path(settings_path).resolve()), settings_sha256=digest(Path(settings_path).read_bytes()),
                groups_sha256=digest(group_bytes),
                geography_path=str(Path(geography).resolve()), geography_sha256=digest(Path(geography).read_bytes()), status='candidate'))
            write_json(directory/'validation.json', result)
    return sha, result


def inspect(root, release_id):
    root = Path(root)
    if len(release_id) != 64 or any(c not in '0123456789abcdef' for c in release_id):
        raise ValueError('Invalid release identifier')
    directory = checked_path(root, 'public/candidates/'+release_id)
    manifest = read_json(directory/'manifest.json')
    data = (directory/'data.json').read_bytes()
    if digest(data) != release_id or manifest['data_sha256'] != release_id or manifest['release_id'] != release_id:
        raise ValueError('Candidate hash mismatch')
    for key in ('settings','geography'):
        if digest(Path(manifest[key+'_path']).read_bytes()) != manifest[key+'_sha256']:
            raise ValueError('Build input changed: '+key)
    group_settings = None
    if 'groups_sha256' in manifest:
        group_bytes = (directory/'groups.json').read_bytes()
        if digest(group_bytes) != manifest['groups_sha256']:
            raise ValueError('Group config snapshot changed')
        group_settings = json.loads(group_bytes)
    records, report = verified_records(root, manifest['input_run_id'])
    expected = make_payload(records, report, read_json(manifest['geography_path']), read_json(manifest['settings_path']),
                            read_json(CONFIG/'indicators.json'), manifest['input_run_id'], group_settings)
    payload = json.loads(data)
    result = validate_public(payload, expected)
    if result['errors']:
        raise ValueError(result)
    return payload, result


def approve(root, release_id, reviewer, confirm_hash, data_rights_reviewed=False, map_rights_reviewed=False):
    """Explicit human action; must never be called from a collection/scheduled pipeline."""
    if not reviewer.strip() or confirm_hash != release_id:
        raise ValueError('Named human reviewer and exact reviewed hash are required')
    if not data_rights_reviewed or not map_rights_reviewed:
        raise ValueError('Data and geography reuse conditions require human review')
    root = Path(root)
    with locked(root/'public'):
        payload, report = inspect(root, release_id)
        approval = dict(status='approved', release_id=release_id, data_sha256=release_id,
                        reviewer=reviewer, approved_at=now(), data_rights_reviewed=True, map_rights_reviewed=True,
                        validation=report)
        release = root/'public/releases'/release_id
        if release.exists():
            if digest((release/'data.json').read_bytes()) != release_id:
                raise ValueError('Existing release corrupt')
            approval = read_json(release/'approval.json')
        else:
            release.mkdir(parents=True)
            atomic_write(release/'data.json', encoded(payload))
            write_json(release/'approval.json', approval)
        # Atomic pointer update only after explicit review, never from build/validate.
        write_json(root/'public/current.json', approval)
    return approval


def approved(root):
    root = Path(root)
    pointer = read_json(root/'public/current.json')
    release = checked_path(root, 'public/releases/'+pointer['release_id'])
    if pointer['status'] != 'approved' or read_json(release/'approval.json') != pointer:
        raise ValueError('Approval mismatch')
    content = (release/'data.json').read_bytes()
    if digest(content) != pointer['data_sha256'] or pointer['data_sha256'] != pointer['release_id']:
        raise ValueError('Approved release was modified')
    return pointer, content


def export(root, target):
    pointer, content = approved(root)
    target = Path(target)
    atomic_write(target/'releases'/(pointer['release_id']+'.json'), content)
    write_json(target/'current.json', pointer)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('command', choices=['build','validate','approve','export'])
    p.add_argument('--data-dir', type=Path, default=Path('data'))
    p.add_argument('--run-id'); p.add_argument('--release-id')
    p.add_argument('--geography', type=Path, default=Path('data/geography/niigata.json'))
    p.add_argument('--reviewer', default=''); p.add_argument('--confirm-hash', default='')
    p.add_argument('--data-rights-reviewed', action='store_true'); p.add_argument('--map-rights-reviewed', action='store_true')
    p.add_argument('--target', type=Path, default=Path('web/public/public-data'))
    a = p.parse_args()
    try:
        if a.command == 'build':
            if not a.run_id: p.error('--run-id is required; processed/latest is not an approval')
            result = build(a.data_dir, a.run_id, a.geography)
        elif a.command == 'validate': result = inspect(a.data_dir, a.release_id)[1]
        elif a.command == 'approve': result = approve(a.data_dir, a.release_id, a.reviewer, a.confirm_hash, a.data_rights_reviewed, a.map_rights_reviewed)
        else: export(a.data_dir, a.target); result = {'exported':str(a.target)}
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except (ValueError, OSError, KeyError, TypeError) as e:
        p.exit(1, str(e)+'\n')


if __name__ == '__main__': main()
