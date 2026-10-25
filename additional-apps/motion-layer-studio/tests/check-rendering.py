import ctypes as C,ctypes.util,re,json,math,time,subprocess,os,tempfile
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
REPO=Path(__file__).resolve().parents[1]
ROOT=Path(os.environ.get('MLS_RENDER_OUTPUT',tempfile.mkdtemp(prefix='mls-render-')))
ROOT.mkdir(parents=True,exist_ok=True)
(ROOT/'before.html').write_bytes(subprocess.check_output(['git','show','522812e8af3198733c1757b823ee7fba53221ae1:dist/index.html'],cwd=REPO))
E=C.CDLL(ctypes.util.find_library('EGL'));G=C.CDLL(ctypes.util.find_library('GL'))
def fn(lib,name,rest,args):
 f=getattr(lib,name);f.restype=rest;f.argtypes=args;return f
ptr=C.c_void_p;I=C.c_int;U=C.c_uint;F=C.c_float;S=C.c_char_p
fn(E,'eglGetProcAddress',ptr,[S]);platform=C.CFUNCTYPE(ptr,U,ptr,C.POINTER(I))(E.eglGetProcAddress(b'eglGetPlatformDisplayEXT'))
display=platform(0x31DD,None,None);fn(E,'eglInitialize',U,[ptr,C.POINTER(I),C.POINTER(I)])(display,None,None)
fn(E,'eglBindAPI',U,[U])(0x30A0)
attrs=(I*15)(0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3033,1,0x3040,4,0x3038,0x3038,0x3038);config=ptr();num=I()
assert fn(E,'eglChooseConfig',U,[ptr,C.POINTER(I),C.POINTER(ptr),I,C.POINTER(I)])(display,attrs,C.byref(config),1,C.byref(num))
W,H=640,360
surf=fn(E,'eglCreatePbufferSurface',ptr,[ptr,ptr,C.POINTER(I)])(display,config,(I*5)(0x3057,W,0x3056,H,0x3038))
ctx=fn(E,'eglCreateContext',ptr,[ptr,ptr,ptr,C.POINTER(I)])(display,config,None,(I*3)(0x3098,2,0x3038))
assert fn(E,'eglMakeCurrent',U,[ptr,ptr,ptr,ptr])(display,surf,surf,ctx)
for name,rest,args in [
 ('glCreateShader',U,[U]),('glShaderSource',None,[U,I,C.POINTER(S),C.POINTER(I)]),('glCompileShader',None,[U]),('glGetShaderiv',None,[U,U,C.POINTER(I)]),('glGetShaderInfoLog',None,[U,I,C.POINTER(I),ptr]),('glCreateProgram',U,[]),('glAttachShader',None,[U,U]),('glLinkProgram',None,[U]),('glGetProgramiv',None,[U,U,C.POINTER(I)]),('glGetProgramInfoLog',None,[U,I,C.POINTER(I),ptr]),('glUseProgram',None,[U]),('glGetAttribLocation',I,[U,S]),('glEnableVertexAttribArray',None,[U]),('glVertexAttribPointer',None,[U,I,U,U,I,ptr]),('glGenBuffers',None,[I,C.POINTER(U)]),('glBindBuffer',None,[U,U]),('glBufferData',None,[U,C.c_ssize_t,ptr,U]),('glGetUniformLocation',I,[U,S]),('glUniform1i',None,[I,I]),('glUniform1f',None,[I,F]),('glUniform2f',None,[I,F,F]),('glUniform3f',None,[I,F,F,F]),('glUniform4f',None,[I,F,F,F,F]),('glGenTextures',None,[I,C.POINTER(U)]),('glActiveTexture',None,[U]),('glBindTexture',None,[U,U]),('glTexParameteri',None,[U,U,I]),('glTexImage2D',None,[U,I,I,I,I,I,U,U,ptr]),('glDrawArrays',None,[U,I,I]),('glReadPixels',None,[I,I,I,I,U,U,ptr]),('glViewport',None,[I,I,I,I]),('glGetError',U,[]),('glGetString',S,[U]),('glFinish',None,[])]:fn(G,name,rest,args)
print('GPU',G.glGetString(0x1F02).decode(),flush=True)
def compile(src,kind):
 sh=G.glCreateShader(kind);b=S(src.encode());G.glShaderSource(sh,1,C.byref(b),None);G.glCompileShader(sh);ok=I();G.glGetShaderiv(sh,0x8B81,C.byref(ok))
 if not ok.value:
  log=C.create_string_buffer(32000);G.glGetShaderInfoLog(sh,len(log),None,log);raise RuntimeError(log.value.decode())
 return sh
