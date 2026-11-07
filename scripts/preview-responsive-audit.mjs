import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const url='https://deploy-preview-13--otto-a1.netlify.app/';
const sizes=[[320,568],[320,700],[360,740],[375,812],[390,844],[430,932],[768,1024],[1024,768],[1366,768],[1440,900],[1920,1080]];
const profile={name:'Responsive QA',contactType:'email',contact:'responsive@example.com',contactVerified:true,authStatus:'verified',gender:'female',learningMode:'direct',createdAt:'2026-10-09T00:00:00Z',updatedAt:'2026-10-09T00:00:00Z',onboardingCompleted:true};
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
const issues=[],views=[],errors=[];
mkdirSync('reference-visual-artifacts',{recursive:true});
const captureWidths=new Set([320,360,390,430,1366,1920]);
const captureViews=/^(home|reference-home|smartcards|settings|mock-select|learning-hub|learning-schreiben|learning-lesen|learning-horen|learning-sprechen|real-Lesen|real-Hören|real-Schreiben|real-Sprechen)$/;
const pause=ms=>new Promise(ok=>setTimeout(ok,ms));
const respond=(route,obj)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(obj)});
await context.route('**/api/**',route=>respond(route,{}));
await context.route('**/api/session*',route=>respond(route,{authenticated:true,userId:'responsive-e2e'}));
await context.route('**/api/profile',route=>respond(route,{authenticated:true,userId:'responsive-e2e',profile}));
await context.route('**/api/account-access',route=>respond(route,{
  authenticated:true,userId:'responsive-e2e',serverNow:new Date().toISOString(),
  trialActive:true,trialEndsAt:'2026-10-30T00:00:00Z',
  subscriptionActive:false,hasTrainingAccess:true
}));
await context.route('**/api/legal-consent',route=>respond(route,{accepted:true,documentVersion:'2026-09-23-v1'}));
await context.route('**/api/state',route=>respond(route,{authenticated:true,userId:'responsive-e2e',state:{}}));
await context.route('**/api/progress',route=>respond(route,{authenticated:true,progress:{},activity:[]}));
await context.route('**/api/support-summary',route=>respond(route,{unreadCount:0,latestTicketId:null}));
await context.addInitScript(()=>{
  localStorage.clear();sessionStorage.clear();
  localStorage.setItem('otto-preview-app-mode-v2:responsive-e2e','training');
  localStorage.setItem('otto-preview-app-mode-v2:local','training');
  // This viewport audit starts from an existing trainer session. The real
  // seven-step tour is exercised separately by preview-mobile-onboarding.mjs.
  for(const id of ['responsive-e2e','local','undefined']){
    localStorage.setItem('otto-preview-tour-seen-v1:'+id,'1');
  }
});

async function create(width,height) {
  const page=await context.newPage();
  await page.setViewportSize({width,height});
  page.setDefaultTimeout(4500);
  const failures=[];
  page.on('pageerror',err=>errors.push({width,message:err.message}));
  page.on('requestfailed',req=>failures.push({url:req.url().slice(0,180),reason:req.failure()?.errorText}));
  page.on('response',res=>{if(res.status()>=400)failures.push({url:res.url().slice(0,180),status:res.status()})});
  const initial=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  let ready=false;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      // A first-run guided tour is modal. Dismiss it through its real UI,
      // rather than clicking through its overlay or changing app behavior.
      const tour=page.locator('[data-otto-tour]');
      if(await tour.isVisible({timeout:1500}).catch(()=>false)){
        await tour.getByRole('button',{name:'Закрыть экскурсию'}).click({timeout:5000});
        await tour.waitFor({state:'hidden',timeout:6000});
      }
      // A fresh Preview 13 session enters via a two-mode chooser. Wait for the
      // actual route, then select the trainer in the UI instead of racing the shell.
      const chooser=page.getByRole('button',{name:/Мне нужен только тренажёр/});
      const navigation=page.locator('.otto-bottom-nav');
      await Promise.race([
        chooser.waitFor({state:'visible',timeout:15000}),
        navigation.waitFor({state:'visible',timeout:15000})
      ]);
      if(await chooser.isVisible())await chooser.click({timeout:6000});
      await navigation.waitFor({state:'visible',timeout:15000});
      await page.waitForTimeout(350);
      ready=true;break;
    }catch(e){
      const body=await page.locator('body').innerText().catch(()=>'<unavailable>');
      console.log('BOOT_RETRY '+width+' '+attempt+' '+body.slice(0,220));
      if(attempt<3){
        await page.reload({waitUntil:'domcontentloaded',timeout:30000});
      }else{
        const detail=await page.evaluate(()=>({
          href:location.href,
          title:document.title,
          body:document.body?.innerText?.slice(0,500),
          root:document.getElementById('root')?.innerHTML.slice(0,600),
          scriptSrc:[...document.querySelectorAll('script[src]')].map(el=>el.getAttribute('src')).slice(-8)
        })).catch(err=>({evaluationError:String(err)}));
        console.log('BOOT_DIAGNOSTIC '+width+' '+JSON.stringify({initialHTTP:initial?.status(),failures:failures.slice(-12),detail}).slice(0,3500));
        await page.close();
        throw e;
      }
    }
  }
  if(!ready)throw Error('Preview training shell failed to load at '+width);
  return {page};
}

