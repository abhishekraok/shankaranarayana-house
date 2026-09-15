import * as THREE from 'three';

// Eye-height coordinates. Explicit approach/exit points keep the flight out of walls.
export function createPhotoTour(photos) {
  const photo=key=>({p:[photos[key].p[0],photos[key].p[1]+1.62,photos[key].p[2]],look:photos[key].target,label:photos[key].caption.split(' · ').slice(1).join(' · '),fov:photos[key].fov||58,photo:key,hold:0});
  const at=(p,look,label)=>({p,look,label,hold:0});
  const points=[
    photo('lakeleft'),photo('lakemiddle'),photo('lakehouse'),
    at([-8,5,-23],[0,3,2],'Across the lake'),photo('house'),photo('houseleft'),
    at([0,2.07,-.8],[0,2,6],'Approaching the house'),
    at([0,2.07,3],[0,2,6],'Through the entrance'),
    photo('godroom'),
    at([0,2.07,4.45],[0,2,-5],'Returning from the God room'),
    at([0,2.07,3],[0,2,-5],'Looking towards the lake'),
    at([0,2.07,.8],[0,2,-8],'Leaving the house'),at([0,2.2,-4],[15,3,-5],'Along the lane'),
    photo('laneleft'),photo('laneright'),
    at([25,3,-5],[39,3,2],'The neighboring temple'),photo('templehouse'),photo('temple'),
    at([39,1.67,-4.2],[39,2,-1],'Approaching the projecting entrance'),
    at([39,1.82,.2],[39,2,5],'Entering the temple'),
    photo('templedoor'),
    at([39,1.72,8.2],[46,2,13],'Into the outer circuit'),
    at([45,1.72,9],[52,2,13],'The entrance-side shrines'),
    at([49.9,1.72,13.8],[49.3,1.7,37],'Along the outer circuit'),
    photo('templeoldwall'),
    at([50.0,1.72,25.6],[47,1.8,28],'Past the standing stone'),photo('templeouterreturn'),
    at([49.8,1.72,32.7],[52.2,3,32],'The three vaulted shrines'),photo('templeoutershrines'),
    photo('templeouterrear'),
    at([29.2,1.72,33],[27,2,32],'Around the rear of the temple'),
    at([29.36,1.72,22],[30,2,15],'Returning along the other side'),
    at([29.36,1.72,14],[34,2,13],'The shaded side hall'),
    at([33,1.72,13],[35,2,9],'Back to the front courtyard'),
    at([35,1.72,9],[39,2,8],'The temple entrance'),
    at([39,1.72,8.2],[39,2,3],'Returning inside'),
    at([39,1.82,3],[44.6,2,3],'Towards the upper gallery'),
    at([44.6,2.22,3],[46.18,3,2],'Towards the upper gallery'),
    at([44.6,2.22,1.35],[46.18,3,3],'The gallery stair'),
    at([46.18,2.43,1.35],[46.18,5.6,5.72],'Ascending to the gallery'),
    at([46.18,5.56,5.72],[44.4,5.7,5.4],'The temple upper gallery'),
    at([44.4,5.7,5.72],[46,2.6,16.5],'The inner temple building'),
    photo('templeleft'),photo('templecenter'),photo('templeright'),
    at([39,6.4,8],[39,3.3,18],'Across the temple courtyard'),
    at([39,11,8],[39,4,19],'Above the temple entrance'),
    at([42,11,-8],[39,3,2],'The temple and lake'),
    at([42,7,-8],[39,3,2],'The temple and lake'),
    at([23,7,-26],[8,1,-12],'The covered bathing arcade'),
    at([8,6,-46],[-13,2,-39],'Around the lake'),
    at([-23,4,-29],[-10,1,-25],'The stepped banks'),
  ];
  const qFor=point=>{const c=new THREE.PerspectiveCamera();c.position.set(...point.p);c.lookAt(new THREE.Vector3(...point.look));return c.quaternion.clone();};
  // Co-located photographs are viewing references, not separate stationary turns.
  const route=points.filter((p,i)=>i===0||new THREE.Vector3(...p.p).distanceTo(new THREE.Vector3(...points[i-1].p))>.02);
  const positions=route.map(p=>new THREE.Vector3(...p.p));
  const spans=[];let duration=0;
  for(let i=0;i<route.length;i++){
    const a=route[i],b=route[(i+1)%route.length];
    const distance=positions[i].distanceTo(positions[(i+1)%route.length]);
    const qa=qFor(a),qb=qFor(b);
    const travel=Math.max(.6,distance/3.8,qa.angleTo(qb)/(.65));
    spans.push({a,b,qa,qb,start:duration,hold:0,travel});
    duration+=travel;
  }
  // Shared velocities carry motion through viewpoints and round the corners.
  // Route clearance is checked against the scene geometry, including doorways.
  const velocities=positions.map((p,i)=>{
    const prev=(i+positions.length-1)%positions.length,next=(i+1)%positions.length;
    const incoming=p.clone().sub(positions[prev]),outgoing=positions[next].clone().sub(p);
    const speed=Math.min(incoming.length()/spans[prev].travel,outgoing.length()/spans[i].travel);
    const direction=incoming.normalize().add(outgoing.normalize()).multiplyScalar(.5);
    return direction.multiplyScalar(speed*.7);
  });
  function sample(time){
    const t=((time%duration)+duration)%duration;
    const index=spans.findIndex(s=>t<s.start+s.travel),i=index<0?spans.length-1:index,s=spans[i];
    const f=THREE.MathUtils.clamp((t-s.start)/s.travel,0,1),f2=f*f,f3=f2*f;
    const position=positions[i].clone().multiplyScalar(2*f3-3*f2+1)
      .addScaledVector(positions[(i+1)%positions.length],-2*f3+3*f2)
      .addScaledVector(velocities[i],(f3-2*f2+f)*s.travel)
      .addScaledVector(velocities[(i+1)%positions.length],(f3-f2)*s.travel);
    const smooth=f2*(3-2*f);
    return {position,quaternion:s.qa.clone().slerp(s.qb,smooth),fov:58,label:f<.45?s.a.label:s.b.label,photo:s.a.photo||null};
  }
  return {duration,points,spans,sample};
}
