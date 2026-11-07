import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Volume2, X } from 'lucide-react';
import { OttoScene } from '@/components/OttoScene';
import { InlineTranslation } from '@/preview/LearningTranslation';
import { CompactTranslationEye } from '@/components/common/CompactTranslationEye';
import { VisibleRussianTranslation } from '@/preview/LearningLanguageTools';

export type TaskSnapshot={
  title?:string;
  body:string;
  points:string[];
  translation:string;
  translationPoints:string[];
};

export function speakGerman(text:string){
  const clean=text.replace(/\s+/g,' ').trim();
  if(!clean||/[А-Яа-яЁё]/.test(clean))return;
  const api=(window as Window&{OttoSpeech?:{play?:(value:string,options?:{mode?:'normal'|'slow'})=>Promise<boolean>}}).OttoSpeech;
  if(api?.play)void api.play(clean,{mode:'normal'});
}

export function GermanAudioButton({text,label='Прослушать'}:{text:string;label?:string}){
  return <button type="button" onClick={()=>speakGerman(text)} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-teal-200 bg-white px-3 text-sm font-bold text-teal-800" aria-label={label+' '+text}><Volume2 className="h-4 w-4"/><span>{label}</span></button>;
}

const KNOWN_LETTER_TRANSLATIONS:Record<string,string>={
  "Liebe Anna,":"Дорогая Анна!",
  "Sehr geehrte Damen und Herren,":"Уважаемые дамы и господа!",
  "Lieber Stefan,":"Дорогой Штефан!",
  "Lieber Markus,":"Дорогой Маркус!",
  "Sehr geehrte Frau Schneider,":"Уважаемая госпожа Шнайдер!",
  "Liebe Monika,":"Дорогая Моника!",
  "Sehr geehrter Herr Hoffmann,":"Уважаемый господин Хоффман!",
  "Liebe Anna, lieber Tobias,":"Дорогие Анна и Тобиас!",
  "Lieber Daniel,":"Дорогой Даниэль!",
  "Sehr geehrte Frau Berger,":"Уважаемая госпожа Бергер!",
  "Liebe Freunde,":"Дорогие друзья!",
  "ich möchte dich am Wochenende besuchen.":"Я хочу навестить тебя на выходных.",
  "Ich komme mit dem Auto.":"Я приеду на машине.",
  "Ich möchte zusammen im Park spazieren gehen.":"Я хочу, чтобы мы вместе погуляли в парке.",
  "Liebe Grüße":"С любовью,",
  "Mit freundlichen Grüßen":"С уважением,",
  "Ich möchte einen Tenniskurs besuchen.":"Я хочу записаться на курсы тенниса.",
  "An welchen Tagen findet der Kurs statt?":"В какие дни проходят занятия?",
  "Wie viel kostet der Kurs?":"Сколько стоят занятия?",
  "Ich möchte am Samstag kommen.":"Я хочу приехать в субботу.",
  "Ich komme mit dem Zug.":"Я приеду на поезде.",
  "Ich möchte mit dir Bremen besichtigen.":"Я хочу вместе с тобой посмотреть Бремен.",
  "Meine Tochter Emma ist krank.":"Моя дочь Эмма заболела.",
  "Sie fehlt vom 3. bis 6. März.":"Её не будет с 3 по 6 марта.",
  "Können Sie mir bitte die Hausaufgaben schicken?":"Не могли бы вы прислать мне домашние задания?",
  "Ich möchte im September Hamburg besuchen.":"Я хочу приехать в Гамбург в сентябре.",
  "Können Sie mir Informationen über Museen und Konzerte schicken?":"Не могли бы вы прислать информацию о музеях и концертах?",
  "Können Sie mir bitte Hoteladressen schicken?":"Не могли бы вы прислать адреса гостиниц?",
  "Kannst du mir bitte helfen?":"Можешь мне помочь, пожалуйста?",
  "Wann hast du Zeit?":"Когда у тебя будет время?",
  "Wo können wir uns treffen?":"Где мы можем встретиться?",
  "Vielen Dank für die Einladung.":"Большое спасибо за приглашение.",
  "Leider kann ich nicht kommen.":"К сожалению, я не смогу прийти.",
  "Am Wochenende muss ich arbeiten.":"В выходные мне нужно работать.",
  "Ich möchte einen Fotokurs besuchen.":"Я хочу записаться на курсы фотографии.",
  "Wann beginnt der Kurs?":"Когда начинаются занятия?",
  "Leider muss ich im Juli nach Köln fahren.":"К сожалению, в июле мне нужно ехать в Кёльн.",
  "Können wir uns im August treffen?":"Можем встретиться в августе?",
  "Im August habe ich Geburtstag.":"В августе у меня день рождения.",
  "Ich möchte den Fernseher kaufen.":"Я хочу купить этот телевизор.",
  "Wie viel kostet der Fernseher?":"Сколько стоит телевизор?",
  "Wann kann ich den Fernseher abholen?":"Когда я могу забрать телевизор?",
  "Ich möchte euch zu meinem Geburtstag einladen.":"Я хочу пригласить вас на свой день рождения.",
  "Die Party ist am Samstag um 18 Uhr.":"Вечеринка будет в субботу в 18:00.",
  "Ihr könnt mit dem Bus kommen.":"Вы можете приехать на автобусе.",
  "Ich möchte im Sommer in Ihrem Café arbeiten.":"Я хотел(а) бы летом работать в вашем кафе.",
  "Ich kann im Juli und August arbeiten.":"Я могу работать в июле и августе.",
  "Wie hoch ist der Lohn?":"Какая оплата труда?",
  "Es tut mir leid, ich muss am Sonntag arbeiten.":"Извини, мне нужно работать в воскресенье.",
  "Können wir uns am Montag treffen?":"Можем встретиться в понедельник?",
  "Möchtest du mit mir Kaffee trinken?":"Хочешь выпить со мной кофе?",
  "Ich möchte ein Auto mieten.":"Я хочу арендовать автомобиль.",
  "Ich brauche das Auto für drei Tage.":"Мне нужна машина на три дня.",
  "Wie viel kostet das?":"Сколько это стоит?",
  "Ich komme am Mittwoch später.":"В среду я приду немного позже.",
  "Kann ich Ihnen helfen?":"Я могу вам чем-нибудь помочь?",
  "Ich habe Geburtstag und mache eine Grillparty.":"У меня день рождения, и я устраиваю вечеринку с шашлыками.",
  "Bringt bitte Salat und Getränke mit.":"Принесите, пожалуйста, салат и напитки.",
};

