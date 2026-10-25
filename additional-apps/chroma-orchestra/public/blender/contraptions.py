"""Native editable Chroma machines; geometry and sampled paths come from the browser builder."""
import bpy,math,json
from mathutils import Matrix
from seasonal_scene import B,xyz

def crafted(name,finish,tint,material,color):
    settings={'wood':(0,.32),'brass':(.85,.23),'copper':(.82,.26),'enamel':(.35,.2),'glass':(.15,.1),'leather':(0,.63),'stone':(.05,.48),'velvet':(0,.86),'ivory':(0,.32)}
    metal,rough=settings.get(finish,(0,.5));m=material(name,tint,metal,rough);nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF')
    bs.inputs['Coat Weight'].default_value=.8 if finish in ['wood','enamel','glass'] else .15
    bs.inputs['Coat Roughness'].default_value=.16
    if finish=='glass':
        bs.inputs['Transmission Weight'].default_value=.28;bs.inputs['IOR'].default_value=1.46;bs.inputs['Emission Color'].default_value=color(tint);bs.inputs['Emission Strength'].default_value=.13
    if finish in ['wood','leather','stone','velvet','brass','copper']:
        tex=nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=5;tex.inputs['Detail'].default_value=3;coord=nodes.new('ShaderNodeTexCoord');mapping=nodes.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(6,.4,1.5) if finish=='wood' else (18,18,18);links.new(coord.outputs['Generated'],mapping.inputs[0]);links.new(mapping.outputs[0],tex.inputs['Vector'])
        ramp=nodes.new('ShaderNodeValToRGB');base=color(tint);ramp.color_ramp.elements[0].position=.15;ramp.color_ramp.elements[0].color=tuple(v*.35 for v in base[:3])+(1,);ramp.color_ramp.elements[1].position=.85;ramp.color_ramp.elements[1].color=base;links.new(tex.outputs['Fac'],ramp.inputs[0]);links.new(ramp.outputs[0],bs.inputs['Base Color'])
        bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.18;bump.inputs['Distance'].default_value=.035 if finish=='stone' else .012;links.new(tex.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bs.inputs['Normal'])
    return m

def sample(points,u):
    a=max(0,min(1,u))*(len(points)-1);i=min(len(points)-2,int(a));f=a-i;return tuple(points[i][k]+(points[i+1][k]-points[i][k])*f for k in range(3))
def ball_position(k,age):
    if age<-.38:return sample(k['approach'],(age+1.4)/1.02)
    if age<0:
        u=(age+.38)/.38;return (k['x'],k['lip'][1]+(k['hit'][1]-k['lip'][1])*u*u,k['lip'][2]+(k['hit'][2]-k['lip'][2])*u)
    if age<.48:
        u=age/.48;return (k['x'],k['hit'][1]+.8*4*u*(1-u)-.64*u,k['z']+1.05*u)
    u=(age-.48)/.28;return (k['x'],k['hit'][1]-.64-.52*u,k['z']+1.05)
def activity(notes,hit,speed,time):
    impulse=0;held=0
    for n in notes:
        age=time-(1.6+n['time']/speed)
        if 0<=age<.24:impulse=max(impulse,n['velocity']*(1-age/.24)*math.sin(age/.24*math.pi))
        if 0<=age<n['duration']/speed:held=max(held,n['velocity'])
    return impulse,held
def linear(data):
    action=data.animation_data.action if data.animation_data else None
    if not action:return
    curves=list(action.fcurves) if hasattr(action,'fcurves') else [fc for layer in action.layers for strip in layer.strips for bag in strip.channelbags for fc in bag.fcurves]
    for curve in curves:
        for k in curve.keyframe_points:k.interpolation='CONSTANT' if curve.data_path.startswith('hide') else 'LINEAR'

