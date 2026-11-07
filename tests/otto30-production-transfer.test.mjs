import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertWriteAuthorization, assertSeparatedStores, conditionalCreateAndVerify
} from '../scripts/otto30-production-transfer.mjs';

const targetID='12345678-1234-4234-9234-123456789abc';
test('default mode never authorizes writes and store namespaces are isolated',()=>{
 assert.equal(assertWriteAuthorization({apply:false,env:{},targetID}),false);
 assert.equal(assertSeparatedStores(),true);
});
test('write mode requires exact UUID, target, owner consent and host',()=>{
 assert.throws(()=>assertWriteAuthorization({apply:true,env:{},targetID}));
 assert.throws(()=>assertWriteAuthorization({apply:false,env:{},targetID:'bad'}));
 assert.throws(()=>assertWriteAuthorization({apply:true,env:{
  OTTO30_TRANSFER_WRITE_APPROVED:'I_AUTHORIZE_530_PRIVATE_OBJECTS',
  OTTO30_TRANSFER_TARGET_ID_CONFIRMED:targetID,
  OTTO30_TRANSFER_TARGET_HOST_CONFIRMED:'preview.example'
 },targetID}));
 assert.equal(assertWriteAuthorization({apply:true,env:{
  OTTO30_TRANSFER_WRITE_APPROVED:'I_AUTHORIZE_530_PRIVATE_OBJECTS',
  OTTO30_TRANSFER_TARGET_ID_CONFIRMED:targetID,
  OTTO30_TRANSFER_TARGET_HOST_CONFIRMED:'otto-a1.netlify.app'
 },targetID}),true);
});
const sha=async x=>(await import('node:crypto')).createHash('sha256').update(x).digest('hex');
function fakeStore(value=null){
 let current=value;
 return {
  async get(){return current===null?null:Uint8Array.from(current).buffer;},
  async set(k,v,options){
   assert.equal(options.onlyIfNew,true);
   if(current!==null)return {modified:false};
   current=Buffer.from(v);return {modified:true};
  },
  get value(){return current}
 };
}
test('same object is no-op; differing data refuses overwrite',async()=>{
 const source=Buffer.from('same');
 const store=fakeStore(source);
 assert.equal(await conditionalCreateAndVerify(store,'sample',source,await sha(source)),'already-identical');
 assert.deepEqual(store.value,source);
 await assert.rejects(conditionalCreateAndVerify(store,'sample',Buffer.from('other'),await sha('other')),/target_conflict/);
 assert.deepEqual(store.value,source);
});
test('new object uses create-if-absent with mandatory readback',async()=>{
 const source=Buffer.from('new');
 const store=fakeStore();
 assert.equal(await conditionalCreateAndVerify(store,'sample',source,await sha(source)),'created');
 assert.deepEqual(store.value,source);
});
