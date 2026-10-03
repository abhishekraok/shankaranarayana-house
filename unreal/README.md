# A quiet walk

Run `unreal/play.cmd` to open the native game.
The launcher prefers the standalone build, but only when its paks are newer than every
file under the project's `Content`, `Config`, authored `game/Source`, and the editor
game module; otherwise it warns and
runs the generated project with the compiled editor module (`-game`). No browser or
photo server is needed.
The launcher keeps progress in ignored `unreal/user-data/Saved/SaveGames`, shared by
both launch modes. It copies the newest legacy save there once, without overwriting
existing progress. Keep this folder when replacing a generated project or package.

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

`unreal/play.ps1 -Smoke` waits for native checks and a cold-restart save check.
It requires fresh passing reports and exit code 0, with a five-minute limit per stage
(`-SmokeTimeoutSeconds` changes it). Each run uses its own ignored
`unreal/smoke-runs/<id>/Saved/WalkReview`; player saves and the real pose folder are isolated.

All imported assets, screenshots, synthesized audio and binaries remain ignored.
Only text source and build scripts belong in Git. Audio is generated locally from
noise and tones; it is atmospheric, not a recording of the actual site.

`unreal/build.ps1 -Package` builds the runtime and cooks a standalone Windows copy
under ignored `unreal/build/Windows`. It uses the existing generated scene; rebuild
that scene separately when geometry changes. Keep the whole Windows folder together.
For asset-only work, `-Package -ReuseNativeBinaries` cooks with the existing runtime
without a C++ compiler. It refuses added, deleted, changed or newer native source files.
The full Git Bash refresh accepts `REUSE_NATIVE_BINARIES=1 bash unreal/rebuild-all.sh`.

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

`blender/export_unreal.py` groups original building objects by surface role and
8 m horizontal cells, then limits each resource to 48 material sections. The current
model produces 223 parts: 72 house, 145 temple and six other parts. Import, materials
and level construction consume `blender/build/unreal/parts.json`.

Building exports preserve original triangle connectivity, world placements, UVs,
colors and corner normals. Export checks every source triangle once and writes
`partition-audit.json`; stale blockout provenance requires rebuilding the blockout.
Native import and mesh rebuild explicitly preserve source normals. The scene audit
requires each fallback triangle count to equal its GLB count, with no trimming.
The ray-tracing geometry pool is 1024 MB.

`--legacy-buildings` restores the former 15-part grouping while retaining normals
and conservation checks. Re-import and rebuild the level after switching groups.
Explicit diagnostic flags require a separate output directory under ignored
`blender/build/`; ordinary export and legacy rollback may use the canonical directory.
After a scene refresh, run `scripts/verify_scene.py` through the Python commandlet;
it checks every group, material assignment and persisted collision setting, writing
`Shankaranarayana/Saved/native-scene-audit.json`. Then run the walking smoke checks.

## Material and lighting fidelity

`materials.py --rebuild` updates masters in place and restores authored color, bump
and roughness maps, UV transforms, wrapping and approved photo cards. Mapped two-sided
solid materials flip their completed world-space bump normal on back faces; foliage
and water use their own normal handling. Texture imports
stay ignored; photo sources must be explicitly allowlisted in the root `.gitignore`.
The lake uses single-layer water with absorption, scattering and animated normals.
Its normal field uses smooth height-noise gradients to remove the old repeating
ripple grid, at the same RMS slope (~.0161). Water instances use
`WaterNormalIrregularMix=1`; zero restores the original waves. Color, roughness
and volume settings are unchanged. `materials.py` upgrades stale water shader
code and reapplies the instance setting. Fresh material audits reject saved
diagnostic time nodes.

