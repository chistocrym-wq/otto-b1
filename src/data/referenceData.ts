export type ReferencePageId = 'vocab'|'alphabet'|'verbs'|'pronouns'|'questions'|'constructions'|'numbers'|'grammar'|'lesen'|'horen'|'schreiben'|'sprechen';
export interface ReferenceWord { de:string; transcript:string; ru:string; example?:string }
export interface ReferenceCategory { id:ReferencePageId; title:string; copy:string; tags:string[]; keywords:string }

export const VOCAB_GROUPS:Record<string,ReferenceWord[]> = {
  'Люди и семья': [
    {de:'die Familie',transcript:'ди фамилиэ',ru:'семья',example:'mit der Familie'},
    {de:'der Mann',transcript:'дэа ман',ru:'мужчина / муж',example:'mein Mann'},
    {de:'die Frau',transcript:'ди фрау',ru:'женщина / жена',example:'meine Frau'},
    {de:'das Kind',transcript:'дас кинд',ru:'ребёнок',example:'ein Kind'},
    {de:'der Freund',transcript:'дэа фройнд',ru:'друг',example:'mein Freund'},
  ],
  'Дом': [
    {de:'die Wohnung',transcript:'ди вонунг',ru:'квартира',example:'in der Wohnung'},
    {de:'das Zimmer',transcript:'дас цимма',ru:'комната',example:'Zimmer 12'},
    {de:'die Küche',transcript:'ди кюхэ',ru:'кухня',example:'in der Küche'},
    {de:'das Bad',transcript:'дас бат',ru:'ванная',example:'das Bad ist frei'},
    {de:'die Adresse',transcript:'ди адрэсэ',ru:'адрес',example:'meine Adresse'},
  ],
  'Город': [
    {de:'der Bahnhof',transcript:'дэа банхоф',ru:'вокзал',example:'zum Bahnhof fahren'},
    {de:'die Apotheke',transcript:'ди апотэкэ',ru:'аптека',example:'zur Apotheke gehen'},
    {de:'die Post',transcript:'ди пост',ru:'почта',example:'bei der Post'},
    {de:'die Bank',transcript:'ди банк',ru:'банк',example:'zur Bank gehen'},
    {de:'die Straße',transcript:'ди штрасэ',ru:'улица',example:'in der Straße'},
  ],
  'Транспорт': [
    {de:'der Bus',transcript:'дэа бус',ru:'автобус',example:'mit dem Bus'},
    {de:'der Zug',transcript:'дэа цуг',ru:'поезд',example:'mit dem Zug'},
    {de:'die Haltestelle',transcript:'ди хальтэштэлэ',ru:'остановка',example:'an der Haltestelle'},
    {de:'das Taxi',transcript:'дас такси',ru:'такси',example:'mit dem Taxi'},
    {de:'der Flughafen',transcript:'дэа флукхафэн',ru:'аэропорт',example:'am Flughafen'},
  ],
  'Работа и учёба': [
    {de:'die Arbeit',transcript:'ди арбайт',ru:'работа',example:'bei der Arbeit'},
    {de:'der Beruf',transcript:'дэа бэруф',ru:'профессия',example:'mein Beruf'},
    {de:'die Schule',transcript:'ди шулэ',ru:'школа',example:'in der Schule'},
    {de:'der Kurs',transcript:'дэа курс',ru:'курс',example:'Deutsch-Kurs'},
    {de:'die Prüfung',transcript:'ди прюфунг',ru:'экзамен',example:'die Prüfung machen'},
  ],
  'Покупки': [
    {de:'der Preis',transcript:'дэа прайс',ru:'цена',example:'der Preis ist …'},
    {de:'die Kasse',transcript:'ди касэ',ru:'касса',example:'an der Kasse'},
    {de:'das Geld',transcript:'дас гэльт',ru:'деньги',example:'Geld bezahlen'},
    {de:'kosten',transcript:'костэн',ru:'стоить',example:'Wie viel kostet …?'},
    {de:'kaufen',transcript:'кауфэн',ru:'покупать',example:'ich kaufe …'},
  ],
  'Еда': [
    {de:'das Brot',transcript:'дас брот',ru:'хлеб',example:'Brot kaufen'},
    {de:'das Wasser',transcript:'дас васа',ru:'вода',example:'ein Glas Wasser'},
    {de:'der Kaffee',transcript:'дэа кафэ',ru:'кофе',example:'einen Kaffee'},
    {de:'das Frühstück',transcript:'дас фрюштюк',ru:'завтрак',example:'zum Frühstück'},
    {de:'das Restaurant',transcript:'дас рэстораң',ru:'ресторан',example:'im Restaurant'},
  ],
  'Здоровье': [
    {de:'der Arzt',transcript:'дэа арцт',ru:'врач',example:'zum Arzt gehen'},
    {de:'die Apotheke',transcript:'ди апотэкэ',ru:'аптека',example:'in der Apotheke'},
    {de:'krank',transcript:'кранк',ru:'больной',example:'ich bin krank'},
    {de:'der Termin',transcript:'дэа тэрмин',ru:'запись / встреча',example:'einen Termin haben'},
    {de:'helfen',transcript:'хэльфэн',ru:'помогать',example:'Können Sie mir helfen?'},
  ],
  'Путешествия': [
    {de:'das Hotel',transcript:'дас хотэль',ru:'отель',example:'im Hotel'},
    {de:'die Fahrkarte',transcript:'ди фаркартэ',ru:'билет',example:'eine Fahrkarte kaufen'},
    {de:'der Urlaub',transcript:'дэа урлауп',ru:'отпуск',example:'im Urlaub'},
    {de:'reisen',transcript:'райзэн',ru:'путешествовать',example:'nach Berlin reisen'},
    {de:'reservieren',transcript:'рэзэрвирэн',ru:'бронировать',example:'ein Zimmer reservieren'},
  ],
  'Время и даты': [
    {de:'Montag',transcript:'монтаг',ru:'понедельник',example:'am Montag'},
    {de:'heute',transcript:'хойтэ',ru:'сегодня',example:'heute Abend'},
    {de:'morgen',transcript:'моргэн',ru:'завтра / утром',example:'morgen früh'},
    {de:'die Uhrzeit',transcript:'ди уацайт',ru:'время на часах',example:'Welche Uhrzeit?'},
    {de:'das Datum',transcript:'дас датум',ru:'дата',example:'Welches Datum?'},
  ],
  'Экзаменационные слова': [
    {de:'die Aufgabe',transcript:'ди ауфгабэ',ru:'задание',example:'Aufgabe 1'},
    {de:'richtig',transcript:'рихтих',ru:'верно',example:'Richtig oder falsch?'},
    {de:'falsch',transcript:'фальш',ru:'неверно',example:'Richtig oder falsch?'},
    {de:'ankreuzen',transcript:'анкройцэн',ru:'отметить крестиком',example:'Antwort ankreuzen'},
    {de:'ausfüllen',transcript:'аусфюлэн',ru:'заполнить',example:'Formular ausfüllen'},
  ],
};

