import { useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, BookOpenCheck, ChevronRight, CircleHelp, Download, GraduationCap, Languages, Newspaper, Route, Search, UserRound, Volume2 } from 'lucide-react';
import { OttoScene } from '@/components/OttoScene';
import {
  ALPHABET, BASE_CATEGORIES, CONSTRUCTIONS, MEANING_CHANGERS, MODULE_CATEGORIES, PDFS, PRONOUNS,
  QUESTION_BASES, QUESTION_WORDS, VERBS, VOCAB_GROUPS,
  type ReferenceCategory, type ReferencePageId, type ReferenceWord,
} from '@/data/referenceData';

interface Props{
  onOpenInstructions:()=>void;
  onOpenExamGuide:()=>void;
  onOpenHowTo:()=>void;
  onOpenAccount:()=>void;
  onOpenNews:()=>void;
}

const serifFont={fontFamily:'Georgia, "Times New Roman", serif'};
const sansFont={fontFamily:'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'};

const PAGE_META:Record<ReferencePageId,{title:string;why:string;tags:string[]}>= {
  vocab:{title:'Лексика A1',why:'Чтобы узнавать самые частые слова в заданиях и быстро собирать простые фразы.',tags:['Нужно всем']},
  alphabet:{title:'Алфавит',why:'Чтобы уверенно назвать по буквам имя, фамилию, город или страну.',tags:['Нужно всем','Для Sprechen']},
  verbs:{title:'Основные глаголы',why:'Чтобы понимать ядро предложения и строить короткие фразы A1.',tags:['Нужно всем']},
  pronouns:{title:'Местоимения',why:'Чтобы не путаться, кто говорит и к кому обращаются.',tags:['Нужно всем']},
  questions:{title:'Вопросительные слова',why:'Чтобы быстро понять, какую информацию спрашивают, и задать свой вопрос.',tags:['Нужно всем','Для Sprechen']},
  constructions:{title:'Полезные конструкции',why:'Надёжные заготовки для общения и слова, которые могут полностью изменить смысл.',tags:['Нужно всем','Для Hören']},
  numbers:{title:'Числа, время и даты',why:'Чтобы не терять баллы на ценах, времени, датах и телефонных номерах.',tags:['Нужно всем','Для Hören']},
  grammar:{title:'Грамматика-минимум',why:'Только те правила, которые помогают написать и сказать понятную простую фразу.',tags:['Нужно всем']},
  lesen:{title:'Lesen',why:'Стратегия по Teil 1 / 2 / 3: искать доказательство ответа, а не переводить весь текст.',tags:['Для Lesen']},
  horen:{title:'Hören',why:'Стратегия по частям экзамена плюс числа, время, отрицания и повороты смысла.',tags:['Для Hören']},
  schreiben:{title:'Schreiben',why:'Formular, формула письма, готовые конструкции и понятная проверка перед отправкой.',tags:['Для Schreiben']},
  sprechen:{title:'Sprechen',why:'Три экзаменационные части: о себе, вопросы и просьбы.',tags:['Для Sprechen']},
};

const LESEN_SECTIONS=[
  {title:'Teil 1',subtitle:'Короткие письма и сообщения · Richtig / Falsch',points:[
    'Сначала прочитайте утверждение и поймите, что именно надо проверить: кто, когда, где, сколько, можно или нельзя.',
    'Найдите в тексте одну фразу-доказательство. Ответ выбирайте по смыслу, а не по знакомому слову.',
    'Сравнивайте детали: время, день, место, число и отрицание.',
    'Ловушки: nicht / kein, erst, nur, ab / bis, другое время или похожее число.',
    'Полный перевод обычно не нужен: достаточно утверждения и предложения, которое его подтверждает или опровергает.',
  ]},
  {title:'Teil 2',subtitle:'Ситуация + два источника / варианта',points:[
    'Сначала прочитайте ситуацию и сформулируйте потребность одним вопросом: что человеку нужно найти?',
    'Смотрите оба варианта по ключевым признакам: услуга, место, время, цена, способ действия.',
    'Правильный вариант должен закрывать главное условие целиком, а не просто содержать похожее слово.',
    'Если подходят оба, ищите второе условие: где, когда, для кого, онлайн или на месте.',
    'Не переводите сайт или объявление полностью: найдите строку-доказательство.',
  ]},
  {title:'Teil 3',subtitle:'Таблички, объявления, короткие правила · Richtig / Falsch',points:[
    'Сначала прочитайте утверждение, затем табличку. Ищите разрешение, запрет, время или место.',
    'Доказательство часто короткое: nur, nicht, verboten, geöffnet, geschlossen, ab или bis.',
    'Не додумывайте то, чего нет в объявлении.',
    'Особенно внимательно сравнивайте день недели и время.',
    'Полный перевод не нужен: достаточно понять правило и сопоставить его с утверждением.',
  ]},
];

