"""Audit persisted material maps and UV transforms in a fresh Unreal process."""
import json
import os, sys, math, struct
from pathlib import Path
import unreal

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent))
from material_targets import (structural_timber_family, COURTYARD_FENCE_ALIAS, validate_fence_manifest,
                              INNER_HALL_BELL_TARGETS, inner_hall_bell_family, REAR_PLINTH_LOTUS_NAME,
                              REAR_PLINTH_LOTUS_COUNT, REAR_PLINTH_STONE_MAP, rear_plinth_lotus_families,
                              west_bank_road_family, WEST_BANK_ROAD_MAP, WEST_BANK_ROAD_COLOR_GAIN,
                              inner_corrugated_roof_family, INNER_CORRUGATED_ROOF_NAMES,
                              INNER_CORRUGATED_ROOF_COLOR_GAIN)
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
bell_index = inner_hall_bell_family(meta)
bell_web = meta['materials'][bell_index]
bell_name = re.sub(r'[^A-Za-z0-9]+', '_', bell_web['name']).strip('_')
bell_mi = unreal.load_asset(f'/Game/Materials/Web/MI_{bell_name}_{bell_index}')
assert isinstance(bell_mi, unreal.MaterialInstanceConstant), 'Missing inner-hall bronze instance'
bell_master = unreal.load_asset('/Game/Materials/M_WebTwoSided')
assert bell_mi.get_editor_property('parent') == bell_master, 'Inner-hall bronze master changed'
bell_scalars = {'SheetFill': 0.0, 'SheetFillFront': 1.0,
                'Roughness': bell_web['roughness'], 'Metallic': bell_web['metalness']}
for parameter, expected in bell_scalars.items():
    assert abs(mel.get_material_instance_scalar_parameter_value(bell_mi, parameter) - expected) < 1e-6, \
        'Inner-hall bronze parameter: ' + parameter
bell_color = mel.get_material_instance_vector_parameter_value(bell_mi, 'Color')
def srgb(v): return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4
expected_bell_color = tuple(srgb(int(bell_web['color'][i:i+2], 16)/255) for i in (1, 3, 5)) + (1.0,)
assert max(abs(a-b) for a,b in zip((bell_color.r,bell_color.g,bell_color.b,bell_color.a),
                                  expected_bell_color)) < 1e-6, 'Inner-hall bronze tint changed'
# The correction belongs to one instance; the shared sheet-fill default stays .12.
fill_nodes = [node for node in mel.get_material_expressions(bell_master)
              if isinstance(node, unreal.MaterialExpressionScalarParameter) and
              str(node.get_editor_property('parameter_name')) == 'SheetFill']
assert len(fill_nodes) == 1 and abs(fill_nodes[0].get_editor_property('default_value') - .12) < 1e-6, \
    'Shared two-sided sheet-fill default changed'

lotus_master = unreal.load_asset('/Game/Materials/M_mappedboth')
assert lotus_master, 'Missing mapped two-sided stone master'
lotus_defaults = {'SheetFill': .12, 'SheetFillFront': 1.0}
for parameter, expected in lotus_defaults.items():
    nodes = [node for node in mel.get_material_expressions(lotus_master)
             if isinstance(node, unreal.MaterialExpressionScalarParameter) and
             str(node.get_editor_property('parameter_name')) == parameter]
    assert len(nodes) == 1 and abs(nodes[0].get_editor_property('default_value') - expected) < 1e-6, \
        'Shared mapped two-sided default changed: ' + parameter
