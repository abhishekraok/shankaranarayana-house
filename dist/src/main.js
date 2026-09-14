import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Reflector} from '../vendor/Reflector.js';
import {createKit} from './kit.js';
import {buildHouse} from './house.js';
import {buildTemple} from './temple.js';
import {buildLandscape} from './landscape.js';
import {createPhotoTour} from './tour.js';

const $=id=>document.getElementById(id);
const K=createKit(),scene=new THREE.Scene();
scene.background=new THREE.Color(0xa3b7b2);scene.fog=new THREE.FogExp2(0xa3b7b2,.005);
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){$('loading').hidden=true;$('error').hidden=false;$('error').textContent='This browser could not start 3D graphics. Please open the walkthrough in Chrome or Edge with hardware acceleration enabled.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.setClearColor(0xb0c2bd);
$('world').appendChild(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','3D scene. Click to look around; WASD or arrow keys to walk.');
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.06,400);camera.position.set(-8,4.2,-20);camera.lookAt(1,2.1,5);
scene.add(new THREE.HemisphereLight(0xdcebea,0x656048,1.5));
scene.add(new THREE.AmbientLight(0xdbe3df,.7));
const sun=new THREE.DirectionalLight(0xffefce,2.5);sun.position.set(-35,65,-24);sun.target.position.set(12,0,0);scene.add(sun,sun.target);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-70,right:70,top:65,bottom:-65,near:1,far:160});sun.shadow.normalBias=.04;sun.shadow.bias=-.00015;sun.shadow.radius=3;
const fill=new THREE.DirectionalLight(0xc1dce0,.4);fill.position.set(35,20,35);scene.add(fill);
const sky=new THREE.Mesh(new THREE.SphereGeometry(220,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color('#78a1b6')},bottom:{value:new THREE.Color('#c6d5cc')}},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 p;uniform vec3 top;uniform vec3 bottom;void main(){float h=pow(max(normalize(p).y,0.),.48);gl_FragColor=vec4(mix(bottom,top,h),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' }));scene.add(sky);

// The ground is cut out below the lake rather than covering its descending banks.
const terrain=new THREE.Group();terrain.name='Ground';scene.add(terrain);
function ground(x,z,w,d){const m=K.box(terrain,'Earth',x,-.22,z,w,.44,d,'earth');m.receiveShadow=true;}
ground(-80,0,124,240);ground(108,0,108,240);ground(18,-83,72,80);
// Leave an actual opening under the small forecourt pond (23..28, -3..0).
ground(18,-7.5,72,9);ground(18,60,72,120);ground(2.5,-1.5,41,3);ground(41,-1.5,26,3);
const landscape=buildLandscape(K);scene.add(landscape);const house=buildHouse(K);scene.add(house);const temple=buildTemple(K);scene.add(temple);

const waterShader={uniforms:{tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()},color:{value:new THREE.Color('#547a42')},time:{value:0},eye:{value:camera.position}},vertexShader:'uniform mat4 textureMatrix;varying vec4 vUv;varying vec3 wp;void main(){vUv=textureMatrix*vec4(position,1.);vec4 w=modelMatrix*vec4(position,1.);wp=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',fragmentShader:`uniform sampler2D tDiffuse;uniform float time;uniform vec3 eye;uniform vec3 color;varying vec4 vUv;varying vec3 wp;
void main(){vec2 q=wp.xz;vec4 uv=vUv;float a=sin(q.x*1.8+q.y*.4+time*.7),b=cos(q.y*2.5-q.x*.5+time*.5);uv.xy+=vec2(a,b)*.0016*uv.w;vec3 reflection=texture2DProj(tDiffuse,uv).rgb;float grazing=pow(1.-max(normalize(eye-wp).y,0.),2.);vec3 lake=color*(.82+.12*sin(q.x*.3+q.y*.7));gl_FragColor=vec4(mix(lake,reflection,.25+grazing*.42),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`};
const water=new Reflector(new THREE.PlaneGeometry(72,31),{color:0x497a36,textureWidth:768,textureHeight:768,multisample:0,clipBias:.004,shader:waterShader});const waterMat=water.material;water.rotation.x=-Math.PI/2;water.position.set(18,-.75,-27.5);water.name='Reflective lake water';scene.add(water);

const orbit=new OrbitControls(camera,renderer.domElement);orbit.enabled=false;orbit.enableDamping=true;orbit.dampingFactor=.09;orbit.target.set(8,1,-7);orbit.minDistance=4;orbit.maxDistance=145;orbit.maxPolarAngle=Math.PI*.48;orbit.minPolarAngle=.04;
orbit.enableZoom=false;
const keys=new Set();let mode='tour',entered=true,drag=false,lastMouse=null,yaw=Math.PI,pitch=0,feet=0,speed=2.6,sensitivity=1,lifted=false,walkPosition=new THREE.Vector3(0,1.62,-2),lastSafe=new THREE.Vector3(0,1.62,-2),currentPhoto='house',wheelTravel=0,tourTime=0,tourPaused=false,tourLabel='Across the lake';
const directions={ArrowUp:'KeyW',ArrowDown:'KeyS',ArrowLeft:'KeyA',ArrowRight:'KeyD'};
const destinations={

 front:{p:[0,0,-2],target:[0,1.6,9]},courtyard:{p:[-6.8,.035,12.6],target:[-4.4,1.3,7.5]},kitchen:{p:[-9.7,.45,15.9],target:[-10.9,1.5,17.1]},upstairs:{p:[-2.65,3.85,1],target:[-2.65,4.9,-18]},lake:{p:[0,0,-8.7],target:[-4,-.2,-30]},pavilion:{p:[28,-.29,-43.3],target:[28,1,-40]},temple:{p:[39,0,-6.5],target:[39,3.7,5]},templecourt:{p:[30,.1,14],target:[41,2,17]}

};
// Family correction: all four veranda views are BEFORE the main door at z=2.05.
// Entering faces +Z, so the photographer's left is +X; the room wall is on the right.
const photos={house:{url:'house-front.jpg',caption:'September 2011 · The front of the house · 15.28.36',p:[-1.4,.051,-7.8],target:[-.4,3.5,.4],fov:96},veranda:{url:'veranda.jpg',caption:'September 2011 · Before the main door, left veranda · 14.56.30',p:[0,.45,1.18],target:[4.3,1.70,.35],fov:72},lake:{url:'lake.jpg',caption:'September 2011 · The lake, pavilion and temple',p:[-20,2,-42],target:[20,2,0]},temple:{url:'temple-entrance.jpg',caption:'September 2011 · Temple entrance, from slightly left · 15.19.41',p:[42.3,.051,-6.5],target:[38.8,3.85,-1.2],fov:84}};
photos.houseleft={url:'house-front-left.jpg',caption:'September 2011 · Front of the house, looking left towards the temple · 15.28.45',p:[-2.2,.051,-7.6],target:[40,3.2,-1.5],fov:76};
destinations.house=photos.house;destinations.houseleft=photos.houseleft;
photos.verandaleft={url:'veranda-left-passage.jpg',caption:'September 2011 · Before the main door, along the left walkway · 14.56.07',p:[1.90,.455,-.25],target:[4.20,1.68,1.05],fov:68};
photos.verandaseat={url:'veranda-left-seat.jpg',caption:'September 2011 · Before the main door, left sitting bay · 14.56.22',p:[.05,.45,1.32],target:[4.10,1.65,1.15],fov:72};
photos.verandaright={url:'veranda-right.jpg',caption:'September 2011 · Before the main door, right sitting bay · 14.56.47',p:[-.05,.45,1.32],target:[-4.10,1.65,1.15],fov:72};
for(const key of ['veranda','verandaleft','verandaseat','verandaright'])destinations[key]=photos[key];
photos.courtyard={url:'courtyard.jpg',caption:'September 2011 · The Tulsi and courtyard',p:[-3.4,.035,6.85],target:[-5.0,1.2,11]};
photos.godroom={url:'god-room.jpg',caption:'September 2011 · Just inside the house, in front of the God room',p:[0,.45,4.45],target:[0,1.80,6.92],fov:92};
photos.laneleft={url:'lane-left.jpg',caption:'September 2011 · Front of the house, left towards the adjacent building',p:[8,0,-7],target:[60,3.5,-5],fov:54};
photos.laneright={url:'lane-right.jpg',caption:'September 2011 · Front of the house, right away from the temple',p:[-7,.051,-5],target:[-42,2,-6.7],fov:60};
photos.templeleft={url:'temple-upper-left.jpg',caption:'September 2011 · Temple upper gallery, looking left at the inner building',p:[44.4,4.08,5.4],target:[46,2.6,16.5],fov:62};
photos.templecenter={url:'temple-upper-center.jpg',caption:'September 2011 · Temple upper gallery, facing the inner building',p:[39,4.08,5.4],target:[39,3.3,16.5],fov:62};
photos.templeright={url:'temple-upper-right.jpg',caption:'September 2011 · Temple upper gallery, looking right at the inner building',p:[33.5,4.08,5.4],target:[31,3.6,18],fov:62};
photos.templeroad={url:'temple-side-road.jpg',caption:'September 2011 · Small road between the house and the temple, beside its right edge',p:[20.5,.051,-6.5],target:[17.5,2.4,11.5],fov:72};
photos.templehouse={url:'temple-towards-house.jpg',caption:'September 2011 · In front of the temple, looking right towards the house',p:[23,.051,-3],target:[-30,1.8,-6],fov:80};
destinations.templehouse=photos.templehouse;
photos.templeoldwall={url:'temple-old-wall.jpg',caption:'September 2011 · The older inner wall and standing stone',p:[49.9,.1,22.4],target:[46.4,1.85,28.7],fov:76};
photos.templeoutershrines={url:'temple-outer-shrines.jpg',caption:'September 2011 · The three vaulted shrine bays',p:[46.5,.1,32.7],target:[52.2,2.95,32.2],fov:76};
photos.templeouterrear={url:'temple-outer-rear.jpg',caption:'September 2011 · Around the rear of the inner building',p:[40,.1,33.0],target:[26.1,1.9,35.2],fov:68};
photos.templeouterreturn={url:'temple-outer-return.jpg',caption:'September 2011 · Looking back along the outer circuit',p:[49.8,.1,28.7],target:[48.9,1.9,9.5],fov:68};
for(const key of ['templeoldwall','templeoutershrines','templeouterrear','templeouterreturn'])destinations[key]=photos[key];
destinations.templeroad=photos.templeroad;
destinations.godroom=photos.godroom;destinations.laneleft=photos.laneleft;destinations.laneright=photos.laneright;
destinations.templeleft=photos.templeleft;destinations.templecenter=photos.templecenter;destinations.templeright=photos.templeright;
photos.templedoor={url:'temple-doorway.jpg',caption:'September 2011 · Just before the temple entrance door · 15.15.51',p:[39,.20,3.05],target:[39,2.18,6.1],fov:84};
photos.adjacent={url:'temple.jpg',caption:'September 2011 · The building adjacent to the temple · 15.19.57',p:[51,.047,-5],target:[60,5,-5],fov:75};
destinations.temple=photos.temple;destinations.templedoor=photos.templedoor;
photos.lakeleft={url:'lakeleft.jpg',caption:'September 2011 · Across the lake, left of the temple · 15.22.33',p:[17.1,1.08,-45.4],target:[44, 2.3, -2],fov:60};
photos.lakemiddle={url:'lakemiddle.jpg',caption:'September 2011 · Across the lake, right side of the temple · 15.22.36',p:[17.1,1.08,-45.4],target:[25, 2.3, -1],fov:54};
photos.lakehouse={url:'lakehouse.jpg',caption:'September 2011 · Across the lake, the house · 15.22.40',p:[17.1,1.08,-45.4],target:[1, 2.8, 1],fov:50};
for(const key of ['lakeleft','lakemiddle','lakehouse'])destinations[key]=photos[key];
photos.templepicturesleft={url:'temple-ganesh-shiva.jpg',caption:'September 2011 · Ganesh and Shiva, left of the entrance · 15.14.30',p:[42.8,.602,3.25],target:[43.3,2,5.82],fov:76};
photos.templevishnu={url:'temple-vishnu.jpg',caption:'September 2011 · Vishnu, right of the entrance · 15.15.11',p:[35.5,.602,3.25],target:[35.65,2,5.82],fov:58};
photos.templehanuman={url:'temple-hanuman.jpg',caption:'September 2011 · Hanuman, far right · 15.15.17',p:[33.8,.602,3.25],target:[33.8,2,5.82],fov:58};
photos.templepond={url:'temple-front-pond.jpg',caption:'September 2011 · Small pond in front of the temple · 15.20.01',p:[25.5,.051,-4.1],target:[25.5,-.25,-1.3],fov:78};
photos.templeacross={url:'temple-across-lake.jpg',caption:'September 2011 · Temple frontage from across the lake · 15.22.12',p:[42,0,-45.4],target:[36,3.6,1],fov:58};
for(const key of ['templepicturesleft','templevishnu','templehanuman','templepond','templeacross'])destinations[key]=photos[key];
photos.shop={url:'shop-temple-side.jpg',caption:'September 2011 · Shop beside the adjacent building, from outside the temple · 15.20.13',p:[47,0,-8.7],target:[61.4,2.3,-24.5],fov:74};
photos.shoplake={url:'shop-across-lake.jpg',caption:'September 2011 · Shop and adjacent building from across the lake · 15.28.26',p:[-20.2,0,-27],target:[61.5,3.2,-19.5],fov:48};
destinations.shop=photos.shop;destinations.shoplake=photos.shoplake;
destinations.lakefence={p:[9.8,0,-8],target:[56,3.2,-7],fov:74};
photos.upperahead={url:'house-upper-ahead.jpg',caption:'September 2011 · House upstairs, directly ahead · 15.30.09',p:[-1,3.85,.72],target:[-2.65,1.6,-55],fov:64};
photos.upperright={url:'house-upper-right.jpg',caption:'September 2011 · Same upstairs position, looking right · 15.30.06',p:[-1,3.85,.72],target:[15,1.5,-43],fov:68};
destinations.upstairs=photos.upperahead;destinations.upperahead=photos.upperahead;destinations.upperright=photos.upperright;
destinations.upperfarther={p:[-1,3.85,.72],target:[52,1.4,-35],fov:70};
destinations.houseexitleft={p:[9.2,.051,-5.3],target:[-40,2.8,-6.8],fov:68};
destinations.templeentryreturn={p:[48.5,.1,10.7],target:[50.7,2.0,6.4],fov:75};
const tour=createPhotoTour(photos);

function inside(x,z,r){return Math.abs(x-r.x)<=r.w/2+.001&&Math.abs(z-r.z)<=r.d/2+.001;}
function terrainY(x,z){if(x>23&&x<28&&z>-3&&z<0)return -1.05;return x>-18&&x<54&&z>-43&&z<-12?-8:0;}
function supportY(x,z,previous){let best=terrainY(x,z);for(const s of K.surfaces){if(inside(x,z,s)&&s.y<=previous+.38&&s.y>best)best=s.y;}
 for(const r of K.ramps)if(inside(x,z,r)){let t=r.axis.endsWith('x')?(x-(r.x-r.w/2))/r.w:(z-(r.z-r.d/2))/r.d;if(r.axis.startsWith('-'))t=1-t;const h=THREE.MathUtils.lerp(r.lowY,r.highY,THREE.MathUtils.clamp(t,0,1));if(h<=previous+.38&&h>best)best=h;}
 return best;
}
function collision(x,z,y){const radius=.23;return K.colliders.some(c=>x+radius>c.minX&&x-radius<c.maxX&&z+radius>c.minZ&&z-radius<c.maxZ&&y+1.57>c.bottom+.025&&y+.12<c.top);}
function blockedRise(x,z,y){return K.surfaces.some(s=>inside(x,z,s)&&s.y>y+.38&&s.y<y+1.57);}
function lookAt(target){camera.lookAt(new THREE.Vector3(...target));const e=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ');yaw=e.y;pitch=e.x;}
function syncLook(){camera.quaternion.setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));}
function setLens(fov=58){if(Math.abs(camera.fov-fov)>.01){camera.fov=fov;camera.updateProjectionMatrix();}}
function updateModeUI(){ $('walk-btn').classList.toggle('active',mode==='walk');$('orbit-btn').classList.toggle('active',mode==='orbit');$('tour-btn').classList.toggle('active',mode==='tour');$('mode-label').textContent={walk:'WALK',orbit:'AERIAL',tour:'TOUR',fly:'FREE FLIGHT'}[mode];$('crosshair').style.display=mode==='walk'||mode==='fly'?'block':'none';$('tour-controls').hidden=mode!=='tour';$('tour-pause').textContent=tourPaused?'Resume':'Pause';document.body.dataset.mode=mode; }
function release(){keys.clear();wheelTravel=0;if(document.pointerLockElement)document.exitPointerLock();}
function capture(){if(!['walk','fly'].includes(mode))return;renderer.domElement.focus();try{const p=renderer.domElement.requestPointerLock?.();p?.catch(()=>{});}catch{/* Drag-to-look remains available without pointer lock. */}}
function startTour(){release();mode='tour';orbit.enabled=false;entered=true;tourPaused=false;$('welcome').hidden=true;updateModeUI();}
function takeFlight(){if(mode==='tour'){release();mode='fly';orbit.enabled=false;const e=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ');yaw=e.y;pitch=e.x;updateModeUI();}}
function setMode(value){if(value===mode&&entered)return;const wasWalking=entered&&mode==='walk';release();entered=true;$('welcome').hidden=true;setLens();
 if(value==='orbit'){if(wasWalking)walkPosition.copy(camera.position);mode='orbit';orbit.enabled=true;camera.position.set(54,62,-68);orbit.target.set(10,0,-8);orbit.update();}
 else{mode='walk';orbit.enabled=false;camera.position.copy(walkPosition);feet=camera.position.y-1.62;lookAt([camera.position.x, camera.position.y, camera.position.z+5]);}updateModeUI();
}
function teleport(dest,captureMouse=false){release();entered=true;$('welcome').hidden=true;mode='walk';orbit.enabled=false;feet=dest.p[1];camera.position.set(dest.p[0],feet+1.62,dest.p[2]);const h=supportY(camera.position.x,camera.position.z,feet);if(h>-5)feet=h;camera.position.y=feet+1.62;setLens(dest.fov);lookAt(dest.target);const photoKey=Object.keys(photos).find(key=>photos[key]===dest);if(photoKey)showPhoto(photoKey);walkPosition.copy(camera.position);lastSafe.copy(camera.position);updateModeUI();if(captureMouse)capture();}
// Phone toolbar disclosure: collapsed initially, dismissed after choosing an action.
const compactControls=matchMedia('(max-width:740px), (max-width:950px) and (max-height:500px)');
const controlsToggle=$('controls-toggle'),exploreControls=$('explore-controls');
function setControlsExpanded(expanded,restoreFocus=false){
 const open=compactControls.matches&&expanded;
 document.body.classList.toggle('controls-expanded',open);
 controlsToggle.setAttribute('aria-expanded',String(open));
 exploreControls.hidden=compactControls.matches&&!open;
 if(restoreFocus&&compactControls.matches)controlsToggle.focus({preventScroll:true});
}
controlsToggle.onclick=()=>{
 const open=controlsToggle.getAttribute('aria-expanded')!=='true';
 if(open){$('settings').hidden=true;$('settings-btn').setAttribute('aria-expanded','false');}
 setControlsExpanded(open);
};
exploreControls.addEventListener('click',e=>{if(e.target.closest('button'))setControlsExpanded(false,exploreControls.contains(document.activeElement));});
exploreControls.addEventListener('change',e=>{if(e.target.id==='destination')setControlsExpanded(false,true);});
addEventListener('keydown',e=>{if(e.key==='Escape'&&controlsToggle.getAttribute('aria-expanded')==='true'){setControlsExpanded(false,true);}});
compactControls.addEventListener('change',()=>setControlsExpanded(false,exploreControls.contains(document.activeElement)));
setControlsExpanded(false);
$('enter').onclick=()=>teleport(destinations.front,true);
$('walk-btn').onclick=()=>{if(!entered)teleport(destinations.front,true);else{setMode('walk');capture();}};
$('orbit-btn').onclick=()=>setMode('orbit');
$('tour-btn').onclick=()=>{tourTime=0;startTour();};
$('tour-pause').onclick=()=>{tourPaused=!tourPaused;updateModeUI();};
$('tour-next').onclick=()=>{const next=tour.spans.find(s=>s.a.photo&&s.start>tourTime%tour.duration+.5)||tour.spans.find(s=>s.a.photo);tourTime=next.start;startTour();};
$('destination').onchange=e=>{if(destinations[e.target.value])teleport(destinations[e.target.value]);e.target.value='';};
$('reset').onclick=()=>teleport(destinations.front);
$('roof-btn').onclick=()=>{lifted=!lifted;K.roofs.forEach(r=>r.visible=!lifted);renderer.shadowMap.needsUpdate=true;$('roof-btn').setAttribute('aria-pressed',String(lifted));$('roof-btn').textContent=lifted?'Replace roofs':'Lift roofs';};
$('settings-btn').onclick=()=>{release();$('settings').hidden=!$('settings').hidden;$('settings-btn').setAttribute('aria-expanded',String(!$('settings').hidden));};
$('speed').oninput=e=>{speed=+e.target.value;$('speed-label').textContent=speed<2.2?'Slow':speed<3.5?'Gentle':'Brisk';};
$('sensitivity').oninput=e=>sensitivity=+e.target.value;
$('shadows').onchange=e=>{renderer.shadowMap.enabled=e.target.checked;renderer.shadowMap.needsUpdate=true;scene.traverse(o=>{if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.needsUpdate=true);}});};
$('photos-btn').onclick=()=>{release();$('photos').hidden=!$('photos').hidden;$('photos-btn').setAttribute('aria-pressed',String(!$('photos').hidden));};
$('close-photos').onclick=()=>{$('photos').hidden=true;$('photos-btn').setAttribute('aria-pressed','false');};
function showPhoto(key){currentPhoto=key;const p=photos[key];$('photo-select').value=key;$('reference-photo').src='./assets/'+p.url;$('reference-photo').alt=p.caption;$('photo-caption').textContent=p.caption;$('photo-view').textContent='Go to a similar viewpoint ↗';}
$('photo-select').onchange=e=>{if(mode==='tour'){tourPaused=true;updateModeUI();}showPhoto(e.target.value);};
$('photo-view').onclick=()=>teleport(photos[currentPhoto]);
$('about-btn').onclick=()=>{release();$('about').showModal();};$('close-about').onclick=()=>$('about').close();$('about').onclick=e=>{if(e.target===$('about'))$('about').close();};
$('fullscreen').onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch{}};

addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)||$('about').open)return;if(e.code==='Escape'&&mode==='tour'){tourPaused=true;updateModeUI();}const code=directions[e.code]||e.code;if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight'].includes(code)){takeFlight();keys.add(code);e.preventDefault();}});
addEventListener('keyup',e=>keys.delete(directions[e.code]||e.code));addEventListener('blur',()=>keys.clear());
document.addEventListener('pointerlockchange',()=>{keys.clear();updateModeUI();});
renderer.domElement.addEventListener('pointerdown',e=>{takeFlight();if(!['walk','fly'].includes(mode))return;drag=true;lastMouse=[e.clientX,e.clientY];if(e.pointerType==='mouse'&&!document.pointerLockElement)capture();});
addEventListener('pointerup',()=>{drag=false;lastMouse=null;});
addEventListener('pointermove',e=>{if(!['walk','fly'].includes(mode))return;let dx=0,dy=0;if(document.pointerLockElement===renderer.domElement){dx=e.movementX;dy=e.movementY;}else if(drag&&lastMouse){dx=e.clientX-lastMouse[0];dy=e.clientY-lastMouse[1];lastMouse=[e.clientX,e.clientY];}else return;yaw-=dx*.0019*sensitivity;pitch=THREE.MathUtils.clamp(pitch-dy*.0019*sensitivity,-1.35,1.35);syncLook();});
for(const btn of document.querySelectorAll('[data-move]')){btn.addEventListener('pointerdown',e=>{e.preventDefault();takeFlight();keys.add(btn.dataset.move);btn.setPointerCapture(e.pointerId);});for(const name of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(name,()=>keys.delete(btn.dataset.move));}
renderer.domElement.addEventListener('wheel',e=>{if(e.ctrlKey||$('about').open)return;e.preventDefault();takeFlight();const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);wheelTravel=THREE.MathUtils.clamp(wheelTravel-pixels*.006,-4,4);},{passive:false});

