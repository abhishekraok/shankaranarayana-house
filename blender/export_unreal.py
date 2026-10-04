"""Export blockout render resources below Nanite's material-section limit.

    blender -b blender/build/blockout.blend -P blender/export_unreal.py
    blender -b blender/build/blockout.blend -P blender/export_unreal.py -- \
        --partition-buildings --cell-size 8 --out blender/build/unreal-partitioned
    blender -b blender/build/blockout.blend -P blender/export_unreal.py -- --legacy-buildings

House/temple objects are grouped by role and horizontal world cell before joining.
Original triangles and source corner normals are preserved and audited in both the
default and legacy-building paths. Neither clips or moves source geometry. Explicit
diagnostic flags require a separate ignored output directory. glTF converts Blender
Z-up metres to three.js Y-up; Unreal converts back to Z-up centimetres. All paths
retain the existing 48-material resource split and unchanged nonbuilding exports.
"""
import argparse
import bisect
import hashlib
import json
import math
import os
import re
import sys

import bpy
import bmesh
import numpy as np
from mathutils import Vector


HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'unreal', 'scripts'))
from material_targets import courtyard_fence_override
PARTS = [('tank', 'landscape'), ('house', 'house'), ('temple', 'temple'),
         ('ground', 'ground'), ('water', 'water')]
FACE_ID = '_unreal_partition_source_face'
WORLD_NORMAL = '_unreal_partition_world_normal'
POSITION_TOLERANCE = 1e-5  # metres: joining applies float32 object transforms
ATTRIBUTE_TOLERANCE = 1e-6
NORMAL_TOLERANCE = 1e-3  # component and angular-radian bound for independent GLB readback


