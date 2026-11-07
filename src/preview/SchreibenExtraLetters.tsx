import { useMemo, useState, type ReactNode } from 'react';
import { useResetLearningStepScroll } from '@/preview/LearningStepScroll';
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { AssignmentOverlay, AutoRussianTranslation, GermanAudioButton, GermanLine, OttoError, SkipAction, SkippedAnswer, StepBackButton, StepNextBack, SchreibenTaskOverview, CompletedSchreibenLetter, explainBuildError, explainTypingError, speakGerman, reviewedTrainingLetterTranslation } from '@/preview/SchreibenPracticeTools';
import { TranslationButton } from '@/preview/LearningTranslation';

type LetterKind='personal'|'formal';

type LessonLetter={
  id:number;
  title:string;
  task:string;
  points:string[];
  translationIntro:string;
  translationPoints:string[];
  kind:LetterKind;
  greeting:string;
  answers:[string,string,string];
  closing:string;
};

const LETTERS:LessonLetter[]=[
  {
    id:1,
    title:'Tenniskurs',
    task:'Sie möchten einen Tenniskurs besuchen.\nSchreiben Sie an den Sportverein.',
    points:['Warum?','An welchen Tagen?','Preis.'],
    translationIntro:'Вы хотите посещать теннисный курс.\nНапишите в спортивный клуб.',
    translationPoints:['Объясните, почему вы обращаетесь в спортивный клуб: вы хотите посещать теннисный курс.','Спросите, в какие дни проходят занятия теннисом.','Узнайте, сколько стоит теннисный курс.'],
    kind:'formal',
    greeting:'Sehr geehrte Damen und Herren,',
    answers:['Ich möchte einen Tenniskurs besuchen.','An welchen Tagen findet der Kurs statt?','Wie viel kostet der Kurs?'],
    closing:'Mit freundlichen Grüßen',
  },
  {
    id:2,
    title:'Поездка к Stefan',
    task:'Sie möchten Ihren Freund Stefan in Bremen besuchen.\nSchreiben Sie eine Karte.',
    points:['Wann möchten Sie kommen?','Wie reisen Sie?','Was möchten Sie zusammen machen?'],
    translationIntro:'Вы хотите навестить своего друга Штефана в Бремене.',
    translationPoints:['Напишите, когда вы хотите приехать к Штефану.','Расскажите, как вы собираетесь добраться до Бремена.','Предложите, что вы хотите сделать вместе.'],
    kind:'personal',
    greeting:'Lieber Stefan,',
    answers:['Ich möchte am Samstag kommen.','Ich komme mit dem Zug.','Ich möchte mit dir Bremen besichtigen.'],
    closing:'Liebe Grüße',
  },
  {
    id:3,
    title:'Emma заболела',
    task:'Ihre Tochter Emma ist krank.\nSchreiben Sie an die Schule.',
    points:['Sie fehlt vom 3. bis 6. März.','Warum?','Fragen Sie nach den Hausaufgaben.'],
    translationIntro:'Ваша дочь Эмма заболела.\nНапишите в школу.',
    translationPoints:['Сообщите, что Эмма не будет в школе с 3 по 6 марта.','Объясните причину её отсутствия: Эмма заболела.','Попросите прислать домашние задания.'],
    kind:'formal',
    greeting:'Sehr geehrte Damen und Herren,',
    answers:['Meine Tochter Emma ist krank.','Sie fehlt vom 3. bis 6. März.','Können Sie mir bitte die Hausaufgaben schicken?'],
    closing:'Mit freundlichen Grüßen',
  },
  {
    id:4,
    title:'Hamburg',
    task:'Sie möchten im September Hamburg besuchen.\nSchreiben Sie an die Touristeninformation.',
    points:['Warum schreiben Sie?','Informationen über Museen und Konzerte?','Hoteladressen?'],
    translationIntro:'Вы хотите посетить Гамбург в сентябре.\nНапишите в туристический информационный центр.',
    translationPoints:['Объясните, зачем обращаетесь: хотите посетить Гамбург в сентябре.','Спросите о музеях и концертах Гамбурга.','Попросите адреса гостиниц.'],
    kind:'formal',
    greeting:'Sehr geehrte Damen und Herren,',
    answers:['Ich möchte im September Hamburg besuchen.','Können Sie mir Informationen über Museen und Konzerte schicken?','Können Sie mir bitte Hoteladressen schicken?'],
    closing:'Mit freundlichen Grüßen',
  },
  {
    id:5,
    title:'Помощь с покупкой компьютера',
    task:'Sie möchten einen Computer kaufen.\nSchreiben Sie Ihrem Freund Markus.',
    points:['Bitten Sie um Hilfe.','Wann hat Markus Zeit?','Wo treffen Sie sich?'],
    translationIntro:'Вы хотите купить компьютер.\nНапишите своему другу Маркусу.',
    translationPoints:['Попросите Маркуса помочь с покупкой компьютера.','Спросите, когда у него будет свободное время.','Договоритесь, где вы сможете встретиться.'],
    kind:'personal',
    greeting:'Lieber Markus,',
    answers:['Kannst du mir bitte helfen?','Wann hast du Zeit?','Wo können wir uns treffen?'],
    closing:'Liebe Grüße',
  },
  {
    id:6,
    title:'Приглашение Frau Schneider',
    task:'Frau Schneider hat Sie zu ihrer Geburtstagsfeier eingeladen.',
    points:['Danken Sie.','Sie können leider nicht kommen.','Was machen Sie am Wochenende?'],
    translationIntro:'Госпожа Шнайдер пригласила вас на день рождения.',
    translationPoints:['Поблагодарите госпожу Шнайдер за приглашение.','Сообщите, что, к сожалению, не сможете прийти.','Расскажите, что вы делаете на выходных.'],
    kind:'formal',
    greeting:'Sehr geehrte Frau Schneider,',
    answers:['Vielen Dank für die Einladung.','Leider kann ich nicht kommen.','Am Wochenende muss ich arbeiten.'],
    closing:'Mit freundlichen Grüßen',
  },
  {
    id:7,
    title:'Fotokurs',
    task:'Sie möchten einen Fotokurs besuchen.\nSchreiben Sie an die Volkshochschule.',
    points:['Warum schreiben Sie?','Wann beginnt der Kurs?','Wie viel kostet der Kurs?'],
    translationIntro:'Вы хотите посещать фотокурс.\nНапишите в Volkshochschule.',
    translationPoints:['Объясните, зачем пишете: хотите посещать фотокурс.','Спросите, когда начинается фотокурс.','Узнайте стоимость фотокурса.'],
    kind:'formal',
    greeting:'Sehr geehrte Damen und Herren,',
    answers:['Ich möchte einen Fotokurs besuchen.','Wann beginnt der Kurs?','Wie viel kostet der Kurs?'],
    closing:'Mit freundlichen Grüßen',
  },
  {
    id:8,
    title:'Monika',
    task:'Ihre Freundin Monika möchte Sie im Juli besuchen.\nLeider müssen Sie dienstlich nach Köln fahren.\nSchreiben Sie an Monika.',
    points:['Warum schreiben Sie?','Neuer Termin.','Sie haben im August Geburtstag.'],
    translationIntro:'Ваша подруга Моника хочет приехать к вам в июле.\nНо вам нужно по работе поехать в Кёльн.',
    translationPoints:['Объясните, почему пишете Монике: в июле вам нужно по работе ехать в Кёльн.','Предложите другую дату её приезда.','Сообщите, что в августе у вас день рождения.'],
    kind:'personal',
    greeting:'Liebe Monika,',
    answers:['Leider muss ich im Juli nach Köln fahren.','Können wir uns im August treffen?','Im August habe ich Geburtstag.'],
    closing:'Liebe Grüße',
  },
  {
    id:9,
    title:'Fernseher',
    task:'Sie möchten im Internet einen Fernseher kaufen.\nDer Verkäufer heißt Herr Hoffmann.',
    points:['Warum schreiben Sie?','Preis?','Wann können Sie den Fernseher abholen?'],
    translationIntro:'Вы хотите купить телевизор через интернет.\nПродавца зовут господин Хоффман.',
    translationPoints:['Объясните, что хотите купить телевизор у господина Хоффмана.','Спросите, сколько стоит телевизор.','Узнайте, когда можно забрать телевизор.'],
    kind:'formal',
    greeting:'Sehr geehrter Herr Hoffmann,',
    answers:['Ich möchte den Fernseher kaufen.','Wie viel kostet der Fernseher?','Wann kann ich den Fernseher abholen?'],
    closing:'Mit freundlichen Grüßen',
  },
  {
    id:10,
    title:'День рождения Anna и Tobias',
    task:'Sie möchten Ihren Geburtstag feiern und Ihre Freunde Anna und Tobias einladen.',
    points:['Warum schreiben Sie?','Wann ist die Party?','Wie kommen die Freunde?'],
    translationIntro:'Вы хотите отпраздновать день рождения и пригласить друзей Анну и Тобиаса.',
    translationPoints:['Напишите, что приглашаете Анну и Тобиаса на свой день рождения.','Сообщите, когда состоится вечеринка.','Объясните, как друзьям к вам добраться.'],
    kind:'personal',
    greeting:'Liebe Anna, lieber Tobias,',
    answers:['Ich möchte euch zu meinem Geburtstag einladen.','Die Party ist am Samstag um 18 Uhr.','Ihr könnt mit dem Bus kommen.'],
    closing:'Liebe Grüße',
  },
  {
    id:11,
    title:'Ferienjob',
    task:'Sie möchten im Sommer einen Ferienjob machen.\nSchreiben Sie an ein Café.',
    points:['Warum schreiben Sie?','Wann können Sie arbeiten?','Wie hoch ist der Lohn?'],
    translationIntro:'Вы хотите летом подработать.\nНапишите в кафе.',
    translationPoints:['Объясните, что ищете летнюю работу в кафе.','Напишите, когда вы можете работать.','Спросите о размере оплаты за работу.'],
    kind:'formal',
    greeting:'Sehr geehrte Damen und Herren,',
    answers:['Ich möchte im Sommer in Ihrem Café arbeiten.','Ich kann im Juli und August arbeiten.','Wie hoch ist der Lohn?'],
    closing:'Mit freundlichen Grüßen',
  },
  {
    id:12,
    title:'Daniel / перенос встречи',
    task:'Sie haben am Sonntag einen Termin mit Ihrem Nachbarn Daniel.\nJetzt müssen Sie aber arbeiten.\nSchreiben Sie Daniel.',
    points:['Entschuldigung.','Neuer Termin.','Zusammen Kaffee trinken?'],
    translationIntro:'В воскресенье у вас встреча с соседом Даниэлем, но теперь вам нужно работать.',
    translationPoints:['Извинитесь перед Даниэлем за невозможность встретиться в воскресенье.','Предложите другую дату встречи.','Предложите вместе выпить кофе.'],
    kind:'personal',
    greeting:'Lieber Daniel,',
    answers:['Es tut mir leid, ich muss am Sonntag arbeiten.','Können wir uns am Montag treffen?','Möchtest du mit mir Kaffee trinken?'],
    closing:'Liebe Grüße',
  },
  {
    id:13,
    title:'Autovermietung',
    task:'Sie möchten ein Auto mieten.\nSchreiben Sie an eine Autovermietung.',
    points:['Warum schreiben Sie?','Für wie viele Tage?','Wie viel kostet das?'],
    translationIntro:'Вы хотите взять автомобиль напрокат.',
    translationPoints:['Объясните, что хотите арендовать автомобиль.','Напишите, на сколько дней вам нужен автомобиль.','Спросите, сколько стоит аренда.'],
    kind:'formal',
    greeting:'Sehr geehrte Damen und Herren,',
    answers:['Ich möchte ein Auto mieten.','Ich brauche das Auto für drei Tage.','Wie viel kostet das?'],
    closing:'Mit freundlichen Grüßen',
  },
  {
    id:14,
    title:'Frau Berger',
    task:'Ihre neue Kollegin Frau Berger hat Sie am Mittwoch um 18 Uhr eingeladen.\nSchreiben Sie an Frau Berger.',
    points:['Warum schreiben Sie?','Sie kommen später.','Können Sie helfen?'],
    translationIntro:'Ваша новая коллега госпожа Бергер пригласила вас в среду в 18 часов.',
    translationPoints:['Напишите госпоже Бергер по поводу её приглашения.','Сообщите, что придёте позднее.','Спросите, можете ли вы чем-нибудь помочь.'],
    kind:'formal',
    greeting:'Sehr geehrte Frau Berger,',
    answers:['Vielen Dank für die Einladung.','Ich komme am Mittwoch später.','Kann ich Ihnen helfen?'],
    closing:'Mit freundlichen Grüßen',
  },
  {
    id:15,
    title:'Grillparty',
    task:'Schreiben Sie eine Einladung zu einer Grillparty.',
    points:['Warum machen Sie die Party?','Wann?','Was sollen die Freunde mitbringen?'],
    translationIntro:'Напишите приглашение на вечеринку с грилем.',
    translationPoints:['Объясните, почему вы устраиваете вечеринку с грилем.','Сообщите, когда она состоится.','Напишите, что друзья должны принести с собой.'],
    kind:'personal',
    greeting:'Liebe Freunde,',
    answers:['Ich habe Geburtstag und mache eine Grillparty.','Die Party ist am Samstag um 18 Uhr.','Bringt bitte Salat und Getränke mit.'],
    closing:'Liebe Grüße',
  },
];

