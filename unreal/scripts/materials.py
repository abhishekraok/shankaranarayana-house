"""Rebuilds every imported material from the web scene's own material data.

    UnrealEditor-Cmd <uproject> -run=pythonscript -script=unreal/scripts/materials.py

glTF import drops per-instance colours (foliage, roof tile courses), so each slot gets an
instance of a small master material: colour x vertex colour where the web tints meshes,
roughness and metalness from the web material, two-sided where the web draws both sides.
"""
import json, os, re, sys, unreal
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from material_targets import structural_timber_family
WATER_NORMAL_CODE = (Path(HERE) / 'water_normal.hlsl').read_text()
SCENE = os.path.normpath(os.path.join(HERE, '..', '..', 'blender', 'build', 'scene.json'))
meta = json.load(open(SCENE, encoding='utf8'))
structural_timber = structural_timber_family(meta)
M = meta['materials']; G = meta['geometries']
by_name = {m['name']: i for i, m in enumerate(M)}
tinted = set()
altar_brass = set()
bulb_materials = set()
for o in meta['objects']:
    if o.get('instanceColors') or G[o['geometry']].get('color'): tinted.update(o['materials'])
    if o['name'].startswith('Altar ') and 'brass' in o['name'].lower(): altar_brass.update(o['materials'])
    if o['name'] == 'Shrine warm bulb': bulb_materials.update(o['materials'])

# 15.11.58 and the lake views: clay tile roofs are dark and weathered, not the pale web tint.
# A material counts as tiled roof when most of its users are tiled roofs, tile courses or ridges.
TILED = re.compile(r'til(e|ed)|mangalore', re.I); ROOFISH = re.compile(r'roof|ridge|course', re.I)
roof_use = {}
for o in meta['objects']:
    hit = bool(TILED.search(o['name']) and ROOFISH.search(o['name']))
    for m in o['materials']: u = roof_use.setdefault(m, [0, 0]); u[0] += 1; u[1] += hit
tiled_roofs = {m for m, (n, r) in roof_use.items() if r / n >= 0.5}
ROOF_WEATHER = (0.30, 0.27, 0.25)
VEG = re.compile(r'frond|leaf|leaves|crown|palm|areca|coconut|tree|foliage|bush|shrub|canopy|fern|undergrowth', re.I)
# These authored names use botanical words for solid surfaces or fruit. A leaf
# shader cuts holes and scatters normals, so it must not reach these materials.
NON_FOLIAGE_OBJECTS = {
    'continuous mottled green and leaf-litter forest floor',
    'Shop coconut pile', 'coconuts under crowns',
    'Shrine west window deep pale canopy', 'Shrine east window deep pale canopy',
    'Entrance doorway open timber leaf', 'Entrance door leaf metal studs',
    'Inner ledge worn foliage relief',
    'Outer shrine small suspended bell crown', 'Courtyard smaller hanging bell crown',
    'Passage hanging bronze bell crown', 'Inner hall hanging bronze bell crown',
}

def is_foliage_object(o):
    name = o['name']
    return name not in NON_FOLIAGE_OBJECTS and bool(VEG.search(name)) and not re.search(r'trunk', name, re.I)

veg_use = {}
for o in meta['objects']:
    for m in o['materials']: u = veg_use.setdefault(m, [0, 0]); u[0] += 1; u[1] += is_foliage_object(o)
foliage_mats = {m for m, (n, v) in veg_use.items() if v / n >= 0.5}
non_foliage_users = [o for o in meta['objects'] if o['name'] in NON_FOLIAGE_OBJECTS]
assert {o['name'] for o in non_foliage_users} == NON_FOLIAGE_OBJECTS, 'Review renamed non-foliage objects'
assert not foliage_mats.intersection(m for o in non_foliage_users for m in o['materials']), 'Foliage material shared with a solid surface'
# 'God room 2': the doorway bosses and fittings are polished brass with warm highlights.
brass_use = {}
for o in meta['objects']:
    for m in o['materials']: u = brass_use.setdefault(m, [0, 0]); u[0] += 1; u[1] += bool(re.search(r'brass', o['name'], re.I))
polished_brass = {m for m, (n, b) in brass_use.items() if b / n >= 0.5} - altar_brass

AT = unreal.AssetToolsHelpers.get_asset_tools(); MEL = unreal.MaterialEditingLibrary; EAL = unreal.EditorAssetLibrary
DIR = '/Game/Materials'

# Import only maps already exported by the authored scene. Photo maps must come
# from the explicit repository allowlist, never the private pose repository.
textures = {}
allowlist = (Path(HERE).parents[1] / '.gitignore').read_text()
records = [record for web in M for record in
           (web.get('proceduralMap') or web.get('photoMap'), web.get('bumpMap'), web.get('roughnessMap')) if record]
