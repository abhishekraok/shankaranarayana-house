# Inner hall bells: before / after

Evidence: 2011-09-21 15.08.10. The photographed bells are shaded bronze; Unreal rendered pale,
almost uniform silhouettes because its two-sided sheet shader added emission to their fronts.

| Before | After |
| --- | --- |
| [Full-capture 131](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-ad2b8a7/unreal-20261011-013052/131-2011-09-21 15.08.10.png>): shared `SheetFill=.12` | [Scoped native trial](<D:/repos/shankaranarayana-photoreal/checks/bell-fill-trial/zero/001-2011-09-21 15.08.10.png>): `SheetFill=0`, bronze gradients and dark hollow rims |

The persistent override resolves seven bell bodies and seven crowns by exact authored names and
material signature, rejecting sharing, maps, emission or tints. Source indices may move. Color,
roughness `.55`, metallic `.55`, two-sided geometry and global lighting stay fixed; the shared
shader keeps its `.12` default. The verifier reads the saved instance and checks its native bindings.

Validation: trial captured cleanly (exit 0); metadata records one unsaved instance override from
`.12` to `0`. Surrounding walls and floors remain coherent. CPU resolver checks passed reordered
indices and rejected changed/shared source families. Persistent native regeneration, fresh-process
material verification pass. [Persistent result](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-1bec521/unreal-20261011-025548/131-2011-09-21 15.08.10.png>)
confirms the trial in the complete 172-pose / 29-sheet capture, which exited cleanly (0).
The earlier full capture
completed every image but exited with access violation `-1073741819` during shutdown.
