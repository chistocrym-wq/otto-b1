import { useEffect, useMemo, useRef, useState } from 'react';
import { useResetLearningStepScroll } from '@/preview/LearningStepScroll';
import { ArrowLeft, ArrowRight, CheckCircle2, Headphones, Lightbulb, SkipForward } from 'lucide-react';
import { getHoerenLearningTasks } from '@/data/hoerenTeilMap';
import type { HorenTask } from '@/data/listening';
import { cn } from '@/lib/utils';
import { GermanTeachingText, TranslationButton, OttoTeachingBubble } from '@/preview/LearningTranslation';

import type { LearningPartLocation, PartNavigationCommand } from '@/preview/TeilNavigation';

type Part=1|2|3;
type PartPhase='notStarted'|'partIntro'|'detail'|'practice'|'done';
type Answer=number|boolean|null;
type Status='correct'|'wrong'|'skipped';

type PartProgress={phase:PartPhase;practiceIndex:number};
type LearningProgress={
  view:'intro'|'selector'|'part';
  part:Part;
  parts:Record<Part,PartProgress>;
  statuses:Record<string,Status>;
};

type VerifiedFragment={text:string;translation:string;start:number;end:number;speaker?:string};

const STORAGE_PREFIX='otto-preview-hoeren-learning-v2:';

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

function partTitle(part:Part){
  return part===1?'Короткие разговоры':part===2?'Объявления · Richtig/Falsch':'Телефонные и короткие сообщения';
}
function partIntroCopy(part:Part){
  if(part===1)return{
    title:'Что происходит в Teil 1',
    body:'Вы слышите короткие разговоры и выбираете один из трёх вариантов. На экзамене запись звучит два раза.',
    strategy:'В первый раз поймайте общую ситуацию. Во второй — проверьте конкретную деталь: время, место, цвет, число, причину или действие.',
  };
  if(part===2)return{
    title:'Что происходит в Teil 2',
    body:'Вы слышите короткое объявление или сообщение и решаете: утверждение Richtig или Falsch. На экзамене запись звучит один раз.',
    strategy:'Поэтому сначала внимательно прочитайте утверждение. Ещё до звука вы должны понимать, какой факт нужно услышать.',
  };
  return{
    title:'Что происходит в Teil 3',
    body:'Вы слышите короткое личное сообщение или телефонную запись и выбираете один из трёх вариантов. На экзамене запись звучит два раза.',
    strategy:'Не пытайтесь понять всё. Сначала выясните, что спрашивают, а затем вылавливайте только нужную информацию из сообщения.',
  };
}
function partStatusLabel(state:PartProgress){
  if(state.phase==='done')return'✓ Пройден';
  if(state.phase==='practice')return`Продолжить · ${state.practiceIndex+1} из 4`;
  if(state.phase==='detail')return'Продолжить · подробный пример';
  if(state.phase==='partIntro')return'Продолжить · объяснение';
  return'Начать';
}
function targetFor(task:HorenTask){
  const q=task.prompt.toLocaleLowerCase('de-DE');
  if(q.startsWith('wann'))return'время';
  if(q.startsWith('wo ')||q.startsWith('woher')||q.startsWith('von welchem'))return'место или направление';
  if(q.startsWith('welche')||q.startsWith('welches'))return'конкретный вариант';
  if(q.startsWith('warum'))return'причину';
  if(q.startsWith('wen'))return'человека';
  if(q.startsWith('was'))return'предмет или действие';
  return'конкретную информацию из вопроса';
}

const DETAIL_WORDS:Record<string,string[]>={
  'horen-002':['Farbe','möchte','Rot'],
  'horen-008':['Kilo','Äpfel','kostet','Euro'],
  'horen-001':['Wann','treffen','sechs Uhr'],
};

