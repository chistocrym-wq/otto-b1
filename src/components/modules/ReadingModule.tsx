import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, CircleX, Globe2, Loader2, Mail, Signpost, Volume2 } from 'lucide-react';
import { loadLesenArchive, type LesenArchiveData, type LesenArchiveOption, type LesenArchiveTeil1Task, type LesenArchiveTeil2Task, type LesenArchiveTeil3Task } from '@/data/lesen/archiveData';
import { CompactTranslationEye } from '@/components/common/CompactTranslationEye';
import { HoverTranslateText, speakSelectedGerman } from '@/components/common/HoverTranslateText';
import { GuidedTaskPrep } from '@/components/GuidedTaskPrep';
import { cn } from '@/lib/utils';
import { TaskList } from '@/components/common/TaskList';
import { recordTaskResult } from '@/lib/taskResults';
import { emitOttoClientDiagnostic, getLatestOttoStateSyncDiagnostic, getViewportLabel, isOttoDebugEnabled, isStandaloneDisplay, subscribeOttoStateSyncDiagnostic, type OttoStateSyncDiagnostic } from '@/lib/previewDiagnostics';

type Part=1|2|3; type Bin='richtig'|'falsch'; type Choice='a'|'b';
type LesenRoute='lesen-teil1'|'lesen-teil2'|'lesen-teil3';
interface Props {
 guest?:boolean;
 onBack:()=>void;
 onComplete:(score:number,total:number,taskId?:string)=>void;
 initialPart?:Part|null;
 onTrainingRouteChange?:(detail:LesenRoute|null)=>void;
 onTrainingComplete?:()=>void;
 userId?:string;
}
type PartProgress={nextIndex:number;completedTasks:number;answered:number;correct:number;mistakes:string[];credited:string[]};
type LesenProgress=Record<'1'|'2'|'3',PartProgress>;
const STORAGE_KEY='otto-a1-lesen-progress-v2';
const EMPTY_PART:PartProgress={nextIndex:0,completedTasks:0,answered:0,correct:0,mistakes:[],credited:[]};
const INTRO_DE='Lesen hat drei Teile. Sie lesen kurze E-Mails und Nachrichten, Webseiten und Anzeigen sowie Schilder und Hinweise. Finden Sie die wichtige Information und wählen Sie die passende Antwort.';
const INTRO_RU='Чтение состоит из трёх частей: короткие письма и сообщения, сайты и объявления, вывески и указания. Нужно найти важную информацию и выбрать подходящий ответ.';
const META={1:{title:'Briefe & Nachrichten',de:'Kurze E-Mails und Nachrichten lesen und Aussagen als richtig oder falsch markieren.',ru:'Короткие письма и сообщения: прочитать и определить, верно или неверно утверждение.',icon:Mail},2:{title:'Webseiten & Anzeigen',de:'Eine Situation lesen und zwischen zwei Informationsquellen a oder b wählen.',ru:'Прочитать ситуацию и выбрать, где есть нужная информация: a или b.',icon:Globe2},3:{title:'Schilder & Hinweise',de:'Kurze Hinweise, Schilder und Anzeigen lesen und Aussagen prüfen.',ru:'Прочитать вывески и объявления и проверить утверждение.',icon:Signpost}} as const;

function readProgress():LesenProgress{
  const blank=():PartProgress=>({...EMPTY_PART,mistakes:[],credited:[]});
  try{
    const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}') as Partial<LesenProgress>;
    const safe=(p?:Partial<PartProgress>):PartProgress=>({nextIndex:Math.max(0,Math.min(49,Number(p?.nextIndex)||0)),completedTasks:Math.max(0,Number(p?.completedTasks)||0),answered:Math.max(0,Number(p?.answered)||0),correct:Math.max(0,Number(p?.correct)||0),mistakes:Array.isArray(p?.mistakes)?p!.mistakes!.map(String).slice(-120):[],credited:Array.isArray(p?.credited)?p!.credited!.map(String).slice(-200):[]});
    return {'1':safe(raw['1']),'2':safe(raw['2']),'3':safe(raw['3'])};
  }catch{return {'1':blank(),'2':blank(),'3':blank()}}
}
function saveProgress(value:LesenProgress){
  try{
    localStorage.setItem(STORAGE_KEY,JSON.stringify(value));
    return null;
  }catch(error){
    return error instanceof Error?error.message:String(error);
  }
}
function partKey(part:Part){return String(part) as '1'|'2'|'3'}

