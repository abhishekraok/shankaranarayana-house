"""Resolve calibrated material families from authored users, independent of indices."""

import math

INNER_CORRUGATED_ROOF_NAMES = {'Inner corrugated shelter roof', 'Inner blue-gray corrugated gable'}
INNER_CORRUGATED_ROOF_COLOR_GAIN = .25


def inner_corrugated_roof_family(scene):
    """Resolve the two exclusive blue-gray sheets before their native gain."""
    objects = [o for o in scene['objects'] if o['name'] in INNER_CORRUGATED_ROOF_NAMES]
    assert len(objects) == 2 and {o['name'] for o in objects} == INNER_CORRUGATED_ROOF_NAMES, \
        'Review changed inner corrugated roof users'
    assert all(len(o['materials']) == 1 for o in objects), 'Review split inner corrugated roof slots'
    indices = {o['materials'][0] for o in objects}
    assert len(indices) == 1, 'Review split inner corrugated roof family'
    index = indices.pop()
    assert type(index) is int and 0 <= index < len(scene['materials']), 'Invalid inner corrugated roof family'
    assert [o for o in scene['objects'] if index in o['materials']] == objects, \
        'Inner corrugated roof material shared elsewhere'
    signature = {'type': 'MeshStandardMaterial', 'color': '#929ea2', 'roughness': .91,
                 'metalness': 0, 'opacity': 1, 'transparent': False, 'doubleSided': True,
                 'hasMap': False, 'alphaTest': 0, 'vertexColors': False, 'mapIsPhoto': False}
    material = scene['materials'][index]
    assert all(material.get(k) == v for k, v in signature.items()), 'Recalibrate changed inner corrugated roof'
    assert all(type(material.get(k)) in (int, float) and math.isfinite(material[k])
               for k in ('roughness', 'metalness', 'opacity', 'alphaTest')), 'Invalid inner corrugated roof scalars'
    assert not any(material.get(k) for k in
                   ('emissive', 'emissiveIntensity', 'proceduralMap', 'photoMap', 'bumpMap', 'roughnessMap', 'mapBase')), \
        'Review mapped/emissive inner corrugated roof'
    assert all(not o.get('instances') and not o.get('instanceColors') and
               not scene['geometries'][o['geometry']].get('color') for o in objects), \
        'Review changed inner corrugated roof tint/instances'
    return index


WEST_BANK_ROAD_NAME = 'West bank vehicle-width brown mud road'
WEST_BANK_ROAD_MAP = '9186890a1a093d571d9ed55ffae50db9131e8a0515de4bcd23e3fee48466cc24'
WEST_BANK_ROAD_COLOR_GAIN = .5


def west_bank_road_family(scene):
    """Resolve the exclusive brown-gravel road before its native colour gain."""
    objects = [o for o in scene['objects'] if o['name'] == WEST_BANK_ROAD_NAME]
    assert len(objects) == 1 and len(objects[0]['materials']) == 1, 'Review changed west-bank road users/slots'
    index = objects[0]['materials'][0]
    assert type(index) is int and 0 <= index < len(scene['materials']), 'Invalid west-bank road family'
    users = [o for o in scene['objects'] if index in o['materials']]
    assert len(users) == 1, 'West-bank road material shared outside its source object'
    material = scene['materials'][index]
    signature = {'name': 'west bank brown gravel road', 'type': 'MeshStandardMaterial', 'color': '#ffffff',
                 'roughness': 1, 'metalness': 0, 'opacity': 1, 'transparent': False, 'doubleSided': False,
                 'hasMap': True, 'alphaTest': 0, 'vertexColors': False, 'mapIsPhoto': False,
                 'mapBase': 'rgb(134,110,88)'}
    assert all(material.get(k) == v for k, v in signature.items()), 'Recalibrate changed west-bank road properties'
    assert all(type(material.get(k)) in (int, float) and math.isfinite(material[k])
               for k in ('roughness', 'metalness', 'opacity', 'alphaTest')), 'Invalid west-bank road scalars'
    assert not any(material.get(k) for k in ('emissive', 'emissiveIntensity', 'photoMap', 'bumpMap', 'roughnessMap')), \
        'Review emissive/photo/bump/roughness-mapped west-bank road'
    map_signature = {'sha256': WEST_BANK_ROAD_MAP, 'width': 256, 'height': 256,
                     'matrix': [1, 0, 0, 0, 1, 0, 0, 0, 1], 'wrapS': 1000, 'wrapT': 1000,
                     'flipY': True, 'colorSpace': 'srgb'}
    assert all((material.get('proceduralMap') or {}).get(k) == v for k, v in map_signature.items()), \
        'Review changed west-bank road procedural map'
    obj = objects[0]
    assert not obj.get('instances') and not obj.get('instanceColors') and \
        not scene['geometries'][obj['geometry']].get('color'), 'Review west-bank road tint/instances'
    return index


REAR_PLINTH_LOTUS_NAME = 'Rear plinth continuous lotus course'
REAR_PLINTH_LOTUS_COUNT = 4
REAR_PLINTH_STONE_MAP = 'fd1772619a2f09408afae133bcbcfd9ec724f8a7e615d5a4f4a90d1614c53c7c'


