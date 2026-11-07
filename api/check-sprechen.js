const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
const MAX_WAV_BYTES = 6 * 1024 * 1024;

export default async function handler(req, res) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      aiConfigured: Boolean(apiKey),
      maxAudioBytes: MAX_AUDIO_BYTES,
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!apiKey) {
    return res.status(503).json({
      error: 'AI-проверка речи не подключена: на сервере отсутствует OPENAI_API_KEY.',
      code: 'missing_api_key',
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { audioBase64, audioWavBase64, mimeType = 'audio/webm', mode } = body;

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'Аудиозапись не получена.', code: 'missing_audio' });
    }

    if (!['teil1', 'teil2', 'teil3', 'free', 'phrase'].includes(mode)) {
      return res.status(400).json({ error: 'Неизвестный тип задания Sprechen.', code: 'bad_mode' });
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    if (!audioBuffer.length) return res.status(200).json(zeroResult('Запись пустая. Ответ на задание отсутствует.'));
    if (audioBuffer.length > MAX_AUDIO_BYTES) {
      return res.status(413).json({
        error: 'Запись слишком длинная для отправки. Сделайте ответ короче и запишите ещё раз.',
        code: 'audio_too_large',
      });
    }

    const transcript = await transcribeAudio({ apiKey, audioBuffer, mimeType });
    if (!hasMeaningfulSpeech(transcript, mode)) {
      return res.status(200).json({
        ...zeroResult('Содержательного ответа не распознано. По критерию Goethe за отсутствующий или непонятный ответ — 0 выполнения задания.'),
        transcript,
      });
    }

    let pronunciation = null;
    if (typeof audioWavBase64 === 'string' && audioWavBase64.length > 0) {
      const wavBytes = Buffer.from(audioWavBase64, 'base64');
      if (wavBytes.length && wavBytes.length <= MAX_WAV_BYTES) {
        pronunciation = await analyzePronunciation({ apiKey, audioWavBase64 }).catch((error) => {
          console.warn('pronunciation analysis unavailable', error);
          return null;
        });
      }
    }

    const evaluation = await evaluateAnswer({ apiKey, transcript, body, pronunciation });
    return res.status(200).json({ ...evaluation, transcript });
  } catch (error) {
    console.error('check-sprechen error', error);

    if (error instanceof OpenAIRequestError) {
      if (error.status === 401 || error.status === 403) {
        return res.status(502).json({ error: 'AI-проверка не авторизована. Нужно проверить OPENAI_API_KEY на сервере.', code: 'openai_auth' });
      }
      if (error.status === 429) {
        return res.status(429).json({ error: 'Лимит OpenAI API временно исчерпан. Попробуйте ещё раз немного позже.', code: 'openai_limit' });
      }
      return res.status(502).json({ error: 'OpenAI сейчас не смог обработать запись. Попробуйте ещё раз через несколько секунд.', code: 'openai_error' });
    }

    return res.status(500).json({ error: 'Не удалось проверить ответ. Запись можно прослушать и попробовать отправить ещё раз.', code: 'server_error' });
  }
}

class OpenAIRequestError extends Error {
  constructor(status, detail) {
    super(`OpenAI request failed: ${status} ${detail}`);
    this.name = 'OpenAIRequestError';
    this.status = status;
  }
}

function normalizeMimeType(mimeType) {
  const raw = typeof mimeType === 'string' ? mimeType.toLowerCase().split(';')[0].trim() : '';
  if (!raw.startsWith('audio/')) return 'audio/webm';
  return raw;
}

function extensionForMime(mimeType) {
  const mime = normalizeMimeType(mimeType);
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) return 'm4a';
  return 'webm';
}

async function transcribeAudio({ apiKey, audioBuffer, mimeType }) {
  const safeMime = normalizeMimeType(mimeType);
  const extension = extensionForMime(safeMime);
  const bytes = new Uint8Array(audioBuffer);

  const callTranscription = async (model) => {
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: safeMime }), `sprechen.${extension}`);
    form.append('model', model);
    form.append('language', 'de');
    form.append('response_format', 'json');

    return fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  };

  let response = await callTranscription('gpt-4o-mini-transcribe');
  if (!response.ok) {
    const firstDetail = await response.text();
    console.warn('gpt-4o-mini-transcribe failed', response.status, firstDetail.slice(0, 300));
    response = await callTranscription('whisper-1');
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new OpenAIRequestError(response.status, detail.slice(0, 500));
  }

  const payload = await response.json();
  return String(payload.text || '').trim();
}

