import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createHash} from 'node:crypto';

function read(file){return fs.readFileSync(new URL('../'+file,import.meta.url),'utf8')}
function load(file,imports={},extra={}){
 const output=ts.transpileModule(read(file),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const module={exports:{}};
 vm.runInNewContext(output,{exports:module.exports,module,require(name){if(Object.hasOwn(imports,name))return imports[name];throw Error(name)},...extra},{filename:file});
 return module.exports;
}
const source=load('src/data/listening.ts');
const parts=load('src/data/listeningParts.ts',{'./listening':source});
const progress=load('src/lib/hoerenProgress.ts',{'../data/listening':source,'../data/listeningParts':parts});
test('original source blob remains unchanged',()=>{
 const value=read('src/data/listening.ts');
 assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(value)+'\0').update(value).digest('hex'),'614eaa2f7ab64182c0ff6861fb18ce6ce189553c');
});
test('80 IDs exactly once, 21/40/19, original answer types',()=>{
 const g=parts.listeningTeilTasks, all=[...g[1],...g[2],...g[3]];
 assert.equal(all.length,80);assert.equal(new Set(all.map(t=>t.id)).size,80);
 assert.deepEqual(Array.from(all,t=>t.id).sort(),Array.from(source.listeningTasks,t=>t.id).sort());
 assert.deepEqual([g[1].length,g[2].length,g[3].length],[21,40,19]);
 assert.ok(g[1].every(t=>t.type==='multiple-choice'));
 assert.ok(g[2].every(t=>t.type==='true-false'));
 assert.ok(g[3].every(t=>t.type==='multiple-choice'));
 assert.deepEqual([parts.listeningInventory.filter(x=>x.teil===2&&x.additional).length,parts.listeningInventory.filter(x=>x.teil===3&&x.additional).length],[34,6]);
});
test('Hören task image remounts on task change and has a visible retry path',()=>{
  const src=read('src/components/modules/ListeningModule.tsx');
  assert.ok(src.includes('<HorenTaskImage key={task.id} src={imageSrc} taskNumber={task.number}/>'));
  assert.ok(src.includes('onError={()=>setFailed(true)}'));
  assert.ok(src.includes('Повторить загрузку картинки'));
  assert.ok(src.includes('setRetry(value=>value+1)'));
  assert.ok(!src.includes("style.display='none'"));
});
test('original MP3 and PNG files present',()=>{
 for(const task of source.listeningTasks)for(const [dir,ext] of [['audio','mp3'],['images','png']]){
 const path=new URL('../public/'+dir+'/'+String(task.number).padStart(3,'0')+'.'+ext,import.meta.url);
 assert.ok(fs.statSync(path).size>0,task.id+' '+ext);
 }
});
test('old global progress migrates without changing credits or mistakes',()=>{
 const original={nextIndex:47,completed:47,correct:28,mistakes:['old error'],credited:source.listeningTasks.slice(0,47).map(t=>t.id),futureField:'preserve'};
 const p=progress.normalizeHorenProgress(original);
 assert.equal(p.completed,47);assert.equal(p.correct,28);assert.equal(p.mistakes[0],'old error');
 assert.equal(p.credited.length,47);assert.equal(p.futureField,'preserve');
 const legacyTask=source.listeningTasks[47];
 assert.equal(p.teilPositions[2],parts.listeningTeilTasks[2].findIndex(t=>t.id===legacyTask.id));
});
test('a completed task is not credited a second time',()=>{
 const p=progress.normalizeHorenProgress({});
 const first=progress.creditHorenTask(p,source.listeningTasks[0],3,0,false);
 const again=progress.creditHorenTask(first.progress,source.listeningTasks[0],3,0,true);
 assert.equal(first.newlyCredited,true);assert.equal(again.newlyCredited,false);
 assert.equal(again.progress.completed,1);assert.equal(again.progress.correct,0);assert.equal(again.progress.mistakes.length,1);
 const replay=progress.setHorenTeilPosition(again.progress,3,0);
 assert.equal(replay.completed,1);assert.equal(replay.credited.length,1);
});
test('resume details for all three Teil, including legacy Hören',()=>{
 const store=new Map();
 const lib=load('src/lib/trainingResume.ts',{}, {localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}});
 for(const part of [1,2,3]){
 lib.saveTrainingResume({activeTrainingView:'horen',activeTrainingDetail:'horen-teil'+part});
 assert.equal(lib.readTrainingResume().activeTrainingDetail,'horen-teil'+part);
 }
 store.set('otto-training-resume-v1',JSON.stringify({activeTrainingView:'horen',sprechenTeil2:5}));
 assert.equal(lib.readTrainingResume().activeTrainingView,'horen');
 assert.equal(lib.readTrainingResume().sprechenTeil2,5);
});

