import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, CircleX, Eye, Headphones, Loader2, RotateCcw, MessageCircle, Megaphone, PhoneCall } from 'lucide-react';
import { listeningTasks, type HorenTask } from '@/data/listening';
import { listeningTeilTasks, type ListeningTeil } from '@/data/listeningParts';
import { creditHorenTask, readHorenProgress, saveHorenProgress, setHorenTeilPosition, type HorenProgress } from '@/lib/hoerenProgress';
import { CompactTranslationEye } from '@/components/common/CompactTranslationEye';
import { GuidedTaskPrep } from '@/components/GuidedTaskPrep';
import { HoverTranslateText } from '@/components/common/HoverTranslateText';
import { cn } from '@/lib/utils';
import { TaskList } from '@/components/common/TaskList';
import { recordTaskResult } from '@/lib/taskResults';

interface Props {guest?:boolean;userId?:string;onBack:()=>void;onComplete:(score:number,total:number,taskId?:string)=>void;initialTeil?:ListeningTeil|null;onTrainingRouteChange?:(detail:`horen-teil${ListeningTeil}`|null)=>void}
type Answer=number|boolean|null;

export function ListeningModule({guest=false,userId,onBack,onComplete,initialTeil=null,onTrainingRouteChange}:Props){
  const[progress,setProgress]=useState<HorenProgress>(readHorenProgress);
  const[activeTeil,setActiveTeil]=useState<ListeningTeil|null>(initialTeil);
  const[showList,setShowList]=useState(Boolean(initialTeil));
  const[manual,setManual]=useState(false);
  const[index,setIndex]=useState(()=>initialTeil?readHorenProgress().teilPositions[initialTeil]:0);
  const[selected,setSelected]=useState<Answer>(null);
  const[checked,setChecked]=useState(false);
  const[finishedTeil,setFinishedTeil]=useState<ListeningTeil|null>(null);
  const[transcriptOpen,setTranscriptOpen]=useState(false);
  const[transcriptRu,setTranscriptRu]=useState('');
  const[transcriptLoading,setTranscriptLoading]=useState(false);
  const[why,setWhy]=useState<{de:string;ru:string}|null>(null);
  const audioRef=useRef<HTMLAudioElement|null>(null);
  const transcriptRequestRef=useRef<AbortController|null>(null);
  const whyRequestRef=useRef<AbortController|null>(null);
  const teilTasks=activeTeil?(guest?listeningTeilTasks[activeTeil].slice(0,2):listeningTeilTasks[activeTeil]):[];
  const task=teilTasks[index]??listeningTasks[0];
  const creditedInTeil=teilTasks.filter(item=>progress.credited.includes(item.id)).length;
  const audioSrc=useMemo(()=>`/audio/${String(task.number).padStart(3,'0')}.mp3`,[task.number]);
  const imageSrc=useMemo(()=>`/images/${String(task.number).padStart(3,'0')}.png?v=20260914-2`,[task.number]);
  const isCorrect=task.type==='multiple-choice'?selected===task.correctIndex:selected===task.correctAnswer;

  useEffect(()=>saveHorenProgress(progress),[progress]);
  useEffect(()=>{
    transcriptRequestRef.current?.abort();transcriptRequestRef.current=null;
    whyRequestRef.current?.abort();whyRequestRef.current=null;
    setSelected(null);setChecked(false);setTranscriptOpen(false);setTranscriptRu('');setTranscriptLoading(false);setWhy(null);
    audioRef.current?.pause();if(audioRef.current)audioRef.current.currentTime=0;
  },[activeTeil,index]);
  useEffect(()=>()=>{transcriptRequestRef.current?.abort();whyRequestRef.current?.abort()},[]);

  const openTranscript=async()=>{
    const next=!transcriptOpen;
    setTranscriptOpen(next);
    if(!next){transcriptRequestRef.current?.abort();transcriptRequestRef.current=null;setTranscriptLoading(false);return}
    if(transcriptRu||transcriptLoading)return;
    const controller=new AbortController();
    transcriptRequestRef.current?.abort();transcriptRequestRef.current=controller;
    const currentText=task.audioText;
    setTranscriptLoading(true);
    try{
      const r=await fetch('/api/translate-task',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({parts:[currentText]}),signal:controller.signal});
      const p=await r.json().catch(()=>({}));
      if(!controller.signal.aborted&&transcriptRequestRef.current===controller&&r.ok&&Array.isArray(p.translations))setTranscriptRu(String(p.translations[0]||''));
    }catch{/* keep German transcript */}
    finally{if(transcriptRequestRef.current===controller){transcriptRequestRef.current=null;setTranscriptLoading(false)}}
  };
  const loadWhy=async()=>{
    const de=reasonDe(task);
    const controller=new AbortController();
    whyRequestRef.current?.abort();whyRequestRef.current=controller;
    try{
      const r=await fetch('/api/translate-task',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'explain-pair',text:de}),signal:controller.signal});
      const p=await r.json().catch(()=>({}));
      if(controller.signal.aborted||whyRequestRef.current!==controller)return;
      if(r.ok&&p.de&&p.ru)setWhy({de:String(p.de),ru:String(p.ru)});else setWhy({de,ru:''});
    }catch{if(!controller.signal.aborted&&whyRequestRef.current===controller)setWhy({de,ru:''})}
    finally{if(whyRequestRef.current===controller)whyRequestRef.current=null}
  };
  const check=()=>{
    if(!activeTeil||selected===null||checked)return;
    setChecked(true);
    if(!isCorrect)void loadWhy();
    const result=creditHorenTask(progress,task,activeTeil,index,isCorrect);
    setProgress(result.progress);
    if(result.newlyCredited)onComplete(isCorrect?1:0,1,task.id);
    else recordTaskResult('horen',task.id,isCorrect?1:0,1);
  };
  const next=()=>{
    if(!activeTeil||!checked)return;
    if(index>=teilTasks.length-1){setFinishedTeil(activeTeil);return}
    setIndex(i=>i+1);window.scrollTo({top:0,behavior:'smooth'});
  };
  const chooseTeil=(teil:ListeningTeil)=>{
    setActiveTeil(teil);setIndex(guest?Math.min(1,progress.teilPositions[teil]):progress.teilPositions[teil]);setFinishedTeil(null);setShowList(true);setManual(false);
    onTrainingRouteChange?.(`horen-teil${teil}`);
  };
  const returnToTeils=()=>{setActiveTeil(null);setFinishedTeil(null);setShowList(false);onTrainingRouteChange?.(null)};
  const goToList=()=>{setShowList(true);setManual(false)};
  const beginTask=(at:number,isManual:boolean)=>{if(guest&&at>=2)return;setIndex(at);setChecked(false);setSelected(null);setShowList(false);setManual(isManual)};
  const skip=()=>{if(!activeTeil||checked)return;recordTaskResult('horen',task.id,0,1,true);setProgress(p=>p.teilPositions[activeTeil]===index?setHorenTeilPosition(p,activeTeil,Math.min(teilTasks.length-1,index+1)):p);setChecked(true)};
  const restart=()=>{
    if(!activeTeil)return;
    setProgress(current=>setHorenTeilPosition(current,activeTeil,0));
    setIndex(0);setSelected(null);setChecked(false);setFinishedTeil(null);setTranscriptOpen(false);setWhy(null);
    onTrainingRouteChange?.(`horen-teil${activeTeil}`);
  };

  if(activeTeil===null)return <div className="animate-fade-in pb-8">
    <header className="mb-5 flex min-w-0 items-start gap-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <Back onClick={onBack}/>
      <div className="min-w-0 flex-1"><h1 className="break-words text-2xl font-black text-slate-950">Hören A1</h1><p className="mt-1 text-sm leading-6 text-slate-600">Аудирование — слушаем и выбираем правильные ответы</p></div>
    </header>
    <h2 className="mb-3 text-xl font-black text-slate-950">Задания модуля</h2>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {([1,2,3] as ListeningTeil[]).map(teil=>{
        const info={
          1:{Icon:MessageCircle,title:'Короткие разговоры',first:'Короткие разговоры из повседневной жизни',second:'Прослушайте запись и выберите правильный ответ из A/B/C. В некоторых заданиях есть картинки'},
          2:{Icon:Megaphone,title:'Объявления',first:'Объявления в магазине, транспорте, аэропорту и других общественных местах',second:'Прослушайте запись и определите: Richtig или Falsch'},
          3:{Icon:PhoneCall,title:'Короткие сообщения',first:'Короткие сообщения и информация: номера телефонов, встречи, время, даты',second:'Прослушайте запись и выберите правильный ответ из A/B/C'},
        }[teil];
        const all=listeningTeilTasks[teil],completed=all.filter(item=>progress.credited.includes(item.id)).length;
        const Icon=info.Icon;
        return <button key={teil} type="button" onClick={()=>chooseTeil(teil)} className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-amber-300 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50"><Icon className="h-6 w-6 text-amber-700"/></span>
          <span className="mt-3 block text-xs font-black uppercase tracking-wider text-teal-700">Teil {teil}</span>
          <strong className="mt-1 block break-words text-xl font-black text-slate-950">{info.title}</strong>
          <span className="mt-2 block break-words text-sm leading-6 text-slate-600">{info.first}</span>
          <span className="mt-2 block break-words text-sm leading-6 text-slate-600">{info.second}</span>
          <span className="mt-3 block text-sm font-bold text-teal-900">{all.length} заданий · пройдено {completed}</span>
        </button>
      })}
    </div>
  </div>;

  if(showList&&activeTeil!==null)return <TaskList userId={userId} module="horen" teil={activeTeil} items={listeningTeilTasks[activeTeil].map(item=>({id:item.id,title:item.title}))} guestLimit={guest?2:undefined} continueIndex={guest?Math.min(1,progress.teilPositions[activeTeil]):progress.teilPositions[activeTeil]} onBack={returnToTeils} onContinue={()=>beginTask(guest?Math.min(1,progress.teilPositions[activeTeil]):progress.teilPositions[activeTeil],false)} onSelect={at=>beginTask(at,true)}/>;

  if(finishedTeil!==null)return <div className="animate-fade-in pb-8">
    <div className="mb-5 flex items-center gap-3"><Back onClick={returnToTeils}/><h1 className="text-2xl font-black">Hören · Teil {finishedTeil}</h1></div>
    <div className="rounded-3xl border bg-white p-7 text-center"><Headphones className="mx-auto h-12 w-12 text-sky-700"/>
      <h2 className="mt-4 text-2xl font-black">Teil {finishedTeil} завершён</h2>
      <p className="mt-2 text-slate-500">Зачтено заданий этого Teil: {creditedInTeil}/{teilTasks.length}. Данные сохранены и учитываются в готовности к A1.</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button onClick={returnToTeils} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 font-bold text-white">К выбору Teil</button>
        <button onClick={restart} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-5 font-bold"><RotateCcw className="h-4 w-4"/>Повторить Teil</button>
      </div>
    </div>
  </div>;

  return <div className="animate-fade-in pb-8">
    <div className="mb-5 flex items-start gap-3">
      <Back onClick={goToList}/>
      <div className="min-w-0 flex-1"><h1 className="text-2xl font-black text-slate-950">Hören · Teil {activeTeil}</h1><p className="mt-1 text-sm text-slate-500">Задание {index+1} из {teilTasks.length} · выполнено в Teil {creditedInTeil}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-sky-600" style={{width:`${teilTasks.length?(creditedInTeil/teilTasks.length)*100:0}%`}}/></div></div>
      <CompactTranslationEye parts={['Hören','Hören Sie den Text und wählen Sie die passende Antwort.']} translations={['Аудирование','Прослушайте текст и выберите подходящий ответ.']} title="Перевод"/>
    </div>

    <GuidedTaskPrep key={`horen-${activeTeil}-${task.id}`} focus={`${task.instruction} ${task.prompt}`} tip="Сначала поймите, что именно нужно услышать. Отмечайте числа, время, место, отрицания и изменение планов." defaultCollapsed forceVisible/>
    <section className="overflow-hidden rounded-3xl border border-sky-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-sky-50 p-5">
        <div className="min-w-0"><p className="text-xs font-black uppercase tracking-wider text-sky-700">Aufgabe {task.number}</p><h2 className="mt-1 text-2xl font-black leading-tight text-slate-950"><HoverTranslateText text={task.title}/></h2></div>
        <CompactTranslationEye parts={[task.title,task.instruction,task.prompt,...(task.type==='multiple-choice'?task.options:['Richtig','Falsch'])]} title="Перевод карточки"/>
      </div>
      <div className="space-y-5 p-4 sm:p-6">
        {index===0&&<p className="rounded-xl bg-slate-50 p-4 text-base font-semibold leading-7 text-slate-700"><HoverTranslateText text={task.instruction}/></p>}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><audio ref={audioRef} src={audioSrc} controls preload="metadata" className="w-full"/></div>
        <button type="button" onClick={openTranscript} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"><Eye className="h-4 w-4"/>{transcriptOpen?'Скрыть текст аудио':'Показать текст аудио'}</button>
        {transcriptOpen&&<div className="max-w-full overflow-x-hidden rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6"><b className="text-slate-950">Deutsch</b><p className="mt-1 break-words text-slate-700 [overflow-wrap:anywhere]">{task.audioText}</p><b className="mt-4 block text-slate-950">Русский</b><p className="mt-1 break-words text-slate-700 [overflow-wrap:anywhere]">{transcriptLoading?'Перевожу…':transcriptRu||'Перевод временно недоступен.'}</p></div>}
        <HorenTaskImage key={task.id} src={imageSrc} taskNumber={task.number}/>
        <p className="text-xl font-bold leading-8 text-slate-950"><HoverTranslateText text={task.prompt}/></p>
        <div className="grid gap-3">
          {task.type==='multiple-choice'?task.options.map((option,n)=>{const correct=n===task.correctIndex;return <button key={`${option}-${n}`} disabled={checked} onClick={()=>setSelected(n)} className={answerClass(selected===n,checked,correct)}><span className="mr-2 font-black text-sky-700">{String.fromCharCode(65+n)}.</span><HoverTranslateText text={option}/></button>}):([true,false] as boolean[]).map(value=>{const correct=value===task.correctAnswer;return <button key={String(value)} disabled={checked} onClick={()=>setSelected(value)} className={answerClass(selected===value,checked,correct)}><HoverTranslateText text={value?'Richtig':'Falsch'}/></button>})}
        </div>
      </div>
    </section>

    {checked&&<div className={cn('mt-4 rounded-2xl border p-4',isCorrect?'border-emerald-200 bg-emerald-50':'border-rose-200 bg-rose-50')}><div className="flex items-center gap-2">{isCorrect?<CheckCircle2 className="h-5 w-5 text-emerald-700"/>:<CircleX className="h-5 w-5 text-rose-700"/>}<b>{isCorrect?'Правильно':'Неверно'}</b></div>{!isCorrect&&<div className="mt-3 text-sm leading-6 text-slate-700">{why?<><p><b>Deutsch:</b> {why.de}</p>{why.ru&&<p><b>Русский:</b> {why.ru}</p>}</>:<p className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Отто готовит объяснение…</p>}</div>}</div>}
    <div className={checked?'mt-5 grid grid-cols-2 gap-2 pb-20':'mt-5 flex flex-wrap justify-end gap-2 pb-20'}>{!checked?<><button onClick={skip} className="min-h-12 rounded-xl border border-amber-300 bg-amber-50 px-4 font-bold text-amber-900">Пропустить</button><button onClick={check} disabled={selected===null} className="min-h-12 rounded-xl bg-slate-900 px-6 font-bold text-white disabled:opacity-40">Проверить</button></>:<><button type="button" onClick={goToList} className="min-h-12 min-w-0 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold sm:text-sm">К списку заданий</button><button onClick={next} className="inline-flex min-h-12 min-w-0 items-center justify-center gap-1 rounded-xl bg-slate-900 px-2 py-2 text-sm font-bold text-white">Далее <ArrowRight className="h-4 w-4 shrink-0"/></button></>}</div>
  </div>;
}

