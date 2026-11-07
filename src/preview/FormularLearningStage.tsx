import { useMemo, useState, type ReactNode } from 'react';
import { useResetLearningStepScroll } from '@/preview/LearningStepScroll';
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { OttoScene } from '@/components/OttoScene';
import { GermanAudioButton, GermanLine, OttoError, SkipAction } from '@/preview/SchreibenPracticeTools';

type FieldStatus='correct'|'skipped'|'corrected';
type FormScreen='intro'|'vocab'|'form'|'result'|'complete';

type FormField={
  label:string;
  meaning:string;
  answer:string;
  hint:string;
  meaningOptions:string[];
  specialError?:'persons'|'children';
};

type FormLesson={
  id:number;
  title:string;
  situation:string;
  translation:string;
  fields:FormField[];
};

type FormProgress={
  screen:FormScreen;
  vocabIndex:number;
  currentForm:number;
  currentField:number;
  fieldPhase:'meaning'|'value';
  answers:Record<string,string>;
  statuses:Record<string,FieldStatus>;
  attempts:Record<string,number>;
  completed:number[];
};

const STORAGE_PREFIX='form_training_progress:';

const FIELD_WORDS=[
  ['Familienname','фамилия'],
  ['Vorname','имя'],
  ['Name','имя / фамилия в зависимости от поля'],
  ['Geburtsdatum','дата рождения'],
  ['Geburtsort','место рождения'],
  ['Adresse','адрес'],
  ['Straße','улица'],
  ['Hausnummer','номер дома'],
  ['PLZ / Postleitzahl','почтовый индекс'],
  ['Wohnort','место жительства'],
  ['Land','страна'],
  ['Telefonnummer','номер телефона'],
  ['E-Mail-Adresse','электронная почта'],
  ['Anzahl der Personen','количество человек'],
  ['Davon Kinder','сколько из них детей'],
  ['Kinder','дети'],
  ['Datum / Termin','дата'],
  ['Unterschrift','подпись'],
] as const;

