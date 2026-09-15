const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL || undefined,headless:true,args:['--disable-gpu-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.houseWalk?.ready);
 assert.equal(await page.evaluate(()=>houseWalk.getState().mode),'tour');
 await page.evaluate(()=>houseWalk.teleport(houseWalk.destinations.front));
 await page.click('#orbit-btn');await page.click('#walk-btn');
 const introReturn=await page.evaluate(()=>houseWalk.getState());assert.ok(introReturn.position[2]>-3,'Aerial-to-Walk must not return to floating welcome camera');
 await page.keyboard.press('Escape');
 const destinationChecks=await page.evaluate(()=>Object.entries(houseWalk.destinations).map(([name,d])=>{houseWalk.teleport(d);const s=houseWalk.getState();return {name,collision:houseWalk.collision(s.position[0],s.position[2],s.feet),position:s.position}}));
 assert.ok(destinationChecks.every(x=>!x.collision),JSON.stringify(destinationChecks));
 const directions=await page.evaluate(()=>{
  const out=[];for(const [target,key] of [[[0,1.62,-20],'KeyW'],[[0,1.62,-20],'KeyD'],[[20,1.62,-5],'KeyW']]){houseWalk.teleport({p:[0,.051,-5],target});const before=houseWalk.camera.position.toArray();const after=houseWalk.moveFor(key,.5).position;out.push({before,after});}return out;
 });
 assert.ok(directions[0].after[2]<directions[0].before[2]-.7,'Forward -Z');assert.ok(directions[1].after[0]>directions[1].before[0]+.7,'Strafe +X');assert.ok(directions[2].after[0]>directions[2].before[0]+.7,'Forward +X');
 const plinth=await page.evaluate(()=>{houseWalk.teleport({p:[34,0,-4],target:[34,1.62,8]});return houseWalk.moveFor('KeyW',2.5);});assert.ok(plinth.position[2]<-2,'Cannot walk under temple platform: '+JSON.stringify(plinth));
 const routes=await page.evaluate(()=>{
  const H=houseWalk;
  function route(name,start,points){H.teleport({p:start,target:[points[0][0],start[1]+1.62,points[0][1]]});let results=[];
   for(const [x,z]of points){let state=H.getState();const dx=x-state.position[0],dz=z-state.position[2],distance=Math.hypot(dx,dz);H.teleport({p:[state.position[0],state.feet,state.position[2]],target:[x,state.position[1],z]});state=H.moveFor('KeyW',distance/2.6);results.push({target:[x,z],actual:[state.position[0],state.position[2]],feet:state.feet,error:Math.hypot(x-state.position[0],z-state.position[2])});}
   return {name,results};
  }
  return [route('inner sanctum aisles',[39,.1,13.6],[[39,20.2],[35.2,20.2],[35.2,27.8],[42.8,27.8],[42.8,20.2],[39,20.2],[39,13.6]]),route('covered hall',[26.1,.60,14.4],[[26.1,10.0],[25.2,10.0],[25.2,8.2]]),route('front passage',[0,0,-2],[[0,5.1]]),route('entrance to courtyard',[0,0,-2],[[0,5.25],[-4.9,5.25],[-4.9,7.0],[-3.7,7.0],[-3.7,11],[-5,10.8]]),route('house upstairs',[-13.3,.45,.95],[[-7.93,.95],[-2.65,.95]]),route('temple court',[39,0,-3.8],[[39,8.8],[33,8.8],[33,14]]),route('kitchen around courtyard stair',[-5,.035,10.8],[[-5,13],[-7.75,13],[-7.75,10.8],[-10.05,10.8],[-10.05,15.5]]),route('courtyard stair up',[-6.75,.035,12.8],[[-6.75,12.35],[-6.75,5.5]]),route('courtyard stair down',[-6.75,3.85,5.5],[[-6.75,12.35],[-6.75,12.8]]),route('lake paired stairs',[15.2,.055,-10.1],[[15.2,-12.65],[19.3,-12.65],[27.5,-12.65],[30.7,-12.65]]),route('lake paired stairs return',[30.7,.065,-12.65],[[27.5,-12.65],[19.3,-12.65],[15.2,-12.65],[15.2,-10.1]]),route('pavilion entry',[28,-.29,-43.3],[[28,-40]])];
 });
 await page.click('#orbit-btn');await page.waitForTimeout(200);await page.screenshot({path:'checks/aerial-final.png'});await page.click('#roof-btn');assert.equal(await page.getAttribute('#roof-btn','aria-pressed'),'true');
 await page.click('#photos-btn');assert.equal(await page.locator('#photos').isVisible(),true);await page.selectOption('#photo-select','house');await page.waitForFunction(()=>{const i=document.getElementById('reference-photo');return i.complete&&i.naturalWidth>0;});assert.ok(await page.locator('#reference-photo').evaluate(i=>i.complete&&i.naturalWidth>0));await page.click('#close-photos');await page.click('#roof-btn');
 await page.evaluate(()=>houseWalk.teleport({p:[17,.051,-4.7],target:[48,3.7,-4],fov:74}));await page.waitForTimeout(200);await page.screenshot({path:'checks/projecting-entrance.png'});
 await page.selectOption('#destination','house');await page.waitForTimeout(200);await page.screenshot({path:'checks/house-lower-attic.png'});
 await page.evaluate(()=>houseWalk.teleport({p:[11.0,.051,-6.9],target:[5.8,.95,-2.35],fov:43}));await page.waitForTimeout(200);await page.screenshot({path:'checks/ritz-rear.png'});
 await page.evaluate(()=>houseWalk.teleport(houseWalk.photos.laneleft));await page.waitForTimeout(200);await page.screenshot({path:'checks/lake-access-front.png'});
 await page.evaluate(()=>houseWalk.teleport({p:[-1,.055,-41.9],target:[28,1.2,-11.7],fov:62}));await page.waitForTimeout(200);await page.screenshot({path:'checks/lake-access-across.png'});
 await page.selectOption('#destination','courtyard');await page.waitForTimeout(200);await page.screenshot({path:'checks/courtyard-final.png'});
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>document.getElementById('explore-controls').hidden);
 assert.equal(await page.locator('#controls-toggle').isVisible(),true);
 assert.equal(await page.getAttribute('#controls-toggle','aria-expanded'),'false');
 await page.screenshot({path:'checks/mobile.png'});
 await page.click('#controls-toggle');assert.equal(await page.locator('#explore-controls').isVisible(),true);
 await page.screenshot({path:'checks/mobile-controls-expanded.png'});
 await page.click('#tour-btn');assert.equal(await page.evaluate(()=>houseWalk.getState().mode),'tour');assert.equal(await page.locator('#explore-controls').isVisible(),false);
 await page.click('#controls-toggle');await page.click('#photos-btn');assert.equal(await page.locator('#photos').isVisible(),true);assert.equal(await page.locator('#explore-controls').isVisible(),false);await page.click('#close-photos');
 await page.click('#controls-toggle');await page.click('#settings-btn');assert.equal(await page.locator('#settings').isVisible(),true);assert.equal(await page.locator('#explore-controls').isVisible(),false);
 await page.click('#controls-toggle');assert.equal(await page.locator('#settings').isVisible(),false);await page.keyboard.press('Escape');assert.equal(await page.getAttribute('#controls-toggle','aria-expanded'),'false');
 for(const viewport of [{width:320,height:568},{width:844,height:390}]){
  await page.setViewportSize(viewport);await page.click('#controls-toggle');assert.equal(await page.evaluate(()=>document.body.scrollWidth>innerWidth),false);
  const bounds=await page.locator('#explore-controls').boundingBox();assert.ok(bounds.y>=0&&bounds.x>=0&&bounds.x+bounds.width<=viewport.width,'Expanded mobile controls fit viewport');
  await page.click('#controls-toggle');
 }
 await page.setViewportSize({width:1440,height:1000});await page.waitForFunction(()=>!document.getElementById('explore-controls').hidden);
 assert.equal(await page.locator('#explore-controls').isVisible(),true);assert.equal(await page.locator('#controls-toggle').isVisible(),false);

 const report={errors,destinationChecks,directions,plinth,routes,routeFailures:routes.flatMap(r=>r.results.filter(x=>x.error>.35).map(x=>({route:r.name,...x}))),introReturn};fs.writeFileSync('checks/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({errors,clearDestinations:destinationChecks.length,routeSegments:routes.reduce((n,r)=>n+r.results.length,0),routeFailures:report.routeFailures},null,2));
 assert.deepEqual(errors,[]);assert.equal(report.routeFailures.length,0,JSON.stringify(report.routeFailures));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
