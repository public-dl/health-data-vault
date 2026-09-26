import {it,expect,vi,afterEach} from 'vitest';
import {loadData} from './model';
afterEach(()=>vi.unstubAllGlobals());
it('refreshes approval, allows HTTP caching of hash-addressed data, and verifies bytes',async()=>{
 const raw=new TextEncoder().encode(JSON.stringify({schema_version:'public-3'}));
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw)),b=>b.toString(16).padStart(2,'0')).join('');
 vi.stubGlobal('location',{search:''});
 const fetcher=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({status:'approved',reviewer:'test',release_id:hash,data_sha256:hash}))).mockResolvedValueOnce(new Response(raw));
 vi.stubGlobal('fetch',fetcher);
 expect((await loadData()).release).toBe(hash);
 expect(fetcher.mock.calls[0][1]).toEqual({cache:'no-store'});
 expect(fetcher.mock.calls[1][1]).toEqual({cache:'default'});
 expect(fetcher.mock.calls[1][0]).toContain(hash+'.json');
 fetcher.mockResolvedValueOnce(new Response(JSON.stringify({status:'approved',reviewer:'test',release_id:hash,data_sha256:hash}))).mockResolvedValueOnce(new Response('altered'));
 await expect(loadData()).rejects.toThrow('ハッシュが一致しません');
});
