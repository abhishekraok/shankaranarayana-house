// Exports the web app's authored scene as a Blender blockout, without a browser.
// Runs the production builders (house, temple, landscape, ground and lake from
// main.js) under the same canvas shims as tests/entrance-geometry.mjs, before
// optimizeStaticScene merges anything, so every mesh keeps its authored name.
//
// Output (blender/build/, ignored by git):
//   scene.json  meshes, materials and transforms in three.js world space (metres, +Y up)
//   nav.json    colliders, walkable surfaces and ramps from the kit
//   scene.bin   float32 positions and normals, uint32 indices, per shared geometry
//
// Usage: node blender/export-scene.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from '../dist/vendor/three.module.js';

// Each canvas records the colour of its first near-full-size fill: the base paint
// the web app's procedural textures start from, before grime and pattern strokes.
function makeCanvas(){
  const canvas={width:300,height:150,style:{},baseFill:null};
  const state={fillStyle:'#000'};
  const base={getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray((w||1)*(h||1)*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),createPattern:()=>({}),measureText:()=>({width:0}),
    fillRect(x,y,w,h){if(!canvas.baseFill&&typeof state.fillStyle==='string'&&w*h>=canvas.width*canvas.height*.5)canvas.baseFill=state.fillStyle;}};
  const ctx=new Proxy(base,{get:(o,k)=>k in o?o[k]:k in state?state[k]:(()=>{}),set:(o,k,v)=>(state[k]=v,true)});
  canvas.getContext=()=>ctx;return canvas;
}
globalThis.document={createElement:()=>makeCanvas(),createElementNS:()=>({addEventListener(){},removeEventListener(){},style:{}})};
globalThis.Image??=class{addEventListener(){}removeEventListener(){}};

const threeURL=new URL('../dist/vendor/three.module.js',import.meta.url).href;
async function loadModule(p){const src=(await fs.readFile(new URL(p,import.meta.url),'utf8')).replace("from 'three'",`from '${threeURL}'`);return import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));}
const {createKit}=await loadModule('../dist/src/kit.js');
const {buildHouse}=await loadModule('../dist/src/house.js');
const {buildTemple}=await loadModule('../dist/src/temple.js');
const {buildLandscape}=await loadModule('../dist/src/landscape.js');

const K=createKit();
const roots=[buildLandscape(K,{mobile:false}),buildHouse(K),buildTemple(K)];

// Ground slabs and the lake plane are authored inline in main.js; replay those lines.
const main=await fs.readFile(new URL('../dist/src/main.js',import.meta.url),'utf8');
const terrain=new THREE.Group();terrain.name='Ground';
const groundMat=K.M.earth.clone();groundMat.name='ground laterite';
const groundCalls=[...main.matchAll(/^(ground\([^;]*\);(?:ground\([^;]*\);)*)/gm)].map(m=>m[1]).join('\n');
new Function('K','terrain','groundMat',`function ground(x,z,w,d){K.box(terrain,'Earth',x,-.22,z,w,.44,d,groundMat);}\n${groundCalls}`)(K,terrain,groundMat);
const wm=main.match(/new Reflector\(new THREE\.PlaneGeometry\(([\d.]+),([\d.]+)\)[\s\S]*?water\.position\.set\(([-\d.]+),([-\d.]+),([-\d.]+)\)/);
if(!wm)throw Error('Lake plane not found in main.js');
const water=new THREE.Mesh(new THREE.PlaneGeometry(+wm[1],+wm[2]),new THREE.MeshStandardMaterial({name:'lake water',color:0x5b8350}));
water.name='Reflective lake water';water.rotation.x=-Math.PI/2;water.position.set(+wm[3],+wm[4],+wm[5]);
roots.push(terrain,water);
for(const r of roots)r.updateMatrixWorld(true);

// Name shared kit materials by their key; others by their own name or a stable index.
const kitName=new Map(Object.entries(K.M).map(([k,m])=>[m,k]));
const materials=[],matIndex=new Map();
const hex=c=>c?'#'+c.getHexString():null;
function mat(m){
  if(matIndex.has(m))return matIndex.get(m);
  const i=materials.length;matIndex.set(m,i);
  materials.push({name:kitName.get(m)||m.name||`${m.type}.${i}`,type:m.type,color:hex(m.color),emissive:m.emissive&&m.emissive.getHex()?hex(m.emissive):null,
    roughness:m.roughness??null,metalness:m.metalness??null,opacity:m.opacity,transparent:!!m.transparent,doubleSided:m.side===THREE.DoubleSide,
    hasMap:!!m.map,mapBase:m.map&&m.map.image&&m.map.image.baseFill?new THREE.Color().setStyle(m.map.image.baseFill).getStyle():null,mapIsPhoto:!!(m.map&&m.map.image&&!m.map.isCanvasTexture),alphaTest:m.alphaTest||0,vertexColors:!!m.vertexColors});
  return i;
}

const chunks=[];let offset=0;
function put(typed){const buf=Buffer.from(typed.buffer,typed.byteOffset,typed.byteLength);const at=offset;chunks.push(buf);offset+=buf.byteLength;const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}return [at,typed.length];}
const geoms=[],geoIndex=new Map();
function geo(g){
  if(geoIndex.has(g))return geoIndex.get(g);
  const pos=g.attributes.position;if(!pos)return -1;
  const P=new Float32Array(pos.count*3);for(let i=0;i<pos.count;i++){P[i*3]=pos.getX(i);P[i*3+1]=pos.getY(i);P[i*3+2]=pos.getZ(i);}
  let I;if(g.index)I=Uint32Array.from(g.index.array);else{I=new Uint32Array(pos.count);for(let i=0;i<pos.count;i++)I[i]=i;}
  const groups=(g.groups&&g.groups.length?g.groups:[{start:0,count:I.length,materialIndex:0}]).map(q=>[q.start,Math.min(q.count,I.length-q.start),q.materialIndex??0]);
  const uv=g.attributes.uv;let U=null;if(uv){U=new Float32Array(uv.count*2);for(let i=0;i<uv.count;i++){U[i*2]=uv.getX(i);U[i*2+1]=uv.getY(i);}}
  const col=g.attributes.color;let C=null;if(col){C=new Float32Array(col.count*3);for(let i=0;i<col.count;i++){C[i*3]=col.getX(i);C[i*3+1]=col.getY(i);C[i*3+2]=col.getZ(i);}}
  const id=geoms.length;geoIndex.set(g,id);
  geoms.push({positions:put(P),indices:put(I),uv:U?put(U):null,color:C?put(C):null,groups});
  return id;
}

