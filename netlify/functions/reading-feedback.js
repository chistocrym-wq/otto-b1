import { requireOttoTrainingAccess } from '../lib/otto-ai-access.js';
const MAX_ITEMS = 3;
const MAX_TOTAL = 7000;
const MODEL = 'gpt-4o-mini';

export default async (req, context) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
  const accessError = await requireOttoTrainingAccess(req, context);
  if (accessError) return accessError;
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL;
  if (!apiKey || !baseUrl) return json({ error: 'Объяснение сейчас недоступно.', code: 'missing_ai_gateway' }, 503);

  try {
    const body = await req.json().catch(() => ({}));
    const part = Number(body.part);
    const items = Array.isArray(body.items) ? body.items.slice(0, MAX_ITEMS).map(normalizeItem) : [];
    if (![1, 2, 3].includes(part) || !items.length || items.some((item) => !item.context || !item.prompt || !item.correctAnswer)) {
      return json({ error: 'Некорректное задание Lesen.', code: 'invalid_input' }, 400);
    }
    if (JSON.stringify(items).length > MAX_TOTAL) return json({ error: 'Задание слишком большое.', code: 'input_too_large' }, 413);

    const system = `Ты объясняешь уже проверенное задание Lesen уровня A1. Правильный ответ передан приложением и является фактом: НИКОГДА не меняй его и не решай задание заново.
Для каждого элемента дай две короткие версии одного и того же объяснения:
- de: простой немецкий A1/A2, 1–3 коротких предложения;
- ru: понятный русский, 1–3 коротких предложения.
Обязательно назови конкретную информацию из текста, на которой держится ответ: слово/отрицание/время/число/дату/имя/место или ключевую фразу. Если важны schon, noch, erst, nur, nicht, kein и т. п., явно объясни их роль. Если ответ пользователя был правильным, всё равно объясни, на что он верно опирался. Не добавляй фактов, которых нет во входном тексте.`;
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: JSON.stringify({ part, items }) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'otto_reading_feedback',
            strict: true,
            schema: {
              type: 'object', additionalProperties: false, required: ['items'],
              properties: { items: { type: 'array', minItems: items.length, maxItems: items.length, items: {
                type: 'object', additionalProperties: false, required: ['de','ru'], properties: { de: { type: 'string' }, ru: { type: 'string' } },
              } } },
            },
          },
        },
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error('Reading feedback failed', response.status, detail.slice(0, 700));
      return json({ error: 'Не удалось подготовить объяснение.', code: 'ai_error' }, 502);
    }
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw new Error('empty_reading_feedback');
    const parsed = JSON.parse(content);
    const output = Array.isArray(parsed?.items) ? parsed.items.map((item) => ({ de: String(item?.de || '').trim(), ru: String(item?.ru || '').trim() })) : [];
    if (output.length !== items.length || output.some((item) => !item.de || !item.ru)) throw new Error('invalid_reading_feedback');
    return json({ items: output });
  } catch (error) {
    console.error('reading-feedback error', error);
    return json({ error: 'Не удалось подготовить объяснение.', code: 'server_error' }, 500);
  }
};

function normalizeItem(value) {
  return {
    context: String(value?.context || '').trim().slice(0, 3200),
    prompt: String(value?.prompt || '').trim().slice(0, 800),
    correctAnswer: String(value?.correctAnswer || '').trim().slice(0, 32),
    sourceExplanation: String(value?.sourceExplanation || '').trim().slice(0, 800),
  };
}
function json(data, status = 200, headers = {}) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } }); }
export const config = { path: '/api/reading-feedback' };
