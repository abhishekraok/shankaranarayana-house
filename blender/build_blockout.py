"""Builds blender/build/blockout.blend from the web app export and the saved photo poses.

    blender -b --factory-startup -P blender/build_blockout.py -- [--poses F:/Shankaranarayana/align-poses.json]

Everything sits under the empty "three.js world", rotated +90 degrees about X, so
three.js coordinates (metres, +Y up) and camera quaternions carry over unchanged:
Blender and three.js cameras both look down local -Z with +Y up.
"""
import bpy, bmesh, json, math, sys, os
import numpy as np
from mathutils import Matrix, Quaternion, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, 'build')
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
POSES = argv[argv.index('--poses') + 1] if '--poses' in argv else 'F:/Shankaranarayana/align-poses.json'
PHOTO_FOV = 48.0  # 2011 Samsung GT-I9003, fixed 3.43 mm lens (vertical, estimated)

meta = json.load(open(os.path.join(BUILD, 'scene.json')))
blob = open(os.path.join(BUILD, 'scene.bin'), 'rb').read()
def arr(ref, dtype):
    at, n = ref
    return np.frombuffer(blob, dtype=dtype, count=n, offset=at)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
root = bpy.data.objects.new('three.js world', None)
root.rotation_euler = (math.pi / 2, 0, 0)
scene.collection.objects.link(root)

# Materials: plain Principled BSDF placeholders carrying the web colours.
def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
mats = []
for m in meta['materials']:
    mat = bpy.data.materials.new(m['name'])
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if m['color']:
        h = m['color'].lstrip('#')
        rgb = [srgb_to_linear(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)]
        bsdf.inputs['Base Color'].default_value = (*rgb, 1)
        mat.diffuse_color = (*rgb, 1)
    if m['roughness'] is not None: bsdf.inputs['Roughness'].default_value = m['roughness']
    if m['metalness'] is not None: bsdf.inputs['Metallic'].default_value = m['metalness']
    if m['transparent'] and m['opacity'] < 1: bsdf.inputs['Alpha'].default_value = m['opacity']
    mat['web'] = json.dumps(m)
    mats.append(mat)

cols = {}
def collection(name):
    if name not in cols:
        c = bpy.data.collections.new(name); scene.collection.children.link(c); cols[name] = c
    return cols[name]

def mesh_from(gi, mat_ids, transforms=None, name='mesh'):
    g = meta['geometries'][gi]
    P = arr(g['positions'], np.float32).reshape(-1, 3)
    I = arr(g['indices'], np.uint32).reshape(-1, 3)
    groups = g['groups']
    tri_mat = np.zeros(len(I), dtype=np.int32)
    for start, count, mi in groups:
        tri_mat[start // 3:(start + count) // 3] = min(mi, len(mat_ids) - 1)
    if transforms is not None:  # realise instances into one mesh
        Ps, Is, Ms = [], [], []
        for k, T in enumerate(transforms):
            T = np.array(T, dtype=np.float64).reshape(4, 4).T
            Ps.append((np.c_[P, np.ones(len(P))] @ T.T)[:, :3]); Is.append(I + k * len(P)); Ms.append(tri_mat)
        P, I, tri_mat = np.vstack(Ps), np.vstack(Is), np.concatenate(Ms)
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(P)); me.vertices.foreach_set('co', P.astype(np.float32).ravel())
    me.loops.add(len(I) * 3); me.loops.foreach_set('vertex_index', I.astype(np.int32).ravel())
    me.polygons.add(len(I))
    me.polygons.foreach_set('loop_start', np.arange(0, len(I) * 3, 3, dtype=np.int32))
    me.polygons.foreach_set('material_index', tri_mat)
    for mi in mat_ids: me.materials.append(mats[mi])
    me.update(calc_edges=True)
    # Weld the split per-face vertices three.js uses for flat shading, then
    # rejoin triangle pairs into quads so bevels and subdivision work later.
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.join_triangles(bm, faces=bm.faces, angle_face_threshold=math.radians(1), angle_shape_threshold=math.radians(180))
    bm.to_mesh(me); bm.free()
    me.shade_smooth_by_angle(angle=math.radians(35)) if hasattr(me, 'shade_smooth_by_angle') else None
    return me