def parse_args(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    grouping = parser.add_mutually_exclusive_group()
    grouping.add_argument('--partition-buildings', action='store_true',
                          help='Explicit partition diagnostic; requires a separate --out directory')
    grouping.add_argument('--legacy-buildings', action='store_true',
                          help='Use the former material-only building groups, retaining source normals and audits')
    parser.add_argument('--freeze-triangles', action='store_true',
                        help='Legacy control diagnostic (compatibility flag); requires separate --out. Triangles are always preserved')
    parser.add_argument('--cell-size', type=float, default=8.0, help='Horizontal cell size in metres')
    parser.add_argument('--out', default=os.path.join(HERE, 'build', 'unreal'))
    args = parser.parse_args(argv)
    if not math.isfinite(args.cell_size) or args.cell_size <= 0:
        parser.error('--cell-size must be finite and positive')
    # Keep the protection on old explicit diagnostic invocations, while allowing
    # the accepted ordinary export to write the canonical production directory.
    args.diagnostic = args.partition_buildings or args.freeze_triangles
    args.partition_buildings = not args.legacy_buildings and (not args.freeze_triangles or args.partition_buildings)
    return args


def building_role(name, parents=''):
    """Named authored surfaces take precedence over their containing roof group."""
    def classify(text):
        # A ceiling fan or roof lamp is a prop; a ceiling bearer is a support.
        if re.search(r'\b(fan|lamp|chair|bench|table|cabinet|drum|picture|clock(?![- ]side))\b', text):
            return 'props'
        if re.search(r'\b(pillars?|columns?|piers?|posts?|supports?|beams?|crossbeam|bearer|lintel|walls?|gable|arch|'
                     r'doors?|doorway|jamb|window|shutter|grille|parapet|baluster|rail|railing|brace|bracket|fence|corbel)\b', text):
            return 'walls_supports'
        if re.search(r'\b(ceiling|lining|soffit|underside)\b', text):
            return 'ceilings'
        if re.search(r'\b(floors?|paving|platform|ground|soil|plinth|passage|stair|tread|landing|court pocket|sitting bay|rear veranda)\b', text):
            return 'floors'
        if re.search(r'\b(roofs?|awning|tiles?|ridge|rafter|fascia|corrugated sheet)\b', text):
            return 'roofs'
        return None
    return classify(name.lower()) or classify(parents.lower()) or 'props'


def cell_suffix(x, y):
    def signed(value):
        return ('m' if value < 0 else 'p') + str(abs(value))
    return 'x' + signed(x) + '_y' + signed(y)


def object_bounds(obj):
    points = np.asarray([tuple(obj.matrix_world @ Vector(c)) for c in obj.bound_box], dtype=np.float64)
    return points.min(axis=0), points.max(axis=0)


def verify_provenance():
    saved = bpy.context.scene.get('reconstruction_source')
    try:
        saved = json.loads(saved) if saved else {}
    except (TypeError, ValueError):
        saved = {}
    if not isinstance(saved, dict):
        saved = {}
    mismatches = []
    for filename, field in (('scene.json', 'scene_json_sha256'), ('scene.bin', 'scene_bin_sha256')):
        path = os.path.join(HERE, 'build', filename)
        expected = saved.get(field)
        actual = hashlib.sha256(open(path, 'rb').read()).hexdigest() if os.path.isfile(path) else None
        if not expected or actual != expected:
            mismatches.append(filename)
    if mismatches:
        raise RuntimeError('Missing/stale blockout provenance for ' + ', '.join(mismatches) +
                           '; rebuild blockout.blend with blender/build_blockout.py before exporting')
    return saved


def prepare_native_material_override():
    """Validate source identities before destructive joins; never save this blend."""
    with open(os.path.join(HERE, 'build', 'scene.json'), encoding='utf-8') as handle:
        scene = json.load(handle)
    override = courtyard_fence_override(scene)
    if override is None:  # the fence has materials of its own on main: nothing to alias
        return None
    expected = {target['blender_object_name'] for target in override['objects']}
    source_names = {target['source_object_name'] for target in override['objects']}
    actual = {obj.name for obj in bpy.data.objects if obj.type == 'MESH'
              and re.sub(r'\.\d{3}$', '', obj.name) in source_names}
    if actual != expected:
        raise RuntimeError('Incomplete or renamed Blender courtyard fence targets')
    source = bpy.data.materials.get(override['source_material_name'])
    if source is None or bpy.data.materials.get(override['alias']) is not None:
        raise RuntimeError('Missing source material or existing native fence alias')
    for target in override['objects']:
        obj = bpy.data.objects[target['blender_object_name']]
        authored = scene['objects'][target['source_object_id']]
        matrix = np.asarray(authored['matrix']).reshape(4, 4).T
        if not np.allclose(np.asarray(obj.matrix_local), matrix, atol=1e-6, rtol=0):
            raise RuntimeError(f'Fence source identity/transform changed: {obj.name}')
        if list(obj.data.materials) != [source] or any(slot.link != 'DATA' for slot in obj.material_slots):
            raise RuntimeError(f'Fence source material changed: {obj.name}')
        obj.data.calc_loop_triangles()
        if len(obj.data.loop_triangles) != 12 or any(p.material_index != 0 for p in obj.data.polygons):
            raise RuntimeError(f'Fence source faces changed: {obj.name}')
    alias = source.copy()  # identical Blender material; Unreal owns the variant gain
    alias.name = override['alias']
    return override


def override_records(override, targets, triangles):
    if not targets:
        return []
    return [{**{key: override[key] for key in ('alias', 'source_material_index', 'source_material_name')},
             'objects': targets, 'triangles': triangles}]


def preserve_corner_normals(obj):
    mesh = obj.data
    if WORLD_NORMAL in mesh.attributes:
        raise RuntimeError(f'Reserved normal attribute already exists: {obj.name}')
    values = np.empty(len(mesh.loops) * 3, dtype=np.float64)
    mesh.corner_normals.foreach_get('vector', values)
    world = values.reshape(-1, 3) @ np.linalg.inv(np.asarray(obj.matrix_world, dtype=np.float64)[:3, :3])
    lengths = np.linalg.norm(world, axis=1, keepdims=True)
    # A zero normal has no authored direction (degenerate source face). Store a
    # stable unit direction instead of letting joined-mesh auto normals choose it.
    zero = lengths[:, 0] < 1e-20
    world[zero] = (0, 0, 1)
    world[~zero] /= lengths[~zero]
    attr = mesh.attributes.new(name=WORLD_NORMAL, type='FLOAT_VECTOR', domain='CORNER')
    attr.data.foreach_set('vector', world.astype(np.float32).ravel())
    return int(np.count_nonzero(zero))


def install_normal_export_hook():
    """Read audited float3 directions directly; Blender's packed normals lose bits.

    This process-local Blender 5.2 glTF collector hook never changes installed code.
    Only audited unit-basis building meshes with our temporary attribute use it.
    The ordinary collector still handles nonbuilding exports. Serialized
    GLB readback independently checks the resulting NORMAL stream.
    """
    from io_scene_gltf2.blender.exp.primitive_extract import PrimitiveCreator
    if getattr(PrimitiveCreator, '_unreal_source_normal_hook', False):
        return
    original = getattr(PrimitiveCreator, '_PrimitiveCreator__get_normals', None)
    if not callable(original):
        raise RuntimeError('Blender glTF normal collector changed; review source-normal export hook')
    def get_source_normals(creator):
        attr = creator.blender_mesh.attributes.get(WORLD_NORMAL)
        if attr is None:
            return original(creator)
        if creator.armature or (creator.use_morph_normals and creator.key_blocks):
            raise RuntimeError('Source-normal hook supports only static render meshes')
        if creator.blender_object is not None and not np.allclose(np.asarray(creator.blender_object.matrix_world), np.eye(4), atol=1e-7, rtol=0):
            raise RuntimeError('Source-normal hook requires the audited unit world basis')
        values = np.empty(len(creator.blender_mesh.loops) * 3, dtype=np.float32)
        attr.data.foreach_get('vector', values)
        creator.normals = values.reshape(-1, 3)
        PrimitiveCreator.normalize_vecs(creator.normals)
        creator.morph_normals = []
        if creator.export_settings['gltf_yup']:
            PrimitiveCreator.zup2yup(creator.normals)
    setattr(PrimitiveCreator, '_PrimitiveCreator__get_normals', get_source_normals)
    PrimitiveCreator._unreal_source_normal_hook = True


def snapshot(obj):
    """Compact arrays remain valid after Blender destroys the joined source objects."""
    mesh = obj.data
    co = np.empty(len(mesh.vertices) * 3, dtype=np.float64)
    mesh.vertices.foreach_get('co', co)
    matrix = np.asarray(obj.matrix_world, dtype=np.float64)
    world = co.reshape(-1, 3) @ matrix[:3, :3].T + matrix[:3, 3]
    loops = np.empty(len(mesh.loops), dtype=np.int32)
    mesh.loops.foreach_get('vertex_index', loops)
    starts = np.empty(len(mesh.polygons), dtype=np.int32)
    totals = np.empty(len(mesh.polygons), dtype=np.int32)
    materials = np.empty(len(mesh.polygons), dtype=np.int32)
    smooth = np.empty(len(mesh.polygons), dtype=bool)
    mesh.polygons.foreach_get('loop_start', starts)
    mesh.polygons.foreach_get('loop_total', totals)
    mesh.polygons.foreach_get('material_index', materials)
    mesh.polygons.foreach_get('use_smooth', smooth)
    uvs = {}
    for layer in mesh.uv_layers:
        values = np.empty(len(mesh.loops) * 2, dtype=np.float64)
        layer.data.foreach_get('uv', values)
        uvs[layer.name] = values.reshape(-1, 2)
    colors = {}
    for attr in mesh.color_attributes:
        if attr.domain not in ('POINT', 'CORNER'):
            raise RuntimeError(f'Unsupported color domain: {obj.name}/{attr.name}/{attr.domain}')
        values = np.empty(len(attr.data) * 4, dtype=np.float64)
        attr.data.foreach_get('color', values)
        colors[attr.name] = values.reshape(-1, 4)[loops] if attr.domain == 'POINT' else values.reshape(-1, 4)
    normals = {}
    if WORLD_NORMAL in mesh.attributes:
        values = np.empty(len(mesh.loops) * 3, dtype=np.float64)
        mesh.attributes[WORLD_NORMAL].data.foreach_get('vector', values)
        normals[WORLD_NORMAL] = values.reshape(-1, 3)
    mesh.calc_loop_triangles()
    tri_loops = np.empty(len(mesh.loop_triangles) * 3, dtype=np.int32)
    tri_faces = np.empty(len(mesh.loop_triangles), dtype=np.int32)
    mesh.loop_triangles.foreach_get('loops', tri_loops)
    mesh.loop_triangles.foreach_get('polygon_index', tri_faces)
    # Group triangles explicitly; no reliance on Blender's tessellation ordering.
    order = np.argsort(tri_faces, kind='stable')
    tri_loops = tri_loops.reshape(-1, 3)[order]
    tri_counts = np.bincount(tri_faces, minlength=len(mesh.polygons))
    tri_offsets = np.r_[0, np.cumsum(tri_counts)]
    return {'name': obj.name, 'world': world, 'loops': loops, 'starts': starts,
            'totals': totals, 'materials': materials, 'smooth': smooth,
            'material_names': [m.name if m else None for m in mesh.materials],
            'uvs': uvs, 'colors': colors, 'normals': normals, 'tri_loops': tri_loops,
            'tri_offsets': tri_offsets, 'triangles': len(mesh.loop_triangles)}


def triangles_for_face(record, face, shift=0):
    begin, end = record['tri_offsets'][face:face + 2]
    triangles = record['tri_loops'][begin:end] - record['starts'][face]
    triangles = (triangles - shift) % record['totals'][face]
    # Cyclic triangle corner rotations preserve winding; reversal is not allowed.
    canonical = []
    for tri in triangles:
        canonical.append(min(tuple(np.roll(tri, n)) for n in range(3)))
    return sorted(canonical)


def freeze_triangles(obj):
    """Keep the original calc_loop_triangles, including degenerate triangles.

    Float transform rounding during join can change a planar quad's diagonal.
    Explicit faces avoid that ambiguity. Copy original shading and loop data,
    then independently verify the frozen corners and attributes before any join.
    """
    before = snapshot(obj)
    expected = before['tri_loops']
    faces = np.repeat(np.arange(len(before['starts'])), np.diff(before['tri_offsets']))
    mesh = obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.faces.ensure_lookup_table()
    identity_name = '_unreal_frozen_triangle'
    if identity_name in mesh.attributes:
        bm.free()
        raise RuntimeError(f'Reserved freeze attribute already exists: {obj.name}')
    identity = bm.faces.layers.int.new(identity_name)
    original_faces = list(bm.faces)
    for face_index, face in enumerate(original_faces):
        start = int(before['starts'][face_index])
        face_loops = list(face.loops)
        original_vertices = before['loops'][start:start + len(face_loops)]
        if [loop.vert.index for loop in face_loops] != original_vertices.tolist():
            bm.free()
            raise RuntimeError(f'BMesh changed source loop order: {obj.name}/{face_index}')
        begin, end = before['tri_offsets'][face_index:face_index + 2]
        if len(face_loops) == 3:
            face[identity] = int(begin) + 1
            continue
        for triangle_index in range(int(begin), int(end)):
            corners = [face_loops[int(loop) - start] for loop in expected[triangle_index]]
            triangle = bm.faces.new([loop.vert for loop in corners])
            triangle.material_index = face.material_index
            triangle.smooth = face.smooth
            triangle[identity] = triangle_index + 1
            for target, source in zip(triangle.loops, corners):
                target.copy_from(source)
        bm.faces.remove(face)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    after = snapshot(obj)
    ids = np.empty(len(mesh.polygons), dtype=np.int32)
    mesh.attributes[identity_name].data.foreach_get('value', ids)
    if len(ids) != len(expected) or not np.array_equal(np.sort(ids), np.arange(1, len(expected) + 1)):
        raise RuntimeError(f'Source triangles lost/duplicated during freeze: {obj.name}')
    if not np.all(after['totals'] == 3):
        raise RuntimeError(f'Non-triangle survived freeze: {obj.name}')
    order = np.argsort(ids)
    actual_loops = (after['starts'][:, None] + np.arange(3))[order]
    left = before['world'][before['loops'][expected]]
    right = after['world'][after['loops'][actual_loops]]
    errors = np.stack([np.max(np.abs(left - np.roll(right, -shift, axis=1)), axis=(1, 2)) for shift in range(3)])
    shifts = np.argmin(errors, axis=0)
    if np.any(errors[shifts, np.arange(len(expected))] > POSITION_TOLERANCE):
        raise RuntimeError(f'Source triangle positions/winding changed during freeze: {obj.name}')
    rotated_loops = np.take_along_axis(actual_loops, (np.arange(3)[None, :] + shifts[:, None]) % 3, axis=1)
    if not np.array_equal(before['materials'][faces], after['materials'][order]):
        raise RuntimeError(f'Material binding changed during freeze: {obj.name}')
    if not np.array_equal(before['smooth'][faces], after['smooth'][order]):
        raise RuntimeError(f'Shading flags changed during freeze: {obj.name}')
    for field in ('uvs', 'colors', 'normals'):
        for name, values in before[field].items():
            if name not in after[field] or np.max(np.abs(values[expected] - after[field][name][rotated_loops]), initial=0) > ATTRIBUTE_TOLERANCE:
                raise RuntimeError(f'{field}/{name} changed during freeze: {obj.name}')
    mesh.attributes.remove(mesh.attributes[identity_name])
    return len(before['starts'])


class ConservationAudit:
    """Per-source-face identity, winding, tessellation, material, UV and tint audit."""
    def __init__(self, objects, override=None):
        self.override = override
        self.targets = {target['blender_object_name']: target for target in (override or {}).get('objects', [])}
        self.alias_triangles = 0
        self.last_overrides = []
        self.sources = []
        self.offsets = [0]
        for obj in objects:
            record = snapshot(obj)
            self.sources.append(record)
            begin = self.offsets[-1]
            count = len(record['starts'])
            if FACE_ID in obj.data.attributes:
                raise RuntimeError(f'Reserved audit attribute already exists: {obj.name}/{FACE_ID}')
            ids = obj.data.attributes.new(name=FACE_ID, type='INT', domain='FACE')
            ids.data.foreach_set('value', np.arange(begin + 1, begin + count + 1, dtype=np.int32))
            self.offsets.append(begin + count)
        self.seen = np.zeros(self.offsets[-1], dtype=bool)
        self.render_triangles = 0
        self.errors = {'position': 0.0, 'uv': 0.0, 'color': 0.0,
                       'normal_attribute': 0.0}

    def verify(self, native):
        actual = snapshot(native)
        attr = native.data.attributes.get(FACE_ID)
        if attr is None:
            raise RuntimeError(f'Source face identities were lost: {native.name}')
        ids = np.empty(len(native.data.polygons), dtype=np.int32)
        attr.data.foreach_get('value', ids)
        if np.any(ids < 1) or np.any(ids > len(self.seen)) or len(np.unique(ids)) != len(ids):
            raise RuntimeError(f'Invalid or duplicate source face identities: {native.name}')
        if np.any(self.seen[ids - 1]):
            raise RuntimeError(f'A source face was exported more than once: {native.name}')
        remapped_targets, remapped_triangles = {}, 0
        for face, identity in enumerate(ids):
            index = int(identity) - 1
            source_index = bisect.bisect_right(self.offsets, index) - 1
            source = self.sources[source_index]
            original = index - self.offsets[source_index]
            begin = int(source['starts'][original])
            count = int(source['totals'][original])
            now = int(actual['starts'][face])
            if count != actual['totals'][face]:
                raise RuntimeError(f'Face corners changed: {native.name}/{identity}')
            before_positions = source['world'][source['loops'][begin:begin + count]]
            after_positions = actual['world'][actual['loops'][now:now + count]]
            shift = 0
            error = np.max(np.abs(before_positions - after_positions), initial=0)
            if error > POSITION_TOLERANCE:
                options = [(np.max(np.abs(before_positions - np.roll(after_positions, -n, axis=0)), initial=0), n)
                           for n in range(count)]
                error, shift = min(options)
            if error > POSITION_TOLERANCE:
                raise RuntimeError(f'World positions or winding changed: {native.name}/{identity}, error={error}')
            self.errors['position'] = max(self.errors['position'], float(error))
            source_material = source['material_names'][source['materials'][original]] if source['material_names'] else None
            actual_material = actual['material_names'][actual['materials'][face]] if actual['material_names'] else None
            target = self.targets.get(source['name'])
            expected_material = source_material
            if target is not None:
                if source_material != self.override['source_material_name']:
                    raise RuntimeError(f'Unexpected fence source material: {source["name"]}')
                expected_material = self.override['alias']
                remapped_targets[source['name']] = target
                remapped_triangles += int(np.diff(source['tri_offsets'][original:original + 2])[0])
            if expected_material != actual_material:
                raise RuntimeError(f'Material binding changed: {native.name}/{identity}')
            if source['smooth'][original] != actual['smooth'][face]:
                raise RuntimeError(f'Face shading mode changed: {native.name}/{identity}')
            if triangles_for_face(source, original) != triangles_for_face(actual, face, shift):
                raise RuntimeError(f'Triangle tessellation changed: {native.name}/{identity}')
            for field, key in (('uvs', 'uv'), ('colors', 'color'), ('normals', 'normal_attribute')):
                for name, values in source[field].items():
                    if name not in actual[field]:
                        raise RuntimeError(f'{field} layer lost: {native.name}/{identity}/{name}')
                    before_values = values[begin:begin + count]
                    after_values = np.roll(actual[field][name][now:now + count], -shift, axis=0)
                    error = float(np.max(np.abs(before_values - after_values), initial=0))
                    if error > ATTRIBUTE_TOLERANCE:
                        raise RuntimeError(f'{field} changed: {native.name}/{identity}/{name}, error={error}')
                    self.errors[key] = max(self.errors[key], error)
        self.alias_triangles += remapped_triangles
        self.last_overrides = override_records(self.override, list(remapped_targets.values()), remapped_triangles)
        self.seen[ids - 1] = True
        self.render_triangles += actual['triangles']
        native.data.attributes.remove(attr)  # audit metadata must not enter GLB
        return actual['triangles']

    def report(self):
        if not np.all(self.seen):
            raise RuntimeError(f'{int(np.count_nonzero(~self.seen))} source faces were not exported')
        source_triangles = sum(record['triangles'] for record in self.sources)
        if source_triangles != self.render_triangles:
            raise RuntimeError(f'Triangle count changed: {source_triangles} -> {self.render_triangles}')
        return {'verified': True, 'stage': 'Blender meshes before GLB serialization',
                'source_objects': len(self.sources), 'source_faces': len(self.seen),
                'render_faces': int(np.count_nonzero(self.seen)), 'source_triangles': source_triangles,
                'render_triangles': self.render_triangles,
                'native_material_overrides': override_records(self.override,
                    [self.targets[r['name']] for r in self.sources if r['name'] in self.targets], self.alias_triangles),
                'face_identity_sha256': hashlib.sha256(np.arange(1, len(self.seen) + 1, dtype='<i4').tobytes()).hexdigest(),
                'position_tolerance_metres': POSITION_TOLERANCE,
                'attribute_tolerance': ATTRIBUTE_TOLERANCE, 'maximum_errors': self.errors,
                'serialized_world_normal_tolerance': NORMAL_TOLERANCE,
                'normal_tolerance_units': 'maximum component difference and maximum angular radians',
                'normal_note': 'Audited source float3 read directly by GLB collector; serialized proof required',
                'checks': ['each source face exactly once', 'world corner positions and winding',
                           'triangle connectivity', 'material binding', 'face smooth/flat shading',
                           'all authored UV and color layers', 'stored source world corner normals'],
                'objects': [record['name'] for record in self.sources]}


def set_active_color(mesh):
    if 'Col' in mesh.color_attributes:
        mesh.color_attributes.active_color = mesh.color_attributes['Col']
        mesh.color_attributes.render_color_index = mesh.color_attributes.find('Col')


def deselect(vl):
    for obj in vl.objects:
        obj.select_set(False)


def export_bucket(objects, name, kind, out, vl, audit=None, joined_name=None, override=None):
    deselect(vl)
    for obj in objects:
        if obj.data.users > 1:
            obj.data = obj.data.copy()
        obj.select_set(True)
    if audit is not None:
        install_normal_export_hook()
        audit['undefined_source_normal_corners'] = sum(preserve_corner_normals(obj) for obj in objects)
        no_uv = [obj for obj in objects if not obj.data.uv_layers]
        audit['source_objects_without_uv'] = [obj.name for obj in no_uv]
        for obj in no_uv:
            layer = obj.data.uv_layers.new(name='UVMap', do_init=False)
            layer.data.foreach_set('uv', np.zeros(len(obj.data.loops) * 2, dtype=np.float32))
        audit['source_pre_freeze_faces'] = sum(freeze_triangles(obj) for obj in objects)
    # Source identity attributes must be added only after meshes become single-user.
    conservation = ConservationAudit(objects, override) if audit is not None else None
    targets = {target['blender_object_name'] for target in (override or {}).get('objects', [])}
    for obj in objects:
        if obj.name in targets:
            if conservation is None:
                raise RuntimeError('Native fence override requires conservation audit')
            obj.data.materials[0] = bpy.data.materials[override['alias']]
    vl.objects.active = objects[0]
    if len(objects) > 1:
        with bpy.context.temp_override(active_object=objects[0], selected_editable_objects=objects):
            bpy.ops.object.join()
    part = vl.objects.active
    # Preserve the legacy joined-object name in the legacy-building path. Partitioned
    # source objects use another name so the exported native node has no .001 suffix.
    part.name = joined_name or name + '_joined'
    if conservation:
        # A joined object's arbitrary active-source scale amplifies Blender's
        # packed custom-normal error. Use a unit render-resource basis; the audit
        # below still compares original world corners, winding and attributes.
        values = np.empty(len(part.data.vertices) * 3, dtype=np.float64)
        part.data.vertices.foreach_get('co', values)
        matrix = np.asarray(part.matrix_world, dtype=np.float64)
        values = values.reshape(-1, 3) @ matrix[:3, :3].T + matrix[:3, 3]
        part.data.vertices.foreach_set('co', values.astype(np.float32).ravel())
        identity = part.matrix_world.copy()
        identity.identity()
        part.matrix_world = identity
        part.data.update()
        audit['export_basis'] = 'Blender world coordinates; identity object matrix before glTF axis conversion'
    set_active_color(part.data)
    source_faces = len(part.data.polygons)
    written_faces = 0
    entries = []
    for start in range(0, max(1, len(part.data.materials)), 48):
        native_name = name if len(part.data.materials) <= 48 else f'{name}_{start // 48:02d}'
        mesh = part.data.copy()
        bm = bmesh.new()
        bm.from_mesh(mesh)
        discard = [f for f in bm.faces if not start <= f.material_index < start + 48]
        bmesh.ops.delete(bm, geom=discard, context='FACES')
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        for face in bm.faces:
            face.material_index -= start
        bm.to_mesh(mesh)
        bm.free()
        materials = list(part.data.materials)[start:start + 48]
        indices = [p.material_index for p in mesh.polygons]
        mesh.materials.clear()
        for material in materials:
            mesh.materials.append(material)
        for polygon, index in zip(mesh.polygons, indices):
            polygon.material_index = index
        if not mesh.polygons:
            bpy.data.meshes.remove(mesh)
            continue
        native = bpy.data.objects.new(native_name, mesh)
        bpy.context.scene.collection.objects.link(native)
        native.matrix_world = part.matrix_world.copy()
        deselect(vl)
        native.select_set(True)
        vl.objects.active = native
        set_active_color(mesh)
        triangles = conservation.verify(native) if conservation else None
        path = os.path.join(out, native_name + '.glb')
        if conservation and not np.allclose(np.asarray(native.matrix_world), np.eye(4), atol=1e-7, rtol=0):
            raise RuntimeError(f'Source-normal export requires unit object basis: {native.name}')
        bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB',
                                  export_vertex_color='ACTIVE', export_yup=True, export_apply=True,
                                  export_materials='EXPORT', export_image_format='NONE')
        if conservation:
            mesh.attributes.remove(mesh.attributes[WORLD_NORMAL])
        written_faces += len(mesh.polygons)
        entry = {'name': native_name, 'kind': kind, 'faces': len(mesh.polygons), 'materials': len(materials)}
        if audit is not None:
            entry.update({'bucket': name, 'role': audit['role'], 'cell_xy': audit['cell_xy'],
                          'triangles': triangles,
                          'native_material_overrides': conservation.last_overrides})
        entries.append(entry)
        print('wrote', path, len(mesh.polygons), 'faces', len(materials), 'materials')
        bpy.data.objects.remove(native, do_unlink=True)
        if conservation:
            bpy.data.meshes.remove(mesh)
    if written_faces != source_faces:
        raise RuntimeError(f'Face count changed in {name}: {source_faces} -> {written_faces}')
    if conservation:
        audit.update(conservation.report())
        audit['parts'] = [entry['name'] for entry in entries]
    return entries


