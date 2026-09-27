"""Creates the Unreal project from the engine's first-person Blueprint template.

    python unreal/scripts/create_project.py [--engine I:/Epic/UE_5.8]

Writes unreal/Shankaranarayana/Shankaranarayana.uproject (ignored by git) with Python,
editor scripting and glTF import enabled. Re-running leaves an existing project alone.
"""
import json, os, shutil, sys

args = sys.argv[1:]
ENGINE = args[args.index('--engine') + 1] if '--engine' in args else 'I:/Epic/UE_5.8'
HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.join(HERE, '..', 'Shankaranarayana')
TEMPLATE = os.path.join(ENGINE, 'Templates', 'TP_FirstPersonBP')
uproject = os.path.join(PROJ, 'Shankaranarayana.uproject')
if os.path.exists(uproject):
    print('exists', os.path.abspath(uproject)); sys.exit(0)
os.makedirs(PROJ, exist_ok=True)
for d in ('Config', 'Content'):
    shutil.copytree(os.path.join(TEMPLATE, d), os.path.join(PROJ, d))
# The template's SharedContentPacks (player character, input mappings, prototyping
# materials) mount under /Game/<MountName>.
for pack in ('Characters', 'LevelPrototyping', 'Input'):
    shutil.copytree(os.path.join(ENGINE, 'Templates', 'TemplateResources', 'High', pack, 'Content'),
                    os.path.join(PROJ, 'Content', pack), dirs_exist_ok=True)
for f in ('TemplateDefs.ini', 'config.ini'):
    p = os.path.join(PROJ, 'Config', f)
    if os.path.exists(p): os.remove(p)
json.dump({
    'FileVersion': 3, 'EngineAssociation': '5.8', 'Category': '',
    'Description': 'Shankaranarayana, Udupi: native walkthrough of the house, tank and temple',
    'Plugins': [{'Name': n, 'Enabled': True} for n in
                ('PythonScriptPlugin', 'EditorScriptingUtilities', 'GameplayStateTree', 'Interchange')],
}, open(uproject, 'w'), indent='\t')
# Hardware ray-traced Lumen on the RTX card, and the site as the startup map.
with open(os.path.join(PROJ, 'Config', 'DefaultEngine.ini'), 'a') as f:
    f.write('
[/Script/Engine.RendererSettings]
r.RayTracing=True
r.SkinCache.CompileShaders=True
'
            'r.Lumen.HardwareRayTracing=True
r.Lumen.TraceMeshSDFs=0
r.Nanite.ProjectEnabled=True
'
            '
[/Script/EngineSettings.GameMapsSettings]
EditorStartupMap=/Game/Maps/Site.Site
GameDefaultMap=/Game/Maps/Site.Site
')
print('created', os.path.abspath(uproject))
