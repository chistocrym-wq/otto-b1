import { useEffect, useMemo, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { CompactTranslationEye } from '@/components/common/CompactTranslationEye';
import { HoverTranslateText } from '@/components/common/HoverTranslateText';

export function speakLearningGerman(text:string){
  const clean=text.replace(/\s+/g,' ').trim();
  if(!clean||/[А-Яа-яЁё]/.test(clean))return;
  const api=(window as Window&{OttoSpeech?:{play?:(value:string,options?:{mode?:'normal'|'slow'})=>Promise<boolean>}}).OttoSpeech;
  if(api?.play)void api.play(clean,{mode:'normal'});
}

function cacheKey(text:string){
  let h=2166136261;
  for(const ch of text){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
  return 'otto-learning-translation-v1:'+(h>>>0).toString(16);
}

export function VisibleRussianTranslation({text,preset,className=''}:{text:string;preset?:string;className?:string}){
  const key=useMemo(()=>cacheKey(text),[text]);
  const[translation,setTranslation]=useState(()=>{
    if(preset)return preset;
    try{return sessionStorage.getItem(key)||''}catch{return''}
  });
  const[loading,setLoading]=useState(!preset&&!translation);
  const[error,setError]=useState('');

  useEffect(()=>{
    if(preset){setTranslation(preset);setLoading(false);setError('');return}
    try{
      const cached=sessionStorage.getItem(key);
      if(cached){setTranslation(cached);setLoading(false);setError('');return}
    }catch{}
    const controller=new AbortController();
    setLoading(true);
    setError('');
    fetch('/api/translate-task',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({parts:[text]}),
      signal:controller.signal,
    }).then(async response=>{
      const payload=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(payload?.error||'Перевод временно недоступен.');
      const value=Array.isArray(payload.translations)?String(payload.translations[0]||'').trim():'';
      if(!value)throw new Error('Перевод временно недоступен.');
      setTranslation(value);
      try{sessionStorage.setItem(key,value)}catch{}
    }).catch(error=>{
      if(controller.signal.aborted)return;
      setError(error instanceof Error?error.message:'Перевод временно недоступен.');
    }).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
    return()=>controller.abort();
  },[key,preset,text]);

  return <div className={'rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm leading-6 text-slate-700 '+className}>
    <span className="mr-2 text-xs font-black uppercase tracking-wider text-sky-700">🇷🇺 Перевод</span>
    {loading?<span className="text-slate-500">загружается…</span>:error?<span className="text-rose-700">{error}</span>:<span>{translation}</span>}
  </div>;
}

export function LearningGermanLine({
  text,
  translation,
  showTranslation=false,
  className='',
  audio=true,
}:{
  text:string;
  translation?:string;
  showTranslation?:boolean;
  className?:string;
  audio?:boolean;
}){
  return <div>
    <div className="flex items-start gap-2">
      <div className={'min-w-0 flex-1 '+className}><HoverTranslateText text={text}/></div>
      {audio&&<button type="button" onClick={()=>speakLearningGerman(text)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-teal-200 bg-white text-teal-800" aria-label={'Прослушать '+text}><Volume2 className="h-4 w-4"/></button>}
      {!showTranslation&&<CompactTranslationEye parts={[text]} title="Перевод"/>}
    </div>
    {showTranslation&&<VisibleRussianTranslation text={text} preset={translation} className="mt-2"/>}
  </div>;
}

export function LearningWord({de,ru}:{de:string;ru?:string}){
  return <div className="rounded-xl border border-slate-200 bg-white p-3">
    <div className="flex items-center gap-2"><b className="min-w-0 flex-1 text-slate-950">{de}</b><button type="button" onClick={()=>speakLearningGerman(de)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-teal-200 text-teal-800" aria-label={'Прослушать '+de}><Volume2 className="h-3.5 w-3.5"/></button></div>
    {ru?<p className="mt-1 text-sm text-slate-600">{ru}</p>:<VisibleRussianTranslation text={de} className="mt-2"/>}
  </div>;
}

export function TranslationButton({parts,title='Показать перевод'}:{parts:string[];title?:string}){
  return <div className="inline-flex items-center gap-2"><span className="text-sm font-bold text-slate-600">{title}</span><CompactTranslationEye parts={parts} title="Перевод"/></div>;
}
