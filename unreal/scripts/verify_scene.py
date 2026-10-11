"""Audit the generated level's native partitions, material assignments and collision."""
import json
import struct
from pathlib import Path
import unreal

root = Path(__file__).resolve().parents[2]
parts = json.loads((root / 'blender/build/unreal/parts.json').read_text())
unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).load_level('/Game/Maps/Site')
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
labels = {actor.get_actor_label() for actor in actors}
assert sum(isinstance(actor, unreal.PostProcessVolume) for actor in actors) == 1, 'Exposure volumes accumulated'
assert sum(isinstance(actor, unreal.PointLight) for actor in actors) == 3, 'Authored fixture lights missing'
report = []
for part in parts:
    name = part['name']
    mesh = unreal.load_asset(f'/Game/Scene/{name}/{name}/StaticMeshes/{name}.{name}')
    settings = mesh.get_editor_property('nanite_settings')
    materials = [str(slot.material_interface.get_name()) if slot.material_interface else None
                 for slot in mesh.static_materials]
    assert name in labels, f'Missing level actor: {name}'
    instances = [actor for actor in actors if isinstance(actor, unreal.StaticMeshActor)
                 and actor.static_mesh_component.static_mesh == mesh]
    assert len(instances) == 1 and instances[0].get_actor_label() == name, \
        f'Duplicate or mislabeled native instances: {name}'
    component = instances[0].static_mesh_component
    profile = str(component.get_collision_profile_name())
    collision = component.get_collision_enabled()
    if part['kind'] == 'water':
        assert profile == 'NoCollision' and collision == unreal.CollisionEnabled.NO_COLLISION, \
            f'Lake water reloaded with collision: profile={profile}, enabled={collision}'
        assert not component.get_editor_property('use_default_collision'), 'Lake water uses asset collision'
        assert not component.get_editor_property('generate_overlap_events'), 'Lake water retained overlap events'
    assert len(materials) <= 64, name
    assert all(material and material.startswith('MI_') for material in materials), (name, materials)
    assert settings.enabled == (part['kind'] != 'water'), name
    assert settings.position_precision == 8 and settings.normal_precision == 12, name
    if part['kind'] in ('house','temple'):
        assert settings.get_editor_property('target_minimum_residency_in_kb') == 4294967295, name
    assert settings.fallback_relative_error == 0 and settings.fallback_percent_triangles == 1, (name, settings.fallback_relative_error, settings.fallback_percent_triangles)
    assert settings.fallback_target == unreal.NaniteFallbackTarget.PERCENT_TRIANGLES, name
    assert settings.keep_percent_triangles == 1 and settings.trim_relative_error == 0, \
        (name, settings.keep_percent_triangles, settings.trim_relative_error)
    if part['kind'] != 'water':
        assert mesh.get_editor_property('body_setup').get_editor_property('collision_trace_flag') == unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE, name
    blob = (root / 'blender/build/unreal' / (name+'.glb')).read_bytes()
    length = struct.unpack_from('<I', blob, 12)[0]
    gltf = json.loads(blob[20:20+length])
    source_triangles = sum(gltf['accessors'][primitive['indices']]['count']//3
                           for item in gltf['meshes'] for primitive in item['primitives'])
    fallback_triangles = mesh.get_num_triangles(0)
    # Full fallback must retain this export exactly. Diagnose any mismatch from
    # source triangles rather than silently allowing a percentage of geometry loss.
    assert fallback_triangles == source_triangles, (name, fallback_triangles, source_triangles)
    report.append({'name': name, 'sections': len(materials), 'nanite': settings.enabled,
                   'source_triangles': source_triangles, 'fallback_triangles': fallback_triangles,
                   'full_collision_fallback': True, 'materials': materials,
                   'collision_profile': profile, 'collision_enabled': str(collision),
                   'keep_percent_triangles': settings.keep_percent_triangles,
                   'trim_relative_error': settings.trim_relative_error,
                   'position_precision': settings.position_precision,
                   'normal_precision': settings.normal_precision})
assert not any(name in labels for name in ('house', 'temple', 'landscape')), 'Old monolithic actors remain'
destination = root / 'unreal/Shankaranarayana/Saved/native-scene-audit.json'
destination.write_text(json.dumps({'passed': True, 'meshes': report}, indent=2))
print('Native scene audit passed:', len(report), 'meshes')
