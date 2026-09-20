const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.houseWalk?.ready);
 const results=await page.evaluate(async()=>{const THREE=await import('/vendor/three.module.js');return [16.2,21.4].flatMap(z=>Array.from({length:3},(_,i)=>{const x=51.05+(i+.5)*1.4/3,expected=.1+(i+1)*.5/3;const hit=new THREE.Raycaster(new THREE.Vector3(x,.8,z),new THREE.Vector3(0,-1,0),0,2).intersectObject(houseWalk.temple,true)[0];return {z,i,expected,actual:hit?.point.y,support:houseWalk.supportY(x,z,expected)};}));});
 for(const r of results){assert.ok(Math.abs(r.actual-r.expected)<1e-4,`Covered tread: ${JSON.stringify(r)}`);assert.ok(Math.abs(r.support-(r.expected-1/12))<1e-4,`Incorrect platform support: ${JSON.stringify(r)}`);}
 console.log(JSON.stringify({passed:true,treads:results.length}));
}finally{await browser.close();}})();
