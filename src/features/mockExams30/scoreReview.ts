import type {Score} from './Exam30ScoreResult.js';
import {groundedAdvice} from './groundedAdvice.ts';

type RecordValue=Record<string,unknown>;
const record=(value:unknown):RecordValue|null=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as RecordValue:null;
const asText=(value:unknown):string=>typeof value==='string'?value:typeof value==='number'&&Number.isFinite(value)?String(value):'';
const strings=(value:unknown):string[]=>Array.isArray(value)?value.filter((x):x is string=>typeof x==='string'&&x.trim().length>0):[];
const rows=(value:unknown):RecordValue[]=>Array.isArray(value)?value.map(record).filter((x):x is RecordValue=>x!==null):[];

/** Prevents accidentally presenting a malformed score as a real pass/fail result. */
export function isUsableScore(value:unknown):value is Score{
 const item=record(value);
 const sections=record(item?.sections);
 if(!item||item.complete!==true||item.max!==100||typeof item.passed!=='boolean'||
    typeof item.total!=='number'||!Number.isFinite(item.total)||item.total<0||item.total>100||!sections)return false;
 if(item.passed!==(item.total>=60))return false;
 return ['horen','lesen','schreiben','sprechen'].every(section=>
  typeof sections[section]==='number'&&Number.isFinite(sections[section])&&
  (sections[section] as number)>=0&&(sections[section] as number)<=25);
}

function objectives(value:unknown):Score['review']['horen']{
 return rows(value).filter(x=>typeof x.correctAnswer==='boolean'&&Number.isInteger(x.number)&&
     typeof x.number==='number'&&x.number>=1&&x.number<=15)
  .map(x=>({
   id:asText(x.id),
   number:x.number as number,
   correctAnswer:x.correctAnswer as boolean,
   correct:x.correct===true,
   option:asText(x.option),
   submitted:typeof x.submitted==='boolean'||typeof x.submitted==='number'&&Number.isInteger(x.submitted)?x.submitted:null
  }));
}
/**
 * Tolerate unavailable or malformed review fragments without bringing down
 * the whole React app. Missing details are explicitly reported, never guessed.
 */
export function normalizeScoreReview(value:unknown):{review:Score['review'];missingSections:string[]}{
 const source=record(value)||{};
 const rawLetter=record(source.letter);
 // Older server builds returned 'hoeren'; accept both without altering saved attempts.
 const horen=objectives(source.horen ?? source.hoeren);
 const lesen=objectives(source.lesen);
 const form=rows(source.form).filter(x=>typeof x.correct==='boolean')
  .map(x=>({label:asText(x.label),submitted:asText(x.submitted),expected:asText(x.expected),correct:x.correct as boolean}));
 const letter={
  feedbackRu:asText(rawLetter?.feedbackRu),
  taskPoints:strings(rawLetter?.taskPoints),
  contentPoints:rows(rawLetter?.contentPoints).map(x=>({point:asText(x.point),earned:typeof x.earned==='number'?x.earned:undefined,commentRu:asText(x.commentRu)})),
  submitted:typeof rawLetter?.submitted==='boolean'?rawLetter.submitted:undefined,
  corrections:rows(rawLetter?.corrections).map(x=>({
   original:asText(x.original),corrected:asText(x.corrected),explanation:asText(x.explanation)
  }))
 };
 const speech=rows(source.speech).map(x=>({
  taskId:asText(x.taskId),
  taskType:asText(x.taskType),theme:asText(x.theme),keyword:asText(x.keyword),instruction:asText(x.instruction),
  missing:strings(x.missing),score:typeof x.score==='number'?x.score:undefined,
  recorded:typeof x.recorded==='boolean'?x.recorded:undefined,
  practice:strings(x.practice),
  pronunciationRu:asText(x.pronunciationRu),
  strengths:strings(x.strengths)
 }));
 const context=record(source.taskContext);
 const mapped=(value:unknown)=>rows(value).map(x=>({id:asText(x.id),prompt:asText(x.prompt),title:asText(x.title),context:asText(x.context),part:typeof x.part==='number'?x.part:0,options:strings(x.options)}));
 const taskContext={horen:mapped(context?.horen),lesen:mapped(context?.lesen)};
 const missingSections:string[]=[];
 if(horen.length!==15)missingSections.push('Hören');
 if(lesen.length!==15)missingSections.push('Lesen');
 if(form.length!==5)missingSections.push('Schreiben — формуляр');
 if(!rawLetter)missingSections.push('Schreiben — письмо');
 if(speech.length!==5)missingSections.push('Sprechen');
 return {review:{horen,lesen,form,letter,speech,taskContext},missingSections};
}

