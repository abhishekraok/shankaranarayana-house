import * as THREE from 'three';
import {EffectComposer} from '../vendor/addons/postprocessing/EffectComposer.js';
import {RenderPass} from '../vendor/addons/postprocessing/RenderPass.js';
import {GTAOPass} from '../vendor/addons/postprocessing/GTAOPass.js';
import {OutputPass} from '../vendor/addons/postprocessing/OutputPass.js';

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
