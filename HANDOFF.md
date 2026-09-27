# Handoff (2026-09-27)

Claude's reconstruction handoff, updated after the local Codex fidelity pass below.
Read AGENTS.md first; its rules (local commits only, no push or deploy, private photos never
committed) still apply.

## Review workflow

After each major improvement, create a local `REVIEW.md` with original / before / after
images from matching cameras, source revisions, and short notes on changes and uncertainties.
Preserve earlier reviews; label diagnostic camera or lighting adjustments. Keep photo-bearing
reviews ignored and local, block source-file writes during capture, and link the new review
in the progress update. This is the user's preferred review format.

## Continued fidelity session (2026-09-27, ongoing)

Geometry through `7ae7b3d`, starting from `2ea3ff9`; local only. Review:
`checks/fidelity-session/REVIEW.md` (original / session start / current).
Later reviews: `checks/fidelity-capitals/REVIEW.md` and
`checks/fidelity-native-materials/REVIEW.md`; earlier reviews are preserved.
Also see `checks/fidelity-pedestals/REVIEW.md` and
`checks/fidelity-window-exposure/REVIEW.md`.

- Sitting window: ochre surround, rounded blue mouldings, exposed recess and oxide sill.
- Adjacent hall: dark stone with pale inlays; rear dais, central steps and high green vents;
  projecting two-storey centre porch, floor and rail returns. Wider 14.59.26 and 15.12.15
  corroborate the close-ups. Dimensions remain estimates from photographs.
- Service porch: curled arch cusps and pale edges. Lamp: scalloped oil cups, turned bands
  and alternating pegs on the pale pole.
- Hall capitals: curled brackets now extend beyond their collars in both beam directions
  (`cd7e8d9`); wheel/geometry and paired camera captures passed.
- Outer pedestal faces now have approximate procedural floral relief (`7ae7b3d`), supported
  by 15.13.51 / 15.12.15. Inner bases and deity engravings remain unresolved.
- Porch-side blue window **is confirmed** by 15.02.27, 15.03.47 and 15.10.30. The plain-wall
  15.10.34 view likely crops it out. Placement relative to the stair door still needs alignment.
- Wheel/geometry passed each geometry checkpoint. Browser verification after the hall
  changes: 58 destinations, 60 routes, no failures/errors. Final integration checks pending.
- Native hall renders: `blender/build/fidelity-session-hall` in the photoreal worktree;
  procedural inlays now survive export. Window `fidelity-session-window-exposure` uses a
  diagnostic exposure of 3.3 stops; it does not change the saved blend. Interiors remain dark.
  Statue photo cards remain a fidelity limitation, especially in native exports.
- Native materials (`48c2fc5` on `photoreal`): 56 authored procedural images supply 173
  material maps, with original UV transforms. Stair diamonds and paint are retained; no photo
  textures exported. Blender image/link/UV-seam checks passed. Geometry object transforms
  are unchanged. See the native material review for fixed-camera comparisons and provenance.
- EXIF exposure (`ec2064f` on `photoreal`): the window photos used 1/14 s, ISO 125 versus
  the exterior reference's 1/203 s, ISO 50, both f/2.6. Their +5.180-stop difference gives
  a useful window render at 6.480 stops. This is a relative estimate, not absolute calibration.
  `blender/photo_exposure.py` creates an ignored profile for `render_poses.py --exposure-profile`;
  the renderer records camera matrices and per-view exposure without saving the blend.

**Pose-file audit:** opening alignment auto-synced `align-poses.json`, refreshing its export
timestamp. All paired review cameras match, but full historical file equality is unverified.
The capture harness now blocks writes and checks the source hash before/after. The viewer
now caches loaded poses without writing the source; explicit Save/Import still persist.
Photographs and `docs/photo-findings.json` are untouched. User-only layout decisions remain open.

## Initial Codex fidelity pass (2026-09-27)

Geometry checkpoint: `03d5fba` on `main`, merged into `photoreal`. Nothing pushed or deployed.

- **House:** the +x sitting window has a real 1.9 m rounded recess, 0.18 m deep; the opposite
  window is unchanged (14.56.56, 14.57.08).
- **Adjacent building:** four inner lower columns, 3.5 m behind the front row; heavier lower
  shafts, bases, inset panels and diamond relief. Upper columns and plinth stay unchanged
  (15.13.51, 15.19.57). Exact inner-row depth remains an estimate: the older findings disagree.
- **Lamp:** moved to (38.7, 11.2), with shelter and pale pole. The bell-return viewpoint and
  tour now go around it. The pole's exact relation to the flagstaff remains approximate.
