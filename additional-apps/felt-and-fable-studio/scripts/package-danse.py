from pathlib import Path
from PIL import Image
import base64,io,json,shutil
root=Path(__file__).resolve().parents[1]
src=root/'art-source/danse-macabre'; out=root/'public/assets/danse-macabre';out.mkdir(parents=True,exist_ok=True)
entries=[('skeleton-dancer','Dancing skeleton','characters',270),('skeleton-percussionist','Skeleton percussionist','characters',270),('ghost-violinist','Ghost violinist','characters',380),('rooster','Dawn rooster','animals',250),('xylophone','Orchestral xylophone','instruments',550),('clock-tower','Clock tower · blank dial','places',430),('graveyard-moonlight','Moonlit graveyard','halloween',1600),('graveyard-sunrise','Graveyard at sunrise','halloween',1600)]
pieces=[];backs=[];allart=[];sheet=Image.new('RGBA',(128*4,128*2))
for i,(key,name,cat,width) in enumerate(entries):
 im=Image.open(src/(key+'.png')); bg=i>=6
 if bg: im=im.resize((1600,900),Image.Resampling.LANCZOS)
 else: im.thumbnail((1280,1280),Image.Resampling.LANCZOS)
 file=out/(key+'.webp');im.save(file,quality=91,method=6)
 id='bg'+str(94+i-6) if bg else 'danse-'+key
 data='data:image/webp;base64,'+base64.b64encode(file.read_bytes()).decode()
 prepared='assets/danse-macabre/'+key+'.js';(root/'public'/prepared).write_text('FELT_DATA['+json.dumps(id)+']='+json.dumps(data)+';\n')
 a={'id':id,'name':name,'category':cat,'themes':['danse','halloween']+(['orchestra'] if key=='xylophone' else []),'tags':'danse macabre halloween midnight music graveyard friendly spooky felt '+key,'cinema':True,'prepared':prepared,'preparedSize':list(im.size),'defaultWidth':width,'nativeAlpha':not bg,'danseThumb':[i%4*128,i//4*128,128,128]}
 (backs if bg else pieces).append(a);allart.append(a)
 th=im.convert('RGBA');th.thumbnail((124,124),Image.Resampling.LANCZOS);sheet.alpha_composite(th,(i%4*128+(128-th.width)//2,i//4*128+(128-th.height)//2))
b=io.BytesIO();sheet.save(b,format='WEBP',quality=85)
code="'use strict';\nconst DANSE_ART="+json.dumps(allart,separators=(',',':'))+";\nART.pieces.push(...DANSE_ART.filter(a=>!a.id.startsWith('bg')));ART.backgrounds.push(...DANSE_ART.filter(a=>a.id.startsWith('bg')));\nconst DANSE_PREVIEWS="+json.dumps('data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode())+";\nasync function loadDanseThumbnails(){const im=new Image();im.src=DANSE_PREVIEWS;await im.decode();for(const a of DANSE_ART){const [x,y,w,h]=a.danseThumb,c=makeCanvas(w,h);c.getContext('2d').drawImage(im,x,y,w,h,0,0,w,h);thumbMap.set(a.id,c)}}\n"
(root/'public/assets/danse-catalog.js').write_text(code)
print('Packaged',len(pieces),'pieces,',len(backs),'backdrops; thumbnail bytes',len(b.getvalue()))