export function ReadingModule({guest=false,onBack,onComplete,initialPart=null,onTrainingRouteChange,onTrainingComplete,userId}:Props){
 const initialProgress=readProgress();
 const[data,setData]=useState<LesenArchiveData|null>(null),[error,setError]=useState<string|null>(null);
 const[progress,setProgress]=useState<LesenProgress>(initialProgress);
 const[part,setPart]=useState<Part|null>(initialPart);
 const[showList,setShowList]=useState(Boolean(initialPart));
 const[manual,setManual]=useState(false);
 const[index,setIndex]=useState(()=>initialPart?(initialProgress[partKey(initialPart)].completedTasks>=50?49:initialProgress[partKey(initialPart)].nextIndex):0);
 const[checked,setChecked]=useState(false),[finished,setFinished]=useState(()=>initialPart?initialProgress[partKey(initialPart)].completedTasks>=50:false),[bin,setBin]=useState<Bin|null>(null),[choice,setChoice]=useState<Choice|null>(null),[multi,setMulti]=useState<(Bin|null)[]>([]),[lastAdd,setLastAdd]=useState(0);
 const debug=isOttoDebugEnabled();
 const[lastSync,setLastSync]=useState<OttoStateSyncDiagnostic|null>(()=>getLatestOttoStateSyncDiagnostic());
 const[lastClientError,setLastClientError]=useState('');
 const[lastTapTarget,setLastTapTarget]=useState('');
 useEffect(()=>{let live=true;loadLesenArchive().then(v=>{if(!live)return;setData(v);if(debug)void emitOttoClientDiagnostic({module:'lesen',teil:part,taskIndex:index,action:'load-archive',message:`lengths=${v.teil1.length}/${v.teil2.length}/${v.teil3.length}`})}).catch((e:unknown)=>{if(!live)return;const message=e instanceof Error?e.message:'Не удалось загрузить задания Lesen.';setError(message);setLastClientError(message);if(debug)void emitOttoClientDiagnostic({module:'lesen',teil:part,taskIndex:index,action:'load-archive-error',message})});return()=>{live=false}},[debug]);
 useEffect(()=>{
   const saveError=saveProgress(progress);
   if(saveError){
     setLastClientError(saveError);
     if(debug)void emitOttoClientDiagnostic({module:'lesen',teil:part,taskIndex:index,action:'save-state',message:saveError});
   }else if(debug&&part===2){
     const p=progress['2'];
     void emitOttoClientDiagnostic({module:'lesen',teil:2,taskIndex:index,action:'save-state',message:`nextIndex=${p.nextIndex}; completedTasks=${p.completedTasks}; answered=${p.answered}; correct=${p.correct}; credited=${p.credited.length}`});
   }
 },[debug,index,part,progress]);
 useEffect(()=>debug?subscribeOttoStateSyncDiagnostic(value=>setLastSync(value)):undefined,[debug]);
 useEffect(()=>{
   if(!debug)return;
   const onError=(event:ErrorEvent)=>{const message=event.message||'window_error';setLastClientError(message);void emitOttoClientDiagnostic({module:'lesen',teil:part,taskIndex:index,action:'js-error',message})};
   const onRejection=(event:PromiseRejectionEvent)=>{const message=event.reason instanceof Error?event.reason.message:String(event.reason||'unhandled_rejection');setLastClientError(message);void emitOttoClientDiagnostic({module:'lesen',teil:part,taskIndex:index,action:'unhandled-rejection',message})};
   const onPointer=(event:PointerEvent)=>{if(part!==2)return;const target=event.target as HTMLElement|null;const text=(target?.innerText||target?.textContent||target?.tagName||'unknown').trim().replace(/\s+/g,' ').slice(0,120);setLastTapTarget(text);void emitOttoClientDiagnostic({module:'lesen',teil:2,taskIndex:index,action:'pointerdown',message:`target=${text}`})};
   window.addEventListener('error',onError);
   window.addEventListener('unhandledrejection',onRejection);
   document.addEventListener('pointerdown',onPointer,true);
   return()=>{window.removeEventListener('error',onError);window.removeEventListener('unhandledrejection',onRejection);document.removeEventListener('pointerdown',onPointer,true)};
 },[debug,index,part]);
 const allTasks=!data||!part?[]:part===1?data.teil1:part===2?data.teil2:data.teil3;
 const tasks=guest?allTasks.slice(0,2):allTasks,current=tasks[index];
 const currentProgress=part?progress[partKey(part)]:EMPTY_PART;
 const total=part===1?150:50;
 const clear=()=>{setChecked(false);setBin(null);setChoice(null);setMulti([]);setLastAdd(0)};
 const reset=()=>{if(!part)return;const pk=partKey(part);onTrainingRouteChange?.(`lesen-teil${part}` as LesenRoute);setProgress(prev=>({...prev,[pk]:{...prev[pk],nextIndex:0}}));setIndex(0);setFinished(false);setShowList(false);setManual(false);clear();window.scrollTo({top:0,behavior:'smooth'})};
 const open=(p:Part)=>{const saved=progress[partKey(p)];onTrainingRouteChange?.(`lesen-teil${p}` as LesenRoute);setPart(p);setIndex(guest?Math.min(1,saved.nextIndex):saved.nextIndex);setShowList(true);setManual(false);setFinished(false);clear();window.scrollTo({top:0,behavior:'smooth'})};
 const back=()=>{onTrainingRouteChange?.(null);setPart(null);setShowList(false);setFinished(false);clear();window.scrollTo({top:0,behavior:'smooth'})};
 const toList=()=>{setShowList(true);setManual(false);setFinished(false);clear()};
 const begin=(at:number,isManual:boolean)=>{if(guest&&at>=2)return;setIndex(at);setShowList(false);setManual(isManual);setFinished(false);clear()};
 const skip=()=>{if(!part||!current||checked)return;recordTaskResult('lesen',`${part}-${index}`,0,part===1?(current as LesenArchiveTeil1Task).statements.length:1,true);{const pk=partKey(part);setProgress(prev=>({...prev,[pk]:{...prev[pk],nextIndex:prev[pk].nextIndex===index?Math.min(49,index+1):prev[pk].nextIndex}}))}setChecked(true);setLastAdd(0)};
 const canCheck=()=>{if(!part||!current||checked)return false;if(part===1){const t=current as LesenArchiveTeil1Task;return multi.length===t.statements.length&&multi.every(Boolean)}return part===2?choice!==null:bin!==null};
 const check=()=>{
  if(!canCheck()||!part||!current)return;
  if(debug)void emitOttoClientDiagnostic({module:'lesen',teil:part,taskIndex:index,action:'check',message:`checked=${checked}; choice=${choice??bin??'none'}; nextIndex=${progress[partKey(part)].nextIndex}; completedTasks=${progress[partKey(part)].completedTasks}`});
  let add=0,answeredNow=1;const mistakes:string[]=[];
  if(part===1){const t=current as LesenArchiveTeil1Task;answeredNow=t.statements.length;add=t.statements.reduce((n,s,i)=>{const expected:Bin=s.correct?'richtig':'falsch';const ok=multi[i]===expected;if(!ok)mistakes.push(`Teil 1 · Aufgabe ${index+1}.${i+1}: ${s.statement}`);return n+(ok?1:0)},0)}
  else if(part===2){const t=current as LesenArchiveTeil2Task;add=choice===t.correct?1:0;if(!add)mistakes.push(`Teil 2 · Aufgabe ${index+1}: ${t.situation}`)}
  else{const t=current as LesenArchiveTeil3Task;const expected:Bin=t.correct==='Richtig'?'richtig':'falsch';add=bin===expected?1:0;if(!add)mistakes.push(`Teil 3 · Aufgabe ${index+1}: ${t.statement}`)}
  setLastAdd(add);setChecked(true);
  const key=`${part}-${index}`;const pk=partKey(part);const already=progress[pk].credited.includes(key);
  if(already)recordTaskResult('lesen',key,add,answeredNow);
  if(!already){
    const nextPart:PartProgress={...progress[pk],nextIndex:progress[pk].nextIndex===index?Math.min(49,index+1):progress[pk].nextIndex,completedTasks:Math.min(50,progress[pk].completedTasks+1),answered:progress[pk].answered+answeredNow,correct:progress[pk].correct+add,mistakes:[...progress[pk].mistakes,...mistakes].slice(-120),credited:[...progress[pk].credited,key].slice(-200)};
    setProgress(prev=>({...prev,[pk]:nextPart}));
    onComplete(add,answeredNow,key);
  }
 };
 const next=()=>{
  if(!checked||!part)return;
  const before=index;
  const pk=partKey(part);
  const p=progress[pk];
  if(debug)void emitOttoClientDiagnostic({module:'lesen',teil:part,taskIndex:index,action:'next',message:`before=${before}; checked=${checked}; nextIndex=${p.nextIndex}; completedTasks=${p.completedTasks}; answered=${p.answered}; correct=${p.correct}; credited=${p.credited.length}`});
  const done=index===tasks.length-1;
  if(done){if(p.nextIndex===49)onTrainingComplete?.();setFinished(true);window.scrollTo({top:0,behavior:'smooth'});return}
  setIndex(v=>{
    const after=Math.min(tasks.length-1,v+1);
    if(debug)void emitOttoClientDiagnostic({module:'lesen',teil:part,taskIndex:after,action:'next-applied',message:`before=${v}; after=${after}`});
    return after;
  });
  clear();
  window.scrollTo({top:0,behavior:'smooth'});
 };
 if(error)return <div className="animate-fade-in pb-8"><Back onClick={onBack}/><div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900"><b>Не удалось открыть Lesen</b><p className="mt-1 text-sm">{error}</p></div></div>;
 if(!data)return <div className="flex min-h-[260px] items-center justify-center text-center text-slate-500"><div><Loader2 className="mx-auto h-7 w-7 animate-spin"/><p className="mt-3 text-sm font-semibold">Загружаем задания Lesen…</p></div></div>;
 if(!part)return <Home onBack={onBack} onOpen={open} progress={progress}/>;
 if(showList)return <TaskList userId={userId} module="lesen" teil={part} items={allTasks.map((item,at)=>({id:`${part}-${at}`,title:part===1?'Brief & Nachrichten · '+(at+1):part===2?'Webseite & Anzeige · '+(at+1):'Schild & Hinweis · '+(at+1)}))} guestLimit={guest?2:undefined} continueIndex={guest?Math.min(1,currentProgress.nextIndex):currentProgress.nextIndex} onBack={back} onContinue={()=>begin(guest?Math.min(1,currentProgress.nextIndex):currentProgress.nextIndex,false)} onSelect={at=>{if(!guest||at<2)begin(at,true)}}/>;
 if(finished)return <Result part={part} score={currentProgress.correct} total={total} completed={currentProgress.completedTasks} onRetry={reset} onBack={toList}/>;
 if(!current)return <div><Back onClick={toList}/><p className="mt-4">В этой части пока нет заданий.</p></div>;
 const prepFocus=part===1?(current as LesenArchiveTeil1Task).statements[0]?.statement||instruction(part):part===2?(current as LesenArchiveTeil2Task).situation:(current as LesenArchiveTeil3Task).statement;
 const prepTip=part===1?'Сначала поймите смысл утверждения, потом ищите в тексте подтверждение или противоречие.':part===2?'Определите, какая именно информация нужна в ситуации, и только потом сравнивайте варианты A и B.':'Сначала найдите запрет, разрешение, время или условие на табличке — это обычно ключ к ответу.';
 return <div className="animate-fade-in pb-8"><div className="mb-4 flex items-start gap-3"><Back onClick={toList}/><div className="min-w-0 flex-1"><h1 className="text-xl font-black text-slate-950">Lesen · Teil {part}</h1><p className="mt-1 text-sm text-slate-500">Задание {index+1} из 50 · выполнено {currentProgress.completedTasks}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-teal-600" style={{width:`${(currentProgress.completedTasks/50)*100}%`}}/></div></div><CompactTranslationEye parts={[`Lesen Teil ${part}`,META[part].de]} translations={[`Чтение · часть ${part}`,META[part].ru]} title="Перевод"/></div>
  {index===0&&<div className="mb-4 flex items-start justify-between gap-3 rounded-xl border-l-4 border-teal-600 bg-teal-50 px-4 py-3 text-sm leading-6 text-slate-700"><HoverTranslateText text={instruction(part)}/><CompactTranslationEye parts={[instruction(part)]} title="Перевод задания"/></div>}
  <GuidedTaskPrep key={`lesen-${part}-${index}`} focus={prepFocus} tip={prepTip} defaultCollapsed forceVisible/>
 {part===1&&<Teil1 task={current as LesenArchiveTeil1Task} answers={multi} checked={checked} onAnswer={(i,a)=>{if(checked)return;const len=(current as LesenArchiveTeil1Task).statements.length;setMulti(prev=>{const v=Array<Bin|null>(len).fill(null);prev.forEach((x,j)=>{if(j<len)v[j]=x});v[i]=a;return v})}}/>}
 {part===2&&<Teil2 task={current as LesenArchiveTeil2Task} selected={choice} checked={checked} onSelect={a=>!checked&&setChoice(a)}/>} 
 {part===3&&<Teil3 task={current as LesenArchiveTeil3Task} selected={bin} checked={checked} onSelect={a=>!checked&&setBin(a)}/>} 
 {checked&&part!==1&&<SingleFeedback part={part} task={current as LesenArchiveTeil2Task|LesenArchiveTeil3Task} choice={choice} bin={bin}/>} 
 {checked&&<p className="mb-4 text-sm font-semibold text-slate-500">За задание: {lastAdd}/{part===1?(current as LesenArchiveTeil1Task).statements.length:1}</p>}
  <div className={checked?'grid grid-cols-2 gap-2 pb-20':'flex flex-wrap justify-end gap-2 pb-20'}>{!checked?<><button type="button" onClick={skip} className="min-h-12 rounded-xl border border-amber-300 bg-amber-50 px-4 font-bold text-amber-900">Пропустить</button><button onClick={check} disabled={!canCheck()} className="min-h-12 rounded-xl bg-slate-900 px-6 py-3 font-bold text-white disabled:opacity-40">Проверить</button></>:<><button type="button" onClick={toList} className="min-h-12 min-w-0 rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-xs font-bold text-slate-800 sm:text-sm">К списку заданий</button><button onClick={next} className="inline-flex min-h-12 min-w-0 items-center justify-center gap-1 rounded-xl bg-slate-900 px-2 py-2 text-center text-sm font-bold text-white" data-otto-diag-next="lesen">Далее <ArrowRight className="h-4 w-4 shrink-0"/></button></>}</div>
 {debug&&<LesenDebugPanel userId={userId} part={part} index={index} checked={checked} choice={choice??bin} progress={progress} data={data} lastSync={lastSync} lastClientError={lastClientError} lastTapTarget={lastTapTarget}/>}
 </div>;
}

