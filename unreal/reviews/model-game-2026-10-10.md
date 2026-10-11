# Model and game: before / after

Main `a4c5efc` and `03502e1` correct three large, photo-supported temple mismatches.
The native game adds sharper display options and settings usable in a small window.

| Before | After |
|---|---|
| Entrance side platforms .85 m high across the whole hall | Rear marble ledges .85 m; front red-oxide floors .39 m, grey kerbs and two-riser access |
| Four broad, irregular frontage bays; 2.72 m shutter | Five 2.88–2.90 m bays; aligned upper windows and a 1.9 m shutter |
| Court portico tops .602 m; thin slabs over voids | .85 m marble tops on filled bases, denser friezes and three .25 m rises clear of piers |
| Game defaults 1280×720 at 87% render scale | New walks 1600×900 at 100%; monitor-fit resolution choices and independent 67/83/100% scale |
| DPI virtualization reports 1536×864 on this 3840×2160 monitor | Actual 3840×2160 borderless viewport; Windows per-monitor awareness and 2.5× interface scale verified |
| Settings rows could exceed the available panel | Scrollable panel with keyboard/D-pad focus and visible selection checks |

Gallery stairs, pier feet, painting destinations and tour heights follow the lower
entrance floor. Saved photo poses stay fixed. Existing game saves import their
display preferences once and retain progress and comfort settings. Portico column
capitals and ceilings stay fixed; the full-size great bell rises with its platform.
See the [portico measurements](D:/repos/shankaranarayana-house/docs/review-2026-10-10-portico-platforms.md).

Before: [all 172 poses / 29 sheets](D:/repos/shankaranarayana-photoreal/blender/build/sheets-b868fd7/unreal-20261010-231958/index.html),
[entrance](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-b868fd7/unreal-20261010-231958/061-2011-09-21 15.16.09.png>),
[frontage](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-b868fd7/unreal-20261010-231958/063-2011-09-21 15.19.36.png>).

Entrance/frontage after: [all 172 poses / 29 sheets](D:/repos/shankaranarayana-photoreal/blender/build/sheets-a4c5efc/unreal-20261010-235712/index.html),
[entrance](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-a4c5efc/unreal-20261010-235712/061-2011-09-21 15.16.09.png>),
[frontage](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-a4c5efc/unreal-20261010-235712/063-2011-09-21 15.19.36.png>).
Portico after: [all 172 poses / 29 sheets](D:/repos/shankaranarayana-photoreal/blender/build/sheets-03502e1/unreal-20261011-002917/index.html),
[portico](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-03502e1/unreal-20261011-002917/030-2011-09-21 15.11.07.png>).
Both batches exit cleanly; every pose reviewed, no major new regression. One unavailable
reference photo is reported; its pose is still rendered.

Source validation passes: wheel/entrance geometry, 14,579 tour collision samples,
shipped setback tour, all 172 pose proximity checks and roof normals. Existing basin
and landscape slab findings remain. Native package, smoke and cold restart pass:
both portico stairs ascend/descend .10↔.85 m, and the entrance rear ledges .39↔.85 m.
Windows process/thread/window DPI awareness reads 2/2/2, window DPI 240 and interface
scale 2.5. Window/borderless/restore preserve the window preference; 67% scale survives
Epic quality. Keyboard/D-pad navigation reaches every settings row in a small window.
Reports: `unreal/smoke-runs/20261011-004723-35f6dd9060b347e2b45ea31e07843dd6/Saved/WalkReview/`.
Changed source installation now refreshes timestamps so Unreal cannot skip compilation
or header generation when another worktree supplies older files. Package inventory:
3,407 entries, no private photo/pose filenames; nine source texture references are allowlisted.

Remaining substantial work: the platform hall's split roof and flat ceiling need
coherent support heights; native water navigation needs a measured safety check.
Stone side-aisle appearance and close lake reflections still differ from photographs.
Generated media and packages stay ignored; local
commits only.
