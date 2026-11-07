#!/usr/bin/env node
/**
 * OTTO 30: controlled copy of VERIFIED Preview Blobs to separated Production stores.
 * DEFAULT = read-only plan. Never publishes, never deletes, never overwrites.
 * This script does not edit student data, subscriptions, Environment flags or main.
 *
 * npm ci
 * NETLIFY_AUTH_TOKEN=... OTTO30_TRANSFER_TARGET_SITE_ID=... \
 *   node scripts/otto30-production-transfer.mjs
 * Only with a separate owner approval, pass --apply-production and both write guards.
 */
import {createHash} from 'node:crypto';
import {E9R3_KEY_FILES} from '../netlify/lib/otto30-key-fingerprints.js';
import {
  expectedPrivatePaths, pathKind, bytesLookCorrect, validatePublicExamData
} from '../netlify/lib/otto30-private.js';

const AUDITED_SOURCE_SITE='6cd5980e-1876-40f3-85e4-b227362b4d3d';
const PRODUCTION_HOST='otto-a1.netlify.app';
const SOURCE_CANDIDATES='otto30-preview13-owner-private-v1';
const SOURCE_KEYS='otto30-preview13-private-score-keys-v1';
const TARGET_CANDIDATES='otto30-production-owner-private-v1';
const TARGET_KEYS='otto30-production-private-score-keys-v1';
export const PROTECTED_ATTEMPTS='otto30-production-private-scores-v1';
const READY='_owner_private_ready_v1';
const MANIFEST='_manifest_owner_v1';
const KEY_VERSION='OTTO30-E9R3-EDITORIAL-20261011_PRIVATE_UNAPPROVED';
const sha256=value=>createHash('sha256').update(value).digest('hex');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertWriteAuthorization({apply,env,targetID}) {
 if(!uuid.test(targetID||''))throw Error('target_site_id_not_supplied');
 if(!apply)return false;
 if(env.OTTO30_TRANSFER_WRITE_APPROVED!=='I_AUTHORIZE_530_PRIVATE_OBJECTS'||
    env.OTTO30_TRANSFER_TARGET_ID_CONFIRMED!==targetID||
    env.OTTO30_TRANSFER_TARGET_HOST_CONFIRMED!==PRODUCTION_HOST)
  throw Error('explicit_production_write_authorization_missing');
 return true;
}

export function assertSeparatedStores() {
 const names=[SOURCE_CANDIDATES,SOURCE_KEYS,TARGET_CANDIDATES,TARGET_KEYS,PROTECTED_ATTEMPTS];
 if(new Set(names).size!==names.length)throw Error('store_namespace_collision');
 return true;
}
function demand(test,reason) {if(!test)throw Error(reason);}
const buf=content=>content===null||content===undefined?null:Buffer.from(content);
async function read(store,key) {return buf(await store.get(key,{type:'arrayBuffer',consistency:'strong'}));}
function check(data,expectedHash,expectedBytes,kind,key) {
 demand(data!==null,'source_missing:'+key);
 demand(data.length===expectedBytes&&sha256(data)===expectedHash,'sha256_or_size_mismatch:'+key);
 if(kind==='exam'){
  const index=Number(key.match(/exam_(\d+)\.json$/)?.[1]);
  validatePublicExamData(JSON.parse(data.toString('utf8')),index);
 }else if(kind==='key'){
  const index=Number(key.match(/exam_(\d+)\.key\.json$/)?.[1]);
  const parsed=JSON.parse(data.toString('utf8'));
  demand(parsed.status==='PRIVATE_SERVER_ONLY'&&
    parsed.examId==='otto-a12-'+String(index).padStart(2,'0')&&
    parsed.keyVersion===KEY_VERSION,'private_key_identity_mismatch:'+index);
  demand(['hoeren','lesen'].every(section=>Object.keys(parsed[section]||{}).length===15),
    'private_key_section_mismatch:'+index);
 }else if(kind!=='manifest'){
  demand(bytesLookCorrect(kind,data),'invalid_file_signature:'+key);
 }
}

export async function conditionalCreateAndVerify(store,key,bytes,hash) {
 const current=await read(store,key);
 if(current!==null){
  demand(sha256(current)===hash&&current.length===bytes.length,'target_conflict:'+key);
  return 'already-identical';
 }
 // Netlify Blobs accepts ArrayBuffer; do not rely on the Buffer subclass of Uint8Array.
 const upload=Uint8Array.from(bytes).buffer;
 const created=await store.set(key,upload,{onlyIfNew:true});
 const reread=await read(store,key);
 demand(reread!==null&&reread.length===bytes.length&&sha256(reread)===hash,
  'target_readback_mismatch:'+key);
 if(created?.modified!==true){
  // Another writer may have created identical bytes. Never overwrite or delete.
  return 'already-identical';
 }
 return 'created';
}