const FORMS:FormLesson[]=[
  {
    id:1,
    title:'Бронирование поездки',
    situation:'Eva Kadavy wohnt in der Gartenstraße 12, 10115 Berlin. Sie reist mit ihrem Mann und zwei Kindern nach München.',
    translation:'Ева Кадави живёт по адресу Gartenstraße 12, 10115 Berlin. Она едет в Мюнхен с мужем и двумя детьми.',
    fields:[
      {label:'Familienname',meaning:'фамилия',answer:'Kadavy',hint:'Посмотри на имя Eva Kadavy. В поле Familienname нужна только фамилия.',meaningOptions:['фамилия','имя','город']},
      {label:'Anzahl der Personen',meaning:'общее количество людей',answer:'4',hint:'Нужно посчитать всех участников поездки: Eva, её муж и дети.',meaningOptions:['общее количество людей','только дети','номер дома'],specialError:'persons'},
      {label:'Davon Kinder',meaning:'сколько из них детей',answer:'2',hint:'Это не все участники. Ищи только количество детей.',meaningOptions:['сколько из них детей','общее количество людей','дата поездки'],specialError:'children'},
    ],
  },
  {
    id:2,
    title:'Гостиница',
    situation:'Thomas Berger kommt aus Köln. Er möchte mit seiner Frau vom 14. bis 16. Mai im Hotel bleiben. Seine Telefonnummer ist 0176 445566.',
    translation:'Томас Бергер из Кёльна. Он хочет остановиться в гостинице с женой с 14 по 16 мая. Его телефон: 0176 445566.',
    fields:[
      {label:'Familienname',meaning:'фамилия',answer:'Berger',hint:'Фамилия стоит после имени Thomas.',meaningOptions:['фамилия','имя','телефон']},
      {label:'Wohnort',meaning:'место жительства',answer:'Köln',hint:'Ищи город, откуда Томас.',meaningOptions:['место жительства','дата рождения','страна']},
      {label:'Telefonnummer',meaning:'номер телефона',answer:'0176 445566',hint:'Ищи последовательность цифр после слова Telefonnummer.',meaningOptions:['номер телефона','почтовый индекс','номер дома']},
    ],
  },
  {
    id:3,
    title:'Языковой курс',
    situation:'Sofia Petrova kommt aus Bulgarien und wohnt in Leipzig. Sie möchte ab 2. September einen Deutschkurs besuchen. Ihre E-Mail-Adresse ist sofia.petrova@mail.de.',
    translation:'София Петрова из Болгарии и живёт в Лейпциге. Она хочет посещать курс немецкого с 2 сентября. Её e-mail: sofia.petrova@mail.de.',
    fields:[
      {label:'Land',meaning:'страна',answer:'Bulgarien',hint:'Ищи страну после kommt aus.',meaningOptions:['страна','город','улица']},
      {label:'Wohnort',meaning:'место жительства',answer:'Leipzig',hint:'Ищи город после wohnt in.',meaningOptions:['место жительства','страна','дата']},
      {label:'E-Mail-Adresse',meaning:'электронная почта',answer:'sofia.petrova@mail.de',hint:'Ищи адрес с символом @.',meaningOptions:['электронная почта','телефон','индекс']},
    ],
  },
  {
    id:4,
    title:'Спортивный курс',
    situation:'Lukas Meyer, geboren am 12.05.1998, wohnt in Bonn. Er möchte ab 7. Oktober einen Schwimmkurs besuchen.',
    translation:'Лукас Майер, родился 12.05.1998, живёт в Бонне. Он хочет посещать курс плавания с 7 октября.',
    fields:[
      {label:'Familienname',meaning:'фамилия',answer:'Meyer',hint:'Фамилия стоит после имени Lukas.',meaningOptions:['фамилия','имя','город']},
      {label:'Geburtsdatum',meaning:'дата рождения',answer:'12.05.1998',hint:'Ищи дату после geboren am.',meaningOptions:['дата рождения','дата курса','номер телефона']},
      {label:'Wohnort',meaning:'место жительства',answer:'Bonn',hint:'Ищи город после wohnt in.',meaningOptions:['место жительства','страна','почтовый индекс']},
    ],
  },
  {
    id:5,
    title:'Регистрация в библиотеке',
    situation:'Amina Hassan wohnt in der Schillerstraße 8 in 60311 Frankfurt. Ihre Telefonnummer ist 069 778899.',
    translation:'Амина Хассан живёт по адресу Schillerstraße 8, 60311 Frankfurt. Её телефон: 069 778899.',
    fields:[
      {label:'Straße',meaning:'улица',answer:'Schillerstraße',hint:'В адресе сначала найдите название улицы.',meaningOptions:['улица','номер дома','город']},
      {label:'Hausnummer',meaning:'номер дома',answer:'8',hint:'Номер дома стоит сразу после названия улицы.',meaningOptions:['номер дома','индекс','телефон']},
      {label:'PLZ / Postleitzahl',meaning:'почтовый индекс',answer:'60311',hint:'Почтовый индекс — пятизначное число перед городом.',meaningOptions:['почтовый индекс','номер дома','дата рождения']},
    ],
  },
  {
    id:6,
    title:'Запись к врачу',
    situation:'Markus Klein ist am 03.11.1985 geboren. Er wohnt in Dresden und hat die Telefonnummer 0152 334455.',
    translation:'Маркус Кляйн родился 03.11.1985. Он живёт в Дрездене, телефон: 0152 334455.',
    fields:[
      {label:'Geburtsdatum',meaning:'дата рождения',answer:'03.11.1985',hint:'Ищи дату после ist ... geboren.',meaningOptions:['дата рождения','дата приёма','индекс']},
      {label:'Wohnort',meaning:'место жительства',answer:'Dresden',hint:'Ищи город после wohnt in.',meaningOptions:['место жительства','страна','улица']},
      {label:'Telefonnummer',meaning:'номер телефона',answer:'0152 334455',hint:'Ищи цифры после Telefonnummer.',meaningOptions:['номер телефона','номер дома','индекс']},
    ],
  },
  {
    id:7,
    title:'Туристическая экскурсия',
    situation:'Clara Wolf kommt aus Österreich. Sie besucht Berlin mit zwei Freunden. Die Führung ist am 18. Juni.',
    translation:'Клара Вольф из Австрии. Она посещает Берлин с двумя друзьями. Экскурсия 18 июня.',
    fields:[
      {label:'Land',meaning:'страна',answer:'Österreich',hint:'Ищи страну после kommt aus.',meaningOptions:['страна','город','дата']},
      {label:'Anzahl der Personen',meaning:'общее количество людей',answer:'3',hint:'Посчитай Clara и двух друзей.',meaningOptions:['общее количество людей','только друзей','дата']},
      {label:'Datum / Termin',meaning:'дата',answer:'18. Juni',hint:'Ищи дату экскурсии после am.',meaningOptions:['дата','номер телефона','город']},
    ],
  },
  {
    id:8,
    title:'Аренда автомобиля',
    situation:'Jan Novak wohnt in München. Er möchte vom 5. bis 8. August ein Auto mieten. Seine E-Mail-Adresse ist jan.novak@mail.de.',
    translation:'Ян Новак живёт в Мюнхене. Он хочет арендовать машину с 5 по 8 августа. E-mail: jan.novak@mail.de.',
    fields:[
      {label:'Familienname',meaning:'фамилия',answer:'Novak',hint:'Фамилия стоит после имени Jan.',meaningOptions:['фамилия','имя','город']},
      {label:'Wohnort',meaning:'место жительства',answer:'München',hint:'Ищи город после wohnt in.',meaningOptions:['место жительства','страна','дата']},
      {label:'E-Mail-Adresse',meaning:'электронная почта',answer:'jan.novak@mail.de',hint:'Ищи адрес с символом @.',meaningOptions:['электронная почта','телефон','индекс']},
    ],
  },
  {
    id:9,
    title:'Детский кружок',
    situation:'Mila Schmidt ist am 21.04.2017 in Hamburg geboren. Ihre Mutter möchte sie für einen Malkurs anmelden.',
    translation:'Мила Шмидт родилась 21.04.2017 в Гамбурге. Мама хочет записать её на курс рисования.',
    fields:[
      {label:'Vorname',meaning:'имя',answer:'Mila',hint:'Vorname — это имя ребёнка.',meaningOptions:['имя','фамилия','город']},
      {label:'Familienname',meaning:'фамилия',answer:'Schmidt',hint:'Фамилия стоит после имени Mila.',meaningOptions:['фамилия','имя','дата']},
      {label:'Geburtsort',meaning:'место рождения',answer:'Hamburg',hint:'Ищи место после in рядом с geboren.',meaningOptions:['место рождения','место жительства','страна']},
    ],
  },
  {
    id:10,
    title:'Заказ билетов',
    situation:'Linda Bauer möchte am 9. November mit ihrem Mann und einem Kind ein Konzert besuchen. Ihre E-Mail-Adresse ist linda.bauer@mail.de.',
    translation:'Линда Бауэр хочет 9 ноября посетить концерт с мужем и одним ребёнком. E-mail: linda.bauer@mail.de.',
    fields:[
      {label:'Datum / Termin',meaning:'дата',answer:'9. November',hint:'Ищи дату события после am.',meaningOptions:['дата','номер билета','индекс']},
      {label:'Anzahl der Personen',meaning:'общее количество людей',answer:'3',hint:'Посчитай Linda, мужа и ребёнка.',meaningOptions:['общее количество людей','только взрослых','только детей']},
      {label:'Davon Kinder',meaning:'сколько из них детей',answer:'1',hint:'Ищи только количество детей.',meaningOptions:['сколько из них детей','общее количество людей','номер дома']},
    ],
  },
  {
    id:11,
    title:'Регистрация на мероприятие',
    situation:'Nora Fischer wohnt in der Mozartstraße 15, 90402 Nürnberg. Sie möchte sich für die Veranstaltung am 4. Dezember anmelden.',
    translation:'Нора Фишер живёт по адресу Mozartstraße 15, 90402 Nürnberg. Она хочет зарегистрироваться на мероприятие 4 декабря.',
    fields:[
      {label:'Straße',meaning:'улица',answer:'Mozartstraße',hint:'Ищи название улицы в адресе.',meaningOptions:['улица','город','индекс']},
      {label:'Hausnummer',meaning:'номер дома',answer:'15',hint:'Ищи число после улицы.',meaningOptions:['номер дома','дата','телефон']},
      {label:'PLZ / Postleitzahl',meaning:'почтовый индекс',answer:'90402',hint:'Ищи пятизначное число перед городом.',meaningOptions:['почтовый индекс','номер дома','дата']},
    ],
  },
  {
    id:12,
    title:'Школа',
    situation:'Jonas Becker ist am 17.02.2018 in Mainz geboren. Er wohnt jetzt in Wiesbaden.',
    translation:'Йонас Беккер родился 17.02.2018 в Майнце. Сейчас живёт в Висбадене.',
    fields:[
      {label:'Vorname',meaning:'имя',answer:'Jonas',hint:'Ищи первое слово в имени.',meaningOptions:['имя','фамилия','город']},
      {label:'Geburtsdatum',meaning:'дата рождения',answer:'17.02.2018',hint:'Ищи дату рядом с geboren.',meaningOptions:['дата рождения','дата регистрации','индекс']},
      {label:'Wohnort',meaning:'место жительства',answer:'Wiesbaden',hint:'Ищи город после wohnt jetzt in.',meaningOptions:['место жительства','место рождения','страна']},
    ],
  },
  {
    id:13,
    title:'Работа / Ferienjob',
    situation:'Emilia Roth wohnt in Augsburg. Sie möchte im Juli in einem Café arbeiten. Ihre Telefonnummer ist 0821 667788.',
    translation:'Эмилия Рот живёт в Аугсбурге. Она хочет работать в кафе в июле. Телефон: 0821 667788.',
    fields:[
      {label:'Familienname',meaning:'фамилия',answer:'Roth',hint:'Ищи вторую часть имени Emilia Roth.',meaningOptions:['фамилия','имя','город']},
      {label:'Wohnort',meaning:'место жительства',answer:'Augsburg',hint:'Ищи город после wohnt in.',meaningOptions:['место жительства','страна','дата']},
      {label:'Telefonnummer',meaning:'номер телефона',answer:'0821 667788',hint:'Ищи цифры после Telefonnummer.',meaningOptions:['номер телефона','индекс','номер дома']},
    ],
  },
  {
    id:14,
    title:'Anmeldung / адрес',
    situation:'Omar Saleh zieht nach Berlin. Seine neue Adresse ist Lindenweg 22, 12047 Berlin. Er kommt aus Jordanien.',
    translation:'Омар Салех переезжает в Берлин. Его новый адрес: Lindenweg 22, 12047 Berlin. Он из Иордании.',
    fields:[
      {label:'Straße',meaning:'улица',answer:'Lindenweg',hint:'Ищи первое слово новой Adresse.',meaningOptions:['улица','город','страна']},
      {label:'PLZ / Postleitzahl',meaning:'почтовый индекс',answer:'12047',hint:'Ищи пятизначное число перед Berlin.',meaningOptions:['почтовый индекс','номер дома','телефон']},
      {label:'Land',meaning:'страна',answer:'Jordanien',hint:'Ищи страну после kommt aus.',meaningOptions:['страна','город','улица']},
    ],
  },
  {
    id:15,
    title:'Курс Volkshochschule',
    situation:'Elena García wohnt in Stuttgart. Sie möchte ab 10. Januar einen Deutschkurs an der Volkshochschule besuchen. Ihre E-Mail-Adresse ist elena.garcia@mail.de.',
    translation:'Елена Гарсия живёт в Штутгарте. Она хочет с 10 января посещать курс немецкого в Volkshochschule. E-mail: elena.garcia@mail.de.',
    fields:[
      {label:'Wohnort',meaning:'место жительства',answer:'Stuttgart',hint:'Ищи город после wohnt in.',meaningOptions:['место жительства','страна','место рождения']},
      {label:'Datum / Termin',meaning:'дата',answer:'10. Januar',hint:'Ищи дату после ab.',meaningOptions:['дата','индекс','телефон']},
      {label:'E-Mail-Adresse',meaning:'электронная почта',answer:'elena.garcia@mail.de',hint:'Ищи адрес с @.',meaningOptions:['электронная почта','номер телефона','адрес улицы']},
    ],
  },
];

