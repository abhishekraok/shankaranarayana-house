import * as THREE from 'three';

/**
 * Shankaranarayana temple, approximate 2011–2013 visible architecture.
 * Sources: 2011-09-21 15.19.41, 15.15.51, 15.02.27, 15.03.33 and the upper-gallery
 * views 15.13.07, 15.12.56, 15.13.11, identified by the family.
 * Dimensions and courtyard connectivity are inferred, not surveyed. The carved
 * figures/panels are simplified silhouettes; unseen rooms are not reconstructed.
 * All solids and walkable rectangles use world coordinates, in metres.
 */
export function buildTemple(K) {
  const g = new THREE.Group();
  const navStart={colliders:K.colliders.length,surfaces:K.surfaces.length,ramps:K.ramps.length,labels:K.labels.length};
  // Move an authored assembly with its walkable surfaces and blockers. Keeping
  // these scopes explicit avoids stretching ornament or moving the inner shrine.
  const markAssembly=()=>({children:g.children.length,colliders:K.colliders.length,surfaces:K.surfaces.length,ramps:K.ramps.length});
  function moveAssembly(start,dx,dz){
    for(const o of g.children.slice(start.children)){o.position.x+=dx;o.position.z+=dz;}
    for(const c of K.colliders.slice(start.colliders)){c.minX+=dx;c.maxX+=dx;c.minZ+=dz;c.maxZ+=dz;}
    for(const r of [...K.surfaces.slice(start.surfaces),...K.ramps.slice(start.ramps)]){r.x+=dx;r.z+=dz;}
  }
  g.name = 'Shankaranarayana temple — 2011–2013';
  g.userData.notes = [
    'Estimated dimensions; courtyard arrangement and the connection behind the portico are inferred from the photo sequence.',
    'The wide blue-and-white inner building and asymmetric side halls follow the three upper-gallery photographs.',
    'Gallery stair location is inferred. Unseen temple rooms are enclosed; ornamental carving is simplified.'
  ];
  const mat = (color, roughness = .85, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  const white = mat('#deded4');
  const whiteTrim = mat('#eee9dc', .73);
  const blue = mat('#348fac');
  const paleBlue = mat('#9cc5cc');
  const red = mat('#953e33');
  const dark = mat('#262a2a');
  const oldStone = mat('#55554c');
  const darkRoof = (K.M.tile?.clone?.() || mat('#554d42'));
  darkRoof.color.set('#554b40');
  const brass = mat('#8c7142', .49, { metalness: .52 });
  const stoneFloor = mat('#b7b0a0');
  const blackFloor = mat('#ffffff', .62); // worn brown tiles (user's note); the name is historical
  const oxideFloor = mat('#834b3c', .69);

  // Repeatable, geometry-native canvas finishes avoid hundreds of paving meshes.
  // The random sequence is fixed so a regenerated scene keeps the same weathering.
  let seed = 19;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  function canvasMap(size, draw, repeatX = 1, repeatY = 1) {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY); t.anisotropy = 8;
    return t;
  }
  stoneFloor.map = canvasMap(1024, (c, s) => {
    c.fillStyle = '#6c6b60'; c.fillRect(0, 0, s, s);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const x = col * 128, y = row * 128;
        const n = Math.floor(rand() * 24);
        c.fillStyle = `rgb(${177+n},${172+n},${155+n})`;
        c.fillRect(x+3, y+3, 122, 122);
        c.strokeStyle = 'rgba(244,235,206,.33)'; c.lineWidth = 2;
        c.strokeRect(x+5, y+5, 118, 118);
        for(let a=0;a<24;a++) {
          const r = 2 + rand()*10;
          c.fillStyle = `rgba(70,77,62,${.015+rand()*.06})`;
          c.beginPath(); c.ellipse(x+rand()*128,y+rand()*128,r*2,r,rand()*3,0,Math.PI*2); c.fill();
        }
      }
    }
  }, .45, .45);
  stoneFloor.color.set('#ffffff');
  // Every 2011 photograph shows monsoon mildew on the whitewash: sparse grey-green
  // drips and damp patches. A separate generator keeps other textures unchanged.
  let mildewSeed=6151;const mildew=()=>{mildewSeed=(Math.imul(mildewSeed,1664525)+1013904223)>>>0;return mildewSeed/4294967296;};
  white.map=canvasMap(512,(c,s)=>{
    c.fillStyle='#deded4';c.fillRect(0,0,s,s);
    for(let i=0;i<40;i++){const x=mildew()*s,y=mildew()*s,r=30+mildew()*100;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(96,104,84,${.06+mildew()*.10})`);g.addColorStop(1,'rgba(96,104,84,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
    for(let i=0;i<120;i++){const x=mildew()*s,y=mildew()*s,h=20+mildew()*110;const g=c.createLinearGradient(0,y,0,y+h);g.addColorStop(0,`rgba(52,60,46,${.03+mildew()*.07})`);g.addColorStop(1,'rgba(52,60,46,0)');c.fillStyle=g;const dw=4+mildew()*12;c.beginPath();c.moveTo(x,y);c.lineTo(x+dw,y);c.lineTo(x+dw*.62,y+h);c.lineTo(x+dw*.38,y+h);c.fill();}
    for(let i=0;i<220;i++){c.fillStyle=`rgba(60,66,54,${.015+mildew()*.03})`;c.fillRect(mildew()*s,mildew()*s,2+mildew()*5,2+mildew()*5);}
  },.35,.35);white.color.set('#ffffff');white.userData.worldAnchored=true;K.baseGrime(white,{top:1.8,strength:.55});
  blackFloor.map = canvasMap(256, (c,s) => {
    c.fillStyle='#6f5242';c.fillRect(0,0,s,s);
    for(let x=0;x<4;x++)for(let y=0;y<4;y++){
      c.strokeStyle='#8c705d';c.lineWidth=1;c.strokeRect(x*64,y*64,64,64);
      c.fillStyle='#d5cfba';c.save();c.translate(x*64+32,y*64+32);c.rotate(Math.PI/4);c.fillRect(-4,-4,8,8);c.restore();
    }
  }, 8, 3);
  const relief = mat('#d8cdb8');
  relief.map = canvasMap(256, (c,s) => {
    c.fillStyle='#d9d5c9';c.fillRect(0,0,s,s);
    c.strokeStyle='#8d8371';c.lineWidth=3;
    c.strokeRect(10,10,s-20,s-20);
    c.beginPath();c.moveTo(128,224);c.bezierCurveTo(104,180,152,139,128,42);c.stroke();
    for(let i=0;i<4;i++)for(const side of [-1,1]){
      const y=65+i*39;c.beginPath();c.moveTo(128,y+35);
      c.bezierCurveTo(128+side*80,y+20,128+side*80,y-36,128+side*27,y-18);
      c.bezierCurveTo(128+side*10,y-5,128+side*40,y+8,128,y+35);c.stroke();
    }
  });
  const plaque = mat('#202827', .79);
  plaque.map = canvasMap(256, (c,s) => {
    c.fillStyle='#202827';c.fillRect(0,0,s,s);c.strokeStyle='#aaa99a';c.lineWidth=2;
    c.strokeRect(9,9,238,238);c.beginPath();c.ellipse(128,132,82,104,0,0,Math.PI*2);c.stroke();
    // Floral/crowned relief evokes the inset panels without inventing painted portraits.
    c.beginPath();c.moveTo(74,186);c.quadraticCurveTo(104,135,128,56);c.quadraticCurveTo(149,137,183,186);c.closePath();c.stroke();
    for(let i=0;i<7;i++){const a=i*Math.PI/3.5;c.beginPath();c.ellipse(128+Math.cos(a)*37,142+Math.sin(a)*35,12,29,a,0,Math.PI*2);c.stroke();}
    c.beginPath();c.arc(128,75,16,0,Math.PI*2);c.stroke();
  });
  const box = (n,x,y,z,w,h,d,m=white,solid=false) => K.box(g,n,x,y,z,w,h,d,m,solid);
  const cyl = (n,x,y,z,rt,rb,h,m=white,seg=12,solid=false) => K.cylinder(g,n,x,y,z,rt,rb,h,m,seg,solid);
  function mesh(n,geo,m,x=0,y=0,z=0,parent=g){
    const o=new THREE.Mesh(geo,m);o.name=n;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;
  }
  function floor(n,x,z,w,d,top,m){box(n,x,top-.09,z,w,.18,d,m);K.surface(x,z,w,d,top);}
  function steps(n,x,z,w,d,low,high,axis='z',count=4){
    const alongX = axis.includes('x'), sign = axis.startsWith('-') ? -1 : 1;
    for(let i=0;i<count;i++){
      const t=(i+.5)/count-.5, h=low+(high-low)*(i+1)/count;
      const cap=Math.min(.12,h-low),baseHeight=h-cap-low;
      box(`${n} tread ${i+1}`, x+(alongX?sign*t*w:0),h-cap/2,z+(alongX?0:sign*t*d),alongX?w/count:w,cap,alongX?d:d/count,stoneFloor);
      // Shallow first steps need only a cap. Never generate inverted boxes or
      // bury a staircase's infill below the landing it actually rises from.
      if(baseHeight>1e-6)box(`${n} riser ${i+1}`,x+(alongX?sign*t*w:0),low+baseHeight/2+.001,z+(alongX?0:sign*t*d),alongX?w/count:w,baseHeight+.002,alongX?d:d/count,oldStone);
    }
    K.ramp(x,z,w,d,axis,low,high);
  }
  // A single instanced mesh per repeated detail keeps facade/paving draw calls low.
  function instances(n,geo,m,transforms){
    const o=new THREE.InstancedMesh(geo,m,transforms.length);o.name=n;
    const dummy=new THREE.Object3D();
    transforms.forEach((t,i)=>{dummy.position.set(t[0],t[1],t[2]);dummy.rotation.set(t[6]||0,t[7]||0,t[8]||0);dummy.scale.set(t[3]||1,t[4]||1,t[5]||1);dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);});
    o.instanceMatrix.needsUpdate=true;o.castShadow=o.receiveShadow=true;g.add(o);return o;
  }
  // Solid scalloped spandrel above an open bay; leaves full human-height clearance.
  function scallop(n,x,z,w,topY,depth,m=whiteTrim,drop=.65){
    const s=new THREE.Shape();s.moveTo(-w/2,topY);s.lineTo(w/2,topY);s.lineTo(w/2,topY-drop);
    const seg=6;
    for(let i=seg;i>0;i--){
      const right=-w/2+w*i/seg,left=right-w/seg;
      const curveHeight=.2*Math.sin(Math.PI*(i-.5)/seg);
      s.quadraticCurveTo((right+left)/2,topY-drop+curveHeight+.15,left,topY-drop+curveHeight);
    }
    s.lineTo(-w/2,topY);s.closePath();
    return mesh(n,new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:4}),m,x,0,z-depth/2);
  }
  function panel(n,x,y,z,w,h,m=relief,side=false){
    return box(n,x,y,z,side?.018:w,h,side?w:.018,m);
  }
  function carvedColumn(n,x,z,baseY,height,scale=1){
    const s=scale;
    // The square block, narrow shaft and multiple projecting collars match the facade.
    box(n+' foot',x,baseY+.075,z,.65*s,.15,.65*s,dark);
    box(n+' base',x,baseY+.45*s,z,.53*s,.74*s,.53*s,whiteTrim);
    panel(n+' base carving',x,baseY+.45*s,z-.27*s,.40*s,.57*s);
    const shaftBottom=baseY+.85*s, capY=baseY+height-.35*s;
    box(n+' shaft',x,(shaftBottom+capY)/2,z,.31*s,capY-shaftBottom,.31*s,whiteTrim);
    const blockY=baseY+height*.50;
    box(n+' inset block',x,blockY,z,.60*s,.65*s,.60*s,whiteTrim);
    panel(n+' black inset',x,blockY,z-.308*s,.43*s,.45*s,plaque);
    panel(n+' side inset',x+.308*s,blockY,z,.43*s,.45*s,plaque,true);
    for(const [yy,ww,hh] of [[shaftBottom,.65,.10],[blockY-.38*s,.65,.12],[blockY+.38*s,.65,.12],[capY,.50,.15],[baseY+height-.13*s,.67,.16]]){
      box(n+' moulding',x,yy,z,ww*s,hh*s,ww*s,whiteTrim);
    }
    box(n+' abacus',x,baseY+height-.03,z,.84*s,.13,.72*s,whiteTrim);
    // Two curled bracket silhouettes under the beam.
    for(const sign of [-1,1]){
      const b=box(n+' corbel',x+sign*.35*s,baseY+height-.17*s,z,.39*s,.20*s,.29*s,whiteTrim);b.rotation.z=sign*.24;
    }
    K.blocker(x,z,.65*s,.65*s,baseY,baseY+height);
  }
  function blueColumn(n,x,z,base=.6,h=2.85){
    box(n+' red base',x,base+.29,z,.34,.58,.34,red);
    box(n+' blue shaft',x,base+(h+.58)/2,z,.25,h-.58,.25,paleBlue);
    box(n+' capital',x,base+h-.055,z,.46,.11,.43,paleBlue);
    K.blocker(x,z,.37,.37,base,base+h);
  }
  function frontDoor(n,x,z,base=.6,w=1.65,h=2.4,open=false){
    box(n+' left frame',x-w/2-.07,base+h/2,z,.14,h+.14,.22,blue);
    box(n+' right frame',x+w/2+.07,base+h/2,z,.14,h+.14,.22,blue);
    box(n+' lintel',x,base+h+.04,z,w+.3,.18,.23,blue);
    if(!open){box(n+' blue timber',x,base+h/2,z+.035,w,h,.08,blue,true);box(n+' centre stile',x,base+h/2,z-.02,.065,h,.08,dark);}
    else for(const side of [-1,1])box(n+' open leaf',x+side*(w/2+.12),base+h/2,z+.34,.1,h,.78,blue);
    if(!open)for(let i=0;i<4;i++)box(n+' recessed panel',x+(i%2?1:-1)*w*.24,base+.43+Math.floor(i/2)*1.16,z-.017,w*.36,.67,.02,paleBlue);
  }
  function blueWindow(n,x,z,w=1.4,y=2,side=false){
    const a=box(n+' dark opening',x,y,z,side?.05:w,1.2,side?w:.05,dark);
    box(n+' top sill',x,y+.65,z,side?.12:w+.18,.09,side?w+.18:.12,blue);
    box(n+' lower sill',x,y-.65,z,side?.12:w+.18,.09,side?w+.18:.12,blue);
    const bars=[];
    for(let i=0;i<7;i++)bars.push([x+(side?0:(i-3)*w/7),y,z+(side?(i-3)*w/7:0),side?.055:.035,1.2,side?.035:.055]);
    instances(n+' blue grille',new THREE.BoxGeometry(1,1,1),blue,bars);
    return a;
  }

  // Main raised portico: four front bays and an open central passage into the court.
  // 15.15.51: a low central entry between broad raised marble platforms.
  // 15.19.41: the platform fronts are dark laterite blocks with red-painted joints.
  const laterite=mat('#ffffff',.95);
  laterite.map=canvasMap(512,(c,s)=>{
    c.fillStyle='#9b4337';c.fillRect(0,0,s,s);
    const rows=3,cols=4,h=s/rows,w=s/cols;
    for(let r=0;r<rows;r++)for(let k=-1;k<cols;k++){
      const x=k*w+(r%2)*w/2,v=62+rand()*26|0;
      c.fillStyle=`rgb(${v},${v-3|0},${v-10|0})`;c.fillRect(x+3,r*h+3,w-6,h-6);
      for(let i=0;i<40;i++){c.fillStyle=`rgba(${rand()<.5?20:150},${rand()<.5?30:110},25,${.05+rand()*.12})`;c.fillRect(x+7+rand()*(w-20),r*h+7+rand()*(h-20),3+rand()*9,2+rand()*6);}
    }
  },7.8/1.6,1);
  // 15.15.51: the raised side platforms are polished green-grey veined marble.
  const greenMarble=mat('#ffffff',.42);
  greenMarble.map=canvasMap(512,(c,s)=>{let n=5821;const r=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
    c.fillStyle='#8f9c93';c.fillRect(0,0,s,s);
    for(let i=0;i<26;i++){c.fillStyle=`rgba(${r()<.5?'170,182,172':'92,108,98'},${.18+r()*.25})`;c.fillRect(0,r()*s,s,4+r()*26);}
    c.lineWidth=1;for(let i=0;i<70;i++){c.strokeStyle=`rgba(${r()<.6?'225,232,226':'54,66,58'},${.2+r()*.35})`;let x=0,y=r()*s;c.beginPath();c.moveTo(x,y);while(x<s){x+=8+r()*20;y+=r()*10-5;c.lineTo(x,y);}c.stroke();}
    for(let x=0;x<=s;x+=s/2){c.fillStyle='rgba(40,48,42,.5)';c.fillRect(x-1,0,2,s);}
  });
  K.worldMap(greenMarble,.3);
  for(const x of [33.9,44.1]){
    floor('Entrance raised side marble platform',x,2.1,7.8,8.2,.602,greenMarble);
    box('Entrance side platform laterite riser',x,.35,-1.95,7.8,.48,.24,laterite);
    box('Entrance side platform white moulding',x,.12,-1.99,7.9,.13,.34,whiteTrim);
  }
  floor('Entrance recessed middle passage',39,2.1,2.4,8.2,.20,blackFloor);
  for(const x of [37.8,40.2]){
    box('Entrance marble platform inward riser',x,.40,2.1,.08,.40,8.2,whiteTrim);
    box('Entrance marble platform red edge',x,.57,2.1,.12,.055,8.2,red);
  }
  steps('Front central stair',39,-2.75,2.7,1.5,0,.20,'z',2);
  floor('Stair upper landing',39,-1.77,2.4,.45,.20,blackFloor);
  // Two shallow transverse steps keep both platforms and gallery accessible.
  steps('Entrance right platform access',37.55,3,1.0,1.15,.20,.602,'-x',2);
  steps('Entrance left platform access',40.45,3,1.0,1.15,.20,.602,'x',2);
  // The deeper service porch occupies the rear corner below the gallery.
  // Keep the upper wall but open its lower rear section into the porch.
  box('Portico west wall',30.1,3.70,3.355,.24,6.2,2.99,white,true);
  box('Portico west wall above service porch',30.1,5.275,5.725,.24,3.05,1.75,white,true);
  box('Portico east wall',47.9,3.70,2.3,.24,6.2,8.6,white,true);
  for(const x of [33.72,44.28]){
    const w=x<39?4.995:7.15,cx=x<39?34.7975:x;
    box('Ground rear wall',cx,2.26,6.1,w,3.32,.24,white,true);
    // 15.14.30 / 15.15.11: grey veined marble dado under the paintings, not red skirting.
    box('Rear grey marble dado',cx,.80,5.955,w,.40,.05,mat('#9a9a92',.4));
    box('Black upper wall band',cx,3.62,5.955,w,.19,.05,dark);
  }
  box('Open passage header',39,3.25,6.1,3.45,1.34,.25,white);
  // The actual entrance door (15.15.51), with an open view into the courtyard.
  const doorwayBlue=mat('#294c57'),silver=mat('#ffffff',.63,{metalness:.25});
  // Silver-painted carved stone: flutes, recessed relief panels and worn edges.
  silver.map=canvasMap(256,(c,s)=>{let n=4409;const r=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
    c.fillStyle='#c3c9ca';c.fillRect(0,0,s,s);
    for(let x=6;x<s;x+=16){c.fillStyle='rgba(70,76,78,.35)';c.fillRect(x,0,3,s);c.fillStyle='rgba(245,248,248,.35)';c.fillRect(x+3,0,2,s);}
    for(let i=0;i<4;i++){const y=i*64+8;
      for(let k=0;k<30;k++){c.fillStyle=`rgba(${r()<.5?'70,76,78':'240,244,244'},${.08+r()*.12})`;c.beginPath();c.ellipse(40+r()*(s-80),y+10+r()*28,2+r()*7,2+r()*6,r()*3,0,7);c.fill();}}
    for(let i=0;i<300;i++){c.fillStyle=`rgba(50,56,58,${r()*.2})`;c.fillRect(r()*s,r()*s,1+r()*3,1+r()*3);}
  });
  K.worldMap(silver,.5);
  box('Entrance doorway left blue surround',37.48,2.00,5.87,.69,2.80,.23,doorwayBlue);
  box('Entrance doorway right blue surround',40.52,2.00,5.87,.69,2.80,.23,doorwayBlue);
  box('Entrance doorway blue inscription header',39,3.18,5.87,3.70,.62,.24,doorwayBlue);
  for(const side of [-1,1]){
    // 15.15.51 / 15.16.13: the opening is about 1.45 m clear, framed by blue reveals.
    box('Entrance doorway blue inner reveal',39+side*.99,2.00,5.87,.42,2.80,.23,doorwayBlue,true);
    box('Entrance doorway red inner jamb',39+side*.78,1.78,5.73,.12,2.36,.17,red);
    box('Entrance doorway open timber leaf',39+side*.84,1.78,6.1,.09,2.36,.72,K.M.wood);
    const x=39+side*2.05;

    box('Entrance doorway pillar red base',x,1.02,5.36,.58,.72,.58,red,true);
    box('Entrance doorway silver carved shaft',x,2.20,5.36,.40,1.67,.40,silver);
    box('Entrance doorway silver relief block',x,1.62,5.36,.50,.52,.50,silver);
    for(const y of [1.43,1.88,2.50,2.91,3.25])box('Entrance doorway silver carved collar',x,y,5.36,.52,.14,.52,silver);
    box('Entrance doorway silver capital',x,3.38,5.36,.72,.18,.66,silver);
    K.blocker(x,5.36,.60,.60,.6,3.5);
  }
  scallop('Entrance doorway scalloped white beam',39,5.37,3.65,3.64,.24,whiteTrim,.30);
  box('Entrance doorway fluorescent tube',39,3.37,5.49,2.30,.075,.08,whiteTrim);
  // Preserve the photographed paintings and inscription using UV regions of the
  // unchanged original, rather than inventing sacred images or lettering.
  const doorTexture=new THREE.TextureLoader().load('./assets/temple-doorway.jpg');
  doorTexture.colorSpace=THREE.SRGBColorSpace;
  function doorPhoto(n,x,y,z,w,h,rect){
    const geo=new THREE.PlaneGeometry(w,h),uv=geo.attributes.uv;
    const [u0,v0,u1,v1]=rect;
    for(let i=0;i<uv.count;i++)uv.setXY(i,u0+uv.getX(i)*(u1-u0),1-v1+uv.getY(i)*(v1-v0));
    const material=new THREE.MeshStandardMaterial({map:doorTexture,roughness:.9});
    const o=mesh(n,geo,material,x,y,z);o.rotation.y=Math.PI;return o;
  }
  // Rectify the four photographed frames with a projective UV map. Source
  // photographs remain unchanged; subdivision preserves the perspective warp.
  function deityPhoto(name,x,url,corners){
    const tex=new THREE.TextureLoader().load('./assets/'+url);tex.colorSpace=THREE.SRGBColorSpace;
    const q=corners.map(([u,v])=>[u/1824,v/1368]);
    const [a,b,c,d]=q,dx1=b[0]-c[0],dx2=d[0]-c[0],dx3=a[0]-b[0]+c[0]-d[0];
    const dy1=b[1]-c[1],dy2=d[1]-c[1],dy3=a[1]-b[1]+c[1]-d[1];
    const det=dx1*dy2-dx2*dy1,hg=(dx3*dy2-dx2*dy3)/det,hh=(dx1*dy3-dx3*dy1)/det;
    const geo=new THREE.PlaneGeometry(1.55,1.92,16,20),uv=geo.attributes.uv;
    for(let i=0;i<uv.count;i++){
      const u=uv.getX(i),v=1-uv.getY(i),den=hg*u+hh*v+1;
      uv.setXY(i,((b[0]-a[0]+hg*b[0])*u+(d[0]-a[0]+hh*d[0])*v+a[0])/den,
        1-((b[1]-a[1]+hg*b[1])*u+(d[1]-a[1]+hh*d[1])*v+a[1])/den);
    }
    const o=mesh(name,geo,new THREE.MeshStandardMaterial({map:tex,roughness:.92}),x,2.0,5.82);o.rotation.y=Math.PI;
    box(name+' timber frame',x,2.0,5.86,1.66,2.03,.055,K.M.wood);
    o.userData.source=url;o.userData.photoCorners=corners;
  }
  // Facing into the temple, +X is the viewer's left: Ganesh, Shiva, Vishnu, Hanuman.
  deityPhoto('Entrance Ganesh original painting',44.2,'temple-ganesh-shiva.jpg',[[283,421],[838,352],[867,984],[316,991]]);
  deityPhoto('Entrance doorway left original painting',42.35,'temple-ganesh-shiva.jpg',[[991,306],[1515,269],[1550,966],[1037,985]]);
  deityPhoto('Entrance doorway right original painting',35.65,'temple-vishnu.jpg',[[333,54],[1085,100],[1104,1061],[365,1113]]);
  deityPhoto('Entrance Hanuman original painting',33.8,'temple-hanuman.jpg',[[459,3],[1549,179],[1598,1116],[469,1283]]);
  doorPhoto('Entrance doorway original inscription',39,3.18,5.738,3.63,.59,[.306,.133,.690,.283]);
  // The painted blue marbling and red drapes of the surround, from the same photograph.
  doorPhoto('Entrance doorway original painted left surround',40.52,1.74,5.745,.69,2.27,[.2975,.27,.395,.70]);
  doorPhoto('Entrance doorway original painted right surround',37.48,1.74,5.745,.69,2.27,[.6175,.27,.705,.70]);
  const flowers=[];
  for(let i=0;i<=45;i++){
    const t=i/45,x=37.95+2.1*t,y=2.96-.50*Math.sin(t*Math.PI);
    flowers.push([x,y,5.60,.042,.045,.043]);
  }
  instances('Entrance doorway flower garland',new THREE.SphereGeometry(1,6,4),mat('#d1ad49'),flowers);

  steps('Courtyard descending stair',39,6.92,2.5,1.56,.1,.20,'-z',2);
  floor('Courtyard exit landing',39,7.9,2.5,.45,.1,stoneFloor);
  const colX=[32,36.65,41.35,46];
  for(const x of colX){
    box('Entrance square white pier',x,2.11,-1.42,.48,3.02,.48,white,true);
    box('Entrance pier stone foot',x,.95,-1.42,.53,.70,.54,stoneFloor);
    box('Entrance pier white capital',x,3.49,-1.42,.80,.25,.70,whiteTrim);
    blueColumn('Entrance upper pale blue pier',x,-1.42,4.08,2.25);
  }
  // White pierced scroll brackets in the upper corners of each front opening.
  const bracketShape=new THREE.Shape();
  bracketShape.moveTo(0,0);bracketShape.lineTo(.36,0);bracketShape.bezierCurveTo(.36,-.09,.20,-.07,.15,-.19);
  bracketShape.bezierCurveTo(.11,-.28,.13,-.36,.05,-.42);bracketShape.lineTo(0,-.42);bracketShape.closePath();
  const eye=new THREE.Path();eye.absarc(.10,-.11,.04,0,Math.PI*2,true);bracketShape.holes.push(eye);
  const bracketGeometry=new THREE.ExtrudeGeometry(bracketShape,{depth:.07,bevelEnabled:false,curveSegments:8});
  const brackets=[];
  colX.forEach((x,i)=>{for(const side of [-1,1]){if((i===0&&side<0)||(i===colX.length-1&&side>0))continue;
    brackets.push([x+side*.24,2.87,-1.47,side,1,1]);}});
  instances('Entrance white scroll brackets',bracketGeometry,whiteTrim,brackets);
  for(const x of [32.6,45.4])carvedColumn('Rear carved column',x,4.25,.6,3.02,.87);
  box('Front flat ground lintel',39,3.59,-1.39,14.5,.24,.38,whiteTrim);
  box('Front flat upper lintel',39,6.38,-1.39,14.5,.24,.35,whiteTrim);
  // Perimeter mouldings, not a solid slab across the stairwell.
  for(const z of [-2.03,6.15])box('First storey cornice',39,3.76,z,18.35,.24,.20,whiteTrim);
  for(const x of [29.94,48.06])box('First storey side cornice',x,3.76,2.05,.20,.24,8.4,whiteTrim);
  // The family identifies the inner-building photos as views from this gallery.
  // Open its courtyard side and leave a real stairwell in the upper floor.
  floor('Upper gallery main floor',37.79,2.08,15.23,8.0,4.08,oxideFloor);
  floor('Upper gallery stair-side strip',47.39,2.08,.87,8.0,4.08,oxideFloor);
  floor('Upper gallery front bridge',46.18,-.42,1.56,3.0,4.08,oxideFloor);
  floor('Upper gallery stair landing',46.18,6.02,1.56,.36,4.08,oxideFloor);
  // 15.15.51: from the entrance hall the gallery slab reads as a whitewashed ceiling.
  box('Entrance hall whitewashed ceiling under gallery',37.79,3.892,2.08,15.23,.012,8.0,white);
  box('Entrance hall whitewashed ceiling under gallery',47.39,3.892,2.08,.87,.012,8.0,white);
  steps('Temple gallery access stair',46.18,3.49,1.52,4.86,.6,4.08,'z',22);
  for(const x of [45.32,47.06])K.beam(g,'Gallery stair timber handrail',[x,1.58,1.06],[x,5.10,5.92],.065,K.M.wood);
  K.railing(g,'Upper stairwell guard',45.33,1.25,45.33,5.35,4.08,.94,paleBlue);
  // Courtyard-facing balcony in 15.02.27 / 15.03.51, distinct from the street facade.
  box('Courtyard gallery white terrace parapet',32.95,4.53,6.13,5.20,.90,.22,white,true);
  box('Courtyard gallery red balcony base',41.65,4.16,6.13,12.1,.16,.27,red);
  box('Courtyard gallery red balcony coping',41.65,5.04,6.13,12.1,.16,.27,red);
  const courtLace=[];
  for(let i=0;i<=7;i++)box('Courtyard gallery red balcony pier',35.60+i*12.1/7,4.60,6.13,.17,1.0,.25,red);
  for(let i=0;i<7;i++)courtLace.push([35.60+(i+.5)*12.1/7,4.60,6.14,.80,.77,1]);
  instances('Courtyard gallery white floral lattice',openworkGeometry(),whiteTrim,courtLace);
  K.blocker(41.65,6.13,12.1,.26,4.08,5.12);
  box('Courtyard gallery left white upper wall',33.0,5.37,4.72,5.7,2.46,.19,white,true);
  for(const x of [31.4,33.25,35.0]){
    box('Courtyard upper blue window frame',x,5.45,4.85,1.12,1.65,.14,blue);
    box('Courtyard upper window dark recess',x,5.45,4.94,.94,1.47,.04,dark);
    for(let y=4.78;y<6.15;y+=.15)box('Courtyard upper horizontal window grille',x,y,4.99,.94,.025,.025,whiteTrim);
    for(const dx of [-.52,.52]){
      const leaf=box('Courtyard upper open timber shutter',x+dx,5.45,5.18,.065,1.59,.55,K.M.wood);leaf.rotation.y=dx<0?-.22:.22;
    }
  }
  // Dark upper rooms and diamond transoms behind the shaded balcony.
  for(const [a,b] of [[35.75,41.16],[42.44,44.35]])box('Courtyard gallery shaded upper back',(a+b)/2,5.36,3.7,b-a,2.40,.18,oldStone,true);
  box('Gallery hall doorway header',41.8,6.40,3.7,1.28,.32,.18,oldStone,true);
  for(const x of [37.8]){
    box('Courtyard gallery upper timber doorway',x,5.22,3.83,1.28,2.12,.11,K.M.wood);
    box('Courtyard gallery upper doorway shadow',x,5.02,3.91,1.08,1.55,.035,dark);
    for(let j=0;j<6;j++)for(const sign of [-1,1])K.beam(g,'Courtyard upper doorway diamond transom',[x-.45+j*.18,5.68,3.96],[x-.45+j*.18+sign*.24,6.10,3.96],.034,whiteTrim);
  }

  for(const x of [30.48,47.53])box('Upper courtyard gallery end post',x,5.19,6.04,.23,2.22,.24,white,true);
  box('Upper courtyard gallery lintel',39,6.32,6.04,17.65,.24,.29,K.M.wood);

  // 15.19.41: red-framed floral balcony, pale-blue scalloped opening,
  // weathered flat canopy and open metal gates. The gabled building is adjacent.
  // The photographed screens are mostly solid white, pierced by mirrored
  // paisleys, leaves and a central rosette; holes are real alpha cut-outs.
  const entranceLace=whiteTrim.clone();entranceLace.side=THREE.DoubleSide;entranceLace.alphaTest=.5;
  entranceLace.map=(()=>{
    if(typeof document==='undefined')return null;
    const W=512,H=236,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
    x.fillStyle='#f2efe6';x.fillRect(0,0,W,H);
    for(let i=0;i<260;i++){x.fillStyle=`rgba(70,74,62,${.02+rand()*.07})`;x.fillRect(rand()*W,rand()*H,1+rand()*3,2+rand()*14);}
    x.globalCompositeOperation='destination-out';x.fillStyle='#000';
    const drop=(px,py,len,wid,ang,curl=0)=>{x.save();x.translate(px,py);x.rotate(ang);x.beginPath();
      x.moveTo(0,-len/2);x.bezierCurveTo(wid*(1+curl),-len/4,wid,len/3,0,len/2);x.bezierCurveTo(-wid,len/3,-wid*(1-curl),-len/4,0,-len/2);x.fill();x.restore();};
    const cx=W/2,cy=H/2;
    for(let i=0;i<8;i++){const a=i*Math.PI/4;drop(cx+Math.cos(a)*27,cy+Math.sin(a)*27,30,9,a+Math.PI/2);}
    for(const sx of [-1,1])for(const sy of [-1,1]){
      drop(cx+sx*78,cy+sy*42,62,15,sx*sy*1.05,.5);
      drop(cx+sx*132,cy+sy*62,44,11,-sx*sy*.55,.4);
      drop(cx+sx*176,cy+sy*30,52,12,sx*sy*.35,.5);
      drop(cx+sx*210,cy+sy*72,26,8,sx*sy*.9);
      drop(cx+sx*104,cy+sy*84,24,7,sx*sy*1.4);
      x.beginPath();x.arc(cx+sx*148,cy+sy*14,7,0,Math.PI*2);x.fill();
      x.beginPath();x.arc(cx+sx*60,cy+sy*88,6,0,Math.PI*2);x.fill();
    }
    for(const sx of [-1,1]){drop(cx+sx*222,cy,36,10,0);drop(cx+sx*46,cy,22,7,Math.PI/2);}
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
  })();
  const screenGeometry=new THREE.PlaneGeometry(1.86,.86);
  const entryPanels=[];
  for(const [a,b] of [[30.3,37.6],[40.4,47.7]]){
    const count=Math.round((b-a)/1.8),step=(b-a)/count;
    box('Entrance balcony red base',(a+b)/2,4.12,-1.88,b-a,.20,.40,red);
    box('Entrance balcony red coping',(a+b)/2,5.11,-1.88,b-a+.12,.15,.36,red);
    for(let i=0;i<=count;i++)box('Entrance balcony red post',a+i*step,4.62,-1.88,.16,1.02,.25,red);
    for(let i=0;i<count;i++)entryPanels.push([a+(i+.5)*step,4.62,-1.91,(step-.18)/1.86,.96,1]);
    K.blocker((a+b)/2,-1.88,b-a,.3,4.08,5.20);
  }
  instances('Entrance balcony white pierced screens',screenGeometry,entranceLace,entryPanels);
  box('Entrance central balcony low wall',39,4.44,-1.72,2.8,.7,.19,white);
  K.blocker(39,-1.72,2.8,.19,4.08,4.79);
  for(const x of [37.48,40.52])box('Entrance upper blue arch pier',x,5.30,-1.66,.35,2.44,.40,paleBlue,true);
  const arch=new THREE.Shape();
  arch.moveTo(-1.7,7.61);arch.lineTo(1.7,7.61);arch.lineTo(1.7,5.60);
  arch.lineTo(1.36,5.60);arch.quadraticCurveTo(1.50,6.18,1.04,6.24);
  arch.quadraticCurveTo(1.02,6.83,.60,6.59);arch.quadraticCurveTo(.48,7.12,0,7.20);
  arch.quadraticCurveTo(-.48,7.12,-.60,6.59);arch.quadraticCurveTo(-1.02,6.83,-1.04,6.24);
  arch.quadraticCurveTo(-1.50,6.18,-1.36,5.60);arch.lineTo(-1.7,5.60);arch.closePath();
  const entranceArch=mesh('Entrance upper blue scalloped arch',new THREE.ExtrudeGeometry(arch,{depth:.30,bevelEnabled:false,curveSegments:12}),paleBlue,39,4.08*(1-.72),-1.80);entranceArch.scale.y=.72;
  // 15.21.47: the upper storey is enclosed behind its shallow front balcony.
  // Its courtyard-facing gallery remains usable for the three interior views.
  const upperRoomWall=mat('#807c70'),upperTimber=mat('#413e36');
  // 15.12.22: the central bay is open from the balcony back into the hall, round a stair
  // well; only the side bays are walled.
  for(const [a,b] of [[30.22,36.0],[40.7,47.78]]){
    box('Entrance upper enclosed room wall',(a+b)/2,5.29,-.22,b-a,2.42,.24,upperRoomWall,true);
    box('Entrance upper wall lower band',(a+b)/2,4.30,-.36,b-a,.44,.06,white);
  }
  for(const x of [33.0,35.3,42.7,45.0]){
    box('Entrance upper timber window frame',x,5.43,-.39,1.10,1.57,.13,upperTimber);
    box('Entrance upper shaded window recess',x,5.43,-.47,.88,1.32,.04,dark);
    const grille=[];
    for(let dx=-.38;dx<=.4;dx+=.19)for(const sign of [-1,1])grille.push([x+dx,5.43,-.51,.032,1.34,.028,0,0,sign*.28]);
    instances('Entrance upper dark window lattice',new THREE.BoxGeometry(1,1,1),upperTimber,grille);
  }
  // 15.12.42: upper entrance hall, looking along blue windows past rows
  // of folding chairs and narrow tables. Arrangement is inferred in this wing.
  const galleryChair=mat('#287d91',.48,{metalness:.22}),galleryTable=mat('#96988d',.35);
  const upperInside=K.M.plaster.clone();upperInside.color.set('#dcd8c7');
  const upperConcrete=K.M.plaster.clone();upperConcrete.color.set('#8c8b81');upperConcrete.roughness=.86;
  floor('Upper hall worn gray concrete floor',37.8,1.65,15.2,3.48,4.09,upperConcrete);
  for(const [a,b] of [[30.3,36.0],[40.7,47.7]])box('Upper hall pale interior wall face',(a+b)/2,5.30,-.095,b-a,2.38,.014,upperInside);
  const backShape=new THREE.Shape();backShape.moveTo(-.23,-.18);backShape.lineTo(.23,-.18);backShape.lineTo(.23,.08);backShape.quadraticCurveTo(.23,.20,.11,.20);backShape.lineTo(-.11,.20);backShape.quadraticCurveTo(-.23,.20,-.23,.08);backShape.closePath();
  const chairBackGeometry=new THREE.ExtrudeGeometry(backShape,{depth:.022,bevelEnabled:true,bevelSize:.012,bevelThickness:.007,bevelSegments:2,steps:1});
  for(const [a,b] of [[30.3,36.0],[40.7,47.7]])box('Upper hall red interior wall skirt',(a+b)/2,4.42,-.08,b-a,.68,.025,red);
  for(const x of [33.0,35.3,42.7,45.0]){
    for(const dx of [-.58,.58])box('Upper hall blue inner window jamb',x+dx,5.39,-.06,.09,1.66,.10,blue);
    for(const y of [4.58,6.20])box('Upper hall blue inner window rail',x,y,-.06,1.24,.09,.10,blue);
    box('Upper hall inner window shadow',x,5.39,-.075,1.1,1.55,.014,dark);
    for(let y=4.69;y<6.18;y+=.16)box('Upper hall white horizontal window bars',x,y,.01,1.1,.023,.03,whiteTrim);
  }
  for(const x of [31.8,34.2,36.6,39,41.4,43.8]){
    box('Upper hall square plaster column',x,5.32,2.08,.35,2.48,.35,upperInside,true);
    box('Upper hall square column red foot',x,4.42,2.08,.37,.68,.37,red);
    const crossBeam=box('Upper hall white transverse beam',x,6.34,1.65,.36,.28,3.5,upperInside);K.roofs.push(crossBeam);
  }
  const upperCeiling=box('Upper hall flat plaster ceiling',37.8,6.53,1.62,15.2,.12,3.55,upperInside);K.roofs.push(upperCeiling);
  // Tubular crossed legs and curved metal back distinguish folding chairs
  // from the plastic stacks in the downstairs hall.
  for(let i=0;i<17;i++){
    const x=32.0+i*.67,z=1.61;if(x<36||(x>36.9&&x<41))continue; // Clear walkway behind the stair well; the corner block's upper front stands west of x 36.
    box('Upper hall folding chair seat',x,4.53,z,.49,.045,.43,galleryChair);
    const back=mesh('Upper hall folding chair rounded blue back',chairBackGeometry,galleryChair,x,4.84,z+.23);back.rotation.x=-.12;
    for(const dx of [-.225,.225]){
      K.beam(g,'Upper hall folding chair crossed leg',[x+dx,4.1,z-.30],[x+dx,4.61,z+.20],.023,galleryChair);
      K.beam(g,'Upper hall folding chair back leg',[x+dx,4.1,z+.32],[x+dx,5.04,z+.19],.023,galleryChair);
    }
    K.blocker(x,z,.53,.62,4.08,5.07);
  }
  for(const x of [43.0]){
    box('Upper hall narrow folding tabletop',x,4.81,.88,2.38,.045,.48,galleryTable);
    for(const dx of [-.82,.82]){
      K.beam(g,'Upper hall table folding leg',[x+dx-.20,4.1,.63],[x+dx+.20,4.79,1.08],.027,dark);
      K.beam(g,'Upper hall table crossed leg',[x+dx+.20,4.1,.63],[x+dx-.20,4.79,1.08],.027,dark);
    }
    K.blocker(x,.88,2.38,.48,4.08,4.84);
  }
  box('Upper hall low inner roof white base',38.8,4.43,2.94,4.65,.70,1.35,upperInside,true);
  const hallRoofTile=K.M.tile.clone();hallRoofTile.color.set('#bc7951');
  K.hipRoof(g,'Upper hall photographed small tiled roof',38.8,2.94,5.1,1.65,4.80,.65,hallRoofTile);
  for(const x of [33.8,37.8,42.0]){
    cyl('Upper hall fan suspension',x,6.16,1.25,.015,.015,.44,dark,8);
    cyl('Upper hall ceiling fan motor',x,5.92,1.25,.11,.11,.08,dark,12);
    for(let j=0;j<3;j++){
      const a=j*Math.PI*2/3,b=box('Upper hall ceiling fan blade',x+.29*Math.cos(a),5.92,1.25+.29*Math.sin(a),.48,.022,.09,dark);b.rotation.y=-a;
    }
    box('Upper hall tube light',x,6.18,.03,1.25,.055,.065,whiteTrim);
  }
  // Diamond transoms are genuinely open, leaving the interior visible below.
  const diamonds=[];
  for(const [a,b] of [[32.3,36.35],[36.95,41.05],[41.65,45.7]]){
    box('Entrance white transom lower rail',(a+b)/2,2.93,-1.43,b-a,.12,.20,whiteTrim);
    for(let x=a+.12;x<b-.12;x+=.30)for(const sign of [-1,1])diamonds.push([x,3.22,-1.43,.043,.64,.045,0,0,sign*.50]);
  }
  instances('Entrance white diamond transoms',new THREE.BoxGeometry(1,1,1),whiteTrim,diamonds);
  const flatCanopy=box('Entrance weathered flat canopy',39,6.62,.2,18.5,.24,5.0,K.M.plaster);K.roofs.push(flatCanopy);
  box('Entrance flat canopy dark fascia',39,6.61,-2.27,18.7,.29,.16,oldStone);
  const leftGalleryRoof=box('Courtyard left flat upper roof',32.8,6.62,4.52,5.9,.24,4.4,white);K.roofs.push(leftGalleryRoof);
  const galleryRoof=new THREE.Group();galleryRoof.name='Courtyard gallery sloping corrugated roof';g.add(galleryRoof);K.roofs.push(galleryRoof);
  for(let i=0;i<80;i++){
    const x=35.66+i*.16;
    K.beam(galleryRoof,'Courtyard gallery dark corrugated sheet',[x,7.02,2.55],[x,6.33,7.04],.165,darkRoof,.07);
  }
  for(const x of [36,38.4,40.8,43.2,45.6,48]){
    K.beam(galleryRoof,'Courtyard gallery exposed timber rafter',[x,6.90,2.55],[x,6.20,7.16],.09,K.M.wood,.14);
    K.beam(g,'Courtyard gallery slender timber support',[x,4.08,6.02],[x,6.41,6.02],.065,K.M.wood);
  }

  for(const z of [-1.7,.2,2.1,4,5.9])box('Entrance exposed canopy beam',39,6.39,z,17.8,.21,.18,z>0&&z<3?upperInside:K.M.wood);
  box('Entrance balcony projecting white slab',39,3.94,-1.96,18.45,.21,1.02,white);
  box('Entrance balcony red slab edge',39,4.03,-2.46,18.55,.16,.12,red);
  // The two leaves are open along the sides of the low central approach.
  const gateMetal=mat('#a5a9a4',.45,{metalness:.6});
  for(const side of [-1,1]){
    const x=39+side*1.45;
    for(let i=0;i<7;i++)box('Entrance open gate vertical bar',x,.99,-2.88+i*.17,.033,1.48,.035,gateMetal);
    for(const y of [.26,.70,1.54])box('Entrance open gate crossrail',x,y,-2.37,.045,.043,1.05,gateMetal);
    const curve=new THREE.EllipseCurve(0,0,.52,.28,0,Math.PI,false,0);
    const pts=curve.getPoints(20).map(p=>new THREE.Vector3(x,1.53+p.y,-2.37+p.x));
    mesh('Entrance open gate arched top',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),20,.026,6,false),gateMetal);
    K.blocker(x,-2.38,.06,1.1,0,1.84);
  }
  // Projecting entrance portico: the wash wall is its right-hand side (-X).
  // Both wall and basin reach the ground and meet the existing wing at the rear.
  box('Entrance wash wall',30.1,.85,-.09,.24,1.70,3.9,white,true);
  box('Entrance wash wall damp base',29.965,.20,-.09,.035,.40,3.9,oldStone);
  box('Entrance wash trough grounded base',29.66,.14,-.09,.80,.28,3.9,oldStone);
  box('Entrance wash trough',29.66,.31,-.09,.80,.06,3.9,stoneFloor);
  for(const z of [1.21,.41,-.39,-1.19]){
    K.beam(g,'Entrance wash tap spout',[29.96,1.04,z],[29.72,1.04,z],.035,gateMetal);
    box('Entrance wash tap handle',29.85,1.12,z,.03,.026,.15,gateMetal);
  }
  box('Entrance projecting corner white pier',30.1,2.13,-1.82,.37,3.06,.37,white,true);
  box('Entrance projecting corner stone foot',30.1,.86,-1.82,.45,.52,.45,stoneFloor);
  box('Entrance projecting side slab',30.07,3.94,-.1,.60,.21,4.25,white);
  blueColumn('Entrance projecting upper side pier',30.1,-1.82,4.08,2.25);
  box('Entrance projecting balcony side base',30.1,4.12,-.68,.26,.20,2.4,red);
  box('Entrance projecting balcony side coping',30.1,5.11,-.68,.26,.15,2.4,red);
  for(const z of [-1.88,-.68,.52])box('Entrance projecting balcony side post',30.1,4.62,z,.23,1.02,.16,red);
  const sideLace=instances('Entrance projecting side pierced screens',screenGeometry,entranceLace,
    [[30.1,4.62,-1.28,.56,.96,1,0,Math.PI/2,0],[30.1,4.62,-.08,.56,.96,1,0,Math.PI/2,0]]);
  K.blocker(30.1,-.68,.26,2.4,4.08,5.20);
  // 15.12.22: pierced balustrades with red posts and coping round the stair well in the
  // open central bay, and the temple's blue name board on its far side.
  {const y0=4.09,top=5.08,wellScreens=[];
   for(const x of [37.5,40.4]){
     box('Upper stair well red coping',x,top,-.7,.2,.1,2.0,red);
     K.blocker(x,-.7,.2,2.0,y0,top+.05);
     for(const z of [-1.7,-.7,.3])box('Upper stair well red post',x,(y0+top)/2,z,.2,top-y0,.2,red);
     for(const z of [-1.2,-.2])wellScreens.push([x,4.55,z,.44,.82,1,0,Math.PI/2,0]);}
   box('Upper stair well red coping',38.95,top,.3,3.1,.1,.2,red);K.blocker(38.95,.3,3.1,.2,y0,top+.05);
   for(const x of [38.23,39.67])wellScreens.push([x,4.55,.3,.66,.82,1,0,0,0]);
   instances('Upper stair well white pierced screens',screenGeometry,entranceLace,wellScreens);
   box('Temple name board blue face',38.95,5.52,.38,3.4,.82,.12,mat('#2a45a8'));
   box('Temple name board white edge',38.95,5.52,.45,3.5,.92,.04,whiteTrim);
   // 15.12.22: white Kannada lettering on the road-side face (the donor line is left off).
   const lettering=canvasMap(1024,(c,S)=>{
     c.fillStyle='#2a45a8';c.fillRect(0,0,S,S);c.fillStyle='#f2f2ee';c.textAlign='center';c.textBaseline='middle';
     // The square canvas spans a 3.3 x 0.76 m face: squeeze x so the glyphs keep their shape.
     const k=.76/3.3,W=S/k;c.scale(k,1);
     const font=px=>`bold ${px}px "Noto Sans Kannada","Nirmala UI","Tunga","Kannada Sangam MN",sans-serif`;
     c.font=font(96);c.fillText('॥ ಶ್ರೀ ಶಂಕರನಾರಾಯಣ ಪ್ರಸನ್ನ ॥',W/2,S*.13);
     c.font=font(360);c.fillText('ಶ್ರೀ ಶಂಕರನಾರಾಯಣ ದೇವಸ್ಥಾನ',W/2,S*.46,W*.94);
     c.font=font(120);c.fillText('ಶ್ರೀ ಕ್ಷೇತ್ರ, ಶಂಕರನಾರಾಯಣ, ಕುಂದಾಪುರ ತಾ॥',W/2,S*.8);
   });
   if(lettering){lettering.wrapS=lettering.wrapT=THREE.ClampToEdgeWrapping;
     const face=mesh('Temple name board lettering',new THREE.PlaneGeometry(3.3,.76),mat('#ffffff',.8,{map:lettering}),38.95,5.52,.315);face.rotation.y=Math.PI;}}

  // 15.01.44–15.05.48: a rectangular, open-air circuit, with distinct shrine
  // bays on raised verandas. Extend the inferred rear court to leave a real
  // passage behind the older inner building; the entrance alignment is fixed.
  const agedWhite=white.clone();agedWhite.map=canvasMap(512,(c,s)=>{
    c.fillStyle='#e1e0d6';c.fillRect(0,0,s,s);
    for(let i=0;i<1600;i++){const x=rand()*s,y=rand()*s;c.fillStyle=`rgba(42,52,37,${.015+rand()*.15})`;c.fillRect(x,y,1+rand()*5,3+rand()*27);}
  });agedWhite.color.set('#ffffff');
  const outlinedPlinth=white.clone();outlinedPlinth.map=canvasMap(512,(c,s)=>{
    c.fillStyle='#ddd9cd';c.fillRect(0,0,s,s);c.strokeStyle='#a0584e';c.lineWidth=6;
    for(let row=0;row<4;row++)for(let col=-1;col<5;col++)c.strokeRect(col*128+(row%2)*64,128*row,128,128);
    for(let i=0;i<600;i++){c.fillStyle=`rgba(42,56,35,${rand()*.16})`;c.fillRect(rand()*s,rand()*s,2+rand()*8,2+rand()*17);}
  },1.15,1.15);outlinedPlinth.color.set('#ffffff');
  // 15.01.44–15.03.38: pale grey granite slabs, about 0.5–1 m by 0.4–0.5 m,
  // laid in running rows across the courtyard with thin dark joints, a faint
  // warm cast and soft grey-green weathering; not a regular tile grid.
  const flagstones=mat('#ffffff',.9);
  flagstones.map=canvasMap(1024,(c,s)=>{
    c.fillStyle='#5d5a53';c.fillRect(0,0,s,s);
    let y=0;
    while(y<s){const h=Math.min(s-y,58+rand()*20);let x=-rand()*120;
      // 15.03.33 / 15.04.55 / 15.11.08: weathered grey-brown granite, darker than fresh stone.
      while(x<s){const w=78+rand()*72,v=140+rand()*30|0,t=rand()*8-3|0;
        for(const ox of [0,s])if(x+ox<s+160){c.fillStyle=`rgb(${v+t+10},${v+t+3},${v-9})`;c.fillRect(x+ox+1.2,y+1.2,w-2.4,h-2.4);}
        for(let k=0;k<4;k++){c.fillStyle=`rgba(${rand()<.3?80:60},${rand()<.3?88:66},62,${.04+rand()*.09})`;c.beginPath();c.ellipse(x+rand()*w,y+rand()*h,4+rand()*18,3+rand()*9,rand()*3,0,Math.PI*2);c.fill();}
        c.fillStyle='rgba(245,242,230,.12)';c.fillRect(x+4,y+3,w-8,2);
        c.fillStyle='rgba(60,60,52,.10)';c.fillRect(x+3,y+h-5,w-6,3);
        x+=w;}
      y+=h;}
    for(let i=0;i<70;i++){c.fillStyle=`rgba(52,58,48,${.03+rand()*.06})`;c.beginPath();c.ellipse(rand()*s,rand()*s,20+rand()*70,10+rand()*40,rand()*3,0,Math.PI*2);c.fill();}
  },.3,.3);
  // User confirmed wider side passages and a more distant rear range (27 Sep).
  // East receives +4 m in the placement pass below, previously +1.5 m.
  floor('Courtyard large stone paving',38.25,25.85,31,39.5,.1,flagstones);
  // Each entry is a continuous veranda section. The broad shaded front hall
  // remains on photo-right; the other stretches have slimmer flat-roof walks.
  const verandaRuns=[
    {side:1,wall:53.86,edge:51.05,a:6.4,b:45.4,stairs:[16.2,21.4,27.2,40.6]},
    {side:-1,wall:24.14,edge:28.45,a:6.4,b:16.2,stairs:[12],round:true},
    // User's note: the west veranda's court edge lines up with the covered hall's platform (x 24.2).
    {side:-1,wall:22.64,edge:24.2,a:16.2,b:45.4,stairs:[38.9],wallA:19.9},
  ];
  for(const r of verandaRuns){
    const xc=(r.wall+r.edge)/2,zc=(r.a+r.b)/2,d=r.b-r.a,w=Math.abs(r.wall-r.edge);
    if(r.side>0){
      // The small shrine stairs are recessed into the raised veranda.
      // Split both the visible slab and walkable surface around their slots.
      let start=r.a;
      for(const z of [16.2,21.4]){
        floor('Outer circuit raised red veranda',xc,(start+z-.72)/2,w,z-.72-start,.6,oxideFloor);
        floor('Outer shrine rear threshold',(52.45+r.wall)/2,z,r.wall-52.45,1.44,.6,oxideFloor);
        for(const side of [-1,1])box('Outer shrine recessed stair side riser',51.75,.35,z+side*.73,1.40,.50,.045,oldStone);
        start=z+.72;
      }
      floor('Outer circuit raised red veranda',xc,(start+r.b)/2,w,r.b-start,.6,oxideFloor);
    }else if(!r.round)floor('Outer circuit raised red veranda',xc,zc,w,d,.6,oxideFloor);
    // The west wall starts behind the covered hall's deepened stage bay (wallA).
    {const wa=r.wallA??r.a;
    if(!r.round)box('Outer circuit weathered white wall',r.wall,2.05,(wa+r.b)/2,.27,2.9,r.b-wa,agedWhite,true);
    if(!r.round)box('Outer circuit red wall skirting',r.wall-r.side*.16,.90,(wa+r.b)/2,.065,.6,r.b-wa,red);}
    // Real notches in the plinth align with steps instead of blocking them.
    const cuts=[r.a,...r.stairs.flatMap(z=>[z-.72,z+.72]),r.b];
    for(let i=0;!r.round&&i<cuts.length-1;i+=2){const lo=cuts[i],hi=cuts[i+1];
      box('Outer circuit white red-outlined plinth',r.edge,.30,(lo+hi)/2,.22,.40,hi-lo,outlinedPlinth);
      box('Outer circuit plinth white coping',r.edge,.56,(lo+hi)/2,.29,.09,hi-lo,whiteTrim);
      box('Outer circuit damp plinth foot',r.edge,.14,(lo+hi)/2,.24,.16,hi-lo,oldStone);
    }
    const count=Math.round(d/2.8);
    for(let i=0;i<=count;i++){
      const z=r.a+.2+(d-.4)*i/count;
      if(r.side>0&&[16.2,21.4].some(center=>Math.abs(z-center)<2.5))continue;
      if(r.side>0&&z>35.7&&z<43.7)continue; // Four shared piers frame the three vaulted bays below.
      if(r.side>0&&z<16)continue; // 15.01.44 / 15.02.23: only the shutter bay's own piers stand here.
      if(r.round&&z>8&&z<15)continue; // 15.02.00 / IMG_20130720_180653: the mid-span column stands at z 10.1 (added below).
      if(r.round){cyl('Right hall round red column foot',r.edge,.36,z,.19,.19,.52,red,16);cyl('Right hall round cyan column',r.edge,1.96,z,.14,.17,2.68,paleBlue,16);K.blocker(r.edge,z,.38,.38,.1,3.4);}
      else blueColumn('Outer circuit pale blue column',r.edge,z,.6,2.85);
      if(!r.round&&i%3===1)box('Outer circuit small blue donation box',r.edge-r.side*.23,1.13,z,.37,.35,.38,blue);
    }
    if(r.round){const z=10.1;cyl('Right hall round red column foot',r.edge,.36,z,.19,.19,.52,red,16);cyl('Right hall round cyan column',r.edge,1.96,z,.14,.17,2.68,paleBlue,16);K.blocker(r.edge,z,.38,.38,.1,3.4);}
    if(r.side>0)for(const center of [16.2,21.4])for(const side of [-1,1])
      blueColumn('Outer shrine flanking pale blue pier',r.edge,center+side*1.25,.6,2.85);
    for(const z of r.round?[]:r.stairs){
      if(r.side>0&&[16.2,21.4].includes(z)){
        steps('Outer shrine recessed access stair',51.75,z,1.4,1.4,.1,.6,'x',3);
      }else{
        steps('Outer circuit veranda access stair',r.edge-r.side*.57,z,1.2,1.4,.1,.6,r.side<0?'-x':'x',3);
        floor('Outer circuit stair landing',r.edge+r.side*.12,z,.38,1.4,.6,oxideFloor);
      }
    }
    const rg=new THREE.Group();rg.name='Outer circuit veranda roof';g.add(rg);K.roofs.push(rg);
    if(!r.round){
      K.box(rg,'Outer circuit flat white soffit',xc,3.57,zc,w+.5,.24,d+.18,agedWhite);
      K.box(rg,'Outer circuit red roof fascia',r.edge-r.side*.15,3.52,zc,.19,.20,d+.20,red);
      if(r.side>0)K.box(rg,'Outer circuit weathered terrace parapet',r.edge,4.01,zc,.22,.76,d,agedWhite);
      else {
        // 15.11.17: pierced white parapet and blue scallops above the west aisle.
        const pitch=(d-.4)/count;
        const panel=new THREE.Shape();panel.moveTo(-pitch/2+.14,-.32);panel.lineTo(pitch/2-.14,-.32);panel.lineTo(pitch/2-.14,.32);panel.lineTo(-pitch/2+.14,.32);panel.closePath();
        for(let x=-pitch/2+.28;x<pitch/2-.22;x+=.18)for(const y of [-.18,0,.18]){
          const hole=new THREE.Path();hole.moveTo(x,y+.07);hole.lineTo(x+.07,y);hole.lineTo(x,y-.07);hole.lineTo(x-.07,y);hole.closePath();panel.holes.push(hole);
        }
        const geo=new THREE.ExtrudeGeometry(panel,{depth:.10,bevelEnabled:false});
        for(let i=0;i<count;i++){
          const z=r.a+.2+pitch*(i+.5);
          const lattice=mesh('West veranda pierced parapet',geo,agedWhite,r.edge,4.05,z,rg);lattice.rotation.y=Math.PI/2;
          const arch=scallop('West veranda blue scalloped bay',0,0,pitch-.15,3.42,.18,paleBlue,.40);arch.rotation.y=Math.PI/2;arch.position.set(r.edge,0,z);
        }
        for(let i=0;i<=count;i++)K.box(rg,'West veranda parapet pier',r.edge,4.04,r.a+.2+pitch*i,.25,.84,.20,agedWhite);
        for(const y of [3.68,4.43])K.box(rg,'West veranda parapet continuous coping',r.edge,y,zc,.27,.10,d,agedWhite);
        K.blocker(r.edge,zc,.12,d,3.69,4.48);
      }
    }
    box('Outer circuit pale blue lintel',r.edge,3.35,zc,.28,.21,d,paleBlue);
  }
  // Rear range is authored at its final X extents, then translated 7.5 m in Z.
  const rearStart=markAssembly();
  floor('Rear circuit raised red veranda',40.25,36.65,35,2.65,.6,oxideFloor);
  box('Rear circuit weathered white wall',40.25,2.05,37.98,35,2.9,.28,agedWhite,true);
  box('Rear circuit red dado',40.25,.90,37.8,35,.60,.08,red);
  for(const x of [23.8,26.7,29.6,32.5,35.4,38.3,41.2,44.1,47,49.9,52.8,55.7,57.1])blueColumn('Rear circuit blue column',x,35.32);
  for(const [a,b] of [[22.75,30.4],[31.8,52.9],[54.3,57.75]]){
    box('Rear circuit outlined plinth',(a+b)/2,.30,35.3,b-a,.40,.22,outlinedPlinth);
    box('Rear circuit white plinth coping',(a+b)/2,.56,35.3,b-a,.09,.29,whiteTrim);
  }
  for(const x of [31.1,53.6])steps('Rear circuit access stair',x,34.75,1.4,1.15,.1,.6,'z',3);
  const rearRoof=new THREE.Group();rearRoof.name='Rear circuit flat roof';g.add(rearRoof);K.roofs.push(rearRoof);
  // A real stairwell interrupts the slab, leaving the front terrace continuous.
  for(const [x,z,w,d] of [[40.25,35.65,35.5,1.22],[26.3,37.21,7.6,1.9],[44.55,37.21,26.9,1.9]]){
    K.box(rearRoof,'Rear circuit flat soffit',x,3.57,z,w,.24,d,agedWhite);
    K.surface(x,z,w,d,3.69);
  }
  K.box(rearRoof,'Rear circuit red roof fascia',40.25,3.52,35.02,35.5,.2,.20,red);
  K.box(rearRoof,'Rear circuit weathered parapet',40.25,4.01,35.28,35.5,.76,.22,agedWhite);
  // The blue doorway and little upper balcony terminate the long left aisle.
  // 15.05.42 / 15.11.08: an upper room occupies the west part of the rear range,
  // distinct from the east corner pavilion, with open bays and a broad jali screen,
  // not the former solid wall or the unsupported room above the west passage.
  {const x0=24.8,x1=34.7,xm=(x0+x1)/2,w=x1-x0,zf=35.35,y0=3.69,y1=6.55;
   const shadedRearPlaster=agedWhite.clone();shadedRearPlaster.color.set('#73766d');
   K.box(rearRoof,'Rear upper storey back wall',xm,(y0+y1)/2,37.90,w,y1-y0,.22,shadedRearPlaster,true);
   for(const x of [x0+.11,x1-.11])K.box(rearRoof,'Rear upper storey side return',x,(y0+y1)/2,36.6,.22,y1-y0,2.6,agedWhite,true);
   K.box(rearRoof,'Rear upper storey red skirting',xm,y0+.25,37.77,w,.5,.03,red);
   K.box(rearRoof,'Rear upper storey flat slab',xm,y1+.08,36.6,w+.6,.16,3.6,agedWhite);
   K.box(rearRoof,'Rear upper storey red slab edge',xm,y1+.08,34.82,w+.6,.18,.12,red);
   K.box(rearRoof,'Rear upper storey solid west facade',25.355,(y0+y1)/2,zf,1.11,y1-y0,.22,agedWhite,true);
   for(const x of [24.91,25.8,29.0,34.59])K.box(rearRoof,'Rear upper open veranda pier',x,(y0+y1)/2,zf,.22,y1-y0,.24,agedWhite,true);
   for(const x of [25.4,32.5]){
     K.box(rearRoof,'Rear upper storey blue window frame',x,5.15,37.77,1.05,1.05,.05,mat('#3d7fa3'));
     K.box(rearRoof,'Rear upper storey dark window glass',x,5.15,37.74,.85,.85,.02,dark);}
   const screen=new THREE.Shape();screen.moveTo(-1.49,-1.02);screen.lineTo(1.49,-1.02);screen.lineTo(1.49,1.02);screen.lineTo(-1.49,1.02);screen.closePath();
   for(let row=0;row<10;row++)for(let col=0;col<15;col++){
     const x=(col-7)*.19,y=(row-4.5)*.19,hole=new THREE.Path();
     hole.moveTo(x,y+.078);hole.lineTo(x+.078,y);hole.lineTo(x,y-.078);hole.lineTo(x-.078,y);hole.closePath();screen.holes.push(hole);
   }
   mesh('Rear upper storey pierced jali panel',new THREE.ExtrudeGeometry(screen,{depth:.09,bevelEnabled:false}),whiteTrim,27.4,5.32,zf-.045,rearRoof);
   K.blocker(27.4,zf,2.98,.09,4.30,6.34);
   // The gallery photograph retains the dome behind this screen, supported by
   // the upper roof. Its exact position remains inferred from the oblique views.
   K.box(rearRoof,'Rear dome square roof base',27.4,6.80,37.25,2.35,.28,2.1,whiteTrim);
   mesh('Rear dome white drum',new THREE.CylinderGeometry(.92,1.06,.38,24),whiteTrim,27.4,7.10,37.25,rearRoof);
   const domeProfile=[[.60,0],[.73,.10],[.87,.29],[.88,.42],[.77,.57],[.55,.73],[.26,.85],[.13,.96]].map(p=>new THREE.Vector2(...p));
   mesh('Rear pale turquoise dome',new THREE.LatheGeometry(domeProfile,32),paleBlue,27.4,7.29,37.25,rearRoof);
   mesh('Rear dome finial',new THREE.CylinderGeometry(.025,.09,.30,12),brass,27.4,8.38,37.25,rearRoof);
  }
  // User's note with 15.11.17: no sideways stair across the open bay. The photo's steep
  // flight climbs straight back beside the door pier and vanishes into the floor above;
  // it is shown but not walkable.
  steps('Rear upper storey access stair',30.6,36.85,1.0,1.9,.6,3.45,'z',12);
  K.blocker(30.6,36.85,1.0,1.9,.6,3.5);
  // 15.11.08 / 15.11.17: enclosed white door/window bay in front of the
  // rear wall, with the stair bay open immediately to its east.
  for(const [a,b] of [[24.8,25.025],[25.975,27.15],[28.65,30.0]])
    box('Rear west enclosed white facade',(a+b)/2,2.025,35.48,b-a,2.85,.20,agedWhite,true);
  box('Rear west window white sill wall',25.5,1.15,35.48,.95,1.10,.20,agedWhite,true);
  box('Rear west window white head wall',25.5,3.10,35.48,.95,.70,.20,agedWhite,true);
  box('Rear west door white header',27.9,3.25,35.48,1.50,.40,.20,agedWhite,true);
  for(const [a,b] of [[24.8,27.15],[28.65,30.0]])box('Rear west facade red dado',(a+b)/2,.85,35.36,b-a,.50,.045,red);
  blueWindow('Rear west blue barred window',25.5,35.35,.80,2.25);
  for(let y=1.74;y<2.82;y+=.13)box('Rear west window horizontal bar',25.5,y,35.30,.80,.026,.035,blue);
  box('Rear west doorway dark recess',27.9,1.775,35.62,1.45,2.35,.025,dark);
  for(const x of [27.22,27.90,28.58])box('Rear west gate blue upright',x,1.78,35.34,.075,2.35,.075,blue);
  for(const x of [27.56,28.24])box('Rear west gate lower blue panel',x,1.04,35.34,.60,.84,.06,blue);
  for(let x=27.30;x<28.58;x+=.13)box('Rear west gate slender blue bar',x,2.20,35.34,.026,1.42,.035,blue);
  K.blocker(27.9,35.34,1.43,.09,.6,3.0);
  scallop('Rear west doorway scallops',27.9,35.35,2.5,3.36,.20,paleBlue,.47);
  const cornerStart=markAssembly(),cornerRoofStart=rearRoof.children.length;
  frontDoor('Rear corner blue barred door',49.6,37.77,.6,1.25,2.35);
  scallop('Rear corner doorway scallops',49.6,35.35,2.9,3.36,.20,paleBlue,.47);
  for(const x of [48.05,51.15])K.box(rearRoof,'Rear corner upper pavilion pier',x,4.86,35.30,.22,1.70,.26,white);
  K.box(rearRoof,'Rear corner upper pavilion roof',49.6,5.75,36.42,3.8,.22,3.1,agedWhite);
  K.box(rearRoof,'Rear corner upper pavilion red edge',49.6,5.76,34.88,3.8,.16,.16,red);
  const rearArch=scallop('Rear corner upper scalloped opening',49.6,35.3,2.9,5.59,.22,white,.53);g.remove(rearArch);rearRoof.add(rearArch);
  K.box(rearRoof,'Rear corner white balcony base',49.6,4.04,35.30,3.1,.19,.22,whiteTrim);
  const rr=[];for(let i=0;i<16;i++)rr.push([48.16+i*.192,4.37,35.30,.055,.55,.055]);
  instances('Rear corner upper white balusters',new THREE.CylinderGeometry(.65,1,1,6),whiteTrim,rr);
  // 15.03.33 (user): this two-storey bay sits centred at the end of the east passage (x 51.6).
  moveAssembly(cornerStart,2,0);
  for(const o of rearRoof.children.slice(cornerRoofStart))o.position.x+=2;
  moveAssembly(rearStart,0,7.5);
  const rearObjects=new Set(g.children.slice(rearStart.children));
  const rearNav=new Set([...K.colliders.slice(rearStart.colliders),...K.surfaces.slice(rearStart.surfaces),...K.ramps.slice(rearStart.ramps)]);

  // Inner building seen from the entrance's upper gallery: a broad flat-fronted
  // veranda, floral parapet, corrugated shelter and a small tower behind it.
  const innerWhite=K.M.plaster.clone();innerWhite.color.set('#f0f0ff');
  const vividBlue=mat('#087ead'),maroon=mat('#633a38'),pink=mat('#b57d80');
  const dado=K.M.paleStone.clone();dado.color.set('#c6cbd0');
  const greenBand=mat('#435b55'),sheet=mat('#929ea2',.91,{side:THREE.DoubleSide});
  const greySheet=mat('#666d68',.96,{side:THREE.DoubleSide});
  const weathered=K.M.stone.clone();weathered.color.set('#83857f');
  const metalPole=mat('#b7af91',.5,{metalness:.45});
  // Ribbons form actual openings in the floral lattice, not an opaque picture.
  function openworkGeometry(){
    const positions=[];
    function ribbon(points,width){for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;
      const nx=-dy/l*width/2,ny=dx/l*width/2;
      for(const v of [[a[0]+nx,a[1]+ny],[a[0]-nx,a[1]-ny],[b[0]+nx,b[1]+ny],[b[0]+nx,b[1]+ny],[a[0]-nx,a[1]-ny],[b[0]-nx,b[1]-ny]])positions.push(...v,0);
    }}
    function loop(cx,cy,rx,ry,angle=0){const p=[];for(let i=0;i<=32;i++){const a=i*Math.PI/16,x=Math.cos(a)*rx,y=Math.sin(a)*ry;p.push([cx+x*Math.cos(angle)-y*Math.sin(angle),cy+x*Math.sin(angle)+y*Math.cos(angle)]);}ribbon(p,.027);}
    ribbon([[-.93,-.43],[.93,-.43],[.93,.43],[-.93,.43],[-.93,-.43]],.045);
    for(const sx of [-1,1]){
      const p=[];for(let i=0;i<=48;i++){const t=i/48;p.push([sx*(.1+.69*t+.06*Math.sin(t*12)), -.38+.75*t]);}ribbon(p,.035);
      for(let j=0;j<4;j++){const x=sx*(.16+j*.19),y=-.3+j*.19;loop(x,y,.10,.18,-sx*.72);loop(x+sx*.13,y-.04,.10,.11,sx*.45);}
      for(const y of [-.24,.24])loop(sx*.68,y,.15,.13);
    }
    for(let i=0;i<6;i++){const a=i*Math.PI/3;loop(Math.cos(a)*.15,Math.sin(a)*.15,.1,.16,a-Math.PI/2);}
    loop(0,0,.055,.055);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();return geo;
  }
  const lace=whiteTrim.clone();lace.side=THREE.DoubleSide;
  const floral=openworkGeometry();
  function corrugatedRoof(n,x,z,w,d,eave,rise,material){
    // Ridge along Z. Corrugation is physical, including the visible gable end.
    const pos=[],step=.14,count=Math.ceil(w/step),front=z-d/2,back=z+d/2;
    const height=xx=>eave+rise*(1-Math.abs(xx-x)/(w/2));
    for(let i=0;i<count;i++){
      const a=x-w/2+w*i/count,b=x-w/2+w*(i+1)/count;
      const ya=height(a)+(i%2?.035:0),yb=height(b)+(i%2?0:.035);
      pos.push(a,ya,front,a,ya,back,b,yb,front,b,yb,front,a,ya,back,b,yb,back);
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.computeVertexNormals();
    const roof=mesh(n,geo,material);K.roofs.push(roof);
    return {height,front};
  }
  function corrugatedGable(n,x,z,w,eave,rise){
    const pos=[],ribs=[];
    for(let i=0;i<120;i++){
      const a=x-w/2+i*w/120,b=a+w/120,ya=eave+rise*(1-Math.abs(a-x)/(w/2)),yb=eave+rise*(1-Math.abs(b-x)/(w/2));
      pos.push(a,eave,z,a,ya,z,b,yb,z,a,eave,z,b,yb,z,b,eave,z);
      ribs.push([(a+b)/2,(eave+(ya+yb)/2)/2,z-.025,.025,Math.max(.02,(ya+yb)/2-eave),.035]);
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.computeVertexNormals();
    mesh(n,geo,sheet);instances(n+' vertical seams',new THREE.BoxGeometry(1,1,1),greySheet,ribs);
  }
  floor('Inner front building foundation',39,17.72,18.65,5.05,.55,oldStone);
  floor('Inner front marble veranda',39,15.86,18.8,1.45,.57,dado);
  box('Inner front weathered plinth',39,.27,15.15,18.8,.44,.18,weathered);
  box('Inner plinth red trim',39,.5,15.12,18.9,.065,.12,red);
  // The photographed stone interior is open behind this facade.
  const frontHoles=[[32.65,34.65],[35.28,37.28],[38.12,39.88],[40.72,42.72],[43.35,45.35]];
  let frontEdge=29.8;
  for(const [left,right] of [...frontHoles,[48.2,48.2]]){
    if(left>frontEdge)box('Inner front facade pier',(frontEdge+left)/2,2.09,16.57,left-frontEdge,3.08,.20,innerWhite,true);
    if(right>left&&left!==38.12){
      box('Inner front window sill wall',(left+right)/2,.88,16.57,right-left,.66,.20,innerWhite,true);
      box('Inner front window lintel wall',(left+right)/2,3.13,16.57,right-left,1.0,.20,innerWhite,true);
      K.blocker((left+right)/2,16.57,right-left,.2,.55,3.63);
    }
    frontEdge=right;
  }
  box('Inner doorway overhead wall',39,3.21,16.57,1.76,.84,.20,innerWhite,true);
  // 15.11.08: the west end is open to the corridor; only the east end has a side wall.
  box('Inner front side wall',48.1,2.09,18.35,.20,3.08,3.65,innerWhite,true);
  for(const x of [33.96,44.04])box('Inner facade gray marble dado',x,.86,16.47,8.32,.58,.10,dado);
  for(const x of [33.96,44.04])box('Inner facade green dado cap',x,1.19,16.40,8.32,.10,.10,greenBand);
  // Openings are layered on the enclosed facade; the unseen sanctuary stays dark.
  function innerWindow(x){
    // Grilles are open to daylight on both sides of the wall.
    for(const dx of [-1,0,1])box('Inner blue window upright',x+dx,1.91,16.27,.105,1.44,.16,vividBlue);
    for(const y of [1.22,1.91,2.6])box('Inner blue window crossrail',x,y,16.25,2.1,.10,.17,vividBlue);
    const bars=[];for(let i=0;i<18;i++)bars.push([x-.92+i*1.84/17,1.91,16.28,.021,1.28,.03]);
    instances('Inner window white bars',new THREE.BoxGeometry(1,1,1),whiteTrim,bars);
  }
  for(const x of [33.65,36.28,41.72,44.35])innerWindow(x);
  for(const x of [31.05,46.95]){
    frontDoor('Inner service door',x,16.35,.57,1.18,2.12);
    box('Inner service door face',x,1.63,16.25,1.16,2.10,.025,x<39?blue:vividBlue);
    if(x>39)for(const dx of [-.29,.29])for(const y of [1.11,2.17])box('Service door white inset',x+dx,y,16.225,.18,.73,.022,whiteTrim);
    steps('Inner service door steps',x,14.84,1.35,.85,.1,.57,'z',2);
  }
  // Central doorway remains open into the stone hall.
  for(const x of [38.1,39.9])box('Inner decorated blue door jamb',x,1.75,16.19,.21,2.4,.14,vividBlue);
  box('Inner central doorway lintel',39,2.79,16.20,2,.18,.17,vividBlue);
  steps('Inner central threshold stairs',39,14.75,1.8,1.0,.1,.57,'z',2);
  // Original photo regions are used intact as surface details. No invented text/iconography.
  const sourceTexture=new THREE.TextureLoader().load('./assets/temple-upper-center.jpg');sourceTexture.colorSpace=THREE.SRGBColorSpace;
  function referencePanel(n,x,y,z,w,h,region){
    const geometry=new THREE.PlaneGeometry(w,h),uv=geometry.attributes.uv;
    const [l,t,r,b]=region;for(let i=0;i<uv.count;i++)uv.setXY(i,l+(1-uv.getX(i))*(r-l),1-b+uv.getY(i)*(b-t));
    const m=new THREE.MeshBasicMaterial({map:sourceTexture,side:THREE.DoubleSide});
    return mesh(n,geometry,m,x,y,z);
  }
  box('Inner doorway painting backing',39,3.23,15.26,2.3,.88,.10,white);
  referencePanel('Photographed inner doorway painting',39,3.23,15.19,2.28,.86,[.414,.458,.518,.568]);
  referencePanel('Photographed dark temple notice board',43.2,1.76,15.05,.9,2.12,[.11,.589,.183,.79]);
  referencePanel('Photographed pale temple notice board',34.55,2.69,15.07,1.0,1.12,[.799,.486,.9,.608]);
  const garland=[];for(let i=0;i<38;i++){const t=i/37;garland.push([38.12+t*1.76,2.74-.13*Math.abs(Math.sin(t*Math.PI*3)),16.08,.03,.033,.035]);}
  instances('Doorway flower garland',new THREE.SphereGeometry(1,6,4),mat('#d6b76b'),garland);
  const columns=[29.88,32.1,34.85,37.55,40.45,43.15,45.9,48.12];
  for(const x of columns){
    blueColumn('Inner veranda cyan column',x,15.25,.57,3.05);
    for(const side of [-1,1]){
      const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x+side*.12,2.95,15.23),new THREE.Vector3(x+side*.18,3.19,15.23),new THREE.Vector3(x+side*.53,3.28,15.23),new THREE.Vector3(x+side*.45,3.08,15.23),new THREE.Vector3(x+side*.32,3.18,15.23)]);
      mesh('Inner bright blue curled bracket',new THREE.TubeGeometry(curve,14,.043,5,false),vividBlue);
      K.beam(g,'Inner bracket diagonal',[x+side*.12,3.02,15.24],[x+side*.57,3.42,15.24],.08,vividBlue);
    }
  }
  const transom=[];
  for(let i=0;i<columns.length-1;i++){
    if(i===3)continue; // The doorway painting occupies the central bay.
    const a=columns[i]+.16,b=columns[i+1]-.16;
    for(const y of [3.18,3.63])box('Maroon pierced transom frame',(a+b)/2,y,15.25,b-a,.07,.08,maroon);
    for(let x=a;x<=b;x+=.135){transom.push([x,3.40,15.25,.037,.4,.047]);}
  }
  instances('Maroon pierced transom uprights',new THREE.BoxGeometry(1,1,1),maroon,transom);
  for(const x of [33.78,44.22])box('Inner cyan transom sill',x,3.14,15.25,8.1,.12,.25,paleBlue);
  box('Inner veranda flat cornice',39,3.76,15.88,19.15,.22,1.85,weathered);
  box('Inner veranda red fascia',39,3.70,14.94,19.2,.14,.12,red);
  const parapetPosts=[];
  for(let i=0;i<=9;i++)parapetPosts.push([29.55+i*2.1,4.31,15.36,.22,.95,.22]);
  instances('Inner parapet red posts',new THREE.BoxGeometry(1,1,1),red,parapetPosts);
  box('Inner parapet red coping',39,4.81,15.36,19.3,.12,.29,red);
  const panels=[];for(let i=0;i<9;i++)panels.push([30.60+i*2.1,4.32,15.36,1,1,1]);
  instances('Inner parapet white floral openwork',floral,lace,panels);
  corrugatedRoof('Inner corrugated shelter roof',39,18.85,16.8,3.4,4.16,1.5,sheet);
  corrugatedGable('Inner blue-gray corrugated gable',39,17.15,16.8,4.16,1.5);
  // Beyond the blue facade: older, narrower construction with red walls,
  // arched pale panels, black stone sill and deep, layered protective eaves.
  const wornRed=red.clone();wornRed.map=canvasMap(512,(c,s)=>{
    // 15.03.33 / 15.04.55: a dark, weathered maroon rather than fresh red.
    c.fillStyle='#7c4239';c.fillRect(0,0,s,s);
    for(let i=0;i<2100;i++){c.fillStyle=i%4===0?'#cfad8e35':'#27352827';c.fillRect(rand()*s,rand()*s,1+rand()*7,2+rand()*16);}
  });wornRed.color.set('#ffffff');
  // 15.03.38 / 15.04.55: its red east wall is flush with the white front block (x 48.1), so the
  // shrine is wider on the east than the sanctum's axis; SX/SH are its centre and half-width.
  const SX=39.96,SH=8.14,SE=SH-7.18;
  floor('Old inner shrine black stone platform',SX,24.73,15.7+2*SE,10.6,.54,weathered);
  for(const x of [SX-SH,SX+SH])box('Old inner shrine red side wall',x,1.83,24.73,.24,2.57,9.95,wornRed,true);
  box('Old inner shrine red rear wall',SX,1.83,29.58,14.6+2*SE,2.57,.24,wornRed,true);
  const stainedRecess=mat('#5a4a42',.95);
  for(const side of [-1,1]){
    const x=SX+side*(7.34+SE);
    box('Old inner shrine dark continuous sill',x,.63,24.8,.25,.20,10.1,oldStone);
    for(let i=0;i<7;i++){
      const z=20.45+i*1.39,shape=new THREE.Shape();
      shape.moveTo(-.53,.87);shape.lineTo(.53,.87);shape.lineTo(.53,2.18);shape.absarc(0,2.18,.53,0,Math.PI,false);shape.closePath();
      // East side (15.03.33, 15.04.55): the arched recesses read dark and stained, not whitewashed.
      const painted=mesh(side>0?'Old inner shrine dark stained arched recess':'Old inner shrine pale arched wall panel',new THREE.ShapeGeometry(shape,16),side>0?stainedRecess:agedWhite,x+side*.012,0,z);painted.rotation.y=side*Math.PI/2;
      box('Old inner shrine red dividing pier',x+side*.08,1.88,z+.63,.18,2.45,.13,wornRed);
      K.beam(g,'Old inner shrine projecting eave corbel',[x,2.84,z+.62],[x+side*.65,3.12,z+.62],.17,weathered,.23);
    }
    for(const z of [22,25.8,28.6]){
      for(const zz of [z-.52,z+.52])K.beam(g,'Old inner shrine metal lamp rack leg',[x+side*.30,.55,zz],[x+side*.30,1.52,zz],.028,K.M.metal);
      for(const y of [.65,1.50])K.beam(g,'Old inner shrine lamp rack rail',[x+side*.30,y,z-.54],[x+side*.30,y,z+.54],.029,K.M.metal);
      for(let i=0;i<7;i++)cyl('Small unlit rack oil dish',x+side*.30,1.53,z-.46+i*.15,.045,.023,.035,oldStone,8);
    }
  }
  // 15.08.04 / old-wall photo: long pale grey stone slabs laid in overlapping
  // courses down each slope, streaked black with mould below every joint.
  const slabRoof=mat('#ffffff',.95);
  slabRoof.map=canvasMap(512,(c,s)=>{let n=90331;const r=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
    c.fillStyle='#96968e';c.fillRect(0,0,s,s);
    for(let col=0;col<8;col++){const x=col*64;
      for(let y=0;y<s;){const h=40+r()*90,v=r()*26-13|0;c.fillStyle=`rgb(${150+v},${150+v},${142+v})`;c.fillRect(x+2,y+1,60,h-2);
        const g=c.createLinearGradient(x,0,x+22,0);g.addColorStop(0,'rgba(38,40,36,.55)');g.addColorStop(1,'rgba(38,40,36,0)');c.fillStyle=g;c.fillRect(x+2,y+1,22,h-2);
        for(let k=0;k<6;k++){c.fillStyle=`rgba(${r()<.6?'40,44,38':'92,104,70'},${.08+r()*.18})`;c.fillRect(x+4+r()*50,y+r()*h,2+r()*6,6+r()*30);}
        y+=h;}
      c.fillStyle='rgba(30,32,28,.8)';c.fillRect(x,0,2,s);}
  },1,1);
  const oldRoof=K.hipRoof(g,'Old inner shrine deep sloping roof',SX,24.85,16.65+2*SE,11.6,3.13,2.92,slabRoof);
  // 15.08.04 and 15.08.42 show daylight through corrugated translucent
  // strips above the lowered aisles. Cut the opaque roof itself so an extra
  // bright plane cannot leave an invisible solid roof blocking the skylight.
  const lightWells=[[34.4,36.1],[41.9,43.6]],wellFront=21,wellBack=28.2;
  const roofHeight=(x,z)=>3.13+2.92*Math.max(0,Math.min(1,(8.325+SE-Math.abs(x-SX))/5.22,(5.8-Math.abs(z-24.85))/5.8));
  const opaque=[],clear=[],roofUV=[];
  const xs=[SX-8.325-SE,34.4,36.1,41.9,43.6,SX+8.325+SE],zs=[19.05,21,28.2,30.65];
  for(let xi=0;xi<xs.length-1;xi++)for(let zi=0;zi<zs.length-1;zi++){
    const left=xs[xi],right=xs[xi+1],front=zs[zi],back=zs[zi+1];
    const translucent=zi===1&&(xi===1||xi===3);
    const nx=Math.ceil((right-left)/.14),nz=Math.ceil((back-front)/.35);
    for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
      const point=(u,v)=>{const x=left+(right-left)*u,z=front+(back-front)*v;return [x,roofHeight(x,z)+(translucent?.018+.018*Math.cos(u*nx*Math.PI):0),z];};
      const a=point(i/nx,j/nz),b=point((i+1)/nx,j/nz),c=point(i/nx,(j+1)/nz),d=point((i+1)/nx,(j+1)/nz);
      const target=translucent?clear:opaque;
      for(const v of [a,c,b,b,c,d]){target.push(...v);if(!translucent)roofUV.push((v[0]-39)*.36,(v[2]-24.85)*.36);}
    }
  }
  const oldTiles=oldRoof.getObjectByName('Old inner shrine deep sloping roof tiles');
  const cutGeometry=new THREE.BufferGeometry();cutGeometry.setAttribute('position',new THREE.Float32BufferAttribute(opaque,3));cutGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(roofUV,2));cutGeometry.computeVertexNormals();
  oldTiles.geometry.dispose();oldTiles.geometry=cutGeometry;oldTiles.position.set(0,0,0);
  const clearGeometry=new THREE.BufferGeometry();clearGeometry.setAttribute('position',new THREE.Float32BufferAttribute(clear,3));clearGeometry.computeVertexNormals();
  const translucentRoof=mesh('Inner aisle translucent corrugated skylights',clearGeometry,mat('#e3e4d8',.65,{side:THREE.DoubleSide,transparent:true,opacity:.97,emissive:'#c2c9c2',emissiveIntensity:.35}));
  translucentRoof.userData.noShadow=true;K.roofs.push(translucentRoof);
  for(const [left,right] of lightWells){
    for(const x of [left,right])K.beam(oldRoof,'Inner skylight longitudinal frame',[x,roofHeight(x,wellFront)-.04,wellFront],[x,roofHeight(x,24.85)-.04,24.85],.045,dark);
    for(const x of [left,right])K.beam(oldRoof,'Inner skylight rear longitudinal frame',[x,roofHeight(x,24.85)-.04,24.85],[x,roofHeight(x,wellBack)-.04,wellBack],.045,dark);
    for(const z of [21,23.4,25.8,28.2])K.beam(oldRoof,'Inner skylight transverse frame',[left,roofHeight(left,z)-.045,z],[right,roofHeight(right,z)-.045,z],.045,dark);
    // Local diffuse fill approximates light scattered by the translucent sheets.
    const fill=new THREE.PointLight('#e2e5de',7,9,2);fill.name='Inner skylight diffuse daylight';fill.position.set((left+right)/2,4.35,24.5);g.add(fill);
    K.beam(oldRoof,'Inner aisle pale drain pipe',[left,3.55,21],[left,3.55,28.2],.085,whiteTrim);
  }
  for(const side of [-1,1])for(let j=0;j<5;j++){
    const t=j/6,xx=SX+side*(8.28+SE-t*4.65),yy=3.18+t*2.57;
    const course=K.box(oldRoof,'Old inner shrine overlapping gray roof course',xx,yy,24.85,.89,.12,10.9-j*.32,weathered);course.rotation.z=-side*.51;
  }
  for(const side of [-1,1])for(let z=19.6;z<30.3;z+=.48)K.beam(oldRoof,'Old inner shrine dark exposed rafters',[SX+side*(7.2+SE),3.1,z],[SX+side*(8.43+SE),2.96,z],.08,K.M.wood,.12);
  // Compact weathered tower rises behind the sheet shelter, rather than replacing it.
  // 15.26.55 / 15.27.07: the dark spire rises to about 11.5 m, above the road wing's parapet.
  for(let i=0;i<5;i++){
    const w=3.45-i*.49,y=4.82+i*1.0;
    box('Inner tower dark tier',39,y,23.1,w,1.0,w,weathered);
    box('Inner tower projecting course',39,y-.49,23.1,w+.19,.12,w+.19,oldStone);
    for(const sx of [-1,1])for(const dx of [-.29,.29]){
      const figure=mesh('Inner tower weathered relief',new THREE.SphereGeometry(1,7,5),weathered,39+dx*w,y,23.1+sx*(w/2+.025));figure.scale.set(.12,.23,.08);
      box('Tower faded white streak',39+dx*w,y-.15,23.1+sx*(w/2+.065),.038,.23,.018,whiteTrim);
    }
  }
  mesh('Inner tower dark rounded cap',new THREE.SphereGeometry(.62,14,9,0,Math.PI*2,0,Math.PI/2),weathered,39,9.05,23.1);
  cyl('Inner tower finial stem',39,9.85,23.1,.09,.15,.45,brass);
  const finial=mesh('Inner tower gold bulb',new THREE.SphereGeometry(1,12,9),brass,39,10.13,23.1);finial.scale.set(.19,.25,.19);
  cyl('Inner tower finial tip',39,10.43,23.1,.012,.1,.31,brass);
  // Photo-right is world -X when looking into the courtyard (+Z).
  // Upper hall stands behind the veranda roof, leaving its broad lean-to exposed.
  // 15.13.11: the tall hall is three windows long (z 6.4-19.4); beyond it stands a lower
  // flat-roofed block with a red-post balustrade.
  // Keep this entrance-side hall aligned with the existing porch and street wall.
  // Passage widening belongs to the outer range beyond the hall, not this corner.
  const hallEnd=19.4,hallLen=hallEnd-6.4;
  box('Right hall tall white upper storey',22.27,5.59,6.4+hallLen/2,4.1,3.37,hallLen,innerWhite,true);
  box('Right hall lower block flat roof',22.3,3.62,21.25,4.1,.24,3.7,innerWhite);
  box('Right hall lower block roof red edge',24.33,3.6,21.25,.08,.2,3.7,red);
  box('Right hall lower block balustrade red coping',24.22,4.52,21.25,.2,.1,3.7,red);
  for(const z of [19.5,21.25,23.0])box('Right hall lower block balustrade red post',24.22,4.1,z,.2,.8,.2,red);
  instances('Right hall lower block pierced balustrade',screenGeometry,entranceLace,[[24.22,4.1,20.37,.88,.72,1,0,Math.PI/2,0],[24.22,4.1,22.12,.88,.72,1,0,Math.PI/2,0]]);
  for(const z of [8.1,12.3,16.5]){
    box('Right hall pink window border',24.36,5.59,z,.09,1.23,1.86,pink);
    box('Right hall dark window inset',24.42,5.59,z,.025,1.03,1.66,maroon);
    const bars=[];for(let j=0;j<13;j++)bars.push([24.45,5.59,z-.76+j*.126,.04,1.07,.043]);
    instances('Right hall pink window grille',new THREE.BoxGeometry(1,1,1),pink,bars);
    box('Right hall pink grille middle rail',24.46,5.59,z,.06,.07,1.70,pink);
    box('Right hall dark attic vent',24.39,7.04,z,.045,.57,2.4,dark);
    for(let j=0;j<12;j++)for(const sign of [-1,1])K.beam(g,'Right hall attic diamond lattice',[24.44,6.79,z-1.13+j*.19],[24.44,7.28,z-1.13+j*.19+sign*.25],.028,oldStone);
  }
  corrugatedRoof('Right hall pitched gray upper roof',22.25,6.4+hallLen/2,5.4,hallLen+.8,7.45,1.25,greySheet);
  // Close the attic between the masonry and pitched roof. The roof overhang
  // remains outside this shell; the existing lattice vents stay below it.
  const hallAtticSection=new THREE.Shape();
  const hallRoofY=x=>7.45+1.25*(1-Math.abs(x-22.25)/2.7);
  hallAtticSection.moveTo(20.22,7.27);
  hallAtticSection.lineTo(24.32,7.27);
  hallAtticSection.lineTo(24.32,hallRoofY(24.32)+.01);
  hallAtticSection.lineTo(22.25,8.71);
  hallAtticSection.lineTo(20.22,hallRoofY(20.22)+.01);
  hallAtticSection.closePath();
  const hallAtticGeometry=new THREE.ExtrudeGeometry(hallAtticSection,{depth:hallLen,bevelEnabled:false,steps:1});
  // Keep only the enclosing walls and underside. A second sloping top skin
  // would intersect the corrugations and produce bright flickering stripes.
  const atticPositions=hallAtticGeometry.attributes.position,atticNormals=hallAtticGeometry.attributes.normal,atticFaces=[];
  for(let i=0;i<atticPositions.count;i+=3)if(atticNormals.getY(i)<=0)for(let j=0;j<3;j++)atticFaces.push(i+j);
  hallAtticGeometry.setIndex(atticFaces);
  mesh('Right hall continuous attic closure',hallAtticGeometry,innerWhite,0,0,6.4);

  // Low lean-to over the shaded passage beneath the tall hall.
  const leanPos=[];for(let i=0;i<90;i++){
    const z=6.2+i*10.0/90,zz=z+10.0/90,a=i%2?.035:0,b=i%2?0:.035;
    leanPos.push(24.1,4.14+a,z,29.1,3.50+a,z,24.1,4.14+b,zz,24.1,4.14+b,zz,29.1,3.50+a,z,29.1,3.50+b,zz);
  }
  const leanGeo=new THREE.BufferGeometry();leanGeo.setAttribute('position',new THREE.Float32BufferAttribute(leanPos,3));leanGeo.computeVertexNormals();
  const leanRoof=mesh('Right hall low corrugated veranda awning',leanGeo,greySheet);K.roofs.push(leanRoof);
  K.beam(g,'Right hall white gutter',[29.12,3.48,6.2],[29.12,3.48,16.2],.105,whiteTrim);
  // 15.10.49 / 15.11.00: the right-hand covered hall continues behind
  // the round veranda columns. Its interior is open, with square blue piers.
  const hallBlue=mat('#98bbc5'),hallFloor=oxideFloor.clone();hallFloor.roughness=.46;
  // 180635/180653 and 15.10.49: only the enclosed chair hall is raised.
  // The broad grey passage outside its square piers stays at courtyard level.
  floor('Covered hall continuous oxide floor',22.25,11.3,3.90,9.8,.60,hallFloor);
  floor('Covered hall lower grey walking floor',26.30,11.3,4.20,9.8,.112,stoneFloor);
  for(const [a,b] of [[6.4,9.2],[10.4,16.2]]){
    box('Covered hall inner raised plinth',24.2,.30,(a+b)/2,.14,.40,b-a,outlinedPlinth);
    box('Covered hall inner platform coping',24.2,.57,(a+b)/2,.22,.08,b-a,whiteTrim);
  }
  steps('Covered hall inner platform access',24.86,9.8,1.40,1.20,.1,.6,'-x',3);
  // 15.11.08 is taken from the raised passage just inside this end, so the
  // wall closes only the hall itself; the passage continues into the circuit.
  // User's 'temple right side facing opposite to the entrance' note: the end wall and
  // stage stand further back, about 8 m from that camera. The hall runs on under the
  // right hall's upper storey to z 19.9; the old end-wall line keeps only its beam.
  const stageEnd=19.9;
  box('Covered hall rear end wall',21.45,2.03,stageEnd-.1,2.4,2.86,.20,hallBlue,true);
  box('Covered hall rear red dado',21.45,.88,stageEnd-.215,2.4,.56,.025,red);
  floor('Covered hall stage bay oxide floor',21.45,(16.2+stageEnd)/2,2.3,stageEnd-16.2,.60,hallFloor);
  box('Covered hall stage bay white ceiling',21.45,3.60,(16.2+stageEnd)/2,2.4,.16,stageEnd-16.2,white);
  // 180635: two high-silled windows, with a solid wall and beam pilaster
  // between them. The old third window occupied the electrical-board wall.
  const hallWindowCenters=[9.0,12.6],windowPaint=mat('#426577');
  for(const [a,b] of [[6.4,8.35],[9.65,11.95],[13.25,stageEnd]])
    box('Covered hall lane-side wall pier',20.30,2.03,(a+b)/2,.20,2.86,b-a,hallBlue,true);
  for(const z of hallWindowCenters){
    box('Covered hall window sill wall',20.30,1.22,z,.20,1.24,1.30,hallBlue,true);
    box('Covered hall window lintel wall',20.30,3.36,z,.20,.20,1.30,hallBlue,true);
    for(const dz of [-.65,.65])box('Covered hall blue window jamb',20.42,2.55,z+dz,.10,1.48,.09,windowPaint);
    for(const y of [1.84,2.38,2.94,3.27])box('Covered hall blue window crossbar',20.42,y,z,.10,.075,1.38,windowPaint);
    box('Covered hall blue window middle upright',20.42,2.39,z,.10,1.10,.065,windowPaint);
    const glazing=mesh('Covered hall pale translucent window glazing',new THREE.PlaneGeometry(1.22,1.36),new THREE.MeshStandardMaterial({color:0xdce5dd,roughness:.95,side:THREE.DoubleSide}),20.405,2.55,z);glazing.rotation.y=Math.PI/2;
    K.blocker(20.30,z,.20,1.30,1.84,3.27);
  }
  box('Covered hall central wall pilaster',20.44,2.03,11.0,.30,2.86,.28,hallBlue,true);
  box('Covered hall central pilaster red foot',20.60,.88,11.0,.025,.56,.30,red);
  // Continuous wall heads meet the ceiling underside; the original wall
  // pieces stopped six centimetres short and leaked a strip of outdoor light.
  box('Covered hall lane wall ceiling closure',20.30,3.51,(6.4+stageEnd)/2,.22,.14,stageEnd-6.4,hallBlue);
  box('Covered hall rear wall ceiling closure',24.25,3.51,16.10,8.0,.14,.22,hallBlue);
  const hallCeiling=box('Covered hall flat white ceiling',24.2,3.60,11.3,7.8,.16,9.8,white);K.roofs.push(hallCeiling);
  for(const z of [9.0,12.7]){
    box('Covered hall square blue pier',24.15,2.08,z,.38,2.96,.38,hallBlue,true);
    box('Covered hall square pier red foot',24.15,.87,z,.40,.54,.40,red);

  }
  const hallBeam=box('Covered hall transverse white ceiling beam',24.2,3.35,11.0,7.8,.35,.30,white);K.roofs.push(hallBeam);
  // Stationary three-bladed ceiling fans and slim fluorescent wall fittings.
  const fanMaterial=mat('#514b3e',.79);
  for(const [x,z] of [[22.1,8.0],[26.2,9.2],[22.1,11.0],[26.2,11.0],[22.1,14.3],[26.2,14.3]]){
    cyl('Covered hall fan downrod',x,3.15,z,.018,.018,.60,fanMaterial,8);
    const motor=mesh('Covered hall fan motor',new THREE.SphereGeometry(1,12,8),fanMaterial,x,2.84,z);motor.scale.set(.14,.08,.14);
    for(let j=0;j<3;j++){
      const a=j*Math.PI*2/3+.25;
      const blade=box('Covered hall fan blade',x+Math.cos(a)*.34,2.86,z+Math.sin(a)*.34,.56,.025,.105,fanMaterial);blade.rotation.y=-a;
    }
  }
  for(const z of [9.0,12.6]){
    box('Covered hall tube light fixture',20.48,3.02,z,.08,.055,1.3,whiteTrim);
    K.beam(g,'Covered hall exposed light wiring',[20.47,3.13,z],[20.47,3.13,z+1.3],.012,dark);
  }
  // IMG_20130720_180635 / 180647: chairs face into the hall, with
  // several unequal tall stacks stored at the ceremonial end of the wall.
  const chairBlue=mat('#596f91',.65);
  const chairBack=new THREE.Shape();chairBack.moveTo(-.23,.51);chairBack.lineTo(-.25,.85);
  chairBack.bezierCurveTo(-.26,1.13,.26,1.13,.25,.85);chairBack.lineTo(.23,.51);chairBack.closePath();
  for(let j=0;j<5;j++)for(const sign of [-1,1]){
    const hole=new THREE.Path(),y=.66+j*.068;
    hole.moveTo(sign*.027,y);hole.lineTo(sign*.185,y+.055);hole.lineTo(sign*.185,y+.074);hole.lineTo(sign*.027,y+.019);hole.closePath();chairBack.holes.push(hole);
  }
  const backGeometry=new THREE.ExtrudeGeometry(chairBack,{depth:.036,bevelEnabled:false});
  for(const [z,count] of [[14.25,12],[13.53,16],[12.35,19],[11.50,1],[10.78,1],[10.06,1],[9.34,1]]){
    const chairs=new THREE.Group();chairs.name='Covered hall plastic armchair arrangement';chairs.position.set(21.02,.60,z);chairs.rotation.y=Math.PI/2;g.add(chairs);
    for(let k=0;k<count;k++){
      const y=k*.068;
      K.box(chairs,'Covered hall molded chair seat',0,y+.43,0,.54,.045,.53,chairBlue);
      for(const dx of [-.235,.235]){
        for(const dz of [-.22,.22])K.beam(chairs,'Covered hall slightly splayed chair leg',[dx*1.08,y+.015,dz*1.08],[dx,y+.42,dz],.035,chairBlue);
        K.box(chairs,'Covered hall molded chair arm',dx,y+.65,0,.05,.055,.50,chairBlue);
        K.box(chairs,'Covered hall chair front arm support',dx,y+.54,.21,.04,.20,.035,chairBlue);
      }
      const back=new THREE.Mesh(backGeometry,chairBlue);back.name='Covered hall curved chair back with chevron slots';back.position.set(0,y,-.26);back.castShadow=true;back.receiveShadow=true;chairs.add(back);
    }
    K.blocker(21.02,z,.64,.64,.60,1.66+(count-1)*.068);
  }
  const clockWood=mat('#65422d'),clockIvory=mat('#d6d0b7');
  box('Covered hall pendulum clock case',20.47,2.87,10.64,.13,.57,.31,clockWood);
  const face=new THREE.Mesh(new THREE.CircleGeometry(.126,40),clockIvory);face.name='Covered hall clock face';face.rotation.y=Math.PI/2;face.position.set(20.542,2.98,10.64);g.add(face);
  for(let i=0;i<12;i++){
    const angle=i*Math.PI/6;
    K.beam(g,'Covered hall clock hour tick',[20.548,2.98+Math.cos(angle)*.098,10.64+Math.sin(angle)*.098],[20.548,2.98+Math.cos(angle)*.112,10.64+Math.sin(angle)*.112],.006,dark);
  }
  K.beam(g,'Covered hall clock short hand',[20.553,2.98,10.64],[20.553,3.015,10.70],.010,dark);
  K.beam(g,'Covered hall clock long hand',[20.554,2.98,10.64],[20.554,3.075,10.62],.007,dark);
  const bob=mesh('Covered hall clock pendulum',new THREE.SphereGeometry(.054,12,8),brass,20.542,2.70,10.64);bob.scale.x=.22;
  box('Covered hall wooden electrical board',20.46,3.04,11.46,.10,.30,.40,clockWood);
  box('Covered hall pale electrical switchboard',20.47,3.04,11.05,.10,.28,.28,whiteTrim);
  for(const z of [10.96,11.04,11.12])for(const y of [2.96,3.04])box('Covered hall switch rocker',20.529,y,z,.014,.042,.039,dark);
  for(const z of [11.34,11.47,11.60])box('Covered hall old ceramic fuse',20.525,3.03,z,.027,.14,.06,clockIvory);
  K.beam(g,'Covered hall horizontal electrical conduit',[20.43,3.27,7.0],[20.43,3.27,15.6],.012,dark);
  for(const z of [10.64,11.05,11.46])K.beam(g,'Covered hall conduit branch',[20.43,3.27,z],[20.43,3.14,z],.012,dark);
  box('Covered hall small square wall clock frame',20.47,3.18,14.80,.08,.27,.25,clockWood);
  box('Covered hall small clock pale face',20.516,3.18,14.80,.014,.22,.20,clockIvory);
  K.beam(g,'Covered hall small clock hand',[20.526,3.18,14.8],[20.526,3.25,14.78],.009,dark);
  // Dark pleated curtain and hanging tiered parasol mark the ceremonial bay, against the
  // hall's far (+z) end wall, not the entrance end (15.11.00, IMG_20130720_180653 and the
  // family's 'temple right side' photos).
  const curtainMaterial=mat('#302731',1,{side:THREE.DoubleSide});
  const curtainGeometry=new THREE.PlaneGeometry(3.10,2.50,60,1),cp=curtainGeometry.attributes.position;
  for(let i=0;i<cp.count;i++)cp.setZ(i,.07*Math.sin(cp.getX(i)*25));curtainGeometry.computeVertexNormals();
  const curtain=mesh('Covered hall pleated ceremonial curtain',curtainGeometry,curtainMaterial,21.45,1.9,stageEnd-.17);curtain.scale.x=.68;
  for(const x of [20.55,22.35]){
    box('Covered hall ceremonial bay decorated upright',x,1.95,stageEnd-.35,.18,2.70,.20,blue);
    for(const y of [.75,3.22])box('Covered hall ceremonial bay gold border',x,y,stageEnd-.47,.23,.07,.025,brass);
  }
  const parasolColors=[mat('#c5b99d'),mat('#c28b27'),mat('#a74f37')];
  for(let tier=0;tier<3;tier++){
    const radius=1.05-tier*.27,y=2.78+tier*.20;
    for(let j=0;j<18;j++){
      const segment=new THREE.ConeGeometry(radius,.26,2,1,true,j*Math.PI/9,Math.PI/9);
      mesh('Covered hall tiered cloth parasol',segment,parasolColors[j%3],21.45,y,stageEnd-1.2);
    }
  }
  K.beam(g,'Covered hall parasol suspension',[21.45,3.54,stageEnd-1.2],[21.45,3.21,stageEnd-1.2],.014,dark);

  // Low, flat-roofed pavilions on the opposite side; the halls are not symmetric.
  for(const z of [10.0,23.2]){
    box('Left pavilion upper white back',53.65,4.59,z,.18,1.6,3.65,agedWhite);
    for(const dz of [-1.65,1.65])box('Left pavilion upper white side',52.35,4.59,z+dz,2.7,1.6,.20,agedWhite);
    box('Left pavilion dark roof slab',52.35,5.43,z,3.2,.20,4.02,weathered);
    box('Left pavilion red roof lip',50.75,5.4,z,.15,.14,4.06,red);
    const arch=scallop('Left pavilion scalloped opening',0,0,3.3,5.30,.22,white,.55);arch.rotation.y=Math.PI/2;arch.position.set(51.05,0,z);
  }
  // The former floating dome room is now part of the supported rear upper range.
  // Individual bays around the circuit, rather than identical windows on all sides.
  function sideScallop(n,x,z,w,top,drop=.46){
    const arch=scallop(n,0,0,w,top,.18,paleBlue,drop);arch.rotation.y=-Math.PI/2;arch.position.set(x,0,z);return arch;
  }
  const blueBlocks=blue.clone();blueBlocks.map=canvasMap(512,(c,s)=>{
    c.fillStyle='#94bdc6';c.fillRect(0,0,s,s);c.strokeStyle='#d5d2bd';c.lineWidth=4;
    for(let j=0;j<6;j++)for(let i=-1;i<5;i++)c.strokeRect(i*128+(j%2)*64,j*85,128,85);
  });blueBlocks.color.set('#ffffff');
  for(const [z,timber] of [[16.2,false],[21.4,true]]){
    if(!timber)box('Outer blue block-pattern shrine wall',53.68,1.96,z,.035,2.60,2.60,blueBlocks);
    box('Outer shrine closed door shadow',53.61,1.80,z,.08,2.38,1.08,dark,true);
    for(const dz of [-.58,.58])box('Outer shrine tall door jamb',53.53,1.82,z+dz,.14,2.54,.11,timber?K.M.wood:blue);
    for(const y of [.64,3.04])box('Outer shrine doorway cross frame',53.51,y,z,.16,.11,1.27,timber?K.M.wood:blue);
    // 15.04.08 / 15.04.30: narrow metal bars within two framed leaves;
    // the blue gate has two tiers, the timber gate four.
    const doorMaterial=timber?K.M.wood:blue;
    for(const side of [-1,1])for(let i=0;i<4;i++)
      box('Outer shrine slender metal gate bar',53.50,1.82,z+side*.285+(i-1.5)*.095,.025,2.30,.016,whiteTrim);
    box('Outer shrine paired door central stile',53.47,1.82,z,.09,2.38,.09,doorMaterial);
    for(const y of (timber?[1.24,1.82,2.40]:[1.82]))box('Outer shrine gate cross rail',53.46,y,z,.08,.09,1.06,doorMaterial);
    box('Outer shrine horizontal latch',53.405,1.59,z,.025,.025,.28,brass);
    const smallBellMetal=mat('#888879',.8,{metalness:.35});
    bell('Outer shrine small suspended bell',51.45,2.08,z-.80,.22,smallBellMetal);
    K.beam(g,'Outer shrine bell suspension',[51.45,3.42,z-.80],[51.45,2.37,z-.80],.012,dark);
    if(timber){
      K.beam(g,'Timber shrine tiered lamp suspension',[52.9,3.22,z+.82],[52.9,1.39,z+.82],.009,dark);
      for(const y of [1.45,1.94,2.43]){
        const dish=mesh('Timber shrine hanging oil lamp dish',new THREE.LatheGeometry([[.015,0],[.075,.012],[.095,.045],[.095,.055],[.071,.025],[.016,.014]].map(p=>new THREE.Vector2(...p)),12),brass,52.9,y,z+.82);
        cyl('Timber shrine oil lamp central stem',52.9,y+.085,z+.82,.014,.025,.10,brass,8);
      }
    }
    sideScallop('Outer shrine pale blue scalloped entrance',51.04,z,2.40,3.33);
    if(timber)for(let i=0;i<24;i++){
      const t=i/23;cyl('Outer shrine hanging flower garland',51.0,3.02-.30*Math.sin(t*Math.PI),z-.8+t*1.6,.032,.028,.055,i%3?K.M.cream:red,7);
    }
  }
  // Large closed blue shutter bay nearest the entrance (15.01.44 / 15.02.23).
  box('Outer entrance shrine blue closed shutters',53.64,2.12,10,.08,1.95,2.45,blue);
  box('Outer entrance shrine shutter central stile',53.56,2.12,10,.09,1.95,.065,dark);
  sideScallop('Outer entrance shrine wide scalloped arch',51.04,10,3.00,3.63,.62);
  for(const z of [8.55,11.45])blueColumn('Outer entrance shrine tall pale blue pier',51.04,z,.6,3.06);
  for(const z of [8.95,11.05]){
    box('Outer entrance shrine blue lower panel',51.01,.97,z,.06,.70,.72,blue);
    const grille=[];for(let i=0;i<5;i++)grille.push([50.96,.97,z-.29+i*.145,.025,.54,.035]);
    instances('Outer entrance shrine brass grille',new THREE.BoxGeometry(1,1,1),brass,grille);
  }
  // 15.02.17: looking back-left after entry ends at a closed service corner.
  // Join the entrance block to the first blue shrine; it is not an exit outside.
  box('Entrance circuit closed return wall',50.91,1.95,6.38,6.18,3.70,.26,agedWhite,true);
  box('Entrance circuit tiled lower wall',50.91,.54,6.535,6.18,.83,.045,outlinedPlinth);
  box('Entrance circuit blue barred window frame',49.0,2.0,6.57,1.40,1.56,.13,blue);
  box('Entrance circuit dark window recess',49.0,2.0,6.65,1.21,1.36,.05,dark);
  for(let y=1.38;y<2.66;y+=.13)box('Entrance circuit horizontal window bars',49.0,y,6.70,1.20,.025,.025,whiteTrim);
  for(const x of [48.62,49.0,49.38])box('Entrance circuit blue window mullion',x,2.0,6.71,.045,1.36,.045,blue);
  box('Entrance circuit red window hood',49.0,2.92,6.76,1.75,.16,.57,red);
  box('Entrance circuit closed service door frame',50.92,1.65,6.57,.94,2.19,.13,dark);
  box('Entrance circuit closed blue service door',50.92,1.65,6.66,.79,2.06,.06,blue,true);
  box('Entrance circuit service door crossbar',50.92,1.76,6.71,.68,.045,.05,dark);
  box('Entrance circuit recessed corner back',52.58,2.35,6.62,2.48,2.0,.10,white);
  steps('Entrance circuit worn corner steps',52.2,7.34,2.7,1.25,.1,.63,'-z',4);
  floor('Entrance circuit corner landing',52.2,6.67,2.7,.32,.63,oldStone);
  const returnCanopy=box('Entrance circuit closed corner flat canopy',50.94,3.90,6.97,6.3,.22,1.65,agedWhite);K.roofs.push(returnCanopy);
  box('Entrance circuit stained terrace parapet',50.94,4.34,7.74,6.3,.75,.22,agedWhite);
  box('Entrance circuit terrace corner return',47.85,4.34,7.0,.22,.75,1.70,agedWhite);
  // Bells hang inside the covered bays; their chains and clappers are separate.
  for(const z of [25.2]){
    K.beam(g,'Outer circuit small bell chain',[51.55,3.42,z],[51.55,2.69,z],.012,dark);
    cyl('Outer circuit hanging bell',51.55,2.60,z,.057,.12,.19,brass,16);
    cyl('Outer circuit bell clapper',51.55,2.47,z,.018,.026,.13,brass,8);
  }
  // Three photographed shrines sit below real half-cylinder vaults at the rear
  // of the left range. Their exact spacing is inferred from the walking sequence.
  const shrineTexture=new THREE.TextureLoader().load('./assets/temple-outer-shrines.jpg');shrineTexture.colorSpace=THREE.SRGBColorSpace;
  const circuitStone=mat('#a69c8b');circuitStone.map=agedWhite.map;
  const vaults=new THREE.Group();vaults.name='Three red-edged outer shrine vaults';g.add(vaults);K.roofs.push(vaults);
  for(let i=0;i<3;i++){
    const z=37.30+i*2.48;
    box('Outer shrine raised altar base',52.23,1.02,z,2.72,.84,2.32,circuitStone,true);
    box('Outer shrine red altar front',51.61,1.49,z,.18,.62,2.30,red);
    box('Outer shrine pale niche backing',53.66,2.10,z,.08,1.32,2.22,agedWhite);
    // Retain the actual stones and painted background from the supplied image.
    const region=[[.267,.474,.373,.541],[.422,.469,.536,.538],[.579,.47,.684,.538]][i];
    const geo=new THREE.PlaneGeometry(2.08,.83),uv=geo.attributes.uv;
    for(let j=0;j<uv.count;j++)uv.setXY(j,region[0]+uv.getX(j)*(region[2]-region[0]),1-region[3]+uv.getY(j)*(region[3]-region[1]));
    const picture=mesh('Photographed outer shrine stones and painted recess',geo,new THREE.MeshBasicMaterial({map:shrineTexture,side:THREE.DoubleSide}),51.95,2.16,z);picture.rotation.y=-Math.PI/2;
    sideScallop('Outer shrine niche pale blue scallops',51.05,z,2.30,3.32,.62);
    if(i===0)blueColumn('Outer shrine niche blue pier',51.05,z-1.24,.6,2.85);
    blueColumn('Outer shrine niche blue pier',51.05,z+1.24,.6,2.85);
    const arc=[];for(let j=0;j<=28;j++){const a=Math.PI*j/28;arc.push(new THREE.Vector3(51.045,2.56+.28*Math.sin(a),z+1.03*Math.cos(a)));}
    mesh('Outer shrine gold niche border',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc),28,.045,6,false),brass);
    // Vault axis runs through the veranda, with its arch facing the circuit.
    const vs=new THREE.Shape();vs.moveTo(-1.24,0);vs.absarc(0,0,1.24,Math.PI,0,true);vs.lineTo(1.11,0);vs.absarc(0,0,1.11,0,Math.PI,false);vs.closePath();
    const shell=mesh('Outer shrine white barrel vault',new THREE.ExtrudeGeometry(vs,{depth:2.84,bevelEnabled:false,curveSegments:24}),agedWhite,53.84,4.32,z,vaults);shell.rotation.y=-Math.PI/2;
    const rim=mesh('Outer shrine red semicircular vault rim',new THREE.ExtrudeGeometry(vs,{depth:.17,bevelEnabled:false,curveSegments:24}),red,50.91,4.32,z,vaults);rim.rotation.y=-Math.PI/2;
    K.box(vaults,'Outer shrine upper white balcony wall',51.01,3.98,z,.18,.66,2.42,white);
    for(const zz of [z-1.24,z+1.24])K.box(vaults,'Outer shrine vault white spring pier',51.0,4.15,zz,.26,.74,.17,white);
  }
  // The far corner has stored boards and a shaded work table, as in 15.05.42.
  for(let i=0;i<8;i++)box('Rear circuit stacked dark boards',24.25,.73+i*.105,40.1,2.08,.075,1.08,K.M.wood);
  box('Rear circuit old work table top',24.15,1.40,43.1,1.90,.10,.80,K.M.wood);
  for(const x of [23.37,24.93])for(const z of [42.79,43.41])box('Rear circuit table leg',x,1.0,z,.085,.80,.085,K.M.wood);
  const circuitStones=[[47.55,21.3],[47.55,27.7],[47.55,30.55],[42.6,32.15],[35.8,32.15],[30.5,27.7]];
  for(const [x,z] of circuitStones){box('Small circuit ritual stone foot',x,.145,z,.25,.09,.25,oldStone);cyl('Small circuit rounded stone',x,.23,z,.08,.105,.10,weathered,8);}
  // A gentle fall to a shallow edge drain replaces a perfectly bare perimeter.
  for(const side of [-1,1])box('Old inner shrine dark drainage channel',39+side*8.05,.105,25,.15,.012,10.8,dark);
  // Weathered upright stone in the circumambulatory passage, as in 15.03.33.
  const stoneShape=new THREE.Shape();stoneShape.moveTo(-.47,0);stoneShape.lineTo(.47,0);stoneShape.lineTo(.47,.80);stoneShape.absarc(0,.80,.47,0,Math.PI,false);stoneShape.closePath();
  // 15.03.33: dark grey granite, pitted and lichen-blotched.
  const markerGranite=mat('#ffffff',.93);
  markerGranite.map=canvasMap(256,(c,s)=>{let n=6113;const r=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
    c.fillStyle='#6d6c66';c.fillRect(0,0,s,s);
    for(let i=0;i<2600;i++){c.fillStyle=r()<.5?'rgba(35,35,32,.35)':'rgba(170,168,158,.3)';c.fillRect(r()*s,r()*s,1+r()*2,1+r()*2);}
    for(let i=0;i<30;i++){c.fillStyle=`rgba(${r()<.5?'150,148,130':'40,44,36'},${.12+r()*.2})`;c.beginPath();c.ellipse(r()*s,r()*s,6+r()*24,4+r()*16,r()*3,0,7);c.fill();}
  });
  K.worldMap(markerGranite,1.6);
  const markerStone=mesh('Rounded courtyard marker stone',new THREE.ExtrudeGeometry(stoneShape,{depth:.22,bevelEnabled:false,curveSegments:12}),markerGranite,48.9,.10,24.2);
  const markerNav=K.colliders.length;K.blocker(48.9,24.31,.94,.22,.1,1.37);
  // Two unequal upright stones stand outside the rear door/window bay.
  for(const [x,h] of [[26.05,1.10],[26.90,.88]]){
    const rearStone=mesh('Rear west paired upright stone',new THREE.ExtrudeGeometry(stoneShape,{depth:.22,bevelEnabled:false,curveSegments:12}),markerGranite,x,.10,42.06);
    rearStone.scale.set(.70,h/1.27,1);K.blocker(x,42.17,.66,.22,.1,.1+h);
  }

  // Deepastambha: layered square foot, dark shaft and a vertical series of lamp dishes.
  // 15.13.03 (gallery) and 15.15.51 (entry): the lamp lies on the doorway
  // sightline, rather than in front of the facade window to its east.
  const lampX=38.7,lampZ=11.20;
  box('Lamp stone foot',lampX,.26,lampZ,1.45,.32,1.45,oldStone,true);
  box('Lamp dark lower plinth',lampX,.48,lampZ,1.6,.13,1.6,dark);
  box('Lamp upper plinth',lampX,.67,lampZ,1.03,.22,1.03,dark);
  const lampShaftStone=mat('#4b4a42',.88);
  box('Lamp square shaft',lampX,1.66,lampZ,.49,1.83,.49,lampShaftStone);
  for(const y of [.85,1.0,2.45,2.60])box('Lamp square collar',lampX,y,lampZ,.68,.12,.68,dark);
  // 15.03.47 / 15.13.03: slim shaft; dishes little wider than the shaft.
  cyl('Lamp round shaft',lampX,5.73,lampZ,.16,.2,6.5,dark,16);
  const lampCups=[],lampTurnedBands=[];
  for(let i=0;i<15;i++){
    const y=2.62+i*.44;
    cyl('Lamp wide dish',lampX,y,lampZ,.30-i*.004,.21-i*.003,.08,dark,32);
    cyl('Lamp small rim',lampX,y+.045,lampZ,.31-i*.004,.31-i*.004,.022,dark,32);
    // 15.13.03 / 15.02.27: each tray ends in a ring of small open oil cups.
    // One shared lathe mesh retains the scalloped silhouette at close range.
    const scale=1-i*.012,radius=.288-i*.004;
    for(let j=0;j<20;j++){const angle=j*Math.PI/10;lampCups.push([lampX+radius*Math.cos(angle),y+.041,lampZ+radius*Math.sin(angle),scale,scale,scale]);}
    if(i<14)lampTurnedBands.push([lampX,y+.23,lampZ,.206-i*.0027,1,.206-i*.0027]);
  }
  const cupProfile=[[0,0],[.024,0],[.040,.016],[.042,.027],[.033,.029],[.029,.017],[.020,.010],[0,.010]].map(([r,y])=>new THREE.Vector2(r,y));
  instances('Lamp scalloped open oil cups',new THREE.LatheGeometry(cupProfile,10),dark,lampCups);
  instances('Lamp fine turned shaft bands',new THREE.CylinderGeometry(1,1,.022,20),lampShaftStone,lampTurnedBands);
  cyl('Lamp finial',lampX,9.12,lampZ,.018,.13,.42,dark,12);
  K.blocker(lampX,lampZ,1.6,1.6,.1,1.0);
  K.blocker(lampX,lampZ,1.02,1.02,1.0,9.35);
  // 15.03.47: pink pillar is diagonally behind the black lamp, nearer the inner building.
  const flagX=37.4,flagZ=13.10;
  box('Flagstaff stone foot',flagX,.26,flagZ,1.48,.32,1.48,oldStone,true);
  box('Flagstaff blue base',flagX,.59,flagZ,1.30,.55,1.30,blue);
  for(const y of [.38,.51,.64,.77])box('Flagstaff blue stepped base course',flagX,y,flagZ,1.38,.07,1.38,blue);
  box('Flagstaff broad pale coping',flagX,.89,flagZ,1.68,.17,1.68,stoneFloor);
  box('Flagstaff dark rounded shoulder',flagX,1.09,flagZ,.80,.26,.80,oldStone);
  // 15.21.50 / 15.22.33 / 15.22.36: the flagstaff rises about 18-19 m, above the temple roofs;
  // 15.03.47: a slimmer shaft.
  cyl('Tall pink banded pillar',flagX,9.95,flagZ,.15,.25,17.5,pink,8);
  const bands=[];for(let i=0;i<38;i++)bands.push([flagX,1.2+i*.46,flagZ,.72-i*.012,1,.72-i*.012]);
  instances('Pink pillar pale bands',new THREE.CylinderGeometry(.355,.355,.044,8),dado,bands);
  K.beam(g,'Pink pillar rope',[flagX+.22,18.5,flagZ],[flagX+.3,.95,flagZ],.012,K.M.cream);
  K.blocker(flagX,flagZ,1.68,1.68,.1,1.0);
  K.blocker(flagX,flagZ,.6,.6,1.0,18.7);
  // 15.02.27 / 15.15.51: the pale pole with iron pegs rises from the rear corner of the lamp plinth.
  const poleX=lampX-.55,poleZ=lampZ-.35;
  cyl('Separate pale metal pole',poleX,5.3,poleZ,.115,.15,10.35,metalPole,16,true);
  const poleBands=[];for(let i=0;i<7;i++)poleBands.push([poleX,.9+i*1.25,poleZ,1,1,1]);
  instances('Pale pole collars',new THREE.CylinderGeometry(.16,.16,.075,16),brass,poleBands);
  // Iron climbing pegs are visible on the same pole in 15.02.27 / 15.13.03.
  for(let i=0;i<16;i++){const side=i%2?1:-1,y=1.3+i*.52;
    K.beam(g,'Pale pole iron climbing peg',[poleX+side*.10,y,poleZ],[poleX+side*.39,y+.025,poleZ],.014,dark);}
  // 15.02.00 and 15.10.30 place the Tulsi nearer the entrance-side wall,
  // leaving the central court open. Move the whole assembly, including its blocker.
  const tulsiStart=markAssembly();
  box('Tulsi lower blue course',31.8,.17,10.2,.85,.12,.85,blue);
  box('Tulsi red pedestal',31.8,.49,10.2,.60,.56,.60,red,true);
  box('Tulsi blue middle course',31.8,.65,10.2,.81,.12,.81,blue);
  box('Tulsi upper pot',31.8,.86,10.2,.49,.28,.49,red);
  cyl('Tulsi planted soil',31.8,1.01,10.2,.2,.2,.02,K.M.earth,10);
  K.beam(g,'Tulsi stems',[31.8,1.02,10.2],[31.8,1.6,10.2],.03,K.M.wood);
  const leafGeo=new THREE.SphereGeometry(1,7,5),leaves=[];
  for(let i=0;i<9;i++)leaves.push([31.8+Math.cos(i*2.3)*.13,1.17+i*.047,10.2+Math.sin(i*2.3)*.13,.09,.035,.05,0,i,0]);
  instances('Tulsi leaves',leafGeo,K.M.leaf,leaves);
  // 15.10.30: square wire guard encloses the plant above the stepped plinth.
  const tulsiWire=mat('#6f7161',.73,{metalness:.25}),cage=[];
  for(const side of [-1,1]){
    for(const d of [-.31,.31])box('Tulsi cage angle upright',31.8+side*.31,1.29,10.2+d,.018,.69,.018,tulsiWire);
    for(const y of [.96,1.63]){
      cage.push([31.8,y,10.2+side*.31,.64,.018,.018]);cage.push([31.8+side*.31,y,10.2,.018,.018,.64]);
    }
    for(let i=1;i<13;i++){
      const a=-.31+i*.62/13,y=.96+i*.67/13;
      cage.push([31.8+a,1.295,10.2+side*.31,.005,.67,.005]);cage.push([31.8+side*.31,1.295,10.2+a,.005,.67,.005]);
      cage.push([31.8,y,10.2+side*.31,.62,.005,.005]);cage.push([31.8+side*.31,y,10.2,.005,.005,.62]);
    }
  }
  instances('Tulsi fine square wire mesh',new THREE.BoxGeometry(1,1,1),tulsiWire,cage);
  for(const side of [-1,1]){
    for(const y of [.31,.49,.76,.91]){
      box('Tulsi pale masonry bed joint',31.8,y,10.2+side*.302,.60,.007,.008,whiteTrim);
      box('Tulsi pale masonry side joint',31.8+side*.302,y,10.2,.008,.007,.60,whiteTrim);
    }
    for(const x of [-.10,.12])box('Tulsi pedestal vertical mortar',31.8+x,.4,10.2+side*.304,.006,.17,.008,whiteTrim);
  }
  for(const d of [-.25,.25]){
    box('Tulsi top blue rim',31.8+d,1.01,10.2,.05,.055,.55,blue);
    box('Tulsi top blue rim',31.8,1.01,10.2+d,.45,.055,.05,blue);
  }
  moveAssembly(tulsiStart,-.5,-1.90);

  // 15.02.27 / 15.10.34 / 15.14.44: raised court-facing portico with a low
  // central entry. West of the entry (to the right on entering) the carved
  // frieze platform is the narrow great-bell hall; beyond it come the white
  // stair wall and the blue service bay. The east hall has two smaller bells.
  for(const [x,w,n] of [[36.525,2.65,3],[44.0,7.5,10]]){
    floor('Courtyard portico raised marble platform',x,7.02,w,1.62,.602,stoneFloor);
    box('Courtyard portico dark carved plinth',x,.32,7.80,w,.45,.14,oldStone,true);
    for(let i=0;i<n;i++)panel('Courtyard portico inset relief panel',x-(n-1)*.37+i*.74,.33,7.88,.60,.31,relief);
    box('Courtyard portico marble lip',x,.59,7.87,w+.1,.10,.18,whiteTrim);
    steps('Courtyard portico side access',x<39?35.75:46.8,8.19,.90,.85,.1,.602,'-z',3);
  }
  for(const x of [35.45,40.65,47.3]){
    box('Courtyard portico square white pier',x,2.14,7.58,.46,3.02,.46,white,true);
    box('Courtyard portico pier red foot',x,.91,7.58,.61,.62,.61,red);
  }
  for(const x of [37.55,42.0,45.5]){
    carvedColumn('Courtyard bell bay carved column',x,7.57,.602,3.04,.86);
    box('Courtyard bell column red plinth',x,.93,7.57,.74,.66,.74,red);
    panel('Courtyard bell column outward carving',x,1.63,7.87,.40,.62,relief);
  }
  for(const [x,w] of [[36.5,1.72],[41.33,1.26],[43.75,3.10],[46.4,1.34]])scallop('Courtyard portico scalloped arch',x,7.58,w,3.82,.26,whiteTrim,.43);
  box('Courtyard portico ceiling slab',44.0,3.94,7.05,7.6,.22,1.85,white);
  box('Bell hall ceiling slab',36.525,3.94,7.05,2.75,.22,1.85,white);
  // White wall between the service bay and the bell hall: red dado over the
  // red-outlined tiled plinth, and a blue-framed door with the gallery stair
  // rising inside it.
  {const wallZ=7.45,x0=30.95,x1=35.25,d0=34.0,d1=34.95,dc=(d0+d1)/2,sill=.62,head=3.07;
    for(const [a,b] of [[x0,d0],[d1,x1]]){
      box('Stair door white wall',(a+b)/2,2.0,wallZ,b-a,3.92,.3,white,true);
      box('Stair door wall red dado',(a+b)/2,.87,wallZ+.155,b-a,.5,.02,red);
      box('Stair door wall tiled plinth',(a+b)/2,.31,wallZ+.16,b-a,.62,.03,outlinedPlinth);
    }
    // The door stays fixed; the paired 45-degree view extends this plain wall west.
    box('Stair door white lintel wall',dc,(head+3.96)/2,wallZ,d1-d0,3.96-head,.3,white);
    for(const x of [d0+.04,d1-.04])box('Stair door blue frame jamb',x,(sill+head)/2,wallZ+.16,.08,head-sill,.06,blue);
    for(const y of [head-.02,head-.36])box('Stair door blue frame head',dc,y,wallZ+.16,d1-d0,.07,.06,blue);
    box('Stair door pale transom glass',dc,head-.19,wallZ+.13,d1-d0-.16,.26,.02,whiteTrim);
    // (15.15.11) The stairwell back sat in front of the portico wall as a dark strip; set it behind the wall face.
    box('Stair door dark stairwell back',dc,1.9,Math.max(wallZ-1.6,6.25),d1-d0,2.6,.05,dark);
    // The bell hall's white west wall closes the stair from the hall side.
    box('Bell hall white west wall',x1+.05,2.28,6.7,.1,3.36,1.7,white,true);
    box('Stair enclosure white east wall',d0-.02,2.28,wallZ-.95,.06,3.36,1.3,white);
    for(let i=0;i<5;i++)box('Gallery stair tread seen through the door',dc,sill+.1+i*.19,wallZ-.35-i*.24,d1-d0-.04,.19,.26,oldStone);
    K.blocker(dc,wallZ-.4,d1-d0,.9,sill,head);
    floor('Stair door threshold',dc,wallZ+.1,d1-d0,.5,sill,oldStone);
    steps('Stair door front steps',dc,wallZ+.75,1.1,.9,.02,sill,'-z',3);
  }
  // Blue scalloped service bay underneath the left-hand upper windows.
  const serviceStart={children:g.children.length,colliders:K.colliders.length,surfaces:K.surfaces.length,ramps:K.ramps.length};
  // 15.10.30 / 15.10.43: a 2.7 m deep porch with an open scalloped west
  // side and one raised inner step. Rear wall and door are behind that step.
  box('Courtyard left service bay blue back',32.0,2.195,4.90,3.35,2.70,.14,paleBlue,true);
  box('Courtyard left service bay dark door',32.0,2.09,4.98,1.45,2.45,.06,dark);
  box('Service bay east return wall',33.68,2.195,6.245,.14,2.70,2.69,paleBlue,true);
  for(const x of [30.35,33.65]){
    cyl('Courtyard service bay round blue pier',x,2.35,7.59,.145,.145,2.52,paleBlue,20);
    cyl('Courtyard service bay red column foot',x,.90,7.59,.151,.151,.60,red,20);
    K.blocker(x,7.59,.32,.32,.602,3.61);
  }
  // 15.10.30 / 15.10.43: distinct curled lobes and small downward cusps,
  // rather than a sine-wave edge. Mirror the left silhouette at its crown.
  const archOpening=new THREE.Path(),archScale=y=>2.90+(y-2.90)*.84;
  const lobes=[
    [[-1.625,2.90],[-1.41,2.84],[-1.31,2.99],[-1.28,3.08]],
    [[-1.28,3.08],[-1.22,3.20],[-1.11,3.22],[-1.05,3.13]],
    [[-1.05,3.13],[-1.08,3.32],[-.83,3.46],[-.76,3.29]],
    [[-.76,3.29],[-.80,3.50],[-.54,3.64],[-.47,3.47]],
    [[-.47,3.47],[-.44,3.58],[-.12,3.51],[0,3.64]],
  ];
  archOpening.moveTo(-1.625,2.90);
  for(const [,a,b,c] of lobes)archOpening.bezierCurveTo(a[0],archScale(a[1]),b[0],archScale(b[1]),c[0],archScale(c[1]));
  for(const [a,b,c] of [...lobes].reverse())archOpening.bezierCurveTo(-c[0],archScale(c[1]),-b[0],archScale(b[1]),-a[0],archScale(a[1]));
  const archContour=archOpening.getPoints(16);
  const bayArchShape=new THREE.Shape();bayArchShape.moveTo(-1.625,3.71);bayArchShape.lineTo(1.625,3.71);
  for(const p of [...archContour].reverse())bayArchShape.lineTo(p.x,p.y);
  bayArchShape.closePath();mesh('Courtyard left service bay scalloped arch',new THREE.ExtrudeGeometry(bayArchShape,{depth:.20,bevelEnabled:false}),paleBlue,32,0,7.50);
  const sideArch=mesh('Service bay west side scalloped arch',new THREE.ExtrudeGeometry(bayArchShape,{depth:.18,bevelEnabled:false}),paleBlue,30.35,0,6.245);sideArch.rotation.y=Math.PI/2;sideArch.scale.x=2.69/3.25;
  const rimShape=new THREE.Shape();rimShape.moveTo(archContour[0].x,archContour[0].y);
  for(const p of archContour.slice(1))rimShape.lineTo(p.x,p.y);
  for(const p of [...archContour].reverse())rimShape.lineTo(p.x,p.y+.012);rimShape.closePath();
  const archRim=new THREE.ExtrudeGeometry(rimShape,{depth:.012,bevelEnabled:false});
  mesh('Service bay worn pale arch edge',archRim,whiteTrim,32,0,7.702);
  const sideRim=mesh('Service bay worn pale side arch edge',archRim,whiteTrim,30.336,0,6.245);sideRim.rotation.y=Math.PI/2;sideRim.scale.x=2.69/3.25;
  cyl('Service bay rear blue pier',30.35,2.35,4.98,.145,.145,2.52,paleBlue,20);
  K.blocker(30.35,4.98,.32,.32,.823,3.61);
  const bayCeiling=box('Service bay flat porch ceiling',32,3.77,6.40,3.65,.12,3.3,white);K.roofs.push(bayCeiling);
  floor('Side bay red oxide platform',32,6.44,3.34,3.08,.613,oxideFloor);
  floor('Service bay west hall connection',30.14,7.10,.45,1.4,.613,oxideFloor);
  floor('Service bay raised inner floor',32,5.62,3.34,1.44,.823,oxideFloor,.21);
  box('Service bay inner step riser',32,.718,6.335,3.34,.21,.03,red);
  box('Side bay red platform edge',32,.59,7.98,3.35,.09,.04,red);
  box('Side bay pale masonry plinth',32,.32,7.97,3.35,.43,.035,outlinedPlinth);
  steps('Side bay central approach steps',32,8.24,1.04,.92,.1,.613,'-z',3);
  // Rotational profiles give the bells a hollow flared mouth, not a cone.
  const bronze=mat('#d6b49c',.65,{metalness:.20,side:THREE.DoubleSide});
  bronze.map=canvasMap(256,(c,n)=>{
    c.fillStyle='#c78d59';c.fillRect(0,0,n,n);
    for(let i=0;i<1000;i++){c.fillStyle=i%3?'#553f2422':'#dbbf8233';c.fillRect(rand()*n,rand()*n,2+rand()*10,2+rand()*6);}
    for(const y of [12,32,182,215]){c.fillStyle='#583b29';c.fillRect(0,y,n,2);}
  });
  function bell(name,x,bottom,z,size,material=bronze){
    const profile=[[.52,0],[.55,.04],[.55,.10],[.46,.15],[.37,.25],[.30,.44],[.27,.84],[.28,1.03],[.23,1.13],[.12,1.18],[.10,1.12],[.23,1.04],[.22,.84],[.25,.43],[.33,.23],[.43,.13],[.49,.07],[.49,0]];
    const body=mesh(name,new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r*size,y*size)),40),material,x,bottom,z);
    cyl(name+' crown',x,bottom+1.19*size,z,.09*size,.12*size,.14*size,material,16);
    cyl(name+' dark clapper',x,bottom-.04*size,z,.045*size,.065*size,.35*size,dark,12);
    return body;
  }
  // The user-selected 180653 (2013) shows a raised corrugated shutter above
  // a dark service opening; 15.10.43 (2011) shows the older panelled door.
  const doorSilver=mat('#aeb5af',.42,{metalness:.62});
  box('Side bay raised rolling shutter',32,3.20,5.08,1.48,.49,.09,doorSilver);
  for(let y=2.97;y<3.44;y+=.065)box('Side bay raised shutter corrugation',32,y,5.145,1.47,.023,.035,oldStone);
  box('Side bay shutter lower rail',32,2.95,5.15,1.53,.055,.05,doorSilver);
  for(const [x,z,y] of [[30.72,7.0,2.71],[31.35,6.68,2.98],[33.0,6.68,2.96]]){
    bell('Side bay small suspended bell',x,y,z,.20);
    K.beam(g,'Side bay bell cord',[x,3.54,z],[x,y+.27,z],.010,dark);
  }
  box('Side bay fluorescent tube',32,3.29,6.59,1.10,.05,.06,whiteTrim);
  const vesselBlue=mat('#688b94',.68);
  const vessel=mesh('Side bay rounded water vessel',new THREE.SphereGeometry(1,20,12),vesselBlue,30.98,.82,7.46);vessel.scale.set(.20,.22,.19);
  cyl('Side bay water vessel neck',30.96,1.03,7.46,.067,.075,.13,vesselBlue,14);
  cyl('Side bay vessel dark mouth',30.96,1.10,7.46,.053,.053,.01,dark,14);
  box('Side bay blue collection box',33.0,.87,7.30,.43,.53,.36,vesselBlue,true);
  box('Side bay collection box lid',33.0,1.15,7.30,.47,.035,.40,vesselBlue);
  box('Side bay collection slot',33.0,.95,7.49,.17,.023,.008,dark);
  for(const y of [.69,1.02])box('Side bay box hinge',33.19,y,7.495,.025,.08,.014,doorSilver);
  // Paired 15.10.34 / 15.10.30: the blue bay is recessed west of the
  // foreground round column, inside the road building, beside the chair hall.
  // Preserve the door at x=34.475; do not move the complete entrance facade.
  moveAssembly(serviceStart,-5.2,0);
  floor('Service bay chair platform connection',24.68,7.10,1.0,1.4,.613,oxideFloor);
  // White window wall connects the recessed blue bay to the wider plain stair wall.
  // Build around the opening rather than covering a solid wall with a black panel.
  {const left=28.55,right=30.95,w0=29.10,w1=30.55,bottom=1.13,top=2.85,z=7.45;
    for(const [a,b] of [[left,w0],[w1,right]])
      box('Service window white wall pier',(a+b)/2,2,z,b-a,3.92,.3,white,true);
    box('Service window white wall below',(w0+w1)/2,(.04+bottom)/2,z,w1-w0,bottom-.04,.3,white,true);
    box('Service window white wall above',(w0+w1)/2,(top+3.96)/2,z,w1-w0,3.96-top,.3,white,true);
    box('Service window dark recess',(w0+w1)/2,(bottom+top)/2,z-.10,w1-w0,top-bottom,.025,dark);
    for(const x of [w0,w1])box('Service window blue jamb',x,(bottom+top)/2,z+.16,.09,top-bottom+.12,.10,blue);
    for(const y of [bottom,(bottom+top)/2,top])box('Service window blue rail',(w0+w1)/2,y,z+.16,w1-w0+.12,.075,.10,blue);
    for(let y=bottom+.12;y<top;y+=.16)box('Service window pale horizontal bar',(w0+w1)/2,y,z+.19,w1-w0,.025,.03,whiteTrim);
    for(const x of [29.70,29.90])box('Service window pale vertical bar',x,(bottom+top)/2,z+.19,.025,top-bottom,.03,whiteTrim);
    box('Service window red dado',(left+right)/2,.87,z+.155,right-left,.5,.02,red);
    box('Service window tiled plinth',(left+right)/2,.31,z+.16,right-left,.62,.03,outlinedPlinth);
  }
  // User's note with 15.14.44: the bell bay is wider (it runs 1.0 m further into the court,
  // see the pass at the end), the bell hangs between two stepped white piers and the drum
  // hangs clear of it beside the right-hand pier.
  const bellX=36.55,bellZ=7.65;
  box('Great bell heavy timber suspension beam',bellX,3.39,7.65,.31,.25,2.4,K.M.wood);
  for(const z of [6.8,8.5]){
    box('Great bell white suspension pier',bellX,1.98,z,.5,2.75,.42,white,true);
    box('Great bell white pier stepped base',bellX,.95,z,.72,.7,.56,white);
    box('Great bell white pier middle step',bellX,1.55,z,.6,.5,.48,white);
    box('Great bell pier red foot',bellX,.64,z,.78,.08,.62,red);
  }
  bell('Great bronze temple bell',bellX,1.19,bellZ,1.10);
  for(const dx of [-.14,.14]){
    const handle=mesh('Great bell bronze suspension handle',new THREE.TorusGeometry(.16,.038,10,20),bronze,bellX+dx,2.58,bellZ);handle.rotation.y=dx<0?-.3:.3;
  }
  const rope=mat('#b7934c');
  for(let i=0;i<7;i++){
    const dx=(i-3)*.041;
    K.beam(g,'Great bell thick rope bundle',[bellX+dx,3.53,bellZ-.18],[bellX+dx+.04,2.65,bellZ+.03],.033,rope);
    K.beam(g,'Great bell rope return',[bellX+dx,3.53,bellZ+.18],[bellX+dx+.04,2.65,bellZ+.03],.027,rope);
  }
  for(const y of [2.69,2.76,2.83]){
    const knot=mesh('Great bell rope binding',new THREE.TorusGeometry(.19,.026,7,20),rope,bellX,y,bellZ);knot.rotation.x=Math.PI/2;
  }
  const pull=new THREE.CatmullRomCurve3([new THREE.Vector3(bellX,1.15,bellZ),new THREE.Vector3(bellX-.12,.85,bellZ+.02),new THREE.Vector3(bellX-.04,.69,bellZ+.05),new THREE.Vector3(bellX+.17,.85,bellZ+.05)]);
  mesh('Great bell looped clapper rope',new THREE.TubeGeometry(pull,20,.017,6,false),rope);
  K.blocker(bellX,bellZ,1.24,1.24,1.1,2.65);
  // The suspended drum is beside the large bell, as in the close-up 15.14.44.
  const drumX=bellX+.8,drumZ=6.6;
  const drum=new THREE.Group();drum.name='Suspended temple drum';drum.position.set(drumX,1.5,drumZ);drum.rotation.x=.62;drum.rotation.z=-.32;g.add(drum);
  const shell=mesh('Temple drum wooden shell',new THREE.CylinderGeometry(.45,.31,.65,32),K.M.wood,0,0,0,drum);
  for(const y of [-.325,.325]){
    const radius=y>0?.45:.31;
    mesh('Temple drum hide head',new THREE.CylinderGeometry(radius,radius,.025,32),mat('#c5c4b8'),0,y,0,drum);
    const rim=mesh('Temple drum rim',new THREE.TorusGeometry(radius,.022,8,32),K.M.wood,0,y,0,drum);rim.rotation.x=Math.PI/2;
  }
  for(let i=0;i<22;i++){
    const a=i*Math.PI/11,b=a+.15;
    K.beam(drum,'Temple drum rope lacing',[Math.cos(a)*.456,.325,Math.sin(a)*.456],[Math.cos(b)*.32,-.325,Math.sin(b)*.32],.012,rope);
  }
  K.beam(g,'Temple drum hanging chain',[drumX,3.32,drumZ],[drumX,1.9,drumZ],.018,dark);
  for(const x of [41.5,44.5]){
    bell('Courtyard smaller hanging bell',x,2.60,7.65,.43);
    K.beam(g,'Courtyard smaller bell chain',[x,3.72,7.65],[x,3.12,7.65],.025,dark);
  }
  // Little lamp canopy projects toward the entrance from the black pole's base.
  const shelterRoof=box('Small lamp shelter roof',lampX,1.88,lampZ-.64,1.30,.07,1.70,brass);shelterRoof.rotation.x=-.07;
  for(const dx of [-.63,.63])K.beam(g,'Lamp shelter slender leg',[lampX+dx,.1,lampZ-1.47],[lampX+dx,1.94,lampZ-1.47],.025,metalPole);
  // User's note: no small brass oil lamp here (it stood through the pole's plinth).

  // 15.08.04 / 15.08.10 / 15.08.42: lowered stone aisles surround a
  // raised pillared mandapa. The front hall has marble-clad column bases.
  // Footprint and bay spacing are inferred within the photographed exterior.
  const sanctumStone=K.M.plaster.clone();sanctumStone.color.set('#aaa591');sanctumStone.roughness=.88;
  function innerColumn(n,x,z,base,h,scale=1){
    box(n+' shaft',x,base+h/2,z,.38*scale,h,.38*scale,sanctumStone,true);
    for(const [yy,w,hh] of [[.10,.75,.20],[.38,.58,.30],[h*.48,.52,.48],[h-.25,.62,.18],[h-.08,.88,.16]])
      box(n+' stone collar',x,base+yy,z,w*scale,hh,w*scale,sanctumStone);
    for(const side of [-1,1])box(n+' stepped corbel',x+side*.30*scale,base+h-.16,z,.40*scale,.20,.35*scale,sanctumStone);
  }
  // 15.08.04 / 15.08.42: uneven rectangular stone slabs, narrow dark
  // joints and localized damp wear. World UVs keep slab sizes consistent.
  let pavingSeed=721;const pavingRand=()=>{pavingSeed=(1664525*pavingSeed+1013904223)>>>0;return pavingSeed/4294967296;};
  const slabs=[],stains=[];
  for(let row=0;row<6;row++){
    let x=0;while(x<1024){const w=Math.min(1024-x,150+pavingRand()*110);slabs.push({x,y:row*1024/6,w,h:1024/6,tone:120+pavingRand()*45});x+=w;}
  }
  for(let i=0;i<95;i++)stains.push({x:pavingRand()*1024,y:pavingRand()*1024,rx:8+pavingRand()*65,ry:5+pavingRand()*30,a:pavingRand()*Math.PI});
  const pavingMap=kind=>canvasMap(1024,(c,n)=>{
    c.fillStyle=kind==='color'?'#4d4a41':kind==='bump'?'#404040':'#eeeeee';c.fillRect(0,0,n,n);
    for(const q of slabs){
      c.fillStyle=kind==='color'?`rgb(${q.tone},${q.tone-5},${q.tone-17})`:kind==='bump'?'#b6b6b6':'#d9d9d9';
      c.fillRect(q.x+1.1,q.y+1.1,q.w-2.2,q.h-2.2);
      c.strokeStyle=kind==='color'?'#d3c9af38':kind==='bump'?'#929292':'#cccccc';c.lineWidth=1.5;c.strokeRect(q.x+3,q.y+3,q.w-6,q.h-6);
    }
    if(kind!=='bump')for(const q of stains){
      for(let layer=0;layer<22;layer++){
        const scale=1-layer/24;c.fillStyle=kind==='color'?'#342e2306':'#55555509';c.beginPath();
        for(let k=0;k<28;k++){
          const a=k*Math.PI/14,r=scale*(1+.23*Math.sin(a*3+q.a)+.13*Math.cos(a*7+q.x));
          const dx=Math.cos(a)*q.rx*r,dy=Math.sin(a)*q.ry*r;
          const x=q.x+dx*Math.cos(q.a)-dy*Math.sin(q.a),y=q.y+dx*Math.sin(q.a)+dy*Math.cos(q.a);
          if(k)c.lineTo(x,y);else c.moveTo(x,y);
        }
        c.closePath();c.fill();
      }
    }
    // Fine grain stays finer than the joints rather than looking like blocks.
    let grainSeed=89;for(let i=0;i<18000;i++){
      grainSeed=(grainSeed*1664525+1013904223)>>>0;const x=grainSeed%1024,y=(grainSeed>>>10)%1024;
      c.fillStyle=kind==='color'?(i%2?'#eee1c513':'#211e1815'):kind==='bump'?(i%2?'#d0d0d026':'#70707026'):'#99999915';c.fillRect(x,y,1.5,1.5);
    }
  });
  const innerPavingMaterial=mat('#ffffff',.94,{map:pavingMap('color'),roughnessMap:pavingMap('roughness'),bumpMap:pavingMap('bump'),bumpScale:.007});
  for(const texture of [innerPavingMaterial.roughnessMap,innerPavingMaterial.bumpMap])if(texture)texture.colorSpace=THREE.NoColorSpace;
  function innerPaving(n,x,z,w,d,top){
    floor(n,x,z,w,d,top,innerPavingMaterial);
    const geo=g.children[g.children.length-1].geometry,position=geo.attributes.position,uv=geo.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,(x+position.getX(i))/4,(z+position.getZ(i))/4);
    uv.needsUpdate=true;
  }
  innerPaving('Inner sanctum continuous stone aisle',39,24.45,14.1,10.0,.55);
  for(const x of [34.3,43.7]){
    box('Inner entrance raised platform',x,.79,18.15,7.5,.44,2.5,sanctumStone,true);
    floor('Inner entrance polished platform',x,18.15,7.5,2.5,1.03,dado);
  }
  for(const x of [34.8,37.3,40.7,43.2]){
    box('Inner hall marble column pedestal',x,1.57,18.8,.78,1.08,.78,dado,true);
    innerColumn('Inner hall carved stone column',x,18.8,2.11,1.58,.63);
  }
  // The two front platforms leave the central entrance passage lower and clear.
  for(const x of [33.05,44.95]){
    box('Inner side raised stone ledge',x,.79,24.5,2.25,.44,8.0,sanctumStone,true);
    innerPaving('Inner side ledge paving',x,24.5,2.25,8.0,1.03);
    for(const z of [21.1,23.5,25.9,28.0])innerColumn('Inner perimeter stone column',x,z,1.03,2.45,.77);
    box('Inner perimeter heavy stone lintel',x,3.54,24.5,2.5,.30,8.4,sanctumStone);
  }
  box('Inner rear raised ledge',39,.79,28.92,14.1,.44,1.05,sanctumStone,true);
  innerPaving('Inner rear ledge paving',39,28.92,14.1,1.05,1.03);
  // 15.08.42: the perimeter column ledges have recessed relief panels,
  // narrow dividing ribs and layered projecting copings. Individual figures are
  // unresolved; use subdued foliage relief instead of inventing deity portraits.
  const ledgeRecess=sanctumStone.clone(),ledgeRelief=sanctumStone.clone();
  ledgeRecess.color.set('#999683');ledgeRelief.color.set('#a6a18e');
  ledgeRecess.roughness=ledgeRelief.roughness=.98;
  const recesses=[],ribs=[],foliage=[];
  function ledgeFace(cx,cz,length,yaw){
    const place=(u,y,out,w,h,d,angle=0)=>{
      const c=Math.cos(yaw),sn=Math.sin(yaw);
      return [cx+c*u+sn*out,y,cz-sn*u+c*out,w,h,d,0,yaw,angle];
    };
    for(const [y,h,out,d] of [[.593,.045,.012,.055],[.915,.045,.014,.055],[.976,.035,.042,.10]])
      ribs.push(place(0,y,out,length,h,d));
    const count=Math.floor(length/.72),spacing=length/count;
    for(let j=0;j<count;j++){
      const u=-length/2+(j+.5)*spacing;
      recesses.push(place(u,.754,.008,spacing-.09,.265,.018));
      for(const side of [-1,1])ribs.push(place(u+side*(spacing/2-.027),.755,.031,.046,.275,.044));
      // A shallow central stem and paired leaves catch light as real relief.
      ribs.push(place(u,.753,.028,.013,.207,.018));
      for(let row=0;row<3;row++)for(const side of [-1,1]){
        const y=.684+row*.060,du=side*(.040+row*.012);
        foliage.push(place(u+du,y,.025,.029,.047,.009,-side*.60));
      }
      foliage.push(place(u,.856,.025,.025,.026,.010));
    }
  }
  ledgeFace(34.175,24.5,8,Math.PI/2);
  ledgeFace(43.825,24.5,8,-Math.PI/2);
  ledgeFace(39,28.395,14.1,Math.PI);
  instances('Inner ledge recessed relief fields',new THREE.BoxGeometry(1,1,1),ledgeRecess,recesses);
  instances('Inner ledge layered coping and panel ribs',new THREE.BoxGeometry(1,1,1),sanctumStone,ribs);
  instances('Inner ledge worn foliage relief',new THREE.SphereGeometry(1,8,6),ledgeRelief,foliage);
  for(const x of [35.6,39,42.4])innerColumn('Inner rear stone column',x,29,1.03,2.45,.77);
  for(const x of [36.9,40.5]){
    box('Inner rear white cloth curtain',x,2.18,29.39,2.25,2.15,.025,whiteTrim);
    for(let i=0;i<18;i++)box('Inner rear cloth folds',x-1.07+i*.125,2.18,29.36,.032,2.15,.03,white);
  }
  // Worn pale interior wall panels sit between the red masonry joints.
  for(const x of [31.96,46.04])for(const z of [21.0,23.4,25.8,28.1])
    box('Inner perimeter pale wall panel',x,2.02,z,.025,2.05,2.18,white);
  for(const x of [33.3,35.7,38.1,40.5,42.9,45.0])
    box('Inner rear pale wall panel',x,2.02,29.445,2.08,2.05,.025,white);
  box('Inner rear closed blue double door',43.45,2.13,29.40,1.35,2.2,.06,blue);
  box('Inner rear blue door stile',43.45,2.13,29.34,.05,2.2,.08,vividBlue);
  // Layered central plinth, projecting stone cornice and dark cross-braced gates.
  for(const [y,w,d,h] of [[.66,5.55,6.55,.22],[.83,5.30,6.30,.10],[.98,5.5,6.5,.14]])
    box('Inner mandapa layered stone plinth',39,y,24,w,h,d,sanctumStone,true);
  // User-labelled far-side left corner: carved mouldings wrap the rear plinth.
  // The figure identities in the recessed band are unresolved in the close-up.
  const cornerDark=mat('#414640',.98),cornerRelief=sanctumStone.clone();
  cornerRelief.color.multiplyScalar(.87);
  const cornerRibs=[],cornerPetals=[],cornerScrolls=[];
  function carvedPlinthFace(cx,cz,length,yaw){
    const c=Math.cos(yaw),sn=Math.sin(yaw);
    const place=(u,y,out,w,h,d,angle=0)=>[cx+c*u+sn*out,y,cz-sn*u+c*out,w,h,d,0,yaw,angle];
    const darkBand=box('Rear plinth recessed dark stone band',cx,.787,cz,length,.115,.025,cornerDark);
    darkBand.rotation.y=yaw;
    for(const [y,h,out,d] of [[.583,.028,.015,.075],[.704,.019,.020,.065],[.866,.035,.046,.11],[.916,.018,.014,.065],[1.045,.021,.018,.07]])
      cornerRibs.push(place(0,y,out,length,h,d));
    // Continuous curved stone courses with shallow petal outlines.
    for(const [base,height] of [[.597,.105],[.875,.041]]){
      const verts=[],indices=[];
      for(let j=0;j<=12;j++){
        const t=j/12,out=.01+Math.sin(t*Math.PI/2)*.066,y=base+height*(1-t);
        for(const u of [-length/2,length/2])verts.push(cx+c*u+sn*out,y,cz-sn*u+c*out);
        if(j<12){const k=j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
      }
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();
      const stone=sanctumStone.clone();stone.side=THREE.DoubleSide;
      mesh('Rear plinth continuous lotus course',geo,stone);
      const count=Math.round(length/.145),spacing=length/count;
      for(let i=0;i<count;i++)cornerPetals.push(place(-length/2+(i+.5)*spacing,base,.0,spacing*.48,height,1));
    }
    // Alternating scroll curls across the upper frieze, shared geometry below.
    for(let i=0;i<Math.floor(length/.205);i++){
      const u=-length/2+.11+i*.205;
      cornerScrolls.push(place(u,.981,.035,.077,.047,.045,i%2?Math.PI:0));
    }
  }
  carvedPlinthFace(41.79,26.3,1.95,Math.PI/2);
  carvedPlinthFace(40.70,27.29,2.18,0);
  instances('Rear plinth projecting stone fillets',new THREE.BoxGeometry(1,1,1),sanctumStone,cornerRibs);
  const petalPoints=[];
  for(let i=0;i<=20;i++){
    const a=i/20*Math.PI,u=Math.cos(a),t=.12+.82*Math.sin(a);
    petalPoints.push(new THREE.Vector3(u,1-t,.012+Math.sin(t*Math.PI/2)*.066));
  }
  instances('Rear plinth lotus petal outlines',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(petalPoints),24,.0023,4,false),cornerRelief,cornerPetals);
  const scrollPoints=[];
  for(let i=0;i<=36;i++){
    const a=i/36*Math.PI*2.4,r=1-i/36*.79;
    scrollPoints.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,0));
  }
  const scrollCurve=new THREE.CatmullRomCurve3(scrollPoints);
  instances('Rear plinth curling stone frieze',new THREE.TubeGeometry(scrollCurve,36,.10,5,false),cornerRelief,cornerScrolls);
  box('Rear corner rounded-stone offering slab',42.06,.585,26.29,.43,.07,1.02,cornerDark);
  const offeringStones=[];
  for(let i=0;i<8;i++)offeringStones.push([41.93,.654,25.89+i*.112,.050,.042,.045,0,0,0]);
  for(const z of [25.89,26.674])offeringStones.push([42.075,.65,z,.051,.039,.045,0,0,0]);
  instances('Rear corner ten rounded offering stones',new THREE.SphereGeometry(1,10,6),cornerDark,offeringStones);
  innerPaving('Inner mandapa raised paving',39,24,5.2,6.2,1.06);
  for(const x of [36.65,41.35])for(const z of [21.2,24,26.8])innerColumn('Inner mandapa stone column',x,z,1.06,2.50,.85);
  const mandapaCornice=box('Inner mandapa heavy projecting cornice',39,3.65,24,5.85,.28,6.8,sanctumStone);K.roofs.push(mandapaCornice);
  for(const x of [36.6,41.4])for(const z of [22.55,25.45]){
    for(const dz of [-1.1,0,1.1])box('Inner mandapa grille upright',x,2.18,z+dz,.06,2.08,.06,dark);
    for(const y of [1.18,2.20,3.22])box('Inner mandapa grille rail',x,y,z,.06,.07,2.25,dark);
    for(const sign of [-1,1])K.beam(g,'Inner mandapa X grille',[x,1.2,z-sign*1.1],[x,3.2,z+sign*1.1],.045,dark);
  }
  // User-identified 15.08.04: two separate worn bases precede a shared
  // slab with a row of small upright stones; these are not repeated pedestals.
  const aisleOfferingStone=sanctumStone.clone();aisleOfferingStone.color.set('#77705e');
  for(const [z,w,r] of [[22.0,.34,.13],[22.65,.39,.16]]){
    box('Inner aisle offering stone base',35.85,.595,z,w,.09,w,aisleOfferingStone);
    const profile=[[r,0],[r,.025],[r*.87,.05],[r*.60,.095],[r*.40,.12],[0,.12]];
    mesh('Inner aisle worn rounded offering base',new THREE.LatheGeometry(profile.map(([x,y])=>new THREE.Vector2(x,y)),12),aisleOfferingStone,35.85,.64,z);
  }
  box('Inner left grouped offering slab',35.85,.595,24.15,.47,.09,1.18,aisleOfferingStone);
  const leftOfferingStones=[];
  for(let i=0;i<8;i++){
    const h=.12+(i%3)*.013;
    leftOfferingStones.push([35.76,.64+h/2,23.67+i*.135,.057,h,.057,0,0,0]);
  }
  instances('Inner left row of upright offering stones',new THREE.CylinderGeometry(1,1,1,10),aisleOfferingStone,leftOfferingStones);
  for(const z of [23.70,24.60])box('Inner left offering slab end block',35.97,.695,z,.13,.11,.15,aisleOfferingStone);
  cyl('Inner left low rear offering disc',35.85,.585,25.30,.15,.18,.07,aisleOfferingStone,12);
  // The God room (garbhagriha) is a closed cella inside the grilled enclosure. The family's
  // "Temple inner sanctum, God room" photos: a lit shelf with a small framed image and brass
  // bosses crosses the top of the blue doorway; below it a dark passage between carved
  // guardian figures leads to an inner barred gate, with the lamps and deity behind it.
  // The deity itself is not visible in the photos, so it stays a simple dark-stone form.
  {const cellaStone=sanctumStone.clone();cellaStone.color.set('#8f8a78');
  const cellaDark=mat('#3a332b',.96),idolStone=mat('#151412',.32),flame=new THREE.MeshStandardMaterial({color:'#ffd27a',emissive:'#ff9a2e',emissiveIntensity:3.2,roughness:.6});
  const cF=1.06,cTop=3.5,cz0=24.2,cz1=27.05,cx0=37.2,cx1=40.8;
  for(const [a,b] of [[cx0,38.09],[39.91,cx1]])box('Sanctum cella front wall',(a+b)/2,(cF+cTop)/2,cz0,b-a,cTop-cF,.3,cellaStone,true);
  box('Sanctum cella wall over the doorway',39,3.41,cz0,1.82,.18,.3,cellaStone);
  for(const x of [cx0,cx1])box('Sanctum cella side wall',x,(cF+cTop)/2,(cz0+cz1)/2,.3,cTop-cF,cz1-cz0+.3,cellaStone,true);
  box('Sanctum cella rear wall',39,(cF+cTop)/2,cz1,cx1-cx0,cTop-cF,.3,cellaStone,true);
  box('Sanctum cella stone ceiling',39,cTop-.09,(cz0+cz1)/2,cx1-cx0,.18,cz1-cz0,cellaStone);
  // Soot-darkened inner lining: the chamber reads as depth receding into shadow.
  box('Sanctum cella sooted inner rear face',39,(cF+cTop)/2,cz1-.16,cx1-cx0-.32,cTop-cF,.02,cellaDark);
  for(const x of [cx0+.16,cx1-.16])box('Sanctum cella sooted inner side face',x,(cF+cTop)/2,(cz0+cz1)/2,.02,cTop-cF,cz1-cz0-.3,cellaDark);
  box('Sanctum cella sooted ceiling',39,cTop-.19,(cz0+cz1)/2,cx1-cx0-.32,.02,cz1-cz0-.3,cellaDark);
  box('Sanctum cella worn stone floor',39,cF+.01,(cz0+cz1)/2,cx1-cx0-.32,.02,cz1-cz0-.3,cellaDark);
  // Stepped pedestal (peetha), idol and brass arch (prabhavali) at the back of the cella.
  for(const [y,w,d,h] of [[cF+.12,1.25,.9,.24],[cF+.33,1.05,.74,.18],[cF+.5,.86,.6,.16]])box('Sanctum idol stepped pedestal',39,y,26.45,w,h,d,idolStone);
  const idol=mesh('Sanctum idol dark stone form',new THREE.CapsuleGeometry(.2,.62,6,14),idolStone,39,cF+1.03,26.45);idol.scale.set(1,1,.62);
  mesh('Sanctum idol brass crown',new THREE.ConeGeometry(.15,.32,12),brass,39,cF+1.55,26.45);
  const prabhavali=mesh('Sanctum brass prabhavali arch',new THREE.TorusGeometry(.58,.045,8,28,Math.PI),brass,39,cF+1.0,26.78);prabhavali.scale.y=1.25;
  const garland=mesh('Sanctum marigold garland',new THREE.TorusGeometry(.2,.04,6,18),mat('#e0891e',.9),39,cF+.95,26.3);garland.rotation.x=1.2;garland.scale.x=1.1;
  for(const x of [38.45,39.55]){
    cyl('Sanctum brass oil lamp stand',x,cF+.45,26.1,.035,.05,.9,brass,10);
    cyl('Sanctum brass oil lamp dish',x,cF+.92,26.1,.12,.07,.05,brass,14);
    const f=mesh('Sanctum oil lamp flame',new THREE.SphereGeometry(.04,8,6),flame,x,cF+1.0,26.1);f.scale.y=2.1;
  }
  // Inner barred gate across the passage, in front of the lamps.
  const gateIron=mat('#1d2a2e',.5,{metalness:.35}),gz=25.8;
  for(const y of [cF+.08,cF+.95,cF+1.85])box('Sanctum inner gate rail',39,y,gz,1.5,.06,.05,gateIron);
  for(let i=0;i<=10;i++)box('Sanctum inner gate bar',38.25+i*.15,cF+.97,gz,.025,1.8,.025,gateIron);
  for(const x of [38.2,39.8])box('Sanctum inner gate post',x,cF+.97,gz,.08,1.9,.08,gateIron);
  K.blocker(39,gz,1.7,.1,cF,cF+2);
  // Carved dark-stone guardian figures flank the passage just inside the doorway.
  const guardStone=mat('#2e2a25',.9);
  for(const x of [38.3,39.7]){
    box('Sanctum passage guardian plinth',x,cF+.2,24.75,.34,.4,.5,guardStone);
    const body=mesh('Sanctum passage carved guardian figure',new THREE.CapsuleGeometry(.13,.55,5,10),guardStone,x,cF+.78,24.75);body.scale.set(1,1,.7);
    mesh('Sanctum guardian carved head',new THREE.SphereGeometry(.11,10,8),guardStone,x,cF+1.28,24.75);
  }
  // The lit shelf across the top of the doorway: brass-bossed side panels, a framed
  // image, a small brass pot, and the lamp that makes it glow in the photographs.
  const shelfY=2.62,shelfWood=mat('#2c2419',.8);
  box('Sanctum doorway lit shelf board',39,shelfY,24.5,1.56,.06,.55,shelfWood);
  box('Sanctum doorway shelf front beam',39,shelfY-.09,24.28,1.56,.12,.08,shelfWood);
  for(const x of [38.34,39.66])for(let j=0;j<3;j++){
    box('Sanctum shelf brass tile',x,shelfY+.16+j*.17,24.62,.2,.16,.03,brass);
    const b2=mesh('Sanctum shelf brass boss',new THREE.SphereGeometry(.07,10,7),brass,x,shelfY+.16+j*.17,24.6);b2.scale.z=.45;}
  box('Sanctum shelf framed image frame',39,shelfY+.26,24.66,.52,.44,.03,shelfWood);
  box('Sanctum shelf framed image',39,shelfY+.26,24.645,.44,.36,.01,mat('#efe6d2',.6,{emissive:'#fff1d0',emissiveIntensity:.25}));
  cyl('Sanctum shelf small brass pot',39.4,shelfY+.1,24.5,.06,.04,.14,brass,12);
  const shelfLight=new THREE.PointLight('#fff0c8',3,1.6,2);shelfLight.name='Sanctum shelf lamp';shelfLight.position.set(39,shelfY+.55,24.45);g.add(shelfLight);
  // The lamps' warm glow is the only light on the idol.
  const lampGlow=new THREE.PointLight('#ffae55',7,3.4,2);lampGlow.name='Sanctum oil lamp glow';lampGlow.position.set(39,cF+1.25,25.55);g.add(lampGlow);
  }
  // Brass bosses and colored bulbs on the blue sanctum doorway (user-labelled).
  for(const x of [38.22,39.78])box('Inner sanctum blue doorway jamb',x,2.13,24.16,.27,2.18,.14,vividBlue);
  box('Inner sanctum blue doorway lintel',39,3.21,24.16,1.84,.27,.14,vividBlue);
  const bulbColors=['#ebe5d4','#c66538','#315f97','#bfa64a','#238e8b'];
  for(const x of [38.22,39.78])for(let j=0;j<8;j++){
    const y=1.19+j*.27;
    const boss=mesh('Inner doorway round brass boss',new THREE.SphereGeometry(.103,12,8),brass,x,y,24.05);boss.scale.z=.38;
    mesh('Inner doorway colored bulb',new THREE.SphereGeometry(.038,8,6),mat(bulbColors[j%5],.35),x+(x<39?.20:-.20),y,24.02);
  }
  // "Temple inner sanctum, God room" photos: nine bosses span the whole lintel with a row of
  // coloured bulbs below, and two tall blue barred gate leaves stand open at the frame.
  for(let j=0;j<9;j++){
    const boss=mesh('Inner doorway lintel brass boss',new THREE.SphereGeometry(.103,12,8),brass,38.0+j*.25,3.36,24.05);boss.scale.z=.38;
  }
  for(let j=0;j<8;j++)mesh('Inner doorway lintel colored bulb',new THREE.SphereGeometry(.038,8,6),mat(bulbColors[j%5],.35),38.37+j*.18,3.08,24.02);
  const gateBlue=mat('#1b8fb8',.6);
  for(const side of [-1,1]){
    const leaf=new THREE.Group();leaf.name='Inner sanctum open blue gate leaf';leaf.position.set(39+side*1.02,0,23.95);leaf.rotation.y=side*1.2;g.add(leaf);
    const part=(n,x,y,w,h,m)=>{const b2=new THREE.Mesh(new THREE.BoxGeometry(w,h,.06),m);b2.name=n;b2.position.set(x,y,0);leaf.add(b2);};
    const lw=-side*.9;
    for(const y of [.62,1.9,3.35])part('Inner sanctum gate blue rail',lw/2,y,.9,.12,gateBlue);
    for(const x of [0,lw])part('Inner sanctum gate blue stile',x,2.0,.1,2.9,gateBlue);
    for(let k=1;k<5;k++)part('Inner sanctum gate white tube bar',lw*k/5,2.0,.045,2.7,whiteTrim);
  }
  // User-labelled right side of inner sanctum: large horizontal drum,
  // pale cloth wrap, central red band, exposed rope lacing and smaller drum.
  {
  const drumCloth=mat('#b4aea0'),drumHide=mat('#71543d'),drumRope=mat('#bca47a');
  const drum=mesh('Inner sanctum large suspended drum',new THREE.CylinderGeometry(.52,.52,1.65,24),drumHide,32.45,2.15,24.1);drum.rotation.x=Math.PI/2;
  const wrap=mesh('Inner drum pale cloth wrap',new THREE.CylinderGeometry(.535,.535,1.13,24,1,true),drumCloth,32.45,2.15,24.1);wrap.rotation.x=Math.PI/2;
  const band=mesh('Inner drum red cloth band',new THREE.CylinderGeometry(.544,.544,.18,24,1,true),red,32.45,2.15,24.1);band.rotation.x=Math.PI/2;
  for(let i=0;i<16;i++){
    const a=i*Math.PI/8,b=a+Math.PI/8;
    K.beam(g,'Inner drum end rope lacing',[32.45+Math.cos(a)*.54,2.15+Math.sin(a)*.54,23.29],[32.45+Math.cos(b)*.54,2.15+Math.sin(b)*.54,24.91],.013,drumRope);
  }
  for(const z of [23.5,24.7])K.beam(g,'Inner drum suspension chain',[32.45,3.55,z],[32.45,2.65,z],.025,dark);
  const smallDrum=mesh('Inner smaller orange-covered drum',new THREE.CylinderGeometry(.23,.23,.9,18),mat('#b35b2b'),32.92,2.42,24.1);smallDrum.rotation.x=Math.PI/2;
  for(const z of [23.7,24.5])K.beam(g,'Inner small drum red suspension',[32.7,3.4,z],[32.92,2.62,z],.038,red);
  }
  // 15.08.10 looks back across the entrance platform. Unequal bells hang
  // from long dark cords and exposed iron rings, rather than touching the cords.
  const innerBellBronze=mat('#8e7656',.55,{metalness:.55,side:THREE.DoubleSide});
  const bellSizes=[.27,.18,.25,.20,.32,.28,.24];
  const bellHeights=[2.28,2.35,2.30,2.36,2.39,2.24,2.42];
  const suspensionIron=mat('#504b3e',.83,{metalness:.40});
  for(let j=0;j<7;j++){
    const x=40.8+j*.51,bottom=bellHeights[j],size=bellSizes[j],crown=bottom+size*1.26,ringY=crown+.043;
    bell('Inner hall hanging bronze bell',x,bottom,19.12,size,innerBellBronze);
    const ring=mesh('Inner hall bell suspension iron ring',new THREE.TorusGeometry(.043,.007,6,14),suspensionIron,x,ringY,19.12);ring.rotation.y=(j%3-1)*.24;
    const loopPoints=[new THREE.Vector3(x-.020,ringY+.07,19.12),new THREE.Vector3(x-.014,ringY+.023,19.12),new THREE.Vector3(x,ringY+.014,19.12),new THREE.Vector3(x+.014,ringY+.023,19.12),new THREE.Vector3(x+.020,ringY+.07,19.12)];
    mesh('Inner hall bell cord lower loop',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loopPoints),10,.006,4,false),suspensionIron);
    K.beam(g,'Inner hall long bell suspension',[x,3.67,19.12],[x,ringY+.065,19.12],.010,suspensionIron);
  }

  // 14.58.48: family-identified right edge of the temple, facing the house.
  // Viewed down the road (+Z), the temple (+X) is on the photograph's left.
  // This replaces the estimated roadside annex; the entrance alignment is retained.
  const edgeWhite=K.M.plaster.clone();edgeWhite.color.set('#f4f1eb');
  const balconyRed=mat('#b65f61'),shutterBlue=mat('#536d78',.86),tarpBlue=mat('#168cba');
  floor('Temple road corner raised porch',25.15,.66,9.75,1.62,.22,stoneFloor);
  // Keep the street facade and upper storey; the rear ground floor opens into the hall.
  // Leave the service porch's rear-west corner hollow; this frontage used
  // to be one solid block intersecting its newly recovered interior.
  // User's note with 'temple right side facing -45 degrees from the entrance': the covered
  // hall runs on north through this block to the road frontage. Only the street wall, the
  // lane wall and the part east of the hall (x > 24.2) stay solid.
  box('Temple road corner lower frontage',25.15,1.91,1.6,9.7,3.38,.3,edgeWhite,true);
  box('Temple road corner lower frontage east block',27.1,1.91,3.29,5.8,3.38,3.08,edgeWhite,true);
  box('Temple road corner lower frontage rear',24.59,1.91,5.615,.78,3.38,1.57,edgeWhite,true);
  box('Temple road corner lane-side wall',20.27,1.91,4.075,.14,3.38,4.65,edgeWhite,true);
  floor('Covered hall front extension oxide floor',22.27,4.075,3.86,4.65,.60,hallFloor);
  for(const [x,z,w,d] of [[20.36,4.075,.02,4.65],[24.19,4.075,.02,4.65],[22.27,1.76,3.86,.02]])box('Covered hall front extension blue wall face',x,2.08,z,w,2.96,d,hallBlue);
  box('Covered hall front extension ceiling',22.27,3.60,4.075,3.86,.16,4.65,white);
  box('Covered hall front square blue pier',22.27,2.08,6.4,.38,2.96,.38,hallBlue,true);
  box('Covered hall front pier red foot',22.27,.87,6.4,.40,.54,.40,red);
  box('Covered hall transverse white ceiling beam',22.27,3.36,6.4,3.86,.32,.30,white);
  box('Temple road corner upper storey',25.15,5.15,5.18,9.7,2.90,7.46,edgeWhite,true);
  box('Temple road corner red skirting',25.15,.47,1.42,9.72,.5,.07,red);
  box('Temple road side red skirting',20.26,.47,5.15,.07,.5,7.55,red);
  // 15.22.36 (head-on across the lake): four-metre bays, measured against the 2.72 m shutter.
  for(const x of [20.38,24.4,28.4]){
    box('Temple road porch white pier',x,1.78,.06,.25,3.13,.25,edgeWhite,true);
    box('Temple road porch red foot',x,.48,.04,.27,.52,.29,red);
  }
  // Closed blue-gray rolling shutter with narrow corrugations and a dark header.
  box('Temple road shutter dark frame',22.3,1.63,1.34,2.96,2.92,.10,dark);
  box('Temple road blue rolling shutter',22.3,1.60,1.27,2.72,2.70,.05,shutterBlue);
  const shutterRibs=[];for(let i=0;i<43;i++)shutterRibs.push([22.3,.28+i*.063,1.235,2.72,.021,.028]);
  instances('Temple road shutter horizontal ribs',new THREE.BoxGeometry(1,1,1),greySheet,shutterRibs);
  box('Temple road shutter threshold',22.3,.23,1.19,2.95,.06,.35,oldStone);
  box('Temple road shutter handle',22.3,.39,1.20,.18,.045,.055,dark);
  // Barred windows and open dark wooden shutters, including the balcony corner.
  function edgeWindow(x,y,z,w,h,leaves=true){
    box('Temple road blue window frame',x,y,z,w+.18,h+.16,.14,blue);
    box('Temple road dark window opening',x,y,z-.09,w,h,.03,dark);
    const grille=[];for(let i=0;i<=12;i++)grille.push([x,y-h/2+i*h/12,z-.12,w,.022,.025]);
    instances('Temple road horizontal window bars',new THREE.BoxGeometry(1,1,1),whiteTrim,grille);
    box('Temple road window centre mullion',x,y,z-.15,.065,h+.12,.08,K.M.wood);
    if(leaves)for(const side of [-1,1]){
      const leaf=box('Temple road open timber shutter',x+side*(w*.52+.22),y,z-.39,.085,h+.08,.68,K.M.wood);leaf.rotation.y=side*.42;
    }
  }
  // 15.22.36 / 14.59.21: two narrow barred windows without leaves in the second bay, and one
  // broad blue-framed upper window centred on each bay, its timber leaves open.
  for(const x of [26.1,29.7])edgeWindow(x,1.73,1.28,.95,1.55,false);
  for(const x of [22.4,26.4])edgeWindow(x,5.23,1.30,1.55,1.85);
  floor('Temple road upper balcony',25.15,.64,9.98,1.85,3.46,stoneFloor);
  box('Temple road balcony white soffit',25.15,3.32,.64,10.05,.18,1.9,edgeWhite);
  box('Temple road balcony red fascia',25.15,3.46,-.32,10.05,.25,.16,balconyRed);
  const balusterProfile=[[.067,0],[.067,.07],[.04,.14],[.043,.27],[.074,.33],[.052,.43],[.037,.52],[.059,.63],[.069,.68]].map(p=>new THREE.Vector2(...p));
  const turned=new THREE.LatheGeometry(balusterProfile,10),balconySpindles=[];
  for(let x=20.47;x<30;x+=.245)balconySpindles.push([x,3.67,-.25,1,1,1]);
  instances('Temple road white front balcony balusters',turned,whiteTrim,balconySpindles);
  const sideSpindles=[];for(let z=.03;z<8.9;z+=.245)sideSpindles.push([20.20,3.67,z,1,1,1]);
  instances('Temple road red turned balcony balusters',turned,balconyRed,sideSpindles);
  for(const y of [3.63,4.40]){
    box('Temple road balcony front rail',25.15,y,-.25,10.02,.15,.19,balconyRed);
    box('Temple road balcony side rail',20.20,y,4.34,.19,.15,9.1,balconyRed);
  }
  for(const x of [20.20,24.4,28.4])box('Temple road red balcony post',x,4.01,-.25,.22,.95,.23,balconyRed);
  K.blocker(25.15,-.25,10.02,.20,3.46,4.49);
  K.blocker(20.20,4.34,.2,9.1,3.46,4.49);
  const edgeRoof=box('Temple road corner flat roof',25.13,6.72,4.43,10.05,.21,9.48,edgeWhite);K.roofs.push(edgeRoof);
  // The higher right wing has a red roof-terrace parapet above the entrance canopy.
  for(const y of [6.92,7.59])box('Temple road rooftop red parapet rail',25.15,y,-.25,10.02,.17,.22,balconyRed);
  for(const x of [20.2,22.65,25.15,27.65,30.03])box('Temple road rooftop red parapet pier',x,7.25,-.25,.20,.78,.25,balconyRed);
  const roofSpindles=[];for(let x=20.45;x<29.95;x+=.245)roofSpindles.push([x,6.98,-.25,.88,.80,.88]);
  instances('Temple road rooftop red balusters',turned,balconyRed,roofSpindles);
  for(const x of [20.20,30.03])box('Temple road rooftop side parapet',x,7.24,4.37,.18,.80,9.25,balconyRed);
  // Narrow weathered covering hangs along the road-facing side of the balcony.
  const sideAwning=box('Temple road side sloping eave',19.91,6.40,4.73,.87,.09,9.2,darkRoof);sideAwning.rotation.z=.25;K.roofs.push(sideAwning);
  for(const z of [4.15,6.70,8.46]){
    box('Temple roadside small dark doorway',20.265,1.40,z,.025,2.28,.82,blue);
    box('Temple roadside projecting door canopy',19.98,2.69,z,.74,.12,1.18,edgeWhite);
  }
  box('Temple road rear connector ceiling',22.26,3.56,10.23,4.0,.12,2.65,edgeWhite);
  // The narrow exterior stair is photographed. Its upper connection is estimated.

  steps('Temple exterior side stair',19.52,13.99,1.02,4.70,.04,3.46,'z',21);
  floor('Temple exterior stair top landing',19.52,16.76,1.02,.87,3.46,stoneFloor);
  floor('Temple exterior upper side passage',19.52,18.27,1.02,2.3,3.46,stoneFloor);
  for(const x of [18.95,20.09]){
    K.beam(g,'Temple exterior stair weathered parapet',[x,.83,11.64],[x,4.25,16.34],.15,whiteTrim,.74);
    K.railing(g,'Temple exterior landing guard',x,16.35,x,19.36,3.46,.83,oldStone);
  }
  // A modest low wall closes the far end of the visible landing.
  box('Temple exterior landing end parapet',19.52,3.88,19.40,1.14,.84,.16,white,true);
  box('Temple exterior upper door shadow',20.185,4.52,17.5,.025,2.1,.90,dark);


  // Familiar roadside objects help establish the scale of the small lane.
  // Place the taps beyond the newly identified house-end block, in the green
  // verge seen in 14.58.48. Their distance down the lane remains estimated.
  const roadStone=mat('#99978a');
  box('Temple road tap stone back',13.75,.69,7.2,.19,1.30,1.05,roadStone,true);
  box('Temple road tap basin floor',14.31,.10,7.2,1.15,.16,1.44,oldStone);
  for(const z of [6.48,7.92])box('Temple road tap basin low rim',14.31,.21,z,1.25,.22,.14,roadStone);
  box('Temple road tap basin front rim',14.91,.2,7.2,.14,.21,1.45,roadStone);
  for(const z of [6.90,7.45]){
    K.beam(g,'Temple road water tap spout',[13.86,.87,z],[14.18,.87,z],.035,K.M.metal);
    K.beam(g,'Temple road water tap outlet',[14.18,.87,z],[14.18,.80,z],.039,K.M.metal);
    K.beam(g,'Temple road tap handle',[13.96,.94,z-.075],[13.96,.94,z+.075],.028,whiteTrim);
  }
  // IMG_20130720_180708 resolves the distant red slab as a long washing
  // trough with a row of taps, rather than the previously inferred bench.
  const troughRed=mat('#794038',.96),troughDamp=mat('#575b43',.98);
  box('Temple lane long wash trough back',13.48,.67,11.75,.18,1.18,3.70,troughRed,true);
  box('Temple lane wash trough red coping',13.63,1.30,11.75,.62,.13,3.95,troughRed);
  box('Temple lane wash trough bed',14.04,.12,11.75,1.06,.16,3.76,oldStone);
  box('Temple lane wash trough front wall',14.55,.34,11.75,.13,.53,3.76,roadStone,true);
  box('Temple lane wash trough damp inner face',14.474,.33,11.75,.014,.43,3.55,troughDamp);
  for(const z of [9.92,13.58])box('Temple lane wash trough end wall',14.04,.34,z,1.10,.53,.14,roadStone,true);
  for(let i=0;i<7;i++){
    const z=10.22+i*.51;
    K.beam(g,'Temple lane long trough tap spout',[13.59,.88,z],[13.85,.88,z],.027,K.M.metal);
    K.beam(g,'Temple lane long trough tap outlet',[13.85,.88,z],[13.85,.81,z],.031,K.M.metal);
    K.beam(g,'Temple lane long trough tap cross handle',[13.69,.945,z-.05],[13.69,.945,z+.05],.023,K.M.metal);
  }
  // Moss-darkened open masonry tanks flank the long trough.
  for(const z of [9.35,14.2]){
    box('Temple lane open stone tank bed',13.65,.10,z,.88,.15,.83,troughDamp);
    for(const x of [13.22,14.08])box('Temple lane mossy tank side',x,.46,z,.12,.78,.94,troughDamp,true);
    for(const end of [-.41,.41])box('Temple lane mossy tank end',13.65,.46,z+end,.88,.78,.12,troughDamp,true);
  }
  // IMG_20130720_180715: long salvaged poles stacked on the green edge
  // when looking out of the temple side lane. Placement and lengths inferred.
  const poleBark=K.M.wood.clone();poleBark.color.set('#898474');poleBark.roughness=.98;
  const poleEnd=mat('#8c7c5b',.98);
  const polePoses=[],endPoses=[];
  for(let row=0;row<6;row++)for(let i=0;i<7-row;i++){
    const radius=.075+((i*3+row*5)%5)*.009;
    const x=14.25+i*.235+row*.12,y=.17+row*.17;
    const z=17.6+Math.sin(i*4+row)*.15,length=4.10+((i*7+row*3)%9)*.13;
    polePoses.push([x,y,z,radius,length,radius,Math.PI/2,0,0]);
    for(const sign of [-1,1])endPoses.push([x,y,z+sign*(length/2+.002),radius*.83,.006,radius*.83,Math.PI/2,0,0]);
  }
  const poles=instances('Temple lane stacked salvaged timber poles',new THREE.CylinderGeometry(.84,1,1,9),poleBark,polePoses);
  polePoses.forEach((_,i)=>poles.setColorAt(i,new THREE.Color().setHSL(.10+(i%3)*.013,.10+(i%4)*.025,.60+(i%7)*.048)));
  poles.instanceColor.needsUpdate=true;
  instances('Temple lane weathered pole cut ends',new THREE.CylinderGeometry(1,1,1,9),poleEnd,endPoses);
  // Past the troughs, clear of the house's long temple-side wing (15.22.40).
  K.blocker(14.97,17.6,1.75,5.5,.04,1.20);
  for(const z of [16.55,19.15])box('Temple lane timber stack stone support',14.95,.09,z,1.85,.14,.26,oldStone);

  // Folded blue tarpaulin over low stored bundles, not a billboard photograph.
  const coverPos=[];
  for(let j=0;j<24;j++)for(let i=0;i<12;i++){
    const point=(u,v)=>[19.75+Math.cos(u*Math.PI)*.42,.31+Math.sin(u*Math.PI)*.66+.045*Math.sin(v*23+u*12),6.4+v*2.55];
    const a=point(i/12,j/24),b=point((i+1)/12,j/24),c=point(i/12,(j+1)/24),d=point((i+1)/12,(j+1)/24);
    coverPos.push(...a,...c,...b,...b,...c,...d);
  }
  const coverGeo=new THREE.BufferGeometry();coverGeo.setAttribute('position',new THREE.Float32BufferAttribute(coverPos,3));coverGeo.computeVertexNormals();
  tarpBlue.side=THREE.DoubleSide;mesh('Temple roadside blue tarpaulin',coverGeo,tarpBlue);
  K.blocker(19.75,7.67,.9,2.6,.04,1.12);
  const bike=new THREE.Group();bike.name='Parked motorcycle by temple road';bike.position.set(19.17,.04,4.73);bike.rotation.y=-.12;bike.rotation.z=-.09;g.add(bike);
  for(const z of [-.65,.65]){
    const wheel=mesh('Motorcycle black tyre',new THREE.TorusGeometry(.27,.063,8,18),dark,0,.29,z,bike);wheel.rotation.y=Math.PI/2;
    const hub=mesh('Motorcycle wheel hub',new THREE.CylinderGeometry(.12,.12,.16,12),K.M.metal,0,.29,z,bike);hub.rotation.z=Math.PI/2;
  }
  K.box(bike,'Motorcycle dark seat',0,.81,-.18,.39,.14,.82,dark);
  const tank=mesh('Motorcycle maroon fuel tank',new THREE.SphereGeometry(1,12,8),red,0,.79,.36,bike);tank.scale.set(.22,.23,.30);
  K.beam(bike,'Motorcycle silver fork',[0,.29,.65],[0,1.05,.48],.06,K.M.metal);
  K.beam(bike,'Motorcycle handlebars',[-.36,1.05,.44],[.36,1.05,.44],.04,dark);
  K.beam(bike,'Motorcycle rear frame',[0,.29,-.65],[0,.73,.35],.08,dark);
  K.box(bike,'Motorcycle rear red light',0,.69,-.69,.20,.13,.08,red);
  K.box(bike,'Motorcycle plain pale plate',0,.51,-.74,.25,.13,.025,whiteTrim);
  K.blocker(19.17,4.73,.71,1.9,.04,1.12);

  K.labels?.push({text:'Temple entrance',position:[39,2,-1.5]},{text:'Temple courtyard',position:[39,1,10]},{text:'Inner temple building',position:[39,4.7,21.4]},{text:'Road between house and temple',position:[17,1.2,5]});
  g.traverse(o=>{if(o.isMesh){o.castShadow=!o.userData.noShadow;o.receiveShadow=true;}});
  // 15.03.33 / 15.03.38 (user notes): the passage east of the old shrine is wider, so the
  // east range stands 4 m further east. Wholly-east objects move; long pieces that run
  // across the courtyard (paving, rear circuit, entrance return) stretch to meet it.
  {const DX=4,EDGE=49.5,Z0=5.5,Z1=46.5,b=new THREE.Box3(),m=new THREE.Matrix4(),p=new THREE.Vector3();
   g.updateMatrixWorld(true);
   const inZ=(a,c)=>a>=Z0&&c<=Z1;
   for(const o of [...g.children]){
     if(rearObjects.has(o))continue;
     if(o.isInstancedMesh){let moved=false;for(let k=0;k<o.count;k++){o.getMatrixAt(k,m);p.setFromMatrixPosition(m);
       if(p.x>=EDGE&&p.z>=Z0&&p.z<=Z1){m.elements[12]+=DX;o.setMatrixAt(k,m);moved=true;}}
       if(moved){o.instanceMatrix.needsUpdate=true;o.computeBoundingSphere?.();o.computeBoundingBox?.();}continue;}
     if(!o.isMesh&&!o.isGroup&&!o.isLight)continue;
     if(o.isLight){if(o.position.x>=EDGE&&inZ(o.position.z,o.position.z))o.position.x+=DX;continue;}
     b.setFromObject(o);if(b.isEmpty()||!inZ(b.min.z,b.max.z))continue;
     if(b.min.x>=EDGE)o.position.x+=DX;
     else if(o.isMesh&&b.max.x>53.3&&b.min.x<EDGE&&!o.rotation.y){const w=b.max.x-b.min.x,f=(w+DX)/w;o.scale.x*=f;o.position.x=b.min.x+(o.position.x-b.min.x)*f;}
   }
   for(const c of K.colliders.slice(navStart.colliders)){if(rearNav.has(c)||c.minZ<Z0||c.maxZ>Z1)continue;if(c.minX>=EDGE){c.minX+=DX;c.maxX+=DX;}else if(c.maxX>53.3)c.maxX+=DX;}
   for(const r of [...K.surfaces.slice(navStart.surfaces),...K.ramps.slice(navStart.ramps)]){const x0=r.x-r.w/2,x1=r.x+r.w/2;if(r.z-r.d/2<Z0||r.z+r.d/2>Z1)continue;
     if(rearNav.has(r))continue;if(x0>=EDGE)r.x+=DX;else if(x1>53.3){r.w+=DX;r.x+=DX/2;}}
   for(const l of K.labels.slice(navStart.labels))if(l.position[0]>=EDGE&&l.position[2]>=Z0&&l.position[2]<=Z1)l.position=[l.position[0]+DX,l.position[1],l.position[2]];}
  // 15.01.44 / 15.02.23: the east range's north part (z 6.5-16.5) is a full two-storey
  // block: an upper front wall with a heavy balcony band over the shutter bay, small
  // windows, and a flat red-edged slab. Placed after the east shift, in final coordinates.
  {const x0=55.1,x1=57.9,z0=6.45,z1=16.5,y0=3.7,y1=7.0,zc=(z0+z1)/2,len=z1-z0;
   box('East range upper storey front wall',x0+.11,(y0+y1)/2,zc,.22,y1-y0,len,white);
   box('East range upper storey back wall',x1-.11,(y0+y1)/2,zc,.22,y1-y0,len,white);
   box('East range upper storey end wall',(x0+x1)/2,(y0+y1)/2,z1-.11,x1-x0,y1-y0,.22,white);
   box('East range upper balcony band',x0-.05,4.6,zc,.3,1.2,len,white);
   box('East range upper balcony red coping',x0-.05,5.23,zc,.38,.08,len,red);
   const roof=box('East range upper flat slab',(x0+x1)/2,y1+.08,zc,x1-x0+.6,.16,len+.4,white);K.roofs.push(roof);
   box('East range upper slab red edge',x0-.3,y1+.08,zc,.1,.18,len+.4,red);
   for(const z of [8.3,11.2,14.1]){box('East range upper window blue frame',x0-.01,6.0,z,.05,1.0,1.1,blue);box('East range upper window dark glass',x0-.02,6.0,z,.03,.8,.9,dark);}}
  // 15.19.36 / 15.21.50 / 15.22.36 / 15.23.25 / 15.23.28 / 15.23.32 / 15.25.52 / 15.25.55:
  // the red-balustraded road-corner frontage runs on east to about x 35; the blue-arched
  // projecting portico front starts there. The entrance hall and its paintings stay behind.
  {const W0=30.1,W1=35.0,DX=W1-W0,b3=new THREE.Box3(),m=new THREE.Matrix4(),p=new THREE.Vector3();
   g.updateMatrixWorld(true);
   const front=n=>/^(Entrance|First storey cornice|Front flat)/.test(n);
   const side=n=>/^Entrance (projecting (corner|upper side|balcony side|side)|wash)/.test(n);
   for(const o of [...g.children]){
     if(!front(o.name))continue;
     if(o.isInstancedMesh){let hit=false;for(let k=0;k<o.count;k++){o.getMatrixAt(k,m);p.setFromMatrixPosition(m);
       if(p.x<W1&&p.x>29.5&&p.z<.5){m.makeScale(0,0,0);o.setMatrixAt(k,m);hit=true;}}
       if(hit){o.instanceMatrix.needsUpdate=true;o.computeBoundingSphere?.();}continue;}
     b3.setFromObject(o);if(b3.isEmpty())continue;
     if(side(o.name)&&b3.max.x<30.5){o.position.x+=DX;continue;}
     const upper=/^Entrance upper/.test(o.name);
     if(b3.min.x>=29.5&&b3.max.x<=(upper?36.05:W1+.05)&&b3.max.z<=(upper?-.05:-.2)){g.remove(o);continue;}
     if(o.isMesh&&!o.rotation.y&&b3.min.x<W1-.1&&b3.max.x>W1+.1&&b3.max.z<=2.8&&b3.min.z<-.3){
       const f=(b3.max.x-W1)/(b3.max.x-b3.min.x);o.scale.x*=f;o.position.x=W1+(o.position.x-b3.min.x)*f;}
   }
   // User's note: the green marble side platform must not run out in front of the road
   // frontage; west of the portico it keeps only the part inside the building (z > 1.42).
   for(const o of [...g.children])if(o.name==='Entrance raised side marble platform'){b3.setFromObject(o);if(b3.min.x<30.5){
     const inner=o.clone();inner.scale.z=(6.2-1.42)/8.2;inner.position.z=(6.2+1.42)/2;inner.scale.x=(W1-30)/7.8;inner.position.x=(30+W1)/2;g.add(inner);
     o.scale.x=(37.8-W1)/7.8;o.position.x=(W1+37.8)/2;}}
   for(const r of K.surfaces)if(Math.abs(r.x-33.9)<.01&&Math.abs(r.w-7.8)<.01&&Math.abs(r.z-2.1)<.01){
     r.x=(W1+37.8)/2;r.w=37.8-W1;K.surface((30+W1)/2,(6.2+1.42)/2,W1-30,6.2-1.42,r.y);}
   for(const o of [...g.children])if(/^Upper hall (pale interior wall face|red interior wall skirt)/.test(o.name)){b3.setFromObject(o);if(b3.max.x<36.1)g.remove(o);}
   for(let i=K.colliders.length-1;i>=navStart.colliders;i--){const c=K.colliders[i];
     if(c.minX>29.2&&c.maxX<30.5&&c.minZ>-2.6&&c.maxZ<2.1){c.minX+=DX;c.maxX+=DX;continue;}
     if(c.minX>=29.5&&c.maxX<=36.05&&c.maxZ<=-.05&&c.bottom<6){K.colliders.splice(i,1);continue;}
     if(c.minX<W1-.1&&c.maxX>W1+.1&&c.maxZ<=2.8&&c.minZ<-.3)c.minX=W1;}
   // Road-corner frontage carried across W0..W1: porch piers, balcony, roof and parapet,
   // and an upper front wall set back behind the balcony with shuttered windows.
   const xm=(W0+W1)/2,w=W1-W0;
   for(const x of [32.3,W1-.12]){box('Temple road porch white pier',x,1.78,.06,.25,3.13,.25,edgeWhite,true);box('Temple road porch red foot',x,.48,.04,.27,.52,.29,red);}
   box('Temple road corner lower frontage',xm,1.91,1.3,w,3.38,.24,edgeWhite,true);
   // 15.22.36 / 14.59.21: no windows here; a donor sign board over a small bench.
   box('Temple road donor sign board',33.85,2.6,1.15,2.6,.42,.05,edgeWhite);box('Temple road donor sign red border',33.85,2.6,1.17,2.7,.5,.03,balconyRed);
   box('Temple road bench top',33.0,.95,.95,1.1,.05,.45,K.M.wood);for(const dx of [-.5,.5])for(const dz of [-.18,.18])box('Temple road bench leg',33.0+dx,.8,.95+dz,.05,.3,.05,K.M.wood);
   box('Temple road balcony white soffit',xm,3.32,.4,w,.18,1.4,edgeWhite);
   box('Temple road balcony red fascia',xm,3.46,-.32,w,.25,.16,balconyRed);
   floor('Temple road upper balcony',xm,.4,w,1.4,3.46,stoneFloor);
   for(const y of [3.63,4.4])box('Temple road balcony front rail',xm,y,-.25,w,.15,.19,balconyRed);
   for(const x of [32.3,W1])box('Temple road red balcony post',x,4.01,-.25,.22,.95,.23,balconyRed);
   for(let x=W0+.25;x<W1-.1;x+=.245)box('Temple road white front balcony baluster',x,4.0,-.25,.07,.62,.07,whiteTrim);
   K.blocker(xm,-.25,w,.25,3.46,4.5);
   box('Temple road upper front wall',xm,5.15,1.1,w,2.9,.24,edgeWhite,true);
   for(const x of [30.35,34.3])edgeWindow(x,5.23,.97,1.55,1.85);
   const ext=box('Temple road corner flat roof',xm,6.72,1.2,w,.21,3.1,edgeWhite);K.roofs.push(ext);
   for(const y of [6.92,7.59])box('Temple road rooftop red parapet rail',xm,y,-.25,w,.17,.22,balconyRed);
   for(const x of [32.55,W1])box('Temple road rooftop red parapet pier',x,7.25,-.25,.20,.78,.25,balconyRed);
   for(let x=W0+.25;x<W1-.1;x+=.245)box('Temple road rooftop red baluster',x,7.25,-.25,.07,.6,.07,balconyRed);}
  // 15.04.55 (south down the east passage) and 15.02.17: the passage ends at a two-storey block.
  // Its ground floor is the closed return wall; above it are two windows under a tiled hip roof.
  {const x0=47.9,x1=55.1,z0=2.45,z1=6.45,xm=(x0+x1)/2,zm=(z0+z1)/2;
   box('East passage end block ground floor',xm,1.95,zm-.1,x1-x0,3.7,z1-z0-.2,edgeWhite,true);
   box('East passage end block upper storey',xm,5.45,zm,x1-x0,3.1,z1-z0,edgeWhite,true);
   box('East passage end block red floor band',xm,4.0,z1+.02,x1-x0,.16,.05,balconyRed);
   for(const x of [50.3,52.9]){
     box('East passage end block upper window frame',x,5.35,z1+.03,1.2,1.4,.06,K.M.wood);
     box('East passage end block dark window panes',x,5.35,z1+.05,1.0,1.2,.03,dark);
     box('East passage end block window mullion',x,5.35,z1+.07,.05,1.2,.03,K.M.wood);
   }
   K.hipRoof(g,'East passage end block tiled hip roof',xm,zm,x1-x0+1.0,z1-z0+1.0,7.0,1.35);}
  // 15.03.33 (user): the marker stone stands in the middle of the east passage, not at its wall.
  {const dx=51.8-markerStone.position.x;markerStone.position.x+=dx;K.colliders[markerNav].minX+=dx;K.colliders[markerNav].maxX+=dx;}
  // User's 15.05.42 note: the old inner shrine runs further toward the rear range, leaving
  // less open court behind it. Two more bays (2.78 m): the rear wall and the stones behind
  // it move back, spanning parts stretch, and the last two bays' side details repeat.
  {const DZ=2*1.39,Z0=29.2,b3=new THREE.Box3(),c=new THREE.Vector3();const skylights=[];let roofMap=null;
   g.updateMatrixWorld(true);
   const inShrine=o=>{b3.setFromObject(o);return !b3.isEmpty()&&b3.min.x>30.2&&b3.max.x<49.8&&b3.min.z>18.8&&b3.max.z<30.9;};
   for(const o of [...g.children]){
     if(o.isInstancedMesh)continue;
     if(/^Small circuit (ritual stone foot|rounded stone)/.test(o.name)){b3.setFromObject(o);if(b3.min.z>30.3&&b3.max.z<32.5&&b3.min.x>35)o.position.z+=DZ;continue;}
     if(/^Inner (aisle translucent corrugated skylights|skylight )/.test(o.name)){skylights.push(o);continue;}
     if(!/^(Old inner shrine|Inner sanctum continuous stone aisle)/.test(o.name)||!inShrine(o))continue;
     if(b3.min.z>=Z0){o.position.z+=DZ;continue;}
     if(b3.min.z<20.6&&b3.max.z>29.3){
       const len=b3.max.z-b3.min.z,f=(len+DZ)/len,ry=o.rotation.y;
       if(o.isGroup){roofMap=z=>b3.min.z+(z-b3.min.z)*f;roofMap.lo=b3.min.z;roofMap.f=f;}
       if((o.isMesh||o.isGroup)&&Math.abs(Math.sin(ry))<1e-3)o.scale.z*=f;else if((o.isMesh||o.isGroup)&&Math.abs(Math.cos(ry))<1e-3)o.scale.x*=f;else continue;
       o.updateMatrixWorld(true);const lo=b3.min.z;b3.setFromObject(o);o.position.z+=lo-b3.min.z;continue;}
     if(b3.getCenter(c).z>Z0-DZ&&b3.max.z<Z0+.5&&!/lamp rack/.test(o.name)){const d=o.clone();d.position.z+=DZ;g.add(d);}
   }
   // The aisle skylights sit in the roof, so they follow its stretch.
   if(roofMap){const S=new THREE.Matrix4().makeTranslation(0,0,roofMap.lo).multiply(new THREE.Matrix4().makeScale(1,1,roofMap.f)).multiply(new THREE.Matrix4().makeTranslation(0,0,-roofMap.lo));
     for(const o of skylights){o.updateMatrix();o.matrix.premultiply(S).decompose(o.position,o.quaternion,o.scale);}}
   for(const q of K.colliders){if(q.minX<30.2||q.maxX>49.6||q.maxZ<29.2||q.maxZ>30.9||q.minZ<18.8)continue;
     if(q.minZ>=Z0){q.minZ+=DZ;q.maxZ+=DZ;}else if(q.minZ<20.6)q.maxZ+=DZ;}
   for(const r of [...K.surfaces,...K.ramps]){const lo=r.z-r.d/2,hi=r.z+r.d/2;
     if(r.x>30.2&&r.x<49.6&&lo<20.6&&lo>18.8&&hi>29.3&&hi<30.9){r.d+=DZ;r.z+=DZ/2;}}}
  // The bell bay's court front moves out 1.0 m (user's note with 15.14.44): its plinth,
  // panels, lip, side steps, pier, carved column and arch move; floor, ceiling and west wall stretch.
  {const DZ=1.0,b3=new THREE.Box3();g.updateMatrixWorld(true);
   const inBay=()=>b3.min.x>=35.0&&b3.max.x<=38.1;
   for(const o of g.children){if(o.isInstancedMesh)continue;b3.setFromObject(o);if(b3.isEmpty()||!inBay())continue;
     if(/^(Stair door|Courtyard exit|Great bell|Great bronze|Temple drum|Suspended)/.test(o.name))continue;
     if(b3.min.z>=7.15&&b3.max.z<=8.7){o.position.z+=DZ;continue;}
     if(/^(Courtyard portico raised marble platform|Bell hall ceiling slab|Bell hall white west wall)$/.test(o.name)&&b3.min.z>5.8&&b3.min.z<6.3&&b3.max.z>7.5&&b3.max.z<8){
       const lo=b3.min.z,f=(b3.max.z-lo+DZ)/(b3.max.z-lo);o.scale.z*=f;o.updateMatrixWorld(true);b3.setFromObject(o);o.position.z+=lo-b3.min.z;}}
   for(const c of K.colliders){if(c.minX<35.0||c.maxX>38.1)continue;
     if(c.minZ>=7.15&&c.maxZ<=8.7&&!(c.minX>35.9&&c.maxX<37.2))c.minZ+=DZ,c.maxZ+=DZ;
     else if(c.minZ>5.8&&c.minZ<6.3&&c.maxZ>7.5&&c.maxZ<8)c.maxZ+=DZ;}
   for(const r of [...K.surfaces,...K.ramps]){if(r.x<35.0||r.x>38.0)continue;const lo=r.z-r.d/2,hi=r.z+r.d/2;
     if(lo>=7.15&&hi<=8.7){r.z+=DZ;continue;}
     if(lo>6.1&&lo<6.3&&hi>7.7&&hi<7.9){r.d+=DZ;r.z+=DZ/2;}}}
  // User's notes (west of the inner sanctum front): the front building starts at the old
  // shrine's red wall line (x 31.7), not 2 m further west, and that red wall runs on north to
  // the facade so there is no opening through which the sanctum shows.
  {const XW=31.7,Z0=14.2,Z1=20.6,b3=new THREE.Box3();g.updateMatrixWorld(true);
   for(const o of [...g.children]){
     if(o.isInstancedMesh||!/^(Inner |Maroon pierced transom)/.test(o.name))continue;
     b3.setFromObject(o);if(b3.isEmpty()||b3.min.x>=XW-.02||b3.min.z<Z0||b3.max.z>Z1)continue;
     if(b3.max.x<=XW+.12){g.remove(o);continue;}
     if(!o.isMesh||Math.abs(Math.sin(o.rotation.y))>1e-3)continue;
     const hi=b3.max.x,f=(hi-XW)/(hi-b3.min.x);o.scale.x*=Math.abs(Math.cos(o.rotation.y))>.5?f:1;
     o.updateMatrixWorld(true);b3.setFromObject(o);o.position.x+=XW-b3.min.x;}
   for(let i=K.colliders.length-1;i>=0;i--){const c=K.colliders[i];if(c.minX>=XW-.02||c.minZ<Z0||c.maxZ>Z1||c.maxX<28.9)continue;
     if(c.maxX<=XW+.12)K.colliders.splice(i,1);else c.minX=XW;}
   for(const list of [K.surfaces,K.ramps])for(let i=list.length-1;i>=0;i--){const r=list[i],lo=r.x-r.w/2,hi=r.x+r.w/2;
     if(lo>=XW-.02||r.z-r.d/2<Z0||r.z+r.d/2>Z1||hi<28.9)continue;
     if(hi<=XW+.12)list.splice(i,1);else{r.w=hi-XW;r.x=(hi+XW)/2;}}
   box('Old inner shrine red side wall north run',31.76,2.1,(16.62+19.8)/2,.36,3.1,19.8-16.62,wornRed,true);
   box('Old inner shrine dark continuous sill north run',31.53,.63,(16.62+19.8)/2,.25,.2,19.8-16.62,stainedRecess);}
  return g;
}
