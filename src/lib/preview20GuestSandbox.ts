// Guest work stays strictly in memory (Preview20 or approved Production);
// the server independently authorizes the guest trial for the current deploy.
// Preview20 guest work stays strictly in memory; it never binds to a registered account.
// Existing account caches on the same browser are not deleted or exposed to guests.
// Loaded only after a verified server response marks the session as guest.
import {v20ClientEnabled} from './v20ClientFeatures';
const EXACT = new Set([
  'goethe-a1-progress','otto-a1-activity-v1','otto-a1-hoeren-progress-v2',
  'otto-a1-lesen-progress-v2','otto-lesen-teil1-progress-v2',
  'otto-lesen-teil2-progress-v1','otto-schreiben-path-stage',
  'otto-guided-module-intros-v1','otto-a1-learning-profile-v1',
  'otto-a1-mock-attempts-v1','otto-training-resume-v1',
  'otto-a1-reminder-v1','otto-module-task-completion-v1',
  'otto-reference-intro-seen-v1','otto-reference-smart-cards-v1',
]);
const PREFIXES = [
  'otto-a1-archive-exam-v2:','otto-preview-learning-v2:',
  'otto-preview-learning-location-v1:','otto-preview-app-mode-v2:',
  'form_training_progress:','otto-preview-hoeren-learning-v2:',
  'otto-preview-lesen-learning-v2:','otto-preview-sprechen-learning-v1:',
  'otto-preview-schreiben-exact-v3:','otto-preview-schreiben-practice-v1:',
  'otto-a1-hoeren','otto-lesen-','otto-schreiben-','otto-sprechen-',
  'otto-progress-cache-','otto-activity-cache-',
];
const isGuestTrainingKey=(key:string)=>EXACT.has(key)||PREFIXES.some(p=>key.startsWith(p));
// The browser stores no guest answers, audio, tokens, or AI results here.
// Only SHA-256 request fingerprints and random operation IDs survive a reload.
type RetryEntry={id:string;at:number};
const RETRY_PREFIX='otto-preview20-guest-ai-retries-v2:';
const RETRY_TTL_MS=72*60*60*1000;
const RETRY_CACHE_LIMIT=80;
const RETRY_ID=/^[A-Za-z0-9_-]{16,96}$/;
const RETRY_HASH=/^[a-f0-9]{64}$/;
let installed=false;
let guestModeActive=false;
let guestTrialStorageKey:string|null=null;
let pendingRetries=new Map<string,RetryEntry>();
// Never expose a previous guest's in-memory answers to a later guest or user.
const volatile=new Map<string,string>();

