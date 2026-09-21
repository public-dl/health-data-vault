"""Fail-closed validation of a public candidate against independently rebuilt inputs."""
import math
from .rates import derive
from .groups import group_evidence


def validate_public(payload, expected=None):
    errors = []
    def check(condition, message):
        if not condition:
            errors.append(message)
    check(payload.get('schema_version') in ('public-2', 'public-3'), 'schema_version')
    indicators = payload.get('indicators', [])
    ids = [i['indicator_id'] for i in indicators]
    check(bool(ids) and len(ids) == len(set(ids)), 'indicator_ids')
    geos = payload.get('geographies', [])
    codes = [g['code'] for g in geos]
    check(len(codes) == len(set(codes)), 'geography_codes')
    check(sum(g['level'] == 'prefecture_total' for g in geos) == 1, 'province_count')
    features = payload.get('map', {}).get('features', [])
    map_codes = [f['properties']['code'] for f in features]
    check(len(map_codes) == len(set(map_codes)), 'duplicate_map_feature')
    check(set(map_codes) == {g['code'] for g in geos if g['level'] == 'municipality'}, 'map_coverage')
    for f in features:
        check(f['geometry']['type'] in ('Polygon', 'MultiPolygon') and bool(f['geometry']['coordinates']), 'map_geometry')
    years = payload.get('years', [])
    check(bool(years) and years == sorted(set(years)), 'years')
    seen = set()
    registry = {i['indicator_id']: i for i in indicators}
    all_rows = payload.get('records', []) + payload.get('denominator_records', [])
    groups = {}
    for r in all_rows:
        group = groups.setdefault((r['observation_fiscal_year'], r['geography_code']), {})
        check(r['indicator_id'] not in group, 'duplicate_rate_input')
        group[r['indicator_id']] = r
    used_denominators = set()
    for r in payload.get('records', []):
        key = (r['observation_fiscal_year'], r['geography_code'], r['indicator_id'])
        check(key not in seen, 'duplicate_record'); seen.add(key)
        check(key[0] in years and key[1] in codes and key[2] in ids, 'unknown_dimension')
        check(r['included'] and r['selection_status'] == 'included', 'excluded_record')
        check(r['comparability_status'] == 'compatible', 'comparison_status')
        check(r['unit'] == registry.get(key[2], {}).get('unit'), 'unit')
        check(r['population_scope'] == payload.get('population_scope'), 'population')
        if r['value_state'] in ('numeric', 'zero'):
            check(isinstance(r['value'], (int, float)) and not isinstance(r['value'], bool)
                  and math.isfinite(r['value']) and r['value'] >= 0, 'numeric_value')
            check(r['validation_status'] == 'passed' and r['comparison_allowed'], 'unvalidated_numeric')
        else:
            check(r['value'] is None and not r['comparison_allowed'], 'missing_value')
        check(all(r.get(k) for k in ('source_url', 'source_sheet', 'source_cell', 'source_sha256', 'definition_version')), 'provenance')
        policy = registry.get(key[2], {}).get('rate')
        if policy:
            try:
                calculated = derive(r, groups[key[:2]], policy)
                check(r.get('derived_rate') == calculated, 'derived_rate_mismatch')
                used_denominators.add(calculated['denominator_record_id'])
                for a,b in zip(years, years[1:]):
                    check(policy['intervals'].get(f'{a}_{b}') == 'compatible', 'rate_comparison_interval')
            except (ValueError, KeyError, TypeError):
                check(False, 'invalid_rate_inputs')
        else:
            check('derived_rate' not in r, 'unconfigured_rate')
    check(used_denominators == {r['record_id'] for r in payload.get('denominator_records', [])}, 'denominator_coverage')
    for d in payload.get('denominator_records', []):
        check(all(d.get(k) for k in ('source_url','source_sheet','source_cell','source_sha256','definition_version','record_id')), 'denominator_provenance')
    check(seen == {(y,g,i) for y in years for g in codes for i in ids}, 'record_coverage')
    for item in indicators:
        check(item['comparability_status'] == 'compatible', 'indicator_not_compatible')
        check(item['unit'] in ('人','件') and item['statistic'] == 'reported_count', 'unsupported_statistic')
        for a,b in zip(years, years[1:]):
            check(b == a+1 and item['intervals'].get(f'{a}_{b}') == 'compatible', 'unsupported_comparison_interval')
    if payload.get('schema_version') == 'public-3':
        try:
            check(payload.get('composition_validation') == group_evidence(payload), 'composition_evidence_mismatch')
        except (ValueError, KeyError, TypeError, IndexError):
            check(False, 'invalid_group_composition')
    else:
        check('indicator_groups' not in payload and 'composition_validation' not in payload, 'groups_require_public_3')
    if expected is not None:
        check(payload == expected, 'candidate_differs_from_verified_source_or_configuration')
    return dict(status='failed' if errors else 'passed', errors=len(errors), issues=errors,
                records=len(payload.get('records', [])), groups=len(payload.get('indicator_groups', [])),
                compositions=len(payload.get('composition_validation', [])), indicators=len(ids), geographies=len(codes),
                derived_rates=sum('derived_rate' in r for r in payload.get('records', [])),
                denominators=len(payload.get('denominator_records', [])),
                warnings=payload.get('warnings', []))
