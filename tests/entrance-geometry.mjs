// Geometry and walking-clearance checks without a browser or GPU.
// Canvas/image shims only bypass texture decoding; meshes and navigation use production code.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
const ctx = new Proxy({getImageData:()=>({data:new Uint8ClampedArray(512*512*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({getContext:()=>ctx}),createElementNS:()=>({addEventListener(){},removeEventListener(){}})};
const threeURL=new URL('../dist/vendor/three.module.js',import.meta.url).href;
async function loadModule(path){const source=(await fs.readFile(new URL(path,import.meta.url),'utf8')).replace("from 'three'",`from '${threeURL}'`);return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));}
const {createKit}=await loadModule('../dist/src/kit.js');
const {buildHouse}=await loadModule('../dist/src/house.js');
const {buildTemple}=await loadModule('../dist/src/temple.js');
const {buildLandscape,farZ,farZinv}=await loadModule('../dist/src/landscape.js');
const {createPhotoTour}=await loadModule('../dist/src/tour.js');
const K=createKit(),house=buildHouse(K);house.updateMatrixWorld(true);
// The temple's own geometry does not depend on where the complex sits, so these checks run with
// it at its authored position. tests/temple-setback.mjs covers the shipped placement.
const SHIPPED_TEMPLE_SHIFT=K.templeShiftZ;K.templeShiftZ=0;
const temple=buildTemple(K),landscape=buildLandscape(K);temple.updateMatrixWorld(true);landscape.updateMatrixWorld(true);
// The inner aisle skylights must replace opaque roofing, not overlay it.
for(const x of [35.25,42.75])for(const z of [22.1,24.0,27.1]){
  const ray=new THREE.Raycaster(new THREE.Vector3(x,3.8,z),new THREE.Vector3(0,1,0));
  const hit=ray.intersectObject(temple,true)[0];
  assert.equal(hit?.object.name,'Inner aisle translucent corrugated skylights','Daylight opening above each inner aisle');
  assert.equal(hit.object.castShadow,false,'Translucent sheets must not cast an opaque roof shadow');
}
// Sweep the actual distant foliage from the house frontage, not bounding boxes.
const horizon=landscape.children.filter(m=>m.name.startsWith('Horizon '));
assert.ok(horizon.length<=4&&horizon.length>0,'Background uses a few shared draw calls');
const horizonTriangles=horizon.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3*m.count,0);
assert.ok(horizonTriangles<260000,'Distant greenery stays within its geometry budget');
for(let degrees=-90;degrees<=90;degrees+=3)for(const rise of [0,.08]){
  const a=degrees*Math.PI/180,ray=new THREE.Raycaster(new THREE.Vector3(0,2.07,-3),new THREE.Vector3(Math.sin(a),rise,-Math.cos(a)).normalize(),0,210);
  assert.ok(ray.intersectObjects(horizon,false).length>0,`Distant tree coverage at ${degrees} degrees, rise ${rise}`);
}
const main=await fs.readFile(new URL('../dist/src/main.js',import.meta.url),'utf8');
const navigation=main.slice(main.indexOf('function inside('),main.indexOf('function lookAt('));
const {collision,supportY,blockedRise}=new Function('K','THREE','farZinv',navigation+';return {collision,supportY,blockedRise};')(K,THREE,farZinv);
// lane-right / 14.46.51 / 15.14.02: keep the cottage's tiled hip behind a low sheet
// awning; the higher salmon block has a supported flat parapet roof and black tank.
const laneRoofReview={references:['lane-right','14.46.51','15.14.02','15.11.58'],minimumAwningClearance:Infinity,maximumRafterBearingGap:0};
const cottageWall=landscape.getObjectByName('Western lane right cottage white walls'),cottageWallBounds=new THREE.Box3().setFromObject(cottageWall);
const cottageRise=cottageWallBounds.max.y-2.75;
assert.ok(landscape.getObjectByName('Western lane right cottage weathered tiled roof'),'The photo-supported tiled hip remains');
assert.equal(landscape.getObjectByName('Western cottage shallow grey shutter canopy'),undefined,'Continuous awning replaces the disconnected shutter cap');
const laneAwning=landscape.getObjectByName('Western cottage continuous corrugated front awning'),awningBounds=new THREE.Box3().setFromObject(laneAwning);
assert.ok(Math.abs(awningBounds.min.x+44.65)<.001&&Math.abs(awningBounds.max.x+35.35)<.001,'Awning stays within the existing hip width');
assert.ok(awningBounds.min.z<cottageWallBounds.max.z&&awningBounds.max.z>cottageWallBounds.max.z+.9,'Sheet covers the existing facade and projects beyond it');
const sheetNormals=laneAwning.geometry.attributes.normal;
for(let i=0;i<248;i++)for(let j=0;j<6;j++){
  assert.ok(sheetNormals.getY(i*24+j)>.9,'Corrugated top triangles face upward for native shading');
  assert.ok(sheetNormals.getY(i*24+6+j)<-.9,'Closed sheet underside faces downward');
}
const bearing=landscape.getObjectByName('Western cottage awning wall bearing'),bearingBounds=new THREE.Box3().setFromObject(bearing);
assert.ok(Math.abs(bearingBounds.min.y-cottageWallBounds.max.y)<.001,'Wall bearing sits on the retained cottage wall');
const rafters=landscape.children.filter(o=>o.name==='Western cottage awning timber rafter');assert.equal(rafters.length,7);
for(const r of rafters){
  const x=r.position.x;
  for(const z of [-10.3,-9.65]){
    const underside=new THREE.Raycaster(new THREE.Vector3(x,2.4+cottageRise,z),new THREE.Vector3(0,1,0)).intersectObject(laneAwning,false)[0];assert.ok(underside,'Sheet covers each bearing');
    const support=new THREE.Raycaster(underside.point.clone().add(new THREE.Vector3(0,.02,0)),new THREE.Vector3(0,-1,0),0,.05).intersectObject(r,false)[0];assert.ok(support,'Timber meets the sheet underside');
    const gap=Math.abs(underside.point.y-support.point.y);laneRoofReview.maximumRafterBearingGap=Math.max(laneRoofReview.maximumRafterBearingGap,gap);assert.ok(gap<.012,'Rafter-to-sheet bearing has no visible gap');
  }
  const atWall=new THREE.Raycaster(new THREE.Vector3(x,2.83+cottageRise,-10.3),new THREE.Vector3(0,-1,0),0,.10).intersectObject(r,false)[0];assert.ok(atWall&&atWall.point.y<=bearingBounds.max.y+.001,'Rafters bear on the wall beam');
}
// Use the highest retained doorstep, including the native capsule footprint under the
// lowest exposed edge, rather than relying on unchanged abstract navigation boxes.
for(let x=-44.4;x<=-35.6;x+=.4)for(const z of [-10.2,-9.95,-9.65,-9.31]){
  const hit=new THREE.Raycaster(new THREE.Vector3(x,.46+cottageRise,z),new THREE.Vector3(0,1,0)).intersectObject(laneAwning,false)[0];assert.ok(hit);
  const clearance=hit.point.y-(.45+cottageRise);laneRoofReview.minimumAwningClearance=Math.min(laneRoofReview.minimumAwningClearance,clearance);assert.ok(clearance>=2.10,'Low awning clears the retained raised threshold');
}
const salmonWallBounds=new THREE.Box3().setFromObject(landscape.getObjectByName('Slope salmon-pink house walls'));
const salmonSlab=landscape.getObjectByName('Slope salmon-pink house flat roof slab'),salmonSlabBounds=new THREE.Box3().setFromObject(salmonSlab);
assert.equal(landscape.getObjectByName('Slope salmon-pink house tiled roof'),undefined,'Higher pink block has no invented tiled hip');
assert.ok(Math.abs(salmonSlabBounds.min.y-salmonWallBounds.max.y)<.001,'Flat slab bears on the retained walls');
assert.ok(salmonSlabBounds.min.x<salmonWallBounds.min.x&&salmonSlabBounds.max.x>salmonWallBounds.max.x&&salmonSlabBounds.min.z<salmonWallBounds.min.z&&salmonSlabBounds.max.z>salmonWallBounds.max.z,'Slab closes the retained footprint');
const parapets=landscape.children.filter(o=>o.name==='Slope salmon-pink house flat roof parapet');assert.equal(parapets.length,4);
for(const p of parapets)assert.ok(Math.abs(new THREE.Box3().setFromObject(p).min.y-salmonSlabBounds.max.y)<.001,'Each parapet bears on the slab');
const roofTank=landscape.getObjectByName('Slope salmon-pink house black roof tank'),tankBounds=new THREE.Box3().setFromObject(roofTank);
assert.ok(Math.abs(tankBounds.min.y-salmonSlabBounds.max.y)<.001&&tankBounds.min.x>salmonWallBounds.min.x&&tankBounds.max.x<salmonWallBounds.max.x&&tankBounds.min.z>salmonWallBounds.min.z&&tankBounds.max.z<salmonWallBounds.max.z,'Roof tank bears within the existing footprint');
assert.ok(tankBounds.max.y>new THREE.Box3().setFromObject(parapets[0]).max.y+.3,'Black tank appears above the low parapet');
assert.ok(K.roofs.includes(laneAwning)&&K.roofs.includes(salmonSlab)&&K.roofs.includes(roofTank),'Roof visibility includes sheet, flat roof and tank');
// Oct 4 owner note supersedes the older inferred 1.5 m footpath: keep the bank side
// fixed while providing a bare vehicle corridor and taller foliage outside its west edge.
const westRoad=landscape.getObjectByName('West bank vehicle-width brown mud road'),westRoadBounds=new THREE.Box3().setFromObject(westRoad);
assert.ok(Math.abs(westRoadBounds.max.x+7.25)<.001&&Math.abs(westRoadBounds.min.z+35.8)<.001&&Math.abs(westRoadBounds.max.z+11.25)<.001,'Road retains lake edge and stops before the north connecting path');
assert.ok(Math.abs(westRoadBounds.min.y)<.001&&westRoadBounds.max.y<.03,'Decorative road bears on existing ground without changing its height');
const rp=westRoad.geometry.attributes.position,rn=westRoad.geometry.attributes.normal;
for(let i=0;i<rp.count;i+=3){
  if([0,1,2].every(j=>rp.getY(i+j)>.025))for(let j=0;j<3;j++)assert.ok(rn.getY(i+j)>.99,'Mud-road top triangles face upward');
  if([0,1,2].every(j=>rp.getY(i+j)<.001))for(let j=0;j<3;j++)assert.ok(rn.getY(i+j)<-.99,'Mud-road underside closes against the ground');
}
const westBelt=landscape.getObjectByName('West bank tall roadside green belt'),beltBounds=new THREE.Box3().setFromObject(westBelt);
assert.ok(beltBounds.max.x<westRoadBounds.min.x-.65,'High greenery stays outside the widest bare road edge');
assert.ok(beltBounds.max.y>=5&&beltBounds.max.y<=8&&beltBounds.min.z>=-35.8&&beltBounds.max.z<=-11,'Estimated green belt has the bounded photographed height and bank extent');
let roots=0;
const trunkBatch=westBelt.getObjectByName('West bank roadside tree limbs'),rootMatrix=new THREE.Matrix4(),rootBounds=new THREE.Box3();trunkBatch.geometry.computeBoundingBox();
for(let i=0;i<trunkBatch.count;i++){
  trunkBatch.getMatrixAt(i,rootMatrix);rootBounds.copy(trunkBatch.geometry.boundingBox).applyMatrix4(rootMatrix);
  if(rootBounds.min.y<.01){assert.ok(rootBounds.min.y>-.012,'Tree root meets ground without a floating trunk');roots++;}
}assert.equal(roots,7,'Every tall roadside tree has a ground-bearing trunk');
// Actual foliage/grass geometry must clear the vehicle corridor and its capsule margin.
const westVisuals=[westBelt,landscape.getObjectByName('grass and weeds along wild banks')];
for(let z=-35.6;z<=-11.6;z+=.4){
  const width=2.6+.2*Math.sin((z+11.25)*.48),west=-7.25-width;
  assert.ok(width>=2.4&&width<=2.8&&Math.abs(supportY(-8,z,0))<.001,'Road remains on existing supported ground');
  for(const x of [west+.24,(west-7.25)/2,-7.49]){
    assert.ok(!collision(x,z,0)&&!blockedRise(x,z,0),'Vehicle-width route is walkable without new collision/support data');
    for(let j=0;j<8;j++){
      const a=j*Math.PI/4,ray=new THREE.Raycaster(new THREE.Vector3(x+.22*Math.cos(a),.06,z+.22*Math.sin(a)),new THREE.Vector3(0,1,0),0,2.10);
      assert.equal(ray.intersectObjects(westVisuals,true).length,0,'Foliage and weeds clear the physical walking capsule');
    }
  }
}
const photos=new Function('return ('+main.match(/const photos=(.*);/)[1]+')')();
for(const m of main.matchAll(/photos\.(\w+)=(\{.*\});/g))photos[m[1]]=new Function('return ('+m[2]+')')();
// 15.13.03 / .07 and 15.08.10: the split sheet shelter reveals the tower above a supported
// white ceiling. Test openings and actual mesh clearance, including the native capsule footprint.
const innerRoofReview={references:['15.13.03','15.13.07','15.08.10'],minimumRearPlatformClearance:Infinity};
const hallSlab=temple.getObjectByName('Inner front hall flat white roof');
const slabBounds=new THREE.Box3().setFromObject(hallSlab);
assert.ok(Math.abs(slabBounds.min.y-3.99)<.001&&Math.abs(slabBounds.max.y-4.14)<.001,'White ceiling retains the support-derived height');
assert.ok(Math.abs(slabBounds.min.x-31.7)<.001&&Math.abs(slabBounds.max.x-48.2)<.001&&Math.abs(slabBounds.max.z-19.5)<.001,'Flat roof covers the photographed platform hall');
for(const x of [34.8,37.3,40.7,43.2]){
  const capRay=new THREE.Raycaster(new THREE.Vector3(x,3.70,18.8),new THREE.Vector3(0,-1,0),0,.05);
  const cap=capRay.intersectObject(temple,true).find(h=>h.object.name==='Inner hall carved stone column stone collar');
  assert.equal(cap?.object.name,'Inner hall carved stone column stone collar','Preserved carved caps support the new beams');
  const beam=new THREE.Raycaster(new THREE.Vector3(x,3.68,18.8),new THREE.Vector3(0,1,0),0,.05).intersectObject(temple,true).find(h=>h.object.name==='Inner front hall white ceiling downstand');
  assert.equal(beam?.object.name,'Inner front hall white ceiling downstand');
  assert.ok(Math.abs(beam.point.y-cap.point.y)<.001,'Ceiling beam bears on the carved cap without a gap');
}
// The photographed low hanging bell row is not a standing space; keep its body height.
for(const x of [32.3,36.1,44.8,46,47])for(const z of [19.2,19.3,19.43]){
  const feet=supportY(x,z,1.55);assert.ok(Math.abs(feet-1.55)<.001,'Rear platform walking height is unchanged');
  assert.ok(!collision(x,z,feet),'Rear platform remains navigable at '+[x,z,feet]);
  for(let j=0;j<8;j++){
    const a=j*Math.PI/4,origin=new THREE.Vector3(x+.22*Math.cos(a),feet+.01,z+.22*Math.sin(a));
    const hit=new THREE.Raycaster(origin,new THREE.Vector3(0,1,0)).intersectObject(temple,true)[0];
    assert.ok(hit,'Rear platform remains sheltered');
    const clearance=hit.point.y-feet;innerRoofReview.minimumRearPlatformClearance=Math.min(innerRoofReview.minimumRearPlatformClearance,clearance);
    assert.ok(clearance>=2.10,'Rear seam head clearance '+[x,z,j,clearance,hit.object.name]);
  }
}
for(const x of [37.8,38.4,39,39.6,40.2]){
  const hit=new THREE.Raycaster(new THREE.Vector3(x,4.8,18.8),new THREE.Vector3(0,0,1),0,3).intersectObject(temple,true)[0];
  assert.equal(hit?.object.name,'Inner tower dark tier','The central slot shows the stone tower');
}
for(const x of [36,42])assert.equal(new THREE.Raycaster(new THREE.Vector3(x,4.8,18.8),new THREE.Vector3(0,0,1),0,3).intersectObject(temple,true)[0]?.object.name,'Inner blue-gray corrugated gable','Both sheet half-gables remain beside the slot');
for(const name of ['Inner corrugated shelter roof','Inner blue-gray corrugated gable']){
  const o=temple.getObjectByName(name),p=o.geometry.attributes.position;
  for(let i=0;i<p.count;i+=3){const xs=[p.getX(i),p.getX(i+1),p.getX(i+2)];assert.ok(Math.max(...xs)<=37.751||Math.min(...xs)>=40.249,'No sheet triangle bridges the 2.5 m slot');}
}
for(const name of ['Inner corrugated shelter roof','Old inner shrine concealed hall roof junction']){
  const o=temple.getObjectByName(name),n=o.geometry.attributes.normal;
  for(let i=0;i<n.count;i++)assert.ok(n.getY(i)>.2,'New roof triangles face up for native shading');
}
const hallJunction=temple.getObjectByName('Old inner shrine concealed hall roof junction'),oldHipTiles=temple.getObjectByName('Old inner shrine deep sloping roof tiles');
innerRoofReview.maximumJunctionGap=0;innerRoofReview.minimumJunctionHeight=Infinity;
for(let x=31.7;x<48.2;x+=.1){
  const hit=(o,z)=>new THREE.Raycaster(new THREE.Vector3(x,3.6,z),new THREE.Vector3(0,1,0)).intersectObject(o,true)[0];
  const before=hit(hallJunction,20.6499),after=hit(oldHipTiles,20.6501);assert.ok(before&&after,'Both sides of the hidden roof join are closed');
  const gap=Math.abs(before.point.y-after.point.y);innerRoofReview.maximumJunctionGap=Math.max(innerRoofReview.maximumJunctionGap,gap);
  assert.ok(gap<.002,'Actual triangulated roof meets the junction without a crack');
  for(const z of [19.5,19.7,20,20.3,20.6]){const h=hit(hallJunction,z);assert.ok(h);innerRoofReview.minimumJunctionHeight=Math.min(innerRoofReview.minimumJunctionHeight,h.point.y);assert.ok(h.point.y>=3.689,'Hidden roofing stays above the rear beam underside');}
}
temple.traverse(o=>{
  if(o.name==='Inner hall long bell suspension'){
    const b=new THREE.Box3().setFromObject(o),up=new THREE.Raycaster(new THREE.Vector3(o.position.x,b.max.y-.008,19.12),new THREE.Vector3(0,1,0),0,.04).intersectObject(temple,true).find(h=>h.object!==o);
    assert.ok(up&&Math.abs(up.point.y-b.max.y)<.012,'Each bell suspension meets the actual ceiling or downstand');
  }
  if(/^Old inner shrine deep sloping roof fascia$/.test(o.name))assert.ok(new THREE.Box3().setFromObject(o).min.z>=19.499,'Old dark eaves stop behind the new flat-ceiling room');
});
assert.equal(new THREE.Raycaster(new THREE.Vector3(36,2.2,15.9),new THREE.Vector3(0,0,1),0,.9).intersectObject(temple,true).length,0,'Raising wall heads preserves the existing blue-window opening');
assert.ok(!collision(39,17.5,.57),'The central lower passage remains open below the new ceiling');
// 15.13.03 / .07 / .12.56: a stepped central canopy carries the parapet, dark screens
// stand on the flat hall roof, and the short rust slot cover has real roof bearings.
const canopy=temple.getObjectByName('Inner central entrance projecting canopy'),canopyBounds=new THREE.Box3().setFromObject(canopy);
const cornices=temple.children.filter(o=>o.name==='Inner veranda flat cornice');
assert.equal(cornices.length,2,'Both cornice wings leave a real central forward step');
for(const wing of cornices){const b=new THREE.Box3().setFromObject(wing);assert.ok(canopyBounds.min.z<b.min.z-.60,'Centre canopy projects visibly beyond both wings');assert.ok(Math.abs(b.max.y-canopyBounds.max.y)<.001,'Canopy and wings share the established slab height');}
innerRoofReview.minimumCanopyClearance=Infinity;
for(const x of [38.2,39,39.8])for(const z of [14.5,14.8,15.2,15.8])for(let j=0;j<8;j++){
  const angle=j*Math.PI/4,feet=supportY(x,z,.57),ray=new THREE.Raycaster(new THREE.Vector3(x+.22*Math.cos(angle),feet+.01,z+.22*Math.sin(angle)),new THREE.Vector3(0,1,0));
  const hit=ray.intersectObject(temple,true)[0];assert.ok(hit,'Entrance route remains sheltered under the stepped canopy');
  const clearance=hit.point.y-feet;innerRoofReview.minimumCanopyClearance=Math.min(innerRoofReview.minimumCanopyClearance,clearance);
  assert.ok(clearance>=2.10,'Stepped canopy keeps full standing clearance at '+[x,z,j,hit.object.name]);
}
const parapet=temple.getObjectByName('Inner parapet red posts'),postMatrix=new THREE.Matrix4(),postPosition=new THREE.Vector3(),postScale=new THREE.Vector3(),postRotation=new THREE.Quaternion();
for(let i=0;i<parapet.count;i++){
  parapet.getMatrixAt(i,postMatrix);postMatrix.decompose(postPosition,postRotation,postScale);
  const foot=postPosition.y-postScale.y/2,hit=new THREE.Raycaster(new THREE.Vector3(postPosition.x,foot+.06,postPosition.z),new THREE.Vector3(0,-1,0),0,.15).intersectObjects([...cornices,canopy],false)[0];
  assert.ok(hit&&hit.point.y>=foot-.001,'Every stepped parapet pier bears on the actual cornice/canopy');
}
for(const o of temple.children.filter(o=>o.name==='Inner roof dark parapet pier')){
  const b=new THREE.Box3().setFromObject(o),foot=new THREE.Raycaster(new THREE.Vector3(o.position.x,b.min.y+.01,o.position.z),new THREE.Vector3(0,-1,0),0,.03).intersectObject(hallSlab,false)[0];
  assert.ok(foot&&Math.abs(foot.point.y-b.min.y)<.001,'Dark side parapets bear on the existing flat roof');
}
const rustRoof=temple.getObjectByName('Inner slot rust corrugated lean-to'),rustNormals=rustRoof.geometry.attributes.normal;
for(let i=0;i<rustNormals.count;i++)assert.ok(rustNormals.getY(i)>.85,'Rust corrugated pent roof faces up for native lighting');
for(const o of temple.children.filter(o=>o.name==='Inner slot roof steel support')){
  const b=new THREE.Box3().setFromObject(o),foot=new THREE.Raycaster(new THREE.Vector3(o.position.x,b.min.y+.01,o.position.z),new THREE.Vector3(0,-1,0),0,.03).intersectObjects([hallSlab,hallJunction],false)[0];
  assert.ok(foot&&Math.abs(foot.point.y-b.min.y)<.001,'Each rust roof support meets an existing roof surface');
  const bearing=temple.children.filter(q=>q.name==='Inner slot roof steel cross bearing');
  const head=new THREE.Raycaster(new THREE.Vector3(o.position.x,b.max.y-.04,o.position.z),new THREE.Vector3(0,1,0),0,.09).intersectObjects(bearing,false)[0];
  assert.ok(head&&Math.abs(head.point.y-b.max.y)<.03,'Each rust roof support meets its cross bearing');
  const cover=new THREE.Raycaster(new THREE.Vector3(o.position.x,b.max.y+.026,o.position.z),new THREE.Vector3(0,1,0),0,.04).intersectObject(rustRoof,false)[0];
  assert.ok(cover,'Cross bearings meet the short slot cover without floating above it');
}
// main.js stores temple viewpoints at the shipped placement; bring them back to authored coordinates.
const inTempleXZ=(x,z)=>x>20.1&&x<58.4&&z>-.6&&z<46.5;
const authored=v=>{const facing=v===photos.temple||v===photos.templepond;for(const k of ['p','target'])if(v[k]&&(facing||inTempleXZ(v[k][0],v[k][2]-SHIPPED_TEMPLE_SHIFT)))v[k]=[v[k][0],v[k][1],+(v[k][2]-SHIPPED_TEMPLE_SHIFT).toFixed(4)];return v;};
for(const v of Object.values(photos))authored(v);
// The house is authored with its front door at x=0 and placed at K.houseShiftX.
const HX=K.houseShiftX,HV=(x,y,z)=>new THREE.Vector3(x+HX,y,z);
// 2013 entrance close-up: the painted gable must be visible, not buried in a hip roof or beam.
const gableEye=HV(0,2.07,5.35),gableTarget=HV(0,4.24,6.606);
const gableRay=new THREE.Raycaster(gableEye,gableTarget.clone().sub(gableEye).normalize());
assert.equal(gableRay.intersectObject(house,true)[0]?.object.name,'God room faded floral diamond frieze','Entrance sees the painted band above the tie beam');
// The newly identified left-side interior photo shows daylight through this grille.
const sideWindowRay=new THREE.Raycaster(HV(0,2.4,8.46),new THREE.Vector3(1,0,0),0,2.5);
assert.equal(sideWindowRay.intersectObject(house,true).length,0,'God-room side grille has a real opening, without the old shutter or trim across it');
const roofBounds=new THREE.Box3().setFromObject(house.getObjectByName('Broad upper facade tiled roof'));
assert.ok(roofBounds.max.y>8.75&&roofBounds.max.y<9.05,'Upper roof ridge has half the former attic rise');
assert.ok(Math.abs(new THREE.Box3().setFromObject(temple.getObjectByName('Entrance wash wall')).min.y)<.001,'Tap wall reaches the ground');
assert.ok(Math.abs(new THREE.Box3().setFromObject(temple.getObjectByName('Entrance wash trough grounded base')).min.y)<.001,'Trough has a grounded base');
const frontPier=temple.getObjectByName('Entrance square white pier');
assert.ok(frontPier.position.z<-1,'Entrance columns project ahead of the right wing');
assert.ok(new THREE.Box3().setFromObject(landscape.getObjectByName('Adjacent building central stair dark tread')).getSize(new THREE.Vector3()).z<4,'Stage stair width is reduced');
const washTapRay=new THREE.Raycaster(new THREE.Vector3(33.6,1.04,-.39),new THREE.Vector3(1,0,0));
assert.equal(washTapRay.intersectObject(temple,true)[0]?.object.name,'Entrance wash tap spout','Wash taps face right from the temple front');
assert.ok(collision(35.0,-.8,0),'Front-to-back wash screen has matching collision bounds');
// Closed upper frontage and the dead-end service corner in the new references.
assert.ok(collision(44.0,-.22,4.08),'Upper entrance storey is enclosed behind the balcony');
const upperWallRay=new THREE.Raycaster(new THREE.Vector3(44.0,5.7,-4),new THREE.Vector3(0,0,1));
assert.equal(upperWallRay.intersectObject(temple,true)[0]?.object.name,'Entrance upper enclosed room wall');
assert.ok(collision(49.8,6.38,.1),'Back-left entry corner cannot lead outside');
const returnWallRay=new THREE.Raycaster(new THREE.Vector3(49.8,1.8,10),new THREE.Vector3(0,0,-1));
assert.equal(returnWallRay.intersectObject(temple,true)[0]?.object.name,'Entrance circuit closed return wall');
for(const key of ['houseexitleft','templeentryreturn']){
  const expression=main.match(new RegExp('destinations\\.'+key+'=(\\{.*\\});'))[1];
  const v=authored(new Function('return ('+expression+')')());
  assert.ok(!collision(v.p[0],v.p[2],v.p[1]),key+' viewpoint clear');
  assert.ok(Math.abs(supportY(v.p[0],v.p[2],v.p[1])-v.p[1])<.06,key+' viewpoint supported');
}
let lastRoadHeight=0;
for(const [x,z] of [[-7,-5],[-18,-5],[-36,-5],[-53,-5.8],[-67,-9.5]]){
  const hit=new THREE.Raycaster(new THREE.Vector3(x,5,z),new THREE.Vector3(0,-1,0)).intersectObject(landscape,true)[0];
  assert.equal(hit?.object.name,'Narrow asphalt lane curving away from the temple');
  assert.ok(hit.point.y>=lastRoadHeight,'Asphalt climbs away from the house');
  assert.ok(Math.abs(hit.point.y-supportY(x,z,hit.point.y))<.10,'Road walking surface follows visible asphalt');
  lastRoadHeight=hit.point.y;
}
assert.ok(lastRoadHeight>1.7,'The road has a visible rise by the distant bend');
// Family-confirmed exterior and doorway photographs replace the adjacent hall.
assert.equal(photos.temple.url,'temple-entrance.jpg');
assert.equal(photos.templedoor.url,'temple-doorway.jpg');
assert.equal(photos.adjacent.url,'temple.jpg');
for(const key of ['temple','templedoor']){
  const p=photos[key].p;
  assert.ok(!collision(p[0],p[2],p[1]),key+' camera must be clear');
  assert.ok(Math.abs(supportY(p[0],p[2],p[1])-p[1])<.06,key+' camera must stand on the approach');
}
assert.ok(photos.temple.p[0]>39,'Exterior camera is slightly left of the entrance when facing it');
assert.equal(temple.getObjectByName('Central white entrance gable'),undefined,'Adjacent hall gable must not be duplicated on the temple');
assert.equal(temple.getObjectByName('Left lower guardian'),undefined);
const doorEye=new THREE.Vector3(...photos.templedoor.p).add(new THREE.Vector3(0,1.62,0));
for(const [point,prefix] of [
  // Aim a little off the panels' centre line: a ray along a shared triangle edge can miss both faces.
  [[41.6,2.1,5.82],'Entrance doorway left original painting'],
  [[36.4,2.1,5.82],'Entrance doorway right original painting'],
  [[39,3.18,5.738],'Entrance doorway original inscription'],
]){
  const ray=new THREE.Raycaster(doorEye,new THREE.Vector3(...point).sub(doorEye).normalize());
  const hit=ray.intersectObjects([temple,landscape],true)[0];
  assert.equal(hit?.object.name,prefix,'The doorway photograph must see '+prefix);
}
const passageRay=new THREE.Raycaster(new THREE.Vector3(39,2.22,3.05),new THREE.Vector3(0,0,1),0,4.8);
assert.equal(passageRay.intersectObject(temple,true).length,0,'The entrance door must remain an actual open passage');
const entranceEye=new THREE.Vector3(...photos.temple.p).add(new THREE.Vector3(0,1.62,0));
const archRay=new THREE.Raycaster(entranceEye,new THREE.Vector3(39.95,6.22,-1.8).sub(entranceEye).normalize());
assert.equal(archRay.intersectObject(temple,true)[0]?.object.name,'Entrance upper blue scalloped arch');
// 15.16.09: only the rear ledges are high; the front side floors are one riser above the passage.
assert.equal(supportY(39,4,.20),.20);
for(const x of [35.6,43]){
  for(const z of [0,3]){
    assert.equal(supportY(x,z,.39),.39,'Front side floor stays below the rear ledge');
    const hit=new THREE.Raycaster(new THREE.Vector3(x,.65,z),new THREE.Vector3(0,-1,0)).intersectObject(temple,true)[0];
    assert.equal(hit?.object.name,'Entrance low side floor','Visible front floor matches the low walking surface');
    assert.ok(Math.abs(hit.point.y-.39)<.001);
  }
  assert.equal(supportY(x,4.4,.85),.85,'The high marble ledge is limited to the rear doorway');
  const hit=new THREE.Raycaster(new THREE.Vector3(x,1.1,4.4),new THREE.Vector3(0,-1,0)).intersectObject(temple,true)[0];
  assert.equal(hit?.object.name,'Entrance raised side marble platform');
  assert.ok(Math.abs(hit.point.y-.85)<.001);
}
assert.ok(supportY(33,0,.39)<.23,'The west side floor does not project through the road frontage');
assert.equal(supportY(33,3,.39),.39,'The west floor remains behind the frontage');
assert.equal(supportY(37.65,3,.20),.20,'The front passage widens beside the low floor');
assert.equal(supportY(38.6,4.4,.20),.20,'The rear passage stays open beside the marble ledge');
temple.traverse(o=>{if(o.name==='Entrance pier stone foot')assert.ok(Math.abs(new THREE.Box3().setFromObject(o).min.y-.39)<.001,'Front pier feet reach the lower floor');});
temple.traverse(o=>{
  if(!/^(Entrance low side floor front kerb|Entrance side platform laterite riser|Entrance side platform white moulding)$/.test(o.name))return;
  assert.ok(new THREE.Box3().setFromObject(o).min.x>=35-.001,'Lane-facing floor trims stop where the road frontage starts');
});
const deityNames=['Entrance Ganesh original painting','Entrance doorway left original painting','Entrance doorway right original painting','Entrance Hanuman original painting'];
const deityXs=deityNames.map(n=>temple.getObjectByName(n).position.x);
assert.ok(deityXs.every((x,i)=>i===0||deityXs[i-1]>x),'Ganesh, Shiva, Vishnu, Hanuman are ordered left to right when entering');
for(const [key,name] of [['templepicturesleft',deityNames[0]],['templepicturesleft',deityNames[1]],['templevishnu',deityNames[2]],['templehanuman',deityNames[3]]]){
  const painting=temple.getObjectByName(name),p=photos[key].p,eye=new THREE.Vector3(...p).add(new THREE.Vector3(0,1.62,0));
  assert.ok(!collision(p[0],p[2],p[1]),'Painting viewpoint is clear');
  assert.ok(Math.abs(supportY(p[0],p[2],p[1])-p[1])<.01,'Painting viewpoint is supported');
  assert.equal(new THREE.Raycaster(eye,painting.position.clone().sub(eye).normalize()).intersectObject(temple,true)[0]?.object.name,name,'Close view can see '+name);
  const uv=painting.geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)assert.ok(Number.isFinite(uv.getX(i))&&uv.getX(i)>=0&&uv.getX(i)<=1&&uv.getY(i)>=0&&uv.getY(i)<=1,'Painting UVs stay within the unchanged source');
}
const soilGroup=new THREE.Group();
for(const m of main.matchAll(/ground\(([-.\d]+),([-.\d]+),([-.\d]+),([-.\d]+)\)/g)){
  const [x,z,w,d]=m.slice(1).map(Number);K.box(soilGroup,'Actual terrain',x,-.22,z,w,.44,d,'earth');
}
soilGroup.updateMatrixWorld(true);
for(const x of [-9.5,-8.5,-7.5])for(const z of [-35.6,-28,-20,-11.5]){
  const ground=new THREE.Raycaster(new THREE.Vector3(x,.01,z),new THREE.Vector3(0,-1,0),0,.025).intersectObject(soilGroup,true)[0];
  assert.ok(ground&&Math.abs(ground.point.y-westRoadBounds.min.y)<.001,'Mud-road underside bears on actual authored terrain');
}
// The forecourt pond needs the set-back forecourt, so it is not built at this authored placement;
// tests/temple-setback.mjs checks that it is open at the shipped one.
assert.equal(landscape.getObjectByName('Temple small pond recessed water'),undefined,'No pond without the set-back');
for(const key of ['templepond','templeacross']){
  const p=photos[key].p;assert.ok(!collision(p[0],p[2],p[1]),key+' viewpoint is clear');
  assert.ok(Math.abs(supportY(p[0],p[2],p[1])-p[1])<.06,key+' viewpoint is supported');
}
assert.ok(temple.getObjectByName('Entrance weathered flat canopy').position.y<temple.getObjectByName('Temple road corner flat roof').position.y,'The entry canopy is below the right wing roof');
// 15.20.01 / 15.19.36: one upper window per roughly 2.9 m bay, with a narrow plain shutter below.
const roadPiers=temple.children.filter(o=>o.name==='Temple road porch white pier').sort((a,b)=>a.position.x-b.position.x);
const roadWindows=temple.children.filter(o=>o.name==='Temple road blue window frame'&&o.position.y>4&&o.position.x<35).sort((a,b)=>a.position.x-b.position.x);
assert.equal(roadPiers.length,6,'Five frontage bays have six boundary piers');
assert.equal(roadWindows.length,5,'Every frontage bay has its own upper window');
for(let i=0;i<roadWindows.length;i++){
  const pitch=roadPiers[i+1].position.x-roadPiers[i].position.x;
  assert.ok(pitch>2.8&&pitch<3.0,'Frontage bays stay close to the photographed 2.9 m pitch');
  assert.ok(Math.abs(roadWindows[i].position.x-(roadPiers[i].position.x+roadPiers[i+1].position.x)/2)<.02,'Upper window is centred over its bay');
}
const roadShutter=temple.getObjectByName('Temple road blue rolling shutter'),shutterBounds=new THREE.Box3().setFromObject(roadShutter);
assert.ok(Math.abs(shutterBounds.getSize(new THREE.Vector3()).x-1.9)<.001,'Rolling shutter is narrower than a frontage bay');
assert.equal(roadShutter.position.x,roadWindows[0].position.x,'Shutter and first upper window align');
assert.equal(temple.getObjectByName('Temple road shutter dark frame'),undefined,'The shutter has no wide invented dark surround');
assert.equal(temple.getObjectByName('Covered hall road shutter inner face').position.x,roadShutter.position.x,'Inner and outer shutter faces share the same bay');
const frontageWalls=temple.children.filter(o=>o.name==='Temple road corner lower frontage');
for(const o of frontageWalls)assert.ok(Math.abs(new THREE.Box3().setFromObject(o).min.z-1.45)<.001,'Lower frontage faces meet in one plane');
assert.ok(Math.abs(new THREE.Box3().setFromObject(temple.getObjectByName('Temple road upper front wall')).min.z-1.45)<.001,'Upper frontage extension matches the main face');
temple.traverse(o=>{if(o.name==='Entrance low side floor'){const b=new THREE.Box3().setFromObject(o);if(b.min.x<35-.001)assert.ok(b.min.z>=1.75-.001,'West low floor stops behind the flush frontage');}});
assert.ok(temple.getObjectByName('Temple road white front balcony balusters').count>=38);
// The three lake photographs are a stationary left-to-right pan opposite the mud road.
const panoramaKeys=['lakeleft','lakemiddle','lakehouse'];
const panoramaEye=new THREE.Vector3(...photos.lakeleft.p).add(new THREE.Vector3(0,1.62,0));
for(const key of panoramaKeys){
  const p=photos[key].p;
  assert.deepEqual(p,photos.lakeleft.p,'Panorama camera stays in one place');
  assert.ok(!collision(p[0],p[2],p[1]),'Panorama viewpoint is clear');
  assert.ok(Math.abs(supportY(p[0],p[2],p[1])-p[1])<.01,'Panorama viewpoint is supported');
}
assert.ok(photos.lakeleft.target[0]>photos.lakemiddle.target[0]&&photos.lakemiddle.target[0]>photos.lakehouse.target[0],'Pan from temple-left to house-right');
for(const [point,prefixes] of [
  [[60.12,6.7,-5],['Adjacent building']],
  [[25.1,5.5,1.25],['Temple road']],
  [[0,5.5,0],['Upper','House','Pink','Overlapping']],
  [[34,1.33,-32],['pavilion']],
]){
  const ray=new THREE.Raycaster(panoramaEye,new THREE.Vector3(...point).sub(panoramaEye).normalize());
  const hit=ray.intersectObjects([landscape,temple,house],true)[0];
  assert.ok(prefixes.some(prefix=>hit?.object.name.startsWith(prefix)),`Panorama landmark at ${point} must be visible, got ${hit?.object.name}`);
}
const panoramaCamera=new THREE.PerspectiveCamera(photos.lakeleft.fov,4/3,.06,400);panoramaCamera.position.copy(panoramaEye);panoramaCamera.lookAt(new THREE.Vector3(...photos.lakeleft.target));panoramaCamera.updateMatrixWorld();
const pavilionProjection=new THREE.Vector3(34,1,-32).project(panoramaCamera);
assert.ok(pavilionProjection.x<0&&pavilionProjection.x>-1.2,'Pavilion belongs in the near left foreground');
assert.equal(supportY(38,-25,0),-8,'The tank continues in front of the temple');
// 14.58.02: view from the house-side lane, with shop, stage and temple in order.
const lakeFenceView=new Function('return ('+main.match(/destinations\.lakefence=(\{.*\});/)[1]+')')();
const fenceEye=new THREE.Vector3(...lakeFenceView.p).add(new THREE.Vector3(0,1.62,0));
assert.ok(!collision(lakeFenceView.p[0],lakeFenceView.p[2],lakeFenceView.p[1]),'Lake-fence viewpoint is clear');
assert.ok(Math.abs(supportY(lakeFenceView.p[0],lakeFenceView.p[2],lakeFenceView.p[1])-lakeFenceView.p[1])<.06,'Lake-fence viewpoint is supported');
const fenceCamera=new THREE.PerspectiveCamera(lakeFenceView.fov,4/3,.06,400);fenceCamera.position.copy(fenceEye);fenceCamera.lookAt(new THREE.Vector3(...lakeFenceView.target));fenceCamera.updateMatrixWorld();
const fenceLandmarks=[[62,2.5,-30.6],[60.12,6.7,-5],[25.15,5.3,1.25]],fenceScreen=fenceLandmarks.map(p=>new THREE.Vector3(...p).project(fenceCamera).x);
assert.ok(fenceScreen[0]<fenceScreen[1]&&fenceScreen[1]<fenceScreen[2],'Shop, stage and temple appear left to right');
assert.ok(fenceScreen.every(x=>Math.abs(x)<1),'All three buildings fit the new view');
for(const [i,p] of fenceLandmarks.entries()){
  const ray=new THREE.Raycaster(fenceEye,new THREE.Vector3(...p).sub(fenceEye).normalize()),hit=ray.intersectObjects([landscape,temple,house],true)[0];
  const expected=[['Shop '],['Adjacent building','Stage '],['Temple road']][i];
  assert.ok(expected.some(n=>hit?.object.name.startsWith(n)),'Lake-fence view landmark visible: '+i+', got '+hit?.object.name);
}
assert.ok(collision(-1.49,-10.0,0),'Heavy roadside piers block walking through them');
for(let x=-4.9;x<=12.2;x+=.2)assert.ok(collision(x,-10.0,0),'Water rail is continuous from the tank corner across the house');
for(let x=12.5;x<=14.2;x+=.2)assert.ok(collision(x,-8.3,0),'Lane-side wall runs from the jog to the gate');
assert.ok(!collision(5,-9.4,0),'The grass verge behind the water rail is walkable');
assert.ok(!collision(2,-7.6,0),'A verge stays walkable between the lane and the fence');
assert.ok(!collision(16.4,-9.65,.055),'Rotated bathing gate is clear');
assert.equal(landscape.getObjectByName('Tank lane gatehouse tiled roof'),undefined,'No extra roofed gatehouse between the entrance and long arcade');
const gatePiers=landscape.children.filter(o=>o.name==='Tank gate square stepped stone pier');
assert.ok(gatePiers.every(o=>Math.abs(o.position.x-16.4)<.01),'Gate piers run perpendicular to the house-facing rail');
assert.ok(!collision(50.08,-22.15,.055),'East bathing stair opening remains clear');
// The figures are modelled stone groups (lotus base, body, arms), not photo panels: aim at the chest.
for(const name of ['Stage upper left stone figure','Stage upper right stone figure','Stage lower left stone figure','Stage lower right stone figure']){
  const figure=landscape.getObjectByName(name),chest=figure.position.clone().add(new THREE.Vector3(0,.9,0)),ray=new THREE.Raycaster(new THREE.Vector3(51,4,-5),chest.sub(new THREE.Vector3(51,4,-5)).normalize());
  assert.equal(ray.intersectObject(landscape,true)[0]?.object.parent?.name,name,'Decorative figure visible from the forecourt');
  figure.traverse(o=>{if(o.isMesh)assert.ok(!o.material.map,'Stage figures carry no photograph');});
}
// 15.13.30 / 15.13.26 / 15.12.15 / 15.19.57: retain the six sculpture placements,
// but give the stone silhouettes curved trunks/calves, separate legs and bent arms.
const stageSculptures=landscape.children.filter(o=>o.name==='Stage stair black stone elephant'||/^Stage (lower|upper) (left|right) stone figure$/.test(o.name));
assert.equal(stageSculptures.length,6);
const stageSculptureReview={closedMeshes:0,adultBearingFeet:0,calfBearingFeet:0,guardianBearingFeet:0,stairCapsuleSamples:0};
function closedOutwardStone(mesh){
  const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,index=mesh.geometry.index;
  const welded=new Map(),ids=[],edges=new Map();let volume=0;
  for(let i=0;i<p.count;i++){
    const v=new THREE.Vector3().fromBufferAttribute(p,i),normal=new THREE.Vector3().fromBufferAttribute(n,i);
    assert.ok(v.toArray().every(Number.isFinite)&&normal.toArray().every(Number.isFinite),mesh.name+' finite geometry');
    assert.ok(Math.abs(normal.length()-1)<.0001,mesh.name+' unit normals');
    const key=v.toArray().map(x=>Math.round(x*1e5)).join(',');if(!welded.has(key))welded.set(key,welded.size);ids.push(welded.get(key));
  }
  const count=index?.count??p.count;
  for(let i=0;i<count;i+=3){
    const t=[0,1,2].map(j=>index?index.getX(i+j):i+j),v=t.map(k=>new THREE.Vector3().fromBufferAttribute(p,k));
    if(v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).lengthSq()<1e-20)continue;
    volume+=v[0].dot(v[1].clone().cross(v[2]))/6;
    for(let j=0;j<3;j++){const a=ids[t[j]],b=ids[t[(j+1)%3]];assert.notEqual(a,b,mesh.name+' nondegenerate welded edge');const key=a<b?a+':'+b:b+':'+a,edge=edges.get(key)||[0,0];edge[0]++;edge[1]+=a<b?1:-1;edges.set(key,edge);}
  }
  for(const [key,[count,balance]] of edges)assert.ok(count===2&&balance===0,mesh.name+' closed consistently wound edge '+key);
  if(mesh.geometry.type==='BufferGeometry'){
    const ringSize=(p.count-2)%24===0?24:12,ringCount=(p.count-2)/ringSize,centers=[];
    for(let j=0;j<ringCount;j++){const center=new THREE.Vector3();for(let k=0;k<ringSize;k++)center.add(new THREE.Vector3().fromBufferAttribute(p,j*ringSize+k));centers.push(center.divideScalar(ringSize));}
    for(let i=0;i<(ringCount-1)*ringSize*6;i+=3){
      const t=[0,1,2].map(j=>index.getX(i+j)),v=t.map(k=>new THREE.Vector3().fromBufferAttribute(p,k));
      const radial=new THREE.Vector3();for(let j=0;j<3;j++)radial.add(v[j].clone().sub(centers[Math.floor(t[j]/ringSize)]));
      const dot=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize().dot(radial.normalize());
      assert.ok(dot>=-.0001,mesh.name+' no folded inward side face: '+dot);
    }
  }
  assert.ok(volume>1e-8,mesh.name+' outward signed volume');stageSculptureReview.closedMeshes++;
}
const childMeshes=(g,name)=>g.children.filter(o=>o.isMesh&&o.name===name);
for(const g of stageSculptures){
  g.traverse(o=>{if(o.isMesh&&!['Elephant base slab','Stage figure lotus base'].includes(o.name))closedOutwardStone(o);});
  const elephant=g.name==='Stage stair black stone elephant',base=g.getObjectByName(elephant?'Elephant base slab':'Stage figure lotus base'),baseBounds=new THREE.Box3().setFromObject(base);
  const footNames=elephant?['Elephant ground-bearing foot','Elephant calf ground-bearing leg']:['Stage figure bearing foot'];
  for(const name of footNames){
    const feet=childMeshes(g,name);assert.equal(feet.length,elephant?4:2,'Each sculpture has its photographed standing leg count');
    for(const foot of feet){
      const b=new THREE.Box3().setFromObject(foot),center=b.getCenter(new THREE.Vector3());
      const contact=new THREE.Raycaster(new THREE.Vector3(center.x,b.min.y+.02,center.z),new THREE.Vector3(0,-1,0),0,.04).intersectObject(base,false)[0];
      assert.ok(contact&&Math.abs(b.min.y-contact.point.y)<.00001,'Foot meets its retained actual stone base');
      assert.ok(b.min.x>=baseBounds.min.x-.00001&&b.max.x<=baseBounds.max.x+.00001&&b.min.z>=baseBounds.min.z-.00001&&b.max.z<=baseBounds.max.z+.00001,'Every foot bears within the base footprint');
      if(elephant)stageSculptureReview[name.includes('calf')?'calfBearingFeet':'adultBearingFeet']++;else{
        const p=foot.geometry.attributes.position;
        for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i)-.16)<.00001)assert.ok(Math.hypot(p.getX(i),p.getZ(i))<=.23001,'Guardian foot bears inside the circular lotus top');
        stageSculptureReview.guardianBearingFeet++;
      }
    }
  }
  if(elephant){
    const trunk=g.getObjectByName('Elephant curled trunk'),body=g.getObjectByName('Elephant arched body');assert.ok(trunk&&body);
    assert.equal(childMeshes(g,'Elephant tapered leg').length,4);
    assert.equal(new THREE.Raycaster(g.localToWorld(new THREE.Vector3(-.69,.50,-1)),new THREE.Vector3(0,0,1),0,2.5).intersectObject(g,true).length,0,'Curved trunk leaves photographed negative space above the standing calf');
    for(const leg of childMeshes(g,'Elephant tapered leg')){
      const b=new THREE.Box3().setFromObject(leg),foot=childMeshes(g,'Elephant ground-bearing foot').find(f=>new THREE.Box3().setFromObject(f).intersectsBox(b));assert.ok(foot,'Adult leg meets its bearing foot');
      assert.ok(new THREE.Box3().setFromObject(body).intersectsBox(b),'Adult leg joins its arched body');
    }
  }else{
    assert.equal(childMeshes(g,'Stage figure distinct leg').length,2);
    assert.equal(new THREE.Raycaster(g.localToWorld(new THREE.Vector3(-1,.30,0)),new THREE.Vector3(1,0,0),0,2).intersectObject(g,true).length,0,'Distinct standing legs leave a real gap below the skirt');
    const top=new THREE.Box3().setFromObject(g).max.y;assert.ok(Math.abs(top-g.position.y-1.82)<.00001,'Guardian retains existing sculpture height');
  }
}
assert.ok(landscape.getObjectByName('Stage upper left stone figure').getObjectByName('Stage upper animal muzzle'),'Upper-left head has the directly observed projecting muzzle');
for(const side of ['left','right'])assert.equal(childMeshes(landscape.getObjectByName('Stage upper '+side+' stone figure'),'Stage figure bent prayer arm').length,2,'Upper pair retain joined-hand poses');
// Sweep the native capsule radius through actual sculpture triangles on the retained
// plain/tiled stair flights, in both directions and across three usable tracks.
for(const z of [-6.5,-5,-3.5])for(const reverse of [false,true]){
  let feet=reverse?2.82:0;
  for(let i=0;i<=110;i++){
    const x=reverse?59.8-i*.05:54.3+i*.05;feet=supportY(x,z,feet);
    for(let j=0;j<9;j++){
      const a=j*Math.PI/4,r=j===8?0:.22,ray=new THREE.Raycaster(new THREE.Vector3(x+r*Math.cos(a),feet+.025,z+r*Math.sin(a)),new THREE.Vector3(0,1,0),0,2.10);
      assert.equal(ray.intersectObjects(stageSculptures,true).length,0,'Stone sculptures clear the supported walking capsule on the stair tracks');
      stageSculptureReview.stairCapsuleSamples++;
    }
  }
}
// The shop is beside the adjacent building, not another temple frontage.
for(const key of ['shop','shoplake']){
  const p=photos[key].p;assert.ok(!collision(p[0],p[2],p[1]),key+' camera clear');
  assert.ok(Math.abs(supportY(p[0],p[2],p[1])-p[1])<.06,key+' camera supported');
  const eye=new THREE.Vector3(...p).add(new THREE.Vector3(0,1.62,0));
  const ray=new THREE.Raycaster(eye,new THREE.Vector3(62.0,2.20,-25.4).sub(eye).normalize());
  const hit=ray.intersectObjects([landscape,temple,house],true)[0];
  assert.ok(hit?.object.name.startsWith('Shop '),key+' sees the shopfront, got '+hit?.object.name);
}
const shopCamera=new THREE.PerspectiveCamera(photos.shoplake.fov,4/3,.06,400);
shopCamera.position.set(...photos.shoplake.p).add(new THREE.Vector3(0,1.62,0));shopCamera.lookAt(new THREE.Vector3(...photos.shoplake.target));shopCamera.updateMatrixWorld();
const shopScreen=new THREE.Vector3(61.5,3,-25).project(shopCamera),adjacentScreen=new THREE.Vector3(60,4,-5).project(shopCamera);
assert.ok(shopScreen.x<adjacentScreen.x,'Shop is left of the adjacent building across the lake');
assert.ok(Math.abs(shopScreen.x)<1&&Math.abs(adjacentScreen.x)<1,'Both buildings fit in the across-lake composition');
assert.ok(landscape.getObjectByName('Shop cream end upper block').position.z>landscape.getObjectByName('Shop upper white rear block').position.z,'Cream end block is nearest the adjacent building');
assert.ok(!collision(58.9,-25,.486),'Shop forecourt remains accessible'); // on the raised lawn
// The two late-afternoon front photographs are on the near lake bank/front lane.
for(const key of ['house','houseleft']){
  const p=photos[key].p;
  assert.ok(!collision(p[0],p[2],p[1]),key+' camera clear of the lake parapet');
  assert.ok(Math.abs(supportY(p[0],p[2],p[1])-p[1])<.06,key+' camera supported on the bank');
}
const facadeEye=new THREE.Vector3(...photos.house.p).add(new THREE.Vector3(0,1.62,0));
for(const [point,prefixes] of [
  [[0,7.08,-.2],['Overlapping upper-front Mangalore tile courses','Broad upper facade tiled roof']],
  [[0,3.09,-.65],['Overlapping lower-veranda Mangalore tile courses','Dry grass and moss','Entrance veranda roof tiles']],
  [[2.5,5.45,1.65],['Upper front small dark window','House repeated']],
]){
  const ray=new THREE.Raycaster(facadeEye,HV(...point).sub(facadeEye).normalize());
  const hit=ray.intersectObject(house,true)[0];
  assert.ok(prefixes.some(prefix=>hit?.object.name.startsWith(prefix)),`Front photo sightline: ${prefixes[0]}, got ${hit?.object.name}`);
}
const leftFrontCamera=new THREE.PerspectiveCamera(photos.houseleft.fov,4/3,.06,400);
leftFrontCamera.position.set(photos.houseleft.p[0],photos.houseleft.p[1]+1.62,photos.houseleft.p[2]);leftFrontCamera.lookAt(new THREE.Vector3(...photos.houseleft.target));leftFrontCamera.updateMatrixWorld();
assert.ok(leftFrontCamera.getWorldDirection(new THREE.Vector3()).x>.97,'Leftward front photo faces towards the temple side');
assert.ok(new THREE.Vector3(5.8,1,-2.35).project(leftFrontCamera).x>0,'Car and house belong to photo-right');
assert.ok(!landscape.getObjectByName('Angled roadside studio sign'),'Removed studio board must stay out of the scene');
const reference=photos.veranda;
assert.ok(reference.p[2]>0&&reference.p[2]<2,'Photo must start on the veranda before the main door');
const camera=new THREE.PerspectiveCamera(reference.fov,4/3,.06,400);
camera.position.set(reference.p[0],reference.p[1]+1.62,reference.p[2]);camera.lookAt(new THREE.Vector3(...reference.target));camera.updateMatrixWorld();
assert.ok(camera.getWorldDirection(new THREE.Vector3()).x>.95,'Looking left while entering must face +X');
assert.ok(HV(4,2,2.05).project(camera).x>0,'Room wall must appear to the right');
assert.ok(!collision(reference.p[0],reference.p[2],reference.p[1]),'Photo position must be clear');
const routes=[];
const houseRoute=(name,points,...rest)=>checkRoute(name,points.map(([x,z])=>[x+HX,z]),...rest);
function checkRoute(name,points,startFeet=.45,minimumFloor=.44){let feet=startFeet,samples=0;for(let j=1;j<points.length;j++){const a=points[j-1],b=points[j],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.04);for(let i=0;i<=n;i++){const t=i/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;assert.ok(!collision(x,z,feet),`${name}: collision at ${x}, ${z}`);assert.ok(!blockedRise(x,z,feet),`${name}: impassable rise at ${x}, ${z}`);feet=supportY(x,z,feet);assert.ok(feet>=minimumFloor,`${name}: missing floor`);samples++;}}routes.push({name,samples,finalHeight:feet});}
// User's note: the centre passage is at ground level; one worn step leads up to the side walk.
houseRoute('Entrance to left veranda',[[0,1.1],[0,-.31],[8.2,-.31]],.075,.07);
houseRoute('Lane through the entrance to the court pocket',[[0,-3],[0,5.1]],0,0);
assert.ok(routes.at(-1).finalHeight<.1,'Entrance passage stays at ground level');
// User's note: the grey pocket floor runs across the God room front, down at .075.
houseRoute('Inner hall into the God room court pocket',[[0,.5],[0,5.1]],.075,.07);
assert.ok(supportY(HX,5.1,.1)<.1,'God room front is the low grey floor');
// 175306: a lower open entrance passage between matching raised platforms.
const innerPlatforms=house.children.filter(o=>o.name==='Inner entrance raised sitting platform');
assert.equal(innerPlatforms.length,2);
const innerPlatformBounds=innerPlatforms.map(o=>new THREE.Box3().setFromObject(o));
assert.equal(innerPlatformBounds[0].max.y,innerPlatformBounds[1].max.y);
assert.ok(innerPlatformBounds.every(b=>b.max.y>.75&&b.max.y<.85),'Both platforms rise above the entry passage');
for(const side of [-1,1]){
  const eye=HV(0,2.07,3.15),target=HV(side*2,1.4,2.80),direction=target.clone().sub(eye);
  const hits=new THREE.Raycaster(eye,direction.clone().normalize(),0,direction.length()).intersectObject(house,true);
  assert.equal(hits.length,0,'Open door leaves must not hide the inner sitting platforms');
  houseRoute('Inner hall to raised platform '+side,[[0,3.2],[side*2.05,3.2],[side*2.05,3.92]],.075,.07);
  houseRoute('Raised platform back to hall '+side,[[side*2.05,3.92],[side*2.05,3.2],[0,3.2]],.79,.07);
}
for(const side of [-1,1]){
  const ray=new THREE.Raycaster(HV(side*.76,2.0,3.15),new THREE.Vector3(0,0,-1),0,1.3);
  assert.ok(ray.intersectObject(house,true).some(h=>h.object.name.startsWith('Front room facade')),'Door is narrower than the lower passage');
}
// User's notes: both raised sitting platforms are left empty.
for(const n of ['Inner sitting platform storage trunk','Inner sitting bay red steel cupboard','Inner sitting bay curved-arm wooden chair','God room side desk'])assert.ok(!house.getObjectByName(n),n+' was removed');

