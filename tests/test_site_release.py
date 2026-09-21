import copy
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from hdv.common import read_json, read_jsonl, digest, atomic_write
from hdv.publisher import encoded
from hdv.public_validator import validate_public
from hdv.site_release import annual_payload, display_cell, construct, build, inspect, approve, approved

BASE='f66a35326c7f394b31ef7a8e4fb46bdbddbd28701583248afd9d8edfda19ac17'
RUN='44595cc6bf204cffa81c485d72f91019'


class DisplayTests(unittest.TestCase):
    def test_zero_blank_hyphen_remain_distinct(self):
        self.assertEqual(display_cell(dict(cached_value=0,number_format='#,##0;\\-#,##0;\\-')),'-')
        self.assertEqual(display_cell(dict(cached_value=None)), '')
        self.assertEqual(display_cell(dict(cached_value='－')), '－')
        with self.assertRaises(ValueError):display_cell(dict(cached_value=1,number_format='0.0%'))


@unittest.skipUnless(Path('data/public/candidates',BASE,'data.json').exists(),'Official local inputs required')
class AnnualSourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.site,cls.report=construct(Path('data'),BASE)
        cls.analysis=cls.site['analysis']
        cls.records=read_jsonl(Path('data/processed')/RUN/'validated_records.jsonl')

    def test_93_partitions_and_county_values(self):
        a=self.site['annual']
        self.assertEqual(len(a['composition_validation']),93)
        self.assertEqual(len(a['records']),279)
        county=[r for r in a['records'] if r['geography_code']=='15']
        self.assertEqual([r['value'] for r in county if r['indicator_id']=='physician_normal'],[3654,4022,3992])
        self.assertTrue(all(p['difference']==0 for p in a['composition_validation']))
        self.assertTrue(all(r['comparability_status']=='pending' and not r['comparison_allowed'] and r['annual_display_allowed'] for r in a['records']))
        self.assertTrue(all(r['derived_rate']['comparability_status']=='pending' and not r['derived_rate']['comparison_allowed'] for r in a['records']))
        temporal=copy.deepcopy(self.analysis)
        temporal['records'][0]['comparability_status']='pending'
        temporal['records'][0]['comparison_allowed']=False
        self.assertGreater(validate_public(temporal)['errors'],0)
        self.assertEqual(validate_public(self.analysis)['errors'],0)

    def test_missing_zero_mismatch_population_and_promotion_fail_closed(self):
        for field,value in [('value',None),('value',-1),('value',0),('population_scope','different'),('source_row',999),('comparability_status','compatible'),('comparison_allowed',True)]:
            records=copy.deepcopy(self.records)
            row=next(r for r in records if r['included'] and r['indicator_id']=='physician_normal' and r['geography_level']=='prefecture_total')
            row[field]=value
            with self.subTest(field=field,value=value),self.assertRaises(ValueError):annual_payload(self.analysis,records)
        records=copy.deepcopy(self.records)
        records.append(next(r for r in records if r['included'] and r['indicator_id']=='physician_normal' and r['geography_level']=='prefecture_total'))
        with self.assertRaises(ValueError):annual_payload(self.analysis,records)

    def test_original_rows_and_no_automatic_indicators(self):
        self.assertEqual([t['row_count'] for t in self.site['published_tables']],[55,51,55])
        self.assertEqual(self.report['table_cells'],6762)
        for t in self.site['published_tables']:
            self.assertEqual([r['index'] for r in t['rows']],list(range(1,t['row_count']+1)))
            self.assertEqual(t['rows'][49]['cells'][0]['original_value'],'新潟市')
            self.assertEqual(t['rows'][50]['cells'][0]['original_value'],'新潟市')
            self.assertIsNotNone(t['rows'][49]['cells'][4]['visualization'])
            self.assertIsNone(t['rows'][50]['cells'][4]['visualization'])
            self.assertIsNone(t['rows'][5]['cells'][15]['visualization'])
        t=self.site['published_tables'][0]
        zero=t['rows'][10]['cells'][5]
        self.assertEqual((zero['value_state'],zero['value'],zero['display_text']),('zero',0,'-'))

    def test_build_is_not_approval_and_tamper_rejected(self):
        with tempfile.TemporaryDirectory() as tmp,patch('hdv.site_release.construct',return_value=(self.site,self.report)):
            root=Path(tmp);id,_=build(root,BASE)
            self.assertFalse((root/'site/current.json').exists())
            inspect(root,id)
            for args in [('',id,True,True),('test','bad',True,True),('test',id,False,True)]:
                with self.assertRaises(ValueError):approve(root,id,*args)
            changed=copy.deepcopy(self.site);changed['annual']['records'][0]['value']+=1
            changed_id=digest(encoded(changed));atomic_write(root/'site/candidates'/changed_id/'data.json',encoded(changed))
            with self.assertRaises(ValueError):inspect(root,changed_id)
            approve(root,id,'test-only',id,True,True)
            self.assertEqual(approved(root)[0]['release_id'],id)
            atomic_write(root/'site/releases'/id/'data.json',b'{}')
            with self.assertRaises(ValueError):approved(root)
