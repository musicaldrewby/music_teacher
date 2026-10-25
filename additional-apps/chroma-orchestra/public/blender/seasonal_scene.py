"""Shared scenery meshes, deterministic snowfall, and the editable Chroma camera edit."""
import bpy, json, math
from mathutils import Matrix, Vector

B=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
def xyz(v):return (v[0],-v[2],v[1])
def mesh_data(name,data):
    m=bpy.data.meshes.new(name);m.from_pydata([xyz(v) for v in data['vertices']],[],data['faces']);m.update();return m
def add_scenery(scene,root,material,color):
    path=root/'scenery.json'
    if not path.exists():return
    data=json.loads(path.read_text(encoding='utf8'))
    # A gentle ground haze blends the distant floor into the gradient sky without an expensive volume.
    ground=bpy.data.materials.get('Stage')
    if data['theme']!='studio' and ground and ground.use_nodes:
        nodes=ground.node_tree.nodes;links=ground.node_tree.links;surface=nodes.get('Principled BSDF');output=nodes.get('Material Output');distance=nodes.new('ShaderNodeCameraData');fade=nodes.new('ShaderNodeMapRange');fade.clamp=True;fade.interpolation_type='SMOOTHERSTEP';fade.inputs['From Min'].default_value=45;fade.inputs['From Max'].default_value=150;haze=nodes.new('ShaderNodeEmission');haze.inputs['Color'].default_value=color(data['skyHorizon']);mix=nodes.new('ShaderNodeMixShader');links.new(distance.outputs['View Distance'],fade.inputs['Value']);links.new(fade.outputs[0],mix.inputs[0]);links.new(surface.outputs[0],mix.inputs[1]);links.new(haze.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],output.inputs['Surface'])
    collection=bpy.data.collections.new('Seasonal setting');scene.collection.children.link(collection)
    cache={k:mesh_data(k,v) for k,v in data['geometries'].items()};mats={}
    for i,p in enumerate(data['props']):
        key=(p['color'],p['metal'],p['glow'],p.get('finish'))
        if key not in mats:
            if p.get('finish'):
                from contraptions import crafted
                mats[key]=crafted('Setting '+p['name'],p['finish'],p['color'],material,color)
                mats[key].node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=p['glow']
            else:mats[key]=material('Season '+p['color'],p['color'],p['metal'],.62,p['glow'])
        mesh=cache[p['shape']].copy();mesh.materials.append(mats[key]);o=bpy.data.objects.new(p['name'],mesh);collection.objects.link(o);o.matrix_world=B@Matrix(p['matrix'])@B.inverted()
        if p['shape'] in ['sphere','cylinder']:
            for poly in mesh.polygons:poly.use_smooth=True
    for p in data['props']:
        if p['name'] in ['Lantern glass','Lantern glow']:
            light=bpy.data.lights.new('Warm lantern pool','POINT');light.color=color('#ffb64b')[:3];light.energy=110;light.shadow_soft_size=.35;o=bpy.data.objects.new('Warm lantern pool',light);collection.objects.link(o);o.location=xyz(p['position'])
    if data['sky']:
        mesh=mesh_data('Gradient sky dome',data['sky']);attr=mesh.color_attributes.new(name='Sky color',type='FLOAT_COLOR',domain='POINT')
        for i,c in enumerate(data['sky']['colors']):attr.data[i].color=c
        mat=bpy.data.materials.new('Purple dusk' if data['theme']=='halloween' else 'Winter twilight');mat.use_nodes=True;n=mat.node_tree.nodes;n.clear();out=n.new('ShaderNodeOutputMaterial');emit=n.new('ShaderNodeEmission');vc=n.new('ShaderNodeVertexColor');vc.layer_name='Sky color';mat.node_tree.links.new(vc.outputs['Color'],emit.inputs['Color']);mat.node_tree.links.new(emit.outputs[0],out.inputs['Surface']);mesh.materials.append(mat)
        sky=bpy.data.objects.new('Seasonal gradient sky',mesh);collection.objects.link(sky);sky.visible_diffuse=False;sky.visible_shadow=False
        scene.world.node_tree.nodes.get('Background').inputs[0].default_value=color(data['skyHorizon']);scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.28
    if data['snow']:
        verts=[(1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1)];faces=[(0,2,4),(2,1,4),(1,3,4),(3,0,4),(2,0,5),(1,2,5),(3,1,5),(0,3,5)]
        mesh=bpy.data.meshes.new('Snow crystal');mesh.from_pydata(verts,[],faces);mesh.materials.append(material('Snow crystals','#e5f7ff',0,.85,.1));bounds=data['snowBounds'];t='((frame-1)/60.0)'
        for i,p in enumerate(data['snow']):
            o=bpy.data.objects.new('Snowflake %03d'%i,mesh);collection.objects.link(o);o.scale=(p['size'],)*3
            expressions=[f"{bounds['cx']}+(({p['x']}+{data['wind']}*{t}+sin({t}*.6+{p['phase']})*.22)%{bounds['width']})-{bounds['width']}/2",f"-({bounds['cz']}+(({p['z']}+sin({t}*.4+{p['phase']})*.28)%{bounds['depth']})-{bounds['depth']}/2)",f"({p['y']}-{p['rate']}*{t})%{bounds['height']}"]
            for axis,expression in enumerate(expressions):o.driver_add('location',axis).driver.expression=expression
    for mesh in cache.values():
        if not mesh.users:bpy.data.meshes.remove(mesh)

