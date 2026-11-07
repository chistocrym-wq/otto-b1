// Synthetic acceptance only: ALL requests intercepted, local built files, no live credentials.
// Every Telegram POST is simulated here; no real user can receive a test message.
import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fixtureRows,users,SUBJECT} from './readable-admin-fixture.mjs';

const HOST='https://deploy-preview-20--otto-a1.netlify.app';
const OUT='artifacts/readable-admin/telegram';fs.mkdirSync(OUT,{recursive:true});
const report={synthetic:true,checks:[],mockedPosts:[],realBackendWrites:0,blockedExternal:0,unexpectedRequests:[],errors:[]};
const mark=text=>{report.checks.push(text);console.log('PASS',text);};
const testUsers=users.map((u,i)=>({...u,telegram_id:i===0?'1111222233':null,email:i===1?'synthetic@example.test':null}));
const mime=p=>p.endsWith('.html')?'text/html':p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.png')?'image/png':'application/octet-stream';
const browser=await chromium.launch({headless:true});
function initialMode(){return {authorized:true,getFailure:false,sendKind:'ok',lastSentAt:null,postCount:0,getCount:0};}
async function createContext(viewport,mode){
 const context=await browser.newContext({viewport});
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin!==HOST){report.blockedExternal++;return route.abort();}
  const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(url.pathname.startsWith('/api/')){
   if(!mode.authorized)return json({authenticated:false,code:'not_authenticated'},401);
   if(url.pathname==='/api/admin-telegram-message'){
    if(req.method()==='GET'){
     mode.getCount++;
     assert.equal(url.searchParams.get('userId'),SUBJECT);
     return mode.getFailure?json({code:'telegram_message_unavailable'},503):json({ok:true,lastSentAt:mode.lastSentAt,lastStatus:null,lastError:null});
    }
    if(req.method()==='POST'){
     mode.postCount++;
     const body=req.postDataJSON();report.mockedPosts.push(body);
     assert.deepEqual(Object.keys(body).sort(),['message','userId']);assert.equal(body.userId,SUBJECT);
     assert(body.message.length>0&&body.message.length<=2000);
     await new Promise(resolve=>setTimeout(resolve,120));
     if(mode.sendKind==='blocked')return json({ok:false,lastError:'bot_blocked_or_not_started',lastStatus:'failed',lastSentAt:null},502);
     if(mode.sendKind==='cooldown')return json({code:'send_cooldown',lastSentAt:new Date().toISOString()},429);
     if(mode.sendKind==='offline')return route.abort('failed');
     if(mode.sendKind==='expired'){mode.authorized=false;return json({code:'not_authenticated'},401);}
     mode.lastSentAt=new Date().toISOString();return json({ok:true,lastSentAt:mode.lastSentAt,lastStatus:'telegram_accepted',lastError:null});
    }
   }
   if(req.method()!=='GET'){report.unexpectedRequests.push(req.method()+' '+url.pathname);return json({code:'test_denied'},405);}
   if(url.pathname==='/api/admin-auth')return json({authenticated:true,login:'synthetic-admin'});
   if(url.pathname==='/api/admin-support'){
    if(url.searchParams.get('view')==='users')return json({authenticated:true,users:testUsers});
    if(url.searchParams.get('view')==='stats')return json({authenticated:true,stats:{total_users:2,registered_today:2,open_tickets:0,waiting_support:0}});
    return json({authenticated:true,tickets:[]});
   }
   if(url.pathname==='/api/admin-state-diagnostic')return json({authenticated:true,userId:url.searchParams.get('userId'),state:fixtureRows()});
   if(url.pathname==='/api/admin-study-time')return json({ok:true,seconds:125,byModule:{otto:125},intervals:3});
   report.unexpectedRequests.push(req.method()+' '+url.pathname);return json({code:'test_unknown_route'},404);
  }
  const rel=url.pathname==='/admin'||url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).replace(/^\/+/,''),full=path.resolve('dist',rel);
  if(!full.startsWith(path.resolve('dist')+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile())return route.fulfill({status:404,body:''});
  return route.fulfill({status:200,contentType:mime(rel),body:fs.readFileSync(full)});
 });
 return context;
}
const compose=p=>p.getByRole('dialog',{name:'Написать пользователю',exact:true});
async function openFromList(page){
 await page.locator('tbody tr').first().getByRole('button',{name:'Написать',exact:true}).click();
 const d=compose(page);await d.waitFor();
 await page.waitForFunction(()=>{const nodes=[...document.querySelectorAll('dialog[open] button')];return nodes.some(n=>n.textContent==='Обновить статус'&&!n.disabled);});
 return d;
}

