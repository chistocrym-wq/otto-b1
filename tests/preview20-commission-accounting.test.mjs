import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommissionAccounting,commissionGate} from '../netlify/lib/preview20-commission-accounting.js';

const origin='https://deploy-preview-20--otto-a1.netlify.app';
const req=new Request(origin+'/api/payment-webhook',{method:'POST'});
const context={deploy:{context:'deploy-preview',id:'preview20'}};
const env=name=>({
 OTTO_V20_COMMISSION_DB_READY:'true',
 OTTO_V20_COMMISSION_TEST_ENABLED:'true'
})[name]||'';
const student='33333333-3333-4333-8333-333333333333';
const partner='11111111-1111-4111-8111-111111111111';
const click='44444444-4444-4444-8444-444444444444';
test('commission is denied by default and in unapproved contexts',()=>{
 assert.equal(commissionGate(req,context),null);
 assert.equal(commissionGate(req,{deploy:{context:'production',id:'production'}},{readEnv:env}),null);
 assert.equal(commissionGate(req,context,{readEnv:env})?.environment,'test');
});
test('accounting after confirmed entitlement is separate, retryable, never auto-pays',async()=>{
 const calls=[];
 const data={
 ['s/'+student]:{studentId:student,partnerId:partner,clickId:click,linkedAt:'2026-10-26T11:00:00Z'},
 ['p/'+partner]:{id:partner,code:'OT-ABCDEFGHJKLM',termsVersion:'pilot',createdAt:'2026-10-26T10:00:00Z'},
 ['click/'+click]:{clickId:click,partnerId:partner,code:'OT-ABCDEFGHJKLM',at:Date.parse('2026-10-26T10:30:00Z')}
 };
 const store={async get(k){return data[k]||null;},async setJSON(k,v){data[k]=v;},
 async *list(){yield {blobs:[{key:'s/'+student}]};}};
 const account=createCommissionAccounting({readEnv:env,openStore:()=>store,
 rpc:async(name,input)=>{calls.push([name,input]);if(name==='teacher_accounting_pending_payments')return [{payment_id:'pay1'}];return true;}});
 const result=await account.confirmedPayment(req,context,{userId:student,paymentId:'pay1'});
 assert.deepEqual(result,{enabled:true,credited:true});
 assert.deepEqual(calls.map(([name])=>name),[
 'teacher_accounting_register_partner','teacher_accounting_link_student','teacher_accounting_credit_payment']);
 const recon=await account.reconcile(req,context);
 assert.equal(recon.enabled,true);
 assert.equal(recon.credited,1);
 assert.equal(calls.some(([name])=>name.includes('payout')),false);
});
test('verified refund environment mismatch never reaches database',async()=>{
 let count=0;
 const account=createCommissionAccounting({readEnv:env,rpc:async()=>{count++;return true;}});
 await assert.rejects(account.confirmedRefund(req,context,{
 environment:'live',test:false,paymentId:'p',refundId:'r',amountMinor:150000
 }),/environment_mismatch/);
 assert.equal(count,0);
});

test('confirmed subscription survives accounting failure; repeated callback retries',async()=>{
 const {handlePaymentWebhook}=await import('../netlify/functions/payment-webhook.js');
 let creditCalls=0;
 const request=()=>new Request(origin+'/api/payment-webhook',{method:'POST',body:JSON.stringify({
  type:'notification',event:'payment.succeeded',object:{id:'test_payment_123'}
 })});
 const deps={
  verifyPaymentFn:async()=>({paymentId:'test_payment_123',userId:student,
   paymentReference:'11111111-1111-4111-8111-111111111111',
   amountMinor:150000,currency:'RUB',periodDays:30,status:'succeeded',test:true,environment:'test'}),
  confirmPaymentFn:async()=>({applied:false,subscriptionUntil:'2026-11-25T00:00:00Z'}),
  commissionAccountingFn:{gate:()=>({environment:'test'}),confirmedPayment:async()=>{
   creditCalls++;if(creditCalls===1)throw Error('injected_accounting_failure');
   return {enabled:true,credited:true};
  }}
 };
 const first=await handlePaymentWebhook(request(),context,deps);
 assert.equal(first.status,200);
 assert.equal((await first.json()).applied,false);
 const second=await handlePaymentWebhook(request(),context,deps);
 assert.equal(second.status,200);
 assert.equal(creditCalls,2);
});


test('verified refund reaches accounting only after provider validation',async()=>{
 const {handlePaymentWebhook}=await import('../netlify/functions/payment-webhook.js');
 const events=[],request=()=>new Request(origin+'/api/payment-webhook',{method:'POST',
  body:JSON.stringify({type:'notification',event:'refund.succeeded',object:{id:'rf-test_123456'}})});
 const deps={
   verifyRefundFn:async input=>{events.push(['verified',input]);return {refundId:input.refundId,
      paymentId:'test_payment_123',amountMinor:30000,environment:'test',test:true};},
   commissionAccountingFn:{gate:()=>({environment:'test'}),
     confirmedRefund:async(_req,_ctx,refund)=>{events.push(['recorded',refund]);return {recorded:true}}}
 };
 const response=await handlePaymentWebhook(request(),context,deps);
 assert.equal(response.status,200);
 assert.equal(events.length,2);
 assert.equal(events[0][0],'verified');
 assert.equal(events[1][1].amountMinor,30000);
 const rejected=await handlePaymentWebhook(request(),context,{
   ...deps,verifyRefundFn:async()=>{throw Error('bad_signature_or_provider');}
 });
 assert.equal(rejected.status,400);
 assert.equal(events.length,2,'invalid refund cannot mutate accounting');
});
test('refund accounting outage asks provider for retry without changing subscription',async()=>{
 const {handlePaymentWebhook}=await import('../netlify/functions/payment-webhook.js');
 const request=new Request(origin+'/api/payment-webhook',{method:'POST',
   body:JSON.stringify({type:'notification',event:'refund.succeeded',object:{id:'refund-234567'}})});
 const response=await handlePaymentWebhook(request,context,{
   verifyRefundFn:async()=>({refundId:'refund-234567',paymentId:'pay-1',amountMinor:150000,environment:'test',test:true}),
   commissionAccountingFn:{gate:()=>({environment:'test'}),confirmedRefund:async()=>{throw Error('db_down')}}
 });
 assert.equal(response.status,503);
});

test('protected accounting report is gated and keyed to the authenticated teacher identity',async()=>{
 const calls=[];
 const accounting=createCommissionAccounting({readEnv:env,
   rpc:async(name,args)=>{calls.push({name,args});return {confirmedPayments:2,pendingMinor:100000,history:[]}}});
 assert.deepEqual(await accounting.report(req,context,{partnerId:partner}),
   {enabled:true,environment:'test',report:{confirmedPayments:2,pendingMinor:100000,history:[]}});
 assert.deepEqual(calls[0],{name:'teacher_accounting_partner_report',
   args:{p_partner_id:partner,p_environment:'test'}});
 const off=createCommissionAccounting({rpc:async()=>{throw Error('unreachable')}});
 assert.deepEqual(await off.report(req,context,{partnerId:partner}),{enabled:false});
});