export const VERBS:ReferenceWord[] = [
  {de:'sein',transcript:'зайн',ru:'быть',example:'ich bin — я / я есть'},
  {de:'haben',transcript:'хабэн',ru:'иметь',example:'ich habe — у меня есть'},
  {de:'heißen',transcript:'хайсэн',ru:'называться',example:'ich heiße …'},
  {de:'kommen',transcript:'комэн',ru:'приходить / приезжать',example:'ich komme aus …'},
  {de:'wohnen',transcript:'вонэн',ru:'жить / проживать',example:'ich wohne in …'},
  {de:'leben',transcript:'лебэн',ru:'жить',example:'ich lebe in …'},
  {de:'sprechen',transcript:'шпрэхэн',ru:'говорить',example:'ich spreche Deutsch'},
  {de:'lernen',transcript:'лернэн',ru:'учить / изучать',example:'ich lerne Deutsch'},
  {de:'arbeiten',transcript:'арбайтэн',ru:'работать',example:'ich arbeite …'},
  {de:'machen',transcript:'махэн',ru:'делать',example:'Was machen Sie?'},
  {de:'gehen',transcript:'геэн',ru:'идти',example:'ich gehe nach Hause'},
  {de:'fahren',transcript:'фарэн',ru:'ехать',example:'ich fahre mit dem Bus'},
  {de:'bleiben',transcript:'бляйбэн',ru:'оставаться',example:'ich bleibe zu Hause'},
  {de:'essen',transcript:'эсэн',ru:'есть',example:'ich esse gern …'},
  {de:'trinken',transcript:'тринкэн',ru:'пить',example:'ich trinke Wasser'},
  {de:'kaufen',transcript:'кауфэн',ru:'покупать',example:'ich kaufe …'},
  {de:'bezahlen',transcript:'бэцален',ru:'платить',example:'ich bezahle …'},
  {de:'finden',transcript:'финдэн',ru:'находить',example:'Wo finde ich …?'},
  {de:'suchen',transcript:'зухэн',ru:'искать',example:'ich suche …'},
  {de:'brauchen',transcript:'браухэн',ru:'нуждаться / нуждаться в',example:'ich brauche …'},
  {de:'mögen',transcript:'мёгэн',ru:'любить / нравиться',example:'ich mag …'},
  {de:'möchten',transcript:'мёхтэн',ru:'хотеть вежливо',example:'ich möchte — я хотел(а) бы'},
  {de:'können',transcript:'кёнэн',ru:'мочь',example:'ich kann — я могу'},
  {de:'müssen',transcript:'мюсэн',ru:'быть должным / быть вынужденным',example:'ich muss — мне нужно'},
  {de:'wollen',transcript:'волэн',ru:'хотеть',example:'ich will …'},
  {de:'helfen',transcript:'хэльфэн',ru:'помогать',example:'Können Sie mir helfen?'},
  {de:'treffen',transcript:'трэфэн',ru:'встречать(ся)',example:'wir treffen uns …'},
  {de:'besuchen',transcript:'бэзухэн',ru:'посещать',example:'ich besuche …'},
  {de:'schreiben',transcript:'шрайбэн',ru:'писать',example:'ich schreibe eine E-Mail'},
  {de:'lesen',transcript:'лезэн',ru:'читать',example:'ich lese den Text'},
];

