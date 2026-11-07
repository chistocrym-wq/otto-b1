import test from 'node:test';
import assert from 'node:assert/strict';
import {v20FeatureScope,v20SameOrigin,v20StoreName,V20_PREVIEW_ORIGIN,V20_PRODUCTION_ORIGIN} from '../netlify/lib/v20-deployment.js';
const pctx={deploy:{context:'deploy-preview',id:'isolated-pr20'}};
const prod={deploy:{context:'production',id:'isolated-production-staging'}};
const env=(values={})=>key=>values[key]||'';
const uri=(origin,method='GET',headers={})=>new Request(origin+'/api/teacher',{method,headers});
test('preview20 access unchanged but another preview and spoofed deploy denied',()=>{
  const scope=v20FeatureScope(uri(V20_PREVIEW_ORIGIN),pctx,'TEACHERS');
  assert.equal(scope.mode,'preview');
  assert.equal(v20FeatureScope(uri(V20_PREVIEW_ORIGIN),prod,'TEACHERS'),null);
  assert.equal(v20FeatureScope(uri('https://deploy-preview-21--otto-a1.netlify.app'),pctx,'TEACHERS'),null);
  assert.equal(v20FeatureScope(uri(V20_PREVIEW_ORIGIN),{deploy:{context:'deploy-preview'}},'TEACHERS'),null);
});
test('production denies all features without BOTH explicit authorization flags and canonical origin',()=>{
  for(const feature of ['ADMIN','JOURNEY','STUDY_TIME','TEACHERS','REFERRAL','GUEST']){
    const flags={'OTTO_V20_PRODUCTION_APPROVED':'true',['OTTO_V20_'+feature+'_ENABLED']:'true','OTTO_V20_PRODUCTION_ORIGIN':V20_PRODUCTION_ORIGIN};
    const req=uri(V20_PRODUCTION_ORIGIN);
    assert.equal(v20FeatureScope(req,prod,feature,{readEnv:env()}),null);
    assert.equal(v20FeatureScope(req,prod,feature,{readEnv:env({...flags,OTTO_V20_PRODUCTION_APPROVED:'false'})}),null);
    assert.equal(v20FeatureScope(req,prod,feature,{readEnv:env({...flags,['OTTO_V20_'+feature+'_ENABLED']:'false'})}),null);
    assert.equal(v20FeatureScope(req,prod,feature,{readEnv:env({...flags,OTTO_V20_PRODUCTION_ORIGIN:'https://evil.example'})}),null);
    const scope=v20FeatureScope(req,prod,feature,{readEnv:env(flags)});
    assert.equal(scope?.mode,'production');
    assert.equal(v20FeatureScope(uri(V20_PREVIEW_ORIGIN),prod,feature,{readEnv:env(flags)}),null);
    assert.equal(v20FeatureScope(req,pctx,feature,{readEnv:env(flags)}),null);
  }
});
test('all POST writes require matching browser origin and reject cross-site requests',()=>{
  const scope=v20FeatureScope(uri(V20_PREVIEW_ORIGIN),pctx,'STUDY_TIME');
  assert.equal(v20SameOrigin(uri(V20_PREVIEW_ORIGIN,'POST',{origin:V20_PREVIEW_ORIGIN}),scope),true);
  assert.equal(v20SameOrigin(uri(V20_PREVIEW_ORIGIN,'POST',{origin:'https://evil.example'}),scope),false);
  assert.equal(v20SameOrigin(uri(V20_PREVIEW_ORIGIN,'POST',{origin:V20_PREVIEW_ORIGIN,'sec-fetch-site':'cross-site'}),scope),false);
  assert.equal(v20SameOrigin(uri(V20_PREVIEW_ORIGIN,'POST'),scope),false);
});
test('all scoped stores are distinct across preview/production and unrelated stores',()=>{
  const preview=v20FeatureScope(uri(V20_PREVIEW_ORIGIN),pctx,'GUEST');
  const production=v20FeatureScope(uri(V20_PRODUCTION_ORIGIN),prod,'GUEST',{readEnv:env({OTTO_V20_PRODUCTION_APPROVED:'true',OTTO_V20_GUEST_ENABLED:'true',OTTO_V20_PRODUCTION_ORIGIN:V20_PRODUCTION_ORIGIN})});
  for(const name of ['GUEST','STUDY_TIME','TEACHERS','JOURNEY']){
    assert.notEqual(v20StoreName(name,preview),v20StoreName(name,production));
    assert.match(v20StoreName(name,production),/production/);
  }
});

// The welcome-only Production rollout must not offer an API-disabled guest CTA.
import {readFileSync} from 'node:fs';
test('WELCOME without GUEST hides the guest signup CTA',()=>{
  const source=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
  assert.match(source,/const guestEntryEnabled\s*=\s*v20ClientEnabled\('guest'\)/);
  assert.match(source,/onGuest=\{guestEntryEnabled\s*&&\s*!registeringGuest/);
  assert.doesNotMatch(source,/onGuest=\{isPreview20\s*&&/);
});
