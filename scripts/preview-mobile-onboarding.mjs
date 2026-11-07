import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = 'https://deploy-preview-13--otto-a1.netlify.app/';
const sizes = [[320,700],[360,740],[375,812],[390,844],[430,932],[768,1024],[320,568]];
const profile = {name:'Tour QA',contactType:'email',contact:'tour@example.com',contactVerified:true,authStatus:'verified',gender:'female',learningMode:'direct',createdAt:'2026-10-10T00:00:00Z',updatedAt:'2026-10-10T00:00:00Z',onboardingCompleted:true};
const browser = await chromium.launch({headless:true});
mkdirSync('reference-visual-artifacts',{recursive:true});
const results = [];
async function prepare(width,height,userId='tour-qa-user') {
  const context = await browser.newContext({viewport:{width,height},serviceWorkers:'block',deviceScaleFactor:1});
  const reply=(route,data)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  await context.route('**/api/**',r=>reply(r,{}));
  await context.route('**/api/session*',r=>reply(r,{authenticated:true,userId}));
  await context.route('**/api/profile',r=>reply(r,{authenticated:true,userId,profile}));
  await context.route('**/api/account-access',r=>reply(r,{authenticated:true,userId,serverNow:new Date().toISOString(),trialActive:true,trialEndsAt:'2026-10-30T00:00:00Z',subscriptionActive:false,hasTrainingAccess:true}));
  await context.route('**/api/legal-consent',r=>reply(r,{accepted:true,documentVersion:'2026-09-23-v1'}));
  await context.route('**/api/state',r=>reply(r,{authenticated:true,userId,state:{}}));
  await context.route('**/api/progress',r=>reply(r,{authenticated:true,progress:{},activity:[]}));
  await context.route('**/api/support-summary',r=>reply(r,{unreadCount:0,latestTicketId:null}));
  await context.addInitScript(()=>{
    if(!sessionStorage.getItem('__ottoTourQaStarted')){
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem('__ottoTourQaStarted','1');
    }
  });
  const page=await context.newPage();
  page.setDefaultTimeout(12000);
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url())});
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
  return {context,page,errors};
}
async function visibleInScroll(page,selector) {
  const el=page.locator(selector);
  await el.scrollIntoViewIfNeeded();
  const box=await el.boundingBox();
  assert.ok(box&&box.width>=40&&box.height>=40,'Control too small or missing: '+selector);
  assert.ok(box.x>=-2&&box.x+box.width<=page.viewportSize().width+2,'Control outside screen: '+selector);
}
async function noOverflow(page,tag) {
  const n=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(n<=2,tag+' horizontal overflow '+n);
}
async function screenshot(page,width,tag){
  await page.screenshot({path:'reference-visual-artifacts/'+width+'-onboarding-'+tag+'.jpg',type:'jpeg',quality:68,animations:'disabled'});
}
try {
  for(const [width,height] of sizes) {
    const {context,page,errors}=await prepare(width,height);
    try {
      // First visit: the real seven-step tour is shown before the mode chooser.
      await page.locator('[data-otto-tour]').waitFor({state:'visible',timeout:30000});
      assert.equal(await page.locator('.otto-tour-progress span').count(),7);
      await page.getByRole('heading',{name:'Шаг 1. Выберите режим'}).waitFor();
      await noOverflow(page,'initial tour');
      await screenshot(page,width,'tour');
      await page.getByRole('button',{name:'Далее',exact:true}).click();
      await page.getByRole('heading',{name:'Шаг 2. Познакомьтесь со Справочником'}).waitFor();
      await page.getByRole('button',{name:'Назад',exact:true}).click();
      await page.getByRole('heading',{name:'Шаг 1. Выберите режим'}).waitFor();
      for(const title of [
        'Шаг 2. Познакомьтесь со Справочником',
        'Шаг 3. Создайте свои умные карточки',
        'Шаг 4. Переходите к обучению по модулям экзамена A1',
        'Шаг 5. Как устроено обучение с OTTO',
        'Шаг 6. Переходите к реальным тренировкам',
        '❤️ Ну что, начинаем?',
      ]){
        await page.getByRole('button',{name:'Далее',exact:true}).click();
        await page.getByRole('heading',{name:title,exact:true}).waitFor();
      }
      await page.getByRole('button',{name:'Готово',exact:true}).click();
      await page.locator('[data-otto-tour]').waitFor({state:'detached'});
      await page.getByRole('heading',{name:'Как вы оцениваете свои знания?'}).waitFor({timeout:30000});
      await visibleInScroll(page,'.otto-preview-mode-card-learning');
      await noOverflow(page,'welcome');
      await screenshot(page,width,'welcome');
      await page.getByRole('button',{name:/Мне нужна подготовка/}).click();
      // A "later" decision must take the user into Schreiben without replaying the tour.
      await page.getByRole('button',{name:'Посмотреть позже'}).waitFor({timeout:30000});
      await screenshot(page,width,'reference-welcome');
      await page.getByRole('button',{name:'Посмотреть позже'}).click();
      await page.getByRole('heading',{name:'Начинаем со Schreiben'}).waitFor();
      await page.getByRole('button',{name:'Пропустить',exact:true}).click();
      await page.getByRole('heading',{name:'Выберите модуль'}).waitFor();
      await noOverflow(page,'modules');
      await screenshot(page,width,'modules');
      for(const title of ['Schreiben','Lesen','Hören','Sprechen'])assert.ok(await page.getByRole('button',{name:new RegExp('^'+title)}).isVisible(),title+' card hidden');
      const mobileMenu=page.getByRole('button',{name:'Меню обучения'});
      if(await mobileMenu.isVisible()&&await mobileMenu.getAttribute('aria-expanded')==='false')await mobileMenu.click();
      await page.getByRole('button',{name:'Как пользоваться OTTO'}).click();
      await page.locator('[data-otto-tour]').waitFor();
      await page.getByRole('button',{name:'Закрыть экскурсию'}).click();
      await page.getByRole('heading',{name:'Выберите модуль'}).waitFor();
      await page.reload({waitUntil:'domcontentloaded'});
      await page.getByRole('heading',{name:'Выберите модуль'}).waitFor();
      assert.equal(await page.locator('[data-otto-tour]').count(),0,'Tour reappeared after reload');
      assert.equal(errors.length,0,'JavaScript errors: '+errors.join(' | '));
      results.push({width,height,welcome:true,tour:true,modules:true,reload:true});
    } finally { await context.close(); }
  }
  const {context,page,errors}=await prepare(390,844,'tour-training-user');
  try {
    await page.locator('[data-otto-tour]').waitFor({state:'visible',timeout:30000});
    await page.getByRole('button',{name:'Пропустить',exact:true}).click();
    await page.locator('[data-otto-tour]').waitFor({state:'detached'});
    await page.getByRole('heading',{name:'Как вы оцениваете свои знания?'}).waitFor();
    await page.getByRole('button',{name:/Мне нужен только тренажёр/}).click();
    await page.locator('.otto-bottom-nav').waitFor();
    assert.equal(await page.locator('[data-otto-tour]').count(),0,'Tour shown in trainer mode');
    await page.getByRole('button',{name:/Настройки/}).last().click();
    await page.getByRole('button',{name:'Как пользоваться OTTO'}).click();
    await page.locator('[data-otto-tour]').waitFor();
    await page.getByRole('button',{name:'Пропустить',exact:true}).click();
    await page.locator('.otto-settings-screen').waitFor();
    assert.equal(errors.length,0,'Training mode errors: '+errors.join(' | '));
    results.push({width:390,mode:'training',tourManual:true});
  } finally { await context.close(); }
  console.log('PREVIEW_MOBILE_ONBOARDING_OK '+JSON.stringify(results));
} finally { await browser.close(); }