function LesenDebugPanel({userId,part,index,checked,choice,progress,data,lastSync,lastClientError,lastTapTarget}:{userId?:string;part:Part;index:number;checked:boolean;choice:string|null;progress:LesenProgress;data:LesenArchiveData;lastSync:OttoStateSyncDiagnostic|null;lastClientError:string;lastTapTarget:string}){
 const p=progress['2'];
 const raw=(key:string)=>{try{return localStorage.getItem(key)||'—'}catch{return'localStorage error'}};
 const task2=data.teil2[1];
 return <aside className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+8px)] left-2 right-2 z-[130] max-h-[44vh] overflow-auto rounded-2xl border-2 border-fuchsia-400 bg-slate-950/95 p-3 text-[11px] leading-5 text-white shadow-2xl sm:left-auto sm:right-3 sm:w-[420px]" data-otto-debug="lesen">
   <div className="flex items-center justify-between gap-2"><b className="text-fuchsia-300">OTTO DEBUG · PREVIEW ONLY</b><span>{getViewportLabel()} · standalone {isStandaloneDisplay()?'yes':'no'}</span></div>
   <div className="mt-2 grid grid-cols-2 gap-x-3">
     <span>User ID</span><b className="break-all">{userId||'unknown'}</b>
     <span>Module / Teil</span><b>Lesen / {part}</b>
     <span>Task index</span><b>{index} (Задание {index+1})</b>
     <span>nextIndex</span><b>{p.nextIndex}</b>
     <span>completedTasks</span><b>{p.completedTasks}</b>
     <span>answered / correct</span><b>{p.answered} / {p.correct}</b>
     <span>credited</span><b>{p.credited.length}</b>
     <span>checked / selected</span><b>{String(checked)} / {choice||'—'}</b>
     <span>last PUT</span><b>{lastSync?.key==='otto-a1-lesen-progress-v2'?`${lastSync.status??'network'} ${lastSync.ok?'OK':'FAIL'}`:'—'}</b>
     <span>last tap target</span><b className="break-words">{lastTapTarget||'—'}</b>
     <span>last JS/client error</span><b className="break-words text-amber-300">{lastClientError||'—'}</b>
     <span>archive lengths</span><b>{data.teil1.length}/{data.teil2.length}/{data.teil3.length}</b>
     <span>task #2 format</span><b>{task2?.format||'missing'}</b>
   </div>
   <details className="mt-2"><summary className="cursor-pointer font-bold text-fuchsia-200">State keys</summary><pre className="mt-2 whitespace-pre-wrap break-all text-[10px]">{JSON.stringify({
     'otto-a1-lesen-progress-v2':raw('otto-a1-lesen-progress-v2'),
     'otto-lesen-teil2-progress-v1':raw('otto-lesen-teil2-progress-v1'),
     'otto-training-resume-v1':raw('otto-training-resume-v1'),
     'otto-module-task-completion-v1':raw('otto-module-task-completion-v1'),
   },null,2)}</pre></details>
   <details className="mt-2"><summary className="cursor-pointer font-bold text-fuchsia-200">Teil 2 task #2 render data</summary><pre className="mt-2 whitespace-pre-wrap break-all text-[10px]">{JSON.stringify(task2,null,2)}</pre></details>
   <details className="mt-2"><summary className="cursor-pointer font-bold text-fuchsia-200">Device</summary><pre className="mt-2 whitespace-pre-wrap break-all text-[10px]">{navigator.userAgent}</pre></details>
 </aside>;
}

