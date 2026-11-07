import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const HOST='https://deploy-preview-20--otto-a1.netlify.app';
const OUT='artifacts/reference-unified';
fs.mkdirSync(OUT,{recursive:true});
const mime=p=>p.endsWith('.html')?'text/html':p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.png')?'image/png':p.endsWith('.jpg')||p.endsWith('.jpeg')?'image/jpeg':p.endsWith('.webp')?'image/webp':'application/octet-stream';
const widths=[320,360,375,390,414,768,1024,1280,1440];
const browser=await chromium.launch({headless:true});
const results=[];
try {
 for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:width<768?800:850},serviceWorkers:'block'});
  let guest=false,started=Date.now();
  await context.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.origin!==HOST)return route.abort();
   const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(u.pathname.startsWith('/api/')){
    if(u.pathname==='/api/preview20-journey')return send({code:'analytics_opt_out'},403);
    if(u.pathname==='/api/preview20-guest'&&req.method()==='POST'){guest=true;return send({guest:true,trialStartedAt:new Date(started).toISOString(),trialEndsAt:new Date(started+72*3600000).toISOString()});}
    if(u.pathname==='/api/account-access')return send(guest?{authenticated:false,guest:true,serverNow:new Date().toISOString(),trialActive:true,trialStartedAt:new Date(started).toISOString(),trialEndsAt:new Date(started+72*3600000).toISOString(),subscriptionActive:false,subscriptionUntil:null,hasTrainingAccess:true,reason:'guest_trial_active'}:{authenticated:false,guest:false,hasTrainingAccess:false,trialActive:false,subscriptionActive:false});
    if(u.pathname==='/api/session')return send({authenticated:false});
    if(u.pathname==='/api/profile')return send({code:'not_authenticated'},401);
    return send({code:'not_authenticated'},401);
   }
   const rel=u.pathname==='/'?'index.html':decodeURIComponent(u.pathname).replace(/^\/+/,'');
   const full=path.resolve('dist',rel);
   if(!full.startsWith(path.resolve('dist')+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile())return route.fulfill({status:404,body:''});
   return route.fulfill({status:200,contentType:mime(rel),body:fs.readFileSync(full)});
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const popups=[];page.on('popup',p=>popups.push(p));
  await page.goto(HOST+'/');
  await page.getByRole('button',{name:'Только необходимое'}).click();
  await page.getByRole('button',{name:/Начать знакомство с OTTO/}).click();
  await page.getByRole('button',{name:'Попробовать без регистрации'}).click();
  await page.getByRole('button',{name:'Понятно, войти гостем'}).click();
  await page.getByRole('heading',{name:'Шаг 1. Выберите режим'}).waitFor({timeout:30000});
  await page.getByRole('button',{name:'Пропустить'}).click();
  await page.getByRole('button',{name:/Мне нужна подготовка/}).click();
  // The entry welcome screen and the actual reference home have the SAME
  // "Справочник OTTO" heading. Do not mistake the welcome for the opened
  // reference: enter through its real button before looking for categories.
  const welcome=page.locator('.otto-reference-entry-welcome');
  if(await welcome.count()) await welcome.getByRole('button',{name:'К справочнику',exact:true}).click();
  const studyBase=page.getByTestId('otto-study-base-menu');
  if(await studyBase.count()) await studyBase.getByRole('button',{name:'Справочный конспект'}).click();
  const reference=page.getByRole('heading',{name:'Справочник OTTO'});
  await reference.first().waitFor({timeout:30000});
  const baseCategory=page.getByRole('button',{name:/Общая база немецкого/}).first();
  await baseCategory.waitFor({timeout:30000});
  await baseCategory.click();
  await page.getByRole('button',{name:/Числа/,exact:true}).first().click();
  assert(await page.locator('[data-otto-reference-shell="true"]').count()>0);
  await page.screenshot({path:path.join(OUT,'base-'+width+'.png')});
  await page.getByRole('button',{name:/Назад в справочник|К справочнику/}).first().click();
  for(const [name,id] of [['Письменная часть экзамена','written'],['Устная часть экзамена','oral']]){
   await page.getByRole('button',{name,exact:true}).first().click();
   const root=page.locator('.otto-reference-exam-content');
   await root.waitFor();
   assert.equal(await root.locator('aside').count(),0,'no sidebar');
   assert.equal(await page.locator('[data-otto-reference-shell="true"]').count(),1,'one Shell');
   const topics=root.locator('.otto-reference-topic-button');
   assert(await topics.count()>1,'topics exist');
   await page.screenshot({path:path.join(OUT,id+'-topics-'+width+'.png')});
   await topics.first().click();
   await root.getByRole('button',{name:'Назад к темам'}).first().waitFor();
   assert(await root.getByRole('button',{name:'Далее →'}).count()>0);
   await page.screenshot({path:path.join(OUT,id+'-detail-'+width+'.png')});
   await root.getByRole('button',{name:'Назад к темам'}).first().click();
   assert(await topics.first().isVisible());
   await topics.nth(1).click();
   await root.getByRole('button',{name:'Назад к темам'}).first().waitFor();
   await page.getByRole('button',{name:'Назад в справочник'}).first().click();
  }
  const geometry=await page.evaluate(()=>({horizontal:document.documentElement.scrollWidth>innerWidth+2,shells:[...document.querySelectorAll('[data-otto-reference-shell]')].length}));
  assert.equal(geometry.horizontal,false,'horizontal page overflow '+width);
  assert.equal(popups.length,0,'unexpected browser popup');
  assert.deepEqual(errors,[],'JavaScript errors');
  results.push({width,ok:true,popups:popups.length});
  await context.close();
 }
 fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(results,null,2));
 console.log('PASS unified reference viewport matrix',widths.join(','));
}finally{await browser.close();}