mesh_cache = {}
count = 0
for o in meta['objects']:
    col = collection(o['root'])
    if o.get('instances'):
        me = mesh_from(o['geometry'], o['materials'], o['instances'], o['name'])
        ob = bpy.data.objects.new(o['name'], me)
    else:
        key = (o['geometry'], tuple(o['materials']))
        if key not in mesh_cache: mesh_cache[key] = mesh_from(o['geometry'], o['materials'], None, o['name'])
        ob = bpy.data.objects.new(o['name'], mesh_cache[key])
        ob.matrix_world = Matrix([o['matrix'][i::4] for i in range(4)])
    ob['parents'] = ' / '.join(o['parents'])
    col.objects.link(ob); ob.parent = root
    count += 1
print(f'objects {count}, meshes {len(bpy.data.meshes)}, materials {len(mats)}')

# Photo cameras from the alignment tool, in the same three.js frame.
cams = collection('Photo cameras')
poses = json.load(open(POSES))['poses'] if os.path.exists(POSES) else []
for p in poses:
    c = p['camera']; img = p['image']; fov = c['verticalFov']
    photo_aspect = img['width'] / img['height']
    if img.get('fit') == 'cover' and p.get('viewport'):
        # Older saves: the photo covered a wider viewport, cropping its top and bottom.
        view_aspect = p['viewport']['width'] / p['viewport']['height']
        if view_aspect > photo_aspect:
            fov = math.degrees(2 * math.atan(math.tan(math.radians(fov) / 2) * view_aspect / photo_aspect))
    stem = os.path.splitext(p['filename'])[0]
    cd = bpy.data.cameras.new(stem)
    cd.sensor_fit = 'VERTICAL'; cd.angle_y = math.radians(fov); cd.clip_start = 0.05; cd.clip_end = 600
    ob = bpy.data.objects.new(stem, cd)
    ob['photo'] = p['filename']; ob['saved_fov'] = c['verticalFov']; ob['photo_fov'] = fov
    ob['aspect'] = photo_aspect; ob['notes'] = p.get('notes', ''); ob['pose_id'] = p['id']
    x, y, z, w = c['quaternion']
    ob.matrix_world = Matrix.Translation(Vector(c['position'])) @ Quaternion((w, x, y, z)).to_matrix().to_4x4()
    cams.objects.link(ob); ob.parent = root
print(f'cameras {len(poses)}')

# Overcast placeholder sky until an HDRI is added: bright, low-contrast dome.
world = bpy.data.worlds.new('Overcast'); scene.world = world; world.use_nodes = True
nt = world.node_tree; bg = nt.nodes['Background']
grad = nt.nodes.new('ShaderNodeTexGradient'); grad.gradient_type = 'LINEAR'
tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); ramp = nt.nodes.new('ShaderNodeValToRGB')
nt.links.new(tc.outputs['Generated'], sep.inputs[0])
mp = nt.nodes.new('ShaderNodeMapRange'); mp.inputs['From Min'].default_value = 0.5; mp.inputs['From Max'].default_value = 1.0
nt.links.new(sep.outputs['Z'], mp.inputs['Value']); nt.links.new(mp.outputs['Result'], ramp.inputs['Fac'])
ramp.color_ramp.elements[0].color = (0.62, 0.64, 0.63, 1); ramp.color_ramp.elements[1].color = (0.85, 0.87, 0.88, 1)
nt.links.new(ramp.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = 1.6

scene.render.engine = 'CYCLES'
scene.cycles.device = 'GPU'
scene.view_settings.view_transform = 'AgX'
out = os.path.join(BUILD, 'blockout.blend')
bpy.ops.wm.save_as_mainfile(filepath=out)
print('saved', out)
