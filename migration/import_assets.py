"""Import this reviewed public snapshot; refuse content drift or unsafe paths."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import Request, urlopen
from urllib.parse import urlparse
import base64, hashlib, json, time

ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'migration/assets.json').read_text())
def digest(data):return hashlib.sha256(data).hexdigest()
def load(entry):
    path=ROOT/entry['path']
    if not path.resolve().is_relative_to(ROOT) or '.git' in path.parts or '.github' in path.parts:
        raise ValueError('Invalid destination')
    url=entry['url'];host=urlparse(url).hostname or ''
    if not host.endswith('.musicaldrewby.chatgpt.site') or urlparse(url).scheme!='https':
        raise ValueError('Unapproved source')
    if path.is_file() and digest(path.read_bytes())==entry['sha256']:return
    data=None
    for attempt in range(4):
        try:
            with urlopen(Request(url,headers={'User-Agent':'MrDrewsArcadeMigration/1.0'}),timeout=60) as response:
                data=response.read()
            if digest(data)!=entry.get('source_sha256',entry['sha256']):
                raise ValueError('Source changed: '+entry['path'])
            break
        except Exception:
            if attempt==3:raise
            time.sleep(attempt+1)
    patch=entry.get('patch')
    if patch:
        data=data[:patch['start']]+base64.b64decode(patch['insert'])+data[patch['end']:]
    if digest(data)!=entry['sha256']:raise ValueError('Final hash mismatch: '+entry['path'])
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_bytes(data)

with ThreadPoolExecutor(max_workers=8) as pool:
    futures={pool.submit(load,e):e for e in manifest}
    for n,future in enumerate(as_completed(futures),1):
        future.result()
        if n%50==0:print(f'Verified {n}/{len(manifest)} files',flush=True)
for e in manifest:
    if digest((ROOT/e['path']).read_bytes())!=e['sha256']:raise ValueError(e['path'])
print(f'Imported and verified {len(manifest)} application files.',flush=True)
