export interface StateRow {state_key:string;state_value:string|null;updated_at:string|null}
export interface Attempt {module:string;taskId:string;score:number;total:number;at:string}
export interface ModuleEvidence {module:string;marked:number;detailed:number;attempts:number;correct:number;total:number;improved:number;fullyCorrect:number}
export interface Evidence {modules:ModuleEvidence[];attempts:Attempt[];attemptCount:number;lastAttemptAt:string|null;updatedAt:string|null;resumeModule:string|null;resumeDetail:string|null;conflicts:string[];warnings:string[];hasEvidence:boolean}
const MODULES=['lesen','horen','schreiben','sprechen'];
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const array=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
const number=(v:unknown):number|null=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=1000000?v:null;
const identifier=(v:unknown):string|null=>typeof v==='string'&&/^[\w:-]{1,100}$/.test(v)?v:null;
const stamp=(v:unknown):string|null=>typeof v==='string'&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():null;
export function summarizeEvidence(rows:StateRow[]):Evidence {
  const records=new Map(rows.filter(r=>r&&typeof r.state_key==='string').map(r=>[r.state_key,r])),warnings:string[]=[],conflicts:string[]=[],attempts:Attempt[]=[];
  const read=(key:string):Record<string,unknown>=>{const row=records.get(key);if(row?.state_value==null)return {};try{const parsed:unknown=JSON.parse(row.state_value);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('invalid_snapshot');return object(parsed);}catch{warnings.push('Не удалось прочитать часть прогресса. Это не отсутствие занятий.');return {};}};
  const reading=read('otto-a1-lesen-progress-v2'),resume=read('otto-training-resume-v1'),completion=read('otto-module-task-completion-v1'),results=object(completion.taskResults);
  const modules=MODULES.map(module=>{
    const marks=new Set(array(completion[module]).map(identifier).filter((v):v is string=>v!==null));
    if(module==='lesen')for(const part of ['1','2','3'])for(const key of array(object(reading[part]).credited).map(identifier))if(key)marks.add(key);
    let detailed=0,recorded=0,correct=0,total=0,improved=0,fullyCorrect=0;
    for(const [rawKey,raw] of Object.entries(object(results[module]))){
      const key=identifier(rawKey),r=object(raw);if(!key)continue;marks.add(key);
      const sc=number(r.score),tot=number(r.total);if(sc===null||tot===null||tot===0||sc>tot)continue;
      detailed++;correct+=sc;total+=tot;if(sc===tot)fullyCorrect++;
      const firstScore=number(r.firstScore),firstTotal=number(r.firstTotal);
      if(firstScore!==null&&firstTotal!==null&&firstTotal>0&&firstScore<=firstTotal&&sc/tot>firstScore/firstTotal)improved++;
      for(const value of array(r.attempts)){const a=object(value),s=number(a.score),t=number(a.total),at=stamp(a.at);if(s===null||t===null||!t||s>t||!at)continue;recorded++;attempts.push({module,taskId:key,score:s,total:t,at});}
    }
    return {module,marked:marks.size,detailed,attempts:recorded,correct,total,improved,fullyCorrect};
  });
  for(const part of ['1','2','3']){
    const legacyCorrect=number(object(reading[part]).correct);let latest=0,n=0;
    for(const [key,raw] of Object.entries(object(results.lesen))){const r=object(raw),s=number(r.score),t=number(r.total);if(key.startsWith(part+'-')&&s!==null&&t!==null&&t>0&&s<=t){latest+=s;n++;}}
    if(legacyCorrect!==null&&latest>legacyCorrect)conflicts.push(`Lesen, Teil ${part}: старая сводка — ${legacyCorrect} правильных; последние результаты ${n} карточек — уже ${latest}. Общий процент по этим разным показателям не вычисляем.`);
  }
  attempts.sort((a,b)=>b.at.localeCompare(a.at));
  const updates=rows.filter(Boolean).map(r=>stamp(r.updated_at)).filter((v):v is string=>v!==null).sort();
  return {modules,attempts:attempts.slice(0,100),attemptCount:attempts.length,lastAttemptAt:attempts[0]?.at||null,
    updatedAt:updates.length?updates[updates.length-1]:null,
    resumeModule:typeof resume.activeTrainingView==='string'&&MODULES.includes(resume.activeTrainingView)?resume.activeTrainingView:null,
    resumeDetail:identifier(resume.activeTrainingDetail),conflicts,warnings:[...new Set(warnings)],hasEvidence:modules.some(m=>m.marked>0)};
}
export function formatSeconds(seconds:unknown):string {
  if(typeof seconds!=='number'||!Number.isFinite(seconds)||seconds<0)return 'Нет данных';
  const n=Math.round(seconds);if(!n)return '0 с в старом счётчике';
  if(n<60)return `${n} с`;return `${Math.floor(n/60)} мин ${n%60} с`;
}
