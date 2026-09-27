# Handoff (2026-09-27)

Claude's reconstruction handoff, updated after the local Codex fidelity pass below.
Read AGENTS.md first; its rules (local commits only, no push or deploy, private photos never
committed) still apply.

## House right entrance repair (2026-09-27)

Reference: `IMG_20130720_175312.jpg`; user-confirmed pose saved at 20:39:15 UTC.
Use it unchanged. Earlier `175312-pose-height` advice is superseded.

- Assuming the house faces east (-Z), moved the stepped pedestal 1.65 m east
  and 0.50 m south onto the entrance ledge; used the pale 2013 finish.
- Peach round and octagonal timber pillars now sit near the frame center. Removed
  the intervening narrow partition and connected the supports with a ceiling bearer.
- Three red treads ascend northward (-X). Cut a genuine lower floor pocket in the
  old solid front slab; preserve access to the inner sitting platform.
- Desk moved to the north platform edge; its viewpoint and the walking tour follow
  the corrected layout. Placement distances and unseen connections remain estimates.
- Local original/before/after: `checks/fidelity-house-right/REVIEW.md`.
  Photos and user poses unchanged; no media added to Git. Rear temple draft separate.

## Northwest layout follow-up (2026-09-27)

User references: `15.10.34`, then `15.10.30` from the same place turned left
45 degrees, then the entrance view `15.02.00`. These supersede the earlier
speculative corner-arch connection. Local review: `checks/fidelity-nw-layout/REVIEW.md`.

- Central stair door stays fixed. Its plain left wall is 1.35 m wider.
- Blue bay moves 3.70 m inward along -X, inside the round-column line; the street
  building is hollowed there. A level connection joins the raised chair platform.
- Removed the invented projecting corner arch. The barred window now occupies
  the white wall between the blue bay and stair wall.
- Tulsi moves 0.50 m along -X and 1.90 m along -Z (including the user-requested
  additional 0.35 m northward nudge), opening the court and placing it
  farther right in the entrance view. The rest of the temple was not translated.
- Distances are estimates. The foreground column, roof proportions and lighting
  still differ from the photos. No claim of a fully matched corner.
- Review uses one eye position and a 45-degree turn for the first pair; this is
  an ignored diagnostic copy. Original saved poses and photos remain unchanged.
  The unrelated rear-room draft remains uncommitted; native output is not rebuilt.

## Northwest temple corner correction (2026-09-27)

The user identifies this corner by `IMG_20130720_180635` and `180653`: the chair
hall and scalloped service porch, not the far rear dome room. Local review:
`checks/fidelity-temple-northwest/REVIEW.md`.

- Two high windows flank a solid wall with pilaster, beam and electrical boards.
- The red chair floor is at 0.60 m; the grey passage is at 0.112 m, with access steps.
- The entrance-side hall and exterior stair again meet the existing street wall and
  porch. The wider outer circuit farther back is retained.
- Added the broad corner arch, suspended bell and near barred window. The service
  opening follows the 2013 raised shutter; the 2011 photo has an older panelled door.
- Wheel/geometry and physical window, floor and bidirectional stair routes pass.
  Dimensions, arch connection and furniture details remain approximate. Saved poses
  are unchanged. The far rear-room draft remains separate and uncommitted.

## House entrance correction (2026-09-27)

Primary reference: `IMG_20130720_175306.jpg`, plus the user's confirmation of an open
lower passage and nearly symmetrical furnished platforms. Door opening reduced from
2.05 m to an estimated 1.20 m; shorter leaves expose both bays. Chairs moved back
0.32 m to clear access around the posts; the other platform now has a storage trunk,
and a metal vessel follows the reference. Platform sizes and levels are unchanged.
Original / before / after: `checks/fidelity-house-entry/REVIEW.md` (local, ignored).
Wheel/geometry and explicit platform access/visibility regressions pass. Exact room
widths and object details remain estimates; this is a bounded entrance repair.
The unfinished temple rear-room geometry is separate, uncommitted work.

## Review workflow

