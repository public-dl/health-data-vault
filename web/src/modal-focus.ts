import {useEffect,useRef} from 'react';

/** Keep Tab order inside the modal, including WebKit with reduced keyboard access. */
export function trapModalTab(event:KeyboardEvent,dialog:HTMLDialogElement){
 if(event.key!=='Tab')return;
 const controls=Array.from(dialog.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,summary,[tabindex]')).filter(el=>el.tabIndex>=0&&!el.matches(':disabled')&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden');
 event.preventDefault();
 if(!controls.length){dialog.focus();return;}
 const index=controls.indexOf(document.activeElement as HTMLElement);
 controls[index<0?(event.shiftKey?controls.length-1:0):(index+(event.shiftKey?-1:1)+controls.length)%controls.length].focus();
}
/** Native modality plus explicit Tab order; restore the invoking control on close. */
export function useModalFocus(){
 const dialog=useRef<HTMLDialogElement>(null);
 const opener=useRef<HTMLElement|null>(typeof document==='undefined'?null:document.activeElement as HTMLElement);
 useEffect(()=>{
  const el=dialog.current;el?.showModal();
  const keydown=(event:KeyboardEvent)=>{if(el)trapModalTab(event,el);};el?.addEventListener('keydown',keydown);
  return()=>{el?.removeEventListener('keydown',keydown);el?.close();if(opener.current?.isConnected)opener.current.focus({preventScroll:true});};
 },[]);
 return dialog;
}
