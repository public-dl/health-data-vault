import copy
import os
import unittest
from pathlib import Path
from hdv.common import read_json, digest
from hdv.detailed_rates import extend, without_extension, derive, PAIRS

ROOT = Path(os.environ.get('HDV_TEST_DATA_DIR', Path(__file__).resolve().parents[1]/'data')).resolve()
BASE = '7f4b5b8dfee4bd415413442bff14884d03d8f1826644614ba0ef86f9459804c3'


@unittest.skipUnless((ROOT/'site/candidates'/BASE/'data.json').exists(), 'Official detailed fixtures required')
class DetailedRateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base = read_json(ROOT/'site/candidates'/BASE/'data.json')
        cls.site = extend(cls.base, ROOT)
        cls.data = cls.site['detailed_rates']
        cls.denominators = {d['record_id']: d for d in cls.data['denominator_records']}

    def test_all_396_pairs_keep_examination_units_cells_and_original_comparability(self):
        self.assertEqual(len(self.data['records']), 396)
        self.assertEqual(len(self.denominators), 396)
        for n in self.data['records']:
            d = self.denominators[n['denominator_record_id']]
            rate = n['examination_rate']
            self.assertEqual((n['unit'], d['unit']), ('人', '件'))
            self.assertEqual(d['indicator_id'], next(p[1] for p in PAIRS if p[0] == n['indicator_id']))
            self.assertEqual(derive(n, d, rate['official_evidence']), rate)
            self.assertEqual(rate['denominator_kind'], 'examination_count')
            self.assertFalse(n['comparison_allowed'])
            self.assertEqual(n['comparability_intervals']['2022_2023'], 'incompatible' if n['indicator_id'] == 'ecg' else 'pending')

    def test_zero_denominator_missing_and_true_zero_are_separate(self):
        rates = [r['examination_rate'] for r in self.data['records']]
        self.assertEqual({s: sum(r['state'] == s for r in rates) for s in ('valid','zero_denominator','missing')}, dict(valid=387, zero_denominator=6, missing=3))
        for q in rates:
            if q['state'] != 'valid':
                self.assertIsNone(q['value'])
        self.assertTrue(any(q['state'] == 'valid' and q['value'] == 0 for q in rates))

    def test_all_nine_official_formulas_and_county_percentages(self):
        evidence = self.site['detailed_rate_extension']['official_formula_evidence']
        for id, _, _, _, _, row, _ in PAIRS:
            self.assertEqual(set(evidence[id]), {'2021','2022','2023'})
            for year in (2021,2022,2023):
                r = next(r for r in self.data['records'] if r['indicator_id'] == id and r['geography_code'] == '15' and r['observation_fiscal_year'] == year)
                self.assertEqual(evidence[id][str(year)]['formula'], f'=J{row+1}/J{row}*100')
                self.assertAlmostEqual(evidence[id][str(year)]['cached_value'], r['examination_rate']['value'], places=10)
        current = {r['indicator_id']: round(r['examination_rate']['value'],1) for r in self.data['records'] if r['geography_code'] == '15' and r['observation_fiscal_year'] == 2023}
        self.assertEqual(current, dict(anemia=16.0,ecg=22.1,fundus=2.0))

    def test_original_payload_unchanged_and_source_links_use_three_examinations(self):
        self.assertEqual(without_extension(self.site), self.base)
        self.assertEqual(self.site['reported'], self.base['reported'])
        links = [c['visualization'] for t in self.site['published_tables'] for row in t['rows'] for c in row['cells'] if (c.get('visualization') or {}).get('indicator_id') in {'anemia','ecg','fundus'}]
        self.assertEqual(len(links), 558)
        self.assertTrue(all(link['section'] == 'table' for link in links))

    def test_rejects_recipient_denominators_other_examinations_units_years_and_bad_values(self):
        n = self.data['records'][0]
        d = self.denominators[n['denominator_record_id']]
        evidence = n['examination_rate']['official_evidence']
        for field, value in [('indicator_id','recipients'),('indicator_id','ecg_tests'),('unit','人'),('source_cell','B6'),('geography_code','other'),('observation_fiscal_year',2020),('value',-1),('value',True),('value_state','unknown')]:
            bad = dict(d);bad[field] = value
            with self.subTest(field=field,value=value), self.assertRaises(ValueError):
                derive(n,bad,evidence)
        bad = dict(n,value=d['value']+1)
        with self.assertRaises(ValueError): derive(bad,d,evidence)

    def test_fixed_scales_cover_audited_values_and_do_not_depend_on_selection(self):
        for i in self.data['indicators']:
            self.assertEqual(i['map_scale']['min'],0)
            maximum = i['map_scale']['max']
            values = [r['examination_rate']['value'] for r in self.data['records'] if r['indicator_id'] == i['indicator_id'] and r['examination_rate']['value'] is not None]
            self.assertLessEqual(max(values), maximum)
            self.assertFalse(i['capabilities']['annual_reference_lines'])

    def test_unknown_distribution_cannot_be_silently_clipped_to_the_map(self):
        bad=copy.deepcopy(self.base)
        n=next(r for r in bad['reported']['records'] if r['indicator_id']=='anemia' and r['geography_level']=='municipality')
        d=next(r for r in bad['reported']['records'] if r['indicator_id']=='anemia_tests' and r['geography_code']==n['geography_code'] and r['observation_fiscal_year']==n['observation_fiscal_year'])
        n['value']=d['value'];n['value_state']='numeric'
        with self.assertRaisesRegex(ValueError,'fixed scale'):
            extend(bad,ROOT)


if __name__ == '__main__': unittest.main()