// User's note (game, 2026-10-02): this hall floor is at ground level; the raised red floor starts at the court railing line (x 6.85).
houseRoute('Inner veranda to the right front room (no facade door, per user)',[[5.5,5.1],[5.5,3.1],[7,3.1]],.075,.07);
assert.ok(Math.abs(routes.at(-1).finalHeight-.45)<.01,'Raised floor starts in line with the court railing');
houseRoute('Entrance to left sitting bay',[[0,1.32],[2.65,1.32]],.075,.07);
houseRoute('Entrance to right sitting bay',[[0,1.32],[-2.65,1.32]],.075,.07);
houseRoute('Left sitting bay back to main door',[[2.65,1.32],[0,1.32],[0,3]],.75,.07);
houseRoute('Right sitting bay back to main door',[[-2.65,1.32],[0,1.32],[0,3]],.75,.07);
houseRoute('Lower veranda walkway both sides',[[-6.8,-.31],[8.2,-.31],[-6.8,-.31]],.45,.07);
const verandaKeys=['verandaleft','verandaseat','veranda','verandaright'];
for(const key of verandaKeys){
  const p=photos[key].p;
  assert.ok(p[2]<2.05&&Math.abs(p[0]-HX)<2.4,'All four veranda cameras must be before the main doorway');
  assert.ok(!collision(p[0],p[2],p[1]),key+' clear camera');
  assert.ok(Math.abs(supportY(p[0],p[2],p[1])-p[1])<.01,key+' supported camera');
}
for(const [key,point,prefix] of [
  ['verandaseat',[3.78,1.29,1.67],'Entrance-left chair seat'],
  ['verandaseat',[3.60,1.255,.86],'Entrance-left wooden bench'],
  ['veranda',[2.5,2.135,2.165],'Veranda window grey middle crossrail'],
  ['verandaright',[-4.19,1.90,1.50],'Right sitting bay turquoise end wall'],
]){
  const eye=new THREE.Vector3(...photos[key].p).add(new THREE.Vector3(0,1.62,0));
  const ray=new THREE.Raycaster(eye,HV(...point).sub(eye).normalize());
  const hit=ray.intersectObject(house,true)[0];
  assert.ok(hit?.object.name.startsWith(prefix),`${key}: ${prefix} visible; got ${hit?.object.name}`);
}
const rightVerandaCamera=new THREE.PerspectiveCamera(photos.verandaright.fov,4/3,.06,400);
rightVerandaCamera.position.set(photos.verandaright.p[0],2.07,photos.verandaright.p[2]);rightVerandaCamera.lookAt(new THREE.Vector3(...photos.verandaright.target));rightVerandaCamera.updateMatrixWorld();
assert.ok(rightVerandaCamera.getWorldDirection(new THREE.Vector3()).x<-.98,'Right from the entrance is -X');
assert.ok(HV(-3,2,2.05).project(rightVerandaCamera).x<0,'Right sitting-bay room wall is on photo-left');
for(let x=-6.8;x<8.3;x+=.12){
  const ray=new THREE.Raycaster(HV(x,.55,-.31),new THREE.Vector3(0,1,0),0,1.7);
  assert.equal(ray.intersectObject(house,true).length,0,'Lower veranda strip has physical head clearance');
}
houseRoute('Right entrance platform through north-south steps',[[0,5.15],[-4.9,5.15]],.45,.07);
houseRoute('Right entrance steps down into courtyard',[[-4.9,5.15],[-3.12,5.15],[-3.12,7]],.45,.03);
houseRoute('Courtyard back to right entrance platform',[[-3.12,7],[-3.12,5.15],[-4.9,5.15]],.035,.03);
// User-confirmed 175312 alignment: no camera refit to conceal layout errors.
const rightEntryCamera=new THREE.PerspectiveCamera(48,4/3,.06,400);
rightEntryCamera.position.set(-4.2075343063,2.5453056424,6.6058722911);
rightEntryCamera.quaternion.set(-.12448210896,.42775757941,.05960876957,.89329415782);rightEntryCamera.updateMatrixWorld();
for(const [name,x,z,min,max] of [['Entrance court peach round column',-4.6,4.3,-.45,-.1],['Courtyard octagonal timber post with turned capital',-4.6,3.5,-.2,.1]]){
  const target=HV(x,1.8,z),screen=target.clone().project(rightEntryCamera);
  assert.ok(screen.x>min&&screen.x<max,'Both entrance supports occupy the middle of the fixed photo');
  const hit=new THREE.Raycaster(rightEntryCamera.position,target.sub(rightEntryCamera.position).normalize()).intersectObject(house,true)[0];
  assert.equal(hit?.object.name,name,'Central pillar must be visible, not hidden by the old partition');
}
const pyramid=house.children.filter(o=>o.name==='Entrance three-tier pale pedestal');
assert.equal(pyramid.length,3);
// The entrance textiles shown in 175312 and turning135deg2/3 must hang from
// retained joists, remain above the platform and leave its actual access clear.
const innerTextiles=house.getObjectByName('Inner Naga bay hanging textiles');assert.ok(innerTextiles);
const innerCloths=innerTextiles.children.filter(o=>o.name==='Inner Naga bay folded hanging cloth');assert.equal(innerCloths.length,4);
const innerCord=innerTextiles.getObjectByName('Inner Naga bay supported drying cord');
for(const cloth of innerCloths){
  const b=new THREE.Box3().setFromObject(cloth),p=cloth.geometry.attributes.position,n=cloth.geometry.attributes.normal;
  assert.ok(b.min.y>1.03&&b.max.y<2.86&&b.min.z>2.55&&b.max.z<2.75,'Drapes stay over the platform, behind its walking strip');
  assert.ok(b.max.z-b.min.z>.07,'The cloth has visible soft folds');
  const layer=p.count/2;
  for(let i=0;i<p.count;i++)assert.ok(Number.isFinite(n.getX(i))&&Math.abs(n.getX(i)**2+n.getY(i)**2+n.getZ(i)**2-1)<.001,'Cloth normals are finite unit vectors');
  for(const i of [28,40,400,550]){assert.ok(n.getZ(i)>.5,'Front cloth normals face the court');assert.ok(n.getZ(i+layer)<-.5,'Closed cloth back normals face the wall');}
  const edges=new Map(),idx=cloth.geometry.index.array;
  for(let i=0;i<idx.length;i+=3)for(const [a,c] of [[idx[i],idx[i+1]],[idx[i+1],idx[i+2]],[idx[i+2],idx[i]]]){const k=Math.min(a,c)+':'+Math.max(a,c);edges.set(k,(edges.get(k)||0)+1);}
  assert.ok([...edges.values()].every(v=>v===2),'Cloth is a closed thin shell, including hems and sides');
  for(let i=0;i<27;i+=4){const top=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(cloth.matrixWorld);const hit=new THREE.Raycaster(top.clone().add(new THREE.Vector3(0,0,.05)),new THREE.Vector3(0,0,-1),0,.065).intersectObject(innerCord,false)[0];assert.ok(hit,'Every top fold meets the supported cord');}
}
const ties=innerTextiles.children.filter(o=>o.name==='Inner drying line ceiling tie');assert.equal(ties.length,2);
for(const tie of ties){const b=new THREE.Box3().setFromObject(tie),x=b.getCenter(new THREE.Vector3()).x;assert.ok(Math.abs(b.max.y-3.50)<.015,'Cord ties reach retained ceiling joists');const hit=new THREE.Raycaster(new THREE.Vector3(x,3.48,2.65),new THREE.Vector3(0,1,0),0,.06).intersectObject(house,true).find(h=>!innerTextiles.children.includes(h.object));assert.ok(hit&&Math.abs(hit.point.y-3.50)<.005,'Ceiling attachment has actual timber bearing');}
for(const z of [3.0,3.2])for(let x=-4.85;x<=-.8;x+=.12)for(let a=0;a<8;a++){
  const angle=a*Math.PI/4,ray=new THREE.Raycaster(HV(x+.22*Math.cos(angle),.79,z+.22*Math.sin(angle)),new THREE.Vector3(0,1,0),0,2.1);
  assert.equal(ray.intersectObject(innerTextiles,true).length,0,'Added cloth clears the actual raised-platform walking capsule');
}
const pyramidTarget=new THREE.Box3().setFromObject(pyramid[2]).getCenter(new THREE.Vector3());
assert.ok(pyramidTarget.z<4.6&&pyramidTarget.y>.8,'Stepped stand sits on the platform top at the pocket edge');
assert.ok(pyramidTarget.clone().project(rightEntryCamera).x>0,'Pedestal appears right of the central pillars');
const entryTreads=house.children.filter(o=>o.name==='Pedestal-side red courtyard stair');
assert.equal(entryTreads.length,3);
assert.ok(entryTreads.every(o=>o.geometry.parameters.depth>o.geometry.parameters.width*4),'Tread lengths run east-west, with ascent along north-south');
assert.ok(Math.abs(supportY(HX-2.7,5.2,.075)-.075)<.001,'Old front slab does not fill the lower entry pocket');
assert.ok(collision(HX-2.9,4.47,.79),'Stand blocker follows it onto the platform');
houseRoute('Four steps from the grey court floor to the God room gate',[[0,5.15],[0,6.5]],.075,.07);
checkRoute('Lane to original temple entrance',[[20,-5],[39,-5],[39,3],[39,9]],0,0);
checkRoute('Temple photo shoulder to house entrance',[[23,-3],[23,-5],[HX,-5],[HX,-2]],.051,0);
const sideRoadRoute=[[17,-5],[17.2,1],[17.2,8],[16.9,18],[17.2,27],[17,33.5]];
checkRoute('Small road between home and temple',sideRoadRoute,.051,0);
checkRoute('Small road back to front lane',[...sideRoadRoute].reverse(),.043,0);
for(const [x,z] of [[17.2,1],[17.2,8],[16.9,18],[17.2,27]]){
  const roadRay=new THREE.Raycaster(new THREE.Vector3(x,.35,z),new THREE.Vector3(0,-1,0));
  assert.equal(roadRay.intersectObject(landscape,true)[0]?.object.name,'Dirt road between house and temple','The visible dirt surface must face upwards');
}
const outsideStairRoute=[[17.0,10.7],[18.02,10.7],[18.02,11.65],[18.02,16.7],[18.02,18.6]];
checkRoute('Temple exterior stair from side road',outsideStairRoute,.043,0);
checkRoute('Temple exterior stair back to side road',[...outsideStairRoute].reverse(),3.46,0);
const galleryRoute=[[39,3],[44.6,3],[44.6,1.35],[46.18,1.35],[46.18,5.72],[44.8,5.72],[39,5.4]];
checkRoute('Temple entrance to upper gallery',galleryRoute,.20,.19);
checkRoute('Temple gallery return to entrance',[...galleryRoute].reverse(),4.08,.19);
for(const x of [33.4,44.6]){
  const route=[[39,3],[x,3],[x,4.4]];
  checkRoute('Entrance rear marble ledge ascent '+x,route,.20,.19);
  assert.equal(routes.at(-1).finalHeight,.85,'Two risers reach the rear marble ledge');
  checkRoute('Entrance rear marble ledge descent '+x,[...route].reverse(),.85,.19);
  assert.equal(routes.at(-1).finalHeight,.20,'Both rear ledges return to the entrance passage');
}
checkRoute('Lane to adjacent building stair',[[8,-5],[59.9,-5],[62.5,-5]],.051,0);
checkRoute('Adjacent hall rear dais ascent',[[62.1,-5],[64.9,-5],[64.9,-1]],2.82,2.81);
checkRoute('Adjacent hall rear dais descent',[[64.9,-1],[64.9,-5],[62.1,-5]],3.42,2.81);
for(const [x,z,height] of [[62.1,-1,2.82],[64.9,-1,3.42],[64.9,-9,3.42]]){
  const hit=new THREE.Raycaster(new THREE.Vector3(x,5.8,z),new THREE.Vector3(0,-1,0)).intersectObject(landscape,true)[0];
  assert.ok(hit&&Math.abs(hit.point.y-height)<.015,'Hall floor/dais mesh has the expected rise');
  assert.ok(Math.abs(hit.point.y-supportY(x,z,height))<.015,'Dais walking support agrees with its visible floor');
}
checkRoute('Pavilion entry from raised bank',[[34,-37.4],[34,-32]],1.38,-1.28);
checkRoute('Pavilion return to raised bank',[[34,-32],[34,-37.4]],-1.27,-1.28);
// West bank: in through the parapet gap, down the north flight along the face, across the landing.
for(const [name,points,high] of [['West bank',[[-5.7,-18.4],[-4.45,-18.4],[-4.45,-21.5],[-2.4,-21.5]],.055],['East bank',[[50.4,-22.15],[47.65,-22.15]],.055],['Far corner',[[-2.3,-37.4],[-2.3,-32.43]],1.38]]){checkRoute(name+' descent',points,high,-1.56);checkRoute(name+' ascent',[...points].reverse(),-1.55,-1.56);}
checkRoute('House front to the lake verge',[[0,-5],[0,-7.4]],.051,0);
// User's note: no opening from the lane to the gate landing; the lower bank is reached from
// the bathing arcade stair and the gate landing only from below.
assert.ok(collision(15.2,-8.3,.055),'Lane-side run closes the old gate opening');
const bathingRoute=[[30.7,-9.65],[27.5,-9.65],[19.3,-9.65],[16.4,-9.65],[15.2,-9.65]];
checkRoute('Arcade stair down to the gate landing',bathingRoute,.065,-1.56);
checkRoute('Gate landing back up to the arcade',[...bathingRoute].reverse(),.051,-1.56);
assert.equal(supportY(23,-9.65,-1.55),-1.55,'The path between stairs stays down at the lower bank level');
checkRoute('Road away from the house',[[-7,-5],[-24,-5.3],[-35,-5.8],[-43,-7.1]],.051,0);
checkRoute('Downhill return to the house',[[-43,-7.1],[-35,-5.8],[-24,-5.3],[-7,-5]],1.71,0);
houseRoute('Photo-correct front stair',[[-13.3,.95],[-7.93,.95],[-2.65,.95]]);
const circuitRoute=[[39,8.2],[39,9.5],[45,9.9],[49.9,13.8],[49.9,18.5],[50,25.6],[51.8,40.2],[40,40.5],[27.7,40.5],[27.86,22],[27.86,14],[33,13],[34.8,10.1],[36.7,9.95],[38,9.4],[39,8.2]];
// The expanded ranges must leave genuinely wider passages, with continuous
// paving/roofs and matching walkable surfaces, while the inner shrine stays fixed.
const shrinePlatform=new THREE.Box3().setFromObject(temple.getObjectByName('Old inner shrine black stone platform'));
for(const [x,dx,minimum] of [[48.9,1,6.0],[30.5,-1,5.0]]){
  const hit=new THREE.Raycaster(new THREE.Vector3(x,.32,25),new THREE.Vector3(dx,0,0)).intersectObject(temple,true)[0];
  assert.ok(hit?.object.name.startsWith('Outer circuit'),'Passage ends at its veranda plinth');
  const width=dx>0?hit.point.x-shrinePlatform.max.x:shrinePlatform.min.x-hit.point.x;
  assert.ok(width>minimum,`Photographed side passage is broad: ${width} m`);
}
const rearWall=new THREE.Box3().setFromObject(temple.getObjectByName('Rear circuit weathered white wall'));
assert.ok(rearWall.min.z>45.2,'Rear range is 7.5 m farther from the inner shrine');
for(const [x,z] of [[23.2,44],[40,44],[57.2,44],[55.8,34],[23.6,34]]){
  assert.ok(Math.abs(supportY(x,z,.6)-.6)<.001,'Expanded range has a continuous raised walkway');
  const roof=new THREE.Raycaster(new THREE.Vector3(x,3.2,z),new THREE.Vector3(0,1,0),0,1).intersectObject(temple,true)[0];
  assert.ok(roof&&/soffit/.test(roof.object.name),'Expanded range has a roof over its walkway');
}
assert.ok(!collision(58.8,40,.1),'East range remains clear of the garden boundary');
checkRoute('Complete outer temple circuit',circuitRoute,.1,.09);
checkRoute('Complete outer circuit in reverse',[...circuitRoute].reverse(),.1,.09);
checkRoute('Circuit to blue shrine veranda',[[53,16.2],[56.5,16.2]],.1,.09);
// 15.02.23: the blue east porch is climbed by a mounting block whose steps descend sideways, and
// the stair bay beside it by three court steps; the porch piers reach its slab at 4.6 m.
checkRoute('East porch mounting block',[[53.75,11.25],[53.75,9.7],[56.2,9.7]],.1,.09);
assert.ok(Math.abs(routes.at(-1).finalHeight-.95)<.02,'Mounting block leads onto the porch floor');
checkRoute('East stair bay court steps',[[53.6,12.6],[55.25,12.6]],.1,.09);
// 15.13.03: the inner building's steps lie inside a cut in its plinth; nothing projects into the court.
checkRoute('Court into the inner building',[[39,13.6],[39,20.2]],.1,.09);
assert.ok(Math.abs(routes.at(-1).finalHeight-.55)<.03,'Inner door steps lead up to the aisle floor');
assert.ok(!K.ramps.some(r=>Math.abs(r.x-39)<.5&&r.z<15.1&&r.z>13.5),'No stair projects into the court in front of the inner door');
// 15.08.42 / 'temple inner sanctum, left side': both inner aisles are about 3 m wide and walkable.
checkRoute('Inner west aisle',[[39,20.2],[35.2,20.2],[35.2,27.8]],.55,.5);
checkRoute('Inner east aisle',[[39,20.2],[42.8,20.2],[42.8,27.8]],.55,.5);
assert.ok(collision(54.55,8.6,.1)&&collision(54.55,11.2,.1),'The rubble plinth is unbroken either side of the block');
{const pier=new THREE.Box3();for(const o of temple.children)if(o.name==='Outer entrance shrine tall pale blue pier blue shaft')pier.expandByObject(o);
 const fascia=new THREE.Box3();temple.traverse(o=>{if(o.name==='Outer circuit red roof fascia'&&o.getWorldPosition(new THREE.Vector3()).x>50)fascia.expandByObject(o);});
 assert.ok(pier.max.y>fascia.max.y+.9,'Porch piers stand about a metre above the veranda fascia');}
