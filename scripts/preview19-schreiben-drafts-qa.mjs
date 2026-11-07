import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {gunzipSync} from 'node:zlib';
import ts from 'typescript';
import vm from 'node:vm';
const PREVIEW_URL='https://deploy-preview-19--otto-a1.netlify.app/';
const DIR='preview19-schreiben-draft-artifacts';
fs.mkdirSync(DIR,{recursive:true});
const profile={name:'Preview QA',contactType:'email',contact:'qa@example.com',contactVerified:true,authStatus:'verified',gender:'female',learningMode:'direct',createdAt:'2026-10-19T00:00:00.000Z',updatedAt:'2026-10-19T00:00:00.000Z',onboardingCompleted:true};
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const report=[];
const diagnosticStamp=()=>new Date().toISOString().replace(/[:.]/g,'-');
async function dumpDiagnostic(page,name,trace){
 const prefix=DIR+'/'+name+'-'+diagnosticStamp();
 let screenshot=null;
 try{screenshot=prefix+'.png';await page.screenshot({path:screenshot,fullPage:true,timeout:15000})}catch(error){trace.screenshotError=String(error)}
 const snapshot={at:new Date().toISOString(),url:page.url(),title:null,bodyText:null,headings:[],api:trace.api,unexpectedApi:trace.unexpectedApi,jsErrors:trace.jsErrors,failedRequests:trace.failedRequests,consoleErrors:trace.consoleErrors,screenshot};
 try{snapshot.title=await page.title();snapshot.bodyText=(await page.locator('body').innerText({timeout:3000})).slice(0,6000);snapshot.headings=(await page.locator('h1,h2,[role="alert"],[role="status"]').allTextContents()).slice(0,35)}catch(error){snapshot.domError=String(error)}
 try{snapshot.qaStorage=await page.evaluate(id=>({mode:localStorage.getItem('otto-preview-app-mode-v2:'+id),learningMode:JSON.parse(localStorage.getItem('otto-user-profile')||'null')?.learningMode,profileOwner:localStorage.getItem('otto-user-profile-owner-v1'),onboarding:localStorage.getItem('otto-onboarding-completed')}),trace.accountId)}catch(error){snapshot.storageError=String(error)}
 fs.writeFileSync(prefix+'.json',JSON.stringify(snapshot,null,2));
 console.log('QA DIAGNOSTIC',JSON.stringify(snapshot));
 return snapshot;
}