function Home({onBack,onOpen,progress}:{onBack:()=>void;onOpen:(p:Part)=>void;progress:LesenProgress}){
  return <div className="animate-fade-in pb-8">
    <header className="mb-5 flex min-w-0 items-start gap-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <Back onClick={onBack}/>
      <div className="min-w-0 flex-1">
        <h1 className="break-words text-2xl font-black text-slate-950">Lesen A1</h1>
        <p className="mt-1 text-sm leading-6 text-slate-600">Чтение — учимся понимать немецкие тексты</p>
      </div>
      <CompactTranslationEye parts={[INTRO_DE]} translations={[INTRO_RU]} title="Перевод Lesen"/>
    </header>
    <h2 className="mb-3 text-xl font-black text-slate-950">Задания модуля</h2>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {([1,2,3] as Part[]).map(p=>{
        const m=META[p],Icon=m.icon,s=progress[partKey(p)];
        return <div key={p} className="relative min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-lg focus-within:border-amber-300">
          <button type="button" onClick={()=>onOpen(p)} aria-label={`Открыть Teil ${p} · ${m.title}`} className="absolute inset-0 z-0 w-full rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"/>
          <div className="pointer-events-none relative z-[1] min-w-0">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50"><Icon className="h-6 w-6 text-amber-700"/></span>
            <p className="mt-3 text-xs font-black uppercase tracking-wider text-teal-700">Teil {p}</p>
            <h3 className="mt-1 break-words text-xl font-black text-slate-950">{m.title}</h3>
            <p className="mt-2 break-words text-sm leading-6 text-slate-600">{m.ru}</p>
            <p className="mt-3 text-sm font-bold text-teal-900">50 заданий для тренировки</p>
            {s.completedTasks>0&&<p className="mt-1 break-words text-xs leading-5 text-slate-500">Выполнено: {s.completedTasks}/50 · правильно: {s.correct}/{s.answered}</p>}
          </div>
          <div className="absolute right-4 top-4 z-10"><CompactTranslationEye parts={[`Teil ${p}: ${m.title}`,m.de]} translations={[`Часть ${p}`,m.ru]} title={`Перевод Teil ${p}`}/></div>
        </div>;
      })}
    </div>
  </div>;
}

