import {it,expect,vi,afterEach} from 'vitest';
import policy from '../netlify/edge-functions/index-policy';
afterEach(()=>vi.unstubAllGlobals());
it('uses the edge deploy context rather than build-only environment variables',async()=>{
 vi.stubGlobal('Netlify',{env:{get:(key:string)=>key==='PUBLIC_SITE_URL'?'https://health-data-vault.netlify.app/':undefined}});
 for(const [url,context,noindex] of [
  ['https://health-data-vault.netlify.app/','production',false],
  ['https://health-data-vault.netlify.app/?review','production',true],
  ['https://health-data-vault.netlify.app/?exportReview=0','production',true],
  ['https://preview--health-data-vault.netlify.app/','deploy-preview',true],
  ['https://health-data-vault.netlify.app/','branch-deploy',true],
  ['http://localhost:4217/','dev',true],
 ] as const){
  const result=await policy(new Request(url),{next:async()=>new Response('HTML'),deploy:{context}});
  expect(result.headers.has('X-Robots-Tag')).toBe(noindex);
 }
});
