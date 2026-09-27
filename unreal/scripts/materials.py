"""Rebuilds every imported material from the web scene's own material data.

    UnrealEditor-Cmd <uproject> -run=pythonscript -script=unreal/scripts/materials.py

glTF import drops per-instance colours (foliage, roof tile courses), so each slot gets an
instance of a small master material: colour x vertex colour where the web tints meshes,
roughness and metalness from the web material, two-sided where the web draws both sides.
"""
import json, os, re, unreal

HERE = os.path.dirname(os.path.abspath(__file__))
SCENE = os.path.normpath(os.path.join(HERE, '..', '..', 'blender', 'build', 'scene.json'))
meta = json.load(open(SCENE, encoding='utf8'))
M = meta['materials']; G = meta['geometries']
by_name = {m['name']: i for i, m in enumerate(M)}
tinted = set()
for o in meta['objects']:
    if o.get('instanceColors') or G[o['geometry']].get('color'): tinted.update(o['materials'])

AT = unreal.AssetToolsHelpers.get_asset_tools(); MEL = unreal.MaterialEditingLibrary; EAL = unreal.EditorAssetLibrary
DIR = '/Game/Materials'

def param(m, cls, name, x, y, default):
    e = MEL.create_material_expression(m, cls, x, y); e.set_editor_property('parameter_name', name)
    e.set_editor_property('default_value', default); return e

def master(name, tint=False, two_sided=False, water=False, emissive=False):
    path = f'{DIR}/{name}'
    if EAL.does_asset_exist(path) and '--rebuild' not in __import__('sys').argv:
        m = unreal.load_asset(path)
        # Nanite meshes fall back to the default material unless the master allows Nanite.
        if not m.get_editor_property('used_with_nanite'):
            m.set_editor_property('used_with_nanite', True); MEL.recompile_material(m); EAL.save_loaded_asset(m)
        return m
    if EAL.does_asset_exist(path): EAL.delete_asset(path)
    m = AT.create_asset(name, DIR, unreal.Material, unreal.MaterialFactoryNew())
    m.set_editor_property('two_sided', two_sided)
    m.set_editor_property('used_with_nanite', True)
    col = param(m, unreal.MaterialExpressionVectorParameter, 'Color', -700, 0, unreal.LinearColor(1, 1, 1, 1))
    out = col
    if tint:
        vc = MEL.create_material_expression(m, unreal.MaterialExpressionVertexColor, -700, 250)
        mul = MEL.create_material_expression(m, unreal.MaterialExpressionMultiply, -350, 100)
        MEL.connect_material_expressions(col, '', mul, 'A'); MEL.connect_material_expressions(vc, '', mul, 'B'); out = mul
    if emissive:
        glow = MEL.create_material_expression(m, unreal.MaterialExpressionMultiply, -350, 300)
        MEL.connect_material_expressions(col, '', glow, 'A'); glow.set_editor_property('const_b', 40.0)
        MEL.connect_material_property(glow, '', unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    MEL.connect_material_property(out, '', unreal.MaterialProperty.MP_BASE_COLOR)
    r = param(m, unreal.MaterialExpressionScalarParameter, 'Roughness', -700, 400, 0.05 if water else 0.85)
    MEL.connect_material_property(r, '', unreal.MaterialProperty.MP_ROUGHNESS)
    mt = param(m, unreal.MaterialExpressionScalarParameter, 'Metallic', -700, 500, 0.0)
    MEL.connect_material_property(mt, '', unreal.MaterialProperty.MP_METALLIC)
    MEL.recompile_material(m); EAL.save_loaded_asset(m)
    return m

masters = {
    'plain': master('M_Web'), 'tint': master('M_WebTint', tint=True), 'both': master('M_WebTwoSided', two_sided=True),
    'tintboth': master('M_WebTintTwoSided', tint=True, two_sided=True), 'water': master('M_Water', water=True),
    'glow': master('M_WebEmissive', emissive=True),
}

def srgb(v): return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
def colour(web):
    h = (web['color'] or '#ffffff').lstrip('#'); c = [srgb(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)]
    if web.get('mapBase') and not web.get('mapIsPhoto'):
        b = [int(v) for v in web['mapBase'][4:-1].split(',')]; c = [x * srgb(y / 255) for x, y in zip(c, b)]
    return unreal.LinearColor(*c, 1.0)

made = {}
def instance(i):
    if i in made: return made[i]
    web = M[i]
    kind = 'water' if web['name'] == 'lake water' else 'glow' if web.get('emissive') else \
           ('tint' if i in tinted else 'plain') + ('both' if web.get('doubleSided') else '')
    kind = {'plainboth': 'both'}.get(kind, kind)
    name = 'MI_' + re.sub(r'[^A-Za-z0-9]+', '_', web['name']).strip('_') + f'_{i}'
    path = f'{DIR}/Web/{name}'
    # Update in place: other meshes may already reference this instance.
    mi = unreal.load_asset(path) if EAL.does_asset_exist(path) else         AT.create_asset(name, f'{DIR}/Web', unreal.MaterialInstanceConstant, unreal.MaterialInstanceConstantFactoryNew())
    MEL.set_material_instance_parent(mi, masters[kind])
    c = colour(web)
    if kind == 'water': c = unreal.LinearColor(0.012, 0.05, 0.012, 1)
    if kind == 'glow':
        h = web['emissive'].lstrip('#'); c = unreal.LinearColor(*[srgb(int(h[k:k + 2], 16) / 255) for k in (0, 2, 4)], 1)
    MEL.set_material_instance_vector_parameter_value(mi, 'Color', c)
    if kind != 'water': MEL.set_material_instance_scalar_parameter_value(mi, 'Roughness', float(web['roughness'] if web['roughness'] is not None else 0.85))
    MEL.set_material_instance_scalar_parameter_value(mi, 'Metallic', float(web['metalness'] or 0))
    EAL.save_loaded_asset(mi); made[i] = mi; return mi

def lookup(slot):
    for n in (slot, re.sub(r'\.\d{3}$', '', slot), slot.replace('_', '.'), re.sub(r'_\d{3}$', '', slot).replace('_', '.'), slot.replace('_', ' ')):
        if n in by_name: return by_name[n]
    return None

missing = set()
import sys
argv = sys.argv[1:]
PARTS = argv[argv.index('--parts') + 1].split(',') if '--parts' in argv else ['ground', 'water', 'house', 'temple', 'landscape']
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
