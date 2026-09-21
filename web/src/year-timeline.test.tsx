import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {YearTimeline} from './year-timeline';
it('renders every local control from the same year and playback props',()=>{
 for(const year of [2021,2022,2023])for(const playing of [false,true]){
  const html=renderToStaticMarkup(<>{['基準該当','予備群','非該当','判定不能'].map(label=><YearTimeline key={label} label={label} years={[2021,2022,2023]} year={year} playing={playing} onYear={()=>{}} onToggle={()=>{}}/>)}</>);
  expect((html.match(new RegExp(`value="${year-2021}"`,'g'))??[])).toHaveLength(4);
  expect((html.match(new RegExp(`aria-valuetext="${year}年度"`,'g'))??[])).toHaveLength(4);
  expect((html.match(new RegExp(playing?'Ⅱ 停止':'▶ 年度を再生','g'))??[])).toHaveLength(4);
 }
});
it('keeps a single-category control accessible with actual fiscal-year text',()=>{
 const html=renderToStaticMarkup(<YearTimeline years={[2021,2023]} year={2023} playing={false} onYear={()=>{}} onToggle={()=>{}}/>);
 expect(html).toContain('地図の実績年度');expect(html).toContain('aria-valuetext="2023年度"');expect(html).toContain('max="1"');
});
