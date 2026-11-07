import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const SOURCE=fs.readFileSync(new URL('../src/lib/taskResultsBridge.ts',import.meta.url),'utf8');
const snapshot={readVerifiedTaskResultsServerJournals:()=>[]};
const compiled=ts.transpileModule(SOURCE,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const exports={};
vm.runInNewContext('(function(module,exports,require){'+compiled+'\n})',{}, {timeout:3000})({exports},exports,id=>{if(id==='./taskResultsServerSnapshot')return snapshot;throw Error(id)});
const {futureTaskResultsKey,mergeTaskResultsForUser,legacyBelongsToUser}=exports;
const LEGACY_KEY='otto-module-task-completion-v1';
const attempt=(attemptId,taskId,score,total=1,at='2026-10-20T10:00:00.000Z',options={})=>({attemptId,taskId,score,total,at,...options});
const legacy=(score,total=1,at='2026-10-20T10:00:00.000Z')=>({score,total,status:score===total?'correct':score===0?'incorrect':'reviewed',attempts:[{score,total,at}],corrected:false,firstScore:score,firstTotal:total});
const store=(entries={})=>{
 const map=new Map(Object.entries(entries)),before=()=>JSON.stringify([...map.entries()]);
 return {storage:{getItem:key=>map.get(key)??null,key:index=>[...map.keys()][index]??null,get length(){return map.size}},
 map,before};
};
const journal=(owner,module,...attempts)=>JSON.stringify({schemaVersion:2,ownerUserId:owner,module,attempts});
const state=(user='u1')=>({'otto-state-owner-v2':user});

test('01 legacy-only completion remains readable without fabricating a result',()=>{
 const {storage,before}=store(state());const baseline=before();
 assert.equal(legacyBelongsToUser('u1',storage),true);
 assert.deepEqual(Object.keys(mergeTaskResultsForUser('horen','u1',{},storage)),[]);
 assert.equal(before(),baseline);
});
test('02 only future records are readable for four modules without writing',()=>{
 for(const module of ['horen','lesen','schreiben','sprechen']){
  const k=futureTaskResultsKey('u1',module,'shard1');
  const {storage,before}=store({...state(),[k]:journal('u1',module,attempt('one',module+'-task',1))});
  const old=before();
  const results=mergeTaskResultsForUser(module,'u1',{},storage);
  assert.equal(results[module+'-task'].attempts.length,1);
  assert.equal(results[module+'-task'].status,'correct');
  assert.equal(before(),old);
 }
});
test('03 legacy and future independent attempts unite without score truncation',()=>{
 const k=futureTaskResultsKey('u1','horen','a');
 const {storage}=store({...state(),[k]:journal('u1','horen',attempt('next','q',1,1,'2026-10-21T10:00:00Z'))});
 const old={q:legacy(0)};
 const result=mergeTaskResultsForUser('horen','u1',old,storage).q;
 assert.equal(result.attempts.length,2);assert.equal(result.score,1);assert.equal(result.firstScore,0);
 assert.equal(old.q.attempts.length,1);
});
test('04 partially transferred legacy-mirror rows dedupe exactly by origin content',()=>{
 const k=futureTaskResultsKey('u1','lesen','shard');
 const old={q:legacy(0)};
 const {storage}=store({...state(),[k]:journal('u1','lesen',attempt('copied','q',0,1,'2026-10-20T10:00:00.000Z',{legacyMirror:true}),attempt('new','q',1,1,'2026-10-21T10:00:00Z'))});
 assert.equal(mergeTaskResultsForUser('lesen','u1',old,storage).q.attempts.length,2);
});
test('05 legacy client adds result after rollback: no phantom attempt',()=>{
 const k=futureTaskResultsKey('u1','sprechen','future');
 const future=journal('u1','sprechen',attempt('copy','q',0,1,'2026-10-20T10:00:00.000Z',{legacyMirror:true}));
 const {storage}=store({...state(),[k]:future});
 const old={q:legacy(0)};
 old.q.attempts.push({score:1,total:1,at:'2026-10-21T10:00:00Z'});
 old.q.score=1;old.q.status='correct';
 const result=mergeTaskResultsForUser('sprechen','u1',old,storage).q;
 assert.equal(result.attempts.length,2);assert.equal(result.score,1);
});
test('06 bridge then new version: repeated same journal ID never counts twice',()=>{
 const a=futureTaskResultsKey('u1','horen','a'),b=futureTaskResultsKey('u1','horen','b');
 const e=attempt('stable','q',1);
 const {storage,before}=store({...state(),[a]:journal('u1','horen',e),[b]:journal('u1','horen',e)});
 const initial=before();
 assert.equal(mergeTaskResultsForUser('horen','u1',{},storage).q.attempts.length,1);
 assert.equal(mergeTaskResultsForUser('horen','u1',{},storage).q.attempts.length,1);
 assert.equal(before(),initial);
});
test('07 missing, malformed, foreign, and conflicting shards fail closed',()=>{
 const k=futureTaskResultsKey('u1','horen','a'),z=futureTaskResultsKey('u1','horen','z');
 const {storage,map}=store({...state(),[k]:'broken JSON',[z]:journal('wrong','horen',attempt('bad','q',1))});
 assert.deepEqual(Object.keys(mergeTaskResultsForUser('horen','u1',{},storage)),[]);
 map.set(k,journal('u1','horen',attempt('clash','q',0)));
 map.set(z,journal('u1','horen',attempt('clash','q',1)));
 assert.deepEqual(Object.keys(mergeTaskResultsForUser('horen','u1',{},storage)),[],'conflicts must be quarantined');
});
test('08 two accounts sharing a browser have no cross-account history',()=>{
 const k1=futureTaskResultsKey('u1','lesen','a'),k2=futureTaskResultsKey('u2','lesen','a');
 const {storage}=store({...state('u1'),[k1]:journal('u1','lesen',attempt('a','first',1)),[k2]:journal('u2','lesen',attempt('b','second',1))});
 assert.deepEqual(Object.keys(mergeTaskResultsForUser('lesen','u1',{legacy:legacy(0)},storage)).sort(),['first','legacy']);
 assert.deepEqual(Object.keys(mergeTaskResultsForUser('lesen','u2',{legacy:legacy(0)},storage)),['second']);
});
test('09 two devices with diverged records remain independent until server-authoritative union',()=>{
 const key=futureTaskResultsKey('u1','schreiben','shard1');
 const first=store({...state(),[key]:journal('u1','schreiben',attempt('a','q',0))});
 const second=store({...state(),[key]:journal('u1','schreiben',attempt('b','q',1))});
 assert.equal(mergeTaskResultsForUser('schreiben','u1',{},first.storage).q.attempts.length,1);
 assert.equal(mergeTaskResultsForUser('schreiben','u1',{},second.storage).q.attempts.length,1);
 const union=store({...state(),[key]:journal('u1','schreiben',attempt('a','q',0),attempt('b','q',1))});
 assert.equal(mergeTaskResultsForUser('schreiben','u1',{},union.storage).q.attempts.length,2);
});
test('10 467 tasks x 32 future attempts can be read without trimming',()=>{
 const modules=[['horen',80],['lesen',150],['schreiben',110],['sprechen',127]], entries=state();
 for(const [m,n] of modules){
  for(let i=0;i<n;i+=25){
   const rows=[];
   for(let j=i;j<Math.min(i+25,n);j++)for(let a=0;a<32;a++)rows.push(attempt(m+'-'+j+'-'+a,m+'-'+j,a%2,1,'2026-10-20T10:00:00Z'));
   entries[futureTaskResultsKey('u1',m,'slice'+i)]=journal('u1',m,...rows);
  }
 }
 const {storage,before}=store(entries),original=before();
 let total=0;for(const [m,n] of modules){const data=mergeTaskResultsForUser(m,'u1',{},storage);assert.equal(Object.keys(data).length,n);total+=Object.values(data).reduce((a,r)=>a+r.attempts.length,0)}
 assert.equal(total,467*32);assert.equal(before(),original);
});
