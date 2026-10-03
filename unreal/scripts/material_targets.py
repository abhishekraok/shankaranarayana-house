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


COURTYARD_FENCE_ALIAS = 'Native_CourtyardFence_Timber'
COURTYARD_FENCE_TARGETS = {
    'Courtyard weathered horizontal timber board': 7,
    'Courtyard board fence upright': 14,
}


def courtyard_fence_override(scene):
    """Resolve the complete native-only fence variant; IDs index scene.objects."""
    index = structural_timber_family(scene)
    material = scene['materials'][index]
    assert all(m['name'] != COURTYARD_FENCE_ALIAS for m in scene['materials']), 'Native alias collides with source'
    targets, counts, triangles = [], dict.fromkeys(COURTYARD_FENCE_TARGETS, 0), 0
    for object_id, obj in enumerate(scene['objects']):
        name = obj['name']
        if name not in counts:
            continue
        assert obj['materials'] == [index], 'Review changed fence source family'
        geometry = scene['geometries'][obj['geometry']]
        assert not obj.get('instances') and not obj.get('instanceColors') and not geometry.get('color'), 'Review changed fence tint/instances'
        count = (geometry['indices'][1] if geometry.get('indices') else geometry['positions'][1] // 3) // 3
        assert count == 12, 'Review changed fence geometry'
        suffix = f'.{counts[name]:03d}' if counts[name] else ''
        targets.append({'source_object_id': object_id, 'source_object_name': name,
                        'blender_object_name': name + suffix})
        counts[name] += 1
        triangles += count
    assert counts == COURTYARD_FENCE_TARGETS and triangles == 252, 'Review incomplete/changed fence targets'
    return {'alias': COURTYARD_FENCE_ALIAS, 'source_material_index': index,
            'source_material_name': material['name'], 'objects': targets, 'triangles': triangles}


def validate_fence_manifest(scene, parts):
    """Require the exported override to cover precisely the current authored fence."""
    expected = courtyard_fence_override(scene)
    targets = {o['source_object_id']: o for o in expected['objects']}
    seen, by_part = set(), {}
    for part in parts:
        records = part.get('native_material_overrides', [])
        if not records:
            continue
        assert len(records) == 1 and part['kind'] == 'house', 'Unexpected native override'
        record = records[0]
        assert all(record[key] == expected[key] for key in
                   ('alias', 'source_material_index', 'source_material_name')), 'Stale fence source binding'
        assert record['objects'] and record['triangles'] == 12 * len(record['objects']), 'Fence triangle coverage changed'
        for obj in record['objects']:
            identity = obj['source_object_id']
            assert identity not in seen and obj == targets.get(identity), 'Duplicate/stale fence source object'
            seen.add(identity)
        by_part[part['name']] = record
    assert seen == targets.keys(), 'Re-export native meshes to include the complete fence variant'
    return by_part