- **Service porch:** moved 1.5 m west, deepened to 2.7 m behind the front piers, with a west
  scalloped arch and a 0.21 m inner step. Removed intersecting portico/frontage solids and
  connected the floor to the hall. The adjoining blue window was deferred; see the updated
  evidence above. 15.10.43 still needs re-alignment.

Local review: `checks/fidelity/REVIEW.md` and its four photo/before/after sheets. Cameras stay
fixed between renders. The 15.13.51 close-up uses a labelled +1.18 m diagnostic eye height in
both versions; its saved pose is at the raised floor and needs re-saving. See the pose-file
audit above for the automatic metadata rewrite discovered later.

Blender: rebuilt from this checkpoint; nine saved-camera renders and sheets are under
`D:\repos\shankaranarayana-photoreal\blender\build\fidelity-20260927` (ignored). The render
manifest records the source revisions. A separate `fidelity-20260927-diagnostic` folder has
the raised column camera. Interior window lighting is dark; use the web sheets for geometry
review. Unreal was not rebuilt in this pass.

Verification: wheel/geometry, browser routes, views, shrine platforms, lake stairs, gamepad,
photo alignment, mobile landscape and mobile rendering passed. Browser verification reports
58 clear destinations, 54 route segments, no route failures or page errors. New regressions
cover the actual window recess, column aisles, lamp sightlines, tour clearance and porch interior.

## Layout of the work

- **Web app: the source of truth.** `dist/src/*.js` on `main` in this repo:
  - `kit.js`: shared helpers, plus the registries `K.colliders`, `surfaces`, `ramps`, `roofs`
    and `labels`, and `K.houseShiftX = -3.8`.
  - `house.js`: authored at x=0 and placed by `K.houseShiftX`.
  - `temple.js`, `landscape.js`.
  - `main.js`: viewpoints (`destinations`, `photos`), the ground slabs and the lake plane.
  - `tour.js`: the tour.
  - `photo-alignment.js`: the align tool.
- **Blender and Unreal pipeline:** the `photoreal` branch, checked out as a worktree at
  `D:\repos\shankaranarayana-photoreal`. It regenerates everything from the web model; nothing
  is authored there by hand.
  - **Merge `main` into `photoreal` before every render or rebuild.** `blender/export-scene.mjs`
    reads that worktree's own `dist/`, so without the merge it renders a stale model.
  - Order: `export-scene.mjs` → `build_blockout.py` (cameras from
    `F:/Shankaranarayana/align-poses.json`) → `lookdev.py` → `render_poses.py` / `contact_sheet.py`.
    Each script's docstring gives its exact command.
  - Export now needs `@napi-rs/canvas` (declared in the photoreal package). This machine's
    installed copy can be selected with
    `$env:CANVAS_MODULE='C:/Users/abhis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'`.
    Use `--python-exit-code 1` for automated Blender commands, then run
    `blender -b blender/build/lookdev.blend --python-exit-code 1 -P blender/verify_materials.py`.
  - Unreal: `export_unreal.py` → `unreal/scripts/import_scene.py` → `materials.py` →
    `build_level.py`, each run with `UnrealEditor-Cmd.exe <uproject> -run=pythonscript -script=...`.
  - Copy `nav.json`, `tour.json` and `views.json` into `blender/build/unreal/` after the export.
  - Run those steps in that order; each takes a few minutes. UE is at `I:\Epic\UE_5.8`, and the
    project lives at `unreal/Shankaranarayana` (gitignored).
  - To play: `UnrealEditor.exe <uproject> -game -ExecCmds="DisableAllScreenMessages"`.
  - In-game screenshot: add `py unreal/scripts/game_shot.py OUT.png 900` to `-ExecCmds`.
- **Private photos:** in `F:\Shankaranarayana`. Read them only; never copy them into the repo.
  The user's saved poses and notes are in `align-poses.json` there, and the align tool writes
  that file through `server.mjs`.

## Tests

The tests need Node 24 and Playwright with Edge, and a server on http://127.0.0.1:4173 (`node server.mjs`):

```powershell
$taskNode='C:/Users/abhis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
$env:PLAYWRIGHT_MODULE='C:/Users/abhis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
$env:BROWSER_CHANNEL='msedge'
& $taskNode tests/wheel-movement.mjs  # required before geometry commits
if ($LASTEXITCODE) { throw 'Geometry/navigation failed' }
foreach ($test in @('verify','views','lake-stairs','shrine-platforms','photo-alignment','gamepad','landscape-mobile','mobile-rendering')) {
  & $taskNode "tests/$test.cjs"
  if ($LASTEXITCODE) { throw "$test failed" }
}
```

A `verify.cjs` failure of `net::ERR_NO_BUFFER_SPACE` is transient; rerun it. The git index has
been seen to empty itself. Before each commit, check that `git ls-files | wc -l` equals
`git ls-tree -r HEAD --name-only | wc -l`.

