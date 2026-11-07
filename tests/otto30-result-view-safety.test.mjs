import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isUsableScore,normalizeScoreReview,examParticipation,recommendExamPractice} from '../src/features/mockExams30/scoreReview.ts';

const core={
 complete:true,max:100,total:40,passed:false,
 sections:{horen:10,lesen:15,schreiben:10,sprechen:5}
};
test('failed exam with no review never invents points or crashes',()=>{
 assert.equal(isUsableScore(core),true);
 const {review,missingSections}=normalizeScoreReview(undefined);
 assert.equal(review.horen.length,0);
 assert.equal(review.lesen.length,0);
 assert.equal(review.form.length,0);
 assert.equal(review.speech.length,0);
 assert.equal(review.letter.corrections.length,0);
 assert.equal(missingSections.length,5);
});
test('misformatted AI corrections and speech notes are rendered safely',()=>{
 const {review}=normalizeScoreReview({
  horen:[],lesen:[],form:[],
  letter:{feedbackRu:{bad:'shape'},corrections:[{original:{nested:1},corrected:['a'],explanation:null},null]},
  speech:[{taskId:'teil1-intro',practice:'bad string',pronunciationRu:{text:'bad'}},{taskId:'teil2-1',practice:['repeat this',{unsafe:'data'},null]}]
 });
 assert.equal(review.letter.feedbackRu,'');
 assert.equal(review.letter.corrections[0].original,'');
 assert.deepEqual(review.speech[0].practice,[]);
 assert.deepEqual(review.speech[1].practice,['repeat this']);
 assert.equal(review.speech[0].pronunciationRu,'');
});
test('missing or contradictory score fields never appear as genuine grade',()=>{
 assert.equal(isUsableScore({...core,sections:null}),false);
 assert.equal(isUsableScore({...core,total:null}),false);
 assert.equal(isUsableScore({...core,total:70,passed:false}),false);
 assert.equal(isUsableScore({...core,sections:{...core.sections,sprechen:undefined}}),false);
 assert.equal(isUsableScore({...core,total:0,passed:false}),true);
});
test('complete server review is recognized as complete',()=>{
 const make=(count)=>Array.from({length:count},(_,i)=>({id:'q'+i,number:i+1,correctAnswer:true,correct:true,option:'Ja',submitted:1}));
 const {review,missingSections}=normalizeScoreReview({
  horen:make(15),lesen:make(15),
  form:Array.from({length:5},(_,i)=>({label:'Feld'+i,submitted:'A',expected:'A',correct:true})),
  letter:{feedbackRu:'Gut',corrections:[]},
  speech:Array.from({length:5},(_,i)=>({taskId:'t'+i,practice:[],pronunciationRu:'Gut'}))
 });
 assert.deepEqual(missingSections,[]);
 assert.equal(review.horen.length,15);
 assert.equal(review.speech.length,5);
});