const HOREN_SECTIONS=[
  {title:'Общий алгоритм',points:[
    'До аудио прочитайте вопрос и поймите, ЧТО нужно услышать: число, время, место, цену, действие или решение.',
    'Не выбирайте ответ только потому, что услышали знакомое слово.',
    'Следите за отрицаниями и поворотами: nicht / kein, aber, leider.',
    'Отличайте первоначальное предложение от окончательного решения.',
    'Числа, время, цены и даты слушайте особенно внимательно.',
  ]},
  {title:'Teil 1',subtitle:'A/B/C · каждый текст звучит дважды',points:[
    'После первого прослушивания зафиксируйте вероятный ответ.',
    'Во второй раз проверяйте именно сомнительную деталь: число, время, место или финальный выбор.',
  ]},
  {title:'Teil 2',subtitle:'Richtig / Falsch · каждый текст звучит один раз',points:[
    'Здесь второго прослушивания нет: заранее поймите, какую деталь ловить.',
    'Проверяйте всю формулировку, а не одно совпавшее слово.',
    'Особенно важны sollen / müssen, место, направление, время и отрицание.',
  ]},
  {title:'Teil 3',subtitle:'A/B/C · каждый текст звучит дважды',points:[
    'На первом прослушивании выберите вероятный ответ, на втором подтвердите конкретную деталь.',
    'Для номеров, цен, времени и дат мысленно повторите услышанное число перед выбором.',
  ]},
];

const SCHREIBEN_GROUPS=[
  {title:'Как устроено Schreiben',points:[
    'Teil 1 — Formular: взять данные из ситуации и вписать недостающую информацию.',
    'Teil 2 — короткий текст по повседневной ситуации и трём заданным пунктам.',
  ]},
  {title:'Личное или официальное',points:[
    'Личное: Liebe … / Lieber … → Viele Grüße / Liebe Grüße.',
    'Официальное: Sehr geehrte Damen und Herren, / Sehr geehrte Frau … → Mit freundlichen Grüßen.',
  ]},
  {title:'Главная формула письма',points:['ОБРАЩЕНИЕ','3 ПУНКТА','ЗАКЛЮЧЕНИЕ','ПРОЩАНИЕ','ИМЯ']},
  {title:'Как набрать баллы проще',points:[
    'Сначала выделите все 3 обязательных пункта.',
    '1 пункт задания = 1 простая понятная фраза.',
    'Используйте слова и формулировки из самого задания, если они подходят.',
    'Не усложняйте грамматику ради красоты.',
    'Перед отправкой проверьте: все ли 3 пункта закрыты.',
  ]},
];

const SCHREIBEN_PHRASES=[
  {title:'Приглашение',lines:['Ich möchte Sie/dich einladen.','Haben Sie/Hast du am Montag Zeit?']},
  {title:'Благодарность',lines:['Vielen Dank für Ihre/deine Nachricht.','Vielen Dank für die Einladung.']},
  {title:'Не могу прийти',lines:['Ich kann leider nicht kommen.','Ich habe leider keine Zeit.']},
  {title:'Запись на курс',lines:['Ich möchte mich für den Kurs anmelden.','Wann beginnt der Kurs?','Wie viel kostet der Kurs?']},
  {title:'Запрос информации',lines:['Können Sie mir Informationen schicken?','Ich freue mich auf Ihre Antwort.']},
  {title:'Время встречи',lines:['Wann können wir uns treffen?','Ich kann am Montag um 18 Uhr.']},
  {title:'Цена',lines:['Wie viel kostet der Kurs?','Was kostet das?']},
  {title:'Гостиница',lines:['Ich möchte ein Zimmer reservieren.','Haben Sie ein Zimmer frei?']},
  {title:'Официальное обращение',lines:['Sehr geehrte Damen und Herren,','Sehr geehrte Frau …,']},
  {title:'Личное обращение',lines:['Liebe …,','Lieber …,']},
  {title:'Завершение письма',lines:['Ich freue mich auf Ihre Antwort.','Mit freundlichen Grüßen','Viele Grüße','Liebe Grüße']},
];

