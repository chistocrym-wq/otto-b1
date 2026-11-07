import {randomUUID,randomBytes,createHmac,timingSafeEqual,createHash} from 'node:crypto';
import {getStore} from '@netlify/blobs';
import {readSession} from './otto-session.js';
import {readAdminSession} from './admin-auth.js';
import {getOttoVerifiedEmail,getOttoVerifiedTelegramId} from './otto-supabase.js';
import {verifyTelegramInitData} from './telegram-access.js';
import {v20FeatureScope,v20SameOrigin,v20StoreName} from './v20-deployment.js';
import {commissionAccounting} from './preview20-commission-accounting.js';

export const TEACHER_HOST='deploy-preview-20--otto-a1.netlify.app';
export const TEACHER_TERMS='pilot-2026-10-24-v2';
export const LIVE_TEACHER_TERMS='live-2026-10-27-v1';
export const TEACHER_REWARD_MINOR=50000; // Fixed RUB 500 for each confirmed test payment or renewal.
export const ATTRIBUTION_MS=30*86400000;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE=/^OT-[A-Z2-9]{12}$/;
const PAYMENT=/^test_[A-Za-z0-9_-]{6,90}$/;
const COOKIE='otto_preview20_teacher_ref';
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const sha=value=>createHash('sha256').update(String(value)).digest('hex');
const p=id=>'p/'+id;
const codeKey=code=>'code/'+code;
const clickKey=id=>'click/'+id;
const studentKey=id=>'s/'+id;
const teacherStudent=(teacher,id)=>'ps/'+teacher+'/'+id;
const commissionKey=id=>'c/'+id;
const teacherCommission=(teacher,id)=>'pc/'+teacher+'/'+id;
const payoutKey=(teacher,id)=>'po/'+teacher+'/'+id;
const auditKey=teacher=>'log/'+teacher+'/'+Date.now()+'-'+randomUUID();
const inPreview=(req,context)=>Boolean(v20FeatureScope(req,context,'TEACHERS'));
const inReferral=(req,context)=>Boolean(v20FeatureScope(req,context,'REFERRAL'));
const termsFor=(req,context)=>v20FeatureScope(req,context,'TEACHERS')?.mode==='production'?LIVE_TEACHER_TERMS:TEACHER_TERMS;
const fromSite=req=>v20SameOrigin(req,{origin:new URL(req.url).origin});
const secret=()=>globalThis.Netlify?.env?.get?.('OTTO_SESSION_SECRET')||process.env.OTTO_SESSION_SECRET||'';
const cookieHeader=req=>req.headers.get('cookie')||'';
function encodeCookie(value,key){const raw=Buffer.from(JSON.stringify(value)).toString('base64url');return raw+'.'+createHmac('sha256',key).update(raw).digest('base64url');}
function decodeCookie(req,key,now){
 if(!key)return null;
 const part=cookieHeader(req).split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='));
 if(!part)return null;
 const value=part.slice(COOKIE.length+1);const parts=value.split('.');
 if(parts.length!==2||parts[0].length>1024||parts[1].length>100)return null;
 const actual=Buffer.from(parts[1]),expected=Buffer.from(createHmac('sha256',key).update(parts[0]).digest('base64url'));
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
 try{const payload=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));
  return payload?.v===1&&CODE.test(payload.code)&&UUID.test(payload.clickId)&&
    Number.isSafeInteger(payload.at)&&payload.at<=now+60000&&now-payload.at<=ATTRIBUTION_MS?payload:null;
 }catch{return null;}
}
const readAll=async(store,prefix,cap=5000)=>{
 const result=[];
 for await(const page of store.list({prefix,paginate:true})){
  for(const entry of page.blobs){if(result.length>=cap)return {rows:result,truncated:true};result.push(entry.key);}
 }
 return {rows:result,truncated:false};
};
const parallelRows=async(store,keys,{withKeys=false}={})=>{
 const all=[];
 for(let i=0;i<keys.length;i+=10){
  all.push(...await Promise.all(keys.slice(i,i+10).map(async key=>{
   const value=await store.get(key,{type:'json',consistency:'strong'}).catch(()=>null);
   return withKeys?{key,value}:value;
  })));
 }
 return all.filter(entry=>withKeys?Boolean(entry?.value):Boolean(entry));
};
// Always use the trusted server request/deploy scope (not process.env.CONTEXT).
const storeFactory=(scope)=>{
 const name=v20StoreName('TEACHERS',scope);
 if(!name)throw Error('teacher_store_scope_required');
 return getStore({name,consistency:'strong'});
};
async function verifiedIdentity(userId){
 const [email,telegram]=await Promise.all([getOttoVerifiedEmail(userId),getOttoVerifiedTelegramId(userId)]);
 return Boolean(email||telegram);
}
const publicPartner=(partner,origin='https://'+TEACHER_HOST)=>({code:partner.code,name:partner.name,rewardMinor:TEACHER_REWARD_MINOR,blocked:partner.blocked===true,createdAt:partner.createdAt,demo:partner.demo===true,
  siteUrl:origin+'/?ref='+encodeURIComponent(partner.code),
  telegramUrl:'https://t.me/ottoA1_bot?startapp=ref_'+partner.code});
