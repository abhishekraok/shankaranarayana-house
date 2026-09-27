"""Fail if the generated scene predates the merged model source. Read-only."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
scene = root / 'blender/build/scene.json'
source = json.loads(scene.read_text(encoding='utf-8'))['source']['sha256']
mismatches = [name for name, expected in source.items() if name.startswith('dist/')
              and hashlib.sha256((root / name).read_bytes()).hexdigest() != expected]
if mismatches:
    raise SystemExit('Refresh the Blender export and Unreal scene before rendering/building: '
                     + ', '.join(mismatches))
print('Generated model source matches the checkout.')
