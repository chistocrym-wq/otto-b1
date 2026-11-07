import { useEffect, useMemo, useState } from 'react';
import { useResetLearningStepScroll } from '@/preview/LearningStepScroll';
import { ArrowLeft, ArrowRight, Bookmark, BookOpen, CheckCircle2, Eye, Mic, SkipForward, Volume2 } from 'lucide-react';
import { speakingTeil1, speakingTeil2Cards } from '@/data/speaking';
import { speakingTeil3ArchiveCards } from '@/data/speakingTeil3Archive';
import { VoiceRecorder } from '@/components/sprechen/VoiceRecorder';
import { Teil3ArchiveImage } from '@/components/sprechen/Teil3ArchiveImage';
import { LearningGermanLine } from '@/preview/LearningLanguageTools';
import { OttoTeachingBubble } from '@/preview/LearningTranslation';

import type { LearningPartLocation, PartNavigationCommand } from '@/preview/TeilNavigation';

type Part=1|2|3;
type PartPhase='notStarted'|'detail'|'practice'|'done';

type PartProgress={phase:PartPhase;detailIndex:number;practiceIndex:number};
type LearningProgress={
  view:'intro'|'selector'|'part';
  part:Part;
  parts:Record<Part,PartProgress>;
};

const STORAGE_PREFIX='otto-preview-sprechen-learning-v1:';

function freshParts():Record<Part,PartProgress>{
  return{
    1:{phase:'notStarted',detailIndex:0,practiceIndex:0},
    2:{phase:'notStarted',detailIndex:0,practiceIndex:0},
    3:{phase:'notStarted',detailIndex:0,practiceIndex:0},
  };
}
function blankProgress():LearningProgress{return{view:'intro',part:1,parts:freshParts()}}
function normalizePart(raw:any):PartProgress{
  const phase:PartPhase=['notStarted','detail','practice','done'].includes(String(raw?.phase))?raw.phase:'notStarted';
  return{
    phase,
    detailIndex:Math.max(0,Number(raw?.detailIndex)||0),
    practiceIndex:Math.max(0,Math.min(4,Number(raw?.practiceIndex)||0)),
  };
}
function readProgress(userId?:string):LearningProgress{
  try{
    const raw=JSON.parse(localStorage.getItem(STORAGE_PREFIX+(userId||'local'))||'{}') as any;
    if(raw.parts){
      return{
        view:['intro','selector','part'].includes(String(raw.view))?raw.view:'intro',
        part:raw.part===2||raw.part===3?raw.part:1,
        parts:{1:normalizePart(raw.parts[1]),2:normalizePart(raw.parts[2]),3:normalizePart(raw.parts[3])},
      };
    }
    const parts=freshParts();
    if(Array.isArray(raw.completedParts))for(const value of raw.completedParts){if(value===1||value===2||value===3){const completedPart=value as Part;parts[completedPart]={phase:'done',detailIndex:0,practiceIndex:4}}}
    const part:Part=raw.part===2||raw.part===3?raw.part:1;
    if(raw.phase==='detail')parts[part]={phase:'detail',detailIndex:Math.max(0,Number(raw.detailIndex)||0),practiceIndex:0};
    if(raw.phase==='practice')parts[part]={phase:'practice',detailIndex:Math.max(0,Number(raw.detailIndex)||0),practiceIndex:Math.max(0,Math.min(4,Number(raw.practiceIndex)||0))};
    if(raw.phase==='partDone')parts[part]={phase:'done',detailIndex:Math.max(0,Number(raw.detailIndex)||0),practiceIndex:4};
    if(raw.phase==='allDone')for(const value of [1,2,3] as Part[])parts[value]={phase:'done',detailIndex:0,practiceIndex:4};
    return{
      view:raw.phase==='home'||!raw.phase?'intro':raw.phase==='allDone'?'selector':'part',
      part,
      parts,
    };
  }catch{return blankProgress()}
}
function saveProgress(value:LearningProgress,userId?:string){try{localStorage.setItem(STORAGE_PREFIX+(userId||'local'),JSON.stringify(value))}catch{}}

function speakGerman(text:string){
  const clean=text.trim();if(!clean||/[А-Яа-яЁё]/.test(clean))return;
  const api=(window as Window&{OttoSpeech?:{play?:(value:string,options?:{mode?:'normal'|'slow'})=>Promise<boolean>}}).OttoSpeech;
  if(api?.play)void api.play(clean,{mode:'normal'});
}

const TEIL1_RU:Record<string,string>={
  'Name?':'имя',
  'Alter?':'возраст',
  'Land?':'страна',
  'Wohnort?':'место жительства',
  'Sprachen?':'языки',
  'Beruf?':'профессия',
  'Hobby?':'хобби',
};

const TEIL1_EXAMPLE:Record<string,string>={
  'Name?':'Ich heiße Anna Petrova.',
  'Alter?':'Ich bin 34 Jahre alt.',
  'Land?':'Ich komme aus Russland und wohne jetzt in Hamburg.',
  'Wohnort?':'Ich komme aus Russland und wohne jetzt in Hamburg.',
  'Sprachen?':'Ich spreche Russisch, Englisch und ein bisschen Deutsch.',
  'Beruf?':'Ich bin Verkäuferin.',
  'Hobby?':'Mein Hobby ist Sport.',
};

const TEIL1_PRACTICE=[
  {label:'Практика Teil 1 · 1 из 5',points:[speakingTeil1.keywords[0],speakingTeil1.keywords[1]],help:'Опирайтесь на два существующих пункта карточки.'},
  {label:'Практика Teil 1 · 2 из 5',points:[speakingTeil1.keywords[2],speakingTeil1.keywords[3]],help:'Скажите страну и место жительства.'},
  {label:'Практика Teil 1 · 3 из 5',points:[speakingTeil1.keywords[4],speakingTeil1.keywords[5]],help:'Подсказок меньше: ориентируйтесь только на пункты карточки.'},
  {label:'Практика Teil 1 · 4 из 5',points:[speakingTeil1.keywords[6],speakingTeil1.followUps[0]],help:'Сначала Hobby, затем ответьте на существующий дополнительный вопрос.'},
  {label:'Практика Teil 1 · 5 из 5',points:[...speakingTeil1.keywords,...speakingTeil1.followUps],help:'Почти экзаменационный режим: полное представление и существующие дополнительные вопросы.'},
] as const;

const TEIL2_SIX=speakingTeil2Cards.slice(0,6);
const TEIL3_SIX=speakingTeil3ArchiveCards.slice(0,6);

const TEIL2_APPROVED_EXPLANATIONS=[
  `После рассказа о себе начинается второе задание.

Нужно задать вопрос собеседнику.

Вопрос строится по теме и целевому слову.`,
  `Теперь давайте рассмотрим, как выполнить это задание так, чтобы вам не пришлось строить сложные грамматические конструкции с высоким риском ошибиться и занизить свой балл за выполнение этого задания.

В конспекте вы уже видели список типовых вопросов, которые можно использовать в устной части экзамена. Список этих вопросов небольшой, но пользуясь им вы сможете выполнить практически любой выпавший вариант этого задания.`,
  `В нашем случае (Thema: Sport, целевое слово – Abend) отлично подойдет вопрос Machen Sie …? (Занимаетесь ли вы…?).

Мы сконструируем максимально простой вопрос, отвечающий требованиям задания:

Machen Sie Sport am Abend?
(Занимаетесь ли вы спортом вечером?)`,
  `Machen Sie Sport am Abend?
(Занимаетесь ли вы спортом вечером?)

Давайте разберем, почему мы задали вопрос именно так и почему это наиболее простой способ выполнять это задание.

1. Мы используем типовой универсальный вопрос. Не нужно глубоко погружаться в немецкий язык, чтобы справиться с этим заданием. Вы должны лишь запомнить 10-15 наиболее универсальных вопросов.`,
  `2. Выполняя это задание, мы всегда обращаемся к собеседнику на “Вы” (Sie). Делая это, вы избавляете себя от необходимости перестраивать глагол под новое местоимение, например “du” (ты). Если бы мы обращались к собеседнику на “ты”, то вопрос бы звучал так: Machst du Sport am Abend? (Ты занимаешься спортом вечером?). Согласитесь, что проще и удобнее запомнить и использовать только одну форму обращения с одним и тем же спряжением глагола.`,
  `3. Мы задали вопрос по заданной теме. В данном случае нам повезло, и мы смогли использовать тему как слово в нашем вопросе. Само понятие “спорт” довольно широкое, и использовать это слово при составлении вопроса очень удобно.

При этом, мы могли задать вопрос и так:

Schwimmen Sie am Abend?
(Плаваете ли вы вечером?)

И это тоже было бы правильно, ведь плавание относится к спорту.`,
  `4. Мы использовали целевое слово Abend.

Обратите внимание, что при обозначении времени мы написали “am Abend” (Вечером). Лучше запомнить формулу из конспекта, которая помогает разобраться, когда писать am, um или im. В данном случае речь идет о части дня, поэтому пишется am Abend.`,
] as const;