/** Was speech recorded? Prefer an explicit server flag, then recognize legacy empty-audio feedback. */
export function hasSpeechRecording(speech:Score['review']['speech'][number]):boolean{
 if(typeof speech.recorded==='boolean')return speech.recorded;
 if((speech.practice||[]).some(item=>item.trim()==='Аудиозапись отсутствует.'))return false;
 return Boolean(speech.pronunciationRu||(speech.strengths||[]).length||(speech.practice||[]).length);
}
export function examParticipation(score:Score){
 const {review,missingSections}=normalizeScoreReview(score.review);
 const answeredHoren=review.horen.filter(q=>q.submitted!==null).length;
 const answeredLesen=review.lesen.filter(q=>q.submitted!==null).length;
 const filledForm=review.form.filter(q=>q.submitted.trim().length>0).length;
 const letterSubmitted=typeof review.letter.submitted==='boolean'
  ?review.letter.submitted
  :Boolean((review.letter.feedbackRu&&review.letter.feedbackRu!=='Письмо не написано.')||(review.letter.corrections||[]).length);
 const recordedSpeech=review.speech.filter(hasSpeechRecording).length;
 return {
  answeredHoren,answeredLesen,filledForm,letterSubmitted,recordedSpeech,
  allUnanswered:missingSections.length===0&&answeredHoren===0&&answeredLesen===0&&
   filledForm===0&&!letterSubmitted&&recordedSpeech===0
 };
}

/** Only submitted wrong answers are diagnosed as errors; omissions get separate advice. */
export function recommendExamPractice(score:Score):string[]{
 const {review,missingSections}=normalizeScoreReview(score.review);
 if(review.taskContext?.horen.length||review.taskContext?.lesen.length)return groundedAdvice(review,examParticipation(score),score.passed);
 const participation=examParticipation(score);
 if(participation.allUnanswered)return [
  'Экзамен пока не выполнен: вы не выбрали ответы, не написали письмо и не записали речь. 0 баллов отражают отсутствие ответов, а не уровень ваших знаний.',
  'Начните с Hören: прослушайте записи и выберите ответы.',
  'Затем выполните Lesen и заполните формуляр Schreiben.',
  'Напишите письмо и запишите ответы Sprechen. После этого OTTO сможет показать ваши реальные ошибки.'
 ];
 const items:string[]=[];
 for(const x of review.horen.filter(x=>x.submitted!==null&&!x.correctAnswer).slice(0,2))
  items.push('Hören, задание '+x.number+': сравните свой ответ с правильным вариантом «'+x.option+'» и прослушайте запись ещё раз.');
 for(const x of review.lesen.filter(x=>x.submitted!==null&&!x.correctAnswer).slice(0,2))
  items.push('Lesen, задание '+x.number+': найдите в тексте подтверждение правильного варианта «'+x.option+'».');
 for(const x of review.form.filter(x=>x.submitted.trim().length>0&&!x.correct).slice(0,2))
  items.push('Schreiben, формуляр «'+x.label+'»: проверьте введённое значение и сравните с «'+x.expected+'».');
 if(participation.letterSubmitted)for(const x of (review.letter.corrections||[]).slice(0,2))
  items.push('Schreiben, письмо: вместо «'+x.original+'» напишите «'+x.corrected+'». '+(x.explanation||''));
 for(const x of review.speech.filter(hasSpeechRecording)){
  for(const message of (x.practice||[]).filter(s=>s.trim()&&s.trim()!=='Аудиозапись отсутствует.').slice(0,1))
   items.push('Sprechen '+x.taskId+': '+message);
  if(items.length>=7)break;
 }
 if(review.horen.length===15&&participation.answeredHoren<15)
  items.push('Hören: '+(15-participation.answeredHoren)+' заданий не выполнено. Попробуйте ответить на них после прослушивания.');
 if(review.lesen.length===15&&participation.answeredLesen<15)
  items.push('Lesen: '+(15-participation.answeredLesen)+' заданий не выполнено. Прочитайте тексты и выберите ответы.');
 if(review.form.length===5&&participation.filledForm<5)
  items.push('Schreiben: '+(5-participation.filledForm)+' полей формуляра остались пустыми. Потренируйтесь переносить данные из задания.');
 if(review.letter&&!participation.letterSubmitted)
  items.push('Schreiben: письмо не написано. Составьте короткий ответ по трём пунктам задания.');
 if(review.speech.length===5&&participation.recordedSpeech<5)
  items.push('Sprechen: '+(5-participation.recordedSpeech)+' устных ответов не записано. Выполните задания с микрофоном.');
 if(missingSections.length)items.push('Часть подробного разбора недоступна: '+missingSections.join(', ')+'.');
 if(!items.length&&score.passed)items.push('Задания выполнены успешно. Для закрепления повторите самые сложные аудиозаписи и напишите новое письмо.');
 if(!items.length)items.push('Повторите задания, в которых получили меньше баллов, и попробуйте выполнить новый вариант.');
 return items.slice(0,7);
}
