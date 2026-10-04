// Finds coplanar, same-facing box faces that overlap (they flicker: z-fighting). No browser or GPU.
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
// node tools/scan-zfight.mjs [minArea]   Only unrotated box meshes are compared; a pair is listed when two faces
// of different materials, with the same outward direction, lie within 0.4 mm of one plane and overlap by more than
// minArea (default 0.05 m2). Undersides are skipped. Some hits are buried inside other solids: look before fixing.
const minArea=Number(process.argv[2]||.05),boxes=[];
for(const g of [house,temple,landscape])g.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.geometry?.type!=='BoxGeometry')return;
  const q=o.getWorldQuaternion(new THREE.Quaternion());if(Math.abs(q.x)+Math.abs(q.y)+Math.abs(q.z)>1e-5)return;
  if(o.material&&o.material.transparent)return;
  const b=new THREE.Box3().setFromObject(o);if(!b.isEmpty())boxes.push({name:o.name,min:b.min.toArray(),max:b.max.toArray(),mat:Array.isArray(o.material)?o.material.map(m=>m.uuid).join():o.material.uuid});});
boxes.sort((a,b)=>a.min[0]-b.min[0]);const out=[];
for(let i=0;i<boxes.length;i++){const a=boxes[i];
  for(let j=i+1;j<boxes.length;j++){const b=boxes[j];if(b.min[0]>a.max[0]+.001)break;
    for(let ax=0;ax<3;ax++){const u=(ax+1)%3,v=(ax+2)%3;
      const ou=Math.min(a.max[u],b.max[u])-Math.max(a.min[u],b.min[u]),ov=Math.min(a.max[v],b.max[v])-Math.max(a.min[v],b.min[v]);
      if(ou<=.02||ov<=.02||ou*ov<minArea)continue;
      if(a.mat===b.mat)continue; // one material: no visible flicker
      for(const side of ['min','max'])if(!(ax===1&&side==='min')&&Math.abs(a[side][ax]-b[side][ax])<4e-4){
        // one face must not be buried inside the other box's solid on the visible side
        out.push({area:ou*ov,axis:'xyz'[ax],side,at:[0,1,2].map(k=>k===ax?a[side][ax]:(Math.max(a.min[k],b.min[k])+Math.min(a.max[k],b.max[k]))/2),a:a.name,b:b.name});}}}}
out.sort((p,q)=>q.area-p.area);
const seen=new Map();for(const o of out){const k=[o.a,o.b].sort().join(' | ');if(!seen.has(k))seen.set(k,{...o,n:0});seen.get(k).n++;}
for(const [k,o] of [...seen].slice(0,60))console.log(o.area.toFixed(2)+' m2',o.axis+o.side,'at',o.at.map(v=>v.toFixed(2)).join(','),'x'+o.n,'|',k);
console.log(`${boxes.length} boxes, ${out.length} coplanar overlapping faces in ${seen.size} name pairs`);
