import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {AdminApp} from './AdminApp';
import {TeacherAdmin} from './TeacherAdmin';
import {AdminTelegramComposer,type TelegramRecipient} from './AdminTelegramComposer';
import {summarizeEvidence,formatSeconds,type Evidence,type StateRow} from './progressEvidence';
import './readableAdmin.css';

type User={user_id:string;user_name:string;email:string|null;telegram_id:string|null;registered_at:string;training_seconds:number;last_session_at:string|null;total_count:number};
const MODULES:Record<string,string>={lesen:'Lesen · Чтение',horen:'Hören · Аудирование',schreiben:'Schreiben · Письмо',sprechen:'Sprechen · Устная часть'};
function time(value:string|null|undefined){if(!value||!Number.isFinite(Date.parse(value)))return 'Не зафиксировано';return new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(value))+' МСК';}
async function get<T>(path:string,signal?:AbortSignal):Promise<T>{const response=await fetch(path,{credentials:'same-origin',cache:'no-store',signal});const payload=await response.json().catch(()=>({}));if(!response.ok){const error=new Error(typeof payload.code==='string'?payload.code:'request_failed') as Error&{status:number};error.status=response.status;throw error;}return payload as T;}
function Fact({label,children}:{label:string;children:ReactNode}){return <div className="ra-fact"><span>{label}</span><strong>{children}</strong></div>;}
function routeLabel(e:Evidence){if(!e.resumeModule)return 'Не сохранено';const part=e.resumeDetail?.match(/teil([1-3])/);return `${MODULES[e.resumeModule]}${part?' · Teil '+part[1]:''}`;}
function WriteButton({user,onWrite}:{user:User;onWrite:(user:User)=>void}){
 return <div style={{marginTop:10}}><button type="button" className="ra-button" disabled={!user.telegram_id} title={user.telegram_id?'Личное сообщение через бота OTTO':'Telegram не привязан'} onClick={()=>onWrite(user)}>Написать</button>{!user.telegram_id&&<small style={{display:'block',fontWeight:400,marginTop:4}}>Telegram не привязан</small>}</div>;
}
function Card({user,onClose,onExpired,onWrite}:{user:User;onClose:()=>void;onExpired:()=>void;onWrite:(user:User)=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [studySeconds,setStudySeconds]=useState<number|null>(null);
 const [data,setData]=useState<Evidence|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true),[revision,setRevision]=useState(0),[loadedAt,setLoadedAt]=useState<string|null>(null);
 useEffect(()=>{const node=dialog.current;node?.showModal();return()=>node?.close();},[]);
 useEffect(()=>{let canceled=false;setStudySeconds(null);void fetch('/api/admin-study-time?userId='+encodeURIComponent(user.user_id),{credentials:'same-origin'}).then(async r=>r.ok?r.json():null).then(d=>{if(!canceled&&d?.ok===true)setStudySeconds(Number(d.seconds)||0);}).catch(()=>{});return()=>{canceled=true;};},[user.user_id]);
 useEffect(()=>{const controller=new AbortController();setBusy(true);setError('');setData(null);
  void get<{authenticated:boolean;userId:string;state:StateRow[]}>(`/api/admin-state-diagnostic?userId=${encodeURIComponent(user.user_id)}`,controller.signal).then(payload=>{
    if(controller.signal.aborted)return;
    if(payload.authenticated!==true||payload.userId!==user.user_id||!Array.isArray(payload.state))throw Error('invalid_response');
    setData(summarizeEvidence(payload.state));setLoadedAt(new Date().toISOString());
  }).catch((e:Error&{status?:number})=>{if(controller.signal.aborted)return;if(e.status===401){onExpired();return;}setError('Не удалось загрузить сохранённый прогресс. Это ошибка получения данных, а не отсутствие занятий. Повторите запрос.');}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});
  return()=>controller.abort();
 },[user.user_id,revision,onExpired]);
 return <dialog ref={dialog} className="ra-dialog" aria-labelledby="ra-card-title" onCancel={onClose}>
  <header className="ra-card-header"><div><small>OTTO · ИСТОРИЯ И РЕЗУЛЬТАТЫ</small><h2 id="ra-card-title">{user.user_name||'Без имени'}</h2><WriteButton user={user} onWrite={onWrite}/></div><button className="ra-button" autoFocus onClick={onClose}>Закрыть</button></header>
  <div className="ra-card-body"><div className="ra-toolbar"><span>Получено: {loadedAt?time(loadedAt):'—'}</span><button className="ra-button" disabled={busy} onClick={()=>setRevision(v=>v+1)}>Обновить карточку</button></div>
   {busy&&<p role="status">Загружаем сохранённые результаты…</p>}
   {error&&<p className="ra-warning" role="alert">{error}</p>}
   {data&&<>
    <div className={data.hasEvidence?'ra-positive':'ra-note'}><strong>{data.hasEvidence?'Есть сохранённые учебные результаты':'В доступных записях нет отметок заданий'}</strong><p>{data.hasEvidence?'Этот аккаунт нельзя считать не занимавшимся только из-за нулевого счётчика минут.':'Это не исключает просмотра объяснений, открытия заданий или несохранённых попыток. Причина неизвестна.'}</p></div>
    <div className="ra-facts">
     <Fact label="Регистрация">{time(user.registered_at)}</Fact>
     <Fact label="Последняя записанная попытка">{time(data.lastAttemptAt)}</Fact>
     <Fact label="Сохранённое место продолжения">{routeLabel(data)}</Fact>
     <Fact label="Длительность в прежнем счётчике">{formatSeconds(user.training_seconds)}</Fact><Fact label="Активное обучение Preview 20">{studySeconds === null ? 'Нет подтверждённого замера' : formatSeconds(studySeconds)}</Fact>
    </div>
    <p className="ra-muted">Счётчик времени учитывает сохранённую длительность результатов, а не всё пребывание в приложении. Если он равен нулю, факт занятий проверяйте по попыткам ниже.</p>
    <section className="ra-section"><h3>Прогресс по четырём разделам</h3><p className="ra-muted">Отметка — уникальная карточка задания, не обязательно правильный ответ. Последние ответы суммируются только по карточкам, у которых сохранились подробности. Одна карточка может содержать несколько вопросов.</p>
     <div className="ra-module-grid">{data.modules.map(m=><article className="ra-module" key={m.module}><h4>{MODULES[m.module]}</h4><div className="ra-module-count">{m.marked}<span>отметок заданий</span></div><dl><dt>С подробными результатами</dt><dd>{m.detailed}</dd><dt>Записанных попыток</dt><dd>{m.attempts}</dd><dt>Последние ответы в этих карточках</dt><dd>{m.detailed?`${m.correct} из ${m.total}`:'Нет данных'}</dd><dt>Карточек с улучшением</dt><dd>{m.improved}</dd><dt>Без подробного результата</dt><dd>{Math.max(0,m.marked-m.detailed)}</dd></dl></article>)}</div>
     {data.conflicts.length>0&&<div className="ra-warning"><strong>Есть расхождение между сохранёнными сводками</strong>{data.conflicts.map((text,i)=><p key={i}>{text}</p>)}</div>}
     {data.warnings.map((text,i)=><p key={i} className="ra-warning">{text}</p>)}
    </section>
    <section className="ra-section"><h3>История сохранённых попыток</h3><p className="ra-muted">Всего записей: {data.attemptCount}. Показаны последние {data.attempts.length}. Это не история всех переходов. Время попытки записано приложением на устройстве пользователя.</p>
     {data.attempts.length?<ol className="ra-timeline">{data.attempts.map((a,i)=><li key={`${a.module}-${a.taskId}-${a.at}-${i}`}><time>{time(a.at)}</time><strong>{MODULES[a.module]} · {a.score} из {a.total}</strong><span>Карточка {a.taskId} · {a.score===a.total?'Все ответы правильные':a.score===0?'Нужна повторная попытка':'Часть ответов правильная'}</span></li>)}</ol>:<p>Подробные попытки не сохранены. Отметки заданий выше остаются отдельным свидетельством активности.</p>}
    </section>
    <section className="ra-section"><h3>Что известно о последнем посещении</h3><dl className="ra-pairs"><dt>Последняя сессия аккаунта</dt><dd>{time(user.last_session_at)}</dd><dt>Обновление снимка прогресса</dt><dd>{time(data.updatedAt)}</dd><dt>Место продолжения</dt><dd>{routeLabel(data)}</dd><dt>Последний просмотренный экран</dt><dd>Не записывался в этих данных</dd><dt>Время чтения объяснений</dt><dd>Не записывалось отдельно</dd><dt>Причина прекращения занятия</dt><dd>Не установлена</dd><dt>Ответ пользователя об опыте</dt><dd>Нет данных в этих записях</dd></dl><p className="ra-muted">Обновление записи не является временем выхода. Место продолжения не доказывает, что человек ушёл именно с этого экрана. Отсутствующий старый ключ не означает потерю данных из другого ключа.</p></section>
    <div className="ra-note"><strong>Понятные факты — без выдуманных причин</strong><p>Эта версия переводит уже сохранённый прогресс в карточку. Сбор новых посещений, раздельного активного времени, технических ошибок и обратной связи ещё не включён. Прошлые события нельзя восстановить задним числом.</p></div>
   </>}
  </div>
 </dialog>;
}
export function ReadableAdmin(){
 const [authenticated,setAuthenticated]=useState(false),[checking,setChecking]=useState(true),[classic,setClassic]=useState(false),[users,setUsers]=useState<User[]>([]),[offset,setOffset]=useState(0),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[selected,setSelected]=useState<User|null>(null),[query,setQuery]=useState(''),[revision,setRevision]=useState(0),[stats,setStats]=useState<Record<string,number>>({});
 const [recipient,setRecipient]=useState<TelegramRecipient|null>(null);
 const [showTeachers,setShowTeachers]=useState(false);
 const write=useCallback((user:User)=>{if(user.telegram_id)setRecipient(user);},[]);
 const expired=useCallback(()=>{setAuthenticated(false);setSelected(null);setRecipient(null);setUsers([]);setStats({});setClassic(false);setShowTeachers(false);},[]);
 useEffect(()=>{let cancelled=false;const check=async()=>{try{const r=await get<{authenticated:boolean}>('/api/admin-auth');if(!cancelled){if(r.authenticated)setAuthenticated(true);else expired();}}catch(e){if(!cancelled&&(e as Error&{status?:number}).status===401)expired();}finally{if(!cancelled)setChecking(false);}};void check();const t=window.setInterval(()=>void check(),authenticated?30000:2500);return()=>{cancelled=true;window.clearInterval(t);};},[authenticated,expired]);
 useEffect(()=>{if(!authenticated||classic)return;const controller=new AbortController();setBusy(true);setNotice('');void Promise.all([
  get<{users:User[]}>(`/api/admin-support?view=users&limit=50&offset=${offset}`,controller.signal),get<{stats:Record<string,number>}>('/api/admin-support?view=stats',controller.signal),
 ]).then(([u,s])=>{if(controller.signal.aborted)return;if(!Array.isArray(u.users))throw Error('invalid_users');setUsers(u.users.map(row=>({...row,training_seconds:Number(row.training_seconds),total_count:Number(row.total_count)})));setStats(s.stats||{});}).catch(e=>{if(controller.signal.aborted)return;if(e.status===401)expired();else setNotice('Не удалось обновить список. Показанные ранее значения могут быть устаревшими.');}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});return()=>controller.abort();},[authenticated,classic,offset,revision,expired]);
 if(checking)return <main className="ra-app"><p role="status">Проверяем доступ администратора…</p></main>;
 // Preserve the original login form, authentication and support/messaging implementation.
 if(!authenticated||classic)return <><div className="ra-classic-bar"><strong>Preview 20 · Понятные результаты</strong>{authenticated&&<button className="ra-button" onClick={()=>setClassic(false)}>Вернуться к аналитике</button>}</div><AdminApp/></>;
 if(showTeachers)return <div className="ra-app"><div className="ra-toolbar"><button type="button" className="ra-button" onClick={()=>setShowTeachers(false)}>Назад к пользователям</button></div><TeacherAdmin/></div>;
 const total=users[0]?.total_count??stats.total_users??0;
 const filtered=users.filter(u=>`${u.user_name||''} ${u.email||''} ${u.telegram_id||''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
 return <main className="ra-app"><header className="ra-header"><div><small>OTTO · PREVIEW 20</small><h1>Пользователи: история и результаты</h1><p>Понятная карточка вместо технических строк.</p></div><div className="ra-toolbar"><button type="button" className="ra-button ra-primary" onClick={()=>setShowTeachers(true)}>Преподаватели</button><button className="ra-button" onClick={()=>setClassic(true)}>Обращения, сообщения и выход</button></div></header>
  <div className="ra-facts"><Fact label="Всего пользователей">{stats.total_users??'—'}</Fact><Fact label="Регистраций сегодня">{stats.registered_today??'—'}</Fact><Fact label="Открытых обращений">{stats.open_tickets??'—'}</Fact></div>
  <div className="ra-note"><strong>Нулевые минуты не равны отсутствию занятий.</strong><p>Откройте «История и результаты» у нужного пользователя: там видны отметки заданий, попытки и улучшения. Новая история экранов пока не собирается.</p></div>
  <section className="ra-section"><div className="ra-toolbar"><div><h2>Пользователи OTTO</h2><label className="ra-search">Поиск в текущих 50 записях<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Имя, email или Telegram ID"/></label></div><button className="ra-button" disabled={busy} onClick={()=>setRevision(v=>v+1)}>{busy?'Загружаем…':'Обновить список'}</button></div>
   {notice&&<p role="alert" className="ra-warning">{notice}</p>}
   <div className="ra-table"><table><thead><tr><th>Пользователь</th><th>Регистрация</th><th>Прежний счётчик</th><th>Последняя сессия</th><th>Подробности</th></tr></thead><tbody>{filtered.map(u=><tr key={u.user_id}><th>{u.user_name||'Без имени'}<small>{u.email|| (u.telegram_id?'Telegram привязан':'Контакт не указан')}</small><WriteButton user={u} onWrite={write}/></th><td>{time(u.registered_at)}</td><td>{formatSeconds(u.training_seconds)}</td><td>{time(u.last_session_at)}</td><td><button className="ra-button ra-primary" onClick={()=>setSelected(u)}>История и результаты</button></td></tr>)}</tbody></table></div>
   {!busy&&!filtered.length&&!notice&&<p>В этом списке совпадений нет.</p>}
   <div className="ra-toolbar"><button className="ra-button" disabled={!offset||busy} onClick={()=>{setUsers([]);setOffset(v=>Math.max(0,v-50));setQuery('');}}>Назад</button><span>Страница {Math.floor(offset/50)+1} из {Math.max(1,Math.ceil(total/50))}</span><button className="ra-button" disabled={offset+50>=total||busy} onClick={()=>{setUsers([]);setOffset(v=>v+50);setQuery('');}}>Далее</button></div>
  </section>
  {selected&&<Card key={selected.user_id} user={selected} onClose={()=>setSelected(null)} onExpired={expired} onWrite={write}/>}
  {recipient&&<AdminTelegramComposer key={recipient.user_id} recipient={recipient} onClose={()=>setRecipient(null)} onExpired={expired}/>}
 </main>;
}