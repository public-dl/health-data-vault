import copy
import unittest
from pathlib import Path
from openpyxl import load_workbook
import test_liver
from hdv.renal import extend, MEMBERS
from hdv.single_judgment_rates import derive_single_rate, validate_single_rate


class RenalTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        test_liver.LiverTests.setUpClass()
        cls.base = test_liver.LiverTests
        cls.data = extend(copy.deepcopy(cls.base.data), Path('data'), cls.base.base.analysis, cls.base.base.records)
        cls.rows = [r for r in cls.data['records'] if r['indicator_id'] in {m[0] for m in MEMBERS}]

    def test_all_372_source_cells_and_five_numeric_zeros(self):
        self.assertEqual(len(self.rows), 372)
        self.assertEqual(sum(r['value']==0 for r in self.rows), 5)
        for source in self.base.base.sources:
            w = load_workbook(Path('data')/source['raw_path'], data_only=True, keep_links=False)
            try:
                for r in self.rows:
                    if r['source_sha256']!=source['sha256']:continue
                    self.assertEqual(r['value'], w[r['source_sheet']][r['source_cell']].value)
                    if r['value']==0:self.assertEqual(r['value_state'], 'zero')
                    if r['observation_fiscal_year']==2023:self.assertEqual(r['source_sheet'], '保険者別 ')
            finally:w.close()

    def test_only_ad_authorized_and_pending(self):
        policy=self.data['renal_contract']
        ds={r['record_id']:r for r in self.data['denominator_records']}
        self.assertEqual(set(policy['numerator_columns']), {'urine_protein'})
        for r in self.rows:
            d=ds[r['denominator_record_id']]
            self.assertFalse(r['comparison_allowed'])
            self.assertEqual(r['comparability_intervals'], {'2021_2022':'pending','2022_2023':'pending'})
            if r['indicator_id']=='urine_protein':
                self.assertTrue(validate_single_rate(r['derived_rate'],r,d,policy))
                self.assertEqual(r['derived_rate']['value'],r['value']/d['value']*100)
                self.assertEqual(r['derived_rate']['formula_evidence']['rate_cell'],'J30')
                self.assertLessEqual(r['derived_rate']['value'],8)
            else:
                self.assertNotIn('derived_rate',r)
                with self.assertRaises(ValueError):derive_single_rate(r,d,policy)
        bad=copy.deepcopy(policy);bad['rate_evidence']={}
        n=next(r for r in self.rows if r['indicator_id']=='urine_protein')
        with self.assertRaises(ValueError):derive_single_rate(n,ds[n['denominator_record_id']],bad)

    def test_noncomposition_and_existing_records_preserved(self):
        self.assertEqual(self.data['records'][:len(self.base.data['records'])],self.base.data['records'])
        self.assertEqual(self.data['indicators'][:len(self.base.data['indicators'])],self.base.data['indicators'])
        self.assertEqual(self.data['rate_policy'],self.base.data['rate_policy'])
        self.assertEqual(self.data['indicator_groups'],[])
        county={r['indicator_id']:r['value'] for r in self.rows if r['geography_code']=='15' and r['observation_fiscal_year']==2023}
        self.assertEqual(county,dict(renal_urinary_people=19960,urine_protein=4689,urine_blood=14061,creatinine=3397))
        self.assertNotEqual(county['renal_urinary_people'],sum(county[k] for k in ('urine_protein','urine_blood','creatinine')))
        for i in self.data['indicators'][-4:]:
            self.assertFalse(i['capabilities']['composition'])
            self.assertEqual('rate' in i, i['indicator_id']=='urine_protein')
            self.assertEqual(i['source_hierarchy'][:2],['判定区分（保健指導以上を再掲）','腎・尿路系'])

    def test_all_years_county_and_municipality_scope(self):
        expected = {2021: [21765, 4512, 16488, 3118],
                    2022: [21308, 4487, 15946, 3136],
                    2023: [19960, 4689, 14061, 3397]}
        for year, counts in expected.items():
            for (indicator, _, _, _), count in zip(MEMBERS, counts):
                rows = [r for r in self.rows if r['observation_fiscal_year']==year and r['indicator_id']==indicator]
                self.assertEqual(len(rows),31)
                self.assertEqual(len({r['geography_code'] for r in rows}),31)
                self.assertEqual(next(r['value'] for r in rows if r['geography_code']=='15'),count)
                self.assertEqual(sum(r['value'] for r in rows if r['geography_level']=='municipality'),count)

    def test_official_formula_is_not_an_official_municipal_percentage(self):
        for row in self.rows:
            self.assertEqual(row['source_label'], 'ｸﾚｱﾁﾆﾝ' if row['indicator_id']=='creatinine' else dict((m[0],m[1]) for m in MEMBERS)[row['indicator_id']])
            if row['indicator_id']!='urine_protein':
                self.assertNotIn('rate',row)
                self.assertNotIn('derivation',row)
                continue
            rate=row['derived_rate']
            self.assertTrue(rate['official_formula_confirmed'])
            self.assertEqual(rate['rate_origin'],'official_formula_confirmed')
            self.assertEqual(rate['value_origin'],'hdv_derived_from_reported_count')
            self.assertEqual(rate['formula_evidence']['source_sheet'],row['source_sheet'])
            bad=copy.deepcopy(rate);bad['value_origin']='official_municipality_rate'
            denominator=next(r for r in self.data['denominator_records'] if r['record_id']==row['denominator_record_id'])
            with self.assertRaises(ValueError):validate_single_rate(bad,row,denominator,self.data['renal_contract'])

    def test_fixed_map_domain_covers_only_municipal_observed_values(self):
        values=[r['derived_rate']['value'] for r in self.rows if r['indicator_id']=='urine_protein' and r['geography_level']=='municipality']
        self.assertEqual(len(values),90)
        self.assertEqual(min(values),0)
        self.assertAlmostEqual(max(values),7.588532883642496)
        self.assertEqual(next(i for i in self.data['indicators'] if i['indicator_id']=='urine_protein')['map_scale'],
                         dict(mode='continuous',min=0,max=8))