const DETAIL_FRAGMENTS:Record<string,VerifiedFragment[]>={
  'horen-002':[
    {speaker:'Verkäuferin',text:'Guten Tag.',translation:'Здравствуйте.',start:13.20,end:14.45},
    {speaker:'Verkäuferin',text:'Kann ich Ihnen helfen?',translation:'Я могу вам помочь?',start:14.68,end:15.65},
    {speaker:'Mann',text:'Ja, ich suche ein T-Shirt für meine Tochter.',translation:'Да, я ищу футболку для моей дочери.',start:16.45,end:18.85},
    {speaker:'Verkäuferin',text:'Welche Größe braucht sie?',translation:'Какой размер ей нужен?',start:19.50,end:21.15},
    {speaker:'Mann',text:'Größe S.',translation:'Размер S.',start:21.60,end:22.50},
    {speaker:'Mann',text:'Haben Sie das T-Shirt auch in Rot?',translation:'У вас есть такая футболка в красном цвете?',start:22.90,end:24.65},
    {speaker:'Verkäuferin',text:'Ja, hier ist ein rotes T-Shirt.',translation:'Да, вот красная футболка.',start:25.18,end:27.55},
  ],
  'horen-008':[
    {speaker:'Ansage',text:'Liebe Kunden, heute haben wir frische Äpfel im Angebot.',translation:'Уважаемые покупатели, сегодня у нас свежие яблоки по акции.',start:10.42,end:14.30},
    {text:'Ein Kilo kostet nur zwei Euro.',translation:'Один килограмм стоит всего два евро.',start:14.68,end:17.50},
    {text:'Die Äpfel finden Sie gleich am Eingang.',translation:'Яблоки вы найдёте прямо у входа.',start:18.02,end:20.68},
  ],
  'horen-001':[
    {text:'Hallo Anna, hier ist Julia.',translation:'Привет, Анна, это Юлия.',start:10.05,end:12.65},
    {text:'Ich komme heute etwas später.',translation:'Я сегодня приду немного позже.',start:13.00,end:15.00},
    {text:'Der Bus hat Verspätung.',translation:'Автобус опаздывает.',start:15.45,end:17.20},
    {text:'Wir treffen uns um sechs Uhr vor dem Kino.',translation:'Мы встречаемся в шесть часов перед кинотеатром.',start:17.45,end:20.50},
    {text:'Bis später.',translation:'До встречи.',start:20.62,end:21.55},
  ],
};

const DETAIL_EVIDENCE:Record<string,VerifiedFragment>={
  'horen-002':{text:'Haben Sie das T-Shirt auch in Rot? Ja, hier ist ein rotes T-Shirt.',translation:'У вас есть такая футболка в красном цвете? Да, вот красная футболка.',start:22.90,end:27.55},
  'horen-008':{text:'Ein Kilo kostet nur zwei Euro.',translation:'Один килограмм стоит всего два евро.',start:14.68,end:17.50},
  'horen-001':{text:'Wir treffen uns um sechs Uhr vor dem Kino.',translation:'Мы встречаемся в шесть часов перед кинотеатром.',start:17.45,end:20.50},
};

