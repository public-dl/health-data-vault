import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {it,expect} from 'vitest';
import {recipientMapScales,mapFill} from './map-scale';
import {MapLegend} from './map-legend';
import {indicatorColorAliases,presentationIndicator} from './visual-metadata';
import type {Indicator} from './model';

it('uses seven fixed ranges and continuous colors, independent of year or geography',()=>{
 expect(Object.values(recipientMapScales).map(s=>[s.min,s.max])).toEqual([[15,35],[15,45],[50,80],[20,42],[2,13],[30,65],[0,55]]);
 for(const [id,scale] of Object.entries(recipientMapScales)){
  const palette=indicatorColorAliases[id].palette;
  const color=(v:number|null)=>mapFill(v,palette,[20,25,30,35],scale);
  expect(color(scale.min)).toBe(palette[0]);expect(color(scale.max)).toBe(palette[4]);
  expect(color(0)).toBe(palette[0]);expect(color(100)).toBe(palette[4]);expect(color(null)).toBeNull();
  expect(new Set(Array.from({length:101},(_,i)=>color(scale.min+(scale.max-scale.min)*i/100))).size).toBeGreaterThan(90);
  expect(mapFill(scale.min+1,palette,[1,2,3,4],scale)).toBe(color(scale.min+1));
  const html=renderToStaticMarkup(<MapLegend title="割合" breaks={[20,25,30,35]} palette={palette} scale={scale}/>);
  expect(html).toContain('linear-gradient');expect(html).not.toContain('未満');expect(html).toContain(`${scale.max}%`);expect(html).toContain('欠損・数値なし');
 }
});
it('leaves overall-category metadata and coloring unchanged',()=>{
 const indicator={indicator_id:'metabo_case',name:'メタボ判定',map_breaks:[15,20,25,30]} as Indicator;
 expect(presentationIndicator(indicator).map_scale).toBeUndefined();
 const palette=['#111111','#333333','#555555','#777777','#999999'];
 expect([0,15,20,25,30].map(v=>mapFill(v,palette,indicator.map_breaks))).toEqual(palette);
});
