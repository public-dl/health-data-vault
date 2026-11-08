import {appUrl} from './app-url';
export type DeliveryAsset={sha256:string;bytes:number};
export type DeliveryPlan={version:'site-delivery-1';sourceRelease:string;root:DeliveryAsset;maps:DeliveryAsset[];tables:DeliveryAsset};
declare const __HDV_DELIVERY__:DeliveryPlan|null;
export const deliveryPlan=():DeliveryPlan|null=>typeof __HDV_DELIVERY__==='undefined'?null:__HDV_DELIVERY__;
export async function readDelivery(plan:DeliveryPlan,mode:'dashboard'|'tables',fetcher:typeof fetch=fetch):Promise<unknown>{
 const read=async(asset:DeliveryAsset)=>{
  if(!/^[a-f0-9]{64}$/.test(asset.sha256)||!Number.isSafeInteger(asset.bytes)||asset.bytes<1)throw Error('配信ファイルの参照が不正です');
  const response=await fetcher(appUrl('/public-data/delivery/'+asset.sha256+'.json'),{cache:'default'});if(!response.ok)throw Error('公開データを取得できません');const raw=await response.arrayBuffer();
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw)),b=>b.toString(16).padStart(2,'0')).join('');
  if(raw.byteLength!==asset.bytes||hash!==asset.sha256)throw Error('公開データのハッシュが一致しません');return JSON.parse(new TextDecoder().decode(raw));
 };
 if(mode==='tables')return read(plan.tables);
 const [root,...maps]=await Promise.all([read(plan.root),...plan.maps.map(read)]);const lookup=new Map(plan.maps.map((a,i)=>[a.sha256,maps[i]]));
 const restore=(v:any):any=>{
  if(v&&typeof v==='object'&&!Array.isArray(v)&&'__hdv_asset' in v){if(v.__hdv_slot==='published_tables'&&v.__hdv_asset===plan.tables.sha256)return [];if(!['map','health_center_map'].includes(v.__hdv_slot)||!lookup.has(v.__hdv_asset))throw Error('配信ファイルの対応が不正です');return lookup.get(v.__hdv_asset);}
  if(Array.isArray(v))return v.map(restore);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,restore(x)]));return v;
 };return restore(root);
}
