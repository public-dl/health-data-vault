import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from hdv.common import digest, read_json, write_json
from hdv.insights import explain
from hdv.public_validator import validate_public
from hdv.publisher import make_payload, build, inspect, approve, approved, export, PUBLIC_CONFIG
from hdv.normalizer import MUNICIPAL_SCOPE
from hdv.monitor import scan


def fixture():
    registry=[dict(indicator_id='example', comparability_status='compatible', unit='人', intervals={'2021_2022':'compatible'})]
    settings=[dict(indicator_id='example',name='試験判定',group='試験',description='テスト用')]
    map_data=dict(type='FeatureCollection',features=[dict(type='Feature',properties=dict(name='試験市',code='15299'),
        geometry=dict(type='Polygon',coordinates=[[[138,37],[138,38],[139,38],[138,37]]]))],metadata=dict(notice='参考境界'))
    records=[]
    for year in (2021,2022):
        for name,level in [('県計','prefecture_total'),('試験市','municipality')]:
            records.append(dict(observation_fiscal_year=year,publication_fiscal_year=year+1,geography_name=name,
                geography_level=level,indicator_id='example',value=year-2020,value_state='numeric',unit='人',
                population_scope=MUNICIPAL_SCOPE,comparability_status='compatible',comparison_allowed=True,
                comparability_intervals={'2021_2022':'compatible'},validation_status='passed',included=True,
                selection_status='included',source_url='https://www.kenko-niigata.com/example.xlsx',source_sheet='表',
                source_cell='C'+str(year)+(level[:1]),source_sha256='a'*64,definition_version='test'))
    report=dict(status='passed',errors=0,warnings=0,province_regression=dict(passed=123))
    return records,report,map_data,settings,registry


class PublicContractTests(unittest.TestCase):
    def payload(self):
        return make_payload(*fixture(),'test-run')

    def test_generic_indicator_registry_not_eight_hardcoded(self):
        records,report,geo,settings,registry=fixture()
        extra=[dict(r,indicator_id='future',source_cell='D'+r['source_cell']) for r in records]
        registry.append(dict(registry[0],indicator_id='future'))
        settings.append(dict(settings[0],indicator_id='future'))
        result=make_payload(records+extra,report,geo,settings,registry,'test')
        self.assertEqual(validate_public(result)['errors'],0)
        self.assertEqual(len(result['indicators']),2)
        self.assertEqual(len(result['records']),8)

    def test_explanation_order_is_deterministic(self):
        p=self.payload()
        order=[(i['indicator_id'],i['geography_code'],i['observation_fiscal_year']) for i in p['insights']]
        self.assertEqual(order, sorted(order))

    def test_non_adjacent_or_pending_intervals_rejected(self):
        p=self.payload();p['indicators'][0]['intervals']['2021_2022']='pending'
        self.assertIn('unsupported_comparison_interval',validate_public(p)['issues'])

    def test_monitor_new_source_never_creates_public_pointer(self):
        def fetcher(url):
            body=b'PKtest' if url.endswith('.xlsx') else b'<a href="/material/16_R9_tokuteikenshin.xlsx">new</a>'
            return body,{},url
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            result=scan(root,fetcher=fetcher)
            self.assertEqual(len(result['new_contract_required']),1)
            self.assertTrue((root/'monitor/latest.json').exists())
            self.assertFalse((root/'public/current.json').exists())

    def test_config_cannot_promote_pending(self):
        inputs=list(fixture());inputs[4][0]['comparability_status']='pending'
        with self.assertRaises(ValueError):make_payload(*inputs,'test')

    def test_value_tampering_and_missing_provenance(self):
        baseline=self.payload();changed=copy.deepcopy(baseline);changed['records'][0]['value']+=1
        self.assertGreater(validate_public(changed,baseline)['errors'],0)
        changed=copy.deepcopy(baseline);changed['records'][0]['source_cell']=''
        self.assertIn('provenance',validate_public(changed)['issues'])

    def test_duplicate_unknown_missing_and_excluded_records(self):
        baseline=self.payload()
        for mutate in (lambda p:p['records'].append(p['records'][0]),lambda p:p['records'].pop(),
                       lambda p:p['records'][0].update(geography_code='99999'),
                       lambda p:p['records'][0].update(included=False),
                       lambda p:p['records'][0].update(comparability_status='incompatible')):
            with self.subTest(mutate=mutate):
                changed=copy.deepcopy(baseline);mutate(changed)
                self.assertGreater(validate_public(changed)['errors'],0)

    def test_map_mismatch_and_duplicate(self):
        p=self.payload();p['map']['features'].append(copy.deepcopy(p['map']['features'][0]))
        self.assertIn('duplicate_map_feature',validate_public(p)['issues'])
        inputs=list(fixture());inputs[2]['features'][0]['properties']['name']='存在しない市'
        with self.assertRaises(ValueError):make_payload(*inputs,'test')

    def test_missing_and_zero_are_distinct(self):
        p=self.payload();a=p['records'][0];a.update(value=None,value_state='blank',comparison_allowed=False,validation_status='warning')
        self.assertEqual(validate_public(p)['errors'],0)
        a['value']=0
        self.assertIn('missing_value',validate_public(p)['issues'])
        a.update(value_state='zero',comparison_allowed=True,validation_status='passed')
        self.assertEqual(validate_public(p)['errors'],0)

    def test_insight_does_not_span_missing_or_bad_interval(self):
        records=self.payload()['records'][:2]
        result=explain(records,'県計','人');self.assertEqual(len(result['facts']),2)
        records[0].update(value=None,value_state='blank',comparison_allowed=False)
        self.assertEqual(len(explain(records,'県計','人')['facts']),1)


