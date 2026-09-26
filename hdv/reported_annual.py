"""Fail-closed non-composition, count-only annual display contract.

No temporal permission, ratio, residual or inferred category is produced.
Inputs must first pass publisher.verified_records (including raw-cell validation).
"""
import copy
from .common import digest
from .publisher import encoded
from .normalizer import MUNICIPAL_SCOPE
from .rates import usable

MEMBERS = [('bp_guidance', '保健指導', 'P', '#397c9a'),
           ('bp_referral', '受診勧奨', 'Q', '#7868a6')]
VERSION = 'reported-annual-1'


def require(ok, message):
    if not ok:
        raise ValueError('Reported annual: '+message)


def reported_payload(analysis, records, with_rates=False, lipid_evidence=None, lipid_fixed_breaks=False, glucose_evidence=None, liver_evidence=None, count_members=None):
    require(count_members is None or not any((with_rates, lipid_evidence, glucose_evidence, liver_evidence)), 'count-only input cannot grant rates')
    members = MEMBERS if count_members is None else count_members
    if lipid_evidence is not None:
        from .lipids import MEMBERS as LIPID_MEMBERS
        require(with_rates, "lipids require validated recipient ratios")
        members = MEMBERS + LIPID_MEMBERS
    if glucose_evidence is not None:
        from .glucose import MEMBERS as GLUCOSE_MEMBERS, OFFICIAL, indicator_metadata as glucose_metadata
        require(with_rates and lipid_evidence is not None, 'glucose requires the validated non-composition contract')
        require(set(glucose_evidence) == set(OFFICIAL), 'unauthorized/missing glucose rate evidence')
        members = members + GLUCOSE_MEMBERS
    if liver_evidence is not None:
        from .liver import MEMBERS as LIVER_MEMBERS, OFFICIAL as LIVER_OFFICIAL, indicator_metadata as liver_metadata
        require(with_rates and glucose_evidence is not None, 'liver requires the verified non-composition pipeline')
        require(set(liver_evidence) == set(LIVER_OFFICIAL), 'unauthorized/missing liver formula evidence')
        members = members + LIVER_MEMBERS
    years = [2021, 2022, 2023]
    require(analysis['years'] == years, 'unaudited years')
    geos = {g['original_name']: g for g in analysis['geographies']}
    require(len(geos) == 31, 'unaudited geography scope')
    ids = [m[0] for m in members]
    grouped = {}
    for raw in records:
        if not raw['included'] or raw['geography_level'] not in ('municipality', 'prefecture_total') or raw['indicator_id'] not in [*ids, 'recipients']:
            continue
        r = copy.deepcopy(raw)
        require(r['geography_name'] in geos, 'unknown geography')
        r['geography_code'] = geos[r['geography_name']]['code']
        r['record_id'] = digest(encoded([r['source_sha256'], r['source_sheet'], r['source_cell']]))[:24]
        subset = grouped.setdefault((r['observation_fiscal_year'], r['geography_code']), {})
        require(r['indicator_id'] not in subset, 'duplicate record')
        subset[r['indicator_id']] = r
    require(set(grouped) == {(y, g['code']) for y in years for g in geos.values()}, 'incomplete coverage')
    rows, denominators, insights = [], [], []
    for (year, code), subset in sorted(grouped.items()):
        require(set(subset) == {*ids, 'recipients'}, 'missing source input')
        d = subset['recipients']
        require(d['source_cell'] == 'B'+str(d['source_row']), 'recipient source column')
        require(usable(d) and d['value'] > 0, 'invalid recipients')
        denominators.append(d)
        for id, label, column, _ in members:
            r = subset[id]
            require(usable(r) and isinstance(r['value'], int) and not isinstance(r['value'], bool), 'invalid count')
            require(0 <= r['value'] <= d['value'] and r['unit'] == d['unit'] == '人', 'count range/unit')
            require(r['population_scope'] == d['population_scope'] == MUNICIPAL_SCOPE, 'population')
            for field in ('observation_fiscal_year','publication_fiscal_year','geography_name','geography_level','source_sha256','source_sheet','source_row'):
                require(r[field] == d[field], 'source/denominator mismatch: '+field)
            require(r['source_cell'] == column+str(r['source_row']), 'source column')
            require(r['comparability_status'] == 'pending' and r['comparison_allowed'] is False, 'temporal permission')
            require(r['comparability_intervals'] == {'2021_2022':'pending','2022_2023':'pending'}, 'interval permission')
            require(not any(k in r for k in ('derived_rate','derivation','residual')), 'unexpected derived data')
            r.update(annual_display_allowed=True, display_contract=VERSION, denominator_record_id=d['record_id'])
            rows.append(r)
            insights.append(dict(indicator_id=id, geography_code=code, observation_fiscal_year=year, measure='count',
                text=f"{year}年度の{geos[r['geography_name']]['name']}：{label} {r['value']:,}人。", generator=VERSION))
    # Arithmetic checks concern original counts only; never create a residual category.
    for year in years:
        for id in [*ids,'recipients']:
            scope = [s[id] for (y,_),s in grouped.items() if y == year]
            require(sum(r['value'] for r in scope if r['geography_level']=='municipality') == next(r['value'] for r in scope if r['geography_level']=='prefecture_total'), 'municipal/county mismatch')
    indicators = [dict(indicator_id=id, name='血圧：'+label, group='blood_pressure', unit='人',
        description='原資料の「判定区分（保健指導以上を再掲）」に掲載された人数。',
        visualization_type='reported_count', overview_label='判定状況をひと目で見る',
        color=color, palette=palette, map_breaks=[100,500,2000,10000],
        intervals={'2021_2022':'pending','2022_2023':'pending'})
        for (id,label,_,color),palette in zip(members,[['#e0eff4','#afd1df','#7eb2c9','#4a8fac','#286781'],['#ece8f5','#cfc5e5','#aea0ce','#8977b2','#65518e']])]
    if lipid_evidence is not None:
        from .lipids import indicator_metadata
        indicators.extend(indicator_metadata(lipid_fixed_breaks))
    if glucose_evidence is not None:
        indicators.extend(glucose_metadata())
    if liver_evidence is not None:
        indicators.extend(liver_metadata())
    payload = dict(schema_version=VERSION,input_run_id=analysis['input_run_id'],years=years,
        population_scope=MUNICIPAL_SCOPE,indicators=indicators,indicator_groups=[],geographies=analysis['geographies'],
        records=rows,denominator_records=denominators,map=analysis['map'],insights=insights,
        source_validation=analysis['source_validation'],warnings=[
            '原表の報告人数のみ。残差・正常カテゴリー・派生割合を生成しません。',
            '受診者数は血圧測定者数ではありません。年度間比較はpendingです。'])

    if with_rates:
        from .single_judgment_rates import derive_single_rate, validate_single_rate, LABEL
        policy = dict(numerator_columns={id:column for id,_,column,_ in members},
                      denominator_indicator_id='recipients', denominator_column='B',
                      years=years, population_scope=MUNICIPAL_SCOPE)
        if lipid_evidence is not None:
            policy['rate_evidence'] = lipid_evidence
            policy['required_evidence_ids'] = [id for id,_,_,_ in LIPID_MEMBERS]
        if glucose_evidence is not None:
            policy['numerator_columns'] = {i['indicator_id']:i['source_column'] for i in indicators if i.get('rate') and i.get('theme_id')=='glucose'} | {id:column for id,_,column,_ in MEMBERS+LIPID_MEMBERS}
            policy['rate_evidence'] = dict(lipid_evidence) | glucose_evidence
            policy['required_evidence_ids'] += list(OFFICIAL)
            from .single_judgment_rates import LEGACY_EVIDENCE_DEFINITION
            policy['rate_definitions'] = {id:dict(LEGACY_EVIDENCE_DEFINITION) for id,_,_,_ in LIPID_MEMBERS}
            policy['rate_definitions'].update({i['indicator_id']:i['rate_definition'] for i in indicators if i.get('theme_id')=='glucose' and i.get('rate')})
        if liver_evidence is not None:
            policy['numerator_columns'].update({id:col for id,_,col,_ in LIVER_MEMBERS})
            policy['rate_evidence'].update(liver_evidence)
            policy['required_evidence_ids'] += list(LIVER_OFFICIAL)
            policy['rate_definitions'].update({i['indicator_id']:i['rate_definition'] for i in indicators if i.get('theme_id')=='liver'})
        recipients = {d['record_id']:d for d in denominators}
        for r in rows:
            if r['indicator_id'] not in policy['numerator_columns']:
                continue
            d = recipients[r['denominator_record_id']]
            rate = derive_single_rate(r,d,policy)
            validate_single_rate(rate,r,d,policy)
            r.update(derived_rate=rate, display_contract='reported-annual-2', regional_difference_allowed=True)
            name = next(g['name'] for g in geos.values() if g['code']==r['geography_code'])
            label = next(label for id,label,_,_ in members if id==r['indicator_id'])
            insights.append(dict(indicator_id=r['indicator_id'],geography_code=r['geography_code'],
                observation_fiscal_year=r['observation_fiscal_year'],measure='rate',generator='single-judgment-rate-v1',
                text=f"{r['observation_fiscal_year']}年度の{name}：{label} {rate['value']:.1f}%（{r['value']:,}人／特定健診受診者 {d['value']:,}人）。"))
        for indicator in indicators[:len(MEMBERS)]:
            indicator.update(visualization_type='single_judgment_rate', overview_label='判定状況をひと目で見る',
                theme_id='blood-pressure', theme_label='血圧', recipient_label='特定健診受診者数',
                rate=dict(label=LABEL,map_breaks=[20,25,30,35],intervals=dict(indicator['intervals'])))
        payload.update(schema_version='reported-annual-2',rate_policy=policy,warnings=[
            '割合は原表の判定人数÷同年度・同地域の特定健診受診者数×100。完全構成ではありません。',
            '特定健診受診者数は血圧測定者数ではありません。残差は公開しません。年度間比較はpendingです。'])
    if lipid_evidence is not None:
        payload['schema_version'] = 'reported-annual-3'
        if lipid_fixed_breaks:
            payload['map_scale_version'] = 'lipids-fixed-2021-2023-v1'
        payload['warnings'] = ['各項目は独立した掲載人数です。合計・残差・完全構成を生成しません。年度間比較はpendingです。']
        for r in rows:
            r['display_contract'] = 'reported-annual-3'
    if glucose_evidence is not None:
        payload['schema_version'] = 'reported-annual-4'
        for r in rows:
            r['display_contract'] = 'reported-annual-4'
    return payload
