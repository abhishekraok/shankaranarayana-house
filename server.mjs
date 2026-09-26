import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const port=Number(process.env.PORT||4173);
// Optional private photo folder for the local alignment queue: node server.mjs --photos "F:/Photos"
// Only flat image/JSON files are served, never subfolders, and only on 127.0.0.1.
const photoArg=process.argv.indexOf('--photos');
const photoDir=photoArg>0&&process.argv[photoArg+1]?path.resolve(process.argv[photoArg+1]):null;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
function send(res,file){fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);});}
http.createServer((req,res)=>{let rel;try{rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
 // Alignment saves and the discard list are mirrored to the photo folder so they
 // survive browser changes. Discarding never deletes or moves a photo.
 const writable={'/local-photos/align-poses.json':d=>d.schema==='shankaranarayana-photo-poses'&&Array.isArray(d.poses),
  '/local-photos/align-discarded.json':d=>d.schema==='shankaranarayana-align-discarded'&&Array.isArray(d.files)&&d.files.every(f=>typeof f==='string'&&f.length<300)};
 if(req.method==='POST'&&writable[rel]&&photoDir){
  let body='';req.setEncoding('utf8');
  req.on('data',c=>{body+=c;if(body.length>4e6){res.writeHead(413);res.end();req.destroy();}});
  req.on('end',()=>{try{const data=JSON.parse(body);if(!writable[rel](data))throw Error();
   fs.writeFile(path.join(photoDir,path.basename(rel)),JSON.stringify(data,null,1),err=>{res.writeHead(err?500:204);res.end();});}
   catch{res.writeHead(400);res.end();}});
  return;
 }
 if(rel.startsWith('/local-photos/')){
  const name=rel.slice('/local-photos/'.length);
  if(!photoDir||!name||/[\\/]/.test(name)||name.startsWith('.')||!['.jpg','.jpeg','.png','.webp','.json'].includes(path.extname(name).toLowerCase())){res.writeHead(404);res.end('Not found');return;}
  send(res,path.join(photoDir,name));return;
 }
 const file=path.resolve(root,'.'+(rel==='/'?'/index.html':rel));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 send(res,file);
}).listen(port,'127.0.0.1',()=>console.log(`Shankaranarayana walkthrough: http://127.0.0.1:${port}${photoDir?`\nAlignment photos: ${photoDir}`:''}`));
