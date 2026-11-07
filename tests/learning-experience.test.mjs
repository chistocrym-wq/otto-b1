import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as jsxRuntime from 'react/jsx-runtime';
import * as lucide from 'lucide-react';
import {createSessionToken} from '../netlify/lib/otto-session.js';

const readingFeedback = await import('../netlify/functions/reading-feedback.js');

test('Lesen feedback accepts missing archived explanation and keeps the supplied correct answer', async () => {
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.OPENAI_API_KEY;
  const oldBase = process.env.OPENAI_BASE_URL;
  const prior=Object.fromEntries(['OTTO_SESSION_SECRET','OTTO_DEVELOPER_USER_IDS','OTTO_SUPABASE_URL','OTTO_SUPABASE_ANON_KEY','OTTO_SUPABASE_TOKEN'].map(k=>[k,process.env[k]]));
  const oldNetlify=globalThis.Netlify;
  // Mimic Netlify's available environment API only in this isolated test.
  globalThis.Netlify={env:{get:key=>process.env[key]}};
  process.env.OTTO_SESSION_SECRET='test-signed-qa-session-secret';
  process.env.OTTO_DEVELOPER_USER_IDS='reading-fixture-user';
  process.env.OTTO_SUPABASE_URL='https://supabase.example.test';
  process.env.OTTO_SUPABASE_ANON_KEY='fixture';
  process.env.OTTO_SUPABASE_TOKEN='fixture';
  let requestBody = null;
  process.env.OPENAI_API_KEY = 'test-key';
  process.env.OPENAI_BASE_URL = 'https://ai.example.test';
  globalThis.fetch = async (_url, options) => {
    if(String(_url).startsWith('https://supabase.example.test/')){
      assert.match(String(_url),/user_id=eq\.reading-fixture-user/);
      const value=String(_url).includes('user_profiles')?[{created_at:new Date().toISOString()}]:String(_url).includes('select=verified_at')?[{verified_at:new Date().toISOString()}]:[];
      return new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json'}});
    }
    assert.equal(String(_url),'https://ai.example.test/v1/chat/completions');
    requestBody = JSON.parse(String(options?.body || '{}'));
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ items: [{ de: 'Im Text steht: erst um 19 Uhr.', ru: 'В тексте сказано: только в 19:00.' }] }) } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const fixture={part:1,items:[{context:'Sara kommt erst um 19 Uhr.',prompt:'Sara kommt schon am Nachmittag.',correctAnswer:'Falsch',sourceExplanation:''}]};
    const withoutSession=await readingFeedback.default(new Request('https://preview.example/api/reading-feedback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(fixture)}));
    assert.equal(withoutSession.status,401,'Missing signed session must stay unauthorized');
    const response=await readingFeedback.default(new Request('https://preview.example/api/reading-feedback',{method:'POST',headers:{'content-type':'application/json',cookie:'otto_session='+createSessionToken('reading-fixture-user')},body:JSON.stringify(fixture)}));
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.items[0].ru, 'В тексте сказано: только в 19:00.');
    const userMessage = requestBody.messages.find((m) => m.role === 'user').content;
    assert.ok(userMessage.includes('"correctAnswer":"Falsch"'));
    assert.match(userMessage, /erst um 19 Uhr/u);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey;
    if (oldBase === undefined) delete process.env.OPENAI_BASE_URL; else process.env.OPENAI_BASE_URL = oldBase;
    for(const [k,v] of Object.entries(prior))if(v===undefined)delete process.env[k];else process.env[k]=v;
    if(oldNetlify===undefined)delete globalThis.Netlify;else globalThis.Netlify=oldNetlify;
  }
});

test('article-only mistakes are explicitly non-scoring in both speaking and writing evaluators', () => {
  for (const path of ['netlify/functions/check-sprechen.js','api/check-sprechen.js','netlify/functions/check-schreiben.js','api/check-schreiben.js']) {
    const source = fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.match(source, /АРТИКЛИ/u, path);
    assert.match(source, /не снижаем за это оценку/u, path);
  }
});

test('startup no longer forces the old 6.8 second splash or 350ms all-route preload', () => {
  const splash = fs.readFileSync(new URL('../src/components/OttoSplash.tsx', import.meta.url), 'utf8');
  const main = fs.readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(splash, /6800/u);
  assert.doesNotMatch(splash, /5000/u);
  assert.match(splash, /2600/u);
  assert.doesNotMatch(main, /\}, 350\);/u);
  assert.match(main, /requestIdleCallback/u);
});


test('trial UI copy matches the 72 hour server trial', () => {
  const dashboard = fs.readFileSync(new URL('../src/components/Dashboard.tsx', import.meta.url), 'utf8');
  assert.match(dashboard, /3 дня пробного доступа/u);
  assert.doesNotMatch(dashboard, /24 часа пробного доступа/u);
});


test('active trial exposes the existing payment flow without changing SubscriptionPanel', () => {
  const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const dashboard = fs.readFileSync(new URL('../src/components/Dashboard.tsx', import.meta.url), 'utf8');
  const subscription = fs.readFileSync(new URL('../src/components/SubscriptionPanel.tsx', import.meta.url), 'utf8');
  assert.match(app, /canPurchaseAccess=\{accountAccess\.authenticated&&accountAccess\.trialActive&&!accountAccess\.subscriptionActive\}/u);
  assert.match(dashboard, /createPayment\(\)/u);
  assert.match(dashboard, /Купить полный доступ — 1500 ₽ \/ 30 дней/u);
  assert.match(subscription, /Продолжить с OTTO — 1500 ₽ \/ 30 дней/u);
});


