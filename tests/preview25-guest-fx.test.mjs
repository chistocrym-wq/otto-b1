import test from 'node:test';
import assert from 'node:assert/strict';
import handler,{parseTeacherCbrXml} from '../netlify/functions/teacher-fx.js';
import {readFileSync} from 'node:fs';
const xml='<ValCurs Date="27.10.2026" name="Foreign Currency Market">'+
 [['BYN',1,'27,5000'],['EUR',1,'90,0000'],['USD',1,'80,0000'],['KZT',100,'18,5000'],['UZS',10000,'65,0000'],['KGS',100,'90,0000'],['AMD',100,'21,0000']].map(([code,nominal,value],i)=>
 '<Valute ID="V'+i+'"><CharCode>'+code+'</CharCode><Nominal>'+nominal+'</Nominal><Value>'+value+'</Value></Valute>').join('')+'</ValCurs>';
test('CBR daily XML date and nominal conversion across all nine countries',()=>{
 const data=parseTeacherCbrXml(xml);
 assert.equal(data.source,'Банк России');assert.equal(data.date,'27.10.2026');
 assert.deepEqual(data.rates,{RUB:1,BYN:27.5,EUR:90,USD:80,KZT:.185,UZS:.0065,KGS:.9,AMD:.21});
 const countries={RU:'RUB',BY:'BYN',DE:'EUR',AT:'EUR',KZ:'KZT',UZ:'UZS',KG:'KGS',AM:'AMD',US:'USD'};
 for(const c of Object.keys(countries)){
  const rate=data.rates[countries[c]];
  assert.equal(Number.isFinite(500/rate),true,c);
 }
 assert.ok(Math.abs(500/data.rates.KZT-2702.7027027)<.01,'nominal 100');
 assert.ok(Math.abs(500/data.rates.UZS-76923.076923)<.01,'nominal 10000');
 assert.equal(data.rates.RUB,1,'fixed RUB obligation');
});
test('no fictitious rate if XML date or core rate is invalid',()=>{
 assert.throws(()=>parseTeacherCbrXml(xml.replace('Date="27.10.2026"','Date="99.10.2026"')),/invalid_rate_date/);
 assert.throws(()=>parseTeacherCbrXml(xml.replace('Date="27.10.2026"','Date=""')),/invalid_rate_date/);
 assert.throws(()=>parseTeacherCbrXml(xml.replace('<CharCode>EUR</CharCode>','<CharCode>XXX</CharCode>')),/missing_core_rates/);
 assert.throws(()=>parseTeacherCbrXml('<html>Not rates</html>'),/invalid_xml/);
});
test('read-only endpoint response dates real CBR quote; failure is no-store 503',async()=>{
 const old=globalThis.fetch;
 try{
  globalThis.fetch=async()=>new Response(xml,{status:200});
  let response=await handler(new Request('https://preview.test/api/teacher-fx'));
  assert.equal(response.status,200);
  let body=await response.json();assert.equal(body.rates.KZT,.185);assert.equal(body.date,'27.10.2026');
  globalThis.fetch=async()=>new Response('unavailable',{status:503});
  response=await handler(new Request('https://preview.test/api/teacher-fx'));
  assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store');
  body=await response.json();assert.equal(body.rates,undefined);
  response=await handler(new Request('https://preview.test/api/teacher-fx',{method:'POST'}));
  assert.equal(response.status,405);
 }finally{globalThis.fetch=old;}
});
test('guest-only limits do not alter signed-in module continuation',()=>{
 const dir=new URL('../src/components/modules/',import.meta.url);
 for(const name of ['ListeningModule.tsx','ReadingModule.tsx','WritingModule.tsx','SpeakingModule.tsx']){
  const text=readFileSync(new URL(name,dir),'utf8');
  assert.match(text,/guest=false/,name+' signed-in default');
  assert.match(text,/guest\?2:undefined/,name+' guest-only task list limit');
 }
 const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
 assert.equal((app.match(/guest=\{accountAccess\.guest===true\}/g)||[]).length,5,'four modules plus mock exam receive guest identity');
 for(const module of ['ReadingModule','ListeningModule','WritingModule','SpeakingModule'])
  assert.match(app,new RegExp('<'+module+' guest=\\{accountAccess\\.guest===true\\}'),module+' must restrict only guests');
 const list=readFileSync(new URL('../src/components/common/TaskList.tsx',import.meta.url),'utf8');
 assert.match(list,/onClick=\{limited\?\(\)=>onSelect\(next\):onContinue\}/,'signed-in Continue handler unchanged');
});
