import copy
import unittest
from pathlib import Path
from hdv.common import read_json, read_jsonl
from hdv.reported_annual import reported_payload
from hdv.site_release import construct
from hdv.public_validator import validate_public

BASE='f66a35326c7f394b31ef7a8e4fb46bdbddbd28701583248afd9d8edfda19ac17'
RUN='44595cc6bf204cffa81c485d72f91019'

@unittest.skipUnless(Path('data/public/candidates',BASE,'data.json').exists(),'Official source fixtures required')
class ReportedTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.site,cls.report=construct(Path('data'),BASE,include_reported=True)
        cls.records=read_jsonl(Path('data/processed')/RUN/'validated_records.jsonl')

    def test_186_source_counts_no_derived_categories_or_permission(self):
        data=self.site['reported']
        self.assertEqual(len(data['records']),186)
        self.assertEqual(len(data['denominator_records']),93)
        self.assertEqual([i['indicator_id'] for i in data['indicators']],['bp_guidance','bp_referral'])
        self.assertEqual(data['indicator_groups'],[])
        self.assertTrue(all('rate' not in i for i in data['indicators']))
        for r in data['records']:
            self.assertFalse(r['comparison_allowed'])
            self.assertEqual(r['comparability_status'],'pending')
            self.assertNotIn('derived_rate',r)
            self.assertNotIn('residual',r)
            original=next(x for x in self.records if x['source_sha256']==r['source_sha256'] and x['source_sheet']==r['source_sheet'] and x['source_cell']==r['source_cell'])
            self.assertEqual(r['value'],original['value'])
        county={r['indicator_id']:r['value'] for r in data['records'] if r['geography_code']=='15' and r['observation_fiscal_year']==2023}
        self.assertEqual(county,{'bp_guidance':24736,'bp_referral':29305})
        self.assertEqual(validate_public(self.site['analysis'])['errors'],0)
        wrong=copy.deepcopy(self.site['analysis']);wrong['records'][0]['comparability_status']='pending'
        self.assertGreater(validate_public(wrong)['errors'],0)

    def test_invalid_source_denominator_and_temporal_promotion_rejected(self):
        for field,value in [('value',None),('value',-1),('value',999999),('source_cell','R6'),('source_row',999),('population_scope','other'),('comparison_allowed',True),('comparability_status','compatible'),('derived_rate',{})]:
            records=copy.deepcopy(self.records)
            row=next(r for r in records if r['included'] and r['indicator_id']=='bp_guidance' and r['geography_level']=='prefecture_total')
            row[field]=value
            with self.subTest(field=field),self.assertRaises(ValueError):reported_payload(self.site['analysis'],records)
        records=[r for r in self.records if not(r['included'] and r['indicator_id']=='bp_referral' and r['geography_level']=='prefecture_total')]
        with self.assertRaises(ValueError):reported_payload(self.site['analysis'],records)

    def test_only_selected_original_cells_linked(self):
        for table in self.site['published_tables']:
            for col,id in [(15,'bp_guidance'),(16,'bp_referral')]:
                mapped=[row['cells'][col] for row in table['rows'] if row['cells'][col]['visualization'] and row['cells'][col]['visualization']['indicator_id']==id]
                self.assertEqual(len(mapped),31)
                self.assertIsNotNone(table['rows'][5]['cells'][col]['visualization'])
                self.assertIsNone(table['rows'][50]['cells'][col]['visualization'])
