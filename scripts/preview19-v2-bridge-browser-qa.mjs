import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const PREVIEW='https://deploy-preview-19--otto-a1.netlify.app/';
const DIR='preview19-v2-bridge-artifacts';
const OWNER_A='preview19-v2-qa-a';
const OWNER_B='preview19-v2-qa-b';
const LEGACY='otto-module-task-completion-v1';
const PREFIX='otto-task-results-v2:';
const LEGACY_JSON=JSON.stringify({horen:['horen-002']});
const DATE1='2026-10-20T12:00:00.000Z';
const DATE2='2026-10-20T12:01:00.000Z';
fs.mkdirSync(DIR,{recursive:true});

const server=new Map([
 [OWNER_A,new Map([[LEGACY,LEGACY_JSON]])],
 [OWNER_B,new Map()],
]);
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const sessions=[];
const report={sha:process.env.GITHUB_SHA||null,preview:PREVIEW,
 purpose:'Chromium v2 recovery through authenticated synthetic /api/state GET, no local v2 seed',
 startedAt:new Date().toISOString(),scenarios:[],screenshots:[],network:[],errors:[],passed:false};
const key=(owner,module,shard)=>PREFIX+encodeURIComponent(owner)+':'+module+':'+shard;
const makeAttempt=(attemptId,taskId,score,at)=>({attemptId,taskId,score,total:1,at});
const makeJournal=(owner,module,attempts)=>JSON.stringify({schemaVersion:2,ownerUserId:owner,module,attempts});
const mistake=makeAttempt('a-wrong-1','horen-002',0,DATE1);
const corrected=makeAttempt('a-correct-1','horen-002',1,DATE2);
const userBMiss=makeAttempt('b-wrong-1','horen-004',0,DATE1);
const snapshot=owner=>Object.fromEntries(server.get(owner)?.entries()||[]);
const note=(name,details={})=>{
 report.scenarios.push({name,at:new Date().toISOString(),...details});
 console.log('V2 BRIDGE QA',JSON.stringify(report.scenarios[report.scenarios.length-1]));
};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check,label,timeout=30000){
 const started=Date.now();
 let last=null;
 while(Date.now()-started<timeout){
  try{const result=await check();if(result)return result;}catch(error){last=String(error)}
  await delay(200);
 }
 throw new Error('Timeout waiting for '+label+(last?' (last: '+last+')':''));
}
const stateGETs=(session,status=null)=>session.calls.filter(item=>item.path==='/api/state'&&item.method==='GET'&&(status===null||item.status===status)).length;
const v2Storage=page=>page.evaluate(()=>({
 v2Keys:Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).filter(x=>x?.startsWith('otto-task-results-v2:')),
 legacy:localStorage.getItem('otto-module-task-completion-v1'),
 owner:localStorage.getItem('otto-state-owner-v2'),
}));
async function capture(page,name){
 const path=DIR+'/'+name+'.png';
 await page.screenshot({path,fullPage:true,timeout:20000});
 report.screenshots.push(path);
 return path;
}
async function ensureLocalV2Absent(page,label){
 const value=await v2Storage(page);
 assert.deepEqual(value.v2Keys,[],'v2 journal unexpectedly entered localStorage: '+label);
 return value;
}
function verifyLegacyServer(){
 assert.equal(server.get(OWNER_A)?.get(LEGACY),LEGACY_JSON,'read-only workflow changed the original v1 server JSON');
}
function assertNoForbiddenWrites(){
 const forbidden=report.network.filter(x=>x.path==='/api/state'&&['PUT','DELETE'].includes(x.method)&&
  (typeof x.key==='string'&&(x.key.startsWith(PREFIX)||x.key===LEGACY)));
 assert.deepEqual(forbidden,[],'v2/legacy writes forbidden in bridge QA');
 verifyLegacyServer();
}
async function createDevice(owner,label){
 const context=await browser.newContext({viewport:{width:436,height:850},serviceWorkers:'block'});
 const page=await context.newPage();
 const calls=[];
 const device={owner,label,context,page,calls,failStateGET:false,jsErrors:[],navigateCount:0};
 sessions.push(device);
 page.on('framenavigated',frame=>{if(frame===page.mainFrame())device.navigateCount++});
 page.on('pageerror',error=>device.jsErrors.push(String(error.message)));
 page.on('console',message=>{if(message.type()==='error')device.jsErrors.push('console: '+message.text().slice(0,250))});
 await page.route('**/api/**',async route=>{
  const request=route.request();
  const path=new URL(request.url()).pathname;
  const method=request.method();
  let payload=null,bodyKey=null;
  if(method!=='GET'){
   try{payload=request.postDataJSON()}catch{payload=null}
   if(path==='/api/state')bodyKey=typeof payload?.key==='string'?payload.key:null;
  }
  const respond=async(status,value,extra={})=>{
   const entry={at:new Date().toISOString(),device:label,userId:device.owner,method,path,status,
    ...(bodyKey!==null?{key:bodyKey}:{}),...extra};
   calls.push(entry);report.network.push(entry);
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
  };
  if(path==='/api/session')return respond(200,{authenticated:true,userId:device.owner});
  if(path==='/api/profile'){
   const now='2026-10-20T10:00:00.000Z';
   return respond(200,{authenticated:true,userId:device.owner,
    profile:{name:'Synthetic '+label,contactType:'email',contact:'qa-'+label+'@example.invalid',
     contactVerified:true,authStatus:'verified',gender:'female',learningMode:'direct',
     createdAt:now,updatedAt:now,onboardingCompleted:true}});
  }
  if(path==='/api/account-access'){
   const now=new Date();
   return respond(200,{authenticated:true,userId:device.owner,serverNow:now.toISOString(),
    trialActive:true,trialStartedAt:new Date(now.getTime()-3600000).toISOString(),
    trialEndsAt:new Date(now.getTime()+71*3600000).toISOString(),
    subscriptionActive:false,subscriptionUntil:null,hasTrainingAccess:true,reason:'synthetic-browser-QA'});
  }
  if(path==='/api/legal-consent')return respond(200,{accepted:true,documentVersion:'2026-09-23-v1'});
  if(path==='/api/state'){
   if(method==='GET'){
    if(device.failStateGET)return respond(503,{code:'state_load_failed',message:'synthetic 503'});
    const data=snapshot(device.owner);
    return respond(200,{authenticated:true,userId:device.owner,state:data},
     {receivedV2Keys:Object.keys(data).filter(x=>x.startsWith(PREFIX)),
      legacyBytes:typeof data[LEGACY]==='string'?data[LEGACY].length:0});
   }
   const forbidden=bodyKey===LEGACY||Boolean(bodyKey?.startsWith(PREFIX));
   if(forbidden)return respond(400,{error:'forbidden synthetic user data mutation'});
   if(method==='PUT'&&bodyKey&&typeof payload?.value==='string')server.get(device.owner)?.set(bodyKey,payload.value);
   else if(method==='DELETE'&&bodyKey)server.get(device.owner)?.delete(bodyKey);
   return respond(200,{ok:true});
  }
  if(path==='/api/progress'){
   if(method==='POST')return respond(200,{ok:true});
   return respond(200,{authenticated:true,progress:{},activity:[]});
  }
  if(path.includes('support'))return respond(200,{unreadCount:0,latestTicketId:null,tickets:[]});
  if(path==='/api/translate-task')return respond(200,{translations:[],de:'',ru:''});
  return respond(501,{error:'unexpected synthetic QA endpoint: '+path});
 });
 await page.goto(PREVIEW,{waitUntil:'domcontentloaded',timeout:60000});
 const dashboard=page.locator('.otto-dashboard-module-card').first();
 const skipWelcome=page.getByRole('button',{name:'Посмотреть позже'});
 const closeTour=page.getByRole('button',{name:'Закрыть экскурсию'});
 const skipTour=page.getByRole('button',{name:'Пропустить',exact:true});
 const trainingMode=page.getByRole('button',{name:/Мне нужен только тренажёр/});
 let entered=false;
 for(let i=0;i<120;i++){
  if(await dashboard.isVisible()){entered=true;break}
  if(await skipWelcome.isVisible()){await skipWelcome.click();continue}
  if(await closeTour.isVisible()){await closeTour.click();continue}
  if(await skipTour.isVisible()){await skipTour.click();continue}
  if(await trainingMode.isVisible()){await trainingMode.click();continue}
  await delay(350);
 }
 assert.ok(entered,label+': dashboard did not become available');
 await until(()=>stateGETs(device,200)>0,label+' authenticated initial /api/state GET');
 assert.ok(calls.some(x=>x.path==='/api/state'&&x.status===200),'no authenticated state GET');
 assert.deepEqual((await v2Storage(page)).v2Keys,[],'must never seed local v2 results');
 return device;
}
async function openHorenList(device){
 const {page}=device;
 if(await page.getByRole('heading',{name:'Задания Teil 1'}).isVisible())return;
 if(!await page.locator('.otto-dashboard-module-card').first().isVisible()){
  const home=page.getByRole('button',{name:'Главная',exact:true});
  if(await home.isVisible())await home.click();
 }
 await page.locator('.otto-dashboard-module-card').filter({hasText:'Hören'}).click();
 const intro=page.getByRole('button',{name:'Перейти к тренировке'});
 if(await intro.isVisible())await intro.click();
 await page.getByRole('heading',{name:'Hören A1'}).waitFor({timeout:30000});
 await page.getByRole('button',{name:/Teil 1/}).first().click();
 await page.getByRole('heading',{name:'Задания Teil 1'}).waitFor({timeout:30000});
}
const taskRow=(page,index)=>page.getByRole('button',{name:new RegExp('^Задание '+index+' —')}).first();
const taskText=async(page,index)=>taskRow(page,index).innerText();
async function waitTask(page,index,expected){
 return until(async()=>((await taskText(page,index))||'').includes(expected),
  'TaskList row '+index+' shows '+expected,30000);
}
async function openErrors(device){
 const {page}=device;
 await page.getByRole('button',{name:'Мои ошибки',exact:true}).last().click();
 await page.getByRole('heading',{name:'Мои ошибки'}).waitFor({timeout:30000});
}
async function waitError(page,text){
 await page.getByText('HOREN · horen-002',{exact:true}).waitFor({timeout:30000});
 await page.getByText(text,{exact:true}).waitFor({timeout:30000});
}
async function focusRealTab(page){
 const other=await page.context().newPage();
 try{
  await other.goto('about:blank');
  await other.bringToFront();
  await page.bringToFront();
 }finally{await other.close()}
}
async function waitGETAfter(device,previous,status,timeout=30000){
 return until(()=>stateGETs(device,status)>previous,
  device.label+' /api/state GET '+status+' after UI stays mounted',timeout);
}

