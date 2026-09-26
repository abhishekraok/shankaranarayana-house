"""Crops a photo (or render) with a labelled pixel grid, for reading image coordinates.

    python blender/grid.py IMAGE OUT.jpg [x0 y0 x1 y1] [--step 100] [--width 1400]

Coordinates on the grid are in the original image's pixels (2048x1536 photos).
"""
import sys
from PIL import Image, ImageDraw, ImageFont
a = sys.argv[1:]
src, out = a[0], a[1]
step = int(a[a.index('--step') + 1]) if '--step' in a else 100
width = int(a[a.index('--width') + 1]) if '--width' in a else 1400
nums = [x for x in a[2:] if x.lstrip('-').isdigit() and a[a.index(x) - 1] not in ('--step', '--width')]
im = Image.open(src).convert('RGB')
x0, y0, x1, y1 = map(int, nums[:4]) if len(nums) >= 4 else (0, 0, im.width, im.height)
crop = im.crop((x0, y0, x1, y1)); s = width / crop.width
crop = crop.resize((width, round(crop.height * s)))
d = ImageDraw.Draw(crop)
try: font = ImageFont.truetype('arial.ttf', 14)
except OSError: font = ImageFont.load_default()
for gx in range((x0 // step + 1) * step, x1, step):
    X = (gx - x0) * s; major = gx % (step * 5) == 0
    d.line([(X, 0), (X, crop.height)], fill=(255, 255, 0) if major else (255, 80, 80), width=1)
    d.text((X + 2, 2), str(gx), fill=(255, 255, 0), font=font)
for gy in range((y0 // step + 1) * step, y1, step):
    Y = (gy - y0) * s; major = gy % (step * 5) == 0
    d.line([(0, Y), (crop.width, Y)], fill=(255, 255, 0) if major else (255, 80, 80), width=1)
    d.text((2, Y + 2), str(gy), fill=(255, 255, 0), font=font)
crop.save(out, quality=90); print(out, crop.size)