function answerClass(selected:boolean,checked:boolean,correct:boolean){return cn('min-h-12 rounded-xl border-2 px-4 py-3 text-left font-semibold transition',checked&&selected?(correct?'border-emerald-500 bg-emerald-50 text-emerald-950':'border-rose-500 bg-rose-50 text-rose-950'):selected?'border-blue-300 bg-blue-50 text-slate-950':'border-slate-200 bg-white text-slate-900')}
function reasonDe(task:HorenTask){if(task.type==='multiple-choice')return `Die passende Antwort ist „${task.options[task.correctIndex]}“. Diese Information hören Sie im Dialog.`;return `Die Aussage ist ${task.correctAnswer?'richtig':'falsch'}. Diese Information hören Sie im Dialog.`}
function Back({onClick}:{onClick:()=>void}){return <button onClick={onClick} aria-label="Назад" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white"><ArrowLeft className="h-5 w-5"/></button>}

/** Each source task has an original PNG; never silently hide it on an image load error.
 * key={task.id} on the parent guarantees that an error for one item cannot
 * carry over to another when React reuses its DOM structure.
 */
function HorenTaskImage({src,taskNumber}:{src:string;taskNumber:number}){
  const[failed,setFailed]=useState(false);
  const[retry,setRetry]=useState(0);
  if(failed)return <div role="status" className="mx-auto max-w-[520px] rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
    <p>Не удалось загрузить картинку к заданию {taskNumber}.</p>
    <button type="button" onClick={()=>{setRetry(value=>value+1);setFailed(false)}} className="mt-3 min-h-11 rounded-xl border border-amber-300 bg-white px-4 font-bold">Повторить загрузку картинки</button>
  </div>;
  return <img key={`${src}:${retry}`} src={src} alt={`Иллюстрация к заданию ${taskNumber}`} className="mx-auto max-h-[420px] w-full max-w-[520px] rounded-2xl object-contain" onError={()=>setFailed(true)}/>;
}
