"""First look-development pass: overcast HDRI sky, scanned surface relief, bevelled
edges and occlusion grime over the blockout's own colours.

    blender -b blender/build/blockout.blend -P blender/lookdev.py

Writes blender/build/lookdev.blend. Assets come from Poly Haven (CC0) into
blender/build/assets/. Existing approved photo cards and procedural maps are preserved.
"""
import bpy, re, os, json, math, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, 'build', 'assets')
def img(name, data=False):
    im = bpy.data.images.load(os.path.join(A, name), check_existing=True)
    if data: im.colorspace_settings.name = 'Non-Color'
    return im

# Sky: an unclipped overcast dome, the flat monsoon light of every 2011 photograph.
scene = bpy.context.scene
w = scene.world; nt = w.node_tree; nt.nodes.clear()
env = nt.nodes.new('ShaderNodeTexEnvironment'); env.image = img('overcast_soil_puresky_4k.hdr')
bg = nt.nodes.new('ShaderNodeBackground'); bg.inputs['Strength'].default_value = 1.0
out = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(env.outputs['Color'], bg.inputs['Color']); nt.links.new(bg.outputs['Background'], out.inputs['Surface'])

FLOOR_WORDS = ('paving', 'pavement', 'floor', 'slab', 'platform', 'tread', 'landing', 'courtyard ground', 'walkway', 'forecourt', 'plinth top')
def is_floor_material(mat):
    names = [o.name.lower() for o in bpy.data.objects if o.type == 'MESH' and mat.name in o.data.materials]
    hits = sum(any(wd in n for wd in FLOOR_WORDS) for n in names)
    return names and hits / len(names) >= 0.5

ROOF_WORDS = ('roof', 'mangalore', 'tile course', 'ridge')
TILED = re.compile(r'til(e|ed)|mangalore', re.I); ROOFISH = re.compile(r'roof|ridge|course', re.I)
def is_tiled_roof(mat):
    # Same rule as unreal/scripts/materials.py: most users are tiled roofs, tile courses or ridges.
    names = [o.name for o in bpy.data.objects if o.type == 'MESH' and mat.name in o.data.materials]
    return names and sum(bool(TILED.search(n) and ROOFISH.search(n)) for n in names) / len(names) >= 0.5
ROOF_WEATHER = (0.30, 0.27, 0.25, 1)
def is_roof_material(mat):
    names = [o.name.lower() for o in bpy.data.objects if o.type == 'MESH' and mat.name in o.data.materials]
    return names and sum(any(wd in n for wd in ROOF_WORDS) for n in names) / len(names) >= 0.5

SETS = {
    'plaster': ('painted_plaster_wall', 0.9),
    'granite': ('granite_tile_04', 3.6),  # courtyard slabs read about 0.8-1 m in 15.03.38
}
def surface(nt, key, coord):
    stem, scale = SETS[key]
    maps = {}
    for tag, data in (('diff', False), ('rough', True), ('nor_gl', True)):
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = img(f'{stem}_{tag}_2k.jpg', data)
        t.projection = 'BOX'; t.projection_blend = 0.25
        mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1 / scale,) * 3
        nt.links.new(coord.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], t.inputs['Vector'])
        maps[tag] = t
    return maps

VEG_WORDS = ('frond', 'leaf', 'leaves', 'crown', 'palm', 'areca', 'coconut', 'grass', 'tree', 'foliage', 'bush',
             'shrub', 'plant', 'canopy', 'fern', 'balsam', 'weed', 'moss', 'undergrowth', 'stems', 'litter', 'banana')
veg_users = {}
for o in bpy.data.objects:
    if o.type == 'MESH':
        v = any(w in o.name.lower() for w in VEG_WORDS)
        for m in o.data.materials:
            if m: veg_users.setdefault(m.name, []).append(v)
def is_vegetation(mat):
    u = veg_users.get(mat.name, [])
    return bool(u) and sum(u) / len(u) >= 0.5

