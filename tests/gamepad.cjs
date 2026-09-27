// A simulated Xbox controller drives the ordinary walkthrough, not just the align tool:
// a stick leaves the tour and walks, Y restarts the tour and A pauses it.
const assert=require('assert');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL || undefined,headless:true,args:['--disable-gpu-sandbox']});const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.fakePad={connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[window.fakePad];});
 await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.houseWalk?.ready);
 const mode=()=>page.evaluate(()=>document.body.dataset.mode);
 const pos=()=>page.evaluate(()=>houseWalk.camera.position.toArray());
 const tap=async i=>{await page.evaluate(i=>fakePad.buttons[i].pressed=true,i);await page.waitForTimeout(150);await page.evaluate(i=>fakePad.buttons[i].pressed=false,i);await page.waitForTimeout(150);};
 assert.equal(await mode(),'tour','Opens on the tour');
 await page.waitForTimeout(500);
 await page.evaluate(()=>fakePad.axes[1]=-1);await page.waitForTimeout(100);
 assert.equal(await mode(),'walk','Left stick leaves the tour to walk');
 const a=await pos();await page.waitForTimeout(1000);const b=await pos();
 await page.evaluate(()=>fakePad.axes[1]=0);
 assert.ok(Math.hypot(b[0]-a[0],b[2]-a[2])>.8,`Left stick walks forward (${a} -> ${b})`);
 const yaw0=await page.evaluate(()=>houseWalk.camera.rotation.y);
 await page.evaluate(()=>fakePad.axes[2]=1);await page.waitForTimeout(400);await page.evaluate(()=>fakePad.axes[2]=0);
 assert.ok(Math.abs(await page.evaluate(()=>houseWalk.camera.rotation.y)-yaw0)>.3,'Right stick turns');
 await tap(3);assert.equal(await mode(),'tour','Y starts the tour');
 await tap(0);assert.equal(await page.evaluate(()=>document.getElementById('tour-pause').textContent),'Resume','A pauses the tour');
 assert.deepEqual(errors,[]);
 console.log('gamepad ok');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
