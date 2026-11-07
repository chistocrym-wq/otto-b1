import type { ModuleId } from '../types';
import { mergeTaskResultsForUser } from './taskResultsBridge';

export type TaskResultStatus='correct'|'incorrect'|'skipped'|'reviewed';
export type TaskAttempt={score:number;total:number;at:string;skipped?:boolean};
export type TaskResult={score:number;total:number;status:TaskResultStatus;attempts:TaskAttempt[];corrected:boolean;firstScore:number;firstTotal:number};
// These fields are added INSIDE the already synchronized state key, not a new
// per-device localStorage key. Completion IDs remain separate and unchanged.
const KEY='otto-module-task-completion-v1';
type TaskResults=Partial<Record<ModuleId,Record<string,TaskResult>>>;
type RawStore=Partial<Record<ModuleId,string[]>>&{taskResults?:TaskResults};
function getStore():RawStore{try{const data=JSON.parse(localStorage.getItem(KEY)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch{return {}}}
export function readTaskResults(module:ModuleId,verifiedUserId?:string):Record<string,TaskResult>{
 const source=getStore().taskResults?.[module]??{};
 const result:Record<string,TaskResult>={};
 for(const [id,row] of Object.entries(source)){
   if(!row||typeof row!=='object'||!Array.isArray(row.attempts)||!Number.isFinite(row.score)||!Number.isFinite(row.total)||row.total<=0)continue;
   result[id]=row;
 }
 if(!verifiedUserId)return result;
 return mergeTaskResultsForUser(module,verifiedUserId,result,localStorage);
}
export function recordTaskResult(module:ModuleId,id:string,score:number,total:number,skipped=false):{first:boolean;value:TaskResult}|null{
 if(!id||!Number.isFinite(score)||!Number.isFinite(total)||total<=0)return null;
 const store=getStore();
 const results={...(store.taskResults??{})};
 const old=results[module]?.[id];
 const attempt:TaskAttempt={score:Math.max(0,Math.min(total,score)),total,at:new Date().toISOString(),...(skipped?{skipped:true}:{})};
 const attempts=[...(old?.attempts??[]),attempt].slice(-32);
 const highest=attempts.filter(a=>!a.skipped).reduce<TaskAttempt|null>((best,a)=>!best||a.score/a.total>best.score/best.total?a:best,null);
 const status:TaskResultStatus=highest?(highest.score>=highest.total?'correct':highest.score===0?'incorrect':'reviewed'):'skipped';
 const firstAttempt=old?{score:old.firstScore,total:old.firstTotal}:attempt;
 const corrected=!!old&&(old.corrected||(!skipped&&old.attempts.some(a=>!a.skipped&&a.score<a.total)&&(highest?.score??0)>(old.attempts.filter(a=>!a.skipped).reduce((max,a)=>Math.max(max,a.score/a.total),0)* (highest?.total??1))));
 const value:TaskResult={score:highest?.score??0,total:highest?.total??total,status,attempts,corrected:corrected||(status==='correct'&&attempts.some(a=>!a.skipped&&a.score<a.total)),firstScore:firstAttempt.score,firstTotal:firstAttempt.total};
 results[module]={...(results[module]??{}),[id]:value};
 store.taskResults=results;
 try{localStorage.setItem(KEY,JSON.stringify(store));window.dispatchEvent(new Event('otto:task-results-changed'))}catch{/* existing server sync will retry */}
 return {first:!old,value};
}
export function getCorrectionDelta(module:ModuleId){
 const entries=Object.values(readTaskResults(module));
 return entries.reduce((acc,item)=>acc+((item.score-item.firstScore)/(item.total===100?100:1)),0);
}