test('ten task attempts at 70 percent become nine of ten after two repairs, with no extra unique completion',()=>{
 const store=new Map();
 const memory={
   getItem:key=>store.get(key)??null,
   setItem:(key,value)=>store.set(key,value),
 };
 const bridge=load('src/lib/taskResultsBridge.ts',{'./taskResultsServerSnapshot':{readVerifiedTaskResultsServerJournals:()=>[]}});
 const module=load('src/lib/taskResults.ts',{'./taskResultsBridge':bridge},{
   localStorage:memory,
   window:{dispatchEvent(){}},
   Event:class {},
 });
 store.set('otto-module-task-completion-v1',JSON.stringify({lesen:['legacy-id']}));
 for(let index=0;index<10;index++){
   const result=module.recordTaskResult('lesen','test-'+index,index<7?1:0,1);
   assert.equal(result.first,true);
 }
 const before=module.readTaskResults('lesen');
 assert.equal(Object.values(before).length,10);
 assert.equal(Object.values(before).filter(t=>t.status==='correct').length,7);
 assert.equal(module.getCorrectionDelta('lesen'),0);
 const a=module.recordTaskResult('lesen','test-7',1,1);
 const b=module.recordTaskResult('lesen','test-8',1,1);
 assert.equal(a.first,false);
 assert.equal(b.first,false);
 const after=module.readTaskResults('lesen');
 assert.equal(Object.values(after).length,10);
 assert.equal(Object.values(after).filter(t=>t.status==='correct').length,9);
 assert.equal(module.getCorrectionDelta('lesen'),2);
 assert.equal(after['test-7'].corrected,true);
 assert.equal(after['test-7'].attempts.length,2);
 assert.equal(after['test-7'].attempts[0].score,0);
 assert.equal(JSON.parse(store.get('otto-module-task-completion-v1')).lesen[0],'legacy-id');
 const reloaded=load('src/lib/taskResults.ts',{'./taskResultsBridge':bridge},{
   localStorage:memory,
   window:{dispatchEvent(){}},
   Event:class {},
 });
 assert.equal(reloaded.getCorrectionDelta('lesen'),2);
 assert.equal(reloaded.readTaskResults('lesen')['test-8'].status,'correct');
});

test('explicit skip stays yellow until a graded attempt, partially correct answers stay neutral',()=>{
 const store=new Map();
 const bridge=load('src/lib/taskResultsBridge.ts',{
  './taskResultsServerSnapshot':{
    readVerifiedTaskResultsServerJournals:()=>[]
  }
});
 const module=load('src/lib/taskResults.ts',{'./taskResultsBridge':bridge},{
   localStorage:{getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)},
   window:{dispatchEvent(){}},
   Event:class {},
 });
 assert.equal(module.recordTaskResult('schreiben','letter-1',0,10,true).value.status,'skipped');
 assert.equal(module.recordTaskResult('schreiben','letter-1',6,10).value.status,'reviewed');
 assert.equal(module.recordTaskResult('schreiben','letter-1',10,10).value.status,'correct');
 assert.equal(module.recordTaskResult('sprechen','voice-1',0,1).value.status,'incorrect');
 assert.equal(module.recordTaskResult('sprechen','voice-1',.6,1).value.status,'reviewed');
 assert.equal(module.readTaskResults('schreiben')['letter-1'].attempts.length,3);
});

test('all four module task lists use a shared accessible component and correct original IDs',()=>{
 const common=read('src/components/common/TaskList.tsx');
 const files=[
 'src/components/modules/WritingModule.tsx',
 'src/components/modules/ReadingModule.tsx',
 'src/components/modules/ListeningModule.tsx',
 'src/components/modules/SpeakingModule.tsx',
 ];
 for(const file of files)assert.ok(read(file).includes('module="'+({
 'src/components/modules/WritingModule.tsx':'schreiben',
 'src/components/modules/ReadingModule.tsx':'lesen',
 'src/components/modules/ListeningModule.tsx':'horen',
 'src/components/modules/SpeakingModule.tsx':'sprechen',
 }[file])+'"'),file);
 assert.ok(common.includes('Правильно'));
 assert.ok(common.includes('Есть ошибки'));
 assert.ok(common.includes('Пропущено'));
 assert.ok(common.includes('Ещё не выполнялось'));
 assert.ok(common.includes('Продолжить с задания'));
 const listening=read(files[2]);
 assert.ok(listening.includes('setShowList(true)'));
 assert.ok(listening.includes('setProgress(result.progress)'));
 assert.ok(!listening.includes('if(manual){setShowList(true)'));
 const progressSource=read('src/lib/hoerenProgress.ts');
 assert.ok(progressSource.includes('progress.teilPositions[teil]===index'));
 assert.ok(progressSource.includes('advances?nextPosition:progress.teilPositions[teil]'));
});
