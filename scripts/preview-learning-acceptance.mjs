import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const BASE='https://deploy-preview-13--otto-a1.netlify.app/';
const widths=[320,360,375,390,414], results=[], failures=[];
mkdirSync('acceptance-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const respond=(r,data)=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
for(const width of widths){
 const uid='acceptance-'+width;
 const context=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1,serviceWorkers:'block'});
 const profile={name:'Acceptance QA',contactType:'email',contact:'acceptance@example.com',contactVerified:true,authStatus:'verified',learningMode:'direct',onboardingCompleted:true,createdAt:'2026-10-09T00:00:00Z'};
 await context.route('**/api/**',r=>respond(r,{}));
 await context.route('**/api/session*',r=>respond(r,{authenticated:true,userId:uid}));
 await context.route('**/api/profile',r=>respond(r,{authenticated:true,userId:uid,profile}));
 await context.route('**/api/account-access',r=>respond(r,{authenticated:true,userId:uid,serverNow:new Date().toISOString(),trialActive:true,trialEndsAt:'2026-10-30T00:00:00Z',hasTrainingAccess:true}));
 await context.route('**/api/legal-consent',r=>respond(r,{accepted:true,documentVersion:'2026-09-23-v1'}));
 await context.route('**/api/state',r=>respond(r,{authenticated:true,userId:uid,state:{}}));
 await context.route('**/api/progress',r=>respond(r,{authenticated:true,progress:{},activity:[]}));
 await context.addInitScript(({uid})=>{
   localStorage.setItem('otto-preview-tour-seen-v1:'+uid,'1');
   localStorage.setItem('otto-preview-tour-seen-v1:local','1');
   localStorage.setItem('otto-reference-intro-seen-v1','1');
 },{uid});
 const page=await context.newPage();page.setDefaultTimeout(12000);
 const record=(name,ok,detail='')=>results.push({width,name,ok,detail});
 const shot=async name=>{
   await page.evaluate(()=>{window.scrollTo(0,0);for(const e of document.querySelectorAll('main,.otto-app-content,.otto-inner-screen'))e.scrollTop=0});
   await page.waitForTimeout(300);
   return page.screenshot({path:'acceptance-artifacts/'+width+'-'+name+'.png',fullPage:false,animations:'disabled'});
 };
 const click=async(name,scope=page)=>{
   const target=scope.getByRole('button',{name,exact:true}).first();
   if(scope===page&&['Выбор модулей','Выбор Teil','Посмотреть объяснение с начала','Вернуться к своему месту','Вернуться к этапу до выбора Teil'].includes(name)&&!await target.isVisible()){
     const menu=page.getByRole('button',{name:'Меню обучения'});
     if(await menu.isVisible()&&await menu.getAttribute('aria-expanded')==='false')await menu.click();
   }
   return target.click();
 };
 const see=async text=>page.getByText(text,{exact:false}).first().waitFor({timeout:15000});
 const check=async(name,fn)=>{try{const detail=await fn();record(name,true,String(detail??''))}catch(e){record(name,false,String(e).slice(0,320));failures.push({width,name,error:String(e).slice(0,320)})}};
 try{
   await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
   const chooser=page.locator('.otto-preview-mode-choice');
   await chooser.waitFor({timeout:15000});
   await chooser.getByRole('button',{name:/Мне нужен только тренажёр/}).click();
   await page.locator('.otto-bottom-nav').waitFor({timeout:20000});
   await check('news nav',async()=>{await click('Новости A1',page.locator('.otto-bottom-nav'));await see('Новости A1');await shot('news-bottom-navigation');await click('Главная',page.locator('.otto-bottom-nav'));});
   await check('banner and buttons',async()=>{
     const banner=page.locator('.otto-dashboard-hero').first();
     await banner.waitFor({state:'visible',timeout:12000});
     await page.waitForTimeout(1600);
     await shot('dashboard-banner-nav');
     const text=banner.locator('div').first(),otto=banner.locator('.otto-scene').first();
     const rect=async loc=>loc.evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}});
     const a=await rect(text),b=await rect(otto);
     const overlap=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
     if(overlap>50)throw Error('Banner text overlaps OTTO: '+overlap);
     const learn=page.getByRole('button',{name:/Учиться с OTTO/}).first();
     if(!await learn.isVisible())throw Error('Learn control invisible');
     if(await page.getByRole('button',{name:'Вернуться к тренировке'}).count())throw Error('Resume button appears on dashboard');
     const collision=async()=>{
       const a=await learn.boundingBox(),b=await banner.boundingBox();
       if(!a||!b)throw Error('Missing control or banner bounds');
       return Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*
         Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
     };
     if(await collision()>0)throw Error('Default floating control covers dashboard banner');
     const bannerRect=await banner.boundingBox();
     if(!bannerRect)throw Error('Banner not measurable');
     await page.evaluate(({x,y})=>localStorage.setItem('otto-preview-mode-floating-v1:learn',JSON.stringify({x,y})),
       {x:Math.max(8,bannerRect.x+bannerRect.width/2-60),y:bannerRect.y+12});
     await page.reload({waitUntil:'domcontentloaded'});
     await page.locator('.otto-dashboard-hero').waitFor({state:'visible',timeout:12000});
     await page.waitForTimeout(450);
     if(await collision()>0)throw Error('Previously saved floating control still covers banner');
     if(await page.getByRole('button',{name:'Вернуться к тренировке'}).count())throw Error('Resume action returned on dashboard');
     await shot('saved-floating-control-repositioned');
     return 'banner text/image overlap='+overlap+'; saved position corrected';
   });
   await check('legacy original exam only',async()=>{
      await click('Пробный экзамен',page.locator('.otto-bottom-nav'));
      await page.getByRole('heading',{name:'Пробный экзамен Goethe A1'}).waitFor({timeout:16000});
      if(await page.getByRole('heading',{name:'Выберите вариант'}).count())throw Error('Archive chooser remains');
      await shot('legacy-exam-only');
      await click('Главная',page.locator('.otto-bottom-nav'));
    });
    await check('learn control drag persists',async()=>{
      const learn=page.getByRole('button',{name:/Учиться с OTTO/}).first();
      const a=await learn.boundingBox();
      if(!a)throw Error('No floating learn button');
      const sx=a.x+a.width/2,sy=a.y+a.height/2;
      await page.mouse.move(sx,sy);
      await page.mouse.down();
      await page.mouse.move(sx-34,sy+70,{steps:8});
      await page.mouse.up();
      const b=await learn.boundingBox();
      if(!b||Math.hypot(a.x-b.x,a.y-b.y)<12)throw Error('Learn action did not move');
      if(!await page.locator('.otto-bottom-nav').isVisible())throw Error('Drag unexpectedly opened learning');
      await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('.otto-bottom-nav').waitFor({timeout:16000});
      const after=await page.getByRole('button',{name:/Учиться с OTTO/}).first().boundingBox();
      if(!after||Math.abs(after.x-b.x)>5||Math.abs(after.y-b.y)>5)throw Error('Saved drag position was lost');
      await shot('movable-learn-control');
    });
    await page.getByRole('button',{name:/Учиться с OTTO/}).first().click();
   // The approved first visit offers the Reference screen before the actual lesson.
   const later=page.getByRole('button',{name:'Посмотреть позже',exact:true});
   if(await later.isVisible({timeout:7000}).catch(()=>false))await later.click();
   await see('ОБУЧЕНИЕ С OTTO');
   // Reference-intro completed by fixture, so new learning starts on Schreiben intro.
   await check('Schreiben new introduction',async()=>{await page.getByRole('heading',{name:'Начинаем со Schreiben'}).last().waitFor({state:'visible',timeout:15000});await shot('schreiben-intro')});
   await check('Schreiben progress persistence',async()=>{
     await click('Начать');
     await see('Базовые слова');
     const key='otto-preview-learning-v2:'+uid;
     const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'{}'),key);
     if(saved.stage!=='categories')throw Error('Expected categories, got '+saved.stage);
     await page.reload({waitUntil:'domcontentloaded'});
     await see('Базовые слова');
     const again=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'{}'),key);
     if(again.stage!==saved.stage)throw Error('Progress stage changed after reload');
   });
   if(width===390)await check('Schreiben late stage replay preserves progress',async()=>{
      const key='otto-preview-learning-v2:'+uid;
      const before=await page.evaluate(key=>{
        const p=JSON.parse(localStorage.getItem(key)||'{}');
        localStorage.setItem(key,JSON.stringify({...p,stage:'step3',currentCategory:null,currentExercise:0}));
        return p.stage;
      },key);
      if(before!=='categories')throw Error('Base vocabulary progress missing');
      await page.reload({waitUntil:'domcontentloaded'});
      await page.getByText('Учимся писать письмо',{exact:false}).last().waitFor({state:'visible',timeout:15000});
      await shot('schreiben-step3-original');
      await click('Посмотреть объяснение с начала');
      await page.getByRole('heading',{name:'Начинаем со Schreiben'}).last().waitFor({state:'visible',timeout:15000});
      const during=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'{}').stage,key);
      if(during!=='step3')throw Error('Replay overwrote saved step3');
      await shot('schreiben-replayed-intro');
      await click('Вернуться к своему месту');
      await page.getByText('Учимся писать письмо',{exact:false}).last().waitFor({state:'visible',timeout:15000});
      const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'{}').stage,key);
      if(after!=='step3')throw Error('Late Schreiben stage not restored');
    });
    await check('Schreiben Teil selector and safe return',async()=>{
      const key='otto-preview-learning-v2:'+uid;
      const before=await page.evaluate(k=>localStorage.getItem(k),key);
      // A seeded completed answer proves Teil navigation does not erase older lesson results.
      const practiceKey='otto-preview-schreiben-practice-v1:'+uid;
      await page.evaluate(k=>{
        const previous=JSON.parse(localStorage.getItem(k)||'{}');
        localStorage.setItem(k,JSON.stringify({...previous,statuses:{...previous.statuses,'first:1':'correct','first:4':'skipped'}}));
      },practiceKey);
      const practiceBefore=await page.evaluate(k=>localStorage.getItem(k),practiceKey);
      await click('Выбор Teil');
      await page.getByRole('heading',{name:'Выбор Teil'}).waitFor();
      await page.getByRole('button',{name:'Письмо',exact:true}).last().click();
      await see('Учимся писать письмо');
      if(await page.evaluate(k=>localStorage.getItem(k),key)!==before)throw Error('Letter selection overwrote saved Schreiben stage');
      await click('Вернуться к этапу до выбора Teil');
      if(await page.evaluate(k=>localStorage.getItem(k),key)!==before)throw Error('Returning from letter overwrote saved Schreiben stage');
      await click('Выбор Teil');
      await page.getByRole('heading',{name:'Выбор Teil'}).waitFor();
      await shot('schreiben-teil-selector');
      await page.getByRole('button',{name:'Формуляр',exact:true}).last().click();
      await page.getByRole('heading',{name:'Учимся заполнять формуляр'}).first().waitFor();
      const during=await page.evaluate(k=>localStorage.getItem(k),key);
      if(during!==before)throw Error('Schreiben progress changed by Teil selection');
      await shot('schreiben-teil-form');
      await click('Вернуться к этапу до выбора Teil');
      const after=await page.evaluate(k=>localStorage.getItem(k),key);
      if(after!==before)throw Error('Schreiben progress lost after Teil return');
      await page.reload({waitUntil:'domcontentloaded'});
      if(await page.evaluate(k=>localStorage.getItem(k),key)!==before)throw Error('Schreiben stage changed after refresh');
      if(await page.evaluate(k=>localStorage.getItem(k),practiceKey)!==practiceBefore)throw Error('Completed answers lost after refresh');
      await shot('schreiben-teil-return');
    });
    await click('Выбор модулей');
   await check('module hub',async()=>{await see('Выберите модуль');await shot('learning-hub')});
   for(const [module,label] of [['lesen','Lesen'],['horen','Hören'],['sprechen','Sprechen']]){
     await check(label+' intro',async()=>{
       await page.locator('.otto-learning-module-card').filter({hasText:label}).first().click();
       await see('Как устроен '+label);
       await shot(module+'-intro');
       const nav=page.getByRole('button',{name:'К реальным заданиям',exact:true}).first();
       if(!await nav.isVisible())throw Error('Real tasks button missing');
       await click('Выбор Teil');
       await shot(module+'-teil-picker');
       await page.locator('.otto-teil-picker').getByRole('button',{name:/Teil 2/}).first().click();
       await page.locator('.otto-teil-entry').waitFor({state:'visible'});
       const teil2Header=await page.locator('.otto-teil-entry').innerText();
       if(teil2Header.includes('{entryPart}')||!teil2Header.includes('Teil 2'))throw Error('Teil 2 heading does not render number');
       await shot(module+'-teil2-start');
       await click('Вернуться к этапу до выбора Teil');
       await see('Как устроен '+label);
       if(module==='sprechen'){
         await click('Выбор Teil');
         await page.locator('.otto-teil-picker').getByRole('button',{name:/Teil 3/}).first().click();
         await page.locator('.otto-teil-entry').waitFor({state:'visible'});
         const teil3Header=await page.locator('.otto-teil-entry').innerText();
         if(teil3Header.includes('{entryPart}')||!teil3Header.includes('Teil 3'))throw Error('Teil 3 heading does not render number');
         await shot('sprechen-teil3-start');
         await click('Вернуться к этапу до выбора Teil');
         await see('Как устроен '+label);
       }
       await click('Выбор модулей');
     });
   }
   await check('Lesen module navigation',async()=>{
     await page.locator('.otto-learning-module-card').filter({hasText:'Lesen'}).first().click();
     await page.getByRole('button',{name:/Начать|Продолжить/}).last().click();
     await shot('lesen-learning');
     if(!await page.getByRole('button',{name:'К реальным заданиям',exact:true}).count())throw Error('No real tasks');
     await page.getByRole('button',{name:/Teil 1/}).first().click();
     await shot('lesen-teil');
     const names=await page.getByRole('button').allTextContents();
     if(names.some(x=>x.trim()==='К выбору Teil'||x.trim()==='К выбору модулей'))throw Error('Duplicate inner nav');
     await page.getByRole('button',{name:'Назад',exact:true}).first().click();
     await see('Что хотите потренировать?');
     await page.getByRole('button',{name:'К реальным заданиям',exact:true}).first().click();
     await check('Lesen Teil 2 silent selection and manual audio',async()=>{
       const activePart=page.getByRole('heading',{name:/Lesen · Teil [123]/});
       if(await activePart.count()){
         await page.getByRole('button',{name:'Назад',exact:true}).first().click();
       }
       await page.getByRole('heading',{name:'Lesen',exact:true}).waitFor({timeout:16000});
       const part2Card=page.getByText('Teil 2',{exact:true}).first().locator('xpath=..');
       await part2Card.getByRole('button',{name:/Начать тренировку|Продолжить/}).click();
       await page.getByRole('heading',{name:'Lesen · Teil 2'}).waitFor({timeout:16000});
       const audio=page.getByRole('button',{name:'Прослушать вариант A',exact:true});
       await audio.waitFor({state:'visible',timeout:15000});
       await page.evaluate(()=>{
         window.__ottoCheckedSpeech=[];
         window.OttoSpeech={play:async value=>{window.__ottoCheckedSpeech.push(value);return true}};
       });
       await audio.locator('xpath=..').locator('button').first().click();
       await page.getByRole('button',{name:'Проверить',exact:true}).click();
       await page.getByRole('button',{name:'Следующее задание',exact:true}).click();
       const unwanted=await page.evaluate(()=>window.__ottoCheckedSpeech.length);
       if(unwanted!==0)throw Error('Unexpected answer audio: '+unwanted);
       await page.getByRole('button',{name:'Прослушать вариант A',exact:true}).click();
       const requested=await page.evaluate(()=>window.__ottoCheckedSpeech.length);
       if(requested!==1)throw Error('Manual audio did not play exactly once: '+requested);
       await shot('lesen-teil2-manual-audio');
     });
     await page.locator('.otto-bottom-nav').getByRole('button',{name:'Главная',exact:true}).click();
     await page.getByRole('button',{name:/Учиться с OTTO/}).first().waitFor({state:'visible'});
     const backToTrain=page.getByRole('button',{name:/Вернуться к тренировке/}).first();
     if(await backToTrain.isVisible())throw Error('Resume action must be absent on home');
     await shot('home-floating-control');
     await click('Новости A1',page.locator('.otto-bottom-nav'));
     await backToTrain.waitFor({state:'visible',timeout:15000});
     await shot('mode-controls-on-news');
     const overlap=await page.evaluate(()=>{
       const a=document.querySelector('.otto-preview-quick-learn')?.getBoundingClientRect();
       const b=[...document.querySelectorAll('button')].find(x=>x.textContent?.includes('Вернуться к тренировке'))?.getBoundingClientRect();
       if(!a||!b)return -1;
       return Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
     });
     if(overlap!==0)throw Error('Mode controls intersect: '+overlap);
     await backToTrain.click();
     await page.getByRole('heading',{name:'Lesen · Teil 2'}).waitFor({timeout:16000});
   });
   await check('whole German tiles in first and second sentences',async()=>{
     await page.locator('.otto-bottom-nav').getByRole('button',{name:'Главная',exact:true}).click();
     await page.getByRole('button',{name:/Учиться с OTTO/}).first().click();
     await click('Выбор модулей');
     await page.locator('.otto-learning-module-card').filter({hasText:'Schreiben'}).first().click();
     await page.evaluate(uid=>{
       const key='otto-preview-learning-v2:'+uid;
       const previous=JSON.parse(localStorage.getItem(key)||'{}');
       localStorage.setItem(key,JSON.stringify({...previous,stage:'step3',currentCategory:null,currentExercise:0}));
       localStorage.setItem('otto-preview-learning-location-v1:'+uid,'schreiben');
       localStorage.setItem('otto-preview-schreiben-practice-v1:'+uid,JSON.stringify({mode:'practice',screenIndex:15,practiceIndex:2,name:'',statuses:{}}));
     },uid);
     await page.reload({waitUntil:'domcontentloaded'});
     await page.getByRole('heading',{name:'Соберите первое предложение из слов'}).waitFor({timeout:18000});
     const verify=async()=>{
       const items=await page.locator('.otto-build-word-tile').evaluateAll(nodes=>nodes.map(e=>{
         const r=e.getBoundingClientRect();return{text:e.textContent,whiteSpace:getComputedStyle(e).whiteSpace,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,left:r.left,right:r.right,viewport:innerWidth};
       }));
       if(!items.length)throw Error('No word tiles');
       for(const item of items)if(item.whiteSpace!=='nowrap'||item.scrollWidth>item.clientWidth+2||item.right>item.viewport+1||item.left<0)throw Error('Broken German tile: '+JSON.stringify(item));
       return items.map(x=>x.text).join('|');
     };
     const first=await verify();
     if(!first.includes('besuchen.')||!first.includes('am Wochenende'))throw Error('First tiles changed: '+first);
     await page.locator('.otto-build-choice-list').scrollIntoViewIfNeeded();
     await page.screenshot({path:'acceptance-artifacts/'+width+'-schreiben-build-first-whole-words.png',animations:'disabled'});
     await page.evaluate(uid=>{
       const k='otto-preview-schreiben-practice-v1:'+uid;
       localStorage.setItem(k,JSON.stringify({...JSON.parse(localStorage.getItem(k)||'{}'),mode:'practice',practiceIndex:4}));
     },uid);
     await page.reload({waitUntil:'domcontentloaded'});
     await page.getByRole('heading',{name:'Соберите второе предложение из слов'}).waitFor({timeout:18000});
     const second=await verify();
     if(!second.includes('Auto.')||!second.includes('komme'))throw Error('Second tiles changed: '+second);
     await page.locator('.otto-build-choice-list').scrollIntoViewIfNeeded();
     await page.screenshot({path:'acceptance-artifacts/'+width+'-schreiben-build-second-whole-words.png',animations:'disabled'});
     return first+' / '+second;
   });
 }catch(e){failures.push({width,name:'navigation',error:String(e).slice(0,500)});await page.screenshot({path:'acceptance-artifacts/'+width+'-failure.png',animations:'disabled'}).catch(()=>{});}
 await context.close();
}
await browser.close();
writeFileSync('acceptance-artifacts/report.json',JSON.stringify({results,failures},null,2));
console.log('ACCEPTANCE_RESULTS '+JSON.stringify({results,failures}));
if(failures.length)process.exitCode=1;
