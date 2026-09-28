import * as THREE from 'three';

/** Approximate 2011–2013 landscape, based on the original tank photographs.
 * Ground and animated water are supplied by the application. Keep this group
 * at identity: all walkable surfaces and collision bounds use world metres.
 */
// 15.30.09 and the satellite tank width (26.5 m of water): the far bank stands 2 m closer
// than first built. West of FAR_X1 (the shop and east lane stay) everything past FAR_Z0 moves
// FAR_SHIFT toward the house; between FAR_Z0 and FAR_Z1 the side banks stretch linearly. main.js maps its terrain through this.
export const FAR_SHIFT=2,FAR_Z0=-29.5,FAR_Z1=-25.5,FAR_X1=52;
export function farZ(z,x=0){if(x>=FAR_X1)return z;return z<=FAR_Z0?z+FAR_SHIFT:z>=FAR_Z1?z:z+FAR_SHIFT*(FAR_Z1-z)/(FAR_Z1-FAR_Z0);}
export function farZinv(z,x=0){if(x>=FAR_X1)return z;const k=FAR_SHIFT/(FAR_Z1-FAR_Z0);return z<=FAR_Z0+FAR_SHIFT?z-FAR_SHIFT:z>=FAR_Z1?z:(z-k*FAR_Z1)/(1-k);}

