import copy,os,unittest
from pathlib import Path
from hdv.common import read_json
from hdv.other import without_extension as without_counts
from hdv.other_rates import derive, without_extension as without_rates
ROOT=Path(os.environ.get('HDV_TEST_DATA_DIR',Path(__file__).resolve().parents[1]/'data')).resolve()
ID='620f9e0441f735a5ef4dabe0a2800649e49d6851efde85a6e03b9c55b5ef94ad'
@unittest.skipUnless((ROOT/'site/candidates'/ID/'data.json').exists(),'Audited local candidate required')
class OtherExaminations(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.site=read_json(ROOT/'site/candidates'/ID/'data.json');cls.data=cls.site['other_rates'];cls.den={r['record_id']:r for r in cls.data['denominator_records']}
 def test_exact_base_and_no_public_switch(self):
  base=read_json(ROOT/'site/releases/36d764c21393fad5a4b93dab5efe74cd1373e274d4f9f38bde5e8cc0fe339d9c/data.json');self.assertEqual(without_counts(without_rates(self.site)),base)
 def test_all_pairs_and_states(self):
  from collections import Counter
  self.assertEqual(len(self.data['records']),264);self.assertEqual(Counter(r['examination_rate']['state'] for r in self.data['records']),dict(valid=145,zero_denominator=93,missing=26))
  for n in self.data['records']:
   d=self.den[n['denominator_record_id']];self.assertEqual(derive(n,d,n['examination_rate']['official_evidence']),n['examination_rate']);self.assertFalse(n['comparison_allowed']);self.assertEqual(n['comparability_intervals'],dict(zip(['2021_2022','2022_2023'],['pending','pending'])))
 def test_county_matches_official_overview(self):
  for n in self.data['records']:
   if n['geography_code']=='15':self.assertAlmostEqual(n['examination_rate']['value'],n['examination_rate']['official_evidence']['cached_value'],places=10)
 def test_wrong_denominator_unit_value_year_rejected(self):
  n=self.data['records'][0];d=self.den[n['denominator_record_id']]
  for field,val in [('indicator_id','total_protein_tests'),('unit','人'),('observation_fiscal_year',2000),('value',-1)]:
   bad=copy.deepcopy(d);bad[field]=val
   with self.assertRaises(Exception):derive(n,bad,n['examination_rate']['official_evidence'])
 def test_blank_positive_denominator_stays_missing(self):
  selected=[r for r in self.data['records'] if r['value'] is None and (r['examination_rate']['denominator_value'] or 0)>0];self.assertTrue(selected)
  for r in selected:self.assertEqual(r['examination_rate']['state'],'missing');self.assertIsNone(r['examination_rate']['value'])
