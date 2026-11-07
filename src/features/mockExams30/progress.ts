import type { Section } from './schema.js';
export type ObjectiveAnswer=boolean|number;
export interface Exam01Draft {
  version: 1;
  examId: string;
  section: Section;
  index: number;
  indices: Record<Section,number>;
  objective: {horen: Record<string,ObjectiveAnswer>;lesen:Record<string,ObjectiveAnswer>};
  form: Record<string,string>;
  letter: string;
  speakingNotes: Record<string,string>;
  updatedAt: string;
}
export const PRIVATE_PROGRESS_PREFIX='otto30-exam01-draft-v1:';
const sections:Section[]=['horen','lesen','schreiben','sprechen'];
const maxIndex:Record<Section,number>={horen:14,lesen:14,schreiben:1,sprechen:4};
export function progressKey(userId:string,examId='otto-a12-01'):string {
  if(typeof userId!=='string'||userId.length<1||userId.length>512)throw Error('user context required');
  assertExamId(examId);
  const prefix=examId==='otto-a12-01'?PRIVATE_PROGRESS_PREFIX:'otto30-private-exams-draft-v1:';
  return prefix+encodeURIComponent(userId)+':'+examId;
}
function assertExamId(examId:string):void {
  if(!/^otto-a12-(0[1-9]|[12][0-9]|30)$/.test(examId))throw Error('Unexpected exam ID');
}

export function emptyDraft(examId='otto-a12-01'):Exam01Draft {
  assertExamId(examId);
  return {version:1,examId,section:'horen',index:0,indices:{horen:0,lesen:0,schreiben:0,sprechen:0},objective:{horen:{},lesen:{}},form:{},letter:'',speakingNotes:{},updatedAt:new Date().toISOString()};
}
const obj=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
const cleanText=(v:unknown,max=24000):string=>typeof v==='string'?v.slice(0,max):'';
const integerBetween=(v:unknown,maximum:number):v is number=>Number.isInteger(v)&&typeof v==='number'&&v>=0&&v<=maximum;
/** Treat local storage as untrusted data, including drafts from older/broken builds. */
export function sanitizeDraft(value:unknown,examId='otto-a12-01'):Exam01Draft {
  const clean=emptyDraft(examId);
  if(!obj(value)||value.version!==1||value.examId!==examId)return clean;
  const indices=obj(value.indices)?value.indices:{};
  for(const section of sections){
    if(integerBetween(indices[section],maxIndex[section]))clean.indices[section]=indices[section] as number;
  }
  if(sections.includes(value.section as Section))clean.section=value.section as Section;
  clean.index=integerBetween(value.index,maxIndex[clean.section])?value.index:clean.indices[clean.section];
  clean.indices[clean.section]=clean.index;
  if(obj(value.objective)){
    for(const section of ['horen','lesen'] as const){
      const answers=value.objective[section];if(!obj(answers))continue;
      for(const [id,answer] of Object.entries(answers)){
        if(!new RegExp('^'+clean.examId+':'+(section==='horen'?'hoeren':section)+':(0[1-9]|1[0-5])$').test(id))continue;
        if(typeof answer==='boolean'||integerBetween(answer,9))clean.objective[section][id]=answer;
      }
    }
  }
  if(obj(value.form))for(const [k,v] of Object.entries(value.form))if(/^[0-6]$/.test(k)&&typeof v==='string')clean.form[k]=v.slice(0,1500);
  clean.letter=cleanText(value.letter);
  if(obj(value.speakingNotes))for(const [k,v] of Object.entries(value.speakingNotes))if(/^teil1-intro$|^teil2-[12]$|^teil3-[12]$/.test(k)&&typeof v==='string')clean.speakingNotes[k]=v.slice(0,6000);
  if(typeof value.updatedAt==='string'&&!Number.isNaN(Date.parse(value.updatedAt)))clean.updatedAt=value.updatedAt;
  return clean;
}
export function readDraft(storage:Pick<Storage,'getItem'>,userId:string,examId='otto-a12-01'):Exam01Draft {
  try{const raw=storage.getItem(progressKey(userId,examId));return raw?sanitizeDraft(JSON.parse(raw),examId):emptyDraft(examId);}
  catch{return emptyDraft(examId);}
}
export function saveDraft(storage:Pick<Storage,'setItem'>,userId:string,draft:Exam01Draft):void {
  assertExamId(draft.examId);
  if(draft.version!==1)throw Error('foreign draft version');
  storage.setItem(progressKey(userId,draft.examId),JSON.stringify({...sanitizeDraft(draft,draft.examId),updatedAt:new Date().toISOString()}));
}
export function withAnswer(draft:Exam01Draft,section:'horen'|'lesen',id:string,answer:ObjectiveAnswer):Exam01Draft {
  if(!new RegExp('^'+draft.examId+':'+(section==='horen'?'hoeren':section)+':(0[1-9]|1[0-5])$').test(id))throw Error('foreign question id');
  if(typeof answer!=='boolean'&&(!Number.isInteger(answer)||answer<0||answer>9))throw Error('invalid objective answer');
  return {...draft,objective:{...draft.objective,[section]:{...draft.objective[section],[id]:answer}}};
}
export function withNavigation(draft:Exam01Draft,section:Section,index=0):Exam01Draft {
  if(!sections.includes(section)||!Number.isInteger(index)||index<0||index>maxIndex[section])throw Error('invalid navigation');
  return {...draft,section,index,indices:{...draft.indices,[section]:index}};
}
export function countCompleted(draft:Exam01Draft){
  return {
    horen:Object.keys(draft.objective.horen).length,
    lesen:Object.keys(draft.objective.lesen).length,
    form:Object.keys(draft.form).filter(k=>draft.form[k]?.trim()).length,
    letter:draft.letter.trim().length>0,
    speakingNotes:Object.values(draft.speakingNotes).filter(x=>typeof x==='string'&&x.trim()).length,
    evaluated:false as const,
  };
}
export const BACKUP_FORMAT='otto30-exam01-local-backup-v1';
export function exportDraftBackup(draft:Exam01Draft):string{
  return JSON.stringify({format:BACKUP_FORMAT,examId:draft.examId,exportedAt:new Date().toISOString(),draft:sanitizeDraft(draft,draft.examId)},null,2);
}
export function importDraftBackup(source:string,examId='otto-a12-01'):Exam01Draft{
  if(source.length>200000)throw Error('Backup file is too large');
  let record:unknown;try{record=JSON.parse(source);}catch{throw Error('Invalid JSON backup');}
  if(!obj(record)||record.format!==BACKUP_FORMAT||record.examId!==examId||!obj(record.draft)||record.draft.version!==1||record.draft.examId!==examId)throw Error('Not an OTTO exam #1 backup');
  return sanitizeDraft(record.draft,examId);
}
