import { useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Eye, Lightbulb, RefreshCw, Sparkles, Volume2, UserRound, MessageCircleQuestion, HandHeart, BookOpen, ClipboardList } from 'lucide-react';
import { speakingTeil1, speakingTeil2Cards, type SpeakingPart } from '@/data/speaking';
import { speakingTeil3ArchiveCards } from '@/data/speakingTeil3Archive';
import { speakingExtraPrompts } from '@/data/speakingExtra';
import { freeSpeakingTopics } from '@/data/speakingFree';
import { VoiceRecorder } from '@/components/sprechen/VoiceRecorder';
import { Teil3Practice } from '@/components/sprechen/Teil3Practice';
import { RussianVoiceInput } from '@/components/sprechen/RussianVoiceInput';
import { CompactTranslationEye } from '@/components/common/CompactTranslationEye';
import { HoverTranslateText } from '@/components/common/HoverTranslateText';
import { cn } from '@/lib/utils';
import { TaskList } from '@/components/common/TaskList';
import { readTrainingResume, saveTrainingResume } from '@/lib/trainingResume';

type Screen='home'|'list1'|'list2'|'list3'|'teil1'|'teil2'|'teil3'|'free'|'extra';
type SpeakingRoute='sprechen-teil1'|'sprechen-teil2'|'sprechen-teil3'|'sprechen-free'|'sprechen-extra';
interface Props {
 guest?:boolean;
 userId?:string;
 onBack:()=>void;
 onComplete:(score:number,total:number,taskId?:string)=>void;
 initialScreen?:Exclude<Screen,'home'>|null;
 onTrainingRouteChange?:(detail:SpeakingRoute|null)=>void;
 onTrainingComplete?:()=>void;
}

const SPEAKING_PROMPT_HELPERS: Readonly<Record<string, string>> = {
  'free-freizeit:2': 'С кем вы обычно это делаете?',
};

