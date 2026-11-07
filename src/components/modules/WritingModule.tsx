import { useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  CircleAlert,
  Eye,
  FileText,
  Lightbulb,
  Loader2,
  PenLine,
  Sparkles,
  X,
} from 'lucide-react';
import { schreibenTeil1Tasks } from '@/data/schreiben/teil1';
import { schreibenTeil2Tasks } from '@/data/schreiben/teil2';
import { schreibenTeil2Ru } from '@/data/schreiben/translations';
import { SchreibenTaskOverview } from '@/preview/SchreibenPracticeTools';
import { CompactTranslationEye } from '@/components/common/CompactTranslationEye';
import { HoverTranslateText } from '@/components/common/HoverTranslateText';
import { recordWritingLearning } from '@/lib/learningProfile';
import { loadUserProfile, type Gender } from '@/hooks/useUserProfile';
import { cn } from '@/lib/utils';
import { readTrainingResume, saveTrainingResume } from '@/lib/trainingResume';
import { readSchreibenLetterDrafts, writeSchreibenLetterDraft } from '@/lib/schreibenDrafts';
import { TaskList } from '@/components/common/TaskList';

interface Props {
 guest?:boolean;
  userId?: string;
  onBack: () => void;
  onComplete: (score: number, total: number, taskId?: string) => void;
  initialScreen?: Exclude<Screen, 'home'> | null;
  onTrainingRouteChange?: (detail: 'schreiben-teil1' | 'schreiben-teil2' | 'schreiben-guided' | 'schreiben-coach' | 'schreiben-solo' | null) => void;
  onTrainingComplete?: () => void;
}

type Screen = 'home' | 'list1' | 'list2' | 'teil1' | 'brief-choice' | 'guided' | 'coach' | 'solo';
type WritingMode = 'guided' | 'coach' | 'solo';

interface AiPoint {
  point: string;
  earned: 0 | 1.5 | 3;
  status: 'erfuellt' | 'teilweise' | 'fehlt';
  commentRu: string;
}

interface AiFeedback {
  score: number;
  earned: number;
  max: number;
  wordCount: number;
  contentPoints: AiPoint[];
  communication: { earned: 0 | 0.5 | 1; commentRu: string };
  feedbackRu: string;
  feedbackDe: string;
  corrections: Array<{ original: string; corrected: string; explanation: string }>;
  recognizedText?: string;
}

interface ExamplePayload {
  example: string;
  noteRu: string;
}

function norm(value: string) {
  return value.toLocaleLowerCase('de-DE')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9@]+/g, ' ').trim();
}

function matches(a: string, b: string) {
  const x = norm(a);
  const y = norm(b);
  return Boolean(x && y && (x === y || x.includes(y) || y.includes(x)));
}

