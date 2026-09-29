// Exports the web app's authored scene as a Blender blockout, without a browser.
// Runs the production builders (house, temple, landscape, ground and lake from
// main.js) with a local Canvas 2D implementation, before
// optimizeStaticScene merges anything, so every mesh keeps its authored name.
//
// Output (blender/build/, ignored by git):
//   scene.json  meshes, materials and transforms in three.js world space (metres, +Y up)
//   nav.json    colliders, walkable surfaces and ramps from the kit
//   scene.bin   float32 positions and normals, uint32 indices, per shared geometry
//   textures/   procedural canvases and explicitly approved web photo assets
//
// Usage: node blender/export-scene.mjs
// Requires @napi-rs/canvas; CANVAS_MODULE may point to an existing installation.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as THREE from '../dist/vendor/three.module.js';
const {createCanvas,loadImage}=createRequire(import.meta.url)(process.env.CANVAS_MODULE||'@napi-rs/canvas');

// Only the already-approved repository photographs can become native textures.
// This loader never reads the private reference folder or fetches a URL.
const allowlist=new Set((await fs.readFile(new URL('../.gitignore',import.meta.url),'utf8'))
  .split(/\r?\n/).filter(line=>/^!\/dist\/assets\/[\w-]+\.(jpg|jpeg|png)$/i.test(line))
  .map(line=>line.slice(2)));
const photoAssets=new Map(),photoLoads=[];
THREE.TextureLoader.prototype.load=function(url,onLoad){
  if(!/^(\.\/)?assets\/[\w-]+\.(jpg|jpeg|png)$/i.test(url))throw Error('Nonlocal photo texture rejected: '+url);
  const sourceFile='dist/'+url.replace(/^\.\//,'');
  if(!allowlist.has(sourceFile))throw Error('Unapproved photo texture rejected: '+sourceFile);
  const texture=new THREE.Texture();texture.userData.photoSource=sourceFile;
  if(!photoAssets.has(sourceFile))photoAssets.set(sourceFile,(async()=>{
    const fileURL=new URL('../'+sourceFile,import.meta.url);
    // A redirected/symlinked asset must not turn an approved name into another file.
    if(path.resolve(await fs.realpath(fileURL))!==path.resolve(fileURLToPath(fileURL)))
      throw Error('Redirected photo asset rejected: '+sourceFile);
    const bytes=await fs.readFile(fileURL),image=await loadImage(bytes);
    const sha256=createHash('sha256').update(bytes).digest('hex');
    return {sourceFile,bytes,image,sha256,file:'textures/photo-'+sha256+path.extname(sourceFile).toLowerCase()};
  })());
  photoLoads.push(photoAssets.get(sourceFile).then(asset=>{
    texture.image=asset.image;texture.needsUpdate=true;if(onLoad)onLoad(texture);
  }));
  return texture;
};

// Each canvas records the colour of its first near-full-size fill: the base paint
// the web app's procedural textures start from, before grime and pattern strokes.
function makeCanvas(){
  const canvas=createCanvas(300,150);canvas.style={};canvas.baseFill=null;
  const native=canvas.getContext('2d');
  const ctx=new Proxy(native,{get:(o,k)=>{
    if(k==='fillRect')return (x,y,w,h)=>{if(!canvas.baseFill&&typeof o.fillStyle==='string'&&w*h>=canvas.width*canvas.height*.5)canvas.baseFill=o.fillStyle;o.fillRect(x,y,w,h);};
    const v=Reflect.get(o,k,o);return typeof v==='function'?v.bind(o):v;
  },set:(o,k,v)=>Reflect.set(o,k,v,o)});
  canvas.getContext=()=>ctx;return canvas;
}
globalThis.document={createElement:()=>makeCanvas(),createElementNS:()=>({addEventListener(){},removeEventListener(){},style:{}})};
globalThis.Image??=class{addEventListener(){}removeEventListener(){}};

const threeURL=new URL('../dist/vendor/three.module.js',import.meta.url).href;
async function loadModule(p){const src=(await fs.readFile(new URL(p,import.meta.url),'utf8')).replace("from 'three'",`from '${threeURL}'`);return import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));}
const {createKit}=await loadModule('../dist/src/kit.js');
const {buildHouse}=await loadModule('../dist/src/house.js');
const {buildTemple}=await loadModule('../dist/src/temple.js');
const {buildLandscape,farZ,farZinv}=await loadModule('../dist/src/landscape.js');

