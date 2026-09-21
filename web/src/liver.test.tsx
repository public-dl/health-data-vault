import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {healthThemes,themeChoices,resolveThemeSelection} from './health-themes';
import {displayData,csv,type Payload} from './model';
import {ReportedViews,reportedContext} from './reported-views';
import {chartRecords,municipalityDistribution,chartCsv} from './reported-chart-model';
import type {Context} from './panels';
afterEach(()=>vi.unstubAllGlobals());

function fixture(){
 const name='肝機能：保健指導以上として再掲された人数';
 const raw={schema_version:'reported-annual-5',years:[2021,2022,2023],population_scope:'test',indicator_groups:[],
  geographies:[{code:'15',name:'新潟県（県計）',level:'prefecture_total'},...Array.from({length:30},(_,j)=>({code:String(15202+j),name:'市町村'+j,level:'municipality'}))],
  map:{type:'FeatureCollection',metadata:{},features:[]},insights:[],
  indicators:[{indicator_id:'liver',name,public_label:name,source_label:'肝機能',semantic_key:'reported_guidance_or_higher',terminology_version:'2026-09-v1',
   theme_id:'liver',theme_label:'肝機能',visualization_type:'single_judgment_rate',overview_label:'判定状況をひと目で見る',unit:'人',map_breaks:[],
   capabilities:{recipient_rate:true,composition:false},rate:{label:'特定健診受診者数に占める割合（％）',map_breaks:[]},map_scale:{mode:'continuous',min:18,max:32},chart_max:40}],
  denominator_records:[],records:[]} as unknown as Payload;
 for(const year of raw.years)for(const geo of raw.geographies){
  const denominator={record_id:geo.code+year,geography_code:geo.code,observation_fiscal_year:year,value:113771,source_cell:'B6'} as any;
  raw.denominator_records!.push(denominator);
  raw.records.push({record_id:'liver'+geo.code+year,indicator_id:'liver',geography_code:geo.code,geography_name:geo.name,geography_level:geo.level,
   observation_fiscal_year:year,publication_fiscal_year:year+1,value:28783,unit:'人',value_state:'numeric',source_cell:'W6',
   annual_display_allowed:true,comparison_allowed:false,comparability_status:'pending',denominator_record_id:denominator.record_id,
   derived_rate:{value:28783/113771*100,unit:'%',numerator_value:28783,denominator_value:113771,denominator_record_id:denominator.record_id,
    statistic:'single_judgment_recipient_percentage',denominator_kind:'healthcheck_recipients',validation_status:'passed',comparability_status:'pending',comparison_allowed:false,
    rate_origin:'official_formula_confirmed'}} as any);
 }
 const data=displayData(raw,'rate');
 return reportedContext({data,indicator:data.indicators[0],measure:'rate',year:2023,regions:['15','15202'],release:'test',review:true,notify:()=>{},source:()=>{}} as Context,true);
}
it('exposes liver alone without fabricated members or a redundant all-items set',()=>{
 const c=fixture(),theme=healthThemes.find(t=>t.id==='liver')!;
 expect(themeChoices(theme,[],c.data.indicators).ids).toEqual(['liver']);
 expect(resolveThemeSelection(null,'liver','fallback',[],c.data.indicators)).toEqual({themeId:'liver',indicatorId:'liver'});
 expect(themeChoices(theme,[],[]).ids).toEqual([]);
});
it('reuses all four export surfaces without composition or indicator-comparison charts',()=>{
 vi.stubGlobal('window',{matchMedia:()=>({matches:false})});
 const c=fixture();
 const html=renderToStaticMarkup(<ReportedViews c={c} onYear={()=>{}} onSelect={()=>{}}/>);
 for(const kind of ['summary-card','map-card','table-card','graph-card'])expect(html).toContain('data-export-surface="'+kind+'"');
 expect(html).toContain('28,783');expect(html).toContain('113,771');expect(html).toContain('25.3');
 expect(html).toContain('特定健診受診者数に</span><span class="metric-heading-line">占める割合（％）');
 expect(html).toContain('data-chart="annual"');
 expect(html).not.toContain('指標間の比較');expect(html).not.toContain('100人ピクトグラム');
 expect(html).not.toContain('構成合計100%');
});
it('keeps the fixed distribution domain and excludes county from the 30-point statistics',()=>{
 const c=fixture(),rows=chartRecords(c.data.records,'liver');
 expect(c.indicator.map_scale).toEqual({mode:'continuous',min:18,max:32});
 for(const year of c.data.years){const d=municipalityDistribution(rows,year);expect(d.count).toBe(30);expect(d.total).toBe(30);}
 const output=chartCsv(rows,c.data.indicators,c.release);
 for(const token of ['liver','source_label','public_label','semantic_key','terminology_version','reported_guidance_or_higher','official_formula_confirmed','pending','release_id','W6','B6'])expect(output).toContain(token);
 expect(csv(c.data.records,c.indicator.name)).not.toMatch(/residual|composition_total/);
});
