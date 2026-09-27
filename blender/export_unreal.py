"""Exports the blockout scene for Unreal, partitioned below Nanite's section limit.

    blender -b blender/build/blockout.blend -P blender/export_unreal.py

Writes blender/build/unreal/*.glb. The glTF exporter turns Blender's Z-up back into
Y-up, so the files are in three.js world coordinates (metres); Unreal's importer then
converts to its own Z-up centimetres. Vertex colours (per-instance tints) ride along
as COLOR_0, and material names match scene.json so Unreal can rebuild each material.
"""
import bpy, bmesh, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'build', 'unreal')
os.makedirs(OUT, exist_ok=True)

for o in [o for o in bpy.data.objects if o.type == 'CAMERA']:
    bpy.data.objects.remove(o)
root = bpy.data.objects['three.js world']
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
for o in meshes:  # bake the root's +90 X into the meshes, then drop the parent
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
bpy.data.objects.remove(root)

vl = bpy.context.view_layer
PARTS = [('tank', 'landscape'), ('house', 'house'), ('temple', 'temple'), ('ground', 'ground'), ('water', 'water')]
manifest = []
for col in bpy.context.scene.collection.children:
    objs = [o for o in col.objects if o.type == 'MESH']
    if not objs: continue
    for o in vl.objects: o.select_set(False)
    for o in objs:  # shared cached meshes must be single-user before joining
        if o.data.users > 1: o.data = o.data.copy()
        o.select_set(True)
    vl.objects.active = objs[0]
    with bpy.context.temp_override(active_object=objs[0], selected_editable_objects=objs):
        bpy.ops.object.join()
    part = vl.objects.active; part.name = col.name
    # glTF writes only the active colour attribute; after a join it may not be the
    # per-instance tint 'Col', which left foliage and tinted instances white in Unreal.
    ca = part.data.color_attributes
    if 'Col' in ca:
        ca.active_color = ca['Col']; ca.render_color_index = ca.find('Col')
    for o in vl.objects: o.select_set(False)
    part.select_set(True)
    low = col.name.lower()
    short = next((v for k, v in PARTS if k in low), None) or ''.join(c for c in low if c.isascii() and c.isalnum())
    # Keep the authored triangles, UVs, tint attributes and world transform. Only
    # partition render resources: Unreal cannot build Nanite above 64 sections.
    source_faces = len(part.data.polygons)
    written_faces = 0
    for start in range(0, max(1, len(part.data.materials)), 48):
        name = short if len(part.data.materials) <= 48 else f'{short}_{start // 48:02d}'
        mesh = part.data.copy()
        bm = bmesh.new(); bm.from_mesh(mesh)
        discard = [f for f in bm.faces if not start <= f.material_index < start + 48]
        bmesh.ops.delete(bm, geom=discard, context='FACES')
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        for face in bm.faces: face.material_index -= start
        bm.to_mesh(mesh); bm.free()
        materials = list(part.data.materials)[start:start+48]
        material_indices = [p.material_index for p in mesh.polygons]
        mesh.materials.clear()
        for material in materials: mesh.materials.append(material)
        for polygon, index in zip(mesh.polygons, material_indices): polygon.material_index = index
        if not mesh.polygons:
            bpy.data.meshes.remove(mesh)
            continue
        native = bpy.data.objects.new(name, mesh)
        bpy.context.scene.collection.objects.link(native)
        native.matrix_world = part.matrix_world.copy()
        for o in vl.objects: o.select_set(False)
        native.select_set(True); vl.objects.active = native
        if 'Col' in mesh.color_attributes:
            mesh.color_attributes.active_color = mesh.color_attributes['Col']
            mesh.color_attributes.render_color_index = mesh.color_attributes.find('Col')
        path = os.path.join(OUT, name + '.glb')
        bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB',
                                  export_vertex_color='ACTIVE', export_yup=True, export_apply=True,
                                  export_materials='EXPORT', export_image_format='NONE')
        written_faces += len(mesh.polygons)
        manifest.append({'name': name, 'kind': short, 'faces': len(mesh.polygons), 'materials': len(materials)})
        print('wrote', path, len(mesh.polygons), 'faces', len(materials), 'materials')
        bpy.data.objects.remove(native, do_unlink=True)
    assert written_faces == source_faces, (short, source_faces, written_faces)
json.dump(manifest, open(os.path.join(OUT, 'parts.json'), 'w'), indent=2)
