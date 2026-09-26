"""Opt-in regional extension, validated after the immutable municipal contracts.

Annual spatial permission never changes temporal comparison permission.
"""
import copy
from .common import digest
from .publisher import encoded
from .site_release import require
from .rates import FORMULA

VERSION = 'health-center-areas-v1'
INTERVALS = {'2021_2022': 'pending', '2022_2023': 'pending'}
# Exact audited statistical row blocks, not a name-based classifier.
AREAS = [
    ('niigata-city', '新潟市', None, ['新潟市']),
    ('murakami', '村上', 9, ['村上市', '関川村', '粟島浦村']),
    ('shibata', '新発田', 13, ['新発田市', '阿賀野市', '胎内市', '聖籠町']),
    ('niitsu', '新津', 18, ['五泉市', '阿賀町']),
    ('sanjo', '三条', 21, ['三条市', '燕市', '加茂市', '田上町', '弥彦村']),
    ('nagaoka', '長岡', 27, ['長岡市', '小千谷市', '見附市', '出雲崎町']),
    ('uonuma', '魚沼', 32, ['魚沼市']),
    ('minamiuonuma', '南魚沼', 34, ['南魚沼市', '湯沢町']),
    ('tokamachi', '十日町', 37, ['十日町市', '津南町']),
    ('kashiwazaki', '柏崎', 40, ['柏崎市', '刈羽村']),
    ('joetsu', '上越', 43, ['上越市', '妙高市']),
    ('itoigawa', '糸魚川', 46, ['糸魚川市']),
    ('sado', '佐渡', 48, ['佐渡市']),
]
MAPPING_EVIDENCE = [
    dict(source_url='https://www.pref.niigata.lg.jp/uploaded/attachment/314162.pdf', as_of='2021-03-31',
         title='保健所・地域福祉事務所管内一覧表', verification='user_confirmed_2026-09-27'),
    dict(source_url='https://www.pref.niigata.lg.jp/uploaded/attachment/350980.pdf', as_of='2022-03-31',
         title='保健所・地域福祉事務所管内一覧表', verification='user_confirmed_and_official_search_text'),
    dict(source_url='https://www.pref.niigata.lg.jp/uploaded/attachment/496547.pdf', as_of=None,
         title='新潟県 生活衛生課 所管区域一覧', verification='official_search_text_2026-09-27'),
]


def registry(base):
    geos = copy.deepcopy(base['analysis']['geographies'])
    municipalities = {g['original_name']: g for g in geos if g['level'] == 'municipality'}
    areas = []
    for slug, label, row, children in AREAS:
        code = 'hc-15-' + slug
        areas.append(dict(code=code, name=label+'保健所管内', level='health_center_area',
            type='health_center_area', parent='15', source_row=row,
            original_name=label+'保健所計' if row else '新潟市',
            children=[municipalities[n]['code'] for n in children],
            value_origin='official_health_center_total' if row else 'municipality_identity_mapping',
            mapping_provenance=copy.deepcopy(MAPPING_EVIDENCE),
            mapping_scope=dict(statistical_years=[2021, 2022, 2023],
                statistical_blocks='audited_unchanged', full_year_jurisdiction_status='pending'),
            identity_municipality=municipalities['新潟市']['code'] if row is None else None))
        for n in children:
            municipalities[n]['parent_health_center_area'] = code
            municipalities[n]['parent'] = code
    for g in geos:
        g['type'] = 'prefecture' if g['level']=='prefecture_total' else 'municipality'
    geos[0]['children'] = [a['code'] for a in areas]
    return geos + areas, areas


