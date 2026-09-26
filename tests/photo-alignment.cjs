const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const KEY='shankaranarayana.photo-poses.v1';
const rect=(page,sel)=>page.evaluate(s=>document.querySelector(s).getBoundingClientRect().toJSON(),sel);
(async()=>{const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});try{
 const context=await browser.newContext({viewport:{width:1300,height:850},acceptDownloads:true});
 // Never read or overwrite real poses in a private photo folder served by --photos.
 let diskWrites=0,discardPosts=[];await context.route('**/local-photos/align-poses.json',r=>{if(r.request().method()==='POST'){diskWrites++;r.fulfill({status:204});}else r.fulfill({status:404});});
 await context.route('**/local-photos/align-discarded.json',r=>{if(r.request().method()==='POST'){discardPosts.push(JSON.parse(r.request().postData()));r.fulfill({status:204});}else r.fulfill({status:404});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.houseWalk?.ready);
 await page.click('#photos-btn');await page.click('#align-photo');await page.waitForFunction(()=>document.getElementById('align-photo-view').naturalWidth>0);
 assert.equal(await page.evaluate(()=>houseWalk.getState().mode),'fly');
 // Photo and 3D view are side by side, the same size, at the photo's aspect ratio.
 const photo=await rect(page,'#align-photo-view'),world=await rect(page,'#world');
 assert.ok(Math.abs(photo.width-world.width)<1&&Math.abs(photo.height-world.height)<1&&world.left>=photo.right);
 const natural=await page.evaluate(()=>{const i=document.getElementById('align-photo-view');return i.naturalWidth/i.naturalHeight;});
 assert.ok(Math.abs(await page.evaluate(()=>houseWalk.camera.aspect)-natural)<.01);
 const first=await page.textContent('#align-title');
 const y0=await page.evaluate(()=>houseWalk.camera.position.y);await page.keyboard.press('KeyE');assert.ok(Math.abs(await page.evaluate(()=>houseWalk.camera.position.y)-y0-.05)<1e-6);
 // Alignment flight passes through the closed God-room gate to reach the altar.
 const through=await page.evaluate(()=>{const c=houseWalk.camera;const saved=[c.position.clone(),c.quaternion.clone()];c.position.set(0,2.1,5.9);c.lookAt(0,2.1,12);const z=houseWalk.moveFor('KeyW',1.2).position[2];c.position.copy(saved[0]);c.quaternion.copy(saved[1]);return z;});
 assert.ok(through>7.5,'alignment camera passes the God-room gate');
 const f0=await page.evaluate(()=>houseWalk.camera.fov);await page.keyboard.press('KeyX');assert.ok(Math.abs(await page.evaluate(()=>houseWalk.camera.fov)-f0-.5)<1e-6);
 await page.fill('#align-notes','Standing on the front step.');await page.locator('#align-notes').press('Escape');
 await page.keyboard.press('Space');await page.waitForFunction(t=>document.getElementById('align-title').textContent!==t,first);
 const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);assert.equal(saved.length,1);assert.equal(saved[0].filename,first);assert.equal(saved[0].notes,'Standing on the front step.');assert.equal(saved[0].image.fit,'exact');
 assert.equal(await page.evaluate(()=>!!document.pointerLockElement),false);
 await page.keyboard.press('KeyP');assert.equal(await page.textContent('#align-title'),first);
 assert.deepEqual(await page.evaluate(()=>houseWalk.camera.position.toArray()),saved[0].camera.position);
 const downloadPromise=page.waitForEvent('download');await page.click('#align-export');const exported=JSON.parse(fs.readFileSync(await(await downloadPromise).path(),'utf8'));assert.equal(exported.poses.length,1);assert.ok(!JSON.stringify(exported).includes('data:image'));
 // Reload resumes at the same photo with its saved pose.
 await page.reload();await page.waitForFunction(()=>window.houseWalk?.ready);await page.click('#photos-btn');await page.click('#align-photo');await page.waitForFunction(t=>document.getElementById('align-title').textContent===t,first);
 assert.deepEqual(await page.evaluate(()=>houseWalk.camera.position.toArray()),saved[0].camera.position);
 const old=await page.evaluate(k=>localStorage.getItem(k),KEY);
 await page.setInputFiles('#align-import',{name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"version":1,"poses":[{}]}')});await page.waitForFunction(()=>document.getElementById('align-status').textContent.includes('not a valid'));assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),old);
 await page.setInputFiles('#align-import',{name:'poses.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await page.waitForFunction(()=>document.getElementById('align-status').textContent.includes('Imported 1'));
 // Discard hides a useless photo from the queue and advances; Restore brings it back.
 const before=await page.textContent('#align-title');
 await page.keyboard.press('Delete');await page.waitForFunction(t=>document.getElementById('align-title').textContent!==t,before);
 assert.match(await page.textContent('#align-count'),/1 discarded/);
 const marked=await page.evaluate(t=>[...document.getElementById('align-jump').options].find(o=>o.textContent.includes(t.replace(/^2011-09-21 /,''))).textContent,before);assert.ok(marked.startsWith('✕'));
 // Prev/Skip pass over the discarded photo.
 for(let i=0;i<3;i++){await page.keyboard.press('KeyP');assert.notEqual(await page.textContent('#align-title'),before);}
 const jumpIndex=await page.evaluate(t=>[...document.getElementById('align-jump').options].findIndex(o=>o.textContent.includes(t.replace(/^2011-09-21 /,''))),before);
 await page.selectOption('#align-jump',String(jumpIndex));assert.equal(await page.textContent('#align-title'),before);
 assert.equal((await page.textContent('#align-discard')).trim(),'Restore');
 await page.click('#align-discard');assert.doesNotMatch(await page.textContent('#align-count'),/discarded/);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('shankaranarayana.align-discarded.v1')).length),0);
 // With a photo folder, each discard/restore rewrites the folder's list (never the photo).
 if(discardPosts.length){assert.equal(discardPosts.length,2);assert.deepEqual(discardPosts[0].files,[before]);assert.deepEqual(discardPosts[1].files,[]);}
 await page.click('#align-close');assert.equal(await page.isVisible('#align-stage'),false);
 const full=await rect(page,'#world');assert.ok(full.width===1300&&full.height===850);
 await page.click('#close-photos');await page.click('#tour-btn');assert.equal(await page.evaluate(()=>houseWalk.getState().mode),'tour');
 // ?align=<part of a filename> opens the tool directly on that photo.
 const target=(await page.evaluate(()=>houseWalk&&document.getElementById('align-jump').options[2].textContent)).split('. ')[1].split(' — ')[0];
 await page.goto('http://127.0.0.1:4173/?align='+encodeURIComponent(target));await page.waitForFunction(t=>document.getElementById('align-title')?.textContent.includes(t),target);
 assert.equal(await page.isVisible('#align-stage'),true);
 await page.evaluate(k=>{localStorage.removeItem(k);localStorage.removeItem('shankaranarayana.align-position.v1');localStorage.removeItem('shankaranarayana.align-discarded.v1');},KEY);
 // Portrait phones stack the photo above the 3D view without horizontal overflow.
 const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await phone.route('**/local-photos/align-poses.json',r=>r.fulfill({status:r.request().method()==='POST'?204:404}));const mobile=await phone.newPage();mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto('http://127.0.0.1:4173');await mobile.waitForFunction(()=>window.houseWalk?.ready);
 await mobile.click('#controls-toggle');await mobile.click('#photos-btn');await mobile.click('#align-photo');await mobile.waitForFunction(()=>document.getElementById('align-photo-view').naturalWidth>0);
 const mp=await rect(mobile,'#align-photo-view'),mw=await rect(mobile,'#world');assert.ok(mw.top>=mp.bottom&&mw.bottom<=(await rect(mobile,'#photo-alignment')).top+1);
 assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:['side-by-side aspect match','keyboard height and zoom','space saves and advances','previous restores pose','JSON export','reload resumes','invalid import rejection','close restores view','tour restart','discard and restore','direct ?align link','portrait stacking'],errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
