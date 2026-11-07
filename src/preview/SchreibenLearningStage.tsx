import { useState, type ReactNode } from 'react';
import { useResetLearningStepScroll } from '@/preview/LearningStepScroll';
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { OttoScene } from '@/components/OttoScene';
import { SchreibenExtraLetters } from '@/preview/SchreibenExtraLetters';
import { AssignmentOverlay, AutoRussianTranslation, GermanAudioButton, GermanFragments, GermanLine, OttoError, SkipAction, SkippedAnswer, StepBackButton, StepNextBack, SchreibenTaskOverview, CompletedSchreibenLetter, explainBuildError } from '@/preview/SchreibenPracticeTools';
import { TranslationButton } from '@/preview/LearningTranslation';

type SchreibenProgress={
  screenIndex:number;
};

const STORAGE_PREFIX='otto-preview-schreiben-exact-v3:';

const EXPLANATION_SCREENS=[
  "Давайте посмотрим\nна само задание и\nразберем, как его\nвыполнить",
  "Прочитайте пример письма,\nкоторое может встретиться на\nэкзамене A1.\n\nSie möchten Ihre Freundin Anna\nam Wochenende besuchen. Sie\nmöchten mit dem Auto kommen\nund zusammen im Park\nspazieren gehen. Schreiben Sie\nAnna eine E-Mail.\n\nSchreiben Sie:\n• Wann möchten Sie kommen?\n• Sie kommen mit dem Auto.\n• Was möchten Sie zusammen\nmachen?\n\nДавайте посмотрим, что\nздесь написано и что от нас\nтребуется сделать, чтобы\nвыполнить задание",
  "Текст задания состоит\nиз 2 частей. Первая\nчасть это\nобстоятельства.\n\nSie möchten Ihre Freundin Anna\nam Wochenende besuchen. Sie\nmöchten mit dem Auto kommen\nund zusammen im Park spazieren\ngehen. Schreiben Sie Anna eine E-\nMail.\n\nПеревод:\nВы хотите на выходных\nнавестить свою подругу Анну.\nВы хотите приехать на машине\nи вместе погулять в парке.\nНапишите Анне электронное\nписьмо.\n\nВам дают контекст и\nпросят написать\nписьмо Анне",
  "Вторая часть - это\nобязательные пункты, которые\nвы должны выполнить при\nнаписании письма.\n\nSchreiben Sie:\n• Wann möchten Sie kommen?\n• Sie kommen mit dem Auto.\n• Was möchten Sie zusammen\nmachen?\n\nНапишите:\n• Когда вы хотите\nприехать?\n• Вы приедете на машине.\n• Что вы хотите сделать\nвместе?\n\nВ своем письме Анне вы\nдолжны раскрыть\nкаждый из этих пунктов,\nчтобы набрать максимум\nбаллов за это задание",
  "Как же это сделать,\nкогда немецким\nязыком вы еще не\nвладеете?\n\nНа самом деле, вам не\nнужно знать немецкий\nязык, чтобы написать\nписьмо. Достаточно\nобладать минимальной\nбазой и уделить\nнекоторое время\nпрактике.\n\nСейчас мы с вами\nнаучимся писать\nписьма на этом\nпримере",
  "Любое письмо\nначинается с\nприветствия. Из\nконспекта вы уже\nзнаете, что мы\nиспользуем разные\nформы приветствия в\nзависимости от того, к\nкому мы обращаемся.\n\nВ данном случае мы\nпишем своей подруге,\nпоэтому свое письмо\nначнем с обращения\n\nLiebe Anna,\n\nПосле обращения\nвсегда ставьте\nзапятую, и на\nследующей строке\nначинайте писать с\nмаленькой буквы (Если\nпервое слово это не\nсуществительное)",
  "Теперь мы начинаем\nписать основную часть\nписьма. Давайте снова\nпосмотрим на\nобстоятельства и\nпервый пункт, который\nнам нужно раскрыть.\n\nSie möchten Ihre Freundin Anna\nam Wochenende besuchen. Sie\nmöchten mit dem Auto kommen\nund zusammen im Park spazieren\ngehen. Schreiben Sie Anna eine E-\nMail.\n\nSchreiben Sie:\n• Wann möchten Sie kommen?\n\nЧтобы раскрыть первый пункт, нам\nнужно написать Анне, когда мы хотим\nприехать.\nОтвет на этот вопрос уже есть в\nданных нам обстоятельствах. Нам\nостается лишь немного видоизменить\nслова по простейшим правилам\nграмматики, которые вы успели узнать\nв конспекте",
  "В обстоятельствах\nнаписано, что вы\nхотите посетить Анну\nна выходных. Берём\nнужную нам часть:\n\nSie möchten Ihre Freundin Anna\nam Wochenende besuchen.\n\nМы пишем письмо от\nпервого лица, поэтому\nсначала нам нужно\nзаменить\nSie möchten (вы хотите)\nна\nich möchte (я хочу)\n\nТеперь нужно заменить\nIhre Freundin Anna\n(ваша подруга Анна)\nна простое местоимение\ndich (тебя)",
  "Нам осталось написать,\nкогда мы хотим приехать.\nЗдесь мы можем взять\nцеликом\nam Wochenende besuchen\n(навестить на выходных)\nи никак не меняя эту\nчасть вставить в наше\nпредложение. В итоге у\nнас получается так:\n\nich möchte dich am\nWochenende besuchen.\nПеревод: я хочу навестить\nтебя на выходных.\n\nТаким образом, зная лишь\nнесколько простых\nправил грамматики\nнемецкого языка и имея\nминимальный словарный\nзапас, мы смогли\nраскрыть первый пункт\nписьма.",
  "Теперь давайте еще раз\nвзглянем на\nобстоятельства и\nперейдем ко второму\nпункту\n\nSie möchten Ihre Freundin\nAnna am Wochenende\nbesuchen. Sie möchten mit\ndem Auto kommen und\nzusammen im Park spazieren\ngehen. Schreiben Sie Anna\neine E-Mail.\n\nSchreiben Sie:\n• Sie kommen mit dem Auto.\n\nЗдесь мы должны написать\nАнне, что приедем на\nмашине. Эта информация\nесть в обстоятельствах, но\nсам текст второго пункта\nгораздо удобнее взять за\nоснову нашего\nпредложения.",
  "Второй пункт гласит: Вы\nприедете на машине.\nЧтобы написать второе\nпредложение, нам всего\nлишь нужно заменить\nSie kommen (вы приедете)\nна\nIch komme (я приеду)\nи тогда наше итоговое\nпредложение будет\nвыглядеть вот так:\n\nIch komme mit dem Auto.\n(Я приеду на машине)\n\nВажно: на экзамене A1\nартикли тоже нужны.\nВ выражении mit dem Auto\nпредлог mit требует\nдательного падежа (Dativ),\nпоэтому мы используем\nправильную форму dem.\nУчитесь писать эту фразу\nполностью: Ich komme\nmit dem Auto.",
  "Остался третий пункт.\nДавайте снова взглянем\nна обстоятельства.\n\nSie möchten Ihre Freundin Anna\nam Wochenende besuchen. Sie\nmöchten mit dem Auto kommen\nund zusammen im Park spazieren\ngehen. Schreiben Sie Anna eine E-\nMail.\n\nSchreiben Sie:\n• Was möchten Sie zusammen\nmachen?\n\nЧтобы раскрыть третий\nпункт, мы должны\nответить на вопрос: Что\nвы хотите сделать вместе\n(с Анной)",
  "Здесь мы снова берем\nинформацию из\nобстоятельств, и лишь\nнемного видоизменяем\nпредложение.\nSie möchten (вы хотите)\nмы снова меняем на\nIch möchte (я хочу). Всё\nостальное мы оставляем\nнеизменным.\n\nВ итоге у нас получается\nIch möchte zusammen im\nPark spazieren gehen.\n(Я хочу вместе погулять в\nпарке).\n\nНа этом этапе мы\nраскрыли все три пункта,\nоднако письмо еще нужно\nправильно закончить.",
  "Для того, чтобы закончить\nписьмо, мы снова\nобратимся к конспекту,\nкоторый вы изучали\nранее. Анна - наша\nподруга, поэтому\nзаканчивать письмо\nнужно так:\n\nLiebe Grüße\nName (Ваше имя)\n\nВажно:\nПрощание всегда\nначинается с новой\nстроки и остается без\nзнаков препинания в\nконце. Следующей\nстрочкой вы пишете своё\nимя, и тоже без знака\nпрепинания.",
  "Теперь давайте взглянем на то,\nчто у нас получилось в итоге.\n\nLiebe Anna,\nich möchte dich am Wochenende\nbesuchen. Ich komme mit dem Auto.\nIch möchte zusammen im Park\nspazieren gehen.\nLiebe Grüße\nName\n\nПримите поздравления Отто.\nВы только что узнали как\nправильно и, самое главное,\nлегко можно выполнить\nзадание с письмом на\nэкзамене A1.\n\nТеперь вы можете с\nсамостоятельно (и с моими\nподсказками) попробовать\nнаписать следующее письмо."
] as const;

