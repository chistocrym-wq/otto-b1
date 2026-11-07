import { B1Reference } from './B1Reference';
import { OttoScene } from '../components/OttoScene';
import { ArrowLeft, ArrowRight, BarChart3, BookOpen, BookOpenCheck, CheckCircle2, GraduationCap, Headphones, Home, Languages, MessageCircleMore, PenLine, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { B1_PARTS, b1DraftKey, loadB1Teil, scoreB1Answers, type B1Subject, type B1Teil } from './content';

const SUBJECTS: B1Subject[] = ['horen', 'lesen', 'schreiben', 'sprechen'];
const NAME: Record<B1Subject,string> = {horen:'Hören',lesen:'Lesen',schreiben:'Schreiben',sprechen:'Sprechen'};
const MAX_PLAYS: Record<number,number> = {1:2,2:1,3:1,4:2};
function isRestricted(line:string) {
 return /^(?:RU\s*[·:]|Перевод|Полный перевод|Lösung|Lösungen|LÖSUNG|Erklärung|Begründung|Объяснение|Musterlösung|Mustertext|Musterantwort|Ключ|Ключи|Правильн|Ответы|Auswertung|Bewertung|[1-9]\.\s*Полный перевод)/i.test(line)
   || /[А-Яа-яЁё]/.test(line);
}
function hideInlineAnswer(line:string):string {
 return line
  .replace(/\s*\((?:Richtig|Falsch|Ja|Nein|[a-j])\)\s*$/i, '')
  .replace(/\s*\(Lösung:[^)]*\)/gi, ' (Beispiel)');
}
function visibleLines(lines:string[], reviewed:boolean) {
 if(reviewed)return lines;
 let transcript=false;
 const visible:string[]=[];
 for(const line of lines) {
   if(/^AUDIO DE\s*[·:]/i.test(line)){transcript=true;visible.push(line);continue;}
   if(/^(?:RU\s*[·:]|СИТУАЦИЯ \(RU\)|[1-9]\.\s*Полный перевод|Aufgabe\s+\d+|Задание\s+\d+|Folie\s+\d+|\d+\.\s*(?:Текст|Задание)|SITUATION \(DE\))/i.test(line))transcript=false;
   if(transcript||isRestricted(line))continue;
   visible.push(hideInlineAnswer(line));
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
      onEnded={()=>setPlays(p=>p+1)}/> }
  {audioError&&<p role="alert" className="mt-2 text-sm text-rose-700">{audioError}</p>}
  <p className="mt-1 text-xs text-slate-600">{Number.isFinite(max)?'Прослушиваний: '+plays+' / '+max:'Тренировочное аудио'}</p>
 </div>;
}

type B1View = 'home' | 'training' | 'reference' | 'progress';
const MODULES = [
  { id:'horen' as B1Subject, Icon:Headphones, desc:'Аудирование · 4 части', detail:'Слушайте диалоги и сообщения' },
  { id:'lesen' as B1Subject, Icon:BookOpen, desc:'Чтение · 5 частей', detail:'Читайте и выбирайте ответы' },
  { id:'schreiben' as B1Subject, Icon:PenLine, desc:'Письмо · 3 задания', detail:'Пишите письма и выражайте мнение' },
  { id:'sprechen' as B1Subject, Icon:MessageCircleMore, desc:'Говорение · 3 части', detail:'Записывайте и слушайте свою речь' },
] as const;

