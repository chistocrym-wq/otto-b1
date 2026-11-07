import { ArrowRight, CheckCircle2, Target, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ActivityEntry, ModuleId, Progress } from '@/types';
import { buildLearningInsights, moduleInsightLabel } from '@/lib/learningInsights';
import { readTaskResults } from '@/lib/taskResults';

interface Props{userId?:string;progress:Progress;activity:ActivityEntry[];onSelectModule:(module:ModuleId)=>void}
const serifFont={fontFamily:'Georgia, "Times New Roman", serif'};
const sansFont={fontFamily:'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'};

export function MyErrorsPage({userId,progress,activity,onSelectModule}:Props){
  const [,refreshResults]=useState(0);
  useEffect(()=>{
    const onResultsChanged=()=>refreshResults(value=>value+1);
    window.addEventListener('otto:task-results-changed',onResultsChanged);
    return ()=>window.removeEventListener('otto:task-results-changed',onResultsChanged);
  },[userId]);
  const insights=buildLearningInsights(progress,activity);
  const strongest=insights.strongest;
  const weakest=insights.weakest;
  const topProblems=insights.problems.slice(0,4);
  const nextModule=topProblems[0]?.module??weakest?.id??null;
  const fixed=(['schreiben','sprechen','horen','lesen'] as ModuleId[]).flatMap(module=>Object.entries(readTaskResults(module,userId)).filter(([,result])=>result.attempts.some(a=>!a.skipped&&a.score<a.total)).map(([id,result])=>({id,module,result})));

  return <div className="animate-fade-in space-y-4 pb-8 text-[var(--otto-ink)]" style={sansFont}>
    <section className="rounded-[28px] border border-[var(--otto-line)] bg-[var(--otto-surface)] p-5 shadow-[0_14px_34px_rgba(43,54,54,.07)] sm:p-6">
      <p className="text-[11px] font-[850] uppercase tracking-[.16em] text-[var(--otto-petrol-dark)]">Персональная работа</p>
      <h1 className="mt-1 text-2xl font-bold leading-[1.05] text-[var(--otto-ink)]" style={serifFont}>Мои ошибки</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--otto-muted)]">Здесь учитываются ваши результаты тренировок: ошибки Lesen/Hören, разбор Schreiben и результаты Sprechen. Если данных пока мало, выводов о слабых местах не будет.</p>
    </section>

    {!insights.hasData&&<section className="rounded-[24px] border border-[var(--otto-line)] bg-[var(--otto-amber-soft)] p-5"><div className="flex gap-3"><Target className="mt-0.5 h-5 w-5 shrink-0 text-[var(--otto-terracotta-dark)]"/><div><h2 className="font-bold leading-[1.08] text-[var(--otto-ink)]" style={serifFont}>Сначала соберём немного данных</h2><p className="mt-1 text-sm leading-6 text-[var(--otto-muted)]">Выполните несколько заданий хотя бы в двух модулях. После этого здесь появятся сильная сторона, повторяющиеся проблемы и следующий шаг.</p></div></div></section>}

    {fixed.length>0&&<section className="rounded-[24px] border border-[var(--otto-line)] bg-[var(--otto-surface)] p-5">
      <h2 className="font-bold text-[var(--otto-ink)]">История исправления ошибок</h2>
      <div className="mt-3 space-y-2">{fixed.map(({id,module,result})=><div key={module+id} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm"><b>{module.toUpperCase()} · {id}</b><span className={result.status==='correct'?'text-emerald-700':'text-rose-700'}>{result.status==='correct'?'Ошибка исправлена':'Ошибка ещё не исправлена'}</span></div>)}</div>
    </section>}
    <div className="grid gap-3 sm:grid-cols-2">
      <section className="rounded-[24px] border border-[var(--otto-line)] bg-[var(--otto-sage-soft)] p-5">
        <div className="flex items-center gap-2 text-[var(--otto-petrol-dark)]"><CheckCircle2 className="h-5 w-5"/><b>Что уже получается</b></div>
        {strongest?<><h2 className="mt-3 text-xl font-bold leading-[1.08] text-[var(--otto-ink)]" style={serifFont}>{moduleInsightLabel(strongest.id)}</h2><p className="mt-1 text-sm leading-6 text-[var(--otto-muted)]">Средний результат по выполненным попыткам: <b>{strongest.average}%</b>. Сейчас здесь самый стабильный результат.</p></>:<p className="mt-3 text-sm leading-6 text-[var(--otto-muted)]">Пока недостаточно попыток, чтобы назвать самый сильный навык.</p>}
      </section>
      <section className="rounded-[24px] border border-[var(--otto-line)] bg-[var(--otto-amber-soft)] p-5">
        <div className="flex items-center gap-2 text-[var(--otto-danger)]"><TriangleAlert className="h-5 w-5"/><b>Что требует внимания</b></div>
        {topProblems[0]?<><h2 className="mt-3 text-xl font-bold leading-[1.08] text-[var(--otto-ink)]" style={serifFont}>{topProblems[0].label}</h2><p className="mt-1 text-sm leading-6 text-[var(--otto-muted)]">Эта проблема встречалась <b>{topProblems[0].count}</b> {topProblems[0].count===1?'раз':'раз(а)'}.{topProblems[0].example?` Пример: ${topProblems[0].example}`:''}</p></>:weakest?<><h2 className="mt-3 text-xl font-bold leading-[1.08] text-[var(--otto-ink)]" style={serifFont}>{moduleInsightLabel(weakest.id)}</h2><p className="mt-1 text-sm leading-6 text-[var(--otto-muted)]">Средний результат: <b>{weakest.average}%</b>. Повторяющиеся ошибки появятся после следующих заданий.</p></>:<p className="mt-3 text-sm leading-6 text-[var(--otto-muted)]">Слабое место появится после нескольких тренировок.</p>}
      </section>
    </div>

    {topProblems.length>0&&<section className="rounded-[24px] border border-[var(--otto-line)] bg-[var(--otto-surface)] p-5 shadow-[0_12px_30px_rgba(43,54,54,.06)]"><p className="text-[11px] font-[850] uppercase tracking-[.14em] text-[var(--otto-petrol-dark)]">Повторяющиеся проблемы</p><h2 className="mt-1 text-xl font-bold leading-[1.08] text-[var(--otto-ink)]" style={serifFont}>Что именно повторить</h2><div className="mt-4 space-y-2">{topProblems.map(problem=><div key={problem.key} className="rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] p-4"><div className="flex items-center justify-between gap-3"><b className="text-[var(--otto-ink)]">{problem.label}</b><span className="rounded-full bg-[var(--otto-surface)] px-2.5 py-1 text-xs font-[850] text-[var(--otto-muted)]">{problem.count}×</span></div>{problem.example&&<p className="mt-2 break-words text-xs leading-5 text-[var(--otto-muted)]">{problem.example}</p>}</div>)}</div></section>}

    <section className="rounded-[24px] border border-[var(--otto-line)] bg-[var(--otto-surface)] p-5 shadow-[0_12px_30px_rgba(43,54,54,.06)]">
      <p className="text-[11px] font-[850] uppercase tracking-[.14em] text-[var(--otto-petrol-dark)]">Сегодня потренируем</p>
      <h2 className="mt-1 text-xl font-bold leading-[1.08] text-[var(--otto-ink)]" style={serifFont}>{nextModule?moduleInsightLabel(nextModule):'Любой основной модуль'}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--otto-muted)]">{nextModule?'Отто предлагает модуль, где сейчас больше всего повторяющихся ошибок или ниже результат. После новых заданий рекомендация обновится автоматически.':'Начните с любого раздела — после первых результатов Отто сможет предложить, что потренировать дальше.'}</p>
      {nextModule&&<button type="button" onClick={()=>onSelectModule(nextModule)} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--otto-petrol-dark)] px-5 font-[850] text-white">Тренировать {moduleInsightLabel(nextModule)} <ArrowRight className="h-4 w-4"/></button>}
    </section>
  </div>;
}
