import React,{useEffect,useRef,useState} from 'react';
/** Reuses the same controls and state in a native modal on narrow screens. */
export function AnalysisControls({children}:{children:React.ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [open,setOpen]=useState(false);
 const close=()=>{dialog.current?.close();setOpen(false);trigger.current?.focus();};
 useEffect(()=>{const query=matchMedia('(min-width:1200px)');const resize=()=>{if(query.matches){dialog.current?.close();setOpen(false);}};query.addEventListener('change',resize);return()=>query.removeEventListener('change',resize);},[]);
 return <><button ref={trigger} className="conditions-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={()=>{dialog.current?.showModal();setOpen(true);}}>条件を変更</button><dialog ref={dialog} className="conditions-dialog" aria-label="分析条件を変更" onCancel={()=>{setOpen(false);trigger.current?.focus();}} onClick={e=>{if(e.target===e.currentTarget)close();}}><button className="conditions-close" onClick={close}>条件を閉じる ×</button>{children}</dialog></>;
}