def hall_inlays(nt, coord, base_color):
    """Match the authored 0.70 m dark floor pattern without photo textures."""
    axes = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(coord.outputs['Object'], axes.inputs[0])
    masks = []
    # Imported mesh-local X/Z are the original three.js horizontal axes.
    for axis in ('X', 'Z'):
        value = axes.outputs[axis]
        for operation, operand in [('MULTIPLY', 1 / .70), ('FRACT', 0),
                                   ('SUBTRACT', .5), ('ABSOLUTE', 0),
                                   ('LESS_THAN', 24 / 256 / 2)]:
            node = nt.nodes.new('ShaderNodeMath'); node.operation = operation
            nt.links.new(value, node.inputs[0]); node.inputs[1].default_value = operand
            value = node.outputs[0]
        masks.append(value)
    mask = nt.nodes.new('ShaderNodeMath'); mask.operation = 'MULTIPLY'
    for i, value in enumerate(masks): nt.links.new(value, mask.inputs[i])
    mix = nt.nodes.new('ShaderNodeMixRGB'); mix.blend_type = 'MIX'
    nt.links.new(mask.outputs[0], mix.inputs[0]); nt.links.new(base_color, mix.inputs[1])
    mix.inputs[2].default_value = tuple(((c / 255 + .055) / 1.055) ** 2.4 for c in (182, 178, 160)) + (1,)
    return mix.outputs[0]

