import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {gunzipSync} from 'node:zlib';
import ts from 'typescript';
import vm from 'node:vm';
const PREVIEW_URL='https://deploy-preview-19--otto-a1.netlify.app/';
const DIR='preview19-functional-artifacts';
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
 try{snapshot.qaStorage=await page.evaluate(()=>({mode:localStorage.getItem('otto-preview-app-mode-v2:preview19-browser-qa'),learningMode:JSON.parse(localStorage.getItem('otto-user-profile')||'null')?.learningMode,profileOwner:localStorage.getItem('otto-user-profile-owner-v1'),onboarding:localStorage.getItem('otto-onboarding-completed')}))}catch(error){snapshot.storageError=String(error)}
 fs.writeFileSync(prefix+'.json',JSON.stringify(snapshot,null,2));
 console.log('QA DIAGNOSTIC',JSON.stringify(snapshot));
 return snapshot;
}

async function newPage(width,height=850){
 const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block',permissions:['microphone']});
 const page=await context.newPage();
 const fakeServer={progress:{},activity:[],seen:new Set()};
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

function readReadingArchive(){
 let joined='';
 for(let n=1;n<=5;n++){
  const text=fs.readFileSync('src/data/lesen/archive/gz0'+n+'.ts','utf8');
  const found=text.match(/export default '([^']+)'/);
  assert.ok(found,'Reading gzip part '+n);
  joined+=found[1];
 }
 return JSON.parse(gunzipSync(Buffer.from(joined,'base64')).toString('utf8'));
}
function readListeningData(){
 const source=fs.readFileSync('src/data/listening.ts','utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};
 vm.runInNewContext(js,{exports,module:{exports}});
 const tasks=exports.listeningTasks;
 assert.equal(tasks.length,80);
 const assignments=Object.fromEntries([...fs.readFileSync('src/data/listeningParts.ts','utf8').matchAll(/\[(\d+),([123]),'/g)].map(m=>[Number(m[1]),Number(m[2])]));
 assert.equal(Object.keys(assignments).length,80);
 return {tasks,assignments};
}
const archive=readReadingArchive();
const listening=readListeningData();
const functional=[];
async function saveScreenshot(page,name){const path=DIR+'/functional-'+name+'.png';await page.screenshot({path,fullPage:true,timeout:18000});return path}
function captureState(){return {at:new Date().toISOString(),url:null}}
async function browserState(page){
 return page.evaluate(()=>{
  const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
  return {progress:read('goethe-a1-progress'),completion:read('otto-module-task-completion-v1'),lesen:read('otto-a1-lesen-progress-v2'),horen:read('otto-a1-hoeren-progress-v2'),resume:read('otto-training-resume-v1'),errors:read('otto-a1-activity-v1')};
 });
}
async function runFunctional(name,width,fn){
 let session=null;
 const result={scenario:name,viewport:width,environment:'isolated Chromium; mocked session/progress/AI; authentic deployed frontend and static assets',checks:[]};
 try{
  session=await newPage(width,width===1440?900:850);
  await fn(session.page,result,session.trace);
  result.status='PASS';
 }catch(e){
  result.status='FAIL';
  result.error=String(e&&e.stack||e);
  if(session){try{result.diagnostic=await dumpDiagnostic(session.page,'functional-failure-'+name,session.trace)}catch(err){result.diagError=String(err)}}
 }finally{
  functional.push(result);
  if(session){try{await session.context.close()}catch{}}
 }
}
async function openModule(page,label){
 await moduleCard(page,label).click();
 await page.getByRole('heading',{name:label+' A1'}).waitFor({timeout:20000});
}
function listButton(page,part,num){
 const prefix=part===1?'Brief & Nachrichten':part===2?'Webseite & Anzeige':'Schild & Hinweis';
 return page.getByRole('button',{name:new RegExp('^Задание '+num+' — '+prefix+'(?:\\s|$)')});
}
async function openLesenTeil(page,part){
 await page.getByRole('button',{name:new RegExp('Открыть Teil '+part+' ·')}).click();
 await page.getByRole('heading',{name:'Задания Teil '+part}).waitFor();
}
async function lesenAnswer(page,part,task,correct){
 if(part===1){
  const opts=page.locator('section.mb-4').first();
  for(let i=0;i<task.statements.length;i++){
   const wanted=correct?task.statements[i].correct:!task.statements[i].correct;
   await opts.getByRole('button',{name:wanted?'Richtig':'Falsch',exact:true}).nth(i).click();
  }
 }else if(part===2){
  const wanted=correct?task.correct:(task.correct==='a'?'b':'a');
  const options=page.locator('section.mb-4.space-y-3 button.h-full');
  assert.equal(await options.count(),2,'Lesen Teil2 must expose two selectable answers');
  await options.nth(wanted==='a'?0:1).click();
 }else{
  const wanted=correct?task.correct:(task.correct==='Richtig'?'Falsch':'Richtig');
  await page.locator('section.mb-4 button').filter({hasText:new RegExp('^'+wanted+'$')}).last().click();
 }
 await page.getByRole('button',{name:'Проверить',exact:true}).click();
 await page.getByText('За задание:').first().waitFor({timeout:10000});
}
async function home(page){
 await page.getByRole('button',{name:'Главная',exact:true}).click();
 await page.locator('.otto-dashboard-module-card').first().waitFor();
}
async function firstLesen(page,part){
 await openModule(page,'Lesen');
 await openLesenTeil(page,part);
 await page.getByRole('button',{name:/^Продолжить с задания/}).click();
 await page.getByRole('heading',{name:'Lesen · Teil '+part}).waitFor();
}
for(const part of [1,2,3]){
 await runFunctional('lesen-correct-wrong-teil'+part,436,async(page,record)=>{
  await firstLesen(page,part);
  const task=archive['teil'+part][0];
  await lesenAnswer(page,part,task,false);
  record.screenshots=[await saveScreenshot(page,'lesen-'+part+'-wrong')];
  record.checks.push('Wrong answers submitted through rendered answer controls');
  await page.getByRole('button',{name:'Назад',exact:true}).first().click();
  await page.getByRole('heading',{name:'Задания Teil '+part}).waitFor();
  let item=listButton(page,part,1);
  assert.match(await item.innerText(),/Есть ошибки/,'Red card expected');
  await item.click();
  await lesenAnswer(page,part,task,true);
  await page.getByRole('button',{name:'Назад',exact:true}).first().click();
  await page.getByRole('heading',{name:'Задания Teil '+part}).waitFor();
  item=listButton(page,part,1);
  assert.match(await item.innerText(),/Правильно/,'Card should turn green');
  record.screenshots.push(await saveScreenshot(page,'lesen-'+part+'-repaired'));
  const state=await browserState(page);
  const key=part+'-0';
  assert.equal(state.completion?.taskResults?.lesen?.[key]?.attempts?.length,2);
  record.checks.push('Correct retry turned task card green; history contains both attempts');
 });
}
for(const part of [1,2,3]){
 await runFunctional('hoeren-audio-answers-teil'+part,436,async(page,record)=>{
  await openModule(page,'Hören');
  await page.getByRole('button',{name:new RegExp('Teil '+part)}).first().click();
  await page.getByRole('heading',{name:'Задания Teil '+part}).waitFor();
  await page.getByRole('button',{name:/^Продолжить с задания/}).click();
  const task=listening.tasks.find(t=>listening.assignments[t.number]===part);
  assert.ok(task);
  const audio=page.locator('audio[controls]').first();
  const mp3=await audio.getAttribute('src');
  assert.ok(mp3.endsWith(String(task.number).padStart(3,'0')+'.mp3'));
  await audio.evaluate(async node=>{await node.play();await new Promise(done=>setTimeout(done,500));return node.currentTime});
  const media=await audio.evaluate(node=>({duration:node.duration,time:node.currentTime,paused:node.paused,readyState:node.readyState}));
  assert.ok(media.readyState>=2,'MP3 did not load media data');
  assert.ok(media.time>0,'MP3 did not advance in Chromium player');
  const image=page.locator('img[alt^="Иллюстрация к заданию"]').first();
  await image.waitFor();
  await image.evaluate(async img=>img.decode());
  const size=await image.evaluate(img=>({w:img.naturalWidth,h:img.naturalHeight}));
  assert.ok(size.w>0&&size.h>0,'PNG absent');
  const answer=task.type==='multiple-choice'?String.fromCharCode(65+task.correctIndex)+'.':task.correctAnswer?'Richtig':'Falsch';
  if(task.type==='multiple-choice')await page.getByRole('button',{name:new RegExp('^'+answer.replace('.','\\.')+'\\s')}).first().click();
  else await page.locator('button.min-h-12').filter({hasText:new RegExp('^'+answer+'$')}).first().click();
  await page.getByRole('button',{name:'Проверить',exact:true}).click();
  await page.getByText('Правильно',{exact:true}).first().waitFor();
  await saveScreenshot(page,'hoeren-'+part+'-correct');
   await page.getByRole('button',{name:/^Далее/}).click();
  await page.getByRole('button',{name:'Назад',exact:true}).first().click();
  await page.getByRole('heading',{name:'Задания Teil '+part}).waitFor();
  record.audio={mp3,media,image:size};
  record.checks.push('Actual MP3 playback, PNG decode, correct answer, next task, return to list');
 });
}
await runFunctional('lesen-ten-tasks-70-to-90-reload',436,async(page,record)=>{
 await firstLesen(page,2);
 const choices=[true,true,true,true,true,true,true,false,false,false];
 for(let i=0;i<10;i++){
  await page.getByText('Задание '+(i+1)+' из 50',{exact:false}).first().waitFor();
  await lesenAnswer(page,2,archive.teil2[i],choices[i]);
   await page.getByRole('button',{name:/^Далее/}).click();
 }
 let state=await browserState(page);
 const results=state.completion?.taskResults?.lesen||{};
 const all=Object.values(results);
 assert.equal(Object.keys(results).length,10,'Unique task results');
 assert.equal(all.filter(v=>v.status==='correct').length,7,'Initial 70 percent');
 assert.equal(state.completion?.lesen?.length,10,'Ten unique completions');
 record.before={completed:10,successful:7,attempts:all.reduce((n,v)=>n+v.attempts.length,0),cursor:state.lesen?.['2']?.nextIndex};
 await saveScreenshot(page,'reading-ten-before');
 await home(page);
 let dash=await moduleCard(page,'Lesen').innerText();
 record.dashboardBefore=dash;
 await moduleCard(page,'Lesen').click();
 await openLesenTeil(page,2);
 for(const number of [8,9]){
  await listButton(page,2,number).click();
  await lesenAnswer(page,2,archive.teil2[number-1],true);
   await page.getByRole('button',{name:'К списку заданий'}).click();
  await page.getByRole('heading',{name:'Задания Teil 2'}).waitFor();
  assert.match(await listButton(page,2,number).innerText(),/Правильно/,'Correction should turn green');
 }
 await saveScreenshot(page,'reading-ten-repaired');
 state=await browserState(page);
 const corrected=state.completion?.taskResults?.lesen||{};
 assert.equal(Object.keys(corrected).length,10,'No duplicate completion');
 assert.equal(Object.values(corrected).filter(v=>v.status==='correct').length,9);
 assert.equal(corrected['2-7'].attempts.length,2);
 assert.equal(corrected['2-8'].attempts.length,2);
 assert.equal(state.completion?.lesen?.length,10);
 assert.equal(state.lesen?.['2']?.nextIndex,10,'Manual corrections cannot move continue position');
 record.after={completed:10,successful:9,history:[corrected['2-7'].attempts,corrected['2-8'].attempts],cursor:state.lesen?.['2']?.nextIndex,rawProgress:state.progress?.lesen};
 await home(page);
 dash=await moduleCard(page,'Lesen').innerText();
 record.dashboardAfter=dash;
 await saveScreenshot(page,'reading-readiness-after');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('.otto-dashboard-module-card').first().waitFor({timeout:30000});
 const reloaded=await browserState(page);
 record.reloaded={taskStatuses:Object.values(reloaded.completion?.taskResults?.lesen||{}).filter(v=>v.status==='correct').length,completed:reloaded.completion?.lesen?.length,cursor:reloaded.lesen?.['2']?.nextIndex,progress:reloaded.progress?.lesen};
 assert.equal(record.reloaded.taskStatuses,9,'Result restored after refresh');
 assert.equal(record.reloaded.completed,10);
 assert.equal(record.reloaded.cursor,10);
 record.dashboardAfterReload=await moduleCard(page,'Lesen').innerText();
 record.checks.push('Ten tasks, seven initially correct, two corrected, nine successes, unique completion 10, cursor retained, refreshed');
 assert.match(dash,/Успешность 90%/,'Dashboard readiness must immediately reflect corrected 90%, without reload');
 assert.match(record.dashboardAfterReload,/Успешность 90%/,'Dashboard readiness must survive reload');
});
await runFunctional('schreiben-three-modes-and-draft',436,async(page,record)=>{
 await openModule(page,'Schreiben');
 await page.getByRole('button',{name:/Teil 2 · Brief/}).click();
 await page.getByRole('heading',{name:'Задания Teil 2'}).waitFor();
 const openLetter=async()=>{await page.getByRole('button',{name:/^Письмо 7(?:\s|$)/}).click();await page.getByRole('heading',{name:'Как будем писать письмо?'}).waitFor()};
 const answer='Liebe Frau Müller, ich komme morgen um zehn Uhr. Bitte schreiben Sie mir. Vielen Dank und freundliche Grüße, Maria.';
 const modes=[{name:'Учусь на примере',type:'guided'},{name:'Пишу вместе с Отто',type:'coach'},{name:'Пишу сама',type:'solo'}];
 for(const mode of modes){
  await openLetter();
  await page.getByRole('button',{name:new RegExp(mode.name)}).click();
  await page.getByText('Письмо 7 из').first().waitFor();
  if(mode.type==='guided'){
   await page.getByRole('button',{name:'Показать пример'}).click();
   await page.getByText('QA пример',{exact:false}).first().waitFor();
   await page.getByRole('button',{name:/Закрыть пример и написать/}).click();
  }
  if(mode.type==='coach'){
   await page.getByRole('button',{name:'Нужна подсказка'}).click();
   await page.getByRole('button',{name:'Скрыть подсказку'}).waitFor();
  }
  await page.locator('textarea[placeholder*="Напишите"]').fill(answer);
  await page.getByRole('button',{name:'Проверить с Отто'}).click();
  await page.getByText('Результат по шкале Goethe').waitFor();
  await saveScreenshot(page,'schreiben-'+mode.type);
   await page.getByRole('button',{name:'К списку заданий'}).click();
  await page.getByRole('heading',{name:'Задания Teil 2'}).waitFor();
  record.checks.push(mode.type+' mode written answer, QA mock checked, list return');
 }
 await openLetter();
 await page.getByRole('button',{name:/Пишу сама/}).click();
 await page.locator('textarea').first().fill(answer);
 await page.locator('div.mb-5.flex.items-center.gap-3 > button').first().click();
 await page.getByRole('button',{name:/Пишу вместе с Отто/}).click();
 const draft=await page.locator('textarea[placeholder*="Напишите"]').inputValue();
 assert.equal(draft,answer,'Draft must survive mode changes within same app session');
 await saveScreenshot(page,'schreiben-draft-same-session');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('.otto-dashboard-module-card').first().waitFor({timeout:30000});
 await openModule(page,'Schreiben');
 await page.getByRole('button',{name:/Teil 2 · Brief/}).click();
 await openLetter();
 await page.getByRole('button',{name:/Пишу сама/}).click();
 const afterReload=await page.locator('textarea[placeholder*="Напишите"]').inputValue();
 record.draftAfterReload=afterReload;
 await saveScreenshot(page,'schreiben-draft-after-reload');
 assert.equal(afterReload,answer,'Draft should persist across browser reload');
});
async function useFakeMicrophone(page){
 await page.getByRole('button',{name:'Записать ответ'}).click();
 await page.getByRole('button',{name:'Остановить запись'}).waitFor({timeout:12000});
 await page.waitForTimeout(1200);
 await page.getByRole('button',{name:'Остановить запись'}).click();
 await page.getByRole('button',{name:'Перезаписать'}).waitFor({timeout:12000});
 await page.getByRole('button',{name:'Проверить с Отто'}).click();
 await page.getByText('Проверка с Отто',{exact:true}).waitFor({timeout:20000});
}
await runFunctional('sprechen-teil1-2-3-recording-independence',436,async(page,record,trace)=>{
 await openModule(page,'Sprechen');
 for(const part of [1,2,3]){
  await page.getByRole('button',{name:new RegExp('Teil '+part)}).first().click();
  await page.getByRole('heading',{name:'Задания Teil '+part}).waitFor();
  const cardCount=await page.locator('button.min-h-14').count();
  assert.ok(cardCount>0);
  await page.locator('button.min-h-14').first().click();
  await useFakeMicrophone(page);
  await saveScreenshot(page,'sprechen-'+part+'-first-recorded');
  if(part===1){await page.getByRole('button',{name:'Завершить Teil 1'}).click()}
  else{
    await page.getByRole('button',{name:'К списку заданий'}).click();
   await page.getByRole('heading',{name:'Задания Teil '+part}).waitFor();
   await page.locator('button.min-h-14').nth(1).click();
   await page.getByRole('button',{name:'Записать ответ'}).waitFor();
   assert.equal(await page.getByRole('button',{name:'Перезаписать'}).count(),0,'Recording from previous card must not persist');
   await saveScreenshot(page,'sprechen-'+part+'-second-empty');
   await page.getByRole('button',{name:'Назад',exact:true}).first().click();
  }
  await page.getByRole('button',{name:'Назад к выбору Teil'}).click();
  await page.getByRole('heading',{name:'Sprechen A1'}).waitFor();
  record.checks.push('Sprechen Teil '+part+': fake-mic MediaRecorder capture, mocked AI evaluation, list/back and recording isolation');
 }
 record.mockEvaluations=trace.speechChecks;
 assert.equal(trace.speechChecks?.length,3,'Three mocked voice evaluations');
});
fs.writeFileSync(DIR+'/functional-report.json',JSON.stringify(functional,null,2));
const failures=functional.filter(row=>row.status==='FAIL');
console.log('FUNCTIONAL QA SUMMARY',JSON.stringify(functional.map(r=>({scenario:r.scenario,status:r.status,checks:r.checks,error:r.error?.slice(0,350)})),null,2));
await browser.close();
if(failures.length)process.exitCode=1;
