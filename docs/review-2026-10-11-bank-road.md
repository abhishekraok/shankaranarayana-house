# West-bank road: before / after

The bank references show brown gravel and worn grey ruts. Native rendering made the large
road surface pale cream. A scoped linear `Color` gain of `.5` makes it read as brown gravel
in all three views while retaining the authored texture and hue ratios.

| Reference | Before | Unsaved trial |
| --- | --- | --- |
| [15.25.49](<F:/Shankaranarayana/2011-09-21 15.25.49.jpg>) | [090](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-b3b0f63/unreal-20261011-034353/090-2011-09-21 15.25.49.png>) | [001](<D:/repos/shankaranarayana-photoreal/checks/road-colour-trial/half/001-2011-09-21 15.25.49.png>) |
| [15.26.49](<F:/Shankaranarayana/2011-09-21 15.26.49.jpg>) | [136](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-b3b0f63/unreal-20261011-034353/136-2011-09-21 15.26.49.png>) | [002](<D:/repos/shankaranarayana-photoreal/checks/road-colour-trial/half/002-2011-09-21 15.26.49.png>) |
| [15.25.52](<F:/Shankaranarayana/2011-09-21 15.25.52.jpg>) | [091](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-b3b0f63/unreal-20261011-034353/091-2011-09-21 15.25.52.png>) | [003](<D:/repos/shankaranarayana-photoreal/checks/road-colour-trial/half/003-2011-09-21 15.25.52.png>) |

The native trial completed 3/3 poses with exit `0` in 62.47 seconds. Readback confirms only
the exclusive road instance changed from `(1,1,1,1)` to `(.5,.5,.5,1)`. Its single-sided
mapped parent, texture, UVs, roughness `1`, metallic `0` and live binding passed preflight.
Identical-camera road patches in views 090/091 darkened by roughly 26–40 RGB levels;
these are screen comparisons, not calibrated photo measurements.

Persistence resolves the object and exact material/map signature dynamically, rejects shared
families or changed tints, and leaves shared masters and global lighting fixed. CPU relocation
and rejection checks pass. Fresh native regeneration of `a0546ae` confirms the saved `.5`
gain, original map hash and mesh/level binding. [Persisted overview](D:/repos/shankaranarayana-photoreal/blender/build/sheets-a0546ae/unreal-20261011-043115/index.html)
contains all 172 renders / 29 sheets, including views 090, 091 and 136. The editor exited
abnormally after closing its log; package, smoke and cold restart exit 0. Independent
comparison of all 29 sheets found no substantial new regression. Grey ruts, irregular
edges and weathering remain outside this change.
