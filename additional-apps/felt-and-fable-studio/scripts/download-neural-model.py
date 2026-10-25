import json,urllib.request,hashlib,gzip
from pathlib import Path
root=Path(__file__).resolve().parent.parent/'dist/assets/neural-v1';root.mkdir(parents=True,exist_ok=True)
rev='1939ad2a8e416c0acfeecc08a694d14ef25f2231';base='https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/'+rev+'/'
files=['config.json','tokenizer.json','tokenizer_config.json','onnx/model_quantized.onnx']+['voices/'+s+'.bin' for s in ['af_heart','af_bella','af_sky','am_michael','am_puck','bm_fable']]
manifest={'model':'Kokoro-82M-v1.0','revision':rev,'sampleRate':24000,'license':'Apache-2.0','parts':[],'files':{}}
for name in files:
 data=urllib.request.urlopen(base+name,timeout=180).read()
 if name.endswith('.onnx'):
  for i,start in enumerate(range(0,len(data),10*1024*1024)):
   raw=data[start:start+10*1024*1024];b=gzip.compress(raw,compresslevel=9,mtime=0);file=f'model-{i+1:02}.gz.bin';(root/file).write_bytes(b);manifest['parts'].append({'file':file,'bytes':len(b),'rawBytes':len(raw),'encoding':'gzip','sha256':hashlib.sha256(b).hexdigest()})
 else:
  f=root/name;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(data);manifest['files'][name]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
 print(name,len(data),flush=True)
(root/'manifest.json').write_text(json.dumps(manifest,indent=2))
