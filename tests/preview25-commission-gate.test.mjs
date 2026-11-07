import test from 'node:test';
import assert from 'node:assert/strict';
import { commissionGate } from '../netlify/lib/preview20-commission-accounting.js';
import { v20StoreName } from '../netlify/lib/v20-deployment.js';

// Pure gate tests: no network calls, OTPs, payments, database or Blob writes.
// Integration tests that write remain restricted to the disposable otto_pr20_isolated PostgreSQL service.
const preview20='https://deploy-preview-20--otto-a1.netlify.app';
const preview25='https://deploy-preview-25--otto-a1.netlify.app';
const production='https://otto-a1.netlify.app';
const request=origin=>new Request(origin+'/api/payment-webhook',{method:'POST'});
const previewCtx=id=>({deploy:{context:'deploy-preview',id}});
const productionCtx={deploy:{context:'production',id:'synthetic-published-deploy'}};
const TEST_FLAGS={
  OTTO_V20_COMMISSION_DB_READY:'true',
  OTTO_V20_COMMISSION_TEST_ENABLED:'true',
  OTTO_V20_COMMISSION_LIVE_ENABLED:'false',
};
const flags=values=>name=>values[name]||'';

test('Preview 20 remains authorized only as TEST with explicit test gates',()=>{
  const enabled=commissionGate(request(preview20),previewCtx('synthetic-preview20'),{readEnv:flags(TEST_FLAGS)});
  assert.equal(enabled?.environment,'test');
  assert.equal(enabled?.scope?.mode,'preview');
  assert.equal(enabled?.scope?.origin,preview20);
});

test('Preview 25 is authorized as TEST without Production mode or live commission flag',()=>{
  const enabled=commissionGate(request(preview25),previewCtx('synthetic-preview25'),{readEnv:flags(TEST_FLAGS)});
  assert.equal(enabled?.environment,'test');
  assert.equal(enabled?.scope?.mode,'preview25');
  assert.equal(enabled?.scope?.origin,preview25);
  assert.equal(TEST_FLAGS.OTTO_V20_COMMISSION_LIVE_ENABLED,'false');
});

test('Preview 25 commissions are denied by default or when either test approval is missing',()=>{
  const req=request(preview25),ctx=previewCtx('synthetic-preview25');
  assert.equal(commissionGate(req,ctx),null);
  assert.equal(commissionGate(req,ctx,{readEnv:flags({
    OTTO_V20_COMMISSION_TEST_ENABLED:'true',
  })}),null);
  assert.equal(commissionGate(req,ctx,{readEnv:flags({
    OTTO_V20_COMMISSION_DB_READY:'true',
  })}),null);
  assert.equal(commissionGate(req,ctx,{readEnv:flags({
    OTTO_V20_COMMISSION_DB_READY:'true',OTTO_V20_COMMISSION_LIVE_ENABLED:'true',
  })}),null,'live permission alone must never enable Preview test accounting');
});

test('untrusted origin or deploy context cannot obtain commission accounting authority',()=>{
  const invalid=[
    [request('https://attacker.invalid'),previewCtx('preview25')],
    [request('https://deploy-preview-25--otto-a1.netlify.app.attacker.invalid'),previewCtx('preview25')],
    [request('http://deploy-preview-25--otto-a1.netlify.app'),previewCtx('preview25')],
    [request(preview25),{deploy:{context:'branch-deploy',id:'synthetic'}}],
    [request(preview25),{deploy:{context:'deploy-preview',id:''}}],
    [request(preview25),{deploy:{context:'production',id:'synthetic'}}],
    [request(preview20),previewCtx('')],
  ];
  for(const [req,ctx] of invalid)
    assert.equal(commissionGate(req,ctx,{readEnv:flags(TEST_FLAGS)}),null,req.url);
});

test('Preview20, Preview25 and Production Blob namespaces remain strictly separate',()=>{
  const scoped20=commissionGate(request(preview20),previewCtx('preview20'),{readEnv:flags(TEST_FLAGS)})?.scope;
  const scoped25=commissionGate(request(preview25),previewCtx('preview25'),{readEnv:flags(TEST_FLAGS)})?.scope;
  assert.equal(scoped20?.mode,'preview');
  assert.equal(scoped25?.mode,'preview25');
  for(const kind of ['TEACHERS','GUEST','STUDY_TIME','JOURNEY']){
    const first=v20StoreName(kind,scoped20);
    const second=v20StoreName(kind,scoped25);
    const live=v20StoreName(kind,{mode:'production'});
    assert.ok(first&&second&&live,kind+' stores must be declared');
    assert.notEqual(first,second,kind+' Preview25 must not reuse Preview20 Blobs');
    assert.notEqual(second,live,kind+' Preview25 must not use Production Blobs');
    assert.notEqual(first,live,kind+' Preview20 must not use Production Blobs');
  }
  assert.equal(v20StoreName('TEACHERS',scoped25),'otto-preview25-teacher-pilot-v1');
  assert.equal(v20StoreName('TEACHERS',scoped20),'otto-preview20-teacher-pilot-v1');
});

test('Production remains DENY when general approval or per-feature permissions are absent',()=>{
  const keys=['OTTO_V20_PRODUCTION_APPROVED','OTTO_V20_PRODUCTION_ORIGIN','OTTO_V20_TEACHERS_ENABLED','OTTO_V20_REFERRAL_ENABLED'];
  const previous=new Map(keys.map(key=>[key,process.env[key]]));
  const allApproved={OTTO_V20_PRODUCTION_APPROVED:'true',
    OTTO_V20_PRODUCTION_ORIGIN:production,OTTO_V20_TEACHERS_ENABLED:'true',
    OTTO_V20_REFERRAL_ENABLED:'true'};
  const liveFlags={OTTO_V20_COMMISSION_DB_READY:'true',OTTO_V20_COMMISSION_LIVE_ENABLED:'true'};
  const verify=values=>{
    for(const key of keys)process.env[key]=values[key]??'';
    return commissionGate(request(production),productionCtx,{readEnv:flags(liveFlags)});
  };
  try{
    assert.equal(verify({...allApproved,OTTO_V20_PRODUCTION_APPROVED:'false'}),null);
    assert.equal(verify({...allApproved,OTTO_V20_TEACHERS_ENABLED:'false'}),null);
    assert.equal(verify({...allApproved,OTTO_V20_REFERRAL_ENABLED:'false'}),null);
    assert.equal(verify({...allApproved,OTTO_V20_PRODUCTION_ORIGIN:'https://elsewhere.invalid'}),null);
    const accepted=verify(allApproved);
    assert.equal(accepted?.environment,'live','Production authorization logic must remain unchanged');
    assert.equal(accepted?.scope?.mode,'production');
    assert.equal(commissionGate(request(production),productionCtx,{
      readEnv:flags({OTTO_V20_COMMISSION_DB_READY:'true',OTTO_V20_COMMISSION_TEST_ENABLED:'true'}),
    }),null,'TEST flag alone cannot enable Production LIVE accounting');
  }finally{
    for(const [key,oldValue] of previous){
      if(oldValue===undefined)delete process.env[key];
      else process.env[key]=oldValue;
    }
  }
});