async function getSourceManifest(source) {
 const raw=await read(source,MANIFEST);
 demand(raw!==null,'preview_manifest_missing');
 const manifest=JSON.parse(raw.toString('utf8'));
 demand(manifest.format==='OTTO30_OWNER_PRIVATE_CANDIDATE_V1'&&
   manifest.release==='BLOCKED_FOR_RELEASE'&&
   manifest.localOnly===true&&manifest.hasAnswerKeys===false,
  'preview_manifest_not_a_blocked_candidate');
 const expected=expectedPrivatePaths();
 demand(expected.length===500&&Object.keys(manifest.files||{}).length===500,
   'manifest_count_mismatch');
 for(const key of expected) {
  const f=manifest.files[key];
  demand(f&&Number.isSafeInteger(f.bytes)&&f.bytes>0&&f.bytes<=2500000&&
    /^[a-f0-9]{64}$/i.test(f.sha256),'invalid_manifest_path:'+key);
 }
 demand(Object.keys(manifest.files).every(key=>expected.includes(key)),
   'manifest_contains_foreign_paths');
 const readyBytes=await read(source,READY);
 demand(readyBytes!==null,'preview_ready_marker_missing');
 const ready=JSON.parse(readyBytes.toString('utf8'));
 demand(ready.confirmed===true&&ready.total===500&&
   ready.hash===sha256(Buffer.from(JSON.stringify(manifest.files))),
   'preview_ready_marker_invalid');
 return {manifest,raw,expected};
}

async function bounded(items,limit,fn){
 let cursor=0;
 const result=new Array(items.length);
 await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
  for(;;){
   const i=cursor++;
   if(i>=items.length)return;
   result[i]=await fn(items[i],i);
  }
 }));
 return result;
}
export async function transfer({sourceCandidates,sourceKeys,targetCandidates,targetKeys,apply}) {
 assertSeparatedStores();
 const published=await read(targetCandidates,'_published_manifest_v1');
 demand(published===null,'production_publication_already_exists_stop');
 const {manifest,raw,expected}=await getSourceManifest(sourceCandidates);
 const manifestHash=sha256(Buffer.from(JSON.stringify(manifest.files)));
 const readyBytes=await read(targetCandidates,READY);
 let existingReady=null;
 if(readyBytes!==null){
  try{existingReady=JSON.parse(readyBytes.toString('utf8'))}catch{}
  demand(existingReady?.confirmed===true&&existingReady?.total===500&&
    existingReady?.hash===manifestHash,'production_ready_marker_conflict');
 }
 const paths=expected.map(key=>{
  const file=manifest.files[key];
  return {from:sourceCandidates,to:targetCandidates,key,kind:pathKind(key),
    sha:file.sha256,bytes:file.bytes};
 });
 for(let n=1;n<=30;n++){
  const key='exam_'+String(n).padStart(2,'0')+'.key.json';
  const trusted=E9R3_KEY_FILES[n];
  demand(trusted&&/^[a-f0-9]{64}$/.test(trusted.sha256),'trusted_key_digest_missing:'+n);
  paths.push({from:sourceKeys,to:targetKeys,key,kind:'key',
    sha:trusted.sha256,bytes:trusted.bytes});
 }
 // Pin exact source bytes in this run. No network read is used as a checksum oracle.
 const items=await bounded(paths,6,async item=>{
  const bytes=await read(item.from,item.key);
  check(bytes,item.sha,item.bytes,item.kind,item.key);
  return {...item,sourceBytes:bytes};
 });
 items.push({from:sourceCandidates,to:targetCandidates,key:MANIFEST,kind:'manifest',
   sha:sha256(raw),bytes:raw.length,sourceBytes:raw});
 // Refuse ALL conflicting target objects BEFORE the first write.
 const current=await bounded(items,6,async item=>{
  const existing=await read(item.to,item.key);
  if(existing===null)return false;
  demand(existing.length===item.bytes&&sha256(existing)===item.sha,
    'target_conflict:'+item.key);
  return true;
 });
 const identical=current.filter(Boolean).length;
 const missing=current.length-identical;
 demand(!existingReady||missing===0,'ready_marker_exists_with_missing_content');
 if(!apply)return {mode:'READ_ONLY',sourceChecked:530,
  targetObjectsChecked:531,identical,missing,readyMarkerVerified:Boolean(existingReady),
  approvedRelease:true,attemptsTouched:0,productionWrites:0};
 let created=0,resumed=0;
 // Separate stores, create-if-new only; may safely resume interrupted transfer.
 for(const item of items){
  const outcome=await conditionalCreateAndVerify(
    item.to,item.key,item.sourceBytes,item.sha);
  if(outcome==='created')created++;else resumed++;
 }
 // A SECOND complete remote read verifies all 530 private objects and the manifest.
 await bounded(items,6,async item=>{
  const actual=await read(item.to,item.key);
  demand(actual!==null&&actual.length===item.bytes&&sha256(actual)===item.sha,
    'final_readback_sha256_failed:'+item.key);
 });
 const metadata={confirmed:true,total:500,hash:manifestHash,
  sourceAuditRun:38604491958,releaseApprovalId:'OTTO31-OWNER-20261014-AUDIT-38604491958',
  verified:530,at:new Date().toISOString()};
 const marker=Buffer.from(JSON.stringify(metadata));
 const markerAction=await conditionalCreateAndVerify(
  targetCandidates,READY,existingReady?readyBytes:marker,
  sha256(existingReady?readyBytes:marker));
 if(existingReady)demand(markerAction==='already-identical','unexpected_ready_marker_write');
 const finalMarker=await read(targetCandidates,READY);
 demand(finalMarker!==null,'production_ready_marker_unavailable');
 const final=JSON.parse(finalMarker.toString('utf8'));
 demand(final.confirmed===true&&final.total===500&&final.hash===manifestHash,
  'production_ready_marker_invalid');
 return {mode:'EXPLICIT_WRITE',sourceChecked:530,targetObjectsChecked:531,
  created,resumed,readbackVerified:531,readyMarkerVerified:true,
  productionWrites:created+(markerAction==='created'?1:0),
  protectedPrivateKeys:30,approvedRelease:true,
  attemptStore:PROTECTED_ATTEMPTS,attemptsTouched:0,
  readyMarkerWritten:markerAction==='created',productionPublished:false};
}

