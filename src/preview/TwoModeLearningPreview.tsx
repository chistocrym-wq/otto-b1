import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Headphones,
  GraduationCap,
  Hash,
  Mic,
  Smartphone,
  Languages,
  PenLine,
  RotateCcw,
  Settings2,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { OttoScene } from '@/components/OttoScene';
import { VoiceRecorder } from '@/components/sprechen/VoiceRecorder';
import { cn } from '@/lib/utils';
import { SchreibenLearningStage } from '@/preview/SchreibenLearningStage';
import { FormularLearningStage } from '@/preview/FormularLearningStage';
import type { LearningPart, LearningPartLocation, PartNavigationCommand } from '@/preview/TeilNavigation';
import { SprechenLearningStage } from '@/preview/SprechenLearningStage';
import { FloatingOttoReferenceButtons, OttoReferenceOverlay, type OttoReferenceSection } from '@/components/OttoReferenceOverlay';
import { OttoReferenceOnboarding, markReferenceIntroSeen } from '@/preview/OttoReferenceOnboarding';
import { OttoQuickTour, hasSeenOttoTour } from '@/preview/OttoQuickTour';
import { OttoBeginnerStudyPlan } from '@/preview/OttoBeginnerStudyPlan';
import type { BottomTab } from '@/components/BottomNav';

export type PreviewOttoMode='learning'|'training';

type CategoryId='pronouns'|'verbs'|'nouns'|'conjunctions';
type WordItem={key?:string;de:string;ru:string;example:string;article?:string;caseLabel?:'Nominativ'|'Akkusativ'|'Dativ'};
type Exercise={
  id:string;
  kind:'learn'|'meaning'|'listen'|'listenOnly'|'speak'|'type'|'blank'|'build'|'structure'|'article';
  title:string;
  wordKey?:string;
  skipWhenKnown?:boolean;
  de?:string;
  ru?:string;
  prompt?:string;
  answer?:string;
  options?:string[];
  sentence?:string;
  translation?:string;
  parts?:Array<{text:string;label:string}>;
  tiles?:string[];
};

type LearningProgress={
  known:string[];
  weak:string[];
  completedCategories:CategoryId[];
  stage:'intro'|'categories'|'lesson'|'next'|'form'|'step3'|'step2';
  currentCategory:CategoryId|null;
  currentExercise:number;
};

const MODE_STORAGE_PREFIX='otto-preview-app-mode-v2:';
const LEARNING_STORAGE_PREFIX='otto-preview-learning-v2:';
const LEARNING_LOCATION_PREFIX='otto-preview-learning-location-v1:';
type LearningModuleLocation='schreiben'|'hub'|'sprechen';
function readLearningModuleLocation(userId?:string):LearningModuleLocation|null{
  if(!userId)return null;
  try{
    const saved=localStorage.getItem(LEARNING_LOCATION_PREFIX+userId);
    return saved==='lesen'||saved==='horen'?'hub':saved==='schreiben'||saved==='hub'||saved==='sprechen'?saved:null;
  }catch{return null}
}
function saveLearningModuleLocation(value:LearningModuleLocation,userId?:string){
  if(!userId)return;
  try{localStorage.setItem(LEARNING_LOCATION_PREFIX+userId,value)}catch{}
}


export function readPreviewOttoMode(userId?:string):PreviewOttoMode|null{
  try{
    const value=localStorage.getItem(MODE_STORAGE_PREFIX+(userId||'local'));
    return value==='learning'||value==='training'?value:null;
  }catch{return null}
}
export function savePreviewOttoMode(mode:PreviewOttoMode,userId?:string){
  try{localStorage.setItem(MODE_STORAGE_PREFIX+(userId||'local'),mode)}catch{}
}

function emptyProgress():LearningProgress{
  return {known:[],weak:[],completedCategories:[],stage:'intro',currentCategory:null,currentExercise:0};
}
function readLearningProgress(userId?:string):LearningProgress{
  try{
    const raw=localStorage.getItem(LEARNING_STORAGE_PREFIX+(userId||'local'));
    if(!raw)return emptyProgress();
    const parsed=JSON.parse(raw) as Partial<LearningProgress>;
    return {
      known:Array.isArray(parsed.known)?parsed.known.filter(v=>typeof v==='string'):[],
      weak:Array.isArray(parsed.weak)?parsed.weak.filter(v=>typeof v==='string'):[],
      completedCategories:Array.isArray(parsed.completedCategories)?parsed.completedCategories.filter((v):v is CategoryId=>['pronouns','verbs','nouns','conjunctions'].includes(String(v))):[],
      stage:parsed.stage==='step2'?'step3':parsed.stage==='categories'||parsed.stage==='lesson'||parsed.stage==='next'||parsed.stage==='form'||parsed.stage==='step3'?parsed.stage:'intro',
      currentCategory:['pronouns','verbs','nouns','conjunctions'].includes(String(parsed.currentCategory))?parsed.currentCategory as CategoryId:null,
      currentExercise:Number.isInteger(parsed.currentExercise)?Math.max(0,Number(parsed.currentExercise)):0,
    };
  }catch{return emptyProgress()}
}
function saveLearningProgress(progress:LearningProgress,userId?:string){
  try{localStorage.setItem(LEARNING_STORAGE_PREFIX+(userId||'local'),JSON.stringify(progress))}catch{}
}

const PRONOUN_NOMINATIV:WordItem[]=[
  {key:'nom-ich',de:'ich',ru:'я',example:'Ich heiße Anna.',caseLabel:'Nominativ'},
  {key:'nom-du',de:'du',ru:'ты',example:'Du wohnst in Berlin.',caseLabel:'Nominativ'},
  {key:'nom-er',de:'er',ru:'он',example:'Peter kommt heute. Er kommt um sechs.',caseLabel:'Nominativ'},
  {key:'nom-sie-f',de:'sie',ru:'она',example:'Anna lernt Deutsch. Sie lernt jeden Tag.',caseLabel:'Nominativ'},
  {key:'nom-es',de:'es',ru:'оно',example:'Das Kind? Es ist zu Hause.',caseLabel:'Nominativ'},
  {key:'nom-wir',de:'wir',ru:'мы',example:'Wir wohnen in Berlin.',caseLabel:'Nominativ'},
  {key:'nom-ihr',de:'ihr',ru:'вы (множественное число)',example:'Ihr lernt Deutsch.',caseLabel:'Nominativ'},
  {key:'nom-sie-pl',de:'sie',ru:'они',example:'Anna und Peter? Sie kommen morgen.',caseLabel:'Nominativ'},
  {key:'nom-Sie',de:'Sie',ru:'Вы (вежливо)',example:'Wo wohnen Sie?',caseLabel:'Nominativ'},
];

const PRONOUN_AKKUSATIV:WordItem[]=[
  {key:'akk-mich',de:'mich',ru:'меня',example:'Anna sieht mich.',caseLabel:'Akkusativ'},
  {key:'akk-dich',de:'dich',ru:'тебя',example:'Ich besuche dich.',caseLabel:'Akkusativ'},
  {key:'akk-ihn',de:'ihn',ru:'его',example:'Ich sehe ihn.',caseLabel:'Akkusativ'},
  {key:'akk-sie-f',de:'sie',ru:'её',example:'Ich sehe sie.',caseLabel:'Akkusativ'},
  {key:'akk-es',de:'es',ru:'его / это',example:'Ich kaufe es.',caseLabel:'Akkusativ'},
  {key:'akk-uns',de:'uns',ru:'нас',example:'Anna besucht uns.',caseLabel:'Akkusativ'},
  {key:'akk-euch',de:'euch',ru:'вас',example:'Ich sehe euch.',caseLabel:'Akkusativ'},
  {key:'akk-sie-pl',de:'sie',ru:'их',example:'Ich besuche sie.',caseLabel:'Akkusativ'},
  {key:'akk-Sie',de:'Sie',ru:'Вас',example:'Ich sehe Sie morgen.',caseLabel:'Akkusativ'},
];

const PRONOUN_DATIV:WordItem[]=[
  {key:'dat-mir',de:'mir',ru:'мне',example:'Können Sie mir helfen?',caseLabel:'Dativ'},
  {key:'dat-dir',de:'dir',ru:'тебе',example:'Ich schreibe dir.',caseLabel:'Dativ'},
  {key:'dat-ihm-m',de:'ihm',ru:'ему',example:'Ich helfe ihm.',caseLabel:'Dativ'},
  {key:'dat-ihr',de:'ihr',ru:'ей',example:'Ich schreibe ihr.',caseLabel:'Dativ'},
  {key:'dat-ihm-n',de:'ihm',ru:'ему',example:'Ich gebe ihm Wasser.',caseLabel:'Dativ'},
  {key:'dat-uns',de:'uns',ru:'нам',example:'Er hilft uns.',caseLabel:'Dativ'},
  {key:'dat-euch',de:'euch',ru:'вам',example:'Ich schreibe euch.',caseLabel:'Dativ'},
  {key:'dat-ihnen',de:'ihnen',ru:'им',example:'Ich helfe ihnen.',caseLabel:'Dativ'},
  {key:'dat-Ihnen',de:'Ihnen',ru:'Вам',example:'Kann ich Ihnen helfen?',caseLabel:'Dativ'},
];

const PRONOUNS:WordItem[]=[...PRONOUN_NOMINATIV,...PRONOUN_AKKUSATIV,...PRONOUN_DATIV];

