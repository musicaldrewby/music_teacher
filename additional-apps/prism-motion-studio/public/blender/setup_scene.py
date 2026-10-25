"""Prism Motion Studio -> Blender 4.5 or newer. Open in Scripting, then Run Script."""
import bpy
import json
import math
import sys
from pathlib import Path
import numpy as np
from mathutils import Vector, Quaternion


def package_directory():
    if '--' in sys.argv:
        return Path(sys.argv[sys.argv.index('--') + 1]).resolve()
    return Path(bpy.path.abspath(__file__)).resolve().parent


BASE = package_directory()
M = json.loads((BASE / 'scene.json').read_text(encoding='utf-8'))
if bpy.app.version < (4, 5, 0):
    raise RuntimeError('This package needs Blender 4.5 or newer.')
RAW = np.fromfile(BASE / 'animation.f32', dtype='<f4')
TRACKS = {t['name']: t for t in M['tracks']}
CURVES = {}


def samples(name):
    t = TRACKS[name]
    if 'value' in t:
        return np.asarray([t['value']], dtype=np.float32)
    start, size = t['offset'], t['stride'] * t['count']
    return RAW[start:start + size].reshape(t['count'], t['stride'])


def animate(owner, path, values):
    """Bulk curves, with static components reduced to a single key."""
    data = np.asarray(values, dtype=np.float32)
    if data.ndim == 1:
        data = data[:, None]
    if not np.all(np.isfinite(data)):
        raise RuntimeError('Nonfinite animation data: ' + path)
    owner.path_resolve(path)
    key = owner.as_pointer()
    if key not in CURVES:
        anim = owner.animation_data_create()
        action = bpy.data.actions.new('Prism ' + owner.name)
        slot = action.slots.new(id_type=owner.id_type, name=owner.name)
        layer = action.layers.new('Baked performance')
        strip = layer.strips.new(type='KEYFRAME')
        CURVES[key] = strip.channelbag(slot, ensure=True).fcurves
        anim.action = action
        anim.action_slot = slot
    linear = bpy.types.Keyframe.bl_rna.properties['interpolation'].enum_items['LINEAR'].value
    for i in range(data.shape[1]):
        values = data[:, i]
        if np.max(np.abs(values - values[0])) < 1e-7:
            values = values[:1]
        coords = np.empty((len(values), 2), dtype=np.float32)
        coords[:, 0] = np.arange(1, len(values) + 1)
        coords[:, 1] = values
        curve = CURVES[key].new(path, index=i)
        curve.keyframe_points.add(len(values))
        curve.keyframe_points.foreach_set('co', coords.ravel())
        curve.keyframe_points.foreach_set('interpolation', np.full(len(values), linear, dtype=np.int32))
        curve.update()
        curve.update_autoflags(owner)


def xyz(rows):
    result = np.asarray(rows, dtype=np.float32)[:, [0, 2, 1]].copy()
    result[:, 1] *= -1
    return result


def continuous_quaternions(rows):
    result = np.asarray(rows, dtype=np.float32).copy()
    result /= np.maximum(np.linalg.norm(result, axis=1)[:, None], 1e-12)
    for i in range(1, len(result)):
        if np.dot(result[i - 1], result[i]) < 0:
            result[i] *= -1
    return result


def aim_rotations(positions, targets):
    return continuous_quaternions([tuple((Vector(t) - Vector(p)).to_track_quat('-Z', 'Y')) for p, t in zip(positions, targets)])


def socket_track(tree, socket, values, multiply=False):
    # Keep texture alpha and modulate it with the animated layer opacity.
    if multiply and socket.is_linked:
        original = socket.links[0].from_socket
        node = tree.nodes.new('ShaderNodeMath')
        node.operation = 'MULTIPLY'
        tree.links.new(original, node.inputs[0])
        tree.links.new(node.outputs[0], socket)
        socket = node.inputs[1]
    animate(tree, socket.path_from_id('default_value'), values)


