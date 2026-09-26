"""Adds the web app's guided tour as an animated camera and saves a viewer file.

    blender -b blender/build/lookdev.blend -P blender/build_tour.py

Writes blender/build/tour.blend: the tour camera is active, every 3D view looks
through it with real-time EEVEE shading, and the timeline carries the tour's labels
as markers. blender/view-tour.cmd opens it and starts playing.
"""
import bpy, json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
tour = json.load(open(os.path.join(HERE, 'build', 'tour.json')))
scene = bpy.context.scene
root = bpy.data.objects['three.js world']

cd = bpy.data.cameras.new('Tour'); cd.sensor_fit = 'VERTICAL'; cd.angle_y = math.radians(tour['fov'])
cd.clip_start = 0.05; cd.clip_end = 600
cam = bpy.data.objects.new('Tour camera', cd); scene.collection.objects.link(cam)
cam.parent = root  # the root's +90° X turn maps three.js space into Blender
cam.rotation_mode = 'QUATERNION'

# Key every other frame; the tour's own curve is smooth, so Bezier keys follow it.
STEP = 2
prev = None
for f in range(0, len(tour['frames']), STEP):
    x, y, z, qx, qy, qz, qw = tour['frames'][f]
    q = [qw, qx, qy, qz]
    if prev and sum(a * b for a, b in zip(prev, q)) < 0: q = [-v for v in q]  # keep quaternions continuous
    prev = q
    cam.location = (x, y, z); cam.rotation_quaternion = q
    cam.keyframe_insert('location', frame=f + 1); cam.keyframe_insert('rotation_quaternion', frame=f + 1)

scene.camera = cam
scene.frame_start = 1; scene.frame_end = len(tour['frames'])
scene.render.fps = tour['fps']; scene.sync_mode = 'FRAME_DROP'  # keep real-time speed
for m in list(scene.timeline_markers): scene.timeline_markers.remove(m)
for f, label in tour['markers']: scene.timeline_markers.new(label, frame=f + 1)

# Real-time viewing: EEVEE in the viewport, looking through the tour camera.
scene.render.engine = 'BLENDER_EEVEE'
# EEVEE reads brighter than Cycles at the same exposure; ray-traced GI adds the bounce light.
scene.view_settings.exposure = 0.6
try:
    scene.eevee.use_raytracing = True; scene.eevee.use_fast_gi = True
except AttributeError: pass
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type != 'VIEW_3D': continue
        for space in area.spaces:
            if space.type != 'VIEW_3D': continue
            space.shading.type = 'RENDERED'; space.overlay.show_overlays = False
            space.region_3d.view_perspective = 'CAMERA'; space.lock_camera = False
            space.clip_end = 600
scene.frame_set(1)
out = os.path.join(HERE, 'build', 'tour.blend')
bpy.ops.wm.save_as_mainfile(filepath=out)
print('saved', out, 'frames', scene.frame_end)
