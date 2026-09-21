"""Loopback-only server. Public mode requires approval; review mode is explicit."""
import argparse
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from .publisher import approved, inspect, encoded
from . import site_release


def public_release(root):
    return site_release.approved(root) if (Path(root)/'site/current.json').exists() else approved(root)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, data_root, review=None, **kwargs):
        self.data_root, self.review = data_root, review
        super().__init__(*args, **kwargs)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/robots.txt':
            content = b'User-agent: *\nDisallow: /\n'
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Content-Length', str(len(content)))
            self.end_headers(); self.wfile.write(content); return
        try:
            if path == '/review/data.json':
                if self.review is None:
                    self.send_error(404); return
                self.json_bytes(encoded(self.review)); return
            if path == '/public-data/current.json':
                pointer, _ = public_release(self.data_root)
                self.json_bytes(encoded(pointer)); return
            if path.startswith('/public-data/releases/'):
                pointer, content = public_release(self.data_root)
                if path != '/public-data/releases/'+pointer['release_id']+'.json':
                    self.send_error(404); return
                self.json_bytes(content); return
        except (OSError, ValueError, KeyError):
            self.send_error(503, 'No verified approved release'); return
        # Serve only the built web directory, never the repository/data tree.
        if path.rstrip('/') in ('/tables', '/learn', '/contact'):
            self.path = path.rstrip('/') + '/index.html'
        super().do_GET()

    def end_headers(self):
        self.send_header('X-Robots-Tag', 'noindex, nofollow')
        super().end_headers()

    def json_bytes(self, content):
        self.send_response(200)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(content)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.end_headers(); self.wfile.write(content)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--data-dir', type=Path, default=Path('data'))
    p.add_argument('--web-dir', type=Path, default=Path('web/dist'))
    p.add_argument('--review-release', help='Explicit local candidate preview; never updates current.json')
    p.add_argument('--site-review-release', help='Explicit independent annual/table site candidate')
    p.add_argument('--port', type=int, default=4173)
    a = p.parse_args()
    if not (a.web_dir/'index.html').is_file(): p.error('Build web first: cd web; pnpm build')
    review = None
    if a.review_release and a.site_review_release: p.error('Choose only one review release')
    if a.site_review_release:
        payload, _ = site_release.inspect(a.data_dir, a.site_review_release)
        review = dict(mode='review', release_id=a.site_review_release, payload=payload)
    elif a.review_release:
        payload, _ = inspect(a.data_dir, a.review_release)
        review = dict(mode='review', release_id=a.review_release, payload=payload)
    else:
        public_release(a.data_dir)
    server = ThreadingHTTPServer(('127.0.0.1', a.port), partial(Handler, directory=str(a.web_dir.resolve()), data_root=a.data_dir, review=review))
    print(f'http://127.0.0.1:{a.port}/'+('?review=1' if review else ''), flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()


if __name__ == '__main__': main()
