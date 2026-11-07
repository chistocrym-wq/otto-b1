#!/usr/bin/env node
/**
 * OTTO 30 E9R3 migration preflight for a DISPOSABLE Netlify site only.
 * NEVER writes to production. Default: local hash verification, no network.
 * Usage: node scripts/otto30-staging-migrate.mjs <asset-root> <manifest.json> <key-root> [--apply-disposable]
 * Only --apply-disposable can write, guarded by two explicitly different site IDs.
 */
import {readFileSync,existsSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {E9R3_KEY_FILES} from '../netlify/lib/otto30-key-fingerprints.js';
const [assetsArg,manifestArg,keysArg,mode]=process.argv.slice(2);
if(!assetsArg||!manifestArg||!keysArg||!['',undefined,'--apply-disposable'].includes(mode)){
 console.error('Usage: node scripts/otto30-staging-migrate.mjs <asset-root> <manifest.json> <key-root> [--apply-disposable]');
 process.exit(2);
}
const digest=b=>createHash('sha256').update(b).digest('hex');
const root=resolve(assetsArg),keyRoot=resolve(keysArg);
const manifest=JSON.parse(readFileSync(resolve(manifestArg),'utf8'));
const expected=[];
for(let n=1;n<=30;n++){
 const xx=String(n).padStart(2,'0');
 expected.push('exams/exam_'+xx+'.json');
 for(let j=1;j<=15;j++)expected.push('audio/exam_'+xx+'/task_'+String(j).padStart(2,'0')+'.mp3');
}
for(let n=1;n<=20;n++)expected.push('images/sprechen/scene_'+String(n).padStart(2,'0')+'.png');
if(manifest?.format!=='OTTO30_OWNER_PRIVATE_CANDIDATE_V1'||manifest.release!=='BLOCKED_FOR_RELEASE'||manifest.localOnly!==true||manifest.hasAnswerKeys!==false)throw Error('unapproved_or_invalid_manifest');
if(Object.keys(manifest.files||{}).length!==500)throw Error('manifest_must_have_500_files');
function safeRead(base,path){
 const resolved=resolve(base,path);
 if(!resolved.startsWith(base+sep)||!existsSync(resolved))throw Error('missing_or_unsafe_file:'+path);
 return readFileSync(resolved);
}
const assets=[];
for(const file of expected){
 const row=manifest.files[file];
 if(!row||!/^[0-9a-f]{64}$/i.test(row.sha256)||!Number.isSafeInteger(row.bytes))throw Error('invalid_manifest_entry:'+file);
 const bytes=safeRead(root,file);
 if(bytes.length!==row.bytes||digest(bytes)!==row.sha256)throw Error('asset_checksum_mismatch:'+file);
 assets.push({file,bytes,hash:row.sha256});
}
const keys=[];
for(let n=1;n<=30;n++){
 const file='exam_'+String(n).padStart(2,'0')+'.key.json';
 const f=E9R3_KEY_FILES[n];
 if(!f||!/^[0-9a-f]{64}$/i.test(f.sha256))throw Error('missing_trusted_key_fingerprint:'+n);
 const bytes=safeRead(keyRoot,file);
 if(bytes.length!==f.bytes||digest(bytes)!==f.sha256)throw Error('key_checksum_mismatch:'+n);
 const key=JSON.parse(bytes.toString('utf8'));
 if(key.status!=='PRIVATE_SERVER_ONLY'||key.examId!=='otto-a12-'+String(n).padStart(2,'0')||key.keyVersion!=='OTTO30-E9R3-EDITORIAL-20261011_PRIVATE_UNAPPROVED')throw Error('key_version_mismatch:'+n);
 keys.push({file,bytes,hash:f.sha256});
}
console.log(JSON.stringify({assetsVerified:assets.length,privateKeysVerified:keys.length,sourceRelease:manifest.release,writeMode:mode==='--apply-disposable'?'disposable-site-only':'read-only'}));
if(mode!=='--apply-disposable')process.exit(0);
const disposable=process.env.OTTO30_MIGRATION_DISPOSABLE_SITE_ID;
const live=process.env.OTTO30_LIVE_SITE_ID;
const token=process.env.NETLIFY_AUTH_TOKEN;
if(!disposable||!live||!token||disposable===live||process.env.OTTO30_MIGRATION_DISPOSABLE_CONFIRMED!=='yes')throw Error('missing_disposable_site_guards');
const {getStore}=await import('@netlify/blobs');
const candidates=getStore({name:'otto30-production-owner-private-v1',siteID:disposable,token});
const privateKeys=getStore({name:'otto30-production-private-score-keys-v1',siteID:disposable,token});
async function resumeVerified(store,key,bytes,hash){
 const existing=await store.get(key,{type:'arrayBuffer'});
 if(existing){
  const got=Buffer.from(existing);
  if(got.length!==bytes.length||digest(got)!==hash)throw Error('refuse_overwrite_conflicting_blob:'+key);
  return false;
 }
 await store.set(key,bytes);
 const check=await store.get(key,{type:'arrayBuffer'});
 if(!check||Buffer.from(check).length!==bytes.length||digest(Buffer.from(check))!==hash)throw Error('remote_verification_failed:'+key);
 return true;
}
let uploadedAssets=0,uploadedKeys=0;
for(const row of assets)if(await resumeVerified(candidates,row.file,row.bytes,row.hash))uploadedAssets++;
for(const row of keys)if(await resumeVerified(privateKeys,row.file,row.bytes,row.hash))uploadedKeys++;
// No _owner_private_ready_v1 marker, no release flags or editorial status changes.
console.log(JSON.stringify({target:'disposable-site',assetsVerified:500,keysVerified:30,uploadedAssets,uploadedKeys,releaseActivated:false,readyMarkerWritten:false}));
