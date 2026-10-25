from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, math, shutil

root=Path('/workspace/sites/felt-and-fable/story-source/wolf-rig/art')
atlas=Image.open(root/'source/wolf-parts-atlas.png').convert('RGBA')
shutil.copy2('/workspace/sites/felt-and-fable/story-source/three-little-pigs/art/wolf-stand.png',root/'source/identity-reference.png')
specs={
 'head-neutral':{'box':(21,7,438,402),'anchors':{'neck':(245,363),'eye':(254,204),'nose':(389,260)},'scale':.40},
 'head-listen':{'box':(428,18,823,403),'anchors':{'neck':(641,365),'eye':(652,205),'nose':(776,260)},'scale':.40},
 'head-surprise':{'box':(815,13,1161,403),'anchors':{'neck':(1018,366),'eye':(1042,206),'nose':(1120,258)},'scale':.40},
 'torso':{'box':(74,413,405,758),'anchors':{'neck':(250,450),'shoulderNear':(130,505),'shoulderFar':(371,496),'hipNear':(200,705),'hipFar':(300,705),'pelvis':(250,709)},'scale':.44},
 'upper-arm':{'box':(558,423,734,739),'anchors':{'start':(630,470),'end':(650,683),'shoulder':(630,470),'elbow':(650,683)},'scale':.28},
 'forearm':{'box':(938,425,1076,758),'anchors':{'start':(1003,481),'end':(1018,704),'elbow':(1003,481),'wrist':(1018,704)},'scale':.26},
 'hand-relaxed':{'box':(154,765,326,1019),'anchors':{'wrist':(207,819),'palm':(231,917),'fingertip':(247,987)},'scale':.25},
 'hand-knock':{'box':(459,833,696,985),'anchors':{'wrist':(490,906),'palm':(595,907),'contact':(676,903)},'scale':.25},
 'tail':{'box':(798,725,1139,1050),'windows':[(798,725,960,758),(798,758,1139,1050)],'anchors':{'base':(1104,916),'tip':(912,767)},'scale':.35},
 'thigh':{'box':(141,1013,325,1346),'anchors':{'start':(244,1060),'end':(210,1290),'hip':(244,1060),'knee':(210,1290)},'scale':.31},
 'shin':{'box':(534,1031,668,1338),'anchors':{'start':(600,1083),'end':(600,1304),'knee':(600,1083),'ankle':(600,1304)},'scale':.31},
 'foot':{'box':(841,1131,1110,1318),'anchors':{'ankle':(902,1186),'heel':(891,1266),'toe':(1075,1276),'sole':(993,1297)},'scale':.30}
}
assets={}
for key,s in specs.items():
 box=s['box'];piece=atlas.crop(box)
 if 'windows' in s:
  piece=Image.new('RGBA',(box[2]-box[0],box[3]-box[1]))
  for window in s['windows']:
   piece.alpha_composite(atlas.crop(window),(window[0]-box[0],window[1]-box[1]))
 anchors={name:(p[0]-box[0],p[1]-box[1]) for name,p in s['anchors'].items()}
 offset=(0,0)
 if key.startswith('head-'):
  neck=anchors['neck'];offset=(256-neck[0],390-neck[1])
  im=Image.new('RGBA',(480,432))
  im.alpha_composite(piece,offset)
  anchors={name:(p[0]+offset[0],p[1]+offset[1]) for name,p in anchors.items()}
 else: im=piece
 im.save(root/(key+'.png'),optimize=True)
 visible=im.getchannel('A').point(lambda p:255 if p>32 else 0).getbbox()
 data={'filename':key+'.png','width':im.width,'height':im.height,'sourceRect':list(box),'sourceWindows':s.get('windows',[box]),'sourceOffset':list(offset),'visibleBox':list(visible),'anchorsPx':anchors,'anchors':{name:[round(p[0]/im.width,6),round(p[1]/im.height,6)] for name,p in anchors.items()},'suggestedScaleAt440pxWolf':s['scale']}
 if 'start' in anchors:
  dx=anchors['end'][0]-anchors['start'][0];dy=anchors['end'][1]-anchors['start'][1]
  data['boneLengthPx']=round(math.hypot(dx,dy),3);data['boneAngleRadians']=round(math.atan2(dy,dx),6)
 assets[key]=data

