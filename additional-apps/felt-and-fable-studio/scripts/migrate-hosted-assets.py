"""Verify/copy existing assets into the Site bucket. No credentials are saved.
Run from the repository. Enter a JSON object containing service and admin tokens
at the hidden prompt. Site service credentials only go to the declared Site URL.
"""
import concurrent.futures, getpass, hashlib, json, pathlib, sys, urllib.request

ROOT=pathlib.Path(__file__).resolve().parent.parent
ORIGIN='https://felt-and-fable-studio.musicaldrewby.chatgpt.site'
manifest=json.loads((ROOT/'lib/asset-manifest.json').read_text())
credentials=json.loads(getpass.getpass('Credentials JSON (hidden): '))
headers={'OAI-Sites-Authorization':'Bearer '+credentials['service'],'Authorization':'Bearer '+credentials['admin'],'Content-Type':'application/json'}
action='verify' if '--verify-only' in sys.argv else 'seed'
paths=list(manifest['files'])
batches=[paths[i:i+4] for i in range(0,len(paths),4)]
verified={}

def migrate(batch):
 data=json.dumps({'action':action,'paths':batch}).encode()
 req=urllib.request.Request(ORIGIN+'/api/asset-storage',data=data,headers=headers,method='POST')
 with urllib.request.urlopen(req,timeout=90) as response:result=json.load(response)
 assert sorted(r['path'] for r in result['files'])==sorted(batch)
 for row in result['files']:
  expected=manifest['files'][row['path']]
  assert row['sha256']==expected['sha256'] and row['bytes']==expected['bytes']
 return {r['path']:r['sha256'] for r in result['files']}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for result in pool.map(migrate,batches):
  verified.update(result)
  if len(verified)%24==0 or len(verified)==len(paths):print(f'Verified {len(verified)} / {len(paths)} stored assets',flush=True)

digest=hashlib.sha256(json.dumps(manifest,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
proof={'manifestSha256':digest,'site':ORIGIN,'files':verified}
(ROOT/'asset-storage-verified.json').write_text(json.dumps(proof,indent=2)+'\n')
print('Every stored file matches the original bytes. Ready for the smaller build.',flush=True)