def area_map(municipal_map, areas):
    from shapely.geometry import shape, mapping, MultiPolygon
    from shapely.geometry.polygon import orient
    from shapely.ops import unary_union
    by_code = {f['properties']['code']: f for f in municipal_map['features']}
    result = dict(type='FeatureCollection', metadata=copy.deepcopy(municipal_map['metadata']), features=[])
    result['metadata'].update(region_level='health_center_area', mapping_version=VERSION,
        geometry_origin='union_of_existing_municipality_polygons',
        input_geometry_sha256=digest(encoded(municipal_map)),
        processing='監査済み構成市町村polygonのunion。新潟市管内は市polygonと同一。島・飛地を保持。',
        notice='2023-01-01の参考境界を使用。年度別境界・全期間の管轄確認はpending。')
    for a in areas:
        inputs = [shape(by_code[c]['geometry']) for c in a['children']]
        require(all(g.is_valid and not g.is_empty for g in inputs), 'invalid municipality geometry')
        geom = unary_union(inputs)
        require(geom.is_valid and not geom.is_empty and geom.geom_type in ('Polygon', 'MultiPolygon'), 'invalid health center union')
        # D3 uses clockwise exterior rings; do not simplify or drop islands.
        oriented = orient(geom, sign=-1) if geom.geom_type=='Polygon' else MultiPolygon([orient(g, sign=-1) for g in geom.geoms])
        geometry = copy.deepcopy(by_code[a['children'][0]]['geometry']) if a['identity_municipality'] else mapping(oriented)
        result['features'].append(dict(type='Feature', properties=dict(code=a['code'], name=a['name'],
            geometry_origin='municipality_identity_mapping' if a['identity_municipality'] else 'municipality_union',
            source_municipality_codes=a['children'], mapping_version=VERSION), geometry=geometry))
    # JSON canonicalizes Shapely coordinate tuples for exact rebuild equality.
    import json
    return json.loads(encoded(result))


