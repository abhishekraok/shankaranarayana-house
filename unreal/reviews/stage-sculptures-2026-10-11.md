# Stage sculptures: native before / after

Main `b4fdb17` replaces the elephant/calves' straight trunks and missing legs,
and the four peg-like guardians, with larger anatomical silhouettes. All six group
transforms, nominal envelopes, bases, stairs, navigation and 172 saved poses stay fixed.
Anatomy and crown detail remain estimates; stage depth is not revised.

| View | Before (`a0546ae`) | Native preview (`b4fdb17`) |
| --- | --- | --- |
| Elephants and lower guardians | [15.13.30](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-a0546ae/unreal-20261011-043115/038-2011-09-21 15.13.30.png>) | [15.13.30](<D:/repos/shankaranarayana-photoreal/checks/model-preview-b4fdb17/stage-20261011-120021-481/001-2011-09-21 15.13.30.png>) |
| Elephant side | [15.13.26](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-a0546ae/unreal-20261011-043115/056-2011-09-21 15.13.26.png>) | [15.13.26](<D:/repos/shankaranarayana-photoreal/checks/model-preview-b4fdb17/stage-20261011-120021-481/002-2011-09-21 15.13.26.png>) |
| Four guardians | [15.12.15](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-a0546ae/unreal-20261011-043115/036-2011-09-21 15.12.15.png>) | [15.12.15](<D:/repos/shankaranarayana-photoreal/checks/model-preview-b4fdb17/stage-20261011-120021-481/003-2011-09-21 15.12.15.png>) |
| Whole facade | [15.19.57](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-a0546ae/unreal-20261011-043115/158-2011-09-21 15.19.57.png>) | [15.19.57](<D:/repos/shankaranarayana-photoreal/checks/model-preview-b4fdb17/stage-20261011-120021-481/004-2011-09-21 15.19.57.png>) |

Source wheel/tour, outward normals, closed shells, bearing feet and stair-capsule
sweeps pass. Geometry adds 45,088 triangles; 8,178 unrelated meshes remain exact.
The native preview captures all four views with exit 0 and no overrides. Independent
comparison with all four photographs and native before views found a substantial
silhouette improvement with no major new regression. Fresh
saved scene/material/lighting audits pass. Lumen setup wrote its audit, then hit
the intermittent late shutdown access violation; the cause remains unresolved.

Windows package, six actual-input stage legs, six bank-road legs, ordinary cold
restart and focused bank Continue pass with exit 0. Stage walking retains native
support over 1,201 samples; front-flight rise is 277.3 cm, side-flight rise 112 cm,
maximum lateral drift 7.26 cm. No recovery or progress/settings loss occurred.
[Packaged report](D:/repos/shankaranarayana-photoreal/unreal/smoke-runs/20261011-052901-4244f24674bc4e938273c17583de4974/Saved/WalkReview/smoke.json).
Package inventory passes: 3,429 entries, 212 native textures, nine approved photo
sources and no private-reference filename matches (filename/provenance audit).
All 172 poses / 29 sheets captured with exit 0. Independent comparison of all 29
sheets against `a0546ae` found no substantial new regression; the stage improvement
and earlier cloth/road/bronze/stone corrections remain intact.
[Complete overview](D:/repos/shankaranarayana-photoreal/blender/build/sheets-b4fdb17/unreal-20261011-053301/index.html).
