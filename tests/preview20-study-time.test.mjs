import test from 'node:test';
import assert from 'node:assert/strict';
import {studyTimeService,mergeStudyIntervals} from '../netlify/lib/preview20-study-time.js';
const host='https://deploy-preview-20--otto-a1.netlify.app';
const ctx={deploy:{context:'deploy-preview',id:'test-preview'}};
const user='11111111-1111-4111-8111-111111111111';
const id=n=>'11111111-1111-4111-8111-'+String(n).padStart(12,'0');
function fixture(){
 const data=new Map();let revision=0;const store={
 async getWithMetadata(k){let e=data.get(k);return e?{data:structuredClone(e.data),etag:String(e.rev)}:null;},
 async get(k){return structuredClone(data.get(k)?.data||null);},
 async setJSON(k,value,options){let e=data.get(k);if(options.onlyIfNew&&e)return{modified:false};if(options.onlyIfMatch&&String(e?.rev)!==options.onlyIfMatch)return{modified:false};data.set(k,{data:structuredClone(value),rev:++revision});return{modified:true};}
 };
 const api=studyTimeService({openStore:()=>store,session:()=>({sub:user}),admin:()=>({login:'synthetic'}),now:()=>1761110400000});
 const req=(intervals,origin=host)=>new Request(host+'/api/preview20-study-time',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({intervals})});
 return{api,req};
}
test('unique segment retries, overlap union including separate devices',async()=>{
 const f=fixture(),now=1761110400000;
 const a={id:id(1),module:'otto',start:now-12000,end:now-2000};
 const b={id:id(2),module:'schreiben',start:now-8000,end:now};
 assert.equal((await f.api.record(f.req([a]),ctx)).status,200);
 let again=await f.api.record(f.req([a]),ctx);
 assert.equal((await again.json()).seconds,10);
 let d=await f.api.record(f.req([b]),ctx);
 assert.equal((await d.json()).seconds,12);
 const output=await f.api.adminSummary(new Request(host+'/api/admin-study-time?userId='+user),ctx);
 assert.equal((await output.json()).seconds,12);
});
test('requires valid session, preview scope and original site',async()=>{
 const f=fixture(),now=1761110400000;
 const segment={id:id(4),module:'otto',start:now-5000,end:now};
 assert.equal((await f.api.record(f.req([segment],'https://other.invalid'),ctx)).status,403);
 assert.equal((await f.api.record(f.req([segment]),{deploy:{context:'production',id:'prod'}})).status,404);
 assert.equal((await f.api.record(f.req([{...segment,end:now+90000}]),ctx)).status,400);
});
test('time merger does not double-count overlapping spans',()=>assert.equal(mergeStudyIntervals([{start:0,end:8000},{start:4000,end:11000},{start:12000,end:14000}]),13));