const TEIL2_EXPLANATION_CARD={theme:'Sport',keyword:'Abend'} as const;

const TEIL3_REQUEST_TEMPLATES=[
  {de:'Geben Sie mir bitte ...',ru:'Дайте мне, пожалуйста, ...'},
  {de:'Bringen Sie mir bitte ...',ru:'Принесите мне, пожалуйста, ...'},
  {de:'Reichen Sie mir bitte ...',ru:'Подайте мне, пожалуйста, ...'},
  {de:'Nehmen Sie mir bitte ...',ru:'Возьмите мне, пожалуйста, ...'},
  {de:'Schicken Sie mir bitte ...',ru:'Пришлите мне, пожалуйста, ...'},
] as const;

const TEIL3_RESPONSE_TEMPLATES=[
  {de:'Ja, bitte.',ru:'Да, пожалуйста.'},
  {de:'Ja, gern.',ru:'Да, с удовольствием.'},
  {de:'Natürlich.',ru:'Конечно.'},
  {de:'Nein, leider.',ru:'Нет, к сожалению.'},
  {de:'Nein, das habe ich nicht.',ru:'Нет, этого у меня нет.'},
] as const;

function partStatusLabel(part:Part,state:PartProgress){
  if(state.phase==='done')return'✓ Пройден';
  if(state.phase==='practice')return`Продолжить · ${state.practiceIndex+1} из 5`;
  if(state.phase==='detail'){
    if(part===2)return state.detailIndex<=6?`Продолжить · объяснение ${state.detailIndex+1} из 7`:'Продолжить · подробный пример';
    if(part===3)return `Продолжить · объяснение ${Math.min(8,state.detailIndex+1)} из 8`;
    return state.detailIndex>0?'Продолжить · подробное обучение':'Продолжить · подробный пример';
  }
  return'Начать';
}
function partCard(part:Part){
  if(part===1)return{title:'Рассказать о себе',body:'Расскажем о себе и потренируем дополнительные вопросы экзаменатора.'};
  if(part===2)return{title:'Задать вопрос',body:'Научимся строить вопрос по слову и теме на карточке и отвечать собеседнику.'};
  return{title:'Сформулировать просьбу',body:'Научимся правильно попросить о том, что изображено на карточке, и ответить на просьбу.'};
}

