# Photoreal handoff

## Ownership

On 2026-10-10 the owner expanded Codex's goal to improve both the model and the Unreal game. Model changes land on `main` in the house checkout; Blender, Unreal, materials, lighting and rendered reviews remain on `photoreal`. Never edit `dist/` here: merge model changes from `main`. Local commits only; no private photographs or generated binaries in commits.

Before every render batch or Unreal rebuild, run `git merge main`. For conflicts in `dist/` or `tests/`, use main's version. Refresh generated scenes when their model source hashes differ. After each merge, produce all aligned poses under `blender/build/sheets-<main short hash>/`, with a searchable overview and explicit coverage count. Retain before/after Markdown reviews after major improvements. Do not modify the alignment server or the pose repository; read poses and photographs in place.

## 2026-10-11 roofscape, materials and Continue

Main `1bec521` is rebuilt with the stepped central canopy, denser parapet bays,
rust slot cover, lane awning and salmon flat roof. All 172 poses / 29 sheets were
independently compared with `ad2b8a7`; no substantial new regression found. Bronze
bells and four carved stone courses now shade correctly after exclusive native
instance emission overrides. Source colors, global lighting and saved poses stay fixed.

Fresh scene/material/lighting audits, Windows package and isolated smoke/cold restart
pass. Final capture exited cleanly (0). Lumen setup wrote its fresh audit and then
exited abnormally during shutdown; subsequent audits/package/capture passed.
Continue now preserves a valid dry-bank save when its resting capsule needs a small,
checked entry adjustment; the reproduced cold-restart failure and fix are recorded
in [Continue review](D:/repos/shankaranarayana-photoreal/docs/review-2026-10-11-cold-continue.md).

[Current overview](D:/repos/shankaranarayana-photoreal/blender/build/sheets-1bec521/unreal-20261011-025548/index.html),
[before/after](D:/repos/shankaranarayana-photoreal/unreal/reviews/roofscape-materials-2026-10-11.md).

| Photo | Remaining substantial work | Render |
|---|---|---|
| 2011-09-21 15.25.49 / 15.26.49 | Owner-requested vehicle-width brown road and high greenery west of the lake: reviewed source `b3b0f63` awaits native integration and actual edge walking. | [15.25.49](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-1bec521/unreal-20261011-025548/090-2011-09-21 15.25.49.png>) |
| 2011-09-21 15.13.03 / 15.13.07 | Inner shelter's grey-blue gables remain pale. A front-face-only instance emission trial is proposed; no tint/global lighting change justified yet. Floral parapet uses a shared masked material and is deferred. | [15.13.03](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-1bec521/unreal-20261011-025548/071-2011-09-21 15.13.03.png>) |

## 2026-10-11 earlier roof and water pass

Main `ad2b8a7` adds the split inner shelter, central opening and supported white
platform-hall ceiling. All 172 aligned renders / 29 sheets were reviewed with no
major new regression; source geometry/navigation and native scene/material/lighting
audits pass. The editor exited with access violation `-1073741819` after closing
its shutdown log: complete images, abnormal process exit. Native package checks
are tracked separately.

The lake's invisible collision floor is removed persistently. The isolated native
probe and final package smoke now recover locally at both water areas and permit
reverse escape. Package and cold restart pass. The initialized 1600×900 tour holds
60 fps (final 1,000 frames: 16.667 ms median, 16.671 ms p99, zero over 33.333 ms).
This is one route segment, not a full-route or uncapped benchmark. Checked placement handles the
pond's native capsule overlap without disabling terrain/wall collision. The
overlap identifies `landscape_03`, not an individual source triangle.

[Current overview](D:/repos/shankaranarayana-photoreal/blender/build/sheets-ad2b8a7/unreal-20261011-013052/index.html),
[before/after](D:/repos/shankaranarayana-photoreal/unreal/reviews/roof-water-2026-10-11.md).