async function verifySite(token,targetID) {
 const res=await fetch('https://api.netlify.com/api/v1/sites/'+encodeURIComponent(targetID),{
  headers:{Authorization:'Bearer '+token,Accept:'application/json'},
  signal:AbortSignal.timeout(15000)
 });
 if(!res.ok)throw Error('netlify_site_metadata_unavailable_http_'+res.status);
 const site=await res.json();
 const hosts=[site.url,site.ssl_url,'https://'+site.name+'.netlify.app']
   .filter(v=>typeof v==='string').flatMap(v=>{try{return [new URL(v).hostname]}catch{return []}});
 demand(site.id===targetID&&hosts.includes(PRODUCTION_HOST),
   'target_site_does_not_match_production_host');
 return {siteID:site.id,host:PRODUCTION_HOST};
}

async function main(){
 const flags=process.argv.slice(2);
 demand(flags.length===0||(flags.length===1&&flags[0]==='--apply-production'),
   'usage: node scripts/otto30-production-transfer.mjs [--apply-production]');
 const apply=flags.includes('--apply-production');
 const targetID=process.env.OTTO30_TRANSFER_TARGET_SITE_ID;
 assertWriteAuthorization({apply,env:process.env,targetID});
 const token=process.env.NETLIFY_AUTH_TOKEN;
 demand(Boolean(token),'netlify_token_unavailable');
 await verifySite(token,targetID);
 const {getStore}=await import('@netlify/blobs');
 const store=(name,id)=>getStore({name,siteID:id,token,consistency:'strong'});
 const result=await transfer({
  sourceCandidates:store(SOURCE_CANDIDATES,AUDITED_SOURCE_SITE),
  sourceKeys:store(SOURCE_KEYS,AUDITED_SOURCE_SITE),
  targetCandidates:store(TARGET_CANDIDATES,targetID),
  targetKeys:store(TARGET_KEYS,targetID),
  apply
 });
 console.log(JSON.stringify({target:{siteID:targetID,host:PRODUCTION_HOST},...result}));
}

if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url){
 main().catch(err=>{console.error('TRANSFER_STOPPED:',String(err?.message||err));process.exitCode=1});
}
