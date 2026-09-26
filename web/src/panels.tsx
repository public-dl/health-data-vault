import {previousYearComment,refreshTemporalComment} from './temporal-comment';
import {mapFill} from './map-scale';
import {MapLegend} from './map-legend';
import {ExportSurface,exportSurfaceFor} from './export-surface';
import {DataNotes} from './data-notes';
import {isReportedSchema,regionalRateDifference} from './reported-model';
import {localMapText} from './map-notes';
import React, {useEffect,useId,useMemo,useRef,useState} from 'react';
import {geoMercator,geoPath} from 'd3-geo';
import type {Payload,Indicator,Observation,IndicatorGroup} from './model';
import {format,formatValue,colors,colorFor,connect,csv} from './model';
import {save,cardsPng,outputPng} from './export';
import {TemporalTable,temporalTable} from './temporal-table';
import {MapSummary} from './map-summary';
import {CategoryIcon} from './pictograms';
import {indicatorVisual,indicatorColorAliases,categorySeries,dataBarMaximum} from './visual-metadata';
import {regionRows,toggleSeries,axisMaximum,difference,placeLabels} from './comparison';
export type Context = {annualValues?:boolean;reportedMembers?:string[];hasPublishedTables?:boolean;palette?:string[];group?:IndicatorGroup;measure:'count'|'rate';data:Payload; indicator:Indicator; year:number; regions:string[]; release:string; review:boolean; notify:(s:string)=>void; source:(rows:Observation[])=>void};
function IndicatorBadge({c}:{c:Context}) {
 const resolved=indicatorVisual(c.data.indicator_groups,c.indicator.indicator_id);
 return resolved?<span className="indicator-badge"><CategoryIcon group={resolved.group} category={resolved.category}/>{resolved.category.label}</span>:indicatorColorAliases[c.indicator.indicator_id]?<span className="indicator-badge" style={{color:c.indicator.color}}>{c.indicator.name}</span>:null;
}
export const rowsFor=(c:Context,code:string)=>regionRows(c.data.records,c.indicator.indicator_id,code);
export const nameFor=(c:Context,code:string)=>c.data.geographies.find(g=>g.code===code)?.name ?? code;
export const measureLabel=(c:Context)=>c.measure==='rate'?(c.indicator.rate?.label??'受診者に占める割合（%）'):'報告人数（人）';
export const svgText={fill:'#26364e',fontFamily:'sans-serif'};

