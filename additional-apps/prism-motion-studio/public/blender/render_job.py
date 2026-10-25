"""Blender main-thread worker. Each completed frame is an atomic checkpoint."""
import json
import os
import runpy
import sys
import time
import traceback
from pathlib import Path

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE))
from render_common import atomic_json, fingerprint, completed_frames, frame_path, valid_png, JobLock

MODE = sys.argv[sys.argv.index('--') + 2] if '--' in sys.argv else 'render'
status = {'phase': 'preparing', 'done': 0, 'total': 0, 'device': '', 'error': ''}
def report(**values):
    status.update(values)
    atomic_json(BASE / 'render-status.json', status)

def main():
    manifest = json.loads((BASE / 'scene.json').read_text(encoding='utf-8'))
    total = manifest['frames']
    report(total=total)
    key = fingerprint(BASE)
    journal = BASE / 'render-checkpoint.json'
    old_key = json.loads(journal.read_text()).get('fingerprint') if journal.exists() else None
    frames = BASE / 'frames'
    if MODE != 'test' and old_key != key:
        if frames.exists() and any(frames.iterdir()):
            # Never silently reuse unrelated frames or delete an older render.
            if MODE == 'encode':
                raise RuntimeError('These frames do not have a matching launcher checkpoint. Render / Resume creates a verified render. For frames rendered manually, run assemble_video.py in Blender.')
            archive = BASE / ('frames-previous-' + str(time.time_ns()))
            frames.rename(archive)
        frames.mkdir(exist_ok=True)
        atomic_json(journal, {'fingerprint': key})
    done = completed_frames(BASE, manifest) if MODE != 'test' else []
    report(done=len(done), phase='preparing')
    if MODE == 'encode':
        if len(done) != total:
            raise RuntimeError('The PNG sequence is incomplete or contains damaged frames. Choose Render / Resume first.')
    else:
        setup = runpy.run_path(str(BASE / 'setup_scene.py'), run_name='__prism_setup__')
        scene = setup['scene']
        import bpy
        report(device=scene.get('Prism render device', 'See render.log'))
        if MODE == 'test':
            scene.render.resolution_percentage = 25
            scene.cycles.samples = 16
            scene.frame_set(1)
            scene.render.filepath = str(BASE / 'preview-partial.png')
            report(phase='testing')
            result = bpy.ops.render.render(write_still=True, animation=False, scene=scene.name)
            if 'FINISHED' not in result or not valid_png(BASE / 'preview-partial.png'):
                raise RuntimeError('Blender did not produce a complete preview PNG.')
            os.replace(BASE / 'preview-partial.png', BASE / 'preview.png')
            report(phase='preview', preview=str(BASE / 'preview.png'))
            return
        done_set = set(done)
        pending = [n for n in range(1, total + 1) if n not in done_set]
        began = time.monotonic()
        for i, n in enumerate(pending):
            if (BASE / 'pause-requested').exists():
                report(phase='paused', eta=None)
                return
            report(phase='rendering', frame=n)
            scene.frame_set(n)
            partial = frames / ('partial_%06d.png' % n)
            scene.render.filepath = str(partial)
            result = bpy.ops.render.render(write_still=True, animation=False, scene=scene.name)
            d = manifest['dimensions']
            if 'FINISHED' not in result or not valid_png(partial, (d['width'], d['height'])):
                raise RuntimeError('Frame %s was not completed at the expected packed resolution. See render.log.' % n)
            os.replace(partial, frame_path(BASE, n))
            elapsed = time.monotonic() - began
            report(done=len(done) + i + 1, eta=elapsed / (i + 1) * (len(pending) - i - 1))
        if (BASE / 'pause-requested').exists():
            report(phase='paused', eta=None)
            return
    report(phase='encoding', done=total, eta=None)
    result = runpy.run_path(str(BASE / 'assemble_video.py'), run_name='__prism_encode__')
    output = result['output']
    if not output.exists() or not output.stat().st_size:
        raise RuntimeError('Blender did not produce the MP4. Your PNG frames have been retained.')
    report(phase='complete', output=str(output))

job_lock = JobLock(BASE)
if not job_lock.acquire():
    raise RuntimeError('A Blender job is already running for this package.')
try:
    main()
except Exception as error:
    report(phase='error', error=str(error), eta=None)
    traceback.print_exc()
    raise

finally:
    job_lock.release()