function readProgress(userId?:string):SchreibenProgress{
  try{
    const raw=localStorage.getItem(STORAGE_PREFIX+(userId||'local'));
    if(!raw)return {screenIndex:0};
    const parsed=JSON.parse(raw) as Partial<SchreibenProgress>;
    const screenIndex=Number.isInteger(parsed.screenIndex)?Math.max(0,Math.min(15,Number(parsed.screenIndex))):0;
    return {screenIndex};
  }catch{
    return {screenIndex:0};
  }
}

function saveProgress(progress:SchreibenProgress,userId?:string){
  try{localStorage.setItem(STORAGE_PREFIX+(userId||'local'),JSON.stringify(progress))}catch{}
}

function paragraphs(text:string){
  return text.split(/\n{2,}/).map(part=>part.trim()).filter(Boolean);
}

function fluidText(text:string){
  return text
    .replace(/-\n(?=[A-Za-zÄÖÜäöüß])/g,'-')
    .replace(/\n+/g,' ')
    .replace(/[ \t]{2,}/g,' ')
    .trim();
}

function stripPrefix(text:string,prefix:string){
  const value=fluidText(text);
  return value.startsWith(prefix)?value.slice(prefix.length).trim():value;
}

function parseBullets(text:string){
  const lines=text.split('\n').map(line=>line.trim()).filter(Boolean);
  const title:string[]=[];
  const bullets:string[]=[];
  let current='';
  for(const line of lines){
    if(line.startsWith('•')){
      if(current)bullets.push(current.trim());
      current=line.replace(/^•\s*/,'');
      continue;
    }
    if(current){
      current+=' '+line;
    }else{
      title.push(line);
    }
  }
  if(current)bullets.push(current.trim());
  return {title:fluidText(title.join(' ')),bullets};
}

function regexEscape(value:string){
  return value.replace(/[.*+?^$()|[\]\\]/g,'\\$&');
}

function HighlightedText({text,highlights=[]}:{text:string;highlights?:string[]}){
  const normalized=fluidText(text);
  const active=highlights.filter(Boolean).sort((a,b)=>b.length-a.length);
  if(!active.length)return <>{normalized}</>;
  const pattern=new RegExp('('+active.map(regexEscape).join('|')+')','g');
  return <>{normalized.split(pattern).map((part,index)=>active.includes(part)?<mark key={index} className="rounded-md bg-amber-100 px-1 font-bold text-slate-950">{part}</mark>:<span key={index}>{part}</span>)}</>;
}

