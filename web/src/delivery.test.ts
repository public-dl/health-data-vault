import {it,expect,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {createDelivery} from '../scripts/delivery';
import {readDelivery} from './delivery';
const bundle=createDelivery(resolve('public'));
const fetcher=()=>vi.fn(async(url:any)=>{const hash=String(url).split('/').at(-1)!.replace('.json','');const bytes=bundle.files.get(hash);return bytes?new Response(new Uint8Array(bytes)):new Response('',{status:404});});
it('reconstructs the approved values exactly while deduplicating identical map objects',async()=>{
 const f=fetcher(),result=await readDelivery(bundle.plan,'dashboard',f as typeof fetch) as any;
 expect(result).toEqual({...bundle.source,published_tables:[]});expect(result.analysis.map).toBe(result.reported.map);expect(result.analysis.health_center_map).toBe(result.other_rates.health_center_map);
 expect(bundle.plan.maps).toHaveLength(2);expect(f).toHaveBeenCalledTimes(3);expect(bundle.metrics.dashboardGzipBytes).toBeLessThan(bundle.metrics.originalGzipBytes*.4);
 for(const [hash,bytes] of bundle.files)expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash);
});
it('fetches only source tables on the tables route',async()=>{const f=fetcher();expect(await readDelivery(bundle.plan,'tables',f as typeof fetch)).toEqual(bundle.source.published_tables);expect(f).toHaveBeenCalledTimes(1);expect(f.mock.calls[0][0]).toContain(bundle.plan.tables.sha256);});
it('rejects byte tampering and HTTP failures without using unchecked fallback values',async()=>{
 await expect(readDelivery(bundle.plan,'tables',vi.fn(async()=>new Response('tampered')) as typeof fetch)).rejects.toThrow('ハッシュ');
 await expect(readDelivery(bundle.plan,'dashboard',vi.fn(async()=>new Response('',{status:404})) as typeof fetch)).rejects.toThrow('取得');
 const bad=structuredClone(bundle.plan);bad.root.sha256='../invalid';await expect(readDelivery(bad,'dashboard',fetcher() as typeof fetch)).rejects.toThrow('参照');
});