// 15.11.17 / 15.11.08: the plinth is unbroken in front of the open stair bay, so the rear veranda
// is climbed by its east flight; the grey block at the closed blue gate is only a standing step.
checkRoute('Circuit rear veranda stair',[[53.6,41.3],[53.6,43.15]],.1,.09);
assert.ok(!K.ramps.some(r=>Math.abs(r.x-31.1)<.8&&Math.abs(r.z-42.25)<.8),'No flight in front of the open stair bay');
assert.ok(!temple.getObjectByName('Rear right dome pavilion white room'),'Unsupported room over the west passage is removed');
// User's note with 15.11.17: the rear stair climbs straight back inside the open bay, not sideways.
assert.ok(!K.ramps.some(r=>r.axis&&r.axis.includes('x')&&r.x>30&&r.x<35&&Math.abs(r.z-44.45)<.2),'No sideways rear stair');
const domeBase=new THREE.Box3().setFromObject(temple.getObjectByName('Rear dome square roof base'));
const upperRoof=new THREE.Box3().setFromObject(temple.getObjectByName('Rear upper storey flat slab'));
assert.ok(domeBase.min.z>=upperRoof.min.z&&domeBase.max.z<=upperRoof.max.z&&domeBase.min.y<=upperRoof.max.y,'Dome sits on the rear upper roof');
// Rear west facade and colonnade follow the independent 15.11.08 / 15.11.17 views.
assert.equal(temple.children.filter(o=>o.name==='Rear west paired upright stone').length,2,'Both unequal marker stones are present');
assert.ok(temple.getObjectByName('Rear west enclosed white facade'),'Door/window bay is enclosed');
assert.ok(temple.getObjectByName('Rear west blue louvred window frame'),'Rear bay includes its closed louvred window (15.11.17)');
{const gate=new THREE.Box3();for(const o of temple.children)if(/^Rear west gate /.test(o.name)&&!/step|room/.test(o.name))gate.expandByObject(o);
 assert.ok(gate.min.x<26.9&&gate.max.x>29.4,'Gate and its side lights fill the bay up to the blue pier, with no wall left of it (15.11.08 note)');
 const jali=new THREE.Box3().setFromObject(temple.getObjectByName('Rear upper storey pierced jali panel'));
 assert.ok(Math.abs((jali.min.x+jali.max.x)/2-(gate.min.x+gate.max.x)/2)<.15,'Jali stands over the gate bay');}
