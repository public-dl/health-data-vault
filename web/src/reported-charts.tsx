import React,{useEffect,useRef,useState} from 'react';
import {ExportSurface} from './export-surface';
import {Actions,SourceLink,nameFor,type Context} from './panels';
import {formatValue,type Observation,type Indicator} from './model';
import {healthThemes} from './health-themes';
import {chartRecords,chartMax,chartCsv,municipalityDistribution,chartPending} from './reported-chart-model';
import './reported-charts.css';

const pct=(v:number|null|undefined)=>v==null?'欠損':formatValue(v,'%')+'%';
const color=(i:Indicator)=>i.color??'#24486c';
function ChartCard({c,title,rows,children}:{c:Context;title:string;rows:Observation[];children:React.ReactNode}){
 const ref=useRef<SVGSVGElement>(null);
 return <ExportSurface kind="graph-card" className="panel reported-chart-card"><div className="panel-heading"><h3>{title}</h3><Actions c={c} svg={ref} rows={rows} title={title} table csvText={chartCsv(rows,c.data.indicators,c.release)}/></div><div className="reported-chart-body">{children}<p className="chart-pending">{chartPending}</p><SourceLink c={c} rows={rows}/><svg ref={ref} className="export-only" aria-hidden="true"/></div></ExportSurface>;
}
function AnnualChart({c,indicator}:{c:Context;indicator:Indicator}){
 const rows=chartRecords(c.data.records,indicator.indicator_id).filter(r=>c.regions.includes(r.geography_code));
 const years=[...c.data.years].sort((a,b)=>a-b),max=indicator.chart_max??chartMax[indicator.indicator_id];
 const x=(year:number)=>70+(years.length===1?.5:years.indexOf(year)/(years.length-1))*460,y=(value:number)=>235-value/max*185;
 const series=c.regions.map((code,index)=>({code,index,rows:rows.filter(r=>r.geography_code===code).sort((a,b)=>a.observation_fiscal_year-b.observation_fiscal_year),county:c.data.geographies.find(g=>g.code===code)?.level==='prefecture_total'}));
 return <ChartCard c={c} title={indicator.name+' · 年度別実績値'} rows={rows}>
  <p className="chart-axis-description">{indicator.rate?.label??'特定健診受診者に占める割合（%）'} · 固定軸 0～{max}%</p>
  <div className="chart-series-legend">{series.map(s=><span key={s.code}><i style={{borderColor:color(indicator),borderTopStyle:s.county?'dashed':'solid'}}/>{s.county?'○':s.index===0?'◇':'□'} {nameFor(c,s.code)}</span>)}</div>
  <div className="chart-scroll table-scroll"><svg className="reported-chart-svg" viewBox="0 0 600 290" role="img" aria-label={indicator.name+' 年度別実績値（比較可能性確認中）'} data-chart="annual" data-indicator={indicator.indicator_id} data-y-domain={`0,${max}`}>
   {[0,max/2,max].map(v=><g key={v}><line x1="70" x2="530" y1={y(v)} y2={y(v)} stroke="#dce6ef"/><text x="59" y={y(v)+5} textAnchor="end">{v}%</text></g>)}
   {years.map(yr=><text key={yr} x={x(yr)} y="270" textAnchor="middle">{yr}年度</text>)}
   {series.map(s=><g key={s.code} fill={color(indicator)} stroke={color(indicator)}>{s.rows.map((r,j)=>{const prev=s.rows[j-1],v=r.value;if(v==null)return null;const tooltip=`${indicator.name} / 特定健診受診者に占める割合 / ${nameFor(c,s.code)}・${r.observation_fiscal_year}年度：${pct(v)}`;return <g key={r.record_id}>
    {prev?.value!=null&&r.observation_fiscal_year===prev.observation_fiscal_year+1&&<line data-annual-reference-link="true" x1={x(prev.observation_fiscal_year)} y1={y(prev.value)} x2={x(r.observation_fiscal_year)} y2={y(v)} strokeWidth="2" strokeDasharray={s.county?'7 5':undefined}/>}
    <g tabIndex={0} role="img" aria-label={tooltip}><title>{tooltip}</title>{s.county?<circle cx={x(r.observation_fiscal_year)} cy={y(v)} r="5" fill="white" strokeWidth="2"/>:s.index===0?<path d={`M${x(r.observation_fiscal_year)} ${y(v)-6}l6 6-6 6-6-6z`}/>:<rect x={x(r.observation_fiscal_year)-5} y={y(v)-5} width="10" height="10"/>}</g>
   </g>;})}</g>)}
  </svg></div>
  <div className="table-scroll"><table className="chart-values"><caption className="sr-only">各ポイントの正確な表示値</caption><thead><tr><th>地域</th>{years.map(yr=><th key={yr}>{yr}年度</th>)}</tr></thead><tbody>{series.map(s=><tr key={s.code}><th>{nameFor(c,s.code)}</th>{years.map(yr=><td key={yr}>{pct(s.rows.find(r=>r.observation_fiscal_year===yr)?.value)}</td>)}</tr>)}</tbody></table></div>
  <p className="chart-note">線は年度ごとの点を結ぶ参照線です。中間時点の実測値や、変化の評価を示しません。</p>
 </ChartCard>;
}
export function DistributionChart({c,indicator}:{c:Context;indicator:Indicator}){
 const records=chartRecords(c.data.records,indicator.indicator_id),dist=municipalityDistribution(records,c.year),scale=indicator.map_scale;
 const county=c.data.geographies.find(g=>g.level==='prefecture_total')?.code;
 const refs=[...new Set([county,...c.regions].filter((s):s is string=>!!s))].map(code=>records.find(r=>r.geography_code===code&&r.observation_fiscal_year===c.year)).filter((r):r is Observation=>!!r);
 const stats=['最小値','第1四分位点','中央値','第3四分位点','最大値'];
 const [min,q1,median,q3,high]=dist.values;
 // The distribution shares the map's fixed domain; never fit it to the selected data.
 if(!scale||scale.max<=scale.min)return <p>分布表示の固定尺度を確認できません。</p>;
 const x=(v:number)=>80+(v-scale.min)/(scale.max-scale.min)*740;
 const rawStep=(scale.max-scale.min)/3,power=10**Math.floor(Math.log10(rawStep));
 const step=([1,2,5,10].find(n=>n*power>=rawStep)??10)*power;
 const ticks=[scale.min,...Array.from({length:Math.ceil((scale.max-scale.min)/step)},(_,j)=>(Math.floor(scale.min/step)+j+1)*step).filter(v=>v>scale.min&&v<scale.max),scale.max];
 // Separate reference-label lanes avoid collisions even when two values coincide.
 const axisY=185+refs.length*48;
 return <ChartCard c={c} title={indicator.name+` · 市町村の分布（${c.year}年度）`} rows={[...dist.rows,...refs.filter(r=>r.geography_level==='prefecture_total')]}>
  <p className="chart-axis-description">{indicator.rate?.label??'特定健診受診者に占める割合（%）'} · 有効{dist.count}／{dist.total}市町村 · 固定軸 {scale.min}～{scale.max}%</p>
  <div className="chart-scroll table-scroll"><svg className="reported-chart-svg distribution-figure" viewBox={`0 0 900 ${axisY+45}`} role="img" aria-label={`${indicator.name} ${c.year}年度 市町村分布`} data-chart="distribution" data-x-domain={`${scale.min},${scale.max}`}>
   {ticks.map(v=><g key={v}><line x1={x(v)} x2={x(v)} y1="38" y2={axisY} stroke="#e8eef4" strokeWidth=".7" vectorEffect="non-scaling-stroke"/><line x1={x(v)} x2={x(v)} y1={axisY} y2={axisY+5} stroke="#9bafc2" strokeWidth="1" vectorEffect="non-scaling-stroke"/><text x={x(v)} y={axisY+27} textAnchor="middle">{v}%</text></g>)}
   <line x1="80" x2="820" y1={axisY} y2={axisY} stroke="#9bafc2" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
   {min!=null&&q1!=null&&median!=null&&q3!=null&&high!=null&&<g stroke={color(indicator)} fill="none">
    <path d={`M${x(min)} 70H${x(q1)}M${x(q3)} 70H${x(high)}M${x(min)} 57v26M${x(high)} 57v26`} strokeWidth="1.1" vectorEffect="non-scaling-stroke"/>
    <rect x={x(q1)} y="48" width={Math.max(.5,x(q3)-x(q1))} height="44" fill={color(indicator)} fillOpacity=".10" strokeWidth="1.2" vectorEffect="non-scaling-stroke"/>
    <line x1={x(median)} x2={x(median)} y1="48" y2="92" strokeWidth="1.7" vectorEffect="non-scaling-stroke"/>
   </g>}
   {dist.rows.filter(r=>r.value!=null).map((r,j)=><circle key={r.record_id} data-municipality-dot={r.geography_code} cx={x(r.value!)} cy={111+(j%3-1)*4} r="3.5" fill="var(--distribution-municipality)" fillOpacity=".32"><title>{indicator.name+' / 特定健診受診者に占める割合 / '+nameFor(c,r.geography_code)+'：'+pct(r.value)}</title></circle>)}
   {refs.map((r,j)=>{if(r.value==null)return null;const countyRef=r.geography_level==='prefecture_total',px=x(r.value),labelY=160+j*48,referenceColor=countyRef?'var(--distribution-county)':'var(--distribution-selected)';return <g key={r.record_id} tabIndex={0} role="img" aria-label={`${nameFor(c,r.geography_code)} ${pct(r.value)}`} data-distribution-reference={countyRef?'county':'selected'}>
    <title>{indicator.name+' / 特定健診受診者に占める割合 / '+nameFor(c,r.geography_code)+'：'+pct(r.value)}</title>
    <line x1={px} x2={px} y1="121" y2={labelY-17} stroke={referenceColor} strokeOpacity=".3" strokeWidth=".8" strokeDasharray="3 3" vectorEffect="non-scaling-stroke"/>
    {countyRef?<path d={`M${px} 102l5 5-5 5-5-5z`} fill={referenceColor}/>:<circle cx={px} cy="117" r="5" fill="white" stroke={referenceColor} strokeWidth="1.7" vectorEffect="non-scaling-stroke"/>}
    <text className="distribution-reference-label" style={{fill:referenceColor}} stroke="white" strokeWidth="4" paintOrder="stroke" x={px} y={labelY} textAnchor={px<180?'start':px>720?'end':'middle'}>{countyRef?'◆':'○'} {nameFor(c,r.geography_code)}</text>
    <text className="distribution-reference-label" style={{fill:referenceColor}} stroke="white" strokeWidth="4" paintOrder="stroke" x={px} y={labelY+21} textAnchor={px<180?'start':px>720?'end':'middle'} fontWeight="600">{pct(r.value)}</text>
   </g>;})}
  </svg></div>
  <div className="distribution-references" aria-label="分布図の凡例"><span><b style={{color:'var(--distribution-municipality)',opacity:.32}}>●</b> 各市町村</span>{refs.some(r=>r.geography_level==='municipality'&&r.value!=null)&&<span><b style={{color:'var(--distribution-selected)'}}>○</b> 選択市町村</span>}<span><b style={{color:'var(--distribution-county)'}}>◆</b> 新潟県（県計）</span></div>
  <dl className="distribution-stats">{stats.map((label,j)=><div key={label}><dt>{label}</dt><dd>{pct(dist.values[j])}</dd></div>)}</dl>
  {refs.some(r=>r.value==null)&&<p className="chart-note">{refs.filter(r=>r.value==null).map(r=>nameFor(c,r.geography_code)+'：欠損').join(' ／ ')}</p>}
  <p className="chart-note">箱は市町村分布の四分位範囲を示しており、医学的な基準範囲ではありません。ひげは最小値～最大値。県計を除く市町村のみを、人数で加重せず集計しています。四分位点は丸め前の値を線形補間しています。</p>
 </ChartCard>;
}
function IndicatorBars({c,indicators,code}:{c:Context;indicators:Indicator[];code:string}){
 const rows=indicators.flatMap(i=>chartRecords(c.data.records,i.indicator_id)).filter(r=>r.geography_code===code&&r.observation_fiscal_year===c.year);
 return <ChartCard c={c} title={`${indicators[0]?.theme_label??c.indicator.theme_label}${indicators.length}項目 · ${nameFor(c,code)} · ${c.year}年度`} rows={rows}>
  <p className="chart-axis-description">特定健診受診者に占める割合（%） · 共通軸 0～100%</p>
  <div className="chart-scroll table-scroll"><svg className="reported-chart-svg" viewBox="0 0 600 360" role="img" aria-label={`${indicators[0]?.theme_label??c.indicator.theme_label}${indicators.length}項目の独立した棒グラフ`} data-chart="independent-bars">
   {[0,25,50,75,100].map(v=><g key={v}><line x1={210+v*3.1} x2={210+v*3.1} y1="25" y2="300" stroke="#e3ecf3"/><text x={210+v*3.1} y="330" textAnchor="middle">{v}%</text></g>)}
   {indicators.map((i,j)=>{const r=rows.find(r=>r.indicator_id===i.indicator_id);return <g key={i.indicator_id}><text x="200" y={54+j*53} textAnchor="end" aria-label={i.name}><title>{i.name}</title>{i.short_label??i.name}</text>{r?.value!=null&&<rect x="210" y={35+j*53} width={r.value*3.1} height="26" fill={color(i)}/>}<text x={218+(r?.value??0)*3.1} y={54+j*53}>{pct(r?.value)}</text></g>;})}
  </svg></div>{indicators.some(i=>i.semantic_key)&&<div className="chart-note" aria-label="指標の正式名称">{indicators.map(i=><p key={i.indicator_id}>{i.name}</p>)}</div>}<p className="chart-note">各項目は排他的な構成ではなく、合計して100%になるものではありません。</p>
 </ChartCard>;
}
export function ReportedCharts({c}:{c:Context}){
 const theme=healthThemes.find(t=>t.indicatorIds.includes(c.indicator.indicator_id));
 const indicators=(theme?.indicatorIds??[]).map(id=>c.data.indicators.find(i=>i.indicator_id===id)).filter((i):i is Indicator=>!!i&&!!i.rate&&(i.chart_max??chartMax[i.indicator_id])!=null);
 const [selected,setSelected]=useState(c.indicator.indicator_id);
 useEffect(()=>setSelected(c.indicator.indicator_id),[c.indicator.indicator_id]);
 const distribution=indicators.find(i=>i.indicator_id===selected)??indicators[0];
 if(!distribution)return <p>グラフに必要な検証済み割合を確認できません。</p>;
 return <div className="reported-charts"><p className="annual-notice">{chartPending}</p><details className="chart-guide"><summary>グラフの見方</summary><p>特定健診受診者に占める割合（%）を表示します。医学的判定区分を示すものではありません。改善・悪化の評価は行いません。同じ指標では年度・地域を変更しても固定の表示尺度を使用します。04は表示値の選択にかかわらず割合を表示します。</p></details>
 <p className="footnote">割合の公開が許可された項目のみ表示しています。</p><div className="reported-chart-grid">{indicators.map(i=><AnnualChart key={i.indicator_id} c={c} indicator={i}/>)}</div>
 <div className="chart-distribution-heading"><h3>市町村の分布</h3><label>分布を見る指標 <select disabled={indicators.length===1} aria-label="分布を見る指標" value={distribution.indicator_id} onChange={e=>setSelected(e.target.value)}>{indicators.map(i=><option key={i.indicator_id} value={i.indicator_id}>{i.name}</option>)}</select></label></div>
 <DistributionChart c={c} indicator={distribution}/>
 {theme?.independentComparison&&<><h3>指標間の比較 · {c.year}年度</h3><div className="reported-chart-grid">{c.regions.map(code=><IndicatorBars key={code} c={c} code={code} indicators={indicators}/>)}</div></>}
 </div>;
}