/** A full, human-reviewed translation of the fixed example-letter text.
 * Return undefined for any unknown sentence instead of guessing.
 * The person's signature is copied unchanged. */
export function reviewedTrainingLetterTranslation(lines:readonly string[]):string|undefined{
  if(lines.length<6)return undefined;
  const result:string[]=[];
  for(let i=0;i<lines.length;i++){
    const raw=lines[i].trim();
    const capitalized=raw?raw[0].toUpperCase()+raw.slice(1):raw;
    const translated=KNOWN_LETTER_TRANSLATIONS[raw]??KNOWN_LETTER_TRANSLATIONS[capitalized];
    if(translated)result.push(translated);
    else if(i===lines.length-1)result.push(raw==='Name'?'Имя':raw);
    else return undefined;
  }
  return [result[0],'',...result.slice(1,-2),'',...result.slice(-2)].join('\n');
}

const KNOWN_EXAM_TRANSLATIONS:Record<string,string>={
  'Sie möchten Ihre Freundin Anna am Wochenende besuchen.':'Вы хотите на выходных навестить свою подругу Анну.',
  'Sie möchten mit dem Auto kommen und zusammen im Park spazieren gehen.':'Вы хотите приехать на машине и вместе погулять в парке.',
  'Schreiben Sie Anna eine E-Mail.':'Напишите Анне электронное письмо.',
};

/** The completed teaching letter has one audio action and one full translation. */
export function CompletedSchreibenLetter({lines}:{lines:readonly string[]}){
  const fullLetter=lines.join('\n');
  return <div className="grid min-w-0 gap-4">
    <section className="min-w-0 rounded-[24px] border border-slate-200 bg-[#fffefa] p-4 sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">ГОТОВОЕ ПИСЬМО</p>
      <div lang="de" className="mt-4 min-w-0 break-words text-[17px] leading-8 text-slate-950">
        <p className="font-black">{lines[0]}</p>
        <div className="mt-4 space-y-2">{lines.slice(1,-2).map((line,index)=><p key={index}>{line}</p>)}</div>
        <p className="mt-5 font-black">{lines[lines.length-2]}</p>
        <p className="font-black">{lines[lines.length-1]}</p>
      </div>
      <div className="mt-5"><GermanAudioButton text={fullLetter} label="Прослушать письмо"/></div>
    </section>
    <section className="min-w-0 rounded-[24px] border border-teal-200 bg-teal-50 p-4 sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-800">🇷🇺 Полный перевод письма</p>
      <div className="mt-3 min-w-0 break-words"><AutoRussianTranslation text={fullLetter} preset={reviewedTrainingLetterTranslation(lines)}/></div>
    </section>
  </div>;
}

