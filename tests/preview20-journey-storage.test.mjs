import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {journeyService} from '../netlify/lib/preview20-journey-service.js';
import {pruneExpiredJourneys} from '../netlify/lib/preview20-journey-retention.js';
import {CONSENT_VERSION} from '../shared/preview20-journey.js';
const HOST='https://deploy-preview-20--otto-a1.netlify.app';
const ctx=id=>({deploy:{context:'deploy-preview',id}});
const now=Date.parse('2026-10-26T08:00:00.000Z');
function fakeStore(){
 const map=new Map();let version=0;
 const clone=value=>structuredClone(value);
 return {
  map,
  async setJSON(k,data,opts={}){
   const prior=map.get(k);
   if(opts.onlyIfNew&&prior)return {modified:false};
   if(opts.onlyIfMatch&&prior?.etag!==opts.onlyIfMatch)return {modified:false};
   map.set(k,{data:clone(data),metadata:clone(opts.metadata||{}),etag:String(++version)});
   return {modified:true};
  },
  async get(k){return clone(map.get(k)?.data??null)},
  async getWithMetadata(k){const v=map.get(k);return v?clone(v):null},
  async getMetadata(k){const v=map.get(k);return v?{metadata:clone(v.metadata)}:null},
  async delete(k){map.delete(k)},
  async *list({prefix}){yield {blobs:[...map.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}}
 };
}
function request(method='GET',body,headers={}) {
 return new Request(HOST+'/api/preview20-journey',{method,headers:{origin:HOST,'content-type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});
}
test('persistent journey namespace across deployments; explicit erase truly deletes',async()=>{
 for(const path of ['netlify/functions/preview20-journey.js','netlify/functions/admin-journey.js']){
  const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
  assert.match(source,/import \{getStore\} from '@netlify\/blobs'/);
  assert.doesNotMatch(source,/getDeployStore/,'journey must survive next Netlify deploy');
 }
 const store=fakeStore();
 const p=journeyService({openStore:()=>store,readUserSession:()=>null,readAdminSession:()=>({sub:'admin'}),now:()=>now});
 const start=await p.visitor(request('POST',{action:'start',consent:true,consentVersion:CONSENT_VERSION,device:'desktop_chrome',source:'unknown'}),ctx('first-deploy'));
 assert.equal(start.status,200);
 const data=await start.json();
 const key=[...store.map.keys()][0];
 assert.equal(store.map.size,1);
 // A fresh code deployment uses the same site-wide Blob store, not a new store.
 const next=journeyService({openStore:()=>store,readUserSession:()=>null,readAdminSession:()=>({sub:'admin'}),now:()=>now+60000});
 const found=await next.admin(new Request(HOST+'/api/admin-journey?id='+data.id),ctx('second-deploy'));
 assert.equal(found.status,200);
 assert.equal((await found.json()).visit.id,data.id);
 assert.equal((await next.visitor(request('POST',{action:'erase',id:data.id},{'x-otto-journey-token':data.token}),ctx('second-deploy'))).status,200);
 assert.equal(store.map.has(key),false,'consent withdrawal physically removes all events and identity');
 assert.equal((await next.admin(new Request(HOST+'/api/admin-journey?id='+data.id),ctx('second-deploy'))).status,404);
});
test('expired journeys are not readable, sweeper removes old records without touching active ones',async()=>{
 const store=fakeStore();
 await store.setJSON('visits/2026-10-20/old',{foo:1},{metadata:{expiresAt:now-1}});
 await store.setJSON('visits/2026-10-26/current',{foo:2},{metadata:{expiresAt:now+3600000}});
 const p=journeyService({openStore:()=>store,readUserSession:()=>null,readAdminSession:()=>({sub:'admin'}),now:()=>now});
 const result=await pruneExpiredJourneys(store,{now,maxScanned:100});
 assert.deepEqual(result,{scanned:2,removed:1,failed:0,truncated:false});
 assert.equal(store.map.has('visits/2026-10-20/old'),false);
 assert.equal(store.map.has('visits/2026-10-26/current'),true);
 assert.equal((await p.visitor(request('POST',{action:'start',consent:false,consentVersion:CONSENT_VERSION}),ctx('x'))).status,400);
});
test('analytics strips free text containing OTP/email/answers; only permitted feedback category survives',async()=>{
 const {cleanEvent}=await import('../shared/preview20-journey.js');
 const e=cleanEvent({id:'00000000-0000-4000-8000-000000000041',at:new Date(now).toISOString(),kind:'feedback',
  choice:'technical',comment:'student@example.org OTP 123456 Mein Name ist ...'},now);
 assert.equal(e.choice,'technical');
 assert.equal(Object.hasOwn(e,'comment'),false);
});
