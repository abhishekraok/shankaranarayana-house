# Shankaranarayana, Udupi

A walkable 3D reconstruction of the house, lake and temple, created by Abhishek Rao using photographs and memories from 2011–2013.

[Explore the live site](https://shankaranarayana.abhishekraok.chatgpt.site/) · [Source code](https://github.com/abhishekraok/shankaranarayana-house)

## Run locally

Install Node.js 18 or newer, then run:

```sh
git clone https://github.com/abhishekraok/shankaranarayana-house.git
cd shankaranarayana-house
node server.mjs
```

Open http://127.0.0.1:4173/. On Windows, double-click `start.cmd`. The application needs no package installation or build step; Three.js and all scene assets are included.

## Explore

The guided tour starts automatically. Use Walk, Aerial or Go to to explore freely. Drag to look around, use WASD/arrow keys to walk, and scroll to move forward or backward. Photos shows reference views; Info explains the controls. On mobile, tap Controls to expand the toolbar.

## Edit and verify

`dist/` is the authored application. Scene geometry lives in `dist/src/house.js`, `temple.js` and `landscape.js`; navigation and UI are in `main.js`, with the tour in `tour.js`. Measurements and obscured details are estimates, not a surveyed model.

```sh
npm test
```

Optional browser checks require Node.js 22+, Playwright and Chromium. Start the local server in another terminal, then run:

```sh
npm install --no-save playwright
npx playwright install chromium
npm run test:browser
```

Set `BROWSER_CHANNEL=msedge` to use an installed Microsoft Edge instead. Test output goes into the ignored `checks/` directory.

## Hosting and reuse

Any static host can serve `dist/`. GitHub updates do not automatically redeploy the live Sites version; publication is a separate step.

The public repository begins with a clean snapshot of the approved source and photographs. Earlier development history and private references are excluded.

Original code and documentation: [MIT](LICENSE). Photographs in `dist/assets/`: [CC BY 4.0](LICENSE-PHOTOS.txt), credited to Abhishek Rao. For photo reuse, credit Abhishek Rao, link to this repository and the license, and indicate any changes. See [reference photographs](REFERENCE-SOURCES.md) for provenance. Vendored Three.js retains its [MIT license](dist/vendor/THREE-LICENSE.txt).

### Photo alignment

Open **Photographs → Align photo** locally. Select a reference or open JPEG/PNG/WebP files from your computer. Local files are never uploaded. Use the overlay, camera controls, and field of view to match the photograph. Save each pose, then **Export JSON** and share that file for model refinement.

Saves live in browser storage, separately for localhost, dev, and production; export is the portable backup. Local photo pixels are not stored or exported. Reopen the same file to restore its saved pose (matched by SHA-256). Imports merge poses, replacing matching photo IDs. Each photo has one saved pose.

The versioned export records world-space eye position in metres, quaternion, viewing direction, vertical field of view, viewport aspect, photo dimensions and cover crop mode, filename/hash, timestamp, and notes. It does not change the tour or model. For identical framing when restoring, use the original window aspect ratio.