function emptyProgress():FormProgress{
  return {screen:'intro',vocabIndex:0,currentForm:0,currentField:0,fieldPhase:'meaning',answers:{},statuses:{},attempts:{},completed:[]};
}

function readProgress(userId?:string):FormProgress{
  try{
    const raw=localStorage.getItem(STORAGE_PREFIX+(userId||'local'));
    if(!raw)return emptyProgress();
    const parsed=JSON.parse(raw) as Partial<FormProgress>;
    return {
      screen:['intro','vocab','form','result','complete'].includes(String(parsed.screen))?parsed.screen as FormScreen:'intro',
      vocabIndex:Number.isInteger(parsed.vocabIndex)?Math.max(0,Math.min(FIELD_WORDS.length-1,Number(parsed.vocabIndex))):0,
      currentForm:Number.isInteger(parsed.currentForm)?Math.max(0,Math.min(FORMS.length-1,Number(parsed.currentForm))):0,
      currentField:Number.isInteger(parsed.currentField)?Math.max(0,Math.min(2,Number(parsed.currentField))):0,
      fieldPhase:parsed.fieldPhase==='value'?'value':'meaning',
      answers:parsed.answers&&typeof parsed.answers==='object'?parsed.answers as Record<string,string>:{},
      statuses:parsed.statuses&&typeof parsed.statuses==='object'?parsed.statuses as Record<string,FieldStatus>:{},
      attempts:parsed.attempts&&typeof parsed.attempts==='object'?parsed.attempts as Record<string,number>:{},
      completed:Array.isArray(parsed.completed)?parsed.completed.filter(v=>Number.isInteger(v)&&v>=0&&v<FORMS.length):[],
    };
  }catch{return emptyProgress()}
}

