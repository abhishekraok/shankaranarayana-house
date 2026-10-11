# Bathing arcade: native before / after

Main `7b51f66` opens the west timber gable, replaces twelve repeated supports with
six distinct lane/lake piers, and gives the white end-room wall real apertures.
Roof extent/pitch, floor, stairs, end piers, notice, bank and gate remain fixed.
Post pitch, truss dimensions and wall details are photo-based estimates; arcade
length and the tank's east-end layout remain unresolved.

| View | Before (`b4fdb17`) | Native preview (`7b51f66`) |
| --- | --- | --- |
| West gable | [14.58.05](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-b4fdb17/unreal-20261011-053301/028-2011-09-21 14.58.05.png>) | [14.58.05](<D:/repos/shankaranarayana-photoreal/checks/model-preview-7b51f66/arcade-20261011-130706-237/001-2011-09-21 14.58.05.png>) |
| Supports | [14.59.39](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-b4fdb17/unreal-20261011-053301/014-2011-09-21 14.59.39.png>) | [14.59.39](<D:/repos/shankaranarayana-photoreal/checks/model-preview-7b51f66/arcade-20261011-130706-237/002-2011-09-21 14.59.39.png>) |
| Lake face | [15.21.47](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-b4fdb17/unreal-20261011-053301/075-2011-09-21 15.21.47.png>) | [15.21.47](<D:/repos/shankaranarayana-photoreal/checks/model-preview-7b51f66/arcade-20261011-130706-237/006-2011-09-21 15.21.47.png>) |

Source wheel/tour, bearing, closed-shell, aperture and capsule checks pass; 8,223
unrelated meshes, 506 roof-normal sets and all 172 poses remain exact. The changed
geometry adds 167 triangles. Fresh native scene/material/lighting audits pass.
Gable, bell, stone and road targets survive source material renumbering.
Lumen setup saved its audit, then hit the intermittent late editor shutdown access
violation; its cause remains unresolved. The seven-view preview exits 0, without
overrides. Independent comparison of all seven views with the original photographs
and `b4fdb17` found no substantial new regression; fine truss joints cannot be
judged from the distant west view.

Windows package and cold restart pass with exit 0. All six arcade walking legs
retain native support over 2,577 samples: aisle travel 15.803..15.834 m, stair
travel 3.503..3.534 m and signed floor rise +/-161.5 cm. Reverse legs turn from
the actual reached endpoint, without teleporting. No recovery or journal/view/
preferences loss occurred. Six stage and six bank-road legs also pass.
[Packaged report](D:/repos/shankaranarayana-photoreal/unreal/smoke-runs/20261011-061312-8aabd31e8db14a659f8ae1e1e3bdcd41/Saved/WalkReview/smoke.json).
Package inventory passes: 3,427 entries, 210 textures, nine approved photo sources,
no private-reference filename matches (filename/provenance audit).
Independent runtime review confirms all 18 legs / 8,577 support samples, exact
paired reverse starts and original-pose restoration. Focused bank Continue also
passes with exit 0 and no recovery. All 172 poses / 29 sheets captured with exit 0.
Independent comparison of all 29 with `b4fdb17` found no substantial new regression;
the stage, cloth, roof, road, bell and stone improvements remain intact.
[Full overview](D:/repos/shankaranarayana-photoreal/blender/build/sheets-7b51f66/unreal-20261011-061755/index.html).

The editor reserialized generated `DefaultInput.ini` during capture, making the
launcher correctly flag the older package. Repackaged authored configuration and
retested all 18 legs, cold restart and focused Continue: fresh reports, exit 0.
[Final packaged report](D:/repos/shankaranarayana-photoreal/unreal/smoke-runs/20261011-063416-703f3d6565564e9caa5b694d2e172a14/Saved/WalkReview/smoke.json).
