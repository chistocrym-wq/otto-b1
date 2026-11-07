import type { ActivityEntry, ModuleId, ModuleProgress, Progress } from '@/types';
import { getModuleCompletion } from '@/lib/moduleTaskCompletion';
import { getCorrectionDelta } from '@/lib/taskResults';

export const MODULE_ORDER:ModuleId[]=['schreiben','sprechen','horen','lesen'];
export const MODULE_META:Record<ModuleId,{title:string;label:string;icon:string}>={schreiben:{title:'Schreiben',label:'Письмо',icon:'✍️'},sprechen:{title:'Sprechen',label:'Говорение',icon:'🗣️'},lesen:{title:'Lesen',label:'Чтение',icon:'📖'},horen:{title:'Hören',label:'Аудирование',icon:'👂'}};
export interface ModuleReadiness{id:ModuleId;score:number;accuracy:number;recent:number;stability:number;recency:number;attempts:number;answered:number;completedTasks:number;totalTasks:number;completionPercent:number;dataSufficient:boolean;evidence:string;status:'ready'|'almost'|'train';note:string}
export interface ReadinessSummary{overall:number|null;dataSufficient:boolean;evidenceLabel:string;modules:Record<ModuleId,ModuleReadiness>;weakest:ModuleId;mockStatus:'early'|'try'|'recommended';mockLabel:string;recommendation:string}
export interface PlanItem{module:ModuleId;title:string;detail:string;minutes:number;reason:string}

function clamp(v:number,min=0,max=100){return Math.max(min,Math.min(max,v))}
function avg(v:number[]){return v.length?v.reduce((s,x)=>s+x,0)/v.length:0}
function recencyFor(id:ModuleId,activity:ActivityEntry[]){const last=activity.filter(x=>x.module===id).map(x=>new Date(x.at).getTime()).filter(Number.isFinite).sort((a,b)=>b-a)[0];if(!last)return 0;const days=(Date.now()-last)/(24*60*60*1000);return days<=7?100:days<=21?80:days<=45?60:days<=90?40:20}

export function getModuleReadiness(id:ModuleId,item?:ModuleProgress,activity:ActivityEntry[]=[]):ModuleReadiness{
 const attempts=item?.attempts??0;
 const answered=item?.answered??item?.completed??0;
 const correct=(item?.correct??0)+getCorrectionDelta(id);
 const accuracy=answered>0?clamp(Math.round(correct/answered*100)):0;
 const completion=getModuleCompletion(id);
 const score=clamp(Math.round(accuracy*completion.percent/100));
 const recency=recencyFor(id,activity);
 const dataSufficient=completion.completed>0&&answered>0;
 const status:ModuleReadiness['status']=score>=80?'ready':score>=65?'almost':'train';
 const evidence=completion.completed===0
   ? `Пройдено 0 из ${completion.total} заданий`
   : `Успешность ${accuracy}% · Пройдено ${completion.completed}/${completion.total} (${completion.percent}%)`;
 const note=!dataSufficient?'Пока нет завершённых заданий для расчёта.':status==='ready'?'Высокая успешность подтверждена пройденной частью модуля.':status==='almost'?'Результат хороший, но нужно пройти больше заданий.':'Продолжайте тренировку: готовность растёт и от успешности, и от количества пройденных заданий.';
 return{id,score,accuracy,recent:accuracy,stability:completion.percent,recency,attempts,answered,completedTasks:completion.completed,totalTasks:completion.total,completionPercent:completion.percent,dataSufficient,evidence,status,note};
}

export function getReadiness(progress:Progress,activity:ActivityEntry[]=[]):ReadinessSummary{
 const list=MODULE_ORDER.map(id=>getModuleReadiness(id,progress[id],activity));
 const modules=Object.fromEntries(list.map(x=>[x.id,x])) as Record<ModuleId,ModuleReadiness>;
 const weakest=list.reduce((a,b)=>b.score<a.score?b:a).id;
 const dataSufficient=list.every(x=>x.dataSufficient);
 const overall=Math.round(avg(list.map(x=>x.score)));
 let mockStatus:ReadinessSummary['mockStatus']='early',mockLabel='Пока рано';
 if(dataSufficient&&overall>=62){mockStatus='try';mockLabel='Можно пройти для проверки'}
 if(dataSufficient&&overall>=78&&list.every(x=>x.score>=65)){mockStatus='recommended';mockLabel='Можно пройти пробный экзамен'}
 const completed=list.reduce((sum,item)=>sum+item.completedTasks,0);
 const total=list.reduce((sum,item)=>sum+item.totalTasks,0);
 const evidenceLabel=`Общая готовность: среднее 4 модулей · пройдено ${completed}/${total} заданий`;
 const w=MODULE_META[weakest];
 const recommendation=list.every(x=>x.completedTasks===0)
   ? 'Начните со Schreiben, затем выполните задания и в остальных трёх модулях.'
   : `Сегодня уделите больше внимания ${w.title}: его текущая готовность ниже остальных.`;
 return{overall,dataSufficient,evidenceLabel,modules,weakest,mockStatus,mockLabel,recommendation};
}

function taskCopy(module:ModuleId,first:boolean){if(module==='schreiben')return first?{title:'Первое письмо вместе с Отто',detail:'Разобрать задание и написать одно короткое письмо.'}:{title:'Schreiben',detail:'Написать одно письмо и разобрать обратную связь Отто.'};if(module==='sprechen')return{title:'Sprechen',detail:'Повторить несколько карточек и ответить голосом.'};if(module==='horen')return{title:'Hören',detail:'Сделать короткую серию заданий на слух.'};return{title:'Lesen',detail:'Сделать короткую серию заданий на понимание текста.'}}
export function buildDailyPlan(progress:Progress,minutes:5|15|30,activity:ActivityEntry[]=[]):PlanItem[]{const r=getReadiness(progress,activity),ranked=MODULE_ORDER.map((id,index)=>({id,score:r.modules[id].score,index})).sort((a,b)=>a.score-b.score||a.index-b.index),first=MODULE_ORDER.every(id=>(progress[id]?.attempts??0)===0),sequence:ModuleId[]=first?['schreiben','sprechen','horen','lesen']:ranked.map(x=>x.id),slots=minutes===5?[5]:minutes===15?[7,4,4]:[10,7,7,6];return slots.map((slot,index)=>{const module=sequence[index%sequence.length],copy=taskCopy(module,first&&module==='schreiben'),m=r.modules[module],reason=m.completedTasks===0?m.evidence:m.status==='ready'?'Короткое повторение, чтобы закрепить результат.':`Текущая готовность: ${m.score}%.`;return{module,minutes:slot,reason,...copy}})}
export function getTodayActivity(activity:ActivityEntry[]){const now=new Date(),items=activity.filter(e=>{const d=new Date(e.at);return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&d.getDate()===now.getDate()}),attempts=items.length,seconds=items.reduce((s,e)=>s+Math.max(0,e.durationSeconds??0),0),minutes=seconds?Math.max(1,Math.round(seconds/60)):0,byModule=MODULE_ORDER.reduce((r,id)=>{r[id]=items.filter(e=>e.module===id).length;return r},{} as Record<ModuleId,number>);return{attempts,minutes,byModule}}
export function getGreeting(){const h=new Date().getHours();if(h<6)return'Доброй ночи';if(h<12)return'Доброе утро';if(h<18)return'Добрый день';return'Добрый вечер'}
