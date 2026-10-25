"""Build the editable scene; original generated artwork is kept unchanged."""
import base64, io, json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

root = Path(__file__).resolve().parents[1]
assets = root / 'public/examples/orbital-bedroom'
def embedded(path):
    return 'data:image/png;base64,' + base64.b64encode(path.read_bytes()).decode()

def region(points, blur=1):
    # The renderer uses ALPHA, not luminance, for effect masks.
    canvas = Image.new('RGBA', (1672, 941), (0, 0, 0, 0))
    ImageDraw.Draw(canvas).polygon([(round(x*1672), round(y*941)) for x,y in points], fill=(255,255,255,255))
    if blur:
        canvas = canvas.filter(ImageFilter.GaussianBlur(blur))
    stream = io.BytesIO(); canvas.save(stream, format='PNG')
    return 'data:image/png;base64,' + base64.b64encode(stream.getvalue()).decode()

# Trace inside the glass, leaving a small margin behind the beveled frame.
window_points = [[.246,.232],[.251,.212],[.267,.191],[.287,.184],[.938,.076],[.953,.078],[.968,.091],[.978,.114],[.983,.148],[.983,.542],[.977,.577],[.964,.603],[.944,.615],[.284,.586],[.266,.577],[.252,.557],[.246,.529]]
window_mask = region(window_points, 1)
cabin_mask = region([[.29,.659],[.94,.687],[.93,.938],[.55,.955],[.51,.755]], 22)
layers = []
def layer(id, kind, name, **settings):
    value = dict(id=id, type=kind, name=name, visible=True, locked=False, opacity=.4, strength=0, scale=.25, cycles=1, direction=0, color='#d6eaff', x=.5, y=.5, radius=.15, feather=.0005, flowX=0, flowY=0, mask=None, src=None, depth=.5, respectProtection=False, windLinked=False)
    value.update(settings); layers.append(value); return value

shuttle = embedded(assets/'shuttle.png')
layer('orbital-shuttle-near', 'image', 'Passenger shuttle — outward route', src=shuttle, mask=window_mask, opacity=.94, x=.16, y=.286, radius=.065, brightness=.67, saturation=.8, warmth=-.08, stickerMotion=0, flipX=False, motionPath=[dict(x=.16,y=.286),dict(x=1.07,y=.245)], pathMode='oneway', pathEase='linear', routeShape='line', entryTime=0, exitTime=1, motionBlur=True, motionShutter=.025, motionSamples=8)
layer('orbital-shuttle-far', 'image', 'Service shuttle — distant return', src=shuttle, mask=window_mask, opacity=.66, x=1.03, y=.53, radius=.026, brightness=.53, saturation=.6, warmth=-.12, stickerMotion=0, flipX=True, motionPath=[dict(x=1.03,y=.53),dict(x=.19,y=.49)], pathMode='oneway', pathEase='linear', routeShape='line', entryTime=.06, exitTime=.96, motionBlur=True, motionShutter=.025, motionSamples=8)
layer('orbital-ice','dust','Sparse ice crystals beyond the glass',mask=window_mask,opacity=.36,strength=.025,scale=.035,direction=8,color='#c6e5f6',cycles=1)
for index,(x,y,color) in enumerate([(.296,.377,'#f5b46d'),(.437,.419,'#79cadb'),(.565,.464,'#f5b46d')]):
    layer('orbital-beacon-'+str(index),'breath','Docking beacon '+str(index+1),mask=window_mask,x=x,y=y,radius=.009,opacity=.52,strength=.92,cycles=3+index,color=color)
layer('orbital-console','breath','Bedside console — quiet status pulse',x=.229,y=.625,radius=.031,opacity=.14,strength=.48,cycles=4,color='#76d8ea')
layer('orbital-reflection','light','Passing shuttle — faint cabin reflection',mask=cabin_mask,x=.45,y=.76,radius=.3,color='#94c8e0',opacity=0,strength=0,keyframes={'x':[dict(t=0,value=.32),dict(t=1,value=.88)],'opacity':[dict(t=0,value=0),dict(t=.19,value=0),dict(t=.34,value=.035),dict(t=.52,value=.045),dict(t=.7,value=0),dict(t=1,value=0)]})
project = dict(version=1,name='Orbital Bedroom',image=embedded(assets/'bedroom.png'),imageWidth=1672,imageHeight=941,duration=60,camera=0,layers=layers,windAngle=0,windSpeed=1,parallax=0,haze=0,namedRegions=[dict(name='Window glass',points=window_points,mask=window_mask),dict(name='Cabin reflected light',mask=cabin_mask)])
target=root/'public/examples/orbital-bedroom.motion.json'
target.write_text(json.dumps(project,separators=(',',':')))
print(f'Created {target.name}: {len(layers)} layers, {target.stat().st_size:,} bytes')
