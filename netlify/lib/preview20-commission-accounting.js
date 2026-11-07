// PR20 accounting candidate. Opt-in, server-only; no bank or payout actions.
// The real-money authority is PostgreSQL payment_transactions, never a UI or Blob payment.
import {getStore} from '@netlify/blobs';
import {getPaymentEnvironment} from './payment-environment.js';
import {v20FeatureScope,v20StoreName} from './v20-deployment.js';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE=/^OT-[A-Z2-9]{12}$/;
const AUTH_SCHEMA='otto_a1';
const readSetting=name=>{
 try{const value=globalThis.Netlify?.env?.get?.(name);if(typeof value==='string')return value;}catch{}
 return typeof process==='undefined'?'':String(process.env?.[name]||'');
};

export function commissionGate(req,context,{readEnv=readSetting}={}){
 const environment=getPaymentEnvironment(context);
 if(!environment)return null;
 const teachers=v20FeatureScope(req,context,'TEACHERS');
 const referral=v20FeatureScope(req,context,'REFERRAL');
 if(!teachers||!referral||teachers.mode!==referral.mode)return null;
 if(readEnv('OTTO_V20_COMMISSION_DB_READY')!=='true')return null;
 if(readEnv(environment==='live'?'OTTO_V20_COMMISSION_LIVE_ENABLED':'OTTO_V20_COMMISSION_TEST_ENABLED')!=='true')return null;
 // The trusted deploy context and a real approved origin are still mandatory.
 if(environment==='live'&&teachers.mode!=='production')return null;
 if(environment==='test'&&teachers.mode!=='preview'&&teachers.mode!=='preview25')return null;
 return {environment,scope:teachers};
}

export async function commissionRpc(name,body){
 const url=readSetting('OTTO_SUPABASE_URL').replace(/\/+$/, '');
 const key=readSetting('OTTO_SUPABASE_ANON_KEY');
 const token=readSetting('OTTO_SUPABASE_TOKEN');
 if(!url||!key||!token)throw Error('teacher_accounting_db_not_configured');
 if(!/^teacher_accounting_[a-z_]+$/.test(name))throw Error('teacher_accounting_invalid_rpc');
 const response=await fetch(url+'/rest/v1/rpc/'+name,{
  method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,
   'Content-Type':'application/json','Content-Profile':AUTH_SCHEMA,'Accept-Profile':AUTH_SCHEMA},
  body:JSON.stringify(body)
 });
 const payload=await response.json().catch(()=>null);
 if(!response.ok){
  const error=new Error('teacher_accounting_rpc_failed');error.status=response.status;
  error.code=typeof payload?.code==='string'?payload.code:'unknown';
  throw error;
 }
 return payload;
}

