import type {Section} from './schema.js';

export const ORDER:Section[]=['horen','lesen','schreiben','sprechen'];
export const DURATIONS:Record<Section,number>={horen:20*60,lesen:25*60,schreiben:20*60,sprechen:15*60};
export type FinishedSections=Record<Section,boolean>;
export type Deadlines=Partial<Record<Section,number>>;
export type SequenceMeta={version:1;examId:string;completed:FinishedSections;deadlines:Deadlines;updatedAt:string};
export const CURSOR_PREFIX='otto-preview13-exam-sequence-v1:';
export const META_PREFIX='otto-preview13-exam-sections-v1:';
export const MODE_PREFIX='otto-preview13-exam-timer-user-v1:';
export const EXAM_LAST=31;

function user(userId:string){if(!userId||userId.length>512)throw Error('User context required');return encodeURIComponent(userId);}
function validExam(id:string){if(!/^otto-a12-(0[1-9]|[12][0-9]|30)$/.test(id))throw Error('Invalid exam');return id;}
function read(storage:Pick<Storage,'getItem'>,key:string):unknown{try{const s=storage.getItem(key);return s?JSON.parse(s):null;}catch{return null;}}
function write(storage:Pick<Storage,'setItem'>,key:string,value:unknown){try{storage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function emptyMeta(examId:string):SequenceMeta{validExam(examId);return{version:1,examId,completed:{horen:false,lesen:false,schreiben:false,sprechen:false},deadlines:{},updatedAt:new Date().toISOString()};}
export function loadMeta(storage:Pick<Storage,'getItem'>,userId:string,examId:string,now=Date.now()):SequenceMeta{
 const key=META_PREFIX+user(userId)+':'+validExam(examId),saved=read(storage,key);
 const meta=emptyMeta(examId);
 if(!saved||typeof saved!=='object')return meta;
 const value=saved as Record<string,unknown>;
 if(value.version!==1||value.examId!==examId)return meta;
 const completed=value.completed&&typeof value.completed==='object'?value.completed as Record<string,unknown>:{};
 const deadlines=value.deadlines&&typeof value.deadlines==='object'?value.deadlines as Record<string,unknown>:{};
 for(const section of ORDER){
  meta.completed[section]=completed[section]===true;
  const end=deadlines[section];
  if(typeof end==='number'&&Number.isFinite(end)&&end>0&&end<now+24*60*60*1000){
   if(end<=now)meta.completed[section]=true;
   else if(!meta.completed[section])meta.deadlines[section]=end;
  }
 }
 return meta;
}
export function saveMeta(storage:Pick<Storage,'setItem'>,userId:string,meta:SequenceMeta):boolean{
 validExam(meta.examId);
 return write(storage,META_PREFIX+user(userId)+':'+meta.examId,{...meta,updatedAt:new Date().toISOString()});
}
export function startPart(meta:SequenceMeta,section:Section,timed:boolean,now=Date.now()):SequenceMeta{
 if(!ORDER.includes(section)||meta.completed[section])return meta;
 if(!timed||meta.deadlines[section])return meta;
 return{...meta,deadlines:{...meta.deadlines,[section]:now+DURATIONS[section]*1000}};
}
export function finishPart(meta:SequenceMeta,section:Section):SequenceMeta{
 if(!ORDER.includes(section))return meta;
 const deadlines={...meta.deadlines};delete deadlines[section];
 return{...meta,completed:{...meta.completed,[section]:true},deadlines};
}
export function allSectionsFinished(meta:SequenceMeta){return ORDER.every(section=>meta.completed[section]);}
export function nextSection(meta:SequenceMeta):Section|null{return ORDER.find(section=>!meta.completed[section])??null;}
export function currentKey(userId:string){return CURSOR_PREFIX+user(userId);}
export function readCursor(storage:Pick<Storage,'getItem'>,userId:string):number{
 const val=read(storage,currentKey(userId));
 return typeof val==='number'&&Number.isInteger(val)&&val>=1&&val<=EXAM_LAST?val:1;
}
export function saveCursor(storage:Pick<Storage,'setItem'>,userId:string,displayNumber:number):boolean{
 if(!Number.isInteger(displayNumber)||displayNumber<1||displayNumber>EXAM_LAST)return false;
 return write(storage,currentKey(userId),displayNumber);
}
export function readMode(storage:Pick<Storage,'getItem'>,userId:string):boolean{
 const mode=read(storage,MODE_PREFIX+user(userId));
 if(typeof mode==='boolean')return mode;
 try{return storage.getItem('otto-preview13-exam-timer-enabled-v1')!=='off';}catch{return true;}
}
export function saveMode(storage:Pick<Storage,'setItem'>,userId:string,enabled:boolean):boolean{
 return write(storage,MODE_PREFIX+user(userId),Boolean(enabled));
}
export function readLegacyDone(storage:Pick<Storage,'getItem'>,userId:string):boolean{
 return read(storage,META_PREFIX+user(userId)+':legacy-01')===true;
}
export function markLegacyDone(storage:Pick<Storage,'setItem'>,userId:string):boolean{
 return write(storage,META_PREFIX+user(userId)+':legacy-01',true);
}
export function isLast(displayNumber:number){return displayNumber>=EXAM_LAST;}
export function nextExamDisplay(displayNumber:number){return isLast(displayNumber)?null:displayNumber+1;}