scene = bpy.data.scenes.new(M['name'])
if bpy.context.window:
    bpy.context.window.scene = scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1
with bpy.context.temp_override(scene=scene, view_layer=scene.view_layers[0], collection=scene.collection, layer_collection=scene.view_layers[0].layer_collection):
    result = bpy.ops.import_scene.gltf(filepath=str(BASE / 'scene.glb'))
    if 'FINISHED' not in result:
        raise RuntimeError('Could not import the Prism geometry.')
nodes = {o.get('prismNodeId', o.name): o for o in scene.objects}
materials = {}
for obj in scene.objects:
    if obj.type == 'MESH':
        obj.visible_shadow = bool(obj.get('prismCastShadow', True))
        for mat in obj.data.materials:
            if mat:
                materials[mat.get('prismMaterialId', mat.name)] = mat

# glTF morph targets import as Blender shape keys. Bake their sampled weights.
for name, track in TRACKS.items():
    if not name.startswith('PRISM_SHAPE_'):
        continue
    obj = nodes.get(name[len('PRISM_SHAPE_'):])
    keys = obj.data.shape_keys if obj and obj.type == 'MESH' else None
    values = samples(name)
    if keys is None or len(keys.key_blocks) - 1 != values.shape[1]:
        raise RuntimeError('Missing procedural shape keys: ' + name)
    for i, key in enumerate(list(keys.key_blocks)[1:]):
        animate(keys, key.path_from_id('value'), values[:, i])

for name, t in TRACKS.items():
    if not name.startswith('PRISM_N_'):
        continue
    obj = nodes.get(name)
    if obj is None:
        raise RuntimeError('Missing imported mesh: ' + name)
    a = samples(name)
    obj.parent = None
    obj.rotation_mode = 'QUATERNION'
    q = a[:, [6, 3, 5, 4]].copy()
    q[:, 2] *= -1
    animate(obj, 'location', xyz(a[:, :3]))
    animate(obj, 'rotation_quaternion', continuous_quaternions(q))
    animate(obj, 'scale', a[:, [7, 9, 8]])

for name, mat in materials.items():
    if name not in TRACKS or not mat.use_nodes:
        continue
    a = samples(name)
    p = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if p:
        socket_track(mat.node_tree, p.inputs['Alpha'], a[:, 0], True)
        emission = p.inputs.get('Emission Color') or p.inputs.get('Emission')
        if emission:
            if emission.is_linked:
                original = emission.links[0].from_socket
                modulation = mat.node_tree.nodes.new('ShaderNodeMixRGB')
                modulation.blend_type = 'MULTIPLY'
                modulation.inputs[0].default_value = 1
                mat.node_tree.links.new(original, modulation.inputs[1])
                mat.node_tree.links.new(modulation.outputs[0], emission)
                emission = modulation.inputs[2]
            socket_track(mat.node_tree, emission, np.column_stack((a[:, 1:4], np.ones(len(a)))))
            if p.inputs.get('Emission Strength'):
                p.inputs['Emission Strength'].default_value = 1

