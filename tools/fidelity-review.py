"""Create a local photo / before / after REVIEW.md from two capture folders.

Requires Pillow. Output stays under the repository's ignored checks/ directory.
Capture folders contain PNGs and captures.json from tools/capture-fidelity.cjs.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('before', type=Path)
parser.add_argument('after', type=Path)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--photos', type=Path, default=Path('F:/Shankaranarayana'))
parser.add_argument('--before-ref', required=True)
parser.add_argument('--after-ref', required=True)
parser.add_argument('--title', required=True)
parser.add_argument('--note', action='append', default=[])
parser.add_argument('--views', help='Comma-separated capture names; defaults to all paired views')
args = parser.parse_args()

checks = Path(__file__).resolve().parents[1] / 'checks'
out = args.out.resolve()
if not out.is_relative_to(checks) or out == checks:
    parser.error('--out must be a subdirectory of the ignored checks/ directory')
if out.exists():
    parser.error('Output already exists; choose a new directory to preserve the earlier review')

documents = [json.loads((p / 'captures.json').read_text()) for p in (args.before, args.after)]
for document in documents:
    if document.get('errors'):
        parser.error('A capture contains browser errors')
    audit = document.get('sourceAudit', {})
    if not audit.get('unchanged') or audit.get('beforeSha256') != audit.get('afterSha256'):
        parser.error('Both captures must verify that the source file was unchanged')
for document, revision in zip(documents, [args.before_ref, args.after_ref]):
    provenance = document.get('provenance')
    if provenance:
        captured = provenance.get('geometryBaseline') or provenance['revision']
        if not re.fullmatch(r'[a-f0-9]{7,40}', revision) or not captured.startswith(revision):
            parser.error(f'Revision label {revision!r} differs from captured revision {captured}')
rows = [{r['capture']: r for r in d['report']} for d in documents]
views = args.views.split(',') if args.views else [v for v in rows[0] if v in rows[1]]
if not views:
    parser.error('No paired views')

# Validate all pairs before creating output, rather than silently presenting
# differently framed renders as a geometry comparison.
pairs = []
for view in views:
    if view not in rows[0] or view not in rows[1]:
        parser.error(f'Missing paired view: {view}')
    a, b = (r[view] for r in rows)
    if a['filename'] != b['filename'] or a['camera'] != b['camera']:
        parser.error(f'Camera or source photo differs: {view}')
    filename = a['filename']
    if Path(filename).name != filename or Path(view).name != view:
        parser.error('Capture names and photo filenames must be basenames')
    paths = [args.photos / filename, args.before / (view + '.png'), args.after / (view + '.png')]
    for p in paths:
        if not p.is_file():
            parser.error(f'Missing image: {p}')
    pairs.append((view, a, paths))

out.mkdir(parents=True, exist_ok=True)
try:
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 20)
    small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 16)
except OSError:
    font = small = ImageFont.load_default()

lines = [f'# {args.title}', '', f'Before `{args.before_ref}` → after `{args.after_ref}`.', '']
lines += ['- ' + note for note in args.note]
lines += ['', 'Paired cameras are identical. Source-file hashes remained unchanged during both captures. '
          'Photos and comparisons stay local. Camera alignment remains a separate uncertainty.', '']
manifest = {'before_revision': args.before_ref, 'after_revision': args.after_ref,
            'source_audits': [d['sourceAudit'] for d in documents],
            'capture_provenance': [d.get('provenance') for d in documents],
            'notes': args.note, 'views': []}
width, height = 600, 450
for view, row, paths in pairs:
    sheet = Image.new('RGB', (3 * width + 32, height + 94), '#182320')
    draw = ImageDraw.Draw(sheet)
    for i, (title, p) in enumerate(zip(['Original photo', 'Before', 'After'], paths)):
        x = 8 + i * (width + 8)
        draw.text((x, 10), title, font=font, fill='#f1e8d4')
        with Image.open(p) as im:
            fitted = ImageOps.contain(im.convert('RGB'), (width, height), Image.Resampling.LANCZOS)
            sheet.paste(fitted, (x + (width - fitted.width) // 2, 40 + (height - fitted.height) // 2))
    caption = ('DIAGNOSTIC: eye raised 1.18 m in both renders' if view.endswith('diagnostic-raised-1.18m')
               else f"Same saved camera; vertical FOV {row['camera']['verticalFov']:g} degrees")
    draw.text((8, height + 51), row['filename'] + ' | ' + caption, font=small, fill='#e2ddcf')
    dest = out / (view + '.jpg')
    sheet.save(dest, quality=91)
    lines += [f'## {view}', '', caption + '.', '', f'![Photo, before and after]({dest.as_posix()})', '']
    manifest['views'].append({'capture': view, 'filename': row['filename'], 'camera': row['camera'],
                              'image_sha256': [hashlib.sha256(p.read_bytes()).hexdigest() for p in paths]})
(out / 'REVIEW.md').write_text('\n'.join(lines), encoding='utf-8')
(out / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(out / 'REVIEW.md')
