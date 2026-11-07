import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve('public-b1','b1','data');
const sections={horen:4,lesen:5,schreiben:3,sprechen:3};
test('every B1 part contains exactly 30 sets and no A1 material fallback',()=>{
 let total=0;
 for(const [subject,count] of Object.entries(sections)){
  for(let teil=1;teil<=count;teil++){
   const path=resolve(root,subject+'-'+teil+'.json');
   assert.ok(existsSync(path),'Missing B1 source data: '+path);
   const data=JSON.parse(readFileSync(path,'utf8'));
   assert.equal(data.subject.toLowerCase(),subject);
   assert.equal(data.teil,teil);
   assert.equal(data.sets.length,30,'Expected 30 sets: '+path);
   for(let n=1;n<=30;n++){
    const set=data.sets[n-1];
    assert.equal(set.number,n);
    assert.ok(Array.isArray(set.lines)&&set.lines.length>0);
    assert.ok(Array.isArray(set.audioIds));
    if(subject==='horen'||subject==='lesen'){
     assert.ok(set.answerKey&&Object.keys(set.answerKey).length>0,'Missing answers: '+subject+' '+teil+' '+n);
    }
    total++;
   }
  }
 }
 assert.equal(total,450);
});
test('B1 safety checks',()=>{
 const main=readFileSync('src/main.tsx','utf8');
 const index=readFileSync('index.html','utf8');
 const config=readFileSync('netlify.toml','utf8');
 assert.doesNotMatch(index,/otto-a1\.netlify\.app|Goethe A1|OTTO A1/i);
 assert.doesNotMatch(main,/initializeServerStateSync|startGuest|YooKassa|otto-a1/);
 assert.match(config,/directory = "netlify\/b1-functions"/);
});