const VERBS:WordItem[]=[
  ['sein','быть','Ich bin Anna.'],['haben','иметь','Ich habe Zeit.'],['heißen','называться','Ich heiße Anna.'],
  ['kommen','приходить, приезжать','Ich komme morgen.'],['wohnen','жить, проживать','Ich wohne in Berlin.'],
  ['leben','жить','Ich lebe in Deutschland.'],['sprechen','говорить','Ich spreche Deutsch.'],['lernen','учить, изучать','Ich lerne Deutsch.'],
  ['arbeiten','работать','Ich arbeite heute.'],['machen','делать','Was machen Sie?'],['gehen','идти','Ich gehe zum Arzt.'],
  ['fahren','ехать','Ich fahre mit dem Bus.'],['bleiben','оставаться','Ich bleibe zu Hause.'],['essen','есть','Ich esse Brot.'],
  ['trinken','пить','Ich trinke Wasser.'],['kaufen','покупать','Ich kaufe ein Geschenk.'],['bezahlen','платить','Ich bezahle mit Karte.'],
  ['finden','находить','Ich finde den Bahnhof.'],['suchen','искать','Ich suche ein Hotel.'],['brauchen','нуждаться, быть нужным','Ich brauche Hilfe.'],
  ['mögen','любить, нравиться','Ich mag Kaffee.'],['möchten','хотеть (вежливо)','Ich möchte einen Kurs besuchen.'],
  ['können','мочь','Können Sie mir helfen?'],['müssen','быть должным, быть вынужденным','Ich muss arbeiten.'],
  ['wollen','хотеть','Ich will Deutsch lernen.'],['helfen','помогать','Können Sie mir helfen?'],['treffen','встречать(ся)','Wir treffen uns morgen.'],
  ['besuchen','посещать','Ich möchte einen Kurs besuchen.'],['schreiben','писать','Ich schreibe eine E-Mail.'],['lesen','читать','Ich lese die E-Mail.'],
].map(([de,ru,example])=>({de,ru,example}));

const NOUNS:WordItem[]=[
  ['die Familie','семья'],['der Freund','друг'],['die Freundin','подруга'],['der Mann','мужчина, муж'],['die Frau','женщина, жена'],
  ['das Kind','ребёнок'],['die Eltern','родители'],['der Bruder','брат'],['die Schwester','сестра'],['das Haus','дом'],
  ['die Wohnung','квартира'],['das Zimmer','комната'],['die Stadt','город'],['das Land','страна'],['die Straße','улица'],
  ['der Bahnhof','вокзал'],['die Schule','школа'],['die Arbeit','работа'],['der Beruf','профессия'],['der Arzt','врач'],
  ['die Apotheke','аптека'],['das Krankenhaus','больница'],['das Restaurant','ресторан'],['das Café','кафе'],['das Hotel','отель'],
  ['der Supermarkt','супермаркет'],['das Geschäft','магазин'],['die Bäckerei','пекарня'],['die Post','почта'],['die Bank','банк'],
  ['der Bus','автобус'],['der Zug','поезд'],['das Taxi','такси'],['das Auto','автомобиль'],['das Fahrrad','велосипед'],
  ['das Flugzeug','самолёт'],['die Fahrkarte','билет'],['das Geld','деньги'],['der Euro','евро'],['die Zeit','время'],
  ['der Tag','день'],['die Woche','неделя'],['der Monat','месяц'],['das Jahr','год'],['die Uhr','часы / время'],
  ['das Essen','еда'],['das Wasser','вода'],['das Brot','хлеб'],['das Obst','фрукты'],['das Geschenk','подарок'],
].map(([de,ru])=>({de,ru,article:de.split(' ')[0],example:nounExample(de)}));

const CONJUNCTIONS:WordItem[]=[
  {de:'und',ru:'и',example:'Ich lerne Deutsch und ich schreibe eine E-Mail.'},
  {de:'oder',ru:'или',example:'Kaffee oder Tee?'},
  {de:'aber',ru:'но',example:'Ich komme, aber ich komme später.'},
  {de:'denn',ru:'потому что',example:'Ich komme später, denn der Bus hat Verspätung.'},
  {de:'sondern',ru:'а / а наоборот',example:'Nicht Montag, sondern Dienstag.'},
  {de:'weil',ru:'потому что',example:'Ich komme später, weil ich arbeite.'},
  {de:'dass',ru:'что',example:'Ich weiß, dass der Kurs heute ist.'},
];

function nounExample(value:string){
  if(value==='der Bahnhof')return'Ich warte am Bahnhof.';
  if(value==='der Arzt')return'Ich gehe zum Arzt.';
  if(value==='der Bus')return'Ich fahre mit dem Bus.';
  if(value==='das Hotel')return'Ich suche ein Hotel.';
  if(value==='die Familie')return'Meine Familie wohnt in Berlin.';
  return value+'.';
}

const CATEGORY_META:Record<CategoryId,{title:string;subtitle:string;items:WordItem[];Icon:typeof BookOpen}>={
  pronouns:{title:'Местоимения',subtitle:'Nominativ → Akkusativ → Dativ в простых фразах',items:PRONOUNS,Icon:Languages},
  verbs:{title:'Глаголы',subtitle:'30 базовых глаголов A1 из мини-словаря',items:VERBS,Icon:PenLine},
  nouns:{title:'Существительные',subtitle:'50 базовых существительных — обязательно с артиклем',items:NOUNS,Icon:BookOpen},
  conjunctions:{title:'Союзы',subtitle:'und, oder, aber, denn, sondern, weil, dass',items:CONJUNCTIONS,Icon:Sparkles},
};

function speakGerman(text:string){
  const clean=text.replace(/\s+/g,' ').trim();
  if(!clean||/[А-Яа-яЁё]/.test(clean))return;
  const api=(window as Window&{OttoSpeech?:{play?:(value:string,options?:{mode?:'normal'|'slow'})=>Promise<boolean>}}).OttoSpeech;
  if(api?.play)void api.play(clean,{mode:'normal'});
}

function normalize(value:string){
  return value.toLocaleLowerCase('de-DE').replace(/[.,!?;:„“"'’]/g,'').replace(/\s+/g,' ').trim();
}
function softNormalize(value:string){
  return normalize(value).replace(/ä/g,'a').replace(/ae/g,'a').replace(/ö/g,'o').replace(/oe/g,'o').replace(/ü/g,'u').replace(/ue/g,'u').replace(/ß/g,'ss');
}
function textResult(actual:string,expected:string){
  if(normalize(actual)===normalize(expected))return'ok';
  if(softNormalize(actual)===softNormalize(expected))return'soft';
  return'bad';
}

export function PreviewModeChooser({onChoose}:{onChoose:(mode:PreviewOttoMode)=>void}){
  return <main className="otto-preview-mode-choice h-[100dvh] w-full overflow-y-auto bg-[var(--otto-bg)] px-4 py-6 text-[var(--otto-ink)] sm:px-7 lg:px-12">
    <div className="mx-auto grid min-h-full w-full max-w-[1320px] items-center gap-6 lg:grid-cols-[.82fr_1.18fr]">
      <aside className="hidden lg:block">
        <p className="otto-kicker">OTTO A1</p>
        <h1 className="mt-3 max-w-xl text-5xl font-black leading-[1.02]">Один OTTO. Два способа заниматься.</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-[var(--otto-muted)]">Выберите не уровень «сильный/слабый», а тот формат, который нужен сейчас. Режим можно поменять в любое время.</p>
        <OttoScene scene="home" eager className="mt-5 h-[360px] w-auto max-w-full"/>
      </aside>
      <section className="rounded-[30px] border border-[var(--otto-line)] bg-[var(--otto-surface)] p-5 shadow-[0_24px_70px_rgba(43,54,54,.12)] sm:p-8">
        <div className="lg:hidden"><OttoScene scene="home" eager className="mx-auto h-36 w-auto"/><p className="otto-kicker mt-2">OTTO A1</p></div>
        <h2 className="mt-2 text-3xl font-black sm:text-4xl">Как вы оцениваете свои знания?</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--otto-muted)]">Выберите подходящий режим. Ничего не фиксируется навсегда.</p>
        <div className="mt-6 grid gap-4">
          <button type="button" onClick={()=>onChoose('learning')} className="otto-preview-mode-card otto-preview-mode-card-learning group rounded-[24px] border-2 border-teal-300 bg-teal-50 p-5 text-left text-slate-950 transition hover:border-teal-500 hover:bg-teal-100 active:bg-teal-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300">
            <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-teal-700"><Sparkles className="h-6 w-6"/></span><span className="min-w-0 flex-1"><b className="block text-xl">Мне нужна подготовка</b><span className="mt-2 block text-sm leading-6 text-slate-600">Хочу сначала повторить слова, конструкции и научиться выполнять задания A1 вместе с OTTO.</span></span><ChevronRight className="mt-3 h-5 w-5 shrink-0 text-teal-700"/></div>
          </button>
          <button type="button" onClick={()=>onChoose('training')} className="otto-preview-mode-card otto-preview-mode-card-training group rounded-[24px] border-2 border-slate-400 bg-white p-5 text-left text-slate-950 transition hover:border-teal-500 hover:bg-slate-50 active:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300">
            <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-50 text-slate-700"><Headphones className="h-6 w-6"/></span><span className="min-w-0 flex-1 text-slate-950"><b className="block text-xl text-slate-950">Мне нужен только тренажёр</b><span className="mt-2 block text-sm leading-6 text-slate-700">База уже есть. Хочу сразу тренироваться на заданиях экзамена A1.</span></span><ChevronRight className="mt-3 h-5 w-5 shrink-0 text-slate-400"/></div>
          </button>
        </div>
      </section>
    </div>
  </main>
}

