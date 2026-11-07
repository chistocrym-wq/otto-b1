import { useEffect, useMemo, useState } from 'react';
import { useResetLearningStepScroll } from '@/preview/LearningStepScroll';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Lightbulb, SkipForward } from 'lucide-react';
import {
  loadLesenArchive,
  type LesenArchiveData,
  type LesenArchiveOption,
  type LesenArchiveTeil1Task,
  type LesenArchiveTeil2Task,
  type LesenArchiveTeil3Task,
} from '@/data/lesen/archiveData';
import { cn } from '@/lib/utils';
import { GermanTeachingText, TranslationButton, OttoTeachingBubble } from '@/preview/LearningTranslation';

import type { LearningPartLocation, PartNavigationCommand } from '@/preview/TeilNavigation';

type Part=1|2|3;
type PartPhase='notStarted'|'partIntro'|'detail'|'practice'|'done';
type Status='correct'|'wrong'|'skipped';

type PartProgress={phase:PartPhase;practiceIndex:number};
type LearningProgress={
  view:'intro'|'selector'|'part';
  part:Part;
  parts:Record<Part,PartProgress>;
  statuses:Record<string,Status>;
};

const STORAGE_PREFIX='otto-preview-lesen-learning-v2:';

function freshParts():Record<Part,PartProgress>{
  return{
    1:{phase:'notStarted',practiceIndex:0},
    2:{phase:'notStarted',practiceIndex:0},
    3:{phase:'notStarted',practiceIndex:0},
  };
}
function blankProgress():LearningProgress{return{view:'intro',part:1,parts:freshParts(),statuses:{}}}
function normalizePart(raw:any):PartProgress{
  const phase:PartPhase=['notStarted','partIntro','detail','practice','done'].includes(String(raw?.phase))?raw.phase:'notStarted';
  return{phase,practiceIndex:Math.max(0,Math.min(3,Number(raw?.practiceIndex)||0))};
}
function readProgress(userId?:string):LearningProgress{
  try{
    const raw=JSON.parse(localStorage.getItem(STORAGE_PREFIX+(userId||'local'))||'{}') as any;
    if(raw.parts){
      return{
        view:['intro','selector','part'].includes(String(raw.view))?raw.view:'intro',
        part:raw.part===2||raw.part===3?raw.part:1,
        parts:{1:normalizePart(raw.parts[1]),2:normalizePart(raw.parts[2]),3:normalizePart(raw.parts[3])},
        statuses:raw.statuses&&typeof raw.statuses==='object'?raw.statuses:{},
      };
    }
    const parts=freshParts();
    if(Array.isArray(raw.completedParts))for(const value of raw.completedParts){if(value===1||value===2||value===3){const completedPart=value as Part;parts[completedPart]={phase:'done',practiceIndex:3}}}
    const part:Part=raw.part===2||raw.part===3?raw.part:1;
    if(raw.phase==='partIntro')parts[part]={phase:'partIntro',practiceIndex:0};
    if(raw.phase==='detail')parts[part]={phase:'detail',practiceIndex:0};
    if(raw.phase==='practice')parts[part]={phase:'practice',practiceIndex:Math.max(0,Math.min(3,Number(raw.practiceIndex)||0))};
    if(raw.phase==='partDone')parts[part]={phase:'done',practiceIndex:3};
    if(raw.phase==='allDone')for(const value of [1,2,3] as Part[])parts[value]={phase:'done',practiceIndex:3};
    return{
      view:raw.phase==='intro'||!raw.phase?'intro':raw.phase==='allDone'?'selector':'part',
      part,
      parts,
      statuses:raw.statuses&&typeof raw.statuses==='object'?raw.statuses:{},
    };
  }catch{return blankProgress()}
}
function saveProgress(value:LearningProgress,userId?:string){try{localStorage.setItem(STORAGE_PREFIX+(userId||'local'),JSON.stringify(value))}catch{}}