export function SpeakingModule({guest=false,userId,onBack,onComplete,initialScreen=null,onTrainingRouteChange,onTrainingComplete}:Props){
  const[screen,setScreen]=useState<Screen>(()=>initialScreen?.startsWith('teil')?`list${initialScreen.slice(-1)}` as Screen:initialScreen??'home');
  const[manual,setManual]=useState(false);
   const[t1Variant,setT1Variant]=useState(0);
  const[t2,setT2]=useState(()=>Math.min(readTrainingResume().sprechenTeil2,Math.max(0,speakingTeil2Cards.length-1)));const[free,setFree]=useState(()=>Math.min(readTrainingResume().sprechenFree,Math.max(0,freeSpeakingTopics.length-1)));
  const[showSample,setShowSample]=useState(false);const[showGuide,setShowGuide]=useState(false);const[showTip,setShowTip]=useState(false);const[practiced,setPracticed]=useState(false);
  const reset=()=>{setShowSample(false);setShowGuide(false);setShowTip(false);setPracticed(false)};
  const openPart=(p:SpeakingPart)=>{reset();setScreen(`list${p}` as Screen);onTrainingRouteChange?.(`sprechen-teil${p}` as SpeakingRoute)};
  const playPart=(p:SpeakingPart,index:number,isManual:boolean)=>{
    setManual(isManual);reset();
    if(guest&&index>=2)return;
    if(p===1)setT1Variant(index);
     if(p===2)setT2(index);
    if(p===3)setTeil3Index(index);
    setScreen(`teil${p}` as Screen);
  };
  const backToList=(p:SpeakingPart)=>{reset();setScreen(`list${p}` as Screen)};
  const[teil3Index,setTeil3Index]=useState(()=>Math.min(readTrainingResume().sprechenTeil3,Math.max(0,speakingTeil3ArchiveCards.length-1)));
  const home=()=>{reset();setScreen('home');onTrainingRouteChange?.(null)};
  const finishTeil1=()=>{reset();backToList(1)};
  const recordEvaluation=(taskId:string)=>(score:number)=>onComplete(score/100,1,taskId);

  if(screen==='home')return <div className="animate-fade-in pb-8">
    <header className="mb-5 flex min-w-0 items-start gap-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <button type="button" onClick={onBack} aria-label="Назад" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white"><ArrowLeft className="h-5 w-5 text-slate-600"/></button>
      <div className="min-w-0 flex-1"><h1 className="break-words text-2xl font-black text-slate-950">Sprechen A1</h1><p className="mt-1 text-sm leading-6 text-slate-600">Тренируйте представление, вопросы и просьбы. Нажмите на немецкое слово, чтобы увидеть перевод; произношение запускается отдельно.</p></div>
    </header>
    <h2 className="mb-3 text-xl font-black text-slate-950">Задания модуля</h2>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <PartCard icon={UserRound} badge="Teil 1" title="Sich vorstellen" description="Представьтесь по опорным словам." onClick={()=>openPart(1)}/>
      <PartCard icon={MessageCircleQuestion} badge="Teil 2" title="Informationen" description="Тема + слово: задайте простой вопрос." meta={`${speakingTeil2Cards.length} карточек`} onClick={()=>openPart(2)}/>
      <PartCard icon={HandHeart} badge="Teil 3" title="Bitten" description="Просьба по картинке и короткая реакция партнёру." meta={`${speakingTeil3ArchiveCards.length} карточек`} onClick={()=>openPart(3)}/>
    </div>
    <h2 className="mb-3 mt-6 text-xl font-black text-slate-950">Дополнительные занятия</h2>
    <div className="grid gap-3 sm:grid-cols-2">
      <PartCard icon={BookOpen} badge="Бонус" title="Короткие рассказы" description="Дополнительная тренировка языка. Не является отдельной частью экзамена." meta={`${freeSpeakingTopics.length} тем`} onClick={()=>{reset();setScreen('free');onTrainingRouteChange?.('sprechen-free')}}/>
      <PartCard icon={ClipboardList} badge="Бонус" title="Что ещё нужно уметь на экзамене" description="Тренировка стандартных умений A1. Конкретная формулировка вопроса на экзамене может отличаться." onClick={()=>{reset();setScreen('extra');onTrainingRouteChange?.('sprechen-extra')}}/>
    </div>
  </div>;

  if(screen==='list1')return <TaskList userId={userId} module="sprechen" teil={1} items={guest?[{id:'sprechen-teil1',title:'Sich vorstellen'},{id:'sprechen-teil1-name-phone',title:'Name buchstabieren und Telefonnummer nennen'}]:[{id:'sprechen-teil1',title:'Sich vorstellen'}]} guestLimit={guest?2:undefined} continueIndex={0} onBack={home} onContinue={()=>playPart(1,0,false)} onSelect={at=>playPart(1,at,true)}/>;
  if(screen==='list2')return <TaskList userId={userId} module="sprechen" teil={2} items={speakingTeil2Cards.map(card=>({id:card.id,title:`${card.theme} · ${card.keyword}`}))} guestLimit={guest?2:undefined} continueIndex={guest?Math.min(1,readTrainingResume().sprechenTeil2):readTrainingResume().sprechenTeil2} onBack={home} onContinue={()=>playPart(2,guest?Math.min(1,readTrainingResume().sprechenTeil2):readTrainingResume().sprechenTeil2,false)} onSelect={at=>playPart(2,at,true)}/>;
  if(screen==='list3')return <TaskList userId={userId} module="sprechen" teil={3} items={speakingTeil3ArchiveCards.map(card=>({id:card.id,title:card.alt}))} guestLimit={guest?2:undefined} continueIndex={guest?Math.min(1,readTrainingResume().sprechenTeil3):readTrainingResume().sprechenTeil3} onBack={home} onContinue={()=>playPart(3,guest?Math.min(1,readTrainingResume().sprechenTeil3):readTrainingResume().sprechenTeil3,false)} onSelect={at=>playPart(3,at,true)}/>;

  if(screen==='teil1')return <div className="animate-fade-in">
    <Header onBack={()=>backToList(1)} subtitle={guest&&t1Variant===1?'Teil 1 · Name und Telefonnummer':'Teil 1 · Sich vorstellen'} translation="Часть 1 · Представиться" onTip={()=>setShowTip(v=>!v)} tipOpen={showTip}/>
    <InstructionBox german={guest&&t1Variant===1?'Buchstabieren Sie Ihren Namen. Sagen Sie Ihre Telefonnummer.':'Stellen Sie sich vor. Sprechen Sie kurz über sich.'} russian={guest&&t1Variant===1?'Назовите имя по буквам и произнесите свой номер телефона.':'Представьтесь и коротко расскажите о себе по опорным словам.'}/>
    {showTip&&<ExaminerTipBox items={speakingTeil1.followUps}/>} 
    <div className="mb-5 overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="divide-y px-4 py-2 sm:px-6">{(guest&&t1Variant===1?['Wie heißen Sie?','Buchstabieren Sie bitte Ihren Namen.','Wie ist Ihre Telefonnummer?']:speakingTeil1.keywords).map(k=><div key={k} className="flex min-h-[64px] items-center justify-center py-3 text-center"><HoverTranslateText text={k} className="text-2xl font-bold sm:text-3xl"/></div>)}</div></div>
    <VoiceRecorder key={guest?t1Variant:0} evaluation={{mode:'teil1',expectedPoints:guest&&t1Variant===1?['Name buchstabieren','Telefonnummer']:speakingTeil1.checkPoints}} onPracticed={()=>setPracticed(true)} onEvaluated={recordEvaluation(guest&&t1Variant===1?'sprechen-teil1-name-phone':'sprechen-teil1')}/>
    <SampleBox show={showSample} onToggle={()=>setShowSample(v=>!v)} title="Beispiel"><p><HoverTranslateText text={speakingTeil1.sampleAnswer}/></p></SampleBox>
    <BottomActions disabled={!practiced} onNext={guest&&t1Variant===0?()=>{setT1Variant(1);reset()}:finishTeil1} onList={()=>backToList(1)} nextLabel="Завершить Teil 1"/>
  </div>;

  if(screen==='teil2'){
    const card=speakingTeil2Cards[t2];
    return <div className="animate-fade-in">
      <Header onBack={()=>backToList(2)} subtitle={`Teil 2 · Karte ${t2+1} von ${speakingTeil2Cards.length}`} translation="Часть 2 · Получение информации"/>
      <InstructionBox german="Bitten Sie um Informationen. Stellen Sie eine Frage zum Thema und zum Wort auf der Karte." russian="Задайте партнёру простой вопрос по теме и слову на карточке."/>
      <div className="mx-auto mb-5 max-w-xl overflow-hidden rounded-2xl border border-slate-400 bg-white shadow-sm">
        <ExamCardHeader label="Teil 2"/>
        <div className="flex items-center justify-between gap-3 border-b bg-slate-100 px-5 py-3"><span className="text-sm font-semibold text-slate-500">Thema</span><div className="min-w-0 flex-1 text-center text-lg font-bold"><HoverTranslateText text={card.theme}/></div><CompactTranslationEye parts={[card.theme,card.keyword]} translations={[card.themeRu,card.keywordRu]} title="Перевод карточки"/></div>
        <div className="flex min-h-[190px] items-center justify-center px-6 py-10 text-center"><HoverTranslateText text={card.keyword} className="text-4xl font-black tracking-tight sm:text-5xl"/></div>
      </div>
      <VoiceRecorder key={card.id} evaluation={{mode:'teil2',theme:card.theme,keyword:card.keyword,sampleQuestion:card.sampleQuestion}} onPracticed={()=>setPracticed(true)} onEvaluated={recordEvaluation(card.id)}/>
      <SampleBox show={showSample} onToggle={()=>setShowSample(v=>!v)} title="Beispiel">
        <SampleAudioLine label="Frage" text={card.sampleQuestion}/>
        <SampleAudioLine label="Antwort" text={card.sampleAnswer}/>
      </SampleBox>
      <BottomActions disabled={!practiced} onNext={()=>{if(t2>=(guest?1:speakingTeil2Cards.length-1)){backToList(2);return}const current=readTrainingResume().sprechenTeil2;if(current===t2)saveTrainingResume({sprechenTeil2:t2+1});setT2(t2+1);reset()}} onShuffle={guest?undefined:()=>{setT2(v=>{const next=nextRandomIndex(v,speakingTeil2Cards.length);saveTrainingResume({sprechenTeil2:next});return next});reset()}} nextLabel="Далее" onList={()=>backToList(2)} shuffleLabel="Случайная карточка"/>
    </div>;
  }

  if(screen==='teil3')return <div className="animate-fade-in">
    <Header onBack={()=>backToList(3)} subtitle="Teil 3 · Bitten" translation="Часть 3 · Просьбы"/>
    <Teil3Practice key={teil3Index} guest={guest} initialIndex={teil3Index} manual={manual} onReturnToList={()=>backToList(3)} onEvaluated={(score,taskId)=>onComplete(score/100,1,taskId)}/>
  </div>;

  if(guest&&(screen==='extra'||screen==='free'))return <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5"><b>Дополнительные занятия доступны после регистрации</b><p className="mt-2">Попробуйте сначала задания Teil 1, 2 и 3.</p><a href="/?register=1" className="mt-3 inline-block rounded-xl bg-teal-800 px-4 py-3 text-white">Зарегистрироваться</a><button onClick={home} className="ml-2 rounded-xl border px-4 py-3">Назад</button></div>;
  if(screen==='extra')return <ExtraSpeakingPractice onBack={home} onEvaluated={(score,taskId)=>onComplete(score/100,1,taskId)}/>;

  const topic=freeSpeakingTopics[free];
  return <div className="animate-fade-in">
    <Header onBack={home} subtitle={`Бонус · Thema ${free+1} von ${freeSpeakingTopics.length}`} translation="Дополнительная тренировка языка"/>
    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center"><strong className="text-amber-950">Бонус · дополнительная тренировка языка</strong><p className="mt-1 text-sm leading-6 text-amber-900">Не является отдельной частью экзамена. Помогает увереннее говорить по-немецки.</p></div>
    <InstructionBox german="Sprechen Sie frei über das Thema. Nutzen Sie die Fragen nur als Hilfe." russian="Коротко расскажите по теме своими словами. Вопросы — только опора."/>
    <div className="mb-5 overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 bg-amber-100 px-5 py-3"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-amber-800">Zusatztraining</p><h3 className="mt-1 text-xl font-black"><HoverTranslateText text={topic.title}/></h3></div><CompactTranslationEye parts={[topic.title]} translations={[topic.titleRu]} title="Перевод темы"/></div>
      <div className="p-5"><div className="space-y-3">{topic.questions.map((q,i)=>{
        const helper=SPEAKING_PROMPT_HELPERS[`${topic.id}:${i}`];
        return <div key={q} className="flex gap-3 rounded-xl bg-slate-50 p-3"><span className="font-black text-amber-700">{i+1}.</span><div className="min-w-0"><HoverTranslateText text={q}/>{helper&&<p className="mt-1 text-xs font-medium leading-5 text-slate-500">{helper}</p>}</div></div>;
      })}</div><button onClick={()=>setShowGuide(v=>!v)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 font-bold text-amber-900"><Lightbulb className="h-4 w-4"/>{showGuide?'Скрыть конструктор':'Конструктор рассказа'}</button>{showGuide&&<div className="mt-4 rounded-xl border bg-white p-4">{topic.guide.map(line=><p key={line} className="border-b border-dashed py-2"><HoverTranslateText text={line}/></p>)}</div>}</div>
    </div>
    <VoiceRecorder evaluation={{mode:'free',title:topic.title,expectedPoints:topic.questions}} onPracticed={()=>setPracticed(true)} onEvaluated={recordEvaluation(topic.id)} hint="Говорите примерно 45–120 секунд."/>
    <SampleBox show={showSample} onToggle={()=>setShowSample(v=>!v)} title="Beispiel"><SampleAudioLine text={topic.sample}/></SampleBox>
    <BottomActions disabled={!practiced} onNext={()=>{setFree(v=>{const next=(v+1)%freeSpeakingTopics.length;saveTrainingResume({sprechenFree:next});return next});reset()}} onShuffle={()=>{setFree(v=>{const next=nextRandomIndex(v,freeSpeakingTopics.length);saveTrainingResume({sprechenFree:next});return next});reset()}} nextLabel="Следующая тема"/>
  </div>;
}

function ExtraSpeakingPractice({onBack,onEvaluated}:{onBack:()=>void;onEvaluated:(score:number,taskId:string)=>void}){
  const[index,setIndex]=useState(()=>Math.min(readTrainingResume().sprechenExtra,Math.max(0,speakingExtraPrompts.length-1)));const[input,setInput]=useState('');const[help,setHelp]=useState<{german:string;russian:string;tip:string}|null>(null);const[loading,setLoading]=useState(false);const[error,setError]=useState<string|null>(null);const prompt=speakingExtraPrompts[index];
  const askOtto=async()=>{const text=input.trim();if(!text){setError('Напишите или скажите свой вариант по-русски.');return}setLoading(true);setError(null);setHelp(null);try{const r=await fetch('/api/translate-task',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'speaking-help',question:prompt.question,input:text})});const p=await r.json().catch(()=>null);if(!r.ok)throw new Error(p?.error||'Отто сейчас не смог помочь.');setHelp({german:String(p.german||''),russian:String(p.russian||''),tip:String(p.tip||'')})}catch(e){setError(e instanceof Error?e.message:'Не удалось получить подсказку.')}finally{setLoading(false)}};
  const move=(next:number)=>{const normalized=(next+speakingExtraPrompts.length)%speakingExtraPrompts.length;saveTrainingResume({sprechenExtra:normalized});setIndex(normalized);setInput('');setHelp(null);setError(null)};
  return <div className="animate-fade-in pb-8">
    <Header onBack={onBack} subtitle={`Zusatztraining · ${index+1} von ${speakingExtraPrompts.length}`} translation="Что ещё нужно уметь на экзамене"/>
    <div className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-center gap-2 font-black text-amber-950"><Lightbulb className="h-5 w-5"/>Что ещё нужно уметь на экзамене</div><p className="mt-2 text-sm leading-6 text-amber-900">Здесь тренируются типичные умения формата A1. Конкретные слова и формулировки экзаменатора могут отличаться.</p></div>
    <div className="mb-5 rounded-3xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3"><span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-teal-700">{prompt.label}</span><button type="button" onClick={()=>speakGerman(prompt.question)} aria-label="Прослушать вопрос" className="flex h-10 w-10 items-center justify-center rounded-xl border bg-white"><Volume2 className="h-4 w-4"/></button></div>
      <h2 className="text-2xl font-black leading-tight"><HoverTranslateText text={prompt.question}/></h2><p className="mt-2 text-sm text-slate-500">{prompt.questionRu}</p>
      <div className="mt-5 rounded-2xl bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Beispiel</p><p className="mt-2 font-bold"><HoverTranslateText text={prompt.sample}/></p><p className="mt-1 text-sm text-slate-500">{prompt.sampleRu}</p></div><button type="button" onClick={()=>speakGerman(prompt.sample)} aria-label="Прослушать пример" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-white"><Volume2 className="h-4 w-4"/></button></div><p className="mt-3 text-sm text-teal-800">{prompt.guide}</p></div>
    </div>
    <div className="mb-5 rounded-3xl border bg-white p-5 shadow-sm">
      <label className="font-black" htmlFor="otto-own-speaking-answer">Мой вариант</label>
      <p className="mt-1 text-sm leading-5 text-slate-500">Можно написать ответ по-русски или нажать микрофон и сказать его вслух. Распознанный текст появится в этом поле.</p>
      <textarea id="otto-own-speaking-answer" value={input} onChange={e=>setInput(e.target.value)} rows={3} placeholder="Например: Я работаю бухгалтером и живу в Санкт-Петербурге." className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-teal-500"/>
      <RussianVoiceInput onText={setInput}/>
      <button type="button" onClick={askOtto} disabled={!input.trim()||loading} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 font-bold text-white disabled:opacity-40"><Sparkles className="h-4 w-4"/>{loading?'Отто готовит вариант…':'Сформулировать по-немецки A1'}</button>
      {error&&<p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {help&&<div className="mt-4 space-y-2 rounded-2xl border border-teal-200 bg-teal-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-teal-700">Ваш вариант на немецком</p><p className="font-bold">{help.german}</p><p className="text-sm text-slate-600">{help.russian}</p>{help.tip&&<p className="text-sm text-teal-800">{help.tip}</p>}<button type="button" onClick={()=>speakGerman(help.german)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-teal-200 bg-white px-3 text-sm font-bold text-teal-900"><Volume2 className="h-4 w-4"/>Прослушать</button></div>}
    </div>
    <VoiceRecorder evaluation={{mode:'free',title:prompt.question,expectedPoints:[prompt.guide]}} onPracticed={()=>{}} onEvaluated={(score)=>onEvaluated(score,`extra-${prompt.id}`)} hint="Теперь попробуйте произнести готовый немецкий вариант вслух."/>
    <div className="grid grid-cols-2 gap-3"><button type="button" onClick={()=>move(index-1)} className="min-h-12 rounded-xl border bg-white px-4 font-bold">Назад</button><button type="button" onClick={()=>move(index+1)} className="min-h-12 rounded-xl bg-slate-900 px-4 font-bold text-white">Следующее задание</button></div>
  </div>;
}

function Header({onBack,subtitle,translation,onTip,tipOpen=false}:{onBack:()=>void;subtitle:string;translation:string;onTip?:()=>void;tipOpen?:boolean}){return <div className="mb-5 flex min-h-[68px] items-start gap-3"><button onClick={onBack} aria-label="Назад" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white"><ArrowLeft className="h-5 w-5"/></button><div className="min-w-0 flex-1 text-center"><h2 className="text-2xl font-black">Sprechen</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><div className="flex shrink-0 gap-2">{onTip&&<button onClick={onTip} aria-label="Подсказка экзаменатора" className={cn('flex h-11 w-11 items-center justify-center rounded-xl border',tipOpen?'bg-amber-50 text-amber-800':'bg-white')}><Lightbulb className="h-5 w-5"/></button>}<CompactTranslationEye parts={[subtitle]} translations={[translation]} title="Перевод"/></div></div>}

function PartCard({badge,title,description,meta,onClick,icon:Icon}:{badge:string;title:string;description:string;meta?:string;onClick:()=>void;icon:typeof UserRound}){
  return <button type="button" onClick={onClick} className="group min-w-0 rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg">
    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50"><Icon className="h-6 w-6 text-amber-700"/></span>
    <span className="mt-3 block text-xs font-black uppercase tracking-wider text-teal-700">{badge}</span>
    <span className="mt-1 block break-words text-xl font-black text-slate-950">{title}</span>
    <span className="mt-2 block break-words text-sm leading-6 text-slate-600">{description}</span>
    {meta&&<span className="mt-3 block text-xs font-semibold leading-5 text-slate-500">{meta}</span>}
  </button>;
}
function InstructionBox({german,russian}:{german:string;russian:string}){return <div className="mb-5 flex items-start justify-between gap-3 rounded-2xl border bg-slate-50 p-5"><p className="font-medium leading-7"><HoverTranslateText text={german}/></p><CompactTranslationEye parts={[german]} translations={[russian]} title="Перевод задания"/></div>}
function ExaminerTipBox({items}:{items:string[]}){return <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><h3 className="mb-2 text-center text-sm font-bold text-amber-900">Стандартное продолжение Teil 1</h3><p className="mb-3 text-center text-xs leading-5 text-amber-800">В официальном Modellsatz после представления экзаменатор просит назвать по буквам одно слово и назвать число. Конкретный вопрос может отличаться.</p><div className="space-y-2">{items.map(item=><div key={item} className="rounded-xl bg-white p-3 text-center"><HoverTranslateText text={item}/></div>)}</div></div>}
function ExamCardHeader({label}:{label:string}){return <div className="bg-slate-100 px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-slate-600">{label}</div>}
function SampleBox({show,onToggle,title,children}:{show:boolean;onToggle:()=>void;title:string;children:ReactNode}){return <div className="mb-5 rounded-2xl border bg-white p-5"><button onClick={onToggle} className="inline-flex items-center gap-2 text-sm font-semibold"><Eye className="h-4 w-4"/>{show?'Скрыть пример':'Показать пример после своего ответа'}</button>{show&&<div className="mt-4 rounded-xl bg-amber-50 p-4 text-[16px] leading-7"><div className="mb-2 text-xs font-bold uppercase text-amber-700">{title}</div>{children}</div>}</div>}
function SampleAudioLine({label,text}:{label?:string;text:string}){return <div className="mt-2 flex items-start gap-3 rounded-xl bg-white/70 p-3 first:mt-0"><div className="min-w-0 flex-1">{label&&<span className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-400">{label}</span>}<HoverTranslateText text={text}/></div><button type="button" onClick={()=>speakGerman(text)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-white text-teal-800" aria-label={`Прослушать ${label||'пример'}`}><Volume2 className="h-4 w-4"/></button></div>}
function BottomActions({disabled,onNext,onList,onShuffle,nextLabel,shuffleLabel='Случайная тема'}:{disabled:boolean;onNext:()=>void;onList?:()=>void;onShuffle?:()=>void;nextLabel:string;shuffleLabel?:string}){return <div className="flex flex-col-reverse gap-3 pb-20 sm:flex-row sm:justify-end">{onList&&<button type="button" onClick={onList} className="min-h-[52px] rounded-xl border bg-white px-3 text-sm font-bold">К списку заданий</button>}{onShuffle&&<button onClick={onShuffle} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border bg-white px-5 font-semibold"><RefreshCw className="h-4 w-4"/>{shuffleLabel}</button>}<button onClick={onNext} disabled={disabled} className={cn('inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-6 font-semibold',disabled?'bg-slate-100 text-slate-400':'bg-slate-900 text-white')}>{nextLabel}<ArrowRight className="h-4 w-4"/></button></div>}
function nextRandomIndex(current:number,total:number){if(total<=1)return 0;let next=current;while(next===current)next=Math.floor(Math.random()*total);return next}
function speakGerman(text:string){const clean=text.trim();if(!clean)return;const api=(window as Window&{OttoSpeech?:{play?:(value:string,options?:{mode?:'normal'|'slow'})=>Promise<boolean>}}).OttoSpeech;if(api?.play){void api.play(clean,{mode:'normal'});return}if(!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(clean);utterance.lang='de-DE';utterance.rate=.84;const voices=window.speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith('de'));utterance.voice=voices.find(v=>/natural|premium|google|microsoft/i.test(v.name))||voices[0]||null;window.speechSynthesis.speak(utterance)}
