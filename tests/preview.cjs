const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL || undefined,headless:true,args:['--disable-gpu-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.houseWalk?.ready,{timeout:30000});
 await page.screenshot({path:'checks/initial.png'});
 console.log(JSON.stringify({errors,state:await page.evaluate(()=>houseWalk.getState())}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
