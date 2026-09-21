import {describe,it,expect} from 'vitest';
import {allocateHundred,visualGroup,groupVisuals,indicatorVisual,categorySeries,dataBarMaximum} from './visual-metadata';
import type {IndicatorGroup} from './model';
describe('approximate composition visual metadata',()=>{
 it('allocates exactly 100 in deterministic contiguous category order',()=>{
  const counts=allocateHundred([17.7,10.2,71.8,.3])!;
  expect(counts).toEqual([18,10,72,0]);
  const symbols=counts.flatMap((n,i)=>Array(n).fill(i));
  expect(symbols).toHaveLength(100);expect(new Set(symbols.map((_,i)=>Math.floor(i/10))).size).toBe(10);
  expect(symbols.every((v,i)=>i===0||v>=symbols[i-1])).toBe(true);
 });
 it('keeps real zero, rejects missing, invalid, and non-100 compositions',()=>{
  expect(allocateHundred([0,20,80,0])).toEqual([0,20,80,0]);
  for(const values of [[null,20,80,0],[NaN,20,80,0],[-1,21,80,0],[19,10,70,.5],[]])expect(allocateHundred(values)).toBeNull();
 });
 it('uses unrounded audited percentages without mutating them',()=>{
  const rates=[2594,1493,10520,53].map(n=>n/14660*100),before=[...rates];
  const result=allocateHundred(rates)!;expect(result.reduce((a,b)=>a+b,0)).toBe(100);expect(rates).toEqual(before);
  expect(result).toEqual([18,10,72,0]);
 });
 it('handles ties predictably and preserves 100 symbols across different populations',()=>{
  expect(allocateHundred([25.5,25.5,24.5,24.5])).toEqual([26,26,24,24]);
  for(let n=1;n<=200;n++){const counts=[n,2*n,3*n,1],total=6*n+1;expect(allocateHundred(counts.map(v=>v/total*100))!.reduce((a,b)=>a+b,0)).toBe(100);}
 });
 it('decorates only configured groups without altering the validated metadata',()=>{
  const group={group_id:'metabo',categories:['case','preliminary','noncase','indeterminate'].map((category_id,order)=>({category_id,order,color:'old',label:category_id}))} as IndicatorGroup;
  const before=JSON.stringify(group),decorated=visualGroup(group);
  expect(JSON.stringify(group)).toBe(before);expect(decorated.categories.map(c=>c.color)).toEqual(Object.values(groupVisuals.metabo).map(v=>v.color));
  expect(decorated.categories.map(c=>c.category_id)).toEqual(group.categories.map(c=>c.category_id));
  const other={...group,group_id:'unconfigured'};expect(visualGroup(other)).toBe(other);
 });
});

describe('shared single-category visual language',()=>{
 const group={group_id:'metabo',categories:['case','preliminary','noncase','indeterminate'].map((category_id,order)=>({category_id,indicator_id:'metabo_'+category_id,order,color:'original'}))} as IndicatorGroup;
 for(const id of ['case','preliminary','noncase','indeterminate'])it(`resolves ${id} consistently for map, table, icon and graph`,()=>{
  const result=indicatorVisual([group],'metabo_'+id)!;
  expect(result.visual).toBe(groupVisuals.metabo[id]);
  expect(result.visual.color).toBe(visualGroup(group).categories.find(c=>c.category_id===id)!.color);
  expect(result.visual.palette).toHaveLength(5);expect(result.visual.pose).toBeTruthy();
  const series=categorySeries(result.visual);
  expect(series[0].color).not.toBe(series[1].color);expect(series[0].dash).toBeUndefined();expect(series[1].dash).toBe('8 5');
 });
 it('does not change the source metadata or apply a style to unconfigured indicators',()=>{
  const before=JSON.stringify(group);indicatorVisual([group],'metabo_case');expect(JSON.stringify(group)).toBe(before);
  expect(indicatorVisual([group],'guidance_active')).toBeUndefined();expect(indicatorVisual(undefined,'metabo_case')).toBeUndefined();
 });
 it('uses a shared bar scale across regions and years and preserves missing/zero',()=>{
  expect(dataBarMaximum('rate',[19,23])).toBe(100);
  expect(dataBarMaximum('count',[12,500,null,0])).toBe(500);
  expect(dataBarMaximum('count',[0,null])).toBe(1);
 });
});

describe('guidance visual metadata',()=>{
 const ids=['active','motivational','none','indeterminate'];
 const group={group_id:'guidance',categories:ids.map((category_id,order)=>({category_id,indicator_id:'guidance_'+category_id,order,label:category_id,color:'original'}))} as IndicatorGroup;
 it('shares four distinct category colors and semantic SVG poses across single and all views',()=>{
  const decorated=visualGroup(group);
  expect(decorated.categories.map(c=>c.color)).toEqual(['#df806b','#d9a052','#54b5b1','#969da6']);
  expect(ids.map(id=>groupVisuals.guidance[id].pose)).toEqual(['support','step','open','neutral']);
  for(const c of decorated.categories){const v=indicatorVisual([group],c.indicator_id)!.visual;expect(v.color).toBe(c.color);expect(new Set(v.palette).size).toBe(5);expect(categorySeries(v)[1].dash).toBe('8 5');}
  expect(group.categories.every(c=>c.color==='original')).toBe(true);
 });
});
