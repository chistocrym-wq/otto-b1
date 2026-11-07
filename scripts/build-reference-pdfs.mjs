import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';

const root=process.cwd();
const outDir=path.join(root,'public','pdf');
fs.mkdirSync(outDir,{recursive:true});

const windowsFontDir=process.env.WINDIR ? path.join(process.env.WINDIR,'Fonts') : '';

const fontCandidates=[
  ...(windowsFontDir ? [
    path.join(windowsFontDir,'arial.ttf'),
    path.join(windowsFontDir,'segoeui.ttf'),
    path.join(windowsFontDir,'tahoma.ttf'),
  ] : []),
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
];
const boldCandidates=[
  ...(windowsFontDir ? [
    path.join(windowsFontDir,'arialbd.ttf'),
    path.join(windowsFontDir,'segoeuib.ttf'),
    path.join(windowsFontDir,'tahomabd.ttf'),
  ] : []),
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
];
const regular=fontCandidates.find(fs.existsSync);
const bold=boldCandidates.find(fs.existsSync);
if(!regular||!bold)throw new Error('Unicode font for OTTO reference PDFs was not found on build image.');

const C={ink:'#263643',muted:'#68747a',petrol:'#426f6d',soft:'#f4efe6',line:'#ded8cd'};
function docFor(file,title,subtitle){
  const doc=new PDFDocument({size:'A4',margin:42,info:{Title:title,Author:'OTTO A1'}});
  doc.pipe(fs.createWriteStream(path.join(outDir,file)));
  doc.registerFont('regular',regular);doc.registerFont('bold',bold);
  doc.font('bold').fillColor(C.ink).fontSize(20).text(title,{align:'center'});
  doc.moveDown(.25).font('regular').fillColor(C.muted).fontSize(9.5).text(subtitle,{align:'center'}).moveDown(.8);
  return doc;
}
function h(doc,text){doc.moveDown(.5).font('bold').fillColor(C.petrol).fontSize(13).text(text).moveDown(.25)}
function p(doc,text,opts={}){doc.font(opts.bold?'bold':'regular').fillColor(opts.color||C.ink).fontSize(opts.size||9.5).text(text,{lineGap:2,...opts}).moveDown(.22)}
function bullets(doc,items){for(const item of items)p(doc,`• ${item}`,{color:C.muted})}
function callout(doc,text){const x=doc.x,y=doc.y,w=doc.page.width-doc.page.margins.left-doc.page.margins.right;doc.roundedRect(x,y,w,44,8).fill('#e7efeb');doc.fillColor(C.ink).font('bold').fontSize(9.5).text(text,x+10,y+10,{width:w-20,lineGap:2});doc.y=y+52}
function ensure(doc,h=70){if(doc.y+h>doc.page.height-doc.page.margins.bottom)doc.addPage()}
function row(doc,left,right,sub=''){ensure(doc,58);const x=doc.x,y=doc.y,w=doc.page.width-doc.page.margins.left-doc.page.margins.right;doc.roundedRect(x,y,w,50,7).lineWidth(.5).stroke(C.line);doc.font('bold').fillColor(C.ink).fontSize(10).text(left,x+10,y+8,{width:w*.43});if(sub)doc.font('regular').fillColor(C.muted).fontSize(8).text(`[${sub}]`,x+10,y+25,{width:w*.43});doc.font('regular').fillColor(C.ink).fontSize(9).text(right,x+w*.48,y+9,{width:w*.49-10});doc.y=y+57}