const K=createKit();
const roots=[buildLandscape(K,{mobile:false}),buildHouse(K),buildTemple(K)];
await Promise.all(photoLoads);
for(const [file,promise] of photoAssets)photoAssets.set(file,await promise);

// Ground slabs and the lake plane are authored inline in main.js; replay those lines.
const main=await fs.readFile(new URL('../dist/src/main.js',import.meta.url),'utf8');
const terrain=new THREE.Group();terrain.name='Ground';
const groundMat=K.M.earth.clone();groundMat.name='ground laterite';
const groundCalls=[...main.matchAll(/^(ground\([^;]*\);(?:ground\([^;]*\);)*)/gm)].map(m=>m[1]).join('\n');
// main.js maps ground slabs through the far-bank remap (farZ); replay that too.
new Function('K','terrain','groundMat','farZ',`function ground(x,z,w,d){const z0=farZ(z-d/2,x),z1=farZ(z+d/2,x);z=(z0+z1)/2;d=z1-z0;K.box(terrain,'Earth',x,-.22,z,w,.44,d,groundMat);}
${groundCalls}`)(K,terrain,groundMat,farZ);
// Sizes and position may be farZ expressions; evaluate them with the real remap.
const wm=main.match(/new Reflector\(new THREE\.PlaneGeometry\(([^,]+),(.+?)\),\{[\s\S]*?water\.position\.set\(([^,]+),([^,]+),(.+?)\);/);
if(!wm)throw Error('Lake plane not found in main.js');
for(let i=1;i<=5;i++)wm[i]=new Function('farZ',`return (${wm[i]})`)(farZ);
const water=new THREE.Mesh(new THREE.PlaneGeometry(+wm[1],+wm[2]),new THREE.MeshStandardMaterial({name:'lake water',color:0x5b8350}));
water.name='Reflective lake water';water.rotation.x=-Math.PI/2;water.position.set(+wm[3],+wm[4],+wm[5]);
roots.push(terrain,water);
for(const r of roots)r.updateMatrixWorld(true);

// Name shared kit materials by their key; others by their own name or a stable index.
const kitName=new Map(Object.entries(K.M).map(([k,m])=>[m,k]));
const materials=[],matIndex=new Map();
const textureImages=new Map();
function proceduralMap(t){
  if(!t?.isCanvasTexture)return null;
  const canvas=t.image;
  if(!canvas||typeof canvas.toBuffer!=='function')throw Error('Canvas texture has no local PNG encoder');
  if(!textureImages.has(canvas)){
    const png=canvas.toBuffer('image/png'),sha256=createHash('sha256').update(png).digest('hex');
    textureImages.set(canvas,{file:'textures/'+sha256+'.png',sha256,png});
  }
  const {file,sha256}=textureImages.get(canvas);t.updateMatrix();
  return {file,sha256,width:canvas.width,height:canvas.height,matrix:t.matrix.elements,
    wrapS:t.wrapS,wrapT:t.wrapT,flipY:t.flipY,colorSpace:t.colorSpace};
}
function photoMap(t){
  if(!t?.userData.photoSource)return null;
  const asset=photoAssets.get(t.userData.photoSource);t.updateMatrix();
  return {file:asset.file,sha256:asset.sha256,sourceFile:asset.sourceFile,
    width:asset.image.width,height:asset.image.height,matrix:t.matrix.elements,
    wrapS:t.wrapS,wrapT:t.wrapT,flipY:t.flipY,colorSpace:t.colorSpace};
}
const hex=c=>c?'#'+c.getHexString():null;
function mat(m){
  if(matIndex.has(m))return matIndex.get(m);
  const i=materials.length;matIndex.set(m,i);
  materials.push({name:kitName.get(m)||m.name||`${m.type}.${i}`,type:m.type,color:hex(m.color),emissive:m.emissive&&m.emissive.getHex()?hex(m.emissive):null,
    roughness:m.roughness??null,metalness:m.metalness??null,opacity:m.opacity,transparent:!!m.transparent,doubleSided:m.side===THREE.DoubleSide,
    hasMap:!!m.map,mapBase:m.map&&m.map.image&&m.map.image.baseFill?new THREE.Color().setStyle(m.map.image.baseFill).getStyle():null,mapIsPhoto:!!(m.map&&m.map.image&&!m.map.isCanvasTexture),alphaTest:m.alphaTest||0,vertexColors:!!m.vertexColors,
    proceduralMap:proceduralMap(m.map),photoMap:photoMap(m.map),
    bumpMap:proceduralMap(m.bumpMap)||photoMap(m.bumpMap),bumpScale:m.bumpScale??null,
    roughnessMap:proceduralMap(m.roughnessMap)||photoMap(m.roughnessMap)});
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
await fs.mkdir(new URL('textures/',out),{recursive:true});
for(const {file,png} of textureImages.values())await fs.writeFile(new URL(file,out),png);
for(const {file,bytes} of photoAssets.values())await fs.writeFile(new URL(file,out),bytes);
await fs.writeFile(new URL('scene.bin',out),Buffer.concat(chunks));
const sourceFiles={};
for(const file of ['.gitignore','blender/export-scene.mjs','dist/src/kit.js','dist/src/house.js','dist/src/temple.js','dist/src/landscape.js','dist/src/main.js','dist/src/tour.js','dist/vendor/three.module.js']){
  sourceFiles[file]=createHash('sha256').update(await fs.readFile(new URL('../'+file,import.meta.url))).digest('hex');
}
for(const asset of photoAssets.values())sourceFiles[asset.sourceFile]=asset.sha256;
const meta={schema:'shankaranarayana-blockout',version:1,coordinates:'three.js world metres, +Y up, right-handed',source:{commit:process.env.EXPORT_COMMIT||null,sha256:sourceFiles},materials,geometries:geoms,objects};
await fs.writeFile(new URL('scene.json',out),JSON.stringify(meta));
// Navigation the web walker uses: solid boxes, walkable slabs and stair/ramp slopes.
// A native build rebuilds collision from these rather than from render geometry.
await fs.writeFile(new URL('nav.json',out),JSON.stringify({colliders:K.colliders,surfaces:K.surfaces,ramps:K.ramps,
  spawn:{p:[0,1.62,-2],target:[0,1.6,-12]}}));
const inst=objects.filter(o=>o.instances).reduce((n,o)=>n+o.instances.length,0);
console.log(`roots ${roots.map(r=>r.name).join(' | ')}`);
console.log(`objects ${objects.length} (instanced ${objects.filter(o=>o.instances).length}, ${inst} instances), geometries ${geoms.length}, materials ${materials.length}, bin ${(offset/1e6).toFixed(1)} MB`);
console.log('skipped',skipped);
console.log('procedural texture images',textureImages.size,'; approved web photo assets',photoAssets.size);

// The guided tour, sampled from the web app's own tour code with the same floor
// following (supportY from main.js), so the Blender tour camera walks the same path.
{
  const {createPhotoTour}=await loadModule('../dist/src/tour.js');
  const navigation=main.slice(main.indexOf('function inside('),main.indexOf('function lookAt('));
  const {supportY}=new Function('K','THREE','farZ','farZinv',navigation+';return {supportY};')(K,THREE,farZ,farZinv);
  const photos=new Function('return ('+main.match(/const photos=(.*);/)[1]+')')();
  for(const m of main.matchAll(/photos\.(\w+)=(\{.*\});/g))photos[m[1]]=new Function('return ('+m[2]+')')();
  // Photo poses and the webapp's destinations, for native captures from the same viewpoints.
  const dm=main.indexOf('const destinations={'),de=main.indexOf('};',dm);
  const destinations=new Function('return ('+main.slice(dm+'const destinations='.length,de+1)+')')();
  for(const m of main.matchAll(/destinations\.(\w+)=(\{[^;]*?\});/g)){try{destinations[m[1]]=new Function('return ('+m[2]+')')();}catch{}}
  await fs.writeFile(new URL('views.json',out),JSON.stringify({...destinations,...photos}));
  const tour=createPhotoTour(photos,supportY,K.houseShiftX);
  const FPS=24,frames=[];let label=null;const markers=[];
  // As on the web: the one-time opening flight, then one loop from 'Along the lane'.
  const laneStart=tour.spans.find(s=>s.a.label==='Along the lane').start,introFrames=tour.intro?Math.ceil(tour.intro.duration*FPS):0;
  for(let f=0;f<=introFrames+Math.ceil(tour.duration*FPS);f++){
    const s=f<introFrames?tour.intro.sample(f/FPS):tour.sample(laneStart+(f-introFrames)/FPS);
    frames.push([...s.position.toArray().map(v=>+v.toFixed(4)),...s.quaternion.toArray().map(v=>+v.toFixed(5))]);
    if(s.label!==label){label=s.label;markers.push([f,label]);}
  }
  await fs.writeFile(new URL('tour.json',out),JSON.stringify({fps:FPS,fov:58,duration:(tour.intro?.duration||0)+tour.duration,frames,markers}));
  console.log(`tour ${tour.duration.toFixed(0)} s, ${frames.length} frames, ${markers.length} labels`);
}
