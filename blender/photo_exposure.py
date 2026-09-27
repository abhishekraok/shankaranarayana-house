"""Read reference-photo EXIF and write relative Blender exposure settings.

Requires Pillow in ordinary Python, not Blender's Python. Example:
  python blender/photo_exposure.py --reference "F:/photos/exterior.jpg" \
      --photo "F:/photos/interior.jpg" --base-exposure 1.3 --out blender/build/exposure.json

Relative gain is log2((time * ISO / f-number**2) / reference_gain).
This preserves recorded camera exposure differences; it does not calibrate the
HDRI, scene lighting or the phone's JPEG tone curve. Exposure bias is already
reflected in the recorded time/ISO and must not be applied a second time.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image

def read_exposure(path):
    with Image.open(path) as image:
        exif = image.getexif().get_ifd(34665)
        values = {'seconds': float(exif[33434]), 'f_number': float(exif[33437]),
                  'iso': float(exif[34855])}
    if not all(math.isfinite(v) and v > 0 for v in values.values()):
        raise ValueError(f'Invalid exposure metadata: {path}')
    return values

def gain(record):
    return record['seconds'] * record['iso'] / record['f_number'] ** 2

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference', type=Path, required=True)
    parser.add_argument('--photo', type=Path, action='append', default=[])
    parser.add_argument('--base-exposure', type=float, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    if not math.isfinite(args.base_exposure): parser.error('Base exposure must be finite')
    reference = read_exposure(args.reference)
    records = {}
    for path in [args.reference, *args.photo]:
        values = read_exposure(path)
        delta = math.log2(gain(values) / gain(reference))
        records[path.name] = dict(values, relative_stops=delta,
                                 exposure=args.base_exposure + delta,
                                 photo_sha256=hashlib.sha256(path.read_bytes()).hexdigest())
    result = {'schema': 'shankaranarayana-photo-exposure', 'version': 1,
              'reference_photo': args.reference.name, 'base_exposure': args.base_exposure,
              'photos': records}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({name: round(r['relative_stops'], 3) for name, r in records.items()}))
