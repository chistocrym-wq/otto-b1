import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdminSessionCookie} from '../netlify/lib/admin-auth.js';
import state from '../netlify/functions/admin-state-diagnostic.js';
import readiness from '../netlify/functions/admin-otto30-readiness.js';
import {checkExamAccess} from '../netlify/lib/otto30-private.js';
import {getOtto30Config,getOtto30InventoryReadOnlyConfig} from '../netlify/lib/otto30-storage-config.js';
const origin='https://otto-a1.netlify.app',context={deploy:{context:'production',id:'isolated-only'}};
const keys=['OTTO_ADMIN_LOGIN','OTTO_ADMIN_SESSION_SECRET'];const prior=new Map(keys.map(k=>[k,process.env[k]]));
process.env.OTTO_ADMIN_LOGIN='qa-admin';process.env.OTTO_ADMIN_SESSION_SECRET='isolated-test-only';
function req(route,cookie){return new Request(origin+route,{headers:cookie?{cookie}:{}});}
test('Production learner history requires current signed admin session',async()=>{
 assert.equal((await state(req('/api/admin-state-diagnostic?userId=12345678-1234-4123-8123-123456789012'),context)).status,401);
 const cookie=createAdminSessionCookie('qa-admin').split(';')[0];
 assert.equal((await state(req('/api/admin-state-diagnostic?userId=bogus',cookie),context)).status,400);
 assert.equal((await state(req('/api/admin-state-diagnostic?userId=12345678-1234-4123-8123-123456789012',cookie),{deploy:{context:'unknown'}})).status,404);
 const valid=await state(req('/api/admin-state-diagnostic?userId=12345678-1234-4123-8123-123456789012',cookie),context);
 assert.equal(valid.status,503,'no live database in synthetic tests');
 assert.equal(valid.headers.get('cache-control'),'private, no-store, max-age=0');
});
test('admin-only inventory rejects anonymous and fails closed without production config',async()=>{
 assert.equal((await readiness(req('/api/admin-otto30-readiness'),context)).status,401);
 const cookie=createAdminSessionCookie('qa-admin').split(';')[0];
 const response=await readiness(req('/api/admin-otto30-readiness',cookie),context);
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.ready,false);
 assert.equal(data.configured,false);
});
test('exam entitlement error distinguishes unavailable database from forbidden',async()=>{
 const route=req('/api/otto30-private?op=status'),config={studentFlag:'TEST_STUDENT_ENABLED'};
 const make=extra=>checkExamAccess(route,context,{resolveConfig:()=>config,readSignedSession:()=>({sub:'student-1'}),isOwner:()=>false,getFlag:()=> 'enabled',...extra});
 assert.equal((await make({checkTraining:async()=>new Response('',{status:503})})).status,503);
 assert.equal((await make({checkTraining:async()=>{throw new Error('timeout')}})).status,503);
 assert.equal((await make({checkTraining:async()=>new Response('',{status:403})})).status,403);
 assert.equal((await make({checkTraining:async()=>null})).access.session.sub,'student-1');
 assert.equal((await make({getFlag:()=>''})).status,403);
 assert.equal((await checkExamAccess(route,context,{resolveConfig:()=>null})).status,403);
});
test('diagnostic accepts only current admin login with signed cookie',async()=>{
 const cookie=createAdminSessionCookie('qa-admin').split(';')[0];
 process.env.OTTO_ADMIN_LOGIN='other-admin';
 try{assert.equal((await state(req('/api/admin-state-diagnostic?userId=12345678-1234-4123-8123-123456789012',cookie),context)).status,401);}
 finally{process.env.OTTO_ADMIN_LOGIN='qa-admin';}
});
test('pre-release diagnostic resolves stores without releasing student exams',async()=>{
 const names=['SITE_ID','OTTO30_PRODUCTION_HOST','OTTO30_PRODUCTION_RELEASE_APPROVED','OTTO30_PRODUCTION_STUDENT_ACCESS'];
 const old=new Map(names.map(n=>[n,process.env[n]]));
 try{
  process.env.SITE_ID='6cd5980e-1876-40f3-85e4-b227362b4d3d';
  process.env.OTTO30_PRODUCTION_HOST='otto-a1.netlify.app';
  delete process.env.OTTO30_PRODUCTION_RELEASE_APPROVED;
  delete process.env.OTTO30_PRODUCTION_STUDENT_ACCESS;
  const original=req('/api/admin-otto30-readiness');
  assert.equal(getOtto30Config(original),null);
  const config=getOtto30InventoryReadOnlyConfig(original,context);
  assert.equal(config?.keyStore,'otto30-production-private-score-keys-v1');
  assert.equal(config?.candidateStore,'otto30-production-owner-private-v1');
  const preview=new Request('https://deploy-preview-25--otto-a1.netlify.app/api/admin-otto30-readiness');
  assert.equal(getOtto30Config(preview),null);
  assert.equal(getOtto30InventoryReadOnlyConfig(preview,{deploy:{context:'deploy-preview'}})?.mode,'preview25-inventory-read-only');
  assert.equal(getOtto30InventoryReadOnlyConfig(preview,context),null);
  const cookie=createAdminSessionCookie('qa-admin').split(';')[0];
  assert.equal((await readiness(new Request(origin+'/api/admin-otto30-readiness',{method:'POST',headers:{cookie}}),context)).status,405);
  process.env.SITE_ID='invalid';
  assert.equal(getOtto30InventoryReadOnlyConfig(original,context),null);
 }finally{for(const [n,v] of old){if(v===undefined)delete process.env[n];else process.env[n]=v;}}
});
process.on('exit',()=>{for(const [k,v] of prior){if(v===undefined)delete process.env[k];else process.env[k]=v;}});
