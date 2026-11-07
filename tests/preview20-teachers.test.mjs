import test from 'node:test';
import assert from 'node:assert/strict';
import {createTeacherPilot,TEACHER_TERMS} from '../netlify/lib/preview20-teachers.js';

const HOST='https://deploy-preview-20--otto-a1.netlify.app';
const context={deploy:{context:'deploy-preview',id:'synthetic-pr20'}};
const teacher='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const student='33333333-3333-4333-8333-333333333333';
const clone=x=>structuredClone(x);
const req=(method='GET',endpoint='/api/teacher',body,headers={})=>new Request(HOST+endpoint,{method,headers:{origin:HOST,...headers,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
function setup(){
 let as=teacher,adminAuthenticated=false,clock=Date.parse('2026-10-22T12:00:00Z'),seq=0;
 const rows=new Map();
 const store={
  async get(key){return clone(rows.get(key)?.data??null)},
  async getWithMetadata(key){const e=rows.get(key);return e?{data:clone(e.data),etag:String(e.etag)}:null},
  async setJSON(key,data,opts={}){const old=rows.get(key);
   if(opts.onlyIfNew&&old)return {modified:false};
   if(opts.onlyIfMatch&&String(old?.etag)!==opts.onlyIfMatch)return {modified:false};
   rows.set(key,{data:clone(data),etag:++seq});return {modified:true};
  },
  async *list({prefix}){yield {blobs:[...rows.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}}
 };
 const pilot=createTeacherPilot({openStore:()=>store,readUser:()=>as?{sub:as}:null,readAdmin:()=>adminAuthenticated?{login:'synthetic-admin'}:null,verifyIdentity:async()=>true,
  verifyTelegram:()=>null,sessionSecret:()=>'test-secret',now:()=>clock});
 return {pilot,store,rows,as:x=>as=x,admin:x=>adminAuthenticated=x,advance:ms=>clock+=ms,now:()=>clock};
}
test('role isolation and preview-only routing',async()=>{
 const f=setup();
 assert.equal((await f.pilot.teacher(req(),{deploy:{context:'production',id:'main'}})).status,404);
 assert.equal((await f.pilot.admin(req(),context)).status,401);
 f.as(null);assert.equal((await f.pilot.teacher(req(),context)).status,401);
});
test('teacher gets unique referral, first touch wins, self referral rejected',async()=>{
 const f=setup();
 const teacherReg=await f.pilot.teacher(req('POST','/api/teacher',{action:'register',name:'Учитель 1',termsAccepted:true,termsVersion:TEACHER_TERMS}),context);
 assert.equal(teacherReg.status,200);
 const a=(await teacherReg.json()).partner.code;
 assert.match(a,/^OT-[A-Z2-9]{12}$/);
 assert.equal((await f.pilot.capture(req('GET','/api/teacher-referral?code='+a),context)).status,403);
 f.as(student);
 const first=await f.pilot.capture(req('GET','/api/teacher-referral?code='+a),context);
 assert.equal(first.status,200);
 const cookie=first.headers.get('set-cookie').split(';')[0];
 const linked=await f.pilot.linkVerifiedUser(req('GET','/',undefined,{cookie}),context,student,new Date(f.now()).toISOString());
 assert.equal(linked.linked,true);
 assert.equal((await f.pilot.linkVerifiedUser(req('GET','/',undefined,{cookie}),context,student,new Date(f.now()).toISOString())).linked,false);
 const owner=await f.store.get('s/'+student);assert.equal(owner.partnerId,teacher);
 f.as(other);const reg=await f.pilot.teacher(req('POST','/api/teacher',{action:'register',name:'Учитель 2',termsAccepted:true,termsVersion:TEACHER_TERMS}),context);
 const b=(await reg.json()).partner.code;
 f.as(student);
 const second=await f.pilot.capture(req('GET','/api/teacher-referral?code='+b),context);
 assert.equal(second.status,200);
 const repeated=await f.pilot.linkVerifiedUser(req('GET','/',undefined,{cookie:second.headers.get('set-cookie').split(';')[0]}),context,student,new Date(f.now()).toISOString());
 assert.equal(repeated.linked,false);
 assert.equal((await f.store.get('s/'+student)).partnerId,teacher);
});
test('expired 30 day referral never binds and signed cookie cannot be forged',async()=>{
 const f=setup(),name='Учитель 1';
 const reg=await f.pilot.teacher(req('POST','/api/teacher',{action:'register',name,termsAccepted:true,termsVersion:TEACHER_TERMS}),context);
 const code=(await reg.json()).partner.code;
 f.as(student);const click=await f.pilot.capture(req('GET','/api/teacher-referral?code='+code),context);
 const signed=click.headers.get('set-cookie').split(';')[0];
 assert.equal((await f.pilot.linkVerifiedUser(req('GET','/',undefined,{cookie:signed+'tamper'}),context,student,new Date(f.now()).toISOString())).linked,false);
 f.advance(31*86400000);
 assert.equal((await f.pilot.linkVerifiedUser(req('GET','/',undefined,{cookie:signed}),context,student,new Date(f.now()).toISOString())).linked,false);
});
test('only confirmed synthetic payments earn fixed RUB 500 once, with reversal and failed payouts',async()=>{
 const f=setup();
 await f.store.setJSON('p/'+teacher,{id:teacher,code:'OT-ABCDEFGHJKLM',name:'Teacher',rateBps:2000,blocked:false,demo:true},{onlyIfNew:true});
 const id='test:fake-learner';
 await f.store.setJSON('s/'+id,{studentId:id,partnerId:teacher,studentAlias:'Псевдоним',linkedAt:new Date(f.now()).toISOString()});
 const payload={paymentId:'test_unique_12345678',userId:id,amountMinor:150000,currency:'RUB',isTest:true,environment:'test',entitlementConfirmed:true,providerStatus:'succeeded'};
 assert.equal((await f.pilot.recordVerifiedPayment({...payload,entitlementConfirmed:false})).credited,false);
 const first=await f.pilot.recordVerifiedPayment(payload);assert.equal(first.credited,true);assert.equal(first.commission.commissionMinor,50000);
 const again=await f.pilot.recordVerifiedPayment(payload);assert.equal(again.duplicate,true);
 const partner=await f.store.get('p/'+teacher);partner.rateBps=1000;await f.store.setJSON('p/'+teacher,partner);
 const next=await f.pilot.recordVerifiedPayment({...payload,paymentId:'test_unique_87654321'});
 assert.equal(next.commission.commissionMinor,50000);
 assert.equal(next.commission.kind,'renewal');
 const failed=await f.pilot.payoutSimulation(teacher,'failure');assert.equal(failed.payout.status,'failed');
 const stats=await f.pilot.stats(partner);assert.equal(stats.pendingMinor,100000);
 assert.equal((await f.pilot.reverseTestPayment('test_unique_12345678','refund')).reversed,true);
 const reversed=await f.pilot.stats(partner);assert.equal(reversed.pendingMinor,50000);
});

test('verified referral click -> new registration -> synthetic confirmed payment -> fixed credit',async()=>{
 const f=setup();
 const reg=await f.pilot.teacher(req('POST','/api/teacher',{action:'register',name:'Учитель 1',termsAccepted:true,termsVersion:TEACHER_TERMS}),context);
 assert.equal(reg.status,200);
 assert.equal((await reg.clone().json()).partner.rewardMinor,50000);
 const code=(await reg.json()).partner.code;
 f.as(student);
 const click=await f.pilot.capture(req('GET','/api/teacher-referral?code='+code),context);
 assert.equal(click.status,200);
 const signed=click.headers.get('set-cookie').split(';')[0];
 const linked=await f.pilot.linkVerifiedUser(req('GET','/',undefined,{cookie:signed}),context,student,new Date(f.now()).toISOString());
 assert.equal(linked.linked,true);
 const input={paymentId:'test_verified_referral_001',userId:student,amountMinor:150000,currency:'RUB',isTest:true,environment:'test',entitlementConfirmed:true,providerStatus:'succeeded'};
 assert.equal((await f.pilot.recordVerifiedPayment({...input,isTest:false})).credited,false);
 const payment=await f.pilot.recordVerifiedPayment(input);
 assert.equal(payment.credited,true);
 assert.equal(payment.commission.commissionMinor,50000);
 const duplicate=await f.pilot.recordVerifiedPayment(input);
 assert.equal(duplicate.duplicate,true);
 const partner=await f.store.get('p/'+teacher);
 const stats=await f.pilot.stats(partner);
 assert.equal(stats.clicks,1);
 assert.equal(stats.registrations,1);
 assert.equal(stats.confirmedPayments,1);
 assert.equal(stats.earnedMinor,50000);
 assert.equal(JSON.stringify(stats).includes(student),false,'real user ID never reaches teacher stats');
});
test('admin demo can seed, pay and refund using hidden synthetic ID, while teacher portal cannot read it',async()=>{
 const f=setup();f.admin(true);
 const demo=await f.pilot.admin(req('POST','/api/admin-teachers',{action:'demo_partner'}),context);
 assert.equal(demo.status,200);
 const uid=[...f.rows.keys()].find(k=>/^p\/[0-9a-f-]{36}$/.test(k))?.slice(2);
 assert.ok(uid);
 const seeded=await f.pilot.admin(req('POST','/api/admin-teachers',{action:'seed_student',teacherId:uid}),context);
 assert.equal(seeded.status,200);
 const {studentId}=await seeded.json();
 assert.match(studentId,/^test:[0-9a-f-]{36}$/);
 const adminRows=await (await f.pilot.admin(req('GET','/api/admin-teachers'),context)).json();
 const row=adminRows.partners.find(x=>x.id===uid);
 assert.equal(row.rewardMinor,50000);
 assert.equal(row.people[0].syntheticStudentId,studentId);
 assert.equal(JSON.stringify(row.people).includes(teacher),false);
 f.as(uid);
 const teacherView=await (await f.pilot.teacher(req('GET','/api/teacher'),context)).json();
 assert.equal(teacherView.registered,true);
 assert.equal(teacherView.statistics.people[0].syntheticStudentId,undefined);
 assert.equal(JSON.stringify(teacherView).includes(studentId),false,'synthetic ID stays inside protected admin response');
 const body={action:'test_payment',teacherId:uid,studentId,paymentId:'test_admin_seed_000001'};
 const credited=await f.pilot.admin(req('POST','/api/admin-teachers',body),context);
 assert.equal(credited.status,200);
 assert.equal((await credited.json()).result.commission.commissionMinor,50000);
 assert.equal((await f.pilot.admin(req('POST','/api/admin-teachers',body),context)).status,409,'repeated payment cannot be counted twice');
 assert.equal((await f.pilot.admin(req('POST','/api/admin-teachers',{action:'set_rate',teacherId:uid,rateBps:2000}),context)).status,400,'percentage commission cannot be enabled');
 const after=await (await f.pilot.admin(req('GET','/api/admin-teachers'),context)).json();
 assert.equal(after.partners[0].pendingMinor,50000);
 const refund=await f.pilot.admin(req('POST','/api/admin-teachers',{action:'refund',teacherId:uid,paymentId:body.paymentId}),context);
 assert.equal(refund.status,200);
 assert.equal((await refund.json()).result.reversed,true);
 const afterRefund=await (await f.pilot.admin(req('GET','/api/admin-teachers'),context)).json();
 assert.equal(afterRefund.partners[0].pendingMinor,0);
});
