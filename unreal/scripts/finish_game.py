"""Apply game mode, adaptive exposure and generated audio after build_level.py.

    UnrealEditor-Cmd <uproject> -run=pythonscript -script=unreal/scripts/finish_game.py
"""
from pathlib import Path
import unreal

project = Path(unreal.Paths.project_dir())
les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
les.load_level('/Game/Maps/Site')
world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
mode = unreal.load_class(None, '/Script/QuietWalk.WalkGameMode')
assert mode, 'Build QuietWalkEditor before running finish_game.py'
world.get_world_settings().set_editor_property('default_game_mode', mode)
for actor in actors.get_all_level_actors():
    if actor.get_actor_label() == 'Overcast sky':
        # HDRIBackdrop includes a flat ground cap. At z=0 it covers the sunken
        # lake with an opaque white plane, regardless of the water material.
        actor.set_actor_location(unreal.Vector(0, 0, -1500), False, False)
    if isinstance(actor, unreal.PostProcessVolume):
        settings = actor.settings
        values = {
            'auto_exposure_method': unreal.AutoExposureMethod.AEM_HISTOGRAM,
            'auto_exposure_min_brightness': -4.0,
            'auto_exposure_max_brightness': 4.0,
            'auto_exposure_bias': 0.0,
            'auto_exposure_speed_up': 2.0,
            'auto_exposure_speed_down': 1.0,
            'motion_blur_amount': 0.0,
            'local_exposure_shadow_contrast_scale': 0.65,
            'local_exposure_highlight_contrast_scale': 0.8,
        }
        for key, value in values.items():
            settings.set_editor_property('override_'+key, True)
            settings.set_editor_property(key, value)
        actor.set_editor_property('settings', settings)
for name in ('Ambience', 'Footstep'):
    task=unreal.AssetImportTask()
    task.filename=str(project / 'Saved/WalkAudio' / (name+'.wav'))
    task.destination_path='/Game/WalkAudio'
    task.automated=True
    task.replace_existing=True
    task.save=True
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
    sound=unreal.load_asset('/Game/WalkAudio/'+name)
    assert sound, name+' import failed'
    sound.set_editor_property('looping', name=='Ambience')
    unreal.EditorAssetLibrary.save_loaded_asset(sound)
les.save_current_level()
print('QUIETWALK level configured: game mode, adaptive exposure and audio')
