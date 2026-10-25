"""Run by Blender to launch its bundled Python as a separate local dashboard."""
import bpy
import json
import subprocess
import sys
import urllib.request
import webbrowser
from pathlib import Path

BASE = Path(sys.argv[sys.argv.index('--') + 1]).resolve() if '--' in sys.argv else Path(__file__).resolve().parent
(BASE / 'blender-path.txt').write_text(bpy.app.binary_path, encoding='utf-8')
# Reopen a running controller for this package instead of starting competing jobs.
try:
    info = json.loads((BASE / 'launcher-session.json').read_text(encoding='utf-8'))
    if info['url'].startswith('http://127.0.0.1:'):
        with urllib.request.urlopen(info['url'] + 'status', timeout=1) as response:
            if json.load(response).get('prismLauncher') == 1:
                webbrowser.open_new_tab(info['url'])
                print('Prism launcher:', info['url'])
                sys.exit(0)
except (OSError, ValueError, KeyError):
    pass
with (BASE / 'launcher.log').open('a', encoding='utf-8') as log:
    subprocess.Popen([sys.executable, *bpy.app.python_args, str(BASE / 'dashboard.py'),
                      '--blender', bpy.app.binary_path, '--package', str(BASE)],
                     cwd=str(BASE), stdout=log, stderr=log,
                     creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
print('Opening Prism Render Launcher. If no window appears, see launcher.log in the package folder.')