After each major improvement, create a local `REVIEW.md` with original / before / after
images from matching cameras, source revisions, and short notes on changes and uncertainties.
Preserve earlier reviews; label diagnostic camera or lighting adjustments. Keep photo-bearing
reviews ignored and local, block source-file writes during capture, and link the new review
in the progress update. This is the user's preferred review format.
The local index is `checks/REVIEW.md`.

Use `tools/capture-fidelity.cjs <new-batch-name>` with `PHOTO_TIMES=HH.MM.SS,...`,
`PLAYWRIGHT_MODULE` and `BROWSER_CHANNEL` from the test setup below. Outputs go under
`checks/fidelity/`; writes to local photos are blocked and loaded JS hashes recorded.
Optional `FIDELITY_BASELINE=<commit>` substitutes only house/temple/landscape geometry;
`FIDELITY_RAISED_HALL=1` adds the labelled +1.18 m diagnostic. Pair captures with
`tools/fidelity-review.py --help`. Both tools preserve existing output directories.

## Continued fidelity session (2026-09-27, ongoing)

Geometry through `b8b8a66`, starting from `2ea3ff9`; local only. Review:
`checks/fidelity-session/REVIEW.md` (original / session start / current).
Later reviews: `checks/fidelity-capitals/REVIEW.md` and
`checks/fidelity-native-materials/REVIEW.md`; earlier reviews are preserved.
Also see `checks/fidelity-pedestals/REVIEW.md` and
`checks/fidelity-window-exposure/REVIEW.md`.
The cumulative nine-view review is `checks/fidelity-final/REVIEW.md`.
Final native comparisons: `checks/fidelity-final-native/REVIEW.md`.
Start the user work with `checks/fidelity-user-decisions/REVIEW.md`; it shows obstructed
anchor cameras and the remaining layout choices, and links the 47-pose historical queue.

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
- Balcony balusters now use the photographed flat forked profile (`fec42f2`);
  `checks/fidelity-balcony/REVIEW.md`. The sitting chair has lower back/arms, and the window
  has its hanging wire (`b8b8a66`); `checks/fidelity-sitting-details/REVIEW.md`.
- Porch-side blue window **is confirmed** by 15.02.27, 15.03.47 and 15.10.30. The plain-wall
  15.10.34 view likely crops it out. Placement relative to the stair door still needs alignment.
- Wheel/geometry passed each geometry checkpoint. Final browser verification: 58 destinations,
  60 routes, no failures/errors. Views, lake stairs, shrine platforms, alignment, gamepad,
  mobile landscape and mobile rendering also passed; logs are in `checks/fidelity-session/`.
- Native refreshed: eight views in `blender/build/final-integrated-{window,exterior,diagnostic}`
  on `photoreal`, with source/asset hashes in each `provenance.json`. They use the audited
  `f58176b1...` pose-file snapshot; later alignment updates are noted below.
  Exterior exposure is 1.3, windows use the EXIF profile below. The hall close-up is labelled
  +1.18 m diagnostic. Browser/native camera transforms and geometry sources were cross-checked.
- Native photo textures (`a204be1`): 22 material maps from 11 explicitly approved web assets
  restore the previously blank figure panels. Private reference media remain excluded.
  `checks/fidelity-native-photo-cards/REVIEW.md`; flat cards remain a limitation.
- Native surface relief (`5359759`): 127 authored bump maps and one roughness map are retained,
  including their channels, strength and UV transforms. Image/link/UV checks pass for 197 color
  maps. Geometry bytes are unchanged. `checks/fidelity-native-relief/REVIEW.md`.
- Native provenance (`e0ec8fe`): saved blends record export, geometry, pose and build-script
  hashes; render batches record the blend, renderer, image assets and camera/exposure settings.
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

**Later alignment updates:** at 17:05 UTC the source pose file began changing after the
captures had finished. A read-only comparison at 17:05:59 found 12 changed cameras; the newer
file was preserved. `blender/build/pose-change-audit.json` records that comparison. The user
decision review is an earlier snapshot, especially 15.04.55 / 15.21.56; recheck their newer
poses before following its camera suggestions. The writer has not yet been identified.
At 17:07:02, the nine-view cumulative review still matched the current saved cameras except
15.10.43, which had also changed. Preserve the review snapshots; refresh only after the
ongoing alignment edits settle.

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