try{
 // A: the ONLY initial result comes from verified server-side v1 state.
 const a=await createDevice(OWNER_A,'device-A');
 await openHorenList(a);
 await waitTask(a.page,1,'Выполнялось ранее');
 assert.equal((await v2Storage(a.page)).legacy,LEGACY_JSON);
 await ensureLocalV2Absent(a.page,'A before v2 GET');
 await capture(a.page,'A-list-before-v2-GET');
 note('A initial TaskList open with old neutral status and no local v2',{
  getCount:stateGETs(a,200),navigationCount:a.navigateCount});

 // Show that errors are initially absent: no v2 attempts are present.
 await openErrors(a);
 assert.equal(await a.page.getByRole('heading',{name:'История исправления ошибок'}).count(),0);
 await capture(a.page,'A-errors-before-v2-GET');
 await a.page.getByRole('button',{name:'Главная',exact:true}).click();
 await a.page.locator('.otto-dashboard-module-card').first().waitFor();
 await openHorenList(a);

 // A browser-native focus plus the application's own focus/timer logic
 // must perform the GET and render the result. Never inject a result or event.
 server.get(OWNER_A).set(key(OWNER_A,'horen','a'),makeJournal(OWNER_A,'horen',[mistake]));
 const navBefore=a.navigateCount,countBefore=stateGETs(a,200);
 await focusRealTab(a.page);
 await waitGETAfter(a,countBefore,200,30000);
 await waitTask(a.page,1,'Есть ошибки · 0/1');
 assert.equal(a.navigateCount,navBefore,'TaskList changed by top-level navigation');
 await ensureLocalV2Absent(a.page,'A after new server attempt');
 assert.equal((await v2Storage(a.page)).legacy,LEGACY_JSON);
 verifyLegacyServer();assertNoForbiddenWrites();
 await capture(a.page,'A-list-after-server-v2-GET-no-reload');
 note('TaskList updates from a subsequent confirmed GET without reload or reopening',
  {GETbefore:countBefore,GETafter:stateGETs(a,200),navigationCount:a.navigateCount});

 // MyErrorsPage must show the original error and react to later correction.
 await openErrors(a);
 await waitError(a.page,'Ошибка ещё не исправлена');
 await capture(a.page,'A-errors-with-original-server-mistake');
 note('MyErrorsPage contains the remote mistaken attempt');

 // Simulate a transient server failure while the visible page stays open.
 a.failStateGET=true;
 const failedBefore=stateGETs(a,503),navErrors=a.navigateCount;
 await focusRealTab(a.page);
 await waitGETAfter(a,failedBefore,503,30000);
 await waitError(a.page,'Ошибка ещё не исправлена');
 assert.equal(a.navigateCount,navErrors,'503 unexpectedly navigated away');
 assert.equal((await v2Storage(a.page)).legacy,LEGACY_JSON);
 await capture(a.page,'A-errors-preserved-after-503');
 note('503 does not clear visible history', {GET503:stateGETs(a,503)});

 // The same open online tab must recover through the application's own
 // scheduled retry. DO NOT dispatch task-results-changed or force React.
 const correctedState=makeJournal(OWNER_A,'horen',[mistake,corrected]);
 server.get(OWNER_A).set(key(OWNER_A,'horen','a'),correctedState);
 server.get(OWNER_A).set(key(OWNER_A,'horen','duplicate'),makeJournal(OWNER_A,'horen',[corrected]));
 a.failStateGET=false;
 const successfulBefore=stateGETs(a,200);
 await waitGETAfter(a,successfulBefore,200,45000);
 await waitError(a.page,'Ошибка исправлена');
 assert.equal(await a.page.getByText('HOREN · horen-002',{exact:true}).count(),1,
  'duplicate immutable attemptId must not duplicate the error-history row');
 assert.equal(a.navigateCount,navErrors,'MyErrorsPage refreshed via navigation, not real GET');
 await ensureLocalV2Absent(a.page,'A after automatic 503 recovery');
 assert.equal((await v2Storage(a.page)).legacy,LEGACY_JSON);
 assertNoForbiddenWrites();
 await capture(a.page,'A-errors-fixed-after-automatic-GET-no-reload');
 note('Open MyErrorsPage corrects after automatic online GET; duplicate attempt ID does not create extra row',
  {GETbefore:successfulBefore,GETafter:stateGETs(a,200),navigationCount:a.navigateCount});

 // Reload: the old in-memory snapshot is gone. The new value must be
 // hydrated again from authenticated GET, while local v2 remains empty.
 await a.page.reload({waitUntil:'domcontentloaded',timeout:60000});
 await a.page.locator('.otto-dashboard-module-card').first().waitFor({timeout:30000});
 await openHorenList(a);
 await waitTask(a.page,1,'Правильно · 1/1 · Исправлено');
 await ensureLocalV2Absent(a.page,'A after reload');
 await capture(a.page,'A-after-reload-from-server');
 note('Reload restored corrected result using server GET only',{GETcount:stateGETs(a,200)});

 // Independent second device for the SAME user, no v2 in its localStorage.
 const a2=await createDevice(OWNER_A,'device-A2-empty');
 await openHorenList(a2);
 await waitTask(a2.page,1,'Правильно · 1/1 · Исправлено');
 await ensureLocalV2Absent(a2.page,'second physical device');
 await capture(a2.page,'A2-second-device-server-recovery');
 note('New device independently restored full result through authenticated GET');

 // Different account must not receive or display account A's old/v2 data.
 server.get(OWNER_B).set(key(OWNER_B,'horen','b'),makeJournal(OWNER_B,'horen',[userBMiss]));
 const b=await createDevice(OWNER_B,'device-B');
 await openHorenList(b);
 await waitTask(b.page,1,'Ещё не выполнялось');
 await waitTask(b.page,2,'Есть ошибки · 0/1');
 assert.doesNotMatch(await taskText(b.page,1),/Исправлено|Правильно|Есть ошибки/,
  'account B obtained account A history');
 await ensureLocalV2Absent(b.page,'B independent account');
 await capture(b.page,'B-no-leak-of-account-A');
 note('Different account sees only its own server v2 journal');

 assert.ok(report.network.filter(e=>e.path==='/api/state'&&e.method==='GET'&&e.status===200&&
  e.receivedV2Keys?.some(k=>k.startsWith(PREFIX))).length>=4,
  'v2 was not actually served through multiple network GET requests');
 assertNoForbiddenWrites();
 for(const device of sessions){
  assert.deepEqual(device.jsErrors.filter(e=>/uncaught|TypeError|ReferenceError/i.test(e)),[],
   'browser JS errors on '+device.label);
 }
 report.passed=true;
 console.log('V2 BRIDGE BROWSER QA SUCCESS',JSON.stringify({
  scenarios:report.scenarios.map(s=>s.name),
  browserDevices:sessions.map(s=>s.label),
  successfulServerGETs:report.network.filter(x=>x.path==='/api/state'&&x.method==='GET'&&x.status===200).length,
  server503s:report.network.filter(x=>x.path==='/api/state'&&x.method==='GET'&&x.status===503).length,
  forbiddenWrites:report.network.filter(x=>x.path==='/api/state'&&['PUT','DELETE'].includes(x.method)&&
   (x.key===LEGACY||x.key?.startsWith(PREFIX))).length,
  localV2Keys:0,legacyServerValueUnchanged:server.get(OWNER_A)?.get(LEGACY)===LEGACY_JSON
 }));
}catch(error){
 report.errors.push({at:new Date().toISOString(),message:String(error),stack:String(error?.stack||error)});
 console.error('V2 BRIDGE BROWSER QA FAILURE',String(error?.stack||error));
 for(const device of sessions){
  if(device.page.isClosed())continue;
  try{await capture(device.page,'FAILURE-'+device.label)}catch{}
 }
 process.exitCode=1;
}finally{
 report.finishedAt=new Date().toISOString();
 report.network=report.network.slice(-1200);
 report.checks={
  originalLegacyServerJSONUnchanged:server.get(OWNER_A)?.get(LEGACY)===LEGACY_JSON,
  v2PutDeleteCount:report.network.filter(x=>x.path==='/api/state'&&
   ['PUT','DELETE'].includes(x.method)&&x.key?.startsWith(PREFIX)).length,
  legacyPutDeleteCount:report.network.filter(x=>x.path==='/api/state'&&
   ['PUT','DELETE'].includes(x.method)&&x.key===LEGACY).length,
 };
 fs.writeFileSync(DIR+'/browser-report.json',JSON.stringify(report,null,2));
 for(const device of sessions){
  try{await device.context.close()}catch{}
 }
 await browser.close();
}
