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

### High quality (desktop)

The **HQ** button beside the info button switches a desktop browser to high quality graphics and remembers the choice; `?quality=high` or `?quality=standard` overrides it for one visit. High quality adds ground-truth ambient occlusion (GTAO), 4x MSAA, a soft overcast sky reflected by the polished floors, native pixel density up to 2x and sharper lake reflections. If frames slow below about 40 fps it lowers resolution, never the effects. Phones always use the standard tier. The post-processing add-ons in `dist/vendor/addons/` are unmodified files from Three.js r180.

### Photo alignment

Open **Photographs → Align photos**. The photo and a live 3D view appear side by side, the 3D view sized to the photo's exact shape. Drag to look, WASD to move, Q/E to lower or raise the camera, Z/X to zoom, Shift for bigger and Alt for finer steps. G overlays the photo on the 3D view; R returns to the starting camera. **Space saves the pose and moves to the next photo**; N skips and P goes back.

Without a local photo folder, the queue is the bundled reference photos. To align a private collection, generate a queue (most uncertain photos first) and serve the folder locally:

```sh
node tools/align-queue.mjs "F:/Photos"
node server.mjs --photos "F:/Photos"
```

The server then serves only that folder's image files and `align-queue.json` on 127.0.0.1, and writes every save to `align-poses.json` in the same folder. Photos are never copied into the project. Saves are also kept in browser storage; **Export JSON** and **Import** move them between browsers. Each export records world-space eye position in metres, quaternion, viewing direction, vertical field of view, aspect, photo dimensions, filename, timestamp and notes, and no photo pixels.