def program(vs,fs):
 p=G.glCreateProgram();G.glAttachShader(p,compile(vs,0x8B31));G.glAttachShader(p,compile(fs,0x8B30));G.glLinkProgram(p);ok=I();G.glGetProgramiv(p,0x8B82,C.byref(ok))
 if not ok.value:
  log=C.create_string_buffer(32000);G.glGetProgramInfoLog(p,len(log),None,log);raise RuntimeError(log.value.decode())
 return p
def extract(path):
 s=Path(path).read_text();return re.search(r'const VS=`(.*?)`;',s,re.S)[1],re.search(r'const FS=`(.*?)`;',s,re.S)[1],json.loads(re.search(r'const NATURE_FS=("(?:\\.|[^"\\])*");',s)[1])
vs,fs,ns=extract(REPO/'public/studio.html');bv,bf,bn=extract(ROOT/'before.html')
programs={}
for label,v,f in [('main',vs,fs),('nature','attribute vec2 a;varying vec2 uv;void main(){uv=(a+1.)*.5;gl_Position=vec4(a,0.,1.);}',ns),('before',bv,bf),('natureBefore','attribute vec2 a;varying vec2 uv;void main(){uv=(a+1.)*.5;gl_Position=vec4(a,0.,1.);}',bn)]:
 programs[label]=program(v,f);print('COMPILED',label,flush=True)
b=U();G.glGenBuffers(1,C.byref(b));G.glBindBuffer(0x8892,b.value);verts=np.array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1],dtype=np.float32);G.glBufferData(0x8892,verts.nbytes,verts.ctypes.data,0x88E4)
G.glViewport(0,0,W,H)
textures=[]
def texture(slot,data):
 data=np.ascontiguousarray(data,dtype=np.uint8);tex=U();G.glGenTextures(1,C.byref(tex));textures.append(tex.value);G.glActiveTexture(0x84C0+slot);G.glBindTexture(0x0DE1,tex.value)
 for k,v in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812F),(0x2803,0x812F)]:G.glTexParameteri(0x0DE1,k,v)
 G.glTexImage2D(0x0DE1,0,0x1908,data.shape[1],data.shape[0],0,0x1908,0x1401,data.ctypes.data)
 return tex.value
Y,X=np.mgrid[0:H,0:W];rng=np.random.default_rng(531)
bg=np.zeros((H,W,4),np.uint8);bg[:,:,:3]=np.clip(np.stack([20+Y*.13+25*np.sin(X*.025),35+Y*.08+20*np.sin(Y*.067),50+Y*.12+20*np.sin(X*.012+Y*.04)],-1),0,255);bg[:,:,3]=255
# Fine spatial structure makes stretching and subpixel lenses visible.
bg[::17,:,:3]+=18;bg[:,::37,:3]+=15
for k in range(12):
 cx=int(rng.uniform(0,W));cy=int(rng.uniform(0,H));r=int(rng.uniform(2,8));mask=(X-cx)**2+(Y-cy)**2<r*r;bg[mask,:3]=[195,156,92]
baseTex=texture(0,bg[::-1]);full=np.full((H,W,4),255,np.uint8);maskTex=texture(1,full);texture(2,bg)
field=np.zeros((H,W,4),np.uint8);field[:,:,:]=[142,158,255,210];texture(3,field)
texture(4,np.zeros_like(bg));texture(5,np.zeros_like(bg));texture(6,np.zeros_like(bg));texture(7,np.zeros_like(bg))
def uni(p,name,value):
 loc=G.glGetUniformLocation(p,name.encode())
 if loc<0:return
 if isinstance(value,int):G.glUniform1i(loc,value)
 elif isinstance(value,(float,np.float64)):G.glUniform1f(loc,value)
 else:getattr(G,'glUniform%df'%len(value))(loc,*value)
