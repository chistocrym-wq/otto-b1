import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionToken} from '../netlify/lib/otto-session.js';
import {getExamAccess} from '../netlify/lib/otto30-private.js';
import {getOtto30Config} from '../netlify/lib/otto30-storage-config.js';
import {attemptPathFor} from '../netlify/functions/otto30-score.js';

const base='https://deploy-preview-13--otto-a1.netlify.app';
function signed(id,path='/api/otto30-score'){
 return new Request(base+path,{headers:{cookie:'otto_session='+createSessionToken(id)}});
}
test('Preview 13 student rollout stays disabled without an explicit owner switch',async()=>{
 const prior={secret:process.env.OTTO_SESSION_SECRET,owner:process.env.OTTO30_PREVIEW13_OWNER_IDS,students:process.env.OTTO30_PREVIEW13_STUDENT_ACCESS};
 try{
  process.env.OTTO_SESSION_SECRET='local-qa-isolation-secret-not-production';
  process.env.OTTO30_PREVIEW13_OWNER_IDS='owner-alpha,owner-beta';
  delete process.env.OTTO30_PREVIEW13_STUDENT_ACCESS;
  assert.equal(await getExamAccess(signed('learner-1'),{}),null);
  assert.equal((await getExamAccess(signed('owner-alpha'),{}))?.owner,true);
  assert.equal((await getExamAccess(signed('owner-beta'),{}))?.owner,true);
  assert.equal(await getExamAccess(new Request(base+'/api/otto30-score'),{}),null);
  const outside=new Request('https://otto-a1.netlify.app/api/otto30-score',{headers:{cookie:'otto_session='+createSessionToken('owner-alpha')}});
  assert.equal(await getExamAccess(outside,{}),null);
 }finally{
  for(const [key,name] of Object.entries({secret:'OTTO_SESSION_SECRET',owner:'OTTO30_PREVIEW13_OWNER_IDS',students:'OTTO30_PREVIEW13_STUDENT_ACCESS'})){
   if(prior[key]===undefined)delete process.env[name];else process.env[name]=prior[key];
  }
 }
});
test('attempt paths are partitioned by signed subject, exam and attempt',()=>{
 const a={sub:'account-A'},b={sub:'account-B'},id='36e1305b-3a23-4d90-af67-d187220d1fe5';
 const path=attemptPathFor(a,1,id);
 assert.notEqual(path,attemptPathFor(b,1,id));
 assert.notEqual(path,attemptPathFor(a,2,id));
 assert.equal(path,'account-A/exam_01/'+id);
});
test('student and another privileged account cannot call administrative inventory',async()=>{
 const prior={secret:process.env.OTTO_SESSION_SECRET,owner:process.env.OTTO30_PREVIEW13_OWNER_IDS,admin:process.env.OTTO30_PREVIEW13_KEY_ADMIN_IDS};
 try{
  process.env.OTTO_SESSION_SECRET='local-qa-isolation-secret-not-production';
  process.env.OTTO30_PREVIEW13_OWNER_IDS='owner-alpha,owner-beta';
  process.env.OTTO30_PREVIEW13_KEY_ADMIN_IDS='owner-alpha';
  const {default:score}=await import('../netlify/functions/otto30-score.js');
  const response=await score(signed('owner-beta','/api/otto30-score?op=inventory'),{});
  assert.equal(response.status,403);
  assert.equal((await response.json()).code,'key_admin_only');
 }finally{
  for(const [key,name] of Object.entries({secret:'OTTO_SESSION_SECRET',owner:'OTTO30_PREVIEW13_OWNER_IDS',admin:'OTTO30_PREVIEW13_KEY_ADMIN_IDS'})){
   if(prior[key]===undefined)delete process.env[name];else process.env[name]=prior[key];
  }
 }
});

test('production uses the immutable runtime SITE_ID, not build-only CONTEXT, and remains separately gated',()=>{
 const keys=['CONTEXT','SITE_ID','OTTO30_PRODUCTION_HOST','OTTO30_PRODUCTION_RELEASE_APPROVED'];
 const prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{
  delete process.env.CONTEXT; // Netlify Functions do not guarantee this build variable.
  process.env.SITE_ID='6cd5980e-1876-40f3-85e4-b227362b4d3d';
  process.env.OTTO30_PRODUCTION_HOST='otto-a1.netlify.app';
  delete process.env.OTTO30_PRODUCTION_RELEASE_APPROVED;
  assert.equal(getOtto30Config(new Request('https://otto-a1.netlify.app/api/otto30-score')),null);
  process.env.OTTO30_PRODUCTION_RELEASE_APPROVED='approved';
  const request=new Request('https://otto-a1.netlify.app/api/otto30-score');
  const prod=getOtto30Config(request);
  const preview=getOtto30Config(new Request(base+'/api/otto30-score'));
  assert.equal(prod?.mode,'production');
  assert.equal(prod.host,'otto-a1.netlify.app');
  process.env.SITE_ID='11111111-1111-4111-8111-111111111111';
  assert.equal(getOtto30Config(request),null,'Unrelated Netlify site cannot become Production');
  process.env.SITE_ID='6cd5980e-1876-40f3-85e4-b227362b4d3d';
  process.env.CONTEXT='deploy-preview';
  assert.equal(getOtto30Config(request)?.mode,'production','Build-only CONTEXT cannot disable verified Production Function');
  for(const field of ['candidateStore','keyStore','attemptStore'])assert.notEqual(prod[field],preview[field]);
  assert.equal(getOtto30Config(new Request('https://attacker.example/api/otto30-score')),null);
 }finally{for(const [k,v] of Object.entries(prior)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