def main(argv):
    args = parse_args(argv)
    provenance = verify_provenance()  # before output creation, unparenting or joins
    override = prepare_native_material_override()
    out = os.path.realpath(args.out)
    build_root = os.path.realpath(os.path.join(HERE, 'build'))
    default_out = os.path.realpath(os.path.join(build_root, 'unreal'))
    if args.diagnostic:
        try:
            inside_build = os.path.normcase(os.path.commonpath([build_root, out])) == os.path.normcase(build_root)
        except ValueError:
            inside_build = False
        if not inside_build or os.path.normcase(out) in (os.path.normcase(default_out), os.path.normcase(build_root)):
            raise ValueError('Diagnostic export requires a separate --out directory under ignored blender/build/')
    os.makedirs(out, exist_ok=True)
    for obj in [o for o in bpy.data.objects if o.type == 'CAMERA']:
        bpy.data.objects.remove(obj)
    root = bpy.data.objects['three.js world']
    for obj in [o for o in bpy.data.objects if o.type == 'MESH']:
        mw = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = mw
    bpy.data.objects.remove(root)
    vl = bpy.context.view_layer
    manifest, audits = [], []
    for col in list(bpy.context.scene.collection.children):
        objects = [o for o in col.objects if o.type == 'MESH']
        if not objects:
            continue
        low = col.name.lower()
        kind = next((v for k, v in PARTS if k in low), None) or ''.join(c for c in low if c.isascii() and c.isalnum())
        if not args.partition_buildings or kind not in ('house', 'temple'):
            audit = {'bucket': kind, 'kind': kind, 'role': 'legacy', 'cell_xy': None} if kind in ('house', 'temple') else None
            manifest.extend(export_bucket(objects, kind, kind, out, vl, audit=audit, joined_name=col.name, override=override))
            if audit is not None:
                audits.append(audit)
            continue
        buckets = {}
        for obj in objects:
            lower, upper = object_bounds(obj)
            center = (lower + upper) / 2
            cell = tuple(math.floor(value / args.cell_size) for value in center[:2])
            role = building_role(obj.name, str(obj.get('parents', '')))
            buckets.setdefault((role, *cell), []).append(obj)
        for (role, x, y), bucket in sorted(buckets.items()):
            name = f'{kind}_{role}_{cell_suffix(x, y)}'
            bounds = [object_bounds(obj) for obj in bucket]
            audit = {'bucket': name, 'kind': kind, 'role': role, 'cell_xy': [x, y],
                     'bounds_world_xyz': [np.min([b[0] for b in bounds], axis=0).tolist(),
                                          np.max([b[1] for b in bounds], axis=0).tolist()],
                     'objects_wider_than_cell': [obj.name for obj, (lower, upper) in zip(bucket, bounds)
                                                 if np.any((upper - lower)[:2] > args.cell_size)]}
            manifest.extend(export_bucket(bucket, name, kind, out, vl, audit, override=override))
            audits.append(audit)
    if sum(record['triangles'] for audit in audits for record in audit['native_material_overrides']) != override['triangles']:
        raise RuntimeError('Native fence alias triangle coverage changed')
    with open(os.path.join(out, 'parts.json'), 'w', encoding='utf-8') as handle:
        json.dump(manifest, handle, indent=2)
    if audits:
        with open(os.path.join(out, 'partition-audit.json'), 'w', encoding='utf-8') as handle:
            json.dump({'schema': 2, 'cell_size_metres': args.cell_size,
                       'partition_buildings': args.partition_buildings,
                       'source_normals_preserved': True,
                       'original_triangles_preserved': True,
                       'exporter_sha256': hashlib.sha256(open(__file__, 'rb').read()).hexdigest(),
                       'provenance': provenance,
                       'native_material_overrides': [override],
                       'assignment': 'whole original object, world bounding-box centre; Blender XY horizontal',
                       'verified': all(audit['verified'] for audit in audits),
                       'parts': len(manifest),
                       'building_parts': sum(entry['kind'] in ('house', 'temple') for entry in manifest),
                       'source_building_objects': sum(audit['source_objects'] for audit in audits),
                       'source_pre_freeze_building_faces': sum(audit['source_pre_freeze_faces'] for audit in audits),
                       'source_building_faces': sum(audit['source_faces'] for audit in audits),
                       'render_building_faces': sum(audit['render_faces'] for audit in audits),
                       'source_building_triangles': sum(audit['source_triangles'] for audit in audits),
                       'render_building_triangles': sum(audit['render_triangles'] for audit in audits),
                       'buckets': audits}, handle, indent=2)


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
