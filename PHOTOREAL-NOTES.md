# Photoreal handoff

## Ownership

Claude owns model source, tests, photo findings and HANDOFF.md on `main` in the house checkout. Codex owns Blender, Unreal, materials, lighting and rendered reviews on `photoreal`. Never edit `dist/` here. Local commits only; no photographs or generated binaries in commits.

Before every render batch or Unreal rebuild, run `git merge main`. For conflicts in `dist/` or `tests/`, use main's version. Refresh generated scenes when their model source hashes differ. After each merge, produce all aligned poses under `blender/build/sheets-<main short hash>/`, with a searchable overview and explicit coverage count. Retain before/after Markdown reviews after major improvements. Do not modify the alignment server or the pose repository; read poses and photographs in place.

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

## Remaining photoreal work

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
