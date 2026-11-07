import { useEffect, useRef, useState } from 'react';

type AudioAsset = { src:string; object:boolean };
let indexPromise:Promise<Record<string,number>>|null=null;
const packCache=new Map<number,Promise<Array<{name:string;b64:string}>>>();

function audioIndex():Promise<Record<string,number>> {
 if(!indexPromise) {
  indexPromise=fetch('/b1/audio-index.json').then(r=>{
   if(!r.ok)throw new Error('Audio index HTTP '+r.status);
   return r.json() as Promise<Record<string,number>>;
  }).catch(err=>{indexPromise=null;throw err;});
 }
 return indexPromise;
}

async function resolveAudio(id:string):Promise<AudioAsset> {
 const index=await audioIndex();
 const pack=index[id];
 if(!Number.isInteger(pack))throw new Error('Запись не найдена: '+id);
 if(pack===0)return {src:'/b1/audio/'+encodeURIComponent(id)+'.mp3',object:false};
 let promise=packCache.get(pack);
 if(!promise){
  promise=fetch('/b1/audio-packs/bundle-'+String(pack).padStart(3,'0')+'.jsonl')
   .then(async response=>{
    if(!response.ok)throw new Error('Аудиопакет HTTP '+response.status);
    return (await response.text()).split('\n').filter(Boolean).map(line=>JSON.parse(line) as {name:string;b64:string});
   }).catch(err=>{packCache.delete(pack);throw err;});
  packCache.set(pack,promise);
 }
 const row=(await promise).find(x=>x.name===id+'.mp3');
 if(!row)throw new Error('Запись отсутствует в пакете: '+id);
 const raw=atob(row.b64);
 const bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 return {src:URL.createObjectURL(new Blob([bytes],{type:'audio/mpeg'})),object:true};
}

/** Source audio is resolved automatically when the task appears. There is no
 * manual "prepare audio" action: the learner only presses Play, as in OTTO A1.
 */
export function AudioClip({id}:{id:string}){
 const [src,setSrc]=useState('');
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [retry,setRetry]=useState(0);
 const player=useRef<HTMLAudioElement>(null);
 useEffect(()=>{
  let alive=true;
  let objectUrl:string|null=null;
  setSrc('');setError('');setLoading(true);
  void resolveAudio(id).then(asset=>{
   if(!alive){if(asset.object)URL.revokeObjectURL(asset.src);return;}
   if(asset.object)objectUrl=asset.src;
   setSrc(asset.src);
  }).catch(e=>{if(alive)setError(e instanceof Error?e.message:'Не удалось открыть аудио');})
   .finally(()=>{if(alive)setLoading(false);});
  return ()=>{
   alive=false;player.current?.pause();
   if(objectUrl)URL.revokeObjectURL(objectUrl);
  };
 },[id,retry]);
 return <div className="b1-inline-audio">
  <div className="b1-audio-heading"><span>Слушайте запись</span><span>Нажмите Play</span></div>
  <audio ref={player} controls preload="metadata" src={src||undefined} aria-label={'Аудиозапись '+id} onError={()=>{
    // The browser may emit a transient error while the source changes.
    if(src)setError('Браузер не смог воспроизвести аудио.');
  }}/>
  {loading&&<p role="status" className="b1-audio-status">Подключаем запись автоматически…</p>}
  {error&&<div role="alert" className="b1-audio-status b1-audio-error"><span>{error}</span><button type="button" onClick={()=>setRetry(n=>n+1)}>Повторить</button></div>}
 </div>;
}