export function Actions({c,svg,rows,title,table=false,label,csvText}:{c:Context;svg:React.RefObject<SVGSVGElement|null>;rows:Observation[];title:string;table?:boolean;label?:string;csvText?:string}) {
  const act=async(kind:string)=>{
    try {
      if(kind==='csv') {save(new Blob([csvText??csv(rows,c.indicator.name,{headers:['release_id','health_theme','rate_label'],values:r=>[c.release,c.indicator.theme_label,c.indicator.rate?.label]})],{type:'text/csv;charset=utf-8'}),`${title}.csv`);c.notify('CSVを保存しました');return;}
      if(!svg.current)throw new Error('図表を準備できません');
      const blob=cardsPng([exportSurfaceFor(svg.current)],'side');
      await outputPng(blob,kind==='copy'?'copy':'png',`${title}.png`);c.notify(kind==='copy'?'画像をコピーしました':'PNGを保存しました');
    }catch(e){c.notify('操作できませんでした：'+(e instanceof Error?e.message:String(e)));}
  };
  return <div className="actions"><button onClick={()=>act('copy')} aria-label={`${title}をコピー`}>▣ <span>コピー</span></button>{table&&<button onClick={()=>act('csv')}>↓ CSV</button>}<button onClick={()=>act('png')} aria-label={`${title}をPNG保存`}>↓ PNG保存</button></div>;
}
export function SourceLink({c,rows}:{c:Context;rows:Observation[]}) {return <button className="source-link" onClick={()=>c.source(rows)}>ⓘ このデータの諸元・出典を確認</button>;}
export function Insight({c,code,map=false}:{c:Context;code:string;map?:boolean}) {
  const result=c.data.insights.find(i=>(i.measure??'count')===c.measure&&i.indicator_id===c.indicator.indicator_id&&i.geography_code===code&&i.observation_fiscal_year===c.year);
  const text=refreshTemporalComment(result?.text ?? '説明は準備中です。',rowsFor(c,code),c.year);
  return <DataNotes group={!map}><p>{map?localMapText(text):text}</p>{!map&&<small>{map?(c.measure==='rate'?'色は受診者に占める割合です。年齢・性別構成を調整していません。':'色は報告人数の大小です。受診者の規模に左右されます。'):'対象年度：'+c.data.years.join('・')+'年度。'+(isReportedSchema(c.data.schema_version)?'年度間比較はpendingです。':'割合は年齢・性別構成を調整していません。')}</small>}</DataNotes>;
}
export function MapPanel({c,region,onSelect,compact=false,highlightRegion,onHighlightRegion,showNotes=true}:{c:Context;region:string;onSelect:(s:string)=>void;compact?:boolean;showNotes?:boolean;highlightRegion?:string;onHighlightRegion?:(code:string)=>void}) {
  const code=c.data.geographies.find(g=>g.code===region)?.level==='municipality'?region:undefined;
  const ref=useRef<SVGSVGElement>(null);const [localHover,setLocalHover]=useState('');const hover=highlightRegion??localHover;const setHover=(id:string)=>{setLocalHover(id);onHighlightRegion?.(id);};const palette=c.palette??(indicatorVisual(c.data.indicator_groups,c.indicator.indicator_id)?.visual??indicatorColorAliases[c.indicator.indicator_id])?.palette??colors;const [zoom,setZoom]=useState(1);
  const scale=c.measure==='rate'?c.indicator.map_scale:undefined;
  const patternId=useId().replaceAll(':','');
  const query=compact?'(max-width:1099px)':'(max-width:700px)';
  const [narrow,setNarrow]=useState(window.matchMedia(query).matches);
  useEffect(()=>{const m=window.matchMedia(query);const update=()=>setNarrow(m.matches);update();m.addEventListener('change',update);return()=>m.removeEventListener('change',update);},[query]);
  const projection=useMemo(()=>geoMercator().fitExtent([[60,70],[620,445]],c.data.map),[c.data.map]);
  const path=useMemo(()=>geoPath(projection),[projection]);
  const title=code?nameFor(c,code)+'（県内での位置）':`新潟県 全${c.data.map.features.length}市町村の分布`;
  const rows=c.data.records.filter(r=>r.indicator_id===c.indicator.indicator_id&&r.observation_fiscal_year===c.year&&r.geography_level==='municipality');
  const values=new Map(rows.map(r=>[r.geography_code,r]));
  const selected=rowsFor(c,region).find(r=>r.observation_fiscal_year===c.year);
  const selectedLabel=`${nameFor(c,region)}：${formatValue(selected?.value,c.indicator.unit)}${selected?.value==null?'':c.indicator.unit}`;
  const info=hover?values.get(hover):undefined;
  return <ExportSurface kind="map-card" className="panel map-card"><div className="panel-heading map-card-heading"><div><span className="eyebrow">{code?'SELECTED MUNICIPALITY':'NIIGATA PREFECTURE'}</span><h3 className="map-region-title">{title}{!code&&`（${c.year}年）`}</h3><IndicatorBadge c={c}/></div><MapSummary record={selected} measure={c.measure} rateLabel={c.indicator.rate?.label} recipientLabel={c.indicator.recipient_label} color={(indicatorVisual(c.data.indicator_groups,c.indicator.indicator_id)?.visual??indicatorColorAliases[c.indicator.indicator_id])?.color}/><Actions c={c} svg={ref} rows={rows} title={`${title}_${c.year}年度`}/></div>
    <div className={showNotes?"panel-body":"panel-body map-only-body"}><div><div className="map-shell"><h4 className="map-inner-title">{c.indicator.name} / {c.year}年度</h4><div className="map-viewport"><div className="zoom"><button aria-label="地図を拡大" disabled={zoom>=1.4} onClick={()=>setZoom(z=>Math.min(1.4,z+.2))}>＋</button><button aria-label="地図をリセット" onClick={()=>setZoom(1)}>↺</button></div>
      <svg ref={ref} viewBox={narrow?'0 50 680 410':'0 0 960 510'} data-indicator={c.indicator.indicator_id} data-year={c.year} data-unit={c.indicator.unit} data-breaks={JSON.stringify(scale?[]:c.indicator.map_breaks)} data-map-scale={JSON.stringify(scale??null)} data-export-viewbox="0 0 960 510" className="map" aria-label={`${title} ${c.indicator.name} ${c.year}年度`}>
        <defs><pattern id={patternId} width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#f1f5f9"/><path d="M0 8L8 0" stroke="#94a3b8"/></pattern></defs>
        <rect width="960" height="510" fill="#f3f8fe"/><text className="map-annotation map-export-title" x="26" y="32" {...svgText} fontSize="18">{c.indicator.name} / {c.year}年度</text>
        <g transform={`translate(${340*(1-zoom)},${265*(1-zoom)}) scale(${zoom})`}>
          {c.data.map.features.map(f=>{const id=f.properties.code;const r=values.get(id);return <path key={id} d={path(f)??''} fill={mapFill(r?.value,palette,c.indicator.map_breaks,scale)??`url(#${patternId})`} stroke={code===id||hover===id?'#092d68':'#fff'} strokeWidth={code===id||hover===id?2.4:.65} data-geography={id} data-highlighted={hover===id} opacity={code&&id!==code&&hover!==id?0.32:1} tabIndex={0} role="button" aria-label={`${c.indicator.public_label?c.indicator.public_label+' / ':''}${f.properties.name} ${formatValue(r?.value,c.indicator.unit)}${r?.value==null?'':c.indicator.unit}`} onMouseEnter={()=>setHover(id)} onMouseLeave={()=>setHover('')} onFocus={()=>setHover(id)} onBlur={()=>setHover('')} onClick={()=>onSelect(id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(id);}}}><title>{c.indicator.public_label&&<>{c.indicator.public_label} / </>}{f.properties.name}：{formatValue(r?.value,c.indicator.unit)}{r?.value==null?'':c.indicator.unit}</title></path>;})}
        </g>

        <text data-region-value={region} className="map-annotation" x="26" y="474" {...svgText} fontSize="15">{selectedLabel}</text>
        <text className="map-annotation" x="380" y="474" {...svgText} fontSize="13">{info?`参照：${info.geography_name} ${formatValue(info.value,info.unit)}${info.value==null?'':info.unit}`:''}</text><text className="map-annotation" x="26" y="498" {...svgText} fontSize="11">国土数値情報 行政区域（2023-01-01）を加工。年度別境界の変化は未検証。</text>
      </svg></div><MapLegend title={measureLabel(c)} breaks={c.indicator.map_breaks} palette={palette} scale={scale}/></div>{narrow&&<div className="mobile-legend"><strong data-region-value={region}>{selectedLabel}</strong><small>2023-01-01時点の参考境界。年度別の境界変化は未検証。</small></div>}<SourceLink c={c} rows={code?rows.filter(r=>r.geography_code===code):[...rowsFor(c,region).filter(r=>r.observation_fiscal_year===c.year),...rows]}/></div>{showNotes&&<Insight c={c} code={region} map/>}</div>
    {code&&<p className="footnote">選択市町村を濃く強調しています。市町村内の地区別データはありません。</p>}
  </ExportSurface>;
}
export function TablePanel({c,code}:{c:Context;code:string}) {
  const model=temporalTable(rowsFor(c,code),c.year,c.measure),rows=model.records,ref=useRef<SVGSVGElement>(null),title=nameFor(c,code);
  const visual=(indicatorVisual(c.data.indicator_groups,c.indicator.indicator_id)?.visual??indicatorColorAliases[c.indicator.indicator_id]);
  const barMax=dataBarMaximum(c.measure,c.regions.flatMap(region=>rowsFor(c,region).map(r=>r.value)));
  const notes:Record<number,string>={};
  if(c.measure==='rate'&&c.regions.length>1)for(const r of rows){const d=(r.regional_difference_allowed?regionalRateDifference:difference)(rowsFor(c,c.regions[0]).find(a=>a.observation_fiscal_year===r.observation_fiscal_year),r);notes[r.observation_fiscal_year]=code===c.regions[0]?'比較の基準':d==null?`${nameFor(c,c.regions[0])}との差：算出不可`:`${nameFor(c,c.regions[0])}との差 ${d>=0?'+':''}${d.toFixed(1)}ポイント`;}
  const cellWidth=190,exportWidth=300+model.columns.length*cellWidth,exportHeight=110+model.rows.length*75;
  return <ExportSurface kind="table-card" className="panel group-table"><div className="panel-heading"><h3>{title}</h3><Actions c={c} svg={ref} rows={rows} title={`${title}_${isReportedSchema(c.data.schema_version)&&!c.annualValues?c.year+'年度_単年度表':'年度別実績表'}`} table/></div><div className="group-table-body"><div><div className="table-scroll"><TemporalTable model={model} year={c.year} caption={<>{!indicatorColorAliases[c.indicator.indicator_id]&&<IndicatorBadge c={c}/>}<span className="category-color-mark" style={{background:visual?.color}} aria-hidden="true"/>{c.indicator.name} / {isReportedSchema(c.data.schema_version)&&c.indicator.rate?c.indicator.rate.label:measureLabel(c)}</>} bar={visual?{color:visual.color,max:barMax}:undefined} notes={notes}/></div>{visual&&<p className="data-bar-note">補助バー：{c.measure==='rate'?'0〜100%の共通尺度':'選択地域・全年度の最大報告人数を共通の上限に使用'}。数値を優先して確認してください。</p>}<SourceLink c={c} rows={rows}/>
    <svg ref={ref} className="export-only" aria-hidden="true" viewBox={`0 0 ${exportWidth} ${exportHeight}`}><rect width={exportWidth} height={exportHeight} fill="#fff"/><text x="24" y="30" {...svgText} fontSize="20">{title} / {c.indicator.name}</text><text x="24" y="75" {...svgText} fontWeight="700" fontSize="15">項目</text>{model.columns.map((year,j)=><text key={year} x={300+(j+.5)*cellWidth} y="75" {...svgText} fontSize="16" fontWeight="700" textAnchor="middle">{year}年度</text>)}{model.rows.map((row,i)=><g key={row.id}><rect x="16" y={95+i*75} width={exportWidth-32} height="74" fill={i%2?'#fff':'#f1f6fc'}/><text x="24" y={135+i*75} {...svgText} fontSize="12" fontWeight="700">{row.label}</text>{row.cells.map((cell,j)=><text key={cell.year} x={300+(j+.5)*cellWidth} y={135+i*75} {...svgText} fontSize="16" fontWeight="400" textAnchor="middle">{cell.text}</text>)}</g>)}</svg>
    </div><Insight c={c} code={code}/></div></ExportSurface>;
}