function partTitle(part:Part){return part===1?'Письма и сообщения':part===2?'Два варианта: сайты / объявления':'Таблички и короткие Hinweise'}
function partIntroCopy(part:Part){
  if(part===1)return{
    title:'Теперь познакомимся с Teil 1',
    body:'Перед вами короткое письмо, e-mail, SMS или записка. Затем идут утверждения Richtig / Falsch.',
    strategy:'Не ищите одинаковые слова. Сравнивайте смысл: кто, когда, где, что делает, есть ли отрицание и совпадает ли информация с текстом.',
  };
  if(part===2)return{
    title:'Теперь Teil 2',
    body:'Перед вами ситуация и два варианта — например, два сайта или два объявления. Нужно выбрать, какой вариант подходит.',
    strategy:'Часто оба текста содержат похожие слова. Поэтому сначала точно поймите ситуацию, а затем сравнивайте по смыслу, времени, месту, цене и условиям.',
  };
  return{
    title:'Теперь Teil 3',
    body:'Перед вами короткая табличка, объявление или Hinweis и одно утверждение Richtig / Falsch.',
    strategy:'Ищите правило, время, запрет, разрешение или условие. Одно слово может быть знакомым, но решает весь смысл фразы.',
  };
}
function methodFor(part:Part){
  return part===1
    ? 'Утверждение → что именно проверяют → нужный фрагмент текста → сравнение смысла → Richtig/Falsch.'
    : part===2
      ? 'Ситуация → что человеку нужно → вариант A → вариант B → сравнение по смыслу → выбор.'
      : 'Утверждение → какое правило оно проверяет → нужная строка таблички → сравнение → Richtig/Falsch.';
}
function partStatusLabel(state:PartProgress){
  if(state.phase==='done')return'✓ Пройден';
  if(state.phase==='practice')return`Продолжить · ${state.practiceIndex+1} из 4`;
  if(state.phase==='detail')return'Продолжить · подробный пример';
  if(state.phase==='partIntro')return'Продолжить · объяснение';
  return'Начать';
}

