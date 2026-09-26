import {DeferredSection} from './deferred-section';
const ReportedCharts=React.lazy(()=>import('./reported-charts').then(m=>({default:m.ReportedCharts})));
import {ExportSurface} from './export-surface';
import {ReportedSetTable} from './reported-table';
import React,{useRef,useState} from 'react';
import {displayData,format,formatValue} from './model';
import {isReportedSchema,reportedRate,regionalRateDifference,rateDifferenceText} from './reported-model';
import {Actions,SourceLink,MapPanel,TablePanel,Insight,LayoutToggle,nameFor,svgText,type Context,type Layout} from './panels';
import {ComparisonActions} from './comparison-export';
import {MapNotes} from './map-notes';
import {YearTimeline} from './year-timeline';

export const reportedNotice='年度間の比較可能性は確認中です。表には各年度の実績値を併記しますが、前年差・増減率・トレンドは表示しません。';

/** Map capability is independent of the value selected for counts/tables. */
export function reportedMapContext(c:Context):Context|null {
 if(c.indicator.capabilities?.map_mode==='none')return null;
 if(c.indicator.capabilities?.map_mode!=='rate'||c.measure==='rate')return c;
 const data=displayData({...c.data,records:c.data.records.filter(r=>r.indicator_id===c.indicator.indicator_id)},'rate');
 return {...c,measure:'rate',data,indicator:data.indicators.find(i=>i.indicator_id===c.indicator.indicator_id)!};
}

/** Restrict shared panels/exports to one year; ratios are verified release values. */
export function reportedContext(c:Context,annualValues=false):Context {
 const ratios=['reported-annual-2','reported-annual-3','reported-annual-4','reported-annual-5','reported-annual-6'].includes(c.data.schema_version);
 const mixed=['reported-annual-4','reported-annual-5','reported-annual-6'].includes(c.data.schema_version);
 if(!isReportedSchema(c.data.schema_version)||(!mixed&&c.indicator.visualization_type!==(ratios?'single_judgment_rate':'reported_count'))||(!ratios&&c.indicator.rate))throw new Error('単独判定の表示契約が不正です');
 const records=c.data.records.filter(r=>annualValues||r.observation_fiscal_year===c.year).map(r=>{
  const denominator=c.data.denominator_records?.find(d=>d.record_id===r.denominator_record_id);
  if(!r.annual_display_allowed||r.comparison_allowed||r.comparability_status!=='pending'||!denominator||denominator.geography_code!==r.geography_code||denominator.observation_fiscal_year!==r.observation_fiscal_year)throw new Error('原典との対応を確認できません');
  const rate=reportedRate(r);
  const metadata=c.data.indicators.find(i=>i.indicator_id===r.indicator_id);
  if(!metadata)throw new Error('指標metadataがありません');
  if(metadata.capabilities?.count_only&&(['derived_rate','derivation','rate','percentage','recipient_percentage'].some(k=>k in r)||metadata.rate||c.measure!=='count'||r.unit!=='人'))throw new Error('人数公開契約に割合を含めることはできません');
  const authorized=mixed?!!metadata.rate:ratios;
  if(mixed&&(metadata.capabilities?.recipient_rate===false&&rate))throw new Error('未承認の派生割合');
  if(authorized){
   if(!rate||rate.statistic!=='single_judgment_recipient_percentage'||rate.denominator_kind!=='healthcheck_recipients'
     ||rate.validation_status!=='passed'||rate.comparison_allowed||rate.comparability_status!=='pending'
     ||rate.denominator_record_id!==denominator.record_id||rate.denominator_value!==denominator.value
     ||rate.denominator_value<=0||rate.numerator_value<0||rate.numerator_value>rate.denominator_value
     ||!Number.isFinite(rate.value)||Math.abs(rate.value-rate.numerator_value/rate.denominator_value*100)>1e-10
     ||r.value!==(c.measure==='rate'?rate.value:rate.numerator_value))throw new Error('単独判定割合の検証を確認できません');
  }else if(rate)throw new Error('未許可の派生割合');
  return {...r,denominator,...(authorized?{derivation:rate}:{})};
 });
 return {...c,annualValues,measure:ratios?c.measure:'count',palette:c.indicator.palette,data:{...c.data,years:annualValues?c.data.years:[c.year],records}};
}

