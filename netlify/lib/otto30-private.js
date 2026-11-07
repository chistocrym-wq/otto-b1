import {createHash} from 'node:crypto';
import { readSession } from './otto-session.js';
import { preview20Guest } from './preview20-guest-trial.js';
import { requireOttoTrainingAccess } from './otto-ai-access.js';
import {getOtto30Config,otto30Env,otto30AdminAllowed} from './otto30-storage-config.js';

export const EXAM30_HOST = 'deploy-preview-13--otto-a1.netlify.app';
export const EXAM30_STORE = 'otto30-preview13-owner-private-v1';
export const READY_KEY = '_owner_private_ready_v1';
export const MAX_FILE_BYTES = 2_500_000;
const examRe = /^exams\/exam_(0[1-9]|[12][0-9]|30)\.json$/;
const audioRe = /^audio\/exam_(0[1-9]|[12][0-9]|30)\/task_(0[1-9]|1[0-5])\.mp3$/;
const imageRe = /^images\/sprechen\/scene_(0[1-9]|1[0-9]|20)\.png$/;
const secretKey = /^(?:answer|answerIndex|correct|correctIndex|correctAnswer|answerKey|solution|expected|reviewTranscript|solutions|scoringKey)$/i;

export function expectedPrivatePaths() {
  const paths=[];
  for(let n=1;n<=30;n++){
    const xx=String(n).padStart(2,'0');
    paths.push('exams/exam_'+xx+'.json');
    for(let q=1;q<=15;q++)paths.push('audio/exam_'+xx+'/task_'+String(q).padStart(2,'0')+'.mp3');
  }
  for(let n=1;n<=20;n++)paths.push('images/sprechen/scene_'+String(n).padStart(2,'0')+'.png');
  return paths;
}
export function pathKind(path) {
  if(typeof path!=='string'||path.length>95||path.includes('..'))return null;
  if(examRe.test(path))return 'exam';
  if(audioRe.test(path))return 'audio';
  if(imageRe.test(path))return 'image';
  return null;
}
export function getOwnerSession(req){
 const config=getOtto30Config(req);if(!config)return null;
 let session;try{session=readSession(req)}catch{return null}
 return otto30AdminAllowed(session,config)?session:null;
}
/**
 * 403 = actual access denial. 503 = database/session status cannot be verified.
 * Fail closed on both; never grant access by assuming a paid entitlement.
 */
export async function checkExamAccess(req,context,{
 resolveConfig=getOtto30Config,
 readSignedSession=readSession,
 isOwner=otto30AdminAllowed,
 getFlag=otto30Env,
 checkTraining=requireOttoTrainingAccess,
}={}){
 let config;
 try{config=resolveConfig(req);}catch{return {access:null,status:503,code:'exam_configuration_unavailable'};}
 if(!config)return {access:null,status:403,code:'not_authorized'};
 let session;
 try{session=readSignedSession(req);}catch{return {access:null,status:503,code:'session_unavailable'};}
 if(!session?.sub)return {access:null,status:403,code:'not_authorized'};
 if(isOwner(session,config))return {access:{session,owner:true,config}};
 if(getFlag(config.studentFlag)!=='enabled')
  return {access:null,status:403,code:'exam_student_access_disabled'};
 let denied;
 try{denied=await checkTraining(req,context);}
 catch{return {access:null,status:503,code:'exam_access_verification_unavailable'};}
 if(denied){
  if(denied.status>=500)return {access:null,status:503,code:'exam_access_verification_unavailable'};
  if(denied.status===401)return {access:null,status:401,code:'not_authenticated'};
  return {access:null,status:403,code:'training_access_required'};
 }
 return {access:{session,owner:false,config}};
}
// Preserve the existing helper contract for other consumers and old tests.
export async function getExamAccess(req,context){
 return (await checkExamAccess(req,context)).access;
}
export function validSameOriginMutation(req){
 const config=getOtto30Config(req);
 return Boolean(config)&&req.headers.get('origin')==='https://'+config.host&&req.headers.get('x-otto30-owner-upload')==='1';
}
export function validatePublicExamData(data,n){
  if(!Number.isInteger(n)||n<1||n>30)throw Error('invalid_exam');
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('invalid_json');
  const xx=String(n).padStart(2,'0');
  if(data.id!=='otto-a12-'+xx||data.examReadiness!=='BLOCKED_FOR_RELEASE'||
     data.commercialApproved!==false||data.requiresServerSideScoring!==true||
     data.examRules?.release!=='BLOCKED')throw Error('exam_not_safe');
  const walk=(x,depth=0)=>{
    if(depth>30)throw Error('invalid_depth');
    if(!x||typeof x!=='object')return;
    if(Array.isArray(x)){for(const y of x)walk(y,depth+1);return;}
    for(const [key,value] of Object.entries(x)){
      if(secretKey.test(key))throw Error('private_answer_field');
      walk(value,depth+1);
    }
  };
  walk(data);
  for(const [section,expected] of [['hoeren',[6,4,5]],['lesen',[5,5,5]]]){
    const arr=data[section];
    if(!Array.isArray(arr)||arr.length!==15)throw Error('invalid_'+section);
    const seen=new Set();
    for(let i=0;i<arr.length;i++){
      const t=arr[i],qid='otto-a12-'+xx+':'+section+':'+String(i+1).padStart(2,'0');
      if(!t||t.n!==i+1||t.questionId!==qid||seen.has(qid)||
         ![1,2,3].includes(t.part)||!['multiple-choice','true-false'].includes(t.type)||
         typeof t.prompt!=='string'||!t.prompt.trim())throw Error('invalid_question');
      seen.add(qid);
      if(t.type==='multiple-choice'&&(!Array.isArray(t.options)||t.options.length<2))throw Error('invalid_choices');
      if(section==='hoeren'&&t.audioUrl!=='audio/exam_'+xx+'/task_'+String(i+1).padStart(2,'0')+'.mp3')
        throw Error('invalid_audio_mapping');
    }
    expected.forEach((num,i)=>{if(arr.filter(t=>t.part===i+1).length!==num)throw Error('invalid_teil_counts');});
  }
  if(![6,7].includes(data.schreiben?.part1?.rows?.length)||
     data.schreiben?.part2?.points?.length!==3||
     data.sprechen?.teil2?.length!==2||data.sprechen?.teil3?.length!==2)
    throw Error('invalid_section');
  for(const t of data.sprechen.teil3)if(!imageRe.test(t.imageUrl))throw Error('invalid_image_mapping');
  return data;
}
export function bytesLookCorrect(kind,bytes) {
  const d=new Uint8Array(bytes);
  if(kind==='image')return d.length>8&&[137,80,78,71,13,10,26,10].every((v,i)=>d[i]===v);
  if(kind==='audio')return d.length>32&&((d[0]===73&&d[1]===68&&d[2]===51)||(d[0]===255&&(d[1]&224)===224));
  return kind==='exam'&&d.length>0&&d.length<90_000;
}