for record in records:
    if record.get('sourceFile'):
        assert '!/' + record['sourceFile'] in allowlist.splitlines(), record['sourceFile']
    key = (record['sha256'], record['wrapS'], record['wrapT'], record['colorSpace'])
    if key in textures: continue
    name = 'T_' + record['sha256'][:20] + '_' + str(record['wrapS']) + '_' + str(record['wrapT'])
    path = '/Game/Materials/Textures/' + name
    if not EAL.does_asset_exist(path):
        task = unreal.AssetImportTask()
        task.filename = str(Path(SCENE).parent / record['file'])
        task.destination_path = '/Game/Materials/Textures'; task.destination_name = name
        task.automated = True; task.save = True
        AT.import_asset_tasks([task])
    texture = unreal.load_asset(path)
    assert texture, path
    texture.set_editor_property('srgb', record['colorSpace'] == 'srgb')
    for axis, wrap in [('address_x', record['wrapS']), ('address_y', record['wrapT'])]:
        texture.set_editor_property(axis, {1000: unreal.TextureAddress.TA_WRAP,
            1001: unreal.TextureAddress.TA_CLAMP, 1002: unreal.TextureAddress.TA_MIRROR}[wrap])
    EAL.save_loaded_asset(texture)
    textures[key] = texture

def param(m, cls, name, x, y, default):
    e = MEL.create_material_expression(m, cls, x, y); e.set_editor_property('parameter_name', name)
    e.set_editor_property('default_value', default); return e

def custom(m, code, inputs, output):
    node = MEL.create_material_expression(m, unreal.MaterialExpressionCustom, -450, 0)
    node.set_editor_property('code', code)
    node.set_editor_property('output_type', output)
    custom_inputs = []
    for name in inputs:
        entry = unreal.CustomInput()
        entry.set_editor_property('input_name', name)
        custom_inputs.append(entry)
    node.set_editor_property('inputs', custom_inputs)
    for name, expression in inputs.items():
        assert MEL.connect_material_expressions(expression, '', node, name), name
    return node

def texture_sample(m, prefix, linear=False):
    uv = MEL.create_material_expression(m, unreal.MaterialExpressionTextureCoordinate, -900, -300)
    ru = param(m, unreal.MaterialExpressionVectorParameter, prefix+'UVRowU', -900, -400, unreal.LinearColor(1,0,0,0))
    rv = param(m, unreal.MaterialExpressionVectorParameter, prefix+'UVRowV', -900, -500, unreal.LinearColor(0,1,0,0))
    flip = param(m, unreal.MaterialExpressionScalarParameter, prefix+'FlipY', -900, -600, 1.0)
    transformed = custom(m, 'float3 p=float3(UV.x,1-UV.y,1); float v=dot(p,V.xyz); return float2(dot(p,U.xyz),lerp(v,1-v,Flip));',
        {'UV':uv,'U':ru,'V':rv,'Flip':flip}, unreal.CustomMaterialOutputType.CMOT_FLOAT2)
    tex = MEL.create_material_expression(m, unreal.MaterialExpressionTextureSampleParameter2D, -300, -200)
    tex.set_editor_property('parameter_name', (prefix or 'Base')+'Map')
    tex.set_editor_property('texture', next(t for t in textures.values() if t.get_editor_property('srgb') != linear))
    tex.set_editor_property('sampler_type', unreal.MaterialSamplerType.SAMPLERTYPE_LINEAR_COLOR if linear else unreal.MaterialSamplerType.SAMPLERTYPE_COLOR)
    # The texture sample's input pin is 'UVs'; 'Coordinates' silently failed, so every map ignored
    # its three.js repeat/offset (flagstones tiled 3.3x too small, photo crops showed whole photos).
    assert MEL.connect_material_expressions(transformed, '', tex, 'UVs') or MEL.connect_material_expressions(transformed, '', tex, 'Coordinates'), 'texture UV hookup failed'
    return tex

