import React,{useEffect,useState} from 'react';
export const sectionDefinitions={overview:'構成をひと目で見る',map:'地図で見る',table:'表で見る',graph:'グラフで見る'} as const;
export function contentSections(hasOverview:boolean,hasGraph=true){return (Object.entries(sectionDefinitions) as [keyof typeof sectionDefinitions,string][]).filter(([id])=>(hasOverview||id!=='overview')&&(hasGraph||id!=='graph')).map(([id,label],i)=>({id,label,number:String(i+1).padStart(2,'0')}));}
const iconPaths={overview:'M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M16 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M3 21v-5a5 5 0 0 1 10 0v5M13 13a5 5 0 0 1 8 3v5',map:'M2 5l6-3 8 3 6-3v17l-6 3-8-3-6 3zM8 2v17M16 5v17',table:'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18',graph:'M4 21V12h3v9M11 21V7h3v14M18 21V2h3v19'};
export function ContentNavigation({hasOverview,hasGraph=true}:{hasOverview:boolean;hasGraph?:boolean;overviewLabel?:string;graphDescription?:string}){
 const sections=contentSections(hasOverview,hasGraph);
 const [active,setActive]=useState<string>(sections[0]?.id??'');
 useEffect(()=>{
  let frame=0;
  const update=()=>{frame=0;const available=contentSections(hasOverview,hasGraph).map(s=>({id:s.id,el:document.getElementById(s.id)})).filter(s=>s.el);
   const passed=available.filter(s=>s.el!.getBoundingClientRect().top<=window.innerHeight*.3);
   setActive((passed.at(-1)??available[0])?.id??'');
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);schedule();
  return ()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);};
 },[hasOverview,hasGraph]);
 return <nav className="content-navigation section-tab-bar" aria-label="データの見方">{sections.map(s=><a key={s.id} data-view={s.id} href={'#'+s.id} aria-current={active===s.id?'location':undefined} onClick={()=>setActive(s.id)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={iconPaths[s.id]} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg><span className="nav-copy"><strong><span className="tab-number">{s.number}</span> {s.id==='overview'?'判定状況をひと目で見る':s.label}</strong></span></a>)}</nav>;
}

export function FilterIcon({kind}:{kind:'data'|'value'|'year'|'region'}){const paths={data:'M5 2h10l4 4v16H5zM14 2v5h5M8 11h8M8 15h8M8 19h5',value:'M4 21V12h3v9M11 21V7h3v14M18 21V2h3v19',year:'M3 5h18v17H3zM3 10h18M7 2v6M17 2v6',region:'M12 22S4 13 4 8a8 8 0 0 1 16 0c0 5-8 14-8 14zM12 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6'};return <svg className="filter-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[kind]} stroke="currentColor" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;}
