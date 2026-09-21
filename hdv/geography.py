"""Prepare a traceable, fixed-date reference map from an official N03 archive."""
import argparse
import io
import json
import os
import re
import subprocess
import tempfile
import uuid
from urllib.parse import urljoin
from urllib.request import urlopen
from collections import defaultdict
from pathlib import Path
from zipfile import ZipFile

from .common import digest, now, read_json, write_json

PAGE = "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-v3_1.html"
URL = "https://nlftp.mlit.go.jp/ksj/gml/data/N03/N03-2023/N03-20230101_15_GML.zip"


def acquire(directory, transport='urllib'):
    """Discover the chosen fixed reference edition on the official landing page."""
    directory=Path(directory);directory.mkdir(parents=True,exist_ok=True)
    def download(url,suffix):
        if not url.startswith('https://nlftp.mlit.go.jp/ksj/'):
            raise ValueError('Not an official geography URL')
        with tempfile.TemporaryDirectory(prefix='hdv-geography-') as tmp:
            if transport=='powershell':
                target=Path(tmp)/'body'
                script="$r=Invoke-WebRequest -UseBasicParsing -Uri $env:HDV_GEO_URL -OutFile $env:HDV_GEO_OUT -PassThru -MaximumRedirection 0 -TimeoutSec 90; @{'Content-Type'=[string]$r.Headers['Content-Type'];'Last-Modified'=[string]$r.Headers['Last-Modified'];'ETag'=[string]$r.Headers['ETag']} | ConvertTo-Json -Compress"
                result=subprocess.run(['powershell.exe','-NoProfile','-NonInteractive','-Command',script],
                    env=dict(os.environ,HDV_GEO_URL=url,HDV_GEO_OUT=str(target)),capture_output=True,check=True,timeout=120)
                body=target.read_bytes();headers=json.loads(result.stdout.decode('utf-8-sig'))
            else:
                with urlopen(url,timeout=90) as response:
                    if response.geturl()!=url:raise ValueError('Unexpected geography redirect')
                    body=response.read(25*1024*1024+1)
                    headers={k:response.headers.get(k) for k in ('Content-Type','Last-Modified','ETag')}
        if not body or len(body)>25*1024*1024:raise ValueError('Unexpected geography response size')
        sha=digest(body);path=directory/'objects'/(sha+suffix);path.parent.mkdir(exist_ok=True)
        if path.exists():
            if digest(path.read_bytes())!=sha:raise ValueError('Geography raw object corrupt')
        else:
            with path.open('xb') as f:f.write(body)
        event=dict(source_url=url,retrieved_at=now(),sha256=sha,bytes=len(body),http_headers=headers,raw_path=str(path.resolve()))
        write_json(directory/'events'/(uuid.uuid4().hex+'.json'),event)
        return body,event
    body,page=download(PAGE,'.html')
    matches=set(re.findall(r"['\"]([^'\"]*N03-20230101_15_GML\.zip)['\"]",body.decode('utf-8-sig')))
    links={urljoin(PAGE,s) for s in matches if '/' in s}
    if links!={URL}:raise ValueError('Official geography link missing or ambiguous')
    _,event=download(next(iter(links)),'.zip')
    event.update(annual_page_url=PAGE,page_sha256=page['sha256'])
    write_json(directory/'acquisition.json',event)
    return Path(event['raw_path'])


def prepare(archive, output, acquisition=None):
    # Optional build-time dependencies; never needed by the web server.
    import shapefile
    from shapely.geometry import shape, mapping
    from shapely.geometry.polygon import orient
    from shapely.ops import unary_union

    archive = Path(archive)
    if acquisition is None:
        raise ValueError('Acquisition metadata required; use --fetch or --acquisition')
    acquisition=read_json(acquisition)
    if digest(archive.read_bytes())!=acquisition['sha256'] or acquisition['source_url']!=URL:
        raise ValueError('Geography acquisition checksum/URL mismatch')
    groups, codes = defaultdict(list), {}
    with ZipFile(archive) as z:
        names = z.namelist()
        stem = next(n[:-4] for n in names if n.endswith('.shp'))
        reader = shapefile.Reader(shp=io.BytesIO(z.read(stem+'.shp')),
                                 shx=io.BytesIO(z.read(stem+'.shx')),
                                 dbf=io.BytesIO(z.read(stem+'.dbf')), encoding='cp932')
        for sr in reader.iterShapeRecords():
            props = sr.record.as_dict()
            if props['N03_001'] != '新潟県':
                raise ValueError('Unexpected prefecture')
            name = '新潟市' if props['N03_003'] == '新潟市' else props['N03_004']
            code = '15100' if name == '新潟市' else props['N03_007']
            if name in codes and codes[name] != code:
                raise ValueError('Conflicting geography code')
            codes[name] = code
            groups[name].append(shape(sr.shape.__geo_interface__))
    features = []
    for name in sorted(groups, key=lambda n: codes[n]):
        geom = unary_union(groups[name]).simplify(0.00035, preserve_topology=True)
        if geom.is_empty or not geom.is_valid or geom.geom_type not in ('Polygon', 'MultiPolygon'):
            raise ValueError('Invalid map geometry: '+name)
        # D3 spherical polygon convention: clockwise exterior rings.
        if geom.geom_type == 'Polygon':
            geom = orient(geom, sign=-1)
        else:
            from shapely.geometry import MultiPolygon
            geom = MultiPolygon([orient(g, sign=-1) for g in geom.geoms])
        features.append(dict(type='Feature', properties=dict(code=codes[name], name=name), geometry=mapping(geom)))
    document = dict(type='FeatureCollection', features=features, metadata=dict(
        source_url=URL, annual_page_url=PAGE, source_sha256=digest(archive.read_bytes()),
        retrieved_at=acquisition['retrieved_at'], http_headers=acquisition['http_headers'], page_sha256=acquisition['page_sha256'],
        prepared_at=now(), boundary_date='2023-01-01', coordinate_system='JGD2011 longitude/latitude',
        processing='新潟市の行政区を15100へ統合。位相を保持して0.00035度で簡略化。',
        attribution='国土交通省 国土数値情報（行政区域データ）を加工して作成',
        notice='2023年1月1日時点の参考境界を全年度で使用。年度ごとの境界変化は未検証。地区別統計ではありません。',
        redistribution_status='pending',
        license_url='https://nlftp.mlit.go.jp/ksj/other/agreement.html'))
    write_json(output, document)
    return document


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('archive', type=Path)
    p.add_argument('output', type=Path)
    p.add_argument('--fetch',action='store_true',help='Archive argument is the raw geography storage directory')
    p.add_argument('--transport',choices=['urllib','powershell'],default='urllib')
    p.add_argument('--acquisition',type=Path)
    args = p.parse_args()
    if args.fetch:
        directory=args.archive
        args.archive=acquire(directory,args.transport)
        args.acquisition=directory/'acquisition.json'
    result = prepare(args.archive, args.output,args.acquisition)
    print('municipalities:', len(result['features']))
