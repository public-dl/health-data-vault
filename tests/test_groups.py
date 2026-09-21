import copy
import unittest
from pathlib import Path

from hdv.common import read_json, read_jsonl, CONFIG
from hdv.publisher import make_payload, PUBLIC_CONFIG, GROUP_CONFIG
from hdv.public_validator import validate_public


@unittest.skipUnless(Path('data/processed/44595cc6bf204cffa81c485d72f91019/validated_records.jsonl').exists(), 'Official local inputs required')
class GroupTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        run=Path('data/processed/44595cc6bf204cffa81c485d72f91019')
        cls.rows=read_jsonl(run/'validated_records.jsonl')
        cls.report=read_json(run/'validation_report.json')
        cls.geo=read_json('data/geography/niigata.json')
        cls.settings=read_json(PUBLIC_CONFIG)
        cls.registry=read_json(CONFIG/'indicators.json')
        cls.groups=read_json(GROUP_CONFIG)
        cls.legacy=make_payload(cls.rows,cls.report,cls.geo,cls.settings,cls.registry,'test')
        cls.payload=make_payload(cls.rows,cls.report,cls.geo,cls.settings,cls.registry,'test',cls.groups)

    def test_both_groups_186_partitions_and_unchanged_observations(self):
        p=self.payload
        self.assertEqual(p['schema_version'],'public-3')
        self.assertEqual(p['records'],self.legacy['records'])
        self.assertEqual(p['denominator_records'],self.legacy['denominator_records'])
        self.assertEqual(len(p['composition_validation']),186)
        self.assertEqual({g['group_id'] for g in p['indicator_groups']},{'metabo','guidance'})
        self.assertTrue(all(e['difference']==0 for e in p['composition_validation']))
        self.assertEqual(validate_public(p)['errors'],0)
        self.assertEqual(validate_public(self.legacy)['errors'],0)

    def test_category_contract_mutations_fail(self):
        mutations=[lambda g:g['categories'].pop(),lambda g:g['categories'][0].update(indicator_id='unknown'),
                   lambda g:g['categories'][1].update(category_id=g['categories'][0]['category_id']),
                   lambda g:g['categories'][1].update(order=0),lambda g:g.update(composition_rule='overlap'),
                   lambda g:g['categories'][0].update(rate_map_breaks=[10,5,2,1]),
                   lambda g:g.update(denominator_indicator_id='other'),
                   lambda g:g['categories'][0].update(category_id='unknown')]
        for mutate in mutations:
            with self.subTest(mutate=mutate):
                p=copy.deepcopy(self.payload);mutate(p['indicator_groups'][0])
                self.assertIn('invalid_group_composition',validate_public(p)['issues'])

    def test_missing_mismatch_denominator_and_provenance_fail(self):
        mutations=[lambda p:p['records'].pop(),lambda p:p['records'][0].update(value=None),
                   lambda p:p['records'][0].update(value=-1),lambda p:p['records'][0].update(population_scope='other'),
                   lambda p:p['records'][0].update(source_cell=''),
                   lambda p:p['records'][0]['derived_rate'].update(denominator_record_id='other'),
                   lambda p:p['denominator_records'][0].update(value=0),
                   lambda p:p['records'][0].update(value=p['records'][0]['value']+1)]
        for mutate in mutations:
            p=copy.deepcopy(self.payload);mutate(p)
            self.assertGreater(validate_public(p)['errors'],0)

    def test_evidence_cannot_be_forged(self):
        p=copy.deepcopy(self.payload);p['composition_validation'][0]['category_sum']+=1
        self.assertIn('composition_evidence_mismatch',validate_public(p)['issues'])

    def test_display_rounding_never_changes_partition_or_values(self):
        rs=[r for r in self.payload['records'] if r['geography_code']=='15' and r['observation_fiscal_year']==2021 and r['indicator_id'].startswith('metabo_')]
        self.assertAlmostEqual(sum(round(r['derived_rate']['value'],1) for r in rs),99.9)
        self.assertEqual(sum(r['value'] for r in rs),117144)
        self.assertEqual(validate_public(self.payload)['errors'],0)

    def test_unaudited_year_or_membership_fails(self):
        for mutation in ('year','components'):
            p=copy.deepcopy(self.payload)
            if mutation=='year':p['indicator_groups'][0]['observation_years'].append(2024)
            else:p['indicators'][0]['rate']['components'].pop()
            self.assertGreater(validate_public(p)['errors'],0)

    def test_group_config_is_not_mutated(self):
        self.assertEqual(self.groups,read_json(GROUP_CONFIG))
        self.assertNotIn('count_map_breaks',self.groups[0]['categories'][0])


if __name__=='__main__':unittest.main()