export const ALPHABET = [
  {letter:'A',transcript:'а'},{letter:'B',transcript:'бэ'},{letter:'C',transcript:'цэ'},{letter:'D',transcript:'дэ'},
  {letter:'E',transcript:'э'},{letter:'F',transcript:'эф'},{letter:'G',transcript:'гэ'},{letter:'H',transcript:'ха'},
  {letter:'I',transcript:'и'},{letter:'J',transcript:'йот'},{letter:'K',transcript:'ка'},{letter:'L',transcript:'эль'},
  {letter:'M',transcript:'эм'},{letter:'N',transcript:'эн'},{letter:'O',transcript:'о'},{letter:'P',transcript:'пэ'},
  {letter:'Q',transcript:'ку'},{letter:'R',transcript:'эр'},{letter:'S',transcript:'эс'},{letter:'T',transcript:'тэ'},
  {letter:'U',transcript:'у'},{letter:'V',transcript:'фау'},{letter:'W',transcript:'вэ'},{letter:'X',transcript:'икс'},
  {letter:'Y',transcript:'ипсилон'},{letter:'Z',transcript:'цэт'},{letter:'Ä',transcript:'э (умляут)'},
  {letter:'Ö',transcript:'ё / ö'},{letter:'Ü',transcript:'ю / ü'},{letter:'ß',transcript:'эс-цэт'},
];

export const PRONOUNS = [
  {de:'ich',transcript:'их',ru:'я'},{de:'du',transcript:'ду',ru:'ты'},{de:'er',transcript:'эа',ru:'он'},
  {de:'sie',transcript:'зи',ru:'она'},{de:'es',transcript:'эс',ru:'оно'},{de:'wir',transcript:'виа',ru:'мы'},
  {de:'ihr',transcript:'иа',ru:'вы (мн., неформ.)'},{de:'sie',transcript:'зи',ru:'они'},{de:'Sie',transcript:'зи',ru:'Вы (вежливо)'},
];

export const QUESTION_WORDS = [
  {de:'Wer?',transcript:'вэа',ru:'Кто?'},{de:'Was?',transcript:'вас',ru:'Что?'},{de:'Wo?',transcript:'во',ru:'Где?'},
  {de:'Wohin?',transcript:'вохин',ru:'Куда?'},{de:'Woher?',transcript:'вохэа',ru:'Откуда?'},{de:'Wann?',transcript:'ван',ru:'Когда?'},
  {de:'Wie?',transcript:'ви',ru:'Как?'},{de:'Warum?',transcript:'варум',ru:'Почему?'},{de:'Wie viel?',transcript:'ви филь',ru:'Сколько?'},
  {de:'Wie lange?',transcript:'ви лангэ',ru:'Как долго?'},
];

export const QUESTION_BASES = [
  {de:'Haben Sie ...?',ru:'У Вас есть ...?'},{de:'Können Sie ...?',ru:'Вы можете ...?'},{de:'Möchten Sie ...?',ru:'Вы хотите ...?'},
  {de:'Sind Sie ...?',ru:'Вы ...?'},{de:'Gibt es ...?',ru:'Есть ли ...?'},{de:'Wie viel kostet ...?',ru:'Сколько стоит ...?'},
];