try{
 const anonMode=initialMode();anonMode.authorized=false;
 const anon=await createContext({width:1100,height:800},anonMode),ap=await anon.newPage();
 await ap.goto(HOST+'/admin');await ap.getByRole('heading',{name:'Вход в админ-панель'}).waitFor();
 assert.equal(await ap.getByRole('button',{name:'Написать',exact:true}).count(),0);
 mark('Anonymous visitor sees only original protected login, no compose action');await anon.close();

 const mode=initialMode(),desktop=await createContext({width:1440,height:1050},mode),page=await desktop.newPage();
 page.on('pageerror',e=>report.errors.push(String(e)));
 await page.goto(HOST+'/admin');await page.getByRole('heading',{name:'Пользователи: история и результаты'}).waitFor();
 const rows=page.locator('tbody tr');assert.equal(await rows.count(),2);
 assert.equal(await rows.first().getByRole('button',{name:'Написать',exact:true}).isEnabled(),true);
 assert.equal(await rows.nth(1).getByRole('button',{name:'Написать',exact:true}).isDisabled(),true);
 assert.match(await rows.nth(1).innerText(),/Telegram не привязан/);
 mark('Write restored beside linked user; missing Telegram displays disabled action and explanation');
 await page.screenshot({path:OUT+'/desktop-user-actions.png',fullPage:true});

 let d=await openFromList(page);assert.equal(mode.postCount,0);
 await d.getByText('Получатель: Тестовый ученик',{exact:true}).waitFor();
 assert.equal(await d.getByRole('button',{name:'Отправить',exact:true}).isDisabled(),true);
 const input=d.getByRole('textbox',{name:'Сообщение',exact:true});
 assert.equal(await input.getAttribute('maxlength'),'2000');await input.fill('   ');
 assert.equal(await d.getByRole('button',{name:'Отправить',exact:true}).isDisabled(),true);
 await input.fill('S'.repeat(2000));assert.equal(await d.getByRole('button',{name:'Отправить',exact:true}).isEnabled(),true);
 mark('Recipient shown, opening never sends, whitespace blocked and 2000-character limit present');
 const message='Здравствуйте! Это тест интерфейса, без настоящей отправки.';
 await input.fill(message);await page.screenshot({path:OUT+'/desktop-compose.png',fullPage:true});
 await d.locator('form').evaluate(form=>{form.requestSubmit();form.requestSubmit();});
 await d.getByText('Telegram принял сообщение. Прочтение пользователем не подтверждается.',{exact:true}).waitFor();
 assert.equal(mode.postCount,1);assert.deepEqual(report.mockedPosts[0],{userId:SUBJECT,message});
 assert.equal(await input.inputValue(),'');assert.equal(await d.getByRole('button',{name:'Отправить',exact:true}).isDisabled(),true);
 mark('One explicit simulated POST uses correct userId; double submission blocked and success never claims read receipt');
 await input.fill('Следующее сообщение');assert.equal(await d.getByRole('button',{name:'Отправить',exact:true}).isDisabled(),true);
 await d.getByText(/Повторная отправка через/).waitFor();
 mark('After success draft is cleared and one-minute cooldown disables sending');
 await d.getByRole('button',{name:'Закрыть',exact:true}).click();

 await rows.first().getByRole('button',{name:'История и результаты',exact:true}).click();
 const card=page.getByRole('dialog',{name:'Тестовый ученик',exact:true});
 await card.getByRole('heading',{name:'Прогресс по четырём разделам'}).waitFor();
 await card.getByRole('button',{name:'Написать',exact:true}).click();
 d=compose(page);await d.waitFor();await d.getByText('Получатель: Тестовый ученик',{exact:true}).waitFor();
 assert.equal(await page.locator('dialog[open]').count(),2);
 await page.keyboard.press('Escape');await compose(page).waitFor({state:'detached'});
 assert.equal(await card.isVisible(),true);assert.equal(mode.postCount,1);
 mark('Write works inside progress card; cancelling composer returns to same card without sending');
 await card.getByRole('button',{name:'Закрыть',exact:true}).click();
 await rows.nth(1).getByRole('button',{name:'История и результаты',exact:true}).click();
 const noTelegramCard=page.getByRole('dialog',{name:'Тестовый аккаунт 2',exact:true});
 assert.equal(await noTelegramCard.getByRole('button',{name:'Написать',exact:true}).isDisabled(),true);
 await noTelegramCard.getByText('Telegram не привязан',{exact:true}).waitFor();
 await noTelegramCard.getByRole('button',{name:'Закрыть',exact:true}).click();
 mark('Email-only user has same unavailable-Telegram explanation in card, no fabricated sending route');

 mode.lastSentAt=null;mode.sendKind='blocked';d=await openFromList(page);
 await d.getByRole('textbox',{name:'Сообщение',exact:true}).fill('Тест ошибки бота');
 await d.getByRole('button',{name:'Отправить',exact:true}).click();await d.getByRole('alert').waitFor();
 assert.match(await d.getByRole('alert').innerText(),/не запустить бота или заблокировать/);
 assert.equal(await d.getByRole('textbox',{name:'Сообщение',exact:true}).inputValue(),'Тест ошибки бота');
 assert.equal(await d.getByRole('button',{name:'Отправить',exact:true}).isDisabled(),true);
 assert.equal(mode.postCount,2);await d.getByRole('button',{name:'Закрыть',exact:true}).click();
 mark('Simulated Telegram rejection gives readable reason, preserves draft and never auto-retries');

 mode.getFailure=true;d=await openFromList(page);
 await d.getByRole('textbox',{name:'Сообщение',exact:true}).fill('Тест недоступного статуса');
 assert.equal(await d.getByRole('button',{name:'Отправить',exact:true}).isDisabled(),true);
 await d.getByRole('alert').waitFor();assert.equal(mode.postCount,2);
 mode.getFailure=false;await d.getByRole('button',{name:'Обновить статус'}).click();
 await page.waitForFunction(()=>{const d=[...document.querySelectorAll('dialog[open]')].pop();return [...d.querySelectorAll('button')].some(n=>n.textContent==='Отправить'&&!n.disabled);});
 assert.equal(mode.postCount,2);await d.getByRole('button',{name:'Закрыть',exact:true}).click();
 mark('Status-fetch failure blocks unsafe send; explicit status refresh restores availability without POST');

 mode.sendKind='cooldown';d=await openFromList(page);
 await d.getByRole('textbox',{name:'Сообщение',exact:true}).fill('Тест серверного ограничения');
 await d.getByRole('button',{name:'Отправить',exact:true}).click();await d.getByRole('alert').waitFor();
 assert.match(await d.getByRole('alert').innerText(),/через минуту/);assert.equal(await d.getByRole('button',{name:'Отправить',exact:true}).isDisabled(),true);
 await d.getByRole('button',{name:'Закрыть',exact:true}).click();
 mark('Server cooldown handled, draft retained and no immediate duplicate send');

 mode.sendKind='offline';d=await openFromList(page);
 await d.getByRole('textbox',{name:'Сообщение',exact:true}).fill('Тест потери соединения');
 await d.getByRole('button',{name:'Отправить',exact:true}).click();await d.getByRole('alert').waitFor();
 assert.match(await d.getByRole('alert').innerText(),/Не удалось подтвердить отправку/);
 assert.equal(await d.getByRole('textbox',{name:'Сообщение',exact:true}).inputValue(),'Тест потери соединения');
 assert.equal(await d.getByRole('button',{name:'Отправить',exact:true}).isDisabled(),true);
 await d.getByRole('button',{name:'Закрыть',exact:true}).click();
 mark('Ambiguous network failure is not reported as delivered and does not auto-retry');

 mode.sendKind='expired';d=await openFromList(page);
 await d.getByRole('textbox',{name:'Сообщение',exact:true}).fill('Тест истёкшей сессии');
 await d.getByRole('button',{name:'Отправить',exact:true}).click();
 await page.getByRole('heading',{name:'Вход в админ-панель'}).waitFor();
 assert.equal(await compose(page).count(),0);assert.equal(await page.getByRole('button',{name:'Написать',exact:true}).count(),0);
 mark('Expired administrator session clears composer and sensitive user views');
 await desktop.close();

 const mobileMode=initialMode(),mobile=await createContext({width:375,height:812},mobileMode),mp=await mobile.newPage();
 mp.on('pageerror',e=>report.errors.push(String(e)));await mp.goto(HOST+'/admin');
 await mp.locator('tbody tr').first().getByRole('button',{name:'Написать',exact:true}).waitFor();
 d=await openFromList(mp);await d.getByRole('textbox',{name:'Сообщение',exact:true}).fill('Тестовое сообщение. Настоящей отправки нет.');
 const dims=await d.evaluate(node=>{const b=node.getBoundingClientRect();return {width:b.width,top:b.top,bottom:b.bottom,viewportWidth:innerWidth,viewportHeight:innerHeight,scrollWidth:node.scrollWidth,clientWidth:node.clientWidth};});
 assert(dims.width<=375&&dims.top>=0&&dims.bottom<=814&&dims.scrollWidth<=dims.clientWidth+2);
 await d.getByRole('button',{name:'Отправить',exact:true}).scrollIntoViewIfNeeded();
 assert.equal(await d.getByRole('button',{name:'Отправить',exact:true}).isEnabled(),true);
 await mp.screenshot({path:OUT+'/mobile-compose.png',fullPage:true});
 assert.equal(mobileMode.postCount,0);report.mobile=dims;
 mark('375px mobile Write action and compose dialog fit viewport; Send stays reachable without any test delivery');
 await mobile.close();
 assert.deepEqual(report.unexpectedRequests,[]);assert.deepEqual(report.errors,[]);assert.equal(report.realBackendWrites,0);
 mark('No JavaScript errors, unexpected API writes or live backend requests');report.pass=true;
}catch(error){report.pass=false;report.error=String(error);throw error;}
finally{fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2));await browser.close();}
