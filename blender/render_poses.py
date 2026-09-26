"""Renders every photo camera in a .blend for side-by-side comparison with the photographs.

    blender -b blender/build/blockout.blend -P blender/render_poses.py -- [--out DIR] [--width 768] [--samples 32] [--only 14.28.19,15.28.26] [--fov 48]

--fov forces one vertical field of view on every camera (the 2011 phone had a fixed lens),
so poses that were zoomed to hide a layout error show that error again.
"""
import bpy, sys, os, math, json, time

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def opt(name, default):
    return argv[argv.index(name) + 1] if name in argv else default
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(opt('--out', os.path.join(HERE, 'build', 'renders')))
WIDTH = int(opt('--width', 768)); SAMPLES = int(opt('--samples', 32))
ONLY = [s for s in opt('--only', '').split(',') if s]
FORCE_FOV = float(opt('--fov', 0)) or None
os.makedirs(OUT, exist_ok=True)

prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'OPTIX'; prefs.get_devices()
for d in prefs.devices: d.use = d.type == 'OPTIX'
s = bpy.context.scene
s.render.engine = 'CYCLES'; s.cycles.device = 'GPU'
s.cycles.samples = SAMPLES; s.cycles.use_denoising = True; s.cycles.denoiser = 'OPTIX'
s.cycles.use_adaptive_sampling = True
s.render.image_settings.file_format = 'JPEG'; s.render.image_settings.quality = 90

index = []
cams = [o for o in s.objects if o.type == 'CAMERA' and (not ONLY or any(k in o.name for k in ONLY))]
for cam in sorted(cams, key=lambda o: o.name):
    aspect = cam.get('aspect', 4 / 3)
    s.render.resolution_x = WIDTH; s.render.resolution_y = round(WIDTH / aspect); s.render.resolution_percentage = 100
    if FORCE_FOV: cam.data.angle_y = math.radians(FORCE_FOV)
    s.camera = cam
    s.render.filepath = os.path.join(OUT, cam.name + '.jpg')
    t = time.time(); bpy.ops.render.render(write_still=True)
    index.append({'camera': cam.name, 'photo': cam.get('photo'), 'render': s.render.filepath,
                  'fov': round(math.degrees(cam.data.angle_y), 1), 'saved_fov': cam.get('saved_fov'),
                  'notes': cam.get('notes', ''), 'seconds': round(time.time() - t, 1)})
    print(f"rendered {cam.name} fov {index[-1]['fov']} in {index[-1]['seconds']}s")
json.dump(index, open(os.path.join(OUT, 'index.json'), 'w'), indent=1)
