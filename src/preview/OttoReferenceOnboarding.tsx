import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, ChevronDown, ChevronRight, Volume2 } from 'lucide-react';
import { EXAM_REFERENCE_DATA, ExamReferenceSection, ExamSmartCardsPanel } from '@/preview/OttoReferenceExamSections';
import { OttoScene } from '@/components/OttoScene';

const INTRO_KEY='otto-reference-intro-seen-v1';
const SMART_CARDS_KEY='otto-reference-smart-cards-v1';

export type OttoReferenceContentSection='home'|'alphabet'|'combos'|'numbers'|'numberListening'|'articles'|'sentence'|'pronouns'|'verbs'|'nouns'|'prepositions'|'questions'|'verbTable'|'nounTable'|'written'|'oral'|'examInfo';
type BaseSection=OttoReferenceContentSection;

const ALPHABET=['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','Ä','Ö','Ü','ß'];

const COMMON_COMBOS=[
  ['sch','ш','Schule - «шу́ле»\nschreiben - «шра́йбен»'],
  ['sp (в начале слова/слога)','шп','Sport - «шпорт»\nspielen - «шпи́лен»'],
  ['st (в начале слова/слога)','шт','Stadt - «штат»\nStraße - «штра́сэ»'],
  ['tsch','ч','Deutsch - «дойч»\nTschüss - «чюс»'],
  ['ei','ай','mein - «майн»\nheißen - «ха́йсэн»'],
  ['ie','долгое и','Liebe - «ли́бэ»\nsieben - «зи́бэн»'],
  ['eu','ой','heute - «хо́йтэ»\nFreund - «фройнт»'],
  ['äu','ой','Häuser - «хо́йзэр»\nBäume - «бо́ймэ»'],
  ['au','ау','Haus - «хаус»\nFrau - «фрау»'],
  ['ch после a, o, u, au','х','Buch - «бух»\nmachen - «ма́хэн»'],
  ['ch после e, i, ä, ö, ü','мягкий хь','ich - «ихь»\nnicht - «нихьт»'],
  ['ck','к','Jacke - «я́кэ»\nlecker - «ле́кэр»'],
  ['tz','ц','Katze - «ка́цэ»\nPlatz - «плац»'],
  ['ß','с','Straße - «штра́сэ»\ngroß - «грос»'],
  ['ss','с','Wasser - «ва́сэр»\nessen - «э́сэн»'],
  ['z','ц','Zeit - «цайт»\nZimmer - «ци́мэр»'],
  ['w','в','Wasser - «ва́сэр»\nwohnen - «во́нэн»'],
  ['v (в большинстве немецких слов)','ф','Vater - «фа́тэр»\nvier - «фир»'],
  ['j','й','ja - «я»\nJahr - «яр»'],
  ['s (в начале перед гласной)','з','Sonne - «зо́нэ»\nsieben - «зи́бэн»'],
  ['ng','носовой нг','Wohnung - «во́нунг»\nlang - «ланг»'],
  ['nk','нк / нгк','danke - «да́нкэ»\ntrinken - «три́нкэн»'],
] as const;

const RARE_COMBOS=[
  ['ai','ай','Mai - «май»\nKaiser - «ка́йзэр»'],
  ['pf','пф','Apfel - «а́пфель»\nKopf - «копф»'],
  ['qu','кв','Quelle - «кве́лэ»\nQualität - «квалитэ́т»'],
  ['ph','ф','Phase - «фа́зэ»\nPhilosophie - «филозофи́»'],
  ['th','т','Theater - «теа́тэр»\nThema - «те́ма»'],
  ['x','кс','Taxi - «та́кси»\nText - «тэкст»'],
] as const;

const COMMON_COMBO_AUDIO=[
  ['Schule','schreiben'],['Sport','spielen'],['Stadt','Straße'],['Deutsch','Tschüss'],['mein','heißen'],['Liebe','sieben'],['heute','Freund'],['Häuser','Bäume'],['Haus','Frau'],['Buch','machen'],['ich','nicht'],['Jacke','lecker'],['Katze','Platz'],['Straße','groß'],['Wasser','essen'],['Zeit','Zimmer'],['Wasser','wohnen'],['Vater','vier'],['ja','Jahr'],['Sonne','sieben'],['Wohnung','lang'],['danke','trinken'],
] as const;
const RARE_COMBO_AUDIO=[
  ['Mai','Kaiser'],['Apfel','Kopf'],['Quelle','Qualität'],['Phase','Philosophie'],['Theater','Thema'],['Taxi','Text'],
] as const;


const PRONOUNS=[
  ['я','ich','mir','mich','mein-'],
  ['ты','du','dir','dich','dein-'],
  ['он','er','ihm','ihn','sein-'],
  ['она','sie','ihr','sie','ihr-'],
  ['оно','es','ihm','es','sein-'],
  ['мы','wir','uns','uns','unser-'],
  ['вы (мн.)','ihr','euch','euch','euer-'],
  ['они','sie','ihnen','sie','ihr-'],
  ['Вы (вежл.)','Sie','Ihnen','Sie','Ihr-'],
] as const;

// Только подписи к уже существующим немецким формам: [Nominativ, Dativ, Akkusativ, Possessiv].
// PRONOUNS остаётся неизменным источником немецкого текста и озвучки.
const PRONOUN_RUSSIAN_FORMS=[
  ['я','мне','меня','мой'],
  ['ты','тебе','тебя','твой'],
  ['он','ему','его','его'],
  ['она','ей','её','её'],
  ['оно','ему','его','его'],
  ['мы','нам','нас','наш'],
  ['вы (мн. ч.)','вам','вас','ваш'],
  ['они','им','их','их'],
  ['Вы (вежливо)','Вам','Вас','Ваш'],
] as const;
const PRONOUN_DISPLAY_ROWS=PRONOUNS.map((row,i)=>row.map((form,j)=>j===0?form:`${form}\n${PRONOUN_RUSSIAN_FORMS[i][j-1]}`));
const PRONOUN_AUDIO_CELLS=Object.fromEntries(PRONOUNS.flatMap((row,i)=>row.slice(1).map((form,j)=>[`${i}:${j+1}`,form])));

const MACHEN=[
  ['ich','-e','mache','я делаю'],
  ['du','-st','machst','ты делаешь'],
  ['er / sie / es','-t','macht','он / она / оно делает'],
  ['wir','-en','machen','мы делаем'],
  ['ihr','-t','macht','вы делаете'],
  ['sie / Sie','-en','machen','они делают / Вы делаете'],
] as const;

const SEIN=[
  ['ich','bin'],['du','bist'],['er / sie / es','ist'],['wir','sind'],['ihr','seid'],['sie / Sie','sind'],
] as const;

const MODALS=[
  ['ich - я','will','kann','muss','mag'],
  ['du - ты','willst','kannst','musst','magst'],
  ['er / sie / es - он / она / оно','will','kann','muss','mag'],
  ['wir - мы','wollen','können','müssen','mögen'],
  ['ihr - вы (мн. ч.)','wollt','könnt','müsst','mögt'],
  ['sie / Sie - они / Вы','wollen','können','müssen','mögen'],
] as const;

const QUESTION_WORDS=[
  ['Wer?','Кто?'],['Was?','Что?'],['Wo?','Где?'],['Wohin?','Куда?'],['Woher?','Откуда?'],['Wann?','Когда?'],['Wie?','Как?'],['Warum?','Почему?'],['Wie viel?','Сколько?'],['Wie viele?','Сколько? (исчисляемые предметы)'],['Wie alt?','Сколько лет?'],['Wie heißt ...?','Как называется ...?'],['Wie ist ...?','Какой? / Как?'],['Welche?','Какой? / Какая? / Какие?'],['Wessen?','Чей?'],
] as const;

const VERB_TABLE=[
  ['sein','быть'],['haben','иметь'],['heißen','называться'],['kommen','приходить, приезжать'],['wohnen','жить, проживать'],['leben','жить'],['sprechen','говорить'],['lernen','учить, изучать'],['arbeiten','работать'],['machen','делать'],['gehen','идти'],['fahren','ехать'],['bleiben','оставаться'],['essen','есть'],['trinken','пить'],['kaufen','покупать'],['bezahlen','платить'],['finden','находить'],['suchen','искать'],['brauchen','нуждаться, быть нужным'],['mögen','любить, нравиться'],['möchten','хотеть (вежливо)'],['können','мочь'],['müssen','быть должным, быть вынужденным'],['wollen','хотеть'],['helfen','помогать'],['treffen','встречать(ся)'],['besuchen','посещать'],['schreiben','писать'],['lesen','читать'],
] as const;

const NOUN_TABLE=[
  ['die Familie','семья'],['der Freund','друг'],['die Freundin','подруга'],['der Mann','мужчина, муж'],['die Frau','женщина, жена'],['das Kind','ребёнок'],['die Eltern','родители'],['der Bruder','брат'],['die Schwester','сестра'],['das Haus','дом'],['die Wohnung','квартира'],['das Zimmer','комната'],['die Stadt','город'],['das Land','страна'],['die Straße','улица'],['der Bahnhof','вокзал'],['die Schule','школа'],['die Arbeit','работа'],['der Beruf','профессия'],['der Arzt','врач'],['die Apotheke','аптека'],['das Krankenhaus','больница'],['das Restaurant','ресторан'],['das Café','кафе'],['das Hotel','гостиница'],['der Supermarkt','супермаркет'],['das Geschäft','магазин'],['die Bäckerei','пекарня'],['die Post','почта'],['die Bank','банк'],['der Bus','автобус'],['der Zug','поезд'],['das Taxi','такси'],['das Auto','автомобиль'],['das Fahrrad','велосипед'],['das Flugzeug','самолёт'],['die Fahrkarte','билет'],['das Geld','деньги'],['der Euro','евро'],['die Zeit','время'],['der Tag','день'],['die Woche','неделя'],['der Monat','месяц'],['das Jahr','год'],['die Uhr','часы / время'],['das Essen','еда'],['das Wasser','вода'],['das Brot','хлеб'],['das Obst','фрукты'],['das Geschenk','подарок'],
] as const;

export function hasReferenceIntroBeenSeen(){
  try{return localStorage.getItem(INTRO_KEY)==='1'}catch{return false}
}
export function markReferenceIntroSeen(){try{localStorage.setItem(INTRO_KEY,'1')}catch{}}