type ExtraProgress={
  currentLetter:number;
  currentStep:number;
  completed:number[];
  name:string;
  statuses:Record<string,'correct'|'skipped'>;
};

const STORAGE_PREFIX='otto-preview-schreiben-extra-letters-v1:';
const TRAINING_LETTER_COUNT=5;

// Preserve existing saved step and draft keys: old explanation step 3 now opens step 4.
function resumeExtraStep(step:number){return step===3?4:step===8?9:step}
function nextExtraStep(step:number){return Math.min(9,step===2?4:step===7?9:step+1)}
function previousExtraStep(step:number){return step===9?7:step===4?2:step-1}

function readProgress(userId?:string):ExtraProgress{
  try{
    const raw=localStorage.getItem(STORAGE_PREFIX+(userId||'local'));
    if(!raw)return {currentLetter:0,currentStep:0,completed:[],name:'',statuses:{}};
    const parsed=JSON.parse(raw) as Partial<ExtraProgress>;
    return {
      currentLetter:Number.isInteger(parsed.currentLetter)?Math.max(0,Math.min(TRAINING_LETTER_COUNT-1,Number(parsed.currentLetter))):0,
      currentStep:Number.isInteger(parsed.currentStep)?resumeExtraStep(Math.max(0,Math.min(10,Number(parsed.currentStep)))):0,
      completed:Array.isArray(parsed.completed)?parsed.completed.filter(v=>Number.isInteger(v)&&v>=0&&v<15):[],
      name:typeof parsed.name==='string'?parsed.name:'',
      statuses:parsed.statuses&&typeof parsed.statuses==='object'?parsed.statuses as Record<string,'correct'|'skipped'>:{},
    };
  }catch{
    return {currentLetter:0,currentStep:0,completed:[],name:'',statuses:{}};
  }
}