const seriesStyles=[{color:'#163b80',dash:undefined},{color:'#16816f',dash:'8 5'},{color:'#97549b',dash:'3 4'},{color:'#a4631e',dash:'12 4 3 4'},{color:'#54616f',dash:'2 3'}];
export function GraphPanel({c}:{c:Context}) {
  const [visible,setVisible]=useState(c.regions),ref=useRef<SVGSVGElement>(null);
  const visual=(indicatorVisual(c.data.indicator_groups,c.indicator.indicator_id)?.visual??indicatorColorAliases[c.indicator.indicator_id]);
  const styles=visual?categorySeries(visual):seriesStyles;
  const all=c.regions.map((code,index)=>({code,index,rows:rowsFor(c,code)}));
  const series=all.filter(s=>visible.includes(s.code)),rows=series.flatMap(s=>s.rows);
  const max=axisMaximum(all.flatMap(s=>s.rows));
  const years=c.data.years,x=(year:number)=>80+(year-years[0])/Math.max(1,years.at(-1)!-years[0])*790,y=(v:number)=>295-v/max*215;
  const title=series.map(s=>nameFor(c,s.code)).join('・')+`_${years[0]}〜${years.at(-1)}年度_推移`;
  const labels=useMemo(()=>{
    const ctx=document.createElement('canvas').getContext('2d');if(ctx)ctx.font='14px sans-serif';
    return placeLabels(series.flatMap(s=>s.rows.filter(r=>r.value!=null).map(r=>{const text=formatValue(r.value,r.unit);return {id:r.record_id,x:x(r.observation_fiscal_year),y:y(r.value!),width:(ctx?.measureText(text).width??text.length*9)+6,height:18,text,color:styles[s.index%styles.length].color};})),{left:75,top:50,right:910,bottom:306});
  },[rows.map(r=>r.record_id+':'+r.value).join('|'),max,visual]);
  const latest=series.map(s=>s.rows.find(r=>r.observation_fiscal_year===years.at(-1)));
  const delta=latest.length===2?difference(latest[0],latest[1]):null;
  return <ExportSurface kind="graph-card" className="panel"><div className="panel-heading"><div><h3>選択地域の推移</h3><IndicatorBadge c={c}/></div><Actions c={c} svg={ref} rows={rows} title={title}/></div>
    <div className="series-controls" role="group" aria-label="グラフの表示系列">{all.map(s=><label key={s.code}><input type="checkbox" checked={visible.includes(s.code)} disabled={visible.length===1&&visible.includes(s.code)} onChange={()=>setVisible(v=>toggleSeries(v,s.code))}/>{nameFor(c,s.code)}</label>)}<small>地域A：実線・丸 ／ 地域B：破線・四角。最低1系列を表示。表示切替ではY軸を変更しません。</small></div>
    <div className="panel-body"><div><div className="chart-scroll"><svg ref={ref} viewBox="0 0 960 375" className="chart" role="img" aria-label={`${title} ${c.indicator.name}`} data-axis-max={max}><rect width="960" height="375" fill="#fff"/><text x="24" y="28" {...svgText} fontSize="17">{c.indicator.name} / {measureLabel(c)}</text>
      {[0,.25,.5,.75,1].map(t=><g key={t}><line x1="80" x2="880" y1={y(max*t)} y2={y(max*t)} stroke="#e3ebf5"/><text x="65" y={y(max*t)+5} {...svgText} fontSize="12" textAnchor="end">{formatValue(c.measure==='rate'?max*t:Math.round(max*t),c.indicator.unit)}</text></g>)}
      {years.map(year=><text key={year} x={x(year)} y="324" {...svgText} fontSize="14" textAnchor="middle">{year}年度</text>)}
      {series.map((s,legendIndex)=>{const style=styles[s.index%styles.length];return <g key={s.code} data-region={s.code}>{s.rows.map((r,i)=>{const prev=s.rows[i-1];return <g key={r.record_id}>{connect(prev,r)&&<line x1={x(prev.observation_fiscal_year)} y1={y(prev.value!)} x2={x(r.observation_fiscal_year)} y2={y(r.value!)} stroke={style.color} strokeWidth="3" strokeDasharray={style.dash}/>}{r.value!=null&&(s.index%2?<rect x={x(r.observation_fiscal_year)-5} y={y(r.value)-5} width="10" height="10" fill={style.color}/>:<circle cx={x(r.observation_fiscal_year)} cy={y(r.value)} r="6" fill={style.color}/>)}</g>;})}<line x1={110+legendIndex*(800/series.length)} x2={143+legendIndex*(800/series.length)} y1="355" y2="355" stroke={style.color} strokeWidth="3" strokeDasharray={style.dash}/><text x={153+legendIndex*(800/series.length)} y="360" {...svgText} fontSize="14">{nameFor(c,s.code)}</text></g>;})}
      {labels.map(l=><g key={l.id}><line x1={l.x} y1={l.y} x2={l.left+l.width/2} y2={l.top+l.height/2} stroke={l.color} opacity=".5"/><rect x={l.left} y={l.top} width={l.width} height={l.height} fill="#fff" opacity=".94"/><text className="value-label" x={l.left+l.width/2} y={l.top+14} fontFamily="sans-serif" fill={l.color} fontSize="14" textAnchor="middle">{l.text}</text></g>)}
    </svg></div><p className="chart-scroll-hint">グラフは横にスクロールして全年度を確認できます。</p><SourceLink c={c} rows={all.flatMap(s=>s.rows)}/></div><DataNotes>{series.map(s=>{const last=s.rows.find(r=>r.observation_fiscal_year===c.year);return <p key={s.code}>{nameFor(c,s.code)}：{last?.observation_fiscal_year}年度は{formatValue(last?.value,c.indicator.unit)}{c.indicator.unit}。{previousYearComment(s.rows,c.year)}</p>;})}{delta!=null&&<p>{years.at(-1)}年度の{ nameFor(c,series[1].code)} − {nameFor(c,series[0].code)}：{delta>=0?'+':''}{formatValue(delta,c.indicator.unit)}{c.measure==='rate'?'ポイント':'人'}。</p>}<small>差は丸め前の値から算出しています。健康状態の優劣や政策効果を示しません。{c.regions.some(code=>c.data.geographies.find(g=>g.code===code)?.level==='prefecture_total')&&'県計には各市町村が含まれます。'}</small></DataNotes></div><p className="footnote">{measureLabel(c)}の推移です。欠損・比較不可の年度間は接続しません。割合は年齢・性別構成を調整していません。</p></ExportSurface>;
}

export type Layout = 'side'|'stack';
export function LayoutToggle({section,value,onChange}:{section:string;value:Layout;onChange:(value:Layout)=>void}) {
  return <div className="layout-control" role="group" aria-label={`${section}の表示レイアウト`}><span>表示</span><button aria-pressed={value==='side'} onClick={()=>onChange('side')}>左右比較</button><button aria-pressed={value==='stack'} onClick={()=>onChange('stack')}>上下表示</button><small>狭い画面では自動で上下配置</small></div>;
}
