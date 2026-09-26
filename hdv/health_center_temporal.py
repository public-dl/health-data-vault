"""Explicit permission for connecting reported annual facts, never evaluation."""
import copy
from .site_release import require

VERSION = 'health-center-annual-facts-v1'
INTERVALS = {'2021_2022':'compatible', '2022_2023':'compatible'}
GROUPS = ('metabo', 'guidance')
SCOPE = dict(temporal_display_scope='annual_facts_only', temporal_difference_allowed=False,
             trend_evaluation_allowed=False, causal_evaluation_allowed=False)


def permissions(payload):
    require('derived_zero_policy' in payload, 'annual permission requires derived zero policy')
    data=payload['analysis']
    result=[]
    for area in (g for g in data['geographies'] if g['level']=='health_center_area'):
        for group_id in GROUPS:
            group=next(g for g in data['indicator_groups'] if g['group_id']==group_id)
            ids={c['indicator_id'] for c in group['categories']}
            for year in (2021,2022,2023):
                rows=[r for r in data['records'] if r['geography_code']==area['code'] and r['observation_fiscal_year']==year and r['indicator_id'] in ids]
                den=next(d for d in data['denominator_records'] if d['geography_code']==area['code'] and d['observation_fiscal_year']==year)
                require(len(rows)==len(ids) and {r['indicator_id'] for r in rows}==ids and all(type(r['value']) in (int,float) and r['value']>=0 for r in rows), 'incomplete annual facts')
                require(den['value']>0 and sum(r['value'] for r in rows)==den['value'], 'annual partition mismatch')
                proof=next((p for p in data['composition_validation'] if p['geography_code']==area['code'] and p['observation_fiscal_year']==year and p['group_id']==group_id),None)
                require(proof is not None and set(proof['category_record_ids'])=={r['record_id'] for r in rows} and proof['denominator_record_id']==den['record_id'] and proof['difference']==0, 'missing annual composition proof')
            result.append(dict(region=area['code'],group=group_id,intervals=dict(INTERVALS)))
    require(len(result)==26, 'annual permission coverage')
    return dict(version=VERSION, authorization='explicit_user_publication_permission',
                audit_reference='docs/health_center_temporal_permission.md', scope=SCOPE, permissions=result)


def fields():
    return dict(comparability_status='compatible', comparison_allowed=True,
                comparability_intervals=dict(INTERVALS), **SCOPE)


def apply(payload):
    result=copy.deepcopy(payload)
    require('health_center_temporal_policy' not in result, 'duplicate annual policy')
    result['health_center_temporal_policy']=permissions(result)
    for r in result['analysis']['records']:
        if r['geography_level']!='health_center_area':continue
        r.update(fields(), comparability_reason='Approved annual reported facts only; no evaluation or causal claims')
        require('derived_rate' in r, 'missing annual rate')
        r['derived_rate'].update(fields())
    result['health_center_extension']['temporal_comparability']='group_specific_annual_facts'
    return result


def validate(payload):
    require(payload['health_center_temporal_policy']==permissions(payload), 'annual authorization mismatch')
