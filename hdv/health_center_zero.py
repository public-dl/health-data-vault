"""Opt-in derived zeros. Published source tables remain byte-for-byte unchanged."""
import copy
from .site_release import require
from .rates import FORMULA

POLICY = 'health-center-derived-zero-v1'
ORIGIN = 'derived_zero_from_complete_child_sum'
# Audited fiscal-year-end jurisdiction evidence; not full-year legal certification.
MAPPING = {2021: '350980', 2022: '399881', 2023: '446824'}
NOTICE = '保健所計の原表セルは空欄ですが、管内全市町村の当該値が0件であることから、HDVで0件として集計しています。'


def evidence(payload):
    from .health_centers import AREAS
    proofs = []
    for table in payload['published_tables']:
        source = table['source']; year = source['observation_fiscal_year']
        if year not in MAPPING:
            continue
        cells = {(c['row'], c['column']): c for row in table['rows'] for c in row['cells']}
        for slug, label, row, names in AREAS:
            if row is None:
                continue
            area = next(g for g in payload['analysis']['geographies'] if g['code']=='hc-15-'+slug)
            actual_names = [next(g['original_name'] for g in payload['analysis']['geographies'] if g['code']==code) for code in area['children']]
            if actual_names != names or cells.get((row,1),{}).get('original_value') != label+'保健所計':
                continue
            for col in range(2,43):
                raw = cells.get((row,col))
                if not raw or raw['original_value'] is not None or raw['value_state']!='blank' or raw['formula'] is not None:
                    continue
                children = []
                for offset, name in enumerate(names,1):
                    child = cells.get((row+offset,col))
                    if cells.get((row+offset,1),{}).get('original_value') != name or not child:
                        break
                    if type(child['original_value']) not in (int,float) or child['original_value']!=0 or child['source_data_type']!='n' or child['formula'] is not None:
                        break
                    children.append(dict(name=name, cell=child['coordinate'], raw_value=child['original_value'], source_data_type='n', number_format=child['number_format']))
                if len(children)!=len(names):
                    continue
                proofs.append(dict(raw_value=None, derived_value=0, child_sum=0, children=children,
                    source=copy.deepcopy(source), source_sheet=table['source_sheet'], source_cell=raw['coordinate'],
                    mapping_reference=area['code'], mapping_children=area['children'],
                    mapping_evidence='https://www.pref.niigata.lg.jp/uploaded/attachment/'+MAPPING[year]+'.pdf',
                    mapping_scope='audited statistical block and fiscal year end', explanation=NOTICE))
    return proofs


def key(proof):
    return proof['source']['sha256'], proof['source_sheet'], proof['source_cell']


def apply(payload):
    from .health_centers import VERSION, INTERVALS
    require('derived_zero_policy' not in payload, 'duplicate zero policy')
    result = copy.deepcopy(payload)
    proofs = evidence(result); lookup = {key(p):p for p in proofs}
    result['derived_zero_policy'] = dict(version=POLICY, proofs=proofs)
    for section in ('analysis','annual','reported'):
        data = result[section]
        for r in data['records']:
            p = lookup.get((r['source_sha256'],r['source_sheet'],r['source_cell']))
            if r['geography_level']=='health_center_area' and p:
                require(r['value'] is None and r['original_value'] is None, 'source is not blank')
                r.update(raw_value=None,derived_value=0,value=0,value_state='zero',value_origin=ORIGIN,zero_derivation=p)
        if section=='reported':
            for insight in data['insights']:
                match=next((r for r in data['records'] if r.get('zero_derivation') and r['indicator_id']==insight['indicator_id'] and r['geography_code']==insight['geography_code'] and r['observation_fiscal_year']==insight['observation_fiscal_year']),None)
                if match:
                    insight['text']=f"{match['observation_fiscal_year']}年度の{match['geography_name']}：報告人数は0です。人数の大小による評価は行いません。"
            continue
        for group in data['indicator_groups']:
            for geo in (g for g in data['geographies'] if g['level']=='health_center_area'):
                for year in data['years']:
                    rows=[r for r in data['records'] if r['geography_code']==geo['code'] and r['observation_fiscal_year']==year and r['indicator_id'] in [c['indicator_id'] for c in group['categories']]]
                    if not any(r.get('zero_derivation') for r in rows):continue
                    den=next(d for d in data['denominator_records'] if d['geography_code']==geo['code'] and d['observation_fiscal_year']==year)
                    require(len(rows)==len(group['categories']) and all(r['value'] is not None for r in rows) and sum(r['value'] for r in rows)==den['value'], 'derived zero partition mismatch')
                    data['composition_validation'].append(dict(group_id=group['group_id'],observation_fiscal_year=year,geography_code=geo['code'],category_record_ids=[r['record_id'] for r in rows],denominator_record_id=den['record_id'],category_sum=den['value'],denominator_value=den['value'],difference=0,validation_status='passed',definition_version=group['definition_version'],regional_contract=VERSION))
                    for r in rows:
                        r['regional_composition_allowed']=True
                        r['derived_rate']=dict(value=r['value']/den['value']*100,value_state='zero' if r['value']==0 else 'numeric',unit='%',numerator_value=r['value'],denominator_value=den['value'],numerator_record_id=r['record_id'],denominator_record_id=den['record_id'],formula=FORMULA,definition_version=group['definition_version'],definition_reference='docs/health_center_derived_zero.md',comparability_status='pending',comparability_intervals=dict(INTERVALS),comparison_allowed=False,annual_display_allowed=True,regional_composition_allowed=True,regional_contract=VERSION,validation_status='passed')
    result['derived_zero_policy']['temporal_review'] = dict(
        metabo='compatible_candidate', guidance='compatible_candidate',
        doctor_judgment='pending', reference='docs/health_center_derived_zero.md',
        publication_permission='pending; candidate is not temporal approval')
    result['health_center_extension']['warnings'] = [w for w in result['health_center_extension']['warnings']
        if not any(p['geography_code']==w['code'] and p['observation_fiscal_year']==w['year'] and p['group_id']==w['group']
                   for p in result['analysis']['composition_validation'])]
    return result


def validate_policy(payload):
    from .publisher import encoded
    policy=payload['derived_zero_policy']
    require(policy['version']==POLICY and encoded(policy['proofs'])==encoded(evidence(payload)), 'derived zero evidence mismatch')
    return {key(p):p for p in policy['proofs']}
