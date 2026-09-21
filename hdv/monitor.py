"""One-shot official-page monitoring for a future scheduler. Never approves releases."""
import argparse
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote

from .collector import Links, official_url, fetch, store_fetch, collect
from .common import CONFIG, now, read_json, write_json
from .normalizer import normalize
from .validator import validate
from .publisher import build, locked


def scan(root, index_pages=(), fetcher=fetch):
    root=Path(root)
    contracts=read_json(CONFIG/'contracts.json')
    known_files={c['filename'] for c in contracts.values()}
    queue=list(dict.fromkeys([*index_pages,*[c['page_url'] for c in contracts.values()]]))
    seen=set(); found={}; page_events=[]
    while queue:
        page=official_url(queue.pop(0))
        if page in seen:continue
        if len(seen)>=50:raise ValueError('More than 50 annual pages; review discovery scope')
        seen.add(page)
        body,headers,final=fetcher(page)
        page_events.append(store_fetch(root,page,body,headers,final,'annual_page'))
        parser=Links();parser.feed(body.decode('utf-8-sig'))
        for link in parser.links:
            url=urljoin(final,link);path=unquote(urlparse(url).path)
            if '/toukei/cancer/seikatsusyuukannbyou/' in path and path.endswith('.html'):
                official_url(url)
                if url not in seen and url not in queue:queue.append(url)
            if path.lower().endswith('.xlsx') and 'tokuteikenshin' in path.lower():
                official_url(url);found[url]=page
    files=[]
    for url,page in sorted(found.items()):
        body,headers,final=fetcher(url)
        if not body.startswith(b'PK'):raise ValueError('Not an XLSX archive')
        event=store_fetch(root,url,body,headers,final,'excel')
        files.append(dict(event,annual_page_url=page,known_contract=event['original_filename'] in known_files))
    result=dict(checked_at=now(),pages=len(seen),files=files,
                new_contract_required=[f['source_url'] for f in files if not f['known_contract']],
                content_changes=[f['source_url'] for f in files if f['content_changed']],
                page_changes=[e['source_url'] for e in page_events if e['content_changed']],
                notice='新年度・ファイル名変更は契約と定義を人手確認。自動承認・公開は行わない。')
    write_json(root/'monitor/latest.json',result)
    return result


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--data-dir',type=Path,default=Path('data'))
    p.add_argument('--index-page',action='append',default=[],help='Official annual index URL; actual links are discovered')
    p.add_argument('--transport',choices=['urllib','powershell'],default='urllib')
    p.add_argument('--process-known',action='store_true',help='Validate known contracts and build a candidate only')
    p.add_argument('--geography',type=Path,default=Path('data/geography/niigata.json'))
    a=p.parse_args()
    import json
    try:
        with locked(a.data_dir/'monitor'):
            result=scan(a.data_dir,a.index_page,lambda u:fetch(u,a.transport))
            if a.process_known:
                if result['new_contract_required']:raise ValueError('New source detected. Review contracts/definitions first.')
                manifest=collect(a.data_dir,a.transport)
                output=normalize(a.data_dir,manifest)
                report=validate(a.data_dir,output)
                if report['errors']:raise ValueError('Source validation failed; public release unchanged')
                result['candidate_release_id']=build(a.data_dir,output.name,a.geography)[0]
            print(json.dumps(result,ensure_ascii=False,indent=2))
    except (OSError,ValueError,KeyError) as e:p.exit(1,str(e)+'\n')


if __name__=='__main__':main()
