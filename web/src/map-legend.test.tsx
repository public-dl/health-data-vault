import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {MapLegend} from './map-legend';
import {presentationIndicator} from './visual-metadata';
import type {Indicator} from './model';

it('uses identical legend markup for theme-specific breaks and keeps missing separate from zero',()=>{
 for(const breaks of [[20,40,60,80],[20,25,30,35],[4,5,6,8]]){
  const html=renderToStaticMarkup(<MapLegend title="割合（%）" breaks={breaks} palette={['#eee','#ddd','#ccc','#bbb','#aaa']}/>);
  expect((html.match(/<li>/g)||[]).length).toBe(6);
  expect(html).toContain(`0〜${breaks[0]}未満`);
  expect(html).toContain(`${breaks[3]}以上`);
  expect(html).toContain('欠損・数値なし');
  expect(html).not.toContain('<svg');
 }
});
it('clarifies the source hierarchy without changing the indicator identity or input metadata',()=>{
 const source={indicator_id:'lipid_people',name:'脂質：実人員',unit:'人'} as Indicator;
 const view=presentationIndicator(source);
 expect(view.name).toBe('脂質代謝：実人員');
 expect(view.indicator_id).toBe(source.indicator_id);
 expect(source.name).toBe('脂質：実人員');
});
