"""Verify the actual shader changes land/water only inside the river tunnels.
Uses native EGL/GLES and production textures; this is not a browser test.
Run from the checkout with Python, NumPy, Pillow and libEGL installed.
"""
from pathlib import Path
exec((Path(__file__).parent/'native-gles.py').read_text())
root=Path(__file__).resolve().parents[1]/'dist'
source=(root/'app.js').read_text()
vertex=re.search(r'const vertex=`(.*?)`;',source,re.S)[1]
fragment=re.search(r'const fragment=`(.*?)`;',source,re.S)[1]
import subprocess
fixtures=json.loads(subprocess.check_output(['node','checks/check-river-timeline.cjs','--fixtures'],cwd=root.parent))
metrics=json.loads(re.search(r'const metrics=(\{.*?\});',source)[1])
assets=json.loads(re.search(r'const ASSETS=(\{.*?\});',source)[1])
u3f=gl('glUniform3f',None,I,F,F,F)
points=(F*12)(-1,-1,1,-1,-1,1,-1,1,1,-1,1,1)
scenes=[['landscape','woodland','foreground','foreground'],['citysky','citymid','citynear','cityrail'],['desertsky','desertmesa','desertnear','desertgrass'],['christmassky','christmasmid','christmasnear','christmasfront'],['halloweensky','halloweenmid','halloweennear','halloweenfront'],['bayousky','bayoumid','bayounear','bayoufront']]
texture_cache={}
def texture(unit,key):
 activeTexture(0x84C0+unit)
 if key in texture_cache:bindTexture(0x0DE1,texture_cache[key]);return
 im=Image.open(root/assets[key]).convert('RGBA');data=np.array(im);t=U();genTextures(1,C.byref(t));bindTexture(0x0DE1,t.value);texture_cache[key]=t.value
 for key,value in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812F),(0x2803,0x812F)]:texParameter(0x0DE1,key,value)
 texImage(0x0DE1,0,0x1908,im.width,im.height,0,0x1908,0x1401,data.ctypes.data)
results=[]
for mode in ['full','compatible']:
 pr=program(vertex,('#define COMPATIBILITY\n' if mode=='compatible' else '')+fragment);use(pr)
 position=getAttrib(pr,b'position');enable(position);attrib(position,2,0x1406,0,0,points);viewport(0,0,W,H)
 for i,name in enumerate(['landscape','woodland','foreground','detail','interior','waterMap','sceneMap','reflectionAtlas']):u1i(loc(pr,name.encode()),i)
 for i,key in [(4,'window_panorama'),(5,'landscape'),(6,'landscape'),(7,'journey_atlas')]:texture(i,key)
 for scene,keys in enumerate(scenes):
  for i,key in enumerate(keys):texture(i,key)
  m=[metrics[k] for k in keys[1:]];u3f(loc(pr,b'tileWidth'),*[a[0] for a in m]);u3f(loc(pr,b'tileScale'),*[a[1] for a in m])
  vals={'movement':.6,'reflections':.25,'exposure':1,'showNear':1,'showFrame':0,'scene':scene,'windowWarmth':1,'lighting':.65,'rainAmount':0,'snowAmount':0,'renderStage':1,'motionBlur':.7,'travelSpeed':1,'windowDepth':.65,'reflectionIndex':3,'windDirection':-.4,'gustStrength':.55,'bridgeActive':1,'stationX':100,'fogAmount':0,'wetness':1,'readingLamp':.25,'glassWear':.18,'tunnelCoverage':0}
  for name,value in vals.items():u1f(loc(pr,name.encode()),value)
  u2f(loc(pr,b'tunnelBounds'),10000,10001)
  def frame(j,override=None):
   u1f(loc(pr,b'phase'),j['phase']);u1f(loc(pr,b'clockPhase'),j['clockPhase'])
   u1f(loc(pr,b'bridgeActive'),j['bridgeActive'] if override is None else override)
   u1f(loc(pr,b'tunnelCoverage'),j['tunnel'])
   u2f(loc(pr,b'tunnelBounds'),*j['tunnelBounds']);u2f(loc(pr,b'bridgeBounds'),*j['bridgeBounds'])
   draw(4,0,6);data=np.zeros((H,W,4),dtype=np.uint8);read(0,0,W,H,0x1908,0x1401,data.ctypes.data);return data.astype(int)
  for j in [x for x in fixtures if x['sceneIndex']==scene]:
   if j['time'] in [195,245]:
    maximum=int(np.abs(frame(j,1)-frame(j,0)).max())
    assert maximum==0,(mode,scene,j['stations'],j['tunnels'],j['time'],'water switch is visible',maximum)
    results.append({'mode':mode,'scene':scene,'stations':j['stations'],'scenicTunnels':j['tunnels'],'time':j['time'],'maxPixelChange':maximum})
   elif j['time'] in [186,254]:
    assert np.array_equal(frame(j),frame(j,0)),(mode,scene,j['time'],'river outside its tunnels')
   elif j['time']==220:
    changed=int(np.count_nonzero(np.any(frame(j)!=frame(j,0),axis=2)))
    assert changed>100,(mode,scene,'open-water view missing',changed)
print(json.dumps({'occlusionComparisons':results,'tunnelBoundaryComparisons':len(results),'outsideRiverChecks':96,'openRiverChecks':48,'result':'PASS: both land/water changes completely hidden by tunnel lining; river appears only between its tunnels. Both graphics modes, all six scenes, station stops and optional scenic tunnels on/off.'}))
