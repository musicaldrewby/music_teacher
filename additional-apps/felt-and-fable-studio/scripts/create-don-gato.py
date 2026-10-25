"""Author an editable Felt & Fable story, one manual cue per supplied lyric line."""
import json,copy,math
from pathlib import Path
root=Path(__file__).resolve().parents[1]
meta={a['id']:a for a in json.loads((root/'art-source/don-gato/asset-metadata.json').read_text())}
uid=0
def ident(stem):
 global uid;uid+=1;return f'{stem}-{uid}'
def asset(key,name,x,bottom,height,flip=False):
 a=meta[key];w,h=a['preparedSize'];return dict(id=ident(name),type='asset',asset=key,name=name,x=x,y=bottom-height/2,w=height*w/h,h=height,bw=w,bh=h,rotation=0,opacity=1,color=None,fiber=0,stitch=False,flipX=flip,depth='middle')
def pose(o):return {k:o.get(k,1 if k=='opacity' else 0) for k in ['x','y','w','h','rotation','opacity']}
def keys(o,frames):
 base=pose(o);o['keyframes']=[dict(t=t,ease='smooth',pose={**base,**changes}) for t,changes in frames];return o
def cat(kind='sit',x=790,bottom=470,height=260):return asset('don-gato-'+kind,'Don Gato',x,bottom,height)
def lady(sad=False,x=1470,bottom=470,height=230):return asset('don-gato-lady-'+('sad' if sad else 'happy'),'Lady cat',x,bottom,height)
def doctor(gray=False,x=420,bottom=800,height=330):return asset('don-gato-doctor-'+('gray' if gray else 'brown'),'Doctor Gray' if gray else 'Doctor Brown',x,bottom,height,gray)
def shape(name,x,y,w,h,color,kind='Heart'):
 return dict(id=ident(name),type='shape',name=name,shape=kind,x=x,y=y,w=w,h=h,bw=w,bh=h,rotation=0,opacity=1,color=color,fiber=.65,stitch=True)
def heart(x,y,w=56):return shape('Felt heart',x,y,w,w,'#cf5b65')
def float_heart(x,y,delay=0):
 o=heart(x,y);return keys(o,[(0,dict(opacity=0,y=y+20)),(delay+.25,dict(opacity=0,y=y+20)),(delay+.8,dict(opacity=.95,y=y)),(delay+1.8,dict(opacity=.8,y=y-25))])
def cam(x=800,y=450,z=1):return dict(x=x,y=y,zoom=z)
def move_camera(s,start,end,t=1.8):s['camera']={**start,'keys':[dict(t=0,ease='smooth',pose=start),dict(t=t,ease='smooth',pose=end)]}
def rooftop(with_lady=False):
 objects=[cat()]
 if with_lady:
  # The upper window's flowers mask the bottom of the lady cat, anchoring her behind the balcony.
  mask=asset('bg96','Balcony foreground mask',800,900,900);mask['w']=1600;mask['depth']='back';mask['locked']=True
  rail=dict(id=ident('balcony-rail-mask'),name='Balcony rail silhouette',type='path',points=[[1230,442],[1565,408],[1600,423],[1600,900],[1230,900]],x=800,y=450,w=1600,h=900,bw=1600,bh=900,rotation=0,opacity=1,color='#000000',fiber=0,stitch=False,depth='back',locked=True)
  l=lady();l['occlusion']=[dict(pieceId=rail['id'],rect=[0,0,1,1])]
  objects=[rail,mask]+objects+[l]
 return objects