lotus_instances = {}
lotus_records = []
for index in rear_plinth_lotus_families(meta):
    web = meta['materials'][index]
    name = re.sub(r'[^A-Za-z0-9]+', '_', web['name']).strip('_')
    mi = unreal.load_asset(f'/Game/Materials/Web/MI_{name}_{index}')
    assert isinstance(mi, unreal.MaterialInstanceConstant), 'Missing rear-plinth stone instance'
    assert mi.get_editor_property('parent') == lotus_master, 'Rear-plinth stone master changed'
    scalars = {'SheetFill': 0.0, 'SheetFillFront': 1.0, 'Roughness': web['roughness'],
               'Metallic': web['metalness'], 'BumpCentimetres': web['bumpScale'] * 100,
               'UseRoughnessMap': 0.0}
    for prefix, field in [('', 'proceduralMap'), ('Bump', 'bumpMap')]:
        texture = mel.get_material_instance_texture_parameter_value(mi, (prefix or 'Base') + 'Map')
        assert texture and REAR_PLINTH_STONE_MAP[:20] in texture.get_name(), 'Rear-plinth stone map changed'
        a = web[field]['matrix']
        for axis, expected in [('U', (a[0], a[3], a[6], 0)), ('V', (a[1], a[4], a[7], 0))]:
            row = mel.get_material_instance_vector_parameter_value(mi, prefix + 'UVRow' + axis)
            assert max(abs(getattr(row, c) - v) for c, v in zip('rgba', expected)) < 1e-6, \
                'Rear-plinth stone UV transform changed'
        scalars[prefix + 'FlipY'] = float(web[field]['flipY'])
    for parameter, expected in scalars.items():
        assert abs(mel.get_material_instance_scalar_parameter_value(mi, parameter) - expected) < 1e-6, \
            'Rear-plinth stone parameter: ' + parameter
    color = mel.get_material_instance_vector_parameter_value(mi, 'Color')
    expected_color = tuple(srgb(int(web['color'][i:i+2], 16) / 255) for i in (1, 3, 5)) + (1.0,)
    assert max(abs(getattr(color, c) - v) for c, v in zip('rgba', expected_color)) < 1e-6, \
        'Rear-plinth stone tint changed'
    lotus_instances[index] = mi
    lotus_records.append({'source_index': index, 'material': mi.get_path_name(), 'scalars': scalars,
                          'color': list(expected_color), 'bindings': [], 'level_bindings': []})

road_index = west_bank_road_family(meta)
road_web = meta['materials'][road_index]
road_name = re.sub(r'[^A-Za-z0-9]+', '_', road_web['name']).strip('_')
road_mi = unreal.load_asset(f'/Game/Materials/Web/MI_{road_name}_{road_index}')
road_master = unreal.load_asset('/Game/Materials/M_mapped')
assert isinstance(road_mi, unreal.MaterialInstanceConstant) and road_master and \
    road_mi.get_editor_property('parent') == road_master, 'West-bank road master changed'
road_color = mel.get_material_instance_vector_parameter_value(road_mi, 'Color')
road_expected_color = (WEST_BANK_ROAD_COLOR_GAIN,) * 3 + (1.0,)
assert all(math.isfinite(getattr(road_color, c)) and abs(getattr(road_color, c) - v) < 1e-6
           for c, v in zip('rgba', road_expected_color)), 'West-bank road colour gain was not rebuilt'
road_scalars = {'Roughness': 1.0, 'Metallic': 0.0, 'BumpCentimetres': 0.0,
                'UseRoughnessMap': 0.0, 'FlipY': 1.0}
for parameter, expected in road_scalars.items():
    actual = mel.get_material_instance_scalar_parameter_value(road_mi, parameter)
    assert math.isfinite(actual) and abs(actual - expected) < 1e-6, 'West-bank road parameter: ' + parameter
road_texture = mel.get_material_instance_texture_parameter_value(road_mi, 'BaseMap')
assert road_texture and WEST_BANK_ROAD_MAP[:20] in road_texture.get_name(), 'West-bank road map changed'
for axis, expected in [('U', (1, 0, 0, 0)), ('V', (0, 1, 0, 0))]:
    row = mel.get_material_instance_vector_parameter_value(road_mi, 'UVRow' + axis)
    assert all(math.isfinite(getattr(row, c)) and abs(getattr(row, c) - v) < 1e-6
               for c, v in zip('rgba', expected)), 'West-bank road UV transform changed'
road_default = [node for node in mel.get_material_expressions(road_master)
                if isinstance(node, unreal.MaterialExpressionVectorParameter) and
                str(node.get_editor_property('parameter_name')) == 'Color']
assert len(road_default) == 1, 'West-bank road shared Color parameter changed'
road_default_color = road_default[0].get_editor_property('default_value')
assert all(math.isfinite(getattr(road_default_color, c)) and abs(getattr(road_default_color, c) - 1) < 1e-6
           for c in 'rgba'), 'Shared mapped colour default changed'
road_record = {'source_index': road_index, 'material': road_mi.get_path_name(),
               'gain': WEST_BANK_ROAD_COLOR_GAIN, 'color': list(road_expected_color),
               'map_sha256': WEST_BANK_ROAD_MAP, 'scalars': road_scalars, 'bindings': [], 'level_bindings': []}

