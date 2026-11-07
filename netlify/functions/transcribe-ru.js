import { requireOttoTrainingAccess } from '../lib/otto-ai-access.js';
const MAX_AUDIO_BASE64 = 4_000_000;
const MODEL = 'gemini-3.8-flash';

export default async (req, context) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
  const accessError = await requireOttoTrainingAccess(req, context);
  if (accessError) return accessError;
  const apiKey = process.env.GEMINI_API_KEY;
  const baseUrl = process.env.GOOGLE_GEMINI_BASE_URL;
  if (!apiKey || !baseUrl) return json({ error: 'Распознавание речи сейчас недоступно.' }, 503);

  try {
    const body = await req.json().catch(() => ({}));
    const audioBase64 = String(body.audioBase64 || '');
    const mimeType = normalizeMimeType(body.mimeType);
    if (!audioBase64) return json({ error: 'Аудиозапись не получена.' }, 400);
    if (audioBase64.length > MAX_AUDIO_BASE64) return json({ error: 'Запись слишком длинная. Скажите фразу короче.' }, 413);

    const response = await fetch(`${baseUrl}/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { text: 'Точно распознай русскую речь в аудио. Верни только то, что сказал пользователь, без перевода, исправлений и комментариев.' },
          { inlineData: { mimeType, data: audioBase64 } },
        ] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: { type:'OBJECT', required:['text'], properties:{ text:{type:'STRING'} } },
        },
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error('transcribe-ru Gemini error', response.status, detail.slice(0,500));
      return json({ error: 'Не удалось распознать русскую речь. Попробуйте ещё раз.' }, 502);
    }
    const payload = await response.json();
    const raw = payload?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('').trim();
    if (!raw) return json({ error: 'Речь не распознана. Попробуйте сказать фразу ещё раз.' }, 422);
    const parsed = JSON.parse(stripFences(raw));
    const text = String(parsed.text || '').trim();
    if (!text) return json({ error: 'Речь не распознана. Попробуйте сказать фразу ещё раз.' }, 422);
    return json({ text });
  } catch (error) {
    console.error('transcribe-ru error', error);
    return json({ error: 'Не удалось распознать русскую речь.' }, 500);
  }
};

export const config = { path: '/api/transcribe-ru' };
function normalizeMimeType(value){const mime=String(value||'audio/webm').toLowerCase().split(';')[0].trim();if(mime==='audio/x-m4a')return'audio/mp4';return mime.startsWith('audio/')?mime:'audio/webm'}
function stripFences(value){return String(value).replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'').trim()}
function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...headers}})}