function ReportedOverview({c,code}:{c:Context;code:string}) {
 const ref=useRef<SVGSVGElement>(null);
 const row=c.data.records.find(r=>r.indicator_id===c.indicator.indicator_id&&r.geography_code===code);
 if(!row)return <p role="alert">原表の報告人数を確認できません。</p>;
 const rate=reportedRate(row),count=rate?.numerator_value??row.value;
 const recipient=(c.indicator.capabilities?.count_only?'参考：':'')+(c.indicator.recipient_label??'受診者数');
 const rateLabel=c.indicator.rate?.label??'受診者に占める割合（%）';
 const base=c.data.records.find(r=>r.indicator_id===c.indicator.indicator_id&&r.geography_code===c.regions[0]);
 const difference=regionalRateDifference(base,row);
 const delta=difference==null?'':`${nameFor(c,c.regions[0])}との差 ${rateDifferenceText(difference)}（同年度・地域間の算術差）`;
 return <ExportSurface kind="summary-card" className="panel"><div className="panel-heading"><h3>{nameFor(c,code)}・{c.year}年度</h3><Actions c={c} svg={ref} rows={[row]} title={`${nameFor(c,code)}_${c.year}年度_${c.indicator.name}`}/></div>
 <div className="reported-values"><h4>{c.indicator.name}</h4><div><span>{c.indicator.count_label??'判定人数'}</span><strong style={{color:c.indicator.color}}>{format(count)}人</strong></div>
 {rate&&<div><span>{rateLabel}</span><strong style={{color:c.indicator.color}}>{formatValue(rate.value,'%')}%</strong></div>}
 <p>{recipient}：<b>{format(row.denominator?.value)}人</b></p>{delta&&<p className="region-difference">{delta}</p>}</div>
 <svg ref={ref} className="export-only" viewBox="0 0 760 310" aria-hidden="true">
 <rect width="760" height="310" fill="white"/><text x="24" y="35" {...svgText} fontSize="20" fontWeight="600">{c.indicator.name} / {nameFor(c,code)} / {c.year}年度</text>
 <text x="24" y="96" {...svgText} fill={c.indicator.color} fontSize="40" fontWeight="700">{c.indicator.count_label??'判定人数'} {format(count)}人</text>
 {rate&&<><text x="24" y="140" {...svgText} fontSize="19">{rateLabel}</text><text x="24" y="193" {...svgText} fill={c.indicator.color} fontSize="40" fontWeight="700">{formatValue(rate.value,'%')}%</text></>}
 <text x="24" y="244" {...svgText} fontSize="21">{recipient}：{format(row.denominator?.value)}人</text>
 <text x="24" y="284" {...svgText} fontSize="17">{delta}</text></svg><SourceLink c={c} rows={[row]}/></ExportSurface>;

}

