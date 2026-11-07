import React from 'react';
import {renderToReadableStream} from 'react-dom/server';
import {it,expect,vi,afterEach} from 'vitest';
import type {Payload,Observation,ExaminationRate} from './model';
import {examinationSpecs,validateExaminationPayload,examinationRateText,examinationCsv,examinationContract} from './examination-model';
import {ExaminationViews} from './examination-views';
import {mapRecordText} from './map-summary';
import {municipalityDistribution} from './reported-chart-model';
import {themeChoices,healthThemes,resolveThemeSelection} from './health-themes';
import type {Context} from './panels';

function fixture(id='ecg'){
 const data={schema_version:'detailed-examination-1',years:[2021,2022,2023],input_run_id:'test',population_scope:'test',indicators:examinationSpecs.map(s=>({indicator_id:s.id,name:{anemia:'貧血検査',ecg:'心電図検査',fundus:'眼底検査'}[s.id],unit:'人',examination_contract:examinationContract,theme_id:'detailed',map_breaks:[],palette:['#eee8f8','#61419a'],map_scale:{mode:'continuous',min:0,max:s.maximum},capabilities:{recipient_rate:false,composition:false,map_mode:'rate',distribution:true}})),
 geographies:[{code:'15',name:'県計',level:'prefecture_total'},{code:'A',name:'市A',level:'municipality'},{code:'B',name:'市B',level:'municipality'}],map:{type:'FeatureCollection',features:[],metadata:{attribution:'test',notice:'test'}},records:[],denominator_records:[],indicator_groups:[],insights:[],source_validation:{errors:0},warnings:[]} as unknown as Payload;
 for(const spec of examinationSpecs)for(const geo of data.geographies)for(const year of data.years){
  const zero=spec.id==='fundus'&&geo.code==='A',missing=spec.id==='fundus'&&geo.code==='B';
  const nv=missing?null:geo.code==='A'?0:2,dv=missing?null:zero?0:20;
  const base={geography_code:geo.code,geography_name:geo.name,geography_level:geo.level,observation_fiscal_year:year,publication_fiscal_year:year+1,population_scope:'test',source_sheet:'保険者別 ',source_sha256:'test',comparison_allowed:false,comparability_status:spec.id==='ecg'?'incompatible':'pending',source_url:'https://example.test/source',source_count_contract:'detailed-healthcheck-counts-v1'};
  const d={...base,record_id:spec.test+geo.code+year,indicator_id:spec.test,source_cell:spec.denominator+'6',unit:'件',value:dv,value_state:dv==null?'blank':dv===0?'zero':'numeric'} as Observation;
  const r={...base,record_id:spec.id+geo.code+year,indicator_id:spec.id,source_cell:spec.numerator+'6',unit:'人',value:nv,value_state:nv==null?'blank':nv===0?'zero':'numeric',denominator_record_id:d.record_id} as Observation;
  r.examination_rate={value:missing||zero?null:nv!/dv!*100,state:missing?'missing':zero?'zero_denominator':'valid',unit:'%',contract:examinationContract,label:'実施件数に対する判定人数の割合',denominator_kind:'examination_count',numerator_value:nv,denominator_value:dv,numerator_unit:'人',denominator_unit:'件',numerator_record_id:r.record_id,denominator_record_id:d.record_id,numerator_cell:r.source_cell,denominator_cell:d.source_cell,source_sha256:'test',formula:'judgment_people / examination_count * 100',comparison_allowed:false,validation_status:'passed',official_evidence:{overview_sheet:'概要',rate_cell:'J36',formula:'=J35/J34*100',source_url:'https://example.test/source',cached_value:10}};
  data.records.push(r);data.denominator_records!.push(d);
 }
 return {data,indicator:data.indicators.find(i=>i.indicator_id===id)!,regions:['15'],year:2023,measure:'count',release:'test',review:true,notify:()=>{},source:()=>{}} as Context;
}
afterEach(()=>vi.unstubAllGlobals());
it('offers exactly three examinations and redirects legacy test-count deep links',()=>{
 const c=fixture(),theme=healthThemes.find(t=>t.id==='detailed')!;
 expect(themeChoices(theme,[],c.data.indicators).ids).toEqual(['anemia','ecg','fundus']);
 expect(resolveThemeSelection('detailed','fundus_tests','group:metabo',[],c.data.indicators)).toEqual({themeId:'detailed',indicatorId:'fundus'});
});
it('validates specific examination units and rejects recipient denominators, wrong values, duplicate keys and missing contracts',()=>{
 const c=fixture();expect(validateExaminationPayload(c.data)).toBe(true);
 for(const mutate of [(d:Payload)=>{d.denominator_records![0].unit='人'},(d:Payload)=>{d.records[0].examination_rate!.denominator_kind='healthcheck_recipients'},(d:Payload)=>{d.records[0].examination_rate!.value=99},(d:Payload)=>{d.records.push(d.records[0])},(d:Payload)=>{d.records[0].examination_rate!.contract='unknown'},(d:Payload)=>{d.indicators[0].map_scale!.max=100}]){const d=structuredClone(c.data);mutate(d);expect(()=>validateExaminationPayload(d)).toThrow();}
});
it('distinguishes zero denominators, missing counts and valid numeric zero in labels, map summaries and CSV',()=>{
 const c=fixture('fundus');const get=(id:string,geo:string)=>c.data.records.find(r=>r.indicator_id===id&&r.geography_code===geo)!;
 expect(examinationRateText(get('fundus','A'))).toContain('算出不可');expect(examinationRateText(get('fundus','B'))).toContain('欠損');expect(examinationRateText(get('anemia','A'))).toBe('0.0％');
 expect(mapRecordText(get('fundus','A'),'%')).toContain('算出不可');const csv=examinationCsv([get('fundus','A'),get('fundus','B')]);expect(csv).toContain('zero_denominator');expect(csv).toContain('missing');expect(csv).toContain('denominator_cell');
});
it('excludes county and preserves invalid municipality rates outside the distribution',()=>{
 const data=fixture('fundus').data;const rows=data.records.filter(r=>r.indicator_id==='fundus').map(r=>({...r,value:r.examination_rate!.value}));const dist=municipalityDistribution(rows,2023);expect(dist.count).toBe(0);expect(dist.total).toBe(2);expect(dist.values).toEqual([null,null,null,null,null]);
});
it('renders all three quantities, percentage maps and independent annual points with the ECG break',async()=>{
 vi.stubGlobal('window',{matchMedia:()=>({matches:false})});const c=fixture('ecg');const stream=await renderToReadableStream(<ExaminationViews c={c} onSelect={()=>{}} onYear={()=>{}}/>);await stream.allReady;const html=(await new Response(stream).text()).replace(/<!--.*?-->/g,'');
 expect(html).toContain('2人');expect(html).toContain('20件');expect(html).toContain('10.0％');expect(html).toContain('data-unit="%"');expect(html).toContain('data-chart="examination-annual"');expect(html).toContain('data-chart="examination-distribution"');expect(html).toContain('data-examination-break="2022_2023"');expect(html).not.toContain('data-annual-reference-link');expect(html).not.toContain('100人ピクトグラム');expect(html).not.toContain('報告人数／受診者数（人）');
});
