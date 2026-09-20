const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
 const snapshots=[];
 try{
  for(const mobile of [false,true]){
   const page=await browser.newPage({viewport:{width:700,height:850},isMobile:mobile,hasTouch:mobile});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.houseWalk?.ready);
   const data=await page.evaluate(()=>{
    const w=houseWalk,fronds=[];let triangles=0;
    w.landscape.traverse(o=>{
     if(!o.isMesh)return;
     const n=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;
     triangles+=n*(o.isInstancedMesh?o.count:1);
     if(o.name==='living palm fronds'||o.name==='occasional dry hanging fronds')
      fronds.push({name:o.name,count:o.count,triangles:n,matrices:Array.from(o.instanceMatrix.array),colors:o.instanceColor?Array.from(o.instanceColor.array):null});
    });
    return {phoneMode:w.phoneMode,triangles,fronds,colliders:w.K.colliders,surfaces:w.K.surfaces};
   });
   assert.deepEqual(errors,[]);
   snapshots.push(data);await page.close();
  }
  const [desktop,mobile]=snapshots;
  assert.equal(desktop.phoneMode,false);assert.equal(mobile.phoneMode,true);
  const fingerprint=s=>createHash('sha256').update(JSON.stringify(s.fronds.map(({triangles,...f})=>f))).digest('hex');
  assert.equal(fingerprint(mobile),fingerprint(desktop),'Every palm instance and colour stays fixed');
  assert.deepEqual(mobile.colliders,desktop.colliders,'Vegetation optimisation preserves collision bounds');
  assert.deepEqual(mobile.surfaces,desktop.surfaces,'Walkable surfaces stay fixed');
  assert.ok(desktop.fronds.length>0);
  assert.ok(desktop.fronds.every(f=>f.triangles===654));
  assert.ok(mobile.fronds.every(f=>f.triangles===396));
  assert.ok(mobile.triangles<desktop.triangles*.80,'Phone landscape reduces triangle cost by at least 20 percent');
  console.log(JSON.stringify({desktopLandscapeTriangles:desktop.triangles,mobileLandscapeTriangles:mobile.triangles,palmInstances:mobile.fronds.reduce((n,f)=>n+f.count,0),identicalPlacement:true,errors:[]},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
