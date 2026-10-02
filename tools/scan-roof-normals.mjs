// Roof-normal scan without a browser or GPU.
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
// Lists roofs, awnings and sheets whose normals point down. The web draws both sides of these,
// so a face wound the wrong way looks right there, but the game shades by the true normal and
// renders it black from above. Usage: node tools/scan-roof-normals.mjs   (exit 1 if any found)
const nm=new THREE.Matrix3(),v=new THREE.Vector3();let bad=0;
for(const g of [house,temple,landscape])g.traverse(o=>{
  if(!o.isMesh||o.isInstancedMesh||o.geometry.type==='BoxGeometry')return;
  if(!/roof|tiles|awning|sheet|canopy/i.test(o.name)||/ceiling|underside|soffit|fascia|ridge|beam|rafter|arches/i.test(o.name))return;
  const n=o.geometry.attributes.normal;if(!n)return;nm.getNormalMatrix(o.matrixWorld);let up=0,down=0;
  for(let i=0;i<n.count;i++){v.fromBufferAttribute(n,i).applyMatrix3(nm);if(v.y>.2)up++;else if(v.y<-.2)down++;}
  if(down>up){bad++;console.log(`${o.name} | ${o.geometry.type} | normals up ${up}, down ${down}`);}});
console.log(bad?`${bad} roof surface(s) face down`:'all roof surfaces face up');process.exit(bad?1:0);