const alphabet=[['A','а'],['B','бэ'],['C','цэ'],['D','дэ'],['E','э'],['F','эф'],['G','гэ'],['H','ха'],['I','и'],['J','йот'],['K','ка'],['L','эль'],['M','эм'],['N','эн'],['O','о'],['P','пэ'],['Q','ку'],['R','эр'],['S','эс'],['T','тэ'],['U','у'],['V','фау'],['W','вэ'],['X','икс'],['Y','ипсилон'],['Z','цэт'],['Ä','э (умляут)'],['Ö','ö'],['Ü','ü'],['ß','эс-цэт']];
let d=docFor('otto-a1-alphabet.pdf','Алфавит A1','Быстрое повторение для spelling в Sprechen');callout(d,'Русская запись — только подсказка. Основной ориентир произношения в приложении — немецкое аудио de-DE.');for(const [a,b] of alphabet)row(d,a,b);h(d,'Потренируй по буквам');bullets(d,['имя','фамилию','город','страну']);d.end();

const verbs=[['sein','быть · ich bin','зайн'],['haben','иметь · ich habe','хабэн'],['heißen','называться · ich heiße …','хайсэн'],['kommen','приходить / приезжать · ich komme aus …','комэн'],['wohnen','жить · ich wohne in …','вонэн'],['sprechen','говорить · ich spreche Deutsch','шпрэхэн'],['lernen','учить · ich lerne Deutsch','лернэн'],['arbeiten','работать','арбайтэн'],['machen','делать · Was machen Sie?','махэн'],['gehen','идти','геэн'],['fahren','ехать · mit dem Bus fahren','фарэн'],['können','мочь · ich kann','кёнэн'],['müssen','быть должным · ich muss','мюсэн'],['möchten','хотеть вежливо · ich möchte','мёхтэн'],['wollen','хотеть · ich will','волэн'],['helfen','помогать','хэльфэн'],['treffen','встречаться','трэфэн'],['besuchen','посещать','бэзухэн'],['schreiben','писать','шрайбэн'],['lesen','читать','лезэн'],['brauchen','нуждаться · ich brauche','браухэн'],['finden','находить · Wo finde ich …?','финдэн'],['kaufen','покупать','кауфэн'],['bezahlen','платить','бэцален']];
d=docFor('otto-a1-verbs.pdf','Основные глаголы A1','Самые нужные глаголы для коротких понятных фраз');callout(d,'Учите глагол вместе с одной безопасной формой, а не как длинную таблицу спряжения.');for(const [a,b,c] of verbs)row(d,a,b,c);d.end();

const pronouns=[['ich','я','их'],['du','ты','ду'],['er','он','эа'],['sie','она','зи'],['es','оно','эс'],['wir','мы','виа'],['ihr','вы (мн., неформ.)','иа'],['sie','они','зи'],['Sie','Вы (вежливо)','зи']];const qwords=[['Wer?','Кто?','вэа'],['Was?','Что?','вас'],['Wo?','Где?','во'],['Wohin?','Куда?','вохин'],['Woher?','Откуда?','вохэа'],['Wann?','Когда?','ван'],['Wie?','Как?','ви'],['Warum?','Почему?','варум'],['Wie viel?','Сколько?','ви филь'],['Wie lange?','Как долго?','ви лангэ']];const qbases=[['Haben Sie ...?','У Вас есть ...?'],['Können Sie ...?','Вы можете ...?'],['Möchten Sie ...?','Вы хотите ...?'],['Sind Sie ...?','Вы ...?'],['Gibt es ...?','Есть ли ...?'],['Wie viel kostet ...?','Сколько стоит ...?']];
d=docFor('otto-a1-pronouns-questions.pdf','Местоимения + вопросы A1','Быстрое повторение для Lesen, Schreiben и Sprechen');h(d,'Местоимения');for(const [a,b,c] of pronouns)row(d,a,b,c);h(d,'Вопросительные слова');for(const [a,b,c] of qwords)row(d,a,b,c);h(d,'Готовые основы вопроса');for(const [a,b] of qbases)row(d,a,b);d.end();

