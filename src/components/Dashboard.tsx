import { useMemo, useState } from 'react';
import { ArrowRight, BarChart3, BookOpen, CreditCard, Headphones, MessageCircleMore, PenLine, Share2 } from 'lucide-react';
import { OttoScene } from '@/components/OttoScene';
import type { ActivityEntry, ModuleId, Progress } from '@/types';
import { getReadiness, getTodayActivity, MODULE_META } from '@/lib/preparation';
import { useUiLanguage } from '@/lib/i18n';
import { createPayment } from '@/lib/paymentClient';

interface DashboardProps {
  onSelectModule:(module:ModuleId)=>void;
  onOpenInstructions:()=>void;
  onOpenExamGuide:()=>void;
  onOpenMockExam:()=>void;
  onOpenNews:()=>void;
  onOpenAccount:()=>void;
  onOpenSettings:()=>void;
  onOpenReadiness:()=>void;
  onShare:()=>void;
  onOpenSupport:()=>void;
  onOpenDailyTraining:(minutes:Minutes)=>void;
  onOpenHowTo:()=>void;
  progress:Progress;
  activity:ActivityEntry[];
  trialRemainingMs?: number;
  canPurchaseAccess?: boolean;
  subscriptionActive?: boolean;
  subscriptionUntil?: string | null;
  guest?:boolean;
  onRegister?:()=>void;
}

export type Minutes=5|15|30;
const moduleIcons:Record<ModuleId,typeof PenLine>={schreiben:PenLine,sprechen:MessageCircleMore,lesen:BookOpen,horen:Headphones};
const moduleOrder:ModuleId[]=['schreiben','sprechen','horen','lesen'];
const serifFont={fontFamily:'Georgia, "Times New Roman", serif'};
const sansFont={fontFamily:'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'};

