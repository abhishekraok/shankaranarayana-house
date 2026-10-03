"""Capture every saved photo alignment in the Unreal editor, without saving the map.

UnrealEditor PROJECT -ExecutePythonScript="SCRIPT --poses JSON --out DIR"
Optional: --only filename+filename --width 768 --delay 3. Output stays local/ignored.
Camera positions are eyes in Three.js metres; saved vertical FOV includes legacy cover crops.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
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
parser.add_argument('--console', default=os.environ.get('CAPTURE_CONSOLE', ''),
                    help='semicolon-separated console commands (diagnostics); or CAPTURE_CONSOLE')
parser.add_argument('--lighting-profile', help='Read-only diagnostic light/post-process overrides from JSON')
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
metadata['console_commands'] = [c.strip() for c in args.console.split(';') if c.strip()]


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
saved_skylights = lighting.audit_sky(actors)
mesh_editor = unreal.get_editor_subsystem(unreal.StaticMeshEditorSubsystem)
manifest = json.loads((Path(__file__).resolve().parents[2] / 'blender/build/unreal/parts.json').read_text())
metadata['mesh_build_settings'] = []
for part in manifest:
    name = part['name']
    mesh = unreal.load_asset(f'/Game/Scene/{name}/{name}/StaticMeshes/{name}.{name}')
    assert mesh, name
    build = mesh_editor.get_lod_build_settings(mesh, 0)
    assert not build.recompute_normals, f'Run configure_lumen.py to preserve imported normals: {name}'
    metadata['mesh_build_settings'].append({'mesh': name, 'recompute_normals': build.recompute_normals,
                                           'max_lumen_mesh_cards': build.max_lumen_mesh_cards})
profile = json.loads(Path(args.lighting_profile).read_text()) if args.lighting_profile else {}
if set(profile) - {'sun', 'sky', 'post_process', 'material_scalars', 'object_color_gains', 'water_roughness'}:
    raise ValueError('Unknown diagnostic lighting profile field')
for section, allowed in [('sun', {'yaw', 'pitch', 'intensity'}), ('sky', {'intensity'})]:
    if set(profile.get(section, {})) - allowed:
        raise ValueError('Unknown ' + section + ' override')
    if any(not isinstance(v, (float, int)) or not math.isfinite(v)
           for v in profile.get(section, {}).values()):
        raise ValueError('Light overrides must be finite numbers')
for actor in actors.get_all_level_actors():
    if actor.get_actor_label() == 'Soft sun':
        overrides = profile.get('sun', {})
        rotation = actor.get_actor_rotation()
        actor.set_actor_rotation(unreal.Rotator(
            pitch=overrides.get('pitch', rotation.pitch),
            yaw=overrides.get('yaw', rotation.yaw), roll=rotation.roll), False)
        if 'intensity' in overrides:
            actor.light_component.set_editor_property('intensity', overrides['intensity'])
        rotation = actor.get_actor_rotation()
        metadata['sun'] = {'yaw': rotation.yaw, 'pitch': rotation.pitch,
                           'intensity': actor.light_component.intensity}
    if actor.get_actor_label() == lighting.SKY_NAME and 'intensity' in profile.get('sky', {}):
        actor.light_component.set_editor_property('intensity', profile['sky']['intensity'])
metadata['diagnostic_lighting_profile'] = profile
if 'water_roughness' in profile:
    roughness = profile['water_roughness']
    if not isinstance(roughness, (float, int)) or not math.isfinite(roughness) or not .02 <= roughness <= .4:
        raise ValueError('Diagnostic water roughness must be between .02 and .4')
    water_parts = [part for part in manifest if part['kind'] == 'water']
    assert len(water_parts) == 1, 'Expected one water resource'
    name = water_parts[0]['name']
    mesh = unreal.load_asset(f'/Game/Scene/{name}/{name}/StaticMeshes/{name}.{name}')
    slots = list(mesh.static_materials)
    assert len(slots) == 1, 'Expected one water material slot'
    material = slots[0].material_interface
    assert isinstance(material, unreal.MaterialInstanceConstant), 'Expected a water material instance'
    parent = material.get_editor_property('parent')
    assert parent.get_editor_property('shading_model') == unreal.MaterialShadingModel.MSM_SINGLE_LAYER_WATER
    assert 'Roughness' in {str(p) for p in unreal.MaterialEditingLibrary.get_scalar_parameter_names(material)}
    unreal.MaterialEditingLibrary.set_material_instance_scalar_parameter_value(material, 'Roughness', roughness)
    metadata['diagnostic_water'] = {'material': material.get_path_name(), 'roughness': roughness}
material_scalars = profile.get('material_scalars', {})
if material_scalars:
    ranges = {'SheetFill': (0, 1), 'SheetFillFront': (0, 1),
              'LeafCellCM': (1, 1000), 'LeafClumpCM': (1, 2000),
              'LeafFineContrast': (0, 1.8), 'LeafClumpContrast': (0, 2),
              'LeafMapContrast': (0, 1), 'TwoSidedNormalFlip': (0, 1)}
    if set(material_scalars) - ranges.keys():
        raise ValueError('Unsupported diagnostic material parameter')
    if any(not isinstance(v, (float, int)) or not math.isfinite(v) or not ranges[k][0] <= v <= ranges[k][1]
           for k, v in material_scalars.items()):
        raise ValueError('Diagnostic material parameter is outside its permitted range')
    edited = set()
    found = set()
    for actor in actors.get_all_level_actors():
        for mesh in actor.get_components_by_class(unreal.StaticMeshComponent):
            for slot in range(mesh.get_num_materials()):
                material = mesh.get_material(slot)
                if not isinstance(material, unreal.MaterialInstanceConstant) or material.get_path_name() in edited:
                    continue
                parameters = {str(p) for p in unreal.MaterialEditingLibrary.get_scalar_parameter_names(material)}
                for key, value in material_scalars.items():
                    if key in parameters:
                        unreal.MaterialEditingLibrary.set_material_instance_scalar_parameter_value(material, key, value)
                        edited.add(material.get_path_name())
                        found.add(key)
    if found != material_scalars.keys():
        raise ValueError('Rebuild material masters before testing: ' + ', '.join(material_scalars.keys() - found))
    metadata['diagnostic_materials'] = sorted(edited)
if profile.get('object_color_gains'):
    scene = json.loads((Path(__file__).resolve().parents[2] / 'blender/build/scene.json').read_text())
    paths = []
    for object_name, gain in profile['object_color_gains'].items():
        if not isinstance(gain, (float, int)) or not math.isfinite(gain) or not 0.1 <= gain <= 4:
            raise ValueError('Diagnostic color gain must be between 0.1 and 4')
        objects = [o for o in scene['objects'] if o['name'] == object_name]
        if len(objects) != 1:
            raise ValueError('Expected exactly one authored object: ' + object_name)
        slots = set(objects[0]['materials'])
        if not slots or len([o for o in scene['objects'] if slots.intersection(o['materials'])]) != 1:
            raise ValueError('Material is shared; no diagnostic tint applied: ' + object_name)
        for i in slots:
            name = re.sub(r'[^A-Za-z0-9]+', '_', scene['materials'][i]['name']).strip('_')
            material = unreal.load_asset(f'/Game/Materials/Web/MI_{name}_{i}')
            if not isinstance(material, unreal.MaterialInstanceConstant):
                raise ValueError('Material was not rebuilt: ' + object_name)
            color = unreal.MaterialEditingLibrary.get_material_instance_vector_parameter_value(material, 'Color')
            unreal.MaterialEditingLibrary.set_material_instance_vector_parameter_value(
                material, 'Color', unreal.LinearColor(color.r * gain, color.g * gain, color.b * gain, color.a))
            paths.append(material.get_path_name())
    metadata['diagnostic_color_materials'] = paths
unreal.SystemLibrary.execute_console_command(world, 't.IdleWhenNotForeground 0')
unreal.SystemLibrary.execute_console_command(world, f'r.HighResScreenshotDelay {args.temporal_frames}')
for command in filter(None, (c.strip() for c in args.console.split(';'))):
    unreal.SystemLibrary.execute_console_command(world, command)
# Diagnostics: CAPTURE_PP='{"white_temp": 5600}' overrides the global volume for this run only.
for volume in (a for a in actors.get_all_level_actors() if isinstance(a, unreal.PostProcessVolume)):
    settings = volume.settings
    overrides = {**json.loads(os.environ.get('CAPTURE_PP') or '{}'), **profile.get('post_process', {})}
    for key, value in overrides.items():
        if isinstance(value, list):
            value = unreal.Vector4(*value)
        if key == 'lumen_ray_lighting_mode' and isinstance(value, str):
            value = getattr(unreal.LumenRayLightingModeOverride, value)
        settings.set_editor_property('override_' + key, True)
        settings.set_editor_property(key, value)
    volume.set_editor_property('settings', settings)
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
            metadata['skylights'] = saved_skylights
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