function saveProgress(progress:FormProgress,userId?:string){
  try{localStorage.setItem(STORAGE_PREFIX+(userId||'local'),JSON.stringify(progress))}catch{}
}

function normalize(value:string){
  return value.toLocaleLowerCase('de-DE').replace(/[.,;:]/g,'').replace(/\s+/g,' ').trim();
}

function Card({children}:{children:ReactNode}){
  return <section className="rounded-[28px] border border-white/90 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,.08)] sm:p-8">{children}</section>;
}

function OttoBubble({children}:{children:ReactNode}){
  return <div className="flex items-start gap-3">
    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-teal-100 bg-teal-50"><OttoScene scene="schreiben" eager className="h-full w-full object-contain"/></div>
    <div className="min-w-0 flex-1 rounded-[22px] border border-teal-100 bg-teal-50/70 p-4 text-slate-800"><p className="text-xs font-black uppercase tracking-[.12em] text-teal-700">OTTO</p><div className="mt-2 leading-7">{children}</div></div>
  </div>;
}

function splitSituationSentences(text:string){
  return text.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])/u).map(value=>value.trim()).filter(Boolean);
}

function SituationCard({form,showTranslation=true}:{form:FormLesson;showTranslation?:boolean}){
  return <div className={showTranslation?'grid gap-4 lg:grid-cols-[1.1fr_.9fr]':'grid gap-4'}>
    <section className="rounded-[24px] border border-slate-200 bg-[#fffefa] p-5 sm:p-6"><p className="text-xs font-black uppercase tracking-[.14em] text-slate-500">Ситуация</p><div className="mt-4 space-y-3">{splitSituationSentences(form.situation).map((sentence,index)=><GermanLine key={index} text={sentence} className="text-[17px] font-semibold leading-8 text-slate-950"/>)}</div></section>
    {showTranslation&&<section className="rounded-[24px] border border-sky-200 bg-sky-50 p-5 sm:p-6"><p className="text-xs font-black uppercase tracking-[.14em] text-sky-700">🇷🇺 Перевод</p><p className="mt-3 whitespace-pre-line text-[16px] leading-7 text-slate-800">{form.translation}</p></section>}
  </div>;
}

