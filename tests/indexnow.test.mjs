import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  INDEXNOW_HOST, INDEXNOW_ORIGIN, INDEXNOW_KEY, INDEXNOW_KEY_LOCATION,
  INDEXNOW_ENDPOINT, buildIndexNowPayload, verifyProduction, submitIndexNow,
} from '../scripts/indexnow-submit.mjs';

const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
const payload = buildIndexNowPayload(sitemap);
const ok = (content, status = 200) => ({ok: status >= 200 && status < 300, status, text: async () => content});

test('IndexNow uses a valid public key and exactly 15 production sitemap URLs', () => {
  assert.match(INDEXNOW_KEY, /^[a-zA-Z0-9-]{8,128}$/);
  assert.equal(readFileSync(new URL('../public/' + INDEXNOW_KEY + '.txt', import.meta.url), 'utf8').trim(), INDEXNOW_KEY);
  assert.equal(payload.host, INDEXNOW_HOST);
  assert.equal(payload.key, INDEXNOW_KEY);
  assert.equal(payload.keyLocation, INDEXNOW_KEY_LOCATION);
  assert.equal(payload.urlList.length, 15);
  assert.ok(payload.urlList.every(url => url.startsWith(INDEXNOW_ORIGIN + '/')));
});

test('IndexNow rejects preview, HTTP, private and duplicate sitemap URLs', () => {
  for (const bad of [
    sitemap.replace(INDEXNOW_ORIGIN + '/', 'https://deploy-preview-35--otto-a1.netlify.app/'),
    sitemap.replace(INDEXNOW_ORIGIN + '/', 'http://' + INDEXNOW_HOST + '/'),
    sitemap.replace(INDEXNOW_ORIGIN + '/goethe-a1/', INDEXNOW_ORIGIN + '/api/private/'),
    sitemap.replace('</urlset>', '<url><loc>' + INDEXNOW_ORIGIN + '/</loc></url></urlset>'),
  ]) assert.throws(() => buildIndexNowPayload(bad));
});

test('IndexNow production preflight verifies key, sitemap and canonical for every URL', async () => {
  const visited = [];
  await verifyProduction(payload, async url => {
    visited.push(url);
    if (url === INDEXNOW_KEY_LOCATION) return ok(INDEXNOW_KEY + '\n');
    if (url === INDEXNOW_ORIGIN + '/sitemap.xml') return ok(sitemap);
    return ok('<html><link rel="canonical" href="' + url + '"></html>');
  });
  assert.equal(visited.length, 17);
  assert.ok(payload.urlList.every(url => visited.includes(url)));
  await assert.rejects(verifyProduction(payload, async url => {
    if (url === INDEXNOW_KEY_LOCATION) return ok('<html>SPA fallback</html>');
    return ok('');
  }), /key file is missing/);
  await assert.rejects(verifyProduction(payload, async url => {
    if (url === INDEXNOW_KEY_LOCATION) return ok(INDEXNOW_KEY);
    if (url === INDEXNOW_ORIGIN + '/sitemap.xml') return ok('<html>SPA fallback</html>');
    return ok('');
  }), /XML sitemap/);
});

test('IndexNow submits correct JSON batch, accepts 200 and pending-validation 202', async () => {
  for (const status of [200, 202]) {
    let request;
    const result = await submitIndexNow(payload, async (url, init) => {
      request = {url, init};
      return ok('', status);
    });
    assert.equal(request.url, INDEXNOW_ENDPOINT);
    assert.equal(request.init.method, 'POST');
    assert.match(request.init.headers['Content-Type'], /application\/json/);
    assert.deepEqual(JSON.parse(request.init.body), payload);
    assert.deepEqual(result, {status, count: 15});
  }
  await assert.rejects(submitIndexNow(payload, async () => ok('Forbidden', 403)), /HTTP 403/);
});

test('IndexNow GitHub workflow notifies only from main, not preview pull requests', () => {
  const workflow = readFileSync(new URL('../.github/workflows/indexnow.yml', import.meta.url), 'utf8');
  assert.match(workflow, /push:\s*\n\s*branches:\s*\n\s*- main/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /node scripts\/indexnow-submit\.mjs --submit/);
  assert.doesNotMatch(workflow, /pull_request:/);
});
