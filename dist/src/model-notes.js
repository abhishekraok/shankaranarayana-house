// Local-only "note here" tool. Press N while walking to write a note about the model at the
// current camera position and view; notes are saved to the private photo folder through the
// local server (align-model-notes.json). The deployed static site has no /model-version
// endpoint, so nothing here appears there.
const SCHEMA='shankaranarayana-model-notes';
const FILE='./local-photos/align-model-notes.json';

export async function installModelNotes({camera,release,place,teleport,isBusy}){
  const local=['127.0.0.1','localhost','[::1]'].includes(location.hostname);
  if(!local)return;
  let model=null;
  try{const r=await fetch('./model-version',{cache:'no-store'});if(!r.ok)return;model=await r.json();}catch{return;}
  let notes=[];
  try{const r=await fetch(FILE,{cache:'no-store'});if(r.ok){const d=await r.json();if(d.schema===SCHEMA&&Array.isArray(d.notes))notes=d.notes;}}catch{}

  const style=document.createElement('style');
  style.textContent=`#note-btn{position:absolute;top:84px;right:34px;padding:7px 12px;border:1px solid #ffffff45;border-radius:16px;background:#23372fcc;font-size:11px;z-index:4}
#note-dialog{max-width:560px}#note-dialog h2{font-size:24px;margin:0 0 6px}#note-where{font-size:11px;color:#c9d2bc;margin:0 0 12px}
#note-text{width:100%;min-height:110px;background:#17291f;color:#eee9d9;border:1px solid #dbcfa342;border-radius:4px;padding:10px;font:13px/1.5 Arial,sans-serif;resize:vertical}
#note-actions{display:flex;gap:10px;margin-top:12px;align-items:center}#note-actions button{padding:8px 14px;border:1px solid #dbcfa342;border-radius:3px}#note-save{background:#eee6ce;color:#21382e}
#note-status{font-size:11px;color:#e3cb96;margin-left:auto}#note-list{list-style:none;padding:0;margin:18px 0 0;max-height:34vh;overflow:auto;font-size:12px}
#note-list li{display:flex;gap:8px;align-items:baseline;padding:6px 0;border-top:1px solid #e5dec52b}#note-list li span{flex:1}#note-list small{color:#c9d2bc}
#note-list button{font-size:11px;color:#dac99b;padding:2px 4px}`;
  document.head.append(style);
  const btn=document.createElement('button');btn.id='note-btn';btn.textContent='Note here (N)';btn.title='Write a note about the model at this spot (local only)';
  const dlg=document.createElement('dialog');dlg.id='note-dialog';
  dlg.innerHTML=`<button class="close" id="note-close" aria-label="Close">×</button><h2>Note here</h2><p id="note-where"></p>
<textarea id="note-text" placeholder="What is wrong or missing here? e.g. 'There was a well with a low round wall about here, 1.5 m across.'"></textarea>
<div id="note-actions"><button id="note-save">Save note</button><button id="note-cancel">Cancel</button><span id="note-status"></span></div>
<ul id="note-list"></ul>`;
  document.body.append(btn,dlg);
  const $=id=>document.getElementById(id);
  const fmt=v=>v.map(n=>n.toFixed(2)).join(', ');
  let pending=null;

  function snapshot(){
    const dir=camera.getWorldDirection(camera.position.clone());
    return {position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),direction:dir.toArray(),verticalFov:camera.fov,aspect:camera.aspect};
  }
  function renderList(){
    const list=$('note-list');list.replaceChildren();
    for(const n of [...notes].reverse()){
      const li=document.createElement('li'),text=document.createElement('span'),when=document.createElement('small');
      text.textContent=n.text;when.textContent=n.place||'';
      const go=document.createElement('button');go.textContent='Go';go.onclick=()=>{dlg.close();teleport(n.camera);};
      const del=document.createElement('button');del.textContent='Delete';del.onclick=async()=>{notes=notes.filter(x=>x.id!==n.id);renderList();await save();};
      li.append(text,when,go,del);list.append(li);
    }
  }
  async function save(){
    try{const r=await fetch(FILE,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schema:SCHEMA,version:1,notes})});
      $('note-status').textContent=r.ok?'Saved to the photo folder':'Could not save (is the server running with --photos?)';return r.ok;}
    catch{$('note-status').textContent='Could not save';return false;}
  }
  async function refreshModel(){try{const r=await fetch('./model-version',{cache:'no-store'});if(r.ok)model=await r.json();}catch{}}
  function open(){
    if(dlg.open||isBusy())return;
    release();refreshModel();
    pending={camera:snapshot(),place:place()};
    $('note-where').textContent=`${pending.place} · position ${fmt(pending.camera.position)}`;
    $('note-text').value='';$('note-status').textContent=notes.length?`${notes.length} earlier note${notes.length>1?'s':''} below`:'';
    renderList();dlg.showModal();$('note-text').focus();
  }
  async function commit(){
    const text=$('note-text').value.trim();if(!text||!pending)return;
    notes.push({id:`note-${Date.now().toString(36)}`,savedAt:new Date().toISOString(),text,place:pending.place,camera:pending.camera,model});
    if(await save()){pending=null;dlg.close();}
  }
  btn.onclick=open;
  $('note-save').onclick=commit;$('note-cancel').onclick=$('note-close').onclick=()=>dlg.close();
  $('note-text').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();commit();}e.stopPropagation();});
  addEventListener('keydown',e=>{
    if(e.code!=='KeyN'||e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;
    if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)||document.querySelector('dialog[open]'))return;
    if(isBusy())return;e.preventDefault();open();
  });
}