function readSmartCards(){
  try{
    const raw=localStorage.getItem(SMART_CARDS_KEY);
    const parsed=raw?JSON.parse(raw):[];
    if(!Array.isArray(parsed))return[];
    const normalized=Array.from(new Set(parsed.filter((v):v is string=>typeof v==='string')));
    if(normalized.length!==parsed.length)localStorage.setItem(SMART_CARDS_KEY,JSON.stringify(normalized));
    return normalized;
  }catch{return[]}
}
function saveSmartCards(items:string[]){try{localStorage.setItem(SMART_CARDS_KEY,JSON.stringify(items));window.dispatchEvent(new Event('otto-smartcards-changed'))}catch{}}

async function speakGerman(text:string){
  if(!text||typeof window==='undefined')return false;
  const api=(window as Window&{OttoSpeech?:{play?:(value:string,options?:{mode?:'normal'|'slow'})=>Promise<boolean>}}).OttoSpeech;
  if(api?.play)return await api.play(text,{mode:'normal'});
  if(!('speechSynthesis' in window))return false;
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);u.lang='de-DE';u.rate=.82;window.speechSynthesis.speak(u);return true;
}

function Shell({children}:{children:ReactNode}){return <section data-otto-reference-shell="true" className="otto-reference-unified min-w-0 max-w-full rounded-[28px] border border-[var(--otto-line)] bg-[var(--otto-surface)] p-4 shadow-[0_18px_55px_rgba(15,23,42,.08)] sm:p-6 lg:p-7">{children}</section>}
// Shared navigation is outside the lesson Shell so it never creates another
// row of buttons inside the white card. The study-base action is present only
// in the full learning journey; overlays retain their own "К заданию" button.
function ReferenceReturnBar({onBackToHome,onBackToStudyBase}:{onBackToHome?:()=>void;onBackToStudyBase?:()=>void}){
  if(!onBackToHome&&!onBackToStudyBase)return null;
  return <nav className="otto-reference-return-bar mb-3 grid min-w-0 gap-2 sm:gap-3" aria-label="Навигация справочника"
    data-return-actions={onBackToHome&&onBackToStudyBase?'both':'single'}>
    {onBackToHome&&<button type="button" onClick={onBackToHome} className="otto-reference-return-button inline-flex min-w-0 min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--otto-line)] bg-white px-2 py-2 text-center text-sm font-bold text-slate-900 sm:px-4">
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true"/><span>Назад в справочник</span>
    </button>}
    {onBackToStudyBase&&<button type="button" onClick={onBackToStudyBase} className="otto-reference-return-button inline-flex min-w-0 min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--otto-line)] bg-white px-2 py-2 text-center text-sm font-bold text-slate-900 sm:px-4">
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true"/><span>К Учебной базе</span>
    </button>}
  </nav>;
}
function H2({children}:{children:ReactNode}){return <h2 className="mt-2 text-2xl font-black">{children}</h2>}
function H3({children}:{children:ReactNode}){return <h3 className="mt-7 text-xl font-black text-slate-950">{children}</h3>}
function P({children,className=''}:{children:ReactNode;className?:string}){return <p className={"mt-3 text-base leading-7 text-slate-700 "+className}>{children}</p>}
function GermanAudioButton({text,size='md'}:{text:string;size?:'sm'|'md'}){
  const[busy,setBusy]=useState(false);
  const play=async()=>{setBusy(true);try{await speakGerman(text)}finally{setBusy(false)}};
  return <button type="button" onClick={play} aria-busy={busy} className={(size==='sm'?'h-8 w-8':'h-9 w-9')+" grid shrink-0 place-items-center rounded-lg border bg-white text-teal-800 transition "+(busy?'scale-95 bg-teal-50 ring-2 ring-teal-200':'')} aria-label={"Озвучить "+text} title={"Озвучить: "+text}><Volume2 className={(size==='sm'?'h-3.5 w-3.5':'h-4 w-4')+(busy?' animate-pulse':'')}/></button>
}
function AudioChips({items}:{items:string[]}){const text=items.join(', ');return <div className="mt-2"><GermanAudioButton text={text}/></div>}
function Example({de,ru}:{de:string;ru?:string}){return <div className="mt-3 rounded-xl border-l-4 border-teal-300 bg-teal-50/60 px-4 py-3"><div className="flex items-start justify-between gap-3"><b className="text-slate-950">{de}</b><GermanAudioButton text={de}/></div>{ru&&<div className="mt-1 text-sm text-slate-600">{ru}</div>}</div>}
function GermanTerm({de,ru}:{de:string;ru:string}){return <div className="flex items-start justify-between gap-3 rounded-xl border bg-white px-3 py-2"><div className="min-w-0"><b className="block text-slate-950">{de}</b><span className="mt-1 block text-sm font-medium leading-5 text-slate-700">{ru}</span></div><GermanAudioButton text={de} size="sm"/></div>}
function MixedExample({text,audio}:{text:string;audio:string}){const split=text.indexOf(' - ');const de=split>=0?text.slice(0,split):text;const ru=split>=0?text.slice(split+3):'';return <div className="mt-3 rounded-xl border-l-4 border-teal-300 bg-teal-50/60 px-4 py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><b className="block text-slate-950">{de}</b>{ru&&<span className="mt-1 block text-sm font-medium leading-5 text-slate-700">{ru}</span>}</div><GermanAudioButton text={audio}/></div></div>}
function NumberExample({number,de,ru}:{number:number;de:string;ru:string}){return <div className="mt-3 rounded-xl border-l-4 border-teal-300 bg-teal-50/60 px-4 py-3"><div className="flex items-start justify-between gap-3"><b className="text-slate-950">{number} → {de}</b><GermanAudioButton text={de}/></div><div className="mt-1 text-sm text-slate-600">{ru}</div></div>}

function SmartButton({id,saved,onToggle}:{id:string;saved:boolean;onToggle:(id:string)=>void}){
  const[status,setStatus]=useState('');
  const click=()=>{
    if(saved){setStatus('Уже добавлено в умные карточки');window.setTimeout(()=>setStatus(''),1800);return}
    onToggle(id);setStatus('Добавлено в умные карточки');window.setTimeout(()=>setStatus(''),1800);
  };
  const label=saved?'Уже добавлено в умные карточки':'Добавить в умные карточки';
  return <span className="relative shrink-0"><button type="button" onClick={click} className={"inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-black leading-4 transition sm:text-sm "+(saved?'border-teal-300 bg-teal-50 text-teal-900':'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:text-teal-800')} aria-label={label} title={label}>{saved?<BookmarkCheck className="h-4 w-4 shrink-0"/>:<Bookmark className="h-4 w-4 shrink-0"/>}<span className="max-w-[150px] sm:max-w-none">{saved?'✓ Уже добавлено в умные карточки':'Добавить в умные карточки'}</span></button>{status&&<span role="status" className="absolute right-0 top-[calc(100%+6px)] z-20 w-max max-w-[240px] rounded-lg border bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-lg">{status}</span>}</span>
}
function SmartHeading({title,id,saved,onToggle,level='h2'}:{title:string;id:string;saved:boolean;onToggle:(id:string)=>void;level?:'h2'|'h3'}){
  const Title=level;
  return <div className={(level==='h2'?'mt-2':'mt-7')+" otto-reference-smart-heading flex flex-wrap items-start justify-between gap-3"}><Title className={(level==='h2'?'text-2xl':'text-xl')+" min-w-0 font-black text-slate-950"}>{title}</Title><SmartButton id={id} saved={saved} onToggle={onToggle}/></div>
}
function ContinueButton({children='Далее',onClick}:{children?:string;onClick:()=>void}){return <div className="mt-6 flex justify-end"><button type="button" onClick={onClick} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-slate-900 px-6 font-black text-white">{children}<ArrowRight className="h-4 w-4"/></button></div>}
function Table({headers,rows,audioColumns=[],audioCells={}}:{headers:string[];rows:ReadonlyArray<ReadonlyArray<string>>;audioColumns?:number[];audioCells?:Record<string,string>}){return <div data-columns={headers.length} data-numbers={headers[0]==='Число'&&headers[1]==='Немецкий'?'true':undefined} data-unlabeled-examples={headers.length>=2&&headers.every(h=>h.trim()==='')?'true':undefined} data-noun-vocabulary={headers.length===2&&headers[0]==='Существительное'&&headers[1]==='Перевод'?'true':undefined} data-verb-vocabulary={headers.length===2&&headers[0]==='Глагол'&&headers[1]==='Перевод'?'true':undefined} className="otto-reference-table mt-4 overflow-x-auto rounded-2xl border border-[var(--otto-line)] bg-white"><table className="w-full min-w-[560px] table-fixed text-left"><thead className="bg-teal-50"><tr>{headers.map((h,j)=><th key={h} className={"px-4 py-3 text-sm font-black text-slate-800 "+(headers.length===2?(j===0?'w-[30%]':'w-[70%]'):'')}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i} className="border-t">{row.map((v,j)=>{const audio=audioCells[`${i}:${j}`]??(audioColumns.includes(j)?v:undefined);return <td key={j} data-label={headers[j]} data-empty={v.trim()===""?"true":undefined} className="whitespace-pre-line px-4 py-2.5 align-middle text-sm leading-6 text-slate-700"><div className="flex items-center justify-between gap-3"><span className="min-w-0">{v}</span>{audio&&<GermanAudioButton text={audio} size="sm"/>}</div></td>})}</tr>)}</tbody></table></div>}
function ComboTable({rows,audioRows}:{rows:ReadonlyArray<readonly [string,string,string]>;audioRows:ReadonlyArray<readonly [string,string]>}){
  return <div className="otto-reference-combo-table mt-4 overflow-x-auto rounded-2xl border border-[var(--otto-line)] bg-white">
    <table className="w-full min-w-[620px] table-fixed text-left">
      <thead className="bg-teal-50"><tr>
        <th className="px-4 py-3 text-sm font-black text-slate-800">Буква / буквосочетание</th>
        <th className="px-4 py-3 text-sm font-black text-slate-800">Читаем примерно</th>
        <th className="px-4 py-3 text-sm font-black text-slate-800">Примеры</th>
      </tr></thead>
      <tbody>{rows.map((row,i)=><tr key={i} className="border-t">
        <td data-label="Буква / буквосочетание" className="px-4 py-2.5 align-middle text-sm leading-6 text-slate-700">{row[0]}</td>
        <td data-label="Читаем примерно" className="px-4 py-2.5 align-middle text-sm leading-6 text-slate-700">{row[1]}</td>
        <td data-label="Примеры" className="px-4 py-2.5 align-middle text-sm leading-6 text-slate-700">
          <div className="space-y-2">{row[2].split('\n').map((line,j)=><div key={j} className="flex items-center justify-between gap-3">
            <span className="min-w-0">{line}</span><GermanAudioButton text={audioRows[i][j]} size="sm"/>
          </div>)}</div>
        </td>
      </tr>)}</tbody>
    </table>
  </div>;
}

const NUMBER_BASE_ROWS=[['1','eins'],['2','zwei'],['3','drei'],['4','vier'],['5','fünf'],['6','sechs'],['7','sieben'],['8','acht'],['9','neun'],['10','zehn'],['11','elf']] as const;
const NUMBER_TENS_ROWS=[['20','zwanzig'],['30','dreißig'],['40','vierzig'],['50','fünfzig'],['60','sechzig'],['70','siebzig'],['80','achtzig'],['90','neunzig'],['100','hundert / einhundert']] as const;
const NUMBER_FROM_12_ROWS=[['12','zwölf'],['13','dreizehn'],['14','vierzehn'],['15','fünfzehn'],['16','sechzehn'],['17','siebzehn'],['18','achtzehn'],['19','neunzehn'],...NUMBER_TENS_ROWS] as const;
const NUMBER_ONES=['','eins','zwei','drei','vier','fünf','sechs','sieben','acht','neun'] as const;
const NUMBER_TEENS:Record<number,string>={10:'zehn',11:'elf',12:'zwölf',13:'dreizehn',14:'vierzehn',15:'fünfzehn',16:'sechzehn',17:'siebzehn',18:'achtzehn',19:'neunzehn'};
const NUMBER_TENS:Record<number,string>={20:'zwanzig',30:'dreißig',40:'vierzig',50:'fünfzig',60:'sechzig',70:'siebzig',80:'achtzig',90:'neunzig'};
function germanNumberUnder100(value:number){
  if(value<10)return NUMBER_ONES[value];
  if(value<20)return NUMBER_TEENS[value];
  if(value%10===0)return NUMBER_TENS[value];
  const ones=value%10;
  const tens=value-ones;
  return (ones===1?'ein':NUMBER_ONES[ones])+'und'+NUMBER_TENS[tens];
}
function germanNumber(value:number){
  if(!Number.isInteger(value)||value<1||value>999)return'';
  if(value<100)return germanNumberUnder100(value);
  const hundreds=Math.floor(value/100);
  const rest=value%100;
  const prefix=(hundreds===1?'ein':NUMBER_ONES[hundreds])+'hundert';
  return rest===0?prefix:prefix+germanNumberUnder100(rest);
}
function NumbersSection({saved,onToggle}:{saved:Set<string>;onToggle:(id:string)=>void}){
  const[input,setInput]=useState('37');
  const numeric=Number(input);
  const formatted=Number.isInteger(numeric)&&numeric>=1&&numeric<=999?germanNumber(numeric):'';
  return <>
    <p className="otto-kicker">ЧИСЛА</p><SmartHeading title="ЧИСЛА" id="numbers" saved={saved.has('numbers')} onToggle={onToggle}/>
    <P><b>Числа очень важны на экзамене A1. Они встречаются во времени, датах, ценах, номерах телефонов, адресах и других заданиях.</b></P>
    <P><b>Важно уметь не только прочитать число, но и хорошо определить его на слух.</b></P>
    <div className="space-y-4">
      <Table headers={['Число','Немецкий']} rows={NUMBER_BASE_ROWS} audioColumns={[1]}/>
      <Table headers={['Число','Немецкий']} rows={NUMBER_FROM_12_ROWS} audioCells={{'0:1':'zwölf','1:1':'dreizehn','2:1':'vierzehn','3:1':'fünfzehn','4:1':'sechzehn','5:1':'siebzehn','6:1':'achtzehn','7:1':'neunzehn','8:1':'zwanzig','9:1':'dreißig','10:1':'vierzig','11:1':'fünfzig','12:1':'sechzig','13:1':'siebzig','14:1':'achtzig','15:1':'neunzig','16:1':'hundert, einhundert'}}/>
    </div>
    <H3>Числа 13–19</H3><div className="mt-3 rounded-xl bg-teal-50 p-3 text-center font-black">единица + zehn</div>
    <P>Отдельно показать формы, которые нужно запомнить:</P>
    <H3>Двузначные числа от 21</H3><div className="mt-3 rounded-xl bg-teal-50 p-3 text-center font-black">единицы + und + десятки</div>
    <P><b>21</b></P><div><P><code>ein + und + zwanzig</code></P><AudioChips items={['ein','und','zwanzig']}/></div><div className="mt-3 flex items-center justify-between rounded-xl border bg-white px-4 py-3"><b>→ einundzwanzig</b><GermanAudioButton text="einundzwanzig"/></div><P><b>двадцать один</b></P>
    <NumberExample number={24} de="vierundzwanzig" ru="двадцать четыре"/><NumberExample number={37} de="siebenunddreißig" ru="тридцать семь"/><NumberExample number={58} de="achtundfünfzig" ru="пятьдесят восемь"/><NumberExample number={96} de="sechsundneunzig" ru="девяносто шесть"/>
    <H3>Трёхзначные числа</H3><div className="mt-3 rounded-xl bg-teal-50 p-4 font-black"><div>Сначала говорим, сколько сотен, и добавляем hundert.</div><div className="mt-2 text-sm font-bold leading-6 text-teal-900">Если после сотен есть ещё число, сразу дописываем его по тем же правилам, что и двузначное число.</div></div>
    <P><b>125</b></P><div><P><code>einhundert + fünfundzwanzig</code></P><AudioChips items={['einhundert','fünfundzwanzig']}/></div><div className="mt-3 flex items-center justify-between rounded-xl border bg-white px-4 py-3"><b>→ einhundertfünfundzwanzig</b><GermanAudioButton text="einhundertfünfundzwanzig"/></div>
    <NumberExample number={342} de="dreihundertzweiundvierzig" ru="триста сорок два"/><NumberExample number={517} de="fünfhundertsiebzehn" ru="пятьсот семнадцать"/><NumberExample number={999} de="neunhundertneunundneunzig" ru="девятьсот девяносто девять"/>
    <H3>Введите число</H3>
    <div className="mt-4 rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] p-4">
      <input inputMode="numeric" value={input} onChange={e=>setInput(e.target.value.replace(/[^0-9]/g,'').slice(0,3))} className="min-h-12 w-full rounded-xl border bg-white px-4 text-lg font-black" aria-label="Введите число от 1 до 999"/>
      {formatted?<div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-white p-4"><div><div className="text-sm font-bold text-slate-500">{numeric}</div><div className="text-xl font-black text-slate-950">{formatted}</div></div><GermanAudioButton text={formatted}/></div>:<P>Введите целое число от 1 до 999.</P>}
    </div>
  </>;
}

const REFERENCE_SEQUENCE:BaseSection[]=['alphabet','combos','numbers','numberListening','articles','sentence','pronouns','verbs','nouns','prepositions','questions','verbTable','nounTable','written','oral','examInfo'];
function NumberListeningPractice({saved,onToggle}:{saved:Set<string>;onToggle:(id:string)=>void}){
  const [started,setStarted]=useState(false);
  const [round,setRound]=useState(0);
  const [number,setNumber]=useState<number|null>(null);
  const [answer,setAnswer]=useState('');
  const [checked,setChecked]=useState(false);
  const correct=number!==null&&Number(answer)===number&&answer.trim()!=='';
  const pick=()=>{
    const cycle=round%5;
    const min=cycle<3?10:cycle===3?1:100;
    const max=cycle<3?99:cycle===3?9:999;
    const next=min+Math.floor(Math.random()*(max-min+1));
    setNumber(next);setRound(v=>v+1);setAnswer('');setChecked(false);setStarted(true);
    void speakGerman(germanNumber(next));
  };
  return <div className="otto-reference-number-listening min-w-0 max-w-full space-y-4">
    <div className="otto-reference-number-listening-intro flex min-w-0 flex-col items-start gap-3 sm:flex-row">
      <OttoScene scene="guide" className="otto-reference-number-listening-otto shrink-0 object-contain"/>
      <div className="min-w-0 w-full flex-1">
        <div className="otto-reference-smart-heading flex flex-wrap items-start justify-between gap-3"><h2 className="text-xl font-black">Тренировка чисел на слух</h2><SmartButton id="numberListening" saved={saved.has("numberListening")} onToggle={onToggle}/></div>
        <P>Тренировка восприятия немецких чисел на слух очень важна, особенно для успешной сдачи модулей аудирования и говорения. Нажмите «Начать тренировку»: OTTO произнесёт число, а вы запишите его цифрами.</P>
      </div>
    </div>
    {!started?<button type="button" className="min-h-12 w-full rounded-xl bg-teal-700 px-5 font-bold text-white sm:w-auto" onClick={pick}>Начать тренировку</button>:<>
      <button type="button" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-4 font-bold sm:w-auto" onClick={()=>number!==null&&void speakGerman(germanNumber(number))}><Volume2 className="h-5 w-5"/>Послушать ещё раз</button>
      <label className="block font-bold" htmlFor="otto-listen-number">Введите услышанное число</label>
      <input id="otto-listen-number" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" value={answer} onChange={e=>{setAnswer(e.target.value.replace(/[^0-9]/g,''));setChecked(false)}} className="min-h-12 min-w-0 w-full max-w-full rounded-xl border bg-white px-4 text-lg" placeholder="Число от 1 до 999"/>
      {!checked?<button type="button" disabled={!answer.trim()} onClick={()=>setChecked(true)} className="min-h-12 w-full rounded-xl bg-teal-700 px-5 font-bold text-white disabled:opacity-50 sm:w-auto">Проверить</button>:<div role="status" className="min-w-0 space-y-3 rounded-xl border p-4">{correct?<p className="font-bold">Всё отлично, молодец!</p>:<><p>Правильный ответ: {number}</p><p className="break-words font-bold">{number!==null?germanNumber(number):''}</p><button type="button" className="inline-flex items-center gap-2 rounded-lg border px-4 py-2" onClick={()=>number!==null&&void speakGerman(germanNumber(number))}><Volume2 className="h-4 w-4"/>Послушать</button></>}<button type="button" onClick={pick} className="block min-h-12 w-full rounded-xl bg-teal-700 px-5 font-bold text-white sm:w-auto">Давай ещё раз</button></div>}
    </>}
  </div>;
}
function scrollReferenceToTop(){
  const scrollport=document.querySelector<HTMLElement>('.otto-reference-overlay main')??document.querySelector<HTMLElement>('.otto-inner-screen');
  scrollport?.scrollTo({top:0,behavior:'auto'});
}
function ReferenceHome({onOpen,smartCards}:{onOpen:(section:BaseSection)=>void;smartCards:string[]}){
  const[baseOpen,setBaseOpen]=useState(false);
  useEffect(()=>{try{if(sessionStorage.getItem('otto-reference-base-open')==='1')setBaseOpen(true)}catch{}},[]);
  const[cardsOpen,setCardsOpen]=useState(false);
  const labels:Record<string,string>={alphabet:'Немецкий алфавит',letterCombos:'Буквосочетания и звуки',commonCombos:'Часто встречающиеся буквосочетания',rareCombos:'Реже встречающиеся буквосочетания',numbers:'Числа',numberListening:'Тренировка чисел на слух',sentenceSchemes:'Схемы построения предложения',pronouns:'Местоимения',conjugation:'Спряжение глаголов',modals:'Модальные глаголы',nouns:'Существительные',prepositions:'Предлоги',questions:'Вопросы',verbTable:'Таблица глаголов',nounTable:'Таблица существительных'};
  const generalCards=smartCards.filter(id=>labels[id]);
  return <Shell><p className="otto-kicker">OTTO A1</p><h1 className="mt-2 text-3xl font-black">Справочник OTTO</h1><div className="mt-6 space-y-3"><div className="rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)]"><button type="button" onClick={()=>setBaseOpen(v=>{try{sessionStorage.setItem('otto-reference-base-open',v?'0':'1')}catch{}return !v})} className="flex min-h-16 w-full items-center justify-between gap-3 p-4 text-left"><span className="min-w-0"><b className={baseOpen?'otto-reference-section-title block font-black text-slate-950':'font-bold'}>Общая база немецкого языка A1</b></span>{baseOpen?<ChevronDown className="h-5 w-5"/>:<ChevronRight className="h-5 w-5"/>}</button>{baseOpen&&<div className="grid gap-2 border-t border-[var(--otto-line)] p-3 sm:grid-cols-2">{([['alphabet','Алфавит, буквосочетания и звуки в немецком языке'],['numbers','Числа'],['numberListening','Тренировка чисел на слух'],['articles','Артикли'],['sentence','Как строить предложения в немецком языке'],['pronouns','Личные местоимения'],['verbs','Глаголы'],['nouns','Существительные'],['prepositions','Предлоги'],['questions','Список вопросов'],['verbTable','Список глаголов'],['nounTable','Список существительных']] as const).map(([id,label])=><button key={id} type="button" onClick={()=>onOpen(id)} className="flex min-h-12 items-center justify-between rounded-xl border bg-white px-4 text-left text-sm font-black">{label}<ChevronRight className="h-4 w-4"/></button>)}</div>}</div><button type="button" onClick={()=>onOpen('written')} className="flex min-h-16 w-full items-center justify-between rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] p-4 text-left font-bold"><span>Письменная часть экзамена</span><ChevronRight className="h-5 w-5"/></button><button type="button" onClick={()=>onOpen('oral')} className="flex min-h-16 w-full items-center justify-between rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] p-4 text-left font-bold"><span>Устная часть экзамена</span><ChevronRight className="h-5 w-5"/></button><button type="button" onClick={()=>onOpen('examInfo')} className="flex min-h-16 w-full items-center justify-between rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] p-4 text-left font-bold"><span>Полезная информация перед экзаменом</span><ChevronRight className="h-5 w-5"/></button></div><div className="mt-6"><button type="button" aria-expanded={cardsOpen} onClick={()=>setCardsOpen(value=>!value)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] px-4 py-3 text-left font-bold"><span>Мои умные карточки</span><ChevronDown className={"h-5 w-5 shrink-0 transition "+(cardsOpen?'rotate-180':'')}/></button>{cardsOpen&&<div className="mt-3">{generalCards.length>0&&<div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 p-4"><b className="text-teal-950">Мои умные карточки · Общая база</b><div className="mt-3 flex flex-wrap gap-2">{generalCards.map(id=><button type="button" key={id} onClick={()=>onOpen(GENERAL_SMART_CARD_TARGETS[id]?.section??'home')} className="rounded-full border border-teal-200 bg-white px-3 py-2 text-sm font-bold text-slate-800">{labels[id]}</button>)}</div>{smartCards.includes('numbers')&&<div className="mt-4 rounded-xl border border-teal-200 bg-white p-4"><b>Числа</b><Table headers={['Число','Немецкий']} rows={NUMBER_BASE_ROWS} audioColumns={[1]}/><Table headers={['Число','Немецкий']} rows={NUMBER_TENS_ROWS} audioCells={{'0:1':'zwanzig','1:1':'dreißig','2:1':'vierzig','3:1':'fünfzig','4:1':'sechzig','5:1':'siebzig','6:1':'achtzig','7:1':'neunzig','8:1':'hundert, einhundert'}}/><div className="mt-3 rounded-lg bg-teal-50 p-3 text-sm font-bold text-teal-900">единицы + und + десятки<br/>сотни + двузначное число</div><div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="flex items-center justify-between rounded-lg border p-2 text-sm"><span>21 → einundzwanzig</span><GermanAudioButton text="einundzwanzig" size="sm"/></div><div className="flex items-center justify-between rounded-lg border p-2 text-sm"><span>37 → siebenunddreißig</span><GermanAudioButton text="siebenunddreißig" size="sm"/></div><div className="flex items-center justify-between rounded-lg border p-2 text-sm"><span>125 → einhundertfünfundzwanzig</span><GermanAudioButton text="einhundertfünfundzwanzig" size="sm"/></div><div className="flex items-center justify-between rounded-lg border p-2 text-sm"><span>999 → neunhundertneunundneunzig</span><GermanAudioButton text="neunhundertneunundneunzig" size="sm"/></div></div><button type="button" onClick={()=>onOpen('numbers')} className="mt-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-black text-teal-900">Открыть полный раздел</button></div>}</div>}<ExamSmartCardsPanel ids={smartCards}/></div>}</div></Shell>
}

