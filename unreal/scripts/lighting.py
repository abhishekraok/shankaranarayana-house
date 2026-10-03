"""Shared, persistent overcast lighting for the editor and packaged walk."""
import json
import math
from pathlib import Path
import unreal

SKY_NAME = 'Overcast ambient'
SKY_ASSET = '/Game/Sky/overcast_soil_puresky_4k'
SKY_INTENSITY = 3.5
SUN_NAME = 'Soft sun'
SUN_INTENSITY = 1.5
SUN_SOURCE_ANGLE = 20.0
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
    # The former contrast/gamma grade crushed timber and shifted weathered stone.
    # Keep the measured material response and a smaller interior ambient floor.
    'color_contrast': unreal.Vector4(1.0, 1.0, 1.0, 1.0),
    'color_saturation': unreal.Vector4(1.0, 1.0, 1.0, 1.0),
    'color_gamma': unreal.Vector4(1.0, 1.0, 1.0, 1.0),
    'local_exposure_shadow_contrast_scale': 1.0,
    'local_exposure_highlight_contrast_scale': 1.0,
    'lumen_scene_lighting_quality': 2.0,
    'lumen_final_gather_quality': 2.0,
    'lumen_scene_detail': 2.0,
    'lumen_reflection_quality': 2.0,
    'lumen_ray_lighting_mode': unreal.LumenRayLightingModeOverride.SURFACE_CACHE,
    # Small ambient floor for joined interior meshes; distance weighting keeps
    # corners shaded. This is an artistic approximation of missing sky bounce.
    'lumen_skylight_leaking': 0.004,
    'lumen_full_skylight_leaking_distance': 300.0,
}


def configure(actors):
    configure_sky(actors)
    configure_sun(actors)
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


def sun_direction():
    """Use the exported web light's direction, retaining native light units."""
    scene = json.loads((Path(__file__).resolve().parents[2] / 'blender/build/scene.json').read_text())
    source = scene.get('lighting', {}).get('sun')
    assert isinstance(source, dict), 'Re-export the scene with its authored sun before configuring lighting'
    position, target = source.get('position'), source.get('target')
    for vector in (position, target):
        assert isinstance(vector, list) and len(vector) == 3, f'Invalid authored sun vector: {vector}'
        assert all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)
                   for v in vector), f'Invalid authored sun vector: {vector}'
    # Three.js x,y,z -> Unreal x,z,y. Directional-light forward follows emitted rays.
    ray = [target[i] - position[i] for i in (0, 2, 1)]
    length = math.sqrt(sum(v * v for v in ray))
    assert length > 0, 'The authored sun position and target must differ'
    return source, [v / length for v in ray]


def native_sun(actors):
    suns = [actor for actor in actors.get_all_level_actors()
            if isinstance(actor, unreal.DirectionalLight)]
    assert len(suns) == 1 and suns[0].get_actor_label() == SUN_NAME, \
        f'Expected exactly one directional light named {SUN_NAME}: {[a.get_actor_label() for a in suns]}'
    return suns[0]


def configure_sun(actors):
    _, direction = sun_direction()
    sun = native_sun(actors)
    sun.set_actor_rotation(unreal.MathLibrary.make_rot_from_x(unreal.Vector(*direction)), False)
    sun.light_component.set_editor_property('intensity', SUN_INTENSITY)
    sun.light_component.set_editor_property('light_source_angle', SUN_SOURCE_ANGLE)


def audit_sun(actors):
    """Validate the saved emission direction without Euler-angle wrapping ambiguity."""
    source, expected = sun_direction()
    sun = native_sun(actors)
    light = sun.light_component
    rotation = sun.get_actor_rotation()
    forward = unreal.MathLibrary.get_forward_vector(rotation)
    actual = [forward.x, forward.y, forward.z]
    dot = max(-1.0, min(1.0, sum(a * b for a, b in zip(actual, expected))))
    assert dot >= 1.0 - 1e-8, f'Saved sun direction differs from the authored light: {actual}, {expected}'
    assert light.get_editor_property('affects_world') and light.is_visible(), 'Native sun is disabled'
    assert abs(light.intensity - SUN_INTENSITY) < 1e-5, 'Native sun intensity changed'
    angle = light.get_editor_property('light_source_angle')
    assert abs(angle - SUN_SOURCE_ANGLE) < 1e-5, 'Native sun source angle changed'
    return {'actor': SUN_NAME, 'authored': source, 'expected_forward': expected,
            'forward': actual, 'direction_dot': dot,
            'direction_error_degrees': math.degrees(math.acos(dot)),
            'rotation': {'pitch': rotation.pitch, 'yaw': rotation.yaw, 'roll': rotation.roll},
            'intensity': light.intensity, 'source_angle': angle}


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
