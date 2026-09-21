import {it,expect} from 'vitest';
import {reportedContext} from './reported-views';
import {comparisonCsv,comparisonTable} from './comparison-export-model';
import {connect,type Payload} from './model';
import type {Context} from './panels';
import {healthThemes,themeChoices,resolveThemeSelection,bloodPressureDisplayOrder,orderByIndicators} from './health-themes';
import {temporalTable} from './temporal-table';
import {regionalRateDifference,reportedExportLines} from './reported-model';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ReportedSetTable} from './reported-table';

function ratioFixture(annualValues=false){
 const c=fixture();c.data.schema_version='reported-annual-2';
 c.data.indicators.forEach(i=>{i.visualization_type='single_judgment_rate';i.rate={label:'特定健診受診者に占める割合（%）'} as any});
 c.data.records.forEach(r=>{r.regional_difference_allowed=true;r.value=r.geography_code==='15'?20:25;r.derived_rate={value:r.value,numerator_value:r.value,denominator_value:100,denominator_record_id:r.denominator_record_id,statistic:'single_judgment_recipient_percentage',denominator_kind:'healthcheck_recipients',validation_status:'passed',comparability_status:'pending',comparison_allowed:false,regional_difference_allowed:true,definition_version:'test'} as any});
 return reportedContext(c,annualValues);
}
it('offers a display set only when both independently validated ratio indicators are available',()=>{
 const c=ratioFixture(true),theme=healthThemes.find(t=>t.id==='blood-pressure')!;
 expect(themeChoices(theme,[],c.data.indicators).ids).toEqual(['set:blood-pressure','bp_referral','bp_guidance']);
 expect(themeChoices(theme,[],c.data.indicators.slice(0,1)).sets).toEqual([]);
 expect(resolveThemeSelection(null,'set:blood-pressure','fallback',[],c.data.indicators).themeId).toBe('blood-pressure');
 expect(c.data.indicator_groups).toBeUndefined();
});
it('lists annual facts while retaining pending and no time-series connection',()=>{
 const c=ratioFixture(true),rows=c.data.records.filter(r=>r.indicator_id==='bp_guidance'&&r.geography_code==='15');
 expect(temporalTable(rows,2023,'rate').columns).toEqual([2021,2022,2023]);
 expect(temporalTable(rows,2023,'rate').rows.map(r=>r.id)).toEqual(['rate','population','publication','comparison']);
 expect(rows.every(r=>!r.comparison_allowed&&r.comparability_status==='pending')).toBe(true);
 expect(connect(rows[0],rows[1])).toBe(false);
 const input={...c,indicatorId:c.indicator.indicator_id};
 expect(comparisonTable(input).years).toEqual([2021,2022,2023]);
 const set={...input,reportedMembers:bloodPressureDisplayOrder};
 expect(comparisonTable(set).records).toHaveLength(12);
 expect(comparisonTable(set).grid).toHaveLength(5);
 expect(comparisonCsv(set)).not.toMatch(/人数合計一致|構成合計|正常|増減率/);
});
it('renders only two published rows through the shared category/year table without totals',()=>{
 const c=ratioFixture(true);
 const html=renderToStaticMarkup(<ReportedSetTable c={c} code="15" members={bloodPressureDisplayOrder}/>);
 expect(html).toContain('category-year-table');
 expect(html.match(/<th scope="row">/g)).toHaveLength(2);
 for(const y of [2021,2022,2023])expect(html).toContain(`${y}年度`);
 expect(html).not.toMatch(/composition-total|人数合計一致|構成合計100|hundred-svg|正常/);
 expect(html).toContain('年度間比較 確認中');
});
it('publishes independently verified recipient ratios without temporal comparison',()=>{
 const c=ratioFixture(),rows=c.data.records.filter(r=>r.indicator_id==='bp_guidance');
 expect(regionalRateDifference(rows[0],rows[1])).toBe(5);
 expect(regionalRateDifference(rows[1],rows[0])).toBe(-5);
 expect(regionalRateDifference(rows[0],{...rows[1],observation_fiscal_year:2022})).toBeNull();
 expect(connect(rows[0],rows[1])).toBe(false);
 const csv=comparisonCsv({...c,indicatorId:c.indicator.indicator_id});
 expect(csv).toContain('rate_label');expect(csv).toContain('same_year_difference_pt');
 const lines=reportedExportLines(rows,c.indicator.rate!.label).join('\n');
 expect(lines).toContain('判定人数 20人 / 特定健診受診者 100人');expect(lines).toContain('20.0%');
 expect(lines).not.toMatch(/正常|残差|構成合計/);
});
it('rejects a tampered independently derived percentage',()=>{
 const c=ratioFixture();c.data.records[0].derivation!.value=99;
 expect(()=>reportedContext(c)).toThrow();
});
function fixture(){
 const indicators=['bp_guidance','bp_referral'].map(indicator_id=>({indicator_id,name:indicator_id,visualization_type:'reported_count',unit:'人',map_breaks:[100,500,2000,10000]}));
 const denominators=[2021,2022,2023].flatMap(year=>['15','15202'].map(code=>({record_id:`d${code}${year}`,geography_code:code,observation_fiscal_year:year,value:100,source_cell:'B6'})));
 const records=denominators.flatMap(d=>indicators.map(i=>({...d,record_id:d.record_id+i.indicator_id,indicator_id:i.indicator_id,denominator_record_id:d.record_id,value:20,unit:'人',annual_display_allowed:true,comparison_allowed:false,comparability_status:'pending',source_cell:i.indicator_id==='bp_guidance'?'P6':'Q6'})));
 const data={schema_version:'reported-annual-1',population_scope:'監査対象母集団',indicators,records,denominator_records:denominators,years:[2021,2022,2023],geographies:[{code:'15',name:'新潟県（県計）'},{code:'15202',name:'長岡市'}]} as Payload;
 return {data,indicator:data.indicators[0],year:2023,measure:'count',regions:['15','15202'],release:'test-release'} as Context;
}
it('blood pressure is available only with published members and has no all-category choice',()=>{
 const c=fixture(),theme=healthThemes.find(t=>t.id==='blood-pressure')!;
 expect(themeChoices(theme,[],[]).ids).toEqual([]);
 expect(themeChoices(theme,[],c.data.indicators).ids).toEqual(['bp_referral','bp_guidance']);
 expect(resolveThemeSelection(null,'bp_referral','fallback',[],c.data.indicators).themeId).toBe('blood-pressure');
});
it('isolates all panels, table and comparison exports to selected year while retaining recipients',()=>{
 for(const year of [2021,2022,2023]){
 const c=reportedContext({...fixture(),year});
 expect(c.data.records).toHaveLength(4);
 expect(c.data.records.every(r=>r.observation_fiscal_year===year&&r.denominator?.value===100&&!r.derived_rate)).toBe(true);
 expect(temporalTable(c.data.records.filter(r=>r.geography_code==='15'&&r.indicator_id==='bp_guidance'),year,'count').columns).toEqual([year]);
 const input={...c,indicatorId:c.indicator.indicator_id};
 const out=comparisonTable(input);expect(out.years).toEqual([year]);expect(out.tsv).toContain('20 / 100');expect(out.tsv).toContain('pending');
 const csv=comparisonCsv(input);expect(csv).toContain('test-release');expect(csv).toContain('B6');expect(csv).toContain('P6');expect(csv).not.toContain('人数合計一致');
 expect(connect(c.data.records[0],c.data.records[1])).toBe(false);
 }
});
it('rejects temporal promotion, inferred rates and wrong recipient links',()=>{
 for(const mutate of [(c:Context)=>{c.data.records.at(-1)!.comparison_allowed=true},(c:Context)=>{c.data.records.at(-1)!.denominator_record_id='missing'},(c:Context)=>{c.data.indicators[0].rate={} as any}]){
 const c=fixture();mutate(c);expect(()=>reportedContext(c)).toThrow();
 }
});


