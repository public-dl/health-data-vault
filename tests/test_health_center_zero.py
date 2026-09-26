import copy
import json
import unittest
from pathlib import Path
from hdv.health_center_zero import apply, evidence, validate_policy
from hdv.health_centers import validate


class DerivedZeroTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root=Path(__file__).resolve().parents[1]/'web/public/public-data'
        cls.old=json.loads((root/'releases/ad50d1980ded8094a30f9da67df32e63cc85bf9ba7a24547e6de6e123848a753.json').read_text(encoding='utf-8'))
        cls.new=apply(cls.old)

    def test_all_62_and_only_nine_public_records(self):
        self.assertEqual(len(evidence(self.new)),62)
        rows=[r for k in ('analysis','annual','reported') for r in self.new[k]['records'] if r.get('zero_derivation')]
        self.assertEqual(len(rows),9)
        self.assertTrue(all(r['raw_value'] is None and r['original_value'] is None and r['value']==0 for r in rows))
        self.assertEqual(self.old['published_tables'],self.new['published_tables'])
        self.assertTrue(validate(self.new))

    def test_complete_composition_and_pending(self):
        for group in ('metabo','guidance'):
            proofs=[p for p in self.new['analysis']['composition_validation'] if p['group_id']==group and p['geography_code'].startswith('hc-')]
            self.assertEqual(len(proofs),39)
            self.assertTrue(all(p['difference']==0 for p in proofs))
        self.assertTrue(all(not r['comparison_allowed'] for r in self.new['annual']['records'] if r['geography_level']=='health_center_area'))
        self.assertTrue(all('derived_rate' not in r for r in self.new['reported']['records']))

    def test_rejects_false_evidence(self):
        for value in (None,'-',False,1):
            bad=copy.deepcopy(self.new)
            bad['derived_zero_policy']['proofs'][0]['children'][0]['raw_value']=value
            with self.assertRaises(ValueError):validate_policy(bad)

    def test_incomplete_or_non_numeric_source_never_infers_zero(self):
        for value in (None,'-',False,1):
            bad=copy.deepcopy(self.old)
            table=bad['published_tables'][0]
            next(c for row in table['rows'] for c in row['cells'] if c['coordinate']=='F19')['original_value']=value
            self.assertFalse(any(p['source_cell']=='F18' and p['source']['observation_fiscal_year']==2021 for p in evidence(bad)))
        bad=copy.deepcopy(self.old)
        area=next(g for g in bad['analysis']['geographies'] if g['code']=='hc-15-niitsu')
        area['children'].pop()
        self.assertFalse(any(p['mapping_reference']=='hc-15-niitsu' for p in evidence(bad)))

    def test_old_release_still_valid(self):
        self.assertTrue(validate(self.old))
        self.assertNotIn('derived_zero_policy',self.old)
