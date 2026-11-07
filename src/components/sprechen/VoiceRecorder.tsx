import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { CheckCircle2, Mic, RefreshCw, Sparkles, Square, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SpeakingEvaluation =
  | { mode:'teil1'; expectedPoints:string[] }
  | { mode:'teil2'; theme:string; keyword:string; sampleQuestion:string }
  | { mode:'teil3'; object:string; sampleRequest:string }
  | { mode:'free'; title:string; expectedPoints:string[] }
  | { mode:'phrase'; expectedText:string };

type OfficialLevel='full'|'partial'|'zero';
interface EvaluationResult {
  score:number;
  officialLevel:OfficialLevel;
  transcript:string;
  strengths:string[];
  practice:string[];
  pronunciationRu?:string;
  missing?:string[];
}
interface VoiceRecorderProps { evaluation:SpeakingEvaluation; onPracticed:()=>void; onEvaluated?:(score:number)=>void; hint?:string }
const MAX_CLIENT_AUDIO_BYTES=2.8*1024*1024;
const MAX_RECORD_SECONDS=120;

let sharedMicStream:MediaStream|null=null;
let sharedMicPromise:Promise<MediaStream>|null=null;

async function getSharedMicStream():Promise<MediaStream>{
  // A fresh capture avoids iOS live-but-silent muted tracks.
  releaseSharedMic();
  if(sharedMicPromise)return sharedMicPromise;
  const promise=navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}})
    .then(stream=>{sharedMicStream=stream;return stream})
    .finally(()=>{sharedMicPromise=null});
  sharedMicPromise=promise;
  return promise;
}
function isAppleTouchDevice(){return /iP(hone|ad|od)/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}
function muteSharedMic(){sharedMicStream?.getAudioTracks().forEach(t=>{t.enabled=false})}
function releaseSharedMic(){sharedMicStream?.getTracks().forEach(t=>t.stop());sharedMicStream=null;sharedMicPromise=null}
if(typeof window!=='undefined'&&!(window as unknown as {__ottoMicCleanup?:boolean}).__ottoMicCleanup){
  (window as unknown as {__ottoMicCleanup?:boolean}).__ottoMicCleanup=true;
  window.addEventListener('pagehide',releaseSharedMic,{once:false});
}