function translateWalk(dx,dz){const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.09));for(let i=0;i<count;i++)for(const axis of ['x','z']){const x=camera.position.x+(axis==='x'?dx/count:0),z=camera.position.z+(axis==='z'?dz/count:0);const h=supportY(x,z,feet);if(h<-4||h>feet+.38||blockedRise(x,z,feet)||Math.abs(x)>115||z>105||z<-95)continue;if(!collision(x,z,Math.max(h,feet-.12))){camera.position.x=x;camera.position.z=z;feet=h;}}}
function translateFlight(delta){const n=Math.max(1,Math.ceil(delta.length()/.09)),step=delta.clone().divideScalar(n);for(let i=0;i<n;i++){const p=camera.position.clone().add(step);if(p.y<.25||p.y>90||Math.abs(p.x)>115||p.z>105||p.z<-95)break;const hit=K.colliders.some(c=>p.x+.18>c.minX&&p.x-.18<c.maxX&&p.z+.18>c.minZ&&p.z-.18<c.maxZ&&p.y+.18>c.bottom&&p.y-.18<c.top);if(hit)break;camera.position.copy(p);}}
function moveWheel(dt){if(Math.abs(wheelTravel)<.0001)return;const distance=wheelTravel*(1-Math.exp(-12*dt));wheelTravel-=distance;const direction=camera.getWorldDirection(new THREE.Vector3());if(mode==='walk')translateWalk(-Math.sin(yaw)*distance,-Math.cos(yaw)*distance);else if(mode==='fly')translateFlight(direction.multiplyScalar(distance));else if(mode==='orbit'){const old=camera.position.clone();translateFlight(direction.multiplyScalar(distance));orbit.target.add(camera.position.clone().sub(old));}}

