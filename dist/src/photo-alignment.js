import * as THREE from 'three';
const STORAGE='shankaranarayana.photo-poses.v1',POSITION='shankaranarayana.align-position.v1';
// Side-by-side photo alignment. The 3D view is sized to the photo's exact aspect
// ratio beside it, so a saved pose reproduces the photo framing without cropping.
// Local runs started with `node server.mjs --photos DIR` load DIR/align-queue.json
// (tools/align-queue.mjs) and work through it most-uncertain first.
export function installPhotoAlignment({camera,photos,enter,release,resize,setAligning}){
 const $=id=>document.getElementById(id);
 let items=[],index=0,active=false,saved=new Map(),ghost=false,diskSync=false;
 const stage=document.createElement('div');stage.id='align-stage';stage.hidden=true;
 stage.innerHTML=`<img id="align-photo-view" alt=""><img id="alignment-overlay" alt="" hidden>`;
 document.body.append(stage);
 const panel=document.createElement('section');panel.id='photo-alignment';panel.hidden=true;panel.setAttribute('aria-label','Align photographs');
 panel.innerHTML=`<div class="align-row"><strong id="align-title"></strong><span id="align-reason"></span><span id="align-count"></span></div>
 <div class="align-row"><button id="align-prev" title="Previous photo (P)">‹ Prev</button><button id="align-skip" title="Next photo without saving (N)">Skip ›</button><button id="align-save" class="primary-action" title="Save pose and go to the next photo (Space)">Save &amp; next <kbd>Space</kbd></button>
 <label class="align-fov">FOV <output id="align-fov-value"></output><input id="align-fov" type="range" min="20" max="110" step=".1"></label>
 <button id="align-ghost" title="Overlay the photo on the 3D view (G)">Ghost</button><button id="align-start" title="Back to this photo's starting camera (R)">Reset</button>
 <input id="align-notes" maxlength="1000" placeholder="Notes: where were you standing? what differs?">
 <button id="align-export">Export JSON</button><label class="align-file">Import<input id="align-import" type="file" accept="application/json,.json"></label><button id="align-close" aria-label="Close photo alignment">Close</button></div>
 <p class="align-help"><b>Drag</b> look · <b>WASD</b> move (passes through walls) · <b>Q/E</b> down/up · <b>Shift</b> faster, <b>Alt</b> finer · <b>Wheel</b> forward · <b>Z/X</b> zoom · <b>G</b> ghost · <b>Space</b> save &amp; next · <span id="align-status" role="status"></span></p>`;
 document.body.append(panel);
 const button=document.createElement('button');button.id='align-photo';button.textContent='Align photos';$('photos').append(button);
 const photo=$('align-photo-view'),overlay=$('alignment-overlay');
 const status=text=>$('align-status').textContent=text;
 const valid=r=>r&&typeof r.id==='string'&&r.id.length<300&&typeof r.filename==='string'&&r.filename.length<300&&r.camera&&['position','quaternion'].every(k=>Array.isArray(r.camera[k])&&r.camera[k].length===(k==='position'?3:4)&&r.camera[k].every(Number.isFinite))&&r.camera.position.every(v=>Math.abs(v)<1000)&&Math.abs(Math.hypot(...r.camera.quaternion)-1)<.01&&Number.isFinite(r.camera.verticalFov)&&r.camera.verticalFov>=20&&r.camera.verticalFov<=110;
 try{const records=JSON.parse(localStorage.getItem(STORAGE)||'[]');if(Array.isArray(records))for(const r of records)if(valid(r))saved.set(r.id,r);}catch{}
 const exportData=()=>({schema:'shankaranarayana-photo-poses',version:1,coordinates:'Three.js world metres; Y up; camera position is eye position (not feet)',exportedAt:new Date().toISOString(),poses:[...saved.values()]});
 // With a local photo queue, every save is also written to the photo folder by server.mjs.
 const sync=()=>{if(diskSync)fetch('./local-photos/align-poses.json',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(exportData())}).then(r=>{if(!r.ok)status('Could not write poses to the photo folder; use Export.');}).catch(()=>status('Could not write poses to the photo folder; use Export.'));};
 const persist=()=>{sync();try{localStorage.setItem(STORAGE,JSON.stringify([...saved.values()]));return true;}catch{return false;}};
 const bundled=()=>Object.entries(photos).map(([key,p])=>({id:'asset:'+key,filename:p.url,url:'./assets/'+p.url,label:p.caption||key,reason:'Bundled reference photo.',start:{p:p.p,target:p.target,fov:p.fov||null}}));
 async function loadQueue(){
  try{const r=await fetch('./local-photos/align-queue.json',{cache:'no-store'});if(r.ok){const data=await r.json();if(data.schema==='shankaranarayana-align-queue'&&Array.isArray(data.items)&&data.items.length)
   diskSync=true;
   try{const d=await fetch('./local-photos/align-poses.json',{cache:'no-store'});if(d.ok){const disk=await d.json();for(const r of disk.poses||[])if(valid(r)&&(!saved.has(r.id)||saved.get(r.id).savedAt<r.savedAt))saved.set(r.id,r);}}catch{}
   return data.items.map(i=>({id:'file:'+i.file,filename:i.file,url:'./local-photos/'+encodeURIComponent(i.file),label:i.label,reason:i.reason,start:i.start}));}}catch{}
  return bundled();
 }
 function layout(){
  if(!active)return;
  const bar=panel.getBoundingClientRect().height,gap=8,W=innerWidth,H=innerHeight-bar-gap*2;
  const aspect=(photo.naturalWidth&&photo.naturalHeight)?photo.naturalWidth/photo.naturalHeight:4/3;
  const across=W/H>aspect*.95;// side by side when two photos fit better horizontally
  const cellW=across?(W-gap*3)/2:W-gap*2,cellH=across?H:(H-gap)/2;
  const w=Math.floor(Math.min(cellW,cellH*aspect)),h=Math.floor(w/aspect);
  const x1=across?Math.round(W/2-gap/2-w):Math.round((W-w)/2),y1=across?Math.round(gap+(H-h)/2):Math.round(gap+(cellH-h)/2);
  const x2=across?Math.round(W/2+gap/2):x1,y2=across?y1:Math.round(gap*2+cellH+(cellH-h)/2);
  Object.assign(photo.style,{left:x1+'px',top:y1+'px',width:w+'px',height:h+'px'});
  Object.assign(overlay.style,{left:x2+'px',top:y2+'px',width:w+'px',height:h+'px'});
  const world=$('world');Object.assign(world.style,{left:x2+'px',top:y2+'px',width:w+'px',height:h+'px',right:'auto',bottom:'auto'});
  resize(w,h);
 }
 function lens(){const f=THREE.MathUtils.clamp(camera.fov,20,110);camera.fov=f;camera.updateProjectionMatrix();$('align-fov').value=f;$('align-fov-value').value=f.toFixed(1)+'°';}
 function toStart(){const s=items[index].start;camera.position.set(s.p[0],s.p[1]+1.62,s.p[2]);camera.lookAt(new THREE.Vector3(...s.target));camera.fov=s.fov||48;enter();lens();}
 function show(i){
  index=(i+items.length)%items.length;const item=items[index];
  try{localStorage.setItem(POSITION,item.id);}catch{}
  const record=saved.get(item.id);
  $('align-title').textContent=item.filename;$('align-reason').textContent=item.label+(item.reason?' — '+item.reason:'');
  const done=items.filter(it=>saved.has(it.id)).length;$('align-count').textContent=`${index+1} / ${items.length} · ${done} saved`;
  $('align-notes').value=record?.notes||'';$('align-save').disabled=true;
  photo.src=overlay.src=item.url;
  if(record){camera.position.fromArray(record.camera.position);camera.quaternion.fromArray(record.camera.quaternion).normalize();camera.fov=record.camera.verticalFov;enter();lens();status('Saved pose restored.');}
  else{toStart();status('Starting camera is a rough guess for this area.');}
 }
 photo.onload=()=>{$('align-save').disabled=false;layout();};
 photo.onerror=()=>status('This photo could not be loaded. Press N to skip it.');
 function save(){
  const item=items[index];if(!photo.naturalWidth){status('Wait for the photo to finish loading.');return false;}
  const p=camera.position,q=camera.quaternion;
  saved.set(item.id,{id:item.id,filename:item.filename,sha256:null,notes:$('align-notes').value,camera:{position:p.toArray(),quaternion:q.toArray(),direction:camera.getWorldDirection(new THREE.Vector3()).toArray(),verticalFov:camera.fov,aspect:camera.aspect},image:{width:photo.naturalWidth,height:photo.naturalHeight,fit:'exact'},viewport:{width:innerWidth,height:innerHeight},savedAt:new Date().toISOString()});
  if(!persist())status('Browser storage is unavailable; export now to keep poses.');return true;
 }
 function next(){const start=index;for(let k=1;k<=items.length;k++){const i=(start+k)%items.length;if(!saved.has(items[i].id)){show(i);return;}}show(start+1);}
 function saveNext(){if(save()){const name=items[index].filename;next();status(`Saved ${name}.`);}}
 function setGhost(on){ghost=on;overlay.hidden=!on;$('align-ghost').classList.toggle('active',on);}
 async function open(){
  active=true;setAligning(true);release();$('photos').hidden=true;$('settings').hidden=true;
  document.body.classList.add('aligning-photo');stage.hidden=false;panel.hidden=false;
  if(!items.length){items=await loadQueue();if(diskSync&&saved.size)persist();}
  let last=null;try{last=localStorage.getItem(POSITION);}catch{}
  const at=items.findIndex(it=>it.id===last);show(at>=0?at:0);layout();$('align-save').focus();
 }
 function close(){active=false;setAligning(false);panel.hidden=true;stage.hidden=true;setGhost(false);document.body.classList.remove('aligning-photo');
  const world=$('world');for(const k of ['left','top','width','height','right','bottom'])world.style[k]='';resize(innerWidth,innerHeight);release();$('photos').hidden=false;button.focus();}
 button.onclick=open;$('align-close').onclick=close;
 $('align-save').onclick=saveNext;$('align-skip').onclick=()=>show(index+1);$('align-prev').onclick=()=>show(index-1);
 $('align-ghost').onclick=()=>setGhost(!ghost);$('align-start').onclick=toStart;
 $('align-fov').oninput=e=>{camera.fov=+e.target.value;lens();};
 addEventListener('resize',()=>{if(active)requestAnimationFrame(layout);});
 // Capture phase so Space never activates a focused button or scrolls.
 addEventListener('keydown',e=>{
  if(!active)return;const typing=['TEXTAREA','SELECT'].includes(e.target.tagName)||(e.target.tagName==='INPUT'&&!['range','file'].includes(e.target.type));
  if(e.code==='Escape'&&typing){e.target.blur();return;}
  if(typing)return;
  const fine=e.altKey?.2:e.shiftKey?4:1;
  if(e.code==='Space'){e.preventDefault();e.stopPropagation();if(!e.repeat)saveNext();}
  else if(e.code==='KeyN'){e.preventDefault();show(index+1);}
  else if(e.code==='KeyP'){e.preventDefault();show(index-1);}
  else if(e.code==='KeyG'){e.preventDefault();setGhost(!ghost);}
  else if(e.code==='KeyR'){e.preventDefault();toStart();}
  else if(e.code==='KeyQ'||e.code==='KeyE'){e.preventDefault();camera.position.y+=(e.code==='KeyE'?1:-1)*.05*fine;}
  else if(e.code==='KeyZ'||e.code==='KeyX'){e.preventDefault();camera.fov+=(e.code==='KeyZ'?-1:1)*.5*fine;lens();}
  else if(e.altKey&&['KeyW','KeyA','KeyS','KeyD'].includes(e.code)){e.preventDefault();e.stopPropagation();
   const v=new THREE.Vector3(e.code==='KeyD'?1:e.code==='KeyA'?-1:0,0,e.code==='KeyW'?-1:e.code==='KeyS'?1:0).applyQuaternion(camera.quaternion);camera.position.addScaledVector(v,.02);}
 },true);
 $('align-export').onclick=()=>{const data=exportData();const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='shankaranarayana-photo-poses.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status(`Exported ${saved.size} saved pose(s).`);};
 $('align-import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2*1024*1024)throw Error('Alignment file is too large.');const data=JSON.parse(await file.text());if(data.schema!=='shankaranarayana-photo-poses'||data.version!==1||!Array.isArray(data.poses)||data.poses.length>1000||!data.poses.every(valid))throw Error('This is not a valid photo-alignment export.');for(const r of data.poses)saved.set(r.id,{...r,notes:String(r.notes||'').slice(0,1000)});persist();show(index);status(`Imported ${data.poses.length} poses.`);}catch(err){status(err.message);}finally{e.target.value='';}};
 return {get active(){return active;},close,layout,get saved(){return saved;},get items(){return items;}};
}
