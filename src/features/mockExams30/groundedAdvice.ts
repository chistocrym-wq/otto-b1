import type {Score,SkillQuestion} from './Exam30ScoreResult.js';

type R=Score['review'];
type P={answeredHoren:number;answeredLesen:number;filledForm:number;letterSubmitted:boolean;recordedSpeech:number;allUnanswered:boolean};
const short=(v:string|undefined,n=160)=>String(v||'').trim().slice(0,n);
const find=(a:SkillQuestion[]|undefined,id:string)=>a?.find(q=>q.id===id);
function listening(q:SkillQuestion|undefined){
 const s=(q?.prompt||'').toLowerCase();
 if(/wie viel|kostet|bezahlt|preis|euro/.test(s))return 'числа и цены (Zahlen und Preise). Потренируйте запись сумм на слух: 15,50 € = fünfzehn Euro fünfzig. Сравнивайте число евро и центов.';
 if(/wann|uhr|termin|welchen tag|welchem tag|beginnt|öffnet|treffen/.test(s))return 'время и дни недели (Uhrzeit, Wochentage). Повторите: halb neun = 8:30; Viertel nach neun = 9:15. При повторном прослушивании отдельно записывайте день и время.';
 if(/wo |wo\?|wohin|gleis|ausgang|bahnsteig|raum/.test(s))return 'место и направление (Ort, Weg). Отмечайте номер платформы, помещения или выхода. Не выбирайте ответ после первого упоминания места.';
 if(/wer |für wen|welche person|für welche/.test(s))return 'люди и адресаты (Personen). Различайте für mich, für meinen Sohn, für meine Tochter; отмечайте, для кого предназначена вещь.';
 return 'понимание деталей на слух. Сначала прочитайте вопрос; при втором прослушивании ищите конкретную информацию, а не знакомое слово.';
}
function reading(q:SkillQuestion|undefined){
 const s=(q?.prompt||'').toLowerCase();
 if(/\b(nicht|kein|keine|keinen|nur|erst|immer|ohne)\b/.test(s))return 'отрицания и ограничения (nicht, kein, nur, erst). Сравните всё утверждение с текстом. Например, nicht Montag, sondern Mittwoch меняет смысл.';
 if(/wann|uhr|termin|geöffnet|geschlossen|sonntag|montag|dienstag|mittwoch|donnerstag|freitag|samstag/.test(s))return 'время и расписание (Öffnungszeiten). Сверьте ab («с»), bis («до»), erst ab («только с») и конкретный день.';
 if(q?.part===2)return 'поиск подходящего объявления (Anzeigen). Сначала выпишите требование из Sie möchten …, потом проверьте оба объявления на услугу, время и ограничения.';
 return 'чтение коротких сообщений (Mitteilungen). Найдите конкретную фразу-доказательство и проверьте, кто, что, где и когда делает.';
}
function chosen(x:{submitted:boolean|number|null},q:SkillQuestion|undefined){
 if(typeof x.submitted==='boolean')return x.submitted?'Richtig':'Falsch';
 if(typeof x.submitted==='number')return short(q?.options?.[x.submitted],80)||'вариант '+(x.submitted+1);
 return '';
}
function field(label:string){
 const x=label.toLowerCase();
 if(/geburtsdatum|datum/.test(x))return 'Даты: переносите день, месяц и год. 6. März 1986 = 06.03.1986.';
 if(/telefon|handy|mobil/.test(x))return 'Телефонные номера: сверяйте каждую цифру и начальный ноль.';
 if(/straße|strasse|adresse|hausnummer/.test(x))return 'Адрес: не перепутайте название улицы и номер дома.';
 if(/ort|stadt|plz/.test(x))return 'Ort — город, Straße — улица; сверяйте написание.';
 if(/vorname|nachname|name/.test(x))return 'Vorname — имя, Nachname — фамилия; переписывайте точно.';
 if(/termin|wunsch|kurs/.test(x))return 'Найдите пожелание в ситуации: vormittags — до обеда, nachmittags — после обеда.';
 return 'Найдите соответствующий факт в задании и перенесите его без лишних слов.';
}
export function groundedAdvice(review:R,p:P,passed:boolean):string[]{
 if(p.allUnanswered)return [
 'Экзамен не выполнен: без ответов невозможно определить слабые навыки.',
 'Начните с Hören и Lesen, затем заполните формуляр и напишите письмо.',
 'Запишите пять устных ответов, чтобы OTTO оценил вашу речь.'
 ];
 const tips:string[]=[];
 const push=(s:string)=>{if(tips.length<7)tips.push(s)};
 for(const x of review.horen.filter(x=>x.submitted!==null&&!x.correctAnswer).slice(0,2)){
  const q=find(review.taskContext?.horen,x.id);
  push('Hören №'+x.number+': навык — '+listening(q)+' Вы выбрали «'+chosen(x,q)+'», правильный ответ — «'+short(x.option,80)+'». '+(q?.prompt?'Вопрос: '+short(q.prompt,120)+'.':''));
 }
 for(const x of review.lesen.filter(x=>x.submitted!==null&&!x.correctAnswer).slice(0,2)){
  const q=find(review.taskContext?.lesen,x.id);
  push('Lesen №'+x.number+': навык — '+reading(q)+' Вы выбрали «'+chosen(x,q)+'», правильный ответ — «'+short(x.option,80)+'». '+(q?.prompt?'Утверждение: '+short(q.prompt,120)+'.':''));
 }
 for(const x of review.form.filter(x=>x.submitted.trim()&&!x.correct).slice(0,2))
  push('Schreiben, формуляр «'+short(x.label,70)+'»: введено «'+short(x.submitted,100)+'», правильно «'+short(x.expected,100)+'». '+field(x.label));
 if(p.letterSubmitted){
  for(const [i,x] of (review.letter.contentPoints||[]).entries()){
   if(typeof x.earned!=='number'||x.earned>=3)continue;
   push('Schreiben, письмо — пункт '+(i+1)+' «'+short(review.letter.taskPoints?.[i]||x.point,120)+'»: '+short(x.commentRu,180)+' Практика: напишите одно короткое предложение, которое точно выполняет этот пункт.');
   break;
  }
  const e=(review.letter.corrections||[]).find(x=>x.original&&x.corrected);
  if(e)push('Schreiben, письмо: «'+short(e.original,90)+'» → «'+short(e.corrected,90)+'». '+short(e.explanation,200)+' Составьте новое предложение с исправленной конструкцией.');
 }
 for(const x of review.speech){
  if(x.recorded===false||(x.practice||[]).includes('Аудиозапись отсутствует.'))continue;
  const issue=(x.practice||[]).find(t=>t.trim());
  const missing=(x.missing||[]).find(t=>t.trim());
  if(x.score===100&&!issue&&!missing)continue;
  const task=x.taskType==='self-introduction'||x.taskId==='teil1-intro'
   ?'Sich vorstellen: потренируйте Ich heiße …, Ich komme aus …, Ich wohne in …'
   :x.taskType==='question'||x.taskId.startsWith('teil2')
   ?'W-Fragen и Ja/Nein-Fragen: составьте три вопроса'+(x.keyword?' со словом «'+short(x.keyword,55)+'»':'')+'. В вопросах Wo/Wann глагол стоит на втором месте, в Haben Sie …? — на первом'
   :'Bitten: потренируйте вежливую просьбу с Können Sie bitte …?'+(x.instruction?' Задача: '+short(x.instruction,110):'');
  push('Sprechen '+x.taskId+': '+task+'. '+(issue?'Проверяющий отметил: '+short(issue,210):missing?'Не выполнено: '+short(missing,190):'Повторите фразу вслух и прослушайте запись.'));
  break;
 }
 if(review.horen.length===15&&p.answeredHoren<15)push('Hören: '+(15-p.answeredHoren)+' заданий пропущено; это не выявленные ошибки.');
 if(review.lesen.length===15&&p.answeredLesen<15)push('Lesen: '+(15-p.answeredLesen)+' заданий пропущено; это не выявленные ошибки.');
 if(review.form.length===5&&p.filledForm<5)push('Schreiben: '+(5-p.filledForm)+' полей формуляра не заполнены.');
 if(!p.letterSubmitted)push('Schreiben: письмо не написано — тренируйте обращение, три обязательных пункта и завершающую фразу.');
 if(review.speech.length===5&&p.recordedSpeech<5)push('Sprechen: '+(5-p.recordedSpeech)+' ответов не записано — потренируйте рассказ о себе, вопросы и просьбы.');
 if(!tips.length)push(passed?'Задания выполнены успешно. Для закрепления повторите числа, расписания и короткие письма.':'Повторите раздел с наименьшей оценкой и проверьте ответы по исходным заданиям.');
 return tips.slice(0,7);
}
