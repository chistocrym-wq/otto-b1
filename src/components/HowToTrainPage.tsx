import { ArrowLeft, Clock3, Route, Target, UserRound } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export function HowToTrainPage({ onBack }: Props) {
  return (
    <div className="otto-roadmap-page otto-roadmap-howto-page animate-fade-in">
      <header className="otto-roadmap-page-header is-simple">
        <button type="button" onClick={onBack} className="otto-roadmap-back" aria-label="Назад">
          <ArrowLeft />
        </button>
        <div>
          <span className="otto-roadmap-kicker">Otto A1</span>
          <h1>Как заниматься в тренажёре?</h1>
        </div>
      </header>

      <section className="otto-roadmap-info-card">
        <h2>Что такое Otto A1</h2>
        <p>Это тренажёр для подготовки именно к экзамену A1. Здесь можно заниматься по программе Отто или самостоятельно выбирать нужный раздел.</p>
      </section>

      <section className="otto-roadmap-info-card">
        <h2>Два способа занятий</h2>
        <div className="otto-roadmap-info-row">
          <span><Route /></span>
          <div>
            <strong>1. По программе Отто</strong>
            <p>Отто смотрит на ваши результаты и предлагает тренировку на сегодня.</p>
          </div>
        </div>
        <div className="otto-roadmap-info-row">
          <span><UserRound /></span>
          <div>
            <strong>2. Самостоятельно</strong>
            <p>Можно открыть Schreiben, Sprechen, Lesen или Hören и заниматься тем, что нужно именно сейчас.</p>
          </div>
        </div>
      </section>

      <section className="otto-roadmap-info-card">
        <h2>С чего лучше начинать</h2>
        <p>Если вы только начинаете подготовку, удобно пройти понемногу все четыре навыка. Так Отто быстрее увидит сильные и слабые места и сможет точнее подбирать занятия.</p>
      </section>

      <section className="otto-roadmap-info-card">
        <h2>Сколько заниматься</h2>
        <div className="otto-roadmap-time-guide">
          <div><Clock3 /><strong>5 минут</strong><span>короткое повторение</span></div>
          <div><Clock3 /><strong>15 минут</strong><span>обычная ежедневная тренировка</span></div>
          <div><Clock3 /><strong>30 минут</strong><span>углублённое занятие</span></div>
        </div>
      </section>

      <section className="otto-roadmap-info-card">
        <h2>Как считается прогресс</h2>
        <p>Простое открытие задания не должно добавлять прогресс. Итоговая оценка готовности будет опираться на реальные выполненные задания: правильность, последние и повторные результаты, устойчивость, слабые места и данные по всем четырём навыкам. Если данных мало, Отто покажет, что для точной оценки пока недостаточно результатов.</p>
      </section>

      <section className="otto-roadmap-info-card">
        <div className="otto-roadmap-info-row is-top">
          <span><Target /></span>
          <div>
            <h2>Что означает «готовность к экзамену»</h2>
            <p>Это ориентир тренажёра, а не гарантия сдачи экзамена. Если данных пока мало, Отто покажет, что результатов для оценки ещё недостаточно.</p>
          </div>
        </div>
      </section>

      <section className="otto-roadmap-info-card">
        <h2>Когда идти на пробный экзамен</h2>
        <p>Когда будет накоплено достаточно результатов, Отто покажет рекомендацию. До этого лучше укрепить слабые части и набрать устойчивые результаты.</p>
      </section>
    </div>
  );
}