| Photo | Remaining substantial work | Render |
|---|---|---|
| 2011-09-21 15.13.03.jpg, 15.13.07.jpg | Rust slot roof, dark side parapets and stepped central canopy: resolved in `1bec521`. | [Earlier 15.13.03](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-ad2b8a7/unreal-20261011-013052/071-2011-09-21 15.13.03.png>) |
| 2011-09-21 15.08.10.jpg | Native bell emission: resolved by the saved instance override in the latest capture. | [Earlier 15.08.10](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-ad2b8a7/unreal-20261011-013052/131-2011-09-21 15.08.10.png>) |

## 2026-10-10 model and game pass

Model main `03502e1` includes the lower front floors/rear marble ledges, five-bay road frontage and raised marble court porticos. Source walking/tour checks, native package, stair walking, settings and cold restart pass. Windows DPI readback confirms the full 3840×2160 monitor and 2.5× interface scale. All 172 aligned poses / 29 sheets were reviewed without a major new regression; one missing reference does not omit its render. Saved photo poses remain unchanged.

[Current overview](D:/repos/shankaranarayana-photoreal/blender/build/sheets-03502e1/unreal-20261011-002917/index.html),
[before/after](D:/repos/shankaranarayana-photoreal/unreal/reviews/model-game-2026-10-10.md).

The split roof and flat-ceiling findings from this batch are corrected in `ad2b8a7`.

## 2026-10-04 early morning (Claude)