it('uses referral before guidance in table and CSV without changing source correspondence',()=>{
 const c=ratioFixture(true);
 c.data.records.forEach(r=>{r.source_cell=r.indicator_id==='bp_referral'?'Q6':'P6'});
 const before=JSON.stringify(c.data.records);
 const sorted=orderByIndicators(c.data.records,bloodPressureDisplayOrder);
 expect(sorted[0].indicator_id).toBe('bp_referral');expect(sorted[0].source_cell).toBe('Q6');
 expect(sorted.find(r=>r.indicator_id==='bp_guidance')!.source_cell).toBe('P6');
 const input={...c,indicatorId:c.indicator.indicator_id,reportedMembers:bloodPressureDisplayOrder};
 const model=comparisonTable(input);
 expect(model.grid[1][0]).toBe('bp_referral');expect(model.grid[3][0]).toBe('bp_guidance');
 const csv=comparisonCsv(input);expect(csv.indexOf('bp_referral')).toBeLessThan(csv.indexOf('bp_guidance'));
 const html=renderToStaticMarkup(<ReportedSetTable c={c} code="15" members={bloodPressureDisplayOrder}/>);
 const body=html.split('<tbody>')[1].split('</tbody>')[0];
 expect(body.indexOf('bp_referral')).toBeLessThan(body.indexOf('bp_guidance'));
 expect(JSON.stringify(c.data.records)).toBe(before);
});
