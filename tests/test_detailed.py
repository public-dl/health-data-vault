import copy
import os
import unittest
from pathlib import Path
from openpyxl import load_workbook
from hdv.common import read_json, read_jsonl, digest
from hdv.detailed import extend, without_extension, MEMBERS, IDS, VERSION

ROOT = Path(os.environ.get('HDV_TEST_DATA_DIR', Path(__file__).resolve().parents[1]/'data')).resolve()
BASE = '1e0b2f10ab797f8f635573d522c212f8f223d6d195851bddbd7fdb13cf3c9b17'


@unittest.skipUnless((ROOT/'site/releases'/BASE/'data.json').exists(), 'Official detailed fixtures required')
class DetailedTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base = read_json(ROOT/'site/releases'/BASE/'data.json')
        run = ROOT/'processed'/cls.base['analysis']['input_run_id']
        cls.raw = read_jsonl(run/'validated_records.jsonl')
        cls.sources = read_json(run/'collection.json')['sources']
        cls.data = extend(cls.base, cls.raw)
        cls.rows = [r for r in cls.data['reported']['records'] if r['indicator_id'] in IDS]

    def test_all_792_original_cells_units_and_hashes(self):
        self.assertEqual(len(self.rows), 792)
        self.assertEqual(len({(r['geography_code'], r['observation_fiscal_year'], r['indicator_id']) for r in self.rows}), 792)
        for source in self.sources:
            path = ROOT/source['raw_path']
            before = digest(path.read_bytes())
            self.assertEqual(before, source['sha256'])
            book = load_workbook(path, data_only=True, keep_links=False)
            try:
                for r in self.rows:
                    if r['source_sha256'] != source['sha256']:
                        continue
                    self.assertEqual(r['value'], book[r['source_sheet']][r['source_cell']].value)
                    self.assertEqual(r['unit'], next(m[3] for m in MEMBERS if m[0] == r['indicator_id']))
                    self.assertNotEqual(r['source_row'], 51)
                    if r['observation_fiscal_year'] == 2023:
                        self.assertEqual(r['source_sheet'], '保険者別 ')
            finally:
                book.close()
            self.assertEqual(digest(path.read_bytes()), before)

    def test_missing_and_zero_are_distinct(self):
        missing = [r for r in self.rows if r['value'] is None]
        self.assertEqual(len(missing), 6)
        self.assertEqual({r['geography_code'] for r in missing}, {'hc-15-kashiwazaki'})
        self.assertEqual({r['indicator_id'] for r in missing}, {'fundus', 'fundus_tests'})
        self.assertTrue(all(r['value_state'] == 'blank' for r in missing))
        zeros = [r for r in self.rows if r['value'] == 0]
        self.assertTrue(zeros)
        self.assertTrue(all(r['value_state'] == 'zero' for r in zeros))

    def test_no_rates_or_temporal_permission_and_ecg_break_is_preserved(self):
        for r in self.rows:
            self.assertFalse(r['comparison_allowed'])
            self.assertFalse(r['regional_difference_allowed'])
            self.assertEqual(r['source_count_contract'], VERSION)
            self.assertFalse(any(k in r for k in ['derived_rate', 'derivation', 'percentage']))
            self.assertEqual(r['comparability_intervals']['2022_2023'], 'incompatible' if r['indicator_id'] == 'ecg' else 'pending')
        for i in self.data['reported']['indicators']:
            if i['indicator_id'] in IDS:
                self.assertFalse(i['capabilities']['recipient_rate'])
                self.assertFalse(i['capabilities']['composition'])
                self.assertEqual(i['capabilities']['map_mode'], 'none')

    def test_existing_payload_and_table_cells_unchanged_except_new_links(self):
        self.assertEqual(without_extension(self.data), self.base)
        links = [cell['visualization'] for t in self.data['published_tables'] for row in t['rows'] for cell in row['cells'] if (cell.get('visualization') or {}).get('indicator_id') in IDS]
        self.assertEqual(len(links), 558)  # 6 fields × 31 adopted rows × 3 years
        self.assertTrue(all(link['section'] == 'table' for link in links))

    def test_2023_county_reference_values_and_no_combining_units(self):
        county = {r['indicator_id']: (r['value'], r['unit']) for r in self.rows if r['geography_code'] == '15' and r['observation_fiscal_year'] == 2023}
        self.assertEqual(county, dict(anemia=(15407, '人'), anemia_tests=(96437, '件'), ecg=(13525, '人'), ecg_tests=(61232, '件'), fundus=(775, '人'), fundus_tests=(37990, '件')))

    def test_rejects_new_units_symbols_permissions_source_columns_and_duplicates(self):
        index = next(n for n, r in enumerate(self.raw) if r['indicator_id'] == 'ecg' and r['included'] and r['source_row'] == 6)
        for field, value in [('unit', '件'), ('value_state', 'unknown'), ('comparison_allowed', True), ('source_cell', 'AG6'), ('comparability_status', 'pending'), ('value', True), ('derived_rate', {})]:
            bad = copy.deepcopy(self.raw)
            bad[index][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                extend(self.base, bad)
        with self.assertRaises(ValueError):
            extend(self.base, self.raw+[self.raw[index]])
        with self.assertRaises(ValueError):
            extend(self.data, self.raw)


if __name__ == '__main__':
    unittest.main()
