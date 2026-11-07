import test from 'node:test';
import assert from 'node:assert/strict';
import {assessObjective} from '../netlify/functions/otto30-score.js';
test('owner scoring: verified objective key yields 25/25 per section, five-point form (synthetic fixture only)',async()=>{
 const examId='otto-a12-01';
 const tasks=section=>Array.from({length:15},(_,i)=>({questionId:examId+':'+section+':'+String(i+1).padStart(2,'0'),type:'multiple-choice',options:['Alpha','Bravo','Charlie']}));
 const row=Array.from({length:7},(_,index)=>({label:'Row'+index,index}));
 const candidate={hoeren:tasks('hoeren'),lesen:tasks('lesen'),schreiben:{part1:{rows:row}}};
 const mk=()=>Object.fromEntries(Array.from({length:15},(_,i)=>[String(i+1),{type:'multiple-choice',answerIndex:1}]));
 const keys={hoeren:mk(),lesen:mk(),schreiben:{part1:row.map(r=>({index:r.index,label:r.label,prefilled:r.index<2,expected:r.index<2?null:'Expected'+r.index}))}};
 const answers=section=>Object.fromEntries(tasks(section).map(q=>[q.questionId,1]));
 const payload={horen:answers('hoeren'),lesen:answers('lesen'),form:Object.fromEntries(row.slice(2).map(r=>[r.index,'Expected'+r.index]))};
 const result=await assessObjective(candidate,keys,payload);
 assert.equal(result.objectivePoints.horen,25);assert.equal(result.objectivePoints.lesen,25);assert.equal(result.formPoints,5);
 payload.horen[candidate.hoeren[0].questionId]=0;
 const changed=await assessObjective(candidate,keys,payload);
 assert.ok(changed.objectivePoints.horen<25);
 assert.equal(changed.objectivePoints.lesen,25);
 assert.equal(changed.objective.horen[0].correctAnswer,false);
});
test('server rejects foreign answer identifiers and malformed answer keys',async()=>{
 const candidate={hoeren:[],lesen:[],schreiben:{part1:{rows:[]}}};
 await assert.rejects(assessObjective(candidate,{},{horen:{'foreign_question':true},lesen:{},form:{}}),/foreign_question/);
});
