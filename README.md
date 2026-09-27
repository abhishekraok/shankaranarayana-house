# Shankaranarayana, Udupi

A walkable 3D reconstruction of the house, lake and temple as remembered from 2011–2013, created by Abhishek Rao from photographs and memories.

[Explore the live site](https://shankaranarayana.abhishekraok.chatgpt.site/)

## Run locally

Install Node.js 18 or newer:

```sh
git clone https://github.com/abhishekraok/shankaranarayana-house.git
cd shankaranarayana-house
node server.mjs
```

Open http://127.0.0.1:4173/. On Windows, `start.cmd` also starts the server. No package installation or build is needed; Three.js and the scene assets are included. The app's Info pane explains desktop, phone and controller controls.

## Contribute or remix

`dist/` is the authored application, not generated output:

| File in `dist/src/` | Purpose |
| --- | --- |
| `house.js`, `temple.js`, `landscape.js` | Buildings and surroundings |
| `main.js` | Navigation and UI |
| `tour.js` | Guided route |
| `photo-alignment.js` | Reference camera alignment |

For a correction, open a GitHub issue with the location, reference filename and what differs. A matching camera view is especially useful. For code changes, keep the scope focused and describe the reference and verification in your pull request. Share only photographs you have permission to publish.

### Align reference photographs

Open **Photographs → Align photos** to compare a photo with the 3D view. Drag to look, WASD to move, Q/E to change height, H to use standing eye height, and Z/X to adjust zoom. Shift moves faster; Alt makes finer adjustments. G overlays the photo; R resets the camera. Space saves and advances, N skips, P goes back, and Delete discards a photo from the queue without deleting its file. The tool also shows controller controls.

Use `?align` to resume, `?align=14.59.54` to start at a filename match, or a comma-separated list of matches to choose a sequence. The 2011 photos start at a 48° vertical field of view; adjust it when needed.

To align a private collection locally:

```sh
node tools/align-queue.mjs "F:/Photos"
node server.mjs --photos "F:/Photos"
```

This serves the selected images on 127.0.0.1 and saves `align-poses.json` and `align-discarded.json` in that folder. Photos are not copied into the project. Poses are also saved in browser storage; **Export JSON** and **Import** transfer them between browsers. Exports contain filenames, camera coordinates in metres, orientation, field of view, aspect, dimensions, timestamps and notes, without photo pixels. Check filenames and notes before sharing an export.

## Verify changes

For geometry or navigation changes:

```sh
npm test
```

Browser checks require Node.js 22+, Playwright and Chromium. Keep the local server running in another terminal:

```sh
npm install --no-save playwright
npx playwright install chromium
npm run test:browser
npm run test:mobile
npm run test:alignment
```

Set `BROWSER_CHANNEL=msedge` to use installed Microsoft Edge. Reports are written to the ignored `checks/` directory.

## Hosting

Any static host can serve `dist/`. GitHub commits do not automatically update the live Sites version; deployment is a separate step. The [dev site](https://shankaranarayana-dev.abhishekraok.chatgpt.site/) is private and used for review before updating the public site.

## Known limitations

Dimensions, hidden spaces and some architectural details are estimates. This is a reconstruction of the photographed period, not a survey or a description of the village today. Fidelity varies by viewpoint; mobile rendering uses reduced visual detail for performance.

## Licenses and references

Code and documentation: [MIT](LICENSE). Photographs in `dist/assets/`: [CC BY 4.0](LICENSE-PHOTOS.txt), credited to Abhishek Rao. When reusing photos, credit Abhishek Rao, link to the repository and license, and indicate changes. [Reference sources](REFERENCE-SOURCES.md) maps included photographs to their original filenames. Three.js retains its [MIT license](dist/vendor/THREE-LICENSE.txt).

Only approved photographs are included. Private reference media and photo-bearing review files stay outside the public source and deployment packages.