function OttoBubble({text,tone='normal'}:{text:string;tone?:'normal'|'important'}){
  return <div className="flex max-w-[900px] items-start gap-3">
    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-teal-100 bg-teal-50 sm:h-16 sm:w-16">
      <OttoScene scene="schreiben" eager className="h-full w-full object-contain"/>
    </div>
    <div className={tone==='important'
      ?'min-w-0 flex-1 rounded-[22px] border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5'
      :'min-w-0 flex-1 rounded-[22px] border border-teal-100 bg-teal-50/70 p-4 shadow-sm sm:p-5'}>
      <p className="mb-1 text-xs font-black uppercase tracking-[0.14em] text-teal-700">OTTO</p>
      <div className="text-[16px] font-medium leading-7 text-slate-800 sm:text-[17px]">{fluidText(text)}</div>
    </div>
  </div>;
}

function InstructionLead({text}:{text:string}){
  return <div className="max-w-[880px] text-[16px] font-semibold leading-7 text-slate-700 sm:text-lg">{fluidText(text)}</div>;
}

function ExamCard({body,bulletText,label='Экзаменационное задание',highlights=[]}:{body?:string;bulletText?:string;label?:string;highlights?:string[]}){
  const parsed=bulletText?parseBullets(bulletText):null;
  return <section className="w-full rounded-[26px] border border-slate-200 bg-[#fffefa] p-5 shadow-[0_12px_34px_rgba(15,23,42,.07)] sm:p-7">
    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
    {body&&<div className="mt-3 max-w-[980px]"><div className="text-[17px] font-semibold leading-8 text-slate-950 sm:text-lg"><HighlightedText text={body} highlights={highlights}/></div><GermanFragments text={body}/></div>}
    {parsed&&<div className="mt-5">
      {parsed.title&&<div className="mb-3"><GermanLine text={parsed.title} className="text-[17px] font-black text-slate-950"/></div>}
      <div className="space-y-2.5">{parsed.bullets.map((bullet,index)=><div key={index} className="flex items-start gap-2"><span className="mt-[2px] text-teal-700">•</span><div className="min-w-0 flex-1 text-[16px] font-semibold leading-7 text-slate-900 sm:text-[17px]"><HighlightedText text={bullet} highlights={highlights}/></div><GermanAudioButton text={fluidText(bullet)} label="🔊"/></div>)}</div>
    </div>}
  </section>;
}

function TranslationCard({text,bulletMode=false}:{text:string;bulletMode?:boolean}){
  if(bulletMode){
    const parsed=parseBullets(text);
    return <section className="rounded-[22px] border border-sky-200 bg-sky-50 p-5 sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-700">🇷🇺 {parsed.title||'Перевод'}</p>
      <ul className="mt-3 space-y-2">{parsed.bullets.map((bullet,index)=><li key={index} className="flex gap-3 text-[16px] leading-7 text-slate-800"><span>•</span><span>{fluidText(bullet)}</span></li>)}</ul>
    </section>;
  }
  return <section className="rounded-[22px] border border-sky-200 bg-sky-50 p-5 sm:p-6">
    <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-700">🇷🇺 Перевод</p>
    <div className="mt-2 text-[16px] leading-7 text-slate-800 sm:text-[17px]">{stripPrefix(text,'Перевод:')}</div>
  </section>;
}

function ResultCard({text,label='Результат'}:{text:string;label?:string}){
  return <section className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
    <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">{label}</p>
    <div className="mt-2 whitespace-pre-line text-[18px] font-black leading-8 text-slate-950 sm:text-xl">{fluidText(text)}</div>
    <GermanFragments text={text}/>
  </section>;
}

function LetterCard({text}:{text:string}){
  const lines=text.split('\n').map(line=>line.trim()).filter(Boolean);
  const germanLetter=lines.join('\n');
  // Source line breaks are typographic. Keep the greeting, complete body
  // sentences, closing and signature as separate teachable/audio units.
  const closingIndex=lines.findIndex(line=>line==='Liebe Grüße'||line==='Mit freundlichen Grüßen');
  const bodyEnd=closingIndex>=0?closingIndex:lines.length;
  const body=lines.slice(1,bodyEnd).join(' ');
  const sentences=(body.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[]).map(line=>line.trim()).filter(Boolean);
  const displayedLines=[lines[0],...sentences,...lines.slice(bodyEnd)].filter(Boolean);
  return <section className="rounded-[26px] border border-slate-200 bg-[#fffefa] p-5 shadow-[0_12px_34px_rgba(15,23,42,.07)] sm:p-7">
    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Готовое письмо</p>
    <div className="mt-4 max-w-[820px] text-[17px] leading-8 text-slate-950 sm:text-lg">
      {displayedLines.map((line,index)=>line==='Name'?<p key={index} className="font-black">{line}</p>:<GermanLine key={index} text={fluidText(line)} className={index===0||line==='Liebe Grüße'?'font-black':''}/>) }
    </div>
    <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-700">🇷🇺 Полный перевод письма</p>
      <div className="mt-2"><AutoRussianTranslation text={germanLetter} preset={germanLetter.startsWith('Liebe Anna,')?"Дорогая Анна!\n\nЯ хочу навестить тебя на выходных. Я приеду на машине. Я хочу, чтобы мы вместе погуляли в парке.\n\nС любовью,\nИмя":undefined}/></div>
    </div>
  </section>;
}

