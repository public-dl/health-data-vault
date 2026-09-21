import copy
import unittest
from pathlib import Path

from hdv.common import read_json, read_jsonl, CONFIG
from hdv.publisher import make_payload, PUBLIC_CONFIG
from hdv.public_validator import validate_public
from hdv.insights import explain
from hdv.rates import derive


class RateUnitTests(unittest.TestCase):
    def inputs(self):
        base = dict(included=True, selection_status='included', validation_status='passed', unit='人',
                    value_state='numeric', observation_fiscal_year=2021, publication_fiscal_year=2022,
                    geography_name='試験市', geography_level='municipality', population_scope='scope',
                    source_sha256='a'*64, source_sheet='表', source_row=6)
        group = {k:dict(base,indicator_id=k,record_id=k,value=v) for k,v in [('a',0),('b',20),('recipients',20)]}
        policy = dict(denominator_indicator_id='recipients', components=['a','b'], observation_years=[2021],
                      population_scope='scope',comparability_status='compatible',intervals={},
                      definition_version='test-rate',audit_reference='test-audit')
        return group,policy

    def test_zero_numerator_and_independent_comparison(self):
        group,policy=self.inputs();group['recipients']['comparability_status']='pending'
        result=derive(group['a'],group,policy)
        self.assertEqual(result['value'],0)
        self.assertEqual(result['value_state'],'zero')
        self.assertEqual(result['comparability_status'],'compatible')

    def test_invalid_denominator_and_partition_fail_without_local_files(self):
        for change in ({'value':0},{'value':None,'value_state':'blank'},{'value':21},{'population_scope':'other'},
                       {'value':float('nan')},{'value':True},{'value_state':'excel_error'}):
            with self.subTest(change=change):
                group,policy=self.inputs();group['recipients'].update(change)
                with self.assertRaises(ValueError):derive(group['a'],group,policy)
        group,policy=self.inputs();policy['observation_years']=[2022]
        with self.assertRaises(ValueError):derive(group['a'],group,policy)


@unittest.skipUnless(Path('data/geography/niigata.json').exists(), 'Local source required')
class RateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        run = Path('data/processed/44595cc6bf204cffa81c485d72f91019')
        cls.rows = read_jsonl(run/'validated_records.jsonl')
        cls.report = read_json(run/'validation_report.json')
        cls.geo = read_json('data/geography/niigata.json')
        cls.settings = read_json(PUBLIC_CONFIG)
        cls.registry = read_json(CONFIG/'indicators.json')

    def payload(self, rows=None):
        return make_payload(self.rows if rows is None else rows,self.report,self.geo,self.settings,self.registry,'test')

    def test_actual_744_rates_and_93_denominators(self):
        p=self.payload();report=validate_public(p)
        self.assertEqual(report['errors'],0)
        self.assertEqual(report['derived_rates'],744)
        self.assertEqual(report['denominators'],93)
        r=next(r for r in p['records'] if r['geography_code']=='15' and r['indicator_id']=='metabo_case' and r['observation_fiscal_year']==2023)
        self.assertEqual(r['value'],21934)
        self.assertEqual(r['derived_rate']['value'],21934/113771*100)
        municipal=[r['derived_rate']['value'] for r in p['records'] if r['geography_level']=='municipality' and r['indicator_id']=='metabo_case' and r['observation_fiscal_year']==2023]
        self.assertNotEqual(r['derived_rate']['value'],sum(municipal)/len(municipal))
        self.assertTrue(all(d['comparability_status']=='pending' for d in p['denominator_records']))
        zero=next(r for r in p['records'] if r['value']==0)
        self.assertEqual(zero['derived_rate']['value'],0)

    def test_invalid_inputs_stop_build(self):
        for change in ({'value':0},{'value':None,'value_state':'blank'},{'population_scope':'other'},
                       {'value':117145},{'validation_status':'failed'},{'source_sha256':'other'}):
            with self.subTest(change=change):
                rows=copy.deepcopy(self.rows)
                d=next(r for r in rows if r['indicator_id']=='recipients' and r['geography_name']=='県計' and r['observation_fiscal_year']==2021)
                d.update(change)
                with self.assertRaises(ValueError):self.payload(rows)

    def test_public_validator_rechecks_invalid_denominators(self):
        base=self.payload()
        for change in ({'value':0},{'value':None,'value_state':'blank'},{'population_scope':'other'},{'value':999999}):
            with self.subTest(change=change):
                p=copy.deepcopy(base);p['denominator_records'][0].update(change)
                self.assertGreater(validate_public(p)['errors'],0)

    def test_tampered_formula_rate_and_comparability_rejected(self):
        base=self.payload()
        for change in ({'value':50},{'formula':'wrong'},{'denominator_value':10},{'comparability_status':'pending'}):
            p=copy.deepcopy(base);p['records'][0]['derived_rate'].update(change)
            self.assertIn('derived_rate_mismatch',validate_public(p)['issues'])
        p=copy.deepcopy(base);p['indicators'][0]['rate']['intervals']['2021_2022']='pending'
        self.assertGreater(validate_public(p)['errors'],0)

    def test_missing_partition_and_duplicate_inputs_rejected(self):
        rows=[r for r in self.rows if not (r['indicator_id']=='metabo_indeterminate' and r['geography_name']=='県計' and r['observation_fiscal_year']==2021)]
        with self.assertRaises(ValueError):self.payload(rows)
        duplicate=next(r for r in self.rows if r['included'] and r['geography_level']=='municipality')
        with self.assertRaises(ValueError):self.payload(self.rows+[duplicate])

    def test_rate_insights_use_points_and_actual_denominator(self):
        p=self.payload()
        note=next(i for i in p['insights'] if i['measure']=='rate' and i['indicator_id']=='metabo_case' and i['geography_code']=='15' and i['observation_fiscal_year']==2023)
        self.assertIn('113,771人',note['text']);self.assertIn('ポイント',note['text'])
        self.assertEqual(note['facts'][0]['value'],21934/113771*100)