count = {'plaster': 0, 'granite': 0, 'plain': 0, 'leaf': 0}
for mat in bpy.data.materials:
    if not mat.use_nodes or 'web' not in mat or mat.name == 'lake water': continue
    web = json.loads(mat['web'])
    nt = mat.node_tree; bsdf = nt.nodes.get('Principled BSDF')
    if bsdf is None: continue
    base = tuple(bsdf.inputs['Base Color'].default_value)
    lum = 0.2126 * base[0] + 0.7152 * base[1] + 0.0722 * base[2]
    coord = nt.nodes.new('ShaderNodeTexCoord')
    # Millimetre-scale wear in shading only; retain square pillars and stepped masonry.
    # (Blender 5.2's Normal Map node has no normal input, so scanned-relief materials skip it.)
    bev = nt.nodes.new('ShaderNodeBevel'); bev.inputs['Radius'].default_value = 0.003; bev.samples = 6
    kind = 'plain'
    authored = any(mat.get(key) for key in ('authored_map', 'authored_bump', 'authored_roughness'))
    inlaid_hall = not authored and mat.name == 'Adjacent hall dark stone with pale inlays'
    if is_vegetation(mat):
        kind = 'leaf'
    elif not authored and not inlaid_hall and (web['metalness'] or 0) < 0.3 and not web['transparent']:
        kind = 'granite' if is_floor_material(mat) else ('plaster' if web['roughness'] is None or web['roughness'] > 0.5 else 'plain')
    rgb = nt.nodes.new('ShaderNodeRGB'); rgb.outputs[0].default_value = base
    col_out = rgb.outputs[0]
    if (authored or mat.get('vertex_colour')) and bsdf.inputs['Base Color'].links:
        # Keep the authored texture and per-vertex / per-instance tint chain.
        col_out = bsdf.inputs['Base Color'].links[0].from_socket
    if inlaid_hall:
        # Generic granite used to turn this explicitly dark floor pale grey.
        col_out = hall_inlays(nt, coord, col_out)
    if kind == 'leaf':
        # Thin leaves: soft sheen, a little light through them, and both sides shaded.
        bsdf.inputs['Roughness'].default_value = 0.55
        for name, val in (('Transmission Weight', 0.12), ('Subsurface Weight', 0.0)):
            if name in bsdf.inputs: bsdf.inputs[name].default_value = val
        nt.links.new(bev.outputs['Normal'], bsdf.inputs['Normal'])
        # The photos' canopy is a lush, saturated green; under the overcast world the web
        # tints read grey. Lift saturation and value a little.
        hs = nt.nodes.new('ShaderNodeHueSaturation'); hs.inputs['Saturation'].default_value = 1.4; hs.inputs['Value'].default_value = 1.1
        nt.links.new(col_out, hs.inputs['Color']); col_out = hs.outputs['Color']
    elif kind != 'plain':
        maps = surface(nt, kind, coord)
        # Keep the web colour; borrow the scan's value variation (stains, pits) around it.
        gray = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(maps['diff'].outputs['Color'], gray.inputs['Color'])
        norm = nt.nodes.new('ShaderNodeMath'); norm.operation = 'MULTIPLY'; norm.inputs[1].default_value = 2.2 if kind == 'plaster' else 1.8
        nt.links.new(gray.outputs['Val'], norm.inputs[0])
        mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 0.85
        if kind == 'granite':
            # Paving canvases were painted as dark grout with slabs drawn over it, so their
            # recorded base colour is the grout. Stone floors take the scan's own colour.
            rgb.outputs[0].default_value = (1, 1, 1, 1); norm.inputs[1].default_value = 1.0
            nt.links.remove(gray.outputs['Val'].links[0]); nt.links.new(maps['diff'].outputs['Color'], mix.inputs[7])
        # Per-vertex / per-instance colours (roof tile courses, stone batches) tint the scan too.
        nt.links.new(rgb.outputs[0] if kind == 'granite' else col_out, mix.inputs[6])
        cr = nt.nodes.new('ShaderNodeCombineColor'); [nt.links.new(norm.outputs[0], cr.inputs[i]) for i in range(3)]
        if kind != 'granite': nt.links.new(cr.outputs[0], mix.inputs[7])
        col_out = mix.outputs[2]
        nt.links.new(maps['rough'].outputs['Color'], bsdf.inputs['Roughness'])
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 0.7
        nt.links.new(maps['nor_gl'].outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    elif kind == 'plain':
        nt.links.new(bev.outputs['Normal'], bsdf.inputs['Normal'])
    if kind == 'plaster':
        # Monsoon weathering: dark vertical streaks run down from ledges, and damp rises
        # from the ground. Object-space noise stretched vertically makes the streaks.
        geo = nt.nodes.new('ShaderNodeNewGeometry')
        sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(geo.outputs['Position'], sep.inputs[0])
        streak = nt.nodes.new('ShaderNodeTexNoise'); streak.inputs['Scale'].default_value = 1.0
        streak.inputs['Detail'].default_value = 6; streak.inputs['Roughness'].default_value = 0.6
        sq = nt.nodes.new('ShaderNodeMapping'); sq.inputs['Scale'].default_value = (9, 9, 0.6)
        nt.links.new(geo.outputs['Position'], sq.inputs['Vector']); nt.links.new(sq.outputs['Vector'], streak.inputs['Vector'])
        sr = nt.nodes.new('ShaderNodeMapRange'); sr.inputs['From Min'].default_value = 0.52; sr.inputs['From Max'].default_value = 0.72
        sr.inputs['To Min'].default_value = 1.0; sr.inputs['To Max'].default_value = 0.62 if lum > 0.3 else 0.8
        nt.links.new(streak.outputs['Fac'], sr.inputs['Value'])
        damp = nt.nodes.new('ShaderNodeMapRange')  # world height: Blender Z is three.js Y
        damp.inputs['From Min'].default_value = 0.05; damp.inputs['From Max'].default_value = 0.75
        damp.inputs['To Min'].default_value = 0.72 if lum > 0.3 else 0.85; damp.inputs['To Max'].default_value = 1.0
        nt.links.new(sep.outputs['Z'], damp.inputs['Value'])
        both = nt.nodes.new('ShaderNodeMath'); both.operation = 'MULTIPLY'
        nt.links.new(sr.outputs['Result'], both.inputs[0]); nt.links.new(damp.outputs['Result'], both.inputs[1])
        wc = nt.nodes.new('ShaderNodeCombineColor'); [nt.links.new(both.outputs[0], wc.inputs[i]) for i in range(3)]
        wm = nt.nodes.new('ShaderNodeMix'); wm.data_type = 'RGBA'; wm.blend_type = 'MULTIPLY'; wm.inputs['Factor'].default_value = 1
        nt.links.new(col_out, wm.inputs[6]); nt.links.new(wc.outputs[0], wm.inputs[7]); col_out = wm.outputs[2]
    # Retain the web's height relief on top of native edge bevel shading.
    if mat.get('authored_bump'):
        bump = next(n for n in nt.nodes if n.type == 'BUMP' and n.label.startswith('Authored Three.js'))
        nt.links.new(bev.outputs['Normal'], bump.inputs['Normal'])
        nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    if kind != 'leaf' and not mat.get('authored_roughness') and is_roof_material(mat):
        # Weathered clay tile and old sheet roofs are matte: a glossy scan roughness makes
        # them mirror the overcast sky at grazing angles and read white from across the tank.
        for l in list(bsdf.inputs['Roughness'].links): nt.links.remove(l)
        bsdf.inputs['Roughness'].default_value = 0.93
        if 'Specular IOR Level' in bsdf.inputs: bsdf.inputs['Specular IOR Level'].default_value = 0.2
    if kind != 'leaf' and is_tiled_roof(mat):
        # 15.11.58 and the lake views: weathered clay tiles are dark, not the pale web tint.
        rw = nt.nodes.new('ShaderNodeMix'); rw.data_type = 'RGBA'; rw.blend_type = 'MULTIPLY'; rw.inputs['Factor'].default_value = 1
        rw.inputs[7].default_value = ROOF_WEATHER; nt.links.new(col_out, rw.inputs[6]); col_out = rw.outputs[2]
    # Grime: darken crevices and corners the way monsoon damp collects in them.
    ao = nt.nodes.new('ShaderNodeAmbientOcclusion'); ao.inputs['Distance'].default_value = 0.35; ao.samples = 8
    aoc = nt.nodes.new('ShaderNodeMapRange'); aoc.inputs['To Min'].default_value = 0.55 if lum > 0.3 else 0.8
    nt.links.new(ao.outputs['AO'], aoc.inputs['Value'])
    dirt = nt.nodes.new('ShaderNodeMix'); dirt.data_type = 'RGBA'; dirt.blend_type = 'MULTIPLY'; dirt.inputs['Factor'].default_value = 1.0
    nt.links.new(col_out, dirt.inputs[6])
    aocol = nt.nodes.new('ShaderNodeCombineColor'); [nt.links.new(aoc.outputs['Result'], aocol.inputs[i]) for i in range(3)]
    nt.links.new(aocol.outputs[0], dirt.inputs[7])
    nt.links.new(dirt.outputs[2], bsdf.inputs['Base Color'])
    count[kind] += 1

# Water: a real dielectric surface over a murky green body instead of a flat colour.
water = bpy.data.materials.get('lake water')
if water:
    b = water.node_tree.nodes['Principled BSDF']
    # Algae-laden tank water is opaque: a saturated green body under sharp reflections.
    b.inputs['Base Color'].default_value = (0.022, 0.085, 0.018, 1); b.inputs['Roughness'].default_value = 0.06
    if 'IOR' in b.inputs: b.inputs['IOR'].default_value = 1.33
    b.inputs['Specular IOR Level'].default_value = 0.5

scene.view_settings.view_transform = 'AgX'; scene.view_settings.look = 'AgX - Base Contrast'
scene.view_settings.exposure = 1.3
source = json.loads(scene.get('reconstruction_source', '{}'))
source['lookdev_sha256'] = hashlib.sha256(open(__file__, 'rb').read()).hexdigest()
scene['reconstruction_source'] = json.dumps(source)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'build', 'lookdev.blend'))
print('lookdev materials', count)
