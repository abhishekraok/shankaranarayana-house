# Handoff (2026-09-27)

State of the Shankaranarayana reconstruction when Claude handed it over, and what is left.
Read AGENTS.md first; its rules (local commits only, no push or deploy, private photos never
committed) still apply.

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
  - Unreal: `export_unreal.py` → `unreal/scripts/import_scene.py` → `materials.py` →
    `build_level.py`, each run with `UnrealEditor-Cmd.exe <uproject> -run=pythonscript -script=...`.
  - Copy `nav.json`, `tour.json` and `views.json` into `blender/build/unreal/` after the export.
  - A scripted end-to-end run is sketched in `unreal/scripts/*.py`. UE is at `I:\Epic\UE_5.8`, and the
    project lives at `unreal/Shankaranarayana` (gitignored).
  - To play: `UnrealEditor.exe <uproject> -game -ExecCmds="DisableAllScreenMessages"`.
  - In-game screenshot: add `py unreal/scripts/game_shot.py OUT.png 900` to `-ExecCmds`.
- **Private photos:** in `F:\Shankaranarayana`. Read them only; never copy them into the repo.
  The user's saved poses and notes are in `align-poses.json` there, and the align tool writes
  that file through `server.mjs`.

## Tests

The tests need Node 24 and Playwright with Edge, and a server on http://127.0.0.1:4173 (`node server.mjs`):

```
NODE=C:/Users/abhis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe
PLAYWRIGHT_MODULE=C:/Users/abhis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright
BROWSER_CHANNEL=msedge
$NODE tests/wheel-movement.mjs        # geometry + navigation; runs entrance-geometry.mjs; required before commits
$NODE tests/verify.cjs                # viewpoints and walking routes (routeFailures must be [])
$NODE tests/views.cjs tests/lake-stairs.cjs tests/shrine-platforms.cjs tests/photo-alignment.cjs \
      tests/gamepad.cjs tests/landscape-mobile.cjs tests/mobile-rendering.cjs
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
  - Adjacent building: an inner second row of lower-storey columns about 3.5 m behind the front
    row (15.13.51, 15.19.57), and heavier carved lower columns (15.13.51).
  - Temple service bay (blue scalloped porch, x about 30–34, z about 6.3–7.6): about 2.5–3 m
    deep with an inner step and side scallops (15.10.30, 15.10.43). 15.10.34 also says it sits
    about 1.5 m too far east.
  - House sitting-bay window at house x 3.0: a recessed plaster niche with a rounded head about
    1.9 m wide (14.56.56, 14.57.08).
  - Temple lamp column (deepastambha, `lampX`): nearer the doorway axis, x about 38.6–39.1
    (15.13.03, 15.15.51). Move its shelter and the pale pole with it.
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
