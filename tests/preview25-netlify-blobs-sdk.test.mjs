import test from 'node:test';
import assert from 'node:assert/strict';
import { getStore } from '@netlify/blobs';
import sdk from '@netlify/blobs/package.json' with { type: 'json' };
import { wasOtpConditionalWriteCommitted } from '../netlify/lib/email-otp.js';

assert.equal(sdk.version, '11.1.7');
assert.match(process.version, /^v22\./, 'CI SDK regression must run on Node.js 22');
const SITE='synthetic-site', TOKEN='synthetic-test-token', E='"v1"';
const EDGE='https://mock-blobs.invalid';
// Fetch implementations may use lowercase HTTP methods; HTTP method tokens are case-insensitive here.
const httpMethod = init => String(init?.method || '').toUpperCase();
function createStore(fetcher) {
  return getStore({ name:'otto-sdk-otp-test', siteID:SITE, token:TOKEN,
    edgeURL:EDGE, uncachedEdgeURL:EDGE, consistency:'strong', fetch:fetcher });
}
for (const status of [409, 412]) {
  test('actual @netlify/blobs returns modified:false for HTTP '+status, async () => {
    let calls=0;
    const store=createStore(async(url,init)=>{
      calls++;
      assert.equal(new URL(url).origin,EDGE);
      assert.equal(httpMethod(init),'PUT');
      assert.equal(new Headers(init.headers).get('if-match'), E);
      return new Response(null,{status});
    });
    const result=await store.setJSON('challenge:test',{usedAt:Date.now()},{onlyIfMatch:E});
    assert.equal(result.modified,false);
    assert.equal(result.etag,undefined);
    assert.equal(wasOtpConditionalWriteCommitted(result),false);
    assert.equal(calls,1);
  });
}
for (const status of [200,201]) {
  test('actual @netlify/blobs accepts successful conditional HTTP '+status+' with ETag',async()=>{
    const store=createStore(async(url,init)=>{
      assert.equal(httpMethod(init),'PUT');
      assert.equal(new Headers(init.headers).get('if-match'),E);
      return new Response(null,{status,headers:{etag:'"v2"'}});
    });
    const result=await store.setJSON('challenge:test',{usedAt:123},{onlyIfMatch:E});
    assert.equal(result.modified,true);
    assert.equal(result.etag,'"v2"');
    assert.equal(wasOtpConditionalWriteCommitted(result),true);
  });
}
test('actual SDK successful HTTP without ETag is rejected by OTTO',async()=>{
  const store=createStore(async()=>new Response(null,{status:200}));
  const result=await store.setJSON('challenge:test',{usedAt:123},{onlyIfMatch:E});
  assert.equal(result.modified,true);
  assert.throws(()=>wasOtpConditionalWriteCommitted(result),/otp_conditional_write_unconfirmed/);
});
test('actual SDK rejects genuine HTTP 503 (not a mock transport error)',async()=>{
  let calls=0, response503Count=0;
  const store=createStore(async(url,init)=>{
    calls++;
    // Any assertion or thrown network error in the transport would invalidate
    // the regression; assert that every SDK attempt is a conditional PUT.
    assert.equal(new URL(url).origin,EDGE);
    assert.equal(httpMethod(init),'PUT');
    assert.equal(new Headers(init.headers).get('if-match'),E);
    response503Count++;
    return new Response(null,{status:503});
  });
  await assert.rejects(
    store.setJSON('challenge:test',{usedAt:123},{onlyIfMatch:E}),
    error => {
      // Reject because the real SDK reports HTTP 503, not because the test
      // transport threw an unrelated assertion or exception.
      assert.match(String(error?.message), /\b503\b/);
      return true;
    },
  );
  assert.ok(calls>=1 && calls<=6, 'SDK may retry 503 but must eventually fail');
  assert.equal(response503Count,calls,'every transport call returned HTTP 503');
});
test('actual SDK concurrently consumes one OTP only once with optimistic ETags',async()=>{
  let usedAt=null,etag=E,successfulWrites=0;
  const store=createStore(async(url,init)=>{
    if(httpMethod(init)==='GET')return new Response(JSON.stringify({usedAt}),{status:200,headers:{'content-type':'application/json',etag}});
    assert.equal(httpMethod(init),'PUT');
    if(new Headers(init.headers).get('if-match')!==etag)return new Response(null,{status:409});
    usedAt=JSON.parse(init.body).usedAt;
    etag='"v2"';successfulWrites++;
    return new Response(null,{status:200,headers:{etag}});
  });
  const [a,b]=await Promise.all([
    store.getWithMetadata('challenge:test',{type:'json',consistency:'strong'}),
    store.getWithMetadata('challenge:test',{type:'json',consistency:'strong'}),
  ]);
  assert.equal(a.etag,E);assert.equal(b.etag,E);
  const [x,y]=await Promise.all([a,b].map(entry=>
    store.setJSON('challenge:test',{...entry.data,usedAt:123},{onlyIfMatch:entry.etag})));
  assert.equal([x,y].filter(wasOtpConditionalWriteCommitted).length,1);
  assert.equal(successfulWrites,1);
  assert.equal(usedAt,123);
});