roof_index = inner_corrugated_roof_family(meta)
roof_web = meta['materials'][roof_index]
roof_name = re.sub(r'[^A-Za-z0-9]+', '_', roof_web['name']).strip('_')
roof_mi = unreal.load_asset(f'/Game/Materials/Web/MI_{roof_name}_{roof_index}')
assert isinstance(roof_mi, unreal.MaterialInstanceConstant) and \
    roof_mi.get_editor_property('parent') == bell_master, 'Inner corrugated roof parent changed'
assert bell_master.get_editor_property('two_sided') and not any(
    isinstance(node, (unreal.MaterialExpressionVertexColor, unreal.MaterialExpressionTextureSample))
    for node in mel.get_material_expressions(bell_master)), 'Inner corrugated roof parent tint/map changed'
roof_base_color = tuple(srgb(int(roof_web['color'][i:i+2], 16)/255) for i in (1, 3, 5)) + (1.0,)
roof_expected_color = tuple(c * INNER_CORRUGATED_ROOF_COLOR_GAIN for c in roof_base_color[:3]) + (1.0,)
roof_color = mel.get_material_instance_vector_parameter_value(roof_mi, 'Color')
assert all(math.isfinite(getattr(roof_color, c)) and abs(getattr(roof_color, c)-v) < 1e-6
           for c,v in zip('rgba', roof_expected_color)), 'Inner corrugated roof colour gain was not rebuilt'
roof_scalars = {'Roughness': .91, 'Metallic': 0.0, 'SheetFill': .12, 'SheetFillFront': 1.0}
for parameter, expected in roof_scalars.items():
    actual = mel.get_material_instance_scalar_parameter_value(roof_mi, parameter)
    assert math.isfinite(actual) and abs(actual-expected) < 1e-6, 'Inner corrugated roof parameter: ' + parameter
roof_defaults = {}
for parameter, expected in {'Color': (1,1,1,1), 'SheetFill': .12, 'SheetFillFront': 1.0}.items():
    nodes = [node for node in mel.get_material_expressions(bell_master)
             if isinstance(node, (unreal.MaterialExpressionVectorParameter, unreal.MaterialExpressionScalarParameter))
             and str(node.get_editor_property('parameter_name')) == parameter]
    assert len(nodes) == 1, 'Shared two-sided parameter changed: ' + parameter
    value = nodes[0].get_editor_property('default_value')
    actual = [getattr(value,c) for c in 'rgba'] if parameter == 'Color' else [value]
    expected = expected if parameter == 'Color' else [expected]
    assert all(math.isfinite(a) and abs(a-b) < 1e-6 for a,b in zip(actual,expected)), \
        'Shared two-sided default changed: ' + parameter
    roof_defaults[parameter] = actual if parameter == 'Color' else actual[0]
roof_record = {'source_index': roof_index, 'source_name': roof_web['name'],
               'object_names': sorted(INNER_CORRUGATED_ROOF_NAMES), 'material': roof_mi.get_path_name(),
               'parent': bell_master.get_path_name(), 'gain': INNER_CORRUGATED_ROOF_COLOR_GAIN,
               'source_color': list(roof_base_color), 'color': list(roof_expected_color),
               'scalars': roof_scalars, 'shared_master_defaults': roof_defaults,
               'bindings': [], 'level_bindings': []}

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
bell_bindings = []
roof_parts = set()
for part in parts:
    name = part['name']
    mesh = unreal.load_asset(f'/Game/Scene/{name}/{name}/StaticMeshes/{name}.{name}')
    slots = list(mesh.static_materials)
    bell_bindings.extend({'mesh': name, 'slot': i} for i, slot in enumerate(slots)
                         if slot.material_interface == bell_mi)
    road_record['bindings'].extend({'mesh': name, 'slot': i} for i, slot in enumerate(slots)
                                   if slot.material_interface == road_mi)
    blob = (root / 'blender/build/unreal' / (name + '.glb')).read_bytes()
    size = struct.unpack_from('<I', blob, 12)[0]
    gltf = json.loads(blob[20:20+size])
    used = {p['material'] for m in gltf['meshes'] for p in m['primitives']}
    roof_source_slots = [gltf['materials'][i] for i in used if gltf['materials'][i].get('name') == roof_web['name']]
    roof_slots = [{'mesh': name, 'slot': i, 'slot_name': str(slot.material_slot_name)}
                  for i, slot in enumerate(slots) if slot.material_interface == roof_mi]
    assert bool(roof_slots) == bool(roof_source_slots), 'Inner corrugated roof binding leaked/missing: ' + name
    assert all(slot['slot_name'] in (roof_web['name'], roof_web['name'].replace('.', '_')) for slot in roof_slots), \
        'Inner corrugated roof bound to a different source slot'
    for source in roof_source_slots:
        pbr = source['pbrMetallicRoughness']
        assert source.get('doubleSided') is True and \
            max(abs(a-b) for a,b in zip(pbr['baseColorFactor'],roof_base_color)) < 1e-6 and \
            abs(pbr['roughnessFactor']-.91) < 1e-6 and abs(pbr['metallicFactor']) < 1e-6, \
            'Inner corrugated roof GLB properties changed'
        roof_parts.add(name)
    roof_record['bindings'].extend(roof_slots)
    for record in lotus_records:
        record['bindings'].extend({'mesh': name, 'slot': i} for i, slot in enumerate(slots)
                                  if slot.material_interface == lotus_instances[record['source_index']])
    aliases = [slot for slot in slots if str(slot.material_slot_name) == COURTYARD_FENCE_ALIAS]
    assert len(aliases) == int(name in fence_parts), f'Stale fence slots: {name}'
    for slot in slots:
        assert (slot.material_interface == fence_mi) == (str(slot.material_slot_name) == COURTYARD_FENCE_ALIAS), f'Fence material leaked: {name}'
    if aliases:
        alias_triangles = sum(gltf['accessors'][p['indices']]['count']//3
                              for m in gltf['meshes'] for p in m['primitives']
                              if gltf['materials'][p['material']]['name'] == COURTYARD_FENCE_ALIAS)
        assert alias_triangles == fence_parts[name]['triangles'], f'Fence primitive coverage: {name}'
        fence_bindings.append({'mesh': name, 'triangles': alias_triangles})