function TransformCard({from,middle,to}:{from:string;middle:string;to:string}){
  return <section className="grid gap-3 rounded-[24px] border border-violet-200 bg-violet-50 p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:p-6">
    <div className="rounded-2xl bg-white p-4 text-center text-lg font-black text-slate-950 shadow-sm">{fluidText(from)}<GermanFragments text={from}/></div>
    <div className="text-center text-sm font-black uppercase tracking-[0.12em] text-violet-700">{fluidText(middle)}</div>
    <div className="rounded-2xl bg-white p-4 text-center text-lg font-black text-slate-950 shadow-sm">{fluidText(to)}<GermanFragments text={to}/></div>
  </section>;
}

function TransformParagraph({text,from,to}:{text:string;from:string;to:string}){
  const fromAt=text.indexOf(from);
  const toAt=text.indexOf(to,fromAt+from.length);
  if(fromAt<0||toAt<0)return <OttoBubble text={text}/>;
  const prefix=text.slice(0,fromAt).trim();
  const middle=text.slice(fromAt+from.length,toAt).trim();
  const suffix=text.slice(toAt+to.length).trim();
  return <div className="space-y-4">
    {prefix&&<OttoBubble text={prefix}/>}
    <TransformCard from={from} middle={middle} to={to}/>
    {suffix&&<OttoBubble text={suffix}/>}
  </div>;
}

function ResultWithTranslation({text}:{text:string}){
  const marker='Перевод:';
  const at=text.indexOf(marker);
  if(at<0)return <ResultCard text={text}/>;
  return <div className="grid gap-4 md:grid-cols-[1fr_.9fr]">
    <ResultCard text={text.slice(0,at).trim()}/>
    <TranslationCard text={marker+text.slice(at+marker.length)}/>
  </div>;
}

function ScreenContent({index,text}:{index:number;text:string}){
  const p=paragraphs(text);
  switch(index){
    case 0:
      return <OttoBubble text={p[0]}/>;
    case 1:
      return <div className="space-y-5"><InstructionLead text={p[0]}/><ExamCard body={p[1]} bulletText={p[2]}/><OttoBubble text={p[3]}/></div>;
    case 2:
      return <div className="space-y-5"><OttoBubble text={p[0]}/><ExamCard label="Обстоятельства" body={p[1]}/><TranslationCard text={p[2]}/><OttoBubble text={p[3]}/></div>;
    case 3:
      return <div className="space-y-5"><OttoBubble text={p[0]}/><div className="grid gap-4 lg:grid-cols-2"><ExamCard label="Обязательные пункты" bulletText={p[1]}/><TranslationCard text={p[2]} bulletMode/></div><OttoBubble text={p[3]}/></div>;
    case 4:
      return <div className="space-y-5"><OttoBubble text={p[0]}/><OttoBubble text={p[1]} tone="important"/><OttoBubble text={p[2]}/></div>;
    case 5:
      return <div className="space-y-5"><OttoBubble text={p[0]}/><OttoBubble text={p[1]}/><ResultCard label="Обращение" text={p[2]}/><OttoBubble text={p[3]} tone="important"/></div>;
    case 6:
      return <div className="space-y-5"><OttoBubble text={p[0]}/><ExamCard label="Обстоятельства и первый пункт" body={p[1]} bulletText={p[2]} highlights={['am Wochenende besuchen','Wann möchten Sie kommen?']}/><OttoBubble text={p[3]}/></div>;
    case 7:
      return <div className="space-y-5"><OttoBubble text={p[0]}/><ExamCard label="Нужная часть обстоятельств" body={p[1]}/><TransformParagraph text={p[2]} from="Sie möchten (вы хотите)" to="ich möchte (я хочу)"/><TransformParagraph text={p[3]} from={"Ihre Freundin Anna\n(ваша подруга Анна)"} to="dich (тебя)"/></div>;
    case 8:
      return <div className="space-y-5"><OttoBubble text={p[0]}/><ResultWithTranslation text={p[1]}/><OttoBubble text={p[2]}/></div>;
    case 9:
      return <div className="space-y-5"><OttoBubble text={p[0]}/><ExamCard label="Обстоятельства и второй пункт" body={p[1]} bulletText={p[2]} highlights={['mit dem Auto kommen','Sie kommen mit dem Auto.']}/><OttoBubble text={p[3]}/></div>;
    case 10:
      return <div className="space-y-5"><TransformParagraph text={p[0]} from="Sie kommen (вы приедете)" to="Ich komme (я приеду)"/><ResultCard text={p[1]}/><OttoBubble text={p[2]} tone="important"/></div>;
    case 11:
      return <div className="space-y-5"><OttoBubble text={p[0]}/><ExamCard label="Обстоятельства и третий пункт" body={p[1]} bulletText={p[2]} highlights={['zusammen im Park spazieren gehen','Was möchten Sie zusammen machen?']}/><OttoBubble text={p[3]}/></div>;
    case 12:
      return <div className="space-y-5"><TransformParagraph text={p[0]} from="Sie möchten (вы хотите)" to="Ich möchte (я хочу)."/><ResultCard text={p[1]}/><OttoBubble text={p[2]}/></div>;
    case 13:
      return <div className="space-y-5"><OttoBubble text={p[0]}/><ResultCard label="Прощание" text={p[1]}/><OttoBubble text={p[2]} tone="important"/></div>;
    case 14:
      return <div className="space-y-5"><OttoBubble text={p[0]}/><LetterCard text={p[1]}/><OttoBubble text={p[2]}/><OttoBubble text={p[3]}/></div>;
    default:
      return <OttoBubble text={text}/>;
  }
}

type SchreibenMode='explanations'|'transition'|'practice'|'practiceDone'|'extraLetters';

type PracticeState={
  mode:SchreibenMode;
  screenIndex:number;
  practiceIndex:number;
  name:string;
  statuses?:Record<string,'correct'|'skipped'>;
};

const PRACTICE_STORAGE_PREFIX='otto-preview-schreiben-practice-v1:';

