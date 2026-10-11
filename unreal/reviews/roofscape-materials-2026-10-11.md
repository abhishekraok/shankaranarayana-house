# Roofscape and materials: before / after

Main `1bec521`: the stepped central canopy, denser floral bays, dark side parapets and rust
slot cover now appear in Unreal. The lane cottage has a continuous awning; the salmon house
has its photographed flat roof, parapet and tank. Dimensions remain photo-based estimates.

| View | Before (`ad2b8a7`) | After (`1bec521`) |
| --- | --- | --- |
| Temple roofscape | [15.13.03](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-ad2b8a7/unreal-20261011-013052/071-2011-09-21 15.13.03.png>) | [15.13.03](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-1bec521/unreal-20261011-025548/071-2011-09-21 15.13.03.png>) |
| Western lane | [lane-right](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-ad2b8a7/unreal-20261011-013052/172-lane-right.png>) | [lane-right](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-1bec521/unreal-20261011-025548/172-lane-right.png>) |

Native instance overrides remove unintended emission from the bronze bells and four carved
stone courses. Global lighting, source colors, textures and geometry stay fixed:
[bells](D:/repos/shankaranarayana-photoreal/docs/review-2026-10-11-inner-hall-bells.md),
[stone](D:/repos/shankaranarayana-photoreal/docs/review-2026-10-11-rear-stone.md).

Fresh native scene/material/lighting audits, Windows package and isolated smoke/cold restart
pass. [Full overview](D:/repos/shankaranarayana-photoreal/blender/build/sheets-1bec521/unreal-20261011-025548/index.html):
172/172 aligned poses, 29 sheets, clean capture exit 0. One unavailable photograph still has
its pose rendered. Independent comparison of all 29 before/after sheets and key full frames
found no substantial new regression; rough alignment limits precise dimension claims.
Lumen setup wrote its fresh audit and then exited
with access violation `-1073741819`; subsequent verification, package and capture passed.

Package inventory: nine approved source photograph textures; 3,413 IoStore entries, no private
photo filename matches among 202 native texture entries. This checks filenames and source
provenance, not image content. Generated renders, photographs and binaries remain ignored.
