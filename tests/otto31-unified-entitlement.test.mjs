import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSessionToken} from '../netlify/lib/otto-session.js';
import accountAccessHandler,{TRIAL_MS} from '../netlify/functions/account-access.js';
import {getExamAccess} from '../netlify/lib/otto30-private.js';
import {readCursor,saveCursor,readLegacyDone,markLegacyDone,emptyMeta,saveMeta,loadMeta,EXAM_LAST} from '../src/features/mockExams30/examSequence.ts';

const previewHost='deploy-preview-13--otto-a1.netlify.app';
const prodHost='otto-release-qa.example';
const user='otto-31-entitlement-learner';
const ctxPreview={deploy:{context:'deploy-preview'}};
const ctxProd={deploy:{context:'production'}};
const request=(host,path='/api/otto30-private?op=status',authenticated=true)=>new Request('https://'+host+path,{
 headers:authenticated?{cookie:'otto_session='+createSessionToken(user)}:{}
});
const memoryStorage=()=>{const map=new Map();return{getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),snapshot:()=>new Map(map)}};
const json=(value)=>new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json'}});

test('31 OTTO exams share trial/paid/developer rights and retain attempts across expiry',async()=>{
 const keys=[
  'OTTO_SESSION_SECRET','OTTO_SUPABASE_URL','OTTO_SUPABASE_ANON_KEY','OTTO_SUPABASE_TOKEN',
  'OTTO_DEVELOPER_USER_IDS','OTTO30_PREVIEW13_OWNER_IDS','OTTO30_PREVIEW13_STUDENT_ACCESS',
  'OTTO30_PRODUCTION_HOST','OTTO30_PRODUCTION_RELEASE_APPROVED','OTTO30_PRODUCTION_STUDENT_ACCESS','CONTEXT','SITE_ID'
 ];
 const prior=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 const originalFetch=globalThis.fetch,originalNetlify=globalThis.Netlify;
 const fixedNow=Date.now();
 const state={
  verifiedAt:new Date(fixedNow-60*1000).toISOString(),
  testUntil:null,
  liveUntil:null,
  callEnvironments:[]
 };
 const set=(key,value)=>{if(value===null)delete process.env[key];else process.env[key]=value;};
 try{
  set('OTTO_SESSION_SECRET','local-qa-31-entitlement-no-production-credentials');
  set('OTTO_SUPABASE_URL','https://fake-otto-supabase.example');
  set('OTTO_SUPABASE_ANON_KEY','fake-anon');
  set('OTTO_SUPABASE_TOKEN','fake-token');
  set('OTTO_DEVELOPER_USER_IDS',null);
  set('OTTO30_PREVIEW13_OWNER_IDS',null);
  set('OTTO30_PREVIEW13_STUDENT_ACCESS','enabled');
  set('OTTO30_PRODUCTION_HOST',prodHost);
  set('OTTO30_PRODUCTION_RELEASE_APPROVED','approved');
  set('OTTO30_PRODUCTION_STUDENT_ACCESS','enabled');
  set('CONTEXT',null); // Netlify's build CONTEXT is not available to running Functions.
  set('SITE_ID','6cd5980e-1876-40f3-85e4-b227362b4d3d');
  globalThis.Netlify={env:{get:key=>process.env[key]||''}};
  globalThis.fetch=async (source,init={})=>{
   const u=new URL(String(source));
   assert.equal(u.origin,'https://fake-otto-supabase.example','No external calls are allowed in entitlement tests');
   if(u.pathname==='/rest/v1/user_identities')return json([{verified_at:state.verifiedAt,provider:'email',provider_user_id:'fixture@example.invalid'}]);
   if(u.pathname==='/rest/v1/user_profiles')return json([{name:'Fixture',gender:'female',learning_mode:'direct',onboarding_completed:true,created_at:state.verifiedAt,updated_at:state.verifiedAt}]);
   if(u.pathname==='/rest/v1/rpc/get_subscription_entitlement'){
    const query=JSON.parse(String(init.body||'{}'));
    assert.equal(query.p_user_id,user);
    assert.ok(query.p_environment==='test'||query.p_environment==='live');
    state.callEnvironments.push(query.p_environment);
    const until=query.p_environment==='live'?state.liveUntil:state.testUntil;
    return json(until?[{subscription_until:until,updated_at:new Date(fixedNow).toISOString()}]:[]);
   }
   throw Error('Unexpected Supabase route: '+u.pathname);
  };

  const check=async(label,host,context,expected)=>{
   const response=await accountAccessHandler(request(host,'/api/account-access'),context);
   assert.equal(response.status,200,label+' account-access HTTP');
   const access=await response.json();
   assert.equal(access.authenticated,true,label+' authenticated');
   assert.equal(access.hasTrainingAccess,expected,label+' OTTO trainer');
   const exam=await getExamAccess(request(host,'/api/otto30-private?op=status'),context);
   assert.equal(Boolean(exam),expected,label+' private exam entitlement');
   if(exam)assert.equal(exam.owner,false,label+' must be a student, not an owner');
   return access;
  };
  await check('active 72h trial',previewHost,ctxPreview,true);
  state.verifiedAt=new Date(fixedNow-TRIAL_MS-60*1000).toISOString();
  state.testUntil=new Date(fixedNow+2*24*60*60*1000).toISOString();
  await check('expired trial with paid subscription',previewHost,ctxPreview,true);
  state.testUntil=new Date(fixedNow-60*1000).toISOString();
  await check('expired trial and subscription',previewHost,ctxPreview,false);

  // A denied GET/POST must not read, delete or mutate stored exam attempts.
  const {default:privateHandler}=await import('../netlify/functions/otto30-private.js');
  const {default:scoreHandler}=await import('../netlify/functions/otto30-score.js');
  for(const path of ['/api/otto30-private?op=status','/api/otto30-private?op=exam&number=1','/api/otto30-private?op=media&path=audio%2Fexam_01%2Ftask_01.mp3']){
   assert.equal((await privateHandler(request(previewHost,path),ctxPreview)).status,403,'expired GET '+path);
  }
  for(const path of ['/api/otto30-score?op=history','/api/otto30-score?op=result&exam=1']){
   assert.equal((await scoreHandler(request(previewHost,path),ctxPreview)).status,403,'expired result '+path);
  }
  const blockedPost=new Request('https://'+previewHost+'/api/otto30-score?op=begin&exam=1',{
   method:'POST',headers:{cookie:'otto_session='+createSessionToken(user),'content-type':'application/json'},body:'{}'
  });
  assert.equal((await scoreHandler(blockedPost,ctxPreview)).status,403,'expired new attempt');
  assert.equal(await getExamAccess(request(previewHost,'/api/otto30-private',false),ctxPreview),null,'anonymous forbidden');

  const storage=memoryStorage();
  assert.equal(saveCursor(storage,user,11),true);
  assert.equal(markLegacyDone(storage,user),true);
  const completed={...emptyMeta('otto-a12-10'),completed:{horen:true,lesen:true,schreiben:false,sprechen:false}};
  assert.equal(saveMeta(storage,user,completed),true);
  const before=storage.snapshot();
  // Access expiry does not clear the existing learner's local trial/exam history.
  assert.equal(readCursor(storage,user),11);
  assert.equal(readLegacyDone(storage,user),true);
  assert.equal(loadMeta(storage,user,'otto-a12-10').completed.lesen,true);
  state.testUntil=new Date(fixedNow+3*24*60*60*1000).toISOString();
  await check('renewed subscription restores identical user',previewHost,ctxPreview,true);
  assert.deepEqual(storage.snapshot(),before,'renewal must not rewrite attempt/progress state');

  // All 30 additional private exam routes use the same signed-session gate.
  // The legacy #1 remains behind the global OTTO trainer paywall.
  assert.equal(EXAM_LAST,31);
  for(let number=1;number<=30;number++){
   const res=await getExamAccess(request(previewHost,'/api/otto30-private?op=exam&number='+number),ctxPreview);
   assert.equal(res?.session.sub,user,'new exam '+(number+1)+' must use existing OTTO account');
  }
  const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
  assert.match(app,/accountAccess\.authenticated&&!accountAccess\.hasTrainingAccess/,'all modules including legacy mock #1 share app entitlement gate');

  // Subscription environment separation: Production must use live YooKassa
  // entitlements, never a test subscription from Deploy Preview.
  state.liveUntil=new Date(fixedNow-60*1000).toISOString();
  await check('test payment never grants Production access',prodHost,ctxProd,false);
  state.liveUntil=new Date(fixedNow+3*24*60*60*1000).toISOString();
  await check('paid Production subscriber',prodHost,ctxProd,true);
  assert.ok(state.callEnvironments.includes('test')&&state.callEnvironments.includes('live'));
  state.liveUntil=new Date(fixedNow-60*1000).toISOString();
  set('OTTO_DEVELOPER_USER_IDS',user);
  await check('existing developer exception',prodHost,ctxProd,true);
  set('OTTO_DEVELOPER_USER_IDS',null);

  // Release switches block unreviewed materials, not student payment plans.
  state.liveUntil=new Date(fixedNow+3*24*60*60*1000).toISOString();
  set('OTTO30_PRODUCTION_RELEASE_APPROVED',null);
  assert.equal(await getExamAccess(request(prodHost),ctxProd),null,'Production remains blocked before owner release approval');
  set('OTTO30_PREVIEW13_STUDENT_ACCESS',null);
  assert.equal(await getExamAccess(request(previewHost),ctxPreview),null,'Preview student rollout disabled unless explicitly enabled');
 }finally{
  globalThis.fetch=originalFetch;
  if(originalNetlify===undefined)delete globalThis.Netlify;else globalThis.Netlify=originalNetlify;
  for(const [key,value] of Object.entries(prior)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 }
});