lines=[
('Oh Senor Don Gato was a cat.','A letter on the roof','Singing freely'),
('On a high red roof Don Gato sat.','A letter on the roof','Singing freely'),
('He went there to read a letter, meow, meow, meow.','A letter on the roof','Singing freely'),
('Where the reading light was better, meow, meow, meow.','A letter on the roof','Singing freely'),
('’Twas a love note for Don Gato.','A letter on the roof','Singing freely'),
('“I adore you,” wrote the lady cat','The lady cat','Warmly'),
('Who was fluffy, white, and nice and fat.','The lady cat','Warmly'),
('There was not a sweeter kitty, meow, meow, meow,','The lady cat','Warmly'),
('In the country or the city, meow, meow, meow,','The lady cat','Warmly'),
('And she said she’d wed Don Gato.','The lady cat','Warmly'),
('Oh Don Gato jumped so happily.','A joyful leap','Faster'),
('He fell off the roof and broke his knee.','A joyful leap','Faster'),
('Broke his ribs and all his whiskers, meow, meow, meow,','A joyful leap','Faster'),
('And his little solar plexus, meow, meow, meow.','A joyful leap','Faster'),
('“Ay caramba!” cried Don Gato.','A joyful leap','Faster'),
('Then the doctors all came on the run','The doctors','Triple meter'),
('Just to see if something could be done','The doctors','Triple meter'),
('And they held a consultation, meow, meow, meow,','The doctors','Triple meter'),
('About how to save their patient, meow, meow, meow,','The doctors','Triple meter'),
('How to save Senor Don Gato.','The doctors','Triple meter'),
('But in spite of everything they tried,','A solemn farewell','Grave'),
('Poor Senor Don Gato up and died.','A solemn farewell','Grave'),
('Oh it wasn’t very merry, meow, meow, meow,','A solemn farewell','Grave'),
('Going to the cemetery, meow, meow, meow,','A solemn farewell','Grave'),
('For the ending of Don Gato.','A solemn farewell','Fermata · hold as long as you sing'),
('When the funeral passed the market square,','The fish market','Slow march…for now'),
('Such a smell of fish was in the air,','The fish market','Slow march…for now'),
('Though his burial was slated, meow, meow, meow,','The fish market','The surprise is coming'),
('He became reanimated, meow, meow, meow.','The fish market','Returning to life'),
('He came back to life, Don Gato. Ole!','The fish market','¡Olé!')]
scenes=[]
def scene(n,bg,items,camera=None,hold=2.0):
 text,section,direction=lines[n-1];s=dict(id=f'don-gato-phrase-{n:02d}',name=f'{n:02d} · {section}',bg=bg,bgColor='#e3cfad',caption=text,duration=max(4,hold),items=items,camera=camera or cam(),phrase=dict(id=f'don-gato-phrase-{n:02d}',section=f'Verse {(n-1)//5+1} · {section}',direction=direction,holdAt=hold));scenes.append(s);return s
s=scene(1,96,rooftop(),hold=0)
s=scene(2,96,rooftop());move_camera(s,cam(),cam(850,400,1.18))
s=scene(3,96,[cat('read')],cam(850,400,1.18),hold=0)
s=scene(4,96,[cat('read')]);move_camera(s,cam(850,400,1.18),cam(850,360,1.42))
s=scene(5,96,[cat('read'),float_heart(900,230)],cam(850,360,1.42))
s=scene(6,96,rooftop(True),cam(1180,345,1.7),hold=0)
s=scene(7,96,rooftop(True));move_camera(s,cam(1180,345,1.7),cam(1220,340,1.9))
s=scene(8,96,rooftop(True)+[float_heart(1275,220)],cam(1220,340,1.9))
s=scene(9,96,rooftop(True));move_camera(s,cam(1220,340,1.9),cam(890,400,1.12))
s=scene(10,96,rooftop(True)+[float_heart(970,230),float_heart(1120,190,.15)],cam(890,400,1.12),hold=2.1)
o=cat('joy');keys(o,[(0,{}),(.30,{'y':o['y']-60}),(1.1,{'x':990,'y':o['y']-100}),(1.65,{'x':990})]);scene(11,96,[o],cam(),hold=1.7)
o=cat('jump',990,470,250);keys(o,[(0,{}),(.3,{'x':1090,'y':o['y']+70,'rotation':12}),(.8,{'x':1180,'y':1000,'rotation':32,'opacity':1}),(.85,{'x':1180,'y':1100,'opacity':0})]);scene(12,96,[o],cam(),hold=.9)
def patient():return cat('rest',780,785,180)
s=scene(13,97,[patient()],cam(800,660,1.5),hold=0)
s=scene(14,97,[patient()]);move_camera(s,cam(800,660,1.5),cam(800,660,1.7))
o=cat('awake',780,785,260);scene(15,97,[o],cam(800,650,1.6),hold=0)
a=doctor(False,430);b=doctor(True,1140);keys(a,[(0,{'x':-100}),(1.8,{'x':430})]);keys(b,[(0,{'x':1720}),(1.8,{'x':1140})]);
for who,color,front in [(a,'brown','doctor-brown'),(b,'gray','doctor-gray')]:
 who['flipX']=False
 variants=[color+'-step-a',color+'-step-b',front]
 who['illustration']=dict(defaultPose=variants[0],facing='artwork',poses=[dict(id=k,name=k,asset='don-gato-'+k,facing=('left' if color=='gray' and 'step' in k else 'right' if 'step' in k else 'front')) for k in variants],changes=[dict(id=ident('doctor-step'),time=i*.20,poseId=variants[i%2],facing='artwork') for i in range(1,9)]+[dict(id=ident('doctor-stop'),time=1.8,poseId=front,facing='artwork')])
