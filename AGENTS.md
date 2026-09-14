# Local reconstruction workflow

- Use local Git checkpoints after completed, verified changes. Do not push or configure a remote unless the user requests it.
- The photographs explicitly allowlisted in `.gitignore` are approved for commits. Keep `temple-outer-entry.jpg`, `temple-outer-aisle.jpg`, the floor-plan image and unreviewed media out of commits and release packages. Never force-add ignored assets.
- For geometry/navigation changes, run `node tests/wheel-movement.mjs` before committing. The files under `dist` are the authored application, not disposable build output.
- Keep changes local. Deploy to Sites only when the user explicitly requests deployment.
