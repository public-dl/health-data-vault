import copy
import unittest
from pathlib import Path
from openpyxl import load_workbook
from hdv.common import read_json, read_jsonl
from hdv.glucose import MEMBERS, OFFICIAL, audit_formula_evidence, indicator_metadata
from hdv.lipids import audit_formula_evidence as lipid_evidence
from hdv.reported_annual import reported_payload
from hdv.single_judgment_rates import derive_single_rate, validate_single_rate
from hdv.site_release import annual_payload, published_tables

BASE='f66a35326c7f394b31ef7a8e4fb46bdbddbd28701583248afd9d8edfda19ac17'

@unittest.skipUnless(Path('data/public/candidates',BASE,'data.json').exists(),'Official fixtures required')
class GlucoseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.analysis=read_json(Path('data/public/candidates',BASE,'data.json'))
        run=Path('data/processed')/cls.analysis['input_run_id']
        cls.records=read_jsonl(run/'validated_records.jsonl')
        cls.sources=read_json(run/'collection.json')['sources']
        cls.lipid=lipid_evidence(Path('data'),cls.analysis)
        cls.evidence=audit_formula_evidence(Path('data'),cls.analysis)
        cls.data=reported_payload(cls.analysis,cls.records,True,cls.lipid,True,cls.evidence)

    def test_465_original_counts_279_ratios_and_186_count_only(self):
        ids=[m[0] for m in MEMBERS]
        rows=[r for r in self.data['records'] if r['indicator_id'] in ids]
        self.assertEqual(len(rows),465)
        self.assertEqual(sum('derived_rate' in r for r in rows),279)
        self.assertEqual(self.data['indicator_groups'],[])
        denominators={r['record_id']:r for r in self.data['denominator_records']}
        for source in self.sources:
            book=load_workbook(Path('data')/source['raw_path'],data_only=True,keep_links=False)
            try:
                for r in rows:
                    if r['source_sha256']!=source['sha256']:continue
                    d=denominators[r['denominator_record_id']]
                    self.assertEqual(r['value'],book[r['source_sheet']][r['source_cell']].value)
                    self.assertEqual(d['value'],book[d['source_sheet']][d['source_cell']].value)
                    self.assertFalse(r['comparison_allowed'])
                    self.assertEqual(r['comparability_intervals'],{'2021_2022':'pending','2022_2023':'pending'})
                    if r['indicator_id'] in OFFICIAL:
                        self.assertTrue(validate_single_rate(r['derived_rate'],r,d,self.data['rate_policy']))
                        self.assertEqual(r['derived_rate']['rate_origin'],'official-formula-confirmed')
                        self.assertEqual(r['derived_rate']['definition_reference'],'docs/glucose_v1.md')
                    else:
                        self.assertNotIn('derived_rate',r)
                        with self.assertRaises(ValueError):derive_single_rate(r,d,self.data['rate_policy'])
            finally:book.close()
        county={r['indicator_id']:r['value'] for r in rows if r['geography_code']=='15' and r['observation_fiscal_year']==2023}
        self.assertEqual(county,dict(zip(ids,[78101,7673,17839,6806,73580])))

    def test_official_evidence_scope_and_fail_closed(self):
        self.assertEqual(set(self.evidence),set(OFFICIAL))
        self.assertTrue(all(set(e)=={'2021','2022','2023'} for e in self.evidence.values()))
        n=next(r for r in self.data['records'] if r['indicator_id']=='hba1c')
        d=next(d for d in self.data['denominator_records'] if d['record_id']==n['denominator_record_id'])
        for field,value in [('source_cell','AA6'),('comparison_allowed',True),('value',d['value']+1),('population_scope','other')]:
            bad=copy.deepcopy(n);bad[field]=value
            with self.subTest(field=field),self.assertRaises(ValueError):derive_single_rate(bad,d,self.data['rate_policy'])
        for kind in ['rate_evidence','rate_definitions']:
            policy=copy.deepcopy(self.data['rate_policy']);del policy[kind]['hba1c']
            with self.assertRaises(ValueError):derive_single_rate(n,d,policy)
        bad=copy.deepcopy(d);bad['value']=0
        with self.assertRaises(ValueError):derive_single_rate(n,bad,self.data['rate_policy'])
        injected=copy.deepcopy(self.evidence);injected['random_glucose']={}
        with self.assertRaises(ValueError):reported_payload(self.analysis,self.records,True,self.lipid,True,injected)

    def test_existing_counts_rates_and_contract_are_unchanged(self):
        old=reported_payload(self.analysis,self.records,True,self.lipid,True)
        current={r['record_id']:r for r in self.data['records']}
        for r in old['records']:
            new=copy.deepcopy(current[r['record_id']]);new['display_contract']=r['display_contract']
            self.assertEqual(new,r)
        self.assertEqual(self.data['indicators'][:len(old['indicators'])],old['indicators'])

    def test_published_table_source_order_and_only_original_cells_link(self):
        annual=annual_payload(self.analysis,self.records)
        old=published_tables(Path('data'),self.analysis,annual)
        tables=published_tables(Path('data'),self.analysis,annual,self.data)
        for before,after in zip(old,tables):
            links=[c for row in after['rows'] for c in row['cells'] if c['visualization'] and c['visualization']['indicator_id'] in [m[0] for m in MEMBERS]]
            self.assertEqual(len(links),155)
            self.assertEqual([c['visualization']['indicator_id'] for c in after['rows'][5]['cells'][23:28]],[m[0] for m in MEMBERS])
            for br,ar in zip(before['rows'],after['rows']):
                for bc,ac in zip(br['cells'],ar['cells']):
                    self.assertEqual({k:v for k,v in bc.items() if k!='visualization'},{k:v for k,v in ac.items() if k!='visualization'})

    def test_fixed_domains_cover_all_approved_values(self):
        for i in indicator_metadata():
            if i['indicator_id'] not in OFFICIAL:
                self.assertNotIn('rate',i);self.assertNotIn('map_scale',i)
                continue
            values=[r['derived_rate']['value'] for r in self.data['records'] if r['indicator_id']==i['indicator_id']]
            self.assertGreaterEqual(min(values),i['map_scale']['min'])
            self.assertLessEqual(max(values),i['map_scale']['max'])
