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
const K=createKit(),house=buildHouse(K),temple=buildTemple(K),landscape=buildLandscape(K);
for(const g of [house,temple,landscape])g.updateMatrixWorld(true);
const [x0,x1,z0,z1,re]=[...process.argv.slice(2,6).map(Number),process.argv[6]];const b=new THREE.Box3(),seen=new Map();
for(const g of [house,temple,landscape])g.traverse(o=>{if(!o.isMesh||o.isInstancedMesh)return;b.setFromObject(o);if(b.isEmpty())return;
 if(b.max.x<x0||b.min.x>x1||b.max.z<z0||b.min.z>z1)return;if(re&&!new RegExp(re,'i').test(o.name))return;
 const k=o.name;const s=`x ${b.min.x.toFixed(2)}..${b.max.x.toFixed(2)} y ${b.min.y.toFixed(2)}..${b.max.y.toFixed(2)} z ${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)}`;
 if(!seen.has(k))seen.set(k,[]);seen.get(k).push(s);});
for(const [k,v] of seen)console.log(k,'x'+v.length,'|',v.slice(0,3).join(' ; '));
