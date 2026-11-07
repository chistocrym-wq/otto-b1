
import { useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Headphones, Mic, PenTool, RotateCcw, Sparkles, Volume2 } from 'lucide-react';
import { OttoScene, type OttoSceneName } from '@/components/OttoScene';
import { VoiceRecorder } from '@/components/sprechen/VoiceRecorder';
import { Teil3ArchiveImage } from '@/components/sprechen/Teil3ArchiveImage';
import { cn } from '@/lib/utils';
import '../ottoDesignV2.css';
import '../ottoViewport.css';
import '../ottoSceneAssets.css';
import '../ottoUnifiedPages.css';
import '../ottoVisualSystem.css';
import '../ottoApprovedHomeFinal.css';
import '../ottoTextSafety.css';

type ModuleId = 'horen' | 'lesen' | 'schreiben' | 'sprechen';
type VocabUnit = { de:string; ru:string; example:string; note?:string; key?:boolean };
type StructurePart = { text:string; label:string };
type Drill =
  | { kind:'build'; prompt:string; target:string[]; full:string }
  | { kind:'meaning'; prompt:string; options:string[]; correct:number }
  | { kind:'type'; prompt:string; answer:string }
  | { kind:'blank'; prompt:string; display:string; answer:string }
  | { kind:'structure'; sentence:string; translation:string; parts:StructurePart[] }
  | { kind:'speak'; prompt:string; text:string };

type Lesson = {
  id:ModuleId;
  title:string;
  subtitle:string;
  scene:OttoSceneName;
  taskId:string;
  intro:string[];
  vocab:VocabUnit[];
  drills:Drill[];
  check:Drill[];
};