async function analyzePronunciation({ apiKey, audioWavBase64 }) {
  const prompt = `Слушай именно немецкую речь ученика уровня A1. Нужна только оценка разборчивости произношения, не грамматики и не содержания.
Верни ТОЛЬКО JSON без markdown:
{"level":"clear|partly_clear|unclear","noteRu":"..."}
clear = речь в целом легко понять;
partly_clear = отдельные звуки/слова заметно мешают, но общий смысл понятен;
unclear = значительная часть речи неразборчива.
Не требуй акцента носителя и не штрафуй за иностранный акцент сам по себе.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-audio-mini',
      modalities: ['text'],
      temperature: 0,
      messages: [
        { role: 'system', content: prompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Оцени разборчивость этой записи.' },
            { type: 'input_audio', input_audio: { data: audioWavBase64, format: 'wav' } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new OpenAIRequestError(response.status, detail.slice(0, 500));
  }

  const payload = await response.json();
  const raw = String(payload.choices?.[0]?.message?.content || '').trim();
  const parsed = parseJsonObject(raw);
  const level = ['clear', 'partly_clear', 'unclear'].includes(parsed?.level) ? parsed.level : 'partly_clear';
  return { level, noteRu: String(parsed?.noteRu || '') };
}

async function evaluateAnswer({ apiKey, transcript, body, pronunciation }) {
  const task = buildTaskDescription(body);
  const pronunciationText = pronunciation
    ? `Оценка разборчивости реальной аудиозаписи: ${pronunciation.level}. Комментарий: ${pronunciation.noteRu || '—'}`
    : 'Отдельная аудио-оценка произношения технически не получена. Не выдумывай фонетические ошибки; оцени только то, что можно подтвердить по транскрипту.';

  const systemPrompt = `Ты оцениваешь устную часть Goethe-Zertifikat A1: Start Deutsch 1 в учебном тренажёре Otto.
Ориентир — актуально публикуемый Goethe Modellsatz. Официальная логика Bewertung Sprechen:
- volle Punktzahl: Aufgabe voll erfüllt und verständlich;
- halbe Punktzahl: Aufgabe wegen sprachlicher oder inhaltlicher Mängel nur teilweise erfüllt;
- 0 Punkte: Aufgabe nicht erfüllt und/oder unverständlich;
критерий: Erfüllung der Aufgabenstellung und sprachliche Realisierung.

НЕ создавай собственную систему мелких штрафов. НЕ требуй грамматику выше A1. Ошибки допустимы, если задача выполнена и речь понятна.
Произношение учитывай только как часть понятности языковой реализации: иностранный акцент сам по себе не ошибка.
Если ответа по сути нет, задача не выполнена или речь непонятна — officialLevel=zero и score=0.
Если задача выполнена лишь частично из-за существенных содержательных/языковых проблем — officialLevel=partial и score=50.
Если задача выполнена и понятна — officialLevel=full и score=100.

Teil 1: проверь важные сведения о себе по опорным пунктам. Не придумывай личные данные. Отсутствующие смысловые пункты перечисли в missing.
Teil 2: задача — задать понятный вопрос по теме и слову карточки. Не требуй совпадения с примером.
Teil 3: задача — сформулировать понятную бытовую просьбу/вопрос по карточке и, когда это требуется тренировкой, дать адекватную короткую реакцию.
Freies Sprechen и Phrase — учебные упражнения вне отдельной обязательной части экзамена; оценивай их по понятности и выполнению поставленной учебной задачи, но той же шкалой full/partial/zero.

Верни конкретные списки на русском. strengths — называй реальные удачные слова, ключевое слово, глагол или структуру, которые прозвучали. practice — для каждой существенной ошибки по возможности укажи: что ученик сказал, точное место ошибки, исправленный немецкий вариант, русский перевод и простое объяснение почему. Для ошибки в предлоге назови использованный предлог и его обычный русский смысл, нужный предлог и его смысл, почему он подходит, и короткий правильный пример.

АРТИКЛИ — правило тренажёра A1: если единственная ошибка — der/die/das, ein/eine, род, пропущенный/лишний артикль или форма артикля, а задача выполнена и смысл понятен, НЕ понижай officialLevel/score. Укажи это только как учебную подсказку: «На текущем уровне A1 мы не снижаем за это оценку», с правильным вариантом. Другие существенные ошибки оценивай независимо. Ничего не хвали, если содержательного ответа нет.`;

  const userPrompt = `Задание:\n${task}\n\nРаспознанная речь ученика:\n${transcript}\n\n${pronunciationText}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'sprechen_goethe_feedback',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['officialLevel', 'score', 'strengths', 'practice', 'pronunciationRu', 'missing'],
            properties: {
              officialLevel: { type: 'string', enum: ['full', 'partial', 'zero'] },
              score: { type: 'integer', enum: [0, 50, 100] },
              strengths: { type: 'array', items: { type: 'string' }, maxItems: 4 },
              practice: { type: 'array', items: { type: 'string' }, maxItems: 4 },
              pronunciationRu: { type: 'string' },
              missing: { type: 'array', items: { type: 'string' }, maxItems: 10 },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new OpenAIRequestError(response.status, detail.slice(0, 500));
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty evaluation response');
  const parsed = JSON.parse(content);
  const level = ['full', 'partial', 'zero'].includes(parsed.officialLevel) ? parsed.officialLevel : 'zero';
  const score = level === 'full' ? 100 : level === 'partial' ? 50 : 0;

  return {
    officialLevel: level,
    score,
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String).filter(Boolean).slice(0, 4) : [],
    practice: Array.isArray(parsed.practice) ? parsed.practice.map(String).filter(Boolean).slice(0, 4) : [],
    pronunciationRu: String(parsed.pronunciationRu || pronunciation?.noteRu || ''),
    missing: Array.isArray(parsed.missing) ? parsed.missing.map(String).filter(Boolean).slice(0, 10) : [],
  };
}