export function createCommissionAccounting({
 readEnv=readSetting,rpc=commissionRpc,
 openStore=scope=>getStore({name:v20StoreName('TEACHERS',scope),consistency:'strong'}),
 log=(code,error)=>console.error(code,{message:error instanceof Error?error.message:'unknown'}),
}={}){
 const gate=(req,context)=>commissionGate(req,context,{readEnv});
 const storeOf=scope=>openStore(scope);
 async function mirrorStudent(store,userId){
  if(!UUID.test(String(userId)))return false;
  const student=await store.get('s/'+userId,{type:'json',consistency:'strong'});
  if(!student||student.studentId!==userId||!UUID.test(String(student.partnerId))||!UUID.test(String(student.clickId)))return false;
  const [partner,click]=await Promise.all([
   store.get('p/'+student.partnerId,{type:'json',consistency:'strong'}),
   store.get('click/'+student.clickId,{type:'json',consistency:'strong'}),
  ]);
  if(!partner||partner.demo===true||partner.blocked===true||partner.id!==student.partnerId||
     !CODE.test(String(partner.code))||!partner.termsVersion||
     !click||click.partnerId!==partner.id||click.clickId!==student.clickId||
     click.code!==partner.code)return false;
  const clickedAt=new Date(click.at).toISOString();
  if(!Number.isFinite(Date.parse(student.linkedAt))||!Number.isFinite(Date.parse(partner.createdAt)))return false;
  await rpc('teacher_accounting_register_partner',{
   p_partner_id:partner.id,p_referral_code:partner.code,
   p_terms_version:partner.termsVersion,p_registered_at:partner.createdAt
  });
  return (await rpc('teacher_accounting_link_student',{
   p_student_id:userId,p_partner_id:partner.id,p_click_id:student.clickId,
   p_clicked_at:clickedAt,p_linked_at:student.linkedAt
  }))===true;
 }
 async function confirmedPayment(req,context,payment){
  const enabled=gate(req,context);
  if(!enabled)return {enabled:false};
  // Entitlement must already be committed by the existing payment RPC.
  // A Blob or attribution read outage must not prevent an existing SQL
  // association from receiving its commission.
  try{await mirrorStudent(storeOf(enabled.scope),payment.userId);}
  catch(error){log('teacher_attribution_mirror_deferred',error);}
  const credited=await rpc('teacher_accounting_credit_payment',{
   p_environment:enabled.environment,p_payment_id:payment.paymentId
  });
  return {enabled:true,credited:credited===true};
 }
 async function confirmedRefund(req,context,refund){
  const enabled=gate(req,context);
  if(!enabled)return {enabled:false};
  if(refund.environment!==enabled.environment||
     (enabled.environment==='test')!==refund.test)throw Error('teacher_refund_environment_mismatch');
  const recorded=await rpc('teacher_accounting_record_refund',{
   p_environment:enabled.environment,p_payment_id:refund.paymentId,
   p_refund_id:refund.refundId,p_amount_minor:refund.amountMinor
  });
  return {enabled:true,recorded:recorded===true};
 }
 async function reconcile(req,context,{studentBatch=80,paymentBatch=200}={}){
  const enabled=gate(req,context);
  if(!enabled)return {enabled:false};
  const store=storeOf(enabled.scope);
  const keys=[];
  for await(const page of store.list({prefix:'s/',paginate:true})){
   for(const item of page.blobs){if(keys.length<5000)keys.push(item.key);}
   if(keys.length>=5000)break;
  }
  keys.sort();
  const saved=await store.get('maintenance/commission_cursor',{type:'json',consistency:'strong'}).catch(()=>null);
  let index=keys.findIndex(key=>key>String(saved?.lastKey||''));
  if(index<0)index=0;
  let linked=0,failures=0,lastKey=null;
  for(let i=0;i<Math.min(keys.length,studentBatch);i++){
   const key=keys[(index+i)%keys.length];
   lastKey=key;
   try{if(await mirrorStudent(store,key.slice(2)))linked++;}
   catch(error){failures++;log('teacher_accounting_reconcile_attribution_failed',error);}
  }
  if(lastKey)await store.setJSON('maintenance/commission_cursor',{lastKey});
  const waiting=await rpc('teacher_accounting_pending_payments',{
   p_environment:enabled.environment,p_limit:paymentBatch
  });
  let credited=0;
  for(const item of Array.isArray(waiting)?waiting:[]){
   if(!item?.payment_id)continue;
   try{if((await rpc('teacher_accounting_credit_payment',{
    p_environment:enabled.environment,p_payment_id:item.payment_id
   }))===true)credited++;}
   catch(error){failures++;log('teacher_accounting_reconcile_credit_failed',error);}
  }
  if(failures)throw Error('teacher_accounting_reconcile_incomplete');
  return {enabled:true,studentsChecked:Math.min(studentBatch,keys.length),
   linked,credited,refundsChecked:0,warning:keys.length>=5000?'student_scan_capped':null};
 }
 async function report(req,context,{partnerId=null,admin=false}={}) {
  const enabled=gate(req,context);
  if(!enabled)return {enabled:false};
  // Server passes only the signed session's user id, or a verified admin role.
  if(!UUID.test(String(partnerId)))throw Error('commission_invalid_partner');
  const result=await rpc('teacher_accounting_partner_report',{
   p_partner_id:partnerId,p_environment:enabled.environment
  });
  return {enabled:true,environment:enabled.environment,report:result};
 }
 return {gate,confirmedPayment,confirmedRefund,reconcile,mirrorStudent,report};
}
export const commissionAccounting=createCommissionAccounting();
