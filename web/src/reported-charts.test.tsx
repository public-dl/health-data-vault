import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {chartRecords,municipalityDistribution,chartCsv,chartMax} from './reported-chart-model';
import {ReportedCharts,DistributionChart} from './reported-charts';
import {presentationIndicator} from './visual-metadata';
import {connect,type Observation,type Indicator} from './model';
import type {Context} from './panels';

const row=(code:string,year:number,value:number,level='municipality',id='hdl')=>({record_id:`${id}:${code}:${year}`,indicator_id:id,geography_code:code,geography_name:code,geography_level:level,observation_fiscal_year:year,value,unit:'人',annual_display_allowed:true,comparison_allowed:false,comparability_status:'pending',derived_rate:{value,numerator_value:value,denominator_value:100,validation_status:'passed',value_state:'numeric',comparability_status:'pending'}} as Observation);
it('computes linear quantiles only from unique municipality rows of the selected year',()=>{
 const rows=[...Array.from({length:30},(_,i)=>row(String(i),2023,i)),row('15',2023,90,'prefecture_total'),row('citytotal',2023,80,'city_total'),row('0',2022,99)];
 const stats=municipalityDistribution(rows,2023);
 expect(stats.count).toBe(30);expect(stats.values).toEqual([0,7.25,14.5,21.75,29]);
 expect(()=>municipalityDistribution([...rows,rows[0]],2023)).toThrow('重複');
 expect(municipalityDistribution([{...rows[0],value:null},...rows.slice(1)],2023).count).toBe(29);
});
it('retains pending, zero, missing and export source fields without producing temporal arithmetic',()=>{
 const raw=[row('15',2021,0,'prefecture_total'),row('15',2022,4,'prefecture_total')];
 const records=chartRecords(raw,'hdl');
 expect(records.map(r=>r.value)).toEqual([0,4]);expect(records.every(r=>r.comparability_status==='pending'&&!r.comparison_allowed)).toBe(true);expect(connect(records[0],records[1])).toBe(false);
 expect(chartRecords([{...raw[0],derived_rate:undefined}],'hdl')[0].value).toBeNull();
 const out=chartCsv(records,[{indicator_id:'hdl',name:'脂質：HDL'} as Indicator],'test-release');
 for(const text of ['test-release','pending','numerator','denominator','indicator_id','脂質：HDL'])expect(out).toContain(text);
 expect(out).not.toMatch(/difference_pt|増減率|composition_total/);
});
it('renders one reference chart per lipid with fixed zero-based axes, independent bars and bounded exports',()=>{
 const ids=['lipid_people','triglycerides','hdl','ldl','total_cholesterol'];
 const indicators=ids.map(indicator_id=>presentationIndicator({indicator_id,name:indicator_id,rate:{label:'割合'}} as Indicator));
 const records=ids.flatMap(id=>[2021,2022,2023].flatMap(y=>[row('15',y,10,'prefecture_total',id),row('1',y,8,'municipality',id)]));
 const c={data:{years:[2021,2022,2023],indicators,records,geographies:[{code:'15',name:'新潟県（県計）',level:'prefecture_total'},{code:'1',name:'市町村',level:'municipality'}]},indicator:indicators[0],regions:['15','1'],year:2023,release:'test',source:()=>{},notify:()=>{}} as unknown as Context;
 const html=renderToStaticMarkup(<ReportedCharts c={c}/>);
 expect(html.match(/data-chart="annual"/g)).toHaveLength(5);
 expect(html.match(/data-chart="independent-bars"/g)).toHaveLength(2);
 expect(html.match(/data-export-surface="graph-card"/g)).toHaveLength(8);
 for(const id of ids)expect(html).toContain(`data-y-domain="0,${chartMax[id]}"`);
 expect(html).toContain('comparability: pending');expect(html).toContain('医学的な基準範囲ではありません');
 expect(html).not.toMatch(/SHA-256|data-export-private|composition-chart/);
});

it('renders all municipality dots and distinct references on the fixed map domain across years',()=>{
 const indicator=presentationIndicator({indicator_id:'lipid_people',name:'脂質代謝：実人員',rate:{label:'割合'}} as Indicator);
 const records=[2021,2022,2023].flatMap(y=>[...Array.from({length:30},(_,j)=>row('m'+j,y,50+j,'municipality','lipid_people')),row('15',y,66,'prefecture_total','lipid_people')]);
 const base={data:{records,indicators:[indicator],geographies:[{code:'15',name:'新潟県（県計）',level:'prefecture_total'},{code:'m0',name:'選択市',level:'municipality'}]},indicator,regions:['15','m0'],release:'test',source:()=>{},notify:()=>{}} as unknown as Context;
 for(const year of [2021,2022,2023]){
  const html=renderToStaticMarkup(<DistributionChart c={{...base,year}} indicator={indicator}/>);
  expect(html.match(/data-municipality-dot=/g)).toHaveLength(30);
  expect(html.match(/data-distribution-reference="county"/g)).toHaveLength(1);
  expect(html.match(/data-distribution-reference="selected"/g)).toHaveLength(1);
  expect(html).toContain('data-x-domain="50,80"');
  expect(html).toContain('fill-opacity=".10"');expect(html).toContain('fill-opacity=".32"');
  expect(html).toContain('vector-effect="non-scaling-stroke"');
  expect(html).toContain('stroke-width="1.2"');expect(html).toContain('stroke-width="1.7"');
 }
 const html=renderToStaticMarkup(<DistributionChart c={{...base,year:2023,regions:['15']}} indicator={indicator}/>);
 expect(html).not.toContain('data-distribution-reference="selected"');expect(html).not.toContain('選択市町村</span>');
 expect(municipalityDistribution(chartRecords(records,'lipid_people'),2023).values).toEqual([50,57.25,64.5,71.75,79]);
});
