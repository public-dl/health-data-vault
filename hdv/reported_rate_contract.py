"""Explicit publication metadata for independent reported-count ratios."""
from .single_judgment_rates import derive_single_rate, validate_single_rate, LABEL, require

VERSION = 'reported-recipient-rate-v2'
REFERENCE = 'docs/reported_rate_contract.md'
OFFICIAL = {'triglycerides','hdl','ldl','urine_glucose','fasting_glucose','hba1c'}
SPECS = {
    'bp_guidance': ('P','血圧',15,35), 'bp_referral': ('Q','血圧',15,45),
    'lipid_people': ('R','脂質代謝',50,80), 'triglycerides': ('S','脂質代謝',20,42),
    'hdl': ('T','脂質代謝',2,13), 'ldl': ('U','脂質代謝',30,65),
    'total_cholesterol': ('V','脂質代謝',0,55),
    'glucose_people': ('X','糖代謝異常',40,90), 'urine_glucose': ('Y','糖代謝異常',0,25),
    'fasting_glucose': ('Z','糖代謝異常',0,40), 'hba1c': ('AB','糖代謝異常',30,90),
}

LIVER_VERSION = 'reported-recipient-rate-v3'

def apply_contract(payload, include_liver=False):
    specs = dict(SPECS)
    official = set(OFFICIAL)
    version = LIVER_VERSION if include_liver else VERSION
    if include_liver:
        specs['liver'] = ('W','肝機能',18,32)
        official.add('liver')
    require(('liver' in {i['indicator_id'] for i in payload['indicators']}) == include_liver, 'liver feature permission mismatch')
    require(payload['schema_version']=='reported-annual-4', 'common contract requires verified counts')
    old_policy = payload['rate_policy']
    policy = {k:old_policy[k] for k in ('denominator_indicator_id','denominator_column','years','population_scope')}
    policy.update(contract_version=version, numerator_columns={}, rate_contracts={},
                  rate_evidence=old_policy['rate_evidence'], required_evidence_ids=sorted(official))
    for i in payload['indicators']:
        id=i['indicator_id']
        approved=id in specs
        i.update(capabilities=dict(recipient_rate=approved, composition=False),
                 recipient_label='特定健診受診者数', count_label='報告人数')
        if not approved:
            require(id=='random_glucose' and not i.get('rate'), 'unknown publication capability')
            i['source_notice']='原資料の「判定区分（保健指導以上を再掲）」の糖代謝異常欄に掲載された人数です。随時血糖は人数のみを表示します。'
            i['description']=i['source_notice']
            continue
        col,section,lo,hi=specs[id]
        origin='official_formula_confirmed' if id in official else 'hdv_derived_from_reported_count'
        contract=dict(approved=True, origin=origin, reference=REFERENCE, version=version,
                      numerator_column=col, denominator_indicator_id='recipients', denominator_column='B',
                      denominator_label='特定健診受診者数', composition=False)
        policy['rate_contracts'][id]=contract
        policy['numerator_columns'][id]=col
        i.update(rate_contract=contract, rate_origin=origin, rate_definition=dict(reference=REFERENCE,version=version),
                 visualization_type='single_judgment_rate', rate=dict(label=LABEL,map_breaks=[],intervals=dict(i['intervals'])),
                 map_scale=dict(mode='continuous',min=lo,max=hi),chart_max={'bp_referral':50,'bp_guidance':40,'lipid_people':80,'triglycerides':50,'hdl':15,'ldl':70,'total_cholesterol':60}.get(id,hi))
        if id == 'liver':
            from .liver import RATE_LABEL
            i['rate']['label'] = RATE_LABEL
            i['chart_max'] = 40
        note=f'原資料の「判定区分（保健指導以上を再掲）」の{section}欄に掲載された人数です。割合は同年度・同地域の特定健診受診者数を分母として算出しています。各項目は排他的な構成ではなく、合計・残差を生成しません。'
        if id in ('lipid_people','glucose_people'):
            note+='実人員の具体的なOR条件・重複処理等は未確認です。'
            i['name']=('脂質代謝' if section=='脂質代謝' else '糖代謝')+'：実人員'
        if section=='糖代謝異常':
            note+='随時血糖は人数のみです。HbA1cの割合は報告人数の割合であり、HbA1c検査値ではありません。'
        i.update(description=note,source_notice=note,set_notice=note)
    denominators={d['record_id']:d for d in payload['denominator_records']}
    payload['insights']=[i for i in payload['insights'] if i['measure']!='rate']
    names={i['indicator_id']:i['name'] for i in payload['indicators']}
    geos={g['code']:g['name'] for g in payload['geographies']}
    for r in payload['records']:
        r['display_contract']='reported-annual-5'
        if r['indicator_id'] not in policy['numerator_columns']:
            require('derived_rate' not in r, 'unauthorized ratio')
            continue
        d=denominators[r['denominator_record_id']]
        rate=derive_single_rate(r,d,policy)
        validate_single_rate(rate,r,d,policy)
        r.update(derived_rate=rate,regional_difference_allowed=True)
        payload['insights'].append(dict(indicator_id=r['indicator_id'], geography_code=r['geography_code'],
            observation_fiscal_year=r['observation_fiscal_year'], measure='rate', generator=version,
            text=f"{r['observation_fiscal_year']}年度の{geos[r['geography_code']]}：{names[r['indicator_id']]} {rate['value']:.1f}%（報告人数 {r['value']:,}人／特定健診受診者数 {d['value']:,}人）。"))
    payload.update(schema_version='reported-annual-5',rate_policy=policy)
    return payload