test('paid subscription hides trial card and shows paid access on Dashboard', () => {
  const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const dashboard = fs.readFileSync(new URL('../src/components/Dashboard.tsx', import.meta.url), 'utf8');
  assert.match(app, /subscriptionActive=\{accountAccess\.subscriptionActive\}/u);
  assert.match(app, /subscriptionUntil=\{accountAccess\.subscriptionUntil\}/u);
  assert.match(dashboard, /props\.subscriptionActive\?<section/u);
  assert.match(dashboard, /Полный доступ активен/u);
  assert.match(dashboard, /Подписка активна/u);
});


test('new Gmail registration shows a dismissible OTTO delivery advice without changing login flow', () => {
  const onboarding = fs.readFileSync(new URL('../src/components/Onboarding.tsx', import.meta.url), 'utf8');

  assert.match(onboarding, /normalized\.slice\(at \+ 1\) === 'gmail\.com'/u);
  assert.match(onboarding, /authIntent === 'register'/u);
  assert.match(onboarding, /!initialProfile/u);
  assert.match(onboarding, /!authenticatedSession/u);
  assert.match(onboarding, /!gmailAdviceDismissed/u);
  assert.match(onboarding, /setGmailAdviceOpen\(true\)/u);
  assert.match(onboarding, /Указать другой email/u);
  assert.match(onboarding, /Всё равно использовать Gmail/u);
  assert.match(onboarding, /aria-label="Закрыть совет"/u);
  assert.match(onboarding, /Для более быстрой доставки кода рекомендуем Яндекс Почту или Mail\.ru\./u);
  assert.match(onboarding, /void requestOtp\('register'\)/u);
  assert.doesNotMatch(onboarding, /gmail\.com[^\n]{0,120}(?:throw|return false|disabled)/u);
});


// Render the actual list and legacy readers against a read-only synthetic user store.
function renderLegacyTaskList(module,id,initial) {
 const map=new Map(Object.entries(initial)),before=[...map.entries()];
 const localStorage={getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
 const load=(name,mods={})=>{
  const src=fs.readFileSync(new URL(name,import.meta.url),'utf8');
  const compiled=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const m={exports:{}};
  const fn=vm.runInNewContext('(function(require,module,exports,localStorage){'+compiled+'\n})',{},{timeout:3000});
  fn(key=>{if(Object.hasOwn(mods,key))return mods[key];throw Error('Unapproved dependency '+key)},m,m.exports,localStorage);
  return m.exports;
 };
 const bridge=load('../src/lib/taskResultsBridge.ts',{'./taskResultsServerSnapshot':{readVerifiedTaskResultsServerJournals:()=>[]}});
 const results=load('../src/lib/taskResults.ts',{'./taskResultsBridge':bridge}),completion=load('../src/lib/moduleTaskCompletion.ts');
 const {TaskList}=load('../src/components/common/TaskList.tsx',{
  'react/jsx-runtime':jsxRuntime,'lucide-react':lucide,'react':React,
  '@/lib/taskResults':results,'@/lib/moduleTaskCompletion':completion,
 });
 const html=renderToStaticMarkup(React.createElement(TaskList,{module,teil:1,items:[{id,title:'Old exercise'}],continueIndex:0,onBack:()=>{},onSelect:()=>{},onContinue:()=>{}}));
 assert.deepEqual([...map.entries()],before,'Task list may not migrate or mutate saved JSON');
 return html;
}
test('old completion in all four modules renders neutral status, no invented points',()=>{
 const key='otto-module-task-completion-v1';
 for(const [module,id] of [['horen','horen-001'],['lesen','1-0'],['schreiben','formular-1'],['sprechen','sprechen-teil1']]){
  const html=renderLegacyTaskList(module,id,{[key]:JSON.stringify({[module]:[id]})});
  assert.match(html,/Выполнялось ранее/,module);assert.doesNotMatch(html,/Ещё не выполнялось/,module);
  assert.doesNotMatch(html,/ · \d+\/\d+/,module);
 }
});
test('legacy Hören and Lesen credited keys show prior completion unchanged',()=>{
 for(const [module,id,key,stored] of [
  ['horen','horen-001','otto-a1-hoeren-progress-v2',{credited:['horen-001']}],
  ['lesen','1-0','otto-a1-lesen-progress-v2',{'1':{credited:['1-0']}}],
 ]){
  const html=renderLegacyTaskList(module,id,{[key]:JSON.stringify(stored)});
  assert.match(html,/Выполнялось ранее/,module);assert.doesNotMatch(html,/ · \d+\/\d+/,module);
 }
});
test('real detailed correctness is authoritative; genuinely unperformed stays unperformed',()=>{
 const key='otto-module-task-completion-v1',id='horen-001';
 const scored={score:1,total:1,status:'correct',attempts:[{score:1,total:1,at:'2026-10-20T00:00:00.000Z'}],firstScore:1,firstTotal:1,corrected:false};
 const html=renderLegacyTaskList('horen',id,{[key]:JSON.stringify({horen:[id],taskResults:{horen:{[id]:scored}}})});
 assert.match(html,/Правильно · 1\/1/);assert.doesNotMatch(html,/Выполнялось ранее/);
 const newTask=renderLegacyTaskList('horen','horen-002',{[key]:JSON.stringify({horen:[id]})});
 assert.match(newTask,/Ещё не выполнялось/);assert.doesNotMatch(newTask,/Выполнялось ранее/);
});
test('Formular QA asserts one-time initialization, saved progress and mode after reload',()=>{
 const s=fs.readFileSync(new URL('../scripts/preview19-four-fixes-qa.mjs',import.meta.url),'utf8');
 assert.match(s,/sessionStorage\.getItem\(marker\)==='1'/);
 assert.match(s,/assert\.deepEqual\(after\.form,before\.form/);
 assert.match(s,/assert\.equal\(after\.mode,'learning'/);
 assert.match(s,/formular-after-reload-resume/);
});