function move(dt){moveWheel(dt);if(!['walk','fly'].includes(mode))return;let forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),side=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
 if(forward||side){const n=Math.hypot(forward,side);forward/=n;side/=n;const v=speed*(keys.has('ShiftLeft')||keys.has('ShiftRight')?1.7:1)*dt;const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*v,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*v;
  if(mode==='walk')translateWalk(dx,dz);else{const delta=camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(forward*v);delta.add(new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion).multiplyScalar(side*v));translateFlight(delta);}
 }
 if(mode==='fly')return;
 const h=supportY(camera.position.x,camera.position.z,feet);if(h>-4)feet=h;camera.position.y=THREE.MathUtils.damp(camera.position.y,feet+1.62,16,dt);walkPosition.copy(camera.position);if(!collision(camera.position.x,camera.position.z,feet))lastSafe.copy(camera.position);
}
function location(x,z,y){if(x>-8&&x<9.8&&z>-.9&&z<=0&&y<4.3)return 'The front veranda';if(x>14.6&&x<21&&z>-7&&z<34)return x>18.8&&z>11&&z<20&&y>2.5?'Temple exterior stair':'The road between house and temple';if(x>55&&x<67&&z>-16&&z<6)return 'The adjacent building';if(x>24&&x<54&&z>-1&&z<38.3){if(z<6.5)return y>4.3?'The temple upper gallery':'The temple entrance';if(z>30.3)return x>45?'The three vaulted shrines':'The rear temple circuit';if(z>16&&(x<31.5||x>46.5))return 'The outer temple circuit';return 'The temple courtyard';}if(x>-12&&x<12&&z>0&&z<18){if(y>4.3)return 'The upper floor';if(x<-8&&z>14)return 'The kitchen';if(Math.abs(x)<2.6&&z>=4.1&&z<6.95)return 'In front of the God room';if(z<5)return 'The front veranda';if(x<-3&&z>7&&z<14)return 'The courtyard & Tulsi';if(Math.abs(x)<3&&z<10)return 'The God room';return 'The inner veranda';}if(z<-10&&x<58&&x>-24)return x>25&&x<31&&z<-36?'The lakeside pavilion':'Around the lake';if(z>20)return 'Behind the house';return 'The lane by the lake';}
const clock=new THREE.Clock();let frames=0,elapsed=0;
function animate(){requestAnimationFrame(animate);const frameTime=clock.getDelta(),dt=Math.min(frameTime,.10);elapsed+=dt;if(mode==='tour'){if(!tourPaused&&!$('about').open)tourTime+=Math.min(frameTime,1);const view=tour.sample(tourTime);camera.position.copy(view.position);camera.quaternion.copy(view.quaternion);setLens(view.fov);tourLabel=view.label;if(view.photo&&currentPhoto!==view.photo)showPhoto(view.photo);}else move(dt);if(mode==='orbit')orbit.update();waterMat.uniforms.time.value=elapsed;waterMat.uniforms.eye.value.copy(camera.position);renderer.render(scene,camera);renderer.shadowMap.autoUpdate=false;if(frames++%8===0){$('location').textContent=mode==='tour'?tourLabel:location(camera.position.x,camera.position.z,camera.position.y);}}
startTour();animate();$('loading').hidden=true;
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

