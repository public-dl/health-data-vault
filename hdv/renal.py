"""Explicit renal publication extension; counts for four columns, AD ratio only."""
from .reported_annual import reported_payload, require
from .lipids import audit_formula_evidence
from .single_judgment_rates import derive_single_rate, validate_single_rate

VERSION = 'renal-urinary-v1'
REFERENCE = 'docs/renal_urinary_v1.md'
MEMBERS = [('renal_urinary_people', '実人員', 'AC', '#124b9b'),
           ('urine_protein', '尿蛋白', 'AD', '#54aeb4'),
           ('urine_blood', '尿潜血', 'AE', '#629fce'),
           ('creatinine', 'クレアチニン', 'AF', '#8e9bad')]
NOTE = ('原資料の「判定区分（保健指導以上を再掲）」の腎・尿路系欄に掲載された人数です。'
        '「実人員」は原表名称で、個別3項目の単純合計ではありません。具体的な重複処理は未確認です。'
        '尿蛋白の割合は報告人数÷同年度・同地域の特定健診受診者数×100。県概要で確認された計算式をHDVが市町村原値へ適用した派生値で、検査実施者中の陽性率ではありません。'
        '他3項目の割合は公開していません。4項目は相互排他的な構成カテゴリーではありません。年度間比較はpendingです。')


def extend(payload, root, analysis, records):
    require(payload['schema_version'] == 'reported-annual-5', 'renal requires verified common contract')
    require(not any(i['indicator_id'] in {m[0] for m in MEMBERS} for i in payload['indicators']), 'duplicate renal extension')
    renal = reported_payload(analysis, records, count_members=MEMBERS)
    evidence = audit_formula_evidence(root, analysis, [MEMBERS[1]], {'urine_protein': (29, 30)})
    contract = dict(approved=True, origin='official_formula_confirmed', reference=REFERENCE, version=VERSION,
                    value_origin='hdv_derived_from_reported_count', official_formula_confirmed=True,
                    numerator_column='AD', denominator_indicator_id='recipients', denominator_column='B',
                    denominator_label='特定健診受診者数', composition=False)
    policy = dict(contract_version=VERSION, numerator_columns={'urine_protein': 'AD'},
                  denominator_indicator_id='recipients', denominator_column='B', years=analysis['years'],
                  population_scope=analysis['population_scope'], rate_contracts={'urine_protein': contract},
                  rate_evidence=evidence, required_evidence_ids=['urine_protein'])
    require(renal['denominator_records'] == payload['denominator_records'], 'renal recipient records differ')
    denominators = {r['record_id']: r for r in renal['denominator_records']}
    for r in renal['records']:
        r['display_contract'] = 'reported-annual-5'
        if r['indicator_id'] == 'urine_protein':
            d = denominators[r['denominator_record_id']]
            rate = derive_single_rate(r, d, policy)
            validate_single_rate(rate, r, d, policy)
            r.update(derived_rate=rate, regional_difference_allowed=True)
        else:
            require('derived_rate' not in r and 'derivation' not in r, 'unapproved renal rate')
    indicators = []
    for id, label, column, color in MEMBERS:
        approved = id == 'urine_protein'
        name = ('腎・尿路系：保健指導以上として再掲された実人員' if column == 'AC'
                else label+'：保健指導以上として再掲された人数')
        i = dict(indicator_id=id, name=name, public_label=name, short_label='腎・尿路系：実人員' if column=='AC' else label+'：保健指導以上',
                 group='renal_urinary', theme_id='renal-urinary', theme_label='腎・尿路系', unit='人',
                 description='原表「判定区分（保健指導以上を再掲）」の腎・尿路系の報告人数です。割合の公開は尿蛋白のみです。',
                 source_notice='尿蛋白の割合は原表人数÷特定健診受診者数×100によるHDV派生値です。検査実施者中の陽性率ではありません。',
                 data_notes=NOTE, source_column=column,
                 source_label='ｸﾚｱﾁﾆﾝ' if column=='AF' else label,
                 source_hierarchy=['判定区分（保健指導以上を再掲）', '腎・尿路系', 'ｸﾚｱﾁﾆﾝ' if column=='AF' else label],
                 semantic_key='reported_guidance_or_higher', terminology_version=VERSION,
                 visualization_type='single_judgment_rate' if approved else 'reported_count',
                 overview_label='結果をひと目で見る', count_label='報告人数', recipient_label='特定健診受診者数',
                 color=color, map_breaks=[], intervals={'2021_2022':'pending', '2022_2023':'pending'},
                 capabilities=dict(recipient_rate=approved, composition=False, map_mode='rate' if approved else 'none', temporal_rate=approved,
                                   distribution=approved, annual_reference_lines=False, selected_indicator_charts=True))
        if approved:
            i.update(rate=dict(label='特定健診受診者数に占める割合（％）', map_breaks=[], intervals=dict(i['intervals'])),
                     rate_contract=contract, rate_origin='official_formula_confirmed', value_origin='hdv_derived_from_reported_count', official_formula_confirmed=True,
                     rate_definition=dict(reference=REFERENCE, version=VERSION),
                     map_scale=dict(mode='continuous', min=0, max=8), chart_max=8)
        indicators.append(i)
    # Append only: existing indicators, observations and policy remain byte-for-byte equivalent.
    payload['indicators'].extend(indicators)
    payload['records'].extend(renal['records'])
    metadata = {i['indicator_id']: i for i in indicators}
    for row in renal['records']:
        item = metadata[row['indicator_id']]
        for key in ('source_label', 'public_label', 'semantic_key', 'terminology_version'):
            row[key] = item[key]
    names = {i['indicator_id']:i['name'] for i in indicators}
    geos = {g['code']:g['name'] for g in analysis['geographies']}
    for r in renal['records']:
        prefix = f"{r['observation_fiscal_year']}年度の{geos[r['geography_code']]}：{names[r['indicator_id']]}"
        for measure in ('count','rate') if 'derived_rate' in r else ('count',):
            value = f"{r['value']:,}人"
            if measure == 'rate':
                value = f"{r['derived_rate']['value']:.1f}%（報告人数 {r['value']:,}人／特定健診受診者数 {denominators[r['denominator_record_id']]['value']:,}人）"
            payload['insights'].append(dict(indicator_id=r['indicator_id'], geography_code=r['geography_code'],
                observation_fiscal_year=r['observation_fiscal_year'], measure=measure, generator=VERSION, text=prefix+' '+value+'。'))
    payload['renal_contract'] = policy
    return payload
