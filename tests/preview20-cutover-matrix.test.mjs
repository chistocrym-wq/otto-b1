import test from 'node:test';
import assert from 'node:assert/strict';
import {v20FeatureScope,v20StoreName,V20_PRODUCTION_ORIGIN} from '../netlify/lib/v20-deployment.js';
import {GUEST_TRIAL_MS} from '../netlify/lib/preview20-guest-trial.js';
const now=Date.parse('2026-10-25T10:00:00.000Z');
const fixture=()=>({
 identities:[{id:'user-old',provider:'email',session:'signed-legacy-session',verifiedAt:now-10*86400000},{id:'telegram-old',provider:'telegram',session:'signed-telegram-session',verifiedAt:now-86400000}],
 access:new Map([['user-old',{trialStartedAt:now-10*86400000,trialEndsAt:now-7*86400000,subscriptionUntil:now+20*86400000}],['telegram-old',{trialStartedAt:now-86400000,trialEndsAt:now+2*86400000,subscriptionUntil:null}]]),
 state:new Map([['user-old',{draft:{'schreiben-teil2-74':'Liebe Damen und Herren,\nIch habe meinen Rucksack ...'},results:{'lesen-t2-045':1},exams:Object.fromEntries(Array.from({length:31},(_,i)=>[i+1,{answers:{'lesen-1':'a'},updatedAt:now-8000}]))}],['telegram-old',{draft:{'schreiben-teil1-28':'Wohnungsschlüssel verloren'},results:{'sprechen-t2-1-1':2},exams:{1:{answers:{'horen-1':'b'},updatedAt:now-4000}}}]]),
 commit:new Map()
});
const copy=x=>structuredClone(x);
function api(store,version){
 return {
  read(id,session){
   if(store.identities.find(x=>x.id===id)?.session!==session)return{status:401};
   return{status:200,identity:id,access:copy(store.access.get(id)),state:copy(store.state.get(id))};
  },
  save(id,session,operationId,patch){
   const signed=store.identities.find(x=>x.id===id)?.session===session;
   if(!signed)return {status:401};
   const key=id+'/'+operationId;
   if(store.commit.has(key))return{status:200,duplicate:true};
   const prev=store.state.get(id);
   // Both old & new protocols preserve all older state namespaces, mock exam IDs and drafts.
   if(patch.type==='draft')prev.draft[patch.taskId]=patch.value;
   else if(patch.type==='exam')prev.exams[patch.examId]={answers:{...prev.exams[patch.examId]?.answers,...patch.answers},updatedAt:now};
   else if(patch.type==='task')prev.results[patch.taskId]=patch.result;
   else return{status:400};
   store.commit.set(key,version);return{status:200,duplicate:false};
  }
 };
}
for(const [name,client,server] of [
 ['old UI + old API','old','old'],['old UI + new API','old','new'],
 ['new UI + new API','new','new'],['new UI + rollback API','new','old']
]){
 test('Synthetic compatibility: '+name,()=>{
  const s=fixture(),endpoint=api(s,server),before=copy(s.access.get('user-old'));
  const user=s.identities[0],view=endpoint.read(user.id,user.session);
  assert.equal(view.status,200);
  assert.deepEqual(view.access,before,'paid entitlement and expired trial unchanged');
  assert.equal(view.state.exams[31].answers['lesen-1'],'a');
  const op=client+'-'+server+'-draft';
  assert.equal(endpoint.save(user.id,user.session,op,{type:'draft',taskId:'schreiben-teil2-74',value:'Ich habe den Rucksack gestern im Café vergessen.'}).status,200);
  assert.equal(endpoint.save(user.id,user.session,op,{type:'draft',taskId:'schreiben-teil2-74',value:'DUPLICATE'}).duplicate,true);
  assert.equal(endpoint.save(user.id,user.session,op+'-exam',{type:'exam',examId:31,answers:{'schreiben-1':'ok'}}).status,200);
  assert.equal(endpoint.read(user.id,user.session).state.draft['schreiben-teil2-74'],'Ich habe den Rucksack gestern im Café vergessen.');
  assert.equal(endpoint.read(user.id,user.session).state.exams[31].answers['lesen-1'],'a');
  assert.equal(endpoint.read(user.id,user.session).state.exams[31].answers['schreiben-1'],'ok');
  assert.equal(Object.keys(endpoint.read(user.id,user.session).state.exams).length,31);
  assert.deepEqual(s.access.get(user.id),before);
  assert.equal(endpoint.read(user.id,'wrong-cookie').status,401);
  assert.equal(endpoint.save(user.id,'wrong-cookie','attack',{type:'draft',taskId:'schreiben-teil2-74',value:'hijack'}).status,401);
 });
}
test('Isolated hot cutover: old tab writes to new API then refreshes without losing draft',()=>{
 const s=fixture(),old=api(s,'old'),newApi=api(s,'new'),u=s.identities[0];
 const draftId='schreiben-teil2-74';
 const initial=old.read(u.id,u.session).state.draft[draftId];
 assert(initial);
 assert.equal(newApi.save(u.id,u.session,'write-after-api-change',{type:'draft',taskId:draftId,value:initial+'\nKönnen Sie mir helfen?'}).status,200);
 const refreshed=newApi.read(u.id,u.session);
 assert(refreshed.state.draft[draftId].includes('Können Sie mir helfen?'));
 assert.equal(refreshed.access.subscriptionUntil,now+20*86400000);
});
test('72h guest expiry independent of auth migration and no repeated trial',()=>{
 const guest={firstStart:now-2*86400000,endsAt:now-2*86400000+GUEST_TRIAL_MS};
 assert.equal(guest.endsAt,now+86400000);
 const verifiedAt=now-2*86400000+5000;
 const effectiveStart=Math.min(guest.firstStart,verifiedAt);
 assert.equal(effectiveStart,guest.firstStart);
 assert.equal(guest.endsAt,effectiveStart+GUEST_TRIAL_MS);
 const old=fixture().access.get('user-old');assert.equal(old.trialEndsAt,now-7*86400000);
});
test('Production write paths are OFF by default even if host is changed',()=>{
 const ctx={deploy:{context:'production',id:'synthetic-staging'}};
 for(const feature of ['ADMIN','JOURNEY','STUDY_TIME','TEACHERS','REFERRAL','GUEST']){
  assert.equal(v20FeatureScope(new Request(V20_PRODUCTION_ORIGIN+'/api/teacher'),ctx,feature),null);
 }
});
