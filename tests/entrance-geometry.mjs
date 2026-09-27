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
const {buildLandscape}=await loadModule('../dist/src/landscape.js');
const {createPhotoTour}=await loadModule('../dist/src/tour.js');
const K=createKit(),house=buildHouse(K);house.updateMatrixWorld(true);
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
const {collision,supportY,blockedRise}=new Function('K','THREE',navigation+';return {collision,supportY,blockedRise};')(K,THREE);
const photos=new Function('return ('+main.match(/const photos=(.*);/)[1]+')')();
for(const m of main.matchAll(/photos\.(\w+)=(\{.*\});/g))photos[m[1]]=new Function('return ('+m[2]+')')();
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
  const v=new Function('return ('+expression+')')();
  assert.ok(!collision(v.p[0],v.p[2],v.p[1]),key+' viewpoint clear');
  assert.ok(Math.abs(supportY(v.p[0],v.p[2],v.p[1])-v.p[1])<.06,key+' viewpoint supported');
}
let lastRoadHeight=0;
for(const [x,z] of [[-7,-5],[-18,-5],[-35,-5.8],[-49,-9.5]]){
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
  [[42.35,1.95,5.82],'Entrance doorway left original painting'],
  [[35.65,1.95,5.82],'Entrance doorway right original painting'],
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
// The lowered entry stays between raised side platforms, with four real photo textures.
assert.equal(supportY(39,4,.20),.20);
assert.ok(supportY(43,4,.602)-supportY(39,4,.20)>.39,'The side platforms stand above the middle passage');
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
for(const [x,z] of [[23.7,-1.5],[22.4,-1.5],[25.0,-1.5]]){
  const hits=new THREE.Raycaster(new THREE.Vector3(x,2,z),new THREE.Vector3(0,-1,0)).intersectObjects([landscape,soilGroup,temple],true);
  assert.equal(hits[0]?.object.name,'Temple small pond recessed water','The pond is open, with no soil or road covering the water');
  assert.ok(hits[0].point.y<-.7,'Water lies below ground level');
}
for(const key of ['templepond','templeacross']){
  const p=photos[key].p;assert.ok(!collision(p[0],p[2],p[1]),key+' viewpoint is clear');
  assert.ok(Math.abs(supportY(p[0],p[2],p[1])-p[1])<.06,key+' viewpoint is supported');
}
assert.ok(temple.getObjectByName('Entrance weathered flat canopy').position.y<temple.getObjectByName('Temple road corner flat roof').position.y,'The entry canopy is below the right wing roof');
assert.equal(temple.children.filter(o=>o.name==='Temple road upper closed timber shutter').length,6); // 15.22.36: six upper windows along the frontage
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
  [[34,1.33,-34],['pavilion']],
]){
  const ray=new THREE.Raycaster(panoramaEye,new THREE.Vector3(...point).sub(panoramaEye).normalize());
  const hit=ray.intersectObjects([landscape,temple,house],true)[0];
  assert.ok(prefixes.some(prefix=>hit?.object.name.startsWith(prefix)),`Panorama landmark at ${point} must be visible, got ${hit?.object.name}`);
}
const panoramaCamera=new THREE.PerspectiveCamera(photos.lakeleft.fov,4/3,.06,400);panoramaCamera.position.copy(panoramaEye);panoramaCamera.lookAt(new THREE.Vector3(...photos.lakeleft.target));panoramaCamera.updateMatrixWorld();
const pavilionProjection=new THREE.Vector3(34,1,-34).project(panoramaCamera);
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
for(const name of ['Stage upper left photographed figure','Stage upper right photographed figure','Stage lower left photographed figure','Stage lower right photographed figure']){
  const figure=landscape.getObjectByName(name),ray=new THREE.Raycaster(new THREE.Vector3(51,4,-5),figure.position.clone().sub(new THREE.Vector3(51,4,-5)).normalize());
  assert.equal(ray.intersectObject(landscape,true)[0]?.object.name,name,'Decorative figure visible from the forecourt');
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
assert.ok(!collision(58.9,-25,.041),'Shop forecourt remains accessible');
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
houseRoute('Entrance to left veranda',[[0,1.1],[0,-.31],[8.2,-.31]]);
houseRoute('Central entrance to inner hall',[[0,.5],[0,5.1]]);
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
  houseRoute('Inner hall to raised platform '+side,[[0,4.55],[side*2.05,4.55],[side*2.05,3.92]]);
  houseRoute('Raised platform back to hall '+side,[[side*2.05,3.92],[side*2.05,4.55],[0,4.55]],.79);
}
for(const side of [-1,1]){
  const ray=new THREE.Raycaster(HV(side*.76,2.0,3.15),new THREE.Vector3(0,0,-1),0,1.3);
  assert.ok(ray.intersectObject(house,true).some(h=>h.object.name.startsWith('Front room facade')),'Door is narrower than the lower passage');
}
assert.ok(house.getObjectByName('Inner sitting platform storage trunk'),'The second platform is furnished too');