def rear_plinth_lotus_families(scene):
    """Resolve four exclusive stone-sheet clones for a fill-only native trial."""
    objects = [o for o in scene['objects'] if o['name'] == REAR_PLINTH_LOTUS_NAME]
    assert len(objects) == REAR_PLINTH_LOTUS_COUNT, 'Review missing/renamed rear-plinth lotus courses'
    assert all(len(o['materials']) == 1 for o in objects), 'Review split lotus-course slots'
    indices = {o['materials'][0] for o in objects}
    assert len(indices) == REAR_PLINTH_LOTUS_COUNT, 'Review shared lotus-course clones'
    signature = {'type': 'MeshStandardMaterial', 'color': '#8f928b', 'roughness': .88,
                 'metalness': 0, 'opacity': 1, 'transparent': False, 'doubleSided': True,
                 'hasMap': True, 'mapBase': 'rgb(214,214,205)', 'mapIsPhoto': False,
                 'alphaTest': 0, 'vertexColors': False}
    map_signature = {'sha256': REAR_PLINTH_STONE_MAP, 'width': 512, 'height': 512,
                     'matrix': [1, 0, 0, 0, 1, 0, 0, 0, 1], 'wrapS': 1000, 'wrapT': 1000,
                     'flipY': True, 'colorSpace': 'srgb'}
    for index in indices:
        assert type(index) is int and 0 <= index < len(scene['materials']), 'Invalid lotus-course family'
        users = [o for o in scene['objects'] if index in o['materials']]
        assert len(users) == 1 and users[0]['name'] == REAR_PLINTH_LOTUS_NAME, \
            'Lotus-course material shared outside its exclusive source object'
        material = scene['materials'][index]
        assert all(material.get(key) == value for key, value in signature.items()), \
            'Recalibrate changed lotus-course stone properties'
        assert not any(material.get(key) for key in ('emissive', 'emissiveIntensity', 'photoMap', 'roughnessMap')), \
            'Review emissive/photo/roughness-mapped lotus-course stone'
        bump = material.get('bumpScale')
        assert type(bump) in (int, float) and math.isfinite(bump) and bump == .006, \
            'Review changed lotus-course bump scale'
        for key in ('proceduralMap', 'bumpMap'):
            record = material.get(key) or {}
            assert all(record.get(k) == value for k, value in map_signature.items()), \
                'Review changed lotus-course ' + key
        assert not users[0].get('instances') and not users[0].get('instanceColors') and \
            not scene['geometries'][users[0]['geometry']].get('color'), \
            'Review changed lotus-course tint/instances'
    return sorted(indices)

INNER_HALL_BELL_TARGETS = {
    'Inner hall hanging bronze bell': 7,
    'Inner hall hanging bronze bell crown': 7,
}


def inner_hall_bell_family(scene):
    """Require fourteen non-emissive bronze users before a native fill trial."""
    objects = [o for o in scene['objects'] if o['name'] in INNER_HALL_BELL_TARGETS]
    counts = {name: sum(o['name'] == name for o in objects) for name in INNER_HALL_BELL_TARGETS}
    assert counts == INNER_HALL_BELL_TARGETS, 'Review missing/renamed inner-hall bells'
    assert all(len(o['materials']) == 1 for o in objects), 'Review split inner-hall bell slots'
    indices = {i for o in objects for i in o['materials']}
    assert len(indices) == 1, 'Review split inner-hall bell family'
    index = indices.pop()
    users = [o for o in scene['objects'] if index in o['materials']]
    assert len(users) == len(objects) and all(o['name'] in INNER_HALL_BELL_TARGETS for o in users), \
        'Inner-hall bronze shared outside the bell bodies/crowns'
    material = scene['materials'][index]
    signature = {'type': 'MeshStandardMaterial', 'color': '#8e7656', 'roughness': .55,
                 'metalness': .55, 'opacity': 1, 'transparent': False,
                 'doubleSided': True, 'hasMap': False, 'alphaTest': 0, 'vertexColors': False}
    assert all(material.get(key) == value for key, value in signature.items()), \
        'Recalibrate changed inner-hall bronze properties'
    assert not any(material.get(key) for key in
                   ('emissive', 'emissiveIntensity', 'proceduralMap', 'photoMap', 'bumpMap', 'roughnessMap')), \
        'Review mapped/emissive inner-hall bronze'
    assert all(not o.get('instances') and not o.get('instanceColors') and
               not scene['geometries'][o['geometry']].get('color') for o in objects), \
        'Review changed inner-hall bronze tint/instances'
    return index


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
    # Since 2026-10-03 main authors the fence as a bleached slat screen in materials of its own: the
    # timber gain no longer reaches it and no native variant is needed. None tells callers to skip it.
    if not any(o['materials'] == [index] for o in scene['objects'] if o['name'] in COURTYARD_FENCE_TARGETS):
        return None
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
    if expected is None:
        assert not any(part.get('native_material_overrides') for part in parts), 'Stale native fence override'
        return {}
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
