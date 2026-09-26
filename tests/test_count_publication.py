import copy
import json
import unittest
from pathlib import Path
from hdv.count_publication import project, validate, IDS


class CountPublicationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        path = Path(__file__).resolve().parents[1]/'web/public/public-data/releases/f325c8b7373317aea721442edbf49867788a7270eb4b7da3e3477d38fc479ff9.json'
        cls.old = json.loads(path.read_text(encoding='utf-8'))
        cls.verified = cls.old['reported']
        cls.new = project(cls.verified)

    def test_all_counts_sources_zeros_and_comparability_preserved(self):
        self.assertEqual(len(self.new['records']), 1581)
        self.assertEqual({i['indicator_id'] for i in self.new['indicators']}, IDS)
        for before, after in zip(self.verified['records'], self.new['records']):
            for key, value in before.items():
                if key not in ('derived_rate', 'display_contract', 'regional_difference_allowed'):
                    self.assertEqual(after[key], value, key)
            self.assertNotIn('derived_rate', after)
            self.assertFalse(after['comparison_allowed'])
        self.assertTrue(validate(self.new, self.verified))
        self.assertEqual(sum(r['value']==0 for r in self.new['records']),sum(r['value']==0 for r in self.verified['records']))

    def test_1209_rates_removed_and_eight_formula_evidences_retained(self):
        self.assertEqual(sum('derived_rate' in r for r in self.verified['records']),1209)
        evidence=self.new['audit_evidence']
        self.assertEqual(evidence['previous_rate_policy'],self.verified['rate_policy'])
        self.assertEqual(evidence['previous_renal_contract'],self.verified['renal_contract'])
        self.assertEqual(evidence['indicators'],self.verified['indicators'])
        official={r['indicator_id'] for r in self.verified['records'] if r.get('derived_rate',{}).get('rate_origin')=='official_formula_confirmed'}
        self.assertEqual(len(official),8)

    def test_rejects_forbidden_rate_fields_even_null_and_capabilities(self):
        for field in ('derived_rate','derivation','rate','percentage','recipient_percentage'):
            bad=copy.deepcopy(self.new);bad['records'][0][field]=None
            with self.assertRaisesRegex(ValueError,'forbidden public rate'):validate(bad)
        bad=copy.deepcopy(self.new);bad['indicators'][0]['capabilities']['map_mode']='rate'
        with self.assertRaises(ValueError):validate(bad)

    def test_rejects_changed_count_zero_provenance_or_pending(self):
        for field,value in [('value',-1),('source_cell','B6'),('comparability_status','compatible')]:
            bad=copy.deepcopy(self.new);bad['records'][0][field]=value
            with self.assertRaises(ValueError):validate(bad,self.verified)
        bad=copy.deepcopy(self.new);next(r for r in bad['records'] if r['value']==0)['value']=None
        with self.assertRaises(ValueError):validate(bad,self.verified)

    def test_published_artifact_overall_and_source_tables_unchanged(self):
        base=Path(__file__).resolve().parents[1]/'web/public/public-data'
        artifact=json.loads((base/'releases/819d9ba9988bd53408a032f6092a94782e96054e3e9c71ed7853ad8868f67553.json').read_text(encoding='utf-8'))
        self.assertEqual(artifact['analysis'],self.old['analysis'])
        self.assertEqual(artifact['annual'],self.old['annual'])
        self.assertEqual(artifact['reported'],self.new)
        tables=copy.deepcopy(artifact['published_tables'])
        for table in tables:
            for row in table['rows']:
                for cell in row['cells']:
                    link=cell.get('visualization')
                    if link and link['indicator_id'] in IDS:
                        self.assertEqual(link.pop('section'),'table')
        self.assertEqual(tables,self.old['published_tables'])
