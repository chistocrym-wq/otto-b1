import type { ActivityEntry, ModuleId, Progress } from '@/types';
import { loadLearningProfile } from '@/lib/learningProfile';
import { MODULE_META } from '@/lib/preparation';

export interface ModuleInsight {
  id: ModuleId;
  attempts: number;
  average: number | null;
  mistakes: number;
  correct: number;
  answered: number;
}

export interface LearningProblem {
  key: string;
  module: ModuleId;
  label: string;
  count: number;
  example?: string;
}

export interface LearningInsights {
  modules: ModuleInsight[];
  strongest: ModuleInsight | null;
  weakest: ModuleInsight | null;
  problems: LearningProblem[];
  hasData: boolean;
}

const MODULES:ModuleId[]=['lesen','horen','schreiben','sprechen'];

function readJson(key:string):unknown{
  try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null}catch{return null}
}

function addProblem(target:Map<string,LearningProblem>,problem:Omit<LearningProblem,'count'>&{count?:number}){
  const existing=target.get(problem.key);
  if(existing){existing.count+=Math.max(1,problem.count??1);if(!existing.example&&problem.example)existing.example=problem.example;return}
  target.set(problem.key,{...problem,count:Math.max(1,problem.count??1)});
}

function collectStoredProblems(modules:ModuleInsight[]){
  const map=new Map<string,LearningProblem>();
  const lesen=readJson('otto-a1-lesen-progress-v2') as Record<string,{mistakes?:unknown}>|null;
  for(const part of ['1','2','3']){
    const mistakes=Array.isArray(lesen?.[part]?.mistakes)?lesen![part].mistakes!.map(String):[];
    for(const mistake of mistakes)addProblem(map,{key:`lesen-${part}`,module:'lesen',label:`Lesen · Teil ${part}`,example:mistake});
  }

  const horen=readJson('otto-a1-hoeren-progress-v2') as {mistakes?:unknown}|null;
  const horenMistakes=Array.isArray(horen?.mistakes)?horen!.mistakes!.map(String):[];
  const timePattern=/\b(?:\d{1,2}[:.]?\d{0,2}|uhr|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|termin|datum|euro|cent)\b/iu;
  for(const mistake of horenMistakes){
    const timeOrNumber=timePattern.test(mistake);
    addProblem(map,{key:timeOrNumber?'horen-time':'horen-detail',module:'horen',label:timeOrNumber?'Hören · время, даты и числа':'Hören · ключевая информация',example:mistake});
  }

  for(const error of loadLearningProfile().errors){
    const example=error.examples[0]?`${error.examples[0].original} → ${error.examples[0].corrected}`:undefined;
    addProblem(map,{key:`schreiben-${error.tag.toLocaleLowerCase('de-DE')}`,module:'schreiben',label:`Schreiben · ${error.tag}`,count:error.count,example});
  }

  const sprechen=modules.find(item=>item.id==='sprechen');
  if(sprechen&&sprechen.attempts>=2&&sprechen.average!==null&&sprechen.average<70){
    addProblem(map,{key:'sprechen-overall',module:'sprechen',label:'Sprechen · устный ответ',count:Math.max(1,sprechen.mistakes||1),example:`Средний результат по попыткам: ${sprechen.average}%`});
  }
  return [...map.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
}

export function buildLearningInsights(progress:Progress,activity:ActivityEntry[]):LearningInsights{
  const modules=MODULES.map(id=>{
    const entries=activity.filter(item=>item.module===id).slice(0,12);
    const p=progress[id];
    const attempts=entries.length||p?.attempts||0;
    const average=entries.length?Math.round(entries.reduce((sum,item)=>sum+item.percent,0)/entries.length):typeof p?.lastScore==='number'?p.lastScore:null;
    const answered=Math.max(0,Math.round(p?.answered??p?.total??0));
    const correct=Math.max(0,Math.round(p?.correct??0));
    const activityMistakes=entries.reduce((sum,item)=>sum+Math.max(0,Math.round(item.total-item.score)),0);
    const mistakes=Math.max(activityMistakes,Math.max(0,answered-correct));
    return{id,attempts,average,mistakes,correct,answered};
  });
  const measured=modules.filter(item=>item.attempts>0&&item.average!==null);
  const strongest=measured.length?[...measured].sort((a,b)=>(b.average??0)-(a.average??0)||b.attempts-a.attempts)[0]:null;
  const weakest=measured.length?[...measured].sort((a,b)=>(a.average??100)-(b.average??100)||b.mistakes-a.mistakes)[0]:null;
  const problems=collectStoredProblems(modules);
  return{modules,strongest,weakest,problems,hasData:measured.length>0||problems.length>0};
}

export function moduleInsightLabel(id:ModuleId){return MODULE_META[id].title}
