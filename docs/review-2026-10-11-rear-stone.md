# Rear plinth stone: before / after

Both rear-plinth references show shaded, weathered stone. Unreal's two-sided sheet fill made
the four curved lotus courses glow white. Turning off only their instance fill restores grey
stone shading and visible carved outlines in both views.

| View | Before | Unsaved trial |
| --- | --- | --- |
| [Far-side corner](<F:/Shankaranarayana/temple inner sanctum far side left corner.jpg>) | [Full-capture 148](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-ad2b8a7/unreal-20261011-013052/148-temple inner sanctum far side left corner.png>) | [Stone courses](<D:/repos/shankaranarayana-photoreal/checks/lotus-fill-trial/zero/001-temple inner sanctum far side left corner.png>) |
| [Left side](<F:/Shankaranarayana/temple inner sanctum, left side.jpg>) | [Full-capture 149](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-ad2b8a7/unreal-20261011-013052/149-temple inner sanctum, left side.png>) | [Wider view](<D:/repos/shankaranarayana-photoreal/checks/lotus-fill-trial/zero/002-temple inner sanctum, left side.png>) |

The persistent override resolves four exclusive `Rear plinth continuous lotus course` users by
name and material/map signature, independent of source indices. Only their `SheetFill` becomes
`0`; colour, existing procedural/bump maps, roughness `.88`, metallic `0`, geometry and global
lighting stay fixed. The shared master retains fill `.12` and front multiplier `1`.

Validation: the native trial captured 2/2 poses and exited cleanly (0, 59.43 seconds). Metadata
records four unsaved instance overrides and live bindings. CPU checks passed relocated indices
and rejected changed/shared families, maps and tints. Persistent regeneration and fresh-process
map/tint/scalar/binding verification pass, including relocated source indices 534..537.
The complete 172-pose / 29-sheet capture exited cleanly (0):
[corner](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-1bec521/unreal-20261011-025548/148-temple inner sanctum far side left corner.png>),
[left side](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-1bec521/unreal-20261011-025548/149-temple inner sanctum, left side.png>).
This fixes false
emission; remaining geometry and weathering differences are outside this change. The earlier
full capture completed every image but exited abnormally during shutdown.
