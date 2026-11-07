import React from 'react';
import {renderToReadableStream} from 'react-dom/server';
import {it,expect} from 'vitest';
import {healthThemes,themeChoices,resolveThemeSelection} from './health-themes';
import {displayData,csv,tableText,type Payload,type Observation,type Indicator} from './model';
import {reportedContext,ReportedViews,reportedMapContext} from './reported-views';
import {temporalTable,temporalText} from './temporal-table';
import {comparisonTable} from './comparison-export-model';
import type {Context} from './panels';

const version='detailed-healthcheck-counts-v1';
const ids=['anemia','anemia_tests','ecg','ecg_tests','fundus','fundus_tests'];
function fixture(id:string){
 const data={schema_version:'reported-annual-6',population_scope:'test',years:[2021,2022,2023],indicators:ids.map(indicator_id=>({indicator_id,name:indicator_id,unit:indicator_id.endsWith('_tests')?'件':'人',source_count_contract:version,theme_id:'detailed',
  capabilities:{count_only:true,recipient_rate:false,composition:false,map_mode:'none',distribution:false},map_breaks:[]})),
  geographies:[{code:'15',name:'県計',level:'prefecture_total'}],map:{metadata:{}},records:[],denominator_records:[],insights:[],warnings:[],source_validation:{errors:0}} as unknown as Payload;
 for(const year of data.years){const d={record_id:'d'+year,geography_code:'15',observation_fiscal_year:year,value:100,unit:'人',source_cell:'B6'} as Observation;data.denominator_records!.push(d);
  for(const key of ids){const missing=key==='fundus_tests'&&year===2021;data.records.push({record_id:key+year,indicator_id:key,geography_code:'15',geography_name:'県計',geography_level:'prefecture_total',unit:key.endsWith('_tests')?'件':'人',value:missing?null:0,value_state:missing?'blank':'zero',
   observation_fiscal_year:year,publication_fiscal_year:year+1,source_count_contract:version,display_contract:'reported-annual-6',annual_display_allowed:true,comparison_allowed:false,
   comparability_status:key==='ecg'?'incompatible':'pending',comparability_intervals:{'2021_2022':'pending','2022_2023':key==='ecg'?'incompatible':'pending'},denominator_record_id:d.record_id,source_cell:'AL6',source_sheet:'保険者別 ',source_url:'https://example.test/source',source_sha256:'test',population_scope:'test',original_label:key,validation_status:'passed',definition_version:'test',annual_page_url:'https://example.test',retrieved_at:'2026-11-07T00:00:00+09:00'} as Observation);}}
 const shown=displayData(data,'count');return reportedContext({data:shown,indicator:shown.indicators.find(i=>i.indicator_id===id)!,measure:'count',year:2023,regions:['15'],release:'test',review:true,notify:()=>{},source:()=>{}} as Context,true);
}

it('enables three examination choices and keeps legacy count deep links usable',()=>{
 const theme=healthThemes.find(t=>t.id==='detailed')!;const c=fixture('ecg');
 expect(themeChoices(theme,[],c.data.indicators).ids).toEqual(['anemia','ecg','fundus']);expect(themeChoices(theme,[],[]).ids).toEqual([]);
 for(const id of ids)expect(resolveThemeSelection('detailed',id,'group:metabo',[],c.data.indicators)).toEqual({themeId:'detailed',indicatorId:id.replace(/_tests$/,'')});
});
it('preserves incompatible ECG status without granting rate or trend permission',()=>{
 const c=fixture('ecg');expect(reportedMapContext(c)).toBeNull();
 const selected=c.data.records.filter(r=>r.indicator_id==='ecg');expect(selected.every(r=>r.comparability_status==='incompatible'&&!r.comparison_allowed)).toBe(true);
 expect(temporalText(temporalTable(selected,2023,'count'))).toContain('2022→2023年度は比較不可');
});
it('uses examination units and preserves missing versus zero in tables, text and CSV',()=>{
 const c=fixture('fundus_tests');const rows=c.data.records.filter(r=>r.indicator_id==='fundus_tests');
 const model=temporalTable(rows,2023,'count');expect(model.rows[0].label).toBe('実施件数（件）');
 expect(model.rows[0].cells.map(x=>x.text)).toEqual(['欠損（原表空欄）','0件','0件']);
 expect(tableText(rows,'眼底検査：実施件数')).toContain('実施件数');expect(csv(rows,'test')).toContain('件');
 expect(comparisonTable({...c,indicatorId:'fundus_tests',regions:['15','other']}).grid.flat()).toContain('0件');
});
it('renders each selected item with correct units and no rates, maps, percentage charts or composition',async()=>{
 for(const id of ids){const c=fixture(id);const stream=await renderToReadableStream(<ReportedViews c={c} onYear={()=>{}} onSelect={()=>{}}/>);await stream.allReady;const html=(await new Response(stream).text()).replace(/<!--.*?-->/g,'');
  expect(html).toContain('0'+c.indicator.unit);expect(html).toContain('data-export-surface="table-card"');
  expect(html).not.toContain('data-export-surface="map-card"');expect(html).not.toContain('data-chart=');expect(html).not.toContain('data-metric="rate"');}
});
it('does not accept examination units or incompatible status for unrelated count indicators',()=>{
 const c=fixture('ecg');const data=structuredClone(c.data);delete data.records[0].source_count_contract;data.records[0].comparability_status='incompatible';
 expect(()=>reportedContext({...c,data},true)).toThrow();
 const wrong=structuredClone(c.data);wrong.records[0].unit='件';
 expect(()=>reportedContext({...c,data:wrong},true)).toThrow();
});
it('retains person units for the numerator in legacy percentage views and combined exports',async()=>{
 const c=fixture('anemia');c.measure='rate';c.indicator={...c.indicator,unit:'%',capabilities:{...c.indicator.capabilities!,count_only:false}};
 c.data.indicators=c.data.indicators.map(i=>i.indicator_id==='anemia'?c.indicator:i);
 const r=c.data.records.find(r=>r.indicator_id==='anemia'&&r.observation_fiscal_year===2023)!;
 r.unit='%';r.value=25;r.derived_rate={numerator_value:17,value:25,unit:'%'} as any;
 const stream=await renderToReadableStream(<ReportedViews c={c} onYear={()=>{}} onSelect={()=>{}}/>);await stream.allReady;
 const html=(await new Response(stream).text()).replace(/<!--.*?-->/g,'');expect(html).toContain('17人');expect(html).not.toContain('17%');
 const combined=comparisonTable({...c,indicatorId:'anemia',regions:['15','other'],reportedMembers:['anemia']}).grid.flat().join(' ');
 expect(combined).toContain('17人');expect(combined).not.toContain('17%');
});