export function GermanLine({text,className='',audioLabel='',showTranslation=true}:{text:string;className?:string;audioLabel?:string;showTranslation?:boolean}){
  return <div className="min-w-0">
    <div className="flex items-start gap-2">
      <div className={'min-w-0 flex-1 '+className}>{text}</div>
      <button type="button" onClick={()=>speakGerman(text)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-teal-200 bg-white text-teal-800" aria-label={(audioLabel||'Прослушать')+' '+text}><Volume2 className="h-4 w-4"/></button>
      {!showTranslation&&<CompactTranslationEye parts={[text]} title="Перевод"/>}
    </div>
    {showTranslation&&((KNOWN_LETTER_TRANSLATIONS[text]||KNOWN_EXAM_TRANSLATIONS[text])
      ?<div className="mt-1 text-sm leading-6 text-slate-600">{KNOWN_LETTER_TRANSLATIONS[text]||KNOWN_EXAM_TRANSLATIONS[text]}</div>
      :<InlineTranslation text={text} className="mt-1 text-sm leading-6 text-slate-600"/>)}
  </div>;
}

function looksGerman(line:string){
  if(!/[A-Za-zÄÖÜäöüß]/.test(line))return false;
  if(/[А-Яа-яЁё]/.test(line))return false;
  return true;
}

export function GermanFragments({text}:{text:string}){
  // Line wrapping in exam source material is typographic, not a sentence boundary.
  // Translate and speak complete sentences rather than fragments such as
  // "Sie möchten Ihre Freundin Anna" / "am Wochenende besuchen."
  const fragments=[...new Set(text.split(/\n{2,}/).flatMap(paragraph=>{
    const complete=paragraph.replace(/-\n(?=[A-Za-zÄÖÜäöüß])/g,'-').replace(/\n+/g,' ').replace(/\s+/g,' ').trim();
    if(!looksGerman(complete))return [];
    return (complete.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g)??[])
      .map(sentence=>sentence.trim()).filter(Boolean);
  }))];
  if(!fragments.length)return null;
  return <div className="mt-3 space-y-2">{fragments.map((fragment,index)=><div key={fragment+index} className="rounded-xl border border-teal-100 bg-white p-3"><GermanLine text={fragment} className="font-semibold text-slate-900"/></div>)}</div>;
}

export function AutoRussianTranslation({text,preset}:{text:string;preset?:string}){
  return <VisibleRussianTranslation text={text} preset={preset}/>;
}

/** Shared visual layout for training letters; the real solo exam is not changed. */
export function SchreibenTaskOverview({body,points,translation,explanations,conciseTranslation=false}:{body:string;points:readonly string[];translation:string;explanations:readonly string[];conciseTranslation?:boolean}){
  return <div className="space-y-3">
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">ЭКЗАМЕНАЦИОННОЕ ЗАДАНИЕ</p>
      <p lang="de" className="mt-3 whitespace-pre-line text-base font-semibold leading-7 text-slate-950">{body}</p>
    </section>
    <section className="rounded-2xl border border-teal-100 bg-teal-50 p-4 sm:p-5">
      <p className="text-xs font-black uppercase tracking-wider text-teal-800">🇷🇺 ПЕРЕВОД</p>
      <p className="mt-2 whitespace-pre-line text-base leading-7 text-slate-800">{translation}</p>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <p lang="de" className="font-black text-slate-900">Schreiben Sie:</p>
      <ul className="mt-3 space-y-3">{points.map((point,index)=><li key={index} className="flex items-start gap-2"><span className="text-teal-700">•</span><span lang="de" className="flex-1 font-semibold leading-7 text-slate-900">{point}</span><GermanAudioButton text={point} label="Прослушать пункт"/></li>)}</ul>
    </section>
    <section className="rounded-2xl border border-teal-100 bg-teal-50 p-4 sm:p-5">
      <p className="text-xs font-black uppercase tracking-wider text-teal-800">{conciseTranslation?'🇷🇺 ПЕРЕВОД ПУНКТОВ':'🇷🇺 НАПИШИТЕ'}</p>
      <ul className="mt-3 space-y-2">{explanations.map((text,index)=><li key={index} className="flex gap-2 text-base leading-6 text-slate-800"><span>•</span><span>{text}</span></li>)}</ul>
    </section>
  </div>;
}

