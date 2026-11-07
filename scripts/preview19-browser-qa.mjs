import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const PREVIEW_URL='https://deploy-preview-19--otto-a1.netlify.app/';
const DIR='preview19-browser-artifacts';
fs.mkdirSync(DIR,{recursive:true});
const profile={name:'Preview QA',contactType:'email',contact:'qa@example.com',contactVerified:true,authStatus:'verified',gender:'female',learningMode:'direct',createdAt:'2026-10-19T00:00:00.000Z',updatedAt:'2026-10-19T00:00:00.000Z',onboardingCompleted:true};
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const report=[];
const diagnosticStamp=()=>new Date().toISOString().replace(/[:.]/g,'-');
async function dumpDiagnostic(page,name,trace){
 const prefix=DIR+'/'+name+'-'+diagnosticStamp();
 let screenshot=null;
 try{screenshot=prefix+'.png';await page.screenshot({path:screenshot,fullPage:true,timeout:15000})}catch(error){trace.screenshotError=String(error)}
 const snapshot={at:new Date().toISOString(),url:page.url(),title:null,bodyText:null,headings:[],api:trace.api,unexpectedApi:trace.unexpectedApi,jsErrors:trace.jsErrors,failedRequests:trace.failedRequests,consoleErrors:trace.consoleErrors,screenshot};
 try{snapshot.title=await page.title();snapshot.bodyText=(await page.locator('body').innerText({timeout:3000})).slice(0,6000);snapshot.headings=(await page.locator('h1,h2,[role="alert"],[role="status"]').allTextContents()).slice(0,35)}catch(error){snapshot.domError=String(error)}
 try{snapshot.qaStorage=await page.evaluate(()=>({mode:localStorage.getItem('otto-preview-app-mode-v2:preview19-browser-qa'),learningMode:JSON.parse(localStorage.getItem('otto-user-profile')||'null')?.learningMode,profileOwner:localStorage.getItem('otto-user-profile-owner-v1'),onboarding:localStorage.getItem('otto-onboarding-completed')}))}catch(error){snapshot.storageError=String(error)}
 fs.writeFileSync(prefix+'.json',JSON.stringify(snapshot,null,2));
 console.log('QA DIAGNOSTIC',JSON.stringify(snapshot));
 return snapshot;
}

