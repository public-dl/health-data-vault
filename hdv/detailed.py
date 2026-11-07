"""Opt-in detailed-examination counts; never derive rates or temporal permissions."""
import copy
from .common import digest
from .publisher import encoded
from .site_release import require
from .count_publication import CAPABILITIES

VERSION = 'detailed-healthcheck-counts-v1'
MEMBERS = [
    ('anemia', '貧血検査：判定人数', 'AG', '人'),
    ('anemia_tests', '貧血検査：実施件数', 'AJ', '件'),
    ('ecg', '心電図検査：判定人数', 'AH', '人'),
    ('ecg_tests', '心電図検査：実施件数', 'AK', '件'),
    ('fundus', '眼底検査：判定人数', 'AI', '人'),
    ('fundus_tests', '眼底検査：実施件数', 'AL', '件'),
]
IDS = {m[0] for m in MEMBERS}
NOTE = ('詳細な健診項目の原表掲載値です。判定人数（人）は「判定区分（保健指導以上を再掲）」、'
        '実施件数（件）は「実施件数」の別集計です。合計や相互の置換は行いません。'
        '参考の特定健診受診者数は各検査の実施件数とは異なり、割合の分母として使用していません。'
        '検査の選択的実施・集計対象範囲の確認が残るため、割合・地域差・年度間の増減評価は表示しません。'
        '眼底の単独データは健診本体と結合できない場合に除外されます。'
        '心電図の判定基準は2022→2023年度で変更されており、この区間は比較不可です。')


def without_extension(site):
    """Restore the exact base before running its existing, stricter validators."""
    result = copy.deepcopy(site)
    if 'detailed_extension' not in result:
        return result
    result.pop('detailed_extension')
    data = result['reported']
    data['indicators'] = [i for i in data['indicators'] if i['indicator_id'] not in IDS]
    data['records'] = [r for r in data['records'] if r['indicator_id'] not in IDS]
    data['insights'] = [i for i in data['insights'] if i['indicator_id'] not in IDS]
    for table in result['published_tables']:
        for row in table['rows']:
            for cell in row['cells']:
                if (cell.get('visualization') or {}).get('indicator_id') in IDS:
                    cell['visualization'] = None
    return result


