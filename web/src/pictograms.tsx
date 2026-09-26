import {matchPeople,personMotion,type PersonIdentity} from './pictogram-motion';
import {ExportSurface} from './export-surface';
import {annualComposition} from './annual-model';
import {sectionDefinitions} from './content-navigation';
import {ComparisonActions} from './comparison-export';
import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {groupedPictogramLayout,hundredGridLayout} from './grouped-pictogram-layout';
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
function HundredCard({c,group,code,singleRegion,mode}:{c:Context;group:IndicatorGroup;code:string;singleRegion:boolean;mode:"grid"|"grouped"}) {
 const part=(c.data.schema_version==='annual-1'?annualComposition:composition)(c.data,group,code,c.year),ref=useRef<SVGSVGElement>(null);
 const drawingRef=useRef<HTMLDivElement>(null),[drawingWidth,setDrawingWidth]=useState(0);
 useEffect(()=>{const el=drawingRef.current;if(!el)return;const observer=new ResizeObserver(entries=>setDrawingWidth(entries[0].contentRect.width));observer.observe(el);return()=>observer.disconnect();},[!!part]);

 const rates=part?.rows.map(r=>(r.derivation??r.derived_rate)?.value??null)??[];
 const allocation=part?allocateHundred(rates):null;
 const symbols=allocation?.flatMap((n,i)=>Array(n).fill(i) as number[])??[];
 const geometry=(mode==='grid'?hundredGridLayout:groupedPictogramLayout)(drawingWidth,allocation??[]);
 const previousPeople=useRef<PersonIdentity[]>([]);
 const previousPositions=useRef(new Map<number,{x:number;y:number;color:string}>());
 const identities=matchPeople(previousPeople.current,symbols.map(i=>group.categories[i].category_id));
 const motionKey=JSON.stringify([mode,identities,geometry.width,geometry.columns,geometry.stacked]);
 useLayoutEffect(()=>{
  const svg=ref.current;if(!svg){previousPeople.current=[];previousPositions.current.clear();return;}
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const animations:Animation[]=[];const next=new Map<number,{x:number;y:number;color:string}>();
  identities.forEach((person,index)=>{
   const position=geometry.position(index),color=groupVisuals[group.group_id][person.category].color;
   const old=previousPositions.current.get(person.id);const el=svg.querySelector<SVGGElement>(`[data-person="${person.id}"]`);
   next.set(person.id,{...position,color});
   if(el&&old&&!reduced.matches&&el.animate&&(old.x!==position.x||old.y!==position.y||old.color!==color)){
    animations.push(el.animate([{transform:`translate(${old.x}px, ${old.y}px) scale(.8)`,color:old.color},{transform:`translate(${position.x}px, ${position.y}px) scale(.8)`,color}],{...personMotion,duration:person.id%9===0?600:480,delay:person.id%9===0?80:0,fill:'backwards'}));
   }
  });
  previousPeople.current=identities;previousPositions.current=next;
  const stop=()=>{if(reduced.matches)animations.forEach(a=>a.cancel());};reduced.addEventListener('change',stop);
  return()=>{animations.forEach(a=>a.cancel());reduced.removeEventListener('change',stop);};
 },[motionKey]);
 const title=`${nameFor(c,code)}_${c.year}年度_${group.name}_100人図`;
 return <ExportSurface kind="pictogram-card" className={`panel hundred-card ${singleRegion?"hundred-single":"hundred-comparison"}`}><div className="panel-heading"><h3>{nameFor(c,code)} · {c.year}年度</h3>{part&&<Actions c={c} svg={ref} rows={part.rows} title={title} label="100人図（構成の近似表現）"/>}</div>
 {part&&allocation?<div ref={drawingRef} className="grouped-hundred-body">
 <h4 className="hundred-recipient-heading">受診者 {format(part.denominator)}人</h4>
 <svg ref={ref} className="grouped-hundred-svg" data-layout={mode} data-columns={geometry.columns} viewBox={`0 0 ${geometry.width} ${geometry.height}`} style={{width:'100%',height:geometry.height}} role="img" aria-label={`${nameFor(c,code)} ${c.year}年度。${mode==='grid'?`${geometry.columns}列の100人図`:'カテゴリー別の100人あたり近似図'}。${group.categories.map((cat,i)=>`${cat.label} ${formatValue(rates[i],'%')}%`).join('、')}`}>
 <rect width={geometry.width} height={geometry.height} fill="white"/>
 {symbols.map((categoryIndex,i)=>{const cat=group.categories[categoryIndex],v=groupVisuals[group.group_id][cat.category_id];return <g key={identities[i].id} aria-hidden="true" data-person={identities[i].id} data-category={cat.category_id} transform={`translate(${geometry.position(i).x} ${geometry.position(i).y}) scale(.8)`} color={v.color}><PersonShape pose={v.pose}/></g>;})}
 {group.categories.map((cat,i)=>{const label=geometry.labels[i];return <g key={cat.category_id} data-category-label={cat.category_id} transform={`translate(${label.x} ${label.y})`}>
 <text {...svgText} fontSize="15" fontWeight="bold">{cat.label}</text>
 <text y="25" {...svgText} fontSize="22" fontWeight="bold">{formatValue(rates[i],'%')}%</text>
 <text y="47" {...svgText} fontSize="14">{format(numerator(part.rows[i]))}人</text>
 <text y="66" {...svgText} fontSize="12">図では約{allocation[i]}人／100人</text>
 </g>;})}
 </svg>
 <div className="hundred-grid-notes"><div>100個は近似表現。色・姿勢はカテゴリーの識別記号です。</div><div>丸め配分は図のみ。割合・報告人数は補正しません。</div></div>
 <p className="footnote">受診者100人あたりの近似図です。端数の大きい順に配分して100個にしています。小さい非ゼロ割合が図では0個になる場合も、数値は省略しません。姿勢は疾病・健康状態の評価を表しません。</p><SourceLink c={c} rows={part.rows}/></div>:<p className="footnote">構成を検証できないため100人図は表示できません。欠損は0に置き換えません。</p>}</ExportSurface>;
}
export function CompositionOverview({c,group}:{c:Context;group:IndicatorGroup}) {
 const [layout,setLayout]=useState<Layout>('side');
 const [mode,setMode]=useState<'grid'|'grouped'>('grid');
 return <section id="overview"><div className="section-heading"><span className="number">01</span><div><span className="eyebrow">COMPOSITION OVERVIEW</span><h2>{sectionDefinitions.overview}</h2></div><p>受診者100人あたりの近似図 · {c.year}年度</p></div><ComparisonActions c={{...c,group}} kind="pictogram" layout={layout}/><div className="pictogram-controls"><div className="pictogram-mode" role="group" aria-label="100人図の表示モード"><button type="button" aria-pressed={mode==='grid'} onClick={()=>setMode('grid')}>100人で見る</button><button type="button" aria-pressed={mode==='grouped'} onClick={()=>setMode('grouped')}>カテゴリー別に並べる</button></div>{c.regions.length>1&&<LayoutToggle section="100人図" value={layout} onChange={setLayout}/>}</div><div className={`comparison-panels ${c.regions.length>1?layout:'single'}`}>{c.regions.map((code,index)=><HundredCard key={index} c={c} group={group} code={code} singleRegion={c.regions.length===1} mode={mode}/>)}</div></section>;
}
