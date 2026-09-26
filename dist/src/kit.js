import * as THREE from 'three';

let seed=1827;
function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function canvasTexture(kind, color){
  const c=document.createElement('canvas');c.width=c.height=512;
  const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,512,512);
  const im=ctx.getImageData(0,0,512,512),d=im.data;
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const i=(y*512+x)*4,n=(random()-.5)*13+Math.sin(x*.034)*Math.sin(y*.052)*4;
    for(let k=0;k<3;k++)d[i+k]=Math.max(0,Math.min(255,d[i+k]+n));
  }
  ctx.putImageData(im,0,0);
  if(kind==='tile'){
    // Aligned Mangalore tile channels, with a raised rippled lip on each course.
    for(let row=0;row<16;row++)for(let col=0;col<16;col++){
      const x=col*32,y=row*32,l=31+random()*7;
      ctx.fillStyle=`hsl(27 11% ${l}%)`;ctx.fillRect(x,y,32,32);
      const gr=ctx.createLinearGradient(x,y,x+32,y);gr.addColorStop(0,'#14171588');gr.addColorStop(.24,'#c2b59b77');gr.addColorStop(.52,'#ddd0b744');gr.addColorStop(.84,'#181b1999');gr.addColorStop(1,'#14171588');ctx.fillStyle=gr;ctx.fillRect(x,y,32,32);
      ctx.strokeStyle='#c0b39a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y+29);ctx.quadraticCurveTo(x+16,y+22,x+32,y+29);ctx.stroke();
      ctx.strokeStyle='#232923';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y+32);ctx.quadraticCurveTo(x+16,y+26,x+32,y+32);ctx.stroke();
      if(random()<.16){ctx.fillStyle='#72785855';ctx.fillRect(x+5,y+3,17,10);}
    }
  }else if(kind==='wood'){
    for(let i=0;i<380;i++){
      ctx.strokeStyle=i%3?'#13141010':'#bdaa8412';ctx.lineWidth=random()*2+.3;ctx.beginPath();let x=random()*512;ctx.moveTo(x,0);
      for(let y=0;y<=512;y+=32)ctx.lineTo(x+Math.sin(y*.015+x)*4,y);ctx.stroke();
    }
  }else if(kind==='stone'){
    for(let y=0;y<512;y+=128)for(let x=-128;x<512;x+=256){const off=(y/128%2)*128;ctx.strokeStyle='#161e1980';ctx.lineWidth=4;ctx.strokeRect(x+off,y,256,128);ctx.strokeStyle='#b4b6a033';ctx.lineWidth=2;ctx.strokeRect(x+off+3,y+3,250,121);}
  }else if(kind==='plaster'){
    for(let i=0;i<90;i++){ctx.fillStyle=i%3?'#676f6309':'#f0e1bd0b';ctx.beginPath();ctx.ellipse(random()*512,random()*512,random()*50,random()*15,random()*Math.PI,0,Math.PI*2);ctx.fill();}
  }else if(kind==='red'){
    for(let i=0;i<100;i++){ctx.fillStyle='#c8926820';ctx.fillRect(random()*512,random()*512,random()*80,1);}
  }
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}

