import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {comparisonTable,comparisonCsv,comparisonFrames,safeExportCell} from './comparison-export-model';
import {ComparisonActions} from './comparison-export';
import type {Payload,Observation} from './model';
import type {Context} from './panels';
function fixture(){
 const records=['A','B'].flatMap((code,index)=>[2021,2022,2023].map((year,i)=>({record_id:code+year,geography_code:code,geography_name:code,indicator_id:'case',observation_fiscal_year:year,publication_fiscal_year:year+1,value:[19.1,19.3,19.3][i]+index,unit:'%',value_state:'numeric',comparison_allowed:true,comparability_status:'compatible',source_url:'https://example.test/'+code,source_sheet:'表',source_cell:'E6',derivation:{value:19.1+index,numerator_value:22401+index,denominator_value:117144,comparability_status:'compatible'}} as Observation)));
 const data={records,geographies:[{code:'A',name:'地域A'},{code:'B',name:'地域B'}],indicators:[{indicator_id:'case',name:'基準該当'}],population_scope:'試験対象',years:[2021,2022,2023]} as Payload;
 return {data,regions:['A','B'],indicatorId:'case',year:2023,measure:'rate' as const,release:'test-release'};
}
describe('comparison exports',()=>{
 it('retains fiscal-year columns and interleaves A/B for each metric',()=>{const m=comparisonTable(fixture());expect(m.grid[0]).toEqual(['項目','地域','2021年度','2022年度','2023年度']);expect(m.grid).toHaveLength(9);expect(m.grid[1]).toEqual(['受診者に占める割合（%）','地域A','19.1','19.3','19.3']);expect(m.grid[2][1]).toBe('地域B');expect(m.html).toContain('<table>');expect(m.tsv).toContain('test-release');});
 it('swaps records and provenance together',()=>{const f=fixture();f.regions.reverse();const m=comparisonTable(f);expect(m.grid[1][1]).toBe('地域B');expect(m.records[0].source_url).toBe('https://example.test/B');});
 it('exports both regions with role, numeric rate and source fields without mutation',()=>{const f=fixture(),before=JSON.stringify(f),out=comparisonCsv(f);expect(out.charCodeAt(0)).toBe(0xfeff);for(const s of ['region_role','region_id','category_id','actual_year','release_id','numerator','denominator','source_cell','https://example.test/A','https://example.test/B'])expect(out).toContain(s);expect(out.split('\r\n')).toHaveLength(7);expect(JSON.stringify(f)).toBe(before);});
 it('honors year and unit, preserves zero and missing',()=>{const f=fixture();f.year=2022;expect(comparisonTable(f).years).toEqual([2021,2022]);expect(comparisonTable({...f,measure:'count'}).grid[1][0]).toBe('報告人数（人）');f.data.records[0].value=0;f.data.records[1].value=null;f.data.records[1].value_state='blank';const m=comparisonTable(f);expect(m.grid[1][2]).toBe('0.0');expect(m.grid[1][3]).toContain('欠損');});
 it('caps at five existing years',()=>{const f=fixture();f.data.records=Array.from({length:8},(_,i)=>({...f.data.records[0],observation_fiscal_year:2016+i}));expect(comparisonTable(f).years).toEqual([2019,2020,2021,2022,2023]);});
 it('positions image panels by the selected layout',()=>{const sizes=[{width:960,height:510},{width:960,height:510}];const side=comparisonFrames(sizes,'side'),stack=comparisonFrames(sizes,'stack');expect(side.positions[1].x).toBeGreaterThan(side.positions[0].x+960);expect(side.positions[1].y).toBe(side.positions[0].y);expect(stack.positions[1].x).toBe(stack.positions[0].x);expect(stack.positions[1].y).toBeGreaterThan(stack.positions[0].y+510);});
 it('shows combined controls only for two regions',()=>{const f=fixture(),c={...f,indicator:f.data.indicators[0],notify:()=>{},source:()=>{}} as unknown as Context;expect(renderToStaticMarkup(<ComparisonActions c={{...c,regions:['A']}} kind="table" layout="side"/>)).toBe('');expect(renderToStaticMarkup(<ComparisonActions c={c} kind="table" layout="side"/>)).toContain('比較CSV');});
 it('offers image-only comparison controls for pictograms',()=>{const f=fixture(),c={...f,indicator:f.data.indicators[0]} as unknown as Context;const html=renderToStaticMarkup(<ComparisonActions c={c} kind="pictogram" layout="stack"/>);expect(html).toContain('100人図の比較全体出力');expect(html).toContain('比較画像をコピー');expect(html).not.toContain('比較CSV');expect(renderToStaticMarkup(<ComparisonActions c={{...c,regions:['A']}} kind="pictogram" layout="side"/>)).toBe('');});
 it('escapes spreadsheet formulas and HTML',()=>{expect(safeExportCell('=1+2')).toBe("'=1+2");const f=fixture();f.data.geographies[0].name='<script>';expect(comparisonTable(f).html).toContain('&lt;script&gt;');});
});