const LESSONS:Record<ModuleId,Lesson> = {
  horen:{
    id:'horen',
    title:'Hören',
    subtitle:'Telefonnachricht · Aufgabe 1',
    scene:'horen',
    taskId:'horen-001',
    intro:[
      'Hören — аудирование.',
      'Здесь вы слушаете немецкую речь и ищете конкретную информацию: время, место, число, имя или изменение планов.',
      'Перед заданием OTTO разбирает слова из аудио, вопроса и вариантов ответа. Мы не раскрываем правильный вариант заранее.',
    ],
    vocab:[
      {de:'Sie hören',ru:'Вы слушаете / услышите',example:'Sie hören einen kurzen Text.',key:true},
      {de:'einen kurzen Text',ru:'короткий текст',example:'Sie hören einen kurzen Text.'},
      {de:'Lesen Sie zuerst die Aufgabe',ru:'Сначала прочитайте задание',example:'Lesen Sie zuerst die Aufgabe.',key:true},
      {de:'Hören Sie dann den Text',ru:'Затем прослушайте текст',example:'Hören Sie dann den Text.'},
      {de:'hier ist',ru:'это / здесь говорит',example:'Hier ist Anna.',note:'Так часто представляются по телефону.'},
      {de:'kommen',ru:'приходить / приезжать',example:'Ich komme heute.'},
      {de:'heute',ru:'сегодня',example:'Ich komme heute.'},
      {de:'etwas später',ru:'немного позже',example:'Ich komme etwas später.'},
      {de:'der Bus',ru:'автобус',example:'Der Bus hat Verspätung.'},
      {de:'hat Verspätung',ru:'опаздывает / имеет задержку',example:'Der Bus hat Verspätung.',key:true},
      {de:'treffen uns',ru:'встречаемся',example:'Wir treffen uns heute.'},
      {de:'vor dem Kino',ru:'перед кинотеатром',example:'Wir warten vor dem Kino.'},
      {de:'bis später',ru:'до скорого / до встречи позже',example:'Bis später!'},
      {de:'wann',ru:'когда',example:'Wann treffen sich Anna und Julia?',key:true},
      {de:'treffen sich',ru:'встречаются',example:'Wann treffen sich Anna und Julia?',key:true},
      {de:'Uhr',ru:'час / часов (при указании времени)',example:'um fünf Uhr',key:true},
      {de:'fünf',ru:'пять',example:'fünf Uhr'},
      {de:'sechs',ru:'шесть',example:'sechs Uhr'},
      {de:'sieben',ru:'семь',example:'sieben Uhr'},
    ],
    drills:[
      {kind:'structure',sentence:'Wann treffen sich Anna und Julia?',translation:'Когда встречаются Анна и Юлия?',parts:[{text:'Wann',label:'когда — что нужно узнать'},{text:'treffen sich',label:'встречаются — действие'},{text:'Anna und Julia',label:'кто'}]},
      {kind:'build',prompt:'Собери вопрос: «Когда встречаются Анна и Юлия?»',target:['Wann','treffen','sich','Anna','und','Julia?'],full:'Wann treffen sich Anna und Julia?'},
      {kind:'speak',prompt:'Произнеси вопрос целиком.',text:'Wann treffen sich Anna und Julia?'},
      {kind:'meaning',prompt:'Что нужно найти в ответе на этот вопрос?',options:['место','время','причину'],correct:1},
      {kind:'build',prompt:'Собери тренировочную фразу: «Мы встречаемся в пять часов.»',target:['Wir','treffen','uns','um','fünf','Uhr.'],full:'Wir treffen uns um fünf Uhr.'},
      {kind:'blank',prompt:'Вставь знакомое слово.',display:'um fünf _____',answer:'Uhr'},
    ],
    check:[
      {kind:'meaning',prompt:'Что означает «Wann?»',options:['когда','где','почему'],correct:0},
      {kind:'type',prompt:'Напиши по-немецки: «семь»',answer:'sieben'},
      {kind:'build',prompt:'Собери вопрос ещё раз без подсказки.',target:['Wann','treffen','sich','Anna','und','Julia?'],full:'Wann treffen sich Anna und Julia?'},
      {kind:'speak',prompt:'Скажи вопрос вслух.',text:'Wann treffen sich Anna und Julia?'},
    ],
  },
  lesen:{
    id:'lesen',
    title:'Lesen',
    subtitle:'E-Mail · Aufgabe 1',
    scene:'lesen',
    taskId:'teil1-001',
    intro:[
      'Lesen — чтение.',
      'Здесь нужно прочитать короткий текст и найти информацию, которая относится к утверждению или вопросу.',
      'OTTO сначала поможет разобрать слова текста и понять формулировку задания. Richtig/Falsch заранее не сообщаем.',
    ],
    vocab:[
      {de:'Lesen Sie die E-Mail',ru:'Прочитайте электронное письмо',example:'Lesen Sie die E-Mail.',key:true},
      {de:'die Aussage',ru:'утверждение',example:'Sind die Aussagen richtig oder falsch?'},
      {de:'richtig',ru:'верно',example:'richtig oder falsch',key:true},
      {de:'falsch',ru:'неверно',example:'richtig oder falsch',key:true},
      {de:'danke',ru:'спасибо',example:'Danke für deine Mail.'},
      {de:'deine Mail',ru:'твоё письмо / e-mail',example:'Danke für deine Mail.'},
      {de:'dein Zug',ru:'твой поезд',example:'Dein Zug kommt morgen an.',key:true},
      {de:'morgen',ru:'завтра',example:'Der Zug kommt morgen.',key:true},
      {de:'kommt … an',ru:'прибывает',example:'Der Zug kommt morgen an.',key:true},
      {de:'in Hannover',ru:'в Ганновере',example:'in Hannover ankommen'},
      {de:'ab 12.15 Uhr',ru:'с 12:15',example:'ab 12.15 Uhr'},
      {de:'der Hauptbahnhof',ru:'главный вокзал',example:'im Hauptbahnhof',key:true},
      {de:'warte / wartet',ru:'жду / ждёт',example:'Ich warte am Bahnhof.',key:true},
      {de:'vor der Auskunft',ru:'перед справочной',example:'vor der Auskunft warten'},
      {de:'du kannst',ru:'ты можешь',example:'Du kannst mich erreichen.'},
      {de:'mich',ru:'меня / со мной',example:'Du kannst mich erreichen.'},
      {de:'am Vormittag',ru:'в первой половине дня / до обеда',example:'am Vormittag'},
      {de:'auf meinem Handy',ru:'по моему мобильному телефону',example:'auf meinem Handy'},
      {de:'erreichen',ru:'связаться / дозвониться',example:'Du kannst mich erreichen.'},
      {de:'Viertel vor zwölf',ru:'без четверти двенадцать = 11:45',example:'um Viertel vor zwölf'},
    ],
    drills:[
      {kind:'structure',sentence:'Dein Zug kommt morgen an.',translation:'Твой поезд прибывает завтра.',parts:[{text:'Dein Zug',label:'кто/что — твой поезд'},{text:'kommt … an',label:'что делает — прибывает'},{text:'morgen',label:'когда — завтра'}]},
      {kind:'build',prompt:'Собери: «Твой поезд прибывает завтра.»',target:['Dein','Zug','kommt','morgen','an.'],full:'Dein Zug kommt morgen an.'},
      {kind:'structure',sentence:'Du kannst mich am Vormittag erreichen.',translation:'Ты можешь связаться со мной в первой половине дня.',parts:[{text:'Du',label:'кто — ты'},{text:'kannst erreichen',label:'можешь связаться'},{text:'mich',label:'с кем — со мной'},{text:'am Vormittag',label:'когда'}]},
      {kind:'meaning',prompt:'Что означает «Richtig oder falsch?»',options:['верно или неверно','сегодня или завтра','читать или слушать'],correct:0},
      {kind:'blank',prompt:'Вставь слово «главный вокзал».',display:'im __________',answer:'Hauptbahnhof'},
      {kind:'type',prompt:'Напиши по-немецки: «завтра»',answer:'morgen'},
    ],
    check:[
      {kind:'meaning',prompt:'Что от тебя требуется в этом Lesen?',options:['решить, совпадает ли утверждение с текстом','написать письмо','повторить фразу вслух'],correct:0},
      {kind:'type',prompt:'Напиши: «верно»',answer:'richtig'},
      {kind:'blank',prompt:'Вставь: Dein Zug kommt _____ an.',display:'Dein Zug kommt _____ an.',answer:'morgen'},
      {kind:'meaning',prompt:'Что значит «Viertel vor zwölf»?',options:['11:45','12:15','12:30'],correct:0},
    ],
  },
  schreiben:{
    id:'schreiben',
    title:'Schreiben',
    subtitle:'Teil 2 · Tenniskurs',
    scene:'schreiben',
    taskId:'schreiben-teil2-1',
    intro:[
      'Schreiben — письменная часть.',
      'Нужно написать короткое письмо по ситуации и раскрыть все пункты задания.',
      'Сначала определяем: кому пишем, зачем пишем и какие пункты нужно закрыть. Первое письмо разбираем подробно.',
    ],
    vocab:[
      {de:'Sie möchten',ru:'Вы хотели бы',example:'Sie möchten einen Tenniskurs besuchen.',key:true},
      {de:'einen Tenniskurs',ru:'теннисный курс',example:'einen Tenniskurs besuchen',key:true},
      {de:'besuchen',ru:'посещать',example:'einen Tenniskurs besuchen'},
      {de:'Schreiben Sie',ru:'Напишите',example:'Schreiben Sie an den Sportverein.',key:true},
      {de:'an den Sportverein',ru:'в спортивный клуб',example:'an den Sportverein schreiben',key:true},
      {de:'warum',ru:'почему / зачем',example:'Warum schreiben Sie?',key:true},
      {de:'an welchen Tagen',ru:'в какие дни',example:'An welchen Tagen ist der Kurs?',key:true},
      {de:'der Preis',ru:'цена',example:'Preis des Kurses',key:true},
      {de:'Sehr geehrte Damen und Herren',ru:'Уважаемые дамы и господа',example:'Sehr geehrte Damen und Herren,',key:true},
      {de:'Ich möchte',ru:'я хотел(а) бы',example:'Ich möchte einen Tenniskurs besuchen.',key:true},
      {de:'mich anmelden',ru:'записаться',example:'Ich möchte mich für den Kurs anmelden.'},
      {de:'der Kurs',ru:'курс',example:'Wann ist der Kurs?'},
      {de:'Wie viel kostet …?',ru:'Сколько стоит …?',example:'Wie viel kostet der Kurs?',key:true},
      {de:'Ich freue mich auf Ihre Antwort',ru:'Жду Вашего ответа',example:'Ich freue mich auf Ihre Antwort.'},
      {de:'Mit freundlichen Grüßen',ru:'С уважением',example:'Mit freundlichen Grüßen',key:true},
    ],
    drills:[
      {kind:'meaning',prompt:'Кому нужно написать в этом задании?',options:['в спортивный клуб','другу','в гостиницу'],correct:0},
      {kind:'meaning',prompt:'Это личное или официальное письмо?',options:['официальное','личное'],correct:0},
      {kind:'structure',sentence:'Sie möchten einen Tenniskurs besuchen.',translation:'Вы хотите посещать теннисный курс.',parts:[{text:'Sie',label:'кто — Вы'},{text:'möchten',label:'что хотите / хотели бы'},{text:'einen Tenniskurs',label:'что — теннисный курс'},{text:'besuchen',label:'действие в конце — посещать'}]},
      {kind:'build',prompt:'Собери: «Я хотел(а) бы записаться на теннисный курс.»',target:['Ich','möchte','mich','für','den','Tenniskurs','anmelden.'],full:'Ich möchte mich für den Tenniskurs anmelden.'},
      {kind:'speak',prompt:'Произнеси собранную фразу.',text:'Ich möchte mich für den Tenniskurs anmelden.'},
      {kind:'structure',sentence:'An welchen Tagen ist der Kurs?',translation:'В какие дни проходит курс?',parts:[{text:'An welchen Tagen',label:'в какие дни — вопрос'},{text:'ist',label:'глагол'},{text:'der Kurs',label:'что — курс'}]},
      {kind:'build',prompt:'Собери вопрос: «В какие дни проходит курс?»',target:['An','welchen','Tagen','ist','der','Kurs?'],full:'An welchen Tagen ist der Kurs?'},
      {kind:'structure',sentence:'Wie viel kostet der Kurs?',translation:'Сколько стоит курс?',parts:[{text:'Wie viel',label:'сколько'},{text:'kostet',label:'стоит'},{text:'der Kurs',label:'курс'}]},
      {kind:'build',prompt:'Собери вопрос: «Сколько стоит курс?»',target:['Wie','viel','kostet','der','Kurs?'],full:'Wie viel kostet der Kurs?'},
      {kind:'type',prompt:'Напиши самостоятельно: «Сколько стоит курс?»',answer:'Wie viel kostet der Kurs?'},
    ],
    check:[
      {kind:'meaning',prompt:'Какие три пункта нужно раскрыть?',options:['зачем пишем · дни занятий · цена','имя · адрес · телефон','погода · дорога · отель'],correct:0},
      {kind:'build',prompt:'Собери начало одного пункта.',target:['Ich','möchte','mich','für','den','Tenniskurs','anmelden.'],full:'Ich möchte mich für den Tenniskurs anmelden.'},
      {kind:'type',prompt:'Напиши: «Сколько стоит курс?»',answer:'Wie viel kostet der Kurs?'},
      {kind:'speak',prompt:'Скажи вопрос о цене вслух.',text:'Wie viel kostet der Kurs?'},
    ],
  },
  sprechen:{
    id:'sprechen',
    title:'Sprechen',
    subtitle:'Teil 3 · Karte Butter',
    scene:'exam',
    taskId:'sprechen-t3-01',
    intro:[
      'Sprechen — устная часть.',
      'Здесь нужно уметь задать вопрос, ответить, сформулировать просьбу и отреагировать на просьбу.',
      'В этом примере учимся строить просьбу по карточке Butter и коротко отвечать на такую просьбу.',
    ],
    vocab:[
      {de:'Können',ru:'можете',example:'Können Sie …?',key:true},
      {de:'Sie',ru:'Вы (вежливо)',example:'Können Sie …?'},
      {de:'mir',ru:'мне',example:'Können Sie mir …?'},
      {de:'bitte',ru:'пожалуйста',example:'Können Sie mir bitte …?',key:true},
      {de:'die Butter',ru:'масло',example:'die Butter',key:true},
      {de:'geben',ru:'дать',example:'die Butter geben',key:true},
      {de:'Ja',ru:'да',example:'Ja, natürlich.'},
      {de:'natürlich',ru:'конечно',example:'Ja, natürlich.'},
      {de:'Hier bitte',ru:'Вот, пожалуйста',example:'Hier bitte.',key:true},
      {de:'bitten',ru:'просить',example:'Bitten formulieren'},
      {de:'formulieren',ru:'сформулировать',example:'Bitten formulieren'},
      {de:'reagieren',ru:'отреагировать',example:'auf eine Bitte reagieren'},
    ],
    drills:[
      {kind:'structure',sentence:'Können Sie mir bitte die Butter geben?',translation:'Можете Вы мне, пожалуйста, дать масло?',parts:[{text:'Können Sie',label:'можете Вы — вежливое начало'},{text:'mir bitte',label:'мне, пожалуйста'},{text:'die Butter',label:'что — масло'},{text:'geben?',label:'дать — действие в конце'}]},
      {kind:'build',prompt:'Собери вежливую просьбу.',target:['Können','Sie','mir','bitte','die','Butter','geben?'],full:'Können Sie mir bitte die Butter geben?'},
      {kind:'speak',prompt:'Произнеси просьбу по образцу.',text:'Können Sie mir bitte die Butter geben?'},
      {kind:'meaning',prompt:'Что означает эта просьба?',options:['Можете дать мне, пожалуйста, масло?','Вы любите масло?','Где купить масло?'],correct:0},
      {kind:'build',prompt:'Собери короткую реакцию.',target:['Ja,','natürlich.','Hier','bitte.'],full:'Ja, natürlich. Hier bitte.'},
      {kind:'speak',prompt:'Произнеси ответ на просьбу.',text:'Ja, natürlich. Hier bitte.'},
      {kind:'type',prompt:'Напиши самостоятельно просьбу про масло.',answer:'Können Sie mir bitte die Butter geben?'},
    ],
    check:[
      {kind:'meaning',prompt:'Какое слово делает просьбу вежливее?',options:['bitte','Butter','hier'],correct:0},
      {kind:'build',prompt:'Собери просьбу ещё раз.',target:['Können','Sie','mir','bitte','die','Butter','geben?'],full:'Können Sie mir bitte die Butter geben?'},
      {kind:'speak',prompt:'Скажи просьбу без подсказки.',text:'Können Sie mir bitte die Butter geben?'},
      {kind:'meaning',prompt:'Как можно коротко ответить положительно?',options:['Ja, natürlich.','Nein, Bahnhof.','Wann?'],correct:0},
    ],
  },
};

