import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {it,expect,vi,afterEach} from 'vitest';
import {pages,productionOrigin,indexable,websiteSchema} from './seo';
import {Contact,sendContact,contactConfig} from './contact';
afterEach(()=>vi.unstubAllGlobals());
it('allows only the configured production origin without review parameters',()=>{for(const [context,host,query] of [['deploy-preview','https://healthdatavault.jp',''],['branch-deploy','https://healthdatavault.jp',''],['production','http://localhost:4201',''],['production','https://healthdatavault.jp','?review=1'],['production','https://preview.netlify.app','']])expect(indexable('https://healthdatavault.jp',context,host,query)).toBe(false);expect(indexable('https://healthdatavault.jp','production','https://healthdatavault.jp','?year=2023')).toBe(true);expect(productionOrigin('')).toBe('');expect(productionOrigin('http://localhost/')).toBe('');expect(productionOrigin('https://healthdatavault.jp/')).toBe('https://healthdatavault.jp');});
it('has four fixed routes and valid WebSite schema without fabricated dataset claims',()=>{expect(Object.keys(pages)).toEqual(['/','/learn','/tables','/contact']);expect(JSON.parse(JSON.stringify(websiteSchema('https://healthdatavault.jp')))['@type']).toBe('WebSite');expect(JSON.stringify(pages)).not.toMatch(/CivITech|CiviTech|シビテック/);});
it('renders explicit accessible fields and disables preview submission',()=>{vi.stubGlobal('location',{origin:'http://localhost',search:'?review=1'});const s=renderToStaticMarkup(<Contact/>);expect(s).toContain('type="email" required');expect(s).toContain('name="message" required');expect(s).toContain('name="botcheck"');expect(s).toContain('この確認環境では送信できません');expect(s).not.toContain('お問い合わせを受け付けました');});
it('posts the maintained fields to Web3Forms and requires explicit success',async()=>{
  vi.stubGlobal('FormData',class{get(key:string){return ({name:'Test',email:'test@example.com',category:'その他',message:'Test message'} as Record<string,string>)[key]??null;}});
  const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({success:true})});vi.stubGlobal('fetch',fetcher);
  await sendContact({} as HTMLFormElement);
  expect(fetcher.mock.calls[0][0]).toBe('https://api.web3forms.com/submit');
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({access_key:contactConfig.accessKey,subject:'Health Data Vault からのお問い合わせ',name:'Test',email:'test@example.com',category:'その他',message:'Test message',botcheck:false});
  for(const response of [{ok:false,json:async()=>({success:false})},{ok:true,json:async()=>({success:false})},{ok:true,json:async()=>({})},{ok:true,json:async()=>{throw new Error('invalid json');}}]){
    fetcher.mockResolvedValue(response);await expect(sendContact({} as HTMLFormElement)).rejects.toThrow();
  }
  fetcher.mockRejectedValue(new Error('network'));await expect(sendContact({} as HTMLFormElement)).rejects.toThrow();
});
it('does not send a filled honeypot',async()=>{
  vi.stubGlobal('FormData',class{get(){return 'on';}});
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  await expect(sendContact({} as HTMLFormElement)).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
});
