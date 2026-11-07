import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../src/lib/schreibenDrafts.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{fileName:'schreibenDrafts.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function load(localStorage){
 const module={exports:{}};
 vm.runInNewContext(js,{exports:module.exports,module,localStorage});
 return module.exports;
}
function memory(){
 const values=new Map();
 const calls=[];
 return {values,calls,getItem(k){calls.push(['get',k]);return values.get(k)??null},setItem(k,v){calls.push(['set',k]);values.set(k,v)},removeItem(k){calls.push(['remove',k]);values.delete(k)}};
}
test('only a verified userId and valid existing Schreiben letter ID can store text',()=>{
 const store=memory(),d=load(store);
 for(const invalid of [undefined,null,'','   ']){
  assert.equal(d.schreibenDraftStorageKey(invalid,'schreiben-teil2-7'),null);
  assert.equal(d.writeSchreibenLetterDraft(invalid,'schreiben-teil2-7','private'),false);
  assert.equal(d.readSchreibenLetterDraft(invalid,'schreiben-teil2-7'),'');
 }
 assert.equal(d.writeSchreibenLetterDraft('backend-identity','invalid-task','private'),false);
 assert.equal(d.writeSchreibenLetterDraft('backend-identity','schreiben-teil2-7','Liebe Frau...'),true);
 assert.equal(d.readSchreibenLetterDraft('backend-identity','schreiben-teil2-7'),'Liebe Frau...');
 assert.equal(store.values.size,1);
});
test('two letters have independent persistent text and deleting one clears only its key',()=>{
 const store=memory(),d=load(store);
 assert.equal(d.writeSchreibenLetterDraft('uid-1','schreiben-teil2-7','Brief 7'),true);
 assert.equal(d.writeSchreibenLetterDraft('uid-1','schreiben-teil2-8','Brief 8'),true);
 assert.equal(d.readSchreibenLetterDraft('uid-1','schreiben-teil2-8'),'Brief 8');
 assert.equal(d.writeSchreibenLetterDraft('uid-1','schreiben-teil2-7',''),true);
 assert.equal(d.readSchreibenLetterDraft('uid-1','schreiben-teil2-7'),'');
 assert.equal(store.values.size,1);
 const reloaded=load(store);
 assert.equal(reloaded.readSchreibenLetterDrafts('uid-1',['schreiben-teil2-7','schreiben-teil2-8'])['schreiben-teil2-8'],'Brief 8');
});
test('different server user IDs cannot read or overwrite each others drafts',()=>{
 const store=memory(),d=load(store),task='schreiben-teil2-7';
 const alice='account/A',bob='account:B';
 d.writeSchreibenLetterDraft(alice,task,'From Alice');
 assert.equal(d.readSchreibenLetterDraft(bob,task),'');
 d.writeSchreibenLetterDraft(bob,task,'From Bob');
 assert.equal(load(store).readSchreibenLetterDraft(alice,task),'From Alice');
 assert.equal(load(store).readSchreibenLetterDraft(bob,task),'From Bob');
 assert.notEqual(d.schreibenDraftStorageKey(alice,task),d.schreibenDraftStorageKey(bob,task));
 assert.equal(store.values.size,2);
});
test('unavailable, throwing and full localStorage do not throw',()=>{
 for(const storage of [
  undefined,
  {getItem(){throw Error('private')},setItem(){throw Error('private')},removeItem(){throw Error('private')}},
  {getItem(){return null},setItem(){throw Error('quota')},removeItem(){throw Error('quota')}},
 ]){
  const d=load(storage);
  assert.equal(d.readSchreibenLetterDraft('owner','schreiben-teil2-7'),'');
  assert.equal(d.writeSchreibenLetterDraft('owner','schreiben-teil2-7','text'),false);
  assert.equal(d.writeSchreibenLetterDraft('owner','schreiben-teil2-7',''),false);
 }
});
test('draft input cannot update completion, scoring, or training resume keys',()=>{
 const store=memory(),d=load(store);
 d.writeSchreibenLetterDraft('uid','schreiben-teil2-7','test');
 assert.equal(store.values.size,1);
 for(const key of store.values.keys()){
  assert.match(key,/^otto-schreiben-teil2-text-draft-v1:/);
  assert.doesNotMatch(key,/progress|completion|resume|activity|account-access/);
 }
 const writing=fs.readFileSync(new URL('../src/components/modules/WritingModule.tsx',import.meta.url),'utf8');
 assert.ok(writing.includes('onDraftChange(task.id,value)'));
 assert.ok(writing.includes('if(value===\'\')delete next[taskId]'));
 assert.ok(writing.includes('onDraftChange(task.id,String(checked.recognizedText))'));
});
