import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {renderToReadableStream} from 'react-dom/server';
import {displayData,type Payload} from './model';
import {ReportedViews,reportedContext,reportedMapContext} from './reported-views';
import {themeChoices,healthThemes} from './health-themes';
import {chartRecords,municipalityDistribution} from './reported-chart-model';
import {mapFill} from './map-scale';
import type {Context} from './panels';
import {HealthThemeMenu} from './health-theme-menu';
import {previousYearComment} from './temporal-comment';

afterEach(()=>vi.unstubAllGlobals());
async function renderReady(element:React.ReactElement){const stream=await renderToReadableStream(element);await stream.allReady;return (await new Response(stream).text()).replace(/<!--.*?-->/g,'');}
const ids=['renal_urinary_people','urine_protein','urine_blood','creatinine'];
function fixture(id:string,measure:'count'|'rate'='count'){
 const data={schema_version:'reported-annual-5',years:[2021,2022,2023],indicator_groups:[],
  geographies:[{code:'15',name:'県計',level:'prefecture_total'},...Array.from({length:30},(_,j)=>({code:String(j),name:'市町村'+j,level:'municipality'}))],
  map:{type:'FeatureCollection',metadata:{},features:[]},insights:[],denominator_records:[],records:[],
  indicators:ids.map(indicator_id=>({indicator_id,name:indicator_id,unit:'人',map_breaks:[],theme_id:'renal-urinary',
   visualization_type:indicator_id==='urine_protein'?'single_judgment_rate':'reported_count',
   capabilities:{temporal_rate:indicator_id==='urine_protein',recipient_rate:indicator_id==='urine_protein',composition:false,map_mode:indicator_id==='urine_protein'?'rate':'none',distribution:indicator_id==='urine_protein',annual_reference_lines:false,selected_indicator_charts:true},
   ...(indicator_id==='urine_protein'?{rate:{label:'特定健診受診者数に占める割合（％）',map_breaks:[]},map_scale:{mode:'continuous',min:0,max:8},chart_max:8}:{})}))} as unknown as Payload;
 for(const year of data.years)for(const geo of data.geographies){
  const d={record_id:geo.code+year,geography_code:geo.code,observation_fiscal_year:year,value:100,source_cell:'B6'} as any;
  data.denominator_records!.push(d);
  for(const key of ids)data.records.push({record_id:key+geo.code+year,indicator_id:key,geography_code:geo.code,geography_name:geo.name,geography_level:geo.level,
   observation_fiscal_year:year,publication_fiscal_year:year+1,value:0,value_state:'zero',unit:'人',source_cell:'AD6',annual_display_allowed:true,comparison_allowed:false,comparability_status:'pending',denominator_record_id:d.record_id,
   ...(key==='urine_protein'?{derived_rate:{value:0,value_state:'zero',unit:'%',numerator_value:0,denominator_value:100,denominator_record_id:d.record_id,statistic:'single_judgment_recipient_percentage',denominator_kind:'healthcheck_recipients',validation_status:'passed',comparability_status:'pending',comparison_allowed:false}}:{})} as any);
 }
 const displayed=displayData(data,measure);
 return reportedContext({data:displayed,indicator:displayed.indicators.find(i=>i.indicator_id===id)!,measure,year:2023,regions:['15','0'],release:'test',review:true,notify:()=>{},source:()=>{}} as Context,true);
}
it('only exposes four released indicators, with no composition set',()=>{
 const theme=healthThemes.find(t=>t.id==='renal-urinary')!;
 expect(themeChoices(theme,[],fixture(ids[0]).data.indicators).ids).toEqual(ids);
 expect(themeChoices(theme,[],[]).ids).toEqual([]);
});
it('enables renal navigation with concise text and keeps pending year differences absent',async()=>{
 const c=fixture('urine_protein','rate');
 const html=await renderReady(<HealthThemeMenu selected="renal-urinary" groups={[]} catalog={c.data.indicators} onSelect={()=>{}}/>);
 expect(html).toMatch(/<button[^>]*aria-pressed="true"[^>]*>/);
 expect(html).toContain('尿蛋白・尿潜血・クレアチニン');
 expect(html).not.toContain('腎・尿路系<em>準備中');
 for(const year of [2021,2022,2023])expect(previousYearComment(c.data.records.filter(r=>r.indicator_id==='urine_protein'&&r.geography_code==='15'),year)).toBe('');
});
it('count-only items have no rate rows, maps, distribution or composition exports',async()=>{
 vi.stubGlobal('window',{matchMedia:()=>({matches:false})});
 for(const id of [ids[0],ids[2],ids[3]]){
  const c=fixture(id);expect(reportedMapContext(c)).toBeNull();
  const html=await renderReady(<ReportedViews c={c} onYear={()=>{}} onSelect={()=>{}}/>);
  expect(html).toContain('data-export-surface="table-card"');expect(html).toContain('0人');
  expect(html).not.toContain('data-export-surface="map-card"');expect(html).not.toContain('data-chart=');
  expect(html).not.toContain('data-metric="rate"');expect(html).not.toContain('100人ピクトグラム');
  expect(html).toContain('割合の公開契約が未承認');expect(html).toContain('割合による地域分布は現在公開していません');
 }
});
it('AD uses percentage maps even with count selected, retains zero, excludes county, and does not connect years',async()=>{
 vi.stubGlobal('window',{matchMedia:()=>({matches:false})});
 for(const measure of ['count','rate'] as const){
  const c=fixture('urine_protein',measure),mapped=reportedMapContext(c)!;
  expect(mapped.measure).toBe('rate');expect(mapped.indicator.unit).toBe('%');
  expect(mapped.indicator.map_scale).toEqual({mode:'continuous',min:0,max:8});
  const html=await renderReady(<ReportedViews c={c} onYear={()=>{}} onSelect={()=>{}}/>);
  for(const kind of ['summary-card','map-card','table-card','graph-card'])expect(html).toContain('data-export-surface="'+kind+'"');
  expect(html).toContain('補助バー：0〜100%の共通尺度');expect(html).toContain('data-metric="rate"');expect(html).toContain('data-chart="distribution"');
  expect(html).not.toContain('data-annual-reference-link');expect(html).not.toContain('構成合計100%');
  for(const year of c.data.years)expect(municipalityDistribution(chartRecords(c.data.records,'urine_protein'),year).count).toBe(30);
  expect(mapFill(0,c.indicator.palette!,[],c.indicator.map_scale)).not.toBeNull();
  expect(mapFill(null,c.indicator.palette!,[],c.indicator.map_scale)).toBeNull();
 }
});