function countWords(value: string) {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

function getPathStage() {
  try {
    const value = Number(localStorage.getItem('otto-schreiben-path-stage') || 1);
    return value === 2 || value === 3 ? value : 1;
  } catch {
    return 1;
  }
}

function setPathStage(value: 1 | 2 | 3) {
  try { localStorage.setItem('otto-schreiben-path-stage', String(value)); } catch { /* ignore */ }
}

function byGender(gender: Gender | undefined, female: string, male: string, neutral: string) {
  if (gender === 'female') return female;
  if (gender === 'male') return male;
  return neutral;
}

const SCHREIBEN_PROMPT_HELPERS: Readonly<Record<string, string>> = {
  'schreiben-teil2-1:0': 'Почему вы пишете в спортивный клуб?',
  'schreiben-teil2-3:1': 'Почему дочь не будет в школе?',
  'schreiben-teil2-7:1': 'Почему вы завтра придёте позже?',
  'schreiben-teil2-22:0': 'Почему сын не придёт в школу?',
  'schreiben-teil2-24:1': 'Когда будет вечеринка?',
  'schreiben-teil2-34:0': 'Когда будет пикник?',
  'schreiben-teil2-34:1': 'Где будет пикник?',
  'schreiben-teil2-37:1': 'Почему вы сегодня придёте позже?',
  'schreiben-teil2-43:1': 'Почему дочь не будет в школе?',
  'schreiben-teil2-44:0': 'Почему вы пишете в языковую школу?',
  'schreiben-teil2-47:1': 'Почему вы завтра не сможете прийти?',
  'schreiben-teil2-59:0': 'Почему сын не придёт в школу?',
  'schreiben-teil2-62:1': 'Почему вы сегодня придёте позже?',
  'schreiben-teil2-67:2': 'Когда вы хотите выпить кофе вместе?',
};

/** Only used for coached / guided Schreiben; the independent solo exam stays unchanged. */
function explainTrainingPoint(point:string,original:string,context:string){
  const prompt=point.trim().toLowerCase().replace(/[.!?]+$/u,'');
  const explanation=original.trim();
  if(/^(warum|warum schreiben sie)$/.test(prompt)){
    if(/почему.*не (?:может|сможе)|почему.*отсутств|почему.*не будет/.test(explanation.toLowerCase()))return 'Объясните причину, о которой спрашивает этот пункт. '+context;
    return 'Объясните, зачем вы пишете или по какой причине возникла ситуация: '+context;
  }
  if(/^(an welchen tagen|preis|preis\?|wann|wo)$/.test(prompt)){
    if(prompt==='an welchen tagen')return 'Спросите, в какие дни проходят занятия. '+explanation;
    if(prompt.startsWith('preis'))return 'Спросите, сколько стоит курс, товар или услуга, о которых говорится в задании. '+explanation;
    if(prompt==='wann')return 'Укажите или спросите, когда состоится событие из задания. '+explanation;
    if(prompt==='wo')return 'Укажите или спросите, где состоится событие из задания. '+explanation;
  }
  return explanation;
}

const MODE_META: Record<WritingMode, { step: string; title: string; description: string }> = {
  guided: {
    step: 'Вариант 1',
    title: 'Учусь на примере',
    description: 'Сначала разберите пример именно к этому заданию, затем закройте его и напишите письмо самостоятельно.',
  },
  coach: {
    step: 'Вариант 2',
    title: 'Пишу вместе с Отто',
    description: 'Пишите сами и открывайте только короткие подсказки, если застряли. После отправки Отто разберёт результат.',
  },
  solo: {
    step: 'Вариант 3',
    title: 'Пишу самостоятельно',
    description: 'Без готового примера и подсказок: только задание, ваш текст и проверка после завершения.',
  },
};

export function WritingModule({ guest=false,userId, onBack, onComplete, initialScreen = null, onTrainingRouteChange, onTrainingComplete }: Props) {
  const gender = loadUserProfile()?.gender;
  // Only the verified server userId owns drafts. A missing owner yields memory-only text.
  const [letterDrafts,setLetterDrafts]=useState<Record<string,string>>(
    ()=>readSchreibenLetterDrafts(userId,schreibenTeil2Tasks.map(task=>task.id)),
  );
  const changeLetterDraft=(taskId:string,value:string)=>{
    setLetterDrafts(current=>{
      const next={...current};
      if(value==='')delete next[taskId];
      else next[taskId]=value;
      return next;
    });
    // Write immediately on input, not after a timer or after answer checking.
    writeSchreibenLetterDraft(userId,taskId,value);
  };
  const [screen, setScreen] = useState<Screen>(initialScreen ?? 'home');
  const [chosenIndex,setChosenIndex]=useState<number|null>(null);
  const [manual,setManual]=useState(false);
  const openScreen = (next: Screen) => {
    setScreen(next);
    if(next!=='brief-choice')onTrainingRouteChange?.(next==='home'?null:next==='list1'?'schreiben-teil1':next==='list2'?'schreiben-teil2':`schreiben-${next}` as 'schreiben-teil1' | 'schreiben-teil2' | 'schreiben-guided' | 'schreiben-coach' | 'schreiben-solo');
  };
  const backHome = () => openScreen('home');
  const backToChoices = () => openScreen('brief-choice');
  const currentCursor=(teil:1|2)=>teil===1?readTrainingResume().schreibenTeil1:readTrainingResume().schreibenTeil2;
  const openWrite=(teil:1|2,index:number,isManual:boolean)=>{if(guest&&index>=2)return;setChosenIndex(index);setManual(isManual);openScreen(teil===1?'teil1':'brief-choice')};
  const [pathStage, setStage] = useState(getPathStage);

  const finishStage = (mode: WritingMode) => {
    const nextStage: 1 | 2 | 3 = mode === 'guided' ? 2 : 3;
    if (nextStage > pathStage) {
      setStage(nextStage);
      setPathStage(nextStage);
    }
  };

  if (screen === 'home') {
    return <Home onBack={onBack} onOpen={openScreen} pathStage={pathStage} gender={gender} />;
  }
  if(screen==='list1')return <TaskList userId={userId} module="schreiben" teil={1} items={schreibenTeil1Tasks.map(task=>({id:task.id,title:task.title}))} guestLimit={guest?2:undefined} continueIndex={guest?Math.min(1,currentCursor(1)):currentCursor(1)} onBack={backHome} onContinue={()=>openWrite(1,guest?Math.min(1,currentCursor(1)):currentCursor(1),false)} onSelect={at=>openWrite(1,at,true)}/>;
  if(screen==='list2')return <TaskList userId={userId} module="schreiben" teil={2} items={schreibenTeil2Tasks.map((task,at)=>({id:task.id,title:'Письмо '+(at+1)}))} guestLimit={guest?2:undefined} continueIndex={guest?Math.min(1,currentCursor(2)):currentCursor(2)} onBack={backHome} onContinue={()=>openWrite(2,guest?Math.min(1,currentCursor(2)):currentCursor(2),false)} onSelect={at=>openWrite(2,at,true)}/>;
  if(screen==='teil1')return <Teil1 key={chosenIndex??'resume'} initialIndex={chosenIndex} manual={manual} guest={guest} onBack={()=>openScreen('list1')} onComplete={onComplete} onTrainingComplete={onTrainingComplete}/>;
  if(screen==='brief-choice'){
    return <BriefChoice onBack={()=>openScreen('list2')} onOpen={openScreen} gender={gender} pathStage={pathStage}/>;
  }
  return (
    <Teil2
      key={`${screen}-${chosenIndex??'resume'}`}
      mode={screen}
      guest={guest}
      onBack={backToChoices}
      initialIndex={chosenIndex}
      manual={manual}
      onList={()=>openScreen('list2')}
      drafts={letterDrafts}
      onDraftChange={changeLetterDraft}
      onComplete={onComplete}
      onStageDone={() => finishStage(screen)}
      onTrainingComplete={onTrainingComplete}
      gender={gender}
    />
  );
}

function Home({onBack,onOpen}:{onBack:()=>void;onOpen:(screen:Screen)=>void;pathStage:number;gender?:Gender}){
  return <div className="animate-fade-in pb-8">
    <Header onBack={onBack} title="Schreiben A1" subtitle="Заполнение формуляра и написание письма"/>
    <section>
      <h2 className="text-xl font-black text-slate-950">Задания модуля</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <PartCard icon={FileText} title="Teil 1 · Formular" text="Прочитайте ситуацию и заполните 5 недостающих данных." onClick={()=>onOpen('list1')}/>
        <div>
          <PartCard icon={PenLine} title="Teil 2 · Brief" text="Письмо по трём обязательным пунктам. Отто оценивает его по шкале Goethe 10 баллов." onClick={()=>onOpen('list2')}/>
          <p className="mt-2 text-sm font-bold text-amber-700">Рекомендуется начать с него.</p>
        </div>
      </div>
    </section>
  </div>;
}

function BriefChoice({onBack,onOpen,gender,pathStage}:{onBack:()=>void;onOpen:(screen:Screen)=>void;gender?:Gender;pathStage:number}){
  const recommended:WritingMode=pathStage===1?'guided':pathStage===2?'coach':'solo';
  return <div className="animate-fade-in pb-8">
    <Header onBack={onBack} title="Как будем писать письмо?" subtitle="Выберите удобный способ написания письма"/>
    <div className="space-y-3">{(['guided','coach','solo'] as WritingMode[]).map((mode,index)=>{
      const item=mode==='solo'?{...MODE_META[mode],title:byGender(gender,'Пишу сама','Пишу сам','Пишу самостоятельно')}:MODE_META[mode];
      return <button key={mode} type="button" onClick={()=>onOpen(mode)} className={cn('w-full rounded-2xl border bg-white p-4 text-left shadow-sm',mode===recommended?'border-teal-300 ring-2 ring-teal-100':'border-slate-200')}>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-black text-teal-800">{index+1}</span>
          <span className="min-w-0 flex-1">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">{item.step}</span>
            <strong className="mt-0.5 block text-base text-slate-950">{item.title}</strong>
            <small className="mt-1 block text-sm leading-5 text-slate-500">{item.description}</small>
          </span>
          <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-slate-300"/>
        </div>
      </button>;
    })}</div>
  </div>;
}

function LetterFormula() {
  return (
    <section className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 p-4 sm:p-5">
      <p className="text-xs font-black uppercase tracking-[.14em] text-amber-800">Перед письмом · простая формула</p>
      <h2 className="mt-1 text-lg font-black text-slate-950">Как устроено письмо A1</h2>
      <div className="mt-4 grid gap-3">
        <div className="rounded-2xl bg-white/85 p-3">
          <div className="flex gap-3"><StepNumber>1</StepNumber><div className="min-w-0"><strong className="block text-slate-950">Обращение</strong><p className="mt-1 text-sm leading-5 text-slate-600">Кому пишем? <b>Официально:</b> Sehr geehrte Damen und Herren / Sehr geehrte Frau … · <b>неофициально:</b> Liebe … / Lieber …</p></div></div>
        </div>
        <div className="rounded-2xl bg-white/85 p-3">
          <div className="flex gap-3"><StepNumber>2</StepNumber><div className="min-w-0"><strong className="block text-slate-950">Три пункта задания</strong><p className="mt-1 text-sm leading-5 text-slate-600">Ответьте на <b>каждый</b> из трёх вопросов/пунктов. Простых понятных фраз A1 достаточно.</p></div></div>
        </div>
        <div className="rounded-2xl bg-white/85 p-3">
          <div className="flex gap-3"><StepNumber>3</StepNumber><div className="min-w-0"><strong className="block text-slate-950">Прощание</strong><p className="mt-1 text-sm leading-5 text-slate-600"><b>Официально:</b> Mit freundlichen Grüßen · <b>неофициально:</b> Viele Grüße / Liebe Grüße.</p></div></div>
        </div>
      </div>
    </section>
  );
}

function StepNumber({ children }: { children: ReactNode }) {
  return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 font-black text-amber-900">{children}</span>;
}

function Teil1({ onBack, onComplete, onTrainingComplete, initialIndex=null, manual=false,guest=false }: {guest?:boolean; onBack: () => void; onComplete: (score: number, total: number, taskId?: string) => void; onTrainingComplete?: () => void; initialIndex?:number|null;manual?:boolean }) {
  const [index, setIndex] = useState(() => Math.min(initialIndex??readTrainingResume().schreibenTeil1, guest?1:Math.max(0, schreibenTeil1Tasks.length - 1)));
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [result, setResult] = useState<Record<number, boolean> | null>(null);
  const task = schreibenTeil1Tasks[index];
  const editable = task.rows.map((row, rowIndex) => ({ row, rowIndex })).filter(({ row }) => Boolean(row.answer));
  const resultScore = result ? Object.values(result).filter(Boolean).length : null;
  const total = editable.length || 5;

  const check = () => {
    const next: Record<number, boolean> = {};
    editable.forEach(({ row, rowIndex }) => { next[rowIndex] = matches(draft[rowIndex] || '', row.answer || ''); });
    setResult(next);
    onComplete(Object.values(next).filter(Boolean).length,total,task.id);
  };

  const next = () => {
    if (index === (guest?1:schreibenTeil1Tasks.length - 1)) {
      if(readTrainingResume().schreibenTeil1===index)saveTrainingResume({ schreibenTeil1: 0 });
      setIndex(0); setDraft({}); setResult(null); onBack(); onTrainingComplete?.(); return;
    }
    const nextIndex = index + 1;
    if(readTrainingResume().schreibenTeil1===index)saveTrainingResume({ schreibenTeil1: nextIndex });
    setIndex(nextIndex);
    setDraft({});
    setResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="animate-fade-in pb-8">
      <Header onBack={onBack} title="Schreiben · Teil 1" subtitle={`Задание ${index + 1} из ${schreibenTeil1Tasks.length}`} />

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0"><h2 className="text-xl font-black text-slate-950">{task.title}</h2><p className="mt-2 text-sm leading-6 text-slate-700"><HoverTranslateText text={task.scenario} /></p></div>
          <CompactTranslationEye parts={[task.scenario, task.instruction]} />
        </div>
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700"><HoverTranslateText text={task.instruction} /></p>
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="divide-y divide-slate-100">
          {task.rows.map((row, rowIndex) => (
            <div key={`${row.label}-${rowIndex}`} className="grid grid-cols-[minmax(92px,.8fr)_minmax(0,1.2fr)] items-center gap-3 px-4 py-3 sm:grid-cols-[220px_1fr]">
              <label className="min-w-0 break-words text-sm font-semibold text-slate-700">{row.label}</label>
              {row.answer ? (
                <div className="min-w-0">
                  <input
                    value={draft[rowIndex] || ''}
                    onChange={(event) => { setDraft((value) => ({ ...value, [rowIndex]: event.target.value })); setResult(null); }}
                    disabled={Boolean(result)}
                    className={cn('min-h-11 w-full min-w-0 rounded-xl border px-3 py-2 outline-none', result?.[rowIndex] === true && 'border-emerald-400 bg-emerald-50', result?.[rowIndex] === false && 'border-rose-400 bg-rose-50')}
                  />
                  {result?.[rowIndex] === false && <p className="mt-1 break-words text-xs text-rose-700">Правильно: {row.answer}</p>}
                </div>
              ) : <div className="min-w-0 break-words rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{row.value}</div>}
            </div>
          ))}
        </div>
      </section>

      {result && resultScore !== null && <FormResult score={resultScore} total={total} />}

      <div className={result?'mt-5 grid grid-cols-2 gap-2 pb-20':'mt-5 flex justify-end pb-20'}>
        {!result ? (
          <button onClick={check} disabled={editable.some(({ rowIndex }) => !(draft[rowIndex] || '').trim())} className="min-h-12 rounded-xl bg-slate-900 px-6 font-bold text-white disabled:opacity-40">Проверить</button>
        ) : (
          <><button type="button" onClick={onBack} className="min-h-12 min-w-0 rounded-xl border bg-white px-2 text-xs font-bold">К списку заданий</button><button onClick={next} className="inline-flex min-h-12 min-w-0 items-center justify-center gap-1 rounded-xl bg-slate-900 px-2 font-bold text-white">Далее <ArrowRight className="h-4 w-4" /></button></>
        )}
      </div>
    </div>
  );
}

function FormResult({ score, total }: { score: number; total: number }) {
  let reaction = 'Есть правильные поля. Проверьте остальные ещё раз по исходному тексту.';
  if (score === total) reaction = 'Отлично. Всё заполнено правильно.';
  else if (score === 3 && total === 5) reaction = 'Хорошо. Но два поля стоит проверить внимательнее.';
  else if (score === 4 && total === 5) reaction = 'Очень хорошо. Проверьте ещё одно поле.';
  else if (score === 0) reaction = 'Попробуйте ещё раз. Сначала внимательно прочитайте исходный текст.';

  return (
    <section className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-4">
      <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-teal-700">Результат Teil 1</p><strong className="mt-1 block text-3xl font-black text-slate-950">{score}/{total}</strong></div><CheckCircle2 className="h-8 w-8 text-teal-700" /></div>
      <p className="mt-2 text-sm leading-6 text-slate-700">{reaction}</p>
    </section>
  );
}

function Teil2({
  guest=false,
  mode,
  onBack,
  initialIndex=null,
  manual=false,
  onList,
  onComplete,
  onStageDone,
  onTrainingComplete,
  gender,
  drafts,
  onDraftChange,
}: {
  mode: WritingMode;
  guest?:boolean;
  onBack: () => void;
  initialIndex?:number|null;
  manual?:boolean;
  onList:()=>void;
  onComplete: (score: number, total: number, taskId?: string) => void;
  onStageDone: () => void;
  onTrainingComplete?: () => void;
  gender?: Gender;
  drafts:Record<string,string>;
  onDraftChange:(taskId:string,value:string)=>void;
}) {
  const [index, setIndex] = useState(() => Math.min(initialIndex??readTrainingResume().schreibenTeil2, guest?1:Math.max(0, schreibenTeil2Tasks.length - 1)));
  const [hint, setHint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<AiFeedback | null>(null);
  const [image, setImage] = useState('');
  const [imageName, setImageName] = useState('');
  const [examples, setExamples] = useState<Record<string, ExamplePayload>>({});
  const [exampleLoading, setExampleLoading] = useState(false);
  const [exampleClosed, setExampleClosed] = useState(mode !== 'guided');
  const fileRef = useRef<HTMLInputElement>(null);
  const task = schreibenTeil2Tasks[index];
  const text = drafts[task.id] || '';
  const meta = mode === 'solo' ? { ...MODE_META[mode], title: byGender(gender, 'Пишу сама', 'Пишу сам', 'Пишу самостоятельно') } : MODE_META[mode];
  const example = examples[task.id] || null;

  const setText = (value: string) => {
    onDraftChange(task.id,value);
    setFeedback(null);
    setError('');
  };

  const loadExample = async () => {
    if (exampleLoading || example) return;
    setExampleLoading(true);
    setError('');
    try {
      const response = await fetch('/api/schreiben-example', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situation: task.situation, points: task.points }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Не удалось подготовить пример.');
      const prepared = payload as ExamplePayload;
      if (!prepared.example?.trim()) throw new Error('Пример не получен. Попробуйте ещё раз.');
      setExamples((value) => ({ ...value, [task.id]: prepared }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось подготовить пример.');
    } finally {
      setExampleLoading(false);
    }
  };

  const chooseImage = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Выберите изображение письма.'); return; }
    if (file.size > 6 * 1024 * 1024) { setError('Фото слишком большое. Максимум 6 МБ.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setImage(String(reader.result || '')); setImageName(file.name); setFeedback(null); setError(''); };
    reader.readAsDataURL(file);
  };

  const check = async () => {
    if ((!text.trim() && !image) || loading) return;
    setLoading(true);
    setError('');
    setFeedback(null);
    try {
      const response = await fetch('/api/check-schreiben', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, situation: task.situation, points: task.points, imageDataUrl: image }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Не удалось проверить письмо.');
      const checked = payload as AiFeedback;
      setFeedback(checked);
      onComplete(checked.earned,checked.max,task.id);
      const learningText = text.trim() || checked.recognizedText || '';
      if (!text.trim() && checked.recognizedText) onDraftChange(task.id,String(checked.recognizedText));
      if (learningText) recordWritingLearning(learningText, checked);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось проверить письмо.');
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    if (!feedback) return;
    onStageDone();
    if (index === (guest?1:schreibenTeil2Tasks.length - 1)) { if(readTrainingResume().schreibenTeil2===index)saveTrainingResume({ schreibenTeil2: 0 }); onBack(); onTrainingComplete?.(); return; }
    const nextIndex = index + 1;
    if(readTrainingResume().schreibenTeil2===index)saveTrainingResume({ schreibenTeil2: nextIndex });
    setIndex(nextIndex);
    setHint(false);
    setFeedback(null);
    setError('');
    setImage('');
    setImageName('');
    setExampleClosed(mode !== 'guided');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const canWrite = mode !== 'guided' || exampleClosed;

  return (
    <div className="animate-fade-in pb-8">
      <Header onBack={onBack} title={`Schreiben · ${meta.title}`} subtitle={`Письмо ${index + 1} из ${schreibenTeil2Tasks.length}`} />
      <div className="mb-4 rounded-2xl border border-teal-100 bg-teal-50/70 p-3 text-sm leading-6 text-slate-700"><b className="text-teal-800">{meta.step}.</b> {meta.description}</div>

      {mode !== 'solo' && schreibenTeil2Ru[Number(task.number)]
        ? <SchreibenTaskOverview body={task.situation} points={task.points} translation={schreibenTeil2Ru[Number(task.number)].situation} explanations={task.number===1||task.number===26||task.number>30
            ?schreibenTeil2Ru[Number(task.number)].points
            :task.points.map((point,pointIndex)=>explainTrainingPoint(point,schreibenTeil2Ru[Number(task.number)].points[pointIndex]??point,schreibenTeil2Ru[Number(task.number)].situation))}
            conciseTranslation={task.number>30}/>
        : <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><p className="text-xs font-black uppercase tracking-wider text-amber-800">Aufgabe {task.number}</p><p className="mt-2 text-[15px] leading-7 text-slate-900"><HoverTranslateText text={task.situation} /></p></div>
          {mode !== 'solo' && <CompactTranslationEye parts={[task.situation, ...task.points]} />}
        </div>
        <div className="mt-4 rounded-xl border border-amber-200/70 bg-white/60 p-3">
          <p className="text-xs font-black uppercase tracking-wider text-amber-800">Обязательно ответить на все 3 пункта</p>
          <ul className="mt-2 space-y-2">{task.points.map((point, pointIndex) => {
            const helper = mode === 'solo' ? undefined : SCHREIBEN_PROMPT_HELPERS[`${task.id}:${pointIndex}`];
            return <li key={point} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-800"><HoverTranslateText text={`${pointIndex + 1}. ${point}`} />{helper && <p className="mt-1 pl-5 text-xs font-medium leading-5 text-slate-500">{helper}</p>}</li>;
          })}</ul>
        </div>
      </section>}

      {mode === 'guided' && !exampleClosed && (
        <section className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:p-5">
          <div className="flex items-start gap-3"><Eye className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" /><div><p className="text-xs font-black uppercase tracking-wider text-sky-800">Пример для этого задания</p><h2 className="mt-1 text-lg font-black text-slate-950">Сначала разберите пример</h2><p className="mt-1 text-sm leading-6 text-slate-600">После просмотра закройте его и напишите свой вариант.</p></div></div>
          {!example ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={loadExample} disabled={exampleLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-800 px-4 font-bold text-white disabled:opacity-50">{exampleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{exampleLoading ? 'Отто готовит пример…' : 'Показать пример'}</button>
              <button type="button" onClick={() => setExampleClosed(true)} className="min-h-11 rounded-xl border border-sky-300 bg-white px-4 font-bold text-sky-900">{byGender(gender, 'Сразу попробовать самой', 'Сразу попробовать самому', 'Сразу попробовать самостоятельно')}</button>
            </div>
          ) : (
            <div className="mt-4">
              <div className="whitespace-pre-wrap rounded-2xl bg-white p-4 text-[15px] leading-7 text-slate-900 shadow-sm"><HoverTranslateText text={example.example} /></div>
              {example.noteRu && <p className="mt-2 text-xs leading-5 text-sky-900">💡 {example.noteRu}</p>}
              <button type="button" onClick={() => setExampleClosed(true)} className="mt-3 min-h-11 w-full rounded-xl bg-slate-950 px-4 font-black text-white">{byGender(gender, 'Закрыть пример и написать самой', 'Закрыть пример и написать самому', 'Закрыть пример и написать самостоятельно')}</button>
            </div>
          )}
        </section>
      )}

      {mode === 'coach' && (
        <>
          <button type="button" onClick={() => setHint((value) => !value)} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-bold text-amber-900"><Lightbulb className="h-4 w-4" />{hint ? 'Скрыть подсказку' : 'Нужна подсказка'}</button>
          {hint && <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="mb-2 text-xs font-black uppercase tracking-wider text-amber-800">Короткая подсказка от Отто</p>{task.points.map((point, pointIndex) => <p key={point} className="mt-1 text-sm leading-6 text-slate-700">{pointIndex + 1}. <HoverTranslateText text={hintFor(point)} /></p>)}</div>}
        </>
      )}

      {canWrite && (
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-bold text-slate-700">Ваш ответ · {countWords(text)} слов</span>
            <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"><Camera className="h-4 w-4" />Добавить фото письма</button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => chooseImage(event.target.files?.[0])} />
          </div>
          {imageName && <div className="mb-3 flex items-center justify-between rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-800"><span className="truncate">Фото: {imageName}</span><button onClick={() => { setImage(''); setImageName(''); }} aria-label="Удалить фото"><X className="h-4 w-4" /></button></div>}
          <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={mode === 'solo' ? 'Напишите письмо без подсказок…' : 'Напишите письмо самостоятельно…'} className="min-h-[210px] w-full resize-y rounded-xl border border-slate-300 p-4 text-base leading-7 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
          <p className="mt-2 text-xs leading-5 text-slate-500">Отто проверит каждый из трёх пунктов по шкале 3 / 1,5 / 0 и оформление письма по шкале 1 / 0,5 / 0.</p>
        </section>
      )}

      {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {canWrite && !feedback && <div className="mt-5 flex justify-end"><button type="button" onClick={check} disabled={loading || (!text.trim() && !image)} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-slate-900 px-6 font-bold text-white disabled:opacity-40">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{loading ? 'Отто проверяет…' : 'Проверить с Отто'}</button></div>}

      {feedback && <Feedback data={feedback} gender={gender} />}
      {feedback && <div className="mt-5 grid grid-cols-2 gap-2 pb-20"><button type="button" onClick={onList} className="min-h-12 min-w-0 rounded-xl border bg-white px-2 text-xs font-bold">К списку заданий</button><button onClick={next} className="inline-flex min-h-12 min-w-0 items-center justify-center gap-1 rounded-xl bg-teal-700 px-2 font-bold text-white">Далее <ArrowRight className="h-4 w-4" /></button></div>}
    </div>
  );
}

function Feedback({ data, gender }: { data: AiFeedback; gender?: Gender }) {
  const [fixing, setFixing] = useState(false);
  const [fixes, setFixes] = useState<Record<number, string>>({});
  const [fixChecked, setFixChecked] = useState(false);
  const goodPoints = data.contentPoints?.filter((point) => point.status === 'erfuellt') ?? [];
  const problemPoints = data.contentPoints?.filter((point) => point.status !== 'erfuellt') ?? [];

  return (
    <section className="mt-5 space-y-4 rounded-2xl border border-teal-200 bg-teal-50 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-wider text-teal-800">Результат по шкале Goethe</p><h3 className="mt-1 text-3xl font-black text-slate-950">{formatPoints(data.earned)}/{data.max}</h3><p className="mt-1 text-xs text-slate-500">{data.score}% — только пересчёт этих же баллов для внутренней статистики.</p></div>
        <CheckCircle2 className="h-8 w-8 text-teal-700" />
      </div>

      {data.recognizedText && <div className="rounded-xl bg-white p-3 text-sm"><b>Распознано с фото:</b><p className="mt-1 whitespace-pre-wrap text-slate-700">{data.recognizedText}</p></div>}

      <div className="grid gap-2">
        {data.contentPoints.map((point, index) => <div key={`${point.point}-${index}`} className="rounded-xl bg-white p-3"><div className="flex items-start justify-between gap-3"><strong className="min-w-0 text-sm text-slate-900">Пункт {index + 1}: {point.point}</strong><span className={cn('shrink-0 rounded-full px-2 py-1 text-xs font-black', point.earned === 3 ? 'bg-emerald-100 text-emerald-800' : point.earned === 1.5 ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-800')}>{formatPoints(point.earned)}/3</span></div><p className="mt-1 text-sm leading-5 text-slate-600">{point.commentRu}</p></div>)}
        <div className="rounded-xl bg-white p-3"><div className="flex items-start justify-between gap-3"><strong className="text-sm text-slate-900">Оформление письма</strong><span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{formatPoints(data.communication.earned)}/1</span></div><p className="mt-1 text-sm leading-5 text-slate-600">{data.communication.commentRu}</p></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-4"><h4 className="font-black text-emerald-800">Сильные стороны</h4>{goodPoints.length ? <div className="mt-2 space-y-2 text-sm leading-5 text-slate-700">{goodPoints.map((point, index) => <p key={index}>✓ {point.commentRu}</p>)}</div> : <p className="mt-2 text-sm text-slate-500">Сначала закрепим выполнение пунктов задания.</p>}</div>
        <div className="rounded-2xl bg-white p-4"><h4 className="font-black text-amber-800">Что нужно исправить</h4>{problemPoints.length ? <div className="mt-2 space-y-2 text-sm leading-5 text-slate-700">{problemPoints.map((point, index) => <p key={index}>• {point.commentRu}</p>)}</div> : <p className="mt-2 text-sm text-slate-500">Все три содержательных пункта выполнены.</p>}</div>
      </div>

      {data.corrections?.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h4 className="flex items-center gap-2 font-black text-amber-900"><CircleAlert className="h-4 w-4" />Языковые ошибки</h4>
          {data.corrections.map((correction, index) => (
            <div key={`${correction.original}-${index}`} className="mt-3 rounded-xl bg-white p-3">
              <p className="text-sm"><span className="text-rose-700 line-through">{correction.original}</span></p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{correction.explanation}</p>
              {fixing && !fixChecked && <input value={fixes[index] || ''} onChange={(event) => setFixes((value) => ({ ...value, [index]: event.target.value }))} placeholder="Исправьте эту фразу сами" className="mt-2 min-h-10 w-full rounded-lg border border-amber-200 px-3 text-sm outline-none focus:border-amber-500" />}
              {fixChecked && <div className="mt-2"><p className={cn('text-xs font-bold', matches(fixes[index] || '', correction.corrected) ? 'text-emerald-700' : 'text-amber-800')}>{matches(fixes[index] || '', correction.corrected) ? '✓ Получилось' : 'Вариант Отто:'}</p><p className="mt-1 text-sm font-semibold text-emerald-700">{correction.corrected}</p></div>}
            </div>
          ))}
          {!fixing && <button type="button" onClick={() => setFixing(true)} className="mt-3 min-h-10 w-full rounded-xl bg-amber-900 px-4 text-sm font-black text-white">{byGender(gender, 'Попробовать исправить самой', 'Попробовать исправить самому', 'Попробовать исправить самостоятельно')}</button>}
          {fixing && !fixChecked && <button type="button" onClick={() => setFixChecked(true)} disabled={data.corrections.some((_, index) => !(fixes[index] || '').trim())} className="mt-3 min-h-10 w-full rounded-xl bg-amber-900 px-4 text-sm font-black text-white disabled:opacity-40">Проверить исправления</button>}
        </div>
      )}

      <div className="rounded-xl bg-white p-3 text-sm leading-6 text-slate-700"><b>Комментарий Отто:</b> {data.feedbackRu}</div>
      {data.feedbackDe && <p className="text-sm leading-6 text-teal-900"><b>Полезная фраза:</b> <HoverTranslateText text={data.feedbackDe} /></p>}
    </section>
  );
}

function formatPoints(value: number) {
  return Number.isInteger(value) ? String(value) : String(value).replace('.', ',');
}

function hintFor(point: string) {
  const value = point.toLowerCase();
  if (value.includes('preis') || value.includes('kost')) return 'Wie viel kostet der Kurs?';
  if (value.includes('wann') || value.includes('termin')) return 'Wann können wir uns treffen?';
  if (value.includes('warum')) return 'Ich schreibe, weil …';
  if (value.includes('hotel')) return 'Bitte schicken Sie mir Hoteladressen.';
  if (value.includes('information')) return 'Bitte schicken Sie mir Informationen.';
  if (value.includes('dank')) return 'Vielen Dank für die Einladung.';
  if (value.includes('nicht kommen') || value.includes('leider')) return 'Leider kann ich nicht kommen.';
  if (value.includes('helfen') || value.includes('hilfe')) return 'Können Sie mir bitte helfen?';
  if (value.startsWith('wo')) return 'Wo treffen wir uns?';
  if (value.includes('tage') || value.includes('arbeiten')) return 'Ich kann am Montag und Mittwoch.';
  return `Ich möchte gern wissen: ${point.replace(/\.$/, '')}?`;
}

function Header({ onBack, title, subtitle }: { onBack: () => void; title: string; subtitle: string }) {
  return <div className="mb-5 flex items-center gap-3"><button type="button" onClick={onBack} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white"><ArrowLeft className="h-5 w-5 text-slate-600" /></button><div className="min-w-0"><h1 className="break-words text-2xl font-black text-slate-950">{title}</h1><p className="text-sm text-slate-500">{subtitle}</p></div></div>;
}

function PartCard({ icon: Icon, title, text, onClick }: { icon: typeof FileText; title: string; text: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="min-h-[170px] rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50"><Icon className="h-6 w-6 text-amber-700" /></span><h2 className="mt-4 text-xl font-black text-slate-950">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></button>;
}
