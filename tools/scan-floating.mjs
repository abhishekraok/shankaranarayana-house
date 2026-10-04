// Lists meshes that touch nothing: no other mesh's box overlaps theirs (grown by 4 cm). No browser or GPU.
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
// node tools/scan-floating.mjs [minSize]   A hit is a candidate floating object; wires, lights and labels are skipped.
const minSize=Number(process.argv[2]||.12),items=[];
for(const g of [house,temple,landscape])g.traverse(o=>{if(!o.isMesh)return;const b=new THREE.Box3();
  if(o.isInstancedMesh){const m=new THREE.Matrix4(),gb=o.geometry.boundingBox||(o.geometry.computeBoundingBox(),o.geometry.boundingBox);
    for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);m.premultiply(o.matrixWorld);items.push({name:o.name+' #'+i,box:gb.clone().applyMatrix4(m),inst:true});}return;}
  b.setFromObject(o);if(!b.isEmpty())items.push({name:o.name,box:b,inst:false});});
const eps=.04,out=[];
for(const a of items){if(a.inst)continue;const s=a.box.getSize(new THREE.Vector3());if(Math.max(s.x,s.y,s.z)<minSize)continue;
  if(/wire|cord|string|rope|line|light|label|smoke|water|sky|cloud|reflection/i.test(a.name))continue;
  const A=a.box.clone().expandByScalar(eps);let touch=false;
  for(const b of items){if(b===a)continue;if(A.intersectsBox(b.box)){touch=true;break;}}
  if(!touch)out.push(a);}
out.sort((p,q)=>q.box.getSize(new THREE.Vector3()).length()-p.box.getSize(new THREE.Vector3()).length());
for(const o of out){const c=o.box.getCenter(new THREE.Vector3()),s=o.box.getSize(new THREE.Vector3());console.log(o.name,'| centre',c.toArray().map(v=>v.toFixed(2)).join(','),'| size',s.toArray().map(v=>v.toFixed(2)).join(' x '));}
console.log(`${items.length} boxes, ${out.length} touch nothing`);
