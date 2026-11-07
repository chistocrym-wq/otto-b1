import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreview20GuestService, GUEST_TRIAL_MS } from '../netlify/lib/preview20-guest-trial.js';

const HOST = 'https://deploy-preview-20--otto-a1.netlify.app';
const context = {deploy:{context:'deploy-preview',id:'qa-preview20-synthetic'}};
const uuids = [
  '12345678-1234-4123-8123-123456789012',
  '22345678-1234-4123-8123-123456789012',
];
function createFixture() {
  let clock = Date.parse('2026-10-21T00:00:00Z');
  const entries = new Map();
  let n = 0;
  const store = {
    async get(key) { return structuredClone(entries.get(key)?.data ?? null); },
    async getWithMetadata(key) {
      const e=entries.get(key);return e?{data:structuredClone(e.data),etag:String(e.etag)}:null;
    },
    async setJSON(key,value,options={}) {
      const existing=entries.get(key);
      if(options.onlyIfNew&&existing)return {modified:false};
      if(options.onlyIfMatch&&String(existing?.etag)!==options.onlyIfMatch)return {modified:false};
      entries.set(key,{data:structuredClone(value),etag:++n});
      return {modified:true};
    },
  };
  const service=createPreview20GuestService({
    openStore:()=>store,now:()=>clock,secretProvider:()=>'synthetic-secret-never-live'
  });
  const request=(cookie='',origin=HOST)=>new Request(HOST+'/api/preview20-guest',{
    method:'POST',headers:{origin,...(cookie?{cookie}:{})}
  });
  return {service,entries,request,now:()=>clock,advance:ms=>{clock+=ms}};
}

test('preview20 signed guest cookie has one immutable server trial start',async()=>{
  const f=createFixture();
  const start=await f.service.start(f.request(),context);
  assert.equal(start.status,200);
  assert.equal(start.active,true);
  assert.equal(start.endsAt-start.startedAt,GUEST_TRIAL_MS);
  const cookie=start.cookie.split(';')[0];
  const same=await f.service.start(f.request(cookie),context);
  assert.equal(same.id,start.id);
  f.advance(48*3600_000);
  const resumed=await f.service.read(f.request(cookie),context);
  assert.equal(resumed.endsAt-f.now(),24*3600_000);
  f.advance(24*3600_000+1);
  assert.equal((await f.service.read(f.request(cookie),context)).active,false);
  assert.equal((await f.service.start(f.request(cookie),context)).active,false);
  assert.equal((await f.service.start(f.request(cookie),context)).startedAt,start.startedAt);
});

test('guest cannot spoof cookie, origin, preview scope, or AI entitlement',async()=>{
  const f=createFixture();
  assert.equal((await f.service.start(f.request('', 'https://evil.example'),context)).status,403);
  assert.equal((await f.service.start(f.request(),{deploy:{context:'production',id:'prod'}})).status,404);
  const started=await f.service.start(f.request(),context);
  const cookie=started.cookie.split(';')[0];
  assert.equal(await f.service.read(f.request(cookie.replace(/.$/,'x')),context),null);
  assert.equal(await f.service.read(f.request(cookie),{deploy:{context:'production',id:'prod'}}),null);
  assert.deepEqual(await f.service.consumeAiCredit(f.request(cookie.replace(/.$/,'x')),context),
    {allowed:false,code:'guest_trial_expired',status:403});
});

test('new registration inherits guest start; existing identities remain untouched',async()=>{
  const f=createFixture();
  const started=await f.service.start(f.request(),context);
  const cookie=started.cookie.split(';')[0];
  f.advance(48*3600_000);
  const user=uuids[0];
  assert.equal(await f.service.linkNewRegistration(f.request(cookie),context,user,
    new Date(f.now()).toISOString()),true);
  const anchor=await f.service.registeredTrialStart(f.request(cookie),context,user,
    new Date(f.now()).toISOString());
  assert.equal(Date.parse(anchor),started.startedAt);
  const existingUser=uuids[1];
  const oldStart=new Date(started.startedAt-30*86400000).toISOString();
  assert.equal(await f.service.linkNewRegistration(f.request(cookie),context,existingUser,oldStart),false);
  assert.equal(await f.service.registeredTrialStart(f.request(cookie),context,existingUser,oldStart),oldStart);
  f.advance(25*3600_000);
  assert.equal(Date.parse(await f.service.registeredTrialStart(f.request(cookie),context,user,
    new Date(f.now()).toISOString())+''),started.startedAt);
});

