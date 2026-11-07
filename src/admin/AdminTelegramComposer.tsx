import {useEffect,useRef,useState,type FormEvent} from 'react';

export interface TelegramRecipient {
  user_id:string;
  user_name:string;
  telegram_id:string|null;
}
type Status={ok?:boolean;code?:string;lastSentAt?:string|null;lastStatus?:string|null;lastError?:string|null};
const ENDPOINT='/api/admin-telegram-message';
const MAX_CHARS=2000;
function validTime(value:unknown):string|null {
  return typeof value==='string'&&Number.isFinite(Date.parse(value))?value:null;
}
function formatTime(value:string):string {
  return new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value))+' МСК';
}
function errorText(data:Status):string {
  switch(data.code||data.lastError){
    case 'telegram_not_linked':return 'У пользователя нет подтверждённого Telegram ID. Обновите список пользователей.';
    case 'send_cooldown':return 'Повторная отправка доступна не раньше чем через минуту после предыдущей.';
    case 'invalid_origin':return 'Запрос отклонён проверкой безопасности. Откройте админку по её обычному адресу.';
    case 'invalid_message':return 'Введите сообщение длиной от 1 до 2000 символов.';
    case 'telegram_not_configured':return 'Отправка через бота не настроена в этой среде.';
    case 'bot_blocked_or_not_started':
    case 'telegram_chat_unavailable':return 'Telegram не принял сообщение: пользователь мог не запустить бота или заблокировать его.';
    default:return 'Не удалось подтвердить отправку. Обновите статус перед повторной попыткой.';
  }
}

