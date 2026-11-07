import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const HOST='https://deploy-preview-20--otto-a1.netlify.app';
const OUT='artifacts/learning-nav';
fs.mkdirSync(OUT,{recursive:true});
const sizes=[[320,568],[360,640],[375,667],[390,844],[414,896],[461,581],[768,650],[1024,768],[1280,720],[1440,900]];
const mime=p=>p.endsWith('.html')?'text/html':p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.png')?'image/png':p.endsWith('.webp')?'image/webp':'application/octet-stream';
const browser=await chromium.launch({headless:true});
try{
 for(const [width,height] of sizes){
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});
  let guest=false,started=Date.now();
  await context.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.origin!==HOST)return route.abort();
   const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(u.pathname.startsWith('/api/')){
    if(u.pathname==='/api/preview20-journey')return send({code:'analytics_opt_out'},403);
    if(u.pathname==='/api/preview20-guest'&&req.method()==='POST'){guest=true;return send({guest:true,trialStartedAt:new Date(started).toISOString(),trialEndsAt:new Date(started+72*3600000).toISOString()});}
    if(u.pathname==='/api/account-access')return send(guest?{authenticated:false,guest:true,serverNow:new Date().toISOString(),trialActive:true,trialStartedAt:new Date(started).toISOString(),trialEndsAt:new Date(started+72*3600000).toISOString(),subscriptionActive:false,subscriptionUntil:null,hasTrainingAccess:true,reason:'guest_trial_active'}:{authenticated:false,guest:false,serverNow:new Date().toISOString(),hasTrainingAccess:false,trialActive:false,subscriptionActive:false});
    if(u.pathname==='/api/session')return send({authenticated:false});
    return send({code:'not_authenticated'},401);
   }
   const rel=u.pathname==='/'?'index.html':decodeURIComponent(u.pathname).replace(/^\/+/,'');
   const full=path.resolve('dist',rel);
   if(!full.startsWith(path.resolve('dist')+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile())return route.fulfill({status:404,body:''});
   return route.fulfill({status:200,contentType:mime(rel),body:fs.readFileSync(full)});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(HOST+'/');
  await page.getByRole('button',{name:'Только необходимое'}).click();
  await page.getByRole('button',{name:/Начать знакомство с OTTO/}).click();
  await page.getByRole('button',{name:'Попробовать без регистрации'}).click();
  await page.getByRole('button',{name:'Понятно, войти гостем'}).click();
  await page.getByRole('heading',{name:'Шаг 1. Выберите режим'}).waitFor({timeout:30000});
  await page.getByRole('button',{name:'Пропустить'}).click();
  await page.getByRole('button',{name:/Мне нужна подготовка/}).click();
  const refWelcome=page.getByRole('button',{name:'К справочнику'});
  if(await refWelcome.count())await page.getByRole('button',{name:'Посмотреть позже'}).click();
  const nav=page.getByRole('navigation',{name:'Основная навигация'});
  await nav.getByRole('button',{name:'Учебная база'}).waitFor({timeout:30000});
  const labels=await nav.locator('button > span:last-child').allTextContents();
  assert.deepEqual(labels,['Пробный экзамен','Мои ошибки','Тренироваться','Учебная база','Настройки']);
  async function check(){
   const value=await page.evaluate(()=>{
    const nav=document.querySelector('.otto-bottom-nav');
    const line=nav?.querySelector('.otto-bottom-nav-inner');
    const geometry=el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};};
    const kids=[...(line?.querySelectorAll('button')||[])].map(b=>({button:geometry(b),caption:geometry(b.lastElementChild),captionText:b.lastElementChild?.textContent}));
    const indicator=getComputedStyle(line,'::after');
    return {nav:nav?geometry(nav):null,inner:line?geometry(line):null,kids,indicator:indicator.content,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth};
   });
   assert(value.nav&&value.inner);
   assert.equal(value.indicator,'none','app-generated gesture bar removed');
   assert.equal(value.scrollWidth>value.viewport+2,false,'horizontal overflow at '+width+'x'+height);
   for(const k of value.kids){
    assert(k.caption.top>=k.button.top-1&&k.caption.bottom<=k.button.bottom+1,'caption inside nav button '+k.captionText);
    assert(k.caption.bottom<=value.inner.bottom+1,'caption not clipped '+k.captionText);
    assert(k.caption.left>=k.button.left-1&&k.caption.right<=k.button.right+1,'caption width '+k.captionText);
   }
  }
  await check();
  await page.screenshot({path:path.join(OUT,'learning-hub-'+width+'x'+height+'.png')});
  await page.getByRole('button',{name:'Как писать письма'}).first().click();
  const header=page.locator('header.otto-learning-topbar');
  await header.getByText('Как писать письма').waitFor();
  assert.equal(await header.locator('button').count(),0,'Schreiben header has no actions');
  await check();
  await page.screenshot({path:path.join(OUT,'schreiben-'+width+'x'+height+'.png')});
  await nav.getByRole('button',{name:'Учебная база'}).click();
  await page.getByRole('button',{name:'Проверка произношения'}).first().click();
  await header.getByText('Проверка произношения').waitFor();
  assert.equal(await header.locator('button').count(),0,'Sprechen header has no actions');
  await check();
  await page.screenshot({path:path.join(OUT,'sprechen-'+width+'x'+height+'.png')});
  await nav.getByRole('button',{name:'Учебная база'}).click();
  await page.getByRole('button',{name:'Как писать письма'}).first().click();
  await header.getByText('Как писать письма').waitFor();
  await nav.getByRole('button',{name:'Тренироваться'}).click();
  await nav.getByRole('button',{name:'Тренироваться'}).waitFor();
  await check();
  assert.deepEqual(errors,[]);
  console.log('PASS',width,height);
  await context.close();
 }
}finally{await browser.close();}
