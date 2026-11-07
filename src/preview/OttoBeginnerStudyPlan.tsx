import { useEffect } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Bookmark, CheckCircle2, Headphones, MessageCircleQuestion, PenLine } from 'lucide-react';
import { OttoScene } from '@/components/OttoScene';

type BeginAction = () => void;

const referenceTopics = [
  'немецкий алфавит и то, как он звучит;',
  'немецкие числа и правила их образования;',
  'базовые правила построения предложений;',
  'информацию, как успешно выполнять задания экзамена;',
  'и многое другое :)',
] as const;

const trainingSteps = [
  {
    title: 'Письма',
    Icon: PenLine,
    content: 'Начиная практические занятия с них, вы сможете в спокойном темпе запоминать основные слова, конструкции, правила и шаблоны, которые пригодятся вам в остальных заданиях. Написав 20 писем, вы уже будете чувствовать себя гораздо увереннее в заданиях на чтение, слушание и говорение.',
  },
  {
    title: 'Вопросы и просьбы',
    Icon: MessageCircleQuestion,
    content: 'После уверенного освоения письма попробуйте самостоятельно составлять вопросы и просьбы. У вас уже будет достаточный словарный запас для того, чтобы легко применять шаблоны практически к любой карточке таких заданий.',
  },
  {
    title: 'Чтение',
    Icon: BookOpen,
    content: 'Задания на чтение будут проверять ваше умение понимать простые предложения в тексте. После первых двух пунктов ваш словарный запас станет шире, и вам будет проще понимать немецкий текст и выбирать правильные ответы.',
  },
  {
    title: 'Слушание',
    Icon: Headphones,
    content: 'Задания на слушание обычно являются самыми сложными для новичков. Почти всем воспринимать и понимать иностранную речь сложнее, чем текст, — и это нормально. Главным правилом для успеха здесь является практика.',
  },
] as const;

