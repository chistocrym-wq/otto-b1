import {useEffect,useState,type ChangeEvent} from 'react';

type Inventory={total:number;installed:number;missing:number[];unavailable:number[];keyUploadAllowed?:boolean;aiConfigured?:{schreiben:boolean;sprechen:boolean}};
const SCORES='/api/otto30-score';
async function inventory():Promise<Inventory>{
 const res=await fetch(SCORES+'?op=inventory',{credentials:'same-origin',cache:'no-store'});
 if(!res.ok)throw Error('Не удалось получить состояние закрытых ключей ('+res.status+').');
 return await res.json() as Inventory;
}
/** Visible only to the distinct server-authorized key administrator. */
export function Exam30KeyAdmin(){
 const [state,setState]=useState<Inventory|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [uploaded,setUploaded]=useState(0);
 const [error,setError]=useState('');
 useEffect(()=>{let live=true;void inventory().then(result=>{if(live)setState(result)}).catch(()=>{}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[]);
 if(loading||!state?.keyUploadAllowed)return null;
 const upload=async(event:ChangeEvent<HTMLInputElement>)=>{
  const files=Array.from(event.currentTarget.files||[]);
  event.currentTarget.value='';
  if(!files.length)return;
  const selected=new Map<number,File>();
  for(const file of files){
   const found=/^exam_(0[1-9]|[12][0-9]|30)\.key\.json$/.exec(file.name);
   if(!found){setError('Нужны только 30 распакованных файлов exam_01.key.json — exam_30.key.json.');return;}
   const n=Number(found[1]);
   if(selected.has(n)){setError('Обнаружен повтор файла exam_'+found[1]+'.key.json.');return;}
   selected.set(n,file);
  }
  if(selected.size!==30){setError('Выбрано '+selected.size+' из 30 файлов. Выберите все 30 одновременно.');return;}
  setBusy(true);setUploaded(0);setError('');
  try{
   for(let n=1;n<=30;n++){
    const file=selected.get(n)!;
    const res=await fetch(SCORES+'?op=install-key&exam='+n,{
     method:'POST',credentials:'same-origin',cache:'no-store',
     headers:{'Content-Type':'application/json','x-otto30-owner-upload':'1'},
     body:file
    });
    if(!res.ok){
     const details=await res.json().catch(()=>({code:'server_error'})) as {code?:string};
     throw Error('Файл №'+n+': '+(details.code||res.status)+'. Установка остановлена.');
    }
    setUploaded(n);
   }
   const fresh=await inventory();
   setState(fresh);
   if(fresh.installed!==30||fresh.missing?.length||fresh.unavailable?.length)throw Error('Сервер ещё не подтверждает все 30 ключей. Повторите проверку.');
  }catch(e){setError(e instanceof Error?e.message:'Не удалось установить ключи.');}
  finally{setBusy(false);}
 };
 return <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-slate-900">
  <summary className="cursor-pointer font-bold">Администрирование оценивания OTTO</summary>
  <p className="mt-3 text-sm">Ключи установлены: <strong>{state.installed} из 30</strong>.</p>
  {state.installed!==30&&<><p className="mt-2 text-sm leading-6">Распакуйте закрытый ZIP E9R3 на своём компьютере и выделите все 30 файлов <code>exam_XX.key.json</code>. Сервер сверит размеры и SHA-256 с исходным манифестом. Ответы не сохраняются в браузере.</p>
   <input type="file" multiple accept=".json,application/json" disabled={busy} onChange={e=>void upload(e)} aria-label="Закрытая установка 30 ключей только администратором" className="mt-3 block max-w-full text-sm"/>
  </>}
  {busy&&<p role="status" className="mt-3 text-sm">Устанавливаю ключи на сервер: {uploaded} / 30</p>}
  {error&&<p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
  {state.installed===30&&<p className="mt-3 text-sm font-semibold text-teal-800">Все 30 ключей доступны серверу. AI для Schreiben: {state.aiConfigured?.schreiben?'настроен':'не подтверждён'}; для Sprechen: {state.aiConfigured?.sprechen?'настроен':'не подтверждён'}. Работу AI проверяет реальная попытка экзамена.</p>}
  <button type="button" disabled={busy} onClick={()=>void inventory().then(setState).catch(()=>setError('Не удалось проверить хранилище.'))} className="mt-3 min-h-11 rounded-lg border border-slate-300 px-4 font-semibold disabled:opacity-50">Проверить хранилище</button>
 </details>;
}
