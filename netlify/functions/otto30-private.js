import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { checkExamAccess, validSameOriginMutation, pathKind, validatePublicExamData, bytesLookCorrect, expectedPrivatePaths, EXAM30_STORE, READY_KEY, MAX_FILE_BYTES, readVerifiedOwnerManifest, verifyOwnerAssetBytes, ownerApprovedExamView } from '../lib/otto30-private.js';

const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const mediaHeaders=kind=>({'Content-Type':kind==='audio'?'audio/mpeg':kind==='image'?'image/png':'application/json; charset=utf-8','Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'});
const expected=new Set(expectedPrivatePaths());
const manifestKey='_manifest_owner_v1';
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const receiptKey=path=>'receipt/'+path;
const validHash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/i.test(v);
async function readManifest(store){
 const manifest=await store.get(manifestKey,{type:'json'});
 if(manifest?.format!=='OTTO30_OWNER_PRIVATE_CANDIDATE_V1'||
    manifest?.release!=='BLOCKED_FOR_RELEASE'||manifest.localOnly!==true||
    manifest.hasAnswerKeys!==false||Object.keys(manifest.files||{}).length!==500)return null;
 return manifest;
}
export default async function handler(req,context){
 const decision=await checkExamAccess(req,context);
 if(!decision.access){
  if(decision.status===503)console.warn('OTTO30 exam access verification temporarily unavailable');
  return respond({code:decision.code},decision.status);
 }
 const {owner,config}=decision.access;
 const url=new URL(req.url),operation=url.searchParams.get('op')||'status';
 const store=getStore(config.candidateStore);
 try {
  if(req.method==='GET'){
   const manifest=await readVerifiedOwnerManifest(store);
   const available=Boolean(manifest);
   if(operation==='status')return respond({authorized:true,ready:available,expected:500,ownerUploadEnabled:owner});
   if(!available)return respond({code:'private_package_not_ready'},409);
   if(operation==='exam'){
    const n=Number(url.searchParams.get('number'));
    if(!Number.isInteger(n)||n<1||n>30)return respond({code:'invalid_exam'},400);
    const path='exams/exam_'+String(n).padStart(2,'0')+'.json';
    const bytes=await store.get(path,{type:'arrayBuffer'});
    if(!bytes)return respond({code:'exam_unavailable'},404);
    const verified=verifyOwnerAssetBytes(manifest,path,bytes);
    const source=JSON.parse(verified.toString('utf8'));
    return respond(ownerApprovedExamView(source,n));
   }
   if(operation==='media'){
    const path=url.searchParams.get('path')||'';
    const kind=pathKind(path);
    if(!kind||kind==='exam')return respond({code:'invalid_media'},400);
    const bytes=await store.get(path,{type:'arrayBuffer'});
    if(!bytes)return respond({code:'media_unavailable'},404);
    const verified=verifyOwnerAssetBytes(manifest,path,bytes);
    return new Response(verified,{status:200,headers:mediaHeaders(kind)});
   }
   return respond({code:'invalid_operation'},400);
  }
  if(req.method!=='POST')return respond({code:'method_not_allowed'},405);
  if(!owner)return respond({code:'owner_admin_only'},403);
  if(!validSameOriginMutation(req))return respond({code:'invalid_origin'},403);
  if(operation==='manifest'){
   const bytes=Buffer.from(await req.arrayBuffer());
   if(bytes.length>160000)return respond({code:'manifest_too_large'},413);
   const manifest=JSON.parse(bytes.toString('utf8'));
   if(manifest?.format!=='OTTO30_OWNER_PRIVATE_CANDIDATE_V1'||
      manifest?.release!=='BLOCKED_FOR_RELEASE'||manifest.localOnly!==true||
      manifest.hasAnswerKeys!==false||Object.keys(manifest.files||{}).length!==500||
      [...expected].some(path=>!validHash(manifest.files[path]?.sha256)||
          !Number.isSafeInteger(manifest.files[path]?.bytes)||manifest.files[path].bytes<1||
          manifest.files[path].bytes>MAX_FILE_BYTES)||
      Object.keys(manifest.files).some(path=>!expected.has(path)))
     return respond({code:'invalid_manifest'},400);
   // Never delete existing verified files on interrupted upload. Invalidate previous ready.
   await store.setJSON(READY_KEY,{confirmed:false,total:0});
   await store.setJSON(manifestKey,manifest);
   return respond({ok:true,expected:500});
  }
  const manifest=await readManifest(store);
  if(!manifest)return respond({code:'upload_manifest_first'},409);
  if(operation==='upload'){
   const path=url.searchParams.get('path')||'';
   const kind=pathKind(path),target=manifest.files[path];
   if(!kind||!target||!expected.has(path))return respond({code:'invalid_path'},400);
   if(Number(req.headers.get('content-length')||0)>MAX_FILE_BYTES)return respond({code:'too_large'},413);
   const bytes=Buffer.from(await req.arrayBuffer());
   if(bytes.length!==target.bytes||bytes.length>MAX_FILE_BYTES||!bytesLookCorrect(kind,bytes)||
      digest(bytes)!==target.sha256)return respond({code:'integrity_check_failed'},422);
   if(kind==='exam'){
    const n=Number(path.match(/exam_(\d+)\.json$/)?.[1]);
    validatePublicExamData(JSON.parse(bytes.toString('utf8')),n);
   }
   await store.set(path,bytes);
   await store.setJSON(receiptKey(path),{sha256:target.sha256,bytes:bytes.length});
   return respond({ok:true,path});
  }
  if(operation==='verify'){
   const path=url.searchParams.get('path')||'';
   if(!expected.has(path))return respond({code:'invalid_path'},400);
   const receipt=await store.get(receiptKey(path),{type:'json'});
   const matches=receipt?.sha256===manifest.files[path].sha256&&receipt?.bytes===manifest.files[path].bytes;
   return respond({ok:matches,path});
  }
  if(operation==='finalize'){
   // Twenty bounded batches avoid timeouts while checking all 500 verified receipts.
   const batch=Number(url.searchParams.get('batch'));
   if(!Number.isInteger(batch)||batch<0||batch>=20)return respond({code:'invalid_batch'},400);
   const paths=[...expected].slice(batch*25,(batch+1)*25);
   for(const path of paths){
    const receipt=await store.get(receiptKey(path),{type:'json'});
    if(receipt?.sha256!==manifest.files[path].sha256||
       receipt?.bytes!==manifest.files[path].bytes)
      return respond({code:'incomplete_upload',batch,path},409);
   }
   await store.setJSON('_verified_batch/'+batch,{hash:digest(Buffer.from(JSON.stringify(manifest.files))),count:25});
   return respond({ok:true,batch});
  }
  if(operation==='complete'){
   const hash=digest(Buffer.from(JSON.stringify(manifest.files)));
   for(let batch=0;batch<20;batch++){
    const confirmed=await store.get('_verified_batch/'+batch,{type:'json'});
    if(confirmed?.hash!==hash||confirmed?.count!==25)
      return respond({code:'missing_verified_batch',batch},409);
   }
   await store.setJSON(READY_KEY,{confirmed:true,total:500,hash,at:new Date().toISOString()});
   return respond({ok:true,ready:true,confirmed:500});
  }
  return respond({code:'invalid_operation'},400);
 }catch(e){
  console.error('Owner-private exam store operation failed',String(e?.message||e));
  return respond({code:'private_store_unavailable'},503);
 }
}
export const config={path:'/api/otto30-private'};
