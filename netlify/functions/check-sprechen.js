import { requireOttoTrainingAccess } from '../lib/otto-ai-access.js';
const MAX_AUDIO_BASE64 = 4_000_000;
const MODEL = 'gemini-3.8-flash';

export default async (req, context) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const baseUrl = process.env.GOOGLE_GEMINI_BASE_URL;

  if (req.method === 'GET') return json({ ok: true, aiConfigured: Boolean(apiKey && baseUrl), model: MODEL });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST' });
  const accessError = await requireOttoTrainingAccess(req, context);
  if (accessError) return accessError;
  if (!apiKey || !baseUrl) return json({ error: 'AI-проверка речи сейчас недоступна.', code: 'missing_ai_gateway' }, 503);

  try {
    const body = await req.json().catch(() => ({}));
    const audioBase64 = String(body.audioBase64 || '');
    const mimeType = normalizeMimeType(body.mimeType);
    const mode = String(body.mode || '');
    if (!audioBase64) return json({ error: 'Аудиозапись не получена.', code: 'missing_audio' }, 400);
    if (audioBase64.length > MAX_AUDIO_BASE64) return json({ error: 'Запись слишком длинная. Сделайте ответ короче.', code: 'audio_too_large' }, 413);
    if (!['teil1','teil2','teil3','free','phrase'].includes(mode)) return json({ error: 'Неизвестный тип задания Sprechen.', code: 'bad_mode' }, 400);

    const task = buildTaskDescription(body);
    const prompt = `Ты оцениваешь немецкую устную речь уровня Goethe-Zertifikat A1: Start Deutsch 1.
Прослушай реальную аудиозапись. Верни transcript и оцени выполнение задания.

Официальная логика Goethe Sprechen:
- full: Aufgabe voll erfüllt und verständlich;
- partial: Aufgabe wegen sprachlicher oder inhaltlicher Mängel nur teilweise erfüllt;
- zero: Aufgabe nicht erfüllt und/oder unverständlich.
Критерий: Erfüllung der Aufgabenstellung und sprachliche Realisierung.

Правила Otto:
- НЕ создавай собственные мелкие штрафы и случайные проценты;
- numeric score строго 100 для full, 50 для partial, 0 для zero;
- если человек молчит, говорит не по заданию или содержательной речи нет — zero/0;
- не требуй грамматику выше A1;
- небольшие ошибки допустимы, если задача выполнена и речь понятна;
- иностранный акцент сам по себе не ошибка;
- произношение оценивай только по реальной записи как понятность: если оно существенно мешает пониманию, это может сделать выполнение partial или zero;
- strengths: максимум 4 пункта; называй конкретные удачные слова/глагол/ключевое слово/структуру вопроса или просьбы, которые реально прозвучали;
- practice: максимум 4 пункта и только существенные ошибки. Для каждой существенной ошибки по возможности укажи: что ученик сказал, точное место ошибки, исправленный немецкий вариант, русский перевод и простое объяснение почему. Если ошибка в предлоге — назови использованный предлог и его обычный русский смысл, затем нужный предлог, его смысл и правильный пример;
- АРТИКЛИ — отдельное правило тренажёра A1: ошибка только в der/die/das, ein/eine, роде существительного, пропущенном/лишнем артикле или форме артикля НЕ снижает officialLevel/score, если коммуникативная задача выполнена и смысл понятен. Такую ошибку можно указать только как учебную подсказку в practice с формулировкой «На текущем уровне A1 мы не снижаем за это оценку» и правильным примером. Если есть другая существенная ошибка, оценивай её независимо;
- pronunciationRu: короткая оценка понятности произношения по реальному аудио;
- missing: только действительно отсутствующие элементы задания.

${task}`;

    const response = await fetch(`${baseUrl}/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { text: prompt },
          { inlineData: { mimeType, data: audioBase64 } },
        ] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            required: ['transcript','officialLevel','score','strengths','practice','pronunciationRu','missing'],
            properties: {
              transcript: { type: 'STRING' },
              officialLevel: { type: 'STRING', enum: ['full','partial','zero'] },
              score: { type: 'INTEGER' },
              strengths: { type: 'ARRAY', items: { type: 'STRING' }, maxItems: 4 },
              practice: { type: 'ARRAY', items: { type: 'STRING' }, maxItems: 4 },
              pronunciationRu: { type: 'STRING' },
              missing: { type: 'ARRAY', items: { type: 'STRING' }, maxItems: 10 },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Gemini audio check failed', response.status, detail.slice(0, 1200));
      if (response.status === 429) return json({ error: 'AI сейчас перегружен. Повторите проверку через несколько секунд.', code: 'ai_limit' }, 429);
      return json({ error: 'Отто не смог обработать запись. Попробуйте ещё раз или запишите ответ короче.', code: 'ai_error' }, 502);
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('').trim();
    if (!text) throw new Error('Gemini returned empty response');
    const parsed = JSON.parse(stripFences(text));
    const transcript = String(parsed.transcript || '').trim();
    if (!hasMeaningfulSpeech(transcript, mode)) {
      return json({ transcript, officialLevel:'zero', score:0, strengths:[], practice:['Содержательного ответа не распознано. Попробуйте ответить на задание ещё раз.'], pronunciationRu:'Произношение не оценивается без содержательной речи.', missing:[] });
    }
    const officialLevel = ['full','partial','zero'].includes(parsed.officialLevel) ? parsed.officialLevel : 'zero';
    const score = officialLevel === 'full' ? 100 : officialLevel === 'partial' ? 50 : 0;
    return json({
      transcript,
      officialLevel,
      score,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String).filter(Boolean).slice(0,4) : [],
      practice: Array.isArray(parsed.practice) ? parsed.practice.map(String).filter(Boolean).slice(0,4) : [],
      pronunciationRu: String(parsed.pronunciationRu || '').trim(),
      missing: Array.isArray(parsed.missing) ? parsed.missing.map(String).filter(Boolean).slice(0,10) : [],
    });
  } catch (error) {
    console.error('check-sprechen error', error);
    return json({ error: 'Не удалось проверить запись. Попробуйте ещё раз.', code: 'server_error' }, 500);
  }
};

export const config = { path: '/api/check-sprechen' };

function json(data, status = 200, headers = {}) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } }); }
function normalizeMimeType(value) {
  const mime = String(value || 'audio/webm').toLowerCase().split(';')[0].trim();
  if (mime === 'audio/x-m4a') return 'audio/mp4';
  return mime.startsWith('audio/') ? mime : 'audio/webm';
}
function stripFences(value) { return String(value).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim(); }
function hasMeaningfulSpeech(transcript, mode) { const words=String(transcript||'').match(/[\p{L}\p{N}]+/gu)||[]; if(!words.length)return false; if(mode==='teil1')return words.length>=2&&words.join('').length>=4; return words.join('').length>=2; }
function buildTaskDescription(body) {
  if (body.mode === 'teil1') { const expected = Array.isArray(body.expectedPoints) ? body.expectedPoints.join(', ') : ''; return `Teil 1 — Sich vorstellen. В простейшей форме сообщить важные сведения о себе. Опорные пункты тренировки: ${expected}. После представления на реальном экзамене отдельно тренируются Buchstabieren и Zahlen.`; }
  if (body.mode === 'teil2') return `Teil 2 — Um Informationen bitten und Informationen geben. Тема: ${String(body.theme || '')}. Слово карточки: ${String(body.keyword || '')}. Нужно задать понятный вопрос по теме и слову. Пример — только ориентир: ${String(body.sampleQuestion || '')}`;
  if (body.mode === 'teil3') return `Teil 3 — Bitten formulieren und darauf reagieren. Объект: ${String(body.object || '')}. Нужна понятная бытовая просьба/вопрос и адекватная короткая реакция, если она входит в текущую тренировку. Пример — только ориентир: ${String(body.sampleRequest || '')}`;
  if (body.mode === 'phrase') return `Дополнительная учебная фраза A1. Сохрани смысл: ${String(body.expectedText || '')}. Допустима другая простая естественная формулировка с тем же смыслом.`;
  const expected = Array.isArray(body.expectedPoints) ? body.expectedPoints.join(' | ') : '';
  return `Дополнительная тренировка свободной речи A1, не отдельная экзаменационная часть. Тема: ${String(body.title || '')}. Опоры: ${expected}.`;
}