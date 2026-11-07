#!/usr/bin/env node
/**
 * OTTO 13 inventory only. NEVER writes to a Netlify store, Supabase, or a deploy.
 * Site-scoped Blobs are read with @netlify/blobs and only digests/counts are reported.
 */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {getStore} from '@netlify/blobs';
import {E9R3_KEY_FILES} from '../netlify/lib/otto30-key-fingerprints.js';
import {expectedPrivatePaths,validatePublicExamData} from '../netlify/lib/otto30-private.js';

export const SITE_ID='6cd5980e-1876-40f3-85e4-b227362b4d3d';
export const ROLLBACK_DEPLOY_ID='6acddaa9790643d38224f767';
export const ROLLBACK_SHA='94ef03f7be78f250f573f7a89b1bda8afd9277b7';
export const PREVIEW_STORE='otto30-preview13-owner-private-v1';
export const KEY_STORE='otto30-preview13-private-score-keys-v1';
export const PRODUCTION_STORE='otto30-production-owner-private-v1';
export const PRODUCTION_KEY_STORE='otto30-production-private-score-keys-v1';
const manifestKey='_manifest_owner_v1';
const readyKey='_owner_private_ready_v1';
const basename=n=>String(n).padStart(2,'0');
const digest=data=>createHash('sha256').update(data).digest('hex');
const keysExpected=Array.from({length:30},(_,i)=>'exam_'+basename(i+1)+'.key.json');
const shaOk=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
const record=(path,issue)=>({path,issue});
const readBytes=async(store,key)=>{
 const data=await store.get(key,{type:'arrayBuffer',consistency:'strong'});
 return data===null?null:Buffer.from(data);
};
const safeJson=async(store,key)=>{
 const bytes=await readBytes(store,key);
 if(!bytes)return null;
 try{return JSON.parse(bytes.toString('utf8'))}catch{return null}
};
async function bounded(items,limit,fn){
 let index=0;
 const out=new Array(items.length);
 await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
  for(;;){
   const i=index++;
   if(i>=items.length)return;
   try{out[i]=await fn(items[i],i)}catch(e){out[i]={error:String(e?.message||e).slice(0,150)}}
  }
 }));
 return out;
}
function validateLinks(candidate,n){
 const issues=[],prefix='audio/exam_'+basename(n)+'/';
 if(candidate.id!=='otto-a12-'+basename(n))issues.push('exam_id');
 const audio=candidate.hoeren;
 if(!Array.isArray(audio)||audio.length!==15)issues.push('horen_count');
 else for(let i=0;i<15;i++)if(audio[i]?.audioUrl!==prefix+'task_'+basename(i+1)+'.mp3')issues.push('audio_'+basename(i+1));
 if(!Array.isArray(candidate.lesen)||candidate.lesen.length!==15)issues.push('lesen_count');
 const cards=candidate.sprechen?.teil3;
 if(!Array.isArray(cards)||cards.length!==2)issues.push('sprechen_images');
 else for(const card of cards)if(!/^images\/sprechen\/scene_(0[1-9]|1[0-9]|20)\.png$/.test(card.imageUrl||''))issues.push('sprechen_image_link');
 try{validatePublicExamData(candidate,n)}catch{issues.push('server_validator_rejects')}
 return [...new Set(issues)];
}
function keyCompatible(key,candidate,n){
 if(!key||key.examId!=='otto-a12-'+basename(n)||key.status!=='PRIVATE_SERVER_ONLY')return false;
 for(const section of ['hoeren','lesen']){
  const tasks=candidate?.[section],answers=key[section];
  if(!Array.isArray(tasks)||tasks.length!==15||!answers||Object.keys(answers).length!==15)return false;
  for(let i=1;i<=15;i++){
   const row=answers[String(i)],task=tasks[i-1];
   if(!row||row.type!==task.type)return false;
   if(task.type==='true-false'&&typeof row.answer!=='boolean')return false;
   if(task.type==='multiple-choice'&&(!Number.isInteger(row.answerIndex)||row.answerIndex<0||row.answerIndex>=task.options.length))return false;
  }
 }
 if(!Array.isArray(key.schreiben?.part1)||key.schreiben.part1.length!==candidate.schreiben?.part1?.rows?.length)return false;
 return true;
}
export async function auditStores({candidateStore,keyStore,baseline}){
 const expected=expectedPrivatePaths(),expectSet=new Set(expected),keySet=new Set(keysExpected);
 if(expected.length!==500||Object.keys(baseline.audio||{}).length!==450)throw Error('baseline_incomplete');
 const [assetsList,keysList,manifest,ready]=await Promise.all([
  candidateStore.list(),keyStore.list(),
  safeJson(candidateStore,manifestKey),safeJson(candidateStore,readyKey)
 ]);
 const available=new Set((assetsList.blobs||[]).map(x=>x.key));
 const keyAvailable=new Set((keysList.blobs||[]).map(x=>x.key));
 const issues=[],mismatch=[],examMap=new Map(),matchedAudio=[];
 const counts={exam:0,audio:0,image:0,keys:0};
 const data=await bounded(expected,7,async(path)=>{
  const bytes=await readBytes(candidateStore,path);
  if(bytes===null)return {missing:true};
  const sha256=digest(bytes);
  const manifestRow=manifest?.files?.[path];
  const mismatchReasons=[];
  if(!manifestRow)mismatchReasons.push('manifest_entry_missing');
  else if(manifestRow.bytes!==bytes.length||manifestRow.sha256!==sha256)mismatchReasons.push('preview_manifest_checksum');
  if(path.startsWith('audio/')){
   const audioRow=baseline.audio[path];
   if(!audioRow||audioRow.bytes!==bytes.length||audioRow.sha256!==sha256)mismatchReasons.push('archive_audio_checksum');
   else matchedAudio.push(path);
   if(!(bytes.subarray(0,3).toString('ascii')==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224)))mismatchReasons.push('mp3_signature');
  }
  if(path.startsWith('images/')&&!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mismatchReasons.push('png_signature');
  const obj=path.startsWith('exams/')?JSON.parse(bytes.toString('utf8')):null;
  return {bytes:bytes.length,sha256,mismatchReasons,obj};
 });
 for(let i=0;i<expected.length;i++){
  const path=expected[i],row=data[i],type=path.startsWith('audio/')?'audio':path.startsWith('images/')?'image':'exam';
  if(row?.error){issues.push(record(path,'read_or_parse_failed'));continue}
  if(row?.missing){issues.push(record(path,'missing'));continue}
  counts[type]++;
  for(const reason of row.mismatchReasons||[])mismatch.push(record(path,reason));
  if(type==='exam'){
   const n=Number(path.match(/exam_(\d+)\.json$/)[1]),linkIssues=validateLinks(row.obj,n);
   if(linkIssues.length)for(const reason of linkIssues)issues.push(record(path,reason));
   examMap.set(n,row.obj);
  }
 }
 const keyStats={checked:0,pinnedE9R3Matches:0,compatible:0};
 const installed=await bounded(keysExpected,4,async(path)=>{
  const bytes=await readBytes(keyStore,path);
  if(bytes===null)return {missing:true};
  const n=Number(path.match(/exam_(\d+)\.key\.json$/)[1]);
  const key=JSON.parse(bytes.toString('utf8'));
  const pinned=E9R3_KEY_FILES[n];
  return {fingerprintMatches:Boolean(pinned&&pinned.bytes===bytes.length&&pinned.sha256===digest(bytes)),
    compatible:keyCompatible(key,examMap.get(n),n)};
 });
 for(let i=0;i<installed.length;i++){
  const row=installed[i],path=keysExpected[i];
  if(row?.error||row?.missing){issues.push(record(path,row?.missing?'missing_key':'invalid_key'));continue}
  counts.keys++;
  keyStats.checked++;
  if(row.fingerprintMatches)keyStats.pinnedE9R3Matches++;
  if(row.compatible)keyStats.compatible++;
  else issues.push(record(path,'key_not_compatible_with_exam'));
 }
 const additional=[...available].filter(x=>!expectSet.has(x)&&!x.startsWith('receipt/')&&!x.startsWith('_')).length;
 const otherKeys=[...keyAvailable].filter(x=>!keySet.has(x)&&!x.startsWith('_')).length;
 const critical=issues.length+mismatch.length>0||counts.exam!==30||counts.audio!==450||counts.image!==20||counts.keys!==30;
 return {
  readonly:true,siteID:SITE_ID,source:'existing-preview13-site-wide-Blobs',
  sourceArchive:baseline.sourceArchive,sourceArchiveSha256:baseline.sourceArchiveSha256,
  baselineScope:'450 archive audio fingerprints only; JSON/image archive bytes not independently accessible',
  stores:{candidate:PREVIEW_STORE,keys:KEY_STORE},
  counts,availableKnownKeys:[...available].filter(x=>expectSet.has(x)).length,
  manifest:{present:Boolean(manifest),format:manifest?.format||null,release:manifest?.release||null,files:Object.keys(manifest?.files||{}).length},
  ready:{present:Boolean(ready),confirmed:ready?.confirmed===true,total:ready?.total??null},
  archiveAudioMatched:matchedAudio.length,keyStats,
  extras:{candidate:additional,keyStore:otherKeys},
  discrepancies:[...issues,...mismatch].slice(0,530),discrepancyTotal:issues.length+mismatch.length,
  serverCompatibility:critical?'needs_review':'candidate_consistent',
  copyReady:!critical&&manifest?.files&&Object.keys(manifest.files).length===500&&ready?.confirmed===true&&ready?.total===500,
  productionWrites:0,keysExposed:0,previewWrites:0
 };
}
async function netlifyMetadata(token){
 const auth={Authorization:'Bearer '+token,Accept:'application/json'};
 const read=async path=>{
  const res=await fetch('https://api.netlify.com/api/v1/'+path,{headers:auth});
  if(!res.ok)throw Error('Netlify metadata HTTP '+res.status);
  return res.json();
 };
 const [site,deploy]=await Promise.all([
  read('sites/'+SITE_ID),read('sites/'+SITE_ID+'/deploys/'+ROLLBACK_DEPLOY_ID)
 ]);
 const published=site.published_deploy||{};
 return {
  siteID:site.id||null,siteUrl:site.ssl_url||site.url||null,
  publishedDeployID:published.id||site.published_deploy_id||null,
  rollbackDeployID:deploy.id||null,
  rollbackDeploySHA:deploy.commit_ref||deploy.commit||null,
  rollbackDeployContext:deploy.context||null,
  rollbackSiteMatch:deploy.site_id===SITE_ID,
  rollbackExpectedSHA:ROLLBACK_SHA,
  rollbackSHAConfirmed:(deploy.commit_ref||deploy.commit||'')===ROLLBACK_SHA,
  rollbackExists:deploy.id===ROLLBACK_DEPLOY_ID
 };
}
export async function run(){
 const token=process.env.NETLIFY_AUTH_TOKEN||'';
 if(!token)throw Error('NETLIFY_AUTH_TOKEN_MISSING (no local/Actions credentials provided)');
 if(process.env.OTTO_NETLIFY_SITE_ID&&process.env.OTTO_NETLIFY_SITE_ID!==SITE_ID)throw Error('SITE_ID_GUARD');
 const baseline=JSON.parse(readFileSync(new URL('./otto30-audio-archive-evidence.json',import.meta.url),'utf8'));
 const store=name=>getStore({name,siteID:SITE_ID,token,consistency:'strong'});
 const deploy=await netlifyMetadata(token);
 if(deploy.siteID!==SITE_ID||!deploy.rollbackExists||!deploy.rollbackSiteMatch)throw Error('PRODUCTION_ROLLBACK_DEPLOY_MISMATCH');
 const audit=await auditStores({candidateStore:store(PREVIEW_STORE),keyStore:store(KEY_STORE),baseline});
 const report={at:new Date().toISOString(),head:process.env.GITHUB_SHA||null,deploy,audit,
   productionBackupExecuted:false,productionCopyExecuted:false,
   userDataAccessed:false};
 const destination=process.env.OTTO_SAFE_REPORT_FILE||'';
 if(destination)writeFileSync(destination,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({siteID:SITE_ID,rollbackConfirmed:deploy.rollbackExists&&deploy.rollbackSHAConfirmed,
    counts:audit.counts,archiveAudioMatched:audit.archiveAudioMatched,issues:audit.discrepancyTotal,
    manifestReady:audit.ready.confirmed,copyReady:audit.copyReady,
    encryptedBackupPerformed:false,productionWrites:0},null,2));
 if(!deploy.rollbackSHAConfirmed||!audit.copyReady)process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)run().catch(e=>{
 const message=String(e?.message||'');
 const safe=/^(NETLIFY_AUTH_TOKEN_MISSING.*|SITE_ID_GUARD|PRODUCTION_ROLLBACK_DEPLOY_MISMATCH|baseline_incomplete|Netlify metadata HTTP [0-9]{3})$/.test(message)?message:'REDACTED_INTERNAL_ERROR';
 console.error('OTTO_PREFLIGHT_BLOCKED',safe);process.exitCode=1;
});
