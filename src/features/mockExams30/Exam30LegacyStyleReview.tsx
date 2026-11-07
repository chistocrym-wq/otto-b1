import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,CheckCircle2,Headphones,Mic,Trophy,Clock,Play,Pause} from 'lucide-react';
import type {ExamCandidate,ListeningTask,ReadingTask,Section} from './schema.js';
import {readDraft,saveDraft,withAnswer,withNavigation,countCompleted,type Exam01Draft,type ObjectiveAnswer} from './progress.js';
import {SingleAudioPlayer,type PrivateAssetProvider} from './media.js';
import {Exam30VoiceAnswer} from './Exam30VoiceAnswer.js';
import {Exam30ScoreResult} from './Exam30ScoreResult.js';
import {countSavedRecordings} from './recordings.js';
import {loadMeta,saveMeta,startPart,finishPart,allSectionsFinished,ORDER} from './examSequence.js';

interface Props{exam:ExamCandidate;userId:string;onBack:()=>void;privateAssetProvider:PrivateAssetProvider;showReviewImages?:boolean;timerEnabled?:boolean;displayNumber?:number;onNextExam?:()=>void;isCurrentExam?:boolean}
const DURATIONS:Record<Section,number>={horen:20*60,lesen:25*60,schreiben:20*60,sprechen:15*60};
const formatTime=(seconds:number)=>`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
const sections:Section[]=['horen','lesen','schreiben','sprechen'];
const labels:Record<Section,string>={horen:'Hören',lesen:'Lesen',schreiben:'Schreiben',sprechen:'Sprechen'};
const btn='min-h-11 rounded-xl border bg-white px-4 py-2 font-bold text-slate-900';
const choice=(active:boolean)=>'min-h-11 w-full rounded-xl border-2 px-3 py-2 text-left '+(active?'border-sky-500 bg-sky-50':'border-slate-200 bg-white');
function examNumber(id:string){return Number(id.slice(-2))}
function Header({onBack,exam}:{onBack:()=>void;exam:number}){return <div className="mb-5 flex items-center gap-3"><button type="button" onClick={onBack} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white" aria-label="Назад"><ArrowLeft className="h-5 w-5"/></button><div><h1 className="text-2xl font-black text-slate-950">Пробный экзамен №{exam}</h1><p className="text-sm text-slate-500">Goethe-Zertifikat A1 · экзаменационный режим</p></div></div>}
function AudioQuestion({task,answer,onAnswer,player,provider}:{task:ListeningTask;answer:ObjectiveAnswer|undefined;onAnswer:(value:ObjectiveAnswer)=>void;player:SingleAudioPlayer;provider:PrivateAssetProvider}){
 const [playing,setPlaying]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>()=>{player.stop();},[player,task.audioUrl]);
 const start=async()=>{try{setError('');setPlaying(true);await player.play(task.audioUrl,provider,()=>setPlaying(false));}catch{setPlaying(false);setError('Аудио недоступно. Повторите попытку позже.');}};
 const options:ObjectiveAnswer[]=task.type==='true-false'?[true,false]:(task.options||[]).map((_,i)=>i);
 return <div className="rounded-2xl border bg-white p-4" data-audio-task={task.questionId}>
  <p className="text-xs font-black uppercase tracking-wider text-sky-700">Teil {task.part} · Aufgabe {task.n}</p>
  <button type="button" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-50 px-3 text-sm font-bold text-sky-800" onClick={()=>{if(playing){player.stop();setPlaying(false);}else void start();}}>{playing?<Pause className="h-4 w-4"/>:<Play className="h-4 w-4"/>}{playing?'Стоп':'Слушать'}</button>
  {error&&<p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
  <p className="mt-3 font-semibold leading-6 text-slate-900">{task.prompt}</p>
  <div className="mt-3 grid gap-2">{options.map((value,i)=><button type="button" key={String(value)} className={choice(answer===value)} onClick={()=>onAnswer(value)}>
   {task.type==='true-false'?(value?'Richtig':'Falsch'):`${String.fromCharCode(65+i)}. ${task.options?.[i]??''}`}
  </button>)}</div>
 </div>;
}
function ReadingQuestion({task,answer,onAnswer}:{task:ReadingTask;answer:ObjectiveAnswer|undefined;onAnswer:(value:ObjectiveAnswer)=>void}){
 const options:ObjectiveAnswer[]=task.type==='true-false'?[true,false]:(task.options||[]).map((_,i)=>i);
 return <div className="rounded-2xl border bg-white p-4">
  <p className="text-xs font-black uppercase tracking-wider text-teal-700">Lesen · Teil {task.part} · Aufgabe {task.n}</p>
  <div className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{task.context}</div>
  <p className="mt-4 font-semibold leading-6 text-slate-900">{task.prompt}</p>
  <div className="mt-3 grid gap-2">{options.map((value,i)=><button type="button" key={String(value)} className={choice(answer===value)} onClick={()=>onAnswer(value)}>{task.type==='true-false'?(value?'Richtig':'Falsch'):`${String.fromCharCode(65+i)}. ${task.options?.[i]}`}</button>)}</div>
 </div>;
}
function ProtectedPicture({path,provider}:{path:string;provider:PrivateAssetProvider}){
 const [src,setSrc]=useState(''),[error,setError]=useState('');
 useEffect(()=>{
  let mounted=true,blobUrl='';
  setSrc('');setError('');
  void provider(path).then(blob=>{
   if(!mounted)return;
   blobUrl=URL.createObjectURL(blob);setSrc(blobUrl);
  }).catch(()=>{if(mounted)setError('Не удалось загрузить изображение из закрытого хранилища.');});
  return()=>{mounted=false;if(blobUrl)URL.revokeObjectURL(blobUrl);};
 },[path,provider]);
 if(error)return <p role="alert" className="mt-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>;
 if(!src)return <p role="status" className="mt-3 text-sm text-slate-500">Загружаю изображение…</p>;
 return <img src={src} alt="Картинка к заданию Sprechen Teil 3" className="mx-auto mt-3 max-h-[380px] w-full max-w-md rounded-xl object-contain" onError={()=>setError('Изображение повреждено или недоступно')}/>;
}
export function Exam30LegacyStyleReview({exam,userId,onBack,privateAssetProvider,showReviewImages=true,timerEnabled=true,displayNumber,onNextExam,isCurrentExam=true}:Props){
 const number=displayNumber??examNumber(exam.id);
 const [draft,setDraft]=useState<Exam01Draft>(()=>readDraft(localStorage,userId,exam.id));
 const [stage,setStage]=useState<'menu'|'part'|'summary'>('menu');
 const [notice,setNotice]=useState('');
 const [meta,setMeta]=useState(()=>loadMeta(localStorage,userId,exam.id));
 const [voiceCount,setVoiceCount]=useState<number|null>(null);
 const [remaining,setRemaining]=useState(0);
 const completed=meta.completed;
 const [timerNotice,setTimerNotice]=useState('');
 const deadlineRef=useRef<number|null>(null);
 const completedAll=allSectionsFinished(meta);
 const setMetaSaved=(value:typeof meta)=>{setMeta(value);if(!saveMeta(localStorage,userId,value))setNotice('Не удалось сохранить завершение части.');};
 const player=useRef(new SingleAudioPlayer());
 const refreshVoiceCount=()=>{
  void countSavedRecordings(userId,exam.id)
   .then(count=>setVoiceCount(Math.max(0,Math.min(5,count))))
   .catch(()=>setVoiceCount(null));
 };
 useEffect(()=>{
  let active=true;
  void countSavedRecordings(userId,exam.id)
   .then(count=>{if(active)setVoiceCount(Math.max(0,Math.min(5,count)));})
   .catch(()=>{if(active)setVoiceCount(null);});
  return()=>{active=false;};
 },[userId,exam.id]);
 useEffect(()=>()=>player.current.dispose(),[]);
 useEffect(()=>{
  if(stage!=='part'||!timerEnabled||deadlineRef.current===null)return;
  const tick=()=>setRemaining(Math.max(0,Math.ceil((deadlineRef.current!-Date.now())/1000)));
  tick();
  const id=window.setInterval(tick,250);
  return()=>window.clearInterval(id);
 },[stage,timerEnabled,draft.section]);
 useEffect(()=>{
  if(stage!=='part'||!timerEnabled||remaining>0||deadlineRef.current===null)return;
  deadlineRef.current=null;
  player.current.stop();
  const finished=finishPart(meta,draft.section);
  setMetaSaved(finished);
  setTimerNotice('Время раздела '+labels[draft.section]+' закончилось. Ответы сохранены.');
  setStage(allSectionsFinished(finished)?'summary':'menu');
  window.scrollTo({top:0,behavior:'auto'});
 },[stage,timerEnabled,remaining,draft.section,meta]);
 const persist=(next:Exam01Draft)=>{setDraft(next);try{saveDraft(localStorage,userId,next);setNotice('');}catch{setNotice('Автоматическое сохранение недоступно. Проверьте разрешения браузера.');}};
 const enter=(section:Section)=>{
  if(!completed[section]&&ORDER.some((item,i)=>item===section&&ORDER.slice(0,i).some(prior=>!completed[prior])))return;
  player.current.stop();
  const started=completed[section]?meta:startPart(meta,section,timerEnabled);
  setMetaSaved(started);
  deadlineRef.current=timerEnabled?started.deadlines[section]??null:null;
  setRemaining(timerEnabled?Math.max(0,Math.ceil(((deadlineRef.current??Date.now())-Date.now())/1000)):0);
  setTimerNotice('');
  persist(withNavigation(draft,section,draft.indices[section]));
  setStage('part');window.scrollTo({top:0,behavior:'auto'});
 };
 const leave=()=>{player.current.stop();deadlineRef.current=null;refreshVoiceCount();setStage('menu');window.scrollTo({top:0,behavior:'auto'});};
 const finish=()=>{player.current.stop();deadlineRef.current=null;const updated=finishPart(meta,draft.section);setMetaSaved(updated);refreshVoiceCount();setStage(allSectionsFinished(updated)?'summary':'menu');window.scrollTo({top:0,behavior:'auto'});};
 const saveObjective=(section:'horen'|'lesen',id:string,value:ObjectiveAnswer)=>persist(withAnswer(draft,section,id,value));
 const summary=countCompleted(draft);
 const section=draft.section;
 return <div className="animate-fade-in pb-8" data-otto30-exam={exam.id}>
  {stage==='menu'&&<>
   <Header onBack={onBack} exam={number}/>
   <section className="rounded-3xl bg-slate-950 p-6 text-white"><Trophy className="h-10 w-10 text-amber-300"/><h2 className="mt-3 text-2xl font-black">Пробный экзамен Goethe A1 · №{number}</h2>
    <p className="mt-2 text-sm leading-6 text-white/75">Hören — 15 заданий, Lesen — 15, Schreiben — 2 части, Sprechen — 3 части. Все ответы сохраняются отдельно для этого варианта.</p>
<p className="mt-2 text-xs leading-5 text-white/75">{timerEnabled?'Таймер включён: Hören 20, Lesen 25, Schreiben 20, Sprechen 15 минут.':'Режим без таймера: время не ограничено.'}</p></section>{timerNotice&&<p role="status" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{timerNotice}</p>}
   <div className="mt-5 grid gap-3 sm:grid-cols-2">{sections.map(s=>{
    const count=s==='horen'?summary.horen:s==='lesen'?summary.lesen:s==='schreiben'?(summary.form+(summary.letter?1:0)):(voiceCount??0);
    const max=s==='horen'||s==='lesen'?15:s==='schreiben'?exam.schreiben.part1.rows.length+1:5;
    return <button type="button" key={s} onClick={()=>enter(s)} disabled={!completed[s]&&ORDER.slice(0,ORDER.indexOf(s)).some(prior=>!completed[prior])} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-teal-300 disabled:cursor-not-allowed disabled:border-rose-200 disabled:bg-rose-50">
     <div className="flex items-center justify-between"><b className="text-lg text-slate-950">{labels[s]}</b>{completed[s]&&<CheckCircle2 className="h-5 w-5 text-emerald-600"/>}</div>
     <p className="mt-1 text-sm text-slate-500">{s==='horen'?'15 заданий с аудио':s==='lesen'?'15 заданий':s==='schreiben'?'Формуляр и письмо':(voiceCount===null?'Записи проверяются или недоступны':'Записано '+voiceCount+' из 5 ответов')}</p><p className="mt-1 text-xs text-slate-500">{timerEnabled?`≈ ${Math.round(DURATIONS[s]/60)} минут`:'Без ограничения времени'}</p>
     <span className="mt-4 inline-block font-bold text-teal-700">{completed[s]?'Просмотреть':ORDER.slice(0,ORDER.indexOf(s)).some(prior=>!completed[prior])?'Пока недоступно':count?'Продолжить →':'Начать →'}</span>
    </button>;
   })}</div>
   <button type="button" className="mt-5 min-h-12 w-full rounded-xl bg-teal-700 px-5 font-black text-white" onClick={()=>setStage('summary')}>Мои ответы и результат</button>

  </>}
  {stage==='part'&&<>
   <div className="sticky top-14 z-30 -mx-4 mb-5 sm:top-0 flex items-center justify-between gap-3 border-b border-slate-200 bg-[#A7E0F9]/95 px-4 py-3 backdrop-blur">
    <button type="button" onClick={leave} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-white" aria-label="Назад"><ArrowLeft className="h-5 w-5"/></button>
    <b className="text-lg">{labels[section]} · №{number}</b><span className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white"><Clock className="h-4 w-4"/>{timerEnabled?formatTime(remaining):'Без таймера'}</span>
   </div>
   {section==='horen'&&<>
    <div className="mb-4 rounded-xl bg-sky-50 p-4 text-sm leading-6 text-sky-900">Teil 1: Aufgaben 1–6 · Teil 2: 7–10 · Teil 3: 11–15. Каждая исходная MP3-запись запускается только вручную и без автоповтора.</div>
    <div className="space-y-4">{exam.hoeren.map(task=><AudioQuestion key={task.questionId} task={task} answer={draft.objective.horen[task.questionId]} onAnswer={v=>saveObjective('horen',task.questionId,v)} player={player.current} provider={privateAssetProvider}/>)}</div>
   </>}
   {section==='lesen'&&<div className="space-y-4">{exam.lesen.map(task=><ReadingQuestion key={task.questionId} task={task} answer={draft.objective.lesen[task.questionId]} onAnswer={v=>saveObjective('lesen',task.questionId,v)}/>)}</div>}
   {section==='schreiben'&&<div className="space-y-5">
    <section className="rounded-2xl border bg-white p-5"><p className="text-xs font-black uppercase text-amber-700">Teil 1 · Formular</p><p className="mt-2 text-sm leading-6 text-slate-700">{exam.schreiben.part1.scenario}</p>
    <div className="mt-4 divide-y">{exam.schreiben.part1.rows.map((row,i)=><label key={i} className="grid grid-cols-[minmax(95px,.8fr)_minmax(0,1.2fr)] items-center gap-3 py-3"><span className="text-sm font-semibold">{row.label}</span>{row.value?<span className="text-sm text-slate-600">{row.value}</span>:<input aria-label={row.label} className="min-h-11 min-w-0 rounded-xl border px-3" value={draft.form[String(i)]||''} onChange={e=>persist({...draft,form:{...draft.form,[i]:e.target.value}})}/>}</label>)}</div></section>
    <section className="rounded-2xl border bg-white p-5"><p className="text-xs font-black uppercase text-amber-700">Teil 2 · Brief</p>
     <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{exam.schreiben.part2.situation}</p>
     <ul className="mt-3 space-y-1 text-sm font-semibold">{exam.schreiben.part2.points.map((p,i)=><li key={i}>• {p}</li>)}</ul>
     <textarea value={draft.letter} onChange={e=>persist({...draft,letter:e.target.value})} className="mt-4 min-h-[230px] w-full rounded-xl border p-4 leading-7" placeholder="Schreiben Sie hier …"/>
     <p className="mt-2 text-xs text-slate-400">Подсказки с ответами не показываются.</p></section>
    </div>}
   {section==='sprechen'&&<div className="space-y-4">
    <section className="rounded-2xl border bg-white p-5"><b>Teil 1 · Sich vorstellen</b><p className="mt-2 text-sm text-slate-600">{exam.sprechen.teil1==='self-introduction'?'Расскажите о себе на немецком языке.':exam.sprechen.teil1}</p>
     <Exam30VoiceAnswer userId={userId} examId={exam.id} taskId="teil1-intro" onSaved={refreshVoiceCount}/></section>
    <section className="rounded-2xl border bg-white p-5"><b>Teil 2 · Informationen geben und erfragen</b>
     {exam.sprechen.teil2.map((card,i)=><div key={i} className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-teal-700">Thema: {card.theme}</p><h3 className="mt-1 text-xl font-black">{card.keyword}</h3><p className="mt-2 text-sm text-slate-500">Задайте один понятный вопрос по теме и слову.</p>
      <Exam30VoiceAnswer userId={userId} examId={exam.id} taskId={`teil2-${i+1}`} onSaved={refreshVoiceCount}/></div>)}</section>
    <section className="rounded-2xl border bg-white p-5"><b>Teil 3 · Bitten formulieren und reagieren</b>
     {exam.sprechen.teil3.map((card,i)=><div key={i} className="mt-4 rounded-xl border bg-[#fffefa] p-4"><p className="text-xs font-black uppercase text-amber-700">Karte {i+1}</p>
      {showReviewImages?<ProtectedPicture path={card.imageUrl} provider={privateAssetProvider}/>:<p role="status" className="mt-3 text-sm text-amber-900">Просмотр изображений ожидает разрешения владельца.</p>}
      <p className="mt-3 text-sm text-slate-600">Сформулируйте вежливую просьбу по картинке на немецком языке.</p>
      <Exam30VoiceAnswer userId={userId} examId={exam.id} taskId={`teil3-${i+1}`} onSaved={refreshVoiceCount}/></div>)}</section>
   </div>}
   <button type="button" onClick={finish} className="mt-6 min-h-12 w-full rounded-xl bg-slate-900 px-5 font-bold text-white">Завершить часть</button>
  </>}
  {stage==='summary'&&<>
   <Header onBack={()=>setStage('menu')} exam={number}/>
   {completedAll?<Exam30ScoreResult exam={exam} userId={userId} draft={draft} onNextExam={isCurrentExam?onNextExam:undefined}/>:<>
    <section className="rounded-3xl bg-slate-950 p-6 text-white"><Trophy className="h-11 w-11 text-amber-300"/><h2 className="mt-3 text-2xl font-black">Мои ответы</h2><p className="mt-2 text-sm text-white/75">Оценивание станет доступным после завершения всех разделов.</p></section>
    <section className="mt-4 grid gap-3 sm:grid-cols-2">{sections.map(section=><div key={section} className="rounded-2xl border bg-white p-4"><b>{labels[section]}</b><p className="mt-2 text-sm">{completed[section]?'Завершено':'Не завершено'}</p></div>)}</section>
   </>}
   <button type="button" className="mt-5 min-h-12 w-full rounded-xl bg-slate-900 px-5 font-bold text-white" onClick={()=>setStage('menu')}>Вернуться к разделам</button>
  </>}
  {notice&&<p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}
 </div>;
}
