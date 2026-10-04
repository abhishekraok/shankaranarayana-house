// Finds hairline gaps between walkable surfaces at the same level (a walker or the tour drops through them).
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
// node tools/scan-surface-gaps.mjs [maxGap]   Lists pairs of K.surfaces at one height separated by 0 < gap <= maxGap
// (default 0.06 m) along x or z while overlapping on the other axis, unless a third surface or a ramp bridges the gap.
const maxGap=Number(process.argv[2]||.06),S=K.surfaces.map(s=>({x0:s.x-s.w/2,x1:s.x+s.w/2,z0:s.z-s.d/2,z1:s.z+s.d/2,y:s.y}));
const R=K.ramps.map(r=>({x0:r.x-r.w/2,x1:r.x+r.w/2,z0:r.z-r.d/2,z1:r.z+r.d/2}));
const covered=(x,z,y,skip)=>S.some(s=>!skip.includes(s)&&Math.abs(s.y-y)<.03&&x>=s.x0&&x<=s.x1&&z>=s.z0&&z<=s.z1)||R.some(r=>x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1);
const out=[];
for(let i=0;i<S.length;i++)for(let j=i+1;j<S.length;j++){const a=S[i],b=S[j];if(Math.abs(a.y-b.y)>.03)continue;
  for(const [u0,u1,v0,v1,ax] of [['x0','x1','z0','z1','x'],['z0','z1','x0','x1','z']]){
    const lo=a[u1]<b[u0]?a:b,hi=lo===a?b:a,gap=hi[u0]-lo[u1];if(!(gap>1e-4&&gap<=maxGap))continue;
    const o0=Math.max(a[v0],b[v0]),o1=Math.min(a[v1],b[v1]);if(o1-o0<.3)continue;
    // sample along the shared edge: is the slit open anywhere?
    let open=0,first=null;for(let k=0;k<=20;k++){const v=o0+(o1-o0)*(k+.5)/21,u=lo[u1]+gap/2,x=ax==='x'?u:v,z=ax==='x'?v:u;if(!covered(x,z,a.y,[a,b])){open++;first??=[x,z];}}
    if(open)out.push({axis:ax,gap,y:a.y,at:first,len:(o1-o0)*open/21});}}
out.sort((p,q)=>q.len-p.len);
for(const o of out)console.log(`gap ${(o.gap*100).toFixed(1)} cm along ${o.axis}, y ${o.y.toFixed(2)}, open ${o.len.toFixed(2)} m, e.g. at x ${o.at[0].toFixed(2)} z ${o.at[1].toFixed(2)}`);
console.log(`${S.length} surfaces, ${out.length} hairline gaps`);
