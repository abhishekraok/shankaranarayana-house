"""Builds /Game/Maps/Site: the imported meshes, a monsoon-afternoon sky and the player start.

    UnrealEditor-Cmd <uproject> -run=pythonscript -script=unreal/scripts/build_level.py

three.js (x, y, z) metres maps to Unreal (x, z, y) centimetres, as the glTF import showed.
"""
import json, os, unreal

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, '..', '..', 'blender', 'build', 'unreal'))
nav = json.load(open(os.path.join(SRC, 'nav.json')))
def ue(p): return unreal.Vector(p[0] * 100, p[2] * 100, p[1] * 100)

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

# Overcast monsoon afternoon: a high, soft sun from the south-west, thick sky light.
sun = spawn(unreal.DirectionalLight, (0, 0, 5000), (0, -38, 200), 'Sun')
sc = sun.light_component
sc.set_editor_property('intensity', 6.0); sc.set_editor_property('atmosphere_sun_light', True)
sc.set_editor_property('light_source_angle', 6.0)
spawn(unreal.SkyAtmosphere, label='Sky atmosphere')
sky = spawn(unreal.SkyLight, (0, 0, 1000), label='Sky light')
sky.light_component.set_editor_property('real_time_capture', True)
sky.light_component.set_editor_property('intensity', 1.4)
spawn(unreal.VolumetricCloud, label='Clouds')
fog = spawn(unreal.ExponentialHeightFog, (0, 0, -200), label='Humid haze')
fog.component.set_editor_property('fog_density', 0.03)
pp = spawn(unreal.PostProcessVolume, label='Exposure')
pp.set_editor_property('unbound', True)
s = pp.settings
s.set_editor_property('override_auto_exposure_method', True); s.set_editor_property('auto_exposure_method', unreal.AutoExposureMethod.AEM_MANUAL)
s.set_editor_property('override_auto_exposure_bias', True); s.set_editor_property('auto_exposure_bias', 11.0)
pp.set_editor_property('settings', s)

sp = nav['spawn']
spawn(unreal.PlayerStart, (sp['p'][0] * 100, sp['p'][2] * 100, 100), (0, 0, -90), 'Start in front of the house')
les.save_current_level()
print('LEVEL built', MAP)
