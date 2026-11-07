import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const HOST='https://deploy-preview-20--otto-a1.netlify.app';
const USER='00000000-0000-4000-8000-000000000001';
const VISIT='2026-10-20_1792497600000_00000000-0000-4000-8000-000000000011';
const OUT='artifacts/journey-browser';
fs.mkdirSync(OUT,{recursive:true});
const mime=p=>p.endsWith('.html')?'text/html':p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.png')?'image/png':p.endsWith('.webp')?'image/webp':'application/octet-stream';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900}});
let writes=0;
await context.route('**/*',async route=>{
 const req=route.request(),u=new URL(req.url());
 if(u.origin!==HOST)return route.abort();
 const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 if(u.pathname.startsWith('/api/')){
  if(req.method()!=='GET'){writes++;return send({code:'readonly_test'},405);}
  if(u.pathname==='/api/admin-auth')return send({authenticated:true,login:'qa'});
  if(u.pathname==='/api/admin-support'){
   const view=u.searchParams.get('view');
   if(view==='users')return send({authenticated:true,users:[{user_id:USER,user_name:'Тестовый ученик',email:null,telegram_id:'123456789',registered_at:'2026-10-20T08:00:00Z',training_seconds:35,last_session_at:'2026-10-20T09:10:00Z',total_count:1}]});
   if(view==='stats')return send({authenticated:true,stats:{total_users:1,registered_today:1,open_tickets:0,waiting_support:0}});
   return send({authenticated:true,tickets:[]});
  }
  if(u.pathname==='/api/admin-journey'){
   if(u.searchParams.has('id'))return send({ok:true,visit:{
    id:VISIT,startedAt:'2026-10-20T09:00:00Z',lastReceivedAt:'2026-10-20T09:08:00Z',userId:USER,verifiedAt:'2026-10-20T09:01:00Z',device:'mobile_chrome',source:'telegram_ads',eventCount:7,capped:false,
    lastScreen:{scope:'HoerenLearningStage',area:'learning',view:'part',phase:'partIntro',part:3},lastSection:null,lastEventAt:'2026-10-20T09:08:00Z',issues:1,ongoing:false,time:{app:0,registration:20000,learning:90000,reference:0,practice:30000},hasPractice:true,hasLearning:true,feedbackCount:1,
    events:[
     {id:'00000000-0000-4000-8000-000000000021',kind:'screen',at:'2026-10-20T09:00:10Z',frame:{scope:'Onboarding',area:'registration',view:'otp'}},
     {id:'00000000-0000-4000-8000-000000000022',kind:'operation',at:'2026-10-20T09:00:30Z',operation:'otp_verify',operationId:'00000000-0000-4000-8000-000000000031',outcome:'ok',status:200,frame:{scope:'Onboarding',area:'registration',view:'otp'}},
     {id:'00000000-0000-4000-8000-000000000023',kind:'screen',at:'2026-10-20T09:03:00Z',frame:{scope:'HoerenLearningStage',area:'learning',view:'part',phase:'partIntro',part:3}},
     {id:'00000000-0000-4000-8000-000000000024',kind:'operation',at:'2026-10-20T09:05:00Z',operation:'audio',operationId:'00000000-0000-4000-8000-000000000032',outcome:'rejected',code:'NotAllowedError',frame:{scope:'HoerenLearningStage',area:'learning',view:'part',phase:'partIntro',part:3}},
     {id:'00000000-0000-4000-8000-000000000025',kind:'feedback',at:'2026-10-20T09:08:00Z',choice:'technical',comment:'Тестовый комментарий без личных данных',frame:{scope:'HoerenLearningStage',area:'learning',view:'part',phase:'partIntro',part:3}}
    ],
    problems:[{id:'00000000-0000-4000-8000-000000000024',kind:'operation',at:'2026-10-20T09:05:00Z',operation:'audio',operationId:'00000000-0000-4000-8000-000000000032',outcome:'rejected',code:'NotAllowedError',recovered:false,frame:{scope:'HoerenLearningStage',area:'learning',view:'part',phase:'partIntro',part:3}}]
   }});
   return send({ok:true,day:'2026-10-20',visits:[{id:VISIT,startedAt:'2026-10-20T09:00:00Z',lastReceivedAt:'2026-10-20T09:08:00Z',userId:USER,verifiedAt:'2026-10-20T09:01:00Z',device:'mobile_chrome',source:'telegram_ads',eventCount:7,capped:false,lastScreen:{scope:'HoerenLearningStage',area:'learning',view:'part',phase:'partIntro',part:3},lastSection:null,lastEventAt:'2026-10-20T09:08:00Z',issues:1,ongoing:false,time:{app:0,registration:20000,learning:90000,reference:0,practice:30000},hasPractice:true,hasLearning:true,feedbackCount:1}],offset:0,hasMore:false});
  }
  return send({code:'unexpected'},404);
 }
 const rel=u.pathname==='/admin'||u.pathname==='/'?'index.html':decodeURIComponent(u.pathname).replace(/^\/+/,''),full=path.resolve('dist',rel);
 if(!full.startsWith(path.resolve('dist')+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile())return route.fulfill({status:404,body:''});
 return route.fulfill({status:200,contentType:mime(rel),body:fs.readFileSync(full)});
});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto(HOST+'/admin');
await page.getByRole('button',{name:'Путь и проблемы'}).click();
await page.getByRole('heading',{name:'Где останавливаются посетители'}).waitFor();
await page.getByText(/Последний зафиксированный экран:.*Hören · обучение.*Объяснение части.*Teil 3/).waitFor();
await page.getByRole('button',{name:'Открыть путь'}).click();
await page.getByRole('heading',{name:'Тестовый ученик'}).waitFor();
await page.getByText('Зафиксированные затруднения',{exact:true}).waitFor();
await page.getByText(/audio: сервер отклонил · NotAllowedError/).first().waitFor();
await page.getByText(/Со слов пользователя: Что-то не работает/).waitFor();
await page.screenshot({path:OUT+'/journey-admin.png',fullPage:true});
assert.equal(writes,0);
assert.deepEqual(errors,[]);
const mobile=await browser.newContext({viewport:{width:375,height:812}});
await mobile.route('**/*',route=>route.abort());
await mobile.close();
fs.writeFileSync(OUT+'/report.json',JSON.stringify({pass:true,writes,errors},null,2));
await browser.close();
console.log('PASS journey admin list, linked user, last screen, problem and feedback timeline');
