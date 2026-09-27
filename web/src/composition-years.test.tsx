import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import releaseText from '../public/public-data/releases/ad50d1980ded8094a30f9da67df32e63cc85bf9ba7a24547e6de6e123848a753.json?raw';
import {displayData,connect,type Payload} from './model';
import {composition,compositionTrendAllowed} from './group-model';
import {GroupGraph} from './group-views';
import {GraphPanel,type Context} from './panels';

const raw=JSON.parse(releaseText).analysis as Payload;
const data=displayData(raw,'rate'),group=data.indicator_groups!.find(g=>g.group_id==='metabo')!;
function chart(regions:string[]) {
 vi.stubGlobal('document',{createElement:()=>({getContext:()=>null})});
 const c={data,group,regions,year:2023,measure:'rate',indicator:data.indicators.find(i=>i.indicator_id===group.categories[0].indicator_id)!,release:'test',review:false,notify:()=>{},source:()=>{}} as Context;
 return renderToStaticMarkup(<GroupGraph c={c} group={group}/>);
}
afterEach(()=>vi.unstubAllGlobals());

it.each([
 ['15','hc-15-uonuma'],['hc-15-sanjo','15213'],['15','15100'],['hc-15-sanjo','hc-15-uonuma'],
])('renders six audited annual bars for %s / %s', (a,b)=>{
 const before=JSON.stringify(data),html=chart([a,b]);
 expect(html.match(/data-category="/g)).toHaveLength(24);
 for(const year of [2021,2022,2023])for(const code of [a,b]){
  expect(html).toContain(`data-region="${code}" data-year="${year}"`);
  const part=composition(data,group,code,year)!;
  expect(part).not.toBeNull();
  expect(part.rows.reduce((n,r)=>n+r.derivation!.numerator_value,0)).toBe(part.denominator);
 }
 expect(JSON.stringify(data)).toBe(before);
 if(a.startsWith('hc-')||b.startsWith('hc-')){
  expect(html).toContain('年度間の増減比較は行っていません');
  expect(html).not.toContain('>区分の推移</button>');
 }
});

it('retains Niitsu missing values and never draws invented 100% bars',()=>{
 const html=chart(['15','hc-15-niitsu']);
 expect(html.match(/data-category="/g)).toHaveLength(12); // Only three prefecture bars.
 expect(html.match(/>構成表示不可<\/text>/g)).toHaveLength(3);
 expect(html).toContain('構成表示不可（区分の空欄など）');
 for(const year of [2021,2022,2023]){
  expect(composition(data,group,'hc-15-niitsu',year)).toBeNull();
  expect(raw.records.some(r=>r.geography_code==='hc-15-niitsu'&&r.observation_fiscal_year===year&&r.value===null)).toBe(true);
 }
});

it('does not grant temporal permission while displaying annual actual values',()=>{
 expect(compositionTrendAllowed(data,group,['15','hc-15-uonuma'])).toBe(false);
 const rows=data.records.filter(r=>r.geography_code==='hc-15-uonuma');
 expect(rows.every(r=>r.comparability_status==='pending'&&!r.comparison_allowed)).toBe(true);
 for(const id of group.categories.map(c=>c.indicator_id)){
  const rs=rows.filter(r=>r.indicator_id===id);
  expect(connect(rs[0],rs[1])).toBe(false);
 }
 const pendingMunicipality={...data,records:data.records.map(r=>r.geography_code==='15100'?{...r,comparability_status:'pending',comparison_allowed:false}:r)};
 expect(compositionTrendAllowed(pendingMunicipality,group,['15','15100'])).toBe(false);
});

it('aligns individual health-center points with annual ticks and excludes out-of-axis records',()=>{
 vi.stubGlobal('document',{createElement:()=>({getContext:()=>null})});
 const c={data,regions:['15','hc-15-uonuma'],year:2023,measure:'rate',indicator:data.indicators.find(i=>i.indicator_id===group.categories[0].indicator_id)!,release:'test',review:false,notify:()=>{},source:()=>{}} as Context;
 const html=renderToStaticMarkup(<GraphPanel c={c}/>);
 for(const year of [2021,2022,2023])expect(html.match(new RegExp(`data-year="${year}"`,'g'))).toHaveLength(2);
 expect(html).toContain('選択地域の年度別実績');
 const limited=renderToStaticMarkup(<GraphPanel c={{...c,data:{...data,years:[2023]}}}/>);
 expect(limited).not.toContain('data-year="2021"');
 expect(limited).not.toContain('data-year="2022"');
 expect(limited.match(/data-year="2023"/g)).toHaveLength(2);
});