// Reuses the existing protected endpoint. No automatic sends or retries;
// the server resolves the verified Telegram recipient from user_id.
export function AdminTelegramComposer({recipient,onClose,onExpired}:{recipient:TelegramRecipient;onClose:()=>void;onExpired:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  const alive=useRef(false),inFlight=useRef(false);
  const [message,setMessage]=useState(''),[error,setError]=useState(''),[success,setSuccess]=useState('');
  const [loading,setLoading]=useState(true),[ready,setReady]=useState(false),[sending,setSending]=useState(false);
  const [lastSentAt,setLastSentAt]=useState<string|null>(null),[retryAt,setRetryAt]=useState(0),[now,setNow]=useState(Date.now()),[revision,setRevision]=useState(0);
  useEffect(()=>{
    alive.current=true;const node=dialog.current;if(node&&!node.open)node.showModal();
    const timer=window.setInterval(()=>setNow(Date.now()),1000);
    return()=>{alive.current=false;window.clearInterval(timer);node?.close();};
  },[]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setReady(false);setError('');
    if(!recipient.telegram_id){setError('Telegram не привязан. Отправка недоступна.');setLoading(false);return()=>controller.abort();}
    void (async()=>{
      try{
        const response=await fetch(`${ENDPOINT}?userId=${encodeURIComponent(recipient.user_id)}`,{credentials:'same-origin',cache:'no-store',signal:controller.signal});
        const raw:unknown=await response.json().catch(()=>null);
        if(controller.signal.aborted)return;
        if(response.status===401){onExpired();return;}
        const data:Status=raw&&typeof raw==='object'?raw as Status:{};
        if(!response.ok||data.ok!==true){setError(response.ok?'Не удалось прочитать статус. Попробуйте обновить его.':errorText(data));return;}
        const at=validTime(data.lastSentAt);setLastSentAt(at);setRetryAt(at?Date.parse(at)+60000:0);setNow(Date.now());setReady(true);
        if(data.lastStatus==='failed')setError('Предыдущая попытка: '+errorText(data));
      }catch{
        if(!controller.signal.aborted)setError('Не удалось получить статус отправки. Обновите статус, прежде чем отправлять сообщение.');
      }finally{if(!controller.signal.aborted)setLoading(false);}
    })();
    return()=>controller.abort();
  },[recipient.user_id,recipient.telegram_id,revision,onExpired]);
  const remaining=Math.max(0,Math.ceil((retryAt-now)/1000));
  const text=message.trim();
  const canSend=Boolean(recipient.telegram_id)&&ready&&!loading&&!sending&&!remaining&&text.length>0&&message.length<=MAX_CHARS;
  const send=async(event:FormEvent)=>{
    event.preventDefault();if(!canSend||inFlight.current)return;
    inFlight.current=true;setSending(true);setError('');setSuccess('');
    try{
      const response=await fetch(ENDPOINT,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({userId:recipient.user_id,message:text})});
      const raw:unknown=await response.json().catch(()=>null);
      if(!alive.current)return;
      if(response.status===401){onExpired();return;}
      const data:Status=raw&&typeof raw==='object'?raw as Status:{};
      const at=validTime(data.lastSentAt);
      if(!response.ok||data.ok!==true){
        setError(errorText(data));
        if(data.code==='send_cooldown'){setLastSentAt(at);setRetryAt(at?Date.parse(at)+60000:Date.now()+60000);setNow(Date.now());}
        else setReady(false);
        return;
      }
      setLastSentAt(at);setRetryAt((at?Date.parse(at):Date.now())+60000);setNow(Date.now());
      setMessage('');setSuccess('Telegram принял сообщение. Прочтение пользователем не подтверждается.');
    }catch{
      if(alive.current){setReady(false);setError('Не удалось подтвердить отправку. Обновите статус перед повторной попыткой.');}
    }finally{inFlight.current=false;if(alive.current)setSending(false);}
  };
  return <dialog ref={dialog} className="ra-dialog" style={{maxWidth:560}} aria-labelledby="ra-telegram-title" onCancel={event=>{event.preventDefault();if(!inFlight.current)onClose();}}>
    <header className="ra-card-header"><div><small>OTTO · ЛИЧНОЕ СООБЩЕНИЕ</small><h2 id="ra-telegram-title">Написать пользователю</h2></div><button type="button" className="ra-button" onClick={onClose} disabled={sending}>Закрыть</button></header>
    <form onSubmit={event=>void send(event)} className="ra-card-body">
      <p className="ra-note"><strong>Получатель: {recipient.user_name||'Без имени'}</strong><br/>Telegram ID: {recipient.telegram_id||'Не привязан'}</p>
      <p className="ra-muted">Сообщение уйдёт настоящему пользователю через бота OTTO только после нажатия «Отправить». Автоматической рассылки нет.</p>
      <p role="status" aria-live="polite">{loading?'Проверяем статус…':lastSentAt?`Последнее принятое сообщение: ${formatTime(lastSentAt)}`:'Принятых сообщений пока не зафиксировано.'}</p>
      <label htmlFor="ra-telegram-message" style={{display:'block',fontWeight:700,marginTop:16}}>Сообщение</label>
      <textarea id="ra-telegram-message" autoFocus rows={6} maxLength={MAX_CHARS} value={message} onChange={event=>{setMessage(event.target.value);setSuccess('');}} disabled={sending} placeholder="Напишите сообщение пользователю" style={{display:'block',width:'100%',padding:12,marginTop:6,border:'1px solid #bfcfd4',borderRadius:10,resize:'vertical',font:'inherit',background:'#fff'}}/>
      <p className="ra-muted">{message.length} / {MAX_CHARS} символов</p>
      {error&&<p role="alert" className="ra-warning">{error}</p>}
      {success&&<p role="status" className="ra-positive">{success}</p>}
      {remaining>0&&<p className="ra-muted">Повторная отправка через {remaining} с.</p>}
      <div className="ra-toolbar"><button type="button" className="ra-button" disabled={sending||loading} onClick={()=>setRevision(value=>value+1)}>Обновить статус</button><button type="submit" className="ra-button ra-primary" disabled={!canSend}>{sending?'Отправляем…':'Отправить'}</button></div>
    </form>
  </dialog>;
}
