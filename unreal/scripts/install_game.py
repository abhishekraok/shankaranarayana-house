"""Install tracked C++/config into the ignored generated Unreal project. Idempotent.

    python unreal/scripts/install_game.py
    <UE>/Engine/Build/BatchFiles/Build.bat QuietWalkEditor Win64 Development <uproject> -WaitMutex

No photos are copied. Generated binaries, saves and imported audio stay ignored.
"""
from pathlib import Path
import json
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
    shutil.copytree(ROOT / 'game/Source', PROJECT / 'Source', dirs_exist_ok=True)
    managed(PROJECT / 'Config/DefaultEngine.ini', '''
[/Script/EngineSettings.GameMapsSettings]
GlobalDefaultGameMode=/Script/QuietWalk.WalkGameMode
GameDefaultMap=/Game/Maps/Site.Site
EditorStartupMap=/Game/Maps/Site.Site
bUseSplitscreen=False

[/Script/Engine.UserInterfaceSettings]
ApplicationScale=1.0

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
FullRebuild=True
bSkipEditorContent=True

[/Script/EngineSettings.GeneralProjectSettings]
ProjectName=Shankaranarayana
ProjectDisplayedTitle=NSLOCTEXT("QuietWalk", "Title", "Shankaranarayana | A quiet walk")
''')
    print('Installed QuietWalk source and config:', PROJECT)

if __name__ == '__main__':
    main()
