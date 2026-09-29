import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const port=Number(process.env.PORT||4173);
// Optional private photo folder for the local alignment queue: node server.mjs --photos "F:/Photos"
// Only flat image/JSON files are served, never subfolders, and only on 127.0.0.1.
const photoArg=process.argv.indexOf('--photos');
const photoDir=photoArg>0&&process.argv[photoArg+1]?path.resolve(process.argv[photoArg+1]):null;
// Saved poses are stamped with the model commit they were fitted to (/model-version).
// If the photo folder is its own local git repository, every save is committed there too,
// so the pose history can be recovered. Nothing is ever pushed.
const repo=path.dirname(fileURLToPath(import.meta.url));
const git=(cwd,args)=>new Promise(done=>execFile('git',['-C',cwd,...args],{windowsHide:true},(err,out)=>done(err?null:out.trim())));
async function modelVersion(){
 const [commit,changes]=await Promise.all([git(repo,['rev-parse','HEAD']),git(repo,['status','--porcelain','--','dist/src'])]);
 return {commit,dirty:changes===null?null:changes.length>0};
}
let poseCommits=Promise.resolve();
function commitPoseFile(name){
 if(!photoDir||!fs.existsSync(path.join(photoDir,'.git')))return;
 poseCommits=poseCommits.then(async()=>{
  if(await git(photoDir,['add','--',name])===null)return;
  const v=await modelVersion();
  await git(photoDir,['commit','-q','-m',`${name} saved (model ${v.commit?v.commit.slice(0,10):'unknown'}${v.dirty?' + uncommitted edits':''})`,'--',name]);
 });
}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
function send(res,file){fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);});}
http.createServer((req,res)=>{let rel;try{rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
 // Alignment saves and the discard list are mirrored to the photo folder so they
 // survive browser changes. Discarding never deletes or moves a photo.
 const writable={'/local-photos/align-poses.json':d=>d.schema==='shankaranarayana-photo-poses'&&Array.isArray(d.poses),
  '/local-photos/align-model-notes.json':d=>d.schema==='shankaranarayana-model-notes'&&Array.isArray(d.notes)&&d.notes.every(n=>typeof n.text==='string'&&n.text.length<5000&&Array.isArray(n.camera?.position)),
  '/local-photos/align-discarded.json':d=>d.schema==='shankaranarayana-align-discarded'&&Array.isArray(d.files)&&d.files.every(f=>typeof f==='string'&&f.length<300)};
 if(req.method==='POST'&&writable[rel]&&photoDir){
  let body='';req.setEncoding('utf8');
  req.on('data',c=>{body+=c;if(body.length>4e6){res.writeHead(413);res.end();req.destroy();}});
  req.on('end',()=>{try{const data=JSON.parse(body);if(!writable[rel](data))throw Error();
   fs.writeFile(path.join(photoDir,path.basename(rel)),JSON.stringify(data,null,1),err=>{res.writeHead(err?500:204);res.end();if(!err)commitPoseFile(path.basename(rel));});}
   catch{res.writeHead(400);res.end();}});
  return;
 }
 if(rel==='/model-version'){modelVersion().then(v=>{res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(v));});return;}
 if(rel.startsWith('/local-photos/')){
  const name=rel.slice('/local-photos/'.length);
  if(!photoDir||!name||/[\\/]/.test(name)||name.startsWith('.')||!['.jpg','.jpeg','.png','.webp','.json'].includes(path.extname(name).toLowerCase())){res.writeHead(404);res.end('Not found');return;}
  send(res,path.join(photoDir,name));return;
 }
 const file=path.resolve(root,'.'+(rel==='/'?'/index.html':rel));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 send(res,file);
}).listen(port,'127.0.0.1',()=>console.log(`Shankaranarayana walkthrough: http://127.0.0.1:${port}${photoDir?`\nAlignment photos: ${photoDir}`:''}`));
