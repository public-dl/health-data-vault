import React from 'react';
import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import fixture from './test-fixtures/health-center-areas.json';
import {displayData,connect,type Payload} from './model';
import {composition} from './group-model';
import {RegionOptions,RegionSourceNote,regionMap} from './region-hierarchy';
import {reportedMapContext,reportedContext} from './reported-views';
import type {Context} from './panels';
const raw=fixture.analysis as unknown as Payload;

it('offers 13 health centers and 30 municipalities with parent-child hierarchy',()=>{
 expect(raw.geographies.filter(g=>g.level==='health_center_area')).toHaveLength(13);
 expect(raw.geographies.filter(g=>g.level==='municipality')).toHaveLength(30);
 expect(raw.geographies.find(g=>g.code==='15213')?.parent).toBe('hc-15-sanjo');
 expect(raw.geographies.find(g=>g.code==='15100')?.parent).toBe('hc-15-niigata-city');
 const html=renderToStaticMarkup(<select><RegionOptions geographies={raw.geographies} selected={['hc-15-sanjo','15213']} index={0}/></select>);
 expect(html).toContain('保健所管内');expect(html).toContain('三条保健所管内');expect(html).toContain('燕市');
 expect(regionMap(raw,'hc-15-sanjo')).toBe(raw.health_center_map);
 expect(regionMap(raw,'15213')).toBe(raw.map);
});

it('permits proven single-year overall composition without allowing temporal comparisons',()=>{
 for(const measure of ['count','rate'] as const){
  const data=displayData(raw,measure),group=data.indicator_groups![0];
  const part=composition(data,group,'hc-15-sanjo',2023);
  expect(part?.denominator).toBe(12084);expect(part?.rows).toHaveLength(group.categories.length);
  expect(part?.rows.every(r=>r.comparability_status==='pending'&&!r.comparison_allowed)).toBe(true);
  expect(connect(part?.rows[0],part?.rows[0])).toBe(false);
  expect(composition(data,group,'hc-15-niitsu',2023)).toBeNull();
  const bad=structuredClone(data);bad.records.find(r=>r.geography_code==='hc-15-sanjo')!.derived_rate!.value+=1;
  // Count view validates the rate formula too.
  if(measure==='count')expect(composition(bad,group,'hc-15-sanjo',2023)).toBeNull();
 }
});

it('explains municipal identity separately from official totals and keeps non-overall counts only',()=>{
 const data=displayData(fixture.reported as unknown as Payload,'count');
 const html=renderToStaticMarkup(<RegionSourceNote data={data} rows={data.records}/>);
 expect(html).toContain('独立した原表保健所計ではありません');expect(html).toContain('50行');
 expect(html).toContain('原表に掲載された保健所集計値');
 for(const indicator of data.indicators){
  const c=reportedContext({data,indicator,year:2023,regions:['hc-15-sanjo','15213'],measure:'count',release:'review',review:true,source:()=>{},notify:()=>{}} as Context,true);
  expect(reportedMapContext(c)).toBeNull();expect(indicator.capabilities?.count_only).toBe(true);
 }
 expect(data.records.every(r=>!r.derived_rate)).toBe(true);
});