async function newPage(width,height=850,accountId=accountId,existingContext=null){
 const context=existingContext||await browser.newContext({viewport:{width,height},serviceWorkers:'block',permissions:['microphone']});
 const page=await context.newPage();
 const fakeServer={progress:{},activity:[],seen:new Set()};
 const errors=[];
 const trace={api:[],unexpectedApi:[],jsErrors:[],failedRequests:[],consoleErrors:[],accountId};
 page.on('pageerror',err=>{errors.push(err.message);trace.jsErrors.push(err.message)});
 page.on('console',msg=>{if(msg.type()==='error')trace.consoleErrors.push(msg.text().slice(0,500))});
 page.on('requestfailed',req=>trace.failedRequests.push({method:req.method(),url:req.url(),failure:req.failure()?.errorText??null}));
 page.on('response',resp=>{if(resp.status()>=400)errors.push('HTTP '+resp.status()+' '+resp.url())});
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const body=(x)=>{trace.api.push({method:route.request().method(),path,status:200,keys:Object.keys(x),authenticated:x.authenticated??undefined,hasTrainingAccess:x.hasTrainingAccess??undefined,mode:x.profile?.learningMode??undefined});return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(x)})};
  if(path==='/api/session')return body({authenticated:true,userId:accountId});
  if(path==='/api/profile')return body({authenticated:true,userId:accountId,profile});
  if(path==='/api/account-access')return body({authenticated:true,userId:accountId,serverNow:new Date().toISOString(),trialActive:true,trialStartedAt:new Date(Date.now()-3600000).toISOString(),trialEndsAt:new Date(Date.now()+71*3600000).toISOString(),subscriptionActive:false,subscriptionUntil:null,hasTrainingAccess:true,reason:'preview-qa'});
  if(path==='/api/legal-consent')return body({accepted:true,documentVersion:'2026-09-23-v1'});
  if(path==='/api/state')return body({authenticated:true,userId:accountId,state:{}});
  if(path==='/api/progress'){
   if(route.request().method()==='POST'){
    const item=route.request().postDataJSON();
    if(!fakeServer.seen.has(item.activityId)){
     fakeServer.seen.add(item.activityId);
     const mod=item.moduleKey, old=fakeServer.progress[mod]||{};
     const unitTotal=item.total===100?1:item.total;
     const unitScore=item.total===100?item.score/100:item.score;
     const answered=(old.answered||0)+unitTotal,correct=(old.correct||0)+unitScore;
     const percent=Math.round(unitScore/unitTotal*100);
     fakeServer.progress[mod]={completed:answered,total:answered,answered,correct,attempts:(old.attempts||0)+1,bestScore:Math.max(old.bestScore||0,percent),lastScore:percent,recentScores:[...(old.recentScores||[]),percent].slice(-8)};
     fakeServer.activity.unshift({id:item.activityId,module:mod,score:item.score,total:item.total,percent,at:item.occurredAt,durationSeconds:item.durationSeconds||0});
    }
    return body({ok:true});
   }
   return body({authenticated:true,progress:fakeServer.progress,activity:fakeServer.activity});
  }
  if(path.includes('support'))return body({unreadCount:0,latestTicketId:null,tickets:[]});
  if(path==='/api/check-sprechen'){
   if(route.request().method()==='GET')return body({aiConfigured:true});
   const input=route.request().postDataJSON();
   trace.speechChecks=(trace.speechChecks||[]).concat([{mode:input.mode,mimeType:input.mimeType,audioBytes:Math.floor((input.audioBase64||'').length*3/4)}]);
   return body({score:100,officialLevel:'full',transcript:'QA synthetische Testaufnahme',strengths:['Тестовая проверка ответа'],practice:[],pronunciationRu:'Тестовая заглушка AI, не оценка произношения'});
  }
  if(path==='/api/check-schreiben'){
   const input=route.request().postDataJSON();
   trace.letterChecks=(trace.letterChecks||[]).concat([{textLength:(input.text||'').length,points:input.points?.length||0}]);
   return body({score:70,earned:7,max:10,wordCount:(input.text||'').split(/\s+/).length,contentPoints:(input.points||[]).map(point=>({point,earned:1.5,status:'teilweise',commentRu:'Проверка QA'})),communication:{earned:1,commentRu:'Тест'},feedbackRu:'Тестовый результат',feedbackDe:'Testfeedback',corrections:[]});
  }
  if(path==='/api/schreiben-example')return body({example:'Liebe Anna, ich komme morgen. Viele Grüße, Maria',noteRu:'QA пример'});
  if(path==='/api/reading-feedback')return body({items:(route.request().postDataJSON().items||[]).map(()=>({de:'QA Erklärung',ru:'Тестовое объяснение'}))});
  if(path==='/api/translate-task')return body({translations:[],de:'',ru:''});
  trace.unexpectedApi.push({method:route.request().method(),path});
  return route.fulfill({status:501,contentType:'application/json',body:JSON.stringify({error:'QA mock undefined: '+path})});
 });
 await page.addInitScript(id=>{localStorage.setItem('otto-preview-app-mode-v2:'+id,'training')},accountId);
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


