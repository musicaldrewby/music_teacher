from pathlib import Path
from PIL import Image
import json,base64,io
root=Path(__file__).resolve().parents[1]
assets=root/'public/assets'
meta=json.loads((root/'art-source/story-props/metadata.json').read_text())
packs={}; closed=[]; variants=[]
sheet=Image.new('RGBA',(128*3,128))
for i,(key,name,width) in enumerate([('storybook','Opening storybook',310),('gift','Opening gift box',320),('door','Opening cottage door',650)]):
 states={}
 for state in ['closed','open']:
  assetid='story-'+key+'-'+state
  file=assets/'story-props'/f'{key}-{state}.webp'
  data='data:image/webp;base64,'+base64.b64encode(file.read_bytes()).decode()
  prepared='assets/story-props/'+f'{key}-{state}.js'
  (root/'public'/prepared).write_text('FELT_DATA['+json.dumps(assetid)+']='+json.dumps(data)+';\n')
  entry={'id':assetid,'name':name,'category':'objects','themes':['interactive'],'tags':'interactive story open close gift book door state reveal','cinema':True,'nativeAlpha':True,'prepared':prepared,'preparedSize':[512,512],'defaultWidth':width,'storyPack':key}
  states[state]=assetid
  if state=='closed':
   closed.append(entry)
   im=Image.open(file).convert('RGBA');im.thumbnail((128,128),Image.Resampling.LANCZOS);sheet.alpha_composite(im,(i*128,0))
  else: variants.append(entry)
 packs[key]={'name':name,'width':width,'anchor':meta['props'][key]['anchor'],'states':states}
b=io.BytesIO();sheet.save(b,format='WEBP',quality=86)
preview='data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode()
code="'use strict';\nconst STORY_PROP_PACKS="+json.dumps(packs,separators=(',',':'))+";window.STORY_PROP_PACKS=STORY_PROP_PACKS;\nconst STORY_PROP_ART="+json.dumps(closed,separators=(',',':'))+";\nconst STORY_PROP_VARIANTS="+json.dumps(variants,separators=(',',':'))+";\nART.pieces.push(...STORY_PROP_ART);\nconst STORY_PROP_PREVIEWS="+json.dumps(preview)+";\nasync function loadStoryPropThumbnails(){const im=new Image();im.src=STORY_PROP_PREVIEWS;await im.decode();for(let i=0;i<STORY_PROP_ART.length;i++){const c=makeCanvas(128,128);c.getContext('2d').drawImage(im,i*128,0,128,128,0,0,128,128);thumbMap.set(STORY_PROP_ART[i].id,c)}}\n"
(assets/'story-props-catalog.js').write_text(code)
print('Packaged 3 interactive props, 6 lazy state assets; thumbnail bytes',len(b.getvalue()))