const GRAMMAR_MINIMUM=[
  {title:'Глагол обычно на 2-м месте',copy:'Ich wohne in Berlin. Heute arbeite ich.'},
  {title:'am · um · im',copy:'am Montag — день; um 18 Uhr — точное время; im September — месяц / время года.'},
  {title:'Вопрос без вопросительного слова',copy:'Haben Sie Zeit? Können Sie helfen?'},
  {title:'Вопросительное слово + глагол',copy:'Wo wohnen Sie? Wann beginnt der Kurs?'},
  {title:'nicht и kein',copy:'nicht отрицает действие или признак; kein/keine — существительное.'},
  {title:'Модальные глаголы',copy:'После kann / muss / will смысловой глагол обычно уходит в конец: Ich kann heute kommen.'},
  {title:'Артикль учим вместе со словом',copy:'Не Bahnhof, а der Bahnhof; не Familie, а die Familie; не Hotel, а das Hotel.'},
];

const DAYS=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
const NUMBER_PAIRS=['13 — dreizehn','30 — dreißig','14 — vierzehn','40 — vierzig','19 — neunzehn','90 — neunzig'];
const TIME_EXAMPLES=['8:00 — acht Uhr','8:30 — halb neun','8:45 — Viertel vor neun','9:15 — Viertel nach neun'];
const SPRECHEN_REQUESTS=[
  {de:'Bringen Sie mir bitte …',ru:'Принесите мне, пожалуйста, …'},
  {de:'Geben Sie mir bitte …',ru:'Дайте мне, пожалуйста, …'},
  {de:'Öffnen Sie bitte …',ru:'Откройте, пожалуйста, …'},
  {de:'Können Sie bitte …?',ru:'Вы можете, пожалуйста, …?'},
];
const SPRECHEN_REACTIONS=[
  {de:'Ja, gerne.',ru:'Да, с удовольствием.'},
  {de:'Ja, natürlich.',ru:'Да, конечно.'},
  {de:'Ja, kein Problem.',ru:'Да, без проблем.'},
];

function speakGerman(text:string){
  if(!text||typeof window==='undefined')return;
  const clean=text.replace(/…/g,'').trim();
  if(!clean)return;
  const api=(window as Window&{OttoSpeech?:{play?:(value:string,options?:{mode?:'normal'|'slow'})=>Promise<boolean>}}).OttoSpeech;
  if(api?.play){void api.play(clean,{mode:'normal'});return}
  if(!('speechSynthesis' in window))return;
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(clean);
  utterance.lang='de-DE';
  utterance.rate=.86;
  const voices=window.speechSynthesis.getVoices().filter(voice=>voice.lang.toLowerCase().startsWith('de'));
  utterance.voice=voices.find(voice=>/natural|premium|google|microsoft/i.test(voice.name))||voices[0]||null;
  window.speechSynthesis.speak(utterance);
}

