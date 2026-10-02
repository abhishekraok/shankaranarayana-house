"""Shared, persistent overcast lighting for the editor and packaged walk."""
import json
from pathlib import Path
import unreal

SKY_NAME = 'Overcast ambient'
SKY_ASSET = '/Game/Sky/overcast_soil_puresky_4k'
SKY_INTENSITY = 3.5
POST_PROCESS = {
    'auto_exposure_method': unreal.AutoExposureMethod.AEM_HISTOGRAM,
    'auto_exposure_min_brightness': -8.0,
    'auto_exposure_max_brightness': 4.0,
    'auto_exposure_bias': 0.0,
    'auto_exposure_speed_up': 2.0,
    'auto_exposure_speed_down': 1.0,
    'motion_blur_amount': 0.0,
    # The overcast HDRI renders warm (blue about 10% low against red); the photographs are
    # neutral grey under cloud. Cooler white balance, checked at 14.56.30, 15.05.42, 15.23.35.
    'white_temp': 5900.0,
    'local_exposure_shadow_contrast_scale': 1.0,
    'local_exposure_highlight_contrast_scale': 1.0,
    'lumen_scene_lighting_quality': 2.0,
    'lumen_final_gather_quality': 2.0,
    'lumen_scene_detail': 2.0,
    'lumen_reflection_quality': 2.0,
    'lumen_ray_lighting_mode': unreal.LumenRayLightingModeOverride.SURFACE_CACHE,
    # Small ambient floor for joined interior meshes; distance weighting keeps
    # corners shaded. This is an artistic approximation of missing sky bounce.
    'lumen_skylight_leaking': 0.008,
    'lumen_full_skylight_leaking_distance': 300.0,
}


def configure(actors):
    configure_sky(actors)
    scene = json.loads((Path(__file__).resolve().parents[2] / 'blender/build/scene.json').read_text())
    bulbs = {f'Fixture light {i}' for i, obj in enumerate(scene['objects'])
             if obj['name'] == 'Shrine warm bulb'}
    for actor in actors.get_all_level_actors():
        if actor.get_actor_label() in bulbs:
            light = actor.light_component
            light.set_editor_property('intensity', 6.0)
            light.set_editor_property('temperature', 4800.0)
            light.set_editor_property('source_radius', 8.0)
        if isinstance(actor, unreal.PostProcessVolume):
            settings = actor.settings
            for key, value in POST_PROCESS.items():
                settings.set_editor_property('override_' + key, True)
                settings.set_editor_property(key, value)
            actor.set_editor_property('settings', settings)


def configure_sky(actors):
    """Use a native light: HDRIBackdrop reconstructs and loses component overrides."""
    cube = unreal.load_asset(SKY_ASSET)
    assert isinstance(cube, unreal.TextureCube), 'Import the overcast HDR before lighting'
    existing = []
    for actor in actors.get_all_level_actors():
        if actor.get_actor_label() == 'Overcast sky':
            # Retain the visible backdrop, but let exactly one native light own GI.
            for component in actor.get_components_by_class(unreal.SkyLightComponent):
                component.set_editor_property('affects_world', False)
        if actor.get_actor_label() == SKY_NAME:
            existing.append(actor)
    assert len(existing) <= 1, 'Duplicate native skylights'
    sky = existing[0] if existing else actors.spawn_actor_from_class(
        unreal.SkyLight, unreal.Vector(0, 0, 500))
    sky.set_actor_label(SKY_NAME)
    light = sky.light_component
    light.set_mobility(unreal.ComponentMobility.MOVABLE)
    light.set_editor_property('source_type', unreal.SkyLightSourceType.SLS_SPECIFIED_CUBEMAP)
    light.set_editor_property('cubemap', cube)
    light.set_editor_property('intensity', SKY_INTENSITY)
    light.set_editor_property('real_time_capture', False)
    light.set_editor_property('lower_hemisphere_is_black', False)
    light.recapture_sky()


def audit_sky(actors):
    """Run after reloading, since an in-memory check misses Blueprint resets."""
    report = []
    for actor in actors.get_all_level_actors():
        for light in actor.get_components_by_class(unreal.SkyLightComponent):
            report.append({
                'actor': actor.get_actor_label(),
                'affects_world': light.get_editor_property('affects_world'),
                'visible': light.is_visible(),
                'intensity': light.intensity,
                'cubemap': light.cubemap.get_path_name() if light.cubemap else None,
            })
    active = [entry for entry in report if entry['affects_world'] and entry['visible']]
    assert len(active) == 1, f'Expected one active skylight: {report}'
    assert active[0]['actor'] == SKY_NAME, report
    assert active[0]['cubemap'] == SKY_ASSET + '.overcast_soil_puresky_4k', report
    assert abs(active[0]['intensity'] - SKY_INTENSITY) < 1e-5, report
    return report
