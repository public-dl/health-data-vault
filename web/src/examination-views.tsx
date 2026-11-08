import {useModalFocus} from './modal-focus';
import {TablePeriod} from './table-period';
import {comparisonText} from './public-copy';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ExportSurface} from './export-surface';
import {Actions,MapPanel,nameFor,svgText,type Context} from './panels';
import {YearTimeline} from './year-timeline';
import {municipalityDistribution} from './reported-chart-model';
import {RegionSourceNote} from './region-hierarchy';
import type {Observation} from './model';
import {examinationCountText as count,examinationRateText as ratio,examinationLabel,examinationNotice,examinationTemporalNotice,examinationCsv,validateExaminationPayload,examinationStateCounts,examinationStateNote} from './examination-model';
import './examination.css';

function SourceDialog({c,rows,close}:{c:Context;rows:Observation[];close:()=>void}){
 const ref=useModalFocus();
 return <dialog ref={ref} aria-label="検査の分子・分母の出典" className="examination-source" onCancel={e=>{e.preventDefault();close();}}><button autoFocus onClick={close}>出典を閉じる</button><h2>検査の分子・分母と計算式</h2><p>{examinationNotice}</p><RegionSourceNote data={c.data} rows={rows}/>{rows.map(r=>{const q=r.examination_rate!;return <section key={r.record_id}><h3>{r.geography_name}・{r.observation_fiscal_year}年度</h3><p>判定区分（保健指導以上を再掲）：{count(q.numerator_value,'人')}（{r.source_sheet} {q.numerator_cell}）</p><p>実施件数：{count(q.denominator_value,'件')}（{r.source_sheet} {q.denominator_cell}）</p><p>{examinationLabel}：{ratio(r)}</p><p>計算式：判定人数 ÷ 実施件数 ×100。表示は小数第1位、計算値は丸めず保持。</p><p>県概要の公式式：{q.official_evidence.overview_sheet} {q.official_evidence.rate_cell} {q.official_evidence.formula}</p><p>刊行年度：{r.publication_fiscal_year}年度／年度間の比較：{comparisonText(r.comparability_status)}</p><a href={r.source_url} target="_blank" rel="noreferrer">公式Excel</a><p>取得日時：{r.retrieved_at}</p><code>{r.source_sha256}</code></section>})}</dialog>;
}
function SourceButton({rows,open}:{rows:Observation[];open:(r:Observation[])=>void}){return <button className="examination-source-button" onClick={()=>open(rows)}>分子・分母の出典を確認</button>}
export function FactCard({c,rows,code,open,table=false}:{c:Context;rows:Observation[];code:string;open:(r:Observation[])=>void;table?:boolean}){
 const ref=useRef<SVGSVGElement>(null),selected=rows.find(r=>r.observation_fiscal_year===c.year)!;
 const lines=table?rows.flatMap(r=>[r.observation_fiscal_year+'年度',count(r.value,'人'),count(r.examination_rate!.denominator_value,'件'),ratio(r)]):[c.year+'年度',count(selected.value,'人'),count(selected.examination_rate!.denominator_value,'件'),ratio(selected)];
 return <ExportSurface kind={table?'table-card':'summary-card'} className="panel examination-facts"><div className="panel-heading"><h3>{nameFor(c,code)}{!table&&'・'+c.year+'年度'}</h3><Actions c={c} svg={ref} rows={rows} title={c.indicator.name+'_'+nameFor(c,code)} table csvText={examinationCsv(rows,c.release)}/></div>
 {table?<><TablePeriod years={rows.map(r=>r.observation_fiscal_year)} selected={c.year}/><div className="table-scroll"><table className="data-table examination-table"><caption>{c.indicator.name}：人数・件数・割合</caption><thead><tr><th>項目</th>{rows.map(r=><th key={r.record_id} className={r.observation_fiscal_year===c.year?"selected-year":""}>{r.observation_fiscal_year}年度{r.observation_fiscal_year===c.year&&<span className="selected-year-label">選択中</span>}</th>)}</tr></thead><tbody>
 <tr><th>判定区分（保健指導以上を再掲）</th>{rows.map(r=><td key={r.record_id} className={r.observation_fiscal_year===c.year?"selected-year":""}>{count(r.value,'人')}</td>)}</tr>
 <tr><th>実施件数</th>{rows.map(r=><td key={r.record_id} className={r.observation_fiscal_year===c.year?"selected-year":""}>{count(r.examination_rate!.denominator_value,'件')}</td>)}</tr>
 <tr data-examination-metric="percentage"><th>{examinationLabel}（％）</th>{rows.map(r=><td key={r.record_id} className={r.observation_fiscal_year===c.year?"selected-year":""}>{ratio(r)}</td>)}</tr>
 <tr><th>刊行年度</th>{rows.map(r=><td key={r.record_id} className={r.observation_fiscal_year===c.year?"selected-year":""}>{r.publication_fiscal_year}年度</td>)}</tr>
 </tbody></table></div></>:<dl className="examination-values"><div><dt>判定区分（保健指導以上を再掲）</dt><dd>{count(selected.value,'人')}</dd></div><div><dt>実施件数</dt><dd>{count(selected.examination_rate!.denominator_value,'件')}</dd></div><div><dt>{examinationLabel}</dt><dd data-examination-rate>{ratio(selected)}</dd></div></dl>}
 <svg ref={ref} className="export-only" viewBox={`0 0 940 ${100+lines.length*36}`} aria-hidden="true"><rect width="940" height={100+lines.length*36} fill="white"/><text x="24" y="35" {...svgText}>{c.indicator.name}／{nameFor(c,code)}／判定人数・実施件数・割合</text>{lines.map((s,i)=><text key={i} x="24" y={80+i*36} {...svgText}>{s}</text>)}</svg>
 <p className="examination-state-note">{examinationStateNote}</p><SourceButton rows={rows} open={open}/></ExportSurface>;
}
function AnnualPoints({c,rows,open}:{c:Context;rows:Observation[];open:(r:Observation[])=>void}){
 const ref=useRef<SVGSVGElement>(null),years=c.data.years.filter(y=>y<=c.year),max=c.indicator.map_scale!.max;
 const x=(year:number)=>90+years.indexOf(year)/Math.max(1,years.length-1)*610,y=(v:number)=>245-v/max*185;
 const ecg=c.indicator.indicator_id==='ecg';
 return <ExportSurface kind="graph-card" className="panel examination-chart"><div className="panel-heading"><h3>年度別の割合（独立した点）</h3><Actions c={c} svg={ref} rows={rows} title={c.indicator.name+'_年度別'} table csvText={examinationCsv(rows,c.release)}/></div><p>{temporalNotice(c)}</p><svg ref={ref} viewBox="0 0 820 340" role="img" aria-label={c.indicator.name+' 年度別割合：線で接続しない'} data-chart="examination-annual">
 {[0,max/2,max].map(v=><g key={v}><line x1="70" x2="750" y1={y(v)} y2={y(v)} stroke="#dbe5ef"/><text x="55" y={y(v)+5} textAnchor="end">{v}％</text></g>)}
 {years.map(yr=><text key={yr} x={x(yr)} y="275" textAnchor="middle">{yr}年度</text>)}
 {ecg&&years.includes(2022)&&years.includes(2023)&&<g data-examination-break="2022_2023"><line x1={(x(2022)+x(2023))/2} x2={(x(2022)+x(2023))/2} y1="35" y2="250" stroke="#b64a55" strokeDasharray="5 5"/><text x={(x(2022)+x(2023))/2} y="25" textAnchor="middle">判定基準変更・比較不可</text></g>}
 {rows.map(r=>r.examination_rate!.value==null?<text key={r.record_id} x={x(r.observation_fiscal_year)} y="305" textAnchor="middle" fontSize="12">{ratio(r)}</text>:<g key={r.record_id}><circle data-examination-point cx={x(r.observation_fiscal_year)} cy={y(r.examination_rate!.value!)} r="6" fill={c.indicator.color} tabIndex={0}><title>{`${r.geography_name} ${r.observation_fiscal_year}年度 ${ratio(r)}：${count(r.value,'人')}／${count(r.examination_rate!.denominator_value,'件')}`}</title></circle><text x={x(r.observation_fiscal_year)} y={y(r.examination_rate!.value!)-13} textAnchor="middle">{ratio(r)}</text></g>)}
 </svg><SourceButton rows={rows} open={open}/></ExportSurface>;
}
function Distribution({c,rows,open}:{c:Context;rows:Observation[];open:(r:Observation[])=>void}){
 const ref=useRef<SVGSVGElement>(null),max=c.indicator.map_scale!.max;
 const mapped=rows.map(r=>({...r,value:r.examination_rate!.value}));const dist=municipalityDistribution(mapped,c.year),states=examinationStateCounts(rows,c.year);
 const x=(v:number)=>80+v/max*650;
 const references=rows.filter(r=>r.geography_level==='prefecture_total'||c.regions.includes(r.geography_code));
 return <ExportSurface kind="graph-card" className="panel examination-chart"><div className="panel-heading"><h3>{c.year}年度・市町村の分布</h3><Actions c={c} svg={ref} rows={rows} title={c.indicator.name+'_市町村分布'} table csvText={examinationCsv(rows,c.release)}/></div><p>{examinationLabel}。有効{dist.count}／{dist.total}市町村。県計・保健所計は分布の母集団に含めません。</p><p className="examination-state-summary" aria-label="市町村のデータ状態">欠損（原表空欄）：{states.missing}市町村 ／ 算出不可（実施件数0）：{states.zeroDenominator}市町村 ／ 有効値のうち真の0：{states.trueZero}市町村。</p><svg ref={ref} viewBox={`0 0 820 ${230+references.length*35}`} role="img" aria-label={c.indicator.name+' 同年度の市町村分布'} data-chart="examination-distribution">
 {[0,max/2,max].map(v=><g key={v}><line x1={x(v)} x2={x(v)} y1="35" y2="170" stroke="#dbe5ef"/><text x={x(v)} y="200" textAnchor="middle">{v}％</text></g>)}
 {dist.values[0]!=null&&<g stroke="#7B64C8" fill="none"><line x1={x(dist.values[0]!)} x2={x(dist.values[4]!)} y1="70" y2="70"/><rect x={x(dist.values[1]!)} y="50" width={Math.max(.5,x(dist.values[3]!)-x(dist.values[1]!))} height="40" fill="#eee8f8"/><line x1={x(dist.values[2]!)} x2={x(dist.values[2]!)} y1="50" y2="90"/></g>}
 {dist.rows.filter(r=>r.value!=null).map((r,i)=><circle key={r.record_id} data-municipality-dot={r.geography_code} cx={x(r.value!)} cy={125+(i%3-1)*6} r="4" fill={c.indicator.color} fillOpacity=".5"><title>{r.geography_name+' '+ratio(r)}</title></circle>)}
 {references.map((r,i)=><g key={r.record_id}><text x="30" y={235+i*35}>{r.geography_name+'：'+ratio(r)}</text>{r.examination_rate!.value!=null&&<path d={`M${x(r.examination_rate!.value!)} 146l5 6-5 6-5-6z`} fill={r.geography_level==='prefecture_total'?'#273e69':'#d87328'}/>}</g>)}
 </svg><p>箱は第1四分位点～第3四分位点、中央線は中央値、横線は最小～最大。点は市町村です。小さい実施件数では割合が変動しやすいため、人数・件数も併せて確認してください。</p><p className="examination-state-note">{examinationStateNote}</p><SourceButton rows={rows} open={open}/></ExportSurface>;
}

