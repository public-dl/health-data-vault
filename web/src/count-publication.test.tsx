import React from 'react';
import releaseText from '../public/public-data/releases/819d9ba9988bd53408a032f6092a94782e96054e3e9c71ed7853ad8868f67553.json?raw';
import {it,expect,vi,afterEach} from 'vitest';
import {renderToReadableStream} from 'react-dom/server';
import {displayData,csv,tableText,type Payload} from './model';
import {ReportedViews,reportedContext,reportedMapContext} from './reported-views';
import {comparisonCsv,comparisonTable} from './comparison-export-model';
import {temporalTable} from './temporal-table';
import {healthThemes,themeChoices} from './health-themes';
import {visualizationLink} from './source-links';
import type {Context} from './panels';

const pointer={release_id:'819d9ba9988bd53408a032f6092a94782e96054e3e9c71ed7853ad8868f67553'};
const release=JSON.parse(releaseText);
const raw=release.reported as Payload;
const displayed=displayData(raw,'count');
const context=(id:string,review=false)=>reportedContext({data:displayed,indicator:displayed.indicators.find(i=>i.indicator_id===id)!,measure:'count',year:2023,regions:['15','15100'],release:pointer.release_id,review,source:()=>{},notify:()=>{}} as Context,true);
async function html(element:React.ReactElement){const s=await renderToReadableStream(element);await s.allReady;return (await new Response(s).text()).replace(/<!--.*?-->/g,'');}
afterEach(()=>vi.unstubAllGlobals());

it('publishes 1581 original counts, zero and pending, with no public rates or map fallback',()=>{
 expect(raw.schema_version).toBe('reported-annual-6');expect(raw.records).toHaveLength(1581);
 for(const r of raw.records){expect(r).not.toHaveProperty('derived_rate');expect(r.comparability_status).toBe('pending');expect(r.comparison_allowed).toBe(false);if(r.value===0)expect(r.value_state).toBe('zero');}
 for(const i of displayed.indicators){expect(i.rate).toBeUndefined();expect(i.map_scale).toBeUndefined();expect(reportedMapContext(context(i.indicator_id))).toBeNull();}
 expect(release.analysis.records.every((r:any)=>r.derived_rate)).toBe(true);
 expect(release.annual.records.every((r:any)=>r.derived_rate)).toBe(true);
});

it('rejects forbidden fields even null rather than ignoring them',()=>{
 for(const key of ['derived_rate','derivation','rate','percentage','recipient_percentage']){
  const bad=structuredClone(raw);Object.assign(bad.records[0],{[key]:null});
  expect(()=>displayData(bad,'count')).toThrow('人数公開契約');
 }
});

it('all 17 indicators render count surfaces only in public and review, with separate reference rows',async()=>{
 vi.stubGlobal('window',{matchMedia:()=>({matches:false})});
 for(const review of [false,true])for(const i of displayed.indicators){
  const c=context(i.indicator_id,review),text=await html(<ReportedViews c={c} onYear={()=>{}} onSelect={()=>{}}/>);
  expect(text).toContain('data-export-surface="summary-card"');expect(text).toContain('data-export-surface="table-card"');
  expect(text).not.toMatch(/data-export-surface="(?:map|graph|pictogram)-card"|data-chart=|data-metric="rate"|ポイント|%<|％<|100人ピクトグラム/);
  expect(text).toContain('地図表示は停止');expect(text).toContain('グラフ・地域分布は表示していません');
  const rows=c.data.records.filter(r=>r.indicator_id===i.indicator_id&&r.geography_code==='15');
  const model=temporalTable(rows,2023,'count');expect(model.columns).toEqual([2021,2022,2023]);
  expect(model.rows.map(r=>r.id)).toEqual(['value','reference','publication','comparison']);
 }
});

it('individual and comparison CSV/text omit rate formula and differences for every indicator',()=>{
 for(const i of displayed.indicators){
  const c=context(i.indicator_id),rows=c.data.records.filter(r=>r.indicator_id===i.indicator_id);
  const input={data:c.data,regions:c.regions,indicatorId:i.indicator_id,year:2023,measure:'count' as const,release:c.release,annualValues:true};
  for(const text of [csv(rows,i.name),tableText(rows,i.name),comparisonCsv(input),comparisonTable(input).tsv])expect(text).not.toMatch(/recipient_percentage|rate_origin|rate_comparability|same_year_difference|formula|計算式|ポイント|\d[%％]/);
  expect(comparisonCsv(input).split('\n')[0]).not.toMatch(/rate|percentage/);
 }
});

it('count sets and source cell links preserve all themes and route to the table',async()=>{
 vi.stubGlobal('window',{matchMedia:()=>({matches:false})});
 for(const theme of healthThemes.filter(t=>t.indicatorIds.length)){
  const choices=themeChoices(theme,[],displayed.indicators);expect(choices.indicators).toHaveLength(theme.indicatorIds.length);
  for(const set of choices.sets){
   const c=context(set.members[0]);const text=await html(<ReportedViews c={c} members={set.members} onYear={()=>{}} onSelect={()=>{}}/>);
   expect(text).not.toContain('特定健診受診者に占める割合（%）');expect(text).toContain('報告人数（人）');
  }
 }
 for(const table of release.published_tables)for(const row of table.rows)for(const cell of row.cells){
  if(raw.indicators.some(i=>i.indicator_id===cell.visualization?.indicator_id))expect(visualizationLink(table,cell,false)).toMatch(/#table$/);
 }
});
