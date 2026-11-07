import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const HOST = 'https://deploy-preview-20--otto-a1.netlify.app';
const OUT = 'artifacts/guest-browser';
fs.mkdirSync(OUT, {recursive:true});
const mime=p=>p.endsWith('.html')?'text/html':p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.png')?'image/png':p.endsWith('.webp')?'image/webp':'application/octet-stream';
const browser=await chromium.launch({headless:true});
try {
 for(const width of [320,360,375,390,414,461,768,1024,1280]) {
  const context=await browser.newContext({viewport:{width,height:width===461?581:width>=768?650:width===320?568:740},serviceWorkers:'block'});
  let guest=false,started=0,starts=0;
  const unexpectedWrites=[];
  const checks=[];
  await context.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.origin!==HOST)return route.abort();
   const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(u.pathname.startsWith('/api/')){
    if(u.pathname==='/api/preview20-journey')return send({code:'analytics_opt_out'},403);
    if(u.pathname==='/api/preview20-guest' && req.method()==='POST'){
     guest=true;starts++;started=started||Date.now();
     return send({guest:true,trialStartedAt:new Date(started).toISOString(),trialEndsAt:new Date(started+72*3600000).toISOString()});
    }
    if(u.pathname==='/api/account-access'){checks.push(guest);return send(guest?{
     authenticated:false,guest:true,serverNow:new Date().toISOString(),trialActive:true,
     trialStartedAt:new Date(started).toISOString(),trialEndsAt:new Date(started+72*3600000).toISOString(),
     subscriptionActive:false,subscriptionUntil:null,hasTrainingAccess:true,reason:'guest_trial_active'
    }:{authenticated:false,guest:false,serverNow:new Date().toISOString(),hasTrainingAccess:false,trialActive:false,subscriptionActive:false});}
    if(u.pathname==='/api/session')return send({authenticated:false});
    if(u.pathname==='/api/profile')return send({code:'not_authenticated'},401);
    if(req.method()!=='GET')unexpectedWrites.push(req.method()+' '+u.pathname);
    return send({code:'not_authenticated'},401);
   }
   const rel=u.pathname==='/'?'index.html':decodeURIComponent(u.pathname).replace(/^\/+/,'');
   const full=path.resolve('dist',rel);
   if(!full.startsWith(path.resolve('dist')+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile())
    return route.fulfill({status:404,body:''});
   return route.fulfill({status:200,contentType:mime(rel),body:fs.readFileSync(full)});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(HOST+'/');
  await page.getByRole('heading',{name:/Добро пожаловать в OTTO/}).waitFor({timeout:25000});
  const title=page.getByRole('heading',{name:/Добро пожаловать в OTTO/});
  const mascot=page.locator('main[aria-label="Приветствие OTTO"] img.otto-scene');
  const actions=page.getByTestId('welcome-actions');
  const buttons=actions.getByRole('button');
  const geometry=await page.evaluate(()=>{
   const root=document.querySelector('main[aria-label="Приветствие OTTO"]'),title=root?.querySelector('h1'),img=root?.querySelector('img.otto-scene'),footer=root?.querySelector('[data-testid="welcome-actions"]');
   const r=e=>e?.getBoundingClientRect(),a=r(title),b=r(img),c=r(footer);
   const overlap=a&&b&&Math.min(a.right,b.right)>Math.max(a.left,b.left)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1;
   return {overlap,footer:c?{top:c.top,bottom:c.bottom,left:c.left,right:c.right}:null,horizontal:document.documentElement.scrollWidth>innerWidth+2,height:innerHeight};
  });
  assert.equal(geometry.overlap,false,'OTTO must not obscure title at '+width+'px');
  assert.equal(geometry.horizontal,false,'welcome cannot scroll horizontally at '+width+'px');
  assert(geometry.footer&&geometry.footer.top>=0&&geometry.footer.bottom<=geometry.height+2,'actions footer must stay visible at '+width+'px');
  for(const button of await buttons.all()){
   assert.equal(await button.isVisible(),true,'welcome button visible at '+width+'px');
   const rect=await button.boundingBox();
   assert(rect&&rect.y>=0&&rect.y+rect.height<=geometry.height+2,'welcome button fully inside viewport '+width+'px');
  }
  await page.getByTestId('welcome-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
  assert.equal(await title.isVisible(),true);
  assert.equal(await mascot.isVisible(),true);
  await page.screenshot({path:path.join(OUT,'welcome-'+width+'.png')});
  await page.getByRole('button',{name:'Только необходимое'}).click();
  await page.getByRole('button',{name:/Начать знакомство с OTTO/}).click();
  // The optional browser Telegram Login Widget may report "Bot domain invalid".
  // A safe Telegram bot link must remain usable, without replacing the widget,
  // creating an account, or changing the Telegram Mini App authentication path.
  if(width===390){
   await page.getByRole('button',{name:'Уже есть аккаунт — Войти'}).click();
   await page.getByRole('heading',{name:'Войти по e-mail'}).waitFor();
   const link=page.getByRole('link',{name:/Открыть (бота )?OTTO в Telegram/});
   await link.waitFor();
   const target=new URL(await link.getAttribute('href'));
   assert.equal(target.protocol,'https:');
   assert.equal(target.hostname,'t.me');
   assert.equal(target.pathname.toLowerCase(),'/ottoa1_bot');
   assert.equal(await link.getAttribute('target'),'_blank');
   assert.match(await link.getAttribute('rel')||'',/noopener/);
   assert.equal(await page.getByRole('button',{name:'Войти',exact:true}).isDisabled(),true,
    'Email sign-in must still require an entered address');
   await page.screenshot({path:path.join(OUT,'telegram-browser-fallback-390.png')});
   await page.getByRole('button',{name:'Создать новый аккаунт'}).click();
   await page.getByRole('button',{name:'Telegram',exact:true}).click();
   const fallback=page.getByRole('link',{name:'Открыть бота OTTO в Telegram'});
   const existing=page.getByRole('button',{name:'Открыть OTTO внутри Telegram'});
   assert.equal(await fallback.count()+await existing.count(),1,
    'registration must provide a single Telegram Mini App/bot fallback');
   if(await fallback.count())assert.equal((await fallback.getAttribute('href')),'https://t.me/ottoA1_bot');
   await page.reload();
  }
  await page.getByRole('button',{name:'Попробовать без регистрации'}).waitFor();
  await page.getByRole('button',{name:'Попробовать без регистрации'}).click();
  await page.getByRole('heading',{name:'Попробовать без регистрации?'}).waitFor();
  await page.getByText(/прогресс, ошибки и история не сохраняются/).waitFor();
  assert.equal(starts,0,'guest trial must start only after confirmation');
  await page.getByRole('button',{name:'Понятно, войти гостем'}).click();
  try {
   await page.getByRole('heading',{name:'Шаг 1. Выберите режим'}).waitFor({timeout:14000});
  } catch(error) {
   console.error('Guest transition diagnosis:',JSON.stringify({width,guest,starts,checks,url:page.url(),body:(await page.locator('body').innerText()).slice(0,1600),errors}));
   await page.screenshot({path:path.join(OUT,'guest-transition-error-'+width+'.png'),fullPage:true});
   throw error;
  }
  const tour=page.locator('.otto-tour-backdrop');
  const tourNav=tour.getByRole('navigation',{name:'Основная навигация'});
  await tourNav.getByRole('button',{name:'Тренироваться'}).waitFor();
  assert.equal(await tourNav.getByRole('button').count(),5,'guide has five working bottom buttons');
  await tour.getByRole('button',{name:'Далее'}).click();
  await tour.getByRole('button',{name:'Далее'}).click();
  await tour.getByRole('heading',{name:'Шаг 3. Создайте свои умные карточки'}).waitFor();
  await tour.getByText('внизу слева в реальном тренажёре',{exact:false}).waitFor();
  await tour.getByRole('button',{name:'Далее'}).click();
  await tour.getByRole('heading',{name:'Шаг 4. Что есть в Учебной базе'}).waitFor();
  await tour.getByText('Как писать письма',{exact:false}).first().waitFor();
  await tour.getByRole('button',{name:'Далее'}).click();
  await tour.getByRole('heading',{name:'Шаг 5. Учимся писать письма и тренируем произношение'}).waitFor();
  await tour.getByRole('button',{name:'Далее'}).click();
  await tour.getByRole('heading',{name:'Шаг 6. Нажмите «Тренироваться»'}).waitFor();
  await tour.locator('.otto-tour-scroll').evaluate(el=>{el.scrollTop=el.scrollHeight});
  const geom=await tour.evaluate(el=>{
   const nav=el.querySelector('.otto-bottom-nav')?.getBoundingClientRect();
   const footer=el.querySelector('.otto-tour-footer')?.getBoundingClientRect();
   return {navTop:nav?.top,navBottom:nav?.bottom,footerBottom:footer?.bottom,h:innerHeight,horiz:document.documentElement.scrollWidth>innerWidth+2};
  });
  assert.equal(geom.horiz,false,'guide has no horizontal overflow');
  assert(geom.navBottom<=geom.h+2,'guide dock inside viewport at '+width+'px');
  assert(geom.footerBottom<=geom.navTop-1,'guide controls not covered by navbar at '+width+'px');
  await page.screenshot({path:path.join(OUT,'guide-step6-'+width+'.png')});
  await tour.getByRole('button',{name:'Пропустить'}).click();
  await page.getByRole('heading',{name:'Как вы оцениваете свои знания?'}).waitFor();
  await page.getByRole('button',{name:/Мне нужна подготовка/}).click();
  const introLater=page.getByRole('button',{name:'Посмотреть позже'});
  if(await introLater.count())await introLater.click();
  const initialTour=page.locator('.otto-tour-backdrop');
  if(await initialTour.count())await initialTour.getByRole('button',{name:'Пропустить'}).click();
  const menu=page.getByTestId('otto-study-base-menu');
  await menu.waitFor({timeout:25000});
  assert.equal(await menu.getByRole('button').count(),7,'the agreed seven menu cards are rendered');
  assert.equal(await menu.getByRole('button',{name:'Как лучше всего заниматься новичку'}).isEnabled(),true);
  await menu.getByRole('button',{name:'Как лучше всего заниматься новичку'}).click();
  const beginner=page.getByTestId('otto-beginner-study-plan');
  await beginner.waitFor();
  await beginner.getByRole('heading',{name:'Как лучше всего заниматься новичку'}).waitFor();
  assert.equal(await beginner.locator('ol > li').count(),4,'beginner plan contains exactly four ordered training steps');
  await beginner.getByText('Написав 20 писем',{exact:false}).waitFor();
  await beginner.getByText('немецкие местоимения',{exact:false}).waitFor();
  await beginner.getByText('Главным правилом для успеха здесь является практика.',{exact:false}).waitFor();
  await page.locator('.otto-preview-learning-mode .otto-inner-screen').evaluate(el=>{el.scrollTop=el.scrollHeight});
  const planGeometry=await page.evaluate(()=>{
    const bottom=document.querySelector('.otto-preview-learning-mode .otto-bottom-nav')?.getBoundingClientRect();
    const article=document.querySelector('[data-testid="otto-beginner-study-plan"]')?.getBoundingClientRect();
    const scroller=document.querySelector('.otto-preview-learning-mode .otto-inner-screen');
    return {horizontal:document.documentElement.scrollWidth>innerWidth+2,articleBottom:article?.bottom,navTop:bottom?.top,scrollHeight:scroller?.scrollHeight,clientHeight:scroller?.clientHeight};
  });
  assert.equal(planGeometry.horizontal,false,'beginner article has no horizontal overflow at '+width+'px');
  assert(planGeometry.scrollHeight>planGeometry.clientHeight,'long beginner article must scroll at '+width+'px');
  assert(planGeometry.articleBottom<=planGeometry.navTop+2,'beginner article ending is visible above bottom dock at '+width+'px: '+JSON.stringify(planGeometry));
  await page.screenshot({path:path.join(OUT,'beginner-plan-bottom-'+width+'.png')});
  await beginner.getByRole('button',{name:'К Учебной базе'}).last().click();
  await menu.waitFor();
  const studyScroller=page.locator('.otto-preview-learning-mode .otto-inner-screen');
  await studyScroller.evaluate(el=>{el.scrollTop=el.scrollHeight});
  const spacing=await page.evaluate(()=>{
    const rows=[...document.querySelectorAll('[data-testid="otto-study-base-menu"] > div > div > button')].map(el=>el.getBoundingClientRect());
    const bar=document.querySelector('.otto-preview-learning-mode .otto-bottom-nav')?.getBoundingClientRect();
    const scroll=document.querySelector('.otto-preview-learning-mode .otto-inner-screen');
    return {
      count:rows.length,
      itemGaps:rows.slice(1).map((r,i)=>Math.round(r.top-rows[i].bottom)),
      bottomGap:bar&&rows[6]?Math.round(bar.top-rows[6].bottom):null,
      clipped:rows[6]&&bar?rows[6].bottom>bar.top:false,
      horizontal:document.documentElement.scrollWidth>innerWidth+2,
      scrollHeight:scroll?.scrollHeight,clientHeight:scroll?.clientHeight,
    };
  });
  assert.equal(spacing.horizontal,false,'no horizontal overflow in Учебная база at '+width+'px');
  assert.equal(spacing.clipped,false,'last menu card must not be covered by bottom navigation at '+width+'px');
  assert.equal(spacing.count,7);
  assert(spacing.itemGaps.every(g=>Math.abs(g-spacing.itemGaps[0])<=2),'uneven vertical gaps at '+width+'px: '+JSON.stringify(spacing));
  assert(spacing.bottomGap!==null&&spacing.bottomGap>=4&&spacing.bottomGap<=45,'large blank gap / clipped final card at '+width+'px: '+JSON.stringify(spacing));
  await page.screenshot({path:path.join(OUT,'study-base-bottom-'+width+'.png')});
  if(width===390||width===461){
   await menu.getByRole('button',{name:'Как писать письма'}).click();
   await page.getByRole('heading',{name:'Как научиться писать письма A1'}).waitFor();
   await page.getByText('Письма — важная часть подготовки к экзамену A1.',{exact:false}).waitFor();
   await page.getByText('Формуляр — это тоже часть письменного экзамена',{exact:false}).waitFor();
   await page.screenshot({path:path.join(OUT,'schreiben-welcome-'+width+'.png')});
   await page.locator('.otto-preview-learning-mode .otto-bottom-nav').getByRole('button',{name:'Учебная база'}).click();
   await menu.waitFor();
   await menu.getByRole('button',{name:'Проверка произношения'}).click();
   await page.getByRole('heading',{name:'Потренируем произношение вместе'}).waitFor();
   await page.getByText('обратную связь от OTTO',{exact:false}).waitFor();
   await page.screenshot({path:path.join(OUT,'pronunciation-welcome-'+width+'.png')});
   await page.getByRole('button',{name:'Посмотреть, как устроен Sprechen'}).click();
   await page.getByRole('heading',{name:'Как устроен Sprechen'}).waitFor();
   await page.getByText('Teil 1',{exact:false}).first().waitFor();
   await page.screenshot({path:path.join(OUT,'sprechen-existing-intro-'+width+'.png')});
   await page.locator('.otto-preview-learning-mode .otto-bottom-nav').getByRole('button',{name:'Учебная база'}).click();
   await menu.waitFor();
  }
  await page.locator('.otto-preview-learning-mode .otto-bottom-nav').getByRole('button',{name:'Тренироваться'}).click();
  await page.getByRole('heading',{name:/Ваш пробный доступ — 3 дня/}).waitFor({timeout:25000});
  await page.getByRole('button',{name:/Зарегистрироваться и сохранять/}).waitFor();
  await page.screenshot({path:path.join(OUT,'guest-home-'+width+'.png'),fullPage:true});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
  assert.equal(overflow,false,'horizontal overflow at '+width+'px');
  if(width===390){
   // Read-only browser QA: all AI replies below are intercepted synthetic
   // responses and do NOT reach an AI provider or real Netlify guest store.
   const seen=[];
   const charged=new Set();
   let charges=0;
   await page.route('**/api/check-schreiben',async route=>{
    const id=route.request().headers()['x-otto-ai-operation-id'];
    assert.match(id||'',/^[0-9a-f-]{36}$/i);
    seen.push(id);
    if(charged.has(id))
      return route.fulfill({status:409,contentType:'application/json',
        body:JSON.stringify({code:'guest_ai_operation_repeated'})});
    charged.add(id);charges++;
    if(charges===1)return route.abort('failed');
    return route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({ok:true})});
   });
   const attempt=async text=>page.evaluate(async text=>{
    try{
     const response=await fetch('/api/check-schreiben',{method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({text,situation:'Synthetic guest test',points:['a','b','c']})});
     return response.status;
    }catch{return 'network-error'}
   },text);
   assert.equal(await attempt('gleicher Versuch'),'network-error');
   assert.equal(await attempt('gleicher Versuch'),409);
   assert.equal(seen[0],seen[1],'same logical operation must reuse operation ID');
   assert.equal(charges,1,'ambiguous retry cannot charge twice');
   // A reload must not lose the pending operation ID. The response was lost
   // after a synthetic debit, so the same operation still gets 409.
   await Promise.all([
    page.waitForResponse(r=>r.url().includes('/api/account-access')&&r.status()===200),
    page.reload(),
   ]);
   assert.equal(await attempt('gleicher Versuch'),409);
   assert.equal(seen[2],seen[0],'page reload must restore pending operation ID');
   assert.equal(charges,1,'reload retry cannot double-debit');
   assert.equal(await attempt('anderer Versuch'),200);
   assert.notEqual(seen[3],seen[1],'new payload gets a new ID');
   assert.equal(await attempt('anderer Versuch'),200);
   assert.notEqual(seen[4],seen[3],'new explicit operation after success has new ID');
   assert.equal(charges,3);
   const deliberate=await page.evaluate(async()=>{
    const response=await fetch('/api/check-schreiben',{method:'POST',
      headers:{'Content-Type':'application/json','X-Otto-AI-New-Attempt':'1'},
      body:JSON.stringify({text:'gleicher Versuch',situation:'Synthetic guest test',points:['a','b','c']})});
    return response.status;
   });
   assert.equal(deliberate,200,'explicit fresh attempt can evaluate identical answer');
   assert.notEqual(seen[5],seen[0],'fresh attempt requires a fresh operation ID');
   assert.equal(charges,4);
   await page.unroute('**/api/check-schreiben');
  }
  const protectedWrites=unexpectedWrites.filter(value=>/^\S+ \/api\/(progress|state|profile|legal-consent|email-otp-verify|save-user|support|payment|admin)/.test(value));
  assert.deepEqual(protectedWrites,[],'guest cannot write registered data: '+JSON.stringify(unexpectedWrites));
  assert.equal(starts,1,'guest starts once');
  assert.deepEqual(errors,[],'browser errors at '+width+'px');
  await context.close();
 }
 console.log('PASS: Preview20 viewport matrix 320, 360, 375, 390, 414, 461, 768, 1024, 1280 px; welcome, Учебная база uniform card spacing, guest mode and no registered writes.');
} finally { await browser.close(); }