export function LearningModePreview({userId,onSwitchToTraining,onOpenRealSchreiben,onOpenRealModule,onTourNavigate,bottomNav}:{userId?:string;onSwitchToTraining:()=>void;onOpenRealSchreiben:()=>void;onOpenRealModule:(module:'lesen'|'horen'|'sprechen')=>void;onTourNavigate:(tab:BottomTab)=>void;bottomNav?:(onOpenStudyBase:()=>void)=>ReactNode}){
  const[progress,setProgress]=useState<LearningProgress>(()=>readLearningProgress(userId));
  const[stage,setStage]=useState<'intro'|'categories'|'lesson'|'categoryDone'|'bridge'|'form'|'step3'|'settings'>(()=>{let target='';try{const a=JSON.parse(sessionStorage.getItem('otto-preview-teil-return-v1:'+(userId||'local'))||'null');if(a?.module==='schreiben')target=JSON.parse(sessionStorage.getItem('otto-preview-teil-selection-v1:'+(userId||'local'))||'null')||''}catch{}return target==='form'||target==='step3'?target:progress.stage==='lesson'&&progress.currentCategory?'lesson':progress.stage==='form'?'form':progress.stage==='next'?'bridge':progress.stage==='categories'?'categories':progress.stage==='step3'||progress.stage==='step2'?'step3':'intro'});
  const[category,setCategory]=useState<CategoryId|null>(progress.stage==='lesson'?progress.currentCategory:null);
  const[step,setStep]=useState(progress.stage==='lesson'?progress.currentExercise:0);
  const[feedback,setFeedback]=useState<'ok'|'soft'|'bad'|''>('');
  const[typed,setTyped]=useState('');
  const[tiles,setTiles]=useState<string[]>([]);
  const[spokenScore,setSpokenScore]=useState<number|null>(null);
  const[voiceAttempt,setVoiceAttempt]=useState(0);
  const[weakDue,setWeakDue]=useState<Record<string,number>>({});
  const[reviewWord,setReviewWord]=useState<string|null>(null);
  const[pendingStep,setPendingStep]=useState<number|null>(null);
  const[referenceSectionOverride,setReferenceSectionOverride]=useState<OttoReferenceSection|null>(null);
  const[confirmTraining,setConfirmTraining]=useState(false);
  const[tourOpen,setTourOpen]=useState(()=>!hasSeenOttoTour(userId));
  const[skipVoiceForSection,setSkipVoiceForSection]=useState(false);
  const[learningModule,setLearningModule]=useState<'reference'|'schreiben'|'hub'|'sprechen'|'novice'>(()=>{let entryRoute:string|null=null;try{const key='otto-preview-reference-route:'+(userId||'');entryRoute=window.sessionStorage.getItem(key);window.sessionStorage.removeItem(key)}catch{}return entryRoute==='reference'?'reference':entryRoute==='schreiben'?'schreiben':entryRoute==='hub'?'hub':readLearningModuleLocation(userId)??'hub'});
  const[referenceFromHub,setReferenceFromHub]=useState(false);
  const[reviewModule,setReviewModule]=useState<'schreiben'|'sprechen'|null>(null);
  const[teilMenu,setTeilMenu]=useState(false);
  const[teilReturn,setTeilReturn]=useState<{module:string;writingStage:string;part:LearningPart;view:'intro'|'selector'|'part'}|null>(()=>{
    try{return JSON.parse(sessionStorage.getItem('otto-preview-teil-return-v1:'+(userId||'local'))||'null')}catch{return null}
  });
  const[partPosition,setPartPosition]=useState<LearningPartLocation|null>(null);
  const[partCommand,setPartCommand]=useState<PartNavigationCommand|null>(null);

  const[referenceOverlayOpen,setReferenceOverlayOpen]=useState(false);
  const[referenceOverlayView,setReferenceOverlayView]=useState<'reference'|'smartcards'>('reference');
  const[submoduleReferenceSection,setSubmoduleReferenceSection]=useState<OttoReferenceSection>('reference_home');

  useEffect(()=>{if(learningModule!=='reference')saveLearningModuleLocation(learningModule==='novice'?'hub':learningModule,userId)},[learningModule,userId]);
  useEffect(()=>{setReviewModule(null);setTeilMenu(false);setPartCommand(null)},[learningModule]);
  useEffect(()=>{setTourOpen(!hasSeenOttoTour(userId))},[userId]);
  const persist=(next:LearningProgress)=>{setProgress(next);saveLearningProgress(next,userId)};
  const knownSet=useMemo(()=>new Set(progress.known),[progress.known]);
  const exercises=useMemo(()=>category?buildExercises(category):[],[category]);
  const current=exercises[step]??null;
  const referenceInitialSection=useMemo<OttoReferenceSection>(()=>{
    if(learningModule==='schreiben'){
      if(stage==='lesson'&&category==='pronouns')return'pronouns';
      if(stage==='lesson'&&category==='verbs')return'conjugation';
      if(stage==='lesson'&&category==='nouns')return'nouns';
      if(stage==='form')return'written_schreiben_1';
      if(stage==='step3'||stage==='bridge')return'written_schreiben_2';
      return'written_exam';
    }
    if(learningModule==='sprechen')return submoduleReferenceSection;
    return'reference_home';
  },[category,learningModule,stage,submoduleReferenceSection]);
  const referenceReturnState=useMemo(()=>[
    'learning',
    learningModule,
    learningModule==='schreiben'?stage:'module',
    category??'none',
    String(step),
  ].join(':'),[category,learningModule,stage,step]);

  const resetAction=()=>{setFeedback('');setTyped('');setTiles([]);setSpokenScore(null);setVoiceAttempt(0)};
  const markWeak=(word?:string)=>{
    if(!word)return;
    const nextWeak=progress.weak.includes(word)?progress.weak:[...progress.weak,word];
    persist({...progress,weak:nextWeak});
    setWeakDue(v=>({...v,[word]:step+3}));
  };

  const nextVisible=(from:number,known:ReadonlySet<string>=knownSet)=>{
    for(let i=from;i<exercises.length;i+=1){
      const ex=exercises[i];
      if(ex.skipWhenKnown&&ex.wordKey&&known.has(ex.wordKey))continue;
      if(skipVoiceForSection&&ex.kind==='speak')continue;
      return i;
    }
    return exercises.length;
  };

  const previousVisible=(from:number)=>{
    for(let i=Math.min(from,exercises.length-1);i>=0;i-=1){
      const ex=exercises[i];
      if(ex.skipWhenKnown&&ex.wordKey&&knownSet.has(ex.wordKey))continue;
      if(skipVoiceForSection&&ex.kind==='speak')continue;
      return i;
    }
    return -1;
  };

  const backExercise=()=>{
    resetAction();
    if(reviewWord){
      setReviewWord(null);
      setPendingStep(null);
      return;
    }
    const previous=previousVisible(step-1);
    if(previous<0){persist({...progress,stage:'categories',currentCategory:null,currentExercise:0});setStage('categories');return}
    setStep(previous);
    if(category)persist({...progress,stage:'lesson',currentCategory:category,currentExercise:previous});
  };

  const helperCopy=current?exerciseHelperText(current,feedback,spokenScore):'Я рядом. Одно действие за раз.';

  const knowAndAdvance=(word?:string)=>{
    if(!word){advance();return}
    const nextKnown=progress.known.includes(word)?progress.known:[...progress.known,word];
    const nextProgress={...progress,known:nextKnown,weak:progress.weak.filter(v=>v!==word)};
    persist(nextProgress);
    setWeakDue(v=>{const next={...v};delete next[word];return next});
    resetAction();
    const next=nextVisible(step+1,new Set(nextKnown));
    if(next>=exercises.length){setStage('categoryDone');return}
    setStep(next);
    if(category)persist({...nextProgress,stage:'lesson',currentCategory:category,currentExercise:next});
  };

  const advance=()=>{
    resetAction();
    const next=nextVisible(step+1);
    const due=Object.entries(weakDue).find(([,dueAt])=>dueAt<=next);
    if(due){
      setReviewWord(due[0]);
      setPendingStep(next);
      return;
    }
    if(next>=exercises.length){setStage('categoryDone');return}
    setStep(next);
    if(category)persist({...progress,stage:'lesson',currentCategory:category,currentExercise:next});
  };

  const finishReview=()=>{
    if(!reviewWord)return;
    const reviewed=reviewWord;
    const target=pendingStep??nextVisible(step+1);
    const endOfSection=target>=exercises.length;
    setWeakDue(v=>{const next={...v};delete next[reviewed];return next});
    setReviewWord(null);
    setPendingStep(null);
    resetAction();
    if(endOfSection){
      persist({...progress,weak:progress.weak.filter(word=>word!==reviewed)});
      setStage('categoryDone');
      return;
    }
    setStep(target);
    if(category)persist({...progress,stage:'lesson',currentCategory:category,currentExercise:target});
  };

  const openCategory=(id:CategoryId)=>{
    setCategory(id);
    setStep(0);
    setWeakDue({});
    setReviewWord(null);
    setPendingStep(null);
    setSkipVoiceForSection(false);
    resetAction();
    persist({...progress,stage:'lesson',currentCategory:id,currentExercise:0});
    setStage('lesson');
  };

  const completeCategory=()=>{
    if(!category)return;
    const completed=progress.completedCategories.includes(category)?progress.completedCategories:[...progress.completedCategories,category];
    persist({...progress,completedCategories:completed,stage:'categories',currentCategory:null,currentExercise:0});
    setStage('categories');
    setCategory(null);
  };

  const continueAfterCategory=()=>{
    if(!category)return;
    const completed=progress.completedCategories.includes(category)?progress.completedCategories:[...progress.completedCategories,category];
    const allDone=(Object.keys(CATEGORY_META) as CategoryId[]).every(id=>completed.includes(id));
    persist({...progress,completedCategories:completed,stage:allDone?'next':'categories',currentCategory:null,currentExercise:0});
    setCategory(null);
    setStage(allDone?'bridge':'categories');
  };

  const skipVocabulary=()=>{
    persist({...progress,stage:'next',currentCategory:null,currentExercise:0});
    setStage('bridge');
  };

  const goTraining=()=>setConfirmTraining(true);
  const confirmGoTraining=()=>{setConfirmTraining(false);onSwitchToTraining()};
  const chooseTeil=(part:LearningPart|'form'|'step3')=>{
    if(learningModule!=='schreiben'&&learningModule!=='sprechen')return;
    if(!teilReturn||teilReturn.module!==learningModule){
      const origin={module:learningModule,writingStage:stage,part:partPosition?.module===learningModule?partPosition.part:1 as LearningPart,view:partPosition?.module===learningModule?partPosition.view:'intro' as const};
      setTeilReturn(origin);
      try{sessionStorage.setItem('otto-preview-teil-return-v1:'+(userId||'local'),JSON.stringify(origin))}catch{}
    }
    setTeilMenu(false);
    if(learningModule==='schreiben'&&(part==='form'||part==='step3')){
      setStage(part);
      try{sessionStorage.setItem('otto-preview-teil-selection-v1:'+(userId||'local'),JSON.stringify(part))}catch{}
    }else if(typeof part==='number'){
      setPartCommand({kind:'open',part});
    }
  };
  const restoreTeil=()=>{
    if(!teilReturn||teilReturn.module!==learningModule)return;
    if(learningModule==='schreiben'){setStage(teilReturn.writingStage as typeof stage);try{sessionStorage.removeItem('otto-preview-teil-selection-v1:'+(userId||'local'))}catch{}}
    else setPartCommand({kind:'restore',view:teilReturn.view,part:teilReturn.part});
    setTeilReturn(null);
    try{sessionStorage.removeItem('otto-preview-teil-return-v1:'+(userId||'local'))}catch{}
    setTeilMenu(false);
  };
  const openLearningModule=(value:'reference'|'schreiben'|'hub'|'sprechen'|'novice')=>{
    setReviewModule(null);
    if(value==='reference')setReferenceFromHub(true);
    setLearningModule(value);
    // Keep the existing stage and persisted progress when returning to Schreiben.
  };

  return <div className={"telegram-app otto-skin otto-app-shell otto-preview-learning-mode"+(learningModule==='hub'||learningModule==='novice'?' otto-study-base-active':'')}>
    <div className="otto-backdrop" aria-hidden="true"><div className="otto-glow otto-glow-a"/><div className="otto-glow otto-glow-b"/><div className="otto-line-art"/></div>
    <main className="otto-app-content relative z-10 mx-auto">
      <div className="otto-inner-screen">
        <div className={"mx-auto w-full max-w-[1180px] "+(learningModule==='hub'||learningModule==='novice'?'pb-0':'pb-6')}>
          <header className="otto-learning-topbar mb-3 flex min-w-0 items-center rounded-[22px] border border-white/90 bg-white/95 px-3 py-2 shadow-sm" aria-label="Текущий раздел обучения">
            <div className="otto-learning-topbar-heading flex min-w-0 flex-1 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-800" aria-hidden="true"><Sparkles className="h-5 w-5"/></span>
              <div className="min-w-0">
                <p className="otto-kicker">ОБУЧЕНИЕ С OTTO</p>
                <b className="block text-base font-black leading-snug text-slate-950 sm:text-lg">{learningModule==='schreiben'?'Как писать письма':learningModule==='sprechen'?'Проверка произношения':learningModule==='reference'?'Справочный конспект':learningModule==='novice'?'Как лучше заниматься новичку':'Учебная база'}</b>
              </div>
            </div>
          </header>
          {teilMenu&&<section className="otto-teil-picker mb-5 rounded-[22px] border bg-white p-4" aria-label="Выбор Teil">
            <h2 className="text-2xl font-black">Выбор Teil</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(learningModule==='schreiben'
                ?[{id:'form' as const,name:'Формуляр'},{id:'step3' as const,name:'Письмо'}]
                :[1,2,3].map(id=>({id:id as LearningPart,name:'Teil '+id+(learningModule==='sprechen'?(id===1?' — Рассказ о себе':id===2?' — Вопросы и ответы':' — Просьбы и реакции'):'')}))
              ).map(item=><button type="button" key={item.id} onClick={()=>chooseTeil(item.id)} className="min-h-14 rounded-xl border bg-white px-4 text-left font-bold">{item.name}</button>)}
            </div>
            <button type="button" onClick={()=>setTeilMenu(false)} className="mt-4 min-h-11 rounded-xl border px-4 font-bold">Закрыть</button>
          </section>}
          {learningModule==='reference'&&<OttoReferenceOnboarding onContinue={()=>{setReferenceFromHub(false);setLearningModule('hub')}}/>} 
          {learningModule==='hub'&&<LearningModulesHub onOpen={openLearningModule} onCards={()=>{setReferenceSectionOverride(null);setReferenceOverlayView('smartcards');setReferenceOverlayOpen(true)}} onNumbers={()=>{setReferenceSectionOverride('numberListening');setReferenceOverlayView('reference');setReferenceOverlayOpen(true)}} onGuide={()=>setTourOpen(true)}/>}
          {learningModule==='novice'&&<OttoBeginnerStudyPlan onBack={()=>openLearningModule('hub')} onReference={()=>openLearningModule('reference')} onLetters={()=>openLearningModule('schreiben')}/>}
          {learningModule==='sprechen'&&<SprechenLearningStage partNavigation={partCommand??undefined} onLocationChange={setPartPosition} userId={userId} reviewIntro={reviewModule==='sprechen'} onFinishReview={()=>setReviewModule(null)} onRequestReview={()=>setReviewModule('sprechen')} onBack={()=>setLearningModule('hub')} onOpenTraining={()=>onOpenRealModule('sprechen')} onReferenceSectionChange={setSubmoduleReferenceSection}/>}
          {learningModule==='schreiben'&&<>
          {reviewModule==='schreiben'&&<LearningIntro onStart={()=>setReviewModule(null)} onSkip={()=>setReviewModule(null)} onTraining={goTraining}/>}
           {reviewModule!=='schreiben'&&stage==='intro'&&<LearningIntro onStart={()=>{persist({...progress,stage:'categories',currentCategory:null,currentExercise:0});setStage('categories')}} onSkip={()=>setLearningModule('hub')} onTraining={goTraining}/>}
          {reviewModule!=='schreiben'&&stage==='categories'&&<CategoryHub progress={progress} onOpen={openCategory} onSkip={skipVocabulary} onTraining={goTraining} onTable={()=>{setReferenceSectionOverride('pronouns');setReferenceOverlayView('reference');setReferenceOverlayOpen(true)}}/>}
          {reviewModule!=='schreiben'&&stage==='lesson'&&category&&<>
            <LessonNav title={CATEGORY_META[category].title} onBack={backExercise} onSections={()=>{persist({...progress,stage:'categories',currentCategory:null,currentExercise:0});setStage('categories')}} onTraining={goTraining}/>
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_190px]">
              <div>{reviewWord?<WeakReview word={findWord(reviewWord)} typed={typed} feedback={feedback} onTyped={setTyped} onFeedback={setFeedback} onDone={finishReview}/>:current&&<ExerciseView exercise={current} category={category} index={step} total={exercises.length} feedback={feedback} typed={typed} tiles={tiles} spokenScore={spokenScore} voiceAttempt={voiceAttempt} onFeedback={setFeedback} onTyped={setTyped} onTiles={setTiles} onSpokenScore={setSpokenScore} onVoiceRetry={()=>{setSpokenScore(null);setVoiceAttempt(v=>v+1)}} onWeak={()=>markWeak(current.wordKey)} onKnown={()=>knowAndAdvance(current.wordKey)} onSkipVoice={advance} onSkipVoiceSection={()=>{setSkipVoiceForSection(true);advance()}} onNext={advance}/>}</div>
              <LearningHelper text={reviewWord?'Давай ещё раз вспомним это слово.':helperCopy}/>
            </div>
          </>}
          {reviewModule!=='schreiben'&&stage==='categoryDone'&&category&&<CategoryDone category={category} weakCount={progress.weak.filter(word=>CATEGORY_META[category].items.some(item=>(item.key||item.de)===word)).length} onReview={()=>{const weak=progress.weak.filter(word=>CATEGORY_META[category].items.some(item=>(item.key||item.de)===word));if(weak.length){setReviewWord(weak[0]);setPendingStep(exercises.length);setStage('lesson')}}} onSections={completeCategory} onContinue={continueAfterCategory}/>}
          {reviewModule!=='schreiben'&&stage==='bridge'&&<NextStage onSections={()=>{persist({...progress,stage:'categories',currentCategory:null,currentExercise:0});setStage('categories')}} onContinue={()=>{persist({...progress,stage:'form',currentCategory:null,currentExercise:0});setStage('form')}} onTraining={goTraining}/>} 
          {reviewModule!=='schreiben'&&stage==='form'&&<FormularLearningStage userId={userId} onBack={()=>{persist({...progress,stage:'next',currentCategory:null,currentExercise:0});setStage('bridge')}} onLetters={()=>{if(!teilReturn)persist({...progress,stage:'step3',currentCategory:null,currentExercise:0});setStage('step3')}} onOpenRealSchreiben={onOpenRealSchreiben}/>}
          {reviewModule!=='schreiben'&&stage==='step3'&&<SchreibenLearningStage userId={userId} onBack={()=>setLearningModule('hub')} onSections={()=>setLearningModule('hub')} onOpenModules={()=>setLearningModule('hub')} onOpenRealSchreiben={onOpenRealSchreiben}/>} 
          {reviewModule!=='schreiben'&&stage==='settings'&&<LearningModeSettings onBack={()=>setStage(progress.stage==='lesson'&&progress.currentCategory?'lesson':progress.stage==='form'?'form':progress.stage==='step3'||progress.stage==='step2'?'step3':progress.stage==='next'?'bridge':progress.stage==='categories'?'categories':'intro')} onTraining={goTraining}/>} 
          </>}
        </div>
      </div>
    </main>

    {stage==='categories'&&<button type="button" onClick={()=>{setReferenceSectionOverride('pronouns');setReferenceOverlayView('reference');setReferenceOverlayOpen(true)}} className="fixed bottom-4 left-4 z-50 hidden rounded-xl border bg-white px-4 py-3 text-sm font-bold shadow-lg sm:block">Посмотреть таблицу местоимений</button>}
    {learningModule!=='reference'&&learningModule!=='hub'&&learningModule!=='novice'&&!referenceOverlayOpen&&<FloatingOttoReferenceButtons onReference={()=>{setReferenceOverlayView('reference');setReferenceOverlayOpen(true)}} onSmartCards={()=>{setReferenceOverlayView('smartcards');setReferenceOverlayOpen(true)}}/>}
    <OttoReferenceOverlay open={referenceOverlayOpen} initialView={referenceOverlayView} initialSection={referenceSectionOverride??referenceInitialSection} returnState={referenceReturnState} onClose={()=>{setReferenceOverlayOpen(false);setReferenceSectionOverride(null)}}/>
    {confirmTraining&&<ModeConfirm onCancel={()=>setConfirmTraining(false)} onConfirm={confirmGoTraining}/>}
    {tourOpen&&<OttoQuickTour userId={userId} onClose={()=>setTourOpen(false)} onNavigate={tab=>{if(tab==='learning'){setReferenceFromHub(false);setLearningModule('hub')}else onTourNavigate(tab)}}/>}
    {bottomNav?.(()=>{setReferenceFromHub(false);setLearningModule('hub')})}
  </div>
}