function getCompletedStats() {
  const perSubject:Record<B1Subject,number>={horen:0,lesen:0,schreiben:0,sprechen:0};
  for (const subject of SUBJECTS) {
    for (let part=1;part<=B1_PARTS[subject];part++) {
      for (let set=1;set<=30;set++) {
        try {
          const raw=localStorage.getItem(b1DraftKey('local-preview',subject,part,set));
          if (raw && JSON.parse(raw).done===true) perSubject[subject]++;
        } catch {/* local storage may be unavailable */}
      }
    }
  }
  return {perSubject,total:Object.values(perSubject).reduce((sum,count)=>sum+count,0)};
}
type B1LineKind = 'heading'|'plain'|'option'|'translation'|'review'|'audio'|'transcript';
function preparedLines(lines:string[],reviewed:boolean,translated:boolean,transcripts:boolean):Array<{text:string;kind:B1LineKind}> {
  let inTranscript=false;
  const result:Array<{text:string;kind:B1LineKind}>=[];
  for(const raw of lines){
    const text=raw.trim();
    if(!text)continue;
    if(/^(?:Задание\s+\d+|Aufgabe\s*\d+|Text\s*\d+|Folie\s*\d+|Frage\s*\d+|SITUATION\s*\(DE\)|Teil\s*\d+)/i.test(text))inTranscript=false;
    if(/^(?:Lösung(?:en)?|LÖSUNG(?:EN)?|Ключ(?:и)?|Ответы|Правильн|Begründung|Erklärung|Объяснение|Musterlösung|Mustertext|Musterantwort|Auswertung|Bewertung)/i.test(text)){
      if(reviewed)result.push({text,kind:'review'});
      continue;
    }
    if(/^AUDIO DE\s*[·:]/i.test(text)){
      inTranscript=true;result.push({text,kind:'audio'});continue;
    }
    const russian=/[А-Яа-яЁё]/.test(text);
    if(inTranscript){
      if(reviewed&&transcripts&&(!russian||translated))result.push({text,kind:russian?'translation':'transcript'});
      continue;
    }
    if(russian){
      if(translated)result.push({text,kind:'translation'});
      continue;
    }
    if(/^(?:Aufgabe\s*\d+|Text\s*\d+|Folie\s*\d+|Frage\s*\d+|Teil\s*\d+|SITUATION\s*\(DE\))/i.test(text))
      result.push({text:hideInlineAnswer(text),kind:'heading'});
    else if(/^(?:[a-j][).]\s+|Richtig\s*\/\s*Falsch|Ja\s*\/\s*Nein)/i.test(text))
      result.push({text:hideInlineAnswer(text),kind:'option'});
    else result.push({text:hideInlineAnswer(text),kind:'plain'});
  }
  return result;
}
function ExamText({lines,done,showTranslation,showTranscript}:{lines:string[];done:boolean;showTranslation:boolean;showTranscript:boolean}){
  const prepared=useMemo(()=>preparedLines(lines,done,showTranslation,showTranscript),[lines,done,showTranslation,showTranscript]);
  return <div className="b1-reading-body" lang="de">
    {prepared.map(({text,kind},i)=><div key={i} className={'b1-line b1-line-'+kind} lang={kind==='translation'?'ru':kind==='review'?'auto':'de'}>{text}</div>)}
  </div>;
}