function pruneGuestRetries(){
  const time=Date.now();
  for(const [key,value] of pendingRetries){
    if(!RETRY_HASH.test(key)||!RETRY_ID.test(value.id)||
       !Number.isFinite(value.at)||value.at>time+60_000||
       time-value.at>=RETRY_TTL_MS)pendingRetries.delete(key);
  }
  while(pendingRetries.size>RETRY_CACHE_LIMIT){
    const oldest=pendingRetries.keys().next().value;
    if(!oldest)break;
    pendingRetries.delete(oldest);
  }
}
function saveGuestRetries(){
  if(!guestTrialStorageKey)return;
  try{window.sessionStorage.setItem(guestTrialStorageKey,JSON.stringify([...pendingRetries]));}
  catch{/* Blocked storage: this tab still uses the in-memory ledger. */}
}
function loadGuestRetries(){
  pendingRetries=new Map();
  if(!guestTrialStorageKey)return;
  try{
    const records=JSON.parse(window.sessionStorage.getItem(guestTrialStorageKey)||'null');
    if(Array.isArray(records)){
      for(const item of records.slice(-RETRY_CACHE_LIMIT)){
        if(Array.isArray(item)&&typeof item[0]==='string'&&item[1]&&
           typeof item[1].id==='string'&&typeof item[1].at==='number')
          pendingRetries.set(item[0],{id:item[1].id,at:item[1].at});
      }
    }
  }catch{/* Do not reuse corrupt retry records. */}
  pruneGuestRetries();saveGuestRetries();
}
export function deactivatePreview20GuestSandbox(){
  // A newly authenticated account must see its original localStorage values.
  guestModeActive=false;
  guestTrialStorageKey=null;
  pendingRetries.clear();
  volatile.clear();
}
export function installPreview20GuestSandbox(trialStartedAt?:string|null){
  // Both the client feature flag and the verified server guest response
  // are required. Never enable by a hostname check alone.
  if(!v20ClientEnabled('guest'))return;
  // A different confirmed guest trial must not inherit a prior guest's IDs.
  const scope=trialStartedAt&&Number.isFinite(Date.parse(trialStartedAt))
    ?RETRY_PREFIX+encodeURIComponent(trialStartedAt):null;
  if(scope!==guestTrialStorageKey){
    volatile.clear(); // A different trial cannot inherit guest-local answers.
    guestTrialStorageKey=scope;
    loadGuestRetries();
  }
  guestModeActive=true;
  if(installed)return;
  installed=true;
  const originalFetch=window.fetch.bind(window);
  const chargeable=new Set([
    '/api/check-schreiben','/api/check-sprechen','/api/schreiben-example',
    '/api/translate-task','/api/reading-feedback','/api/transcribe-ru',
  ]);
  async function requestFingerprint(path:string,body:string){
    const bytes=new TextEncoder().encode(path+'\0'+body);
    const digest=await window.crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join('');
  }
  window.fetch=((input:RequestInfo|URL,init?:RequestInit)=>{
    if(!guestModeActive)return originalFetch(input,init);
    const url=typeof input==='string'||input instanceof URL?String(input):input.url;
    let path:string;
    try{
      const dest=new URL(url,window.location.href);
      path=dest.origin===window.location.origin?dest.pathname:'';
    }catch{return originalFetch(input,init)}
    const method=(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase();
    if(method!=='POST'||!chargeable.has(path))return originalFetch(input,init);
    return (async()=>{
      const headers=new Headers(input instanceof Request?input.headers:undefined);
      if(init?.headers)new Headers(init.headers).forEach((value,key)=>headers.set(key,value));
      // Browser-only explicit user intent to spend a new credit for the same
      // exact answer; this flag is never forwarded to the server.
      const fresh=headers.get('X-Otto-AI-New-Attempt')==='1';
      headers.delete('X-Otto-AI-New-Attempt');
      const body=typeof init?.body==='string'?init.body:
        input instanceof Request?await input.clone().text().catch(()=>null):null;
      const key=body===null?null:await requestFingerprint(path,body);
      pruneGuestRetries();
      const previous=key&&!fresh?pendingRetries.get(key):undefined;
      const explicitId=headers.get('X-Otto-AI-Operation-ID');
      const operationId=explicitId||previous?.id||window.crypto.randomUUID();
      if(key){
        pendingRetries.delete(key);
        pendingRetries.set(key,{id:operationId,at:Date.now()});
        pruneGuestRetries();saveGuestRetries();
      }
      headers.set('X-Otto-AI-Operation-ID',operationId);
      // A network failure or a 409 retains the original operation ID for the
      // next fetch() or a reload. A new operation needs explicit user intent.
      const response=await originalFetch(input,{...init,headers});
      if(response.ok&&key&&pendingRetries.get(key)?.id===operationId){
        pendingRetries.delete(key);saveGuestRetries();
      }
      return response;
    })();
  }) as typeof window.fetch;
  const get=Storage.prototype.getItem;
  const set=Storage.prototype.setItem;
  const remove=Storage.prototype.removeItem;
  Storage.prototype.getItem=function(key:string){
    if(guestModeActive&&this===window.localStorage&&isGuestTrainingKey(String(key)))return volatile.get(String(key))??null;
    return get.call(this,key);
  };
  Storage.prototype.setItem=function(key:string,value:string){
    if(guestModeActive&&this===window.localStorage&&isGuestTrainingKey(String(key))){
      volatile.set(String(key),String(value));
      return;
    }
    return set.call(this,key,value);
  };
  Storage.prototype.removeItem=function(key:string){
    if(guestModeActive&&this===window.localStorage&&isGuestTrainingKey(String(key))){
      volatile.delete(String(key));
      return;
    }
    return remove.call(this,key);
  };
  const clear=Storage.prototype.clear;
  Storage.prototype.clear=function(){
    // Guest clearing must not delete a registered learner's saved browser work.
    if(guestModeActive&&this===window.localStorage){volatile.clear();return;}
    return clear.call(this);
  };
}