def projected_light_nodes(data, info, samples):
    """A perspective gobo in the light shader, independent of scene shadow settings."""
    spec = info['pattern']
    image = bpy.data.images.new(info['id'] + ' pattern', width=spec['width'], height=spec['height'], float_buffer=True)
    image.colorspace_settings.name = 'Non-Color'
    image.pixels.foreach_set(np.fromfile(BASE / spec['file'], dtype='<f4'))
    image.file_format = 'OPEN_EXR'
    image.pack()
    data.use_nodes = True
    tree = data.node_tree
    tree.nodes.clear()
    output = tree.nodes.new('ShaderNodeOutputLight')
    emission = tree.nodes.new('ShaderNodeEmission')
    tree.links.new(emission.outputs[0], output.inputs['Surface'])
    # Light Normal is the outgoing direction in the lamp's own coordinates.
    # Divide X/Y by -Z to match Three's perspective spotlight projection.
    coords = tree.nodes.new('ShaderNodeTexCoord')
    separate = tree.nodes.new('ShaderNodeSeparateXYZ')
    tree.links.new(coords.outputs['Normal'], separate.inputs[0])
    denominator = tree.nodes.new('ShaderNodeMath')
    denominator.operation = 'MULTIPLY'
    tree.links.new(separate.outputs['Z'], denominator.inputs[0])
    denominator.inputs[1].default_value = -2 * math.tan(info['angle'])
    combine = tree.nodes.new('ShaderNodeCombineXYZ')
    for axis in ('X', 'Y'):
        divide = tree.nodes.new('ShaderNodeMath')
        divide.operation = 'DIVIDE'
        tree.links.new(separate.outputs[axis], divide.inputs[0])
        tree.links.new(denominator.outputs[0], divide.inputs[1])
        offset = tree.nodes.new('ShaderNodeMath')
        offset.operation = 'ADD'
        offset.inputs[1].default_value = .5
        tree.links.new(divide.outputs[0], offset.inputs[0])
        tree.links.new(offset.outputs[0], combine.inputs[axis])
    texture = tree.nodes.new('ShaderNodeTexImage')
    texture.image = image
    texture.extension = 'EXTEND'
    texture.interpolation = 'Linear'
    tree.links.new(combine.outputs[0], texture.inputs['Vector'])
    # Shader owns animated color and power, using the existing artistic unit conversion.
    tint = tree.nodes.new('ShaderNodeMixRGB')
    tint.blend_type = 'MULTIPLY'
    tint.inputs[0].default_value = 1
    tree.links.new(texture.outputs['Color'], tint.inputs[1])
    socket_track(tree, tint.inputs[2], np.column_stack((samples[:, 7:10], np.ones(len(samples)))))
    tree.links.new(tint.outputs[0], emission.inputs['Color'])
    socket_track(tree, emission.inputs['Strength'], samples[:, 6] * math.pi * 4)
    data.shadow_soft_size = 0


for info in M['lights']:
    a = samples(info['id'])
    data = bpy.data.lights.new(info['id'], 'SPOT' if info['kind'] == 'spot' else 'POINT' if info['kind'] == 'point' else 'SUN')
    data.color = info['color']
    if a.shape[1] >= 10 and not info.get('pattern'):
        animate(data, 'color', a[:, 7:10])
    data.use_shadow = info['shadow']
    light = bpy.data.objects.new(info['id'], data)
    scene.collection.objects.link(light)
    light.rotation_mode = 'QUATERNION'
    positions, targets = xyz(a[:, :3]), xyz(a[:, 3:6])
    animate(light, 'location', positions)
    if info['kind'] != 'point':
        animate(light, 'rotation_quaternion', aim_rotations(positions, targets))
    # Three spot power is in candela, Blender uses radiant watts. This is an artistic match.
    if not info.get('pattern'):
        animate(data, 'energy', a[:, 6] * (math.pi * 4 if info['kind'] in ('spot', 'point') else 1))
    if info['kind'] == 'spot':
        data.spot_size = info['angle'] * 2
        data.spot_blend = info['penumbra']
        data.shadow_soft_size = info['radius']
        if info.get('pattern'):
            data.color = (1, 1, 1)
            data.energy = 1
            projected_light_nodes(data, info, a)
    elif info['kind'] == 'point':
        data.shadow_soft_size = info['radius']
    else:
        data.angle = math.radians(3)

