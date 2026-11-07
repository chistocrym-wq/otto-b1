import {chromium} from 'playwright';
import {readFileSync,existsSync,statSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const HOST='https://deploy-preview-20--otto-a1.netlify.app';
const browser=await chromium.launch({headless:true});
mkdirSync('artifacts/teacher-browser',{recursive:true});
try{
 for (const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:850},serviceWorkers:'block'});
  await context.addInitScript(()=>localStorage.setItem('otto-preview20-analytics-choice-v1','necessary'));
  let registered=false,settings=0,adminAccess=0;
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.origin!==HOST)return route.abort();
   const send=(payload,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(payload)});
   if(u.pathname.startsWith('/api/')){
    if(u.pathname==='/api/teacher'){
     if(req.method()==='POST'){
      const body=req.postDataJSON();
      if(body.action==='register'){registered=true;return send({ok:true,partner:{code:'OT-ABCDEFGHJKLM'}});}
      if(body.action==='settings'){settings++;return send({ok:true,payout:{method:body.method,mask:body.mask}});}
     }
     return send(registered?{ok:true,registered:true,partner:{code:'OT-ABCDEFGHJKLM',name:'Тестовый преподаватель',rewardMinor:50000,siteUrl:HOST+'/?ref=OT-ABCDEFGHJKLM',telegramUrl:'https://t.me/ottoA1_bot?startapp=ref_OT-ABCDEFGHJKLM'},statistics:{clicks:2,registrations:1,payments:1,renewals:0,earnedMinor:50000,pendingMinor:50000,paidMinor:0,people:[{alias:'Ученик #AABBCC',status:'registered'}],commissions:[],payouts:[]}}:{ok:true,registered:false,termsVersion:'pilot-2026-10-24-v2'});
    }
    if(u.pathname==='/api/admin-teachers'){adminAccess++;return send({code:'not_authenticated'},401);}
    return send({code:'not_authenticated'},401);
   }
   const rel=u.pathname==='/'||u.pathname==='/teacher'?'index.html':decodeURIComponent(u.pathname).replace(/^\/+/,'');
   const full=path.resolve('dist',rel);
   if(full!==path.resolve('dist/index.html')&&(!full.startsWith(path.resolve('dist')+path.sep)||!existsSync(full)||!statSync(full).isFile()))return route.fulfill({status:404,body:''});
   const type=rel.endsWith('.html')?'text/html':rel.endsWith('.js')?'application/javascript':rel.endsWith('.css')?'text/css':rel.endsWith('.svg')?'image/svg+xml':rel.endsWith('.png')?'image/png':'application/octet-stream';
   return route.fulfill({status:200,contentType:type,body:readFileSync(full)});
  });
  await page.goto(HOST+'/teacher');
  await page.getByRole('heading',{name:'Кабинет преподавателя'}).waitFor({timeout:30000});
  await page.getByRole('heading',{name:'Стать партнёром OTTO'}).waitFor();
  await page.getByPlaceholder('Имя преподавателя').fill('Тестовый преподаватель');
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Зарегистрироваться как преподаватель'}).click();
  await page.getByText('OT-ABCDEFGHJKLM').first().waitFor();
  await page.getByText('Ученик #AABBCC').waitFor();
  await page.getByText(/Вознаграждение:.*500/).waitFor();
  await page.getByRole('button',{name:'Сохранить'}).click();
  assert.equal(settings,1);
  assert.equal(adminAccess,0,'teacher route may not access protected admin API');
  assert.deepEqual(errors,[]);
  await page.screenshot({path:'artifacts/teacher-browser/teacher-'+width+'.png'});
  await context.close();
 }

 const teacherId='11111111-1111-4111-8111-111111111111';
 const studentId='test:33333333-3333-4333-8333-333333333333';
 let studentRow=null;const commissions=[],calls=[],adminErrors=[];
 const adminCtx=await browser.newContext({viewport:{width:1280,height:850},serviceWorkers:'block'});
 await adminCtx.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==HOST)return route.abort();
  const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  if(url.pathname.startsWith('/api/')){
   if(url.pathname==='/api/admin-auth')return send({authenticated:true,login:'synthetic-admin'});
   if(url.pathname==='/api/admin-support')return send(url.searchParams.get('view')==='stats'?{authenticated:true,stats:{total_users:0,registered_today:0,open_tickets:0}}:{authenticated:true,users:[]});
   if(url.pathname==='/api/admin-teachers'){
    if(request.method()==='GET')return send({ok:true,partners:[{id:teacherId,code:'OT-ABCDEFGHJKLM',name:'Демо-преподаватель',demo:true,rewardMinor:50000,blocked:false,clicks:0,registrations:studentRow?1:0,payments:commissions.length,renewals:0,earnedMinor:commissions.length*50000,pendingMinor:commissions.length*50000,paidMinor:0,refunded:0,people:studentRow?[studentRow]:[],commissions,payouts:[]}]});
    const body=request.postDataJSON();calls.push(body);
    if(body.action==='seed_student'){
     assert.equal(body.teacherId,teacherId);
     studentRow={alias:'Тестовый ученик #123abc',status:'registered',syntheticStudentId:studentId,linkedAt:'2026-10-24T10:00:00Z'};
     return send({ok:true,studentId,alias:studentRow.alias});
    }
    if(body.action==='test_payment'){
     assert.equal(body.teacherId,teacherId);
     assert.equal(body.studentId,studentId,'admin must send synthetic student ID, never undefined');
     assert.match(body.paymentId,/^test_/);
     commissions.push({paymentId:body.paymentId,studentAlias:studentRow.alias,commissionMinor:50000,status:'pending'});
     studentRow.status='paid';
     return send({ok:true,result:{credited:true,commission:{commissionMinor:50000}}});
    }
    return send({code:'unexpected_admin_action'},400);
   }
   return send({code:'unexpected_api'},404);
  }
  const relative=url.pathname==='/admin'||url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const full=path.resolve('dist',relative);
  if(!full.startsWith(path.resolve('dist')+path.sep)||!existsSync(full)||!statSync(full).isFile())return route.fulfill({status:404,body:''});
  const mime=relative.endsWith('.html')?'text/html':relative.endsWith('.js')?'application/javascript':relative.endsWith('.css')?'text/css':relative.endsWith('.svg')?'image/svg+xml':relative.endsWith('.png')?'image/png':'application/octet-stream';
  return route.fulfill({status:200,contentType:mime,body:readFileSync(full)});
 });
 const adminPage=await adminCtx.newPage();
 adminPage.on('pageerror',e=>adminErrors.push(String(e)));
 await adminPage.goto(HOST+'/admin');
 await adminPage.getByRole('button',{name:'Преподаватели',exact:true}).click();
 await adminPage.getByRole('heading',{name:'Преподаватели',exact:true}).waitFor();
 await adminPage.getByText('Тестовые операции и споры',{exact:true}).click();
 await adminPage.getByRole('button',{name:'Создать тестового ученика'}).click();
 await adminPage.getByText('Тестовый ученик #123abc').waitFor();
 await adminPage.getByRole('button',{name:'Тестовая оплата 1 500 ₽'}).click();
 await adminPage.getByText('Тестовая оплата подтверждена. Начислено 500 ₽.').waitFor();
 const commissionRow=adminPage.getByText(/Тестовые начисления:\s*500\s*₽\s*·\s*Ожидает:\s*500\s*₽/);
 await commissionRow.waitFor();
 assert.match(await commissionRow.textContent(),/Тестовые начисления:\s*500\s*₽\s*·\s*Ожидает:\s*500\s*₽/);
 assert.deepEqual(calls.map(x=>x.action),['seed_student','test_payment']);
 assert.deepEqual(adminErrors,[]);
 await adminPage.screenshot({path:'artifacts/teacher-browser/admin-1280.png'});
 await adminCtx.close();
 console.log('Teacher and admin UI synthetic browser acceptance PASS');
}finally{await browser.close();}