const draftReport=[];
const screenshot=async(page,label)=>{const file=DIR+'/'+label+'.png';await page.screenshot({path:file,fullPage:true});return file};
const taskId=n=>'schreiben-teil2-'+n;
const key=(id,n)=>'otto-schreiben-teil2-text-draft-v1:'+encodeURIComponent(id)+':'+taskId(n);
const input='textarea[placeholder*="Напишите"]';
const message7='Liebe Anna, ich kann morgen um acht Uhr kommen. Viele Grüße, Tanja.';
const message8='Guten Tag, ich habe am Freitag einen Termin. Herzlichen Dank, Maria.';
async function moduleHome(page){await page.getByRole('button',{name:'Главная',exact:true}).click();await page.locator('.otto-dashboard-module-card').first().waitFor()}
async function openWriting(page){
 await page.locator('.otto-dashboard-module-card').filter({hasText:'Schreiben'}).click();
 await page.getByRole('button',{name:/Teil 2 · Brief/}).click();
 await page.getByRole('heading',{name:'Задания Teil 2'}).waitFor();
}
async function openLetter(page,n,mode='Пишу сама'){
 await page.getByRole('button',{name:new RegExp('^Письмо '+n+'(?:\\s|$)')}).click();
 await page.getByRole('heading',{name:'Как будем писать письмо?'}).waitFor();
 await page.getByRole('button',{name:new RegExp(mode)}).click();
 await page.locator(input).waitFor();
}
async function listFromLetter(page){
 await page.locator('div.mb-5.flex.items-center.gap-3 > button').first().click();
 await page.getByRole('heading',{name:'Как будем писать письмо?'}).waitFor();
 await page.locator('div.mb-5.flex.items-center.gap-3 > button').first().click();
 await page.getByRole('heading',{name:'Задания Teil 2'}).waitFor();
}
async function attempt(label,fn){
 const entry={scenario:label};
 try{await fn(entry);entry.status='PASS'}
 catch(err){entry.status='FAIL';entry.error=String(err?.stack||err)}
 draftReport.push(entry);console.log('DRAFT QA',JSON.stringify(entry));
}
const acc1='preview19-draft-account-A',acc2='preview19-draft-account-B';
let session=null;
try{
 session=await newPage(436,850,acc1);
 const {page,context,trace}=session;
 await attempt('A - letter 7 autosave and full reload',async entry=>{
  await openWriting(page);
  await openLetter(page,7);
  await page.locator(input).fill(message7);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),key(acc1,7)),message7);
  entry.before=await screenshot(page,'A-before-reload');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.otto-dashboard-module-card').first().waitFor({timeout:30000});
  await openWriting(page);await openLetter(page,7);
  assert.equal(await page.locator(input).inputValue(),message7);
  entry.after=await screenshot(page,'A-after-reload');
 });
 await attempt('B - guided coach solo keep text',async entry=>{
  await page.locator('div.mb-5.flex.items-center.gap-3 > button').first().click();
  await page.getByRole('heading',{name:'Как будем писать письмо?'}).waitFor();
  for(const mode of ['Учусь на примере','Пишу вместе с Отто','Пишу сама']){
   await page.getByRole('button',{name:new RegExp(mode)}).click();
   if(mode==='Учусь на примере'){
    await page.getByRole('button',{name:'Показать пример'}).click();
    await page.getByRole('button',{name:/Закрыть пример и написать/}).click();
   }
   assert.equal(await page.locator(input).inputValue(),message7,mode);
   entry[mode]=await screenshot(page,'B-'+mode.replace(/\s/g,'-'));
   await page.locator('div.mb-5.flex.items-center.gap-3 > button').first().click();
  }
 });
 await attempt('C - letter 7 and 8 remain distinct after reload',async entry=>{
  await page.getByRole('heading',{name:'Как будем писать письмо?'}).waitFor();
  await page.locator('div.mb-5.flex.items-center.gap-3 > button').first().click();
  await page.getByRole('heading',{name:'Задания Teil 2'}).waitFor();
  await openLetter(page,8);
  await page.locator(input).fill(message8);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),key(acc1,8)),message8);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),key(acc1,7)),message7);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.otto-dashboard-module-card').first().waitFor({timeout:30000});
  await openWriting(page);await openLetter(page,8);
  assert.equal(await page.locator(input).inputValue(),message8);
  await listFromLetter(page);await openLetter(page,7);
  assert.equal(await page.locator(input).inputValue(),message7);
  entry.image=await screenshot(page,'C-independent-letters');
 });
 await attempt('E - checking does not delete original text or duplicate a result',async entry=>{
  await page.getByRole('button',{name:'Проверить с Отто'}).click();
  await page.getByText('Результат по шкале Goethe').waitFor({timeout:16000});
  assert.equal(await page.locator(input).inputValue(),message7);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),key(acc1,7)),message7);
  const snapshot=await page.evaluate(()=>({completion:localStorage.getItem('otto-module-task-completion-v1'),resume:localStorage.getItem('otto-training-resume-v1')}));
  entry.completion=JSON.parse(snapshot.completion||'null')?.schreiben?.length;
  entry.image=await screenshot(page,'E-check-result');
  assert.ok(entry.completion>=1);
 });
 await attempt('F - local draft changes do not mutate completion or resume cursor',async entry=>{
  await page.locator('div.mb-5.flex.items-center.gap-3 > button').first().click();
  await page.getByRole('heading',{name:'Как будем писать письмо?'}).waitFor();
  await page.getByRole('button',{name:/Пишу сама/}).click();
  const snapshot=()=>page.evaluate(()=>({
   completion:localStorage.getItem('otto-module-task-completion-v1'),
   resume:localStorage.getItem('otto-training-resume-v1'),
   progress:localStorage.getItem('goethe-a1-progress'),
  }));
  const before=await snapshot();
  await page.locator(input).fill(message7+' Noch eine Frage.');
  const after=await snapshot();
  assert.deepEqual(after,before,'Draft should not affect progress or resume');
  await page.locator(input).fill(message7);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.otto-dashboard-module-card').first().waitFor({timeout:30000});
  const reloaded=await snapshot();
  assert.deepEqual(JSON.parse(reloaded.completion||'null'),JSON.parse(before.completion||'null'),'Completions changed after reload');
  assert.deepEqual(JSON.parse(reloaded.resume||'null'),JSON.parse(before.resume||'null'),'Resume cursor changed after reload');
  assert.deepEqual(JSON.parse(reloaded.progress||'null'),JSON.parse(before.progress||'null'),'Scoring values changed after reload');
  await openWriting(page);await openLetter(page,7);
  assert.equal(await page.locator(input).inputValue(),message7);
  entry.before=before;entry.after=reloaded;
  entry.image=await screenshot(page,'F-after-reload');
 });
 await attempt('D - switching two authenticated IDs in the same browser profile',async entry=>{
  await context.newPage().then(async second=>{
   await second.close();
  });
  await page.close();
  // A single BrowserContext retains storage, unlike a new incognito context.
  const bob=await newPage(436,850,acc2,context);
  const bobPage=bob.page;
  try{
   await openWriting(bobPage);await openLetter(bobPage,7);
   assert.equal(await bobPage.locator(input).inputValue(),'','B cannot see A');
   await bobPage.locator(input).fill('Bob only');
   assert.equal(await bobPage.evaluate(k=>localStorage.getItem(k),key(acc2,7)),'Bob only');
   assert.equal(await bobPage.evaluate(k=>localStorage.getItem(k),key(acc1,7)),message7);
   entry.bob=await screenshot(bobPage,'D-account-B');
  }finally{await bobPage.close()}
  const alice=await newPage(436,850,acc1,context);
  try{
   await openWriting(alice.page);await openLetter(alice.page,7);
   assert.equal(await alice.page.locator(input).inputValue(),message7);
   assert.equal(await alice.page.evaluate(k=>localStorage.getItem(k),key(acc2,7)),'Bob only');
   entry.alice=await screenshot(alice.page,'D-account-A-restored');
  }finally{await alice.page.close()}
 });
 await attempt('Extra - clear text removes only own draft',async entry=>{
  const clear=await newPage(436,850,acc1,context);
  try{
   await openWriting(clear.page);await openLetter(clear.page,7);
   await clear.page.locator(input).fill('');
   assert.equal(await clear.page.evaluate(k=>localStorage.getItem(k),key(acc1,7)),null);
   assert.equal(await clear.page.evaluate(k=>localStorage.getItem(k),key(acc1,8)),message8);
   assert.equal(await clear.page.evaluate(k=>localStorage.getItem(k),key(acc2,7)),'Bob only');
   entry.image=await screenshot(clear.page,'clear-draft');
  }finally{await clear.page.close()}
 });
 await attempt('Extra - blocked draft storage fails gracefully',async entry=>{
  const ctx=await browser.newContext({viewport:{width:436,height:850},serviceWorkers:'block'});
  await ctx.addInitScript(()=>{
   const get=Storage.prototype.getItem,set=Storage.prototype.setItem,remove=Storage.prototype.removeItem;
   Storage.prototype.getItem=function(key){if(key.startsWith('otto-schreiben-teil2-text-draft-v1:'))throw Error('private mode');return get.call(this,key)};
   Storage.prototype.setItem=function(key,value){if(key.startsWith('otto-schreiben-teil2-text-draft-v1:'))throw Error('quota');return set.call(this,key,value)};
   Storage.prototype.removeItem=function(key){if(key.startsWith('otto-schreiben-teil2-text-draft-v1:'))throw Error('private mode');return remove.call(this,key)};
  });
  const restricted=await newPage(436,850,'restricted-QA',ctx);
  try{
   await openWriting(restricted.page);await openLetter(restricted.page,7);
   await restricted.page.locator(input).fill('Temporary text');
   assert.equal(await restricted.page.locator(input).inputValue(),'Temporary text');
   assert.equal(restricted.trace.jsErrors.length,0,'No uncaught exceptions');
   entry.image=await screenshot(restricted.page,'storage-unavailable');
  }finally{await restricted.context.close()}
 });
 await context.close();
}finally{
 fs.writeFileSync(DIR+'/schreiben-draft-report.json',JSON.stringify(draftReport,null,2));
 await browser.close();
}
const failed=draftReport.filter(x=>x.status!=='PASS');
console.log('SCHREIBEN DRAFT QA SUMMARY',JSON.stringify(draftReport.map(x=>({scenario:x.scenario,status:x.status,error:x.error?.slice(0,500)})),null,2));
if(failed.length)process.exitCode=1;
