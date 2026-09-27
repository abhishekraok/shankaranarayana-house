"""Renders viewpoints of the Site map from the editor and saves screenshots, then quits.

    UnrealEditor <uproject> -ExecutePythonScript="unreal/scripts/capture.py --out DIR --views front+lake" -windowed -ResX=1600 -ResY=900

Views are three.js poses {p, target} (metres, eye at p + 1.62 m): the webapp destinations
exported into nav.json, or photo poses. Waits for shaders and exposure to settle per view.
"""
import json, math, os, sys, unreal

argv = sys.argv[1:]
def opt(n, d): return argv[argv.index(n) + 1] if n in argv else d
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, '..', '..', 'blender', 'build', 'unreal'))
OUT = os.path.abspath(opt('--out', os.path.join(HERE, '..', 'Shankaranarayana', 'Saved', 'Captures')))
os.makedirs(OUT, exist_ok=True)
nav = json.load(open(os.path.join(SRC, 'nav.json')))
VIEWS = json.load(open(os.path.join(SRC, 'views.json'))) if os.path.exists(os.path.join(SRC, 'views.json')) else {}
VIEWS.setdefault('spawn', {'p': [nav['spawn']['p'][0], 0, nav['spawn']['p'][2]], 'target': nav['spawn']['target']})
names = [v for v in opt('--views', 'spawn').replace('+', ',').split(',') if v in VIEWS]  # -ExecCmds splits on commas: use +
print('CAPTURE views', names)
WAIT = int(opt('--frames', 240))

def ue(p): return unreal.Vector(p[0] * 100, p[2] * 100, p[1] * 100)
unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).load_level('/Game/Maps/Site')
ues = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
state = {'i': 0, 'tick': 0}

def place(v):
    eye = [v['p'][0], v['p'][1] + 1.62, v['p'][2]]
    a, b = ue(eye), ue(v['target'])
    d = b - a
    yaw = math.degrees(math.atan2(d.y, d.x)); pitch = math.degrees(math.atan2(d.z, math.hypot(d.x, d.y)))
    ues.set_level_viewport_camera_info(a, unreal.Rotator(roll=0, pitch=pitch, yaw=yaw))

def tick(dt):
    if state['i'] >= len(names):
        unreal.unregister_slate_post_tick_callback(handle); unreal.SystemLibrary.quit_editor(); return
    v = VIEWS[names[state['i']]]
    if state['tick'] == 0: place(v)
    state['tick'] += 1
    if state['tick'] == WAIT:
        path = os.path.join(OUT, names[state['i']] + '.png').replace(os.sep, '/')
        unreal.SystemLibrary.execute_console_command(None, f'HighResShot 1600x900 filename="{path}"')
    if state['tick'] >= WAIT + 30:
        print('CAPTURED', names[state['i']]); state['i'] += 1; state['tick'] = 0

handle = unreal.register_slate_post_tick_callback(tick)
