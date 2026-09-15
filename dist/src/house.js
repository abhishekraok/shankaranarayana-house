import * as THREE from 'three';

// Editable reconstruction of the supplied ground-floor plan, facing -Z.
// Dimensions and unseen upper rooms are estimates; source photographs control
// the characteristic timber, turquoise plaster, oxide floors and roof forms.
export function buildHouse(K) {
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
  const timberMap=new THREE.CanvasTexture(oldTimberCanvas);timberMap.colorSpace=THREE.SRGBColorSpace;timberMap.wrapS=timberMap.wrapT=THREE.RepeatWrapping;
  const verandaTimber=new THREE.MeshStandardMaterial({map:timberMap,bumpMap:timberMap,bumpScale:.0015,roughness:.96});
  const verandaAqua=K.M.aqua.clone();verandaAqua.color.setRGB(1.12,1.22,1.19);
  const verandaRed=K.M.red.clone();verandaRed.color.setRGB(1.15,1.02,1.06);verandaRed.roughness=.76;
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
  function doorX(x,z,width=1.65,y=F,h=2.45,side=1) {
    detail(x-width/2-.075,y+h/2,z,.15,h,.37,'wood');
    detail(x+width/2+.075,y+h/2,z,.15,h,.37,'wood');
    detail(x,y+h+.06,z,width+.3,.18,.4,'wood');
    detail(x,y+h+.21,z,width+.42,.12,.32,'wood');
    // Open double shutters sit against the jambs and leave the route clear.
    for(const s of [-1,1]) {
      if(side===0){detail(x+s*(width*.75+.10),y+h*.48,z-.21,width*.46,h*.96,.075,'wood');continue;}
      const px=x+s*(width/2+.025),pz=z+side*width*.23;
      detail(px,y+h*.48,pz,.075,h*.96,width*.46,'wood');
      detail(px+s*.04,y+h*.35,pz,.05,.08,width*.42,'blue');
      detail(px+s*.04,y+h*.68,pz,.05,.08,width*.42,'blue');
    }
  }
  function grilleX(x,z,w=1.5,y=F+1.1,h=1.25,reveal='cream',back='wood') {
    detail(x,y+h/2,z,w+.22,h+.22,.12,reveal);
    detail(x,y+h/2,z-.075,w,h,.1,back);
    for(const yy of [y,y+h*.5,y+h])detail(x,yy,z-.145,w+.1,.09,.08,'blue');
    for(const xx of [x-w/2,x+w/2])detail(xx,y+h/2,z-.145,.085,h+.1,.08,'blue');
    for(let xx=x-w/2+.12;xx<x+w/2;xx+=.13)detail(xx,y+h/2,z-.17,.026,h,.035,'blue');
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
  floor('Front range plinth',0,3,24,6);
  floor('West rooms and passage',-10.2,12,3.6,12);
  floor('East passage and stair base',9.65,12,4.7,12);
  floor('Rear veranda',-.55,16.25,17.7,3.5);
  const dampCourt=mat('earth').clone();dampCourt.color.set('#686653');dampCourt.roughness=.80;
  floor('Damp courtyard soil',-.55,10.25,15.7,8.5,.035,dampCourt,.08);
  // Lowered central entrance with paired raised sitting platforms.
  // Entrance photos show raised seating against the room wall, with a lower
  // continuous walkway between the stout inner posts and slender outer row.
  for(const side of [-1,1]) {
    floor(side>0?'Entrance-left red sitting bay':'Entrance-right empty red sitting bay',side*2.745,1.15,2.99,1.80,.75,verandaRed,.30);
    b('Veranda worn pale platform riser',side*2.745,.59,.255,2.99,.27,.05,'paleStone');
    b('Veranda dark stone sitting edge',side*2.745,.765,.29,2.99,.045,.22,'stone');
    b('Veranda entrance end riser',side*1.26,.59,1.15,.07,.27,1.80,'paleStone');
    b('Veranda entrance end stone coping',side*1.31,.768,1.15,.16,.045,1.80,'stone');
    floor('Veranda lower continuation',side*6.27,.99,4.06,2.05,F,verandaRed,.18);
  }
  floor('Entrance-left lower stone walking strip',4.9,-.31,9.8,1.02,.455,'stone',.05);
  floor('Entrance-right lower stone walking strip',-4.05,-.31,8.1,1.02,.455,'stone',.05);
  floor('Front left access step',-3.1,.04,1.9,.7,.19,'paleStone');
  // Reach the low step before the raised veranda walking strip.
  floor('Front centre entry step',0,-.50,3.5,1.2,.19,'paleStone');
  stairs('Central approach',0,-.15,3.0,1.0,0,F,'z',3);
  // The front photographs show a continuous worn plinth with one low entry gap.
  const plinthFace=mat('plaster').clone();plinthFace.color.set('#b3a590');
  for(const [x,w] of [[-4.62,6.35],[5.09,7.30]]){
    b('Front veranda weathered retaining plinth',x,.43,-.98,w,.86,.18,plinthFace,true);
    b('Front veranda worn stone coping',x,.88,-.98,w+.025,.055,.23,'stone');
    for(let i=0;i<28;i++){
      const xx=x-w/2+.13+(i*1.719)%(w-.26);
      b('Front plinth small damp patch',xx,.08+(i%4)*.032,-1.076,.09+(i%5)*.05,.12+(i%3)*.04,.008,'stone');
    }
  }
  // Broad route around the shrine, with intentional breaks in the blue grilles.
  fenceX(-8.1,-5.7,5.83); fenceX(-4.1,-2.15,5.83);
  fenceX(2.15,4.6,5.83); fenceX(6.3,7.3,5.83);
  fenceZ(-8.35,6.15,10.0); fenceZ(-8.35,11.65,14.5);
  fenceZ(7.25,6.1,9.3); fenceZ(7.25,11.0,14.5);
  // 14.46.04: the rear veranda is screened by weathered horizontal boards.
  for(const [a,end] of [[-8.3,-3.6],[-1.8,7.3]]) {
    for(let row=0;row<7;row++) {
      const board=b('Courtyard weathered horizontal timber board',(a+end)/2,F+.10+row*.135,14.55,end-a,.112,.075,verandaTimber);
      board.rotation.z=.004*Math.sin(row*2.1);
    }
    for(let x=a+.12;x<end;x+=1.13)b('Courtyard board fence upright',x,F+.57,14.50,.075,1.24,.11,verandaTimber);
    K.blocker((a+end)/2,14.55,end-a,.12,F,F+1.05);
  }
  // Court entry steps match every deliberate veranda opening.
  for(const [x,z,w,d] of [[-4.9,6.03,1.55,.75],[5.45,6.03,1.55,.75],[-8.2,10.8,.75,1.55],[7.15,10.15,.75,1.55],[-2.7,14.35,1.65,.75]]) {
    floor('Courtyard worn step',x,z,w,d,.21,'paleStone',.16);
  }

  // Ground floor enclosing walls. All rooms have usable openings.
  wallZ('West exterior wall',-11.88,1.95,17.85,F,3.02,[{c:8.4,w:1.6,bottom:1.05,top:2.45},{c:15.1,w:1.4,bottom:1.05,top:2.4}]);
  wallZ('East exterior wall',11.88,.15,17.85,F,3.02,[{c:14.75,w:1.7,top:2.55}],'plaster');
  wallX('Rear exterior',-11.88,11.88,17.88,F,3.0,[{c:0,w:1.9,top:2.5},{c:-5.6,w:1.65,bottom:1.0,top:2.4},{c:5.7,w:1.65,bottom:1.0,top:2.4}]);
  doorX(0,17.86,1.9,F,2.5,-1);
  grilleX(-5.6,17.73,1.65,F+1,1.4);grilleX(5.7,17.73,1.65,F+1,1.4);
  grilleZ(-11.7,8.4);grilleZ(-11.7,15.1,1.4);
  // Two shallow front rooms, either side of the central through-entrance.
  wallX('Front room facade',-11.8,9.05,2.05,F,3.1,[{c:-7.9,w:1.7,bottom:.9,top:2.4},{c:-3.0,w:1.30,bottom:.70,top:2.4},{c:0,w:2.05,top:2.7},{c:3.0,w:1.30,bottom:.70,top:2.4},{c:7,w:1.5,top:2.5}],verandaAqua);
  doorX(0,2.03,2.05,F,2.7,1);doorX(7,2.03,1.5,F,2.5,1);
  grilleX(-7.9,1.90,1.7,F+.9,1.5);
  const entranceOchre=new THREE.MeshStandardMaterial({color:0x988258,roughness:.98});
  const verandaIron=new THREE.MeshStandardMaterial({color:0x96968e,roughness:.86});
  for(const side of [-1,1]) {
    const x=side*3.0;
    for(const dx of [-.725,.725])b('Veranda window ochre side reveal',x+dx,2.0,2.025,.13,1.94,.22,entranceOchre);
    for(const y of [1.09,2.91])b('Veranda window ochre horizontal reveal',x,y,2.025,1.58,.13,.22,entranceOchre);
    b('Veranda window dark interior',x,2.0,2.10,1.29,1.69,.05,'black');
    for(const dx of [-.595,.595])b('Veranda blue window jamb',x+dx,2.0,2.02,.10,1.69,.10,'blue');
    for(const y of [1.20,1.99,2.80])b('Veranda blue window rail',x,y,2.02,1.25,.09,.10,'blue');
    for(let dx=-.48;dx<.5;dx+=.098)b('Veranda slender iron window bar',x+dx,2.0,2.02,.020,1.55,.025,verandaIron);
    // The sitting bays end at transverse walls; the lower outer strip continues.
    b(side>0?'Left sitting bay turquoise end wall':'Right sitting bay turquoise end wall',side*4.30,2.08,1.15,.20,2.98,1.80,verandaAqua,true);
    b('Sitting bay end red skirting',side*4.188,1.00,1.15,.026,.49,1.80,verandaRed);
    b('Sitting bay wall red skirting',side*2.745,1.00,1.907,2.99,.49,.024,verandaRed);
    b('Sitting bay back corner timber',side*4.12,2.08,1.91,.13,2.96,.14,verandaTimber);
  }
  // Layered main-door jambs sit at the threshold, with the leaves open inward.
  for(const s of [-1,1]) {
    for(let j=0;j<4;j++)b('Main door carved nested jamb',s*(1.08+j*.067),1.84,1.95-j*.039,.055,2.78+j*.09,.10,verandaTimber);
    b('Main door broad worn pilaster',s*1.32,1.83,1.85,.17,2.85,.18,verandaTimber);
    for(const y of [.62,.69,.78,3.01,3.10])b('Main door jamb moulding',s*1.31,y,1.84,.26,.045,.24,verandaTimber);
  }
  b('Main door deep carved lintel',0,3.27,1.90,2.88,.24,.29,verandaTimber);
  for(let j=0;j<3;j++)b('Main door lintel layered rim',0,3.38+j*.075,1.88,3.04-j*.12,.06,.31,verandaTimber);
  const doorBoss=K.cylinder(g,'Main door central carved boss',0,3.27,1.723,.092,.108,.065,verandaTimber,12);doorBoss.rotation.x=Math.PI/2;
  wallZ('Left entrance wall',-1.18,2.05,4.05,F,3.1,[]);
  wallZ('Right entrance wall',1.18,2.05,4.05,F,3.1,[]);
  wallX('Inner front room wall',-11.8,9.05,4.05,F,3.1,[{c:-6.15,w:1.65,top:2.5},{c:0,w:2.05,top:2.7},{c:5.5,w:1.65,top:2.5}]);
  doorX(-6.15,4.05,1.65);doorX(0,4.05,2.05,F,2.7);doorX(5.5,4.05,1.65);
  wallZ('Front stair wing partition',9.05,1.8,5.75,F,3.1,[{c:4.8,w:1.7,top:2.6}]);
  // Kitchen is the southwest (plan bottom-left) room.
  wallX('Kitchen north partition',-11.8,-8.45,12.1,F,2.9,[{c:-10.05,w:1.55,top:2.45}]);
  doorX(-10.05,12.1,1.55);
  wallZ('Kitchen to rear veranda',-8.48,12.1,17.8,F,2.9,[{c:16.05,w:1.65,top:2.45}]);
  detail(-8.48,F+1.22,15.15,.36,2.45,.13,'wood');
  detail(-8.48,F+1.22,16.95,.36,2.45,.13,'wood');
  detail(-8.48,F+2.5,16.05,.38,.15,1.95,'wood');

  // Posts and exposed timber run continuously around the inner verandas.
  for(const x of [-6.4,-3.8,-1.55,1.55,5.6,8.7]) {
    K.column(g,'Front veranda slender outer column',x,-.88,F,2.45,.145,verandaTimber);
    for(let j=0;j<10;j++){
      const a=j*Math.PI/5;
      K.beam(g,'Outer column fine fluting',[x+Math.sin(a)*.138,.75,-.88+Math.cos(a)*.138],[x+Math.sin(a)*.116,2.35,-.88+Math.cos(a)*.116],.012,verandaTimber);
    }
  }
  // Square bases transition into long octagonal necks and bulbous ring capitals.
  const capitalProfile=[[.215,0],[.235,.055],[.25,.08],[.21,.12],[.235,.16],[.265,.20],[.24,.24],[.29,.29],[.30,.34],[.26,.39],[.30,.44],[.31,.50],[.27,.55],[.32,.61],[.29,.68],[.23,.74],[.26,.79],[.29,.84],[.24,.91]];
  for(const x of [-4.02,-1.65,1.65,4.02]) {
    b('Entrance seating post stone foot',x,.80,.36,.58,.10,.55,'stone');
    b('Entrance seating square timber shaft',x,1.50,.36,.42,1.35,.42,verandaTimber,true);
    b('Entrance seating narrow square neck',x,2.24,.36,.34,.25,.34,verandaTimber);
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
  bracket.bezierCurveTo(1.13,-.19,1.09,-.31,.99,-.21);bracket.bezierCurveTo(.92,-.34,.85,-.88,.77,-.29);
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
  for(const x of [-8.2,-4.3,4.1,7.15])column(x,5.7,F,3.0,.15);
  for(const z of [9.0,13.9]){column(-8.5,z);column(7.4,z);}
  for(const x of [-6.1,-1.8,2.8,7.2])column(x,14.7,F,3.0,.15);
  b('Front timber crossbeam',1.15,2.885,-.88,15.65,.21,.24,verandaTimber);
  b('Inner front crossbeam',-.5,3.51,5.7,16.6,.23,.27,'wood');
  b('West veranda crossbeam',-8.5,3.51,10.25,.24,.25,9.3,'wood');
  b('East veranda crossbeam',7.4,3.51,10.25,.24,.25,9.3,'wood');
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
  for(const side of [-1,1]){
    // White layered masonry carries the two side bays and heavy posts.
    b('God room platform masonry',side*1.64,.75,6.38,1.40,.60,1.38,shrineWhite);
    for(const [y,w,h] of [[.51,1.52,.12],[.68,1.46,.09],[.92,1.48,.11]])
      b('God room platform moulding',side*1.64,y,6.37,w,h,1.47,shrineWhite);
    floor('God room side platform',side*1.64,6.38,1.48,1.45,shrineFloor,shrineWhite,.09);
    const cheek=new THREE.Shape();
    cheek.moveTo(0,F);cheek.lineTo(1.22,F);cheek.lineTo(1.22,1.28);cheek.lineTo(.96,1.28);
    cheek.bezierCurveTo(.54,1.28,.49,.81,.12,.76);cheek.lineTo(0,.76);cheek.closePath();
    const cheekMesh=new THREE.Mesh(new THREE.ExtrudeGeometry(cheek,{depth:.30,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:20}),mat('red'));
    cheekMesh.name='God room curved red stair cheek';cheekMesh.rotation.y=-Math.PI/2;cheekMesh.position.set(side*1.06+.15,0,5.59);g.add(cheekMesh);
    K.blocker(side*1.06,6.20,.35,1.27,F,1.31);
    b('God room white half wall',side*1.48,1.67,screenZ,1.30,1.18,.22,shrineWhite,true);
    b('God room red oxide wall base',side*1.48,1.27,screenZ-.015,1.30,.38,.25,'red');
    // Open grilles, with daylight between real slats rather than a painted panel.
    for(const y of [2.29,2.94,3.55])b('God room blue grille rail',side*1.48,y,screenZ-.055,1.40,.095,.13,shrineBlue);
    for(let x=.88;x<=2.12;x+=.155)b('God room blue grille slat',side*x,2.92,screenZ-.06,.055,1.31,.08,shrineBlue);
    K.blocker(side*1.48,screenZ,1.40,.16,2.23,3.60);
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
  for(const x of [-.87,.87])b('God room blue door jamb',x,2.30,screenZ-.04,.18,2.56,.24,gatePaint,true);
  b('God room blue lintel',0,3.58,screenZ-.04,1.92,.20,.24,gatePaint);
  b('God room plain blue upper panel',0,3.82,screenZ,1.25,.29,.16,shrineBlue);
  for(const side of [-1,1]){
    const cx=side*.395,leafW=.775,low=1.14,high=3.47;
    for(const x of [cx-leafW/2+.035,cx+leafW/2-.035])b('God room gate upright',x,(low+high)/2,screenZ-.09,.07,high-low,.085,gatePaint);
    for(let row=0;row<=4;row++)b('God room gate horizontal rail',cx,low+row*(high-low)/4,screenZ-.09,leafW,.075,.095,gatePaint);
    for(let row=0;row<4;row++){
      const bottom=low+row*(high-low)/4+.06,top=low+(row+1)*(high-low)/4-.06;
      for(const sign of [-1,1])K.beam(g,'God room blue X brace',[cx-sign*.31,bottom,screenZ-.10],[cx+sign*.31,top,screenZ-.10],.085,gatePaint,.075);
    }
  }
  K.blocker(0,screenZ,1.58,.15,shrineFloor,3.5);
  b('God room iron latch',0,2.26,screenZ-.17,.23,.035,.035,'metal');
  b('God room worn centre door strip',0,2.25,screenZ-.15,.024,2.14,.02,shrineTimber);
  // Photograph-right is -X when looking into the house.
  K.cylinder(g,'God room grinding bowl',-1.72,1.20,6.60,.23,.17,.22,'paleStone',18);
  K.cylinder(g,'God room bowl hollow',-1.72,1.315,6.60,.16,.16,.015,'stone',18);
  const grindingStone=new THREE.Mesh(new THREE.DodecahedronGeometry(.15,0),mat('stone'));
  grindingStone.name='God room grinding stone';grindingStone.position.set(-1.76,1.42,6.62);g.add(grindingStone);
  // Low corrugated side coverings frame this view under heavy timber beams.
  const entryRoof=new THREE.Group();entryRoof.name='God room entrance roof framing';g.add(entryRoof);K.roofs.push(entryRoof);
  const roofGrey=new THREE.MeshStandardMaterial({color:'#81857c',roughness:.96,side:THREE.DoubleSide});
  for(const side of [-1,1]){
    const sheet=new THREE.Mesh(new THREE.PlaneGeometry(1.20,2.30,24,1),roofGrey);
    const pos=sheet.geometry.attributes.position;for(let i=0;i<pos.count;i++)pos.setZ(i,.024*Math.cos(pos.getX(i)*Math.PI/.05));sheet.geometry.computeVertexNormals();
    sheet.rotation.x=-Math.PI/2;sheet.rotation.z=side*.09;sheet.position.set(side*2.61,3.73,5.91);sheet.name='God room grey corrugated roof underside';entryRoof.add(sheet);
    K.beam(entryRoof,'God room side roof timber',[side*2.25,3.52,4.82],[side*2.25,3.52,7.08],.17,shrineTimber,.21);
    for(const z of [5.03,5.65,6.50])K.beam(entryRoof,'God room short exposed crossbeam',[side*2.02,3.56,z],[side*3.18,3.56,z],.14,shrineTimber,.18);
  }
  wallZ('Shrine left wall',-2.05,6.98,10.1,.68,2.9,[],'plaster',.22);
  wallZ('Shrine right wall',2.05,6.98,10.1,.68,2.9,[],'plaster',.22);
  wallX('Shrine rear wall',-2.05,2.05,10.08,.68,2.9,[],'plaster',.22);
  for(const z of [6.5,9.65]) {
    detail(-2.18,1.28,z,.14,.13,.65,'red');detail(2.18,1.28,z,.14,.13,.65,'red');
  }
  for(const y of [.83,1.12,2.70,3.38]) {
    detail(0,y,10.22,4.32,.10,.10,'red');
    detail(-2.2,y,8.1,.10,.10,4.2,'red');detail(2.2,y,8.1,.10,.10,4.2,'red');
  }
  // Pale floral/triangle decoration on the red shrine bands (14.44.14).
  const borderCanvas=document.createElement('canvas');borderCanvas.width=512;borderCanvas.height=64;
  const border=borderCanvas.getContext('2d');border.fillStyle='#915c50';border.fillRect(0,0,512,64);border.strokeStyle='#d2bb9a';border.fillStyle='#d2bb9a';border.lineWidth=3;
  for(let x=0;x<512;x+=64){border.beginPath();border.moveTo(x,56);border.lineTo(x+32,8);border.lineTo(x+64,56);border.stroke();for(let k=0;k<6;k++){const a=k*Math.PI/3;border.beginPath();border.ellipse(x+32+Math.cos(a)*9,35+Math.sin(a)*9,7,3,a,0,Math.PI*2);border.fill();}}
  const borderMap=new THREE.CanvasTexture(borderCanvas);borderMap.colorSpace=THREE.SRGBColorSpace;borderMap.wrapS=THREE.RepeatWrapping;borderMap.repeat.x=2;
  const bandMat=new THREE.MeshStandardMaterial({map:borderMap,roughness:1});
  for(const y of [1.12,2.70,3.38])for(const side of [-1,1]){
    const band=new THREE.Mesh(new THREE.PlaneGeometry(4.15,.14),bandMat);band.position.set(side*2.255,y,8.1);band.rotation.y=side*Math.PI/2;band.name='Patterned shrine side band';g.add(band);
  }
  for(const side of [-1,1]){
    b('Shrine weathered blue side shutter',side*2.18,2.0,8.15,.05,1.02,1.18,'wood');
    for(let z=7.58;z<=8.73;z+=.12)detail(side*2.23,2.0,z,.045,1.05,.03,'blue');
    for(const y of [1.48,2.52])detail(side*2.24,y,8.15,.065,.08,1.30,'blue');
    b('Shrine heavy side window canopy',side*2.29,2.64,8.15,.42,.16,1.55,'wood');
    for(const y of [.38,.51,.64])b('Shrine layered damp stone base',side*2.12,y,8.12,.25,.095,4.14,'stone');
  }
  b('Altar wooden base',0,1.31,9.46,3.42,.46,.75,'wood',true);
  b('Altar front ledge',0,1.55,9.28,3.7,.10,.86,'wood');
  const shrineMap=new THREE.TextureLoader().load('/assets/shrine.jpg');
  shrineMap.colorSpace=THREE.SRGBColorSpace;
  const shrineMaterial=new THREE.MeshBasicMaterial({map:shrineMap,side:THREE.DoubleSide});
  const shrineImage=new THREE.Mesh(new THREE.PlaneGeometry(3.0,2.25),shrineMaterial);
  shrineImage.name='Family shrine photograph — full uncropped source';
  shrineImage.position.set(0,2.63,9.90);shrineImage.rotation.y=Math.PI;g.add(shrineImage);
  for(const x of [-1.78,1.78])column(x,9.54,1.40,2.1,.12);
  detail(0,3.38,9.6,3.82,.2,.24,'wood');
  const lampMat=new THREE.MeshStandardMaterial({color:0xffe0a3,emissive:0xffb34a,emissiveIntensity:1.2});
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.075,10,8),lampMat);
  lamp.position.set(-1.10,3.2,8.75);lamp.name='Shrine warm bulb';g.add(lamp);
  K.beam(g,'Shrine bulb cord',[-1.10,3.2,8.75],[-1.10,3.57,8.75],.018,'black');
  // A small point lamp keeps the source altar visible in the deep veranda.
  const shrineLight=new THREE.PointLight(0xffd49b,2.8,5,2);shrineLight.position.set(0,2.85,7.3);g.add(shrineLight);
  const shrineRoof=K.hipRoof(g,'Small shrine tiled roof',0,8.0,4.9,4.95,3.64,1.0);
  // The shelf close-ups show dark boarded timber above, not exposed tile faces.
  const shrineRoofTiles=shrineRoof.children.find(o=>o.name==='Small shrine tiled roof tiles');
  const roofLiningMaterial=shrineTimber.clone();roofLiningMaterial.side=THREE.DoubleSide;
  const roofLining=new THREE.Mesh(shrineRoofTiles.geometry,roofLiningMaterial);
  roofLining.name='God room dark timber roof lining';roofLining.position.copy(shrineRoofTiles.position);roofLining.position.y-=.055;shrineRoof.add(roofLining);


  // Tulsi pedestal is left of the projecting shrine, as in the plan.
  const tulsiStone=new THREE.MeshStandardMaterial({color:'#49463c',roughness:.98,bumpMap:mat('stone').map,bumpScale:.018});
  for(const [size,y,h] of [[.96,.13,.18],[.77,.27,.10],[.48,.62,.62],[.71,.98,.12],[.83,1.10,.12]]) {
    b('Tulsi dark weathered stone pedestal',-5.2,y,8.0,size,h,size,tulsiStone,true);
  }
  b('Tulsi earth in planter',-5.2,1.185,8,.67,.04,.67,'earth');
  K.cylinder(g,'Tulsi main stem',-5.2,1.67,8,.013,.034,1.04,'wood',7);
  const leaves=[];
  for(let i=0;i<180;i++) {
    const a=i*2.3999,r=.12+(i%7)*.046,y=1.30+(i%21)*.044;
    leaves.push({x:-5.2+Math.cos(a)*r,y,z:8+Math.sin(a)*r,rx:.25+i*.3,rz:a});
    if(i%12===0)K.beam(g,'Tulsi twig',[-5.2,y-.18,8],[-5.2+Math.cos(a)*r,y,8+Math.sin(a)*r],.008,'wood');
  }
  const leafmesh=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,4),mat('leaf'),leaves.length);
  const helper=new THREE.Object3D();
  leaves.forEach((p,i)=>{helper.position.set(p.x,p.y,p.z);helper.rotation.set(p.rx,0,p.rz);helper.scale.set(.050,.014,.083);helper.updateMatrix();leafmesh.setMatrixAt(i,helper.matrix);});
  leafmesh.name='Tulsi leaves';leafmesh.castShadow=true;g.add(leafmesh);
  // Small moist garden strips soften the open court, leaving its crossed paths clear.
  const weeds=[];
  let courtSeed=27092011;
  const courtRandom=()=>{courtSeed=(Math.imul(courtSeed,1664525)+1013904223)>>>0;return courtSeed/4294967296;};
  for(let i=0;i<6200;i++){const x=-7.9+courtRandom()*14.6,z=6.4+courtRandom()*7.7;
    // Leave the observed walking strips and cross-courtyard routes readable.
    if((x>-2.7&&x<2.7&&z<10.7)||Math.abs(x+3.7)<.6||Math.abs(z-10.8)<.6||Math.abs(z-6.9)<.5||Math.abs(x+6.5)<.65)continue;
    weeds.push({x,z,a:i*2.3999});}
  const weedMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,3),mat('leaf'),weeds.length);
  weeds.forEach((p,i)=>{helper.position.set(p.x,.075+(i%5)*.016,p.z);helper.rotation.set(0,p.a,.1);helper.scale.set(.033+(i%4)*.012,.018,.055);helper.updateMatrix();weedMesh.setMatrixAt(i,helper.matrix);});weedMesh.name='Irregular courtyard ground cover';g.add(weedMesh);
  const gardenLeaves=[];
  for(const [cx,cz] of [[-7.4,7.5],[-7.4,12.7],[5.9,7.5],[5.9,12.8]]) {
    for(let i=0;i<26;i++) {
      const a=i*2.3999,r=.14+(i%5)*.125;
      gardenLeaves.push({x:cx+Math.cos(a)*r,y:.17+(i%4)*.13,z:cz+Math.sin(a)*r,a});
    }
  }
  const garden=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,4),mat('leaf'),gardenLeaves.length);
  gardenLeaves.forEach((p,i)=>{helper.position.set(p.x,p.y,p.z);helper.rotation.set(.5,p.a,.6);helper.scale.set(.11,.045,.35);helper.updateMatrix();garden.setMatrixAt(i,helper.matrix);});
  garden.name='Courtyard leafy garden strips';garden.castShadow=true;g.add(garden);
  for(let i=0;i<5;i++) {
    b('Worn courtyard paving slab',-2.72,.065,11.0+i*.66,.78,.075,.51,'paleStone');
  }

  // 14.48.31 and 14.52.16 resolve the stair's direction: it runs along
  // the Tulsi side of the shrine, rising toward the upper front range.
  const courtStairX=-6.75,courtStairFront=6.55,courtStairBack=12.10;
  const courtStairStone=mat('paleStone').clone();courtStairStone.color.set('#807e70');
  const courtStairWall=mat('plaster').clone();courtStairWall.color.set('#858779');
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
    const panel=new THREE.Mesh(new THREE.ExtrudeGeometry(cheek,{depth:.14,bevelEnabled:false}),courtStairWall);
    panel.name='Courtyard stair continuous sloping parapet';panel.rotation.y=-Math.PI/2;panel.position.x=x+.07;panel.castShadow=true;panel.receiveShadow=true;g.add(panel);
    K.beam(g,'Courtyard stair red coping',[x,F+.74,courtStairBack],[x,U+.74,courtStairFront],.18,'red',.065);
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
  floor('Courtyard stair foot step',courtStairX,12.35,.88,.5,.21,'paleStone',.16);
  floor('Courtyard stair upper return landing',courtStairX,6.18,.88,.80,U,'paleStone',.18);
  // Loose corrugated sheet rests against the shrine plinth, below the stair view.
  const sheetGeometry=new THREE.PlaneGeometry(2.05,1.04,48,8),sp=sheetGeometry.attributes.position;
  for(let i=0;i<sp.count;i++)sp.setZ(i,.034*Math.cos(sp.getX(i)*Math.PI/.092));
  sheetGeometry.computeVertexNormals();
  const rustySheet=new THREE.Mesh(sheetGeometry,new THREE.MeshStandardMaterial({color:'#835d49',roughness:1,side:THREE.DoubleSide}));
  rustySheet.name='Corrugated sheet leaning against courtyard shrine base';
  rustySheet.rotation.set(-.65,Math.PI/2,0);rustySheet.position.set(-2.80,.43,8.65);g.add(rustySheet);
  K.cylinder(g,'Courtyard stone grinding bowl',-3.72,.18,8.73,.34,.30,.30,'stone',20);
  K.cylinder(g,'Courtyard grinding bowl hollow',-3.72,.337,8.73,.24,.24,.02,'black',20);
  const handStone=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),mat('stone'));
  handStone.name='Courtyard rounded grinding stone';handStone.scale.set(.18,.12,.11);handStone.position.set(-3.69,.42,8.74);g.add(handStone);

  // Upper front range with airy perforated pink balcony.
  floor('Upper storey rear floor',0,3.9,23.75,4.2,U,'red',.22);
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
  wallX('Upper courtyard wall',-11.85,11.85,5.86,U,2.83,[{c:-6.75,w:.95,top:2.5},{c:-1.6,w:1.5,bottom:1.05,top:2.32},{c:3.6,w:1.5,bottom:1.05,top:2.32},{c:10.2,w:1.7,top:2.5}],'plaster');
  doorX(10.2,5.86,1.7,U,2.5,-1);
  doorX(-6.75,5.86,.95,U,2.5,-1);
  for(const x of [-1.6,3.6])grilleX(x,5.69,1.5,U+1.05,1.27);
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
  grilleX(10.2,.15,.83,U+.68,1.53,facadeWhite,'wood');
  b('Upper enclosed bay dark lower band',9.825,U+.20,.148,4.05,.42,.035,facadeDark);
  b('Upper stair-side wall dark lower band',-10.0,U+.20,1.605,3.65,.42,.035,facadeDark);
  b('Lake-view right stair enclosure',-7.7,U+.70,.3,1,1.4,.24,'aqua',true);

  // Photo facade: stair crosses the front-right wing behind stepped aqua masonry.
  floor('Front stair lower landing',-13.30,.95,1.1,1.75,F,'paleStone');
  floor('Front stair approach step',-14.05,.95,.5,1.75,.20,'paleStone');
  for(let i=0;i<22;i++){
    const x=-12.95+(i+.5)*4.8/22,y=F+(i+1)*(U-F)/22;
    b('Front-right masonry stair tread',x,y-.07,.95,4.8/22+.015,.14,1.65,'paleStone');
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
  const atticRise=2.05; // Half the previous 4.10 m rise, keeping the eaves fixed.
  const frontRoof=K.hipRoof(g,'Broad upper facade tiled roof',0,2.85,24.9,7.1,6.77,atticRise);
  frontRoof.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.multiplyScalar(.67);}});
  // Actual overlapping, rippled courses give the front slopes a tiled silhouette.
  const tilePositions=[],tileUvs=[],tileIndices=[];
  for(let j=0;j<=3;j++)for(let i=0;i<=8;i++){
    const x=(i/8-.5)*.255,z=(j/3-.5)*.40;
    tilePositions.push(x,.012*Math.cos(i/8*Math.PI*4)+(j===0?.016:0),z);tileUvs.push(i/8,j/3);
    if(i<8&&j<3){const a=j*9+i;tileIndices.push(a,a+9,a+1,a+1,a+9,a+10);}
  }
  const tileGeometry=new THREE.BufferGeometry();tileGeometry.setAttribute('position',new THREE.Float32BufferAttribute(tilePositions,3));tileGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(tileUvs,2));tileGeometry.setIndex(tileIndices);tileGeometry.computeVertexNormals();
  const tileColors=['#625b56','#645d57','#5e5853','#655d58','#615a56','#635c58'];
  const tilesOnSlope=(parent,name,rows)=>{
    const mesh=new THREE.InstancedMesh(tileGeometry,new THREE.MeshStandardMaterial({roughness:.98,side:THREE.DoubleSide}),rows.length),pose=new THREE.Object3D();
    rows.forEach((r,i)=>{pose.position.set(r.x,r.y+.025,r.z);pose.rotation.set(-r.angle,0,0);pose.scale.set(1,1,1);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);mesh.setColorAt(i,new THREE.Color(tileColors[(i*13+Math.floor(i/11))%tileColors.length]).multiplyScalar(name.includes('lower-')?.66:.88));});
    mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();parent.add(mesh);
  };
  const upperTileRows=[];
  for(let z=-.67;z<2.78;z+=.22){const t=(z+.70)/3.55,edge=12.45-3.195*t;for(let x=-edge+.13;x<edge;x+=.25)upperTileRows.push({x,y:6.77+atticRise*t,z,angle:Math.atan2(atticRise,3.55)});}
  tilesOnSlope(frontRoof,'Overlapping upper-front Mangalore tile courses',upperTileRows);
  // The front porch is a single slope, rising from the outer posts to the wall.
  const porchRoof=new THREE.Group();porchRoof.name='Front veranda sloping tiled awning';g.add(porchRoof);K.roofs.push(porchRoof);
  const porchGeometry=new THREE.BufferGeometry();
  const porchVertices=[],porchUvs=[];
  const porchHeight=z=>z<.5?2.72+(z+1.25)*1.03/1.75:3.75+(z-.5)*.23/1.58;
  for(const [za,zb] of [[-1.25,.5],[.5,2.08]])for(const [x,z] of [[-7.8,za],[12.45,za],[12.45,zb],[-7.8,za],[12.45,zb],[-7.8,zb]]){porchVertices.push(x,porchHeight(z),z);porchUvs.push(x*.38,z*.38);}
  porchGeometry.setAttribute('position',new THREE.Float32BufferAttribute(porchVertices,3));
  porchGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(porchUvs,2));porchGeometry.computeVertexNormals();
  const porchMaterial=mat('tile').clone();porchMaterial.side=THREE.DoubleSide;
  const porchTiles=new THREE.Mesh(porchGeometry,porchMaterial);porchTiles.name='Entrance veranda roof tiles';porchTiles.castShadow=true;porchTiles.receiveShadow=true;porchRoof.add(porchTiles);
  K.beam(porchRoof,'Entrance porch outer fascia',[-7.8,2.67,-1.25],[12.45,2.67,-1.25],.16,verandaTimber,.14);
  for(let x=-7.6;x<12.4;x+=.50)for(const [za,zb] of [[-1.25,.5],[.5,2.08]])K.beam(porchRoof,'Entrance veranda exposed sloping rafter',[x,porchHeight(za)-.085,za],[x,porchHeight(zb)-.085,zb],.075,verandaTimber,.12);
  const porchTileRows=[];
  for(let z=-1.22;z<2.05;z+=.32)for(let x=-7.69;x<12.4;x+=.25)porchTileRows.push({x,y:porchHeight(z),z,angle:z<.5?Math.atan2(1.03,1.75):Math.atan2(.23,1.58)});
  tilesOnSlope(porchRoof,'Overlapping lower-veranda Mangalore tile courses',porchTileRows);
  // A dark timber soffit conceals the red underside of the upper balcony slab.
  K.box(porchRoof,'Veranda timber ceiling underside',0,3.59,1.05,11.35,.035,2.04,verandaTimber);
  for(let x=-5.5;x<5.6;x+=.27)K.box(porchRoof,'Veranda close ceiling board joint',x,3.568,1.05,.012,.012,2.04,'black');
  const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute([-.5,0,0,.5,0,0,-.22,.55,.17,.22,.55,.17,.10,1,.55],3));blade.setIndex([0,1,2,1,3,2,2,3,4]);blade.computeVertexNormals();
  const roofGrowth=new THREE.InstancedMesh(blade,new THREE.MeshStandardMaterial({color:'#aaa38e',roughness:1,side:THREE.DoubleSide}),2400);
  const growthPose=new THREE.Object3D();
  for(let i=0;i<2400;i++){const x=-7.45+((i*173)%2399)/2399*18.8,z=-.95+((i*317)%2393)/2393*2.67;const dense=Math.sin(x*1.45+z*2.5)+Math.sin(x*.71-z*4)>.1;growthPose.position.set(x,porchHeight(z)+.035,z);growthPose.rotation.set(.15,i*2.3999,.25*Math.sin(i));growthPose.scale.set(.012+(i%5)*.004,dense?.14+(i%9)*.021:.025,.18);growthPose.updateMatrix();roofGrowth.setMatrixAt(i,growthPose.matrix);}
  roofGrowth.name='Dry grass and moss on the lower tiled awning';porchRoof.add(roofGrowth);
  K.hipRoof(g,'West range tiled roof',-10.18,12.0,4.6,13.1,3.62,1.12);
  K.hipRoof(g,'Rear veranda tiled roof',-.50,16.38,18.2,4.25,3.64,1.05);
  K.hipRoof(g,'East passage tiled strip',8.1,10.1,2.40,8.8,3.6,.58);
  K.hipRoof(g,'East rear service roof',10.1,15.8,4.2,5.25,3.62,.85);
  // Low white block with its own hipped roof, visible at the house's temple end.
  // Its enclosed interior and exact connection are not visible in the references.
  const endWhite=mat('plaster').clone();endWhite.color.set('#f1eced');
  const dampBase=new THREE.MeshStandardMaterial({color:'#494942',roughness:1});
  b('Temple-facing low white block',13.20,1.66,2.6,3.40,3.02,4.6,endWhite,true);
  b('Temple-facing block dark foundation',13.2,.30,2.6,3.5,.50,4.7,dampBase);
  b('Temple-side low block front damp band',13.20,.49,.274,3.43,.79,.045,dampBase);
  b('Temple-side low block small front slit',13.06,1.60,.248,.20,.65,.035,'wood');
  K.hipRoof(g,'Temple-facing small block tiled roof',13.2,2.6,5.6,5.6,3.24,1.36);
  // Closed, weathered wooden door faces the temple; no invented room behind it.
  b('Temple-facing block worn door jamb',14.93,1.34,2.5,.09,2.32,1.08,'paleStone');
  b('Temple-facing block closed timber door',14.99,1.26,2.5,.045,2.12,.82,'wood');
  for(const z of [2.15,2.33,2.50,2.67,2.84])detail(15.02,1.26,z,.022,2.07,.022,dampBase);
  b('Temple-facing block door threshold',15.02,.19,2.5,.38,.10,1.12,'stone');
  b('Temple-facing block stone boundary post',15.48,.70,.40,.24,1.38,.26,'stone',true);
  const tarp=new THREE.MeshStandardMaterial({color:'#218fad',roughness:.88,side:THREE.DoubleSide});
  const tarpGeometry=new THREE.PlaneGeometry(2.5,2.3,18,18),tp=tarpGeometry.attributes.position;
  for(let i=0;i<tp.count;i++){
    const x=tp.getX(i),y=tp.getY(i),fold=.12*Math.sin(x*8+y*2)+.045*Math.sin(y*14);
    tp.setXYZ(i,x,y-.15*Math.cos(x*2.4),fold);
  }
  tarpGeometry.computeVertexNormals();const tarpSheet=new THREE.Mesh(tarpGeometry,tarp);tarpSheet.name='Blue tarp beside the temple-facing block';tarpSheet.rotation.y=Math.PI/2;tarpSheet.position.set(14.77,2.13,5.25);g.add(tarpSheet);
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
  chair(-10.85,6.0,Math.PI/2);chair(-10.85,7.45,Math.PI/2);
  chair(-5.1,4.48,Math.PI);chair(4.0,4.48,Math.PI);
  chair(-6.7,16.95,Math.PI);chair(-5.5,16.95,Math.PI);
  // In the left bay the bench and chair stand against the transverse end wall.
  // The chair in these photos has two uprights but no broad back panel.
  b('Entrance-left wooden bench',3.82,1.22,.86,.37,.07,1.28,verandaTimber);
  for(const z of [.35,1.36])b('Entrance-left bench leg',3.82,.98,z,.26,.44,.065,verandaTimber);
  b('Entrance-left chair seat',3.78,1.25,1.67,.62,.075,.57,verandaTimber);
  for(const x of [3.52,4.04])for(const z of [1.43,1.91])b('Entrance-left chair leg',x,1.0,z,.061,.51,.061,verandaTimber);
  for(const z of [1.42,1.92]){
    b('Entrance-left chair tall back upright',4.06,1.59,z,.055,.98,.055,verandaTimber);
    b('Entrance-left chair arm',3.74,1.60,z,.69,.06,.075,verandaTimber);
    b('Entrance-left chair front arm support',3.48,1.45,z,.05,.28,.05,verandaTimber);
    b('Entrance-left chair lower stretcher',3.78,.91,z,.55,.045,.045,verandaTimber);
  }
  K.blocker(3.80,1.67,.75,.64,.75,2.12);
  K.blocker(3.82,.86,.38,1.28,.75,1.25);
  // Open pale wall cupboard at the end of the sitting bay, beyond the posts.
  b('Veranda open pale cupboard back',4.90,2.12,.18,.045,1.78,.44,'paleStone');
  for(const z of [-.04,.40])b('Veranda cupboard side',4.76,2.12,z,.28,1.78,.045,'cream');
  for(const y of [1.23,1.68,2.13,2.58,3.01])b('Veranda cupboard open shelf',4.76,y,.18,.28,.035,.44,'cream');
  b('Veranda pale open cupboard door',4.48,2.12,-.055,.30,1.78,.03,'paleStone');
  b('Veranda far closed timber doorway',9.19,1.94,1.05,.11,2.93,1.92,verandaTimber,true);
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
  calendarMap.repeat.set(.026,.101);calendarMap.offset.set(.591,1-.344);
  const calendar=new THREE.Mesh(new THREE.PlaneGeometry(.16,.42),new THREE.MeshStandardMaterial({map:calendarMap,roughness:1}));
  calendar.name='Photographed veranda calendar';calendar.rotation.y=Math.PI;calendar.position.set(3.91,2.32,1.914);g.add(calendar);
  b('Small veranda table',-10.83,F+.57,8.85,.90,.09,.72,'wood',true);
  for(const dx of [-.36,.36])for(const dz of [-.27,.27])detail(-10.83+dx,F+.28,8.85+dz,.065,.56,.065,'wood');
  K.cylinder(g,'Table brass cup',-10.83,F+.68,8.85,.065,.052,.13,'gold',12);
  // Pendulum clock hangs on the turquoise corridor wall.
  detail(-11.68,2.25,6.7,.20,.91,.43,'wood');
  const clockFace=new THREE.Mesh(new THREE.CircleGeometry(.165,28),mat('cream'));
  clockFace.rotation.y=Math.PI/2;clockFace.position.set(-11.57,2.46,6.7);clockFace.name='Ivory wall clock face';g.add(clockFace);
  K.beam(g,'Clock minute hand',[-11.55,2.46,6.7],[-11.55,2.59,6.72],.013,'black');
  K.beam(g,'Clock hour hand',[-11.54,2.46,6.7],[-11.54,2.46,6.60],.017,'black');
  K.beam(g,'Pendulum rod',[-11.55,2.18,6.7],[-11.55,1.96,6.7],.015,'gold');
  const pendulum=new THREE.Mesh(new THREE.SphereGeometry(.065,10,8),mat('gold'));pendulum.position.set(-11.55,1.96,6.7);g.add(pendulum);
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
  const cloth1=new THREE.MeshStandardMaterial({color:0x8f627d,roughness:1,side:THREE.DoubleSide});
  const cloth2=new THREE.MeshStandardMaterial({color:0xd6c9ac,roughness:1,side:THREE.DoubleSide});
  for(const [x,w,h,m] of [[-5.2,.76,.75,cloth1],[-4.25,.55,.62,cloth2],[3.5,.70,.83,cloth2]]) {
    const cloth=new THREE.Mesh(new THREE.PlaneGeometry(w,h,3,3),m);
    cloth.position.set(x,2.9-h/2,15.1);cloth.castShadow=true;cloth.name='Cloth drying in rear veranda';g.add(cloth);
  }
  // Sparse upstairs rooms intentionally leave space for later family corrections.
  b('Upstairs simple wooden cot',-9.35,U+.34,4.2,2.2,.15,1.08,'wood',true);
  b('Cot woven sleeping surface',-9.35,U+.45,4.2,2.05,.10,1.0,'cream');
  for(const dx of [-.95,.95])for(const dz of [-.4,.4])detail(-9.35+dx,U+.17,4.2+dz,.08,.34,.08,'wood');
  b('Upstairs old trunk',2.05,U+.23,5.2,1.1,.46,.56,'wood',true);
  for(const x of [1.68,2.40])detail(x,U+.235,4.908,.045,.43,.026,'metal');

  // All tiny repeated timber, grille and furniture parts are instanced by material.
  const unitBox=new THREE.BoxGeometry(1,1,1),o=new THREE.Object3D();
  for(const [material,items] of batches) {
    const mesh=new THREE.InstancedMesh(unitBox,material,items.length);
    mesh.name='House repeated '+(material.name||'trim');
    items.forEach((p,i)=>{o.position.set(p.x,p.y,p.z);o.rotation.set(0,p.ry,p.rz);o.scale.set(p.w,p.h,p.d);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});
    mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  }
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  K.labels.push({text:'Grandparents’ house',position:[0,7.8,2.5]},{text:'Open courtyard',position:[-3.2,1.0,11.8]},{text:'Family shrine',position:[0,3.9,8.0]},{text:'Tulsi',position:[-5.2,2.2,8]},{text:'Kitchen',position:[-10.2,3.25,15.2]});
  return g;
}