export function SprechenLearningStage({
  userId,onBack,onOpenTraining,onReferenceSectionChange,reviewIntro=false,onFinishReview,onRequestReview,partNavigation,onLocationChange,
}:{
  userId?:string;
  onBack:()=>void;
  onOpenTraining:()=>void;
  reviewIntro?:boolean;
  onFinishReview?:()=>void;
  onRequestReview?:()=>void;
  partNavigation?:PartNavigationCommand;
  onLocationChange?:(location:LearningPartLocation)=>void;
  onReferenceSectionChange?:(section:'reference_home'|'oral_teil1'|'oral_questions'|'oral_requests')=>void;
}){
  const initial=useMemo(()=>readProgress(userId),[userId]);
  const[progress,setProgress]=useState<LearningProgress>(initial);
  // A short, non-persisted welcome appears before the original Sprechen explanation.
  // It never modifies saved Teil exercises or the learner's existing position.
  const[showPronunciationWelcome,setShowPronunciationWelcome]=useState(()=>initial.view==='intro');
  const[entryPart,setEntryPart]=useState<Part|null>(null);
  const persist=(next:LearningProgress)=>{setProgress(next);saveProgress(next,userId)};
  const current=progress.parts[progress.part];
  useResetLearningStepScroll(`sprechen:${showPronunciationWelcome?'welcome':'format'}:${entryPart??'none'}:${progress.view}:${progress.part}:${current.phase}:${current.detailIndex}:${current.practiceIndex}`);
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
    onLocationChange?.({module:'sprechen',view:progress.view,part:progress.part});
  },[onLocationChange,progress.view,progress.part]);

  useEffect(()=>{
    if(progress.view!=='part'){onReferenceSectionChange?.('reference_home');return}
    if(progress.part===2){onReferenceSectionChange?.('oral_questions');return}
    if(progress.part===3){onReferenceSectionChange?.('oral_requests');return}
    onReferenceSectionChange?.('oral_teil1');
  },[onReferenceSectionChange,progress.part,progress.view]);
  const updateCurrent=(patch:Partial<PartProgress>)=>persist({...progress,parts:{...progress.parts,[progress.part]:{...current,...patch}}});
  const openPart=(part:Part)=>{
    setEntryPart(null);
    const saved=progress.parts[part];
    const next=saved.phase==='notStarted'?{phase:'detail' as PartPhase,detailIndex:0,practiceIndex:0}:saved;
    persist({...progress,view:'part',part,parts:{...progress.parts,[part]:next}});
  };
  const backToSelector=()=>persist({...progress,view:'selector'});
  const finishPart=()=>updateCurrent({phase:'done',practiceIndex:4});
  const repeatCurrent=()=>updateCurrent({phase:'detail',detailIndex:0,practiceIndex:0});
  const nextPart=()=>{if(progress.part<3)openPart((progress.part+1) as Part)};

  // Display the actual selected part's introductory page before resuming its saved exercises.
  // Merely opening this page leaves all Teil phases, scores and answers untouched.
  if(entryPart!==null&&!reviewIntro)return <section className="otto-teil-entry">
    <TopNav title={`Sprechen · Teil ${entryPart}`} onBack={()=>{setEntryPart(null);backToSelector()}} onTraining={onOpenTraining}/>
    <Card>
      <p className="otto-kicker">TEIL {entryPart} · НАЧАЛО ОБУЧЕНИЯ</p>
      <h1 className="mt-2 text-3xl font-black text-slate-950">{partCard(entryPart).title}</h1>
      <p className="mt-4 text-lg leading-7 text-slate-700">{partCard(entryPart).body}</p>
      {progress.parts[entryPart].phase!=='notStarted'&&<p className="mt-4 rounded-xl bg-teal-50 p-3 text-sm font-bold text-teal-900">Сохранённые упражнения этого Teil не изменены. После продолжения вы вернётесь к прежнему месту.</p>}
      <button type="button" onClick={()=>openPart(entryPart)} className="mt-6 min-h-12 w-full rounded-xl bg-slate-900 px-5 font-bold text-white">
        {progress.parts[entryPart].phase==='notStarted'?'Начать выбранный Teil':'Продолжить с сохранённого места'} <ArrowRight className="ml-2 inline h-4 w-4"/>
      </button>
    </Card>
  </section>;

  if(showPronunciationWelcome&&progress.view==='intro'&&!reviewIntro&&entryPart===null)return <section data-testid="otto-pronunciation-welcome">
    <TopNav title="Проверка произношения" onBack={onBack} onTraining={onOpenTraining}/>
    <Card>
      <p className="otto-kicker">УЧИМСЯ ГОВОРИТЬ С OTTO</p>
      <h1 className="mt-2 text-3xl font-black">Потренируем произношение вместе</h1>
      <OttoTeachingBubble scene="guide" className="mt-5">
        <p>Здесь вы сможете <b>потренировать произношение</b> немецких слов и фраз, записать свой голос и получить <b>обратную связь от OTTO</b> о том, насколько правильно вы говорите.</p>
        <p className="mt-3">Мы также объясним, из чего состоит <b>устная часть экзамена A1 — Sprechen</b> и что от вас ожидают в каждом задании.</p>
        <p className="mt-3">Потом подробно разберём эти задания и научимся выполнять их шаг за шагом, прежде чем переходить к <b>настоящим тренировочным заданиям</b>.</p>
      </OttoTeachingBubble>
      <button type="button" onClick={()=>setShowPronunciationWelcome(false)} className="mt-6 min-h-12 w-full rounded-xl bg-slate-900 px-5 font-black text-white">
        Посмотреть, как устроен Sprechen <ArrowRight className="ml-2 inline h-4 w-4"/>
      </button>
    </Card>
  </section>;

  if(progress.view==='intro'||reviewIntro)return <section>
    <TopNav title="Sprechen · обучение" onBack={reviewIntro?(onFinishReview??onBack):onBack} onTraining={onOpenTraining}/>
    <Card>
      <p className="otto-kicker">СНАЧАЛА РАЗБЕРЁМСЯ С ФОРМАТОМ</p>
      <h1 className="mt-2 text-3xl font-black">Как устроен Sprechen</h1>
      <OttoTeachingBubble scene="guide" className="mt-5">
        <p><b>Sprechen</b> — это устная часть экзамена.</p>
        <p className="mt-3">Здесь важно не писать, а говорить и понимать собеседника.</p>
        <p className="mt-3"><b>Teil 1</b> — вы коротко рассказываете о себе и отвечаете на дополнительные вопросы.</p>
        <p className="mt-2"><b>Teil 2</b> — по карточкам задаёте вопросы и отвечаете на вопросы другого участника.</p>
        <p className="mt-2"><b>Teil 3</b> — по карточкам формулируете вежливые просьбы и отвечаете на просьбы собеседника.</p>
        <p className="mt-3">Сейчас я подробно покажу, как выполняется каждый Teil.</p>
      </OttoTeachingBubble>
      <button onClick={()=>reviewIntro?onFinishReview?.():persist({...progress,view:'selector'})} className="mt-6 min-h-12 w-full rounded-xl bg-slate-900 px-5 font-black text-white">Продолжить <ArrowRight className="ml-2 inline h-4 w-4"/></button>
    </Card>
  </section>;

  if(progress.view==='selector')return <section>
    <TopNav title="Sprechen · обучение" onBack={()=>persist({...progress,view:'intro'})} onModules={onBack} onTraining={onOpenTraining}/>
    <Card>
      <p className="otto-kicker">КАРТА МОДУЛЯ</p>
      <h1 className="mt-2 text-3xl font-black">Что хотите потренировать?</h1>
      <p className="mt-3 leading-7 text-slate-600">Выберите любой Teil. Карточки ниже сначала показывают, что вас ждёт, а подробное обучение начнётся уже внутри выбранной части.</p><button onClick={()=>onRequestReview?.()} className="mt-4 min-h-10 rounded-xl border bg-white px-4 text-sm font-bold">Посмотреть общее объяснение ещё раз</button>
      <div className="mt-6 grid gap-3 lg:grid-cols-3">{([1,2,3] as Part[]).map(part=>{const copy=partCard(part);return <button key={part} onClick={()=>openPart(part)} className="rounded-2xl border bg-white p-5 text-left shadow-sm hover:border-teal-300">
        <span className="text-xs font-black uppercase tracking-wider text-teal-700">Teil {part}</span>
        <b className="mt-2 block text-xl">{copy.title}</b>
        <span className="mt-2 block text-sm leading-6 text-slate-600">{copy.body}</span>
        <span className="mt-4 block text-sm font-black text-teal-800">{partStatusLabel(part,progress.parts[part])}</span>
      </button>})}</div>
    </Card>
  </section>;

  if(current.phase==='done')return <section>
    <TopNav title={`Sprechen · Teil ${progress.part}`} onBack={backToSelector} onPartSelect={backToSelector} onModules={onBack} onTraining={onOpenTraining}/>
    <Card>
      <CheckCircle2 className="h-12 w-12 text-emerald-600"/>
      <h1 className="mt-3 text-3xl font-black">Sprechen Teil {progress.part} пройден ✓</h1>
      <p className="mt-3 text-slate-600">Подробное обучение и пять закреплений завершены.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button onClick={backToSelector} className="min-h-12 rounded-xl border bg-white px-4 font-bold">Выбрать другой Teil</button>
        <button onClick={repeatCurrent} className="min-h-12 rounded-xl border bg-white px-4 font-bold">Повторить Teil {progress.part}</button>
        <button onClick={onOpenTraining} className="min-h-12 rounded-xl border border-teal-200 bg-teal-50 px-4 font-bold text-teal-900">К реальным заданиям</button>
        {progress.part<3&&<button onClick={nextPart} className="min-h-12 rounded-xl bg-slate-900 px-4 font-black text-white">Перейти к Teil {progress.part+1}</button>}
      </div>
    </Card>
  </section>;

  if(progress.part===1){
    if(current.phase==='detail')return <Teil1Detail index={current.detailIndex} onBack={()=>current.detailIndex>0?updateCurrent({detailIndex:current.detailIndex-1}):backToSelector()} onNext={()=>current.detailIndex<speakingTeil1.keywords.length?updateCurrent({detailIndex:current.detailIndex+1}):updateCurrent({phase:'practice',practiceIndex:0})} onPartSelect={backToSelector} onModules={onBack} onTraining={onOpenTraining}/>;
    return <Teil1Practice index={current.practiceIndex} onBack={()=>current.practiceIndex>0?updateCurrent({practiceIndex:current.practiceIndex-1}):updateCurrent({phase:'detail',detailIndex:speakingTeil1.keywords.length})} onDone={()=>current.practiceIndex<4?updateCurrent({practiceIndex:current.practiceIndex+1}):finishPart()} onPartSelect={backToSelector} onModules={onBack} onTraining={onOpenTraining}/>;
  }

  if(progress.part===2){
    if(current.phase==='detail')return <Teil2Detail
      index={current.detailIndex}
      onBack={()=>current.detailIndex>0?updateCurrent({detailIndex:current.detailIndex-1}):backToSelector()}
      onNext={()=>updateCurrent({detailIndex:Math.min(7,current.detailIndex+1)})}
      onRestart={()=>updateCurrent({detailIndex:0})}
      onPartSelect={backToSelector}
      onModules={onBack}
      onDone={()=>updateCurrent({phase:'practice',practiceIndex:0})}
      onTraining={onOpenTraining}
    />;
    return <Teil2Practice
      key={`teil2:${current.practiceIndex}`}
      index={current.practiceIndex}
      onBack={()=>current.practiceIndex>0?updateCurrent({practiceIndex:current.practiceIndex-1}):updateCurrent({phase:'detail',detailIndex:7})}
      onDone={()=>current.practiceIndex<4?updateCurrent({practiceIndex:current.practiceIndex+1}):finishPart()}
      onPartSelect={backToSelector}
      onModules={onBack}
      onTraining={onOpenTraining}
    />;
  }

  if(current.phase==='detail')return <Teil3Detail
    index={current.detailIndex}
    onBack={()=>current.detailIndex>0?updateCurrent({detailIndex:current.detailIndex-1}):backToSelector()}
    onNext={()=>updateCurrent({detailIndex:Math.min(7,current.detailIndex+1)})}
    onDone={()=>updateCurrent({phase:'practice',practiceIndex:0})}
    onTraining={onOpenTraining}
    onPartSelect={backToSelector}
    onModules={onBack}
  />;
  return <Teil3PracticeLearning
    key={`teil3:${current.practiceIndex}`}
    index={current.practiceIndex}
    onBack={()=>current.practiceIndex>0?updateCurrent({practiceIndex:current.practiceIndex-1}):updateCurrent({phase:'detail',detailIndex:7})}
    onDone={()=>current.practiceIndex<4?updateCurrent({practiceIndex:current.practiceIndex+1}):finishPart()}
    onPartSelect={backToSelector}
    onModules={onBack}
    onTraining={onOpenTraining}
  />;
}

