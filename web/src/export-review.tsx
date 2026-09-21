import React,{useEffect,useState} from 'react';

/** Opt-in local review only; the preview is the exact delivered Blob, outside all surfaces. */
export function ExportReview({enabled}:{enabled:boolean}) {
 const [active]=useState(()=>enabled&&new URLSearchParams(location.search).get('exportReview')==='1');
 const [result,setResult]=useState<{url:string;hash:string;action:string;filename:string}|null>(null);
 useEffect(()=>{
  if(!active)return;
  let url='',generation=0;
  const receive=async(event:Event)=>{
   const {blob,action,filename}=(event as CustomEvent<{blob:Blob;action:string;filename:string}>).detail;
   const current=++generation;
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join('');
   if(current!==generation)return;
   if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);setResult({url,hash,action,filename});
  };
  window.addEventListener('hdv-export-result',receive);
  return()=>{generation++;window.removeEventListener('hdv-export-result',receive);if(url)URL.revokeObjectURL(url);};
 },[active]);
 if(!active)return null;
 return <aside id="export-review" data-export-private="review" style={{margin:24,padding:16,background:'white'}}>
  <h2>画像出力レビュー（ローカル確認専用）</h2>
  {result?<><p>{result.action}：{result.filename}</p><output data-export-hash={result.hash} style={{overflowWrap:'anywhere'}}>{result.hash}</output><img src={result.url} alt="実際に出力したPNG" style={{display:'block',maxWidth:'100%',maxHeight:'70vh',width:'auto',height:'auto',objectFit:'contain'}}/></>:<p>Copy / PNG保存を実行すると、同じBlobをここに表示します。</p>}
 </aside>;
}