export function HoerenLearningStage({userId,onBack,onOpenTraining,reviewIntro=false,onFinishReview,onRequestReview,partNavigation,onLocationChange}:{userId?:string;onBack:()=>void;onOpenTraining:()=>void;reviewIntro?:boolean;onFinishReview?:()=>void;onRequestReview?:()=>void;partNavigation?:PartNavigationCommand;onLocationChange?:(location:LearningPartLocation)=>void}){
  const initial=useMemo(()=>readProgress(userId),[userId]);
  const[progress,setProgress]=useState<LearningProgress>(initial);
  const[entryPart,setEntryPart]=useState<Part|null>(null);
  const persist=(next:LearningProgress)=>{setProgress(next);saveProgress(next,userId)};
  const current=progress.parts[progress.part];
  useResetLearningStepScroll(`horen:${entryPart??'none'}:${progress.view}:${progress.part}:${current.phase}:${current.practiceIndex}`);
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
    onLocationChange?.({module:'horen',view:progress.view,part:progress.part});
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

  // Display the actual selected part's introductory page before resuming its saved exercises.
  // Merely opening this page leaves all Teil phases, scores and answers untouched.
  if(entryPart!==null&&!reviewIntro)return <section className="otto-teil-entry">
    <TopNav title={`Hören · Teil ${entryPart}`} onBack={()=>{setEntryPart(null);backToSelector()}} onTraining={onOpenTraining}/>
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
    <TopNav title="Hören · обучение" onBack={reviewIntro?(onFinishReview??onBack):onBack} onTraining={onOpenTraining}/>
    <Card>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div>
          <p className="otto-kicker">СНАЧАЛА РАЗБЕРЁМСЯ С ФОРМАТОМ</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Как устроен Hören</h1>
          <div className="mt-5 space-y-4">
            <OttoTeachingBubble scene="horen"><p><b>Hören</b> — это часть экзамена, где нужно слушать короткие немецкие записи и находить в них конкретную информацию.</p><p className="mt-3">Вам не нужно понимать каждое слово. Обычно проверяют <b>время, место, цену, номер, дату, действие, направление, причину</b> и похожие детали.</p><p className="mt-3">Иногда в записи специально звучат несколько похожих вариантов. Поэтому важно <b>дослушать до конца</b>, а не нажимать ответ после первого знакомого слова.</p></OttoTeachingBubble>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="font-black text-sky-950">На Goethe A1 Hören — 3 Teil, примерно 20 минут.</p>
              <p className="mt-3 leading-7 text-slate-700">В <b>Teil 1 и Teil 3</b> запись звучит дважды: в первый раз поймайте общую ситуацию, во второй — проверьте конкретную информацию.</p>
              <p className="mt-3 leading-7 text-slate-700">Во <b>Teil 2</b> запись звучит один раз, поэтому сначала внимательно прочитайте задание и поймите, что именно нужно услышать.</p>
            </div>
          </div>
        </div>
        <aside className="rounded-2xl border bg-white p-4 shadow-sm"><Headphones className="h-10 w-10 text-sky-700"/><b className="mt-3 block">Главная мысль</b><p className="mt-2 text-sm leading-6 text-slate-600">Не переводим весь звук. Сначала понимаем вопрос — потом слушаем ради конкретного ответа.</p></aside>
      </div>
      <button onClick={()=>reviewIntro?onFinishReview?.():persist({...progress,view:'selector'})} className="mt-6 min-h-12 w-full rounded-xl bg-slate-900 px-5 font-black text-white">Продолжить <ArrowRight className="ml-2 inline h-4 w-4"/></button>
    </Card>
  </section>;

  if(progress.view==='selector')return <section>
    <TopNav title="Hören · обучение" onBack={()=>persist({...progress,view:'intro'})} onModules={onBack} onTraining={onOpenTraining}/>
    <Card>
      <p className="otto-kicker">КАРТА МОДУЛЯ</p>
      <h1 className="mt-2 text-3xl font-black">Что хотите потренировать?</h1>
      <p className="mt-3 leading-7 text-slate-600">Выберите любой Teil. Уже пройденные части и место, где вы остановились, сохраняются отдельно.</p><button onClick={()=>onRequestReview?.()} className="mt-4 min-h-10 rounded-xl border bg-white px-4 text-sm font-bold">Посмотреть общее объяснение ещё раз</button>
      <div className="mt-6 grid gap-3 lg:grid-cols-3">{([1,2,3] as Part[]).map(part=><button key={part} onClick={()=>openPart(part)} className="rounded-2xl border bg-white p-5 text-left shadow-sm hover:border-sky-300">
        <span className="text-xs font-black uppercase tracking-wider text-sky-700">Teil {part}</span>
        <b className="mt-2 block text-xl">{partTitle(part)}</b>
        <span className="mt-4 block text-sm font-black text-sky-800">{partStatusLabel(progress.parts[part])}</span>
      </button>)}</div>
    </Card>
  </section>;

  if(current.phase==='partIntro'){
    const copy=partIntroCopy(progress.part);
    return <section>
      <TopNav title={`Hören · Teil ${progress.part}`} onBack={backToSelector} onPartSelect={backToSelector} onModules={onBack} onTraining={onOpenTraining}/>
      <Card>
        <p className="otto-kicker">ПЕРЕД ЗАДАНИЕМ</p>
        <h1 className="mt-2 text-3xl font-black">{copy.title}</h1>
        <OttoTeachingBubble scene="horen" className="mt-5"><p>{copy.body}</p><p className="mt-3">{copy.strategy}</p></OttoTeachingBubble>
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><Lightbulb className="h-5 w-5 text-amber-700"/><p className="mt-2 leading-7 text-slate-800"><b>Сейчас мы разберём одно настоящее задание OTTO вместе.</b> Сначала инструкция и вопрос, потом ключевые слова, затем исходный MP3, разбор фрагментов и только после этого ваш ответ.</p></div>
        <button onClick={()=>updateCurrent({phase:'detail'})} className="mt-6 min-h-12 w-full rounded-xl bg-slate-900 px-5 font-black text-white">Разобрать пример <ArrowRight className="ml-2 inline h-4 w-4"/></button>
      </Card>
    </section>;
  }

  if(current.phase==='done')return <section>
    <TopNav title={`Hören · Teil ${progress.part}`} onBack={backToSelector} onTraining={onOpenTraining}/>
    <Card>
      <CheckCircle2 className="h-12 w-12 text-emerald-600"/>
      <h1 className="mt-3 text-3xl font-black">Hören Teil {progress.part} пройден ✓</h1>
      <p className="mt-3 text-slate-600">Один пример разобран подробно, ещё четыре задания вы выполнили сами с доступной помощью OTTO.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button onClick={backToSelector} className="min-h-12 rounded-xl border bg-white px-4 font-bold">Выбрать другой Teil</button>
        <button onClick={repeatCurrent} className="min-h-12 rounded-xl border bg-white px-4 font-bold">Повторить Teil {progress.part}</button>
        <button onClick={onOpenTraining} className="min-h-12 rounded-xl border border-sky-200 bg-sky-50 px-4 font-bold text-sky-900">К реальным заданиям</button>
        {progress.part<3&&<button onClick={nextPart} className="min-h-12 rounded-xl bg-slate-900 px-4 font-black text-white">Перейти к Teil {progress.part+1}</button>}
      </div>
    </Card>
  </section>;

  const five=getHoerenLearningTasks(progress.part);
  const task=current.phase==='detail'?five[0]:five[current.practiceIndex+1];
  if(!task)return <Card><p className="text-rose-700">Для этого Teil не хватает подтверждённых исходных заданий.</p></Card>;

  const stepBack=()=>current.phase==='detail'?updateCurrent({phase:'partIntro'}):current.practiceIndex>0?updateCurrent({practiceIndex:current.practiceIndex-1}):updateCurrent({phase:'detail'});
  return <section>
    {current.phase==='detail'
      ? <DetailedHoeren part={progress.part} task={task} onBack={stepBack} onStatus={status=>setTaskStatus(task.id,status)} onDone={()=>updateCurrent({phase:'practice',practiceIndex:0})}/>
      : <PracticeHoeren key={task.id} part={progress.part} task={task} index={current.practiceIndex} onBack={stepBack} onStatus={status=>setTaskStatus(task.id,status)} onDone={finishPractice}/>}
  </section>;
}