const vocab={
'Люди и семья':[['die Familie','семья · mit der Familie','ди фамилиэ'],['der Mann','мужчина / муж','дэа ман'],['die Frau','женщина / жена','ди фрау'],['das Kind','ребёнок','дас кинд'],['der Freund','друг','дэа фройнд']],
'Дом':[['die Wohnung','квартира','ди вонунг'],['das Zimmer','комната','дас цимма'],['die Küche','кухня','ди кюхэ'],['das Bad','ванная','дас бат'],['die Adresse','адрес','ди адрэсэ']],
'Город':[['der Bahnhof','вокзал · zum Bahnhof fahren','дэа банхоф'],['die Apotheke','аптека','ди апотэкэ'],['die Post','почта','ди пост'],['die Bank','банк','ди банк'],['die Straße','улица','ди штрасэ']],
'Транспорт':[['der Bus','автобус · mit dem Bus','дэа бус'],['der Zug','поезд','дэа цуг'],['die Haltestelle','остановка','ди хальтэштэлэ'],['das Taxi','такси','дас такси'],['der Flughafen','аэропорт','дэа флукхафэн']],
'Работа и учёба':[['die Arbeit','работа','ди арбайт'],['der Beruf','профессия','дэа бэруф'],['die Schule','школа','ди шулэ'],['der Kurs','курс','дэа курс'],['die Prüfung','экзамен','ди прюфунг']],
'Покупки':[['der Preis','цена','дэа прайс'],['die Kasse','касса','ди касэ'],['das Geld','деньги','дас гэльт'],['kosten','стоить · Wie viel kostet …?','костэн'],['kaufen','покупать','кауфэн']],
'Еда':[['das Brot','хлеб','дас брот'],['das Wasser','вода','дас васа'],['der Kaffee','кофе','дэа кафэ'],['das Frühstück','завтрак','дас фрюштюк'],['das Restaurant','ресторан','дас рэстораң']],
'Здоровье':[['der Arzt','врач','дэа арцт'],['die Apotheke','аптека','ди апотэкэ'],['krank','больной','кранк'],['der Termin','запись / встреча','дэа тэрмин'],['helfen','помогать','хэльфэн']],
'Путешествия':[['das Hotel','отель','дас хотэль'],['die Fahrkarte','билет','ди фаркартэ'],['der Urlaub','отпуск','дэа урлауп'],['reisen','путешествовать','райзэн'],['reservieren','бронировать','рэзэрвирэн']],
'Время и даты':[['Montag','понедельник · am Montag','монтаг'],['heute','сегодня','хойтэ'],['morgen','завтра / утром','моргэн'],['die Uhrzeit','время на часах','ди уацайт'],['das Datum','дата','дас датум']],
'Экзаменационные слова':[['die Aufgabe','задание','ди ауфгабэ'],['richtig','верно','рихтих'],['falsch','неверно','фальш'],['ankreuzen','отметить крестиком','анкройцэн'],['ausfüllen','заполнить','аусфюлэн']]};
d=docFor('otto-a1-vocabulary-minimum.pdf','Лексика-минимум A1','Тематические слова, которые часто нужны в заданиях');callout(d,'Существительные учите вместе с артиклем. Аудио в приложении важнее русской транскрипции.');for(const [group,items] of Object.entries(vocab)){h(d,group);for(const [a,b,c] of items)row(d,a,b,c)}d.end();

