import { useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Clock3, Edit3, Target } from 'lucide-react';
import type { ActivityEntry, ModuleId, Progress } from '@/types';
import { ProgressBar } from '@/components/ProgressBar';
import { OttoScene } from '@/components/OttoScene';
import { MODULE_META } from '@/lib/preparation';
import { readLesenProgress } from '@/lib/readingProgress';
import { readHorenProgress } from '@/lib/listeningProgress';
import { useUiLanguage } from '@/lib/i18n';

interface Props{progress:Progress;activity:ActivityEntry[]}
const IDS:ModuleId[]=['lesen','horen','schreiben','sprechen'];
function registeredName(){try{const saved=localStorage.getItem('otto-a1-user-name');if(saved?.trim())return saved.trim()}catch{};const t=(window as unknown as{Telegram?:{WebApp?:{initDataUnsafe?:{user?:{first_name?:string}}}}}).Telegram?.WebApp?.initDataUnsafe?.user?.first_name;return t?.trim()||'Ученик OTTO'}
function sessionCount(activity:ActivityEntry[]){const times=activity.map(x=>new Date(x.at).getTime()).filter(Number.isFinite).sort((a,b)=>a-b);if(!times.length)return 0;let n=1;for(let i=1;i<times.length;i++)if(times[i]-times[i-1]>30*60*1000)n++;return n}
function formatMinutes(seconds:number,lang:'ru'|'de'){const m=Math.round(seconds/60);if(m<60)return lang==='de'?`${m} Min.`:`${m} мин`;const h=Math.floor(m/60),rest=m%60;return lang==='de'?`${h} Std. ${rest} Min.`:`${h} ч ${rest} мин`}

export function AccountPage({progress,activity}:Props){
 const{lang,t}=useUiLanguage();const[name,setName]=useState(registeredName);const[editing,setEditing]=useState(false);const[draft,setDraft]=useState(name);
 const stats=useMemo(()=>IDS.map(id=>{const p=progress[id];const answered=p?.answered??p?.completed??0;const correct=p?.correct??0;return{id,answered,correct,accuracy:answered?Math.round(correct/answered*100):0,attempts:p?.attempts??0}}),[progress]);
 const measured=stats.filter(x=>x.answered>0);const weak=measured.length?measured.reduce((a,b)=>b.accuracy<a.accuracy?b:a):null;
 const answered=stats.reduce((s,x)=>s+x.answered,0),correct=stats.reduce((s,x)=>s+x.correct,0),accuracy=answered?Math.round(correct/answered*100):0;
 const seconds=activity.reduce((s,x)=>s+Math.max(0,x.durationSeconds??0),0);const sessions=sessionCount(activity);const recent=[...activity].sort((a,b)=>b.at.localeCompare(a.at)).slice(0,6);
 const lesen=readLesenProgress(),horen=readHorenProgress();
 const saveName=()=>{const next=draft.trim()||name;setName(next);setDraft(next);setEditing(false);try{localStorage.setItem('otto-a1-user-name',next)}catch{}};
 return <div className="otto-hub-screen animate-fade-in">
  <section className="otto-page-hero otto-account-hero"><div><p className="otto-kicker">{t('profile')}</p><div className="flex flex-wrap items-center gap-2"><h1>{name}</h1><button type="button" onClick={()=>setEditing(v=>!v)} className="flex h-9 w-9 items-center justify-center rounded-xl border bg-white" aria-label={t('edit')}><Edit3 className="h-4 w-4"/></button></div>{editing&&<div className="mt-3 flex gap-2"><input value={draft} onChange={e=>setDraft(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border bg-white px-3"/><button type="button" onClick={saveName} className="rounded-xl bg-slate-900 px-4 font-bold text-white">{t('done')}</button></div>}</div><div className="otto-page-hero-character" aria-hidden="true"><OttoScene scene="home" className="otto-page-hero-scene"/></div></section>

  <section className="otto-account-card"><div className="otto-account-stat"><span><BarChart3/></span><strong>{sessions}</strong><small>{t('sessions')}</small></div><div className="otto-account-stat"><span><Clock3/></span><strong className="text-xl">{formatMinutes(seconds,lang)}</strong><small>{t('studyTime')}</small></div><div className="otto-account-stat"><span><CheckCircle2/></span><strong>{accuracy}%</strong><small>{t('accuracy')}</small></div></section>

  <section className="mt-4 rounded-[24px] border border-white/90 bg-white p-4 shadow-[0_12px_32px_rgba(9,47,104,.08)]"><div className="mb-3 flex items-center justify-between"><div><p className="otto-kicker">{t('allFour')}</p><h2 className="text-lg font-black text-slate-950">{lang==='de'?'Ergebnisse nach Fertigkeit':'Результаты по модулям'}</h2></div><Target className="h-7 w-7 text-[#092F68]"/></div><div className="space-y-4">{stats.map(s=><div key={s.id}><div className="mb-1 flex items-center justify-between gap-3 text-sm"><span className="font-bold">{MODULE_META[s.id].title} · {lang==='de'?MODULE_META[s.id].title:MODULE_META[s.id].label}</span><span className="text-slate-500">{s.answered?s.accuracy+'%':t('notMeasured')}</span></div><ProgressBar value={s.accuracy} max={100}/><p className="mt-1 text-xs text-slate-400">{t('completed')}: {s.answered} · {t('attempts')}: {s.attempts}</p></div>)}</div></section>

  <section className="mt-4 rounded-[24px] border border-[#85D3F7] bg-[#A7E0F9] p-4"><p className="otto-kicker">{t('trainNow')}</p><h2 className="mt-1 text-lg font-black text-slate-950">{weak?`${MODULE_META[weak.id].title} — ${weak.accuracy}%`:t('insufficient')}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{weak?(lang==='de'?'Das ist aktuell der schwächste gemessene Bereich. OTTO wird ihn im Tagesplan häufiger einsetzen.':'Сейчас этому навыку нужно больше внимания. Отто будет чаще включать его в план тренировки.'):(lang==='de'?'Machen Sie zuerst Aufgaben in allen vier Bereichen.':'Сначала выполните задания во всех четырёх модулях.')}</p></section>

  <section className="mt-4 rounded-[24px] border bg-white p-4"><p className="otto-kicker">{t('recentActivity')}</p><div className="mt-3 space-y-2">{recent.length?recent.map(item=><div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm"><div><b>{MODULE_META[item.module as ModuleId]?.title||item.module}</b><p className="text-xs text-slate-400">{new Date(item.at).toLocaleString(lang==='de'?'de-DE':'ru-RU')}</p></div><strong>{item.percent}%</strong></div>):<p className="text-sm text-slate-500">{t('insufficient')}</p>}</div></section>

  <section className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border bg-white p-4"><b>Lesen</b><p className="mt-1 text-sm text-slate-600">Teil 1: {lesen['1'].completedTasks}/50 · Teil 2: {lesen['2'].completedTasks}/50 · Teil 3: {lesen['3'].completedTasks}/50</p></div><div className="rounded-2xl border bg-white p-4"><b>Hören</b><p className="mt-1 text-sm text-slate-600">{horen.completed}/{Math.max(horen.completed,80)} · {horen.correct} {lang==='de'?'richtig':'правильно'}</p></div></section>
 </div>
}
