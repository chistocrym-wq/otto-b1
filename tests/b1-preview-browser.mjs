import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4175'],{stdio:'pipe'});
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
 await page.getByRole('heading',{name:'Сегодня — ещё шаг к B1'}).waitFor();
 await page.getByRole('navigation',{name:'Основная навигация'}).waitFor();
 await page.getByRole('button',{name:'Начать тренировку'}).waitFor();
 await page.getByRole('button',{name:'Hören'}).click();
 await page.getByTestId('b1-task-catalog').waitFor();
 await page.getByTestId('otto-task-1').getByText('Ещё не выполнялось').waitFor();
 assert.equal(await page.getByTestId('otto-task-1').count(),1);
 await page.getByRole('button',{name:'Начать задание №1'}).click();
 await page.getByRole('heading',{name:'Аудирование B1'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Подготовить аудио'}).count(),0,'Hören must never demand manual audio preparation');
 assert.equal(await page.locator('.b1-inline-audio audio').count(),1,'Only one audio player per active Hören card');
 await page.waitForFunction(()=>Boolean(document.querySelector('.b1-inline-audio audio')?.getAttribute('src')),null,{timeout:15000});
 await page.getByRole('button',{name:/Проверить ответы/}).click();
 await page.getByRole('button',{name:'Следующая аудиозапись'}).click();
 const q1=page.getByRole('group',{name:'Aufgabe 1'});
 const q2=page.getByRole('group',{name:'Aufgabe 2'});
 await q1.waitFor();
 await q1.getByRole('button',{name:/Richtig/}).click();
 await q2.getByRole('button',{name:/a\)/}).click();
 await page.getByRole('button',{name:/Проверить ответы/}).click();
 await page.getByText(/Верных ответов: /).waitFor();
 assert.equal(await page.locator('.b1-inline-audio audio').count(),1,'Only the active Hören audio should be visible');
 await page.getByRole('button',{name:'К списку заданий'}).click();
 await page.getByRole('button',{name:'Teil 2'}).click();
 await page.getByRole('button',{name:'Начать задание №1'}).click();
 await page.getByRole('group',{name:'Aufgabe 11'}).waitFor();
 assert.equal(await page.locator('.b1-inline-audio audio').count(),1,'Hören Teil 2 should show exactly one player');
 assert.equal(await page.getByRole('button',{name:'Подготовить аудио'}).count(),0);
 await page.getByRole('button',{name:'К списку заданий'}).click();
 await page.getByRole('button',{name:'На главную'}).click();
 await page.getByRole('button',{name:'Lesen'}).click();
 await page.getByTestId('b1-task-catalog').waitFor();
 await page.getByRole('button',{name:'Начать задание №1'}).click();
 await page.getByRole('heading',{name:/Lesen · Teil 1 · №1/}).waitFor();
 await page.getByRole('button',{name:'Показать перевод'}).waitFor();
 const beforeTranslation=await page.locator('.b1-reading-body .b1-line-translation').count();
 assert.equal(beforeTranslation,0,'Translation must be hidden until requested');
 await page.getByRole('button',{name:'Показать перевод'}).click();
 assert.ok(await page.locator('.b1-reading-body .b1-line-translation').count()>0,'German exam must show existing Russian translations on demand');
 await page.getByRole('button',{name:'Скрыть перевод'}).click();
 assert.equal(await page.locator('.b1-reading-body .b1-line-translation').count(),0,'Hide translation must work');
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
 assert.ok(await page.locator('.b1-reading-body .b1-line-review').count()>0,'Finished attempt must show explanations');
 await page.reload();
 await page.getByRole('button',{name:'Lesen'}).click();
 await page.getByTestId('otto-task-1').getByText(/Есть ошибки|Правильно/).waitFor();
 await page.getByTestId('otto-task-1').click();
 await page.getByText(/Правильных ответов/).waitFor();
 await page.getByRole('button',{name:'Справочник B1'}).click();
 await page.getByRole('heading',{name:'Справочник OTTO B1'}).waitFor();
 await page.getByRole('button',{name:'К заданиям'}).click();
 await page.getByRole('button',{name:'На главную'}).click();
 await page.getByRole('button',{name:'Schreiben'}).click();
 await page.getByTestId('b1-task-catalog').waitFor();
 await page.getByRole('button',{name:'Начать задание №1'}).click();
 await page.getByRole('heading',{name:/Schreiben · Teil 1 · №1/}).waitFor();
 await page.getByRole('textbox',{name:'Ваш текст'}).fill('Ich habe am Samstag einen Kurs besucht. Es war sehr interessant.');
 assert.match(await page.evaluate(()=>localStorage.getItem('otto:b1:draft:local-preview:schreiben:1:1')||''),/interessant/,'Schreiben should persist immediately after input');
 await page.reload();
 await page.getByRole('button',{name:'Schreiben'}).click();
 await page.getByRole('button',{name:'Продолжить задание №1'}).click();
 await page.waitForFunction(()=>document.querySelector('#b1essay')?.value.includes('interessant'),null,{timeout:10000});
 assert.match(await page.getByRole('textbox',{name:'Ваш текст'}).inputValue(),/interessant/);
 await page.getByRole('button',{name:'К списку заданий'}).click();
 await page.getByRole('button',{name:'На главную'}).click();
 await page.getByRole('button',{name:'Sprechen'}).click();
 await page.getByRole('button',{name:'Начать задание №1'}).click();
 await page.getByRole('button',{name:'Записать ответ'}).click();
 await page.getByRole('button',{name:'Остановить запись'}).click();
 await page.getByRole('link',{name:'Сохранить запись на устройство'}).waitFor({timeout:10000});
 const width=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
 assert.ok(width,'Horizontal overflow on mobile');
 assert.deepEqual(errors,[],'JavaScript runtime errors');
 console.log('B1 browser smoke PASS: Hören A1-style player/choices, reading, grading, drafts, reference, speaking microphone and mobile viewport');
}finally{if(browser)await browser.close();server.kill();}
