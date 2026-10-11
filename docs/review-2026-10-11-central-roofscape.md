# Central roofscape: before / after

Evidence: 2011-09-21 15.13.03 / 15.13.07 / 15.12.56. Depths and rust-roof heights remain
estimates; the visible centre step, pierced side screens and low rust cover appear in all three.

| Feature | Before | After |
| --- | --- | --- |
| Front cornice / parapet | Straight edge; 2.1 m post pitch | Three centre bays project .66 m, with real short returns; 1.454 m pitch follows five panels across three lower column bays |
| Canopy | No forward projection | Slab extends to authored z 14.295, retaining the existing 3.65..3.87 m height and column supports |
| Beside sheet shelter | Open edges | Dark pierced screens at 4.14..4.74 m, bearing on the supported flat roof |
| Bottom of central slot | Missing rust cover | 2.5 x 1.2 m corrugated pent roof at 4.50..4.72 m; small steel bearings meet actual slab/junction triangles |

Authored z above; world z adds 4.5 m. The source pass preserves all collision boxes, walking
surfaces/ramps, the corrected white ceiling, windows, tower geometry and saved poses. The rust
frame is inferred simple construction; its dimensions are not measured photo constraints.

Checks: wheel movement, 14,579 tour collision samples, shipped setback, .22 m capsule footprint
clearance (minimum 2.495 m under the entrance trim), pier/roof bearing and upward rust-roof normals.
Against ad2b8a7, 3,917 other meshes retain geometry/transforms and 203 roof meshes retain normals;
172 alignment poses keep the same file hash and collision states. Tower sightlines at 4.8 m remain
open above the rust cover; the original skylights and 2.14 m rear-platform clearance are preserved.

Fix 24(b,d,e). Tower finish remains deferred. Native regeneration and full pose contact sheets are
required after integration; this source review does not claim native visual validation.
