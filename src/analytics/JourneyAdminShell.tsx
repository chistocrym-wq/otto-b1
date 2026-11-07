import {useEffect,useMemo,useState} from 'react';
import {ReadableAdmin as ExistingAdmin} from '../admin/ReadableAdmin';
import {TeacherAdmin} from '../admin/TeacherAdmin';
import catalog from 'virtual:otto-journey-catalog';
import {FEEDBACK,frameLabel,type JourneyEvent,type VisitSummary} from '../../shared/preview20-journey.js';
import './journey.css';

type User={user_id:string;user_name:string;email:string|null;telegram_id:string|null};
type VisitList={ok:boolean;visits:VisitSummary[];day:string;note?:string;hasMore?:boolean};
const fmt=(value:string|null|undefined)=>value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(value))+' МСК':'—';
const duration=(ms:number)=>ms<1000?'0 с':ms<60000?Math.round(ms/1000)+' с':Math.floor(ms/60000)+' мин '+Math.round((ms%60000)/1000)+' с';
const eventLabel=(e:JourneyEvent)=>{
 if(e.kind==='screen')return 'Экран: '+frameLabel(e.frame||null);
 if(e.kind==='section')return 'Фрагмент объяснения: '+(catalog[e.section||'']||'внутренний фрагмент');
 if(e.kind==='action')return 'Действие: '+(e.action||'кнопка');
 if(e.kind==='interaction')return 'Начал(а) отвечать в задании';
 if(e.kind==='feedback')return 'Со слов пользователя: '+(FEEDBACK[e.choice||'']||'обратная связь')+(e.comment?' — '+e.comment:'');
 if(e.kind==='operation'){
  const result=e.outcome==='ok'?'успешно':e.outcome==='start'?'начато':e.outcome==='normal_unauthenticated'?'обычный гостевой ответ':e.outcome==='network'?'ошибка сети':e.outcome==='rejected'?'сервер отклонил':e.outcome||'состояние неизвестно';
  return 'Операция '+(e.operation||'')+': '+result+(e.code?' · '+e.code:'');
 }
 if(e.kind==='visibility')return e.outcome==='hidden'?'Вкладка скрыта':'Вкладка снова видима';
 if(e.kind==='connection')return e.outcome==='offline'?'Пропала сеть':'Сеть восстановлена';
 return e.kind;
};
function JourneyView(){
 const [day,setDay]=useState(()=>new Date(Date.now()+3*3600000).toISOString().slice(0,10));
 const [list,setList]=useState<VisitSummary[]>([]),[users,setUsers]=useState<User[]>([]),[selected,setSelected]=useState<VisitSummary|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=async()=>{
  setBusy(true);setError('');
  try{
   const [vr,ur]=await Promise.all([
    fetch('/api/admin-journey?day='+encodeURIComponent(day),{credentials:'same-origin',cache:'no-store'}),
    fetch('/api/admin-support?view=users&limit=50&offset=0',{credentials:'same-origin',cache:'no-store'})
   ]);
   if(vr.status===401||ur.status===401){location.reload();return;}
   const vd=await vr.json() as VisitList,ud=await ur.json() as {users?:User[]};
   if(!vr.ok||!vd.ok)throw Error('journey');
   setList(vd.visits||[]);setUsers(Array.isArray(ud.users)?ud.users:[]);
  }catch{setError('Не удалось загрузить журнал. Это не означает отсутствие посещений.');}
  finally{setBusy(false);}
 };
 useEffect(()=>{void load();},[day]);
 const names=useMemo(()=>new Map(users.map(u=>[u.user_id,u.user_name||u.email||'Пользователь OTTO'])),[users]);
 const open=async(v:VisitSummary)=>{
  setBusy(true);setError('');
  try{const r=await fetch('/api/admin-journey?id='+encodeURIComponent(v.id),{credentials:'same-origin',cache:'no-store'});const d=await r.json();if(!r.ok||!d.ok)throw Error();setSelected(d.visit);}
  catch{setError('Не удалось открыть подробности этого посещения.');}finally{setBusy(false);}
 };
 return <main className="oj-admin">
  <header className="oj-admin-head"><div><small>OTTO · PREVIEW 20</small><h1>Где останавливаются посетители</h1><p>Первый визит: подробный путь и время за первые 5 минут, затем только последний экран и технические ошибки. Это не учебный прогресс и не реконструкция прошлых действий.</p></div><button className="oj-button" onClick={()=>void load()} disabled={busy}>Обновить</button></header>
  <div className="oj-filter"><label>День <input type="date" value={day} onChange={e=>setDay(e.target.value)}/></label><span>{busy?'Загружаем…':list.length+' тестовых посещений'}</span></div>
  {error&&<p className="oj-warning" role="alert">{error}</p>}
  <div className="oj-cards">{list.map(v=>{
    const user=v.userId?names.get(v.userId):null;const total=v.time.registration+v.time.learning+v.time.reference+v.time.practice;
    return <article className="oj-visit" key={v.id}>
      <div className="oj-visit-top"><strong>{user|| (v.userId?'Зарегистрированный пользователь':'Гость')}</strong><span>{v.ongoing?'сейчас активен':'последнее событие '+fmt(v.lastReceivedAt)}</span></div>
      <p><b>Последний зафиксированный экран:</b> {frameLabel(v.lastScreen)}</p>
      {v.lastSection&&<p><b>Последний фрагмент:</b> {catalog[v.lastSection]||'внутренний шаг объяснения'}</p>}
      <div className="oj-mini"><span>Регистрация {duration(v.time.registration)}</span><span>Объяснения {duration(v.time.learning+v.time.reference)}</span><span>Практика {duration(v.time.practice)}</span><span>Всего активно ≈ {duration(total)}</span></div>
      {v.issues>0&&<p className="oj-bad">Зафиксировано проблем: {v.issues}</p>}
      <button className="oj-button oj-primary" onClick={()=>void open(v)}>Открыть путь</button>
    </article>;
  })}</div>
  {!busy&&!list.length&&!error&&<p className="oj-empty">За этот день добровольных записей нет. Это не означает, что посетителей не было.</p>}
  {selected&&<JourneyDialog visit={selected} name={selected.userId?names.get(selected.userId):undefined} onClose={()=>setSelected(null)}/>}
 </main>;
}
function JourneyDialog({visit,name,onClose}:{visit:VisitSummary;name?:string;onClose:()=>void}){
 const events=visit.events||[],problems=visit.problems||[];
 return <div className="oj-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <section className="oj-detail" role="dialog" aria-modal="true" aria-labelledby="oj-detail-title">
   <header><div><small>ПУТЬ ПОСЕТИТЕЛЯ</small><h2 id="oj-detail-title">{name|| (visit.userId?'Пользователь OTTO':'Гость')}</h2></div><button className="oj-button" onClick={onClose}>Закрыть</button></header>
   <div className="oj-summary">
    <p><b>Начало:</b> {fmt(visit.startedAt)}</p><p><b>Последнее событие:</b> {fmt(visit.lastEventAt)}</p>
    <p><b>Последний экран:</b> {frameLabel(visit.lastScreen)}</p>
    <p><b>Причина ухода:</b> {visit.ongoing?'сеанс ещё может продолжаться':'не устанавливается автоматически'}</p>
   </div>
   {problems.length>0&&<div className="oj-warning"><b>Зафиксированные затруднения</b>{problems.map((e,i)=><p key={i}>{eventLabel(e)}{e.recovered?' · позже успешный повтор':''}</p>)}</div>}
   <h3>Хронология</h3>
   <ol className="oj-timeline">{events.map((e,i)=><li key={e.id||i}><time>{fmt(e.at)}</time><span>{eventLabel(e)}</span>{e.frame&&e.kind!=='screen'&&<small>{frameLabel(e.frame)}</small>}</li>)}</ol>
   {!events.length&&<p>Подробных событий нет.</p>}
  </section>
 </div>;
}
export function ReadableAdmin(){
 const [tab,setTab]=useState<'users'|'journey'|'teachers'>('users');
 return <><nav className="oj-tabs"><button className={tab==='users'?'active':''} onClick={()=>setTab('users')}>Пользователи и результаты</button><button className={tab==='journey'?'active':''} onClick={()=>setTab('journey')}>Путь и проблемы</button><button className={tab==='teachers'?'active':''} onClick={()=>setTab('teachers')}>Преподаватели</button></nav>{tab==='users'?<ExistingAdmin/>:tab==='teachers'?<TeacherAdmin/>:<JourneyView/>}</>;
}