world = bpy.data.worlds.new('Prism panoramic sky')
world.use_nodes = True
scene.world = world
nt = world.node_tree
nt.nodes.clear()
out = nt.nodes.new('ShaderNodeOutputWorld')
env_bg = nt.nodes.new('ShaderNodeBackground')
env_bg.inputs['Strength'].default_value = M['environment']['intensity']
env_path = BASE / 'environment.f32'
if env_path.exists():
    e = M['environment']
    image = bpy.data.images.new('Prism light environment', width=e['width'], height=e['height'], float_buffer=True)
    image.colorspace_settings.name = 'Non-Color'
    image.pixels.foreach_set(np.fromfile(env_path, dtype='<f4'))
    image.file_format = 'OPEN_EXR'
    image.pack()
    tex = nt.nodes.new('ShaderNodeTexEnvironment')
    tex.image = image
    coords = nt.nodes.new('ShaderNodeTexCoord')
    mapping = nt.nodes.new('ShaderNodeMapping')
    nt.links.new(coords.outputs['Normal'], mapping.inputs['Vector'])
    nt.links.new(mapping.outputs['Vector'], tex.inputs['Vector'])
    nt.links.new(tex.outputs['Color'], env_bg.inputs['Color'])
    rotation = samples('PRISM_ENV')[:, 0]
    socket_track(nt, mapping.inputs['Rotation'], np.column_stack((np.zeros(len(rotation)), np.zeros(len(rotation)), rotation)))
else:
    env_bg.inputs['Color'].default_value = (*M['sky'][1], 1)
visible_bg = nt.nodes.new('ShaderNodeBackground')
coords = nt.nodes.new('ShaderNodeTexCoord')
sep = nt.nodes.new('ShaderNodeSeparateXYZ')
ramp = nt.nodes.new('ShaderNodeValToRGB')
nt.links.new(coords.outputs['Normal'], sep.inputs[0])
nt.links.new(sep.outputs['Z'], ramp.inputs[0])
ramp.color_ramp.elements[0].position = 0
ramp.color_ramp.elements[0].color = (*M['sky'][1], 1)
ramp.color_ramp.elements[1].position = 1
ramp.color_ramp.elements[1].color = (*M['sky'][0], 1)
if 'PRISM_WEATHER' in TRACKS:
    weather_sky = samples('PRISM_WEATHER')
    socket_track(nt, visible_bg.inputs['Color'], np.column_stack((weather_sky, np.ones(len(weather_sky)))))
else:
    nt.links.new(ramp.outputs['Color'], visible_bg.inputs['Color'])
light_path = nt.nodes.new('ShaderNodeLightPath')
mix = nt.nodes.new('ShaderNodeMixShader')
nt.links.new(light_path.outputs['Is Camera Ray'], mix.inputs[0])
nt.links.new(env_bg.outputs[0], mix.inputs[1])
nt.links.new(visible_bg.outputs[0], mix.inputs[2])
nt.links.new(mix.outputs[0], out.inputs[0])

camera = bpy.data.cameras.new('Prism stereo rig')
obj = bpy.data.objects.new('Prism camera', camera)
scene.collection.objects.link(obj)
scene.camera = obj
obj.rotation_mode = 'QUATERNION'
poses = np.asarray(M['cameras'], dtype=np.float32)
positions, targets = xyz(poses[:, :3]), xyz(poses[:, 3:6])
animate(obj, 'location', positions)
animate(obj, 'rotation_quaternion', aim_rotations(positions, targets))
camera.clip_start = .03
camera.clip_end = 2000
camera.sensor_fit = 'VERTICAL'
camera.sensor_height = 24
animate(camera, 'lens', 12 / np.tan(np.radians(poses[:, 6]) / 2))
mode = M['stereo']['mode']
camera.stereo.pivot = 'CENTER'
camera.stereo.interocular_distance = M['stereo']['eyeSeparation']
camera.stereo.convergence_distance = M['stereo']['convergence']
if mode in ('vr180', 'vr360'):
    camera.type = 'PANO'
    pano = camera if hasattr(camera, 'panorama_type') else camera.cycles
    pano.panorama_type = 'EQUIRECTANGULAR'
    limit = math.pi / 2 if mode == 'vr180' else math.pi
    pano.longitude_min, pano.longitude_max = -limit, limit
    pano.latitude_min, pano.latitude_max = -math.pi / 2, math.pi / 2
    camera.stereo.convergence_mode = 'PARALLEL'
    camera.stereo.use_spherical_stereo = True
    camera.stereo.use_pole_merge = True
    camera.stereo.pole_merge_angle_from = math.radians(60)
    camera.stereo.pole_merge_angle_to = math.radians(75)
