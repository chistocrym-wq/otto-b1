#!/usr/bin/env node
// Safe offline inventory only. No network, Netlify, or Production writes.
import {readFileSync,statSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const [rootArg,manifestArg]=process.argv.slice(2);
if(!rootArg||!manifestArg){console.error('Usage: node scripts/otto30-release-preflight.mjs <extracted-assets-directory> <manifest.json>');process.exit(2);}
const root=resolve(rootArg),manifest=JSON.parse(readFileSync(resolve(manifestArg),'utf8'));
const expected=[];
for(let n=1;n<=30;n++){
 const id=String(n).padStart(2,'0');
 expected.push('exams/exam_'+id+'.json');
 for(let q=1;q<=15;q++)expected.push('audio/exam_'+id+'/task_'+String(q).padStart(2,'0')+'.mp3');
}
for(let n=1;n<=20;n++)expected.push('images/sprechen/scene_'+String(n).padStart(2,'0')+'.png');
if(expected.length!==500||Object.keys(manifest.files||{}).length!==500)throw Error('manifest_count_mismatch');
let bad=[];
for(const file of expected){
 const row=manifest.files[file];
 if(!row||!Number.isSafeInteger(row.bytes)||!/^[0-9a-f]{64}$/i.test(row.sha256||'')){bad.push({file,issue:'invalid_manifest'});continue;}
 const path=resolve(root,file);
 if(!path.startsWith(root+'/')||!existsSync(path)){bad.push({file,issue:'missing'});continue;}
 const size=statSync(path).size;
 if(size!==row.bytes){bad.push({file,issue:'size_mismatch'});continue;}
 const sha=createHash('sha256').update(readFileSync(path)).digest('hex');
 if(sha.toLowerCase()!==row.sha256.toLowerCase())bad.push({file,issue:'sha256_mismatch'});
}
console.log(JSON.stringify({expected:500,verified:500-bad.length,failures:bad.slice(0,30),readonly:true},null,2));
if(bad.length)process.exitCode=1;
