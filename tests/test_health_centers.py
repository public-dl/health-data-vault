import copy
import json
import os
import unittest
from pathlib import Path
from hdv.health_centers import registry, area_map, validate


class HealthCenterRegistryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root=Path(__file__).resolve().parents[1]/'web/public/public-data'
        cls.base=json.loads((root/'releases/819d9ba9988bd53408a032f6092a94782e96054e3e9c71ed7853ad8868f67553.json').read_text(encoding='utf-8'))

    def test_hierarchy_has_13_areas_and_exactly_30_children(self):
        geos, areas=registry(self.base)
        self.assertEqual(len(geos),44)
        self.assertEqual(len(areas),13)
        self.assertEqual(len(set(c for a in areas for c in a['children'])),30)
        sanjo=next(a for a in areas if a['code']=='hc-15-sanjo')
        self.assertIn('15213',sanjo['children'])
        self.assertEqual(next(a for a in areas if a['identity_municipality'])['children'],['15100'])

    def test_geometry_is_union_and_city_identity(self):
        from shapely.geometry import shape
        from shapely.ops import unary_union
        _,areas=registry(self.base)
        original=self.base['analysis']['map']
        result=area_map(original,areas)
        self.assertEqual(len(result['features']),13)
        shapes={f['properties']['code']:f['geometry'] for f in original['features']}
        for f,a in zip(result['features'],areas):
            expected=unary_union([shape(shapes[c]) for c in a['children']])
            self.assertTrue(shape(f['geometry']).equals(expected))
            if a['identity_municipality']:self.assertEqual(f['geometry'],shapes['15100'])


class HealthCenterCandidateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root=Path(__file__).resolve().parents[1]/'web/public/public-data'
        pointer=json.loads((root/'current.json').read_text(encoding='utf-8'))
        path=Path(os.environ.get('HDV_HEALTH_CENTER_CANDIDATE',root/'releases'/f"{pointer['release_id']}.json"))
        cls.data=json.loads(path.read_text(encoding='utf-8'))
        cls.baseline=json.loads((root/'releases/819d9ba9988bd53408a032f6092a94782e96054e3e9c71ed7853ad8868f67553.json').read_text(encoding='utf-8'))

    def test_real_counts_sources_and_missing(self):
        self.assertTrue(validate(self.data,self.baseline))
        den=self.data['analysis']['denominator_records']
        self.assertEqual(next(r['value'] for r in den if r['geography_code']=='hc-15-sanjo' and r['observation_fiscal_year']==2023),12084)
        self.assertEqual(next(r['value'] for r in den if r['geography_code']=='15213' and r['observation_fiscal_year']==2023),3401)
        rows=[r for k in ('analysis','annual','reported') for r in self.data[k]['records'] if r['geography_level']=='health_center_area']
        self.assertEqual(len(rows),1092)
        self.assertEqual(sum(r['value'] is None for r in rows),9)
        self.assertTrue(all(r['source_row']!=51 for r in rows))
        self.assertTrue(all(r['comparability_status']=='pending' and not r['comparison_allowed'] for r in rows))
        self.assertTrue(all('derived_rate' not in r for r in self.data['reported']['records']))
        self.assertTrue(all(r['value_state']=='zero' for r in self.data['reported']['records'] if r['value']==0))

    def test_rejects_false_origin_temporal_permission_and_rate(self):
        for field,value in [('source_row',51),('value_origin','official_health_center_total'),('comparison_allowed',True),('value',-1)]:
            bad=copy.deepcopy(self.data)
            r=next(r for r in bad['reported']['records'] if r['geography_code']=='hc-15-niigata-city')
            r[field]=value
            with self.assertRaises(ValueError):validate(bad)
        bad=copy.deepcopy(self.data)
        next(r for r in bad['reported']['records'] if r['geography_level']=='health_center_area')['derived_rate']=None
        with self.assertRaises(ValueError):validate(bad)

    def test_rejects_changed_formula_and_geometry(self):
        bad=copy.deepcopy(self.data)
        next(r for r in bad['analysis']['records'] if r['geography_code']=='hc-15-sanjo')['derived_rate']['value']+=1
        with self.assertRaises(ValueError):validate(bad)
        bad=copy.deepcopy(self.data);bad['analysis']['health_center_map']['features'].pop()
        with self.assertRaises(ValueError):validate(bad)
