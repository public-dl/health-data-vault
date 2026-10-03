import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {it,expect} from 'vitest';
import {metaboMapScales} from './metabo-map-scales';
import {mapFill,mapRangeLabel} from './map-scale';
import {MapLegend} from './map-legend';
import {groupVisuals} from './visual-metadata';
import {displayData,type Payload} from './model';
import {categoryContext} from './group-views';
import {MapPanel,type Context} from './panels';
const pointer=JSON.parse(readFileSync('public/public-data/current.json','utf8'));
const release=JSON.parse(readFileSync('public/public-data/releases/'+pointer.release_id+'.json','utf8'));
for(const [id,s] of Object.entries(metaboMapScales)){
 it(id+' interpolates all stops, ticks, clamps and distinguishes missing/zero',()=>{
  const p=groupVisuals.metabo[s.category_id].palette;
  const color=(v:number|null)=>mapFill(v,p,[5,10,20,40],s);
  p.forEach((v,i)=>expect(color(s.min+(s.max-s.min)*i/4)).toBe(v));
  for(const v of s.ticks){expect(color(v)).toMatch(/^#[0-9a-f]{6}$/);const a=color(v-.001)!,b=color(v+.001)!;for(const i of [1,3,5])expect(Math.abs(parseInt(a.slice(i,i+2),16)-parseInt(b.slice(i,i+2),16))).toBeLessThanOrEqual(1);}
  expect(color(s.min-1)).toBe(p[0]);expect(color(s.max+1)).toBe(p[4]);
  expect(mapRangeLabel(s.min-1,s)).toBe('表示範囲より低い');expect(mapRangeLabel(s.max+1,s)).toBe('表示範囲より高い');
  expect(mapRangeLabel(s.min,s)).toBe('');expect(mapRangeLabel(s.max,s)).toBe('');
  expect(color(null)).toBeNull();expect(color(NaN)).toBeNull();expect(color(0)).not.toBeNull();expect(mapRangeLabel(null,s)).toBe('');
  const html=renderToStaticMarkup(<MapLegend title="割合" breaks={[5,10,20,40]} palette={p} scale={s}/>);
  s.ticks.forEach(v=>expect(html).toContain(v+'%'));p.forEach(v=>expect(html).toContain(v));expect(html).not.toContain('未満');expect(html).toContain('欠損・数値なし');
 });
}
it('uses the same policy through single/group paths for all 528 actual values without mutating release',()=>{
 const before=JSON.stringify(release),data=displayData(release.analysis as Payload,'rate'),group=data.indicator_groups!.find(g=>g.group_id==='metabo')!;
 let n=0;
 for(const r of data.records.filter(r=>r.indicator_id.startsWith('metabo_'))){
  const single=data.indicators.find(i=>i.indicator_id===r.indicator_id)!;
  const category=group.categories.find(c=>c.indicator_id===r.indicator_id)!;
  const grouped=categoryContext({data,measure:'rate',year:r.observation_fiscal_year,regions:[r.geography_code]} as Context,group,category.category_id);
  const s=metaboMapScales[r.indicator_id],p=groupVisuals.metabo[category.category_id].palette;
  expect(single.map_scale).toBe(s);expect(grouped.indicator.map_scale).toBe(s);
  expect(single.map_breaks).toEqual([]);expect(grouped.indicator.map_breaks).toEqual([]);
  expect(mapFill(r.value,p,single.map_breaks,single.map_scale)).toBe(mapFill(r.value,grouped.palette!,grouped.indicator.map_breaks,grouped.indicator.map_scale));
  expect(mapRangeLabel(r.value,s)).toBe('');n++;
 }
 expect(n).toBe(528);expect(JSON.stringify(release)).toBe(before);
});

it('renders out-of-range labels separately from missing and real zero',()=>{
 const previous=globalThis.window;
 Object.assign(globalThis,{window:{matchMedia:()=>({matches:false})}});
 try {
  const data=displayData(release.analysis as Payload,'rate'),indicator=data.indicators.find(i=>i.indicator_id==='metabo_indeterminate')!;
  const rows=data.records.filter(r=>r.indicator_id===indicator.indicator_id&&r.observation_fiscal_year===2023&&r.geography_level==='municipality');
  rows[0].value=-1;rows[1].value=5;rows[2].value=null;rows[3].value=0;
  const c={data,indicator,measure:'rate',year:2023,regions:['15'],source:()=>{},notify:()=>{}} as unknown as Context;
  const html=renderToStaticMarkup(<MapPanel c={c} region="15" onSelect={()=>{}} showNotes={false}/>);
  expect(html).toContain('表示範囲より低い');expect(html).toContain('表示範囲より高い');expect(html).toContain('url(#');
  expect(html).toContain('0.0%');expect(html).toContain('欠損・数値なし');
 } finally {Object.assign(globalThis,{window:previous});}
});

it('has stable colors at the approved legend ticks',()=>{
 const expected:Record<string,string[]>={case:['#f4d4d9','#e4a0ac','#cd6c80','#9f425c'],preliminary:['#f8e7bd','#e6c47d','#c79845','#956523'],noncase:['#d7eadf','#a0ceb3','#64aa84','#357556'],indeterminate:['#dde3eb','#c2ccd9','#a2afc0','#7e8da3','#586b84']};
 for(const s of Object.values(metaboMapScales))expect(s.ticks.map(v=>mapFill(v,groupVisuals.metabo[s.category_id].palette,[],s))).toEqual(expected[s.category_id]);
});

it('changes only the noncase palette version, keeping the approved display domain contract',()=>{
 expect(metaboMapScales.metabo_noncase).toMatchObject({min:40,max:85,domain_version:'metabo-continuous-v1',interpolation_method:'piecewise-srgb',clamp_method:'endpoints-with-label',palette_version:'metabo-noncase-green-v1'});
 expect(groupVisuals.metabo.noncase).toEqual({pose:'wave',color:'#559f78',palette:['#d7eadf','#afd6bf','#82bf9c','#559f78','#357556']});
 for(const id of ['metabo_case','metabo_preliminary','metabo_indeterminate'])expect(metaboMapScales[id].palette_version).toBe('metabo-existing-five-stops-v1');
});
