"""Discover links on official annual pages; keep immutable content and fetch events."""
import base64
import json
import os
import subprocess
import tempfile
import uuid
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

from .common import CONFIG, atomic_write, digest, now, read_json, write_json

HOSTS = {"www.kenko-niigata.com", "kenko-niigata.com"}
MAX_BYTES = 10 * 1024 * 1024


def official_url(url):
    p = urlparse(url)
    if p.scheme != "https" or p.hostname not in HOSTS or p.username or p.password or p.port:
        raise ValueError(f"Not an approved official HTTPS URL: {url}")
    return url


class OfficialRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        official_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "a":
            href = dict(attrs).get("href")
            if href:
                self.links.append(href)


def discover(html, page_url, filename):
    parser = Links()
    parser.feed(html)
    candidates = {urljoin(page_url, link) for link in parser.links
                  if unquote(urlparse(link).path).split("/")[-1] == filename}
    if len(candidates) != 1:
        raise ValueError(f"Expected one link to {filename}, found {len(candidates)}")
    return official_url(candidates.pop())


def fetch(url, transport="urllib"):
    official_url(url)
    if transport == "urllib":
        request = Request(url, headers={"User-Agent": "HealthDataVault/0.1 (public data research)"})
        with build_opener(OfficialRedirect()).open(request, timeout=60) as response:
            data = response.read(MAX_BYTES + 1)
            headers = {k: response.headers.get(k) for k in ("Content-Type", "Last-Modified", "ETag")}
            final_url = official_url(response.geturl())
    elif transport == "powershell":
        # Windows trust store; never disable TLS validation or interpolate URL into code.
        script = """
$ErrorActionPreference='Stop'
$r=Invoke-WebRequest -UseBasicParsing -Uri $env:HDV_FETCH_URL -OutFile $env:HDV_FETCH_OUT -PassThru -MaximumRedirection 0 -TimeoutSec 60
@{'Content-Type'=[string]$r.Headers['Content-Type'];'Last-Modified'=[string]$r.Headers['Last-Modified'];'ETag'=[string]$r.Headers['ETag']} | ConvertTo-Json -Compress
"""
        with tempfile.TemporaryDirectory(prefix="hdv-fetch-") as tmp:
            output = Path(tmp) / "body"
            env = dict(os.environ, HDV_FETCH_URL=url, HDV_FETCH_OUT=str(output))
            result = subprocess.run(["powershell.exe", "-NoProfile", "-NonInteractive", "-EncodedCommand",
                                     base64.b64encode(script.encode("utf-16le")).decode()],
                                    env=env, capture_output=True, check=True, timeout=90)
            data = output.read_bytes()
            headers = json.loads(result.stdout.decode("utf-8-sig"))
        final_url = url
    else:
        raise ValueError("Unknown transport")
    if not data or len(data) > MAX_BYTES:
        raise ValueError("Empty or unexpectedly large response")
    return data, headers, final_url


def store_fetch(root, url, data, headers, final_url, kind):
    root = Path(root)
    sha = digest(data)
    suffix = ".xlsx" if kind == "excel" else ".html"
    relative = Path("raw") / "objects" / (sha + suffix)
    path = root / relative
    if path.exists():
        if digest(path.read_bytes()) != sha:
            raise ValueError("Stored raw object is corrupt")
    else:
        # Exclusive creation: existing raw objects are never overwritten.
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("xb") as stream:
            stream.write(data)
    events = root / "raw" / "events"
    history = [read_json(p) for p in events.glob("*.json")]
    previous = sorted((e for e in history if e["source_url"] == url), key=lambda e: e["retrieved_at"])
    prior_sha = previous[-1]["sha256"] if previous else None
    event = dict(event_id=uuid.uuid4().hex, source_url=url, final_url=final_url,
                 retrieved_at=now(), sha256=sha, bytes=len(data), http_headers=headers,
                 raw_path=relative.as_posix(), original_filename=unquote(urlparse(url).path).split("/")[-1],
                 kind=kind, previous_sha256=prior_sha,
                 content_changed=prior_sha is not None and prior_sha != sha)
    write_json(events / (event["event_id"] + ".json"), event)
    return event


def collect(root, transport="urllib", fetcher=None):
    config = read_json(CONFIG / "contracts.json")
    fetcher = fetcher or (lambda url: fetch(url, transport))
    sources = []
    for year, contract in config.items():
        page_url = contract["page_url"]
        body, headers, final = fetcher(page_url)
        page = store_fetch(root, page_url, body, headers, final, "annual_page")
        url = discover(body.decode("utf-8-sig"), final, contract["filename"])
        data, headers, final = fetcher(url)
        if not data.startswith(b"PK"):
            raise ValueError("Excel response is not an XLSX zip archive")
        event = store_fetch(root, url, data, headers, final, "excel")
        sources.append(dict(event, publication_fiscal_year=int(year) + 1,
                            observation_fiscal_year=int(year), annual_page_url=page_url,
                            page_sha256=page["sha256"], publisher="新潟県福祉保健部健康づくり支援課"))
    manifest = dict(schema_version="0.1", collection_id=uuid.uuid4().hex, created_at=now(), sources=sources)
    root = Path(root)
    write_json(root / "raw" / "collections" / (manifest["collection_id"] + ".json"), manifest)
    write_json(root / "raw" / "latest.json", manifest)
    return manifest