export function AssignmentOverlay({
  snapshot,
  onReturn,
  onRestartExplanations,
  onReal,
}:{
  snapshot:TaskSnapshot;
  onReturn:()=>void;
  onRestartExplanations:()=>void;
  onReal:()=>void;
}){
  return <div className="fixed inset-0 z-[160] overflow-y-auto bg-slate-950/50 p-3 sm:p-6">
    <div className="mx-auto w-full max-w-[980px] rounded-[28px] bg-white p-5 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div><p className="otto-kicker">СПРАВОЧНЫЙ ПРОСМОТР</p><h2 className="mt-1 text-3xl font-black text-slate-950">Исходное задание</h2>{snapshot.title&&<p className="mt-1 text-sm font-bold text-slate-500">{snapshot.title}</p>}</div>
        <button type="button" onClick={onReturn} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-300 bg-white" aria-label="Вернуться к заданию"><X className="h-5 w-5"/></button>
      </div>
      <div className="mt-6"><SchreibenTaskOverview body={snapshot.body} points={snapshot.points} translation={snapshot.translation} explanations={snapshot.translationPoints}/></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <button type="button" onClick={onReturn} className="min-h-12 rounded-xl bg-slate-900 px-5 font-black text-white">Вернуться к заданию</button>
        <button type="button" onClick={onRestartExplanations} className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 font-bold text-slate-900">В начало объяснений</button>
        <button type="button" onClick={onReal} className="min-h-12 rounded-xl border border-teal-200 bg-teal-50 px-5 font-bold text-teal-900">К реальным заданиям Schreiben</button>
      </div>
    </div>
  </div>;
}

function tokens(value:string){
  return value.trim().split(/\s+/).filter(Boolean);
}

