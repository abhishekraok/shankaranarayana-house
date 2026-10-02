# Handoff (2026-09-28)

Claude's reconstruction handoff, updated after the local Codex fidelity pass below.
Read AGENTS.md first; its rules (local commits only, no push or deploy, private photos never
committed) still apply.

## Evening of 2026-10-01: the user's game and web notes

- House entrance (game notes at the entrance and in the court; house-front.jpg): the centre
  passage is at ground level (`EL` = .075 in house.js) from the lane, through the main door, to
  the grey court pocket. No central steps. The front range plinth is split either side of the
  passage; the sitting bays (.75) and inner platforms (.79) are reached by one stone step each.
  A flat cement slab and two low masonry cheeks stand in front, as in the photo.
- East passage: the gap beside the stair-wing partition is a plain turquoise wall (game note).
- Lake: the open iron gate leaf that stood out over the water is removed (game note).
- Temple entrance (temple-entrance.jpg note): the gate bay has no lattice transom or brackets.
- Lane (lane-right.jpg note): the cottage and the salmon house behind it moved 12 m west, the
  porch at the bend 19.5 m west, and the lane's bend, poles and trees with them.
- Bell bays (15.14.51 note, with 15.10.34 and 15.02.27): either side of the passage a square
  carved pillar stands at the front and a round turned grey stone column 1.6 m behind it, with a
  dull brass bell hung between them. The east portico front moved out 1.0 m to match the west
  bay (same pass at the end of buildTemple). Routes and tour stops in front of it moved out.
- `tools/probe-pose.mjs` and `tools/dump-region.mjs` say what a photo pixel hits and what stands
  in a plan rectangle.
- Game: alignment can be driven from the controller (LB/RB photo, Y saved pose, A save, B back).

## Morning of 2026-10-02: light, water, Vipra Bhavan

- Web light (`main.js`): the sun now stands in the south-west (`sun.position 36,63,52`), where it
  was for every 2011 photo (14:28-15:30); it used to stand in the north-east, so faces the photos
  show lit were in shade. Exposure 1.08 -> 1.3, sun and ground light a little more neutral. In the
  model true east is -z and true north is -x (the "west/east bank" names in the code follow x).
  Renders are still darker and yellower than the photos overall (15.23.35 mean 92,104,81 against
  123,131,123), mostly from the dark foliage. The game has its own soft sun
  (`unreal/scripts/build_level.py`, yaw 200) under an overcast sky; its direction was not checked.
- Lake water `0x6c905f`: fits three regions of 15.23.35 within about 10 levels.
- Vipra Bhavan (landscape fix 23, visual part): 7.9 m to the eave, 18 m deep, six brick-lattice
  bays in a grey frame on the east flank. Not done: standing it on the raised far-bank ground with
  a forecourt (fix 23 step 1), which changes walking, the tour's bank stops and the hall poses.
- Web light, second step: sky light up (hemisphere 1.9, ambient .85), sun down to 2.1, and the white
  plaster more neutral (`kit.js` plaster `#d6d6cd`; it was yellow against the photos' blue-white
  walls). Shaded white walls still read about 50 levels under the photos (15.23.35 wing wall
  166,169,162 against 214,212,224).
- East passage (14.31.14, 14.30.57, 14.44.22; house fix 13, wall and window only): the floor is worn
  pink oxide instead of near-black; the rear wall's inner face is turquoise east of a dark post at
  local x -4.2 with a red dado from x 2.92; the east rear window is unpainted timber (bars in one
  half, plank shutter in the other) with laterite showing round it; the east wall's inner face is
  turquoise to the rear corner. Not done from fix 13: gutter, stored poles, slatted screen, plinth.
- House court (14.44.09, 14.30.57): stone posts in neutral granite (dark on the veranda side, pale on
  the shrine side; they were olive-tan), the sheet barrier and lean-to roofs in paler pinkish rust.
  The posts stay on the plaster base: the stone texture draws masonry joints across a monolith.
- Lane end (15.19.57; landscape fix 24, asphalt part): the asphalt stops at x 47 and mottled laterite
  runs on to the stage stair; the stage plinth has a dark rain-streaked lower band. The walking
  ramps under the removed asphalt are unchanged. Not done from fixes 24 and 4: constant lane width,
  the lane eased off the arcade, the 1.7 m terraces either side of the stair, the side flight.
- Roofs and tank stone (15.23.35, 15.11.58): the tile texture is grey-mauve instead of brown
  (`kit.js`, tile hue), the house roof courses and wing roof are lighter (main roof 109,103,110
  against 108,97,108), and the tank stone's base is neutral grey instead of olive. Light, third
  step: hemisphere 2.15, sun 1.6. Still off: tank faces in shade are too dark (56 against 82) while
  treads seen from above are too light (79 against 59); one material serves both, so the treads
  need their own darker, mossier one. A softer sun (1.2) did not help; that was tried and reverted.
- Tank courses carry a second, darker material on their top faces (`tank tread top`), assigned in
  the last block of `buildLandscape`, after the passes that move courses. Those meshes now have a
  material array.
