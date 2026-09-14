const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL || undefined,headless:true,args:['--disable-gpu-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.houseWalk?.ready);
 const states={};
 for(const place of ['front','courtyard','kitchen','upstairs','temple','templecourt','lake','pavilion']){
  states[place]=await page.evaluate(place=>{const H=houseWalk;H.teleport(H.destinations[place]);return {...H.getState(),insideCollider:H.collision(H.camera.position.x,H.camera.position.z,H.getState().feet)}},place);
  await page.waitForTimeout(150);await page.screenshot({path:`checks/${place}.png`});
 }
 await page.click('#orbit-btn');await page.waitForTimeout(200);await page.screenshot({path:'checks/aerial.png'});await page.click('#roof-btn');await page.waitForTimeout(200);await page.screenshot({path:'checks/cutaway.png'});
 console.log(JSON.stringify({errors,states},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
