"""Audit the generated level's native partitions, material assignments and collision."""
import json
from pathlib import Path
import unreal

root = Path(__file__).resolve().parents[2]
parts = json.loads((root / 'blender/build/unreal/parts.json').read_text())
unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).load_level('/Game/Maps/Site')
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
labels = {actor.get_actor_label() for actor in actors}
report = []
for part in parts:
    name = part['name']
    mesh = unreal.load_asset(f'/Game/Scene/{name}/{name}/StaticMeshes/{name}.{name}')
    settings = mesh.get_editor_property('nanite_settings')
    materials = [str(slot.material_interface.get_name()) if slot.material_interface else None
                 for slot in mesh.static_materials]
    assert name in labels, f'Missing level actor: {name}'
    assert len(materials) <= 64, name
    assert all(material and material.startswith('MI_') for material in materials), (name, materials)
    assert settings.enabled == (part['kind'] != 'water'), name
    assert settings.fallback_relative_error == 0 and settings.fallback_percent_triangles == 1, (name, settings.fallback_relative_error, settings.fallback_percent_triangles)
    if part['kind'] != 'water':
        assert mesh.get_editor_property('body_setup').get_editor_property('collision_trace_flag') == unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE, name
    report.append({'name': name, 'sections': len(materials), 'nanite': settings.enabled,
                   'full_collision_fallback': True, 'materials': materials,
                   'keep_percent_triangles': settings.keep_percent_triangles,
                   'trim_relative_error': settings.trim_relative_error,
                   'position_precision': settings.position_precision,
                   'normal_precision': settings.normal_precision})
assert not any(name in labels for name in ('house', 'temple', 'landscape')), 'Old monolithic actors remain'
destination = root / 'unreal/Shankaranarayana/Saved/native-scene-audit.json'
destination.write_text(json.dumps({'passed': True, 'meshes': report}, indent=2))
print('Native scene audit passed:', len(report), 'meshes')
