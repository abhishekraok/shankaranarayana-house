const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
// Desktop high quality is opt-in: ?quality=high or the remembered HQ toggle.
// Phones never enter it, and the default desktop view keeps the standard renderer.
(async()=>{const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});try{
 const errors=[];const open=async(url,opts={viewport:{width:1200,height:800}})=>{const context=await browser.newContext(opts),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto(url);await page.waitForFunction(()=>window.houseWalk?.ready);return page;};
 const standard=await open('http://127.0.0.1:4173/');
 assert.equal(await standard.evaluate(()=>houseWalk.quality),'standard');
 assert.equal(await standard.evaluate(()=>!!houseWalk.hq),false);
 assert.equal(await standard.isVisible('#quality-btn'),true);
 const high=await open('http://127.0.0.1:4173/?quality=high');
 const state=await high.evaluate(async()=>{const H=houseWalk;H.teleport(H.destinations.veranda);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  return {quality:H.quality,passes:H.hq.composer.passes.map(p=>p.constructor.name),env:!!H.scene.environment,pressed:document.getElementById('quality-btn').getAttribute('aria-pressed'),reflectionLayer:H.scene.getObjectByName('Reflective lake water').camera.layers.mask};});
 assert.equal(state.quality,'high');assert.deepEqual(state.passes,['RenderPass','GTAOPass','ShaderPass','OutputPass']);assert.ok(state.env);assert.equal(state.pressed,'true');assert.equal(state.reflectionLayer,2);
 // The toggle remembers the choice and reloads into the standard tier.
 await Promise.all([high.waitForNavigation(),high.click('#quality-btn')]);await high.waitForFunction(()=>window.houseWalk?.ready);
 assert.equal(await high.evaluate(()=>houseWalk.quality+location.search),'standard');
 const phone=await open('http://127.0.0.1:4173/?quality=high',{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 assert.equal(await phone.evaluate(()=>houseWalk.quality),'standard');
 assert.equal(await phone.isVisible('#quality-btn'),false);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,passes:state.passes}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