scene(16,97,[patient(),a,b],hold=1.8)
a=doctor(False,430);b=doctor(True,1140);keys(a,[(0,{}),(1.2,{'rotation':8})]);keys(b,[(0,{}),(1.2,{'rotation':-6})]);scene(17,97,[patient(),a,b],cam(800,610,1.18),hold=1.3)
a=doctor(False,430);b=doctor(True,1140);keys(a,[(0,{'rotation':8}),(.5,{'rotation':0}),(1.0,{'rotation':-4}),(1.5,{'rotation':0})]);scene(18,97,[patient(),a,b],cam(800,610,1.18),hold=1.5)
s=scene(19,97,[lady(True,210,800,270),patient(),doctor(False,430),doctor(True,1140)]);move_camera(s,cam(800,610,1.18),cam(800,590,1.1))
scene(20,97,[lady(True,210,800,270),patient(),doctor(False,430),doctor(True,1140)],cam(800,590,1.1),hold=0)
a=doctor(False,430);b=doctor(True,1140);keys(a,[(0,{}),(1.5,{'rotation':5})]);keys(b,[(0,{}),(1.5,{'rotation':-5})]);scene(21,97,[lady(True,210,800,270),patient(),a,b],cam(800,590,1.1),hold=1.5)
scene(22,97,[lady(True,260,800,270),patient(),doctor(False,430),doctor(True,1140)],cam(800,640,1.4),hold=0)
def illustration(o,poses,default,changes):
 o['illustration']=dict(defaultPose=default,facing='artwork',poses=[dict(id=k,name=k,asset='don-gato-'+k,facing='right' if 'attendant' in k or 'walk' in k else 'front') for k in poses],changes=[dict(id=ident('pose'),time=t,poseId=k,facing='artwork') for t,k in changes]);return o

def procession(start=0,end=0,walking=True,revive=False,nose=False):
 rear=asset('don-gato-attendant-a','Rear attendant',505,845,320);front=asset('don-gato-attendant-a','Front attendant',1100,845,320)
 for a in [rear,front]:
  if walking:illustration(a,['attendant-a','attendant-b'],'attendant-a',[(i*.26,'attendant-b' if i%2 else 'attendant-a') for i in range(1,8)])
 # A timber carrying bar and soft embroidered cloth hold the cat at paw height.
 beam=shape('Carrying bar',840,675,740,17,'#806045','Rounded rectangle');cloth=shape('Flower-trimmed cloth',830,642,510,58,'#e8dcc6','Rounded rectangle')
 resting=cat('rest',830,626,180);resting['flipX']=True
 if nose:keys(resting,[(0,{}),(.5,{'rotation':-.7}),(.65,{'rotation':.7}),(.8,{'rotation':0}),(1.2,{'rotation':-.6}),(1.4,{'rotation':0})])
 if revive:
  resting.update(w=380,h=280,bw=380,bh=280,y=626-140,flipX=False)
  illustration(resting,['rest','awake'],'rest',[(.6,'awake')])
  for a in [rear,front]:keys(a,[(0,{}),(.65,{'y':a['y']-20,'rotation':-6}),(1.15,{'rotation':0})])
 flowers=[]
 for x in [600,660,1000,1060]:
  for j in range(5):
   a=j*math.tau/5;flowers.append(shape('Flower petal',x+math.cos(a)*12,650+math.sin(a)*12,19,19,'#cf8294','Circle'))
  flowers.append(shape('Flower center',x,650,11,11,'#e9bf5e','Circle'))
 sweetheart=lady(True,245,830,285)
 children=[sweetheart,rear,beam,cloth,resting]+flowers+[front]
 for o in children:
  o['x']-=800;o['y']-=450
  for k in o.get('keyframes',[]):k['pose']['x']-=800;k['pose']['y']-=450
 g=dict(id=ident('procession'),name='Funeral procession · move together',type='group',x=800+end,y=450,w=1600,h=900,bw=1600,bh=900,rotation=0,opacity=1,children=children,fiber=0,stitch=False)
 if start!=end:keys(g,[(0,{'x':800+start}),(2,{'x':800+end})])
 return g