function Teil1Detail({index,onBack,onNext,onPartSelect,onModules,onTraining}:{index:number;onBack:()=>void;onNext:()=>void;onPartSelect:()=>void;onModules:()=>void;onTraining:()=>void}){
  const keyword=speakingTeil1.keywords[index];
  const isFollowUps=index>=speakingTeil1.keywords.length;
  return <section>
    
    <Card>
      <p className="otto-kicker">ПОДРОБНЫЙ РАЗБОР · SICH VORSTELLEN</p>
      {!isFollowUps?<><div className="mt-4 flex items-center justify-between gap-3"><div><span className="text-sm font-bold text-teal-700">{index+1} из {speakingTeil1.keywords.length}</span><h1 className="mt-1 text-4xl font-black">{keyword}</h1><p className="mt-2 text-lg text-slate-600">{TEIL1_RU[keyword]}</p></div><button onClick={()=>speakGerman(keyword)} className="grid h-12 w-12 place-items-center rounded-xl border bg-white text-teal-800" aria-label="Прослушать"><Volume2 className="h-5 w-5"/></button></div><div className="mt-5 rounded-2xl border bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Существующий пример ответа</p><div className="mt-2"><LearningGermanLine text={TEIL1_EXAMPLE[keyword]} showTranslation className="text-lg font-bold"/></div></div><div className="mt-5"><VoiceRecorder evaluation={{mode:'teil1',expectedPoints:[keyword]}} onPracticed={()=>{}} onEvaluated={()=>{}} hint="Скажите свой ответ по этому пункту."/></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={onNext} className="min-h-11 rounded-xl border bg-white px-4 font-bold">Пропустить произношение</button></div><div className="mt-3 grid grid-cols-2 gap-3"><BottomStepBack onClick={onBack}/><button onClick={onNext} className="min-h-12 rounded-xl bg-slate-900 px-5 font-black text-white">Далее <ArrowRight className="ml-2 inline h-4 w-4"/></button></div></>:<>
        <h1 className="text-3xl font-black">Дополнительные вопросы Teil 1</h1>
        <p className="mt-3 leading-7 text-slate-700">Используем только те формулировки, которые уже есть в текущем задании OTTO.</p>
        <div className="mt-5 space-y-3">{speakingTeil1.followUps.map(q=><div key={q} className="rounded-2xl border bg-white p-4"><LearningGermanLine text={q} showTranslation className="font-bold"/></div>)}</div>
        <div className="mt-6 grid grid-cols-2 gap-3"><BottomStepBack onClick={onBack}/><button onClick={onNext} className="min-h-12 w-full rounded-xl bg-slate-900 px-3 font-black text-white">Перейти к практике <ArrowRight className="ml-2 inline h-4 w-4"/></button></div>
      </>}
    </Card>
  </section>;
}

function Teil1Practice({index,onBack,onDone,onPartSelect,onModules,onTraining}:{index:number;onBack:()=>void;onDone:()=>void;onPartSelect:()=>void;onModules:()=>void;onTraining:()=>void}){
  const item=TEIL1_PRACTICE[index];
  return <section><Card><p className="otto-kicker">{item.label}</p><h1 className="mt-2 text-3xl font-black">Скажите сами</h1>{index<4&&<p className="mt-3 text-sm leading-6 text-slate-600">{item.help}</p>}<div className="mt-5 space-y-2">{item.points.map(point=><div key={point} className="rounded-xl bg-slate-50 p-3"><LearningGermanLine text={point} className="font-bold"/></div>)}</div><div className="mt-5"><VoiceRecorder evaluation={{mode:'teil1',expectedPoints:[...item.points]}} onPracticed={()=>{}} onEvaluated={()=>{}} hint={index===4?'Пройдите существующий формат почти самостоятельно.':'Ответьте по показанным пунктам.'}/></div><div className="mt-5 grid grid-cols-2 gap-3"><BottomStepBack onClick={onBack}/><button onClick={onDone} className="min-h-12 w-full rounded-xl bg-slate-900 px-3 font-black text-white">{index===4?'Завершить Teil 1':'Следующая практика'} <ArrowRight className="ml-2 inline h-4 w-4"/></button></div></Card></section>;
}

function Teil2Detail({
  index,onBack,onNext,onRestart,onPartSelect,onModules,onDone,onTraining,
}:{
  index:number;onBack:()=>void;onNext:()=>void;onRestart:()=>void;onPartSelect:()=>void;onModules:()=>void;onDone:()=>void;onTraining:()=>void;
}){
  if(index<=6)return <Teil2ExplanationScreen
    index={index}
    onBack={onBack}
    onNext={onNext}
    onRestart={onRestart}
    onStartPractice={onNext}
    onTraining={onTraining}
    onPartSelect={onPartSelect}
    onModules={onModules}
  />;
  return <Teil2GuidedPractice
    onBack={onBack}
    onDone={onDone}
    onPartSelect={onPartSelect}
    onModules={onModules}
    onTraining={onTraining}
  />;
}

