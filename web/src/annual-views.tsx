import {DeferredSection} from './deferred-section';
import {appUrl} from './app-url';
import {ExportSurface} from './export-surface';
import {MapNotes} from './map-notes';
import React,{useRef,useState} from 'react';
import type {IndicatorGroup} from './model';
import {format,formatValue,csv} from './model';
import {annualComposition} from './annual-model';
import {Actions,SourceLink,MapPanel,Insight,LayoutToggle,nameFor,svgText,type Context,type Layout} from './panels';
import {ComparisonActions} from './comparison-export';
import {CompositionOverview,CategoryIcon} from './pictograms';
import {visualGroup} from './visual-metadata';

export const annualNotice='年度間の比較可能性を確認中のため、現在は各年度を個別に表示しています。';
function AnnualTable({c,group,code}:{c:Context;group:IndicatorGroup;code:string}) {
 const ref=useRef<SVGSVGElement>(null),part=annualComposition(c.data,group,code,c.year);
 if(!part)return <p>単年度構成を検証できません。表示を保留しています。</p>;
 const rows=part.rows.filter(r=>c.group||r.indicator_id===c.indicator.indicator_id).map(r=>({...r,derivation:r.derivation??r.derived_rate,denominator:r.denominator??c.data.denominator_records?.find(d=>d.record_id===r.derived_rate?.denominator_record_id)}));
 return <ExportSurface kind="table-card" className="panel"><div className="panel-heading"><h3>{nameFor(c,code)} · {c.year}年度</h3><Actions c={c} svg={ref} rows={rows} title={`${nameFor(c,code)}_${c.year}年度_単年度表`} table csvText={csv(rows,r=>c.data.indicators.find(i=>i.indicator_id===r.indicator_id)!.name,{headers:['release_id','annual_display_allowed','temporal_notice'],values:()=>[c.release,true,annualNotice]})}/></div><div className="table-scroll"><table className="data-table annual-table"><thead><tr><th>区分</th><th>{c.measure==='rate'?'受診者に占める割合（%）':'報告人数（人）'}</th><th>報告人数／受診者数（人）</th><th>掲載年度</th><th>年度間比較</th></tr></thead><tbody>{rows.map(r=>{const rate=r.derivation??r.derived_rate!;const cat=group.categories.find(x=>x.indicator_id===r.indicator_id)!;return <tr key={r.record_id}><th><CategoryIcon group={group} category={cat}/>{cat.label}</th><td>{formatValue(r.value,r.unit)}{r.unit}</td><td>{format(rate.numerator_value)} / {format(rate.denominator_value)}</td><td>{r.publication_fiscal_year}年度</td><td>確認中（pending）</td></tr>;})}</tbody></table></div><p className="footnote">3区分合計＝原表の合計＝受診者数。{annualNotice}</p><SourceLink c={c} rows={rows}/>
 <svg ref={ref} className="export-only" aria-hidden="true" viewBox={`0 0 1100 ${130+rows.length*68}`}><rect width="1100" height="500" fill="white"/><text x="24" y="30" {...svgText} fontSize="20">{nameFor(c,code)} / {group.name} / {c.year}年度</text><text x="24" y="58" {...svgText} fontSize="14">{annualNotice}</text>{rows.map((r,i)=>{const rate=r.derivation??r.derived_rate!;return <text key={r.record_id} x="24" y={105+i*68} {...svgText} fontSize="18">{group.categories.find(cat=>cat.indicator_id===r.indicator_id)?.label}　{formatValue(r.value,r.unit)}{r.unit}　報告人数 {format(rate.numerator_value)}／受診者数 {format(rate.denominator_value)}人　掲載 {r.publication_fiscal_year}年度</text>;})}</svg></ExportSurface>;
}
export function AnnualViews({c,onSelect}:{c:Context;onSelect:(code:string)=>void}) {
 const group=visualGroup(c.data.indicator_groups![0]);
 const [layout,setLayout]=useState<Layout>('side');
 const valid=c.regions.every(code=>annualComposition(c.data,group,code,c.year));
 const categories=group.categories.filter(cat=>c.group||cat.indicator_id===c.indicator.indicator_id);
 if(!valid)return <p role="alert">単年度構成の検証が一致しないため、表示を停止しました。</p>;
 return <><p className="annual-notice">{annualNotice} 年度の選択は個別閲覧です。経年差・前年差・経年グラフは生成しません。<a href={appUrl('/learn/')+(c.review?'?review=1':'')}>分類の違いを確認</a></p>{c.group&&<CompositionOverview c={c} group={group}/>}
 <DeferredSection id="map"><div className="section-heading"><span className="number">{c.group?'02':'01'}</span><h2>地図で見る</h2><p>{c.year}年度・単年度表示</p></div><MapNotes measure={c.measure}/>{c.regions.length===2&&<LayoutToggle section="地図・単年度表" value={layout} onChange={setLayout}/>}{categories.map(cat=>{const context={...c,indicator:c.data.indicators.find(i=>i.indicator_id===cat.indicator_id)!};const scope='annual-map-'+cat.category_id;return <div key={cat.category_id} id={scope}><h3><CategoryIcon group={group} category={cat}/>{cat.label}</h3><ComparisonActions c={context} kind="map" layout={layout} mapScope={'#'+scope}/><div className={`comparison-panels ${c.regions.length>1?layout:'single'}`}>{c.regions.map(code=><MapPanel key={code} c={context} region={code} onSelect={onSelect} showNotes={false}/>)}</div><div className={`comparison-panels ${c.regions.length>1?layout:'single'}`}>{c.regions.map(code=><Insight key={code} c={context} code={code} map/>)}</div></div>;})}</DeferredSection>
 <DeferredSection id="table"><div className="section-heading"><span className="number">{c.group?'03':'02'}</span><h2>表で見る</h2><p>{c.year}年度のみ</p></div><div className={`comparison-panels ${c.regions.length>1?layout:'single'}`}>{c.regions.map(code=><AnnualTable key={code} c={c} group={group} code={code}/>)}</div></DeferredSection></>;
}
