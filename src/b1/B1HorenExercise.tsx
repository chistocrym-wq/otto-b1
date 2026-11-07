import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, Headphones, Languages, RotateCcw } from 'lucide-react';
import { AudioClip } from './B1AudioClip';
import type { B1Set } from './content';

type Choice={value:string;label:string;translation?:string};
type Question={id:string;prompt:string;translation:string;options:Choice[];explanation:string[];example:boolean};
type Segment={id:string;description:string;questions:Question[];transcriptDe:string[];transcriptRu:string[];introDe:string[];introRu:string[]};
const questionStart=/^Aufgabe\s+(\d+[a-z]?)\b/i;
const audioStart=/^AUDIO DE\s*[·:]\s*([A-Z]\d-\d{3}-(?:E|T)\d{2})/i;
const isRussian=(line:string)=>/[А-Яа-яЁё]/.test(line);
const isSolution=(line:string)=>/^(?:Lösung|LÖSUNG|Begründung|Erklärung|Объяснение|Ключ|Ответ:|Musterlösung)/i.test(line);
function removeInlineKey(text:string){return text.replace(/\s*\((?:Richtig|Falsch|Ja|Nein|[a-j])\)\s*$/i,'');}
function labelsFromGroup(lines:string[]):Choice[]{
 const line=lines.find(s=>/^WER SPRICHT\?/i.test(s))||'';
 const found=[...line.matchAll(/\b([abc])\s*[—-]\s*(.+?)(?=\s+[abc]\s*[—-]|$)/g)]
   .map(m=>({value:m[1],label:m[1]+'. '+m[2].trim()}));
 return found.length===3?found:[{value:'a',label:'a'},{value:'b',label:'b'},{value:'c',label:'c'}];
}
function parseQuestion(id:string,lines:string[],key:Record<string,string>,speakers:Choice[]):Question{
 const example=!Object.prototype.hasOwnProperty.call(key,id);
 const explanation=lines.filter(isSolution);
 const statements=lines.filter(l=>!isSolution(l)&&!/^☐|^Richtig\s*\/|^Ja\s*\/|^a\)|^b\)|^c\)/i.test(l) &&
  !/^(?:RU\s*[·:]|Перевод|Aufgabe|Beispiel ohne|Верно\s*\/)/i.test(l));
 const prompt=removeInlineKey(statements.find(l=>!isRussian(l))||'Aufgabe '+id);
 const translation=statements.find(l=>isRussian(l))||lines.find(l=>/^(?:Перевод:|Перевод примера:)/i.test(l))||'';
 const choices:Choice[]=[];
 for(let i=0;i<lines.length;i++){
  const m=lines[i].match(/^([a-j])\)\s*(.+)$/i);
  if(m)choices.push({value:m[1].toLowerCase(),label:m[1]+') '+m[2],translation:lines[i+1]&&isRussian(lines[i+1])?lines[i+1]:undefined});
 }
 const speakerLine=lines.find(l=>/☐\s*a\s*[—-]/i.test(l));
 if(!choices.length&&speakerLine){
  for(const match of speakerLine.matchAll(/☐\s*([abc])\s*[—-]\s*([^☐]+)/gi)){
   choices.push({value:match[1].toLowerCase(),label:match[1]+'. '+match[2].trim()});
  }
 }
 if(!choices.length&&(lines.some(l=>/Richtig\s*(?:\/|☐)\s*Falsch|☐\s*Richtig|Richtig oder Falsch/i.test(l))||['richtig','falsch'].includes(key[id]))) {
  choices.push({value:'richtig',label:'Richtig — Верно'},{value:'falsch',label:'Falsch — Неверно'});
 }
 if(!choices.length&&['ja','nein'].includes(key[id]))choices.push({value:'ja',label:'Ja'},{value:'nein',label:'Nein'});
 if(!choices.length&&speakers.length===3)choices.push(...speakers);
 if(!choices.length&&key[id]&&/^[a-c]$/.test(key[id]))choices.push(...['a','b','c'].map(v=>({value:v,label:v+'.'})));
 if(example&&!choices.length)choices.push(...['a','b','c'].map(v=>({value:v,label:v+'.'})));
 return {id,prompt,translation,options:choices,explanation,example};
}
export function parseHorenGroups(data:B1Set):Segment[]{
 const groups:Segment[]=[];
 let current:Segment|null=null;
 let questionId='';
 let questionLines:string[]=[];
 let inTranscript=false;
 let inRussianTranscript=false;
 const speakers=labelsFromGroup(data.lines);
 function finishQuestion(){
  if(!current||!questionId)return;
  const q=parseQuestion(questionId,questionLines,data.answerKey||{},speakers);
  current.questions.push(q);
  questionId='';questionLines=[];
 }
 function finishSegment(){finishQuestion();if(current)groups.push(current);current=null;}
 for(const raw of data.lines){
  const line=raw.trim();
  if(!line)continue;
  const audio=line.match(audioStart);
  if(audio){
   finishSegment();
   current={id:audio[1],description:line.split('|')[1]?.trim()||'Аудиозапись',questions:[],transcriptDe:[],transcriptRu:[],introDe:[],introRu:[]};
   inTranscript=true;inRussianTranscript=false;continue;
  }
  if(!current)continue;
  const match=line.match(questionStart);
  if(match){
   finishQuestion();questionId=match[1].toLowerCase();questionLines=[line];inTranscript=false;inRussianTranscript=false;continue;
  }
  if(questionId){questionLines.push(line);continue;}
  if(/^RU\s*[·:]\s*Полный перевод аудиозаписи/i.test(line)){inRussianTranscript=true;continue;}
  if(inTranscript){(inRussianTranscript?current.transcriptRu:current.transcriptDe).push(line);continue;}
  (isRussian(line)?current.introRu:current.introDe).push(line);
 }
 finishSegment();
 return groups.filter(group=>group.questions.length>0);
}
interface Props{
 set:B1Set;teil:number;answers:Record<string,string>;done:boolean;
 onAnswer:(id:string,value:string)=>void;onComplete:()=>void;onReset:()=>void;
 onNextSet:()=>void;hasNextSet:boolean;
}
export function B1HorenExercise({set,teil,answers,done,onAnswer,onComplete,onReset,onNextSet,hasNextSet}:Props){
 const groups=useMemo(()=>parseHorenGroups(set),[set]);
 const [current,setCurrent]=useState(0);
 const [checked,setChecked]=useState<Record<number,boolean>>({});
 const [translate,setTranslate]=useState(false);
 const [transcript,setTranscript]=useState(false);
 useEffect(()=>{setCurrent(0);setChecked({});setTranslate(false);setTranscript(false);},[set]);
 const group=groups[current];
 if(!group)return <div role="alert" className="b1-panel b1-notice">Для этой части Hören не удалось найти вопросы, связанные с аудиозаписью.</div>;
 const isChecked=done||Boolean(checked[current]);
 const scored=group.questions.filter(q=>!q.example);
 const answered=scored.filter(q=>Boolean(answers[q.id])).length;
 const canCheck=scored.length===0||answered===scored.length;
 const right=scored.filter(q=>answers[q.id]?.toLowerCase()===(set.answerKey?.[q.id]||'').toLowerCase()).length;
 const check=()=>{if(canCheck)setChecked(prev=>({...prev,[current]:true}));};
 const next=()=>{
  setTranscript(false);setTranslate(false);
  if(current<groups.length-1){setCurrent(n=>n+1);window.scrollTo({top:0,behavior:'smooth'});}
  else onComplete();
 };
 return <section className="b1-panel b1-horen-exercise">
  <div className="b1-horen-heading">
   <div><span className="b1-kicker">HÖREN · TEIL {teil} · КОМПЛЕКТ {set.number}</span>
    <h2>Аудирование B1</h2><p>{set.title.replace(/^Задание\s+\d+\s*[·:]\s*/i,'')}</p></div>
   <span className="b1-horen-count">{current+1} / {groups.length}</span>
  </div>
  <div className="b1-horen-progress"><span style={{width:((current+1)/groups.length*100)+'%'}}/></div>
  <p className="b1-horen-instruction">Прослушайте запись, выберите ответы и нажмите «Проверить». Затем переходите дальше.</p>
  <div key={group.id} className="b1-horen-single">
   <div className="b1-horen-audio-header"><Headphones size={21}/><div><strong>{teil===1?(current===0?'Beispiel · Пример':'Text '+current):'Hörtext · Аудиозапись'}</strong><span>{group.description}</span></div></div>
   <AudioClip id={group.id}/>
   <button type="button" className="b1-horen-translate" onClick={()=>setTranslate(v=>!v)}><Languages size={17}/>{translate?'Скрыть переводы':'Показать переводы вопросов'}</button>
   <div className="b1-horen-questions">
    {group.questions.map(q=>{
     const expected=set.answerKey?.[q.id]?.toLowerCase();
     const selected=answers[q.id]?.toLowerCase()||'';
     return <div key={q.id} className="b1-horen-question">
      <div className="b1-horen-question-label">Aufgabe {q.id} {q.example&&<span>· Пример (не оценивается)</span>}</div>
      <h3>{q.prompt}</h3>
      {translate&&q.translation&&<p className="b1-horen-translation">{q.translation}</p>}
      <div className="b1-horen-options" role="group" aria-label={'Aufgabe '+q.id}>
       {q.options.map(opt=>{
        const selectedOption=selected===opt.value;
        const correct=isChecked&&!q.example&&expected===opt.value;
        const wrong=isChecked&&!q.example&&selectedOption&&expected!==opt.value;
        return <button key={opt.value} type="button" className={'b1-horen-option'+(selectedOption?' is-selected':'')+(correct?' is-correct':'')+(wrong?' is-wrong':'')}
          aria-label={'Aufgabe '+q.id+' '+opt.label} aria-pressed={selectedOption}
          disabled={isChecked} onClick={()=>onAnswer(q.id,opt.value)}>
          <span className="b1-horen-radio" aria-hidden="true"/><span>{opt.label}{translate&&opt.translation&&<small>{opt.translation}</small>}</span>
         </button>;
       })}
      </div>
      {isChecked&&!q.example&&<div className={'b1-horen-result'+(selected===expected?' is-correct':' is-wrong')}>
       <strong>{selected===expected?'Правильно!':'Неверно. Правильный ответ: '+(expected||'—')}</strong>
       {q.explanation.filter(l=>/^Begründung|^Объяснение/i.test(l)&&(!isRussian(l)||translate)).map((reason,i)=><p key={i}>{reason}</p>)}
      </div>}
      {isChecked&&q.example&&<div className="b1-horen-result is-correct"><strong>Это тренировочный пример, баллы не начисляются.</strong></div>}
     </div>;
    })}
   </div>
  </div>
  {isChecked&&<div className="b1-horen-review">
   <div className="b1-horen-review-header"><strong>{scored.length?'Верных ответов: '+right+' / '+scored.length:'Пример пройден'}</strong>
    <button type="button" onClick={()=>setTranscript(v=>!v)}><Eye size={16}/>{transcript?'Скрыть текст аудио':'Показать текст аудио'}</button></div>
   {transcript&&<div className="b1-horen-transcript">
    <strong>Deutsch</strong>{group.transcriptDe.map((line,i)=><p key={'de'+i}>{line}</p>)}
    {translate&&<><strong>Русский перевод</strong>{group.transcriptRu.map((line,i)=><p key={'ru'+i}>{line}</p>)}</>}
   </div>}
  </div>}
  <div className="b1-horen-actions">
   {!isChecked?<button type="button" className="b1-primary" disabled={!canCheck} onClick={check}>Проверить ответы {scored.length?('('+answered+'/'+scored.length+')'):''}</button>:
    <button type="button" className="b1-primary" onClick={next}>{current<groups.length-1?'Следующая аудиозапись':'Завершить комплект'} <ArrowRight size={17}/></button>}
   {isChecked&&current>0&&<button type="button" className="b1-secondary" onClick={()=>{setCurrent(n=>n-1);setTranscript(false);}}> <ArrowLeft size={17}/> Назад</button>}
   {done&&<button type="button" className="b1-secondary" onClick={()=>{onReset();setCurrent(0);setChecked({});setTranslate(false);setTranscript(false);}}><RotateCcw size={16}/> Повторить комплект</button>}
   {done&&hasNextSet&&<button type="button" className="b1-secondary" onClick={onNextSet}>Следующий комплект <ArrowRight size={16}/></button>}
  </div>
  <p className="b1-caption">Учебная практика B1. Прогресс сохраняется в этом браузере.</p>
 </section>;
}