function LearningModulesHub({onOpen,onCards,onNumbers,onGuide}:{onOpen:(value:'reference'|'schreiben'|'sprechen'|'novice')=>void;onCards:()=>void;onNumbers:()=>void;onGuide:()=>void}){
  // One entry point for each existing feature; do not clone the reference exercise or learning progress.
  const entries=[
    {id:'reference' as const,title:'Справочный конспект',Icon:BookOpen},
    {id:'cards' as const,title:'Умные карточки',Icon:Bookmark},
    {id:'novice' as const,title:'Как лучше всего заниматься новичку',Icon:GraduationCap},
    {id:'schreiben' as const,title:'Как писать письма',Icon:PenLine},
    {id:'sprechen' as const,title:'Проверка произношения',Icon:Mic},
    {id:'numbers' as const,title:'Проверка чисел на слух',Icon:Hash},
    {id:'guide' as const,title:'Как пользоваться приложением',Icon:Smartphone},
  ];
  const select=(id:(typeof entries)[number]['id'])=>{
    if(id==='reference'||id==='schreiben'||id==='sprechen'||id==='novice')onOpen(id);
    else if(id==='cards')onCards();
    else if(id==='numbers')onNumbers();
    else if(id==='guide')onGuide();
  };
  return <section data-testid="otto-study-base-menu" className="mx-auto w-full max-w-[760px] px-1 pb-3 sm:px-4" aria-label="Учебная база">
    <div className="grid gap-2.5">
      {entries.map(item=>{
        const Icon=item.Icon;
        return <div key={item.id}>
          <button type="button" aria-label={item.title} onClick={()=>select(item.id)}
            className="flex min-h-[64px] w-full min-w-0 items-center gap-3 rounded-2xl border border-[var(--otto-line)] bg-white px-3 py-3 text-left text-slate-950 shadow-[0_5px_18px_rgba(16,42,58,.06)] transition hover:border-teal-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-200 sm:min-h-[68px] sm:px-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e3f1ee] text-[#116457]"><Icon className="h-5 w-5" aria-hidden="true"/></span>
            <span className="min-w-0 flex-1 text-[15px] font-extrabold leading-snug sm:text-base">{item.title}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true"/>
          </button>
        </div>;
      })}
    </div>
  </section>;
}