test('guest AI usage has a server-side quota and expires',async()=>{
  const f=createFixture();
  const started=await f.service.start(f.request(),context);
  const cookie=started.cookie.split(';')[0];
  for(let i=0;i<60;i++)assert.equal((await f.service.consumeAiCredit(f.request(cookie),context)).allowed,true);
  const limit=await f.service.consumeAiCredit(f.request(cookie),context);
  assert.equal(limit.status,429);
  f.advance(GUEST_TRIAL_MS+1);
  assert.equal((await f.service.consumeAiCredit(f.request(cookie),context)).status,403);
});


// These synthetic tests use two independent in-memory Blob stores. They never
// request a real Netlify site or switch on any deployed Production feature flag.
test('Preview and simulated Production guest create/read/debit use separate stores', async () => {
  const keys = ['OTTO_V20_PRODUCTION_APPROVED', 'OTTO_V20_GUEST_ENABLED', 'OTTO_V20_PRODUCTION_ORIGIN'];
  const previous = new Map(keys.map(key => [key, process.env[key]]));
  const productionHost = 'https://otto-a1.netlify.app';
  const productionContext = {deploy: {context: 'production', id: 'fake-isolated-production-qa'}};
  const stores = new Map();
  const visits = [];
  let clock = Date.parse('2026-10-21T00:00:00Z');
  function request(host, cookie='', operationId='') {
    return new Request(host + '/api/preview20-guest', {
      method: 'POST', headers: {origin: host, ...(cookie ? {cookie} : {}),
        ...(operationId ? {'x-otto-ai-operation-id': operationId} : {})}
    });
  }
  function openStore(scope) {
    assert.ok(scope?.mode === 'preview' || scope?.mode === 'production',
      'all Blob reads/writes must carry an explicit trusted environment scope');
    const name = scope.mode === 'preview'
      ? 'otto-preview20-guest-trial-v1' : 'otto-v20-production-guest-trial-v1';
    visits.push({mode: scope.mode, name});
    if (!stores.has(name)) {
      const values = new Map();
      let version = 0;
      stores.set(name, {
        values,
        async get(key) { return structuredClone(values.get(key)?.data ?? null); },
        async getWithMetadata(key) {
          const current = values.get(key);
          return current ? {data: structuredClone(current.data), etag: String(current.etag)} : null;
        },
        async setJSON(key, value, options={}) {
          const old = values.get(key);
          if (options.onlyIfNew && old) return {modified: false};
          if (options.onlyIfMatch && String(old?.etag) !== options.onlyIfMatch)
            return {modified: false};
          values.set(key, {data: structuredClone(value), etag: ++version});
          return {modified: true};
        }
      });
    }
    return stores.get(name);
  }
  const service = createPreview20GuestService({
    openStore,
    now: () => clock,
    secretProvider: () => 'isolated-scope-test-key-not-real'
  });
  try {
    // Flags exist in this isolated Node process only, not in Netlify.
    process.env.OTTO_V20_PRODUCTION_APPROVED = 'true';
    process.env.OTTO_V20_GUEST_ENABLED = 'true';
    process.env.OTTO_V20_PRODUCTION_ORIGIN = productionHost;
    const previewStart = await service.start(request(HOST), context);
    const prodStart = await service.start(request(productionHost), productionContext);
    assert.equal(previewStart.status, 200);
    assert.equal(prodStart.status, 200);
    assert.notEqual(previewStart.id, prodStart.id);
    const previewCookie = previewStart.cookie.split(';')[0];
    const prodCookie = prodStart.cookie.split(';')[0];
    const previewRequest = request(HOST, previewCookie, 'preview-operation-01234567');
    const prodRequest = request(productionHost, prodCookie, 'production-operation-12345');
    assert.equal((await service.read(previewRequest, context)).id, previewStart.id);
    assert.equal((await service.read(prodRequest, productionContext)).id, prodStart.id);
    assert.equal(await service.read(request(productionHost, previewCookie), productionContext), null);
    assert.equal(await service.read(request(HOST, prodCookie), context), null);
    assert.equal((await service.consumeAiCredit(request(productionHost, prodCookie), productionContext)).code, 'guest_ai_operation_required');
    assert.equal((await service.consumeAiCredit(previewRequest, context)).allowed, true);
    assert.equal((await service.consumeAiCredit(prodRequest, productionContext)).allowed, true);
    assert.equal((await service.consumeAiCredit(previewRequest, context)).code, 'guest_ai_operation_repeated');
    assert.equal((await service.consumeAiCredit(request(HOST, previewCookie, 'preview-operation-76543210'), context)).allowed, true);
    const preview = stores.get('otto-preview20-guest-trial-v1').values;
    const production = stores.get('otto-v20-production-guest-trial-v1').values;
    assert.equal(preview.get('guest/' + previewStart.id).data.aiUses, 2);
    assert.equal(production.get('guest/' + prodStart.id).data.aiUses, 1);
    assert.equal(preview.has('guest/' + prodStart.id), false);
    assert.equal(production.has('guest/' + previewStart.id), false);
    assert.equal((await service.start(previewRequest, context)).startedAt, previewStart.startedAt);
    clock += GUEST_TRIAL_MS + 1;
    assert.equal((await service.read(previewRequest, context)).active, false);
    assert.equal((await service.read(prodRequest, productionContext)).active, false);
    assert.equal((await service.consumeAiCredit(prodRequest, productionContext)).status, 403);
    assert.ok(visits.some(v => v.mode === 'preview'));
    assert.ok(visits.some(v => v.mode === 'production'));
    assert.ok(visits.every(v => v.mode === 'preview'
      ? v.name === 'otto-preview20-guest-trial-v1'
      : v.name === 'otto-v20-production-guest-trial-v1'));
  } finally {
    for (const [key, value] of previous)
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

test('Concurrent AI debits use compare-and-set and busy retries never exceed 60', async () => {
  const f = createFixture();
  const started = await f.service.start(f.request(), context);
  assert.equal(started.status, 200);
  const req = f.request(started.cookie.split(';')[0]);
  const concurrent = await Promise.all(
    Array.from({length: 45}, () => f.service.consumeAiCredit(req, context))
  );
  assert.ok(concurrent.every(result => result.allowed === true ||
    (result.allowed === false && result.code === 'guest_ai_busy' && result.status === 429)));
  const successes = concurrent.filter(result => result.allowed).length;
  assert.ok(successes >= 1 && successes <= 45);
  const key = 'guest/' + started.id;
  assert.equal(f.entries.get(key).data.aiUses, successes,
    'contended reads must not result in a lost update or double credit');
  let used = successes;
  for (const r of concurrent.filter(result => result.code === 'guest_ai_busy')) {
    const retry = await f.service.consumeAiCredit(req, context);
    assert.equal(retry.allowed, true);
    used++;
  }
  assert.equal(used, 45);
  for (let i = used; i < 60; i++) {
    assert.equal((await f.service.consumeAiCredit(req, context)).allowed, true);
  }
  const afterLimit = await Promise.all(
    Array.from({length: 10}, () => f.service.consumeAiCredit(req, context))
  );
  assert.ok(afterLimit.every(result =>
    result.allowed === false && result.code === 'guest_ai_limit' && result.status === 429));
  assert.equal(f.entries.get(key).data.aiUses, 60);
  f.advance(GUEST_TRIAL_MS + 1);
  assert.equal((await f.service.consumeAiCredit(req, context)).status, 403);
});

test('Guest AI request ID is charged once; a replay cannot reach a paid AI provider', async () => {
  const f=createFixture();
  const start=await f.service.start(f.request(),context);
  const cookie=start.cookie.split(';')[0];
  const request=id=>new Request(HOST+'/api/check-sprechen', {
    method:'POST', headers:{origin:HOST,cookie,'x-otto-ai-operation-id':id}
  });
  const id='same-ai-operation-abcdefgh';
  const first=await f.service.consumeAiCredit(request(id),context);
  assert.equal(first.allowed,true);
  const second=await f.service.consumeAiCredit(request(id),context);
  assert.deepEqual(second,{allowed:false,code:'guest_ai_operation_repeated',status:409});
  const record=f.entries.get('guest/'+start.id).data;
  assert.equal(record.aiUses,1);
  assert.equal(record.aiOperationHashes.length,1);
  assert.equal(JSON.stringify(record).includes(id),false,'never persist raw client operation IDs');
  assert.deepEqual(await f.service.consumeAiCredit(request('bad!'),context),
    {allowed:false,code:'guest_ai_operation_invalid',status:400});
  assert.equal(f.entries.get('guest/'+start.id).data.aiUses,1);
  assert.equal((await f.service.consumeAiCredit(request('different-ai-operation-123456'),context)).allowed,true);
  assert.equal(f.entries.get('guest/'+start.id).data.aiUses,2);
});

test('Concurrent retries of the SAME AI operation cannot double-charge even with CAS races', async () => {
  const f=createFixture();
  const start=await f.service.start(f.request(),context);
  const req=new Request(HOST+'/api/check-schreiben', {method:'POST',
    headers:{origin:HOST,cookie:start.cookie.split(';')[0],
      'x-otto-ai-operation-id':'single-concurrent-operation-1'}});
  const attempts=await Promise.all(Array.from({length:20},()=>f.service.consumeAiCredit(req,context)));
  assert.equal(attempts.filter(r=>r.allowed).length,1);
  assert.ok(attempts.every(r=>r.allowed||r.code==='guest_ai_operation_repeated'||r.code==='guest_ai_busy'));
  assert.equal(f.entries.get('guest/'+start.id).data.aiUses,1);
  assert.equal((await f.service.consumeAiCredit(req,context)).status,409);
});

test('Guest request IDs stay within their 60-credit limit and legacy Preview remains compatible', async () => {
  const f=createFixture();
  const start=await f.service.start(f.request(),context);
  const cookie=start.cookie.split(';')[0];
  const op=id=>new Request(HOST+'/api/translate-task',{method:'POST',
    headers:{origin:HOST,cookie,'x-otto-ai-operation-id':id}});
  for(let i=0;i<60;i++)assert.equal((await f.service.consumeAiCredit(op('credit-'+String(i).padStart(20,'0')),context)).allowed,true);
  assert.equal((await f.service.consumeAiCredit(op('credit-'+String(0).padStart(20,'0')),context)).status,409);
  assert.equal((await f.service.consumeAiCredit(op('credit-'+String(60).padStart(20,'0')),context)).status,429);
  assert.equal(f.entries.get('guest/'+start.id).data.aiUses,60);
  assert.equal(f.entries.get('guest/'+start.id).data.aiOperationHashes.length,60);
  const legacy=createFixture();
  const legacyStart=await legacy.service.start(legacy.request(),context);
  const oldRequest=legacy.request(legacyStart.cookie.split(';')[0]);
  assert.equal((await legacy.service.consumeAiCredit(oldRequest,context)).allowed,true);
  assert.equal((await legacy.service.consumeAiCredit(oldRequest,context)).allowed,true);
  assert.equal(legacy.entries.get('guest/'+legacyStart.id).data.aiUses,2,
    'Preview-only old tabs keep their previous behavior until updated');
});

test('Guest AI operation IDs are mandatory in Production, while legacy Preview tabs stay supported', async () => {
  const keys=['OTTO_V20_PRODUCTION_APPROVED','OTTO_V20_GUEST_ENABLED','OTTO_V20_PRODUCTION_ORIGIN'];
  const before=new Map(keys.map(key=>[key,process.env[key]]));
  const prodHost='https://otto-a1.netlify.app';
  const prodContext={deploy:{context:'production',id:'idempotency-production-isolated'}};
  const f=createFixture();
  try{
    process.env.OTTO_V20_PRODUCTION_APPROVED='true';
    process.env.OTTO_V20_GUEST_ENABLED='true';
    process.env.OTTO_V20_PRODUCTION_ORIGIN=prodHost;
    const newStart=await f.service.start(new Request(prodHost+'/api/preview20-guest',{
      method:'POST',headers:{origin:prodHost}}),prodContext);
    assert.equal(newStart.status,200);
    const cookie=newStart.cookie.split(';')[0];
    const req=id=>new Request(prodHost+'/api/check-sprechen',{method:'POST',headers:{
      origin:prodHost,cookie,...(id?{'x-otto-ai-operation-id':id}:{})}});
    assert.equal((await f.service.consumeAiCredit(req(),prodContext)).code,'guest_ai_operation_required');
    const valid=req('credit-123456789012345678');
    assert.equal((await f.service.consumeAiCredit(valid,prodContext)).allowed,true);
    assert.equal((await f.service.consumeAiCredit(valid,prodContext)).code,'guest_ai_operation_repeated');
  }finally{for(const [key,v] of before)if(v===undefined)delete process.env[key];else process.env[key]=v}
});


test('Email guest-cookie preflight is signed, scoped, and never reads Blobs', async () => {
  const f = createFixture();
  const start = await f.service.start(f.request(), context);
  const cookie = start.cookie.split(';')[0];
  const noStore = createPreview20GuestService({
    openStore() { throw new Error('preflight must never open a Blob store'); },
    secretProvider: () => 'synthetic-secret-never-live',
  });
  assert.equal(noStore.hasGuestCookie(f.request(), context), false);
  assert.equal(noStore.hasGuestCookie(f.request(cookie), context), true);
  const corrupt = cookie.slice(0, cookie.lastIndexOf('.') + 1) + 'bad-signature';
  assert.equal(noStore.hasGuestCookie(f.request(corrupt), context), false);
  assert.equal(noStore.hasGuestCookie(f.request(cookie),
    { deploy: { context: 'production', id: 'synthetic-production' } }), false);
  assert.equal(noStore.hasGuestCookie(f.request(cookie),
    { deploy: { context: 'deploy-preview', id: '' } }), false);
});
