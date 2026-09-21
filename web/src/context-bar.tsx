import {contentSections} from './content-navigation';
import React,{useEffect,useState} from 'react';

export function ContextBar({item,unit,year,regions,hasOverview,hasGraph=true,overviewLabel}:{item:string;unit:string;year:number;regions:string[];hasOverview:boolean;hasGraph?:boolean;overviewLabel?:string}) {
 const sections=contentSections(hasOverview,hasGraph).map(s=>[s.id,s.number+' '+(s.id==='overview'&&overviewLabel?overviewLabel:s.label)]);
 const [visible,setVisible]=useState(false),[section,setSection]=useState('01 地図で見る');
 useEffect(()=>{
  const filters=document.getElementById('filters');
  if(!filters)return;
  const update=()=>{
   setVisible(filters.getBoundingClientRect().bottom<=0);
   const available=sections.filter(([id])=>document.getElementById(id));
   let active=available[0];
   for(const entry of available){if(document.getElementById(entry[0])!.getBoundingClientRect().top<=115)active=entry;}
   if(active)setSection(active[1]);
  };
  // Observe a narrow band at the reading edge, not every scroll event.
  let observer:IntersectionObserver;
  const connect=()=>{
   observer?.disconnect();
   observer=new IntersectionObserver(update,{rootMargin:`-100px 0px -${Math.max(0,window.innerHeight-115)}px 0px`,threshold:0});
   for(const [id] of sections){const el=document.getElementById(id);if(el)observer.observe(el);}
   update();
  };
  const filterObserver=new IntersectionObserver(update,{threshold:0});filterObserver.observe(filters);
  connect();window.addEventListener('resize',connect);
  return()=>{observer.disconnect();filterObserver.disconnect();window.removeEventListener('resize',connect);};
 },[hasOverview,hasGraph,overviewLabel]);
 const change=()=>{
  const panel=document.getElementById('filters');
  panel?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  panel?.querySelector<HTMLSelectElement>('select')?.focus({preventScroll:true});
 };
 return <aside className="context-bar" aria-label="現在の閲覧条件" hidden={!visible}>
  <div className="context-summary"><strong className="context-section">{section}</strong><span className="context-item">{item}</span><span>{unit}</span><span>{year}年度</span><span className="context-regions">{regions.join(' vs ')}</span></div>
  <button onClick={change}>条件変更</button>
 </aside>;
}