test('live score API exposes Hören review as horen, matching browser contract',()=>{
 const code=readFileSync(new URL('../netlify/functions/otto30-score.js',import.meta.url),'utf8');
 assert.match(code,/review:\{horen:values\.objective\.objective\.horen,lesen:/);
 assert.doesNotMatch(code,/review:\{hoeren:values\.objective\.objective\.horen,lesen:/);
});
test('both canonical and legacy server Hören review fields preserve all 15 questions',()=>{
 const make=count=>Array.from({length:count},(_,i)=>({
  id:'otto-a12-01:hoeren:'+String(i+1).padStart(2,'0'),
  number:i+1,correctAnswer:i%3!==0,option:'Antwort '+i,submitted:i%3===0?0:1
 }));
 const source={
  lesen:make(15),form:Array.from({length:5},(_,index)=>({label:'Feld'+index,submitted:'',expected:'X',correct:false})),
  letter:{feedbackRu:'',corrections:[]},speech:Array.from({length:5},(_,i)=>({taskId:'task'+i,practice:[]}))
 };
 for(const label of ['horen','hoeren']){
  const {review,missingSections}=normalizeScoreReview({...source,[label]:make(15)});
  assert.equal(review.horen.length,15);
  assert.ok(!missingSections.includes('Hören'));
  assert.equal(review.horen.filter(q=>!q.correctAnswer).length,5);
 }
});

test('a fully unanswered exam has no fabricated mistakes or correct-answer recommendations',()=>{
 const noAnswer={
  ...core,total:0,
  sections:{horen:0,lesen:0,schreiben:0,sprechen:0},
  review:{
   horen:Array.from({length:15},(_,i)=>({id:'h'+i,number:i+1,submitted:null,correctAnswer:false,option:'Correct hidden'})),
   lesen:Array.from({length:15},(_,i)=>({id:'l'+i,number:i+1,submitted:null,correctAnswer:false,option:'Correct hidden'})),
   form:Array.from({length:5},(_,i)=>({label:'Feld'+i,submitted:'',expected:'private correct',correct:false})),
   letter:{submitted:false,feedbackRu:'Письмо не написано.',corrections:[]},
   speech:Array.from({length:5},(_,i)=>({taskId:'task'+i,recorded:false,practice:['Аудиозапись отсутствует.']}))
  }
 };
 assert.equal(examParticipation(noAnswer).allUnanswered,true);
 const rec=recommendExamPractice(noAnswer).join(' ');
 assert.match(rec,/не выполнен/);
 assert.doesNotMatch(rec,/Correct hidden|private correct|задание 1:/i);
 assert.doesNotMatch(rec,/Аудиозапись отсутствует/);
});
test('wrong submitted answers produce feedback while blank answers are counted as omissions',()=>{
 const review={
  horen:Array.from({length:15},(_,i)=>({id:'h'+i,number:i+1,submitted:i===2?0:null,correctAnswer:false,option:'Hören expected'})),
  lesen:Array.from({length:15},(_,i)=>({id:'l'+i,number:i+1,submitted:null,correctAnswer:false,option:'Lesen expected'})),
  form:Array.from({length:5},(_,i)=>({label:'Feld'+i,submitted:i===1?'Wrong':'',expected:'Expected form',correct:false})),
  letter:{submitted:false,feedbackRu:'Письмо не написано.'},
  speech:Array.from({length:5},(_,i)=>({taskId:'task'+i,recorded:false,practice:['Аудиозапись отсутствует.']}))
 };
 const score={...core,review};
 assert.equal(examParticipation(score).allUnanswered,false);
 const messages=recommendExamPractice(score).join(' ');
 assert.match(messages,/Hören, задание 3/);
 assert.doesNotMatch(messages,/Hören, задание 1:/);
 assert.doesNotMatch(messages,/Lesen, задание 1:/);
 assert.match(messages,/15 заданий не выполнено/);
 assert.match(messages,/формуляр «Feld1»/);
 assert.doesNotMatch(messages,/формуляр «Feld0»/);
});
test('actual false in true-false question is an answer, not an omission',()=>{
 const review={
  horen:Array.from({length:15},(_,i)=>({id:'h'+i,number:i+1,submitted:i===0?false:null,correctAnswer:i!==0,option:'Richtig'})),
  lesen:[],form:[],letter:{},speech:[]
 };
 const score={...core,review};
 assert.equal(examParticipation(score).answeredHoren,1);
 assert.match(recommendExamPractice(score).join(' '),/Hören, задание 1/);
});

test('grounded guidance uses an actual mistaken task and skips omissions',()=>{
 const data={...core,review:{
  horen:Array.from({length:15},(_,i)=>({id:'h'+i,number:i+1,submitted:i===1?0:null,correctAnswer:false,option:'Samstag 9 Uhr'})),
  lesen:[],form:[],letter:{submitted:false},speech:[],
  taskContext:{horen:[{id:'h1',prompt:'Wann ist der Termin?',options:['Montag 10 Uhr','Samstag 9 Uhr']}],lesen:[]}
 }};
 const rec=recommendExamPractice(data).join(' ');
 assert.match(rec,/Uhrzeit/);
 assert.match(rec,/halb neun/);
 assert.match(rec,/Samstag 9 Uhr/);
 assert.doesNotMatch(rec,/Hören №1:/);
});
test('grounded form advice distinguishes a real correction from a blank answer',()=>{
 const data={...core,review:{
  horen:[],lesen:[],form:[{label:'Telefon',submitted:'01761',expected:'01762',correct:false},{label:'Ort',submitted:'',expected:'Bremen',correct:false}],
  letter:{submitted:false},speech:[],taskContext:{horen:[{id:'unused'}],lesen:[]}
 }};
 const rec=recommendExamPractice(data).join(' ');
 assert.match(rec,/Телефонные номера/);
 assert.doesNotMatch(rec,/Bremen/);
});
