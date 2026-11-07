import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const HOST='https://deploy-preview-25--otto-a1.netlify.app';
const browser=await chromium.launch({headless:true});
const widths=[320,360,375,390,414,1280];
fs.mkdirSync('artifacts/preview25',{recursive:true});
const report=[];
try {
 for(const width of widths){
  const ctx=await browser.newContext({viewport:{width,height:850},serviceWorkers:'block'});
  let who='A',calls=0;
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await ctx.route('**/api/**',route=>{
   const req=route.request(),u=new URL(req.url());
   assert.equal(u.origin,HOST,'no Production calls');
   assert.equal(req.method(),'GET','teacher browser must not change server data');
   if(u.pathname==='/api/teacher-fx')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'Банк России',date:'27.10.2026',rates:{RUB:1,BYN:27.5,EUR:90,USD:80,KZT:.185,UZS:.0065,KGS:.9,AMD:.21}})});
   if(u.pathname==='/api/teacher'){
    calls++;
    const code=who==='A'?'OT-TEACHERA001':'OT-TEACHERB002';
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,registered:true,partner:{code,name:who,rewardMinor:50000,siteUrl:HOST+'/?ref='+code,telegramUrl:'https://t.me/ottoA1_bot'},statistics:{clicks:3,registrations:1,payments:1,earnedMinor:50000,pendingMinor:50000,paidMinor:0,people:[],commissions:[]},liveAccounting:{test:true,unavailable:false,confirmedPayments:1,registeredStudents:1,earnedMinor:50000,pendingMinor:50000,paidMinor:0,renewals:0,underReview:0,history:[{category:'first',amount_minor:50000,status:'pending'}]}})});
   }
   return route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({code:'not_authenticated'})});
  });
  await page.goto(HOST+'/teacher');
  const country=page.getByLabel('Страна преподавателя');
  await country.waitFor({timeout:30000});
  assert.equal(await country.inputValue(),'RU');
  await country.selectOption('BY');
  assert.equal(await country.inputValue(),'BY');
  who='B';
  await page.reload();
  await country.waitFor();
  assert.equal(await country.inputValue(),'RU','teacher B must not inherit teacher A Belarus');
  await country.selectOption('DE');
  who='A';
  await page.reload();
  await country.waitFor();
  assert.equal(await country.inputValue(),'BY','teacher A retains Belarus');
  assert.ok(calls>=3);
  assert.deepEqual(errors,[]);
  const geom=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(geom.scroll<=geom.width+3,'teacher horizontal overflow');
  await page.screenshot({path:'artifacts/preview25/teacher-isolation-'+width+'.png',fullPage:true});
  await ctx.close();
  report.push({width,status:'PASS'});
  console.log('PASS country isolation '+width);
 }
} finally {fs.writeFileSync('artifacts/preview25/country-report.json',JSON.stringify(report,null,2));await browser.close()}