function LearningIntro({onStart,onSkip,onTraining}:{onStart:()=>void;onSkip:()=>void;onTraining:()=>void}){
  return <section className="grid min-h-0 items-center gap-6 lg:min-h-[calc(100dvh-160px)] lg:grid-cols-[.88fr_1.12fr]">
    <div className="hidden lg:block"><p className="otto-kicker">SCHREIBEN · ПИСЬМЕННАЯ ЧАСТЬ A1</p><h1 className="mt-3 text-5xl font-black leading-[1.02]">Как научиться писать письма A1</h1><div className="mt-4 h-[270px] max-w-[300px]"><OttoScene scene="schreiben" eager className="h-full w-full object-contain"/></div></div>
    <div className="rounded-[30px] border bg-white p-5 shadow-[0_20px_60px_rgba(16,42,58,.10)] sm:p-8">
      <p className="otto-kicker lg:hidden">SCHREIBEN · ПИСЬМЕННАЯ ЧАСТЬ A1</p>
      <h1 className="text-3xl font-black lg:hidden">Как научиться писать письма A1</h1>
      <div className="mt-5 space-y-4 text-base leading-7 text-slate-700">
        <p><b>Письма — важная часть подготовки к экзамену A1.</b> Когда вы учитесь писать короткие сообщения, вы одновременно запоминаете нужные слова и учитесь строить немецкие предложения.</p>
        <p>На экзамене письменная часть называется <b>Schreiben</b>. В неё входят два задания: <b>заполнить формуляр</b> и <b>написать короткое письмо</b>. Формуляр — это тоже часть письменного экзамена, а не отдельный предмет.</p>
        <p>Сначала мы вместе с OTTO повторим базовые слова и простые фразы. Затем научимся заполнять формуляр, а после — шаг за шагом разберём, как написать письмо.</p>
        <p>Мы всё объясним на примерах и потренируемся, прежде чем вы перейдёте к настоящим экзаменационным заданиям.</p>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-3"><button onClick={onSkip} className="min-h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-700">Пропустить</button><button onClick={onTraining} className="min-h-12 rounded-xl border border-teal-200 bg-teal-50 px-5 font-bold text-teal-800">К тренировкам</button><button onClick={onStart} className="min-h-12 rounded-xl bg-slate-900 px-5 font-black text-white">Начать <ArrowRight className="ml-2 inline h-4 w-4"/></button></div>
    </div>
  </section>
}

function CategoryHub({progress,onOpen,onSkip,onTraining,onTable}:{progress:LearningProgress;onOpen:(id:CategoryId)=>void;onSkip:()=>void;onTraining:()=>void;onTable:()=>void}){
  const allDone=(Object.keys(CATEGORY_META) as CategoryId[]).every(id=>progress.completedCategories.includes(id));
  return <section>
    <div className="rounded-[28px] border bg-white p-5 shadow-sm sm:p-7">
      <p className="otto-kicker">SCHREIBEN · ЭТАП 1</p>
      <h1 className="mt-2 max-w-3xl text-3xl font-black">Базовые слова</h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">Повторите четыре группы, которые постоянно встречаются в письмах A1. Разделы можно проходить в любом порядке.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{(Object.keys(CATEGORY_META) as CategoryId[]).map(id=>{const meta=CATEGORY_META[id];const done=progress.completedCategories.includes(id);const Icon=meta.Icon;return <button key={id} type="button" onClick={()=>onOpen(id)} className="flex min-h-[126px] items-start gap-4 rounded-[22px] border bg-white p-4 text-left text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-200"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Icon className="h-6 w-6"/></span><span className="min-w-0 flex-1"><b className="block text-lg">{meta.title}</b><span className="mt-1 block text-sm leading-5 text-slate-500">{meta.subtitle}</span><span className="mt-2 block text-xs font-bold text-teal-700">{done?'Повторено ✓':meta.items.length+' элементов'}</span></span><ChevronRight className="mt-3 h-5 w-5 shrink-0 text-slate-300"/></button>})}</div>
      <button type="button" onClick={onSkip} className="mt-5 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-5 font-bold text-slate-800">{allDone?'Продолжить к следующему этапу':'Пропустить повторение'}</button>
      <div className="mt-3 grid gap-2 sm:grid-cols-2"><button type="button" onClick={onTable} className="min-h-11 rounded-xl border bg-white px-4 text-sm font-bold text-slate-800">Посмотреть таблицу местоимений</button><button type="button" onClick={onTraining} className="min-h-11 rounded-xl border border-teal-200 bg-teal-50 px-4 text-sm font-bold text-teal-900">К тренировкам</button></div>
    </div>
  </section>
}

function LessonNav({title,onBack,onSections,onTraining}:{title:string;onBack:()=>void;onSections:()=>void;onTraining:()=>void}){
  return <div className="mb-4 grid grid-cols-2 items-center gap-2 sm:flex">
    <div className="col-span-2 min-w-0 sm:order-3 sm:ml-auto sm:flex-1 sm:text-right"><b className="block text-lg text-slate-950">{title}</b></div>
    <button onClick={onBack} aria-label="Назад" className="sm:order-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-bold text-slate-900"><ArrowLeft className="h-4 w-4"/>Назад</button>
    <button onClick={onSections} className="sm:order-2 min-h-11 rounded-xl border border-slate-300 bg-white px-4 font-bold text-slate-900">К разделам</button>
    <button onClick={onTraining} className="col-span-2 min-h-10 rounded-xl border border-teal-200 bg-teal-50 px-4 text-sm font-bold text-teal-900 sm:order-4 sm:col-auto">К тренировкам</button>
  </div>
}

