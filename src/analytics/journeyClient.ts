import {useEffect,useRef} from 'react';
import {v20ClientEnabled} from '../lib/v20ClientFeatures';
import catalog from 'virtual:otto-journey-catalog';
import {PREVIEW_HOST,CONSENT_VERSION,DETAIL_WINDOW_MS,withinDetailWindow,LABELS,cleanFrame,cleanEvent,type JourneyEvent,type JourneyFrame} from '../../shared/preview20-journey.js';

const ENDPOINT='/api/preview20-journey';
const KEY='otto-preview20-journey-tab-v2';
const FIRST_KEY='otto-preview20-first-journey-v1';
const FLUSH_MS=120000;
const TICK_MS=10000;
const allowed=()=>typeof window!=='undefined'&&v20ClientEnabled('journey')&&!window.location.pathname.startsWith('/admin');
const routeIds=new Map(Object.entries(catalog).filter(([k])=>k.startsWith('route-')).map(([k,v])=>[v,Number(k.slice(6))]));
const scopes=new Map<string,{frame:JourneyFrame;priority:number;order:number}>();
const listeners=new Set<()=>void>();
const timeBuckets=new Map<string,{frame:JourneyFrame;ms:number}>();

let installed=false,active=false,loading=false,sending=false,paused=false,order=0;
let frame:JourneyFrame|null=null;
let visit:{id:string;token:string;scope:string;expiresAt:number;startedAt:number}|null=null;
let queue:JourneyEvent[]=[],sent=0,notice='Журнал выключен',lastTick=0,lastInteraction=0,retryAt=0;
let nativeFetch:typeof fetch;

const id=()=>crypto.randomUUID();
const notify=()=>listeners.forEach(fn=>fn());
const detailed=()=>Boolean(visit&&withinDetailWindow(visit.startedAt));

export function subscribeJourney(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};}
export function journeyStatus(){return {active,loading,notice,sent,pending:queue.length,id:visit?.id||null,detailed:detailed()};}
export function firstJourneyAlreadyTracked(){try{return localStorage.getItem(FIRST_KEY)==='1';}catch{return false;}}

function persist(){try{sessionStorage.setItem(KEY,JSON.stringify({visit,queue,sent,active}));}catch{}}
function reset(message:string){active=false;visit=null;queue=[];timeBuckets.clear();sent=0;notice=message;persist();notify();}

function emit(raw:Omit<JourneyEvent,'id'|'at'>){
 if(!active||!visit||!allowed())return false;
 const inDetail=detailed();

 if(!inDetail)return false; // Only the initial five minutes produce a detailed route.

 const event=cleanEvent({...raw,id:id(),at:new Date().toISOString(),...(raw.frame?{}:frame?{frame}:{})});
 if(!event)return false;

 if(!inDetail&&event.kind==='screen'){
  const cutoff=visit.startedAt+DETAIL_WINDOW_MS;
  queue=queue.filter(e=>!(e.kind==='screen'&&Date.parse(e.at)>=cutoff));
 }

 if(queue.length>=120){
  notice='Очередь аналитики переполнена; часть истории может отсутствовать';
  notify();
  return false;
 }

 queue.push(event);
 persist();
 notify();
 return true;
}

function addTime(frameValue:JourneyFrame,ms:number){
 if(!detailed()||ms<200)return;
 const key=JSON.stringify(frameValue);
 const row=timeBuckets.get(key)||{frame:frameValue,ms:0};
 row.ms=Math.min(300000,row.ms+ms);
 timeBuckets.set(key,row);
}

function flushTimeBuckets(){
 if(!timeBuckets.size)return;
 for(const row of timeBuckets.values()){
  if(row.ms>=200)emit({kind:'time',frame:row.frame,ms:row.ms});
 }
 timeBuckets.clear();
}

function recordTime(){
 const now=performance.now();
 const elapsed=Math.round(Math.min(TICK_MS,Math.max(0,now-lastTick)));
 lastTick=now;
 if(active&&frame&&!paused&&document.visibilityState==='visible'&&document.hasFocus()&&now-lastInteraction<90000){
  addTime(frame,elapsed);
 }
}

