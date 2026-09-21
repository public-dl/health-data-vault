import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import type {Observation} from './model';
import {temporalTable,TemporalTable,temporalText} from './temporal-table';
// Verified prefectural metabo_case E6 counts / B6 recipients, R3–R5.
const records=[
 [2021,22401,117144,2022],[2022,22419,116311,2023],[2023,21934,113771,2024]
].map(([year,count,den,pub])=>({record_id:String(year),observation_fiscal_year:year,publication_fiscal_year:pub,value:count/den*100,unit:'%',value_state:'numeric',comparison_allowed:true,source_cell:'E6',derivation:{numerator_value:count,denominator_value:den}} as Observation));
describe('prefecture metabo_case temporal table regression',()=>{
 it('reserves 24% for labels and shares the remaining width equally across available years',()=>{
  for(const year of [2021,2022,2023]){
   const model=temporalTable(records,year,'rate');
   const html=renderToStaticMarkup(<TemporalTable model={model} year={year} caption="県計"/>);
   const columns=html.match(/<col style="width:([^"]+)"\/>/g)||[];
   expect(columns).toHaveLength(model.columns.length+1);
   expect(columns[0]).toContain('24%');
   expect(new Set(columns.slice(1)).size).toBe(1);
   for(const y of model.columns)expect(html).toContain(`${y}年度<small>公表 ${y+1}年度</small>`);
  }
 });
 it('builds metric rows and fiscal-year columns with all expected values',()=>{
  const model=temporalTable(records,2023,'rate');
  expect(model.columns).toEqual([2021,2022,2023]);
  expect(model.rows.map(r=>r.label)).toEqual(['受診者に占める割合（%）','報告人数／受診者数（人）','掲載年度','比較可否']);
  expect(model.rows.map(r=>r.cells.map(c=>c.text))).toEqual([
   ['19.1','19.3','19.3'],['22,401 / 117,144','22,419 / 116,311','21,934 / 113,771'],
   ['2022年度','2023年度','2024年度'],['比較可能','比較可能','比較可能']]);
 });
 it('renders four metric rows with one cell per year, rather than annual rows',()=>{
  const model=temporalTable(records,2023,'rate');
  const html=renderToStaticMarkup(<TemporalTable model={model} year={2023} caption="県計" bar={{color:'#ed979e',max:100}}/>);
  expect((html.match(/scope="col"/g)||[])).toHaveLength(4);
  expect((html.match(/scope="row"/g)||[])).toHaveLength(4);
  for(const row of model.rows){const block=html.split(`data-metric="${row.id}"`)[1].split('</tr>')[0];
   let previous=-1;for(const year of model.columns){const index=block.indexOf(`data-year="${year}"`);expect(index).toBeGreaterThan(previous);previous=index;}
   for(const cell of row.cells){
    const text=block.replace(/<[^>]*>/g,'').replaceAll('／',' / ');
    expect(text).toContain(cell.text);
   }
  }
  expect((html.match(/class="cell-data-bar"/g)||[])).toHaveLength(3);
  expect(html).toContain('>受診者に占める</span><span class="metric-heading-line">割合（%）</span>');
  expect(html).toContain('>報告人数</span><span class="metric-heading-line">／受診者数（人）</span>');
  expect(html).toContain('<th scope="row">掲載年度</th>');
  expect(html).toContain('<th scope="row">比較可否</th>');
  expect(temporalText(model)).toContain('項目\t2021年度\t2022年度\t2023年度');
 });
 it('limits to five existing years and separates missing from zero',()=>{
  const more=Array.from({length:8},(_,i)=>({...records[0],observation_fiscal_year:2016+i}));
  expect(temporalTable(more,2023,'rate').columns).toEqual([2019,2020,2021,2022,2023]);
  expect(temporalTable(records,2022,'rate').columns).toEqual([2021,2022]);
  const m=temporalTable([{...records[0],value:0},{...records[1],value:null,value_state:'blank'}],2023,'rate');
  expect(m.rows[0].cells.map(c=>c.text)).toEqual(['0.0','欠損（blank）']);
 });
});

it('uses the explicit two-line recipient heading for every independent-rate theme',()=>{
 for(const id of ['bp_guidance','triglycerides','hba1c']){
  const rows=records.map(r=>({...r,indicator_id:id,derivation:{...r.derivation!,statistic:'single_judgment_recipient_percentage'}}));
  const html=renderToStaticMarkup(<TemporalTable model={temporalTable(rows,2023,'rate')} year={2023} caption="test"/>);
  expect(html).toContain('>特定健診受診者数に</span><span class="metric-heading-line">占める割合（％）</span>');
  expect(html).not.toContain('>特定健診受診者に占める</span>');
 }
});