else:
    camera.type = 'PERSP'
    camera.stereo.convergence_mode = 'OFFAXIS'
    camera.stereo.use_spherical_stereo = False
    camera.stereo.use_pole_merge = False
    camera.dof.use_dof = M['lens']['enabled']
    animate(camera, 'dof.focus_distance', poses[:, 7])
    # Prism aperture is a scene-unit diameter; Blender's f-stop uses lens millimeters.
    lens_mm = 12 / np.tan(np.radians(poses[:, 6]) / 2)
    animate(camera, 'dof.aperture_fstop', np.maximum(.1, lens_mm / (1000 * M['lens']['aperture'])))

scene.render.engine = 'CYCLES'
scene.cycles.samples = M['render']['samples']
scene.cycles.max_bounces = M['render']['bounces']
scene.cycles.use_denoising = True
scene.render.use_motion_blur = False
scene.render.fps = M['fps']
scene.render.fps_base = 1
scene.frame_start, scene.frame_end = 1, M['frames']
scene.frame_step = 1
d = M['dimensions']
scene.render.resolution_x, scene.render.resolution_y = d['eyeWidth'], d['eyeHeight']
scene.render.resolution_percentage = 100
scene.render.pixel_aspect_x = scene.render.pixel_aspect_y = 1
scene.render.use_multiview = mode != 'mono'
scene.render.views_format = 'STEREO_3D'
for view in scene.render.views:
    view.use = view.name in {'left', 'right'}
settings = scene.render.image_settings
if hasattr(settings, 'media_type'):
    settings.media_type = 'IMAGE'
settings.file_format = 'PNG'
settings.color_mode = 'RGB'
settings.color_depth = '8'
settings.views_format = 'STEREO_3D' if mode != 'mono' else 'INDIVIDUAL'
settings.stereo_3d_format.display_mode = 'TOPBOTTOM' if mode == 'vr360' else 'SIDEBYSIDE'
settings.stereo_3d_format.use_sidebyside_crosseyed = False
settings.stereo_3d_format.use_squeezed_frame = False
scene.view_settings.view_transform = 'AgX'
scene.view_settings.exposure = math.log2(M['exposure'])
(BASE / 'frames').mkdir(exist_ok=True)
scene.render.filepath = str(BASE / 'frames' / 'frame_######')
scene.render.use_file_extension = True
scene.render.film_transparent = False
scene['Prism playback'] = {'mono':'2D', 'cinema':'Full SBS / flat screen', 'vr180':'180 equirectangular / SBS / left first', 'vr360':'360 equirectangular / top-bottom / left top'}[mode]
scene.cycles.device = 'CPU'
device_message = 'OptiX unavailable: CPU rendering. Choose a supported device in Preferences > System before a long render.'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'OPTIX'
    prefs.refresh_devices()
    devices = prefs.get_devices_for_type('OPTIX')
    for device in devices:
        device.use = device.type == 'OPTIX'
    selected = [device.name for device in devices if device.use]
    if selected:
        scene.cycles.device = 'GPU'
        device_message = 'OptiX rendering: ' + ', '.join(selected)
except Exception as error:
    device_message += '\n' + str(error)
scene['Prism render device'] = device_message
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(BASE / 'prism-stereo.blend'))
message = device_message + '\nReady: F12 for a test, or Render > Render Animation. Then run assemble_video.py.\nOutput: ' + str(BASE / 'frames')
print('\nPRISM\n' + message)
if not bpy.app.background:
    def show_message(self, context):
        for line in message.splitlines():
            self.layout.label(text=line)
    bpy.context.window_manager.popup_menu(show_message, title='Prism scene ready', icon='INFO')
