import * as THREE from 'three';

// Preserve authored meshes in the builders; batch only their static rendering.
// Each batch shares a parent (including liftable roofs), material and local cell.
export function optimizeStaticScene(root, protectedObjects=[], cellSize=12){
  root.updateMatrixWorld(true);
  const groups=new Map(),instanced=[];
  root.traverse(o=>{
    if(o.isInstancedMesh){if(o.count>80)instanced.push(o);return;}
    if(protectedObjects.includes(o)||!o.isMesh||o.children.length||!o.visible||Array.isArray(o.material)||o.material.transparent||o.isSkinnedMesh||o.geometry.morphAttributes.position||o.onBeforeRender!==THREE.Object3D.prototype.onBeforeRender)return;
    const attrs=Object.keys(o.geometry.attributes).sort();
    if(attrs.some(k=>!['position','normal','uv'].includes(k))||!attrs.includes('normal'))return;
    o.updateMatrix();if(o.matrix.determinant()<=0)return;
    const key=[o.parent.uuid,o.material.uuid,o.castShadow,o.receiveShadow,o.renderOrder,attrs.join(','),Math.floor(o.position.x/cellSize),Math.floor(o.position.z/cellSize)].join('|');
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);
  });
  let sourceMeshes=0,mergedBatches=0,spatialBatches=0;
  for(const objects of groups.values()){
    if(objects.length<4)continue;
    const parts=objects.map(o=>{const geom=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();return geom.applyMatrix4(o.matrix);});
    const geom=new THREE.BufferGeometry();
    for(const name of Object.keys(parts[0].attributes)){
      const size=parts[0].attributes[name].itemSize,length=parts.reduce((n,p)=>n+p.attributes[name].array.length,0),values=new Float32Array(length);let at=0;
      for(const part of parts){values.set(part.attributes[name].array,at);at+=part.attributes[name].array.length;}
      geom.setAttribute(name,new THREE.BufferAttribute(values,size));
    }
    geom.computeBoundingBox();geom.computeBoundingSphere();
    const first=objects[0],batch=new THREE.Mesh(geom,first.material);batch.name='Static architectural batch';batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;batch.renderOrder=first.renderOrder;
    batch.userData.sourceNames=objects.map(o=>o.name);first.parent.add(batch);
    objects.forEach(o=>o.removeFromParent());parts.forEach(p=>p.dispose());sourceMeshes+=objects.length;mergedBatches++;
  }
  // Whole-world foliage instances otherwise draw millions of off-screen triangles.
  const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),color=new THREE.Color();
  for(const source of instanced){
    const cells=new Map();
    for(let i=0;i<source.count;i++){
      source.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);
      const key=`${Math.floor(position.x/cellSize)},${Math.floor(position.z/cellSize)}`;
      if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i);
    }
    if(cells.size<2)continue;
    for(const ids of cells.values()){
      const batch=new THREE.InstancedMesh(source.geometry,source.material,ids.length);batch.name=source.name;batch.position.copy(source.position);batch.quaternion.copy(source.quaternion);batch.scale.copy(source.scale);batch.visible=source.visible;batch.castShadow=source.castShadow;batch.receiveShadow=source.receiveShadow;batch.renderOrder=source.renderOrder;
      ids.forEach((id,i)=>{source.getMatrixAt(id,matrix);batch.setMatrixAt(i,matrix);if(source.instanceColor){source.getColorAt(id,color);batch.setColorAt(i,color);}});
      batch.computeBoundingBox();batch.computeBoundingSphere();source.parent.add(batch);spatialBatches++;
    }
    source.removeFromParent();source.dispose();
  }
  return {sourceMeshes,mergedBatches,spatialBatches};
}
