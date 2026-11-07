import { createHash } from 'node:crypto';
import { getDeployStore, getStore } from '@netlify/blobs';

const OPENAI_MODEL = 'gpt-4o-mini-tts';
const OPENAI_VOICE = 'cedar';
const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';
const STORE = 'otto-a1-tts-cache-openai-direct-v1';
const PRONUNCIATION_VERSION = 'otto-start-de-DE-hochdeutsch-male-v8-a1';
const MAX_TEXT_LENGTH = 420;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

function cacheStore() {
  const isProduction = Netlify.context?.deploy?.context === 'production';
  return isProduction ? getStore(STORE) : getDeployStore(STORE);
}

function isGermanLetter(text) {
  return /^[A-ZÄÖÜẞß]$/iu.test(String(text || '').trim());
}

const LETTER_NAMES = {
  A:'A',B:'Be',C:'Ce',D:'De',E:'E',F:'Ef',G:'Ge',H:'Ha',I:'I',J:'Jot',K:'Ka',L:'El',M:'Em',N:'En',O:'O',P:'Pe',Q:'Ku',R:'Er',S:'Es',T:'Te',U:'U',V:'Vau',W:'Weh',X:'Iks',Y:'Ypsilon',Z:'Zett','Ä':'Ä','Ö':'Ö','Ü':'Ü','ẞ':'Eszett','ß':'Eszett',
};

function spokenText(text, kind) {
  return kind === 'letter' ? (LETTER_NAMES[String(text || '').trim()] || text) : text;
}

function instructions(mode, kind) {
  const pace = mode === 'slow'
    ? 'Speak a little slower than normal conversation for an absolute beginner, but keep connected natural speech. Never spell a word unless the target itself is a letter.'
    : 'Speak at a calm, natural teaching pace.';
  const target = kind === 'letter'
    ? 'The input represents one German letter. Pronounce only its German letter name, never the English letter name.'
    : 'Pronounce the supplied target exactly as Standard German from Germany.';
  return [
    'You are a pleasant adult MALE native speaker from Germany teaching absolute beginners.',
    'Language and accent must be German (Germany), Standard German/Hochdeutsch, de-DE. Do not use an English, Russian, Dutch, Scandinavian, Swiss or Austrian accent.',
    'Use native German rhythm, stress, vowel length and consonants. Prioritize pedagogically correct pronunciation over dramatic expressiveness.',
    'Pay special attention to ich-Laut [ç], ach-Laut [x], sch [ʃ], z [ts], w [v], j [j], ei [aɪ̯], ie [iː], eu/äu [ɔʏ̯], au [aʊ̯], initial sp/st [ʃp]/[ʃt], umlauts ä/ö/ü, ß, final devoicing and German r.',
    'Final -e and -er may be naturally reduced but must not disappear artificially.',
    target,
    pace,
    'Speak only the supplied German target and nothing else.',
  ].join(' ');
}

function isWav(buffer) {
  return buffer?.length > 1000
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WAVE';
}

async function synthesizeOpenAI(apiKey, text, mode, kind) {
  if (!apiKey) return { ok: false, status: 503, code: 'missing_openai_direct_api_key' };

  try {
    const response = await fetch(OPENAI_TTS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        voice: OPENAI_VOICE,
        input: spokenText(text, kind),
        instructions: instructions(mode, kind),
        response_format: 'wav',
        speed: mode === 'slow' ? 0.92 : 0.98,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      let code = '';
      try {
        const parsed = JSON.parse(detail);
        code = String(parsed?.error?.code || parsed?.error?.type || '');
      } catch {}
      console.error('otto-tts OpenAI direct error', response.status, code);
      return { ok: false, status: response.status, code: code || 'openai_direct_tts_error' };
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (!isWav(bytes)) return { ok: false, status: 502, code: 'openai_direct_invalid_audio' };

    return { ok: true, audio: bytes, provider: 'openai-direct-cedar' };
  } catch (error) {
    console.error('otto-tts OpenAI direct network error', error?.name, error?.message);
    return { ok: false, status: 502, code: 'openai_direct_network_error' };
  }
}

async function readInput(req) {
  if (req.method === 'GET') {
    const url = new URL(req.url);
    return {
      text: url.searchParams.get('text') || '',
      mode: url.searchParams.get('mode') || 'normal',
      kind: url.searchParams.get('kind') || 'text',
    };
  }
  if (req.method === 'POST') return req.json().catch(() => ({}));
  return null;
}

export default async (req) => {
  const body = await readInput(req);
  if (!body) return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST' });

  const text = String(body.text || '').trim();
  const mode = body.mode === 'slow' ? 'slow' : 'normal';
  const kind = body.kind === 'letter' || isGermanLetter(text) ? 'letter' : 'text';

  if (!text) return json({ error: 'Text is required.' }, 400);
  if (text.length > MAX_TEXT_LENGTH) return json({ error: 'Text is too long.' }, 413);

  const fingerprint = JSON.stringify({
    version: PRONUNCIATION_VERSION,
    provider: 'openai-direct',
    model: OPENAI_MODEL,
    voice: OPENAI_VOICE,
    kind,
    mode,
    text,
  });
  const key = createHash('sha256').update(fingerprint).digest('hex');
  const store = cacheStore();

  try {
    const cached = await store.get(key, { type: 'arrayBuffer' });
    if (cached) {
      const audio = Buffer.from(cached);
      if (isWav(audio)) {
        return new Response(audio, {
          headers: {
            'Content-Type': 'audio/wav',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Otto-TTS': 'cache',
            'X-Otto-Provider': 'openai-direct-cedar',
            'X-Otto-Pronunciation': PRONUNCIATION_VERSION,
            'X-Otto-Voice': 'male',
          },
        });
      }
    }
  } catch (error) {
    console.warn('otto-tts cache read failed', error?.message || error);
  }

  const result = await synthesizeOpenAI(
    Netlify.env.get('OPENAI_DIRECT_API_KEY'),
    text,
    mode,
    kind,
  );

  if (!result.ok) {
    return json({
      error: 'High-quality German male voice is not configured on the server.',
      providerCode: result.code || 'tts_failed',
      providerStatus: result.status || 503,
    }, 503);
  }

  try {
    await store.set(key, result.audio);
  } catch (error) {
    console.warn('otto-tts cache write failed', error?.message || error);
  }

  return new Response(result.audio, {
    headers: {
      'Content-Type': 'audio/wav',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Otto-TTS': 'generated',
      'X-Otto-Provider': result.provider,
      'X-Otto-Pronunciation': PRONUNCIATION_VERSION,
      'X-Otto-Voice': 'male',
    },
  });
};

export const config = {
  path: '/api/otto-tts',
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
