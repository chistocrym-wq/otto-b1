import {useEffect,useRef,useState} from 'react';
import type {ExamCandidate} from './schema.js';
import type {Exam01Draft} from './progress.js';
import {readRecording} from './recordings.js';
import {gradeFor} from '../../lib/mockExam.js';
import {isUsableScore,normalizeScoreReview,examParticipation,recommendExamPractice,hasSpeechRecording} from './scoreReview.js';

type Props={userId:string;exam:ExamCandidate;draft:Exam01Draft;onNextExam?:()=>void};
export type SkillQuestion={id:string;prompt:string;title?:string;context?:string;part?:number;options?:string[]};
export type Score={
 complete:true; total:number; max:100;passed:boolean;
 sections:{horen:number;lesen:number;schreiben:number;sprechen:number};
 review:{
  horen:Array<{id:string;number:number;correctAnswer:boolean;correct:boolean;option:string;submitted:boolean|number|null;answered?:boolean}>;
  lesen:Array<{id:string;number:number;correctAnswer:boolean;option:string;submitted:boolean|number|null}>;
  form:Array<{label:string;submitted:string;expected:string;correct:boolean}>;
  letter:{submitted?:boolean;feedbackRu?:string;taskPoints?:string[];contentPoints?:Array<{point?:string;earned?:number;commentRu?:string}>;corrections?:Array<{original:string;corrected:string;explanation:string}>};
  speech:Array<{taskId:string;recorded?:boolean;taskType?:string;theme?:string;keyword?:string;instruction?:string;missing?:string[];score?:number;practice?:string[];pronunciationRu?:string;strengths?:string[]}>;
  taskContext?:{horen:SkillQuestion[];lesen:SkillQuestion[]};
 };
};
type ApiError=Error&{code?:string};
const names:Record<string,string>={horen:'Hören',lesen:'Lesen',schreiben:'Schreiben',sprechen:'Sprechen'};
const tasks=['teil1-intro','teil2-1','teil2-2','teil3-1','teil3-2'];
const API='/api/otto30-score';
function key(userId:string,id:string){return 'otto30-private-score-attempt-v1:'+encodeURIComponent(userId)+':'+id;}
function examNum(id:string){return Number(id.slice(-2));}
async function call<T>(op:string,exam:number,body?:Record<string,unknown>,query?:Record<string,string>):Promise<T>{
 const url=new URL(API,location.origin);url.searchParams.set('op',op);url.searchParams.set('exam',String(exam));
 for(const [k,v] of Object.entries(query||{}))url.searchParams.set(k,v);
 const res=await fetch(url,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json','x-otto30-owner-upload':'1'}:{},body:body?JSON.stringify(body):undefined});
 const data=await res.json().catch(()=>({code:'no_server_response'}));
 if(!res.ok){const error=Error('Серверная проверка недоступна ('+res.status+', '+(data.code||'unknown')+').') as ApiError;error.code=data.code;throw error;}
 return data as T;
}
function base64(blob:Blob):Promise<string>{
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();reader.onerror=()=>reject(Error('Не удалось прочитать запись.'));
  reader.onload=()=>{const value=String(reader.result||'');const index=value.indexOf(',');if(index<0)reject(Error('Повреждённая запись.'));else resolve(value.slice(index+1));};
  reader.readAsDataURL(blob);
 });
}