export function VoiceRecorder({evaluation,onPracticed,onEvaluated,hint}:VoiceRecorderProps){
  const[isRecording,setIsRecording]=useState(false);
  const[elapsed,setElapsed]=useState(0);
  const[audioUrl,setAudioUrl]=useState<string|null>(null);
  const[audioBlob,setAudioBlob]=useState<Blob|null>(null);
  const[error,setError]=useState<string|null>(null);
  const[checking,setChecking]=useState(false);
  const[duplicateBlocked,setDuplicateBlocked]=useState(false);
  const[result,setResult]=useState<EvaluationResult|null>(null);
  const[aiAvailable,setAiAvailable]=useState<boolean|null>(null);
  const recorderRef=useRef<MediaRecorder|null>(null);
  const chunksRef=useRef<Blob[]>([]);
  const timerRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const urlRef=useRef<string|null>(null);
  const fileRef=useRef<HTMLInputElement|null>(null);
  const resultReportedRef=useRef(false);
  const checkControllerRef=useRef<AbortController|null>(null);
  const evaluationKey=JSON.stringify(evaluation);
  const previousEvaluationKeyRef=useRef(evaluationKey);

  const clearTimer=useCallback(()=>{if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null}},[]);
  const stopAndDiscardRecorder=useCallback(()=>{
    const recorder=recorderRef.current;
    recorderRef.current=null;
    chunksRef.current=[];
    clearTimer();
    if(recorder){
      recorder.ondataavailable=null;
      recorder.onstop=null;
      recorder.onerror=null;
      if(recorder.state==='recording')try{recorder.stop()}catch{/* ignore */}
    }
    muteSharedMic();
    setIsRecording(false);
  },[clearTimer]);
  const cancelCheck=useCallback(()=>{
    const controller=checkControllerRef.current;
    checkControllerRef.current=null;
    controller?.abort();
    setChecking(false);
  },[]);
  const reset=useCallback(()=>{
    cancelCheck();
    stopAndDiscardRecorder();
    if(urlRef.current)URL.revokeObjectURL(urlRef.current);
    urlRef.current=null;
    setAudioUrl(null);
    setAudioBlob(null);
    setElapsed(0);
    setResult(null);
    setError(null);
    setDuplicateBlocked(false);
    resultReportedRef.current=false;
  },[cancelCheck,stopAndDiscardRecorder]);

  useEffect(()=>{
    let active=true;
    fetch('/api/check-sprechen',{method:'GET'}).then(r=>r.json()).then(p=>{if(active)setAiAvailable(Boolean(p?.aiConfigured))}).catch(()=>{if(active)setAiAvailable(null)});
    return()=>{
      active=false;
      checkControllerRef.current?.abort();checkControllerRef.current=null;
      const recorder=recorderRef.current;recorderRef.current=null;
      if(recorder){recorder.ondataavailable=null;recorder.onstop=null;recorder.onerror=null;if(recorder.state==='recording')try{recorder.stop()}catch{/* ignore */}}
      clearTimer();muteSharedMic();if(urlRef.current)URL.revokeObjectURL(urlRef.current);
    };
  },[clearTimer]);

  useEffect(()=>{
    if(previousEvaluationKeyRef.current===evaluationKey)return;
    previousEvaluationKeyRef.current=evaluationKey;
    reset();
  },[evaluationKey,reset]);

  const acceptBlob=useCallback((blob:Blob)=>{
    clearTimer();muteSharedMic();setIsRecording(false);recorderRef.current=null;
    if(!blob.size){setError('Запись пустая. Проверьте микрофон и попробуйте ещё раз.');return}
    if(blob.size>MAX_CLIENT_AUDIO_BYTES){setError('Запись слишком длинная. Сделайте ответ короче — до 2 минут.');return}
    if(urlRef.current)URL.revokeObjectURL(urlRef.current);
    const u=URL.createObjectURL(blob);urlRef.current=u;setAudioBlob(blob);setAudioUrl(u);setResult(null);setError(null);setDuplicateBlocked(false);resultReportedRef.current=false;onPracticed();
  },[clearTimer,onPracticed]);

  const start=useCallback(async()=>{
    reset();
    try{
      if(!window.isSecureContext)throw new Error('Микрофон работает только на HTTPS-странице.');
      if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new Error('Этот браузер не поддерживает запись. Используйте кнопку загрузки аудио.');
      const stream=await getSharedMicStream();
      if(!stream.getAudioTracks().length)throw new Error('Аудиодорожка не получена. Проверьте разрешение на микрофон.');
      stream.getAudioTracks().forEach(t=>{t.enabled=true});
      chunksRef.current=[];
      const types=isAppleTouchDevice()?['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/ogg']:['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus','audio/ogg'];
      const mime=types.find(t=>MediaRecorder.isTypeSupported(t));
      const recorder=mime?new MediaRecorder(stream,{mimeType:mime,audioBitsPerSecond:48000}):new MediaRecorder(stream,{audioBitsPerSecond:48000});
      recorderRef.current=recorder;
      recorder.ondataavailable=e=>{if(e.data.size)chunksRef.current.push(e.data)};
      recorder.onstart=()=>{
        let seconds=0;
        setElapsed(0);setIsRecording(true);setError(null);
        timerRef.current=setInterval(()=>{
          seconds+=1;setElapsed(seconds);
          if(seconds>=MAX_RECORD_SECONDS&&recorderRef.current===recorder&&recorder.state==='recording')recorder.stop();
        },1000);
      };
      recorder.onerror=()=>{clearTimer();muteSharedMic();setIsRecording(false);setError('Запись прервалась. Попробуйте ещё раз.')};
      recorder.onstop=()=>{if(recorderRef.current!==recorder)return;acceptBlob(new Blob(chunksRef.current,{type:recorder.mimeType||mime||'audio/webm'}))};
      recorder.start();
    }catch(e){clearTimer();muteSharedMic();setIsRecording(false);setError(microphoneErrorMessage(e))}
  },[acceptBlob,clearTimer,reset]);

  const stop=useCallback(()=>{if(recorderRef.current?.state==='recording')recorderRef.current.stop()},[]);
  const handleFile=useCallback((e:ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(f)acceptBlob(new Blob([f],{type:f.type||guessAudioMime(f.name)}));e.target.value=''},[acceptBlob]);

  const check=useCallback(async()=>{
    if(!audioBlob||checking)return;
    const controller=new AbortController();
    checkControllerRef.current?.abort();checkControllerRef.current=controller;
    let timedOut=false;
    setChecking(true);setError(null);setResult(null);
    const timeout=window.setTimeout(()=>{timedOut=true;controller.abort()},70000);
    try{
      const audioBase64=await blobToBase64(audioBlob);
      if(controller.signal.aborted||checkControllerRef.current!==controller)return;
      const headers:Record<string,string>={'Content-Type':'application/json'};
      if(duplicateBlocked)headers['X-Otto-AI-New-Attempt']='1';
      const r=await fetch('/api/check-sprechen',{method:'POST',headers,signal:controller.signal,body:JSON.stringify({...evaluation,audioBase64,mimeType:normalizeAudioMime(audioBlob.type||'audio/webm')})});
      const p=await r.json().catch(()=>null);
      if(controller.signal.aborted||checkControllerRef.current!==controller)return;
      if(r.status===409&&p?.code==='guest_ai_operation_repeated'){
        setDuplicateBlocked(true);
        throw new Error('Запись уже отправлялась. Повторный кредит не списан. Для отдельной новой попытки нажмите «Новая AI-проверка».');
      }
      if(!r.ok)throw new Error(p?.error||`Проверка временно недоступна.`);
      const data=parseEvaluationResult(p);
      setDuplicateBlocked(false);setResult(data);setAiAvailable(true);
      if(!resultReportedRef.current&&Number.isFinite(data.score)){resultReportedRef.current=true;onEvaluated?.(Math.max(0,Math.min(100,data.score)))}
    }catch(e){
      if(controller.signal.aborted&&!timedOut)return;
      if(checkControllerRef.current!==controller)return;
      setError(timedOut?'Проверка заняла слишком много времени. Нажмите «Проверить с Отто» ещё раз.':e instanceof Error?e.message:'Не удалось проверить запись.');
    }finally{
      window.clearTimeout(timeout);
      if(checkControllerRef.current===controller){checkControllerRef.current=null;setChecking(false)}
    }
  },[audioBlob,checking,duplicateBlocked,evaluation,onEvaluated]);

  return <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold text-slate-950">Ответьте вслух</h3><p className="mt-1 text-sm leading-6 text-slate-500">{hint||'Нажмите микрофон, скажите ответ и остановите запись.'}</p></div><div className={cn('shrink-0 rounded-lg px-3 py-2 text-sm font-bold tabular-nums',isRecording?'bg-red-50 text-red-700':'bg-slate-50 text-slate-700')}>{formatTime(elapsed)}</div></div>
    {!audioUrl&&!isRecording&&<div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={start} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 font-bold text-white"><Mic className="h-5 w-5"/>Записать ответ</button><button type="button" onClick={()=>fileRef.current?.click()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-700"><Upload className="h-5 w-5"/>Добавить аудио</button><input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={handleFile}/></div>}
    {isRecording&&<button type="button" onClick={stop} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 font-bold text-white"><Square className="h-5 w-5"/>Остановить запись</button>}
    {audioUrl&&<div className="space-y-3"><audio src={audioUrl} controls className="w-full"/><div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={reset} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 font-bold"><RefreshCw className="h-4 w-4"/>Перезаписать</button><button type="button" onClick={check} disabled={checking||aiAvailable===false} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 font-bold text-white disabled:opacity-40"><Sparkles className="h-4 w-4"/>{checking?'Отто проверяет…':duplicateBlocked?'Новая AI-проверка':'Проверить с Отто'}</button></div></div>}
    {aiAvailable===false&&<p className="mt-3 text-sm text-amber-700">Проверка с Отто временно недоступна, но запись можно прослушать.</p>}
    {duplicateBlocked&&<p className="mt-3 text-sm leading-6 text-amber-800">Новая проверка той же записи — отдельная попытка, которая может списать ещё один гостевой AI-кредит.</p>}
    {error&&<p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {result&&<EvaluationResultCard result={result}/>} 
  </div>;
}

function EvaluationResultCard({result}:{result:EvaluationResult}){
  const label=result.officialLevel==='full'?'Задание выполнено':result.officialLevel==='partial'?'Задание выполнено частично':'Задание не выполнено';
  return <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><span className="flex items-center gap-2 font-black text-teal-900"><CheckCircle2 className="h-5 w-5"/>Проверка с Отто</span><span className={cn('rounded-full px-3 py-1 text-sm font-black',result.officialLevel==='full'?'bg-emerald-100 text-emerald-800':result.officialLevel==='partial'?'bg-amber-100 text-amber-900':'bg-rose-100 text-rose-800')}>{label}</span></div>
    {result.transcript&&<div className="mt-3 rounded-xl bg-white p-3"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Распознанный текст</p><p className="mt-1 text-sm leading-6 text-slate-700">{result.transcript}</p></div>}
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl bg-white p-3"><h4 className="font-black text-emerald-800">Что получилось</h4>{result.strengths?.length?<ul className="mt-2 space-y-1 text-sm leading-5 text-slate-700">{result.strengths.map(item=><li key={item}>• {item}</li>)}</ul>:<p className="mt-2 text-sm text-slate-500">Пока в ответе нет части, которую можно засчитать.</p>}</div>
      <div className="rounded-xl bg-white p-3"><h4 className="font-black text-amber-800">Что нужно потренировать</h4>{result.practice?.length?<ul className="mt-2 space-y-1 text-sm leading-5 text-slate-700">{result.practice.map(item=><li key={item}>• {item}</li>)}</ul>:<p className="mt-2 text-sm text-slate-500">Существенных замечаний по этому ответу нет.</p>}</div>
    </div>
    {result.pronunciationRu&&<div className="mt-3 rounded-xl bg-white p-3"><h4 className="text-sm font-black text-slate-800">Произношение и понятность</h4><p className="mt-1 text-sm leading-5 text-slate-600">{result.pronunciationRu}</p></div>}
    {result.missing?.length?<p className="mt-3 text-xs leading-5 text-slate-600">Не прозвучало: {result.missing.join(' · ')}</p>:null}
    <p className="mt-3 text-[11px] leading-4 text-teal-800">Шкала тренировки повторяет официальную логику Goethe: выполнено и понятно / частично / не выполнено или непонятно. Это учебная оценка, не официальный экзаменационный балл.</p>
  </div>;
}

function parseEvaluationResult(value:unknown):EvaluationResult{
  if(!value||typeof value!=='object')throw new Error('Отто вернул некорректный ответ. Попробуйте ещё раз.');
  const p=value as Partial<EvaluationResult>;
  if(!['full','partial','zero'].includes(String(p.officialLevel)))throw new Error('Отто вернул некорректный результат. Попробуйте ещё раз.');
  if(!Number.isFinite(Number(p.score)))throw new Error('Отто вернул некорректную оценку. Попробуйте ещё раз.');
  return{
    score:Number(p.score),
    officialLevel:p.officialLevel as OfficialLevel,
    transcript:String(p.transcript||''),
    strengths:Array.isArray(p.strengths)?p.strengths.map(String).filter(Boolean).slice(0,4):[],
    practice:Array.isArray(p.practice)?p.practice.map(String).filter(Boolean).slice(0,4):[],
    pronunciationRu:String(p.pronunciationRu||''),
    missing:Array.isArray(p.missing)?p.missing.map(String).filter(Boolean).slice(0,10):[],
  };
}
function formatTime(v:number){return `${Math.floor(v/60)}:${String(v%60).padStart(2,'0')}`}
function blobToBase64(blob:Blob){return new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||'').split(',')[1]||'');r.onerror=()=>reject(r.error);r.readAsDataURL(blob)})}
function normalizeAudioMime(value:string){const mime=String(value||'audio/webm').toLowerCase().split(';')[0].trim();if(mime==='audio/x-m4a')return'audio/mp4';return mime.startsWith('audio/')?mime:'audio/webm'}
function guessAudioMime(name:string){const n=name.toLowerCase();if(n.endsWith('.mp3'))return'audio/mpeg';if(n.endsWith('.m4a'))return'audio/m4a';if(n.endsWith('.mp4'))return'audio/mp4';if(n.endsWith('.wav'))return'audio/wav';if(n.endsWith('.ogg'))return'audio/ogg';return'audio/webm'}
function microphoneErrorMessage(e:unknown){if(e instanceof DOMException){if(e.name==='NotAllowedError'||e.name==='SecurityError')return'Разрешите доступ к микрофону один раз в браузере/Telegram и нажмите запись снова.';if(e.name==='NotFoundError')return'Микрофон не найден.';if(e.name==='NotReadableError')return'Микрофон занят другим приложением.'}return e instanceof Error?e.message:'Не удалось включить микрофон.'}