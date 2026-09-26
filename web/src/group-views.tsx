import {ExportSurface} from './export-surface';
import {DataNotes} from './data-notes';
import {CategoryYearTable,CategoryValue} from './category-year-table';
import {ComparisonActions} from './comparison-export';
import React,{useRef,useState} from 'react';
import type {IndicatorGroup} from './model';
import {format,formatValue} from './model';
import {Actions,Context,Insight,GraphPanel,Layout,LayoutToggle,MapPanel,SourceLink,measureLabel,nameFor,svgText} from './panels';
import {composition,groupRows,groupCsv,groupTableText,tableYears,numerator,stackSegments} from './group-model';
import {placeStackLabels,stackValueText} from './stack-labels';
import {CategoryIcon} from './pictograms';
import {groupVisuals} from './visual-metadata';
import {toggleSeries} from './comparison';
import {cardsPng,outputPng} from './export';

type GroupProps={c:Context;group:IndicatorGroup};
function categoryContext(c:Context,group:IndicatorGroup,id:string):Context {
  const category=group.categories.find(cat=>cat.category_id===id)!;
  const indicator=c.data.indicators.find(i=>i.indicator_id===category.indicator_id)!;
  return {...c,palette:groupVisuals[group.group_id]?.[id]?.palette,indicator:{...indicator,map_breaks:c.measure==='rate'?category.rate_map_breaks:category.count_map_breaks}};
}
function CategorySelect({group,value,onChange,label}:{group:IndicatorGroup;value:string;onChange:(s:string)=>void;label:string}) {
  return <label className="category-select">{label}<select value={value} onChange={e=>onChange(e.target.value)}>{group.categories.map(cat=><option key={cat.category_id} value={cat.category_id}>{cat.label}</option>)}</select></label>;
}
function GroupNotes({c,group,codes}:{c:Context;group:IndicatorGroup;codes:string[]}) {
  return <DataNotes group>{codes.map(code=>{const part=composition(c.data,group,code,c.year);return <p key={code}>{c.year}年度の{nameFor(c,code)}：{part?part.rows.map((r,i)=>`${group.categories[i].label}${formatValue(r.value,r.unit)}${r.unit}`).join('、')+'。':'構成の検証条件を満たさないため表示できません。'}</p>;})}<small>報告された受診者の構成です。年齢・性別構成は調整していません。健康状態の優劣、原因、政策効果を示すものではありません。</small></DataNotes>;
}
export function GroupMaps({c,group,layout,onLayout,onSelect,timeline}:GroupProps&{layout:Layout;onLayout:(l:Layout)=>void;onSelect:(s:string)=>void;timeline:(label:string)=>React.ReactNode}) {
  const comparing=c.regions.length===2;
  const [highlightRegion,setHighlightRegion]=useState('');
  const mapsRef=useRef<HTMLDivElement>(null);
  const region=c.regions[0];
  const exportOverview=async(copy:boolean)=>{
    try {
      const cards=Array.from(mapsRef.current?.querySelectorAll('[data-export-surface="map-card"]')??[]);
      if(cards.length!==group.categories.length)throw new Error('地図を準備できません');
      const blob=cardsPng(cards,'grid');
      await outputPng(blob,copy?'copy':'png',`${group.name}_${nameFor(c,region)}_${c.year}_全区分地図.png`);
      c.notify(copy?'全区分地図をコピーしました':'全区分地図のPNGを保存しました');
    }catch(e){c.notify('操作できませんでした：'+String(e));}
  };
  return <>

    {comparing?<><LayoutToggle section="地図" value={layout} onChange={onLayout}/><div className="category-map-matrix" aria-label="全区分・地域比較マトリクス">{group.categories.map(cat=>{const context=categoryContext(c,group,cat.category_id),id=`map-row-${group.group_id}-${cat.category_id}`;return <section key={cat.category_id} id={id} data-map-category={cat.category_id} aria-label={cat.label+'の地域比較'}><h3 className="category-heading"><CategoryIcon group={group} category={cat}/>{cat.label}</h3><ComparisonActions c={context} kind="map" layout={layout} mapScope={'#'+id}/><div className={`comparison-panels ${layout}`}>{c.regions.map((code,i)=><div key={code} data-region={code}><h4 className="map-region-heading">地域{ i===0?'A':'B'}：{nameFor(c,code)}</h4><MapPanel showNotes={false} c={context} region={code} onSelect={onSelect}/></div>)}</div>{timeline(cat.label)}<div className={`comparison-panels map-pair-notes ${layout}`}>{c.regions.map((code,i)=><div key={code}><h4 className="map-region-heading">地域{i===0?'A':'B'}：{nameFor(c,code)}</h4><Insight c={context} code={code} map/></div>)}</div></section>;})}</div></>:<><div className="actions overview-actions"><button onClick={()=>exportOverview(true)}>全区分地図をコピー</button><button onClick={()=>exportOverview(false)}>全区分地図をPNG保存</button></div><div ref={mapsRef} className="group-map-grid">{group.categories.map(cat=><div key={cat.category_id}><h3 className="category-heading"><CategoryIcon group={group} category={cat}/>{cat.label}</h3><MapPanel showNotes={false} compact highlightRegion={groupVisuals[group.group_id]?highlightRegion:undefined} onHighlightRegion={groupVisuals[group.group_id]?setHighlightRegion:undefined} c={categoryContext(c,group,cat.category_id)} region={region} onSelect={onSelect}/>{timeline(cat.label)}<div className="local-map-notes"><Insight c={categoryContext(c,group,cat.category_id)} code={region} map/></div></div>)}</div>{highlightRegion&&<p className="group-hover-summary" aria-live="polite">{nameFor(c,highlightRegion)} · {c.year}年度：{composition(c.data,group,highlightRegion,c.year)?.rows.map((r,i)=>`${group.categories[i].label} ${formatValue(r.value,r.unit)}${r.unit}`).join(' ／ ')??'表示不可'}</p>}</>}
  </>;
}