function DetailedHoeren({part,task,onBack,onStatus,onDone}:{part:Part;task:HorenTask;onBack:()=>void;onStatus:(status:Status)=>void;onDone:()=>void}){
  const[selected,setSelected]=useState<Answer>(null);
  const[checked,setChecked]=useState(false);
  const audioRef=useRef<HTMLAudioElement|null>(null);
  const fragments=DETAIL_FRAGMENTS[task.id]||[];
  const evidence=DETAIL_EVIDENCE[task.id];
  const words=DETAIL_WORDS[task.id]||[];
  const correct=isCorrect(task,selected);

  return <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_250px]">
    <Card>
      <p className="otto-kicker">ПОДРОБНЫЙ ПРИМЕР · {task.id}</p>
      <h1 className="mt-2 text-3xl font-black">Разбираем задание шаг за шагом</h1>

      <Step title="1. Сначала инструкция">
        <GermanTeachingText text={task.instruction} className="text-[17px] font-bold leading-7"/>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">{['Sie hören','kurzen Text','Lesen Sie zuerst','Aufgabe','Hören Sie dann'].map(word=><div key={word} className="rounded-xl border bg-white p-3"><GermanTeachingText text={word} className="font-black"/></div>)}</div>
      </Step>

      <Step title="2. Что спрашивают">
        <GermanTeachingText text={task.prompt} audio={false} className="text-xl font-black leading-8"/>
        {task.type==='multiple-choice'&&<div className="mt-4 grid gap-3">{task.options.map((option,index)=><div key={option} className="rounded-xl border bg-white p-3"><span className="mr-2 font-black text-sky-700">{String.fromCharCode(65+index)}.</span><GermanTeachingText text={option} className="inline font-bold"/></div>)}</div>}
        {task.type==='true-false'&&<div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border bg-white p-3"><GermanTeachingText text="Richtig" className="font-black"/></div><div className="rounded-xl border bg-white p-3"><GermanTeachingText text="Falsch" className="font-black"/></div></div>}
      </Step>

      <Step title="3. Сначала познакомимся с нужными словами">
        <p className="mb-3 text-sm leading-6 text-slate-600">Здесь звук относится к отдельному слову или короткой учебной единице.</p>
        <div className="grid gap-2 sm:grid-cols-2">{words.map(word=><div key={word} className="rounded-xl border border-teal-200 bg-teal-50 p-3"><GermanTeachingText text={word} className="font-black"/></div>)}</div>
      </Step>

      <Step title="4. Теперь послушаем вопрос целиком">
        <p className="mb-3 text-sm leading-6 text-slate-600">Одна кнопка 🔊 проигрывает всю фразу целиком.</p>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4"><GermanTeachingText text={task.prompt} className="text-lg font-black leading-7"/></div>
        <OttoTeachingBubble scene="horen" className="mt-4"><p>Мы не пытаемся понять всё подряд. Сейчас ищем <b>{targetFor(task)}</b>, потому что именно это проверяет вопрос.</p></OttoTeachingBubble>
      </Step>

      <Step title="5. Слушаем исходный MP3">
        <TaskMedia task={task} audioRef={audioRef}/>
      </Step>

      <Step title="6. Разбираем запись по смысловым местам">
        <p className="mb-4 text-sm leading-6 text-slate-600">Каждая кнопка ниже проигрывает вручную проверенный временной диапазон из этого же исходного MP3. TTS здесь не используется.</p>
        <div className="space-y-4">{fragments.map((fragment,index)=><div key={fragment.text+index} className="rounded-2xl border bg-slate-50 p-4">
          <button type="button" onClick={()=>playRange(audioRef.current,fragment.start,fragment.end)} className="min-h-10 rounded-xl border bg-white px-4 text-sm font-bold text-sky-800">▶️ Послушать этот фрагмент</button>
          {fragment.speaker&&<p className="mt-3 text-xs font-black uppercase tracking-wider text-slate-400">{fragment.speaker}</p>}
          <div className="mt-2 font-bold leading-7 text-slate-900">{fragment.text}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">🇷🇺 {fragment.translation}</p>
        </div>)}</div>
      </Step>

      <Step title="7. Теперь ответьте сами">
        <AnswerButtons task={task} selected={selected} checked={checked} onSelect={setSelected}/>
        {!checked?<div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]"><button disabled={selected===null} onClick={()=>{setChecked(true);onStatus(isCorrect(task,selected)?'correct':'wrong')}} className="min-h-12 rounded-xl bg-slate-900 px-5 font-black text-white disabled:opacity-40">Проверить</button><button onClick={()=>{onStatus('skipped');setChecked(true);setSelected(null)}} className="min-h-12 rounded-xl border bg-white px-5 font-bold"><SkipForward className="mr-2 inline h-4 w-4"/>Пропустить</button></div>:correct?<div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><b>Правильно ✓</b><p className="mt-2 text-sm leading-6 text-slate-700">Вы нашли именно ту информацию, которую проверял вопрос.</p></div>:selected===null?<div className="mt-5 rounded-2xl border bg-slate-50 p-4"><b>Пропущено</b><p className="mt-2 text-sm">Правильный ответ: <b>{correctLabel(task)}</b>.</p></div>:evidence?<div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <b>OTTO: вернёмся к нужному моменту.</b>
          <button type="button" onClick={()=>playRange(audioRef.current,evidence.start,evidence.end)} className="mt-3 block min-h-10 rounded-xl border border-amber-300 bg-white px-4 font-bold">▶️ Послушать ещё раз этот фрагмент MP3</button>
          <div className="mt-3 font-bold leading-7 text-slate-900">{evidence.text}</div>
          <p className="mt-2 text-sm leading-6 text-slate-700">🇷🇺 {evidence.translation}</p>
          <p className="mt-3 text-sm leading-6 text-slate-700">Здесь прозвучала информация, которая прямо отвечает на вопрос. В исходном задании правильный вариант — <b>{correctLabel(task)}</b>. Послушайте фрагмент ещё раз и попробуйте выбрать его самостоятельно.</p>
          <button onClick={()=>{setChecked(false);setSelected(null)}} className="mt-3 min-h-10 rounded-xl border bg-white px-4 font-bold">Попробовать снова</button>
        </div>:null}
      </Step>

      {checked&&(correct||selected===null)?<div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={onBack} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-white px-3 font-bold"><ArrowLeft className="h-4 w-4 shrink-0"/>Назад</button><button onClick={onDone} className="min-h-12 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-black text-white">Перейти к практике 1 из 4 <ArrowRight className="ml-1 inline h-4 w-4"/></button></div>:<div className="mt-6"><button type="button" onClick={onBack} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-white px-3 font-bold"><ArrowLeft className="h-4 w-4 shrink-0"/>Назад</button></div>}
    </Card>
    <aside className="rounded-2xl border bg-white p-4 shadow-sm lg:sticky lg:top-3"><Headphones className="h-8 w-8 text-sky-700"/><b className="mt-3 block">Запомните</b><p className="mt-2 text-sm leading-6 text-slate-600">Сначала можно выучить несколько нужных слов, но затем вопрос и фразы слушаем целиком.</p></aside>
  </div>;
}