For sampled water animation checks, `capture_poses.py --water-times 0,.25`
accepts one explicit shader time per pose alongside a scoped water profile.
Set `water_normal_irregular_mix` to 0 or 1 in that JSON profile.
It changes only the unsaved water Time input, because editor screenshots can
freeze world time. Captures record shader times and world clocks; this check
does not measure frame rate or continuous motion.
Arcade-roof gain 1.45 and temple-paving gain 1.8 apply only to their exclusive materials.
Structural timber uses gain 1.5, resolved through the authored entrance shafts;
changed source tint or texture stops the rebuild for recalibration. Set
`HOUSE_TIMBER_GAIN=1` for both material rebuild and audit to restore its original gain.
Unsaved comparisons can use `source_material_color_gains` in a capture profile,
keyed by source index with `expected_name` and `gain`; captures record the readback.
Structural canopies, carved relief, door leaves, studs, bells, coconut fruit and forest
ground use solid materials. Plant materials retain foliage shading with 15/120 cm
noise cells and contrasts .2/.15; crown-map contrast .35 applies only to the broadleaf map.

After mesh import, run `configure_lumen.py` with the full editor's
`-ExecutePythonScript=<absolute path>` (it saves and exits). It gives joined building
meshes a maximum of 32 surface-cache cards, landscape groups 32, and preserves fine Nanite detail.
UE 5.8's runtime card lookup is limited to 32 per mesh; requesting 64 did not improve
the sampled interiors. The build audit records the setting, not the live card count.
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
checks a fresh load, including the emitted sun direction exported from the web model.
The shared profile uses neutral color grading and skylight leaking 0.004. Packaging
runs that preflight, and captures and the native smoke
test check that exactly one active sky still has its texture. After lighting edits,
run `finish_game.py` and rebuild the package; after emissive graph edits, also run
`materials.py --rebuild` first.
`capture_poses.py --lighting-profile <JSON>` can compare sun, sky, post-process,
foliage/fill parameters and exclusive arcade-roof gain without saving the map or materials.
`build_level.py --exposure` is obsolete; use a capture profile for exposure experiments.

## Photo alignment and notes in the game

`Photo alignment` on the start and pause menus opens a browser of the private photographs
(`F:/Shankaranarayana`, or `-WalkPhotos=<folder>`; the entry is hidden when the folder is absent).
Each photograph offers:

- **Go to saved position**: a free camera at the saved pose, framed to the photograph's aspect and
  lens, with the photograph in a corner (`Tab` / `X` switches to a half-transparent overlay).
- **Align from the current view**: the same camera, starting where you are.
- **Add a note**.

Alignment runs entirely from the controller or the keyboard, without returning to the menu. The
bottom of the screen shows the photograph's name, `n / total`, whether it has a saved alignment, the
lens, and these controls:

| Controller | Keyboard | |
| --- | --- | --- |
| `LB` / `RB` | `[` / `]` or `PageUp` / `PageDown` | Previous / next photograph, wrapping round. One with a saved pose flies the camera there; an unaligned one leaves the camera where it is. |
| `Y` | `G` | Go to this photograph's saved position and lens (a toast says so when there is none). |
| `A` | `Enter` | Save the alignment. |
| `X` | `Tab` | Photograph in a corner, or as a half-transparent overlay. |
| `B` or `Menu` | `Esc` | The photograph's page; back again leaves alignment. |
| Left stick, right stick | `W A S D`, mouse | Move, look. |
| `LT` / `RT` (by how far they are pulled) | `Q` / `E` | Lower / rise. |
| Hold `L3` (left stick click) | `Shift` | Move faster. |
| D-pad up / down | `=` / `−` | Lens wider / longer. |
| D-pad right / left | `C` / `Z` | Tilt (roll). |

Poses and photo notes are read from and written to the web align tool's `align-poses.json` (same
record format, three.js coordinates), so either tool sees the other's work. `Leave a note here` in the
pause menu, and notes on photographs that have no pose yet, go to `unreal-notes.json` in the same
folder, with eye position and view direction in three.js metres.
The browser and note editor refresh both files and show the latest unaligned-photo
note. The first alignment carries that note into the pose; an aligned note, including
an explicit empty note, takes precedence. Loose-note history remains intact. Invalid
JSON or a non-array notes/poses field blocks writes rather than replacing the file.

`-WalkReviewPhoto=<part of a file name>` opens that photograph at its saved pose, writes
`review-<name>-menu.png`, `-side.png` and `-overlay.png` to `Saved/WalkReview`, and quits without
saving anything. The smoke test exercises alignment (including `RB`, `LB`, `Y`, `A` and `B` as real
button events) and notes on two generated pictures in `Saved/WalkReview/align-smoke`, never the real
poses.
