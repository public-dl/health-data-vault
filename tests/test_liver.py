import copy
import unittest
from pathlib import Path
from openpyxl import load_workbook
import test_glucose
from hdv.liver import audit_formula_evidence
from hdv.reported_annual import reported_payload
from hdv.reported_rate_contract import apply_contract
from hdv.single_judgment_rates import derive_single_rate, validate_single_rate
from hdv.terminology import apply_terminology
from hdv.site_release import published_tables, annual_payload


class LiverTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        test_glucose.GlucoseTests.setUpClass()
        cls.base = test_glucose.GlucoseTests
        cls.evidence = audit_formula_evidence(Path('data'), cls.base.analysis)
        cls.counts = reported_payload(cls.base.analysis, cls.base.records, True, cls.base.lipid, True, cls.base.evidence, cls.evidence)
        cls.data = apply_terminology(apply_contract(copy.deepcopy(cls.counts), include_liver=True), '2026-09-v1')

    def test_93_original_w_b_pairs_and_three_official_percentages(self):
        rows = [r for r in self.data['records'] if r['indicator_id']=='liver']
        self.assertEqual(len(rows),93)
        ds = {d['record_id']:d for d in self.data['denominator_records']}
        for source in self.base.sources:
            book = load_workbook(Path('data')/source['raw_path'],data_only=True,keep_links=False)
            try:
                for r in rows:
                    if r['source_sha256']!=source['sha256']:continue
                    d=ds[r['denominator_record_id']]
                    self.assertEqual(r['source_cell'],'W'+str(r['source_row']))
                    self.assertEqual(d['source_cell'],'B'+str(r['source_row']))
                    self.assertEqual(r['value'],book[r['source_sheet']][r['source_cell']].value)
                    self.assertEqual(d['value'],book[d['source_sheet']][d['source_cell']].value)
                    rate=r['derived_rate']
                    self.assertTrue(validate_single_rate(rate,r,d,self.data['rate_policy']))
                    self.assertEqual(rate['value'],r['value']/d['value']*100)
                    self.assertEqual(rate['rate_origin'],'official_formula_confirmed')
                    self.assertEqual(r['comparability_intervals'],{'2021_2022':'pending','2022_2023':'pending'})
                    self.assertFalse(r['comparison_allowed'])
                    self.assertTrue(18<=rate['value']<=32)
                    if r['geography_code']=='15':self.assertAlmostEqual(rate['value'],book.worksheets[0]['J26'].value,places=10)
            finally:book.close()
        r=next(r for r in rows if r['geography_code']=='15' and r['observation_fiscal_year']==2023)
        self.assertEqual((r['value'],ds[r['denominator_record_id']]['value']),(28783,113771))
        self.assertEqual(round(r['derived_rate']['value'],1),25.3)

    def test_metadata_semantic_and_no_invented_categories(self):
        i=next(i for i in self.data['indicators'] if i['indicator_id']=='liver')
        self.assertEqual(i['name'],'肝機能：保健指導以上として再掲された人数')
        self.assertEqual(i['short_label'],'肝機能：保健指導以上')
        self.assertEqual(i['source_hierarchy'],['判定区分（保健指導以上を再掲）','肝機能'])
        self.assertEqual(i['semantic_key'],'reported_guidance_or_higher')
        self.assertEqual(i['map_scale'],dict(mode='continuous',min=18,max=32))
        self.assertFalse(i['capabilities']['composition'])
        self.assertEqual(self.data['indicator_groups'],[])
        self.assertEqual(set(i['indicator_id'] for i in self.data['indicators'])-set(i['indicator_id'] for i in self.base.data['indicators']),{'liver'})

    def test_rejects_wrong_source_denominator_evidence_and_permissions(self):
        n=next(r for r in self.data['records'] if r['indicator_id']=='liver')
        d=next(d for d in self.data['denominator_records'] if d['record_id']==n['denominator_record_id'])
        for field,value in [('source_cell','X6'),('value',d['value']+1),('value',-1),('comparison_allowed',True)]:
            bad=dict(n);bad[field]=value
            with self.subTest(field=field),self.assertRaises(ValueError):derive_single_rate(bad,d,self.data['rate_policy'])
        for field,value in [('source_cell','C6'),('value',0),('observation_fiscal_year',2020),('geography_code','invalid')]:
            bad=dict(d);bad[field]=value
            with self.subTest(field=field),self.assertRaises(ValueError):derive_single_rate(n,bad,self.data['rate_policy'])
        p=copy.deepcopy(self.data['rate_policy']);del p['rate_evidence']['liver']
        with self.assertRaises(ValueError):derive_single_rate(n,d,p)
        with self.assertRaises(ValueError):apply_contract(copy.deepcopy(self.counts))
        bad=copy.deepcopy(n['derived_rate']);bad['value']+=.1
        with self.assertRaises(ValueError):validate_single_rate(bad,n,d,self.data['rate_policy'])

    def test_old_records_unchanged_and_original_table_cells_link(self):
        current={r['record_id']:r for r in self.counts['records']}
        for r in self.base.data['records']:self.assertEqual(current[r['record_id']],r)
        annual=annual_payload(self.base.analysis,self.base.records)
        before=published_tables(Path('data'),self.base.analysis,annual,self.base.data)
        after=published_tables(Path('data'),self.base.analysis,annual,self.data)
        for a,b in zip(before,after):
            links=[c for row in b['rows'] for c in row['cells'] if c['visualization'] and c['visualization']['indicator_id']=='liver']
            self.assertEqual(len(links),31)
            for ar,br in zip(a['rows'],b['rows']):
                for ac,bc in zip(ar['cells'],br['cells']):self.assertEqual({k:v for k,v in ac.items() if k!='visualization'},{k:v for k,v in bc.items() if k!='visualization'})