export function Dashboard(props:DashboardProps){
 const{lang}=useUiLanguage();
 const[minutes,setMinutes]=useState<Minutes>(()=>{const s=Number(localStorage.getItem('otto-a1-session-minutes'));return s===5||s===15||s===30?s:15});
 const[paymentLoading,setPaymentLoading]=useState(false);
 const[paymentNotice,setPaymentNotice]=useState('');
 const readiness=useMemo(()=>getReadiness(props.progress,props.activity),[props.progress,props.activity]);
 const today=useMemo(()=>getTodayActivity(props.activity),[props.activity]);
 const overall=readiness.overall;
 const trialRemaining=useMemo(()=>{
   const ms=Math.max(0,props.trialRemainingMs??0);
   if(!ms)return '';
   const totalMinutes=Math.max(1,Math.ceil(ms/60000));
   const days=Math.floor(totalMinutes/1440);
   const hours=Math.floor((totalMinutes%1440)/60);
   const minutes=totalMinutes%60;
   if(days>0)return `${days} дн. ${hours} ч`;
   if(hours>0)return `${hours} ч ${minutes} мин`;
   return `${minutes} мин`;
 },[props.trialRemainingMs]);
 const subscriptionUntilLabel=useMemo(()=>{
   if(!props.subscriptionUntil)return '';
   const date=new Date(props.subscriptionUntil);
   if(Number.isNaN(date.getTime()))return '';
   return date.toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});
 },[props.subscriptionUntil]);
 const chooseMinutes=(value:Minutes)=>{setMinutes(value);try{localStorage.setItem('otto-a1-session-minutes',String(value))}catch{/* ignore */}};
 const startTraining=()=>props.onOpenDailyTraining(minutes);
 const startPayment=async()=>{
   if(paymentLoading)return;
   setPaymentLoading(true);setPaymentNotice('');
   try{const result=await createPayment();window.location.assign(result.confirmationUrl)}
   catch(error){setPaymentNotice(error instanceof Error?error.message:'Не удалось открыть онлайн-оплату. Попробуйте позже.')}
   finally{setPaymentLoading(false)}
 };

 return <div className="otto-dashboard-existing animate-fade-in h-full space-y-4 overflow-y-auto overflow-x-hidden overscroll-contain pb-5 text-[var(--otto-ink)] [scrollbar-width:none]" style={sansFont}>
   <section className="otto-dashboard-hero relative overflow-hidden rounded-[28px] border border-[var(--otto-line)] bg-[var(--otto-petrol-soft)] px-5 py-4 shadow-[0_14px_36px_rgba(43,54,54,.07)] sm:px-6">
     <div className="relative z-10 max-w-[72%]"><p className="text-[11px] font-[850] uppercase tracking-[.16em] text-[var(--otto-petrol-dark)]">OTTO A1</p><h1 className="mt-1 text-2xl font-bold leading-[1.05] text-[var(--otto-ink)] sm:text-3xl" style={serifFont}>{lang==='de'?'Heute weiter zum A1':'Сегодня — ещё шаг к A1'}</h1><p className="mt-1 text-sm leading-6 text-[var(--otto-muted)]">{lang==='de'?'Wählen Sie einen Bereich zum Üben.':'Выберите нужный модуль для подготовки.'}</p></div>
     <OttoScene scene="home" className="absolute -bottom-16 -right-7 h-48 w-auto max-w-none sm:-bottom-20 sm:right-0 sm:h-56" />
   </section>

    {props.subscriptionActive?<section className="rounded-[22px] border border-[var(--otto-line)] bg-[var(--otto-sage-soft)] px-4 py-3 text-sm text-[var(--otto-ink)] shadow-[0_10px_24px_rgba(43,54,54,.05)]"><div className="flex items-center justify-between gap-3"><span className="font-bold">Полный доступ активен</span>{subscriptionUntilLabel&&<strong className="text-[var(--otto-petrol-dark)]">до {subscriptionUntilLabel}</strong>}</div><p className="mt-1 text-xs leading-5 text-[var(--otto-muted)]">{subscriptionUntilLabel?`Подписка активна до ${subscriptionUntilLabel}.`:'Подписка активна.'}</p></section>:trialRemaining&&<section className="rounded-[24px] border border-[#b6d9c8] bg-gradient-to-br from-[#e5f7e9] via-[#c8ede0] to-[#f5efcc] px-5 py-5 text-[#18463b] shadow-[0_16px_30px_rgba(24,92,67,.14)]"><p className="text-[11px] font-extrabold uppercase tracking-[.17em] text-[#287765]">OTTO A1 · Начните бесплатно</p><h2 className="mt-1 font-serif text-[clamp(1.35rem,5vw,1.75rem)] font-bold leading-tight">Ваш пробный доступ — 3 дня</h2><p className="mt-3 text-base font-semibold">Осталось: <strong className="text-xl text-[#114d3e]">{trialRemaining}</strong></p><p className="mt-1 text-xs leading-5 text-[#42685e]">3 дня пробного доступа. Живой отсчёт по подтверждённому времени сервера. {props.guest?'Гостевой прогресс не сохраняется.':'Прогресс сохраняется в вашем аккаунте.'}</p>{props.guest&&<button type="button" onClick={props.onRegister} className="mt-3 min-h-11 w-full rounded-xl border border-[#99bbac] bg-white px-4 font-bold text-[#176554]">Зарегистрироваться и сохранять дальнейший прогресс</button>}{props.canPurchaseAccess&&<div className="mt-4 border-t border-[#b3d3bf] pt-3"><button type="button" onClick={()=>void startPayment()} disabled={paymentLoading} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#99bbac] bg-white/90 px-4 text-sm font-semibold text-[#286255] disabled:cursor-wait disabled:opacity-60"><CreditCard className="h-4 w-4"/>{paymentLoading?'Открываем оплату…':'Купить полный доступ — 1500 ₽ / 30 дней'}</button>{paymentNotice&&<p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold leading-5 text-[var(--otto-ink)]" role="status">{paymentNotice}</p>}</div>}</section>}

   <button type="button" onClick={props.onOpenReadiness} className="w-full rounded-[24px] border border-[var(--otto-line)] bg-[var(--otto-surface)] p-4 text-left shadow-[0_12px_30px_rgba(43,54,54,.07)] sm:p-5">
     <div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--otto-petrol-soft)] text-[var(--otto-petrol-dark)]"><BarChart3 className="h-5 w-5"/></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><strong className="text-base text-[var(--otto-ink)]">{lang==='de'?'A1-Bereitschaft':'Готовность к A1'}</strong><b className="text-xl text-[var(--otto-ink)]">{overall===null?'—':`${overall}%`}</b></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--otto-sage-soft)]"><div className="h-full rounded-full bg-[var(--otto-petrol)] transition-all" style={{width:`${overall??0}%`}}/></div><p className="mt-2 text-xs leading-5 text-[var(--otto-muted)]">{readiness.evidenceLabel}</p></div><ArrowRight className="h-4 w-4 shrink-0 text-[var(--otto-muted)]"/></div>
   </button>

   <section className="rounded-[24px] border border-[var(--otto-line)] bg-[var(--otto-surface)] p-4 shadow-[0_12px_30px_rgba(43,54,54,.07)] sm:p-5">
     <div className="grid grid-cols-2 gap-3">{moduleOrder.map(id=>{const Icon=moduleIcons[id];const module=readiness.modules[id];return <button key={id} type="button" onClick={()=>props.onSelectModule(id)} className="otto-dashboard-module-card min-h-[118px] rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] p-4 text-left transition hover:border-[var(--otto-petrol)]"><span className="flex items-start justify-between gap-2"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--otto-surface)] text-[var(--otto-petrol-dark)]"><Icon className="h-5 w-5"/></span><b className="text-sm text-[var(--otto-muted)]">{module.score}%</b></span><strong className="mt-3 block text-base text-[var(--otto-ink)]">{MODULE_META[id].title}</strong><span className="mt-1 block text-xs text-[var(--otto-muted)]">Успешность {module.accuracy}%</span><span className="mt-1 block text-xs text-[var(--otto-muted)]">Пройдено {module.completedTasks}/{module.totalTasks} · {module.completionPercent}%</span></button>})}</div>
   </section>

   <div className="grid gap-2 sm:grid-cols-2">
     
     <button type="button" onClick={props.onShare} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--otto-line)] bg-[var(--otto-surface)] px-4 text-sm font-bold text-[var(--otto-ink)]"><Share2 className="h-4 w-4"/>Поделиться</button>
     <a href="/goethe-a1/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--otto-line)] bg-[var(--otto-surface)] px-4 text-sm font-bold text-[var(--otto-petrol-dark)] transition hover:border-[var(--otto-petrol)]"><BookOpen className="h-4 w-4 shrink-0"/>{lang==='de'?'Goethe A1: Vorbereitung':'Подготовка к Goethe A1'}</a>
   </div>
 </div>;
}
