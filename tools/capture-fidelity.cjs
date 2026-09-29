// Read-only, fixed-camera captures for fidelity-review.py.
// PHOTO_TIMES=14.56.56,14.57.08 node tools/capture-fidelity.cjs batch-name
// FIDELITY_BASELINE=<commit> substitutes only house/temple/landscape geometry.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024}).trim();
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const name = process.argv[2];
if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) throw Error('Supply a lowercase batch-name');
const out = path.join(root, 'checks', 'fidelity', name);
if (fs.existsSync(out)) throw Error('Capture folder exists; choose a new name to preserve its review');
// PHOTO_NAMES='IMG_20130720_175306|house front' selects by filename substring instead.
const names = process.env.PHOTO_NAMES ? process.env.PHOTO_NAMES.split('|') : null;
const times = names || (process.env.PHOTO_TIMES || '14.56.56,14.57.08,15.12.15,15.10.30,15.03.47').split(',');
if (!names && times.some(t => !/^\d{2}\.\d{2}\.\d{2}$/.test(t))) throw Error('PHOTO_TIMES must contain HH.MM.SS values');
const posePath = process.env.POSE_FILE || 'F:/Shankaranarayana/align-poses.json';
const sourceBefore = fs.readFileSync(posePath);
const poses = JSON.parse(sourceBefore).poses;
const captures = times.map(t => {
  const matches = poses.filter(p => p.filename.includes(t));
  if (matches.length !== 1) throw Error(`Expected one pose for ${t}; found ${matches.length}`);
  return {t: names ? matches[0].filename.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_') : t, pose: matches[0]};
});
if (process.env.FIDELITY_RAISED_HALL === '1') {
  const pose = structuredClone(poses.find(p => p.filename.includes('15.13.51')));
  if (!pose) throw Error('Missing hall diagnostic pose');
  pose.camera.position[1] += 1.18;
  captures.push({t: '15.13.51-diagnostic-raised-1.18m', pose});
}
const geometryBaseline = process.env.FIDELITY_BASELINE || null;
if (geometryBaseline && !/^[a-f0-9]{7,40}$/.test(geometryBaseline)) throw Error('Invalid baseline revision');
const provenance = {revision: git('rev-parse', 'HEAD'),
  workingTree: git('status', '--porcelain', '--', 'dist'), geometryBaseline, loadedModules: {}};
// Snapshot every served JS module before opening the page. Later workspace edits
// cannot produce a mixture of old and new modules in the same capture batch.
const modules = new Map();
for (const dir of ['src', 'vendor']) {
  for (const file of fs.readdirSync(path.join(root, 'dist', dir), {recursive: true})) {
    if (!file.endsWith('.js')) continue;
    const relative = `dist/${dir}/${file.replaceAll('\\', '/')}`;
    const baseline = geometryBaseline && /^dist\/src\/(house|temple|landscape)\.js$/.test(relative);
    const body = baseline
      ? execFileSync('git', ['show', `${geometryBaseline}:${relative}`], {cwd: root, maxBuffer: 32 * 1024 * 1024})
      : fs.readFileSync(path.join(root, relative));
    modules.set('/' + relative.slice(5), {body, relative,
      metadata: {sha256: hash(body), source: baseline ? geometryBaseline : 'working-tree'}});
  }
}

(async () => {
  const browser = await chromium.launch({channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 1000, height: 750}, deviceScaleFactor: 1});
    const errors = [], blockedWrites = [], report = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/local-photos/**', route => {
      const method = route.request().method();
      if (['GET', 'HEAD'].includes(method)) return route.continue();
      blockedWrites.push({method, url: route.request().url()});
      return route.fulfill({status: 204});
    });
    await page.route(/\/(src|vendor)\/.*\.js(?:\?.*)?$/, route => {
      const module = modules.get(new URL(route.request().url()).pathname);
      if (!module) throw Error('Unsnapshotted module: ' + route.request().url());
      provenance.loadedModules[module.relative] = module.metadata;
      return route.fulfill({contentType: 'application/javascript', body: module.body});
    });
    await page.addInitScript(() => {navigator.getGamepads = () => [];});
    await page.goto('http://127.0.0.1:4173');
    await page.waitForFunction(() => window.houseWalk?.ready);
    await page.click('#photos-btn');
    await page.click('#align-photo');
    await page.waitForTimeout(250);
    await page.addStyleTag({content: 'body > :not(#world){visibility:hidden!important} #world{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important}'});
    fs.mkdirSync(out, {recursive: true});
    for (const {t, pose} of captures) {
      await page.evaluate(p => {
        const h = houseWalk;
        h.camera.position.fromArray(p.camera.position);
        h.camera.quaternion.fromArray(p.camera.quaternion);
        h.camera.fov = p.camera.verticalFov;
        h.camera.aspect = 4 / 3;
        h.camera.updateProjectionMatrix();
        h.renderer.setSize(1000, 750);
        h.renderer.shadowMap.needsUpdate = true;
      }, pose);
      await page.waitForTimeout(350);
      await page.screenshot({path: path.join(out, t + '.png')});
      const actual = await page.evaluate(() => ({position: houseWalk.camera.position.toArray(),
        quaternion: houseWalk.camera.quaternion.toArray(), verticalFov: houseWalk.camera.fov}));
      for (const key of ['position', 'quaternion']) {
        if (actual[key].some((x, i) => Math.abs(x - pose.camera[key][i]) > 1e-6)) throw Error(`Camera ${key} moved during ${t}`);
      }
      if (actual.verticalFov !== pose.camera.verticalFov) throw Error(`Camera FOV changed during ${t}`);
      report.push({capture: t, filename: pose.filename, camera: pose.camera, actualCamera: actual});
    }
    const sourceAfter = fs.readFileSync(posePath);
    const sourceAudit = {beforeSha256: hash(sourceBefore), afterSha256: hash(sourceAfter),
      unchanged: sourceBefore.equals(sourceAfter), blockedWrites};
    fs.writeFileSync(path.join(out, 'captures.json'), JSON.stringify({errors, sourceAudit, provenance, report}, null, 2) + '\n');
    if (!sourceAudit.unchanged) throw Error('Source pose file changed during capture');
    if (errors.length) throw Error(errors.join('\n'));
    console.log(`Captured ${report.length} views in ${out}; source unchanged; blocked ${blockedWrites.length} writes`);
  } finally { await browser.close(); }
})().catch(e => {console.error(e); process.exitCode = 1;});
