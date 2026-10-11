# Inner gables: before / after

The two hall photographs show grey-blue corrugated end-walls distinctly darker than
the white floral screens. Native rendering made them nearly white. An exclusive
linear `Color` gain of `.25` restores that contrast while preserving the source hue.

| Reference view | Before (`a0546ae`) | Unsaved `.25` trial (`b4fdb17`) |
| --- | --- | --- |
| 15.13.03 | [071](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-a0546ae/unreal-20261011-043115/071-2011-09-21 15.13.03.png>) | [001](<D:/repos/shankaranarayana-photoreal/checks/roof-colour-trial/gain0.25-20261011-121044-239/001-2011-09-21 15.13.03.png>) |
| 15.13.07 | [072](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-a0546ae/unreal-20261011-043115/072-2011-09-21 15.13.07.png>) | [002](<D:/repos/shankaranarayana-photoreal/checks/roof-colour-trial/gain0.25-20261011-121044-239/002-2011-09-21 15.13.07.png>) |

The front-fill trial was rejected (1–3 RGB levels). Neutral gain `.5` darkened the
actual gables by 19–24 levels but left them pale. The one larger `.25` trial gives
roughly 40–48 levels of gable darkening, with adjacent white unchanged. Gable/white
brightness ratio in 15.13.03 moves `.90` → `.82` → `.73`; the photograph is about
`.69`. These comparisons are relative appearance evidence, not calibrated exposure.

Independent review of both photographs and all three native variants recommends
`.25`: grey-blue sheets are clear, without a major new black area or hue shift.
Both trials capture 2/2 with exit 0 (58.86 / 59.51 seconds). Native readback confirms
one exclusive source family, used only by the shelter roof and corrugated gable,
with its original color multiplied by the gain. Roughness `.91`, metallic `0`,
sheet fill `.12`/front `1`, shared master and global lighting remain fixed.

Saved native readback passes: gain `.25`, original roughness/metallic/fill, both
mesh slots and both saved-level bindings, with shared master defaults unchanged.
Source relocation into an unrelated existing instance and repeated rebuilds pass
the focused CPU check. All 172 poses / 29 sheets were independently compared with
`a0546ae`, with no substantial new regression; capture exit 0.
[Saved result](D:/repos/shankaranarayana-photoreal/blender/build/sheets-b4fdb17/unreal-20261011-053301/index.html).
Weathering and the separate white
skylights remain outside this correction; the photographs are not fully matched.
