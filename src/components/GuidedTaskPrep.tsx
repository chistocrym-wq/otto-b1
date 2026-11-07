import { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { HoverTranslateText } from '@/components/common/HoverTranslateText';
import { getStoredLearningMode } from '@/hooks/useUserProfile';

interface Props {
  focus: string;
  tip: string;
  defaultCollapsed?: boolean;
  forceVisible?: boolean;
}

const PHRASE_UNITS=[
  'Sie möchten','Möchten Sie','Ich möchte','Wir möchten','Können Sie','Es gibt','Wie lange','Wie viel','Wie spät','Ab wann','Bis wann','Woher kommen','Mit freundlichen Grüßen','Vielen Dank','Ich hätte gern',
];
const IMPORTANT=new Set(['nicht','kein','keine','leider','aber','wann','wo','wohin','woher','warum','preis','uhr','datum','zeit','kosten','kostet','beginnt','termin','geöffnet','geschlossen','nur','ab','bis','richtig','falsch']);
const STOP=new Set(['der','die','das','den','dem','des','ein','eine','einen','einem','einer','und','oder','ist','sind','war','waren','hat','haben','mit','für','von','aus','bei','nach','vor','zu','im','in','am','um','auf','an','als','auch','bitte','aufgabe','aufgaben','text','texte','teil','lesen','hören','kreuzen','antwort','antworten']);

function normalize(value:string){return value.toLocaleLowerCase('de-DE')}
function words(value:string){return value.match(/\p{L}+(?:-\p{L}+)*/gu)||[]}

function pickUnits(focus:string){
  const lower=normalize(focus);
  const units:string[]=[];
  const covered=new Set<string>();
  for(const phrase of PHRASE_UNITS){
    const phraseLower=normalize(phrase);
    if(lower.includes(phraseLower)){
      units.push(phrase);
      words(phraseLower).forEach(word=>covered.add(word));
    }
    if(units.length>=3)break;
  }
  const sourceWords=words(focus);
  const unique=sourceWords.filter((word,index,array)=>array.findIndex(item=>normalize(item)===normalize(word))===index);
  const prioritized=[...unique.filter(word=>IMPORTANT.has(normalize(word))),...unique.filter(word=>!IMPORTANT.has(normalize(word)))];
  for(const word of prioritized){
    const key=normalize(word);
    if(units.length>=6)break;
    if(covered.has(key)||STOP.has(key)||key.length<3||/^\d+$/u.test(key))continue;
    units.push(word);
    covered.add(key);
  }
  return units.slice(0,6);
}

export function GuidedTaskPrep({ focus, tip, defaultCollapsed=false, forceVisible=false }: Props) {
  const [collapsed,setCollapsed]=useState(defaultCollapsed);
  if ((!forceVisible && getStoredLearningMode() !== 'guided') || !focus.trim()) return null;
  const units=pickUnits(focus);

  return (
    <aside className="mb-4 rounded-2xl border border-teal-100 bg-teal-50/70 p-4" aria-label="Подготовка перед заданием">
      <div className="flex items-center justify-between gap-3 text-teal-800">
        <div className="flex min-w-0 items-center gap-2"><Sparkles className="h-4 w-4 shrink-0" /><b className="text-sm">Перед заданием</b></div>
        <button type="button" onClick={()=>setCollapsed(value=>!value)} aria-expanded={!collapsed} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-bold text-teal-800 hover:bg-white/70">
          {collapsed?'Показать':'Свернуть'} {collapsed?<ChevronDown className="h-4 w-4"/>:<ChevronUp className="h-4 w-4"/>}
        </button>
      </div>
      {!collapsed&&<>
        <p className="mt-2 text-xs leading-5 text-slate-600">Разберите ключевую фразу. Нажмите на немецкие слова: Отто покажет значение в контексте и произнесёт выбранную конструкцию.</p>
        <div className="mt-3 rounded-xl bg-white px-3 py-2.5 text-sm font-bold leading-6 text-slate-900"><HoverTranslateText text={focus} /></div>
        {units.length>0&&<div className="mt-3">
          <p className="text-[11px] font-black uppercase tracking-wider text-teal-800">Нужно именно для этого задания</p>
          <div className="mt-2 flex flex-wrap gap-2">{units.map(unit=><span key={unit} className="rounded-xl border border-teal-100 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800"><HoverTranslateText text={unit}/></span>)}</div>
          <p className="mt-2 text-[11px] leading-4 text-slate-500">Только ключевые слова и конструкции — без правильного ответа и без полного словаря текста.</p>
        </div>}
        <p className="mt-2 text-xs font-semibold leading-5 text-teal-900">{tip}</p>
      </>}
    </aside>
  );
}