assert.ok(temple.getObjectByName('West veranda blue scalloped bay'),'West aisle has scalloped openings');
assert.ok(temple.getObjectByName('West veranda pierced parapet'),'West parapet has real openings');
for(const x of [24.9,25.75])assert.ok(collision(x,42.51,.1),'Paired marker stones have matching blockers');
assert.ok(!K.ramps.some(r=>r.x<28&&r.x>24&&Math.abs(r.z-22)<.01),'Unsupported near west-veranda access stair is removed');
// Test physical meshes above the route, not only the authored wall colliders.
for(let j=1;j<circuitRoute.length;j++){
  const a=circuitRoute[j-1],b=circuitRoute[j],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.16);
  for(let i=0;i<=n;i++){
    const t=i/n,point=new THREE.Vector3(a[0]+(b[0]-a[0])*t,.18,a[1]+(b[1]-a[1])*t);
    const ray=new THREE.Raycaster(point,new THREE.Vector3(0,1,0),0,1.75);
    assert.equal(ray.intersectObjects([temple,landscape],true).length,0,`Outer circuit physical head clearance at ${point.toArray()}`);
  }
}
const outerKeys=['templeoldwall','templeoutershrines','templeouterrear','templeouterreturn'];
for(const key of outerKeys){const p=photos[key].p;assert.ok(!collision(p[0],p[2],p[1]),key+' photo camera clear');assert.equal(supportY(p[0],p[2],.1),.1,key+' photo on courtyard paving');}
const aisleEye=new THREE.Vector3(...[49.9,.1,18.5]).add(new THREE.Vector3(0,1.62,0));
const aisleRay=new THREE.Raycaster(aisleEye,new THREE.Vector3(51.8,.85,24.24).sub(aisleEye).normalize());
assert.equal(aisleRay.intersectObject(temple,true)[0]?.object.name,'Rounded courtyard marker stone','Standing stone must be visible along the circuit');
const shrineEye=new THREE.Vector3(...photos.templeoutershrines.p).add(new THREE.Vector3(0,1.62,0));
for(const z of [37.3,39.78,42.26]){
  const ray=new THREE.Raycaster(shrineEye,new THREE.Vector3(55.95,2.16,z).sub(shrineEye).normalize());
  assert.match(ray.intersectObject(temple,true)[0]?.object.name??'',/^Outer shrine (carved naga stone|blue painted recess)$/,'All three shrine niches must be visible');
}
// The new viewpoint must look into the house, see the actual gate and remain
// outside collision geometry. Use rays to catch foreground walls hiding it.
const god=photos.godroom;
const godEye=new THREE.Vector3(god.p[0],god.p[1]+1.62,god.p[2]);
assert.ok(god.p[2]>4.1&&god.p[2]<5.4,'God room viewpoint belongs in the entry hall');
assert.ok(!collision(god.p[0],god.p[2],god.p[1]),'God room photo camera must be clear');
for(const x of [-.395,.395]){
  const target=HV(x,2.305,6.83),ray=new THREE.Raycaster(godEye,target.sub(godEye).normalize());
  const hits=ray.intersectObject(house,true);
  assert.ok(hits.length&&hits[0].object.name.startsWith('God room gate'),`Gate must be visible from photo camera; got ${hits[0]?.object.name}`);
}
assert.ok(collision(HX,6.92,1.08),'Closed gate must stop walking');
for(const z of [5.86,6.22,6.58]){
  const ray=new THREE.Raycaster(HV(0,2,z),new THREE.Vector3(0,-1,0));
  assert.equal(ray.intersectObject(house,true)[0]?.object.name,'God room red stair tread','The pale riser must not cover its red tread');
}
const photoCamera=new THREE.PerspectiveCamera(god.fov,4/3,.06,400);photoCamera.position.copy(godEye);photoCamera.lookAt(new THREE.Vector3(...god.target));photoCamera.updateMatrixWorld();
for(const x of [-2.25,2.25]){
  const projected=HV(x,2.12,6.5).project(photoCamera);
  assert.ok(Math.abs(projected.x)<1&&Math.abs(projected.y)<1,'Photo framing must include both heavy posts');
}
// Both front-road cameras must be clear, with the tank to the left and the
// neighboring building ahead. The temple keeps its original world orientation.
assert.equal(temple.rotation.y,0,'Temple orientation must remain unchanged');
assert.deepEqual(temple.position.toArray(),[0,0,0],'Temple position must remain unchanged');
for(const key of ['laneleft','laneright']){
  const photo=photos[key];assert.ok(!collision(photo.p[0],photo.p[2],photo.p[1]),key+' camera must be clear');
}
const laneCamera=new THREE.PerspectiveCamera(photos.laneleft.fov,4/3,.06,400);
laneCamera.position.set(photos.laneleft.p[0],photos.laneleft.p[1]+1.62,photos.laneleft.p[2]);laneCamera.lookAt(new THREE.Vector3(...photos.laneleft.target));laneCamera.updateMatrixWorld();
assert.ok(new THREE.Vector3(16,0,-12).project(laneCamera).x<0,'Tank must appear on the left');
const adjacentCenter=new THREE.Vector3(60,4.4,-5).project(laneCamera);
assert.ok(Math.abs(adjacentCenter.x)<.1,'Adjacent facade belongs ahead down the road');
const forward=new THREE.Vector3(...photos.laneleft.target).sub(new THREE.Vector3(...photos.laneleft.p)).normalize();
const backward=new THREE.Vector3(...photos.laneright.target).sub(new THREE.Vector3(...photos.laneright.p)).normalize();
assert.ok(forward.dot(backward)<-.98,'The two road views must look in opposite directions');
// Family identifies these as upper-floor views across the inner courtyard.
for(const key of ['templeleft','templecenter','templeright']){
  const photo=photos[key];assert.equal(supportY(photo.p[0],photo.p[2],4.08),4.08);
  assert.ok(!collision(photo.p[0],photo.p[2],photo.p[1]),key+' camera is clear');
  assert.ok(photo.target[2]>photo.p[2]+8,key+' looks into the temple');
}
const templeCamera=new THREE.PerspectiveCamera(photos.templecenter.fov,4/3,.06,400);
const templeEye=new THREE.Vector3(39,5.7,7.9);templeCamera.position.copy(templeEye);templeCamera.lookAt(new THREE.Vector3(...photos.templecenter.target));templeCamera.updateMatrixWorld();
const lampPosition=temple.getObjectByName('Lamp stone foot').position.clone();
assert.ok(Math.abs(lampPosition.clone().setY(4).project(templeCamera).x)<.18,'Gallery view places the lamp near the doorway axis');
const flagPosition=temple.getObjectByName('Flagstaff stone foot').position.clone();
assert.ok(flagPosition.clone().setY(4).project(templeCamera).x>0,'Pink pillar is on photo-right');
assert.ok(flagPosition.z-lampPosition.z>1.5&&lampPosition.x-flagPosition.x>1,'Poles remain staggered, pink behind and right of black');
{const c=new THREE.PerspectiveCamera(48,4/3,.06,400);c.position.set(39.0585,1.82,-.8753);c.quaternion.set(.00007123,.99989968,-.01307484,.00544731);c.updateMatrixWorld();
 assert.ok(Math.abs(lampPosition.clone().setY(2).project(c).x)<.07,'Entry photo frames the lamp within the doorway');}
