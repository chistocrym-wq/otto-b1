export type LesenPartProgress={nextIndex:number;completedTasks:number;answered:number;correct:number;mistakes:string[];credited:string[]};
export type LesenSavedProgress=Record<'1'|'2'|'3',LesenPartProgress>;
export const LESEN_PROGRESS_KEY='otto-a1-lesen-progress-v2';
const empty=():LesenPartProgress=>({nextIndex:0,completedTasks:0,answered:0,correct:0,mistakes:[],credited:[]});
export function readLesenProgress():LesenSavedProgress{
  try{
    const raw=JSON.parse(localStorage.getItem(LESEN_PROGRESS_KEY)||'{}') as Partial<LesenSavedProgress>;
    const safe=(p?:Partial<LesenPartProgress>):LesenPartProgress=>({nextIndex:Math.max(0,Math.min(49,Number(p?.nextIndex)||0)),completedTasks:Math.max(0,Number(p?.completedTasks)||0),answered:Math.max(0,Number(p?.answered)||0),correct:Math.max(0,Number(p?.correct)||0),mistakes:Array.isArray(p?.mistakes)?p!.mistakes!.map(String).slice(-120):[],credited:Array.isArray(p?.credited)?p!.credited!.map(String).slice(-200):[]});
    return {'1':safe(raw['1']),'2':safe(raw['2']),'3':safe(raw['3'])};
  }catch{return {'1':empty(),'2':empty(),'3':empty()}}
}