function ExamInfoPlaceholder(){
  return <div className="py-3 sm:py-6">
    <p className="otto-kicker">ПОЛЕЗНАЯ ИНФОРМАЦИЯ ПЕРЕД ЭКЗАМЕНОМ</p>
    <div className="mt-4 rounded-[24px] border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] px-5 py-8 text-center sm:px-8 sm:py-10">
      <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/80">
        <OttoScene scene="guide" className="h-20 w-auto max-w-full object-contain" />
      </div>
      <h2 className="mx-auto max-w-xl text-2xl font-black leading-snug text-slate-950 sm:text-3xl">Скоро здесь появятся лайфхаки OTTO ✨</h2>
      <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-700">Собираем для вас полезные советы, которые помогут чувствовать себя увереннее перед экзаменом.</p>
      <p className="mt-5 text-base font-semibold text-teal-800">Загляните сюда чуть позже 🙂</p>
    </div>
  </div>;
}

function AlphabetSection({saved,onToggle}:{saved:Set<string>;onToggle:(id:string)=>void}){
  const[noteOpen,setNoteOpen]=useState(false);
  return <>
    <p className="otto-kicker">1. Немецкий алфавит</p>
    <SmartHeading title="НЕМЕЦКИЙ АЛФАВИТ" id="alphabet" saved={saved.has('alphabet')} onToggle={onToggle}/>
    <P>Первое, что нужно сделать в подготовке к сдаче экзамена А1 - это взглянуть на немецкий алфавит.</P>
    <P>Алфавит состоит из 26 латинских букв, 3 умлаутов (Ä, Ö, Ü) и лигатуры ß. Из-за необычных графических символов, которые мы не привыкли видеть в русском языке, алфавит может показаться странным или сложным, но на самом деле тут всё просто.</P>
    <P>Посмотрите на алфавит и послушайте, как он звучит.</P>
    <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">{ALPHABET.map(letter=><button key={letter} type="button" onClick={()=>speakGerman(letter)} className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] font-black text-lg"><span>{letter}</span><Volume2 className="h-3.5 w-3.5 text-teal-700"/></button>)}</div>
    <div className="mt-5 rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)]"><button type="button" onClick={()=>setNoteOpen(v=>!v)} className="flex w-full items-center justify-between gap-3 p-4 text-left font-black"><span>На заметку. Умлауты и лигатуры</span><ChevronDown className={"h-5 w-5 transition "+(noteOpen?'rotate-180':'')}/></button>{noteOpen&&<div className="border-t border-[var(--otto-line)] p-4"><P>Умлауты - это немецкие гласные с двумя точками сверху: ä, ö, ü. Точки меняют произношение обычных a, o, u.</P><ul className="mt-3 list-disc space-y-2 pl-6 text-slate-700"><li className="flex items-center gap-2"><span>ä - читается примерно как русское «э».</span><GermanAudioButton text="ä" size="sm"/></li><li className="flex items-center gap-2"><span>ö - похоже на «ё», но без звука «й». Губы при этом округлены.</span><GermanAudioButton text="ö" size="sm"/></li><li className="flex items-center gap-2"><span>ü - похоже на «ю», но без звука «й». Произносится с округлёнными губами.</span><GermanAudioButton text="ü" size="sm"/></li></ul><P>Лигатура ß - особый знак немецкого языка. Он называется Eszett (эсцет) или scharfes S («острая S»).</P><ul className="mt-3 list-disc pl-6 text-slate-700"><li className="flex items-center gap-2"><span>ß - читается как обычное русское «с».</span><GermanAudioButton text="ß" size="sm"/></li></ul></div>}</div>


  </>;
}

