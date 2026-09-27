"""Screenshot from inside a -game session after N frames, then quit.

    UnrealEditor.exe <uproject> -game -ExecCmds="py unreal/scripts/game_shot.py OUT.png 600"
"""
import sys, unreal
OUT = sys.argv[1] if len(sys.argv) > 1 else 'game.png'
FRAMES = int(sys.argv[2]) if len(sys.argv) > 2 else 600
state = {'n': 0}
def tick(dt):
    state['n'] += 1
    if state['n'] == FRAMES:
        world = unreal.find_object(None, '/Game/Maps/Site.Site')
        print('GAMEWORLD', world)
        unreal.SystemLibrary.execute_console_command(world, f'HighResShot 1600x900 filename="{OUT}"')
    if state['n'] == FRAMES + 240:
        print('GAMESHOT', OUT); unreal.SystemLibrary.execute_console_command(None, 'quit')
handle = unreal.register_slate_post_tick_callback(tick)
