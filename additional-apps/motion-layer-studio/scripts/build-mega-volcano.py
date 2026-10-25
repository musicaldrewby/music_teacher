"""Compose the generated volcano with editable native Motion Studio effects."""
import base64, io, json, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
root=Path(__file__).resolve().parents[1];assets=root/'public/examples/mega-volcano'
def encode(im):
    b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def embed(path):return 'data:image/png;base64,'+base64.b64encode(path.read_bytes()).decode()
def poly(points,blur=3):
    im=Image.new('RGBA',(1672,941));ImageDraw.Draw(im).polygon([(x*1672,y*941) for x,y in points],fill='white');return encode(im.filter(ImageFilter.GaussianBlur(blur)))
def channel(points,widths):
    im=Image.new('RGBA',(1672,941));d=ImageDraw.Draw(im)
    for a,b,wa,wb in zip(points,points[1:],widths,widths[1:]):
        for j in range(61):
            u=j/60;x=(a[0]+(b[0]-a[0])*u)*1672;y=(a[1]+(b[1]-a[1])*u)*941;r=(wa+(wb-wa)*u)/2
            d.ellipse((x-r,y-r,x+r,y+r),fill='white')
    return encode(im.filter(ImageFilter.GaussianBlur(3)))
main=[(.501,.342),(.525,.365),(.538,.406),(.599,.441),(.609,.475),(.637,.513),(.630,.541),(.703,.583),(.783,.634),(.840,.690),(.831,.744),(.725,.797),(.688,.850),(.746,.923),(.845,1)]
left=[(.414,.345),(.397,.377),(.364,.405),(.314,.425),(.299,.455),(.304,.481),(.274,.509),(.239,.548),(.229,.579),(.236,.613),(.195,.640),(.123,.674),(.112,.704),(.083,.722)]
mainmask=channel(main,[12,18,18,28,22,38,36,48,55,75,66,60,70,90,150])
leftmask=channel(left,[7,7,8,10,8,8,11,14,18,17,14,17,22,22])
sky=poly([(0,0),(1,0),(1,.268),(.70,.285),(.636,.252),(.590,.265),(.530,.300),(.420,.301),(.36,.279),(.324,.263),(0,.30)],1)
crater=poly([(0,0),(1,0),(1,.24),(.70,.24),(.636,.255),(.600,.299),(.573,.318),(.510,.318),(.461,.311),(.405,.309),(.36,.273),(.30,.24),(0,.24)],2)
heatmask=poly([(.40,.27),(.58,.27),(.61,.41),(.72,.48),(.76,.62),(.91,.69),(.91,.84),(.95,1),(.60,1),(.61,.73),(.55,.53),(.48,.42)],14)
layers=[]
def add(id,kind,name,**s):
    l=dict(id=id,type=kind,name=name,visible=True,locked=False,opacity=.5,strength=.3,scale=.3,cycles=1,direction=0,color='#ff792e',x=.5,y=.5,radius=.3,feather=.0015,flowX=0,flowY=0,mask=None,src=None,depth=.5,respectProtection=False,windLinked=False)
    l.update(s);layers.append(l);return l
for id,title,points,mask,rate in [('lava-main','Main lava river — downhill current',main,mainmask,1.5),('lava-left','Branch lava stream — slow current',left,leftmask,.85)]:
    add(id,'flow',title,opacity=1,mask=mask,strength=.055,scale=.10,flowRate=rate,flowAcceleration=.18,flowTurbulence=.07,flowDetail=.82,arrows=[],anchors=[],paths=[dict(id=id+'-route',speed=1,points=[dict(x=x,y=y) for x,y in points])])
