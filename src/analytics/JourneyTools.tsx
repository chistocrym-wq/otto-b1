import {useEffect,useState} from 'react';
import {v20ClientEnabled} from '../lib/v20ClientFeatures';
import {createRoot} from 'react-dom/client';
import {PREVIEW_HOST} from '../../shared/preview20-journey.js';
import {journeyStatus,startJourney} from './journeyClient';
import './journey.css';

const CHOICE_KEY='otto-preview20-analytics-choice-v1';

type Choice='allow'|'necessary'|null;

function readChoice():Choice{
 try{
  const value=localStorage.getItem(CHOICE_KEY);
  return value==='allow'||value==='necessary'?value:null;
 }catch{return null;}
}

function AnalyticsNotice(){
 const [choice,setChoice]=useState<Choice>(()=>readChoice());
 const [starting,setStarting]=useState(false);

 useEffect(()=>{
  if(choice!=='allow')return;
  if(journeyStatus().active)return;
  setStarting(true);
  void startJourney().finally(()=>setStarting(false));
 },[choice]);

 if(choice!==null)return null;

 const choose=(next:Exclude<Choice,null>)=>{
  try{localStorage.setItem(CHOICE_KEY,next);}catch{}
  setChoice(next);
 };

 return <aside className="oj-consent-banner" role="dialog" aria-label="Настройки аналитики">
   <div className="oj-consent-copy">
    <strong>Помогите улучшить OTTO</strong>
    <p>Разрешите техническую аналитику первого визита: первые 5 минут мы сохраняем путь по разделам и примерное активное время, после этого подробная запись прекращается, остаётся только учёт активного времени занятий. Мы не сохраняем пароли, коды подтверждения, тексты учебных ответов, черновики Schreiben или голос.</p>
   </div>
   <div className="oj-consent-actions">
    <button type="button" className="oj-button oj-primary" disabled={starting} onClick={()=>choose('allow')}>Разрешить аналитику</button>
    <button type="button" className="oj-button" disabled={starting} onClick={()=>choose('necessary')}>Только необходимое</button>
   </div>
  </aside>;
}

export function mountJourneyTools(){
 if(!v20ClientEnabled('journey')||window.location.pathname.startsWith('/admin'))return;
 if(document.getElementById('otto-preview20-journey-tools'))return;
 const node=document.createElement('div');
 node.id='otto-preview20-journey-tools';
 document.body.appendChild(node);
 createRoot(node).render(<AnalyticsNotice/>);
}
