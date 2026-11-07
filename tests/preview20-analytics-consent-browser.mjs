import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const HOST='https://deploy-preview-20--otto-a1.netlify.app';
const mime=p=>p.endsWith('.html')?'text/html':p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.png')?'image/png':p.endsWith('.webp')?'image/webp':'application/octet-stream';

async function makeContext(browser){
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const starts=[];
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.origin!==HOST)return route.abort();
  const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(u.pathname.startsWith('/api/')){
   if(u.pathname==='/api/preview20-journey'){
    if(req.method()==='GET')return send({enabled:true});
    const body=JSON.parse(req.postData()||'{}');
    if(body.action==='start'){
     starts.push(body);
     return send({ok:true,id:'2026-10-20_1792500000000_00000000-0000-4000-8000-000000000041',token:'a'.repeat(64),scope:'qa-deploy',expiresAt:Date.now()+86400000});
    }
    if(body.action==='events')return send({ok:true,acceptedIds:(body.events||[]).map(e=>e.id),capped:false,scope:'qa-deploy',linked:false});
    return send({ok:true});
   }
   if(u.pathname==='/api/session')return send({authenticated:false},401);
   if(u.pathname==='/api/account-access')return send({authenticated:false,hasTrainingAccess:false},401);
   return send({ok:false,code:'not_authenticated'},401);
  }
  const rel=u.pathname==='/'?'index.html':decodeURIComponent(u.pathname).replace(/^\/+/,''),full=path.resolve('dist',rel);
  if(!full.startsWith(path.resolve('dist')+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile())return route.fulfill({status:404,body:''});
  return route.fulfill({status:200,contentType:mime(rel),body:fs.readFileSync(full)});
 });
 return {context,starts};
}

const browser=await chromium.launch({headless:true});

{
 const {context,starts}=await makeContext(browser);
 const page=await context.newPage();
 await page.goto(HOST+'/');
 await page.getByRole('dialog',{name:'Настройки аналитики'}).waitFor();
 assert.equal(starts.length,0,'journal must not start before user choice');
 await page.getByRole('button',{name:'Только необходимое'}).click();
 await page.waitForTimeout(250);
 assert.equal(starts.length,0,'necessary-only must not start journey journal');
 assert.equal(await page.getByRole('dialog',{name:'Настройки аналитики'}).count(),0);
 await context.close();
}

{
 const {context,starts}=await makeContext(browser);
 const page=await context.newPage();
 await page.goto(HOST+'/');
 await page.getByRole('dialog',{name:'Настройки аналитики'}).waitFor();
 await page.getByRole('button',{name:'Разрешить аналитику'}).click();
 await page.waitForFunction(()=>localStorage.getItem('otto-preview20-analytics-choice-v1')==='allow');
 await page.waitForTimeout(400);
 assert.equal(starts.length,1,'allow must start exactly one journey');
 assert.equal(starts[0].action,'start');
 assert.equal(starts[0].consent,true);
 assert.equal(starts[0].consentVersion,'preview20-journey-v2');
 assert.equal(await page.getByRole('dialog',{name:'Настройки аналитики'}).count(),0);
 const second=await context.newPage();
 await second.goto(HOST+'/');
 await second.waitForTimeout(350);
 assert.equal(starts.length,1,'a second visit in the same browser must not start another detailed journey');
 await context.close();
}

await browser.close();
console.log('PASS analytics banner: no pre-choice journal, necessary-only stays off, first allowed visit starts once');