function Teil2ExplanationScreen({
  index,onBack,onNext,onRestart,onStartPractice,onTraining,onReturnToTask,
}:{
  index:number;onBack:()=>void;onNext:()=>void;onRestart:()=>void;onStartPractice:()=>void;onTraining:()=>void;onPartSelect:()=>void;onModules:()=>void;onReturnToTask?:()=>void;
}){
  const screen=Math.max(0,Math.min(6,index));
  return <section>
    
    
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="otto-kicker">ПОДРОБНОЕ ОБЪЯСНЕНИЕ TEIL 2</p><h1 className="mt-1 text-3xl font-black">Экран {screen+1} из 7</h1></div>
        
      </div>

      {screen===0&&<div className="mt-6 space-y-5">
        <OttoTeachingBubble scene="guide"><SourceParagraphs text={TEIL2_APPROVED_EXPLANATIONS[0]}/></OttoTeachingBubble>
        <ApprovedSportAbendCard/>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border bg-white p-4"><span className="text-xs font-black uppercase tracking-wider text-slate-400">Целевое слово</span><b className="mt-2 block text-3xl text-slate-950">Abend</b><p className="mt-2 text-sm text-slate-600">Abend — целевое слово.</p></div>
          <div className="rounded-2xl border bg-white p-4"><span className="text-xs font-black uppercase tracking-wider text-slate-400">Тема</span><b className="mt-2 block text-3xl text-slate-950">Sport</b><p className="mt-2 text-sm text-slate-600">Thema: Sport — тема.</p></div>
        </div>
        <OttoTeachingBubble scene="guide"><p>Нужно задать вопрос по теме Sport со словом Abend.</p></OttoTeachingBubble>
      </div>}

      {screen===1&&<div className="mt-6"><OttoTeachingBubble scene="guide"><SourceParagraphs text={TEIL2_APPROVED_EXPLANATIONS[1]}/></OttoTeachingBubble></div>}

      {screen===2&&<div className="mt-6 space-y-5">
        <OttoTeachingBubble scene="guide"><p>В нашем случае (Thema: Sport, целевое слово – Abend) отлично подойдет вопрос Machen Sie …? (Занимаетесь ли вы…?).</p></OttoTeachingBubble>
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoTile label="Thema" value="Sport"/>
          <InfoTile label="Целевое слово" value="Abend"/>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-violet-700">Шаблон</p><div className="mt-3"><LearningGermanLine text="Machen Sie …?" translation="Занимаетесь ли вы…?" showTranslation className="text-xl font-black"/></div></div>
        <OttoTeachingBubble scene="guide"><p>Мы сконструируем максимально простой вопрос, отвечающий требованиям задания:</p></OttoTeachingBubble>
        <GermanExample text="Machen Sie Sport am Abend?" translation="Занимаетесь ли вы спортом вечером?"/>
      </div>}

      {screen===3&&<div className="mt-6 space-y-5">
        <GermanExample text="Machen Sie Sport am Abend?" translation="Занимаетесь ли вы спортом вечером?"/>
        <OttoTeachingBubble scene="guide"><p>Давайте разберем, почему мы задали вопрос именно так и почему это наиболее простой способ выполнять это задание.</p><p className="mt-3">1. Мы используем типовой универсальный вопрос. Не нужно глубоко погружаться в немецкий язык, чтобы справиться с этим заданием. Вы должны лишь запомнить 10-15 наиболее универсальных вопросов.</p></OttoTeachingBubble>
      </div>}

      {screen===4&&<div className="mt-6 space-y-5">
        <OttoTeachingBubble scene="guide"><SourceParagraphs text={TEIL2_APPROVED_EXPLANATIONS[4]}/></OttoTeachingBubble>
        <div className="grid gap-4 lg:grid-cols-2">
          <div><p className="mb-2 text-xs font-black uppercase tracking-wider text-teal-700">Основной вариант</p><GermanExample text="Machen Sie Sport am Abend?" translation="Занимаетесь ли вы спортом вечером?"/></div>
          <div><p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Для сравнения</p><GermanExample text="Machst du Sport am Abend?" translation="Ты занимаешься спортом вечером?"/></div>
        </div>
      </div>}

      {screen===5&&<div className="mt-6 space-y-5">
        <OttoTeachingBubble scene="guide"><p>3. Мы задали вопрос по заданной теме. В данном случае нам повезло, и мы смогли использовать тему как слово в нашем вопросе. Само понятие “спорт” довольно широкое, и использовать это слово при составлении вопроса очень удобно.</p></OttoTeachingBubble>
        <div className="rounded-2xl border bg-slate-50 p-5">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Thema</p>
          <b className="mt-2 block text-3xl">Sport</b>
          <div className="my-4 text-2xl text-slate-300">↓</div>
          <div className="grid gap-3 sm:grid-cols-2"><InfoTile label="Можно использовать непосредственно" value="Sport"/><InfoTile label="Или конкретное действие по теме" value="Schwimmen"/></div>
        </div>
        <p className="font-bold text-slate-800">При этом, мы могли задать вопрос и так:</p>
        <GermanExample text="Schwimmen Sie am Abend?" translation="Плаваете ли вы вечером?"/>
        <OttoTeachingBubble scene="guide"><p>И это тоже было бы правильно, ведь плавание относится к спорту.</p></OttoTeachingBubble>
      </div>}

      {screen===6&&<div className="mt-6 space-y-5">
        <OttoTeachingBubble scene="guide"><SourceParagraphs text={TEIL2_APPROVED_EXPLANATIONS[6]}/></OttoTeachingBubble>
        <div className="rounded-2xl border bg-slate-50 p-5 text-center">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Целевое слово</p>
          <b className="mt-2 block text-3xl">Abend</b>
          <div className="my-3 text-3xl text-slate-300">↓</div>
          <div className="mx-auto max-w-md"><GermanExample text="am Abend" translation="вечером"/></div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="text-2xl font-black text-emerald-950">Теперь попробуем сами</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button onClick={onStartPractice} className="min-h-12 rounded-xl bg-slate-900 px-5 font-black text-white">Начать практику Teil 2</button>
            <button onClick={onRestart} className="min-h-12 rounded-xl border bg-white px-5 font-bold">Вернуться в начало объяснения Teil 2</button>
          </div>
        </div>
      </div>}

      {screen<6?<div className="mt-7 grid grid-cols-2 gap-3"><BottomStepBack onClick={onBack}/><button onClick={onNext} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 font-black text-white">Далее <ArrowRight className="h-4 w-4"/></button></div>:<div className="mt-5"><BottomStepBack onClick={onBack}/></div>}
    </Card>
    {onReturnToTask&&<div className="mt-3"><button onClick={onReturnToTask} className="min-h-11 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-900">Вернуться к заданию</button></div>}
  </section>;
}

function SourceParagraphs({text}:{text:string}){
  return <>{text.split(/\n\s*\n/).map((paragraph,index)=><p key={index} className={index?'mt-3':''}>{paragraph}</p>)}</>;
}

function InfoTile({label,value}:{label:string;value:string}){
  return <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p><b className="mt-2 block text-2xl text-slate-950">{value}</b></div>;
}

function ApprovedSportAbendCard(){
  return <div className="mx-auto max-w-xl overflow-hidden rounded-[26px] border-2 border-slate-300 bg-[#fffefa] shadow-sm">
    <div className="border-b border-slate-200 bg-slate-100 px-5 py-3"><span className="text-xs font-black uppercase tracking-[.14em] text-slate-500">Thema</span><b className="mt-1 block text-2xl text-slate-950">{TEIL2_EXPLANATION_CARD.theme}</b></div>
    <div className="grid min-h-[220px] place-items-center p-8 text-center"><div><span className="text-xs font-black uppercase tracking-[.14em] text-slate-400">Karte</span><b className="mt-3 block text-5xl text-slate-950">{TEIL2_EXPLANATION_CARD.keyword}</b></div></div>
  </div>;
}

function GermanExample({text,translation}:{text:string;translation:string}){
  return <div className="rounded-2xl border border-sky-200 bg-white p-4 shadow-sm"><LearningGermanLine text={text} translation={translation} showTranslation className="text-lg font-black leading-7"/></div>;
}

function Teil2GuidedPractice({
  onBack,onDone,onPartSelect,onModules,onTraining,
}:{
  onBack:()=>void;onDone:()=>void;onPartSelect:()=>void;onModules:()=>void;onTraining:()=>void;
}){
  const card=TEIL2_SIX[0];
  const[showHint,setShowHint]=useState(false);
  const[showTranslation,setShowTranslation]=useState(false);
  const[showSample,setShowSample]=useState(false);
  const[attempted,setAttempted]=useState(false);
  const[showContinueHint,setShowContinueHint]=useState(false);
  const[showExplanation,setShowExplanation]=useState(false);
  const[explanationIndex,setExplanationIndex]=useState(0);

  const openExplanation=()=>{setExplanationIndex(0);setShowExplanation(true)};
  return <section>
    
    <Card>
      <p className="otto-kicker">ПОДРОБНЫЙ ПРАКТИЧЕСКИЙ ПРИМЕР · {card.id}</p>
      <h1 className="mt-2 text-3xl font-black">Теперь составьте вопрос сами</h1>
      <SpeakingTeil2Card card={card} showTranslations={showTranslation}/>
      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={()=>setShowHint(v=>!v)} className="min-h-10 rounded-xl border bg-white px-4 text-sm font-bold">Подсказка</button>
        <button onClick={()=>setShowTranslation(v=>!v)} className="min-h-10 rounded-xl border bg-white px-4 text-sm font-bold">{showTranslation?'Скрыть перевод':'Посмотреть перевод'}</button>
        <button onClick={openExplanation} className="min-h-10 rounded-xl border bg-white px-4 text-sm font-bold">Посмотреть объяснение</button>
        <button onClick={()=>speakGerman(card.keyword)} className="min-h-10 rounded-xl border border-teal-200 bg-teal-50 px-4 text-sm font-bold text-teal-900">🔊 {card.keyword}</button>
      </div>
      {showHint&&<div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-slate-800">Используйте тему <b>{card.theme}</b> и целевое слово <b>{card.keyword}</b>. Сформулируйте один короткий вопрос.</div>}
      <div className="mt-5"><VoiceRecorder evaluation={{mode:'teil2',theme:card.theme,keyword:card.keyword,sampleQuestion:card.sampleQuestion}} onPracticed={()=>setAttempted(true)} onEvaluated={()=>setAttempted(true)} hint="Составьте вопрос самостоятельно и скажите его вслух."/></div>
      {attempted&&<button onClick={()=>setShowSample(v=>!v)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-bold"><Eye className="h-4 w-4"/>{showSample?'Скрыть исходный образец':'Показать исходный образец после ответа'}</button>}
      {attempted&&showSample&&<div className="mt-3"><AudioExample label="Frage" text={card.sampleQuestion}/><AudioExample label="Antwort" text={card.sampleAnswer}/></div>}
      <div className="mt-6"><button onClick={onDone} className="min-h-12 rounded-xl border bg-white px-5 font-bold">Пропустить</button><div className="mt-3 grid grid-cols-2 gap-3"><BottomStepBack onClick={onBack}/><button onClick={()=>attempted?onDone():setShowContinueHint(true)} className="min-h-12 rounded-xl bg-slate-900 px-3 font-black text-white">Перейти к практике 1 из 5 <ArrowRight className="ml-2 inline h-4 w-4"/></button></div>{showContinueHint&&!attempted&&<p role="status" className="mt-3 text-sm font-bold text-amber-900">Чтобы продолжить, запишите или загрузите ответ. Если не хотите записывать — используйте «Пропустить».</p>}</div>
    </Card>
    {showExplanation&&<Teil2ExplanationOverlay index={explanationIndex} onIndex={setExplanationIndex} onClose={()=>setShowExplanation(false)} onTraining={onTraining} onPartSelect={onPartSelect} onModules={onModules}/>}
  </section>;
}

function Teil2Practice({
  index,onBack,onDone,onPartSelect,onModules,onTraining,
}:{
  index:number;onBack:()=>void;onDone:()=>void;onPartSelect:()=>void;onModules:()=>void;onTraining:()=>void;
}){
  const card=TEIL2_SIX[index+1];
  const[showSample,setShowSample]=useState(false);
  const[showHint,setShowHint]=useState(false);
  const[showTranslation,setShowTranslation]=useState(false);
  const[attempted,setAttempted]=useState(false);
  const[showContinueHint,setShowContinueHint]=useState(false);
  const[showExplanation,setShowExplanation]=useState(false);
  const[explanationIndex,setExplanationIndex]=useState(0);

  const openExplanation=()=>{setExplanationIndex(0);setShowExplanation(true)};
  return <section>
    
    <Card>
      <p className="otto-kicker">ПРАКТИКА TEIL 2 · {index+1} ИЗ 5</p>
      <SpeakingTeil2Card card={card} showTranslations={showTranslation}/>
      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={()=>setShowHint(v=>!v)} className="min-h-10 rounded-xl border bg-white px-4 text-sm font-bold">Подсказка</button>
        <button onClick={()=>setShowTranslation(v=>!v)} className="min-h-10 rounded-xl border bg-white px-4 text-sm font-bold">{showTranslation?'Скрыть перевод':'Посмотреть перевод'}</button>
        <button onClick={openExplanation} className="min-h-10 rounded-xl border bg-white px-4 text-sm font-bold">Посмотреть объяснение</button>
        <button onClick={()=>speakGerman(card.keyword)} className="min-h-10 rounded-xl border border-teal-200 bg-teal-50 px-4 text-sm font-bold text-teal-900">🔊 {card.keyword}</button>
      </div>
      {showHint&&<p className="mt-4 rounded-xl bg-teal-50 p-3 text-sm leading-6 text-teal-950">Подсказка: используйте тему <b>{card.theme}</b> и слово <b>{card.keyword}</b>. Сформулируйте короткий вопрос.</p>}
      <div className="mt-5"><VoiceRecorder evaluation={{mode:'teil2',theme:card.theme,keyword:card.keyword,sampleQuestion:card.sampleQuestion}} onPracticed={()=>setAttempted(true)} onEvaluated={()=>setAttempted(true)} hint={index>=4?'Сформулируйте вопрос самостоятельно.':'Сформулируйте вопрос по карточке.'}/></div>
      {attempted&&<button onClick={()=>setShowSample(v=>!v)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-bold"><Eye className="h-4 w-4"/>{showSample?'Скрыть образец':'Показать исходный образец после ответа'}</button>}
      {attempted&&showSample&&<div className="mt-3"><AudioExample label="Frage" text={card.sampleQuestion}/><AudioExample label="Antwort" text={card.sampleAnswer}/></div>}
      <div className="mt-6"><button onClick={onDone} className="min-h-12 rounded-xl border bg-white px-5 font-bold">Пропустить</button><div className="mt-3 grid grid-cols-2 gap-3"><BottomStepBack onClick={onBack}/><button onClick={()=>attempted?onDone():setShowContinueHint(true)} className="min-h-12 rounded-xl bg-slate-900 px-3 font-black text-white">{index===4?'Завершить Teil 2':'Следующая карточка'} <ArrowRight className="ml-2 inline h-4 w-4"/></button></div>{showContinueHint&&!attempted&&<p role="status" className="mt-3 text-sm font-bold text-amber-900">Чтобы продолжить, запишите или загрузите ответ. Если не хотите записывать — используйте «Пропустить».</p>}</div>
    </Card>
    {showExplanation&&<Teil2ExplanationOverlay index={explanationIndex} onIndex={setExplanationIndex} onClose={()=>setShowExplanation(false)} onTraining={onTraining} onPartSelect={onPartSelect} onModules={onModules}/>}
  </section>;
}

function Teil2ExplanationOverlay({
  index,onIndex,onClose,onTraining,onPartSelect,onModules,
}:{
  index:number;onIndex:(value:number)=>void;onClose:()=>void;onTraining:()=>void;onPartSelect:()=>void;onModules:()=>void;
}){
  return <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-100/95 px-3 py-4 backdrop-blur-sm sm:px-5">
    <div className="mx-auto w-full max-w-[1120px]">
      <Teil2ExplanationScreen
        index={index}
        onBack={()=>index>0?onIndex(index-1):onClose()}
        onNext={()=>onIndex(Math.min(6,index+1))}
        onRestart={()=>onIndex(0)}
        onStartPractice={onClose}
        onTraining={onTraining}
        onPartSelect={onPartSelect}
        onModules={onModules}
        onReturnToTask={onClose}
      />
    </div>
  </div>;
}

function SpeakingTeil2Card({card,showTranslations=true}:{card:(typeof speakingTeil2Cards)[number];showTranslations?:boolean}){
  return <div className="mt-5 overflow-hidden rounded-2xl border border-slate-300 bg-white">
    <div className="border-b bg-slate-100 px-5 py-3">
      <span className="text-sm font-semibold text-slate-500">Thema</span>
      <div className="mt-1 flex items-center gap-2"><b className="min-w-0 flex-1 text-lg text-slate-950">{card.theme}</b><button type="button" onClick={()=>speakGerman(card.theme)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-teal-200 bg-white text-teal-800" aria-label={'Прослушать '+card.theme}><Volume2 className="h-4 w-4"/></button></div>
      {showTranslations&&<p className="mt-1 text-sm text-slate-600">🇷🇺 {card.themeRu}</p>}
    </div>
    <div className="flex min-h-[170px] items-center justify-center p-6 text-center">
      <div className="w-full"><div className="flex items-center justify-center gap-2"><b className="text-4xl text-slate-950">{card.keyword}</b><button type="button" onClick={()=>speakGerman(card.keyword)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-teal-200 bg-white text-teal-800" aria-label={'Прослушать '+card.keyword}><Volume2 className="h-4 w-4"/></button></div>{showTranslations&&<p className="mt-2 text-sm text-slate-600">🇷🇺 {card.keywordRu}</p>}</div>
    </div>
  </div>;
}

function Teil3Detail({
  index,onBack,onNext,onDone,onPartSelect,onModules,onTraining,
}:{
  index:number;onBack:()=>void;onNext:()=>void;onDone:()=>void;onPartSelect:()=>void;onModules:()=>void;onTraining:()=>void;
}){
  return <Teil3ExplanationScreen
    index={index}
    onBack={onBack}
    onNext={onNext}
    onPractice={onDone}
    onTraining={onTraining}
    onPartSelect={onPartSelect}
    onModules={onModules}
  />;
}

function Teil3ExplanationScreen({
  index,onBack,onNext,onPractice,onTraining,onReturnToTask,
}:{
  index:number;
  onBack:()=>void;
  onNext:()=>void;
  onPractice:()=>void;
  onTraining:()=>void;
  onPartSelect:()=>void;
  onModules:()=>void;
  onReturnToTask?:()=>void;
}){
  const screen=Math.max(0,Math.min(7,index));
  const butter=TEIL3_SIX[0];

  return <section>
    
    
    <Card>
      <p className="otto-kicker">SPRECHEN · TEIL 3 · {screen+1}/8</p>

      {screen===0&&<div className="mt-4 space-y-5">
        <div className="rounded-2xl border bg-slate-50 p-5 text-[17px] leading-7 text-slate-800">
          <p>В модуле <b>Sprechen</b> вас также попросят выполнить <b>3 задание (Teil 3).</b></p>
          <p className="mt-4">Вы будете должны сформулировать вежливую просьбу, используя картинку на карточке.</p>
          <p className="mt-4">Экзаменатор даст вам карточку примерно такого вида:</p>
        </div>
        <div className="mx-auto max-w-md rounded-2xl border bg-white p-4 shadow-sm">
          <Teil3ArchiveImage imageIndex={butter.imageIndex} alt="Butter" className="mx-auto w-full max-w-[340px] rounded-xl"/>
        </div>
        <div className="rounded-2xl border bg-white p-5 text-[17px] leading-7 text-slate-800">
          <p>На картинке изображён предмет.<br/>В данном случае это масло.<br/>Вам нужно попросить собеседника о том, чтобы он дал вам этот предмет.</p>
          <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 p-4 text-[16px] leading-7 text-slate-800">
            <p><b>Просьба не всегда должна буквально называть предмет на картинке.</b> Нужно понять, какое действие логично связано с изображением.</p>
            <p className="mt-3">Если на картинке телефон — можно попросить позвонить или дать воспользоваться телефоном.</p>
            <p className="mt-3">Если на картинке чемодан — можно попросить помочь его нести.</p>
            <p className="mt-3">Если на картинке предмет — можно попросить его дать, принести, подать или сделать другое логичное действие, связанное с картинкой.</p>
            <p className="mt-3"><b>Главное — составить вежливую просьбу, которая логично связана с картинкой.</b></p>
          </div>
        </div>
      </div>}

      {screen===1&&<div className="mt-4 space-y-5">
        <div className="rounded-2xl border bg-slate-50 p-5 text-[17px] leading-7 text-slate-800">
          <p>Теперь давайте рассмотрим, как выполнить это задание так, чтобы вам не пришлось строить сложные грамматические конструкции и занизить свой балл.</p>
          <p className="mt-4">В этом задании мы используем простые и типовые фразы для просьбы. Список этих фраз небольшой, но пользуясь ими вы сможете выполнить практически любой вариант этого задания.</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-emerald-200 bg-white text-teal-800"><BookOpen className="h-6 w-6"/></span>
            <div className="min-w-0 text-[16px] leading-7 text-slate-800">
              <p><b>Умные карточки — ваши личные подсказки.</b></p>
              <p className="mt-4">В Справочнике OTTO вы можете сохранять всё, что считаете важным запомнить: слова, правила, числа, примеры, вопросы, просьбы и шаблоны писем.</p>
              <div className="mt-4 flex min-h-12 w-full items-center gap-3 rounded-xl border border-teal-200 bg-white px-4 py-3 font-black text-teal-900" aria-label="Умные карточки">
                <Bookmark className="h-5 w-5 shrink-0" aria-hidden="true"/><span>Умные карточки</span>
              </div>
              <p className="mt-4"><b>Значок «Умные карточки» находится в реальном тренажёре внизу слева.</b></p>
              <p className="mt-4">При нажатии на него откроется всё, что вы сохранили из Справочника.</p>
              <p className="mt-4">Добавляйте туда нужные материалы, чтобы во время тренировок быстро повторять их и не возвращаться каждый раз в Справочник.</p>
            </div>
          </div>
        </div>
      </div>}

      {screen===2&&<div className="mt-4 space-y-5">
        <div className="rounded-2xl border bg-slate-50 p-5 text-[17px] leading-7 text-slate-800">
          <p>В нашем случае на картинке масло.<br/>Мы выбираем одну из типовых фраз и добавляем нужное слово.</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <h2 className="text-xl font-black">Шаблоны просьбы:</h2>
          <div className="mt-4 space-y-3">{TEIL3_REQUEST_TEMPLATES.map(item=><GermanExample key={item.de} text={item.de} translation={item.ru}/>)}</div>
        </div>
      </div>}

      {screen===3&&<div className="mt-4 space-y-5">
        <div className="rounded-2xl border bg-slate-50 p-5 text-[17px] leading-7 text-slate-800">
          <p>В нашем примере мы используем слово из картинки – Butter – и получаем готовую фразу.</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <h2 className="text-lg font-black">Готовая фраза:</h2>
          <div className="mt-3"><GermanExample text="Geben Sie mir bitte Butter." translation="Дайте мне, пожалуйста, масло."/></div>
        </div>
        <div className="rounded-2xl border bg-white p-5 text-[17px] leading-7 text-slate-800">
          <p>Это простая и вежливая фраза, которая полностью подходит для этого задания.</p>
          <p className="mt-5">Вы можете использовать и другой подходящий глагол из шаблонов, например:</p>
          <div className="mt-3"><GermanExample text="Bringen Sie mir bitte Butter." translation="Принесите мне, пожалуйста, масло."/></div>
        </div>
      </div>}

      {screen===4&&<div className="mt-4 space-y-5">
        <div className="rounded-2xl border bg-slate-50 p-5 text-[17px] leading-7 text-slate-800">
          <p>Мы всегда обращаемся к собеседнику на "Вы" (Sie). Делая это, вы избавляете себя от необходимости перестраивать глагол под другое местоимение.</p>
          <p className="mt-5">Если бы мы обращались к собеседнику на "Ты", то фраза звучала бы так:</p>
        </div>
        <GermanExample text="Gib mir bitte Butter." translation="Дай мне, пожалуйста, масло."/>
        <div className="rounded-2xl border bg-white p-5 text-[17px] leading-7 text-slate-800">
          <p>Но на экзамене всегда нужно использовать вежливую форму обращения на "Вы" (Sie).</p>
        </div>
      </div>}

      {screen===5&&<div className="mt-4 space-y-5">
        <div className="rounded-2xl border bg-slate-50 p-5 text-[17px] leading-7 text-slate-800">
          <p>В зависимости от того, какой предмет изображён на картинке, мы используем то же самое слово и тот же шаблон.</p>
          <p className="mt-5">Например, если на картинке вода, мы можем сказать:</p>
        </div>
        <div className="space-y-3">
          <GermanExample text="Geben Sie mir bitte Wasser." translation="Дайте мне, пожалуйста, воду."/>
          <GermanExample text="Bringen Sie mir bitte Wasser." translation="Принесите мне, пожалуйста, воду."/>
          <GermanExample text="Reichen Sie mir bitte Wasser." translation="Подайте мне, пожалуйста, воду."/>
        </div>
        <div className="rounded-2xl border bg-white p-5 text-[17px] leading-7 text-slate-800">
          <p>Главное — выбрать подходящий шаблон и использовать слово с картинки.</p>
          <p className="mt-4 text-[16px]"><b>Действие выбирайте по смыслу картинки:</b> предмет можно попросить дать, принести, подать, использовать и т. д.</p>
        </div>
      </div>}

      {screen===6&&<div className="mt-4 space-y-5">
        <div className="rounded-2xl border bg-slate-50 p-5 text-[17px] leading-7 text-slate-800">
          <p>Иногда на картинке предмет перечёркнут. Это означает, что этого нельзя делать, и мы вежливо просим собеседника не делать это.</p>
        </div>
        <NoSmokingIllustration/>
        <div className="rounded-2xl border bg-white p-5 text-[17px] leading-7 text-slate-800">
          <p>На картинке сигарета перечёркнута.<br/>Мы используем тот же шаблон, но в конце добавляем слово <b>nicht.</b></p>
        </div>
        <GermanExample text="Rauchen Sie hier bitte nicht." translation="Не курите здесь, пожалуйста."/>
      </div>}

      {screen===7&&<div className="mt-4 space-y-5">
        <div className="rounded-2xl border bg-slate-50 p-5 text-[17px] leading-7 text-slate-800">
          <p>Чаще всего на экзамене достаточно простого и короткого ответа.<br/>Вы можете использовать такие варианты:</p>
        </div>
        <div className="space-y-3">{TEIL3_RESPONSE_TEMPLATES.map(item=><GermanExample key={item.de} text={item.de} translation={item.ru}/>)}</div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-emerald-200 bg-white text-teal-800"><BookOpen className="h-6 w-6"/></span>
            <p className="text-[16px] leading-7 text-slate-800">Эти и другие шаблоны ответов вы всегда можете посмотреть в <b>Справочнике OTTO.</b></p>
          </div>
        </div>
      </div>}

      {screen<7
        ? <div className="mt-7 grid grid-cols-2 gap-3"><BottomStepBack onClick={onBack}/><button onClick={onNext} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 font-black text-white">Далее <ArrowRight className="h-4 w-4"/></button></div>
        : <div className="mt-7 grid grid-cols-2 gap-3"><BottomStepBack onClick={onBack}/><button onClick={onPractice} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-800 px-3 font-black text-white">Перейти к практике <ArrowRight className="h-4 w-4"/></button></div>}
    </Card>
    {onReturnToTask&&<div className="mt-3"><button onClick={onReturnToTask} className="min-h-11 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-900">Вернуться к заданию</button></div>}
  </section>;
}

function NoSmokingIllustration(){
  return <div className="mx-auto max-w-md rounded-2xl border bg-white p-5 shadow-sm" aria-label="Перечёркнутая сигарета">
    <svg viewBox="0 0 360 170" role="img" aria-hidden="true" className="mx-auto h-auto w-full max-w-[330px]">
      <defs>
        <linearGradient id="cig-paper" x1="0" x2="1"><stop offset="0" stopColor="#f7f7f4"/><stop offset="1" stopColor="#d8d8d2"/></linearGradient>
        <linearGradient id="cig-filter" x1="0" x2="1"><stop offset="0" stopColor="#d69b47"/><stop offset="1" stopColor="#b97827"/></linearGradient>
      </defs>
      <g transform="rotate(-12 180 85)">
        <rect x="70" y="70" width="160" height="38" rx="18" fill="url(#cig-paper)" stroke="#c8c8c2"/>
        <rect x="220" y="70" width="72" height="38" rx="9" fill="url(#cig-filter)" stroke="#b8792b"/>
        <line x1="232" y1="73" x2="232" y2="105" stroke="#e6b66f" strokeWidth="2"/>
        <line x1="247" y1="73" x2="247" y2="105" stroke="#e6b66f" strokeWidth="2"/>
        <line x1="262" y1="73" x2="262" y2="105" stroke="#e6b66f" strokeWidth="2"/>
        <ellipse cx="70" cy="89" rx="7" ry="16" fill="#c9c9c5"/>
      </g>
      <line x1="72" y1="32" x2="292" y2="138" stroke="#e11d1d" strokeWidth="10" strokeLinecap="round"/>
      <line x1="288" y1="30" x2="76" y2="140" stroke="#e11d1d" strokeWidth="10" strokeLinecap="round"/>
    </svg>
  </div>;
}

function Teil3PracticeLearning({
  index,onBack,onDone,onPartSelect,onModules,onTraining,
}:{
  index:number;onBack:()=>void;onDone:()=>void;onPartSelect:()=>void;onModules:()=>void;onTraining:()=>void;
}){
  const card=TEIL3_SIX[index+1];
  const[showSample,setShowSample]=useState(false);
  const[attempted,setAttempted]=useState(false);
  const[pronunciationSkipped,setPronunciationSkipped]=useState(false);
  const[showContinueHint,setShowContinueHint]=useState(false);
  const[showExplanation,setShowExplanation]=useState(false);
  const[explanationIndex,setExplanationIndex]=useState(0);
  const[showReference,setShowReference]=useState(false);
  const canContinue=attempted||pronunciationSkipped;
  const openExplanation=()=>{setExplanationIndex(0);setShowExplanation(true)};

  return <section>
    
    <Card>
      <p className="otto-kicker">ПРАКТИКА TEIL 3 · {index+1} ИЗ 5</p>
      <Teil3SourceCard card={card}/>
      {index<2&&<p className="mt-4 rounded-xl bg-teal-50 p-3 text-sm leading-6 text-teal-950">Сформулируйте короткую просьбу по изображению. Используйте только то, что видите на исходной карточке.</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={()=>setShowReference(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-bold"><BookOpen className="h-4 w-4"/>Справочник</button>
        <button onClick={openExplanation} className="min-h-10 rounded-xl border bg-white px-4 text-sm font-bold">Посмотреть объяснение</button>
        <button onClick={()=>speakGerman(card.sampleRequest)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 text-sm font-bold text-teal-900"><Volume2 className="h-4 w-4"/>Прослушать немецкий пример</button>
      </div>

      <div className="mt-5"><VoiceRecorder evaluation={{mode:'teil3',object:card.alt,sampleRequest:card.sampleRequest}} onPracticed={()=>setAttempted(true)} onEvaluated={()=>setAttempted(true)} hint={index===4?'Почти без подсказок: просьба по карточке.':'Скажите просьбу вслух.'}/></div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={()=>setPronunciationSkipped(true)} className="min-h-11 rounded-xl border bg-white px-4 font-bold">Пропустить произношение</button>
        <button onClick={onDone} className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 font-bold"><SkipForward className="h-4 w-4"/>Пропустить задание</button>
      </div>

      {canContinue&&<button onClick={()=>setShowSample(v=>!v)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-bold"><Eye className="h-4 w-4"/>{showSample?'Скрыть образец':'Показать исходный образец после ответа'}</button>}
      {canContinue&&showSample&&<div className="mt-3"><AudioExample label="Bitte" text={card.sampleRequest}/><AudioExample label="Reaktion" text={card.sampleReaction}/></div>}

      <div className="mt-5 grid grid-cols-2 gap-3"><BottomStepBack onClick={onBack}/><button onClick={()=>canContinue?onDone():setShowContinueHint(true)} className="min-h-12 w-full rounded-xl bg-slate-900 px-3 font-black text-white">{index===4?'Завершить Teil 3':'Следующая карточка'} <ArrowRight className="ml-2 inline h-4 w-4"/></button></div>
      {showContinueHint&&!canContinue&&<p role="status" className="mt-3 text-sm font-bold text-amber-900">Чтобы продолжить, запишите или загрузите ответ. Если не хотите записывать — используйте «Пропустить».</p>}
    </Card>

    {showExplanation&&<Teil3ExplanationOverlay
      index={explanationIndex}
      onIndex={setExplanationIndex}
      onClose={()=>setShowExplanation(false)}
      onTraining={onTraining}
      onPartSelect={onPartSelect}
      onModules={onModules}
    />}
    {showReference&&<Teil3ReferenceOverlay onClose={()=>setShowReference(false)} onPartSelect={onPartSelect} onModules={onModules}/>}
  </section>;
}

function Teil3ExplanationOverlay({
  index,onIndex,onClose,onTraining,onPartSelect,onModules,
}:{
  index:number;onIndex:(value:number)=>void;onClose:()=>void;onTraining:()=>void;onPartSelect:()=>void;onModules:()=>void;
}){
  return <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-100/95 px-3 py-4 backdrop-blur-sm sm:px-5">
    <div className="mx-auto w-full max-w-[1120px]">
      <Teil3ExplanationScreen
        index={index}
        onBack={()=>index>0?onIndex(index-1):onClose()}
        onNext={()=>onIndex(Math.min(7,index+1))}
        onPractice={onClose}
        onTraining={onTraining}
        onPartSelect={onPartSelect}
        onModules={onModules}
        onReturnToTask={onClose}
      />
    </div>
  </div>;
}

function Teil3ReferenceOverlay({onClose,onPartSelect,onModules}:{onClose:()=>void;onPartSelect:()=>void;onModules:()=>void}){
  return <div className="fixed inset-0 z-[95] overflow-y-auto bg-slate-100/95 px-3 py-4 backdrop-blur-sm sm:px-5">
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={onClose} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 font-bold text-emerald-900"><ArrowLeft className="h-4 w-4"/>Вернуться к заданию</button>
        <div className="ml-auto flex flex-wrap gap-2">
          <button onClick={onPartSelect} className="min-h-11 rounded-xl border bg-white px-4 text-sm font-bold">К выбору Teil</button>
          <button onClick={onModules} className="min-h-11 rounded-xl border bg-white px-4 text-sm font-bold">К выбору модулей</button>
        </div>
      </div>
      <Card>
        <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-full border border-emerald-200 bg-emerald-50 text-teal-800"><BookOpen className="h-6 w-6"/></span><div><p className="otto-kicker">СПРАВОЧНИК OTTO</p><h1 className="mt-1 text-3xl font-black">Sprechen · Teil 3</h1></div></div>
        <h2 className="mt-6 text-xl font-black">Шаблоны просьбы</h2>
        <div className="mt-3 space-y-3">{TEIL3_REQUEST_TEMPLATES.map(item=><GermanExample key={item.de} text={item.de} translation={item.ru}/>)}</div>
        <h2 className="mt-7 text-xl font-black">Короткие ответы</h2>
        <div className="mt-3 space-y-3">{TEIL3_RESPONSE_TEMPLATES.map(item=><GermanExample key={item.de} text={item.de} translation={item.ru}/>)}</div>
      </Card>
    </div>
  </div>;
}

function Teil3SourceCard({card}:{card:(typeof speakingTeil3ArchiveCards)[number]}){
  return <div className="mx-auto mt-5 max-w-md overflow-hidden rounded-2xl border border-slate-300 bg-white"><div className="bg-slate-100 px-4 py-2 text-center text-xs font-black uppercase tracking-wider">Teil 3 · {card.id}</div><div className="p-4"><Teil3ArchiveImage imageIndex={card.imageIndex} alt={card.alt} className="mx-auto w-full max-w-[330px] rounded-xl"/><div className="mt-3"><LearningGermanLine text={card.alt} showTranslation className="text-center text-lg font-black"/></div></div></div>;
}

function AudioExample({label,text}:{label:string;text:string}){return <div className="mt-3 rounded-xl border bg-white p-3"><span className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</span><div className="mt-1"><LearningGermanLine text={text} showTranslation className="font-bold leading-6"/></div></div>}

function BottomStepBack({onClick}:{onClick:()=>void}){return <button type="button" onClick={onClick} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-white px-3 font-bold"><ArrowLeft className="h-4 w-4 shrink-0"/>Назад</button>}

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