assert.ok(collision(lampPosition.x,lampPosition.z,.1),'Relocated lamp base blocks walking');
assert.ok(!collision(40.3,10.5,.1),'Old lamp position is clear');
// The deep service porch has a usable inner step and a genuinely open west
// arch. Neither the old portico wall nor the street-front block may fill it.
for(const [x,z,y] of [[26.8,7.1,.613],[26.8,5.7,.823],[25.5,5.7,.823],[24.94,7.1,.613]]){
  assert.ok(Math.abs(supportY(x,z,y)-y)<.015,'Service porch floors support both levels and the hall connection');
  assert.ok(!collision(x,z,y),'Service porch interior is clear');
}
assert.ok(collision(26.8,4.9,.823),'Service porch rear wall stays closed');
// User's 180635 / 180653: raised red chair hall beside a lower grey passage.
assert.ok(Math.abs(supportY(23.2,11.4,.6)-.6)<.001,'Chair hall remains raised');
assert.ok(Math.abs(supportY(25.8,11.4,.6)-.112)<.001,'Outer hall passage is lower than the chair floor');
const hallGlazing=temple.children.filter(o=>o.name==='Covered hall pale translucent window glazing');
assert.equal(hallGlazing.length,2,'Two high windows flank the central wall');
for(const z of [9.3,12.9]){
  const hit=new THREE.Raycaster(new THREE.Vector3(23.7,2.65,z),new THREE.Vector3(-1,0,0)).intersectObject(temple,true)[0];
  assert.equal(hit?.object.name,'Covered hall pale translucent window glazing','Window opening is exposed between real wall piers');
}
{const hit=new THREE.Raycaster(new THREE.Vector3(23.7,2.5,10.8),new THREE.Vector3(-1,0,0)).intersectObject(temple,true)[0];
 assert.equal(hit?.object.name,'Covered hall lane-side wall pier','The old middle window is solid wall');}
