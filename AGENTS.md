# Local reconstruction workflow

- Use local Git checkpoints after completed, verified changes. Do not push or configure a remote unless the user requests it.
- The photographs explicitly allowlisted in `.gitignore` are approved for commits. Keep `temple-outer-entry.jpg`, `temple-outer-aisle.jpg`, the floor-plan image and unreviewed media out of commits and release packages. Never force-add ignored assets.
- For geometry/navigation changes, run `node tests/wheel-movement.mjs` before committing. The files under `dist` are the authored application, not disposable build output.
- Keep changes local. Deploy to Sites only when the user explicitly requests deployment.
- Current state, open decisions and remaining photo findings are in `HANDOFF.md` and `docs/photo-findings.json`.

## Owner's standing decisions

- Local Git operations (commit, branch, merge, reset, update-ref, worktree) need no confirmation. Pushing and deploying still do.
- Photographs go only on flat things: paintings, framed prints, signs. Never project a photo onto 3D forms; model those with geometry and materials.
- The web walkthrough has one standard, mobile-friendly tier. Do not propose post-processing or "HQ" tiers; the shelved one is at tag `hq-mode-shelved`.
- On a long "match the photos" goal, alternate about 4 hours on the web model with about 1 hour on photoreal (Blender/Unreal).
- When asking the owner to re-align photos, give a clickable link that opens the align tool on exactly that list: `http://127.0.0.1:4173/?align=14.37.50,15.04.59` (use `%7C` between names that contain commas), and check the server is running.
