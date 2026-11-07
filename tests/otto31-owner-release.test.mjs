import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ownerApprovedExamView,readVerifiedOwnerManifest,verifyOwnerAssetBytes,OTTO31_OWNER_RELEASE} from '../netlify/lib/otto30-private.js';
const sha=x=>createHash('sha256').update(x).digest('hex');
const makeExam=()=>{
 const id='otto-a12-01';
 const mk=(section,partSizes)=>Array.from({length:15},(_,i)=>({
  n:i+1,part:i<partSizes[0]?1:i<partSizes[0]+partSizes[1]?2:3,
  questionId:id+':'+section+':'+String(i+1).padStart(2,'0'),
  prompt:'Test '+i,type:'multiple-choice',options:['A','B'],
  ...(section==='hoeren'?{audioUrl:'audio/exam_01/task_'+String(i+1).padStart(2,'0')+'.mp3',
  audioStatus:'GENERATED_EDGE_TTS_PREVIEW_NOT_PEDAGOGICALLY_APPROVED'}:{})
 }));
 return {id,examReadiness:'BLOCKED_FOR_RELEASE',commercialApproved:false,requiresServerSideScoring:true,
  hoeren:mk('hoeren',[6,4,5]),lesen:mk('lesen',[5,5,5]),
  schreiben:{part1:{rows:Array.from({length:7},()=>({label:'a',value:''}))},part2:{points:['a','b','c']}},
  sprechen:{teil2:[{},{}],teil3:[{imageUrl:'images/sprechen/scene_01.png'},{imageUrl:'images/sprechen/scene_02.png'}]},
  examRules:{release:'BLOCKED'}};
};
test('owner approval creates separate output without modifying any candidate data',()=>{
 const source=makeExam(),original=JSON.stringify(source);
 const view=ownerApprovedExamView(source,1);
 assert.equal(JSON.stringify(source),original);
 assert.equal(view.examReadiness,'OWNER_APPROVED_FOR_RELEASE');
 assert.equal(view.commercialApproved,true);
 assert.equal(view.releaseAuthorization.sourceAuditRun,38604491958);
 assert.equal(view.hoeren[0].audioStatus,'OWNER_APPROVED_FOR_RELEASE');
 assert.equal(OTTO31_OWNER_RELEASE.privateKeysRemainServerOnly,30);
 assert.equal(view.answerKey,undefined);
});
test('invalid archive data never gets release approval',()=>{
 const exam=makeExam();exam.answerKey={1:'A'};
 assert.throws(()=>ownerApprovedExamView(exam,1),/private_answer_field/);
});
test('asset read fails closed for tampered source',()=>{
 const bytes=Buffer.from('candidate bytes');
 const manifest={files:{'exams/exam_01.json':{bytes:bytes.length,sha256:sha(bytes)}}};
 assert.deepEqual(verifyOwnerAssetBytes(manifest,'exams/exam_01.json',bytes),bytes);
 assert.throws(()=>verifyOwnerAssetBytes(manifest,'exams/exam_01.json',Buffer.from('different bytes')));
 assert.throws(()=>verifyOwnerAssetBytes(manifest,'exams/exam_01.key.json',bytes));
});
test('unverified owner manifest fails closed',async()=>{
 const store={get:async key=>key==='_manifest_owner_v1'?{format:'invalid'}:{confirmed:true,total:500}};
 assert.equal(await readVerifiedOwnerManifest(store),null);
});
