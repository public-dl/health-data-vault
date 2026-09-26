import {it,expect,vi,afterEach} from 'vitest';
import React from 'react';
import {renderToStaticMarkup,renderToReadableStream} from 'react-dom/server';
async function renderReady(node:React.ReactNode){const stream=await renderToReadableStream(node);await stream.allReady;return new Response(stream).text();}
import {glucoseDisplayOrder,healthThemes,themeChoices,resolveThemeSelection} from './health-themes';
import {displayData,csv,type Payload} from './model';
import {ReportedViews,reportedContext} from './reported-views';
import {temporalTable} from './temporal-table';
import {chartRecords,municipalityDistribution} from './reported-chart-model';
import {comparisonCsv} from './comparison-export-model';
import type {Context} from './panels';
const test=it;
const official=['urine_glucose','fasting_glucose','hba1c'];
function fixture(measure:'rate'|'count'='rate',unified=false){
 const official=unified?['glucose_people','urine_glucose','fasting_glucose','hba1c']:['urine_glucose','fasting_glucose','hba1c'];
 const names=['糖代謝：実人員','尿糖','空腹時血糖','随時血糖','HbA1c'];
 const counts=[78101,7673,17839,6806,73580];
 const domains:Record<string,number[]>={glucose_people:[40,90],urine_glucose:[0,25],fasting_glucose:[0,40],hba1c:[30,90]};
 const raw={schema_version:unified?'reported-annual-5':'reported-annual-4',years:[2021,2022,2023],population_scope:'test',indicator_groups:[],
  geographies:[{code:'15',name:'新潟県（県計）',level:'prefecture_total'},...Array.from({length:30},(_,j)=>({code:String(15202+j),name:j===0?'長岡市':'試験地域'+j,level:'municipality'}))],
  map:{type:'FeatureCollection',metadata:{},features:[]},insights:[],
  indicators:glucoseDisplayOrder.map((id,j)=>({indicator_id:id,name:names[j],theme_id:'glucose',theme_label:'糖代謝',display_set_label:'糖代謝：全項目',
   visualization_type:official.includes(id)?'single_judgment_rate':'reported_count',overview_label:'全項目をひと目で見る',unit:'人',map_breaks:[100,500,2000,10000],
   capabilities:{recipient_rate:official.includes(id),composition:false},...(official.includes(id)?{rate:{label:'特定健診受診者に占める割合（%）',map_breaks:[]},map_scale:{mode:'continuous',min:domains[id][0],max:domains[id][1]},chart_max:domains[id][1]}:{})})),
  denominator_records:[],records:[]} as unknown as Payload;
 for(const year of raw.years)for(const geo of raw.geographies){
  const denominator={record_id:geo.code+year,geography_code:geo.code,observation_fiscal_year:year,value:113771,source_cell:'B6'} as any;
  raw.denominator_records!.push(denominator);
  for(const [j,id] of glucoseDisplayOrder.entries()){
   const value=counts[j],rate=value/113771*100;
   raw.records.push({record_id:id+geo.code+year,indicator_id:id,geography_code:geo.code,geography_level:geo.level,geography_name:geo.name,
    observation_fiscal_year:year,publication_fiscal_year:year+1,value,unit:'人',population_scope:'test',value_state:'numeric',
    annual_display_allowed:true,comparison_allowed:false,comparability_status:'pending',denominator_record_id:denominator.record_id,
    ...(official.includes(id)?{regional_difference_allowed:true,derived_rate:{value:rate,unit:'%',numerator_value:value,denominator_value:113771,denominator_record_id:denominator.record_id,
     statistic:'single_judgment_recipient_percentage',denominator_kind:'healthcheck_recipients',validation_status:'passed',comparability_status:'pending',comparison_allowed:false,
     regional_difference_allowed:true,definition_version:'glucose-recipient-rate-v1',rate_origin:'official-formula-confirmed'}}:{})} as any);
  }
 }
 const data=displayData(raw,measure);
 return reportedContext({data,indicator:data.indicators.find(i=>i.indicator_id==='glucose_people')!,measure,year:2023,regions:['15','15202'],release:'test',review:true,notify:()=>{},source:()=>{}} as Context,true);
}
afterEach(()=>vi.unstubAllGlobals());
test('uses existing IDs and exposes a non-composition all-items set',async()=>{
 const c=fixture(),theme=healthThemes.find(t=>t.id==='glucose')!;
 expect(themeChoices(theme,[],c.data.indicators).ids).toEqual(['set:glucose',...glucoseDisplayOrder]);
 for(const id of glucoseDisplayOrder)expect(resolveThemeSelection(null,id,'fallback',[],c.data.indicators)).toEqual({themeId:'glucose',indicatorId:id});
 expect(c.data.indicator_groups).toEqual([]);
});
test('never derives unapproved rates in either display mode, CSV or comparison CSV',async()=>{
 for(const measure of ['count','rate'] as const){
  const c=fixture(measure);
  for(const id of ['glucose_people','random_glucose']){
   const rows=c.data.records.filter(r=>r.indicator_id===id);
   expect(rows).toHaveLength(93);
   expect(rows.every(r=>r.value!==null&&r.unit==='人'&&!r.derived_rate&&!r.derivation&&r.denominator!.value!>0)).toBe(true);
   expect(temporalTable(rows.filter(r=>r.geography_code==='15'),2023,'count').rows.some(r=>r.id==='rate')).toBe(false);
   expect(chartRecords(rows,id).every(r=>r.value===null)).toBe(true);
   const text=csv(rows,id);expect(text).not.toContain('official-formula-confirmed');expect(text).toContain('113771');
  }
  const output=comparisonCsv({...c,reportedMembers:glucoseDisplayOrder,indicatorId:c.indicator.indicator_id});
  expect(output).toContain('78101');expect(output).toContain('6806');expect(output).not.toMatch(/residual|composition_total/);
 }
});
test('rejects an injected count-only ratio instead of presenting it',async()=>{
 const c=fixture('count'),row=c.data.records.find(r=>r.indicator_id==='glucose_people')!;
 row.derived_rate=c.data.records.find(r=>r.indicator_id==='hba1c')!.derived_rate;
 expect(()=>reportedContext(c,true)).toThrow('未承認');
});
test('shares all four sections with mixed units and exactly three percentage graph series',async()=>{
 vi.stubGlobal('window',{matchMedia:()=>({matches:false})});
 const c=fixture();const html=await renderReady(<ReportedViews c={c} members={glucoseDisplayOrder} onSelect={()=>{}} onYear={()=>{}}/>);
 expect(html).toContain('糖代謝：全項目');expect(html).toContain('78,101人');expect(html).toContain('6,806人');
 expect(html).toContain('category-year-table');expect(html).toContain('割合未承認項目は人数のみ');
 expect(html.match(/data-chart="annual"/g)).toHaveLength(3);
 expect(html).toContain('糖代謝3項目の独立した棒グラフ');
 expect(html).not.toMatch(/hundred-svg|composition-total|構成合計100%|糖代謝：全区分/);
 expect(html).toContain('data-distribution-reference="selected"');expect(html).toContain('var(--distribution-selected)');
 expect(html).toContain('data-export-surface="map-card"');
});
test('keeps fixed domains and unique 30-municipality distribution across all years',async()=>{
 const c=fixture();
 for(const id of official){
  const indicator=c.data.indicators.find(i=>i.indicator_id===id)!;
  for(const year of [2021,2022,2023]){
   const dist=municipalityDistribution(chartRecords(c.data.records,id),year);
   expect(dist.count).toBe(30);expect(dist.total).toBe(30);
   expect(dist.rows.some(r=>r.geography_level!=='municipality')).toBe(false);
   expect(dist.values[0]).toBeGreaterThanOrEqual(indicator.map_scale!.min);
   expect(dist.values[4]).toBeLessThanOrEqual(indicator.map_scale!.max);
  }
 }
});

