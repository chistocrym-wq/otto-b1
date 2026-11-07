// This is operational course duration, not optional diagnostic/journey tracking.
// It saves no typed answers, sound recordings, contacts or navigation history.
type Module='otto'|'schreiben'|'lesen'|'horen'|'sprechen'|'review'|'practice';
type Segment={id:string;module:Module;start:number;end:number};
import {v20ClientEnabled} from './v20ClientFeatures';
const PREFIX='otto-preview20-study-outbox-v1:';
const isPreview=()=>v20ClientEnabled('studyTime');
const random=()=>crypto.randomUUID();
let active=false, owner='',module:Module='otto',last=0,lastAction=0,audio=false,queue:Segment[]=[],sending=false;
let timer:number|undefined;
const key=(user:string)=>PREFIX+encodeURIComponent(user);
function store(){if(!owner)return;try{localStorage.setItem(key(owner),JSON.stringify(queue.slice(-20000)));}catch{/* retry in memory */}}
function read(user:string):Segment[]{try{const rows=JSON.parse(localStorage.getItem(key(user))||'[]');return Array.isArray(rows)?rows.filter(r=>r&&typeof r.id==='string'&&typeof r.start==='number'&&typeof r.end==='number'):[];}catch{return [];}}
const visible=()=>document.visibilityState==='visible'&&document.hasFocus();
function credit(){
 const now=Date.now(),gap=last?now-last:0;
 if(active&&owner&&visible()&&(now-lastAction<90000||audio)&&gap>=500&&gap<=20000) {
  // Split intervals as immutable units so retries and simultaneous tabs are safe.
  queue.push({id:random(),module,start:last,end:now});store();
 }
 last=now;
}
async function flush(){
 if(!owner||sending||!queue.length||navigator.onLine===false)return;
 sending=true;const currentOwner=owner;const list=queue.slice(0,30);
 try{
  const sr=await fetch('/api/session',{credentials:'same-origin',cache:'no-store'});
  if(!sr.ok)return;
  const auth=await sr.json().catch(()=>null);
  if(auth?.authenticated!==true||auth.userId!==currentOwner)return;
  const response=await fetch('/api/preview20-study-time',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({intervals:list})});
  if(!response.ok)return;
  const ack=await response.json().catch(()=>null);
  if(ack?.ok!==true||!Array.isArray(ack.accepted))return;
  const confirmed=new Set(ack.accepted);
  queue=queue.filter(row=>!confirmed.has(row.id));store();
 }catch{/* offline: durable outbox */}
 finally{sending=false;}
}
const action=()=>{lastAction=Date.now();};
const playing=()=>{audio=true;action();};
function tick(){credit();}
function hidden(){credit();last=Date.now();void flush();}
function setup(){
 if(timer!==undefined)return;
 last=lastAction=Date.now();
 for(const event of ['pointerdown','keydown','touchstart','scroll'])window.addEventListener(event,action,{passive:true});
 document.addEventListener('play',playing,true);
 document.addEventListener('pause',()=>{audio=false;},true);
 document.addEventListener('ended',()=>{audio=false;},true);
 document.addEventListener('visibilitychange',hidden);
 window.addEventListener('blur',hidden);
 window.addEventListener('focus',()=>{last=lastAction=Date.now();void flush();});
 window.addEventListener('online',()=>void flush());
 window.addEventListener('pagehide',hidden);
 timer=window.setInterval(tick,10000); // Local activity sampling only; does not contact the server.
 window.setInterval(()=>{credit();void flush();},120000); // Server sync once every two minutes.
}
export function updateStudyTime(userId:string|undefined,section:Module|null){
 if(!isPreview())return;
 credit();
 if(!userId||!section){active=false;void flush();return;}
 if(owner!==userId){owner=userId;queue=read(userId);}
 setup();module=section;active=true;last=lastAction=Date.now();void flush();
}
export function studyTimeCleanup(){credit();active=false;void flush();}
