import crypto from 'node:crypto';
import {otto30AdminAllowed} from '../lib/otto30-storage-config.js';
import {getStore} from '@netlify/blobs';
import {checkExamAccess,validSameOriginMutation,EXAM30_STORE,READY_KEY,validatePublicExamData,readVerifiedOwnerManifest,verifyOwnerAssetBytes} from '../lib/otto30-private.js';
import checkLetter from './check-schreiben.js';
import checkSpeech from './check-sprechen.js';
import {E9R3_KEY_FILES} from '../lib/otto30-key-fingerprints.js';

const KEY_STORE='otto30-preview13-private-score-keys-v1';
const ATTEMPT_STORE='otto30-preview13-private-scores-v1';
const KEY_VERSION='OTTO30-E9R3-EDITORIAL-20261011_PRIVATE_UNAPPROVED';
/** Upload permission is intentionally separate from read-only exam access. */
function canInstallKeys(session,config){return otto30AdminAllowed(session,config,'keyAdminIds')}

const SECTIONS=['hoeren','lesen'];
const speakIds=['teil1-intro','teil2-1','teil2-2','teil3-1','teil3-2'];
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const twoDigit=n=>String(n).padStart(2,'0');
const validAttempt=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f-]{27,40}$/i.test(id);
const validExam=n=>Number.isInteger(n)&&n>=1&&n<=30;
const score25=(earned,max)=>Math.round((earned/max)*25*10)/10;
const normalizeText=s=>String(s??'').normalize('NFKC').toLocaleLowerCase('de-DE').replace(/[\p{P}\p{S}\s]+/gu,' ').trim();
const prefix=(session,n)=>encodeURIComponent(session.sub)+'/exam_'+twoDigit(n);
const storageId=(session,n,attempt)=>prefix(session,n)+'/'+attempt;
const currentId=(session,n)=>prefix(session,n)+'/_current_attempt_v1';
const latestResultId=(session,n)=>prefix(session,n)+'/_latest_result_v1';
const historyPrefix=session=>encodeURIComponent(session.sub)+'/results/';
const historyId=(session,n,attempt)=>historyPrefix(session)+'exam_'+twoDigit(n)+'/'+attempt;
/** This path includes the signed session subject, never a user ID supplied by the client. */
export const attemptPathFor=(session,n,attempt)=>storageId(session,n,attempt);
function scoredSummary(attempt,n){
 const values=attempt.parts||{};
 if(!(values.objective&&values.letter&&speakIds.every(t=>values.speech?.[t])))return null;
 const scores={horen:values.objective.objectivePoints.horen,lesen:values.objective.objectivePoints.lesen};
 scores.schreiben=score25(values.objective.formPoints+values.letter.earned,15);
 scores.sprechen=score25(speakIds.reduce((a,k)=>a+values.speech[k].earned,0),15);
 const total=Math.round(Object.values(scores).reduce((a,b)=>a+b,0)*10)/10;
 return {complete:true,exam:n+1,internalExam:n,attemptId:attempt.attemptId,total,passed:total>=60,sections:scores,completedAt:attempt.completedAt||new Date().toISOString()};
}
async function storeSummary(store,session,n,attempt){
 const summary=scoredSummary(attempt,n);
 if(!summary)return null;
 await store.setJSON(historyId(session,n,attempt.attemptId),summary,{onlyIfNew:true});
 return summary;
}
function safeAnswered(v,question){
 if(question.type==='true-false')return typeof v==='boolean'?v:null;
 return Number.isInteger(v)&&v>=0&&v<question.options.length?v:null;
}
export async function assessObjective(candidate,keys,payload){
 const objective={};
 let scores={};
 for(const section of SECTIONS){
  const clientSection=section==='hoeren'?'horen':section;
  const response=payload?.[clientSection];
  if(!response||typeof response!=='object'||Array.isArray(response))throw Error('invalid_'+section+'_answers');
  const expectedKeys=Object.keys(response);
  if(expectedKeys.some(id=>!candidate[section].some(q=>q.questionId===id)))throw Error('foreign_question');
  const detail=candidate[section].map((q,i)=>{
   const k=keys[section]?.[String(i+1)];
   if(!k||k.type!==q.type)throw Error('private_key_corrupt');
   const answer=safeAnswered(response[q.questionId],q);
   const correct=q.type==='true-false'?k.answer:k.answerIndex;
   if(typeof correct==='undefined'||(q.type==='true-false'?typeof correct!=='boolean':!Number.isInteger(correct)||correct>=q.options.length||correct<0))throw Error('private_key_corrupt');
   return {id:q.questionId,number:i+1,answered:answer!==null,submitted:answer,correct,correctAnswer:answer===correct,option:q.type==='multiple-choice'?q.options[correct]:(correct?'Richtig':'Falsch')};
  });
  objective[clientSection]=detail;
  scores[clientSection]=score25(detail.filter(d=>d.correctAnswer).length,15);
 }
 const parts=keys.schreiben?.part1;
 if(!Array.isArray(parts)||parts.length!==candidate.schreiben.part1.rows.length)throw Error('private_form_key_corrupt');
 const fields=payload.form;
 if(!fields||typeof fields!=='object'||Array.isArray(fields))throw Error('invalid_form');
 if(Object.keys(fields).some(k=>!/^([0-6])$/.test(k)))throw Error('unknown_form_field');
 const formFeedback=[];
 for(const row of parts){
  if(row.prefilled)continue;
  if(typeof row.expected!=='string')throw Error('private_form_key_corrupt');
  const supplied=String(fields[String(row.index)]??'').slice(0,1500);
  formFeedback.push({index:row.index,label:row.label,submitted:supplied,expected:row.expected,correct:normalizeText(supplied)===normalizeText(row.expected)});
 }
 if(formFeedback.length!==5)throw Error('private_form_key_corrupt');
 return {objective,objectivePoints:scores,formFeedback,formPoints:formFeedback.filter(x=>x.correct).length};
}
async function getValidated(store,n){
 const manifest=await readVerifiedOwnerManifest(store);
 if(!manifest)throw Error('candidate_manifest_not_ready');
 const path='exams/exam_'+twoDigit(n)+'.json';
 const bytes=await store.get(path,{type:'arrayBuffer'});
 if(!bytes)throw Error('candidate_not_found');
 const data=JSON.parse(verifyOwnerAssetBytes(manifest,path,bytes).toString('utf8'));
 validatePublicExamData(data,n);
 return data;
}
async function getPrivateKey(n,config){
 const privateStore=getStore(config.keyStore);
 const bytes=await privateStore.get('exam_'+twoDigit(n)+'.key.json',{type:'arrayBuffer'});
 if(!bytes)return null;
 const trusted=E9R3_KEY_FILES[n];
 const buffer=Buffer.from(bytes);
 if(!trusted||buffer.length!==trusted.bytes||
    crypto.createHash('sha256').update(buffer).digest('hex')!==trusted.sha256)
   throw Error('private_key_fingerprint_mismatch');
 const key=JSON.parse(buffer.toString('utf8'));
 if(key.examId!=='otto-a12-'+twoDigit(n)||key.status!=='PRIVATE_SERVER_ONLY'||key.keyVersion!==KEY_VERSION)throw Error('private_key_version_mismatch');
 for(const section of SECTIONS)if(Object.keys(key[section]||{}).length!==15)throw Error('private_key_corrupt');
 return key;
}
async function delegate(req,context,handler,data){
 const upstream=new Request(req.url,{method:'POST',headers:{'Content-Type':'application/json','cookie':req.headers.get('cookie')||''},body:JSON.stringify(data)});
 const res=await handler(upstream,context);
 if(!res.ok){return {failed:true,status:res.status,body:await res.json().catch(()=>({error:'AI temporarily unavailable'}))};}
 return {failed:false,body:await res.json()};
}
async function save(store,key,value){await store.setJSON(key,{...value,updatedAt:new Date().toISOString()});}
export default async function scoreHandler(req,context){
 const decision=await checkExamAccess(req,context);
 if(!decision.access){
  if(decision.status===503)console.warn('OTTO30 scoring access verification temporarily unavailable');
  return json({code:decision.code},decision.status);
 }
 const {session,config}=decision.access;
 const u=new URL(req.url),op=u.searchParams.get('op')||'status';
 if(req.method==='POST'&&!validSameOriginMutation(req))return json({code:'origin_denied'},403);
 if(req.method!=='POST'&&req.method!=='GET')return json({code:'method_denied'},405);
 if(req.method==='GET'&&op==='inventory'){
  if(!canInstallKeys(session,config))return json({code:'key_admin_only'},403);
  const states=await Promise.all(Array.from({length:30},(_,i)=>i+1).map(async exam=>{
   try{const key=await getPrivateKey(exam,config);return {exam,status:key?'installed':'missing'};}
   catch{return {exam,status:'unavailable'};}
  }));
  return json({
   total:30,
   installed:states.filter(s=>s.status==='installed').length,
   missing:states.filter(s=>s.status==='missing').map(s=>s.exam),
   unavailable:states.filter(s=>s.status==='unavailable').map(s=>s.exam),
   aiConfigured:{
    schreiben:Boolean(process.env.OPENAI_API_KEY&&process.env.OPENAI_BASE_URL),
    sprechen:Boolean(process.env.GEMINI_API_KEY&&process.env.GOOGLE_GEMINI_BASE_URL)
   },
   keyUploadAllowed:canInstallKeys(session,config)
  });
 }
 if(req.method==='GET'&&op==='history'){
  try{
   const store=getStore(config.attemptStore);
   const {blobs}=await store.list({prefix:historyPrefix(session)});
   const rows=await Promise.all(blobs.filter(b=>/^exam_(0[1-9]|[12][0-9]|30)\/[0-9a-f-]{36}$/i.test(b.key.slice(historyPrefix(session).length))).map(b=>store.get(b.key,{type:'json'})));
   // Preserve results written by the earlier single-latest implementation.
   const previous=await Promise.all(Array.from({length:30},(_,i)=>i+1).map(async n=>{
    const row=await store.get(latestResultId(session,n),{type:'json'});
    return row?{...row,exam:n+1,internalExam:n}:null;
   }));
   const all=[...previous,...rows].filter(x=>x?.complete&&validAttempt(x.attemptId)&&Number.isFinite(x.total));
   const deduped=new Map();
   for(const row of all)deduped.set(row.internalExam+':'+row.attemptId,row);
   return json({results:[...deduped.values()].sort((a,b)=>String(b.completedAt||'').localeCompare(String(a.completedAt||'')))});
  }catch(e){console.error('OTTO30 history unavailable',String(e?.message||e));return json({code:'history_unavailable'},503);}
 }
 const n=Number(u.searchParams.get('exam'));
 if(!validExam(n))return json({code:'invalid_exam'},400);
 try{
  // Admin-only, once-per-exam import of immutable, byte-exact E9R3 answer keys.
  // Files are never copied to GitHub, Vite dist, public routes, logs or client state.
  if(req.method==='POST'&&op==='install-key'){
   if(!canInstallKeys(session,config))return json({code:'key_admin_only'},403);
   const fingerprint=E9R3_KEY_FILES[n];
   const length=Number(req.headers.get('content-length')||0);
   if(length>60_000)return json({code:'key_file_too_large'},413);
   const source=await req.text();
   const bytes=Buffer.from(source,'utf8');
   if(bytes.length!==fingerprint.bytes||
      crypto.createHash('sha256').update(bytes).digest('hex')!==fingerprint.sha256)
     return json({code:'key_fingerprint_mismatch'},422);
   let candidateKey;
   try{candidateKey=JSON.parse(source)}catch{return json({code:'invalid_key_json'},422);}
   if(candidateKey?.examId!=='otto-a12-'+twoDigit(n)||
      candidateKey?.status!=='PRIVATE_SERVER_ONLY'||
      candidateKey?.keyVersion!==KEY_VERSION||
      !SECTIONS.every(s=>Object.keys(candidateKey[s]||{}).length===15))
     return json({code:'invalid_key_identity'},422);
   const candidateStore=getStore(config.candidateStore);
   const ready=await candidateStore.get(READY_KEY,{type:'json'});
   if(ready?.confirmed!==true)return json({code:'candidate_package_not_ready'},409);
   const candidate=await getValidated(candidateStore,n);
   try{
    await assessObjective(candidate,candidateKey,{horen:{},lesen:{},form:{}});
   }catch{return json({code:'key_candidate_mismatch'},422);}
   const store=getStore(config.keyStore);
   await store.set('exam_'+twoDigit(n)+'.key.json',source);
   if(!(await getPrivateKey(n,config)))return json({code:'key_verify_failed'},503);
   return json({ok:true,exam:n,stored:true});
  }
  const key=await getPrivateKey(n,config);
  if(req.method==='GET'&&op==='status')return json({available:!!key,exam:n,requiresServerEvaluation:true});
  if(!key)return json({code:'private_scoring_keys_not_installed'},503);
  const candidates=getStore(config.candidateStore);
  const ready=await candidates.get(READY_KEY,{type:'json'});
  if(ready?.confirmed!==true)return json({code:'candidate_package_not_ready'},409);
  const exam=await getValidated(candidates,n);
  const store=getStore(config.attemptStore);
  if(req.method==='POST'&&op==='begin'){
   const attemptId=crypto.randomUUID();
   await save(store,storageId(session,n,attemptId),{version:1,attemptId,examId:exam.id,ownerId:session.sub,createdAt:new Date().toISOString(),parts:{}});
   await store.setJSON(currentId(session,n),{attemptId});
   return json({attemptId});
  }
  const attemptId=req.method==='GET'?u.searchParams.get('attemptId'):null;
  const payload=req.method==='POST'?await req.json().catch(()=>null):null;
  const id=attemptId??payload?.attemptId;
  if(!validAttempt(id))return json({code:'invalid_attempt'},400);
  const location=storageId(session,n,id);
  const attempt=await store.get(location,{type:'json'});
  if(!attempt||attempt.ownerId!==session.sub||attempt.examId!==exam.id)return json({code:'attempt_not_found'},404);
  if(req.method==='GET'&&op==='result'){
   const summary=await storeSummary(store,session,n,attempt);
   if(!summary)return json({complete:false,remaining:{objective:!attempt.parts?.objective,letter:!attempt.parts?.letter,speech:speakIds.filter(t=>!attempt.parts?.speech?.[t])}});
   const values=attempt.parts;
   // Public task context is returned only for an authenticated, completed exam.
   // Existing stored attempts are left untouched; no extra paid AI calls.
   const taskContext={
    horen:exam.hoeren.map(t=>({id:t.questionId,part:t.part,type:t.type,prompt:t.prompt,title:t.title,options:t.options||[]})),
    lesen:exam.lesen.map(t=>({id:t.questionId,part:t.part,type:t.type,prompt:t.prompt,context:t.context,readingFormat:t.readingFormat,options:t.options||[]}))
   };
   const speechFeedback=speakIds.map((taskId,i)=>{
    const part=values.speech[taskId];
    const details=i===0?{taskType:'self-introduction'}:
     i<=2?{taskType:'question',theme:exam.sprechen.teil2[i-1].theme,keyword:exam.sprechen.teil2[i-1].keyword}:
     {taskType:'request',instruction:exam.sprechen.teil3[i-3].instruction,topic:exam.sprechen.teil3[i-3].situation};
    return {taskId,...part.feedback,...details,recorded:typeof part.recorded==='boolean'?part.recorded:!part.feedback?.practice?.includes('Аудиозапись отсутствует.')};
   });
   return json({complete:true,examId:exam.id,attemptId:id,total:summary.total,max:100,passed:summary.passed,sections:summary.sections,review:{horen:values.objective.objective.horen,lesen:values.objective.objective.lesen,form:values.objective.formFeedback,letter:{...values.letter.feedback,submitted:typeof values.letter.submitted==='boolean'?values.letter.submitted:values.letter.feedback?.feedbackRu!=='Письмо не написано.',taskPoints:exam.schreiben.part2.points},speech:speechFeedback,taskContext}});
  }
  if(req.method!=='POST')return json({code:'invalid_method'},405);
  if(attempt.parts?.closed)return json({code:'attempt_closed'},409);
  if(op==='objective'){
   if(attempt.parts.objective)return json({ok:true,alreadyChecked:true});
   const evaluated=await assessObjective(exam,key,payload);
   attempt.parts.objective=evaluated;await save(store,location,attempt);
   return json({ok:true,section:'objective'});
  }
  if(op==='letter'){
   if(attempt.parts.letter)return json({ok:true,alreadyChecked:true});
   const text=String(payload.letter??'').trim();
   if(text.length>3500)return json({code:'letter_too_long'},413);
   let letter;
   if(text){
    const r=await delegate(req,context,checkLetter,{text,situation:exam.schreiben.part2.situation,points:exam.schreiben.part2.points});
    if(r.failed)return json({code:'letter_evaluation_unavailable',details:r.body?.code||'AI failed'},r.status);
    const earned=r.body?.earned;
    if(!Number.isFinite(earned)||earned<0||earned>10)return json({code:'letter_score_invalid'},502);
    letter={earned,feedback:r.body};
   }else letter={earned:0,feedback:{feedbackRu:'Письмо не написано.',corrections:[]}};
   attempt.parts.letter={...letter,submitted:Boolean(text)};await save(store,location,attempt);
   return json({ok:true,section:'letter'});
  }
  if(op==='speech'){
   const taskId=String(payload.taskId||'');
   if(!speakIds.includes(taskId))return json({code:'invalid_speech_task'},400);
   if(!attempt.parts.speech)attempt.parts.speech={};
   if(attempt.parts.speech[taskId])return json({ok:true,alreadyChecked:true});
   const b64=String(payload.audioBase64||'');
   let one;
   if(!b64){one={earned:0,feedback:{taskId,score:0,practice:['Аудиозапись отсутствует.'],missing:['Не дан устный ответ.']}};}
   else{
    if(b64.length>4_000_000)return json({code:'audio_too_large'},413);
    const ix=speakIds.indexOf(taskId);
    const options=ix===0?{mode:'teil1',expectedPoints:[]}:ix<=2?{mode:'teil2',theme:exam.sprechen.teil2[ix-1].theme,keyword:exam.sprechen.teil2[ix-1].keyword}:{mode:'teil3',object:exam.sprechen.teil3[ix-3].imageAlt||exam.sprechen.teil3[ix-3].situation||''};
    const r=await delegate(req,context,checkSpeech,{...options,audioBase64:b64,mimeType:String(payload.mimeType||'audio/webm')});
    if(r.failed)return json({code:'speech_evaluation_unavailable',taskId,details:r.body?.code||'AI failed'},r.status);
    const score=r.body?.score;
    if(![0,50,100].includes(score))return json({code:'speech_score_invalid'},502);
    one={earned:score/100*3,feedback:r.body};
   }
   attempt.parts.speech[taskId]={...one,recorded:Boolean(b64)};await save(store,location,attempt);
   // Make cross-device history durable when the final part is saved, not only on GET /result.
   await storeSummary(store,session,n,attempt);
   return json({ok:true,section:'speech',taskId});
  }
  return json({code:'unknown_operation'},400);
 }catch(e){console.error('OTTO30 score error',String(e?.message||e));return json({code:'scoring_unavailable'},503);}
}
export const config={path:'/api/otto30-score'};