scene(23,97,[procession(-90,0)],hold=2)
# Pass the cemetery entrance on the road; the revival still happens before burial.
scene(24,99,[procession(0,110)],hold=2)
s=scene(25,99,[procession(110,110,False)],hold=1.8);move_camera(s,cam(),cam(865,480,1.10))
scene(26,98,[procession(-110,0)],hold=2)
def scent():
 # Small fabric scent curls travel from the fish counter toward Don Gato's nose.
 pts=[[300-i*6,26+math.sin(i*.27)*16] for i in range(51)]
 o=dict(id=ident('fish-scent'),name='Scent of fish',type='pen',points=pts,bw=310,bh=65,x=1135,y=520,w=310,h=65,rotation=0,color='#f7eee0',penWidth=4,fiber=.4,stitch=False,opacity=.85)
 return keys(o,[(0,{'opacity':0,'x':1210}),(1.2,{'opacity':.85,'x':1135}),(2,{'opacity':.5,'x':1090})])
scene(27,98,[procession(0,0,False),scent()],cam(1000,575,1.18),hold=2)
scene(28,98,[procession(0,0,False,nose=True),scent()],cam(1000,575,1.18),hold=2)
scene(29,98,[procession(0,0,False,revive=True)],cam(1000,575,1.18),hold=1.5)
o=cat('joy',820,810,330);keys(o,[(0,{'y':o['y']+20}),(0.5,{'y':o['y']-30}),(1,{} )]);a=lady(False,510,810,300);scene(30,98,[a,o,asset('don-gato-attendant-a','Happy attendant',1190,825,300),float_heart(650,390),float_heart(1000,380,.15)],cam(),hold=2.1)
# Visual comedy stays inside the same 30 lyric cues. All props and poses remain editable.
def revise(n,items=None,camera=None,hold=None):
 s=scenes[n-1]
 if items is not None:s['items']=items
 if camera is not None:s['camera']=camera
 if hold is not None:s['phrase']['holdAt']=hold;s['duration']=max(4,hold)
 return s
def prop(kind,name,x,bottom,height):return asset('don-gato-'+kind,name,x,bottom,height)
def set_pose(o,kind):
 a=meta['don-gato-'+kind];bottom=o['y']+o['h']/2
 o.update(asset=a['id'],bw=a['preparedSize'][0],bh=a['preparedSize'][1],w=o['h']*a['preparedSize'][0]/a['preparedSize'][1],y=bottom-o['h']/2)
 return o
def hearts_from_letter(count=7):
 result=[]
 for i in range(count):
  d=.13*i;side=-1 if i%2 else 1;size=22+(i%3)*5
  o=heart(815,350,size);o['name']='Escaping love-letter heart'
  result.append(keys(o,[(0,{'opacity':0}),(d+.08,{'opacity':0}),(d+.30,{'opacity':1,'x':815+side*35,'y':300}),(d+1.0,{'x':815+side*(70+i*10),'y':240-(i%3)*20,'rotation':side*20}),(d+1.65,{'x':815+side*(105+i*8),'y':285+(i%3)*20,'rotation':side*35,'opacity':.7})]))
 return result

# A small mouse on the lower windowsill makes a quiet first appearance.
m=prop('mouse-wave','Mouse on the windowsill',365,772,64)
keys(m,[(0,{}),(.45,{'rotation':-5}),(.85,{}),(1.25,{'rotation':-5}),(1.65,{})])
scenes[0]['items'].append(m);revise(1,hold=1.7)
revise(3,[cat('read')]+hearts_from_letter(5),cam(850,400,1.18),2.3)
o=cat('read');illustration(o,['read','joy'],'read',[(.95,'joy')]);keys(o,[(0,{}),(.95,{}),(1.25,{'y':o['y']-18,'rotation':-5}),(1.65,{'rotation':3}),(2.2,{})])
revise(5,[o]+hearts_from_letter(8),cam(850,360,1.42),2.7)