it('uses the common contract for four approved glucose ratios but never random glucose',async()=>{
 vi.stubGlobal('window',{matchMedia:()=>({matches:false})});
 const c=fixture('rate',true), rows=c.data.records.filter(r=>r.indicator_id==='glucose_people');
 expect(rows).toHaveLength(93);expect(rows.every(r=>r.unit==='%'&&r.value===78101/113771*100)).toBe(true);
 expect(c.data.records.filter(r=>r.indicator_id==='random_glucose').every(r=>r.unit==='人'&&!r.derivation)).toBe(true);
 const html=await renderReady(<ReportedViews c={c} members={glucoseDisplayOrder} onSelect={()=>{}} onYear={()=>{}}/>);
 expect(html.match(/data-chart="annual"/g)).toHaveLength(4);
 expect(html).toContain('糖代謝4項目の独立した棒グラフ');expect(html).toContain('68.6%');
 expect(html).not.toMatch(/hundred-svg|composition-total|構成合計100%/);
 for(const y of [2021,2022,2023])expect(municipalityDistribution(chartRecords(rows,'glucose_people'),y).count).toBe(30);
 expect(csv(rows,'test')).toContain('113771');
});

it('propagates centralized public labels through shared views, export surfaces and CSV',async()=>{
 vi.stubGlobal('window',{matchMedia:()=>({matches:false})});
 for(const wording of ['公開名称テスト','一括修正テスト']){
  const c=fixture('count',true);
  c.data.indicators=c.data.indicators.map(i=>({...i,source_label:i.name,public_label:wording+i.indicator_id,name:wording+i.indicator_id,short_label:'短縮'+i.indicator_id,semantic_key:'reported_guidance_or_higher',terminology_version:'test-v1'}));
  c.data=displayData(c.data,'count');c.indicator=c.data.indicators[0];
  const html=await renderReady(<ReportedViews c={c} members={glucoseDisplayOrder} onSelect={()=>{}} onYear={()=>{}}/>);
  for(const id of glucoseDisplayOrder){expect(html).toContain(wording+id);expect(csv(c.data.records.filter(r=>r.indicator_id===id),wording+id)).toContain(wording+id);}
  for(const kind of ['summary-card','map-card','table-card','graph-card'])expect(html).toContain('data-export-surface="'+kind+'"');
  const text=csv(c.data.records,'test');expect(text).toContain('source_label,public_label,semantic_key,terminology_version');expect(text).toContain('reported_guidance_or_higher');expect(text).toContain('test-v1');
 }
});
