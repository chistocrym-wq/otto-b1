import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const HOST='https://deploy-preview-20--otto-a1.netlify.app';
const USER='11111111-1111-4111-8111-111111111111';
const browser=await chromium.launch({headless:true});
const output='artifacts/recovery-browser';fs.mkdirSync(output,{recursive:true});
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await ctx.addInitScript(()=>localStorage.setItem('otto-preview20-analytics-choice-v1','necessary'));
 let profile=null,saveAttempts=0,saves=0,unexpectedOtp=0;
 const calls=[];
 await ctx.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin!==HOST)return route.abort();
  const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  if(url.pathname.startsWith('/api/')){
   calls.push(req.method()+' '+url.pathname);
   if(url.pathname==='/api/email-otp-request'||url.pathname==='/api/email-otp-verify'){unexpectedOtp++;return reply({code:'should_not_register'},500);}
   if(url.pathname==='/api/profile'){
    if(req.method()==='GET')return reply({authenticated:true,userId:USER,profile});
    if(req.method()==='PUT'){
     const draft=req.postDataJSON();
     assert.equal(draft.name,'Анна');
     assert.equal(draft.learningMode,'guided');
     assert.equal(draft.onboardingCompleted,true);
     saveAttempts++;
     if(saveAttempts===1)return reply({code:'profile_save_failed',error:'Profile could not be saved.'},503);
     saves++;profile={name:draft.name,contactType:'email',contact:'anna@example.test',contactVerified:true,authStatus:'verified',gender:draft.gender,learningMode:draft.learningMode,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),onboardingCompleted:true};
     return reply({authenticated:true,userId:USER,profile});
    }
   }
   if(url.pathname==='/api/session')return reply({authenticated:true,userId:USER,verifiedEmail:'anna@example.test',telegramUserId:null});
   if(url.pathname==='/api/account-access')return reply({authenticated:true,userId:USER,trialActive:true,trialStartedAt:'2026-10-22T00:00:00Z',trialEndsAt:'2026-10-25T00:00:00Z',serverNow:'2026-10-22T12:00:00Z',subscriptionActive:false,subscriptionUntil:null,hasTrainingAccess:true});
   if(url.pathname==='/api/progress')return reply({authenticated:true,progress:{},activity:[]});
   if(url.pathname==='/api/legal-consent')return reply({accepted:true,documentVersion:'2026-09-23-v1'});
   if(url.pathname==='/api/preview20-study-time')return reply({ok:true,accepted:[]});
   if(url.pathname==='/api/preview20-journey')return reply({code:'analytics_opt_out'},403);
   return reply({code:'not_authenticated'},401);
  }
  const relative=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const full=path.resolve('dist',relative);
  if(!full.startsWith(path.resolve('dist')+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile())return route.fulfill({status:404,body:''});
  const mime=relative.endsWith('.html')?'text/html':relative.endsWith('.js')?'application/javascript':relative.endsWith('.css')?'text/css':relative.endsWith('.svg')?'image/svg+xml':relative.endsWith('.png')?'image/png':'application/octet-stream';
  return route.fulfill({status:200,contentType:mime,body:fs.readFileSync(full)});
 });
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(HOST+'/');
 await page.getByRole('heading',{name:'Завершите оформление профиля'}).waitFor({timeout:30000});
 await page.screenshot({path:path.join(output,'verified-no-profile.png')});
 const input=page.getByPlaceholder('Например, Анна');
 await input.fill('Анна');
 await page.getByRole('button',{name:'Женский'}).click();
 await page.getByRole('button',{name:/Продолжить/}).first().click();
 await page.getByRole('heading',{name:'Выберите режим обучения'}).waitFor();
 await page.getByRole('button',{name:/Начать заниматься/}).click();
 await page.getByRole('alert').filter({hasText:/Сервер не смог сохранить профиль.*повтор/i}).waitFor({timeout:30000});
 assert.equal(saveAttempts,1);
 assert.equal(saves,0);
 assert.equal(unexpectedOtp,0);
 await page.getByRole('button',{name:/Начать заниматься/}).click();
 await page.getByRole('heading',{name:'Завершите оформление профиля'}).waitFor({state:'hidden',timeout:30000});
 await page.getByText('Перед продолжением',{exact:true}).waitFor({state:'hidden',timeout:30000});
 assert.equal(saveAttempts,2);
 assert.equal(saves,1);
 assert.equal(unexpectedOtp,0);
 await page.reload();
 await page.getByRole('heading',{name:'Завершите оформление профиля'}).waitFor({state:'hidden'});
 await page.screenshot({path:path.join(output,'training-open.png')});
 assert.equal(unexpectedOtp,0);
 assert.deepEqual(errors,[]);
 console.log('Verified session > missing profile > readable save failure > retry > OTTO, without OTP: PASS');
 await ctx.close();
}finally{await browser.close();}
