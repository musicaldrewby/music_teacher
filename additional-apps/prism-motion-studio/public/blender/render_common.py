"""Shared, dependency-free validation for the Prism local renderer."""
import hashlib
import json
import os
import struct
import zlib
from pathlib import Path

INPUTS = ('scene.json', 'scene.glb', 'animation.f32', 'environment.f32', 'soundtrack.wav',
          'setup_scene.py', 'assemble_video.py', 'render_job.py', 'render_common.py')

def atomic_json(path, value):
    path = Path(path)
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(value), encoding='utf-8')
    os.replace(tmp, path)

def fingerprint(base):
    digest = hashlib.sha256()
    for name in INPUTS:
        path = base / name
        digest.update(name.encode())
        if path.exists():
            with path.open('rb') as stream:
                for block in iter(lambda: stream.read(1024 * 1024), b''):
                    digest.update(block)
        else:
            digest.update(b'<absent>')
    return digest.hexdigest()

def valid_png(path, dimensions=None):
    """Check chunk integrity and the complete end marker, not just file existence."""
    try:
        with Path(path).open('rb') as stream:
            if stream.read(8) != b'\x89PNG\r\n\x1a\n':
                return False
            first, has_data = True, False
            while True:
                header = stream.read(8)
                if len(header) != 8:
                    return False
                size, kind = struct.unpack('>I4s', header)
                if size > 128 * 1024 * 1024:
                    return False
                data = stream.read(size)
                crc = stream.read(4)
                if len(data) != size or len(crc) != 4 or zlib.crc32(kind + data) & 0xffffffff != struct.unpack('>I', crc)[0]:
                    return False
                if first:
                    if kind != b'IHDR' or len(data) != 13:
                        return False
                    if dimensions and struct.unpack('>II', data[:8]) != tuple(dimensions):
                        return False
                    first = False
                if kind == b'IDAT':
                    has_data = True
                if kind == b'IEND':
                    return size == 0 and has_data and not stream.read(1)
    except (OSError, ValueError, struct.error):
        return False

def frame_path(base, frame):
    return base / 'frames' / ('frame_%06d.png' % frame)

def completed_frames(base, manifest):
    d = manifest['dimensions']
    return [n for n in range(1, manifest['frames'] + 1)
            if valid_png(frame_path(base, n), (d['width'], d['height']))]

class JobLock:
    """OS advisory lock also prevents duplicate renders after a controller restart."""
    def __init__(self, base):
        self.path = Path(base) / 'render.lock'
        self.file = None
    def acquire(self):
        stream = self.path.open('a+b')
        if not self.path.stat().st_size:
            stream.write(b'0')
            stream.flush()
        stream.seek(0)
        try:
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            stream.close()
            return False
        self.file = stream
        return True
    def release(self):
        if self.file:
            self.file.seek(0)
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(self.file.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl
                fcntl.flock(self.file.fileno(), fcntl.LOCK_UN)
            self.file.close()
            self.file = None

def job_active(base):
    lock = JobLock(base)
    acquired = lock.acquire()
    if acquired:
        lock.release()
    return not acquired
