"""Local-only Prism dashboard. Rendering happens in a separate Blender process."""
import argparse
import json
import os
import secrets
import subprocess
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

parser = argparse.ArgumentParser()
parser.add_argument('--blender', required=True)
parser.add_argument('--package', required=True)
args = parser.parse_args()
BASE = Path(args.package).resolve()
import sys
sys.path.insert(0, str(BASE))
from render_common import atomic_json, job_active

manifest = json.loads((BASE / 'scene.json').read_text(encoding='utf-8'))
token = secrets.token_urlsafe(32)
prefix = '/session/' + token + '/'
lock = threading.Lock()
worker = None
worker_log = None
started = False

def read_status():
    try:
        state = json.loads((BASE / 'render-status.json').read_text(encoding='utf-8'))
    except (OSError, ValueError):
        state = {'phase': 'ready', 'done': 0, 'total': manifest['frames']}
    running = (worker is not None and worker.poll() is None) or job_active(BASE)
    if started and not running and worker is not None and state.get('phase') not in ('complete', 'preview', 'paused', 'error'):
        state.update(phase='error', error='Blender stopped before finishing. See render.log, then Render / Resume to continue.')
    elif not started and not running and state.get('phase') in ('preparing', 'rendering', 'testing', 'encoding'):
        state.update(phase='paused', eta=None)
    state.update(prismLauncher=1, running=running, name=manifest['name'],
                 folder=str(BASE), width=manifest['dimensions']['width'], height=manifest['dimensions']['height'],
                 fps=manifest['fps'], previewAvailable=(BASE / 'preview.png').exists(),
                 previewVersion=(BASE / 'preview.png').stat().st_mtime_ns if (BASE / 'preview.png').exists() else 0,
                 pauseRequested=(BASE / 'pause-requested').exists())
    return state

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass
    def allowed(self):
        return self.headers.get('Host') == '127.0.0.1:%s' % self.server.server_port and urlsplit(self.path).path.startswith(prefix)
    def send(self, code, body, kind='application/json'):
        if not isinstance(body, bytes):
            body = json.dumps(body).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', kind)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
        self.end_headers()
        self.wfile.write(body)
    def do_GET(self):
        if not self.allowed():
            return self.send(403, {'error': 'Use the private launcher URL.'})
        route = urlsplit(self.path).path[len(prefix):]
        if route == '':
            return self.send(200, (BASE / 'launcher.html').read_bytes(), 'text/html; charset=utf-8')
        if route == 'status':
            with lock:
                return self.send(200, read_status())
        if route == 'preview' and (BASE / 'preview.png').exists():
            return self.send(200, (BASE / 'preview.png').read_bytes(), 'image/png')
        return self.send(404, {'error': 'Unknown route'})
    def do_POST(self):
        global worker, worker_log, started
        origin = 'http://127.0.0.1:%s' % self.server.server_port
        if not self.allowed() or self.headers.get('Origin') != origin or self.headers.get('Content-Type') != 'application/json':
            return self.send(403, {'error': 'Open the local launcher page to use these controls.'})
        # No caller-provided paths or commands are accepted.
        if self.headers.get('Content-Length') != '2' or self.rfile.read(2) != b'{}':
            return self.send(400, {'error': 'Invalid request'})
        route = urlsplit(self.path).path[len(prefix):]
        with lock:
            running = (worker is not None and worker.poll() is None) or job_active(BASE)
            if route in ('test', 'render', 'encode'):
                if running:
                    return self.send(409, {'error': 'A render job is already running.'})
                (BASE / 'pause-requested').unlink(missing_ok=True)
                atomic_json(BASE / 'render-status.json', {'phase': 'preparing', 'done': 0, 'total': manifest['frames']})
                if worker_log:
                    worker_log.close()
                worker_log = (BASE / 'render.log').open('w', encoding='utf-8')
                try:
                    worker = subprocess.Popen([args.blender, '--background', '--factory-startup', '--python-exit-code', '1',
                                               '--python', str(BASE / 'render_job.py'), '--', str(BASE), route],
                                              cwd=str(BASE), stdout=worker_log, stderr=subprocess.STDOUT,
                                              creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
                    started = True
                except OSError as error:
                    atomic_json(BASE / 'render-status.json', {'phase': 'error', 'error': str(error), 'total': manifest['frames']})
                    return self.send(500, {'error': str(error)})
            elif route == 'pause':
                if running:
                    (BASE / 'pause-requested').touch()
            elif route == 'open-folder':
                if os.name == 'nt':
                    os.startfile(str(BASE))
                elif sys.platform == 'darwin':
                    subprocess.Popen(['open', str(BASE)])
                else:
                    subprocess.Popen(['xdg-open', str(BASE)])
            elif route == 'close':
                if running:
                    return self.send(409, {'error': 'Pause and wait for the current frame before closing the launcher.'})
                threading.Thread(target=self.server.shutdown, daemon=True).start()
            else:
                return self.send(404, {'error': 'Unknown action'})
            return self.send(200, {'ok': True})

server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
url = 'http://127.0.0.1:%s%s' % (server.server_port, prefix)
atomic_json(BASE / 'launcher-session.json', {'url': url})
(BASE / 'launcher-url.txt').write_text(url, encoding='utf-8')
print('Prism local render launcher:', url, flush=True)
webbrowser.open_new_tab(url)
try:
    server.serve_forever(poll_interval=.5)
finally:
    server.server_close()
