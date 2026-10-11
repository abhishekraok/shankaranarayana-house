# Entrance textiles and stage walking: before / after

Main `a0546ae` fills the bare inner entrance bay with four folded woven cloths and
a supported sagging cord. Sizes, pattern and arrangement are estimates from the
2011/2013 photographs; the owner's furniture removal remains respected.

| View | Before (`b3b0f63`) | After (`a0546ae`) |
| --- | --- | --- |
| Right entrance | [175312](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-b3b0f63/unreal-20261011-034353/143-IMG_20130720_175312.png>) | [175312](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-a0546ae/unreal-20261011-043115/143-IMG_20130720_175312.png>) |
| Inner bay | [135 degrees 2](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-b3b0f63/unreal-20261011-034353/099-house, after entering, turning 135 degrees 2.png>) | [135 degrees 2](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-a0546ae/unreal-20261011-043115/099-house, after entering, turning 135 degrees 2.png>) |
| Inner bay, second angle | [135 degrees 3](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-b3b0f63/unreal-20261011-034353/100-house, after entering, turning 135 degrees 3.png>) | [135 degrees 3](<D:/repos/shankaranarayana-photoreal/blender/build/sheets-a0546ae/unreal-20261011-043115/100-house, after entering, turning 135 degrees 3.png>) |

Independent native comparison with all three references passes. Existing geometry,
navigation and all 172 saved poses remain exact. [Full overview](D:/repos/shankaranarayana-photoreal/blender/build/sheets-a0546ae/unreal-20261011-043115/index.html):
172 renders / 29 sheets. The editor exited with access violation `-1073741819`
after closing its log; complete images, abnormal shutdown. Independent comparison
of all 29 sheets with `b3b0f63` found no substantial new regression. A matching
Windows crash event/dump confirms a real late native teardown failure; its cause
is not established. Packaged smoke and restart are separate clean-exit evidence.

Windows package, fresh scene/material/lighting audits and isolated smoke pass.
Smoke now drives all three stage approaches up and down with actual input: the
front centre, beside the elephants and terrace side stairs. The six legs retain
continuous native support across 1,193 samples, with rises of 277.30 cm (front)
and 112.00 cm (side), no added recovery and full saved-state preservation.
These tracks pass before the pending sculpture change; they will be retested after it.

Six bank-road legs, ordinary cold restart and focused packaged bank Continue also
pass with exit 0. [Road appearance](D:/repos/shankaranarayana-photoreal/docs/review-2026-10-11-bank-road.md)
now uses a persisted exclusive material gain, with fresh saved binding checks.

Package inventory passes: 3,429 IoStore entries, 212 native texture entries, nine
approved source photograph textures and no private filename matches. This checks
filenames/provenance, not image content. Generated media and binaries remain ignored.
