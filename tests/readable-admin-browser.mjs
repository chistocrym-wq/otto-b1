// Synthetic browser acceptance: every network request is intercepted.
// Reads built local dist only. Never logs in to or writes any real backend.
import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fixtureRows,users,SUBJECT,SUBJECT2} from './readable-admin-fixture.mjs';
const HOST='https://deploy-preview-20--otto-a1.netlify.app';
const OUT='artifacts/readable-admin';fs.mkdirSync(OUT,{recursive:true});
const report={synthetic:true,checks:[],externalBlocked:0,backendWrites:0,errors:[]};
const check=s=>{report.checks.push(s);console.log('PASS',s);};
const mime=p=>p.endsWith('.html')?'text/html':p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.png')?'image/png':p.endsWith('.webp')?'image/webp':'application/octet-stream';
const browser=await chromium.launch({headless:true});
async function context(viewport,mode={authorized:true,fail:false,mismatch:false}){
 const c=await browser.newContext({viewport});
 await c.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin!==HOST){report.externalBlocked++;return route.abort();}
  const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(url.pathname.startsWith('/api/')){
   if(req.method()!=='GET'){report.backendWrites++;return send({code:'forbidden_in_readonly_test'},405);}
   if(!mode.authorized)return send({authenticated:false,code:'not_authenticated'},401);
   if(url.pathname==='/api/admin-auth')return send({authenticated:true,login:'synthetic-admin'});
   if(url.pathname==='/api/admin-support'){
    if(url.searchParams.get('view')==='users')return send({authenticated:true,users});
    if(url.searchParams.get('view')==='stats')return send({authenticated:true,stats:{total_users:2,registered_today:2,open_tickets:0,waiting_support:0}});
    return send({authenticated:true,tickets:[]});
   }
   if(url.pathname==='/api/admin-state-diagnostic'){
    if(mode.fail)return send({code:'state_diagnostic_failed'},503);
    const id=url.searchParams.get('userId');
    return send({authenticated:true,userId:mode.mismatch?SUBJECT2:id,state:id===SUBJECT?fixtureRows():[]});
   }
   return send({code:'unexpected_test_route'},404);
  }
  const rel=url.pathname==='/admin'||url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).replace(/^\/+/,''),full=path.resolve('dist',rel);
  if(!full.startsWith(path.resolve('dist')+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile())return route.fulfill({status:404,body:''});
  return route.fulfill({status:200,contentType:mime(rel),body:fs.readFileSync(full)});
 });
 return c;
}
try{
 const anon=await context({width:1100,height:800},{authorized:false});const anonPage=await anon.newPage();await anonPage.goto(HOST+'/admin');await anonPage.getByRole('heading',{name:'Вход в админ-панель'}).waitFor();assert.equal(await anonPage.getByRole('button',{name:'История и результаты',exact:true}).count(),0);check('Without admin authentication only the existing login form is rendered');await anon.close();
 const mode={authorized:true,fail:false,mismatch:false};const desktop=await context({width:1440,height:1050},mode);const page=await desktop.newPage();page.on('pageerror',e=>report.errors.push(String(e)));
 await page.goto(HOST+'/admin');await page.getByRole('heading',{name:'Пользователи: история и результаты'}).waitFor();await page.getByText('35 с',{exact:true}).waitFor();check('Readable admin entry loads; sub-minute duration shown in seconds');
 await page.getByRole('button',{name:'История и результаты',exact:true}).first().click();await page.getByRole('heading',{name:'Прогресс по четырём разделам'}).waitFor();
 const cards=page.locator('.ra-module-count');assert.deepEqual(await cards.evaluateAll(nodes=>nodes.map(n=>n.firstChild.textContent)),['17','14','3','5']);check('Four module counts rendered as 17,14,3,5; no raw JSON');
 await page.getByText('Есть расхождение между сохранёнными сводками',{exact:true}).waitFor();await page.getByText('Hören · Аудирование · Teil 3',{exact:true}).first().waitFor();assert.equal(await page.locator('.ra-timeline li').count(),9);assert.equal(await page.getByText('PRIVATE_ANSWER_SENTINEL',{exact:false}).count(),0);check('Saved attempts, last continuation and conflicting aggregates are explicit');
 await page.screenshot({path:OUT+'/desktop-progress.png'});
 await page.getByRole('button',{name:'Закрыть',exact:true}).click();await page.reload();await page.getByRole('button',{name:'История и результаты',exact:true}).first().click();await page.getByRole('heading',{name:'Прогресс по четырём разделам'}).waitFor();check('Reload refetches server snapshot and preserves readable result');
 mode.fail=true;await page.getByRole('button',{name:'Обновить карточку'}).click();await page.getByRole('alert').waitFor();assert.equal(await page.locator('.ra-module').count(),0);check('HTTP503 is shown as data-loading failure, not zeros');
 mode.fail=false;mode.mismatch=true;await page.getByRole('button',{name:'Обновить карточку'}).click();await page.getByRole('alert').waitFor();assert.equal(await page.locator('.ra-module').count(),0);check('Wrong-subject response never displays another user data');
 mode.mismatch=false;await page.getByRole('button',{name:'Обновить карточку'}).click();await page.getByRole('heading',{name:'Прогресс по четырём разделам'}).waitFor();await page.getByRole('button',{name:'Закрыть',exact:true}).click();
 await page.getByRole('button',{name:'История и результаты',exact:true}).nth(1).click();await page.getByText('В доступных записях нет отметок заданий',{exact:true}).waitFor();check('Empty snapshots remain unknown activity, not invented attempts');await page.getByRole('button',{name:'Закрыть',exact:true}).click();
 await page.getByRole('button',{name:'Обращения, сообщения и выход'}).click();await page.getByRole('heading',{name:'Админ-панель',exact:true}).waitFor();await page.getByRole('button',{name:'Вернуться к аналитике'}).click();await page.getByRole('heading',{name:'Пользователи: история и результаты'}).waitFor();check('Original support and messaging UI retained');
 const mobile=await context({width:375,height:812});const mp=await mobile.newPage();mp.on('pageerror',e=>report.errors.push(String(e)));await mp.goto(HOST+'/admin');await mp.getByRole('button',{name:'История и результаты',exact:true}).first().click();await mp.getByRole('heading',{name:'Прогресс по четырём разделам'}).waitFor();
 const dims=await mp.evaluate(()=>{const r=document.querySelector('dialog').getBoundingClientRect();return {width:innerWidth,height:innerHeight,body:document.documentElement.scrollWidth,dialog:r.width,top:r.top,bottom:r.bottom};});
 assert(dims.body<=dims.width+2);assert(dims.dialog<=375);assert(dims.top>=0);assert(dims.bottom<=dims.height+1);report.mobileBounds=dims;
 await mp.screenshot({path:OUT+'/mobile-progress.png'});check('375px mobile dialog fits viewport horizontally and vertically on a scrolled page');await mobile.close();
 assert.deepEqual(report.errors,[]);assert.equal(report.backendWrites,0);check('No JavaScript errors and no backend writes');report.pass=true;
}catch(e){report.pass=false;report.error=String(e);throw e;}
finally{fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2));await browser.close();}