- Game: `unreal/scripts/materials.py` has `GAME_TINT`, linear multipliers by web material name, for
  finishes the game's sky light renders far paler than the photos while the web colour is right
  (tank stone, tread tops, the court's sheet barrier). Name a web material to use it. The web
  light changes above do not reach the game, which lights the scene itself.
- Measure before changing a colour: the stage figures looked too pale by eye but sampled within
  20 levels of the photo, and that change was dropped.
- Not done, interiors: rooms are too bright because the ambient and hemisphere light are not
  occluded. From the court, the front room is a lit turquoise wall (149,193,186) where 14.44.09
  shows darkness (22,18,30). Needs baked occlusion or per-room dimming, done consistently.
- Seen in 15.11.58 and not done: the tank reads shorter east-west than modelled and the hall stands
  east of its north-east corner; this is the same open layout question as the stage and east end.

## Handoff to Codex (2026-10-01, late evening)

Claude is stopping here at the user's request; Codex continues. Read AGENTS.md first.

**State.** `main` is clean and all tests pass (`tests/*.mjs`, `tests/*.cjs`; see "Tests" below).
The photoreal worktree is `D:/repos/shankaranarayana-photoreal` (branch `photoreal`); its
`unreal/rebuild-all.sh` merges `main`, exports, rebuilds, packages and smoke-tests the game, and
its PHOTOREAL-NOTES.md has the Unreal findings. `play.cmd` there runs the packaged game.

**What changed today** is in the three sections below this one (the user's game and web notes,
the photo review, and the list of what remains). In the game: notes from the pause menu, a photo
browser and alignment mode from the start menu, and controller bindings for alignment (LB/RB
photo, Y saved pose, A save, X overlay, B back, triggers rise and lower, D-pad lens and tilt).
The game's look was recalibrated against photos (dark finishes no longer wash out): see
PHOTOREAL-NOTES.md, "tone of dark finishes".

**What the user asked for last** (verbatim): "Continue on the web notes. I also used 3D model to
save some notes and an alignment. Add gamepad controls for alignment in the 3D model. [...] After
that continue working on the fidelity of the 3D model [...]. The 3D renderings still don't look
close to the photos, work on that." All notes on disk as of 2026-10-01 20:27 PDT are done; new
ones may have arrived since. Check both files:
- `F:/Shankaranarayana/align-poses.json` (`notes` on each pose; compare `savedAt`),
- `F:/Shankaranarayana/unreal-notes.json` (notes left in the game, with eye position).
`tools/capture-fidelity.cjs` renders any pose; to render a game note, write its position and
quaternion into a small pose file and pass it as `POSE_FILE` (see `checks/unreal-notes-poses.json`).

**Next work, in order.** (1) Any new notes. (2) `docs/photo-review-2026-10-01-fixes.json`: the
review's ranked fix lists for house.js, temple.js and landscape.js (about 25 each), each with the
exact objects, numbers, evidence photos and risks. Its line numbers predate tonight's later
commits, and these entries are already done: house 1, 2, 3, 4, 5, 8, 15 (half walls only; the east
window sill was left because a test encodes daylight through it at 2.4 m), 6 (sheet barrier,
shortened grey sheets and the upper wall without its red band; not the two small windows), 10 (coping, riser
colour and bench only; the steps stay for walking), 11 (ceiling only), 12 (dado only), 16,
13 (wall colours, dado and east window only),
17 (tulsi and soil only), 20 (crossbeam, post colours and slimmer pickets), 23;
temple 1, 2 (only the floating second pavilion removed), 4 (without the second window), 7 (piers,
brackets, transoms and gate leaves only), 10, 18 (donation boxes, red fascia and white beam), 19 (a-c and
the porch floor: maroon balusters, west side cornice, the
upper slab that floated in front of the frontage); landscape 3, 5, 12 (white lake face on the
roadside posts only), 6 (lake-side west pedestal only), 15, 16 (colours only), 18 (verge trough and
the two notices on banded poles), 19, 20 (shrubs off the track only), 21 (materials
only, no nosings), 22, 23 (height, depth and flank only), 24 (wider grass verge, asphalt ending at x 47), 25. The timber texture's dark wash was also
eased (house 8, optional part). Check the code before
applying any other. Landscape 1 (bathing gate at x 12.35 with two piers) touches two of the
user's notes about that gate, so ask before doing it. The "Not done" list
below is the short version; the house's east end needs the user's eye. (3) In the game: foliage now has ragged leafy edges but is still
blocky up close, the oxide floors sample about 20% bright against 14.56.30, and the in-game
alignment controls have passed the automated smoke test but nobody has used them with a real
controller.

**Things that will bite.**
- Do not commit to `main` while `rebuild-all.sh` runs: `unreal/build.ps1` merges `main` again and
  refuses to package if the generated scene is older than the model source.
- The align tool only writes poses to disk when the server has the photo folder:
  `node server.mjs --photos F:/Shankaranarayana`. `start.cmd` starts it without.
- Geometry authored in temple.js is in pre-setback coordinates (the group moves by
  `K.templeShiftZ` at the end); house.js is in house-local x (placed at `K.houseShiftX`).
  Several passes at the end of each builder move or stretch earlier objects by name or bounding
  box; add new objects after them, or name them so the pass skips them.
- `main.js` ground slabs must stay plain `ground(...)` calls; the exporter replays them by regex.
- The user's standing decisions are listed under "User decisions" and in the memory of earlier
  passes above; do not reverse them from a photo alone.
- A 30-agent review cost about 9% of the user's weekly limit. They asked for at most about four
  sub-agents at a time.

## Photo review of all 172 aligned poses (2026-10-01 night)

Thirty review agents compared the web render at every aligned pose with its photograph
(`checks/fidelity/all-1001/`, raw findings in `docs/photo-review-2026-10-01.json`: 731 findings, 168 photos;
144 poses rated rough, 18 good, 6 bad). Done from it so far, each backed by two or more photos:
the low dark perforated lake wall along the lane, the hill only to the north-east, lane undergrowth
low and off the shoulders, side-road clearings following the temple setback, the narrower God room
gate, east veranda posts, the taller wing roof, the temple gallery balcony moved out over the
portico, the two rusty lean-to roofs in the house court, the main roof's lower eaves and steeper
pitch, the tall God room block, and the inner entrance platforms as one level with a plain face.

Not done, in rough order of value (see `docs/photo-review-2026-10-01.json` for numbers and object names):
- House front is about 4 m too long on the east. 14.56.30 / veranda.jpg show the lower walkway
  ending at a dark panelled door in a turquoise wall just past the sitting bay (local x about 6),
  and house-front.jpg / 15.26.49 put the west face of the turquoise stair block there, not at
  x 9.8. Shortening the east end would also close the gap to the corner building that the user
  did not want fixed by sliding the house. Needs a plan and probably the user's eye.
- House: the stand on the Naga platform is pale turquoise in 'turning 135 degrees 2' and cream in
  the 2013 photo (kept cream); the shrine's moulded base plinth (14.52.16).
- Temple: stair-door wall and the upper wall over it flush with the portico front (15.10.34);
  east range (tower block one bay south, one pavilion not two stacked, no upper storey over the
  window wall, taller blue porch: 15.01.44, 15.02.17, 15.02.23); corner building five or six bays
  (15.20.01, 15.22.36, 15.23.28); entrance piers under the blue arch piers (temple-entrance.jpg);
  great bell between two piers (15.14.44); inner sanctum plinth about 1.2 m high.
- Landscape: Vipra Bhavan about 1.3x taller (14.28.15, house-front-left.jpg); bathing gate about
  6 m further west (15.22.06, 15.22.40); terraces and steps beside the stage stair (15.12.15,
  15.13.26, 15.13.30); bathing arcade with three posts a side (15.27.07); whether the opposite
  bank low house has one storey or two (15.30.09 against the earlier 15.11.58 reading).
- Bad poses to re-align: 15.04.51, 15.05.48, 15.01.56, 14.57.56, lane-left.jpg, 15.25.49.

## Overnight pass (2026-09-29 night)

- Tour-frame QA (every 3 s) twice, plus photo review rounds 4-5 of the trusted poses and the
  user's 19 new alignments. Fixed: floating/clipping parts (stair rails, grinding stone, donation
  boxes, post grooves, wing roof inside the front room, lamp canopy), coplanar copings, tour
  stops staring into walls, many colours/materials, entrance-hall platforms 0.65 m, God room
  1.4 m deeper, east-range upper level re-read, modelled naga stones.
