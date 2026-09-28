"""Capture every saved photo alignment in the Unreal editor, without saving the map.

UnrealEditor PROJECT -ExecutePythonScript="SCRIPT --poses JSON --out DIR"
Optional: --only filename+filename --width 768 --delay 3. Output stays local/ignored.
Camera positions are eyes in Three.js metres; saved vertical FOV includes legacy cover crops.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import time
import traceback

import unreal
sys.path.insert(0, str(Path(__file__).resolve().parent))
import lighting

parser = argparse.ArgumentParser()
parser.add_argument('--poses', required=True)
parser.add_argument('--out', required=True)
parser.add_argument('--only', default='')
parser.add_argument('--width', type=int, default=768)
parser.add_argument('--delay', type=float, default=3)
parser.add_argument('--warmup', type=float, default=30)
parser.add_argument('--temporal-frames', type=int, default=32)
args = parser.parse_args()
out = Path(args.out).resolve()
out.mkdir(parents=True, exist_ok=True)
raw = Path(args.poses).read_bytes()
data = json.loads(raw)
poses = data['poses']
if args.only:
    names = set(args.only.split('+'))
    poses = [p for p in poses if any(n in p['filename'] for n in names)]
    if len(poses) != len(names):
        raise ValueError('Requested pose not found')
if not poses:
    raise ValueError('No poses')
(out / 'poses.json').write_bytes(raw)
metadata = {'poses_sha256': hashlib.sha256(raw).hexdigest(), 'expected': len(poses),
            'width': args.width, 'delay': args.delay, 'renderer': 'Unreal Engine 5.8',
            'warmup_seconds': args.warmup, 'temporal_frames': args.temporal_frames,
            'started': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'complete': False}


def rotate(q, v):
    x, y, z, w = q
    a, b, c = v
    tx, ty, tz = 2 * (y*c-z*b), 2 * (z*a-x*c), 2 * (x*b-y*a)
    return [a+w*tx+y*tz-z*ty, b+w*ty+z*tx-x*tz, c+w*tz+x*ty-y*tx]


def ue(v, scale=1):
    return unreal.Vector(v[0]*scale, v[2]*scale, v[1]*scale)


def values(v):
    return [v.x, v.y, v.z]


levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
levels.load_level('/Game/Maps/Site')
# Hidden unattended captures must continue when another app gains focus. Keep
# this process-local; do not save the user's editor performance preferences.
performance_class = unreal.load_class(None, '/Script/UnrealEd.EditorPerformanceSettings')
unreal.get_default_object(performance_class).set_editor_property(
    'bThrottleCPUWhenNotForeground', False)
# The subsystem's True removes an override; seed it first to avoid an ensure
# when a fresh viewport has no named realtime override yet.
levels.editor_set_viewport_realtime(False)
levels.editor_set_viewport_realtime(True)
world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
unreal.SystemLibrary.execute_console_command(world, 't.IdleWhenNotForeground 0')
unreal.SystemLibrary.execute_console_command(world, f'r.HighResScreenshotDelay {args.temporal_frames}')
camera = actors.spawn_actor_from_class(unreal.CameraActor, unreal.Vector(), unreal.Rotator(), transient=True)
component = camera.get_component_by_class(unreal.CameraComponent)
component.set_editor_property('constrain_aspect_ratio', True)
index = []
state = {'i': 0, 'task': None, 'started': time.monotonic(), 'ready': time.monotonic()+args.warmup}


def write_progress():
    (out / 'index.json').write_text(json.dumps(index, indent=2), encoding='utf-8')
    metadata['captured'] = len(index)
    (out / 'capture.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')


def finish(error=None):
    metadata['complete'] = error is None
    if error:
        metadata['error'] = error
        unreal.log_error(error)
    write_progress()
    unreal.unregister_slate_post_tick_callback(handle)
    levels.eject_pilot_level_actor()
    actors.destroy_actor(camera)
    unreal.SystemLibrary.quit_editor()


def place(p, i):
    cam = p['camera']
    forward, up = ue(rotate(cam['quaternion'], [0, 0, -1])), ue(rotate(cam['quaternion'], [0, 1, 0]))
    rotation = unreal.MathLibrary.make_rot_from_xz(forward, up)
    # The axis swap changes handedness; constructing from forward/up preserves roll.
    actual_forward = unreal.MathLibrary.get_forward_vector(rotation)
    actual_up = unreal.MathLibrary.get_up_vector(rotation)
    error = max(abs(a-b) for v, av in [(forward, actual_forward), (up, actual_up)]
                for a, b in zip(values(v), values(av)))
    if error > 1e-5:
        raise ValueError(f'Camera orientation error: {error}')
    location = ue(cam['position'], 100)
    camera.set_actor_location_and_rotation(location, rotation, False, True)
    aspect = p['image']['width'] / p['image']['height']
    vfov = cam['verticalFov']
    viewport = p.get('viewport')
    if p['image'].get('fit') == 'cover' and viewport:
        ratio = viewport['width'] / viewport['height']
        if ratio > aspect:
            vfov = math.degrees(2 * math.atan(math.tan(math.radians(vfov)/2) * ratio/aspect))
    hfov = math.degrees(2 * math.atan(math.tan(math.radians(vfov)/2) * aspect))
    component.set_editor_property('aspect_ratio', aspect)
    component.set_editor_property('field_of_view', hfov)
    path = out / f'{i+1:03d}-{Path(p["filename"]).stem}.png'
    return {'camera': Path(p['filename']).stem, 'photo': p['filename'], 'render': path.as_posix(),
            'fov': round(vfov, 2), 'saved_fov': cam['verticalFov'], 'horizontal_fov': hfov,
            'notes': p.get('notes', ''), 'position_cm': values(location),
            'rotation': [rotation.pitch, rotation.yaw, rotation.roll],
            'orientation_error': error, 'width': args.width, 'height': round(args.width/aspect)}


def tick(dt):
    try:
        now = time.monotonic()
        if now < state['ready']:
            return
        if state['task'] is not None:
            entry = state['entry']
            if state['task'].is_task_done() and Path(entry['render']).is_file():
                index.append(entry)
                write_progress()
                unreal.log(f'POSE_CAPTURE {len(index)}/{len(poses)} {entry["photo"]}')
                state['i'] += 1
                state['task'] = None
                state['ready'] = now + .2
            elif now - state['started'] > 120:
                raise TimeoutError(f'Screenshot timed out: {entry["photo"]}')
            return
        if state['i'] == len(poses):
            finish()
            return
        if state['i'] == 0:
            metadata['skylights'] = lighting.audit_sky(actors)
        entry = place(poses[state['i']], state['i'])
        state['entry'] = entry
        state['started'] = now
        state['task'] = unreal.AutomationLibrary.take_high_res_screenshot(
            entry['width'], entry['height'], entry['render'], camera=camera,
            delay=args.delay, force_game_view=True)
        if not state['task'].is_valid_task():
            raise RuntimeError('No active level viewport for screenshot')
    except Exception:
        finish(traceback.format_exc())


write_progress()
unreal.EditorPythonScripting.set_keep_python_script_alive(True)
handle = unreal.register_slate_post_tick_callback(tick)
