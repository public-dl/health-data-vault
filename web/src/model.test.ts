import {describe,it,expect} from 'vitest';
import {connect,format,colorFor,csv,tableText,displayData,formatValue} from './model';
import type {Observation,Payload} from './model';
const a:Observation={record_id:'x',observation_fiscal_year:2021,publication_fiscal_year:2022,geography_code:'15202',geography_name:'長岡市',geography_level:'municipality',indicator_id:'test',unit:'人',value:0,value_state:'zero',validation_status:'passed',comparability_status:'compatible',comparison_allowed:true,population_scope:'test',comparability_intervals:{'2021_2022':'compatible'},source_url:'https://example.test/data',original_label:'試験',definition_version:'test',annual_page_url:'https://example.test/',source_sheet:'表',source_cell:'C6',source_sha256:'a'.repeat(64),retrieved_at:'2026-09-18T00:00:00+09:00'};
const b={...a,observation_fiscal_year:2022,value:10};
describe('display and comparison guard',()=>{
 it('connects valid adjacent observations',()=>expect(connect(a,b)).toBe(true));
 it.each([{value:null},{comparison_allowed:false},{comparability_status:'pending'},{comparability_status:'incompatible'},{validation_status:'failed'},{observation_fiscal_year:2023},{unit:'%'},{geography_code:'15'},{population_scope:'other'},{comparability_intervals:{'2021_2022':'pending'}}])('rejects invalid interval %j',change=>expect(connect(a,{...b,...change})).toBe(false));
 it('separates missing and zero',()=>{expect(format(0)).toBe('0');expect(format(null)).toBe('欠損');expect(colorFor(null,[1,2,3,4])).not.toBe(colorFor(0,[1,2,3,4]));});
 it('preserves raw missing state and provenance in CSV',()=>{const s=csv([{...a,value:null,value_state:'blank'}],'判定');expect(s).toContain('"","blank","人"');expect(s).toContain(a.source_url);});
 it('escapes quotes and spreadsheet formulas',()=>{expect(csv([{...a,geography_name:'=SUM(1,2)'}],'x"y')).toContain('"\'=SUM(1,2)"');expect(csv([a],'x"y')).toContain('"x""y"');});
 it('copies zero as zero',()=>expect(tableText([a],'判定')).toContain('\t0\t人\tzero\t'));
});

describe('audited percentage presentation',()=>{
 const denominator={...a,record_id:'den',indicator_id:'recipients',source_cell:'B6',value:200,comparability_status:'pending',comparison_allowed:false};
 const rate={value:5,value_state:'numeric',unit:'%',numerator_value:10,denominator_value:200,numerator_record_id:'x',denominator_record_id:'den',formula:'numerator / denominator * 100',definition_version:'rate-v1',definition_reference:'audit',comparability_status:'compatible',comparability_intervals:{'2021_2022':'compatible'},comparison_allowed:true,validation_status:'passed'};
 const data={records:[{...a,value:10,derived_rate:rate}],denominator_records:[denominator],indicators:[{indicator_id:'test',unit:'人',rate:{map_breaks:[5,10,20,40],intervals:{'2021_2022':'compatible'}}}]} as unknown as Payload;
 it('switches without mutating counts',()=>{const projected=displayData(data,'rate');expect(projected.records[0].value).toBe(5);expect(projected.records[0].denominator?.source_cell).toBe('B6');expect(displayData(data,'count').records[0].value).toBe(10);expect(data.records[0].unit).toBe('人');expect(projected.indicators[0].unit).toBe('%');});
 it('rounds only display and preserves zero',()=>{expect(formatValue(19.279078,'%')).toBe('19.3');expect(formatValue(0,'%')).toBe('0.0');expect(formatValue(null,'%')).toBe('欠損');});
 it('does not inherit count comparison authorization',()=>{const altered=structuredClone(data);altered.records[0].derived_rate!.comparability_status='pending';const r=displayData(altered,'rate').records[0];expect(connect(r,{...r,observation_fiscal_year:2022})).toBe(false);});
 it('exports numerator denominator formula and source cell',()=>{const rows=displayData(data,'rate').records;const out=csv(rows,'test');expect(out).toContain('"10","200","numerator / denominator * 100"');expect(out).toContain('"B6"');expect(tableText(rows,'test')).toContain('\t10\t200\t');});
});
