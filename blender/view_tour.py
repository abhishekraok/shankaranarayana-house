"""Startup script for view-tour.cmd: fills the window with the tour camera and plays.

Runs inside the Blender UI (not --background), after the file has loaded.
"""
import bpy

def start():
    win = bpy.context.window_manager.windows[0]
    views = [a for a in win.screen.areas if a.type == 'VIEW_3D']
    if not views:
        return 0.5  # the UI is not ready yet; try again shortly
    view = max(views, key=lambda a: a.width * a.height)
    for space in view.spaces:
        if space.type == 'VIEW_3D':
            space.shading.type = 'RENDERED'; space.overlay.show_overlays = False
            space.show_gizmo = False; space.region_3d.view_perspective = 'CAMERA'
    region = next(r for r in view.regions if r.type == 'WINDOW')
    try:  # just the 3D view, without toolbars; Ctrl+Space restores the layout
        with bpy.context.temp_override(window=win, area=view, region=region):
            bpy.ops.screen.screen_full_area(use_hide_panels=True)
    except Exception as e:
        print('tour: full-screen view skipped:', e)
    try:
        with bpy.context.temp_override(window=win):
            if not bpy.context.screen.is_animation_playing:
                bpy.ops.screen.animation_play()
    except Exception as e:
        print('tour: could not start playback:', e)
    return None

bpy.app.timers.register(start, first_interval=1.5)