export function LesenLearningStage({userId,onBack,onOpenTraining,reviewIntro=false,onFinishReview,onRequestReview,partNavigation,onLocationChange}:{userId?:string;onBack:()=>void;onOpenTraining:()=>void;reviewIntro?:boolean;onFinishReview?:()=>void;onRequestReview?:()=>void;partNavigation?:PartNavigationCommand;onLocationChange?:(location:LearningPartLocation)=>void}){
  const[data,setData]=useState<LesenArchiveData|null>(null);
  const[error,setError]=useState('');
  const initial=useMemo(()=>readProgress(userId),[userId]);
  const[progress,setProgress]=useState<LearningProgress>(initial);
  const[entryPart,setEntryPart]=useState<Part|null>(null);

  useEffect(()=>{let live=true;loadLesenArchive().then(value=>{if(live)setData(value)}).catch(e=>{if(live)setError(e instanceof Error?e.message:'Не удалось загрузить базу Lesen.')});return()=>{live=false}},[]);
  const persist=(next:LearningProgress)=>{setProgress(next);saveProgress(next,userId)};
  const current=progress.parts[progress.part];
  useResetLearningStepScroll(`lesen:${entryPart??'none'}:${progress.view}:${progress.part}:${current.phase}:${current.practiceIndex}`);
  // Selecting a Teil is only navigation; it must not mark exercises or reset saved work.
  useEffect(()=>{
    if(!partNavigation)return;
    setEntryPart(partNavigation.kind==='open'?partNavigation.part:null);
    setProgress(previous=>{
      const next:LearningProgress=partNavigation.kind==='restore'
        ?{...previous,view:partNavigation.view,part:partNavigation.part}
        :{...previous,view:'part',part:partNavigation.part};
      saveProgress(next,userId);
      return next;
    });
  },[partNavigation,userId]);
  useEffect(()=>{
    onLocationChange?.({module:'lesen',view:progress.view,part:progress.part});
  },[onLocationChange,progress.view,progress.part]);

  const updateCurrent=(patch:Partial<PartProgress>)=>persist({...progress,parts:{...progress.parts,[progress.part]:{...current,...patch}}});
  const openPart=(part:Part)=>{
    setEntryPart(null);
    const saved=progress.parts[part];
    const next=saved.phase==='notStarted'?{phase:'partIntro' as PartPhase,practiceIndex:0}:saved;
    persist({...progress,view:'part',part,parts:{...progress.parts,[part]:next}});
  };
  const backToSelector=()=>persist({...progress,view:'selector'});
  const setTaskStatus=(id:string,status:Status)=>persist({...progress,statuses:{...progress.statuses,[id]:status}});
  const finishPractice=()=>{
    if(current.practiceIndex<3){updateCurrent({practiceIndex:current.practiceIndex+1});return}
    updateCurrent({phase:'done',practiceIndex:3});
  };
  const repeatCurrent=()=>updateCurrent({phase:'partIntro',practiceIndex:0});
  const nextPart=()=>{if(progress.part<3)openPart((progress.part+1) as Part)};

  if(error)return <Card><BackButton onClick={onBack}/><h1 className="mt-5 text-2xl font-black">Lesen</h1><p className="mt-3 text-rose-700">{error}</p></Card>;
  if(!data)return <Card><p className="text-center font-bold text-slate-500">Загружаем существующие задания Lesen…</p></Card>;

  // Display the actual selected part's introductory page before resuming its saved exercises.
  // Merely opening this page leaves all Teil phases, scores and answers untouched.
  if(entryPart!==null&&!reviewIntro)return <section className="otto-teil-entry">
    <TopNav title={`Lesen · Teil ${entryPart}`} onBack={()=>{setEntryPart(null);backToSelector()}} onTraining={onOpenTraining}/>
    <Card>
      <p className="otto-kicker">TEIL {entryPart} · НАЧАЛО ОБУЧЕНИЯ</p>
      <h1 className="mt-2 text-3xl font-black text-slate-950">{partIntroCopy(entryPart).title}</h1>
      <p className="mt-4 text-lg leading-7 text-slate-700">{partIntroCopy(entryPart).body}</p>
      {progress.parts[entryPart].phase!=='notStarted'&&<p className="mt-4 rounded-xl bg-teal-50 p-3 text-sm font-bold text-teal-900">Сохранённые упражнения этого Teil не изменены. После продолжения вы вернётесь к прежнему месту.</p>}
      <button type="button" onClick={()=>openPart(entryPart)} className="mt-6 min-h-12 w-full rounded-xl bg-slate-900 px-5 font-bold text-white">
        {progress.parts[entryPart].phase==='notStarted'?'Начать выбранный Teil':'Продолжить с сохранённого места'} <ArrowRight className="ml-2 inline h-4 w-4"/>
      </button>
    </Card>
  </section>;

  if(progress.view==='intro'||reviewIntro)return <section>
    <TopNav title="Lesen · обучение" onBack={reviewIntro?(onFinishReview??onBack):onBack} onTraining={onOpenTraining}/>
    <Card>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_230px]">
        <div>
          <p className="otto-kicker">СНАЧАЛА РАЗБЕРЁМСЯ С ФОРМАТОМ</p>
          <h1 className="mt-2 text-3xl font-black">Как устроен Lesen</h1>
          <div className="mt-5 space-y-4">
            <OttoTeachingBubble scene="lesen"><p><b>Lesen</b> — это часть экзамена, где вы читаете короткие немецкие тексты и находите в них нужную информацию.</p><p className="mt-3">Не нужно переводить каждое слово. Нужно уметь быстро находить <b>ключевые слова и конкретные детали</b>: время, место, цену, дату, отрицание, запрет, действие.</p><p className="mt-3">На Goethe A1 Lesen — <b>3 Teil, всего 15 заданий, около 25 минут</b>.</p></OttoTeachingBubble>
            <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4"><b>Главная стратегия</b><p className="mt-2 leading-7 text-slate-700">Сначала поймите, что именно проверяет вопрос. Затем найдите нужный фрагмент и сравните смысл. Одно знакомое слово ещё не означает правильный ответ.</p></div>
          </div>
        </div>
        <aside className="rounded-2xl border bg-white p-4 shadow-sm"><BookOpen className="h-10 w-10 text-teal-700"/><b className="mt-3 block">Учебный режим</b><p className="mt-2 text-sm leading-6 text-slate-600">После введения вы сами выберете Teil. В подробном примере перевод будет сразу, а в практике перевод и подсказки останутся доступны.</p></aside>
      </div>
      <button onClick={()=>reviewIntro?onFinishReview?.():persist({...progress,view:'selector'})} className="mt-6 min-h-12 w-full rounded-xl bg-slate-900 px-5 font-black text-white">Продолжить <ArrowRight className="ml-2 inline h-4 w-4"/></button>
    </Card>
  </section>;

  if(progress.view==='selector')return <section>
    <TopNav title="Lesen · обучение" onBack={()=>persist({...progress,view:'intro'})} onModules={onBack} onTraining={onOpenTraining}/>
    <Card>
      <p className="otto-kicker">КАРТА МОДУЛЯ</p>
      <h1 className="mt-2 text-3xl font-black">Что хотите потренировать?</h1>
      <p className="mt-3 leading-7 text-slate-600">Можно выбрать любой Teil. Для каждого Teil отдельно сохраняется, закончен он или на какой практике вы остановились.</p><button onClick={()=>onRequestReview?.()} className="mt-4 min-h-10 rounded-xl border bg-white px-4 text-sm font-bold">Посмотреть общее объяснение ещё раз</button>
      <div className="mt-6 grid gap-3 lg:grid-cols-3">{([1,2,3] as Part[]).map(part=><button key={part} onClick={()=>openPart(part)} className="rounded-2xl border bg-white p-5 text-left shadow-sm hover:border-teal-300">
        <span className="text-xs font-black uppercase tracking-wider text-teal-700">Teil {part}</span>
        <b className="mt-2 block text-xl">{partTitle(part)}</b>
        <span className="mt-4 block text-sm font-black text-teal-800">{partStatusLabel(progress.parts[part])}</span>
      </button>)}</div>
    </Card>
  </section>;

  if(current.phase==='partIntro'){
    const copy=partIntroCopy(progress.part);
    return <section>
      <TopNav title={`Lesen · Teil ${progress.part}`} onBack={backToSelector} onPartSelect={backToSelector} onModules={onBack} onTraining={onOpenTraining}/>
      <Card>
        <p className="otto-kicker">СНАЧАЛА ОБЪЯСНЕНИЕ</p>
        <h1 className="mt-2 text-3xl font-black">{copy.title}</h1>
        <OttoTeachingBubble scene="lesen" className="mt-5"><p>{copy.body}</p><p className="mt-3">{copy.strategy}</p></OttoTeachingBubble>
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><Lightbulb className="h-5 w-5 text-amber-700"/><p className="mt-2 leading-7 text-slate-800"><b>Схема решения:</b> {methodFor(progress.part)}</p></div>
        <button onClick={()=>updateCurrent({phase:'detail'})} className="mt-6 min-h-12 w-full rounded-xl bg-slate-900 px-5 font-black text-white">Разобрать настоящий пример OTTO <ArrowRight className="ml-2 inline h-4 w-4"/></button>
      </Card>
    </section>;
  }

  if(current.phase==='done')return <section>
    <TopNav title={`Lesen · Teil ${progress.part}`} onBack={backToSelector} onTraining={onOpenTraining}/>
    <Card>
      <CheckCircle2 className="h-12 w-12 text-emerald-600"/>
      <h1 className="mt-3 text-3xl font-black">Lesen Teil {progress.part} пройден ✓</h1>
      <p className="mt-3 text-slate-600">Один настоящий пример разобран подробно и ещё четыре задания решены самостоятельно.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button onClick={backToSelector} className="min-h-12 rounded-xl border bg-white px-4 font-bold">Выбрать другой Teil</button>
        <button onClick={repeatCurrent} className="min-h-12 rounded-xl border bg-white px-4 font-bold">Повторить Teil {progress.part}</button>
        <button onClick={onOpenTraining} className="min-h-12 rounded-xl border border-teal-200 bg-teal-50 px-4 font-bold text-teal-900">К реальным заданиям</button>
        {progress.part<3&&<button onClick={nextPart} className="min-h-12 rounded-xl bg-slate-900 px-4 font-black text-white">Перейти к Teil {progress.part+1}</button>}
      </div>
    </Card>
  </section>;

  const five=getFive(data,progress.part);
  const task=current.phase==='detail'?five[0]:five[current.practiceIndex+1];
  const taskId=sourceId(progress.part,task,current.phase==='detail'?0:current.practiceIndex+1);

  const stepBack=()=>current.phase==='detail'?updateCurrent({phase:'partIntro'}):current.practiceIndex>0?updateCurrent({practiceIndex:current.practiceIndex-1}):updateCurrent({phase:'detail'});
  return <section>
    {current.phase==='detail'
      ? <DetailedReading part={progress.part} task={task} onBack={stepBack} onStatus={status=>setTaskStatus(taskId,status)} onDone={()=>updateCurrent({phase:'practice',practiceIndex:0})}/>
      : <PracticeReading key={taskId} part={progress.part} task={task} index={current.practiceIndex} onBack={stepBack} onStatus={status=>setTaskStatus(taskId,status)} onDone={finishPractice}/>}
  </section>;
}

