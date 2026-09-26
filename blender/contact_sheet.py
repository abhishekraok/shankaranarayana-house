"""Pairs each render with its photograph: photo left, render right, caption below.

    python blender/contact_sheet.py RENDER_DIR [--photos F:/Shankaranarayana] [--per-sheet 6]

Photos are read in place and never copied into the repository. Sheets are written
next to the renders, which live under the ignored blender/build/ folder.
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

args = sys.argv[1:]
render_dir = args[0]
photos = args[args.index('--photos') + 1] if '--photos' in args else 'F:/Shankaranarayana'
per = int(args[args.index('--per-sheet') + 1]) if '--per-sheet' in args else 6
assets = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist', 'assets')
index = json.load(open(os.path.join(render_dir, 'index.json')))
try: font = ImageFont.truetype('arial.ttf', 18)
except OSError: font = ImageFont.load_default()

W = 640; rows = []
for e in index:
    src = os.path.join(photos, e['photo'])
    if not os.path.exists(src): src = os.path.join(assets, e['photo'])
    if not os.path.exists(src): continue
    ph = Image.open(src).convert('RGB'); rd = Image.open(e['render']).convert('RGB')
    h = round(W * ph.height / ph.width)
    ph = ph.resize((W, h)); rd = rd.resize((W, h))
    row = Image.new('RGB', (W * 2 + 12, h + 34), (24, 24, 24))
    row.paste(ph, (0, 0)); row.paste(rd, (W + 12, 0))
    cap = f"{e['camera']}   fov {e['fov']}° (saved {e['saved_fov']:.1f}°)   {e['notes'][:70]}"
    ImageDraw.Draw(row).text((6, h + 7), cap, fill=(230, 230, 230), font=font)
    rows.append(row)
for n in range(0, len(rows), per):
    part = rows[n:n + per]
    sheet = Image.new('RGB', (part[0].width, sum(r.height for r in part) + 8 * len(part)), (12, 12, 12))
    y = 0
    for r in part: sheet.paste(r, (0, y)); y += r.height + 8
    out = os.path.join(render_dir, f'sheet-{n // per + 1:02d}.jpg')
    sheet.save(out, quality=88); print(out)