function FormSituationOverlay({form,onReturn}:{form:FormLesson;onReturn:()=>void}){
  return <div className="fixed inset-0 z-[170] overflow-y-auto bg-slate-950/50 p-3 sm:p-6">
    <div className="mx-auto w-full max-w-[980px] rounded-[28px] bg-white p-5 shadow-2xl sm:p-8">
      <p className="otto-kicker">СПРАВОЧНЫЙ ПРОСМОТР</p>
      <h2 className="mt-1 text-3xl font-black text-slate-950">Исходная ситуация</h2>
      <div className="mt-6"><SituationCard form={form}/></div>
      <div className="mt-6 flex justify-end"><button type="button" onClick={onReturn} className="min-h-12 rounded-xl bg-slate-900 px-5 font-black text-white">Вернуться к полю</button></div>
    </div>
  </div>;
}

function fieldError(field:FormField,value:string){
  if(field.specialError==='persons'){
    return 'Здесь спрашивают об общем количестве людей. В тексте указаны Eva, её муж и двое детей. Посчитай всех вместе.';
  }
  if(field.specialError==='children'){
    return 'Здесь спрашивают не обо всех участниках, а только о детях. В тексте сказано, что детей двое.';
  }
  const v=normalize(value);
  const answer=normalize(field.answer);
  if(v&&answer.includes(v))return 'Ты нашёл нужный фрагмент, но значение пока неполное. '+field.hint;
  return 'Проверь, что означает поле «'+field.label+'». '+field.hint+' Не переписывай всю ситуацию — перенеси только нужное значение.';
}

function WorkingForm({form,progress}:{form:FormLesson;progress:FormProgress}){
  return <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <p className="text-xs font-black uppercase tracking-[.14em] text-slate-500">Формуляр</p>
    <div className="mt-4 space-y-3">{form.fields.map((item,index)=>{
      const itemKey=String(progress.currentForm)+':'+String(index);
      const status=progress.statuses[itemKey];
      const value=progress.answers[itemKey]||'';
      const current=index===progress.currentField;
      return <div key={item.label} className={current?'grid gap-2 rounded-2xl border-2 border-teal-400 bg-teal-50 p-4 sm:grid-cols-[220px_1fr] sm:items-center':'grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[220px_1fr] sm:items-center'}><GermanLine text={item.label} className="font-black text-slate-950"/><div className="min-h-8 rounded-lg border-b-2 border-slate-300 px-2 py-1 font-bold text-slate-800">{value||<span className="font-normal text-slate-400">________________</span>}{status==='skipped'&&<span className="ml-2 text-xs font-black text-slate-500">пропущено</span>}</div></div>;
    })}</div>
  </section>;
}

function ResultForm({form,progress}:{form:FormLesson;progress:FormProgress}){
  return <section className="rounded-[24px] border border-slate-200 bg-[#fffefa] p-5 sm:p-6">
    <p className="text-xs font-black uppercase tracking-[.14em] text-slate-500">Заполненный формуляр</p>
    <div className="mt-4 space-y-3">{form.fields.map((field,index)=>{
      const key=String(progress.currentForm)+':'+String(index);
      const status=progress.statuses[key];
      const value=status==='skipped'?field.answer:(progress.answers[key]||field.answer);
      return <div key={field.label} className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[220px_1fr_auto] sm:items-center"><GermanLine text={field.label} className="font-black text-slate-950"/><span className="font-bold text-slate-800">{value}</span><span className={status==='skipped'?'text-sm font-black text-slate-500':status==='corrected'?'text-sm font-black text-amber-700':'text-sm font-black text-emerald-700'}>{status==='skipped'?'Пропущено':status==='corrected'?'Исправлено ✓':'Правильно ✓'}</span></div>;
    })}</div>
  </section>;
}

