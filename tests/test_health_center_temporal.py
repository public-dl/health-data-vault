import copy
import unittest
import test_health_center_zero as zero_tests
from hdv.health_center_temporal import apply
from hdv.health_centers import validate


class AnnualFactsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        zero_tests.DerivedZeroTests.setUpClass()
        cls.before=zero_tests.DerivedZeroTests.new
        cls.data=apply(cls.before)

    def test_exact_permission_and_unchanged_zero(self):
        self.assertTrue(validate(self.data))
        self.assertEqual(len(self.data['health_center_temporal_policy']['permissions']),26)
        self.assertEqual(self.data['derived_zero_policy'],self.before['derived_zero_policy'])
        for section in ('annual','reported'):
            self.assertEqual(self.data[section],self.before[section])
        for r in self.data['analysis']['records']:
            if r['geography_level']=='health_center_area':
                self.assertEqual(r['comparability_intervals'],{'2021_2022':'compatible','2022_2023':'compatible'})
                self.assertTrue(r['comparison_allowed'])
                self.assertFalse(r['temporal_difference_allowed'])
                self.assertFalse(r['trend_evaluation_allowed'])
                self.assertEqual(r['derived_rate']['comparability_intervals'],r['comparability_intervals'])
        self.assertTrue(all(r['comparability_status']=='pending' and not r['comparison_allowed'] for r in self.data['annual']['records'] if r['geography_level']=='health_center_area'))

    def test_rejects_permission_tampering(self):
        for section,field,value in [('annual','comparison_allowed',True),('analysis','trend_evaluation_allowed',True),('analysis','comparability_intervals',{'2021_2022':'compatible'})]:
            bad=copy.deepcopy(self.data)
            next(r for r in bad[section]['records'] if r['geography_level']=='health_center_area')[field]=value
            with self.assertRaises(ValueError):validate(bad)

    def test_missing_composition_or_zero_evidence_blocks_approval(self):
        bad=copy.deepcopy(self.before)
        bad['analysis']['composition_validation']=[p for p in bad['analysis']['composition_validation'] if p['geography_code']!='hc-15-niitsu']
        with self.assertRaises(ValueError):apply(bad)
        bad=copy.deepcopy(self.data)
        next(r for r in bad['analysis']['records'] if r.get('zero_derivation'))['raw_value']=0
        with self.assertRaises(ValueError):validate(bad)

    def test_older_policy_is_still_pending(self):
        self.assertTrue(validate(self.before))
        self.assertTrue(all(not r['comparison_allowed'] for r in self.before['analysis']['records'] if r['geography_level']=='health_center_area'))
