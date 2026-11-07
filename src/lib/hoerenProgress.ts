import { listeningTasks, type HorenTask } from '../data/listening';
import { listeningInventory, listeningTeilTasks, type ListeningTeil } from '../data/listeningParts';

export const HOEREN_PROGRESS_KEY='otto-a1-hoeren-progress-v2';

// Original counters, mistakes and credited IDs remain in the original server-synced
// key. Only per-Teil cursors are added; replay never deletes historical credits.
export type HorenProgress={
  nextIndex:number;
  completed:number;
  correct:number;
  mistakes:string[];
  credited:string[];
  teilPositions:Record<ListeningTeil,number>;
};

function safeIndex(value:unknown,max:number):number {
  const n=Number(value);
  return Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;
}
function safeCount(value:unknown):number {
  const n=Number(value);
  return Number.isFinite(n)?Math.max(0,Math.floor(n)):0;
}

export function normalizeHorenProgress(raw:unknown):HorenProgress {
  const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:{};
  const nextIndex=safeIndex(source.nextIndex,listeningTasks.length-1);
  const credited=Array.isArray(source.credited)?source.credited.map(String).slice(-240):[];
  const creditedIds=new Set(credited);
  const mistakes=Array.isArray(source.mistakes)?source.mistakes.map(String).slice(-160):[];
  const rawPositions=source.teilPositions&&typeof source.teilPositions==='object'&&!Array.isArray(source.teilPositions)
    ? source.teilPositions as Record<string,unknown>:null;
  const teilPositions:Record<ListeningTeil,number>={1:0,2:0,3:0};
  for(const teil of [1,2,3] as const){
    const tasks=listeningTeilTasks[teil];
    const firstUncredited=tasks.findIndex(task=>!creditedIds.has(task.id));
    const inferred=firstUncredited<0?tasks.length-1:firstUncredited;
    teilPositions[teil]=rawPositions&&rawPositions[teil]!==undefined
      ? safeIndex(rawPositions[teil],tasks.length-1)
      : inferred;
  }
  // Migration of the old global cursor is a projection, not a destructive rewrite.
  if(!rawPositions&&Object.prototype.hasOwnProperty.call(source,'nextIndex')){
    const legacyTask=listeningTasks[nextIndex];
    const placement=listeningInventory.find(entry=>entry.task.id===legacyTask.id);
    if(placement){
      const at=listeningTeilTasks[placement.teil].findIndex(task=>task.id===legacyTask.id);
      if(at>=0)teilPositions[placement.teil]=at;
    }
  }
  return {...source,nextIndex,completed:safeCount(source.completed),correct:safeCount(source.correct),mistakes,credited,teilPositions};
}

export function readHorenProgress():HorenProgress {
  try{return normalizeHorenProgress(JSON.parse(localStorage.getItem(HOEREN_PROGRESS_KEY)||'{}'))}
  catch{return normalizeHorenProgress({})}
}

export function saveHorenProgress(progress:HorenProgress):void {
  try{localStorage.setItem(HOEREN_PROGRESS_KEY,JSON.stringify(progress))}
  catch{/* local and server-sync persistence are best effort */}
}

export function setHorenTeilPosition(progress:HorenProgress,teil:ListeningTeil,index:number):HorenProgress {
  return {...progress,teilPositions:{...progress.teilPositions,[teil]:safeIndex(index,listeningTeilTasks[teil].length-1)}};
}

export function creditHorenTask(progress:HorenProgress,task:HorenTask,teil:ListeningTeil,index:number,isCorrect:boolean):
  {progress:HorenProgress;newlyCredited:boolean} {
  const globalIndex=listeningTasks.findIndex(item=>item.id===task.id);
  if(globalIndex<0||!listeningTeilTasks[teil].some(item=>item.id===task.id)){
    throw new Error('Task outside selected Hören Teil: '+task.id);
  }
  const nextPosition=Math.min(listeningTeilTasks[teil].length-1,index+1);
  // A replay may correct its result, but must not rewind a saved position.
  const advances=progress.teilPositions[teil]===index;
  const next:HorenProgress={
    ...progress,
    nextIndex:advances?Math.max(progress.nextIndex,Math.min(listeningTasks.length-1,globalIndex+1)):progress.nextIndex,
    teilPositions:{...progress.teilPositions,[teil]:advances?nextPosition:progress.teilPositions[teil]},
  };
  if(progress.credited.includes(task.id))return {progress:next,newlyCredited:false};
  return {
    progress:{
      ...next,
      completed:Math.min(listeningTasks.length,progress.completed+1),
      correct:progress.correct+(isCorrect?1:0),
      mistakes:isCorrect?progress.mistakes:[...progress.mistakes,`${task.id}: ${task.prompt}`].slice(-160),
      credited:[...progress.credited,task.id].slice(-240),
    },
    newlyCredited:true,
  };
}