def extend(site, raw_records):
    require('detailed_extension' not in site, 'duplicate detailed extension')
    require(site['reported']['schema_version'] == 'reported-annual-6', 'detailed requires count-only base')
    result = copy.deepcopy(site)
    data = result['reported']
    require(not IDS.intersection(i['indicator_id'] for i in data['indicators']), 'duplicate detailed indicators')
    require(data['years'] == [2021, 2022, 2023], 'unaudited detailed years')
    # included excludes the repeated Niigata City row (51), never sum both rows.
    source = {}
    for r in raw_records:
        if r['included'] and r['indicator_id'] in IDS:
            key = (r['observation_fiscal_year'], r['geography_name'], r['indicator_id'])
            require(key not in source, 'duplicate detailed source')
            source[key] = r
    geos = {g['code']: g for g in data['geographies']}
    recipients = {(d['observation_fiscal_year'], d['geography_code']): d for d in data['denominator_records']}
    rows = []
    for geo in data['geographies']:
        require(geo['level'] in ('prefecture_total', 'municipality', 'health_center_area'), 'unknown detailed geography')
        identity = geo.get('identity_municipality')
        name = geos[identity]['original_name'] if identity else geo['original_name']
        for year in data['years']:
            denominator = recipients[(year, geo['code'])]
            for id, label, column, unit in MEMBERS:
                r = copy.deepcopy(source[(year, name, id)])
                require(r['source_row'] != 51 and r['source_cell'] == column+str(r['source_row']), 'detailed source column/duplicate row')
                require(r['unit'] == unit, 'detailed unit changed')
                require(r['value_state'] in ('numeric', 'zero', 'blank'), 'unknown detailed missing state')
                if r['value_state'] == 'blank':
                    require(r['value'] is None and r['validation_status'] == 'warning', 'invalid detailed missing value')
                else:
                    require(type(r['value']) is int and r['value'] >= 0 and r['validation_status'] == 'passed', 'invalid detailed count')
                intervals = {'2021_2022': 'pending', '2022_2023': 'incompatible' if id == 'ecg' else 'pending'}
                require(r['comparability_intervals'] == intervals and not r['comparison_allowed'], 'detailed temporal permission changed')
                require(r['comparability_status'] == ('incompatible' if id == 'ecg' else 'pending'), 'detailed temporal status changed')
                require(not any(k in r for k in ('derived_rate', 'derivation', 'percentage')), 'unauthorized detailed rate')
                for field in ('source_sha256', 'source_sheet', 'population_scope', 'publication_fiscal_year'):
                    require(r[field] == denominator[field], 'detailed/reference mismatch: '+field)
                r.update(geography_code=geo['code'], geography_name=geo['name'], geography_level=geo['level'],
                         record_id=digest(encoded([r['source_sha256'], r['source_sheet'], r['source_cell'], geo['code']]))[:24],
                         display_contract='reported-annual-6', source_count_contract=VERSION,
                         annual_display_allowed=True, comparison_allowed=False, regional_difference_allowed=False,
                         denominator_record_id=denominator['record_id'])
                if geo['level'] == 'health_center_area':
                    r.update(value_origin='municipality_identity_mapping' if identity else 'official_health_center_total',
                             mapping_reference=geo['code'])
                rows.append(r)
    # Check totals for each field separately; never add persons to examination counts.
    for year in data['years']:
        for id in IDS:
            subset = {r['geography_code']: r for r in rows if r['observation_fiscal_year'] == year and r['indicator_id'] == id}
            county = next(r for r in subset.values() if r['geography_level'] == 'prefecture_total')
            children = [r for r in subset.values() if r['geography_level'] == 'municipality']
            if county['value'] is not None and all(r['value'] is not None for r in children):
                require(county['value'] == sum(r['value'] for r in children), 'detailed prefecture sum mismatch')
            for geo in data['geographies']:
                if geo['level'] != 'health_center_area' or geo.get('identity_municipality'):
                    continue
                parent = subset[geo['code']]
                children = [subset[c] for c in geo['children']]
                if parent['value'] is not None and all(r['value'] is not None for r in children):
                    require(parent['value'] == sum(r['value'] for r in children), 'detailed health center sum mismatch')
    for id, label, column, unit in MEMBERS:
        hierarchy = ['詳細な健診項目', '実施件数' if unit == '件' else '判定区分（保健指導以上を再掲）', label.split('：')[0]]
        data['indicators'].append(dict(indicator_id=id, name=label, public_label=label, short_label=label,
            group='detailed', theme_id='detailed', theme_label='詳細な健診項目', source_count_contract=VERSION,
            source_column=column, unit=unit, description=NOTE, source_notice=NOTE, data_notes=NOTE,
            source_hierarchy=hierarchy, count_label='実施件数' if unit == '件' else '判定人数',
            recipient_label='特定健診受診者数', visualization_type='reported_count', map_breaks=[],
            overview_label='検査の掲載値をひと目で見る', capabilities=dict(CAPABILITIES),
            color='#7B64C8', intervals={'2021_2022': 'pending', '2022_2023': 'incompatible' if id == 'ecg' else 'pending'}))
    data['records'].extend(rows)
    labels = {id: label for id, label, _, _ in MEMBERS}
    for r in rows:
        value = '欠損（原表空欄）' if r['value'] is None else f"{r['value']:,}{r['unit']}"
        data['insights'].append(dict(indicator_id=r['indicator_id'], geography_code=r['geography_code'],
            observation_fiscal_year=r['observation_fiscal_year'], measure='count', generator=VERSION,
            text=f"{r['observation_fiscal_year']}年度の{r['geography_name']}：{labels[r['indicator_id']]} {value}。年度間の増減評価は行いません。"))
    lookup = {(r['source_sha256'], r['source_sheet'], r['source_cell']): r for r in rows if r['geography_level'] != 'health_center_area'}
    for table in result['published_tables']:
        for row in table['rows']:
            for cell in row['cells']:
                r = lookup.get((table['source']['sha256'], table['source_sheet'], cell['coordinate']))
                if r:
                    require(cell.get('visualization') is None, 'overlapping detailed table link')
                    cell['visualization'] = dict(indicator_id=r['indicator_id'], region=r['geography_code'], section='table')
    result['detailed_extension'] = dict(version=VERSION, indicators=[m[0] for m in MEMBERS], records=len(rows),
        source_reference='docs/detailed_healthcheck_v1.md', rate_allowed=False, temporal_comparison_allowed=False)
    require(len(rows) == 6*3*len(geos), 'incomplete detailed coverage')
    return result
