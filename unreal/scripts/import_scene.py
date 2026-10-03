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


def normal_preserving_pipelines():
    # UE 5.8 AssetTools consumes this wrapper from AssetImportTask.options;
    # passing a GenericAssetsPipeline directly does not override the stack.
    # Retain the engine's GLTF-specific second pipeline and duplicate the asset
    # pipeline transiently so no engine asset or editor preference is changed.
    stack = unreal.InterchangePipelineStackOverride()
    source = unreal.load_asset('/Interchange/Pipelines/DefaultGLTFAssetsPipeline.DefaultGLTFAssetsPipeline')
    gltf = unreal.load_asset('/Interchange/Pipelines/DefaultGLTFPipeline.DefaultGLTFPipeline')
    assert isinstance(source, unreal.InterchangeGenericAssetsPipeline) and gltf, 'Missing UE GLTF pipelines'
    assets = unreal.SystemLibrary.duplicate_object(source, stack, 'NativeGLTFAssets')
    assert isinstance(assets, unreal.InterchangeGenericAssetsPipeline), 'Could not duplicate GLTF pipeline'
    # Keep /Game/Scene/<name>/<name>/StaticMeshes/<name> for every consumer.
    assets.set_editor_property('use_source_name_for_asset', True)
    assets.set_editor_property('scene_name_sub_folder', True)
    assets.set_editor_property('asset_type_sub_folders', True)
    assets.set_editor_property('reimport_strategy', unreal.ReimportStrategyFlags.APPLY_PIPELINE_PROPERTIES)
    common = assets.get_editor_property('common_meshes_properties')
    common.set_editor_property('recompute_normals', False)
    common.set_editor_property('recompute_tangents', True)  # GLB need not carry tangents.
    assert not common.get_editor_property('recompute_normals'), 'Imported normals would be discarded'
    stack.add_pipeline(assets)
    stack.add_pipeline(gltf)
    return stack, assets, gltf  # keep transient objects alive through all synchronous imports


pipelines = normal_preserving_pipelines() if '--settings-only' not in sys.argv else None
tasks = []
for part in ([] if '--settings-only' in sys.argv else PARTS):
    t = unreal.AssetImportTask()
    t.filename = os.path.join(SRC, part + '.glb')
    t.destination_path = '/Game/Scene/' + part
    t.automated = True; t.replace_existing = True; t.save = True
    t.options = pipelines[0]
    tasks.append(t)
if tasks: unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks(tasks)
for t in tasks:
    print('IMPORTED', t.filename, len(t.imported_object_paths))
    part = os.path.splitext(os.path.basename(t.filename))[0]
    expected = f'/Game/Scene/{part}/{part}/StaticMeshes/{part}.{part}'
    assert expected in t.imported_object_paths, f'Import did not produce the expected native mesh: {expected}'
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
    settings.fallback_target = unreal.NaniteFallbackTarget.PERCENT_TRIANGLES
    # Preserve submillimetre relief and nearby photo-card faces in joined meshes.
    # This is a render-resource setting; source triangles and collision stay intact.
    settings.position_precision = 8
    settings.normal_precision = 12
    if part.startswith(('house', 'temple')):
        settings.set_editor_property('target_minimum_residency_in_kb', 4294967295)
    mesh.modify()
    mesh.set_editor_property('nanite_settings', settings)
    unreal.EditorAssetLibrary.save_loaded_asset(mesh, False)
    print('NATIVE_MESH', part, 'sections', len(mesh.static_materials), 'Nanite', settings.enabled, 'full collision fallback')
