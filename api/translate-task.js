const MAX_PARTS = 40;
const MAX_TOTAL = 7000;
const MAX_SPEAKING_INPUT = 1500;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Русский перевод сейчас недоступен.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

    if (body.mode === 'speaking-help') {
      const question = String(body.question || '').trim();
      const input = String(body.input || '').trim();

      if (!question || !input) return res.status(400).json({ error: 'Введите свой вариант ответа.' });
      if (question.length + input.length > MAX_SPEAKING_INPUT) {
        return res.status(413).json({ error: 'Ответ слишком длинный для тренировки A1.' });
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.1,
          messages: [
            {
              role: 'system',
              content: 'Ты помощник для устной части Goethe A1. Пользователь отвечает на немецкий вопрос и может написать исходные данные по-русски, по-немецки или смешанно. Сформулируй один естественный короткий ответ уровня A1 на немецком, строго сохраняя факты пользователя и не придумывая личные данные. Дай точный русский перевод и одну очень короткую подсказку по произношению или структуре. Ответ должен быть простым: обычно 1–2 коротких предложения.',
            },
            { role: 'user', content: JSON.stringify({ question, input }) },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'speaking_help',
              strict: true,
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['german', 'russian', 'tip'],
                properties: {
                  german: { type: 'string' },
                  russian: { type: 'string' },
                  tip: { type: 'string' },
                },
              },
            },
          },
        }),
      });

      if (!response.ok) throw new Error(`speaking help failed: ${response.status}`);
      const payload = await response.json();
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error('empty speaking help');
      const parsed = JSON.parse(content);
      return res.status(200).json({ german: parsed.german, russian: parsed.russian, tip: parsed.tip });
    }

    if (body.mode === 'explain-pair') {
      const text = String(body.text || '').trim();
      if (!text) return res.status(400).json({ error: 'Нет текста для объяснения.' });
      if (text.length > MAX_SPEAKING_INPUT) return res.status(413).json({ error: 'Слишком большой текст для объяснения.' });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0,
          messages: [
            {
              role: 'system',
              content: 'Ты помощник тренажёра Goethe A1. Коротко и простым русским языком объясни уже проверенную пару «задание/правильный ответ». Не меняй правильный ответ, не придумывай новых фактов и не добавляй лишних советов. Объяснение — максимум 2 коротких предложения.',
            },
            { role: 'user', content: text },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'reading_pair_explanation',
              strict: true,
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['explanationRu'],
                properties: {
                  explanationRu: { type: 'string' },
                },
              },
            },
          },
        }),
      });

      if (!response.ok) throw new Error(`reading explanation failed: ${response.status}`);
      const payload = await response.json();
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error('empty reading explanation');
      const parsed = JSON.parse(content);
      const explanationRu = String(parsed?.explanationRu || '').trim();
      if (!explanationRu) throw new Error('invalid reading explanation');
      return res.status(200).json({ explanationRu });
    }

    const parts = Array.isArray(body.parts)
      ? body.parts.map((value) => String(value || '').trim()).filter(Boolean).slice(0, MAX_PARTS)
      : [];

    if (!parts.length) return res.status(400).json({ error: 'Нет текста для перевода.' });
    if (parts.join('\n').length > MAX_TOTAL) return res.status(413).json({ error: 'Слишком большой текст для перевода.' });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'Переведи каждый элемент массива с немецкого на простой естественный русский. Это учебный Goethe A1. Переводи строго смысл, имена, даты, время и числа сохраняй. Если элемент уже написан по-русски, верни его без изменений. Не решай задание, не подсказывай правильный ответ и не добавляй объяснений. Верни ровно столько переводов, сколько входных элементов.',
          },
          { role: 'user', content: JSON.stringify(parts) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'task_translations',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['translations'],
              properties: {
                translations: {
                  type: 'array',
                  minItems: parts.length,
                  maxItems: parts.length,
                  items: { type: 'string' },
                },
              },
            },
          },
        },
      }),
    });

    if (!response.ok) throw new Error(`translation failed: ${response.status}`);
    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error('empty translation');
    const parsed = JSON.parse(content);
    return res.status(200).json({ translations: parsed.translations });
  } catch (error) {
    console.error('translate-task error', error);
    return res.status(500).json({ error: 'Не удалось обработать запрос. Попробуйте ещё раз.' });
  }
}
