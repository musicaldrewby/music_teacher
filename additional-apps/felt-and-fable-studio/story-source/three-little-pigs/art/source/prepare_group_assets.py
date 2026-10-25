from pathlib import Path
from PIL import Image
import json, shutil

root=Path('/workspace/sites/felt-and-fable/story-source/three-little-pigs/art')
generated=Path('/workspace/scratch/8a74088dcbfa/generated_images')
shutil.copy2(generated/'exec-a3e8c766-49aa-40d6-b35e-2bd7447226e1.png',root/'source/groups-rejected-contact-atlas.png')
shutil.copy2(generated/'exec-de4fb944-fd79-4da4-a1ad-75c1e88cca3a.png',root/'source/groups-atlas.png')
atlas=Image.open(root/'source/groups-atlas.png')
manifest=json.loads((root/'manifest.json').read_text())
for name,box in {'pig-tub-push':(230,40,1180,602),'pigs-spoons':(114,603,1268,1144)}.items():
 im=atlas.crop(box)
 im.save(root/(name+'.png'),optimize=True)
 alpha=im.getchannel('A').point(lambda p:255 if p>32 else 0)
 visible=alpha.getbbox()
 manifest['assets'][name]={
  'filename':name+'.png','width':im.width,'height':im.height,
  'source':'groups-atlas','sourceBox':list(box),'sourceScale':1,
  'visibleBox':list(visible),'footAnchor':[round(im.width/2),visible[3]],
  'groupAsset':True,'referenceHeadHeight':190,
  'contactNotes':'All six hands meet tub rim. Far-side legs naturally occluded by tub.' if name=='pig-tub-push' else 'Each spoon is held by a visible bent forearm/hand; other hands rest on table.'
 }
(root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print({name:manifest['assets'][name] for name in ['pig-tub-push','pigs-spoons']})
