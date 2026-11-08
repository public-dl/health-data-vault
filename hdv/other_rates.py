"""Examination-specific denominator contract, independent of recipient percentages."""
import copy
from pathlib import Path
from openpyxl import load_workbook
from .common import read_json, checked_path, digest
from .site_release import require

VERSION = 'other-examination-rates-v1'
LABEL = '実施件数に対する保健指導以上の判定人数の割合'
PAIRS = [('uric_acid', 'uric_acid_tests', '血清尿酸', 'AM', 'AO', 43, 20),
         ('total_protein', 'total_protein_tests', '血清総蛋白', 'AN', 'AP', 46, 20)]
NOTE = ('割合は「判定区分（保健指導以上を再掲）」の人数÷同年度・同地域・同じ検査の実施件数×100です。'
        '県概要の公式計算式に基づくHDVの派生値で、総受診者数を分母にしていません。'
        '各検査は選択的に実施され、地域の対象者構成も異なります。住民全体の有病率や地域の優劣を示しません。'
        '実施件数0は算出不可、原表空欄は欠損です。年度間の増減評価は行いません。'
        '')


def audit(root, site):
    data = site['reported']
    manifest = read_json(Path(root)/'processed'/data['input_run_id']/'collection.json')
    evidence = {}
    for source in manifest['sources']:
        path = checked_path(root, source['raw_path'])
        require(digest(path.read_bytes()) == source['sha256'], 'detailed rate source checksum')
        book = load_workbook(path, data_only=False, keep_links=False)
        cached = load_workbook(path, data_only=True, keep_links=False)
        try:
            overview, values = book.worksheets[0], cached.worksheets[0]
            year = source['observation_fiscal_year']
            for id, test_id, _, num_col, den_col, row, _ in PAIRS:
                n = next(r for r in data['records'] if r['indicator_id'] == id and r['geography_code'] == '15' and r['observation_fiscal_year'] == year)
                d = next(r for r in data['records'] if r['indicator_id'] == test_id and r['geography_code'] == '15' and r['observation_fiscal_year'] == year)
                require(n['source_sha256'] == d['source_sha256'] == source['sha256'], 'detailed overview source mismatch')
                require(n['source_cell'] == num_col+'6' and d['source_cell'] == den_col+'6', 'detailed overview column mismatch')
                formula = f'=J{row+1}/J{row}*100'
                require(overview[f'J{row+2}'].value == formula, 'detailed overview formula changed')
                require(values[f'J{row}'].value == d['value'] and values[f'J{row+1}'].value == n['value'], 'detailed overview counts mismatch')
                require(d['value'] > 0 and abs(values[f'J{row+2}'].value-n['value']/d['value']*100) < 1e-10, 'detailed official percentage mismatch')
                evidence.setdefault(id, {})[str(year)] = dict(source_sha256=source['sha256'], source_url=source['source_url'],
                    source_sheet=n['source_sheet'], overview_sheet=overview.title, numerator_cell=f'J{row+1}',
                    denominator_cell=f'J{row}', rate_cell=f'J{row+2}', formula=formula,
                    cached_value=values[f'J{row+2}'].value)
        finally:
            book.close(); cached.close()
    require(set(evidence) == {p[0] for p in PAIRS} and all(set(e)=={'2021','2022','2023'} for e in evidence.values()), 'incomplete detailed formula evidence')
    return evidence


def derive(n, d, evidence):
    pair = next((p for p in PAIRS if p[0] == n['indicator_id']), None)
    require(pair is not None and d['indicator_id'] == pair[1], 'wrong examination denominator')
    require(n['unit'] == '人' and d['unit'] == '件', 'wrong examination units')
    for field in ('geography_code','observation_fiscal_year','publication_fiscal_year','source_sha256','source_sheet','source_row','population_scope'):
        require(n[field] == d[field], 'examination input mismatch: '+field)
    require(n['source_cell'] == pair[3]+str(n['source_row']) and d['source_cell'] == pair[4]+str(d['source_row']), 'wrong examination source cells')
    require(not n['comparison_allowed'] and not d['comparison_allowed'], 'examination temporal permission')
    for r in (n,d):
        require(r['value_state'] in ('numeric','zero','blank'), 'unknown examination value state')
        require((r['value'] is None and r['value_state']=='blank') or (type(r['value']) is int and r['value']>=0 and r['value_state']==('zero' if r['value']==0 else 'numeric')), 'invalid examination value')
    nv, dv = n['value'], d['value']
    require(nv is None or dv is None or nv <= dv, 'judgment count exceeds examination count')
    state = 'missing' if nv is None or dv is None else 'zero_denominator' if dv==0 else 'valid'
    return dict(value=nv/dv*100 if state=='valid' else None, state=state, unit='%', label=LABEL,
        numerator_value=nv, denominator_value=dv, numerator_record_id=n['record_id'], denominator_record_id=d['record_id'],
        numerator_unit='人', denominator_unit='件', denominator_kind='examination_count',
        formula='judgment_people / examination_count * 100', contract=VERSION,
        numerator_cell=n['source_cell'], denominator_cell=d['source_cell'], source_sha256=n['source_sha256'],
        comparison_allowed=False, validation_status='passed', official_evidence=copy.deepcopy(evidence))


