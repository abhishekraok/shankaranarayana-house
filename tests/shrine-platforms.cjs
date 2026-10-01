const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.houseWalk?.ready);
 const results=await page.evaluate(async()=>{const THREE=await import('/vendor/three.module.js');const ts=houseWalk.K.templeShiftZ;return [[16.2+ts,5,.95],[21.4+ts,3,.6]].flatMap(([z,n,top])=>Array.from({length:n},(_,i)=>{const x=55.05+(i+.5)*1.4/n,expected=.1+(i+1)*(top-.1)/n;const hit=new THREE.Raycaster(new THREE.Vector3(x,1.2,z),new THREE.Vector3(0,-1,0),0,2).intersectObject(houseWalk.temple,true)[0];return {z,i,expected,actual:hit?.point.y,support:houseWalk.supportY(x,z,expected),half:(top-.1)/n/2};}));});
 for(const r of results){assert.ok(Math.abs(r.actual-r.expected)<1e-4,`Covered tread: ${JSON.stringify(r)}`);assert.ok(Math.abs(r.support-(r.expected-r.half))<1e-4,`Incorrect platform support: ${JSON.stringify(r)}`);}
 console.log(JSON.stringify({passed:true,treads:results.length}));
}finally{await browser.close();}})();