/** An informational route inside Учебная база: no new progress state or duplicate exercises. */
export function OttoBeginnerStudyPlan({
  onBack,
  onReference,
  onLetters,
}:{
  onBack: BeginAction;
  onReference: BeginAction;
  onLetters: BeginAction;
}){
  useEffect(()=>{
    document.querySelector<HTMLElement>('.otto-preview-learning-mode .otto-inner-screen')?.scrollTo({top:0,behavior:'auto'});
  },[]);

  return <article data-testid="otto-beginner-study-plan" aria-labelledby="otto-beginner-study-title" className="mx-auto w-full max-w-[1180px] min-w-0 space-y-4 px-1 pb-4 sm:px-4">
    <button type="button" onClick={onBack} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-xl border border-[var(--otto-line)] bg-white px-4 text-sm font-bold text-teal-800 shadow-sm">
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true"/>К Учебной базе
    </button>

    <section className="min-w-0 overflow-hidden rounded-[24px] border border-[var(--otto-line)] bg-white p-4 shadow-[0_8px_28px_rgba(16,42,58,.07)] sm:p-6">
      <div data-testid="otto-beginner-hero-grid" className="grid min-w-0 items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(104px,160px)] lg:grid-cols-[minmax(0,1fr)_200px]">
        <div className="min-w-0 flex-1">
          <p className="otto-kicker">OTTO A1 · ДЛЯ НАЧИНАЮЩИХ</p>
          <h1 id="otto-beginner-study-title" className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">Как лучше всего заниматься новичку</h1>
          <p className="mt-4 text-base leading-7 text-slate-700">Подготовка к сдаче экзамена по новому, совершенно незнакомому языку может показаться тяжёлой и очень нудной задачей. Чтобы показать, что это не так, и существует этот тренажёр.</p>
          <p className="mt-3 text-base leading-7 text-slate-700">Вам не придётся долго изучать основы языка, чтобы приступить к тренировкам заданий, представленных на экзамене Goethe A1. Всё, что вам потребуется, — это наш <b>справочный конспект</b> и <b>план тренировок</b>.</p>
        </div>
        <OttoScene scene="guide" className="hidden h-[185px] w-full object-contain sm:block lg:h-[235px]" />
      </div>
    </section>

    <div data-testid="otto-beginner-guide-grid" className="grid min-w-0 items-stretch gap-4 md:grid-cols-2">
      <section aria-labelledby="otto-beginner-reference-title" className="flex h-full min-w-0 flex-col rounded-[24px] border border-teal-100 bg-[#e3f1ee] p-4 sm:p-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-teal-800"><BookOpen className="h-6 w-6" aria-hidden="true"/></span>
        <h2 id="otto-beginner-reference-title" className="min-w-0 text-xl font-black leading-snug text-slate-950 sm:text-2xl">Справочный конспект</h2>
      </div>
      <p className="mt-4 text-base leading-7 text-slate-700">В справочном конспекте собрана только та информация, которая нужна для сдачи экзамена. Внутри вы найдёте:</p>
      <ul className="mt-4 space-y-2.5">
        {referenceTopics.map(topic=><li key={topic} className="flex min-w-0 items-start gap-2.5 text-base leading-6 text-slate-800">
          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true"/>
          <span className="min-w-0">{topic}</span>
        </li>)}
      </ul>
      <button type="button" onClick={onReference} className="mt-4 inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 py-3 text-center text-sm font-black text-white sm:w-auto">
        Открыть справочный конспект<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true"/>
      </button>
      </section>
      <section aria-labelledby="otto-beginner-smart-title" className="flex h-full min-w-0 flex-col rounded-[24px] border border-[var(--otto-line)] bg-white p-4 shadow-[0_8px_28px_rgba(16,42,58,.07)] sm:p-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e3f1ee] text-teal-800"><Bookmark className="h-6 w-6" aria-hidden="true"/></span>
          <h2 id="otto-beginner-smart-title" className="min-w-0 text-xl font-black leading-snug text-slate-950 sm:text-2xl">Умные карточки — подсказки под рукой</h2>
        </div>
        <p className="mt-4 text-base leading-7 text-slate-700">Вам совсем не нужно заучивать всё, что представлено в конспекте. Вы можете составить набор умных карточек и пользоваться ими в любой момент тренировок.</p>
        <p className="mt-3 text-base leading-7 text-slate-700">Например, если вы пока не запомнили все немецкие местоимения — добавьте таблицу с ними из справочного конспекта в умные карточки, и тогда вы всегда сможете подсмотреть, не отвлекаясь от задания.</p>
      </section>
    </div>

    <section aria-labelledby="otto-beginner-plan-title" className="min-w-0 rounded-[24px] border border-[var(--otto-line)] bg-white p-4 shadow-[0_8px_28px_rgba(16,42,58,.07)] sm:p-6">
      <p className="otto-kicker">ПОДГОТОВКА К GOETHE A1</p>
      <h2 id="otto-beginner-plan-title" className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">План тренировок</h2>
      <p className="mt-3 text-base leading-7 text-slate-700">Мы не хотим ограничивать вас строгими рамками с точной последовательностью действий. Однако, чтобы упростить подготовку, рекомендуем новичкам пользоваться следующей программой:</p>
      <ol data-testid="otto-beginner-steps-grid" className="mt-5 grid min-w-0 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {trainingSteps.map((step,index)=>{
          const Icon=step.Icon;
          return <li key={step.title} className="h-full min-w-0 rounded-2xl border border-teal-100 bg-[#f8fcfb] p-3 sm:p-4">
            <div className="flex min-w-0 items-start gap-3 xl:block">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e3f1ee] font-black text-teal-900 xl:mb-3" aria-label={'Шаг '+String(index+1)}>{String(index+1).padStart(2,'0')}</div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <Icon className="h-5 w-5 shrink-0 text-teal-800" aria-hidden="true"/>
                  <h3 className="min-w-0 text-lg font-black leading-snug text-slate-950">{step.title}</h3>
                </div>
                <p className="mt-2 text-base leading-7 text-slate-700">{step.content}</p>
              </div>
            </div>
          </li>;
        })}
      </ol>
      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        <button type="button" onClick={onLetters} className="inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 py-3 text-center text-sm font-black text-white">
          Начать с писем<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true"/>
        </button>
        <button type="button" onClick={onBack} className="inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl border border-[var(--otto-line)] bg-white px-4 py-3 text-center text-sm font-black text-slate-800">
          К Учебной базе
        </button>
      </div>
    </section>
  </article>;
}
