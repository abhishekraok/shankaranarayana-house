"""Imports blender/build/unreal/*.glb into /Game/Scene as static meshes.

    UnrealEditor-Cmd <uproject> -run=pythonscript -script=unreal/scripts/import_scene.py

Re-running replaces the assets. Prints each mesh's bounds so the axis conversion can be
checked against the three.js coordinates.
"""
import json, os, sys, unreal

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, '..', '..', 'blender', 'build', 'unreal'))
manifest = os.path.join(SRC, 'parts.json')
PARTS = [p['name'] for p in json.load(open(manifest))] if os.path.exists(manifest) else ['ground', 'water', 'house', 'temple', 'landscape']

tasks = []
for part in ([] if '--settings-only' in sys.argv else PARTS):
    t = unreal.AssetImportTask()
    t.filename = os.path.join(SRC, part + '.glb')
    t.destination_path = '/Game/Scene/' + part
    t.automated = True; t.replace_existing = True; t.save = True
    tasks.append(t)
if tasks: unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks(tasks)
for t in tasks:
    print('IMPORTED', t.filename, len(t.imported_object_paths))
    for p in t.imported_object_paths:
        a = unreal.load_asset(p)
        if isinstance(a, unreal.StaticMesh):
            b = a.get_bounding_box()
            print('MESH', p, 'min', b.min, 'max', b.max, 'materials', len(a.static_materials), 'nanite', a.get_editor_property('nanite_settings').enabled)

for part in PARTS:
    mesh = unreal.load_asset(f'/Game/Scene/{part}/{part}/StaticMeshes/{part}.{part}')
    assert mesh, part
    assert len(mesh.static_materials) <= 64, f'{part} exceeds Nanite material limit'
    # A fresh struct ensures PostEditChange sees a change; the getter can expose
    # a live struct whose mutation bypasses dirty tracking in commandlets.
    settings = unreal.MeshNaniteSettings()
    settings.enabled = part != 'water'
    settings.fallback_relative_error = 0.0
    settings.fallback_percent_triangles = 1.0
    mesh.modify()
    mesh.set_editor_property('nanite_settings', settings)
    unreal.EditorAssetLibrary.save_loaded_asset(mesh, False)
    print('NATIVE_MESH', part, 'sections', len(mesh.static_materials), 'Nanite', settings.enabled, 'full collision fallback')
