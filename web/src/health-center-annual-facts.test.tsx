import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import fixture from './test-fixtures/health-center-annual-facts.json';
import {displayData,connect,type Payload} from './model';
import {GraphPanel,type Context} from './panels';
import {GroupGraph} from './group-views';
import {previousYearComment} from './temporal-comment';

afterEach(()=>vi.unstubAllGlobals());
it.each([
 ['metabo','15','hc-15-uonuma'],['metabo','hc-15-sanjo','15213'],
 ['metabo','hc-15-niitsu','hc-15-tokamachi'],['guidance','15','hc-15-niitsu'],
 ['guidance','hc-15-tokamachi','hc-15-sanjo'],
])('connects only annual facts: %s %s / %s',(id,a,b)=>{
 vi.stubGlobal('document',{createElement:()=>({getContext:()=>null})});
 const data=displayData(fixture.analysis as unknown as Payload,'rate');
 const group=data.indicator_groups!.find(g=>g.group_id===id)!;
 const indicator=data.indicators.find(i=>i.indicator_id===group.categories[0].indicator_id)!;
 const c={data,group,regions:[a,b],year:2023,measure:'rate',indicator,release:'test',review:false,notify:()=>{},source:()=>{}} as Context;
 const html=renderToStaticMarkup(<GraphPanel c={c}/>);
 expect(html.match(/data-temporal-connection="true"/g)).toHaveLength(4);
 for(const year of [2021,2022,2023])expect(html.match(new RegExp(`data-year="${year}"`,'g'))).toHaveLength(2);
 expect(html).toContain('stroke-dasharray=');
 expect(html).toContain('各年度の公表実績を線で接続');
 const bars=renderToStaticMarkup(<GroupGraph c={c} group={group}/>);
 for(const year of [2021,2022,2023])for(const region of [a,b])expect(bars).toContain(`data-region="${region}" data-year="${year}"`);
 expect(bars).toContain('>区分の推移</button>');
 const rows=data.records.filter(r=>r.geography_code.startsWith('hc-')&&r.indicator_id===indicator.indicator_id);
 for(const region of [a,b].filter(r=>r.startsWith('hc-'))){
  const local=rows.filter(r=>r.geography_code===region).sort((a,b)=>a.observation_fiscal_year-b.observation_fiscal_year);
  expect(connect(local[0],local[1])).toBe(true);
  expect(previousYearComment(local,2023)).toBe('');
 }
});

it('retains pending doctor points without connecting lines',()=>{
 const data=displayData(fixture.annual as unknown as Payload,'rate');
 for(const indicator of data.indicators){
  const rows=data.records.filter(r=>r.geography_code==='hc-15-niitsu'&&r.indicator_id===indicator.indicator_id).sort((a,b)=>a.observation_fiscal_year-b.observation_fiscal_year);
  expect(rows).toHaveLength(3);
  expect(rows.every(r=>r.comparability_status==='pending'&&!r.comparison_allowed)).toBe(true);
  expect(connect(rows[0],rows[1])).toBe(false);
 }
});
