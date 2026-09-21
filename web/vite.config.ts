import {defineConfig} from 'vite';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {pages,productionOrigin,websiteSchema} from './src/seo';
const origin=productionOrigin(process.env.PUBLIC_SITE_URL??'');
const production=process.env.CONTEXT==='production'&&!!origin;
const esc=(s:string)=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
function head(path:string){const p=pages[path as keyof typeof pages];const url=origin+path;return `<title>${p.title}</title><meta name="description" content="${esc(p.description)}"><meta name="robots" content="${production?'index,follow':'noindex,nofollow'}">`+
`<meta property="og:type" content="website"><meta property="og:site_name" content="Health Data Vault"><meta property="og:title" content="${p.title}"><meta property="og:description" content="${esc(p.description)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${p.title}"><meta name="twitter:description" content="${esc(p.description)}">`+
(origin?`<link rel="canonical" href="${url}"><meta property="og:url" content="${url}"><meta property="og:image" content="${origin}/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Health Data Vault 新潟県の特定健診データ"><meta name="twitter:image" content="${origin}/og.png">`:'')+
(path==='/'&&origin?`<script type="application/ld+json">${JSON.stringify(websiteSchema(origin)).replaceAll('<','\u003c')}</script>`:'')+
`<script>if(location.origin!==${JSON.stringify(origin)}||new URLSearchParams(location.search).has('review')||new URLSearchParams(location.search).has('exportReview'))document.querySelector('meta[name="robots"]').content='noindex,nofollow';</script>`;}
export default defineConfig({define:{__HDV_ORIGIN__:JSON.stringify(origin),__HDV_PRODUCTION__:JSON.stringify(production)},plugins:[{name:'hdv-static-head',apply:'build',transformIndexHtml(html){return html.replace(/<title>.*?<\/title>/,'<!--hdv-head-start-->'+head('/')+'<!--hdv-head-end-->');},closeBundle(){if(process.env.VITEST)return;const base=readFileSync('dist/index.html','utf8');for(const path of Object.keys(pages).filter(p=>p!=='/')){mkdirSync('dist'+path,{recursive:true});writeFileSync('dist'+path+'/index.html',base.replace(/<!--hdv-head-start-->[\s\S]*?<!--hdv-head-end-->/,head(path)));}
writeFileSync('dist/robots.txt',production?`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n');
writeFileSync('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${production?Object.keys(pages).map(p=>`<url><loc>${origin+p}</loc></url>`).join(''):''}</urlset>`);
writeFileSync('dist/_headers',production?'':'/*\n  X-Robots-Tag: noindex, nofollow\n');
}}]});
