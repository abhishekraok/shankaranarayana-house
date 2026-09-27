"""Pairs each render with its photograph: photo left, render right, caption below.

    python blender/contact_sheet.py RENDER_DIR [--photos F:/Shankaranarayana] [--per-sheet 6]

Photos are read in place and never copied into the repository. Sheets are written
next to the renders, which live under the ignored blender/build/ folder.
"""
import html, json, os, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

args = sys.argv[1:]
render_dir = args[0]
photos = args[args.index('--photos') + 1] if '--photos' in args else 'F:/Shankaranarayana'
per = int(args[args.index('--per-sheet') + 1]) if '--per-sheet' in args else 6
assets = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist', 'assets')
index = json.load(open(os.path.join(render_dir, 'index.json')))
try: font = ImageFont.truetype('arial.ttf', 18)
except OSError: font = ImageFont.load_default()

W = 640; rows = []; missing = []; sheets = []
for e in index:
    src = os.path.join(photos, e['photo'])
    if not os.path.exists(src): src = os.path.join(assets, e['photo'])
    with Image.open(e['render']) as image:
        rd = image.convert('RGB')
    if os.path.exists(src):
        with Image.open(src) as image:
            ph = ImageOps.exif_transpose(image).convert('RGB')
    else:
        missing.append(e['photo'])
        ph = Image.new('RGB', rd.size, (38, 38, 38))
        ImageDraw.Draw(ph).text((20, 30), 'Reference photo unavailable', font=font, fill='white')
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
    sheets.append({'file': os.path.basename(out), 'photos': [e['photo'] for e in index[n:n+per]]})

coverage = {'poses': len(index), 'renders': len(rows), 'sheets': len(sheets),
            'missing_photos': missing, 'pages': sheets}
Path(render_dir, 'coverage.json').write_text(json.dumps(coverage, indent=2), encoding='utf-8')
cards = []
for page in sheets:
    names = ' | '.join(page['photos'])
    cards.append(f'<section data-names="{html.escape(names, quote=True)}"><h2>{html.escape(page["file"])}</h2>'
                 f'<p>{html.escape(names)}</p><a href="{page["file"]}">'
                 f'<img loading="lazy" src="{page["file"]}" alt="{html.escape(names, quote=True)}"></a></section>')
summary = f'{len(index)} poses · {len(sheets)} sheets · photo left / render right'
missing_note = ('Missing reference photos: ' + ', '.join(missing)) if missing else 'All reference photos present.'
page_html = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>All aligned poses</title><style>
body{background:#14201e;color:#e6e8df;font:16px system-ui;margin:0;padding:24px;max-width:1400px;margin:auto}
header{position:sticky;top:0;background:#14201ef5;padding:12px 0;z-index:1}h1{margin:0}input{font:inherit;padding:10px;width:min(90%,520px)}
section{margin:30px 0}img{max-width:100%;height:auto}p{overflow-wrap:anywhere;color:#b9ccc5}a{color:#c2dbbd}
</style><header><h1>All aligned poses</h1><p>SUMMARY</p><input id="search" aria-label="Find a photo" placeholder="Find a photo filename…"><p id="count"></p></header>
<p>MISSING</p>CARDS<script>
const search=document.getElementById('search'),cards=[...document.querySelectorAll('section')];
search.addEventListener('input',()=>{let count=0;for(const card of cards){card.hidden=!card.dataset.names.toLowerCase().includes(search.value.toLowerCase());if(!card.hidden)count++}document.getElementById('count').textContent=count+' sheets shown'});
</script></html>'''.replace('SUMMARY', html.escape(summary)).replace('MISSING', html.escape(missing_note)).replace('CARDS', '\n'.join(cards))
Path(render_dir, 'index.html').write_text(page_html, encoding='utf-8')
md = '# All aligned poses\n\n' + summary + '\n\n' + missing_note + '\n\n[Searchable overview](index.html)\n\n'
md += '\n'.join(f'- [{p["file"]}]({p["file"]}) — ' + ', '.join(p['photos']) for p in sheets)
Path(render_dir, 'REVIEW.md').write_text(md+'\n', encoding='utf-8')
print(json.dumps({k: v for k, v in coverage.items() if k != 'pages'}))