checkRoute('Lower chair hall passage',[[29.2,11],[25.8,11],[25.8,15.5]],.1,.09);
// 15.11.00 / 15.10.30 / '-45 degrees': the hall's lane wall has a real doorway with a barred transom,
// open to look through and closed to walking, and a narrow window beyond it.
{const through=new THREE.Raycaster(new THREE.Vector3(22.5,1.8,6.725),new THREE.Vector3(-1,0,0),0,3.2).intersectObject(temple,true)[0];
 assert.ok(!through,'Lane doorway is a real opening, got '+through?.object.name);
 const wall=new THREE.Raycaster(new THREE.Vector3(22.5,1.8,5.6),new THREE.Vector3(-1,0,0),0,3.2).intersectObject(temple,true)[0];
 assert.ok(/blue wall face|lane-side wall/.test(wall?.object.name||''),'Wall beside the lane doorway is solid, got '+wall?.object.name);
 assert.ok(collision(20.3,6.725,.6),'Lane doorway stays closed to walking');
 assert.ok(temple.getObjectByName('Covered hall lane doorway transom timber bar')&&temple.getObjectByName('Covered hall narrow window pale glazing'),'Transom and narrow window are present');}
checkRoute('Chair platform access',[[25.8,9.8],[23.7,9.8]],.112,.10);
checkRoute('Chair platform descent',[[23.7,9.8],[25.8,9.8]],.6,.10);
checkRoute('Lower hall to service porch',[[26.8,9.1],[26.8,7.1]],.112,.10);
checkRoute('Service porch to lower hall',[[26.8,7.1],[26.8,9.1]],.613,.10);
checkRoute('Chair hall to recessed bay',[[23.7,7.1],[26.8,7.1]],.6,.10);
checkRoute('Recessed bay to chair hall',[[26.8,7.1],[23.7,7.1]],.613,.10);
// One connected interior bay replaces the invented arch projecting into the court.
assert.ok(!temple.getObjectByName('Covered hall broad blue corner arch'));
const serviceBounds=new THREE.Box3().setFromObject(temple.getObjectByName('Side bay red oxide platform'));
assert.ok(serviceBounds.max.x<28.5,'Entire blue bay is inside the foreground column line');
assert.ok(serviceBounds.min.x<25.2,'Blue bay reaches the chair-hall side');
const stairThreshold=temple.getObjectByName('Stair door threshold');
assert.ok(Math.abs(stairThreshold.position.x-34.475)<1e-6&&Math.abs(stairThreshold.position.z-7.55)<1e-6,'Correct central door remains fixed');
const plainWall=temple.children.filter(o=>o.name==='Stair door white wall').map(o=>new THREE.Box3().setFromObject(o));
assert.ok(plainWall.some(b=>b.min.x<31&&b.max.x>33.999),'Plain white wall extends left of the fixed door');
const tulsi=temple.getObjectByName('Tulsi red pedestal');
assert.ok(tulsi.position.z<9&&tulsi.position.x<31.8,'Tulsi leaves more space in the entrance court');
assert.ok(collision(tulsi.position.x,tulsi.position.z,.1),'Tulsi blocker follows its new placement');
assert.ok(!collision(31.8,10.2,.1),'Old Tulsi footprint is open');
const entryCamera=new THREE.PerspectiveCamera(48,4/3,.06,400);
entryCamera.position.set(37.124778231,1.665792075,8.243268529);
entryCamera.quaternion.set(.0070964009,.8387724994,-.0109351129,.5443259673);entryCamera.updateMatrixWorld();
const tulsiScreen=tulsi.position.clone().project(entryCamera);
assert.ok(tulsiScreen.x>.45&&tulsiScreen.x<.9,'Entrance reference places Tulsi in the right part of the view');
assert.ok(temple.getObjectByName('Side bay raised rolling shutter'),'Service opening follows the selected 2013 reference');