function CombosSection({saved,onToggle}:{saved:Set<string>;onToggle:(id:string)=>void}){
  const[combosOpen,setCombosOpen]=useState(true);
  return <>
    <SmartHeading title="БУКВОСОЧЕТАНИЯ И ЗВУКИ В НЕМЕЦКОМ ЯЗЫКЕ" id="letterCombos" saved={saved.has('letterCombos')} onToggle={onToggle} level="h3"/>
    <P>В немецком языке некоторые буквосочетания читаются не так, как они выглядят. Они встречаются довольно часто, поэтому важно знать, как произносится то, что вы читаете и пишете.</P>
    <P>Количество буквосочетаний может напугать, но не волнуйтесь - на практике все эти буквосочетания быстро запоминаются. А что не запомните сразу - запомните позже во время тренировок : )</P>
    <P>Кроме того, вы можете добавить этот блок в свои умные карточки, чтобы в любой момент посмотреть, как читается встреченное буквосочетание.</P>
    <div className="otto-reference-combo-toggle mt-5 flex items-center gap-2 rounded-2xl border bg-white p-2"><button type="button" onClick={()=>setCombosOpen(v=>!v)} className="flex min-h-12 min-w-0 flex-1 items-center justify-between rounded-xl px-2 text-left font-black"><span>Часто встречающиеся буквосочетания</span><ChevronDown className={"h-5 w-5 shrink-0 "+(combosOpen?'rotate-180':'')}/></button><SmartButton id="commonCombos" saved={saved.has('commonCombos')} onToggle={onToggle}/></div>
    {combosOpen&&<ComboTable rows={COMMON_COMBOS} audioRows={COMMON_COMBO_AUDIO}/>} 
    <SmartHeading title="Реже встречающиеся буквосочетания" id="rareCombos" saved={saved.has('rareCombos')} onToggle={onToggle} level="h3"/>
    <ComboTable rows={RARE_COMBOS} audioRows={RARE_COMBO_AUDIO}/>
    <P>Вам необязательно запоминать это всё сразу. По ходу тренировок у вас закрепится навык правильного чтения немецких слов естественным образом. Главное - не лениться и открывать шпаргалку, если не уверены в прочтении слова : )</P>


  </>;
}

