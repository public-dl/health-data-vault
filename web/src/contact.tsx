import React,{useRef,useState} from 'react';
import {PublicHeader,PublicFooter} from './public-shell';
import {indexable} from './seo';

declare const __HDV_ORIGIN__:string;
declare const __HDV_PRODUCTION__:boolean;

export const contactConfig={
  endpoint:'https://api.web3forms.com/submit',
  accessKey:'d026bf21-8e55-4617-9dda-ac95df55dfbb',
  subject:'Health Data Vault からのお問い合わせ',
} as const;

export async function sendContact(form:HTMLFormElement){
  const fields=new FormData(form);
  if(fields.get('botcheck'))throw new Error('Invalid submission');
  const body={
    access_key:contactConfig.accessKey,subject:contactConfig.subject,
    name:String(fields.get('name')??''),email:String(fields.get('email')??''),
    category:String(fields.get('category')??''),message:String(fields.get('message')??''),
    botcheck:false,
  };
  const response=await fetch(contactConfig.endpoint,{
    method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},
    referrerPolicy:'no-referrer',body:JSON.stringify(body),
  });
  const result=await response.json();
  if(!response.ok||result?.success!==true)throw new Error('submit failed');
}

export function Contact(){
  const [state,setState]=useState('idle');
  const submitting=useRef(false);
  const review=new URLSearchParams(location.search).has('review');
  const enabled=indexable(__HDV_ORIGIN__,__HDV_PRODUCTION__?'production':'',location.origin,location.search,location.pathname);
  return <><PublicHeader review={review}/><main className="contact-page">
    <h1>お問い合わせ</h1><p>Health Data Vaultに関するご意見・お問い合わせをお送りいただけます。</p>
    <form method="POST" action={contactConfig.endpoint} onSubmit={async e=>{
      e.preventDefault();if(!enabled||submitting.current)return;
      const form=e.currentTarget;submitting.current=true;setState('sending');
      try{await sendContact(form);setState('success');form.reset();}catch{setState('error');}
      finally{submitting.current=false;}
    }}>
      <p hidden><label>入力しないでください<input type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off"/></label></p>
      <label>お名前（任意）<input name="name" autoComplete="name" maxLength={100}/></label>
      <label>メールアドレス（必須）<input name="email" type="email" required autoComplete="email" maxLength={254}/></label>
      <label>お問い合わせ種別<select name="category">{['データについて','表示について','掲載内容について','その他'].map(s=><option key={s}>{s}</option>)}</select></label>
      <label>お問い合わせ内容（必須）<textarea name="message" required rows={7} maxLength={5000}/></label>
      <p>ご入力いただいた情報は、お問い合わせへの対応のために使用します。</p>
      {!enabled&&<p>この確認環境では送信できません。</p>}
      <button type="submit" disabled={!enabled||state==='sending'}>{state==='sending'?'送信中…':'送信する'}</button>
      <p role="status">{state==='success'?'お問い合わせを受け付けました。':state==='error'?'送信できませんでした。時間をおいて再度お試しください。':''}</p>
    </form>
  </main><PublicFooter review={review}/></>;
}
