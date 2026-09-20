const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.houseWalk?.ready);
 const results=await page.evaluate(async()=>{const THREE=await import('/vendor/three.module.js');const h=houseWalk;return Array.from({length:10},(_,i)=>{const z=-42.15-(i+.5)*.3,expected=-.53+(i+1)*.161;const ray=new THREE.Raycaster(new THREE.Vector3(13.25,2,z),new THREE.Vector3(0,-1,0),0,4);const hit=ray.intersectObjects([h.landscape,h.scene.getObjectByName('Ground')],true)[0];return {i,z,expected,actual:hit?.point.y,support:h.supportY(13.25,z,expected)};});});
 for(const r of results){assert.ok(Math.abs(r.actual-r.expected)<1e-4,`Tread ${r.i} obscured: ${JSON.stringify(r)}`);assert.ok(Math.abs(r.support-(r.expected-.0805))<1e-4,`Stair support mismatch: ${JSON.stringify(r)}`);}
 console.log(JSON.stringify({passed:true,treads:results.length}));
}finally{await browser.close();}})();
