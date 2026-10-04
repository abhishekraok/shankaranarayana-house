// Finds photo poses blocked by nearby geometry, without a browser or GPU.
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
const K=createKit(),house=buildHouse(K),temple=buildTemple(K),landscape=buildLandscape(K);
for(const g of [house,temple,landscape])g.updateMatrixWorld(true);
// Lists aligned photo poses whose camera now stands inside or right behind geometry:
// share of a 7x5 ray grid that hits something within 0.7 m, nearest hit, and what was hit.
// node tools/scan-blocked-poses.mjs   (POSE_FILE overrides the pose file)
const poses=JSON.parse(await fs.readFile(process.env.POSE_FILE||'F:/Shankaranarayana/align-poses.json','utf8')).poses;
const rc=new THREE.Raycaster(),out=[];
for(const p of poses){const c=p.camera,cam=new THREE.PerspectiveCamera(c.verticalFov,c.aspect||4/3,.05,500);cam.position.fromArray(c.position);cam.quaternion.fromArray(c.quaternion);cam.updateMatrixWorld();
  let near=0,n=0,minD=Infinity;const names=new Map();
  for(let i=0;i<7;i++)for(let j=0;j<5;j++){rc.setFromCamera(new THREE.Vector2((i+.5)/7*2-1,1-(j+.5)/5*2),cam);const h=rc.intersectObjects([house,temple,landscape],true)[0];n++;
    if(h){minD=Math.min(minD,h.distance);if(h.distance<.7){near++;names.set(h.object.name,(names.get(h.object.name)||0)+1);}}}
  if(near/n>=.12)out.push({file:p.filename,share:near/n,minD,position:c.position,what:[...names].sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]+' x'+x[1]).join('; ')});}
out.sort((a,b)=>b.share-a.share);
for(const o of out)console.log(o.share.toFixed(2),o.minD.toFixed(2)+' m',o.file,'|',o.position.map(v=>v.toFixed(2)).join(','),'|',o.what);
console.log(`${poses.length} poses, ${out.length} blocked`);