function getFive(data:LesenArchiveData,part:Part){const tasks=part===1?data.teil1:part===2?data.teil2:data.teil3;return tasks.slice(0,5)}
function sourceId(part:Part,task:LesenArchiveTeil1Task|LesenArchiveTeil2Task|LesenArchiveTeil3Task,index:number){return part===1?`lesen-t1-${(task as LesenArchiveTeil1Task).id}`:`lesen-t${part}-${index+1}`}

function DetailedReading({part,task,onBack,onStatus,onDone}:{part:Part;task:LesenArchiveTeil1Task|LesenArchiveTeil2Task|LesenArchiveTeil3Task;onBack:()=>void;onStatus:(status:Status)=>void;onDone:()=>void}){
  const[answer,setAnswer]=useState<string|null>(null);
  const[checked,setChecked]=useState(false);
  const question=firstQuestion(part,task);
  const correct=correctFor(part,task,0);
  const explanation=explanationFor(part,task,0);
  const sourceText=sourceAsText(part,task);
  const evidence=evidenceFragment(sourceText,question);
  const keywords=keywordCandidates(question+' '+evidence);

  return <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_255px]">
    <Card>
      <p className="otto-kicker">ПОДРОБНЫЙ ПРИМЕР · ИЗ БАЗЫ OTTO</p>
      <h1 className="mt-2 text-3xl font-black">Разбираем Lesen Teil {part} как учебный урок</h1>

      <Step title="1. Смотрим исходный материал">
        <ReadingSource part={part} task={task} translationMode="inline"/>
      </Step>

      <Step title="2. Что именно спрашивают">
        <GermanTeachingText text={question} className="text-lg font-black leading-7"/>
        <OttoTeachingBubble scene="lesen" className="mt-4"><p>Сначала сформулируем для себя: какую конкретную информацию сейчас проверяет это утверждение или ситуация.</p></OttoTeachingBubble>
      </Step>

      <Step title="3. Ключевые слова">
        <div className="grid gap-2 sm:grid-cols-2">{keywords.map(word=><div key={word} className="rounded-xl border bg-white p-3"><GermanTeachingText text={word} className="font-black"/></div>)}</div>
      </Step>

      <Step title="4. Находим нужный фрагмент">
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4"><GermanTeachingText text={evidence||sourceText} className="font-bold leading-7"/></div>
      </Step>

      <Step title="5. Сравниваем текст ↔ утверждение">
        <div className="grid gap-3 lg:grid-cols-2"><div className="rounded-xl border bg-white p-4"><span className="text-xs font-black uppercase text-slate-400">В тексте</span><div className="mt-2"><GermanTeachingText text={evidence||sourceText} className="font-bold leading-7"/></div></div><div className="rounded-xl border bg-white p-4"><span className="text-xs font-black uppercase text-slate-400">Утверждение / ситуация</span><div className="mt-2"><GermanTeachingText text={question} className="font-bold leading-7"/></div></div></div>
        <OttoTeachingBubble scene="lesen" className="mt-4"><p><b>Сравнение:</b> {explanation}</p><p className="mt-2">Смотрим не на одно знакомое слово, а на совпадение смысла целиком.</p></OttoTeachingBubble>
      </Step>

      <Step title="6. Теперь ответьте сами">
        <AnswerButtons part={part} task={task} selected={answer} checked={checked} questionIndex={0} onSelect={setAnswer}/>
        {!checked?<div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]"><button disabled={answer===null} onClick={()=>{setChecked(true);onStatus(answer===correct?'correct':'wrong')}} className="min-h-12 rounded-xl bg-slate-900 px-5 font-black text-white disabled:opacity-40">Проверить</button><button onClick={()=>{setChecked(true);setAnswer(null);onStatus('skipped')}} className="min-h-12 rounded-xl border bg-white px-5 font-bold"><SkipForward className="mr-2 inline h-4 w-4"/>Пропустить</button></div>:answer===null?<div className="mt-5 rounded-2xl border bg-slate-50 p-4"><b>Пропущено</b><p className="mt-2 text-sm">Правильный ответ: <b>{correct}</b>.</p></div>:<FeedbackBox correct={answer===correct} correctLabel={correct} explanation={explanation}/>}
      </Step>

      {checked&&(answer===correct||answer===null)?<div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={onBack} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-white px-3 font-bold"><ArrowLeft className="h-4 w-4 shrink-0"/>Назад</button><button onClick={onDone} className="min-h-12 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-black text-white">Перейти к практике 1 из 4 <ArrowRight className="ml-1 inline h-4 w-4"/></button></div>:<div className="mt-6"><button type="button" onClick={onBack} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-white px-3 font-bold"><ArrowLeft className="h-4 w-4 shrink-0"/>Назад</button></div>}
    </Card>
    <aside className="rounded-2xl border bg-white p-4 shadow-sm lg:sticky lg:top-3"><BookOpen className="h-8 w-8 text-teal-700"/><b className="mt-3 block">Главное</b><p className="mt-2 text-sm leading-6 text-slate-600">Не переводите весь текст слово в слово. Ищите конкретный фрагмент, который отвечает на конкретный вопрос.</p></aside>
  </div>;
}

