import { requireOttoTrainingAccess } from '../lib/otto-ai-access.js';
export default async (req, context) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
  const accessError = await requireOttoTrainingAccess(req, context);
  if (accessError) return accessError;
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL;
  if (!apiKey || !baseUrl) return json({ error: 'Пример сейчас недоступен.' }, 503);

  try {
    const body = await req.json().catch(() => ({}));
    const situation = String(body.situation || '').trim().slice(0, 1800);
    const points = Array.isArray(body.points) ? body.points.map(String).slice(0, 3) : [];
    if (!situation || points.length !== 3) return json({ error: 'Некорректное задание Schreiben.' }, 400);

    const system = `Ты тренер Goethe-Zertifikat A1 Schreiben Teil 2. Создай ОДИН естественный образец короткого письма уровня A1 именно для переданного задания. Обязательно: уместное обращение; содержательный ответ на каждый из трёх конкретных пунктов; простые предложения A1; уместное прощание. Пример примерно 25–45 слов. Не используй универсальный шаблон вместо ответа, не пропускай ни один пункт и не добавляй факты, которых не требует ситуация. Затем дай одну очень короткую подсказку по-русски о структуре.`;
    const prompt = `Ситуация:\n${situation}\n\nТри обязательных пункта:\n1. ${points[0]}\n2. ${points[1]}\n3. ${points[2]}`;

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'schreiben_example',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['example', 'noteRu'],
              properties: { example: { type: 'string' }, noteRu: { type: 'string' } },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('schreiben-example AI error', response.status, detail.slice(0,500));
      return json({ error: 'Не удалось подготовить пример. Попробуйте ещё раз.' }, 502);
    }
    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty example response');
    const parsed = JSON.parse(content);
    return json({ example: String(parsed.example || ''), noteRu: String(parsed.noteRu || '') });
  } catch (error) {
    console.error('schreiben-example error', error);
    return json({ error: 'Не удалось подготовить пример. Попробуйте ещё раз.' }, 500);
  }
};

export const config = { path: '/api/schreiben-example' };
function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...headers}})}
