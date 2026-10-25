"""Describe original generated atlases for offline, portable story export."""
import json,base64
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
source=root/'art-source/don-gato'
assets=[]
sheets=['rooftop','street','market','cemetery','don-gato','supporting-cats','doctor-walk','comedy-props','reactions','comedy-cast']
rows=[('don-gato',[(0,0,443,446),(443,0,888,446),(888,0,1331,446),(1331,0,1774,446),(0,446,525,887),(525,446,900,887),(900,446,1335,887),(1335,446,1774,887)],['sit','read','joy','jump','rest','awake','walk-a','walk-b'],['Seated','Reading his letter','Overjoyed','Surprised jump','Resting with bandage','Wide awake','Walking · step 1','Walking · step 2']),('supporting-cats',[(0,0,512,505),(512,0,1024,505),(1024,0,1536,505),(0,505,512,1024),(512,505,1024,1024),(1024,505,1536,1024)],['lady-happy','lady-sad','doctor-brown','doctor-gray','attendant-a','attendant-b'],['Lady cat · happy','Lady cat · handkerchief','Cat doctor · medical bag','Cat doctor · consultation','Attendant · step 1','Attendant · step 2'])]
rows.append(('doctor-walk',[(0, 0, 656, 599), (656, 0, 1312, 599), (0, 599, 656, 1199), (656, 599, 1312, 1199)],['brown-step-a','brown-step-b','gray-step-a','gray-step-b'],['Doctor Brown · step 1','Doctor Brown · step 2','Doctor Gray · step 1','Doctor Gray · step 2']))
rows.append(('comedy-props',[(0,0,512,520),(512,0,1020,520),(1020,0,1536,520),(0,520,512,1024),(512,520,1080,1024),(1080,520,1536,1024)],['mouse-wave','mouse-flower','fan','handkerchief','fish','clipboard'],['Tiny mouse · wave','Tiny mouse · oversized flower','Lady cat’s lace fan','Falling handkerchief','Don Gato’s secret sardine','Doctor’s illustrated clipboard']))
rows.append(('reactions',[(0,0,545,460),(545,0,1080,460),(1080,0,1536,460),(0,460,512,1024),(512,460,1024,1024),(1024,460,1536,1024)],['sniff','one-eye','bow','lady-wave','lady-fan-hide','lady-fan-peek'],['Don Gato · sniffing','Don Gato · one eye open','Don Gato · theatrical bow','Lady cat · shy wave','Lady cat · hiding behind fan','Lady cat · peeking over fan']))
rows.append(('comedy-cast',[(0,0,740,724),(740,0,1390,724),(1390,0,2172,724)],['doctor-listen','doctor-clipboard','lady-surprise'],['Doctor Brown · listening','Doctor Gray · reading clipboard','Lady cat · delighted surprise']))
for sheet,rects,names,labels in rows:
 im=Image.open(source/(sheet+'.png')).convert('RGBA')
 for rect,name,label in zip(rects,names,labels):
  alpha=im.crop(rect).getchannel('A');box=alpha.point(lambda n:255 if n>18 else 0).getbbox();l,t,r,b=box;l=max(0,l-2);t=max(0,t-2);r=min(rect[2]-rect[0],r+2);b=min(rect[3]-rect[1],b+2)
  crop=[rect[0]+l,rect[1]+t,r-l,b-t]
  assets.append(dict(id='don-gato-'+name,name=('Don Gato · '+label if sheet=='don-gato' else label),category='animals',themes=['dongato'],tags='Don Gato cat song felt musical story',donGatoSheet=sheet,donGatoCrop=crop,preparedSize=crop[2:],defaultWidth=250,nativeAlpha=True))
for i,(sheet,name) in enumerate([('rooftop','Don Gato · red rooftop'),('street','Don Gato · town street'),('market','Don Gato · fish market'),('cemetery','Don Gato · cemetery gate')]):
 assets.append(dict(id='bg'+str(96+i),name=name,category='places',themes=['dongato'],tags='Don Gato town roof street fish market cemetery funeral procession',donGatoSheet=sheet,preparedSize=list(Image.open(source/(sheet+'.png')).size),defaultWidth=1600,nativeAlpha=False))
(root/'art-source/don-gato/asset-metadata.json').write_text(json.dumps(assets,indent=2))
print('Described',len(assets),'artwork entries from',len(sheets),'original images.')
