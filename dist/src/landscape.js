import * as THREE from 'three';

/** Approximate 2011–2013 landscape, based on the original tank photographs.
 * Ground and animated water are supplied by the application. Keep this group
 * at identity: all walkable surfaces and collision bounds use world metres.
 */
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
    redSoil: new THREE.MeshStandardMaterial({ color: '#a97e57', roughness: 1 }),
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
      for(const side of [-1,1]){const v=p.clone().addScaledVector(normal,width*side);positions.push(v.x,p.y+height,v.z);uv.push(i*.22,(side+1)/2);}
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
  const laneMap=new THREE.CanvasTexture(laneCanvas);laneMap.colorSpace=THREE.SRGBColorSpace;laneMap.wrapS=laneMap.wrapT=THREE.RepeatWrapping;materials.lane.map=laneMap;materials.lane.color.set('#ffffff');
  roadRibbon('Irregular laterite shoulders of the front lane',.70,.029,materials.redSoil);
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
  const sideRoadCurve=new THREE.CatmullRomCurve3([[17,-4.6],[17.2,1],[17.2,8],[16.9,18],[17.2,27],[17.0,34]].map(([x,z])=>new THREE.Vector3(x,.043,z)));
  const dirtCanvas=document.createElement('canvas');dirtCanvas.width=dirtCanvas.height=256;const dirtContext=dirtCanvas.getContext('2d');
  dirtContext.fillStyle='#a47c67';dirtContext.fillRect(0,0,256,256);
  for(let i=0;i<15000;i++){
    const light=random()>.47;dirtContext.fillStyle=light?'#c3a28b88':'#76584777';
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
    [-20.1, -27.5, 2.2, 32.6], [56.1, -27.5, 2.2, 32.6],
    [-20.1, -8.1, 2.2, 2.1], [56.1, -8.1, 2.2, 2.1],
  ];
  for (const [i, p] of paths.entries()) {
    box(`tank perimeter path ${i}`, p[0], .026, p[1], p[2], .052, p[3], materials.path);
    K.surface(p[0], p[1], p[2], p[3], .052);
  }
  // A little broken paving, inset into rather than blocking the walking route.
  for (let i = 0; i < 68; i++) {
    const north = i % 2 === 0, x = range(-20.3, 56.3), z = north ? -10.1 : -44.9;
    blockBatch('path paving variation', materials.mortar, x, .057, z + range(-.72, .72), range(.38, 1.0), .012, range(.32, .63), new THREE.Color().setScalar(range(.77, 1.15)));
  }

  // Tank retaining courses. An unobstructed inset ledge sits just above water.
  const lake = { x: 18, z: -27.5, w: 72, d: 31 };
  box('tank basin floor', 18, -2.08, -27.5, 72, .18, 31, materials.wetStone);
  K.blocker(18, -27.5, 68.5, 27.5, -8, -.8);
  function ringCourse(inset, thickness, top, height, name, mat) {
    const w = lake.w - 2 * inset, d = lake.d - 2 * inset;
    box(`${name} east`, lake.x + w / 2 - thickness / 2, top - height / 2, lake.z, thickness, height, d, mat);
    box(`${name} west`, lake.x - w / 2 + thickness / 2, top - height / 2, lake.z, thickness, height, d, mat);
    // Leave the paired stairs and low connecting path exposed, rather than
    // burying them inside the old continuous retaining courses.
    for(const [a,b] of [[lake.x-w/2+thickness,16.4],[29.6,lake.x+w/2-thickness]])
      box(`${name} near`,(a+b)/2,top-height/2,lake.z+d/2-thickness/2,b-a,height,thickness,mat);
    box(`${name} far`, lake.x, top - height / 2, lake.z - d / 2 + thickness / 2, w - thickness * 2, height, thickness, mat);
  }
  ringCourse(0, .52, -.08, 1.8, 'upper dark stone retaining course', materials.basalt);
  ringCourse(.50, .45, -.31, 1.55, 'middle worn stone tread', materials.basalt);
  ringCourse(.93, .48, -.54, 1.30, 'low mossy stone tread', materials.wetStone);
  ringCourse(1.39, .36, -.77, 1.02, 'submerged tank course', materials.wetStone);
  for(const [a,b] of [[-17.4,16.4],[29.6,53.4]])K.surface((a+b)/2,-12.73,b-a,.40,-.31);
  K.surface(18, -42.27, 70.8, .40, -.31);
  K.surface(-17.27, -27.5, .40, 29.5, -.31);
  K.surface(53.27, -27.5, .40, 29.5, -.31);
  // Keep later planting stable when the longer shoreline needs more stones.
  const bankDetailSeed=seed;
  // Faint joints and irregular replacement stones read at human eye height.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 66; i++) {
      const x = -17.1 + i * 1.08;
      blockBatch('bank individual masonry', materials.basalt, x, -.34, side < 0 ? -42.985 : -12.015, 1.03, .34, .027, new THREE.Color().setScalar(range(.73, 1.23)));
    }
    for (let i = 0; i < 28; i++) {
      blockBatch('bank individual masonry', materials.basalt, 18 + side * 35.985, -.34, -42.25 + i * 1.08, .027, .34, 1.03, new THREE.Color().setScalar(range(.73, 1.23)));
    }
  }

  seed=bankDetailSeed;for(let i=0;i<120;i++)random();

  // 14.58.02: substantial whitewashed stone piers and dark masonry rails,
  // with the house-facing run and temple-side access identified separately.
  function agedBoundaryMaterial(base,whitewash=false){
    const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,256,256);
    let n=271;const noise=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
    for(let i=0;i<2200;i++){
      const x=noise()*256,y=noise()*256;ctx.fillStyle=whitewash?`rgba(41,49,39,${.03+noise()*.20})`:`rgba(160,163,137,${.02+noise()*.21})`;
      ctx.fillRect(x,y,1+noise()*13,2+noise()*19);
    }
    for(let i=0;i<160;i++){ctx.fillStyle=`rgba(46,64,31,${.08+noise()*.19})`;ctx.fillRect(noise()*256,165+noise()*91,1+noise()*9,2+noise()*28);}
    const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({map,roughness:1});
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
  // 14.58.02 + 15.23.35: the house-facing parapet sits farther out at the
  // water, continuously across the house. Access is toward the temple (+X).
  const houseBankZ=-11.3, bathingGateX=16.4, bathingGateZ=-12.65;
  for(const [a,b] of [[-18.65,14.4]]){
    for(const [y,h] of [[.14,.28],[1.00,.20]])box('Tank roadside stone parapet rail',(a+b)/2,y,houseBankZ,b-a,h,.38,fenceStone);
    for(let x=a+.12;x<b;x+=.48)blockBatch('Tank roadside pierced stone parapet',fenceStone,x,.57,houseBankZ,.19,.69,.29);
    K.blocker((a+b)/2,houseBankZ,b-a,.39,0,1.13);
  }
  for(const x of [-18.55,-12.4,-6.2,0,6.2,12.35]){
    box('Tank roadside substantial stone pier',x,.63,houseBankZ,.59,1.26,.59,fenceWhite,true);
    const capGeometry=new THREE.CylinderGeometry(.34,.46,.21,4);capGeometry.rotateY(Math.PI/4);
    const cap=new THREE.Mesh(capGeometry,fenceStone);cap.name='Tank roadside sloped square pier cap';cap.position.set(x,1.33,houseBankZ);group.add(cap);
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
  for(let plant=0;plant<27;plant++){
    const x=-17.1+plant*1.12+Math.sin(plant*3.7)*.23;
    const base=plant%4===0?-.12:.29+(plant%3)*.14;
    const z=plant%4===0?-12.29:-11.51;
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
  for(const z of [-11.25,-14.05]){
    for(const [y,w,h] of [[.29,.75,.58],[.77,.62,.38],[1.10,.49,.28],[1.31,.39,.14]])box('Tank gate square stepped stone pier',bathingGateX,y,z,w,h,w,fenceWhite,true);
    for(const y of [.55,.96,1.25])box('Tank gate pale worn pier seam',bathingGateX,y,z,.53,.035,.53,fenceStone);
  }
  // Open iron leaf rests along the stair edge; the passage stays clear.
  for(const x of [16.45,17.27])box('Tank narrow iron gate upright',x,.51,-13.87,.035,.92,.035,'metal');
  for(const y of [.12,.94])box('Tank narrow iron gate rail',16.86,y,-13.87,.85,.035,.035,'metal');
  for(let x=16.56;x<17.27;x+=.13)box('Tank metal gate bars',x,.53,-13.87,.017,.82,.022,'metal');
  box('Bathing gate approach masonry',15.18,-.35,-12.4,2.45,.69,2.85,materials.basalt);
  box('Bathing gate approach landing',15.18,-.005,-12.4,2.45,.12,2.85,materials.path);
  K.surface(15.18,-12.4,2.45,2.85,.055);
  // Long masonry ledges descend lakeward below the unbroken house-side fence.
  for(const [z,y,d] of [[-12.05,-.12,.75],[-12.55,-.34,.65],[-13.0,-.56,.55]]){
    box('House bank continuous retaining ledge',-2.1,y-.10,z,32.4,.20,d,fenceStone);
    K.surface(-2.1,z,32.4,d,y);
  }
  // The panorama shows the bathing shelter parallel to the temple-facing bank.
  box('Bathing arcade floor',39,-.015,-12.0,19.2,.16,3.1,materials.basalt);
  K.surface(39,-12.0,19.2,3.1,.065);
  for(const x of [29.9,34.45,39,43.55,48.1])for(const z of [-13.24,-10.77]){
    K.column(group,'Bathing arcade white pier',x,z,.065,2.48,.15,materials.oldWhite);
    box('Bathing arcade white pier foot',x,.24,z,.46,.40,.46,materials.oldWhite);
  }
  K.gableRoof(group,'Long lakeside bathing arcade tiled roof',39,-12.0,20.1,3.6,2.57,.93);
  for(const z of [-13.24,-10.77])K.beam(group,'Bathing arcade dark beam',[29.5,2.5,z],[48.5,2.5,z],.17,'wood',.2);
  for(const y of [.17,.78])box('Bathing arcade parapet rail',39,y,-10.78,18.5,.14,.16,materials.oldWhite);
  for(let x=29.8;x<48.3;x+=.32)box('Bathing arcade perforated parapet',x,.47,-10.78,.15,.48,.16,materials.oldWhite);
  K.blocker(39,-10.78,18.5,.17,.065,.87);
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
  arcadeWall.name='Bathing arcade lake-facing pierced masonry';arcadeWall.position.set(39,0,-13.31);
  arcadeWall.castShadow=arcadeWall.receiveShadow=true;group.add(arcadeWall);
  box('Bathing arcade lake-facing coping',39,.94,-13.23,18.35,.10,.27,materials.oldWhite);
  box('Bathing arcade dark waterline foundation',39,-.20,-13.23,18.35,.68,.27,materials.wetStone);
  K.blocker(39,-13.23,18.35,.27,-.54,.99);

  // Opposite the mud road, the long low dark wall spans the temple's right wing.
  box('Temple bank dark retaining parapet',23.2,.42,-11.3,10.8,.84,.26,materials.basalt,true);
  for(let x=18.2;x<28.6;x+=2.5)box('Temple bank white vertical joint',x,.45,-11.45,.055,.76,.015,materials.oldWhite);
  for(const [a,b] of [[-18.65,-12.1],[-9.5,12.0],[14.5,25.4],[30.6,54.65]]){
    box('Opposite bank solid weathered parapet',(a+b)/2,.71,-43.68,b-a,1.42,.29,fenceStone,true);
    box('Opposite bank worn white horizontal seam',(a+b)/2,.34,-43.515,b-a,.075,.024,fenceWhite);
    const bays=Math.ceil((b-a)/3.7);
    for(let j=0;j<=bays;j++)box('Opposite bank narrow white vertical seams',a+(b-a)*j/bays,.75,-43.515,.12,1.41,.027,fenceWhite);
  }
  railRun(54.68,-11.32,54.68,-25.1,'east north');
  railRun(54.68,-28.0,54.68,-43.68,'east south');
  railRun(-18.68,-11.32,-18.68,-43.68,'west bank');

  function steps(name, x, z, w, d, axis, low, high, count) {
    const alongX = axis.endsWith('x'), positive = !axis.startsWith('-');
    for (let i = 0; i < count; i++) {
      const t = (i + .5) / count, rise = low + (high - low) * (i + 1) / count;
      const offset = (positive ? t - .5 : .5 - t) * (alongX ? w : d);
      // These are solid masonry flights, not floating slabs. Extend each
      // tread to the shared footing so oblique lake views cannot see gaps.
      const footing=low-.15,stepHeight=rise-footing;
      box(`${name} tread ${i + 1}`, x + (alongX ? offset : 0), footing+stepHeight/2, z + (alongX ? 0 : offset),
        alongX ? w / count+.008 : w, stepHeight, alongX ? d : d / count+.008, materials.basalt);
    }
    K.ramp(x, z, w, d, axis, low, high);
  }
  // Additional descent opposite the upstairs view, cut between solid parapets.
  steps('Opposite bank central white-edged stair',13.25,-43.65,2.30,3.0,'-z',-.53,1.08,10);
  box('Opposite bank central stair lower landing',13.25,-.59,-42.06,2.30,.12,.34,materials.wetStone);K.surface(13.25,-42.06,2.30,.34,-.53);
  for(const x of [12.07,14.43])for(let i=0;i<10;i++)box('Opposite bank central stair white edge',x,-.53+(i+1)*.161,-42.30-i*.30,.075,.095,.31,fenceWhite);
  // Two opposed flights in 15.28.13: down from the rotated gate and up
  // to the long arcade, joined by the exposed low ledge beside the water.
  steps('near bank bathing steps',17.75,bathingGateZ,2.7,2.1,'-x',-.53,.055,5);
  box('near bank lower landing',19.25,-.59,bathingGateZ,.4,.12,2.1,materials.wetStone);
  K.surface(19.25,bathingGateZ,.4,2.1,-.53);
  box('Temple bank lower connecting walkway',23.44,-.61,bathingGateZ,8.78,.16,2.1,materials.wetStone);
  K.surface(23.44,bathingGateZ,8.78,2.1,-.53);
  steps('Bathing arcade approach stair',28.55,bathingGateZ,2.1,2.1,'x',-.53,.065,5);
  box('Bathing arcade stair top landing',29.80,-.005,bathingGateZ,.55,.14,2.1,materials.basalt);
  K.surface(29.80,bathingGateZ,.55,2.1,.065);
  steps('east bank steps', 53.76, -26.55, 2.3, 2.45, 'x', -.55, .055, 5);
  box('east bank lower landing', 52.25, -.59, -26.55, .78, .12, 2.45, materials.wetStone);
  K.surface(52.25, -26.55, .78, 2.45, -.53);
  steps('far bank corner steps', -10.8, -42.85, 2.25, 2.25, '-z', -.55, .055, 5);
  box('far bank lower landing', -10.8, -.59, -41.41, 2.25, .12, .76, materials.wetStone);
  K.surface(-10.8, -41.41, 2.25, .76, -.53);

  // Capture the pavilion and its navigation surfaces so its original detail can
  // be placed on the confirmed near bank, left in the first panorama frame.
  const pavilionChildren=group.children.length,pavilionColliders=K.colliders.length,pavilionSurfaces=K.surfaces.length,pavilionRamps=K.ramps.length;
  const px = -14.7, pz = -39.55, pw = 5.0, pd = 4.45, floor = -.29;
  box('pavilion masonry island', px, -.9, pz, pw, 1.06, pd, materials.basalt);
  box('pavilion pale floor', px, floor - .07, pz, pw, .14, pd, materials.oldWhite);
  K.surface(px, pz, pw, pd, floor);
  // The western entry bridges directly to the perimeter path.
  box('pavilion approach landing', -18.0, -.35, pz, 1.65, .12, 1.55, materials.basalt);
  K.surface(-18, pz, 1.65, 1.55, -.29);
  steps('pavilion entry steps', -18.83, pz, 1.2, 1.55, '-x', -.29, .055, 3);
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
  const pavilionTransform=new THREE.Matrix4().makeTranslation(28,0,-40).multiply(new THREE.Matrix4().makeRotationY(-Math.PI/2)).multiply(new THREE.Matrix4().makeTranslation(-px,0,-pz));
  for(const child of group.children.slice(pavilionChildren))pavilionPlacement.add(child);
  pavilionPlacement.applyMatrix4(pavilionTransform);group.add(pavilionPlacement);
  const mapPoint=(x,z)=>new THREE.Vector3(x,0,z).applyMatrix4(pavilionTransform);
  for(const c of K.colliders.slice(pavilionColliders)){
    const a=mapPoint(c.minX,c.minZ),b=mapPoint(c.maxX,c.maxZ);
    c.minX=Math.min(a.x,b.x);c.maxX=Math.max(a.x,b.x);c.minZ=Math.min(a.z,b.z);c.maxZ=Math.max(a.z,b.z);
  }
  for(const r of [...K.surfaces.slice(pavilionSurfaces),...K.ramps.slice(pavilionRamps)]){
    const p=mapPoint(r.x,r.z);r.x=p.x;r.z=p.z;[r.w,r.d]=[r.d,r.w];
    if(r.axis)r.axis=({'x':'z','-x':'-z','z':'-x','-z':'x'})[r.axis];
  }
  // Broad, gently raised earth bank gives the photographed downward look over
  // the pavilion roof; the height and bank profile are estimated.
  for(const [a,b] of [[8.6,12],[14.5,25.6]]){box('Panorama opposite bank crest',(a+b)/2,.54,-45.4,b-a,1.08,2,materials.path);K.surface((a+b)/2,-45.4,b-a,2,1.08);}
  box('Opposite bank central stair top landing',13.25,1.01,-45.75,2.50,.14,1.30,materials.path);K.surface(13.25,-45.75,2.50,1.30,1.08);
  K.ramp(5.9,-45.4,5.4,2.0,'x',.052,1.08);
  K.ramp(28.3,-45.4,5.4,2.0,'-x',.052,1.08);
  for(let i=0;i<18;i++)for(const side of [-1,1]){
    const x=17.1+side*(8.5+(i+.5)*.30),h=1.08-(i+.5)/18*1.028;
    box('Panorama sloping earth bank',x,h/2,-45.4,.31,h,2.0,materials.path);
  }


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
      [-16.5, 59, -2, 25.8], [21, 59, 25.8, 37.5],
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
  patch('laterite rear yard', -1, 23.3, 17, 3.1, materials.redSoil);
  patch('western coconut ground', -33, -24, 9.5, 30, materials.turf);
  patch('grove leaf litter', -4, 44, 25, 18, materials.darkSoil);
  patch('opposite bank overgrown ground', 0, -56, 34, 9, materials.turf);
  patch('east garden soil', 65, 26, 10, 21, materials.redSoil);
  for (let i = 0; i < 23; i++) {
    const behind = i % 2 === 0;
    patch('irregular shaded grass patch', range(-25, 17), behind ? range(28, 59) : range(-66, -49), range(1.6, 4.5), range(1.0, 2.6), i % 3 ? materials.turf : materials.moss, .026 + i * .0002);
  }
  // Garden retaining walls stay behind the house and beside the eastern grove.
  box('rear laterite garden retaining wall', -2, .29, 24.8, 27, .58, .5, materials.basalt, true);
  box('rear retaining pale coping', -2, .61, 24.8, 27.12, .1, .59, materials.path);
  box('west overgrown boundary wall', -24.1, .31, -26.5, .46, .62, 34, materials.basalt, true);
  box('east garden low boundary', 59.5, .22, 20, .42, .44, 29, materials.basalt, true);

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
  function palm(x, z, height, areca = false, reference = null) {
    z=clearOppositeBuildings(x,z);
    let leanX = range(-1.6, 1.6) * (areca ? .38 : 1), leanZ = range(-1.5, 1.5) * (areca ? .38 : 1);
    let radius = areca ? range(.085, .12) : range(.23, .32);
    const n = areca ? 3 : 9;
    // Consume the usual seeded draws before applying a photographed tree profile.
    if(reference){leanX=reference.leanX;leanZ=reference.leanZ;radius=reference.radius;}
    const trunkPoint = t => [x + leanX * t * t, height * t, z + leanZ * t * t];
    for (let i = 0; i < n; i++) segment(areca ? 'areca trunks' : 'curved coconut trunks', materials.trunk, trunkPoint(i / n), trunkPoint((i + 1) / n), radius * (1 - .48 * i / n), radius * (1 - .48 * (i + 1) / n));
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
      zone === 0 ? range(33, 59) : zone === 1 ? range(-70, -53) : range(-37, 32), range(10, 18));
  }
  // Slender areca stems rise through the rear understory in irregular rows.
  for (let row = 0; row < 7; row++) for (let col = 0; col < 13; col++) {
    const x = -26 + col * 3.5 + range(-.6, .6), z = 29 + row * 4.5 + range(-.9, .9);
    palm(x, z, range(8, 14), true);
  }
  for (let i = 0; i < 32; i++) palm(range(-38, 30), range(-70, -53), range(7, 13), true);

  // Irregular lobed crowns with small peripheral clusters replace uniform balls.
  const crown = new THREE.IcosahedronGeometry(1, 2);
  const crownPositions = crown.attributes.position;
  for (let i = 0; i < crownPositions.count; i++) {
    const x = crownPositions.getX(i), y = crownPositions.getY(i), z = crownPositions.getZ(i);
    const lobe = 1 + .11 * Math.sin(x * 11 + z * 4) * Math.cos(y * 8 - z * 6) + .06 * Math.sin(z * 17 + y * 9);
    crownPositions.setXYZ(i, x * lobe, y * lobe * (.94 + x * .09), z * lobe);
  }
  crown.computeBoundingSphere();
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
  function shrub(x, z, size) {
    z=clearOppositeBuildings(x,z);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(range(-.3, .3), range(0, 6.28), range(-.3, .3)));
    instance('varied understory shrub clusters', sphere, materials.foliage, [x, .43 * size, z], [size, size * range(.55, .9), size * range(.7, 1.15)], q,
      foliageColor().multiplyScalar(range(1, 1.13)));
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
  for(const [x,z,h] of [[-15.5,-48.6,15],[-8.2,-48.4,17],[1.2,-49.0,16],[14.5,-51.8,17],[21,-54,16],[33,-53.0,17],[46,-52,16]])palm(x,z,h);
  for(let i=0;i<24;i++)shrub(17+i*1.22,-53.3-(i%3)*.8,.65+(i%4)*.12);
  seed=neighborSeed;
  ancillary('eastern garden service house', 67, 42, 9.1, 6.0, 2.7);

  // The family identifies the house-facing corner as part of the temple.
  // It is modeled in temple.js; the former estimated annex crossed the side road.
  // Family-identified adjacent building, NOT the temple: its two-level white
  // facade faces down the lane. The original temple stays in its prior layout.
  const adjacentWhite=new THREE.MeshStandardMaterial({color:'#e8e6df',roughness:.95});
  const adjacentDark=new THREE.MeshStandardMaterial({color:'#383b39',roughness:.95});
  const ab=(name,a,y,depth,w,h,d,m=adjacentWhite,solid=false)=>box('Adjacent building '+name,60+depth,y,-5-a,d,h,w,m,solid);
  ab('raised dark foundation',0,.76,2.9,20,1.52,5.8,materials.basalt,true);
  ab('ground veranda floor',0,1.56,2.9,20,.12,5.8,'paleStone');K.surface(62.9,-5,5.8,20,1.62);
  ab('rear wall',0,4.98,5.87,20,6.72,.22,adjacentWhite,true);
  for(const a of [-9.94,9.94])ab('side wall',a,4.98,3,.20,6.72,6,adjacentWhite,true);
  ab('upper gallery slab',0,4.95,2.9,20,.20,6.0,adjacentWhite);K.surface(62.9,-5,6,20,5.05);
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
  for(const z of [-7.07,-2.93]){
    K.beam(group,'Stage white stair cheek',[56.80,.34,z],[60.05,1.98,z],.28,adjacentWhite,.35);
  }
  for(const base of [1.62,5.05])for(const a of [-8,-3,3,8]){
    ab('square column foot',a,base+.14,.50,.62,.28,.62,adjacentDark);
    ab('white column shaft',a,base+1.50,.50,.30,2.8,.30,adjacentWhite,true);
    ab('column central block',a,base+1.23,.50,.57,.61,.57);
    ab('dark inset column panel',a,base+1.23,.19,.35,.39,.025,adjacentDark);
    for(const y of [.38,.83,1.63,2.70,2.94])ab('projecting column collar',a,base+y,.50,.64,.105,.61);
  }
  for(const y of [4.67,8.08])ab('plain white lintel',0,y,.51,20,.23,.40);
  for(const y of [2.84,6.27]){
    for(const a of [-8,-5.5,5.5,8])ab('back wall dark window',a,y,5.73,.68,1.08,.04,adjacentDark);
    for(const a of [-2.4,0,2.4])ab('recessed back door',a,y-.10,5.70,1.02,2.13,.06,adjacentDark);
    ab('dark horizontal wall band',0,y+1.03,5.73,19.8,.22,.04,adjacentDark);
  }
  for(const y of [5.14,5.89])ab('white balcony rail',0,y,.26,19.5,.12,.24);

  ab('red balcony cornice',0,4.85,.0,20.65,.17,.9,'red');
  ab('red balcony coping',0,5.97,.26,19.7,.08,.27,'red');
  const adjacentRoof=K.hipRoof(group,'Adjacent building weathered tiled roof',0,0,21.1,7.1,8.35,1.07);adjacentRoof.rotation.y=Math.PI/2;adjacentRoof.position.set(62.9,0,-5);
  const adjacentGable=new THREE.Shape();
  adjacentGable.moveTo(-2.6,7.99);adjacentGable.lineTo(-2.6,8.48);adjacentGable.lineTo(0,9.61);adjacentGable.lineTo(2.6,8.48);adjacentGable.lineTo(2.6,7.99);adjacentGable.lineTo(1.40,7.99);adjacentGable.lineTo(1.40,8.39);adjacentGable.quadraticCurveTo(0,9.84,-1.40,8.39);adjacentGable.lineTo(-1.40,7.99);adjacentGable.closePath();
  const gableMesh=new THREE.Mesh(new THREE.ExtrudeGeometry(adjacentGable,{depth:.22,bevelEnabled:false,curveSegments:16}),adjacentWhite);gableMesh.rotation.y=Math.PI/2;gableMesh.position.set(59.65,0,-5);gableMesh.name='Adjacent building central arched gable';group.add(gableMesh);K.roofs.push(gableMesh);
  for(const side of [-1,1])K.beam(group,'Adjacent building red gable edge',[59.62,8.52,-5+side*2.67],[59.62,9.69,-5],.15,'red',.21);
  // Four decorative figures are sampled from the already-approved 15.19.57
  // photograph. Only the architectural figures, not people in its forecourt.
  function stageFigure(name,a,y,rect){
    const map=new THREE.TextureLoader().load('./assets/temple.jpg');map.colorSpace=THREE.SRGBColorSpace;
    const [x0,y0,x1,y1]=rect;map.repeat.set((x1-x0)/1824,(y1-y0)/1368);map.offset.set(x0/1824,1-y1/1368);
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(.76,1.80),new THREE.MeshStandardMaterial({map,roughness:.96}));panel.name=name;panel.rotation.y=-Math.PI/2;panel.position.set(60.135,y,-5-a);group.add(panel);
  }
  stageFigure('Stage upper left photographed figure',3,6.68,[696,303,755,462]);
  stageFigure('Stage upper right photographed figure',-3,6.68,[1000,303,1070,462]);
  stageFigure('Stage lower left photographed figure',3,2.68,[680,682,758,859]);
  stageFigure('Stage lower right photographed figure',-3,2.68,[996,685,1072,862]);
  // Moulded capitals and a shaped white balcony screen replace plain rods.
  for(const base of [1.62,5.05])for(const a of [-8,-3,3,8]){
    for(const side of [-1,1]){
      const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(.49,0);shape.quadraticCurveTo(.46,-.29,.24,-.32);shape.quadraticCurveTo(.19,-.13,0,-.13);shape.closePath();
      const bracket=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:false}),adjacentWhite);bracket.name='Stage shaped column capital bracket';bracket.rotation.y=Math.PI/2;bracket.scale.x=side;bracket.position.set(60.40,base+2.92,-5-a);group.add(bracket);
    }
  }
  const spindleProfile=[[.073,0],[.073,.09],[.031,.18],[.035,.36],[.084,.44],[.038,.53],[.07,.66]].map(p=>new THREE.Vector2(...p));
  const stageSpindles=new THREE.InstancedMesh(new THREE.LatheGeometry(spindleProfile,8),adjacentWhite,77);stageSpindles.name='Stage shaped white balcony balusters';
  const stagePose=new THREE.Object3D();for(let i=0;i<77;i++){stagePose.position.set(60.255,5.18,-14.5+i*.25);stagePose.updateMatrix();stageSpindles.setMatrixAt(i,stagePose.matrix);}stageSpindles.instanceMatrix.needsUpdate=true;group.add(stageSpindles);
  // Tile relief follows the existing hipped roof, keeping its profile and alignment.
  const roofCourses=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),K.M.tile,25*65);roofCourses.name='Stage overlapping roof tile courses';
  for(let i=0;i<25;i++)for(let j=0;j<65;j++){
    const x=-3.42+i*.284,z=-10.35+j*.323,fx=(3.55-Math.abs(x))/3.55,fz=(10.55-Math.abs(z))/3.195;
    const h=1.07*Math.max(0,Math.min(fx,fz,1));stagePose.position.set(62.9+x,8.39+h,-5+z);stagePose.rotation.set(fz<fx?Math.sign(z)*.32:0,0,fz<fx?0:-Math.sign(x)*.293);stagePose.scale.set(.30,.048,.34);stagePose.updateMatrix();roofCourses.setMatrixAt(i*65+j,stagePose.matrix);
  }
  roofCourses.instanceMatrix.needsUpdate=true;group.add(roofCourses);K.roofs.push(roofCourses);
  K.labels.push({text:'Adjacent building',position:[60,10.5,-5]});
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
  box('Shop grass and laterite approach',57.6,.021,-25,4.6,.04,20.2,materials.redSoil);
  K.surface(57.6,-25,4.6,20.2,.041);
  // Broken grassy edges and the narrow concrete threshold step.
  sb('front entry shallow step',-.8,.075,-.42,2.1,.15,.42,materials.mortar);K.surface(59.58,-24.2,.42,2.1,.15);
  for(const a of [-8.8,-5.1,-1.7,2.4,6.7,9.0]){
    sb('white veranda post',a,1.64,.12,.22,2.68,.24,shopWhite,true);
    sb('black veranda post foot',a,.69,.105,.25,.78,.27,materials.basalt);
  }
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
  const flowerMat=new THREE.MeshStandardMaterial({color:'#926d9c',roughness:1});
  for(let i=0;i<190;i++){
    const p=roadCurve.getPoint(range(.20,.62)),side=i%2?1:-1,z=p.z+side*range(2.6,4.0),h=range(.28,.8);
    segment('Fine roadside flowering stems',materials.grass,[p.x,0,z],[p.x+.05,h,z],.008);
    instance('Small purple roadside flowers',sphere,flowerMat,[p.x+.05,h,z],[.055,.09,.055]);
  }
  // Tall areca stems and dense understory now stand behind the adjacent building, separate from the temple.
  for(let row=0;row<7;row++)for(let col=0;col<14;col++)palm(67+row*2.75+range(-.7,.7),-30+col*3.2+range(-.8,.8),range(22,30),true);
  for(const p of [[72,-28,28],[77,-13,29],[69,12,26],[82,4,30]])palm(...p);
  for(let i=0;i<10;i++)broadleaf(72+range(-2,11),-30+i*5.2,range(13,19),range(4,6));
  for(let i=0;i<100;i++)shrub(range(66,83),range(-31,17),range(.8,1.5));

  // The upper-gallery temple photos show dense palms directly behind the court.
  // Keep this grove behind the established temple footprint, separate from the
  // neighboring building's grove; individual tree positions are estimated.
  for(let row=0;row<4;row++)for(let col=0;col<12;col++)palm(24+col*3.4+range(-.6,.6),43+row*4.3+range(-.7,.7),range(14,21),true);
  for(const p of [[28,44,19],[37,48,23],[45,43,21],[55,45,20],[60,51,23],[33,59,22],[50,60,22]])palm(...p);
  for(let i=0;i<12;i++)broadleaf(25+i*3.3,48+range(0,12),range(9,14),range(3,4.3));
  for(let i=0;i<65;i++)shrub(range(24,64),range(41,57),range(.9,1.6));

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
  const car=new THREE.Group();car.name='Maroon hatchback beside the house';car.position.set(5.8,.03,-2.35);group.add(car);
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
  K.blocker(5.8,-2.35,3.85,1.88,.03,1.78);

  // Purple roadside plants from the front-of-house photographs.
  for(let i=0;i<96;i++){
    const x=5.5+((i*61)%97)/97*4.15,z=-10.8+((i*37)%89)/89*1.2,h=.36+(i%13)*.065;
    if(i%5===0)shrub(x,z,.36+(i%7)*.06);
    segment('Front photo tall flowering stem',materials.grass,[x,0,z],[x+.07,h,z],.008);
    for(let j=0;j<3;j++)instance('Front photo small purple flowers',sphere,flowerMat,[x+.07+j*.024,h-j*.13,z],[.034,.045,.035]);
  }

  // 15.20.01: one recessed stepped-outline pond, right of the temple entrance.
  // main.js cuts out the ground beneath this basin, so the water is below grade.
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
    const value=54+lime*111+grain*25;
    const i=(y*256+x)*4;pondPixels.data[i]=value;pondPixels.data[i+1]=value+2;pondPixels.data[i+2]=value-5;pondPixels.data[i+3]=255;
  }
  pondContext.putImageData(pondPixels,0,0);
  const pondTexture=new THREE.CanvasTexture(pondCanvas);pondTexture.colorSpace=THREE.SRGBColorSpace;pondTexture.wrapS=pondTexture.wrapT=THREE.RepeatWrapping;
  const pondStone=new THREE.MeshStandardMaterial({map:pondTexture,roughness:.97});
  const pondCoping=K.M.plaster.clone();pondCoping.color.set('#aaa99c');
  function pondWallUV(wall){
    const p=wall.geometry.attributes.position,uv=wall.geometry.attributes.uv,n=wall.geometry.attributes.normal;
    for(let i=0;i<p.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i)+wall.position.z:p.getX(i)+wall.position.x)*.75,(p.getY(i)+wall.position.y+1.05)/1.37);
    uv.needsUpdate=true;
  }
  const pondShape=new THREE.Shape(pondOutline.map(([x,z])=>new THREE.Vector2(x,-z)));
  const water=new THREE.Mesh(new THREE.ShapeGeometry(pondShape),new THREE.MeshStandardMaterial({color:'#354d31',roughness:.26,metalness:.16}));
  water.name='Temple small pond recessed water';water.rotation.x=-Math.PI/2;water.position.set(25.5,-.94,-1.5);group.add(water);
  const soil=new THREE.Shape([new THREE.Vector2(-2.5,-1.5),new THREE.Vector2(2.5,-1.5),new THREE.Vector2(2.5,1.5),new THREE.Vector2(-2.5,1.5)]);
  soil.holes.push(new THREE.Path(pondOutline.map(([x,z])=>new THREE.Vector2(x,-z))));
  const surround=new THREE.Mesh(new THREE.ShapeGeometry(soil),K.M.earth);surround.name='Temple small pond earth surround';surround.rotation.x=-Math.PI/2;surround.position.set(25.5,0,-1.5);group.add(surround);
  box('Temple small pond deep bottom',25.5,-1.11,-1.5,4.98,.12,2.98,materials.wetStone);
  for(let i=0;i<pondOutline.length;i++){
    const a=pondOutline[i],b=pondOutline[(i+1)%pondOutline.length],x=25.5+(a[0]+b[0])/2,z=-1.5+(a[1]+b[1])/2;
    const w=Math.abs(a[0]-b[0])+.15,d=Math.abs(a[1]-b[1])+.15;
    const notch=Math.abs(x-25.5)<.01&&Math.abs(z+1.5)>.95,top=notch?.10:.32;
    pondWallUV(box('Temple small pond weathered retaining wall',x,(top-1.05)/2,z,w,top+1.05,d,pondStone,true));
    box('Temple small pond worn pale coping',x,top,z,w+.035,.07,d+.035,pondCoping);
    box('Temple small pond algae waterline',x,-.94,z,w+.006,.08,d+.006,materials.wetStone);
  }
  // Prevent walking into the open water while retaining the visible depth.
  K.blocker(25.5,-1.5,4.2,2.2,-1.1,.35);

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
  group.traverse(object => { if (object.isMesh) { object.castShadow = !object.name.startsWith('Horizon '); object.receiveShadow = !object.name.startsWith('Horizon '); } });
  K.labels.push({ text: 'Temple tank · stepped stone banks', position: [0, .4, -11.0] });
  K.labels.push({ text: 'Coconut and areca grove', position: [-6, 1.3, 31] });
  group.userData.referenceNotes = '2011 tank: dark stone courses, white posts, near-bank flat-roof scalloped pavilion; approximate coconut and areca planting. No water or base terrain mesh.';
  return group;
}