type Phase = 'learn'|'meaning'|'listen'|'type'|'speak';
type LearningAction = { unitIndex:number; phase:Phase };

function buildLearningSequence(lesson:Lesson):LearningAction[]{
  const result:LearningAction[]=[];
  const chunkSize=3;
  for(let start=0;start<lesson.vocab.length;start+=chunkSize){
    const indexes=lesson.vocab.slice(start,start+chunkSize).map((_,offset)=>start+offset);
    // 2-3 new items, then mixed retrieval. One screen = one action.
    for(const unitIndex of indexes)result.push({unitIndex,phase:'learn'});
    for(const unitIndex of indexes)result.push({unitIndex,phase:'meaning'});
    // Listening returns after the meaning task, not immediately after the card.
    for(const unitIndex of [...indexes].reverse()){
      const unit=lesson.vocab[unitIndex];
      if(unit.key||unitIndex%2===0)result.push({unitIndex,phase:'listen'});
    }
    // Key language must also be produced from memory.
    for(const unitIndex of indexes){
      if(!lesson.vocab[unitIndex].key)continue;
      result.push({unitIndex,phase:unitIndex%2===0?'type':'speak'});
    }
  }
  return result;
}

function speakGerman(text:string){
  const clean=text.trim();
  if(!clean||/[А-Яа-яЁё]/.test(clean))return;
  const api=(window as Window&{OttoSpeech?:{play?:(value:string,options?:{mode?:'normal'|'slow'})=>Promise<boolean>}}).OttoSpeech;
  if(api?.play){void api.play(clean,{mode:'normal'});return}
  if(!('speechSynthesis' in window))return;
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(clean);
  u.lang='de-DE';
  u.rate=.84;
  window.speechSynthesis.speak(u);
}

