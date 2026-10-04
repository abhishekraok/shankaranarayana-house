"""Audit persisted material maps and UV transforms in a fresh Unreal process."""
import json
import os, sys
from pathlib import Path
import unreal

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent))
from material_targets import structural_timber_family, COURTYARD_FENCE_ALIAS, validate_fence_manifest
meta = json.loads((root / 'blender/build/scene.json').read_text())
mel = unreal.MaterialEditingLibrary
import re
mapped = []
for i, web in enumerate(meta['materials']):
    record = web.get('proceduralMap') or web.get('photoMap')
    if not record or web['name'] == 'lake water' or web.get('emissive'): continue
    name = 'MI_' + re.sub(r'[^A-Za-z0-9]+', '_', web['name']).strip('_') + f'_{i}'
    mi = unreal.load_asset('/Game/Materials/Web/' + name)
    if not mi: continue  # Unused source materials need no native asset.
    texture = mel.get_material_instance_texture_parameter_value(mi, 'BaseMap')
    assert texture, name
    assert record['sha256'][:20] in texture.get_name(), name
    u = mel.get_material_instance_vector_parameter_value(mi, 'UVRowU')
    v = mel.get_material_instance_vector_parameter_value(mi, 'UVRowV')
    a = record['matrix']
    assert max(abs(x-y) for x,y in zip((u.r,u.g,u.b,v.r,v.g,v.b),(a[0],a[3],a[6],a[1],a[4],a[7]))) < 1e-6, name
    for field, prefix in [('bumpMap','Bump'),('roughnessMap','Roughness')]:
        if web.get(field):
            channel = mel.get_material_instance_texture_parameter_value(mi, prefix+'Map')
            assert channel and web[field]['sha256'][:20] in channel.get_name(), (name, field)
    expected_bump = float(web['bumpScale'])*100 if web.get('bumpMap') else 0.0
    assert abs(mel.get_material_instance_scalar_parameter_value(mi,'BumpCentimetres') - expected_bump) < 1e-5, name
    mapped.append({'material': name, 'texture': texture.get_name(), 'photo': bool(web.get('photoMap'))})
assert len(mapped) > 100, 'Most authored maps are missing'
for obj in meta['objects']:
    if obj['name'] != 'Shrine warm bulb': continue
    for i in obj['materials']:
        web = meta['materials'][i]
        name = 'MI_' + re.sub(r'[^A-Za-z0-9]+', '_', web['name']).strip('_') + f'_{i}'
        mi = unreal.load_asset('/Game/Materials/Web/' + name)
        assert mi and abs(mel.get_material_instance_scalar_parameter_value(mi, 'EmissionStrength') - 6.0) < 1e-5, 'Shrine bulb emission was not rebuilt'
water = unreal.load_asset('/Game/Materials/M_Water')
assert water.get_editor_property('shading_model') == unreal.MaterialShadingModel.MSM_SINGLE_LAYER_WATER
assert sum(isinstance(node, unreal.MaterialExpressionSingleLayerWaterMaterialOutput)
           for node in mel.get_material_expressions(water)) == 1, 'Duplicate water output nodes'
water_code = (Path(__file__).parent / 'water_normal.hlsl').read_text()
assert any(isinstance(node, unreal.MaterialExpressionCustom) and node.get_editor_property('code') == water_code
           for node in mel.get_material_expressions(water)), 'Water normal shader needs rebuilding'
assert not {'WaterCaptureTime', 'WaterCapturePhaseG'}.intersection(
    str(p) for p in mel.get_scalar_parameter_names(water)), 'Transient water diagnostic was saved'
water_volume = next(node for node in mel.get_material_expressions(water)
                    if isinstance(node, unreal.MaterialExpressionSingleLayerWaterMaterialOutput))
water_inputs = [str(n) for n in mel.get_material_expression_input_names(water_volume)]
water_nodes = mel.get_inputs_for_material_expression(water, water_volume)
assert len(water_inputs) == len(water_nodes) and dict(zip(water_inputs, water_nodes))['PhaseG'] is None, \
    'Unexpected saved water phase connection'
water_indices = [i for i, web in enumerate(meta['materials']) if web['name'] == 'lake water']
assert len(water_indices) == 1, 'Expected one authored water material'
water_mi = unreal.load_asset(f'/Game/Materials/Web/MI_lake_water_{water_indices[0]}')
assert water_mi and water_mi.get_editor_property('parent') == water, 'Wrong water master'
water_scalars = {'WaterNormalIrregularMix': 1.0, 'Roughness': .08, 'WaterSpecular': .35, 'WaterSurfaceOpacity': .15}
for parameter, expected in water_scalars.items():
    assert abs(mel.get_material_instance_scalar_parameter_value(water_mi, parameter)-expected) < 1e-6, parameter
for parameter, expected in [('WaterScattering', (.011,.013,.008)), ('WaterAbsorption', (.33,.24,.36))]:
    actual = mel.get_material_instance_vector_parameter_value(water_mi, parameter)
    assert max(abs(a-b) for a,b in zip((actual.r,actual.g,actual.b),expected)) < 1e-6, parameter
timber_index = structural_timber_family(meta)
timber_name = re.sub(r'[^A-Za-z0-9]+', '_', meta['materials'][timber_index]['name']).strip('_')
timber_mi = unreal.load_asset(f'/Game/Materials/Web/MI_{timber_name}_{timber_index}')
assert timber_mi, 'Missing structural timber material'
timber_color = mel.get_material_instance_vector_parameter_value(timber_mi, 'Color')
timber_gain = float(os.environ.get('HOUSE_TIMBER_GAIN', '1.5'))
assert max(abs(a-b) for a,b in zip((timber_color.r,timber_color.g,timber_color.b,timber_color.a),
                                  (timber_gain,timber_gain,timber_gain,1))) < 1e-6, 'Timber gain was not rebuilt'