function PracticeHoeren({part,task,index,onBack,onStatus,onDone}:{part:Part;task:HorenTask;index:number;onBack:()=>void;onStatus:(status:Status)=>void;onDone:()=>void}){
  const[selected,setSelected]=useState<Answer>(null);
  const[checked,setChecked]=useState(false);
  const[showHint,setShowHint]=useState(index===0);
  const[showQuestionHelp,setShowQuestionHelp]=useState(false);
  const[showAudioHelp,setShowAudioHelp]=useState(false);
  const audioRef=useRef<HTMLAudioElement|null>(null);

  return <Card>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="otto-kicker">ПРАКТИКА TEIL {part} · {index+1} ИЗ 4</p><h1 className="mt-1 text-2xl font-black">{task.title}</h1></div><span className="rounded-full bg-sky-50 px-3 py-2 text-xs font-black text-sky-800">{task.id}</span></div>
    <p className="mt-3 text-sm leading-6 text-slate-600">{index===0?'Помощи ещё много. Попробуйте сами, но используйте кнопки OTTO.':index===1?'Подсказок меньше — сначала попробуйте сами.':index===2?'Сначала решите самостоятельно, помощь открывайте только при необходимости.':'Почти как на экзамене: сначала слушаем и отвечаем сами. После ошибки OTTO всё равно поможет.'}</p>

    <div className="mt-5 rounded-2xl border bg-slate-50 p-4">
      <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><GermanTeachingText text={task.instruction} immediateTranslation={false} className="font-bold leading-7"/></div></div>
      <div className="mt-4"><GermanTeachingText text={task.prompt} immediateTranslation={false} className="text-lg font-black"/></div>
      {task.type==='multiple-choice'&&<div className="mt-4 space-y-2">{task.options.map((option,i)=><div key={option} className="flex items-center gap-2 rounded-xl bg-white p-3"><span className="font-black text-sky-700">{String.fromCharCode(65+i)}.</span><div className="min-w-0 flex-1"><GermanTeachingText text={option} immediateTranslation={false} className="font-bold"/></div></div>)}</div>}
      {task.type==='true-false'&&<div className="mt-4 flex gap-3"><GermanTeachingText text="Richtig" immediateTranslation={false} className="font-bold"/><GermanTeachingText text="Falsch" immediateTranslation={false} className="font-bold"/></div>}
    </div>

    <TaskMedia task={task} audioRef={audioRef}/>

    <div className="mt-4 flex flex-wrap gap-2">
      <button onClick={()=>setShowHint(v=>!v)} className="min-h-10 rounded-xl border bg-white px-4 text-sm font-bold">Подсказка</button>
      <button onClick={()=>setShowQuestionHelp(v=>!v)} className="min-h-10 rounded-xl border bg-white px-4 text-sm font-bold">Разобрать вопрос</button>
      <button onClick={()=>{audioRef.current?.play().catch(()=>{})}} className="min-h-10 rounded-xl border bg-white px-4 text-sm font-bold">Послушать ещё раз</button>
      <button onClick={()=>setShowAudioHelp(v=>!v)} className="min-h-10 rounded-xl border bg-white px-4 text-sm font-bold">Разобрать аудио</button>
    </div>

    {showHint&&<div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6">Ищите в аудио <b>{targetFor(task)}</b>. Не выбирайте ответ только потому, что услышали знакомое слово.</div>}
    {showQuestionHelp&&<div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3"><GermanTeachingText text={task.prompt} className="font-bold"/><p className="mt-2 text-sm leading-6 text-slate-600">То есть перед прослушиванием мы уже знаем, какую информацию нужно выловить.</p></div>}
    {showAudioHelp&&!checked&&<p className="mt-3 text-sm text-slate-500">Сначала сделайте первую попытку. Полный разбор аудио до ответа не показываем, чтобы Hören не превратился в Lesen.</p>}
    {showAudioHelp&&checked&&<div className="mt-3 rounded-xl border bg-slate-50 p-4"><GermanTeachingText text={task.audioText} className="text-sm font-medium leading-6"/></div>}

    <AnswerButtons task={task} selected={selected} checked={checked} onSelect={setSelected}/>
    {!checked?<div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]"><button disabled={selected===null} onClick={()=>{setChecked(true);onStatus(isCorrect(task,selected)?'correct':'wrong')}} className="min-h-12 rounded-xl bg-slate-900 px-5 font-black text-white disabled:opacity-40">Проверить</button><button onClick={()=>{setChecked(true);setSelected(null);onStatus('skipped')}} className="min-h-12 rounded-xl border bg-white px-5 font-bold"><SkipForward className="mr-2 inline h-4 w-4"/>Пропустить</button></div>:<>
      {selected===null?<div className="mt-5 rounded-2xl border bg-slate-50 p-4"><b>Пропущено</b><p className="mt-2 text-sm">Правильный ответ: <b>{correctLabel(task)}</b>.</p></div>:<Feedback task={task} correct={isCorrect(task,selected)}/>}
      {selected!==null&&!isCorrect(task,selected)&&<div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><b>Послушайте именно этот фрагмент ещё раз:</b><div className="mt-3"><GermanTeachingText text={evidenceForTask(task)} audio={false} className="font-bold leading-7"/></div><button onClick={()=>{setChecked(false);setSelected(null);setShowAudioHelp(false)}} className="mt-3 min-h-10 rounded-xl border bg-white px-4 font-bold">Попробовать снова</button></div>}
      <details className="mt-4 rounded-2xl border bg-slate-50 p-4"><summary className="cursor-pointer font-bold">Разобрать аудио после попытки</summary><div className="mt-3"><GermanTeachingText text={task.audioText} className="text-sm font-medium leading-6"/></div></details>
      {(selected===null||isCorrect(task,selected))&&<div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={onBack} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-white px-3 font-bold"><ArrowLeft className="h-4 w-4 shrink-0"/>Назад</button><button onClick={onDone} className="min-h-12 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-black text-white">{index===3?'Teil завершён':'Практика '+(index+2)+' из 4'} <ArrowRight className="ml-1 inline h-4 w-4"/></button></div>}
    </>}
    {(!checked||(selected!==null&&!isCorrect(task,selected)))&&<div className="mt-5"><button type="button" onClick={onBack} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-white px-3 font-bold"><ArrowLeft className="h-4 w-4 shrink-0"/>Назад</button></div>}
  </Card>;
}

function Step({title,children}:{title:string;children:React.ReactNode}){return <section className="mt-5 rounded-2xl border bg-slate-50 p-4"><h2 className="text-lg font-black text-slate-950">{title}</h2><div className="mt-3">{children}</div></section>}

function TaskMedia({task,audioRef}:{task:HorenTask;audioRef?:React.RefObject<HTMLAudioElement>}){
  const n=String(task.number).padStart(3,'0');
  return <div className="mt-5 space-y-4"><div className="rounded-2xl border bg-slate-50 p-3"><audio ref={audioRef} src={`/audio/${n}.mp3`} controls preload="metadata" className="w-full"/></div><img src={`/images/${n}.png?v=20260914-2`} alt={`Aufgabe ${task.number}`} className="mx-auto max-h-[380px] w-full max-w-[520px] rounded-2xl object-contain" onError={e=>{e.currentTarget.style.display='none'}}/></div>;
}

function splitAudio(text:string){return text.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])/u).map(v=>v.trim()).filter(Boolean)}
function playRange(audio:HTMLAudioElement|null,start:number,end:number){
  if(!audio)return;
  audio.pause();audio.currentTime=start;void audio.play().catch(()=>{});
  const stop=()=>{if(audio.currentTime>=end){audio.pause();audio.removeEventListener('timeupdate',stop)}};
  audio.addEventListener('timeupdate',stop);
}