function PracticeReading({part,task,index,onBack,onStatus,onDone}:{part:Part;task:LesenArchiveTeil1Task|LesenArchiveTeil2Task|LesenArchiveTeil3Task;index:number;onBack:()=>void;onStatus:(status:Status)=>void;onDone:()=>void}){
  const questions=questionCount(part,task);
  const[answers,setAnswers]=useState<(string|null)[]>(()=>Array(questions).fill(null));
  const[checked,setChecked]=useState(false);
  const[showSource,setShowSource]=useState(true);
  const[showHint,setShowHint]=useState(index===0);
  const[showKeywords,setShowKeywords]=useState(false);
  const allAnswered=answers.every(Boolean);
  const translationParts=translationPartsFor(part,task);

  return <Card>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="otto-kicker">ПРАКТИКА TEIL {part} · {index+1} ИЗ 4</p><h1 className="mt-1 text-2xl font-black">{partTitle(part)}</h1></div><span className="rounded-full bg-teal-50 px-3 py-2 text-xs font-black text-teal-800">из базы OTTO</span></div>
    <p className="mt-3 text-sm leading-6 text-slate-600">{index===0?'Помощи ещё много: используйте перевод и подсказки.':index===1?'Сначала попробуйте сами, потом открывайте помощь.':index===2?'Подсказок меньше — ищите нужный фрагмент самостоятельно.':'Почти экзамен: сначала решите сами. Но помощь по-прежнему доступна.'}</p>

    <div className="mt-4 flex flex-wrap gap-2">
      <TranslationButton parts={translationParts} title="Перевод задания"/>
      <button onClick={()=>setShowHint(v=>!v)} className="min-h-10 rounded-xl border bg-white px-4 text-sm font-bold">Подсказка</button>
      <button onClick={()=>setShowKeywords(v=>!v)} className="min-h-10 rounded-xl border bg-white px-4 text-sm font-bold">Показать ключевые слова</button>
      <button onClick={()=>setShowSource(v=>!v)} className="min-h-10 rounded-xl border bg-white px-4 text-sm font-bold">{showSource?'Свернуть текст':'Посмотреть текст'}</button>
    </div>

    {showHint&&<div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6">{methodFor(part)}</div>}
    {showKeywords&&<div className="mt-3 grid gap-2 sm:grid-cols-2">{keywordCandidates(translationParts.join(' ')).slice(0,8).map(word=><div key={word} className="rounded-xl border bg-white p-3"><GermanTeachingText text={word} className="font-bold"/></div>)}</div>}
    {showSource&&<div className="mt-5"><ReadingSource part={part} task={task} translationMode="button"/></div>}

    <div className="mt-5 space-y-4">{Array.from({length:questions},(_,q)=><div key={q} className="rounded-2xl border bg-slate-50 p-4">
      <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><GermanTeachingText text={questionAt(part,task,q)} immediateTranslation={false} className="font-bold leading-7"/></div></div>
      <AnswerButtons part={part} task={task} selected={answers[q]} checked={checked} questionIndex={q} onSelect={value=>setAnswers(prev=>prev.map((v,i)=>i===q?value:v))}/>
      {checked&&answers[q]!==null&&<FeedbackBox compact correct={answers[q]===correctFor(part,task,q)} correctLabel={correctFor(part,task,q)} explanation={explanationFor(part,task,q)}/>}
      {checked&&answers[q]===null&&<div className="mt-3 rounded-xl border bg-white p-3 text-sm">Пропущено. Правильный ответ: <b>{correctFor(part,task,q)}</b>.</div>}
    </div>)}</div>

    {!checked?<div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]"><button disabled={!allAnswered} onClick={()=>{setChecked(true);const all=answers.every((value,q)=>value===correctFor(part,task,q));onStatus(all?'correct':'wrong')}} className="min-h-12 rounded-xl bg-slate-900 px-5 font-black text-white disabled:opacity-40">Проверить</button><button onClick={()=>{setAnswers(Array(questions).fill(null));setChecked(true);onStatus('skipped')}} className="min-h-12 rounded-xl border bg-white px-5 font-bold"><SkipForward className="mr-2 inline h-4 w-4"/>Пропустить</button></div>:<div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={onBack} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-white px-3 font-bold"><ArrowLeft className="h-4 w-4 shrink-0"/>Назад</button><button onClick={onDone} className="min-h-12 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-black text-white">{index===3?'Teil завершён':'Практика '+(index+2)+' из 4'} <ArrowRight className="ml-1 inline h-4 w-4"/></button></div>}
    {!checked&&<div className="mt-5"><button type="button" onClick={onBack} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-white px-3 font-bold"><ArrowLeft className="h-4 w-4 shrink-0"/>Назад</button></div>}
  </Card>;
}

function ReadingSource({part,task,translationMode}:{part:Part;task:LesenArchiveTeil1Task|LesenArchiveTeil2Task|LesenArchiveTeil3Task;translationMode:'inline'|'button'}){
  const immediate=translationMode==='inline';
  if(part===1){
    const t=task as LesenArchiveTeil1Task;
    return <div className="rounded-2xl border bg-[#fffefa] p-5"><p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">{t.format}</p><GermanTeachingText text={t.text} immediateTranslation={immediate} className="whitespace-pre-line text-[16px] leading-7 text-slate-900"/></div>;
  }
  if(part===2){
    const t=task as LesenArchiveTeil2Task;
    return <div className="space-y-3"><div className="rounded-2xl border bg-white p-4"><GermanTeachingText text={t.situation} immediateTranslation={immediate} className="text-[16px] font-bold leading-7"/></div><div className="grid gap-3 md:grid-cols-2"><SourceOption label="A" option={t.a} immediate={immediate}/><SourceOption label="B" option={t.b} immediate={immediate}/></div></div>;
  }
  const t=task as LesenArchiveTeil3Task;
  return <div className="rounded-2xl border bg-white p-5"><div className="space-y-3"><GermanTeachingText text={t.place} immediateTranslation={immediate} className="text-xs font-black uppercase tracking-wider text-slate-500"/>{t.heading&&<GermanTeachingText text={t.heading} immediateTranslation={immediate} className="text-xl font-black"/>}<div className="rounded-xl bg-slate-50 p-4">{t.text.map((line,i)=><div key={i} className="mt-2 first:mt-0"><GermanTeachingText text={line} immediateTranslation={immediate} className="leading-6"/></div>)}</div></div></div>;
}

function SourceOption({label,option,immediate}:{label:'A'|'B';option:LesenArchiveOption;immediate:boolean}){
  const parts=[option.url||'',option.title||'',...(option.lines||[]),...(option.rows||[]).flat()].filter(Boolean);
  return <div className="min-w-0 rounded-2xl border bg-white p-4"><span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-sm font-black text-white">{label}</span>{parts.map((part,i)=><div key={i} className="mt-2"><GermanTeachingText text={part} immediateTranslation={immediate} className={i===0&&option.title?'font-black':'text-sm leading-6'}/></div>)}</div>;
}

function questionCount(part:Part,task:LesenArchiveTeil1Task|LesenArchiveTeil2Task|LesenArchiveTeil3Task){return part===1?(task as LesenArchiveTeil1Task).statements.length:1}
function firstQuestion(part:Part,task:LesenArchiveTeil1Task|LesenArchiveTeil2Task|LesenArchiveTeil3Task){return questionAt(part,task,0)}
function questionAt(part:Part,task:LesenArchiveTeil1Task|LesenArchiveTeil2Task|LesenArchiveTeil3Task,index:number){
  if(part===1)return (task as LesenArchiveTeil1Task).statements[index]?.statement||'';
  if(part===2)return (task as LesenArchiveTeil2Task).situation;
  return (task as LesenArchiveTeil3Task).statement;
}
function correctFor(part:Part,task:LesenArchiveTeil1Task|LesenArchiveTeil2Task|LesenArchiveTeil3Task,index:number){
  if(part===1)return (task as LesenArchiveTeil1Task).statements[index]?.correct?'Richtig':'Falsch';
  if(part===2)return (task as LesenArchiveTeil2Task).correct.toUpperCase();
  return (task as LesenArchiveTeil3Task).correct;
}
function explanationFor(part:Part,task:LesenArchiveTeil1Task|LesenArchiveTeil2Task|LesenArchiveTeil3Task,index:number){
  if(part===1)return (task as LesenArchiveTeil1Task).statements[index]?.explanation||'Сравните утверждение с исходным текстом буквально.';
  if(part===2)return (task as LesenArchiveTeil2Task).why||'Сравните нужную информацию с вариантами A и B.';
  return (task as LesenArchiveTeil3Task).why||'Сравните утверждение с правилом на табличке.';
}
function sourceAsText(part:Part,task:LesenArchiveTeil1Task|LesenArchiveTeil2Task|LesenArchiveTeil3Task){
  if(part===1)return (task as LesenArchiveTeil1Task).text;
  if(part===2){
    const t=task as LesenArchiveTeil2Task;
    return [t.situation,...optionParts(t.a),...optionParts(t.b)].join(' ');
  }
  const t=task as LesenArchiveTeil3Task;return [t.place,t.heading,...t.text].filter(Boolean).join(' ');
}
function optionParts(option:LesenArchiveOption){return[option.url||'',option.title||'',...(option.lines||[]),...(option.rows||[]).flat()].filter(Boolean)}
function translationPartsFor(part:Part,task:LesenArchiveTeil1Task|LesenArchiveTeil2Task|LesenArchiveTeil3Task){
  const parts=[sourceAsText(part,task)];
  const count=questionCount(part,task);
  for(let i=0;i<count;i++)parts.push(questionAt(part,task,i));
  return parts.filter(Boolean);
}
function evidenceFragment(source:string,question:string){
  const pieces=source.split(/(?<=[.!?])\s+|\n+/u).map(v=>v.trim()).filter(Boolean);
  const qTokens=new Set(question.toLocaleLowerCase('de-DE').match(/[\p{L}]{4,}/gu)||[]);
  let best=pieces[0]||source,bestScore=-1;
  for(const piece of pieces){const words=piece.toLocaleLowerCase('de-DE').match(/[\p{L}]{4,}/gu)||[];const score=words.filter(w=>qTokens.has(w)).length;if(score>bestScore){best=piece;bestScore=score}}
  return best||source;
}
function keywordCandidates(text:string){
  const stop=new Set(['diese','dieser','dieses','einen','einem','einer','eine','eines','nicht','oder','aber','und','sind','sein','haben','wird','werden','dass','wenn','dann','hier','dort','heute','morgen','bitte','kann','können','muss','müssen','möchte','möchten','richtig','falsch']);
  const words=(text.match(/[A-Za-zÄÖÜäöüß]{4,}/g)||[]).filter(word=>!stop.has(word.toLocaleLowerCase('de-DE')));
  return [...new Set(words)].slice(0,8);
}

function AnswerButtons({part,task,selected,checked,questionIndex,onSelect}:{part:Part;task:LesenArchiveTeil1Task|LesenArchiveTeil2Task|LesenArchiveTeil3Task;selected:string|null;checked:boolean;questionIndex:number;onSelect:(v:string)=>void}){
  const choices=part===2?['A','B']:['Richtig','Falsch'];const correct=correctFor(part,task,questionIndex);
  return <div className="mt-4 grid grid-cols-2 gap-3">{choices.map(value=><button key={value} type="button" disabled={checked} onClick={()=>onSelect(value)} className={cn('min-h-12 rounded-xl border-2 px-4 font-bold',checked&&selected===value?(value===correct?'border-emerald-500 bg-emerald-50 text-emerald-900':'border-rose-500 bg-rose-50 text-rose-900'):selected===value?'border-sky-400 bg-sky-50':'border-slate-200 bg-white')}><span className="block">{value}</span>{part!==2&&<span className="mt-1 block text-xs font-medium text-slate-500">{value==='Richtig'?'верно':'неверно'}</span>}</button>)}</div>;
}
function FeedbackBox({correct,correctLabel,explanation,compact=false}:{correct:boolean;correctLabel:string;explanation:string;compact?:boolean}){return <div className={cn(compact?'mt-3':'mt-5','rounded-2xl border p-4',correct?'border-emerald-200 bg-emerald-50':'border-amber-200 bg-amber-50')}><b>{correct?'Правильно ✓':'OTTO: сравним конкретный фрагмент'}</b><p className="mt-1 text-sm leading-6 text-slate-700">Правильный ответ по исходному заданию: <b>{correctLabel}</b>.</p><p className="mt-2 text-sm leading-6 text-slate-700">{explanation}</p></div>}

function Step({title,children}:{title:string;children:React.ReactNode}){return <section className="mt-5 rounded-2xl border bg-slate-50 p-4"><h2 className="text-lg font-black">{title}</h2><div className="mt-3">{children}</div></section>}
function TopNav({title,onBack,onTraining}:{title:string;onBack:()=>void;onTraining:()=>void;onPartSelect?:()=>void;onModules?:()=>void}){
  return <div className="mb-4 min-w-0">
    <div className="grid grid-cols-2 gap-3">
      <button type="button" onClick={onBack} className="flex min-h-12 items-center justify-center gap-1 rounded-xl border bg-white px-2 text-center text-sm font-bold"><ArrowLeft className="h-4 w-4 shrink-0"/>Назад</button>
      <button type="button" onClick={onTraining} className="min-h-12 rounded-xl border border-teal-200 bg-teal-50 px-2 py-2 text-center text-sm font-bold leading-tight text-teal-900">К реальным заданиям</button>
    </div>
    <h2 className="mt-3 text-[clamp(19px,5vw,22px)] font-black leading-tight text-slate-950">{title}</h2>
  </div>;
}

function BackButton({onClick}:{onClick:()=>void}){return <button onClick={onClick} className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 font-bold"><ArrowLeft className="h-4 w-4"/>Назад</button>}
function Card({children}:{children:React.ReactNode}){return <section className="rounded-[28px] border bg-white p-5 shadow-sm sm:p-7">{children}</section>}