guides={'nativeSize':[1672,941],'doorWoodBounds':[1138,194,1428,674],'stoneArchBounds':[1054,104,1504,717],'thresholdY':704,'knockTarget':[1215,480],'latchCenter':[1176,481],'suggestedFootY':790,'clearPathBounds':[200,720,1080,925],'note':'Door height is approximately480px, not requested570px. Use440px or slightly smaller wolf; select foot/arm target jointly for perspective.'}
manifest={'schemaVersion':1,'kind':'felt-modular-wolf-rig-art','orientation':'three-quarter-facing-right','atlas':'source/wolf-parts-atlas.png','atlasSize':list(atlas.size),'anchorUnits':'normalized to full cropped canvas; pixel anchors also supplied','parts':assets,'background':{'filename':'door-set.png',**guides},'notes':[
'Parts are generated felt art, cropped and registered mechanically; no pixel repainting or reconstructed limbs.',
'All three heads share480x432canvas and neck pivot[256,390]. Slight expression-related silhouette variation remains.',
'Torso shoulder discs are intentional cream-shirt overlap surfaces. Place near upperarm over near disc and far arm behind torso.',
'Upperarm gray shoulder cap belongs under torso overlap; rolled sleeve cuff is elbow end.',
'Component axis is defined by start/end anchors, not the crop vertical. Rotate along that vector when fitting a bone.',
'Thigh includes stitched fabric hem near its lower end; hide it under shin overlap if knee seam is visually too strong.',
'Tail base is at its rounded right-hand end; cream tip points upperleft.',
'Scale hints are approximate visual starting points. Engine joint lengths and limits determine actual rig proportions.',
'Head expression variants preserve wool design and ear/fur orientation; no fullside or back view is included.'
]}
(root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(root/'source/provenance.json').write_text(json.dumps({'generator':'built-in image_gen.imagegen','mode':'reference-guided generation','identityReference':'identity-reference.png','prompts':['prompt-modular-atlas.txt','prompt-door-set.txt'],'originalOutputs':{'atlas':'/workspace/scratch/8a74088dcbfa/generated_images/exec-a591fdc6-1352-4d9b-a9f0-cc6b39272b01.png','door':'/workspace/scratch/8a74088dcbfa/generated_images/exec-eb877f40-2f76-46e6-88ba-bd76229eb263.png'},'transformations':['rectangular crops','transparent padding','pixel translation for head registration'],'inspection':'inspection-parts.jpg annotates anchors on a separate QA sheet; delivered parts contain no annotation'},indent=2)+'\n')

# Separate engineering inspection sheet; original crops remain unannotated.
cellw,cellh=380,430
sheet=Image.new('RGB',(cellw*3,cellh*4),(218,225,217));draw=ImageDraw.Draw(sheet)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',17)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',11)
for i,(key,a) in enumerate(assets.items()):
 col,row=i%3,i//3
 im=Image.open(root/a['filename'])
 scale=min(1.0,(cellw-32)/im.width,(cellh-60)/im.height)
 thumb=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
 x=col*cellw+(cellw-thumb.width)//2;y=row*cellh+36+(cellh-50-thumb.height)//2
 sheet.paste(thumb,(x,y),thumb)
 draw.text((col*cellw+12,row*cellh+10),key,fill=(34,40,35),font=font)
 seen=set()
 for name,p in a['anchorsPx'].items():
  if tuple(p) in seen:continue
  seen.add(tuple(p));px=x+p[0]*scale;py=y+p[1]*scale
  draw.ellipse((px-3,py-3,px+3,py+3),fill=(205,35,28),outline=(255,255,255))
  draw.text((px+5,py-5),name,fill=(154,20,20),font=small)
sheet.save(root/'source/inspection-parts.jpg',quality=95)
print(json.dumps({'partCount':len(assets),'path':str(root),'manifest':str(root/'manifest.json'),'inspection':str(root/'source/inspection-parts.jpg')},indent=2))

