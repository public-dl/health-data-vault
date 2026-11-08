import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import type {DeliveryPlan,DeliveryAsset} from '../src/delivery';
/** Build-only projection. Never writes to the approved source or its pointer. */
export function createDelivery(publicRoot:string){
 const pointer=JSON.parse(readFileSync(join(publicRoot,'public-data/current.json'),'utf8'));
 if(pointer.status!=='approved'||!pointer.reviewer||pointer.release_id!==pointer.data_sha256||!/^[a-f0-9]{64}$/.test(pointer.release_id))throw Error('Invalid source approval');
 const raw=readFileSync(join(publicRoot,'public-data/releases',pointer.release_id+'.json'));if(createHash('sha256').update(raw).digest('hex')!==pointer.data_sha256)throw Error('Source release hash mismatch');
 const source=JSON.parse(raw.toString('utf8'));if(source.schema_version!=='site-1')throw Error('Delivery requires site-1');
 const files=new Map<string,Buffer>(),mapAssets=new Map<string,DeliveryAsset>();let tables:DeliveryAsset|undefined;
 const asset=(v:unknown)=>{const bytes=Buffer.from(JSON.stringify(v),'utf8'),sha256=createHash('sha256').update(bytes).digest('hex');files.set(sha256,bytes);return {sha256,bytes:bytes.length};};
 const pack=(v:any,key=''):any=>{
  if(['map','health_center_map','published_tables'].includes(key)){const ref=asset(v);if(key==='published_tables')tables=ref;else mapAssets.set(ref.sha256,ref);return {__hdv_asset:ref.sha256,__hdv_slot:key};}
  if(Array.isArray(v))return v.map(x=>pack(x));if(v&&typeof v==='object'){if('__hdv_asset' in v)throw Error('Reserved delivery key in source');return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,pack(x,k)]));}return v;
 };
 const packed=pack(source),root=asset(packed);if(!tables)throw Error('Missing source tables');
 const restore=(v:any):any=>v&&typeof v==='object'&&'__hdv_asset' in v?JSON.parse(files.get(v.__hdv_asset)!.toString('utf8')):Array.isArray(v)?v.map(restore):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,restore(x)])):v;
 if(JSON.stringify(restore(packed))!==JSON.stringify(source))throw Error('Delivery reconstruction mismatch');
 const plan:DeliveryPlan={version:'site-delivery-1',sourceRelease:pointer.release_id,root,maps:[...mapAssets.values()],tables};
 const dashboard=[root,...plan.maps].map(a=>files.get(a.sha256)!);
 const metrics={originalBytes:raw.length,originalGzipBytes:gzipSync(raw).length,dashboardBytes:dashboard.reduce((n,b)=>n+b.length,0),dashboardGzipBytes:dashboard.reduce((n,b)=>n+gzipSync(b).length,0),tablesBytes:tables.bytes,tablesGzipBytes:gzipSync(files.get(tables.sha256)!).length,sharedMapFiles:plan.maps.length,exactReconstruction:true};
 return {plan,metrics,files,source,packed,write(directory:string){mkdirSync(directory,{recursive:true});for(const [hash,bytes] of files)writeFileSync(join(directory,hash+'.json'),bytes);writeFileSync(join(directory,'manifest.json'),JSON.stringify({plan,metrics},null,2));}};
}
