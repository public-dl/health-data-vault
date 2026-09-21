import {it,expect,vi,afterEach} from 'vitest';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {healthThemes,themeChoices,lipidDisplayOrder,resolveThemeSelection} from './health-themes';
import {displayData,csv,connect,type Payload} from './model';
import {reportedContext,ReportedViews} from './reported-views';
import {regionalRateDifference} from './reported-model';
import {MapPanel,type Context} from './panels';
import {indicatorColorAliases} from './visual-metadata';
afterEach(()=>vi.unstubAllGlobals());

it('retains categorical map behavior when continuous metadata is absent',()=>{
 vi.stubGlobal('window',{matchMedia:()=>({matches:false})});
 const breaksById:Record<string,number[]>={lipid_people:[60,65,70,75],triglycerides:[24,28,32,36],hdl:[4,5,6,8],ldl:[40,45,50,55],total_cholesterol:[25,30,35,40]};
 const c=fixture();
 c.data.map.features=[{type:'Feature',properties:{code:'15202',name:'長岡市'},geometry:{type:'Polygon',coordinates:[[[138,37],[138,38],[139,38],[138,37]]]}}];
 for(const [id,breaks] of Object.entries(breaksById)){
  const indicator={...c.data.indicators.find(i=>i.indicator_id===id)!,map_breaks:breaks,map_scale:undefined};
  const palette=indicatorColorAliases[id].palette;
  for(const [value,index] of [[0,0],[null,-1],...breaks.flatMap((b,j)=>[[b-.001,j],[b,j+1]])] as [number|null,number][]){
   const records=c.data.records.map(r=>({...r,geography_level:r.geography_code==='15202'?'municipality':'prefecture_total',value:r.indicator_id===id&&r.geography_code==='15202'?value:r.value}));
   const html=renderToStaticMarkup(<MapPanel c={{...c,indicator,palette,data:{...c.data,records}}} region="15" onSelect={()=>{}}/>);
   const path=html.match(/<path[^>]*data-geography="15202"[^>]*>/)![0];
   if(index<0)expect(path).toContain('fill="url(#');else expect(path).toContain(`fill="${palette[index]}"`);
  }
 }
});

function fixture(){
 const data={schema_version:'reported-annual-3',years:[2021,2022,2023],population_scope:'test',geographies:[{code:'15',name:'新潟県（県計）'},{code:'15202',name:'長岡市'}],map:{type:'FeatureCollection',metadata:{},features:[]},insights:[],indicators:lipidDisplayOrder.map((id,j)=>({indicator_id:id,name:'脂質：'+['実人員','中性脂肪','HDLコレステロール','LDLコレステロール','総コレステロール'][j],theme_id:'lipids',theme_label:'脂質',display_set_label:'脂質：全項目',visualization_type:'single_judgment_rate',overview_label:'掲載項目をひと目で見る',unit:'人',map_breaks:[100,500,2000,10000],rate:{label:'特定健診受診者に占める割合（%）',map_breaks:[20,40,60,80]}})),denominator_records:[],records:[]} as unknown as Payload;
 for(const year of data.years)for(const code of ['15','15202']){
  const denominator={record_id:code+year,geography_code:code,observation_fiscal_year:year,value:100,source_cell:'B6'} as any;data.denominator_records!.push(denominator);
  for(const id of lipidDisplayOrder){const value=code==='15'?20:30;data.records.push({record_id:id+code+year,indicator_id:id,geography_code:code,geography_name:code,observation_fiscal_year:year,publication_fiscal_year:year+1,value,unit:'人',population_scope:'test',annual_display_allowed:true,comparison_allowed:false,comparability_status:'pending',regional_difference_allowed:true,denominator_record_id:denominator.record_id,derived_rate:{value,numerator_value:value,denominator_value:100,denominator_record_id:denominator.record_id,statistic:'single_judgment_recipient_percentage',denominator_kind:'healthcheck_recipients',validation_status:'passed',comparability_status:'pending',comparison_allowed:false,regional_difference_allowed:true,definition_version:'lipid-recipient-rate-v1',rate_origin:id==='lipid_people'||id==='total_cholesterol'?'hdv-derived':'official-formula-confirmed'}} as any);}
 }
 const displayed=displayData(data,'rate');
 return reportedContext({data:displayed,indicator:displayed.indicators[0],measure:'rate',year:2023,regions:['15','15202'],release:'test',review:true,notify:()=>{},source:()=>{}} as Context,true);
}
it('enables exactly the five audited items and a non-composition set, preserving indicator links',()=>{
 const c=fixture(),theme=healthThemes.find(t=>t.id==='lipids')!;
 expect(themeChoices(theme,[],c.data.indicators).ids).toEqual(['set:lipids',...lipidDisplayOrder]);
 for(const id of lipidDisplayOrder)expect(resolveThemeSelection(null,id,'fallback',[],c.data.indicators)).toEqual({themeId:'lipids',indicatorId:id});
 expect(themeChoices(theme,[],c.data.indicators.slice(1)).sets).toHaveLength(0);
});
it('uses common surfaces and annual tables, never a composition or temporal graph',()=>{
 vi.stubGlobal('window',{matchMedia:()=>({matches:false})});
 const c=fixture();const html=renderToStaticMarkup(<ReportedViews c={c} members={lipidDisplayOrder} onSelect={()=>{}} onYear={()=>{}}/>);
 expect(html).toContain('掲載項目をひと目で見る');expect(html).toContain('脂質：全項目');
 expect(html.match(/<th scope="row">/g)).toHaveLength(10);
 expect(html).toContain('category-year-table');expect(html).toContain('data-export-surface="summary-card"');
 expect(html).not.toMatch(/hundred-svg|composition-total|構成合計100%|脂質：全区分/);
 expect(html).toContain('comparability: pending');expect(html.match(/data-chart="annual"/g)).toHaveLength(5);
});
it('retains rate origin in count and rate CSV, allows only same-year regional arithmetic',()=>{
 const c=fixture(),rows=c.data.records.filter(r=>r.indicator_id==='lipid_people');
 expect(regionalRateDifference(rows[0],rows[1])).toBe(10);
 expect(regionalRateDifference(rows[0],rows[2])).toBeNull();expect(connect(rows[0],rows[2])).toBe(false);
 const output=csv(c.data.records,'脂質');expect(output).toContain('rate_origin');expect(output).toContain('official-formula-confirmed');expect(output).toContain('hdv-derived');
 expect(output).not.toMatch(/residual|composition_total/);
});
