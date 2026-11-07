export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Пример пока недоступен: отсутствует OPENAI_API_KEY.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const situation = String(body.situation || '').trim().slice(0, 1800);
    const points = Array.isArray(body.points) ? body.points.map(String).slice(0, 3) : [];
    if (!situation || points.length !== 3) return res.status(400).json({ error: 'Некорректное задание Schreiben.' });

    const system = `Ты тренер Goethe-Zertifikat A1 Schreiben Teil 2. Создай ОДИН естественный образец короткого письма уровня A1 по заданию пользователя. Обязательно: уместное обращение, все три пункта, простые A1-предложения, уместное прощание. Пример должен быть примерно 25–45 слов, без сложной грамматики, без пояснений внутри письма и без плейсхолдеров. Затем дай по-русски одну очень короткую подсказку о структуре. Не копируй задание вместо ответа.`;
    const user = `Ситуация:\n${situation}\n\nПункты:\n1. ${points[0]}\n2. ${points[1]}\n3. ${points[2]}`;
    const schema = {
      type: 'object',
      additionalProperties: false,
      required: ['example', 'noteRu'],
      properties: {
        example: { type: 'string' },
        noteRu: { type: 'string' },
      },
    };

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5',
        store: false,
        reasoning: { effort: 'minimal' },
        max_output_tokens: 900,
        input: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        text: { format: { type: 'json_schema', name: 'schreiben_example', strict: true, schema } },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI example failed: ${response.status} ${detail.slice(0, 500)}`);
    }
    const payload = await response.json();
    const outputText = payload.output
      ?.flatMap((item) => Array.isArray(item.content) ? item.content : [])
      .find((item) => item.type === 'output_text')?.text;
    if (!outputText) throw new Error('Empty example response');
    return res.status(200).json(JSON.parse(outputText));
  } catch (error) {
    console.error('schreiben-example error', error);
    return res.status(500).json({ error: 'Не удалось подготовить пример. Попробуйте ещё раз.' });
  }
}
