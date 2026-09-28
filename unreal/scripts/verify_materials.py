"""Audit persisted material maps and UV transforms in a fresh Unreal process."""
import json
from pathlib import Path
import unreal

root = Path(__file__).resolve().parents[2]
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
report = {'passed': True, 'mapped_materials': len(mapped), 'materials': mapped, 'scene': scene}
(root / 'unreal/Shankaranarayana/Saved/material-audit.json').write_text(json.dumps(report, indent=2))
print('Material audit passed:', len(mapped))
