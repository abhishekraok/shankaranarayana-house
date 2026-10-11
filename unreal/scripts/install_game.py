"""Install tracked C++/config into the ignored generated Unreal project. Idempotent.

    python unreal/scripts/install_game.py
    <UE>/Engine/Build/BatchFiles/Build.bat QuietWalkEditor Win64 Development <uproject> -WaitMutex

No photos are copied. Generated binaries, saves and imported audio stay ignored.
"""
from pathlib import Path
import json
import math
import hashlib
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / 'Shankaranarayana'

def managed(path, content):
    start, end = '; BEGIN QUIET WALK', '; END QUIET WALK'
    old = path.read_text(encoding='utf-8-sig') if path.exists() else ''
    if start in old and end in old.split(start, 1)[1]:
        before, rest = old.split(start, 1)
        _, after = rest.split(end, 1)
        old = before.rstrip() + after
    # Unreal rewrites/merges INI sections and can discard the closing comment.
    # Replace only our scalar keys and named array entries, wherever they moved.
    owned = {}; section = ''
    for line in content.strip().splitlines():
        if line.startswith('['):
            section = line
        elif '=' in line:
            key, value = line.split('=', 1)
            identity = re.search(r'(\w+)="([^"]*)"', value) if key.startswith('+') else None
            owned.setdefault((section, key), []).append(identity.groups() if identity else None)
    kept = []; section = ''
    for line in old.splitlines():
        stripped = line.strip()
        if stripped in (start, end):
            continue
        if stripped.startswith('['):
            section = stripped
        if '=' in stripped:
            key, value = stripped.split('=', 1)
            identities = owned.get((section, key), [])
            if any(identity is None or re.search(r'\b'+re.escape(identity[0])+r'="'+re.escape(identity[1])+r'"', value)
                   for identity in identities):
                continue
        kept.append(line)
    path.write_text('\n'.join(kept).rstrip() + '\n\n' + start + '\n' + content.strip() + '\n' + end + '\n', encoding='utf-8')