export const CONSTRUCTIONS = [
  {de:'Ich möchte ...',ru:'Я хотел(а) бы ...'},{de:'Ich kann ...',ru:'Я могу ...'},{de:'Ich muss ...',ru:'Мне нужно / я должен(на) ...'},
  {de:'Ich brauche ...',ru:'Мне нужно ...'},{de:'Können Sie bitte ...?',ru:'Вы можете, пожалуйста, ...?'},{de:'Ich hätte gern ...',ru:'Я хотел(а) бы ...'},
  {de:'Wie viel kostet ...?',ru:'Сколько стоит ...?'},{de:'Wann beginnt ...?',ru:'Когда начинается ...?'},{de:'Wo finde ich ...?',ru:'Где я найду ...?'},
];

export const MEANING_CHANGERS = [
  {de:'nicht',ru:'не'},{de:'kein / keine',ru:'нет / никакой'},{de:'aber',ru:'но'},{de:'leider',ru:'к сожалению'},
  {de:'doch',ru:'всё-таки / же'},{de:'sondern',ru:'а наоборот'},{de:'zuerst',ru:'сначала'},{de:'dann',ru:'затем'},
];

export const BASE_CATEGORIES:ReferenceCategory[] = [
  {id:'vocab',title:'Лексика A1',copy:'Тематический словарь: семья, дом, город, транспорт, работа, покупки и другое.',tags:['Нужно всем'],keywords:'слова словарь лексика семья дом город транспорт работа учеба покупки еда здоровье путешествия'},
  {id:'alphabet',title:'Алфавит',copy:'Буквы, произношение и spelling имени, фамилии, города и страны.',tags:['Нужно всем','Для Sprechen'],keywords:'буквы spelling имя фамилия город страна'},
  {id:'verbs',title:'Основные глаголы',copy:'Самые нужные A1-глаголы с переводом, подсказкой и короткой формой.',tags:['Нужно всем'],keywords:'sein haben heißen kommen wohnen können müssen möchten'},
  {id:'pronouns',title:'Местоимения',copy:'ich, du, er, sie, es, wir, ihr, sie, Sie — быстрое повторение.',tags:['Нужно всем'],keywords:'ich du er sie es wir ihr местоимения'},
  {id:'questions',title:'Вопросительные слова',copy:'Wer? Was? Wo? Wohin? Woher? Wann? Wie? и готовые основы вопросов.',tags:['Нужно всем','Для Sprechen'],keywords:'wer was wo wohin woher wann wie warum вопрос'},
  {id:'constructions',title:'Полезные конструкции',copy:'Надёжные A1-фразы и слова, которые меняют смысл.',tags:['Нужно всем','Для Hören'],keywords:'ich möchte können sie nicht kein aber leider doch sondern'},
  {id:'numbers',title:'Числа, время и даты',copy:'Числа, цены, телефон, часы, дни недели и даты.',tags:['Нужно всем','Для Hören'],keywords:'числа время даты цены телефон дни недели uhr euro'},
  {id:'grammar',title:'Грамматика-минимум',copy:'Только то, что помогает строить простые понятные фразы A1.',tags:['Нужно всем'],keywords:'грамматика порядок слов артикль отрицание модальные'},
];

export const MODULE_CATEGORIES:ReferenceCategory[] = [
  {id:'lesen',title:'Lesen',copy:'Teil 1 / 2 / 3: как искать доказательство и не переводить всё подряд.',tags:['Для Lesen'],keywords:'lesen чтение teil richtig falsch объявления'},
  {id:'horen',title:'Hören',copy:'Стратегия, числа, время, отрицания и повороты смысла.',tags:['Для Hören'],keywords:'hören аудирование числа время leider aber nicht'},
  {id:'schreiben',title:'Schreiben',copy:'Formular, письмо, формула, готовые конструкции и финальная проверка.',tags:['Для Schreiben'],keywords:'schreiben письмо formular обращение фразы'},
  {id:'sprechen',title:'Sprechen',copy:'Teil 1 / 2 / 3: о себе, вопросы, просьбы и короткие реакции.',tags:['Для Sprechen'],keywords:'sprechen говорить просьбы вопросы о себе'},
];

export const PDFS:Partial<Record<ReferencePageId,string>> = {
  alphabet:'/pdf/otto-a1-alphabet.pdf',verbs:'/pdf/otto-a1-verbs.pdf',pronouns:'/pdf/otto-a1-pronouns-questions.pdf',
  questions:'/pdf/otto-a1-pronouns-questions.pdf',vocab:'/pdf/otto-a1-vocabulary-minimum.pdf',schreiben:'/pdf/otto-a1-schreiben.pdf',
  sprechen:'/pdf/otto-a1-sprechen.pdf',horen:'/pdf/otto-a1-hoeren.pdf',numbers:'/pdf/otto-a1-hoeren.pdf',constructions:'/pdf/otto-a1-hoeren.pdf',
};
