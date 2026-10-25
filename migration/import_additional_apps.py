"""Import the reviewed additional-app snapshot without editing the arcade."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen, Request
from urllib.parse import urlparse
import hashlib, json, subprocess, tarfile, tempfile, re, time, os

ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'migration/additional-apps-manifest.json').read_text())
def sha256(data):return hashlib.sha256(data).hexdigest()
def download(chunk,tmp):
    path=tmp/chunk['name'];url=chunk['url']
    if not re.fullmatch(r'app-objects-\d{3}\.bin',chunk['name']):raise ValueError('Invalid chunk name')
    origin=urlparse(url)
    if origin.scheme!='https' or origin.hostname not in {urlparse(u).hostname for u in manifest['transfer_origins']}:raise ValueError('Invalid transfer origin')
    for attempt in range(60):
        try:
            with urlopen(Request(url,headers={'User-Agent':'DrewsAppSourceImport/1.0'}),timeout=90) as r:data=r.read()
            if len(data)!=chunk['size'] or sha256(data)!=chunk['sha256']:raise ValueError('Chunk verification failed')
            path.write_bytes(data);return path
        except Exception:
            if attempt==59:raise
            time.sleep(10)
def blobsha(data):return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
with tempfile.TemporaryDirectory() as temp:
    tmp=Path(temp)
    with ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(lambda c:download(c,tmp),manifest['chunks']))
    bundle=tmp/'bundle.tar.gz';h=hashlib.sha256()
    with bundle.open('wb') as out:
        for c in manifest['chunks']:
            data=(tmp/c['name']).read_bytes();h.update(data);out.write(data)
    if h.hexdigest()!=manifest['bundle_sha256']:raise ValueError('Bundle verification failed')
    objects=tmp/'objects';objects.mkdir()
    with tarfile.open(bundle,'r:gz') as tar:
        for member in tar:
            if not member.isfile() or not re.fullmatch(r'[0-9a-f]{40}',member.name):raise ValueError('Unsafe archive member')
            data=tar.extractfile(member).read()
            if blobsha(data)!=member.name:raise ValueError('Object verification failed')
            (objects/member.name).write_bytes(data)
    for i,e in enumerate(manifest['files'],1):
        dest=ROOT/e['path']
        if not e['path'].startswith('additional-apps/') or not dest.resolve().is_relative_to(ROOT/'additional-apps'):raise ValueError('Unsafe destination')
        obj=objects/e['sha']
        data=obj.read_bytes() if obj.is_file() else subprocess.check_output(['git','cat-file','blob',e['sha']],cwd=ROOT)
        if len(data)!=e['size'] or sha256(data)!=e['sha256'] or blobsha(data)!=e['sha']:raise ValueError('File mismatch: '+e['path'])
        if dest.exists() and dest.read_bytes()!=data:raise ValueError('Refusing to replace an unrelated file: '+e['path'])
        dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
        os.chmod(dest,0o755 if e['mode']=='100755' else 0o644)
        if i%200==0:print(f'Imported and verified {i}/{len(manifest["files"])} files',flush=True)
print(f'Imported all {len(manifest["apps"])} apps and verified {len(manifest["files"])} files.',flush=True)