function normalize(value:string){
  return value.toLocaleLowerCase('de-DE').replace(/[.,!?;:„“"'’]/g,'').replace(/\s+/g,' ').trim();
}

function normalizeSoft(value:string){
  return normalize(value)
    .replace(/ä/g,'a').replace(/ae/g,'a')
    .replace(/ö/g,'o').replace(/oe/g,'o')
    .replace(/ü/g,'u').replace(/ue/g,'u')
    .replace(/ß/g,'ss');
}

function learningTextResult(actual:string,expected:string){
  if(normalize(actual)===normalize(expected))return 'ok';
  if(normalizeSoft(actual)===normalizeSoft(expected))return 'soft';
  return 'bad';
}

function moduleIcon(id:ModuleId){
  if(id==='horen')return Headphones;
  if(id==='lesen')return BookOpen;
  if(id==='schreiben')return PenTool;
  return Mic;
}

export function TaskLinkedLearningPreview(){
  const[module,setModule]=useState<ModuleId|null>(null);
  const[stage,setStage]=useState<'home'|'moduleIntro'|'vocab'|'drills'|'check'|'ready'|'exam'>('home');
  const[learningIndex,setLearningIndex]=useState(0);
  const[drillIndex,setDrillIndex]=useState(0);
  const[checkIndex,setCheckIndex]=useState(0);
  const[feedback,setFeedback]=useState('');
  const[typed,setTyped]=useState('');
  const[spokenScore,setSpokenScore]=useState<number|null>(null);
  const[tiles,setTiles]=useState<string[]>([]);
  const[knownUnits,setKnownUnits]=useState<Set<number>>(()=>new Set());
  const[examAnswers,setExamAnswers]=useState<Record<string,string>>({});
  const lesson=module?LESSONS[module]:null;
  const learningSequence=useMemo(()=>lesson?buildLearningSequence(lesson):[],[lesson]);

  const totalMicroSteps=lesson?learningSequence.length+lesson.drills.length+lesson.check.length+3:1;
  const currentMicroStep=lesson
    ? stage==='moduleIntro'
      ? 0
      : stage==='vocab'
        ? 1+learningIndex
        : stage==='drills'
          ? 1+learningSequence.length+drillIndex
          : stage==='check'
            ? 1+learningSequence.length+lesson.drills.length+checkIndex
            : stage==='ready'
              ? totalMicroSteps-2
              : stage==='exam'
                ? totalMicroSteps-1
                : 0
    :0;

  const resetExercise=()=>{
    setFeedback('');
    setTyped('');
    setSpokenScore(null);
    setTiles([]);
  };

  const firstUnskippedAction=(from:number,known=knownUnits)=>{
    for(let i=from;i<learningSequence.length;i+=1){
      if(!known.has(learningSequence[i].unitIndex))return i;
    }
    return -1;
  };

  const openLesson=(id:ModuleId)=>{
    setModule(id);
    setStage('moduleIntro');
    setLearningIndex(0);
    setDrillIndex(0);
    setCheckIndex(0);
    setKnownUnits(new Set());
    setExamAnswers({});
    resetExercise();
    window.scrollTo({top:0});
  };

  const startPreparation=()=>{
    const first=firstUnskippedAction(0,new Set());
    if(first<0){setStage('drills');setDrillIndex(0)}
    else{setStage('vocab');setLearningIndex(first)}
    resetExercise();
  };

  const nextPhase=()=>{
    if(!lesson)return;
    resetExercise();
    const next=firstUnskippedAction(learningIndex+1);
    if(next>=0){setLearningIndex(next);return}
    setStage('drills');
    setDrillIndex(0);
  };

  const markKnown=()=>{
    if(!lesson||!learningSequence[learningIndex])return;
    const unitIndex=learningSequence[learningIndex].unitIndex;
    const nextKnown=new Set(knownUnits);
    nextKnown.add(unitIndex);
    setKnownUnits(nextKnown);
    resetExercise();
    const next=firstUnskippedAction(learningIndex+1,nextKnown);
    if(next>=0){setLearningIndex(next);return}
    setStage('drills');
    setDrillIndex(0);
  };

  const nextDrill=()=>{
    if(!lesson)return;
    resetExercise();
    if(drillIndex<lesson.drills.length-1)setDrillIndex(v=>v+1);
    else{setStage('check');setCheckIndex(0)}
  };

  const nextCheck=()=>{
    if(!lesson)return;
    resetExercise();
    if(checkIndex<lesson.check.length-1)setCheckIndex(v=>v+1);
    else setStage('ready');
  };

  const jumpToExam=()=>{
    resetExercise();
    setStage('exam');
    window.scrollTo({top:0});
  };

  const goToModules=()=>{
    resetExercise();
    setModule(null);
    setStage('home');
    setLearningIndex(0);
    setDrillIndex(0);
    setCheckIndex(0);
    setKnownUnits(new Set());
    setExamAnswers({});
    window.scrollTo({top:0});
  };

  const back=()=>{
    resetExercise();
    if(!lesson){setStage('home');return}
    if(stage==='exam'){setStage('ready');return}
    if(stage==='ready'){setStage('check');setCheckIndex(Math.max(0,lesson.check.length-1));return}
    if(stage==='check'){
      if(checkIndex>0){setCheckIndex(v=>v-1);return}
      setStage('drills');setDrillIndex(Math.max(0,lesson.drills.length-1));return;
    }
    if(stage==='drills'){
      if(drillIndex>0){setDrillIndex(v=>v-1);return}
      const prev=firstPreviousLearningAction(learningSequence,knownUnits,learningSequence.length-1);
      if(prev>=0){setStage('vocab');setLearningIndex(prev);return}
      setStage('moduleIntro');return;
    }
    if(stage==='vocab'){
      const prev=firstPreviousLearningAction(learningSequence,knownUnits,learningIndex-1);
      if(prev>=0){setLearningIndex(prev);return}
      setStage('moduleIntro');return;
    }
    if(stage==='moduleIntro'){setModule(null);setStage('home');return}
    setModule(null);setStage('home');
  };

  if(!lesson||stage==='home'){
    return <PreviewShell scene="home" progress={0}>
      <div className="animate-fade-in">
        <p className="otto-kicker">ОБУЧЕНИЕ С OTTO · PREVIEW</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Как устроен экзамен A1?</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">Экзамен состоит из четырёх модулей. Сейчас мы будем проходить их поэтапно: сначала OTTO подготовит к конкретному заданию, затем вы выполните это же настоящее задание самостоятельно.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ExamModuleCard icon={Headphones} title="Hören" text="Аудирование · слушаем и находим нужную информацию"/>
          <ExamModuleCard icon={BookOpen} title="Lesen" text="Чтение · ищем информацию в тексте"/>
          <ExamModuleCard icon={PenTool} title="Schreiben" text="Письмо · понимаем ситуацию и строим короткое письмо"/>
          <ExamModuleCard icon={Mic} title="Sprechen" text="Устная часть · вопросы, ответы и просьбы"/>
        </div>
        <div className="mt-5 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-950">В дальнейшем модули можно будет тренировать отдельно и в любой последовательности. Существующий режим «Тренировка перед экзаменом» остаётся без изменений.</div>
        <p className="mt-7 font-black text-slate-950">Выберите полноценный сценарий preview</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(Object.keys(LESSONS) as ModuleId[]).map(id=>{
            const item=LESSONS[id];
            const Icon=moduleIcon(id);
            return <button key={id} onClick={()=>openLesson(id)} className="group flex min-h-[112px] items-center gap-4 rounded-[22px] border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50"><Icon className="h-6 w-6 text-teal-700"/></span>
              <span className="min-w-0"><b className="block text-lg text-slate-950">{item.title}</b><span className="mt-1 block text-sm leading-5 text-slate-500">{item.subtitle}</span><span className="mt-1 block text-xs font-bold text-teal-700">{item.vocab.length} слов/фраз + конструкции + итоговая проверка</span></span>
              <ArrowRight className="ml-auto h-5 w-5 text-slate-300 group-hover:text-teal-700"/>
            </button>
          })}
        </div>
        <p className="mt-5 text-xs leading-5 text-slate-500">Preview не записывает учебный прогресс в аккаунт. Production, user_id, результаты и история пользователей не меняются.</p>
      </div>
    </PreviewShell>
  }

  const progress=Math.max(0,Math.min(1,(currentMicroStep+1)/totalMicroSteps));

  return <PreviewShell scene={lesson.scene} progress={progress}>
    <div className="animate-fade-in">
      <div className="mb-5 flex items-start gap-3">
        <button type="button" onClick={back} aria-label="Назад" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white"><ArrowLeft className="h-5 w-5"/></button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="otto-kicker">{lesson.title} · {lesson.taskId}</p>
              <h1 className="mt-1 text-2xl font-black text-slate-950">{lesson.subtitle}</h1>
            </div>
            <button type="button" onClick={goToModules} className="min-h-10 rounded-xl border bg-white px-4 text-sm font-bold text-slate-700">К модулям</button>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-teal-600 transition-all" style={{width:String(progress*100)+'%'}}/></div>
        </div>
      </div>

      {stage!=='exam'&&stage!=='ready'&&<div className="mb-5 flex flex-col gap-2 rounded-2xl border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div><b className="text-sm text-slate-900">Уже всё понятно?</b><p className="text-xs text-slate-500">Если все слова знакомы и вы чувствуете, что готовы.</p></div>
        <button type="button" onClick={jumpToExam} className="min-h-10 shrink-0 rounded-xl border border-teal-200 bg-teal-50 px-4 text-sm font-bold text-teal-800">Сразу к заданию</button>
      </div>}

      {stage==='moduleIntro'&&<ModuleIntro lesson={lesson} onStart={startPreparation} onExam={jumpToExam}/>} 

      {stage==='vocab'&&learningSequence[learningIndex]&&<VocabularyStep
        lesson={lesson}
        unit={lesson.vocab[learningSequence[learningIndex].unitIndex]}
        unitIndex={learningSequence[learningIndex].unitIndex}
        phase={learningSequence[learningIndex].phase}
        feedback={feedback}
        typed={typed}
        spokenScore={spokenScore}
        onFeedback={setFeedback}
        onTyped={setTyped}
        onSpokenScore={setSpokenScore}
        onNext={nextPhase}
        onKnown={markKnown}
      />}

      {stage==='drills'&&<DrillStep
        drill={lesson.drills[drillIndex]}
        index={drillIndex}
        total={lesson.drills.length}
        tiles={tiles}
        typed={typed}
        feedback={feedback}
        spokenScore={spokenScore}
        onTiles={setTiles}
        onTyped={setTyped}
        onFeedback={setFeedback}
        onSpokenScore={setSpokenScore}
        onNext={nextDrill}
      />}

      {stage==='check'&&<div>
        <div className="mb-4 rounded-2xl bg-teal-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-teal-700">Итоговая проверка</p><p className="mt-1 text-sm leading-6 text-slate-700">Перед настоящим заданием быстро проверим, что нужный язык действительно достаётся из памяти без подсказки.</p></div>
        <DrillStep
          drill={lesson.check[checkIndex]}
          index={checkIndex}
          total={lesson.check.length}
          tiles={tiles}
          typed={typed}
          feedback={feedback}
          spokenScore={spokenScore}
          onTiles={setTiles}
          onTyped={setTyped}
          onFeedback={setFeedback}
          onSpokenScore={setSpokenScore}
          onNext={nextCheck}
        />
      </div>}

      {stage==='ready'&&<ReadyStep lesson={lesson} onNext={jumpToExam}/>}
      {stage==='exam'&&<ExamStep lesson={lesson} answers={examAnswers} setAnswers={setExamAnswers}/>}
    </div>
  </PreviewShell>
}

function firstPreviousLearningAction(sequence:LearningAction[],known:Set<number>,from:number){
  for(let i=from;i>=0;i-=1)if(!known.has(sequence[i].unitIndex))return i;
  return -1;
}

function ExamModuleCard({icon:Icon,title,text}:{icon:typeof Headphones;title:string;text:string}){
  return <div className="flex items-start gap-3 rounded-2xl border bg-white p-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50"><Icon className="h-5 w-5 text-teal-700"/></span><div><b className="text-slate-950">{title}</b><p className="mt-1 text-sm leading-5 text-slate-500">{text}</p></div></div>
}

function ModuleIntro({lesson,onStart,onExam}:{lesson:Lesson;onStart:()=>void;onExam:()=>void}){
  return <section>
    <p className="text-xs font-black uppercase tracking-wider text-teal-700">Первый вход в модуль</p>
    <h2 className="mt-2 text-3xl font-black text-slate-950">{lesson.title}: что здесь нужно делать</h2>
    <div className="mt-5 space-y-3">{lesson.intro.map((line,i)=><div key={line} className="flex gap-3 rounded-2xl border bg-white p-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-black text-teal-800">{i+1}</span><p className="text-sm leading-6 text-slate-700">{line}</p></div>)}</div>

    {lesson.id==='schreiben'&&<SchreibenFirstLetterIntro/>}

    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <button onClick={onExam} className="min-h-12 rounded-xl border border-teal-200 bg-teal-50 px-5 font-bold text-teal-800">Сразу к заданию</button>
      <button onClick={onStart} className="min-h-12 rounded-xl bg-slate-900 px-5 font-bold text-white">Начать подготовку</button>
    </div>
  </section>
}

function SchreibenFirstLetterIntro(){
  return <div className="mt-6 space-y-4">
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
      <p className="text-xs font-black uppercase tracking-wider text-sky-700">Именно это первое письмо</p>
      <p className="mt-2 text-lg font-black text-slate-950">Sie möchten einen Tenniskurs besuchen. Schreiben Sie an den Sportverein.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-3 font-bold">1. Warum?</div>
        <div className="rounded-xl bg-white p-3 font-bold">2. An welchen Tagen?</div>
        <div className="rounded-xl bg-white p-3 font-bold">3. Preis.</div>
      </div>
    </div>

    <div className="rounded-2xl border bg-white p-4">
      <p className="text-xs font-black uppercase tracking-wider text-teal-700">Что это за письмо?</p>
      <h3 className="mt-1 text-xl font-black">Официальное письмо</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">Мы пишем не другу, а в спортивный клуб. Поэтому используем официальный шаблон письма: обращение → ответы на 3 пункта → финальная фраза → прощание → имя.</p>
    </div>

    <div className="grid gap-3">
      <div className="rounded-2xl border bg-white p-4">
        <p className="text-xs font-black uppercase tracking-wider text-teal-700">Пункт 1 · Warum?</p>
        <p className="mt-1 font-black text-slate-950">Нужно объяснить, зачем вы пишете.</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">В этом письме смысл такой: вы хотите записаться / посещать теннисный курс. Мы отдельно выучим нужные слова и потом сами соберём эту фразу из частей.</p>
      </div>
      <div className="rounded-2xl border bg-white p-4">
        <p className="text-xs font-black uppercase tracking-wider text-teal-700">Пункт 2 · An welchen Tagen?</p>
        <p className="mt-1 font-black text-slate-950">Нужно спросить, в какие дни проходит курс.</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">Сначала разберём слова <b>An welchen Tagen</b>, потом порядок слов в вопросе, затем соберём вопрос самостоятельно.</p>
      </div>
      <div className="rounded-2xl border bg-white p-4">
        <p className="text-xs font-black uppercase tracking-wider text-teal-700">Пункт 3 · Preis</p>
        <p className="mt-1 font-black text-slate-950">Нужно спросить цену курса.</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">Для этого понадобится конструкция <b>Wie viel kostet …?</b>. Мы её не даём как готовый ответ для копирования: сначала разберём, соберём из слов, произнесём и потом напишем самостоятельно.</p>
      </div>
    </div>

    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="font-black text-amber-950">Важно</p>
      <p className="mt-1 text-sm leading-6 text-amber-900">OTTO не показывает готовое письмо целиком. Задача подготовки — научить вас самостоятельно ответить на каждый из трёх пунктов и собрать письмо по знакомому официальному шаблону.</p>
    </div>
  </div>
}

function PreviewShell({scene,progress,children}:{scene:OttoSceneName;progress:number;children:ReactNode}){
  return <main className="telegram-app otto-skin h-[100dvh] w-full overflow-y-auto overflow-x-hidden">
    <div className="otto-backdrop"><div className="otto-glow otto-glow-a"/><div className="otto-glow otto-glow-b"/><div className="otto-line-art"/></div>
    <div className="relative z-10 mx-auto grid min-h-full w-full max-w-[1440px] grid-cols-1 gap-6 px-4 py-5 lg:grid-cols-[minmax(280px,.78fr)_minmax(620px,1.22fr)] lg:items-center lg:px-10 lg:py-8">
      <aside className="hidden lg:block">
        <p className="otto-kicker">OTTO · ИНТЕРАКТИВНОЕ PREVIEW</p>
        <h2 className="mt-3 max-w-xl text-5xl font-black leading-[1.02] tracking-tight text-slate-950">Сначала понять и закрепить. Потом — настоящее задание.</h2>
        <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">Один экран — одно действие. Внешний вид, сцены OTTO, немецкая озвучка и проверка произношения берутся из текущего приложения.</p>
        <OttoScene scene={scene} eager className="mt-3 h-[360px] w-auto max-w-full"/>
      </aside>
      <section className="min-w-0 rounded-[30px] border border-white/90 bg-[#fffdfc]/95 p-4 shadow-[0_24px_70px_rgba(16,42,58,.12)] sm:p-6 lg:p-8">
        <div className="mb-5 flex items-center gap-3 lg:hidden"><OttoScene scene={scene} eager className="h-16 w-16 shrink-0 rounded-2xl bg-teal-50 object-contain"/><div className="min-w-0 flex-1"><b className="text-slate-950">OTTO · Preview</b><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-teal-600" style={{width:String(progress*100)+'%'}}/></div></div></div>
        {children}
      </section>
    </div>
  </main>
}

function VocabularyStep({lesson,unit,unitIndex,phase,feedback,typed,spokenScore,onFeedback,onTyped,onSpokenScore,onNext,onKnown}:{
  lesson:Lesson;unit:VocabUnit;unitIndex:number;phase:Phase;feedback:string;typed:string;spokenScore:number|null;
  onFeedback:(v:string)=>void;onTyped:(v:string)=>void;onSpokenScore:(v:number)=>void;onNext:()=>void;onKnown:()=>void;
}){
  const others=useMemo(()=>lesson.vocab.filter(v=>v.de!==unit.de),[lesson,unit.de]);
  const meaningOptions=useMemo(()=>{
    const distractors=others.map(v=>v.ru).filter((v,i,a)=>a.indexOf(v)===i).slice(Math.max(0,unitIndex%Math.max(1,others.length-2)),Math.max(0,unitIndex%Math.max(1,others.length-2))+2);
    return [unit.ru,...distractors].sort((a,b)=>a.length-b.length);
  },[others,unit.ru,unitIndex]);
  const listenOptions=useMemo(()=>{
    const distractors=others.map(v=>v.de).filter((v,i,a)=>a.indexOf(v)===i).slice(Math.max(0,unitIndex%Math.max(1,others.length-2)),Math.max(0,unitIndex%Math.max(1,others.length-2))+2);
    return [unit.de,...distractors].sort((a,b)=>a.length-b.length);
  },[others,unit.de,unitIndex]);

  const retry=()=>{onFeedback('');onTyped('')};
  const correctFeedback=<div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">Хорошо ✓</div>;

  return <section>
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-black uppercase tracking-wider text-teal-700">Материал {unitIndex+1} из {lesson.vocab.length} · повтор позже</p>
      <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">{phaseLabel(phase)}</span>
    </div>

    {phase==='learn'&&<>
      <h2 className="mt-5 text-center text-4xl font-black text-slate-950 sm:text-5xl">{unit.de}</h2>
      <p className="mt-3 text-center text-xl font-bold text-slate-600">{unit.ru}</p>
      <div className="mt-5 flex justify-center"><button onClick={()=>speakGerman(unit.de)} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-5 font-bold text-teal-800"><Volume2 className="h-5 w-5"/>Послушать</button></div>
      <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-center"><p className="text-sm text-slate-500">В контексте следующего задания</p><p className="mt-1 text-lg font-bold text-slate-900">{unit.example}</p>{unit.note&&<p className="mt-2 text-sm leading-6 text-slate-600">{unit.note}</p>}</div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><button onClick={onKnown} className="min-h-12 rounded-xl border bg-white px-5 font-bold text-slate-700">Я это слово знаю</button><button onClick={onNext} className="min-h-12 rounded-xl bg-slate-900 px-5 font-bold text-white">Учить дальше</button></div>
      <p className="mt-2 text-center text-xs text-slate-400">Если отметить знакомым, отдельный цикл пропускается, но слово всё равно останется в предложениях и итоговой проверке.</p>
    </>}

    {phase==='meaning'&&<>
      <h2 className="mt-5 text-3xl font-black">Что означает?</h2>
      <p className="mt-4 text-center text-4xl font-black text-slate-950">{unit.de}</p>
      <div className="mt-6 grid gap-3">{meaningOptions.map(option=><button key={option} disabled={Boolean(feedback)} onClick={()=>onFeedback(option===unit.ru?'ok':'bad')} className={cn('min-h-14 rounded-xl border-2 bg-white px-4 text-left font-bold',feedback==='ok'&&option===unit.ru?'border-emerald-500 bg-emerald-50':'border-slate-200')}>{option}</button>)}</div>
      {feedback==='ok'&&<>{correctFeedback}<Next onClick={onNext}/></>}
      {feedback==='bad'&&<RetryBox onRetry={retry} hint={<><b>{unit.de}</b> = {unit.ru}</>}/>}
    </>}

    {phase==='listen'&&<>
      <h2 className="mt-5 text-3xl font-black">Что ты услышал?</h2>
      <p className="mt-2 text-slate-500">Текст скрыт. Сначала только звук.</p>
      <button onClick={()=>speakGerman(unit.de)} className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg"><Volume2 className="h-8 w-8"/></button>
      <div className="mt-6 grid gap-3">{listenOptions.map(option=><button key={option} disabled={Boolean(feedback)} onClick={()=>onFeedback(option===unit.de?'ok':'bad')} className={cn('min-h-14 rounded-xl border-2 bg-white px-4 text-left font-bold',feedback==='ok'&&option===unit.de?'border-emerald-500 bg-emerald-50':'border-slate-200')}>{option}</button>)}</div>
      {feedback==='ok'&&<>{correctFeedback}<Next onClick={onNext}/></>}
      {feedback==='bad'&&<RetryBox onRetry={retry} hint={<>Нажми 🔊 ещё раз и попробуй услышать знакомое слово.</>}/>}
    </>}

    {phase==='type'&&<>
      <h2 className="mt-5 text-3xl font-black">Напиши по-немецки</h2>
      <p className="mt-3 text-xl font-bold text-slate-700">{unit.ru}</p>
      <input value={typed} onChange={e=>onTyped(e.target.value)} autoComplete="off" className="mt-5 min-h-14 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-lg outline-none focus:border-teal-500" placeholder="Напиши сам"/>
      <button onClick={()=>onFeedback(learningTextResult(typed,unit.de))} className="mt-4 min-h-12 w-full rounded-xl bg-slate-900 px-5 font-bold text-white">Проверить</button>
      {feedback==='ok'&&<>{correctFeedback}<Next onClick={onNext}/></>}
      {feedback==='soft'&&<><div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><b>Верно по смыслу ✓</b><p className="mt-1 text-sm">Правильное написание: <b>{unit.de}</b></p></div><Next onClick={onNext}/></>}
      {feedback==='bad'&&<RetryBox onRetry={retry} hint={<>Послушай ещё раз: <button className="font-black underline" onClick={()=>speakGerman(unit.de)}>🔊 {unit.de}</button>. Затем напиши самостоятельно.</>}/>}
    </>}

    {phase==='speak'&&<>
      <h2 className="mt-5 text-3xl font-black">Произнеси</h2>
      <p className="mt-3 text-xl font-bold text-slate-900">{unit.de}</p>
      <button onClick={()=>speakGerman(unit.de)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 font-bold text-teal-800"><Volume2 className="h-4 w-4"/>Послушать образец</button>
      <div className="mt-5"><VoiceRecorder evaluation={{mode:'phrase',expectedText:unit.de}} hint={'Произнеси: '+unit.de} onPracticed={()=>{}} onEvaluated={onSpokenScore}/></div>
      {spokenScore!==null&&spokenScore>=60&&<>{correctFeedback}<Next onClick={onNext}/></>}
      {spokenScore!==null&&spokenScore<60&&<div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">Давай попробуем ещё раз. Сначала послушай образец, затем нажми «Перезаписать» в блоке OTTO.</div>}
    </>}
  </section>
}

function DrillStep({drill,index,total,tiles,typed,feedback,spokenScore,onTiles,onTyped,onFeedback,onSpokenScore,onNext}:{
  drill:Drill;index:number;total:number;tiles:string[];typed:string;feedback:string;spokenScore?:number|null;
  onTiles:(v:string[])=>void;onTyped:(v:string)=>void;onFeedback:(v:string)=>void;onSpokenScore?:(v:number)=>void;onNext:()=>void;
}){
  const retry=()=>{onFeedback('');onTyped('');onTiles([])};

  if(drill.kind==='structure'){
    return <section>
      <p className="text-xs font-black uppercase tracking-wider text-teal-700">Структура предложения {index+1} из {total}</p>
      <h2 className="mt-4 text-3xl font-black">{drill.sentence}</h2>
      <p className="mt-2 text-lg text-slate-600">{drill.translation}</p>
      <button onClick={()=>speakGerman(drill.sentence)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 font-bold text-teal-800"><Volume2 className="h-4 w-4"/>Послушать всё предложение</button>
      <div className="mt-5 grid gap-3">{drill.parts.map(part=><div key={part.text} className="rounded-2xl border bg-slate-50 p-4"><b className="text-slate-950">{part.text}</b><p className="mt-1 text-sm text-slate-600">{part.label}</p></div>)}</div>
      <p className="mt-4 text-sm leading-6 text-slate-500">Без сложных терминов: просто смотри, какая часть за что отвечает и в каком порядке она стоит.</p>
      <Next onClick={onNext}/>
    </section>
  }

  if(drill.kind==='speak'){
    return <section>
      <p className="text-xs font-black uppercase tracking-wider text-teal-700">Произношение {index+1} из {total}</p>
      <h2 className="mt-4 text-3xl font-black">{drill.prompt}</h2>
      <button onClick={()=>speakGerman(drill.text)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 font-bold text-teal-800"><Volume2 className="h-4 w-4"/>Послушать фразу</button>
      <div className="mt-5"><VoiceRecorder evaluation={{mode:'phrase',expectedText:drill.text}} hint="Скажи фразу самостоятельно." onPracticed={()=>{}} onEvaluated={score=>onSpokenScore?.(score)}/></div>
      {spokenScore!==undefined&&spokenScore!==null&&spokenScore>=60&&<><Success/><Next onClick={onNext}/></>}
      {spokenScore!==undefined&&spokenScore!==null&&spokenScore<60&&<div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">Давай попробуем ещё раз: послушай фразу и перезапиши ответ.</div>}
    </section>
  }

  if(drill.kind==='build'){
    const pool=[...drill.target].sort((a,b)=>a.length-b.length);
    const result=tiles.join(' ');
    return <section>
      <p className="text-xs font-black uppercase tracking-wider text-teal-700">Собери предложение {index+1} из {total}</p>
      <h2 className="mt-4 text-3xl font-black">{drill.prompt}</h2>
      <div className="mt-5 min-h-[76px] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-3">{tiles.length?tiles.map((t,i)=><span key={String(i)+t} className="mr-2 inline-block rounded-xl bg-white px-3 py-2 font-bold shadow-sm">{t}</span>):<span className="text-sm text-slate-400">Нажимай слова по порядку</span>}</div>
      <div className="mt-4 flex flex-wrap gap-2">{pool.map((word,i)=>{const used=tiles.filter(v=>v===word).length>=pool.slice(0,i+1).filter(v=>v===word).length;return <button key={String(i)+word} disabled={used||Boolean(feedback)} onClick={()=>onTiles([...tiles,word])} className="rounded-xl border bg-white px-3 py-2 font-bold disabled:opacity-30">{word}</button>})}</div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2"><button onClick={()=>{onTiles([]);onFeedback('')}} className="min-h-11 rounded-xl border bg-white px-4 font-bold"><RotateCcw className="mr-2 inline h-4 w-4"/>Сначала</button><button onClick={()=>onFeedback(result===drill.target.join(' ')?'ok':'bad')} className="min-h-11 rounded-xl bg-slate-900 px-4 font-bold text-white">Проверить</button></div>
      {feedback==='ok'&&<><Success/><button onClick={()=>speakGerman(drill.full)} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 font-bold text-teal-800"><Volume2 className="h-4 w-4"/>Прослушать собранное</button><Next onClick={onNext}/></>}
      {feedback==='bad'&&<RetryBox onRetry={retry} hint={<>Порядок пока не сложился. Посмотри на смысл фразы и собери ещё раз.</>}/>}
    </section>
  }

  if(drill.kind==='meaning'){
    return <section>
      <p className="text-xs font-black uppercase tracking-wider text-teal-700">Проверка понимания {index+1} из {total}</p>
      <h2 className="mt-4 text-3xl font-black">{drill.prompt}</h2>
      <div className="mt-5 grid gap-3">{drill.options.map((option,i)=><button key={option} disabled={Boolean(feedback)} onClick={()=>onFeedback(i===drill.correct?'ok':'bad')} className={cn('min-h-14 rounded-xl border-2 bg-white px-4 text-left font-bold',feedback==='ok'&&i===drill.correct?'border-emerald-500 bg-emerald-50':'border-slate-200')}>{option}</button>)}</div>
      {feedback==='ok'&&<><Success/><Next onClick={onNext}/></>}
      {feedback==='bad'&&<RetryBox onRetry={retry}/>}
    </section>
  }

  const expected=drill.answer;
  const display=drill.kind==='blank'?drill.display:null;
  return <section>
    <p className="text-xs font-black uppercase tracking-wider text-teal-700">{drill.kind==='blank'?'Вставь пропуск':'Напиши самостоятельно'} · {index+1} из {total}</p>
    <h2 className="mt-4 text-3xl font-black">{drill.prompt}</h2>
    {display&&<div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xl font-black text-slate-900">{display}</div>}
    <input value={typed} onChange={e=>onTyped(e.target.value)} className="mt-5 min-h-14 w-full rounded-xl border-2 border-slate-200 px-4 text-lg outline-none focus:border-teal-500"/>
    <button onClick={()=>onFeedback(learningTextResult(typed,expected))} className="mt-4 min-h-12 w-full rounded-xl bg-slate-900 px-5 font-bold text-white">Проверить</button>
    {feedback==='ok'&&<><Success/><Next onClick={onNext}/></>}
    {feedback==='soft'&&<><div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><b>Верно по смыслу ✓</b><p className="mt-1 text-sm">Правильное написание: <b>{expected}</b></p></div><Next onClick={onNext}/></>}
    {feedback==='bad'&&<RetryBox onRetry={retry} hint={<>Проверь знакомые части фразы и попробуй написать ещё раз.</>}/>}
  </section>
}

function RetryBox({onRetry,hint}:{onRetry:()=>void;hint?:ReactNode}){
  return <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><p className="font-semibold">{hint||'Пока не получилось. Коротко повторим только этот элемент.'}</p><button type="button" onClick={onRetry} className="mt-3 min-h-10 rounded-xl border border-amber-300 bg-white px-4 font-bold text-amber-900">Попробовать снова</button></div>
}

function ReadyStep({lesson,onNext}:{lesson:Lesson;onNext:()=>void}){
  return <section className="text-center">
    <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600"/>
    <p className="mt-4 text-xs font-black uppercase tracking-wider text-teal-700">Допуск к заданию</p>
    <h2 className="mt-2 text-3xl font-black">Ты готов к этому заданию</h2>
    <p className="mx-auto mt-3 max-w-xl text-slate-600">Ты прошёл все {lesson.vocab.length} нужных слов/единиц, услышал их, распознал, написал, произнёс с проверкой OTTO и использовал в конструкциях. Теперь правильный ответ не подсказывается.</p>
    <button onClick={onNext} className="mt-6 inline-flex min-h-14 items-center gap-2 rounded-xl bg-teal-700 px-7 font-black text-white">Перейти к настоящему {lesson.title}<ArrowRight className="h-5 w-5"/></button>
  </section>
}

function ExamStep({lesson,answers,setAnswers}:{lesson:Lesson;answers:Record<string,string>;setAnswers:(v:Record<string,string>)=>void}){
  if(lesson.id==='horen')return <HorenExam answers={answers} setAnswers={setAnswers}/>;
  if(lesson.id==='lesen')return <LesenExam answers={answers} setAnswers={setAnswers}/>;
  if(lesson.id==='schreiben')return <SchreibenExam/>;
  return <SprechenExam/>;
}

function HorenExam({answers,setAnswers}:{answers:Record<string,string>;setAnswers:(v:Record<string,string>)=>void}){
  const selected=answers.horen;
  const checked=answers.horenChecked==='1';
  const correct=selected==='1';
  return <section>
    <p className="otto-kicker">СУЩЕСТВУЮЩЕЕ ЗАДАНИЕ OTTO · HÖREN</p>
    <div className="mt-4 overflow-hidden rounded-3xl border border-sky-200 bg-white shadow-sm">
      <div className="border-b bg-sky-50 p-5"><p className="text-xs font-black uppercase tracking-wider text-sky-700">Aufgabe 1</p><h2 className="mt-1 text-2xl font-black">Telefonnachricht</h2></div>
      <div className="space-y-5 p-5">
        <p className="rounded-xl bg-slate-50 p-4 font-semibold">Sie hören einen kurzen Text. Lesen Sie zuerst die Aufgabe. Hören Sie dann den Text.</p>
        <audio src="/audio/001.mp3" controls preload="metadata" className="w-full"/>
        <img src="/images/001.png?v=20260914-2" alt="Aufgabe 1" className="mx-auto max-h-[360px] w-full max-w-lg rounded-2xl object-contain"/>
        <p className="text-xl font-black">Wann treffen sich Anna und Julia?</p>
        <div className="grid gap-3">{['um fünf Uhr','um sechs Uhr','um sieben Uhr'].map((o,i)=><button key={o} disabled={checked} onClick={()=>setAnswers({...answers,horen:String(i)})} className={cn('min-h-14 rounded-xl border-2 px-4 text-left font-bold',selected===String(i)?'border-sky-500 bg-sky-50':'border-slate-200 bg-white')}>{String.fromCharCode(65+i)}. {o}</button>)}</div>
        {!checked&&<button disabled={selected===undefined} onClick={()=>setAnswers({...answers,horenChecked:'1'})} className="min-h-12 w-full rounded-xl bg-slate-900 font-bold text-white disabled:opacity-40">Проверить</button>}
        {checked&&<div className={cn('rounded-2xl p-4 font-bold',correct?'bg-emerald-50 text-emerald-900':'bg-amber-50 text-amber-900')}>{correct?'Получилось ✓ Ты решил настоящее задание самостоятельно.':'Пока не получилось. В полной механике OTTO вернёт тебя только к тем словам/конструкциям, где была ошибка, затем даст попробовать это же задание ещё раз.'}</div>}
      </div>
    </div>
  </section>
}

function LesenExam({answers,setAnswers}:{answers:Record<string,string>;setAnswers:(v:Record<string,string>)=>void}){
  const questions=[
    ['Li kommt morgen in Hannover an.','1'],
    ['Der Zug kommt um Viertel vor zwölf an.','0'],
    ['Karin wartet im Hauptbahnhof.','1'],
  ];
  return <section>
    <p className="otto-kicker">СУЩЕСТВУЮЩЕЕ ЗАДАНИЕ OTTO · LESEN TEIL 1</p>
    <div className="mt-4 overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className="border-b bg-slate-50 p-5"><p className="text-xs font-black uppercase tracking-wider text-teal-700">Aufgabe 1</p><h2 className="mt-1 text-2xl font-black">E-Mail · Dein Zug</h2></div>
      <div className="p-5">
        <div className="rounded-2xl border bg-[#fffefa] p-5 leading-7 whitespace-pre-line">Hallo Li,
danke für deine Mail. Dein Zug kommt morgen um 12.36 Uhr in Hannover an. Ich bin ab 12.15 Uhr im Hauptbahnhof und warte vor der Auskunft. Du kannst mich am Vormittag auf meinem Handy erreichen.

Deine Karin</div>
        <div className="mt-5 space-y-4">{questions.map((q,i)=><div key={q[0]} className="rounded-2xl border p-4"><b>{q[0]}</b><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={()=>setAnswers({...answers,['l'+i]:'1'})} className={cn('min-h-11 rounded-xl border font-bold',answers['l'+i]==='1'?'border-teal-500 bg-teal-50':'bg-white')}>Richtig</button><button onClick={()=>setAnswers({...answers,['l'+i]:'0'})} className={cn('min-h-11 rounded-xl border font-bold',answers['l'+i]==='0'?'border-teal-500 bg-teal-50':'bg-white')}>Falsch</button></div></div>)}</div>
        <button disabled={questions.some((_,i)=>answers['l'+i]===undefined)} onClick={()=>setAnswers({...answers,lesenChecked:'1'})} className="mt-5 min-h-12 w-full rounded-xl bg-slate-900 font-bold text-white disabled:opacity-40">Проверить</button>
        {answers.lesenChecked==='1'&&<div className="mt-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-900">{questions.every((q,i)=>answers['l'+i]===q[1])?'Все три утверждения решены правильно ✓':'Есть ошибка. Полная механика вернёт только нужное слово/время/конструкцию, закрепит и снова откроет это же задание.'}</div>}
      </div>
    </div>
  </section>
}

function SchreibenExam(){
  const[text,setText]=useState('');
  return <section>
    <p className="otto-kicker">СУЩЕСТВУЮЩЕЕ ЗАДАНИЕ OTTO · SCHREIBEN TEIL 2</p>
    <div className="mt-4 rounded-3xl border bg-white p-5 shadow-sm">
      <p className="text-lg font-bold leading-7">Sie möchten einen Tenniskurs besuchen. Schreiben Sie an den Sportverein.</p>
      <ul className="mt-4 space-y-2 font-semibold"><li>• Warum?</li><li>• An welchen Tagen?</li><li>• Preis.</li></ul>
      <textarea value={text} onChange={e=>setText(e.target.value)} className="mt-5 min-h-[240px] w-full rounded-2xl border p-4 leading-7" placeholder="Schreiben Sie hier …"/>
      <p className="mt-2 text-xs text-slate-400">Preview не сохраняет текст. Здесь намеренно нет готового письма для копирования.</p>
    </div>
  </section>
}

function SprechenExam(){
  return <section>
    <p className="otto-kicker">СУЩЕСТВУЮЩАЯ КАРТОЧКА OTTO · SPRECHEN TEIL 3</p>
    <div className="mt-4 overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className="bg-slate-100 px-4 py-2 text-center text-xs font-bold uppercase tracking-[.12em] text-slate-600">Karte 1</div>
      <div className="p-5">
        <Teil3ArchiveImage imageIndex={0} alt="Butter" className="mx-auto w-full max-w-xs rounded-xl"/>
        <h2 className="mt-3 text-center text-3xl font-black">Butter</h2>
        <p className="mt-2 text-center text-sm text-slate-500">Сформулируйте просьбу и коротко отреагируйте на такую просьбу.</p>
        <div className="mt-5"><VoiceRecorder evaluation={{mode:'teil3',object:'Butter',sampleRequest:'Können Sie mir bitte die Butter geben?'}} hint="Скажите просьбу по карточке своими словами." onPracticed={()=>{}}/></div>
      </div>
    </div>
  </section>
}

function Next({onClick}:{onClick:()=>void}){return <div className="mt-5 flex justify-end"><button onClick={onClick} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-slate-900 px-6 font-bold text-white">Дальше<ArrowRight className="h-4 w-4"/></button></div>}
function Success(){return <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">Получилось ✓</div>}
function RetryText(){return <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-semibold text-amber-900">Пока не получилось. Давай ещё раз — без штрафа и без красного «НЕВЕРНО».</div>}
function phaseLabel(phase:Phase){if(phase==='learn')return'Увидеть + услышать';if(phase==='meaning')return'Понять';if(phase==='listen')return'Узнать на слух';if(phase==='type')return'Написать';return'Произнести'}
