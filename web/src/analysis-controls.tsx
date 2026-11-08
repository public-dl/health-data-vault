import {trapModalTab} from './modal-focus';
import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
/** Native modal on narrow screens; normal sidebar semantics on desktop. */
export function AnalysisControls({children}:{children:React.ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [narrow,setNarrow]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(max-width:1199px)').matches);
 const [open,setOpen]=useState(false),[navigation,setNavigation]=useState<Element|null>(null);
 useEffect(()=>{setNavigation(document.querySelector('.site-header nav'));},[]);
 const close=()=>{dialog.current?.close();setOpen(false);trigger.current?.focus({preventScroll:true});};
 useEffect(()=>{const query=matchMedia('(max-width:1199px)');const resize=()=>{if(!query.matches)dialog.current?.close();setOpen(false);setNarrow(query.matches);};query.addEventListener('change',resize);return()=>query.removeEventListener('change',resize);},[]);
 return <>{navigation&&createPortal(<button ref={trigger} className="conditions-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={()=>{dialog.current?.showModal();setOpen(true);}}>表示条件</button>,navigation)}{narrow?<dialog ref={dialog} className="conditions-dialog" aria-label="分析条件を変更" onKeyDown={e=>trapModalTab(e.nativeEvent,e.currentTarget)} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}}><button autoFocus className="conditions-close" onClick={close}>条件を閉じる ×</button>{children}</dialog>:<div className="conditions-inline">{children}</div>}</>;
}
