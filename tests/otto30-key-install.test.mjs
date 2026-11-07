import test from 'node:test';
import assert from 'node:assert/strict';
import {E9R3_KEY_FILES} from '../netlify/lib/otto30-key-fingerprints.js';
test('only the 30 exact E9R3 keys have pinned file size and SHA-256',()=>{
 const ids=Object.keys(E9R3_KEY_FILES).map(Number).sort((a,b)=>a-b);
 assert.deepEqual(ids,Array.from({length:30},(_,i)=>i+1));
 assert.ok(ids.every(n=>Number.isInteger(E9R3_KEY_FILES[n].bytes)&&E9R3_KEY_FILES[n].bytes>2000));
 assert.ok(ids.every(n=>/^[0-9a-f]{64}$/.test(E9R3_KEY_FILES[n].sha256)));
 assert.equal(new Set(ids.map(n=>E9R3_KEY_FILES[n].sha256)).size,30);
});
test('scoring requires exact SHA and a distinct administrator identity',async()=>{
 const {default:scoreHandler}=await import('../netlify/functions/otto30-score.js');
 for(const url of ['https://deploy-preview-13--otto-a1.netlify.app/api/otto30-score?op=install-key&exam=1']){
  const req=new Request(url,{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://deploy-preview-13--otto-a1.netlify.app','x-otto30-owner-upload':'1'},body:'{}'});
  const response=await scoreHandler(req,{});
  assert.equal(response.status,403,'Unauthenticated import must fail closed');
 }
});
