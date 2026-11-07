import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const assets=resolve('public-b1','b1');
const index=JSON.parse(readFileSync(resolve(assets,'audio-index.json'),'utf8'));

test('B1 audio manifest contains exactly 599 unique recordings',()=>{
 assert.equal(Object.keys(index).length,599);
 assert.equal(new Set(Object.keys(index)).size,599);
});

test('all B1 audio records have actually deployed HTTPS-served assets',()=>{
 const missing=[];
 const packs=new Map();
 for(const [id,n] of Object.entries(index)){
  if(!Number.isInteger(n)||n<0){missing.push(id+' (invalid pack id)');continue;}
  if(n===0){
   if(!existsSync(resolve(assets,'audio',id+'.mp3'))) missing.push(id+'.mp3');
  }else{
   const filename=resolve(assets,'audio-packs','bundle-'+String(n).padStart(3,'0')+'.jsonl');
   if(!existsSync(filename)){missing.push('bundle-'+String(n).padStart(3,'0')+'.jsonl');continue;}
   if(!packs.has(n)){
    const names=new Set(readFileSync(filename,'utf8').split('\n').filter(Boolean).map(line=>JSON.parse(line).name));
    packs.set(n,names);
   }
   if(!packs.get(n).has(id+'.mp3'))missing.push(id+'.mp3 in pack '+n);
  }
 }
 assert.equal(missing.length,0,'Incomplete audio publishing: '+missing.length+' missing assets, e.g. '+missing.slice(0,12).join(', '));
});