export function buildLandscape(K, {mobile=false}={}) {
  const group = new THREE.Group();
  group.name = 'Shankaranarayana · tank and coconut grove';
  let seed = 927131;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const materials = {
    basalt: new THREE.MeshStandardMaterial({ color: '#424743', roughness: 1 }),
    wetStone: new THREE.MeshStandardMaterial({ color: '#293b30', roughness: .95 }),
    mortar: new THREE.MeshStandardMaterial({ color: '#606258', roughness: 1 }),
    oldWhite: new THREE.MeshStandardMaterial({ color: '#e5e2d6', roughness: .95 }),
    roofConcrete: new THREE.MeshStandardMaterial({ color: '#a39986', roughness: 1 }),
    path: new THREE.MeshStandardMaterial({ color: '#958b73', roughness: 1 }),
    redSoil: new THREE.MeshStandardMaterial({ color: '#8e604b', roughness: 1 }),
    darkSoil: new THREE.MeshStandardMaterial({ color: '#655c43', roughness: 1 }),
    turf: new THREE.MeshStandardMaterial({ color: '#536f39', roughness: 1 }),
    moss: new THREE.MeshStandardMaterial({ color: '#4a6638', roughness: 1 }),
    lane: new THREE.MeshStandardMaterial({ color: '#686961', roughness: .98 }),
    trunk: new THREE.MeshStandardMaterial({ color: '#a69d87', roughness: 1 }),
    trunkRings: new THREE.MeshStandardMaterial({ color: '#676555', roughness: 1 }),
    palm: new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: .85, side: THREE.DoubleSide }),
    dryPalm: new THREE.MeshStandardMaterial({ color: '#928052', roughness: 1, side: THREE.DoubleSide }),
    green: new THREE.MeshStandardMaterial({ color: '#456239', roughness: .95 }),
    coconut: new THREE.MeshStandardMaterial({ color: '#7d8050', roughness: 1 }),
    foliage: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }),
    grass: new THREE.MeshStandardMaterial({ color: '#708549', roughness: 1, side: THREE.DoubleSide }),
  };
  const box = (name, x, y, z, w, h, d, mat, solid = false, parent = group) =>
    K.box(parent, name, x, y, z, w, h, d, mat, solid);
  const batches = new Map();
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(.5, .5, 1, 10);
  const sphere = new THREE.IcosahedronGeometry(1, 1);
  const up = new THREE.Vector3(0, 1, 0);
  const transform = new THREE.Object3D();
  function instance(key, geometry, material, position, scale, quaternion, color) {
    if (!batches.has(key)) batches.set(key, { geometry, material, instances: [] });
    transform.position.set(...position);
    transform.scale.set(...scale);
    transform.quaternion.copy(quaternion || new THREE.Quaternion());
    transform.updateMatrix();
    batches.get(key).instances.push({ matrix: transform.matrix.clone(), color });
  }
  function blockBatch(key, material, x, y, z, w, h, d, color) {
    instance(key, cube, material, [x, y, z], [w, h, d], null, color);
  }
  function segment(key, material, a, b, radiusA, radiusB = radiusA, geometry = cylinder) {
    const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b);
    const direction = bv.clone().sub(av);
    const q = new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize());
    instance(key, geometry, material, av.add(bv).multiplyScalar(.5).toArray(),
      [radiusA + radiusB, direction.length(), radiusA + radiusB], q);
  }

  // The two front-of-house photographs are opposite views down this same lane.
  // It reaches the adjacent building and bends into the grove at the western end.
  const roadCurve=new THREE.CatmullRomCurve3([[-77,0,-22],[-62,0,-16],[-49,0,-9.5],[-35,0,-5.8],[-18,0,-5],[0,0,-5],[36,0,-5],[57,0,-5]].map(p=>new THREE.Vector3(...p)));
  // 14.58.40: the lane climbs gently after passing the house and car.
  const roadRise=x=>1.9*THREE.MathUtils.smoothstep(-x,12,52)+.4*THREE.MathUtils.smoothstep(-x,52,77);
  const roadSamples=roadCurve.getPoints(130);
  roadSamples.forEach(p=>{p.y=roadRise(p.x);});
  const roadHalfWidth=p=>1.70+.50*THREE.MathUtils.smoothstep(p.x,9,28);
  function roadRibbon(name,extra,height,material){
    const positions=[],uv=[],indices=[];
    roadSamples.forEach((p,i)=>{
      const prev=roadSamples[Math.max(i-1,0)],next=roadSamples[Math.min(i+1,roadSamples.length-1)];
      const dir=next.clone().sub(prev).normalize(),normal=new THREE.Vector3(-dir.z,0,dir.x);
      const width=roadHalfWidth(p)+extra+(extra?Math.sin(i*2.7)*.15:Math.sin(i*1.9)*.035);
      for(const side of [-1,1]){const v=p.clone().addScaledVector(normal,width*side);positions.push(v.x,p.y+height,v.z);uv.push(i*.11,(side+1)/2);}
      if(i){const j=(i-1)*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
      if(!extra&&i){
        const a=roadSamples[i-1];
        K.ramp((a.x+p.x)/2,(a.z+p.z)/2,p.x-a.x+.02,width*2+1.4+Math.abs(p.z-a.z),'-x',p.y+.051,a.y+.051);
      }
    });
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    const ribbon=new THREE.Mesh(geometry,material);ribbon.name=name;group.add(ribbon);
  }
  const laneCanvas=document.createElement('canvas');laneCanvas.width=laneCanvas.height=256;const laneContext=laneCanvas.getContext('2d');laneContext.fillStyle='#716c6c';laneContext.fillRect(0,0,256,256);
  for(let i=0;i<6000;i++){const shade=70+Math.floor(random()*80);laneContext.fillStyle=`rgba(${shade},${shade},${shade},.3)`;laneContext.fillRect(random()*256,random()*256,1,1);}
  // 14.58.35 / 15.00.01: patched, sun-faded asphalt with crumbling edges that
  // expose the red laterite. A private PRNG keeps the grove sequence stable.
  {let n=40417;const r=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};const c=laneContext;
   // Soft blotches (radial gradients; canvas filters are unavailable on iOS).
   const blob=(x,y,rx,ry,rgb,a)=>{for(const dx of [-256,0,256]){c.save();c.translate(x+dx,y);c.scale(rx,ry);const g=c.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(1,`rgba(${rgb},0)`);c.fillStyle=g;c.beginPath();c.arc(0,0,1,0,7);c.fill();c.restore();}};
   for(let i=0;i<40;i++)blob(r()*256,30+r()*196,14+r()*50,6+r()*18,'128,125,120',.25+r()*.25);
   for(let i=0;i<22;i++)blob(r()*256,30+r()*196,8+r()*28,5+r()*12,'50,50,52',.3+r()*.3);
   for(const y of [78,178]){const gr=c.createLinearGradient(0,y-24,0,y+24);gr.addColorStop(0,'rgba(150,146,140,0)');gr.addColorStop(.5,'rgba(150,146,140,.22)');gr.addColorStop(1,'rgba(150,146,140,0)');c.fillStyle=gr;c.fillRect(0,y-24,256,48);}
   c.strokeStyle='rgba(40,40,42,.22)';c.lineWidth=.7;for(let i=0;i<14;i++){let x=r()*256,y=30+r()*196;c.beginPath();c.moveTo(x,y);for(let k=0;k<6;k++){x+=r()*14-4;y+=r()*12-6;c.lineTo(x,y);}c.stroke();}
   for(const top of [true,false]){c.fillStyle='#8f5f48';c.beginPath();c.moveTo(0,top?0:256);for(let x=0;x<=256;x+=8){const d=3+r()*9+(r()<.15?r()*16:0);c.lineTo(x,top?d:256-d);}c.lineTo(256,top?0:256);c.fill();
    for(let i=0;i<220;i++){c.fillStyle=r()<.5?'rgba(185,132,106,.55)':'rgba(90,60,46,.5)';c.fillRect(r()*256,top?r()*10:246+r()*10,1+r()*2,1+r()*2);}}
  }
  const laneMap=new THREE.CanvasTexture(laneCanvas);laneMap.colorSpace=THREE.SRGBColorSpace;laneMap.wrapS=laneMap.wrapT=THREE.RepeatWrapping;materials.lane.map=laneMap;materials.lane.color.set('#ffffff');
  // Worn laterite shoulders, with grass creeping in from the outer edge.
  const shoulder=materials.redSoil.clone();
  {const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');let n=51137;const r=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
   x.fillStyle='#96604a';x.fillRect(0,0,256,128);
   for(let i=0;i<2600;i++){const l=r()>.5;x.fillStyle=l?'rgba(190,138,108,.5)':'rgba(96,62,46,.45)';x.fillRect(r()*256,r()*128,1+r()*2.5,1+r()*2.5);}
   for(let i=0;i<40;i++){x.fillStyle=`rgba(170,120,90,${.15+r()*.2})`;x.fillRect(r()*256,10+r()*108,10+r()*40,3+r()*10);}
   for(const top of [true,false])for(let i=0;i<300;i++){const d=Math.pow(r(),2.2)*16;x.fillStyle=r()<.6?`rgba(92,122,56,${.5+r()*.4})`:`rgba(62,88,40,${.5+r()*.4})`;x.fillRect(r()*256,top?d:127-d,1+r()*3,1+r()*4);}
   const m=new THREE.CanvasTexture(c);m.colorSpace=THREE.SRGBColorSpace;m.wrapS=m.wrapT=THREE.RepeatWrapping;m.anisotropy=4;shoulder.map=m;shoulder.color.set('#ffffff');}
  roadRibbon('Irregular laterite shoulders of the front lane',.70,.029,shoulder);
  roadRibbon('Narrow asphalt lane curving away from the temple',0,.051,materials.lane);
  // Sloping earth joins the raised asphalt shoulder back to the existing ground.
  for(const side of [-1,1]){
    const positions=[],indices=[];
    roadSamples.forEach((p,i)=>{
      const a=roadSamples[Math.max(0,i-1)],b=roadSamples[Math.min(130,i+1)];
      const normal=new THREE.Vector3(-(b.z-a.z),0,b.x-a.x).normalize();
      for(const outer of [false,true]){
        const v=p.clone().addScaledVector(normal,side*(roadHalfWidth(p)+(outer?4.8:.65)));
        positions.push(v.x,outer?.017:p.y+.025,v.z);
      }
      if(i&&p.x<-12){const j=(i-1)*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
    });
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const soil=materials.redSoil.clone();soil.side=THREE.DoubleSide;
    const bank=new THREE.Mesh(geometry,soil);bank.name='Rising lane earth embankment';group.add(bank);
  }
  box('Adjacent building laterite forecourt',56.5,.024,-5,7,.046,15,materials.redSoil);K.surface(56.5,-5,7,15,.047);
  // Family correction, 14.58.48: a narrow unpaved road separates the home
  // and the temple's right edge. It branches off the lake-facing asphalt lane.
  const sideRoadSeed=seed; // New grit must not reshuffle the established grove.
  const sideRoadCurve=new THREE.CatmullRomCurve3([[18,-4.6],[18.2,1],[18.2,8],[17.4,18],[17.2,27],[17.0,34]].map(([x,z])=>new THREE.Vector3(x,.043,z)));
  const dirtCanvas=document.createElement('canvas');dirtCanvas.width=dirtCanvas.height=256;const dirtContext=dirtCanvas.getContext('2d');
  dirtContext.fillStyle='#98604a';dirtContext.fillRect(0,0,256,256);
  for(let i=0;i<15000;i++){
    const light=random()>.47;dirtContext.fillStyle=light?'#b9846a88':'#6a443577';
    dirtContext.fillRect(random()*256,random()*256,random()*2+.4,random()*2+.4);
  }
  const dirtMap=new THREE.CanvasTexture(dirtCanvas);dirtMap.colorSpace=THREE.SRGBColorSpace;dirtMap.wrapS=dirtMap.wrapT=THREE.RepeatWrapping;dirtMap.anisotropy=8;
  const dirtMaterial=new THREE.MeshStandardMaterial({map:dirtMap,bumpMap:dirtMap,bumpScale:.018,roughness:1});
  const sideRoadSamples=sideRoadCurve.getPoints(100),sidePositions=[],sideUV=[],sideIndices=[];
  sideRoadSamples.forEach((p,i)=>{
    const tangent=sideRoadCurve.getTangent(i/100),normal=new THREE.Vector3(-tangent.z,0,tangent.x);
    const half=1.65+1.0*(1-THREE.MathUtils.smoothstep(p.z,-3,3))+.06*Math.sin(i*1.3);
    for(const side of [-1,1]){const v=p.clone().addScaledVector(normal,half*side);sidePositions.push(...v.toArray());sideUV.push((side+1)*1.4,p.z*.85);}
    if(i){const j=(i-1)*2;sideIndices.push(j,j+1,j+2,j+1,j+3,j+2);}
    if(i%2===0)K.surface(p.x,p.z,half*2,.86,.043);
    if(i%2===0)for(const side of [-1,1]){
      const v=p.clone().addScaledVector(normal,(half+range(.0,.22))*side);
      blockBatch('Small gravel along temple side road',materials.path,v.x,.065,v.z,range(.04,.12),range(.02,.06),range(.05,.14));
    }
  });
  const sideRoadGeometry=new THREE.BufferGeometry();sideRoadGeometry.setAttribute('position',new THREE.Float32BufferAttribute(sidePositions,3));sideRoadGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(sideUV,2));sideRoadGeometry.setIndex(sideIndices);sideRoadGeometry.computeVertexNormals();
  const sideRoadMesh=new THREE.Mesh(sideRoadGeometry,dirtMaterial);sideRoadMesh.name='Dirt road between house and temple';sideRoadMesh.receiveShadow=true;group.add(sideRoadMesh);
  seed=sideRoadSeed;
  for (let i = 0; i < 70; i++) {
    const p=roadSamples[Math.floor(range(3,128))],x=p.x,z=p.z+(random()<.5?-1:1)*range(roadHalfWidth(p)+.1,roadHalfWidth(p)+.65);
    blockBatch('loose shoulder stones', materials.path, x, roadRise(x)+.042, z, range(.12, .43), .05, range(.1, .3));
  }

  // Upper footpaths form a complete loop. The southern path connects to lane.
  const paths = [
    [18, -10.1, 78.4, 2.2], [18, -44.9, 78.4, 2.2],
    [-20.1, -27.5, 2.2, 32.6], [51.5, -27.5, 2.2, 32.6],
    [-20.1, -8.1, 2.2, 2.1], [51.5, -8.1, 2.2, 2.1],
  ];
  // 14.28.19 / 14.58.02: the house-side strip is worn grass over laterite, not paving.
  const verge=materials.turf.clone();verge.color.set('#ffffff');
  if(typeof document!=='undefined'){
    const c=document.createElement('canvas');c.width=512;c.height=64;const x=c.getContext('2d');
    x.fillStyle='#5d7a3c';x.fillRect(0,0,512,64);
    for(let i=0;i<900;i++){const g=random();x.fillStyle=g<.18?`rgba(150,88,58,${.35+random()*.5})`:g<.6?`rgba(112,138,68,${.3+random()*.5})`:`rgba(58,84,40,${.3+random()*.5})`;x.fillRect(random()*512,random()*64,2+random()*(g<.18?26:9),2+random()*(g<.18?9:5));}
    // Repaint (the loop above still runs so later seeded placement is unchanged):
    // fine mown-grass speckle with soft worn laterite patches.
    c.width=1024;c.height=128;let n=60221;const r=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
    x.fillStyle='#627f3e';x.fillRect(0,0,1024,128);
    const soft=(px,py,rx,ry,rgb,a)=>{for(const dx of [-1024,0,1024])for(const dy of [-128,0,128]){x.save();x.translate(px+dx,py+dy);x.scale(rx,ry);const g=x.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(.6,`rgba(${rgb},${a*.6})`);g.addColorStop(1,`rgba(${rgb},0)`);x.fillStyle=g;x.beginPath();x.arc(0,0,1,0,7);x.fill();x.restore();}};
    for(let i=0;i<60;i++)soft(r()*1024,r()*128,20+r()*60,10+r()*30,r()<.5?'120,146,70':'70,96,46',.35+r()*.3);
    for(let i=0;i<22;i++)soft(r()*1024,r()*128,12+r()*50,8+r()*22,'150,98,70',.45+r()*.35);
    for(let i=0;i<14000;i++){const v=r();x.fillStyle=v<.35?'rgba(140,166,88,.7)':v<.7?'rgba(66,92,44,.6)':v<.93?'rgba(96,124,58,.7)':'rgba(170,120,90,.5)';x.fillRect(r()*1024,r()*128,1,1+r()*3);}
    verge.map=new THREE.CanvasTexture(c);verge.map.colorSpace=THREE.SRGBColorSpace;verge.map.wrapS=verge.map.wrapT=THREE.RepeatWrapping;verge.map.repeat.set(.12,.9);verge.map.anisotropy=4;
  }
  for (const [i, p] of paths.entries()) {
    if(i===0){
      // The old full-width strip covered the water-facing stairs at ground level.
      for(const [a,b] of [[-21.2,-5.05],[49.4,57.2]]){
        box('tank perimeter path 0',(a+b)/2,.026,p[1],b-a,.052,p[3],verge);
        K.surface((a+b)/2,p[1],b-a,p[3],.052);
      }
      continue;
    }
    if(i===1){
      for(const [a,b] of [[-21.2,-3.5],[-1.1,32.9],[35.1,57.2]]){
        box('tank perimeter path 1',(a+b)/2,.026,p[1],b-a,.052,p[3],materials.path);
        K.surface((a+b)/2,p[1],b-a,p[3],.052);
      }
      continue;
    }
    box(`tank perimeter path ${i}`, p[0], .026, p[1], p[2], .052, p[3], i===0||i===3||i===5?verge:materials.path);
    K.surface(p[0], p[1], p[2], p[3], .052);
  }
  // A little broken paving, inset into rather than blocking the walking route.
  for (let i = 0; i < 68; i++) {
    const north = i % 2 === 0, x = range(-20.3, 56.3), z = north ? -10.1 : -44.9;
    if(!north){
      const zz=z+range(-.72,.72),w=range(.38,1.0),d=range(.32,.63),color=new THREE.Color().setScalar(range(.77,1.15));
      if(x+w/2>-3.5&&x-w/2<-1.1&&zz+6+d/2>-38.4)continue;
      if(x+w/2>32.9&&x-w/2<35.1&&zz+6+d/2>-38.8)continue;
      blockBatch('path paving variation',materials.mortar,x,.057,zz,w,.012,d,color);
    }
  }

  // Tank retaining courses. An unobstructed inset ledge sits just above water.
  // 15.20.13, 14.59.54 and 15.28.26 place the east wall at x 49.4, where the
  // bathing arcade meets the corner, leaving a wide lawn in front of the shop.
  // Satellite imagery of the site (2026) sets the rest: about 43 x 26.5 m of water,
  // starting in front of the house (family memory: 14.41.43, 15.28.45) with its west wall a
  // path's width from the hall with the Vipra Bhavana sign (15.30.09), and the near
  // bank about 4 m from the lane's centre line.
  const lake = { x: 22.2, z: -23, w: 54.4, d: 28 };
  box('tank basin floor', lake.x, -3.08, lake.z, lake.w, .18, lake.d, materials.wetStone);
  K.blocker(lake.x, lake.z, lake.w-3.5, lake.d-3.5, -8, -1.95);
  function ringCourse(inset, thickness, top, height, name, mat, farTop = top) {
    const w = lake.w - 2 * inset, d = lake.d - 2 * inset;
    // Leave real notches through every course for the side-bank descents.
    for(const [a,b] of [[lake.z-d/2,-23.5],[-20.8,lake.z+d/2]])
      box(`${name} east`,lake.x+w/2-thickness/2,top-height/2,(a+b)/2,thickness,height,b-a,mat);
    for(const [a,b] of [[lake.z-d/2,-25.2],[-22.8,lake.z+d/2]])
      box(`${name} west`,lake.x-w/2+thickness/2,top-height/2,(a+b)/2,thickness,height,b-a,mat);
    // Leave the paired stairs and low connecting path exposed, rather than
    // burying them inside the old continuous retaining courses.
    for(const [a,b] of [[lake.x-w/2+thickness,16.4],[29.6,lake.x+w/2-thickness]])
      box(`${name} near`,(a+b)/2,top-height/2,lake.z+d/2-thickness/2,b-a,height,thickness,mat);
    for(const [a,b] of [[lake.x-w/2+thickness,-3.5],[-1.1,12.10],[14.40,32.9],[35.1,lake.x+w/2-thickness]])
      if(b>a)
      box(`${name} far`,(a+b)/2,farTop-(height+farTop-top)/2,lake.z-d/2+thickness/2,b-a,height+farTop-top,thickness,mat);
  }
  // 14.57.50 / 14.58.26: the tank masonry is dark brown-grey laterite blotched
  // with black mould and green moss, brightest along the dry upper edges.
  const tankWall=materials.basalt.clone();
  if(typeof document!=='undefined'){
    const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');let n=77003;const r=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
    x.fillStyle='#5a554a';x.fillRect(0,0,256,256);
    const blob=(px,py,rx,ry,rgb,a)=>{for(const dx of [-256,0,256])for(const dy of [-256,0,256]){x.save();x.translate(px+dx,py+dy);x.scale(rx,ry);const g=x.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(1,`rgba(${rgb},0)`);x.fillStyle=g;x.beginPath();x.arc(0,0,1,0,7);x.fill();x.restore();}};
    for(let i=0;i<34;i++)blob(r()*256,r()*256,14+r()*40,10+r()*30,'28,30,24',.35+r()*.35);
    for(let i=0;i<22;i++)blob(r()*256,r()*256,8+r()*26,6+r()*16,'78,94,48',.3+r()*.35);
    for(let i=0;i<14;i++)blob(r()*256,r()*256,10+r()*30,6+r()*18,'128,122,106',.25+r()*.3);
    for(let i=0;i<70;i++){const px=r()*256,py=r()*256,h=16+r()*50;x.fillStyle=`rgba(24,26,20,${.12+r()*.2})`;x.fillRect(px,py,1+r()*3,h);}
    for(let i=0;i<900;i++){x.fillStyle=r()<.5?'rgba(150,140,120,.18)':'rgba(20,22,18,.22)';x.fillRect(r()*256,r()*256,1+r()*2,1+r()*2);}
    tankWall.map=new THREE.CanvasTexture(c);tankWall.map.colorSpace=THREE.SRGBColorSpace;tankWall.map.wrapS=tankWall.map.wrapT=THREE.RepeatWrapping;tankWall.map.repeat.set(.55,.55);tankWall.color.set('#ffffff');K.worldMap(tankWall,.275);
  }
  // 14.57.50 / 14.58.26 / 15.21.56 / 15.22.00: the far bank rises in three tall tiers
  // to a ledge, then a wall to ground level behind it. The user confirmed the
  // water at -2.1 m: keep bank elevations and expose the full retaining height.
  const FAR_LEDGE=.28,FAR_TOP=1.38;
  ringCourse(0, .52, -.08, 2.52, 'upper dark stone retaining course', tankWall, FAR_LEDGE);
  ringCourse(.50, .45, -.60, 2.0, 'middle worn stone tread', tankWall, -.35);
  ringCourse(.93, .48, -1.15, 1.45, 'low mossy stone tread', materials.wetStone, -.98);
  ringCourse(1.39, .36, -1.70, .90, 'submerged tank course', materials.wetStone, -1.61);
  for(const [a,b] of [[-4.6,16.4],[29.6,48.8]])K.surface((a+b)/2,-9.73,b-a,.40,-.60);
  for(const [a,b] of [[-4.6,-3.5],[-1.1,12.10],[14.40,32.9],[35.1,48.8]])K.surface((a+b)/2,-36.27,b-a,.40,-.35);
  for(const [a,b] of [[-36.25,-25.2],[-22.8,-9.75]])K.surface(-4.67,(a+b)/2,.40,b-a,-.60);
  for(const [a,b] of [[-36.25,-23.5],[-20.8,-9.75]])K.surface(48.67,(a+b)/2,.40,b-a,-.60);
  // Keep later planting stable when the longer shoreline needs more stones.
  const bankDetailSeed=seed;
  // Faint joints and irregular replacement stones read at human eye height.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 49; i++) {
      const x = -4.1 + i * 1.08;
      const stoneColor=new THREE.Color().setScalar(range(.73,1.23));
      // Keep the seeded planting sequence stable while clearing stair masonry.
      if(side<0&&([[12.1,14.4],[-3.5,-1.1],[32.9,35.1]].some(([a,b])=>x+.515>a&&x-.515<b)))continue;
      blockBatch('bank individual masonry', materials.basalt, x, -.34, side < 0 ? -36.985 : -9.015, 1.03, .34, .027, stoneColor);
    }
    for (let i = 0; i < 25; i++) {
      blockBatch('bank individual masonry', materials.basalt, lake.x + side * (lake.w / 2 - .015), -.34, -36.25 + i * 1.08, .027, .34, 1.03, new THREE.Color().setScalar(range(.73, 1.23)));
    }
  }

  seed=bankDetailSeed;for(let i=0;i<120;i++)random();

  // 14.58.02: substantial whitewashed stone piers and dark masonry rails,
  // with the house-facing run and temple-side access identified separately.
  function agedBoundaryMaterial(base,whitewash=false){
    const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,256,256);
    let n=271;const noise=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
    for(let i=0;i<2200;i++){
      const x=noise()*256,y=noise()*256;ctx.fillStyle=whitewash?`rgba(41,49,39,${.02+noise()*.10})`:`rgba(160,163,137,${.02+noise()*.21})`;
      ctx.fillRect(x,y,1+noise()*13,2+noise()*19);
    }
    for(let i=0;i<160;i++){ctx.fillStyle=`rgba(46,64,31,${.08+noise()*.19})`;ctx.fillRect(noise()*256,165+noise()*91,1+noise()*9,2+noise()*28);}
    const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
    map.wrapS=map.wrapT=THREE.RepeatWrapping;
    return K.worldMap(new THREE.MeshStandardMaterial({map,roughness:1}),.45);
  }
  const fenceStone=agedBoundaryMaterial('#454a41'),fenceWhite=agedBoundaryMaterial('#dbdcd1',true);
  function railRun(x1,z1,x2,z2,name){
    const length=Math.hypot(x2-x1,z2-z1),n=Math.max(1,Math.ceil(length/3.7));
    const horizontal=Math.abs(x2-x1)>Math.abs(z2-z1);
    for(let i=0;i<=n;i++){
      const t=i/n,x=x1+t*(x2-x1),z=z1+t*(z2-z1);
      blockBatch('Tank weathered white masonry pier',fenceWhite,x,.77,z,.32,1.48,.32);
      blockBatch('Tank dark stepped pier foundation',fenceStone,x,.17,z,.53,.34,.53);
      blockBatch('Tank white pier lower moulding',fenceWhite,x,.37,z,.42,.14,.42);
      blockBatch('Tank weathered pier cap',fenceStone,x,1.53,z,.40,.10,.40);
    }
    for(const [y,h] of [[.15,.20],[.55,.13],[1.10,.16]])blockBatch('Tank dark masonry crossrails',fenceStone,(x1+x2)/2,y,(z1+z2)/2,horizontal?length:.16,h,horizontal?.16:length);
    K.blocker((x1+x2)/2,(z1+z2)/2,horizontal?length+.3:.3,horizontal?.3:length+.3,0,1.59);
  }
  // 14.58.02 + 15.23.35: across the house the parapet stands at the water's edge with
  // a grass verge on the lane side. At the bathing gate it jogs about a metre toward
  // the lane: the short run beside the gate's approach is the passage's lane-side wall,
  // and the gap between the two lines opens onto the lake.
  const houseBankZ=-8.3, waterRailZ=-10.0, bathingGateX=16.4, bathingGateZ=-9.65;
  for(const [a,b,z] of [[-5.05,12.35,waterRailZ],[12.35,14.4,houseBankZ]]){
    for(const [y,h] of [[.14,.28],[1.00,.20]])box('Tank roadside stone parapet rail',(a+b)/2,y,z,b-a,h,.38,fenceStone);
    for(let x=a+.12;x<b;x+=.48)blockBatch('Tank roadside pierced stone parapet',fenceStone,x,.57,z,.19,.69,.29);
    K.blocker((a+b)/2,z,b-a,.39,0,1.13);
  }
  box('House bank grass verge to the water rail',3.65,-.06,-9.5,17.4,.12,1.0,materials.grass);
  K.surface(3.65,-9.5,17.4,1.0,0);
  box('House bank masonry below the verge',3.65,-1.35,-9.6,17.4,2.50,1.2,fenceStone);
  for(const [x,z] of [[-4.95,waterRailZ],[-1.49,waterRailZ],[1.97,waterRailZ],[5.43,waterRailZ],[8.89,waterRailZ],[12.35,waterRailZ],[12.35,houseBankZ]]){
    box('Tank roadside substantial stone pier',x,.63,z,.59,1.26,.59,fenceWhite,true);
    const capGeometry=new THREE.CylinderGeometry(.34,.46,.21,4);capGeometry.rotateY(Math.PI/4);
    const cap=new THREE.Mesh(capGeometry,fenceStone);cap.name='Tank roadside sloped square pier cap';cap.position.set(x,1.33,z);group.add(cap);
  }
  // 15.26.49 / 15.26.55: sparse plants emerge through the dark railing
  // and ledge cracks. Independent placement keeps the surrounding grove stable.
  const creviceLeaf=new THREE.BufferGeometry();
  creviceLeaf.setAttribute('position',new THREE.Float32BufferAttribute([
    0,0,0, -.42,.42,0, 0,.48,.13,
    -.42,.42,0, 0,1,0, 0,.48,.13,
    0,1,0, .42,.42,0, 0,.48,.13,
    .42,.42,0, 0,0,0, 0,.48,.13],3));
  creviceLeaf.computeVertexNormals();
  const creviceGreen=new THREE.MeshStandardMaterial({color:'#7a9453',roughness:.94,side:THREE.DoubleSide});
  for(let plant=0;plant<17;plant++){
    const x=-4.5+plant*1.12+Math.sin(plant*3.7)*.23;
    const base=plant%4===0?-.5:.29+(plant%3)*.14;
    const z=plant%4===0?-10.4:-10.21;
    for(let shoot=0;shoot<3;shoot++){
      const dx=Math.sin(plant*2.1+shoot*2.4)*.23;
      const height=.22+((plant*3+shoot*5)%7)*.035;
      segment('Lake railing crevice stems',materials.green,[x,base,z],[x+dx,base+height,z-.09],.004);
      for(let pair=0;pair<3;pair++)for(const side of [-1,1]){
        const t=.27+pair*.23,angle=side*(.7+pair*.10);
        const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.35,plant*.83+shoot,angle));
        instance('Lake railing pointed crevice leaves',creviceLeaf,creviceGreen,
          [x+dx*t,base+height*t,z-.09*t],[.12,.12+pair*.02,.12],q);
      }
    }
  }
  // 15.28.13: the entrance crosses the bank at right angles to the
  // house-facing rail. Descend along +X, then follow the low waterside ledge.
  for(const z of [-8.25,-11.05]){
    for(const [y,w,h] of [[.29,.75,.58],[.77,.62,.38],[1.10,.49,.28],[1.31,.39,.14]])box('Tank gate square stepped stone pier',bathingGateX,y,z,w,h,w,fenceWhite,true);
    for(const y of [.55,.96,1.25])box('Tank gate pale worn pier seam',bathingGateX,y,z,.53,.035,.53,fenceStone);
  }
  // Open iron leaf rests along the stair edge; the passage stays clear.
  for(const x of [16.45,17.27])box('Tank narrow iron gate upright',x,.51,-10.87,.035,.92,.035,'metal');
  for(const y of [.12,.94])box('Tank narrow iron gate rail',16.86,y,-10.87,.85,.035,.035,'metal');
  for(let x=16.56;x<17.27;x+=.13)box('Tank metal gate bars',x,.53,-10.87,.017,.82,.022,'metal');
  box('Bathing gate approach masonry',15.18,-.35,-9.4,2.45,.69,2.85,materials.basalt);
  box('Bathing gate approach landing',15.18,-.005,-9.4,2.45,.12,2.85,materials.path);
  K.surface(15.18,-9.4,2.45,2.85,.055);
  // Long masonry ledges descend lakeward below the house-side water rail.
  for(const [z,y,d] of [[-10.4,-.65,.3],[-10.7,-1.2,.3],[-11,-1.75,.3]]){
    box('House bank continuous retaining ledge',4.7,(y-2.6)/2,z,18.8,y+2.6,d,fenceStone);
    K.surface(4.7,z,18.8,d,y);
  }
  // The panorama shows the bathing shelter parallel to the temple-facing bank.
  // 14.59.39 / 15.14.07: the lake entrance building. A raised slab open to the
  // lane, square stepped white pillars on red-oxide bases about 2.6 m apart,
  // and at the west end a solid whitewashed block with a tiled dado, the
  // orange sign and a tap. The first bay beside it is the way down to the water.
  box('Bathing arcade raised floor slab',39,-.015,-9.0,19.2,.16,3.1,materials.path);
  K.surface(39,-9.0,19.2,3.1,.065);
  box('Bathing arcade slab worn front edge',39,.03,-7.47,19.2,.07,.06,materials.mortar);
  const dadoTiles=materials.oldWhite.clone();
  if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');
    x.fillStyle='#e6e5de';x.fillRect(0,0,64,64);x.strokeStyle='#aaa89e';x.lineWidth=2;for(let i=0;i<=64;i+=16){x.beginPath();x.moveTo(i,0);x.lineTo(i,64);x.moveTo(0,i);x.lineTo(64,i);x.stroke();}
    dadoTiles.map=new THREE.CanvasTexture(c);dadoTiles.map.colorSpace=THREE.SRGBColorSpace;dadoTiles.map.wrapS=dadoTiles.map.wrapT=THREE.RepeatWrapping;dadoTiles.map.repeat.set(3,3);dadoTiles.color.set('#ffffff');}
  const pillarRed=materials.oldWhite.clone();pillarRed.color.set('#9a4a3a');
  for(const x of [32.6,35.2,37.8,40.4,43.0,45.6])for(const z of [-10.24,-7.77]){
    box('Bathing arcade red-oxide pillar base',x,.065+.11,z,.40,.22,.40,pillarRed,true);
    box('Bathing arcade white-tiled pillar foot',x,.065+.61,z,.36,.78,.36,dadoTiles);
    box('Bathing arcade square white pillar',x,.065+1.4,z,.29,1.6,.29,materials.oldWhite,true);
    for(const y of [1.3,1.8])box('Bathing arcade stepped pillar collar',x,.065+y,z,.37,.2,.37,materials.oldWhite);
    box('Bathing arcade pillar capital block',x,2.34,z,.36,.14,.36,materials.oldWhite);
  }
  // The block holds the lane-side corner; the way down to the water passes behind it.
  // 14.59.39 / 15.11.58: the west end is only a tiled pedestal carrying a stepped white
  // pillar, with a black plaque. 15.14.02 / 15.14.07 / 15.13.26: the east end bay is a
  // whitewashed room under the roof's gable, with the orange sign and the tap on its lane face.
  box('Lake entrance west tiled pedestal',30.15,.065+.55,-7.9,.62,1.1,.62,dadoTiles,true);
  box('Lake entrance west stepped white pillar',30.15,1.85,-7.9,.3,1.5,.3,materials.oldWhite,true);
  box('Lake entrance west pillar collar',30.15,1.25,-7.9,.38,.16,.38,materials.oldWhite);
  box('Lake entrance black plaque',30.15,1.3,-7.585,.5,.32,.02,new THREE.MeshStandardMaterial({color:'#1b1b1a',roughness:.5}));
  box('Lake entrance east whitewashed room',47.9,1.28,-9.0,2.0,2.45,2.5,materials.oldWhite,true);
  box('Lake entrance east room tiled dado',47.9,.065+.55,-9.0,2.04,1.1,2.54,dadoTiles);
  box('Lake entrance east room dark doorway',47.9,1.05,-10.26,.8,1.9,.02,new THREE.MeshStandardMaterial({color:'#2a2622',roughness:.9}));
  box('Lake entrance orange painted sign',47.9,1.55,-7.735,.95,.62,.02,new THREE.MeshStandardMaterial({color:'#d77a36',roughness:.8}));
  K.beam(group,'Lake entrance brass tap pipe',[48.55,.95,-7.73],[48.55,.55,-7.62],.03,'metal');
  box('Lake entrance yellow notice board',29.2,1.45,-7.15,.08,.5,.66,new THREE.MeshStandardMaterial({color:'#d1a53a',roughness:.85}));
  box('Lake entrance notice board post',29.2,.72,-7.15,.06,1.44,.06,'metal');
  K.gableRoof(group,'Long lakeside bathing arcade tiled roof',39,-9.0,20.1,3.6,2.57,.93);
  for(const z of [-10.24,-7.77])K.beam(group,'Bathing arcade dark beam',[29.5,2.5,z],[48.5,2.5,z],.17,'wood',.2);
  // 15.27.07 / 15.27.10: lake-facing pierced masonry beneath the arcade.
  const arcadePlaster=K.M.plaster.clone();arcadePlaster.color.set('#c0b39f');
  const arcadeScreen=new THREE.Shape();arcadeScreen.moveTo(-9.10,.20);
  arcadeScreen.lineTo(9.10,.20);arcadeScreen.lineTo(9.10,.89);arcadeScreen.lineTo(-9.10,.89);arcadeScreen.closePath();
  for(let row=0;row<3;row++)for(let x=-8.92+(row%2)*.17;x<8.99;x+=.34){
    const y=.32+row*.18,hole=new THREE.Path();
    hole.moveTo(x-.058,y-.054);hole.lineTo(x-.058,y+.054);
    hole.lineTo(x+.058,y+.054);hole.lineTo(x+.058,y-.054);hole.closePath();arcadeScreen.holes.push(hole);
  }
  const arcadeWall=new THREE.Mesh(new THREE.ExtrudeGeometry(arcadeScreen,{depth:.16,bevelEnabled:false}),arcadePlaster);
  arcadeWall.name='Bathing arcade lake-facing pierced masonry';arcadeWall.position.set(39,0,-10.31);
  arcadeWall.castShadow=arcadeWall.receiveShadow=true;group.add(arcadeWall);
  box('Bathing arcade lake-facing coping',39,.94,-10.23,18.35,.10,.27,materials.oldWhite);
  box('Bathing arcade pink lower wall band',39,.30,-10.14,18.35,.2,.02,new THREE.MeshStandardMaterial({color:'#c48b83',roughness:.9}));
  box('Bathing arcade dark waterline foundation',39,-1.23,-10.23,18.35,2.74,.27,materials.wetStone);
  K.blocker(39,-10.23,18.35,.27,-2.6,.99);

  // Opposite the mud road, the long low dark wall spans the temple's right wing.
  box('Temple bank dark retaining parapet',23.2,.42,-8.3,10.8,.84,.26,materials.basalt,true);
  for(let x=18.2;x<28.6;x+=2.5)box('Temple bank white vertical joint',x,.45,-8.45,.055,.76,.015,materials.oldWhite);
  // 14.58.26: whitewashed pilaster strips about 5.6 m apart run down the full
  // retaining face, and every tier carries a worn white nosing.
  for(const [a,b] of [[-5.05,-3.5],[-1.1,9.0],[9.7,16.8],[17.5,31.4],[36.6,50.05]]){
    box('Opposite bank solid weathered parapet',(a+b)/2,.71,-37.68,b-a,1.42,.29,tankWall,true);
    box('Opposite bank worn white horizontal seam',(a+b)/2,.34,-37.515,b-a,.075,.024,fenceWhite);
    box('Opposite bank white coping edge',(a+b)/2,1.40,-37.53,b-a,.05,.04,fenceWhite);
    const bays=Math.max(1,Math.round((b-a)/5.6));
    for(let j=0;j<=bays;j++){const x=a+(b-a)*j/bays;
      box('Opposite bank whitewashed pilaster strip',x,.66,-37.515,.16,1.52,.03,fenceWhite);
      for(const [top,z] of [[FAR_LEDGE,-36.47],[-.35,-36.04],[-.98,-35.58],[-1.61,-35.23]])if(x>-4.6&&x<48.7&&!(x>12&&x<14.5)&&!(x>-3.5&&x<-1.1))box('Opposite bank tier pilaster strip',x,top-.30,z,.16,.60,.02,fenceWhite);}
  }
  for(const [a,b] of [[-4.6,-3.5],[-1.1,12.10],[14.40,32.9],[35.1,48.8]])for(const [top,z] of [[FAR_LEDGE,-36.47],[-.35,-36.04],[-.98,-35.58],[-1.61,-35.23]])
    box('Opposite bank white tier nosing',(a+b)/2,top-.02,z,b-a,.045,.03,fenceWhite);
  // 15.14.07 / 15.21.47 / 15.23.25 / 15.23.35 / 15.23.38 / 15.25.52 / 15.25.55 / 14.57.50: both side
  // banks have a solid dark masonry parapet with tall, capped whitewashed square posts
  // about 3.7 m apart, not open crossrails.
  for(const [x,z1,z2,name] of [[50.08,-8.32,-20.8,'East'],[50.08,-23.5,-37.68,'East'],[-5.08,-10.0,-22.8,'West'],[-5.08,-25.2,-37.68,'West']]){
    const len=Math.abs(z2-z1),zc=(z1+z2)/2,n=Math.max(1,Math.round(len/3.7));
    box(name+' bank solid dark parapet',x,.45,zc,.3,.9,len,fenceStone);
    box(name+' bank parapet coping',x,.93,zc,.38,.07,len,fenceStone);
    for(let i=0;i<=n;i++){const z=z1+(z2-z1)*i/n;
      box(name+' bank whitewashed square post',x,.72,z,.36,1.44,.36,fenceWhite);
      box(name+' bank post cap',x,1.49,z,.44,.09,.44,fenceWhite);}
    K.blocker(x,zc,.45,len+.3,0,1.4);
  }
  // The ledge behind the top tier, at the foot of the wall, and a low sloped coping
  // standing about 0.4 m above the raised ground behind the wall.
  for(const [a,b] of [[-5.05,-3.5],[-1.1,9.0],[17.5,32.9],[35.1,49.4]]){
    box('Opposite bank ledge at the wall foot',(a+b)/2,FAR_LEDGE-.2,-37.27,b-a,.4,.54,tankWall);K.surface((a+b)/2,-37.27,b-a,.54,FAR_LEDGE);}
  for(const [a,b] of [[-5.05,-3.5],[-1.1,9.0],[9.7,16.8],[17.5,31.4],[36.6,50.05]])
    box('Opposite bank low sloped coping',(a+b)/2,1.62,-37.72,b-a,.4,.36,tankWall);

  function steps(name, x, z, w, d, axis, low, high, count, mat = materials.basalt) {
    const alongX = axis.endsWith('x'), positive = !axis.startsWith('-');
    for (let i = 0; i < count; i++) {
      const t = (i + .5) / count, rise = low + (high - low) * (i + 1) / count;
      const offset = (positive ? t - .5 : .5 - t) * (alongX ? w : d);
      // These are solid masonry flights, not floating slabs. Extend each
      // tread to the shared footing so oblique lake views cannot see gaps.
      const footing=low-.15,stepHeight=rise-footing;
      box(`${name} tread ${i + 1}`, x + (alongX ? offset : 0), footing+stepHeight/2, z + (alongX ? 0 : offset),
        alongX ? w / count+.008 : w, stepHeight, alongX ? d : d / count+.008, mat);
    }
    K.ramp(x, z, w, d, axis, low, high);
  }
  // 14.58.26 / house-upper-right: the central descent is two narrow flights laid
  // along the retaining face, meeting at a landing below a central pilaster, then
  // a short flight to the water ledge. White nosings trace their zig-zag profile.
  const flightZ=-37.2675,flightD=.535,flightRun=3.9,flightSteps=8,flightRise=(FAR_TOP-FAR_LEDGE)/flightSteps;
  for(const [x0,axis] of [[12.9,'-x'],[13.6,'x']]){
    const dir=axis==='x'?1:-1,cx=x0+dir*flightRun/2;
    steps('Opposite bank central flight along the face',cx,flightZ,flightRun,flightD,axis,FAR_LEDGE,FAR_TOP,flightSteps);
    for(let i=0;i<flightSteps;i++){const run=flightRun/flightSteps,near=x0+dir*i*run,h=FAR_LEDGE+(i+1)*flightRise;
      box('Opposite bank flight white tread nosing',near+dir*run/2,h-.018,-36.99,run,.036,.02,fenceWhite);
      box('Opposite bank flight white riser line',near,h-flightRise/2,-36.99,.036,flightRise,.02,fenceWhite);}
    const nx=axis==='x'?[17.0,17.5]:[9.0,9.7];
    box('Opposite bank flight top parapet notch',(nx[0]+nx[1])/2,FAR_TOP/2,-37.97,nx[1]-nx[0],FAR_TOP,.87,materials.path);K.surface((nx[0]+nx[1])/2,-37.97,nx[1]-nx[0],.87,FAR_TOP);
  }
  box('Opposite bank central flight landing',13.25,FAR_LEDGE-.2,flightZ,.72,.4,flightD,materials.basalt);K.surface(13.25,flightZ,.72,flightD,FAR_LEDGE);
  box('Opposite bank central tall pilaster',13.25,.66,-37.515,.30,1.52,.035,fenceWhite);
  steps('Opposite bank short flight to the water ledge',13.25,-35.90,2.30,2.20,'-z',-1.55,FAR_LEDGE,11);
  box('Opposite bank central stair lower landing',13.25,-1.61,-34.63,2.30,.12,.34,materials.wetStone);K.surface(13.25,-34.63,2.30,.34,-1.55);
  // Two opposed flights in 15.28.13: down from the rotated gate and up
  // to the long arcade, joined by the exposed low ledge beside the water.
  steps('near bank bathing steps',17.75,bathingGateZ,2.7,2.1,'-x',-1.55,.055,9);
  box('near bank lower landing',19.25,-1.61,bathingGateZ,.4,.12,2.1,materials.wetStone);
  K.surface(19.25,bathingGateZ,.4,2.1,-1.55);
  box('Temple bank lower connecting walkway',23.44,-1.63,bathingGateZ,8.78,.16,2.1,materials.wetStone);
  K.surface(23.44,bathingGateZ,8.78,2.1,-1.55);
  // Lowering the ledge exposes the bank behind it. Close that retaining face
  // down to the footing instead of leaving a bright gap under the road slab.
  box('Bathing ledge rear retaining wall',23,-1.025,-8.58,13.2,2.15,.18,tankWall,true);
  steps('Bathing arcade approach stair',28.55,bathingGateZ,2.1,2.1,'x',-1.55,.065,9);
  box('Bathing arcade stair top landing',29.80,-.005,bathingGateZ,.55,.14,2.1,materials.basalt);
  K.surface(29.80,bathingGateZ,.55,2.1,.065);
  steps('east bank steps', 49.16, -22.15, 2.3, 2.45, 'x', -1.55, .055, 9);
  box('east bank stair threshold',50.35,-.005,-22.15,.20,.12,2.45,materials.basalt);K.surface(50.35,-22.15,.20,2.45,.055);
  box('east bank lower landing', 47.65, -1.61, -22.15, .78, .12, 2.45, materials.wetStone);
  K.surface(47.65, -22.15, .78, 2.45, -1.55);
  // 15.23.35 / 15.23.38: straight descent through the west parapet.
  steps('west bank straight water stair',-4.15,-24,2.3,2.2,'-x',-1.55,.055,9);
  box('west bank stair threshold',-5.35,-.005,-24,.20,.12,2.2,materials.basalt);K.surface(-5.35,-24,.20,2.2,.055);
  box('west bank lower landing',-2.70,-1.61,-24,.70,.12,2.2,materials.wetStone);
  K.surface(-2.70,-24,.70,2.2,-1.55);
  steps('far bank corner steps', -2.3, -36.60, 2.25, 3.60, '-z', -1.55, FAR_TOP, 16);
  box('far bank lower landing', -2.3, -1.61, -34.43, 2.25, .12, .76, materials.wetStone);
  K.surface(-2.3, -34.43, 2.25, .76, -1.55);

  // Capture the pavilion and its navigation surfaces so its original detail can
  // be placed on the confirmed near bank, left in the first panorama frame.
  const pavilionChildren=group.children.length,pavilionColliders=K.colliders.length,pavilionSurfaces=K.surfaces.length,pavilionRamps=K.ramps.length;
  const px = -14.7, pz = -39.55, pw = 5.0, pd = 4.45, floor = -.29;
  box('pavilion masonry island', px, -.995, pz, pw, 1.25, pd, materials.basalt);
  box('pavilion pale floor', px, floor - .07, pz, pw, .14, pd, materials.oldWhite);
  K.surface(px, pz, pw, pd, floor);
  // The bank entry is rebuilt in final coordinates below, after placement.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = px + sx * (pw / 2 - .22), z = pz + sz * (pd / 2 - .22);
    box('pavilion white square column', x, .88, z, .31, 2.34, .31, materials.oldWhite, true);
    box('pavilion column capital', x, 2.045, z, .40, .15, .40, materials.oldWhite);
    box('pavilion column foot', x, -.07, z, .39, .43, .39, materials.oldWhite);
  }
  // Low seat-height parapets; west entrance stays open at the centre.
  box('pavilion east parapet', px + pw / 2 - .17, -.035, pz, .22, .51, pd - .6, materials.oldWhite, true);
  box('pavilion rear side parapet', px, -.035, pz - (pd / 2 - .17), pw - .6, .51, .22, materials.oldWhite, true);
  // 15.28.02/05: the face along the lake bank has two bays, with a
  // low opening in the right bay rather than one uninterrupted seat.
  const pavilionFrontZ=pz+pd/2-.22;
  box('pavilion central square pier',px,.88,pavilionFrontZ,.34,2.34,.31,materials.oldWhite,true);
  box('pavilion central pier foot',px,-.07,pavilionFrontZ,.39,.43,.39,materials.oldWhite);
  for(const [a,b] of [[-2.20,.66],[1.40,2.20]]) {
    box('pavilion split front seat',px+(a+b)/2,-.035,pavilionFrontZ,b-a,.51,.22,materials.oldWhite,true);
    box('pavilion seat coping',px+(a+b)/2,.237,pavilionFrontZ,b-a,.035,.27,materials.oldWhite);
  }
  for (const sz of [-1, 1]) box('pavilion entry short seat', px - pw / 2 + .17, -.035, pz + sz * 1.42, .22, .51, 1.02, materials.oldWhite, true);
  const pavilionRoof = new THREE.Group();
  pavilionRoof.name = 'pavilion flat roof and scalloped fascia';
  group.add(pavilionRoof);
  box('pavilion weathered flat slab', px, 2.205, pz, pw + .54, .19, pd + .54, materials.oldWhite, false, pavilionRoof);
  box('pavilion exposed concrete roof', px, 2.309, pz, pw + .48, .023, pd + .48, materials.roofConcrete, false, pavilionRoof);
  function scallopedPanel(width, height, count, depth) {
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(width, 0);
    for (let i = count * 12; i >= 0; i--) {
      const t = i / (count * 12);
      shape.lineTo(width * t, -height + height * .44 * (1 - Math.cos(t * count * Math.PI * 2)));
    }
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 2 });
  }
  function fascia(width, x, y, z, rotation, count, height) {
    const mesh = new THREE.Mesh(scallopedPanel(width, height, count, .065), materials.oldWhite);
    mesh.name = 'scalloped pavilion plaster trim'; mesh.position.set(x, y, z); mesh.rotation.y = rotation;
    pavilionRoof.add(mesh);
  }
  for (const sz of [-1, 1]) {
    fascia(pw + .54, px - (pw + .54) / 2, 2.15, pz + sz * (pd + .54) / 2, 0, 22, .24);
    if(sz<0) fascia(pw - .6, px - (pw - .6) / 2, 1.99, pz + sz * (pd / 2 - .23), 0, 5, .43);
    else for(const offset of [-2.125,.17]) {
      const width=1.955,shape=new THREE.Shape();
      shape.moveTo(0,2.11);shape.lineTo(width,2.11);
      // A raised arch with small cusps, not a straight hanging fringe.
      for(let i=72;i>=0;i--) {
        const t=i/72;
        shape.lineTo(width*t,1.54+.38*Math.sin(Math.PI*t)+.075*Math.abs(Math.sin(6*Math.PI*t)));
      }
      shape.closePath();
      const arch=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:false}),materials.oldWhite);
      arch.name='pavilion twin scalloped arch';arch.position.set(px+offset,0,pavilionFrontZ-.06);pavilionRoof.add(arch);
    }
  }
  for (const sx of [-1, 1]) {
    fascia(pd + .54, px + sx * (pw + .54) / 2, 2.15, pz + (pd + .54) / 2, Math.PI / 2, 20, .24);
    fascia(pd - .6, px + sx * (pw / 2 - .23), 1.99, pz + (pd - .6) / 2, Math.PI / 2, 5, .43);
  }
  // Low, moss-stained upstand and scattered weathering on the flat roof.
  for (const sz of [-1, 1]) box('pavilion roof lip', px, 2.36, pz + sz * (pd + .39) / 2, pw + .54, .1, .08, materials.mortar, false, pavilionRoof);
  for (const sx of [-1, 1]) box('pavilion roof lip', px + sx * (pw + .39) / 2, 2.36, pz, .08, .1, pd + .54, materials.mortar, false, pavilionRoof);
  K.roofs.push(pavilionRoof);
  const pavilionPlacement=new THREE.Group();pavilionPlacement.name='Panorama near-bank pavilion';
  // 14.58.26 (from the lane) and 15.28.26 (from the west wall) both show the pavilion about
  // 1.4x wider than drawn at the same height, so its plan is widened, growing into the water
  // while its entry steps still meet the far bank.
  const PAV_SCALE=1.4;
  // 15.28.05: its floor stays less than a metre above water and its roof below
  // the far bank's tallest posts. Lower the whole pavilion with the water.
  const pavilionTransform=new THREE.Matrix4().makeTranslation(34,-.98,-32.1).multiply(new THREE.Matrix4().makeRotationY(-Math.PI/2)).multiply(new THREE.Matrix4().makeScale(PAV_SCALE,1,PAV_SCALE)).multiply(new THREE.Matrix4().makeTranslation(-px,0,-pz));
  for(const child of group.children.slice(pavilionChildren))pavilionPlacement.add(child);
  pavilionPlacement.applyMatrix4(pavilionTransform);group.add(pavilionPlacement);
  const mapPoint=(x,z)=>new THREE.Vector3(x,0,z).applyMatrix4(pavilionTransform);
  for(const c of K.colliders.slice(pavilionColliders)){
    const a=mapPoint(c.minX,c.minZ),b=mapPoint(c.maxX,c.maxZ);
    c.minX=Math.min(a.x,b.x);c.maxX=Math.max(a.x,b.x);c.minZ=Math.min(a.z,b.z);c.maxZ=Math.max(a.z,b.z);
    c.bottom-=.98;c.top-=.98;
  }
  for(const r of [...K.surfaces.slice(pavilionSurfaces),...K.ramps.slice(pavilionRamps)]){
    const p=mapPoint(r.x,r.z);r.x=p.x;r.z=p.z;[r.w,r.d]=[r.d*PAV_SCALE,r.w*PAV_SCALE];
    if(r.axis){r.lowY-=.98;r.highY-=.98;}else r.y-=.98;
    if(r.axis)r.axis=({'x':'z','-x':'-z','z':'-x','-z':'x'})[r.axis];
  }
  steps('pavilion bank entry',34,-37.25,2.0,3.1,'-z',-1.27,FAR_TOP,15);
  box('pavilion entry lower landing',34,-1.33,-35.62,2,.12,.24,materials.basalt);K.surface(34,-35.62,2,.24,-1.27);


  // Ground cover uses irregular silhouettes, avoiding architectural/circulation areas.
  function patch(name, x, z, rx, rz, material, y = .013) {
    const vertices = [x, y, z], indices = [], count = 16;
    for (let i = 0; i <= count; i++) {
      const angle = i / count * Math.PI * 2, radius = .86 + random() * .14;
      vertices.push(x + Math.cos(angle) * rx * radius, y, z + Math.sin(angle) * rz * radius);
      if (i) indices.push(0, i + 1, i);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material); mesh.name = name; group.add(mesh);
  }
  // A continuous irregular forest floor extends beneath the distant tree line.
  // Rectangular exclusions protect circulation, the tank loop and all buildings.
  // Vertex colour varies coherently across the ground, avoiding a collection of
  // detached green discs floating in otherwise bare tan terrain.
  {
    const clearings = [
      [-22, 58, -48.8, -8.5], [-125, 125, -8.1, -1.9],
      [-16.5, 59, -2, 25.8], [21, 59, 25.8, 46],
      [-43, -31, 22.8, 33.2], [-2, 10, -65, -55], [60.5, 73.5, 36.5, 47.5],
    ];
    const positions = [], colors = [], indices = [];
    const green = new THREE.Color('#4c6737'), fern = new THREE.Color('#617345');
    const litter = new THREE.Color('#645a3d'), shaded = new THREE.Color('#3d5734');
    const step = 2.0;
    const wave = (x, z) => Math.sin(x * .19 + z * .11) * .55 + Math.cos(z * .23 - x * .07) * .45;
    for (let z = -120; z < 110; z += step) for (let x = -120; x < 120; x += step) {
      const margin = .35 + Math.max(0, wave(x, z)) * 1.5;
      if (clearings.some(([x0, x1, z0, z1]) => x + step > x0 - margin && x < x1 + margin && z + step > z0 - margin && z < z1 + margin)) continue;
      const base = positions.length / 3;
      for (const [dx, dz] of [[0, 0], [step, 0], [0, step], [step, step]]) {
        const xx = x + dx, zz = z + dz, damp = (wave(xx * .58, zz * .68) + 1) * .5;
        const c = green.clone().lerp(fern, Math.max(0, wave(xx, zz)) * .55);
        c.lerp(litter, Math.max(0, Math.sin(xx * .095 - zz * .16) - .15) * .45);
        c.lerp(shaded, Math.max(0, damp - .43) * .42);
        positions.push(xx, .009, zz); colors.push(c.r, c.g, c.b);
      }
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 1 });
    const mesh = new THREE.Mesh(geometry, material); mesh.name = 'continuous mottled green and leaf-litter forest floor';
    group.add(mesh);
  }
  patch('laterite rear yard', -1+K.houseShiftX, 23.3, 17, 3.1, materials.redSoil);
  patch('western coconut ground', -33, -24, 9.5, 30, materials.turf);
  patch('grove leaf litter', -4, 44, 25, 18, materials.darkSoil);
  patch('opposite bank overgrown ground', 0, -56, 34, 9, materials.turf);
  patch('east garden soil', 65, 26, 10, 21, materials.redSoil);
  for (let i = 0; i < 23; i++) {
    const behind = i % 2 === 0;
    patch('irregular shaded grass patch', range(-25, 17), behind ? range(28, 59) : range(-66, -49), range(1.6, 4.5), range(1.0, 2.6), i % 3 ? materials.turf : materials.moss, .026 + i * .0002);
  }
  // Garden retaining walls stay behind the house and beside the eastern grove.
  box('rear laterite garden retaining wall', -2+K.houseShiftX, .29, 24.8, 27, .58, .5, materials.basalt, true);
  box('rear retaining pale coping', -2+K.houseShiftX, .61, 24.8, 27.12, .1, .59, materials.path);
  box('west overgrown boundary wall', -24.1, .31, -26.5, .46, .62, 34, materials.basalt, true);
  box('east garden low boundary', 59.5, .22, 26, .42, .44, 41, materials.basalt, true);

  // A frond has a curved rachis and individually tapered, folded leaflets.
  // Geometry is shared by every coconut and areca crown; no billboard palms.
  function palmFrondGeometry() {
    const positions = [], colors = [], indices = [];
    const greenA = new THREE.Color('#4c773f'), greenB = new THREE.Color('#759b4d'), stem = new THREE.Color('#89985b');
    const point = t => new THREE.Vector3(5.25 * t, 1.22 * Math.sin(t * Math.PI) - 1.45 * t * t, 0);
    function vertex(v, color) { positions.push(v.x, v.y, v.z); colors.push(color.r, color.g, color.b); return positions.length / 3 - 1; }
    const stemSegments=mobile?10:15,stemSides=mobile?3:5,leafSegments=mobile?2:3;
    for (let i = 0; i <= stemSegments; i++) {
      const t = i / stemSegments, p = point(t), radius = .028 * (1 - t * .88);
      for (let j = 0; j < stemSides; j++) {
        const a = j / stemSides * Math.PI * 2;
        vertex(new THREE.Vector3(p.x, p.y + Math.sin(a) * radius, Math.cos(a) * radius), stem);
        if (i) { const a0 = (i - 1) * stemSides + j, b0 = (i - 1) * stemSides + (j + 1) % stemSides, c0 = i * stemSides + j, d0 = i * stemSides + (j + 1) % stemSides; indices.push(a0, b0, c0, b0, d0, c0); }
      }
    }
    for (let i = 0; i < 21; i++) for (const side of [-1, 1]) {
      const t = .085 + i / 21 * .89, p = point(t);
      const length = (.32 + 1.25 * Math.sin(Math.PI * t) ** .72) * (side < 0 ? .98 : 1.04);
      const base = positions.length / 3, shade = greenA.clone().lerp(greenB, (i % 5) / 5);
      for (let j = 0; j <= leafSegments; j++) {
        const s = j / leafSegments, width = .115 * Math.sin(Math.PI * s) + .016 * (1 - s);
        const center = p.clone().add(new THREE.Vector3(length * .53 * s, -.27 * length * s - .35 * s * s, side * length * s));
        for (const edge of [-1, 0, 1]) vertex(center.clone().add(new THREE.Vector3(width * edge, edge === 0 ? .033 * Math.sin(Math.PI * s) : 0, -side * width * .4 * edge)), shade.clone().multiplyScalar(1 - s * .19));
      }
      for (let j = 0; j < leafSegments; j++) for (let k = 0; k < 2; k++) {
        const a = base + j * 3 + k, b = a + 1, c = a + 3, d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    return geometry;
  }
  const frond = palmFrondGeometry();
  function clearOppositeBuildings(x,z){
    // Keep inferred palms outside the lane cottage and its pink rear block.
    if(x>-33&&x<-23&&z>-18&&z<-9.4)return -19.8;
    for(const [a,b,c,d] of [[-18,-6,-60,-49],[-1,14,-61,-50],[20,30,-68,-57],[31,46,-68,-54]])if(x>a&&x<b&&z>c&&z<d)return c-3.2;
    return z;
  }
  // Areca stems read mid grey-green against the forest, not as pale poles.
  const arecaTrunk = new THREE.MeshStandardMaterial({ color: '#86877a', roughness: 1 });
  function palm(x, z, height, areca = false, reference = null) {
    z=clearOppositeBuildings(x,z);
    let leanX = range(-1.6, 1.6) * (areca ? .38 : 1), leanZ = range(-1.5, 1.5) * (areca ? .38 : 1);
    let radius = areca ? range(.085, .12) : range(.23, .32);
    const n = areca ? 3 : 9;
    // Consume the usual seeded draws before applying a photographed tree profile.
    if(reference){leanX=reference.leanX;leanZ=reference.leanZ;radius=reference.radius;}
    const trunkPoint = t => [x + leanX * t * t, height * t, z + leanZ * t * t];
    for (let i = 0; i < n; i++) segment(areca ? 'areca trunks' : 'curved coconut trunks', areca ? arecaTrunk : materials.trunk, trunkPoint(i / n), trunkPoint((i + 1) / n), radius * (1 - .48 * i / n), radius * (1 - .48 * (i + 1) / n));
    const ringCount = Math.floor(height / (areca ? .68 : .36));
    for (let i = 1; i < ringCount; i++) {
      const t = i / ringCount, p = trunkPoint(t), r = radius * (1 - .48 * t) * 1.025;
      segment('palm trunk growth rings', materials.trunkRings, [p[0], p[1] - .019, p[2]], [p[0], p[1] + .019, p[2]], r);
    }
    const top = trunkPoint(1), size = (areca ? range(.39, .50) : range(.78, 1.13));
    const frondCount = areca ? 8 : 12, rotation = range(0, Math.PI * 2);
    for (let i = 0; i < frondCount; i++) {
      const yaw = rotation + i / frondCount * Math.PI * 2 + range(-.10, .10), inner = i % 4 === 0;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, inner ? range(.55, .90) : range(-.24, .25), 'YXZ'));
      instance('living palm fronds', frond, materials.palm, [top[0], top[1] + range(-.05, .15), top[2]],
        [size * (inner ? .76 : 1), size * (areca ? 1.1 : 1), size * (areca ? .70 : 1)], q);
    }
    if (!areca) {
      for (let i = 0; i < 5; i++) {
        const a = i * 2.4;
        instance('coconuts under crowns', sphere, materials.coconut, [top[0] + Math.cos(a) * .24, top[1] - .22 - i * .025, top[2] + Math.sin(a) * .24], [.16, .21, .16]);
      }
      if (random() < .65) {
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotation + 1, -.8, 'YXZ'));
        instance('occasional dry hanging fronds', frond, materials.dryPalm, top, [size * .75, size, size * .77], q);
      }
      K.blocker(x, z, radius * 2.2, radius * 2.2, 0, 2.1);
    }
  }
  // Foreground coconut spacing follows the bank paths, preserving lake views.
  for (const p of [[-23,-13,13],[-23.5,-25,16],[-22.9,-35,12],[-23,-43,15],[60,-40,14],[61.9,-27,16,false,{leanX:.3,leanZ:4.4,radius:.19}],[-14,-48,15],[-1,-48.5,17],[13,-48,14],[-20,28,15],[-13,29,17],[0,30,14],[13,28,16],[18,35,15]]) palm(...p);
  for (let i = 0; i < 29; i++) {
    const zone = i % 3;
    palm(zone === 0 ? range(-37, 19) : zone === 1 ? range(-43, 29) : range(-42, -29),
      zone === 0 ? range(33, 59) : zone === 1 ? range(-70, -53) : range(-37, 32), zone === 1 ? range(18, 26) : range(10, 18));
  }
  // Slender areca stems rise through the rear understory in irregular rows.
  for (let row = 0; row < 7; row++) for (let col = 0; col < 13; col++) {
    const x = -26 + col * 3.5 + range(-.6, .6), z = 29 + row * 4.5 + range(-.9, .9);
    palm(x, z, range(8, 14), true);
  }
  // 14.57.50: tall palms stand well above the far-bank houses, with sky between their crowns.
  for (let i = 0; i < 32; i++) palm(range(-38, 30), range(-70, -53), range(12, 20), true);

  // Irregular lobed crowns with small peripheral clusters replace uniform balls.
  const crown = new THREE.IcosahedronGeometry(1, 2);
  const crownPositions = crown.attributes.position;
  for (let i = 0; i < crownPositions.count; i++) {
    const x = crownPositions.getX(i), y = crownPositions.getY(i), z = crownPositions.getZ(i);
    const lobe = 1 + .11 * Math.sin(x * 11 + z * 4) * Math.cos(y * 8 - z * 6) + .06 * Math.sin(z * 17 + y * 9);
    crownPositions.setXYZ(i, x * lobe, y * lobe * (.94 + x * .09), z * lobe);
  }
  crown.computeBoundingSphere();
  // Grey-scale leaf clumps break up the smooth crowns; instance colours tint them.
  if(typeof document!=='undefined'){
    const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');let n=31337;const r=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
    x.fillStyle='#a8a8a8';x.fillRect(0,0,256,256);
    for(let i=0;i<900;i++){const px=r()*256,py=r()*256,rx=3+r()*7,ry=2+r()*5,a=r()*3,v=r();
      for(const dx of [-256,0,256])for(const dy of [-256,0,256]){x.fillStyle=v<.25?'rgba(50,50,50,.5)':v<.75?'rgba(175,175,175,.6)':'rgba(235,235,235,.55)';x.beginPath();x.ellipse(px+dx,py+dy,rx,ry,a,0,7);x.fill();}}
    const m=new THREE.CanvasTexture(c);m.colorSpace=THREE.SRGBColorSpace;m.wrapS=m.wrapT=THREE.RepeatWrapping;m.repeat.set(3,2);
    materials.foliage.map=m;materials.foliage.color.set('#ffffff');
  }
  const leafPalette = ['#294c2b', '#365a30', '#41622f', '#4b6937', '#31563a'];
  const foliageColor = () => new THREE.Color(leafPalette[Math.floor(random() * leafPalette.length)]).multiplyScalar(range(.9, 1.13));
  // Four folded leaf shapes per instanced peripheral spray, no texture/billboard.
  const sprayPositions = [], sprayIndices = [];
  for (let i = 0; i < 4; i++) {
    const a = i * 2.4, dx = Math.cos(a), dz = Math.sin(a), start = sprayPositions.length / 3;
    sprayPositions.push(0, 0, 0, dx * .19 - dz * .12, .08, dz * .19 + dx * .12,
      dx * .47, .13, dz * .47, dx * .19 + dz * .12, .08, dz * .19 - dx * .12, dx * .22, .15, dz * .22);
    sprayIndices.push(start, start + 1, start + 4, start + 1, start + 2, start + 4,
      start + 2, start + 3, start + 4, start + 3, start, start + 4);
  }
  const spray = new THREE.BufferGeometry();
  spray.setAttribute('position', new THREE.Float32BufferAttribute(sprayPositions, 3)); spray.setIndex(sprayIndices); spray.computeVertexNormals();
  const sprayMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, side: THREE.DoubleSide });
  function broadleaf(x, z, h, radius) {
    segment('distant broadleaf trunks', materials.trunkRings, [x, 0, z], [x + .3, h * .74, z], .28);
    const lean = range(-1.1, 1.1), count = 8 + Math.floor(random() * 5);
    for (let j = 0; j < count; j++) {
      const a = j * 2.4 + range(-.4, .4), outer = j > 3, s = outer ? range(.26, .55) : range(.57, .92);
      const distance = radius * (outer ? range(.65, .99) : range(.08, .45));
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(range(-.5, .5), a, range(-.4, .4)));
      const cx = x + lean + Math.cos(a) * distance, cy = h + range(-radius * .34, radius * .35), cz = z + Math.sin(a) * distance;
      instance('layered broadleaf canopies', crown, materials.foliage,
        [cx, cy, cz], [radius * s, radius * s * range(.66, 1.23), radius * s * range(.68, 1.14)], q, foliageColor());
      if (outer) for (let k = 0; k < 7; k++) {
        const angle = range(0, Math.PI * 2), rr = radius * s * range(.72, 1.08), size = range(.8, 1.6);
        const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(range(-1, 1), angle, range(-1, 1)));
        instance('small leaves breaking canopy outlines', spray, sprayMaterial,
          [cx + Math.cos(angle) * rr, cy + range(-.7, .7) * rr, cz + Math.sin(angle) * rr], [size, size, size], rotation, foliageColor());
      }
    }
  }
  for (let i = 0; i < 14; i++) broadleaf(-49 + i * 7.7 + range(-2.3, 2.3), 65 + range(-4, 14), range(8.5, 18), range(3.7, 7.1));
  for (let i = 0; i < 11; i++) broadleaf(-47 + i * 10 + range(-3, 3), -77 - range(-4, 11), range(8, 17), range(3.4, 6.8));
  for (let i = 0; i < 8; i++) broadleaf(-48 - range(-2, 9), -49 + i * 13 + range(-3, 3), range(8, 17.5), range(3.7, 6.7));
  const shrubSun=new THREE.Color('#7d9a48');
  function shrub(x, z, size) {
    z=clearOppositeBuildings(x,z);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(range(-.3, .3), range(0, 6.28), range(-.3, .3)));
    instance('varied understory shrub clusters', crown, materials.foliage, [x, .43 * size, z], [size, size * range(.55, .9), size * range(.7, 1.15)], q,
      foliageColor().multiplyScalar(range(1, 1.13)).lerp(shrubSun,.4).multiplyScalar(1.3));
  }
  for (let i = 0; i < 220; i++) {
    const zone = i % 4;
    shrub(zone === 0 ? range(-27, 19) : zone === 1 ? range(-39, 25) : zone === 2 ? range(-37, -24.8) : range(62, 75),
      zone === 0 ? range(27, 63) : zone === 1 ? range(-70, -48.1) : zone === 2 ? range(-46, 24) : range(4, 60), range(.42, 1.28));
  }
  // Small tufts on the wild edges, kept away from the walking paths.
  const grassPositions = [], grassIndices = [];
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4, dx = Math.cos(a), dz = Math.sin(a), b = grassPositions.length / 3;
    grassPositions.push(-dz * .04, 0, dx * .04, dz * .04, 0, -dx * .04, dx * .10, .37 + (i % 3) * .08, dz * .10, dx * .19, .59 + (i % 3) * .09, dz * .19);
    grassIndices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
  }
  const grassGeometry = new THREE.BufferGeometry();
  grassGeometry.setAttribute('position', new THREE.Float32BufferAttribute(grassPositions, 3)); grassGeometry.setIndex(grassIndices); grassGeometry.computeVertexNormals();
  for (let i = 0; i < 650; i++) {
    const x = i % 2 ? range(-38, -22) : range(-30, 28), z = i % 2 ? range(-47, 23) : range(-68, -47.1), s = range(.55, 1.3);
    instance('grass and weeds along wild banks', grassGeometry, materials.grass, [x, .025, z], [s, s, s], new THREE.Quaternion().setFromAxisAngle(up, range(0, 6.28)));
  }

  // A few quiet white service houses frame the site beyond the main buildings.
  function ancillary(name, x, z, w, d, h) {
    box(`${name} stone plinth`, x, .10, z, w + .35, .2, d + .35, materials.basalt, true);
    box(`${name} whitewashed walls`, x, h / 2 + .2, z, w, h, d, 'plaster', true);
    box(`${name} weathered low skirting`, x, .36, z, w + .015, .30, d + .015, materials.mortar);
    K.hipRoof(group, `${name} brown tiled roof`, x, z, w + 1.25, d + 1.30, h + .28, 1.2, 'tile');
    box(`${name} dark doorway`, x - w * .18, 1.1, z - d / 2 - .022, .92, 1.86, .06, 'wood');
    for (const side of [-1, 1]) {
      const wx = x + side * w * .32;
      box(`${name} timber window`, wx, 1.66, z - d / 2 - .03, .93, 1.02, .055, 'wood');
      for (let j = 0; j < 4; j++) blockBatch('ancillary window horizontal slats', materials.mortar, wx, 1.27 + j * .23, z - d / 2 - .065, .85, .032, .025);
    }
  }
  ancillary('western grove outbuilding', -37, 28, 8.8, 6.8, 2.75);
  // 15.30.09/06/02: opposite-bank hall, low white house and the pink/tiled
  // houses form one continuous view from the same upstairs balcony position.
  const oppositeWhite=K.M.plaster.clone();oppositeWhite.color.set('#e9e7de');
  const oppositePink=K.M.pink.clone();oppositePink.color.set('#d9789f');
  const ow=(n,x,y,z,w,h,d,m=oppositeWhite,solid=false)=>box('Opposite bank '+n,x,y,z,w,h,d,m,solid);
  // Tall white hall, with gabled facade, two barred upper windows and balcony.
  ow('hall foundation',-12,.18,-55,9.5,.36,8.2,materials.mortar,true);
  ow('hall white body',-12,3.53,-55,9.3,6.3,7.8,oppositeWhite,true);
  ow('hall ground dark door',-12,1.55,-51.065,1.45,2.30,.055,materials.darkSoil);
  for(const x of [-15.1,-9.0])ow('hall ground window',x,1.75,-51.06,1.22,1.20,.06,materials.darkSoil);
  ow('hall ground white canopy',-12,3.18,-50.67,10.0,.17,1.22);
  ow('hall upper balcony slab',-12,3.60,-50.84,10.15,.17,1.38);
  for(const x of [-14.55,-9.45]){
    ow('hall upper window dark inset',x,5.15,-51.057,1.85,1.65,.055,materials.darkSoil);
    for(const xx of [x-.99,x+.99])ow('hall upper window pale jamb',xx,5.15,-51.01,.075,1.80,.10);
    for(const y of [4.27,6.03])ow('hall upper window pale sill',x,y,-51.01,2.06,.09,.14);
    for(let j=0;j<13;j++)ow('hall upper iron window bars',x-.86+j*.144,5.15,-50.99,.023,1.59,.025,materials.mortar);
    for(const y of [4.72,5.32,5.72])ow('hall upper window grille rail',x,y,-50.97,1.83,.028,.035,materials.mortar);
  }
  const hallGable=new THREE.Shape();hallGable.moveTo(-4.65,6.65);hallGable.lineTo(0,8.0);hallGable.lineTo(4.65,6.65);hallGable.closePath();
  const hallTriangle=new THREE.Mesh(new THREE.ExtrudeGeometry(hallGable,{depth:.18,bevelEnabled:false}),oppositeWhite);hallTriangle.name='Opposite bank hall white front gable';hallTriangle.position.set(-12,0,-51.13);group.add(hallTriangle);
  const hallRoof=K.gableRoof(group,'Opposite bank hall shallow gray roof',0,0,8.5,10.05,6.69,1.41,materials.roofConcrete);hallRoof.rotation.y=Math.PI/2;hallRoof.position.set(-12,0,-55);
  for(const side of [-1,1])K.beam(group,'Opposite bank hall pale sloping roof edge',[-12+side*4.92,6.74,-50.71],[-12,8.15,-50.71],.14,oppositeWhite,.20);
  for(const y of [2.65,3.18])ow('hall lower balcony white rail',-12,y,-50.15,9.9,.11,.13);
  const hallSpindles=[];for(let x=-16.8;x<-7.1;x+=.235)hallSpindles.push([x,2.91,-50.15,.08,.47,.08]);
  for(const a of hallSpindles)instance('Opposite bank hall balcony balusters',cylinder,oppositeWhite,a.slice(0,3),a.slice(3));
  ow('hall red awning fascia',-12,2.59,-50.17,9.98,.08,.18,'red');
  // Original lettering and emblem, sampled only from the white hall in 15.30.09.
  function hallPhoto(n,x,y,w,h,rect){
    const tex=new THREE.TextureLoader().load('./assets/house-upper-ahead.jpg');tex.colorSpace=THREE.SRGBColorSpace;
    const [x0,y0,x1,y1]=rect;tex.repeat.set((x1-x0)/1824,(y1-y0)/1368);tex.offset.set(x0/1824,1-y1/1368);
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:tex,roughness:1}));panel.name=n;panel.position.set(x,y,-50.04);group.add(panel);
  }
  hallPhoto('Opposite bank hall original sign',-12,2.94,3.50,.79,[408,567,611,641]);
  hallPhoto('Opposite bank hall original relief emblem',-12,6.41,1.28,1.40,[444,320,545,432]);
  ow('hall left balcony side parapet',-16.76,3.83,-54.15,.17,.62,7.35);
  // Low white house, with flat weathered roof, shuttered windows and side porch.
  ow('low house body',6,1.73,-55.4,11.5,2.96,6.0,oppositeWhite,true);
  ow('low house worn plinth',6,.25,-55.4,11.65,.5,6.12,materials.path);
  ow('low house flat roof',6,3.28,-55.4,12.0,.20,6.5,materials.roofConcrete);K.roofs.push(group.children[group.children.length-1]);
  for(const x of [2.0,10.0]){
    ow('low house brown shutter',x,1.92,-52.365,.85,1.16,.06,K.M.wood);
    for(let j=0;j<9;j++)ow('low house shutter slat',x,1.41+j*.124,-52.32,.79,.043,.035,materials.mortar);
  }
  ow('low house blank central window',6,1.99,-52.36,.94,1.01,.055);
  ow('low house porch slab',-.85,.15,-55.0,2.6,.15,5.4,materials.path);K.surface(-.85,-55,2.6,5.4,.225);
  for(const z of [-52.65,-56.9])ow('low house slender porch column',-1.8,1.50,z,.18,2.64,.18,oppositeWhite,true);
  ow('low house porch canopy',-1.15,2.93,-55,3.1,.16,5.8,materials.roofConcrete);
  K.cylinder(group,'Opposite bank low house black water tank',9.4,3.64,-57.1,.42,.45,.61,'black',14);
  ow('low house laundry line',6,.98,-51.95,5.5,.022,.022,materials.mortar);
  for(const [x,c] of [[4.7,'#797e88'],[5.6,'#62afba'],[6.5,'#b9b6ae']])ow('low house hanging cloth',x,.66,-51.95,.71,.63,.018,new THREE.MeshStandardMaterial({color:c,roughness:1,side:THREE.DoubleSide}));
  // Houses beyond the pavilion: a pink tall section and connected low tiled rooms.
  ow('pink house upper block',25,4.17,-62.3,6.0,3.75,5.0,oppositePink,true);
  ow('pink house blue lower band',25,2.42,-59.76,6.02,.35,.05,'blue');
  K.hipRoof(group,'Opposite bank pink house tiled cap',25,-62.3,6.8,5.8,6.14,.82);
  ow('pink house small upper window',25.1,5.3,-59.74,.90,.65,.06,materials.darkSoil);
  ow('pink house low white rooms',29,1.42,-60.8,11.0,2.72,5.5,oppositeWhite,true);
  K.hipRoof(group,'Opposite bank pink house low tiled roof',29,-60.8,12.1,6.5,2.84,.96);
  ow('pink house veranda dark recess',28,1.20,-57.99,6.9,2.15,.06,materials.darkSoil);
  for(const x of [24.55,28,31.45])ow('pink house veranda post',x,1.38,-57.3,.17,2.6,.17,oppositeWhite,true);
  ow('tiled house tall rear block',39,3.65,-63.6,7.5,3.0,5.1,oppositeWhite,true);
  K.hipRoof(group,'Opposite bank tall tiled house roof',39,-63.6,8.4,6.1,5.25,1.10);
  ow('tiled house lower rooms',39,1.37,-59.7,10.8,2.60,6.0,oppositeWhite,true);
  K.hipRoof(group,'Opposite bank low tiled house roof',39,-59.7,11.7,6.9,2.79,.98);
  for(const x of [36.5,41.5])ow('tiled house small upper window',x,4.43,-61.01,.51,.84,.04,materials.darkSoil);
  for(const x of [36,40.7])ow('tiled house dark ground opening',x,1.35,-56.65,.9,2.03,.08,materials.darkSoil);
  // Low hedge and a worn footpath separate the buildings from the bank.
  ow('hall dirt approach',-17.9,.024,-48.0,2.4,.045,12.2,materials.redSoil);
  const neighborSeed=seed;
  for(const [x,z,h] of [[-15.5,-48.6,21],[-8.2,-48.4,24],[1.2,-49.0,20],[14.5,-51.8,23],[21,-54,25],[33,-53.0,22],[46,-52,24]])palm(x,z,h);
  for(let i=0;i<24;i++)shrub(17+i*1.22,-53.3-(i%3)*.8,.65+(i%4)*.12);
  seed=neighborSeed;
  ancillary('eastern garden service house', 67, 42, 9.1, 6.0, 2.7);

  // The family identifies the house-facing corner as part of the temple.
  // It is modeled in temple.js; the former estimated annex crossed the side road.
  // Family-identified adjacent building, NOT the temple: its two-level white
  // facade faces down the lane. The original temple stays in its prior layout.
  const adjacentStart={children:group.children.length,colliders:K.colliders.length,surfaces:K.surfaces.length,ramps:K.ramps.length};
  const adjacentWhite=new THREE.MeshStandardMaterial({color:'#e8e6df',roughness:.95});
  const adjacentDark=new THREE.MeshStandardMaterial({color:'#383b39',roughness:.95});
  const stageColumns=[-5.6,-2,2,5.6];
  const ab=(name,a,y,depth,w,h,d,m=adjacentWhite,solid=false)=>box('Adjacent building '+name,60+depth,y,-5-a,d,h,w,m,solid);
  // 15.13.51, corroborated by the dark lower veranda in 15.19.57:
  // nearly black stone with small pale square inlays, not the generic pale grid.
  const hallFloorCanvas=document.createElement('canvas');hallFloorCanvas.width=hallFloorCanvas.height=256;
  const hc=hallFloorCanvas.getContext('2d');hc.fillStyle='#353a38';hc.fillRect(0,0,256,256);
  for(let i=0;i<300;i++){hc.fillStyle=i%3?'#b3b3a70b':'#0d151317';hc.fillRect((i*83)%256,(i*151)%256,3+i%17,1+i%5);}
  hc.strokeStyle='#202a2745';hc.lineWidth=1;hc.strokeRect(.5,.5,255,255);
  hc.fillStyle='#b6b2a0';hc.fillRect(116,116,24,24);
  const hallFloorMap=new THREE.CanvasTexture(hallFloorCanvas);hallFloorMap.colorSpace=THREE.SRGBColorSpace;
  // K.box supplies metre-based UVs at 0.5 units/m on every face.
  hallFloorMap.wrapS=hallFloorMap.wrapT=THREE.RepeatWrapping;hallFloorMap.repeat.set(2/.70,2/.70);
  const hallFloorStone=new THREE.MeshStandardMaterial({name:'Adjacent hall dark stone with pale inlays',map:hallFloorMap,roughness:.64});
  ab('raised dark foundation',0,.76,2.9,20,1.52,5.8,materials.basalt,true);
  ab('ground veranda floor',0,1.56,2.9,20,.12,5.8,hallFloorStone);K.surface(62.9,-5,5.8,20,1.62);
  // 14.59.26: the deep two-level veranda reads as grey shade behind the white
  // front, under a flat white ceiling rather than the bare tile underside.
  const adjacentShade=new THREE.MeshStandardMaterial({color:'#cdcbc3',roughness:.95});
  ab('rear wall',0,4.98,5.87,20,6.72,.22,adjacentShade,true);
  const upperCeiling=ab('upper veranda flat ceiling',0,8.22,2.9,20,.14,6.0,adjacentWhite);K.roofs.push(upperCeiling);
  for(const a of [-9.94,9.94])ab('side wall',a,4.98,3,.20,6.72,6,adjacentWhite,true);
  ab('upper gallery slab',0,4.95,2.9,20,.20,6.0,adjacentWhite);K.surface(62.9,-5,6,20,5.05);
  // 14.59.26 / 15.12.15: the statue-bearing centre projects one metre
  // ahead of the side bays on both levels. Keep the existing central stair
  // clear between the two lower side landings.
  for(const a of [-2.05,2.05]){
    ab('projecting porch raised dark foundation',a,.76,-.45,.90,1.52,1.10,materials.basalt,true);
    ab('projecting porch lower landing',a,1.56,-.45,.90,.12,1.10,hallFloorStone);
    K.surface(59.55,-5-a,1.10,.90,1.62);
  }
  ab('projecting porch upper slab',0,4.95,-.45,4.8,.20,1.10,adjacentWhite);
  K.surface(59.55,-5,1.10,4.8,5.05);
  for(const y of [.19,.49,.80,1.17])ab('worn foundation course',0,y,-.03,20.3,.075,.14,'paleStone');
  for(let i=0;i<10;i++){
    const x=56.9+(i+.5)*.31,y=(i+1)*.162;
    box('Adjacent building central stair riser',x,y/2,-5,.31,y,3.8,'paleStone');
    box('Adjacent building central stair dark tread',x,y+.012,-5,.315,.024,3.83,materials.mortar);
  }
  K.ramp(58.45,-5,3.1,3.8,'x',0,1.62);
  const stageTileCanvas=document.createElement('canvas');stageTileCanvas.width=stageTileCanvas.height=128;
  const stageTileContext=stageTileCanvas.getContext('2d');stageTileContext.fillStyle='#d8d9d0';stageTileContext.fillRect(0,0,128,128);stageTileContext.fillStyle='#516678';
  stageTileContext.beginPath();stageTileContext.moveTo(64,4);stageTileContext.lineTo(124,64);stageTileContext.lineTo(64,124);stageTileContext.lineTo(4,64);stageTileContext.closePath();stageTileContext.fill();
  const stageTileMap=new THREE.CanvasTexture(stageTileCanvas);stageTileMap.colorSpace=THREE.SRGBColorSpace;stageTileMap.wrapS=THREE.RepeatWrapping;stageTileMap.repeat.x=12;
  const stageTileMat=new THREE.MeshStandardMaterial({map:stageTileMap,roughness:.9});
  for(let i=0;i<10;i++){
    const riser=new THREE.Mesh(new THREE.PlaneGeometry(3.77,.162),stageTileMat);riser.name='Stage blue-white diamond stair riser';riser.rotation.y=-Math.PI/2;riser.position.set(56.897+i*.31,(i+.5)*.162,-5);group.add(riser);
  }
  // 15.12.15 / 15.13.30: whitewashed pedestals carrying black stone elephants flank the stair.
  const elephantStone=new THREE.MeshStandardMaterial({color:'#1c1c1b',roughness:.45});
  for(const [z,x0,top] of [[-7.35,58.2,1.25],[-2.65,57.2,.9]]){
    box('Stage stair elephant pedestal',x0,top/2,z,1.3,top,.6,adjacentWhite,true);
    const el=new THREE.Group();el.name='Stage stair black stone elephant';el.position.set(x0,top,z);group.add(el);
    const body=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),elephantStone);body.scale.set(.5,.33,.24);body.position.y=.55;body.name='Elephant body';el.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.22,12,9),elephantStone);head.position.set(-.5,.72,0);head.name='Elephant head';el.add(head);
    for(const s of [-1,1]){const ear=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),elephantStone);ear.scale.set(.05,.2,.16);ear.position.set(-.42,.72,s*.2);ear.name='Elephant ear';el.add(ear);}
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.05,.08,.55,8),elephantStone);trunk.position.set(-.66,.42,0);trunk.rotation.z=-.25;trunk.name='Elephant trunk';el.add(trunk);
    for(const dx of [-.3,.3])for(const dz of [-.12,.12]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.4,8),elephantStone);leg.position.set(dx,.2,dz);leg.name='Elephant leg';el.add(leg);}
  }
  // 15.13.51 / 15.19.57: the lower hall has two rows of square columns;
  // the upper gallery keeps its lighter front row. Depth 4 puts the inner row
  // 3.5 m behind the front row without changing the building or its plinth.
  const lowerColumnRows=[.50,4.0],columnQuilts=[];
  // 15.13.51, also visible in 15.12.15: shallow floral carving on the
  // outer front pedestals. Draw an approximate palmette/scroll pattern rather
  // than copying a private photograph or inventing the deity engravings.
  function pedestalFloral(kind){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
    const c=canvas.getContext('2d');c.fillStyle='#e8e6df';c.fillRect(0,0,512,512);
    c.strokeStyle='#c5bfb3';c.lineWidth=2;c.strokeRect(19,19,474,474);
    const stroke=(start,curves)=>{c.beginPath();c.moveTo(...start);for(const curve of curves)c.bezierCurveTo(...curve);c.stroke();};
    for(const side of [-1,1]){
      c.save();c.translate(256,477);c.scale(side*470,-450);c.strokeStyle='#a58c75';c.lineWidth=.0065;
      if(kind==='palmette'){
        stroke([.015,.29],[[.025,.48,.10,.73,.38,.81],[.28,.69,.31,.65,.42,.64],[.27,.61,.26,.57,.36,.53],[.19,.53,.14,.43,.07,.30]]);
        stroke([.045,.34],[[.11,.48,.29,.50,.29,.39],[.29,.28,.13,.27,.13,.36],[.13,.43,.22,.43,.22,.36]]);
        stroke([0,.38],[[0,.65,.035,.78,.13,.83],[.06,.86,.05,.91,0,.97]]);
        stroke([.03,.75],[[.045,.81,.06,.83,.075,.84]]);
        stroke([.025,.29],[[.17,.34,.22,.25,.16,.20],[.08,.15,.10,.12,.13,.13]]);
      }else{
        stroke([0,.11],[[.13,.28,.02,.42,.12,.56],[.21,.69,.36,.76,.29,.87],[.24,.96,.10,.92,.14,.84],[.17,.78,.24,.82,.22,.86]]);
        stroke([.055,.21],[[.27,.18,.39,.33,.31,.46],[.23,.56,.11,.47,.16,.39],[.21,.32,.29,.37,.24,.41]]);
        stroke([.08,.53],[[.02,.65,.04,.76,.10,.82]]);
        stroke([.31,.55],[[.42,.67,.37,.74,.33,.73]]);
      }
      stroke([0,.09],[[.10,.22,.33,.18,.31,.06],[.29,-.01,.11,.00,.10,.08],[.10,.15,.23,.14,.21,.08]]);
      c.restore();
    }
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({name:'Adjacent pedestal '+kind+' carving',map,bumpMap:map,bumpScale:.004,roughness:.92});
  }
  const pedestalPalmette=pedestalFloral('palmette'),pedestalScroll=pedestalFloral('scroll');
  for(const depth of lowerColumnRows)for(const a of stageColumns){
    const base=1.62;
    if(depth<1&&Math.abs(a)===2){
      ab('porch statue column white foot',a,base+.18,-.50,.66,.36,.66);
      ab('porch statue column shaft',a,base+1.64,-.50,.43,2.76,.43,adjacentWhite,true);
      for(const [y,w] of [[.40,.64],[2.70,.60],[2.85,.74],[3.02,.88]])ab('porch statue column capital',a,base+y,-.50,w,.13,w);
      K.blocker(59.5,-5-a,.66,.66,base,base+.40);
      continue;
    }
    const inner=depth>1,panelHeight=inner?1.04:.72;
    ab('lower column dark foot',a,base+.06,depth,.94,.12,.94,adjacentDark);
    ab('lower column carved base',a,base+.48,depth,.84,.72,.84);
    if(!inner){
      const front=new THREE.Mesh(new THREE.PlaneGeometry(.69,.61),pedestalPalmette);
      front.name='Adjacent front pedestal floral face';front.rotation.y=-Math.PI/2;
      front.position.set(60+depth-.423,base+.48,-5-a);front.receiveShadow=true;group.add(front);
      const side=new THREE.Mesh(new THREE.PlaneGeometry(.69,.61),pedestalScroll);
      side.name='Adjacent front pedestal outer scroll face';side.rotation.y=a>0?Math.PI:0;
      side.position.set(60+depth,base+.48,-5-a-Math.sign(a)*.423);side.receiveShadow=true;group.add(side);
    }
    ab('lower column square shaft',a,base+1.86,depth,.54,2.12,.54);
    ab('lower column panel block',a,base+1.70,depth,.82,panelHeight,.82);
    for(const [y,w] of [[.84,.94],[.93,.79],[inner?1.14:1.30,.91],[inner?1.21:1.37,.86],[inner?2.25:2.09,.91],[inner?2.33:2.17,.79],[2.94,.90],[3.05,1.0]])ab('lower column moulded collar',a,base+y,depth,w,.09,w);
    for(const side of [-1,1]){
      ab('lower column dark inset panel',a,base+1.70,depth+side*.414,.58,panelHeight-.17,.014,adjacentDark);
      ab('lower column dark side panel',a+side*.414,base+1.70,depth,.014,panelHeight-.17,.58,adjacentDark);
    }
    // Low-relief diamond facets are shared instances, not individual draw calls.
    for(const y of inner?[1.04,2.46,2.63,2.80]:[1.05,1.22,2.31,2.48,2.65,2.82])for(const u of [-.135,.135])for(let face=0;face<4;face++){
      const angle=face*Math.PI/2;
      columnQuilts.push([60+depth+.274*Math.cos(angle)-u*Math.sin(angle),base+y,-5-a+.274*Math.sin(angle)+u*Math.cos(angle),angle]);
    }
    K.blocker(60+depth,-5-a,.94,.94,base,base+.98);
    K.blocker(60+depth,-5-a,.82,.82,base+.98,base+3.14);
  }
  {const facets=new THREE.InstancedMesh(new THREE.OctahedronGeometry(1),adjacentWhite,columnQuilts.length),pose=new THREE.Object3D();facets.name='Adjacent building lower column diamond relief';
    columnQuilts.forEach(([x,y,z,a],i)=>{pose.position.set(x,y,z);pose.rotation.set(0,-a,0);pose.scale.set(.022,.084,.13);pose.updateMatrix();facets.setMatrixAt(i,pose.matrix);});facets.instanceMatrix.needsUpdate=true;facets.castShadow=facets.receiveShadow=true;group.add(facets);}
  for(const base of [5.05])for(const a of stageColumns){
    if(Math.abs(a)===2){
      ab('upper porch statue column foot',a,base+.17,-.50,.61,.34,.61);
      ab('upper porch statue column shaft',a,base+1.64,-.50,.40,2.78,.40,adjacentWhite,true);
      for(const [y,w] of [[.40,.59],[2.72,.59],[2.88,.74]])ab('upper porch statue column collar',a,base+y,-.50,w,.12,w);
      continue;
    }
    ab('square column foot',a,base+.14,.50,.62,.28,.62,adjacentDark);
    ab('white column shaft',a,base+1.50,.50,.30,2.8,.30,adjacentWhite,true);
    ab('column central block',a,base+1.23,.50,.57,.61,.57);
    ab('dark inset column panel',a,base+1.23,.19,.35,.39,.025,adjacentDark);
    for(const y of [.38,.83,1.63,2.70,2.94])ab('projecting column collar',a,base+y,.50,.64,.105,.61);
  }
  // 14.59.26: statue pillars flank the stair at about ±2 m, with a second pair near ±5.6 m.
  for(const y of [4.67,8.08])ab('plain white lintel',0,y,.51,20,.23,.40);
  ab('projecting porch lower lintel',0,4.67,-.50,4.70,.23,.43);
  for(const y of [6.27]){
    for(const a of [-8,-5.5,5.5,8])ab('back wall dark window',a,y,5.73,.68,1.08,.04,adjacentDark);
    for(const a of [-2.4,0,2.4])ab('recessed back door',a,y-.10,5.70,1.02,2.13,.06,adjacentDark);
    ab('dark horizontal wall band',0,y+1.03,5.73,19.8,.22,.04,adjacentDark);
  }
  // 15.13.51 / 15.12.15 / 14.59.26: the inner columns stand beside a
  // whitewashed rear dais, with three central steps and high green vents.
  // The 0.60 m rise is estimated from the three risers; the building/plinth
  // and existing saved photo poses are unchanged.
  const daisFront=3.60,daisBack=5.75,daisTop=2.22;
  ab('rear dais white masonry',0,1.905,(daisFront+daisBack)/2,19.8,.57,daisBack-daisFront,adjacentWhite,true);
  ab('rear dais dark stone top',0,2.205,(daisFront+daisBack)/2,19.8,.03,daisBack-daisFront,hallFloorStone);
  K.surface(60+(daisFront+daisBack)/2,-5,daisBack-daisFront,19.8,daisTop);
  ab('rear dais dark foot',0,1.675,daisFront-.012,19.8,.11,.026,adjacentDark);
  for(let i=0;i<3;i++){
    const top=1.62+(i+1)*.20,depth=2.4+(i+.5)*.4;
    ab('rear dais access stair',0,(1.62+top)/2,depth,1.90,top-1.62,.405,adjacentDark);
    ab('rear dais stair worn nosing',0,top+.006,depth-.19,1.92,.012,.025,materials.mortar);
  }
  K.ramp(63.0,-5,1.20,1.90,'x',1.62,daisTop);
  // A closed dark rear panel and smaller wall pictures are visible below the
  // vents; do not invent three full-height entrances behind the raised floor.
  const rearPanel=new THREE.MeshStandardMaterial({color:'#493c38',roughness:.92});
  ab('lower hall rear dark panel',0,2.88,5.735,1.02,1.31,.028,rearPanel);
  for(const a of [-7.1,-4.7,4.7,7.1])ab('lower hall small wall panel',a,3.13,5.735,.58,.83,.028,adjacentDark);
  const ventTimber=new THREE.MeshStandardMaterial({color:'#685848',roughness:.9});
  const ventGlass=new THREE.MeshStandardMaterial({color:'#708276',roughness:.56});
  for(const a of [-6.3,-2.1,2.1,6.3]){
    ab('lower hall clerestory dark recess',a,4.27,5.735,2.34,.48,.035,adjacentDark);
    ab('lower hall green vent glass',a,4.27,5.707,2.18,.36,.025,ventGlass);
    for(const dy of [-.215,.215])ab('lower hall vent timber frame',a,4.27+dy,5.68,2.34,.055,.07,ventTimber);
    for(const da of [-1.14,-.38,.38,1.14])ab('lower hall vent timber mullion',a+da,4.27,5.68,.048,.43,.07,ventTimber);
    for(const dy of [-.12,0,.12])ab('lower hall horizontal vent bars',a,4.27+dy,5.66,2.26,.022,.036,adjacentDark);
  }
  for(const y of [5.14,5.89]){
    for(const a of [-5.875,5.875])ab('white balcony rail',a,y,.26,7.75,.12,.24);
    ab('central projecting balcony rail',0,y,-.90,4.0,.12,.24);
    for(const a of [-2,2])ab('projecting balcony return rail',a,y,-.32,.24,.12,1.16);
  }
  K.blocker(59.10,-5,.24,4,5.05,5.97);
  for(const a of [-2,2])K.blocker(59.68,-5-a,1.16,.24,5.05,5.97);

  // 15.19.57: a sloping terracotta sunshade with a scalloped lip runs under the
  // balcony; its centre bay projects farther beneath the gabled porch.
  const terracotta=new THREE.MeshStandardMaterial({color:'#b8603f',roughness:.9});
  const chajja=(z0,z1,out,top)=>{const depth=out,drop=.36,len=z1-z0;
    const slab=new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(depth,drop),.07,len),terracotta);slab.name='Adjacent building terracotta sunshade';
    slab.rotation.z=Math.atan2(drop,depth);slab.position.set(60.35-depth/2,top-drop/2,(z0+z1)/2);slab.castShadow=slab.receiveShadow=true;group.add(slab);
    const lip=new THREE.Shape(),n=Math.max(2,Math.round(len/.34)),step=len/n;lip.moveTo(0,0);lip.lineTo(len,0);lip.lineTo(len,-.10);
    for(let i=n;i>0;i--){const x=i*step;lip.quadraticCurveTo(x-step/2,-.26,x-step,-.10);}lip.closePath();
    const fascia=new THREE.Mesh(new THREE.ExtrudeGeometry(lip,{depth:.05,bevelEnabled:false,curveSegments:4}),terracotta);fascia.name='Adjacent building scalloped sunshade lip';
    fascia.rotation.y=Math.PI/2;fascia.position.set(60.35-depth-.02,top-drop+.03,z1);fascia.castShadow=true;group.add(fascia);
    const ribs=Math.round(len/.62);for(let i=0;i<=ribs;i++)box('Adjacent building sunshade relief rib',60.35-depth/2,top-drop/2+.05,z0+len*i/ribs,Math.hypot(depth,drop)*.9,.04,.05,terracotta).rotation.z=Math.atan2(drop,depth);
  };
  chajja(-15.3,-7.4,.95,5.02);chajja(-2.6,5.3,.95,5.02);chajja(-7.4,-2.6,1.70,5.12);
  ab('red balcony cornice',0,4.85,.0,20.65,.17,.9,'red');
  for(const a of [-5.925,5.925])ab('red balcony coping',a,5.97,.26,7.85,.08,.27,'red');
  ab('projecting balcony red coping',0,5.97,-.90,4.0,.08,.27,'red');
  for(const a of [-2,2])ab('projecting balcony red return coping',a,5.97,-.32,.27,.08,1.16,'red');
  const adjacentRoof=K.hipRoof(group,'Adjacent building weathered tiled roof',0,0,21.1,7.1,8.35,1.07);adjacentRoof.rotation.y=Math.PI/2;adjacentRoof.position.set(62.9,0,-5);
  const adjacentGable=new THREE.Shape();
  adjacentGable.moveTo(-2.6,7.99);adjacentGable.lineTo(-2.6,8.48);adjacentGable.lineTo(0,9.61);adjacentGable.lineTo(2.6,8.48);adjacentGable.lineTo(2.6,7.99);adjacentGable.lineTo(1.40,7.99);adjacentGable.lineTo(1.40,8.39);adjacentGable.quadraticCurveTo(0,9.84,-1.40,8.39);adjacentGable.lineTo(-1.40,7.99);adjacentGable.closePath();
  const gableMesh=new THREE.Mesh(new THREE.ExtrudeGeometry(adjacentGable,{depth:.22,bevelEnabled:false,curveSegments:16}),adjacentWhite);gableMesh.rotation.y=Math.PI/2;gableMesh.position.set(59.0,0,-5);gableMesh.name='Adjacent building central arched gable';group.add(gableMesh);K.roofs.push(gableMesh);
  box('Stage central porch lintel',59.50,8.07,-5,.43,.20,4.70,adjacentWhite);
  for(const side of [-1,1])K.beam(group,'Adjacent building red gable edge',[58.96,8.52,-5+side*2.67],[58.96,9.69,-5],.15,'red',.21);
  // Two roof slopes, open at the ends so the arched white gable is not
  // filled with the helper roof's triangular tile end-cap.
  {const positions=[],uv=[];
   for(const side of [-1,1]){const corners=[[58.92,8.53,-5+side*2.72],[62.4,8.53,-5+side*2.72],[62.4,9.72,-5],[58.92,9.72,-5]];
    for(const i of [0,1,2,0,2,3]){positions.push(...corners[i]);uv.push(corners[i][0]*.5,corners[i][2]*.5);}}
   const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geom.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geom.computeVertexNormals();
   const roofMat=K.M.tile.clone();roofMat.side=THREE.DoubleSide;
   const roof=new THREE.Mesh(geom,roofMat);roof.name='Stage projecting gable roof slopes';roof.castShadow=roof.receiveShadow=true;group.add(roof);K.roofs.push(roof);}
  // Four decorative figures are sampled from the already-approved 15.19.57
  // photograph. Only the architectural figures, not people in its forecourt.
  function stageFigure(name,a,y,rect){
    const map=new THREE.TextureLoader().load('./assets/temple.jpg');map.colorSpace=THREE.SRGBColorSpace;
    const [x0,y0,x1,y1]=rect;map.repeat.set((x1-x0)/1824,(y1-y0)/1368);map.offset.set(x0/1824,1-y1/1368);
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(.76,1.80),new THREE.MeshStandardMaterial({map,roughness:.96}));panel.name=name;panel.rotation.y=-Math.PI/2;panel.position.set(59.135,y,-5-a);group.add(panel);
  }
  stageFigure('Stage upper left photographed figure',2,6.68,[696,303,755,462]);
  stageFigure('Stage upper right photographed figure',-2,6.68,[1000,303,1070,462]);
  stageFigure('Stage lower left photographed figure',2,2.68,[680,682,758,859]);
  stageFigure('Stage lower right photographed figure',-2,2.68,[996,685,1072,862]);
  // 15.13.51 / 15.19.57: curled brackets project beyond the capital collars
  // in both beam directions. Starting at the centre hid the old small profile
  // inside the one-metre collar; anchor these at the shaft face instead.
  const corbelShape=new THREE.Shape();corbelShape.moveTo(0,0);corbelShape.lineTo(.60,0);
  corbelShape.quadraticCurveTo(.60,-.16,.52,-.22);corbelShape.lineTo(.43,-.22);
  corbelShape.bezierCurveTo(.52,-.29,.46,-.43,.39,-.40);
  corbelShape.bezierCurveTo(.29,-.38,.31,-.20,0,-.20);corbelShape.closePath();
  const corbelGeometry=new THREE.ExtrudeGeometry(corbelShape,{depth:.18,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2,curveSegments:10});
  corbelGeometry.translate(0,0,-.09);
  for(const [base,depth] of [[1.62,.50],[1.62,4.0],[5.05,.50]])for(const a of stageColumns){
    const front=depth<1&&Math.abs(a)===2?-.50:depth;
    for(let face=0;face<4;face++){
      const angle=face*Math.PI/2;
      const bracket=new THREE.Mesh(corbelGeometry,adjacentWhite);bracket.name='Stage shaped column capital bracket';
      bracket.rotation.y=angle;bracket.position.set(60+front+.24*Math.cos(angle),base+3.16,-5-a-.24*Math.sin(angle));
      bracket.castShadow=bracket.receiveShadow=true;group.add(bracket);
    }
  }
  // 15.12.15 / 14.59.26 / 15.19.57: a flat pierced screen with slender
  // stems and forked shoulders, rather than round hourglass spindles.
  const baluster=new THREE.Shape();baluster.moveTo(-.062,0);baluster.lineTo(.062,0);
  baluster.lineTo(.062,.054);baluster.lineTo(.035,.095);baluster.lineTo(.035,.365);
  baluster.lineTo(.052,.401);baluster.lineTo(.052,.434);baluster.lineTo(.026,.463);
  baluster.lineTo(.026,.505);baluster.quadraticCurveTo(.054,.55,.108,.582);
  baluster.quadraticCurveTo(.066,.598,.087,.66);baluster.quadraticCurveTo(.024,.655,0,.584);
  baluster.quadraticCurveTo(-.024,.655,-.087,.66);baluster.quadraticCurveTo(-.066,.598,-.108,.582);
  baluster.quadraticCurveTo(-.054,.55,-.026,.505);baluster.lineTo(-.026,.463);
  baluster.lineTo(-.052,.434);baluster.lineTo(-.052,.401);baluster.lineTo(-.035,.365);
  baluster.lineTo(-.035,.095);baluster.lineTo(-.062,.054);baluster.closePath();
  const screenGeometry=new THREE.ExtrudeGeometry(baluster,{depth:.09,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:1,curveSegments:8});screenGeometry.translate(0,0,-.045);
  const spindlePositions=[];for(let i=0;i<77;i++){const z=-14.5+i*.25;spindlePositions.push([z>-7&&z<-3?59.10:60.255,5.18,z,Math.PI/2]);}
  for(const z of [-7,-3])for(let i=1;i<=4;i++)spindlePositions.push([59.1+i*.23,5.18,z,0]);
  const stageSpindles=new THREE.InstancedMesh(screenGeometry,adjacentWhite,spindlePositions.length);stageSpindles.name='Adjacent building shaped white balcony balusters';
  const stagePose=new THREE.Object3D();spindlePositions.forEach(([x,y,z,angle],i)=>{stagePose.position.set(x,y,z);stagePose.rotation.set(0,angle,0);stagePose.updateMatrix();stageSpindles.setMatrixAt(i,stagePose.matrix);});stageSpindles.instanceMatrix.needsUpdate=true;stageSpindles.castShadow=stageSpindles.receiveShadow=true;group.add(stageSpindles);
  // Tile relief follows the existing hipped roof, keeping its profile and alignment.
  const roofCourses=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),K.M.tile,25*65);roofCourses.name='Stage overlapping roof tile courses';
  for(let i=0;i<25;i++)for(let j=0;j<65;j++){
    const x=-3.42+i*.284,z=-10.35+j*.323,fx=(3.55-Math.abs(x))/3.55,fz=(10.55-Math.abs(z))/3.195;
    const h=1.07*Math.max(0,Math.min(fx,fz,1));stagePose.position.set(62.9+x,8.39+h,-5+z);stagePose.rotation.set(fz<fx?Math.sign(z)*.32:0,0,fz<fx?0:-Math.sign(x)*.293);stagePose.scale.set(.30,.048,.34);stagePose.updateMatrix();roofCourses.setMatrixAt(i*65+j,stagePose.matrix);
  }
  roofCourses.instanceMatrix.needsUpdate=true;group.add(roofCourses);K.roofs.push(roofCourses);
  // 14.28.15 / 14.28.19 / 15.28.45: the building stands on a plinth about 2.8 m high, not
  // 1.6 m, and 15.13.30 shows plain treads below the tiled flight. Everything above the
  // plinth rises by ADY, the foundation grows, and a plain lower flight is added.
  {const ADY=1.2,b3=new THREE.Box3(),kids=group.children.slice(adjacentStart.children);group.updateMatrixWorld(true);
   for(const o of kids){b3.setFromObject(o);if(b3.isEmpty())continue;
     if(/raised dark foundation/.test(o.name)){o.scale.y*=(1.52+ADY)/1.52;o.position.y=(1.52+ADY)/2;continue;}
     if(/worn foundation course|elephant|Elephant/.test(o.name))continue;
     if(/central stair|diamond stair riser/.test(o.name)||b3.min.y>.3)o.position.y+=ADY;}
   for(const c of K.colliders.slice(adjacentStart.colliders)){if(c.bottom>.3){c.bottom+=ADY;c.top+=ADY;}else if(c.top>1.4&&c.top<1.7)c.top+=ADY;}
   for(const r of K.surfaces.slice(adjacentStart.surfaces))if(r.y>1)r.y+=ADY;
   // Replace the original outside stair ramp, preserving raised interior stairs.
   K.ramps.splice(adjacentStart.ramps,1);
   for(const r of K.ramps.slice(adjacentStart.ramps)){r.lowY+=ADY;r.highY+=ADY;}
   box('Adjacent building stair solid base',58.45,ADY/2,-5,3.1,ADY,3.8,'paleStone');
   const n=7,run=.314,x0=56.9-n*run;
   for(let i=0;i<n;i++){const x=x0+(i+.5)*run,y=(i+1)*ADY/n;
     box('Adjacent building plain lower stair tread',x,y/2,-5,run+.005,y,3.8,materials.basalt);}
   K.ramp(x0+n*run/2,-5,n*run,3.8,'x',0,ADY);K.ramp(58.45,-5,3.1,3.8,'x',ADY,1.62+ADY);}
  K.labels.push({text:'Adjacent building',position:[60,11.7,-5]});
  // 15.20.13 and 15.28.26: the same shop, beside the adjacent two-storey
  // building, on the lake's eastern edge. The frontage faces -X, like its neighbor.
  // In the across-lake view, the shop is left of the adjacent building (-Z).
  const shopCream=K.M.plaster.clone();shopCream.color.set('#ddd7bd');
  const shopWhite=K.M.plaster.clone();shopWhite.color.set('#e4e0d5');
  const shopBlue=K.M.blue.clone();shopBlue.color.set('#849b96');
  const shopWood=K.M.wood.clone();shopWood.color.set('#665046');
  const sb=(n,a,y,depth,w,h,d,m=shopWhite,solid=false)=>box('Shop '+n,60+depth,y,-25-a,d,h,w,m,solid);
  sb('long white shopfront body',0,1.79,4.2,18.4,3.08,4.0,shopWhite,true);
  sb('dark damp wall base',0,.46,2.185,18.45,.48,.06,materials.basalt);
  sb('raised veranda slab',0,.19,1.14,18.8,.22,2.65,materials.path);
  K.surface(61.14,-25,2.65,18.8,.30);
  sb('mossy platform front',0,.15,-.20,18.9,.22,.12,materials.wetStone);
  // 15.20.13 / 14.59.54: a broad mown lawn runs from the tank rail to the shop,
  // crossed lengthwise by a worn red laterite footpath about 3 m from the veranda.
  box('Shop-front lawn beside the tank',55.35,.018,-27.9,7.9,.036,31.2,verge);
  K.surface(55.35,-27.9,7.9,31.2,.036);
  // The path starts beside the far end of the veranda and bends toward the lane steps.
  {const path=box('Shop-front worn laterite footpath',56.75,.021,-24.3,1.35,.04,22.4,materials.redSoil);path.rotation.y=-.165;
    K.surface(56.75,-24.3,2.6,22.4,.041);}
  box('Footpath widening at the lane steps',55.0,.022,-13.5,2.2,.04,1.4,materials.redSoil);
  // 14.59.54: broad concrete steps lead down from the lane end to the lawn;
  // 15.20.13 is taken from their foot. A raised concrete platform with a drain
  // opening stands to their right.
  const laneConcrete=materials.mortar.clone();laneConcrete.color.set('#8d877c');
  box('Lane-end concrete landing',54.2,.225,-8.95,5.0,.45,3.3,laneConcrete,false);K.surface(54.2,-8.95,5.0,3.3,.45);
  steps('Lane-end concrete steps down to the lawn',54.2,-11.5,5.0,1.8,'z',0,.45,3,laneConcrete);
  box('Lane-end raised concrete platform',57.75,.40,-11.6,2.3,.80,2.4,laneConcrete,true);
  box('Platform dark drain opening',56.59,.12,-12.2,.02,.2,.34,materials.darkSoil);
  // 15.20.13 and 15.28.26: beyond the tank's south-east corner a steep wooded
  // bank rises about 4.6 m, climbed by a laterite stair, with a small white
  // building of the lake entrance group and a dark-roofed shed on top.
  const bankProfile=new THREE.Shape([[0,0],[2.4,4.6],[13.5,4.6],[13.5,0]].map(([u,v])=>new THREE.Vector2(u,v)));
  const bankGeo=new THREE.ExtrudeGeometry(bankProfile,{depth:12.2,bevelEnabled:false});bankGeo.rotateY(Math.PI/2);
  const bankGreen=new THREE.MeshStandardMaterial({color:'#4c5a33',roughness:1});const hillBank=new THREE.Mesh(bankGeo,bankGreen);hillBank.name='South-east wooded bank';hillBank.position.set(49.8,0,-46.3);hillBank.castShadow=hillBank.receiveShadow=true;group.add(hillBank);
  box('South-east bank grassy crest',55.9,4.62,-54.5,12.2,.04,11.4,verge);K.surface(55.9,-54.5,12.2,11.4,4.64);
  K.blocker(55.9,-53.1,12.2,13.6,0,4.5);
  steps('South-east laterite hill stair',50.55,-47.5,1.3,2.4,'-z',.05,4.62,14,materials.redSoil);
  const entranceWhite=materials.oldWhite.clone();entranceWhite.color.set('#e9e6dc');
  const entrancePink=materials.oldWhite.clone();entrancePink.color.set('#c77b7e');
  box('Lake entrance small white block',53.5,4.62+1.35,-50.3,2.5,2.7,2.8,entranceWhite,true);
  box('Lake entrance block pink dado',53.5,4.62+.25,-50.3,2.54,.5,2.84,entrancePink);
  const slab=box('Lake entrance block flat roof',53.5,4.62+2.78,-50.3,2.8,.16,3.1,materials.roofConcrete);K.roofs.push(slab);
  for(const x of [55.6,57.9])for(const z of [-49.3,-51.2])box('Entrance shed timber post',x,4.62+1.05,z,.12,2.1,.12,'wood',true);
  const shedRoof=box('Entrance shed dark sheet roof',56.75,4.62+2.2,-50.25,2.9,.06,2.5,materials.basalt);shedRoof.rotation.x=-.12;K.roofs.push(shedRoof);
  const shrubGreen=new THREE.MeshStandardMaterial({color:'#3d5a2a',roughness:.95,flatShading:true});
  for(let i=0;i<14;i++){const bush=new THREE.Mesh(new THREE.IcosahedronGeometry(.55+(i%4)*.18,0),shrubGreen);bush.name='South-east bank shrub';
    const t=i/13;bush.position.set(51.6+t*10.2+Math.sin(i*2.3)*.4,.4+(i%3)*1.2+(i%5)*.3,-46.5-(i%3)*.7);bush.scale.y=.8;bush.castShadow=true;group.add(bush);}
  // Broken grassy edges and the narrow concrete threshold step.
  sb('front entry shallow step',-.8,.075,-.42,2.1,.15,.42,materials.mortar);K.surface(59.58,-24.2,.42,2.1,.15);
  for(const a of [-5.1,-1.7,2.4,6.7,9.0]){
    sb('white veranda post',a,1.64,.12,.22,2.68,.24,shopWhite,true);
    sb('black veranda post foot',a,.69,.105,.25,.78,.27,materials.basalt);
  }
  // 14.59.54 / 15.20.13: the cream end block comes down to the ground on the veranda line,
  // with a black damp base; the near end has only a thin metal pole for the sheet canopy and sign.
  sb('cream end lower block',-7,1.55,.95,3.4,3.1,2.5,shopCream,true);
  sb('cream end lower block damp base',-7,.3,-.32,3.42,.6,.04,materials.basalt);
  sb('cream end lower window dark opening',-7,1.7,-.33,1.0,1.2,.03,materials.darkSoil);
  sb('near end thin metal pole',-8.8,1.45,.12,.07,2.9,.07,'metal',true);
  // Weathered wood shutters, a pale-blue surround and barred central bays.
  for(const [a,w] of [[-4.4,3.5],[.4,3.2],[4.4,2.3]]){
    sb('pale shutter surround',a,1.82,2.14,w+.28,2.37,.12,shopBlue);
    sb('recessed dark shutter bay',a,1.82,2.055,w,2.16,.035,materials.darkSoil);
    for(let i=0;i<Math.round(w/.32);i++)sb('vertical timber shutter board',a-w/2+.16+i*.32,1.82,2.02,.27,2.09,.04,shopWood);
    for(const y of [.80,2.74])sb('shutter timber crossbar',a,y,1.98,w,.075,.05,shopWood);
  }
  for(const a of [.4,4.4]){
    for(let j=0;j<13;j++)sb('shopfront vertical grille',a-1.12+j*.185,1.64,1.86,.024,2.05,.028,materials.mortar);
    sb('shopfront grille middle rail',a,1.28,1.83,2.3,.04,.03,materials.mortar);
  }
  sb('small far-left window',7.7,1.86,2.12,.62,1.01,.075,shopWood);
  // Long mossy tiled lean-to with a patched sheet strip along the lower eave.
  const shopAwning=new THREE.Group();shopAwning.name='Shop long weathered awning';group.add(shopAwning);K.roofs.push(shopAwning);
  const awningPoints=[59.48,2.87,-34.65,59.48,2.87,-15.35,63.65,4.40,-15.35,63.65,4.40,-34.65];
  const awningGeo=new THREE.BufferGeometry();awningGeo.setAttribute('position',new THREE.Float32BufferAttribute(awningPoints,3));awningGeo.setIndex([0,2,1,0,3,2]);awningGeo.computeVertexNormals();
  const roofMaterial=K.M.tile.clone();roofMaterial.side=THREE.DoubleSide;
  const awningBase=new THREE.Mesh(awningGeo,roofMaterial);awningBase.name='Shop sloping awning underside';shopAwning.add(awningBase);
  const tileGeo=new THREE.BoxGeometry(1,1,1),tileCount=12*66;
  const shopTiles=new THREE.InstancedMesh(tileGeo,roofMaterial,tileCount);shopTiles.name='Shop overlapping weathered tile courses';
  const tilePose=new THREE.Object3D(),slope=Math.atan2(1.53,4.17);
  for(let row=0;row<12;row++)for(let col=0;col<66;col++){
    const x=59.57+row*.344,z=-34.5+col*.288;
    tilePose.position.set(x,2.87+(x-59.48)*1.53/4.17+.025,z);tilePose.rotation.set(0,0,slope);tilePose.scale.set(.40,.055,.278);tilePose.updateMatrix();shopTiles.setMatrixAt(row*66+col,tilePose.matrix);
    shopTiles.setColorAt(row*66+col,new THREE.Color().setHSL(.07+(col%4)*.008,.12+(row%3)*.055,.20+((row*13+col*7)%11)*.018));
  }
  shopTiles.instanceMatrix.needsUpdate=true;shopTiles.instanceColor.needsUpdate=true;shopAwning.add(shopTiles);
  for(const a of [-8.2,-.6,3.2]){
    const sheet=sb('patched corrugated eave',a,3.02,.15,2.0,.06,1.12,materials.mortar);sheet.rotation.z=slope;group.remove(sheet);shopAwning.add(sheet);
    for(let j=0;j<15;j++){
      const rib=sb('patch sheet narrow ridge',a-.94+j*.134,3.055,.15,.028,.025,1.12,materials.basalt);rib.rotation.z=slope;group.remove(rib);shopAwning.add(rib);
    }
  }
  for(const a of [-9,-5.1,-1.7,2.4,6.7,9])K.beam(shopAwning,'Shop exposed awning rafter',[59.45,2.80,-25-a],[63.60,4.32,-25-a],.075,shopWood);
  const dryTufts=new THREE.InstancedMesh(new THREE.ConeGeometry(.025,1,3),materials.dryPalm,160);dryTufts.name='Shop dry grass in weathered roof tiles';
  for(let i=0;i<160;i++){
    const centers=[[60.10,-33.1,.55,1.0],[61.75,-23.8,.65,1.25],[62.50,-22.2,.43,.75]];
    const [cx,cz,rx,rz]=centers[i%3],angle=i*2.39996,r=Math.sqrt(((i*37)%157)/157);
    const x=cx+Math.cos(angle)*rx*r,z=cz+Math.sin(angle)*rz*r,h=.16+(i%9)*.045;
    tilePose.position.set(x,2.87+(x-59.48)*1.53/4.17+h/2,z);tilePose.rotation.set(.18*Math.sin(i),i*2.4,.22*Math.cos(i));tilePose.scale.set(1,h,1);tilePose.updateMatrix();dryTufts.setMatrixAt(i,tilePose.matrix);
  }
  dryTufts.instanceMatrix.needsUpdate=true;shopAwning.add(dryTufts);
  // Higher rear block to photo-left and the small cream tower beside the neighbor.
  sb('upper white rear block',4.2,4.58,4.65,8.8,2.52,4.5,shopWhite,true);
  const shopUpperRoof=K.hipRoof(group,'Shop rear tiled roof',0,0,9.55,5.05,5.91,1.13);shopUpperRoof.rotation.y=Math.PI/2;shopUpperRoof.position.set(64.65,0,-29.2);
  sb('upper terrace slab',1.65,6.05,4.1,3.25,.16,3.3,shopWhite);
  sb('upper weathered terrace parapet',1.65,6.44,2.52,3.25,.70,.16,shopWhite);
  sb('upper terrace side parapet',.10,6.44,4.05,.16,.70,3.20,shopWhite);
  // The ventilator is recessed through the front shell of the cream block.
  sb('cream end upper block',-7,4.16,4.58,3.55,2.12,3.74,shopCream,true);
  for(const a of [-8.105,-5.895])sb('cream ventilator side masonry',a,4.16,2.43,1.34,2.12,.56,shopCream,true);
  sb('cream ventilator lower masonry',-7,3.40,2.43,.87,.60,.56,shopCream,true);
  sb('cream ventilator upper masonry',-7,4.985,2.43,.87,.47,.56,shopCream,true);
  K.hipRoof(group,'Shop cream end hipped tile roof',64.3,-18.0,4.9,4.2,5.25,1.02);
  sb('end block ventilator dark interior',-7,4.225,2.70,.86,1.05,.018,materials.darkSoil);
  const shopVentShape=new THREE.Shape();
  shopVentShape.moveTo(-.43,-.525);shopVentShape.lineTo(.43,-.525);shopVentShape.lineTo(.43,.525);shopVentShape.lineTo(-.43,.525);shopVentShape.closePath();
  // Six rows of chamfered openings retain the diagonals visible in 15.20.13.
  for(let row=0;row<6;row++)for(let col=0;col<3;col++){
    const x=(col-1)*.265,y=(row-2.5)*.166,hole=new THREE.Path();
    for(const [i,[dx,dy]] of [[-.096,-.047],[-.048,-.069],[.096,-.047],[.096,.047],[.048,.069],[-.096,.047]].entries()) {
      if(i===0)hole.moveTo(x+dx,y+dy);else hole.lineTo(x+dx,y+dy);
    }
    hole.closePath();shopVentShape.holes.push(hole);
  }
  const shopVent=new THREE.Mesh(new THREE.ExtrudeGeometry(shopVentShape,{depth:.075,bevelEnabled:false}),shopCream);
  shopVent.name='Shop pierced cream masonry ventilator';shopVent.rotation.y=-Math.PI/2;shopVent.position.set(62.34,4.225,-18);group.add(shopVent);
  // The photo separates a plank bench on laterite blocks from a grey stone seat.
  const benchLaterite=K.M.plaster.clone();benchLaterite.color.set('#99634c');
  const benchStone=K.M.plaster.clone();benchStone.color.set('#777970');
  for(const a of [-4.35,-2.85])for(const y of [.415,.605])sb('laterite bench support course',a,y,1.03,.45,.18,.63,benchLaterite);
  sb('short timber shop bench',-3.60,.735,1.03,2.22,.08,.76,shopWood);
  sb('long grey masonry bench slab',-5.55,.76,1.53,2.28,.14,.62,benchStone);
  for(const a of [-6.45,-4.70])sb('grey masonry bench leg',a,.505,1.53,.24,.41,.55,benchStone);
  for(let j=0;j<24;j++){
    const a=2.6+(j%5)*.21,y=.42+Math.floor(j/8)*.15,depth=1.44+(Math.floor(j/5)%3)*.19;
    instance('Shop coconut pile',sphere,materials.coconut,[60+depth,y,-25-a],[.14,.17,.15]);
  }
  sb('yellow bottle crate',-8,.52,1.22,.70,.41,.55,new THREE.MeshStandardMaterial({color:'#b4a33d',roughness:.94}));
  for(let i=0;i<6;i++)K.cylinder(group,'Shop green glass bottle',61.1+(i%2)*.15,.84,-17.22+Math.floor(i/2)*.15,.045,.054,.28,materials.wetStone,8);
  sb('small shop wooden stool top',-7.0,.90,.70,.66,.10,.55,shopWood);
  for(const a of [-7.24,-6.76])for(const depth of [.48,.92])sb('shop stool leg',a,.59,depth,.07,.58,.07,shopWood);
  // Original hanging sign: UV crop of lettering only, preserving the photograph.
  const shopSignMap=new THREE.TextureLoader().load('./assets/shop-temple-side.jpg');shopSignMap.colorSpace=THREE.SRGBColorSpace;
  const shopSignGeo=new THREE.PlaneGeometry(.78,.51),signUV=shopSignGeo.attributes.uv;
  const signCorners=[[1460,635],[1534,703],[1422,678],[1500,745]];
  for(let i=0;i<4;i++)signUV.setXY(i,signCorners[i][0]/1824,1-signCorners[i][1]/1368);
  const shopSign=new THREE.Mesh(shopSignGeo,new THREE.MeshStandardMaterial({map:shopSignMap,roughness:1,side:THREE.DoubleSide}));
  shopSign.name='Shop photographed hanging sign';shopSign.position.set(59.82,1.73,-16.6);shopSign.rotation.y=-Math.PI/2;shopSign.rotateZ(-.34);group.add(shopSign);
  K.cylinder(group,'Shop slender sign pole',59.87,1.53,-16.6,.024,.027,2.96,materials.mortar,8);
  // Rain gutter/drain beside the end block, with an open ditch behind its lip.
  box('Shop side open drain bottom',64.0,.025,-15.24,7.5,.04,.34,materials.wetStone);
  for(const z of [-15.47,-15.02])box('Shop side drain concrete lip',64,.11,z,7.5,.18,.12,materials.mortar);
  K.labels.push({text:'Lakeside shop',position:[60.1,3.6,-25]});
  // The roofed tank-side structure is the long bathing arcade above.
  // There is no separate tiny gatehouse on the intervening boundary.
  function laneHouse(name,x,z,w,d,h,front){
    box(name+' white walls',x,h/2+.15,z,w,h,d,'plaster',true);
    box(name+' red oxide base',x,.40,z,w+.03,.55,d+.03,'red');
    K.hipRoof(group,name+' weathered tiled roof',x,z,w+1.1,d+1.2,h+.25,1.15);
    const face=z+front*(d/2+.025);
    box(name+' dark doorway',x-.8,1.2,face,.87,2.1,.04,'wood');
    for(const xx of [x-2.1,x+1.45])box(name+' dark small window',xx,1.65,face,.56,.85,.04,'wood');
  }
  // Its placement is estimated; keep this low outbuilding clear of the now
  // family-confirmed road on the house-facing side of the temple.
  laneHouse('Temple-side low white outbuilding',51.8,.10,6.7,4.2,2.70,-1);
  // Damp black base is visible on the close wall in the left-facing photograph.
  box('Temple-side outbuilding black damp base',51.8,.47,-2.025,6.73,.83,.035,materials.wetStone);
  laneHouse('Western lane right cottage',-28,-13.0,8.2,5.4,2.6,1);
  // 14.46.51 resolves the roadside facade: raised door between barred
  // windows and a shallow white projection with a half-height brown shutter.
  const cottageWood=new THREE.MeshStandardMaterial({color:'#664239',roughness:.96});
  box('Western cottage dark raised foundation',-28,.225,-13,8.24,.45,5.44,materials.wetStone);
  group.getObjectByName('Western lane right cottage dark doorway').position.y=1.50;
  for(let i=0;i<3;i++){
    const top=.45-i*.15,z=-10.275+.14+i*.28;
    box('Western cottage worn doorstep',-28.8,top/2,z,1.05,top,.30,materials.path);
    K.surface(-28.8,z,1.05,.30,top);
  }
  for(const x of [-30.1,-26.55]){
    for(let j=0;j<7;j++)box('Western cottage narrow window iron bar',x-.22+j*.073,1.65,-10.24,.017,.78,.018,materials.mortar);
    for(const dx of [-.31,.31])box('Western cottage small window timber jamb',x+dx,1.65,-10.24,.055,.94,.08,cottageWood);
  }
  box('Western cottage projecting white shutter bay',-24.95,1.48,-10.15,1.95,2.35,.36,'plaster');
  box('Western cottage shutter bay dark sill',-24.95,.345,-9.951,1.95,.08,.045,materials.wetStone);
  box('Western cottage recessed brown half shutter',-24.95,2.04,-9.951,1.25,.71,.045,cottageWood);
  for(let j=0;j<9;j++)box('Western cottage shutter horizontal louvre',-24.95,1.72+j*.077,-9.915,1.20,.018,.025,materials.darkSoil);
  const cottageCanopy=box('Western cottage shallow grey shutter canopy',-24.95,2.72,-10.01,2.15,.065,.77,materials.roofConcrete);
  cottageCanopy.rotation.x=.13;K.roofs.push(cottageCanopy);

  box('Western cottage recessed pink upper floor',-29.1,4.17,-15.2,6.2,1.62,3.8,'pink',true);
  box('Western cottage pale terrace slab',-29.1,5.02,-15.2,6.5,.16,4.1,'plaster');
  box('Western cottage pink terrace parapet',-29.1,5.29,-13.22,6.5,.52,.16,'pink');
  K.cylinder(group,'Western cottage rooftop water tank',-30.5,5.48,-15.25,.54,.54,.77,'black',16);
  const bendMeshes=group.children.length,bendColliders=K.colliders.length,bendSurfaces=K.surfaces.length;
  laneHouse('White porch at the lane bend',-44.5,-.7,6.4,5.4,2.7,-1);
  box('Lane bend porch red parapet',-44.5,.70,-4.65,5.8,.65,.20,'red');
  for(const x of [-47.25,-41.75])box('Lane bend porch white column',x,1.8,-4.62,.23,2.8,.25,'plaster',true);
  K.gableRoof(group,'Lane bend little porch roof',-44.5,-4.1,7.0,2.4,3.2,.6);
  const bendRise=roadRise(-44.5);
  for(const m of group.children.slice(bendMeshes))m.position.y+=bendRise;
  for(const c of K.colliders.slice(bendColliders)){c.bottom+=bendRise;c.top+=bendRise;}
  for(const f of K.surfaces.slice(bendSurfaces))f.y+=bendRise;
  box('Lane bend raised laterite terrace',-44.5,bendRise/2,-1.2,9.0,bendRise,8.0,materials.redSoil);
  K.surface(-44.5,-1.2,9.0,8.0,bendRise);
  // Poles and four sagging wires on photo-left when looking away from temple.
  const poles=[[-15,-.8],[-33,-1.5],[-52,-6.4],[-70,-14.1]];
  for(const [x,z] of poles){
    K.cylinder(group,'Lane slender utility pole',x,3.55,z,.055,.085,7.1,materials.trunkRings,9,true);
    box('Utility pole short crossarm',x,6.62,z,.10,.11,1.25,'wood');
  }
  for(let i=1;i<poles.length;i++)for(let wire=0;wire<4;wire++){
    const [ax,az]=poles[i-1],[bx,bz]=poles[i],points=[];
    for(let j=0;j<=12;j++){const t=j/12;points.push(new THREE.Vector3(THREE.MathUtils.lerp(ax,bx,t),6.66-.46*Math.sin(t*Math.PI),THREE.MathUtils.lerp(az,bz,t)+(wire-1.5)*.29));}
    const cable=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#343c32'}));cable.name='Sagging roadside utility wire';group.add(cable);
  }
  // The photographed canopy encloses the lane instead of sitting far behind it.
  for(const [x,z,h,r] of [[-17,5,10,4.7],[-27,4,11,5.0],[-37,3.5,12,5.4],[-52,0,10,4.5],[-62,-3,12,5],[-41,-19,9,4.3],[-60,-25,10,5]])broadleaf(x,z,h,r);
  for(const p of [[-24,-13,15],[-31,-11,16],[-35,-19,17],[-41,-15,14],[-53,-22,16]])palm(...p);
  for(let i=0;i<230;i++){
    const t=range(0,.59),p=roadCurve.getPoint(t),side=i%2?1:-1,z=p.z+side*range(2.45,4.15);
    shrub(p.x,z,range(.4,1.15));
    if(i%3===0)instance('Roadside irregular grass tufts',grassGeometry,materials.grass,[p.x,.02,z],[1,range(.7,1.65),1],new THREE.Quaternion().setFromAxisAngle(up,range(0,6.28)));
  }
  // 15.28.45 / lane-right: thick weedy undergrowth of leafy sprays lines both
  // sides of the lane past the house. Private PRNG keeps other planting stable.
  {let n=70921;const r=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};const weedSun=new THREE.Color('#86a24e');
   for(let i=0,count=mobile?420:1300;i<count;i++){const t=.02+r()*.615,p=roadCurve.getPoint(t),side=r()<.5?-1:1,off=roadHalfWidth(p)+.75+Math.pow(r(),1.6)*3.6,z=p.z+side*off,h=.25+r()*(off>3.5?1.5:.9),base=roadRise(p.x)*(1-THREE.MathUtils.clamp((off-roadHalfWidth(p)-.65)/4.15,0,1));
     if(p.x>-14&&z>-2.6)continue;
     for(let k=0;k<3;k++)instance('Lane weedy leaf undergrowth',spray,sprayMaterial,[p.x+r()*.5-.25,base+h*(.2+k*.35),z+r()*.5-.25],[.7+r()*.7,.6+r()*.6,.7+r()*.7],new THREE.Quaternion().setFromEuler(new THREE.Euler(r()-.5,r()*6.3,r()-.5)),new THREE.Color(leafPalette[(i+k)%5]).lerp(weedSun,r()*.5).multiplyScalar(1.05+r()*.35));}
  }
  const flowerMat=new THREE.MeshStandardMaterial({color:'#926d9c',roughness:1});
  for(let i=0;i<190;i++){
    const p=roadCurve.getPoint(range(.20,.62)),side=i%2?1:-1,z=p.z+side*range(2.6,4.0),h=range(.28,.8);
    segment('Fine roadside flowering stems',materials.grass,[p.x,0,z],[p.x+.05,h,z],.008);
    for(let j=0;j<3;j++)instance('Small purple roadside flowers',sphere,flowerMat,[p.x+.05+(j-1)*.035,h-j*.07,z+(j%2)*.03],[.026,.04,.026]);
  }
  // Tall areca stems and dense understory now stand behind the adjacent building, separate from the temple.
  for(let row=0;row<7;row++)for(let col=0;col<14;col++)palm(67+row*2.75+range(-.7,.7),-30+col*3.2+range(-.8,.8),range(22,30),true);
  for(const p of [[72,-28,28],[77,-13,29],[69,12,26],[82,4,30]])palm(...p);
  for(let i=0;i<10;i++)broadleaf(72+range(-2,11),-30+i*5.2,range(13,19),range(4,6));
  for(let i=0;i<100;i++)shrub(range(66,83),range(-31,17),range(.8,1.5));

  // The upper-gallery temple photos show dense palms directly behind the court.
  // Keep this grove behind the established temple footprint, separate from the
  // neighboring building's grove; individual tree positions are estimated.
  for(let row=0;row<4;row++)for(let col=0;col<12;col++)palm(24+col*3.4+range(-.6,.6),50.5+row*4.3+range(-.7,.7),range(14,21),true);
  for(const p of [[28,51.5,19],[37,55.5,23],[45,50.5,21],[55,52.5,20],[60,58.5,23],[33,66.5,22],[50,67.5,22]])palm(...p);
  for(let i=0;i<12;i++)broadleaf(25+i*3.3,55.5+range(0,12),range(9,14),range(3,4.3));
  for(let i=0;i<65;i++)shrub(range(24,64),range(48.5,64.5),range(.9,1.6));

  // Dense greenery on the house side of the small road, as in 14.58.48.
  // The near end is occupied by the white tiled block seen in 14.59.36.
  for(const p of [[12.55,9.5,18],[12.8,16.5,17],[13.4,23.8,16]])palm(...p);
  for(let i=2;i<16;i++){
    const x=range(12.7,14.1),z=3+i*1.6;
    palm(z>9&&z<15?Math.min(x,12.65):x,z,range(11,17),true);
  }
  for(let i=0;i<76;i++){
    const z=range(2,28),x=range(12.9,14.4);
    // Leave the photographed taps and long washing trough accessible at the roadside.
    if(z<8.5)continue;
    if(z>9.4&&z<14.4)continue;
    shrub(x,z,range(.75,1.30));
  }
  for(let i=2;i<7;i++)broadleaf(i<4?11.3:13.6,2.5+i*3.8,range(4.7,6.5),range(1.9,2.3));
  for(const [z,y] of [[3.9,5.5],[9.3,5.0],[16.7,5.5]]){
    const line=new THREE.CatmullRomCurve3([new THREE.Vector3(20.15,y,z),new THREE.Vector3(17,y-.32,z+1.2),new THREE.Vector3(13.3,y+.10,z+2)]);
    const wire=new THREE.Mesh(new THREE.TubeGeometry(line,18,.009,4,false),materials.mortar);wire.name='Thin wires above the temple side road';group.add(wire);
  }

  // 14.59.36: the maroon hatchback is parked off the asphalt beside the house,
  // facing away from the temple. Its rear, not the bonnet, faces this viewpoint.
  const car=new THREE.Group();car.name='Maroon hatchback beside the house';car.position.set(5.8+K.houseShiftX,.03,-2.35);group.add(car);
  const carPaint=new THREE.MeshStandardMaterial({color:'#75243d',roughness:.40,metalness:.25});
  const carGlass=new THREE.MeshStandardMaterial({color:'#283a43',roughness:.23,metalness:.34});
  const carRubber=new THREE.MeshStandardMaterial({color:'#252726',roughness:.88});
  const silver=new THREE.MeshStandardMaterial({color:'#aeb5b4',metalness:.65,roughness:.37});
  const cb=(n,x,y,z,w,h,d,m)=>K.box(car,n,x,y,z,w,h,d,m);
  // Suzuki Ritz reference: tall roof, short bonnet and an almost upright hatch.
  // +X is the rear. The rear glass stays on the tailgate, not on a sloping boot.
  const carOutline=new THREE.Shape();
  carOutline.moveTo(-1.83,.39);carOutline.lineTo(-1.55,.39);
  carOutline.absarc(-1.18,.33,.38,Math.PI-.16,.16,true);
  carOutline.lineTo(.80,.39);carOutline.absarc(1.18,.33,.38,Math.PI-.16,.16,true);
  carOutline.lineTo(1.79,.39);carOutline.quadraticCurveTo(1.89,.56,1.80,.98);
  carOutline.lineTo(1.59,1.55);carOutline.quadraticCurveTo(1.54,1.64,1.40,1.65);
  carOutline.quadraticCurveTo(.38,1.71,-.49,1.62);carOutline.lineTo(-1.08,1.03);
  carOutline.quadraticCurveTo(-1.70,.99,-1.82,.78);carOutline.closePath();
  const carBody=new THREE.Mesh(new THREE.ExtrudeGeometry(carOutline,{depth:1.42,bevelEnabled:true,bevelThickness:.065,bevelSize:.04,bevelSegments:3,curveSegments:12}),carPaint);carBody.position.z=-.71;carBody.name='Hatchback rounded body and sloping bonnet';car.add(carBody);
  const carPanel=(name,points,material)=>{const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material);mesh.name=name;car.add(mesh);return mesh;};
  const windowPaint=carGlass.clone();windowPaint.side=THREE.DoubleSide;
  carPanel('Hatchback slanted front windscreen',[[-1.13,1.09,-.62],[-1.13,1.09,.62],[-.60,1.62,.60],[-.60,1.62,-.60]],windowPaint);
  carPanel('Hatchback rear window',[[1.825,1.10,-.57],[1.825,1.10,.57],[1.674,1.51,.56],[1.674,1.51,-.56]],windowPaint);
  const lampRed=new THREE.MeshStandardMaterial({color:'#b62737',roughness:.25,metalness:.15,side:THREE.DoubleSide});
  for(const side of [-1,1]){
    carPanel('Hatchback front side glass',[[-.98,1.075,side*.777],[.06,1.075,side*.777],[.06,1.59,side*.777],[-.48,1.565,side*.777]],windowPaint);
    carPanel('Hatchback rear side glass',[[.19,1.075,side*.777],[1.23,1.12,side*.777],[1.37,1.545,side*.777],[.19,1.59,side*.777]],windowPaint);
    cb('Hatchback window central pillar',.125,1.33,side*.776,.10,.57,.025,carRubber);
    cb('Ritz side protective strip',.02,.80,side*.778,2.52,.075,.04,carRubber);
    for(const x of [-1.18,1.18]){
      const tyre=new THREE.Mesh(new THREE.CylinderGeometry(.31,.31,.16,24),carRubber);tyre.rotation.x=Math.PI/2;tyre.position.set(x,.33,side*.79);tyre.name='Hatchback black tyre';car.add(tyre);
      const hub=new THREE.Mesh(new THREE.CylinderGeometry(.20,.20,.025,16),silver);hub.rotation.x=Math.PI/2;hub.position.set(x,.33,side*.88);hub.name='Hatchback silver wheel';car.add(hub);
      for(let i=0;i<7;i++){const angle=i*Math.PI*2/7;const slot=cb('Ritz wheel cover slot',x+Math.sin(angle)*.14,.33+Math.cos(angle)*.14,side*.898,.045,.08,.008,carRubber);slot.rotation.z=-angle;}
    }
    // The narrow upper red lamp sweeps into a broader clear lower cluster.
    carPanel('Hatchback tall rear red lamp',[[1.858,1.07,side*.60],[1.855,1.07,side*.72],[1.648,1.59,side*.70],[1.648,1.59,side*.61]],lampRed);
    const clearLamp=cb('Ritz clear lower rear lamp',1.865,1.04,side*.65,.055,.16,.18,silver);clearLamp.rotation.z=.20;
    cb('Ritz rear lower red reflector',1.87,.53,side*.56,.045,.065,.20,lampRed);
    const headlamp=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),silver);headlamp.name='Hatchback swept pale front headlamp';headlamp.position.set(-1.74,.84,side*.57);headlamp.scale.set(.09,.20,.18);headlamp.rotation.z=-.40;car.add(headlamp);
    for(const x of [-.15,1.0])cb('Hatchback door handle',x,1.005,side*.799,.17,.035,.035,carPaint);
    cb('Ritz front door seam',.115,.81,side*.778,.012,.48,.009,carRubber);
    cb('Hatchback wing mirror',-.93,1.09,side*.88,.23,.15,.16,carPaint);
  }
  cb('Hatchback rear bumper',1.82,.49,0,.13,.19,1.48,carPaint);
  cb('Ritz tailgate plate recess',1.85,.80,0,.03,.22,.65,carRubber);
  cb('Hatchback pale rear number plate',1.874,.80,0,.025,.13,.48,'cream');
  cb('Hatchback rear wiper',1.84,1.145,0,.035,.022,.38,carRubber);
  cb('Ritz hatch upper brake light',1.68,1.60,0,.07,.045,.37,lampRed);
  cb('Ritz hatch roof lip',1.61,1.66,0,.16,.045,1.35,carPaint);
  // Small chrome S emblem built from three diagonal strokes.
  for(const [y,z,tilt] of [[.997,-.016,-.5],[.967,0,.6],[.937,.016,-.5]]){
    const stroke=cb('Ritz Suzuki rear emblem',1.86,y,z,.015,.019,.077,silver);stroke.rotation.x=tilt;
  }
  cb('Hatchback front dark grille',-1.86,.65,0,.035,.20,.69,carRubber);
  cb('Hatchback pale front number plate',-1.88,.48,0,.02,.12,.43,'cream');
  K.blocker(5.8+K.houseShiftX,-2.35,3.85,1.88,.03,1.78);

  // Purple roadside plants from the front-of-house photographs.
  // Thin stems along the parapet, clear of the grass verge in 14.58.02.
  for(let i=0;i<60;i++){
    const x=-5.2+((i*61)%97)/97*3.4,z=-11.05+((i*37)%89)/89*.45,h=.36+(i%13)*.065;
    segment('Front photo tall flowering stem',materials.grass,[x,0,z],[x+.07,h,z],.008);
    for(let j=0;j<3;j++)instance('Front photo small purple flowers',sphere,flowerMat,[x+.07+j*.024,h-j*.13,z],[.034,.045,.035]);
  }

  // 15.28.45: a waist-high bank of leafy balsam with pink flowers grows on the
  // verge against the tank parapet, just ahead of the house entrance.
  {let n=81233;const r=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
   const pink=new THREE.MeshStandardMaterial({color:'#c07ba8',roughness:1});
   for(let i=0;i<230;i++){const x=-1.4+r()*4.4,z=-9.4-r()*1.55,h=.3+r()*.85*(1-Math.abs(x-.8)/2.2*.5);
     segment('Front balsam stems',materials.grass,[x,0,z],[x+r()*.1-.05,h,z],.012);
     for(let k=0;k<3;k++)instance('Front balsam leaf sprays',spray,sprayMaterial,[x,h*(.4+k*.28),z],[.28+r()*.22,.3+r()*.25,.28+r()*.22],new THREE.Quaternion().setFromEuler(new THREE.Euler(r()-.5,r()*6.3,r()-.5)),new THREE.Color(leafPalette[(i+k)%5]).multiplyScalar(1.05+r()*.3));
     if(i%2===0)instance('Front balsam pink flowers',sphere,pink,[x+r()*.12-.06,h*(.55+r()*.4),z+r()*.12-.06],[.04,.05,.04]);}
  }
  // 15.20.01: one recessed stepped-outline pond, right of the temple entrance.
  // main.js cuts out the ground beneath this basin, so the water is below grade.
  // 14.59.21 / 14.59.36 / 15.00.01: the pond sits about 1.8 m further west than first placed.
  const PX=23.7;
  const pondOutline=[[-2,-1],[-.3,-1],[.3,-1],[2,-1],[2,-.4],[2.4,-.4],[2.4,.4],[2,.4],[2,1],[.3,1],[-.3,1],[-2,1],[-2,.4],[-2.4,.4],[-2.4,-.4],[-2,-.4]];
  // Reusable procedural finish: mineral patches interrupted by long wet streaks.
  const pondCanvas=document.createElement('canvas');pondCanvas.width=256;pondCanvas.height=256;
  const pondContext=pondCanvas.getContext('2d'),pondPixels=pondContext.getImageData(0,0,256,256);
  const pondHash=(x,y)=>{const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v);};
  const pondNoise=(x,y)=>{
    const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
    return (pondHash(ix,iy)*(1-sx)+pondHash(ix+1,iy)*sx)*(1-sy)+(pondHash(ix,iy+1)*(1-sx)+pondHash(ix+1,iy+1)*sx)*sy;
  };
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const streak=pondNoise(x/9,y/110),patch=pondNoise(x/38,y/25),grain=pondHash(x,y);
    const lime=Math.max(0,Math.min(1,(streak*.20+patch*.62+pondNoise(x/4,y/7)*.18-.48)*4.2));
    const value=78+patch*34+streak*30+lime*22+grain*12+(y/256)*-18;
    const i=(y*256+x)*4;pondPixels.data[i]=value;pondPixels.data[i+1]=value+2;pondPixels.data[i+2]=value-5;pondPixels.data[i+3]=255;
  }
  pondContext.putImageData(pondPixels,0,0);
  const pondTexture=new THREE.CanvasTexture(pondCanvas);pondTexture.colorSpace=THREE.SRGBColorSpace;pondTexture.wrapS=pondTexture.wrapT=THREE.RepeatWrapping;
  const pondStone=new THREE.MeshStandardMaterial({map:pondTexture,roughness:.97});
  const pondCoping=K.M.plaster.clone();pondCoping.color.set('#9d9d95');
  function pondWallUV(wall){
    const p=wall.geometry.attributes.position,uv=wall.geometry.attributes.uv,n=wall.geometry.attributes.normal;
    for(let i=0;i<p.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i)+wall.position.z:p.getX(i)+wall.position.x)*.75,(p.getY(i)+wall.position.y+1.05)/1.37);
    uv.needsUpdate=true;
  }
  const pondShape=new THREE.Shape(pondOutline.map(([x,z])=>new THREE.Vector2(x,-z)));
  const water=new THREE.Mesh(new THREE.ShapeGeometry(pondShape),new THREE.MeshStandardMaterial({color:'#354d31',roughness:.26,metalness:.16}));
  water.name='Temple small pond recessed water';water.rotation.x=-Math.PI/2;water.position.set(PX,-.94,-1.5);group.add(water);
  const soil=new THREE.Shape([new THREE.Vector2(-2.5,-1.5),new THREE.Vector2(2.5,-1.5),new THREE.Vector2(2.5,1.5),new THREE.Vector2(-2.5,1.5)]);
  soil.holes.push(new THREE.Path(pondOutline.map(([x,z])=>new THREE.Vector2(x,-z))));
  const surround=new THREE.Mesh(new THREE.ShapeGeometry(soil),K.M.earth);surround.name='Temple small pond earth surround';surround.rotation.x=-Math.PI/2;surround.position.set(PX,0,-1.5);group.add(surround);
  box('Temple small pond deep bottom',PX,-1.11,-1.5,4.98,.12,2.98,materials.wetStone);
  for(let i=0;i<pondOutline.length;i++){
    const a=pondOutline[i],b=pondOutline[(i+1)%pondOutline.length],x=PX+(a[0]+b[0])/2,z=-1.5+(a[1]+b[1])/2;
    const w=Math.abs(a[0]-b[0])+.15,d=Math.abs(a[1]-b[1])+.15;
    const notch=Math.abs(x-PX)<.01&&Math.abs(z+1.5)>.95,top=notch?.10:.32;
    pondWallUV(box('Temple small pond weathered retaining wall',x,(top-1.05)/2,z,w,top+1.05,d,pondStone,true));
    box('Temple small pond worn pale coping',x,top,z,w+.035,.07,d+.035,pondCoping);
    box('Temple small pond algae waterline',x,-.94,z,w+.006,.08,d+.006,materials.wetStone);
  }
  // Prevent walking into the open water while retaining the visible depth.
  K.blocker(PX,-1.5,4.2,2.2,-1.1,.35);

  // Overlapping distant belts close the horizon when panning from the house.
  // Planting is inferred, beyond the photographed buildings and walking routes.
  // Separate low-detail batches keep the background inexpensive on phones.
  seed=591307;
  const farCrown=new THREE.IcosahedronGeometry(1,1);
  const farPositions=farCrown.attributes.position;
  for(let i=0;i<farPositions.count;i++){
    const x=farPositions.getX(i),y=farPositions.getY(i),z=farPositions.getZ(i);
    const lobe=1+.14*Math.sin(x*13+z*7)*Math.cos(y*11-z*3);
    farPositions.setXYZ(i,x*lobe,y*lobe,z*lobe);
  }
  farCrown.computeVertexNormals();farCrown.computeBoundingSphere();
  const farLeaves=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,side:THREE.DoubleSide});
  const farFrondPositions=[],farFrondIndices=[];
  for(let i=0;i<=10;i++){
    const t=i/10,x=t*5.7,y=1.6*Math.sin(t*Math.PI)-1.5*t*t;
    const width=Math.sin(t*Math.PI)*.8*(i%2?.78:1);
    farFrondPositions.push(x,y,-width,x,y+.09*Math.sin(t*Math.PI),0,x,y,width);
    if(i){const k=(i-1)*3;farFrondIndices.push(k,k+3,k+1,k+1,k+3,k+4,k+1,k+4,k+2,k+2,k+4,k+5);}
  }
  const farFrond=new THREE.BufferGeometry();
  farFrond.setAttribute('position',new THREE.Float32BufferAttribute(farFrondPositions,3));
  farFrond.setIndex(farFrondIndices);farFrond.computeVertexNormals();
  for(let row=0;row<3;row++)for(let i=0;i<80;i++){
    const angle=(i+row*.42)/80*Math.PI*2+range(-.012,.012);
    const x=12+(94+row*14+range(-2,2))*Math.cos(angle);
    const z=-8+(91+row*12+range(-2,2))*Math.sin(angle);
    const h=range(13,23)+row*1.5,radius=range(5.2,7.6);
    segment('Horizon tree trunks',materials.trunkRings,[x,0,z],[x+.45,h*.77,z],.25);
    for(let j=0;j<7;j++){
      const a=j*2.4,spread=j?radius*.57:0;
      const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(range(-.2,.2),a,range(-.15,.15)));
      instance('Horizon overlapping broadleaf crowns',farCrown,materials.foliage,
        [x+Math.cos(a)*spread,h-radius*.45+range(-2,2),z+Math.sin(a)*spread],
        [radius*range(.62,.86),radius*range(.64,.96),radius*range(.65,.91)],q,foliageColor());
    }
    for(let j=0;j<3;j++)instance('Horizon dense lower foliage',farCrown,materials.foliage,
      [x+(j-1)*3,range(2.7,4.2),z+range(-3,3)],
      [range(4,6.5),range(4.3,6.5),range(4,6.5)],null,foliageColor());
    if(i%3===0){
      const palmHeight=h+range(5,10),lean=range(-1.4,1.4),top=[x+lean,palmHeight,z];
      segment('Horizon tree trunks',materials.trunk,[x,0,z],[x+lean*.25,palmHeight*.52,z],.20);
      segment('Horizon tree trunks',materials.trunk,[x+lean*.25,palmHeight*.52,z],top,.14);
      for(let j=0;j<9;j++){
        const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,j/9*Math.PI*2+angle,range(-.12,.35),'YXZ'));
        const scale=range(.8,1.3);
        instance('Horizon coconut fronds',farFrond,farLeaves,top,[scale,scale,scale],q,foliageColor());
      }
    }
  }

  // 15.22.36 / 15.26.12: a steep forested hill rises behind the temple and house,
  // filling the view north across the tank. Its shape is inferred from those views.
  seed=77121;
  const hillY=(x,z)=>{const t=Math.max(0,z-62);return t*.85*(1-.55*Math.min(1,Math.abs(x-10)/170))+3.5*Math.sin(x*.05+z*.03)*Math.min(1,t/20);};
  const hillGeometry=new THREE.PlaneGeometry(300,90,60,20);hillGeometry.rotateX(-Math.PI/2);
  const hp=hillGeometry.attributes.position;
  for(let i=0;i<hp.count;i++){const x=hp.getX(i)+10,z=hp.getZ(i)+107;hp.setXYZ(i,x,hillY(x,z)-.6,z);}
  hillGeometry.computeVertexNormals();
  const hill=new THREE.Mesh(hillGeometry,new THREE.MeshStandardMaterial({color:'#263f25',roughness:1}));hill.name='Distant forested hill slope';group.add(hill);
  for(let z=66;z<150;z+=mobile?13:10)for(let x=-130;x<150;x+=mobile?13:10){
    const px=x+range(-3.5,3.5),pz=z+range(-3.5,3.5),r=range(6.2,9.4)*(random()<.12?1.35:1);
    instance('Horizon overlapping broadleaf crowns',farCrown,materials.foliage,
      [px,hillY(px,pz)+r*.55+range(0,2.5),pz],[r,r*range(.72,1.0),r],
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0,range(0,6.3),0)),foliageColor().multiplyScalar(range(.5,.74)));
  }

  // Flush all repeat details into one draw call per geometry/material family.
  for (const [name, batch] of batches) {
    const mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.instances.length);
    mesh.name = name;
    batch.instances.forEach((entry, i) => {
      mesh.setMatrixAt(i, entry.matrix);
      if (entry.color) mesh.setColorAt(i, entry.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingBox(); mesh.computeBoundingSphere();
    group.add(mesh);
  }
  group.traverse(object => { if (object.isMesh) { const far=/^(Horizon |Distant forested)/.test(object.name); object.castShadow = !far; object.receiveShadow = !far; } });
  K.labels.push({ text: 'Temple tank · stepped stone banks', position: [0, .4, -11.0] });
  K.labels.push({ text: 'Coconut and areca grove', position: [-6, 1.3, 31] });
  group.userData.referenceNotes = '2011 tank: dark stone courses, white posts, near-bank flat-roof scalloped pavilion; approximate coconut and areca planting. No water or base terrain mesh.';
  // The satellite refit brought the far bank 6 m nearer the lane (z -43 -> -37). Objects
  // wholly beyond the old bank line keep their distance from it: whole meshes move, and
  // instanced groves move only their instances south of the line.
  {const FAR_SHIFT=6,line=-41.5,box3=new THREE.Box3(),m=new THREE.Matrix4(),p=new THREE.Vector3();
   group.updateMatrixWorld(true);
   for(const o of group.children){
     if(!o.isMesh&&!o.isGroup)continue;
     if(o.isInstancedMesh){let moved=false;for(let k=0;k<o.count;k++){o.getMatrixAt(k,m);p.setFromMatrixPosition(m);if(p.z<line){m.elements[14]+=FAR_SHIFT;o.setMatrixAt(k,m);moved=true;}}
       if(moved){o.instanceMatrix.needsUpdate=true;o.computeBoundingSphere?.();o.computeBoundingBox?.();}continue;}
     box3.setFromObject(o);if(box3.max.z<line)o.position.z+=FAR_SHIFT;
   }
   for(const c of K.colliders)if(c.maxZ<line){c.minZ+=FAR_SHIFT;c.maxZ+=FAR_SHIFT;}
   for(const r of [...K.surfaces,...K.ramps])if(r.z+r.d/2<line)r.z+=FAR_SHIFT;
   for(const l of K.labels)if(l.position[2]<line)l.position=[l.position[0],l.position[1],l.position[2]+FAR_SHIFT];}
  // The ground behind the far bank stands at the wall top (FAR_TOP): everything beyond it
  // is lifted, and earth slopes fall away at both ends of the tank.
  {const x0=-5.2,x1=50.2,fall=4.7,edge=-37.83,back=-117,b3=new THREE.Box3(),m=new THREE.Matrix4(),p=new THREE.Vector3(),c=new THREE.Vector3();
   const lift=x=>x<x0?Math.max(0,1-(x0-x)/fall)*FAR_TOP:x>x1?Math.max(0,1-(x-x1)/fall)*FAR_TOP:FAR_TOP;
   group.updateMatrixWorld(true);
   for(const o of [...group.children]){
     if(o.isInstancedMesh){let moved=false;for(let k=0;k<o.count;k++){o.getMatrixAt(k,m);p.setFromMatrixPosition(m);
       if(p.z<edge-.05){const l=lift(p.x);if(l){m.elements[13]+=l;o.setMatrixAt(k,m);moved=true;}}}
       if(moved){o.instanceMatrix.needsUpdate=true;o.computeBoundingSphere?.();o.computeBoundingBox?.();}continue;}
     if(!o.isMesh&&!o.isGroup)continue;
     // These steps already rise to FAR_TOP; translating their upper blocks a
     // second time separates the visible flight from its continuous nav ramp.
     if(/^(far bank corner steps|pavilion bank entry)/.test(o.name))continue;
     b3.setFromObject(o);if(b3.isEmpty()||b3.max.z>=edge-.05)continue;o.position.y+=lift(b3.getCenter(c).x);}
   for(const q of K.colliders)if(q.maxZ<edge-.05){const l=lift((q.minX+q.maxX)/2);q.bottom+=l;q.top+=l;}
   for(const r of K.surfaces)if(r.z+r.d/2<edge)r.y+=lift(r.x);
   for(const r of K.ramps)if(r.z+r.d/2<edge){const l=lift(r.x);r.lowY+=l;r.highY+=l;}
   for(const l of K.labels)if(l.position[2]<edge)l.position=[l.position[0],l.position[1]+lift(l.position[0]),l.position[2]];
   const earth=K.M.earth,zc=(edge+back)/2,d=edge-back;
   for(const [a,b] of [[x0,-3.5],[-1.1,32.9],[35.1,x1]]){
     box('Far bank raised earth terrace',(a+b)/2,(FAR_TOP-.3)/2,zc,b-a,FAR_TOP+.3,d,earth);K.surface((a+b)/2,zc,b-a,d,FAR_TOP);
   }
   box('Far bank earth behind corner stair',-2.3,(FAR_TOP-.3)/2,(-38.4+back)/2,2.4,FAR_TOP+.3,-38.4-back,earth);K.surface(-2.3,(-38.4+back)/2,2.4,-38.4-back,FAR_TOP);
   box('Far bank earth behind pavilion entry',34,(FAR_TOP-.3)/2,(-38.8+back)/2,2.2,FAR_TOP+.3,-38.8-back,earth);K.surface(34,(-38.8+back)/2,2.2,-38.8-back,FAR_TOP);
   for(let i=0;i<16;i++)for(const side of [-1,1]){const x=side<0?x0-(i+.5)*fall/16:x1+(i+.5)*fall/16,h=lift(x);
     box('Far bank earth slope',x,(h-.3)/2,zc,fall/16+.01,h+.3,d,earth);}
   K.ramp(x0-fall/2,zc,fall,d,'x',0,FAR_TOP);K.ramp(x1+fall/2,zc,fall,d,'-x',0,FAR_TOP);}
  // Bring the far bank closer (see farZ): move what lies beyond, stretch what spans.
  {const b3=new THREE.Box3(),m=new THREE.Matrix4(),p=new THREE.Vector3();
   group.updateMatrixWorld(true);
   for(const o of group.children){
     if(o.isInstancedMesh){let moved=false;for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);p.setFromMatrixPosition(m);const z=farZ(p.z,p.x);
       if(z!==p.z){m.elements[14]=z;o.setMatrixAt(i,m);moved=true;}}
       if(moved){o.instanceMatrix.needsUpdate=true;o.computeBoundingBox?.();o.computeBoundingSphere?.();}continue;}
     b3.setFromObject(o);if(b3.isEmpty()||b3.min.z>=FAR_Z1||(b3.min.x+b3.max.x)/2>=FAR_X1)continue;
     if(b3.max.z<=FAR_Z0){o.position.z+=FAR_SHIFT;continue;}
     const z0=farZ(b3.min.z),z1=farZ(b3.max.z),f=(z1-z0)/(b3.max.z-b3.min.z),e=o.rotation;
     const flat=Math.abs(Math.abs(e.x)-Math.PI/2)<1e-3&&Math.abs(e.y)<1e-3&&Math.abs(e.z)<1e-3,upright=Math.abs(e.x)<1e-3&&Math.abs(e.z)<1e-3;
     if(o.isMesh&&flat)o.scale.y*=f;
     else if(o.isMesh&&upright&&Math.abs(Math.sin(e.y))<1e-3)o.scale.z*=f;
     else if(o.isMesh&&upright&&Math.abs(Math.cos(e.y))<1e-3)o.scale.x*=f;
     else{o.position.z+=farZ((b3.min.z+b3.max.z)/2)-(b3.min.z+b3.max.z)/2;continue;}
     o.updateMatrixWorld(true);b3.setFromObject(o);o.position.z+=z0-b3.min.z;}
   for(const c of K.colliders){if(c.minZ<FAR_Z1&&(c.minX+c.maxX)/2<FAR_X1){c.minZ=farZ(c.minZ);c.maxZ=farZ(c.maxZ);}}
   for(const r of [...K.surfaces,...K.ramps])if(r.z-r.d/2<FAR_Z1&&r.x<FAR_X1){const z0=farZ(r.z-r.d/2),z1=farZ(r.z+r.d/2);r.z=(z0+z1)/2;r.d=z1-z0;}
   for(const l of K.labels)if(l.position[2]<FAR_Z1)l.position=[l.position[0],l.position[1],farZ(l.position[2],l.position[0])];}
  return group;
}
