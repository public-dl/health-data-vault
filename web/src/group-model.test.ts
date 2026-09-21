import {describe,it,expect} from 'vitest';
import type {Payload,IndicatorGroup,Observation} from './model';
import {tableYears,transposedGroupTableText,composition,stackSegments,groupRows,groupCsv,groupTableText} from './group-model';
import {displayData} from './model';

function fixture() {
  const group={group_id:'test',name:'試験分類',definition_version:'v1',categories:['a','b','c','d'].map((id,order)=>({category_id:id,label:id,order,indicator_id:id,color:'#245d9c',rate_map_breaks:[1,2,3,4],count_map_breaks:[1,2,3,4]}))} as IndicatorGroup;
  const counts=[0,1,1,1],denominator={record_id:'den',value:3,source_cell:'B1',source_url:'https://example.test/source',source_sheet:'表',source_sha256:'hash'} as Observation;
  const records=counts.map((value,i)=>({record_id:'r'+i,indicator_id:group.categories[i].indicator_id,value,unit:'人',geography_code:'A',geography_name:'試験市',observation_fiscal_year:2023,publication_fiscal_year:2024,validation_status:'passed',comparison_allowed:true,source_cell:'C'+i,source_url:'https://example.test/source',source_sheet:'表',source_sha256:'hash',derived_rate:{value:value/3*100,unit:'%',numerator_value:value,numerator_record_id:'r'+i,denominator_value:3,denominator_record_id:'den',validation_status:'passed',comparison_allowed:true,formula:'numerator / denominator * 100'}} as Observation));
  const data={schema_version:'public-3',years:[2023],geographies:[{code:'A',name:'試験市'}],records,denominator_records:[denominator],indicators:group.categories.map(c=>({indicator_id:c.indicator_id,name:c.label,rate:{label:'割合'}})),indicator_groups:[group],composition_validation:[{group_id:'test',geography_code:'A',observation_fiscal_year:2023,category_record_ids:records.map(r=>r.record_id),denominator_record_id:'den',denominator_value:3,category_sum:3,difference:0,validation_status:'passed',definition_version:'v1'}]} as Payload;
  return {data,group};
}
describe('group composition views',()=>{
  it('keeps category order and zero in count and rate modes',()=>{
    const {data,group}=fixture();for(const source of [data,displayData(data,'rate')]){const p=composition(source,group,'A',2023)!;expect(p.rows.map(r=>r.indicator_id)).toEqual(['a','b','c','d']);expect(p.rows[0].value).toBe(0);expect(p.denominator).toBe(3);}
  });
  it('never corrects a 99.9 percent display sum',()=>{
    const {data,group}=fixture(),rates=displayData(data,'rate');const p=composition(rates,group,'A',2023)!;
    expect(p.rows.reduce((s,r)=>s+Number(r.value!.toFixed(1)),0)).toBeCloseTo(99.9);
    expect(stackSegments(p.rows).at(-1)!.end).toBeCloseTo(100);
    expect(stackSegments(p.rows.slice(1,3)).at(-1)!.end).toBeCloseTo(200/3);
  });
  it('fails closed for missing or duplicate categories',()=>{
    const {data,group}=fixture();data.records.pop();expect(composition(data,group,'A',2023)).toBeNull();
    const f=fixture();f.data.records.push(f.data.records[0]);expect(composition(f.data,f.group,'A',2023)).toBeNull();
  });
  it('fails closed for missing evidence, zero denominator and null values',()=>{
    const {data,group}=fixture();data.composition_validation=[];expect(composition(data,group,'A',2023)).toBeNull();
    const f=fixture();f.data.composition_validation![0].denominator_value=0;expect(composition(f.data,f.group,'A',2023)).toBeNull();
    const g=fixture();g.data.records[0].value=null;expect(composition(g.data,g.group,'A',2023)).toBeNull();
  });
  it('exports group columns without replacing indicator ids or denominator provenance',()=>{
    const {data,group}=fixture(),before=JSON.stringify(data);const output=groupCsv(data,group,groupRows(data,group,['A']));
    expect(output).toContain('group_id,category_id,category_order');expect(output).toContain('"test","a","0"');expect(output).toContain('"B1"');expect(output).toContain('"C0"');expect(JSON.stringify(data)).toBe(before);
  });
  it('copies one denominator per year in the wide table',()=>{
    const {data,group}=fixture();const text=groupTableText(displayData(data,'rate'),group,'A');expect(text).toContain('実績年度\ta\tb\tc\td\t受診者数');expect(text).toContain('0.0%（0人）');expect(text).toContain('100');
  });
  it('preserves raw references when selecting categories in a different order',()=>{
    const {data,group}=fixture();const swapped={...group,categories:[...group.categories].reverse()};const part=composition(data,swapped,'A',2023)!;expect(part.rows.map(r=>r.source_cell)).toEqual(['C3','C2','C1','C0']);
  });
});

describe('category rows and year columns',()=>{
 it('uses at most the selected five calendar years, never inventing missing years',()=>{
  expect(tableYears([2021,2022,2023],2023)).toEqual([2021,2022,2023]);
  expect(tableYears([2021,2022,2023],2022)).toEqual([2021,2022]);
  expect(tableYears([2020,2021,2022,2023,2024,2025,2026],2026)).toEqual([2022,2023,2024,2025,2026]);
  expect(tableYears([2020,2023,2023,2026],2026)).toEqual([2023,2026]);
 });
 it('copies categories vertically, with real zero, denominator, validation and provenance',()=>{
  const {data,group}=fixture(),before=JSON.stringify(data);
  const text=transposedGroupTableText(displayData(data,'rate'),group,'A',[2023]);
  expect(text).toContain('区分\t2023年度');expect(text).toContain('a\t0.0%');
  expect(text).toContain('受診者数（人）\t3');expect(text).toContain('人数合計一致');expect(text).toContain('C0');
  expect(JSON.stringify(data)).toBe(before);
 });
});