type ReadingFeedbackItem={context:string;prompt:string;correctAnswer:string;sourceExplanation:string};
type ReadingFeedbackPair={de:string;ru:string};
const readingFeedbackCache=new Map<string,ReadingFeedbackPair>();
function feedbackKey(part:Part,item:ReadingFeedbackItem){return JSON.stringify([part,item.context,item.prompt,item.correctAnswer,item.sourceExplanation])}
function useReadingFeedback(part:Part,items:ReadingFeedbackItem[],enabled:boolean){
 const cacheKey=JSON.stringify(items.map(item=>feedbackKey(part,item)));
 const[pairs,setPairs]=useState<(ReadingFeedbackPair|null)[]>(()=>items.map(item=>readingFeedbackCache.get(feedbackKey(part,item))??null));
 useEffect(()=>{
   if(!enabled){setPairs(items.map(item=>readingFeedbackCache.get(feedbackKey(part,item))??null));return}
   const cached=items.map(item=>readingFeedbackCache.get(feedbackKey(part,item))??null);
   if(cached.every(Boolean)){setPairs(cached);return}
   const controller=new AbortController();
   setPairs(cached);
   fetch('/api/reading-feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({part,items}),signal:controller.signal})
    .then(r=>r.ok?r.json():Promise.reject(new Error('reading_feedback_failed')))
    .then(payload=>{
      if(controller.signal.aborted||!Array.isArray(payload?.items))return;
      const next=items.map((item,index)=>{const row=payload.items[index];if(row?.de&&row?.ru){const pair={de:String(row.de),ru:String(row.ru)};readingFeedbackCache.set(feedbackKey(part,item),pair);return pair}return cached[index]});
      setPairs(next);
    }).catch(()=>{});
   return()=>controller.abort();
 },[part,cacheKey,enabled]);
 return pairs;
}
function optionFeedbackText(option:LesenArchiveOption){return [option.url,option.title,...(option.lines??[]),...(option.rows??[]).flat()].filter(Boolean).join(' · ')}
function ReadingWhy({pair,fallback}:{pair:ReadingFeedbackPair|null;fallback:string}){return <div className="mt-2 space-y-1 text-sm leading-6 text-slate-700">{pair?<><p><b>Deutsch:</b> {pair.de}</p><p><b>Русский:</b> {pair.ru}</p></>:fallback?<p>{fallback}</p>:<p className="text-slate-500">Готовим короткое объяснение по тексту…</p>}</div>}

function Teil1({task,answers,checked,onAnswer}:{task:LesenArchiveTeil1Task;answers:(Bin|null)[];checked:boolean;onAnswer:(i:number,a:Bin)=>void}){
 const items=useMemo<ReadingFeedbackItem[]>(()=>task.statements.map(s=>({context:task.text,prompt:s.statement,correctAnswer:s.correct?'Richtig':'Falsch',sourceExplanation:s.explanation||''})),[task]);
 const feedback=useReadingFeedback(1,items,checked);
 return <section className="mb-4 rounded-2xl border bg-[#fffefa] p-4 shadow-sm sm:p-5"><p className="mb-2 text-xs font-bold uppercase text-slate-400">{task.format}</p><div className="whitespace-pre-line rounded-xl bg-white p-4 text-[15px] leading-7"><HoverTranslateText text={task.text}/></div><div className="mt-4 space-y-3">{task.statements.map((s,i)=>{const selected=answers[i]??null,expected:Bin=s.correct?'richtig':'falsch',ok=checked&&selected===expected;return <div key={i} className="rounded-xl border bg-white p-4"><p className="text-[15px] font-semibold leading-6">{i+1}. <HoverTranslateText text={s.statement}/></p><div className="mt-3 grid grid-cols-2 gap-2"><AB label="Richtig" value="richtig" selected={selected} disabled={checked} checked={checked} correctValue={expected} onSelect={v=>onAnswer(i,v as Bin)}/><AB label="Falsch" value="falsch" selected={selected} disabled={checked} checked={checked} correctValue={expected} onSelect={v=>onAnswer(i,v as Bin)}/></div>{checked&&<div className={cn('mt-3 rounded-lg px-3 py-2 text-sm',ok?'bg-emerald-50 text-emerald-900':'bg-rose-50 text-rose-900')}><div className="flex gap-2">{ok?<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0"/>:<CircleX className="mt-0.5 h-4 w-4 shrink-0"/>}<div><b>{ok?`Правильно: ${expected==='richtig'?'Richtig':'Falsch'}`:`Неверно. Правильный ответ: ${expected==='richtig'?'Richtig':'Falsch'}`}</b><ReadingWhy pair={feedback[i]??null} fallback={s.explanation||''}/></div></div></div>}</div>})}</div></section>
}

function Teil2({task,selected,checked,onSelect}:{task:LesenArchiveTeil2Task;selected:Choice|null;checked:boolean;onSelect:(a:Choice)=>void}){return <section className="mb-4 space-y-3"><div className="rounded-2xl border bg-white p-4 text-[16px] font-semibold leading-7"><HoverTranslateText speakOnActivate={false} text={task.situation}/></div><div className="grid min-w-0 gap-3 sm:grid-cols-2"><OptionCard label="A" option={task.a} format={task.format} selected={selected==='a'} checked={checked} correct={task.correct==='a'} onClick={()=>onSelect('a')}/><OptionCard label="B" option={task.b} format={task.format} selected={selected==='b'} checked={checked} correct={task.correct==='b'} onClick={()=>onSelect('b')}/></div></section>}
function OptionCard({label,option,format,selected,checked,correct,onClick}:{label:'A'|'B';option:LesenArchiveOption;format:LesenArchiveTeil2Task['format'];selected:boolean;checked:boolean;correct:boolean;onClick:()=>void}){
 return <div className="relative min-w-0">
   <button type="button" onClick={onClick} disabled={checked} className={cn('h-full w-full min-w-0 rounded-2xl border-2 p-4 text-left transition',checked&&selected?(correct?'border-emerald-500 bg-emerald-50':'border-rose-500 bg-rose-50'):selected?'border-blue-300 bg-blue-50':'border-slate-200 bg-white')}>
     <div className="mb-3 flex items-center justify-between pr-12"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-black text-white">{label}</span>{checked&&selected&&correct&&<CheckCircle2 className="h-5 w-5 text-emerald-700"/>}{checked&&selected&&!correct&&<CircleX className="h-5 w-5 text-rose-700"/>}</div>
     <OptionContent option={option} format={format}/>
   </button>
   <button type="button" className="absolute right-3 top-3 grid min-h-11 min-w-11 place-items-center rounded-xl border border-teal-200 bg-white text-teal-800" aria-label={'Прослушать вариант '+label} onClick={()=>speakSelectedGerman(optionFeedbackText(option))}><Volume2 className="h-5 w-5"/></button>
 </div>
}
function OptionContent({option,format}:{option:LesenArchiveOption;format:LesenArchiveTeil2Task['format']}){if(format==='table'&&option.rows)return <div className="max-w-full overflow-x-auto"><table className="min-w-[520px] border-collapse text-xs"><tbody>{option.rows.map((r,i)=><tr key={i} className="border-b last:border-b-0">{r.map((c,j)=><td key={j} className="whitespace-nowrap px-2 py-2 first:pl-0"><HoverTranslateText speakOnActivate={false} text={c||'—'}/></td>)}</tr>)}</tbody></table></div>;return <div className="min-w-0">{option.url&&<p className="break-all text-xs font-semibold text-teal-700">{option.url}</p>}{option.title&&<h3 className="mt-1 text-base font-black"><HoverTranslateText speakOnActivate={false} text={option.title}/></h3>}{option.lines&&<div className="mt-2 space-y-1 text-sm leading-5 text-slate-700">{option.lines.map((x,i)=><p key={i}><HoverTranslateText speakOnActivate={false} text={x}/></p>)}</div>}</div>}

function Teil3({task,selected,checked,onSelect}:{task:LesenArchiveTeil3Task;selected:Bin|null;checked:boolean;onSelect:(a:Bin)=>void}){const expected:Bin=task.correct==='Richtig'?'richtig':'falsch';return <section className="mb-4 rounded-2xl border bg-white p-4 shadow-sm sm:p-5"><p className="text-xs font-black uppercase tracking-wider text-slate-400"><HoverTranslateText text={task.place}/></p>{task.heading&&<h2 className="mt-2 text-xl font-black"><HoverTranslateText text={task.heading}/></h2>}<div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-6">{task.text.map((x,i)=><p key={i}><HoverTranslateText text={x}/></p>)}</div><div className="mt-4 border-t pt-4 text-[16px] font-semibold leading-7"><HoverTranslateText text={task.statement}/></div><div className="mt-4 grid grid-cols-2 gap-3"><AB label="Richtig" value="richtig" selected={selected} disabled={checked} checked={checked} correctValue={expected} onSelect={v=>onSelect(v as Bin)}/><AB label="Falsch" value="falsch" selected={selected} disabled={checked} checked={checked} correctValue={expected} onSelect={v=>onSelect(v as Bin)}/></div></section>}
function AB({label,value,selected,disabled,checked,correctValue,onSelect}:{label:string;value:string;selected:string|null;disabled:boolean;checked:boolean;correctValue:string;onSelect:(v:string)=>void}){return <button type="button" disabled={disabled} onClick={()=>onSelect(value)} className={cn('min-h-12 rounded-xl border-2 px-3 py-2.5 font-bold transition',checked&&selected===value?(value===correctValue?'border-emerald-500 bg-emerald-50 text-emerald-900':'border-rose-500 bg-rose-50 text-rose-900'):selected===value?'border-blue-300 bg-blue-50 text-slate-900':'border-slate-200 bg-white text-slate-900')}>{label}</button>}
function SingleFeedback({part,task,choice,bin}:{part:Part;task:LesenArchiveTeil2Task|LesenArchiveTeil3Task;choice:Choice|null;bin:Bin|null}){
 const item=useMemo<ReadingFeedbackItem>(()=>part===2?(()=>{const t=task as LesenArchiveTeil2Task;return{context:`Situation: ${t.situation}\nA: ${optionFeedbackText(t.a)}\nB: ${optionFeedbackText(t.b)}`,prompt:'Wo finden Sie die passende Information?',correctAnswer:t.correct.toUpperCase(),sourceExplanation:t.why||''}})():(()=>{const t=task as LesenArchiveTeil3Task;return{context:[t.place,t.heading,...t.text].filter(Boolean).join('\n'),prompt:t.statement,correctAnswer:t.correct,sourceExplanation:t.why||''}})(),[part,task]);
 const[pair]=useReadingFeedback(part,[item],true);
 if(part===2){const t=task as LesenArchiveTeil2Task;return <Feedback correct={choice===t.correct} label={t.correct.toUpperCase()} why={t.why} pair={pair??null}/>}
 const t=task as LesenArchiveTeil3Task,expected:Bin=t.correct==='Richtig'?'richtig':'falsch';return <Feedback correct={bin===expected} label={t.correct} why={t.why} pair={pair??null}/>
}
function Feedback({correct,label,why,pair}:{correct:boolean;label:string;why:string;pair:ReadingFeedbackPair|null}){return <div className={cn('mb-4 rounded-2xl border p-4',correct?'border-emerald-200 bg-emerald-50':'border-rose-200 bg-rose-50')}><div className="flex gap-3">{correct?<CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700"/>:<CircleX className="h-5 w-5 shrink-0 text-rose-700"/>}<div><b>{correct?`Правильно: ${label}`:`Неверно. Правильный ответ: ${label}`}</b><ReadingWhy pair={pair} fallback={why||''}/></div></div></div>}
function Result({part,score,total,completed,onRetry,onBack}:{part:Part;score:number;total:number;completed:number;onRetry:()=>void;onBack:()=>void}){return <div className="animate-fade-in"><div className="rounded-3xl border bg-white p-7 text-center shadow-sm"><BookOpen className="mx-auto h-12 w-12 text-teal-700"/><h1 className="mt-4 text-2xl font-black">Lesen · Teil {part}</h1><p className="mt-3 text-5xl font-black">{score}/{total}</p><p className="mt-2 text-sm text-slate-500">Выполнено заданий: {completed}/50</p><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><button onClick={onRetry} className="min-h-11 rounded-xl border px-5 font-bold">Начать заново</button><button onClick={onBack} className="min-h-11 rounded-xl bg-slate-900 px-5 font-bold text-white">К списку заданий</button></div></div></div>}
function Back({onClick}:{onClick:()=>void}){return <button onClick={onClick} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white" aria-label="Назад"><ArrowLeft className="h-5 w-5"/></button>}
function instruction(part:Part){return part===1?'Lesen Sie den Text und die drei Aussagen. Wählen Sie bei jeder Aussage: Richtig oder Falsch.':part===2?'Lesen Sie die Situation. Wo finden Sie die passende Information? Wählen Sie a oder b.':'Lesen Sie den Hinweis und die Aussage. Wählen Sie: Richtig oder Falsch.'}