# Keep the existing balcony occlusion while swapping complete illustrated poses.
for n in [6,7,8,9,10]:
 s=scenes[n-1];l=next(o for o in s['items'] if o['name']=='Lady cat')
 set_pose(l,'lady-wave')
 if n==6:
  keys(l,[(0,{}),(.35,{'rotation':-4}),(.7,{'rotation':3}),(1.05,{'rotation':-3}),(1.4,{})]);revise(n,hold=1.5)
 elif n==7:
  illustration(l,['lady-wave','lady-fan-hide'],'lady-wave',[(.55,'lady-fan-hide')]);revise(n,hold=1.8)
 else:
  illustration(l,['lady-fan-hide','lady-fan-peek'],'lady-fan-hide' if n==8 else 'lady-fan-peek',[(.7,'lady-fan-peek')] if n==8 else [])
  if n==8:keys(l,[(0,{}),(.8,{}),(1.25,{'rotation':-4}),(1.65,{})]);revise(n,hold=1.8)

def consultation(turn=False,nod=False):
 a=prop('doctor-listen','Doctor Brown · stethoscope',485,800,330)
 b=prop('doctor-clipboard','Doctor Gray · puzzled reader',1120,800,330)
 # Clipboard stays separate so its upside-down diagram can visibly turn upright.
 clip=prop('clipboard','Upside-down clipboard' if not nod else 'Clipboard · corrected',1158,744,115)
 clip['rotation']=0 if nod else 180
 if turn:keys(clip,[(0,{'rotation':180}),(.75,{'rotation':180}),(1.5,{'rotation':0}),(2.5,{'rotation':0})])
 for o in [a,b]:
  if turn:keys(o,[(0,{}),(.45,{'rotation':-5 if o is b else 4}),(.85,{}),(1.8,{'y':o['y']+7}),(2.05,{}),(2.3,{'y':o['y']+5}),(2.55,{})])
  elif nod:keys(o,[(0,{}),(.4,{'y':o['y']+6}),(.7,{}),(1.0,{'y':o['y']+5}),(1.3,{})])
 return [patient(),a,b,clip]
revise(17,consultation(),cam(800,630,1.17),1.4)
s=revise(18,consultation(turn=True),hold=2.6);move_camera(s,cam(800,630,1.17),cam(850,620,1.32),.65)
revise(19,[lady(True,210,800,270)]+consultation(nod=True),cam(800,590,1.1),1.5)
# The mouse peeks out of the doctor's bag, then slips back down.
m=prop('mouse-wave','Mouse peeking from the doctor’s bag',418,728,60)
keys(m,[(0,{'opacity':0,'y':m['y']+28}),(.35,{'opacity':1,'y':m['y']+28}),(.8,{'opacity':1}),(1.35,{'opacity':1}),(1.8,{'opacity':0,'y':m['y']+28})])
scenes[18]['items'].append(m);revise(19,hold=1.9)

# A flower-bearing mouse follows along the road, safely outside the cemetery wall.
for n in [23,24,25,26]:
 g=scenes[n-1]['items'][0];m=prop('mouse-flower','Mouse carrying one enormous flower',90,838,112)
 m['x']-=800;m['y']-=450;g['children'].insert(0,m)

