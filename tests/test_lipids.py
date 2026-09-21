import copy
import unittest
from pathlib import Path
from openpyxl import load_workbook
from hdv.common import read_json, read_jsonl
from hdv.lipids import MEMBERS, audit_formula_evidence, indicator_metadata, RATE_MAP_BREAKS
from hdv.reported_annual import reported_payload
from hdv.single_judgment_rates import validate_single_rate, derive_single_rate

BASE='f66a35326c7f394b31ef7a8e4fb46bdbddbd28701583248afd9d8edfda19ac17'

@unittest.skipUnless(Path('data/public/candidates',BASE,'data.json').exists(),'Official fixtures required')
class LipidTests(unittest.TestCase):
    def test_fixed_map_metadata_and_2023_distribution(self):
        expected={'lipid_people':[60,65,70,75],'triglycerides':[24,28,32,36],
                  'hdl':[4,5,6,8],'ldl':[40,45,50,55],'total_cholesterol':[25,30,35,40]}
        self.assertEqual(RATE_MAP_BREAKS,expected)
        bins=[[2,9,12,6,1],[5,9,5,5,6],[3,7,12,6,2],[2,8,11,7,2],[6,3,9,10,2]]
        for indicator,counts in zip(indicator_metadata(),bins):
            breaks=indicator['rate']['map_breaks']
            self.assertEqual(breaks,expected[indicator['indicator_id']])
            rows=[r for r in self.data['records'] if r['indicator_id']==indicator['indicator_id'] and r['observation_fiscal_year']==2023 and r['geography_level']=='municipality']
            self.assertEqual([sum(sum(r['derived_rate']['value']>=b for b in breaks)==j for r in rows) for j in range(5)],counts)

    @classmethod
    def setUpClass(cls):
        cls.analysis=read_json(Path('data/public/candidates',BASE,'data.json'))
        run=Path('data/processed')/cls.analysis['input_run_id']
        cls.records=read_jsonl(run/'validated_records.jsonl')
        cls.evidence=audit_formula_evidence(Path('data'),cls.analysis)
        cls.data=reported_payload(cls.analysis,cls.records,True,cls.evidence)
        cls.sources=read_json(run/'collection.json')['sources']

    def test_all_465_values_against_original_cells_and_independent_rates(self):
        rows=[r for r in self.data['records'] if r['indicator_id'] in dict((i,c) for i,_,c,_ in MEMBERS)]
        self.assertEqual(len(rows),465)
        self.assertEqual(self.data['indicator_groups'],[])
        denominators={d['record_id']:d for d in self.data['denominator_records']}
        for source in self.sources:
            book=load_workbook(Path('data')/source['raw_path'],data_only=True,keep_links=False)
            try:
                for r in rows:
                    if r['source_sha256']!=source['sha256']:continue
                    d=denominators[r['denominator_record_id']]
                    self.assertEqual(r['value'],book[r['source_sheet']][r['source_cell']].value)
                    self.assertEqual(d['value'],book[d['source_sheet']][d['source_cell']].value)
                    self.assertTrue(validate_single_rate(r['derived_rate'],r,d,self.data['rate_policy']))
                    self.assertFalse(r['comparison_allowed'])
                    self.assertEqual(r['comparability_status'],'pending')
                sheet=book.worksheets[1]
                self.assertIsNone(sheet['V40'].value)
                for cell in ['V41','V42']:self.assertEqual(sheet[cell].value,0)
            finally:book.close()
        county={r['indicator_id']:(r['value'],round(r['derived_rate']['value'],1)) for r in rows if r['geography_code']=='15' and r['observation_fiscal_year']==2023}
        self.assertEqual(county,dict(zip([i for i,_,_,_ in MEMBERS],[(74971,65.9),(31433,27.6),(5467,4.8),(53381,46.9),(37544,33.0)])))
        for r in rows:
            expected='official-formula-confirmed' if r['indicator_id'] in ['triglycerides','hdl','ldl'] else 'hdv-derived'
            self.assertEqual(r['derived_rate']['rate_origin'],expected)

    def test_bad_inputs_or_evidence_cannot_grant_publication(self):
        n=next(r for r in self.data['records'] if r['indicator_id']=='lipid_people')
        d=next(d for d in self.data['denominator_records'] if d['record_id']==n['denominator_record_id'])
        for field,value in [('value',-1),('value',d['value']+1),('source_cell','S6'),('comparability_status','compatible'),('comparison_allowed',True)]:
            bad=copy.deepcopy(n);bad[field]=value
            with self.subTest(field=field),self.assertRaises(ValueError):derive_single_rate(bad,d,self.data['rate_policy'])
        bad=copy.deepcopy(d);bad['value']=0
        with self.assertRaises(ValueError):derive_single_rate(n,bad,self.data['rate_policy'])
        policy=copy.deepcopy(self.data['rate_policy']);del policy['rate_evidence']['lipid_people']
        with self.assertRaises(ValueError):derive_single_rate(n,d,policy)
        rate=copy.deepcopy(n['derived_rate']);rate['rate_origin']='official-formula-confirmed'
        with self.assertRaises(ValueError):validate_single_rate(rate,n,d,self.data['rate_policy'])