def extend(base, raw_records):
    from .count_publication import validate as validate_counts
    validate_counts(base['reported'])
    require('health_center_extension' not in base, 'duplicate regional extension')
    result = copy.deepcopy(base)
    geos, areas = registry(base)
    hcmap = area_map(base['analysis']['map'], areas)
    raw_lookup = {(r['observation_fiscal_year'], r['source_row'], r['indicator_id']): r
                  for r in raw_records if r['included']}
    counts = dict(official_numeric=0, official_missing=0, identity=0, component_checks=0)
    warnings = []
    for key in ('analysis', 'annual', 'reported'):
        data = result[key]
        data['geographies'] = copy.deepcopy(geos)
        data['health_center_map'] = copy.deepcopy(hcmap)
        data['health_center_version'] = VERSION
        ids = [i['indicator_id'] for i in data['indicators']]
        original = {(r['observation_fiscal_year'], r['geography_code'], r['indicator_id']): r for r in base[key]['records']}
        for a in areas:
            for year in data['years']:
                def observation(id):
                    if a['identity_municipality']:
                        # Reuse adopted municipal observation; row 51 is never read.
                        source = (original[(year,a['identity_municipality'],id)] if id!='recipients' else
                                  next(d for d in base[key]['denominator_records'] if d['observation_fiscal_year']==year and d['geography_code']==a['identity_municipality']))
                    else:
                        source = raw_lookup[(year,a['source_row'],id)]
                        require(source['geography_name']==a['original_name'], 'health center source name mismatch')
                    r = copy.deepcopy(source)
                    for f in ('derived_rate','derivation','denominator'):
                        r.pop(f,None)
                    require(r['source_row']!=51, 'duplicate row 51 forbidden')
                    require(r['value_state'] in ('numeric','zero','blank') and (r['value'] is None or r['value']>=0), 'unexpected health center value')
                    r.update(record_id=digest(encoded([r['source_sha256'],r['source_sheet'],r['source_cell'],a['code']]))[:24],
                        geography_code=a['code'], geography_name=a['name'], geography_level='health_center_area',
                        value_origin=a['value_origin'], mapping_reference=a['code'],
                        statistical_source_record_id=source.get('record_id'),
                        comparability_status='pending', comparability_intervals=dict(INTERVALS), comparison_allowed=False,
                        comparability_reason='保健所統計の年度間比較は未承認。管轄の時点確認と統計比較を区別。',
                        annual_display_allowed=True, validation_status='passed')
                    return r
                denominator = observation('recipients')
                require(denominator['value'] is not None and denominator['value']>0, 'invalid health center recipients')
                data['denominator_records'].append(denominator)
                subset = {id: observation(id) for id in ids}
                for id,r in subset.items():
                    r['denominator_record_id'] = denominator['record_id']
                    if not a['identity_municipality']:
                        children = [original[(year,c,id)] for c in a['children']]
                        if r['value'] is not None and all(x['value'] is not None for x in children):
                            require(r['value']==sum(x['value'] for x in children), 'official health center / municipality mismatch')
                            counts['component_checks'] += 1
                        counts['official_missing' if r['value'] is None else 'official_numeric'] += 1
                    else:
                        counts['identity'] += 1
                    if key=='reported':
                        r.update(display_contract='reported-annual-6',regional_difference_allowed=False)
                        data['insights'].append(dict(indicator_id=id,geography_code=a['code'],observation_fiscal_year=year,
                            measure='count',generator=VERSION,text=f"{year}年度の{a['name']}：報告人数は{r['value'] if r['value'] is not None else '欠損'}です。人数の大小による評価は行いません。"))
                if key!='reported':
                    for group in data['indicator_groups']:
                        rs = [subset[c['indicator_id']] for c in group['categories']]
                        if any(r['value'] is None for r in rs):
                            warnings.append(dict(code=a['code'],year=year,group=group['group_id'],reason='missing official component; no imputation'))
                            continue
                        require(sum(r['value'] for r in rs)==denominator['value'], 'health center partition mismatch')
                        total_id={'metabo':'metabo_total','doctor_judgment':'physician_total'}.get(group['group_id'])
                        if total_id:
                            total=raw_lookup[(year,50 if a['identity_municipality'] else a['source_row'],total_id)]
                            require(total['value']==denominator['value'], 'official total mismatch')
                        data['composition_validation'].append(dict(group_id=group['group_id'],observation_fiscal_year=year,
                            geography_code=a['code'],category_record_ids=[r['record_id'] for r in rs],
                            denominator_record_id=denominator['record_id'],category_sum=denominator['value'],
                            denominator_value=denominator['value'],difference=0,validation_status='passed',
                            definition_version=group['definition_version'],regional_contract=VERSION))
                        for r in rs:
                            r['regional_composition_allowed']=True
                            r['derived_rate']=dict(value=r['value']/denominator['value']*100,
                                value_state='zero' if r['value']==0 else 'numeric',unit='%',
                                numerator_value=r['value'],denominator_value=denominator['value'],
                                numerator_record_id=r['record_id'],denominator_record_id=denominator['record_id'],
                                formula=FORMULA, definition_version=group['definition_version'],definition_reference='docs/health_center_areas_v1.md',
                                comparability_status='pending',comparability_intervals=dict(INTERVALS),comparison_allowed=False,
                                annual_display_allowed=True,regional_composition_allowed=True,regional_contract=VERSION,validation_status='passed')
                data['records'].extend(subset.values())
    # Official HC cells get links; identity cells retain the existing city target.
    lookup={(r['source_sha256'],r['source_sheet'],r['source_cell']):dict(indicator_id=r['indicator_id'],region=r['geography_code'],section='table')
        for key in ('analysis','annual','reported') for r in result[key]['records'] if r.get('value_origin')=='official_health_center_total'}
    for table in result['published_tables']:
        for row in table['rows']:
            for cell in row['cells']:
                match=lookup.get((table['source']['sha256'],table['source_sheet'],cell['coordinate']))
                if match:cell['visualization']=match
    result['health_center_extension']=dict(version=VERSION,mapping_evidence=MAPPING_EVIDENCE,
        counts=counts,warnings=warnings,temporal_comparability='pending')
    validate(result,base)
    return result


