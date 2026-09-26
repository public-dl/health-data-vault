import React,{useEffect,useRef,useState} from 'react';

/** Keep stable anchors and mount expensive descendants near the viewport.
 * Once opened, retain their state, source links and export surfaces. */
export function DeferredSection({id,children}:{id:string;children:React.ReactNode}){
 const ref=useRef<HTMLElement>(null);
 const [ready,setReady]=useState(()=>typeof window==='undefined'||!('IntersectionObserver' in window)||['#map','#table','#graph'].includes(location.hash)||new URLSearchParams(location.search).has('review')||new URLSearchParams(location.search).has('exportReview'));
 useEffect(()=>{
  if(ready)return;
  const reveal=()=>{if(location.hash==='#'+id)setReady(true);};
  reveal();window.addEventListener('hashchange',reveal);
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))setReady(true);},{rootMargin:'500px 0px'});
  if(ref.current)observer.observe(ref.current);
  return()=>{observer.disconnect();window.removeEventListener('hashchange',reveal);};
 },[id,ready]);
 useEffect(()=>{
  // The anchor can arrive before release validation finishes and this DOM exists.
  if(!ready||location.hash!=='#'+id)return;
  const align=()=>{if(location.hash==='#'+id)ref.current?.scrollIntoView({block:'start',behavior:'instant'});};
  align();
  // Fonts, maps and a lazy chart can settle after the initial anchor scroll.
  // Keep a direct link aligned only until the user's first interaction.
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(align);
  if(ref.current?.parentElement)observer?.observe(ref.current.parentElement);
  const stop=()=>observer?.disconnect();
  const events=['wheel','touchstart','pointerdown','keydown'] as const;
  events.forEach(event=>window.addEventListener(event,stop,{once:true,passive:true}));
  return()=>{stop();events.forEach(event=>window.removeEventListener(event,stop));};
 },[id,ready]);
 return <section id={id} ref={ref} className={ready?undefined:'deferred-section'} aria-busy={!ready}>{ready?children:<div className="section-placeholder"><h2>{id==='map'?'地図で見る':id==='table'?'表で見る':'グラフで見る'}</h2><p role="status">表示に近づくと読み込みます</p><button onClick={()=>setReady(true)}>今すぐ表示</button></div>}</section>;
}