def main():
    project_file = PROJECT / 'Shankaranarayana.uproject'
    data = json.loads(project_file.read_text())
    modules = [m for m in data.get('Modules', []) if m['Name'] != 'QuietWalk']
    data['Modules'] = modules + [{'Name': 'QuietWalk', 'Type': 'Runtime', 'LoadingPhase': 'Default'}]
    project_file.write_text(json.dumps(data, indent=2) + '\n')
    # A different worktree can supply changed code older than UBT's last build.
    # Preserving that timestamp can silently skip compilation/header generation.
    source_root = ROOT / 'game/Source'
    if not source_root.is_dir():
        raise SystemExit(f'Missing {source_root}')
    for source in source_root.rglob('*'):
        if not source.is_file():
            continue
        target = PROJECT / 'Source' / source.relative_to(source_root)
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists() or source.read_bytes() != target.read_bytes():
            shutil.copyfile(source, target)
    # The guided tour the game plays on launch; staged into the package as a raw file.
    tour = ROOT.parent / 'blender/build/unreal/tour.json'
    if not tour.exists():
        raise SystemExit(f'Missing {tour}; export the scene first.')
    (PROJECT / 'Content/Tour').mkdir(parents=True, exist_ok=True)
    shutil.copy2(tour, PROJECT / 'Content/Tour/tour.json')
    # Stage semantic water safety independently of visual mesh collision. Never
    # import the broad anonymous navigation boxes as native physics geometry.
    water_regions = ROOT.parent / 'blender/build/water-regions.json'
    if not water_regions.is_file():
        raise SystemExit(f'Missing {water_regions}; export the scene first.')
    regions = json.loads(water_regions.read_text())
    if (regions.get('schema') != 'quietwalk-water-regions-v1'
            or {r.get('id') for r in regions.get('regions', [])} != {'lake', 'temple-pond'}
            or len(regions['regions']) != 2):
        raise SystemExit('Invalid semantic water regions')
    expected_sources = {'blender/export-scene.mjs', 'dist/src/kit.js', 'dist/src/landscape.js', 'dist/src/main.js'}
    hashes = regions.get('source', {}).get('sha256', {})
    if set(hashes) != expected_sources:
        raise SystemExit('Incomplete water-region source provenance')
    for relative, expected in hashes.items():
        if hashlib.sha256((ROOT.parent / relative).read_bytes()).hexdigest() != expected:
            raise SystemExit(f'Stale water regions: {relative} changed; export the scene again.')
    for region in regions['regions']:
        bounds = region.get('bounds', {})
        keys = ('minX', 'maxX', 'minZ', 'maxZ', 'bottom', 'top')
        if (any(not isinstance(bounds.get(k), (int, float)) or not math.isfinite(bounds[k]) for k in keys)
                or any(bounds[a] >= bounds[b] for a, b in (('minX', 'maxX'), ('minZ', 'maxZ'), ('bottom', 'top')))):
            raise SystemExit(f'Invalid water bounds: {region.get("id")}')
    (PROJECT / 'Content/WalkData').mkdir(parents=True, exist_ok=True)
    shutil.copyfile(water_regions, PROJECT / 'Content/WalkData/water-regions.json')
    managed(PROJECT / 'Config/DefaultEngine.ini', '''
[/Script/EngineSettings.GameMapsSettings]
GlobalDefaultGameMode=/Script/QuietWalk.WalkGameMode
GameDefaultMap=/Game/Maps/Site.Site
EditorStartupMap=/Game/Maps/Site.Site
bUseSplitscreen=False

[/Script/Engine.UserInterfaceSettings]
ApplicationScale=1.0
bAllowHighDPIInGameMode=True
bAllowHighDpiWhenUnattended=True

[SystemSettings]
r.RayTracing.ResidentGeometryMemoryPoolSizeInMB=1024
''')
    managed(PROJECT / 'Config/DefaultInput.ini', '''
[/Script/Engine.InputSettings]
DefaultPlayerInputClass=/Script/Engine.PlayerInput
DefaultInputComponentClass=/Script/Engine.InputComponent
bEnableMouseSmoothing=False
bEnableFOVScaling=False
bEnableLegacyInputScales=False
bCaptureMouseOnLaunch=False
+AxisMappings=(AxisName="WalkForward",Key=W,Scale=1.0)
+AxisMappings=(AxisName="WalkForward",Key=S,Scale=-1.0)
+AxisMappings=(AxisName="WalkForward",Key=Gamepad_LeftY,Scale=1.0)
+AxisMappings=(AxisName="WalkRight",Key=D,Scale=1.0)
+AxisMappings=(AxisName="WalkRight",Key=A,Scale=-1.0)
+AxisMappings=(AxisName="WalkRight",Key=Gamepad_LeftX,Scale=1.0)
+AxisMappings=(AxisName="WalkLookX",Key=MouseX,Scale=1.0)
+AxisMappings=(AxisName="WalkLookY",Key=MouseY,Scale=1.0)
+AxisMappings=(AxisName="WalkStickX",Key=Gamepad_RightX,Scale=1.0)
+AxisMappings=(AxisName="WalkStickY",Key=Gamepad_RightY,Scale=1.0)
''')
    managed(PROJECT / 'Config/DefaultGame.ini', '''
[/Script/UnrealEd.ProjectPackagingSettings]
+MapsToCook=(FilePath="/Game/Maps/Site")
+DirectoriesToAlwaysCook=(Path="/Game/WalkAudio")
+DirectoriesToAlwaysStageAsUFS=(Path="Tour")
+DirectoriesToAlwaysStageAsUFS=(Path="WalkData")
FullRebuild=True
bSkipEditorContent=True

[/Script/EngineSettings.GeneralProjectSettings]
ProjectName=Shankaranarayana
ProjectDisplayedTitle=NSLOCTEXT("QuietWalk", "Title", "Shankaranarayana | A quiet walk")
''')
    print('Installed QuietWalk source and config:', PROJECT)

if __name__ == '__main__':
    main()
