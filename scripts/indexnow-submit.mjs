import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const INDEXNOW_HOST = 'otto-a1.netlify.app';
export const INDEXNOW_ORIGIN = 'https://' + INDEXNOW_HOST;
export const INDEXNOW_KEY = '324744e27a3e5472ad2bc815dea1f667';
export const INDEXNOW_KEY_LOCATION = INDEXNOW_ORIGIN + '/' + INDEXNOW_KEY + '.txt';
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const SITEMAP_LOCATION = INDEXNOW_ORIGIN + '/sitemap.xml';
const LOCAL_SITEMAP = new URL('../public/sitemap.xml', import.meta.url);

export function buildIndexNowPayload(sitemapXml) {
  if (typeof sitemapXml !== 'string' || !sitemapXml.includes('<urlset')) {
    throw new Error('Expected an XML sitemap, not an HTML document');
  }
  const urlList = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
  if (urlList.length === 0 || urlList.length > 10000) {
    throw new Error('IndexNow URL batch must contain between 1 and 10,000 URLs');
  }
  if (new Set(urlList).size !== urlList.length) {
    throw new Error('Duplicate sitemap URLs are not permitted');
  }
  for (const url of urlList) {
    let parsed;
    try { parsed = new URL(url); }
    catch { throw new Error('Invalid sitemap URL: ' + url); }
    const publicPath = parsed.pathname === '/' ||
      parsed.pathname.startsWith('/goethe-a1/') || parsed.pathname.startsWith('/legal/');
    if (parsed.origin !== INDEXNOW_ORIGIN || parsed.protocol !== 'https:' ||
        parsed.search || parsed.hash || !publicPath || parsed.href !== url) {
      throw new Error('Non-production or non-public sitemap URL: ' + url);
    }
  }
  return {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList,
  };
}

async function readPublished(url, fetchFn) {
  const response = await fetchFn(url, {
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Production GET failed (' + response.status + '): ' + url);
  return response.text();
}

export async function verifyProduction(payload, fetchFn = fetch) {
  const remoteKey = await readPublished(payload.keyLocation, fetchFn);
  if (remoteKey.trim() !== INDEXNOW_KEY) {
    throw new Error('Production IndexNow key file is missing or incorrect');
  }
  const remoteSitemap = await readPublished(SITEMAP_LOCATION, fetchFn);
  const published = buildIndexNowPayload(remoteSitemap);
  if (JSON.stringify(published.urlList) !== JSON.stringify(payload.urlList)) {
    throw new Error('Production sitemap is not the expected deployed version');
  }
  // Check real pages, not the SPA fallback that could return HTTP 200 for a missing URL.
  for (let offset = 0; offset < payload.urlList.length; offset += 4) {
    await Promise.all(payload.urlList.slice(offset, offset + 4).map(async url => {
      const html = await readPublished(url, fetchFn);
      if (!html.includes('rel="canonical" href="' + url + '"')) {
        throw new Error('Production page does not have its expected canonical: ' + url);
      }
    }));
  }
}

export async function submitIndexNow(payload, fetchFn = fetch) {
  const response = await fetchFn(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });
  const responseText = await response.text();
  if (response.status !== 200 && response.status !== 202) {
    throw new Error('IndexNow rejected batch (HTTP ' + response.status + '): ' + responseText.slice(0, 400));
  }
  return { status: response.status, count: payload.urlList.length };
}

async function main() {
  const mode = process.argv[2] || '--dry-run';
  if (!['--dry-run', '--submit'].includes(mode) || process.argv.length > 3) {
    throw new Error('Usage: node scripts/indexnow-submit.mjs [--dry-run|--submit]');
  }
  const payload = buildIndexNowPayload(readFileSync(LOCAL_SITEMAP, 'utf8'));
  if (mode === '--dry-run') {
    console.log('DRY RUN ONLY; no search engine notification sent.');
    console.log('Target: ' + INDEXNOW_ENDPOINT);
    console.log('Production host: ' + payload.host);
    console.log('Public key location: ' + payload.keyLocation);
    console.log('URLs to submit: ' + payload.urlList.length);
    payload.urlList.forEach(url => console.log('  ' + url));
    return;
  }

  // GitHub and Netlify deploy independently; do not notify crawlers before the
  // key, sitemap and all referenced pages actually exist on Production.
  const maxChecks = 36;
  let productionReady = false;
  for (let attempt = 1; attempt <= maxChecks; attempt++) {
    try {
      await verifyProduction(payload);
      productionReady = true;
      break;
    } catch (error) {
      if (attempt === maxChecks) throw error;
      console.log('Awaiting verified Production deploy (' + attempt + '/' + maxChecks + '): ' + error.message);
      await new Promise(resolveSleep => setTimeout(resolveSleep, 10000));
    }
  }
  if (!productionReady) throw new Error('Production preflight failed');
  console.log('Verified key, sitemap and ' + payload.urlList.length + ' public pages on Production.');
  const result = await submitIndexNow(payload);
  if (result.status === 202) {
    console.log('IndexNow HTTP 202: all ' + result.count + ' URLs received; key validation pending.');
  } else {
    console.log('IndexNow HTTP 200: all ' + result.count + ' URLs received successfully.');
  }
  console.log('IndexNow acceptance is NOT a guarantee of indexing or AI recommendations.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