export function Exam30ScoreResult({userId,exam,draft,onNextExam}:Props){
 const [score,setScore]=useState<Score|null>(null);
 const [working,setWorking]=useState(false);
 const inFlight=useRef(false);
 const [status,setStatus]=useState('');
 const [error,setError]=useState('');
 const examNumber=examNum(exam.id);
 const check=async()=>{
  if(inFlight.current)return;
  inFlight.current=true;setWorking(true);setError('');
  setStatus('OTTO проверяет ответы…');
  try{
   let attemptId:string|null=null;
   try{attemptId=localStorage.getItem(key(userId,exam.id));}catch{}
   if(attemptId){
    const existing=await call<Score|{complete:false}>('result',examNumber,undefined,{attemptId});
    if(existing.complete){if(!isUsableScore(existing))throw Error('Сервер вернул некорректные баллы. Повторите проверку позже.');setScore(existing);setStatus('');return;}
   }
   if(!attemptId){
    const started=await call<{attemptId:string}>('begin',examNumber,{start:true});
    attemptId=started.attemptId;
    try{localStorage.setItem(key(userId,exam.id),attemptId);}catch{throw Error('Не удалось сохранить ID попытки в браузере.');}
   }
   setStatus('Проверяю Hören, Lesen и формуляр…');
   await call('objective',examNumber,{attemptId,horen:draft.objective.horen,lesen:draft.objective.lesen,form:draft.form});
   setStatus('Проверяю письмо…');
   await call('letter',examNumber,{attemptId,letter:draft.letter});
   for(let i=0;i<tasks.length;i++){
    const taskId=tasks[i];
    setStatus('Проверяю устную речь: '+(i+1)+' / 5');
    const blob=await readRecording(userId,taskId,exam.id);
    const encoded=blob?await base64(blob):'';
    await call('speech',examNumber,{attemptId,taskId,audioBase64:encoded,mimeType:blob?.type||'audio/webm'});
   }
   const result=await call<Score>('result',examNumber,undefined,{attemptId});
   if(!result.complete)throw Error('Сервер ещё не закончил проверку всех разделов. Попробуйте ещё раз.');
   if(!isUsableScore(result))throw Error('Сервер вернул неполные баллы. Попробуйте ещё раз.');
   setScore(result);setStatus('');
  }catch(e){setError(e instanceof Error?e.message:'Не удалось проверить экзамен.');setStatus('');}
  finally{inFlight.current=false;setWorking(false);}
 };
 useEffect(()=>{void check();},[userId,exam.id]);
 if(!score)return <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
  <h3 className="text-lg font-black">OTTO проверяет ответы…</h3>
  <p className="mt-2 text-sm text-slate-600">После проверки всех разделов появятся баллы из 100, ошибки и рекомендации. Пока ответов не проверяли, результаты не выставляются.</p>
  {error&&<p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
  {status&&<p role="status" className="mt-3 text-sm">{status}</p>}
  <button type="button" disabled={working} onClick={()=>void check()} className="mt-4 min-h-12 w-full rounded-xl bg-teal-700 px-4 font-black text-white disabled:opacity-60">{working?'Проверяем…':error?'Повторить проверку':'Проверить экзамен'}</button>
 </div>;
 return <Exam30ScoreView score={score} onNextExam={onNextExam}/>;
}
export function Exam30ScoreView({score,onNextExam}:{score:Score;onNextExam?:()=>void}){
 if(!isUsableScore(score))return <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900">Сервер вернул неполный результат. Баллы нельзя достоверно показать — повторите проверку позже.</p>;
 const {review,missingSections}=normalizeScoreReview(score.review);
 const participation=examParticipation(score);
 return <section className="mt-4 space-y-4">
  <div className="rounded-3xl bg-slate-950 p-6 text-white">
   <p className="font-black text-sm uppercase text-amber-300">Итог пробного экзамена</p>
   <p className="mt-3 text-5xl font-black">{score.total} / 100</p>
   <h3 className="mt-2 text-xl font-black">{participation.allUnanswered?'Экзамен не выполнен':score.passed?'Экзамен сдан':'Экзамен не сдан'}</h3>
   {participation.allUnanswered?<p className="mt-2 text-sm font-semibold">Ответы не были даны. Баллы 0/100 не отражают ваш уровень знаний.</p>:<p className="mt-1 text-sm font-semibold">Оценка OTTO: {gradeFor(score.total)}</p>}
  </div>
  <div className="grid grid-cols-2 gap-3">{Object.entries(score.sections).map(([k,v])=><div key={k} className="rounded-xl border bg-white p-4"><p className="text-sm font-semibold">{names[k]||k}</p><p className="text-2xl font-black">{v} / 25</p></div>)}</div>
  {missingSections.length>0&&<p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Часть подробного разбора временно недоступна: {missingSections.join(', ')}. Баллы сохранены, отсутствующие ошибки не считаются правильными ответами.</p>}
  {(['horen','lesen'] as const).map(part=><details key={part} className="rounded-xl border bg-white p-4"><summary className="cursor-pointer font-black">Разбор {names[part]}</summary>
   <div className="mt-3 space-y-2">
    {review[part].filter(q=>q.submitted!==null&&!q.correctAnswer).map(q=><p key={q.id} className="text-sm"><b>Задание {q.number}:</b> ваш ответ неверен. Правильно: {q.option}</p>)}
    {review[part].filter(q=>q.submitted===null).length>0&&<p className="text-sm text-slate-600">Не выполнено заданий: {review[part].filter(q=>q.submitted===null).length}. Это пропуски, а не выявленные ошибки.</p>}
    {!review[part].some(q=>q.submitted!==null&&!q.correctAnswer)&&review[part].every(q=>q.submitted!==null)&&<p className="text-sm text-teal-800">Ошибок в отвеченных заданиях нет.</p>}
   </div>
  </details>)}
  <details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer font-black">Schreiben — ошибки и исправления</summary>
   {review.form.filter(q=>q.submitted.trim()&&!q.correct).map((q,i)=><p key={i} className="mt-2 text-sm">{q.label}: {q.submitted} → {q.expected}</p>)}
   {review.form.filter(q=>!q.submitted.trim()).length>0&&<p className="mt-2 text-sm text-slate-600">Не заполнено полей: {review.form.filter(q=>!q.submitted.trim()).length}. Это пропуски, а не ошибки ввода.</p>}
   <p className="mt-3 text-sm">{review.letter.feedbackRu||''}</p>
   {(review.letter.corrections||[]).map((q,i)=><p key={i} className="mt-2 text-sm">{q.original} → {q.corrected}. {q.explanation}</p>)}
  </details>
  <details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer font-black">Sprechen — замечания</summary>
   {review.speech.map(q=><div key={q.taskId} className="mt-3 border-t pt-3"><b>{q.taskId}</b>{hasSpeechRecording(q)?<><p className="mt-1 text-sm">{q.pronunciationRu||''}</p>{q.practice?.map((line,i)=><p key={i} className="mt-1 text-sm">{line}</p>)}</>:<p className="mt-1 text-sm text-slate-600">Задание не выполнено: аудиозаписи нет.</p>}</div>)}
  </details>
  <section className="rounded-xl border bg-white p-4"><h4 className="font-black text-slate-900">Рекомендации OTTO</h4><ul className="mt-3 space-y-2 text-sm text-slate-700">{recommendExamPractice(score).map((recommendation,i)=><li key={i} className="leading-6">{i+1}. {recommendation}</li>)}</ul></section>
  {onNextExam&&<button type="button" className="min-h-12 w-full rounded-xl bg-teal-700 px-5 font-black text-white" onClick={onNextExam}>Следующий экзамен →</button>}
 </section>;
}