parts = json.loads((root / 'blender/build/unreal/parts.json').read_text())
fence_parts = validate_fence_manifest(meta, parts)
# main may author the fence in materials of its own (material_targets.py returns no override): then there
# is no native fence variant to check.
fence_mi = None
fence_gain = float(os.environ.get('COURTYARD_FENCE_GAIN', '1.0'))
if fence_parts:
    fence_mi = unreal.load_asset('/Game/Materials/Web/MI_' + COURTYARD_FENCE_ALIAS)
    assert fence_mi and fence_mi != timber_mi, 'Missing/separate fence instance'
    assert fence_mi.get_editor_property('parent') == timber_mi.get_editor_property('parent'), 'Fence shader changed'
    fence_color = mel.get_material_instance_vector_parameter_value(fence_mi, 'Color')
    assert max(abs(a-b) for a,b in zip((fence_color.r,fence_color.g,fence_color.b,fence_color.a),
                                      (fence_gain,fence_gain,fence_gain,1))) < 1e-6, 'Fence gain was not rebuilt'
    for parameter in mel.get_scalar_parameter_names(timber_mi):
        assert abs(mel.get_material_instance_scalar_parameter_value(fence_mi, parameter) -
                   mel.get_material_instance_scalar_parameter_value(timber_mi, parameter)) < 1e-6, str(parameter)
    for parameter in mel.get_vector_parameter_names(timber_mi):
        if str(parameter) == 'Color': continue
        actual = mel.get_material_instance_vector_parameter_value(fence_mi, parameter)
        expected = mel.get_material_instance_vector_parameter_value(timber_mi, parameter)
        assert max(abs(getattr(actual,c)-getattr(expected,c)) for c in ('r','g','b','a')) < 1e-6, str(parameter)
    for parameter in mel.get_texture_parameter_names(timber_mi):
        assert mel.get_material_instance_texture_parameter_value(fence_mi, parameter) == \
            mel.get_material_instance_texture_parameter_value(timber_mi, parameter), str(parameter)
fence_bindings = []
for part in parts:
    name = part['name']
    mesh = unreal.load_asset(f'/Game/Scene/{name}/{name}/StaticMeshes/{name}.{name}')
    slots = list(mesh.static_materials)
    aliases = [slot for slot in slots if str(slot.material_slot_name) == COURTYARD_FENCE_ALIAS]
    assert len(aliases) == int(name in fence_parts), f'Stale fence slots: {name}'
    for slot in slots:
        assert (slot.material_interface == fence_mi) == (str(slot.material_slot_name) == COURTYARD_FENCE_ALIAS), f'Fence material leaked: {name}'
    if aliases:
        import struct
        blob = (root / 'blender/build/unreal' / (name + '.glb')).read_bytes()
        size = struct.unpack_from('<I', blob, 12)[0]
        gltf = json.loads(blob[20:20+size])
        alias_triangles = sum(gltf['accessors'][p['indices']]['count']//3
                              for m in gltf['meshes'] for p in m['primitives']
                              if gltf['materials'][p['material']]['name'] == COURTYARD_FENCE_ALIAS)
        assert alias_triangles == fence_parts[name]['triangles'], f'Fence primitive coverage: {name}'
        fence_bindings.append({'mesh': name, 'triangles': alias_triangles})
for path in unreal.EditorAssetLibrary.list_assets('/Game/Materials', recursive=False, include_folder=False):
    material = unreal.load_asset(path)
    if not isinstance(material, unreal.Material): continue
    parameters = []
    for node in mel.get_material_expressions(material):
        if isinstance(node, (unreal.MaterialExpressionScalarParameter, unreal.MaterialExpressionVectorParameter,
                             unreal.MaterialExpressionTextureSampleParameter2D)):
            parameters.append(str(node.get_editor_property('parameter_name')))
    assert len(parameters) == len(set(parameters)), f'Duplicate parameters in {path}'
unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).load_level('/Game/Maps/Site')
scene = []
for actor in unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors():
    label = actor.get_actor_label()
    record = {'name': label}
    if isinstance(actor, unreal.StaticMeshActor):
        mesh = actor.static_mesh_component.static_mesh
        bounds = mesh.get_bounding_box()
        record['bounds_cm'] = str(bounds)
        record['scale'] = str(actor.get_actor_scale3d())
    if isinstance(actor, unreal.DirectionalLight):
        record['rotation'] = str(actor.get_actor_rotation())
        record['intensity'] = actor.light_component.get_editor_property('intensity')
    scene.append(record)
report = {'passed': True, 'mapped_materials': len(mapped), 'materials': mapped, 'scene': scene,
          'water': {'material': water_mi.get_path_name(), 'scalars': water_scalars, 'capture_time_persisted': False},
          'structural_timber': {'source_index': timber_index, 'material': timber_mi.get_path_name(), 'gain': timber_gain},
          'courtyard_fence': {'material': fence_mi.get_path_name() if fence_mi else None, 'gain': fence_gain, 'bindings': fence_bindings}}
(root / 'unreal/Shankaranarayana/Saved/material-audit.json').write_text(json.dumps(report, indent=2))
print('Material audit passed:', len(mapped))
