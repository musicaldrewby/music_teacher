from pathlib import Path
from PIL import Image
import shutil, json

src=Path('/workspace/scratch/8a74088dcbfa/generated_images')
out=Path('/workspace/sites/felt-and-fable/story-source/three-little-pigs/art')
out.mkdir(parents=True,exist_ok=True)
raw=out/'source';raw.mkdir(exist_ok=True)
files={
 'meadow':'exec-36af7636-e155-49bd-ae11-6b7f9f75f5ba.png',
 'interior':'exec-2c701d5c-e3e0-4dbf-9417-7180d6f9ec39.png',
 'props-atlas':'exec-248316c3-ef7e-4349-a146-15af00c5deeb.png',
 'cast-atlas':'exec-ca9a408f-a23a-4e0e-9661-7a7c21912848.png',
 'cast-rejected-step-atlas':'exec-f586c98a-b99a-4a13-ada6-5feee4564f8c.png',
 'actions-atlas':'exec-78793871-dc79-4920-82e4-3d542ed71855.png'
}
for name,file in files.items():shutil.copy2(src/file,raw/(name+'.png'))
for p in Path(__file__).parent.glob('prompt*'):shutil.copy2(p,raw/p.name)
manifest={}
def save(name,im,**extra):
 im.save(out/(name+'.png'),optimize=True)
 manifest[name]={'filename':name+'.png','width':im.width,'height':im.height,**extra}
for name in ('meadow','interior'):save(name,Image.open(src/files[name]))
props=Image.open(src/files['props-atlas'])
boxes={
 'straw-house':(8,15,442,432),
 'stick-house':(447,17,884,432),
 'brick-house':(885,9,1343,432),
 'tub':(1365,152,1770,439),
 'rabbit':(130,436,329,872),
 'table':(410,550,941,846),
 'flower':(1008,442,1254,867),
 'buns':(1369,505,1745,857)
}
for name,box in boxes.items():save(name,props.crop(box),source='props-atlas',sourceBox=list(box))

# Register cast without rescaling. Ground height and torso center define each
# frame's placement; head size remains at the original generated scale.
cast=Image.open(src/files['cast-atlas'])
rows={
 'pip':{'y':(0,338),'ground':330,'centers':[190,553,914]},
 'poppy':{'y':(339,695),'ground':688,'centers':[187,551,912]},
 'bruno':{'y':(695,1039),'ground':1036,'centers':[187,548,912]},
 'wolf':{'y':(1039,1448),'ground':1431,'centers':[185,546,908]}
}
for name,info in rows.items():
 for col,pose in ((0,'stand'),(1,'walk-a')):
  x1,x2=([25,360],[375,725])[col]
  y1,y2=info['y']
  box=(x1,y1,x2,y2)
  piece=cast.crop(box)
  im=Image.new('RGBA',(384,448))
  abox=piece.getchannel('A').point(lambda v:255 if v>32 else 0).getbbox()
  offset=(192-(info['centers'][col]-x1),432-abox[3])
  im.alpha_composite(piece,offset)
  save(name+'-'+pose,im,source='cast-atlas',sourceBox=list(box),sourceScale=1,footAnchor=[192,432],registrationOffset=list(offset),character=name)

# Action scale is determined from head size relative to the standing cast,
# not from total pose height. Reclining and seated poses stay shorter.
actions=Image.open(src/files['actions-atlas'])
action_specs={
 'pip-sleep':((30,100,590,483),.56,280),
 'poppy-flower':((640,8,915,500),.69,781),
 'bruno-build':((1066,41,1518,479),.70,1284),
 'wolf-puff':((31,480,500,1015),.66,275),
 'wolf-sit':((543,546,1055,1012),.64,798),
 'wolf-wet':((1068,478,1498,1011),.64,1281)
}
for name,(box,scale,center) in action_specs.items():
 piece=actions.crop(box)
 piece=piece.resize((round(piece.width*scale),round(piece.height*scale)),Image.Resampling.LANCZOS)
 im=Image.new('RGBA',(384,448))
 abox=piece.getchannel('A').point(lambda v:255 if v>32 else 0).getbbox()
 offset=(round(192-(center-box[0])*scale),432-abox[3])
 im.alpha_composite(piece,offset)
 save(name,im,source='actions-atlas',sourceBox=list(box),sourceScale=scale,footAnchor=[192,432],registrationOffset=list(offset),character=name.split('-')[0])

meta={
 'assets':manifest,
 'stageGuides':{
  'interior':{'size':[1672,941],'closedDoor':[52,167,287,613],'doorThreshold':[177,612],'fireplaceOpening':[1100,342,1585,588],'hearthFrontY':649,'window':[447,191,693,448]},
  'meadow':{'size':[1672,941],'openStage':[180,500,1490,840],'pathTopY':647,'pathBottomY':866},
  'brick-house':{'doorOpening':[233,256,299,398],'chimneyOpeningCenter':[354,20],'chimneyTopWidth':84},
  'straw-house':{'doorOpening':[242,257,330,392]},
  'stick-house':{'doorOpening':[245,257,328,397]}
 },
 'limitations':[
  'Only stand and walk-a are approved. Original generated walking columns repeat the same leading leg; corrected third column still leads with the same leg and moves same-side arm, so it is retained only as rejected source. Do not use it as an anatomically correct alternating walk.',
  'A separate opposite-step generation failed due to an image tool output moderation rejection; no true walk-b is delivered.',
  'Action poses are complete authored illustrations with contacts baked into the artwork. They are not skeletal IK poses.',
  'Backgrounds are 1672x941; modest zoom recommended.',
  'Poppy action flower is slightly smaller than separate flower prop; preserve action artwork scale when swapping.',
  'All cast crops are registered at native scale on 384x448 transparent canvases; action scale matches approximate head size rather than full pose height.'
 ]
}
(out/'manifest.json').write_text(json.dumps(meta,indent=2)+'\n')
shutil.copy2(__file__,raw/'prepare_assets.py')
print(json.dumps({'output':str(out),'assets':len(manifest),'keys':list(manifest)},indent=2))
