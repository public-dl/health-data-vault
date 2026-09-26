import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const site=(process.env.PUBLIC_SITE_URL??'').replace(/\/+$/,''),context=process.env.CONTEXT??'';
const production=context==='production'&&!!site;
const expected=production?'index,follow':'noindex,nofollow';
const routes=['','/learn','/tables','/contact'];
for(const route of routes){
 const html=readFileSync(`dist${route}/index.html`,'utf8');
 assert.ok(html.includes(`<meta name="robots" content="${expected}">`));
 if(site){
  const url=site+route+'/';
  assert.ok(html.includes(`<link rel="canonical" href="${url}">`));
  assert.ok(html.includes(`<meta property="og:url" content="${url}">`));
 }
 assert.ok(html.includes('Health Data Vault'));
 assert.ok(!html.includes('location.origin !== ""'));
 const script=html.match(/<script>\s*\(\(\) => \{[\s\S]*?<\/script>/)?.[0].replace(/^<script>|<\/script>$/g,'');
 assert.ok(script);
 for(const [origin,search,blocked] of [[site?new URL(site).origin:'https://unconfigured.example','',!production],[site?new URL(site).origin:'https://unconfigured.example','?review',true],[site?new URL(site).origin:'https://unconfigured.example','?exportReview=0',true],['http://localhost:4217','',true],['https://deploy-preview-1--health-data-vault.netlify.app','',true]]){
  let robots=expected;
  runInNewContext(script,{URLSearchParams,location:{origin,search,pathname:(site?new URL(site).pathname.replace(/\/$/,''):'')+route+'/'},document:{querySelector:()=>({setAttribute:(_,value)=>{robots=value;}})}});
  assert.equal(robots,blocked?'noindex,nofollow':'index,follow');
 }
}
const robots=readFileSync('dist/robots.txt','utf8'),sitemap=readFileSync('dist/sitemap.xml','utf8');
assert.equal(robots.includes('Disallow: /'),!production);
if(production){assert.ok(robots.includes(`Sitemap: ${site}/sitemap.xml`));for(const route of routes)assert.ok(sitemap.includes(`<loc>${site}${route}/</loc>`));}
assert.ok(!/review|exportReview/.test(sitemap));
assert.ok(readFileSync('dist/index.html','utf8').includes('健康テーマを選ぶ'));
console.log(`Built SEO passed: ${context||'unset'} / ${site||'unset'}; initial HTML, runtime guard, canonical, OGP, robots, sitemap.`);