const temporalNotice=(c:Context)=>c.data.schema_version==='other-examination-1'?examinationTemporalNotice.split('心電図')[0]:examinationTemporalNotice;
export function ExaminationViews({c,onSelect,onYear}:{c:Context;onSelect:(s:string)=>void;onYear:(n:number,gesture?:string)=>void}){
 useMemo(()=>validateExaminationPayload(c.data),[c.data]);const [source,setSource]=useState<Observation[]|null>(null);
 useEffect(()=>setSource(null),[c.year]);
 const all=c.data.records.filter(r=>r.indicator_id===c.indicator.indicator_id),current=all.filter(r=>r.observation_fiscal_year===c.year),history=all.filter(r=>r.observation_fiscal_year<=c.year);
 const context={...c,source:setSource};const mapContext:Context={...context,measure:'rate',palette:c.indicator.palette,indicator:{...c.indicator,unit:'%',rate:{label:examinationLabel+'（％）',map_breaks:[],intervals:{'2021_2022':'pending','2022_2023':c.indicator.indicator_id==='ecg'?'incompatible':'pending'}}},
  data:{...c.data,records:current.map(r=>({...r,value:r.examination_rate!.value,unit:'%'}))},source:rows=>setSource(all.filter(r=>rows.some(x=>x.record_id===r.record_id)))};
 const heading=(n:string,s:string)=><div className="section-heading"><span className="number">{n}</span><h2>{s}</h2></div>;
 return <><p className="annual-notice">{examinationNotice}</p><p className="annual-notice">{temporalNotice(c)}</p>
 <section id="overview">{heading('01','検査結果をひと目で見る')}<div className="examination-grid">{c.regions.map(code=><FactCard key={code} c={context} code={code} rows={current.filter(r=>r.geography_code===code)} open={setSource}/>)}</div></section>
 <section id="map">{heading('02','地図で見る')}<p>{examinationLabel}を色で表示します。固定尺度0～{c.indicator.map_scale!.max}％。医学的な閾値ではありません。</p><div className="examination-grid">{c.regions.map(code=><div key={code}><MapPanel c={mapContext} region={code} onSelect={onSelect} showNotes={false}/><p>{current.filter(r=>r.examination_rate!.state!=='valid'&&r.geography_level===(c.data.geographies.find(g=>g.code===code)?.level==='health_center_area'?'health_center_area':'municipality')).map(r=>r.geography_name+'：'+ratio(r)).join('／')}</p></div>)}</div><YearTimeline years={c.data.years} year={c.year} playing={false} onYear={onYear} label={c.indicator.name+'の割合・単年度閲覧'}/></section>
 <section id="table">{heading('03','表で見る')}<p>{temporalNotice(c)}</p><div className="examination-grid">{c.regions.map(code=><FactCard key={code} c={context} code={code} rows={history.filter(r=>r.geography_code===code)} open={setSource} table/>)}</div></section>
 <section id="graph">{heading('04','グラフで見る')}<div className="examination-grid">{c.regions.map(code=><AnnualPoints key={code} c={context} rows={history.filter(r=>r.geography_code===code)} open={setSource}/>)}</div><Distribution c={context} rows={current} open={setSource}/></section>
 {source&&<SourceDialog c={c} rows={source} close={()=>setSource(null)}/>}</>;
}
