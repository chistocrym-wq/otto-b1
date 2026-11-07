import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const robots=read('public/robots.txt');
const sitemap=read('public/sitemap.xml');
const page=read('public/goethe-a1/index.html');
const config=read('netlify.toml');
const guides=["struktura","schreiben","sprechen","hoeren","lesen","s-nulya","31-ekzamen","ai-proverka"];
const urls=["https://otto-a1.netlify.app/","https://otto-a1.netlify.app/goethe-a1/","https://otto-a1.netlify.app/goethe-a1/struktura/","https://otto-a1.netlify.app/goethe-a1/schreiben/","https://otto-a1.netlify.app/goethe-a1/sprechen/","https://otto-a1.netlify.app/goethe-a1/hoeren/","https://otto-a1.netlify.app/goethe-a1/lesen/","https://otto-a1.netlify.app/goethe-a1/s-nulya/","https://otto-a1.netlify.app/goethe-a1/31-ekzamen/","https://otto-a1.netlify.app/goethe-a1/ai-proverka/","https://otto-a1.netlify.app/legal/privacy/","https://otto-a1.netlify.app/legal/agreement/","https://otto-a1.netlify.app/legal/consent/","https://otto-a1.netlify.app/legal/payment/","https://otto-a1.netlify.app/legal/contacts/"];
test('robots.txt allows search crawlers and advertises sitemap',()=>{
  for(const bot of ['OAI-SearchBot','Googlebot','Bingbot']){
    assert.match(robots,new RegExp('User-agent: '+bot+'\\r?\\nAllow: /'));
  }
  assert.match(robots,/Sitemap: https:\/\/otto-a1\.netlify\.app\/sitemap\.xml/);
  assert.doesNotMatch(robots,/Disallow:\s*\//i);
});
test('sitemap has only intended public URLs, all backed by static files',()=>{
  assert.match(sitemap,/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(sitemap,/xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]),urls);
  for(const slug of guides){
    assert.ok(existsSync(new URL('../public/goethe-a1/'+slug+'/index.html',import.meta.url)),slug);
  }
});
test('main public Goethe page is static, indexable and has internal guide links',()=>{
  assert.ok(page.includes('href="/"'));
  assert.match(page,/<title>[^<]*Goethe A1[^<]*<\/title>/);
  assert.match(page,/<link rel="canonical" href="https:\/\/otto-a1\.netlify\.app\/goethe-a1\/">/);
  assert.match(page,/<h1\b[^>]*>[^<]*Goethe A1[^<]*<\/h1>/);
  for(const term of ['Hören','Lesen','Schreiben','Sprechen','31 пробный экзамен','1 500 ₽','72 часа'])assert.ok(page.includes(term),term);
  for(const slug of guides)assert.ok(page.includes('href="/goethe-a1/'+slug+'/"'),slug);
  assert.doesNotMatch(page,/<script\b/i);
  assert.doesNotMatch(page,/noindex|nofollow/i);
});
test('each guide has unique metadata, useful static text, canonical and navigation',()=>{
  const titles=new Set();
  for(const slug of guides){
    const html=read('public/goethe-a1/'+slug+'/index.html');
    const url='https://otto-a1.netlify.app/goethe-a1/'+slug+'/';
    const title=html.match(/<title>([^<]+)<\/title>/)?.[1];
    assert.ok(title&&title.includes('A1'),slug+': title');
    assert.ok(!titles.has(title),slug+': duplicate title');titles.add(title);
    assert.match(html,new RegExp('<link rel="canonical" href="'+url+'">'));
    assert.match(html,/<meta name="description" content="[^"]{70,}">/);
    assert.match(html,/<h1\b[^>]*>[^<]*A1[^<]*<\/h1>/);
    assert.match(html,/<main\b/);
    assert.ok(html.includes('href="/goethe-a1/"'),slug+': return link');
    assert.ok(html.includes('href="/"'),slug+': app link');
    assert.ok(html.length>4500,slug+': not enough original content');
    assert.doesNotMatch(html,/<script\b|noindex|nofollow/i);
  }
});
test('Netlify static assets precede non-forced SPA fallback',()=>{
  assert.match(config,/for = "\/robots\.txt"[\s\S]*?Content-Type = "text\/plain; charset=utf-8"/);
  assert.match(config,/for = "\/sitemap\.xml"[\s\S]*?Content-Type = "application\/xml; charset=utf-8"/);
  assert.match(config,/from = "\/\*"[\s\S]*?to = "\/index\.html"[\s\S]*?status = 200[\s\S]*?force = false/);
});
test('app main and public UI link to crawlable landing and home has canonical',()=>{
  const appShell=read('index.html'),dashboard=read('src/components/Dashboard.tsx'),welcome=read('src/components/Preview20Welcome.tsx');
  assert.ok(appShell.includes('<a href="/goethe-a1/"'));
  assert.ok(dashboard.includes('<a href="/goethe-a1/"'));
  assert.ok(welcome.includes('<a href="/goethe-a1/"'));
  assert.ok(appShell.includes('rel="canonical" href="https://otto-a1.netlify.app/"'));
  assert.ok(page.includes('href="/"'));
});

test('public legal pages and consistent footer links',()=>{const slugs=['privacy','agreement','consent'];for(const slug of slugs){const html=read('public/legal/'+slug+'/index.html');assert.ok(html.includes('<h1>'));assert.ok(html.includes('rel="canonical" href="https://otto-a1.netlify.app/legal/'+slug+'/"'));assert.ok(html.includes('2026-09-23-v1'));}for(const html of [page,...guides.map(slug=>read('public/goethe-a1/'+slug+'/index.html'))])for(const slug of slugs)assert.ok(html.includes('href="/legal/'+slug+'/"'));});

test('operator contact and payment pages are real public documents',()=>{for(const slug of ['contacts','payment']){const doc=read('public/legal/'+slug+'/index.html');assert.ok(doc.includes('<h1>'));assert.ok(doc.includes('rel="canonical" href="https://otto-a1.netlify.app/legal/'+slug+'/"'));assert.doesNotMatch(doc,/<script\\b|noindex|nofollow/i)}for(const slug of ['privacy','agreement','consent','payment','contacts']){assert.ok(page.includes('href="/legal/'+slug+'/"'));for(const guide of guides)assert.ok(read('public/goethe-a1/'+guide+'/index.html').includes('href="/legal/'+slug+'/"'))}});
