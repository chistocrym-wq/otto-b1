import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const HOST='https://deploy-preview-25--otto-a1.netlify.app';
const U='11111111-1111-4111-8111-111111111115';
const widths=[320,360,375,390,414,1280];
const browser=await chromium.launch({headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const profile={name:'Synthetic Student',contactType:'email',contact:'qa-only@example.test',contactVerified:true,authStatus:'verified',gender:'female',learningMode:'direct',onboardingCompleted:true,createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-01T00:00:00Z'};
const output='artifacts/preview25';
fs.mkdirSync(output,{recursive:true});
const results=[];
try{
 for(const guest of [true,false])for(const width of widths){
  const ctx=await browser.newContext({viewport:{width,height:850},serviceWorkers:'block'});
  await ctx.grantPermissions(['microphone'],{origin:HOST});
  const page=await ctx.newPage(),errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  await ctx.addInitScript(({u})=>{
   localStorage.setItem('otto-preview20-story-seen-v1','1');
   localStorage.setItem('otto-preview-app-mode-v2:'+u,'training');
   localStorage.setItem('otto-preview-app-mode-v2:local','training');
   localStorage.setItem('otto-preview-app-mode-v2:preview20-guest-local','training');
   localStorage.setItem('otto-preview-tour-seen-v1:'+u,'1');
   localStorage.setItem('otto-preview-tour-seen-v1:preview20-guest-local','1');
   localStorage.setItem('otto-guided-module-intros-v1',JSON.stringify(['horen','lesen','schreiben','sprechen']));
   localStorage.setItem('otto-preview20-analytics-choice-v1','necessary');
  },{u:U});
  await ctx.route('**/api/**',route=>{
   const req=route.request(),p=new URL(req.url()).pathname,m=req.method();
   assert.equal(new URL(req.url()).origin,HOST,'No Production API access');
   if(m!=='GET')writes.push(m+' '+p);
   const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(p==='/api/account-access')return reply(guest?{authenticated:false,guest:true,trialActive:true,hasTrainingAccess:true,trialStartedAt:'2026-10-27T12:00:00Z',trialEndsAt:'2026-10-30T12:00:00Z',serverNow:'2026-10-27T13:00:00Z',subscriptionActive:false}:{authenticated:true,guest:false,userId:U,trialActive:false,hasTrainingAccess:true,trialStartedAt:'2026-09-01T00:00:00Z',trialEndsAt:'2026-09-04T00:00:00Z',subscriptionActive:true,subscriptionUntil:'2026-12-01T00:00:00Z',serverNow:new Date().toISOString()});
   if(p==='/api/session')return reply(guest?{authenticated:false}:{authenticated:true,userId:U,verifiedEmail:profile.contact});
   if(p==='/api/profile')return reply(guest?{code:'not_authenticated'}:{authenticated:true,userId:U,profile},guest?401:200);
   if(p==='/api/progress')return reply({authenticated:!guest,progress:{},activity:[]});
   if(p==='/api/state')return reply({authenticated:true,userId:U,state:{}});
   if(p==='/api/legal-consent')return reply({accepted:true,documentVersion:'2026-09-23-v1'});
   if(p==='/api/support-summary')return reply({unreadCount:0,latestTicketId:null});
   if(p==='/api/preview20-journey')return reply({code:'analytics_opt_out'},403);
   if(p==='/api/preview20-study-time')return reply({ok:true,accepted:[]});
   if(p==='/api/check-sprechen')return reply({ok:true,aiConfigured:true,officialLevel:'full',score:90,transcript:'Hallo'});
   if(p==='/api/check-schreiben')return reply({score:80,earned:8,max:10,wordCount:12,contentPoints:[{point:'Einladung',earned:3,status:'erfuellt',commentRu:'Пункт выполнен'},{point:'Zeit',earned:3,status:'erfuellt',commentRu:'Пункт выполнен'},{point:'Gruss',earned:1.5,status:'teilweise',commentRu:'Уточните формулировку'}],communication:{earned:.5,commentRu:'Оформление частично выполнено'},feedbackRu:'Синтетическая проверка письма',feedbackDe:'Test',corrections:[]});
   if(m!=='GET')return reply({ok:true});
   return route.continue();
  });
  try{
   await page.goto(HOST+'/');
   const dashboard=page.locator('.otto-dashboard-module-card');
   const selectTraining=page.getByRole('button',{name:/Мне нужен только тренажёр/});
   if(await selectTraining.waitFor({state:'visible',timeout:3500}).then(()=>true).catch(()=>false))await selectTraining.click();
   await dashboard.first().waitFor({timeout:10000}).catch(async err=>{console.error('PREVIEW25 DASHBOARD DIAG',JSON.stringify({guest,width,body:(await page.locator('body').innerText()).slice(0,1500),local:await page.evaluate(()=>({mode:localStorage.getItem('otto-preview-app-mode-v2:preview20-guest-local'),guestMode:localStorage.getItem('otto-preview-app-mode-v2:local')})),errors}));throw err;});
   const modules=[['Hören',[1,2,3]],['Lesen',[1,2,3]],['Schreiben',[1,2]],['Sprechen',[1,2,3]]];
   for(const [name,parts] of modules){
    await dashboard.filter({hasText:name}).first().click();
    await page.getByRole('heading',{name:name+' A1'}).first().waitFor();
    for(const teil of parts){
     if(name==='Hören')await page.getByRole('button',{name:teil===1?/Короткие разговоры/:teil===2?/Объявления/:/Короткие сообщения/}).first().click();
     else if(name==='Lesen')await page.getByRole('button',{name:new RegExp('Открыть Teil '+teil)}).click();
     else if(name==='Schreiben')await page.getByRole('button',{name:teil===1?/Teil 1 · Formular/:/Teil 2 · Brief/}).first().click();
     else await page.getByRole('button',{name:teil===1?/Sich vorstellen/:teil===2?/Informationen/:/Bitten/}).first().click();
     const list=page.getByTestId('otto-training-task-list');
     await list.waitFor({timeout:15000});
     const allowed=await list.locator('button[data-testid^="otto-task-"]:not([data-testid="otto-task-continue"])').count();
     if(guest){
      assert.equal(allowed,2,name+' Teil '+teil+' guest limit');
      assert.equal(await list.getByTestId('otto-task-3').count(),0);
      assert.equal(await list.getByTestId('otto-task-continue').count(),1);
      if(name!=='Sprechen'||teil!==1)assert.equal(await list.getByTestId('otto-guest-registration').count(),1);
     }else{
      assert(allowed>=1,name+' Teil '+teil+' no tasks');
      if(allowed>=3){
       assert.equal(await list.getByTestId('otto-task-3').count(),1);
       for(const n of [10,30])if(allowed>=n)assert.equal(await list.getByTestId('otto-task-'+n).count(),1);
      }
      assert.equal(await list.getByTestId('otto-guest-registration').count(),0);
     }
     await list.getByRole('button',{name:'Назад к выбору Teil'}).click();
    }
    await page.screenshot({path:output+'/'+(guest?'guest':'paid')+'-'+name.toLowerCase()+'-'+width+'.png',fullPage:true});
    await page.reload();
    if(await selectTraining.waitFor({state:'visible',timeout:2500}).then(()=>true).catch(()=>false))await selectTraining.click();
    await dashboard.first().waitFor();
   }
   if(!guest){
    // Recording uses fake Chromium microphone; no real teacher or learner audio.
    await page.locator('.otto-dashboard-module-card').filter({hasText:'Sprechen'}).first().click();
    await page.getByRole('button',{name:/Sich vorstellen/}).first().click();
    await page.getByTestId('otto-task-1').click();
    await page.getByRole('button',{name:'Записать ответ'}).click();
    await page.getByRole('button',{name:'Остановить запись'}).waitFor({timeout:10000});
    await page.waitForTimeout(1400);
    await page.getByRole('button',{name:'Остановить запись'}).click();
    await page.getByRole('button',{name:'Проверить с Отто'}).waitFor({timeout:12000});
    await page.screenshot({path:output+'/paid-mic-'+width+'.png',fullPage:true});
    await page.reload();await dashboard.first().waitFor();

    // The signed-in draft must retain its text across a normal page reload.
    await dashboard.filter({hasText:'Schreiben'}).first().click();
    await page.getByRole('button',{name:/Teil 2 · Brief/}).first().click();
    await page.getByTestId('otto-task-1').click();
    await page.getByRole('button',{name:/Пишу сама|Пишу самостоятельно|Пишу сам/}).first().click();
    const letter=page.locator('textarea').first();
    const draft='Guten Tag! Ich habe am Montag Zeit. Viele Gruesse, OTTO.';
    await letter.fill(draft);
    await page.waitForTimeout(400);
    await page.reload();await dashboard.first().waitFor();
    await dashboard.filter({hasText:'Schreiben'}).first().click();
    await page.getByRole('button',{name:/Teil 2 · Brief/}).first().click();
    await page.getByTestId('otto-task-1').click();
    await page.getByRole('button',{name:/Пишу сама|Пишу самостоятельно|Пишу сам/}).first().click();
    assert.equal(await page.locator('textarea').first().inputValue(),draft,'paid student letter draft lost on reload');
    await page.getByRole('button',{name:'Проверить с Отто'}).click();
    assert(writes.some(v=>v==='POST /api/check-schreiben'),'mock AI checking not invoked');
    await page.screenshot({path:output+'/paid-schreiben-draft-'+width+'.png',fullPage:true});
   }
   assert.deepEqual(errors,[], 'Unexpected page errors: '+JSON.stringify({guest,width,errors}));
   assert(!writes.some(s=>/payment|teacher|admin/.test(s)));
   results.push({mode:guest?'guest':'paid',width,status:'PASS'});
   console.log('PASS module task list',guest?'guest':'paid',width);
  }catch(err){
   results.push({mode:guest?'guest':'paid',width,status:'FAIL',error:String(err)});
   await page.screenshot({path:output+'/fail-'+(guest?'guest':'paid')+'-'+width+'.png',fullPage:true}).catch(()=>{});
   throw err;
  }finally{fs.writeFileSync(output+'/task-limits.json',JSON.stringify(results,null,2));await ctx.close();}
 }
}finally{await browser.close();}