d=docFor('otto-a1-schreiben.pdf','Schreiben A1','Формула письма и надёжные готовые конструкции');callout(d,'Актуальный Goethe A1: Schreiben состоит из двух частей — Formular и короткий текст.');h(d,'Главная формула');p(d,'ОБРАЩЕНИЕ → 3 ПУНКТА → ЗАКЛЮЧЕНИЕ → ПРОЩАНИЕ → ИМЯ',{bold:true});h(d,'Экзаменационный принцип');p(d,'1 пункт задания = 1 простая понятная фраза. Используйте слова из задания, если они подходят. Не усложняйте немецкий ради красоты.',{bold:true});h(d,'Formular');bullets(d,['Берите данные только из ситуации.','Проверяйте имя, число, дату, адрес и другие конкретные поля.']);for(const [title,lines] of [['Приглашение',['Ich möchte Sie/dich einladen.','Haben Sie/Hast du am Montag Zeit?']],['Благодарность',['Vielen Dank für Ihre/deine Nachricht.','Vielen Dank für die Einladung.']],['Не могу прийти',['Ich kann leider nicht kommen.','Ich habe leider keine Zeit.']],['Запись на курс',['Ich möchte mich für den Kurs anmelden.','Wann beginnt der Kurs?','Wie viel kostet der Kurs?']],['Запрос информации',['Können Sie mir Informationen schicken?','Ich freue mich auf Ihre Antwort.']],['Время встречи',['Wann können wir uns treffen?','Ich kann am Montag um 18 Uhr.']],['Гостиница',['Ich möchte ein Zimmer reservieren.','Haben Sie ein Zimmer frei?']],['Официально',['Sehr geehrte Damen und Herren,','Mit freundlichen Grüßen']],['Лично',['Liebe …, / Lieber …,','Viele Grüße / Liebe Grüße']]]){h(d,title);bullets(d,lines)}h(d,'Перед отправкой');bullets(d,['Есть ли обращение?','Закрыты ли все 3 пункта?','Есть ли завершение/прощание?','Поставлено ли имя?']);d.end();

d=docFor('otto-a1-sprechen.pdf','Sprechen A1','О себе · вопросы · просьбы и реакции');callout(d,'Актуальный Goethe A1: Sprechen состоит из трёх частей.');h(d,'TEIL 1 · О себе');bullets(d,['Name','Alter','Land','Wohnort','Sprachen','Beruf','Hobby','Spelling имени, фамилии, города и страны','Телефонный номер / индекс']);h(d,'TEIL 2 · Задать вопрос');for(const [a,b] of qbases)row(d,a,b);h(d,'TEIL 3 · Просьба');for(const [a,b] of [['Bringen Sie mir bitte …','Принесите мне, пожалуйста, …'],['Geben Sie mir bitte …','Дайте мне, пожалуйста, …'],['Öffnen Sie bitte …','Откройте, пожалуйста, …'],['Können Sie bitte …?','Вы можете, пожалуйста, …?'],['Ja, gerne.','Да, с удовольствием.'],['Ja, natürlich.','Да, конечно.'],['Kein Problem.','Без проблем.']])row(d,a,b);d.end();

d=docFor('otto-a1-hoeren.pdf','Hören A1','Числа, время, ключевые слова и экзаменационные ловушки');callout(d,'Формат сверено по официальному Goethe-Institut Start Deutsch 1 Modellsatz.');h(d,'Как слушать');bullets(d,['Сначала прочитайте вопрос и поймите, что именно нужно услышать.','Не выбирайте ответ только из-за знакомого слова.','Следите за nicht / kein / aber / leider.','Отличайте первое предложение от окончательного решения.','Числа, время, цены, даты и телефон слушайте особенно внимательно.']);h(d,'Сколько раз звучит текст');row(d,'Teil 1','каждый текст дважды');row(d,'Teil 2','каждый текст один раз');row(d,'Teil 3','каждый текст дважды');h(d,'Числа и время');bullets(d,['13 / 30 · 14 / 40 · 19 / 90 — не путать окончания.','8:30 = halb neun; 8:45 = Viertel vor neun; 9:15 = Viertel nach neun.','Цена: слушайте Euro и Cent отдельно.','Телефон: повторяйте цифры небольшими группами.','Дата: ловите число + месяц.']);h(d,'Слова, которые меняют смысл');for(const [a,b] of [['nicht','не'],['kein / keine','нет / никакой'],['aber','но'],['leider','к сожалению'],['doch','всё-таки / же'],['sondern','а наоборот'],['zuerst','сначала'],['dann','затем']])row(d,a,b);d.end();

console.log('OTTO reference PDFs generated:',fs.readdirSync(outDir).filter(name=>name.endsWith('.pdf')).sort().join(', '));
