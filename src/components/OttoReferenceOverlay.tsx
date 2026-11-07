import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, Bookmark, X } from 'lucide-react';
import { OttoReferenceContent, OttoSmartCardsView, type OttoReferenceContentSection } from '@/preview/OttoReferenceOnboarding';

export type OttoReferenceSection =
  | 'reference_home'
  | 'numberListening'
  | 'written_exam'
  | 'oral_exam'
  | 'pronouns'
  | 'verbs'
  | 'conjugation'
  | 'nouns'
  | 'prepositions'
  | 'questions'
  | 'written_schreiben_1'
  | 'written_schreiben_2'
  | 'written_templates_intro'
  | 'written_greeting'
  | 'written_main_body'
  | 'written_farewell'
  | 'written_result_letter'
  | 'oral_teil1'
  | 'oral_questions'
  | 'oral_requests';

interface OverlayProps {
  open:boolean;
  initialSection?:OttoReferenceSection;
  returnState?:string;
  initialView?:'reference'|'smartcards';
  onClose:()=>void;
}

interface FloatingButtonsProps { onReference:()=>void;onSmartCards:()=>void }

export function FloatingOttoReferenceButtons({onReference,onSmartCards}:FloatingButtonsProps){
  void onReference;
  const cls="grid h-14 w-14 place-items-center rounded-full border border-teal-200 bg-white/95 text-teal-800 shadow-[0_10px_30px_rgba(15,118,110,.20)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-200";
  return <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+22px)] left-[max(12px,env(safe-area-inset-left,0px))] z-[88] flex flex-col items-start gap-2" aria-label="Быстрый доступ OTTO">
    <button type="button" onClick={onSmartCards} className={cls} aria-label="Открыть Мои умные карточки" title="Умные карточки"><Bookmark className="h-6 w-6"/></button>
  </div>;
}

function resolveTarget(target:OttoReferenceSection):{section:OttoReferenceContentSection;examSectionId?:string}{
  if(target==='numberListening')return{section:'numberListening'};
  if(target==='written_exam')return{section:'written'};
  if(target==='oral_exam')return{section:'oral'};
  if(target==='oral_teil1')return{section:'oral',examSectionId:'oral_teil1'};
  if(target==='oral_questions')return{section:'oral',examSectionId:'oral_questions'};
  if(target==='oral_requests')return{section:'oral',examSectionId:'oral_requests'};
  if(target==='written_schreiben_1')return{section:'written',examSectionId:'written_schreiben_1'};
  if(target==='written_schreiben_2')return{section:'written',examSectionId:'written_schreiben_2'};
  if(target==='written_templates_intro')return{section:'written',examSectionId:'written_templates_intro'};
  if(target==='written_greeting')return{section:'written',examSectionId:'written_greeting'};
  if(target==='written_main_body')return{section:'written',examSectionId:'written_main_body'};
  if(target==='written_farewell')return{section:'written',examSectionId:'written_farewell'};
  if(target==='written_result_letter')return{section:'written',examSectionId:'written_result_letter'};
  if(target==='pronouns')return{section:'pronouns'};
  if(target==='verbs'||target==='conjugation')return{section:'verbs'};
  if(target==='nouns')return{section:'nouns'};
  if(target==='prepositions')return{section:'prepositions'};
  if(target==='questions')return{section:'questions'};
  return{section:'home'};
}

function HeaderButton({children,onClick}:{children:ReactNode;onClick:()=>void}){
  return <button type="button" onClick={onClick} className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl border bg-white px-3 text-sm font-bold">{children}</button>
}

export function OttoReferenceOverlay({open,initialSection='reference_home',initialView='reference',returnState,onClose}:OverlayProps){
  const[target,setTarget]=useState<{section:OttoReferenceContentSection;examSectionId?:string}>(()=>resolveTarget(initialSection));
  const[view,setView]=useState<'reference'|'smartcards'>(initialView);
  useEffect(()=>{if(open){setTarget(resolveTarget(initialSection));setView(initialView)}},[open,initialSection,initialView]);
  useEffect(()=>{
    if(!open)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow=previous};
  },[open]);

  if(!open)return null;

  const openReferenceHome=()=>{setTarget({section:'home'});setView('reference')};
  const openFromCards=(section:OttoReferenceContentSection,examSectionId?:string)=>{setTarget({section,examSectionId});setView('reference')};

  return <div className="otto-reference-overlay fixed inset-0 z-[140] bg-slate-100/98 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={view==='smartcards'?'Мои умные карточки':'Справочник OTTO'}>
    <div className="mx-auto flex h-full w-full max-w-[1180px] flex-col">
      <header className={"otto-reference-overlay-header sticky top-0 z-10 flex items-center gap-2 border-b bg-white/95 px-3 py-2 shadow-sm backdrop-blur sm:px-6 "+(view==='smartcards'?'justify-end':'justify-between')}>
        {view!=='smartcards'&&<HeaderButton onClick={onClose}><ArrowLeft className="h-4 w-4"/>К заданию</HeaderButton>}
        <div className={view==='smartcards'?'ml-auto flex items-center gap-2':'flex items-center gap-2'}>
          {view!=='smartcards'&&<button type="button" onClick={()=>setView('smartcards')} className="grid h-11 w-11 place-items-center rounded-xl border border-teal-200 bg-teal-50 text-teal-900" aria-label="Мои умные карточки" title="Мои умные карточки"><Bookmark className="h-5 w-5"/></button>}
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl border bg-white" aria-label="Закрыть"><X className="h-5 w-5"/></button>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom,0px)+28px)] pt-2 sm:px-6">
        <div className="mx-auto max-w-5xl">
          {returnState&&<p className="sr-only" data-reference-return-state={returnState}>Точка возврата: {returnState}</p>}
          {view==='smartcards'?<OttoSmartCardsView onOpenReference={openFromCards}/>:<OttoReferenceContent key={target.section+':'+(target.examSectionId||'')} initialSection={target.section} initialExamSectionId={target.examSectionId}/>}
        </div>
      </main>
    </div>
  </div>;
}
