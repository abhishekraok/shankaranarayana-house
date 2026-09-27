"""Verify authored material import in a generated blockout or lookdev blend.

    blender -b blender/build/lookdev.blend -P blender/verify_materials.py
"""
import hashlib
import json
from pathlib import Path

import bpy
import numpy as np

build = Path(__file__).resolve().parent / 'build'
meta = json.loads((build / 'scene.json').read_text())
blob = (build / 'scene.bin').read_bytes()

def array(ref, dtype, width):
    offset, size = ref
    return np.frombuffer(blob, dtype=dtype, count=size, offset=offset).reshape(-1, width)

mapped = [m for m in meta['materials'] if m.get('proceduralMap')]
for record in mapped:
    source = record['proceduralMap']
    assert not record['mapIsPhoto'], 'Photo pixels must not enter the procedural export'
    assert hashlib.sha256((build / source['file']).read_bytes()).hexdigest() == source['sha256']
    mat = bpy.data.materials[record['name']]
    assert mat.get('authored_map'), record['name']
    images = [n.image for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image]
    assert any(Path(bpy.path.abspath(im.filepath)).name == Path(source['file']).name for im in images), record['name']
    assert mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].is_linked

# BMesh welding and triangle joining must preserve face-corner UVs. Matching
# actual (position, UV) sets detects collapsed seams and accidentally using
# one UV for a welded vertex, which would smear the risers and window paint.
checked = []
for name in ['Stage blue-white diamond stair riser', 'Adjacent building ground veranda floor',
             'Veranda window ochre horizontal reveal']:
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
print(json.dumps({'passed': True, 'mapped_materials': len(mapped), 'uv_seams_verified': checked}))
