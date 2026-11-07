const MAX_AUDIO_BYTES = 3 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Распознавание речи временно недоступно.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const audioBase64 = typeof body.audioBase64 === 'string' ? body.audioBase64 : '';
    if (!audioBase64) return res.status(400).json({ error: 'Аудиозапись не получена.' });

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    if (!audioBuffer.length) return res.status(400).json({ error: 'Аудиозапись пустая.' });
    if (audioBuffer.length > MAX_AUDIO_BYTES) return res.status(413).json({ error: 'Запись слишком длинная. Скажите фразу короче.' });

    const mimeType = normalizeMimeType(body.mimeType);
    const extension = extensionForMime(mimeType);
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(audioBuffer)], { type: mimeType }), `russian.${extension}`);
    form.append('model', 'gpt-4o-mini-transcribe');
    form.append('language', 'ru');
    form.append('response_format', 'json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('transcribe-ru OpenAI error', response.status, detail.slice(0, 300));
      return res.status(502).json({ error: 'Не удалось распознать русскую речь. Попробуйте ещё раз.' });
    }

    const payload = await response.json();
    const text = String(payload.text || '').trim();
    if (!text) return res.status(422).json({ error: 'Речь не распознана. Попробуйте сказать фразу ещё раз.' });
    return res.status(200).json({ text });
  } catch (error) {
    console.error('transcribe-ru error', error);
    return res.status(500).json({ error: 'Не удалось распознать русскую речь.' });
  }
}

function normalizeMimeType(value) {
  const raw = typeof value === 'string' ? value.toLowerCase().split(';')[0].trim() : '';
  return raw.startsWith('audio/') ? raw : 'audio/webm';
}

function extensionForMime(mime) {
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) return 'm4a';
  return 'webm';
}
