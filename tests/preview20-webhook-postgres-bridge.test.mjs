// Exercises the actual payment-webhook handler and commission service
// against a real disposable PostgreSQL instance. YooKassa verification
// and Netlify Blob reads are injected fixtures, NOT real provider calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {handlePaymentWebhook} from '../netlify/functions/payment-webhook.js';
import {createCommissionAccounting} from '../netlify/lib/preview20-commission-accounting.js';

if(process.env.PGDATABASE!=='otto_pr20_isolated')
  throw new Error('Refusing webhook integration outside disposable PR20 PostgreSQL');
const flags=['-X','-v','ON_ERROR_STOP=1','-A','-t'];
function quote(v){return "'"+String(v).replaceAll("'","''")+"'";}
function execute(query){
  const result=spawnSync('psql',[...flags,'-c',query],{encoding:'utf8',timeout:30000});
  assert.equal(result.status,0,'PostgreSQL: '+result.stderr+'\n'+query);
  return result.stdout.trim();
}
function call(name,params){
  const args=params.map(x=>x===null?'NULL':typeof x==='number'?String(x):quote(x));
  return execute('SELECT otto_a1.'+name+'('+args.join(',')+')');
}
function scalar(name,params){
  const result=call(name,params);
  return result==='t'?true:result==='f'?false:result;
}
function creditCount(paymentId){
  return Number(execute('SELECT count(*) FROM otto_a1.teacher_accounting_commissions WHERE provider_payment_id='+quote(paymentId)));
}
function status(paymentId){
  return execute('SELECT status FROM otto_a1.teacher_accounting_commissions WHERE provider_payment_id='+quote(paymentId));
}
function entitlement(student){
  return execute("SELECT subscription_until::text FROM otto_a1.subscription_entitlements WHERE user_id="+quote(student)+" AND environment='test'");
}
function createPerson(){
  const teacher=randomUUID(),student=randomUUID(),click=randomUUID();
  execute('INSERT INTO otto_a1.users(id) VALUES('+quote(teacher)+'),('+quote(student)+')');
  return {teacher,student,click};
}
function createStore(){
  const records=new Map();
  return {
    records,
    async get(key){return records.get(key)||null;},
    async setJSON(key,value){records.set(key,value);return {modified:true};},
    async *list({prefix}){yield {blobs:[...records.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))};}
  };
}
function linkFixture(store,who,{afterExistingPayment=false}={}){
  const t=Date.now();
  const code='OT-'+randomUUID().replaceAll('-','').slice(0,12).toUpperCase().replace(/[01IO]/g,'A');
  const registeredAt=new Date(t-120000).toISOString();
  const linkedAt=new Date(afterExistingPayment?t:t-15000).toISOString();
  store.records.set('p/'+who.teacher,{
    id:who.teacher,code,termsVersion:'pilot',createdAt:registeredAt
  });
  store.records.set('click/'+who.click,{
    clickId:who.click,partnerId:who.teacher,code,at:afterExistingPayment?t-10000:t-65000
  });
  store.records.set('s/'+who.student,{
    studentId:who.student,partnerId:who.teacher,clickId:who.click,linkedAt
  });
}
const rpcArgs={
  teacher_accounting_register_partner:p=>[p.p_partner_id,p.p_referral_code,p.p_terms_version,p.p_registered_at],
  teacher_accounting_link_student:p=>[p.p_student_id,p.p_partner_id,p.p_click_id,p.p_clicked_at,p.p_linked_at],
  teacher_accounting_credit_payment:p=>[p.p_environment,p.p_payment_id],
  teacher_accounting_record_refund:p=>[p.p_environment,p.p_payment_id,p.p_refund_id,p.p_amount_minor],
  teacher_accounting_partner_report:p=>[p.p_partner_id,p.p_environment],
  teacher_accounting_pending_payments:p=>[p.p_environment,p.p_limit]
};
function postgresRpc(name,params){
  assert.ok(Object.hasOwn(rpcArgs,name),'No unexpected RPC');
  const values=rpcArgs[name](params);
  if(name==='teacher_accounting_partner_report')
    return JSON.parse(call(name,values));
  if(name==='teacher_accounting_pending_payments'){
    const query='SELECT COALESCE(json_agg(t),'+quote('[]')+'::json)::text FROM otto_a1.'+
      name+'('+values.map(v=>typeof v==='number'?String(v):quote(v)).join(',')+') t';
    return JSON.parse(execute(query)).map(row => typeof row === 'string' ? {payment_id:row} : row);
  }
  return scalar(name,values);
}
function confirmSubscription(p){
  const args=[p.userId,p.environment,p.provider,p.providerPaymentId,p.paymentReference,
    p.amountMinor,p.currency,p.periodDays,p.providerStatus,p.isTest];
  const query='SELECT row_to_json(row)::text FROM otto_a1.confirm_payment_and_extend_subscription('+
    args.map(v=>typeof v==='number'||typeof v==='boolean'?String(v):quote(v)).join(',')+') row';
  const outcome=JSON.parse(execute(query));
  return {applied:outcome.applied,subscriptionUntil:outcome.subscription_until};
}
const host='https://deploy-preview-20--otto-a1.netlify.app';
const context={deploy:{context:'deploy-preview',id:'isolated-postgres-bridge'}};
const opts={OTTO_V20_COMMISSION_DB_READY:'true',OTTO_V20_COMMISSION_TEST_ENABLED:'true'};
const store=createStore();
const accounting=createCommissionAccounting({
  readEnv:name=>opts[name]||'',rpc:postgresRpc,openStore:()=>store,
  log:(code,error)=>console.error('ISOLATED_TEST_ACCOUNTING',code,error?.message)
});
function paymentObject(student,paymentId,reference){
  return {paymentId,userId:student,paymentReference:reference,
    amountMinor:150000,currency:'RUB',periodDays:30,status:'succeeded',
    test:true,environment:'test'};
}
function notify(event,id){
  return new Request(host+'/api/payment-webhook',{
    method:'POST',headers:{origin:host,'content-type':'application/json'},
    body:JSON.stringify({type:'notification',event,object:{id}})
  });
}
function paymentWebhook(record,accountingService=accounting){
  return handlePaymentWebhook(notify('payment.succeeded',record.paymentId),context,{
    verifyPaymentFn:async args=>{
      assert.equal(args.paymentId,record.paymentId);
      assert.equal(args.expectedEnvironment,'test');
      assert.equal(args.expectedAmountMinor,150000);
      return record;
    },
    confirmPaymentFn:confirmSubscription,
    commissionAccountingFn:accountingService
  });
}
function refundWebhook(paymentId,refundId,amountMinor){
  return handlePaymentWebhook(notify('refund.succeeded',refundId),context,{
    verifyRefundFn:async args=>{
      assert.equal(args.expectedEnvironment,'test');
      return {paymentId,refundId,amountMinor,test:true,environment:'test'};
    },
    commissionAccountingFn:accounting
  });
}
test('real webhook + original entitlement RPC + 500 RUB ledger, repeats, renewal, refunds',async()=>{
  const person=createPerson();
  linkFixture(store,person);
  const initial=paymentObject(person.student,'pay_'+randomUUID(),randomUUID());
  let response=await paymentWebhook(initial);
  assert.equal(response.status,200);
  assert.equal((await response.json()).applied,true);
  assert.ok(entitlement(person.student),'paid access exists in PostgreSQL');
  assert.equal(creditCount(initial.paymentId),1);
  assert.equal(status(initial.paymentId),'pending');
  const report=await accounting.report(notify('payment.succeeded',initial.paymentId),context,{partnerId:person.teacher});
  assert.equal(report.report.confirmedPayments,1);
  assert.equal(report.report.pendingMinor,50000);
  assert.ok(!JSON.stringify(report).includes(person.student),'partner report must not expose student UUID');
  const beforeRepeat=entitlement(person.student);
  const repeats=await Promise.all(Array.from({length:20},()=>paymentWebhook(initial)));
  assert.ok(repeats.every(r=>r.status===200));
  assert.equal(creditCount(initial.paymentId),1);
  assert.equal(entitlement(person.student),beforeRepeat,'repeat webhook must not extend subscription');
  const renewal=paymentObject(person.student,'pay_'+randomUUID(),randomUUID());
  response=await paymentWebhook(renewal);
  assert.equal(response.status,200);
  assert.equal(creditCount(renewal.paymentId),1);
  assert.equal(execute("SELECT category FROM otto_a1.teacher_accounting_commissions WHERE provider_payment_id="+quote(renewal.paymentId)),'renewal');
  const refundId='rf_'+randomUUID();
  response=await refundWebhook(initial.paymentId,refundId,30000);
  assert.equal(response.status,200);
  assert.equal(status(initial.paymentId),'review');
  assert.equal((await refundWebhook(initial.paymentId,refundId,30000)).status,200);
  assert.equal(Number(execute('SELECT count(*) FROM otto_a1.teacher_accounting_refunds WHERE provider_refund_id='+quote(refundId))),1);
  response=await refundWebhook(initial.paymentId,'rf_'+randomUUID(),120000);
  assert.equal(response.status,200);
  assert.equal(status(initial.paymentId),'reversed');
  assert.equal(creditCount(initial.paymentId),1,'refund never creates second commission');
  assert.ok(entitlement(person.student),'refund accounting must not revoke student access');
});
test('confirmed paid subscription survives accounting failure; manual reconciliation heals it',async()=>{
  const who=createPerson();linkFixture(store,who);
  const payment=paymentObject(who.student,'pay_'+randomUUID(),randomUUID());
  const down={...accounting,confirmedPayment:async()=>{throw new Error('isolated_accounting_outage')}};
  const first=await paymentWebhook(payment,down);
  assert.equal(first.status,200,'student access cannot depend on ledger');
  assert.ok(entitlement(who.student));
  assert.equal(creditCount(payment.paymentId),0);
  const reconciled=await accounting.reconcile(notify('payment.succeeded',payment.paymentId),context);
  assert.equal(reconciled.enabled,true);
  assert.ok(reconciled.credited>=1,'verified payment must be credited after retry');
  assert.equal(creditCount(payment.paymentId),1);
  const second=await accounting.reconcile(notify('payment.succeeded',payment.paymentId),context);
  assert.equal(second.credited,0);
  assert.equal(creditCount(payment.paymentId),1);
});
test('old unattributed account stays without commission after a payment',async()=>{
  const who=createPerson();
  const payment=paymentObject(who.student,'pay_'+randomUUID(),randomUUID());
  assert.equal((await paymentWebhook(payment)).status,200);
  assert.equal(creditCount(payment.paymentId),0);
  linkFixture(store,who,{afterExistingPayment:true}); // both referral and link were after confirmed payment
  const delayed=await accounting.reconcile(notify('payment.succeeded',payment.paymentId),context);
  assert.equal(delayed.credited,0);
  assert.equal(creditCount(payment.paymentId),0);
});