const TASK_BODY='Sie möchten Ihre Freundin Anna am Wochenende besuchen. Sie möchten mit dem Auto kommen und zusammen im Park spazieren gehen. Schreiben Sie Anna eine E-Mail.';
const TASK_POINTS=['Wann möchten Sie kommen?','Sie kommen mit dem Auto.','Was möchten Sie zusammen machen?'] as const;
const TASK_TRANSLATION='Вы хотите на выходных навестить свою подругу Анну. Вы хотите приехать на машине и вместе погулять в парке. Напишите Анне электронное письмо.';
const TASK_POINT_TRANSLATIONS=['Когда вы хотите приехать?','Вы приедете на машине.','Что вы хотите сделать вместе?'] as const;
const FIRST_SENTENCE='Ich möchte dich am Wochenende besuchen.';
const SECOND_SENTENCE='Ich komme mit dem Auto.';
const THIRD_SENTENCE='Ich möchte zusammen im Park spazieren gehen.';
const GREETING='Liebe Anna,';
const CLOSING='Liebe Grüße';

// In-memory drafts only: never added to existing persisted progress or server state.
type ExerciseDraft={selected?:string;chosen?:string[];result?:boolean|null;skipped?:boolean};

// Keep stored practice indices/status keys stable when skipping the former N4 explanation.
function resumePracticeStep(step:number){return step===3?4:step===8?7:step}
function nextPracticeStep(step:number){return step===2?4:step+1}
function previousPracticeStep(step:number){return step===4?2:step-1}

function readPracticeState(userId?:string):PracticeState{
  try{
    const raw=localStorage.getItem(PRACTICE_STORAGE_PREFIX+(userId||'local'));
    if(!raw)return {mode:'explanations',screenIndex:readProgress(userId).screenIndex,practiceIndex:0,name:'',statuses:{}};
    const parsed=JSON.parse(raw) as Partial<PracticeState>;
    const mode:SchreibenMode=parsed.mode==='transition'||parsed.mode==='practice'||parsed.mode==='practiceDone'||parsed.mode==='extraLetters'?parsed.mode:'explanations';
    return {
      mode,
      screenIndex:Number.isInteger(parsed.screenIndex)?Math.max(0,Math.min(15,Number(parsed.screenIndex))):0,
      practiceIndex:Number.isInteger(parsed.practiceIndex)?(mode==='practice'?resumePracticeStep(Math.max(0,Math.min(8,Number(parsed.practiceIndex)))):Math.max(0,Math.min(8,Number(parsed.practiceIndex)))):0,
      name:typeof parsed.name==='string'?parsed.name:'',
      statuses:parsed.statuses&&typeof parsed.statuses==='object'?parsed.statuses as Record<string,'correct'|'skipped'>:{},
    };
  }catch{
    return {mode:'explanations',screenIndex:readProgress(userId).screenIndex,practiceIndex:0,name:'',statuses:{}};
  }
}

function savePracticeState(state:PracticeState,userId?:string){
  try{
    const key=PRACTICE_STORAGE_PREFIX+(userId||'local');
    const previousRaw=localStorage.getItem(key);
    const previous=previousRaw?JSON.parse(previousRaw) as Partial<PracticeState>:{};
    localStorage.setItem(key,JSON.stringify({...previous,...state,statuses:state.statuses??previous.statuses??{}}));
  }catch{}
}

function PracticeShell({children}:{children:ReactNode}){
  return <section className="mx-auto min-h-[calc(100dvh-180px)] w-full max-w-[1080px] overflow-x-hidden py-2 sm:py-5">{children}</section>;
}

function PracticeCard({children}:{children:ReactNode}){
  return <div className="rounded-[28px] border border-white/90 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,.08)] sm:p-8">{children}</div>;
}

function PracticeFeedback({correct,onRetry,onNext}:{correct:boolean|null;onRetry:()=>void;onNext:()=>void}){
  if(correct===null)return null;
  if(correct)return <div className="mt-5"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-black text-emerald-900">Правильно ✓</div><div className="mt-4 flex justify-end"><button type="button" onClick={onNext} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-slate-900 px-6 font-black text-white">Далее <ArrowRight className="h-4 w-4"/></button></div></div>;
  return <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><b>Ответ неверный.</b><button type="button" onClick={onRetry} className="mt-3 min-h-10 rounded-xl border border-amber-300 bg-white px-4 font-bold text-amber-950">Попробовать снова</button></div>;
}

