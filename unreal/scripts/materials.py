"""Rebuilds every imported material from the web scene's own material data.

    UnrealEditor-Cmd <uproject> -run=pythonscript -script=unreal/scripts/materials.py

glTF import drops per-instance colours (foliage, roof tile courses), so each slot gets an
instance of a small master material: colour x vertex colour where the web tints meshes,
roughness and metalness from the web material, two-sided where the web draws both sides.
"""
import json, os, re, unreal
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
SCENE = os.path.normpath(os.path.join(HERE, '..', '..', 'blender', 'build', 'scene.json'))
meta = json.load(open(SCENE, encoding='utf8'))
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
veg_use = {}
for o in meta['objects']:
    for m in o['materials']: u = veg_use.setdefault(m, [0, 0]); u[0] += 1; u[1] += bool(VEG.search(o['name'])) and not re.search(r'trunk', o['name'], re.I)
foliage_mats = {m for m, (n, v) in veg_use.items() if v / n >= 0.5}
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
    MEL.connect_material_expressions(transformed, '', tex, 'Coordinates')
    return tex

def master(name, tint=False, two_sided=False, water=False, emissive=False, mapped=False, masked=False, linear_maps=False, foliage=False):
    path = f'{DIR}/{name}'
    existing = unreal.load_asset(path) if EAL.does_asset_exist(path) else None
    water_upgrade = water and existing and 'WaterSpecular' not in [str(n) for n in MEL.get_scalar_parameter_names(existing)]
    if existing and '--rebuild' not in __import__('sys').argv and not water_upgrade:
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
        mul = MEL.create_material_expression(m, unreal.MaterialExpressionMultiply, -100, 0)
        MEL.connect_material_expressions(col, '', mul, 'A'); MEL.connect_material_expressions(tex, 'RGB', mul, 'B'); out = mul
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
        out = custom(m, 'float a=frac(sin(dot(floor(P/60.0),float3(12.9898,78.233,37.719)))*43758.5453); float b=frac(sin(dot(floor(P/300.0),float3(39.3,11.7,83.1)))*24634.6345); return Col*(0.6+0.6*a)*(0.8+0.4*b);',
            {'Col':out,'P':fpos}, unreal.CustomMaterialOutputType.CMOT_FLOAT3)
        if not mapped:  # mapped masters already drive the normal from the bump map
            fn = MEL.create_material_expression(m, unreal.MaterialExpressionVertexNormalWS, -900, 250)
            leafy = custom(m, 'float3 q=floor(P/80.0); float3 r=frac(sin(float3(dot(q,float3(12.9,78.2,37.7)),dot(q,float3(39.3,11.7,83.1)),dot(q,float3(73.1,52.3,9.7))))*43758.5453)-0.5; return normalize(N+1.2*r);',
                {'P':fpos,'N':fn}, unreal.CustomMaterialOutputType.CMOT_FLOAT3)
            m.set_editor_property('tangent_space_normal', False)
            MEL.connect_material_property(leafy, '', unreal.MaterialProperty.MP_NORMAL)
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
        MEL.connect_material_expressions(out, '', fill2, 'A'); fill2.set_editor_property('const_b', 0.12)
        MEL.connect_material_property(fill2, '', unreal.MaterialProperty.MP_EMISSIVE_COLOR)
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
        m.set_editor_property('tangent_space_normal', False)
        MEL.connect_material_property(bumped, '', unreal.MaterialProperty.MP_NORMAL)
    MEL.connect_material_property(r, '', unreal.MaterialProperty.MP_ROUGHNESS)
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
        normal = custom(m, 'float2 p=P.xy; float a=dot(p,float2(.13,.07))+T*.7; float b=dot(p,float2(-.11,.21))-T*.53; float c=dot(p,float2(.29,-.17))+T*.91; return normalize(float3(-.012*cos(a)+.008*cos(b)-.006*cos(c),-.006*cos(a)-.015*cos(b)+.0035*cos(c),1));',
            {'P':position,'T':time}, unreal.CustomMaterialOutputType.CMOT_FLOAT3)
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
        leaf = kind + 'leaf'
        if leaf not in masters:
            masters[leaf] = master('M_' + leaf, tint=i in tinted, two_sided=bool(web.get('doubleSided')), mapped=kind.startswith('mapped'),
                                   masked=kind.startswith('mapped') and bool(web.get('alphaTest')), linear_maps='LinearData' in kind, foliage=True)
        kind = leaf
    name = 'MI_' + re.sub(r'[^A-Za-z0-9]+', '_', web['name']).strip('_') + f'_{i}'
    path = f'{DIR}/Web/{name}'
    # Update in place: other meshes may already reference this instance.
    mi = unreal.load_asset(path) if EAL.does_asset_exist(path) else         AT.create_asset(name, f'{DIR}/Web', unreal.MaterialInstanceConstant, unreal.MaterialInstanceConstantFactoryNew())
    MEL.set_material_instance_parent(mi, masters[kind])
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
        MEL.set_material_instance_vector_parameter_value(mi, 'WaterScattering', unreal.LinearColor(.010, .014, .009, 1))
        MEL.set_material_instance_vector_parameter_value(mi, 'WaterAbsorption', unreal.LinearColor(.30, .22, .29, 1))
    if kind == 'glow':
        h = web['emissive'].lstrip('#'); c = unreal.LinearColor(*[srgb(int(h[k:k + 2], 16) / 255) for k in (0, 2, 4)], 1)
        # The small bulb previously emitted 40x saturated orange in addition to
        # its native point light. Keep it luminous without flooding the shrine.
        if i in bulb_materials: c = unreal.LinearColor(1.0, .84, .65, 1)
        # Scale by the web's own emissive intensity. The sanctum reads dark in the photos: flames (3.2) at 16, the shelf image (0.25) and skylights (0.35) no longer blow out.
        MEL.set_material_instance_scalar_parameter_value(mi, 'EmissionStrength', 6.0 if i in bulb_materials else 5.0 * float(web.get('emissiveIntensity') or 3.2))
    if i in polished_brass: c = unreal.LinearColor(.48, .30, .085, 1)
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