def add_machine(scene,root,station,track,project,material,color):
    collection=bpy.data.collections.new(track['name']+' · mechanism');scene.collection.children.link(collection);materials={name:crafted(name,m.get('finish','brass'),m.get('color','#dca548'),material,color) for name,m in station['materials'].items()};meshes={}
    for name,g in station['geometries'].items():
        m=bpy.data.meshes.new(name);m.from_pydata([xyz(v) for v in g['vertices']],[],g['faces']);m.update()
        for poly in m.polygons:poly.use_smooth=True
        if g.get('normals'):
            try:m.normals_split_custom_set_from_vertices([xyz(v) for v in g['normals']])
            except Exception:pass
        meshes[name]=m
    objects={};motions=[];speed=project['speed'];active=not track['mute'] and (not any(t['solo'] for t in project['tracks']) or track['solo']);notes_by_pitch={k['pitch']:[n for n in track['notes'] if n['midi']==k['pitch']] if active else [] for k in station['plan']['keys']}
    for node in station['nodes']:
        mesh=meshes[node['geometry']].copy() if node.get('geometry') else None
        if mesh:mesh.materials.append(materials[node['material']])
        o=bpy.data.objects.new(node['name'],mesh);collection.objects.link(o);o.parent=objects[node['parent']] if node['parent'] else root;o.matrix_basis=B@Matrix(node['matrix'])@B.inverted();objects[node['id']]=o
        if node.get('motion'):motions.append((o,node['motion'],o.location.copy()))
    for o,m,home in motions:
        kind=m['kind'];o['Chroma mechanism']=kind
        if kind=='key':
            pitch=m['pitch'];o['MIDI pitch']=pitch
            for frame in range(1,scene.frame_end+1):
                impulse,held=activity(notes_by_pitch[pitch],pitch,speed,(frame-1)/60);o.location.z=home.z-.035*impulse;o.rotation_euler.x=-.09*held if m['organ'] else 0;o.keyframe_insert('location',frame=frame);o.keyframe_insert('rotation_euler',frame=frame)
            linear(o)
        elif kind=='lamp':
            o.data.materials[0]=o.data.materials[0].copy();mat=o.data.materials[0];emission=mat.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength']
            for frame in range(1,scene.frame_end+1):
                _,held=activity(notes_by_pitch[m['pitch']],m['pitch'],speed,(frame-1)/60);emission.default_value=.15+held*3;emission.keyframe_insert('default_value',frame=frame)
            linear(mat.node_tree)
        elif kind=='bellows':o.driver_add('scale',0).driver.expression='.8+.15*sin((frame-1)/60*2.1)'
        elif kind=='wheel':o.driver_add('rotation_euler',0).driver.expression='-(frame-1)/60*.9'
        elif kind=='supply':
            for frame in range(1,scene.frame_end+1):o.location=xyz(sample(station['plan']['supply'],(((frame-1)/60*.11+m['index']/12)%1)));o.keyframe_insert('location',frame=frame)
            linear(o)
        elif kind=='lift':
            x=station['plan']['liftX']
            for frame in range(1,scene.frame_end+1):
                phase=(((frame-1)/60*.9+m['index']*16.4/16)%16.4)
                if phase<7.2:v=(x,.55+phase,-1.3)
                elif phase<8.2:a=(phase-7.2)*math.pi;v=(x,7.75+.5*math.sin(a),-1.8+.5*math.cos(a))
                elif phase<15.4:v=(x,7.75-(phase-8.2),-2.3)
                else:a=(phase-15.4)*math.pi;v=(x,.55-.5*math.sin(a),-1.8-.5*math.cos(a))
                o.location=xyz(v);o.keyframe_insert('location',frame=frame)
            linear(o)
    if project['labels'] and len(station['plan']['keys'])<=32:
        for k in station['plan']['keys']:
            pitch=k['pitch'];text=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'][pitch%12]+str(pitch//12-1);curve=bpy.data.curves.new(text,'FONT');curve.body=text;curve.align_x='CENTER';curve.size=.13;o=bpy.data.objects.new(text,curve);collection.objects.link(o);o.parent=root;o.location=xyz((k['x'],k['y']-.12,k['z']+k['length']*.55));o.rotation_euler.x=math.pi/2;curve.materials.append(crafted('Note lettering','ivory','#f8e6bd',material,color))
    if active:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,radius=.14);proto=bpy.context.object;ballmesh=proto.data;ballmesh.materials.append(crafted('Scored glass marbles','glass',track['color'],material,color));bpy.data.objects.remove(proto,do_unlink=True)
        for poly in ballmesh.polygons:poly.use_smooth=True
        keys={k['pitch']:k for k in station['plan']['keys']}
        for i,n in enumerate(track['notes']):
            hit=1.6+n['time']/speed;k=keys[n['midi']];o=bpy.data.objects.new('Scored marble %s %04d'%(track['id'],i),ballmesh);collection.objects.link(o);o.parent=root;o['MIDI pitch']=n['midi'];o['Impact time']=hit
            for tm,hidden in [(0,True),(hit-1.4,False),(hit+.76,True)]:o.hide_render=hidden;o.hide_viewport=hidden;o.keyframe_insert('hide_render',frame=tm*60+1);o.keyframe_insert('hide_viewport',frame=tm*60+1)
            # Sample at film frame times, and explicitly retain every transition and the exact note onset.
            times=set([(f-1)/60 for f in range(max(1,math.floor((hit-1.4)*60)+1),min(scene.frame_end,math.ceil((hit+.76)*60)+1)+1)]+[hit-1.4,hit-.38,hit,hit+.48,hit+.76])
            for tm in sorted(times):o.location=xyz(ball_position(k,tm-hit));o.keyframe_insert('location',frame=tm*60+1)
            linear(o)
    for m in meshes.values():
        if not m.users:bpy.data.meshes.remove(m)