def without_extension(site):
    result = copy.deepcopy(site)
    if 'other_rate_extension' not in result:
        return result
    result.pop('other_rate_extension'); result.pop('other_rates')
    lookup = {(r['source_sha256'],r['source_sheet'],r['source_cell']):r for r in result['reported']['records'] if r['geography_level']!='health_center_area' and r['indicator_id'] in {p[1] for p in PAIRS}}
    for table in result['published_tables']:
        for row in table['rows']:
            for cell in row['cells']:
                record=lookup.get((table['source']['sha256'],table['source_sheet'],cell['coordinate']))
                if record:
                    cell['visualization']=dict(indicator_id=record['indicator_id'],region=record['geography_code'],section='table')
    return result


def extend(site, root):
    require('other_rate_extension' not in site, 'duplicate examination rates')
    require(site.get('other_extension',{}).get('version')=='other-healthcheck-counts-v1', 'examination rates require audited detailed counts')
    evidence = audit(root, site)
    result = copy.deepcopy(site)
    source = site['reported']
    lookup={(r['indicator_id'],r['geography_code'],r['observation_fiscal_year']):r for r in source['records']}
    data={k:copy.deepcopy(v) for k,v in source.items() if k in ('input_run_id','years','population_scope','geographies','map','health_center_map','health_center_version','source_validation')}
    data.update(schema_version='other-examination-1',indicators=[],records=[],denominator_records=[],indicator_groups=[],insights=[],warnings=[NOTE])
    for id, test_id, label, _, _, _, maximum in PAIRS:
        data['indicators'].append(dict(indicator_id=id,name=label,public_label=label,short_label=label,unit='人',group='other',theme_id='other',theme_label='その他の健診項目',
            examination_contract=VERSION,examination_test_id=test_id,description=NOTE,source_notice=NOTE,overview_label='検査結果をひと目で見る',
            color='#667788',palette=['#eef2f5','#cdd7e0','#a4b6c6','#7c94aa','#4b6680'],map_breaks=[],map_scale=dict(mode='continuous',min=0,max=maximum),
            capabilities=dict(recipient_rate=False,composition=False,map_mode='rate',distribution=True,annual_reference_lines=False),
            examination_rate_label=LABEL))
        for geo in data['geographies']:
            for year in data['years']:
                n=copy.deepcopy(lookup[(id,geo['code'],year)])
                d=copy.deepcopy(lookup[(test_id,geo['code'],year)])
                n.update(denominator_record_id=d['record_id'],examination_rate=derive(n,d,evidence[id][str(year)]),display_contract=VERSION)
                require(n['examination_rate']['value'] is None or n['examination_rate']['value'] <= maximum, 'examination percentage exceeds audited fixed scale')
                data['records'].append(n);data['denominator_records'].append(d)
    aliases={p[1]:p[0] for p in PAIRS}
    for table in result['published_tables']:
        for row in table['rows']:
            for cell in row['cells']:
                link=cell.get('visualization')
                if link and link['indicator_id'] in aliases:
                    link['indicator_id']=aliases[link['indicator_id']]
    require(len(data['records'])==2*3*len(data['geographies']), 'incomplete examination rates')
    result['other_rates']=data
    result['other_rate_extension']=dict(version=VERSION,official_formula_evidence=evidence,temporal_comparison_allowed=False,
        denominator_kind='examination_count',source_reference='docs/other_healthcheck.md')
    return result