add('crater-circulation','flow','Molten crater — rolling surface',opacity=.9,mask=poly([(.404,.301),(.43,.294),(.52,.298),(.57,.305),(.541,.323),(.466,.322)],1),strength=.025,scale=.065,flowRate=.7,flowTurbulence=.18,flowDetail=.7,anchors=[],arrows=[dict(id='crater-current',ax=.43,ay=.307,bx=.55,by=.309,speed=.8)],paths=[])
add('ash-column','plume','Dense volcanic ash — rising billows',x=.488,y=.302,mask=crater,opacity=.95,color='#60534c',plumeHeight=.31,plumeBase=.033,plumeWidth=.20,plumeBillow=.060,plumeDensity=3.4,plumeDetail=.9,plumeSpeed=2,plumeWind=.10,plumeTurbulence=.82,plumeDispersion=.35,plumeLightAngle=160,plumeLight=1,plumeShadow=1.4,plumeQuality=28,plumeSeed=740)
add('fire-fountain','flame','Central eruption — roaring fire fountain',x=.492,y=.309,mask=crater,opacity=.93,color='#ffaf36',natureSize=.105,natureHeight=.175,natureCount=7,natureSpeed=6,natureAmount=1.15,natureSecondary=.30,natureTertiary=.2,natureDetail=.76,natureVariant=2,natureSeed=713,natureWind=.16)
add('vent-fire','flame','Side vent — smaller flame bursts',x=.549,y=.312,mask=crater,opacity=.72,color='#ff8727',natureSize=.043,natureHeight=.097,natureCount=3,natureSpeed=8,natureAmount=.9,natureSecondary=.15,natureDetail=.8,natureVariant=2,natureSeed=896,natureWind=.12,stickerPhase=.31)
# Small native particle sprite; the landscape artwork is never modified.
spark=Image.new('RGBA',(32,32))
for y in range(32):
    for x in range(32):
        r=((x-15.5)**2+(y-15.5)**2)**.5/15.5
        a=max(0,1-r)**2
        spark.putpixel((x,y),(255,round(130+100*max(0,1-r*2)),50,round(a*255)))
add('ejected-embers','emitter','Hot fragments rising from the crater',src=encode(spark),mask=crater,x=.493,y=.202,radius=.3,direction=-84,opacity=.82,emitterCount=60,emitterSize=3.8,emitterTravel=.20,emitterDrift=.021,emitterSpin=1,emitterFlutter=0,emitterSpeed=5,emitterWidth=.105,emitterHeight=.015,emitterVariation=.72,emitterDepth=.32,emitterSeed=507,brightness=1.25)
add('crater-light','light','Crater light — flickering orange spill',x=.49,y=.307,radius=.28,opacity=.22,strength=.76,cycles=3,color='#ff681f')
add('lava-light','breath','Lava river — pulsing reflected heat',x=.77,y=.79,radius=.45,opacity=.09,strength=.45,cycles=3,color='#ff591a')
add('heat-shimmer','heat','Heat shimmer above molten rock',mask=heatmask,opacity=.5,strength=.12,scale=.4,cycles=6)
add('ash-lightning','lightning','Occasional lightning in the ash cloud',mask=sky,x=.53,y=.056,opacity=.55,color='#dac9ee',lightningStrikes=2,lightningDuration=.25,lightningEnergy=.85,lightningWidth=.45,lightningBranches=3,lightningRoughness=.8,lightningLength=.13,lightningSpread=.16,lightningGlow=.15,lightningCloud=.16,lightningCloudSize=.18,lightningScene=.008,lightningBolt=.52,lightningSeed=314,stickerPhase=.16)
p=dict(version=1,name='Mega Volcano',image=embed(assets/'volcano.png'),imageWidth=1672,imageHeight=941,duration=30,camera=0,layers=layers,windAngle=0,windSpeed=1,parallax=0,haze=0,namedRegions=[dict(name='Main lava channel',mask=mainmask),dict(name='Branch lava channel',mask=leftmask),dict(name='Eruption above crater',mask=crater),dict(name='Heat shimmer',mask=heatmask)])
target=root/'public/examples/mega-volcano.motion.json';target.write_text(json.dumps(p,separators=(',',':')))
print(f'{target.name}: {len(layers)} editable layers, {target.stat().st_size:,} bytes')