export function ReportedViews({c,members,onSelect,onYear}:{c:Context;members?:string[];onSelect:(code:string)=>void;onYear:(year:number)=>void}) {
 const [layout,setLayout]=useState<Layout>('side');
 const countOnly=c.indicator.capabilities?.count_only===true;
 const years=[...new Set(c.data.denominator_records?.map(r=>r.observation_fiscal_year)??[])].sort();
 const contexts=(members??[c.indicator.indicator_id]).map(id=>{const indicator=c.data.indicators.find(i=>i.indicator_id===id)!;return {...c,indicator,palette:indicator.palette,measure:indicator.rate?c.measure:'count' as const};});
 const tableData=c.indicator.capabilities?.temporal_rate&&c.measure!=='rate'?displayData({...c.data,records:c.data.records.filter(r=>r.indicator_id===c.indicator.indicator_id)},'rate'):c.data;
 const tableContext={...c,measure:c.indicator.capabilities?.temporal_rate?'rate' as const:c.measure,data:{...tableData,years:tableData.years.filter(y=>y<=c.year),records:tableData.records.filter(r=>r.observation_fiscal_year<=c.year)}};
 const current=(context:Context):Context=>({...context,annualValues:false,data:{...context.data,years:[c.year],records:context.data.records.filter(r=>r.observation_fiscal_year===c.year)}});
 const heading=(number:string,title:string)=><div className="section-heading"><span className="number">{number}</span><h2>{title}</h2></div>;
 return <><p className="annual-notice">{reportedNotice}</p>{members&&<p className="footnote">{c.indicator.set_notice??'全区分は、原資料に掲載されている「受診勧奨」「保健指導」の2区分を表示しています。受診者全体を完全分類した構成ではありません。'}</p>}
 <section id="overview">{heading('01',c.indicator.overview_label??'判定状況をひと目で見る')}
 <div className={members&&c.regions.length===1?'group-map-grid':'reported-overviews'}>{contexts.map(context=><div key={context.indicator.indicator_id} id={'reported-overview-'+context.indicator.indicator_id}>
 <div className="comparison-heading">{members&&<h3 className="category-heading">{context.indicator.name}</h3>}<ComparisonActions c={current(context)} kind="overview" layout={layout} mapScope={'#reported-overview-'+context.indicator.indicator_id}/></div>
 <div className={`comparison-panels ${c.regions.length>1?layout:'single'}`}>{c.regions.map(code=><ReportedOverview key={code} c={current(context)} code={code}/>)}</div></div>)}</div>
 </section>
 <DeferredSection id="map">{heading('02','地図で見る')}{countOnly?<p className="annual-notice">地域比較に用いる割合の分母を再確認しているため、地図表示は停止しています。<a href="#table">報告人数は表で確認できます。</a></p>:<>{contexts.some(x=>x.indicator.capabilities?.map_mode!=='none')&&<MapNotes measure={c.indicator.capabilities?.map_mode==='rate'?'rate':c.measure} rateLabel={c.indicator.rate?.label} mixed={c.measure==='rate'&&contexts.some(x=>!x.indicator.rate)}/>}
 <p className="footnote">{c.indicator.source_notice??<>原資料の「判定区分（保健指導以上を再掲）」に掲載された人数です。割合は同年度・同地域の特定健診受診者数を分母として算出しています。受診勧奨・保健指導以外の受診者を「正常」とするものではありません。受診者数は血圧測定者数ではありません。</>}{(c.measure==='rate'||c.indicator.capabilities?.map_mode==='rate')&&contexts.some(x=>x.indicator.map_scale)?'地図の色は割合の大小を連続的に示しています。医学的判定区分を示すものではありません。同じ指標では年度・地域を変更しても同じ表示尺度を使用しています。':c.indicator.capabilities?.map_mode==='none'?'':'凡例は分布を読むための表示階級です。'}</p>
 {c.regions.length>1&&<LayoutToggle section={(c.indicator.theme_label??"判定")+"の地図・表"} value={layout} onChange={setLayout}/>}
 <div className={members&&c.regions.length===1?'group-map-grid':''}>{contexts.map(context=>{const local=reportedMapContext(current(context)),scope='reported-map-'+context.indicator.indicator_id;if(!local)return <p key={scope} className="annual-notice">この指標は割合の公開契約が未承認のため、地図表示を行っていません。報告人数は表で確認できます。</p>;return <div key={scope} id={scope}>
 {members&&<h3 className="category-heading">{context.indicator.name}</h3>}<ComparisonActions c={local} kind="map" layout={layout} mapScope={'#'+scope}/>
 <div className={`comparison-panels ${c.regions.length>1?layout:'single'}`}>{c.regions.map(code=><MapPanel key={code} c={local} region={code} onSelect={onSelect} showNotes={false}/>)}</div>
 <YearTimeline years={years} year={c.year} playing={false} onYear={onYear} label={context.indicator.name+'・単年度閲覧'}/>
 <div className={`comparison-panels ${c.regions.length>1?layout:'single'}`}>{c.regions.map(code=><Insight key={code} c={local} code={code} map/>)}</div>
 </div>;})}</div></>}</DeferredSection>
 <DeferredSection id="table">{heading('03','表で見る')}<p>各年度の実績値を併記しています。年度間の比較可能性は確認中です。</p>
 <ComparisonActions c={{...tableContext,reportedMembers:members}} kind="table" layout={layout}/>
 <div className={`comparison-panels ${c.regions.length>1?layout:'single'}`}>{c.regions.map(code=>members?<ReportedSetTable key={code} c={tableContext} code={code} members={members}/>:<TablePanel key={code} c={tableContext} code={code}/>)}</div></DeferredSection>
 <DeferredSection id="graph">{heading('04','グラフで見る')}{countOnly?<p className="annual-notice">地域比較に用いる割合の分母を再確認しているため、グラフ・地域分布は表示していません。<a href="#table">各年度の報告人数は表で確認できます。</a></p>:<React.Suspense fallback={<p role="status">グラフを読み込んでいます</p>}><ReportedCharts c={c}/></React.Suspense>}</DeferredSection></>;
}
