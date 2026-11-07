import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyMeta,finishPart,startPart,allSectionsFinished,nextSection,readCursor,saveCursor,saveMeta,loadMeta,readMode,saveMode,nextExamDisplay,readLegacyDone,markLegacyDone} from '../src/features/mockExams30/examSequence.ts';
function storage(){
 const m=new Map();
 return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v))};
}
test('a section completes explicitly, not from missing/answered questions',()=>{
 const m=emptyMeta('otto-a12-01');
 assert.equal(allSectionsFinished(m),false);
 assert.equal(nextSection(m),'horen');
 const done=finishPart(m,'horen');
 assert.equal(done.completed.horen,true);
 assert.equal(done.completed.lesen,false);
 assert.equal(nextSection(done),'lesen');
});
test('only all four completed sections unlock next exam',()=>{
 let m=emptyMeta('otto-a12-30');
 for(const s of ['horen','lesen','schreiben'])m=finishPart(m,s);
 assert.equal(allSectionsFinished(m),false);
 m=finishPart(m,'sprechen');assert.equal(allSectionsFinished(m),true);
 assert.equal(nextExamDisplay(31),null);
 assert.equal(nextExamDisplay(1),2);
});
test('timed sections have persisted deadlines, and expiry finishes only that section',()=>{
 const db=storage(),user='member:one',exam='otto-a12-15';
 const m=startPart(emptyMeta(exam),'horen',true,10000000);
 assert.equal(m.deadlines.horen,10000000+20*60*1000);
 assert.equal(m.completed.horen,false);
 assert.equal(saveMeta(db,user,m),true);
 const before=loadMeta(db,user,exam,10000010);
 assert.equal(before.completed.horen,false);
 const after=loadMeta(db,user,exam,12000000);
 assert.equal(after.completed.horen,true);
 assert.equal(after.completed.lesen,false);
 assert.equal(allSectionsFinished(after),false);
});
test('independent account, exam and mode persistence',()=>{
 const db=storage();
 assert.equal(readCursor(db,'user-a'),1);
 assert.equal(saveCursor(db,'user-a',5),true);
 assert.equal(readCursor(db,'user-a'),5);
 assert.equal(readCursor(db,'user-b'),1);
 assert.equal(saveMode(db,'user-a',false),true);
 assert.equal(readMode(db,'user-a'),false);
 assert.equal(readMode(db,'user-b'),true);
 saveMeta(db,'user-a',finishPart(emptyMeta('otto-a12-01'),'horen'));
 assert.equal(loadMeta(db,'user-a','otto-a12-01').completed.horen,true);
 assert.equal(loadMeta(db,'user-a','otto-a12-02').completed.horen,false);
 assert.equal(loadMeta(db,'user-b','otto-a12-01').completed.horen,false);
 assert.equal(readLegacyDone(db,'user-a'),false);
 assert.equal(markLegacyDone(db,'user-a'),true);
 assert.equal(readLegacyDone(db,'user-a'),true);
 assert.equal(readLegacyDone(db,'user-b'),false);
});
