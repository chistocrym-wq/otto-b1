// Read-only Russian Central Bank XML daily exchange rates. Rubles per ONE
// unit of foreign currency, even for CBR entries with Nominal 100 or 10000.
// All rates are informational; no payouts or commission records are modified.
const CODES=new Set(['BYN','EUR','USD','KZT','UZS','KGS','AMD']);
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{
 'content-type':'application/json; charset=utf-8',
 'cache-control':status===200?'public, max-age=3600':'no-store'
}});
export function parseTeacherCbrXml(xml){
 if(typeof xml!=='string'||xml.length<100||xml.length>2000000)throw Error('invalid_xml');
 const rawDate=xml.match(/<ValCurs\b[^>]*\bDate=["'](\d{2}\.\d{2}\.\d{4})["']/)?.[1];
 if(!rawDate)throw Error('invalid_rate_date');
 const [d,m,y]=rawDate.split('.').map(Number);
 const verified=new Date(Date.UTC(y,m-1,d));
 if(y<2000||y>2100||verified.getUTCDate()!==d||verified.getUTCMonth()!==m-1||verified.getUTCFullYear()!==y)
   throw Error('invalid_rate_date');
 const rates={RUB:1};
 for(const [,block] of xml.matchAll(/<Valute\b[^>]*>([\s\S]*?)<\/Valute>/g)){
  const code=block.match(/<CharCode>([^<]+)<\/CharCode>/)?.[1];
  if(!CODES.has(code))continue;
  const nominal=Number((block.match(/<Nominal>([^<]+)<\/Nominal>/)?.[1]||'').replace(',','.'));
  const value=Number((block.match(/<Value>([^<]+)<\/Value>/)?.[1]||'').replace(',','.'));
  if(Number.isFinite(nominal)&&nominal>0&&Number.isFinite(value)&&value>0)
   rates[code]=value/nominal;
 }
 if(!rates.BYN||!rates.EUR||!rates.USD)throw Error('missing_core_rates');
 return {source:'Банк России',sourceUrl:'https://www.cbr.ru/scripts/XML_daily.asp',date:rawDate,rates};
}
export default async function handler(req){
 if(req.method!=='GET')return json({error:'method_not_allowed'},405);
 try{
  const response=await fetch('https://www.cbr.ru/scripts/XML_daily.asp',{
   headers:{accept:'application/xml'},signal:AbortSignal.timeout(9000)
  });
  if(!response.ok)throw Error('fx_upstream_'+response.status);
  const data=parseTeacherCbrXml(await response.text());
  return json(data);
 }catch(error){
  console.error('Teacher exchange-rate fetch failed',error instanceof Error?error.message:'unknown');
  return json({error:'exchange_rate_unavailable'},503);
 }
}
export const config={path:'/api/teacher-fx'};
