import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {K,THREE,main,collision,supportY,blockedRise} from './entrance-geometry.mjs';
// Execute the actual wheel handler and motion controller against the full scene's collisions.
const registration=main.slice(main.indexOf("renderer.domElement.addEventListener('wheel'"),main.indexOf('function translateWalk'));
const movement=main.slice(main.indexOf('function translateWalk'),main.indexOf('function location'));
const takeover=main.slice(main.indexOf('function takeFlight'),main.indexOf('function setMode'));
const run=new Function('K','THREE','collision','supportY','blockedRise',`
 let mode='walk',entered=true,feet=.45,speed=2.6,wheelTravel=0,yaw=0,pitch=0;
 const camera=new THREE.PerspectiveCamera(),keys=new Set(),walkPosition=new THREE.Vector3(),lastSafe=new THREE.Vector3();
 const innerHeight=800,$=()=>({open:false}),updateModeUI=()=>{},release=()=>{keys.clear();wheelTravel=0;};
 const orbit={target:new THREE.Vector3()};let wheel;const renderer={domElement:{addEventListener:(name,handler)=>wheel=handler}};
 ${takeover}
 ${registration}
 ${movement}
 return {set(m,p,target){mode=m;feet=p[1]-1.62;wheelTravel=0;camera.position.set(...p);camera.lookAt(new THREE.Vector3(...target));const e=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ');yaw=e.y;pitch=e.x;},
 wheel(deltaY,deltaMode=0){let prevented=false;wheel({deltaY,deltaMode,ctrlKey:false,preventDefault(){prevented=true;}});for(let i=0;i<90;i++)move(1/60);return {mode,p:camera.position.toArray(),prevented};},
 direction(){return camera.getWorldDirection(new THREE.Vector3());}};
`)(K,THREE,collision,supportY,blockedRise);
const results=[];
for(const mode of ['walk','tour','fly','orbit']){
 const p=mode==='walk'?[0,1.671,-4]:[-8,5,-23],target=mode==='walk'?[0,1.671,-15]:[0,3,2];
 run.set(mode,p,target);const direction=run.direction(),a=run.wheel(-120),b=run.wheel(120);
 assert.ok(a.prevented,'Wheel should not scroll the page');
 assert.ok(new THREE.Vector3(...a.p).sub(new THREE.Vector3(...p)).dot(direction)>.60,mode+' forward');
 assert.ok(new THREE.Vector3(...b.p).distanceTo(new THREE.Vector3(...p))<.03,mode+' backward');
 if(mode==='tour')assert.equal(a.mode,'fly','Wheel must take over from the tour without teleporting');
 results.push({mode,forward:a.p,backward:b.p});
}
run.set('walk',[0,2.07,3],[10,2.07,3]);const wall=run.wheel(-4000);assert.ok(wall.p[0]<.85,'Large wheel input must stop at the passage wall');
run.set('fly',[-8,5,-23],[0,3,2]);const line=run.wheel(-7.5,1);assert.ok(new THREE.Vector3(...line.p).distanceTo(new THREE.Vector3(-8,5,-23))>.65,'Line-mode wheel normalization');
const report={passed:true,modes:results,wallStop:wall.p,lineWheel:line.p};await fs.writeFile(new URL('../checks/wheel-movement.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
