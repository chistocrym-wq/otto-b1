import React,{useEffect,useState} from 'react';
import {Exam30ScoreView,type Score} from './Exam30ScoreResult.js';
import {isUsableScore} from './scoreReview.js';

type Row={exam:number;internalExam:number;attemptId:string;total:number;passed:boolean;sections:Score['sections'];completedAt:string};
type History={results:Row[]};
class ReviewErrorBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(error:Error){console.error('OTTO30 result display failed',error.message);}
 render(){return this.state.failed?
  <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900">Подробный результат не удалось отобразить. Вернитесь к списку экзаменов или обновите страницу. Сохранённые оценки не удалены.</p>:
  this.props.children;}
}

export function Exam30MyResults({onBack}:{onBack:()=>void}){
 const [items,setItems]=useState<Row[]>([]);
 const [detail,setDetail]=useState<Score|null>(null);
 const [selected,setSelected]=useState<number|null>(null);
 const [busy,setBusy]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController();
  void fetch('/api/otto30-score?op=history',{credentials:'same-origin',cache:'no-store',signal:controller.signal})
   .then(async res=>{if(!res.ok)throw Error('История пока недоступна ('+res.status+').');return await res.json() as History})
   .then(data=>{if(!controller.signal.aborted)setItems(Array.isArray(data.results)?data.results:[])})
   .catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Не удалось загрузить историю.')})
   .finally(()=>{if(!controller.signal.aborted)setBusy(false)});
  return()=>controller.abort();
 },[]);
 const open=async(row:Row)=>{
  setBusy(true);setError('');setDetail(null);
  try{
   const url='/api/otto30-score?op=result&exam='+row.internalExam+'&attemptId='+encodeURIComponent(row.attemptId);
   const res=await fetch(url,{credentials:'same-origin',cache:'no-store'});
   if(!res.ok)throw Error('Не удалось открыть результат ('+res.status+').');
   const value:unknown=await res.json();
   if(!isUsableScore(value))throw Error('Сервер прислал неполный результат. Баллы не изменены, попробуйте открыть его позднее.');
   setSelected(row.exam);setDetail(value);
  }catch(e){setError(e instanceof Error?e.message:'Не удалось получить результат.')}
  finally{setBusy(false);}
 };
 return <section className="mx-auto max-w-4xl pb-12 pt-8">
  <button type="button" className="min-h-11 rounded-xl border bg-white px-4 font-bold" onClick={onBack}>← К пробным экзаменам</button>
  <h2 className="mt-5 text-2xl font-black">Мои результаты</h2>
  <p className="mt-2 text-sm text-slate-600">Результаты доступны только в вашем аккаунте OTTO, в том числе с другого устройства.</p>
  {error&&<p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-rose-900">{error}</p>}
  {busy&&<p role="status" className="mt-4">Загружаю результаты…</p>}
  {!busy&&!items.length&&<p className="mt-5 rounded-xl border bg-white p-4">Проверенных экзаменов пока нет.</p>}
  {detail&&<><h3 className="mt-5 font-black">Экзамен №{selected}</h3><ReviewErrorBoundary key={selected+':'+detail.total}><Exam30ScoreView score={detail}/></ReviewErrorBoundary></>}
  <div className="mt-5 space-y-3">
   {items.map(row=><article key={row.internalExam+':'+row.attemptId} className="rounded-xl border bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
     <div><p className="font-black">Пробный экзамен №{row.exam}</p><p className="text-sm text-slate-600">{row.total} / 100 баллов · {row.passed?'Сдан':'Не сдан'}{row.completedAt?' · '+new Date(row.completedAt).toLocaleString('ru-RU'):''}</p></div>
     <button type="button" disabled={busy} onClick={()=>void open(row)} className="min-h-11 rounded-xl bg-teal-800 px-4 font-bold text-white disabled:opacity-50">Баллы, ошибки и рекомендации</button>
    </div>
   </article>)}
  </div>
 </section>;
}
