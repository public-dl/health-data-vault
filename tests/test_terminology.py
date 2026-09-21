import copy
import unittest
import test_glucose
from hdv.reported_rate_contract import apply_contract
from hdv.terminology import apply_terminology, configuration

class TerminologyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        test_glucose.GlucoseTests.setUpClass()
        cls.original=apply_contract(copy.deepcopy(test_glucose.GlucoseTests.data))

    def test_ten_labels_preserve_data_contract_and_blood_pressure(self):
        data=apply_terminology(copy.deepcopy(self.original),'2026-09-v1')
        for key in ('records','denominator_records','rate_policy','indicator_groups','source_validation','map'):
            self.assertEqual(data[key],self.original[key])
        selected=[i for i in data['indicators'] if i.get('semantic_key')]
        self.assertEqual(len(selected),10)
        for i in selected:
            self.assertEqual(i['semantic_key'],'reported_guidance_or_higher')
            self.assertEqual(i['name'],i['public_label'])
            self.assertEqual(i['terminology_version'],'2026-09-v1')
            self.assertEqual(i['source_hierarchy'][-1],i['source_label'])
            old=next(o for o in self.original['indicators'] if o['indicator_id']==i['indicator_id'])
            for k in ('rate','map_scale','chart_max','capabilities','intervals'):
                self.assertEqual(i.get(k),old.get(k))
        self.assertEqual(next(i for i in selected if i['indicator_id']=='hba1c')['public_label'],'HbA1c：保健指導以上として再掲された人数')
        self.assertEqual(next(i for i in selected if i['indicator_id']=='lipid_people')['public_label'],'脂質代謝：保健指導以上として再掲された実人員')
        for i in data['indicators'][:2]:
            self.assertNotIn('semantic_key',i)
            self.assertEqual(i['name'],next(o['name'] for o in self.original['indicators'] if o['indicator_id']==i['indicator_id']))

    def test_central_template_edit_updates_all_labels_and_notes_not_blood_pressure(self):
        config=configuration();terms=config['versions']['2026-09-v1']
        for key in ('full_template','real_people_template','short_template','real_people_short_template'):
            terms[key]=terms[key].replace('保健指導以上','一括変更テスト')
        terms['common_note']='共通説明の変更テスト。'
        data=apply_terminology(copy.deepcopy(self.original),'2026-09-v1',config)
        for i in data['indicators']:
            if i['indicator_id'].startswith('bp_'):
                self.assertNotIn('一括変更テスト',i['name'])
            else:
                self.assertIn('一括変更テスト',i['public_label'])
                self.assertIn('一括変更テスト',i['short_label'])
                self.assertIn('共通説明の変更テスト',i['source_notice'])
        self.assertEqual(data['records'],self.original['records'])
