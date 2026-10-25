"""Exercise actual local HTTP and checkpoint behavior without Blender/GPU access."""
import json
import os
import struct
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'public/blender'))
from render_common import valid_png, completed_frames, fingerprint, atomic_json, JobLock, job_active

def png(width, height):
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress((b'\0' + bytes(width * 3)) * height)) + chunk(b'IEND', b'')

class CheckpointTests(unittest.TestCase):
    def test_truncated_corrupt_and_wrong_resolution_frames_are_not_resumed(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            (base / 'frames').mkdir()
            p = base / 'frames/frame_000001.png'
            p.write_bytes(png(8, 4))
            self.assertTrue(valid_png(p, (8, 4)))
            (base / 'frames/frame_000002.png').write_bytes(png(4, 4))
            (base / 'frames/frame_000003.png').write_bytes(png(8, 4)[:-4])
            data = bytearray(png(8, 4)); data[-16] ^= 1
            (base / 'frames/frame_000004.png').write_bytes(data)
            self.assertEqual(completed_frames(base, {'frames': 4, 'dimensions': {'width': 8, 'height': 4}}), [1])
    def test_manifest_and_asset_changes_invalidate_resume_but_status_does_not(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            (base / 'scene.json').write_text('{}')
            before = fingerprint(base)
            atomic_json(base / 'render-status.json', {'done': 4})
            self.assertEqual(before, fingerprint(base))
            (base / 'scene.glb').write_bytes(b'changed geometry')
            self.assertNotEqual(before, fingerprint(base))
    def test_competing_render_lock_is_refused_and_released(self):
        with tempfile.TemporaryDirectory() as temp:
            lock = JobLock(Path(temp))
            self.assertTrue(lock.acquire())
            self.assertTrue(job_active(Path(temp)))
            lock.release()
            self.assertFalse(job_active(Path(temp)))

class DashboardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.base = Path(self.temp.name)
        for name in ['dashboard.py', 'render_common.py', 'launcher.html']:
            (self.base / name).write_bytes((ROOT / 'public/blender' / name).read_bytes())
        (self.base / 'scene.json').write_text(json.dumps({'name': 'Test scene', 'frames': 2, 'fps': 60, 'dimensions': {'width': 8, 'height': 4}}))
        fake = self.base / 'fake-blender'
        fake.write_text('#!' + sys.executable + '\nimport sys,json,time\nfrom pathlib import Path\np=Path(__file__).parent\n(p/"invocation.json").write_text(json.dumps(sys.argv))\ntime.sleep(.15)\n(p/"render-status.json").write_text(json.dumps({"phase":"paused","done":1,"total":2}))\n')
        fake.chmod(0o755)
        env = {**os.environ, 'BROWSER': '/bin/true', 'PYTHONDONTWRITEBYTECODE': '1'}
        self.proc = subprocess.Popen([sys.executable, str(self.base / 'dashboard.py'), '--blender', str(fake), '--package', str(self.base)], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        for _ in range(100):
            if (self.base / 'launcher-session.json').exists():
                break
            time.sleep(.02)
        self.url = json.loads((self.base / 'launcher-session.json').read_text())['url']
        self.origin = '/'.join(self.url.split('/')[:3])
    def tearDown(self):
        self.proc.terminate(); self.proc.communicate(timeout=5); self.temp.cleanup()
    def call(self, action='', origin=None, body=None):
        headers = {'Origin': origin or self.origin, 'Content-Type': 'application/json'}
        req = urllib.request.Request(self.url + action, data=body, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=3) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            return e.code, e.read()
    def test_local_auth_fixed_actions_and_subprocess_arguments(self):
        code, response = self.call('status'); self.assertEqual(code, 200); self.assertEqual(json.loads(response)['name'], 'Test scene')
        self.assertEqual(self.call('render', origin='https://foreign.example', body=b'{}')[0], 403)
        self.assertEqual(self.call('render', body=b'{"command":"bad"}')[0], 400)
        self.assertEqual(self.call('not-a-command', body=b'{}')[0], 404)
        self.assertEqual(self.call('render', body=b'{}')[0], 200)
        for _ in range(100):
            if (self.base / 'invocation.json').exists():
                break
            time.sleep(.02)
        invocation = json.loads((self.base / 'invocation.json').read_text())
        self.assertEqual(invocation[-3:], ['--', str(self.base), 'render'])
        self.assertLess(invocation.index('--python-exit-code'), invocation.index('--python'))
        self.assertEqual(self.call('render', body=b'{}')[0], 409)
        self.assertEqual(self.call('pause', body=b'{}')[0], 200)
        self.assertTrue((self.base / 'pause-requested').exists())
        for _ in range(100):
            state = json.loads(self.call('status')[1])
            if not state['running']:
                break
            time.sleep(.02)
        self.assertEqual(state['phase'], 'paused')
        self.assertEqual(state['done'], 1)
        self.assertEqual(self.call('close', body=b'{}')[0], 200)

if __name__ == '__main__':
    unittest.main()
