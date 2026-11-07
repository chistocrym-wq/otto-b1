import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const HOST='https://deploy-preview-20--otto-a1.netlify.app';
const OUT='artifacts/beginner-responsive';
fs.mkdirSync(OUT,{recursive:true});
const widths=[320,360,375,390,414,461,640,768,1024,1280,1440];
const mime=p=>p.endsWith('.html')?'text/html':p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':p.endsWith('.png')?'image/png':p.endsWith('.svg')?'image/svg+xml':'application/octet-stream';
const browser=await chromium.launch({headless:true});
const report=[];
try {
  for(const width of widths){
    const height=width===461?581:width<640?740:width<1024?780:900;
    const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});
    let guest=false,start=Date.now(),guestStarts=0;
    const unapprovedWrites=[];
    await context.route('**/*',async route=>{
      const req=route.request(),u=new URL(req.url());
      if(u.origin!==HOST)return route.abort();
      const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
      if(u.pathname.startsWith('/api/')){
        if(u.pathname==='/api/preview20-journey')return send({code:'analytics_opt_out'},403);
        if(u.pathname==='/api/preview20-guest'&&req.method()==='POST'){
          guest=true;guestStarts++;return send({guest:true,trialStartedAt:new Date(start).toISOString(),trialEndsAt:new Date(start+72*3600000).toISOString()});
        }
        if(u.pathname==='/api/account-access')return send(guest?{
          authenticated:false,guest:true,serverNow:new Date().toISOString(),trialActive:true,
          trialStartedAt:new Date(start).toISOString(),trialEndsAt:new Date(start+72*3600000).toISOString(),
          subscriptionActive:false,subscriptionUntil:null,hasTrainingAccess:true,reason:'guest_trial_active'
        }:{authenticated:false,guest:false,hasTrainingAccess:false,trialActive:false,subscriptionActive:false});
        if(u.pathname==='/api/session')return send({authenticated:false});
        if(u.pathname==='/api/profile')return send({code:'not_authenticated'},401);
        if(req.method()!=='GET')unapprovedWrites.push(req.method()+' '+u.pathname);
        return send({code:'not_authenticated'},401);
      }
      const relative=u.pathname==='/'?'index.html':decodeURIComponent(u.pathname).replace(/^\/+/,''),full=path.resolve('dist',relative);
      if(!full.startsWith(path.resolve('dist')+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile())return route.fulfill({status:404,body:''});
      return route.fulfill({status:200,contentType:mime(relative),body:fs.readFileSync(full)});
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(HOST+'/');
    await page.getByRole('button',{name:'Только необходимое'}).click();
    await page.getByRole('button',{name:/Начать знакомство с OTTO/}).click();
    await page.getByRole('button',{name:'Попробовать без регистрации'}).click();
    await page.getByRole('button',{name:'Понятно, войти гостем'}).click();
    const tour=page.locator('.otto-tour-backdrop');
    await tour.getByRole('heading',{name:'Шаг 1. Выберите режим'}).waitFor({timeout:30000});
    await tour.getByRole('button',{name:'Пропустить'}).click();
    await page.getByRole('button',{name:/Мне нужна подготовка/}).click();
    const later=page.getByRole('button',{name:'Посмотреть позже'});
    if(await later.count())await later.click();
    const again=page.locator('.otto-tour-backdrop');
    if(await again.count())await again.getByRole('button',{name:'Пропустить'}).click();
    const hub=page.getByTestId('otto-study-base-menu');
    await hub.waitFor({timeout:30000});
    const noviceButton=hub.getByRole('button',{name:'Как лучше всего заниматься новичку'});
    assert.equal(await noviceButton.isEnabled(),true,'beginner link enabled');
    await noviceButton.click();
    const beginner=page.getByTestId('otto-beginner-study-plan');
    await beginner.waitFor();
    await beginner.getByRole('heading',{name:'Как лучше всего заниматься новичку'}).waitFor();
    assert.equal(await beginner.locator('ol > li').count(),4,'exactly four training steps');
    await beginner.getByText('Написав 20 писем',{exact:false}).waitFor();
    const metrics=await page.evaluate(()=>{
      const rect=el=>el?.getBoundingClientRect();
      const hero=rect(document.querySelector('[data-testid="otto-beginner-hero-grid"]'));
      const grid=document.querySelector('[data-testid="otto-beginner-guide-grid"]');
      const [reference,smart]=[...grid.children].map(rect);
      const steps=[...document.querySelectorAll('[data-testid="otto-beginner-steps-grid"] > li')].map(rect);
      const otto=document.querySelector('[data-testid="otto-beginner-hero-grid"] img');
      const nav=rect(document.querySelector('.otto-preview-learning-mode .otto-bottom-nav'));
      const scroll=document.querySelector('.otto-preview-learning-mode .otto-inner-screen');
      return {
        horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2,
        heroWidth:hero?.width,guide:[reference,smart].map(x=>({top:x.top,bottom:x.bottom,left:x.left,right:x.right,width:x.width})),
        steps:steps.map(x=>({top:x.top,left:x.left,right:x.right,bottom:x.bottom})),
        mascotVisible:otto?getComputedStyle(otto).display!=='none':false,
        navTop:nav?.top,navBottom:nav?.bottom,
        scrollHeight:scroll?.scrollHeight,scrollClient:scroll?.clientHeight
      };
    });
    assert.equal(metrics.horizontalOverflow,false,'no horizontal overflow '+width);
    assert(metrics.scrollHeight>metrics.scrollClient,'scrollable long guide '+width);
    assert(metrics.navBottom<=height+2,'bottom navigation within screen '+width);
    const [ref,smart]=metrics.guide,st=metrics.steps,near=(a,b)=>Math.abs(a-b)<=3;
    if(width>=768){
      assert(near(ref.top,smart.top)&&smart.left>=ref.right-3,'reference + smart cards horizontal on tablet/desktop '+width+': '+JSON.stringify(metrics.guide));
    }else{
      assert(smart.top>=ref.bottom-3,'reference + smart cards stack readably on phone '+width);
    }
    if(width>=1280){
      assert(st.every(x=>near(x.top,st[0].top)),'four horizontal cards across desktop '+width);
      assert(st.every((x,i)=>i===0||x.left>=st[i-1].right-3),'desktop cards do not overlap '+width);
    }else if(width>=640){
      assert(near(st[0].top,st[1].top)&&near(st[2].top,st[3].top)&&st[2].top>=st[0].bottom-3,'two-card rows on tablet '+width);
    }else{
      assert(st.every((x,i)=>i===0||x.top>=st[i-1].bottom-3),'one legible card per row on phone '+width);
    }
    if(width>=640)assert.equal(metrics.mascotVisible,true,'OTTO beside the intro on wider screens '+width);
    await page.screenshot({path:path.join(OUT,'beginner-top-'+width+'.png')});
    const scroller=page.locator('.otto-preview-learning-mode .otto-inner-screen');
    await scroller.evaluate(el=>{el.scrollTop=el.scrollHeight});
    const ending=await page.evaluate(()=>{
      const article=document.querySelector('[data-testid="otto-beginner-study-plan"]')?.getBoundingClientRect();
      const nav=document.querySelector('.otto-preview-learning-mode .otto-bottom-nav')?.getBoundingClientRect();
      return {articleBottom:article?.bottom,navTop:nav?.top,horizontal:document.documentElement.scrollWidth>innerWidth+2};
    });
    assert.equal(ending.horizontal,false,'no horizontal overflow after scrolling '+width);
    assert(ending.articleBottom<=ending.navTop+3,'last buttons remain visible above bottom dock '+width+': '+JSON.stringify(ending));
    await beginner.getByRole('button',{name:'Начать с писем'}).waitFor();
    await page.screenshot({path:path.join(OUT,'beginner-bottom-'+width+'.png')});
    await beginner.getByRole('button',{name:'К Учебной базе'}).last().click();
    await hub.waitFor();
    assert.equal(await hub.getByRole('button').count(),7,'original menu preserved');
    assert.equal(guestStarts,1,'only one guest start');
    assert.deepEqual(unapprovedWrites.filter(v=>v!=='POST /api/access-status'),[],'no writes except read-only legacy access-status lookup');
    assert.deepEqual(errors,[],'no runtime JS errors '+width);
    report.push({width,height,status:'PASS',layout:width>=1280?'4-column timeline':width>=768?'2-column content':width>=640?'2-column steps':'mobile stacked',horizontalOverflow:false});
    await context.close();
  }
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));
  console.log('PASS beginner horizontal responsive layout',widths.join(', '));
}finally{await browser.close();}
