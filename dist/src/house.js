import * as THREE from 'three';

// Editable reconstruction of the supplied ground-floor plan, facing -Z.
// Dimensions and unseen upper rooms are estimates; source photographs control
// the characteristic timber, turquoise plaster, oxide floors and roof forms.
export function buildHouse(K) {
  const navStart={colliders:K.colliders.length,surfaces:K.surfaces.length,ramps:K.ramps.length,labels:K.labels.length};
  const g = new THREE.Group();
  g.name = 'Grandparents house — courtyard plan';
  const F = .45, U = 3.85, E = 3.55;
  // 14.56.07–14.56.47: weathered timber, turquoise sitting bays and oxide floors
  // belong to the outside veranda, before the main doorway at z=2.05.
  const oldTimberCanvas=document.createElement('canvas');oldTimberCanvas.width=oldTimberCanvas.height=512;
  const timberPaint=oldTimberCanvas.getContext('2d');timberPaint.fillStyle='#645951';timberPaint.fillRect(0,0,512,512);
  for(let i=0;i<1800;i++){
    const x=(i*173)%512,y=(i*317)%512;
    timberPaint.strokeStyle=['#292d2918','#a6977b18','#302e2815','#b8aaa510'][i%4];
    timberPaint.lineWidth=.5;timberPaint.beginPath();timberPaint.moveTo(x,y);timberPaint.lineTo(x+Math.sin(i)*2,y+45+i%135);timberPaint.stroke();
  }
  // 14.56.30: oiled near-black timber, worn to grey-brown where hands and
  // weather reach, with long vertical checks in the grain.
  {let n=19391;const r=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};const c=timberPaint;
   c.fillStyle='rgba(38,32,28,.20)';c.fillRect(0,0,512,512); // 14.56.30: weathered grey-brown (about #48352f), not black
   const soft=(x,y,rx,ry,rgb,a)=>{for(const dx of [-512,0,512])for(const dy of [-512,0,512]){c.save();c.translate(x+dx,y+dy);c.scale(rx,ry);const g=c.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(1,`rgba(${rgb},0)`);c.fillStyle=g;c.beginPath();c.arc(0,0,1,0,7);c.fill();c.restore();}};
   for(let i=0;i<26;i++)soft(r()*512,r()*512,18+r()*50,50+r()*120,'128,116,100',.18+r()*.22);
   for(let i=0;i<30;i++)soft(r()*512,r()*512,10+r()*30,30+r()*90,'20,17,15',.15+r()*.2);
   for(let i=0;i<90;i++){const x=r()*512,y=r()*512,h=30+r()*160;c.strokeStyle=`rgba(${r()<.7?'14,12,10':'150,138,118'},${.25+r()*.35})`;c.lineWidth=.6+r()*1.4;c.beginPath();c.moveTo(x,y);c.lineTo(x+r()*4-2,y+h);c.stroke();}
  }
  const timberMap=new THREE.CanvasTexture(oldTimberCanvas);timberMap.colorSpace=THREE.SRGBColorSpace;timberMap.wrapS=timberMap.wrapT=THREE.RepeatWrapping;
  const verandaTimber=new THREE.MeshStandardMaterial({map:timberMap,bumpMap:timberMap,bumpScale:.004,roughness:.9});
  // 14.56.30: the veranda lime-wash is a bright mint turquoise.
  K.baseGrime(K.M.aqua,{top:1.6,strength:.45,tint:[.7,.66,.58]});
  const verandaAqua=K.M.aqua.clone();K.baseGrime(verandaAqua,{top:1.5,strength:.35,tint:[.7,.66,.58]});verandaAqua.color.setRGB(.98,1.08,1.02); // 14.31.25 / 14.31.43 / 14.57.08: a pale mint, about #b6e3d7
  const verandaRed=K.M.red.clone();verandaRed.color.setRGB(.88,.80,.84);verandaRed.roughness=.76; // 14.56.30: floor about #4c2524 in the photo
  // 14.41.43 / 14.44.22: worn grey cement walkways and pale, stained whitewash
  // on the rear veranda, rather than oxide floors and turquoise paint.
  let washSeed=4127;const washRand=()=>{washSeed=(Math.imul(washSeed,1664525)+1013904223)>>>0;return washSeed/4294967296;};
  const paintedMap=(size,paint,repeat)=>{if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=c.height=size;paint(c.getContext('2d'),size);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);return t;};
  const greyCement=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.82,map:paintedMap(256,(c,s)=>{
    c.fillStyle='#8b8a82';c.fillRect(0,0,s,s);
    for(let i=0;i<220;i++){const v=washRand()<.5?55:185;c.fillStyle=`rgba(${v},${v},${v-6},${.04+washRand()*.08})`;c.beginPath();c.ellipse(washRand()*s,washRand()*s,2+washRand()*12,1+washRand()*6,washRand()*3,0,Math.PI*2);c.fill();}
  },.5)});
  const rearWash=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.95,map:paintedMap(512,(c,s)=>{
    c.fillStyle='#cddfd6';c.fillRect(0,0,s,s);
    for(let i=0;i<90;i++){const x=washRand()*s,y=washRand()*s,h=30+washRand()*120;const g=c.createLinearGradient(0,y,0,y+h);g.addColorStop(0,`rgba(58,62,52,${.08+washRand()*.16})`);g.addColorStop(1,'rgba(58,62,52,0)');c.fillStyle=g;c.fillRect(x,y,3+washRand()*18,h);}
    for(let i=0;i<260;i++){const r=washRand()<.3;c.fillStyle=r?`rgba(150,82,56,${.06+washRand()*.14})`:`rgba(70,72,62,${.05+washRand()*.12})`;c.fillRect(washRand()*s,washRand()*s,1+washRand()*4,1+washRand()*4);}
  },.3)});
  const batches = new Map();
  const mat = key => typeof key === 'string' ? K.M[key] : key;
  const b = (name,x,y,z,w,h,d,m='plaster',solid=false) => K.box(g,name,x,y,z,w,h,d,m,solid);
  const detail = (x,y,z,w,h,d,m='wood',ry=0,rz=0) => {
    const material=mat(m);
    if (!batches.has(material)) batches.set(material,[]);
    batches.get(material).push({x,y,z,w,h,d,ry,rz});
  };
  const floor = (name,x,z,w,d,y=F,m='red',thick=.18) => {
    b(name,x,y-thick/2,z,w,thick,d,m);
    K.surface(x,z,w,d,y);
  };
  let skirting=true; // off where a photo shows plain plaster to the floor
  const wallX = (name,x1,x2,z,y,h,opens=[],m='aqua',t=.25) => {
    let cursor=x1;
    for (const o of [...opens].sort((a,b)=>a.c-b.c)) {
      const left=o.c-o.w/2, right=o.c+o.w/2, bottom=o.bottom||0, top=o.top||2.5;
      if(left>cursor) b(name+' pier',(cursor+left)/2,y+h/2,z,left-cursor,h,t,m,true);
      if(bottom>0) b(name+' sill',o.c,y+bottom/2,z,o.w,bottom,t,m,true);
      if(top<h) b(name+' lintel',o.c,y+(top+h)/2,z,o.w,h-top,t,m,true);
      cursor=right;
    }
    if(cursor<x2) b(name+' pier',(cursor+x2)/2,y+h/2,z,x2-cursor,h,t,m,true);
    // Red oxide skirting stops at doors.
    if(!skirting)return;
    let sc=x1;
    for(const o of [...opens].filter(o=>!o.bottom).sort((a,b)=>a.c-b.c)) {
      const left=o.c-o.w/2;
      if(left>sc) detail((sc+left)/2,y+.19,z,left-sc,.38,t+.012,'red');
      sc=o.c+o.w/2;
    }
    if(sc<x2) detail((sc+x2)/2,y+.19,z,x2-sc,.38,t+.012,'red');
  };
  const wallZ = (name,x,z1,z2,y,h,opens=[],m='aqua',t=.25) => {
    let cursor=z1;
    for(const o of [...opens].sort((a,b)=>a.c-b.c)) {
      const left=o.c-o.w/2,right=o.c+o.w/2,bottom=o.bottom||0,top=o.top||2.5;
      if(left>cursor)b(name+' pier',x,y+h/2,(cursor+left)/2,t,h,left-cursor,m,true);
      if(bottom>0)b(name+' sill',x,y+bottom/2,o.c,t,bottom,o.w,m,true);
      if(top<h)b(name+' lintel',x,y+(top+h)/2,o.c,t,h-top,o.w,m,true);
      cursor=right;
    }
    if(cursor<z2)b(name+' pier',x,y+h/2,(cursor+z2)/2,t,h,z2-cursor,m,true);
  };
  function doorX(x,z,width=1.65,y=F,h=2.45,side=1,leaves=true) {
    detail(x-width/2-.075,y+h/2,z,.15,h,.37,'wood');
    detail(x+width/2+.075,y+h/2,z,.15,h,.37,'wood');
    detail(x,y+h+.06,z,width+.3,.18,.4,'wood');
    detail(x,y+h+.21,z,width+.42,.12,.32,'wood');
    // Open double shutters sit against the jambs and leave the route clear.
    for(const s of leaves?[-1,1]:[]) {
      if(side===0){detail(x+s*(width*.75+.10),y+h*.48,z-.21,width*.46,h*.96,.075,'wood');continue;}
      const px=x+s*(width/2+.025),pz=z+side*width*.23;
      detail(px,y+h*.48,pz,.075,h*.96,width*.46,'wood');
      detail(px+s*.04,y+h*.35,pz,.05,.08,width*.42,'blue');
      detail(px+s*.04,y+h*.68,pz,.05,.08,width*.42,'blue');
    }
  }
  function grilleX(x,z,w=1.5,y=F+1.1,h=1.25,reveal='cream',back='wood',bar='blue') {
    detail(x,y+h/2,z,w+.22,h+.22,.12,reveal);
    detail(x,y+h/2,z-.075,w,h,.1,back);
    for(const yy of [y,y+h*.5,y+h])detail(x,yy,z-.145,w+.1,.09,.08,bar);
    for(const xx of [x-w/2,x+w/2])detail(xx,y+h/2,z-.145,.085,h+.1,.08,bar);
    for(let xx=x-w/2+.12;xx<x+w/2;xx+=.13)detail(xx,y+h/2,z-.17,.026,h,.035,bar);
  }
  function grilleZ(x,z,w=1.6,y=F+1.0,h=1.35) {
    detail(x,y+h/2,z,.13,h+.18,w+.18,'wood');
    for(const yy of [y,y+h*.48,y+h])detail(x+.09,yy,z,.07,.09,w,'blue');
    for(let zz=z-w/2;zz<=z+w/2;zz+=.14)detail(x+.1,y+h/2,zz,.06,h,.035,'blue');
  }
  function fenceX(x1,x2,z,y=F,height=1.13) {
    for(const yy of [y+.1,y+.62,y+height])detail((x1+x2)/2,yy,z,x2-x1,.095,.09,'blue');
    for(let x=x1+.08;x<x2;x+=.18)detail(x,y+height/2,z,.052,height,.065,'blue');
    K.blocker((x1+x2)/2,z,x2-x1,.12,y,y+height);
  }
  function fenceZ(x,z1,z2,y=F,height=1.13) {
    for(const yy of [y+.1,y+.62,y+height])detail(x,yy,(z1+z2)/2,.095,.095,z2-z1,'blue');
    for(let z=z1+.08;z<z2;z+=.18)detail(x,y+height/2,z,.065,height,.052,'blue');
    K.blocker(x,(z1+z2)/2,.12,z2-z1,y,y+height);
  }
  function column(x,z,y=F,height=3.0,r=.14) {
    K.column(g,'Carved timber column',x,z,y,height,r,'wood');
    // Broad capitals and curved-looking stepped brackets characteristic of the hall.
    for(let i=0;i<3;i++)detail(x,y+height-.14-i*.1,z,.84-i*.16,.115,.3,'wood');
    for(const s of [-1,1]) {
      detail(x+s*.36,y+height-.24,z,.45,.12,.19,'wood',0,s*.4);
    }
  }
  function stairs(name,x,z,w,d,low,high,dir='-z',count=20) {
    const run=d/count, rise=(high-low)/count;
    for(let i=0;i<count;i++) {
      const cz=dir==='-z'?z+d/2-(i+.5)*run:z-d/2+(i+.5)*run;
      b(name+' tread '+i,x,low+(i+1)*rise-.075,cz,w,.15,run+.018,'paleStone');
    }
    K.ramp(x,z,w,d,dir,low,high);
  }

  // Ring of shaded rooms and verandas around the central unroofed court.
  // East-facing convention: east=-Z, north=-X. 175312 shows a lower
  // court pocket and north-south treads, not steps along the front edge.
  // User's notes (game, at the entrance and in the court): no raised floor in the centre. The entry
  // passage runs at ground level from the lane to the court pocket; only the side platforms are raised.
  const EL=.075;
  // User's note (game, court front, 2026-10-02): the raised red floor east of the passage starts in
  // line with the court's blue railing (hallX). From the sitting platform to there the hall floor is
  // at ground level with the passage and the court pocket, in the same smooth dark stone.
  const hallX=6.85;
  floor('Front range plinth',-6.61,2.2,10.78,4.4);
  floor('Front range plinth',6.61,1.1,10.78,2.2);
  floor('Front range plinth',2.515,3.3,2.59,2.2);
  floor('Front range plinth',(hallX+12)/2,3.3,12-hallX,2.2);
  floor('Front range north return',-8.025,5.2,7.95,1.6);
  // User's note (snake god pit): the grey pocket floor is the right tile and height, and it
  // runs on across the front of the God room; red is only for the raised platforms.
  floor('Front range south return',(hallX+12)/2,5.2,12-hallX,1.6);
  floor('Entrance right lower court pocket',-3.15,5.2,1.8,1.6,.075,'stone',.08);
  floor('Entrance right lower court pocket',.78,5.35,6.06,1.3,.075,'stone',.08);
  floor('Entrance right lower court pocket',0,6.08,4.8,.17,.075,'stone',.08); // up to the God room platform fronts (z 6.155)
  floor('Inner hall ground-level floor',(3.81+hallX)/2,4.085,hallX-3.81,3.83,.075,'stone',.08);
  floor('West rooms and passage',-10.2,12,3.6,12);
  // 14.31.25: the long side veranda floor is a dull, worn maroon oxide.
  {const worn=K.M.pink.clone();worn.color.setRGB(.21,.21,.2);worn.roughness=.8; /* worn pink oxide: multipliers stay under 1 so the export keeps the colour */floor('East passage and stair base',9.65,12,4.7,12,F,worn);}
  floor('Rear veranda',-.55,16.25,17.7,3.5,F,greyCement);
  const dampCourt=mat('earth').clone();dampCourt.color.set('#b08774');dampCourt.roughness=.80; // 14.44.09 / 14.48.07 / courtyard.jpg: wet red laterite, not grey-green
  floor('Damp courtyard soil',-.55,10.25,15.7,8.5,.035,dampCourt,.08);
  // 14.30.57 / 14.31.01 / 14.44.09: the court is green with weeds; the red soil shows only along the worn
  // paths, under the lean-tos and before the rear fence. One painted map over the whole court top.
  if(typeof document!=='undefined'){const W=1024,H=554,cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');
    let n=140911;const r=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
    c.fillStyle='#935c4a';c.fillRect(0,0,W,H);
    for(let i=0;i<700;i++){c.fillStyle=r()<.6?`rgba(92,52,40,${.10+r()*.2})`:`rgba(176,124,100,${.06+r()*.12})`;c.beginPath();c.ellipse(r()*W,r()*H,4+r()*26,3+r()*14,r()*3,0,7);c.fill();}
    const near=(v,centre,half)=>Math.min(1,Math.abs(v-centre)/half);
    const greens=['78,116,66','100,138,82','116,152,96','62,100,54','90,126,74'];
    for(let i=0;i<16000;i++){const px=r()*W,py=r()*H,x=-8.4+px/W*15.7,z=6+py/H*8.5;
      let d=.93;
      d*=.12+.88*near(x,3.25,.75);
      if(x<-2.7){d*=.15+.85*near(x,-3.7,.7);d*=.2+.8*near(z,10.8,.7);}
      d*=.15+.85*Math.min(1,Math.max(0,(z-6.1)/.9));
      if(z<7.7&&(x>2.3||x<-2.3))d*=.35;
      d*=.3+.7*Math.min(1,Math.max(0,(14.4-z)/.6));
      if(r()>d)continue;
      const q=5+r()*11,gr=c.createRadialGradient(px,py,0,px,py,q);gr.addColorStop(0,`rgba(${greens[i%5]},${.55+r()*.4})`);gr.addColorStop(1,`rgba(${greens[i%5]},0)`);c.fillStyle=gr;c.fillRect(px-q,py-q,2*q,2*q);
      if(i%2){c.fillStyle=`rgba(${i%4===1?'44,78,32':'150,176,96'},${.25+r()*.3})`;c.beginPath();c.ellipse(px+r()*8-4,py+r()*8-4,1+r()*2.5,.6+r()*1.2,r()*3,0,7);c.fill();}}
    const cover=new THREE.CanvasTexture(cv);cover.colorSpace=THREE.SRGBColorSpace;cover.anisotropy=8;
    const coverMat=new THREE.MeshStandardMaterial({name:'court weed cover',map:cover,roughness:.95});
    const soil=g.children.at(-1),sp=soil.geometry.attributes.position,sn=soil.geometry.attributes.normal,su=soil.geometry.attributes.uv;
    for(let i=0;i<sp.count;i++)if(sn.getY(i)>.5)su.setXY(i,(sp.getX(i)+7.85)/15.7,1-(sp.getZ(i)+4.25)/8.5);
    soil.material=[dampCourt,dampCourt,coverMat,dampCourt,dampCourt,dampCourt];}
  const plinthFace=mat('plaster').clone();plinthFace.color.set('#9d8a73');
  // Lowered central entrance with paired raised sitting platforms.
  // Entrance photos show raised seating against the room wall, with a lower
  // continuous walkway between the stout inner posts and slender outer row.
  // 14.56.30: the platform faces are dark weathered grey plaster under the stone edge.
  const riserGrey=K.M.plaster.clone();riserGrey.color.set('#85847c');riserGrey.roughness=1;
  const riserOxide=new THREE.MeshStandardMaterial({color:'#7a4a3c',roughness:.9});
  for(const side of [-1,1]) {
    // veranda.jpg: a stone strip about 0.3 m wide runs along the platform edge wholly in front of the posts,
    // and the red floor starts at the post faces: the bays reach 0.32 m further toward the lane (z -.07).
    floor(side>0?'Entrance-left red sitting bay':'Entrance-right empty red sitting bay',side*2.745,.99,2.99,2.12,.75,verandaRed,.30);
    b('Veranda worn pale platform riser',side*2.745,.59,-.065,2.99,.27,.05,riserOxide); // 14.56.30: worn red-brown under the stone edge
    b('Veranda dark stone sitting edge',side*2.745,.765,.045,2.99,.045,.30,'stone');
    b('Veranda entrance end riser',side*1.26,(EL+.725)/2,.99,.07,.725-EL,2.12,riserGrey);
    b('Veranda entrance end stone coping',side*1.375,.768,.99,.30,.045,2.12,'stone'); // a broad stone edge (14.56.30)
    floor('Veranda lower continuation',side*6.27,.99,4.06,2.05,F,verandaRed,.18);
  }
  floor('Veranda central grey cement walkway',0,.615,2.88,2.87,EL+.004,greyCement,.08);
  // 14.56.30: the walking strip is a neutral grey-brown stone, not green-grey.
  const walkStone=greyCement.clone();walkStone.color.set('#bbadad');walkStone.roughness=.6; // 14.56.30: smooth worn grey cement (about 97,90,89), no flagstone joints
  floor('Entrance-left lower stone walking strip',5.62,-.425,8.36,.79,.455,walkStone,.05);
  floor('Entrance-right lower stone walking strip',-4.77,-.425,6.66,.79,.455,walkStone,.05);
  for(const s of [-1,1]){
    // The raised side walk ends in a plain face at the passage, with one worn step up to it.
    b('Entrance passage side riser',s*1.47,(EL+.43)/2,-.445,.06,.43-EL,.75,riserGrey);
    floor('Entrance passage side step',s*1.27,-.445,.34,.70,.265,'stone',.265-EL);
    floor('Sitting bay stone step',s*1.055,1.15,.34,.9,.41,'stone',.41-EL);
    // house-front.jpg: a low masonry cheek stands out from the plinth either side of the entry slab.
    b('Entrance low masonry cheek',s*1.92,.19,-1.345,.92,.38,.55,plinthFace,true);
    b('Entrance cheek worn stone top',s*1.92,.395,-1.345,.96,.03,.59,'stone');
    // The facade and the door frame stand on a stone base where the floor now drops away.
    b('Main door stone base',s*.93,(EL+F)/2,2.0,.66,F-EL,.42,'stone');
  }
  floor('Front left access step',-3.1,.04,1.9,.7,.19,'paleStone');
  // Reach the low step before the raised veranda walking strip.
  floor('Front entry cement slab',0,-1.72,2.6,1.8,.05,greyCement,.05);
  // The front photographs show a continuous worn plinth with one low entry gap.
  // 15.28.36: a plain ochre wash, darkened only along the ground by splash-back.
  const plinthDamp=mat('plaster').clone();plinthDamp.color.set('#7a6a55');
  for(const [x,w] of [[-4.62,6.35],[5.09,7.30]]){
    b('Front veranda weathered retaining plinth',x,.43,-.98,w,.86,.18,plinthFace,true);
    b('Front veranda worn stone coping',x,.88,-.98,w+.025,.055,.23,'stone');
    b('Front plinth splash-back damp band',x,.09,-1.074,w,.18,.008,plinthDamp);
  }
  // Broad route around the shrine, with intentional breaks in the blue grilles.
  fenceX(-8.1,-7.3,5.83);
  // 14.44.09 / 14.44.14 / 14.44.43: a rusty corrugated sheet on edge closes this pocket, not a blue grille.
  {const geo=new THREE.PlaneGeometry(2.2,.88,96,1),gp=geo.attributes.position;for(let i=0;i<gp.count;i++)gp.setZ(i,.03*Math.cos(gp.getX(i)*Math.PI/.045));geo.computeVertexNormals();
   const sheet=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({name:'court sheet barrier',color:'#bd8c86',roughness:1,side:THREE.DoubleSide}));sheet.name='Courtyard pocket rusty sheet barrier';sheet.rotation.z=Math.PI/2;sheet.rotation.y=0;
   sheet.geometry.rotateZ(0);sheet.rotation.set(0,0,0);sheet.position.set(3.5,EL+.44,6.02);g.add(sheet);K.blocker(3.5,6.02,2.2,.1,EL,EL+.9);}
  // User-labelled 14.39.18 / 14.41.29 / 14.52.45: looking back after
  // entering, a stepped turquoise pedestal sits over a three-stone niche.
  // Place it beside the entrance-side court steps; spacing remains inferred.
  const pedestalStart={children:g.children.length,colliders:K.colliders.length};
  const pedestalX=-3.40,pedestalZ=5.83;
  const nicheOxide=K.M.plaster.clone();nicheOxide.color.set('#b99b92');nicheOxide.roughness=1;
  const pedestalPaint=K.M.plaster.clone();pedestalPaint.color.set('#e2ded0');pedestalPaint.roughness=.98;
  b('Entrance pedestal masonry left cheek',-3.025,.24,5.96,.13,.41,.16,nicheOxide,true);
  b('Entrance pedestal masonry right cheek',-3.86,.24,5.96,.23,.41,.16,nicheOxide,true);
  b('Entrance pedestal niche lintel',-3.40,.362,5.96,.88,.175,.16,nicheOxide);
  b('Entrance pedestal niche dark back',-3.40,.154,5.73,.64,.23,.025,'stone');
  b('Entrance pedestal niche stone sill',-3.40,.055,5.94,.76,.04,.49,'stone');
  b('Entrance pedestal worn coping',-3.40,.466,5.90,1.03,.032,.36,'stone');
  for(const [w,d,h,y] of [[.82,.49,.125,.529],[.70,.40,.13,.6565],[.56,.29,.105,.774]])
    b('Entrance three-tier pale pedestal',pedestalX,y,pedestalZ,w,h,d,pedestalPaint,true);
  const nicheStone=new THREE.MeshStandardMaterial({color:'#8b9871',roughness:1});
  for(const [j,x,h] of [[0,-3.18,.175],[1,-3.38,.19],[2,-3.58,.175]]){
    const geom=new THREE.BoxGeometry(.175,h,.06,3,3,1),pos=geom.attributes.position;
    for(let k=0;k<pos.count;k++)pos.setX(k,pos.getX(k)+.006*Math.sin(k*2.3+j));
    geom.computeVertexNormals();const stone=new THREE.Mesh(geom,j===1?K.M.stone:nicheStone);
    stone.name='Entrance niche upright stone';stone.position.set(x,.076+h/2,6.045);stone.rotation.z=(j-1)*.035;stone.castShadow=stone.receiveShadow=true;g.add(stone);
    if(j!==1)for(const dx of [-.027,0,.027])b('Entrance niche faded red pigment',x+dx,.194,6.083,.008,.065,.002,'red');
  }
  const offeringCup=new THREE.Mesh(new THREE.LatheGeometry([[.014,0],[.028,.006],[.034,.022],[.029,.025],[.020,.01]].map(p=>new THREE.Vector2(...p)),16),K.M.stone);
  offeringCup.name='Entrance niche small offering cup';offeringCup.position.set(-3.51,.076,6.08);g.add(offeringCup);
  // 2011 14.39.18 and 2013 17.53.12: an uninterrupted oxide ledge,
  // three descending treads, and the peach round support beside the niche.
  b('Pedestal ledge stair-side return',-3.98,.23,5.96,.29,.43,.16,nicheOxide,true);
  b('Pedestal ledge solid return',-3.00,.23,5.96,.25,.43,.16,nicheOxide,true);
  b('Pedestal ledge continuous dark coping',-3.50,.466,5.90,1.20,.032,.36,'stone');
  // User's fixed 175312 pose: shift the complete niche/stepped pedestal
  // east onto the entry ledge. The 2013 reference is pale, unlike 2011 aqua.
  // 175312 / 'house, after entering, turning 135 degrees 2/3': the niche is set into the plinth face
  // and the stand sits directly on the platform edge, not on a raised box (lift .02, not a storey).
  const pedLift=.02;
  // 'turning 135 degrees 2/3' and the user's game note: one plain platform face runs along the pocket
  // edge with the niche cut into it; the stand sits on the platform top at that edge.
  for(const o of g.children.slice(pedestalStart.children)){const stand=o.name==='Entrance three-tier pale pedestal';o.position.x+=.5;o.position.y+=pedLift+(stand?.325:0);o.position.z-=stand?1.36:1.29;}
  for(const c of K.colliders.slice(pedestalStart.colliders)){c.minX+=.5;c.maxX+=.5;c.bottom+=pedLift;c.top+=pedLift+.325;c.minZ-=1.36;c.maxZ-=1.29;}
  b('Entrance right pocket south riser',hallX,(F+.075)/2,4.085,.035,F-.075,3.83,nicheOxide);
  const peachColumn=K.M.plaster.clone();peachColumn.color.set('#d4a787');
  K.cylinder(g,'Entrance court peach round column',-4.6,2.01,4.3,.125,.145,2.78,peachColumn,20,true);
  K.cylinder(g,'Entrance court round column oxide foot',-4.6,.535,4.3,.151,.166,.17,verandaRed,20,true);
  K.cylinder(g,'Entrance court round column base rim',-4.6,.469,4.3,.178,.178,.038,verandaRed,20);
  // 14.44.43: closely spaced blue boards between rough outer stone supports.
  const courtBlue=K.M.plaster.clone();courtBlue.color.set('#6a94b5'); // 14.31.14 / 14.31.01 / 14.30.57: weathered blue paint, red about half of blue; the kit blue rendered with no red at all
  const railPlinth=K.M.plaster.clone();railPlinth.color.set('#5e4636');railPlinth.roughness=1;
  function stairSideFence(a,end,x=-8.35){
    b('Stair-side railing continuous masonry plinth',x,(F+.035)/2,(a+end)/2,.46,F-.035,end-a,railPlinth); // 14.30.57: dark laterite, not white stone
    for(const y of [F+.10,F+.63,F+1.16])b('Stair-side blue railing cross rail',x,y,(a+end)/2,.11,.105,end-a,courtBlue);
    for(let z=a+.08;z<end-.03;z+=.085)b('Stair-side close-spaced blue railing board',x,F+.63,z,.068,1.10,.04,courtBlue); // 14.31.14: slim, close pickets
    for(let z=a;z<=end+.01;z+=.87)b('Stair-side railing square upright',x,F+.66,z,.115,1.32,.115,courtBlue);
    K.blocker(x,(a+end)/2,.12,end-a,F,F+1.22);
  }
  stairSideFence(6.15,10.0);stairSideFence(11.65,14.5);
  // User-identified 14.33.49: a short ladder is stored on its side
  // against the courtyard face of the blue grille, below the clothesline.
  const ladderWood=verandaTimber.clone();ladderWood.color.set('#bc9c7d');
  for(const [x,y] of [[-8.18,.50],[-8.24,1.04]])
    K.beam(g,'Courtyard stored ladder long rail',[x,y,6.72],[x,y,9.52],.065,ladderWood,.085);
  for(let i=0;i<8;i++){
    const z=6.86+i*.36;
    K.beam(g,'Courtyard stored ladder rung',[-8.18,.50,z],[-8.24,1.04,z],.048,ladderWood,.050);
  }

  // Speckled granite with lichen blotches for the court's split stone posts (no masonry joints: each is a monolith).
  const graniteMap=(()=>{let n=90217;const r=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
    return paintedMap(256,(c,s)=>{c.fillStyle='#b9b5b3';c.fillRect(0,0,s,s);
      for(let i=0;i<1100;i++){const v=r();c.fillStyle=v<.45?`rgba(58,56,54,${.12+r()*.28})`:v<.8?`rgba(238,234,228,${.10+r()*.2})`:`rgba(122,112,98,${.15+r()*.2})`;c.beginPath();c.arc(r()*s,r()*s,.6+r()*2.2,0,7);c.fill();}
      for(let i=0;i<30;i++){const x=r()*s,y=r()*s,q=8+r()*24,gr=c.createRadialGradient(x,y,0,x,y,q);gr.addColorStop(0,`rgba(66,70,60,${.12+r()*.2})`);gr.addColorStop(1,'rgba(66,70,60,0)');c.fillStyle=gr;c.fillRect(x-q,y-q,2*q,2*q);}
    },4);})();
  const courtSupport=new THREE.MeshStandardMaterial({map:graniteMap,color:'#756d6d',roughness:1}); // 14.30.57 / 14.44.14 / 14.31.14: dark weathered granite, neutral not olive
  // 14.31.01 / 14.44.09 / 14.44.43: the east veranda edge matches the west one.
  for(const [sx,z] of [[-8.28,6.19],[-8.28,9.86],[-8.28,14.42],[7.18,6.19],[7.18,9.86],[7.18,14.42]]){
    const sd=sx<0?1:-1;
    b('Courtyard rough stone outer support',sx,1.84,z,.24,3.55,.26,courtSupport,true);
    b('Courtyard outer support beam pad',sx,3.61,z,.36,.14,.34,courtSupport);
    // Irregular shallow chips break the smooth pillar silhouette.
    for(let j=0;j<15;j++){
      const chip=b('Courtyard support weathered edge',sx+sd*.133,.18+j*.22,z+Math.sin(j*2.8)*.09,.016,.045+(j%3)*.019,.042,courtSupport);
      chip.rotation.x=Math.sin(j)*.3;
    }
  }
  stairSideFence(6.35,9.3,7.3);
  // User's 14.31.14 note: the blue railing runs on along the whole east veranda edge,
  // with no wall and no opening into the courtyard.
  stairSideFence(9.3,14.28,7.3);
  // 14.46.04 / 14.48.07 / 14.52.16: the rear veranda is screened by some fifteen thin, bleached, uneven
  // slats stacked to about 1.3 m on pole uprights 1.5 m apart, standing on a dark, moss-blackened plinth
  // (user's 14.48.07 note: 'No white steps'). The screen is unbroken, with no opening into the courtyard.
  {const slatWood=new THREE.MeshStandardMaterial({color:'#8a7870',roughness:.95}),slatDark=new THREE.MeshStandardMaterial({color:'#6e625c',roughness:.95}); // 14.46.04: about 126,109,104 in the light
   const plinthDark=new THREE.MeshStandardMaterial({color:'#3d4136',roughness:1}),plinthMoss=new THREE.MeshStandardMaterial({color:'#56682f',roughness:1});
   for(const [a,end] of [[-8.3,7.3]]) {
    for(let row=0;row<15;row++) {
      const board=b('Courtyard weathered horizontal timber board',(a+end)/2,F+.07+row*.087,14.55+.014*Math.sin(row*1.7),end-a,.080+.007*((row*7)%3),.035,row%4===2?slatDark:slatWood); // overlapping, as stacked
      board.rotation.z=.003*Math.sin(row*2.1);
    }
    for(let x=a+.12;x<end;x+=1.5)b('Courtyard board fence upright',x,F+.66,14.50,.07,1.38,.07,slatDark);
    K.blocker((a+end)/2,14.55,end-a,.12,F,F+1.33);
    b('Rear veranda mossy plinth face',(a+end)/2,.26,14.485,end-a,.45,.03,plinthDark);
    b('Rear veranda plinth moss foot',(a+end)/2,.075,14.465,end-a,.08,.012,plinthMoss);
   }}
  // 14.30.57 / 14.31.01: a neat stack of pale round logs, about 1.3 m long and a metre high, stands on the
  // rear veranda west of the east window, behind the court's stone supports.
  {const logWood=new THREE.MeshStandardMaterial({color:'#ad9a90',roughness:1});
   for(let row=0;row<8;row++)for(let k=0;k<4-row%2;k++){
     const len=1.30+.08*Math.sin(row*2.3+k*1.7),log=K.cylinder(g,'Rear veranda stacked log',3.7+.04*Math.cos(row*1.9+k),F+.075+row*.132,15.02+k*.155+(row%2)*.0775,.07+.006*((row+k)%2),.075,len,logWood,10);
     log.rotation.z=Math.PI/2;}
   K.blocker(3.7,15.25,1.45,.66,F,F+1.1);}
  // Court entry steps match every deliberate veranda opening.
  for(const [x,z,w,d] of [[-8.2,10.8,.75,1.55]]) { // the court-front walkway is at ground level now: no step there
    floor('Courtyard worn step',x,z,w,d,.21,'paleStone',.16);
  }

  for(const [x,top] of [[-3.30,.14],[-3.60,.28],[-3.90,F]]){
    floor('Pedestal-side red courtyard stair',x,5.2,.30,1.55,top,verandaRed,.14);
    b('Pedestal-side worn stair nosing',x+.142,top-.016,5.2,.032,.032,1.55,nicheOxide);
  }

  // Ground floor enclosing walls. All rooms have usable openings.
  wallZ('West exterior wall',-11.88,1.95,17.85,F,3.02,[{c:8.4,w:1.6,bottom:1.05,top:2.45},{c:15.1,w:1.4,bottom:1.05,top:2.4}]);
  wallZ('East exterior wall',11.88,.15,17.85,F,3.02,[{c:10.45,w:.95,top:2.3}],'plaster');
  // User's 14.31.14 / 14.31.25 notes: that door leads into a room on the clock side.
  // Its size is not photographed; a small store room is assumed.
  {const x0=12.0,x1=15.3,z0=8.6,z1=12.4,xm=(x0+x1)/2,zm=(z0+z1)/2,h=3.02;
   wallZ('Clock-side room outer wall',x1,z0,z1,F,h,[{c:10.5,w:.9,bottom:1.1,top:2.1}],'plaster');
   for(const z of [z0,z1])wallX('Clock-side room end wall',x0-.12,x1+.12,z,F,h,[],'plaster');
   floor('Clock-side room floor',xm,zm,x1-x0,z1-z0,F,'red',.2);
   b('Clock-side room ceiling boards',xm,F+h-.02,zm,x1-x0,.04,z1-z0,'wood');
   K.hipRoof(g,'Clock-side room tiled roof',xm,zm,x1-x0+.9,z1-z0+.9,F+h,.9);
   for(const z of [9.905,10.995])b('Clock-side room door dark timber jamb',11.72,F+1.15,z,.1,2.3,.09,'wood');
   b('Clock-side room door dark timber head',11.72,F+2.34,10.45,.1,.1,1.18,'wood');
   const leaf=b('Clock-side room open door leaf',12.3,F+1.12,10.0,.9,2.22,.05,'wood');leaf.rotation.y=-.35;
   for(const [z,y] of [[9.0,1.2],[11.9,1.6]])b('Clock-side room storage shelf',14.95,F+y,z,.5,.05,1.2,'wood');}
  // 14.44.22: the back veranda wall is pale plaster to the floor, with no red dado.
  skirting=false;
  wallX('Rear exterior',-11.88,11.88,17.88,F,3.0,[{c:0,w:1.9,top:2.5},{c:-5.6,w:1.65,bottom:1.0,top:2.4},{c:5.7,w:1.1,bottom:.8,top:2.1}],rearWash);
  skirting=true;
  doorX(0,17.86,1.9,F,2.5,-1);
  grilleX(-5.6,17.73,1.65,F+1,1.4);
  grilleZ(-11.7,8.4);grilleZ(-11.7,15.1,1.4);
  // Two shallow front rooms, either side of the central through-entrance.
  // IMG_20130720_175306: the doorway is substantially narrower than the
  // lower entry passage. Its leaves must not project across the sitting bays.
  const mainDoorWidth=1.20,mainJambInset=(2.05-mainDoorWidth)/2;
  wallX('Front room facade',-11.8,9.05,2.05,F,3.1,[{c:-7.9,w:1.7,bottom:.9,top:2.4},{c:-3.0,w:1.30,bottom:.70,top:2.4},{c:0,w:mainDoorWidth,top:2.7},{c:2.5,w:1.90,bottom:.795,top:2.95}],verandaAqua);
  // User's note: no doorway at the facade's right end (x 7); that front room opens only inward.
  // 14.56.56 (plain wall with a poster for over 0.9 m between the frame and the end wall) and
  // veranda-left-passage.jpg (the chair by the end wall has plain wall behind it): the window stands
  // half a metre nearer the door than first modelled, centred x 2.5.
  // 14.56.56 / 14.57.08: only the +x sitting-bay window has this rounded,
  // splayed plaster recess. Cut the facade rather than laying trim over it.
  {const cx=2.5,front=1.925,back=2.105,bottom=1.245,shoulder=3.13,rise=.23,half=.95; // 14.56.56 / 14.57.08: the recess and frame stand on the red skirting's top line
    const outer=[],inner=[];
    for(let i=0;i<=24;i++){const a=i/24*Math.PI;outer.push([cx+half*Math.cos(a),shoulder+rise*Math.sin(a)]);inner.push([cx+(half-.08)*Math.cos(a),shoulder-.08+(rise-.015)*Math.sin(a)]);}
    const cap=new THREE.Shape();cap.moveTo(cx-half,3.40);cap.lineTo(cx+half,3.40);
    for(const [x,y] of outer)cap.lineTo(x,y);cap.closePath();
    const head=new THREE.Mesh(new THREE.ExtrudeGeometry(cap,{depth:.25,bevelEnabled:false}),verandaAqua);head.name='Sitting window rounded plaster head';head.position.z=front;head.castShadow=head.receiveShadow=true;g.add(head);
    const points=[],quad=(a,b,c,d)=>points.push(...a,...b,...c,...a,...c,...d);
    for(let i=0;i<outer.length-1;i++)quad([...outer[i],front],[...outer[i+1],front],[...inner[i+1],back],[...inner[i],back]);
    for(const s of [-1,1])quad([cx+s*half,bottom,front],[cx+s*half,shoulder,front],[cx+s*(half-.08),shoulder-.08,back],[cx+s*(half-.08),bottom,back]);
    quad([cx-half,bottom,front],[cx+half,bottom,front],[cx+half-.08,bottom,back],[cx-half+.08,bottom,back]);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.computeVertexNormals();
    const plaster=verandaAqua.clone();plaster.side=THREE.DoubleSide;
    const reveal=new THREE.Mesh(geo,plaster);reveal.name='Sitting window splayed plaster reveal';reveal.castShadow=reveal.receiveShadow=true;g.add(reveal);
    const surround=new THREE.Shape();surround.moveTo(cx-half+.08,bottom);surround.lineTo(cx+half-.08,bottom);for(const [x,y] of inner)surround.lineTo(x,y);surround.closePath();
    // The plaster backing stops outside the whole timber frame: cutting only
    // the grille aperture masks the recessed outer mouldings from oblique views.
    const opening=new THREE.Path();opening.moveTo(cx-.79,1.25);opening.lineTo(cx-.79,3.048);opening.lineTo(cx+.79,3.048);opening.lineTo(cx+.79,1.25);opening.closePath();surround.holes.push(opening);
    const face=new THREE.Mesh(new THREE.ShapeGeometry(surround),plaster);face.name='Sitting window recessed plaster backing';face.position.z=back;face.receiveShadow=true;g.add(face);
    b('Sitting window oxide sill surface',cx,bottom+.003,(front+back)/2,1.90,.012,back-front,verandaRed);
    K.blocker(cx,2.08,1.90,.31,F,3.4);
  }
  doorX(0,2.03,mainDoorWidth,F,2.7,1);
  grilleX(-7.9,1.90,1.7,F+.9,1.5);
  const entranceOchre=new THREE.MeshStandardMaterial({color:0x988258,roughness:.98});
  // 14.56.56 / 14.57.08: warm worn ochre and rounded blue mouldings on
  // the sitting window. Procedural paint keeps the private photos out of assets.
  const sittingOchre=new THREE.MeshStandardMaterial({roughness:.91,map:paintedMap(256,(c,n)=>{
    c.fillStyle='#b57c4c';c.fillRect(0,0,n,n);
    for(let i=0;i<140;i++){const x=(i*83)%n,y=(i*149)%n;c.strokeStyle=i%3?'#6b49341b':'#e4b07630';c.lineWidth=.7;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.sin(i)*2,y+20+i%90);c.stroke();}
    for(let i=0;i<20;i++){c.fillStyle='#543a2b24';c.fillRect((i*71)%n,(i*47)%n,1+i%3,5+i%13);}
  },1)});
  const sittingBlue=new THREE.MeshStandardMaterial({roughness:.78,map:paintedMap(256,(c,n)=>{
    c.fillStyle='#438398';c.fillRect(0,0,n,n);
    for(let i=0;i<95;i++){c.strokeStyle=i%3?'#153e491a':'#bdd0c827';c.lineWidth=.6;c.beginPath();const x=(i*73)%n,y=(i*137)%n;c.moveTo(x,y);c.lineTo(x+1,y+25+i%65);c.stroke();}
    for(let i=0;i<26;i++){c.fillStyle='#ab79544a';c.fillRect((i*97)%n,(i*113)%n,1+i%3,2+i%8);}
  },1)});
  const verandaIron=new THREE.MeshStandardMaterial({color:0x96968e,roughness:.86});
  const verandaShutter=new THREE.MeshStandardMaterial({color:'#94584a',bumpMap:timberMap,bumpScale:.002,roughness:.98});
  const windowIron=new THREE.MeshStandardMaterial({color:'#555852',roughness:.94});
  for(const side of [-1,1]) {
    const x=side>0?2.5:-3.0;
    const windowStart=g.children.length;
    // 14.56.56 / 14.57.08: the sitting window's frame is squarer (about 0.88 wide to 1 high), standing on the
    // skirting's top line (y 1.245) with its head close under the arch.
    const wy=side>0?2.145:2.0,wh=side>0?1.80:1.94;
    for(const dx of [-.725,.725])b('Veranda window ochre side reveal',x+dx,wy,2.025,.13,wh,.22,side>0?sittingOchre:entranceOchre);
    for(const y of [wy-wh/2+.065,wy+wh/2-.065])b('Veranda window ochre horizontal reveal',x,y,2.025,1.58,.13,.22,side>0?sittingOchre:entranceOchre);
    b('Veranda window dark interior',x,wy,2.10,1.29,wh-.25,.05,verandaShutter); // closed shutters on both windows: a black slab read as a hole from inside
    if(side>0){
      // 14.56.56 / 14.57.08 / 14.57.13: closed red-brown shutters
      // behind a dense grille, with stepped blue mouldings and a grey crossrail.
      for(let layer=0;layer<3;layer++){
        const w=1.12+layer*.073,h=wh-.33+layer*.073,z=2.01-layer*.030;
        const ring=new THREE.Shape(),hole=new THREE.Path();
        ring.moveTo(-w/2-.0275,-h/2-.0275);ring.lineTo(w/2+.0275,-h/2-.0275);ring.lineTo(w/2+.0275,h/2+.0275);ring.lineTo(-w/2-.0275,h/2+.0275);ring.closePath();
        hole.moveTo(-w/2+.0275,-h/2+.0275);hole.lineTo(-w/2+.0275,h/2-.0275);hole.lineTo(w/2-.0275,h/2-.0275);hole.lineTo(w/2-.0275,-h/2+.0275);hole.closePath();ring.holes.push(hole);
        const moulding=new THREE.Mesh(new THREE.ExtrudeGeometry(ring,{depth:.035,bevelEnabled:true,bevelThickness:.010,bevelSize:.009,bevelSegments:3,steps:1}),sittingBlue);
        moulding.name='Veranda window rounded blue moulding';moulding.position.set(x,wy,z-.020);moulding.castShadow=moulding.receiveShadow=true;g.add(moulding);
      }
      b('Veranda window grey middle crossrail',x,wy-.01,1.985,1.13,.065,.045,verandaIron);
      for(let i=0;i<16;i++)b('Veranda window dark iron grille',x-.525+i*.07,wy,2.023,.014,wh-.40,.018,windowIron);
      for(const dx of [-.39,-.195,0,.195,.39])
        b('Veranda window closed shutter board joint',x+dx,wy,2.072,.009,wh-.40,.009,verandaTimber);
    }else{
      for(const dx of [-.595,.595])b('Veranda blue window jamb',x+dx,2.0,2.02,.10,1.69,.10,'blue');
      for(const y of [1.20,1.99,2.80])b('Veranda blue window rail',x,y,2.02,1.25,.09,.10,'blue');
      for(let dx=-.48;dx<.5;dx+=.098)b('Veranda slender iron window bar',x+dx,2.0,2.02,.020,1.55,.025,verandaIron);
    }
    if(side>0)for(const part of g.children.slice(windowStart))part.position.z+=.18;
    // The sitting bays end at transverse walls; the lower outer strip continues.
    b(side>0?'Left sitting bay turquoise end wall':'Right sitting bay turquoise end wall',side*4.30,2.08,.99,.20,2.98,2.12,verandaAqua,true); // veranda.jpg: the end wall reaches the platform edge
    b('Sitting bay end red skirting',side*4.188,1.00,.99,.026,.49,2.12,verandaRed);
    if(side>0){
      b('Sitting bay wall red skirting',2.745,1.00,1.907,2.99,.49,.024,verandaRed); // runs on under the window
    }else b('Sitting bay wall red skirting',side*2.745,1.00,1.907,2.99,.49,.024,verandaRed);
    b('Sitting bay back corner timber',side*4.12,2.08,1.91,.13,2.96,.14,verandaTimber);
  }
  // 14.56.22 / 14.56.30 / 14.56.56 / 14.57.08: a thin old cable hangs
  // from above the sitting window and loops down across its upper grille.
  // Keep the wire in front of the recessed frame; its exact attachment is hidden.
  {const curve=new THREE.CatmullRomCurve3([
    [3.10,3.57,1.90],[2.98,3.04,2.04],[2.80,2.60,2.05],
    [2.54,2.42,2.05],[2.28,2.52,2.05],[2.11,2.80,2.13]
  ].map(p=>new THREE.Vector3(...p)));
   const cable=new THREE.Mesh(new THREE.TubeGeometry(curve,64,.0028,5,false),new THREE.MeshStandardMaterial({name:'Sitting window faded red wire',color:'#a66c70',roughness:.95}));
   cable.name='Sitting window hanging wire';g.add(cable);}
  // Layered main-door jambs sit at the threshold, with the leaves open inward.
  for(const s of [-1,1]) {
    for(let j=0;j<4;j++)b('Main door carved nested jamb',s*(1.08-mainJambInset+j*.067),1.84,1.95-j*.039,.055,2.78+j*.09,.10,verandaTimber);
    b('Main door broad worn pilaster',s*(1.32-mainJambInset),1.83,1.85,.17,2.85,.18,verandaTimber);
    for(const y of [.62,.69,.78,3.01,3.10])b('Main door jamb moulding',s*(1.31-mainJambInset),y,1.84,.26,.045,.24,verandaTimber);
  }
  // veranda-right.jpg: the whole door reveal is dark timber, through the wall's depth.
  for(const s2 of [-1,1])b('Main door timber reveal',s2*.596,(F+3.15)/2,2.085,.012,3.15-F,.37,verandaTimber);
  b('Main door timber reveal head',0,3.144,2.085,1.2,.012,.37,verandaTimber);
  b('Main door deep carved lintel',0,3.27,1.90,2.88-2*mainJambInset,.24,.29,verandaTimber);
  for(let j=0;j<3;j++)b('Main door lintel layered rim',0,3.38+j*.075,1.88,3.04-2*mainJambInset-j*.12,.06,.31,verandaTimber);
  const doorBoss=K.cylinder(g,'Main door central carved boss',0,3.27,1.723,.092,.108,.065,verandaTimber,12);doorBoss.rotation.x=Math.PI/2;
  // IMG_20130720_175306, looking out: a sunken dark entry strip with
  // raised sitting platforms to either side, not a tall enclosed tunnel.
  // User-labelled 14.49.15/14.49.42: above the right front window,
  // facing out from inside. Reconstruct furnishings, leaving the family portrait out.
  const cabinetWood=verandaTimber.clone();cabinetWood.color.set('#aa7960');
  const cabinetDark=new THREE.MeshStandardMaterial({color:'#423b2e',roughness:1});
  const cabinetBrass=new THREE.MeshStandardMaterial({color:'#9b8564',roughness:.72,metalness:.35});
  // 'house above the right front window, from inside, facing out 2.jpg': a squarish two-leaf timber shutter
  // directly under the hung radio shelf. A dark timber casing wraps the outer window's reveals, which stand
  // into the room, so no ochre frame or red-brown slab shows inside; the wall opening beside it is lined flush.
  for(const x of [2.18,2.82]){
    b('Right front window closed timber shutter',x,1.90,2.35,.625,1.05,.07,cabinetWood);
    for(const dx of [-.258,.258])b('Right front shutter raised stile',x+dx,1.90,2.395,.046,1.05,.025,cabinetWood);
    for(const y of [1.42,1.90,2.38])b('Right front shutter crossrail',x,y,2.395,.60,.053,.025,cabinetWood);
  }
  b('Right front shutter meeting stile',2.5,1.90,2.395,.05,1.05,.025,cabinetWood);
  b('Right front window interior timber lintel',2.5,2.45,2.38,1.47,.13,.15,cabinetWood);
  for(const s of [-1,1]){
    b('Right front window timber casing side',2.5+s*.815,2.145,2.2575,.03,1.87,.175,cabinetWood);
    b('Right front window timber casing stile',2.5+s*.73,1.9225,2.33,.20,1.095,.03,cabinetWood);
    b('Right front window opening turquoise lining',2.5+s*.89,2.12,2.164,.12,1.76,.012,verandaAqua);
  }
  for(const y of [1.225,3.065])b('Right front window timber casing end',2.5,y,2.2575,1.66,.03,.175,cabinetWood);
  b('Right front window timber casing upper panel',2.5,2.775,2.33,1.66,.61,.03,cabinetWood);
  b('Right front window timber casing apron',2.5,1.2925,2.33,1.66,.165,.03,cabinetWood);
  // Tour-frame sweep: the other sitting window showed inside as a blank red-brown slab. Give it the same
  // closed two-leaf timber shutter in a plain frame, flush in the wall.
  for(const x of [-3.325,-2.675]){
    b('Left front window closed timber shutter',x,2.0,2.15,.645,1.69,.04,cabinetWood);
    for(const dx of [-.27,.27])b('Left front shutter raised stile',x+dx,2.0,2.18,.05,1.66,.02,cabinetWood);
    for(const y of [1.22,2.0,2.78])b('Left front shutter crossrail',x,y,2.18,.59,.055,.02,cabinetWood);
  }
  for(const s of [-1,1])b('Left front window timber frame',-3+s*.69,2.0,2.185,.09,1.87,.03,cabinetWood);
  for(const y of [1.11,2.89])b('Left front window timber frame',-3,y,2.185,1.47,.09,.03,cabinetWood);
  const cabinet=new THREE.Group();cabinet.name='Right front window suspended timber cabinet';g.add(cabinet);
  // Same photo: not a built cabinet but an old radio on a shelf hung from the ceiling by two iron straps,
  // right above the shutter: a timber box with two dark cloth panels either side of a plain centre and a
  // rail of three knobs, a small pale wooden hut at the left end, a pile of books at the right, and an
  // orange print propped against its front. (The family portrait above it stays out.)
  {const strapIron=new THREE.MeshStandardMaterial({color:'#4a4038',roughness:.9}),hutWood=new THREE.MeshStandardMaterial({color:'#9c8160',roughness:.95}),S=2.52;
   K.box(cabinet,'Radio hanging shelf',3,S,2.36,1.45,.05,.36,cabinetWood);
   for(const s of [-1,1])K.box(cabinet,'Radio shelf iron strap',3+s*.66,(S+3.5)/2,2.50,.03,3.5-S,.006,strapIron);
   K.box(cabinet,'Radio timber body',3.02,S+.225,2.34,.70,.40,.30,cabinetWood);
   K.box(cabinet,'Radio timber top',3.02,S+.44,2.34,.74,.03,.32,cabinetWood);
   for(const s of [-1,1])K.box(cabinet,'Radio dark cloth panel',3.02+s*.235,S+.29,2.492,.18,.16,.006,cabinetDark);
   K.box(cabinet,'Radio drawer rail',3.02,S+.10,2.494,.62,.05,.01,cabinetDark);
   for(const dx of [-.2,0,.2]){const knob=K.cylinder(cabinet,'Radio round brass knob',3.02+dx,S+.10,2.508,.02,.024,.03,cabinetBrass,12);knob.rotation.x=Math.PI/2;}
   K.box(cabinet,'Radio shelf pale wooden hut',2.47,S+.125,2.36,.22,.20,.26,hutWood);
   for(const s of [-1,1]){const roof=K.box(cabinet,'Radio shelf hut roof board',2.47+s*.062,S+.265,2.36,.17,.02,.30,hutWood);roof.rotation.z=-s*.62;}
   for(let j=0;j<6;j++){
    const bookMat=new THREE.MeshStandardMaterial({color:['#8a7964','#a2987d','#b2a68c'][j%3],roughness:1});
    K.box(cabinet,'Radio shelf stacked book pages',3.56+(j%2)*.012,S+.045+j*.047,2.35,.20+(j%3)*.012,.037,.26,bookMat);
    K.box(cabinet,'Radio shelf worn book cover',3.56+(j%2)*.012,S+.068+j*.047,2.35,.22+(j%3)*.012,.008,.28,cabinetWood);
   }
   if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=128;c.height=112;const p=c.getContext('2d');
    const sky=p.createLinearGradient(0,0,0,112);sky.addColorStop(0,'#b5482a');sky.addColorStop(.45,'#e08a34');sky.addColorStop(.62,'#f0c060');sky.addColorStop(.66,'#5a2c22');sky.addColorStop(1,'#2e1a18');
    p.fillStyle=sky;p.fillRect(0,0,128,112);p.fillStyle='#f6dc8a';p.beginPath();p.arc(64,62,11,0,Math.PI*2);p.fill();p.fillStyle='#3a2019';p.fillRect(0,70,128,6);
    const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
    const print=new THREE.Mesh(new THREE.PlaneGeometry(.30,.26),new THREE.MeshStandardMaterial({map,roughness:.9}));print.name='Radio shelf propped orange print';
    print.position.set(3.05,S+.16,2.515);print.rotation.x=-.16;cabinet.add(print);
    const back=K.box(cabinet,'Radio shelf orange print card back',3.05,S+.16,2.509,.30,.26,.006,cabinetDark);back.rotation.x=-.16;}}
  cabinet.position.x=-.5;cabinet.position.z=.19; // centred on the window (x 2.5); the shelf hangs in front of the casing: nothing of it may reach the outer window in the wall's depth
  // Wall calendars are redrawn, with no source photo or personal content embedded.
  function wallCalendar(x,y,w,h){
    const c=document.createElement('canvas');c.width=256;c.height=384;const p=c.getContext('2d');
    p.fillStyle='#deddd1';p.fillRect(0,0,256,384);p.strokeStyle='#ad8088';p.lineWidth=4;p.strokeRect(5,5,246,374);
    p.fillStyle='#657c91';p.fillRect(12,12,232,52);p.fillStyle='#eee8d9';p.textAlign='center';p.font='20px serif';p.fillText('2011',128,47);
    p.fillStyle='#695d56';p.font='16px serif';p.fillText('SEPTEMBER',128,90);
    for(let row=0;row<5;row++)for(let col=0;col<7;col++){
      const day=row*7+col-3;if(day<1||day>30)continue;p.fillStyle=col===0?'#a36569':'#58616a';p.font='18px serif';p.fillText(String(day),22+col*35,138+row*43);
    }
    const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
    const sheet=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,roughness:1}));sheet.name='Right front wall 2011 paper calendar';sheet.position.set(x,y,2.205);g.add(sheet);
  }
  wallCalendar(1.33,1.98,.40,.64);wallCalendar(3.66,2.13,.40,.70);
  {const plaqueRed=new THREE.MeshStandardMaterial({color:'#7c2a26',roughness:.8});
   b('Right front wall red-framed plaque frame',1.08,2.58,2.18,.34,.40,.02,plaqueRed);
   const draw=(w,h,paint)=>{const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'));const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map,roughness:1});};
   const plaque=new THREE.Mesh(new THREE.PlaneGeometry(.25,.31),draw(100,124,p=>{p.fillStyle='#d8cdb4';p.fillRect(0,0,100,124);p.strokeStyle='#b89a52';p.lineWidth=3;p.strokeRect(6,6,88,112);
     p.fillStyle='#c2a046';p.beginPath();p.ellipse(50,66,22,30,0,0,Math.PI*2);p.fill();p.fillStyle='#e6d9b0';p.beginPath();p.ellipse(50,66,13,20,0,0,Math.PI*2);p.fill();p.fillStyle='#b89a52';p.fillRect(30,20,40,6);}));
   plaque.name='Right front wall red-framed plaque';plaque.position.set(1.08,2.58,2.1915);g.add(plaque);
   const scenic=new THREE.Mesh(new THREE.PlaneGeometry(.34,.62),draw(136,248,p=>{p.fillStyle='#e4e0d2';p.fillRect(0,0,136,248);
     const sky=p.createLinearGradient(0,6,0,120);sky.addColorStop(0,'#5d86a8');sky.addColorStop(1,'#b9cdd6');p.fillStyle=sky;p.fillRect(6,6,124,118);
     p.fillStyle='#e9eef0';p.beginPath();p.moveTo(6,92);p.lineTo(44,40);p.lineTo(70,74);p.lineTo(96,30);p.lineTo(130,88);p.lineTo(130,124);p.lineTo(6,124);p.fill();
     p.fillStyle='#3f5d4a';p.fillRect(6,104,124,20);p.fillStyle='#8b3f3f';p.fillRect(6,130,124,16);
     p.fillStyle='#5b6068';for(let r=0;r<5;r++)for(let k=0;k<7;k++)p.fillRect(12+k*17,156+r*17,9,7);}));
   scenic.name='Right front wall landscape calendar';scenic.position.set(4.10,2.50,2.205);g.add(scenic);}
  // IMG_20130720_175306: the lower entrance strip is dark, worn stone,
  // with broad polished patches rather than the tiled veranda surface.
  const entryCanvas=document.createElement('canvas');entryCanvas.width=entryCanvas.height=256;
  const entryPaint=entryCanvas.getContext('2d');entryPaint.fillStyle='#373b3a';entryPaint.fillRect(0,0,256,256);
  for(let i=0;i<170;i++){
    const x=(i*97)%256,y=(i*157)%256,r=9+i%29;
    for(const dx of [-256,0,256])for(const dy of [-256,0,256]){
      const patch=entryPaint.createRadialGradient(x+dx,y+dy,0,x+dx,y+dy,r);
      patch.addColorStop(0,i%3?'#a6afad16':'#10191b20');patch.addColorStop(1,'#747e7a00');
      entryPaint.fillStyle=patch;entryPaint.fillRect(x+dx-r,y+dy-r,r*2,r*2);
    }
  }
  const entryMap=new THREE.CanvasTexture(entryCanvas);entryMap.colorSpace=THREE.SRGBColorSpace;
  entryMap.wrapS=entryMap.wrapT=THREE.RepeatWrapping;entryMap.repeat.set(.48,.48);
  const innerEntryStone=new THREE.MeshStandardMaterial({map:entryMap,roughness:.48});
  floor('Inner entrance dark worn walking strip',0,3.38,2.44,2.66,EL+.006,innerEntryStone,.08);
  for(const s of [-1,1])b('Inner passage plinth face',s*1.235,(EL+F)/2,3.38,.03,F-EL,2.66,riserGrey);
  // User's notes (game, 2026-10-02): the court pocket and the lowered hall floor are the passage's smooth dark stone.
  for(const o of g.children)if(o.name==='Entrance right lower court pocket'||o.name==='Inner hall ground-level floor')o.material=innerEntryStone;
  b('Inner hall wall base',(3.81+hallX)/2,(EL+F)/2,2.185,hallX-3.81,F-EL,.03,riserGrey);
  floor('Inner hall stone step',hallX-.18,5.2,.36,.9,.26,'stone',.26-EL);
  const platformOxide=K.M.plaster.clone();platformOxide.color.set('#b08a85');platformOxide.roughness=1;
  const platformJoint=new THREE.MeshStandardMaterial({color:'#7a5f5b',roughness:1});
  for(const side of [-1,1]){
    // The platform runs to the court pocket's edge as one level (no lower ledge in front of it).
    floor('Inner entrance raised sitting platform',side*2.50,3.40,2.62,2.60,.79,verandaRed,.34);
    b('Inner entrance platform oxide riser',side*1.185,(F+.79)/2,3.40,.07,.79-F,2.60,verandaRed);
    b('Inner entrance platform dark coping',side*1.28,.808,3.40,.25,.038,2.60,innerEntryStone);
    b('Inner entrance platform dark coping',side*2.50,.808,4.63,2.66,.038,.18,innerEntryStone);
    // Pocket face: pink oxide scored in blocks; on the west side it is cut round the Naga niche.
    for(const [a,z,lo] of side<0?[[-3.81,-3.22,EL],[-3.22,-2.58,.31],[-2.58,-1.19,EL]]:[[1.19,3.81,EL]])
      b('Inner platform scored oxide face',(a+z)/2,(lo+.79)/2,4.715,z-a,.79-lo,.03,platformOxide);
    for(let x=1.34;x<3.8;x+=.30)if(side>0||x<2.55||x>3.25)b('Inner platform scored joint',side*x,.43,4.7315,.007,.71,.003,platformJoint);
    b('Inner platform scored joint',side*2.5,.47,4.7315,2.6,.007,.003,platformJoint);
    floor('Inner platform stone step',side*1.03,3.2,.36,.8,.43,'stone',.43-EL);
    if(side>0){ // the east end of this platform now stands over the lowered hall floor
      b('Inner platform scored oxide face',3.825,(EL+.79)/2,3.40,.03,.79-EL,2.66,platformOxide);
      for(let z=2.38;z<4.7;z+=.30)b('Inner platform scored joint',3.8415,.43,z,.003,.71,.007,platformJoint);
      b('Inner platform scored joint',3.8415,.47,3.40,.003,.007,2.6,platformJoint);
      b('Inner entrance platform dark coping',3.72,.808,3.40,.25,.038,2.60,innerEntryStone);
    }
    // Broad square foot, layered mouldings and a stout octagonal shaft.
    const postX=side*1.40,postZ=3.71;
    for(const [y,w,h] of [[.831,.66,.082],[.902,.59,.060],[.958,.53,.052],[1.006,.47,.044]])
      b('Inner entrance timber post stepped foot',postX,y,postZ,w,h,w,verandaTimber);
    const postProfile=[[.235,0],[.245,.035],[.225,.08],[.218,1.95],
      [.25,1.99],[.25,2.04],[.222,2.075],[.27,2.12],[.27,2.17],
      [.23,2.20],[.29,2.26],[.29,2.31],[.24,2.35]];
    const innerPost=new THREE.Mesh(new THREE.LatheGeometry(postProfile.map(([r,y])=>new THREE.Vector2(r,y)),8),verandaTimber);
    innerPost.name='Inner entrance stout octagonal timber post';innerPost.position.set(postX,1.02,postZ);
    innerPost.rotation.y=Math.PI/8;innerPost.castShadow=true;innerPost.receiveShadow=true;g.add(innerPost);
    b('Inner entrance timber post beam seat',postX,3.415,postZ,.59,.13,.59,verandaTimber);
    K.blocker(postX,postZ,.48,.48,.79,3.48);
    for(const y of [3.08,3.18,3.30])b('Inner entrance post capital moulding',side*1.40,y,3.71,.43,.06,.43,verandaTimber);
  }
  // User's notes: no leaves at the left doorway; the blue pier and door in front of the God
  // room are gone, so the opening runs on to x 6.325.
  // User's note ('left hand side when entering 2'): no wall stub in the middle either; the room runs
  // open to the stair-wing partition, so the opening now ends at x 9.05.
  // User's note ('turning 135 degrees 2'): the wall behind the peach pillar goes as well; the floor
  // runs on behind it into an open bay, so nothing is left of the inner front room wall.
  wallZ('Front stair wing partition',9.05,1.8,5.75,F,3.1,[{c:4.8,w:1.7,top:2.6}]);
  // User's note (game, east passage): the gap beside the partition showed the wing's roof; plain turquoise wall instead.
  wallX('East passage front end wall',9.05,11.76,5.66,F,3.1,[],'aqua',.12); // thin and forward: the 14.31.25 camera stands just behind it
  // The wing's rooms are not photographed: its doorway stays shut behind a plain timber door.
  b('Front room closed door to the wing',9.07,F+1.3,4.8,.07,2.6,1.7,verandaTimber);
  for(const z of [4.23,4.8,5.37])b('Front room wing door batten',9.02,F+1.3,z,.03,2.5,.07,'wood');
  // Photo review (front room views): a dark boarded timber ceiling on closely spaced joists.
  {const ceilDark=new THREE.MeshStandardMaterial({color:'#2b1f17',roughness:1});
   b('Front room dark timber ceiling',-1.375,3.615,3.1,20.85,.03,1.86,ceilDark);
   for(let x=-11.6;x<9;x+=.45)detail(x,3.56,3.1,.08,.12,1.86,ceilDark);
   detail(-1.375,3.53,2.26,20.85,.20,.15,ceilDark);
   // 'house above the right front window, from inside, facing out 2.jpg': above the turquoise plaster the
   // front wall is dark boarding up to the wall plate (the lowest board stops either side of the door head).
   for(const y of [3.22,3.365])detail(-1.375,y,2.185,20.85,.142,.03,ceilDark);
   for(const [a,e] of [[-11.8,-.62],[.62,9.05]])detail((a+e)/2,3.075,2.185,e-a,.142,.03,ceilDark);}
  // Kitchen is the southwest (plan bottom-left) room.
  wallX('Kitchen north partition',-11.8,-8.45,12.1,F,2.9,[{c:-10.05,w:1.55,top:2.45}]);
  doorX(-10.05,12.1,1.55);
  wallZ('Kitchen to rear veranda',-8.48,12.1,17.8,F,2.9,[{c:16.05,w:1.65,top:2.45}],rearWash);
  detail(-8.48,F+1.22,15.15,.36,2.45,.13,'wood');
  detail(-8.48,F+1.22,16.95,.36,2.45,.13,'wood');
  detail(-8.48,F+2.5,16.05,.38,.15,1.95,'wood');

  // 14.44.19 / 14.44.22: heavy octagonal courtyard posts, ringed capitals,
  // and stored household items along the stair-side veranda. Spacing inferred.
  const passageTimber=verandaTimber.clone();passageTimber.color.setRGB(.9,.94,.92);
  function courtyardPost(x,z){
    const profile=[[.23,0],[.25,.06],[.25,.12],[.205,.19],[.205,2.04],
      [.24,2.07],[.24,2.12],[.205,2.15],[.25,2.19],[.25,2.25],
      [.21,2.29],[.26,2.39],[.27,2.49],[.235,2.57],[.20,2.61],
      [.22,2.65],[.27,2.69],[.27,2.76],[.23,2.80],[.23,2.88]];
    const mesh=new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),8),passageTimber);
    mesh.material=verandaTimber; // 14.30.57 / 14.31.01: dark weathered timber
    mesh.name='Courtyard octagonal timber post with turned capital';mesh.rotation.y=Math.PI/8;
    mesh.position.set(x,F,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
    b('Courtyard post broad beam seat',x,F+2.94,z,.65,.12,.43,passageTimber);
    for(const side of [-1,1])for(const offset of [-.105,.105])
      b('Courtyard post recessed vertical groove',x+offset*.5,F+1.17,z+side*.186,.012,1.64,.012,'black'); // on the octagon's face, not floating off its corners
    K.blocker(x,z,.40,.40,F,F+2.88);
  }
  const passageFloor=K.M.cream.clone();passageFloor.color.set('#99958a');passageFloor.roughness=.94;
  floor('Stair-side veranda worn stone walking surface',-10.16,9.05,3.25,6.05,F+.006,passageFloor,.024);
  const drumMat=new THREE.MeshStandardMaterial({color:0xa71e40,roughness:.6});
  const drumProfile=[[0,0],[.235,0],[.267,.025],[.275,.10],[.268,.68],[.275,.75],
    [.289,.77],[.289,.794],[.263,.794],[.252,.76],[.251,.09],[0,.09]];
  const drum=new THREE.Mesh(new THREE.LatheGeometry(drumProfile.map(([r,y])=>new THREE.Vector2(r,y)),32),drumMat);
  drum.name='Stair-side veranda red plastic storage drum';drum.position.set(-8.99,F,7.15);drum.castShadow=true;drum.receiveShadow=true;g.add(drum);
  K.blocker(-8.99,7.15,.55,.55,F,F+.8);
  const ropeCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-8.56,2.65,7.8),new THREE.Vector3(-8.56,2.55,9.5),new THREE.Vector3(-8.56,2.67,11.2)]);
  const rope=new THREE.Mesh(new THREE.TubeGeometry(ropeCurve,20,.008,5,false),new THREE.MeshStandardMaterial({color:0x887961,roughness:1}));
  rope.name='Courtyard veranda sagging clothesline';g.add(rope);
  function hangingCloth(z,width,length,color){
    const geom=new THREE.PlaneGeometry(width,length,22,20),pos=geom.attributes.position;
    for(let i=0;i<pos.count;i++)pos.setZ(i,.034*Math.sin(pos.getX(i)*42)+.009*Math.sin(pos.getY(i)*17));
    geom.computeVertexNormals();
    const mesh=new THREE.Mesh(geom,new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide}));
    mesh.name='Courtyard veranda hanging cloth';mesh.rotation.y=Math.PI/2;mesh.position.set(-8.56,2.57-length/2,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
    return mesh;
  }
  hangingCloth(9.65,.66,1.70,0xdad9c9);
  hangingCloth(8.35,.53,1.14,0xa74355);
  hangingCloth(8.99,.45,1.48,0xc2ac7f);
  // Narrow green woven border on the long white towel.
  b('Hanging towel green border',-8.52,1.72,9.39,.008,1.69,.025,new THREE.MeshStandardMaterial({color:0x55734a,roughness:1}));
  for(const [x,z,sx,sy,sz,color] of [[-11.38,10.05,.35,.36,.43,0xc8c4ad],[-11.43,10.69,.32,.24,.39,0xd8d5c6],[-11.27,11.24,.31,.28,.36,0xb9a34d]]){
    const geom=new THREE.SphereGeometry(1,18,14),pos=geom.attributes.position;
    for(let i=0;i<pos.count;i++){
      const y=pos.getY(i),a=Math.atan2(pos.getZ(i),pos.getX(i));
      const pinch=1-.35*Math.max(0,y),fold=1+.07*Math.sin(a*9+y*8);
      pos.setXYZ(i,pos.getX(i)*pinch*fold,Math.max(-.77,y),pos.getZ(i)*pinch*fold);
    }
    geom.computeVertexNormals();const sack=new THREE.Mesh(geom,new THREE.MeshStandardMaterial({color,roughness:1}));
    sack.name='Veranda stored fabric sack';sack.scale.set(sx,sy,sz);sack.position.set(x,F+sy*.77,z);sack.castShadow=true;sack.receiveShadow=true;g.add(sack);
  }

  // Posts and exposed timber run continuously around the inner verandas.
  for(const x of [-6.4,-3.8,-1.55,1.55,5.6,8.7]) {
    K.column(g,'Front veranda slender outer column',x,-.88,F,2.45,.145,verandaTimber);
    for(let j=0;j<10;j++){
      const a=j*Math.PI/5;
      K.beam(g,'Outer column fine fluting',[x+Math.sin(a)*.138,.75,-.88+Math.cos(a)*.138],[x+Math.sin(a)*.116,2.35,-.88+Math.cos(a)*.116],.012,verandaTimber);
    }
  }
  // Square bases transition into long octagonal necks and bulbous ring capitals.
  // 14.56.07 / 14.56.22 / 14.56.30: the ringed capital is no wider than the square shaft under it.
  const capitalProfile=[[.15,0],[.165,.05],[.175,.075],[.15,.11],[.165,.15],[.185,.19],[.168,.23],[.195,.28],[.20,.33],[.178,.38],[.20,.43],[.205,.49],[.185,.54],[.205,.60],[.195,.67],[.16,.73],[.18,.78],[.195,.83],[.165,.90]];
  const postPad=new THREE.MeshStandardMaterial({color:'#a08678',roughness:.95});
  for(const x of [-4.02,-1.65,1.65,4.02]) {
    b('Entrance seating post stone foot',x,.77,.36,.44,.04,.44,postPad); // a thin worn pad on the red floor, behind the stone edge
    b('Entrance seating square timber shaft',x,1.50,.36,.42,1.35,.42,verandaTimber,true);
    b('Entrance seating narrow square neck',x,2.24,.36,.30,.25,.30,verandaTimber);
    const cap=new THREE.Mesh(new THREE.LatheGeometry(capitalProfile.map(([r,y])=>new THREE.Vector2(r,y)),8),verandaTimber);
    cap.name='Entrance post sculpted octagonal capital';cap.position.set(x,2.37,.36);cap.rotation.y=Math.PI/8;cap.castShadow=true;cap.receiveShadow=true;g.add(cap);
    b('Entrance seating post capital',x,3.35,.36,.64,.17,.55,verandaTimber);
    K.blocker(x,.36,.42,.42,.75,3.45);
    // Small stepped shoulder and worn grooves cut the otherwise plain shaft.
    for(const y of [2.06,2.12,2.33])detail(x,y,.36,.45,.025,.45,verandaTimber);
    for(const dx of [-.17,.17])detail(x+dx,1.56,.145,.012,1.08,.009,'black');
  }
  b('Entrance inner carved crossbeam',0,3.49,.36,8.75,.25,.30,verandaTimber);
  // The photographed deep scalloped brackets span the seating bay, not a
  // straight stack of little blocks. Their lowest edge stays above head height.
  const bracket=new THREE.Shape();bracket.moveTo(0,0);bracket.lineTo(1.24,0);bracket.lineTo(1.24,-.14);
  bracket.bezierCurveTo(1.13,-.19,1.09,-.31,.99,-.21);bracket.bezierCurveTo(.93,-.30,.86,-.38,.77,-.29);
  bracket.bezierCurveTo(.62,-.43,.43,-.45,.23,-.43);bracket.lineTo(.23,-.54);bracket.lineTo(0,-.54);bracket.closePath();
  const bracketGeom=new THREE.ExtrudeGeometry(bracket,{depth:.19,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.013,bevelThickness:.012});
  for(const x of [-4.02,-1.65,1.65,4.02])for(const side of [-1,1]){
    if(Math.abs(x+side*.7)>4.3)continue;
    const mesh=new THREE.Mesh(bracketGeom,verandaTimber);mesh.name='Veranda scalloped carved beam bracket';mesh.position.set(x,3.45,.265);mesh.scale.x=side;mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  }
  for(const x of [-4.02,-1.65,1.65,4.02]){
    b('Sitting bay transverse ceiling beam',x,3.50,1.17,.27,.21,1.84,verandaTimber);
    const mesh=new THREE.Mesh(bracketGeom,verandaTimber);mesh.name='Veranda carved transverse bracket';mesh.rotation.y=-Math.PI/2;mesh.position.set(x+.095,3.45,.36);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  }
  for(const x of [-8.2,4.1,7.15])courtyardPost(x,5.7);
  b('Courtyard post stone base',4.1,(EL+F)/2,5.7,.58,F-EL,.58,riserGrey); // the post now stands over the lowered walkway
  // 'turning 135 degrees 2/3': the dark post behind the peach column is square, with a ribbed neck
  // and stepped corbels, and stands on the raised platform's west end.
  floor('Inner entrance platform west end',-4.38,3.05,1.14,1.90,.79,verandaRed,.34);
  b('Inner entrance platform west end riser',-4.965,.62,3.05,.03,.34,1.90,verandaRed);b('Inner entrance platform west end riser',-4.38,.62,4.015,1.14,.34,.03,verandaRed);
  b('Square timber pillar worn foot',-4.6,.84,3.5,.48,.10,.48,passageTimber);
  {const shaft=b('Courtyard octagonal timber post with turned capital',-4.6,1.64,3.5,.40,1.50,.40,verandaTimber);if(shaft)shaft.name='Courtyard octagonal timber post with turned capital';}
  for(let i=0;i<8;i++)K.cylinder(g,'Square timber pillar ribbed neck',-4.6,2.425+i*.07,3.5,i%2?.18:.15,i%2?.18:.15,.06,verandaTimber,8);
  [[.48,3.00],[.62,3.10],[.78,3.20],[.95,3.30]].forEach(([w,y])=>b('Square timber pillar corbel course',-4.6,y,3.5,w,.10,.44,verandaTimber));
  K.blocker(-4.6,3.5,.44,.44,.79,3.4);
  K.beam(g,'Entrance right paired pillar ceiling bearer',[-4.6,3.47,3.3],[-4.6,3.47,5.8],.24,passageTimber,.20);
  for(const z of [9.0,13.9])courtyardPost(-8.5,z);
  // 14.31.01 / 14.31.14: the east veranda has the same carved timber posts, just inside the blue railing.
  for(const z of [8.4,11.6])courtyardPost(7.6,z);
  for(const x of [-6.1,-1.8,2.8,7.2])courtyardPost(x,14.7);
  b('Front timber crossbeam',1.15,2.885,-.88,15.65,.21,.24,verandaTimber);
  b('Inner front crossbeam',-.5,3.51,5.7,16.6,.23,.27,'wood');
  b('West veranda crossbeam',-8.5,3.51,10.25,.24,.25,9.3,'wood');
  b('East veranda crossbeam',7.6,3.51,10.25,.24,.25,9.3,'wood'); // on the east posts
  b('Rear veranda crossbeam',-.55,3.51,14.7,15.8,.24,.27,'wood');

  // 14.32.31: the raised God-room screen is directly ahead on entering.
  // Keep the three steps beyond the cross-hall walking route at z=5.15.
  const shrineFloor=1.08, screenZ=6.92;
  const shrineBlue=mat('blue').clone();shrineBlue.color.setRGB(.64,.77,.81);shrineBlue.roughness=.98;
  const paintCanvas=document.createElement('canvas');paintCanvas.width=paintCanvas.height=512;
  const paint=paintCanvas.getContext('2d');paint.fillStyle='#36545e';paint.fillRect(0,0,512,512);
  for(let i=0;i<1500;i++){
    const x=(i*179)%512,y=(i*311)%512;
    paint.fillStyle=['#716f5860','#182e3840','#82928535','#283c4140'][i%4];
    paint.fillRect(x,y,1+i%4,2+i%19);
  }
  const gateMap=new THREE.CanvasTexture(paintCanvas);gateMap.colorSpace=THREE.SRGBColorSpace;gateMap.wrapS=gateMap.wrapT=THREE.RepeatWrapping;
  const gatePaint=new THREE.MeshStandardMaterial({map:gateMap,bumpMap:gateMap,bumpScale:.009,roughness:1});
  const shrineTimber=mat('wood').clone();shrineTimber.color.setRGB(.60,.60,.57);
  const shrineWhite=mat('plaster').clone();shrineWhite.color.set('#f3f3ef');
  floor('Shrine raised floor',0,8.48,4.15,3.24,shrineFloor,'red',.63);
  for(let i=0;i<3;i++){
    const z=5.68+i*.36,top=F+(i+1)*.21;
    b('God room pale stair riser',0,(F+top-.045)/2,z+.18,1.78,top-F-.045,.36,shrineWhite);
    floor('God room red stair tread',0,z+.18,1.82,.36,top,'red',.045);
  }
  floor('God room threshold',0,6.84,1.84,.24,shrineFloor,'red',.08);
  // The grey pocket now runs across the God room front at .075: one more step up to the
  // old stair foot. (The cheeks and the platform masonry are carried down to it below.)
  b('God room pale stair riser',0,(F+.075-.045)/2,5.5,1.78,F-.075-.045,.36,shrineWhite);
  floor('God room red stair tread',0,5.5,1.82,.36,F,'red',.045);
  for(const side of [-1,1]){
    // White layered masonry carries the two side bays and heavy posts. 14.52.11: the platform fronts
    // stand back from the stair foot, so the outer side of each cheek shows (as far as the posts allow).
    b('God room platform masonry foot',side*1.64,(F+.075)/2,6.63,1.40,F-.075,.88,shrineWhite);
    b('God room platform masonry',side*1.64,.75,6.63,1.40,.60,.88,shrineWhite);
    for(const [y,w,h] of [[.51,1.52,.12],[.68,1.46,.09],[.92,1.48,.11]])
      b('God room platform moulding',side*1.64,y,6.62,w,h,.97,shrineWhite);
    floor('God room side platform',side*1.64,6.63,1.48,.95,shrineFloor,shrineWhite,.09);
    // 14.52.11 / god-room.jpg / 14.32.31: the cheek top is level with the platform, sweeps down to a small
    // curl over a large scroll on a red pedestal, and its outer side is a white panel inside that red band
    // over a low red dado. Profile: x runs back from the foot (world z 5.42), y is height.
    const cheek=new THREE.Shape();
    cheek.moveTo(.06,EL);cheek.lineTo(1.39,EL);cheek.lineTo(1.39,1.08);cheek.lineTo(.90,1.08);
    cheek.bezierCurveTo(.72,1.08,.52,.99,.375,.955);cheek.absarc(.32,.86,.11,Math.PI/3,3.9,false);
    cheek.absarc(.20,.57,.17,Math.PI/3,4.36,false);cheek.lineTo(.06,.41);cheek.closePath();
    const cheekMesh=new THREE.Mesh(new THREE.ExtrudeGeometry(cheek,{depth:.30,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:20}),mat('red'));
    cheekMesh.name='God room curved red stair cheek';cheekMesh.rotation.y=-Math.PI/2;cheekMesh.position.set(side*1.06+.15,0,5.42);g.add(cheekMesh);
    for(const [sx,sy,r] of [[.20,.57,.175],[.32,.86,.115]]){
      const scroll=K.cylinder(g,'God room stair cheek scroll',side*1.06,sy,5.42+sx,r,r,.39,'red',28);scroll.rotation.z=Math.PI/2;
      const eye=K.cylinder(g,'God room stair cheek scroll eye',side*1.06,sy,5.42+sx,r*.3,r*.3,.43,'red',16);eye.rotation.z=Math.PI/2;
    }
    const panel=new THREE.Shape(),px=v=>-side*v; // mirrored per side so the face normal points away from the stair
    panel.moveTo(px(.33),.275);panel.lineTo(px(1.39),.275);panel.lineTo(px(1.39),.91);panel.lineTo(px(.92),.91);
    panel.quadraticCurveTo(px(.72),.90,px(.58),.82);panel.quadraticCurveTo(px(.48),.76,px(.45),.66);
    panel.lineTo(px(.43),.50);panel.lineTo(px(.38),.42);panel.lineTo(px(.33),.38);panel.closePath();
    const panelMesh=new THREE.Mesh(new THREE.ShapeGeometry(panel,12),shrineWhite);
    panelMesh.name='God room stair cheek white side panel';panelMesh.rotation.y=side*Math.PI/2;panelMesh.position.set(side*1.239,0,5.42);g.add(panelMesh);
    K.blocker(side*1.06,6.115,.35,1.39,EL,1.12);
    b('God room white half wall',side*1.45,1.805,screenZ,1.36,1.45,.22,shrineWhite,true); // god-room.jpg: wall and dado 1.44 m against the gate
    b('God room red oxide wall base',side*1.45,1.31,screenZ-.015,1.36,.46,.25,'red');
    // Open grilles, with daylight between real slats rather than a painted panel.
    for(const y of [2.58,3.07,3.55])b('God room blue grille rail',side*1.45,y,screenZ-.055,1.46,.095,.13,shrineBlue);
    for(let x=.80;x<=2.12;x+=.147)b('God room blue grille slat',side*x,3.065,screenZ-.06,.055,1.03,.08,shrineBlue);
    K.blocker(side*1.45,screenZ,1.46,.16,2.50,3.60);
    // The photo's outer posts are stout, square and forward of the screen.
    b('God room dark square post',side*2.25,2.12,6.50,.35,2.10,.42,shrineTimber,true);
    b('God room post foot',side*2.25,1.15,6.50,.48,.20,.52,shrineTimber);
    for(let j=0;j<5;j++)b('God room stepped post capital',side*2.25,3.19+j*.072,6.50,.40+j*.10,.082,.44+j*.075,shrineTimber);
    b('God room broad timber capital',side*2.25,3.57,6.50,1.04,.22,.93,shrineTimber);
    K.cylinder(g,'God room slender red support',side*1.58,2.44,6.50,.028,.032,2.79,'red',10);
    K.cylinder(g,'God room support stone foot',side*1.58,1.11,6.50,.085,.09,.07,'paleStone',12);
    b('God room blue upper louver frame',side*1.44,3.77,screenZ,.86,.31,.12,shrineBlue);
    for(let j=0;j<3;j++)b('God room upper louver slit',side*1.44,3.68+j*.09,screenZ-.075,.70,.042,.07,shrineTimber);
  }
  // User-located 14.36.56 / 14.37.30: a single shelf above the door,
  // seen from INSIDE the God room, with seven differently sized old containers.
  b('God room inside door shelf',0,3.61,7.09,2.02,.12,.36,shrineTimber);
  b('God room shelf worn front lip',0,3.68,7.285,2.07,.07,.055,verandaTimber);
  b('God room shelf dark timber backing',0,3.93,6.94,2.05,.54,.055,shrineTimber);
  const shelfTinColors=['#b5b6a1','#94aead','#796960','#bebba6','#adb7b2','#9d3338','#929c83'];
  // Screen-left to screen-right when facing back toward the entry (-Z).
  const shelfTins=[[-.83,.12,.35],[-.55,.145,.40],[-.25,.115,.32],[0,.082,.25],[.24,.12,.35],[.50,.112,.34],[.76,.12,.37]];
  shelfTins.forEach(([x,r,h],i)=>{
    const tinMaterial=new THREE.MeshStandardMaterial({color:shelfTinColors[i],roughness:.94});
    const fadedTin=tinMaterial.clone();fadedTin.color.lerp(new THREE.Color('#b9b09a'),.30);
    const tin=new THREE.Mesh(i===0?new THREE.LatheGeometry([[.08,0],[r,.035],[r,h*.72],[.085,h*.88],[.085,h]].map(([r,y])=>new THREE.Vector2(r,y)),20):new THREE.CylinderGeometry(r,r*.98,h,20),tinMaterial);
    tin.name='God room shelf container '+(i+1);tin.position.set(x,3.68+(i===0?0:h/2),7.13);tin.castShadow=true;tin.receiveShadow=true;g.add(tin);
    K.cylinder(g,'God room container lid',x,3.68+h+.012,7.13,i===0?.095:r+.006,i===0?.095:r+.006,.024,tinMaterial,20);
    // Small irregular faded patches follow the cylinder surface; no invented label text.
    if(i>0)for(let j=0;j<18;j++){
      const a=j*2.3999,rr=r+.0015;
      const patch=new THREE.Mesh(new THREE.CircleGeometry(.008+(j%4)*.005,5),fadedTin);
      patch.name='Faded paper and corrosion on shelf tin';patch.position.set(x+Math.sin(a)*rr,3.72+(j*13%29)/29*(h-.08),7.13+Math.cos(a)*rr);patch.rotation.y=a;g.add(patch);
    }
  });
  // Four stacked X openings per leaf, as in the supplied photograph.
  // 14.37.41 / 14.37.45 / 14.37.50 / god-room.jpg: the gate is about half as wide as it is tall (each
  // X panel roughly square) and each grille beside it is wider than one leaf.
  for(const x of [-.68,.68])b('God room blue door jamb',x,2.30,screenZ-.04,.18,2.56,.24,gatePaint,true);
  b('God room blue lintel',0,3.58,screenZ-.04,1.55,.20,.24,gatePaint);
  b('God room plain blue upper panel',0,3.82,screenZ,1.0,.29,.16,shrineBlue);
  for(const side of [-1,1]){
    const cx=side*.30,leafW=.59,low=1.14,high=3.47;
    for(const x of [cx-leafW/2+.035,cx+leafW/2-.035])b('God room gate upright',x,(low+high)/2,screenZ-.09,.07,high-low,.085,gatePaint);
    for(let row=0;row<=4;row++)b('God room gate horizontal rail',cx,low+row*(high-low)/4,screenZ-.09,leafW,.075,.095,gatePaint);
    for(let row=0;row<4;row++){
      const bottom=low+row*(high-low)/4+.06,top=low+(row+1)*(high-low)/4-.06;
      for(const sign of [-1,1])K.beam(g,'God room blue X brace',[cx-sign*.22,bottom,screenZ-.10],[cx+sign*.22,top,screenZ-.10],.085,gatePaint,.075);
    }
  }
  K.blocker(0,screenZ,1.20,.15,shrineFloor,3.5);
  b('God room iron latch',0,2.26,screenZ-.17,.23,.035,.035,'metal');
  b('God room worn centre door strip',0,2.25,screenZ-.15,.024,2.14,.02,shrineTimber);
  // Photograph-right is -X when looking into the house.
  K.cylinder(g,'God room grinding bowl',-1.22,1.22,6.52,.23,.17,.22,'paleStone',18); // god-room.jpg: against the dado beside the gate, clear of the slender red post
  K.cylinder(g,'God room bowl hollow',-1.22,1.335,6.52,.16,.16,.015,'stone',18);
  const grindingStone=new THREE.Mesh(new THREE.DodecahedronGeometry(.15,0),mat('stone'));
  grindingStone.name='God room grinding stone';grindingStone.position.set(-1.26,1.44,6.54);g.add(grindingStone);
  // User's note: no desk beside the God-room approach.
  // Low corrugated side coverings frame this view under heavy timber beams.
  const entryRoof=new THREE.Group();entryRoof.name='God room entrance roof framing';g.add(entryRoof);K.roofs.push(entryRoof);
  const roofGrey=new THREE.MeshStandardMaterial({color:'#81857c',roughness:.96,side:THREE.DoubleSide});
  for(const side of [-1,1]){
    const sheet=new THREE.Mesh(new THREE.PlaneGeometry(1.20,1.15,24,1),roofGrey); // shortened: the old length stuck out above the lean-to roofs
    const pos=sheet.geometry.attributes.position;for(let i=0;i<pos.count;i++)pos.setZ(i,.024*Math.cos(pos.getX(i)*Math.PI/.05));sheet.geometry.computeVertexNormals();
    sheet.rotation.x=-Math.PI/2;sheet.rotation.z=side*.09;sheet.position.set(side*2.61,3.73,5.335);sheet.name='God room grey corrugated roof underside';entryRoof.add(sheet);
    K.beam(entryRoof,'God room side roof timber',[side*2.25,3.52,4.82],[side*2.25,3.52,7.08],.17,shrineTimber,.21);
    for(const z of [5.03,5.65,6.50])K.beam(entryRoof,'God room short exposed crossbeam',[side*2.02,3.56,z],[side*3.18,3.56,z],.14,shrineTimber,.18);
  }
  wallZ('Shrine left wall',-2.05,6.98,10.1,.68,2.9,[{c:8.15,w:1.86,bottom:1.47,top:2.62}],'plaster',.22); // 14.52.16 / 14.46.10: sill about 2.15 m, head just under the long canopy
  wallZ('Shrine right wall',2.05,6.98,10.1,.68,2.9,[{c:8.15,w:1.86,bottom:1.58,top:2.87}],'plaster',.22);
  wallX('Shrine rear wall',-2.05,2.05,10.08,.68,2.9,[],'plaster',.22);
  // (Four short red blocks stood on the side walls at y 1.28, left over from the old low band's trim.
  // 14.52.16 / 14.46.10 / 14.48.07 show plain plaster over the black dado there.)
  // 14.44.14 / 14.44.09 / 14.52.16 / 14.46.10: three broad patterned bands (about 0.25 m, at 1.75, 2.70 and
  // 3.65 m) run round the tall block; on the west the lower two exist only behind the window.
  const shrineBandSpans=(side,y)=>side<0?(y===3.65?[[6.0,10.2]]:[[9.14,10.2]]):(y===1.75?[[6.0,10.2]]:[[6.0,7.16],[9.14,10.2]]);
  for(const y of [1.75,2.70,3.65]) {
    detail(0,y,10.22,4.32,.25,.10,'red');
    for(const side of [-1,1])for(const [a,end] of shrineBandSpans(side,y))detail(side*2.2,y,(a+end)/2,.10,.25,end-a,'red');
  }
  // Pale floral/triangle decoration on the red shrine bands (14.44.14).
  const borderCanvas=document.createElement('canvas');borderCanvas.width=512;borderCanvas.height=64;
  const border=borderCanvas.getContext('2d');border.fillStyle='#7b4d4c';border.fillRect(0,0,512,64);border.strokeStyle='#c4ad9c';border.fillStyle='#c4ad9c';border.lineWidth=3;
  for(let x=0;x<512;x+=64){border.beginPath();border.moveTo(x,56);border.lineTo(x+32,8);border.lineTo(x+64,56);border.stroke();for(let k=0;k<6;k++){const a=k*Math.PI/3;border.beginPath();border.ellipse(x+32+Math.cos(a)*9,35+Math.sin(a)*9,7,3,a,0,Math.PI*2);border.fill();}}
  const borderMap=new THREE.CanvasTexture(borderCanvas);borderMap.colorSpace=THREE.SRGBColorSpace;borderMap.wrapS=THREE.RepeatWrapping;borderMap.repeat.x=2;
  const bandMat=new THREE.MeshStandardMaterial({map:borderMap,roughness:1});
  for(const y of [1.75,2.70,3.65]){
    for(const side of [-1,1])for(const [a0,e0] of shrineBandSpans(side,y)){
      const a=a0+.025,end=e0-.025,material=bandMat.clone(),map=borderMap.clone();map.repeat.x=2.6*(end-a)/4.15;map.offset.x=(a-6.025)/4.15*2.6;material.map=map;
      const band=new THREE.Mesh(new THREE.PlaneGeometry(end-a,.25),material);band.position.set(side*2.255,y,(a+end)/2);band.rotation.y=side*Math.PI/2;band.name='Patterned shrine side band';g.add(band);
    }
    const material=bandMat.clone(),map=borderMap.clone();map.repeat.x=2.6*4.32/4.15;material.map=map;
    const rear=new THREE.Mesh(new THREE.PlaneGeometry(4.32,.25),material);rear.position.set(0,y,10.275);rear.name='Patterned shrine rear band';g.add(rear);
  }
  // 14.46.10, from the courtyard stair: open blue double grille rather
  // than an opaque shutter. The unseen opposite wall remains an estimate.
  const wornWindowBlue=K.M.blue.clone();wornWindowBlue.color.setRGB(.85,1.0,1.05);
  for(const z of [7.22,8.15,9.08])b('Shrine west window blue upright',-2.205,2.725,z,.12,1.23,.085,wornWindowBlue);
  for(const y of [2.17,2.725,3.28])b('Shrine west window blue cross rail',-2.215,y,8.15,.13,.075,1.94,wornWindowBlue);
  for(let z=7.33;z<9.04;z+=.108)b('Shrine west window slender wooden grille',-2.205,2.725,z,.055,1.11,.036,wornWindowBlue);
  K.blocker(-2.205,8.15,.12,1.94,2.15,3.30);
  const canopyPlaster=K.M.plaster.clone();canopyPlaster.color.set('#aca38e');
  const canopyWest=K.M.plaster.clone();canopyWest.color.set('#cfc8b8'); // 14.46.10: a long weathered white fascia from the porch to past the window
  b('Shrine west window deep pale canopy',-2.28,3.45,7.675,.61,.25,3.35,canopyWest);
  for(const z of [7.18,9.12]){
    b('Shrine west canopy timber corbel',-2.32,3.34,z,.46,.14,.15,verandaTimber);
    b('Shrine west canopy corbel foot',-2.22,3.24,z,.24,.16,.15,verandaTimber);
  }
  // The newly located interior close-up confirms an open grille on this side too.
  for(const z of [7.22,8.15,9.08])b('Shrine east window blue upright',2.205,2.90,z,.12,1.38,.085,wornWindowBlue);
  for(const y of [2.26,2.90,3.55])b('Shrine east window blue cross rail',2.215,y,8.15,.13,.075,1.94,wornWindowBlue);
  for(let z=7.33;z<9.04;z+=.108)b('Shrine east window slender wooden grille',2.205,2.90,z,.055,1.29,.036,wornWindowBlue);
  K.blocker(2.205,8.15,.12,1.94,2.23,3.60);
  // 14.44.14 / 14.44.09: a heavy dark timber hood with a red cap over the east window.
  b('Shrine east window dark timber hood',2.345,3.80,8.15,.37,.42,2.18,verandaTimber);
  b('Shrine east window hood red cap',2.345,4.07,8.15,.41,.12,2.22,'red');
  // 14.37.41/45/50 look back from inside the God room: the aqua
  // plaster and dark skirting are confined to the reverse of the white screen.
  const shrineSkirting=mat('wood').clone();shrineSkirting.color.set('#393b35');
  for(const side of [-1,1]){
    b('God room inside aqua half wall',side*1.45,1.805,7.038,1.36,1.45,.012,verandaAqua);
    b('God room interior dark skirting',side*1.45,1.15,7.050,1.36,.14,.025,shrineSkirting);
    b('God room exposed inside door jamb',side*.72,2.31,7.065,.16,2.56,.045,verandaTimber);
  }
  b('God room inside side aqua half wall',1.932,1.67,8.13,.012,1.18,2.16,verandaAqua);
  b('God room inside side dark skirting',1.918,1.15,8.13,.025,.14,2.16,shrineSkirting);
  b('God room inside corner timber shaft',1.995,2.14,7.075,.18,2.12,.18,verandaTimber);
  for(let j=0;j<5;j++)b('God room inside corner carved collar',1.995,3.06+j*.058,7.075,.23+(j%2)*.035,.036,.23+(j%2)*.035,verandaTimber);
  // Identified interior corner close-up: a deep scalloped timber corbel
  // joins the corner post to the grille head, beneath the continuous beam.
  const shrineCorbel=new THREE.Shape();
  shrineCorbel.moveTo(0,0);shrineCorbel.lineTo(1.12,0);shrineCorbel.lineTo(1.12,-.17);
  shrineCorbel.bezierCurveTo(1.10,-.26,.97,-.29,.88,-.36);
  shrineCorbel.bezierCurveTo(.82,-.42,.78,-.45,.73,-.38);
  shrineCorbel.lineTo(.69,-.49);
  shrineCorbel.bezierCurveTo(.62,-.46,.63,-.34,.56,-.36);
  shrineCorbel.bezierCurveTo(.49,-.37,.46,-.50,.35,-.47);
  shrineCorbel.bezierCurveTo(.29,-.46,.26,-.43,.23,-.43);
  shrineCorbel.lineTo(.20,-.54);shrineCorbel.lineTo(0,-.54);shrineCorbel.closePath();
  const shrineCorbelGeo=new THREE.ExtrudeGeometry(shrineCorbel,{depth:.14,steps:1,curveSegments:4,bevelEnabled:false});
  const shrineCorbelMesh=new THREE.Mesh(shrineCorbelGeo,verandaTimber);
  shrineCorbelMesh.name='God room inside scalloped corner bracket';
  shrineCorbelMesh.position.set(1.995,3.65,7.075);shrineCorbelMesh.rotation.y=-Math.PI/2;
  shrineCorbelMesh.castShadow=true;shrineCorbelMesh.receiveShadow=true;g.add(shrineCorbelMesh);
  b('God room inside grille head timber',1.925,3.69,7.62,.19,.16,1.25,verandaTimber);
  b('God room interior shelf above gate',0,3.70,7.18,2.10,.075,.34,verandaTimber);
  for(const [x,h,r,col] of [[-.65,.18,.047,'#77776a'],[-.43,.24,.055,'#9c9b81'],[-.21,.29,.061,'#77766d'],[.05,.22,.048,'#773b32'],[.27,.19,.060,'#989784']]){
    const jarMat=new THREE.MeshStandardMaterial({color:col,roughness:.86});
    K.cylinder(g,'God room shelf storage vessel',x,3.74+h/2,7.19,r*.92,r,h,jarMat,12);
    K.cylinder(g,'God room shelf vessel lid',x,3.75+h,7.19,r*1.05,r*1.05,.025,shrineSkirting,12);
  }
  b('God room pale turquoise inside corner',1.932,1.93,9.61,.012,2.40,.72,verandaAqua);
  const shrineDampBase=K.M.plaster.clone();shrineDampBase.color.set('#696650');
  // (The west base is built after the deepening pass, below: 'Shrine west plinth ...'.)
  const moss=K.M.plaster.clone();moss.color.set('#4f5839');
  // 14.44.09/14, 14.44.19, 14.44.48, 14.30.57: rough freestanding stone uprights and a
  // rounded pole follow the God room's east side, along the planted strip toward the east veranda.
  const roughSupport=new THREE.MeshStandardMaterial({map:graniteMap,color:'#a39c9f',roughness:1,flatShading:true}); // 14.44.09 / 14.30.57: pale lichened granite, split not sawn
  const poleGrey=K.M.plaster.clone();poleGrey.color.set('#aaa2a8');poleGrey.roughness=1;
  for(const [j,z] of [[0,7.35],[1,9.9],[2,12.4]]){ // 14.44.14 / 14.44.09: the supports stand 2.5 m apart, the last beside the camera at the rear
    const geo=new THREE.BoxGeometry(.24,2.44,.25,2,14,2),p=geo.attributes.position,gn=geo.attributes.normal,guv=geo.attributes.uv;
    const jit=(x,y,zz,k)=>{const v=Math.sin(x*127.1+y*311.7+zz*74.7+j*19.3+k*5.1)*43758.5453;return v-Math.floor(v)-.5;};
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),zz=p.getZ(i),wear=.008*Math.sin(y*17+zz*11+j);
      const nx=x*(1-.10*(y+1.22)/2.44)+wear+.022*jit(x,y,zz,0),nz=zz+.007*Math.sin(y*13+x*19+j)+.022*jit(x,y,zz,1);
      if(Math.abs(gn.getX(i))>.5)guv.setXY(i,zz*.5+j*.37,y*.5);else if(Math.abs(gn.getY(i))>.5)guv.setXY(i,x*.5,zz*.5);else guv.setXY(i,x*.5+j*.37,y*.5);
      p.setXYZ(i,nx,y,nz);
    }
    geo.computeVertexNormals();const post=new THREE.Mesh(geo,roughSupport);post.name='Shrine-side rough stone pole support';post.position.set(2.96,1.255,z);post.castShadow=post.receiveShadow=true;g.add(post);
    K.blocker(2.96,z,.26,.27,.035,2.475);
  }
  const pole=K.cylinder(g,'Shrine-side weathered round cross pole',2.96,2.51,10.6,.075,.09,6.9,poleGrey,12);pole.rotation.x=Math.PI/2;
  // 14.30.57: pale pipe lies on the soil beside the shrine-side supports.
  const courtPipe=K.M.plaster.clone();courtPipe.color.set('#d0d2bc');
  const groundPipe=K.cylinder(g,'Courtyard shrine-side pale ground pipe',2.45,1.04,8.53,.034,.034,5.10,courtPipe,8); // lies on the east ledge
  groundPipe.rotation.x=Math.PI/2; // (a comment had swallowed this call and the pipe stood on end)
  for(const z of [6.03,8.12,10.98]){
    const joint=K.cylinder(g,'Courtyard ground pipe coupling',2.45,1.04,z,.043,.043,.09,courtPipe,8);joint.rotation.x=Math.PI/2;
  }
  const poleStain=new THREE.MeshStandardMaterial({color:'#696c4c',roughness:1});
  for(const z of [7.46,9.2,11.0,12.9]){
    const collar=K.cylinder(g,'Round courtyard pole weathered band',2.96,2.51,z,.087,.087,.055,poleStain,12);collar.rotation.x=Math.PI/2;
  }
  // Surface fissure, not an opening through the wall: the crack meets the
  // upper edge of the west window reveal in the close-up.
  const crackPoints=[[7.30,3.96],[7.32,3.85],[7.27,3.74],[7.28,3.63],[7.21,3.48],[7.20,3.38]];
  const crackGeometry=new THREE.BufferGeometry().setFromPoints(crackPoints.map(([z,y])=>new THREE.Vector3(-2.167,y,z)));
  const crack=new THREE.Line(crackGeometry,new THREE.LineBasicMaterial({color:'#63584a'}));crack.name='Shrine west plaster hairline crack';g.add(crack);
  // User-labelled 14.38.51: two unequal, tarnished metal discs beside
  // the God room's left grille. Their dimensions and spacing are estimated.
  const discCanvas=document.createElement('canvas');discCanvas.width=discCanvas.height=256;
  const dc=discCanvas.getContext('2d');dc.fillStyle='#746854';dc.fillRect(0,0,256,256);
  let discSeed=143851;const discRandom=()=>{discSeed=(Math.imul(discSeed,1664525)+1013904223)>>>0;return discSeed/4294967296;};
  for(let j=0;j<3200;j++){
    const x=discRandom()*256,y=discRandom()*256;
    dc.fillStyle=['#423e3740','#ac9c7830','#81766040','#cec09f24'][j%4];
    dc.beginPath();dc.arc(x,y,1+j%5,0,Math.PI*2);dc.fill();
  }
  const discMap=new THREE.CanvasTexture(discCanvas);discMap.colorSpace=THREE.SRGBColorSpace;
  const discMetal=new THREE.MeshStandardMaterial({map:discMap,bumpMap:discMap,bumpScale:.003,metalness:.42,roughness:.87});
  const discRim=new THREE.MeshStandardMaterial({color:'#807259',metalness:.45,roughness:.85});
  // User's note ('God room, left side'): the two metal plates hang on the wall ahead, beside the
  // doorway of the small shrine room, above a framed print. Named 'Altar ...' so they move with it.
  const altarWallZ=8.58;
  b('Altar wall disc hanging timber rail',1.545,3.04,altarWallZ-.065,.74,.07,.05,shrineTimber);
  for(const [x,r,y] of [[1.72,.145,2.84],[1.38,.205,2.80]]){
    const z=altarWallZ-.07;
    const metalDisc=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.014,48),discMetal);
    metalDisc.name='Altar wall hanging weathered metal disc';metalDisc.rotation.x=Math.PI/2;metalDisc.position.set(x,y,z);metalDisc.castShadow=true;metalDisc.receiveShadow=true;g.add(metalDisc);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(r-.007,.007,7,48),discRim);rim.name='Altar wall disc rounded worn rim';rim.position.set(x,y,z-.012);g.add(rim);
    const hole=new THREE.Mesh(new THREE.CircleGeometry(.009,12),new THREE.MeshStandardMaterial({color:'#302e28',roughness:1}));hole.name='Altar wall disc suspension hole';hole.rotation.y=Math.PI;hole.position.set(x,y+r-.023,z-.013);g.add(hole);
    const loop=new THREE.Mesh(new THREE.TorusGeometry(.018,.003,6,16),discRim);loop.name='Altar wall disc suspension loop';loop.position.set(x,y+r-.008,z-.005);g.add(loop);
    const wire=K.beam(g,'Altar wall disc short hanging wire',[x,y+r+.01,z],[x,3.04,z+.01],.005,discRim);if(wire)wire.name='Altar wall disc short hanging wire';
  }
  // 14.35.26 (shrine.jpg): a low ledge and four white stepped tiers with dark
  // timber treads carry brass bells, standing plates, a flame-edged arch, bronze
  // idols, a lamp and a flower offering, all built as geometry. Only the flat
  // printed pictures inside their frames reuse the photograph. The photo's
  // camera, fitted to the tier edges, places each object where it was seen.
  const shrineMap=new THREE.TextureLoader().load('./assets/shrine.jpg');
  shrineMap.colorSpace=THREE.SRGBColorSpace;
  const printMat=new THREE.MeshStandardMaterial({map:shrineMap,roughness:.8}); // lit prints: unlit panels rendered black in Unreal, and any glow is blown out there
  const altarCam=new THREE.PerspectiveCamera(47.1,2048/1536,.05,20);altarCam.position.set(.35,3.0,7.34);altarCam.lookAt(.05,2.01,9.9);altarCam.updateMatrixWorld();
  const pv=new THREE.Vector3();
  // Photo pixel (2000×1500 frame) to the world point where its ray meets depth z.
  const atZ=(u,v,z)=>{pv.set(u/1000-1,1-v/750,.5).unproject(altarCam);const o=altarCam.position,d=pv.clone().sub(o).normalize();return o.clone().addScaledVector(d,(z-o.z)/d.z);};
  const altarY0=1.434,rise=.361,run=.16,ledgeRun=.26,altarBack=9.88,altarFront=altarBack-ledgeRun-4*run;
  const treadWood=mat('wood').clone();treadWood.color.set('#d8d3c8'); // 14.35.26: the shelf treads are painted off-white like the risers
  const tierWhite=shrineWhite.clone();tierWhite.color.set('#d9dad4');
  // The niche is only about 1.85 m wide between the two carved pillars.
  const altarX0=-.83,altarX1=1.02,altarCX=(altarX0+altarX1)/2,altarW=altarX1-altarX0;
  b('Altar low white ledge',altarCX,(shrineFloor+altarY0)/2,(altarFront+altarBack)/2,altarW,altarY0-shrineFloor,altarBack-altarFront,tierWhite,true);
  b('Altar ledge timber top',altarCX,altarY0+.008,(altarFront+altarBack)/2,altarW,.016,altarBack-altarFront+.02,treadWood);
  for(let k=1;k<=4;k++){
    const z0=altarFront+ledgeRun+(k-1)*run,top=altarY0+k*rise;
    b('Altar white stepped tier',altarCX,top-rise/2,(z0+altarBack)/2,altarW,rise,altarBack-z0,tierWhite);
    b('Altar dark timber tread',altarCX,top+.008,(z0+altarBack)/2,altarW,.016,altarBack-z0+.02,treadWood);
  }
  const treadTop=k=>altarY0+k*rise+.016;
  const treadFront=k=>k===0?altarFront:altarFront+ledgeRun+(k-1)*run,treadDepth=k=>k===0?ledgeRun:k===4?altarBack-treadFront(4):run;
  // Where a photographed object stands: tread k, pixel box u0..u1 × v0..v1,
  // at fraction f of the tread's depth. Returns centre, width and height.
  const spot=(k,u0,u1,v0,v1,f=.5)=>{const z=treadFront(k)+treadDepth(k)*f,a=atZ(u0,v1,z),c=atZ(u1,v0,z);return {x:(a.x+c.x)/2,y:treadTop(k),z,w:Math.abs(a.x-c.x),h:Math.abs(c.y-a.y)};};
  const brass=new THREE.MeshStandardMaterial({color:'#8f7a4c',metalness:.25,roughness:.48});
  const bronze=new THREE.MeshStandardMaterial({color:'#4a4032',metalness:.25,roughness:.6});
  const lathe=(name,profile,m,s,scaleXZ,scaleY,seg=18)=>{const geo=new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),seg);
    const mesh=new THREE.Mesh(geo,m);mesh.name=name;mesh.position.set(s.x,s.y,s.z);mesh.scale.set(scaleXZ,scaleY,scaleXZ);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);return mesh;};
  const bellProfile=[[0,0],[.5,0],[.47,.08],[.36,.45],[.3,.72],[.14,.84],[.1,.98],[.05,1.05],[0,1.06]];
  const bell=(k,u,v,px)=>{const s=spot(k,u-px*.4,u+px*.4,v-px,v,.45);lathe('Altar small brass bell',bellProfile,brass,s,s.h,s.h,14);};
  // Stylised standing or seated murti: plinth, robe, waist, torso, head, crown.
  const murtiProfile=[[0,0],[.5,0],[.5,.06],[.3,.08],[.24,.12],[.3,.4],[.17,.48],[.24,.58],[.22,.68],[.09,.72],[.15,.76],[.16,.83],[.1,.88],[.09,.92],[.02,1.02],[0,1.03]];
  const murti=(k,u0,u1,v0,v1,m=bronze,f=.5,lift=0)=>{const s=spot(k,u0,u1,v0,v1,f);s.y+=lift;lathe('Altar bronze murti',murtiProfile,m,s,s.w*.8,s.h,16);
    for(const side of [-1,1])K.beam(g,'Altar murti arm',[s.x+side*s.w*.16,s.y+s.h*.66,s.z],[s.x+side*s.w*.3,s.y+s.h*.46,s.z-.01],Math.max(.008,s.w*.07),m);return s;};
  const scallop=(r,lobes,depth)=>{const sh=new THREE.Shape();for(let i=0;i<=lobes*8;i++){const a=i/(lobes*8)*Math.PI*2,rr=r*(1-depth+depth*Math.abs(Math.cos(a*lobes/2)));const x=Math.cos(a)*rr,y=Math.sin(a)*rr;if(i)sh.lineTo(x,y);else sh.moveTo(x,y);}return sh;};
  // Standing plates lean back against the riser behind their tread.
  const standingPlate=(name,k,u0,u1,v0,v1,lobes=0,f=.8)=>{const s=spot(k,u0,u1,v0,v1,f),r=s.w/2;
    const shape=lobes?scallop(r,lobes,.06):new THREE.Shape().absarc(0,0,r,0,Math.PI*2);
    const plate=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.008,bevelEnabled:false,curveSegments:24}),brass);plate.name=name;plate.position.set(s.x,s.y+r*.97,s.z);plate.rotation.x=.14;plate.castShadow=true;g.add(plate);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(r*.55,r*.03,6,32),brass);ring.name=name+' raised ring';ring.position.set(s.x,s.y+r*.97,s.z-.006);ring.rotation.x=.14;g.add(ring);return s;};
  // Framed prints: the printed picture is the photo's own pixels, the frame is geometry.
  const framed=(name,k,u0,u1,v0,v1,frameMat,inset=.08)=>{const s=spot(k,u0,u1,v0,v1,.35),w=s.w,h=s.h;
    const holder=new THREE.Group();holder.name=name;holder.position.set(s.x,s.y,s.z);holder.rotation.x=.16;g.add(holder);
    K.box(holder,name+' frame',0,h/2,0,w,h,.02,frameMat);
    const du=(u1-u0)*inset,dv=(v1-v0)*inset,geo=new THREE.PlaneGeometry(w*(1-2*inset),h*(1-2*inset)),uv=geo.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)?u0+du:u1-du)/2000,1-(uv.getY(i)?v0+dv:v1-dv)/1500);
    const print=new THREE.Mesh(geo,printMat);print.name=name+' printed picture';print.rotation.y=Math.PI;print.position.set(0,h/2,-.011);holder.add(print);};
  const frameWood=mat('wood').clone();frameWood.color.set('#2e241d');
  const frameRed=new THREE.MeshStandardMaterial({color:'#b24a4f',roughness:.7});
  framed('Altar framed Lakshmi print',1,510,865,710,1025,frameWood,.03);
  framed('Altar small framed deity print',1,1405,1600,780,1080,frameWood,.06);
  framed('Altar dark framed temple print',1,1575,1740,845,1090,frameWood,.08);
  framed('Altar red-framed mirror picture',0,1310,1690,1085,1360,frameRed,.07);
  framed('Altar small upper photograph',2,730,880,450,690,frameWood,.06);
  framed('Altar white card with red emblem',3,1465,1605,270,450,shrineWhite,.12);
  // Krishna with his flute on a round brass pedestal, before a plain halo.
  {const p=spot(1,875,1250,1000,1110,.45),r=p.w/2,ph=p.h*.55;
    K.cylinder(g,'Altar round brass pedestal',p.x,p.y+ph/2,p.z,r*.9,r,ph,brass,28);
    standingPlate('Altar Krishna brass halo',1,880,1245,600,990,0,.9);
    const s=murti(1,960,1170,640,1000,brass,.45,ph);
    K.beam(g,'Altar Krishna flute',[s.x+s.w*.35,s.y+s.h*.66,s.z-.06],[s.x-s.w*.25,s.y+s.h*.62,s.z-.08],.012,brass);}
  standingPlate('Altar large scalloped brass plate',2,1010,1360,350,760,12);
  standingPlate('Altar upper left brass plate',3,870,1090,190,420,16);
  standingPlate('Altar upper right brass plate',3,1580,1810,160,420,16);
  // Flame-edged prabhavali arch with a small figure inside, on the third tier.
  {const s=spot(3,1110,1370,30,420,.6),w=s.w,h=s.h,sh=new THREE.Shape();
    sh.moveTo(-w/2,0);sh.lineTo(-w/2,h*.55);
    for(let i=0;i<=18;i++){const a=Math.PI-i/18*Math.PI,rr=w/2*(i%2?1.08:.94);sh.lineTo(Math.cos(a)*rr,h*.55+Math.sin(a)*rr*.95);}
    sh.lineTo(w/2,0);sh.lineTo(w*.34,0);sh.lineTo(w*.34,h*.5);sh.absarc(0,h*.5,w*.34,0,Math.PI,false);sh.lineTo(-w*.34,0);sh.closePath();
    const arch=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:.012,bevelEnabled:false,curveSegments:12}),brass);arch.name='Altar flame-edged brass prabhavali';arch.position.set(s.x,s.y,s.z);arch.castShadow=true;g.add(arch);
    murti(3,1180,1300,160,400,bronze,.3);}
  murti(1,1230,1330,820,995);murti(2,1455,1610,490,750);murti(2,1620,1720,470,760);murti(2,870,960,510,650);
  murti(3,735,820,245,405);murti(3,1655,1760,200,430);murti(4,1470,1690,-40,150);murti(4,1150,1300,-30,110);
  for(const [k,u,v,px] of [[1,495,1030,75],[1,705,1045,70],[2,780,695,60],[2,1350,785,85],[3,935,440,60],[3,1415,440,55],[3,1745,470,60],[1,1305,1035,55]])bell(k,u,v,px);
  // On the ledge: a lidded brass lamp vessel, a dark pot on a plate with
  // jasmine and leaves, and a blue cloth bundle.
  {const s=spot(0,630,800,1100,1330,.45);lathe('Altar lidded brass lamp vessel',[[0,0],[.42,0],[.5,.2],[.46,.45],[.3,.58],[.34,.66],[.2,.72],[.24,.84],[.1,.95],[.12,1],[0,1.04]],brass,s,s.w,s.h,20);}
  {const s=spot(0,860,1100,1160,1400,.5);K.cylinder(g,'Altar offering plate',s.x,s.y+.01,s.z,s.w*.5,s.w*.46,.02,brass,24);
    lathe('Altar dark round offering pot',[[0,0],[.3,0],[.45,.25],[.42,.5],[.25,.62],[.28,.7],[0,.72]],new THREE.MeshStandardMaterial({color:'#1f1b17',roughness:.5}),{x:s.x,y:s.y+.02,z:s.z},s.w*.8,s.h*.9,18);
    const jasmine=new THREE.MeshStandardMaterial({color:'#f2f0e6',roughness:.8}),leaf=new THREE.MeshStandardMaterial({color:'#3f5a2c',roughness:.9});
    for(let i=0;i<9;i++){const a=i*2.4,m=new THREE.Mesh(new THREE.IcosahedronGeometry(.012,0),i%3?jasmine:leaf);m.name='Altar jasmine and leaves';m.position.set(s.x+Math.cos(a)*s.w*.36,s.y+.03+(i%2)*.01,s.z+Math.sin(a)*s.w*.3);g.add(m);}}
  {const s=spot(0,455,620,1230,1370,.4),bag=new THREE.Mesh(new THREE.SphereGeometry(.5,10,8),new THREE.MeshStandardMaterial({color:'#2c4f8a',roughness:.8}));
    bag.name='Altar blue cloth bundle';bag.position.set(s.x,s.y+s.h*.3,s.z);bag.scale.set(s.w,s.h*.6,s.w*.6);g.add(bag);}
  const frameBack=frameWood;
  // 14.35.26: the dark underside of a stair crosses the niche's upper left,
  // edged with a row of turned wooden beads.
  {const z=altarFront-.06,p0=atZ(240,730,z),p1=atZ(640,130,z),top=atZ(240,-20,z).y,sh=new THREE.Shape();
    sh.moveTo(p0.x,p0.y);sh.lineTo(p1.x,p1.y);sh.lineTo(p1.x,top);sh.lineTo(p0.x,top);sh.closePath();
    const soffit=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:.05,bevelEnabled:false}),frameWood);soffit.name='Altar stair underside across the niche';soffit.position.z=z-.05;soffit.castShadow=true;g.add(soffit);
    for(let i=0;i<=26;i++){const t=i/26,bead=new THREE.Mesh(new THREE.SphereGeometry(.022,8,6),frameWood);bead.name='Altar stair turned bead edge';bead.position.set(p0.x+(p1.x-p0.x)*t,p0.y+(p1.y-p0.y)*t-.012,z+.01);g.add(bead);}}
  // Fluted pillars frame the niche in 14.35.26; dark panels close its sides.
  const pillarPaint=mat('plaster').clone();pillarPaint.color.set('#8d8b82');
  for(const x of [altarX0-.02,altarX1+.02]){K.column(g,'Altar pale fluted pillar',x,altarFront-.2,shrineFloor,2.34,.13,pillarPaint);
    for(let i=0;i<3;i++)b('Altar pillar carved capital ring',x,2.28+i*.09,altarFront-.2,.36-i*.05,.06,.36-i*.05,pillarPaint);}
  for(const x of [altarX0-.1,altarX1+.1])b('Altar niche dark side panel',x,2.30,(altarFront+altarBack)/2-.1,.06,2.44,altarBack-altarFront+.2,frameBack);
  // User's note: the God shelf stands inside a small room. Its front wall runs across the God room
  // at the pillar line: turquoise plaster below dark boards either side, and a doorway of three
  // stepped dark timber frames in front of the shelf ('God room, left side' shows it on the right).
  {const z=altarWallZ,top=3.52,band=2.72,d0=altarX0-.14,d1=altarX1+.14;
   for(const [x0,x1] of [[-1.93,d0],[d1,1.93]]){
     b('Altar room front wall turquoise plaster',(x0+x1)/2,(shrineFloor+band)/2,z,x1-x0,band-shrineFloor,.10,verandaAqua);
     b('Altar room front wall dark upper boards',(x0+x1)/2,(band+top)/2,z,x1-x0,top-band,.10,frameWood);
     b('Altar room front wall red skirting',(x0+x1)/2,shrineFloor+.09,z-.056,x1-x0,.18,.012,'red');
   }
   const head=3.16;
   b('Altar room wall above the doorway',(d0+d1)/2,(head+top)/2,z,d1-d0,top-head,.10,frameWood);
   for(let k=0;k<3;k++){
     const inset=k*.075,zz=z-.07+k*.045,h=head-inset-shrineFloor;
     for(const x of [d0+.05+inset,d1-.05-inset])b('Altar room stepped doorway jamb',x,shrineFloor+h/2,zz,.10,h,.06,frameWood);
     b('Altar room stepped doorway lintel',(d0+d1)/2,head-inset-.05,zz,d1-d0-2*inset,.10,.06,frameWood);
   }
   // Flat framed prints on the wall ahead: painted stand-ins, not the photograph.
   const print=(name,x,y,w,h,ground,figure,tilt)=>{
     const c=document.createElement('canvas');c.width=128;c.height=160;const q=c.getContext('2d');
     q.fillStyle='#e9e2cf';q.fillRect(0,0,128,160);q.fillStyle=ground;q.fillRect(8,8,112,144);
     q.fillStyle=figure;q.beginPath();q.arc(64,62,17,0,Math.PI*2);q.fill();q.beginPath();q.moveTo(30,138);q.quadraticCurveTo(64,58,98,138);q.closePath();q.fill();
     q.fillStyle='#f3d9a2';q.beginPath();q.arc(64,62,9,0,Math.PI*2);q.fill();q.fillStyle='#b8862f';q.fillRect(22,136,84,8);
     const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
     const frame=b(name+' dark frame',x,y,z-.065,w+.07,h+.07,.03,frameWood);
     const sheet=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,roughness:.75}));
     sheet.name=name;sheet.rotation.y=Math.PI;sheet.position.set(x,y,z-.082);g.add(sheet);
     if(tilt&&frame){frame.rotation.x=-tilt;sheet.rotation.x=tilt;}
   };
   print('Altar wall framed saint print',1.53,2.06,.42,.56,'#2f8f8b','#e2812d',0);
   print('Altar wall upper framed print',1.50,3.30,.56,.34,'#35589a','#d9b24a',.16);
  }
  detail(0,3.38,9.6,3.82,.2,.24,'wood');
  const lampMat=new THREE.MeshStandardMaterial({color:0xffe0a3,emissive:0xffb34a,emissiveIntensity:1.2});
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.075,10,8),lampMat);
  // The bare bulb hangs on the photographed ray, in front of the upper tiers.
  const bulb=atZ(850,160,8.95);
  lamp.position.copy(bulb);lamp.name='Shrine warm bulb';g.add(lamp);
  K.beam(g,'Shrine bulb cord',[bulb.x,bulb.y,bulb.z],[bulb.x,3.57,bulb.z],.018,'black');
  // A small point lamp keeps the source altar visible in the deep veranda.
  const shrineLight=new THREE.PointLight(0xffd49b,2.8,5,2);shrineLight.position.set(0,2.85,7.3);g.add(shrineLight);
  const shrineRoof=K.hipRoof(g,'Small shrine tiled roof',0,8.0,4.9,4.95,3.64,1.0);
  // IMG_20130720_182845: the entrance end is an open gable, with
  // exposed tile backs above a heavy tie beam and a faded painted plaster band.
  // Keep the rear hip and the dark lining seen from inside the God room.
  const shrineRoofTiles=shrineRoof.children.find(o=>o.name==='Small shrine tiled roof tiles');
  // 14.44.14 / 14.46.10: no tiled skirt runs round the tall walls. The low roof keeps its eaves only over
  // the porch (in front of local z -1.10); behind that it is the room's ceiling, clipped inside the walls.
  const roofPositions=[],roofUvs=[];
  for(const s of [1,-1]){
    const E=[[s*2.45,0,-2.475],[0,1,-2.475],[0,1,-1.10],[s*2.45,0,-1.10]],Q=[[s*1.94,.208,-1.10],[0,1,-1.10],[0,1,.27],[s*1.811,.261,1.90],[s*1.94,.208,1.90]];
    const tris=[[E[0],E[1],E[2]],[E[0],E[2],E[3]],[Q[0],Q[1],Q[2]],[Q[0],Q[2],Q[3]],[Q[0],Q[3],Q[4]]];
    for(const t of tris)for(const v of s>0?t:[t[0],t[2],t[1]]){roofPositions.push(...v);roofUvs.push(v[0]*.36,v[2]*.36);}
  }
  for(const v of [[1.811,.261,1.90],[0,1,.27],[-1.811,.261,1.90]]){roofPositions.push(...v);roofUvs.push(v[0]*.36,v[2]*.36);}
  const openGable=new THREE.BufferGeometry();openGable.setAttribute('position',new THREE.Float32BufferAttribute(roofPositions,3));openGable.setAttribute('uv',new THREE.Float32BufferAttribute(roofUvs,2));openGable.computeVertexNormals();
  shrineRoofTiles.geometry.dispose();
  shrineRoofTiles.geometry=openGable;
  for(const f of shrineRoof.children.filter(o=>o.name==='Small shrine tiled roof fascia').slice(1)){shrineRoof.remove(f);f.geometry.dispose();}
  for(const side of [-1,1])K.beam(shrineRoof,'Small shrine tiled roof fascia',[side*2.45,3.56,5.525],[side*2.45,3.56,6.9],.15,'wood',.12);
  // The original short hip ridge no longer matches the open front gable.
  const oldRidge=shrineRoof.children.find(o=>o.name==='Small shrine tiled roof ridge');
  if(oldRidge){shrineRoof.remove(oldRidge);oldRidge.geometry.dispose();}
  K.beam(shrineRoof,'Small shrine tiled roof ridge',[0,4.665,5.525],[0,4.665,8.27],.15,'tile',.17);
  const roofLiningMaterial=shrineTimber.clone();roofLiningMaterial.side=THREE.DoubleSide;
  const roofLining=new THREE.Mesh(openGable,roofLiningMaterial);
  roofLining.name='God room dark timber roof lining';roofLining.position.copy(shrineRoofTiles.position);roofLining.position.y-=.055;shrineRoof.add(roofLining);
  const tileBack=new THREE.MeshStandardMaterial({color:'#665044',roughness:1});
  for(const side of [-1,1]){
    K.beam(shrineRoof,'God room entrance gable rafter',[side*2.45,3.54,5.55],[0,4.54,5.55],.16,shrineTimber,.19);
    for(let z=5.72;z<6.90;z+=.43)K.beam(shrineRoof,'God room exposed roof rafter',[side*2.32,3.58,z],[0,4.53,z],.075,shrineTimber,.095);
    for(let x=.18;x<2.3;x+=.27){
      const h=4.575-x/2.45;
      for(let z=5.77;z<6.90;z+=.34){
        const tile=K.box(shrineRoof,'God room visible clay tile underside',side*x,h,z,.255,.035,.325,tileBack);tile.rotation.z=-side*Math.atan(1/2.45);
      }
      K.beam(shrineRoof,'God room slender tile batten',[side*x,h-.035,5.58],[side*x,h-.035,6.91],.027,shrineTimber,.025);
    }
  }
  K.box(shrineRoof,'God room heavy entrance tie beam',0,4.025,6.78,4.15,.25,.31,shrineTimber);
  K.box(shrineRoof,'God room beam worn lower lip',0,3.895,6.60,4.18,.035,.06,verandaTimber);
  const gablePlaster=new THREE.Shape();gablePlaster.moveTo(-1.15,4.15);gablePlaster.lineTo(1.15,4.15);gablePlaster.lineTo(.16,4.55);gablePlaster.lineTo(-.16,4.55);gablePlaster.closePath();
  const gablePanel=new THREE.Mesh(new THREE.ShapeGeometry(gablePlaster),new THREE.MeshStandardMaterial({color:'#c0b9a2',roughness:1,side:THREE.DoubleSide}));gablePanel.name='God room pale gable plaster';gablePanel.position.z=6.62;shrineRoof.add(gablePanel);
  const friezeCanvas=document.createElement('canvas');friezeCanvas.width=1024;friezeCanvas.height=128;
  const fc=friezeCanvas.getContext('2d');fc.fillStyle='#bfb59b';fc.fillRect(0,0,1024,128);fc.strokeStyle='#876553';fc.lineWidth=5;
  fc.beginPath();fc.moveTo(0,14);fc.lineTo(1024,14);fc.moveTo(0,113);fc.lineTo(1024,113);fc.stroke();
  for(let x=0;x<1024;x+=128){fc.beginPath();fc.moveTo(x,64);fc.lineTo(x+64,22);fc.lineTo(x+128,64);fc.lineTo(x+64,106);fc.closePath();fc.stroke();
    fc.fillStyle='#8c6a57';for(let i=0;i<8;i++){fc.save();fc.translate(x+64,64);fc.rotate(i*Math.PI/4);fc.beginPath();fc.ellipse(0,12,4,15,0,0,Math.PI*2);fc.fill();fc.restore();}}
  for(let i=0;i<750;i++){fc.fillStyle=i%2?'#d1c9ae55':'#635e4020';fc.fillRect(i*137%1024,i*37%128,3+i%13,2+i%6);}
  const friezeMap=new THREE.CanvasTexture(friezeCanvas);friezeMap.colorSpace=THREE.SRGBColorSpace;
  const frieze=new THREE.Mesh(new THREE.PlaneGeometry(1.50,.17),new THREE.MeshStandardMaterial({map:friezeMap,roughness:1,side:THREE.DoubleSide}));frieze.name='God room faded floral diamond frieze';frieze.position.set(0,4.24,6.606);shrineRoof.add(frieze);
  const switchPlate=new THREE.MeshStandardMaterial({color:'#ad965b',roughness:.9});
  K.box(g,'God room old entrance switch plate',.76,3.79,6.78,.17,.23,.055,switchPlate);
  K.box(g,'God room old ivory switch',.76,3.80,6.742,.055,.07,.025,'plaster');
  K.beam(g,'God room entrance surface wire',[.76,3.91,6.74],[.76,4.0,6.61],.009,'black');

  // IMG_20130720_182826, user-labelled looking back toward the entry:
  // stained gable plaster, a heavy tie beam and an old suspended tube fitting.
  K.box(entryRoof,'Entrance return heavy weathered tie beam',0,3.54,5.92,4.38,.20,.12,shrineTimber);
  const returnGable=new THREE.Shape();returnGable.moveTo(-2.02,3.65);returnGable.lineTo(2.02,3.65);returnGable.lineTo(.12,4.48);returnGable.lineTo(-.12,4.48);returnGable.closePath();
  const stainCanvas=document.createElement('canvas');stainCanvas.width=512;stainCanvas.height=256;
  const sc=stainCanvas.getContext('2d');sc.fillStyle='#8a7160';sc.fillRect(0,0,512,256);
  let stainSeed=182826;const stainRandom=()=>{stainSeed=(Math.imul(stainSeed,1664525)+1013904223)>>>0;return stainSeed/4294967296;};
  for(let j=0;j<250;j++){
    const x=stainRandom()*512,y=stainRandom()*100,len=30+stainRandom()*170;
    sc.strokeStyle=j%3?'#c1bba360':'#48382e45';sc.lineWidth=1+stainRandom()*4;sc.beginPath();sc.moveTo(x,y);sc.lineTo(x-3+stainRandom()*6,y+len);sc.stroke();
  }
  for(let j=0;j<3500;j++){sc.fillStyle=j%2?'#392e2718':'#cdc7b51c';sc.fillRect(stainRandom()*512,stainRandom()*256,1+stainRandom()*7,1+stainRandom()*5);}
  const stainMap=new THREE.CanvasTexture(stainCanvas);stainMap.colorSpace=THREE.SRGBColorSpace;
  const returnGeom=new THREE.ShapeGeometry(returnGable),ruv=returnGeom.attributes.uv,rp=returnGeom.attributes.position;
  for(let j=0;j<ruv.count;j++)ruv.setXY(j,(rp.getX(j)+2.02)/4.04,(rp.getY(j)-3.65)/.83);
  const stainedPanel=new THREE.Mesh(returnGeom,new THREE.MeshStandardMaterial({map:stainMap,roughness:1,side:THREE.DoubleSide}));stainedPanel.name='Entrance return streaked plaster gable';stainedPanel.position.z=6.006;entryRoof.add(stainedPanel);
  const fittingPaint=new THREE.MeshStandardMaterial({color:'#b6b2a0',roughness:.87});
  const tubeGlass=new THREE.MeshStandardMaterial({color:'#dbded2',roughness:.5});
  K.box(entryRoof,'Entrance fluorescent metal channel',0,3.23,6.22,1.20,.065,.095,fittingPaint);
  const tube=K.cylinder(entryRoof,'Entrance fluorescent glass tube',0,3.17,6.265,.020,.020,1.14,tubeGlass,20);tube.rotation.z=Math.PI/2;
  for(const x of [-.58,.58])K.box(entryRoof,'Entrance fluorescent end socket',x,3.195,6.265,.038,.098,.055,fittingPaint);
  K.box(entryRoof,'Entrance fluorescent old ballast',-.13,3.25,6.265,.17,.048,.055,shrineTimber);
  for(const x of [-.20,.45])K.beam(entryRoof,'Entrance fluorescent hanging wire',[x,3.45,5.98],[x,3.27,6.22],.005,'black');
  // Tulsi pedestal is left of the projecting shrine, as in the plan.
  const tulsiStone=new THREE.MeshStandardMaterial({color:'#5b5347',roughness:.98,bumpMap:mat('stone').map,bumpScale:.018});
  // 14.52.16 / 14.48.31 / courtyard.jpg: a small pedestal (about 0.5 m base, 0.7 m tall) a metre from the shrine plinth.
  for(const [size,y,h] of [[.50,.10,.12],[.36,.37,.42],[.48,.65,.14]]) {
    b('Tulsi dark weathered stone pedestal',-4.45,y,8.0,size,h,size,tulsiStone,true);
  }
  b('Tulsi earth in planter',-4.45,.725,8,.40,.04,.40,'earth');
  K.cylinder(g,'Tulsi main stem',-4.45,1.08,8,.008,.016,.70,'wood',7);
  const leaves=[];
  for(let i=0;i<70;i++) {
    const a=i*2.3999,r=.05+(i%7)*.02,y=.95+(i%21)*.022;
    leaves.push({x:-4.45+Math.cos(a)*r,y,z:8+Math.sin(a)*r,rx:.25+i*.3,rz:a});
    if(i%12===0)K.beam(g,'Tulsi twig',[-4.45,y-.1,8],[-4.45+Math.cos(a)*r,y,8+Math.sin(a)*r],.006,'wood');
  }
  const leafmesh=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,4),mat('leaf'),leaves.length);
  const helper=new THREE.Object3D();
  leaves.forEach((p,i)=>{helper.position.set(p.x,p.y,p.z);helper.rotation.set(p.rx,0,p.rz);helper.scale.set(.034,.010,.056);helper.updateMatrix();leafmesh.setMatrixAt(i,helper.matrix);});
  leafmesh.name='Tulsi leaves';leafmesh.castShadow=true;g.add(leafmesh);
  // Small moist garden strips soften the open court, leaving its crossed paths clear.
  const weeds=[];
  let courtSeed=27092011;
  const courtRandom=()=>{courtSeed=(Math.imul(courtSeed,1664525)+1013904223)>>>0;return courtSeed/4294967296;};
  for(let i=0;i<6200;i++){const x=-7.9+courtRandom()*14.6,z=6.4+courtRandom()*7.7;
    // Leave the observed walking strips and cross-courtyard routes readable.
    if((x>-2.7&&x<2.7&&z<10.7)||Math.abs(x+3.7)<.6||Math.abs(z-10.8)<.6||Math.abs(z-6.9)<.5||Math.abs(x+5.4)<.65)continue;
    weeds.push({x,z,a:i*2.3999});}
  // Six folded triangles retain pointed leaf silhouettes at a fraction of
  // the old tiny spheres' cost. Reuse the existing deterministic placements.
  const weedGeometry=new THREE.BufferGeometry(),weedVertices=[];
  const weedEdge=[[0,0,-1],[-.82,0,-.48],[-.82,0,.48],[0,0,1],[.82,0,.48],[.82,0,-.48]];
  for(let i=0;i<6;i++)weedVertices.push(0,.5,0,...weedEdge[i],...weedEdge[(i+1)%6]);
  weedGeometry.setAttribute('position',new THREE.Float32BufferAttribute(weedVertices,3));weedGeometry.computeVertexNormals();
  const weedMaterial=mat('leaf').clone();weedMaterial.side=THREE.DoubleSide;
  const weedMesh=new THREE.InstancedMesh(weedGeometry,weedMaterial,weeds.length);
  weeds.forEach((p,i)=>{helper.position.set(p.x,.075+(i%5)*.016,p.z);helper.rotation.set(0,p.a,.1);helper.scale.set(.033+(i%4)*.012,.018,.055);helper.updateMatrix();weedMesh.setMatrixAt(i,helper.matrix);});weedMesh.name='Irregular courtyard ground cover';g.add(weedMesh);
  // 14.30.57 / 14.31.01: knee-low stems rise above the small ground
  // leaves in the west court. Keep the established crossing paths open.
  const uprightWeeds=weeds.filter((p,i)=>i%3===0&&p.x>-5.75&&p.x<-4.4&&p.z>8.6&&Math.abs(p.z-10.8)>.72);
  const weedStems=new THREE.InstancedMesh(new THREE.CylinderGeometry(.007,.012,1,5),weedMaterial,uprightWeeds.length);
  const uprightLeaves=new THREE.InstancedMesh(weedGeometry,weedMaterial,uprightWeeds.length*6);
  uprightWeeds.forEach((p,i)=>{
    const height=.24+(i%7)*.045;
    helper.position.set(p.x,.035+height/2,p.z);helper.rotation.set(0,p.a,0);helper.scale.set(1,height,1);helper.updateMatrix();weedStems.setMatrixAt(i,helper.matrix);
    for(let tier=0;tier<3;tier++)for(let side=0;side<2;side++){
      const angle=p.a+tier*.65+side*Math.PI,length=.08-tier*.013;
      helper.position.set(p.x+Math.sin(angle)*length*.72,.035+height*(.38+tier*.24),p.z+Math.cos(angle)*length*.72);
      helper.rotation.set(-.32,angle,.12);helper.scale.set(.038-tier*.005,.020,length);helper.updateMatrix();uprightLeaves.setMatrixAt(i*6+tier*2+side,helper.matrix);
    }
  });
  weedStems.name='West courtyard upright weed stems';uprightLeaves.name='West courtyard paired weed leaves';g.add(weedStems,uprightLeaves);
  const gardenLeaves=[];
  for(const [cx,cz] of [[-7.4,7.5],[-7.4,12.7],[5.9,7.5],[5.9,12.8]]) {
    for(let i=0;i<26;i++) {
      const a=i*2.3999,r=.14+(i%5)*.125;
      gardenLeaves.push({x:cx+Math.cos(a)*r,y:.17+(i%4)*.13,z:cz+Math.sin(a)*r,a});
    }
  }
  // Broad pointed leaves fanning up and outwards from each clump (they were stretched spheres,
  // which read as green lumps).
  const garden=new THREE.InstancedMesh(weedGeometry,weedMaterial,gardenLeaves.length);
  gardenLeaves.forEach((p,i)=>{helper.position.set(p.x,p.y*.8+.06,p.z);helper.rotation.set(-.55-(i%3)*.12,p.a,0,'YXZ');helper.scale.set(.10+(i%3)*.02,.03,.24+(i%4)*.03);helper.updateMatrix();garden.setMatrixAt(i,helper.matrix);});
  garden.name='Courtyard leafy garden strips';garden.castShadow=true;g.add(garden);
  // 14.30.57 / 14.31.01: the open court is overgrown with shin- to knee-high grass and weeds, not
  // bare soil with a few leaves. Tufts of tapered blades stand over the ground cover on the same
  // deterministic spots, so the walking strips and crossings stay clear.
  {const blades=[],tris=[];
   for(let i=0;i<5;i++){const a=i*2.4,dx=Math.cos(a),dz=Math.sin(a),n=blades.length/3;
     blades.push(-dz*.035,0,dx*.035, dz*.035,0,-dx*.035, dx*.09,.34+(i%3)*.07,dz*.09, dx*.17,.55+(i%3)*.08,dz*.17);tris.push(n,n+1,n+2,n+1,n+3,n+2);}
   const tuftGeometry=new THREE.BufferGeometry();tuftGeometry.setAttribute('position',new THREE.Float32BufferAttribute(blades,3));tuftGeometry.setIndex(tris);tuftGeometry.computeVertexNormals();
   const tuftMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.95,side:THREE.DoubleSide});
   // Taller and thicker in the west court (14.30.57); low and patchy beside the God room, where
   // 14.44.19 / 14.48.07 show mud between the weeds.
   const spots=weeds.filter((p,i)=>i%3===1&&(p.x<-3||(i*13)%7<4)),tufts=new THREE.InstancedMesh(tuftGeometry,tuftMaterial,spots.length),tint=new THREE.Color();
   const greens=['#55803a','#6f9644','#86a850','#4b7434','#7a9a4a'];
   spots.forEach((p,i)=>{const tall=(p.x<-3?.34:.2)+((i*7)%11)/11*(p.x<-3?.42:.24);
     helper.position.set(p.x,.04,p.z);helper.rotation.set(0,p.a*1.7,0);helper.scale.set(.8+(i%4)*.15,tall,.8+(i%3)*.2);helper.updateMatrix();tufts.setMatrixAt(i,helper.matrix);
     tufts.setColorAt(i,tint.set(greens[i%greens.length]));});
   tufts.name='Courtyard overgrown grass tufts';tufts.receiveShadow=true;g.add(tufts);}

  // 14.48.31 and 14.52.16 resolve the stair's direction: it runs along
  // the Tulsi side of the shrine, rising toward the upper front range.
  // 14.52.16 / 14.46.10 / 14.48.31: the stair stands only about two metres from the God room's plinth
  // (the strip was 3.4 m): the whole flight is 1.1 m nearer the shrine.
  const courtStairX=-5.65,courtStairFront=6.55,courtStairBack=12.10;
  const courtStairStone=mat('plaster').clone();courtStairStone.color.set('#807e70');
  const courtStairWall=mat('plaster').clone();courtStairWall.color.set('#858779');
  // 14.46.21: uneven moss and washed lime patches on the stair cheeks.
  const mossCanvas=document.createElement('canvas');mossCanvas.width=512;mossCanvas.height=128;
  const mossPaint=mossCanvas.getContext('2d'),mossImage=mossPaint.getImageData(0,0,512,128);
  const mossHash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
  const mossNoise=(x,y)=>{
    const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
    const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
    return (mossHash(ix,iy)*(1-sx)+mossHash(ix+1,iy)*sx)*(1-sy)+(mossHash(ix,iy+1)*(1-sx)+mossHash(ix+1,iy+1)*sx)*sy;
  };
  for(let y=0;y<128;y++)for(let x=0;x<512;x++){
    const broad=mossNoise(x/24,y/18),grain=mossHash(x,y),streak=mossNoise(x/4,y/80);
    const lime=Math.max(0,(broad-.56)*2.0),brightness=grain*23+streak*13;
    const i=(y*512+x)*4;
    mossImage.data[i]=48+brightness+lime*57;
    mossImage.data[i+1]=56+brightness+lime*60;
    mossImage.data[i+2]=35+brightness+lime*52;
    mossImage.data[i+3]=255;
  }
  mossPaint.putImageData(mossImage,0,0);
  const mossMap=new THREE.CanvasTexture(mossCanvas);mossMap.colorSpace=THREE.SRGBColorSpace;
  const stairMoss=new THREE.MeshStandardMaterial({map:mossMap,roughness:.98});
  const fadedCoping=mat('plaster').clone();fadedCoping.color.set('#b1827d');fadedCoping.roughness=.94;

  for(let i=0;i<24;i++){
    const z=courtStairBack-(i+.5)*(courtStairBack-courtStairFront)/24;
    const top=F+(i+1)*(U-F)/24;
    b('Courtyard exposed masonry stair tread',courtStairX,top-.075,z,.88,.15,(courtStairBack-courtStairFront)/24+.012,courtStairStone);
  }
  K.ramp(courtStairX,(courtStairFront+courtStairBack)/2,.88,courtStairBack-courtStairFront,'-z',F,U);
  K.beam(g,'Courtyard stair sloping underside',[courtStairX,F-.13,courtStairBack],[courtStairX,U-.13,courtStairFront],.89,courtStairWall,.18);
  for(const x of [courtStairX-.51,courtStairX+.51]){
    const cheek=new THREE.Shape();cheek.moveTo(courtStairFront,U-.16);cheek.lineTo(courtStairBack,F-.16);
    cheek.lineTo(courtStairBack,F+.73);cheek.lineTo(courtStairFront,U+.73);cheek.closePath();
    const cheekGeometry=new THREE.ExtrudeGeometry(cheek,{depth:.14,bevelEnabled:false});
    const cp=cheekGeometry.attributes.position,cu=cheekGeometry.attributes.uv;
    for(let i=0;i<cp.count;i++){
      const t=(cp.getX(i)-courtStairFront)/(courtStairBack-courtStairFront);
      const bottom=U-.16+(F-U)*t;cu.setXY(i,t,(cp.getY(i)-bottom)/.89);
    }
    const panel=new THREE.Mesh(cheekGeometry,stairMoss);
    panel.name='Courtyard stair continuous sloping parapet';panel.rotation.y=-Math.PI/2;panel.position.x=x+.07;panel.castShadow=true;panel.receiveShadow=true;g.add(panel);
    K.beam(g,'Courtyard stair red coping',[x,F+.74,courtStairBack],[x,U+.74,courtStairFront],.18,fadedCoping,.065);
    for(let i=0;i<24;i++){
      const z=courtStairBack-(i+.5)*(courtStairBack-courtStairFront)/24;
      const y=F+(i+.5)*(U-F)/24;
      K.blocker(x,z,.14,(courtStairBack-courtStairFront)/24,y-.17,y+.78);
    }
  }
  // The white wall below the flight encloses the room beside the planted strip.
  const underStair=new THREE.Shape();underStair.moveTo(courtStairFront,F);
  underStair.lineTo(courtStairBack,F);underStair.lineTo(courtStairFront,U-.18);underStair.closePath();
  const underWall=new THREE.Mesh(new THREE.ExtrudeGeometry(underStair,{depth:.14,bevelEnabled:false}),mat('plaster'));
  underWall.name='White room wall beneath courtyard stair';underWall.rotation.y=-Math.PI/2;underWall.position.x=courtStairX+.51;underWall.receiveShadow=true;g.add(underWall);
  for(let i=0;i<24;i++){
    const z=courtStairBack-(i+.5)*(courtStairBack-courtStairFront)/24;
    K.blocker(courtStairX+.44,z,.14,(courtStairBack-courtStairFront)/24,F,F+(i+.5)*(U-F)/24);
  }
  // 14.52.16 / courtyard.jpg: the white wall under the flight has a two-tier casement in a pale frame,
  // its upper leaves standing open into the strip (just past the lean-to's eave).
  {const frame=new THREE.MeshStandardMaterial({color:'#c9c3ae',roughness:.9}),glass=new THREE.MeshStandardMaterial({color:'#2a2f2c',roughness:.5});
   const wx=courtStairX+.51,z0=7.5,z1=8.2,y0=1.3,y1=2.6,zm=(z0+z1)/2,ym=(y0+y1)/2;
   b('Under-stair casement dark glazing',wx+.006,ym,zm,.012,y1-y0,z1-z0,glass);
   for(const y of [y0+.03,ym,y1-.03])b('Under-stair casement pale rail',wx+.02,y,zm,.04,.06,z1-z0,frame);
   for(const z of [z0+.03,zm,z1-.03])b('Under-stair casement pale stile',wx+.02,ym,z,.04,y1-y0,.06,frame);
   for(const s of [-1,1]){const pz=s<0?z0+.06:z1-.06,a=.96; // open about 55 degrees
     const leaf=b('Under-stair casement open upper leaf',wx+.04+.16*Math.sin(a),(ym+y1)/2,pz-s*.16*Math.cos(a),.32,(y1-ym)-.06,.025,frame);leaf.rotation.y=s*(Math.PI/2-a);
     const pane=b('Under-stair casement open leaf glass',wx+.04+.16*Math.sin(a),(ym+y1)/2,pz-s*.16*Math.cos(a),.22,(y1-ym)-.16,.03,glass);pane.rotation.y=s*(Math.PI/2-a);}}
  floor('Courtyard stair foot step',courtStairX,12.35,.88,.5,.21,'paleStone',.16);
  floor('Courtyard stair upper return landing',courtStairX,6.18,.88,.80,U,'paleStone',.18);
  // Loose corrugated sheet rests against the shrine plinth, below the stair view.
  const sheetGeometry=new THREE.PlaneGeometry(2.05,1.04,48,1),sp=sheetGeometry.attributes.position;
  for(let i=0;i<sp.count;i++)sp.setZ(i,.034*Math.cos(sp.getX(i)*Math.PI/.092));
  sheetGeometry.computeVertexNormals();
  const rustySheet=new THREE.Mesh(sheetGeometry,new THREE.MeshStandardMaterial({color:'#66483a',roughness:1,side:THREE.DoubleSide}));
  rustySheet.name='Corrugated sheet leaning against courtyard shrine base';
  rustySheet.rotation.set(-.65,Math.PI/2,0);rustySheet.position.set(-3.14,.43,8.65);g.add(rustySheet);
  // 14.48.31 / 14.46.10 (west) and 14.44.14 / 14.44.09 (east): rusty corrugated-iron lean-to roofs
  // cover the court's two front pockets, from under the upper floor down to a low eave, so the front
  // range behind them reads dark. Sizes from the photographs; the framing under them is not visible.
  {const rust=new THREE.MeshStandardMaterial({color:'#74524a',roughness:1,side:THREE.DoubleSide}); // 14.44.09: pale pinkish rust; kept a step darker because it rendered pale in the game
   for(const [x0,x1,z0,z1,y0,y1] of [[-5.05,-2.35,5.95,7.45,3.10,2.25],[2.35,7.25,5.95,7.75,3.25,2.60]]){
     const w=x1-x0,run=z1-z0,drop=y0-y1,len=Math.hypot(run,drop);
     const geo=new THREE.PlaneGeometry(w,len,Math.round(w/.0225),1),gp=geo.attributes.position;
     for(let i=0;i<gp.count;i++)gp.setZ(i,.03*Math.cos(gp.getX(i)*Math.PI/.045));
     geo.computeVertexNormals();
     const sheet=new THREE.Mesh(geo,rust);sheet.name='Courtyard rusty corrugated lean-to roof';
     sheet.rotation.x=-Math.PI/2+Math.atan2(drop,run);sheet.position.set((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);
     sheet.castShadow=sheet.receiveShadow=true;g.add(sheet);K.roofs.push(sheet);
     K.beam(g,'Courtyard lean-to eave timber',[x0,y1-.07,z1-.06],[x1,y1-.07,z1-.06],.07,shrineTimber,.09);
     K.beam(g,'Courtyard lean-to wall timber',[x0,y0-.07,z0+.04],[x1,y0-.07,z0+.04],.07,shrineTimber,.09);
     for(const x of [x0+.12,x1-.12])K.beam(g,'Courtyard lean-to slender prop',[x,(z0<6&&x<0)?.45:.45,z1-.06],[x,y1-.1,z1-.06],.05,shrineTimber);
   }}
  // 14.48.07: a long rust-red corrugated sheet leans on the God room's rear plinth, running past its
  // stair-side corner, with the stone basin at its foot. (Final coordinates: the rear ledge edge is z 12.455.)
  {const geo=new THREE.PlaneGeometry(2.4,1.04,56,1),gp=geo.attributes.position;
   for(let i=0;i<gp.count;i++)gp.setZ(i,.034*Math.cos(gp.getX(i)*Math.PI/.092));
   geo.computeVertexNormals();
   const rearSheet=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#8a5b48',roughness:1,side:THREE.DoubleSide}));
   rearSheet.name='Corrugated sheet leaning against shrine rear plinth';rearSheet.rotation.set(-.45,0,0);rearSheet.position.set(-2.0,.47,12.70);
   rearSheet.castShadow=rearSheet.receiveShadow=true;g.add(rearSheet);}
  // 14.48.07 / 14.48.11 / 14.48.31: in the rear strip by the God room's stair-side rear corner, at the foot of that sheet, a thick hollow stone basin with rainwater and a handled roller.
  const bowlStone=mat('plaster').clone();bowlStone.color.set('#8b8c83');bowlStone.roughness=.94;
  const bowlProfile=[[0,0],[.25,0],[.29,.035],[.325,.12],[.34,.27],[.337,.305],
    [.315,.32],[.284,.302],[.277,.25],[.251,.09],[.20,.065],[0,.065]];
  const grindingBowl=new THREE.Mesh(new THREE.LatheGeometry(bowlProfile.map(([r,y])=>new THREE.Vector2(r,y)),36),bowlStone);
  grindingBowl.name='Courtyard hollow stone grinding bowl';grindingBowl.position.set(-2.75,.035,13.3);grindingBowl.castShadow=grindingBowl.receiveShadow=true;g.add(grindingBowl);
  const bowlWater=new THREE.Mesh(new THREE.CircleGeometry(.277,36),new THREE.MeshStandardMaterial({color:'#666b50',roughness:.18,metalness:.18}));
  bowlWater.name='Courtyard grinding bowl standing water';bowlWater.rotation.x=-Math.PI/2;bowlWater.position.set(-2.75,.289,13.3);g.add(bowlWater);
  const handStone=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),bowlStone);
  handStone.name='Courtyard elongated grinding roller';handStone.scale.set(.105,.095,.225);handStone.rotation.y=-.35;handStone.position.set(-2.75,.322,13.3);handStone.castShadow=true;g.add(handStone);
  K.beam(g,'Courtyard grinding roller wooden handle',[-2.685,.322,13.125],[-2.626,.316,12.961],.038,verandaTimber);
  const smallStone=new THREE.Mesh(new THREE.SphereGeometry(.057,12,8),mat('stone'));
  smallStone.name='Courtyard bowl small dark rounded stone';smallStone.position.set(-2.94,.299,13.26);smallStone.scale.y=.75;g.add(smallStone);


  // Upper front range with airy perforated pink balcony.
  // User: the upstairs floor stops short of the God room, leaving a double-height space in
  // front of and above it (IMG_20130720_182845 looks up past a heavy beam to the roof).
  floor('Upper storey rear floor',0,2.9,23.75,2.2,U,'red',.22);
  for(const side of [-1,1])floor('Upper storey rear floor',side*7.2375,5.0,9.275,2.0,U,'red',.22);
  b('God room void heavy timber wall beam',0,U-.2,5.86,5.3,.4,.3,verandaTimber);
  b('God room void edge timber beam',0,U-.17,4.0,5.3,.34,.22,verandaTimber);
  for(const side of [-1,1])b('God room void side timber beam',side*2.6,U-.17,4.93,.22,.34,1.86,verandaTimber);
  b('Upstairs void guard rail',0,U+.9,4.06,5.2,.07,.07,verandaTimber);
  for(let x=-2.5;x<=2.51;x+=.625)b('Upstairs void guard rail post',x,U+.45,4.06,.06,.9,.06,verandaTimber);
  floor('Upper balcony floor',1.8625,.9,20.025,1.8,U,'red',.22);
  floor('Upper stair landing',10.2,6.37,3.5,1.28,U,'paleStone',.18);
  const facadeWhite=mat('plaster').clone();facadeWhite.color.setRGB(1.15,1.20,1.21);
  const facadeDark=new THREE.MeshStandardMaterial({color:'#343536',roughness:1});
  wallX('Upper room front wall',-11.85,11.85,1.75,U,2.83,[{c:-7.55,w:1.6,top:2.38},{c:-2.65,w:.95,bottom:.92,top:2.05},{c:2.5,w:.95,bottom:.92,top:2.05},{c:7.15,w:1.6,top:2.38}],facadeWhite);
  for(const x of [-7.55,7.15])doorX(x,1.75,1.6,U,2.38,1);
  for(const x of [-2.65,2.5]){
    b('Upper front small dark window',x,U+1.49,1.71,.95,1.13,.08,'wood');
    for(const dx of [-.50,.50])detail(x+dx,U+1.49,1.64,.07,1.26,.09,verandaTimber);
    for(const y of [U+.88,U+2.1])detail(x,y,1.64,1.07,.065,.09,verandaTimber);
  }
  // 14.44.14 / 14.44.48 / 14.48.31: seen from the court this wall is plain white down to a dark damp
  // strip at its foot, with no red band; the red slab edge under it is plastered over.
  skirting=false;
  wallX('Upper courtyard wall',-11.85,11.85,5.86,U,2.83,[{c:-5.65,w:.95,top:2.5},{c:-1.6,w:.86,bottom:.60,top:2.25},{c:3.6,w:.86,bottom:1.05,top:2.25},{c:10.2,w:1.7,top:2.5}],'plaster');
  skirting=true;
  detail(0,U+.10,5.99,23.7,.20,.012,facadeDark);
  for(const side of [-1,1])b('Upper floor court edge plaster',side*7.2375,U-.11,6.008,9.275,.22,.012,'plaster');
  doorX(10.2,5.86,1.7,U,2.5,-1);
  doorX(-5.65,5.86,.95,U,2.5,-1);
  // 14.44.14/48: tall narrow courtyard-facing timber window. The upper
  // half is shuttered; six bars cross the dark lower opening, facing +Z.
  const courtWindowWood=verandaTimber.clone();courtWindowWood.color.setRGB(1.25,1.13,1.04);
  b('Upper courtyard window dark recessed interior',-1.6,U+1.425,5.90,.85,1.65,.025,'black');
  for(const x of [-2.075,-1.125])b('Upper courtyard tall wooden window jamb',x,U+1.425,6.015,.10,1.82,.12,courtWindowWood);
  for(const y of [U+.555,U+2.295])b('Upper courtyard wooden window sill and head',-1.6,y,6.025,1.05,.095,.15,courtWindowWood);
  b('Upper courtyard window middle rail',-1.6,U+1.42,6.04,.90,.075,.095,courtWindowWood);
  for(let j=0;j<6;j++){
    const x=-1.969+j*.146;
    b('Upper courtyard closed upper shutter board',x,U+1.855,5.988,.14,.78,.055,courtWindowWood);
    b('Upper courtyard lower window iron bar',x,U+.98,6.035,.020,.76,.030,'metal');
  }
  // 14.44.14: the same kind of timber window, smaller, shows right of the God room's eave (it was a wide pale grille).
  {const cx=3.6,y0=U+1.05,y1=U+2.25,ym=(y0+y1)/2,hh=y1-y0;
   b('Upper courtyard east window dark recessed interior',cx,ym,5.90,.85,hh,.025,'black');
   for(const x of [cx-.475,cx+.475])b('Upper courtyard east window jamb',x,ym,6.015,.10,hh+.17,.12,courtWindowWood);
   for(const y of [y0-.045,y1+.045])b('Upper courtyard east window sill and head',cx,y,6.025,1.05,.095,.15,courtWindowWood);
   b('Upper courtyard east window middle rail',cx,y0+hh*.55,6.04,.90,.075,.095,courtWindowWood);
   for(let j=0;j<6;j++){const x=cx-.369+j*.146;
     b('Upper courtyard east window shutter board',x,y0+hh*.775,5.988,.14,hh*.45-.04,.055,courtWindowWood);
     b('Upper courtyard east window iron bar',x,y0+hh*.275,6.035,.020,hh*.55,.030,'metal');}}
  // Faint rain marks below the sill stay on the plaster surface.
  for(let j=0;j<8;j++)detail(-2.0+j*.112,U+.39+(j%3)*.018,5.988,.009,.22-(j%3)*.025,.005,'stone');

  wallZ('Upper west gable',-11.85,0,5.86,U,2.83,[],'plaster');
  wallZ('Upper east end wall',11.85,0,5.86,U,2.83,[{c:1.5,w:.72,bottom:.80,top:2.30},{c:4.18,w:.72,bottom:.80,top:2.30}],'plaster');
  // 14.59.36, from the temple: two tall narrow barred windows in this end wall.
  for(const z of [1.5,4.18]){
    b('Temple-facing upper window dark reveal',11.997,5.40,z,.025,1.50,.72,'wood');
    for(const dz of [-.43,.43])detail(12.025,5.40,z+dz,.10,1.70,.10,'wood');
    for(const y of [4.59,5.40,6.21])detail(12.025,y,z,.10,.10,.94,'wood');
    for(let dz=-.27;dz<=.28;dz+=.09)detail(12.07,5.40,z+dz,.045,1.48,.025,'wood');
  }
  // Approximate sparse room divisions retain a continuous passage at the back.
  for(const x of [-4.9,.15,5.3])wallZ('Upper room partition',x,1.75,5.78,U,2.75,[{c:4.6,w:1.55,top:2.4}],'plaster',.18);
  for(const x of [-7.2,-2.2,3.0,7.6])b('Upper limewashed column',x,5.30,.26,.38,2.9,.38,facadeWhite,true);
  b('Front upper dark timber eaves beam',0,6.58,.30,24.1,.30,.36,verandaTimber);
  const panel=new THREE.Shape();const pw=15.0,ph=.94;
  panel.moveTo(0,0);panel.lineTo(pw,0);panel.lineTo(pw,ph);panel.lineTo(0,ph);panel.closePath();
  for(let row=0;row<4;row++)for(let x=.16+(row%2)*.17;x<pw-.24;x+=.34){
    const y=.09+row*.212,hole=new THREE.Path();
    hole.moveTo(x,y);hole.lineTo(x,y+.15);hole.lineTo(x+.15,y+.15);hole.lineTo(x+.15,y);hole.closePath();panel.holes.push(hole);
  }
  const lattice=new THREE.Mesh(new THREE.ExtrudeGeometry(panel,{depth:.17,bevelEnabled:false}),mat('pink'));
  lattice.position.set(-7.2,U+.07,.22);lattice.name='Pink perforated masonry balcony';lattice.castShadow=true;lattice.receiveShadow=true;g.add(lattice);
  K.blocker(.3,.30,15,.19,U,U+1.03);
  detail(.3,U+1.03,.30,15.1,.095,.25,'pink');
  // Solid end balcony bays match the enclosure adjoining the facade stair.
  wallX('Lake-view left enclosed balcony bay',7.8,11.85,.3,U,2.83,[{c:10.2,w:.83,bottom:.68,top:2.21}],facadeWhite);
  grilleX(10.2,.15,.83,U+.68,1.53,facadeWhite,'black','wood'); // 15.23.35 / house-front.jpg: an unpainted timber window, dark inside
  b('Upper enclosed bay dark lower band',9.825,U+.33,.148,4.05,.66,.035,facadeDark); // house-front-left.jpg: the black band reaches the sill
  b('Upper stair-side wall dark lower band',-10.0,U+.20,1.605,3.65,.42,.035,facadeDark);
  b('Lake-view right stair enclosure',-7.7,U+.70,.3,1,1.4,.24,'aqua',true);

  // Photo facade: stair crosses the front-right wing behind stepped aqua masonry.
  floor('Front stair lower landing',-13.30,.95,1.1,1.75,F,'paleStone');
  floor('Front stair approach step',-14.05,.95,.5,1.75,.20,'paleStone');
  for(let i=0;i<22;i++){
    const x=-12.95+(i+.5)*4.8/22,y=F+(i+1)*(U-F)/22;
    // Overlap each riser slightly; the old .14 m slab left daylight between steps.
    const thickness=(U-F)/22+.02;
    b('Front-right masonry stair tread',x,y-thickness/2,.95,4.8/22+.015,thickness,1.65,'paleStone');
  }
  for(let i=0;i<6;i++){
    const x=-12.95+(i+.5)*.8,top=F+(i+1)*(U-F)/6+.9;
    for(const z of [.06,1.84])b('Front stair stepped turquoise parapet',x,(F+top)/2,z,.807,top-F,.17,'aqua',true);
  }
  K.column(g,'Front stair exposed timber support',-10.55,-.50,F,2.62,.16,verandaTimber);
  b('Front stair low horizontal timber beam',-10.6,3.12,-.50,5.55,.19,.29,verandaTimber);
  K.ramp(-10.55,.95,4.8,1.65,'x',F,U);
  floor('Front stair upper landing',-7.93,.95,.46,1.65,U,'red');
  // Landing edge leaves the back-wall door and stair opening unobstructed.
  fenceX(8.48,9.22,6.96,U,.95);
  fenceX(11.28,11.92,6.96,U,.95);
  fenceZ(11.93,5.9,6.95,U,.95);

  // Three roof levels preserve the open courtyard and the uncovered stair.
  // 15.23.35: the eave hangs low over the upper balcony (about 1.25 m of opening above the
  // lattice) and the roof above it rises about 2.8 m. Same ridge height as before; the eaves come
  // down to 6.0 and out by about a metre, so the walls under it keep their height.
  const atticRise=2.85,atticEave=6.0,atticHalfD=4.5,atticHalfW=13.45;
  const frontRoof=K.hipRoof(g,'Broad upper facade tiled roof',0,2.85,atticHalfW*2,atticHalfD*2,atticEave,atticRise);
  frontRoof.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.multiplyScalar(.67);}});
  // Actual overlapping, rippled courses give the front slopes a tiled silhouette.
  const tilePositions=[],tileUvs=[],tileIndices=[];
  for(let j=0;j<=3;j++)for(let i=0;i<=8;i++){
    const x=(i/8-.5)*.255,z=(j/3-.5)*.40;
    tilePositions.push(x,.012*Math.cos(i/8*Math.PI*4)+(j===0?.016:0),z);tileUvs.push(i/8,j/3);
    if(i<8&&j<3){const a=j*9+i;tileIndices.push(a,a+9,a+1,a+1,a+9,a+10);}
  }
  const tileGeometry=new THREE.BufferGeometry();tileGeometry.setAttribute('position',new THREE.Float32BufferAttribute(tilePositions,3));tileGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(tileUvs,2));tileGeometry.setIndex(tileIndices);tileGeometry.computeVertexNormals();
  const tileColors=['#675d62','#695f63','#635a5e','#6a6064','#665d61','#685e63']; // 15.23.35 (108,97,108): weathered grey-mauve in the afternoon shade
  const tilesOnSlope=(parent,name,rows)=>{
    const mesh=new THREE.InstancedMesh(tileGeometry,new THREE.MeshStandardMaterial({name:'house roof courses '+name.split(' ')[1],roughness:.98,side:THREE.DoubleSide}),rows.length),pose=new THREE.Object3D();
    rows.forEach((r,i)=>{pose.position.set(r.x,r.y+.025,r.z);pose.rotation.set(-r.angle,0,0);pose.scale.set(1,1,1);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);mesh.setColorAt(i,new THREE.Color(tileColors[(i*13+Math.floor(i/11))%tileColors.length]).multiplyScalar(name.includes('lower-')?.66:.88));});
    mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();parent.add(mesh);
  };
  const upperTileRows=[];
  for(let z=2.85-atticHalfD+.03;z<2.78;z+=.22){const t=(z-2.85+atticHalfD)/atticHalfD,edge=atticHalfW-atticHalfD*.9*t;for(let x=-edge+.13;x<edge;x+=.25)upperTileRows.push({x,y:atticEave+atticRise*t,z,angle:Math.atan2(atticRise,atticHalfD)});}
  tilesOnSlope(frontRoof,'Overlapping upper-front Mangalore tile courses',upperTileRows);
  // The front porch is a single slope, rising from the outer posts to the wall.
  const porchRoof=new THREE.Group();porchRoof.name='Front veranda sloping tiled awning';g.add(porchRoof);K.roofs.push(porchRoof);
  const porchGeometry=new THREE.BufferGeometry();
  const porchVertices=[],porchUvs=[];
  // 15.22.40 (the Ritz as a 1.62 m ruler) and 15.28.36: a deep, steep awning whose eave
  // hangs about 2.35 m above the lane, rising some 1.4 m to meet the wall under the lattice.
  const porchEndX=9.2,porchEaveZ=-1.8,porchHeight=z=>z<.5?2.35+(z-porchEaveZ)*1.4/(.5-porchEaveZ):3.75+(z-.5)*.23/1.58;
  for(const [za,zb] of [[porchEaveZ,.5],[.5,2.08]])for(const [x,z] of [[-7.8,za],[porchEndX,zb],[porchEndX,za],[-7.8,za],[-7.8,zb],[porchEndX,zb]]){ /* wound so the normals point up (the game shades by them) */porchVertices.push(x,porchHeight(z),z);porchUvs.push(x*.38,z*.38);}
  porchGeometry.setAttribute('position',new THREE.Float32BufferAttribute(porchVertices,3));
  porchGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(porchUvs,2));porchGeometry.computeVertexNormals();
  const porchMaterial=mat('tile').clone();porchMaterial.side=THREE.DoubleSide;
  const porchTiles=new THREE.Mesh(porchGeometry,porchMaterial);porchTiles.name='Entrance veranda roof tiles';porchTiles.castShadow=true;porchTiles.receiveShadow=true;porchRoof.add(porchTiles);
  K.beam(porchRoof,'Entrance porch outer fascia',[-7.8,2.30,porchEaveZ],[porchEndX,2.30,porchEaveZ],.16,verandaTimber,.14);
  K.beam(porchRoof,'Entrance porch wall plate on the posts',[-7.8,2.67,-1.25],[porchEndX,2.67,-1.25],.14,verandaTimber,.12);
  for(let x=-7.6;x<porchEndX;x+=.50)for(const [za,zb] of [[porchEaveZ,.5],[.5,2.08]])K.beam(porchRoof,'Entrance veranda exposed sloping rafter',[x,porchHeight(za)-.085,za],[x,porchHeight(zb)-.085,zb],.075,verandaTimber,.12);
  const porchTileRows=[];
  for(let z=porchEaveZ+.03;z<2.05;z+=.32)for(let x=-7.69;x<porchEndX;x+=.25)porchTileRows.push({x,y:porchHeight(z),z,angle:z<.5?Math.atan2(1.4,.5-porchEaveZ):Math.atan2(.23,1.58)});
  tilesOnSlope(porchRoof,'Overlapping lower-veranda Mangalore tile courses',porchTileRows);
  // A dark timber soffit conceals the red underside of the upper balcony slab.
  K.box(porchRoof,'Veranda timber ceiling underside',0,3.59,1.05,11.35,.035,2.04,verandaTimber);
  for(let x=-5.5;x<5.6;x+=.27)K.box(porchRoof,'Veranda close ceiling board joint',x,3.568,1.05,.012,.012,2.04,'black');
  const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute([-.5,0,0,.5,0,0,-.22,.55,.17,.22,.55,.17,.10,1,.55],3));blade.setIndex([0,1,2,1,3,2,2,3,4]);blade.computeVertexNormals();
  const roofGrowth=new THREE.InstancedMesh(blade,new THREE.MeshStandardMaterial({color:'#b5a67c',roughness:1,side:THREE.DoubleSide}),5200); // house-front.jpg / 15.23.35: a thick mat of dry grass over most of the awning
  const growthPose=new THREE.Object3D();
  for(let i=0;i<5200;i++){const x=-7.45+((i*173)%5197)/5197*(porchEndX+7.45-.3),z=porchEaveZ+.3+((i*317)%5189)/5189*(2.67+(-1.25-porchEaveZ));const dense=Math.sin(x*1.45+z*2.5)+Math.sin(x*.71-z*4)>(x>-4.5?-.75:.1);growthPose.position.set(x,porchHeight(z)+.035,z);growthPose.rotation.set(.15,i*2.3999,.25*Math.sin(i));growthPose.scale.set(dense?.03+(i%5)*.008:.012+(i%5)*.004,dense?.20+(i%9)*.028:.025,.18);growthPose.updateMatrix();roofGrowth.setMatrixAt(i,growthPose.matrix);}
  roofGrowth.name='Dry grass and moss on the lower tiled awning';porchRoof.add(roofGrowth);
  K.hipRoof(g,'West range tiled roof',-10.18,12.0,4.6,13.1,3.62,1.12);
  const rearRoof=K.hipRoof(g,'Rear veranda tiled roof',-.50,16.38,18.2,4.25,3.64,1.05);
  // 14.46.04 / 14.48.11: overlapping worn courses and dry grass on the
  // courtyard-facing slope, rather than an unbroken printed roof plane.
  const rearRows=[];
  for(let z=14.27;z<16.35;z+=.22){
    const t=(z-14.255)/2.125,edge=9.1-1.9125*t;
    for(let x=-.5-edge+.13;x<-.5+edge-.13;x+=.25)rearRows.push({x,y:3.64+1.05*t,z,angle:Math.atan2(1.05,2.125)});
  }
  tilesOnSlope(rearRoof,'Overlapping rear courtyard tile courses',rearRows);
  let roofSeed=4419;
  const roofRand=()=>{roofSeed=(Math.imul(roofSeed,1664525)+1013904223)>>>0;return roofSeed/4294967296;};
  const stems=[],stemColors=[];
  for(let patch=0;patch<105;patch++){
    const z=14.32+roofRand()*1.92,t=(z-14.255)/2.125,edge=9.1-1.9125*t;
    const x=-.5+(roofRand()-.5)*(edge*2-.45);
    for(let j=0;j<7;j++){
      const px=x+(roofRand()-.5)*.28,pz=z+(roofRand()-.5)*.09,py=3.64+1.05*(pz-14.255)/2.125+.045;
      const angle=roofRand()*Math.PI*2,len=.065+roofRand()*.14,lean=.14+roofRand()*.23;
      const c=new THREE.Color(j%3?'#939079':'#6f795d');
      const point=u=>[px+Math.cos(angle)*lean*u,py+Math.sin(angle)*lean*u*1.05/2.125+len*Math.sin(u*Math.PI*.85),pz+Math.sin(angle)*lean*u];
      // Tapered double-sided ribbons, not GL lines: lines alias to 1 px and drop out of the Unreal export.
      const side=[-Math.sin(angle),0,Math.cos(angle)],half=u=>.014*(1-u*.8);
      for(let segment=0;segment<4;segment++){
        const u0=segment/4,u1=(segment+1)/4,a=point(u0),b=point(u1);
        const a0=a.map((v,k)=>v-side[k]*half(u0)),a1=a.map((v,k)=>v+side[k]*half(u0)),b0=b.map((v,k)=>v-side[k]*half(u1)),b1=b.map((v,k)=>v+side[k]*half(u1));
        stems.push(...a0,...a1,...b1,...a0,...b1,...b0);
        for(let k=0;k<6;k++)stemColors.push(c.r,c.g,c.b);
      }
    }
  }
  const grassGeom=new THREE.BufferGeometry();grassGeom.setAttribute('position',new THREE.Float32BufferAttribute(stems,3));grassGeom.setAttribute('color',new THREE.Float32BufferAttribute(stemColors,3));grassGeom.computeVertexNormals();
  const roofGrass=new THREE.Mesh(grassGeom,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));roofGrass.name='Rear roof scattered dry grass between tiles';rearRoof.add(roofGrass);
  // 14.46.04 / 14.46.21 / 14.48.11 / 14.52.16: the white gutter hangs only on the west half of this eave, from
  // just west of the carved post to past the stair, with a thinner white pipe beside it; under the east
  // half a few long poles are stored instead.
  const gutterMat=K.M.plaster.clone();gutterMat.color.set('#dbd5cc');
  const gutter=K.cylinder(rearRoof,'Rear veranda pale rain gutter',-5.6,3.48,14.19,.065,.065,5.6,gutterMat,16);gutter.rotation.z=Math.PI/2;
  const gutterPipe=K.cylinder(rearRoof,'Rear veranda thin white pipe under the gutter',-5.2,3.35,14.27,.028,.028,4.8,gutterMat,10);gutterPipe.rotation.z=Math.PI/2;
  for(const x of [-8.0,-6.6,-5.2,-3.8,-3.0])K.beam(rearRoof,'Rear gutter timber support',[x,3.42,14.52],[x,3.42,14.10],.045,verandaTimber);
  {const poleWood=new THREE.MeshStandardMaterial({color:'#5a4e3e',roughness:1});
   for(let i=0;i<4;i++){const pole=K.cylinder(rearRoof,'Rear eave stored bamboo pole',.8+i*.12,3.185,14.28+i*.065,.025,.03,5.0-i*.25,poleWood,8);pole.rotation.z=Math.PI/2;}
   for(const x of [-1.2,2.9])K.beam(rearRoof,'Rear eave pole sling',[x,3.145,14.24],[x,3.145,14.52],.02,poleWood,.02);}

  // Cover the full passage up to the exterior wall; the old narrow strip
  // left a 2.5 m opening beside the enclosed east rooms.
  const eastPassageRoof=K.hipRoof(g,'East passage continuous tiled roof',9.65,10.1,5.05,8.8,3.6,.90);
  // 14.30.57 / 14.31.01 / 14.44.09: along the court side of this roof a close row of rafter ends shows under
  // the tiles, resting on the eave beam; there is no fascia board in front of them.
  {const box=new THREE.Box3();
   for(const o of eastPassageRoof.children.filter(o=>/fascia$/.test(o.name))){box.setFromObject(o);
     if(box.max.x<7.4&&box.max.z-box.min.z>4){eastPassageRoof.remove(o);o.geometry.dispose();}}
   for(let z=5.90;z<14.4;z+=.28)K.beam(eastPassageRoof,'East veranda exposed rafter end',[7.13,3.535,z],[7.76,3.76,z],.07,verandaTimber,.10);}
  // 14.31.14 / 14.31.25: flat, closely joisted ceiling over the clock-side
  // veranda. Keep all overhead members with the liftable roof assembly.
  const ceilingTimber=verandaTimber.clone();ceilingTimber.color.set('#80817a'); // 14.31.14 / 14.31.25: the ceiling is near-black (about 30,28,24)
  K.box(eastPassageRoof,'East passage continuous roof dark timber lining',9.61,3.535,10.1,4.35,.045,8.12,ceilingTimber);
  for(let z=6.13;z<14.13;z+=.34)
    K.box(eastPassageRoof,'East passage exposed ceiling cross joist',9.61,3.425,z,4.35,.175,.075,ceilingTimber);
  for(const x of [7.43,11.70])K.box(eastPassageRoof,'East passage longitudinal ceiling bearer',x,3.365,10.1,.15,.20,8.16,ceilingTimber);
  // 14.31.25 / 14.31.43 / 14.31.14: a plain weathered blue-grey beam runs along the wall top; only over the
  // clock does a board with stepped scallops at each end hang under it.
  const wallBeamTimber=verandaTimber.clone();wallBeamTimber.color.set('#8f98a4');
  K.box(eastPassageRoof,'Clock-side veranda timber wall beam',11.63,3.37,9.91,.10,.30,7.82,wallBeamTimber);
  const clockBracket=new THREE.Shape();clockBracket.moveTo(0,3.22);clockBracket.lineTo(1.30,3.22);clockBracket.lineTo(1.30,3.14);
  clockBracket.quadraticCurveTo(1.22,3.16,1.16,3.09);clockBracket.quadraticCurveTo(1.08,3.11,1.02,3.02);clockBracket.lineTo(.28,3.02);
  clockBracket.quadraticCurveTo(.22,3.11,.14,3.09);clockBracket.quadraticCurveTo(.08,3.16,0,3.14);clockBracket.closePath();
  const beamFrieze=new THREE.Mesh(new THREE.ExtrudeGeometry(clockBracket,{depth:.10,bevelEnabled:false}),wallBeamTimber);
  beamFrieze.name='Clock-side veranda scalloped timber bracket';beamFrieze.rotation.y=-Math.PI/2;
  beamFrieze.position.set(11.68,0,7.45);beamFrieze.castShadow=beamFrieze.receiveShadow=true;eastPassageRoof.add(beamFrieze);
  for(const [a,e] of [[5.7,9.86],[11.04,17.74]])b('Clock-side veranda turquoise wall finish',11.735,1.97,(a+e)/2,.016,3.02,e-a,verandaAqua);
  // 14.30.57 / 14.31.01 / 14.31.14 (photo review): the rear wall's inner face is turquoise east of a dark
  // post beside the doorway's west pier (14.44.22 keeps the pale wash west of it), with a red dado on the east stretch.
  {const dado=new THREE.MeshStandardMaterial({color:'#7a2f28',roughness:.8}),Z=17.742;
   for(const [x0,x1,y0,y1] of [[-4.2,-.95,F,F+3],[-.95,.95,F+2.5,F+3],[.95,4.88,F,F+3],[4.88,5.15,F,F+3],[5.15,6.25,F,F+.8],[5.15,6.25,F+2.1,F+3],[6.25,11.727,F,F+3]])
     b('Rear veranda turquoise wall finish',(x0+x1)/2,(y0+y1)/2,Z,x1-x0,y1-y0,.016,verandaAqua);
   for(const [x0,x1] of [[2.92,11.727]])b('Rear veranda red dado',(x0+x1)/2,F+.225,Z-.012,x1-x0,.45,.012,dado);
   b('Rear veranda dark post at the colour change',-4.2,F+1.5,17.66,.18,3.0,.18,'wood');
   // 14.30.57: an unpainted timber window, iron bars in its left half and a plank shutter in the right;
   // bare plaster shows where the turquoise wash has come away around it.
   const oldTimber=new THREE.MeshStandardMaterial({color:'#4a3a2c',roughness:.95}),dark=new THREE.MeshStandardMaterial({color:'#15120f',roughness:1}),plank=new THREE.MeshStandardMaterial({color:'#5a4634',roughness:.95});
   b('Rear veranda timber window frame',5.7,F+1.45,17.72,1.26,1.46,.10,oldTimber);
   b('Rear veranda window dark opening',5.975,F+1.45,17.664,.51,1.26,.012,dark);
   for(let i=0;i<5;i++)b('Rear veranda window iron bar',5.775+i*.10,F+1.45,17.648,.03,1.26,.03,dark);
   b('Rear veranda window mid rail',5.975,F+1.45,17.648,.51,.045,.035,oldTimber);
   b('Rear veranda window plank shutter',5.425,F+1.45,17.655,.53,1.26,.03,plank);
   for(const x of [5.29,5.425,5.56])b('Rear veranda window shutter joint',x,F+1.45,17.638,.008,1.26,.004,dark);
   // 14.30.57 / 14.31.01: the loss is ragged sheets, not spots: a pale band of bare plaster stands on the dado
   // up to the sill, climbs to the window head on the window's east side, and is deeper red-brown at its foot there.
   {let seed=3057;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    // mottled like broken plaster: paler lime skin, darker damp and a few red laterite grains
    const mottle=(base,marks)=>paintedMap(256,(c,s)=>{c.fillStyle=base;c.fillRect(0,0,s,s);
      for(let i=0;i<170;i++){c.fillStyle=`rgba(${marks[i%marks.length]},${.10+rnd()*.22})`;c.beginPath();c.ellipse(rnd()*s,rnd()*s,3+rnd()*18,2+rnd()*9,rnd()*3,0,Math.PI*2);c.fill();}},1);
    const bare=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,map:mottle('#b48f7c',['214,196,178','150,104,84','188,150,120','126,92,78'])});
    const deep=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,map:mottle('#9a5a40',['128,62,44','176,112,78','104,58,46'])});
    const ragged=(name,profile,material,dz)=>{ // profile: [x, top edge above F]; the foot stands on the dado top
      const s=new THREE.Shape();s.moveTo(-profile[0][0],F+.45);
      for(let i=0;i<profile.length-1;i++){const [xa,ha]=profile[i],[xb,hb]=profile[i+1],n=Math.max(1,Math.round((xb-xa)/.11));
        for(let k=0;k<n;k++){const t=k/n;s.lineTo(-(xa+(xb-xa)*t+(rnd()-.5)*.05),F+Math.max(.47,ha+(hb-ha)*t+(rnd()-.5)*.16));}}
      s.lineTo(-profile.at(-1)[0],F+.45);s.closePath();
      const m=new THREE.Mesh(new THREE.ShapeGeometry(s),material);m.name=name;m.rotation.y=Math.PI;m.position.set(0,0,Z-dz);g.add(m);};
    ragged('Rear veranda bare plaster where the wash has fallen',[[2.95,.47],[3.5,.56],[4.3,.70],[5.0,.82],[6.36,.84],[6.42,1.25],[6.52,1.5],[6.8,1.62],[6.95,2.0],[7.2,2.2],[7.55,2.1],[7.8,1.62],[8.05,1.4],[8.35,1.0],[8.9,.8],[9.6,.62],[11.0,.52],[11.7,.47]],bare,.0095);
    ragged('Rear veranda deeper bare laterite',[[6.2,.47],[6.35,.7],[6.6,.92],[6.95,1.0],[7.3,.86],[7.6,.62],[7.8,.47]],deep,.0105);}}
  K.beam(eastPassageRoof,'Clock-side ceiling bulb cable',[9.7,3.43,10.15],[9.7,3.03,10.15],.008,'black');
  K.cylinder(eastPassageRoof,'Clock-side ceiling bulb holder',9.7,3.005,10.15,.025,.033,.065,'cream',10);
  const corridorBulb=new THREE.Mesh(new THREE.SphereGeometry(.047,12,9),mat('cream'));
  corridorBulb.name='Clock-side veranda hanging bare bulb';corridorBulb.position.set(9.7,2.935,10.15);corridorBulb.scale.y=1.35;eastPassageRoof.add(corridorBulb);

  K.hipRoof(g,'East rear service roof',10.1,15.8,4.2,5.25,3.62,.85);
  // 15.22.40: a long whitewashed single-storey wing with a black dado runs on from the
  // veranda's far door, under the upper enclosed room and some 7.5 m past the upper
  // storey, its hipped tile roof taking over from the veranda awning. Solid: its rooms
  // are not photographed. About three car lengths (the Ritz in 15.22.40), ending at the side road.
  const wingX0=9.2,wingX1=16.4-(K.houseShiftX||0),wingZ0=-.9,wingZ1=4.9,wingCx=(wingX0+wingX1)/2,wingCz=(wingZ0+wingZ1)/2;
  const endWhite=mat('plaster').clone();endWhite.color.set('#f1eced');
  const dampBase=new THREE.MeshStandardMaterial({color:'#2f302c',roughness:1});
  b('Temple-side long white wing',wingCx,1.36,wingCz,wingX1-wingX0,2.42,wingZ1-wingZ0,endWhite,true);
  // Photo review (15.23.35 and three lane views): the black dado is about 0.9 m high on the lane face,
  // lower at the back, and the east end wall has none.
  b('Temple-side wing black dado',wingCx,.46,wingZ0-.015,wingX1-wingX0,.92,.03,dampBase);
  b('Temple-side wing black dado',wingCx,.23,wingZ1+.015,wingX1-wingX0,.46,.03,dampBase);
  b('Temple-side wing small barred front window',13.6,1.55,wingZ0-.02,.62,.78,.04,'wood');
  for(const x of [13.4,13.53,13.66,13.79])detail(x,1.55,wingZ0-.05,.018,.74,.018,dampBase);
  b('Temple-side wing front wall slit',11.2,1.6,wingZ0-.02,.2,.62,.035,'wood');
  // house-front-left.jpg / 14.28.15: no second window at the far end of the wing's lane face.
  // 15.23.35 / 15.23.32: the wing's roof is taller than the wall under it. Its ridge runs into the
  // house's east wall (x 11.975) rather than through the upstairs floor; only a low strip of the
  // lane slope continues in front of the upper bay, where the old fascia stopped (x 9.28).
  const wingRoof=new THREE.Group();wingRoof.name='Temple-side wing hipped tiled roof';g.add(wingRoof);K.roofs.push(wingRoof);
  {const xe=wingX1+1.0,zl=wingZ0-.95,zr=wingZ1+.95,eave=2.42,ridge=5.02,inset=Math.min((zr-zl)*.45,(xe-9.28)*.4);
   const V={A:[9.28,eave,zl],A2:[11.975,eave,zl],B:[xe,eave,zl],C:[xe,eave,zr],D:[11.975,eave,zr],W:[11.975,ridge,wingCz],E:[xe-inset,ridge,wingCz],S1:[9.28,3.79,.175],S2:[11.975,3.79,.175]};
   const pos=[],uv=[];for(const f of [['A2','B','E'],['A2','E','W'],['A','A2','S2'],['A','S2','S1'],['C','D','W'],['C','W','E'],['B','C','E']]){
     // Wind every face so its normal points up: the game shades by the true normal and showed this roof black.
     const [p0,p1,p2]=f.map(k=>V[k]),ny=(p1[2]-p0[2])*(p2[0]-p0[0])-(p1[0]-p0[0])*(p2[2]-p0[2]);
     for(const k of ny<0?[f[0],f[2],f[1]]:f){pos.push(...V[k]);uv.push(V[k][0]*.36,V[k][2]*.36);}}
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();
   const tiles=K.M.tile.clone();tiles.side=THREE.DoubleSide;
   const mesh=new THREE.Mesh(geo,tiles);mesh.name='Temple-side wing hipped tiled roof tiles';mesh.castShadow=mesh.receiveShadow=true;wingRoof.add(mesh);
   for(const [a,c] of [['A','B'],['B','C'],['C','D']])K.beam(wingRoof,'Temple-side wing hipped tiled roof fascia',[V[a][0],eave-.095,V[a][2]],[V[c][0],eave-.095,V[c][2]],.15,'wood',.12);
   K.beam(wingRoof,'Temple-side wing hipped tiled roof ridge',[V.W[0],ridge+.025,V.W[2]],[V.E[0],ridge+.025,V.E[2]],.15,'tile',.17);}
  // Closed, weathered wooden door faces the temple; no invented room behind it.
  b('Temple-facing block worn door jamb',wingX1+.03,1.18,1.5,.09,2.0,1.08,'paleStone');
  b('Temple-facing block closed timber door',wingX1+.09,1.1,1.5,.045,1.8,.82,'wood');
  for(const z of [1.15,1.33,1.50,1.67,1.84])detail(wingX1+.12,1.1,z,.022,1.75,.022,dampBase);
  b('Temple-facing block door threshold',wingX1+.12,.19,1.5,.38,.10,1.12,'stone');
  b('Temple-facing block stone boundary post',wingX1+2.1,.875,wingZ0+.7,.42,1.75,.22,new THREE.MeshStandardMaterial({color:'#3b3a35',roughness:1}),true); // 14.59.36 / 15.26.49: a dark slab about 1.75 m tall standing 2 m off the wing end
  const tarp=new THREE.MeshStandardMaterial({color:'#218fad',roughness:.88,side:THREE.DoubleSide});
  const tarpGeometry=new THREE.PlaneGeometry(2.5,1.8,18,18),tp=tarpGeometry.attributes.position;
  for(let i=0;i<tp.count;i++){
    const x=tp.getX(i),y=tp.getY(i),fold=.12*Math.sin(x*8+y*2)+.045*Math.sin(y*14);
    tp.setXYZ(i,x,y-.15*Math.cos(x*2.4),fold);
  }
  tarpGeometry.computeVertexNormals();const tarpSheet=new THREE.Mesh(tarpGeometry,tarp);tarpSheet.name='Blue tarp beside the temple-facing block';tarpSheet.rotation.y=Math.PI/2;tarpSheet.position.set(wingX1+.26,1.38,3.6);g.add(tarpSheet);
  // Roof framing is grouped with the cutaway roofs.
  const roofTimber=new THREE.Group();roofTimber.name='Exposed veranda roof rafters';g.add(roofTimber);K.roofs.push(roofTimber);
  for(let z=6.3;z<17.8;z+=.55) {
    K.beam(roofTimber,'West close-spaced rafter',[-12.15,3.7,z],[-8.02,3.58,z],.08,'wood',.11);
  }
  for(let x=-8.4;x<8;x+=.6)K.beam(roofTimber,'Rear close-spaced rafter',[x,3.6,14.25],[x,4.5,16.4],.075,'wood',.105);

  // Recognizable household objects are kept beside walls and out of routes.
  function chair(x,z,ry=0,base=F) {
    const place=(dx,y,dz,w,h,d,m='wood')=>detail(x+dx*Math.cos(ry)+dz*Math.sin(ry),y+base-F,z-dx*Math.sin(ry)+dz*Math.cos(ry),w,h,d,m,ry);
    place(0,F+.45,0,.65,.08,.69);
    place(0,F+.87,.30,.65,.66,.08);
    for(const xx of [-.28,.28]) {
      for(const zz of [-.27,.27])place(xx,F+.23,zz,.072,.45,.075);
      place(xx,F+.71,0,.085,.07,.78);place(xx,F+.59,-.24,.055,.27,.055);
    }
    for(let xx=-.2;xx<.25;xx+=.1)place(xx,F+.9,.255,.04,.55,.045);
    K.blocker(x,z,.78,.78,base,base+1.2);
  }
  // User's notes: the raised sitting bays either side of the entry are empty (the red
  // cupboard, curved-arm chairs, metal vessel and grey trunk were removed).
  chair(-10.85,6.0,Math.PI/2);chair(-10.85,7.45,Math.PI/2);
  chair(-6.7,16.95,Math.PI);chair(-5.5,16.95,Math.PI);
  // In the left bay the bench and chair stand against the transverse end wall.
  // 14.56.22 / 14.56.30: seat ~0.46 m above the bay, arms ~0.71 m,
  // exposed back uprights ~1.0 m; no broad back panel. Keep its placement.
  b('Entrance-left wooden bench',3.60,1.22,.86,.37,.07,1.28,verandaTimber);
  for(const z of [.35,1.36])b('Entrance-left bench leg',3.60,.98,z,.26,.44,.065,verandaTimber);
  b('Entrance-left chair seat',3.78,1.25,1.67,.62,.075,.57,verandaTimber);
  for(const x of [3.52,4.04])for(const z of [1.43,1.91])b('Entrance-left chair leg',x,1.0,z,.061,.51,.061,verandaTimber);
  for(const z of [1.42,1.92]){
    b('Entrance-left chair tall back upright',4.06,1.455,z,.055,.69,.055,verandaTimber);
    b('Entrance-left chair arm',3.74,1.50,z,.69,.06,.075,verandaTimber);
    b('Entrance-left chair front arm support',3.48,1.38,z,.05,.21,.05,verandaTimber);
    b('Entrance-left chair lower stretcher',3.78,.91,z,.55,.045,.045,verandaTimber);
  }
  K.blocker(3.80,1.67,.75,.64,.75,1.84);
  K.blocker(3.60,.86,.38,1.28,.75,1.25);
  // Open pale wall cupboard at the end of the sitting bay, beyond the posts.
  b('Veranda open pale cupboard back',4.90,2.12,.18,.045,1.78,.44,'paleStone');
  for(const z of [-.04,.40])b('Veranda cupboard side',4.76,2.12,z,.28,1.78,.045,'cream');
  for(const y of [1.23,1.68,2.13,2.58,3.01])b('Veranda cupboard open shelf',4.76,y,.18,.28,.035,.44,'cream');
  b('Veranda pale open cupboard door',4.48,2.12,-.055,.30,1.78,.03,'paleStone');
  b('Veranda far closed timber doorway',9.19,1.94,1.05,.11,2.93,1.92,verandaTimber,true);
  // veranda.jpg / 14.56.30 / 14.56.07: the walkway ends in a turquoise wall up to the rafters.
  {const sh=new THREE.Shape();[[-.98,.455],[.09,.455],[.09,3.41],[2.05,3.41],[2.05,3.63],[0,3.63],[0,3.34],[-.98,2.74]].forEach(([z,y],k)=>k?sh.lineTo(z,y):sh.moveTo(z,y));sh.closePath();
   const endWall=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:.10,bevelEnabled:false}),verandaAqua);endWall.name='Veranda east end turquoise wall';
   endWall.rotation.y=-Math.PI/2;endWall.position.x=9.19;endWall.castShadow=endWall.receiveShadow=true;g.add(endWall);
   K.blocker(9.14,-.445,.12,1.07,.455,2.8);b('Veranda east end red skirting',9.085,.70,-.445,.012,.49,1.07,verandaRed);}
  for(const z of [.13,1.05,1.97])b('Veranda far door vertical stile',9.115,1.94,z,.09,2.87,.10,verandaTimber);
  for(const y of [.54,1.43,3.31])b('Veranda far door horizontal rail',9.11,y,1.05,.10,.12,1.92,verandaTimber);
  b('Veranda far cup shelf',8.87,1.36,.82,.37,.065,1.77,verandaTimber);
  for(let i=0;i<8;i++){
    const z=.13+i*.19;K.cylinder(g,'Small pale cup on far veranda shelf',8.85,1.46,z,.045,.035,.14,'cream',12);
  }
  K.cylinder(g,'Blue flask on far veranda shelf',8.82,1.57,1.48,.074,.065,.38,'blue',12);
  const cablePoints=[[-5.4,3.27,.92],[-2.8,3.10,1.08],[0,3.29,1.20],[2.7,3.12,1.07],[5.5,3.30,.99],[8.6,3.0,.35]].map(p=>new THREE.Vector3(...p));
  const cable=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePoints),48,.009,5,false),mat('black'));cable.name='Loose veranda electrical wire';g.add(cable);
  for(const [x,z] of [[0,1.21],[7.1,.25]]){
    K.beam(g,'Veranda bulb hanging flex',[x,3.30,z],[x,3.00,z],.012,'black');
    K.cylinder(g,'Veranda bulb cream holder',x,2.98,z,.044,.055,.075,'cream',12);
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(.057,12,10),mat('cream'));bulb.name='Veranda bare hanging bulb';bulb.scale.y=1.3;bulb.position.set(x,2.91,z);g.add(bulb);
  }
  // Use only the photographed calendar region, without inventing its text.
  const calendarMap=new THREE.TextureLoader().load('./assets/veranda.jpg');calendarMap.colorSpace=THREE.SRGBColorSpace;
  const calGeo=new THREE.PlaneGeometry(.40,.60);{const g=calGeo.attributes.uv;for(let i=0;i<g.count;i++)g.setXY(i,.591+g.getX(i)*.026,.656+g.getY(i)*.101);}
  const calendar=new THREE.Mesh(calGeo,new THREE.MeshStandardMaterial({map:calendarMap,roughness:1}));
  calendar.name='Photographed veranda calendar';calendar.rotation.y=Math.PI;calendar.position.set(3.86,2.50,1.914);g.add(calendar);
  b('Small veranda table',-10.83,F+.57,8.85,.90,.09,.72,'wood',true);
  for(const dx of [-.36,.36])for(const dz of [-.27,.27])detail(-10.83+dx,F+.28,8.85+dz,.065,.56,.065,'wood');
  K.cylinder(g,'Table brass cup',-10.83,F+.68,8.85,.065,.052,.13,'gold',12);
  // 14.31.43: arched timber case, ivory numbered dial and floral lower glass.
  b('Clock bay vertical timber mounting strip',11.71,1.97,8.1,.055,3.02,.35,verandaTimber);
  const clock=new THREE.Group();clock.name='Photographed veranda pendulum clock';
  clock.position.set(11.68,2.55,8.1);clock.rotation.y=-Math.PI/2;g.add(clock);
  const caseShape=new THREE.Shape();caseShape.moveTo(-.215,-.415);
  caseShape.quadraticCurveTo(-.215,-.455,-.17,-.455);caseShape.lineTo(.17,-.455);
  caseShape.quadraticCurveTo(.215,-.455,.215,-.415);caseShape.lineTo(.215,.397);
  caseShape.bezierCurveTo(.12,.395,.08,.47,0,.47);caseShape.bezierCurveTo(-.08,.47,-.12,.395,-.215,.397);caseShape.closePath();
  const glassOpening=new THREE.Path();glassOpening.moveTo(-.153,-.318);glassOpening.lineTo(-.153,-.105);
  glassOpening.quadraticCurveTo(-.09,-.09,-.075,-.06);glassOpening.lineTo(.075,-.06);
  glassOpening.quadraticCurveTo(.09,-.09,.153,-.105);glassOpening.lineTo(.153,-.318);
  glassOpening.quadraticCurveTo(.11,-.30,.07,-.332);glassOpening.quadraticCurveTo(0,-.363,-.07,-.332);
  glassOpening.quadraticCurveTo(-.11,-.30,-.153,-.318);glassOpening.closePath();caseShape.holes.push(glassOpening);
  const caseWood=verandaTimber.clone();caseWood.color.set('#ae8c78');
  const caseMesh=new THREE.Mesh(new THREE.ExtrudeGeometry(caseShape,{depth:.19,bevelEnabled:true,bevelSegments:2,bevelSize:.006,bevelThickness:.006,steps:1}),caseWood);
  caseMesh.name='Clock curved wooden case with shaped pendulum opening';caseMesh.position.z=-.10;clock.add(caseMesh);
  const backing=new THREE.Mesh(new THREE.PlaneGeometry(.37,.83),new THREE.MeshStandardMaterial({color:'#39332e',roughness:.44}));
  backing.position.set(0,0,-.06);clock.add(backing);
  const dialCanvas=document.createElement('canvas');dialCanvas.width=dialCanvas.height=256;
  const dial=dialCanvas.getContext('2d');dial.fillStyle='#ded3b3';dial.fillRect(0,0,256,256);
  dial.fillStyle='#666051';dial.font='27px Georgia';dial.textAlign='center';dial.textBaseline='middle';
  for(let n=1;n<=12;n++){const angle=n*Math.PI/6;dial.fillText(String(n),128+Math.sin(angle)*96,128-Math.cos(angle)*96);}
  for(let n=0;n<60;n++){
    const angle=n*Math.PI/30;dial.strokeStyle='#746b596e';dial.lineWidth=n%5?1:2;dial.beginPath();
    dial.moveTo(128+Math.sin(angle)*117,128-Math.cos(angle)*117);dial.lineTo(128+Math.sin(angle)*(n%5?113:109),128-Math.cos(angle)*(n%5?113:109));dial.stroke();
  }
  for(const x of [88,168]){dial.fillStyle='#51493c';dial.beginPath();dial.arc(x,166,5,0,Math.PI*2);dial.fill();}
  const dialMap=new THREE.CanvasTexture(dialCanvas);dialMap.colorSpace=THREE.SRGBColorSpace;
  const clockFace=new THREE.Mesh(new THREE.CircleGeometry(.165,40),new THREE.MeshStandardMaterial({map:dialMap,roughness:.51}));
  clockFace.rotation.y=-Math.PI/2;clockFace.position.set(11.57,2.76,8.1);clockFace.name='Ivory wall clock face';g.add(clockFace);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.168,.006,7,40),caseWood);rim.position.set(0,.21,.115);clock.add(rim);
  K.beam(g,'Clock minute hand',[11.55,2.76,8.1],[11.55,2.76,7.955],.008,'black');
  K.beam(g,'Clock hour hand',[11.54,2.76,8.1],[11.54,2.702,8.025],.013,'black');
  const pendulumRod=new THREE.Mesh(new THREE.CylinderGeometry(.003,.003,.24,6),mat('gold'));pendulumRod.position.set(0,-.14,.008);clock.add(pendulumRod);
  const bob=new THREE.Mesh(new THREE.CircleGeometry(.052,20),mat('gold'));bob.position.set(0,-.26,.013);clock.add(bob);
  const etched=new THREE.MeshStandardMaterial({color:'#dddac1',roughness:.56});
  for(const side of [-1,1]){
    const flowerX=side*.093,flowerY=-.205;
    for(let petal=0;petal<10;petal++){
      const angle=petal*Math.PI/5,leaf=new THREE.Mesh(new THREE.CircleGeometry(1,8),etched);
      leaf.position.set(flowerX+Math.sin(angle)*.020,flowerY+Math.cos(angle)*.020,.10);
      leaf.scale.set(.006,.013,1);leaf.rotation.z=-angle;clock.add(leaf);
    }
    for(let j=0;j<5;j++){
      const leaf=new THREE.Mesh(new THREE.CircleGeometry(1,7),etched);
      leaf.position.set(side*(.104+.009*Math.sin(j*2)), -.115-j*.041,.10);
      leaf.scale.set(.0035,.011,1);leaf.rotation.z=side*(j%2?.55:-.55);clock.add(leaf);
    }
  }
  // Rear kitchen: low masonry stove, metal pots and an old storage shelf.
  b('Kitchen cooking platform',-10.9,F+.43,17.12,1.45,.86,1.05,'paleStone',true);
  b('Blackened stove top',-10.9,F+.885,17.12,1.45,.055,1.05,'black');
  for(const x of [-11.25,-10.55]) {
    K.cylinder(g,'Stove iron burner',x,F+.94,17.1,.18,.18,.045,'metal',16);
    K.cylinder(g,'Cooking pot',x,F+1.105,17.1,.20,.14,.28,'metal',16);
    K.cylinder(g,'Pot lid',x,F+1.255,17.1,.22,.19,.035,'metal',16);
    K.cylinder(g,'Lid knob',x,F+1.295,17.1,.035,.04,.055,'black',8);
  }
  // Clay water jar and circular washing basin shown in the back passage.
  K.cylinder(g,'Water storage vessel',-7.3,F+.38,16.95,.31,.26,.76,'earth',18,true);
  K.cylinder(g,'Vessel narrow rim',-7.3,F+.79,16.95,.23,.28,.07,'earth',18);
  K.cylinder(g,'Rear washing basin',-6.4,F+.13,15.2,.48,.44,.25,'paleStone',20,true);
  K.cylinder(g,'Basin dark interior',-6.4,F+.264,15.2,.36,.36,.025,'black',20);
  // A restrained clothesline recalls the lived-in passages without obstructing movement.
  K.beam(g,'Rear veranda clothesline',[-7.5,2.95,15.1],[5.8,2.90,15.1],.014,'black');
  for(const [x,w,h,color] of [[-5.5,.67,1.35,0xd5d4c5],[-4.55,.60,1.12,0xc2ad88],[.3,.78,1.18,0xe0d9c7],[1.10,.69,.78,0x982d41],[2.0,.43,1.40,0x9a5d85]]) {
    const geom=new THREE.PlaneGeometry(w,h,18,18),pos=geom.attributes.position;
    for(let i=0;i<pos.count;i++)pos.setZ(i,.025*Math.sin(pos.getX(i)*40)+.012*Math.sin(pos.getY(i)*9));
    geom.computeVertexNormals();
    const cloth=new THREE.Mesh(geom,new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide}));
    cloth.position.set(x,2.9-h/2,15.1);cloth.castShadow=true;cloth.receiveShadow=true;cloth.name='Cloth drying in rear veranda';g.add(cloth);
  }
  // Sparse upstairs rooms intentionally leave space for later family corrections.
  b('Upstairs simple wooden cot',-9.35,U+.34,4.2,2.2,.15,1.08,'wood',true);
  b('Cot woven sleeping surface',-9.35,U+.45,4.2,2.05,.10,1.0,'cream');
  for(const dx of [-.95,.95])for(const dz of [-.4,.4])detail(-9.35+dx,U+.17,4.2+dz,.08,.34,.08,'wood');
  b('Upstairs old trunk',4.05,U+.23,5.2,1.1,.46,.56,'wood',true);
  for(const x of [3.68,4.40])detail(x,U+.235,4.908,.045,.43,.026,'metal');

  // User's 14.37.50 note: the God room is deeper east-west (the photo looks back at the door from
  // in front of the altar; the door is 1.17x too large from the saved pose, 0.45 m more depth). Push the altar, rear wall and everything behind z 9.3 back by DEEP and
  // stretch whatever spans that line (side walls, floor, bands, roof), with their navigation.
  {const DEEP=1.85,CUT=9.3,b3=new THREE.Box3(),inX=(a,b)=>a>-2.7&&b<2.7,altar=/^(Altar |Shrine warm bulb|Shrine bulb cord)/;
   const stretch=(min,max)=>new THREE.Matrix4().makeTranslation(0,0,min).multiply(new THREE.Matrix4().makeScale(1,1,(max-min+DEEP)/(max-min))).multiply(new THREE.Matrix4().makeTranslation(0,0,-min));
   g.updateMatrixWorld(true);
   for(const o of g.children){b3.setFromObject(o);if(b3.isEmpty()||!inX(b3.min.x,b3.max.x)||b3.min.z<5.4||b3.max.z>10.8)continue;
     if(o===shrineRoof){ // keep the open front gable and its frieze; stretch only the rear half
       const Z0=8.3,Z1=b3.max.z,inv=new THREE.Matrix4();
       o.traverse(m=>{if(!m.isMesh)return;m.geometry=m.geometry.clone();inv.copy(m.matrixWorld).invert();m.geometry.applyMatrix4(m.matrixWorld);
         const pos=m.geometry.attributes.position;for(let i=0;i<pos.count;i++){const z=pos.getZ(i);if(z>Z0)pos.setZ(i,z+DEEP*(z-Z0)/(Z1-Z0));}
         m.geometry.applyMatrix4(inv);m.geometry.computeVertexNormals();m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();});}
     else if(altar.test(o.name)||b3.min.z>=CUT)o.position.z+=DEEP;else if(b3.max.z>CUT+.2)o.applyMatrix4(stretch(b3.min.z,b3.max.z));}
   for(const items of batches.values())for(const p of items){const z0=p.z-p.d/2,z1=p.z+p.d/2;if(!inX(p.x-p.w/2,p.x+p.w/2)||z0<5.4||z1>10.8)continue;
     if(z0>=CUT)p.z+=DEEP;else if(z1>CUT+.2){p.d+=DEEP;p.z+=DEEP/2;}}
   for(const c of K.colliders.slice(navStart.colliders)){if(!inX(c.minX,c.maxX)||c.minZ<5.4||c.maxZ>10.8)continue;
     const ofAltar=c.minZ>=8.6&&Math.abs(c.minX+c.maxX)<2.6; // pillars and ledge, in front of CUT but part of the altar
     if(c.minZ>=CUT||ofAltar){c.minZ+=DEEP;c.maxZ+=DEEP;}else if(c.maxZ>CUT+.2)c.maxZ+=DEEP;}
   for(const [x0,x1] of [[-1.93,altarX0-.14],[altarX1+.14,1.93]])K.blocker((x0+x1)/2,altarWallZ+DEEP,x1-x0,.14,shrineFloor,3.52);
   for(const r of [...K.surfaces.slice(navStart.surfaces),...K.ramps.slice(navStart.ramps)]){const z0=r.z-r.d/2,z1=r.z+r.d/2;if(!inX(r.x-r.w/2,r.x+r.w/2)||z0<5.4||z1>10.8)continue;
     if(z0>=CUT)r.z+=DEEP;else if(z1>CUT+.2){r.d+=DEEP;r.z+=DEEP/2;}}}
  // 14.44.14 / 14.44.48 / 14.46.04: from the court the God room block stands much taller than its
  // entrance: plain plaster walls run up past a third patterned band to a tiled roof whose eave is
  // just under the main block's rear eave. The low roof modelled above stays as the entrance porch
  // roof and the room's ceiling. Authored after the deepening pass, in final coordinates.
  {const base=3.56,top=5.3,z0=6.98,z1=11.97,zm=(z0+z1)/2,h=top-base,ym=(base+top)/2;
   const band=new THREE.MeshStandardMaterial({color:'#8a4b45',roughness:1});
   for(const x of [-2.05,2.05])b('Shrine tall upper wall',x,ym,zm,.22,h,z1-z0,'plaster'); // no fourth band at 4.18: the photos show three in all
   b('Shrine tall upper wall',0,ym,z1-.11,4.32,h,.22,'plaster');
   b('Shrine tall upper wall',0,ym,z0+.02,4.32,h,.2,'plaster');
   // 14.52.16 / 14.48.31 / 14.48.07: the west side stands on a moulded base about a metre high, a
   // ledge at room-floor level over a dentilled neck, a roll and three laterite courses.
   {const lat=new THREE.MeshStandardMaterial({color:'#8a7a5f',roughness:1}),latLow=new THREE.MeshStandardMaterial({color:'#6d7048',roughness:1}),skin=new THREE.MeshStandardMaterial({color:'#8b8474',roughness:1});
    b('Shrine west plinth ledge',-2.385,.96,9.475,.45,.12,5.15,'plaster');b('Shrine west plinth ledge weathered top',-2.385,1.024,9.475,.45,.008,5.15,skin);
    b('Shrine west plinth neck',-2.335,.84,9.475,.35,.12,5.15,'plaster');
    for(let z=6.99;z<12.01;z+=.18)b('Shrine west plinth dentil',-2.54,.84,z,.06,.06,.06,'plaster');
    b('Shrine west plinth roll',-2.37,.73,9.475,.42,.10,5.15,'plaster');
    for(const [x1,y,h,m] of [[-2.72,.575,.21,lat],[-2.78,.365,.21,lat],[-2.84,.148,.225,latLow]])b('Shrine west plinth laterite course',(x1-2.16)/2,y,9.475,-2.16-x1,h,5.15,m);
    K.blocker(-2.50,9.475,.68,5.15,.035,1.02);
    // Rear face (14.48.07 / 14.48.11): the same base, a little lower, with three white mouldings.
    b('Shrine rear plinth ledge',0,.89,12.25,5.22,.12,.41,'plaster');b('Shrine rear plinth ledge weathered top',0,.954,12.25,5.22,.008,.41,skin);
    for(const [z1,y] of [[12.37,.76],[12.29,.62],[12.21,.48]])b('Shrine rear plinth white moulding',0,y,(12.04+z1)/2,5.10,.14,z1-12.04,'plaster');
    b('Shrine rear plinth laterite base',0,.2225,(12.04+12.55)/2,5.22,.375,12.55-12.04,lat);
    K.blocker(0,12.30,5.22,.52,.035,.95);
    // East face (14.44.14 / 14.44.19): a mossy ledge over three white mouldings and a laterite base, with a kerb.
    const latRed=new THREE.MeshStandardMaterial({color:'#7a4a35',roughness:1}),mossSkin=new THREE.MeshStandardMaterial({color:'#5d6b3a',roughness:1});
    b('Shrine east plinth ledge',2.385,.94,9.475,.45,.12,5.15,'plaster');b('Shrine east plinth ledge moss',2.385,1.004,9.475,.45,.008,5.15,mossSkin);
    for(const [x1,y] of [[2.53,.81],[2.45,.67],[2.37,.53]])b('Shrine east plinth white moulding',(2.16+x1)/2,y,9.475,x1-2.16,.14,5.15,'plaster');
    b('Shrine east plinth laterite base',(2.16+2.50)/2,.2475,9.475,2.50-2.16,.425,5.15,latRed);
    b('Shrine east laterite kerb',2.76,.11,9.475,.12,.15,5.15,latRed);
    K.blocker(2.42,9.475,.52,5.15,.035,1.0);
    // 14.52.16 / 14.46.10: a black dado band runs along the side walls just above the ledge.
    b('Shrine west black dado',-2.168,1.145,9.475,.012,.25,4.95,'black');b('Shrine east black dado',2.168,1.11,9.475,.012,.22,4.95,'black');}
   const tall=K.hipRoof(g,'Shrine tall tiled roof',0,9.475,5.4,6.15,top,1.15);
   tall.traverse(o=>{if(o.isMesh&&/tiles$/.test(o.name)){o.material=o.material.clone();o.material.color.multiplyScalar(.7);}});
   for(let z=6.75;z<12.35;z+=.42)for(const side of [-1,1])K.beam(g,'Shrine tall roof exposed rafter',[side*2.68,top-.1,z],[side*2.0,top+.19,z],.06,shrineTimber,.08);
  }
  // All tiny repeated timber, grille and furniture parts are instanced by material.
  const unitBox=new THREE.BoxGeometry(1,1,1),o=new THREE.Object3D();
  for(const [material,items] of batches) {
    const mesh=new THREE.InstancedMesh(unitBox,material,items.length);
    mesh.name='House repeated '+(material.name||'trim');
    items.forEach((p,i)=>{o.position.set(p.x,p.y,p.z);o.rotation.set(0,p.ry,p.rz);o.scale.set(p.w,p.h,p.d);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});
    mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  }
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  K.labels.push({text:'Grandparents’ house',position:[0,7.8,2.5]},{text:'Open courtyard',position:[-3.2,1.0,11.8]},{text:'Family shrine',position:[0,3.9,8.0]},{text:'Tulsi',position:[-4.45,1.7,8]},{text:'Kitchen',position:[-10.2,3.25,15.2]});
  // 15.28.36 / 15.28.49: the west end bay carrying the outside stair is a pale-blue block from
  // ground to eaves, not white. (Local coordinates: the bay is x < -7.8.)
  {const paleBlue=K.M.plaster.clone();paleBlue.color.set('#a4d6de');const b3=new THREE.Box3();
   for(const o of g.children){if(!o.isMesh||!/^(Front room facade pier|Upper room front wall pier|Upper west gable pier|West exterior wall pier|Upper stair-side wall dark lower band)$/.test(o.name))continue;
     b3.setFromObject(o);if(b3.max.x<-8.1)o.material=o.name.includes('dark lower band')?o.material:paleBlue;}}
  // Place the house (authored with its front door at x=0) at K.houseShiftX, with its navigation.
  const hs=K.houseShiftX||0;g.position.x+=hs;
  for(const c of K.colliders.slice(navStart.colliders)){c.minX+=hs;c.maxX+=hs;}
  for(const r of [...K.surfaces.slice(navStart.surfaces),...K.ramps.slice(navStart.ramps)])r.x+=hs;
  for(const l of K.labels.slice(navStart.labels))l.position=[l.position[0]+hs,l.position[1],l.position[2]];
  return g;
}
