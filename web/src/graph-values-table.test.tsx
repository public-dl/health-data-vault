import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {GraphValuesTable} from './graph-values-table';
import {GroupGraph} from './group-views';
import {MapNotes} from './map-notes';
import {overallMapNotice} from './presentation-copy';
import {displayData,format,formatValue,type Payload,type Observation} from './model';
import type {Context} from './panels';
import fixture from './test-fixtures/health-center-annual-facts.json';

afterEach(()=>vi.unstubAllGlobals());
it('uses the exact shared overall map notice',()=>{
 expect(renderToStaticMarkup(<MapNotes measure="rate"/>)).toContain(overallMapNotice);
});
it('shows percentages/counts/recipients without recalculation, preserving zero and missing',()=>{
 const records=[{indicator_id:'a',unit:'%',value:19.14,derivation:{value:19.14,numerator_value:22401,denominator_value:117144}},{indicator_id:'b',unit:'%',value:0,derivation:{value:0,numerator_value:0,denominator_value:117144}}] as Observation[];
 const before=JSON.stringify(records);
 const html=renderToStaticMarkup(<GraphValuesTable rows={[{code:'15',name:'新潟県',year:2021,records,recipients:117144}]} categories={['a','b','missing'].map(id=>({id,label:id}))} onSource={()=>{}}/>);
 for(const text of ['19.1%','22,401人','0.0%','0人','117,144人','未収録'])expect(html).toContain(text);
 expect(JSON.stringify(records)).toBe(before);
});
it('places one numeric table between the composition chart and collapsed notes',()=>{
 vi.stubGlobal('document',{createElement:()=>({getContext:()=>null})});
 const data=displayData(fixture.analysis as unknown as Payload,'rate');
 const group=data.indicator_groups!.find(g=>g.group_id==='metabo')!;
 const c={data,group,regions:['15','hc-15-sanjo'],year:2023,measure:'rate',indicator:data.indicators.find(i=>i.indicator_id===group.categories[0].indicator_id)!,release:'test',review:false,notify:()=>{},source:()=>{}} as Context;
 const before=JSON.stringify(data),html=renderToStaticMarkup(<GroupGraph c={c} group={group}/>);
 expect(html.match(/class="graph-values-table"/g)).toHaveLength(1);
 expect(html).not.toMatch(/全カテゴリーの値（常時表示）|全区分の値（凡例順）|composition-detail|<details[^>]*open/);
 expect(html.indexOf('</svg>')).toBeLessThan(html.indexOf('class="graph-values-table"'));
 expect(html.indexOf('class="graph-values-table"')).toBeLessThan(html.indexOf('data-export-notes'));
 for(const r of data.records.filter(r=>c.regions.includes(r.geography_code)&&group.categories.some(cat=>cat.indicator_id===r.indicator_id))){
  expect(html).toContain(formatValue(r.value,'%')+'%');
  expect(html).toContain(format(r.derivation!.numerator_value)+'人');
 }
 expect(JSON.stringify(data)).toBe(before);
});
