"""Verify authored material import in a generated blockout or lookdev blend.

    blender -b blender/build/lookdev.blend -P blender/verify_materials.py
"""
import hashlib
import json
import re
from pathlib import Path

import bpy
import numpy as np

build = Path(__file__).resolve().parent / 'build'
meta = json.loads((build / 'scene.json').read_text())
blob = (build / 'scene.bin').read_bytes()

def array(ref, dtype, width):
    offset, size = ref
    return np.frombuffer(blob, dtype=dtype, count=size, offset=offset).reshape(-1, width)

repo = build.parents[1]
approved = {line[2:] for line in (repo / '.gitignore').read_text().splitlines()
            if re.fullmatch(r'!/dist/assets/[\w-]+\.(jpg|jpeg|png)', line, re.IGNORECASE)}
mapped = [m for m in meta['materials'] if m.get('proceduralMap') or m.get('photoMap')]
photo_count = 0
for record in mapped:
    source = record.get('proceduralMap') or record['photoMap']
    if record.get('photoMap'):
        photo_count += 1
        assert record['mapIsPhoto'] and source['sourceFile'] in approved
        assert hashlib.sha256((repo / source['sourceFile']).read_bytes()).hexdigest() == source['sha256']
    else:
        assert not record['mapIsPhoto'], 'Photo pixels must not enter the procedural export'
    assert hashlib.sha256((build / source['file']).read_bytes()).hexdigest() == source['sha256']
    mat = bpy.data.materials[record['name']]
    assert mat.get('authored_map'), record['name']
    images = [n.image for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image]
    assert any(Path(bpy.path.abspath(im.filepath)).name == Path(source['file']).name for im in images), record['name']
    assert mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].is_linked

scalar_counts = {'bumpMap': 0, 'roughnessMap': 0}
for record in meta['materials']:
    mat = bpy.data.materials[record['name']]
    bsdf = mat.node_tree.nodes['Principled BSDF']
    for key, socket in [('bumpMap', 'Normal'), ('roughnessMap', 'Roughness')]:
        source = record.get(key)
        if not source: continue
        scalar_counts[key] += 1
        assert hashlib.sha256((build / source['file']).read_bytes()).hexdigest() == source['sha256']
        if source.get('sourceFile'): assert source['sourceFile'] in approved
        expected_space = 'sRGB' if source['colorSpace'] == 'srgb' else 'Non-Color'
        assert any(n.type == 'TEX_IMAGE' and n.image and
                   Path(bpy.path.abspath(n.image.filepath)).name == Path(source['file']).name and
                   n.image.colorspace_settings.name == expected_space for n in mat.node_tree.nodes)
        assert bsdf.inputs[socket].is_linked, (record['name'], key)
        upstream = bsdf.inputs[socket].links[0].from_node
        if key == 'bumpMap':
            assert mat.get('authored_bump') and upstream.type == 'BUMP'
            assert abs(upstream.inputs['Distance'].default_value - abs(record['bumpScale'])) < 1e-7
            assert upstream.inputs['Height'].links[0].from_socket.name == 'Red'
        else:
            assert mat.get('authored_roughness') and upstream.type == 'MATH' and upstream.operation == 'MULTIPLY'
            assert upstream.inputs[0].links[0].from_socket.name == 'Green'
            assert abs(upstream.inputs[1].default_value - record['roughness']) < 1e-7

# BMesh welding and triangle joining must preserve face-corner UVs. Matching
# actual (position, UV) sets detects collapsed seams and accidentally using
# one UV for a welded vertex, which would smear the risers and window paint.
checked = []
for name in ['Stage blue-white diamond stair riser', 'Adjacent building ground veranda floor',
             'Veranda window ochre horizontal reveal', 'Stage lower left photographed figure']:
    record = next(o for o in meta['objects'] if o['name'] == name and not o.get('instances'))
    geometry = meta['geometries'][record['geometry']]
    positions = array(geometry['positions'], np.float32, 3)
    uvs = array(geometry['uv'], np.float32, 2)
    indices = array(geometry['indices'], np.uint32, 1).ravel()
    expected = {tuple(round(float(v), 5) for v in (*positions[i], *uvs[i])) for i in indices}
    mesh = bpy.data.objects[name].data
    assert mesh.uv_layers.active is not None, name
    actual = {tuple(round(float(v), 5) for v in (*mesh.vertices[loop.vertex_index].co,
              *mesh.uv_layers.active.data[loop.index].uv)) for loop in mesh.loops}
    assert actual == expected, f'UV seams changed: {name}'
    checked.append(name)

assert len(mapped) > 0
print(json.dumps({'passed': True, 'mapped_materials': len(mapped), 'photo_materials': photo_count,
                  'scalar_maps': scalar_counts, 'uv_seams_verified': checked}))
