# Photoreal handoff

## Ownership

Claude owns model source, tests, photo findings and HANDOFF.md on `main` in the house checkout. Codex owns Blender, Unreal, materials, lighting and rendered reviews on `photoreal`. Never edit `dist/` here. Local commits only; no photographs or generated binaries in commits.

Before every render batch or Unreal rebuild, run `git merge main`. For conflicts in `dist/` or `tests/`, use main's version. Refresh generated scenes when their model source hashes differ. After each merge, produce all aligned poses under `blender/build/sheets-<main short hash>/`, with a searchable overview and explicit coverage count. Retain before/after Markdown reviews after major improvements. Do not modify the alignment server or the pose repository; read poses and photographs in place.

## Game checkpoint

`d693dce`: native walking game, menus, saves, settings, journal and lighting. Packaged runtime and cold-restart save checks passed. Launch `unreal/play.cmd`. Local before/after review: `checks/unreal-walk/REVIEW.md`.

Follow-up: native export partitioned into 13 groups (at most 48 material sections) so Nanite builds successfully. All 3,683,335 triangles, bounds and transforms match the former export. Full collision fallback and material assignment pass a fresh-process audit. The packaged game passes walking and save/resume checks without shadow-overflow warnings. The final renderer overview is `blender/build/sheets-20769d9/unreal-20260927-155405/`.

## Model findings

Main `20769d9`; poses snapshot SHA-256 `ce463cf7373fa84b511b4969ff62b4c5207156e8af22496c3e47aaa878d4c630`. Overview: `blender/build/sheets-20769d9/REVIEW.md`. No geometry was changed during this review.

Prioritize these large mismatches. Occlusion can indicate a pose made before geometry moved; check that before inferring dimensions. Camera position, quaternion and FOV are preserved.

| Photo | Finding for Claude | Local render |
|---|---|---|
| 2011-09-21 15.04.59.jpg | Almost the entire shrine view is blocked by a nearby surface. Check camera/model compatibility before detailing the shrine. | [Render](<blender/build/sheets-20769d9/unreal-20260927-152002/029-2011-09-21 15.04.59.png>) |
| 2011-09-21 15.30.09.jpg | A nearby wall blocks most of the right half; the photograph has an open lake view. Check the upstairs opening and saved eye location. | [Render](<blender/build/sheets-20769d9/unreal-20260927-152002/051-2011-09-21 15.30.09.png>) |
| 2011-09-21 14.59.21.jpg | Ground-floor facade opening layout differs: the photo's window and doorway sequence is replaced by large blank bays. | [Render](<blender/build/sheets-20769d9/unreal-20260927-152002/012-2011-09-21 14.59.21.png>) |
| 2011-09-21 15.03.38.jpg | The right foreground bay/column crowds the passage view; the photo instead shows a long white wall face. Verify placement against the adjacent views. | [Render](<blender/build/sheets-20769d9/unreal-20260927-152002/025-2011-09-21 15.03.38.png>) |

## Remaining photoreal work

- Native detail regression in `2011-09-21 14.35.26.jpg`: small shrine objects appear simplified after Nanite partitioning, despite unchanged source triangles. Investigate native LOD/precision and shading; do not alter the model to compensate. Matched review: `checks/unreal-nanite/REVIEW.md`.
- Covered spaces are too dark relative to their reference photos; verify indirect light and exposure before material detailing.
- Lake water currently reads as flat opaque green, with insufficient reflection and surface variation.
- Broad foliage masses and uniform ground/wall surfaces remain conspicuous. These are larger visual gains than small decorative tweaks.

The legacy `lane-left.jpg` pose also gives a substantially different composition. It has a cover-crop FOV conversion and predates recent model changes; do not infer a geometry correction from it alone.