function ChoiceExercise({
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
  if(skipped)return <PracticeCard><SkippedAnswer answer={answer} onNext={onNext} onBack={onBack}/></PracticeCard>;
  return <PracticeCard>
    <p className="otto-kicker">ПРАКТИКА SCHREIBEN</p>
    <h2 className="mt-2 text-3xl font-black text-slate-950">{title}</h2>
    <div className="mt-5 grid gap-3">{options.map(option=><button key={option} type="button" disabled={result!==null} onClick={()=>onDraft({selected:option})} className={selected===option?'min-h-12 rounded-xl border-2 border-teal-500 bg-teal-50 px-4 py-3 text-left font-bold text-slate-950':'min-h-12 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-left font-bold text-slate-900'}>{option}</button>)}</div>
    {result===null&&<><div className="mt-5 grid grid-cols-2 gap-2"><StepBackButton onClick={onBack}/><button type="button" disabled={!selected} onClick={()=>{const ok=selected===answer;onDraft({result:ok});if(ok)onStatus('correct')}} className="min-h-12 rounded-xl bg-slate-900 px-3 font-black text-white disabled:opacity-40">Проверить</button></div><div className="mt-2 [&>button]:w-full"><SkipAction onSkip={()=>{onStatus('skipped');onDraft({skipped:true})}}/></div></>}
    {result===false&&<OttoError text={'Ты выбрал «'+selected+'». Этот вариант не подходит для этого письма. Посмотри, кому мы пишем, и выбери форму, которая соответствует адресату.'} onRetry={()=>onDraft({result:null})}/>}
    {result===true&&<div className="mt-5"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-black text-emerald-900">Правильно ✓</div><div className="mt-3 rounded-2xl border bg-white p-4"><GermanAudioButton text={answer} label="Послушать"/><div className="mt-2"><AutoRussianTranslation text={answer}/></div></div><StepNextBack onBack={onBack} onNext={onNext}/></div>}
    {result===false&&<div className="mt-5"><StepBackButton onClick={onBack}/></div>}
  </PracticeCard>;
}

function BuildExercise({
  title,
  subtitle,
  explanation,
  tiles,
  answer,
  onBack,
  onNext,
  onStatus,
  draft,
  onDraft,
}:{
  title:string;
  subtitle?:string;
  explanation?:string;
  tiles:string[];
  answer:string;
  onBack:()=>void;
  onNext:()=>void;
  onStatus:(status:'correct'|'skipped')=>void;
  draft?:ExerciseDraft;
  onDraft:(patch:Partial<ExerciseDraft>)=>void;
}){
  const chosen=draft?.chosen??[];
  const result=draft?.result??null;
  const skipped=draft?.skipped??false;
  const used=(tile:string,index:number)=>chosen.filter(value=>value===tile).length>=tiles.slice(0,index+1).filter(value=>value===tile).length;
  if(skipped)return <PracticeCard><SkippedAnswer answer={answer} onNext={onNext} onBack={onBack}/></PracticeCard>;
  return <PracticeCard>
    <p className="otto-kicker">СОБЕРИТЕ ПРЕДЛОЖЕНИЕ</p>
    <h2 className="mt-2 text-3xl font-black text-slate-950">{title}</h2>
    {subtitle&&(explanation?<div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p lang="de" className="font-bold text-slate-800">{subtitle}</p><p className="mt-2 text-sm leading-6 text-slate-600">{explanation}</p></div>:<div className="mt-3"><GermanLine text={subtitle} className="text-base leading-7 text-slate-600"/></div>)}
    <div className="mt-5 min-h-[82px] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-3">{chosen.length?<div className="flex flex-wrap gap-2">{chosen.map((tile,index)=><span key={tile+index} lang="de" className="otto-build-selected-tile rounded-xl bg-white px-3 py-2 font-bold text-slate-950 shadow-sm">{tile}</span>)}</div>:<span className="text-sm text-slate-400">Нажимайте слова по порядку</span>}</div>
    <div className="otto-build-choice-list mt-4 grid gap-3">{tiles.map((tile,index)=><div key={tile+index} className="otto-build-choice-row flex min-w-0 flex-wrap items-center gap-2"><button type="button" lang="de" disabled={used(tile,index)||result!==null} onClick={()=>onDraft({chosen:[...chosen,tile]})} className="otto-build-word-tile min-h-11 rounded-xl border bg-white px-3 py-2 font-bold text-slate-900 disabled:opacity-30">{tile}</button><div className="otto-build-word-actions flex min-w-0 flex-wrap items-center gap-2"><GermanAudioButton text={tile} label="🔊"/><TranslationButton parts={[tile]} title="Перевод слова"/></div></div>)}</div>
    {result===null&&<div className="mt-5 grid gap-2 sm:grid-cols-[auto_1fr_auto]"><button type="button" onClick={()=>onDraft({chosen:[]})} className="min-h-11 rounded-xl border bg-white px-4 font-bold text-slate-900"><RotateCcw className="mr-2 inline h-4 w-4"/>Сначала</button><button type="button" disabled={!chosen.length} onClick={()=>{const ok=chosen.join(' ')===answer;onDraft({result:ok});if(ok)onStatus('correct')}} className="min-h-11 rounded-xl bg-slate-900 px-4 font-black text-white disabled:opacity-40">Проверить</button><SkipAction onSkip={()=>{onStatus('skipped');onDraft({skipped:true})}}/></div>}
    {result===false&&<OttoError text={explainBuildError(chosen,answer)} onRetry={()=>onDraft({result:null})}/>}
    {result===true&&<div className="mt-5"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-black text-emerald-900">Правильно ✓</div><div className="mt-3 rounded-2xl border bg-white p-4"><GermanAudioButton text={answer} label="Послушать предложение"/><div className="mt-2"><AutoRussianTranslation text={answer}/></div></div><StepNextBack onBack={onBack} onNext={onNext}/></div>}
    {result!==true&&<div className="mt-5"><StepBackButton onClick={onBack}/></div>}
  </PracticeCard>;
}

function PracticeScreen({
  index,
  name,
  setName,
  onBack,
  onNext,
  onStatus,
  draft,
  onDraft,
}:{
  index:number;
  name:string;
  setName:(value:string)=>void;
  onBack:()=>void;
  onNext:()=>void;
  onStatus:(status:'correct'|'skipped')=>void;
  draft?:ExerciseDraft;
  onDraft:(patch:Partial<ExerciseDraft>)=>void;
}){
  const[nameError,setNameError]=useState('');
  if(index===0){
    return <PracticeCard>
      <p className="otto-kicker">Н1 · ВВОД В ЗАДАНИЕ</p>
      <h2 className="mt-2 text-3xl font-black text-slate-950">Прочитайте обстоятельства и 3 пункта письма</h2>
      <div className="mt-5"><SchreibenTaskOverview body={TASK_BODY} points={TASK_POINTS} translation={TASK_TRANSLATION} explanations={TASK_POINT_TRANSLATIONS}/></div>
      <StepNextBack onBack={onBack} onNext={onNext}/>
    </PracticeCard>;
  }
  if(index===1)return <ChoiceExercise title="Как правильно начать это письмо?" options={['Sehr geehrte Damen und Herren,','Liebe Anna,','Lieber Anna,']} answer={GREETING} onBack={onBack} onNext={onNext} onStatus={onStatus} draft={draft} onDraft={onDraft}/>;
  if(index===2)return <BuildExercise title="Соберите первое предложение из слов" tiles={['besuchen.','dich','am Wochenende','möchte','Ich']} answer={FIRST_SENTENCE} onBack={onBack} onNext={onNext} onStatus={onStatus} draft={draft} onDraft={onDraft}/>;
  if(index===4)return <BuildExercise title="Разберите второй пункт и соберите предложение" subtitle={TASK_POINTS[1]} explanation="Напишите Анне, что вы приедете на машине." tiles={['Auto.','dem','mit','komme','Ich']} answer={SECOND_SENTENCE} onBack={onBack} onNext={onNext} onStatus={onStatus} draft={draft} onDraft={onDraft}/>;
  if(index===5)return <BuildExercise title="Третий пункт — соберите предложение" subtitle="Was möchten Sie zusammen machen?" tiles={['spazieren gehen.','im Park','zusammen','möchte','Ich']} answer={THIRD_SENTENCE} onBack={onBack} onNext={onNext} onStatus={onStatus} draft={draft} onDraft={onDraft}/>;
  if(index===6)return <ChoiceExercise title="Как правильно закончить это личное письмо?" options={['Mit freundlichen Grüßen','Liebe Grüße']} answer={CLOSING} onBack={onBack} onNext={onNext} onStatus={onStatus} draft={draft} onDraft={onDraft}/>;
  if(index===7){
    const valid=/^[\p{Script=Latin}\s'-]+$/u.test(name.trim())&&name.trim().length>0;
    const proceed=()=>{
      if(!valid){setNameError('Введите имя латиницей.');return}
      setName(name.trim());
      setNameError('');
      onStatus('correct');
      onNext();
    };
    return <PracticeCard>
      <p className="otto-kicker">Н8 · ИМЯ</p>
      <h2 className="mt-2 text-3xl font-black text-slate-950">Впишите своё имя латиницей</h2>
      <input value={name} onChange={event=>{setName(event.target.value);setNameError('')}} className="mt-5 min-h-14 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-lg outline-none focus:border-teal-500" placeholder="Например: Julia"/>
      {nameError&&<p className="mt-2 text-sm font-bold text-rose-700">{nameError}</p>}
      <div className="mt-5"><StepNextBack onBack={onBack} onNext={proceed}/><div className="mt-2 flex justify-end"><SkipAction onSkip={()=>{onStatus('skipped');onNext()}}/></div></div>
    </PracticeCard>;
  }
  return null;
}

export function SchreibenLearningStage({
  userId,
  onBack,
  onSections,
  onOpenModules,
  onOpenRealSchreiben,
}:{
  userId?:string;
  onBack:()=>void;
  onSections:()=>void;
  onOpenModules:()=>void;
  onOpenRealSchreiben:()=>void;
}){
  void onSections;
  const initial=readPracticeState(userId);
  const[mode,setMode]=useState<SchreibenMode>(initial.mode);
  const[screenIndex,setScreenIndex]=useState(initial.screenIndex);
  const[practiceIndex,setPracticeIndex]=useState(initial.practiceIndex);
  const[name,setName]=useState(initial.name);
  const[statuses,setStatuses]=useState<Record<string,'correct'|'skipped'>>(initial.statuses??{});
  const[drafts,setDrafts]=useState<Record<number,ExerciseDraft>>({});
  const[showTask,setShowTask]=useState(false);
  const[returnToLetter,setReturnToLetter]=useState<number|null>(null);
  const[returnToStep,setReturnToStep]=useState<number|null>(null);
  useResetLearningStepScroll(`${mode}:${screenIndex}:${practiceIndex}`);

  const persist=(next:Partial<PracticeState>)=>{
    const state:PracticeState={
      mode:next.mode??mode,
      screenIndex:next.screenIndex??screenIndex,
      practiceIndex:next.practiceIndex??practiceIndex,
      name:next.name??name,
      statuses:next.statuses??statuses,
    };
    savePracticeState(state,userId);
  };

  const markStatus=(status:'correct'|'skipped')=>{
    const key='first:'+String(practiceIndex);
    const next={...statuses,[key]:status};
    setStatuses(next);
    persist({statuses:next});
  };

  const openTask=()=>{
    setReturnToLetter(0);
    setReturnToStep(practiceIndex);
    setShowTask(true);
  };

  const returnFromTask=()=>{
    if(returnToLetter===0&&returnToStep!==null)setPracticeIndex(returnToStep);
    setShowTask(false);
  };

  const goToExplanationStart=()=>{
    setDrafts({});
    setMode('explanations');
    setScreenIndex(0);
    setPracticeIndex(0);
    saveProgress({screenIndex:0},userId);
    savePracticeState({mode:'explanations',screenIndex:0,practiceIndex:0,name},userId);
  };

  const explanationBack=()=>{
    if(screenIndex>0){
      const value=screenIndex-1;
      setScreenIndex(value);
      saveProgress({screenIndex:value},userId);
      persist({screenIndex:value});
      return;
    }
    onBack();
  };

  const explanationNext=()=>{
    if(screenIndex>=14){
      setMode('transition');
      setScreenIndex(15);
      saveProgress({screenIndex:15},userId);
      savePracticeState({mode:'transition',screenIndex:15,practiceIndex:0,name},userId);
      return;
    }
    const value=screenIndex+1;
    setScreenIndex(value);
    saveProgress({screenIndex:value},userId);
    persist({screenIndex:value});
  };

  const startPractice=()=>{
    setDrafts({});
    setMode('practice');
    setPracticeIndex(0);
    savePracticeState({mode:'practice',screenIndex:15,practiceIndex:0,name},userId);
  };

  const practiceBack=()=>{
    if(practiceIndex>0){
      const value=previousPracticeStep(practiceIndex);
      setPracticeIndex(value);
      savePracticeState({mode:'practice',screenIndex:15,practiceIndex:value,name},userId);
      return;
    }
    setMode('transition');
    savePracticeState({mode:'transition',screenIndex:15,practiceIndex:0,name},userId);
  };

  const practiceNext=()=>{
    if(practiceIndex>=7){
      setMode('practiceDone');
      savePracticeState({mode:'practiceDone',screenIndex:15,practiceIndex:8,name},userId);
      return;
    }
    const value=nextPracticeStep(practiceIndex);
    setPracticeIndex(value);
    savePracticeState({mode:'practice',screenIndex:15,practiceIndex:value,name},userId);
  };

  if(mode==='transition'){
    return <PracticeShell>
      <div className="rounded-[28px] border border-white/90 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,.08)] sm:p-9">
        <p className="otto-kicker">ОБЪЯСНЕНИЯ ЗАВЕРШЕНЫ</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Теперь попробуем сами</h1>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button type="button" onClick={startPractice} className="min-h-12 rounded-xl bg-slate-900 px-5 font-black text-white">Начать задания</button>
          <button type="button" onClick={goToExplanationStart} className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 font-bold text-slate-900">Вернуться к объяснениям</button>
          <button type="button" onClick={onOpenRealSchreiben} className="min-h-12 rounded-xl border border-teal-200 bg-teal-50 px-5 font-bold text-teal-900">К реальным тренировкам</button>
        </div>
      </div>
    </PracticeShell>;
  }

  if(mode==='practice'){
    return <><PracticeShell>
      {practiceIndex>0&&<button type="button" onClick={openTask} className="mb-3 inline-flex min-h-10 items-center rounded-xl border border-sky-200 bg-sky-50 px-3 text-sm font-bold text-sky-900">📄 Посмотреть задание</button>}
      <PracticeScreen index={practiceIndex} name={name} setName={value=>{setName(value);savePracticeState({mode:'practice',screenIndex:15,practiceIndex,name:value,statuses},userId)}} onBack={practiceBack} onNext={practiceNext} onStatus={markStatus} draft={drafts[practiceIndex]} onDraft={patch=>setDrafts(previous=>({...previous,[practiceIndex]:{...previous[practiceIndex],...patch}}))}/>
    </PracticeShell>{showTask&&<AssignmentOverlay snapshot={{title:'Первый учебный цикл',body:TASK_BODY,points:[...TASK_POINTS],translation:TASK_TRANSLATION,translationPoints:[...TASK_POINT_TRANSLATIONS]}} onReturn={returnFromTask} onRestartExplanations={goToExplanationStart} onReal={onOpenRealSchreiben}/>}</>;
  }

  if(mode==='extraLetters'){
    return <SchreibenExtraLetters
      userId={userId}
      onBackToFirstCycle={()=>{setMode('practiceDone');savePracticeState({mode:'practiceDone',screenIndex:15,practiceIndex:8,name},userId)}}
      onRestartExplanations={goToExplanationStart}
      onOpenModules={onOpenModules}
      onOpenRealSchreiben={onOpenRealSchreiben}
    />;
  }

  if(mode==='practiceDone'){
    return <PracticeShell>
      <div className="rounded-[28px] border border-emerald-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,.08)] sm:p-9">
        <CheckCircle2 className="h-12 w-12 text-emerald-600"/>
        <h1 className="mt-3 text-3xl font-black text-slate-950">Письмо выполнено ✓</h1>
        <div className="mt-5"><CompletedSchreibenLetter lines={[GREETING,'ich möchte dich am Wochenende besuchen.','Ich komme mit dem Auto.','Ich möchte zusammen im Park spazieren gehen.',CLOSING,name.trim()||'Name']}/></div>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">Базовый цикл завершён. Теперь можно перейти к ещё 15 учебным письмам по той же механике.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button type="button" onClick={()=>{setMode('extraLetters');savePracticeState({mode:'extraLetters',screenIndex:15,practiceIndex:8,name},userId)}} className="min-h-12 rounded-xl bg-slate-900 px-4 font-black text-white">Следующее письмо</button>
          <button type="button" onClick={startPractice} className="min-h-12 rounded-xl border bg-white px-4 font-bold text-slate-900">Повторить практику</button>
          <button type="button" onClick={goToExplanationStart} className="min-h-12 rounded-xl border bg-white px-4 font-bold text-slate-900">Вернуться к объяснениям</button>
          <button type="button" onClick={onOpenRealSchreiben} className="min-h-12 rounded-xl border border-teal-200 bg-teal-50 px-4 font-bold text-teal-900">К реальным заданиям Schreiben</button>
        </div>
      </div>
    </PracticeShell>;
  }

  const text=EXPLANATION_SCREENS[Math.min(screenIndex,14)];

  return <section className="mx-auto min-h-0 w-full max-w-[1080px] overflow-x-hidden py-2 sm:min-h-[calc(100dvh-180px)] sm:py-5">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">Шаг 3 · Schreiben</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">Учимся писать письмо</h1>
      </div>
      <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500">Экран {screenIndex+1} из 15</div>
    </div>

    <ScreenContent index={screenIndex} text={text}/>

    <div className="mt-7 grid grid-cols-2 gap-3 border-t border-slate-200 pt-5 sm:flex sm:justify-end">
      <button type="button" onClick={explanationBack} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 font-bold text-slate-900"><ArrowLeft className="h-4 w-4"/>Назад</button>
      <button type="button" onClick={explanationNext} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-7 font-black text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 sm:w-auto">
        Далее <ArrowRight className="h-4 w-4"/>
      </button>
    </div>
  </section>;
}
