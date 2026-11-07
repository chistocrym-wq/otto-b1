import test from 'node:test';
import assert from 'node:assert/strict';
import {expectedPrivatePaths,pathKind,validatePublicExamData,getOwnerSession} from '../netlify/lib/otto30-private.js';

test('strict 30-exam private asset catalogue',()=>{
 const paths=expectedPrivatePaths();
 assert.equal(paths.length,500);
 assert.equal(new Set(paths).size,500);
 assert.equal(paths.filter(x=>pathKind(x)==='exam').length,30);
 assert.equal(paths.filter(x=>pathKind(x)==='audio').length,450);
 assert.equal(paths.filter(x=>pathKind(x)==='image').length,20);
 for(const path of ['../.env','audio/exam_31/task_01.mp3','audio/exam_01/task_16.mp3','images/sprechen/scene_21.png','exams/exam_01.key.json','receipt/audio/exam_01/task_01.mp3'])assert.equal(pathKind(path),null);
});
test('owner route fails closed without configured allowlist, even with a guessed ID',()=>{
 const req=new Request('https://deploy-preview-13--otto-a1.netlify.app/api/otto30-private');
 const existing=process.env.OTTO30_PREVIEW13_OWNER_IDS;
 try{delete process.env.OTTO30_PREVIEW13_OWNER_IDS;assert.equal(getOwnerSession(req),null);}
 finally{if(existing===undefined)delete process.env.OTTO30_PREVIEW13_OWNER_IDS;else process.env.OTTO30_PREVIEW13_OWNER_IDS=existing;}
});
test('exam validation rejects answer keys and non-owner release statuses',()=>{
 assert.throws(()=>validatePublicExamData({id:'otto-a12-01',examReadiness:'PUBLIC'},1));
 assert.throws(()=>validatePublicExamData({id:'otto-a12-01',examReadiness:'BLOCKED_FOR_RELEASE',commercialApproved:false,requiresServerSideScoring:true,examRules:{release:'BLOCKED'},answerKey:{A:1}},1));
});

test('new scoring API refuses anonymous access to keys, attempts, scoring and result',async()=>{
 const {default:handler}=await import('../netlify/functions/otto30-score.js');
 for(const operation of ['status','inventory','result']){
  const req=new Request('https://deploy-preview-13--otto-a1.netlify.app/api/otto30-score?op='+operation+'&exam=1');
  const response=await handler(req,{});
  assert.equal(response.status,403,operation);
 }
 for(const operation of ['begin','objective','letter','speech']){
  const req=new Request('https://deploy-preview-13--otto-a1.netlify.app/api/otto30-score?op='+operation+'&exam=1',{
   method:'POST',headers:{'Content-Type':'application/json'},body:'{}'
  });
  const response=await handler(req,{});
  assert.equal(response.status,403,operation);
 }
});
