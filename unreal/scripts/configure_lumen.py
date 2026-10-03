"""Configure native Lumen card builds, with bounded building diagnostics.

Run with UnrealEditor -ExecutePythonScript=SCRIPT (not a commandlet: the
StaticMeshEditorSubsystem is unavailable there). Exits after saving and auditing.
Optional: --building-cards 32 --parts house,temple
"""
import argparse
import json
from pathlib import Path
import unreal

parser = argparse.ArgumentParser()
parser.add_argument('--building-cards', type=int, choices=(32, 64), default=32)
parser.add_argument('--parts', default='', help='Comma-separated native names or kinds')
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
parts = json.loads((root / 'blender/build/unreal/parts.json').read_text())
requested = {p.strip() for p in args.parts.split(',') if p.strip()}
available = {p[key] for p in parts for key in ('name', 'kind')}
if requested - available:
    raise ValueError('Unknown native parts: ' + ', '.join(sorted(requested - available)))
parts = [p for p in parts if not requested or p['name'] in requested or p['kind'] in requested]
if not parts:
    raise ValueError('No native mesh groups matched --parts')
editor = unreal.get_editor_subsystem(unreal.StaticMeshEditorSubsystem)
assert editor, 'Run in the full editor, not a commandlet'
report = []
for part in parts:
    name = part['name']
    mesh = unreal.load_asset(f'/Game/Scene/{name}/{name}/StaticMeshes/{name}.{name}')
    settings = editor.get_lod_build_settings(mesh, 0)
    # The exporter preserves original corner normals in world space. Rebuilding
    # them from joined geometry can change smooth surfaces under mixed scales.
    settings.set_editor_property('recompute_normals', False)
    settings.set_editor_property('recompute_tangents', True)
    cards = args.building_cards if part['kind'] in ('house','temple') else 32 if part['kind'] == 'landscape' else 12
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
    saved_settings = editor.get_lod_build_settings(mesh, 0)
    actual = saved_settings.max_lumen_mesh_cards
    assert actual == cards, name
    assert not saved_settings.recompute_normals, name
    # This is persisted build-setting readback, not the generated/runtime card
    # count. UE 5.8's runtime lookup retains at most 32 cards per mesh.
    report.append({'mesh':name, 'max_lumen_mesh_cards':actual,
                   'requested_max_lumen_mesh_cards':cards,
                   'recompute_normals': saved_settings.recompute_normals,
                   'recompute_tangents': saved_settings.recompute_tangents})
(root / 'unreal/Shankaranarayana/Saved/lumen-build-audit.json').write_text(json.dumps(report,indent=2))
unreal.SystemLibrary.quit_editor()
