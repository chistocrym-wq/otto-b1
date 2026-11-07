import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, BookOpen, Bookmark, ChevronRight, Headphones, Home, Mic, PenLine, Sparkles, Volume2, X } from 'lucide-react';
import { BottomNav, type BottomTab } from '@/components/BottomNav';
import { OttoScene } from '@/components/OttoScene';
import './ottoQuickTour.css';

const TOUR_KEY_PREFIX = 'otto-preview-tour-seen-v1:';
const tourKey = (userId: string) => TOUR_KEY_PREFIX + userId;

export function hasSeenOttoTour(userId?: string): boolean {
  if (!userId) return true;
  try { return localStorage.getItem(tourKey(userId)) === '1'; } catch { return false; }
}
export function markOttoTourSeen(userId?: string): void {
  if (!userId) return;
  try { localStorage.setItem(tourKey(userId), '1'); } catch { /* Storage may be unavailable in a webview. */ }
}

type StepId = 'start' | 'reference' | 'cards' | 'modules' | 'learning' | 'training' | 'finish';
const STEPS: Array<{ id: StepId; title: string }> = [
  { id: 'start', title: 'Шаг 1. Выберите режим' },
  { id: 'reference', title: 'Шаг 2. Познакомьтесь со Справочником' },
  { id: 'cards', title: 'Шаг 3. Создайте свои умные карточки' },
  { id: 'modules', title: 'Шаг 4. Что есть в Учебной базе' },
  { id: 'learning', title: 'Шаг 5. Учимся писать письма и тренируем произношение' },
  { id: 'training', title: 'Шаг 6. Нажмите «Тренироваться»' },
  { id: 'finish', title: '❤️ Ну что, начинаем?' },
];

function TourVisual({ id }: { id: StepId }) {
  if (id === 'start') return <div className="otto-tour-mode-options">
    <div className="otto-tour-mode-fragment"><span className="otto-tour-square"><Sparkles size={22}/></span><span className="otto-tour-fragment-text"><b>Мне нужна подготовка</b><small>Хочу сначала повторить слова, конструкции и научиться выполнять задания A1 вместе с OTTO.</small></span><ChevronRight size={20}/></div>
    <div className="otto-tour-mode-fragment"><span className="otto-tour-square"><PenLine size={22}/></span><span className="otto-tour-fragment-text"><b>Мне нужен только тренажёр</b></span><ChevronRight size={20}/></div>
  </div>;
  if (id === 'reference') return <div className="otto-tour-shortcuts">
    <span className="otto-tour-shortcut"><BookOpen size={24}/></span>
    <span className="otto-tour-fragment-caption">Справочник OTTO</span>
    <span className="otto-tour-number-fragment"><b>Числа</b><span className="otto-tour-number-answer"><b>37 — siebenunddreißig</b><Volume2 size={19}/></span></span>
  </div>;
  if (id === 'cards') return <div className="otto-tour-card-fragment">
    <span className="otto-tour-save"><Bookmark size={17}/>Добавить в умные карточки</span>
    <span className="otto-tour-shortcut"><Bookmark size={24}/></span>
  </div>;
  if (id === 'modules') return <div className="otto-tour-module-fragment">
    <span><PenLine size={18}/>Как писать письма</span><span><Mic size={18}/>Проверка произношения</span>
    <span><Headphones size={18}/>Проверка чисел на слух</span>
  </div>;
  if (id === 'learning') return <div className="otto-tour-learning-fragment">
    <span><PenLine size={18}/>Слова → формуляр → письмо</span>
    <span><Mic size={18}/>Слушаем и произносим немецкие фразы</span>
  </div>;
  if (id === 'training') return <div className="otto-tour-training-fragment">
    <span><Home size={19}/>Тренироваться</span>
  </div>;
  return <div className="otto-tour-training-fragment"><span>❤️ Всё получится!</span></div>;
}

