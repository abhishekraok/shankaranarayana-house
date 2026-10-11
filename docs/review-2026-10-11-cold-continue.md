# Cold Continue on dry ground — 2026-10-11

Native proof used Unreal 5.8 and model `ad2b8a7`, with two fresh processes and an
isolated save directory for each before/after run.

| Check | Before | After |
| --- | --- | --- |
| Continue from grounded pond bank | Returned 33.29 m to entrance | Restored the saved bank position |
| Position on disk | Overwritten by entrance fallback | Retained; error below 0.001 cm |
| View, journal and nondefault preferences | Retained | Retained |
| Strict focused assertions | Two failures | All pass |

The bank center `(2949.433, -199.359, 93.150)` cm passes five independent ground
and water checks but fails native capsule clearance. Continue now tries the
existing bounded, collision-checked helper after ordinary restoration fails.
A 4 cm raised entry succeeds; walking physics settles onto the original ground.
Unsafe water saves still fail the ground gate and use entrance recovery.

Both seed/resume process pairs exited cleanly. Independent review passed.
The integrated package at main `1bec521` also passes the standard smoke and cold
restart suite (both clean exit 0), including the unchanged unsafe-water-save gate:
[packaged smoke](D:/repos/shankaranarayana-photoreal/unreal/smoke-runs/20261011-025404-95ff731227804009ad6c5496b367cec0/Saved/WalkReview/smoke.json).

- [Before report](D:/repos/shankaranarayana-photoreal/unreal/smoke-runs/continue-baseline-20261011-021827-dc1d9feb475d42b29779d31d6424e296/Saved/WalkReview/continue-resume.json)
- [After report](D:/repos/shankaranarayana-photoreal/unreal/smoke-runs/continue-fixed-20261011-022129-7823bf980c364fcaade0464dfbef76e8/Saved/WalkReview/continue-resume.json)
