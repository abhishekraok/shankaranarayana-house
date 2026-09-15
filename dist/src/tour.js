import * as THREE from 'three';

// Eye-height waypoints follow doors, aisles, stairs and the dry lake banks.
export function createPhotoTour(photos, supportY = null) {
  const photo=key=>({p:[photos[key].p[0],photos[key].p[1]+1.62,photos[key].p[2]],look:photos[key].target,label:photos[key].caption.split(' · ').slice(1).join(' · '),fov:photos[key].fov||58,photo:key,hold:.75});
  const at=(p,look,label)=>({p,look,label,hold:0});
  const points=[
    photo('house'),
    at([0,2.07,-.8],[0,2,6],'Approaching the house'),
    at([0,2.07,3],[0,2,6],'Through the entrance'),
    photo('godroom'),
    at([-2.9,2.07,4.55],[-4.9,2,6],'Beside the God room'),
    at([-2.9,2.07,5.15],[-4.9,2,7],'Into the house'),
    at([-4.9,2.07,5.15],[-4.9,1.7,10],'The courtyard entrance'),
    at([-4.9,1.655,7],[-3.7,1.5,11],'Down into the courtyard'),
    at([-3.7,1.655,7],[-3.7,1.5,12],'Around the courtyard'),
    photo('courtyard'),
    at([-3.7,1.655,12.8],[-7,2,12.8],'The rear courtyard'),
    at([-7.75,1.655,12.8],[-7.75,2,10.8],'Beside the courtyard stair'),
    at([-7.75,1.655,10.8],[-9.85,2,10.8],'The kitchen passage'),
    at([-9.85,2.07,10.8],[-9.85,2,6],'Along the shaded veranda'),
    at([-9.85,2.07,5.15],[-4.9,2,5.15],'Returning to the front hall'),
    at([-4.9,2.07,5.15],[-2.9,2,5.15],'Beside the God room'),
    at([-2.9,2.07,5.15],[-2.9,2,4.55],'Through the front hall'),
    at([-2.9,2.07,4.55],[0,2,3],'Towards the house entrance'),
    at([0,2.07,4.45],[0,2,-5],'Leaving the house'),
    at([0,2.07,3],[0,2,-5],'Through the entrance'),
    at([0,2.07,.8],[0,2,-8],'Leaving the house'),
    at([0,1.671,-6],[15,2,-6],'Along the lane'),
    photo('laneleft'),
    at([25,1.671,-6],[39,3,2],'Walking to the temple'),photo('temple'),
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
    at([33,1.72,14.2],[39,2,14.2],'Past the lamp pillar'),
    at([39,1.72,14.2],[39,2,20],'Entering the inner sanctum'),
    at([39,2.17,20.2],[35.2,2.3,24],'The inner stone aisles'),
    at([35.2,2.17,20.2],[35.2,2.3,27.8],'Around the inner sanctum'),
    {...at([35.2,2.17,24],[39,2.3,26.5],'Beside the sanctum'),hold:.75},
    at([35.2,2.17,27.8],[42.8,2.3,27.8],'Behind the sanctum'),
    at([42.8,2.17,27.8],[42.8,2.3,21],'Returning along the inner aisle'),
    {...at([42.8,2.17,21],[39,2.25,16.3],'The inner entrance'),hold:.75},
    at([42.8,2.17,20.2],[39,2,20.2],'Returning to the courtyard'),
    at([39,2.17,20.2],[39,2,13.6],'Leaving the inner sanctum'),
    at([39,1.72,13.6],[39,2,8],'The front courtyard'),
    at([39,1.72,8.2],[39,2,3],'Returning inside'),
    at([39,1.82,3],[44.6,2,3],'Towards the upper gallery'),
    at([44.6,2.22,3],[46.18,3,2],'Towards the upper gallery'),
    at([44.6,2.22,1.35],[46.18,3,3],'The gallery stair'),
    at([46.18,2.43,1.35],[46.18,5.6,5.72],'Ascending to the gallery'),
    at([46.18,5.56,5.72],[44.4,5.7,5.4],'The temple upper gallery'),
    at([44.4,5.7,5.72],[46,2.6,16.5],'The inner temple building'),
    photo('templeleft'),photo('templecenter'),photo('templeright'),
    at([39,5.7,5.4],[44.4,5.7,5.4],'Returning along the gallery'),
    at([44.4,5.7,5.72],[46.18,5.56,5.72],'Back to the gallery stair'),
    at([46.18,5.56,5.72],[46.18,2.43,1.35],'Descending the gallery stair'),
    at([46.18,2.43,1.35],[44.6,2.22,1.35],'The lower landing'),
    at([44.6,2.22,1.35],[44.6,2.22,3],'Towards the entrance'),
    at([44.6,2.22,3],[39,1.82,3],'Through the entrance hall'),
    at([39,1.82,3],[39,1.82,.2],'Leaving the temple'),
    at([39,1.82,.2],[39,1.67,-4.2],'Outside the temple'),
    at([39,1.67,-4.2],[49,2,-8],'Walking towards the lake'),
    at([49,1.671,-8],[56,2,-15],'Along the lake bank'),
    at([56.2,1.671,-8],[56.2,2,-20],'Rounding the lake corner'),
    at([56.2,1.671,-15],[56.2,2,-35],'Past the lakeside shop'),
    at([56.2,1.671,-39],[45,2,-45.4],'Around the far corner'),
    at([56.2,1.671,-45.4],[42,3,-2],'The opposite bank'),
    photo('templeacross'),
    at([31,1.672,-45.4],[39,3,0],'Up the gentle bank'),
    at([25.6,2.7,-45.4],[39,3,0],'Across the lake'),
    photo('lakeleft'),photo('lakemiddle'),photo('lakehouse'),
    at([8.6,2.7,-45.4],[0,3,1],'The house across the water'),
    at([3.2,1.672,-45.4],[0,3,1],'Down the bank'),
    at([-20.2,1.671,-45.4],[-10,2,-25],'Around the western bank'),
    photo('shoplake'),
    at([-20.2,1.671,-9],[0,3,1],'Back towards the house'),
    at([-7,1.671,-7.8],[0,3,1],'Returning to the house'),
  ];
  const qFor=point=>{const c=new THREE.PerspectiveCamera();c.position.set(...point.p);c.lookAt(new THREE.Vector3(...point.look));return c.quaternion.clone();};
  // The opposite-bank photographs form a short, stationary panoramic turn.
  const route=points;
  const positions=route.map(p=>new THREE.Vector3(...p.p));
  const spans=[];let duration=0;
  for(let i=0;i<route.length;i++){
    const a=route[i],b=route[(i+1)%route.length];
    const distance=positions[i].distanceTo(positions[(i+1)%route.length]);
    const qa=qFor(a),qb=qFor(b);
    const travel=Math.max(.6,distance/3.5,qa.angleTo(qb)/(.65));
    spans.push({a,b,qa,qb,start:duration,hold:a.hold,travel});
    duration+=a.hold+travel;
  }
  // Shared velocities carry motion through viewpoints and round the corners.
  // Route clearance is checked against the scene geometry, including doorways.
  const velocities=positions.map((p,i)=>{
    if(route[i].hold>0)return new THREE.Vector3();
    const prev=(i+positions.length-1)%positions.length,next=(i+1)%positions.length;
    const incoming=p.clone().sub(positions[prev]),outgoing=positions[next].clone().sub(p);
    const speed=Math.min(incoming.length()/spans[prev].travel,outgoing.length()/spans[i].travel);
    const direction=incoming.normalize().add(outgoing.normalize()).multiplyScalar(.5);
    return direction.multiplyScalar(speed*.25);
  });
  function sample(time){
    const t=((time%duration)+duration)%duration;
    const index=spans.findIndex(s=>t<s.start+s.hold+s.travel),i=index<0?spans.length-1:index,s=spans[i];
    const f=THREE.MathUtils.clamp((t-s.start-s.hold)/s.travel,0,1),f2=f*f,f3=f2*f;
    const position=positions[i].clone().multiplyScalar(2*f3-3*f2+1)
      .addScaledVector(positions[(i+1)%positions.length],-2*f3+3*f2)
      .addScaledVector(velocities[i],(f3-2*f2+f)*s.travel)
      .addScaledVector(velocities[(i+1)%positions.length],(f3-f2)*s.travel);
    if(supportY){
      // Resolve adjoining floor/step surfaces without accumulating frame-rate drift.
      for(let n=0;n<3;n++)position.y=supportY(position.x,position.z,position.y-1.62)+1.62;
    }
    const smooth=f2*(3-2*f);
    return {position,quaternion:s.qa.clone().slerp(s.qb,smooth),fov:58,label:f<.45?s.a.label:s.b.label,photo:s.a.photo||null};
  }
  return {duration,points,spans,sample};
}