## User decisions (2026-09-27)

1. **Passages must not get narrower: expand everything around them.** Keep the old shrine's red
   east wall flush with the white front block at x 48.1, and widen the courtyard so every passage
   gets back at least its photographed width.
   - East: 15.03.33 and 15.04.55 show about 6–7 m between the shrine plinth and the east veranda
     edge; the model has about 4.3 m (x 48.3 → 52.55). Raise `DX` in the east-range pass at the
     end of temple.js by about 2.5 m. That pass already shifts the range, stretches the paving and
     rear range, and moves navigation. Check the outer wall (it would pass x 57) and the east
     garden (low wall at x 59.5).
   - West: apply the same check to the west corridor (15.11.08: the shrine's west face reads too
     far west; 15.13.11: the west veranda edge sits further out).
   - Rear: 15.03.33's "extend farther" reads the same way. Move the rear range back (5–10 m),
     which also lengthens the side passages.
   - Size each step by re-rendering 15.03.33, 15.03.38, 15.04.55 and 15.11.08 until the passages
     match the photos.
2. **Lower the lake water.** Target the house-side wall about 2.2 m above the water (15.23.25,
   15.23.32), i.e. water from -1.12 to about -2.1.
   - Move the water plane in main.js and any lake-level test; extend the ring courses down; re-cut
     the tiers so the lowest meets the water.
   - Extend the bathing steps, the far-bank short flight and the pavilion base and entry down to
     the new level.
   - The far bank then totals about 3.5 m above the water, which matches its photos.
   - Tests to update: lake-stairs, entrance-geometry lake routes, and anything near the water.
3. **Poses.** The user re-saved all 46 flagged poses on 2026-09-27 (the 47th, lane-left.jpg, has
   no file). The `"alignment":"poor"` marks in `docs/photo-findings.json` are now out of date.
   Decisions 1 and 2 move geometry the user aligned against, so poses in the moved regions will
   need the same transform (see "Preserving poses" below) or re-saving.
4. **Still open: the user's 15.30.09 note** says the far bank is closer at the lake's west end.
   That conflicts with the satellite-derived tank outline (z -9..-37).

## Preserving poses when geometry moves

Poses in `align-poses.json` are absolute world coordinates, fitted to the model as it was when
saved.
- **Model stamp:** each pose saved since 2026-09-27 carries
  `model: {commit, uncommittedEdits}`, from the server's `/model-version` endpoint (HEAD, and
  whether `dist/src` has uncommitted edits). Poses saved earlier were fitted to the model at or
  before `3f46126`. Render a pose's own geometry with `FIDELITY_BASELINE=<commit>`.
- **Pose history:** `F:\Shankaranarayana` is a local-only git repository that tracks only
  `align-*.json` and its `.gitignore`; photos are ignored, and it has no remote. Never add a remote
  or track photos there. `server.mjs` commits each saved file there with the model commit in the
  message; `git -C F:/Shankaranarayana log -p -- align-poses.json` recovers any earlier pose.
- **Migrating:** when a change moves a region (e.g. the east range +2.5 m in x), apply the same
  transform to the poses taken in that region with a small script, commit the result in the pose
  repository, and name the transform in both commit messages.

## Remaining findings that could be done without the user

Ordered by support. Check each against the photo before changing anything, because poses can be
off by 1 m and a few degrees.

- **Two photos agree:**
  - Columns, service porch, sitting-window recess and lamp placement: addressed in the Codex
    pass above; use its comparison sheets and caveats before changing them again.
  - West bank of the tank: 15.23.38 / 15.23.35 confirm a straight stair. Its rise depends on
    the unresolved bank heights/water level above; old notes disagree on location. Resolve
    those dimensions before adding the stair. The paired-flight notes in 15.21.56 / 15.22.00
    may describe another location.
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
