import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createSessionToken,readSession} from '../netlify/lib/otto-session.js';
import stateHandler from '../netlify/functions/state.js';
import accountAccess from '../netlify/functions/account-access.js';

// No production credentials, database, account or payment is accessed by this test.
const USER_A='11111111-1111-4111-8111-111111111111';
const USER_B='22222222-2222-4222-8222-222222222222';
const uidA=encodeURIComponent(USER_A);
const EXAM_KEY='otto-a1-archive-exam-v2:'+uidA+':exam-01:';
const EXTRA=[
 'schreiben-locked-form','schreiben-locked-letter',
 'deadline-horen','deadline-lesen','deadline-schreiben','deadline-sprechen'
];
const now=Date.now();
const paidUntil=new Date(now+9*86400000).toISOString();
const verifiedAt=new Date(now-5*86400000).toISOString();
const trainingRows=new Map();
const initialState={
 'otto-a1-hoeren-progress-v2':'{"score":10}',
 'otto-a1-lesen-progress-v2':'{"score":8}',
 'otto-a1-learning-profile-v1':'{"errors":["der Bahnhof"]}',
 'otto-a1-mock-attempts-v1':'[{"exam":1,"score":19}]',
 'otto-reference-smart-cards-v1':'["der Bahnhof"]',
};
trainingRows.set(USER_A,new Map(Object.entries(initialState)));
trainingRows.set(USER_B,new Map([['otto-a1-hoeren-progress-v2','{"score":2}']]));
const originalEnv=Object.fromEntries([
 'OTTO_SESSION_SECRET','OTTO_SUPABASE_URL','OTTO_SUPABASE_ANON_KEY',
 'OTTO_SUPABASE_TOKEN','OTTO_DEVELOPER_USER_IDS'
].map(k=>[k,process.env[k]]));
const originalNetlify=globalThis.Netlify;
const originalFetch=globalThis.fetch;
const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
const cookie=user=>'otto_session='+createSessionToken(user);
const request=(user,method='GET',body,path='/api/state')=>new Request('https://preview13.example.invalid'+path,{
 method,headers:{cookie:cookie(user),...(method==='GET'?{}:{'Content-Type':'application/json'})},
 ...(method==='GET'?{}:{body:JSON.stringify(body)})
});
const snapshot=user=>Object.fromEntries(trainingRows.get(user)||[]);
async function fakeSupabase(input,init={}){
 const url=new URL(String(input));
 assert.equal(url.origin,'https://otto-supabase-fixture.invalid','no real database requests');
 const method=init.method||'GET';
 if(url.pathname==='/rest/v1/user_state'){
  if(method==='GET'){
   const user=(url.searchParams.get('user_id')||'').replace(/^eq\./,'');
   return reply(Object.entries(snapshot(user)).map(([state_key,value])=>({
    state_key,state_value:{raw:value},updated_at:new Date(now).toISOString()
   })));
  }
  if(method==='POST'){
   const row=JSON.parse(String(init.body));
   trainingRows.get(row.user_id)?.set(row.state_key,row.state_value.raw);
   return new Response(null,{status:204});
  }
  if(method==='DELETE'){
   const user=(url.searchParams.get('user_id')||'').replace(/^eq\./,'');
   const key=(url.searchParams.get('state_key')||'').replace(/^eq\./,'');
   trainingRows.get(user)?.delete(key);
   return new Response(null,{status:204});
  }
 }
 if(url.pathname==='/rest/v1/user_profiles'){
  return reply([{name:'Existing OTTO student',gender:'female',learning_mode:'direct',
   onboarding_completed:true,created_at:verifiedAt,updated_at:verifiedAt}]);
 }
 if(url.pathname==='/rest/v1/user_identities'){
  return reply([{provider:'email',provider_user_id:'fixture@example.invalid',
    verified_at:verifiedAt}]);
 }
 if(url.pathname==='/rest/v1/rpc/get_subscription_entitlement'){
  const row=JSON.parse(String(init.body||'{}'));
  assert.ok([USER_A,USER_B].includes(row.p_user_id));
  return reply(row.p_user_id===USER_A?[{subscription_until:paidUntil,updated_at:verifiedAt}]:[]);
 }
 throw new Error('Unexpected Supabase endpoint '+url.pathname+' '+method);
}
function makeDevice(user,seed={}){
 const network={online:true,stateGetFails:false,writesFail:false};
 class Storage{
  constructor(){this.map=new Map(Object.entries(seed))}
  getItem(key){return this.map.has(String(key))?this.map.get(String(key)):null}
  setItem(key,value){this.map.set(String(key),String(value))}
  removeItem(key){this.map.delete(String(key))}
  clear(){this.map.clear()}
  get length(){return this.map.size}
  key(index){return [...this.map.keys()][index]??null}
 }
 const listeners=new Map();
 let retryCallback=null;
 const storage=new Storage();
 const browserWindow={
  localStorage:storage,
  addEventListener:(type,cb)=>{listeners.set(type,[...(listeners.get(type)||[]),cb])},
  dispatchEvent:event=>{for(const cb of listeners.get(event.type)||[])cb(event);return true},
  setInterval:callback=>{retryCallback=callback;return 1},
  setTimeout:()=>1,
  clearTimeout:()=>{},
 };
 const fetchClient=async(path,init={})=>{
  if(!network.online)throw new Error('temporary network outage');
  if(path==='/api/session')return reply({authenticated:true,userId:user});
  assert.equal(path,'/api/state');
  if((init.method||'GET')==='GET'&&network.stateGetFails)return reply({code:'state_load_failed'},503);
  if((init.method||'GET')!=='GET'&&network.writesFail)return reply({code:'state_save_failed'},503);
  const req=new Request('https://preview13.example.invalid'+path,{
   method:init.method||'GET',headers:{cookie:cookie(user),...init.headers},
   ...(init.body?{body:init.body}:{})
  });
  return stateHandler(req);
 };
 const compiled=ts.transpileModule(readFileSync(new URL('../src/lib/serverStateSync.ts',import.meta.url),'utf8'),{
  fileName:'serverStateSync.ts',
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
 }).outputText;
 const exports={};
 const snapshotModule={exports:{}};
 const snapshotCode=ts.transpileModule(readFileSync(new URL('../src/lib/taskResultsServerSnapshot.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(snapshotCode,{exports:snapshotModule.exports,module:snapshotModule,window:browserWindow,Event:class{constructor(type){this.type=type}}});
 const snapshotExports=snapshotModule.exports;
 vm.runInNewContext(compiled,{
  exports,module:{exports},require:id=>{
   if(id==='./accessClient')return {bootstrapTelegramSession:async()=>({authenticated:network.online,userId:user})};
   if(id==='./previewDiagnostics')return {recordOttoStateSyncDiagnostic:()=>{}};
   if(id==='./taskResultsServerSnapshot')return snapshotExports;
   throw Error('Unexpected import '+id);
  },
  Storage,window:browserWindow,navigator:network,fetch:fetchClient,AbortController,
  CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},
  console,
 },{filename:'compiled-serverStateSync.js'});
 return {storage,network,snapshot:snapshotExports,logout:exports.clearLocalUserStateForLogout,initialize:exports.initializeServerStateSync,
  pending:()=>JSON.parse(storage.getItem('otto-state-pending-v2:'+encodeURIComponent(user))||'{}'),
  dispatchOnline:()=>browserWindow.dispatchEvent({type:'online'}),
  dispatchFocus:()=>browserWindow.dispatchEvent({type:'focus'}),
  tickRetry:()=>retryCallback?.(),
 };
}
const yieldIO=()=>new Promise(resolve=>setImmediate(resolve));
async function eventually(predicate,message,retry=()=>{}){
 for(let n=0;n<120;n++){
  if(predicate())return;
  retry();
  await yieldIO();
 }
 assert.fail(message);
}

test('Preview 13 retains legacy signed login, paid entitlement, every progress key, and resumes queued writes',async()=>{
 try{
  process.env.OTTO_SESSION_SECRET='otto-preview13-local-state-regression-only';
  process.env.OTTO_SUPABASE_URL='https://otto-supabase-fixture.invalid';
  process.env.OTTO_SUPABASE_ANON_KEY='local-fixture-anon';
  process.env.OTTO_SUPABASE_TOKEN='local-fixture-token';
  delete process.env.OTTO_DEVELOPER_USER_IDS;
  globalThis.Netlify={env:{get:key=>process.env[key]||''}};
  globalThis.fetch=fakeSupabase;

  // The legacy Production cookie is still accepted by unchanged session validation.
  assert.equal(readSession(request(USER_A)).sub,USER_A);
  const access=await accountAccess(request(USER_A,'GET',null,'/api/account-access'),
    {deploy:{context:'deploy-preview'}});
  assert.equal(access.status,200);
  const entitlement=await access.json();
  assert.equal(entitlement.userId,USER_A);
  assert.equal(entitlement.subscriptionActive,true);
  assert.equal(entitlement.hasTrainingAccess,true);
  assert.equal(entitlement.trialActive,false);

  // Real server handler: only same-user archive keys and expected suffixes pass.
  for(const suffix of EXTRA){
   const key=EXAM_KEY+suffix;
   const response=await stateHandler(request(USER_A,'PUT',{key,value:'saved-'+suffix}));
   assert.equal(response.status,200,'accept '+key);
   assert.equal(snapshot(USER_A)[key],'saved-'+suffix);
  }
  const allowedLegacy=await stateHandler(request(USER_A,'PUT',{
   key:'otto-a1-mock-attempts-v1',value:initialState['otto-a1-mock-attempts-v1']
  }));
  assert.equal(allowedLegacy.status,200);
  for(const invalid of [
   'otto-a1-archive-exam-v2:'+encodeURIComponent(USER_B)+':exam-01:schreiben-locked-form',
   EXAM_KEY+'deadline-admin',EXAM_KEY+'private-answers',EXAM_KEY+'deadline-horen:extra',
   'otto-a1-archive-exam-v2:'+uidA+':exam-31:deadline-lesen'
  ]){
   assert.equal((await stateHandler(request(USER_A,'PUT',{key:invalid,value:'blocked'}))).status,400,
    'deny foreign/invalid key '+invalid);
  }
  assert.equal((await stateHandler(request(USER_A,'DELETE',{key:EXAM_KEY+'deadline-schreiben'}))).status,200);
  assert.equal(snapshot(USER_A)[EXAM_KEY+'deadline-schreiben'],undefined);
  assert.equal((await stateHandler(request(USER_A,'PUT',{key:EXAM_KEY+'deadline-schreiben',value:'restored'}))).status,200);

  // Simulate first launch of new Preview code while old Production local data exists.
  // Auth offline: local progress, mock #1, errors, cards and session ownership survive.
  const legacy={...initialState,'otto-user-profile-owner-v1':USER_A};
  const first=makeDevice(USER_A,legacy);
  first.network.online=false;
  await first.initialize();
  for(const [key,value] of Object.entries(legacy))assert.equal(first.storage.getItem(key),value,
   'offline bootstrap must preserve '+key);
  first.network.online=true;
  first.network.stateGetFails=true;
  await first.initialize();
  for(const [key,value] of Object.entries(legacy))assert.equal(first.storage.getItem(key),value,
   '503 /api/state must not erase '+key);
  assert.equal(first.storage.getItem('otto-state-owner-v2'),null,
   'do not claim or clear legacy storage before verified /api/state');

  // Recovery with the SAME signed account restores existing server state.
  first.network.stateGetFails=false;
  await first.initialize();
  for(const [key,value] of Object.entries(initialState)){
   assert.equal(first.storage.getItem(key),value,'restore original progress '+key);
  }
  assert.equal(first.storage.getItem('otto-state-owner-v2'),USER_A);

  // Failed upload queues two new locked/timer writes instead of dropping the later item.
  const form=EXAM_KEY+'schreiben-locked-form';
  const deadline=EXAM_KEY+'deadline-lesen';
  first.network.writesFail=true;
  first.storage.setItem(form,'{"locked":true}');
  first.storage.setItem(deadline,'300000');
  await eventually(()=>Object.keys(first.pending()).length===2,'both writes remain queued');
  assert.equal(snapshot(USER_A)[form],'saved-schreiben-locked-form');
  assert.equal(snapshot(USER_A)[deadline],'saved-deadline-lesen');
  first.network.writesFail=false;
  first.dispatchOnline();
  await eventually(()=>snapshot(USER_A)[form]==='{"locked":true}'&&
    snapshot(USER_A)[deadline]==='300000'&&Object.keys(first.pending()).length===0,
    'reconnection drains full queue, including second key',first.tickRetry);

  // New device, existing account: all remotely persisted results recover, no registration.
  const second=makeDevice(USER_A);
  await second.initialize();
  for(const [key,value] of Object.entries(initialState)){
   assert.equal(second.storage.getItem(key),value,'recover on second device '+key);
  }
  assert.equal(second.storage.getItem(form),'{"locked":true}');
  assert.equal(second.storage.getItem(deadline),'300000');

  // Different account never receives the previous learner's local/remote records.
  const foreign=makeDevice(USER_B,{...initialState,'otto-state-owner-v2':USER_A});
  await foreign.initialize();
  assert.equal(foreign.storage.getItem('otto-a1-hoeren-progress-v2'),'{"score":2}');
  assert.equal(foreign.storage.getItem('otto-a1-mock-attempts-v1'),null);
  assert.equal(snapshot(USER_A)['otto-a1-mock-attempts-v1'],initialState['otto-a1-mock-attempts-v1']);
  assert.equal(entitlement.subscriptionUntil,paidUntil,'paid subscription expiry unchanged');

  // Future v2 data is seeded in the isolated SERVER store only, never localStorage.
  const futureKey='otto-task-results-v2:'+encodeURIComponent(USER_A)+':horen:part1';
  const futureValue=JSON.stringify({schemaVersion:2,ownerUserId:USER_A,module:'horen',
   attempts:[{attemptId:'server-attempt-1',taskId:'horen-001',score:1,total:1,at:new Date(now).toISOString()}]});
  trainingRows.get(USER_A).set(futureKey,futureValue);
  const emptyDevice=makeDevice(USER_A);
  assert.equal(emptyDevice.storage.length,0,'second device starts with empty localStorage');
  assert.equal(emptyDevice.snapshot.readVerifiedTaskResultsServerJournals(USER_A,'horen').length,0);
  await emptyDevice.initialize();
  assert.equal(emptyDevice.snapshot.readVerifiedTaskResultsServerJournals(USER_A,'horen')[0].attempts[0].attemptId,'server-attempt-1');
  assert.equal(emptyDevice.storage.getItem(futureKey),null,'v2 must remain memory-only');
  assert.equal(emptyDevice.pending()[futureKey],undefined,'v2 must not enter outbox');
  const beforeServer=snapshot(USER_A)[futureKey];
  emptyDevice.network.stateGetFails=true;
  await emptyDevice.initialize();
  assert.equal(emptyDevice.snapshot.readVerifiedTaskResultsServerJournals(USER_A,'horen').length,1,
   '503 must not erase verified in-memory history');
  emptyDevice.network.stateGetFails=false;
  trainingRows.get(USER_A).set(futureKey,JSON.stringify({schemaVersion:2,ownerUserId:USER_A,module:'horen',
   attempts:[{attemptId:'server-attempt-1',taskId:'horen-001',score:1,total:1,at:new Date(now).toISOString()},
    {attemptId:'server-attempt-2',taskId:'horen-002',score:0,total:1,at:new Date(now).toISOString()}]}));
  // Browser stays online with an open tab: scheduled retry obtains the new GET.
  emptyDevice.tickRetry();
  await eventually(()=>emptyDevice.snapshot.readVerifiedTaskResultsServerJournals(USER_A,'horen')[0]?.attempts.length===2,
   'connected GET refreshes memory-only v2 snapshot');
  const another=makeDevice(USER_A);
  await another.initialize();
  assert.equal(another.snapshot.readVerifiedTaskResultsServerJournals(USER_A,'horen')[0].attempts.length,2,
   'reload/new device must restore two events from server');
  const foreignV2=makeDevice(USER_B);
  await foreignV2.initialize();
  assert.equal(foreignV2.snapshot.readVerifiedTaskResultsServerJournals(USER_A,'horen').length,0);
  assert.equal(foreignV2.snapshot.readVerifiedTaskResultsServerJournals(USER_B,'horen').length,0);
  assert.equal(emptyDevice.storage.getItem(futureKey),null);
  assert.equal(snapshot(USER_A)[futureKey]!==undefined,true,'old client must leave future server v2 key untouched');
  emptyDevice.logout();
  assert.equal(emptyDevice.snapshot.readVerifiedTaskResultsServerJournals(USER_A,'horen').length,0,'logout clears snapshot');

  // Regression for a real old tab: verified session + owned local history,
  // but /api/state GET returns 503 during start. New work must be queued for
  // that same user, survive a reload, and reach the server after recovery.
  const offlineKey='otto-a1-hoeren-progress-v2';
  const offlineOriginal=snapshot(USER_A)[offlineKey];
  const offline=makeDevice(USER_A,{
    'otto-state-owner-v2':USER_A,
    [offlineKey]:offlineOriginal,
  });
  offline.network.stateGetFails=true;
  offline.network.writesFail=true;
  await offline.initialize();
  assert.equal(offline.storage.getItem(offlineKey),offlineOriginal,
    'state GET outage cannot clear last known local progress');
  const newOfflineScore='{"score":67,"continuedAfter503":true}';
  offline.storage.setItem(offlineKey,newOfflineScore);
  await eventually(()=>offline.pending()[offlineKey]?.value===newOfflineScore,
    'verified same-owner changes must be journaled even when GET was 503');
  assert.equal(snapshot(USER_A)[offlineKey],offlineOriginal,
    'server remains unchanged while PUT is unavailable');

  // A second reload while the server is still unavailable keeps both the
  // local answer and the durable pending outbox; no new registration needed.
  const restartDuringOutage=makeDevice(USER_A,Object.fromEntries(offline.storage.map));
  restartDuringOutage.network.stateGetFails=true;
  restartDuringOutage.network.writesFail=true;
  await restartDuringOutage.initialize();
  assert.equal(restartDuringOutage.storage.getItem(offlineKey),newOfflineScore);
  assert.equal(restartDuringOutage.pending()[offlineKey]?.value,newOfflineScore);

  offline.network.stateGetFails=false;
  offline.network.writesFail=false;
  offline.dispatchOnline();
  await eventually(()=>snapshot(USER_A)[offlineKey]===newOfflineScore&&
    Object.keys(offline.pending()).length===0,
    'recovery must save the answer from the tab opened during /api/state outage',
    offline.tickRetry);
  const verifiedReload=makeDevice(USER_A,Object.fromEntries(offline.storage.map));
  await verifiedReload.initialize();
  assert.equal(verifiedReload.storage.getItem(offlineKey),newOfflineScore,
    'successful reload must never revert the recovered work');

  // Identity must match the previous owner before any provisional binding.
  // Never attach another learner's local keys to this verified session.
  const foreignDuringOutage=makeDevice(USER_B,{
    'otto-state-owner-v2':USER_A,
    [offlineKey]:newOfflineScore,
  });
  foreignDuringOutage.network.stateGetFails=true;
  foreignDuringOutage.network.writesFail=true;
  await foreignDuringOutage.initialize();
  foreignDuringOutage.storage.setItem(offlineKey,'{"score":999}');
  assert.equal(Object.keys(foreignDuringOutage.pending()).length,0,
    'foreign-owner local edits cannot enter the new account outbox');
 }finally{
  globalThis.fetch=originalFetch;
  if(originalNetlify===undefined)delete globalThis.Netlify;else globalThis.Netlify=originalNetlify;
  for(const [k,v] of Object.entries(originalEnv))if(v===undefined)delete process.env[k];else process.env[k]=v;
 }
});