async function newPage(width,height=850){
 const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});
 const page=await context.newPage();
 const errors=[];
 const trace={api:[],unexpectedApi:[],jsErrors:[],failedRequests:[],consoleErrors:[]};
 page.on('pageerror',err=>{errors.push(err.message);trace.jsErrors.push(err.message)});
 page.on('console',msg=>{if(msg.type()==='error')trace.consoleErrors.push(msg.text().slice(0,500))});
 page.on('requestfailed',req=>trace.failedRequests.push({method:req.method(),url:req.url(),failure:req.failure()?.errorText??null}));
 page.on('response',resp=>{if(resp.status()>=400)errors.push('HTTP '+resp.status()+' '+resp.url())});
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const body=(x)=>{trace.api.push({method:route.request().method(),path,status:200,keys:Object.keys(x),authenticated:x.authenticated??undefined,hasTrainingAccess:x.hasTrainingAccess??undefined,mode:x.profile?.learningMode??undefined});return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(x)})};
  if(path==='/api/session')return body({authenticated:true,userId:'preview19-browser-qa'});
  if(path==='/api/profile')return body({authenticated:true,userId:'preview19-browser-qa',profile});
  if(path==='/api/account-access')return body({authenticated:true,userId:'preview19-browser-qa',serverNow:new Date().toISOString(),trialActive:true,trialStartedAt:new Date(Date.now()-3600000).toISOString(),trialEndsAt:new Date(Date.now()+71*3600000).toISOString(),subscriptionActive:false,subscriptionUntil:null,hasTrainingAccess:true,reason:'preview-qa'});
  if(path==='/api/legal-consent')return body({accepted:true,documentVersion:'2026-09-23-v1'});
  if(path==='/api/state')return body({authenticated:true,userId:'preview19-browser-qa',state:{}});
  if(path==='/api/progress')return body({authenticated:true,progress:{},activity:[]});
  if(path.includes('support'))return body({unreadCount:0,latestTicketId:null,tickets:[]});
  if(path==='/api/translate-task')return body({translations:[],de:'',ru:''});
  trace.unexpectedApi.push({method:route.request().method(),path});
  return route.fulfill({status:501,contentType:'application/json',body:JSON.stringify({error:'QA mock undefined: '+path})});
 });
 await page.addInitScript(()=>{localStorage.setItem('otto-preview-app-mode-v2:preview19-browser-qa','training')});
 try{
  await page.goto(PREVIEW_URL,{waitUntil:'domcontentloaded',timeout:50000});
  await page.locator('body').waitFor({timeout:10000});
  await dumpDiagnostic(page,'entry-before-module-wait-'+width,trace);
  // Wait for the *actual* first-run UI. Playwright isVisible is immediate:
  // its timeout option does not wait for a pending React render.
  const skipWelcome=page.getByRole('button',{name:'Посмотреть позже'});
  const closeTour=page.getByRole('button',{name:'Закрыть экскурсию'});
  const skipTour=page.getByRole('button',{name:'Пропустить',exact:true});
  const trainingMode=page.getByRole('button',{name:/Мне нужен только тренажёр/});
  let entered=false;
  for(let tick=0;tick<100;tick++){
    if(await page.locator('.otto-dashboard-module-card').first().isVisible()){entered=true;break}
    if(await skipWelcome.isVisible()){await skipWelcome.click();trace.welcome='dismissed through UI';continue}
    if(await closeTour.isVisible()){await closeTour.click();trace.tour='closed through UI';continue}
    if(await skipTour.isVisible()){await skipTour.click();trace.tour='skipped with real UI button';continue}
    if(await trainingMode.isVisible()){await trainingMode.click();trace.modeSelection='clicked real training-mode chooser';continue}
    await page.waitForTimeout(350);
  }
  assert.ok(entered,'First-run onboarding did not expose the dashboard within the waiting window');
  const required=['/api/session','/api/profile','/api/account-access','/api/legal-consent','/api/state','/api/progress'];
  const missing=required.filter(path=>!trace.api.some(item=>item.path===path));
  assert.deepEqual(missing,[],'Missing required test API responses');
  assert.equal(trace.api.find(item=>item.path==='/api/profile')?.mode,'direct','invalid test account learningMode');
  assert.ok(trace.api.some(item=>item.path==='/api/account-access'&&item.authenticated===true&&item.hasTrainingAccess===true),'mock account access denied');
  report.push({viewport:width,entry:'passed',apiCount:trace.api.length,unexpectedApi:trace.unexpectedApi,jsErrors:trace.jsErrors});
  return {page,context,errors,trace};
 }catch(error){
  const diagnostic=await dumpDiagnostic(page,'entry-failure-'+width,trace);
  report.push({viewport:width,entry:'failed',error:String(error),diagnostic});
  await context.close();
  throw error;
 }
}
function moduleCard(page,label){return page.locator('.otto-dashboard-module-card').filter({hasText:label})}
async function snapshot(page,name){await page.screenshot({path:`${DIR}/${name}.png`,fullPage:true});}
try{
 for(const width of [320,360,375,390,414,436,438,489,1440]){
  const {page,context,errors}=await newPage(width,width===1440?900:850);
  try{
   assert.equal(await page.locator('.otto-dashboard-module-card').count(),4);
   await snapshot(page,`dashboard-${width}`);
   await moduleCard(page,'Hören').click();
   await page.getByRole('heading',{name:'Hören A1'}).waitFor();
   const teil1=page.getByRole('button',{name:/Teil 1/}).first();
   await teil1.click();
   await page.getByRole('heading',{name:'Задания Teil 1'}).waitFor();
   assert.equal(await page.getByRole('button',{name:/Короткие разговоры|Im Geschäft|Im Café|Kurzes Gespräch/}).count()>0,true);
   await snapshot(page,`hoeren-list-${width}`);
   const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
   assert.equal(horizontal,false,`page horizontal overflow ${width}`);
   report.push({viewport:width,home:'pass',hoerenList:'pass',overflow:'none',errors});
  }catch(error){
   await snapshot(page,`failure-${width}`);
   report.push({viewport:width,error:String(error),errors});
   throw error;
  }finally{await context.close()}
 }
 const {page,context,errors}=await newPage(436,850);
 try{
  await moduleCard(page,'Lesen').click();
  await page.getByRole('heading',{name:'Lesen A1'}).waitFor();
  // Address the three actual card targets; never force pointer clicks.
  for(const teil of [1,2,3]){
   const title={1:'Briefe & Nachrichten',2:'Webseiten & Anzeigen',3:'Schilder & Hinweise'}[teil];
   const card=page.locator('div.relative.min-w-0.rounded-3xl').filter({has:page.getByRole('heading',{name:title,exact:true})}).first();
   const eye=card.getByRole('button',{name:'Показать перевод'});
   await eye.click();
   await page.getByRole('button',{name:'Скрыть перевод'}).first().waitFor();
   assert.equal(await page.getByRole('heading',{name:'Lesen A1'}).count(),1,'eye must not navigate');
   await card.getByRole('button',{name:'Скрыть перевод'}).click();
   await card.getByRole('button',{name:'Показать перевод'}).waitFor();
   if(teil===1||teil===2){
    // The visually transparent full-card button sits above decorative text.
    // Click it at the actual title/description position rather than
    // asking Playwright to click a non-interactive element beneath it.
    const overlay=card.getByRole('button',{name:new RegExp('Открыть Teil '+teil)});
    const box=await overlay.boundingBox();
    const target=teil===1?await card.getByRole('heading',{name:title}).boundingBox():await card.getByText('Прочитать ситуацию').boundingBox();
    assert.ok(box&&target,'card/title geometry missing');
    const x=target.x+target.width/2-box.x;
    const y=target.y+target.height/2-box.y;
    await overlay.click({position:{x,y}});
   }else{
    const opening=card.getByRole('button',{name:/Открыть Teil 3/});
    await opening.focus();
    await page.keyboard.press('Enter');
   }
   await page.getByRole('heading',{name:'Задания Teil '+teil}).waitFor();
   assert.equal(await page.getByRole('button',{name:/Brief & Nachrichten|Webseite & Anzeige|Schild & Hinweis/}).count(),50,'Lesen list length');
   await snapshot(page,'lesen-teil'+teil+'-436');
   await page.getByRole('button',{name:'Назад к выбору Teil'}).click();
   await page.getByRole('heading',{name:'Lesen A1'}).waitFor();
  }
  await page.getByRole('button',{name:/Открыть Teil 2/}).click();
  await page.getByRole('heading',{name:'Задания Teil 2'}).waitFor();
  assert.equal(await page.getByRole('button',{name:/Webseite & Anzeige/}).count(),50);
  await snapshot(page,'lesen-list-436');
  await page.getByRole('button',{name:/Продолжить с задания/}).click();
  await page.getByRole('heading',{name:/Lesen · Teil 2/}).waitFor();
  await snapshot(page,'lesen-exercise-436');
  report.push({module:'lesen',list:50,errors});
 }finally{await context.close()}
 const {page:write,context:writeCtx,errors:writeErr}=await newPage(436,850);
 try{
  await moduleCard(write,'Schreiben').click();
  await write.getByRole('button',{name:/Teil 2 · Brief/}).click();
  await write.getByRole('heading',{name:'Задания Teil 2'}).waitFor();
  await write.getByRole('button',{name:/^Письмо 7(?:\s|$)/}).click();
  await write.getByRole('heading',{name:'Как будем писать письмо?'}).waitFor();
  await snapshot(write,'schreiben-letter-choice-436');
  report.push({module:'schreiben',selectedLetter:7,errors:writeErr});
 }finally{await writeCtx.close()}
 const {page:speak,context:speakCtx,errors:speakErr}=await newPage(436,850);
 try{
  await moduleCard(speak,'Sprechen').click();
  await speak.getByRole('button',{name:/Teil 2/}).first().click();
  await speak.getByRole('heading',{name:'Задания Teil 2'}).waitFor();
  await snapshot(speak,'sprechen-list-436');
  report.push({module:'sprechen',errors:speakErr});
 }finally{await speakCtx.close()}
}finally{
 fs.writeFileSync(`${DIR}/report.json`,JSON.stringify(report,null,2));
 await browser.close();
}