function evidenceForTask(task:HorenTask){
  const chunks=splitAudio(task.audioText);
  const target=(task.type==='multiple-choice'?task.options[task.correctIndex]:task.prompt).toLocaleLowerCase('de-DE');
  const targetWords=new Set(target.match(/[\p{L}\p{N}]{3,}/gu)||[]);
  let best=chunks[0]||task.audioText,bestScore=-1;
  for(const chunk of chunks){
    const words=chunk.toLocaleLowerCase('de-DE').match(/[\p{L}\p{N}]{3,}/gu)||[];
    const score=words.filter(word=>targetWords.has(word)).length;
    if(score>bestScore){best=chunk;bestScore=score}
  }
  return best;
}

function AnswerButtons({task,selected,checked,onSelect}:{task:HorenTask;selected:Answer;checked:boolean;onSelect:(value:Answer)=>void}){
  if(task.type==='multiple-choice')return <div className="mt-5 grid gap-3">{task.options.map((option,index)=><div key={option+index} className="flex items-center gap-2"><button disabled={checked} onClick={()=>onSelect(index)} className={cn('min-h-12 flex-1 rounded-xl border-2 bg-white px-4 py-3 text-left font-bold',selected===index?'border-sky-500 bg-sky-50':'border-slate-200')}><span className="mr-2 text-sky-700">{String.fromCharCode(65+index)}.</span>{option}</button><TranslationButton parts={[option]} title="Перевод варианта"/></div>)}</div>;
  return <div className="mt-5 grid grid-cols-2 gap-3">{([true,false] as boolean[]).map(value=><button key={String(value)} disabled={checked} onClick={()=>onSelect(value)} className={cn('min-h-12 rounded-xl border-2 bg-white px-4 py-3 font-bold',selected===value?'border-sky-500 bg-sky-50':'border-slate-200')}><span className="block">{value?'Richtig':'Falsch'}</span><span className="mt-1 block text-xs font-medium text-slate-500">{value?'верно':'неверно'}</span></button>)}</div>;
}
function isCorrect(task:HorenTask,selected:Answer){return task.type==='multiple-choice'?selected===task.correctIndex:selected===task.correctAnswer}
function correctLabel(task:HorenTask){return task.type==='multiple-choice'?task.options[task.correctIndex]:(task.correctAnswer?'Richtig':'Falsch')}
function Feedback({task,correct}:{task:HorenTask;correct:boolean}){
  return <div className={cn('mt-5 rounded-2xl border p-4',correct?'border-emerald-200 bg-emerald-50':'border-amber-200 bg-amber-50')}><b>{correct?'Правильно ✓':'OTTO: найдём конкретное место'}</b><p className="mt-2 text-sm leading-6 text-slate-700">{correct?'Вы услышали нужную информацию.':'Не просто меняем вариант. Снова смотрим на вопрос, затем слушаем фрагмент и ищем именно нужный факт.'}</p><p className="mt-2 text-sm leading-6 text-slate-700">Правильный ответ в исходном задании: <b>{correctLabel(task)}</b>.</p></div>;
}
function TopNav({title,onBack,onTraining}:{title:string;onBack:()=>void;onTraining:()=>void;onPartSelect?:()=>void;onModules?:()=>void}){
  return <div className="mb-4 min-w-0">
    <div className="grid grid-cols-2 gap-3">
      <button type="button" onClick={onBack} className="flex min-h-12 items-center justify-center gap-1 rounded-xl border bg-white px-2 text-center text-sm font-bold"><ArrowLeft className="h-4 w-4 shrink-0"/>Назад</button>
      <button type="button" onClick={onTraining} className="min-h-12 rounded-xl border border-teal-200 bg-teal-50 px-2 py-2 text-center text-sm font-bold leading-tight text-teal-900">К реальным заданиям</button>
    </div>
    <h2 className="mt-3 text-[clamp(19px,5vw,22px)] font-black leading-tight text-slate-950">{title}</h2>
  </div>;
}

function Card({children}:{children:React.ReactNode}){return <section className="rounded-[28px] border bg-white p-5 shadow-sm sm:p-7">{children}</section>}