export function createKit(){
  const defs={plaster:['plaster','#d3d2ba'],aqua:['plaster','#71a9a3'],red:['red','#833d30'],wood:['wood','#43372a'],blue:['wood','#277b91'],tile:['tile','#61513e'],stone:['stone','#5c6256'],paleStone:['stone','#b8b8a1'],cream:['plaster','#ded7bb'],pink:['plaster','#ba9690'],earth:['plain','#7a4c3a'],grass:['plain','#677344']};
  const M={};for(const [n,[kind,color]]of Object.entries(defs)){
    const t=canvasTexture(kind,color);M[n]=new THREE.MeshStandardMaterial({map:t,bumpMap:t,bumpScale:kind==='tile'?.09:kind==='wood'?.012:.006,roughness:kind==='red'?.62:.91});
  }
  M.tile.color.setRGB(.87,.85,.80);
  Object.assign(M,{gold:new THREE.MeshStandardMaterial({color:0xb99548,metalness:.66,roughness:.38}),leaf:new THREE.MeshStandardMaterial({color:0x4f6b31,roughness:.86,side:THREE.DoubleSide}),metal:new THREE.MeshStandardMaterial({color:0x616258,metalness:.65,roughness:.6}),black:new THREE.MeshStandardMaterial({color:0x242b25,roughness:.84}),glass:new THREE.MeshStandardMaterial({color:0xa0b6aa,roughness:.15,transparent:true,opacity:.4}),water:new THREE.MeshStandardMaterial({color:0x377651,roughness:.2,metalness:.28})});
  const K={M,colliders:[],surfaces:[],ramps:[],roofs:[],labels:[]};
  const resolve=m=>typeof m==='string'?M[m]:m;
  function finish(g,geom,mat,name,x=0,y=0,z=0){const mesh=new THREE.Mesh(geom,resolve(mat));mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;}
  // Materials flagged userData.worldAnchored (weathering maps) take the box's
  // position into account, so stains run continuously across adjoining boxes.
  function worldUV(geom,ox=0,oy=0,oz=0){const p=geom.attributes.position,n=geom.attributes.normal,uv=geom.attributes.uv;if(!uv||!n)return geom;for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),x=p.getX(i)+ox,y=p.getY(i)+oy,z=p.getZ(i)+oz;if(ny>.5)uv.setXY(i,x*.5,z*.5);else if(nx>.5)uv.setXY(i,z*.5,y*.5);else uv.setXY(i,x*.5,y*.5);}return geom;}
  K.blocker=(x,z,w,d,bottom,top)=>K.colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,bottom,top});
  K.surface=(x,z,w,d,y)=>K.surfaces.push({x,z,w,d,y});
  K.ramp=(x,z,w,d,axis,lowY,highY)=>K.ramps.push({x,z,w,d,axis,lowY,highY});
  K.box=(g,name,x,y,z,w,h,d,mat,solid=false)=>{const anchored=resolve(mat)?.userData?.worldAnchored;const m=finish(g,anchored?worldUV(new THREE.BoxGeometry(w,h,d),x,y,z):worldUV(new THREE.BoxGeometry(w,h,d)),mat,name,x,y,z);if(solid)K.blocker(x,z,w,d,y-h/2,y+h/2);return m;};
  K.cylinder=(g,name,x,y,z,rt,rb,h,mat,segments=12,solid=false)=>{const m=finish(g,new THREE.CylinderGeometry(rt,rb,h,segments),mat,name,x,y,z);if(solid)K.blocker(x,z,Math.max(rt,rb)*2,Math.max(rt,rb)*2,y-h/2,y+h/2);return m;};
  K.beam=(g,name,a,b,w,mat,d=w)=>{const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);const m=finish(g,worldUV(new THREE.BoxGeometry(w,delta.length(),d)),mat,name);m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;};
  K.column=(g,name,x,z,b,h,r=.16,mat='wood')=>{
    const sub=new THREE.Group();sub.name=name;g.add(sub);
    K.box(sub,name+' foot',x,b+.08,z,r*2.8,.16,r*2.8,mat);
    K.cylinder(sub,name+' base',x,b+.22,z,r*1.15,r*1.5,.14,mat,12);
    K.cylinder(sub,name+' shaft',x,b+h*.48,z,r*.86,r,h*.73,mat,8);
    for(let j=0;j<5;j++)K.cylinder(sub,name+' carved band',x,b+h-.42+j*.07,z,r*(1.05+Math.sin(j/4*Math.PI)*.45),r*(1.05+Math.sin(j/4*Math.PI)*.45),.048,mat,8);
    K.box(sub,name+' capital',x,b+h-.07,z,r*3,.14,r*3,mat);
    K.blocker(x,z,r*2.2,r*2.2,b,b+h);return sub;
  };
  K.railing=(g,name,x1,z1,x2,z2,b,h,mat='blue')=>{
    const sub=new THREE.Group();sub.name=name;g.add(sub);const length=Math.hypot(x2-x1,z2-z1),count=Math.ceil(length/.28);
    K.beam(sub,name+' top',[x1,b+h,z1],[x2,b+h,z2],.075,mat,.095);K.beam(sub,name+' bottom',[x1,b+.17,z1],[x2,b+.17,z2],.055,mat,.075);
    for(let i=0;i<=count;i++){const t=i/count;K.box(sub,name+' baluster',x1+(x2-x1)*t,b+h/2,z1+(z2-z1)*t,.043,h,.043,mat);}
    K.blocker((x1+x2)/2,(z1+z2)/2,Math.max(.08,Math.abs(x2-x1)),Math.max(.08,Math.abs(z2-z1)),b,b+h);return sub;
  };
  function roof(g,name,x,z,w,d,eave,rise,mat,hip){
    const sub=new THREE.Group();sub.name=name;g.add(sub);const p=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2]];let faces;
    if(!hip||w>=d){const inset=hip?Math.min(d*.45,w*.4):0;p.push([-w/2+inset,rise,0],[w/2-inset,rise,0]);faces=[[0,4,5],[0,5,1],[1,5,2],[2,5,4],[2,4,3],[3,4,0]];}
    else{const inset=Math.min(w*.45,d*.4);p.push([0,rise,-d/2+inset],[0,rise,d/2-inset]);faces=[[0,4,1],[1,4,5],[1,5,2],[2,5,3],[3,5,4],[3,4,0]];}
    const pos=[],uv=[];for(const face of faces)for(const i of face){const v=p[i];pos.push(v[0],v[1],v[2]);uv.push(v[0]*.36,v[2]*.36);}
    const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geom.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geom.computeVertexNormals();
    const material=resolve(mat).clone();material.side=THREE.DoubleSide;const m=finish(sub,geom,material,name+' tiles',x,eave,z);
    for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4];K.beam(sub,name+' fascia',[x+a[0],eave-.08,z+a[2]],[x+b[0],eave-.08,z+b[2]],.15,'wood',.12);}
    K.beam(sub,name+' ridge',[x+p[4][0],eave+rise+.025,z+p[4][2]],[x+p[5][0],eave+rise+.025,z+p[5][2]],.15,mat,.17);
    K.roofs.push(sub);return sub;
  }
  K.hipRoof=(g,n,x,z,w,d,e,r,m='tile')=>roof(g,n,x,z,w,d,e,r,m,true);
  K.gableRoof=(g,n,x,z,w,d,e,r,m='tile')=>roof(g,n,x,z,w,d,e,r,m,false);
  return K;
}
