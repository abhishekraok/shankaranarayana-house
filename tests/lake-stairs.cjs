const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
// Probe all visible treads against masonry, terrain and production support.
// This catches ground strips that conceal a flight despite plausible nav data.
(async()=>{const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.houseWalk?.ready);
 const result=await page.evaluate(async()=>{
  const THREE=await import('/vendor/three.module.js'),h=houseWalk,out=[];
  const flights=[
   ['far left',10.95,-35.2675,3.9,.535,'-x',.28,1.38,8],
   ['far right',15.55,-35.2675,3.9,.535,'x',.28,1.38,8],
   ['far lower',13.25,-33.9,2.3,2.2,'-z',-1.55,.28,11],
   ['bathing gate',17.75,-9.65,2.7,2.1,'-x',-1.55,.055,9],
   ['arcade',28.55,-9.65,2.1,2.1,'x',-1.55,.065,9],
   ['east bank',49.16,-22.15,2.3,2.45,'x',-1.55,.055,9],
   ['west bank',-4.15,-24,2.3,2.2,'-x',-1.55,.055,9],
   ['pavilion',34,-35.25,2,3.1,'-z',-1.27,1.38,15],
   ['far corner',-2.3,-34.6,2.25,3.6,'-z',-1.55,1.38,16],
  ];
  for(const [name,cx,cz,w,d,axis,low,high,n] of flights)for(let i=0;i<n;i++){
   const alongX=axis.endsWith('x'),t=(i+.5)/n,offset=(axis.startsWith('-')?.5-t:t-.5)*(alongX?w:d);
   const x=cx+(alongX?offset:0),z=cz+(alongX?0:offset),expected=low+(i+1)*(high-low)/n;
   const hit=new THREE.Raycaster(new THREE.Vector3(x,expected+1.6,z),new THREE.Vector3(0,-1,0),0,6).intersectObjects([h.landscape,h.scene.getObjectByName('Ground')],true)[0];
   out.push({name,i,x,z,expected,actual:hit?.point.y,support:h.supportY(x,z,expected),expectedSupport:expected-(high-low)/n/2,object:hit?.object.name});
  }
  return {water:h.scene.getObjectByName('Reflective lake water').position.y,treads:out};
 });
 assert.equal(result.water,-2.1);
 for(const r of result.treads){assert.ok(Math.abs(r.actual-r.expected)<1e-4,`Covered tread: ${JSON.stringify(r)}`);assert.ok(r.support>=r.expectedSupport-1e-4&&r.support<=r.expected+1e-4,`Support mismatch: ${JSON.stringify(r)}`);}
 console.log(JSON.stringify({passed:true,water:result.water,treads:result.treads.length}));
}finally{await browser.close();}})();
