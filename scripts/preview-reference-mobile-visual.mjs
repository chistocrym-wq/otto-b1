import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE=process.env.PREVIEW_REFERENCE_BASE||'https://deploy-preview-13--otto-a1.netlify.app/';
const SIZES=[[320,740],[360,780],[375,812],[390,844],[414,896],[1366,768],[1920,1080]];
const GENERAL=[['Алфавит','alphabet'],['Буквосочетания и звуки в немецком языке','combos'],['Числа','numbers'],['Тренировка чисел на слух','numberListening'],['Артикли','articles'],['Построение предложений','sentence']];
const SMART_IDS=['pronouns','conjugation','modals','nouns','prepositions','questions','verbTable','nounTable'];
const SAVED=JSON.stringify(SMART_IDS);
const now='2026-10-09T00:00:00Z';
const profile={name:'Visual QA',contactType:'email',contact:'visual@example.com',contactVerified:true,authStatus:'verified',gender:'female',learningMode:'direct',createdAt:now,updatedAt:now,onboardingCompleted:true};
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',deviceScaleFactor:1});
const reply=(route,data)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
await context.route('**/api/**',r=>reply(r,{}));
await context.route('**/api/session*',r=>reply(r,{authenticated:true,userId:'reference-visual-e2e'}));
await context.route('**/api/profile',r=>reply(r,{authenticated:true,userId:'reference-visual-e2e',profile}));
await context.route('**/api/account-access',r=>reply(r,{authenticated:true,userId:'reference-visual-e2e',serverNow:new Date().toISOString(),trialActive:true,trialEndsAt:'2026-10-30T00:00:00Z',subscriptionActive:false,hasTrainingAccess:true}));
await context.route('**/api/legal-consent',r=>reply(r,{accepted:true,documentVersion:'2026-09-23-v1'}));
await context.route('**/api/state',r=>reply(r,{authenticated:true,userId:'reference-visual-e2e',state:{'otto-reference-smart-cards-v1':SAVED}}));
await context.route('**/api/progress',r=>reply(r,{authenticated:true,progress:{},activity:[]}));
await context.route('**/api/support-summary',r=>reply(r,{unreadCount:0,latestTicketId:null}));
await context.addInitScript(()=>{
  localStorage.clear();sessionStorage.clear();
  localStorage.setItem('otto-preview-app-mode-v2:reference-visual-e2e','training');
  localStorage.setItem('otto-preview-app-mode-v2:local','training');
});
mkdirSync('reference-visual-artifacts',{recursive:true});
const failures=[],report=[],screens=[],jsErrors=[];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function snapshot(page,width,tag){
  const short='reference-visual-artifacts/'+width+'-'+tag+'.jpg';
  const buffer=await page.screenshot({path:short,type:'jpeg',quality:48,animations:'disabled'});
  screens.push(short);
  if(([320,390,414].includes(width)&&['combos','numbers','numberListening','writtenTopic','oralTopic'].includes(tag))||(width===1366&&tag==='combos')||(width===1920&&tag==='numbers')){
    console.log('REFERENCE_SCREENSHOT_'+width+'_'+tag+' '+buffer.toString('base64'));
  }
}
async function focus(page,selector){
  await page.locator(selector).first().evaluate(el=>{
    const container=el.closest('main');
    if(container){
      const a=el.getBoundingClientRect(),b=container.getBoundingClientRect();
      container.scrollTop+=a.top-b.top-28;
    }
  });
  await pause(100);
}
async function metrics(page,width,section){
  const data=await page.evaluate(()=>{
    const all=[...document.querySelectorAll('.otto-reference-overlay :is(.otto-reference-table, .otto-reference-combo-table)')];
    const rect=e=>{const r=e.getBoundingClientRect();return{w:Math.round(r.width),h:Math.round(r.height),left:Math.round(r.left),right:Math.round(r.right)}};
    const tables=all.map(el=>{
      const rows=[...el.querySelectorAll('tbody tr')];
      const heights=rows.slice(0,8).map(r=>Math.round(r.getBoundingClientRect().height));
      const heads=[...el.querySelectorAll('thead th')].map(x=>({text:x.textContent,rect:rect(x)}));
      const t=el.querySelector('table');
      const audios=[...el.querySelectorAll('tbody button[aria-label^="Озвучить"]')].slice(0,5);
      return{type:el.classList.contains('otto-reference-combo-table')?'combos':el.getAttribute('data-columns')+'col',
        count:rows.length,w:el.clientWidth,scrollWidth:el.scrollWidth,tableWidth:Math.round(t.getBoundingClientRect().width),
        rowHeights:heights,heads,audioHeights:audios.map(b=>Math.round(b.getBoundingClientRect().height))};
    });
    const practice=document.querySelector('.otto-reference-number-listening');
    const practiceImage=practice?.querySelector('.otto-scene');
    const practiceTitle=practice?.querySelector('h2');
    const practiceInfo=practice?{otto:practiceImage?rect(practiceImage):null,title:practiceTitle?rect(practiceTitle):null}:null;
    const title=document.querySelector('.otto-reference-combo-toggle > button > span');
    let titleInfo=null;
    if(title){
      const textNode=[...title.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
      let lines=[];
      if(textNode){const range=document.createRange();range.selectNodeContents(textNode);lines=[...range.getClientRects()].map(r=>Math.round(r.top));}
      titleInfo={text:title.textContent,rect:rect(title),lines:[...new Set(lines)].length,hyphens:getComputedStyle(title).hyphens};
    }
    const a1=[...document.querySelectorAll('.otto-reference-overlay span.whitespace-nowrap')].find(el=>el.textContent.includes('A1'));
    const a1rect=a1?rect(a1):null;
    const overlay=document.querySelector('.otto-reference-overlay'),panel=overlay?.querySelector('main');
    const heads=[...document.querySelectorAll('.otto-reference-overlay :is(h1,h2,h3)')].slice(0,20).map(x=>({text:x.textContent?.trim().slice(0,70),rect:rect(x)}));
    return{width:innerWidth,overlay:overlay?rect(overlay):null,panelWidth:panel?.clientWidth,documentScrollWidth:document.documentElement.scrollWidth,tables,titleInfo,a1rect,heads,practiceInfo};
  });
  report.push({width,section,...data});
  if(data.documentScrollWidth>width+3)failures.push({width,section,type:'document-overflow',scroll:data.documentScrollWidth});
  for(const t of data.tables){
    if(t.type==='2col'||t.type==='3col'||t.type==='combos'){
      if(t.scrollWidth>t.w+3)failures.push({width,section,type:'table-horizontal-scroll',table:t.type,scroll:t.scrollWidth,available:t.w});
    }
    if(t.type==='2col'&&width<=414){
      const isSmart=section.startsWith('smart-');
      const max=isSmart?185:67;
      if(t.rowHeights.slice(0,5).some(h=>h>max))failures.push({width,section,type:'tall-two-column-row',heights:t.rowHeights,threshold:max});
    }
    if(t.type==='combos'&&width<=414){
      if(t.rowHeights.slice(0,4).some(h=>h>195))failures.push({width,section,type:'tall-combo-row',heights:t.rowHeights});
    }
  }
  if(section==='numberListening'&&width<=414){
    if(!data.practiceInfo?.otto||data.practiceInfo.otto.w>96||!data.practiceInfo.title||data.practiceInfo.title.w<175){
      failures.push({width,section,type:'number-practice-otto-or-title-overflow',actual:data.practiceInfo});
    }
  }
  if(section==='combos'&&width<=414){
    if(!data.titleInfo||data.titleInfo.rect.w<185||data.titleInfo.lines>3||data.titleInfo.hyphens==='auto')failures.push({width,section,type:'broken-long-heading',actual:data.titleInfo});
  }
  if(section==='home'&&width<=414&&data.a1rect){
    if(data.a1rect.w<48)failures.push({width,section,type:'orphan-a1',rect:data.a1rect});
  }
  return data;
}
async function enterSection(page,name){
  const target=page.getByRole('button',{name,exact:true});
  if(!(await target.isVisible())){
    await page.getByRole('button',{name:/Общая база немецкого языка A1/}).click();
  }
  await target.click();
}
async function back(page){
  await page.getByRole('button',{name:'К справочнику'}).first().click();
}
for(const [width,height] of SIZES){
  const page=await context.newPage();
  page.setDefaultTimeout(8000);
  await page.setViewportSize({width,height});
  page.on('pageerror',e=>jsErrors.push({width,error:e.message}));
  try{
    const nav=page.locator('.otto-bottom-nav');
    await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
    let booted=false;
    for(let tick=0;tick<160;tick++){
      if(await nav.isVisible()){booted=true;break}
      const tour=page.locator('[data-otto-tour]');
      if(await tour.isVisible()){
        const skip=page.getByRole('button',{name:'Пропустить',exact:true});
        if(await skip.isVisible()){
          // The initial tour can close concurrently as the session hydrates.
          // A vanished tour is not a missed click; a still-open tour remains an error.
          try{await skip.click({timeout:2000})}catch(error){if(await tour.isVisible().catch(()=>false))throw error}
        }
      }
      const chooser=page.getByRole('button',{name:/Мне нужен только тренажёр/});
      if(await chooser.isVisible())await chooser.click();
      const defer=page.getByRole('button',{name:'Посмотреть позже',exact:true});
      if(await defer.isVisible())await defer.click();
      const legacy=page.getByRole('button',{name:'Продолжить',exact:true});
      if(await legacy.isVisible())await legacy.click();
      await page.waitForTimeout(250);
    }
    if(!booted){
      const diagnostic=await page.evaluate(()=>({
        headings:[...document.querySelectorAll('h1,h2,h3')].slice(0,8).map(x=>x.textContent?.trim()),
        buttons:[...document.querySelectorAll('button')].slice(0,12).map(x=>x.textContent?.trim()),
        text:document.body.innerText.slice(0,500)
      }));
      throw new Error('No trainer navigation after 40 seconds: '+JSON.stringify(diagnostic));
    }
    await page.getByRole('button',{name:'Открыть Справочник OTTO'}).click();
    await page.locator('.otto-reference-overlay').waitFor();
    await metrics(page,width,'home');
    for(const [name,key] of GENERAL){
      await enterSection(page,name);
      await metrics(page,width,key);
      if(key==='combos'){
        await focus(page,'.otto-reference-combo-toggle');
        await snapshot(page,width,'combos');
      }
      if(key==='numbers'){
        await focus(page,'.otto-reference-table[data-columns="2"]');
        await snapshot(page,width,'numbers');
      }
      if(key==='numberListening'){
        await focus(page,'.otto-reference-number-listening');
        await snapshot(page,width,'numberListening');
        const start=page.locator('.otto-reference-number-listening').getByRole('button',{name:'Начать тренировку',exact:true});
        await start.click();
        if(!(await page.getByLabel('Введите услышанное число').isVisible())){
          failures.push({width,section:key,type:'number-listening-input-not-visible'});
        }
        await metrics(page,width,'numberListening-active');
      }
      await back(page);
    }
    for(const label of ['Письменная часть экзамена','Устная часть экзамена']){
      await page.getByRole('button',{name:label,exact:true}).click();
      await metrics(page,width,label);
      const opts=page.locator('.otto-reference-overlay aside button');
      const num=await opts.count();
      for(let i=0;i<num;i++){
        await opts.nth(i).click();
        await metrics(page,width,label+'-'+i);
        if(width<1024){
          const returnButton=page.getByRole('button',{name:'Назад к темам',exact:true});
          if(!(await returnButton.isVisible().catch(()=>false))||(await opts.first().isVisible().catch(()=>false))){
            failures.push({width,section:label+'-'+i,type:'topic-not-a-separate-mobile-screen'});
          }
          if(i===0&&[320,390,414].includes(width)){
            await snapshot(page,width,label==='Письменная часть экзамена'?'writtenTopic':'oralTopic');
          }
          await returnButton.click();
          if(!(await opts.first().isVisible().catch(()=>false))){
            failures.push({width,section:label+'-'+i,type:'topic-back-list-not-visible'});
          }
        }
      }
      await back(page);
    }
    await page.locator('.otto-reference-overlay-header').getByRole('button',{name:/Мои умные карточки/}).click();
    const smart=page.locator('.otto-reference-overlay main');
    for(const title of ['Личные местоимения','Спряжение глаголов','Модальные глаголы','Существительные','Предлоги','Вопросы','Таблица глаголов','Таблица существительных']){
      const btn=smart.getByRole('button',{name:title,exact:true}).first();
      if(await btn.count()){
        await btn.click();
        await metrics(page,width,'smart-'+title);
        if(title==='Предлоги'&&[320,390,414].includes(width)){
          await focus(page,'.otto-reference-smartcard-embedded .otto-reference-table[data-columns="2"]');
          await snapshot(page,width,'smart-prepositions');
        }
        await btn.click();
      }
    }
    console.log('REFERENCE_VIEWPORT_OK '+width+' '+report.filter(x=>x.width===width).length+' screens; defects '+failures.filter(x=>x.width===width).length);
  }catch(error){
    failures.push({width,section:'navigation',type:'navigation-error',message:String(error).slice(0,550)});
    console.log('REFERENCE_VIEWPORT_FAILED '+width+' '+String(error).slice(0,800));
  }finally{await page.close()}
}
await context.close();await browser.close();
console.log('REFERENCE_VISUAL_REPORT_BEGIN');
console.log(JSON.stringify({head:process.env.GITHUB_SHA,report,failures,jsErrors,screens},null,2));
console.log('REFERENCE_VISUAL_REPORT_END');
if(failures.length||jsErrors.length||report.length<140)process.exitCode=1;

// Preview 13 navigation update: run existing production-build and visual QA checks.

// Verify the News A1 navigation TypeScript correction in Preview 13.

// Recheck resolved Sprechen overlay callback props with the existing CI build gate.