function LearningHelper({text}:{text:string}){
  return <aside className="rounded-[22px] border border-teal-100 bg-white p-3 shadow-sm lg:sticky lg:top-3">
    <div className="flex items-center gap-3 lg:block">
      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-teal-50 lg:mx-auto lg:h-16 lg:w-16">
        <OttoScene scene="schreiben" eager className="h-full w-full object-contain"/>
      </div>
      <div className="min-w-0 lg:mt-3 lg:text-center">
        <p className="otto-kicker">OTTO РЯДОМ</p>
        <p className="mt-1 text-sm font-bold leading-5 text-slate-700">{text}</p>
      </div>
    </div>
  </aside>
}

function exerciseHelperText(exercise:Exercise,feedback:string,spokenScore:number|null){
  if(feedback==='bad')return'Ничего страшного. Исправь только этот шаг и попробуй снова.';
  if(feedback==='ok'||feedback==='soft')return'Отлично! Можно двигаться дальше.';
  if(exercise.kind==='learn')return'Послушай слово и реши: повторять его или ты уже уверенно знаешь.';
  if(exercise.kind==='speak')return spokenScore!==null&&spokenScore<60?'Послушай образец ещё раз или пропусти только голосовой шаг.':'Теперь можно повторить вслух или пропустить только произношение.';
  if(exercise.kind==='type'||exercise.kind==='blank')return'Попробуй написать сам — ответ заранее не показываю.';
  if(exercise.kind==='build')return'Собери фразу из кусочков. Смотри на порядок слов.';
  if(exercise.kind==='listen'||exercise.kind==='listenOnly')return'Сначала слушаем. Не спеши смотреть на подсказки.';
  if(exercise.kind==='structure')return'Посмотри, кто делает действие и где стоит нужная часть.';
  if(exercise.kind==='article')return'Существительное учим вместе с артиклем.';
  return'Одно небольшое действие — и идём дальше.';
}