function ArticlesSection({saved,onToggle}:{saved:Set<string>;onToggle:(id:string)=>void}){
  return <>
    <SmartHeading title="АРТИКЛИ" id="articles" saved={saved.has('articles')} onToggle={onToggle} level="h3"/>
    <P>Вы наверняка уже видели, как выглядит текст на немецком языке. И вы, вероятно, обратили внимание на россыпь коротких слов der, die, das и прочие. Все эти слова называются артиклями. В русском языке их нет, и поэтому, когда человек, который знает только русский, приступает к изучению языка, в котором артикли есть, то он часто воспринимает их как что-то непонятное и непривычное.</P>
    <P>Артикли - это действительно сложный элемент немецкого языка для изучения. Однако мы спешим вас обрадовать. Для сдачи экзамена А1 ВАМ НЕ НУЖНО УЧИТЬ АРТИКЛИ. ДА : )</P>
    <P>Обычно при изучении немецкого языка начинают с артиклей. Однако наша главная цель - сдать экзамен А1. На самом экзамене игнорирование артиклей не является ошибкой, а неправильное использование артиклей - уже расценивается как ошибка. Поэтому главное правило применения артиклей для нас сейчас звучит так - “Мы их игнорируем”. По ходу конспекта мы еще несколько раз об этом вспомним.</P>
    <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4"><b>Важная деталь.</b><P>В некоторых случаях нам потребуется опосредованное применение артиклей. Эти случаи мы разберем отдельно, и вам всё равно не потребуется учить всю тему целиком.</P></div>
    <P>Тем не менее, знать общую информацию про то, что такое артикли и зачем они нужны в немецком языке, будет полезно.</P>
    <P>Артикль - это маленькое слово, которое стоит перед существительным и помогает понять, какого рода слово, говорим ли мы о конкретном предмете и какую роль слово играет в предложении.</P>
    <P>Например:</P><Example de="der Tisch" ru="стол"/><Example de="die Lampe" ru="лампа"/><MixedExample text="das Buch - книга" audio="das Buch"/>
    <P>Если говорить о базовых артиклях, то есть 5 основных форм:</P><div className="mt-3 grid gap-2"><GermanTerm de="der" ru="мужской род"/><GermanTerm de="die" ru="женский род"/><GermanTerm de="das" ru="средний род"/><GermanTerm de="ein" ru="неопределённый артикль для мужского и среднего рода"/><GermanTerm de="eine" ru="неопределённый артикль для женского рода"/></div>
    <P>Но дальше эти артикли изменяются по падежам, поэтому появляются формы:</P><div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-100 p-3 text-center font-black"><span>den, dem, des, einen, einem, einer и т. д.</span><GermanAudioButton text="den, dem, des, einen, einem, einer" size="sm"/></div>
    <P>Также есть отрицательный артикль:</P><Example de="kein / keine" ru="«никакой / нет»."/>
    <P>Всего таких форм получается 18.</P><P>К счастью, для экзамена А1 нам эта информация почти не нужна.</P><P>Главное - помнить правило:</P><div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-xl font-black">МЫ ИГНОРИРУЕМ АРТИКЛИ</div>
    <P>Пример игнорирования.</P><P>Правильно с точки зрения немецкого языка было бы написать так:</P><Example de="Ich komme mit dem Auto." ru="(Я приеду на машине). Артиклем здесь является слово dem."/><P>Мы же напишем так:</P><Example de="Ich komme mit Auto."/>


  </>;
}

function SentenceSection({saved,onToggle}:{saved:Set<string>;onToggle:(id:string)=>void}){
  return <>
    <SmartHeading title="2. Построение предложения в немецком языке." id="sentenceSchemes" saved={saved.has('sentenceSchemes')} onToggle={onToggle}/><H3>ТЕРМИНЫ</H3>
    <P>Прежде чем начать, нужно запомнить несколько терминов, которыми мы будем пользоваться при обучении.</P>
    <div className="mt-4 grid gap-3"><div className="rounded-xl bg-slate-50 p-4"><b>Подлежащее</b> - существительное или местоимение в именительном падеже. Отвечает на вопрос кто или что.</div><div className="rounded-xl bg-slate-50 p-4"><b>Сказуемое</b> - глагол, то есть действие.</div><div className="rounded-xl bg-slate-50 p-4"><b>Вопросительное слово</b> - где, что, кто, когда, как, почему, какой и др.</div><div className="rounded-xl bg-slate-50 p-4"><b>Обстоятельство</b> - уточнение: когда, где, почему, зачем и др. Обстоятельство дает предложению дополнительный смысл.</div></div>
    <H3>КАК СТРОИТЬ ПРЕДЛОЖЕНИЯ В НЕМЕЦКОМ ЯЗЫКЕ</H3>
    <P>Для сдачи экзамена A1 достаточно запомнить всего три основные схемы предложения, а также знать, как использовать отрицание.</P>
    <H3>1. Обычное предложение</H3><P>В обычном предложении сначала говорим «кто?», потом - «что делает?».</P><div className="mt-3 rounded-xl bg-teal-50 p-3 text-center font-black">Подлежащее → Глагол → Остальная информация</div><Example de="Anna lernt Deutsch." ru="Анна учит немецкий."/><Example de="Tom arbeitet heute zu Hause." ru="Том сегодня работает дома."/>
    <H3>2. Вопросительное предложение</H3><P>Если вопрос начинается со слов когда, где, как, почему, что и т. д., после вопросительного слова сразу ставим глагол.</P><div className="mt-3 rounded-xl bg-teal-50 p-3 text-center font-black">Вопросительное слово → Глагол → Подлежащее → Остальная информация</div><Example de="Wann kommt Anna nach Hause?" ru="Когда Анна приходит домой?"/><Example de="Wo arbeitet Tom?" ru="Где работает Том?"/>
    <H3>3. Вопрос, но без вопросительного слова</H3><P>Если вопрос можно задать без вопросительного слова - просто поставьте глагол на первое место.</P><div className="mt-3 rounded-xl bg-teal-50 p-3 text-center font-black">Глагол → Подлежащее → Остальная информация</div><Example de="Kommt Anna heute?" ru="Анна придёт сегодня?"/><Example de="Arbeitet Tom am Montag?" ru="Том работает в понедельник?"/>
    <H3>Предложения с отрицанием.</H3><P>В немецком языке есть несколько способов сделать предложение отрицательным, но нам достаточно пользоваться лишь одним.</P><P>Самый простой способ сделать предложение отрицательным - это использовать слово nicht - «не».</P><P>На уровне A1 удобно запомнить: nicht обычно стоит ближе к концу предложения.</P><Example de="Ich arbeite heute nicht." ru="Я сегодня не работаю."/><Example de="Anna kommt morgen nicht." ru="Анна завтра не придёт."/>
    <H3>Отрицание в предложении с двумя глаголами</H3><P>Если в предложении есть два глагола, первый глагол изменяется, а второй ставится в самый конец и остаётся в начальной форме (Infinitiv).</P><Example de="Ich möchte heute Deutsch lernen." ru="Я хочу сегодня учить немецкий."/><Example de="Tom kann gut schwimmen." ru="Том умеет хорошо плавать."/><P>Схема:</P><div className="mt-3 rounded-xl bg-teal-50 p-3 text-center font-black">Подлежащее → Первый глагол → Остальная информация → Второй глагол</div><P>Если нужно добавить nicht, оно обычно ставится перед вторым глаголом:</P><Example de="Ich kann heute nicht kommen." ru="Я сегодня не могу прийти."/><Example de="Anna möchte heute nicht arbeiten." ru="Анна сегодня не хочет работать."/>

  </>;
}

// Keep the desktop table exactly as before. Mobile cards read the same forms
// and Russian meanings; GermanAudioButton still receives the original German word.
function PronounFormsResponsive(){
  const caseLabels=['Nominativ — кто? / что?','Dativ — кому?','Akkusativ — кого? / что?','Possessiv — чей? / чья? / чьё?'] as const;
  return <>
    <div className="hidden md:contents">
      <Table headers={['Лицо (рус.)','Кто? / что? Nominativ','Кому? Dativ','Кого? / что? Akkusativ','Чей? / чья? / чьё? Possessiv']} rows={PRONOUN_DISPLAY_ROWS} audioColumns={[1,2,3,4]} audioCells={PRONOUN_AUDIO_CELLS}/>
    </div>
    <div className="mt-4 grid min-w-0 gap-3 md:hidden" data-pronouns-mobile="true">
      {PRONOUNS.map((forms,i)=><section key={i} className="min-w-0 overflow-hidden rounded-2xl border border-[var(--otto-line)] bg-white" aria-label={forms[0]}>
        <h3 className="border-b border-[var(--otto-line)] bg-teal-50 px-3 py-3 text-base font-black text-slate-950">{forms[0].charAt(0).toUpperCase()+forms[0].slice(1)}</h3>
        <div className="divide-y divide-slate-200">
          {forms.slice(1).map((word,j)=><div key={j} className="min-w-0 px-3 py-2.5">
            <h4 className="text-xs font-bold leading-5 text-teal-900">{caseLabels[j]}</h4>
            <div className="mt-1 flex min-w-0 items-center justify-between gap-2">
              <span className="min-w-0 flex-1 text-sm leading-6 text-slate-800"><strong className="font-black text-slate-950">{word}</strong><span className="ml-2 text-slate-600">— {PRONOUN_RUSSIAN_FORMS[i][j]}</span></span>
              <GermanAudioButton text={word} size="sm"/>
            </div>
          </div>)}
        </div>
      </section>)}
    </div>
  </>;
}

