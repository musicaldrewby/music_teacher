"""Chroma Orchestra native Blender builder. Blender 4.5+; no add-ons required."""
import bpy, math, json, sys, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT))
from seasonal_scene import add_scenery,build_film
from contraptions import add_machine
MACHINES=json.loads((ROOT/'contraptions.json').read_text()) if (ROOT/'contraptions.json').exists() else None
P=json.loads((ROOT/'performance.json').read_text(encoding='utf8'))
FPS=60
END=1.6+max([1]+[n['time']+n['duration'] for t in P['tracks'] for n in t['notes']])/P['speed']+2.5
OUT=ROOT/'output';OUT.mkdir(exist_ok=True)
MODE=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv and len(sys.argv)>sys.argv.index('--')+1 else 'build'
def xyz(v):return (v[0],-v[2],v[1])
def color(h):
    c=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    return tuple(v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in c)+(1,)
def material(name,h,metal=.65,rough=.24,glow=0):
    m=bpy.data.materials.new(name);m.diffuse_color=color(h);m.use_nodes=True
    b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=color(h);b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=rough
    b.inputs['Emission Color'].default_value=color(h);b.inputs['Emission Strength'].default_value=glow
    return m
def finish(o,name,mat,parent=None):
    o.name=name
    if mat:o.data.materials.append(mat)
    if parent:o.parent=parent
    if o.type=='MESH':
        for p in o.data.polygons:p.use_smooth=True
    return o
def box(name,size,pos,mat,parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(pos));o=bpy.context.object;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod=o.modifiers.new('Soft machined edges','BEVEL');mod.width=.035;mod.segments=2
    return finish(o,name,mat,parent)
def cyl(name,r,depth,pos,mat,parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=depth,location=xyz(pos));return finish(bpy.context.object,name,mat,parent)
def tube(name,points,r,mat,parent=None):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2;s=c.splines.new('POLY');s.points.add(len(points)-1)
    for p,v in zip(s.points,points):p.co=(*xyz(v),1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);return finish(o,name,mat,parent)
def ring(name,r,pos,mat,parent=None,vertical=False):
    points=[]
    for i in range(65):
        a=i/64*math.tau;points.append((pos[0]+(0 if vertical else r*math.cos(a)),pos[1]+(r*math.cos(a) if vertical else 0),pos[2]+r*math.sin(a)))
    return tube(name,points,.035,mat,parent)
def funnel(name,x,mat,parent):
    verts=[];faces=[]
    for radius,y in [(.22,.94),(.075,.62)]:
        for i in range(32):a=i/32*math.tau;verts.append(xyz((x+radius*math.cos(a),y,1.55+radius*math.sin(a))))
    for i in range(32):j=(i+1)%32;faces.append((i,j,j+32,i+32))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);return finish(o,name,mat,parent)
def label(text,pos,size,mat,parent):
    c=bpy.data.curves.new(text,'FONT');c.body=text;c.align_x='CENTER';c.size=size;c.extrude=.002;o=bpy.data.objects.new(text,c);bpy.context.collection.objects.link(o);o.location=xyz(pos);o.rotation_euler=(math.pi/2,0,0);return finish(o,text,mat,parent)
def position(x,age):
    if age<-.3:
        u=max(0,min(1,(age+1.4)/1.1));return (x,4.3-1.9*u,-2.1+1.25*u)
    if age<0:
        u=(age+.3)/.3;return (x,2.4-.91*u*u,-.85+.85*u)
    if age<.48:
        u=age/.48;return (x,1.49+.95*4*u*(1-u)-.55*u,1.55*u)
    return (x,.94-.9*(age-.48)/.28,1.55)