- Export-safe photo panels: crops baked into UVs; lit, single-sided panels (Unreal showed whole
  photos and black boards). See photoreal PHOTOREAL-NOTES pass 5.
- Skipped (conflict or needs the user): back-courtyard tin lean-to (14.44.14/48, 14.46.10),
  bell-hall pillar material (15.14.51), covered-hall depth (temple right side -45), far-bank
  building heights (15.11.58 vs 14.58.26), house balcony lattice colour, porch bell position.
- 2026-10-01, notes re-checked after the setback (all 22 noted photos re-rendered):
  - Front room: the last wall stub at z 4.05 is gone ('left hand side when entering 2'); the wing doorway
    is shut with a timber door.
  - God room: the shelf now stands behind a front wall with a stepped dark doorway; the two metal plates
    and a framed print hang on that wall ('God room, left side'). The altar's blockers had stayed 1.4 m
    in front of it since the deepening pass; they now move with it.
  - Still open: 'temple right side facing opposite to the entrance' (the covered hall would have to be
    about twice as wide; it belongs with the corner-building redesign below), and 15.14.51 (pose).
- Temple setback (2026-10-01, user's note on 15.15.26: "the house is clearly a bit ahead of these temple
  outside pillars"): the whole temple complex, its corner building, the forecourt pond and the low white
  outbuilding sit `K.templeShiftZ` = 4.5 m back from the lane (measured 3.5-6 m). temple.js stays authored
  on the house's front line and is shifted at the end of `buildTemple`, like `K.houseShiftX`. 61 saved
  poses moved with it (backup: `F:/Shankaranarayana/align-poses.before-temple-setback-2026-10-01.json`).
  `tests/entrance-geometry.mjs` runs the temple at its authored position; `tests/temple-setback.mjs`
  checks the shipped placement. The user rejected sliding the house along the lane, although 15.00.01,
  15.12.03 and 15.15.26 still show the wing end further from the corner building than modelled.
  Worth re-aligning now: 14.58.48, 14.59.36, 15.00.01 (lane views that include the corner building).

## User answers (2026-09-29)

- Temple-side wing stays one storey (the four lane photos notwithstanding).
- God room: upstairs floor cut back over x ±2.6 (local), z 4.0-6.0, leaving a double-height
  space in front of and above the God room; heavy beams and an upstairs rail at the void edge.
- Temple entrance (15.15.51): full-length dark timber leaves open along the passage; the teal
  reveals that read as blue half-doors are timber.
- Inner temple (15.08.10): entrance platforms and pillar ledges 1 m above the aisle (top 1.55).
- More trees and undergrowth behind the temple-side wing along the side road (14.58.48,
  15.21.53); the roadside taps stay clear. In 15.21.53 the covered hall still hides most of it.
- 14.46.51 shows the neighbouring house, not our garden: the west shed (15.28.49) is restored.
- Pavilion: the user says 15.30.02 and 15.26.12 agree and it stands at the tank's east-south
  corner (far bank, temple end). The model has it on the far bank at x 31-37 (south end x 49.4);
  not moved yet, as 15.30.02 would put it further north. Ask whether it should hug the corner.
- West bank keeps its tiers the full length: 15.23.38 clearly shows them from the corner stair
  to the far bank. The wall with a rail in 15.26.49 is probably not this stretch (tried and reverted).
- Re-aligned by the user: 14.37.50, 15.04.59, 15.26.12, 15.30.02. Pavilion position confirmed as is.
- User's 14.37.50 note: God room deeper east-west. Altar, rear wall and everything behind z 9.3
  moved back 1.4 m (house.js end pass; side walls, floor and the roof's rear half stretched);
  tour stops behind it moved to z 12.7. 14.35.26 was fitted to the old altar and needs re-aligning.

## Claude pass 4: photo sweep (2026-09-28 night)

Two full render sweeps of all 159 poses (`checks/fidelity/claude-all-38e7412`, `-54eb59a`),
reviewed by agents; round 2 rated 98 poses as well aligned. Fixed, all tests passing:
- `2e2c518` Align page: a folder pose wins a savedAt tie (stale browser copies had undone 26
  scripted far-bank/hall pose fixes; restored in the pose repo `a3dcbc1`).
- `fd1b62d` User's 10 walkthrough notes (lake gate closed, porch under road piers, courtyard
  filler wall, bell pier, floating instanced railings, gallery stair well open, God room front).
- `c9f649b` Tour opens with a one-time flight from the far bank to the front door
  (`tour.intro`). Start uses the 15.26.04 spot; 15.26.12 itself is not aligned.
- East range: veranda 0.95 m high (15.04.08), rubble-plinth porch with steps and slab roof,
  open stair bay, rooftop scalloped pavilion (15.02.23, 15.01.44).
- Inner temple grey granite, laterite bell-hall platforms, sanctum gates folded back, east
  grilles removed, rear panels dark stone, east panels blue (15.08.10, 15.08.42, sanctum photos).
- West veranda parapet lowered; its southern stretch solid with no scallops (15.05.42).
- Tank west and house banks in broad 0.9 m tiers (15.23.35/38); lakeside arcade roof steep
  (14.59.39); house west-end stair bay pale blue plus a laterite shed (15.28.36/49); naga
  niche steps; stage curtain black; stair elephants both on the south side; west-lane
  cottage has no pink upper floor.

Left for the user (conflicts with earlier decisions or poses not trusted):
- 14.58.48 / IMG_20130720_180708 show only trees and a trough right of the lane beside the
  lodge, where the model has the house's temple-side wing and the clock-side room.
- IMG_20130720_182845 looks up at the God room's tiled roof underside; the model's upper floor
  slab covers that space (an upstairs trunk stands on it).
- 15.15.51 (the saved camera is right: moving it back 2 m shrinks the door): the photo shows the
  side platforms only near the rear pillars, with visible front faces ~0.75 m above a lower
  floor that runs to the entrance. The model runs them the hall's full depth. Needs a decision.
- 14.37.50: camera 0.1 m from the God room altar niche; needs re-aligning.
- 15.30.02 / 15.26.12 disagree on the lake pavilion's position; left at the satellite fit.
- 15.19.36 shows a window where the road-corner shutter is; the shutter was kept per the note.
- 15.28.49 shows a small laterite shed with a tiled roof beside the west stair foot, but 14.46.51
  looks down on that ground from the rear upper floor and shows open garden. Left out.
- 15.15.26, 15.14.02, 15.00.01 and 15.12.03 (all well aligned, looking west down the lane)
  show the house's temple-side wing as a two-storey block with a steep hipped roof over a
  tiled one-storey front with the blue tarp; the model's wing is single-storey.
- IMG_20130720_182845 and 14.32.31 both show an open sloping timber roof over the God room's
  blue grille front, not the flat red upper-floor ceiling.
- 15.08.10: the old inner shrine's roof, stretched 2.78 m for the 15.05.42 note, now hangs its
  front eave (~3.0 m) over the bell platforms; the photo shows a flat white ceiling there.
- 15.26.49 shows the west tank bank as a vertical wall with a ledge and rail; 15.23.35/38
  show tiers (implemented). They may be different stretches.
- Round-3 review of the 98 well-aligned poses: `checks/fidelity/claude-good-d340e4a`; the
  46 findings (mostly medium confidence) are in the session scratchpad, not the repo.

## Claude pass 3: user's notes (2026-09-28)

The user now leaves notes from the walkthrough: press **N** in a local build (`node server.mjs
--photos F:/Shankaranarayana`). Notes go to `F:/Shankaranarayana/align-model-notes.json` (each
save auto-committed in the pose repo); the button never appears on the deployed site (no
`/model-version`). `node tools/notes-to-poses.cjs` turns them into
`checks/model-notes-poses.json`; render one with `POSE_FILE=checks/model-notes-poses.json
PHOTO_NAMES='<note-id>' node tools/capture-fidelity.cjs <batch>`.

All 15 walkthrough notes and 7 align-page notes are done and pushed (`622f44a`), not deployed.
- `95a3977` Align notes: house stair railing, east door, clock-side room, rear fence; bank posts,
  west verge, Vipra Bhavan +2 x; covered-hall stage bay to x 22.64.
- `837202b` Old inner shrine 2.78 m longer toward the rear range.
- `ec3584c` The N note tool (`dist/src/model-notes.js`, writable entry in `server.mjs`).
- `a21af8f` West green platform cut at x 35; brown entrance walkway; brass lamp removed.
- `43abf3e` Bell bay 1 m wider (more blocks the courtyard walkway); bell between two white piers.
- `20b7701` House: facade right door, sitting-bay furniture, desk and inner door leaves removed.
- `603e23f` Lake south-east: mound, hill stair, white block and shed removed.
- `9b75a45` West veranda edge straight at 24.2; rear stair climbs straight back (not walkable,
  `K.blocker`); sanctum front cut at x 31.7 with a red north side wall.
- `622f44a` Covered hall runs north to the street wall through the road-corner block.
- Deferred by the user: the house entrance roof.

## Claude pass 2 (2026-09-27 night)

Full web review of all 136 dated poses at `bb5edb6`: `checks/fidelity/claude-all-bb5edb6/`.
- `bb5edb6` Far bank 2 m closer (user: "bring it closer"; satellite 26.5 m water). One mapping,
  `farZ`/`farZinv` exported from landscape.js: past z -29.5 (x < 52) moves +2, -29.5..-25.5
  stretches. main.js terrain, water, ground and `location` use it; tour, viewpoints and tests
  converted. Pose repo `0db6b87` moved the 25 far-side poses the same way.
- `325ffe5` Far and west banks: weedy ground, shrubs and tall weeds beside a dirt footpath
  (15.22.00, 15.23.08, 15.25.49). Note: vegetation authored past z -41.5 is moved +6 by the
  older satellite-refit pass, so author it 6 m further out.
- `370583c` East passage south end: two-storey block with a tiled hip roof (15.04.55).
- Poses: far-bank 15.21.50, 15.22.00, 15.22.06, 15.22.36 lifted 1.38 m again (`38c2ed4`; an
  align-page save had restored old heights); 15.13.51 lifted 1.2 m (`28ffc17`).
- Open: north end of the east passage (15.03.33). The photo's two-storey room with the blue
  door sits centred at the passage end and reads ~36 m away; the model's is at the east edge
  ~27 m away. Needs the user before moving the rear range again.

## Claude model pass on PHOTOREAL-NOTES (2026-09-27 evening)

Ownership: Claude owns the model on `main`; Codex owns `photoreal` and reports model
findings in `PHOTOREAL-NOTES.md` there. Web captures: `checks/fidelity/claude-*` (local).

- `9ca695f` Temple road frontage (x 20.4-35): four-metre bays measured head-on in 15.22.36
  against the 2.72 m shutter; one open-shuttered upper window per bay; two narrow ground
  windows (26.1, 29.7); donor sign and bench instead of the corner block's ground windows.
- `d569e24` Palms behind the far bank raised to 20-26 m (14.57.50). More horizon palms broke
  the distant-foliage triangle budget, so the horizon ring is unchanged.
- Pose repo `8fedd1e`: 15.22.00, 15.22.06, 15.22.36 lifted 1.38 m (saved on the old far-bank
  ground). Reload the align page before saving so a cached copy doesn't undo this.
- Not model problems (the geometry there did not change; the saved cameras are off):
  15.04.59 (inside the red shrine wall), 15.14.51 (facing a portico pier at 2 m), 15.11.45
  (against the railing). 15.03.38 matches the widened passage with the camera ~0.8 m east.
- Poses saved before the widening (`45eec44`) in moved regions, to re-save: east 15.03.33,
  15.03.38, 15.04.55; west 15.10.43, 15.10.49, 15.11.00, 15.11.08, 15.11.17,
  IMG_20130720_180635, IMG_20130720_180653 and the two "temple right side" named photos.
- Open: 15.30.09 (upstairs window jamb blocks the right half; far bank looks closer in the
  photo). The small pond: 14.58.48 shows no pond left of its camera, which suggests it sits
  further east than PX 23.7, against the three photos that moved it west. Left unchanged.

## Final native refresh and verification (2026-09-27)

Native Blender output now includes the house, northwest/Tulsi and rear-range repairs
through web commit `16b7691`. Local review: `checks/fidelity-native-final-followup/REVIEW.md`.
Three saved camera transforms and FOVs match; source hashes and photo/UV materials
verify. Reduced native shading edge radius from 12 mm to 3 mm.

Web wheel/geometry, 58 destinations and 60 route segments, views, lake stairs,
shrine platforms, gamepad, mobile and photo-alignment checks pass. No new binaries
entered Git. Older notes saying native output is stale are historical.
Remaining large mismatches: house background objects and lighting, temple proportions
and ornament; rear close-up `15.05.42` needs user alignment. The timed pass is complete,
not the entire reconstruction.

## Rear temple range completed (2026-09-27)

References: `15.11.08`, `15.11.17`, `15.05.42`, with the dome checked in `15.12.56`.
Review: `checks/fidelity-rear-range/REVIEW.md`. The earlier rear-room draft is now
completed and verified: supported upper room, open bay and jali, roof-mounted dome,
usable stairwell, enclosed lower door/window bay and paired stones. West-veranda
scallops and pierced parapet replace the solid rail; the unsupported z=22 stair is gone.

The saved `15.05.42` pose faces a different section; it was not refitted. Dimensions
and stair direction remain estimates. Wheel/geometry, full circuit, physical stair
clearance and browser checks pass. Older notes below about an unfinished rear draft
are historical. No private media was committed.

## House right entrance repair (2026-09-27)

Reference: `IMG_20130720_175312.jpg`; user-confirmed pose saved at 20:39:15 UTC.
Use it unchanged. Earlier `175312-pose-height` advice is superseded.

- Assuming the house faces east (-Z), moved the stepped pedestal 1.65 m east
  and 0.50 m south onto the entrance ledge; used the pale 2013 finish.
- Peach round and octagonal timber pillars now sit near the frame center. Removed
  the intervening narrow partition and connected the supports with a ceiling bearer.
- Three red treads ascend northward (-X). Cut a genuine lower floor pocket in the
  old solid front slab; preserve access to the inner sitting platform.
- Desk moved to the north platform edge; its viewpoint and the walking tour follow
  the corrected layout. Placement distances and unseen connections remain estimates.
- Local original/before/after: `checks/fidelity-house-right/REVIEW.md`.
  Photos and user poses unchanged; no media added to Git. Rear temple draft separate.

## Northwest layout follow-up (2026-09-27)

User references: `15.10.34`, then `15.10.30` from the same place turned left
45 degrees, then the entrance view `15.02.00`. These supersede the earlier
speculative corner-arch connection. Local review: `checks/fidelity-nw-layout/REVIEW.md`.

- Central stair door stays fixed. Its plain left wall is 1.35 m wider.
- Blue bay moves 3.70 m inward along -X, inside the round-column line; the street
  building is hollowed there. A level connection joins the raised chair platform.
- Removed the invented projecting corner arch. The barred window now occupies
  the white wall between the blue bay and stair wall.
- Tulsi moves 0.50 m along -X and 1.90 m along -Z (including the user-requested
  additional 0.35 m northward nudge), opening the court and placing it
  farther right in the entrance view. The rest of the temple was not translated.
- Distances are estimates. The foreground column, roof proportions and lighting
  still differ from the photos. No claim of a fully matched corner.
- Review uses one eye position and a 45-degree turn for the first pair; this is
  an ignored diagnostic copy. Original saved poses and photos remain unchanged.
  The unrelated rear-room draft remains uncommitted; native output is not rebuilt.

## Northwest temple corner correction (2026-09-27)

The user identifies this corner by `IMG_20130720_180635` and `180653`: the chair
hall and scalloped service porch, not the far rear dome room. Local review:
`checks/fidelity-temple-northwest/REVIEW.md`.

- Two high windows flank a solid wall with pilaster, beam and electrical boards.
- The red chair floor is at 0.60 m; the grey passage is at 0.112 m, with access steps.
- The entrance-side hall and exterior stair again meet the existing street wall and
  porch. The wider outer circuit farther back is retained.
- Added the broad corner arch, suspended bell and near barred window. The service
  opening follows the 2013 raised shutter; the 2011 photo has an older panelled door.
- Wheel/geometry and physical window, floor and bidirectional stair routes pass.
  Dimensions, arch connection and furniture details remain approximate. Saved poses
  are unchanged. The far rear-room draft remains separate and uncommitted.

## House entrance correction (2026-09-27)

Primary reference: `IMG_20130720_175306.jpg`, plus the user's confirmation of an open
lower passage and nearly symmetrical furnished platforms. Door opening reduced from
2.05 m to an estimated 1.20 m; shorter leaves expose both bays. Chairs moved back
0.32 m to clear access around the posts; the other platform now has a storage trunk,
and a metal vessel follows the reference. Platform sizes and levels are unchanged.
Original / before / after: `checks/fidelity-house-entry/REVIEW.md` (local, ignored).
Wheel/geometry and explicit platform access/visibility regressions pass. Exact room
widths and object details remain estimates; this is a bounded entrance repair.
The unfinished temple rear-room geometry is separate, uncommitted work.

## Review workflow

After each major improvement, create a local `REVIEW.md` with original / before / after
images from matching cameras, source revisions, and short notes on changes and uncertainties.
Preserve earlier reviews; label diagnostic camera or lighting adjustments. Keep photo-bearing
reviews ignored and local, block source-file writes during capture, and link the new review
in the progress update. This is the user's preferred review format.
The local index is `checks/REVIEW.md`.

Use `tools/capture-fidelity.cjs <new-batch-name>` with `PHOTO_TIMES=HH.MM.SS,...`,
`PLAYWRIGHT_MODULE` and `BROWSER_CHANNEL` from the test setup below. Outputs go under
`checks/fidelity/`; writes to local photos are blocked and loaded JS hashes recorded.
Optional `FIDELITY_BASELINE=<commit>` substitutes only house/temple/landscape geometry;
`FIDELITY_RAISED_HALL=1` adds the labelled +1.18 m diagnostic. Pair captures with
`tools/fidelity-review.py --help`. Both tools preserve existing output directories.

## Continued fidelity session (2026-09-27, ongoing)

Geometry through `b8b8a66`, starting from `2ea3ff9`; local only. Review:
`checks/fidelity-session/REVIEW.md` (original / session start / current).
Later reviews: `checks/fidelity-capitals/REVIEW.md` and
`checks/fidelity-native-materials/REVIEW.md`; earlier reviews are preserved.
Also see `checks/fidelity-pedestals/REVIEW.md` and
`checks/fidelity-window-exposure/REVIEW.md`.
The cumulative nine-view review is `checks/fidelity-final/REVIEW.md`.
Final native comparisons: `checks/fidelity-final-native/REVIEW.md`.
Start the user work with `checks/fidelity-user-decisions/REVIEW.md`; it shows obstructed
anchor cameras and the remaining layout choices, and links the 47-pose historical queue.

- Sitting window: ochre surround, rounded blue mouldings, exposed recess and oxide sill.
- Adjacent hall: dark stone with pale inlays; rear dais, central steps and high green vents;
  projecting two-storey centre porch, floor and rail returns. Wider 14.59.26 and 15.12.15
  corroborate the close-ups. Dimensions remain estimates from photographs.
- Service porch: curled arch cusps and pale edges. Lamp: scalloped oil cups, turned bands
  and alternating pegs on the pale pole.
- Hall capitals: curled brackets now extend beyond their collars in both beam directions
  (`cd7e8d9`); wheel/geometry and paired camera captures passed.
- Outer pedestal faces now have approximate procedural floral relief (`7ae7b3d`), supported
  by 15.13.51 / 15.12.15. Inner bases and deity engravings remain unresolved.
- Balcony balusters now use the photographed flat forked profile (`fec42f2`);
  `checks/fidelity-balcony/REVIEW.md`. The sitting chair has lower back/arms, and the window
  has its hanging wire (`b8b8a66`); `checks/fidelity-sitting-details/REVIEW.md`.
- Porch-side blue window **is confirmed** by 15.02.27, 15.03.47 and 15.10.30. The plain-wall
  15.10.34 view likely crops it out. Placement relative to the stair door still needs alignment.
- Wheel/geometry passed each geometry checkpoint. Final browser verification: 58 destinations,
  60 routes, no failures/errors. Views, lake stairs, shrine platforms, alignment, gamepad,
  mobile landscape and mobile rendering also passed; logs are in `checks/fidelity-session/`.
- Native refreshed: eight views in `blender/build/final-integrated-{window,exterior,diagnostic}`
  on `photoreal`, with source/asset hashes in each `provenance.json`. They use the audited
  `f58176b1...` pose-file snapshot; later alignment updates are noted below.
  Exterior exposure is 1.3, windows use the EXIF profile below. The hall close-up is labelled
  +1.18 m diagnostic. Browser/native camera transforms and geometry sources were cross-checked.
- Native photo textures (`a204be1`): 22 material maps from 11 explicitly approved web assets
  restore the previously blank figure panels. Private reference media remain excluded.
  `checks/fidelity-native-photo-cards/REVIEW.md`; flat cards remain a limitation.
- Native surface relief (`5359759`): 127 authored bump maps and one roughness map are retained,
  including their channels, strength and UV transforms. Image/link/UV checks pass for 197 color
  maps. Geometry bytes are unchanged. `checks/fidelity-native-relief/REVIEW.md`.
- Native provenance (`e0ec8fe`): saved blends record export, geometry, pose and build-script
  hashes; render batches record the blend, renderer, image assets and camera/exposure settings.
- EXIF exposure (`ec2064f` on `photoreal`): the window photos used 1/14 s, ISO 125 versus
  the exterior reference's 1/203 s, ISO 50, both f/2.6. Their +5.180-stop difference gives
  a useful window render at 6.480 stops. This is a relative estimate, not absolute calibration.
  `blender/photo_exposure.py` creates an ignored profile for `render_poses.py --exposure-profile`;
  the renderer records camera matrices and per-view exposure without saving the blend.

**Pose-file audit:** opening alignment auto-synced `align-poses.json`, refreshing its export
timestamp. All paired review cameras match, but full historical file equality is unverified.
The capture harness now blocks writes and checks the source hash before/after. The viewer
now caches loaded poses without writing the source; explicit Save/Import still persist.
Photographs and `docs/photo-findings.json` are untouched. User-only layout decisions remain open.

**Later alignment updates:** at 17:05 UTC the source pose file began changing after the
captures had finished. A read-only comparison at 17:05:59 found 12 changed cameras; the newer
file was preserved. `blender/build/pose-change-audit.json` records that comparison. The user
decision review is an earlier snapshot, especially 15.04.55 / 15.21.56; recheck their newer
poses before following its camera suggestions. The writer has not yet been identified.
At 17:07:02, the nine-view cumulative review still matched the current saved cameras except
15.10.43, which had also changed. Preserve the review snapshots; refresh only after the
ongoing alignment edits settle.

## Initial Codex fidelity pass (2026-09-27)

Geometry checkpoint: `03d5fba` on `main`, merged into `photoreal`. Nothing pushed or deployed.

- **House:** the +x sitting window has a real 1.9 m rounded recess, 0.18 m deep; the opposite
  window is unchanged (14.56.56, 14.57.08).
- **Adjacent building:** four inner lower columns, 3.5 m behind the front row; heavier lower
  shafts, bases, inset panels and diamond relief. Upper columns and plinth stay unchanged
  (15.13.51, 15.19.57). Exact inner-row depth remains an estimate: the older findings disagree.
- **Lamp:** moved to (38.7, 11.2), with shelter and pale pole. The bell-return viewpoint and
  tour now go around it. The pole's exact relation to the flagstaff remains approximate.
- **Service porch:** moved 1.5 m west, deepened to 2.7 m behind the front piers, with a west
  scalloped arch and a 0.21 m inner step. Removed intersecting portico/frontage solids and
  connected the floor to the hall. The adjoining blue window was deferred; see the updated
  evidence above. 15.10.43 still needs re-alignment.

Local review: `checks/fidelity/REVIEW.md` and its four photo/before/after sheets. Cameras stay
fixed between renders. The 15.13.51 close-up uses a labelled +1.18 m diagnostic eye height in
both versions; its saved pose is at the raised floor and needs re-saving. See the pose-file
audit above for the automatic metadata rewrite discovered later.

Blender: rebuilt from this checkpoint; nine saved-camera renders and sheets are under
`D:\repos\shankaranarayana-photoreal\blender\build\fidelity-20260927` (ignored). The render
manifest records the source revisions. A separate `fidelity-20260927-diagnostic` folder has
the raised column camera. Interior window lighting is dark; use the web sheets for geometry
review. Unreal was not rebuilt in this pass.

Verification: wheel/geometry, browser routes, views, shrine platforms, lake stairs, gamepad,
photo alignment, mobile landscape and mobile rendering passed. Browser verification reports
58 clear destinations, 54 route segments, no route failures or page errors. New regressions
cover the actual window recess, column aisles, lamp sightlines, tour clearance and porch interior.

## Layout of the work

- **Web app: the source of truth.** `dist/src/*.js` on `main` in this repo:
  - `kit.js`: shared helpers, plus the registries `K.colliders`, `surfaces`, `ramps`, `roofs`
    and `labels`, and `K.houseShiftX = -3.8`.
  - `house.js`: authored at x=0 and placed by `K.houseShiftX`.
  - `temple.js`, `landscape.js`.
  - `main.js`: viewpoints (`destinations`, `photos`), the ground slabs and the lake plane.
  - `tour.js`: the tour.
  - `photo-alignment.js`: the align tool.
- **Blender and Unreal pipeline:** the `photoreal` branch, checked out as a worktree at
  `D:\repos\shankaranarayana-photoreal`. It regenerates everything from the web model; nothing
  is authored there by hand.
  - **Merge `main` into `photoreal` before every render or rebuild.** `blender/export-scene.mjs`
    reads that worktree's own `dist/`, so without the merge it renders a stale model.
  - Order: `export-scene.mjs` → `build_blockout.py` (cameras from
    `F:/Shankaranarayana/align-poses.json`) → `lookdev.py` → `render_poses.py` / `contact_sheet.py`.
    Each script's docstring gives its exact command.
  - Export now needs `@napi-rs/canvas` (declared in the photoreal package). This machine's
    installed copy can be selected with
    `$env:CANVAS_MODULE='C:/Users/abhis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'`.
    Use `--python-exit-code 1` for automated Blender commands, then run
    `blender -b blender/build/lookdev.blend --python-exit-code 1 -P blender/verify_materials.py`.
  - Unreal: `export_unreal.py` → `unreal/scripts/import_scene.py` → `materials.py` →
    `build_level.py`, each run with `UnrealEditor-Cmd.exe <uproject> -run=pythonscript -script=...`.
  - Copy `nav.json`, `tour.json` and `views.json` into `blender/build/unreal/` after the export.
  - Run those steps in that order; each takes a few minutes. UE is at `I:\Epic\UE_5.8`, and the
    project lives at `unreal/Shankaranarayana` (gitignored).
  - To play: `UnrealEditor.exe <uproject> -game -ExecCmds="DisableAllScreenMessages"`.
  - In-game screenshot: add `py unreal/scripts/game_shot.py OUT.png 900` to `-ExecCmds`.
- **Private photos:** in `F:\Shankaranarayana`. Read them only; never copy them into the repo.
  The user's saved poses and notes are in `align-poses.json` there, and the align tool writes
  that file through `server.mjs`.

## Tests

The tests need Node 24 and Playwright with Edge, and a server on http://127.0.0.1:4173 (`node server.mjs`):

```powershell
$taskNode='C:/Users/abhis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
$env:PLAYWRIGHT_MODULE='C:/Users/abhis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
$env:BROWSER_CHANNEL='msedge'
& $taskNode tests/wheel-movement.mjs  # required before geometry commits
if ($LASTEXITCODE) { throw 'Geometry/navigation failed' }
foreach ($test in @('verify','views','lake-stairs','shrine-platforms','photo-alignment','gamepad','landscape-mobile','mobile-rendering')) {
  & $taskNode "tests/$test.cjs"
  if ($LASTEXITCODE) { throw "$test failed" }
}
```

A `verify.cjs` failure of `net::ERR_NO_BUFFER_SPACE` is transient; rerun it. The git index has
been seen to empty itself. Before each commit, check that `git ls-files | wc -l` equals
`git ls-tree -r HEAD --name-only | wc -l`.

Idioms used in the model code:
- Large layout changes are done as post-passes over the objects and nav entries a section added,
  recorded with `navStart`-style index snapshots. Examples: the house shift in house.js; the
  east-range shift, the frontage rework and the east upper storey at the end of temple.js; and in
  landscape.js the far-bank shift, the far-bank terrace lift and the adjacent building's plinth raise.
- Moving geometry means moving its `K.blocker`, `K.surface` and `K.ramp` entries, its
  viewpoints, its tour stops, and the tests' hard-coded coordinates along with it.

## Done on 2026-09-26

All 159 aligned poses were rendered and compared with their photos. The per-photo findings
are in `docs/photo-findings.json`; they describe the model before the commits below.
Implemented (`git log d7f1b8f..HEAD`) wherever two or more photos agreed:

- **Temple:**
  - Courtyard: the user's notes on 15.11.08, 15.03.33, 15.03.38 and 15.04.55.
  - The upper hall's open central bay with the stair well and name board.
  - Upper storeys on the rear range and on the east range's north part.
  - The right hall, three windows long.
  - The flagstaff, about 18.7 m.
  - The inner spire, about 11 m.
  - The ceremonial bay at the covered hall's far end.
  - No east colonnade in front of the shutter bay.
  - The pale pole at the lamp plinth.
  - The road-corner frontage extended to x 35, with the portico starting there.
  - The God room's doorway shelf, guardian figures, inner gate and open blue leaves.
  - The entrance doorway narrowed to about 1.45 m.
  - The pond moved 1.8 m west.
  - The marble dado.
- **Tank:**
  - The far bank has tall tiers, a ledge and a wall, with the ground behind raised to 1.38 m.
  - Both side banks have a dark parapet with white posts.
  - The arcade has an east-end room and a slim west-end pier.
- **Adjacent building:** a 2.8 m plinth with a plain lower flight and stair elephants. The shop's cream end block comes down to the ground.
- **House:**
  - The God room's stone posts are on its east side.
  - The east veranda edge matches the west one.
  - The rear strip has an aqua wall.
  - The grinding bowl is in the rear strip.
- **Unreal:** the black view was an exposure setup problem; also fixed white foliage and the lake water.

## User decisions (2026-09-27)

1. **Passages must not get narrower: expand everything around them.** Done in `45eec44`:
   east range +2.5 m (`DX=4` in the east-range pass), west hall and stair -1.5 m, rear range
   back 7.5 m. Recheck against 15.03.33, 15.03.38, 15.04.55 and 15.11.08 in the full sheets.
2. **Lower the lake water.** Done in `6254cc5`: water at -2.1, tiers, steps and descents
   rebuilt, lake tests updated.
3. **Poses.** The user re-saved all 46 flagged poses on 2026-09-27 (the 47th, lane-left.jpg, has
   no file). The `"alignment":"poor"` marks in `docs/photo-findings.json` are now out of date.
   Decisions 1 and 2 moved geometry after most poses were saved (pose repo `84ce6ee`, model
   `3f46126`); poses in the moved regions were not transformed and may need re-saving.
4. **Still open: the user's 15.30.09 note** says the far bank is closer at the lake's west end.
   That conflicts with the satellite-derived tank outline (z -9..-37).

## Preserving poses when geometry moves

Poses in `align-poses.json` are absolute world coordinates, fitted to the model as it was when
saved.
- **Model stamp:** each pose saved since 2026-09-27 carries
  `model: {commit, uncommittedEdits}`, from the server's `/model-version` endpoint (HEAD, and
  whether `dist/src` has uncommitted edits). Poses saved earlier were fitted to the model at or
  before `3f46126`. Render a pose's own geometry with `FIDELITY_BASELINE=<commit>`.