function ExerciseView(props:{
  exercise:Exercise;category:CategoryId;index:number;total:number;feedback:string;typed:string;tiles:string[];spokenScore:number|null;voiceAttempt:number;
  onFeedback:(value:'ok'|'soft'|'bad'|'')=>void;onTyped:(value:string)=>void;onTiles:(value:string[])=>void;onSpokenScore:(value:number)=>void;onVoiceRetry:()=>void;onWeak:()=>void;onKnown:()=>void;onSkipVoice:()=>void;onSkipVoiceSection:()=>void;onNext:()=>void;
}){
  const{exercise,index,total,feedback,typed,tiles,spokenScore,voiceAttempt,onFeedback,onTyped,onTiles,onSpokenScore,onVoiceRetry,onWeak,onKnown,onSkipVoice,onSkipVoiceSection,onNext}=props;
  const retry=()=>{onFeedback('');onTyped('');onTiles([])};
  const wrong=()=>{onWeak();onFeedback('bad')};
  const progress=Math.min(100,Math.round(((index+1)/Math.max(1,total))*100));
  const head=<><div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-wider text-teal-700">{props.category==='pronouns'?'Местоимения':'Повторение'} · {index+1} из {total}</p><span className="text-xs font-bold text-slate-400">{progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-teal-600" style={{width:progress+'%'}}/></div></>;

  if(exercise.kind==='learn')return <ExerciseCard>{head}<h2 className="mt-7 text-center text-5xl font-black">{exercise.de}</h2><p className="mt-3 text-center text-xl font-bold text-slate-600">{exercise.ru}</p><div className="mt-5 flex justify-center"><button onClick={()=>speakGerman(exercise.de||'')} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-5 font-bold text-teal-800"><Volume2 className="h-5 w-5"/>Послушать</button></div>{exercise.sentence&&<div className="mt-5 rounded-2xl bg-slate-50 p-4 text-center"><p className="text-sm text-slate-500">В предложении</p><b className="mt-1 block text-lg">{exercise.sentence}</b></div>}<div className="mt-6 grid gap-3 sm:grid-cols-2"><button onClick={onKnown} className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 font-bold text-slate-950 hover:bg-slate-50">Я это знаю</button><button onClick={onNext} className="min-h-12 rounded-xl bg-slate-900 px-5 font-black text-white hover:bg-slate-800">Продолжить <ArrowRight className="ml-2 inline h-4 w-4"/></button></div></ExerciseCard>;

  if(exercise.kind==='meaning')return <ExerciseCard>{head}<h2 className="mt-6 text-3xl font-black">{exercise.title}</h2><p className="mt-4 text-center text-4xl font-black">{exercise.de}</p><div className="mt-6 grid gap-3">{exercise.options?.map(option=><button key={option} disabled={Boolean(feedback)} onClick={()=>option===exercise.answer?onFeedback('ok'):wrong()} className={cn('min-h-14 rounded-xl border-2 bg-white px-4 text-left font-bold',feedback==='ok'&&option===exercise.answer?'border-emerald-500 bg-emerald-50':'border-slate-200')}>{option}</button>)}</div><Feedback feedback={feedback} expected={exercise.answer} onRetry={retry} onNext={onNext}/></ExerciseCard>;

  if(exercise.kind==='listen')return <ExerciseCard>{head}<h2 className="mt-6 text-3xl font-black">{exercise.title}</h2><p className="mt-2 text-slate-500">Сначала только звук.</p><button onClick={()=>speakGerman(exercise.de||'')} className="mx-auto mt-6 grid h-20 w-20 place-items-center rounded-full bg-teal-700 text-white shadow-lg"><Volume2 className="h-8 w-8"/></button><div className="mt-6 grid gap-3">{exercise.options?.map(option=><button key={option} disabled={Boolean(feedback)} onClick={()=>option===exercise.answer?onFeedback('ok'):wrong()} className={cn('min-h-14 rounded-xl border-2 bg-white px-4 text-left font-bold',feedback==='ok'&&option===exercise.answer?'border-emerald-500 bg-emerald-50':'border-slate-200')}>{option}</button>)}</div><Feedback feedback={feedback} onRetry={retry} onNext={onNext}/></ExerciseCard>;

  if(exercise.kind==='listenOnly')return <ExerciseCard>{head}<h2 className="mt-6 text-3xl font-black">{exercise.title}</h2><p className="mt-3 text-lg text-slate-600">{exercise.translation}</p><button onClick={()=>speakGerman(exercise.de||'')} className="mx-auto mt-7 grid h-20 w-20 place-items-center rounded-full bg-teal-700 text-white shadow-lg" aria-label="Послушать предложение"><Volume2 className="h-8 w-8"/></button><p className="mt-4 text-center text-xl font-black text-slate-950">{exercise.de}</p><NextButton onClick={onNext}/></ExerciseCard>;

  if(exercise.kind==='speak')return <ExerciseCard>{head}<h2 className="mt-6 text-3xl font-black">{exercise.title}</h2><p className="mt-3 text-xl font-bold">{exercise.de}</p><button onClick={()=>speakGerman(exercise.de||'')} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 font-bold text-teal-800"><Volume2 className="h-4 w-4"/>Послушать ещё раз</button><div className="mt-5"><VoiceRecorder key={exercise.id+'-'+voiceAttempt} evaluation={{mode:'phrase',expectedText:exercise.de||''}} hint="Повторите за OTTO" onPracticed={()=>{}} onEvaluated={score=>{onSpokenScore(score);if(score<60)onWeak()}}/></div>{spokenScore!==null&&spokenScore>=60&&<><Success text="Отлично ✓"/><NextButton onClick={onNext}/></>}{spokenScore!==null&&spokenScore<60&&<div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><b>Попробуем ещё раз</b><p className="mt-1 text-sm">Послушайте образец ещё раз, затем повторите.</p><button type="button" onClick={onVoiceRetry} className="mt-3 min-h-10 rounded-xl border border-amber-300 bg-white px-4 font-bold text-amber-950">Попробовать снова</button></div>}<div className="mt-4 grid gap-2 sm:grid-cols-2"><button type="button" onClick={onSkipVoice} className="min-h-11 rounded-xl border bg-white px-4 font-bold text-slate-800">Пропустить произношение</button><button type="button" onClick={onSkipVoiceSection} className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700">Не предлагать голосовые до конца раздела</button></div></ExerciseCard>;

  if(exercise.kind==='type'||exercise.kind==='blank')return <ExerciseCard>{head}<h2 className="mt-6 text-3xl font-black">{exercise.title}</h2>{exercise.prompt&&<p className="mt-3 text-lg font-bold">{exercise.prompt}</p>}<input value={typed} onChange={e=>onTyped(e.target.value)} className="mt-5 min-h-14 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-lg outline-none focus:border-teal-500" placeholder="Напишите ответ"/><button onClick={()=>{const result=textResult(typed,exercise.answer||'');if(result==='bad')wrong();else onFeedback(result)}} className="mt-4 min-h-12 w-full rounded-xl bg-slate-900 px-5 font-black text-white">Проверить</button><Feedback feedback={feedback} expected={exercise.answer} onRetry={retry} onNext={onNext}/></ExerciseCard>;

  if(exercise.kind==='article')return <ExerciseCard>{head}<h2 className="mt-6 text-3xl font-black">{exercise.title}</h2><p className="mt-4 text-center text-4xl font-black">{exercise.prompt}</p><div className="mt-6 grid grid-cols-3 gap-3">{['der','die','das'].map(option=><button key={option} disabled={Boolean(feedback)} onClick={()=>option===exercise.answer?onFeedback('ok'):wrong()} className={cn('min-h-14 rounded-xl border-2 bg-white font-black',feedback==='ok'&&option===exercise.answer?'border-emerald-500 bg-emerald-50':'border-slate-200')}>{option}</button>)}</div><Feedback feedback={feedback} expected={exercise.answer} onRetry={retry} onNext={onNext}/></ExerciseCard>;

  if(exercise.kind==='structure')return <ExerciseCard>{head}<p className="otto-kicker mt-6">СТРУКТУРА</p><h2 className="mt-1 text-2xl font-black text-slate-950">{exercise.title}</h2><p className="mt-4 text-3xl font-black">{exercise.sentence}</p><p className="mt-2 text-lg text-slate-600">{exercise.translation}</p><button onClick={()=>speakGerman(exercise.sentence||'')} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 font-bold text-teal-800"><Volume2 className="h-4 w-4"/>Послушать предложение</button><div className="mt-5 grid gap-3 sm:grid-cols-3">{exercise.parts?.map(part=><div key={part.text} className="rounded-2xl border bg-slate-50 p-4"><b>{part.text}</b><p className="mt-1 text-sm text-slate-600">{part.label}</p></div>)}</div><NextButton onClick={onNext}/></ExerciseCard>;

  const pool=exercise.tiles??[];
  const result=tiles.join(' ');
  return <ExerciseCard>{head}<h2 className="mt-6 text-3xl font-black">{exercise.title}</h2><p className="mt-2 text-slate-500">{exercise.translation}</p><div className="mt-5 min-h-[76px] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-3">{tiles.length?tiles.map((tile,i)=><span key={tile+i} lang="de" className="otto-build-selected-tile mr-2 inline-block rounded-xl bg-white px-3 py-2 font-bold shadow-sm">{tile}</span>):<span className="text-sm text-slate-400">Нажимайте слова по порядку</span>}</div><div className="mt-4 flex flex-wrap gap-2">{pool.map((tile,i)=>{const used=tiles.filter(v=>v===tile).length>=pool.slice(0,i+1).filter(v=>v===tile).length;return <button key={tile+i} disabled={used||Boolean(feedback)} onClick={()=>onTiles([...tiles,tile])} lang="de" className="otto-build-word-tile rounded-xl border bg-white px-3 py-2 font-bold disabled:opacity-30">{tile}</button>})}</div><div className="mt-4 grid gap-2 sm:grid-cols-2"><button onClick={()=>{onTiles([]);onFeedback('')}} className="min-h-11 rounded-xl border bg-white px-4 font-bold"><RotateCcw className="mr-2 inline h-4 w-4"/>Сначала</button><button onClick={()=>result===exercise.answer?onFeedback('ok'):wrong()} className="min-h-11 rounded-xl bg-slate-900 px-4 font-black text-white">Проверить</button></div>{feedback==='ok'&&<><Success/><button onClick={()=>speakGerman(exercise.answer||'')} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 font-bold text-teal-800"><Volume2 className="h-4 w-4"/>Прослушать собранное</button><NextButton onClick={onNext}/></>}{feedback==='bad'&&<Retry onClick={retry}/>}</ExerciseCard>;
}


function WeakReview({word,typed,feedback,onTyped,onFeedback,onDone}:{word:WordItem|undefined;typed:string;feedback:string;onTyped:(v:string)=>void;onFeedback:(v:'ok'|'soft'|'bad'|'')=>void;onDone:()=>void}){
  if(!word)return null;
  return <ExerciseCard><p className="otto-kicker">ВОЗВРАЩАЕМ СЛАБОЕ СЛОВО</p><h2 className="mt-2 text-3xl font-black">Как по-немецки «{word.ru}»?</h2><p className="mt-3 text-sm leading-6 text-slate-600">Это слово вернулось через несколько шагов, потому что раньше на нём была ошибка.</p><input value={typed} onChange={e=>onTyped(e.target.value)} className="mt-5 min-h-14 w-full rounded-xl border-2 px-4 text-lg" placeholder="Напишите по-немецки"/><button onClick={()=>onFeedback(textResult(typed,word.de))} className="mt-4 min-h-12 w-full rounded-xl bg-slate-900 font-black text-white">Проверить</button>{feedback==='ok'||feedback==='soft'?<><Success text="Теперь получилось ✓"/><NextButton onClick={onDone}/></>:feedback==='bad'?<div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><b>Попробовать снова</b><p className="mt-1 text-sm">Подсказка: {word.de}</p><button onClick={()=>{onFeedback('');onTyped('')}} className="mt-3 rounded-xl border bg-white px-4 py-2 font-bold text-slate-900">Попробовать снова</button></div>:null}</ExerciseCard>;
}

function CategoryDone({category,weakCount,onReview,onSections,onContinue}:{category:CategoryId;weakCount:number;onReview:()=>void;onSections:()=>void;onContinue:()=>void}){
  return <ExerciseCard><CheckCircle2 className="h-12 w-12 text-emerald-600"/><h1 className="mt-3 text-3xl font-black">Отлично! {CATEGORY_META[category].title} повторили ✓</h1>{weakCount>0?<p className="mt-3 text-slate-600">Повторим ещё: <b>{weakCount}</b> {weakCount===1?'слово':'слова'}</p>:<p className="mt-3 text-slate-600">Ошибки этого раздела дополнительно повторены.</p>}<div className="mt-6 grid gap-3 sm:grid-cols-3">{weakCount>0&&<button onClick={onReview} className="min-h-12 rounded-xl border border-amber-300 bg-amber-50 px-4 font-bold text-amber-950 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200">Повторить ошибки</button>}<button onClick={onSections} className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 font-bold text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200">К разделам</button><button onClick={onContinue} className="min-h-12 rounded-xl bg-slate-900 px-4 font-black text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300">Продолжить</button></div></ExerciseCard>;
}

function NextStage({onSections,onContinue,onTraining}:{onSections:()=>void;onContinue:()=>void;onTraining:()=>void}){
  return <ExerciseCard>
    <p className="otto-kicker">SCHREIBEN · ПЕРЕХОД</p>
    <CheckCircle2 className="mt-3 h-12 w-12 text-emerald-600"/>
    <h1 className="mt-3 text-3xl font-black">С базовыми словами разобрались ✓</h1>
    <p className="mt-4 text-lg leading-7 text-slate-700">Теперь переходим от слов к настоящему формату Schreiben A1.</p>
    <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50 p-4">
      <p className="otto-kicker">СЛЕДУЮЩИЙ ЭТАП</p>
      <h2 className="mt-1 text-2xl font-black">Шаг 2. Учимся заполнять формуляр</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Сначала научимся понимать названия полей, находить нужные данные в короткой ситуации и переносить их в формуляр.</p>
    </div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      <button onClick={onSections} className="min-h-12 rounded-xl border bg-white px-4 font-bold text-slate-800">К разделам</button>
      <button onClick={onTraining} className="min-h-12 rounded-xl border border-teal-200 bg-teal-50 px-4 font-bold text-teal-900">Перейти к реальным тренировкам Schreiben</button>
      <button onClick={onContinue} className="min-h-12 rounded-xl bg-slate-900 px-4 font-black text-white">Продолжить <ArrowRight className="ml-2 inline h-4 w-4"/></button>
    </div>
  </ExerciseCard>;
}

function LearningModeSettings({onBack,onTraining}:{onBack:()=>void;onTraining:()=>void}){
  return <ExerciseCard><button onClick={onBack} className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 font-bold"><ArrowLeft className="h-4 w-4"/>Назад</button><p className="otto-kicker mt-6">НАСТРОЙКИ</p><h1 className="mt-2 text-3xl font-black">Режим OTTO</h1><p className="mt-3 text-slate-600">Режим можно менять сколько угодно. Аккаунт и экзаменационный прогресс остаются теми же.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border-2 border-teal-300 bg-teal-50 p-4"><b>Обучение с OTTO ✓</b><p className="mt-2 text-sm text-slate-600">Слова, произношение, предложения и подготовка к заданиям.</p></div><button onClick={onTraining} className="rounded-2xl border-2 border-slate-200 bg-white p-4 text-left"><b>Тренировка перед экзаменом</b><p className="mt-2 text-sm text-slate-600">Сразу открыть существующие задания Hören / Lesen / Schreiben / Sprechen.</p></button></div></ExerciseCard>;
}

function ModeConfirm({onCancel,onConfirm}:{onCancel:()=>void;onConfirm:()=>void}){
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 p-4 sm:items-center" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="otto-preview-mode-confirm-title" className="w-full max-w-lg rounded-[26px] border bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="otto-kicker">РЕЖИМ OTTO</p><h2 id="otto-preview-mode-confirm-title" className="mt-1 text-2xl font-black">Перейти к настоящим заданиям OTTO?</h2></div><button onClick={onCancel} className="grid h-10 w-10 place-items-center rounded-xl border"><X className="h-5 w-5"/></button></div><p className="mt-3 text-sm leading-6 text-slate-600">Вы сможете вернуться к обучению в любое время через Настройки.</p><div className="mt-5 grid gap-2 sm:grid-cols-2"><button onClick={onCancel} className="min-h-12 rounded-xl border bg-white px-4 font-bold">Продолжить обучение</button><button onClick={onConfirm} className="min-h-12 rounded-xl bg-slate-900 px-4 font-black text-white">Перейти к тренировкам</button></div></div></div>;
}

function ExerciseCard({children}:{children:ReactNode}){return <section className="rounded-[28px] border bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,.08)] sm:p-7">{children}</section>}
function Success({text='Получилось ✓'}:{text?:string}){return <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">{text}</div>}
function Retry({onClick}:{onClick:()=>void}){return <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><b>Пока не получилось.</b><button onClick={onClick} className="mt-3 block min-h-10 rounded-xl border border-amber-300 bg-white px-4 font-bold">Попробовать снова</button></div>}
function NextButton({onClick}:{onClick:()=>void}){return <div className="mt-5 flex justify-end"><button onClick={onClick} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-slate-900 px-6 font-black text-white">Продолжить <ArrowRight className="h-4 w-4"/></button></div>}
function Feedback({feedback,expected,onRetry,onNext}:{feedback:string;expected?:string;onRetry:()=>void;onNext:()=>void}){if(!feedback)return null;if(feedback==='ok')return <><Success/><NextButton onClick={onNext}/></>;if(feedback==='soft')return <><div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><b>Верно по смыслу ✓</b>{expected&&<p className="mt-1 text-sm">Правильное написание: <b>{expected}</b></p>}</div><NextButton onClick={onNext}/></>;return <Retry onClick={onRetry}/>}

function findWord(key:string){
  return [...PRONOUNS,...VERBS,...NOUNS,...CONJUNCTIONS].find(item=>(item.key||item.de)===key);
}

function sentenceTiles(sentence:string){
  const items=sentence.split(' ').filter(Boolean);
  if(items.length<3)return [...items].reverse();
  const even=items.filter((_,i)=>i%2===0);
  const odd=items.filter((_,i)=>i%2===1);
  return [...odd.reverse(),...even.reverse()];
}

function optionValues(items:WordItem[],index:number,field:'de'|'ru',answer:string){
  const values=items.map(item=>item[field]).filter((value,i,all)=>value!==answer&&all.indexOf(value)===i);
  const first=values[index%Math.max(1,values.length)]||values[0]||'—';
  const second=values[(index+3)%Math.max(1,values.length)]||values[1]||first;
  return [answer,first,second].filter((value,i,all)=>all.indexOf(value)===i);
}

function pronounBlank(item:WordItem){
  const pieces=item.example.split(/(\s+|[.,?!])/);
  const target=item.de.toLocaleLowerCase('de-DE');
  const index=pieces.findIndex(piece=>piece.toLocaleLowerCase('de-DE')===target);
  if(index<0)return '___ '+item.example;
  const next=[...pieces];
  next[index]='___';
  return next.join('');
}

function buildPronounExercises():Exercise[]{
  const result:Exercise[]=[
    {id:'pronouns-nom-intro',kind:'structure',title:'Сначала Nominativ',sentence:'Ich heiße Anna.',translation:'Nominativ показывает, кто делает действие.',parts:[{text:'ich / du / er / sie / es',label:'кто?'},{text:'wir / ihr / sie / Sie',label:'кто? во множественном числе или вежливо'}]},
  ];
  const groups:[string,WordItem[]][]=[
    ['nom',PRONOUN_NOMINATIV],
    ['akk',PRONOUN_AKKUSATIV],
    ['dat',PRONOUN_DATIV],
  ];
  groups.forEach(([prefix,items],groupIndex)=>{
    if(groupIndex===1)result.push({id:'pronouns-akk-intro',kind:'structure',title:'Теперь Akkusativ — кого? что?',sentence:'Ich besuche dich.',translation:'Форма меняется внутри реального предложения.',parts:[{text:'Ich',label:'кто делает?'},{text:'besuche',label:'что делает?'},{text:'dich',label:'кого? — тебя'}]});
    if(groupIndex===2)result.push({id:'pronouns-dat-intro',kind:'structure',title:'Теперь Dativ — кому?',sentence:'Können Sie mir helfen?',translation:'Dativ часто отвечает на вопрос «кому?».',parts:[{text:'Können Sie',label:'можете Вы'},{text:'mir',label:'кому? — мне'},{text:'helfen',label:'помочь'}]});
    items.forEach((item,index)=>{
      const key=item.key||item.de;
      const id=prefix+'-'+String(index+1);
      result.push(
        {id:id+'-learn',kind:'learn',title:item.caseLabel||'Местоимение',wordKey:key,de:item.de,ru:item.ru,sentence:item.example},
        {id:id+'-meaning',kind:'meaning',title:'Что означает «'+item.de+'»?',wordKey:key,skipWhenKnown:true,de:item.de,answer:item.ru,options:optionValues(items,index,'ru',item.ru)},
        {id:id+'-speak',kind:'speak',title:'Повторите: '+item.de,wordKey:key,skipWhenKnown:true,de:item.de},
        {id:id+'-type',kind:'type',title:'Напишите по-немецки',wordKey:key,skipWhenKnown:true,prompt:item.ru,answer:item.de},
        {id:id+'-blank',kind:'blank',title:'Вставьте местоимение в предложение',wordKey:key,skipWhenKnown:true,prompt:pronounBlank(item),answer:item.de},
        {id:id+'-build',kind:'build',title:'Соберите предложение',wordKey:key,translation:item.example,tiles:sentenceTiles(item.example),answer:item.example},
      );
    });
  });
  return result;
}

function buildVerbExercises():Exercise[]{
  const result:Exercise[]=[];
  VERBS.forEach((item,index)=>{
    const key=item.de;
    const id='verb-'+String(index+1);
    result.push(
      {id:id+'-learn',kind:'learn',title:'Глагол',wordKey:key,de:item.de,ru:item.ru,sentence:item.example},
      {id:id+'-meaning',kind:'meaning',title:'Что означает «'+item.de+'»?',wordKey:key,skipWhenKnown:true,de:item.de,answer:item.ru,options:optionValues(VERBS,index,'ru',item.ru)},
      {id:id+'-speak',kind:'speak',title:'Повторите: '+item.de,wordKey:key,skipWhenKnown:true,de:item.de},
      {id:id+'-type',kind:'type',title:'Напишите инфинитив по-немецки',wordKey:key,skipWhenKnown:true,prompt:item.ru,answer:item.de},
      {id:id+'-build',kind:'build',title:'Соберите пример с этим глаголом',wordKey:key,translation:item.example,tiles:sentenceTiles(item.example),answer:item.example},
    );
    if(index%4===0)result.push({id:id+'-listen',kind:'listen',title:'Какой глагол прозвучал?',wordKey:key,skipWhenKnown:true,de:item.de,answer:item.de,options:optionValues(VERBS,index,'de',item.de)});
  });
  return result;
}

function nounContext(item:WordItem){
  if(item.de==='die Eltern')return'Das sind die Eltern.';
  if(item.de==='der Bahnhof')return'Ich warte am Bahnhof.';
  if(item.de==='der Arzt')return'Ich gehe zum Arzt.';
  if(item.de==='der Bus')return'Ich fahre mit dem Bus.';
  if(item.de==='das Hotel')return'Ich suche ein Hotel.';
  if(item.de==='die Familie')return'Meine Familie wohnt in Berlin.';
  return 'Das ist '+item.de+'.';
}

function buildNounExercises():Exercise[]{
  const result:Exercise[]=[];
  NOUNS.forEach((item,index)=>{
    const key=item.de;
    const id='noun-'+String(index+1);
    const context=nounContext(item);
    const bare=item.de.replace(/^(der|die|das)\s+/,'');
    result.push(
      {id:id+'-learn',kind:'learn',title:'Существительное с артиклем',wordKey:key,de:item.de,ru:item.ru,sentence:context},
      {id:id+'-article',kind:'article',title:'Какой артикль?',wordKey:key,skipWhenKnown:true,prompt:'___ '+bare,answer:item.article},
      {id:id+'-speak',kind:'speak',title:'Произнесите слово с артиклем',wordKey:key,skipWhenKnown:true,de:item.de},
      {id:id+'-meaning',kind:'meaning',title:'Что означает «'+item.de+'»?',wordKey:key,skipWhenKnown:true,de:item.de,answer:item.ru,options:optionValues(NOUNS,index,'ru',item.ru)},
      {id:id+'-type',kind:'type',title:'Напишите слово вместе с артиклем',wordKey:key,skipWhenKnown:true,prompt:item.ru,answer:item.de},
      {id:id+'-build',kind:'build',title:'Соберите фразу с этим словом',wordKey:key,translation:context,tiles:sentenceTiles(context),answer:context},
    );
  });
  return result;
}

function buildConjunctionExercises():Exercise[]{
  const result:Exercise[]=[];
  CONJUNCTIONS.forEach((item,index)=>{
    const key=item.de;
    const id='conj-'+String(index+1);
    result.push(
      {id:id+'-learn',kind:'learn',title:'Союз',wordKey:key,de:item.de,ru:item.ru,sentence:item.example},
      {id:id+'-meaning',kind:'meaning',title:'Что означает «'+item.de+'»?',wordKey:key,skipWhenKnown:true,de:item.de,answer:item.ru,options:optionValues(CONJUNCTIONS,index,'ru',item.ru)},
      {id:id+'-speak',kind:'speak',title:'Повторите: '+item.de,wordKey:key,skipWhenKnown:true,de:item.de},
      {id:id+'-type',kind:'type',title:'Напишите союз по-немецки',wordKey:key,skipWhenKnown:true,prompt:item.ru,answer:item.de},
      {id:id+'-build',kind:'build',title:'Соберите предложение с союзом',wordKey:key,translation:item.example,tiles:sentenceTiles(item.example),answer:item.example},
    );
  });
  return result;
}

function buildExercises(category:CategoryId):Exercise[]{
  if(category==='pronouns')return buildPronounExercises();
  if(category==='verbs')return buildVerbExercises();
  if(category==='nouns')return buildNounExercises();
  return buildConjunctionExercises();
}

