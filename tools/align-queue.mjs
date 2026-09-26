// Builds align-queue.json inside a private photo folder for the local alignment tool.
// Usage: node tools/align-queue.mjs "F:/Shankaranarayana"
// Photos are ordered most-uncertain first: never compared with the model, then
// located only by area, then photos that already have a curated viewpoint.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir=path.resolve(process.argv[2]||'.');
const repo=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const images=fs.readdirSync(dir).filter(f=>/\.(jpe?g|png|webp)$/i.test(f)).sort();

function parseCsv(text){const rows=[];let r=[],f='',q=false;for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'){if(text[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}else if(c==='"')q=true;else if(c===','){r.push(f);f='';}else if(c==='\n'){r.push(f.replace(/\r$/,''));rows.push(r);r=[];f='';}else f+=c;}if(f||r.length){r.push(f);rows.push(r);}return rows;}
const audit=new Map();
const csvPath=path.join(dir,'photo-audit.csv');
if(fs.existsSync(csvPath)){const [head,...rows]=parseCsv(fs.readFileSync(csvPath,'utf8').replace(/^\uFEFF/,''));const col=n=>head.indexOf(n);for(const r of rows)if(r[col('current_filename')])audit.set(r[col('current_filename')],{location:r[col('location')]||'',status:r[col('status')]||''});}

// Curated photo viewpoints in main.js carry the photo time in their caption.
const main=fs.readFileSync(path.join(repo,'dist/src/main.js'),'utf8');
const curated=new Map();
// Viewpoints whose captions omit the photo time, as identified in PHOTO-REVIEW.md.
const aliases={laneleft:'14.28.15',laneright:'14.28.26',godroom:'14.32.31',courtyard:'14.52.24',templeroad:'14.58.48',templehouse:'14.59.36'};
for(const m of main.matchAll(/photos\.(\w+)=\{url:'[^']*',caption:'([^']*)',p:\[([^\]]+)\],target:\[([^\]]+)\](?:,fov:([\d.]+))?/g)){
 const time=m[2].match(/(\d\d\.\d\d\.\d\d)$/)?.[1]||aliases[m[1]];
 if(time)curated.set(time,{p:m[3].split(',').map(Number),target:m[4].split(',').map(Number),fov:m[5]?+m[5]:null});
}

// Rough starting cameras by area (feet position, look target). Temple rules precede house rules.
const areas=[
 [/inner sanctum|inner building|temple inner/i,{p:[39,.1,19.5],target:[39,1.6,24]}],
 [/outer circuit|vaulted shrine|side shrine/i,{p:[49.9,.1,22.4],target:[46.4,1.85,28.7]}],
 [/upper entrance gallery|entrance upper hall/i,{p:[39,4.08,5.4],target:[39,3.3,16.5]}],
 [/entrance platforms|paintings|bells/i,{p:[39,.2,3.05],target:[39,2.18,6.1]}],
 [/covered hall|temple right|recessed bay/i,{p:[30,.1,14],target:[26,1.6,20]}],
 [/temple entrance courtyard/i,{p:[30,.1,14],target:[41,2,17]}],
 [/pond|temple frontage and/i,{p:[42.3,.05,-6.5],target:[38.8,3.85,-1.2]}],
 [/temple frontage toward/i,{p:[23,.05,-3],target:[-30,1.8,-6]}],
 [/side lane/i,{p:[20.5,.05,-6.5],target:[17.5,2.4,11.5]}],
 [/shop/i,{p:[47,0,-8.7],target:[61.4,2.3,-24.5]}],
 [/stage/i,{p:[51,.05,-5],target:[60,5,-5]}],
 [/pavilion/i,{p:[28,-.29,-43.3],target:[28,1,-40]}],
 [/across (the )?lake/i,{p:[17.1,1.08,-45.4],target:[25,2.3,-1]}],
 [/lake from house/i,{p:[0,0,-8.7],target:[40,2,-9]}],
 [/upper floor/i,{p:[-2.65,3.85,1],target:[-2.65,4.9,-18]}],
 [/uphill road|cottage|road behind/i,{p:[-7,.05,-5],target:[-42,2,-6.7]}],
 [/house frontage|frontage and road/i,{p:[-1.4,.05,-9.5],target:[-.4,3,.4]}],
 [/outside veranda|front veranda|window, from inside/i,{p:[0,.45,1.18],target:[4.3,1.7,.35]}],
 [/courtyard|tulsi|stair|grove|ladder|pipe|grinding/i,{p:[-3.4,.04,6.85],target:[-5,1.2,11]}],
 [/god.room|entering|entrance|roof|clock|desk|house/i,{p:[0,.45,4.45],target:[0,1.8,6.92]}],
];
const queue=images.map(file=>{
 const info=audit.get(file)||{location:'',status:''};
 const time=file.match(/(\d\d\.\d\d\.\d\d)\.jpe?g$/i)?.[1];
 const known=time&&curated.get(time);
 const text=`${info.location} ${path.parse(file).name}`;
 const area=areas.find(([re])=>re.test(text));
 let score=0,reason;
 if(known){score=0;reason='Curated viewpoint exists; confirm or refine it.';}
 else if(/^where_/i.test(file)||!info.location){score=4;reason='Location unknown.';}
 else if(/contact sheet|pending/i.test(info.status)){score=3;reason='Only placed by area; never compared closely.';}
 else if(/inferred|pending|orientation/i.test(info.location)){score=2;reason='Location inferred; exact viewpoint unknown.';}
 else{score=1;reason='Area known; exact viewpoint unknown.';}
 const start=known||(area?area[1]:{p:[0,0,-2],target:[0,1.6,9]});
 return {file,label:info.location||path.parse(file).name,reason,score,start:{p:start.p,target:start.target,fov:start.fov||null}};
});
// Stable within each level: chronological order keeps panning sequences together.
queue.sort((a,b)=>b.score-a.score||a.file.localeCompare(b.file));
fs.writeFileSync(path.join(dir,'align-queue.json'),JSON.stringify({schema:'shankaranarayana-align-queue',version:1,generatedAt:new Date().toISOString(),items:queue},null,1));
const counts=queue.reduce((c,q)=>(c[q.score]=(c[q.score]||0)+1,c),{});
console.log(`Wrote ${queue.length} photos to ${path.join(dir,'align-queue.json')}; by uncertainty (4 = most):`,counts);