function PronounsSection({saved,onToggle}:{saved:Set<string>;onToggle:(id:string)=>void}){return <><p className="otto-kicker">3. Местоимения</p><SmartHeading title="Личные местоимения" id="pronouns" saved={saved.has('pronouns')} onToggle={onToggle}/><PronounFormsResponsive/><div className="mt-5 rounded-xl border border-teal-200 bg-teal-50 p-4"><b>Важная деталь</b><P>Формы слов Possessiv меняются в зависимости от рода, числа и падежа существительного. В целом, достаточно запомнить такую схему:</P></div><div><P>Мужской/средний род - mein.</P><AudioChips items={['mein']}/></div><Example de="Das ist mein Vater" ru="Это мой отец"/><div><P>Женский род/множественное число - meine.</P><AudioChips items={['meine']}/></div><Example de="Das ist meine Mutter" ru="Это моя мама"/><P>Во время сдачи экзамена лучше всё равно избегать спонтанного использования местоимений в Possessiv форме, чтобы не ошибиться. Далеко не все слова в немецком языке имеют тот же род, что и в русском языке. Например, слово “мост” в русском языке имеет мужской род, а в немецком это же слово “Brücke” - женского рода.</P></>}

function VerbsSection({saved,onToggle}:{saved:Set<string>;onToggle:(id:string)=>void}){return <><p className="otto-kicker">4. Глаголы</p><SmartHeading title="СПРЯЖЕНИЕ ГЛАГОЛОВ" id="conjugation" saved={saved.has('conjugation')} onToggle={onToggle}/><P>Выполняя задания на экзамене А1, нам то и дело придётся спрягать глаголы. Спряжение глагола - это изменение формы глагола. На форму глагола влияет лицо, время, а также ряд других обстоятельств. Однако для сдачи экзамена нам достаточно уметь делать спряжение глаголов только по лицам и времени.</P><P>Давайте рассмотрим, как происходит спряжение глагола в настоящем времени, то есть глагол будет меняться только в зависимости от лица.</P><P>Для примера возьмем глагол в начальной форме (Infinitiv). Используем слово “machen” (делать). В начальной форме слово “machen” состоит из корня mach и суффикса en. (Суффикс en используется почти во всех глаголах в начальной форме. Редкое исключение - суффикс n, но он вам точно не встретится на экзамене А1.)</P><P>Для того чтобы сделать спряжение глагола “machen” в настоящем времени, нам нужно заменить его суффикс en на суффикс, присущий данному лицу. Получается следующая схема:</P><div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-100 p-3 text-center font-black"><span>mach (корень) + en (суффикс) = machen (делать)</span><GermanAudioButton text="mach, en, machen" size="sm"/></div><P>Если мы хотим сказать “я делаю”, то схема выглядит так:</P><div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-100 p-3 text-center font-black"><span>mach (корень) + e (суффикс, присущий лицу “я”) = ich mache (я делаю)</span><GermanAudioButton text="ich mache" size="sm"/></div><H3>Наглядная таблица со словом machen</H3><Table headers={['Лицо','Окончание','Форма','Перевод']} rows={MACHEN} audioColumns={[0,2]}/><P>В русском языке бывают предложения, в которых глагола нет. (Например: я большой фанат футбола.) В немецком языке глагол в предложении всегда присутствует. (По крайней мере при самостоятельном построении предложений на экзамене А1 мы всегда должны добавлять глагол).</P><P>Если в русском предложении нет глагола, то в немецком мы добавляем глагол sein - быть/являться. То есть наше предложение про футбол превращается в “Я являюсь большим фанатом футбола”.</P><P>Sein - это особый глагол и спрягается он тоже по-особенному. Это нужно просто запомнить.</P><Table headers={['Лицо','Форма']} rows={SEIN} audioColumns={[0,1]}/><Example de="Ich bin ein großer Fußballfan." ru="Я большой фанат футбола."/><SmartHeading title="МОДАЛЬНЫЕ ГЛАГОЛЫ" id="modals" saved={saved.has('modals')} onToggle={onToggle}/><P>Модальный глагол - это особый глагол, который не обозначает само действие, но показывает отношение говорящего к действию. Модальный глагол обычно идет в паре со смысловым глаголом, обозначающим действие. (Модальный глагол может так же быть единственным глаголом в предложении). Модальный глагол ставится на второе место в предложении и спрягается, а смысловой уходит в конец предложения в начальной форме (Infinitiv). У предложений с модальным глаголом схема выглядит так:</P><div className="mt-3 rounded-xl bg-teal-50 p-3 text-center font-black">Подлежащее - спряженный модальный глагол - всё остальное - смысловой глагол в начальной форме</div><div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-100 p-3 text-center font-black"><span>Ich (подлежащее) - kann (модальный глагол, спряженный к ich) - Fahrrad (всё остальное) - fahren (смысловой глагол в начальной форме)</span><GermanAudioButton text="Ich kann Fahrrad fahren" size="sm"/></div><Example de="Ich kann Fahrrad fahren" ru="Я могу ездить на велосипеде"/><P>Для сдачи экзамена А1 достаточно знать 4 модальных глагола. Они спрягаются не по обычным правилам, поэтому это тоже нужно просто запомнить.</P><Table headers={['Лицо','wollen\nхотеть','können\nмочь / уметь','müssen\nбыть должным / нужно','mögen\nлюбить / нравиться']} rows={MODALS} audioColumns={[1,2,3,4]} audioCells={{'0:0':'ich','1:0':'du','2:0':'er, sie, es','3:0':'wir','4:0':'ihr','5:0':'sie, Sie'}}/></>}

function NounsSection({saved,onToggle}:{saved:Set<string>;onToggle:(id:string)=>void}){return <><p className="otto-kicker">5. Существительные</p><SmartHeading title="Существительные" id="nouns" saved={saved.has('nouns')} onToggle={onToggle}/><P>Существительное - это слово, которое обозначает человека, предмет, место, животное или понятие.</P><P>Например:</P><Table headers={['','']} rows={[[ 'Mann - мужчина','Haus - дом'],['Stadt - город','Hund - собака'],['Arbeit - работа','']]} audioCells={{'0:0':'Mann','0:1':'Haus','1:0':'Stadt','1:1':'Hund','2:0':'Arbeit'}}/><P><b>В немецком языке все существительные пишутся с большой буквы.</b></P><P>Даже если слово стоит не в начале предложения.</P><P>Например:</P><Example de="Ich habe ein Auto." ru="У меня есть машина."/><Example de="Anna arbeitet in einer Schule." ru="Анна работает в школе."/><H3>У существительных есть род</H3><P>В немецком языке существует три рода:</P><ul className="mt-3 list-disc space-y-1 pl-6 text-slate-700"><li>мужской</li><li>женский</li><li>средний</li></ul><P>Обычно род можно увидеть по артиклю:</P><Table headers={['','','']} rows={[[ 'der Mann - мужчина','die Frau - женщина','das Kind - ребёнок']]} audioCells={{'0:0':'der Mann','0:1':'die Frau','0:2':'das Kind'}}/><P>Важно понимать, что род слова в русском и немецком языках может отличаться.</P><P>Например:</P><div className="mt-3 rounded-xl border-l-4 border-teal-300 bg-teal-50/60 px-4 py-3"><b>мост - в русском языке мужской род</b></div><MixedExample text="die Brücke - в немецком языке женский род" audio="die Brücke"/><P>Поэтому род немецкого слова не всегда можно угадать по русскому переводу.</P><P>Опять же нужно помнить, что артиклей мы избегаем как огня.</P><H3>Единственное и множественное число</H3><P>Существительные могут обозначать один предмет или несколько.</P><P>Например:</P><MixedExample text="das Kind - ребёнок" audio="das Kind"/><MixedExample text="die Kinder - дети" audio="die Kinder"/><Example de="das Buch" ru="книга"/><MixedExample text="die Bücher - книги" audio="die Bücher"/><MixedExample text="der Freund - друг" audio="der Freund"/><MixedExample text="die Freunde - друзья" audio="die Freunde"/><P>В немецком языке нет одного универсального окончания для множественного числа.</P><P>У разных слов оно образуется по-разному.</P><P>Поэтому полезно постепенно запоминать слово сразу вместе с его формой множественного числа.</P><H3>Существительное может менять форму в предложении</H3><P>В немецком языке форма существительного и слов рядом с ним может зависеть от того, какую роль слово выполняет в предложении.</P><P>Например:</P><Example de="Der Mann kommt." ru="Мужчина приходит."/><Example de="Ich sehe den Mann." ru="Я вижу мужчину."/><P>Само слово Mann здесь почти не изменилось, но изменился артикль перед ним.</P><P>Для экзамена A1 нам это правило не нужно, но в дальнейшем изучении немецкого языка это станет необходимым.</P></>}

function PrepositionsSection({saved,onToggle}:{saved:Set<string>;onToggle:(id:string)=>void}){return <><p className="otto-kicker">6. Предлоги</p><SmartHeading title="Предлоги" id="prepositions" saved={saved.has('prepositions')} onToggle={onToggle}/><P>Предлоги - это короткие слова, которые помогают связать слова в предложении и показать, где, куда, когда, с кем, откуда и т. д.</P><P>Например:</P><Table headers={['','']} rows={[[ 'am Montag - в понедельник','um 8 Uhr - в 8 часов'],['nach Berlin - в Берлин','mit dem Bus - на автобусе']]} audioCells={{'0:0':'am Montag','0:1':'um 8 Uhr','1:0':'nach Berlin','1:1':'mit dem Bus'}}/><P>В немецком языке предлог часто влияет на форму слова, которое стоит после него. Именно поэтому иногда после предлога меняется артикль или местоимение.</P><P>Поскольку ранее мы уже выяснили, что артикли мы не используем, то в случае с транспортом пишем просто mit + транспорт. Mit Bus.</P><P>На экзамене A1 нам не нужно подробно разбирать все правила употребления предлогов. Гораздо удобнее запоминать готовые сочетания, которые постоянно встречаются в заданиях.</P><H3>Предлоги времени</H3><P>Если нужно сказать, когда что-то происходит, чаще всего нам понадобятся три предлога:</P><div><P><b>am - день недели</b></P><AudioChips items={['am']}/></div><Example de="am Montag" ru="в понедельник"/><Example de="am Samstag" ru="в субботу"/><Example de="Ich komme am Freitag." ru="Я приду в пятницу."/><div><P><b>um - точное время</b></P><AudioChips items={['um']}/></div><Example de="um 8 Uhr" ru="в 8 часов"/><Example de="um 17 Uhr" ru="в 17 часов"/><Example de="Der Kurs beginnt um 18 Uhr." ru="Курс начинается в 18 часов."/><div><P><b>im - месяц или время года</b></P><AudioChips items={['im']}/></div><Example de="im Mai" ru="в мае"/><Example de="im Sommer" ru="летом"/><Example de="Ich fahre im August nach Berlin." ru="Я еду в Берлин в августе."/><P>Главное правило:</P><div className="mt-3 rounded-xl bg-teal-50 p-3 text-center font-black">am → день&nbsp;&nbsp;&nbsp;&nbsp; um → время&nbsp;&nbsp;&nbsp;&nbsp; im → месяц / время года</div><P>Эти три сочетания лучше просто запомнить.</P><H3>От и до</H3><div><P><b>von ... bis ... - с ... до ...</b></P><AudioChips items={['von','bis']}/></div><P>Используется, когда нужно указать промежуток времени.</P><Example de="von 9 bis 17 Uhr" ru="с 9 до 17 часов"/><Example de="Ich arbeite von Montag bis Freitag." ru="Я работаю с понедельника по пятницу."/><div><P><b>ab - начиная с</b></P><AudioChips items={['ab']}/></div><Example de="ab Montag" ru="с понедельника"/><Example de="ab 10 Uhr" ru="с 10 часов"/><Example de="Der Kurs beginnt ab Montag." ru="Курс начинается с понедельника."/><H3>Куда?</H3><P>Для направления нам особенно пригодятся nach и zu.</P><div><P><b>nach - в город или страну</b></P><AudioChips items={['nach']}/></div><Example de="nach Berlin" ru="в Берлин"/><Example de="nach Deutschland" ru="в Германию"/><Example de="Ich fahre morgen nach Hamburg." ru="Я завтра еду в Гамбург."/><P>Также nach может означать «после»:</P><Example de="nach der Arbeit" ru="после работы"/><Example de="Ich gehe nach der Arbeit nach Hause." ru="Я иду домой после работы."/><div><P><b>zu - к человеку или месту</b></P><AudioChips items={['zu']}/></div><Example de="zum Arzt" ru="к врачу"/><Example de="zur Schule" ru="в школу"/><Example de="zu Anna" ru="к Анне"/><Example de="Ich gehe morgen zum Arzt." ru="Я завтра иду к врачу."/><P>Формы zum и zur - это сокращения:</P><div className="mt-3 rounded-xl bg-slate-100 p-3 text-center font-black">zu + dem = zum&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; zu + der = zur</div><P>Вот тут как раз артикли опосредованно влияют на то, что мы пишем, даже если сами артикли стараемся избегать. Лучше просто запомнить несколько самых распространенных формулировок с предлогом zu.</P><Table headers={['Сочетание','Перевод','Пример']} rows={[[ 'zum Arzt','к врачу','Ich gehe zum Arzt. - Я иду к врачу.'],['zur Arbeit','на работу','Ich fahre zur Arbeit. - Я еду на работу.'],['zur Schule','в школу','Mein Sohn geht zur Schule. - Мой сын идёт в школу.'],['zum Bahnhof','к / на вокзал','Ich fahre zum Bahnhof. - Я еду на вокзал.'],['zur Post','на почту','Ich gehe zur Post. - Я иду на почту.'],['zur Bank','в банк','Ich gehe zur Bank. - Я иду в банк.'],['zum Friseur','к парикмахеру','Ich gehe morgen zum Friseur. - Я завтра иду к парикмахеру.'],['zu Anna','к Анне','Ich gehe heute zu Anna. - Я сегодня иду к Анне.'],['zu meiner Freundin','к моей подруге','Ich fahre zu meiner Freundin. - Я еду к моей подруге.'],['zu meinen Eltern','к моим родителям','Ich fahre am Wochenende zu meinen Eltern. - Я еду к родителям на выходных.']]} audioColumns={[0]} audioCells={{'0:2':'Ich gehe zum Arzt.','1:2':'Ich fahre zur Arbeit.','2:2':'Mein Sohn geht zur Schule.','3:2':'Ich fahre zum Bahnhof.','4:2':'Ich gehe zur Post.','5:2':'Ich gehe zur Bank.','6:2':'Ich gehe morgen zum Friseur.','7:2':'Ich gehe heute zu Anna.','8:2':'Ich fahre zu meiner Freundin.','9:2':'Ich fahre am Wochenende zu meinen Eltern.'}}/><H3>Откуда?</H3><div><P><b>aus - из</b></P><AudioChips items={['aus']}/></div><P>Обычно используется, когда говорим, откуда человек родом или откуда он приехал.</P><Example de="aus Deutschland" ru="из Германии"/><Example de="aus Berlin" ru="из Берлина"/><Example de="Ich komme aus Russland." ru="Я из России."/><div><P><b>von - от / с</b></P><AudioChips items={['von']}/></div><Example de="von der Arbeit" ru="с работы"/><Example de="von Anna" ru="от Анны"/><Example de="Ich komme von der Arbeit." ru="Я иду с работы."/><H3>С кем? На чём?</H3><div><P><b>mit - с / на</b></P><AudioChips items={['mit']}/></div><P>Предлог mit очень часто встречается на экзамене.</P><P>Он используется, когда мы говорим, с кем что-то делаем:</P><Example de="mit Anna" ru="с Анной"/><Example de="mit meinem Freund" ru="с моим другом"/><P>И когда говорим, на каком транспорте едем:</P><Example de="mit dem Bus" ru="на автобусе"/><Example de="mit dem Zug" ru="на поезде"/><Example de="mit dem Auto" ru="на машине"/><Example de="Ich fahre mit dem Bus." ru="Я еду на автобусе."/><H3>Для кого?</H3><div><P><b>für - для</b></P><AudioChips items={['für']}/></div><Example de="für dich" ru="для тебя"/><Example de="für meine Mutter" ru="для моей мамы"/><Example de="Das Geschenk ist für dich." ru="Этот подарок для тебя."/><H3>Без чего?</H3><div><P><b>ohne - без</b></P><AudioChips items={['ohne']}/></div><Example de="ohne Auto" ru="без машины"/><Example de="ohne Zucker" ru="без сахара"/><Example de="Ich komme ohne Auto." ru="Я приеду без машины."/><H3>Где?</H3><P>Для описания места часто используются:</P><ul className="mt-3 list-disc space-y-1 pl-6 text-slate-700">{([["in - в","in"],["auf - на","auf"],["neben - рядом с","neben"],["vor - перед","vor"],["hinter - за","hinter"],["zwischen - между","zwischen"],["gegenüber - напротив","gegenüber"]] as const).map(([label,audio])=><li key={label}><span className="inline-flex items-center gap-2"><span>{label}</span><GermanAudioButton text={audio} size="sm"/></span></li>)}</ul><Example de="in der Schule" ru="в школе"/><Example de="auf dem Tisch" ru="на столе"/><Example de="neben dem Bahnhof" ru="рядом с вокзалом"/><Example de="vor dem Hotel" ru="перед отелем"/><Example de="gegenüber dem Bahnhof" ru="напротив вокзала"/><P>На начальном этапе лучше не пытаться самостоятельно строить сложные сочетания с этими предлогами, а запоминать их на примерах.</P><H3>Что нужно запомнить для экзамена A1</H3><P>Не нужно учить все существующие предлоги немецкого языка.</P><P>В первую очередь запомните эти сочетания:</P><ul className="mt-3 list-disc space-y-2 pl-6 text-slate-700">{([['am Montag - в понедельник','am Montag'],['um 8 Uhr - в 8 часов','um 8 Uhr'],['im Mai - в мае','im Mai'],['von 9 bis 17 Uhr - с 9 до 17 часов','von 9 bis 17 Uhr'],['nach Berlin - в Берлин','nach Berlin'],['zum Arzt - к врачу','zum Arzt'],['zur Schule - в школу','zur Schule'],['aus Deutschland - из Германии','aus Deutschland'],['mit Bus - на автобусе','mit Bus'],['mit Auto - на машине','mit Auto'],['für dich - для тебя','für dich'],['ohne Auto - без машины','ohne Auto']] as const).map(([v,audio])=><li key={v}><span className="inline-flex items-center gap-2"><span>{v}</span><GermanAudioButton text={audio} size="sm"/></span></li>)}</ul></>}

function QuestionsSection({saved,onToggle}:{saved:Set<string>;onToggle:(id:string)=>void}){return <><p className="otto-kicker">7. Вопросы</p><SmartHeading title="Вопросительные слова" id="questions" saved={saved.has('questions')} onToggle={onToggle}/><Table headers={['Немецкий','Русский']} rows={QUESTION_WORDS} audioColumns={[0]}/><P>Эти вопросы пригодятся в будущем. На экзамене вам точно потребуется знать, что у вас спрашивают и как правильно задать вопрос. В следующих разделах мы разберем вопросительные слова подробно.</P></>}
function VerbTableSection({saved,onToggle}:{saved:Set<string>;onToggle:(id:string)=>void}){return <><p className="otto-kicker">8. Глаголы</p><SmartHeading title="Глаголы" id="verbTable" saved={saved.has('verbTable')} onToggle={onToggle}/><P>Таблица с глаголами, которые могут вам встретиться на экзамене А1. Это минимальный запас, который вам нужно знать. В тренировочных заданиях вы будете встречать и другие глаголы. Старайтесь их запоминать. Чем больше вы выучите слов - тем лучше.</P><Table headers={['Глагол','Перевод']} rows={VERB_TABLE} audioColumns={[0]}/></>}
function NounTableSection({saved,onToggle}:{saved:Set<string>;onToggle:(id:string)=>void}){return <><p className="otto-kicker">9. Существительные</p><SmartHeading title="Существительные" id="nounTable" saved={saved.has('nounTable')} onToggle={onToggle}/><P>Таблица с существительными, которые могут вам встретиться на экзамене А1. Это минимальный запас, который вам нужно знать. В тренировочных заданиях вы будете встречать и другие существительные. Старайтесь их запоминать. Чем больше вы выучите слов - тем лучше.</P><Table headers={['Существительное','Перевод']} rows={NOUN_TABLE} audioColumns={[0]}/></>}



const GENERAL_SMART_CARD_TARGETS:Record<string,{title:string;section:OttoReferenceContentSection;examSectionId?:string}>={
  alphabet:{title:'Немецкий алфавит',section:'alphabet'},
  letterCombos:{title:'Буквосочетания и звуки',section:'combos'},
  commonCombos:{title:'Часто встречающиеся буквосочетания',section:'combos'},
  rareCombos:{title:'Реже встречающиеся буквосочетания',section:'combos'},
  numbers:{title:'Числа',section:'numbers'},
  numberListening:{title:'Тренировка чисел на слух',section:'numberListening'},
  articles:{title:'Артикли',section:'articles'},
  sentenceSchemes:{title:'Схемы построения предложения',section:'sentence'},
  pronouns:{title:'Местоимения',section:'pronouns'},
  conjugation:{title:'Спряжение глаголов',section:'verbs'},
  modals:{title:'Модальные глаголы',section:'verbs'},
  nouns:{title:'Существительные',section:'nouns'},
  prepositions:{title:'Предлоги',section:'prepositions'},
  questions:{title:'Вопросы',section:'questions'},
  verbTable:{title:'Таблица глаголов',section:'verbTable'},
  nounTable:{title:'Таблица существительных',section:'nounTable'},
};
const EXAM_CARD_TARGETS=Object.fromEntries(
  [...EXAM_REFERENCE_DATA.written.map(item=>[item.id,{title:item.title,section:'written' as const,examSectionId:item.id}]),...EXAM_REFERENCE_DATA.oral.map(item=>[item.id,{title:item.title,section:'oral' as const,examSectionId:item.id}])]
);
export function OttoSmartCardsView({onOpenReference}:{onOpenReference:(section:OttoReferenceContentSection,examSectionId?:string)=>void}){
  const[ids,setIds]=useState<string[]>(readSmartCards);
  useEffect(()=>{const sync=()=>setIds(readSmartCards());window.addEventListener('storage',sync);window.addEventListener('otto-smartcards-changed',sync);return()=>{window.removeEventListener('storage',sync);window.removeEventListener('otto-smartcards-changed',sync)}},[]);
  const[open,setOpen]=useState<string|null>(null);
  const removeSaved=(id:string)=>{
    const next=readSmartCards().filter(item=>item!==id);
    saveSmartCards(next);setIds(next);setOpen(current=>current===id?null:current);
  };
  const targets=ids.map(id=>({id,target:GENERAL_SMART_CARD_TARGETS[id]??EXAM_CARD_TARGETS[id]})).filter((item):item is {id:string;target:{title:string;section:OttoReferenceContentSection;examSectionId?:string}}=>Boolean(item.target));
  if(!targets.length)return <Shell><p className="otto-kicker">УМНЫЕ КАРТОЧКИ</p><h1 className="mt-2 text-3xl font-black">Мои умные карточки</h1><P>Здесь появятся блоки, которые вы сохраните в Справочнике OTTO.</P></Shell>;
  return <Shell><p className="otto-kicker">УМНЫЕ КАРТОЧКИ</p><h1 className="mt-2 text-3xl font-black">Мои умные карточки</h1><div className="mt-5 space-y-3">{targets.map(({id,target})=><div key={id} className="rounded-2xl border border-[var(--otto-line)] bg-white"><button type="button" onClick={()=>setOpen(open===id?null:id)} className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left font-black"><span>{target.title}</span><ChevronDown className={"h-5 w-5 shrink-0 transition "+(open===id?'rotate-180':'')}/></button>{open===id&&<div className="border-t border-[var(--otto-line)] p-3 sm:p-4"><div className="otto-reference-smartcard-embedded"><OttoReferenceContent initialSection={target.section} initialExamSectionId={target.examSectionId} embedded/></div><button type="button" onClick={()=>onOpenReference(target.section,target.examSectionId)} className="mt-4 min-h-11 rounded-xl border border-teal-200 bg-teal-50 px-4 text-sm font-black text-teal-900">Открыть в Справочнике</button><button type="button" onClick={()=>removeSaved(id)} className="ml-2 mt-4 min-h-11 rounded-xl border px-4 text-sm font-bold text-slate-700">Убрать из умных карточек</button></div>}</div>)}</div></Shell>
}

export function OttoReferenceContent({initialSection='home',initialExamSectionId,embedded=false}:{initialSection?:OttoReferenceContentSection;initialExamSectionId?:string;embedded?:boolean}){
  const[section,setSection]=useState<BaseSection>(initialSection);
  const[smartCards,setSmartCards]=useState<string[]>(readSmartCards);
  const saved=useMemo(()=>new Set(smartCards),[smartCards]);
  useEffect(()=>{const sync=()=>setSmartCards(readSmartCards());window.addEventListener('storage',sync);window.addEventListener('otto-smartcards-changed',sync);return()=>{window.removeEventListener('storage',sync);window.removeEventListener('otto-smartcards-changed',sync)}},[]);
  const toggleSmart=(id:string)=>{const current=readSmartCards();if(current.includes(id))return;const next=Array.from(new Set([...current,id]));setSmartCards(next);saveSmartCards(next)};
  const openSection=(next:BaseSection)=>{if(['alphabet','combos','numbers','numberListening','articles','sentence'].includes(next))try{sessionStorage.setItem('otto-reference-base-open','1')}catch{}setSection(next);requestAnimationFrame(scrollReferenceToTop)};
  if(section==='home')return <ReferenceHome onOpen={openSection} smartCards={smartCards}/>;
  const nextSection=REFERENCE_SEQUENCE[REFERENCE_SEQUENCE.indexOf(section)+1];
  const nav=!embedded&&nextSection&&<nav className="mt-4 flex justify-end" aria-label="Следующая тема справочника"><button type="button" onClick={()=>openSection(nextSection)} className="min-h-12 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white">Далее →</button></nav>;
  const returnBar=!embedded&&<ReferenceReturnBar onBackToHome={()=>openSection('home')}/>;
  if(section==='written'||section==='oral')return embedded
    ? <ExamReferenceSection kind={section} saved={saved} onToggle={toggleSmart} initialSectionId={initialExamSectionId} embedded/>
    : <div className="otto-reference-topic-page min-w-0">{returnBar}<Shell>
        <ExamReferenceSection kind={section} saved={saved} onToggle={toggleSmart} initialSectionId={initialExamSectionId}/>
      </Shell></div>;
  return <div className="otto-reference-topic-page min-w-0">{returnBar}<Shell>{section==='examInfo'?<ExamInfoPlaceholder/>:section==='alphabet'?<AlphabetSection saved={saved} onToggle={toggleSmart}/>:section==='combos'?<CombosSection saved={saved} onToggle={toggleSmart}/>:section==='numbers'?<NumbersSection saved={saved} onToggle={toggleSmart}/>:section==='numberListening'?<NumberListeningPractice saved={saved} onToggle={toggleSmart}/>:section==='articles'?<ArticlesSection saved={saved} onToggle={toggleSmart}/>:section==='sentence'?<SentenceSection saved={saved} onToggle={toggleSmart}/>:section==='pronouns'?<PronounsSection saved={saved} onToggle={toggleSmart}/>:section==='verbs'?<VerbsSection saved={saved} onToggle={toggleSmart}/>:section==='nouns'?<NounsSection saved={saved} onToggle={toggleSmart}/>:section==='prepositions'?<PrepositionsSection saved={saved} onToggle={toggleSmart}/>:section==='questions'?<QuestionsSection saved={saved} onToggle={toggleSmart}/>:section==='verbTable'?<VerbTableSection saved={saved} onToggle={toggleSmart}/>:<NounTableSection saved={saved} onToggle={toggleSmart}/>}</Shell>{nav}</div>;
}

export function OttoReferenceOnboarding({onContinue}:{onContinue:()=>void}){
  const[smartCards,setSmartCards]=useState<string[]>(readSmartCards);
  const[section,setSection]=useState<BaseSection>('home');
  const openSection=(next:BaseSection)=>{if(['alphabet','combos','numbers','numberListening','articles','sentence'].includes(next))try{sessionStorage.setItem('otto-reference-base-open','1')}catch{}setSection(next);requestAnimationFrame(scrollReferenceToTop)};
  const saved=useMemo(()=>new Set(smartCards),[smartCards]);
  useEffect(()=>{const sync=()=>setSmartCards(readSmartCards());window.addEventListener('storage',sync);window.addEventListener('otto-smartcards-changed',sync);return()=>{window.removeEventListener('storage',sync);window.removeEventListener('otto-smartcards-changed',sync)}},[]);
  const toggleSmart=(id:string)=>{const current=readSmartCards();if(current.includes(id))return;const next=Array.from(new Set([...current,id]));setSmartCards(next);saveSmartCards(next)};
  const finish=()=>{markReferenceIntroSeen();onContinue()};
  if(section==='home')return <div className="otto-reference-entry-home"><ReferenceReturnBar onBackToStudyBase={finish}/><ReferenceHome onOpen={openSection} smartCards={smartCards}/><div className="otto-reference-entry-next"><ContinueButton onClick={finish}>Далее к обучению</ContinueButton></div></div>;
  const nextSection=REFERENCE_SEQUENCE[REFERENCE_SEQUENCE.indexOf(section)+1];
  const navigation=<nav className="mt-4 flex justify-end" aria-label="Следующая тема справочника">{nextSection?<button type="button" onClick={()=>openSection(nextSection)} className="min-h-12 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white">Далее →</button>:<button type="button" onClick={finish} className="min-h-12 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white">Далее к обучению</button>}</nav>;
  const lessonContent=section==='examInfo'?<ExamInfoPlaceholder/>:section==='alphabet'?<AlphabetSection saved={saved} onToggle={toggleSmart}/>:section==='combos'?<CombosSection saved={saved} onToggle={toggleSmart}/>:section==='numbers'?<NumbersSection saved={saved} onToggle={toggleSmart}/>:section==='numberListening'?<NumberListeningPractice saved={saved} onToggle={toggleSmart}/>:section==='articles'?<ArticlesSection saved={saved} onToggle={toggleSmart}/>:section==='sentence'?<SentenceSection saved={saved} onToggle={toggleSmart}/>:section==='pronouns'?<PronounsSection saved={saved} onToggle={toggleSmart}/>:section==='verbs'?<VerbsSection saved={saved} onToggle={toggleSmart}/>:section==='nouns'?<NounsSection saved={saved} onToggle={toggleSmart}/>:section==='prepositions'?<PrepositionsSection saved={saved} onToggle={toggleSmart}/>:section==='questions'?<QuestionsSection saved={saved} onToggle={toggleSmart}/>:section==='verbTable'?<VerbTableSection saved={saved} onToggle={toggleSmart}/>:<NounTableSection saved={saved} onToggle={toggleSmart}/>;
  return <div className="otto-reference-topic-page min-w-0">
    <ReferenceReturnBar onBackToHome={()=>openSection('home')} onBackToStudyBase={finish}/>
    {section==='written'||section==='oral'?<Shell>
      <ExamReferenceSection kind={section} saved={saved} onToggle={toggleSmart}/>
    </Shell>:<><Shell>{lessonContent}</Shell>{navigation}</>}
  </div>;
}
