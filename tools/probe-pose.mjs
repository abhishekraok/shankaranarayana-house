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
const pose=JSON.parse(await fs.readFile(process.env.POSE_FILE||'F:/Shankaranarayana/align-poses.json','utf8')).poses.find(p=>p.filename.includes(process.argv[2])).camera;
const cam=new THREE.PerspectiveCamera(pose.verticalFov,pose.aspect||4/3,.05,500);cam.position.fromArray(pose.position);cam.quaternion.fromArray(pose.quaternion);cam.updateMatrixWorld();
const rc=new THREE.Raycaster();
for(const s of process.argv.slice(3)){const [u,v]=s.split(',').map(Number);rc.setFromCamera(new THREE.Vector2(u*2-1,1-v*2),cam);
 const h=rc.intersectObjects([house,temple,landscape],true)[0];
 console.log(s,'->',h?`${h.object.name} @ ${h.point.toArray().map(x=>x.toFixed(2))} d=${h.distance.toFixed(2)}`:'none');}