function Tag({children}:{children:string}){return <span className="inline-flex rounded-full border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] px-2 py-1 text-[10px] font-bold text-[var(--otto-petrol-dark)]">{children}</span>}
function SpeakButton({text}:{text:string}){return <button type="button" onClick={()=>speakGerman(text)} aria-label={`Прослушать: ${text}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--otto-line)] bg-[var(--otto-surface)] text-[var(--otto-petrol-dark)]"><Volume2 className="h-4 w-4"/></button>}
function PdfButton({page}:{page:ReferencePageId}){const href=PDFS[page];if(!href)return null;return <a href={href} download className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--otto-line)] bg-[var(--otto-surface)] px-4 text-sm font-bold text-[var(--otto-petrol-dark)]"><Download className="h-4 w-4"/>Скачать PDF</a>}

function CategoryButton({item,onOpen}:{item:ReferenceCategory;onOpen:(id:ReferencePageId)=>void}){
  return <button type="button" onClick={()=>onOpen(item.id)} className="flex min-h-[92px] w-full items-center gap-3 rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] p-3 text-left">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--otto-surface)] text-[var(--otto-petrol-dark)]"><BookOpenCheck className="h-5 w-5"/></span>
    <span className="min-w-0 flex-1"><strong className="block text-sm text-[var(--otto-ink)]">{item.title}</strong><span className="mt-1 block text-xs leading-5 text-[var(--otto-muted)]">{item.copy}</span><span className="mt-2 flex flex-wrap gap-1">{item.tags.map(tag=><Tag key={tag}>{tag}</Tag>)}</span></span>
    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--otto-muted)]"/>
  </button>;
}

function PageShell({page,onBack,children}:{page:ReferencePageId;onBack:()=>void;children:ReactNode}){
  const meta=PAGE_META[page];
  return <div className="animate-fade-in pb-8 text-[var(--otto-ink)]" style={sansFont}>
    <button type="button" onClick={onBack} className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--otto-line)] bg-[var(--otto-surface)] px-4 text-sm font-bold text-[var(--otto-ink)]"><ArrowLeft className="h-4 w-4"/>Назад к справочнику</button>
    <section className="rounded-[28px] border border-[var(--otto-line)] bg-[var(--otto-surface)] p-5 shadow-[0_12px_30px_rgba(43,54,54,.07)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="text-[11px] font-[850] uppercase tracking-[.14em] text-[var(--otto-petrol-dark)]">OTTO A1 · Справочник</p><h1 className="mt-1 text-2xl font-bold leading-[1.08] text-[var(--otto-ink)]" style={serifFont}>{meta.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--otto-muted)]">{meta.why}</p><div className="mt-3 flex flex-wrap gap-1.5">{meta.tags.map(tag=><Tag key={tag}>{tag}</Tag>)}</div></div><PdfButton page={page}/></div>
      <div className="mt-5">{children}</div>
    </section>
  </div>;
}

function WordCard({word}:{word:ReferenceWord}){return <div className="flex items-start gap-3 rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] p-3"><div className="min-w-0 flex-1"><strong className="block text-base text-[var(--otto-ink)]">{word.de}</strong><span className="mt-1 block text-xs text-[var(--otto-muted)]">[{word.transcript}]</span><span className="mt-1 block text-sm text-[var(--otto-ink)]">{word.ru}</span>{word.example&&<span className="mt-2 block text-xs font-semibold text-[var(--otto-petrol-dark)]">→ {word.example}</span>}</div><SpeakButton text={word.de}/></div>}
function SimpleGermanRow({de,ru,transcript}:{de:string;ru:string;transcript?:string}){return <div className="flex items-center gap-3 rounded-xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] p-3"><div className="min-w-0 flex-1"><strong className="block text-sm text-[var(--otto-ink)]">{de}</strong>{transcript&&<span className="mt-0.5 block text-xs text-[var(--otto-muted)]">[{transcript}]</span>}<span className="mt-1 block text-xs text-[var(--otto-muted)]">{ru}</span></div><SpeakButton text={de}/></div>}
function BulletSection({title,subtitle,points}:{title:string;subtitle?:string;points:string[]}){return <section className="rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] p-4"><h2 className="text-base font-bold text-[var(--otto-ink)]">{title}</h2>{subtitle&&<p className="mt-1 text-xs font-semibold leading-5 text-[var(--otto-petrol-dark)]">{subtitle}</p>}<ul className="mt-3 space-y-2">{points.map(point=><li key={point} className="flex gap-2 text-sm leading-6 text-[var(--otto-muted)]"><span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--otto-petrol)]"/><span>{point}</span></li>)}</ul></section>}

function VocabPage(){return <div className="space-y-3">{Object.entries(VOCAB_GROUPS).map(([group,words],index)=><details key={group} open={index===0} className="rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)]"><summary className="cursor-pointer list-none px-4 py-4 text-sm font-bold text-[var(--otto-ink)]">{group} <span className="ml-1 text-xs font-normal text-[var(--otto-muted)]">({words.length})</span></summary><div className="grid gap-2 border-t border-[var(--otto-line)] p-3 sm:grid-cols-2">{words.map(word=><WordCard key={`${group}-${word.de}`} word={word}/>)}</div></details>)}</div>}
function AlphabetPage(){return <><div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">{ALPHABET.map(item=><div key={item.letter} className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] p-3"><div><strong className="text-xl">{item.letter}</strong><span className="block text-xs text-[var(--otto-muted)]">{item.transcript}</span></div><SpeakButton text={item.letter}/></div>)}</div><div className="mt-4 rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-petrol-soft)] p-4"><strong>Потренируй по буквам</strong><p className="mt-2 text-sm leading-6 text-[var(--otto-muted)]">Имя · фамилию · город · страну. Русская подсказка вспомогательная, основной ориентир — немецкое аудио.</p></div></>}
function VerbsPage(){return <div className="grid gap-2 sm:grid-cols-2">{VERBS.map(word=><WordCard key={word.de} word={word}/>)}</div>}
function PronounsPage(){return <div className="grid gap-2 sm:grid-cols-2">{PRONOUNS.map(item=><SimpleGermanRow key={`${item.de}-${item.ru}`} de={item.de} transcript={item.transcript} ru={item.ru}/>)}</div>}
function QuestionsPage(){return <div className="space-y-5"><section><h2 className="mb-3 text-base font-bold">Вопросительные слова</h2><div className="grid gap-2 sm:grid-cols-2">{QUESTION_WORDS.map(item=><SimpleGermanRow key={item.de} de={item.de} transcript={item.transcript} ru={item.ru}/>)}</div></section><section><h2 className="mb-3 text-base font-bold">Готовые основы вопроса</h2><div className="grid gap-2 sm:grid-cols-2">{QUESTION_BASES.map(item=><SimpleGermanRow key={item.de} de={item.de} ru={item.ru}/>)}</div></section></div>}
function ConstructionsPage(){return <div className="space-y-5"><section><h2 className="mb-3 text-base font-bold">Надёжные конструкции</h2><div className="grid gap-2 sm:grid-cols-2">{CONSTRUCTIONS.map(item=><SimpleGermanRow key={item.de} de={item.de} ru={item.ru}/>)}</div></section><section className="rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-petrol-soft)] p-4"><h2 className="font-bold">Слова, которые меняют смысл</h2><p className="mt-1 text-xs leading-5 text-[var(--otto-muted)]">Особенно важно для Hören: знакомое слово до aber / leider ещё не означает финальный ответ.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{MEANING_CHANGERS.map(item=><SimpleGermanRow key={item.de} de={item.de} ru={item.ru}/>)}</div></section></div>}
function NumbersPage(){return <div className="space-y-4"><BulletSection title="Числа, которые легко перепутать" points={NUMBER_PAIRS}/><BulletSection title="Время" points={TIME_EXAMPLES}/><section className="rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] p-4"><h2 className="font-bold">Дни недели</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{DAYS.map(day=><div key={day} className="flex items-center justify-between rounded-xl bg-[var(--otto-surface)] px-3 py-2"><span className="text-sm font-semibold">{day}</span><SpeakButton text={day}/></div>)}</div><p className="mt-3 text-sm text-[var(--otto-muted)]">Полезные сочетания: <b>am Montag</b> · <b>heute</b> · <b>morgen</b> · <b>ab 10 Uhr</b> · <b>bis 18 Uhr</b>.</p></section><BulletSection title="Цены, телефон и даты" points={['19,95 € → neunzehn Euro fünfundneunzig Cent','Телефон слушайте группами цифр и сразу повторяйте про себя.','Для даты ловите число + месяц; для времени — ab / bis / um.']}/></div>}
function GrammarPage(){return <div className="grid gap-3 sm:grid-cols-2">{GRAMMAR_MINIMUM.map(item=><section key={item.title} className="rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] p-4"><h2 className="text-sm font-bold">{item.title}</h2><p className="mt-2 text-sm leading-6 text-[var(--otto-muted)]">{item.copy}</p></section>)}</div>}

function LesenPage({onOpen}:{onOpen:(id:ReferencePageId)=>void}){return <div className="space-y-3">{LESEN_SECTIONS.map(section=><BulletSection key={section.title} {...section}/>)}<section className="rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-petrol-soft)] p-4"><h2 className="font-bold">Быстро повторить перед Lesen</h2><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={()=>onOpen('questions')} className="rounded-xl bg-[var(--otto-surface)] px-3 py-2 text-xs font-bold">Вопросительные слова</button><button type="button" onClick={()=>onOpen('numbers')} className="rounded-xl bg-[var(--otto-surface)] px-3 py-2 text-xs font-bold">Время и даты</button><button type="button" onClick={()=>onOpen('vocab')} className="rounded-xl bg-[var(--otto-surface)] px-3 py-2 text-xs font-bold">Лексика A1</button></div></section></div>}
function HorenPage({onOpen}:{onOpen:(id:ReferencePageId)=>void}){return <div className="space-y-3">{HOREN_SECTIONS.map(section=><BulletSection key={section.title} {...section}/>)}<div className="grid gap-3 sm:grid-cols-2"><BulletSection title="Числа и цены" points={['13 / 30, 14 / 40, 19 / 90 — проверяйте окончание числа.','Цена может прозвучать как Euro + Cent: не хватайте первое знакомое число.']}/><BulletSection title="Телефонные номера" points={['Слушайте цифры небольшими группами.','После услышанной группы сразу повторите её про себя.']}/><BulletSection title="Время и даты" points={['Для времени особенно ловите um / ab / bis.','Для даты ищите число + месяц и проверяйте, не изменился ли день.']}/><BulletSection title="Дни недели" points={['Montag–Sonntag нужно узнавать сразу.','Сравнивайте день в вопросе с окончательным решением в аудио.']}/><BulletSection title="Отрицание" points={['nicht / kein / keine могут полностью перевернуть ответ.','Проверяйте, к какому слову относится отрицание.']}/><BulletSection title="Изменение смысла" points={['aber / leider часто вводят окончательное решение.','zuerst / dann помогают отличить первоначальный план от того, что решили в конце.']}/></div><section className="rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-petrol-soft)] p-4"><h2 className="font-bold">Быстро повторить перед Hören</h2><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={()=>onOpen('numbers')} className="rounded-xl bg-[var(--otto-surface)] px-3 py-2 text-xs font-bold">Числа, время и даты</button><button type="button" onClick={()=>onOpen('constructions')} className="rounded-xl bg-[var(--otto-surface)] px-3 py-2 text-xs font-bold">Слова, которые меняют смысл</button></div></section><p className="text-xs leading-5 text-[var(--otto-muted)]">Количество прослушиваний сверено по официальному Goethe-Institut A1 Modellsatz: Teil 1 — дважды, Teil 2 — один раз, Teil 3 — дважды.</p></div>}
function SchreibenPage(){return <div className="space-y-4">{SCHREIBEN_GROUPS.map(section=><BulletSection key={section.title} {...section}/>)}<section><h2 className="mb-3 text-base font-bold">Готовые группы конструкций</h2><div className="grid gap-3 sm:grid-cols-2">{SCHREIBEN_PHRASES.map(group=><div key={group.title} className="rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] p-4"><h3 className="text-sm font-bold">{group.title}</h3><div className="mt-3 space-y-2">{group.lines.map(line=><div key={line} className="flex items-center gap-2 rounded-xl bg-[var(--otto-surface)] p-2.5"><span className="min-w-0 flex-1 text-sm">{line}</span><SpeakButton text={line}/></div>)}</div></div>)}</div></section><BulletSection title="Проверка перед отправкой" points={['Есть ли обращение?','Закрыты ли все 3 пункта задания?','Каждый пункт выражен понятной простой фразой?','Есть ли завершение, прощание и имя?']}/></div>}
function SprechenPage(){return <div className="space-y-4"><BulletSection title="TEIL 1 · О себе" points={['Name','Alter','Land','Wohnort','Sprachen','Beruf','Hobby','Потренируйте spelling имени, фамилии, города и страны; повторите номер телефона и индекс.']}/><section className="rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] p-4"><h2 className="font-bold">TEIL 2 · Задать вопрос</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{QUESTION_BASES.map(item=><SimpleGermanRow key={item.de} de={item.de} ru={item.ru}/>)}</div></section><section className="rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] p-4"><h2 className="font-bold">TEIL 3 · Просьба</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{SPRECHEN_REQUESTS.map(item=><SimpleGermanRow key={item.de} de={item.de} ru={item.ru}/>)}</div><h3 className="mt-4 text-sm font-bold">Короткие ответы</h3><div className="mt-2 grid gap-2 sm:grid-cols-3">{SPRECHEN_REACTIONS.map(item=><SimpleGermanRow key={item.de} de={item.de} ru={item.ru}/>)}</div></section></div>}

function ReferencePage({page,onBack,onOpen}:{page:ReferencePageId;onBack:()=>void;onOpen:(id:ReferencePageId)=>void}){
  let body:ReactNode=null;
  if(page==='vocab')body=<VocabPage/>;
  else if(page==='alphabet')body=<AlphabetPage/>;
  else if(page==='verbs')body=<VerbsPage/>;
  else if(page==='pronouns')body=<PronounsPage/>;
  else if(page==='questions')body=<QuestionsPage/>;
  else if(page==='constructions')body=<ConstructionsPage/>;
  else if(page==='numbers')body=<NumbersPage/>;
  else if(page==='grammar')body=<GrammarPage/>;
  else if(page==='lesen')body=<LesenPage onOpen={onOpen}/>;
  else if(page==='horen')body=<HorenPage onOpen={onOpen}/>;
  else if(page==='schreiben')body=<SchreibenPage/>;
  else body=<SprechenPage/>;
  return <PageShell page={page} onBack={onBack}>{body}</PageShell>;
}

function searchableText(id:ReferencePageId){
  const category=[...BASE_CATEGORIES,...MODULE_CATEGORIES].find(item=>item.id===id);
  const base=`${category?.title||''} ${category?.copy||''} ${category?.keywords||''}`;
  if(id==='vocab')return `${base} ${Object.entries(VOCAB_GROUPS).flatMap(([group,words])=>[group,...words.flatMap(word=>[word.de,word.ru,word.example||''])]).join(' ')}`;
  if(id==='verbs')return `${base} ${VERBS.flatMap(word=>[word.de,word.ru,word.example||'']).join(' ')}`;
  if(id==='pronouns')return `${base} ${PRONOUNS.flatMap(item=>[item.de,item.ru]).join(' ')}`;
  if(id==='questions')return `${base} ${QUESTION_WORDS.flatMap(item=>[item.de,item.ru]).join(' ')} ${QUESTION_BASES.flatMap(item=>[item.de,item.ru]).join(' ')}`;
  if(id==='constructions')return `${base} ${CONSTRUCTIONS.flatMap(item=>[item.de,item.ru]).join(' ')} ${MEANING_CHANGERS.flatMap(item=>[item.de,item.ru]).join(' ')}`;
  return base;
}

export function ReferenceHub({onOpenInstructions,onOpenExamGuide,onOpenHowTo,onOpenAccount,onOpenNews}:Props){
  const[page,setPage]=useState<ReferencePageId|null>(null);
  const[query,setQuery]=useState('');

  useLayoutEffect(()=>{
    if(!page)return;
    const scrollContainer=document.querySelector<HTMLElement>('.otto-view-reference .otto-inner-screen');
    if(scrollContainer)scrollContainer.scrollTop=0;
  },[page]);
  const allCategories=[...BASE_CATEGORIES,...MODULE_CATEGORIES];
  const filtered=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase('ru-RU');
    if(!q)return allCategories;
    return allCategories.filter(item=>searchableText(item.id).toLocaleLowerCase('ru-RU').includes(q));
  },[query]);
  if(page)return <ReferencePage page={page} onBack={()=>setPage(null)} onOpen={setPage}/>;

  const base=filtered.filter(item=>BASE_CATEGORIES.some(baseItem=>baseItem.id===item.id));
  const modules=filtered.filter(item=>MODULE_CATEGORIES.some(module=>module.id===item.id));
  const extra=[
    {title:'Как выполнять задания',copy:'Короткие правила работы с заданиями OTTO.',Icon:CircleHelp,onClick:onOpenInstructions},
    {title:'Как проходит экзамен A1',copy:'Структура экзамена и важные ориентиры по частям.',Icon:GraduationCap,onClick:onOpenExamGuide},
    {title:'Как тренироваться',copy:'Как сочетать ежедневную тренировку и самостоятельные модули.',Icon:Route,onClick:onOpenHowTo},
    {title:'Мой прогресс',copy:'Статистика попыток и результаты по навыкам.',Icon:UserRound,onClick:onOpenAccount},
    {title:'Новости A1',copy:'Обновления и полезная информация внутри OTTO.',Icon:Newspaper,onClick:onOpenNews},
  ];

  return <div className="animate-fade-in pb-8 text-[var(--otto-ink)]" style={sansFont}>
    <section className="relative overflow-hidden rounded-[28px] border border-[var(--otto-line)] bg-[var(--otto-petrol-soft)] p-5 sm:p-6">
      <div className="relative z-10 max-w-[70%]"><p className="text-[11px] font-[850] uppercase tracking-[.16em] text-[var(--otto-petrol-dark)]">OTTO A1</p><h1 className="mt-1 text-2xl font-bold leading-[1.05] text-[var(--otto-ink)]" style={serifFont}>Справочник</h1><p className="mt-2 text-sm leading-6 text-[var(--otto-muted)]">База знаний и стратегии для экзамена — всё нужное в одном месте.</p></div>
      <OttoScene scene="guide" className="absolute -bottom-16 -right-7 h-48 w-auto max-w-none sm:-bottom-20 sm:right-0 sm:h-56"/>
    </section>

    <div className="relative mt-4"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--otto-muted)]"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Найти: Bahnhof, письмо, время…" className="min-h-12 w-full rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-surface)] pl-11 pr-4 text-sm text-[var(--otto-ink)] outline-none focus:border-[var(--otto-petrol)]"/></div>

    <section className="mt-4 rounded-[24px] border border-[var(--otto-line)] bg-[var(--otto-surface)] p-4 shadow-[0_12px_30px_rgba(43,54,54,.07)] sm:p-5">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--otto-petrol-soft)] text-[var(--otto-petrol-dark)]"><Languages className="h-5 w-5"/></span><div><p className="text-xs font-[850] uppercase tracking-[.14em] text-[var(--otto-petrol-dark)]">База для A1</p><h2 className="text-xl font-bold leading-[1.08] text-[var(--otto-ink)]" style={serifFont}>База A1</h2></div></div>
      <div className="mt-4 grid gap-2 lg:grid-cols-2">{base.map(item=><CategoryButton key={item.id} item={item} onOpen={setPage}/>)}</div>
      {query&&base.length===0&&<p className="mt-4 text-sm text-[var(--otto-muted)]">В Базе A1 по этому запросу ничего не найдено.</p>}
    </section>

    <section className="mt-4 rounded-[24px] border border-[var(--otto-line)] bg-[var(--otto-surface)] p-4 shadow-[0_12px_30px_rgba(43,54,54,.07)] sm:p-5">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--otto-petrol-soft)] text-[var(--otto-petrol-dark)]"><GraduationCap className="h-5 w-5"/></span><div><p className="text-xs font-[850] uppercase tracking-[.14em] text-[var(--otto-petrol-dark)]">Конкретный модуль</p><h2 className="text-xl font-bold leading-[1.08] text-[var(--otto-ink)]" style={serifFont}>По модулям экзамена</h2></div></div>
      <div className="mt-4 grid gap-2 lg:grid-cols-2">{modules.map(item=><CategoryButton key={item.id} item={item} onOpen={setPage}/>)}</div>
      {query&&modules.length===0&&<p className="mt-4 text-sm text-[var(--otto-muted)]">В экзаменационных модулях по этому запросу ничего не найдено.</p>}
    </section>

    {!query&&<section className="mt-4 rounded-[24px] border border-[var(--otto-line)] bg-[var(--otto-surface)] p-4 sm:p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--otto-petrol-soft)] text-[var(--otto-petrol-dark)]"><BookOpenCheck className="h-5 w-5"/></span><div><p className="text-xs font-[850] uppercase tracking-[.14em] text-[var(--otto-petrol-dark)]">Полезное</p><h2 className="text-lg font-bold" style={serifFont}>Ещё в OTTO</h2></div></div><div className="mt-3 grid gap-2 lg:grid-cols-2">{extra.map(({title,copy,Icon,onClick})=><button key={title} type="button" onClick={onClick} className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] p-3 text-left"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--otto-surface)] text-[var(--otto-petrol-dark)]"><Icon className="h-4 w-4"/></span><span className="min-w-0 flex-1"><strong className="block text-sm">{title}</strong><span className="mt-1 block text-xs leading-5 text-[var(--otto-muted)]">{copy}</span></span><ChevronRight className="h-4 w-4 text-[var(--otto-muted)]"/></button>)}</div></section>}
  </div>;
}