/**
 * The owner authorized commercial delivery of the existing, audited OTTO30
 * package on 2026-10-14. This is a separate delivery approval, NOT a change to
 * the original blocked candidate JSON or the separate private answer keys.
 * Approval references the successful read-only audit, not an independent
 * assessment of the entire source archive or third-party licenses.
 */
export const OTTO31_OWNER_RELEASE = Object.freeze({
 id:'OTTO31-OWNER-20261014-AUDIT-38604491958',
 sourceAuditRun:38604491958,
 sourceSiteId:'6cd5980e-1876-40f3-85e4-b227362b4d3d',
 approvedSourceAssets:500,
 privateKeysRemainServerOnly:30
});
const hashBytes=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifestKey='_manifest_owner_v1';
export async function readVerifiedOwnerManifest(store){
 const [manifest,ready]=await Promise.all([
  store.get(manifestKey,{type:'json'}),
  store.get(READY_KEY,{type:'json'})
 ]);
 const files=manifest?.files;
 if(manifest?.format!=='OTTO30_OWNER_PRIVATE_CANDIDATE_V1'||
    manifest?.release!=='BLOCKED_FOR_RELEASE'||manifest?.localOnly!==true||
    manifest?.hasAnswerKeys!==false||
    !files||typeof files!=='object'||Array.isArray(files)||
    Object.keys(files).length!==500||
    ready?.confirmed!==true||ready?.total!==500)return null;
 const paths=expectedPrivatePaths();
 if(paths.length!==500||paths.some(path=>{
   const f=files[path];
   return !f||!Number.isSafeInteger(f.bytes)||f.bytes<1||
     f.bytes>MAX_FILE_BYTES||!/^[a-f0-9]{64}$/i.test(f.sha256||'');
 }))return null;
 if(ready.hash!==hashBytes(Buffer.from(JSON.stringify(files))))return null;
 return manifest;
}
export function verifyOwnerAssetBytes(manifest,path,bytes){
 if(!pathKind(path))throw Error('owner_asset_path_denied');
 const info=manifest?.files?.[path];
 if(!info||!bytes||bytes.byteLength!==info.bytes||
    hashBytes(Buffer.from(bytes))!==info.sha256)
   throw Error('owner_asset_sha256_mismatch');
 return Buffer.from(bytes);
}
/**
 * Never mutate or rewrite the archived candidate: derive an approved delivery
 * view only from schema-valid, manifest-hash-verified server-side source bytes.
 * This metadata is not a substitute for the Production flags and subscription.
 */
export function ownerApprovedExamView(source,n){
 validatePublicExamData(source,n);
 if(source.hoeren.some(q=>q.audioStatus!=='GENERATED_EDGE_TTS_PREVIEW_NOT_PEDAGOGICALLY_APPROVED'))
   throw Error('unexpected_audio_provenance');
 return {
  ...source,
  examReadiness:'OWNER_APPROVED_FOR_RELEASE',
  commercialApproved:true,
  examRules:{...source.examRules,release:'OWNER_APPROVED'},
  hoeren:source.hoeren.map(q=>({...q,audioStatus:'OWNER_APPROVED_FOR_RELEASE'})),
  sprechen:{
   ...source.sprechen,
   teil3:source.sprechen.teil3.map(q=>({...q,
     imageApproved:true,imageReviewStatus:'OWNER_APPROVED_FOR_RELEASE'}))
  },
  releaseAuthorization:{
   id:OTTO31_OWNER_RELEASE.id,
   sourceAuditRun:OTTO31_OWNER_RELEASE.sourceAuditRun
  }
 };
}