export function FormularLearningStage({
  userId,
  onBack,
  onLetters,
  onOpenRealSchreiben,
}:{
  userId?:string;
  onBack:()=>void;
  onLetters:()=>void;
  onOpenRealSchreiben:()=>void;
}){
  const initial=readProgress(userId);
  const[progress,setProgress]=useState<FormProgress>(initial);
  const[showResume,setShowResume]=useState(initial.screen==='form'||initial.screen==='result');
  const[showSituation,setShowSituation]=useState(false);
  const[returnToForm,setReturnToForm]=useState<number|null>(null);
  const[returnToField,setReturnToField]=useState<number|null>(null);
  const[meaningChoice,setMeaningChoice]=useState('');
  const[meaningResult,setMeaningResult]=useState<boolean|null>(null);
  const[value,setValue]=useState('');
  const[valueError,setValueError]=useState('');
  const[showHelp,setShowHelp]=useState(false);
  useResetLearningStepScroll(`formular:${progress.screen}:${progress.currentForm}:${progress.currentField}:${progress.fieldPhase}`);

  const persist=(next:FormProgress)=>{setProgress(next);saveProgress(next,userId)};
  const form=FORMS[progress.currentForm];
  const field=form.fields[progress.currentField];
  const key=String(progress.currentForm)+':'+String(progress.currentField);
  const detailed=progress.currentForm===0;
  const guided=progress.currentForm<5;
  const independent=progress.currentForm>=5;

  const resetFieldUi=()=>{setMeaningChoice('');setMeaningResult(null);setValue('');setValueError('');setShowHelp(false)};

  const start=()=>{persist({...progress,screen:'vocab',vocabIndex:0});};
  const nextVocab=()=>{
    if(progress.vocabIndex>=FIELD_WORDS.length-1){persist({...progress,screen:'form',currentForm:0,currentField:0,fieldPhase:'meaning'});resetFieldUi();return}
    persist({...progress,vocabIndex:progress.vocabIndex+1});
  };

  const openSituation=()=>{setReturnToForm(progress.currentForm);setReturnToField(progress.currentField);setShowSituation(true)};
  const returnSituation=()=>{
    if(returnToForm!==null||returnToField!==null){
      persist({...progress,currentForm:returnToForm??progress.currentForm,currentField:returnToField??progress.currentField});
    }
    setShowSituation(false);
  };

  const advanceField=(status:FieldStatus,answerValue:string)=>{
    const statuses={...progress.statuses,[key]:status};
    const answers={...progress.answers,[key]:answerValue};
    if(progress.currentField>=form.fields.length-1){
      const completed=progress.completed.includes(progress.currentForm)?progress.completed:[...progress.completed,progress.currentForm];
      persist({...progress,screen:'result',statuses,answers,completed,fieldPhase:'meaning'});
      resetFieldUi();
      return;
    }
    persist({...progress,currentField:progress.currentField+1,fieldPhase:'meaning',statuses,answers});
    resetFieldUi();
  };

  const checkMeaning=()=>{
    if(!meaningChoice)return;
    if(meaningChoice===field.meaning){setMeaningResult(true);persist({...progress,fieldPhase:'value'});return}
    setMeaningResult(false);
  };

  const checkValue=()=>{
    if(!value.trim())return;
    if(normalize(value)===normalize(field.answer)){
      const attempts=progress.attempts[key]||0;
      advanceField(attempts>0?'corrected':'correct',value.trim());
      return;
    }
    const attempts={...progress.attempts,[key]:(progress.attempts[key]||0)+1};
    persist({...progress,attempts});
    setValueError(fieldError(field,value));
  };

  const skipField=()=>advanceField('skipped',field.answer);

  const nextForm=()=>{
    if(progress.currentForm>=FORMS.length-1){persist({...progress,screen:'complete'});return}
    persist({...progress,screen:'form',currentForm:progress.currentForm+1,currentField:0,fieldPhase:'meaning'});
    resetFieldUi();
  };

  const repeatForm=()=>{
    const prefix=String(progress.currentForm)+':';
    const statuses=Object.fromEntries(Object.entries(progress.statuses).filter(([k])=>!k.startsWith(prefix)));
    const answers=Object.fromEntries(Object.entries(progress.answers).filter(([k])=>!k.startsWith(prefix)));
    const attempts=Object.fromEntries(Object.entries(progress.attempts).filter(([k])=>!k.startsWith(prefix)));
    persist({...progress,screen:'form',currentField:0,fieldPhase:'meaning',statuses,answers,attempts});
    resetFieldUi();
  };

  const restartForms=()=>{persist({...emptyProgress(),screen:'vocab'});setShowResume(false);resetFieldUi()};

  if(progress.screen==='intro'){
    return <section className="mx-auto min-h-[calc(100dvh-180px)] w-full max-w-[1080px] py-2 sm:py-5"><Card><p className="otto-kicker">SCHREIBEN · ШАГ 2</p><h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Учимся заполнять формуляр</h1><div className="mt-6"><OttoBubble><p>В первой части Schreiben вам могут дать короткую ситуацию и формуляр с пропущенными данными.</p><p className="mt-3">Ваша задача — найти нужную информацию в тексте и правильно перенести её в соответствующие поля.</p><p className="mt-3">Сначала разберём один пример вместе, а потом вы попробуете самостоятельно.</p></OttoBubble></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><button type="button" onClick={start} className="min-h-12 rounded-xl bg-slate-900 px-5 font-black text-white">Начать</button><button type="button" onClick={onLetters} className="min-h-12 rounded-xl border bg-white px-5 font-bold text-slate-900">Я это умею — перейти к письмам</button></div></Card></section>;
  }

  if(progress.screen==='vocab'){
    const [de,ru]=FIELD_WORDS[progress.vocabIndex];
    return <section className="mx-auto min-h-[calc(100dvh-180px)] w-full max-w-[900px] py-2 sm:py-5"><div className="mb-4 flex items-center gap-2"><button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 font-bold"><ArrowLeft className="h-4 w-4"/>Назад</button><span className="ml-auto rounded-full border bg-white px-3 py-2 text-xs font-bold text-slate-500">Термины · {progress.vocabIndex+1} из {FIELD_WORDS.length}</span></div><Card><p className="otto-kicker">СЛОВА ФОРМУЛЯРА</p><div className="mt-6"><GermanLine text={de} className="text-4xl font-black text-slate-950"/></div><p className="mt-4 text-xl font-bold text-slate-600">{ru}</p>{de==='PLZ / Postleitzahl'&&<OttoBubble><p>Это почтовый индекс. Например: <b>PLZ: 10115</b>.</p></OttoBubble>}{de==='Anzahl der Personen'&&<OttoBubble><p>Это количество всех людей. Нужно посчитать всех участников вместе.</p></OttoBubble>}{de==='Davon Kinder'&&<OttoBubble><p>Это сколько из общего количества составляют дети.</p></OttoBubble>}<div className="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" onClick={nextVocab} className="min-h-12 rounded-xl border bg-white px-5 font-bold text-slate-900">Я это знаю</button><button type="button" onClick={nextVocab} className="min-h-12 rounded-xl bg-slate-900 px-5 font-black text-white">Далее <ArrowRight className="ml-2 inline h-4 w-4"/></button></div></Card></section>;
  }

  if(showResume&&(progress.screen==='form'||progress.screen==='result')){
    return <section className="mx-auto min-h-[calc(100dvh-180px)] w-full max-w-[900px] py-2 sm:py-5"><Card><p className="otto-kicker">ФОРМУЛЯРЫ · {progress.currentForm+1} ИЗ 15</p><h1 className="mt-2 text-3xl font-black text-slate-950">Продолжить с формуляра {progress.currentForm+1}</h1><p className="mt-3 text-slate-600">Учебный progress формуляров сохранён отдельно от экзаменационного.</p><div className="mt-6 grid gap-3 sm:grid-cols-3"><button type="button" onClick={()=>setShowResume(false)} className="min-h-12 rounded-xl bg-slate-900 px-5 font-black text-white">Продолжить</button><button type="button" onClick={restartForms} className="min-h-12 rounded-xl border bg-white px-5 font-bold">Начать формуляры заново</button><button type="button" onClick={onLetters} className="min-h-12 rounded-xl border border-teal-200 bg-teal-50 px-5 font-bold text-teal-900">Перейти к письмам</button></div></Card></section>;
  }

  if(progress.screen==='result'){
    return <section className="mx-auto min-h-[calc(100dvh-180px)] w-full max-w-[1080px] py-2 sm:py-5"><Card><CheckCircle2 className="h-12 w-12 text-emerald-600"/><h1 className="mt-3 text-3xl font-black text-slate-950">Формуляр заполнен ✓</h1><p className="mt-2 text-slate-600">Формуляры · {progress.currentForm+1} из 15</p><div className="mt-5"><ResultForm form={form} progress={progress}/></div><div className="mt-3"><button type="button" onClick={openSituation} className="min-h-10 rounded-xl border border-sky-200 bg-white px-3 text-sm font-bold text-sky-900">📄 Посмотреть ситуацию</button></div><div className="mt-6 grid grid-cols-2 gap-2 pb-20"><button type="button" onClick={()=>{persist({...progress,screen:'form',currentField:form.fields.length-1});setShowResume(false)}} className="min-h-12 rounded-xl border bg-white px-2 font-bold">Назад</button><button type="button" onClick={nextForm} className="min-h-12 rounded-xl bg-slate-900 px-2 font-black text-white">Далее <ArrowRight className="ml-1 inline h-4 w-4"/></button></div><div className="mt-3"><button type="button" onClick={repeatForm} className="min-h-11 rounded-xl border bg-white px-4 text-sm font-bold">Повторить формуляр</button></div></Card>{showSituation&&<FormSituationOverlay form={form} onReturn={returnSituation}/>}</section>;
  }

  if(progress.screen==='complete'){
    return <section className="mx-auto min-h-[calc(100dvh-180px)] w-full max-w-[960px] py-2 sm:py-5"><Card><CheckCircle2 className="h-14 w-14 text-emerald-600"/><h1 className="mt-3 text-4xl font-black text-slate-950">С формуляром разобрались ✓</h1><div className="mt-5"><OttoBubble><p>Теперь вы умеете понимать названия полей и находить нужные данные в тексте.</p></OttoBubble></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" onClick={onLetters} className="min-h-12 rounded-xl bg-slate-900 px-5 font-black text-white">Шаг 3. Учимся писать письмо</button><button type="button" onClick={restartForms} className="min-h-12 rounded-xl border bg-white px-5 font-bold">Повторить формуляры</button></div></Card></section>;
  }

  const showMeaning=guided&&progress.fieldPhase==='meaning';
  const backField=()=>{if(progress.currentField>0){persist({...progress,currentField:progress.currentField-1,fieldPhase:'meaning'});resetFieldUi()}else if(progress.currentForm>0){persist({...progress,currentForm:progress.currentForm-1,currentField:FORMS[progress.currentForm-1].fields.length-1,fieldPhase:'meaning'});resetFieldUi()}else onBack()};
  return <><section className="mx-auto min-h-[calc(100dvh-180px)] w-full max-w-[1080px] overflow-x-hidden py-2 sm:py-5">
    
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="otto-kicker">ФОРМУЛЯРЫ · {progress.currentForm+1} ИЗ 15</p><h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">{form.title}</h1></div><div className="rounded-full border bg-white px-3 py-2 text-xs font-bold text-slate-500">Поле {progress.currentField+1} из {form.fields.length}</div></div>
    <div className="mb-3 flex justify-start"><button type="button" onClick={openSituation} className="min-h-10 rounded-xl border border-sky-200 bg-white px-3 text-sm font-bold text-sky-900">📄 Посмотреть ситуацию</button></div><div className="mb-5"><WorkingForm form={form} progress={progress}/></div>
    <Card>
      {detailed&&<div className="mb-5"><OttoBubble><p><b>Сначала поймём название поля.</b> Потом найдём нужную информацию в ситуации и перенесём только это значение.</p></OttoBubble></div>}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-[.12em] text-slate-500">Поле формуляра</p><div className="mt-2"><GermanLine text={field.label} className="text-2xl font-black text-slate-950"/></div></div>

      {showMeaning?<div className="mt-5"><h2 className="text-xl font-black text-slate-950">Что означает «{field.label}»?</h2><div className="mt-4 grid gap-3">{field.meaningOptions.map(option=><button type="button" key={option} disabled={meaningResult===true} onClick={()=>setMeaningChoice(option)} className={meaningChoice===option?'min-h-12 rounded-xl border-2 border-teal-500 bg-teal-50 px-4 text-left font-bold':'min-h-12 rounded-xl border-2 border-slate-200 bg-white px-4 text-left font-bold'}>{option}</button>)}</div>{meaningResult===false&&<OttoError text={'Посмотри на название поля ещё раз. «'+field.label+'» означает: '+field.meaning+'. Теперь выбери этот смысл и продолжим.'} onRetry={()=>{setMeaningChoice('');setMeaningResult(null)}}/>}{meaningResult!==true&&<div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]"><button type="button" disabled={!meaningChoice} onClick={checkMeaning} className="min-h-12 rounded-xl bg-slate-900 px-5 font-black text-white disabled:opacity-40">Проверить</button><SkipAction onSkip={skipField}/></div>}</div>:
      <div className="mt-5">
        {(detailed||showHelp)&&<OttoBubble><p><b>{field.label}</b> — {field.meaning}. {field.hint}</p></OttoBubble>}
        {independent&&!showHelp&&<button type="button" onClick={()=>setShowHelp(true)} className="mb-4 min-h-10 rounded-xl border border-teal-200 bg-teal-50 px-4 text-sm font-bold text-teal-900">Помощь OTTO</button>}
        <label className="block text-sm font-black text-slate-600" htmlFor="form-value">Впишите значение</label><input id="form-value" value={value} onChange={event=>{setValue(event.target.value);setValueError('')}} className="mt-2 min-h-14 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-lg outline-none focus:border-teal-500" placeholder="Только нужное значение"/>
        {valueError&&<OttoError text={valueError} onRetry={()=>setValueError('')}/>}
        {!valueError&&<div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]"><button type="button" disabled={!value.trim()} onClick={checkValue} className="min-h-12 rounded-xl bg-slate-900 px-5 font-black text-white disabled:opacity-40">Проверить</button><SkipAction onSkip={skipField}/></div>}
      </div>}
    </Card>
    <div className="mt-5 grid grid-cols-2 gap-2 pb-20"><button type="button" onClick={backField} className="min-h-12 min-w-0 rounded-xl border bg-white px-2 font-bold"><ArrowLeft className="mr-1 inline h-4 w-4"/>Назад</button><button type="button" disabled className="min-h-12 min-w-0 rounded-xl bg-slate-100 px-2 font-bold text-slate-500" title="Сначала проверьте ответ или выберите Пропустить">Далее <ArrowRight className="ml-1 inline h-4 w-4"/></button></div>
  </section>{showSituation&&<FormSituationOverlay form={form} onReturn={returnSituation}/>}</>;
}
