import copy
import unittest
from pathlib import Path
from hdv.site_release import construct, inspect
from hdv.single_judgment_rates import derive_single_rate, validate_single_rate

BASE='f66a35326c7f394b31ef7a8e4fb46bdbddbd28701583248afd9d8edfda19ac17'

@unittest.skipUnless(Path('data/public/candidates',BASE,'data.json').exists(),'Official inputs required')
class SingleJudgmentRateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.site,cls.report=construct(Path('data'),BASE,include_reported=True,reported_rates=True)
        cls.data=cls.site['reported']

    def test_all_186_ratios_are_reproducible_without_partition_or_temporal_permission(self):
        data=self.data
        self.assertEqual(len(data['records']),186)
        self.assertEqual(len(data['denominator_records']),93)
        self.assertEqual(data['indicator_groups'],[])
        self.assertNotIn('composition_validation',data)
        self.assertTrue(all(i['rate']['label']=='特定健診受診者に占める割合（%）' for i in data['indicators']))
        for r in data['records']:
            d=next(d for d in data['denominator_records'] if d['record_id']==r['denominator_record_id'])
            self.assertTrue(validate_single_rate(r['derived_rate'],r,d,data['rate_policy']))
            self.assertEqual(r['derived_rate']['value'],r['value']/d['value']*100)
            self.assertFalse(r['comparison_allowed'])
            self.assertFalse(r['derived_rate']['comparison_allowed'])
            self.assertTrue(r['derived_rate']['regional_difference_allowed'])
            self.assertNotIn('residual',r)
        county={r['indicator_id']:r for r in data['records'] if r['geography_code']=='15' and r['observation_fiscal_year']==2023}
        self.assertAlmostEqual(county['bp_guidance']['derived_rate']['value'],24736/113771*100)
        self.assertAlmostEqual(county['bp_referral']['derived_rate']['value'],29305/113771*100)

    def test_wrong_denominator_year_region_source_and_count_are_rejected(self):
        n=self.data['records'][0];original=next(d for d in self.data['denominator_records'] if d['record_id']==n['denominator_record_id'])
        for field,value in [('value',0),('value',None),('value',-1),('indicator_id','bp_measured'),('geography_code','wrong'),('observation_fiscal_year',2020),('source_cell','C6'),('source_sha256','wrong'),('population_scope','wrong')]:
            d=copy.deepcopy(original);d[field]=value
            with self.subTest(field=field),self.assertRaises(ValueError):derive_single_rate(n,d,self.data['rate_policy'])
        for value in [-1,original['value']+1,float('nan')]:
            bad=copy.deepcopy(n);bad['value']=value
            with self.assertRaises(ValueError):derive_single_rate(bad,original,self.data['rate_policy'])
        zero=copy.deepcopy(n);zero.update(value=0,value_state='zero')
        self.assertEqual(derive_single_rate(zero,original,self.data['rate_policy'])['value'],0)

    def test_tampered_rate_and_permission_fail_closed(self):
        n=self.data['records'][0];d=next(d for d in self.data['denominator_records'] if d['record_id']==n['denominator_record_id'])
        for field,value in [('value',99),('denominator_value',999),('comparison_allowed',True),('comparability_status','compatible'),('denominator_kind','bp_measured'),('residual',1)]:
            rate=copy.deepcopy(n['derived_rate']);rate[field]=value
            with self.subTest(field=field),self.assertRaises(ValueError):validate_single_rate(rate,n,d,self.data['rate_policy'])

    def test_existing_count_only_candidate_remains_reproducible(self):
        old='37b86bd3ff4478a6121a96150b404bc03dfc7e102dfaac5da7d792fc3093dfdb'
        if Path('data/site/candidates',old,'data.json').exists():
            payload,_=inspect(Path('data'),old)
            self.assertEqual(payload['reported']['schema_version'],'reported-annual-1')
            self.assertTrue(all('derived_rate' not in r for r in payload['reported']['records']))
