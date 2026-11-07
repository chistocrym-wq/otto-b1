import { ArrowLeft, ArrowRight, CheckCircle2, CircleX, CircleHelp, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ModuleId } from '@/types';
import { readTaskResults } from '@/lib/taskResults';
import { hasModuleTaskCompletion } from '@/lib/moduleTaskCompletion';

export interface ListTaskItem{ id:string; title:string; subtitle?:string }
export function TaskList({module,teil,items,onBack,onSelect,onContinue,continueIndex,userId,guestLimit}:{module:ModuleId;userId?:string;teil:1|2|3;items:ListTaskItem[];onBack:()=>void;onSelect:(index:number)=>void;onContinue:()=>void;continueIndex:number;guestLimit?:number}){
 // Re-read the verified memory snapshot when a server GET restores v2 history.
 const [,refreshResults]=useState(0);
 useEffect(()=>{
  const onResultsChanged=()=>refreshResults(value=>value+1);
  window.addEventListener('otto:task-results-changed',onResultsChanged);
  return ()=>window.removeEventListener('otto:task-results-changed',onResultsChanged);
 },[userId]);
 const results=readTaskResults(module,userId);
  const limited=guestLimit!==undefined;
  const allowed=limited?items.slice(0,guestLimit):items;
  const next=Math.min(Math.max(0,continueIndex),Math.max(0,allowed.length-1));
 return <div data-testid="otto-training-task-list" className="animate-fade-in pb-8">
  <header className="mb-5 flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
   <button type="button" onClick={onBack} aria-label="Назад к выбору Teil" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white"><ArrowLeft className="h-5 w-5"/></button>
   <div className="min-w-0"><h1 className="text-xl font-black">{module==='lesen'?'Lesen':module==='horen'?'Hören':module==='schreiben'?'Schreiben':'Sprechen'} A1</h1><p className="text-sm text-slate-500">Teil {teil}</p></div>
  </header>
  <h2 className="mb-3 text-xl font-black">Задания Teil {teil}</h2>
  {allowed.length>0&&<button data-testid="otto-task-continue" type="button" onClick={limited?()=>onSelect(next):onContinue} className="mb-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 font-bold text-white">Продолжить с задания {limited?next+1:Math.min(items.length,Math.max(0,continueIndex))+1}<ArrowRight className="h-4 w-4"/></button>}
  <div className="space-y-2">
   {allowed.map((task,index)=>{
    const result=results[task.id];
    const status=result?.status;
    // Legacy completion alone contains no trustworthy correctness or score.
    const completedPreviously=!result&&hasModuleTaskCompletion(module,task.id);
    const label=status==='correct'?'Правильно':status==='incorrect'?'Есть ошибки':status==='skipped'?'Пропущено':status==='reviewed'?'Проверено':completedPreviously?'Выполнялось ранее':'Ещё не выполнялось';
    const cls=status==='correct'?'border-emerald-100 bg-emerald-50 text-emerald-800':status==='incorrect'?'border-rose-100 bg-rose-50 text-rose-800':status==='skipped'?'border-amber-100 bg-amber-50 text-amber-800':status==='reviewed'?'border-sky-100 bg-sky-50 text-sky-800':'border-slate-200 bg-white text-slate-700';
    const Icon=status==='correct'?CheckCircle2:status==='incorrect'?CircleX:status==='skipped'?CircleHelp:ChevronRight;
    const title=module==='schreiben'&&teil===2
      ? (/^Письмо\s+\d+\b/.test(task.title)?task.title:`Письмо ${index+1} — ${task.title}`)
      : module==='schreiben'&&teil===1
        ? (/^Формуляр\s+\d+\b/.test(task.title)?task.title:`Формуляр ${index+1} — ${task.title}`)
        : `Задание ${index+1} — ${task.title.replace(/\s*[·—-]\s*\d+$/, '')}`;
    return <button data-testid={"otto-task-"+(index+1)} type="button" key={task.id} onClick={()=>onSelect(index)} className={`flex min-h-14 w-full min-w-0 items-center gap-3 rounded-2xl border px-3 py-3 text-left shadow-sm transition hover:border-teal-400 ${cls}`}>
     <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70"><Icon className="h-5 w-5"/></span>
     <span className="min-w-0 flex-1"><strong className="block break-words text-[15px] font-black text-slate-950">{title}</strong>{task.subtitle&&<span className="block break-words text-xs leading-5 text-slate-600">{task.subtitle}</span>}<span className="mt-0.5 block text-xs font-semibold">{label}{result&&` · ${result.score}/${result.total}`}{result?.corrected?' · Исправлено':''}</span></span>
     <ChevronRight className="h-4 w-4 shrink-0"/>
    </button>;
   })}
  </div>
  {limited&&(items.length>allowed.length||(module==='sprechen'&&teil===1))&&<aside data-testid="otto-guest-registration" role="status" className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-teal-950">
    <b>Гостю доступны первые {guestLimit} задания Teil {teil}</b>
    <p className="mt-2 text-sm">{items.length>allowed.length?'Остальные задания и проверки доступны после регистрации в OTTO.':'Дополнительная практика Sprechen доступна после регистрации в OTTO.'}</p>
    <a href="/?register=1" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-teal-800 px-4 font-bold text-white">Войти или зарегистрироваться</a>
  </aside>}
 </div>;
}