import os as _os
import math
ALBEDO_TONE = tuple(float(v) for v in _os.environ.get('ALBEDO_TONE', '0.6,1.0,0.4').split(','))  # knee, power, floor
SPECULAR = float(_os.environ.get('MATERIAL_SPECULAR', '0.25'))
LEAF_RIM = float(_os.environ.get('LEAF_RIM', '1.0'))  # 0 switches the leafy silhouette cut-outs off
LEAF_MAP_CONTRAST = float(_os.environ.get('LEAF_MAP_CONTRAST', '0.35'))
# Mean of the authored broadleaf crown map (c5e0620477e4197d6e7a), after sRGB
# decoding. Blending toward it reduces the oval pattern without lifting albedo.
LEAF_MAP_MEAN = 0.3895330266639338
LEAF_CONTRAST_MAPS = {'c5e0620477e4197d6e7a46258cc9b89e79ca8ec5a1e3f6b1fab49606797b3bca'}
assert math.isfinite(LEAF_MAP_CONTRAST) and 0 <= LEAF_MAP_CONTRAST <= 1, 'Invalid foliage map contrast'
ARCADE_ROOF_GAIN = float(_os.environ.get('ARCADE_ROOF_GAIN', '1.45'))
ARCADE_ROOF_TINT = tuple(float(v) for v in _os.environ.get('ARCADE_ROOF_TINT', '1,1,1').split(','))
TEMPLE_PAVING_GAIN = float(_os.environ.get('TEMPLE_PAVING_GAIN', '1.8'))
HOUSE_TIMBER_GAIN = float(_os.environ.get('HOUSE_TIMBER_GAIN', '1.5'))
assert math.isfinite(HOUSE_TIMBER_GAIN) and .1 <= HOUSE_TIMBER_GAIN <= 4, 'Invalid structural timber gain'
assert math.isfinite(ARCADE_ROOF_GAIN) and ARCADE_ROOF_GAIN > 0, 'Invalid arcade roof gain'
assert len(ARCADE_ROOF_TINT) == 3 and all(math.isfinite(v) and v > 0 for v in ARCADE_ROOF_TINT), 'Invalid arcade roof tint'
assert math.isfinite(TEMPLE_PAVING_GAIN) and TEMPLE_PAVING_GAIN > 0, 'Invalid temple paving gain'
# Both lake views support finer variation after reducing the crown map contrast.
# Parameters can be trialled without recompiling the master graphs.
FOLIAGE_STYLE = {
    'LeafCellCM': float(_os.environ.get('LEAF_CELL_CM', '15')),
    'LeafClumpCM': float(_os.environ.get('LEAF_CLUMP_CM', '120')),
    'LeafFineContrast': float(_os.environ.get('LEAF_FINE_CONTRAST', '0.2')),
    'LeafClumpContrast': float(_os.environ.get('LEAF_CLUMP_CONTRAST', '0.15')),
}
assert all(math.isfinite(v) for v in FOLIAGE_STYLE.values()), 'Invalid foliage style'
assert FOLIAGE_STYLE['LeafCellCM'] > 0 and FOLIAGE_STYLE['LeafClumpCM'] > 0, 'Foliage cells must be positive'
assert 0 <= FOLIAGE_STYLE['LeafFineContrast'] <= 1.8 and 0 <= FOLIAGE_STYLE['LeafClumpContrast'] <= 2, 'Invalid foliage contrast'

def exclusive_materials(object_name):
    objects = [o for o in meta['objects'] if o['name'] == object_name]
    assert len(objects) == 1, f'Expected one object: {object_name}'
    materials = set(objects[0]['materials'])
    users = [o for o in meta['objects'] if materials.intersection(o['materials'])]
    assert materials and len(users) == 1, f'Material shared outside {object_name}: {[o["name"] for o in users]}'
    return materials

# Resolve from the authored object, never a shared name or an export-order index.
# The arcade and west shed use cloned slope materials; their ridge is shared.
arcade_roof_mats = exclusive_materials('Long lakeside bathing arcade tiled roof tiles')
temple_paving_mats = exclusive_materials('Courtyard large stone paving')

