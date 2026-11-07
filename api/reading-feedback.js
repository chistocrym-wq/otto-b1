const MAX_ITEMS = 3;
const MAX_TOTAL = 7000;
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Объяснение сейчас недоступно.', code: 'missing_api_key' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const part = Number(body.part);
    const items = Array.isArray(body.items) ? body.items.slice(0, MAX_ITEMS).map(normalizeItem) : [];
    if (![1,2,3].includes(part) || !items.length || items.some((item) => !item.context || !item.prompt || !item.correctAnswer)) return res.status(400).json({ error:'Некорректное задание Lesen.', code:'invalid_input' });
    if (JSON.stringify(items).length > MAX_TOTAL) return res.status(413).json({ error:'Задание слишком большое.', code:'input_too_large' });
    const system = `Ты объясняешь уже проверенное задание Lesen уровня A1. Правильный ответ передан приложением и является фактом: НИКОГДА не меняй его и не решай задание заново. Для каждого элемента верни de и ru: коротко, конкретно и просто. Обязательно назови точную информацию из текста, которая определяет ответ: ключевую фразу, отрицание, время, число, дату, имя, место или слова schon/noch/erst/nur/nicht/kein, если они важны. Для правильного ответа тоже объясни, на что ученик верно опирался. Не добавляй новых фактов.`;
    const response = await fetch('https://api.openai.com/v1/chat/completions', { method:'POST', headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'}, body:JSON.stringify({ model:'gpt-4o-mini',temperature:0,messages:[{role:'system',content:system},{role:'user',content:JSON.stringify({part,items})}],response_format:{type:'json_schema',json_schema:{name:'otto_reading_feedback',strict:true,schema:{type:'object',additionalProperties:false,required:['items'],properties:{items:{type:'array',minItems:items.length,maxItems:items.length,items:{type:'object',additionalProperties:false,required:['de','ru'],properties:{de:{type:'string'},ru:{type:'string'}}}}}}}} }) });
    if(!response.ok) return res.status(502).json({error:'Не удалось подготовить объяснение.',code:'ai_error'});
    const payload=await response.json(); const content=payload?.choices?.[0]?.message?.content; if(!content) throw new Error('empty');
    const parsed=JSON.parse(content); const output=Array.isArray(parsed?.items)?parsed.items.map((item)=>({de:String(item?.de||'').trim(),ru:String(item?.ru||'').trim()})):[];
    if(output.length!==items.length||output.some((item)=>!item.de||!item.ru))throw new Error('invalid');
    return res.status(200).json({items:output});
  } catch(error){ console.error('reading-feedback error',error); return res.status(500).json({error:'Не удалось подготовить объяснение.',code:'server_error'}); }
}
function normalizeItem(value){return{context:String(value?.context||'').trim().slice(0,3200),prompt:String(value?.prompt||'').trim().slice(0,800),correctAnswer:String(value?.correctAnswer||'').trim().slice(0,32),sourceExplanation:String(value?.sourceExplanation||'').trim().slice(0,800)}}