Main moved about 150 commits (house, temple and lake fixes from the photo review, a sweep for odd or unreal
things, tour smoothing, web interface and web lighting); `HANDOFF.md` on main has the details. The game was
rebuilt from main `3abfe30` at 02:27 and passes smoke and cold restart. Lighting and textures here were not
retuned (the owner is happy with Codex's pass).

Script changes on this branch, all because main's model changed under hard-wired expectations:
- `material_targets.py`, `export_unreal.py`, `verify_materials.py`: the courtyard fence override is optional.
  Main now authors the rear fence as a bleached slat screen in materials of its own, so the structural timber
  gain no longer reaches it and `courtyard_fence_override()` returns None.
- `materials.py`: the temple paving material may also be used by 'Covered hall lower grey walking floor'; stale
  material slots left by a re-import are skipped when the fresh GLB has no material of that name (unnamed web
  materials are named by index, so indices shift when main adds materials); the non-foliage name list lost
  'Shrine east window deep pale canopy' (now a timber hood).
- Any emissive web material becomes a plain glow here: main's entrance door panels briefly had an emissive map
  and rendered as white blanks; main no longer uses emissive maps on panels.

Codex's findings in the table below: the arch infill (15.11.08 / 15.11.17) and the chair hall's lane wall are
fixed on main; the camera inside the east passage pier (14.31.25) is fixed (the wall is thinner and further
forward); the notice in front of 14.58.02 / 14.58.05 is smaller and moved to the bathing gate; the other poses
are in the owner's re-alignment list in HANDOFF.md.

## 2026-10-03 model follow-up

Reviewed all 172 aligned poses at main `30e9675`; baseline overview:
[full sheets](D:/repos/shankaranarayana-photoreal/blender/build/sheets-30e9675/unreal-20261002-230334/index.html).
Model source and the F: pose repository were not changed.

Latest accepted review: [172 renders / 29 sheets](D:/repos/shankaranarayana-photoreal/blender/build/sheets-30e9675/unreal-20261003-093203/index.html), clean editor exit; all sheets reviewed.
See [before/after](D:/repos/shankaranarayana-photoreal/unreal/reviews/fidelity-2026-10-03.md).
The later [water review](D:/repos/shankaranarayana-photoreal/unreal/reviews/water-2026-10-03.md)
removes the repeated ripple grid; close-view brightness remains unresolved.
The [timber review](D:/repos/shankaranarayana-photoreal/unreal/reviews/timber-2026-10-03.md)
improves veranda posts with gain 1.5. The later
[fence correction](D:/repos/shankaranarayana-photoreal/unreal/reviews/fence-2026-10-03.md)
restores gain 1.0 only on 21 courtyard boards/uprights, preserving all model geometry.
Entrance spill remains a documented timber tradeoff; global lighting and stone lintels
remain unchanged. [Water volume trials](D:/repos/shankaranarayana-photoreal/unreal/reviews/water-volume-2026-10-03.md)
were rejected: close-view darkening damaged the distant lake.
The rebuilt package passes walking/menu/alignment/notes checks and a separate cold-restart
save check. Generated media and binaries remain ignored.

[Runtime timing](D:/repos/shankaranarayana-photoreal/unreal/reviews/runtime-2026-10-03.md):
two clean later-start captures hold the 60 fps cap in their final 1,000-frame tour
samples. Actual defaults are 1280×720, quality 2 and scale 87%; no uncapped/full-route
performance claim. Boot-start CSV profiling reproduces a shutdown failure; use
`unreal/profile-runtime.ps1`, whose reports and saves are isolated.

Remaining photoreal priorities: close-view water brightness, weathered surface detail,
and stone ceiling/lintel appearance. Global exposure, bounce, water roughness, uniform
volume and scattering-phase trials did not improve the multi-view match. Investigate
environment/reflection geometry with separate evidence before further water tuning.
Stale/intersecting poses still need source-owner review.

| Photos | Finding for Claude | Render evidence |
|---|---|---|
| 2011-09-21 15.01.56.jpg | A close orange foreground surface hides nearly the entire photographed blue-door facade. This predates the fence material change; revalidate the saved eye against the current bell/support geometry before changing illumination or placement. Attribution remains unresolved. | [15.01.56](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-30e9675/unreal-20261003-093203/018-2011-09-21 15.01.56.png>) |
| 2011-09-21 15.11.08.jpg, 15.11.17.jpg | The left courtyard shelter has solid white infill between arches where the photographs show recessed dark openings. The saved 15.11.08 note also flags the extra wall. Check infill/opening topology and pose together; this is an existing model mismatch, not a fence regression. | [15.11.08](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-30e9675/unreal-20261003-093203/031-2011-09-21 15.11.08.png>), [15.11.17](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-30e9675/unreal-20261003-093203/032-2011-09-21 15.11.17.png>) |
| 2011-09-21 15.10.30.jpg, 15.11.00.jpg; IMG_20130720_180635.jpg; temple right side facing -45 degrees from the entrance.jpg | Northwest chair hall still ends in a short closed wall. Photos support an open lane doorway/transom, narrow window and red dado. Consolidate existing temple fix 23 and the pending hall-width decision; absolute depth/anchor is unresolved. Preserve the raised chair floor and lower walkway. | [15.10.30](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-30e9675/unreal-20261002-230334/132-2011-09-21 15.10.30.png>), [15.11.00](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-30e9675/unreal-20261002-230334/135-2011-09-21 15.11.00.png>), [180635](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-30e9675/unreal-20261002-230334/144-IMG_20130720_180635.png>), [-45°](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-30e9675/unreal-20261002-230334/150-temple right side facing -45 degrees from the entrance.png>) |
| 2011-09-21 14.58.02.jpg, 14.58.05.jpg | September 26 eyes now face the yellow notice added October 2 in `f9d6243`, 2.3–3 m ahead. Re-align these stale poses before judging notice placement; its addition has separate photo evidence. | [14.58.02](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-30e9675/unreal-20261002-230334/008-2011-09-21 14.58.02.png>), [14.58.05](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-30e9675/unreal-20261002-230334/028-2011-09-21 14.58.05.png>) |
| 2011-09-21 15.14.56.jpg; 15.02.00.jpg | The 15.14.56 eye predates the paired-column rebuild `3485123`; its nearby round column now blocks the hall. Revalidate the pose before changing that column. The broad white obstruction at right in 15.02.00 has weaker attribution because that wall already existed; check the entrance eye against the current bell/stair-wall layout. | [15.14.56](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-30e9675/unreal-20261002-230334/059-2011-09-21 15.14.56.png>), [15.02.00](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-30e9675/unreal-20261002-230334/019-2011-09-21 15.02.00.png>) |
| 2011-09-21 14.31.25.jpg | Saved eye `(5.53990, 1.72165, 5.81228)` in Three metres is inside the solid `East passage front end wall pier`. A source triangle blocks the forward ray after 0.201 m; raster back-face culling reveals the room while Lumen tracing hits the pier. Revalidate model/pose compatibility; do not infer a global house lighting failure or compensate with exposure from this view. | [Native render](<D:/repos/shankaranarayana-photoreal/checks/fidelity-20261002/partitioned/010-2011-09-21 14.31.25.png>), [source-ray evidence](D:/repos/shankaranarayana-photoreal/checks/fidelity-20261002/camera-solid-diagnostic.json) |
| 2011-09-21 15.04.51.jpg, 15.05.48.jpg, 15.25.49.jpg | Nearby surfaces hide most of the photographed court/shrine or lake. Revalidate these saved eyes against current geometry before adjusting placement or illumination; the cause is not established by these frames alone. | [15.04.51](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-30e9675/unreal-20261003-055524/068-2011-09-21 15.04.51.png>), [15.05.48](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-30e9675/unreal-20261003-055524/070-2011-09-21 15.05.48.png>), [15.25.49](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-30e9675/unreal-20261003-055524/090-2011-09-21 15.25.49.png>) |

The old near-wall obstructions in 15.04.59 and 15.30.09 are cleared. Entrance
175306/175312 now has the required passage, platforms and pillars. No new
high-confidence local house geometry fix emerged; wider house proportions and
hall width remain the existing plan decisions. Furnishing omissions were intentional.

## Game checkpoint

`d693dce`: native walking game, menus, saves, settings, journal and lighting. Packaged runtime and cold-restart save checks passed. Launch `unreal/play.cmd`. Local before/after review: `checks/unreal-walk/REVIEW.md`.

Follow-up: native export partitioned into 13 groups (at most 48 material sections) so Nanite builds successfully. All 3,683,335 triangles, bounds and transforms match the former export. Full collision fallback and material assignment pass a fresh-process audit. The packaged game passes walking and save/resume checks without shadow-overflow warnings. The final renderer overview is `blender/build/sheets-20769d9/unreal-20260927-155405/`.

## Model findings

Update from Claude's `7e51aa6` handoff: the frontage and tall far-bank palms are
addressed (`9ca695f`, `d569e24`) and merged here. Claude identifies 15.04.59,
15.14.51 and 15.11.45 as misplaced cameras; 15.03.38 needs its eye shifted east.
Treat those older rows below as pose checks, not requests to change geometry.
The 18:44 pose snapshot includes 11 updated cameras, but the three far-bank
height corrections in that handoff have been overwritten: 15.22.00 and 15.22.06
are back at y=1.732 instead of 3.112; 15.22.36 is back at 1.68 instead of 3.06.
The 18:35 snapshot retained the corrected heights. No pose file was changed here.

Main `20769d9`; poses snapshot SHA-256 `ce463cf7373fa84b511b4969ff62b4c5207156e8af22496c3e47aaa878d4c630`. Overview: `blender/build/sheets-20769d9/REVIEW.md`. No geometry was changed during this review.

Prioritize these large mismatches. Occlusion can indicate a pose made before geometry moved; check that before inferring dimensions. Camera position, quaternion and FOV are preserved.

| Photo | Finding for Claude | Local render |
|---|---|---|
| 2011-09-21 15.04.59.jpg | Almost the entire shrine view is blocked by a nearby surface. Check camera/model compatibility before detailing the shrine. | [Render](<blender/build/sheets-20769d9/unreal-20260927-152002/029-2011-09-21 15.04.59.png>) |
| 2011-09-21 15.30.09.jpg | A nearby wall blocks most of the right half; the photograph has an open lake view. Check the upstairs opening and saved eye location. | [Render](<blender/build/sheets-20769d9/unreal-20260927-152002/051-2011-09-21 15.30.09.png>) |
| 2011-09-21 14.59.21.jpg | Ground-floor facade opening layout differs: the photo's window and doorway sequence is replaced by large blank bays. | [Render](<blender/build/sheets-20769d9/unreal-20260927-152002/012-2011-09-21 14.59.21.png>) |
| 2011-09-21 15.03.38.jpg | The right foreground bay/column crowds the passage view; the photo instead shows a long white wall face. Verify placement against the adjacent views. | [Render](<blender/build/sheets-20769d9/unreal-20260927-152002/025-2011-09-21 15.03.38.png>) |
| 2011-09-21 15.11.45.jpg | The photographed stair opening is framed by white perforated railings; the model view shows broad plain red rails and a different opening. Check saved-pose/model compatibility and railing placement. | [Render](<blender/build/sheets-20769d9/unreal-20260927-164751/033-2011-09-21 15.11.45.png>) |
| 2011-09-21 15.14.51.jpg | Photo centers the hanging bell and carved support; the model view is largely occluded by a nearby plain column/wall. Check the saved eye and the support position before detailing. | [Render](<blender/build/sheets-20769d9/unreal-20260927-164751/058-2011-09-21 15.14.51.png>) |

## 2026-10-01 pass

- Game: photo alignment mode and notes (see `unreal/README.md`); temple places follow the web
  model's 4.5 m setback; white balance 5900 K.
- `blender/build/claude-rebuild.sh` judges `configure_lumen` by its audit file: the full editor can
  segfault while quitting after the script has finished, which used to stop the whole rebuild.
- Checked in Unreal after rebuilds (capture_poses.py): God room front wall and doorway, front room,
  forecourt with the set-back temple, road-corner frontage bays, courtyard grass tufts. All render as
  on the web. Tinted instanced tufts (white base, per-instance colour) come through correctly.
- Still open: covered areas about twice as bright as the photos (see the lighting diagnostics below);
  forecourt soil reads smoother than on the web.

## 2026-10-02 morning

- `materials.py` `GAME_TINT`: linear multipliers on the instance colour by web material name, for
  finishes the sky light lifts far above the photos while the web colour is right. Tank stone .32,
  tread tops .4, the court's sheet barrier .65, the house roof courses .5. A name must belong to one
  material object in the web model: clones sharing a name collide here (the west shed roof went
  white when the shared dark tile was named).
- Three web roofs were wound upside down and rendered black here (wing roof 7,5,4); fixed in the web
  model, checked by `node tools/scan-roof-normals.mjs` on `main`.
- Samples at the 08:23 build against the photos: tank face 74,73,78 / 82,71,79; house roof 96,85,92 /
  108,97,108; wing roof 143,134,131 / 116,101,113; barrier 176,129,128 / 160,122,120; veranda points
  at 14.56.30 unchanged. Off: arcade roof 66,60,59 / 97,87,95; court soil grey-brown, not laterite.
- The web model's light was moved to an afternoon sun on `main`; nothing here changed for it. The
  soft sun in `build_level.py` (yaw 200) was not checked against the photos' south-west sun.

## Remaining photoreal work

- Claude pass (2026-09-28 night; Codex no longer works on this project). Merged main
  `fe5f680`; the exporter now evaluates main.js `farZ` expressions (lake, ground) and passes
  `farZ`/`farZinv` to the navigation; the Blender tour includes the opening flight. Full
  rebuild (lookdev, export, import, materials, level, Lumen, finish) and scene audit passed.
  Full review: `blender/build/sheets-9b9e2bb/unreal-20260928-231937/`.
  - Tiled roofs weathered to dark clay in both Blender and Unreal: a material counts when
    most users are tiled roofs/tile courses/ridges; multiplier (0.30, 0.27, 0.25).
  - Tank water: instance scattering (.016,.045,.012), absorption (.34,.12,.30). Its mean
    colour now matches 15.23.35, but it reads flat and over-saturated without reflections.
  - `review-poses.ps1 -NoMerge` captures the scene as exported when main has moved on.
  - Tried: a foliage master (world-space speckle, clumps and scattered normals). The crown
    material is mapped (procedural), so it needs the mapped masters; even with those the crown
    region was unchanged in captures. Check whether build_level assigns component material
    overrides to the instanced crowns before trying again. Reverted.
  - Pass 2 (main `c6590e1`): foliage masters now apply (master graph edits need
    `materials.py --rebuild`; `claude-rebuild.sh` passes it). Distant crowns are lumpy and
    lighter in the model itself. Water retuned to a deep olive green (scattering
    .006/.015/.005, absorption .42/.20/.38). Emission scales with the exported
    `emissiveIntensity` (5x); oil-lamp lights 2 lm, so the sanctum reads dark. Blender leaf
    saturation lifted. Full review at `sheets-a775558/unreal-20260929-002542/`.
  - Pass 3: brass fittings (materials used mostly by the God-room doorway bosses) are warm
    gold, metallic .9, roughness .3 in Unreal. Blender crowns get a Voronoi leaf-cluster bump
    (scale 4) so they read as clumps. Next: water reflections, native-capture GI noise,
    per-photo exposure differences.
  - Pass 4 (main `31def1a`): Lumen hit lighting and quality 2 (reflections, final gather,
    scene lighting) in the post-process volume; tank ripples halved and body colour greyer
    (scattering .010/.014/.009, absorption .30/.22/.29). The pavilion now mirrors in
    14.57.50 as in the photo; the photo water is still brighter (sky sheen). Captures:
    `blender/build/claude-water2/`.
  - Pass 5 (overnight): tour-frame QA in Unreal. Fixed at the source (main): photo crops are
    baked into UVs (texture repeat/offset was lost, so the facade guardian figures showed a whole
    photo); photo panels are lit and single-sided facing the viewer (unlit/back faces were black);
    the pasted naga-stone photo is replaced by modelled stones. Unreal: masked two-sided screens
    get a small self-lit fill (pierced balcony screens read black in shade). Remaining: Unreal
    reads red oxide floors, soil and tank steps lighter/more washed out than the web.
    Checked: their material instances are right (tank wall M_mapped, colour 1 x dark texture,
    sRGB on; wet stone #293b30), so the pale look comes from lighting (Lumen/sky) or a slot
    mismatch on the merged landscape meshes, not the export. Next: view base colour in the
    buffer visualiser at 15.23.35. Package rebuilt (ead700a); smoke test passed.
    Base-colour buffer at 15.23.35 shows the tiers dark, so the pale look is lighting. Tried:
    specular 0.25 (no visible change, reverted); exposure EV 0.4 (little change); a gentle grade
    (contrast 1.12, saturation 1.1, gamma 0.94) kept: soil/tiers slightly darker, water slightly
    darker than the photos. Still open: Lumen/sky ambient on dark rough surfaces.
    2026-09-30 diagnostics (capture_poses.py CAPTURE_CONSOLE / CAPTURE_PP, 15.23.35 and covered
    views 14.56.30, 15.05.42, 15.15.51, 14.31.25): the pale tank tread is not lighting-specific:
    fog, reflections, sky light, Lumen GI and local exposure off each leave it pale; base colour
    is right (#444945). Frame means already match the photos (UE 96-115 vs photo 102-132), so
    exposure offsets only trade dark-surface match for overall darkness (r.ExposureOffset -1 took
    means to ~60). What was wrong and is fixed: a warm cast (blue ~10% low against red);
    white_temp 5900 (5c01c89). Remaining per-surface gap: covered verandas read ~2x the photo
    (14.56.30 floor and pillars); no global setting found that fixes it without darkening the rest.
  - Open (Unreal tour QA 2): courtyard flagstones tile ~3.3x smaller than the web. Export is
    right (matrix repeat 0.3, UVs in metres) and MI_MeshStandardMaterial_333 has UVRow 0.3, but
    stale MIs from earlier exports (e.g. MI_MeshBasicMaterial_333, identity UVRow) remain in
    /Game/Materials/Web; check which MI the paving mesh slot is bound to, and purge stale MIs.
    Also: a black lean-to roof underside (tour 90 s), a pale east awning (108 s), a dark void
    behind the naga pavilion column (54 s), missing straw tufts on the rear roof ridge (198 s).
    Lead on the flagstones: MI bindings are correct (slot N -> MI N), but in the Blender-exported
    temple.glb the largest primitive using the paving material has UVs of about 0..1.4, not the
    metre-scale (+-9.9) UVs in scene.json, so the Blender join/export step rewrites these UVs.
    Fixed: black roof undersides (two-sided sheets get a faint self-lit fill, b393649).
  - ROOT CAUSE FOUND: materials.py wired the UV transform into the texture sample's
    'Coordinates' pin, which does not exist ('UVs'); the connection failed silently, so every
    mapped material in Unreal ignored its three.js repeat/offset since the start. Fixed (now
    asserted): flagstones at the web's scale, the facade stair's diamond tiles appear. Earlier
    workarounds (UV-baked photo crops) remain valid.
  - Next: shrine brass patina, Cycles crown shape/colour, water reflections, GI noise.

- Lighting follow-up: repaired the missing HDR skylight. HDRIBackdrop reset its
  component to a null cubemap on reload; a native skylight now retains the texture,
  with the backdrop light disabled. Added fresh-load, capture and packaged-runtime
  checks. Reduced the shrine bulb's orange emission and added a small ambient floor
  to keep covered interiors readable. Model geometry was not edited.
- The two formerly black house views below are now visible. In `house above the
  right front window, from inside, facing out.jpg`, the cabinet is present, but the
  large portrait, garland and devotional picture seen in the reference are missing.
  This is a model-content finding, not a request for more exposure. [Render](<blender/build/sheets-7e51aa6/unreal-20260927-184409/098-house above the right front window, from inside, facing out.png>).
- `house God room, right top corner.jpg`: the reference is a close-up of the
  carved wooden bracket; this camera instead shows a large near-black diagonal
  roof/wall face covering the upper half. Check camera/geometry compatibility
  before interpreting this as general underexposure. [Render](<blender/build/sheets-7e51aa6/unreal-20260927-184409/139-house God room, right top corner.png>).
- Current review: `checks/unreal-lighting-hour/REVIEW.md`; full current poses:
  `blender/build/sheets-7e51aa6/unreal-20260927-184409/`. Main `7e51aa6`;
  pose snapshot SHA-256 `8754c9f0660b07151459d90de11966f144121805fba4911efffdf7229f6f132f`.
  The older dark-interior observations below are historical. Remaining look-dev:
  shrine patina, weathered roof finishes, and less uniform water/foliage response.

- September 27 fidelity pass: restored 198 mapped materials, including 127 bump maps and approved photo cards; added single-layer water, native fixture lights and softer daylight. Removed ten accumulated exposure volumes. Rebuilt material graphs from a snapshot because UE 5.8's delete-all API leaves nodes behind.
- Native detail regression in `2011-09-21 14.35.26.jpg` is corrected in fresh captures: building Nanite data stays resident, precision is explicit, and fallback uses PercentTriangles rather than Auto. The actual fallback now retains all 3,683,335 exported triangles. Earlier audits checked percentage/error fields but missed Auto's override. No model geometry was edited.
- Previous review: `checks/unreal-fidelity-hour/REVIEW.md`; full poses: `blender/build/sheets-20769d9/unreal-20260927-164751/`.
- Shrine brass and illumination are still too clean/bright compared with the reference; improve patina and light balance without altering statue geometry.
- Lake water now has absorption, scattering and moving ripples; pavilion/vegetation reflections still need to match the photograph more closely.
- Broad foliage masses remain conspicuous. Reference: `2011-09-21 14.57.50.jpg`; render: `blender/build/sheets-20769d9/unreal-20260927-164751/007-2011-09-21 14.57.50.png`. Claude owns changes to canopy shape and placement; photoreal work can improve leaf shading.
- Native high-resolution screenshots still show shadow/GI noise. Warmup and 32 temporal frames reduce first-frame failures but do not eliminate that noise.
- Roof material is too pale/gray in `2011-09-21 15.11.58.jpg`; the photo has dark weathered clay tiles. [Render](<blender/build/sheets-20769d9/unreal-20260927-164751/034-2011-09-21 15.11.58.png>). Prioritize this broad finish next.

The legacy `lane-left.jpg` pose also gives a substantially different composition. It has a cover-crop FOV conversion and predates recent model changes; do not infer a geometry correction from it alone.

- 2026-10-01 evening, tone of dark finishes (the "renders don't look like the photos" complaint):
  buffer dumps (`CAPTURE_CONSOLE="r.BufferVisualizationDumpFrames 1"`) and sampled colours at
  14.56.30 and 15.23.35 showed oxide floors, old timber, walkway stone, roofs and tank steps two to
  three times too light against the pale walls. Fixes, all in the masters (`materials.py`) and
  `lighting.py`: (1) an albedo curve, colour x clamp(max(rgb)/0.6, 0.4, 1), on everything except
  water, foliage and emissive (`ALBEDO_TONE` env overrides for calibration); (2) Specular by
  roughness: 0.5 polished, 0.25 satin (about 0.75), 0.05 fully matt, which removes the pale
  grazing veil on steps and tiles; (3) local exposure contrast scales back to 1.0 (0.5/0.8 was
  flattening walls against timber). Sampled against the photo at 14.56.30: floor (85,36,33) vs
  (76,37,36), wall (128,202,200) vs (149,209,214), walkway (63,75,64) vs (65,56,55), dado
  (123,48,41) vs (110,52,52); the timber pillar is now darker than the photo (36 vs 72).
  Not the cause: the soft sun, ray-tracing culling, software vs hardware tracing. Sky leaking
  only brightens covered spaces as a whole (0.03 already overexposes the veranda).

- 2026-10-01 night, handoff to Codex. `bash unreal/rebuild-all.sh "what changed"` does the whole
  refresh (merge main, export, Blender blockout, Unreal import, materials, level, Lumen, package,
  smoke test; about 15 minutes; do not commit to main while it runs, and make sure no earlier
  run is still alive: stopping the shell does not stop its Blender or Unreal child).
  In the game: photo browser and alignment from the start menu, notes from the pause menu,
  controller bindings in alignment (LB/RB photo, Y saved pose, A save, X overlay, B back, LT/RT
  lower and rise, hold L3 faster, D-pad lens and tilt). The smoke test presses those buttons and
  passes; nobody has tried them on a real controller yet.
  Open on the look: timber pillars now darker than the photographs (36 vs 72 at 14.56.30; the
  curve's floor could rise to about 0.5 for the darkest colours); foliage is smooth blobs where
  the photographs have coconut and areca palms; tank stone reads green next to the photo's
  grey-black. Pose captures of all 172 photographs stop with a screenshot timeout around the
  30th (15.10.34); run `capture_poses.py --only a+b` in batches instead.
- 2026-10-02, after the web model's paler veranda turquoise and eased timber wash (main 4606b82),
  the game samples at 14.56.30 as: floor (89,38,34) vs photo (76,37,36), wall (159,204,202) vs
  (149,209,214), pillar (47,38,31) vs (72,53,51), walkway (63,75,64) vs (65,56,55), dado
  (125,49,42) vs (110,52,52). The pillar is the remaining gap.
- 2026-10-02, foliage silhouettes: the foliage masters (textured ones too) are now masked and
  two-sided, with leaf-clump cut-outs (55 cm and 140 cm world cells) that grow towards the
  silhouette, so crowns and shrubs have ragged edges instead of smooth spheres. `LEAF_RIM=0` in the
  environment of `materials.py --rebuild` switches it off. Checked at lane-right.jpg and 15.23.35.
  Still blocky up close; real leaf cards or palm fronds would be the next step.
- 2026-10-02, timber: after a second lightening of the web timber texture (main 38e8d4f) the game
  samples at 14.56.30 as: pillar (64,52,44) vs photo (72,53,51), floor (93,40,37) vs (76,37,36),
  wall (164,207,206) vs (149,209,214), walkway (65,77,66) vs (65,56,55), dado (130,52,45) vs
  (110,52,52). The pillar gap is closed; the oxide floor is now the furthest off (about 20% bright).
- 2026-10-02, after darkening the veranda oxide on the web side (main 82b2b9e), 14.56.30 in the game: 'floor': (85, 36, 34), 'wall': (164, 207, 206), 'pillar': (63, 51, 44), 'walk': (65, 78, 66), 'dado': (119, 46, 41) (photo: floor (76,37,36), wall (149,209,214), pillar (72,53,51), walk (65,56,55), dado (110,52,52)).
- 2026-10-02, lake water: scattering (.011,.013,.008), absorption (.33,.24,.36), WaterSpecular 0.35.
  At 15.23.35 the water samples (106,173,96) against the photo's (113,146,98); it was (150,202,149).
  A stronger setting (scatter .008/.012/.004, absorption .45/.25/.60) went too saturated (78,173,63).
