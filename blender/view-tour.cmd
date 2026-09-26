@echo off
rem Opens the Blender work-in-progress scene and plays the guided tour.
rem Space pauses or resumes, Ctrl+Space toggles full screen, Esc stops playback.
start "" "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" "%~dp0build\tour.blend" --python "%~dp0view_tour.py"
