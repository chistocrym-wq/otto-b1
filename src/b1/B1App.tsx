import { B1Reference } from './B1Reference';
import { useEffect, useMemo, useRef, useState } from 'react';
import { B1_PARTS, b1DraftKey, loadB1Teil, scoreB1Answers, type B1Subject, type B1Teil } from './content';

const SUBJECTS: B1Subject[] = ['horen', 'lesen', 'schreiben', 'sprechen'];
const NAME: Record<B1Subject,string> = {horen:'Hören',lesen:'Lesen',schreiben:'Schreiben',sprechen:'Sprechen'};
const MAX_PLAYS: Record<number,number> = {1:2,2:1,3:1,4:2};
function isRestricted(line:string) {
 return /^(?:RU\s*[·:]|Перевод|Полный перевод|Lösung|Lösungen|LÖSUNG|Erklärung|Begründung|Объяснение|Musterlösung|Mustertext|Musterantwort|Ключ|Ключи|Правильн|Ответы|Auswertung|Bewertung|[1-9]\.\s*Полный перевод)/i.test(line)
   || /[А-Яа-яЁё]/.test(line);
}
function visibleLines(lines:string[], reviewed:boolean) {
 if(reviewed)return lines;
 let transcript=false;
 const visible:string[]=[];
 for(const line of lines) {
   if(/^AUDIO DE\s*[·:]/i.test(line)){transcript=true;visible.push(line);continue;}
   if(/^(?:RU\s*[·:]|СИТУАЦИЯ \(RU\)|[1-9]\.\s*Полный перевод|Aufgabe\s+\d+|Задание\s+\d+|Folie\s+\d+|\d+\.\s*(?:Текст|Задание)|SITUATION \(DE\))/i.test(line))transcript=false;
   if(transcript||isRestricted(line))continue;
   visible.push(line);
 }
 return visible;
}
function questionLabel(lines:string[],id:string) {
 const re=new RegExp('^(?:Aufgabe\\s+)?'+id.replace(/[.*+?^$()|[\]{}\\]/g,'\\$&')+'(?:[.)\\s—–-]|$)','i');
 return lines.find(line=>re.test(line)&&!/[А-Яа-яЁё]/.test(line)&&!/Lösung|Antworten/.test(line))?.slice(0,250)||'Aufgabe '+id;
}
function getDraft(id:string):{answers:Record<string,string>;essay:string;done:boolean}{
 try{const v=JSON.parse(localStorage.getItem(id)||'{}');return {answers:v.answers||{},essay:v.essay||'',done:!!v.done};}
 catch{return {answers:{},essay:'',done:false};}
}
function choices(answer:string, key:Record<string,string>):string[]{
 if(['richtig','falsch'].includes(answer))return ['richtig','falsch'];
 if(['ja','nein'].includes(answer))return ['ja','nein'];
 if(answer==='0'||/^[d-j]$/.test(answer)||Object.values(key).some(v=>v==='0'||/^[d-j]$/.test(v)))return ['0','a','b','c','d','e','f','g','h','i','j'];
 return ['a','b','c'];
}
let indexPromise: Promise<Record<string,number>> | null = null;
const packCache = new Map<number,Promise<Array<{name:string;b64:string}>>>();
function audioIndex(){
 if(!indexPromise)indexPromise=fetch('/b1/audio-index.json').then(r=>{if(!r.ok)throw new Error('Audio index HTTP '+r.status);return r.json() as Promise<Record<string,number>>;});
 return indexPromise;
}
async function resolveAudio(id:string){
 const index=await audioIndex();
 const pack=index[id];
 if(!Number.isInteger(pack))throw new Error('Audio is not available: '+id);
 if(pack===0)return {src:'/b1/audio/'+encodeURIComponent(id)+'.mp3',object:false};
 let promise=packCache.get(pack);
 if(!promise){
  promise=fetch('/b1/audio-packs/bundle-'+String(pack).padStart(3,'0')+'.jsonl')
    .then(async r=>{if(!r.ok)throw new Error('Audio pack HTTP '+r.status);
       return (await r.text()).split(/\n/).filter(Boolean).map(row=>JSON.parse(row) as {name:string;b64:string});});
  packCache.set(pack,promise);
 }
 const records=await promise;
 const record=records.find(x=>x.name===id+'.mp3');
 if(!record)throw new Error('Audio missing in pack: '+id);
 const raw=atob(record.b64);
 const bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 return {src:URL.createObjectURL(new Blob([bytes],{type:'audio/mpeg'})),object:true};
}
function AudioClip({id,subject,teil}:{id:string;subject:B1Subject;teil:number}){
 const [plays,setPlays]=useState(0);
 const [src,setSrc]=useState('');
 const [busy,setBusy]=useState(false);
 const [audioError,setAudioError]=useState('');
 const isObject=useRef(false);
 const max=subject==='horen'? MAX_PLAYS[teil]||1:Infinity;
 useEffect(()=>()=>{if(isObject.current&&src)URL.revokeObjectURL(src);},[src]);
 const load=async()=>{
  setBusy(true);setAudioError('');
  try{const result=await resolveAudio(id);isObject.current=result.object;setSrc(result.src);}
  catch(e){setAudioError(e instanceof Error?e.message:'Не удалось загрузить аудио');}
  finally{setBusy(false);}
 };
 return <div className="rounded-xl border border-teal-200 bg-teal-50 p-3">
  <div className="mb-2 text-sm font-semibold">{id}</div>
  {!src?<button type="button" onClick={()=>void load()} disabled={busy} className="min-h-11 rounded-xl border border-teal-700 px-4 font-semibold text-teal-800">{busy?'Загружаем аудио…':'Подготовить аудио'}</button>:
    plays>=max?<p className="text-sm">Лимит прослушиваний достигнут.</p>:
    <audio key={id} controls preload="none" className="w-full" src={src}
      onPlay={e=>{if(e.currentTarget.currentTime<0.3)setPlays(p=>p+1);}}/>}
  {audioError&&<p role="alert" className="mt-2 text-sm text-rose-700">{audioError}</p>}
  <p className="mt-1 text-xs text-slate-600">{Number.isFinite(max)?'Прослушиваний: '+plays+' / '+max:'Тренировочное аудио'}</p>
 </div>;
}
export default function B1App(){
 const [subject,setSubject]=useState<B1Subject>('horen');
 const [teil,setTeil]=useState(1);
 const [setNum,setSetNum]=useState(1);
 const [part,setPart]=useState<B1Teil|null>(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [answers,setAnswers]=useState<Record<string,string>>({});
 const [essay,setEssay]=useState('');
 const [done,setDone]=useState(false);
 const [recording,setRecording]=useState(false);
 const [showReference,setShowReference]=useState(false);
 const [recordUrl,setRecordUrl]=useState('');
 const recorder=useRef<MediaRecorder|null>(null);
 const chunks=useRef<Blob[]>([]);
 const setData=useMemo(()=>part?.sets.find(s=>s.number===setNum),[part,setNum]);
 const key=b1DraftKey('local-preview',subject,teil,setNum);
 useEffect(()=>{
  const ctrl=new AbortController();
  setPart(null);setError('');setLoading(true);
  loadB1Teil(subject,teil,ctrl.signal).then(data=>setPart(data))
   .catch(err=>{if(!ctrl.signal.aborted)setError(String(err));})
   .finally(()=>{if(!ctrl.signal.aborted)setLoading(false);});
  return ()=>ctrl.abort();
 },[subject,teil]);
 useEffect(()=>{const draft=getDraft(key);setAnswers(draft.answers);setEssay(draft.essay);setDone(draft.done);},[key]);
 useEffect(()=>{
  if(!setData)return;
  localStorage.setItem(key,JSON.stringify({answers,essay,done,updatedAt:new Date().toISOString()}));
 },[key,answers,essay,done,setData]);
 const changeSubject=(next:B1Subject)=>{setSubject(next);setTeil(1);setSetNum(1);};
 const changeTeil=(next:number)=>{setTeil(next);setSetNum(1);};
 const startRecording=async()=>{
  if(!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder==='undefined'){setError('Браузер не поддерживает запись голоса.');return;}
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   chunks.current=[];
   const rec=new MediaRecorder(stream);
   recorder.current=rec;
   rec.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data);};
   rec.onstop=()=>{const blob=new Blob(chunks.current,{type:rec.mimeType});setRecordUrl(URL.createObjectURL(blob));stream.getTracks().forEach(t=>t.stop());setRecording(false);};
   rec.start();setRecording(true);setError('');
  }catch{setError('Нет доступа к микрофону. Разрешите доступ в настройках браузера.');}
 };
 const stopRecording=()=>recorder.current?.state==='recording'&&recorder.current.stop();
 useEffect(()=>()=>{if(recordUrl)URL.revokeObjectURL(recordUrl);},[recordUrl]);
 const score=setData?scoreB1Answers(setData.answerKey||{},answers):null;
 return <div className="min-h-screen bg-[#f7f1e8] text-slate-900">
  <header className="border-b border-[#d6cbbd] bg-white/90"><div className="mx-auto max-w-6xl px-4 py-4">
   <div className="flex items-center justify-between gap-4"><div><h1 className="text-3xl font-black text-teal-900">OTTO B1</h1><button className="mt-2 min-h-11 rounded-xl border border-teal-700 px-4 font-semibold text-teal-800" onClick={()=>setShowReference(x=>!x)}>{showReference?"К экзаменам":"Справочник B1"}</button></div><img src="/otto-full-transparent.webp" alt="Отто с усами" className="h-24 w-24 object-contain"/></div>
   <p className="text-sm">Тренажёр Goethe-Zertifikat B1 · учебная Preview-версия</p>
  </div></header>
  <main className="mx-auto max-w-6xl px-4 py-6">
  {showReference?<B1Reference onClose={()=>setShowReference(false)}/>:<>
  <nav aria-label="Разделы экзамена" className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4">
   {SUBJECTS.map(s=><button key={s} onClick={()=>changeSubject(s)} aria-pressed={subject===s}
    className={'min-h-12 rounded-2xl border px-4 font-bold '+(subject===s?'border-teal-800 bg-teal-800 text-white':'border-slate-300 bg-white')}>{NAME[s]}</button>)}
  </nav>
  <div className="mb-5 flex flex-wrap gap-2" aria-label="Части модуля">
   {Array.from({length:B1_PARTS[subject]},(_,i)=>i+1).map(n=><button key={n} onClick={()=>changeTeil(n)} aria-pressed={teil===n}
    className={'min-h-11 rounded-xl px-4 '+(teil===n?'bg-teal-700 text-white':'bg-white')}>Teil {n}</button>)}
  </div>
  {loading?<p role="status">Загружаем задания B1…</p>:error?<div role="alert" className="rounded-xl border border-amber-400 bg-white p-5">
   <b>Материалы B1 пока не опубликованы в этом Preview.</b><p className="mt-2 text-sm">Нужен файл {subject}-{teil}.json в /b1/data/. Оригинальные задания A1 не подставляются.</p>
   <p className="mt-2 text-xs text-slate-500">{error}</p></div>:part&&<>
   <label className="mb-3 block font-semibold">Тренировочный комплект
    <select value={setNum} onChange={e=>setSetNum(Number(e.target.value))} className="ml-3 rounded-lg border bg-white p-3">
     {part.sets.map(s=><option key={s.number} value={s.number}>№ {s.number}</option>)}
    </select>
   </label>
   {setData?<section key={subject+'-'+teil+'-'+setNum} className="rounded-2xl bg-white p-4 shadow-sm md:p-7">
    <h2 className="mb-4 text-2xl font-bold">{NAME[subject]} · Teil {teil} · №{setNum}</h2>
    <p className="mb-5 text-sm text-slate-600">{done?'Попытка завершена. Доступны перевод и разбор.':'Режим тренировки: ответы и перевод будут открыты после завершения попытки.'}</p>
    <div className="space-y-3">{setData.audioIds.map(id=>setData.audioAvailable.includes(id)?
     <AudioClip key={id} id={id} subject={subject} teil={teil}/>:
     <p key={id} className="rounded-xl bg-amber-50 p-3 text-sm">Запись {id} отсутствует в исходных материалах.</p>)}</div>
    <div className="my-5 space-y-2">{visibleLines(setData.lines,done).map((line,i)=>
     <p key={i} className={/^(Aufgabe|Frage|Text \d|Folie)/i.test(line)?'break-words pt-2 font-semibold':'break-words leading-7'}>{line}</p>)}</div>
    {subject==='schreiben'?<div><label htmlFor="b1essay" className="block font-semibold">Ваш текст</label>
      <textarea id="b1essay" className="mt-2 min-h-56 w-full rounded-xl border p-3" value={essay} onChange={e=>setEssay(e.target.value)}/>
      <p className="text-sm">Слов: {essay.trim()?essay.trim().split(/\s+/).length:0}. Черновик сохраняется на этом устройстве.</p></div>:
     subject==='sprechen'?<div className="space-y-3">
       <button className="rounded-xl bg-teal-800 px-5 py-3 font-semibold text-white" onClick={recording?stopRecording:startRecording}>{recording?'Остановить запись':'Записать ответ'}</button>
       {recordUrl&&<><audio controls src={recordUrl}/><a className="block text-teal-700 underline" download="otto-b1-antwort.webm" href={recordUrl}>Сохранить запись на устройство</a></>}
       <p className="text-sm text-slate-600">Запись не загружается на сервер и не сохраняется после обновления страницы.</p>
      </div>:
      <fieldset className="space-y-3"><legend className="font-semibold">Ваши ответы</legend>
        {Object.entries(setData.answerKey||{}).map(([id,answer])=><label key={id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
          <span className="min-w-24 font-semibold">{questionLabel(setData.lines,id)}</span>
          <select aria-label={'Aufgabe '+id} value={answers[id]||''} disabled={done} className="min-h-11 rounded-lg border bg-white px-3" onChange={e=>setAnswers(prev=>({...prev,[id]:e.target.value}))}>
           <option value="">Выберите ответ</option>{choices(answer,setData.answerKey||{}).map(v=><option key={v} value={v}>{v}</option>)}
          </select>
          {done&&<span className="text-sm">Верный ответ: {answer}</span>}
         </label>)}
      </fieldset>}
    {done&&score&&score.total>0&&<p role="status" className="mt-5 rounded-lg bg-teal-50 p-4 font-semibold">Правильных ответов: {score.correct} / {score.total}. Это учебная проверка, не официальный результат Goethe.</p>}
    <div className="mt-5 flex flex-wrap gap-2">
     <button className="min-h-12 rounded-xl bg-teal-800 px-5 font-semibold text-white" onClick={()=>setDone(true)}>Завершить попытку и показать разбор</button>
     <button className="min-h-12 rounded-xl border px-5" onClick={()=>{setDone(false);setAnswers({});setEssay('');}}>Повторить</button>
     {setNum<part.sets.length&&<button className="min-h-12 rounded-xl border px-5" onClick={()=>setSetNum(n=>n+1)}>Следующий комплект →</button>}
    </div>
   </section>:<p role="alert">Комплект №{setNum} не найден.</p>}
  </>}
  </>}
  <footer className="mt-8 text-xs text-slate-500">OTTO B1 · Учебные материалы не являются официальным экзаменом Goethe-Institut. Система оплаты отключена.</footer>
  </main>
 </div>;
}