Idioms used in the model code:
- Large layout changes are done as post-passes over the objects and nav entries a section added,
  recorded with `navStart`-style index snapshots. Examples: the house shift in house.js; the
  east-range shift, the frontage rework and the east upper storey at the end of temple.js; and in
  landscape.js the far-bank shift, the far-bank terrace lift and the adjacent building's plinth raise.
- Moving geometry means moving its `K.blocker`, `K.surface` and `K.ramp` entries, its
  viewpoints, its tour stops, and the tests' hard-coded coordinates along with it.

## Done on 2026-09-26

All 159 aligned poses were rendered and compared with their photos. The per-photo findings
are in `docs/photo-findings.json`; they describe the model before the commits below.
Implemented (`git log d7f1b8f..HEAD`) wherever two or more photos agreed:

- **Temple:**
  - Courtyard: the user's notes on 15.11.08, 15.03.33, 15.03.38 and 15.04.55.
  - The upper hall's open central bay with the stair well and name board.
  - Upper storeys on the rear range and on the east range's north part.
  - The right hall, three windows long.
  - The flagstaff, about 18.7 m.
  - The inner spire, about 11 m.
  - The ceremonial bay at the covered hall's far end.
  - No east colonnade in front of the shutter bay.
  - The pale pole at the lamp plinth.
  - The road-corner frontage extended to x 35, with the portico starting there.
  - The God room's doorway shelf, guardian figures, inner gate and open blue leaves.
  - The entrance doorway narrowed to about 1.45 m.
  - The pond moved 1.8 m west.
  - The marble dado.
- **Tank:**
  - The far bank has tall tiers, a ledge and a wall, with the ground behind raised to 1.38 m.
  - Both side banks have a dark parapet with white posts.
  - The arcade has an east-end room and a slim west-end pier.
- **Adjacent building:** a 2.8 m plinth with a plain lower flight and stair elephants. The shop's cream end block comes down to the ground.
- **House:**
  - The God room's stone posts are on its east side.
  - The east veranda edge matches the west one.
  - The rear strip has an aqua wall.
  - The grinding bowl is in the rear strip.
- **Unreal:** the black view was an exposure setup problem; also fixed white foliage and the lake water.

## Decisions only the user can make (don't guess)

1. **15.03.38 / 15.04.55.** The red old-shrine east wall was brought out to the white front
   block at x 48.1. The other reading of the note is to cut the white block back to about 46.2
   instead. Renders suggest the passage is now narrower than in the photo. Ask the user which
   they meant.
2. **15.03.33, "path extend farther".** Should the courtyard's far end (the rear range, z about
   35–38) move back 5–10 m? Two nearby photos disagree on the distance.
3. **Water level.** 15.23.25 and 15.23.32 show the house-side tank wall 2–2.4 m above the water;
   the model has about 1.1 m. Lowering the water about 1 m means reworking every tier, ledge and
   bathing step. The far bank would then total about 3.5 m, which also matches its photos better.
4. **47 poorly aligned poses need re-saving by the user.** They are the photos marked
   `"alignment":"poor"` in `docs/photo-findings.json`, which includes a suggested correction for
   each. The far-bank poses (15.21.53, 15.21.56, 15.22.03, 15.23.02, 15.23.05) now sit below
   the raised ground.
5. **The user's 15.30.09 note** says the far bank is closer at the lake's west end. That
   conflicts with the satellite-derived tank outline (z -9..-37), so it's unresolved.

## Remaining findings that could be done without the user

Ordered by support. Check each against the photo before changing anything, because poses can be
off by 1 m and a few degrees.

- **Two photos agree:**
  - Columns, service porch, sitting-window recess and lamp placement: addressed in the Codex
    pass above; use its comparison sheets and caveats before changing them again.
  - West bank of the tank: a straight stair up the tiers at about z -23 to -30 (15.23.38,
    15.23.35, 15.21.56, 15.22.00).
  - Covered hall (temple.js "Covered hall"): two lane-side windows instead of three
    (IMG_20130720_180635); an open door and street shutter at the entrance end (two of the named
    "temple right side" photos). Those photos are from 2013 or undated, so they may show later changes.
- **Single photo, confidence 0.6 or more:** see `docs/photo-findings.json`. Highlights:
  - Adjacent building: a projecting central two-storey porch and a larger gable (14.59.26).
  - East range: the shallow blue shrine and the open kitchen hall (15.04.08).
  - Bell platform: a second pier (15.14.44).
  - Temple entrance side platforms: higher, at about 1.15 m (15.16.09).

Photos from different years exist: `2011-09-21 *` is one afternoon, `IMG_20130720_*` is July
2013, and the descriptively named files are undated. A conflict between sets may be a real
change over time.
