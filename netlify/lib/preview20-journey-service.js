import {randomUUID,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {v20FeatureScope,v20SameOrigin} from './v20-deployment.js';
import {PREVIEW_HOST,CONSENT_VERSION,DETAIL_WINDOW_MS,cleanEvent,visitId,userUuid,summarizeVisit} from '../../shared/preview20-journey.js';

const MAX_EVENTS=1000,MAX_BATCH=30,MAX_BYTES=32768,LIFETIME=24*60*60*1000;
const SOURCES=new Set(['telegram_ads','telegram','vk','ok','partner','direct','unknown']);
const DEVICES=new Set(['telegram_mobile','telegram_desktop','mobile_safari','mobile_chrome','mobile_other','desktop_safari','desktop_chrome','desktop_other']);
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const digest=s=>createHash('sha256').update(s).digest('hex');
const moscowDay=now=>new Date(now+3*3600000).toISOString().slice(0,10);
const key=id=>'visits/'+id.slice(0,10)+'/'+id;
function allowed(req,context){return Boolean(v20FeatureScope(req,context,'JOURNEY'));}
function sameOrigin(req){return v20SameOrigin(req,{origin:new URL(req.url).origin});}
async function body(req){
 const raw=await req.text();if(Buffer.byteLength(raw,'utf8')>MAX_BYTES)throw Object.assign(Error('too_large'),{status:413});
 try{const b=JSON.parse(raw);if(!b||typeof b!=='object'||Array.isArray(b))throw Error();return b;}
 catch{throw Object.assign(Error('invalid_json'),{status:400});}
}
function tokenMatches(req,record){
 const value=req.headers.get('x-otto-journey-token')||'';
 if(!/^[a-f0-9]{64}$/.test(value)||typeof record.tokenHash!=='string')return false;
 const a=Buffer.from(digest(value)),b=Buffer.from(record.tokenHash);
 return a.length===b.length&&timingSafeEqual(a,b);
}
const publicRecord=(r,at)=>summarizeVisit({...r,detail:true},at);
function metadata(r){return {summary:summarizeVisit(r),expiresAt:r.expiresAt};}

export function journeyService({openStore,readUserSession,readAdminSession,now=Date.now}){
 async function visitor(req,context){
  if(!allowed(req,context))return json({code:'not_found'},404);
  if(req.method==='GET')return json({enabled:true,implementation:'journey-v2-reviewed',scope:context.deploy.id,consentVersion:CONSENT_VERSION,perDeploy:false,lifetimeHours:24});
  if(req.method!=='POST')return json({code:'method_not_allowed'},405);
  if(!sameOrigin(req))return json({code:'invalid_origin'},403);
  try{
   const input=await body(req),at=now(),session=readUserSession(req);
   const owner=userUuid(session?.sub)?session.sub:null;
   if(input.action==='start'){
    if(input.consentVersion!==CONSENT_VERSION||input.consent!==true)return json({code:'consent_required'},400);
    const store=openStore(v20FeatureScope(req,context,'JOURNEY'));
    const id=`${moscowDay(at)}_${at}_${randomUUID()}`,token=randomBytes(32).toString('hex');
    const record={id,tokenHash:digest(token),startedAt:new Date(at).toISOString(),lastReceivedAt:new Date(at).toISOString(),expiresAt:at+LIFETIME,
      userId:owner,verifiedAt:owner?new Date(at).toISOString():null,
      device:DEVICES.has(input.device)?input.device:'desktop_other',source:SOURCES.has(input.source)?input.source:'unknown',
      consentVersion:CONSENT_VERSION,events:[],capped:false};
    if(owner)record.events.push({id:randomUUID(),kind:'session_confirmed',at:new Date(at).toISOString(),receivedAt:new Date(at).toISOString()});
    const written=await store.setJSON(key(id),record,{onlyIfNew:true,metadata:metadata(record)});
    if(!written.modified)return json({code:'start_conflict'},409);
    return json({ok:true,id,token,scope:context.deploy.id,expiresAt:record.expiresAt});
   }
   if(!visitId(input.id))return json({code:'invalid_visit'},400);
   if(!['events','erase','status'].includes(input.action))return json({code:'invalid_action'},400);
   if(input.action==='events'&&(!Array.isArray(input.events)||input.events.length<1||input.events.length>MAX_BATCH))return json({code:'invalid_batch'},400);
   const events=input.action==='events'?input.events.map(e=>cleanEvent(e,at)):[];
   if(events.some(e=>!e))return json({code:'invalid_event'},400);
   const store=openStore(v20FeatureScope(req,context,'JOURNEY'));
   for(let attempt=0;attempt<4;attempt++){
    const entry=await store.getWithMetadata(key(input.id),{type:'json',consistency:'strong'});
    if(!entry||!tokenMatches(req,entry.data))return json({code:'visit_not_available'},401);
    const r=entry.data;
    if(input.action==='erase'){
     // Explicit withdrawal physically removes the journal and all events.
     // A concurrent stale events-write uses onlyIfMatch and cannot recreate it.
     await store.delete(key(r.id));
     return json({ok:true});
    }
    if(r.erased)return json({code:'visit_erased'},410);
    if(at>r.expiresAt)return json({code:'visit_expired'},410);
    if(input.action==='status')return json({ok:true,eventCount:r.events.length,capped:r.capped,scope:context.deploy.id});
    if(r.userId&&r.userId!==owner)return json({code:'identity_changed'},409);
    const seen=new Set(r.events.map(e=>e.id));
    let unique=events.filter(e=>{if(seen.has(e.id))return false;seen.add(e.id);return true;});
    // Preserve delayed uploads from the first five minutes only.
    const startedAt=Date.parse(r.startedAt);
    unique=unique.filter(e=>{const t=Date.parse(e.at);return Number.isFinite(t)&&t>=startedAt-1000&&t<startedAt+DETAIL_WINDOW_MS;});
    if(!unique.length)return json({ok:true,acceptedIds:events.map(e=>e.id),capped:r.capped,scope:context.deploy.id,linked:Boolean(r.userId)});
    if(!r.userId&&owner){
     r.userId=owner;r.verifiedAt=new Date(at).toISOString();
     unique.unshift({id:randomUUID(),kind:'session_confirmed',at:r.verifiedAt,receivedAt:r.verifiedAt});
    }
    const available=Math.max(0,MAX_EVENTS-r.events.length);
    r.capped=r.capped||unique.length>available;
    r.events.push(...unique.slice(0,available).map(e=>({...e,receivedAt:new Date(at).toISOString()})));
    r.lastReceivedAt=new Date(at).toISOString();
    const written=await store.setJSON(key(r.id),r,{onlyIfMatch:entry.etag,metadata:metadata(r)});
    if(written.modified)return json({ok:true,acceptedIds:events.map(e=>e.id),capped:r.capped,scope:context.deploy.id,linked:Boolean(r.userId)});
   }
   return json({code:'write_conflict'},409);
  }catch(error){
   if(error?.status)return json({code:error.message},error.status);
   console.warn('Preview20 journey: storage unavailable');
   return json({code:'journey_unavailable'},503);
  }
 }
 async function admin(req,context){
  if(!allowed(req,context))return json({code:'not_found'},404);
  if(!readAdminSession(req))return json({code:'not_authenticated'},401);
  if(req.method!=='GET')return json({code:'method_not_allowed'},405);
  try{
   const url=new URL(req.url),id=url.searchParams.get('id'),store=openStore(v20FeatureScope(req,context,'JOURNEY')),at=now();
   if(id){
    if(!visitId(id))return json({code:'invalid_visit'},400);
    const r=await store.get(key(id),{type:'json',consistency:'strong'});
    if(!r||r.erased||r.expiresAt<at)return json({code:'visit_not_available'},404);
    return json({ok:true,scope:context.deploy.id,visit:publicRecord(r,at)});
   }
   const day=url.searchParams.get('day')||moscowDay(at);
   if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day+'T00:00:00Z')))return json({code:'invalid_day'},400);
   const offset=Number(url.searchParams.get('offset')||0);
   if(!Number.isInteger(offset)||offset<0||offset>1000)return json({code:'invalid_offset'},400);
   const keys=[];let limited=false;
   for await(const page of store.list({prefix:'visits/'+day+'/',paginate:true})){
    keys.push(...page.blobs.map(v=>v.key));if(keys.length>=1000){limited=true;break;}
   }
   keys.sort().reverse();
   const selected=keys.slice(offset,offset+50),visits=[];
   for(let start=0;start<selected.length;start+=5){
    const rows=await Promise.all(selected.slice(start,start+5).map(k=>store.getMetadata(k,{consistency:'strong'})));
    for(let i=0;i<rows.length;i++){
     const row=rows[i],meta=row?.metadata;
     if(!meta)continue;
     if(Number.isFinite(meta.expiresAt)&&meta.expiresAt<at){
      // Best-effort lazy expiry; hourly scheduled sweeper handles older days.
      await store.delete(selected[start+i]);
      continue;
     }
     if(meta.summary&&!meta.erased&&meta.expiresAt>=at){
      const s=meta.summary;visits.push({...s,ongoing:at-Date.parse(s.lastReceivedAt)<180000});
     }
    }
   }
   return json({ok:true,scope:context.deploy.id,day,visits,offset,hasMore:offset+50<keys.length,limited,
    note:'Первый визит после согласия: подробный путь за первые 5 минут; после этого подробная запись прекращается. Запись доступна 24 часа.'});
  }catch{console.warn('Preview20 journey: admin read unavailable');return json({code:'journey_unavailable'},503);}
 }
 return {visitor,admin};
}
