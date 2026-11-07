import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Volume2 } from 'lucide-react';
import { CompactTranslationEye } from '@/components/common/CompactTranslationEye';
import { HoverTranslateText } from '@/components/common/HoverTranslateText';
import { OttoScene, type OttoSceneName } from '@/components/OttoScene';

const memory=new Map<string,string>();
const STORAGE_PREFIX='otto-learning-inline-translation-v1:';

function keyFor(text:string){
  let h=2166136261;
  for(const ch of text){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
  return STORAGE_PREFIX+(h>>>0).toString(16);
}
function readCache(key:string){
  const hit=memory.get(key);if(hit)return hit;
  try{const value=sessionStorage.getItem(key)||localStorage.getItem(key);if(value){memory.set(key,value);return value}}catch{}
  return'';
}
function writeCache(key:string,value:string){
  if(!value)return;memory.set(key,value);
  try{sessionStorage.setItem(key,value)}catch{}
}

export function speakLearningGerman(text:string){
  const clean=text.replace(/\s+/g,' ').trim();if(!clean||/[А-Яа-яЁё]/.test(clean))return;
  const api=(window as Window&{OttoSpeech?:{play?:(value:string,options?:{mode?:'normal'|'slow'})=>Promise<boolean>}}).OttoSpeech;
  if(api?.play)void api.play(clean,{mode:'normal'});
}

export function InlineTranslation({text,className='',prefix=''}:{text:string;className?:string;prefix?:string}){
  const clean=text.trim();
  const key=useMemo(()=>keyFor(clean),[clean]);
  const[translation,setTranslation]=useState(()=>readCache(key));
  const[loading,setLoading]=useState(!translation&&Boolean(clean));
  const[error,setError]=useState('');
  useEffect(()=>{
    let live=true;
    const cached=readCache(key);
    if(cached){setTranslation(cached);setLoading(false);return()=>{live=false}}
    if(!clean){setLoading(false);return()=>{live=false}}
    const controller=new AbortController();
    setLoading(true);setError('');
    fetch('/api/translate-task',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({parts:[clean]}),signal:controller.signal})
      .then(async r=>{const p=await r.json().catch(()=>({}));if(!r.ok)throw new Error(p?.error||'Не удалось загрузить перевод.');const value=Array.isArray(p.translations)?String(p.translations[0]||'').trim():'';if(!value)throw new Error('Перевод не получен.');if(live){writeCache(key,value);setTranslation(value)}})
      .catch(e=>{if(live&&!controller.signal.aborted)setError(e instanceof Error?e.message:'Не удалось загрузить перевод.')})
      .finally(()=>{if(live&&!controller.signal.aborted)setLoading(false)});
    return()=>{live=false;controller.abort()};
  },[clean,key]);
  return <div className={className}>
    {prefix&&<span className="mr-1 font-black text-slate-500">{prefix}</span>}
    {translation&&<span className="text-slate-600">{translation}</span>}
    {loading&&!translation&&<span className="text-sm text-slate-400">Перевожу…</span>}
    {error&&!translation&&<span className="text-sm text-rose-600">{error}</span>}
  </div>;
}

export function GermanTeachingText({
  text,
  immediateTranslation=true,
  className='',
  translationClassName='mt-1 text-sm leading-6',
  audio=true,
}:{
  text:string;
  immediateTranslation?:boolean;
  className?:string;
  translationClassName?:string;
  audio?:boolean;
}){
  return <div className="min-w-0">
    <div className="flex items-start gap-2">
      <div className={'min-w-0 flex-1 '+className}><HoverTranslateText text={text}/></div>
      {audio&&<button type="button" onClick={()=>speakLearningGerman(text)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-teal-200 bg-white text-teal-800" aria-label={'Прослушать '+text}><Volume2 className="h-4 w-4"/></button>}
      {!immediateTranslation&&<CompactTranslationEye parts={[text]} title="Перевод"/>}
    </div>
    {immediateTranslation&&<InlineTranslation text={text} className={translationClassName}/>}
  </div>;
}

export function TranslationButton({parts,title='Перевод',label='Показать перевод'}:{parts:string[];title?:string;label?:string}){
  return <div className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white pl-3 pr-1 text-sm font-bold text-slate-700">
    <span>{label}</span>
    <CompactTranslationEye parts={parts} title={title}/>
  </div>;
}


export function OttoTeachingBubble({
  children,
  scene='guide',
  className='',
}:{
  children:ReactNode;
  scene?:OttoSceneName;
  className?:string;
}){
  return <div className={'flex items-start gap-3 '+className}>
    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-teal-200 bg-teal-50">
      <OttoScene scene={scene} eager className="h-full w-full object-contain"/>
    </div>
    <div className="min-w-0 flex-1 rounded-[22px] border border-teal-200 bg-teal-50 p-4 text-slate-800">
      <p className="text-xs font-black uppercase tracking-[.12em] text-teal-700">OTTO</p>
      <div className="mt-2 text-[15px] leading-7">{children}</div>
    </div>
  </div>;
}
