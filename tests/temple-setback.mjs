// The shipped placement: the temple complex stands K.templeShiftZ back from the lane, behind the
// house's front line (15.15.26, user's note). entrance-geometry.mjs checks the temple's own
// geometry at its authored position; this file checks what depends on where it sits.
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
const {buildLandscape,farZinv}=await loadModule('../dist/src/landscape.js');
const {createPhotoTour}=await loadModule('../dist/src/tour.js');
const K=createKit(),TS=K.templeShiftZ,HX=K.houseShiftX;
assert.ok(TS>=3&&TS<=6,'Temple setback stays within the range measured from 15.15.26');
const house=buildHouse(K),temple=buildTemple(K),landscape=buildLandscape(K);
for(const g of [house,temple,landscape])g.updateMatrixWorld(true);
const main=await fs.readFile(new URL('../dist/src/main.js',import.meta.url),'utf8');
const navigation=main.slice(main.indexOf('function inside('),main.indexOf('function lookAt('));
const {collision,supportY,blockedRise}=new Function('K','THREE','farZinv',navigation+';return {collision,supportY,blockedRise};')(K,THREE,farZinv);
const photos=new Function('return ('+main.match(/const photos=(.*);/)[1]+')')();
for(const m of main.matchAll(/photos\.(\w+)=(\{.*\});/g))photos[m[1]]=new Function('return ('+m[2]+')')();
const box=name=>{const o=[];for(const g of [house,temple,landscape])g.traverse(m=>{if(m.name===name)o.push(m);});assert.ok(o.length,name+' exists');const b=new THREE.Box3();for(const m of o)b.expandByObject(m);return b;};

// The house front stands ahead of the temple's porch pillars.
const pier=box('Temple road porch white pier'),veranda=box('Front range plinth');
assert.ok(pier.min.z-veranda.min.z>3,'Porch pillars are set back behind the house front line');
// The forecourt pond follows the temple and keeps its place in front of the porch.
const pond=box('Temple small pond recessed water'),porch=box('Temple road corner raised porch');
assert.ok(Math.abs(porch.min.z-pond.max.z)<1.8,'Pond stays just in front of the corner porch'); // 15.14.02: about 1.2 m clear
const pondX=(pond.min.x+pond.max.x)/2,pondZ=(pond.min.z+pond.max.z)/2;
assert.ok(supportY(pondX,pondZ,0)<-1,'Ground is cut out under the moved pond');
assert.ok(Math.abs(supportY(pondX,pondZ-TS,0)-.03)<.04,'Unshifted pond site is closed ground (the lane)');
// The pond is open: nothing covers the water (moved here from entrance-geometry, which runs at the
// authored placement where the 4 m pond has no room and is not built).
for(const dx of [0,-1.3,1.3]){
  const hit=new THREE.Raycaster(new THREE.Vector3(pondX+dx,2,pondZ),new THREE.Vector3(0,-1,0)).intersectObjects([landscape,temple,house],true)[0];
  assert.equal(hit?.object.name,'Temple small pond recessed water','The pond is open, with no soil or road covering the water');
  assert.ok(hit.point.y<-.7,'Water lies below ground level');
}
assert.ok(collision(pondX,pondZ,0),'Pond water cannot be walked into');
assert.ok(!collision(pondX,pondZ-TS,0),'Old pond site is open forecourt');

function checkRoute(name,points,feet=.051){for(let j=1;j<points.length;j++){const a=points[j-1],b=points[j],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.04);
  for(let i=0;i<=n;i++){const t=i/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;assert.ok(!collision(x,z,feet),`${name}: collision at ${x.toFixed(2)}, ${z.toFixed(2)}`);
    assert.ok(!blockedRise(x,z,feet),`${name}: impassable rise at ${x.toFixed(2)}, ${z.toFixed(2)}`);feet=supportY(x,z,feet);}}return feet;}
// Lane, across the deeper forecourt, through the entrance and into the courtyard.
const inFeet=checkRoute('Lane to temple courtyard',[[39,-6],[39,-1],[39,.2+TS],[39,3+TS],[39,9.5+TS],[45,9.9+TS]]);
assert.ok(inFeet>0&&inFeet<.6,'Courtyard paving reached at its own level');
// The pond stands in the middle of the forecourt (x 27.2..31.8): walk round its west end and
// along the 1.2 m strip between it and the porch.
checkRoute('House front to temple forecourt',[[HX,-5],[23,-5],[25.5,-2],[25.5,TS-2.2]]);
checkRoute('Forecourt in front of the corner porch',[[20.6,-4],[25.5,TS-3.6],[26.4,TS-.75],[33,TS-.75]]);

// The whole tour at the shipped placement: no walls, posts or unsupported steps.
const tour=createPhotoTour(photos,supportY,HX,TS),problems=[];
for(const span of tour.spans){
  const distance=new THREE.Vector3(...span.a.p).distanceTo(new THREE.Vector3(...span.b.p)),steps=Math.max(1,Math.ceil(distance*1.5/.05));
  for(let i=0;i<=steps;i++){const t=span.start+span.hold+span.travel*i/steps,p=tour.sample(t).position;
    const hit=K.colliders.find(c=>p.x+.12>c.minX&&p.x-.12<c.maxX&&p.z+.12>c.minZ&&p.z-.12<c.maxZ&&p.y+.12>c.bottom&&p.y-1.50<c.top);
    if(hit)problems.push({t,position:p.toArray(),hit});
    else if(Math.abs(p.y-1.62-supportY(p.x,p.z,p.y-1.62))>=.015)problems.push({t,position:p.toArray(),hit:'Unsupported: '+supportY(p.x,p.z,p.y-1.62)});}}
if(problems.length)console.error(JSON.stringify(problems.filter((p,i,a)=>i===0||JSON.stringify(p.hit)!==JSON.stringify(a[i-1].hit)).slice(0,12)));
assert.equal(problems.length,0,'Tour must not pass through walls or posts at the shipped placement');
// Photo viewpoints inside the temple stand on walkable floor there.
for(const key of ['templedoor','templeleft','templecenter','templeright','templeoldwall','templeoutershrines','templeouterrear','templeouterreturn','templepicturesleft','templevishnu','templehanuman']){
  const v=photos[key];assert.ok(!collision(v.p[0],v.p[2],v.p[1]),key+' viewpoint is clear');assert.ok(Math.abs(supportY(v.p[0],v.p[2],v.p[1])-v.p[1])<.06,key+' viewpoint is supported, got '+supportY(v.p[0],v.p[2],v.p[1]));}
// Nothing from the landscape planting is left standing inside the moved complex.
const m4=new THREE.Matrix4(),v3=new THREE.Vector3(),intruders=[];
landscape.traverse(o=>{if(!o.isInstancedMesh)return;for(let i=0;i<o.count;i++){o.getMatrixAt(i,m4);m4.premultiply(o.matrixWorld);v3.setFromMatrixPosition(m4);
  if(v3.x>21.5&&v3.x<57.5&&v3.z>TS+.5&&v3.z<45.3+TS&&v3.y<3)intruders.push(o.name+' '+v3.toArray().map(n=>n.toFixed(1)));}});
assert.deepEqual(intruders.slice(0,8),[],'No scattered planting inside the temple');
console.log(JSON.stringify({templeShiftZ:TS,passed:true}));
