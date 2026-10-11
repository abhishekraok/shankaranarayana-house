# Roof and water walking: before / after

Model main `ad2b8a7`. Native scene/material/lighting audits, packaged walking,
cold restart and full-pose visual review pass. The full-capture editor shutdown
failure is recorded below.

| Before | After |
|---|---|
| Continuous grey-blue roof hides the central opening | Two narrower half-gables with a real 2.5 m slot |
| Corrugated underside above the raised platform hall | Flat white ceiling, beams bearing on the existing carved caps |
| Old rear eave crosses the room's ceiling boundary | Hidden roof junction with at least 2.14 m standing clearance |
| Lake importer hull becomes an invisible floor above water | Persistent `NoCollision` profile, checked again after level reload |
| Pond walking reaches a recessed floor and cannot climb back | Both water areas recover to nearby checked ground; held input triggers once, reverse walking escapes |

Photo evidence: 2011-09-21 15.13.03 / 15.13.07 / 15.08.10.
Heights remain estimates; supports, saved poses, skylights and walking surfaces stay fixed.
[Source measurements](D:/repos/shankaranarayana-house/docs/review-2026-10-11-inner-front-roof.md).

[Before: 172 poses / 29 sheets](D:/repos/shankaranarayana-photoreal/blender/build/sheets-03502e1/unreal-20261011-002917/index.html).
[After overview](D:/repos/shankaranarayana-photoreal/blender/build/sheets-ad2b8a7/unreal-20261011-013052/index.html)
contains all 172 poses / 29 sheets. The editor exited with access violation
`-1073741819` after its shutdown log closed; image completion is recorded separately
from process health. Native game validation follows below.

Native baseline: the lake water mesh supports feet at −109.96 cm despite visible water
at −210 cm; the pond supports feet at −91.85 cm and reverse walking stops inside its
retaining walls. The isolated forward/reverse probe exits cleanly; no walk saves are written.
Report: `unreal/smoke-runs/water-probe-v2-20261011-005611-4b4b8a1170444012a89aaaa7b75e8324/Saved/WalkReview/water-probe.json`.

Fresh scene audit: 229 mesh groups and 3,792,194 source/fallback triangles. The water
component reloads with `NoCollision` and default-asset collision inheritance disabled;
basin and ledge collision remain. Only the two source-authored water regions are
staged into the game, with source-hash validation. No invisible navigation floors.

Final packaged smoke and cold restart exit cleanly with no failed assertions:
[reports](D:/repos/shankaranarayana-photoreal/unreal/smoke-runs/20261011-020547-1e0918fe7f1049a99df213a1891abcc4/Saved/WalkReview/smoke.json).
Recovery checks use the native capsule and fresh floor traces before placement,
then recheck the grounded position; offsets are bounded to 64 cm horizontally
and 4 cm vertically. Terrain/wall collision stays enabled. Unsafe old water saves
fall back to the entrance while retaining view, journal and preferences.

[Initialized runtime sample](D:/repos/shankaranarayana-photoreal/unreal/profile-runs/20261011-020732-041e945db01f4d18b83aed8001dd82a3/summary.json):
3,600 frames at 1600×900, 100% scale, quality 2, VSync/60 fps. Final 1,000 frames:
16.667 ms median / 16.671 ms p99; zero over 33.333 ms. Four startup/sample frames
exceeded that threshold. One default-tour segment; no full-route performance claim.

Rust slot roof, parapets, stepped canopy and tower finish remain deferred. Photos,
generated scenes, contact sheets and packages remain ignored. Local commits only.

071/072 now match the split-roof topology more closely. Floral parapet openings
look brighter/flatter with the new background; dark parapets and the rust slot roof
remain the source follow-up, rather than a reason to retune global lighting.
