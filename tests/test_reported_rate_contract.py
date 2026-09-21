import copy
import unittest
import test_glucose
from hdv.reported_rate_contract import apply_contract, SPECS, OFFICIAL
from hdv.single_judgment_rates import derive_single_rate, validate_single_rate

class CommonRateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        test_glucose.GlucoseTests.setUpClass()
        cls.old=test_glucose.GlucoseTests.data
        cls.data=apply_contract(copy.deepcopy(cls.old))

    def test_all_1023_ratios_keep_original_counts_and_pending(self):
        old={r['record_id']:r for r in self.old['records']}
        ds={r['record_id']:r for r in self.data['denominator_records']}
        self.assertEqual(sum('derived_rate' in r for r in self.data['records']),1023)
        self.assertEqual(set(self.data['rate_policy']['numerator_columns']),set(SPECS))
        for r in self.data['records']:
            d=ds[r['denominator_record_id']]
            for k in ('value','source_cell','source_sha256','comparability_intervals','comparison_allowed'):
                self.assertEqual(r[k],old[r['record_id']][k])
            if r['indicator_id']=='random_glucose':
                self.assertNotIn('derived_rate',r)
                with self.assertRaises(ValueError):derive_single_rate(r,d,self.data['rate_policy'])
            else:
                rate=r['derived_rate']
                self.assertTrue(validate_single_rate(rate,r,d,self.data['rate_policy']))
                self.assertEqual(rate['value'],r['value']/d['value']*100)
                if 'derived_rate' in old[r['record_id']]:self.assertEqual(rate['value'],old[r['record_id']]['derived_rate']['value'])
                self.assertEqual(rate['rate_origin'],'official_formula_confirmed' if r['indicator_id'] in OFFICIAL else 'hdv_derived_from_reported_count')
        r=next(r for r in self.data['records'] if r['indicator_id']=='glucose_people' and r['geography_code']=='15' and r['observation_fiscal_year']==2023)
        self.assertEqual(r['derived_rate']['value'],78101/113771*100)
        self.assertEqual(self.data['indicator_groups'],[])

    def test_common_validator_rejects_missing_permission_evidence_and_bad_inputs(self):
        ds={r['record_id']:r for r in self.data['denominator_records']}
        for id in SPECS:
            n=next(r for r in self.data['records'] if r['indicator_id']==id);d=ds[n['denominator_record_id']]
            p=copy.deepcopy(self.data['rate_policy']);p['rate_contracts'][id]['approved']=False
            with self.assertRaises(ValueError):derive_single_rate(n,d,p)
            for field,value in [('source_cell','AA6'),('value',d['value']+1),('comparison_allowed',True)]:
                bad=dict(n);bad[field]=value
                with self.assertRaises(ValueError):derive_single_rate(bad,d,self.data['rate_policy'])
            if id in OFFICIAL:
                p=copy.deepcopy(self.data['rate_policy']);del p['rate_evidence'][id]
                with self.assertRaises(ValueError):derive_single_rate(n,d,p)

    def test_metadata_is_shared_and_new_domain_covers_93_values(self):
        for i in self.data['indicators']:
            self.assertEqual(i['recipient_label'],'特定健診受診者数')
            if i['indicator_id'] in SPECS:
                self.assertFalse(i['rate_contract']['composition'])
                self.assertEqual(i['rate']['label'],'特定健診受診者に占める割合（%）')
        vals=[r['derived_rate']['value'] for r in self.data['records'] if r['indicator_id']=='glucose_people']
        self.assertEqual(len(vals),93)
        self.assertTrue(all(40<=v<=90 for v in vals))