async function scan(page,width,view,bottom=false){
 await pause(65);
 const data=await page.evaluate(bottom=>{
  const scrolls=[document.querySelector('.otto-inner-screen'),document.querySelector('[role="dialog"] main')].filter(Boolean);
  if(bottom)for(const el of scrolls)el.scrollTop=el.scrollHeight;
  const width=innerWidth,body=document.body;
  const result=[];
  if(document.documentElement.scrollWidth>width+3)result.push({kind:'document-scroll',excess:document.documentElement.scrollWidth-width});
  const active=document.querySelector('[role="dialog"]')||document.querySelector('.otto-inner-screen')||document.querySelector('.otto-home-screen');
  if(active&&active.scrollWidth>active.clientWidth+3){
   const frame=active.getBoundingClientRect();
   const sources=[];
   for(const el of active.querySelectorAll('*')){
     if(el.closest('.otto-splash-screen'))continue;
     const rect=el.getBoundingClientRect();
     const style=getComputedStyle(el);
     if(rect.width<1||style.display==='none'||rect.bottom<frame.top||rect.top>frame.bottom)continue;
     if(rect.right>frame.right+3||rect.left<frame.left-3){
       sources.push({tag:el.tagName,cls:String(el.className?.baseVal??el.className??'').slice(0,125),left:Math.round(rect.left-frame.left),right:Math.round(rect.right-frame.right)});
       if(sources.length>=5)break;
     }
   }
   result.push({kind:'page-content-overflow',excess:active.scrollWidth-active.clientWidth,sources});
  }
  function visible(el){const r=el.getBoundingClientRect(),s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&r.width>2&&r.height>2&&r.bottom>0&&r.top<innerHeight;}
  function inScroller(el){for(let p=el.parentElement;p&&p!==body;p=p.parentElement){const s=getComputedStyle(p);if(/auto|scroll/.test(s.overflowX)&&p.scrollWidth>p.clientWidth+3)return true;}return false;}
  const offenders=[];
  for(const el of document.querySelectorAll('button,input,textarea,select,img,[role="dialog"]')){
   if(!visible(el)||inScroller(el)||el.closest('.otto-splash-screen')||(el.tagName==='IMG'&&el.getAttribute('src')?.startsWith('/otto/')))continue;
   const r=el.getBoundingClientRect();
   if(r.left < -3||r.right>width+3){
    offenders.push({kind:'offscreen',tag:el.tagName,left:Math.round(r.left),right:Math.round(r.right),text:(el.getAttribute('aria-label')||el.textContent||el.getAttribute('src')||'').trim().slice(0,60)});
   }
   if(offenders.length>=8)break;
  }
  result.push(...offenders);
  const floats=[...document.querySelectorAll('[aria-label="Быстрый доступ OTTO"]')].filter(visible);
  for(const f of floats)for(const button of document.querySelectorAll('button')){
   const fbox=f.getBoundingClientRect();
   const actualButton=f.querySelector('button');
   const hotspot=actualButton?.getBoundingClientRect()??fbox;
   const floaterHit=document.elementFromPoint(hotspot.left+hotspot.width/2,hotspot.top+hotspot.height/2);
   if(!floaterHit||!f.contains(floaterHit))continue;
   if(f.contains(button)||!visible(button))continue;
   const name=(button.textContent||'').trim();
   if(!/^(Продолжить|Далее|Проверить|Завершить|Начать|К тренировкам|Сохранить)/i.test(name))continue;
   const a=fbox,b=button.getBoundingClientRect();
   let visibleTop=b.top,visibleBottom=b.bottom;
   for(let parent=button.parentElement;parent&&parent!==document.body;parent=parent.parentElement){
     const style=getComputedStyle(parent);
     if(/auto|hidden|scroll|clip/.test(style.overflowY)){
       const clip=parent.getBoundingClientRect();
       visibleTop=Math.max(visibleTop,clip.top);
       visibleBottom=Math.min(visibleBottom,clip.bottom);
     }
   }
   if(visibleBottom<=visibleTop)continue;
   if(b.top<0||b.bottom>innerHeight)continue;
   const area=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,visibleBottom)-Math.max(a.top,visibleTop));
   if(area>200)result.push({kind:'floating-over-action',text:name.slice(0,50),overlap:Math.round(area)});
  }
  const img=[...document.querySelectorAll('img[src*="/reference-source/exam/"]')].filter(visible);
  return{issues:result,images:img.length};
 },bottom);
 views.push({width,view,images:data.images});
 for(const p of data.issues)issues.push({width,view,...p});
 if(captureWidths.has(width)&&captureViews.test(view)){
   const file=`reference-visual-artifacts/${width}-${page.viewportSize().height}-${view.replace(/[^a-zA-Z0-9-]/g,'_')}.jpg`;
   await page.screenshot({path:file,type:'jpeg',quality:65,animations:'disabled',timeout:15000});
 }
}
async function attempt(page,width,name,fn){
 try{await fn()}catch(e){
  const snapshot=await page.evaluate(()=>{
   const dialogs=[...document.querySelectorAll('[role="dialog"]')];
   const nav=document.querySelector('.otto-bottom-nav button');
   const rect=nav?.getBoundingClientRect();
   const top=rect?document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2):null;
   return {dialogs:dialogs.map(d=>({label:d.getAttribute('aria-label'),text:d.textContent?.slice(0,240)})),
    navHit:top?.outerHTML.slice(0,300),body:document.body.innerText.slice(0,600)};
  }).catch(err=>({error:String(err)}));
  const issue={width,view:name,kind:'navigation-error',text:String(e.message||e).slice(0,900),snapshot};
  issues.push(issue);console.log('NAV_ERROR '+JSON.stringify(issue));
  await page.screenshot({path:'reference-visual-artifacts/'+width+'-'+name+'-failure.jpg',type:'jpeg',quality:75,timeout:12000}).catch(()=>{});
 }finally{
  // Close through the visible UI, not by hiding a modal or forcing a click.
  const overlay=page.locator('.otto-reference-overlay');
  if(await overlay.isVisible().catch(()=>false))await overlay.getByRole('button',{name:'Закрыть',exact:true}).click({timeout:5000}).catch(err=>console.log('OVERLAY_CLOSE_ERROR '+String(err)));
 }
}
async function optional(page,locator){try{await locator.first().click({timeout:2500});return true}catch{return false}}
for(const [width,height] of sizes){
 const full=true; // Deep-walk every named viewport, including 360, 375, 1024 and 1440.
 let page;
 try{({page}=await create(width,height))}catch(e){const issue={width,view:'bootstrap',kind:'boot-error',text:String(e.message||e).slice(0,220)};issues.push(issue);console.log('NAV_ERROR '+JSON.stringify(issue));continue;}
 try{
  await scan(page,width,'home',true);
  await attempt(page,width,'reference',async()=>{
   await page.getByRole('button',{name:'Открыть Справочник OTTO'}).click();
   await page.getByRole('heading',{name:'Справочник OTTO'}).last().waitFor({timeout:15000});
   await scan(page,width,'reference-home');
   if(full){
    const groups=['Алфавит','Буквосочетания и звуки в немецком языке','Числа','Артикли','Построение предложений'];
    for(const name of groups){
     // The accordion remains open when returning from a category.
     const option=page.getByRole('button',{name,exact:true});
     if(!await option.isVisible())await page.getByRole('button',{name:/Общая база немецкого языка A1/}).click();
     await option.click();
     await scan(page,width,'general-'+name);
     await scan(page,width,'general-'+name+'-bottom',true);
     await page.getByRole('button',{name:'К справочнику'}).click();
    }
    for(const label of ['Письменная часть экзамена','Устная часть экзамена']){
     await page.getByRole('button',{name:label,exact:true}).click();
     await scan(page,width,label+'-menu');
     const options=page.locator('[role="dialog"] aside button');
     const n=await options.count();
     for(let i=0;i<n;i++){
      // Mobile topic detail hides the aside; use the real Back-to-topics button.
      if(i>0&&await page.getByRole('button',{name:'Назад к темам'}).isVisible().catch(()=>false))
        await page.getByRole('button',{name:'Назад к темам'}).click();
      await options.nth(i).click();
      await scan(page,width,label+'-'+i);
      if(i===n-1)await scan(page,width,label+'-bottom',true);
     }
     await page.getByRole('button',{name:'К справочнику'}).click();
    }
    await page.getByRole('button',{name:'Полезная информация перед экзаменом'}).click();
    await scan(page,width,'exam-info');
    await page.getByRole('button',{name:'К справочнику'}).click();
   }
   await page.getByRole('button',{name:/Мои умные карточки/}).first().click();
   await scan(page,width,'smartcards');
   await page.getByRole('button',{name:'Закрыть'}).click();
  });
  await attempt(page,width,'settings',async()=>{
   await page.locator('.otto-bottom-nav').getByRole('button',{name:'Настройки'}).click();
   await scan(page,width,'settings');
   await scan(page,width,'settings-bottom',true);
  });
  await attempt(page,width,'mock',async()=>{
   await page.locator('.otto-bottom-nav').getByRole('button',{name:'Пробный экзамен'}).click();
   // Unprivileged QA accounts must see only the original exam until release.
   await page.getByRole('heading',{name:'Пробный экзамен Goethe A1'}).first().waitFor({timeout:20000});
   await scan(page,width,'mock-select',true);
   if(full){
    // The original exam opens directly on Hören, with Hören displayed in
    // a sticky <b>, not in an accessible heading. Follow the real back button
    // to reach the section menu; never force navigation through hidden tabs.
    await page.getByRole('button',{name:/Начать экзамен|Начать|Продолжить/}).first().click();
    await page.getByText('Teil 1: Aufgaben 1–6',{exact:false}).waitFor({timeout:15000});
    await scan(page,width,'mock-Hören');
    await scan(page,width,'mock-Hören-bottom',true);
    await page.getByRole('button',{name:'Назад',exact:true}).first().click();
    await page.getByRole('heading',{name:/Пробный экзамен Goethe A1/}).waitFor({timeout:15000});
    await scan(page,width,'mock-menu');
    for(const title of ['Lesen','Schreiben','Sprechen']){
     await page.getByRole('button',{name:new RegExp(title)}).first().click();
     await scan(page,width,'mock-'+title);
     await scan(page,width,'mock-'+title+'-bottom',true);
     await page.getByRole('button',{name:'Назад',exact:true}).first().click();
     await page.getByRole('heading',{name:/Пробный экзамен Goethe A1/}).waitFor({timeout:15000});
    }
   }
  });
  if(full){
   await attempt(page,width,'real',async()=>{
    await page.locator('.otto-bottom-nav').getByRole('button',{name:'Главная'}).click();
    for(const title of ['Lesen','Hören','Schreiben','Sprechen']){
     await page.getByRole('button',{name:new RegExp(title)}).first().click({timeout:5000});
     await scan(page,width,'real-'+title);
     await scan(page,width,'real-'+title+'-bottom',true);
     await page.locator('.otto-bottom-nav').getByRole('button',{name:'Главная'}).click();
    }
   });
   await attempt(page,width,'learning',async()=>{
    await page.getByRole('button',{name:/Учиться с OTTO/}).click();
    await scan(page,width,'learning-reference');
    if(await optional(page,page.getByRole('button',{name:'Продолжить обучение'}))){
     await scan(page,width,'learning-schreiben');
     if(await optional(page,page.getByRole('button',{name:/Начать/}))){
      await scan(page,width,'learning-categories');
      if(await optional(page,page.getByRole('button',{name:/Местоимения/})))await scan(page,width,'learning-exercise');
     }
    }
    if(await optional(page,page.getByRole('button',{name:'Все модули'}))){
     await scan(page,width,'learning-hub');
     for(const title of ['Lesen','Hören','Sprechen','Schreiben']){
      if(await optional(page,page.getByRole('button',{name:new RegExp('^'+title)}))){
       await scan(page,width,'learning-'+title);
       await scan(page,width,'learning-'+title+'-bottom',true);
       await optional(page,page.getByRole('button',{name:'Все модули'}));
      }
     }
    }
   });
  }
 }finally{await page.close()}
 console.log('VIEWPORT_DONE '+width+' screens='+views.filter(v=>v.width===width).length+' issues='+issues.filter(v=>v.width===width).length);
 console.log('WIDTH_ISSUES '+width+' '+JSON.stringify(issues.filter(v=>v.width===width).slice(0,24)));
}
await context.close();
await browser.close();
const unique=[...new Map(issues.map(x=>[JSON.stringify(x),x])).values()];
console.log('RESPONSIVE_AUDIT_BEGIN');
console.log(JSON.stringify({head:process.env.GITHUB_SHA,viewports:sizes.map(x=>x[0]),screenCount:views.length,coverage:Object.fromEntries(sizes.map(([w])=>[w,views.filter(x=>x.width===w).length])),problems:unique.slice(0,160),count:unique.length,errors:errors.slice(0,20)},null,2));
console.log('RESPONSIVE_AUDIT_END');
const missing=sizes.filter(([w])=>!views.some(v=>v.width===w)).map(([w])=>w);
if(missing.length)console.log('UNVERIFIED_VIEWPORTS '+JSON.stringify(missing));
const inadequate=sizes.filter(([w])=>views.filter(v=>v.width===w).length<60).map(([w])=>w);
if(inadequate.length)console.log('INCOMPLETE_VIEWPORT_COVERAGE '+JSON.stringify(inadequate));
if(missing.length||inadequate.length||issues.length||views.length<600)process.exitCode=1;