def render(kind,phase=0.,old=False,empty=False,params=None):
 nature=kind in ['flame','foliage','caustics','dappled'];p=programs[('natureBefore' if old else 'nature') if nature else ('before' if old else 'main')];G.glUseProgram(p);a=G.glGetAttribLocation(p,b'a');G.glEnableVertexAttribArray(a);G.glVertexAttribPointer(a,2,0x1406,0,0,None)
 G.glActiveTexture(0x84C0+1);G.glBindTexture(0x0DE1,maskTex);data=np.zeros_like(full) if empty else full;G.glTexImage2D(0x0DE1,0,0x1908,W,H,0,0x1908,0x1401,data.ctypes.data)
 defaults=dict(scene=0,maskTex=1,asset=2,flowMap=3,protectionTex=4,depthTex=5,attachmentTex=6,footageB=7,phase=phase,opacity=1.,strength=.3,detail=.4,cycles=1.,direction=0.,radius=.28,feather=.0,aspect=W/H,center=(.5,.85),flow=(0.,0.),tint=(.7,.73,.76),loopSeconds=10.,pixelSize=1/H,perspective=.35,spray=.35,scatter=.6,respectProtection=1.,flowCycles=3.,flowTravel=1.,flowTurbulence=.08,fx=(.65,0.,0.,0.),glassSize=5.,glassSlide=.8,glassTrails=.8,glassHighlight=.65,glassSpeed=1.,glassRunLength=110.,glassContrast=1.2)
 modes=dict(water=5,smoke=3,glass=20,flow=6,ripple=13,mist=12)
 if nature:
  defaults.update(kind=dict(flame=1,foliage=2,caustics=3,dappled=5)[kind],variant=1,pinCount=0,shape=(.5,.8,.18,.37),style=(1.,.5,.8,.3),timing=(phase,0.,2.3,.3),extras=(5.,.55,.3,0.),tint=(1.,.38,.04),tintB=(.2,.4,.8))
  if kind=='foliage':defaults['style']=(.006,.3,7.,.3)
  if kind=='caustics':defaults['style']=(.65,.18,9.,.3)
  if kind=='dappled':defaults['style']=(.5,.45,10.,.3)
 else:defaults['mode']=modes[kind]
 if kind=='smoke':defaults['fx']=(.75,.55,.18,.65)
 if kind=='water':defaults['fx']=(.6,.4,.25,.55)
 if kind=='glass':defaults['fx']=(.65,.8,.65,.5)
 if params:defaults.update(params)
 for key,val in defaults.items():uni(p,key,val)
 G.glDrawArrays(4,0,6);G.glFinish();err=G.glGetError();assert err==0,hex(err)
 out=np.empty((H,W,4),np.uint8);G.glReadPixels(0,0,W,H,0x1908,0x1401,out.ctypes.data);return out[::-1].copy()
rows=[];results=[]
for kind in ['water','flow','smoke','glass','ripple','mist','flame','foliage','caustics','dappled']:
 a=render(kind,.27,old=True);b=render(kind,.27);first=render(kind,0.);last=render(kind,1.);blank=render(kind,.27,empty=True)
 seam=np.abs(first.astype(int)-last.astype(int));maskdiff=np.abs(blank.astype(int)-bg.astype(int));assert seam.max()<=2,(kind,'loop',seam.max());assert maskdiff.max()<=1,(kind,'mask',maskdiff.max())
 # Motion near the loop boundary must be comparable on both sides, not just equal endpoints.
 prev=render(kind,1.-1/600);nxt=render(kind,1/600);left=np.mean(np.abs(prev.astype(float)-first));right=np.mean(np.abs(first.astype(float)-nxt));assert max(left,right)<max(.04,min(left,right))*6,(kind,left,right)
 print('PASS',kind,'loop max',seam.max(),'mask max',maskdiff.max(),'seam deltas',round(left,3),round(right,3),flush=True)
 results.append(dict(effect=kind,loop_max=int(seam.max()),empty_mask_max=int(maskdiff.max()),seam_left=float(left),seam_right=float(right)))
 if kind in ['water','smoke','glass','flame']:
  row=Image.new('RGB',(W*2,H+30),'#111821');row.paste(Image.fromarray(a[:,:,:3]),(0,30));row.paste(Image.fromarray(b[:,:,:3]),(W,30));d=ImageDraw.Draw(row);d.text((12,8),kind+' — before',fill='white');d.text((W+12,8),'after',fill='white');rows.append(row)
for kind in ['water','flow']:
 a=render(kind,.1,params={'strength':0.});assert np.abs(a.astype(int)-bg.astype(int)).max()<=1,kind+' zero strength'
for kind in ['water','smoke']:
 a=render(kind,.1,params={'cycles':0.});b=render(kind,.7,params={'cycles':0.});assert np.abs(a.astype(int)-b.astype(int)).max()<=1,kind+' freeze'
a=render('glass',.1,params={'glassSpeed':0.});b=render('glass',.7,params={'glassSpeed':0.});assert np.abs(a.astype(int)-b.astype(int)).max()<=1,'glass freeze'
sheet=Image.new('RGB',(W*2,len(rows)*(H+30)));y=0
for r in rows:sheet.paste(r,(0,y));y+=H+30
sheet.save(ROOT/'comparison.png');(ROOT/'gpu-results.json').write_text(json.dumps(results,indent=2));print('PASS zero motion and frozen-time checks',flush=True)
# A compact motion proof for visual review, produced directly from the actual shaders.
frames=[]
for i in range(36):
 a=render('smoke',i/36);b=render('flame',i/36);c=render('glass',i/36);f=Image.new('RGB',(W*3,H));f.paste(Image.fromarray(a[:,:,:3]),(0,0));f.paste(Image.fromarray(b[:,:,:3]),(W,0));f.paste(Image.fromarray(c[:,:,:3]),(W*2,0));frames.append(f.resize((960,180)))
frames[0].save(ROOT/'motion-check.gif',save_all=True,append_images=frames[1:],duration=100,loop=0)
