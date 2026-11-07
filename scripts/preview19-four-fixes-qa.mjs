import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {gunzipSync} from 'node:zlib';
import ts from 'typescript';
import vm from 'node:vm';
const PREVIEW_URL='https://deploy-preview-19--otto-a1.netlify.app/';
const DIR='preview19-four-fixes-artifacts';
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

async function newPage(width,height=850,learningMode='direct'){
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
  if(path==='/api/profile')return body({authenticated:true,userId:'preview19-browser-qa',profile:{...profile,learningMode}});
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
 // Initialize once per browser tab, without replacing the chosen mode at reload.
 await page.addInitScript(()=>{
  const marker='otto-preview19-qa-initial-mode-set';
  if(sessionStorage.getItem(marker)==='1')return;
  sessionStorage.setItem(marker,'1');
  localStorage.setItem('otto-preview-app-mode-v2:preview19-browser-qa','training');
 });
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
  assert.equal(trace.api.find(item=>item.path==='/api/profile')?.mode,learningMode,'invalid test account learningMode');
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


const captures=[];
async function shot(page,name){
 const path=DIR+'/'+name+'.png';
 await page.screenshot({path,fullPage:true,timeout:18000});
 return path;
}
async function check(name,task){
 const item={name,status:'PENDING',screenshots:[]};
 try{await task(item);item.status='PASS';}catch(e){item.status='FAIL';item.error=String(e?.stack||e);}
 captures.push(item);
 console.log('FOUR-FIXES',JSON.stringify(item));
}
async function entry(page,module,part){
 await page.locator('.otto-dashboard-module-card').filter({hasText:module}).click();
 const introduction=page.getByRole('button',{name:'Перейти к тренировке'});
 if(await introduction.isVisible())await introduction.click();
 await page.getByRole('heading',{name:module+' A1'}).waitFor();
 if(module==='Lesen')await page.getByRole('button',{name:new RegExp('Открыть Teil '+part+' ·')}).click();
 else await page.getByRole('button',{name:new RegExp('Teil '+part)}).first().click();
 await page.getByRole('heading',{name:'Задания Teil '+part}).waitFor();
}
async function openFirst(page){
 await page.getByRole('button',{name:/Продолжить с задания/}).click();
}
async function assertCollapsed(page){
 const prep=page.locator('[aria-label="Подготовка перед заданием"]');
 await prep.waitFor();
 assert.equal(await prep.getByRole('button',{name:/Показать/}).getAttribute('aria-expanded'),'false');
 await prep.getByRole('button',{name:/Показать/}).click();
 assert.equal(await prep.getByRole('button',{name:/Свернуть/}).getAttribute('aria-expanded'),'true');
 await prep.getByRole('button',{name:/Свернуть/}).click();
 assert.equal(await prep.getByRole('button',{name:/Показать/}).getAttribute('aria-expanded'),'false');
}
// Measure both button boxes in a single DOM evaluation. This is diagnostic only:
// the original separate Playwright boundingBox assertion still decides PASS/FAIL.
async function measureBottomButtons(page,label,phase){
 return page.evaluate(({label,phase})=>{
  const rounded=n=>Number(n.toFixed(3));
  const geometry=el=>{
   if(!el)return null;
   const r=el.getBoundingClientRect();
   const css=getComputedStyle(el);
   return {x:rounded(r.x),y:rounded(r.y),width:rounded(r.width),
    height:rounded(r.height),top:rounded(r.top),bottom:rounded(r.bottom),
    position:css.position,display:css.display,alignSelf:css.alignSelf,
    lineHeight:css.lineHeight,minHeight:css.minHeight,boxSizing:css.boxSizing,
    transform:css.transform,transitionDuration:css.transitionDuration,
    animationName:css.animationName,animationDuration:css.animationDuration};
  };
  const visible=el=>{
   const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
   return rect.width>0&&rect.height>0&&style.visibility!=='hidden'&&style.display!=='none';
  };
  const names=el=>(el.innerText||'').replace(/\s+/g,' ').trim();
  const buttons=Array.from(document.querySelectorAll('button')).filter(visible);
  const lefts=buttons.filter(el=>names(el)==='К списку заданий');
  const rights=buttons.filter(el=>/^Далее(?:\s|$)/.test(names(el)));
  const left=lefts[0]??null,right=rights[0]??null;
  const grid=left?.parentElement??null,css=grid?getComputedStyle(grid):null;
  const parent={...geometry(grid),className:grid?.className??null,
   sharedParent:Boolean(grid&&right?.parentElement===grid),
   gridTemplateColumns:css?.gridTemplateColumns??null,
   gridTemplateRows:css?.gridTemplateRows??null,
   gridAutoRows:css?.gridAutoRows??null,
   alignItems:css?.alignItems??null,alignContent:css?.alignContent??null,
   justifyItems:css?.justifyItems??null,justifyContent:css?.justifyContent??null,
   gap:css?.gap??null,rowGap:css?.rowGap??null,columnGap:css?.columnGap??null,
   padding:css?.padding??null,flexWrap:css?.flexWrap??null};
  const leftBox=geometry(left),rightBox=geometry(right);
  const diff=leftBox&&rightBox?rounded(leftBox.y-rightBox.y):null;
  return {label,phase,at:new Date().toISOString(),performanceMs:rounded(performance.now()),
   viewport:{width:innerWidth,height:innerHeight,scrollX,scrollY,
    clientWidth:document.documentElement.clientWidth,
    scrollHeight:document.documentElement.scrollHeight,
    bodyHeight:document.body?.getBoundingClientRect().height??null,
    fontStatus:document.fonts?.status??null,devicePixelRatio},
   visibleButtonCounts:{left:lefts.length,right:rights.length},
   left:leftBox,right:rightBox,parent,deltaY:diff,
   deltaHeight:leftBox&&rightBox?rounded(leftBox.height-rightBox.height):null,
   deltaBottom:leftBox&&rightBox?rounded(leftBox.bottom-rightBox.bottom):null,
   aligned:leftBox&&rightBox?leftBox.y<=rightBox.y+4&&Math.abs(diff)<8:null};
 },{label,phase});
}
async function sampleStableBottomButtons(page,label,first){
 const samples=[first];
 let unchangedCount=0;
 for(let i=0;i<10;i++){
  // Observe two rendered frames and give React/CSS layout updates time to settle.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.waitForTimeout(100);
  const current=await measureBottomButtons(page,label,'settling-'+(i+1));
  const previous=samples[samples.length-1];
  samples.push(current);
  const values=x=>[x.left?.y,x.left?.height,x.right?.y,x.right?.height,
   x.parent?.y,x.parent?.height,x.viewport.scrollHeight,x.viewport.bodyHeight];
  const a=values(previous),b=values(current);
  const unchanged=a.every((v,k)=>typeof v==='number'&&typeof b[k]==='number'&&Math.abs(v-b[k])<0.25);
  unchangedCount=unchanged?unchangedCount+1:0;
  if(unchangedCount>=2)break;
 }
 return {samples,stable:unchangedCount>=2,final:samples[samples.length-1]};
}
async function listAndNext(page,item,label){
 const beforeSkip=await measureBottomButtons(page,label,'before-skip');
 await page.getByRole('button',{name:'Пропустить',exact:true}).last().click();
 const left=page.getByRole('button',{name:'К списку заданий'}),right=page.getByRole('button',{name:/^Далее/});
 await left.waitFor();await right.waitFor();
 const immediate=await measureBottomButtons(page,label,'after-skip-immediate');
 // Preserve the PREVIOUS assertion's sequential measurements and thresholds.
 const leftBox=await left.boundingBox(),rightBox=await right.boundingBox();
 const previousAssertion=Boolean(leftBox&&rightBox&&leftBox.y<=rightBox.y+4&&Math.abs(leftBox.y-rightBox.y)<8);
 const initialScreenshot=await shot(page,label+'-after-skip-before-alignment-assert');
 item.screenshots.push(initialScreenshot);
 const settled=await sampleStableBottomButtons(page,label,immediate);
 const settledScreenshot=await shot(page,label+'-after-layout-stabilization');
 item.screenshots.push(settledScreenshot);
 const record={label,beforeSkip,immediate,
  originalSequential:{left:leftBox,right:rightBox,
   deltaY:leftBox&&rightBox?Number((leftBox.y-rightBox.y).toFixed(3)):null,
   aligned:previousAssertion},
  settling: settled.samples,stable: settled.stable,final: settled.final,
  pageChangedAfterSkip:{
   scrollHeightBefore:beforeSkip.viewport.scrollHeight,
   scrollHeightImmediate:immediate.viewport.scrollHeight,
   scrollHeightStable:settled.final.viewport.scrollHeight,
   bodyHeightBefore:beforeSkip.viewport.bodyHeight,
   bodyHeightImmediate:immediate.viewport.bodyHeight,
   bodyHeightStable:settled.final.viewport.bodyHeight,
  },screenshots:[initialScreenshot,settledScreenshot]};
 const diagnosticFile=DIR+'/'+label+'-alignment-diagnostic.json';
 fs.writeFileSync(diagnosticFile,JSON.stringify(record,null,2));
 item.alignmentDiagnostic=diagnosticFile;
 console.log('BOTTOM BUTTON ALIGNMENT DIAGNOSTIC',JSON.stringify(record));
 // Do NOT relax, remove, or replace the original PASS/FAIL gate.
 assert.ok(leftBox&&rightBox&&leftBox.y<=rightBox.y+4&&Math.abs(leftBox.y-rightBox.y)<8,'bottom buttons not aligned');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
 assert.equal(overflow,false,'horizontal overflow in '+label);
 item.screenshots.push(await shot(page,label+'-bottom-actions'));
 await right.click();
}
for(const mode of ['direct','guided']){
 await check('A - Lesen collapsed prep in '+mode,async item=>{
  const {page,context}=await newPage(436,850,mode);
  try{
   await entry(page,'Lesen',1);
   await openFirst(page);
   await assertCollapsed(page);
   await listAndNext(page,item,'lesen-'+mode+'-task1');
   await page.getByText('Задание 2 из 50',{exact:false}).first().waitFor();
   await assertCollapsed(page);
   item.screenshots.push(await shot(page,'lesen-'+mode+'-task2-prep'));
   await page.getByRole('button',{name:'Назад',exact:true}).first().click();
   await page.getByRole('heading',{name:'Задания Teil 1'}).waitFor();
   await page.getByRole('button',{name:/^Задание 10 —/}).click();
   await assertCollapsed(page);
  }finally{await context.close()}
 });
}
for(const [run,part] of [1,1,2,3].entries()){
 const repeat=part===1&&run===1?'-repeat':'';
 await check('A+D - Hören numbered list & prep in Teil '+part+(repeat?' (repeat)':''),async item=>{
  const {page,context}=await newPage(436);
  try{
   await entry(page,'Hören',part);
   const rows=page.getByRole('button',{name:/^Задание \d+ —/});
   const expected={1:21,2:40,3:19}[part];
   assert.equal(await rows.count(),expected);
   for(const n of [1,2,expected]){
    assert.match(await rows.nth(n-1).innerText(),new RegExp('^Задание '+n+' —'));
   }
   item.screenshots.push(await shot(page,'horen-teil'+part+repeat+'-numbered-list'));
   await openFirst(page);
   await assertCollapsed(page);
   await listAndNext(page,item,'horen-teil'+part+repeat+'-task1');
   await page.getByText('Задание 2 из '+expected,{exact:false}).first().waitFor();
   await assertCollapsed(page);
   item.screenshots.push(await shot(page,'horen-teil'+part+repeat+'-task2-prep'));
   await page.getByRole('button',{name:'Назад',exact:true}).first().click();
   await page.getByRole('button',{name:/^Задание 10 —/}).click();
   await assertCollapsed(page);
  }finally{await context.close()}
 });
}
await check('B+C - Lesen next follows manual retry and last part',async item=>{
 const {page,context}=await newPage(436);
 try{
  await entry(page,'Lesen',2);
  await page.getByRole('button',{name:/^Задание 3 —/}).click();
  await page.getByRole('button',{name:'Пропустить',exact:true}).click();
  await page.getByRole('button',{name:/^Далее/}).click();
  await page.getByText('Задание 4 из 50',{exact:false}).first().waitFor();
  item.screenshots.push(await shot(page,'lesen-manual-3-to-4'));
  await page.getByRole('button',{name:'Назад',exact:true}).first().click();
  await page.getByRole('button',{name:/^Задание 49 —/}).click();
  await page.getByRole('button',{name:'Пропустить',exact:true}).click();
  await page.getByRole('button',{name:/^Далее/}).click();
  await page.getByText('Задание 50 из 50',{exact:false}).first().waitFor();
  await page.getByRole('button',{name:'Пропустить',exact:true}).click();
  await page.getByRole('button',{name:/^Далее/}).click();
  await page.getByText('Teil 2',{exact:false}).first().waitFor();
  item.screenshots.push(await shot(page,'lesen-teil2-complete'));
 }finally{await context.close()}
});
await check('E - two learning Formulars, error, situation, reload',async item=>{
 const {page,context}=await newPage(436);
 try{
  await page.evaluate(()=>{
   const id='preview19-browser-qa';
   localStorage.setItem('otto-preview-app-mode-v2:'+id,'learning');
   localStorage.setItem('otto-preview-learning-location-v1:'+id,'schreiben');
   localStorage.setItem('otto-preview-learning-v2:'+id,JSON.stringify({known:[],weak:[],completedCategories:[],stage:'form',currentCategory:null,currentExercise:0}));
   localStorage.setItem('form_training_progress:'+id,JSON.stringify({screen:'form',vocabIndex:0,currentForm:0,currentField:0,fieldPhase:'meaning',answers:{},statuses:{},attempts:{},completed:[]}));
  });
  // Navigate through the actual app control: App's mode state is not updated
  // merely by mutating localStorage during the already-mounted training view.
  await page.getByRole('button',{name:'Обучение',exact:true}).click();
  const resume=page.getByRole('button',{name:'Продолжить',exact:true});
  for(let tick=0;tick<55;tick++){
   if(await resume.isVisible())break;
   const later=page.getByRole('button',{name:'Посмотреть позже'});
   const tour=page.getByRole('button',{name:'Закрыть экскурсию'});
   const tourSkip=page.getByRole('button',{name:'Пропустить',exact:true});
   if(await later.isVisible()){await later.click();continue}
   if(await tour.isVisible()){await tour.click();continue}
   if(await tourSkip.isVisible()){await tourSkip.click();continue}
   const learningModules=page.getByRole('button',{name:/Schreiben/}).first();
   if(await learningModules.isVisible() && await page.getByText('Учебные модули A1').isVisible()){await learningModules.click();continue}
   const formular=page.getByRole('button',{name:'Формуляр',exact:true});
   if(await formular.isVisible()){await formular.click();continue}
   const menu=page.getByRole('button',{name:'Меню обучения'});
   if(await menu.isVisible()){
    const teilSelect=page.getByRole('button',{name:'Выбор Teil'});
    if(await teilSelect.isVisible()){await teilSelect.click();continue}
    if(await menu.getAttribute('aria-expanded')!=='true'){await menu.click();continue}
   }
   await page.waitForTimeout(400);
  }
  if(!await resume.isVisible())throw Error('Formular training entry not reached: '+(await page.locator('body').innerText()).slice(0,2400));
  await resume.click();
  await page.getByRole('heading',{name:'Бронирование поездки'}).waitFor();
  item.screenshots.push(await shot(page,'formular-first-screen'));
  const formData=[
   {name:'Бронирование поездки',fields:[['фамилия','Kadavy'],['общее количество людей','4'],['сколько из них детей','2']]},
   {name:'Гостиница',fields:[['фамилия','Berger'],['место жительства','Köln'],['номер телефона','0176 445566']]}
  ];
  for(const [formIndex,data] of formData.entries()){
   for(const [fieldIndex,field] of data.fields.entries()){
    if(formIndex===0&&fieldIndex===0){
     await page.getByRole('button',{name:'город',exact:true}).click();
     await page.getByRole('button',{name:'Проверить',exact:true}).click();
     await page.getByText('Попробовать снова',{exact:true}).waitFor();
     await page.getByRole('button',{name:'Попробовать снова'}).click();
    }
    await page.getByRole('button',{name:field[0],exact:true}).click();
    await page.getByRole('button',{name:'Проверить',exact:true}).click();
    const input=page.locator('#form-value');
    await input.waitFor();
    if(formIndex===0&&fieldIndex===0){
     await input.fill('Kada');
     await page.getByRole('button',{name:/Посмотреть ситуацию/}).click();
     await page.getByRole('heading',{name:'Исходная ситуация'}).waitFor();
     item.screenshots.push(await shot(page,'formular-situation-overlay'));
     await page.getByRole('button',{name:'Вернуться к полю'}).click();
     assert.equal(await input.inputValue(),'Kada','overlay changed field input');
     await input.fill('Eva');
     await page.getByRole('button',{name:'Проверить',exact:true}).click();
     await page.getByRole('button',{name:'Попробовать снова'}).click();
    }
    await input.fill(field[1]);
    await page.getByRole('button',{name:'Проверить',exact:true}).click();
   }
   await page.getByRole('heading',{name:/Формуляр заполнен/}).waitFor();
   item.screenshots.push(await shot(page,'formular-'+(formIndex+1)+'-complete'));
   if(formIndex===0){
    const readFormState=()=>page.evaluate(()=>({
     mode:localStorage.getItem('otto-preview-app-mode-v2:preview19-browser-qa'),
     location:localStorage.getItem('otto-preview-learning-location-v1:preview19-browser-qa'),
     learning:JSON.parse(localStorage.getItem('otto-preview-learning-v2:preview19-browser-qa')||'null'),
     form:JSON.parse(localStorage.getItem('form_training_progress:preview19-browser-qa')||'null'),
    }));
    const before=await readFormState();
    assert.equal(before.mode,'learning','Formular must be in learning mode before reload');
    assert.equal(before.learning?.stage,'form','Formular learning stage must be saved');
    assert.equal(before.form?.screen,'result','Completed Formular must be saved before reload');
    assert.equal(before.form.currentForm,0);
    assert.ok(before.form.completed.includes(0),'First Formular completion must survive');
    for(const [index,field] of data.fields.entries()){
     assert.equal(before.form.answers['0:'+index],field[1],'Saved field '+index+' mismatch');
    }
    await page.reload({waitUntil:'domcontentloaded'});
    const after=await readFormState();
    assert.equal(after.mode,'learning','Reload changed learning mode');
    assert.equal(after.location,before.location,'Reload changed saved learning module location');
    assert.equal(after.learning?.stage,before.learning.stage,'Reload changed learning stage');
    assert.deepEqual(after.form,before.form,'Reload changed completed Formular or answers');
    const resumeAfterReload=page.getByRole('button',{name:'Продолжить',exact:true});
    try{
     await resumeAfterReload.waitFor({state:'visible',timeout:20000});
     await page.getByRole('heading',{name:/Продолжить с формуляра 1/}).waitFor();
    }catch(error){
     const report=await dumpDiagnostic(page,'formular-reload-entry-failed',trace);
     if(report.screenshot)item.screenshots.push(report.screenshot);
     throw new Error('Formular resume screen missing: '+String(error));
    }
    item.screenshots.push(await shot(page,'formular-after-reload-resume'));
    await resumeAfterReload.click();
    await page.getByRole('heading',{name:/Формуляр заполнен/}).waitFor();
    assert.deepEqual((await readFormState()).form.answers,before.form.answers,'Resuming overwrote saved answers');
    await page.getByRole('button',{name:/^Далее/}).click();
    await page.getByRole('heading',{name:data.name==='Бронирование поездки'?'Гостиница':'Бронирование поездки'}).waitFor();
   }
  }
 }finally{await context.close()}
});
fs.writeFileSync(DIR+'/four-fixes-report.json',JSON.stringify(captures,null,2));
console.log('FOUR FIXES QA SUMMARY',JSON.stringify(captures.map(x=>({name:x.name,status:x.status,error:x.error?.slice(0,700),screenshots:x.screenshots.length})),null,2));
await browser.close();
if(captures.some(x=>x.status==='FAIL'))process.exitCode=1;
