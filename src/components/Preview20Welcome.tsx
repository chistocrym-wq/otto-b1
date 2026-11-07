import { OttoScene } from '@/components/OttoScene';
import { useJourneyScope } from '@/analytics/journeyClient';

interface Props { onContinue: () => void; onExisting: () => void }
export function Preview20Welcome({onContinue,onExisting}:Props) {
  useJourneyScope('Preview20Welcome',{view:'welcome',phase:'story'},'onboarding',60);
  return <main className="flex h-[100dvh] min-h-0 w-full items-center justify-center overflow-hidden bg-[#f7f1e8] px-2 py-2 font-sans text-[#203735] sm:px-4 sm:py-4" aria-label="Приветствие OTTO">
    <section className="flex h-full min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-[24px] border border-[#dce8df] bg-white shadow-[0_20px_60px_rgba(22,75,64,.12)] sm:rounded-[30px]">
      <header className="grid min-h-[160px] shrink-0 grid-cols-[minmax(0,1fr)_minmax(94px,30%)] items-end gap-2 bg-[#e5f2e9] px-4 pt-4 sm:min-h-[185px] sm:gap-4 sm:px-8 sm:pt-5">
        <div className="min-w-0 pb-4 sm:pb-5">
          <p className="text-[11px] font-extrabold uppercase tracking-[.12em] text-[#216b5b] sm:text-xs sm:tracking-[.2em]">OTTO · Goethe A1</p>
          <h1 className="mt-3 break-words font-serif text-[clamp(1.3rem,3.3vw,2.2rem)] font-bold leading-[1.12]">❤️ Добро пожаловать в OTTO!</h1>
        </div>
        <OttoScene scene="home" eager className="h-[148px] w-auto max-w-full self-end justify-self-end object-contain object-bottom sm:h-[185px]"/>
      </header>
      <div data-testid="welcome-scroll" className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-5 text-[15px] leading-7 sm:px-8 sm:py-6">
        <p>Привет! 👋 Мы — создатели OTTO. Мы сами прошли путь подготовки к <strong>Goethe A1</strong> и сдали экзамен <strong>на 80+ баллов!</strong> 🎉</p>
        <p>Самому старшему из нас — <strong>56 лет</strong>. Он начал учить немецкий с абсолютного нуля и всего за <strong>2,5 месяца</strong> сдал A1. Так что мы знаем, как сложно бывает в самом начале, особенно когда непонятно, с чего начать.</p>
        <p>Мы создали OTTO на основе <strong>собственного человеческого опыта</strong>: объединили тренировки Hören, Lesen, Schreiben и Sprechen, разбор ошибок и настоящие пробные задания.</p>
        <p>А ещё собрали <strong>авторский справочник</strong>, которого нам самим очень не хватало. Это не переписанный учебник, а самостоятельно структурированные слова, правила и подсказки, которые действительно понадобились нам на экзамене.</p>
        <p>Наш совет: сначала загляните в справочник и посмотрите, как проходил экзамен у нас. И обязательно <strong>начинайте учиться писать письма с первых дней</strong> — даже если пока не знаете ни слова по-немецки!</p>
        <p className="font-semibold text-[#216b5b]">Мы справились. И верим, что у вас тоже получится! ❤️</p>
        <p className="text-sm leading-6 text-[#42685e]">Хотите узнать, что входит в тренажёр? <a href="/goethe-a1/" target="_blank" rel="noopener noreferrer" className="font-bold text-[#176554] underline underline-offset-4">Подготовка к Goethe A1 с OTTO: задания, справочник и стоимость</a>.</p>
      </div>
      <footer data-testid="welcome-actions" className="z-10 shrink-0 space-y-2 border-t border-[#dce8df] bg-white px-4 pb-[max(.7rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-6px_22px_rgba(22,75,64,.05)] sm:px-8 sm:pb-4">
        <button type="button" onClick={onContinue} className="min-h-12 w-full rounded-2xl bg-[#176554] px-5 py-3 text-base font-extrabold text-white shadow-md transition hover:bg-[#0f4a3c]">🚀 Начать знакомство с OTTO</button>
        <button type="button" onClick={onExisting} className="min-h-11 w-full rounded-xl border border-[#b5d2c4] bg-white px-4 font-bold text-[#176554]">У меня уже есть аккаунт — войти</button>
      </footer>
    </section>
  </main>;
}
