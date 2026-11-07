export interface OttoClientDiagnostic {
  module: string;
  teil?: number | null;
  taskIndex?: number | null;
  action: string;
  message?: string;
}

export interface OttoStateSyncDiagnostic {
  key: string;
  method: 'PUT' | 'DELETE';
  status: number | null;
  ok: boolean;
  at: string;
  error?: string;
}

const PREVIEW_HOST_RE=/^deploy-preview-\d+--otto-a1\.netlify\.app$/i;
const STATE_SYNC_EVENT='otto:preview-state-sync';

let latestSync:OttoStateSyncDiagnostic|null=null;

export function isOttoDeployPreview(){
  if(typeof window==='undefined')return false;
  return PREVIEW_HOST_RE.test(window.location.hostname);
}

export function isOttoDebugEnabled(){
  if(!isOttoDeployPreview())return false;
  try{return new URLSearchParams(window.location.search).get('ottoDebug')==='1'}catch{return false}
}

export function isStandaloneDisplay(){
  if(typeof window==='undefined')return false;
  const navigatorWithStandalone=navigator as Navigator&{standalone?:boolean};
  return window.matchMedia?.('(display-mode: standalone)').matches===true||navigatorWithStandalone.standalone===true;
}

export function getViewportLabel(){
  if(typeof window==='undefined')return'unknown';
  return `${Math.round(window.innerWidth)}x${Math.round(window.innerHeight)}@dpr${window.devicePixelRatio||1}`;
}

function clean(value:unknown,max=500){
  return String(value??'').replace(/[\r\n\t]+/g,' ').slice(0,max);
}

export async function emitOttoClientDiagnostic(input:OttoClientDiagnostic){
  if(!isOttoDeployPreview())return;
  const payload={
    module:clean(input.module,40),
    teil:Number.isFinite(Number(input.teil))?Number(input.teil):null,
    taskIndex:Number.isFinite(Number(input.taskIndex))?Number(input.taskIndex):null,
    action:clean(input.action,60),
    message:clean(input.message,500),
    userAgent:clean(typeof navigator!=='undefined'?navigator.userAgent:'',500),
    viewport:getViewportLabel(),
    standalone:isStandaloneDisplay(),
  };
  console.info('[OTTO DIAG]',payload);
  try{
    await fetch('/api/client-diagnostic',{
      method:'POST',
      credentials:'same-origin',
      headers:{'content-type':'application/json'},
      body:JSON.stringify(payload),
      keepalive:true,
    });
  }catch(error){
    console.warn('[OTTO DIAG] client-diagnostic send failed',error instanceof Error?error.message:String(error));
  }
}

export function recordOttoStateSyncDiagnostic(input:Omit<OttoStateSyncDiagnostic,'at'>){
  if(!isOttoDeployPreview())return;
  latestSync={...input,at:new Date().toISOString()};
  console.info('[OTTO DIAG] state-sync',latestSync);
  if(typeof window!=='undefined'){
    window.dispatchEvent(new CustomEvent<OttoStateSyncDiagnostic>(STATE_SYNC_EVENT,{detail:latestSync}));
  }
}

export function getLatestOttoStateSyncDiagnostic(){
  return latestSync;
}

export function subscribeOttoStateSyncDiagnostic(listener:(value:OttoStateSyncDiagnostic)=>void){
  if(typeof window==='undefined')return()=>{};
  const handler=(event:Event)=>{
    const custom=event as CustomEvent<OttoStateSyncDiagnostic>;
    if(custom.detail)listener(custom.detail);
  };
  window.addEventListener(STATE_SYNC_EVENT,handler);
  return()=>window.removeEventListener(STATE_SYNC_EVENT,handler);
}