export function pauseJourney(value:boolean){recordTime();paused=value;lastTick=performance.now();}

function selectFrame(){
 const best=[...scopes.values()].sort((a,b)=>b.priority-a.priority||b.order-a.order)[0]?.frame||null;
 if(JSON.stringify(best)===JSON.stringify(frame))return;
 recordTime();
 frame=best;
 if(frame)emit({kind:'screen',frame});
}

const UI_FIELDS=new Set(['view','phase','stage','step','part','currentExercise','practiceIndex','authenticated','hasTrainingAccess']);
export function uiField(value:unknown,key:string):unknown{
 if(!UI_FIELDS.has(key)||!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const item=(value as Record<string,unknown>)[key];
 return ['string','number','boolean'].includes(typeof item)?item:undefined;
}

export function useJourneyScope(scope:string,raw:Record<string,unknown>,area:string,priority:number){
 const key=useRef('');
 if(!key.current)key.current=scope+'-'+(++order);
 const candidate:Record<string,unknown>={scope,area};

 for(const field of ['view','phase','stage','step','mode','part','index','blocker'])if(raw[field]!==undefined)candidate[field]=raw[field];
 if(area==='learning'&&(candidate.phase==='practice'||candidate.view==='practice'||scope==='PracticeHoeren'))candidate.area='practice';

 for(const field of ['view','phase','stage','step','mode']){
  const value=candidate[field];
  if(typeof value==='string'&&!Object.prototype.hasOwnProperty.call(LABELS,value)&&routeIds.has(value))candidate[field]=routeIds.get(value);
 }

 const clean=cleanFrame(candidate),sig=JSON.stringify(clean),enabled=raw.enabled!==false;
 useEffect(()=>{
  if(!allowed()||!clean||!enabled)return;
  const k=key.current;
  scopes.set(k,{frame:clean,priority,order:++order});
  queueMicrotask(selectFrame);
  return()=>{scopes.delete(k);queueMicrotask(selectFrame);};
 },[sig,priority,enabled]);
}

export function sectionId(scope:string,fallback:string,title:unknown){
 if(typeof title==='string'){
  const found=Object.keys(catalog).find(k=>k.startsWith(scope+'-')&&catalog[k]===title);
  if(found)return found;
 }
 return fallback;
}

function device(){
 const mobile=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
 const tg=Boolean((window as any).Telegram?.WebApp);
 if(tg)return mobile?'telegram_mobile':'telegram_desktop';
 const browser=/Chrome|Chromium|CriOS/i.test(navigator.userAgent)?'chrome':/Safari/i.test(navigator.userAgent)?'safari':'other';
 return (mobile?'mobile_':'desktop_')+browser;
}

function source(){
 const s=new URL(location.href).searchParams.get('utm_source')?.toLowerCase();
 if(s==='telegram_ads'||s==='tgads')return 'telegram_ads';
 if(s==='telegram'||s==='tg')return 'telegram';
 if(s==='vk'||s==='ok'||s==='partner')return s;
 return 'unknown';
}

export async function startJourney(){
 if(!allowed()||active||loading||firstJourneyAlreadyTracked())return;
 installJourney();
 loading=true;
 notice='Включаем аналитику…';
 notify();

 try{
  const r=await nativeFetch(ENDPOINT,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'start',consent:true,consentVersion:CONSENT_VERSION,device:device(),source:source()})});
  const d=await r.json();
  if(!r.ok||!d.ok)throw Error();

  const startedAt=Date.now();
  visit={id:d.id,token:d.token,scope:d.scope,expiresAt:d.expiresAt,startedAt};
  queue=[];
  timeBuckets.clear();
  sent=0;
  active=true;
  lastTick=performance.now();
  lastInteraction=lastTick;
  notice='Аналитика первого визита включена';
  try{localStorage.setItem(FIRST_KEY,'1');}catch{}

  emit({kind:'page_ready'});
  if(frame)emit({kind:'screen',frame});
  persist();
 }catch{
  notice='Не удалось включить аналитику. OTTO продолжает работать без неё.';
 }finally{
  loading=false;
  notify();
 }
}