- **Pose history:** `F:\Shankaranarayana` is a local-only git repository that tracks only
  `align-*.json` and its `.gitignore`; photos are ignored, and it has no remote. Never add a remote
  or track photos there. `server.mjs` commits each saved file there with the model commit in the
  message; `git -C F:/Shankaranarayana log -p -- align-poses.json` recovers any earlier pose.
- **Migrating:** when a change moves a region (e.g. the east range +2.5 m in x), apply the same
  transform to the poses taken in that region with a small script, commit the result in the pose
  repository, and name the transform in both commit messages.

## Remaining findings that could be done without the user

Ordered by support. Check each against the photo before changing anything, because poses can be
off by 1 m and a few degrees.

- **Two photos agree:**
  - Columns, service porch, sitting-window recess and lamp placement: addressed in the Codex
    pass above; use its comparison sheets and caveats before changing them again.
  - West bank of the tank: 15.23.38 / 15.23.35 confirm a straight stair. Its rise depends on
    the unresolved bank heights/water level above; old notes disagree on location. Resolve
    those dimensions before adding the stair. The paired-flight notes in 15.21.56 / 15.22.00
    may describe another location.
  - Covered hall (temple.js "Covered hall"): two lane-side windows instead of three
    (IMG_20130720_180635); an open door and street shutter at the entrance end (two of the named
    "temple right side" photos). Those photos are from 2013 or undated, so they may show later changes.
- **Single photo, confidence 0.6 or more:** see `docs/photo-findings.json`. Highlights:
  - Adjacent building: a projecting central two-storey porch and a larger gable (14.59.26).
  - East range: the shallow blue shrine and the open kitchen hall (15.04.08).
  - Bell platform: a second pier (15.14.44).
  - Temple entrance side platforms: higher, at about 1.15 m (15.16.09).

Photos from different years exist: `2011-09-21 *` is one afternoon, `IMG_20130720_*` is July
2013, and the descriptively named files are undated. A conflict between sets may be a real
change over time.
