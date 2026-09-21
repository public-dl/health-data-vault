import {ExportSurface} from './export-surface';
import {annualComposition} from './annual-model';
import {sectionDefinitions} from './content-navigation';
import {ComparisonActions} from './comparison-export';
import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {PICTOGRAM_SCALE,pictogramLayout} from './pictogram-layout';
import type {Category,IndicatorGroup} from './model';
import {format,formatValue} from './model';
import {composition,numerator} from './group-model';
import {groupVisuals,allocateHundred,type Pose} from './visual-metadata';
import {Actions,SourceLink,LayoutToggle,nameFor,type Context,type Layout,svgText} from './panels';

export function PersonShape({pose}:{pose:Pose}) {
 if(pose==='support')return <g fill="currentColor" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="5" r="3" stroke="none"/><circle cx="18" cy="5" r="3" stroke="none"/><path d="M6 11 V20 M18 11 V20" strokeWidth="5"/><path fill="none" d="M4 20 L3 30 M8 20 L9 30 M16 20 L15 30 M20 20 L21 30 M3 12 L1 19 M9 12 L12 15 L15 12 M21 12 L23 18"/></g>;
 if(pose==='step'||pose==='open')return <g fill="currentColor" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="4" r="3" stroke="none"/><path d="M12 10 V20" strokeWidth="6"/><path fill="none" d={pose==='step'?'M10 20 L5 29 M14 20 L20 28 M9 11 L5 17 M15 11 L21 11 L23 8':'M10 20 L9 30 M14 20 L15 30 M9 11 L5 14 L2 10 M15 11 L19 14 L22 10'}/></g>;
 const lean=pose==='lean';
 return <g fill="currentColor" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
  <circle cx={lean?14:12} cy={lean?6:4} r="3" stroke="none"/>
  <path d={lean?'M11 12 L9 20':'M12 10 L12 20'} strokeWidth="6"/>
  <path d={lean?'M9 20 L8 30 M12 20 L13 30':'M10 20 L9 30 M14 20 L15 30'}/>
  <path fill="none" d={pose==='head'?'M9 11 L5 7 L8 3 M15 11 L19 18':pose==='wave'?'M9 11 L5 18 M15 11 L20 7 L20 2':lean?'M9 12 L6 19 M13 13 L16 20':'M9 11 L5 19 M15 11 L19 19'}/>
 </g>;
}
export function CategoryIcon({group,category}:{group:IndicatorGroup;category:Category}) {
 const visual=groupVisuals[group.group_id]?.[category.category_id];
 return visual?<svg className="category-icon" viewBox="0 0 24 34" aria-hidden="true" style={{color:visual.color}}><PersonShape pose={visual.pose}/></svg>:null;
}
function HundredCard({c,group,code,singleRegion}:{c:Context;group:IndicatorGroup;code:string;singleRegion:boolean}) {
 const part=(c.data.schema_version==='annual-1'?annualComposition:composition)(c.data,group,code,c.year),ref=useRef<SVGSVGElement>(null),[active,setActive]=useState('');
 const drawingRef=useRef<HTMLDivElement>(null),[drawingWidth,setDrawingWidth]=useState(0);
 useEffect(()=>{const el=drawingRef.current;if(!el)return;const observer=new ResizeObserver(entries=>setDrawingWidth(entries[0].contentRect.width));observer.observe(el);return()=>observer.disconnect();},[!!part]);
 const geometry=pictogramLayout(drawingWidth,singleRegion);
 const rates=part?.rows.map(r=>(r.derivation??r.derived_rate)?.value??null)??[];
 const allocation=part?allocateHundred(rates):null;
 const symbols=allocation?.flatMap((n,i)=>Array(n).fill(i) as number[])??[];
 useLayoutEffect(()=>{
  const svg=ref.current;if(!svg)return;
  const people=Array.from(svg.querySelectorAll('[data-person]'));
  if(!people.length)return;
  const inset=Math.min(...people.map(person=>person.getBoundingClientRect().left))-svg.getBoundingClientRect().left;
  svg.parentElement?.style.setProperty('--grid-start',`${inset}px`);
 },[geometry.sideLegend,geometry.narrow,code,c.year,group.group_id,c.measure]);
 const title=`${nameFor(c,code)}_${c.year}年度_${group.name}_100人図`;
 return <ExportSurface kind="pictogram-card" className={`panel hundred-card ${singleRegion?"hundred-single":"hundred-comparison"}`}><div className="panel-heading"><h3>{nameFor(c,code)} · {c.year}年度</h3>{part&&<Actions c={c} svg={ref} rows={part.rows} title={title} label="100人図（構成の近似表現）"/>}</div>
 {part&&allocation?<div ref={drawingRef} className={`hundred-body ${geometry.sideLegend?"hundred-two-column":""}`}><div className="hundred-drawing"><div className={`hundred-visual-block ${geometry.narrow?"hundred-narrow":""}`} style={geometry.sideLegend?{width:625*PICTOGRAM_SCALE,marginInline:"auto"}:undefined}><h4 className="hundred-recipient-heading">受診者 {format(part.denominator)}人</h4><svg ref={ref} className={`hundred-svg ${singleRegion?"single-region-hundred":""}`} viewBox={geometry.sideLegend?`0 32 625 248`:geometry.viewBox} style={{width:geometry.sideLegend?625*PICTOGRAM_SCALE:geometry.cssWidth,height:geometry.sideLegend?248*PICTOGRAM_SCALE:geometry.cssHeight}} data-density={geometry.wide?'wide':'compact'} data-columns={geometry.columns} data-rows={geometry.rows} data-export-viewbox={geometry.exportViewBox} role="img" aria-label={`${nameFor(c,code)} ${c.year}年度。${geometry.columns}列${geometry.rows}行、100人あたりの近似図。${group.categories.map((cat,i)=>`${cat.label} ${formatValue(rates[i],'%')}%`).join('、')}。正確な人数はカテゴリー別の一覧。`}>
 <rect width={geometry.exportWidth} height={geometry.sideLegend?328:geometry.wide?330:410} fill="white"/><text className="hundred-svg-local-title" x="14" y="22" {...svgText} fontSize="14">{nameFor(c,code)} / {c.year}年度 / 受診者 {format(part.denominator)}人</text>
 {geometry.guides.map(x=><line key={x} data-five-guide="true" x1={x} x2={x} y1="38" y2={geometry.guideBottom} stroke="#b6c6d7" strokeDasharray="3 4"/>)}
 {symbols.map((categoryIndex,i)=>{const cat=group.categories[categoryIndex],v=groupVisuals[group.group_id][cat.category_id];return <g key={i} aria-hidden="true" data-person={i} data-category={cat.category_id} transform={`translate(${geometry.position(i).x} ${geometry.position(i).y}) scale(.8)`} color={v.color} opacity={active&&active!==cat.category_id?0.35:1}><PersonShape pose={v.pose}/></g>;})}
 {group.categories.map((cat,i)=><g key={cat.category_id} transform={`translate(${geometry.legendPosition(i).x} ${geometry.legendPosition(i).y})`}><g transform="scale(.75)" color={cat.color}><PersonShape pose={groupVisuals[group.group_id][cat.category_id].pose}/></g><text x="29" y="9" {...svgText} fontSize="14">{cat.label}</text><text x="29" y="31" {...svgText} fontSize="19" fontWeight="bold">{formatValue(rates[i],'%')}%</text><text x="29" y="49" {...svgText} fill="#64748b" fontSize="15">{format(numerator(part.rows[i]))}人／{format(part.denominator)}人</text><text x="29" y="63" {...svgText} fontSize="10">図では約{allocation[i]}人／100人</text></g>)}
 <text x="15" y={geometry.noteY} {...svgText} fontSize="12">100個は近似表現。色・姿勢はカテゴリーの識別記号です。</text><text x="15" y={geometry.noteY+18} {...svgText} fontSize="11">丸め配分は図のみ。割合・報告人数は補正しません。</text></svg>{geometry.sideLegend&&<div className="hundred-grid-notes"><div>100個は近似表現。色・姿勢はカテゴリーの識別記号です。</div><div>丸め配分は図のみ。割合・報告人数は補正しません。</div></div>}</div></div>
 <div className="hundred-values">{group.categories.map((cat,i)=><button key={cat.category_id} onMouseEnter={()=>setActive(cat.category_id)} onMouseLeave={()=>setActive('')} onFocus={()=>setActive(cat.category_id)} onBlur={()=>setActive('')} onClick={()=>c.source([part.rows[i]])}><CategoryIcon group={group} category={cat}/><span>{cat.label}<strong>{formatValue(rates[i],'%')}%</strong><small className="supporting-count">{format(numerator(part.rows[i]))}人／{format(part.denominator)}人</small><small>図では約{allocation[i]}人／100人 · 出典を確認</small></span></button>)}</div>
 <p className="footnote">受診者100人あたりの近似図です。端数の大きい順に配分して100個にしています。小さい非ゼロ割合が図では0個になる場合も、数値は省略しません。{c.measure==='count'&&'人数表示中も、この図は受診者100人あたりの構成を表します。実人数は一覧で確認できます。'}姿勢は疾病・健康状態の評価を表しません。</p><SourceLink c={c} rows={part.rows}/></div>:<p className="footnote">構成を検証できないため100人図は表示できません。欠損は0に置き換えません。</p>}</ExportSurface>;
}
export function CompositionOverview({c,group}:{c:Context;group:IndicatorGroup}) {
 const [layout,setLayout]=useState<Layout>('side');
 return <section id="overview"><div className="section-heading"><span className="number">01</span><div><span className="eyebrow">COMPOSITION OVERVIEW</span><h2>{sectionDefinitions.overview}</h2></div><p>受診者100人あたりの近似図 · {c.year}年度</p></div><ComparisonActions c={{...c,group}} kind="pictogram" layout={layout}/>{c.regions.length>1&&<LayoutToggle section="100人図" value={layout} onChange={setLayout}/>}<div className={`comparison-panels ${c.regions.length>1?layout:'single'}`}>{c.regions.map(code=><HundredCard key={code} c={c} group={group} code={code} singleRegion={c.regions.length===1}/>)}</div></section>;
}