export function GroupTable({c,group,code}:GroupProps&{code:string}) {
  const years=tableYears(c.data.years,c.year),parts=years.map(year=>composition(c.data,group,code,year));
  const ref=useRef<SVGSVGElement>(null),rows=groupRows(c.data,group,[code]).filter(r=>years.includes(r.observation_fiscal_year)),title=`${nameFor(c,code)}_${group.name}_全区分表`;
  const cellWidth=180,svgWidth=180+years.length*cellWidth,height=220+group.categories.length*90;
  return <ExportSurface kind="table-card" className="panel group-table"><div className="panel-heading"><h3>{nameFor(c,code)}</h3><Actions c={c} svg={ref} rows={rows} title={title} label={group.name} table csvText={groupCsv(c.data,group,rows)}/></div>
    <div className="group-table-body"><div className="table-scroll"><CategoryYearTable years={years} selectedYear={c.year} publications={parts.map(p=>p?.rows[0].publication_fiscal_year)} caption={<>{group.name}：全区分 / {measureLabel(c)}</>}>{group.categories.map((cat,i)=><tr key={cat.category_id}><th scope="row"><CategoryIcon group={group} category={cat}/>{cat.label}</th>{years.map((year,j)=>{const part=parts[j],r=part?.rows[i];return <td key={year} className={year===c.year?'selected-year':''}>{part&&r? <CategoryValue value={r.value} unit={r.unit} count={c.measure==='rate'?numerator(r):undefined} color={groupVisuals[group.group_id]?cat.color:undefined} status={r.comparability_status==='pending'?'年度間比較は確認中':'検証済・比較可能'} label={`${nameFor(c,code)} ${year}年度 ${cat.label}の出典`} onSource={()=>c.source([r])}/>:'表示不可'}</td>;})}</tr>)}
    <tr className="composition-total"><th scope="row">受診者数（人）<small>構成検証</small></th>{years.map((year,j)=><td key={year} className={year===c.year?'selected-year':''}>{parts[j]?<><span className="supporting-count">{format(parts[j]!.denominator)}</span><small>人数合計一致</small>{c.measure==='rate'&&<small>構成合計100%</small>}</>:'保留'}</td>)}</tr></CategoryYearTable></div>
    <p className="footnote">各割合は区分人数÷同年度・同地域の受診者数×100。表示値は丸めのため合計が100.0%にならない場合があります。補正はしていません。</p><SourceLink c={c} rows={rows}/>
    <svg ref={ref} className="export-only" aria-hidden="true" viewBox={`0 0 ${svgWidth} ${height}`}><rect width={svgWidth} height={height} fill="white"/><text x="20" y="30" {...svgText} fontSize="18">{nameFor(c,code)} / {group.name}：全区分 / {measureLabel(c)}</text><text x="20" y="65" {...svgText} fontSize="14">区分</text>
    {years.map((year,j)=><g key={year}><text x={180+j*cellWidth+cellWidth/2} y="65" {...svgText} textAnchor="middle" fontSize="16">{year}年度</text><text x={180+j*cellWidth+cellWidth/2} y="84" {...svgText} textAnchor="middle" fontSize="11">公表 {parts[j]?.rows[0].publication_fiscal_year??'未確認'}年度</text></g>)}
    {group.categories.map((cat,i)=><g key={cat.category_id}><text x="20" y={125+i*90} {...svgText} fontSize="15">{cat.label}</text>{years.map((year,j)=>{const r=parts[j]?.rows[i],x=180+j*cellWidth+cellWidth/2;return <g key={year}><text x={x} y={125+i*90} {...svgText} fill="#24486c" textAnchor="middle" fontSize="18">{r?formatValue(r.value,r.unit)+r.unit:'表示不可'}</text><text x={x} y={146+i*90} {...svgText} fill="#24486c" textAnchor="middle" fontSize="18" fontWeight="600">{r?`報告人数 ${format(numerator(r))}人`:'—'}</text><text x={x} y={165+i*90} {...svgText} textAnchor="middle" fontSize="11">{r?(r.comparability_status==='pending'?'年度間比較は確認中':'検証済・比較可能'):'保留'}</text></g>;})}</g>)}
    <text x="20" y={height-70} {...svgText} fontSize="14">受診者数（人）</text>{parts.map((part,j)=><g key={years[j]}><text x={180+j*cellWidth+cellWidth/2} y={height-70} {...svgText} fill="#24486c" textAnchor="middle" fontSize="18" fontWeight="600">{part?format(part.denominator):'未確認'}</text><text x={180+j*cellWidth+cellWidth/2} y={height-48} {...svgText} textAnchor="middle" fontSize="11">{part?'人数合計一致':'保留'}</text></g>)}<text x="20" y={height-16} {...svgText} fontSize="11">割合は表示丸めのため合計100.0%にならない場合があります。補正なし。</text></svg>
    <GroupNotes c={c} group={group} codes={[code]}/></div></ExportSurface>;
}

