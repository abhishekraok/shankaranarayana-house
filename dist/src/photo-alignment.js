import * as THREE from 'three';
const STORAGE='shankaranarayana.photo-poses.v1',POSITION='shankaranarayana.align-position.v1',DISCARDED='shankaranarayana.align-discarded.v1';
// Side-by-side photo alignment. The 3D view is sized to the photo's exact aspect
// ratio beside it, so a saved pose reproduces the photo framing without cropping.
// Local runs started with `node server.mjs --photos DIR` load DIR/align-queue.json
// (tools/align-queue.mjs) and work through it most-uncertain first.
// Open directly with ?align (resume) or ?align=14.59.54 (first filename match).
// Discard hides a useless photo from the queue (DIR/align-discarded.json); the
// file itself is never deleted, and Restore brings it back.
export function installPhotoAlignment({camera,photos,enter,release,resize,setAligning,groundY}){
 // Eye height of the photographer (1.8 m tall), used by the H key and the readout.
 const EYE=1.68;
 const $=id=>document.getElementById(id);
 let items=[],index=0,active=false,saved=new Map(),discarded=new Set(),ghost=false,diskSync=false;
 const stage=document.createElement('div');stage.id='align-stage';stage.hidden=true;
 stage.innerHTML=`<img id="align-photo-view" alt=""><img id="alignment-overlay" alt="" hidden>`;
 document.body.append(stage);
 const panel=document.createElement('section');panel.id='photo-alignment';panel.hidden=true;panel.setAttribute('aria-label','Align photographs');
 panel.innerHTML=`<div class="align-row"><strong id="align-title"></strong><span id="align-reason"></span><span id="align-count"></span><select id="align-jump" aria-label="Go to photo" title="Go to any photo, in queue order"></select></div>
 <div class="align-row"><button id="align-prev" title="Previous photo (P)">‹ Prev</button><button id="align-skip" title="Next photo without saving (N)">Skip ›</button><button id="align-save" class="primary-action" title="Save pose and go to the next photo (Space)">Save &amp; next <kbd>Space</kbd></button><button id="align-discard" title="Useless photo: hide it from the queue (Delete). The file is kept.">Discard <kbd>Del</kbd></button>
 <span id="align-height" title="Camera height above the ground below it (H snaps to 1.68 m standing eye height)"></span><label class="align-fov">FOV <output id="align-fov-value"></output><input id="align-fov" type="range" min="20" max="110" step=".1"></label>
 <button id="align-ghost" title="Overlay the photo on the 3D view (G)">Ghost</button><button id="align-start" title="Back to this photo's starting camera (R)">Reset</button>
 <input id="align-notes" maxlength="1000" placeholder="Notes: where were you standing? what differs?">
 <button id="align-export">Export JSON</button><label class="align-file">Import<input id="align-import" type="file" accept="application/json,.json"></label><button id="align-close" aria-label="Close photo alignment">Close</button></div>
 <p class="align-help"><b>Drag</b> look · <b>WASD</b> move (passes through walls) · <b>Q/E</b> down/up · <b>H</b> standing eye height · <b>Shift</b> faster, <b>Alt</b> finer · <b>Wheel</b> forward · <b>Z/X</b> zoom · <b>G</b> ghost · <b>Space</b> save &amp; next · <b>Del</b> discard · <b>Gamepad</b> sticks move/look, A save, B skip, X ghost, Y eye height, LB back, D-pad up/down height, LT fine, RT fast · <span id="align-status" role="status"></span></p>`;
 document.body.append(panel);
 const button=document.createElement('button');button.id='align-photo';button.textContent='Align photos';$('photos').append(button);
 const photo=$('align-photo-view'),overlay=$('alignment-overlay');
 const status=text=>$('align-status').textContent=text;
 const valid=r=>r&&typeof r.id==='string'&&r.id.length<300&&typeof r.filename==='string'&&r.filename.length<300&&r.camera&&['position','quaternion'].every(k=>Array.isArray(r.camera[k])&&r.camera[k].length===(k==='position'?3:4)&&r.camera[k].every(Number.isFinite))&&r.camera.position.every(v=>Math.abs(v)<1000)&&Math.abs(Math.hypot(...r.camera.quaternion)-1)<.01&&Number.isFinite(r.camera.verticalFov)&&r.camera.verticalFov>=20&&r.camera.verticalFov<=110;
 try{const records=JSON.parse(localStorage.getItem(STORAGE)||'[]');if(Array.isArray(records))for(const r of records)if(valid(r))saved.set(r.id,r);}catch{}
 const exportData=()=>({schema:'shankaranarayana-photo-poses',version:1,coordinates:'Three.js world metres; Y up; camera position is eye position (not feet)',exportedAt:new Date().toISOString(),poses:[...saved.values()]});
 // With a local photo queue, every save is also written to the photo folder by server.mjs.
 const sync=()=>{if(diskSync)fetch('./local-photos/align-poses.json',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(exportData())}).then(r=>{if(!r.ok)status('Could not write poses to the photo folder; use Export.');}).catch(()=>status('Could not write poses to the photo folder; use Export.'));};
 const persist=(writeDisk=true)=>{if(writeDisk)sync();try{localStorage.setItem(STORAGE,JSON.stringify([...saved.values()]));return true;}catch{return false;}};
 try{const list=JSON.parse(localStorage.getItem(DISCARDED)||'[]');if(Array.isArray(list))for(const id of list)if(typeof id==='string')discarded.add(id);}catch{}
 const persistDiscarded=()=>{try{localStorage.setItem(DISCARDED,JSON.stringify([...discarded]));}catch{}
  if(diskSync)fetch('./local-photos/align-discarded.json',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schema:'shankaranarayana-align-discarded',version:1,files:[...discarded].filter(id=>id.startsWith('file:')).map(id=>id.slice(5))})}).then(r=>{if(!r.ok)status('Could not write the discard list to the photo folder.');}).catch(()=>status('Could not write the discard list to the photo folder.'));};
 const bundled=()=>Object.entries(photos).map(([key,p])=>({id:'asset:'+key,filename:p.url,url:'./assets/'+p.url,label:p.caption||key,reason:'Bundled reference photo.',start:{p:p.p,target:p.target,fov:p.fov||null}}));
 async function loadQueue(){
  try{const r=await fetch('./local-photos/align-queue.json',{cache:'no-store'});if(r.ok){const data=await r.json();if(data.schema==='shankaranarayana-align-queue'&&Array.isArray(data.items)&&data.items.length)
   diskSync=true;
   try{const d=await fetch('./local-photos/align-poses.json',{cache:'no-store'});if(d.ok){const disk=await d.json();for(const r of disk.poses||[])if(valid(r)&&(!saved.has(r.id)||saved.get(r.id).savedAt<r.savedAt))saved.set(r.id,r);}}catch{}
   // The folder's discard list is authoritative, so discards follow you between browsers.
   try{const d=await fetch('./local-photos/align-discarded.json',{cache:'no-store'});if(d.ok){const disk=await d.json();if(disk.schema==='shankaranarayana-align-discarded'&&Array.isArray(disk.files)){for(const id of [...discarded])if(id.startsWith('file:'))discarded.delete(id);for(const f of disk.files)if(typeof f==='string')discarded.add('file:'+f);}}}catch{}
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
 function snapEye(){if(!groundY)return;camera.position.y=groundY(camera.position.x,camera.position.z,camera.position.y-1.2)+EYE;showHeight();}
 function showHeight(){if(!groundY)return;const h=camera.position.y-groundY(camera.position.x,camera.position.z,camera.position.y-1.2);const el=$('align-height');el.textContent=`Eye ${h.toFixed(2)} m`;el.classList.toggle('align-height-off',Math.abs(h-EYE)>.25);}
 setInterval(()=>{if(active)showHeight();},250);
 // 2011 photos (and the bundled copies of them) share one fixed 3.43 mm lens.
 const FIXED_FOV=48,fixedLens=it=>it&&(/^2011-/.test(it.filename)||it.id.startsWith('asset:'));
 function lens(){const f=THREE.MathUtils.clamp(camera.fov,20,110);camera.fov=f;camera.updateProjectionMatrix();$('align-fov').value=f;$('align-fov-value').value=f.toFixed(1)+'°';}
 function toStart(){const s=items[index].start;camera.position.set(s.p[0],s.p[1]+1.62,s.p[2]);camera.lookAt(new THREE.Vector3(...s.target));camera.fov=fixedLens(items[index])?FIXED_FOV:(s.fov||FIXED_FOV);enter();lens();}
 const mark=it=>discarded.has(it.id)?'✕':saved.has(it.id)?'✓':'·';
 function refreshJump(){
  const jump=$('align-jump');
  if(jump.options.length!==items.length){jump.replaceChildren(...items.map((it,i)=>{const o=document.createElement('option');o.value=i;return o;}));}
  items.forEach((it,i)=>{jump.options[i].textContent=`${mark(it)} ${i+1}. ${it.filename.replace(/^2011-09-21 /,'')} — ${it.label}`.slice(0,110);});
  jump.value=index;
 }
 function refreshCounts(){
  const item=items[index],done=items.filter(it=>saved.has(it.id)&&!discarded.has(it.id)).length,gone=items.filter(it=>discarded.has(it.id)).length;
  const r=routeAt();$('align-count').textContent=(r>=0?`List ${r+1} / ${route.length} · `:'')+`${index+1} / ${items.length} · ${done} saved`+(gone?` · ${gone} discarded`:'');
  const isGone=discarded.has(item.id);$('align-discard').innerHTML=isGone?'Restore':'Discard <kbd>Del</kbd>';
  $('align-discard').title=isGone?'Put this photo back in the queue':'Useless photo: hide it from the queue (Delete). The file is kept.';
  $('align-title').classList.toggle('discarded',isGone);refreshJump();
 }
 // Photos taken minutes apart were usually taken a few steps apart, so an unsaved photo
 // starts from the saved pose nearest to it in time rather than the area's rough guess.
 const shotTime=name=>{const m=/(\d{4})-(\d\d)-(\d\d) (\d\d)\.(\d\d)\.(\d\d)/.exec(name||'');return m?Date.UTC(+m[1],m[2]-1,+m[3],+m[4],+m[5],+m[6])/1000:null;};
 function nearestSaved(item){const t=shotTime(item.filename);if(t===null)return null;let best=null;
  for(const record of saved.values()){if(record.id===item.id||discarded.has(record.id))continue;const u=shotTime(record.filename);if(u===null)continue;const seconds=Math.abs(u-t);
   if(seconds<=600&&(!best||seconds<best.seconds))best={record,seconds,after:u>t};}
  return best;}
 function show(i){
  index=(i+items.length)%items.length;const item=items[index];
  try{localStorage.setItem(POSITION,item.id);}catch{}
  const record=saved.get(item.id);
  $('align-title').textContent=item.filename;$('align-reason').textContent=item.label+(item.reason?' — '+item.reason:'');
  refreshCounts();
  $('align-notes').value=record?.notes||'';$('align-save').disabled=true;
  photo.src=overlay.src=item.url;
  if(record){camera.position.fromArray(record.camera.position);camera.quaternion.fromArray(record.camera.quaternion).normalize();camera.fov=fixedLens(item)?FIXED_FOV:record.camera.verticalFov;enter();lens();status('Saved pose restored'+(fixedLens(item)&&Math.abs(record.camera.verticalFov-FIXED_FOV)>.5?` (its saved ${record.camera.verticalFov.toFixed(1)}° FOV reset to ${FIXED_FOV}°).`:'.'));}
  else{const near=nearestSaved(item);
   if(near){camera.position.fromArray(near.record.camera.position);camera.quaternion.fromArray(near.record.camera.quaternion).normalize();camera.fov=fixedLens(item)?FIXED_FOV:near.record.camera.verticalFov;enter();lens();
    status(`Starting from your pose for ${near.record.filename}, taken ${near.seconds<60?Math.round(near.seconds)+' s':Math.round(near.seconds/60)+' min'} ${near.after?'later':'earlier'}.`);}
   else{toStart();status('Starting camera is a rough guess for this area.');}}
  if(discarded.has(item.id))status('This photo is discarded. Press Restore to put it back in the queue.');
 }
 // Prev/Skip step through the live queue, passing over discarded photos.
 let route=null;
 const routeAt=()=>route?route.indexOf(index):-1;
 function step(dir){if(route){const r=routeAt();show(route[((r<0?(dir>0?-1:0):r)+dir+route.length)%route.length]);return;}if(items.every(it=>discarded.has(it.id))){show(index+dir);return;}let i=index;do{i=(i+dir+items.length)%items.length;}while(discarded.has(items[i].id));show(i);}
 photo.onload=()=>{$('align-save').disabled=false;layout();};
 photo.onerror=()=>status('This photo could not be loaded. Press N to skip it.');
 function save(){
  const item=items[index];if(!photo.naturalWidth){status('Wait for the photo to finish loading.');return false;}
  const p=camera.position,q=camera.quaternion;
  saved.set(item.id,{id:item.id,filename:item.filename,sha256:null,notes:$('align-notes').value,camera:{position:p.toArray(),quaternion:q.toArray(),direction:camera.getWorldDirection(new THREE.Vector3()).toArray(),verticalFov:camera.fov,aspect:camera.aspect},image:{width:photo.naturalWidth,height:photo.naturalHeight,fit:'exact'},viewport:{width:innerWidth,height:innerHeight},savedAt:new Date().toISOString()});
  if(!persist())status('Browser storage is unavailable; export now to keep poses.');return true;
 }
 function next(){if(route){const r=routeAt();if(r>=route.length-1){status('That was the last photo in this list. Thank you!');refreshCounts();return;}show(route[r+1]);return;}const start=index;for(let k=1;k<=items.length;k++){const i=(start+k)%items.length;if(!saved.has(items[i].id)&&!discarded.has(items[i].id)){show(i);return;}}step(1);}
 function saveNext(){if(discarded.has(items[index].id)){status('Restore this photo before saving a pose for it.');return;}if(save()){const name=items[index].filename;next();status(`Saved ${name}.`);}}
 function toggleDiscard(){const item=items[index];
  if(discarded.has(item.id)){discarded.delete(item.id);persistDiscarded();refreshCounts();status(`Restored ${item.filename} to the queue.`);return;}
  discarded.add(item.id);persistDiscarded();next();status(`Discarded ${item.filename}. It stays in the folder; pick it from the list to restore it.`);}
 function setGhost(on){ghost=on;overlay.hidden=!on;$('align-ghost').classList.toggle('active',on);}
 async function open(find=''){
  active=true;setAligning(true);release();$('photos').hidden=true;$('settings').hidden=true;
  document.body.classList.add('aligning-photo');stage.hidden=false;panel.hidden=false;
  // Opening the viewer may refresh the browser cache, but must not rewrite the
  // source pose file. Disk writes belong to explicit Save or Import actions.
  if(!items.length){items=await loadQueue();if(diskSync&&saved.size)persist(false);}
  let last=null;try{last=localStorage.getItem(POSITION);}catch{}
  const match=f=>items.findIndex(it=>it.filename.toLowerCase().includes(f.toLowerCase()));
  const parts=find.split(',').map(f=>f.trim()).filter(Boolean);
  route=parts.length>1?parts.map(match).filter(i=>i>=0):null;if(route&&!route.length)route=null;
  const wanted=route?route[0]:find?match(find):-1;
  const at=wanted>=0?wanted:items.findIndex(it=>it.id===last);
  // With no remembered position, start at the first photo still needing work.
  const first=items.findIndex(it=>!saved.has(it.id)&&!discarded.has(it.id));
  show(at>=0?at:Math.max(0,first));layout();$('align-save').focus();
  if(find&&wanted<0)status(`No photo matches “${find}”; resumed where you left off.`);
 }
 function close(){active=false;setAligning(false);panel.hidden=true;stage.hidden=true;setGhost(false);document.body.classList.remove('aligning-photo');
  const world=$('world');for(const k of ['left','top','width','height','right','bottom'])world.style[k]='';resize(innerWidth,innerHeight);release();$('photos').hidden=false;button.focus();}
 button.onclick=()=>open();$('align-close').onclick=close;
 $('align-save').onclick=saveNext;$('align-skip').onclick=()=>step(1);$('align-prev').onclick=()=>step(-1);$('align-discard').onclick=toggleDiscard;
 $('align-jump').onchange=e=>{show(+e.target.value);e.target.blur();};
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
  else if(e.code==='KeyN'){e.preventDefault();step(1);}
  else if(e.code==='KeyP'){e.preventDefault();step(-1);}
  else if(e.code==='Delete'){e.preventDefault();if(!e.repeat)toggleDiscard();}
  else if(e.code==='KeyG'){e.preventDefault();setGhost(!ghost);}
  else if(e.code==='KeyR'){e.preventDefault();toStart();}
  else if(e.code==='KeyH'){e.preventDefault();snapEye();}
  else if(e.code==='KeyQ'||e.code==='KeyE'){e.preventDefault();camera.position.y+=(e.code==='KeyE'?1:-1)*.05*fine;}
  else if(e.code==='KeyZ'||e.code==='KeyX'){e.preventDefault();camera.fov+=(e.code==='KeyZ'?-1:1)*.5*fine;lens();}
  else if(e.altKey&&['KeyW','KeyA','KeyS','KeyD'].includes(e.code)){e.preventDefault();e.stopPropagation();
   const v=new THREE.Vector3(e.code==='KeyD'?1:e.code==='KeyA'?-1:0,0,e.code==='KeyW'?-1:e.code==='KeyS'?1:0).applyQuaternion(camera.quaternion);camera.position.addScaledVector(v,.02);}
 },true);
 $('align-export').onclick=()=>{const data=exportData();const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='shankaranarayana-photo-poses.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status(`Exported ${saved.size} saved pose(s).`);};
 $('align-import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2*1024*1024)throw Error('Alignment file is too large.');const data=JSON.parse(await file.text());if(data.schema!=='shankaranarayana-photo-poses'||data.version!==1||!Array.isArray(data.poses)||data.poses.length>1000||!data.poses.every(valid))throw Error('This is not a valid photo-alignment export.');for(const r of data.poses)saved.set(r.id,{...r,notes:String(r.notes||'').slice(0,1000)});persist();show(index);status(`Imported ${data.poses.length} poses.`);}catch(err){status(err.message);}finally{e.target.value='';}};
 const commands={saveNext,skip:()=>step(1),prev:()=>step(-1),ghost:()=>setGhost(!ghost),eye:snapEye};
 return {get active(){return active;},command:name=>{if(active)commands[name]?.();},open,close,layout,get saved(){return saved;},get items(){return items;},get discarded(){return discarded;}};
}
