# A quiet walk

Run `unreal/play.cmd` or `unreal/build/Windows/QuietWalk.exe` to open the native game.
The launcher prefers the standalone build, but only when its paks are newer than every
file under the project's `Content` and the editor game module; otherwise it warns and
runs the generated project with the compiled editor module (`-game`). No browser or
photo server is needed.

- It opens on the web app's guided tour (`blender/build/unreal/tour.json`, copied to
  `Content/Tour` by `install_game.py` and staged into the package): the opening flight
  from the far bank, then the walking loop. Esc / Menu (Start) opens the menu; WASD or
  either stick leaves the tour and walks on from the camera's spot (from the landing on
  the lane during the flight). The pause menu can restart the tour.
- Begin / Continue, pause, settings, controls, save & quit.
- Walk with WASD and mouse, or the controller sticks. Shift / right trigger walks faster.
- E / A notices a nearby place. J / Y opens the seven-place journal; discovered places
  can be revisited. Guidance can be disabled. There is no timer or required order.
- Escape / Menu pauses. Return to the entrance is available if you get stuck.
- Sensitivity, FOV, invert look, guidance, volume, graphics and display settings persist.
  By default pushing the mouse or right stick up looks down; Invert makes up look up.
  Saves from before this default (no `LookVersion`) have Invert reset once.
- No jump, camera bob or motion blur. Position saves every 20 seconds on safe ground,
  when noticing a place and on exit. A new walk asks before replacing progress.

## Rebuild

The authored runtime is `game/Source`; `scripts/install_game.py` copies it into the
ignored project. Do not edit the generated copy. Requires Unreal 5.8 and MSVC 14.38+.

```powershell
python unreal/scripts/create_project.py
python unreal/scripts/install_game.py
python unreal/scripts/make_audio.py
& 'I:/Epic/UE_5.8/Engine/Build/BatchFiles/Build.bat' QuietWalkEditor Win64 Development "$PWD/unreal/Shankaranarayana/Shankaranarayana.uproject" -WaitMutex
```

After the existing scene export/import/materials/level pipeline, run `finish_game.py`
with `UnrealEditor-Cmd -run=pythonscript -script=<absolute script path>` to apply the
game mode, adaptive exposure and audio. Re-run it after every level rebuild.

`unreal/play.ps1 -Smoke` runs native runtime checks and UI screenshots, then exits.
It uses the separate `QuietWalkSmoke` save slot. Results are in `Saved/WalkReview`
under the generated project, or `build/Windows/Shankaranarayana` for the standalone
game. Regular saves are in that same game's `Saved/SaveGames/QuietWalk.sav`.
Launch the executable with `-WalkSmokeResume` after a smoke run to verify persistence
in a new process; its result is `Saved/WalkReview/resume-smoke.json`.

All imported assets, screenshots, synthesized audio and binaries remain ignored.
Only text source and build scripts belong in Git. Audio is generated locally from
noise and tones; it is atmospheric, not a recording of the actual site.

`unreal/build.ps1 -Package` builds the runtime and cooks a standalone Windows copy
under ignored `unreal/build/Windows`. It uses the existing generated scene; rebuild
that scene separately when geometry changes. Keep the whole Windows folder together.

## Full-pose reviews

Run `unreal/review-poses.ps1` after every merge of main and every major improvement.
It merges main first, checks the exported model source, snapshots the poses read-only,
captures every alignment in Unreal, then pairs each with its reference photograph.
Results are local under `blender/build/sheets-<main hash>/unreal-<timestamp>/index.html`.
The overview supports filename search and reports missing photos without dropping poses.
Saved position, roll and FOV are preserved, including the full-image extent of older
cover-cropped alignments. No level or pose changes are saved during capture.

When model source changes, refresh export, Blender scene, Unreal imports and level
before capture; the review script deliberately rejects a stale model export.
Record model mismatches in `PHOTOREAL-NOTES.md`; model fixes belong to Claude on main.

The native exporter partitions each scene part into at most 48 material sections
(`blender/build/unreal/parts.json`). Unreal's Nanite limit is 64; the former monolithic
meshes exceeded it. Import, material assignment and level construction consume this
manifest. Face counts are checked during export, and Nanite fallback geometry keeps
all original triangles for collision. The ray-tracing geometry pool is 1024 MB.
After a scene refresh, run `scripts/verify_scene.py` through the Python commandlet;
it checks every group, material assignment and persisted collision setting, writing
`Shankaranarayana/Saved/native-scene-audit.json`. Then run the walking smoke checks.

## Material and lighting fidelity

`materials.py --rebuild` updates masters in place and restores authored color, bump
and roughness maps, UV transforms, wrapping and approved photo cards. Texture imports
stay ignored; photo sources must be explicitly allowlisted in the root `.gitignore`.
The lake uses single-layer water with absorption, scattering and animated normals.

After mesh import, run `configure_lumen.py` with the full editor's
`-ExecutePythonScript=<absolute path>` (it saves and exits). It gives joined building
meshes 64 surface-cache cards, landscape groups 32, and preserves fine Nanite detail.
Building detail stays resident. Fallback targets explicitly retain 100% of triangles;
Auto would override the percentage/error fields. The scene audit compares actual
fallback triangle counts with each GLB export.
The Static Mesh Editor subsystem is unavailable in commandlets. Run
`verify_materials.py` in a commandlet to audit persisted maps and transforms.

Level rebuilds keep exactly one exposure volume and add native light at the three
authored bulb/flame positions. `finish_game.py` applies adaptive exposure and Lumen
quality. Full-pose captures allow 30 seconds of startup warmup and 32 temporal frames
per screenshot; camera metadata records those settings.

`lighting.py` owns the lighting profile. A separate native skylight retains the HDR
cubemap across reloads; HDRIBackdrop's light is disabled because its Blueprint resets
component overrides and left the scene with a null cubemap. `verify_lighting.py`
checks a fresh load, packaging runs that preflight, and captures and the native smoke
test check that exactly one active sky still has its texture. After lighting edits,
run `finish_game.py` and rebuild the package; after emissive graph edits, also run
`materials.py --rebuild` first.

## Photo alignment and notes in the game

`Photo alignment` on the start and pause menus opens a browser of the private photographs
(`F:/Shankaranarayana`, or `-WalkPhotos=<folder>`; the entry is hidden when the folder is absent).
Each photograph offers:

- **Go to saved position**: a free camera at the saved pose, framed to the photograph's aspect and
  lens, with the photograph in a corner (`Tab` / `X` switches to a half-transparent overlay).
- **Align from the current view**: the same camera, starting where you are.
- `Enter` / `A` saves the alignment; `Esc` / `Menu` returns to the photograph's page.
- **Add a note**.

Poses and photo notes are read from and written to the web align tool's `align-poses.json` (same
record format, three.js coordinates), so either tool sees the other's work. `Leave a note here` in the
pause menu, and notes on photographs that have no pose yet, go to `unreal-notes.json` in the same
folder, with eye position and view direction in three.js metres.

`-WalkReviewPhoto=<part of a file name>` opens that photograph at its saved pose, writes
`review-<name>-menu.png`, `-side.png` and `-overlay.png` to `Saved/WalkReview`, and quits without
saving anything. The smoke test exercises alignment and notes on a generated picture in
`Saved/WalkReview/align-smoke`, never the real poses.
