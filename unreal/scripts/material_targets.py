"""Resolve calibrated material families from authored users, independent of indices."""

def structural_timber_family(scene):
    objects = [o for o in scene['objects'] if o['name'] == 'Entrance seating square timber shaft']
    assert objects and all(len(o['materials']) == 1 for o in objects), 'Review renamed timber shafts'
    indices = {i for o in objects for i in o['materials']}
    assert len(indices) == 1, 'Review split structural timber materials'
    index = indices.pop()
    material = scene['materials'][index]
    texture = material.get('proceduralMap') or {}
    assert material['color'] == '#ffffff' and texture.get('sha256') == \
        '202f01a9ae320844ac2eaf3cb7854139290733b628f28a4987da3fde7041329f', 'Recalibrate changed timber tint/map'
    return index