houseRoute('Left veranda to front room',[[7,-.31],[7,3.1],[5.5,3.1],[5.5,5.1]]);
houseRoute('Entrance to left sitting bay',[[0,1.32],[2.65,1.32]]);
houseRoute('Entrance to right sitting bay',[[0,1.32],[-2.65,1.32]]);
houseRoute('Left sitting bay back to main door',[[2.65,1.32],[0,1.32],[0,3]],.75);
houseRoute('Right sitting bay back to main door',[[-2.65,1.32],[0,1.32],[0,3]],.75);
houseRoute('Lower veranda walkway both sides',[[-6.8,-.31],[8.2,-.31],[-6.8,-.31]]);
const verandaKeys=['verandaleft','verandaseat','veranda','verandaright'];
for(const key of verandaKeys){
  const p=photos[key].p;
  assert.ok(p[2]<2.05&&Math.abs(p[0]-HX)<2.4,'All four veranda cameras must be before the main doorway');
  assert.ok(!collision(p[0],p[2],p[1]),key+' clear camera');
  assert.ok(Math.abs(supportY(p[0],p[2],p[1])-p[1])<.01,key+' supported camera');
}
for(const [key,point,prefix] of [
  ['verandaseat',[3.78,1.29,1.67],'Entrance-left chair seat'],
  ['verandaseat',[3.82,1.255,.86],'Entrance-left wooden bench'],
  ['veranda',[3.0,1.99,2.06],'Veranda window grey middle crossrail'],
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
houseRoute('Right entrance steps down into courtyard',[[-4.9,5.15],[-2.7,5.15],[-2.7,7]],.45,.03);
houseRoute('Courtyard back to right entrance platform',[[-2.7,7],[-2.7,5.15],[-4.9,5.15]],.035,.03);
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
const pyramidTarget=new THREE.Box3().setFromObject(pyramid[2]).getCenter(new THREE.Vector3());
assert.ok(pyramidTarget.z<4.3,'Rectangular stepped pedestal moved east, toward the front');
assert.ok(pyramidTarget.clone().project(rightEntryCamera).x>0,'Pedestal appears right of the central pillars');
const entryTreads=house.children.filter(o=>o.name==='Pedestal-side red courtyard stair');
assert.equal(entryTreads.length,3);
assert.ok(entryTreads.every(o=>o.geometry.parameters.depth>o.geometry.parameters.width*4),'Tread lengths run east-west, with ascent along north-south');
assert.ok(Math.abs(supportY(HX-2.7,5.2,.075)-.075)<.001,'Old front slab does not fill the lower entry pocket');
assert.ok(collision(HX-2.9,4.18,.45),'Moved pedestal blocker follows the raised ledge');
houseRoute('Three steps to the God room gate',[[0,5.15],[0,6.5]]);
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
checkRoute('Lane to adjacent building stair',[[8,-5],[59.9,-5],[62.5,-5]],.051,0);
checkRoute('Adjacent hall rear dais ascent',[[62.1,-5],[64.9,-5],[64.9,-1]],2.82,2.81);
checkRoute('Adjacent hall rear dais descent',[[64.9,-1],[64.9,-5],[62.1,-5]],3.42,2.81);
for(const [x,z,height] of [[62.1,-1,2.82],[64.9,-1,3.42],[64.9,-9,3.42]]){
  const hit=new THREE.Raycaster(new THREE.Vector3(x,5.8,z),new THREE.Vector3(0,-1,0)).intersectObject(landscape,true)[0];
  assert.ok(hit&&Math.abs(hit.point.y-height)<.015,'Hall floor/dais mesh has the expected rise');
  assert.ok(Math.abs(hit.point.y-supportY(x,z,height))<.015,'Dais walking support agrees with its visible floor');
}
checkRoute('Pavilion entry from raised bank',[[34,-39.4],[34,-34]],1.38,-1.28);
checkRoute('Pavilion return to raised bank',[[34,-34],[34,-39.4]],-1.27,-1.28);
for(const [name,points,high] of [['West bank',[[-5.4,-24],[-2.7,-24]],.055],['East bank',[[50.4,-22.15],[47.65,-22.15]],.055],['Far corner',[[-2.3,-39.4],[-2.3,-34.43]],1.38]]){checkRoute(name+' descent',points,high,-1.56);checkRoute(name+' ascent',[...points].reverse(),-1.55,-1.56);}
checkRoute('House front to the lake verge',[[0,-5],[0,-7.4]],.051,0);
const bathingRoute=[[0,-5],[15.2,-5],[15.2,-9.65],[16.4,-9.65],[19.3,-9.65],[27.5,-9.65],[30.7,-9.65]];
checkRoute('Temple-side bathing gate descent',bathingRoute,.051,-1.56);
checkRoute('Temple-side bathing gate return',[...bathingRoute].reverse(),.065,-1.56);
assert.equal(supportY(23,-9.65,-1.55),-1.55,'The path between stairs stays down at the lower bank level');
checkRoute('Road away from the house',[[-7,-5],[-24,-5.3],[-35,-5.8],[-43,-7.1]],.051,0);
checkRoute('Downhill return to the house',[[-43,-7.1],[-35,-5.8],[-24,-5.3],[-7,-5]],1.71,0);
houseRoute('Photo-correct front stair',[[-13.3,.95],[-7.93,.95],[-2.65,.95]]);
const circuitRoute=[[39,8.2],[45,9],[49.9,13.8],[49.9,18.5],[50,25.6],[51.8,40.2],[40,40.5],[27.7,40.5],[27.86,22],[27.86,14],[33,13],[35,9],[39,8.2]];
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
for(const [x,z] of [[23.2,44],[40,44],[57.2,44],[55.8,34],[24.5,34]]){
  assert.ok(Math.abs(supportY(x,z,.6)-.6)<.001,'Expanded range has a continuous raised walkway');
  const roof=new THREE.Raycaster(new THREE.Vector3(x,3.2,z),new THREE.Vector3(0,1,0),0,1).intersectObject(temple,true)[0];
  assert.ok(roof&&/soffit/.test(roof.object.name),'Expanded range has a roof over its walkway');
}
assert.ok(!collision(58.8,40,.1),'East range remains clear of the garden boundary');
checkRoute('Complete outer temple circuit',circuitRoute,.1,.09);
checkRoute('Complete outer circuit in reverse',[...circuitRoute].reverse(),.1,.09);
checkRoute('Circuit to blue shrine veranda',[[53,16.2],[56.5,16.2]],.1,.09);
checkRoute('Circuit rear veranda stair',[[27.9,41.3],[27.9,43.7]],.1,.09);
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
const aisleRay=new THREE.Raycaster(aisleEye,new THREE.Vector3(48.9,.85,24.24).sub(aisleEye).normalize());
assert.equal(aisleRay.intersectObject(temple,true)[0]?.object.name,'Rounded courtyard marker stone','Standing stone must be visible along the circuit');
const shrineEye=new THREE.Vector3(...photos.templeoutershrines.p).add(new THREE.Vector3(0,1.62,0));
for(const z of [37.3,39.78,42.26]){
  const ray=new THREE.Raycaster(shrineEye,new THREE.Vector3(55.95,2.16,z).sub(shrineEye).normalize());
  assert.equal(ray.intersectObject(temple,true)[0]?.object.name,'Photographed outer shrine stones and painted recess','All three shrine niches must be visible');
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
const templeEye=new THREE.Vector3(39,5.7,5.4);templeCamera.position.copy(templeEye);templeCamera.lookAt(new THREE.Vector3(...photos.templecenter.target));templeCamera.updateMatrixWorld();
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
const bellTarget=bellBounds.getCenter(new THREE.Vector3());
for(const key of ['templebellreturn','templebellwide','templepoles','templebell']){
  const view=new Function('return ('+main.match(new RegExp('destinations\\.'+key+'=(\\{.*\\});'))[1]+')')();
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
  const target=new THREE.Vector3(x,1.40,16.25),ray=new THREE.Raycaster(templeEye,target.sub(templeEye).normalize());
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
const tour=createPhotoTour(photos,supportY,HX),tourProblems=[];
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
    const t=span.start+span.hold+span.travel*i/steps,p=tour.sample(t).position;
    collisionSamples++;
    const hit=K.colliders.find(c=>p.x+.12>c.minX&&p.x-.12<c.maxX&&p.z+.12>c.minZ&&p.z-.12<c.maxZ&&p.y+.12>c.bottom&&p.y-1.50<c.top);
    if(hit)tourProblems.push({t,position:p.toArray(),hit});
    assert.ok(p.y>1.60&&p.y<5.9,'Tour stays at walking height on the dry route');
    if(Math.abs(p.y-1.62-supportY(p.x,p.z,p.y-1.62))>=.015)tourProblems.push({t,position:p.toArray(),hit:'Unsupported: '+supportY(p.x,p.z,p.y-1.62)});
  }
  if(span.a.photo){
    assert.ok(span.start+span.hold<tour.duration,'Every tour photograph must be visited before the loop repeats');
    assert.ok(span.hold>0&&span.hold<=1,'Brief pauses at photographic views');
  }
}
assert.ok(tour.sample(tour.duration).position.distanceTo(tour.sample(0).position)<1e-9,'The tour must loop continuously');
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
for(const [point,prefix] of [[[-9.45,5.15,-45.057],'Opposite bank hall'],[[10,1.92,-46.31],'Opposite bank low house'],[[25,5.3,-53.72],'Opposite bank pink house']]){
  const ray=new THREE.Raycaster(upperCameras[0].position,new THREE.Vector3(...point).sub(upperCameras[0].position).normalize());
  const hit=ray.intersectObjects([house,landscape,temple],true)[0];assert.ok(hit?.object.name.startsWith(prefix),'Upstairs panorama sees '+prefix+', got '+hit?.object.name);
}
const pavilionMiddle=new THREE.Vector3(34,1,-34).project(upperCameras[1]),pavilionRight=new THREE.Vector3(34,1,-34).project(upperCameras[2]);
assert.ok(pavilionMiddle.x>0&&pavilionMiddle.x<1,'Pavilion lies right in the middle view');
assert.ok(pavilionRight.x<0&&pavilionRight.x>-1,'Pavilion moves left in the far-right view');
const shopUpper=new THREE.Vector3(62,3,-25).project(upperCameras[2]),stageUpper=new THREE.Vector3(60,5,-5).project(upperCameras[2]);
assert.ok(shopUpper.x>pavilionRight.x&&stageUpper.x>shopUpper.x,'Final view orders pavilion, shop, stage');
checkRoute('Opposite-bank path crosses stair landing',[[11.7,-39.4],[14.8,-39.4]],1.38,1.37);
// 14.58.26: two flights along the retaining face meet at a central landing.
checkRoute('Opposite-bank left flight descent',[[9.35,-39.4],[9.35,-37.2675],[13.25,-37.2675],[13.25,-34.63]],1.38,-1.56);
checkRoute('Opposite-bank right flight descent',[[17.25,-39.4],[17.25,-37.2675],[13.25,-37.2675],[13.25,-34.63]],1.38,-1.56);
checkRoute('Opposite-bank flight ascent',[[13.25,-34.63],[13.25,-37.2675],[9.35,-37.2675],[9.35,-39.4]],-1.55,-1.56);
const report={houseUpperPanorama:{references:['15.30.09','15.30.06','15.30.02'],sameCamera:true,panRight:true,oppositeBuildingsVisible:true,pavilionMovesRightToLeft:true,centralBankStairsAccessible:true},lakeFence:{reference:'14.58.02',heavyRoadsidePiers:true,darkRailsWhitePiers:true,bathingOpeningsClear:true,shopStageTempleVisibleInOrder:true,stageFiguresVisible:true,referenceKeptOutOfPublicAssets:true},shop:{references:['15.20.13','15.28.26'],bothViewpointsSupported:true,shopfrontVisibleFromBoth:true,leftOfAdjacentBuildingAcrossLake:true},templeFrontRefinement:{references:['15.14.30','15.15.11','15.15.17','15.15.51','15.20.01','15.22.12'],centralPassageHeight:.20,sidePlatformHeight:.602,deityOrder:['Ganesh','Shiva','Vishnu','Hanuman'],fourTexturedPaintingsVisible:true,pondWaterBelowGround:true,pondUncoveredByTerrain:true,upperEntryCanopyBelowRightWing:true,newViewpointsSupported:true},lakePanorama:{references:['15.22.33','15.22.36','15.22.40'],sameCamera:true,oppositeMudRoad:true,pavilionNearLeft:true,templeAndHouseVisible:true},templeEntrance:{exteriorReference:'15.19.41',doorwayReference:'15.15.51',adjacentHallReference:'15.19.57',exteriorLeftOfEntrance:true,doorwayPaintingsAndInscriptionVisible:true,passageOpen:true},referenceView:'On the veranda before the main door, looking left',camera:reference,veranda:{photoStops:verandaKeys,allBeforeMainDoor:true,sittingBaysReachableBothDirections:true,lowerWalkwayHeadClearance:true,benchChairAndRecessedWindowVisible:true,rightBayWallOnLeft:true},frontRoadViews:{tankOnLeft:true,adjacentBuildingAhead:true,templeLayoutUnchanged:true},templeOuterCircuit:{completeLoopBothDirections:true,meshHeadClearance:true,verandaStairsReachable:true,standingStoneVisible:true,threeShrineNichesVisible:true,photoStops:outerKeys},templeTowardsHouse:{camera:homePhoto,houseLeftLakeRight:true,doorCarAndTarpVisible:true,walkToHouseClear:true},godroom:{camera:god,gateVisible:true,stepsReachable:true,postsInFrame:true},templeGallery:{threePhotoPositionsSupported:true,facadeWindowsVisible:true,lampLeftPillarRight:true,stairHeadClearance:true,templeMeshCount},routes,meshCount,tour:{durationSeconds:tour.duration,checkpoints,collisionSamples},passed:true};
await fs.writeFile(new URL('../checks/entrance-correction.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
export {K,THREE,main,collision,supportY,blockedRise};

// Solid stair risers and ridge continuity must survive future detail edits.
const frontTreads=[];house.traverse(o=>{if(o.name==='Front-right masonry stair tread')frontTreads.push(new THREE.Box3().setFromObject(o));});
frontTreads.sort((a,b)=>a.min.x-b.min.x);
assert.equal(frontTreads.length,22);
for(let i=1;i<frontTreads.length;i++)assert.ok(frontTreads[i].min.y<frontTreads[i-1].max.y,'Front stair risers must overlap without daylight slits');
const shrineRidgeBounds=new THREE.Box3().setFromObject(house.getObjectByName('Small shrine tiled roof ridge'));
assert.ok(shrineRidgeBounds.min.z<=5.526&&shrineRidgeBounds.max.z>=8.269,'Ridge cap covers the full revised God-room roof ridge');

for(const [prefix,base] of [['Front central stair',0],['Courtyard descending stair',.1],['Temple gallery access stair',.6],['Temple exterior side stair',.04]]){
 temple.traverse(o=>{
  if(!o.isMesh||!o.name.startsWith(prefix+' '))return;
  const box=new THREE.Box3().setFromObject(o);
  assert.ok(box.min.y>=base-.001,prefix+' masonry stays above its lower landing');
  assert.ok(o.geometry.parameters.height>0,prefix+' has no inverted stair blocks');
 });
}
// The photographed sitting-window recess must remove the old flat wall face.
// Probe the reveal and rounded head beside/above the frame, not its trim.
for(const [x,y] of [[3.84,2.60],[3,3.25]]){
  const hit=new THREE.Raycaster(new THREE.Vector3(x+K.houseShiftX,y,1),new THREE.Vector3(0,0,1)).intersectObject(house,true)[0];
  assert.ok(hit&&hit.point.z>2.02,'Window reveal is recessed behind the facade');
}
{const hit=new THREE.Raycaster(new THREE.Vector3(4.02+K.houseShiftX,2.6,1),new THREE.Vector3(0,0,1)).intersectObject(house,true)[0];
 assert.ok(hit&&hit.point.z<1.94,'Facade remains in front of the window recess');}
assert.ok(collision(3+K.houseShiftX,2.08,.75),'Closed sitting window cannot be walked through');
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