function cleanToken(value:string){
  return value.toLocaleLowerCase('de-DE').replace(/[.,!?;:"'„“]/g,'').trim();
}

function multiset(values:string[]){
  const map=new Map<string,number>();
  for(const value of values){
    const key=cleanToken(value);
    map.set(key,(map.get(key)||0)+1);
  }
  return map;
}

export function explainBuildError(actual:string[],expectedSentence:string){
  const expected=tokens(expectedSentence);
  // A selectable tile may contain several words (e.g. "am Wochenende").
  // Compare full German word sets, not tile labels, to distinguish wrong order from extras.
  const actualWords=actual.flatMap(tile=>tokens(tile));
  const actualClean=actualWords.map(cleanToken);
  const expectedClean=expected.map(cleanToken);
  const actualSet=multiset(actualWords);
  const expectedSet=multiset(expected);

  const extras:string[]=[];
  for(const [word,count] of actualSet){
    const allowed=expectedSet.get(word)||0;
    for(let i=allowed;i<count;i+=1)extras.push(word);
  }
  if(extras.length){
    return 'Слово «'+extras[0]+'» здесь лишнее. В этом предложении оно не нужно. Убери его и попробуй ещё раз.';
  }

  const missing:string[]=[];
  for(const [word,count] of expectedSet){
    const have=actualSet.get(word)||0;
    for(let i=have;i<count;i+=1)missing.push(word);
  }
  if(missing.length){
    const position=expectedClean.indexOf(missing[0]);
    return 'Не хватает слова «'+expected[position]+'». Оно должно стоять на позиции '+String(position+1)+'. Добавь его и попробуй ещё раз.';
  }

  const mismatch=expectedClean.findIndex((word,index)=>actualClean[index]!==word);
  if(mismatch>=0){
    const actualWord=actualWords[mismatch]||'';
    const expectedWord=expected[mismatch]||'';
    if(mismatch===1){
      return 'Посмотри на начало предложения. На втором месте здесь должно стоять «'+expectedWord+'», а у тебя стоит «'+actualWord+'». В обычном немецком утверждении спрягаемый глагол стоит на втором месте. Переставь слова и попробуй ещё раз.';
    }
    const actualExpectedIndex=expectedClean.indexOf(cleanToken(actualWord));
    if(actualExpectedIndex>=0){
      return 'Почти получилось. Слово «'+actualWord+'» сейчас стоит на позиции '+String(mismatch+1)+', а в этом учебном ответе оно должно стоять на позиции '+String(actualExpectedIndex+1)+'. Переставь его и попробуй ещё раз.';
    }
    return 'Почти получилось. На позиции '+String(mismatch+1)+' должно стоять «'+expectedWord+'». Проверь порядок слов и попробуй ещё раз.';
  }
  return 'Почти получилось. Проверь порядок слов и попробуй ещё раз.';
}

function deSoft(value:string){
  return cleanToken(value).replace(/ä/g,'a').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ß/g,'ss');
}

export function explainTypingError(actualSentence:string,expectedSentence:string){
  const actual=tokens(actualSentence);
  const expected=tokens(expectedSentence);
  const max=Math.max(actual.length,expected.length);

  if(actual.length<expected.length){
    const missing=expected.find((word,index)=>!actual[index]||deSoft(actual[index])!==deSoft(word));
    return 'В предложении не хватает нужного слова'+(missing?' «'+missing+'»':'')+'. Проверь фразу и добавь его в правильное место.';
  }
  if(actual.length>expected.length){
    const extra=actual.find((word,index)=>!expected[index]||deSoft(word)!==deSoft(expected[index]));
    return 'В предложении есть лишнее слово'+(extra?' «'+extra+'»':'')+'. Убери его и попробуй ещё раз.';
  }

  for(let i=0;i<max;i+=1){
    if(cleanToken(actual[i]||'')===cleanToken(expected[i]||''))continue;
    if(deSoft(actual[i]||'')===deSoft(expected[i]||'')){
      if(/ö/.test(cleanToken(expected[i]||''))&&!/ö/.test(cleanToken(actual[i]||''))){
        return 'В слове «'+expected[i]+'» нужен умляут ö. Правильно пишется «'+expected[i]+'». Исправь только это слово и проверь предложение снова.';
      }
      if(/ä/.test(cleanToken(expected[i]||''))&&!/ä/.test(cleanToken(actual[i]||''))){
        return 'В слове «'+expected[i]+'» нужен умляут ä. Правильно пишется «'+expected[i]+'». Исправь это слово и попробуй снова.';
      }
      if(/ü/.test(cleanToken(expected[i]||''))&&!/ü/.test(cleanToken(actual[i]||''))){
        return 'В слове «'+expected[i]+'» нужен умляут ü. Правильно пишется «'+expected[i]+'». Исправь это слово и попробуй снова.';
      }
      return 'Смысл понятен, но проверь написание слова «'+expected[i]+'». Исправь его и попробуй снова.';
    }
    return 'Посмотри на слово №'+String(i+1)+'. У тебя «'+(actual[i]||'—')+'», а здесь ожидается другая форма. Проверь именно это место и попробуй снова.';
  }
  return 'Проверь написание и порядок слов ещё раз.';
}

export function OttoError({text,onRetry}:{text:string;onRetry:()=>void}){
  return <div className="mt-5 flex items-start gap-3">
    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-amber-200 bg-amber-50"><OttoScene scene="schreiben" eager className="h-full w-full object-contain"/></div>
    <div className="min-w-0 flex-1 rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <p className="text-xs font-black uppercase tracking-[.12em]">OTTO</p>
      <p className="mt-2 text-sm leading-6">{text}</p>
      <button type="button" onClick={onRetry} className="mt-3 min-h-10 rounded-xl border border-amber-300 bg-white px-4 font-bold text-amber-950">Попробовать снова</button>
    </div>
  </div>;
}

export function SkipAction({onSkip}:{onSkip:()=>void}){
  return <button type="button" onClick={onSkip} className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-600">Пропустить</button>;
}

export function StepBackButton({onClick}:{onClick:()=>void}){
  return <button type="button" onClick={onClick} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 font-bold text-slate-900"><ArrowLeft className="h-4 w-4"/>Назад</button>;
}
export function StepNextBack({onBack,onNext}:{onBack:()=>void;onNext:()=>void}){
  return <div className="mt-5 grid grid-cols-2 items-center gap-3">
    <StepBackButton onClick={onBack}/>
    <button type="button" onClick={onNext} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 font-black text-white">Далее <ArrowRight className="h-4 w-4"/></button>
  </div>;
}
export function SkippedAnswer({answer,onNext,onBack}:{answer?:string;onNext:()=>void;onBack?:()=>void}){
  return <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-sm font-black text-slate-600">Пропущено</p>
    {answer&&<div className="mt-3"><p className="text-xs font-black uppercase tracking-[.12em] text-slate-500">Правильный вариант</p><div className="mt-2"><GermanLine text={answer} className="font-bold text-slate-950"/></div></div>}
    <div className={onBack?'mt-4 grid grid-cols-2 gap-3':'mt-4 flex justify-end'}>{onBack&&<StepBackButton onClick={onBack}/>}<button type="button" onClick={onNext} className="min-h-12 rounded-xl bg-slate-900 px-5 font-black text-white">Далее</button></div>
  </div>;
}