const money=commission=>({paymentId:commission.paymentId,studentAlias:commission.studentAlias,kind:commission.kind,amountMinor:commission.amountMinor,rateBps:commission.rateBps,commissionMinor:commission.commissionMinor,status:commission.status,createdAt:commission.createdAt});
export function createTeacherPilot({
 openStore=storeFactory,readUser=readSession,readAdmin=readAdminSession,
 verifyIdentity=verifiedIdentity,verifyTelegram=verifyTelegramInitData,
 sessionSecret=secret,now=Date.now,
}={}){
 const scopedStore=(req,context,feature='TEACHERS')=>{
  const scope=v20FeatureScope(req,context,feature);
  if(!scope)throw Error('teacher_feature_disabled');
  return openStore(scope);
 };
 const audit=async(store,teacher,event,detail={})=>{try{await store.setJSON(auditKey(teacher),{event,at:new Date(now()).toISOString(),...detail},{onlyIfNew:true});}catch{/* An audit outage does not affect student entitlement. */}};
 async function registerTeacher(req,context,input){
  if(!inPreview(req,context))return json({code:'not_found'},404);
  const session=readUser(req);if(!session?.sub)return json({code:'not_authenticated'},401);
  if(!fromSite(req))return json({code:'invalid_origin'},403);
  const terms=termsFor(req,context);
  if(input?.termsAccepted!==true||input.termsVersion!==terms)return json({code:'teacher_terms_required'},400);
  const name=typeof input.name==='string'?input.name.trim():'';
  if(name.length<2||name.length>90)return json({code:'invalid_teacher_name'},400);
  if(!(await verifyIdentity(session.sub).catch(()=>false)))return json({code:'verified_identity_required'},403);
  const store=scopedStore(req,context),existing=await store.get(p(session.sub),{type:'json',consistency:'strong'});
  if(existing)return json({ok:true,alreadyRegistered:true,partner:publicPartner(existing,new URL(req.url).origin)});
  for(let i=0;i<5;i++){
   const code='OT-'+randomBytes(9).toString('base64url').toUpperCase().replace(/[^A-Z2-9]/g,'Z').slice(0,12).padEnd(12,'Z');
   if(!CODE.test(code))continue;
   const reserve=await store.setJSON(codeKey(code),{userId:session.sub},{onlyIfNew:true});
   if(!reserve?.modified)continue;
   const rec={id:session.sub,code,name,blocked:false,createdAt:new Date(now()).toISOString(),termsVersion:terms,payout:{method:'not_configured',mask:''}};
   const result=await store.setJSON(p(session.sub),rec,{onlyIfNew:true});
   const partner=result?.modified?rec:await store.get(p(session.sub),{type:'json',consistency:'strong'});
   if(partner){await audit(store,session.sub,'teacher_registered');return json({ok:true,partner:publicPartner(partner,new URL(req.url).origin)});}
  }
  return json({code:'teacher_registration_failed'},503);
 }
 async function capture(req,context){
  if(!inReferral(req,context))return json({code:'not_found'},404);
  if(req.method!=='GET'&&req.method!=='POST')return json({code:'method_not_allowed'},405);
  if(req.method==='POST'&&!fromSite(req))return json({code:'invalid_origin'},403);
  // Even a GET must originate from the current site, not a third-party pixel.
  const site=req.headers.get('sec-fetch-site');
  if(site&&site!=='same-origin')return json({code:'invalid_site'},403);
  const current=now(),key=sessionSecret(),prior=decodeCookie(req,key,current);
  if(prior)return json({ok:true,code:prior.code,firstTouch:true,alreadySaved:true});
  let code='';
  if(req.method==='POST'){
   const body=await req.json().catch(()=>({}));
   const initData=String(body?.initData||'');
   if(!initData||!verifyTelegram(initData))return json({code:'telegram_auth_invalid'},401);
   const value=new URLSearchParams(initData).get('start_param')||'';
   code=value.startsWith('ref_')?value.slice(4):'';
  }else{
   code=new URL(req.url).searchParams.get('code')||'';
  }
  if(!CODE.test(code))return json({code:'invalid_code'},400);
  if(!key)return json({code:'server_unavailable'},503);
  const store=scopedStore(req,context,'REFERRAL'),lookup=await store.get(codeKey(code),{type:'json',consistency:'strong'});
  if(!lookup?.userId)return json({code:'partner_not_found'},404);
  const partner=await store.get(p(lookup.userId),{type:'json',consistency:'strong'});
  if(!partner||partner.code!==code||partner.blocked)return json({code:'partner_unavailable'},404);
  const signedIn=readUser(req);
  if(signedIn?.sub===partner.id)return json({code:'self_referral'},403);
  const clickId=randomUUID(),row={clickId,partnerId:partner.id,code,at:current};
  await store.setJSON(clickKey(clickId),row,{onlyIfNew:true});
  await store.setJSON('tc/'+partner.id+'/'+clickId,{at:current},{onlyIfNew:true}).catch(()=>null);
  const token=encodeCookie({v:1,code,at:current,clickId},key);
  return json({ok:true,code,firstTouch:true},200,{'set-cookie':COOKIE+'='+token+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+Math.floor(ATTRIBUTION_MS/1000)});
 }
 async function linkVerifiedUser(req,context,userId,verifiedAt){
  if(!inReferral(req,context)||!UUID.test(String(userId)))return {linked:false,reason:'not_preview'};
  const token=decodeCookie(req,sessionSecret(),now());
  if(!token)return {linked:false,reason:'no_valid_referral'};
  const at=Date.parse(verifiedAt||'');
  if(!Number.isFinite(at)||at<token.at-5000||at>now()+60000)return {linked:false,reason:'existing_account'};
  const store=scopedStore(req,context,'REFERRAL'),lookup=await store.get(codeKey(token.code),{type:'json',consistency:'strong'});
  const partner=lookup?.userId?await store.get(p(lookup.userId),{type:'json',consistency:'strong'}):null;
  if(!partner||partner.blocked||partner.code!==token.code||partner.id===userId)return {linked:false,reason:'blocked_or_self'};
  const click=await store.get(clickKey(token.clickId),{type:'json',consistency:'strong'});
  if(!click||click.partnerId!==partner.id||click.at!==token.at)return {linked:false,reason:'unverified_touch'};
  const row={studentId:userId,partnerId:partner.id,studentAlias:'Ученик #'+sha(userId).slice(0,7).toUpperCase(),linkedAt:new Date(now()).toISOString(),clickId:token.clickId,kind:'registered',status:'registered'};
  const result=await store.setJSON(studentKey(userId),row,{onlyIfNew:true});
  const owner=result?.modified?row:await store.get(studentKey(userId),{type:'json',consistency:'strong'});
  if(owner?.partnerId!==partner.id)return {linked:false,reason:'already_attributed'};
  await store.setJSON(teacherStudent(partner.id,userId),{alias:row.studentAlias,status:'registered',linkedAt:row.linkedAt},{onlyIfNew:true}).catch(()=>null);
  if(result?.modified)await audit(store,partner.id,'student_attributed',{studentAlias:row.studentAlias});
  return {linked:Boolean(result?.modified),reason:result?.modified?'attributed':'already_attributed'};
 }
 async function recordVerifiedPayment({paymentId,userId,amountMinor,currency='RUB',isTest=true,environment='test',entitlementConfirmed=false,providerStatus='succeeded',scope}){
  if(!PAYMENT.test(String(paymentId))&&!(typeof paymentId==='string'&&paymentId.length>=8&&paymentId.length<=100))return {credited:false,reason:'invalid_payment'};
  if(!UUID.test(String(userId))&&!String(userId).startsWith('test:'))return {credited:false,reason:'invalid_student'};
  if(environment!=='test'||isTest!==true||entitlementConfirmed!==true||providerStatus!=='succeeded'||currency!=='RUB'||amountMinor!==150000)return {credited:false,reason:'not_verified_test_payment'};
  const store=openStore(scope),student=await store.get(studentKey(userId),{type:'json',consistency:'strong'});
  if(!student)return {credited:false,reason:'unattributed'};
  const partner=await store.get(p(student.partnerId),{type:'json',consistency:'strong'});
  if(!partner||partner.blocked)return {credited:false,reason:'partner_blocked'};
  const key=commissionKey(paymentId),prior=await store.get(key,{type:'json',consistency:'strong'});
  if(prior)return {credited:false,duplicate:true,commission:money(prior)};
  const linked=await readAll(store,'pc/'+partner.id+'/',5000);
  const earlier=await parallelRows(store,linked.rows);
  const kind=earlier.some(r=>r.userId===userId)?'renewal':'initial';
  const commissionMinor=TEACHER_REWARD_MINOR;
  const row={paymentId,userId,partnerId:partner.id,studentAlias:student.studentAlias,kind,amountMinor,commissionRule:'fixed_500_rub_per_payment',commissionMinor,currency:'RUB',status:'pending',createdAt:new Date(now()).toISOString(),test:true};
  const inserted=await store.setJSON(key,row,{onlyIfNew:true});
  const authoritative=inserted?.modified?row:await store.get(key,{type:'json',consistency:'strong'});
  if(!authoritative||authoritative.userId!==userId)return {credited:false,reason:'payment_id_conflict'};
  await store.setJSON(teacherCommission(partner.id,paymentId),{...authoritative},{onlyIfNew:true});
  await store.setJSON(teacherStudent(partner.id,userId),{alias:student.studentAlias,status:'paid',linkedAt:student.linkedAt});
  if(inserted?.modified)await audit(store,partner.id,'test_commission_created',{paymentId,commissionMinor,commissionRule:'fixed_500_rub_per_payment'});
  return {credited:Boolean(inserted?.modified),duplicate:!inserted?.modified,commission:money(authoritative)};
 }
 async function reverseTestPayment(paymentId,reason,scope){
  const store=openStore(scope),key=commissionKey(paymentId);
  for(let i=0;i<8;i++){
   const e=await store.getWithMetadata(key,{type:'json',consistency:'strong'});
   if(!e)return {reversed:false,reason:'unknown_payment'};
   const row=e.data;
   if(row.status==='reversed')return {reversed:false,duplicate:true};
   if(row.test!==true)return {reversed:false,reason:'not_test'};
   const next={...row,status:'reversed',reversedAt:new Date(now()).toISOString(),reversalReason:reason};
   const result=await store.setJSON(key,next,{onlyIfMatch:e.etag});
   if(result?.modified){await store.setJSON(teacherCommission(row.partnerId,paymentId),next);
    await audit(store,row.partnerId,'commission_reversed',{paymentId,reason});return {reversed:true};}
  }
  return {reversed:false,reason:'conflict'};
 }
 async function payoutSimulation(partnerId,outcome,scope){
  const store=openStore(scope),partner=await store.get(p(partnerId),{type:'json',consistency:'strong'});
  if(!partner)return {ok:false,reason:'partner_missing'};
  const keys=(await readAll(store,'pc/'+partnerId+'/',5000)).rows;
  const commissions=(await parallelRows(store,keys)).filter(row=>row.status==='pending');
  const sum=commissions.reduce((s,r)=>s+r.commissionMinor,0);
  if(sum<=0)return {ok:false,reason:'no_pending_commissions'};
  const payoutId='sim-'+randomUUID(),row={id:payoutId,partnerId,amountMinor:sum,commissionIds:commissions.map(x=>x.paymentId),status:outcome==='failure'?'failed':'paid',createdAt:new Date(now()).toISOString(),test:true};
  await store.setJSON(payoutKey(partnerId,payoutId),row,{onlyIfNew:true});
  if(row.status==='paid')for(const entry of commissions){
   const c=await store.getWithMetadata(commissionKey(entry.paymentId),{type:'json',consistency:'strong'});
   if(c?.data?.status!=='pending')continue;
   const next={...c.data,status:'paid',payoutId};
   const changed=await store.setJSON(commissionKey(entry.paymentId),next,{onlyIfMatch:c.etag});
   if(changed.modified)await store.setJSON(teacherCommission(partnerId,entry.paymentId),next);
  }
  await audit(store,partnerId,'simulated_payout',{payoutId,status:row.status,amountMinor:sum});
  return {ok:true,payout:row};
 }
 async function stats(partner,{includeSyntheticIds=false,scope}={}){
  const store=openStore(scope),id=partner.id;
  const [clicks,students,commissions,payouts]=await Promise.all([readAll(store,'tc/'+id+'/'),readAll(store,'ps/'+id+'/'),readAll(store,'pc/'+id+'/'),readAll(store,'po/'+id+'/')]);
  const [people,records,transfers]=await Promise.all([parallelRows(store,students.rows,{withKeys:true}),parallelRows(store,commissions.rows),parallelRows(store,payouts.rows)]);
  const pending=records.filter(x=>x.status==='pending').reduce((s,x)=>s+x.commissionMinor,0);
  const paid=records.filter(x=>x.status==='paid').reduce((s,x)=>s+x.commissionMinor,0);
  const reversed=records.filter(x=>x.status==='reversed');
  return {clicks:clicks.rows.length,registrations:people.length,payments:records.length,renewals:records.filter(x=>x.kind==='renewal').length,
   confirmedPayments:records.filter(x=>x.status!=='reversed').length,refunded:reversed.length,
   earnedMinor:pending+paid,pendingMinor:pending,paidMinor:paid,
   people:people.map(({key,value:x})=>({alias:x.alias,status:x.status,linkedAt:x.linkedAt,
    // Only synthetic demo IDs are visible, and only to authenticated admin.
    ...(includeSyntheticIds&&partner.demo===true&&key.startsWith('ps/'+id+'/test:')&&UUID.test(key.slice(('ps/'+id+'/test:').length))
      ?{syntheticStudentId:key.slice(('ps/'+id+'/').length)}:{})})).slice(-100),
   commissions:records.map(money).slice(-100),payouts:transfers.slice(-50).map(x=>({id:x.id,status:x.status,amountMinor:x.amountMinor,createdAt:x.createdAt})),
   truncated:[clicks,students,commissions,payouts].some(x=>x.truncated)};
 }
 async function teacher(req,context){
  if(!inPreview(req,context))return json({code:'not_found'},404);
  const session=readUser(req);if(!session?.sub)return json({code:'not_authenticated'},401);
  try{
   if(req.method==='GET'){
    const scope=v20FeatureScope(req,context,'TEACHERS');
     const partner=await scopedStore(req,context).get(p(session.sub),{type:'json',consistency:'strong'});
    if(!partner)return json({ok:true,registered:false,termsVersion:termsFor(req,context)});
    const statistics=await stats(partner,{scope});
    let liveAccounting=null;
    try{
      const report=await commissionAccounting.report(req,context,{partnerId:session.sub});
      if(report.enabled)liveAccounting=report.report;
    }catch{liveAccounting={unavailable:true};}
    return json({ok:true,registered:true,partner:publicPartner(partner,new URL(req.url).origin),
      statistics,liveAccounting,payout:partner.payout});
   }
   if(req.method!=='POST')return json({code:'method_not_allowed'},405);
   if(!fromSite(req))return json({code:'invalid_origin'},403);
   const body=await req.json().catch(()=>({}));
   const scope=v20FeatureScope(req,context,'TEACHERS');
   if(body?.action==='register')return registerTeacher(req,context,body);
   if(body?.action==='settings'){
    if(scope?.mode==='production')return json({code:'test_payout_settings_disabled'},403);
    const method=body.method;
    if(!['not_configured','sbp_test','bank_test'].includes(method))return json({code:'invalid_payout_method'},400);
    // Preview must never collect full card numbers, BIC or bank account details.
    const mask=String(body.mask||'').trim();
    if(mask.length>20||(!/^[A-Za-zА-Яа-яЁё0-9 *._-]{0,20}$/u.test(mask)))return json({code:'invalid_payout_mask'},400);
    const store=scopedStore(req,context);
    for(let n=0;n<8;n++){
     const e=await store.getWithMetadata(p(session.sub),{type:'json',consistency:'strong'});
     if(!e)return json({code:'not_teacher'},403);
     const next={...e.data,payout:{method,mask,updatedAt:new Date(now()).toISOString()}};
     const success=await store.setJSON(p(session.sub),next,{onlyIfMatch:e.etag});
     if(success?.modified){await audit(store,session.sub,'test_payout_settings_updated');return json({ok:true,payout:next.payout});}
    }
    return json({code:'settings_conflict'},409);
   }
   return json({code:'invalid_action'},400);
  }catch{ return json({code:'teacher_service_unavailable'},503); }
 }
 async function admin(req,context){
  if(!inPreview(req,context))return json({code:'not_found'},404);
  if(!readAdmin(req))return json({code:'not_authenticated'},401);
  if(req.method==='GET'){
   try{
    const store=scopedStore(req,context),keys=await readAll(store,'p/',200),partners=await parallelRows(store,keys.rows);
    const rows=[];
    for(const partner of partners){
      const summary=await stats(partner,{includeSyntheticIds:true,scope:v20FeatureScope(req,context,'TEACHERS')});
      let liveAccounting=null;
      try{const report=await commissionAccounting.report(req,context,{partnerId:partner.id});
          if(report.enabled)liveAccounting=report.report;
      }catch{liveAccounting={unavailable:true};}
      rows.push({id:partner.id,...publicPartner(partner,new URL(req.url).origin),...summary,liveAccounting});
    }
    return json({ok:true,partners:rows,truncated:keys.truncated,pilot:true});
   }catch{return json({code:'teacher_admin_unavailable'},503);}
  }
  if(req.method!=='POST')return json({code:'method_not_allowed'},405);
  if(!fromSite(req))return json({code:'invalid_origin'},403);
  const body=await req.json().catch(()=>({})),store=scopedStore(req,context);
  const scope=v20FeatureScope(req,context,'TEACHERS');
  try{
   if(scope?.mode==='production'&&['demo_partner','seed_student','test_payment','test_payout','refund','cancel'].includes(body.action))
    return json({code:'synthetic_test_only'},403);
   if(body.action==='reconcile_commissions') {
     if(!commissionAccounting.gate(req,context))return json({code:'accounting_disabled'},404);
     const outcome=await commissionAccounting.reconcile(req,context);
     return json({ok:true,outcome});
   }
   const uid=String(body.teacherId||'');
   if(body.action==='demo_partner'){
    const fakeId=randomUUID(),code='OT-'+randomBytes(9).toString('base64url').toUpperCase().replace(/[^A-Z2-9]/g,'Z').slice(0,12).padEnd(12,'Z');
    const row={id:fakeId,code,name:'Демо-преподаватель',blocked:false,createdAt:new Date(now()).toISOString(),demo:true,payout:{method:'not_configured',mask:''}};
    await store.setJSON(codeKey(code),{userId:fakeId},{onlyIfNew:true});
    await store.setJSON(p(fakeId),row,{onlyIfNew:true});
    return json({ok:true,partner:publicPartner(row,new URL(req.url).origin)});
   }
   if(!UUID.test(uid))return json({code:'invalid_teacher'},400);
   if(body.action==='seed_student'){
    const partner=await store.get(p(uid),{type:'json',consistency:'strong'});
    if(!partner)return json({code:'partner_not_found'},404);
    if(partner.demo!==true)return json({code:'demo_only'},403);
    const studentId='test:'+randomUUID(),alias='Тестовый ученик #'+randomBytes(3).toString('hex');
    const row={studentId,partnerId:uid,studentAlias:alias,linkedAt:new Date(now()).toISOString(),status:'registered',kind:'test'};
    await store.setJSON(studentKey(studentId),row,{onlyIfNew:true});
    await store.setJSON(teacherStudent(uid,studentId),{alias,status:'registered',linkedAt:row.linkedAt},{onlyIfNew:true});
    await audit(store,uid,'synthetic_student_created',{alias});
    return json({ok:true,studentId,alias});
   }
   if(body.action==='block'){
    for(let n=0;n<8;n++){
     const e=await store.getWithMetadata(p(uid),{type:'json',consistency:'strong'});
     if(!e)return json({code:'partner_not_found'},404);
     const next={...e.data,blocked:body.blocked===true};
     const success=await store.setJSON(p(uid),next,{onlyIfMatch:e.etag});
     if(success.modified){await audit(store,uid,body.action,{rateBps:next.rateBps,blocked:next.blocked});return json({ok:true,partner:publicPartner(next,new URL(req.url).origin)});}
    }
    return json({code:'partner_update_conflict'},409);
   }
   if(body.action==='test_payment'){
    const id=String(body.paymentId||''),studentId=String(body.studentId||'');
    if(!PAYMENT.test(id)||!studentId.startsWith('test:')||!UUID.test(studentId.slice(5)))return json({code:'synthetic_data_only'},400);
    const [partner,student]=await Promise.all([store.get(p(uid),{type:'json',consistency:'strong'}),store.get(studentKey(studentId),{type:'json',consistency:'strong'})]);
    if(partner?.demo!==true||student?.partnerId!==uid||student.kind!=='test')return json({code:'synthetic_student_not_linked'},409);
    const outcome=await recordVerifiedPayment({paymentId:id,userId:studentId,amountMinor:150000,currency:'RUB',isTest:true,environment:'test',entitlementConfirmed:true,providerStatus:'succeeded',scope});
    if(!outcome.credited)return json({ok:false,code:outcome.duplicate?'duplicate_test_payment':outcome.reason||'not_credited'},409);
    return json({ok:true,result:outcome});
   }
   if(body.action==='refund'||body.action==='cancel'){
    const id=String(body.paymentId||'');
    if(!PAYMENT.test(id))return json({code:'synthetic_data_only'},400);
    return json({ok:true,result:await reverseTestPayment(id,body.action,scope)});
   }
   if(body.action==='test_payout'){
    if(body.outcome!=='success'&&body.outcome!=='failure')return json({code:'invalid_outcome'},400);
    return json(await payoutSimulation(uid,body.outcome,scope));
   }
   return json({code:'invalid_action'},400);
  }catch{return json({code:'teacher_admin_unavailable'},503);}
 }
 return {teacher,admin,capture,linkVerifiedUser,recordVerifiedPayment,reverseTestPayment,payoutSimulation,registerTeacher,stats};
}
export const teacherPilot=createTeacherPilot();
