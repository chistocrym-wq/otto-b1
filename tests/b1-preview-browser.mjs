import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const server=spawn('npx',['vite','preview','--host','127.0.0.1','--port','4175'],{stdio:'pipe'});
let output='';
server.stderr.on('data',d=>output+=d.toString());
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitUntilReady(){
 for(let i=0;i<40;i++){
  try{const res=await fetch('http://127.0.0.1:4175/b1/data/lesen-1.json');if(res.ok)return;}
  catch{}
  await pause(500);
 }
 throw new Error('B1 preview server did not become ready: '+output);
}
let browser;
try{
 await waitUntilReady();
 browser=await chromium.launch({headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 const page=await browser.newPage({viewport:{width:390,height:844},permissions:['microphone']});
 const errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.goto('http://127.0.0.1:4175/',{waitUntil:'networkidle'});
 await page.getByRole('heading',{name:'OTTO B1'}).waitFor();
 await page.getByRole('button',{name:'Lesen'}).click();
 await page.getByRole('heading',{name:/Lesen · Teil 1 · №1/}).waitFor();
 const responses=page.locator('select[aria-label^="Aufgabe"]');
 await responses.first().waitFor({timeout:10000});
 if(await responses.count()===0){
   console.error('B1 reading controls missing. Main text:',(await page.locator('main').innerText()).slice(0,2000));
   console.error('B1 reading controls missing. Selects:',await page.locator('select').evaluateAll(nodes=>nodes.map(n=>({outer:n.outerHTML.slice(0,300)}))));
   console.error('B1 page JS errors:',errors);
 }
 assert.ok(await responses.count()>=1,'Expected reading answers');
 await responses.first().selectOption({index:1});
 await page.getByRole('button',{name:/Завершить попытку/}).click();
 await page.getByText(/Правильных ответов/).waitFor();
 await page.reload();
 await page.getByRole('button',{name:'Lesen'}).click();
 await page.getByText(/Правильных ответов/).waitFor();
 await page.getByRole('button',{name:'Справочник B1'}).click();
 await page.getByRole('heading',{name:'Справочник OTTO B1'}).waitFor();
 await page.getByRole('button',{name:'К заданиям'}).click();
 await page.getByRole('button',{name:'Schreiben'}).click();
 await page.getByRole('heading',{name:/Schreiben · Teil 1 · №1/}).waitFor();
 await page.getByRole('textbox',{name:'Ваш текст'}).fill('Ich habe am Samstag einen Kurs besucht. Es war sehr interessant.');
 assert.match(await page.evaluate(()=>localStorage.getItem('otto:b1:draft:local-preview:schreiben:1:1')||''),/interessant/,'Schreiben should persist immediately after input');
 await page.reload();
 await page.getByRole('button',{name:'Schreiben'}).click();
 assert.match(await page.getByRole('textbox',{name:'Ваш текст'}).inputValue(),/interessant/);
 await page.getByRole('button',{name:'Sprechen'}).click();
 await page.getByRole('button',{name:'Записать ответ'}).click();
 await page.getByRole('button',{name:'Остановить запись'}).click();
 await page.getByRole('link',{name:'Сохранить запись на устройство'}).waitFor({timeout:10000});
 const width=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
 assert.ok(width,'Horizontal overflow on mobile');
 assert.deepEqual(errors,[],'JavaScript runtime errors');
 console.log('B1 browser smoke PASS: reading, grading, drafts, reference, speaking microphone and mobile viewport');
}finally{if(browser)await browser.close();server.kill();}
