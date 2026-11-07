import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { readRecording, saveRecording } from './recordings.js';

type Props={userId:string;examId:string;taskId:string;onSaved?:()=>void};
const button='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 font-bold';
/** Same local, unscored recording storage, isolated for every user/exam/task. */
export function Exam30VoiceAnswer({userId,examId,taskId,onSaved}:Props){
 const [recording,setRecording]=useState(false);
 const [url,setUrl]=useState('');
 const [notice,setNotice]=useState('');
 const recorder=useRef<MediaRecorder|null>(null);
 const stream=useRef<MediaStream|null>(null);
 const chunks=useRef<Blob[]>([]);
 const currentBlob=useRef<Blob|null>(null);
 const urlRef=useRef('');
 const alive=useRef(true);
 const assign=(blob:Blob)=>{
  currentBlob.current=blob;
  if(urlRef.current)URL.revokeObjectURL(urlRef.current);
  urlRef.current=URL.createObjectURL(blob);
  if(alive.current)setUrl(urlRef.current);
 };
 useEffect(()=>{
  alive.current=true;
  let cancelled=false;
  void readRecording(userId,taskId,examId).then(blob=>{
   if(blob&&!cancelled&&alive.current)assign(blob);
  }).catch(()=>{if(!cancelled&&alive.current)setNotice('Хранение записи недоступно; используйте скачивание файла.');});
  return ()=>{
   cancelled=true;alive.current=false;
   if(recorder.current?.state==='recording')recorder.current.stop();
   stream.current?.getTracks().forEach(t=>t.stop());
   if(urlRef.current)URL.revokeObjectURL(urlRef.current);
   urlRef.current='';
  };
 },[userId,examId,taskId]);
 const start=async()=>{
  if(recorder.current?.state==='recording')return;
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
   setNotice('Микрофон недоступен в этом браузере.');return;
  }
  try{
   const tracks=await navigator.mediaDevices.getUserMedia({audio:true});
   if(!alive.current){tracks.getTracks().forEach(t=>t.stop());return;}
   const active=new MediaRecorder(tracks);
   stream.current=tracks;recorder.current=active;chunks.current=[];
   active.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data);};
   active.onerror=()=>{if(alive.current)setNotice('Ошибка записи микрофона.');};
   active.onstop=()=>{
    tracks.getTracks().forEach(t=>t.stop());
    stream.current=null;recorder.current=null;
    const blob=new Blob(chunks.current,{type:active.mimeType||'audio/webm'});
    chunks.current=[];
    if(!alive.current)return;
    setRecording(false);
    if(!blob.size){setNotice('Микрофон не создал запись.');return;}
    assign(blob);
    void saveRecording(userId,taskId,blob,examId).then(()=>{
     if(alive.current){setNotice('Запись сохранена на этом устройстве.');onSaved?.();}
    }).catch(()=>{if(alive.current)setNotice('Автоматическое сохранение недоступно. Скачайте запись перед выходом.');});
   };
   active.start();
   setNotice('');setRecording(true);
  }catch{if(alive.current)setNotice('Разрешите доступ к микрофону и попробуйте снова.');}
 };
 const stop=()=>{
  if(recorder.current?.state==='recording')recorder.current.stop();
  stream.current?.getTracks().forEach(t=>t.stop());
 };
 const download=()=>{
  if(!currentBlob.current)return;
  const ext=currentBlob.current.type.includes('ogg')?'ogg':currentBlob.current.type.includes('mp4')?'m4a':currentBlob.current.type.includes('wav')?'wav':'webm';
  const href=URL.createObjectURL(currentBlob.current);
  const a=document.createElement('a');a.href=href;a.download=`OTTO_${examId}_${taskId}.${ext}`;document.body.append(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(href),1500);
 };
 const restore=async(file?:File)=>{
  if(!file)return;
  if(!file.size||file.size>20_000_000||!(/^(audio\/|video\/)/.test(file.type)||/\.(webm|ogg|mp4|m4a|wav)$/i.test(file.name))){
   setNotice('Выберите аудиофайл размером до 20 МБ.');return;
  }
  assign(file);
  try{await saveRecording(userId,taskId,file,examId);if(alive.current){setNotice('Запись загружена и сохранена.');onSaved?.();}}
  catch{if(alive.current)setNotice('Запись загружена временно; храните исходный файл.');}
 };
 return <div className="mt-3 rounded-xl border bg-white p-3">
  <div className="flex flex-wrap items-center gap-2">
   {!recording?<button type="button" onClick={()=>void start()} className={button+' bg-rose-600 text-white'}><Mic className="h-4 w-4"/>Записать ответ</button>
   :<button type="button" onClick={stop} className={button+' bg-slate-900 text-white'}><Square className="h-4 w-4"/>Остановить</button>}
   {url&&<button type="button" onClick={download} className={button+' border border-slate-300 bg-white text-slate-900'}>Скачать запись</button>}
  </div>
  {url&&<audio src={url} controls className="mt-3 w-full" aria-label="Прослушать свой ответ"/>}
  <details className="mt-3 text-sm text-slate-600"><summary className="cursor-pointer font-semibold">Восстановить запись из файла</summary>
   <input type="file" accept="audio/*,.webm,.ogg,.m4a,.wav" className="mt-2 block max-w-full text-sm" onChange={e=>void restore(e.target.files?.[0])}/>
  </details>
  {notice&&<p role="status" className="mt-2 text-sm text-slate-600">{notice}</p>}
  <p className="mt-2 text-xs text-slate-400">Запись хранится локально; автоматическая оценка не выполняется.</p>
 </div>;
}
