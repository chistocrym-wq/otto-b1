// Synthetic cross-version regression for PR19 and protected rollback; never reads real accounts.
// Run: node --test tests/rollback-v1-preservation.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';

const SOURCE = readFileSync(new URL('../src/lib/moduleTaskCompletion.ts', import.meta.url), 'utf8');
const JS = ts.transpileModule(SOURCE, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const KEY = 'otto-module-task-completion-v1';
const MODULES = { lesen: 150, horen: 80, schreiben: 110, sprechen: 127 };
const pad = n => String(n).padStart(3, '0');
const checksum = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

class MemoryStorage {
  constructor(initial = {}) { this.values = new Map(Object.entries(initial)); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}
function loadModule(storage) {
  const exports = {};
  vm.runInNewContext(JS, { exports, localStorage: storage, console }, {
    timeout: 5000, filename: 'rollback-moduleTaskCompletion.js',
  });
  return exports;
}
function snapshotFromPr19(attemptsPerTask) {
  const store = {
    horen: ['horen-002'],
    lesen: ['lesen-001'],
    schreiben: ['schreiben-001'],
    sprechen: ['sprechen-001'],
    taskResults: {},
    unknownAllowedObject: { version: 9, settings: { retain: ['this', 'nested', 'data'] } },
    unfamiliarBoolean: true,
    unfamiliarString: 'must stay intact',
    unfamiliarArray: ['keep', 123],
  };
  for (const [module, total] of Object.entries(MODULES)) {
    const rows = {};
    for (let n = 1; n <= total; n++) {
      const taskId = module + '-' + pad(n);
      const attempts = Array.from({ length: attemptsPerTask }, (_, i) => ({
        score: i % 2, total: 1,
        at: new Date(Date.UTC(2026, 9, 1, 12, i, n % 60)).toISOString(),
        ...(i % 7 === 0 ? { skipped: true } : {}),
      }));
      rows[taskId] = {
        score: 1, total: 1, status: 'correct', attempts,
        corrected: true, firstScore: 0, firstTotal: 1,
      };
    }
    store.taskResults[module] = rows;
  }
  return store;
}
function mount(initial) {
  const storage = new MemoryStorage({ [KEY]: JSON.stringify(initial) });
  return { storage, api: loadModule(storage) };
}
function read(storage) { return JSON.parse(storage.getItem(KEY)); }

for (const perTask of [1, 5, 10, 32]) {
  test('preserve all 467 PR19-style tasks at ' + perTask + ' detailed attempts each', () => {
    const initial = snapshotFromPr19(perTask);
    const historyHash = checksum(initial.taskResults);
    const { storage, api } = mount(initial);
    for (const module of Object.keys(MODULES)) api.recordModuleTaskCompletion(module, module + '-002');
    const after = read(storage);
    assert.equal(checksum(after.taskResults), historyHash, 'detailed taskResults must remain unchanged');
    const count = Object.values(after.taskResults).reduce((total, rows) =>
      total + Object.values(rows).reduce((sum, result) => sum + result.attempts.length, 0), 0);
    assert.equal(count, perTask * 467);
    for (const key of ['unknownAllowedObject', 'unfamiliarBoolean', 'unfamiliarString', 'unfamiliarArray'])
      assert.deepEqual(after[key], initial[key], 'backup must preserve unknown field ' + key);
    for (const module of Object.keys(MODULES)) assert.ok(after[module].includes(module + '-002'));
  });
}

test('rollback preserves history and unknown fields after multiple sequential completions', () => {
  const initial = snapshotFromPr19(5);
  const { api, storage } = mount(initial);
  for (let i = 3; i <= 8; i++) api.recordModuleTaskCompletion('horen', 'horen-' + pad(i));
  assert.deepEqual(read(storage).taskResults, initial.taskResults);
  assert.deepEqual(read(storage).unknownAllowedObject, initial.unknownAllowedObject);
  assert.equal(api.getModuleCompletion('horen').completed, 7);
  assert.equal(api.getModuleCompletion('horen').total, 80);
});

test('pre-existing status, first score, and correction history do not change', () => {
  const initial = snapshotFromPr19(3);
  initial.taskResults.horen['horen-002'] = {
    score: 0, total: 1, status: 'incorrect', corrected: false,
    firstScore: 0, firstTotal: 1,
    attempts: [
      { score: 0, total: 1, at: '2026-10-01T12:00:00.000Z' },
      { score: 1, total: 1, at: '2026-10-01T12:01:00.000Z' },
    ],
  };
  const { api, storage } = mount(initial);
  api.recordModuleTaskCompletion('horen', 'horen-003');
  assert.deepEqual(read(storage).taskResults, initial.taskResults);
});

test('known completion-array normalization retains production rules', () => {
  const storage = new MemoryStorage({ [KEY]: JSON.stringify({
    horen: ['horen-001', 'horen-001', ''],
    lesen: 'malformed-not-an-array',
    taskResults: { historic: true },
    otherAllowed: { keep: 42 },
  }) });
  loadModule(storage).recordModuleTaskCompletion('horen', 'horen-003');
  const after = read(storage);
  assert.deepEqual(after.horen, ['horen-001', 'horen-003']);
  assert.equal(Object.hasOwn(after, 'lesen'), false);
  assert.equal(after.taskResults.historic, true);
  assert.deepEqual(after.otherAllowed, { keep: 42 });
});

test('empty or whitespace-only completion id does not rewrite history', () => {
  const { api, storage } = mount(snapshotFromPr19(1));
  const before = storage.getItem(KEY);
  for (const value of ['', '   ']) api.recordModuleTaskCompletion('horen', value);
  assert.equal(storage.getItem(KEY), before);
});

test('idempotent completion does not modify detailed task history', () => {
  const initial = snapshotFromPr19(1);
  const { api, storage } = mount(initial);
  api.recordModuleTaskCompletion('horen', 'horen-002');
  api.recordModuleTaskCompletion('horen', 'horen-002');
  const after = read(storage);
  assert.equal(after.horen.filter(id => id === 'horen-002').length, 1);
  assert.equal(checksum(after.taskResults), checksum(initial.taskResults));
});

test('PR19 completion selector remains available after legacy preservation patch', () => {
  const initial = snapshotFromPr19(2);
  const {api,storage}=mount(initial);
  assert.equal(typeof api.hasModuleTaskCompletion,'function');
  assert.equal(api.hasModuleTaskCompletion('horen','horen-002'),true);
  assert.equal(api.hasModuleTaskCompletion('horen','horen-099'),false);
  api.recordModuleTaskCompletion('horen','horen-099');
  assert.equal(api.hasModuleTaskCompletion('horen','horen-099'),true);
  assert.deepEqual(read(storage).taskResults,initial.taskResults);
});

test('backup does not claim protection against stale concurrent full-key PUT', () => {
  const initial = snapshotFromPr19(1);
  const a = mount(initial), b = mount(initial);
  a.api.recordModuleTaskCompletion('horen', 'horen-060');
  b.api.recordModuleTaskCompletion('horen', 'horen-061');
  const serverAfterLastWriter = read(b.storage);
  assert.equal(serverAfterLastWriter.horen.includes('horen-060'), false);
  assert.equal(serverAfterLastWriter.horen.includes('horen-061'), true);
});
