import * as THREE from 'three';
import {EffectComposer} from '../vendor/addons/postprocessing/EffectComposer.js';
import {RenderPass} from '../vendor/addons/postprocessing/RenderPass.js';
import {GTAOPass} from '../vendor/addons/postprocessing/GTAOPass.js';
import {OutputPass} from '../vendor/addons/postprocessing/OutputPass.js';
import {ShaderPass} from '../vendor/addons/postprocessing/ShaderPass.js';

// Desktop-only "High quality" tier. It is opt-in, so phones and the default
// desktop view keep their established budget. ?quality=high|standard overrides
// the remembered choice for one visit without storing it.
const KEY='shankaranarayana.quality.v1';
export function readQuality(phoneMode){
  if(phoneMode)return 'standard';
  const param=new URLSearchParams(location.search).get('quality');
  if(param==='high'||param==='standard')return param;
  try{return localStorage.getItem(KEY)==='high'?'high':'standard';}catch{return 'standard';}
}
export function storeQuality(value){try{localStorage.setItem(KEY,value);}catch{}}

// Beauty pass into a 4x MSAA half-float target, ground-truth ambient occlusion,
// then the renderer's own tone mapping and sRGB output.
export function createHighQualityPipeline({renderer,scene,camera,water,sky}){
  const size=renderer.getDrawingBufferSize(new THREE.Vector2());
  const target=new THREE.WebGLRenderTarget(size.x,size.y,{type:THREE.HalfFloatType,samples:4});
  const composer=new EffectComposer(renderer,target);
  composer.addPass(new RenderPass(scene,camera));
  const ao=new GTAOPass(scene,camera,size.x,size.y);
  // Metre-scale occlusion: corners, eaves, verandas and roof undersides darken,
  // while open ground and distant hills are left alone.
  ao.updateGtaoMaterial({radius:1.7,distanceExponent:1,thickness:2.5,scale:1.6,distanceFallOff:1,samples:16});
  ao.updatePdMaterial({lumaPhi:10,depthPhi:2,normalPhi:3,radius:6,radiusExponent:1,rings:2,samples:16});
  ao.blendIntensity=1;
  // The normal/depth prepass must not refresh the lake reflection (it would
  // capture the override material) and the sky dome is not a surface. Beyond
  // AO_RANGE the fog hides any occlusion, so distant meshes skip the prepass.
  const AO_RANGE=70,sphere=new THREE.Sphere(),hidden=[];let bounds=null;
  const renderGBuffer=ao._renderOverride.bind(ao);
  ao._renderOverride=(...args)=>{
    if(!bounds){bounds=[];scene.traverse(o=>{if((o.isMesh||o.isLine)&&o!==water){if(o.isInstancedMesh&&!o.boundingSphere)o.computeBoundingSphere();const g=o.isInstancedMesh?o.boundingSphere:(o.geometry.boundingSphere||(o.geometry.computeBoundingSphere(),o.geometry.boundingSphere));bounds.push([o,g]);}});}
    const eye=camera.position;
    for(const [o,g] of bounds){if(!o.visible)continue;sphere.copy(g).applyMatrix4(o.matrixWorld);if(sphere.center.distanceTo(eye)-sphere.radius>AO_RANGE){o.visible=false;hidden.push(o);}}
    const reflect=water.onBeforeRender;water.onBeforeRender=()=>{};const skyVisible=sky.visible;sky.visible=false;
    try{renderGBuffer(...args);}finally{water.onBeforeRender=reflect;sky.visible=skyVisible;for(const o of hidden)o.visible=true;hidden.length=0;}};
  composer.addPass(ao);
  // Gentle photographic grade in linear light before tone mapping: slightly more
  // contrast and saturation, as the 2011 camera rendered the overcast scenes.
  const grade=new ShaderPass({uniforms:{tDiffuse:{value:null},contrast:{value:1.08},saturation:{value:1.02}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform sampler2D tDiffuse;uniform float contrast;uniform float saturation;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);vec3 l=log2(max(c.rgb,1e-4));l=(l+2.)*contrast-2.;vec3 v=exp2(l);float y=dot(v,vec3(.2126,.7152,.0722));gl_FragColor=vec4(max(mix(vec3(y),v,saturation),0.),c.a);}'});
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  return {
    ao,composer,
    render(){composer.render();},
    setSize(w,h){composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(w,h);},
    setPixelRatio(r){composer.setPixelRatio(r);},
  };
}

// A soft image-based sky for PBR materials: polished oxide floors, marble and
// brass pick up the overcast sky instead of reading as flat colour.
export function overcastEnvironment(renderer,top,bottom){
  const envScene=new THREE.Scene();
  const dome=new THREE.Mesh(new THREE.SphereGeometry(10,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
    uniforms:{top:{value:new THREE.Color(top)},bottom:{value:new THREE.Color(bottom)},ground:{value:new THREE.Color('#5b5140')}},
    vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 p;uniform vec3 top;uniform vec3 bottom;uniform vec3 ground;void main(){float y=normalize(p).y;vec3 c=y>0.?mix(bottom,top,pow(y,.48)):mix(bottom,ground,min(1.,-y*4.));gl_FragColor=vec4(c,1.);}'}));
  envScene.add(dome);
  const pmrem=new THREE.PMREMGenerator(renderer);
  const texture=pmrem.fromScene(envScene,.02).texture;
  pmrem.dispose();dome.geometry.dispose();dome.material.dispose();
  return texture;
}

// Near crowns and shrubs gain a fringe of the landscape's folded leaf sprays,
// oriented outward over each crown's upper surface, so silhouettes break into
// leaves instead of smooth lumps. Distant hill crowns are left as they are.
export function leafFringe(scene,perCrown=26,names=/^(layered broadleaf canopies|varied understory shrub clusters)$/,sizeScale=.28,maxScale=2.2){
  const source=scene.getObjectByName('small leaves breaking canopy outlines');if(!source)return 0;
  const crowns=[];scene.traverse(o=>{if(o.isInstancedMesh&&names.test(o.name))crowns.push(o);});
  let total=0;
  let n=77711;const r=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
  const m=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3(),dir=new THREE.Vector3(),pos=new THREE.Vector3(),out=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  const pose=new THREE.Object3D(),color=new THREE.Color();
  // One fringe per spatially batched crown mesh keeps frustum culling effective.
  for(const c of crowns){c.updateMatrixWorld();const fringe=new THREE.InstancedMesh(source.geometry,source.material,c.count*perCrown);fringe.name='High quality crown leaf fringe';let i=0;total+=c.count*perCrown;for(let k=0;k<c.count;k++){
    c.getMatrixAt(k,m);m.premultiply(c.matrixWorld);m.decompose(p,q,s);if(c.instanceColor)c.getColorAt(k,color);else color.set('#4b6937');
    const size=Math.min(s.x,s.y,s.z);
    for(let j=0;j<perCrown;j++){
      // Bias toward the upper and outer surface where silhouettes form.
      const y=-.35+r()*1.35,a=r()*6.283,h=Math.sqrt(Math.max(0,1-Math.min(1,y*y)));
      dir.set(Math.cos(a)*h,Math.min(1,y),Math.sin(a)*h).normalize();
      pos.copy(dir).multiply(s).multiplyScalar(.93+r()*.12).applyQuaternion(q).add(p);
      out.copy(dir).applyQuaternion(q).normalize();
      pose.position.copy(pos);pose.quaternion.setFromUnitVectors(up,out);pose.rotateY(r()*6.283);
      const k2=Math.min(maxScale,.5+size*sizeScale)*(.7+r()*.6);pose.scale.setScalar(k2);pose.updateMatrix();
      fringe.setMatrixAt(i,pose.matrix);fringe.setColorAt(i,color.clone().multiplyScalar(.9+r()*.35));i++;}
  }
  fringe.instanceMatrix.needsUpdate=true;fringe.instanceColor.needsUpdate=true;fringe.computeBoundingBox();fringe.computeBoundingSphere();fringe.castShadow=false;fringe.receiveShadow=true;
  scene.add(fringe);}
  return total;
}
