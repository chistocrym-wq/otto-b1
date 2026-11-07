import { listeningTasks } from '@/data/listening';
export type HorenSavedProgress={nextIndex:number;completed:number;correct:number;mistakes:string[];credited:string[]};
export const HOREN_PROGRESS_KEY='otto-a1-hoeren-progress-v2';
export function readHorenProgress():HorenSavedProgress{
  try{const p=JSON.parse(localStorage.getItem(HOREN_PROGRESS_KEY)||'{}');return{nextIndex:Math.max(0,Math.min(listeningTasks.length-1,Number(p.nextIndex)||0)),completed:Math.max(0,Number(p.completed)||0),correct:Math.max(0,Number(p.correct)||0),mistakes:Array.isArray(p.mistakes)?p.mistakes.map(String).slice(-160):[],credited:Array.isArray(p.credited)?p.credited.map(String).slice(-240):[]}}catch{return{nextIndex:0,completed:0,correct:0,mistakes:[],credited:[]}}
}