{const ray=new THREE.Raycaster(new THREE.Vector3(24.7,1.8,6.8),new THREE.Vector3(1,0,0)),hit=ray.intersectObject(temple,true)[0];
 assert.equal(hit?.object?.name,'Service bay east return wall','West scalloped opening sees through the porch');}
{const eye=new THREE.Vector3(33.4548,1.8415,14.5196),target=new THREE.Vector3(25.5,1.8,4.9);
 const hit=new THREE.Raycaster(eye,target.sub(eye).normalize()).intersectObject(temple,true)[0];
 assert.equal(hit?.object?.name,'Courtyard left service bay blue back','Street-front mass does not intersect the porch');}
const largeBell=temple.getObjectByName('Great bronze temple bell');
const bellBounds=new THREE.Box3().setFromObject(largeBell),bellSize=bellBounds.getSize(new THREE.Vector3());
assert.ok(bellSize.y>1.2&&bellSize.x>1.1,'The great bell has its full-size flared body');
// 15.10.34 / 15.02.27 / 15.03.51: two red tread blocks lead to a thick marble
// platform, with a dense carved course and a genuinely lower central passage.
const porticoPlatforms=temple.children.filter(o=>o.name==='Courtyard portico raised marble platform');
assert.equal(porticoPlatforms.length,2);
for(const o of porticoPlatforms){
  const b=new THREE.Box3().setFromObject(o),x=o.position.x;
  assert.ok(Math.abs(b.min.y-.70)<1e-6&&Math.abs(b.max.y-.85)<1e-6,'Portico has a .15 m marble slab');
  assert.ok(Math.abs(b.max.z-8.83)<1e-5,'Marble slab follows the owner-confirmed deeper bell bay');
  const core=temple.children.find(q=>q.name==='Courtyard portico masonry core'&&Math.abs(q.position.x-x)<.01),cb=new THREE.Box3().setFromObject(core);
  assert.ok(Math.abs(cb.min.y-.1)<1e-6&&Math.abs(cb.max.y-b.min.y)<1e-6,'Filled platform stands on the court and meets its slab');
  assert.ok(Math.abs(cb.max.z-b.max.z)<1e-6,'Platform core stretches with its slab');
  for(const z of [6.198,6.202])assert.ok(Math.abs(supportY(x,z,.85)-.85)<1e-6,'Marble slabs meet the entrance ledge without a floor seam');
  assert.ok(Math.abs(supportY(x,8.75,.85)-.85)<1e-6,'Raised portico has matching walking support');
  const panels=temple.children.filter(q=>q.name==='Courtyard portico inset relief panel'&&Math.abs(q.position.x-x)<(b.max.x-b.min.x)/2+.01).sort((a,b)=>a.position.x-b.position.x);
  assert.equal(panels.length,x<39?7:19,'Dense frieze replaces sparse large panels');
  for(let i=1;i<panels.length;i++)assert.ok(panels[i].position.x-panels[i-1].position.x<=.401,'Frieze panels have at most .4 m pitch');
}
for(const x of [36.15,46.55]){
  for(const [z,top] of [[9.47,.35],[9.19,.60],[9.0,.85]]){
    const hit=new THREE.Raycaster(new THREE.Vector3(x,1.9,z),new THREE.Vector3(0,-1,0)).intersectObject(temple,true)[0];
    assert.ok(hit?.object.name.startsWith('Courtyard portico side access tread'),'Two red treads and final marble tread are exposed');
    assert.ok(Math.abs(hit.point.y-top)<1e-6,'Physical portico rises are .25 m, below the native .36 m limit');
    assert.ok(Math.abs(supportY(x,z,top)-top)<1e-6,'Every tread has matching navigation support');
  }
  checkRoute('Court onto portico '+x,[[x,9.9],[x,8.78]],.1,.09);
  assert.ok(Math.abs(routes.at(-1).finalHeight-.85)<1e-6,'Portico steps reach the marble platform');
  checkRoute('Portico down to court '+x,[[x,8.78],[x,9.9]],.85,.09);
}
checkRoute('Court to stair-door threshold',[[34.475,9.0],[34.475,7.78]],.1,.01);
assert.ok(Math.abs(routes.at(-1).finalHeight-.85)<1e-6,'Blue door threshold is level with the marble platform');
checkRoute('Stair-door threshold to court',[[34.475,7.78],[34.475,9.0]],.85,.01);
checkRoute('Low central portico passage',[[39,5.5],[39,9.9]],.2,.09);
assert.ok(supportY(39,8.5,.2)<.21,'Centre passage stays lower than both marble platforms');
assert.ok(blockedRise(36.2,8.1,.1),'Platform cannot be climbed away from its steps');
for(const n of ['Courtyard portico square white pier','Courtyard portico pier red foot','Great bell white suspension pier','Great bell white pier stepped base','Great bell pier red foot','Passage round column carved base block']){
  const objects=temple.children.filter(o=>o.name===n);assert.ok(objects.length>0,n+' is present');
  for(const o of objects)assert.ok(Math.abs(new THREE.Box3().setFromObject(o).min.y-.85)<1e-5,n+' stands on the marble floor');
}
assert.equal(temple.children.filter(o=>o.name==='Great bell white suspension pier').length,1,'Owner-confirmed single rear bell pier is preserved');
const bellBeamBounds=new THREE.Box3().setFromObject(temple.getObjectByName('Great bell heavy timber suspension beam'));
assert.ok(Math.abs(bellBeamBounds.min.y-3.265)<1e-5,'Large bell suspension beam stays fixed');
for(const n of ['Great bronze temple bell crown','Great bell bronze suspension handle','Great bell rope binding'])for(const o of temple.children.filter(o=>o.name===n)){
  assert.ok(bellBeamBounds.min.y-new THREE.Box3().setFromObject(o).max.y>.15,'Lifted bell hardware clears the suspension beam');
}
const pullBounds=new THREE.Box3().setFromObject(temple.getObjectByName('Great bell looped clapper rope'));
assert.ok(pullBounds.min.y>.91&&pullBounds.min.y<.94,'Bell pull rope clears the raised floor without shortening its hanging loop');
for(const o of temple.children.filter(o=>o.name==='Passage round column capital cap'))assert.ok(Math.abs(new THREE.Box3().setFromObject(o).max.y-3.75)<1e-5,'Shortened round-column bases preserve the ceiling support');
const bellTarget=bellBounds.getCenter(new THREE.Vector3());
for(const key of ['templebellreturn','templebellwide','templepoles','templebell']){
  const view=authored(new Function('return ('+main.match(new RegExp('destinations\\.'+key+'=(\\{.*\\});'))[1]+')')());
  assert.ok(!collision(view.p[0],view.p[2],view.p[1]),key+' viewpoint is walkable');
  const eye=new THREE.Vector3(...view.p).add(new THREE.Vector3(0,1.62,0));
  const c=new THREE.PerspectiveCamera(view.fov,4/3,.06,400);c.position.copy(eye);c.lookAt(new THREE.Vector3(...view.target));c.updateMatrixWorld();
  if(key==='templepoles'){
    const black=lampPosition.clone().setY(1).project(c),pink=flagPosition.clone().setY(1).project(c);
    assert.ok(pink.x<black.x&&pink.x>-1&&black.x<1,'Side view shows pink left, black right');
  }else{
    const hit=new THREE.Raycaster(eye,bellTarget.clone().sub(eye).normalize()).intersectObject(temple,true)[0];
    assert.equal(hit?.object?.uuid,largeBell.uuid,key+' must see the great bell through its bay; hit '+hit?.object?.name);
    const frame=bellTarget.clone().project(c);assert.ok(Math.abs(frame.x)<1&&Math.abs(frame.y)<1,key+' frames the great bell');
  }
}

for(const x of [33.65,44.35]){
  const from=new THREE.Vector3(x,5.7,7.9),target=new THREE.Vector3(x,1.40,16.25),ray=new THREE.Raycaster(from,target.sub(from).normalize()); // from the balcony rail, now over the portico
  const hit=ray.intersectObject(temple,true)[0];
  assert.ok(hit?.object.name.startsWith('Inner blue window')||hit?.object.name==='Inner window white bars',`Gallery must see facade windows, got ${hit?.object.name}`);
}
const rightEye=new THREE.Vector3(...photos.templeright.p).add(new THREE.Vector3(0,1.62,0));
const rightHallTarget=new THREE.Vector3(22.97,5.59,17.5);
const rightHallRay=new THREE.Raycaster(rightEye,rightHallTarget.sub(rightEye).normalize());
const rightHallHit=rightHallRay.intersectObjects([temple,landscape],true)[0];
assert.ok(rightHallHit?.object.name.startsWith('Right hall'),`Right photo must see the side hall, got ${rightHallHit?.object.name}`);
const roadPhoto=photos.templeroad,roadEye=new THREE.Vector3(...roadPhoto.p).add(new THREE.Vector3(0,1.62,0));
const roadCamera=new THREE.PerspectiveCamera(roadPhoto.fov,4/3,.06,400);roadCamera.position.copy(roadEye);roadCamera.lookAt(new THREE.Vector3(...roadPhoto.target));roadCamera.updateMatrixWorld();
assert.ok(new THREE.Vector3(22.95,1.6,1.27).project(roadCamera).x<0,'Temple edge belongs on photo-left');
assert.ok(new THREE.Vector3(13.75,.87,7.2).project(roadCamera).x>0,'Roadside taps belong on photo-right');
const tapRay=new THREE.Raycaster(new THREE.Vector3(16.5,.69,7.2),new THREE.Vector3(-1,0,0));
assert.equal(tapRay.intersectObjects([house,temple,landscape],true)[0]?.object.name,'Temple road tap stone back','Taps must remain exposed to the side road');
assert.ok(!collision(roadPhoto.p[0],roadPhoto.p[2],roadPhoto.p[1]),'Road viewpoint is clear');
const shutterRay=new THREE.Raycaster(roadEye,new THREE.Vector3(22.95,1.6,1.27).sub(roadEye).normalize());
assert.ok(shutterRay.intersectObjects([temple,house,landscape],true)[0]?.object.name.startsWith('Temple road'),'Temple corner is visible from road viewpoint');
// The family identifies 14.59.36 as looking right from the temple towards home.
// Check framing and actual visibility, including any intervening scene objects.
const homePhoto=photos.templehouse,homeEye=new THREE.Vector3(...homePhoto.p).add(new THREE.Vector3(0,1.62,0));
const homeCamera=new THREE.PerspectiveCamera(homePhoto.fov,4/3,.06,400);homeCamera.position.copy(homeEye);homeCamera.lookAt(new THREE.Vector3(...homePhoto.target));homeCamera.updateMatrixWorld();
assert.ok(homeCamera.getWorldDirection(new THREE.Vector3()).x<-.98,'Temple-to-house camera must face home along -X');
assert.ok(!collision(homePhoto.p[0],homePhoto.p[2],homePhoto.p[1]),'Temple-to-house camera is clear');
assert.ok(new THREE.Vector3(16.49,1.1,1.5).project(homeCamera).x<0,'White house end must appear on the left');
assert.ok(new THREE.Vector3(13.55,.78,-11.3).project(homeCamera).x>0,'Lake boundary must appear on the right');
for(const [point,prefix] of [
  [[16.49,1.1,1.5],'Temple-facing block closed timber door'],
  [[7.68,.76,-2.35],'Hatchback'],
  [[16.49,1.9,3.6],'Blue tarp'],
]){
  const ray=new THREE.Raycaster(homeEye,new THREE.Vector3(...point).sub(homeEye).normalize());
  const hit=ray.intersectObjects([house,temple,landscape],true)[0];
  assert.ok(hit?.object.name.startsWith(prefix),`${prefix} must be visible from new photo camera, got ${hit?.object.name}`);
}
// Mesh rays, not just navigation colliders, detect a ceiling slab left in the stairwell.
for(let z=1.35;z<=5.72;z+=.10){
  const height=.6+(z-1.06)/4.86*3.48;
  const ray=new THREE.Raycaster(new THREE.Vector3(46.18,height+.24,z),new THREE.Vector3(0,1,0),0,1.50);
  assert.equal(ray.intersectObject(temple,true).length,0,'Gallery stair must have physical head clearance');
}
const tour=createPhotoTour(photos,supportY,HX,K.templeShiftZ),tourProblems=[];
assert.ok(Number.isFinite(tour.duration)&&tour.duration>0,'Tour duration follows its route');
assert.equal(tour.points[0].photo,'house','A visitor starts at the house');
const ordered=['godroom','courtyard','temple','templeouterrear','templeleft','templeacross','lakehouse'];
let previous=-1;for(const key of ordered){const i=tour.points.findIndex(p=>p.photo===key);assert.ok(i>previous,'Visitor itinerary order: '+key);previous=i;}
// The house leg must wrap the God room, rather than loop around the side veranda.
const houseLeg=tour.points.slice(tour.points.findIndex(p=>p.photo==='godroom'),tour.points.findIndex(p=>p.label==='Leaving the house')+1);
const around=houseLeg.map(p=>[p.p[0]-HX,p.p[2]]);
let winding=0;for(let i=0;i<around.length;i++){
  const a=around[i],b=around[(i+1)%around.length];
  const aa=Math.atan2(a[1]-8.5,a[0]),bb=Math.atan2(b[1]-8.5,b[0]);
  winding+=Math.atan2(Math.sin(bb-aa),Math.cos(bb-aa));
}
assert.ok(Math.abs(Math.abs(winding)-2*Math.PI)<1e-6,'House tour makes one complete circuit around the God room');
assert.ok(houseLeg.every(p=>p.p[0]-HX>-6&&p.p[0]-HX<6),'House circuit stays close to the God room');
assert.ok(tour.points.some(p=>p.label==='Behind the sanctum'),'Circle the inner sanctum');
assert.ok(tour.points.some(p=>p.label==='Descending the gallery stair'),'Return via the stair');
assert.ok(tour.points.every(p=>!(p.p[0]>14.6&&p.p[0]<21&&p.p[2]>0)),'Skip travel down the mud road');
let collisionSamples=0;
for(const span of tour.spans){
  assert.ok(span.travel>0&&span.hold>=0);
  // Sample the actual camera path every <= 5 cm, independent of tour speed.
  const distance=new THREE.Vector3(...span.a.p).distanceTo(new THREE.Vector3(...span.b.p));
  const steps=Math.max(1,Math.ceil(distance*1.5/.05));
  for(let i=0;i<=steps;i++){
    const t=span.start+span.hold+span.travel*i/steps,smp=tour.sample(t),p=smp.position,eye=smp.floorEye;
    collisionSamples++;
    const hit=K.colliders.find(c=>p.x+.12>c.minX&&p.x-.12<c.maxX&&p.z+.12>c.minZ&&p.z-.12<c.maxZ&&p.y+.12>c.bottom&&p.y-1.50<c.top);
    if(hit)tourProblems.push({t,position:p.toArray(),hit});
    assert.ok(p.y>1.60&&p.y<5.9,'Tour stays at walking height on the dry route');
    if(Math.abs(eye-1.62-supportY(p.x,p.z,eye-1.62))>=.015||Math.abs(p.y-eye)>.9)tourProblems.push({t,position:p.toArray(),hit:'Unsupported: '+supportY(p.x,p.z,eye-1.62)});
  }
  if(span.a.photo){
    assert.ok(span.start+span.hold<tour.duration,'Every tour photograph must be visited before the loop repeats');
    assert.ok(span.hold>0&&span.hold<=1,'Brief pauses at photographic views');
  }
}
assert.ok(tour.sample(tour.duration).position.distanceTo(tour.sample(0).position)<1e-9,'The tour must loop continuously');
// User's request: an opening flight from the 15.26.12 far-bank view to the lane before the
// house, joining the loop at 'Along the lane' without a jump and without passing through anything.
{const intro=tour.intro,lane=tour.spans.find(s=>s.a.label==='Along the lane');
 assert.ok(intro.duration>5&&intro.sample(0).position.distanceTo(new THREE.Vector3(-12.59,5.6,-42.85))<1e-6,'Tour opens at the far-bank view');
 assert.ok(intro.sample(intro.duration).position.distanceTo(tour.sample(lane.start).position)<.02,'Flight lands where the loop continues');
 assert.ok(intro.sample(intro.duration).quaternion.angleTo(tour.sample(lane.start).quaternion)<.02,'Flight ends facing along the lane');
 for(let t=0;t<=intro.duration;t+=.05){const v=intro.sample(t),p=v.position;
   assert.ok(Object.values(p).every(Number.isFinite),'Flight position is finite');
   const hit=K.colliders.find(c=>p.x+.12>c.minX&&p.x-.12<c.maxX&&p.z+.12>c.minZ&&p.z-.12<c.maxZ&&p.y+.12>c.bottom&&p.y-.3<c.top);
   assert.ok(!hit,'Opening flight clears '+(hit&&JSON.stringify(hit))+' at '+p.toArray().map(v=>v.toFixed(2)));
   assert.ok(p.y>=supportY(p.x,p.z,p.y)+1.6,'Opening flight stays above the ground at '+p.toArray().map(v=>v.toFixed(2)));}}
