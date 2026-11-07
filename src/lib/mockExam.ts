import type { ModuleId } from '@/types';

export interface MockSectionResult{raw:number;rawMax:number;points:number}
export interface MockAttempt{id:string;at:string;sections:Record<ModuleId,MockSectionResult>;total:number;passed:boolean;grade:'sehr gut'|'gut'|'befriedigend'|'ausreichend'|'nicht bestanden'}
export const MOCK_HISTORY_KEY='otto-a1-mock-attempts-v1';
export function scaled25(raw:number,rawMax=15){return Math.round(Math.max(0,Math.min(rawMax,raw))/rawMax*25*10)/10}
export function gradeFor(total:number):MockAttempt['grade']{if(total>=90)return'sehr gut';if(total>=80)return'gut';if(total>=70)return'befriedigend';if(total>=60)return'ausreichend';return'nicht bestanden'}
export function buildMockAttempt(id:string,raw:Record<ModuleId,{raw:number;rawMax:number}>):MockAttempt{
 const sections=Object.fromEntries((Object.entries(raw) as Array<[ModuleId,{raw:number;rawMax:number}]>).map(([id,v])=>[id,{...v,points:scaled25(v.raw,v.rawMax)}])) as Record<ModuleId,MockSectionResult>;
 const total=Math.round(Object.values(sections).reduce((s,v)=>s+v.points,0)*10)/10;
 return{id,at:new Date().toISOString(),sections,total,passed:total>=60,grade:gradeFor(total)};
}
export function readMockHistory():MockAttempt[]{try{const p=JSON.parse(localStorage.getItem(MOCK_HISTORY_KEY)||'[]');return Array.isArray(p)?p:[]}catch{return[]}}
export function saveMockAttempt(attempt:MockAttempt){const history=readMockHistory();if(history.some(x=>x.id===attempt.id))return false;try{localStorage.setItem(MOCK_HISTORY_KEY,JSON.stringify([attempt,...history].slice(0,20)));return true}catch{return false}}