// Shared with the visible controls for reproducible navigation checks and future edits.
window.houseWalk={ready:true,K,scene,camera,renderer,house,temple,landscape,teleport,setMode,destinations,photos,tour,collision,supportY,blockedRise,getState:()=>({mode,entered,feet,position:camera.position.toArray(),direction:camera.getWorldDirection(new THREE.Vector3()).toArray(),tourTime,tourPaused,tourLabel,wheelTravel,location:location(camera.position.x,camera.position.z,camera.position.y),roofLifted:lifted,colliders:K.colliders.length,surfaces:K.surfaces.length,ramps:K.ramps.length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles}),moveFor:(code,seconds)=>{keys.add(code);for(let t=0;t<seconds;t+=1/60)move(1/60);keys.delete(code);return window.houseWalk.getState();}};
if(document.modelContext?.registerTool){
 const c=document.modelContext;
 try{Promise.resolve(c.registerTool({name:'visit_place',description:'Move to a place in the Shankaranarayana reconstruction, using the same destinations as the Go to menu.',inputSchema:{type:'object',properties:{place:{type:'string',enum:Object.keys(destinations)}},required:['place'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||!destinations[input.place]||Object.keys(input).length!==1)throw new Error('Choose a listed place.');teleport(destinations[input.place]);return window.houseWalk.getState();}})).catch(()=>{});}catch{}
}
