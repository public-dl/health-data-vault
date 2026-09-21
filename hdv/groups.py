"""Explicit group contracts and reproducible partition evidence; no new observations."""
import math
import re


def group_evidence(payload):
    registry = {i['indicator_id']: i for i in payload['indicators']}
    groups = payload.get('indicator_groups', [])
    ids = [g['group_id'] for g in groups]
    if not groups or len(ids) != len(set(ids)):
        raise ValueError('Empty/duplicate indicator groups')
    records = {(r['observation_fiscal_year'], r['geography_code'], r['indicator_id']): r for r in payload['records']}
    denominators = {r['record_id']: r for r in payload['denominator_records']}
    evidence = []
    assigned = set()
    for g in groups:
        cats = g['categories']
        category_ids = [c['category_id'] for c in cats]
        orders = [c['order'] for c in cats]
        members = [c['indicator_id'] for c in cats]
        if (not cats or len(set(category_ids)) != len(cats) or len(set(orders)) != len(cats)
                or orders != list(range(len(cats))) or category_ids != g['required_category_ids']
                or len(set(members)) != len(cats) or assigned.intersection(members)):
            raise ValueError('Missing/duplicate/unordered group category')
        assigned.update(members)
        if g['composition_rule'] != 'exclusive_exhaustive_partition' or not g['definition_version'] or not g['audit_reference']:
            raise ValueError('Unaudited composition rule')
        if (not g['allowed_views'] or len(g['allowed_views']) != len(set(g['allowed_views']))
                or not set(g['allowed_views']) <= {'map_overview','map_compare','table','composition','category_trend'}):
            raise ValueError('Unknown or missing group view')
        for c in cats:
            indicator = registry.get(c['indicator_id'])
            if not indicator or indicator.get('comparability_status') != 'compatible':
                raise ValueError('Unknown/unapproved group indicator')
            policy = indicator.get('rate', {})
            if (len(policy.get('components', [])) != len(members) or set(policy.get('components', [])) != set(members)
                    or policy.get('denominator_indicator_id') != g['denominator_indicator_id']
                    or policy.get('observation_years') != g['observation_years']):
                raise ValueError('Group differs from audited rate partition')
            for key in ('rate_map_breaks', 'count_map_breaks'):
                breaks = c[key]
                if (len(breaks) != 4 or any(isinstance(v, bool) or not isinstance(v, (int,float)) or not math.isfinite(v) or v <= 0 for v in breaks)
                        or breaks != sorted(set(breaks)) or (key == 'rate_map_breaks' and breaks[-1] > 100)):
                    raise ValueError('Invalid group map breaks')
            if not re.fullmatch(r'#[0-9a-fA-F]{6}', c['color']):
                raise ValueError('Invalid category color')
        for year in payload['years']:
            if year not in g['observation_years']:
                raise ValueError('Unaudited composition year')
            for geo in payload['geographies']:
                rs = [records[(year, geo['code'], id)] for id in members]
                rates = [r['derived_rate'] for r in rs]
                denominator_ids = {d['denominator_record_id'] for d in rates}
                if len(denominator_ids) != 1:
                    raise ValueError('Composition denominators differ')
                d = denominators[next(iter(denominator_ids))]
                if d['indicator_id'] != g['denominator_indicator_id'] or d['value'] <= 0:
                    raise ValueError('Invalid composition denominator')
                for r in rs:
                    for field in ('observation_fiscal_year','publication_fiscal_year','geography_code','geography_level',
                                  'population_scope','source_sha256','source_sheet','source_row'):
                        if r.get(field) != d.get(field):
                            raise ValueError('Composition input mismatch: '+field)
                    if (r['value'] is None or not 0 <= r['value'] <= d['value'] or r['validation_status'] != 'passed'
                            or not r['comparison_allowed'] or r['derived_rate']['validation_status'] != 'passed'
                            or not r['derived_rate']['comparison_allowed']):
                        raise ValueError('Unusable composition category')
                    if any(not r.get(k) for k in ('source_url','source_cell','source_sha256','source_sheet','record_id')):
                        raise ValueError('Missing category provenance')
                total = sum(r['value'] for r in rs)
                if total != d['value']:
                    raise ValueError('Composition count sum differs from denominator')
                evidence.append(dict(group_id=g['group_id'],observation_fiscal_year=year,geography_code=geo['code'],
                                     category_record_ids=[r['record_id'] for r in rs],denominator_record_id=d['record_id'],
                                     category_sum=total,denominator_value=d['value'],difference=total-d['value'],
                                     validation_status='passed',definition_version=g['definition_version']))
    return evidence