assert bell_bindings, 'Inner-hall bronze instance is not bound to native meshes'
assert road_record['bindings'], 'West-bank road instance is not bound to native meshes'
assert roof_parts and roof_record['bindings'], 'Inner corrugated roof is not bound to native meshes'
assert all(record['bindings'] for record in lotus_records), 'Rear-plinth stone instance is not bound to native meshes'
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
    for component in actor.get_components_by_class(unreal.StaticMeshComponent):
        road_record['level_bindings'].extend({'component': component.get_path_name(), 'slot': i}
                                            for i in range(component.get_num_materials())
                                            if component.get_material(i) == road_mi)
        for i in range(component.get_num_materials()):
            if component.get_material(i) == roof_mi:
                mesh = component.static_mesh
                assert mesh and mesh.get_name() in roof_parts and mesh.get_material(i) == roof_mi, \
                    'Inner corrugated roof level binding leaked/overridden'
                roof_record['level_bindings'].append({'component': component.get_path_name(),
                                                     'mesh': mesh.get_name(), 'slot': i})
        for record in lotus_records:
            record['level_bindings'].extend({'component': component.get_path_name(), 'slot': i}
                                           for i in range(component.get_num_materials())
                                           if component.get_material(i) == lotus_instances[record['source_index']])
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
assert all(record['level_bindings'] for record in lotus_records), 'Rear-plinth stone instance is not bound in the saved level'
assert road_record['level_bindings'], 'West-bank road instance is not bound in the saved level'
assert {item['mesh'] for item in roof_record['level_bindings']} == roof_parts, \
    'Inner corrugated roof missing from saved level'
report = {'passed': True, 'mapped_materials': len(mapped), 'materials': mapped, 'scene': scene,
          'water': {'material': water_mi.get_path_name(), 'scalars': water_scalars, 'capture_time_persisted': False},
          'structural_timber': {'source_index': timber_index, 'material': timber_mi.get_path_name(), 'gain': timber_gain},
          'west_bank_road': road_record,
          'inner_corrugated_roof': roof_record,
          'inner_hall_bells': {'source_index': bell_index, 'material': bell_mi.get_path_name(),
                               'object_counts': INNER_HALL_BELL_TARGETS, 'scalars': bell_scalars,
                               'color': list(expected_bell_color), 'bindings': bell_bindings},
          'rear_plinth_lotus': {'object_counts': {REAR_PLINTH_LOTUS_NAME: REAR_PLINTH_LOTUS_COUNT},
                               'stone_map_sha256': REAR_PLINTH_STONE_MAP,
                               'shared_master_defaults': lotus_defaults, 'materials': lotus_records},
          'courtyard_fence': {'material': fence_mi.get_path_name() if fence_mi else None, 'gain': fence_gain, 'bindings': fence_bindings}}
(root / 'unreal/Shankaranarayana/Saved/material-audit.json').write_text(json.dumps(report, indent=2))
print('Material audit passed:', len(mapped))
