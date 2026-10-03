"""Builds /Game/Maps/Site: the imported meshes, a monsoon-afternoon sky and the player start.

    UnrealEditor-Cmd <uproject> -run=pythonscript -script=unreal/scripts/build_level.py

three.js (x, y, z) metres maps to Unreal (x, z, y) centimetres, as the glTF import showed.
"""
import json, os, unreal

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, '..', '..', 'blender', 'build', 'unreal'))
nav = json.load(open(os.path.join(SRC, 'nav.json')))
def ue(p): return unreal.Vector(p[0] * 100, p[2] * 100, p[1] * 100)

import sys
if '--exposure' in sys.argv:
    raise ValueError('Saved lighting is owned by lighting.py; use capture_poses.py --lighting-profile for exposure diagnostics')
les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
MAP = '/Game/Maps/Site'
if unreal.EditorAssetLibrary.does_asset_exist(MAP):  # rebuild in place: clear the old actors
    les.load_level(MAP)
    for a in eas.get_all_level_actors():
        # PostProcessVolume inherits Brush: an isinstance(Brush) check kept every
        # previous Exposure volume and stacked conflicting settings on rebuild.
        if not isinstance(a, unreal.WorldSettings) and a.get_class() != unreal.Brush.static_class():
            eas.destroy_actor(a)
else:
    les.new_level(MAP)

def spawn(cls, loc=(0, 0, 0), rot=(0, 0, 0), label=None):
    a = eas.spawn_actor_from_class(cls, unreal.Vector(*loc), unreal.Rotator(*rot))
    if label: a.set_actor_label(label)
    return a

# Meshes: per-triangle collision so stairs, ramps and walls behave like the web walker's.
manifest = os.path.join(SRC, 'parts.json')
parts = json.load(open(manifest)) if os.path.exists(manifest) else [{'name': p, 'kind': p} for p in ('ground', 'house', 'temple', 'landscape', 'water')]
for entry in parts:
    part, kind = entry['name'], entry['kind']
    mesh = unreal.load_asset(f'/Game/Scene/{part}/{part}/StaticMeshes/{part}.{part}')
    bs = mesh.get_editor_property('body_setup')
    bs.set_editor_property('collision_trace_flag',
        unreal.CollisionTraceFlag.CTF_USE_SIMPLE_AS_COMPLEX if kind == 'water' else unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE)
    unreal.EditorAssetLibrary.save_loaded_asset(mesh)
    a = spawn(unreal.StaticMeshActor, label=part)
    c = a.static_mesh_component; c.set_static_mesh(mesh)
    if kind == 'water': c.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)

# Overcast monsoon afternoon, lit by the same Poly Haven sky as the Blender renders: the HDRI
# backdrop supplies both the visible sky and the sky light; a weak, very soft sun adds shape.
HDR = os.path.normpath(os.path.join(HERE, '..', '..', 'blender', 'build', 'assets', 'overcast_soil_puresky_4k.hdr'))
if not unreal.EditorAssetLibrary.does_asset_exist('/Game/Sky/overcast_soil_puresky_4k'):
    t = unreal.AssetImportTask(); t.filename = HDR; t.destination_path = '/Game/Sky'; t.automated = True; t.save = True
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([t])
cube = unreal.load_asset('/Game/Sky/overcast_soil_puresky_4k')
backdrop = spawn(unreal.EditorAssetLibrary.load_blueprint_class('/HDRIBackdrop/Blueprints/HDRIBackdrop'), (0, 0, 0), label='Overcast sky')
def bp_set(actor, names, value):  # Blueprint variables may carry display-name spacing
    for n in names:
        try: actor.set_editor_property(n, value); return True
        except Exception: pass
    print('BACKDROP could not set', names[0]); return False
bp_set(backdrop, ('Cubemap', 'cubemap'), cube)
bp_set(backdrop, ('Intensity', 'intensity'), 1.0)
bp_set(backdrop, ('Size', 'size'), 30000.0)
bp_set(backdrop, ('LightingDistanceFactor', 'Lighting Distance Factor', 'lighting_distance_factor'), 0.1)
bp_set(backdrop, ('UseCameraProjection', 'Use Camera Projection', 'use_camera_projection'), True)
# Blueprint component overrides are reset when HDRIBackdrop reconstructs on load.
# Its visible backdrop and the persistent native illumination have separate owners.
sys.path.insert(0, HERE)
import lighting
lighting.configure_sky(eas)
sun = spawn(unreal.DirectionalLight, (0, 0, 5000), (0, -55, 200), 'Soft sun')
sc = sun.light_component
sc.set_editor_property('intensity', 1.5); sc.set_editor_property('light_source_angle', 20.0)
# Match the existing authored fixtures with actual native lights. Tiny emissive
# meshes alone are unreliable light sources in Lumen's surface cache.
meta = json.load(open(os.path.join(HERE, '..', '..', 'blender', 'build', 'scene.json')))
for index, obj in enumerate(meta['objects']):
    if obj['name'] not in ('Shrine warm bulb', 'Sanctum oil lamp flame'): continue
    matrix = obj['matrix']
    p = ue((matrix[12], matrix[13] - .10, matrix[14]))
    lamp = spawn(unreal.PointLight, (p.x,p.y,p.z), label=f'Fixture light {index}')
    light = lamp.light_component
    light.set_mobility(unreal.ComponentMobility.MOVABLE)
    light.set_editor_property('intensity_units', unreal.LightUnits.LUMENS)
    light.set_editor_property('intensity', 25.0 if obj['name'] == 'Shrine warm bulb' else 2.0)  # the sanctum reads dark in 'God room 2'
    light.set_editor_property('attenuation_radius', 500.0 if obj['name'] == 'Shrine warm bulb' else 220.0)
    light.set_editor_property('source_radius', 4.0)
    light.set_editor_property('use_temperature', True)
    light.set_editor_property('temperature', 3800.0 if obj['name'] == 'Shrine warm bulb' else 2200.0)
fog = spawn(unreal.ExponentialHeightFog, (0, 0, -200), label='Humid haze')
fog.component.set_editor_property('fog_density', 0.02)
pp = spawn(unreal.PostProcessVolume, label='Exposure')
pp.set_editor_property('unbound', True)

sp = nav['spawn']
spawn(unreal.PlayerStart, (sp['p'][0] * 100, sp['p'][2] * 100, 100), (0, 0, -90), 'Start in front of the house')
# Apply the same saved profile as finish_game.py, including the authored sun direction.
sys.path.insert(0, HERE)
import lighting
lighting.configure(eas)
les.save_current_level()
print('LEVEL built', MAP)