function saveProgress(value:ExtraProgress,userId?:string){
  try{localStorage.setItem(STORAGE_PREFIX+(userId||'local'),JSON.stringify(value))}catch{}
}

function Card({children}:{children:ReactNode}){
  return <section className="rounded-[28px] border border-white/90 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,.08)] sm:p-8">{children}</section>;
}

function TaskCard({letter}:{letter:LessonLetter}){
  return <SchreibenTaskOverview body={letter.task} points={letter.points} translation={letter.translationIntro} explanations={letter.translationPoints}/>;
}

function mixWords(sentence:string){
  const parts=sentence.split(' ').filter(Boolean);
  const odd=parts.filter((_,i)=>i%2===1).reverse();
  const even=parts.filter((_,i)=>i%2===0).reverse();
  return [...odd,...even];
}

// Only React memory, keyed by letter and step; existing progress storage stays unchanged.
type ExerciseDraft={selected?:string;chosen?:string[];value?:string;result?:boolean|null;skipped?:boolean};

function Choice({
  title,
  options,
  answer,
  onBack,
  onNext,
  onStatus,
  draft,
  onDraft,
}:{
  title:string;
  options:string[];
  answer:string;
  onBack:()=>void;
  onNext:()=>void;
  onStatus:(status:'correct'|'skipped')=>void;
  draft?:ExerciseDraft;
  onDraft:(patch:Partial<ExerciseDraft>)=>void;
}){
  const selected=draft?.selected??'';
  const result=draft?.result??null;
  const skipped=draft?.skipped??false;
  const retry=()=>{onDraft({result:null})};
  if(skipped)return <Card><SkippedAnswer answer={answer} onNext={onNext} onBack={onBack}/></Card>;
  return <Card>
    <p className="otto-kicker">ВЫБЕРИТЕ ВАРИАНТ</p>
    <h2 className="mt-2 text-3xl font-black text-slate-950">{title}</h2>
    <div className="mt-5 grid gap-3">{options.map(option=><button key={option} type="button" disabled={result!==null} onClick={()=>onDraft({selected:option})} className={selected===option?'min-h-12 rounded-xl border-2 border-teal-500 bg-teal-50 px-4 py-3 text-left font-bold':'min-h-12 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-left font-bold'}>{option}</button>)}</div>
    {result===null&&<><div className="mt-5 grid grid-cols-2 gap-2"><StepBackButton onClick={onBack}/><button type="button" disabled={!selected} onClick={()=>{const ok=selected===answer;onDraft({result:ok});if(ok)onStatus('correct')}} className="min-h-12 rounded-xl bg-slate-900 px-3 font-black text-white disabled:opacity-40">Проверить</button></div><div className="mt-2 [&>button]:w-full"><SkipAction onSkip={()=>{onStatus('skipped');onDraft({skipped:true})}}/></div></>}
    {result===false&&<OttoError text={'Ты выбрал «'+selected+'». Этот вариант не подходит текущему письму. Посмотри, кому адресовано письмо, и выбери обращение или прощание, которое соответствует этому адресату.'} onRetry={retry}/>}
    {result===true&&<div className="mt-5"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-black text-emerald-900">Правильно ✓</div><div className="mt-3 rounded-2xl border bg-white p-4"><GermanAudioButton text={answer} label="Послушать"/><div className="mt-2"><AutoRussianTranslation text={answer}/></div></div><StepNextBack onBack={onBack} onNext={onNext}/></div>}
    {result===false&&<div className="mt-5"><StepBackButton onClick={onBack}/></div>}
  </Card>;
}

function Build({
  title,
  point,
  explanation,
  answer,
  onBack,
  onNext,
  onStatus,
  draft,
  onDraft,
}:{
  title:string;
  point:string;
  explanation:string;
  answer:string;
  onBack:()=>void;
  onNext:()=>void;
  onStatus:(status:'correct'|'skipped')=>void;
  draft?:ExerciseDraft;
  onDraft:(patch:Partial<ExerciseDraft>)=>void;
}){
  const tiles=useMemo(()=>mixWords(answer),[answer]);
  const selected=draft?.chosen??[];
  const result=draft?.result??null;
  const skipped=draft?.skipped??false;
  const used=(tile:string,index:number)=>selected.filter(v=>v===tile).length>=tiles.slice(0,index+1).filter(v=>v===tile).length;
  const retry=()=>onDraft({result:null});
  if(skipped)return <Card><SkippedAnswer answer={answer} onNext={onNext} onBack={onBack}/></Card>;
  return <Card>
    <p className="otto-kicker">СОБЕРИТЕ ПРЕДЛОЖЕНИЕ</p>
    <h2 className="mt-2 text-3xl font-black text-slate-950">{title}</h2>
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p lang="de" className="font-bold text-slate-800">{point}</p><p className="mt-2 text-sm leading-6 text-slate-600">{explanation}</p></div>
    <div className="mt-5 min-h-[84px] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-3">{selected.length?<div className="flex flex-wrap gap-2">{selected.map((word,index)=><span key={word+index} className="rounded-xl bg-white px-3 py-2 font-bold shadow-sm">{word}</span>)}</div>:<span className="text-sm text-slate-400">Нажимайте слова по порядку</span>}</div>
    <div className="mt-4 flex flex-wrap gap-2">{tiles.map((tile,index)=><div key={tile+index} className="flex items-center gap-1"><button type="button" disabled={used(tile,index)||result!==null} onClick={()=>onDraft({chosen:[...selected,tile]})} className="rounded-xl border bg-white px-3 py-2 font-bold disabled:opacity-30">{tile}</button><button type="button" onClick={()=>speakGerman(tile)} className="grid h-9 w-9 place-items-center rounded-xl border border-teal-200 bg-white text-teal-800" aria-label={'Прослушать '+tile}>🔊</button><TranslationButton parts={[tile]} title="Перевод слова"/></div>)}</div>
    {result===null&&<div className="mt-5 grid gap-2 sm:grid-cols-[auto_1fr_auto]"><button type="button" onClick={()=>onDraft({chosen:[]})} className="min-h-11 rounded-xl border bg-white px-4 font-bold"><RotateCcw className="mr-2 inline h-4 w-4"/>Сначала</button><button type="button" disabled={!selected.length} onClick={()=>{const ok=selected.join(' ')===answer;onDraft({result:ok});if(ok)onStatus('correct')}} className="min-h-11 rounded-xl bg-slate-900 px-4 font-black text-white disabled:opacity-40">Проверить</button><SkipAction onSkip={()=>{onStatus('skipped');onDraft({skipped:true})}}/></div>}
    {result===false&&<OttoError text={explainBuildError(selected,answer)} onRetry={retry}/>}
    {result===true&&<div className="mt-5"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-black text-emerald-900">Правильно ✓</div><div className="mt-3 rounded-2xl border bg-white p-4"><GermanAudioButton text={answer} label="Послушать предложение"/><div className="mt-2"><AutoRussianTranslation text={answer}/></div></div><StepNextBack onBack={onBack} onNext={onNext}/></div>}
    {result!==true&&<div className="mt-5"><StepBackButton onClick={onBack}/></div>}
  </Card>;
}

function TypeSentence({
  title,
  point,
  explanation,
  answer,
  onBack,
  onNext,
  onStatus,
  draft,
  onDraft,
}:{
  title:string;
  point:string;
  explanation:string;
  answer:string;
  onBack:()=>void;
  onNext:()=>void;
  onStatus:(status:'correct'|'skipped')=>void;
  draft?:ExerciseDraft;
  onDraft:(patch:Partial<ExerciseDraft>)=>void;
}){
  const value=draft?.value??'';
  const result=draft?.result??null;
  const skipped=draft?.skipped??false;
  const normalize=(text:string)=>text.toLocaleLowerCase('de-DE').replace(/[.,!?;:]/g,'').replace(/\s+/g,' ').trim();
  if(skipped)return <Card><SkippedAnswer answer={answer} onNext={onNext} onBack={onBack}/></Card>;
  return <Card>
    <p className="otto-kicker">НАПИШИТЕ САМОСТОЯТЕЛЬНО</p>
    <h2 className="mt-2 text-3xl font-black text-slate-950">{title}</h2>
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p lang="de" className="font-bold text-slate-800">{point}</p><p className="mt-2 text-sm leading-6 text-slate-600">{explanation}</p></div>
    <input value={value} disabled={result!==null} onChange={event=>onDraft({value:event.target.value})} className="mt-5 min-h-14 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-lg outline-none focus:border-teal-500" placeholder="Напишите предложение"/>
    {result===null&&<div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]"><button type="button" disabled={!value.trim()} onClick={()=>{const ok=normalize(value)===normalize(answer);onDraft({result:ok});if(ok)onStatus('correct')}} className="min-h-12 rounded-xl bg-slate-900 px-5 font-black text-white disabled:opacity-40">Проверить</button><SkipAction onSkip={()=>{onStatus('skipped');onDraft({skipped:true})}}/></div>}
    {result===false&&<OttoError text={explainTypingError(value,answer)} onRetry={()=>onDraft({result:null})}/>}
    {result===true&&<div className="mt-5"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-black text-emerald-900">Правильно ✓</div><div className="mt-3 rounded-2xl border bg-white p-4"><GermanAudioButton text={answer} label="Послушать предложение"/><div className="mt-2"><AutoRussianTranslation text={answer}/></div></div><StepNextBack onBack={onBack} onNext={onNext}/></div>}
    {result!==true&&<div className="mt-5"><StepBackButton onClick={onBack}/></div>}
  </Card>;
}

function FinalLetter({letter,name}:{letter:LessonLetter;name:string}){
  const first=letter.answers[0].charAt(0).toLocaleLowerCase('de-DE')+letter.answers[0].slice(1);
  return <CompletedSchreibenLetter lines={[letter.greeting,first,letter.answers[1],letter.answers[2],letter.closing,name||'Name']}/>;
}

export function SchreibenExtraLetters({
  userId,
  onBackToFirstCycle,
  onRestartExplanations,
  onOpenModules,
  onOpenRealSchreiben,
}:{
  userId?:string;
  onBackToFirstCycle:()=>void;
  onRestartExplanations:()=>void;
  onOpenModules:()=>void;
  onOpenRealSchreiben:()=>void;
}){
  const initial=readProgress(userId);
  const[currentLetter,setCurrentLetter]=useState(initial.currentLetter);
  const[currentStep,setCurrentStep]=useState(initial.currentStep);
  const[completed,setCompleted]=useState<number[]>(initial.completed);
  const[name,setName]=useState(initial.name);
  const[nameError,setNameError]=useState('');
  const[statuses,setStatuses]=useState<Record<string,'correct'|'skipped'>>(initial.statuses);
  const[drafts,setDrafts]=useState<Record<string,ExerciseDraft>>({});
  const[showResume,setShowResume]=useState(initial.currentStep>0||initial.currentLetter>0);
  const[showTask,setShowTask]=useState(false);
  const[returnToLetter,setReturnToLetter]=useState<number|null>(null);
  const[returnToStep,setReturnToStep]=useState<number|null>(null);
  const letter=LETTERS[currentLetter];
  const draftKey=currentLetter+':'+currentStep;
  const updateDraft=(patch:Partial<ExerciseDraft>)=>setDrafts(previous=>({...previous,[draftKey]:{...previous[draftKey],...patch}}));
  useResetLearningStepScroll(`extraLetters:${currentLetter}:${currentStep}`);

  const persist=(next?:Partial<ExtraProgress>)=>{
    saveProgress({
      currentLetter:next?.currentLetter??currentLetter,
      currentStep:next?.currentStep??currentStep,
      completed:next?.completed??completed,
      name:next?.name??name,
      statuses:next?.statuses??statuses,
    },userId);
  };

  const markStatus=(status:'correct'|'skipped')=>{
    const key=String(currentLetter)+':'+String(currentStep);
    const next={...statuses,[key]:status};
    setStatuses(next);
    persist({statuses:next});
  };

  const advanceWithStatus=(status:'correct'|'skipped')=>{
    const key=String(currentLetter)+':'+String(currentStep);
    const nextStatuses={...statuses,[key]:status};
    const value=nextExtraStep(currentStep);
    const nextCompleted=value===9&&!completed.includes(currentLetter)?[...completed,currentLetter]:completed;
    setStatuses(nextStatuses);
    setCompleted(nextCompleted);
    setCurrentStep(value);
    saveProgress({currentLetter,currentStep:value,completed:nextCompleted,name,statuses:nextStatuses},userId);
  };

  const openTask=()=>{
    setReturnToLetter(currentLetter);
    setReturnToStep(currentStep);
    setShowTask(true);
  };

  const returnFromTask=()=>{
    if(returnToLetter!==null)setCurrentLetter(returnToLetter);
    if(returnToStep!==null)setCurrentStep(returnToStep);
    setShowTask(false);
  };

  const nextStep=()=>{
    const value=nextExtraStep(currentStep);
    const nextCompleted=value===9&&!completed.includes(currentLetter)?[...completed,currentLetter]:completed;
    setCompleted(nextCompleted);
    setCurrentStep(value);
    persist({currentStep:value,completed:nextCompleted});
  };

  const back=()=>{
    if(currentStep>0){
      const value=previousExtraStep(currentStep);
      setCurrentStep(value);
      persist({currentStep:value});
      return;
    }
    if(currentLetter>0){
      const value=currentLetter-1;
      setCurrentLetter(value);
      setCurrentStep(9);
      persist({currentLetter:value,currentStep:9});
      return;
    }
    onBackToFirstCycle();
  };

  const nextLetter=()=>{
    const nextCompleted=completed.includes(currentLetter)?completed:[...completed,currentLetter];
    if(currentLetter>=TRAINING_LETTER_COUNT-1){
      setCompleted(nextCompleted);
      setCurrentStep(10);
      persist({completed:nextCompleted,currentStep:10});
      return;
    }
    const value=currentLetter+1;
    setCompleted(nextCompleted);
    setCurrentLetter(value);
    setCurrentStep(0);
    persist({completed:nextCompleted,currentLetter:value,currentStep:0});
  };

  const repeatLetter=()=>{
    setDrafts(previous=>{const next={...previous};for(let step=0;step<=8;step++)delete next[currentLetter+':'+step];return next});
    setCurrentStep(0);
    persist({currentStep:0});
  };

  const completedAll=currentStep>=10;

  if(completedAll){
    return <section className="mx-auto min-h-[calc(100dvh-180px)] w-full max-w-[1080px] py-2 sm:py-5">
      <Card>
        <CheckCircle2 className="h-14 w-14 text-emerald-600"/>
        <h1 className="mt-3 text-4xl font-black text-slate-950">С письмом разобрались ✓</h1>
        <div className="mt-5 flex items-start gap-3 rounded-[22px] border border-teal-200 bg-teal-50 p-4 sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">OTTO</p>
            <p className="mt-2 text-lg leading-8 text-slate-800">Теперь вы знаете, как выполнять задание Schreiben.</p>
            <p className="mt-3 text-lg leading-8 text-slate-800">Можно перейти в настоящий тренажёр и потренироваться на реальных заданиях.</p>
            <p className="mt-3 text-lg leading-8 text-slate-800">Или посмотреть такие же подробные объяснения для Lesen, Hören и Sprechen.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={onOpenRealSchreiben} className="min-h-12 rounded-xl bg-slate-900 px-5 font-black text-white">Перейти к заданиям Schreiben</button>
          <button type="button" onClick={onOpenModules} className="min-h-12 rounded-xl border border-teal-200 bg-teal-50 px-5 font-black text-teal-900">Посмотреть объяснения других модулей</button>
        </div>
        <button type="button" onClick={()=>{setDrafts({});setCurrentLetter(0);setCurrentStep(0);setShowResume(false);persist({currentLetter:0,currentStep:0,completed,statuses})}} className="mt-4 min-h-11 rounded-xl border bg-white px-4 font-bold">Повторить учебные письма</button>
      </Card>
    </section>;
  }

  if(showResume&&!completedAll){
    return <section className="mx-auto min-h-[calc(100dvh-180px)] w-full max-w-[1080px] py-2 sm:py-5">
      <Card>
        <p className="otto-kicker">УЧЕБНЫЕ ПИСЬМА · {currentLetter+1} ИЗ {TRAINING_LETTER_COUNT}</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Продолжить с письма {currentLetter+1}</h1>
        <p className="mt-3 text-base leading-7 text-slate-700">Ваш учебный progress сохранён отдельно от экзаменационного.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button type="button" onClick={()=>setShowResume(false)} className="min-h-12 rounded-xl bg-slate-900 px-4 font-black text-white">Продолжить</button>
          <button type="button" onClick={onRestartExplanations} className="min-h-12 rounded-xl border bg-white px-4 font-bold">Вернуться к объяснениям</button>
          <button type="button" onClick={onOpenRealSchreiben} className="min-h-12 rounded-xl border border-teal-200 bg-teal-50 px-4 font-bold text-teal-900">К реальным заданиям Schreiben</button>
        </div>
      </Card>
    </section>;
  }

  if(currentStep===9){
    return <section className="mx-auto min-h-[calc(100dvh-180px)] w-full max-w-[1080px] py-2 sm:py-5">
      <Card>
        <p className="otto-kicker">УЧЕБНЫЕ ПИСЬМА · {currentLetter+1} ИЗ {TRAINING_LETTER_COUNT}</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Письмо выполнено ✓</h1>
        <div className="mt-5"><FinalLetter letter={letter} name={name}/></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button type="button" onClick={nextLetter} className="min-h-12 rounded-xl bg-slate-900 px-4 font-black text-white">Следующее письмо</button>
          <button type="button" onClick={repeatLetter} className="min-h-12 rounded-xl border bg-white px-4 font-bold">Повторить это письмо</button>
          <button type="button" onClick={onRestartExplanations} className="min-h-12 rounded-xl border bg-white px-4 font-bold">Вернуться к объяснениям</button>
          <button type="button" onClick={onOpenRealSchreiben} className="min-h-12 rounded-xl border border-teal-200 bg-teal-50 px-4 font-bold text-teal-900">К реальным заданиям Schreiben</button>
        </div>
        <div className="mt-5"><StepBackButton onClick={back}/></div>
      </Card>
    </section>;
  }

  const progressText='Учебные письма · '+String(currentLetter+1)+' из '+String(TRAINING_LETTER_COUNT);

  return <><section className="mx-auto min-h-[calc(100dvh-180px)] w-full max-w-[1080px] overflow-x-hidden py-2 sm:py-5">
    {currentStep>0&&<button type="button" onClick={openTask} className="mb-3 inline-flex min-h-10 items-center rounded-xl border border-sky-200 bg-sky-50 px-3 text-sm font-bold text-sky-900">📄 Посмотреть задание</button>}
    <div className="mb-5"><p className="otto-kicker">{progressText}</p><h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">{letter.title}</h1></div>

    {currentStep===0&&<Card><TaskCard letter={letter}/><StepNextBack onBack={back} onNext={nextStep}/></Card>}

    {currentStep===1&&<Choice onBack={back} draft={drafts[draftKey]} onDraft={updateDraft} title="Выберите правильное обращение" options={letter.kind==='formal'?[letter.greeting,'Liebe Anna,','Lieber Stefan,']:[letter.greeting,'Sehr geehrte Damen und Herren,','Sehr geehrte Frau Schneider,']} answer={letter.greeting} onNext={nextStep} onStatus={markStatus}/>}

    {currentStep===2&&(currentLetter>=10?<TypeSentence onBack={back} draft={drafts[draftKey]} onDraft={updateDraft} title="Напишите предложение для первого пункта" point={letter.points[0]} explanation={letter.translationPoints[0]} answer={letter.answers[0]} onNext={nextStep} onStatus={markStatus}/>:<Build onBack={back} draft={drafts[draftKey]} onDraft={updateDraft} title="Соберите предложение для первого пункта" point={letter.points[0]} explanation={letter.translationPoints[0]} answer={letter.answers[0]} onNext={nextStep} onStatus={markStatus}/>)}

    {currentStep===4&&(currentLetter>=10?<TypeSentence onBack={back} draft={drafts[draftKey]} onDraft={updateDraft} title="Напишите предложение для второго пункта" point={letter.points[1]} explanation={letter.translationPoints[1]} answer={letter.answers[1]} onNext={nextStep} onStatus={markStatus}/>:<Build onBack={back} draft={drafts[draftKey]} onDraft={updateDraft} title="Разберите второй пункт и соберите предложение" point={letter.points[1]} explanation={letter.translationPoints[1]} answer={letter.answers[1]} onNext={nextStep} onStatus={markStatus}/>)}

    {currentStep===5&&(currentLetter>=10?<TypeSentence onBack={back} draft={drafts[draftKey]} onDraft={updateDraft} title="Напишите предложение для третьего пункта" point={letter.points[2]} explanation={letter.translationPoints[2]} answer={letter.answers[2]} onNext={nextStep} onStatus={markStatus}/>:<Build onBack={back} draft={drafts[draftKey]} onDraft={updateDraft} title="Разберите третий пункт и соберите предложение" point={letter.points[2]} explanation={letter.translationPoints[2]} answer={letter.answers[2]} onNext={nextStep} onStatus={markStatus}/>)}

    {currentStep===6&&<Choice onBack={back} draft={drafts[draftKey]} onDraft={updateDraft} title="Выберите правильное прощание" options={letter.kind==='formal'?[letter.closing,'Liebe Grüße']:[letter.closing,'Mit freundlichen Grüßen']} answer={letter.closing} onNext={nextStep} onStatus={markStatus}/>}

    {currentStep===7&&<Card><p className="otto-kicker">ИМЯ</p><h2 className="mt-2 text-3xl font-black text-slate-950">Введите своё имя латиницей</h2><input value={name} onChange={event=>{setName(event.target.value);setNameError('')}} className="mt-5 min-h-14 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-lg outline-none focus:border-teal-500" placeholder="Например: Julia"/>{nameError&&<p className="mt-2 text-sm font-bold text-rose-700">{nameError}</p>}<div className="mt-5 grid grid-cols-2 gap-2"><StepBackButton onClick={back}/><button type="button" onClick={()=>{const valid=/^[\p{Script=Latin}\s'-]+$/u.test(name.trim())&&name.trim().length>0;if(!valid){setNameError('Введите имя латиницей.');return}setNameError('');setName(name.trim());advanceWithStatus('correct')}} className="min-h-12 rounded-xl bg-slate-900 px-6 font-black text-white">Далее <ArrowRight className="ml-2 inline h-4 w-4"/></button><SkipAction onSkip={()=>advanceWithStatus('skipped')}/></div></Card>}

  </section>{showTask&&<AssignmentOverlay snapshot={{title:letter.title,body:letter.task,points:letter.points,translation:letter.translationIntro,translationPoints:letter.translationPoints}} onReturn={returnFromTask} onRestartExplanations={onRestartExplanations} onReal={onOpenRealSchreiben}/>}</>;
}
