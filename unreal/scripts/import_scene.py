"""Imports blender/build/unreal/*.glb into /Game/Scene as static meshes.

    UnrealEditor-Cmd <uproject> -run=pythonscript -script=unreal/scripts/import_scene.py

Re-running replaces the assets. Prints each mesh's bounds so the axis conversion can be
checked against the three.js coordinates.
"""
import os, unreal

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, '..', '..', 'blender', 'build', 'unreal'))
PARTS = ['ground', 'water', 'house', 'temple', 'landscape']

tasks = []
for part in PARTS:
    t = unreal.AssetImportTask()
    t.filename = os.path.join(SRC, part + '.glb')
    t.destination_path = '/Game/Scene/' + part
    t.automated = True; t.replace_existing = True; t.save = True
    tasks.append(t)
unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks(tasks)
for t in tasks:
    print('IMPORTED', t.filename, len(t.imported_object_paths))
    for p in t.imported_object_paths:
        a = unreal.load_asset(p)
        if isinstance(a, unreal.StaticMesh):
            b = a.get_bounding_box()
            print('MESH', p, 'min', b.min, 'max', b.max, 'materials', len(a.static_materials), 'nanite', a.get_editor_property('nanite_settings').enabled)