for(const span of tour.spans){
  const t=span.start;
  for(const join of [t,t+span.hold]){
    const dt=1e-4,center=tour.sample(join).position;
    const before=center.clone().sub(tour.sample(join-dt).position).divideScalar(dt);
    const after=tour.sample(join+dt).position.sub(center).divideScalar(dt);
    before.y=after.y=0;
    assert.ok(before.distanceTo(after)<.02,'Smooth horizontal motion into and out of brief stops');
    assert.ok(tour.sample(join-dt).quaternion.angleTo(tour.sample(join+dt).quaternion)<.001,'No abrupt camera turns');
  }
  assert.equal(tour.sample(t+span.hold+span.travel/2).fov,58,'Keep a steady tour lens');
  if(span.hold){assert.ok(tour.sample(t+.1).position.distanceTo(tour.sample(t+span.hold-.1).position)<1e-8,'Hold the photographic composition briefly');}
}
if(tourProblems.length)console.error(JSON.stringify({tourProblems:tourProblems.filter((p,i,a)=>i===0||JSON.stringify(p.hit)!==JSON.stringify(a[i-1].hit)),total:tourProblems.length}));
assert.equal(tourProblems.length,0,'Tour must not pass through walls or posts');
const checkpoints=tour.points.filter(p=>p.photo).map(p=>p.photo);
for(const key of ['house','godroom','courtyard','temple','templedoor','templeleft','templecenter','templeright','lakeleft','lakemiddle','lakehouse',...outerKeys])assert.ok(checkpoints.includes(key));

// Removed family photos must not survive in the app, tour or downloadable assets.
const html=await fs.readFile(new URL('../dist/index.html',import.meta.url),'utf8');
for(const [key,file] of [['templeouterentry','temple-outer-entry.jpg'],['templeouteraisle','temple-outer-aisle.jpg']]){
  assert.equal(photos[key],undefined);assert.ok(!checkpoints.includes(key));assert.ok(!html.includes('value="'+key+'"'));
  await assert.rejects(fs.access(new URL('../dist/assets/'+file,import.meta.url)),{code:'ENOENT'});
}
const approach=tour.points.findIndex(p=>p.label==='Approaching the house');
assert.equal(tour.points[approach+1].label,'Through the entrance');
assert.equal(tour.points[approach+2].photo,'godroom','Enter directly, without left/right veranda pauses');
for(const p of tour.points.slice(approach,approach+3))assert.equal(p.p[0],HX,'Stay on the central house entry path');
let meshCount=0;house.traverse(o=>{if(o.isMesh){meshCount++;o.geometry.computeBoundingBox();assert.ok(Number.isFinite(o.geometry.boundingBox.min.x)&&Number.isFinite(o.geometry.boundingBox.max.y),o.name);}});
let templeMeshCount=0;temple.traverse(o=>{if(o.isMesh){templeMeshCount++;o.geometry.computeBoundingBox();assert.ok(Number.isFinite(o.geometry.boundingBox.min.x)&&Number.isFinite(o.geometry.boundingBox.max.y),o.name);}});
// The three house-upstairs directions share one real balcony position.
const upperFarther=new Function('return ('+main.match(/destinations\.upperfarther=(\{.*\});/)[1]+')')();
const upperViews=[photos.upperahead,photos.upperright,upperFarther];
const upperCameras=upperViews.map(v=>{const c=new THREE.PerspectiveCamera(v.fov,4/3,.06,400);c.position.set(...v.p).add(new THREE.Vector3(0,1.62,0));c.lookAt(new THREE.Vector3(...v.target));c.updateMatrixWorld();return c;});
for(const v of upperViews){assert.deepEqual(v.p,photos.upperahead.p);assert.ok(!collision(v.p[0],v.p[2],v.p[1]));assert.ok(Math.abs(supportY(v.p[0],v.p[2],v.p[1])-v.p[1])<.01);}
const upperYaw=upperCameras.map(c=>{const d=c.getWorldDirection(new THREE.Vector3());return Math.atan2(d.x,-d.z);});
assert.ok(upperYaw[0]<upperYaw[1]&&upperYaw[1]<upperYaw[2],'Pan steadily right without moving the photographer');
for(const [point,prefix] of [[[-9.45,5.15,-43.057],'Opposite bank hall'],[[10,1.92,-44.31],'Opposite bank low house'],[[25,5.3,-51.72],'Opposite bank pink house']]){
  const ray=new THREE.Raycaster(upperCameras[0].position,new THREE.Vector3(...point).sub(upperCameras[0].position).normalize());
  const hit=ray.intersectObjects([house,landscape,temple],true)[0];assert.ok(hit?.object.name.startsWith(prefix),'Upstairs panorama sees '+prefix+', got '+hit?.object.name);
}
const pavilionMiddle=new THREE.Vector3(34,1,-32).project(upperCameras[1]),pavilionRight=new THREE.Vector3(34,1,-32).project(upperCameras[2]);
assert.ok(pavilionMiddle.x>0&&pavilionMiddle.x<1,'Pavilion lies right in the middle view');
assert.ok(pavilionRight.x<0&&pavilionRight.x>-1,'Pavilion moves left in the far-right view');
const shopUpper=new THREE.Vector3(62,3,-25).project(upperCameras[2]),stageUpper=new THREE.Vector3(60,5,-5).project(upperCameras[2]);
assert.ok(shopUpper.x>pavilionRight.x&&stageUpper.x>shopUpper.x,'Final view orders pavilion, shop, stage');
checkRoute('Opposite-bank path crosses stair landing',[[11.7,-37.4],[14.8,-37.4]],1.38,1.37);
// 14.58.26: two flights along the retaining face meet at a central landing.
checkRoute('Opposite-bank left flight descent',[[9.35,-37.4],[9.35,-35.2675],[13.25,-35.2675],[13.25,-32.63]],1.38,-1.56);
checkRoute('Opposite-bank right flight descent',[[17.25,-37.4],[17.25,-35.2675],[13.25,-35.2675],[13.25,-32.63]],1.38,-1.56);
checkRoute('Opposite-bank flight ascent',[[13.25,-32.63],[13.25,-35.2675],[9.35,-35.2675],[9.35,-37.4]],-1.55,-1.56);
const report={innerRoofReview,laneRoofReview,stageSculptureReview,houseUpperPanorama:{references:['15.30.09','15.30.06','15.30.02'],sameCamera:true,panRight:true,oppositeBuildingsVisible:true,pavilionMovesRightToLeft:true,centralBankStairsAccessible:true},lakeFence:{reference:'14.58.02',heavyRoadsidePiers:true,darkRailsWhitePiers:true,bathingOpeningsClear:true,shopStageTempleVisibleInOrder:true,stageFiguresVisible:true,referenceKeptOutOfPublicAssets:true},shop:{references:['15.20.13','15.28.26'],bothViewpointsSupported:true,shopfrontVisibleFromBoth:true,leftOfAdjacentBuildingAcrossLake:true},templeFrontRefinement:{references:['15.14.30','15.15.11','15.15.17','15.15.51','15.20.01','15.22.12'],centralPassageHeight:.20,sideFloorHeight:.39,rearLedgeHeight:.85,deityOrder:['Ganesh','Shiva','Vishnu','Hanuman'],fourTexturedPaintingsVisible:true,pondWaterBelowGround:true,pondUncoveredByTerrain:true,upperEntryCanopyBelowRightWing:true,newViewpointsSupported:true},lakePanorama:{references:['15.22.33','15.22.36','15.22.40'],sameCamera:true,oppositeMudRoad:true,pavilionNearLeft:true,templeAndHouseVisible:true},templeEntrance:{exteriorReference:'15.19.41',doorwayReference:'15.15.51',adjacentHallReference:'15.19.57',exteriorLeftOfEntrance:true,doorwayPaintingsAndInscriptionVisible:true,passageOpen:true},referenceView:'On the veranda before the main door, looking left',camera:reference,veranda:{photoStops:verandaKeys,allBeforeMainDoor:true,sittingBaysReachableBothDirections:true,lowerWalkwayHeadClearance:true,benchChairAndRecessedWindowVisible:true,rightBayWallOnLeft:true},frontRoadViews:{tankOnLeft:true,adjacentBuildingAhead:true,templeLayoutUnchanged:true},templeOuterCircuit:{completeLoopBothDirections:true,meshHeadClearance:true,verandaStairsReachable:true,standingStoneVisible:true,threeShrineNichesVisible:true,photoStops:outerKeys},templeTowardsHouse:{camera:homePhoto,houseLeftLakeRight:true,doorCarAndTarpVisible:true,walkToHouseClear:true},godroom:{camera:god,gateVisible:true,stepsReachable:true,postsInFrame:true},templeGallery:{threePhotoPositionsSupported:true,facadeWindowsVisible:true,lampLeftPillarRight:true,stairHeadClearance:true,templeMeshCount},routes,meshCount,tour:{durationSeconds:tour.duration,checkpoints,collisionSamples},passed:true};
await fs.writeFile(new URL('../checks/entrance-correction.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
export {K,THREE,main,collision,supportY,blockedRise,farZ,farZinv};

// Solid stair risers and ridge continuity must survive future detail edits.
const frontTreads=[];house.traverse(o=>{if(o.name==='Front-right masonry stair tread')frontTreads.push(new THREE.Box3().setFromObject(o));});
frontTreads.sort((a,b)=>a.min.x-b.min.x);
assert.equal(frontTreads.length,22);
for(let i=1;i<frontTreads.length;i++)assert.ok(frontTreads[i].min.y<frontTreads[i-1].max.y,'Front stair risers must overlap without daylight slits');
const shrineRidgeBounds=new THREE.Box3().setFromObject(house.getObjectByName('Small shrine tiled roof ridge'));
assert.ok(shrineRidgeBounds.min.z<=5.526&&shrineRidgeBounds.max.z>=8.269,'Ridge cap covers the full revised God-room roof ridge');

for(const [prefix,base] of [['Front central stair',0],['Courtyard descending stair',.1],['Temple gallery access stair',.39],['Temple exterior side stair',.04]]){
 temple.traverse(o=>{
  if(!o.isMesh||!o.name.startsWith(prefix+' '))return;
  const box=new THREE.Box3().setFromObject(o);
  assert.ok(box.min.y>=base-.001,prefix+' masonry stays above its lower landing');
  assert.ok(o.geometry.parameters.height>0,prefix+' has no inverted stair blocks');
 });
}
// The photographed sitting-window recess must remove the old flat wall face.
// Probe the reveal and rounded head beside/above the frame, not its trim.
for(const [x,y] of [[3.34,2.60],[2.5,3.25]]){
  const hit=new THREE.Raycaster(new THREE.Vector3(x+K.houseShiftX,y,1),new THREE.Vector3(0,0,1)).intersectObject(house,true)[0];
  assert.ok(hit&&hit.point.z>2.02,'Window reveal is recessed behind the facade');
}
{const hit=new THREE.Raycaster(new THREE.Vector3(3.52+K.houseShiftX,2.6,1),new THREE.Vector3(0,0,1)).intersectObject(house,true)[0];
 assert.ok(hit&&hit.point.z<1.94,'Facade remains in front of the window recess');}
assert.ok(collision(2.5+K.houseShiftX,2.08,.75),'Closed sitting window cannot be walked through');
// Both lower column rows are solid, with an open aisle between them; the
// inner row must not accidentally acquire upper-storey collisions.
for(const z of [.6,-3,-7,-10.6]){
  const frontX=z===-3||z===-7?59.5:60.5;
  assert.ok(collision(frontX,z,2.82)&&collision(64,z,2.82),'Both lower column rows block walking');
  assert.ok(!collision(62.2,z,2.82),'Aisle between column rows remains open');
  assert.ok(!collision(64,z,6.25),'Upper gallery has no invented inner column row');
  assert.ok(Math.abs(supportY(62.2,z,2.82)-2.82)<.01,'Lower column aisle stays on the raised floor');
}
// Two-photo evidence: the centre porch projects in front of the side bays.
for(const z of [-3,-7]){
  assert.ok(!collision(60.5,z,2.82),'The former central column position is clear');
  assert.ok(Math.abs(supportY(59.5,z,2.82)-2.82)<.01,'Projected lower columns stand on masonry landings');
}
assert.ok(Math.abs(supportY(59.65,-5,6.25)-6.25)<.01,'Projecting upper balcony has a real supported floor');
{const hit=new THREE.Raycaster(new THREE.Vector3(50,9.7,-7.2),new THREE.Vector3(1,0,0)).intersectObject(landscape,true)[0];
 assert.equal(hit?.object.name,'Adjacent building central arched gable','Gable face projects ahead of the main hip roof');}