function buildTaskDescription(body) {
  if (body.mode === 'teil1') {
    const expected = Array.isArray(body.expectedPoints) ? body.expectedPoints.join(', ') : '';
    return `Teil 1 — Sich vorstellen. В простейшей форме сообщить важные сведения о себе. Опорные пункты тренировки: ${expected}.`;
  }
  if (body.mode === 'teil2') {
    return `Teil 2 — Um Informationen bitten und Informationen geben. Тема: ${String(body.theme || '')}. Слово на карточке: ${String(body.keyword || '')}. Нужно задать один понятный вопрос партнёру. Пример — только ориентир, не единственный правильный ответ: ${String(body.sampleQuestion || '')}`;
  }
  if (body.mode === 'teil3') {
    return `Teil 3 — Bitten formulieren und darauf reagieren. На карточке: ${String(body.object || '')}. Нужно сформулировать понятную бытовую просьбу/вопрос. Пример — только ориентир: ${String(body.sampleRequest || '')}`;
  }
  if (body.mode === 'phrase') {
    return `Учебный перенос знакомой фразы из Schreiben в Sprechen. Ожидаемый смысл: ${String(body.expectedText || '')}. Допустима другая простая A1-формулировка с тем же смыслом.`;
  }
  const expected = Array.isArray(body.expectedPoints) ? body.expectedPoints.join(' | ') : '';
  return `Дополнительная тренировка свободной речи A1. Тема: ${String(body.title || '')}. Нужно коротко и понятно раскрыть опорные вопросы: ${expected}.`;
}

function hasMeaningfulSpeech(transcript, mode) {
  const words = String(transcript || '').match(/[\p{L}\p{N}]+/gu) || [];
  if (!words.length) return false;
  if (mode === 'teil1') return words.join('').length >= 4 && words.length >= 2;
  return words.join('').length >= 2;
}

function zeroResult(reason) {
  return {
    officialLevel: 'zero',
    score: 0,
    transcript: '',
    strengths: [],
    practice: [reason],
    pronunciationRu: 'Произношение не оценивается без содержательной речи.',
    missing: [],
  };
}

function parseJsonObject(raw) {
  try { return JSON.parse(raw); } catch {}
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
  }
  return null;
}