export default function B1App(){
 const [view,setView]=useState<B1View>('home');
 const [subject,setSubject]=useState<B1Subject>('horen');
 const [teil,setTeil]=useState(1);
 const [setNum,setSetNum]=useState(1);
 const [part,setPart]=useState<B1Teil|null>(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [answers,setAnswers]=useState<Record<string,string>>({});
 const [essay,setEssay]=useState('');
 const [done,setDone]=useState(false);
 const [showTranslation,setShowTranslation]=useState(false);
 const [showTranscript,setShowTranscript]=useState(false);
 const [revision,setRevision]=useState(0);
 const [recording,setRecording]=useState(false);
 const [recordUrl,setRecordUrl]=useState('');
 const recorder=useRef<MediaRecorder|null>(null);
 const chunks=useRef<Blob[]>([]);
 const setData=useMemo(()=>part?.sets.find(s=>s.number===setNum),[part,setNum]);
 const key=b1DraftKey('local-preview',subject,teil,setNum);
 const stats=useMemo(()=>getCompletedStats(),[revision,view]);
 useEffect(()=>{
  const ctrl=new AbortController();
  setPart(null);setError('');setLoading(true);
  loadB1Teil(subject,teil,ctrl.signal).then(data=>setPart(data))
   .catch(err=>{if(!ctrl.signal.aborted)setError(String(err));})
   .finally(()=>{if(!ctrl.signal.aborted)setLoading(false);});
  return ()=>ctrl.abort();
 },[subject,teil]);
 useEffect(()=>{
  const draft=getDraft(key);setAnswers(draft.answers);setEssay(draft.essay);setDone(draft.done);
  setShowTranslation(draft.done);setShowTranscript(false);
 },[key]);
 const changeSubject=(next:B1Subject)=>{setSubject(next);setTeil(1);setSetNum(1);setView('training');};
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
 const saveDraftNow=(nextAnswers:Record<string,string>,nextEssay:string,nextDone:boolean)=>{
  try{localStorage.setItem(key,JSON.stringify({answers:nextAnswers,essay:nextEssay,done:nextDone,updatedAt:new Date().toISOString()}));}catch{/* Browser storage can be disabled. */}
 };
 const completeAttempt=()=>{saveDraftNow(answers,essay,true);setDone(true);setShowTranslation(true);setShowTranscript(true);setRevision(n=>n+1);};
 const resetAttempt=()=>{saveDraftNow({},'',false);setDone(false);setAnswers({});setEssay('');setShowTranscript(false);setRevision(n=>n+1);};
 const score=setData?scoreB1Answers(setData.answerKey||{},answers):null;
 const goTraining=()=>setView('training');
 return <div className="telegram-app otto-skin otto-view-home b1-a1-app">
  <header className="b1-topbar">
   <div className="b1-topbar-inner">
    <button type="button" onClick={()=>setView('home')} className="b1-wordmark" aria-label="Главная OTTO B1"><span className="b1-logo-mark">O</span><span>OTTO <em>B1</em></span></button>
    <span className="b1-topbar-caption">Тренажёр Goethe-Zertifikat B1</span>
    <button className="b1-header-reference" type="button" onClick={()=>setView('reference')}><GraduationCap size={17}/> <span>Справочник B1</span></button>
   </div>
  </header>
  <main className="b1-main">
   {view==='home'&&<div className="b1-home">
    <section className="otto-dashboard-hero b1-hero">
     <div className="b1-hero-copy">
      <p className="b1-kicker b1-hero-kicker">OTTO B1 · ПОДГОТОВКА К ЭКЗАМЕНУ</p>
      <h1 className="b1-hero-title">Сегодня — ещё шаг к B1</h1>
      <p className="b1-hero-subtitle">Выбери нужный модуль и тренируйся с Отто. Все задания с переводами и разбором.</p>
      <button className="b1-hero-action" type="button" onClick={goTraining}>Начать тренировку <ArrowRight size={17}/></button>
     </div>
     <OttoScene scene="home" className="b1-hero-otto" eager/>
    </section>
    <section className="b1-panel b1-progress-overview">
     <div className="b1-progress-icon"><BarChart3 size={24}/></div>
     <div className="b1-progress-copy"><div className="b1-progress-line"><strong>Мой прогресс B1</strong><span>{stats.total} / 450</span></div>
      <div className="b1-progress-track"><span style={{width:(stats.total/450*100)+'%'}}/></div>
      <p>Завершённые части тренировочных комплектов на этом устройстве</p>
     </div>
     <button type="button" onClick={()=>setView('progress')} aria-label="Открыть прогресс" className="b1-quiet-chevron"><ArrowRight size={19}/></button>
    </section>
    <section className="b1-panel b1-module-panel">
     <div className="b1-panel-heading"><div><span className="b1-kicker">ПОДГОТОВКА ПО МОДУЛЯМ</span><h2>Выбери направление</h2></div><span>15 частей · 30 комплектов</span></div>
     <div className="b1-module-grid">{MODULES.map(({id,Icon,desc,detail})=><button key={id} type="button" aria-label={NAME[id]} onClick={()=>changeSubject(id)} className="otto-dashboard-module-card b1-module-card">
       <span className="b1-module-head"><span className="b1-module-icon"><Icon size={23}/></span><span className="b1-module-counter">{stats.perSubject[id]} / {B1_PARTS[id]*30}</span></span>
       <strong>{NAME[id]}</strong><span>{desc}</span><small>{detail}</small>
      </button>)}</div>
    </section>
    <section className="b1-info-panel"><BookOpenCheck size={22}/><div><strong>Переводы и объяснения</strong><p>Нажимай «Показать перевод» во время тренировки. После проверки откроются ответы, разбор и транскрипты.</p></div></section>
   </div>}
   {view==='reference'&&<div className="b1-page"><B1Reference onClose={goTraining}/></div>}
   {view==='progress'&&<div className="b1-page">
    <button type="button" className="b1-back" onClick={()=>setView('home')}><ArrowLeft size={17}/> На главную</button>
    <div className="b1-page-heading"><span className="b1-kicker">МОИ РЕЗУЛЬТАТЫ</span><h2>Прогресс подготовки к B1</h2><p>Прогресс пока хранится только в этом браузере. Аккаунты B1 ещё не подключены.</p></div>
    <div className="b1-progress-grid">{MODULES.map(({id,Icon})=><button key={id} type="button" onClick={()=>changeSubject(id)} className="b1-panel b1-progress-module"><div><Icon size={22}/><strong>{NAME[id]}</strong></div><span>{stats.perSubject[id]} / {B1_PARTS[id]*30} комплектов</span><div className="b1-progress-track"><span style={{width:(stats.perSubject[id]/(B1_PARTS[id]*30)*100)+'%'}}/></div></button>)}</div>
   </div>}
   {view==='training'&&<div className="b1-page b1-training">
    <div className="b1-training-intro">
      <button className="b1-back" type="button" onClick={()=>setView('home')}><ArrowLeft size={17}/> На главную</button>
      <div className="b1-page-heading"><span className="b1-kicker">ТРЕНИРОВОЧНЫЙ ЭКЗАМЕН · ГОТЕ B1</span><h1>Разделы экзамена</h1><p>Выполняй задания на немецком. Русский перевод можно включать отдельно; ответы открываются после проверки.</p></div>
    </div>
    <nav className="b1-subject-tabs" aria-label="Разделы экзамена">{MODULES.map(({id,Icon})=><button key={id} type="button" onClick={()=>changeSubject(id)} aria-label={NAME[id]} aria-pressed={subject===id} className={'b1-subject-tab '+(subject===id?'is-active':'')}><Icon size={18}/>{NAME[id]}</button>)}</nav>
    <div className="b1-selection b1-panel">
      <div className="b1-selection-title"><strong>{NAME[subject]}</strong><span>Выбери часть и комплект</span></div>
      <div className="b1-teil-tabs" aria-label="Части модуля">{Array.from({length:B1_PARTS[subject]},(_,i)=>i+1).map(n=><button key={n} type="button" aria-pressed={teil===n} onClick={()=>changeTeil(n)} className={'b1-teil-tab '+(teil===n?'is-active':'')}>Teil {n}</button>)}</div>
      {part&&<label className="b1-set-select">Тренировочный комплект<select value={setNum} onChange={e=>setSetNum(Number(e.target.value))}>{part.sets.map(s=><option key={s.number} value={s.number}>№ {s.number}</option>)}</select></label>}
    </div>
    {loading?<p role="status" className="b1-panel b1-notice">Загружаем задания B1…</p>:error?<div role="alert" className="b1-panel b1-notice"><strong>Не удалось загрузить материалы B1.</strong><p>Проверь файл /b1/data/{subject}-{teil}.json.</p><small>{error}</small></div>:part&&setData?<section key={subject+'-'+teil+'-'+setNum} className="b1-panel b1-exercise">
      <div className="b1-exercise-top"><div><span className="b1-kicker">ПРАКТИКА B1 · КОМПЛЕКТ {setNum} ИЗ 30</span><h2>{NAME[subject]} · Teil {teil} · №{setNum}</h2></div><span className={'b1-state '+(done?'is-done':'')}>{done?'Проверено':'В процессе'}</span></div>
      <div className="b1-translation-bar">
       <div><Languages size={21}/><div><strong>Переводы и разбор</strong><small>{done?'Правильные ответы и объяснения доступны ниже.':'Русский перевод поможет разобраться в задании, не показывая ответов.'}</small></div></div>
       <button type="button" onClick={()=>setShowTranslation(v=>!v)} aria-pressed={showTranslation} className="b1-translate-button">{showTranslation?'Скрыть перевод':'Показать перевод'}</button>
      </div>
      <div className="b1-audio-list">{setData.audioIds.filter(id=>!(subject==='sprechen'&&/-[QR]\d{2}$/.test(id))).map(id=>setData.audioAvailable.includes(id)?<AudioClip key={id} id={id} subject={subject} teil={teil}/>:<p key={id} className="b1-warning">Запись {id} отсутствует в исходных материалах.</p>)}</div>
      {done&&subject==='horen'&&<button type="button" className="b1-transcript-button" onClick={()=>setShowTranscript(v=>!v)}>{showTranscript?'Скрыть транскрипт аудио':'Показать транскрипт аудио'}</button>}
      <ExamText lines={setData.lines} done={done} showTranslation={showTranslation} showTranscript={showTranscript}/>
      {subject==='schreiben'?<div className="b1-answer-section"><label htmlFor="b1essay" className="b1-input-title">Ваш текст</label><textarea id="b1essay" className="b1-essay" value={essay} placeholder="Schreiben Sie hier Ihren Text auf Deutsch…" onChange={e=>{const value=e.target.value;setEssay(value);saveDraftNow(answers,value,done);}}/><p className="b1-caption">Слов: {essay.trim()?essay.trim().split(/\s+/).length:0}. Черновик сохраняется на этом устройстве.</p></div>:
       subject==='sprechen'?<div className="b1-answer-section"><h3 className="b1-input-title">Ваш устный ответ</h3><button className="b1-primary" onClick={recording?stopRecording:startRecording}>{recording?'Остановить запись':'Записать ответ'}</button>{recordUrl&&<><audio className="b1-record-player" controls src={recordUrl}/><a className="b1-download" download="otto-b1-antwort.webm" href={recordUrl}>Сохранить запись на устройство</a></>}<p className="b1-caption">Запись сохраняется только на устройстве; серверная проверка речи пока не подключена.</p></div>:
       <fieldset className="b1-answer-section"><legend className="b1-input-title">Ваши ответы</legend><div className="b1-answers">{Object.entries(setData.answerKey||{}).map(([id,answer])=><label key={id} className="b1-answer-row"><span>{questionLabel(setData.lines,id)}</span><select aria-label={'Aufgabe '+id} value={answers[id]||''} disabled={done} onChange={e=>setAnswers(prev=>{const next={...prev,[id]:e.target.value};saveDraftNow(next,essay,done);return next;})}><option value="">Выберите ответ</option>{choices(answer,setData.answerKey||{}).map(v=><option key={v} value={v}>{v}</option>)}</select>{done&&<span className="b1-correct-value">Верный ответ: {answer}</span>}</label>)}</div></fieldset>}
      {done&&score&&score.total>0&&<div role="status" className="b1-score"><CheckCircle2 size={22}/><div><strong>Правильных ответов: {score.correct} / {score.total}</strong><p>Учебная проверка, не официальный результат Goethe-Institut.</p></div></div>}
      <div className="b1-action-row"><button type="button" className="b1-primary" onClick={completeAttempt}>{done?'Открыть разбор ещё раз':'Завершить попытку и показать разбор'}</button><button type="button" className="b1-secondary" onClick={resetAttempt}><RotateCcw size={17}/> Повторить</button>{setNum<part.sets.length&&<button type="button" className="b1-secondary" onClick={()=>setSetNum(n=>n+1)}>Следующий комплект <ArrowRight size={17}/></button>}</div>
    </section>:<p role="alert" className="b1-notice">Комплект №{setNum} не найден.</p>}
   </div>}
   <footer className="b1-footer">OTTO B1 · Учебный тренажёр. Неофициальные материалы Goethe. Оплата и серверная авторизация в Preview отключены.</footer>
  </main>
  <nav className="b1-bottom-nav" aria-label="Основная навигация">{[
    {id:'home' as B1View,label:'Главная',Icon:Home},
    {id:'training' as B1View,label:'Задания',Icon:BookOpen},
    {id:'reference' as B1View,label:'Справочник',Icon:GraduationCap},
    {id:'progress' as B1View,label:'Прогресс',Icon:BarChart3},
   ].map(({id,label,Icon})=><button key={id} type="button" aria-current={view===id?'page':undefined} className={'b1-bottom-item '+(view===id?'is-active':'')} onClick={()=>setView(id)}><Icon size={21}/><span>{label}</span></button>)}</nav>
 </div>;
}