function CompositionGraph({c,group}:GroupProps) {
  const ref=useRef<SVGSVGElement>(null),[visible,setVisible]=useState(c.regions),[highlight,setHighlight]=useState(''),[detail,setDetail]=useState({code:c.regions[0],year:c.year});
  const selected=c.regions.flatMap(code=>c.data.years.map(year=>({code,year,part:composition(c.data,group,code,year)})));
  const bars=selected.filter(b=>visible.includes(b.code));
  const max=c.measure==='rate'?100:Math.max(1,...selected.map(b=>b.part?.denominator??0))*1.1;
  const visibleCodes=c.regions.filter(code=>visible.includes(code)),rows=groupRows(c.data,group,visibleCodes);
  const title=`${group.name}_${visibleCodes.map(code=>nameFor(c,code)).join('・')}_${c.data.years[0]}〜${c.data.years.at(-1)}年度_構成`;
  const width=960,baseline=320,plotHeight=240;
  const step=840/c.data.years.length,barWidth=Math.min(72,(step-35)/c.regions.length);
  const xpos=(code:string,year:number)=>80+c.data.years.indexOf(year)*step+step/2+(c.regions.indexOf(code)-(c.regions.length-1)/2)*(barWidth+12)-barWidth/2;
  const canvas=document.createElement('canvas').getContext('2d');
  if(canvas)canvas.font='13px sans-serif';
  const labels=placeStackLabels(bars.flatMap(b=>b.part?stackSegments(b.part.rows).map((segment,i)=>{
    const text=stackValueText(segment.row.value,segment.row.unit,segment.row.value_state);
    const total=b.part!.rows.reduce((sum,r)=>sum+(r.value??0),0)/max*plotHeight;
    return {id:segment.row.record_id,barId:b.code+String(b.year),text,color:group.categories[i].color,
      bar:{left:xpos(b.code,b.year),top:baseline-total,width:barWidth,height:total},
      segmentTop:baseline-segment.end/max*plotHeight,segmentHeight:(segment.end-segment.start)/max*plotHeight,
      width:Math.ceil(canvas?.measureText(text).width??text.length*13)+8,height:22,
      side:c.regions.indexOf(b.code)===0&&c.regions.length>1?'left' as const:'right' as const};
  }):[]),{left:75,right:940,top:55,bottom:332});
  const footerShift=Math.max(0,...labels.map(l=>l.top+l.height-332));
  const height=490+bars.length*52+footerShift;
  const active=bars.find(b=>b.code===detail.code&&b.year===detail.year)??bars[0];
  return <ExportSurface kind="graph-card" className="panel"><div className="panel-heading"><h3>{group.name}：構成を見る</h3><Actions c={c} svg={ref} rows={rows} title={title} label={group.name}/></div>
    <div className="series-controls" role="group" aria-label="構成グラフの表示地域">{c.regions.map(code=><label key={code}><input type="checkbox" checked={visible.includes(code)} disabled={visible.length===1&&visible.includes(code)} onChange={()=>setVisible(v=>toggleSeries(v,code))}/>{nameFor(c,code)}</label>)}<small>地域の表示切替では軸を変更しません。</small></div>
    <div className="group-controls category-legend" role="group" aria-label="カテゴリーの強調">{group.categories.map(cat=><button key={cat.category_id} aria-pressed={highlight===cat.category_id} onClick={()=>setHighlight(h=>h===cat.category_id?'':cat.category_id)}><CategoryIcon group={group} category={cat}/><i style={{background:cat.color}}/>{cat.label}</button>)}<small>凡例は強調のみ。全カテゴリーを保持します。</small></div>
    <div className="composition-body"><div className="chart-scroll"><svg ref={ref} viewBox={`0 0 ${width} ${height}`} className="chart composition-chart" role="img" aria-label={`${title} ${measureLabel(c)}`} data-axis-max={max}><rect width={width} height={height} fill="white"/><text x="24" y="30" {...svgText} fontSize="19">{group.name}：全区分 / {measureLabel(c)}</text>
      {[0,.25,.5,.75,1].map(t=><g key={t}><line x1="70" x2="920" y1={baseline-t*plotHeight} y2={baseline-t*plotHeight} stroke="#dce6ef"/><text x="62" y={baseline-t*plotHeight+5} {...svgText} textAnchor="end" fontSize="13">{formatValue(c.measure==='rate'?max*t:Math.round(max*t),c.indicator.unit)}</text></g>)}
      {bars.map(b=><g key={b.code+b.year} data-region={b.code} data-year={b.year} tabIndex={0} role="button" aria-label={`${nameFor(c,b.code)} ${b.year}年度の全区分詳細`} onFocus={()=>setDetail({code:b.code,year:b.year})} onMouseEnter={()=>setDetail({code:b.code,year:b.year})} onClick={()=>setDetail({code:b.code,year:b.year})} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setDetail({code:b.code,year:b.year});}}}>
        {b.part?stackSegments(b.part.rows).map((segment,i)=>{const cat=group.categories[i],h=(segment.end-segment.start)/max*plotHeight;return <g key={cat.category_id}><rect data-category={cat.category_id} data-value={segment.row.value} x={xpos(b.code,b.year)} y={baseline-segment.end/max*plotHeight} width={barWidth} height={h} fill={cat.color} stroke={highlight===cat.category_id?'#101a2b':'white'} strokeWidth={highlight===cat.category_id?3:1} opacity={highlight&&highlight!==cat.category_id?0.65:1}/><title>{cat.label}：{formatValue(segment.row.value,segment.row.unit)}{segment.row.unit} / 報告人数{numerator(segment.row)}人 / 受診者数{b.part!.denominator}人</title></g>;}):<text x={xpos(b.code,b.year)} y="200" {...svgText}>表示不可</text>}
        <text x={xpos(b.code,b.year)+barWidth/2} y={345+footerShift} {...svgText} fontSize="12" textAnchor="middle">{nameFor(c,b.code)}</text></g>)}
      {labels.map(l=><g key={l.id} className="stack-value-label" data-placement={l.inside?'inside':'outside'} data-record-id={l.id} pointerEvents="none">
        {!l.inside&&<><line x1={l.anchorX} y1={l.anchorY} x2={l.left+l.width/2<l.anchorX?l.left+l.width:l.left} y2={l.top+l.height/2} stroke={l.color} strokeWidth="1.5"/><circle cx={l.anchorX} cy={l.anchorY} r="2" fill={l.color}/></>}
        <rect className="stack-label-box" x={l.left} y={l.top} width={l.width} height={l.height} rx="3" fill={l.inside?'transparent':'white'} stroke={l.inside?'none':l.color}/>
        <text x={l.left+l.width/2} y={l.top+15} fill={l.inside&&!groupVisuals[group.group_id]?'white':'#172b45'} fontFamily="sans-serif" fontSize="13" textAnchor="middle">{l.text}</text>
      </g>)}
      {c.data.years.map(year=><text key={year} x={80+c.data.years.indexOf(year)*step+step/2} y={373+footerShift} {...svgText} textAnchor="middle" fontSize="15">{year}年度</text>)}
      {group.categories.map((cat,i)=><g key={cat.category_id} transform={`translate(${45+i*(870/group.categories.length)} ${399+footerShift})`}><rect width="15" height="15" fill={cat.color}/><text x="23" y="13" {...svgText} fontSize="13">{cat.label}</text></g>)}
      <text x="24" y={440+footerShift} {...svgText} fontSize="12">全区分の値（凡例順）／報告人数 ／ 受診者数。割合は丸め補正・再正規化しません。</text>
      {bars.map((b,i)=><g key={b.code+b.year}><text x="24" y={464+i*52+footerShift} {...svgText} fontSize="12">{b.year}年度 {nameFor(c,b.code)}：{b.part?b.part.rows.map((r,j)=>`${group.categories[j].label} ${formatValue(r.value,r.unit)}${r.unit}`).join(' / '):'表示不可'}</text><text x="24" y={484+i*52+footerShift} {...svgText} fontSize="12">報告人数（凡例順）：{b.part?b.part.rows.map(r=>format(numerator(r))+'人').join(' / '):'—'} ／ 受診者数 {b.part?format(b.part.denominator):'—'}人</text></g>)}
    </svg></div><p className="chart-scroll-hint">横スクロールで全年度を確認できます。</p>
    <section className="composition-values" aria-label="全カテゴリーの値（常時表示）"><h4>全カテゴリーの値（常時表示）</h4><div className="composition-values-grid">{bars.map(b=><article key={b.code+b.year}><h5>{nameFor(c,b.code)} · {b.year}年度</h5>{b.part?<><dl>{b.part.rows.map((r,i)=><div key={r.record_id}><dt><i style={{background:group.categories[i].color}}/>{group.categories[i].label}</dt><dd>{stackValueText(r.value,r.unit,r.value_state)}{c.measure==='rate'&&<small>報告人数 {format(numerator(r))}人</small>}</dd></div>)}</dl><p>受診者数 {format(b.part.denominator)}人</p></>:<p>表示不可：構成検証条件を満たしていません。欠損を0に置き換えていません。</p>}</article>)}</div></section>
    <div className="composition-detail" aria-live="polite"><strong>{active?.year}年度 {active&&nameFor(c,active.code)}の詳細</strong><p>棒に触れる・タップ・キーボードで選ぶと切り替わります。</p>{active?.part?<><p>受診者数：{format(active.part.denominator)}人</p><ul>{active.part.rows.map((r,i)=><li key={r.record_id}>{group.categories[i].label}：{formatValue(r.value,r.unit)}{r.unit}／報告人数 {format(numerator(r))}人 <button className="source-link" onClick={()=>c.source([r])}>出典</button></li>)}</ul></>:'構成検証を満たさないため表示できません。'}</div>
    <SourceLink c={c} rows={groupRows(c.data,group,c.regions)}/><p className="footnote">各区分は監査済み分母に対する原割合です。表示値は丸めのため合計が100.0%にならない場合があります。</p><GroupNotes c={c} group={group} codes={visibleCodes}/></div></ExportSurface>;
}
export function GroupGraph({c,group}:GroupProps) {
  const [mode,setMode]=useState(group.allowed_views.includes('composition')?'composition':'trend'),[category,setCategory]=useState(group.categories[0].category_id);
  return <><div className="group-controls" role="group" aria-label="全区分グラフの表示">{group.allowed_views.includes('composition')&&<button aria-pressed={mode==='composition'} onClick={()=>setMode('composition')}>構成を見る</button>}{group.allowed_views.includes('category_trend')&&<button aria-pressed={mode==='trend'} onClick={()=>setMode('trend')}>区分の推移</button>}{mode==='trend'&&<CategorySelect group={group} value={category} onChange={setCategory} label="グラフのカテゴリー"/>}</div>{mode==='composition'?<CompositionGraph key={c.regions.join('|')} c={c} group={group}/>:<GraphPanel key={c.regions.join('|')} c={categoryContext(c,group,category)}/>}</>;
}
