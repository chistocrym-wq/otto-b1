import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const wf=readFileSync(new URL('../.github/workflows/otto-netlify-transfer-preflight.yml',import.meta.url),'utf8');
const src=readFileSync(new URL('../scripts/otto30-netlify-readonly-preflight.mjs',import.meta.url),'utf8');
const evidence=JSON.parse(readFileSync(new URL('../scripts/otto30-audio-archive-evidence.json',import.meta.url),'utf8'));
test('workflow must be manual, branch-guarded, minimal read, no persistent credentials',()=>{
 assert.match(wf,/^on:\s*\n  workflow_dispatch:/m);
 assert.doesNotMatch(wf,/^\s+(push|pull_request|schedule|workflow_run):/m);
 assert.match(wf,/confirm_readonly == true/);
 assert.match(wf,/github\.ref == 'refs\/heads\/preview\/task-linked-learning'/);
 assert.match(wf,/^  contents: read$/m);
 assert.match(wf,/persist-credentials: false/);
 assert.match(wf,/secrets\.NETLIFY_AUTH_TOKEN/);
 assert.match(wf,/npm ci --ignore-scripts/);
});
test('script has site-scoped reads and no mutation operators',()=>{
 assert.match(src,/getStore\(\{name,siteID:SITE_ID,token/);
 assert.match(src,/get\(key,\{type:'arrayBuffer'/);
 assert.doesNotMatch(src,/\.(set|setJSON|delete|deleteAll|put)\s*\(/);
 assert.doesNotMatch(src,/method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i);
 assert.match(src,/productionWrites:0/);
});
test('existing archive reference has 450 MP3 fingerprints',()=>{
 assert.equal(Object.keys(evidence.audio).length,450);
 assert.equal(new Set(Object.values(evidence.audio).map(x=>x.sha256)).size,450);
 for(const [key,value] of Object.entries(evidence.audio)){
  assert.match(key,/^audio\/exam_(0[1-9]|[12][0-9]|30)\/task_(0[1-9]|1[0-5])\.mp3$/);
  assert.match(value.sha256,/^[a-f0-9]{64}$/);
  assert.ok(value.bytes>0);
 }
});
