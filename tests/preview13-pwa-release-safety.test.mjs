import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('installed OTTO retains the Production PWA identity and launch path',()=>{
 const manifest=JSON.parse(source('public/manifest.webmanifest'));
 assert.equal(manifest.id,'/');
 assert.equal(manifest.scope,'/');
 assert.equal(manifest.start_url,'/?app=otto-a1-v20');
 assert.equal(manifest.display,'standalone');
 assert.match(source('src/lib/pwaInstall.ts'),/serviceWorker\.register\('\/sw\.js'\)/);
});

test('old installed PWA does not cache responses or lose user state',()=>{
 const sw=source('public/sw.js');
 assert.match(sw,/fetch\(event\.request\)/);
 assert.doesNotMatch(sw,/caches\.(?:delete|open|match)/);
 assert.doesNotMatch(sw,/localStorage|indexedDB|cookieStore/);
 const main=source('src/main.tsx');
 assert.match(main,/vite:preloadError/);
 assert.match(main,/otto-update-available/);
 assert.match(main,/window\.confirm/);
 assert.doesNotMatch(main,/ROUTE_RECOVERY_KEY|lastRecovery/);
 assert.match(source('netlify.toml'),/for = "\/sw\.js"/);
 assert.match(source('netlify.toml'),/for = "\/assets\/\*"/);
});
