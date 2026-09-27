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
EXPOSURE = float(sys.argv[sys.argv.index('--exposure') + 1]) if '--exposure' in sys.argv else 1.0
les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
MAP = '/Game/Maps/Site'
if unreal.EditorAssetLibrary.does_asset_exist(MAP):  # rebuild in place: clear the old actors
    les.load_level(MAP)
    for a in eas.get_all_level_actors():
        if not isinstance(a, (unreal.WorldSettings, unreal.Brush)): eas.destroy_actor(a)
else:
    les.new_level(MAP)

def spawn(cls, loc=(0, 0, 0), rot=(0, 0, 0), label=None):
    a = eas.spawn_actor_from_class(cls, unreal.Vector(*loc), unreal.Rotator(*rot))
    if label: a.set_actor_label(label)
    return a

# Meshes: per-triangle collision so stairs, ramps and walls behave like the web walker's.
for part in ('ground', 'house', 'temple', 'landscape', 'water'):
    mesh = unreal.load_asset(f'/Game/Scene/{part}/{part}/StaticMeshes/{part}.{part}')
    bs = mesh.get_editor_property('body_setup')
    bs.set_editor_property('collision_trace_flag',
        unreal.CollisionTraceFlag.CTF_USE_SIMPLE_AS_COMPLEX if part == 'water' else unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE)
    unreal.EditorAssetLibrary.save_loaded_asset(mesh)
    a = spawn(unreal.StaticMeshActor, label=part)
    c = a.static_mesh_component; c.set_static_mesh(mesh)
    if part == 'water': c.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)

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
# The backdrop's own sky light never captures in a level saved from a commandlet, which left
# every surface black. Drive it explicitly from the same cubemap and capture it now.
skies = backdrop.get_components_by_class(unreal.SkyLightComponent)
if not skies:
    skies = [spawn(unreal.SkyLight, (0, 0, 500), label='Overcast sky light').light_component]
for sky in skies:
    sky.set_editor_property('source_type', unreal.SkyLightSourceType.SLS_SPECIFIED_CUBEMAP)
    sky.set_editor_property('cubemap', cube); sky.set_editor_property('intensity', 2.5)
    sky.set_editor_property('real_time_capture', False); sky.set_mobility(unreal.ComponentMobility.MOVABLE)
    sky.recapture_sky()
print('SKY lights', len(skies))
sun = spawn(unreal.DirectionalLight, (0, 0, 5000), (0, -55, 200), 'Soft sun')
sc = sun.light_component
sc.set_editor_property('intensity', 6.0); sc.set_editor_property('light_source_angle', 12.0)
fog = spawn(unreal.ExponentialHeightFog, (0, 0, -200), label='Humid haze')
fog.component.set_editor_property('fog_density', 0.02)
pp = spawn(unreal.PostProcessVolume, label='Exposure')
pp.set_editor_property('unbound', True)
s = pp.settings
# The sky and sun are in relative (not photometric) units, so physical camera exposure
# (EV100 about 14, meant for 100k-lux daylight) renders the scene black. Manual exposure
# without the physical camera leaves brightness to the bias alone.
s.set_editor_property('override_auto_exposure_method', True); s.set_editor_property('auto_exposure_method', unreal.AutoExposureMethod.AEM_MANUAL)
s.set_editor_property('override_auto_exposure_apply_physical_camera_exposure', True); s.set_editor_property('auto_exposure_apply_physical_camera_exposure', False)
s.set_editor_property('override_auto_exposure_bias', True); s.set_editor_property('auto_exposure_bias', EXPOSURE)
pp.set_editor_property('settings', s)

sp = nav['spawn']
spawn(unreal.PlayerStart, (sp['p'][0] * 100, sp['p'][2] * 100, 100), (0, 0, -90), 'Start in front of the house')
les.save_current_level()
print('LEVEL built', MAP)
