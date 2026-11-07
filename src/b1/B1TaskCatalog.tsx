import { ArrowLeft, ArrowRight, CheckCircle2, CircleX, ChevronRight, Clock3, Headphones, BookOpen, PenLine, MessageCircleMore, Play } from 'lucide-react';
import { B1_PARTS, type B1Subject, type B1Teil } from './content';
import { getB1ContinueIndex,getB1SectionProgress,readB1TaskStatus } from './taskProgress';

const DISPLAY:Record<B1Subject,string>={horen:'Hören',lesen:'Lesen',schreiben:'Schreiben',sprechen:'Sprechen'};
const ICONS={horen:Headphones,lesen:BookOpen,schreiben:PenLine,sprechen:MessageCircleMore};
function statusLabel(status:ReturnType<typeof readB1TaskStatus>){
 if(status.state==='correct')return 'Правильно';
 if(status.state==='incorrect')return 'Есть ошибки';
 if(status.state==='reviewed')return 'Проверено';
 if(status.state==='progress')return 'В процессе';
 return 'Ещё не выполнялось';
}
function statusIcon(status:ReturnType<typeof readB1TaskStatus>){
 return status.state==='correct'?CheckCircle2:status.state==='incorrect'?CircleX:status.state==='progress'?Clock3:ChevronRight;
}
interface Props {
 subject:B1Subject;teil:number;part:B1Teil|null;loading:boolean;revision:number;onBack:()=>void;
 onSelectTeil:(teil:number)=>void;onSelectSet:(set:number)=>void;
}
export function B1TaskCatalog({subject,teil,part,loading,revision,onBack,onSelectTeil,onSelectSet}:Props){
 const stats=getB1SectionProgress(subject,teil);
 const continueIndex=getB1ContinueIndex(subject,teil);
 const visible=part?.sets||[];
 const Icon=ICONS[subject];
 return <div className="b1-task-catalog" data-testid="b1-task-catalog" data-revision={revision}>
  <button type="button" className="b1-back" onClick={onBack}><ArrowLeft size={18}/> На главную</button>
  <div className="b1-page-heading"><span className="b1-kicker">OTTO B1 · ЗАДАНИЯ</span><h1><Icon size={27}/> {DISPLAY[subject]}</h1><p>Выберите Teil, затем продолжайте с сохранённого задания или откройте любое из списка.</p></div>
  <nav className="b1-catalog-teils" aria-label="Части модуля">{Array.from({length:B1_PARTS[subject]},(_,i)=>i+1).map(n=>{
   const nStats=getB1SectionProgress(subject,n);
   return <button key={n} type="button" aria-pressed={teil===n} className={'b1-catalog-teil'+(teil===n?' is-active':'')} onClick={()=>onSelectTeil(n)}>
    <strong>Teil {n}</strong><span>{nStats.completed} из 30 выполнено</span>
   </button>;
  })}</nav>
  <section className="b1-panel b1-catalog-section">
   <div className="b1-catalog-summary"><div><span className="b1-kicker">ПРОГРЕСС</span><h2>Задания Teil {teil}</h2>
    <p>{stats.completed} из 30 выполнено{stats.started?' · '+stats.started+' в процессе':''}</p></div><span className="b1-catalog-count">{stats.completed}/30</span></div>
   <div className="b1-progress-track"><span style={{width:stats.completed/30*100+'%'}}/></div>
   <button type="button" className="b1-primary b1-catalog-continue" disabled={loading||!part} onClick={()=>onSelectSet(continueIndex)}>
    <Play size={17}/> {stats.completed===30?'Повторить задание №1':readB1TaskStatus(subject,teil,continueIndex).state==='progress'?'Продолжить задание №'+continueIndex:'Начать задание №'+continueIndex} <ArrowRight size={17}/>
   </button>
   {loading?<p role="status" className="b1-catalog-loading">Загружаем список заданий…</p>:<div className="b1-catalog-list">
    {visible.map(s=>{
     const status=readB1TaskStatus(subject,teil,s.number);
     const StatusIcon=statusIcon(status);
     return <button type="button" className={'b1-catalog-item is-'+status.state} key={s.number} data-testid={'otto-task-'+s.number} onClick={()=>onSelectSet(s.number)}>
      <span className="b1-catalog-statusicon"><StatusIcon size={22}/></span>
      <span className="b1-catalog-text"><strong>Задание №{s.number} <span>{s.title.replace(/^Задание\s+\d+\s*[·:]?\s*/i,'')}</span></strong>
       <small>{statusLabel(status)}{status.total!==null?' · '+status.score+'/'+status.total:''}</small></span>
      <ChevronRight size={18} className="b1-catalog-arrow"/>
     </button>;
    })}
   </div>}
  </section>
 </div>;
}
