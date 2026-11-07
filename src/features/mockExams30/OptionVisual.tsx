import React from 'react';
import type { ListeningOptionVisual } from './schema.js';

/** Render only archive-defined symbols; never request candidate photographs. */
export function OptionVisual({visual}:{visual?:ListeningOptionVisual}) {
  if(!visual)return null;
  if(visual.kind==='clock'){
    const h=(visual.hour%12+visual.minute/60)*30;
    const m=visual.minute*6;
    return <svg viewBox="0 0 48 48" width="54" height="54" focusable="false" aria-hidden="true" style={{flexShrink:0,display:'block'}}>
      <circle cx="24" cy="24" r="21" fill="#ffffff" stroke="#334155" strokeWidth="2"/>
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i=><line key={i} x1="24" y1="5" x2="24" y2="8" transform={`rotate(${i*30} 24 24)`} stroke="#475569" strokeWidth="1.4" />)}
      <line x1="24" y1="24" x2="24" y2="12" transform={`rotate(${h} 24 24)`} stroke="#0f172a" strokeLinecap="round" strokeWidth="3" />
      <line x1="24" y1="24" x2="24" y2="9" transform={`rotate(${m} 24 24)`} stroke="#0d9488" strokeLinecap="round" strokeWidth="2" />
      <circle cx="24" cy="24" r="2.3" fill="#0f172a" />
    </svg>;
  }
  if(visual.kind==='icon')return <span aria-hidden="true" style={{fontSize:30,lineHeight:'38px',flexShrink:0}}>{visual.icon}</span>;
  if(visual.kind==='price')return <span aria-hidden="true" style={{fontWeight:900,fontSize:23,color:'#0f766e'}}>{visual.icon||'€'}</span>;
  if(visual.kind==='day'||visual.kind==='route'||visual.kind==='floor'||visual.kind==='platform'){
    return <span aria-hidden="true" style={{minWidth:48,minHeight:44,display:'inline-flex',alignItems:'center',justifyContent:'center',border:'2px solid #0f766e',borderRadius:12,color:'#115e59',background:'#f0fdfa',fontSize:19,fontWeight:900,flexShrink:0}}>{visual.short}</span>;
  }
  if(visual.kind==='photo-candidate')return <span role="note" aria-label="Фотография ответа ожидает утверждения" className="inline-flex min-h-12 min-w-14 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 px-2 text-center text-[10px] font-semibold text-amber-800">Фото<br/>нет</span>;
  return null;
}