def validate(payload, base=None):
    from .count_publication import validate as validate_counts
    require(payload['health_center_extension']['version']==VERSION, 'unknown regional contract')
    for key, n in [('analysis',8),('annual',3),('reported',17)]:
        data=payload[key]; areas=[g for g in data['geographies'] if g['level']=='health_center_area']
        require(len(areas)==13 and len(data['geographies'])==44, 'regional coverage')
        children=[c for a in areas for c in a['children']]
        require(len(children)==len(set(children))==30, 'duplicate/missing municipality mapping')
        require(set(children)=={g['code'] for g in data['geographies'] if g['level']=='municipality'}, 'invalid child references')
        for g in data['geographies']:
            if g['level']=='municipality':require(g['code'] in next(a for a in areas if a['code']==g['parent_health_center_area'])['children'], 'invalid parent')
        rows=[r for r in data['records'] if r['geography_level']=='health_center_area']
        require(len(rows)==39*n and len({(r['geography_code'],r['indicator_id'],r['observation_fiscal_year']) for r in rows})==39*n,'regional record coverage')
        for r in rows:
            a=next(g for g in areas if g['code']==r['geography_code'])
            require(r['source_row']==(50 if a['identity_municipality'] else a['source_row']), 'incorrect source row')
            require(r['value_origin']==a['value_origin'] and r['mapping_reference']==a['code'], 'incorrect origin')
            require(r['comparability_status']=='pending' and not r['comparison_allowed'] and r['comparability_intervals']==INTERVALS, 'temporal permission changed')
            require((r['value'] is None and r['value_state']=='blank') or
                    (isinstance(r['value'], (int,float)) and r['value']>=0 and r['value_state']==('zero' if r['value']==0 else 'numeric')), 'invalid missing/zero state')
            if a['identity_municipality']:
                source=next(x for x in data['records'] if x['geography_code']==a['identity_municipality'] and x['indicator_id']==r['indicator_id'] and x['observation_fiscal_year']==r['observation_fiscal_year'])
                require(all(r[f]==source[f] for f in ('value','value_state','source_row','source_cell','source_sheet','source_sha256','source_url')), 'identity statistical provenance mismatch')
                require(r['statistical_source_record_id']==source['record_id'], 'identity record link mismatch')
            rate=r.get('derived_rate')
            if rate:
                denominator=next(x for x in data['denominator_records'] if x['record_id']==rate['denominator_record_id'])
                require(rate['regional_contract']==VERSION and rate['regional_composition_allowed'] and
                        rate['comparability_status']=='pending' and not rate['comparison_allowed'] and
                        rate['comparability_intervals']==INTERVALS and denominator['value']>0 and
                        denominator['geography_code']==r['geography_code'] and denominator['observation_fiscal_year']==r['observation_fiscal_year'] and
                        rate['numerator_record_id']==r['record_id'] and rate['numerator_value']==r['value'] and
                        rate['denominator_value']==denominator['value'] and rate['formula']==FORMULA and
                        rate['value']==r['value']/denominator['value']*100, 'invalid regional rate')
            if key=='reported':require(not any(k in r for k in ('derived_rate','derivation','rate','percentage','recipient_percentage')), 'forbidden regional rate')
        require(data['health_center_map']==area_map(data['map'],areas), 'regional geometry mismatch')
        for proof in data.get('composition_validation',[]):
            if proof['geography_code'] not in {a['code'] for a in areas}:continue
            members=[r for r in rows if r['record_id'] in proof['category_record_ids']]
            require(len(members)==len(proof['category_record_ids']) and all(r['value'] is not None for r in members) and
                    sum(r['value'] for r in members)==proof['denominator_value'] and proof['difference']==0 and
                    proof['regional_contract']==VERSION, 'regional partition mismatch')
        if base:
            require([r for r in data['records'] if r['geography_level']!='health_center_area']==base[key]['records'], 'municipal values changed')
            require(data['map']==base[key]['map'] and data['indicators']==base[key]['indicators'],'existing map/indicator changed')
    original=copy.deepcopy(payload['reported']);original['records']=[r for r in original['records'] if r['geography_level']!='health_center_area']
    validate_counts(original)
    return True
