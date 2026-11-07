import { requireOttoTrainingAccess } from '../lib/otto-ai-access.js';
const MAX_PARTS = 40;
const MAX_TOTAL = 7000;
const MAX_SPEAKING_INPUT = 1500;

export default async (req, context) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
  const accessError = await requireOttoTrainingAccess(req, context);
  if (accessError) return accessError;

  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL;
  if (!apiKey || !baseUrl) return json({ error: 'Русский перевод сейчас недоступен.' }, 503);

  try {
    const body = await req.json().catch(() => ({}));

    if (body.mode === 'speaking-help') {
      const question = String(body.question || '').trim();
      const input = String(body.input || '').trim();
      if (!question || !input) return json({ error: 'Напишите или скажите свой вариант по-русски.' }, 400);
      if (question.length + input.length > MAX_SPEAKING_INPUT) return json({ error: 'Ответ слишком длинный для тренировки A1.' }, 413);

      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.1,
          messages: [
            { role: 'system', content: 'Ты помощник для устной подготовки Goethe A1. Пользователь может дать свои факты по-русски, по-немецки или смешанно. Сформулируй один естественный короткий ответ уровня A1 на немецком, строго сохраняя факты пользователя и не придумывая личные данные. Дай точный русский перевод и одну короткую подсказку по произношению или структуре. Обычно 1–2 простых предложения.' },
            { role: 'user', content: JSON.stringify({ question, input }) },
          ],
          response_format: { type: 'json_schema', json_schema: { name: 'speaking_help', strict: true, schema: { type:'object', additionalProperties:false, required:['german','russian','tip'], properties:{ german:{type:'string'}, russian:{type:'string'}, tip:{type:'string'} } } } },
        }),
      });
      if (!response.ok) throw new Error(`speaking help failed: ${response.status}`);
      const payload = await response.json();
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error('empty speaking help');
      const parsed = JSON.parse(content);
      return json({ german: parsed.german, russian: parsed.russian, tip: parsed.tip });
    }

    if (body.mode === 'explain-pair') {
      const text = String(body.text || '').trim().slice(0, 1800);
      if (!text) return json({ error: 'Нет текста для объяснения.' }, 400);
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini', temperature: 0,
          messages: [
            { role: 'system', content: 'Дан короткий комментарий к заданию Goethe A1. Верни его в двух версиях: простое естественное немецкое объяснение уровня A1/A2 и точный понятный русский перевод. Не добавляй новых фактов и не меняй правильный ответ.' },
            { role: 'user', content: text },
          ],
          response_format: { type:'json_schema', json_schema:{ name:'bilingual_explanation', strict:true, schema:{ type:'object', additionalProperties:false, required:['de','ru'], properties:{de:{type:'string'},ru:{type:'string'}} } } },
        }),
      });
      if (!response.ok) throw new Error(`explain pair failed: ${response.status}`);
      const payload = await response.json();
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error('empty explanation');
      const parsed = JSON.parse(content);
      return json({de:String(parsed.de||''),ru:String(parsed.ru||'')});
    }

    const parts = Array.isArray(body.parts)
      ? body.parts.map((value) => String(value || '').trim()).filter(Boolean).slice(0, MAX_PARTS)
      : [];
    if (!parts.length) return json({ error: 'Нет текста для перевода.' }, 400);
    if (parts.join('\n').length > MAX_TOTAL) return json({ error: 'Слишком большой текст для перевода.' }, 413);

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          { role: 'system', content: 'Переведи каждый элемент массива с немецкого на простой естественный русский для уровня A1. Переводи строго смысл, имена, даты, время и числа сохраняй. Если элемент уже написан по-русски, верни его без изменений. Не решай задание, не подсказывай правильный ответ и не добавляй объяснений. Верни ровно столько переводов, сколько входных элементов.' },
          { role: 'user', content: JSON.stringify(parts) },
        ],
        response_format: { type:'json_schema', json_schema:{ name:'task_translations', strict:true, schema:{ type:'object', additionalProperties:false, required:['translations'], properties:{ translations:{ type:'array', minItems:parts.length, maxItems:parts.length, items:{type:'string'} } } } } },
      }),
    });
    if (!response.ok) throw new Error(`translation failed: ${response.status}`);
    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error('empty translation');
    const parsed = JSON.parse(content);
    return json({ translations: parsed.translations });
  } catch (error) {
    console.error('translate-task error', error);
    return json({ error: 'Не удалось обработать запрос. Попробуйте ещё раз.' }, 500);
  }
};

export const config = { path: '/api/translate-task' };
function json(data, status = 200, headers = {}) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } }); }