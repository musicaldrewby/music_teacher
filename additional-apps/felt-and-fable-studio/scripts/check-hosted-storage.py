"""Read-only checks of the deployed editor and representative stored assets."""
import concurrent.futures,getpass,hashlib,json,pathlib,re,urllib.request
ROOT=pathlib.Path(__file__).resolve().parent.parent
ORIGIN='https://felt-and-fable-studio.musicaldrewby.chatgpt.site'
token=getpass.getpass('Site service credential (hidden): ')
headers={'OAI-Sites-Authorization':'Bearer '+token}
manifest=json.loads((ROOT/'lib/asset-manifest.json').read_text())['files']
html=(ROOT/'public/index.html').read_text()
paths=['/','/index.html']+['/'+p for p in re.findall(r'<script src="([^"]+)"',html)]+['/'+p for p in re.findall(r'<link[^>]+href="([^"]+\.css)"',html)]
for prefix in ['/assets/prepared/','/assets/danse-macabre/','/assets/story-props/','/assets/neural-v1/','/js/vendor/neural/','/js/vendor/pico/']:
 group=[p for p in manifest if p.startswith(prefix)];paths.extend([group[0],group[-1]])
paths.extend(['/js/vendor/neural/ort-wasm-simd-threaded.wasm','/assets/neural-v1/manifest.json'])
paths=list(dict.fromkeys(paths))
def check(path):
 req=urllib.request.Request(ORIGIN+path,headers=headers)
 with urllib.request.urlopen(req,timeout=60) as response:
  assert response.status==200,(path,response.status)
  body=response.read()
  expected=manifest[path]['sha256'] if path in manifest else hashlib.sha256((ROOT/('public/index.html' if path=='/' else 'public'+path)).read_bytes()).hexdigest()
  assert hashlib.sha256(body).hexdigest()==expected,('Live bytes differ',path)
  if path in manifest:assert response.headers.get('ETag')=='"'+expected+'"'
 return path
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 checked=list(pool.map(check,paths))
print(json.dumps({'checked':len(checked),'result':'All editor scripts/styles, home page, representative packs and speech WASM match source bytes.'}))