function TourInstructions({ id }: { id: StepId }) {
  if (id === 'start') return <>
    <p>Вы зарегистрировались в OTTO. Что делать дальше?</p>
    <p><b>После регистрации вам нужно выбрать, как вы хотите заниматься:</b></p>
    <ul>
      <li><b>«Мне нужна подготовка»</b> — если вы хотите сначала разобраться в заданиях, повторить необходимые слова и конструкции и постепенно подготовиться к экзамену вместе с OTTO.</li>
      <li><b>«Мне нужен только тренажёр»</b> — если у вас уже есть знания немецкого языка и вы готовы сразу приступить к выполнению экзаменационных заданий.</li>
    </ul>
    <p>Если вы выбрали обучение с OTTO, рекомендуем начать со Справочника.</p>
  </>;
  if (id === 'reference') return <>
    <p>В нашем Справочнике мы собрали всё самое необходимое для подготовки к экзамену A1 — <b>без лишней воды</b>.</p>
    <p>Здесь вы можете посмотреть, повторить и изучить материал, начиная с немецкого алфавита, буквосочетаний и умлаутов и заканчивая построением предложений.</p>
    <p>Не обязательно учить всё сразу. Изучайте то, что вам необходимо, и возвращайтесь к материалам в любое удобное время.</p>
    <p><b>🔢 Отдельно обратите внимание на тренировку чисел на слух.</b></p>
    <p>В Справочнике есть специальный раздел, где вы можете тренировать восприятие немецких чисел на слух. Это очень полезный навык для экзамена, особенно для Hören.</p>
    <p>О том, как пользоваться этой тренировкой, мы расскажем отдельно.</p>
  </>;
  if (id === 'cards') return <>
    <p>В Справочнике мы сделали систему <b>умных карточек</b>. Проще говоря, это ваше личное «Избранное».</p>
    <p>Вы можете добавлять туда всё, что считаете нужным: от алфавита, умлаутов и правил чтения до шаблонов просьб и писем.</p>
    <p>Например, встретили полезную таблицу или конструкцию, которую хотите повторить позже? Просто сохраните её в умные карточки.</p>
    <p>Все сохранённые материалы всегда будут у вас под рукой. Значок умных карточек находится <b>внизу слева в реальном тренажёре</b>. Нажмите на него, чтобы открыть всё, что вы сохранили из Справочника.</p>
    <p>Таким образом, вы постепенно создадите собственную подборку материалов именно по тем темам, которые вам необходимо повторять.</p>
  </>;
  if (id === 'modules') return <>
    <p>В <b>«Учебной базе»</b> вы найдёте всё необходимое, чтобы повторять немецкий и готовиться к экзамену постепенно.</p>
    <ul>
      <li><b>Справочный конспект</b> — нужные слова, правила, примеры и шаблоны.</li>
      <li><b>Умные карточки</b> — материалы, которые вы сохранили для себя.</li>
      <li><b>Как писать письма</b> — учимся составлять фразы, заполнять формуляр и писать письмо.</li>
      <li><b>Проверка произношения</b> — тренируем немецкую речь и устную часть Sprechen.</li>
      <li><b>Проверка чисел на слух</b> — слушаем немецкие числа и проверяем, правильно ли их поняли.</li>
    </ul>
  </>;
  if (id === 'learning') return <>
    <p><b>В разделе «Как писать письма»</b> мы начнём с базовых слов и простых предложений, затем разберём заполнение формуляра и шаг за шагом научимся писать письмо A1.</p>
    <p>Вы сможете проходить объяснения и упражнения в своём темпе, возвращаться к сложным моментам и закреплять материал на практике.</p>
    <p><b>В разделе «Проверка произношения»</b> вы будете слушать немецкие примеры, произносить слова и фразы, записывать свои ответы и готовиться к устной части экзамена.</p>
    <p>Отдельно можно потренироваться понимать числа на слух — эта проверка есть прямо в Учебной базе.</p>
  </>;
  if (id === 'training') return <>
    <p>Когда захотите перейти к настоящим экзаменационным заданиям, нажмите <b>«Тренироваться»</b> в нижнем меню.</p>
    <p>К тренировкам по модулям экзамена A1 можно приступить сразу, как только почувствуете, что готовы.</p>
    <p>Вы можете в любой момент вернуться в Учебную базу, чтобы повторить письмо, произношение, нужные слова или числа.</p>
  </>;
  return <>
    <p>Желаю вам удачи в подготовке к экзамену и, конечно, успешной сдачи!</p>
    <p>Не торопитесь, занимайтесь постепенно, возвращайтесь к сложным темам и обязательно хвалите себя даже за маленькие успехи.</p>
    <p><b>Всё получится! Я верю в вас! ❤️</b></p>
  </>;
}

export function OttoQuickTour({ userId, onClose, onNavigate, supportUnread=false }: { userId?: string; onClose: () => void; onNavigate: (tab:BottomTab)=>void; supportUnread?: boolean }) {
  const [index, setIndex] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const step = STEPS[index];
  const finish = () => { markOttoTourSeen(userId); onClose(); };
  useEffect(() => { titleRef.current?.focus(); }, [index]);
  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, []);
  return createPortal(<div className="otto-tour-backdrop otto-skin" role="dialog" aria-modal="true" aria-labelledby="otto-tour-title" data-otto-tour>
    <div className="otto-tour-scroll">
      <section className="otto-tour-panel">
        <header className="otto-tour-header">
          <p>КАК ПОЛЬЗОВАТЬСЯ OTTO A1 <span>{index + 1} / {STEPS.length}</span></p>
          <button type="button" onClick={finish} aria-label="Закрыть экскурсию"><X size={20}/></button>
        </header>
        <div className="otto-tour-progress" aria-hidden="true">{STEPS.map((item, i) => <span key={item.id} className={i <= index ? 'is-active' : ''}/>)}</div>
        <div className="otto-tour-heading">
          <div className="otto-tour-character"><OttoScene scene="guide" eager className="h-full w-full object-contain"/></div>
          <h1 id="otto-tour-title" tabIndex={-1} ref={titleRef}>{step.title}</h1>
        </div>
        <div className="otto-tour-visual" aria-label="Фрагмент интерфейса OTTO"><TourVisual id={step.id}/></div>
        <div className="otto-tour-instructions"><TourInstructions id={step.id}/></div>
        <footer className="otto-tour-footer">
          <button type="button" onClick={() => setIndex(i => Math.max(0, i - 1))} disabled={index === 0} className="otto-tour-back"><ArrowLeft size={17}/>Назад</button>
          <button type="button" onClick={finish} className="otto-tour-skip">Пропустить</button>
          <button type="button" onClick={() => index === STEPS.length - 1 ? finish() : setIndex(i => i + 1)} className="otto-tour-next">{index === STEPS.length - 1 ? 'Готово' : 'Далее'}<ArrowRight size={17}/></button>
        </footer>
      </section>
    </div>
    <BottomNav active="learning" mode="full" supportUnread={supportUnread} onNavigate={tab=>{finish();onNavigate(tab)}}/>
  </div>, document.body);
}
