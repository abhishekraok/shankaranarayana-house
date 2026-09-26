const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
// 14.58.26: the opposite-bank descent is two 8-step flights along the retaining
// face (x 9.0-12.9 rising west, 13.6-17.5 rising east), each tread visible and supported.
(async()=>{const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.houseWalk?.ready);
 const results=await page.evaluate(async()=>{const THREE=await import('/vendor/three.module.js');const h=houseWalk,z=-43.2675,run=3.9/8,rise=1.08/8,out=[];
  for(const [x0,dir] of [[12.9,-1],[13.6,1]])for(let i=0;i<8;i++){const x=x0+dir*(i+.5)*run,expected=(i+1)*rise;const ray=new THREE.Raycaster(new THREE.Vector3(x,2,z),new THREE.Vector3(0,-1,0),0,4);const hit=ray.intersectObjects([h.landscape,h.scene.getObjectByName('Ground')],true)[0];out.push({i,x,expected,actual:hit?.point.y,support:h.supportY(x,z,expected)});}
  return out;});
 for(const r of results){assert.ok(Math.abs(r.actual-r.expected)<1e-4,`Tread ${r.i} obscured: ${JSON.stringify(r)}`);assert.ok(Math.abs(r.support-(r.expected-1.08/16))<1e-4,`Stair support mismatch: ${JSON.stringify(r)}`);}
 console.log(JSON.stringify({passed:true,treads:results.length}));
}finally{await browser.close();}})();
