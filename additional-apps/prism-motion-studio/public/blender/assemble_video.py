"""Run after Render Animation completes. Creates an MP4 beside this script."""
import bpy
import json
import sys
import tempfile
from pathlib import Path

BASE = Path(sys.argv[sys.argv.index('--') + 1]).resolve() if '--' in sys.argv else Path(bpy.path.abspath(__file__)).resolve().parent
M = json.loads((BASE / 'scene.json').read_text(encoding='utf-8'))
files = [BASE / 'frames' / f'frame_{n:06d}.png' for n in range(1, M['frames'] + 1)]
missing = [p for p in files if not p.is_file() or p.stat().st_size == 0]
if missing:
    raise RuntimeError(f'{len(missing)} frames are missing. Finish Render Animation first. First missing frame: {missing[0]}')
scene = bpy.data.scenes.new('Prism video assembly')
render = scene.render
d = M['dimensions']
render.resolution_x, render.resolution_y = d['width'], d['height']
render.resolution_percentage = 100
render.pixel_aspect_x = render.pixel_aspect_y = 1
render.fps, render.fps_base = M['fps'], 1
render.use_multiview = False
render.use_sequencer = True
render.use_compositing = False
render.use_file_extension = True
render.use_stamp = False
scene.frame_start, scene.frame_end, scene.frame_step = 1, M['frames'], 1
editor = scene.sequence_editor_create()
strips = editor.strips if hasattr(editor, 'strips') else editor.sequences
images = strips.new_image('Prism packed frames', str(files[0]), channel=1, frame_start=1)
for path in files[1:]:
    images.elements.append(path.name)
images.frame_final_duration = M['frames']
images.use_multiview = False
images.views_format = 'INDIVIDUAL'
images.colorspace_settings.name = 'sRGB'
images.blend_type = 'REPLACE'
scene.display_settings.display_device = 'sRGB'
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
scene.view_settings.use_curve_mapping = False
scene.sequencer_colorspace_settings.name = 'sRGB'
audio = BASE / 'soundtrack.wav'
if audio.exists():
    strips.new_sound('Prism soundtrack', str(audio), channel=2, frame_start=1)
settings = render.image_settings
if hasattr(settings, 'media_type'):
    settings.media_type = 'VIDEO'
settings.file_format = 'FFMPEG'
settings.color_mode = 'RGB'
settings.views_format = 'INDIVIDUAL'
ff = render.ffmpeg
ff.format = 'MPEG4'
ff.constant_rate_factor = 'HIGH'
ff.ffmpeg_preset = 'GOOD'
ff.gopsize = M['fps']
ff.use_autosplit = False
ff.audio_codec = 'AAC' if audio.exists() else 'NONE'
ff.audio_channels = 'STEREO'
ff.audio_mixrate = 48000
ff.audio_bitrate = 192
suffix = {'mono':'', 'cinema':'_LR_Full_SBS', 'vr180':'_LR_180', 'vr360':'_TB_360'}[M['stereo']['mode']]
output = BASE / ('Prism' + suffix + '.mp4')
supported = {item.identifier for item in ff.bl_rna.properties['codec'].enum_items}
large = d['width'] > 4096 or d['height'] > 2160
candidates = [c for c in (('H265', 'AV1') if large else ('H264', 'H265', 'AV1')) if c in supported]
chosen = None
errors = []
with tempfile.TemporaryDirectory(prefix='prism-codec-') as probe_dir:
    scene.frame_end = min(2, M['frames'])
    for codec in candidates:
        ff.codec = codec
        render.filepath = str(Path(probe_dir) / (codec + '.mp4'))
        actual = Path(render.frame_path(frame=scene.frame_start, preview=False, view='')).resolve()
        try:
            result = bpy.ops.render.render(animation=True, scene=scene.name)
            if 'FINISHED' in result and actual.is_file() and actual.stat().st_size > 0:
                chosen = codec
                break
        except RuntimeError as error:
            errors.append(str(error))
scene.frame_end = M['frames']
if not chosen:
    audio_flags = '-i "soundtrack.wav" -c:a aac -b:a 192k ' if audio.exists() else ''
    command = f'ffmpeg -framerate {M["fps"]} -start_number 1 -i "frames/frame_%06d.png" {audio_flags}-frames:v {M["frames"]} -c:v libx265 -crf 18 -pix_fmt yuv420p -tag:v hvc1 "{output.name}"'
    help_text = 'This Blender build cannot encode this resolution. Your PNGs are safe. Use Preview quality or run this command from the package folder with FFmpeg installed:\n\n' + command + '\n\n' + '\n'.join(errors)
    (BASE / 'ENCODING_HELP.txt').write_text(help_text, encoding='utf-8')
    raise RuntimeError(help_text)
ff.codec = chosen
render.filepath = str(output)
if bpy.context.window:
    bpy.context.window.scene = scene
scene.frame_set(1)
output = Path(render.frame_path(frame=scene.frame_start, preview=False, view='')).resolve()
result = bpy.ops.render.render(animation=True, scene=scene.name)
if 'FINISHED' not in result or not output.exists() or output.stat().st_size == 0:
    raise RuntimeError('Video encoding did not finish. The PNG frames remain available.')
print('PRISM VIDEO READY: ' + str(output))
if not bpy.app.background:
    def show_result(self, context):
        self.layout.label(text='Video ready: ' + str(output))
    bpy.context.window_manager.popup_menu(show_result, title='Prism MP4 ready', icon='CHECKMARK')
