"""Give joined buildings sufficient Lumen surface-cache cards.

Run with UnrealEditor -ExecutePythonScript=SCRIPT (not a commandlet: the
StaticMeshEditorSubsystem is unavailable there). Exits after saving and auditing.
"""
import json
from pathlib import Path
import unreal

root = Path(__file__).resolve().parents[2]
editor = unreal.get_editor_subsystem(unreal.StaticMeshEditorSubsystem)
assert editor, 'Run in the full editor, not a commandlet'
report = []
for part in json.loads((root / 'blender/build/unreal/parts.json').read_text()):
    name = part['name']
    mesh = unreal.load_asset(f'/Game/Scene/{name}/{name}/StaticMeshes/{name}.{name}')
    settings = editor.get_lod_build_settings(mesh, 0)
    cards = 64 if part['kind'] in ('house','temple') else 32 if part['kind'] == 'landscape' else 12
    settings.set_editor_property('max_lumen_mesh_cards', cards)
    editor.set_lod_build_settings(mesh, 0, settings)
    nanite = mesh.get_editor_property('nanite_settings')
    nanite.position_precision = 8
    nanite.normal_precision = 12
    nanite.fallback_target = unreal.NaniteFallbackTarget.PERCENT_TRIANGLES
    nanite.fallback_percent_triangles = 1.0
    nanite.fallback_relative_error = 0.0
    if part['kind'] in ('house','temple'):
        nanite.set_editor_property('target_minimum_residency_in_kb', 4294967295)
    editor.set_nanite_settings(mesh, nanite, True)
    unreal.EditorAssetLibrary.save_loaded_asset(mesh, False)
    actual = editor.get_lod_build_settings(mesh, 0).max_lumen_mesh_cards
    assert actual == cards, name
    report.append({'mesh':name,'max_lumen_mesh_cards':actual})
(root / 'unreal/Shankaranarayana/Saved/lumen-build-audit.json').write_text(json.dumps(report,indent=2))
unreal.SystemLibrary.quit_editor()