def build_film(source,root):
    path=root/'camera-plan.json'
    if not path.exists():return source
    plan=json.loads(path.read_text(encoding='utf8'));film=bpy.data.scenes.new('Finished film');film.render.resolution_x=source.render.resolution_x;film.render.resolution_y=source.render.resolution_y;film.render.resolution_percentage=100;film.render.fps=60;film.frame_start=1;film.frame_end=plan['frames'];film.render.use_sequencer=True
    film.view_settings.view_transform=source.view_settings.view_transform
    try:film.view_settings.look=source.view_settings.look
    except Exception:pass
    editor=film.sequence_editor_create();strips=editor.strips if hasattr(editor,'strips') else editor.sequences;visual=[];cameras=[]
    for i,seg in enumerate(plan['segments']):
        data=bpy.data.cameras.new(seg['name']);data.sensor_fit='HORIZONTAL';data.sensor_width=36;data.clip_end=2000;cam=bpy.data.objects.new(seg['name'],data);source.collection.objects.link(cam);cameras.append(cam)
        for key in seg['cameras']:
            frame=key['frame'];cam.location=xyz(key['position']);cam.rotation_euler=(Vector(xyz(key['target']))-cam.location).to_track_quat('-Z','Y').to_euler();cam.rotation_euler.rotate_axis('Z',math.radians(key['roll']));data.lens=36/(2*math.tan(math.radians(key['fov'])/2)*(1920/1080));cam.keyframe_insert('location',frame=frame);cam.keyframe_insert('rotation_euler',frame=frame);data.keyframe_insert('lens',frame=frame)
        strip=strips.new_scene(seg['name'],source,channel=i+1,frame_start=1);strip.scene_camera=cam;strip.scene_input='CAMERA';strip.volume=0;strip.frame_final_start=seg['start'];strip.frame_final_end=seg['end'];visual.append(strip)
        marker=source.timeline_markers.new(seg['name'],frame=seg['start']);marker.camera=cam;film.timeline_markers.new(seg['name'],frame=seg['start'])
    for i,seg in enumerate(plan['segments']):
        if i and seg['transition']=='dissolve' and seg['fadeFrames']:
            start=seg['start'];length=seg['fadeFrames'];parameters=strips.bl_rna.functions['new_effect'].parameters;end_arg={'length':length} if 'length' in parameters else {'frame_end':start+length}
            cross=strips.new_effect('Dissolve to '+seg['name'],type='CROSS',channel=len(visual)+1,frame_start=start,input1=visual[i-1],input2=visual[i],**end_arg)
            cross.use_default_fade=False;cross.effect_fader=0;cross.keyframe_insert('effect_fader',frame=start);cross.effect_fader=1;cross.keyframe_insert('effect_fader',frame=start+length)
    # Linear dissolve weights exactly match Chroma's browser renderer.
    action=film.animation_data.action if film.animation_data else None
    if action:
        curves=list(action.fcurves) if hasattr(action,'fcurves') else [fc for layer in action.layers for strip in layer.strips for bag in strip.channelbags for fc in bag.fcurves]
        for curve in curves:
            for k in curve.keyframe_points:k.interpolation='LINEAR'
    sound=strips.new_sound('Exact studio soundtrack',str(root/'soundtrack.wav'),channel=len(visual)+2,frame_start=1);sound.sound.pack();source.camera=cameras[0];source.render.use_sequencer=False
    film['Chroma guide']='Render this scene for camera cuts, glides, dissolves and audio. Switch to Chroma Orchestra to edit scenery and instruments.'
    bpy.context.window.scene=film;film.frame_set(1)
    return film