def station(i,n):
    cols=n if n<=3 else min(4,math.ceil(math.sqrt(n)));rows=math.ceil(n/cols)
    return ((i%cols-(cols-1)/2)*7.8,0,(i//cols-(rows-1)/2)*5.8)
def gpu(scene):
    scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=True;scene.cycles.device='CPU'
    try:
        prefs=bpy.context.preferences.addons['cycles'].preferences
        for kind in ['OPTIX','CUDA']:
            try:
                prefs.compute_device_type=kind;prefs.refresh_devices();found=False
                for d in prefs.devices:d.use=d.type==kind;found=found or d.use
                if found:scene.cycles.device='GPU';print('Using',kind);return
            except Exception:pass
    except Exception:pass
    print('GPU unavailable to this Blender installation; using CPU.')
def build():
    bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene;s.name='Chroma Orchestra';s.render.resolution_x=1920;s.render.resolution_y=1080;s.render.resolution_percentage=100;s.render.fps=FPS;s.frame_start=1;s.frame_end=math.ceil(END*FPS);gpu(s)
    s.world=bpy.data.worlds.new('Midnight');s.world.use_nodes=True;s.world.node_tree.nodes.get('Background').inputs[0].default_value=(.025,.04,.08,1);s.world.node_tree.nodes.get('Background').inputs[1].default_value=.5
    try:s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast'
    except Exception:pass
    dark=material('Midnight enamel','#121d30',.55,.28);floor=material('Stage',{'christmas':'#bbd9ef','halloween':'#1e2336'}.get(P.get('scenery',{}).get('theme'),'#080f20'),.05 if P.get('scenery',{}).get('theme','studio')!='studio' else .4,.85);chrome=material('Polished chrome','#d5edff',.95,.13);gold=material('Brass','#e9ab3d',.85,.24)
    box('Stage floor',[2000,.2,2000],[0,-.15,0],floor)
    palettes={'neon':['#00d9ff','#ff2389','#9d5cff'],'gold':['#ffb62e','#008bff','#ff6026'],'emerald':['#00f599','#117bff','#d2ff29'],'ruby':['#ff1744','#983bff','#ffb800']}
    for name,pos,h,power,size in [('Key',[-8,13,10],'#e4f2ff',4500,10),('Cyan rim',[-12,8,-4],palettes[P['palette']][0],3500,8),('Warm fill',[12,7,5],palettes[P['palette']][1],4000,10)]:
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color(h)[:3];data.use_shadow=P['shadows'];o=bpy.data.objects.new(name,data);s.collection.objects.link(o);o.location=xyz(pos);o.rotation_euler=(Vector((0,0,1.7))-o.location).to_track_quat('-Z','Y').to_euler()
    add_scenery(s,ROOT,material,color)
    bases=[];solo=any(t['solo'] for t in P['tracks'])
    count=len(P['tracks']);cols=count if count<=3 else min(4,math.ceil(math.sqrt(count)));rows=math.ceil(count/cols)
    widths=[v['width'] for v in MACHINES['layouts']] if MACHINES else [max(6,len(set(n['midi'] for n in t['notes']))*.34) for t in P['tracks']]
    colwidths=[max([(widths[i]+1.8)*t['scale'] for i,t in enumerate(P['tracks']) if i%cols==c]) for c in range(cols)]
    rowdepths=[max([5.8*t['scale'] for i,t in enumerate(P['tracks']) if i//cols==r]) for r in range(rows)]
    for ti,t in enumerate(P['tracks']):
        width=widths[ti];base=(sum(colwidths[:ti%cols])+colwidths[ti%cols]/2-sum(colwidths)/2,0,sum(rowdepths[:ti//cols])+rowdepths[ti//cols]/2-sum(rowdepths)/2);base=tuple(base[k]+t['offset'][k] for k in range(3));base=tuple(MACHINES['layouts'][ti]['position']) if MACHINES else base;bases.append(base)
        root=bpy.data.objects.new(t['name'],None);s.collection.objects.link(root);root.location=xyz(base);root.rotation_euler.z=math.radians(t['yaw']);root.scale=(t['scale'],)*3
        advanced=next((m for m in MACHINES['stations'] if m['trackId']==t['id']),None) if MACHINES else None
        if advanced:
            add_machine(s,root,advanced,t,P,material,color);continue
        body=material(t['name']+' enamel',t['color']);glow=material(t['name']+' luminous accents',t['color'],.35,.2,2)
        box('Platform',[width+.9,.3,4.3],[0,.22,-.15],dark,root);box('Front light',[width+.7,.04,.05],[0,.4,1.98],glow,root)
        for x in [-width/2-.1,width/2+.1]:box('Tower',[.18,3.7,.18],[x,2.2,-2.12],chrome,root)
        box('Feeder beam',[width+.4,.18,.35],[0,4.08,-2.12],dark,root);box('Feeder light',[width+.3,.045,.06],[0,4.2,-1.91],glow,root)
        if P['labels']:label(t['name'].upper(),[0,.69,2.08],.25,glow,root)
        pitches=sorted(set(n['midi'] for n in t['notes'])) or [60];spacing=width/max(4 if t['machine']=='drums' else 8,len(pitches));keys={}
        for i,pitch in enumerate(pitches):
            x=(i-(len(pitches)-1)/2)*spacing;r=min(.68 if t['machine']=='drums' else .3,spacing*.42);km=material(t['name']+' note '+str(pitch),t['color'],.55,.2,.08);keys[pitch]=km
            if t['machine']=='drums':
                cyl('Drum shell',r,.45,[x,1.05,0],body,root);cyl('Drum head',r*.96,.035,[x,1.3525,0],km,root);ring('Rim',r,[x,1.29,0],chrome,root)
            elif t['machine']=='bells':
                bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=r,radius2=r*.6,depth=.3,location=xyz([x,1.22,0]));finish(bpy.context.object,'Bell',km,root);box('Suspension',[.025,2.35,.025],[x,2.66,.17],gold,root)
            else:
                box('Marimba bar',[spacing*.83,.22,1.18+(len(pitches)-i)*.02],[x,1.26,0],km,root);cyl('Resonator',.065,.55+(len(pitches)-i)*.015,[x,.78,.1],gold,root)
            for side in [-1,1]:
                points=[]
                for j in range(24):v=position(x,-1.4+j/23*1.1);points.append((v[0]+side*.075,v[1]-.09,v[2]))
                tube('Marble rail',points,.026,chrome,root)
            ring('Feeder mouth',.15,[x,4.3,-2.1],gold,root);funnel('Open collector',x,gold,root)
            if P['labels'] and len(pitches)<=24:label(['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'][pitch%12]+str(pitch//12-1),[x,.97,.89],min(.15,spacing*.3),chrome,root)
        wheel=bpy.data.objects.new('Flywheel',None);s.collection.objects.link(wheel);wheel.parent=root;wheel.location=xyz([-width/2-.15,2,-1.6]);ring('Flywheel rim',.68,[0,0,0],gold,wheel,True)
        for i in range(8):spoke=box('Spoke',[.06,1.25,.06],[0,0,0],body,wheel);spoke.rotation_euler.x=i*math.pi/4
        wheel.rotation_euler.x=0;wheel.keyframe_insert('rotation_euler',frame=1);wheel.rotation_euler.x=END*.8;wheel.keyframe_insert('rotation_euler',frame=s.frame_end)
        if t['mute'] or (solo and not t['solo']):continue
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,radius=.12);proto=bpy.context.object;ballmesh=proto.data;ballmesh.materials.append(chrome);bpy.data.objects.remove(proto,do_unlink=True)
        for ni,n in enumerate(t['notes']):
            hit=1.6+n['time']/P['speed'];x=(pitches.index(n['midi'])-(len(pitches)-1)/2)*spacing;ball=bpy.data.objects.new('Marble %s %04d'%(t['name'],ni+1),ballmesh);s.collection.objects.link(ball);ball.parent=root
            for tm,hidden in [(0,True),(hit-1.4,False),(hit+.76,True)]:ball.hide_render=hidden;ball.hide_viewport=hidden;ball.keyframe_insert('hide_render',frame=tm*FPS+1);ball.keyframe_insert('hide_viewport',frame=tm*FPS+1)
            ages=sorted(set([round(-1.4+j/60,8) for j in range(130)]+[-.3,0,.48,.76]))
            for age in ages:
                if age>.76:continue
                ball.location=xyz(position(x,age));ball.keyframe_insert('location',frame=(hit+age)*FPS+1)
            emission=keys[n['midi']].node_tree.nodes.get('Principled BSDF').inputs['Emission Strength']
            for dt,power in [(-.01,.08),(0,3*n['velocity']),(.22,.08)]:emission.default_value=power;emission.keyframe_insert('default_value',frame=(hit+dt)*FPS+1)
        for ob in [wheel]+[o for o in root.children if o.animation_data]:
            action=ob.animation_data.action if ob.animation_data else None
            if action and hasattr(action,'fcurves'):
                for curve in action.fcurves:
                    for k in curve.keyframe_points:k.interpolation='CONSTANT' if curve.data_path.startswith('hide') else 'LINEAR'
    c=P['camera'];data=bpy.data.cameras.new('Cinema camera');cam=bpy.data.objects.new('Cinema camera',data);s.collection.objects.link(cam);s.camera=cam;data.sensor_fit='HORIZONTAL';data.sensor_width=36;data.lens=36/(2*math.tan(math.radians(c.get('fov',38))/2)*(1920/1080));data.clip_end=2000
    focus=next((i for i,t in enumerate(P['tracks']) if t['id']==c['focus']),None)
    bounds=[]
    for i,t in enumerate(P['tracks']):
        if focus is not None and i!=focus:continue
        angle=math.radians(t['yaw']);half=(widths[i]/2+.9)*t['scale'];depth=2.6*t['scale'];center=(bases[i][0],bases[i][1]+2.1*t['scale'],bases[i][2]);extent=(abs(math.cos(angle))*half+abs(math.sin(angle))*depth,2.6*t['scale'],abs(math.sin(angle))*half+abs(math.cos(angle))*depth);bounds.append((center,extent))
    low=[min(b[0][i]-b[1][i] for b in bounds) for i in range(3)];high=[max(b[0][i]+b[1][i] for b in bounds) for i in range(3)];pan=c.get('pan',[0,0,0]);target=[(low[i]+high[i])/2+pan[i] for i in range(3)];radius=math.sqrt(sum(((high[i]-low[i])/2)**2 for i in range(3)));distance=max(9,radius/math.sin(math.radians(19))*1.06)/c['zoom'];pitch=math.radians(c['pitch'])
    for frame in range(1,s.frame_end+1):
        tm=(frame-1)/FPS;yaw=math.radians(c['yaw']+(math.sin(tm*.13*c.get('orbitSpeed',1))*c.get('orbitAmount',10.313240312354818) if c['mode']=='orbit' else 0))
        cam.location=xyz((target[0]+math.sin(yaw)*distance*math.cos(pitch),target[1]+math.sin(pitch)*distance,target[2]+math.cos(yaw)*distance*math.cos(pitch)));cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler();cam.rotation_euler.rotate_axis('Z',math.radians(c['roll']));cam.keyframe_insert('location',frame=frame);cam.keyframe_insert('rotation_euler',frame=frame)
    editor=s.sequence_editor_create();strips=editor.strips if hasattr(editor,'strips') else editor.sequences;strip=strips.new_sound('Exact studio soundtrack',str(ROOT/'soundtrack.wav'),channel=1,frame_start=1);strip.sound.pack();s.render.use_sequencer=False;film=build_film(s,ROOT);bpy.context.window.scene=film;film.frame_set(round(3.1*FPS)+1);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Chroma-Orchestra.blend'));return film
def assemble(scene,frames,target):
    v=bpy.data.scenes.new('Finished movie');bpy.context.window.scene=v;v.render.resolution_x=scene.render.resolution_x;v.render.resolution_y=scene.render.resolution_y;v.render.resolution_percentage=100;v.render.fps=FPS;v.frame_start=1;v.frame_end=scene.frame_end
    e=v.sequence_editor_create();strips=e.strips if hasattr(e,'strips') else e.sequences;files=[frames/('frame-%06d.png'%f) for f in range(1,scene.frame_end+1)]
    missing=[f for f in files if not f.exists()]
    if missing:raise RuntimeError('Render is incomplete. Run 02-Render-Video.cmd again to resume. First missing: '+str(missing[0]))
    im=strips.new_image('Rendered frames',str(files[0]),channel=1,frame_start=1)
    for f in files[1:]:im.elements.append(f.name)
    im.frame_final_duration=len(files);strips.new_sound('Soundtrack',str(ROOT/'soundtrack.wav'),channel=2,frame_start=1)
    v.render.image_settings.file_format='FFMPEG';v.render.ffmpeg.format='MPEG4';v.render.ffmpeg.codec='H264';v.render.ffmpeg.constant_rate_factor='HIGH';v.render.ffmpeg.audio_codec='AAC';v.render.ffmpeg.audio_bitrate=192;v.render.filepath=str(target);v.view_settings.view_transform='Standard';bpy.ops.render.render(animation=True,scene=v.name)
if __name__=='__main__':
    s=build()
    if MODE=='test':
        for scene in bpy.data.scenes:scene.render.resolution_percentage=50;scene.cycles.samples=16
        bpy.context.window.scene=s;s.render.image_settings.file_format='PNG';s.render.filepath=str(OUT/'Chroma-Test.png');bpy.ops.render.render(write_still=True)
    elif MODE in ['video','assemble']:
        extra=b''.join((ROOT/name).read_bytes() for name in ['scenery.json','camera-plan.json','seasonal_scene.py','contraptions.json','contraptions.py'] if (ROOT/name).exists())
        key=hashlib.sha256(extra+(ROOT/'performance.json').read_bytes()+(ROOT/'soundtrack.wav').read_bytes()+Path(__file__).read_bytes()+bpy.app.version_string.encode()).hexdigest()[:12];frames=OUT/('frames-'+key);frames.mkdir(exist_ok=True)
        if MODE=='video':
            s.render.image_settings.file_format='PNG'
            for f in range(1,s.frame_end+1):
                path=frames/('frame-%06d.png'%f)
                if path.exists() and path.stat().st_size>1024:continue
                bpy.context.window.scene=s;s.frame_set(f);s.render.filepath=str(path);bpy.ops.render.render(write_still=True)
        target=OUT/'Chroma-Orchestra.mp4';i=2
        while target.exists():target=OUT/('Chroma-Orchestra-%d.mp4'%i);i+=1
        assemble(s,frames,target)
    print('Chroma output:',OUT)