export async function eraseJourney(){
 if(!visit||loading)return;
 active=false;
 queue=[];
 timeBuckets.clear();
 loading=true;
 persist();
 notify();

 try{
  const r=await nativeFetch(ENDPOINT,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','x-otto-journey-token':visit.token},body:JSON.stringify({action:'erase',id:visit.id})});
  if(!r.ok)throw Error();
  reset('Запись посещения удалена');
 }catch{
  loading=false;
  notice='Сбор остановлен, но удаление пока не подтверждено';
  notify();
 }
}

export function submitJourneyFeedback(choice:string,comment:string){
 if(!active||!detailed())return false;
 const ok=emit({kind:'feedback',choice,comment:comment.slice(0,500)});
 if(ok)void flushJourney();
 return ok;
}

export async function flushJourney(keepalive=false){
 if(!active||!visit||sending||navigator.onLine===false||Date.now()<retryAt)return;
 flushTimeBuckets();
 if(!queue.length)return;

 const current=visit,batch=queue.slice(0,30);
 sending=true;

 try{
  const r=await nativeFetch(ENDPOINT,{method:'POST',credentials:'same-origin',keepalive,headers:{'content-type':'application/json','x-otto-journey-token':current.token},body:JSON.stringify({action:'events',id:current.id,events:batch})});
  const d=await r.json().catch(()=>({}));

  if(current!==visit||!active)return;
  if(['visit_expired','visit_erased','visit_not_available','identity_changed'].includes(d.code)){
   reset('Эта аналитическая сессия закончилась');
   return;
  }
  if(!r.ok||!d.ok)throw Error();

  const accepted=new Set<string>(Array.isArray(d.acceptedIds)?d.acceptedIds:batch.map(e=>e.id));
  queue=queue.filter(e=>!accepted.has(e.id));
  sent+=accepted.size;
  retryAt=0;
  notice=detailed()?'Первые 5 минут записываются':'Подробная запись завершена; далее только время занятий';
  persist();
 }catch{
  retryAt=Date.now()+15000;
  notice='События ждут отправки';
 }finally{
  sending=false;
  notify();
 }
}

function safeCode(value:unknown){return typeof value==='string'?value:'unknown';}

export function observeFetch(operation:string,method:string,run:()=>Promise<Response>):Promise<Response>{
 if(!active||!allowed())return run();

 const opId=id(),opFrame=frame,current=visit;
 const send=(outcome:string,code?:string,status?:number)=>{
  if(active&&visit===current)emit({kind:'operation',operation,operationId:opId,...(opFrame?{frame:opFrame}:{}),outcome,code,status});
 };
 if(detailed())send('start');

 let p:Promise<Response>;
 try{p=run();}
 catch(e){
  send('network','network_error');
  void flushJourney();
  throw e;
 }

 void p.then(async r=>{
  if(!active||visit!==current)return;

  let d:any={};
  if(['otp_request','otp_verify','session','profile','access'].includes(operation))try{d=await r.clone().json();}catch{}

  if(operation==='session'&&method==='GET'&&(r.status===401||d.authenticated===false)){
   if(detailed())send('normal_unauthenticated',undefined,r.status);
   return;
  }

  const bad=!r.ok||d.ok===false||(operation==='otp_verify'&&d.verified!==true)||(operation==='session'&&method==='POST'&&d.authenticated!==true);
  if(bad){
   send('rejected',safeCode(d.code),r.status);
   void flushJourney();
  }else if(detailed()){
   send('ok',undefined,r.status);
  }
 },()=>{
  send('network','network_error');
  void flushJourney();
 }).catch(()=>{});

 return p;
}

export function observeAsync<T>(operation:string,run:()=>T):T{
 if(!active||!allowed())return run();

 const opId=id(),current=visit,opFrame=frame;
 const send=(outcome:string,code?:string)=>{
  if(active&&visit===current)emit({kind:'operation',operation,operationId:opId,...(opFrame?{frame:opFrame}:{}),outcome,code});
 };

 if(detailed())send('start');

 try{
  const result=run();
  void Promise.resolve(result).then(
   ()=>{if(detailed())send('ok');},
   e=>{send('rejected',e?.name||'unknown');void flushJourney();}
  );
  return result;
 }catch(e:any){
  send('rejected',e?.name||'unknown');
  void flushJourney();
  throw e;
 }
}

const actions:Record<string,string>={'Продолжить':'continue','Далее':'continue','Начать':'start','Начать выбранный Teil':'continue','Продолжить с сохранённого места':'continue','Разобрать пример':'continue','К реальным заданиям':'continue','К тренировке':'continue','Назад':'back','К разделам':'back','Проверить':'check','Проверить ответ':'check','Войти':'login','Создать новый аккаунт':'register','Получить код':'request_code','Отправить код':'request_code','Отправить новый код':'resend_code','Попробовать снова':'continue','Учиться с OTTO':'choose','Только тренажёр':'choose','Обучение с OTTO':'choose'};

function installButtons(){
 document.addEventListener('click',e=>{
  const el=e.target instanceof Element?e.target.closest('button'):null;
  if(!el||!el.closest('#root')||!active||paused)return;
  lastInteraction=performance.now();
  if(!detailed())return;
  const label=(el.textContent||'').replace(/\s+/g,' ').trim();
  const action=actions[label];
  if(action)emit({kind:'action',action});
 },true);

 document.addEventListener('input',e=>{
  lastInteraction=performance.now();
  if(active&&detailed()&&!paused&&frame?.area==='practice'&&e.target instanceof Element&&e.target.closest('#root'))emit({kind:'interaction'});
 },true);

 for(const type of ['keydown','pointerdown','scroll','touchstart'])window.addEventListener(type,()=>{if(!paused)lastInteraction=performance.now();},{capture:true,passive:true});
}

export function installJourney(){
 if(installed||!allowed())return;
 installed=true;
 nativeFetch=window.fetch.bind(window);
 lastTick=performance.now();
 lastInteraction=lastTick;

 try{
  const raw=JSON.parse(sessionStorage.getItem(KEY)||'null');
  if(raw?.active&&raw.visit?.expiresAt>Date.now()&&typeof raw.visit.token==='string'){
   const restoredStarted=Number(raw.visit.startedAt)||Number(String(raw.visit.id).slice(11,24))||Date.now();
   visit={...raw.visit,startedAt:restoredStarted};
   queue=Array.isArray(raw.queue)?raw.queue.map((e:unknown)=>cleanEvent(e)).filter(Boolean).slice(0,120):[];
   sent=Number(raw.sent)||0;
   active=true;
   notice=detailed()?'Аналитика первого визита восстановлена':'Подробная запись завершена; далее только время занятий';
  }
 }catch{}

 window.addEventListener('error',()=>{emit({kind:'operation',operation:'frontend',operationId:id(),outcome:'rejected',code:'js_error'});void flushJourney();},true);
 window.addEventListener('unhandledrejection',()=>{emit({kind:'operation',operation:'frontend',operationId:id(),outcome:'rejected',code:'js_error'});void flushJourney();});
 window.addEventListener('blur',recordTime);
 window.addEventListener('focus',()=>{lastTick=performance.now();lastInteraction=lastTick;});

 document.addEventListener('visibilitychange',()=>{
  recordTime();
  if(detailed())emit({kind:'visibility',outcome:document.visibilityState==='visible'?'visible':'hidden'});
  lastTick=performance.now();
  if(document.visibilityState==='hidden')void flushJourney(true);
 });

 window.addEventListener('pagehide',()=>{recordTime();void flushJourney(true);});
 window.addEventListener('online',()=>{retryAt=0;if(detailed())emit({kind:'connection',outcome:'online'});void flushJourney();});
 window.addEventListener('offline',()=>{if(detailed())emit({kind:'connection',outcome:'offline'});});

 window.setInterval(recordTime,TICK_MS);
 window.setInterval(()=>void flushJourney(),FLUSH_MS);
 installButtons();

 if(active&&queue.length)void flushJourney();
}