def market_procession(stage):
 g=procession(0,0,False);children=g['children'];rest=next(o for o in children if o['name']=='Don Gato')
 set_pose(rest,'sniff' if stage==27 else 'one-eye')
 if stage==27:
  illustration(rest,['rest','sniff'],'rest',[(.7,'sniff')])
  keys(rest,[(0,{}),(.7,{}),(.9,{'rotation':-.9}),(1.05,{'rotation':.7}),(1.2,{}),(1.5,{'rotation':-.6}),(1.7,{})])
 if stage==28:
  illustration(rest,['sniff','one-eye'],'sniff',[(.95,'one-eye')])
  keys(rest,[(0,{}),(.45,{'rotation':-.6}),(.65,{}),(1.1,{'y':rest['y']-3}),(1.6,{})])
 if stage==29:
  # Separate lying and sitting cutouts keep the cat's body from stretching during revival.
  keys(rest,[(0,{}),(.69,{}),(.7,{'opacity':0})])
  awake=cat('awake',830,626,265);awake['x']-=800;awake['y']-=450
  keys(awake,[(0,{'opacity':0}),(.69,{'opacity':0,'y':awake['y']+35}),(.7,{'opacity':1,'y':awake['y']+35}),(1.03,{'y':awake['y']-12}),(1.4,{})]);children.append(awake)
  # Both attendants hop at once; the carrying bar and flowers bob with them.
  for o in children:
   if o['name'] in ['Rear attendant','Front attendant','Carrying bar','Flower-trimmed cloth','Flower petal','Flower center']:
    height=42 if 'attendant' in o['name'] else 14
    keys(o,[(0,{}),(.76,{}),(1.03,{'y':o['y']-height}),(1.36,{}),(1.53,{'y':o['y']-4}),(1.7,{})])
  l=next(o for o in children if o['name']=='Lady cat');illustration(l,['lady-sad','lady-surprise'],'lady-sad',[(.78,'lady-surprise')])
  cloth=prop('handkerchief','Dropped handkerchief',268,670,52);cloth['x']-=800;cloth['y']-=450
  keys(cloth,[(0,{'opacity':0}),(.77,{'opacity':0}),(.78,{'opacity':1}),(1.15,{'x':cloth['x']+32,'y':cloth['y']+28,'rotation':35}),(1.55,{'x':cloth['x']+8,'y':cloth['y']+95,'rotation':-22}),(2,{'x':cloth['x']+20,'y':390,'rotation':70})]);children.append(cloth)
  mouse=prop('mouse-wave','Mouse startled by the revival',90,838,88);mouse['x']-=800;mouse['y']-=450
  keys(mouse,[(0,{}),(.8,{}),(1.04,{'y':mouse['y']-28}),(1.38,{})]);children.insert(0,mouse)
 return g
revise(27,[market_procession(27),scent()],cam(1000,575,1.18),2)
s=revise(28,[market_procession(28),scent()],hold=2);move_camera(s,cam(1000,575,1.18),cam(950,530,1.55),.6)
s=revise(29,[market_procession(29)],hold=2.2);move_camera(s,cam(950,530,1.55),cam(760,550,1.03),.65)

# An extravagant bow reveals the sardine he has already helped himself to.
o=cat('joy',820,810,330)
illustration(o,['joy','bow'],'joy',[(.85,'bow'),(2.35,'joy')])
keys(o,[(0,{}),(.35,{'y':o['y']-25}),(.65,{}),(1.15,{'rotation':5}),(1.7,{'rotation':5}),(2.1,{}),(2.65,{})])
fish=prop('fish','Secret sardine slips out',945,655,56)
keys(fish,[(0,{'opacity':0}),(1.35,{'opacity':0,'rotation':-15}),(1.65,{'opacity':1,'x':974,'y':fish['y']+22,'rotation':25}),(2.1,{'x':970,'y':790,'rotation':12}),(2.3,{'x':970,'y':785,'rotation':0})])
l=prop('lady-wave','Lady cat · happy ending',510,810,300);keys(l,[(0,{}),(.5,{'rotation':-4}),(1.0,{}),(1.5,{'rotation':-3}),(2,{})])
m=prop('mouse-wave','Mouse takes a tiny bow',300,825,95);keys(m,[(0,{}),(1.0,{'rotation':12}),(1.6,{}),(2.2,{'rotation':-5}),(2.6,{})])
revise(30,[fish,l,o,asset('don-gato-attendant-a','Happy attendant',1190,825,300),m,float_heart(650,390),float_heart(1000,380,.15)],cam(),2.8)
# Each scene is deliberately separate; the renderer holds the last action pose in manual mode.
p=dict(format='felt-and-fable',version=1,title='Señor Don Gato',active=0,scenes=scenes,custom=[],imports={},audioAssets={},exportFps=60,phraseShow=dict(version=1,enabled=True,mode='manual'),notes='30 lyric phrases from Drew Wichman’s supplied screenshots. Press Space after each completed phrase. Each scene remains editable. Timed recording can be added later.')
(root/'story-source/don-gato/don-gato.felt.json').write_text(json.dumps(p,ensure_ascii=False,separators=(',',':')))
print('Created',len(scenes),'editable phrase scenes.')
