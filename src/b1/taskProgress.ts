import { B1_PARTS, b1DraftKey, type B1Subject } from './content';

export type B1TaskState='new'|'progress'|'correct'|'incorrect'|'reviewed';
export interface B1TaskStatus {state:B1TaskState;score:number|null;total:number|null;completedAt:string|null;}
const USER='local-preview';
function historyKey(subject:B1Subject,teil:number,number:number){
 return 'otto:b1:task-result:'+USER+':'+subject+':'+teil+':'+number;
}
function safeParse(input:string|null):Record<string,unknown>{
 if(!input)return {};
 try {const data:unknown=JSON.parse(input);return data&&typeof data==='object'&&!Array.isArray(data)?data as Record<string,unknown>:{};}
 catch {return {};}
}
function readStorage(key:string){
 try{return safeParse(localStorage.getItem(key));}
 catch{return {};}
}
/** A separate immutable completion record survives a later "repeat" of the same task. */
export function markB1TaskComplete(subject:B1Subject,teil:number,number:number,score:number|null,total:number|null){
 const current=readStorage(historyKey(subject,teil,number));
 const record={
  completedAt:new Date().toISOString(),
  score:score!==null&&Number.isFinite(score)?score:null,
  total:total!==null&&Number.isFinite(total)?total:null,
  attempts:Math.max(0,Number(current.attempts)||0)+1,
 };
 try{localStorage.setItem(historyKey(subject,teil,number),JSON.stringify(record));}catch{/* storage may be disabled */}
}
export function readB1TaskStatus(subject:B1Subject,teil:number,number:number):B1TaskStatus{
 const history=readStorage(historyKey(subject,teil,number));
 const draft=readStorage(b1DraftKey(USER,subject,teil,number));
 const completed=typeof history.completedAt==='string'&&history.completedAt.length>0;
 if(completed){
  const total=typeof history.total==='number'&&history.total>0?history.total:null;
  const score=total!==null&&typeof history.score==='number'?Math.max(0,history.score):null;
  const state:B1TaskState=total!==null&&score!==null
   ?score===total?'correct':'incorrect'
   :'reviewed';
  return {state,score,total,completedAt:history.completedAt as string};
 }
 if(draft.done===true)return {state:'reviewed',score:null,total:null,completedAt:typeof draft.updatedAt==='string'?draft.updatedAt:null};
 const answers=draft.answers&&typeof draft.answers==='object'?Object.keys(draft.answers):[];
 const hasAnswers=answers.some(id=>Boolean((draft.answers as Record<string,unknown>)[id]));
 const hasText=typeof draft.essay==='string'&&draft.essay.trim().length>0;
 return {state:hasAnswers||hasText?'progress':'new',score:null,total:null,completedAt:null};
}
export function getB1SectionProgress(subject:B1Subject,teil:number){
 let completed=0,started=0;
 for(let n=1;n<=30;n++){
  const state=readB1TaskStatus(subject,teil,n).state;
  if(state==='correct'||state==='incorrect'||state==='reviewed')completed++;
  else if(state==='progress')started++;
 }
 return {completed,started,total:30};
}
export function getB1ModuleProgress(subject:B1Subject){
 let completed=0,started=0;
 for(let t=1;t<=B1_PARTS[subject];t++){
  const progress=getB1SectionProgress(subject,t);
  completed+=progress.completed;started+=progress.started;
 }
 return {completed,started,total:B1_PARTS[subject]*30};
}
export function getB1TotalProgress(){
 const perSubject={} as Record<B1Subject,number>;
 let total=0;
 for(const subject of ['horen','lesen','schreiben','sprechen'] as B1Subject[]){
  const done=getB1ModuleProgress(subject).completed;
  perSubject[subject]=done;total+=done;
 }
 return {perSubject,total};
}
export function getB1ContinueIndex(subject:B1Subject,teil:number){
 for(let n=1;n<=30;n++){
  const state=readB1TaskStatus(subject,teil,n).state;
  if(state==='new'||state==='progress')return n;
 }
 return 1;
}