def master(name, tint=False, two_sided=False, water=False, emissive=False, mapped=False, masked=False, linear_maps=False, foliage=False, foliage_map_contrast=False):
    assert not foliage_map_contrast or (foliage and mapped), 'Map contrast requires mapped foliage'
    path = f'{DIR}/{name}'
    existing = unreal.load_asset(path) if EAL.does_asset_exist(path) else None
    water_upgrade = water and existing and (
        not {'WaterSpecular', 'WaterNormalIrregularMix'}.issubset(
            {str(n) for n in MEL.get_scalar_parameter_names(existing)}) or
        not any(isinstance(node, unreal.MaterialExpressionCustom) and
                node.get_editor_property('code') == WATER_NORMAL_CODE
                for node in MEL.get_material_expressions(existing)))
    normal_facing = mapped and two_sided and not (water or foliage)
    normal_upgrade = normal_facing and existing and 'TwoSidedNormalFlip' not in {str(n) for n in MEL.get_scalar_parameter_names(existing)}
    existing_leaf_parameters = {str(n) for n in MEL.get_scalar_parameter_names(existing)} if foliage and existing else set()
    foliage_upgrade = foliage and existing and ('LeafCellCM' not in existing_leaf_parameters or
                                                (('LeafMapContrast' in existing_leaf_parameters) != foliage_map_contrast))
    if existing and '--rebuild' not in __import__('sys').argv and not (water_upgrade or foliage_upgrade or normal_upgrade):
        m = unreal.load_asset(path)
        # Nanite meshes fall back to the default material unless the master allows Nanite.
        if not m.get_editor_property('used_with_nanite'):
            m.set_editor_property('used_with_nanite', True); MEL.recompile_material(m); EAL.save_loaded_asset(m)
        return m
    m = existing or AT.create_asset(name, DIR, unreal.Material, unreal.MaterialFactoryNew())
    m.modify()
    # UE 5.8 DeleteAllMaterialExpressions mutates the array it iterates and can
    # leave old custom outputs/parameters behind. Delete a snapshot instead.
    for expression in list(MEL.get_material_expressions(m)):
        MEL.delete_material_expression(m, expression)
    assert MEL.get_num_material_expressions(m) == 0, name
    m.set_editor_property('two_sided', two_sided)
    m.set_editor_property('used_with_nanite', True)
    col = param(m, unreal.MaterialExpressionVectorParameter, 'Color', -700, 0, unreal.LinearColor(1, 1, 1, 1))
    out = col
    if mapped:
        tex = texture_sample(m, '')
        base_map = tex
        if foliage_map_contrast:
            contrast = param(m, unreal.MaterialExpressionScalarParameter, 'LeafMapContrast', -700, -250, 1.0)
            base_map = custom(m, 'return lerp(float3(%s,%s,%s),Map.rgb,Contrast);' % ((LEAF_MAP_MEAN,) * 3),
                {'Map':tex, 'Contrast':contrast}, unreal.CustomMaterialOutputType.CMOT_FLOAT3)
        mul = MEL.create_material_expression(m, unreal.MaterialExpressionMultiply, -100, 0)
        MEL.connect_material_expressions(col, '', mul, 'A'); MEL.connect_material_expressions(base_map, '' if foliage_map_contrast else 'RGB', mul, 'B'); out = mul
        if masked:
            m.set_editor_property('blend_mode', unreal.BlendMode.BLEND_MASKED)
            MEL.connect_material_property(tex, 'A', unreal.MaterialProperty.MP_OPACITY_MASK)
            # Thin pierced screens get little Lumen bounce light and read black in shade; a small
            # self-lit fill keeps them the painted white seen in the photographs.
            fill = MEL.create_material_expression(m, unreal.MaterialExpressionMultiply, -100, 150)
            MEL.connect_material_expressions(mul, '', fill, 'A'); fill.set_editor_property('const_b', 0.35)
            MEL.connect_material_property(fill, '', unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    if tint:
        vc = MEL.create_material_expression(m, unreal.MaterialExpressionVertexColor, -700, 250)
        mul = MEL.create_material_expression(m, unreal.MaterialExpressionMultiply, -350, 100)
        MEL.connect_material_expressions(out, '', mul, 'A'); MEL.connect_material_expressions(vc, '', mul, 'B'); out = mul
    if foliage:
        # Crowns are smooth web spheres: break them into leaf-scale speckle and clump-scale
        # variation from world position (cm) and scatter the normals like leaf facets.
        fpos = MEL.create_material_expression(m, unreal.MaterialExpressionWorldPosition, -900, 150)
        style = {key: param(m, unreal.MaterialExpressionScalarParameter, key, -1200, 150 + j*75, value)
                 for j, (key, value) in enumerate(FOLIAGE_STYLE.items())}
        out = custom(m, 'float a=frac(sin(dot(floor(P/LeafCellCM),float3(12.9898,78.233,37.719)))*43758.5453); float b=frac(sin(dot(floor(P/LeafClumpCM),float3(39.3,11.7,83.1)))*24634.6345); return Col*(0.9+LeafFineContrast*(a-0.5))*(1.0+LeafClumpContrast*(b-0.5));',
            {'Col':out,'P':fpos,**style}, unreal.CustomMaterialOutputType.CMOT_FLOAT3)
        if not mapped:  # mapped masters already drive the normal from the bump map
            fn = MEL.create_material_expression(m, unreal.MaterialExpressionVertexNormalWS, -900, 250)
            leafy = custom(m, 'float3 q=floor(P/80.0); float3 r=frac(sin(float3(dot(q,float3(12.9,78.2,37.7)),dot(q,float3(39.3,11.7,83.1)),dot(q,float3(73.1,52.3,9.7))))*43758.5453)-0.5; return normalize(N+1.2*r);',
                {'P':fpos,'N':fn}, unreal.CustomMaterialOutputType.CMOT_FLOAT3)
            m.set_editor_property('tangent_space_normal', False)
            MEL.connect_material_property(leafy, '', unreal.MaterialProperty.MP_NORMAL)
        if not masked and LEAF_RIM:
            rn = MEL.create_material_expression(m, unreal.MaterialExpressionVertexNormalWS, -900, 300)
            # The crowns are smooth blobs next to the photographs' palms and broadleaf trees. Cut
            # leaf-sized holes that grow towards the silhouette (where the surface turns away
            # from the camera), so each crown gets a ragged, leafy outline; its face stays solid.
            m.set_editor_property('blend_mode', unreal.BlendMode.BLEND_MASKED)
            m.set_editor_property('two_sided', True)
            cam = MEL.create_material_expression(m, unreal.MaterialExpressionCameraPositionWS, -900, 350)
            rim = custom(m, 'float3 V=normalize(C-P); float f=1.0-abs(dot(normalize(N),V)); float a=frac(sin(dot(floor(P/55.0),float3(12.9898,78.233,37.719)))*43758.5453); float b=frac(sin(dot(floor(P/140.0),float3(39.3,11.7,83.1)))*24634.6345); return (a*0.5+b*0.5)-(0.02+%s*f*f)+0.3333;' % LEAF_RIM,
                {'P':fpos,'N':rn,'C':cam}, unreal.CustomMaterialOutputType.CMOT_FLOAT1)
            MEL.connect_material_property(rim, '', unreal.MaterialProperty.MP_OPACITY_MASK)
    if emissive:
        glow = MEL.create_material_expression(m, unreal.MaterialExpressionMultiply, -350, 300)
        strength = param(m, unreal.MaterialExpressionScalarParameter, 'EmissionStrength', -700, 300, 40.0)
        MEL.connect_material_expressions(col, '', glow, 'A')
        MEL.connect_material_expressions(strength, '', glow, 'B')
        MEL.connect_material_property(glow, '', unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    if two_sided and not (masked or emissive or water or foliage):
        # Thin two-sided sheets (roof undersides, awnings) get almost no Lumen bounce on their back
        # faces and render pitch black from below; a faint self-lit fill keeps them readable.
        fill2 = MEL.create_material_expression(m, unreal.MaterialExpressionMultiply, -100, 200)
        strength = param(m, unreal.MaterialExpressionScalarParameter, 'SheetFill', -700, 550, 0.12)
        front = param(m, unreal.MaterialExpressionScalarParameter, 'SheetFillFront', -700, 600, 1.0)
        facing = MEL.create_material_expression(m, unreal.MaterialExpressionTwoSidedSign, -700, 650)
        amount = custom(m, 'return Strength * lerp(1.0, Front, saturate(Facing));',
            {'Strength':strength, 'Front':front, 'Facing':facing}, unreal.CustomMaterialOutputType.CMOT_FLOAT1)
        MEL.connect_material_expressions(out, '', fill2, 'A')
        MEL.connect_material_expressions(amount, '', fill2, 'B')
        MEL.connect_material_property(fill2, '', unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    if not (water or foliage or emissive):
        # The web colours are the photographs' appearance, and under the overcast sky light dark
        # finishes (oxide floors, old timber, wet stone, soil) rendered two to three times lighter
        # against the pale walls than the photographs show (14.56.30: floor, pillar, walkway).
        # Scale albedo down as it gets darker; pale plaster is untouched.
        out = custom(m, 'float L=max(Col.r,max(Col.g,Col.b)); return Col*clamp(pow(L/%s,%s),%s,1.0);' % ALBEDO_TONE,
            {'Col':out}, unreal.CustomMaterialOutputType.CMOT_FLOAT3)
    MEL.connect_material_property(out, '', unreal.MaterialProperty.MP_BASE_COLOR)
    r = param(m, unreal.MaterialExpressionScalarParameter, 'Roughness', -700, 400, 0.05 if water else 0.85)
    if mapped:
        rough_tex = texture_sample(m, 'Roughness', linear_maps)
        use_rough = param(m, unreal.MaterialExpressionScalarParameter, 'UseRoughnessMap', -700, 450, 0.0)
        r = custom(m, 'return Roughness * lerp(1,Map.g,UseMap);',
            {'Roughness':r,'Map':rough_tex,'UseMap':use_rough}, unreal.CustomMaterialOutputType.CMOT_FLOAT1)
        bump_tex = texture_sample(m, 'Bump', linear_maps)
        strength = param(m, unreal.MaterialExpressionScalarParameter, 'BumpCentimetres', -700, 700, 0.0)
        position = MEL.create_material_expression(m, unreal.MaterialExpressionWorldPosition, -900, 800)
        normal = MEL.create_material_expression(m, unreal.MaterialExpressionVertexNormalWS, -900, 900)
        bumped = custom(m, 'float3 N=normalize(Normal); float3 sx=ddx(P), sy=ddy(P); float3 r1=cross(sy,N),r2=cross(N,sx); float det=dot(sx,r1); float h=Map.r*Strength; return normalize(abs(det)*N-sign(det)*(ddx(h)*r1+ddy(h)*r2)+1e-10*N);',
            {'Normal':normal,'P':position,'Map':bump_tex,'Strength':strength}, unreal.CustomMaterialOutputType.CMOT_FLOAT3)
        if normal_facing:
            # UE flips tangent-space normals automatically. Our bump is in world
            # space, so solid sheet back faces need the same final facing correction.
            facing = MEL.create_material_expression(m, unreal.MaterialExpressionTwoSidedSign, -900, 1000)
            flip = param(m, unreal.MaterialExpressionScalarParameter, 'TwoSidedNormalFlip', -900, 1050, 1.0)
            bumped = custom(m, 'return Normal * lerp(1.0, Facing, Flip);',
                {'Normal':bumped,'Facing':facing,'Flip':flip}, unreal.CustomMaterialOutputType.CMOT_FLOAT3)
        m.set_editor_property('tangent_space_normal', False)
        MEL.connect_material_property(bumped, '', unreal.MaterialProperty.MP_NORMAL)
    MEL.connect_material_property(r, '', unreal.MaterialProperty.MP_ROUGHNESS)
    if not water:
        # Rough weathered finishes showed a pale veil where they face the bright overcast sky at a
        # grazing angle (tank treads and roofs had a near-black base colour and a light grey
        # render with the default). Polished finishes keep the default reflectance, satin ones
        # (oxide floors, roughness about 0.75) get half, which keeps the slight sheen 14.56.30
        # shows, and fully matt ones (stone, tiles, old timber) get almost none (15.23.35 steps).
        matt = custom(m, 'return lerp(lerp(0.5,%s,smoothstep(0.35,0.7,R)),0.05,smoothstep(0.8,0.92,R));' % SPECULAR, {'R':r}, unreal.CustomMaterialOutputType.CMOT_FLOAT1)
        MEL.connect_material_property(matt, '', unreal.MaterialProperty.MP_SPECULAR)
    mt = param(m, unreal.MaterialExpressionScalarParameter, 'Metallic', -700, 500, 0.0)
    MEL.connect_material_property(mt, '', unreal.MaterialProperty.MP_METALLIC)
    if water:
        m.set_editor_property('shading_model', unreal.MaterialShadingModel.MSM_SINGLE_LAYER_WATER)
        volume = MEL.create_material_expression(m, unreal.MaterialExpressionSingleLayerWaterMaterialOutput, 300, 300)
        scattering = param(m, unreal.MaterialExpressionVectorParameter, 'WaterScattering', -700, 950, unreal.LinearColor(.012,.018,.01,1))
        absorption = param(m, unreal.MaterialExpressionVectorParameter, 'WaterAbsorption', -700, 1050, unreal.LinearColor(.035,.03,.04,1))
        assert MEL.connect_material_expressions(scattering, '', volume, 'ScatteringCoefficients')
        assert MEL.connect_material_expressions(absorption, '', volume, 'AbsorptionCoefficients')
        opacity = param(m, unreal.MaterialExpressionScalarParameter, 'WaterSurfaceOpacity', -700, 1150, .15)
        MEL.connect_material_property(opacity, '', unreal.MaterialProperty.MP_OPACITY)
        spec = param(m, unreal.MaterialExpressionScalarParameter, 'WaterSpecular', -700, 600, 0.5)
        MEL.connect_material_property(spec, '', unreal.MaterialProperty.MP_SPECULAR)
        m.set_editor_property('tangent_space_normal', False)
        position = MEL.create_material_expression(m, unreal.MaterialExpressionWorldPosition, -900, 700)
        time = MEL.create_material_expression(m, unreal.MaterialExpressionTime, -900, 850)
        mix = param(m, unreal.MaterialExpressionScalarParameter, 'WaterNormalIrregularMix', -900, 950, 0.0)
        normal = custom(m, WATER_NORMAL_CODE,
            {'P':position,'T':time,'Mix':mix}, unreal.CustomMaterialOutputType.CMOT_FLOAT3)
        MEL.connect_material_property(normal, '', unreal.MaterialProperty.MP_NORMAL)
    MEL.recompile_material(m); EAL.save_loaded_asset(m)
    return m

masters = {
    'plain': master('M_Web'), 'tint': master('M_WebTint', tint=True), 'both': master('M_WebTwoSided', two_sided=True),
    'tintboth': master('M_WebTintTwoSided', tint=True, two_sided=True), 'water': master('M_Water', water=True),
    'glow': master('M_WebEmissive', emissive=True),
}
for tint in (False, True):
    for both in (False, True):
        for masked in (False, True):
            key = 'mapped' + ('tint' if tint else '') + ('both' if both else '') + ('mask' if masked else '')
            masters[key] = master('M_' + key, tint=tint, two_sided=both, mapped=True, masked=masked)

def srgb(v): return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
def colour(web):
    h = (web['color'] or '#ffffff').lstrip('#'); c = [srgb(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)]
    if web.get('mapBase') and not (web.get('proceduralMap') or web.get('photoMap')):
        b = [int(v) for v in web['mapBase'][4:-1].split(',')]; c = [x * srgb(y / 255) for x, y in zip(c, b)]
    return unreal.LinearColor(*c, 1.0)

made = {}

def bind_map(mi, record, prefix=''):
    MEL.set_material_instance_texture_parameter_value(mi, (prefix or 'Base')+'Map', textures[(record['sha256'],record['wrapS'],record['wrapT'],record['colorSpace'])])
    a = record['matrix']
    MEL.set_material_instance_vector_parameter_value(mi, prefix+'UVRowU', unreal.LinearColor(a[0],a[3],a[6],0))
    MEL.set_material_instance_vector_parameter_value(mi, prefix+'UVRowV', unreal.LinearColor(a[1],a[4],a[7],0))
    MEL.set_material_instance_scalar_parameter_value(mi, prefix+'FlipY', float(record['flipY']))
# Finishes the game's sky light lifts well above the photographs although the web colour is right there
# (2026-10-02 captures against 15.23.35 and 14.44.09). Linear multipliers on the instance colour, by web material name.
GAME_TINT = {'tank stone': .32, 'tank mossy stone': .32, 'tank tread top': .4, 'court sheet barrier': .65,
             'house roof courses upper-front': .5, 'house roof courses lower-veranda': .5, 'house roof courses rear': .5}
# Names must be unique per material object: clones that share a name collide in the material table
# (naming the landscape's dark tile turned the west shed roof white).
# Not 'weathered dark tile': a multiplier of 2.2 fixed the arcade roof (66 -> 99 against 97) but turned
# the west shed roof white (55 -> 236); the roofs sharing that material do not respond alike.

def instance(i):
    if i in made: return made[i]
    web = M[i]
    kind = 'water' if web['name'] == 'lake water' else 'glow' if web.get('emissive') else \
           ('tint' if i in tinted else 'plain') + ('both' if web.get('doubleSided') else '')
    kind = {'plainboth': 'both'}.get(kind, kind)
    record = web.get('proceduralMap') or web.get('photoMap')
    if record and kind not in ('water', 'glow'):
        kind = 'mapped' + ('tint' if i in tinted else '') + ('both' if web.get('doubleSided') else '') + ('mask' if web.get('alphaTest') else '')
        if any(web.get(k) and web[k]['colorSpace'] != 'srgb' for k in ('bumpMap','roughnessMap')):
            kind += 'LinearData'
            if kind not in masters:
                masters[kind] = master('M_'+kind, tint=i in tinted, two_sided=bool(web.get('doubleSided')), mapped=True, masked=bool(web.get('alphaTest')), linear_maps=True)
    if i in foliage_mats and kind not in ('water', 'glow'):
        map_contrast = bool(record and record['sha256'] in LEAF_CONTRAST_MAPS)
        # Awning canopies and carved foliage also match VEG. Only the crown map
        # gets this control, with its own master so trial setters cannot alter them.
        leaf = kind + ('MapContrast' if map_contrast else '') + 'leaf'
        if leaf not in masters:
            masters[leaf] = master('M_' + leaf, tint=i in tinted, two_sided=bool(web.get('doubleSided')), mapped=kind.startswith('mapped'),
                                   masked=kind.startswith('mapped') and bool(web.get('alphaTest')), linear_maps='LinearData' in kind, foliage=True,
                                   foliage_map_contrast=map_contrast)
        kind = leaf
    name = 'MI_' + re.sub(r'[^A-Za-z0-9]+', '_', web['name']).strip('_') + f'_{i}'
    path = f'{DIR}/Web/{name}'
    # Update in place: other meshes may already reference this instance.
    mi = unreal.load_asset(path) if EAL.does_asset_exist(path) else         AT.create_asset(name, f'{DIR}/Web', unreal.MaterialInstanceConstant, unreal.MaterialInstanceConstantFactoryNew())
    MEL.set_material_instance_parent(mi, masters[kind])
    if kind.endswith('leaf'):
        for key, value in FOLIAGE_STYLE.items():
            MEL.set_material_instance_scalar_parameter_value(mi, key, value)
        if record and record['sha256'] in LEAF_CONTRAST_MAPS:
            MEL.set_material_instance_scalar_parameter_value(mi, 'LeafMapContrast', LEAF_MAP_CONTRAST)
    if record and kind.startswith('mapped'):
        bind_map(mi, record)
        if web.get('bumpMap'): bind_map(mi, web['bumpMap'], 'Bump')
        if web.get('roughnessMap'): bind_map(mi, web['roughnessMap'], 'Roughness')
        MEL.set_material_instance_scalar_parameter_value(mi, 'BumpCentimetres', float(web['bumpScale'])*100 if web.get('bumpMap') else 0.0)
        MEL.set_material_instance_scalar_parameter_value(mi, 'UseRoughnessMap', float(bool(web.get('roughnessMap'))))
    c = colour(web)
    if i in tiled_roofs: c = unreal.LinearColor(c.r * ROOF_WEATHER[0], c.g * ROOF_WEATHER[1], c.b * ROOF_WEATHER[2], 1)
    if kind == 'water': c = unreal.LinearColor(0.025, 0.065, 0.018, 1)
    if kind == 'water':
        # The tank photographs show an opaque algae green under a pale sky sheen (HSV
        # saturation about 0.2): scatter a greyish green and absorb red and blue only mildly.
        # 15.23.35 sampled (113,146,98) against a rendered (150,202,149): less blue in the scatter,
        # more red and blue absorbed, and a weaker sky sheen give a deeper olive.
        MEL.set_material_instance_vector_parameter_value(mi, 'WaterScattering', unreal.LinearColor(.011, .013, .008, 1))
        MEL.set_material_instance_vector_parameter_value(mi, 'WaterAbsorption', unreal.LinearColor(.33, .24, .36, 1))
        MEL.set_material_instance_scalar_parameter_value(mi, 'WaterSpecular', 0.35)
        MEL.set_material_instance_scalar_parameter_value(mi, 'WaterNormalIrregularMix', 1.0)
    if kind == 'glow':
        h = web['emissive'].lstrip('#'); c = unreal.LinearColor(*[srgb(int(h[k:k + 2], 16) / 255) for k in (0, 2, 4)], 1)
        # The small bulb previously emitted 40x saturated orange in addition to
        # its native point light. Keep it luminous without flooding the shrine.
        if i in bulb_materials: c = unreal.LinearColor(1.0, .84, .65, 1)
        # Scale by the web's own emissive intensity. The sanctum reads dark in the photos: flames (3.2) at 16, the shelf image (0.25) and skylights (0.35) no longer blow out.
        MEL.set_material_instance_scalar_parameter_value(mi, 'EmissionStrength', 6.0 if i in bulb_materials else 5.0 * float(web.get('emissiveIntensity') or 3.2))
    if i in polished_brass: c = unreal.LinearColor(.48, .30, .085, 1)
    k = GAME_TINT.get(web['name'])
    if k: c = unreal.LinearColor(c.r * k, c.g * k, c.b * k, 1)
    if i in arcade_roof_mats:
        c = unreal.LinearColor(c.r * ARCADE_ROOF_GAIN * ARCADE_ROOF_TINT[0],
                               c.g * ARCADE_ROOF_GAIN * ARCADE_ROOF_TINT[1],
                               c.b * ARCADE_ROOF_GAIN * ARCADE_ROOF_TINT[2], 1)
    if i in temple_paving_mats:
        c = unreal.LinearColor(c.r * TEMPLE_PAVING_GAIN, c.g * TEMPLE_PAVING_GAIN,
                               c.b * TEMPLE_PAVING_GAIN, 1)
    if i == structural_timber:
        c = unreal.LinearColor(c.r*HOUSE_TIMBER_GAIN, c.g*HOUSE_TIMBER_GAIN, c.b*HOUSE_TIMBER_GAIN, c.a)
    MEL.set_material_instance_vector_parameter_value(mi, 'Color', c)
    MEL.set_material_instance_scalar_parameter_value(mi, 'Roughness', 0.08 if kind == 'water' else .32 if i in altar_brass else .3 if i in polished_brass else float(web['roughness'] if web['roughness'] is not None else 0.85))
    MEL.set_material_instance_scalar_parameter_value(mi, 'Metallic', .9 if i in altar_brass or i in polished_brass else float(web['metalness'] or 0))
    EAL.save_loaded_asset(mi); made[i] = mi; return mi

def lookup(slot):
    for n in (slot, re.sub(r'\.\d{3}$', '', slot), slot.replace('_', '.'), re.sub(r'_\d{3}$', '', slot).replace('_', '.'), slot.replace('_', ' ')):
        if n in by_name: return by_name[n]
    return None

missing = set()
import sys
argv = sys.argv[1:]
manifest = os.path.join(HERE, '..', '..', 'blender', 'build', 'unreal', 'parts.json')
parts = json.load(open(manifest)) if os.path.exists(manifest) else [{'name': p, 'kind': p} for p in ['ground', 'water', 'house', 'temple', 'landscape']]
requested = argv[argv.index('--parts') + 1].split(',') if '--parts' in argv else None
PARTS = [p['name'] for p in parts if not requested or p['name'] in requested or p['kind'] in requested]
if not PARTS: raise ValueError('No native mesh groups matched --parts')
for part in PARTS:
    mesh = unreal.load_asset(f'/Game/Scene/{part}/{part}/StaticMeshes/{part}.{part}')
    slots = list(mesh.static_materials)
    for sm in slots:  # assign every slot, then rebuild the (Nanite) mesh once
        slot = str(sm.material_slot_name)
        i = lookup(slot)
        if i is None and sm.material_interface: i = lookup(sm.material_interface.get_name())
        if i is None: missing.add(slot); continue
        sm.material_interface = instance(i)
    mesh.set_editor_property('static_materials', slots)
    EAL.save_loaded_asset(mesh)
    print('MATERIALS', part, len(mesh.static_materials))
print('MATERIALS instances', len(made), 'unmatched', sorted(missing)[:20])
assert not missing, 'Unmatched native material slots: ' + ', '.join(sorted(missing))
