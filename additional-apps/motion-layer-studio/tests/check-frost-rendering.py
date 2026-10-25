from pathlib import Path
import os,subprocess,tempfile
REPO=Path(__file__).resolve().parents[1];ROOT=Path(os.environ.get('MLS_FROST_OUTPUT',tempfile.mkdtemp(prefix='mls-frost-render-')))
subprocess.run(['node',str(REPO/'tests/check-frost-atlas.cjs')],env={**os.environ,'MLS_FROST_OUTPUT':str(ROOT)},check=True)
s=(REPO/'tests/check-rendering.py').read_text();a=s.index('E=C.CDLL');b=s.index('vs,fs,ns=extract');head=s[:s.index('REPO=')]+s[a:b]
head=head.replace('W,H=640,360','W,H=960,540');exec(head)
v='attribute vec2 a;varying vec2 uv;void main(){uv=(a+1.)*.5;gl_Position=vec4(a,0.,1.);}'
new=extract(REPO/'public/studio.html')[2];old=extract(ROOT/'before.html')[2];programs={'new':program(v,new),'old':program(v,old)}
# Reuse the GL setup and uniform helpers, not the unrelated effect tests.
a=s.index('b=U();G.glGenBuffers');b=s.index('def render(kind');exec(s[a:b])
# A high-contrast city test scene makes lens detail, blur ghosting and ice relief visible.
img=Image.new('RGB',(W,H),'#263b59');d=ImageDraw.Draw(img)
for y in range(H):d.line((0,y,W,y),fill=(int(25+y/H*25),int(39+y/H*19),int(66+y/H*6)))
rng=np.random.default_rng(144)
for x in range(-40,W,58):
 height=int(rng.uniform(100,360));top=H-height;d.rectangle((x,top,x+48,H),fill=(16,25,36))
 for xx in range(x+6,x+45,10):
  for yy in range(top+10,H,17):
   if rng.random()<.6:d.rectangle((xx,yy,xx+4,yy+7),fill=(int(rng.integers(100,220)),136,76))
d.line((0,H*.65,W,H*.58),fill='#527184',width=3)
bg=np.dstack((np.asarray(img),np.full((H,W),255,np.uint8))).astype(np.uint8);baseTex=texture(0,bg[::-1]);full=np.full((H,W,4),255,np.uint8);maskTex=texture(1,full);protectionTex=texture(4,np.zeros_like(bg))
meta=json.loads((ROOT/'frost.json').read_text());atlas=np.frombuffer((ROOT/'frost.rgba').read_bytes(),np.uint8).reshape(meta['height'],meta['width'],4);oldatlas=np.asarray(Image.open(ROOT/'old-atlas.png').convert('RGBA'));atlasTex=texture(2,atlas)
def upload(slot,tex,data):
 data=np.ascontiguousarray(data);G.glActiveTexture(0x84C0+slot);G.glBindTexture(0x0DE1,tex);G.glTexImage2D(0x0DE1,0,0x1908,data.shape[1],data.shape[0],0,0x1908,0x1401,data.ctypes.data)
def draw(mode=0,phase=0.,old=False,empty=False,masked=False,protected=False,params=None):
 p=programs['old' if old else 'new'];G.glUseProgram(p);a=G.glGetAttribLocation(p,b'a');G.glEnableVertexAttribArray(a);G.glVertexAttribPointer(a,2,0x1406,0,0,None)
 mask=np.zeros_like(full) if empty else full
 if masked:mask=np.asarray(Image.open(ROOT/'mask.png').convert('RGBA').resize((W,H)))
 upload(1,maskTex,mask);upload(4,protectionTex,full if protected else np.zeros_like(full));upload(2,atlasTex,oldatlas if old else atlas)
 u=dict(scene=0,maskTex=1,asset=2,protectionTex=4,kind=6,variant=mode,opacity=1.,aspect=W/H,feather=0.,respectProtection=1.,pixelSize=1/H,shape=(.5,.5,1.5,.88),style=(.42,.7,8.,.3),extras=(24.,.55,.18,0.),timing=(phase,0.,2371/997,0.),tint=(.878,.922,.929),tintB=(.769,.824,.847),glassMaterial=(.65,.5,2.4,13.),frostMaterial=(1/meta['width'],1/meta['height'],.7,.008))
 if old:u['tintB']=(.784,.592,1.)
 if params:u.update(params)
 for key,val in u.items():uni(p,key,val)
 G.glDrawArrays(4,0,6);G.glFinish();assert G.glGetError()==0
 out=np.empty((H,W,4),np.uint8);G.glReadPixels(0,0,W,H,0x1908,0x1401,out.ctypes.data);return out[::-1].copy()
rows=[]
for mode,title in [(0,'Frost crystals'),(1,'Condensation'),(2,'Cold wet glass')]:
 before=draw(mode,.2,old=True);after=draw(mode,.2);row=Image.new('RGB',(W*2,H+28),'#101820');row.paste(Image.fromarray(before[:,:,:3]),(0,28));row.paste(Image.fromarray(after[:,:,:3]),(W,28));d=ImageDraw.Draw(row);d.text((12,8),title+' — before',fill='white');d.text((W+12,8),'after',fill='white');rows.append(row)
 first=draw(mode,0.);last=draw(mode,1.);diff=np.abs(first.astype(int)-last.astype(int));assert diff.max()<=1,(mode,'loop',diff.max());assert np.abs(draw(mode,empty=True).astype(int)-bg.astype(int)).max()<=1;assert np.abs(draw(mode,protected=True).astype(int)-bg.astype(int)).max()<=1
 zero=draw(mode,params={'style':(0.,.7,8.,.3),'glassMaterial':(0.,0.,2.4,13.)});assert np.abs(zero.astype(int)-bg.astype(int)).max()<=1,(mode,'zero')
 print('PASS',title,'loop / mask / protection / zero',flush=True)
sheet=Image.new('RGB',(W*2,len(rows)*(H+28)))
for i,r in enumerate(rows):sheet.paste(r,(0,i*(H+28)))
sheet.save(ROOT/'comparison.png');Image.fromarray(draw(0)[:,:,:3]).save(ROOT/'frost-render.png');Image.fromarray(draw(1)[:,:,:3]).save(ROOT/'condensation-render.png')
# Mask-edge reference uses the separately generated atlas.
meta=json.loads((ROOT/'masked-frost.json').read_text());atlas=np.frombuffer((ROOT/'masked-frost.rgba').read_bytes(),np.uint8).reshape(meta['height'],meta['width'],4);Image.fromarray(draw(0,masked=True)[:,:,:3]).save(ROOT/'painted-edge.png')
print('Saved rendered comparisons',flush=True)