const objects=[];const skipped={};
const chain=o=>{const n=[];for(let p=o.parent;p;p=p.parent)if(p.name)n.unshift(p.name);return n;};
for(const root of roots)root.traverse(o=>{
  if(!o.isMesh){if(o.isLine||o.isPoints||o.isSprite)skipped[o.type]=(skipped[o.type]||0)+1;return;}
  if(o.visible===false){skipped.hidden=(skipped.hidden||0)+1;return;}
  const g=geo(o.geometry);if(g<0)return;
  const mats=(Array.isArray(o.material)?o.material:[o.material]).map(mat);
  const rec={name:o.name||'(unnamed)',parents:chain(o),root:root.name,geometry:g,materials:mats,matrix:o.matrixWorld.elements.map(v=>+v.toFixed(6)),castShadow:o.castShadow};
  if(o.isInstancedMesh){
    const m=new THREE.Matrix4(),c=new THREE.Color();rec.instances=[];rec.instanceColors=o.instanceColor?[]:null;
    for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);rec.instances.push(new THREE.Matrix4().multiplyMatrices(o.matrixWorld,m).elements.map(v=>+v.toFixed(5)));if(o.instanceColor){o.getColorAt(i,c);rec.instanceColors.push([+c.r.toFixed(4),+c.g.toFixed(4),+c.b.toFixed(4)]);}}
  }
  objects.push(rec);
});

const out=new URL('./build/',import.meta.url);await fs.mkdir(out,{recursive:true});
await fs.writeFile(new URL('scene.bin',out),Buffer.concat(chunks));
const meta={schema:'shankaranarayana-blockout',version:1,coordinates:'three.js world metres, +Y up, right-handed',source:{commit:process.env.EXPORT_COMMIT||null},materials,geometries:geoms,objects};
await fs.writeFile(new URL('scene.json',out),JSON.stringify(meta));
// Navigation the web walker uses: solid boxes, walkable slabs and stair/ramp slopes.
// A native build rebuilds collision from these rather than from render geometry.
await fs.writeFile(new URL('nav.json',out),JSON.stringify({colliders:K.colliders,surfaces:K.surfaces,ramps:K.ramps,
  spawn:{p:[0,1.62,-2],target:[0,1.6,-12]}}));
const inst=objects.filter(o=>o.instances).reduce((n,o)=>n+o.instances.length,0);
console.log(`roots ${roots.map(r=>r.name).join(' | ')}`);
console.log(`objects ${objects.length} (instanced ${objects.filter(o=>o.instances).length}, ${inst} instances), geometries ${geoms.length}, materials ${materials.length}, bin ${(offset/1e6).toFixed(1)} MB`);
console.log('skipped',skipped);

// The guided tour, sampled from the web app's own tour code with the same floor
// following (supportY from main.js), so the Blender tour camera walks the same path.
{
  const {createPhotoTour}=await loadModule('../dist/src/tour.js');
  const navigation=main.slice(main.indexOf('function inside('),main.indexOf('function lookAt('));
  const {supportY}=new Function('K','THREE',navigation+';return {supportY};')(K,THREE);
  const photos=new Function('return ('+main.match(/const photos=(.*);/)[1]+')')();
  for(const m of main.matchAll(/photos\.(\w+)=(\{.*\});/g))photos[m[1]]=new Function('return ('+m[2]+')')();
  const tour=createPhotoTour(photos,supportY);
  const FPS=24,frames=[];let label=null;const markers=[];
  for(let f=0;f<=Math.ceil(tour.duration*FPS);f++){
    const s=tour.sample(f/FPS);
    frames.push([...s.position.toArray().map(v=>+v.toFixed(4)),...s.quaternion.toArray().map(v=>+v.toFixed(5))]);
    if(s.label!==label){label=s.label;markers.push([f,label]);}
  }
  await fs.writeFile(new URL('tour.json',out),JSON.stringify({fps:FPS,fov:58,duration:tour.duration,frames,markers}));
  console.log(`tour ${tour.duration.toFixed(0)} s, ${frames.length} frames, ${markers.length} labels`);
}
