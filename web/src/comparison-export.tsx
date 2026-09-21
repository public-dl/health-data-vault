import {exportSurfaceFor} from './export-surface';
import React from 'react';
import type {Context,Layout} from './panels';
import {comparisonTable,comparisonCsv,comparisonFrames,type ComparisonInput} from './comparison-export-model';
import {cardsPng,save,outputPng} from './export';
export function buildComparisonSvg(children:SVGSVGElement[],layout:Layout,title:string,conditions:string,names:string[]) {
 const ns='http://www.w3.org/2000/svg';
 const sizes=children.map(el=>{const b=(el.dataset.exportViewbox??el.getAttribute('viewBox')!).split(' ').map(Number);return {width:b[2],height:b[3],box:b.join(' ')};});
 const frame=comparisonFrames(sizes,layout),svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${frame.width} ${frame.height}`);
 const text=(value:string,x:number,y:number,size=22)=>{const t=document.createElementNS(ns,'text');t.textContent=value;t.setAttribute('x',String(x));t.setAttribute('y',String(y));t.setAttribute('font-family','sans-serif');t.setAttribute('font-size',String(size));t.setAttribute('fill','#26364e');svg.append(t);};
 text(title,24,32);text(names.join(' vs '),24,62);text(conditions,24,88,16);
 children.forEach((child,i)=>{const p=frame.positions[i];text(`${i===0?'A':'B'}：${names[i]}`,p.x,p.y-10,18);const clone=child.cloneNode(true) as SVGSVGElement;clone.classList.remove('export-only');clone.removeAttribute('aria-hidden');clone.style.removeProperty('width');clone.style.removeProperty('height');clone.setAttribute('viewBox',sizes[i].box);clone.setAttribute('x',String(p.x));clone.setAttribute('y',String(p.y));clone.setAttribute('width',String(sizes[i].width));clone.setAttribute('height',String(sizes[i].height));svg.append(clone);});
 return svg;
}
export function ComparisonActions({c,kind,layout,mapScope}:{mapScope?:string;c:Context;kind:'table'|'map'|'pictogram'|'overview';layout:Layout}) {
 if(c.regions.length!==2)return null;
 const input:ComparisonInput={annualValues:c.annualValues,reportedMembers:c.reportedMembers,data:c.data,regions:c.regions,indicatorId:c.indicator.indicator_id,group:kind==='table'?c.group:undefined,year:c.year,measure:c.measure,release:c.release,review:c.review};
 const names=c.regions.map(code=>c.data.geographies.find(g=>g.code===code)?.name??code);
 const label=c.reportedMembers?(c.indicator.display_set_label??'血圧：全区分'):kind!=='map'&&c.group?c.group.name+'：全区分':c.indicator.name;
 const title=`${label}_${names.join('vs')}_比較${kind==='table'?'表':kind==='map'?'地図':kind==='overview'?'主要値':'100人図'}`;
 const act=async(action:'copy'|'csv'|'png')=>{
  try{
   if(action==='csv'){save(new Blob([comparisonCsv(input)],{type:'text/csv;charset=utf-8'}),title+'.csv');c.notify('比較CSVを保存しました');return;}
   const selector=kind==='overview'?'#overview .comparison-panels svg.export-only':kind==='pictogram'?'#overview .comparison-panels svg.hundred-svg':kind==='map'?'#map .comparison-panels svg.map':'#table .comparison-panels svg.export-only';
   const children=Array.from(document.querySelectorAll<SVGSVGElement>(mapScope?`${mapScope} ${kind==='map'?'svg.map':'svg.export-only'}`:selector));
   if(children.length!==2)throw new Error('比較対象の2地域を表示してください');
   if(kind==='map'){for(const key of ['indicator','year','unit','breaks','mapScale'])if(!children[0].dataset[key]||children[0].dataset[key]!==children[1].dataset[key])throw new Error('地図の比較条件が一致しません');}
   const cards=children.map(exportSurfaceFor);
   const actualLayout=layout==='side'&&cards[1].getBoundingClientRect().top>cards[0].getBoundingClientRect().bottom-1?'stack':layout;
   const blob=cardsPng(cards,actualLayout);
   await outputPng(blob,action,title+'.png');
   c.notify(action==='copy'?'比較画像をコピーしました':'比較PNGを保存しました');
  }catch(e){c.notify(e instanceof Error?e.message:String(e));}
 };
 return <div className="comparison-export" role="group" aria-label={`${kind==='table'?'表':kind==='map'?'地図':kind==='overview'?'主要値':'100人図'}の比較全体出力`}><strong>比較結果（A vs B）</strong><button onClick={()=>act('copy')}>{kind==='table'?'比較表をコピー':'比較画像をコピー'}</button>{kind==='table'&&<button onClick={()=>act('csv')}>比較CSV</button>}<button onClick={()=>act('png')}>比較PNG</button></div>;
}