@unittest.skipUnless(Path('data/processed/44595cc6bf204cffa81c485d72f91019/run.json').exists() and Path('data/geography/niigata.json').exists(),'Official local inputs required')
class ReleaseWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from hdv.publisher import verified_records
        cls.records,cls.report=verified_records(Path('data'),'44595cc6bf204cffa81c485d72f91019')
        cls.geo=Path('data/geography/niigata.json').resolve()

    def create(self,root):
        return build(root,'reviewed-run',self.geo)[0]

    def test_build_and_validate_never_switch_current(self):
        with tempfile.TemporaryDirectory() as tmp,patch('hdv.publisher.verified_records',return_value=(self.records,self.report)):
            root=Path(tmp);id=self.create(root)
            _,r=inspect(root,id)
            self.assertEqual(r['records'],744);self.assertEqual(r['errors'],0)
            self.assertFalse((root/'public/current.json').exists())
            with self.assertRaises(FileNotFoundError):export(root,root/'web')

    def test_explicit_approval_requires_hash_reviewer_and_rights(self):
        with tempfile.TemporaryDirectory() as tmp,patch('hdv.publisher.verified_records',return_value=(self.records,self.report)):
            root=Path(tmp);id=self.create(root)
            for reviewer,sha,data_rights,map_rights in [('',id,True,True),('test','wrong',True,True),('test',id,False,True),('test',id,True,False)]:
                with self.assertRaises(ValueError):approve(root,id,reviewer,sha,data_rights,map_rights)
                self.assertFalse((root/'public/current.json').exists())

    def test_approved_release_is_pinned_exported_and_tamper_detected(self):
        with tempfile.TemporaryDirectory() as tmp,patch('hdv.publisher.verified_records',return_value=(self.records,self.report)):
            root=Path(tmp);id=self.create(root)
            approve(root,id,'test-only-reviewer',id,True,True)
            before=(root/'public/current.json').read_bytes()
            self.create(root);self.assertEqual(before,(root/'public/current.json').read_bytes())
            export(root,root/'web')
            self.assertEqual(digest((root/'web/releases'/f'{id}.json').read_bytes()),id)
            (root/'public/releases'/id/'data.json').write_text('{}')
            with self.assertRaises(ValueError):approved(root)

    def test_candidate_tampering_rejected(self):
        with tempfile.TemporaryDirectory() as tmp,patch('hdv.publisher.verified_records',return_value=(self.records,self.report)):
            root=Path(tmp);id=self.create(root)
            (root/'public/candidates'/id/'data.json').write_text('{}')
            with self.assertRaises(ValueError):inspect(root,id)
            self.assertFalse((root/'public/current.json').exists())

    def test_group_snapshot_is_hashed_and_independent_of_later_settings(self):
        from hdv.publisher import GROUP_CONFIG
        with tempfile.TemporaryDirectory() as tmp,patch('hdv.publisher.verified_records',return_value=(self.records,self.report)):
            root=Path(tmp)
            config=root/'groups-settings.json'
            config.write_bytes(GROUP_CONFIG.read_bytes())
            id,_=build(root,'reviewed-run',self.geo,groups_path=config)
            config.write_text('[]',encoding='utf-8')
            payload,report=inspect(root,id)
            self.assertEqual(payload['schema_version'],'public-3')
            self.assertEqual(report['compositions'],186)
            self.assertFalse((root/'public/current.json').exists())
            (root/'public/candidates'/id/'groups.json').write_text('[]',encoding='utf-8')
            with self.assertRaises(ValueError):inspect(root,id)


if __name__ == '__main__':unittest.main()
