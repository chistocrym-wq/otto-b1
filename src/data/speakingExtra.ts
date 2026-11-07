export interface SpeakingExtraPrompt {
  id: string;
  label: string;
  question: string;
  questionRu: string;
  sample: string;
  sampleRu: string;
  guide: string;
}

export const speakingExtraPrompts: SpeakingExtraPrompt[] = [
  {"id":"name","label":"Имя","question":"Wie heißen Sie?","questionRu":"Как Вас зовут?","sample":"Ich heiße Anna.","sampleRu":"Меня зовут Анна.","guide":"Скажите: Ich heiße ..."},
  {"id":"surname","label":"Фамилия","question":"Wie ist Ihr Familienname?","questionRu":"Какая у Вас фамилия?","sample":"Mein Familienname ist Petrova.","sampleRu":"Моя фамилия Петрова.","guide":"Скажите: Mein Familienname ist ..."},
  {"id":"spell","label":"Имя по буквам","question":"Können Sie bitte Ihren Namen buchstabieren?","questionRu":"Можете назвать Ваше имя по буквам?","sample":"A – N – N – A.","sampleRu":"А – Н – Н – А.","guide":"Произнесите каждую букву отдельно и спокойно."},
  {"id":"spell-surname","label":"Фамилия по буквам","question":"Buchstabieren Sie bitte Ihren Familiennamen.","questionRu":"Назовите, пожалуйста, Вашу фамилию по буквам.","sample":"P – E – T – R – O – V – A.","sampleRu":"П – Е – Т – Р – О – В – А.","guide":"Не торопитесь: произносите по одной букве."},
  {"id":"phone","label":"Телефон","question":"Wie ist Ihre Telefonnummer?","questionRu":"Какой у Вас номер телефона?","sample":"Meine Telefonnummer ist null eins sieben sechs – drei vier fünf – sechs sieben acht.","sampleRu":"Мой номер телефона: 0176 345 678.","guide":"Произносите цифры по одной."},
  {"id":"birthdate","label":"Дата рождения","question":"Wann sind Sie geboren?","questionRu":"Когда Вы родились?","sample":"Ich bin am vierzehnten März neunzehnhundertfünfundneunzig geboren.","sampleRu":"Я родился / родилась 14 марта 1995 года.","guide":"Сначала день, затем месяц и год."},
  {"id":"address","label":"Адрес","question":"Wie ist Ihre Adresse?","questionRu":"Какой у Вас адрес?","sample":"Ich wohne in der Gartenstraße 12.","sampleRu":"Я живу на Гартенштрассе, 12.","guide":"Скажите улицу и номер дома."},
  {"id":"postcode","label":"Индекс","question":"Wie ist Ihre Postleitzahl?","questionRu":"Какой у Вас почтовый индекс?","sample":"Meine Postleitzahl ist eins null eins eins fünf.","sampleRu":"Мой индекс — 10115.","guide":"Произнесите цифры по одной."},
  {"id":"city","label":"Город","question":"Wo wohnen Sie?","questionRu":"Где Вы живёте?","sample":"Ich wohne in Berlin.","sampleRu":"Я живу в Берлине.","guide":"Скажите: Ich wohne in ..."},
  {"id":"spell-city","label":"Город по буквам","question":"Können Sie bitte Ihren Wohnort buchstabieren?","questionRu":"Можете назвать Ваш город по буквам?","sample":"B – E – R – L – I – N.","sampleRu":"Б – Е – Р – Л – И – Н.","guide":"Произнесите название города по одной букве."},
  {"id":"country","label":"Страна","question":"Woher kommen Sie?","questionRu":"Откуда Вы?","sample":"Ich komme aus Russland.","sampleRu":"Я из России.","guide":"Скажите: Ich komme aus ..."},
  {"id":"age","label":"Возраст","question":"Wie alt sind Sie?","questionRu":"Сколько Вам лет?","sample":"Ich bin 34 Jahre alt.","sampleRu":"Мне 34 года.","guide":"Скажите: Ich bin ... Jahre alt."},
  {"id":"job","label":"Профессия","question":"Was sind Sie von Beruf?","questionRu":"Кто Вы по профессии?","sample":"Ich bin Verkäuferin.","sampleRu":"Я продавец.","guide":"Скажите: Ich bin ..."},
  {"id":"languages","label":"Языки","question":"Welche Sprachen sprechen Sie?","questionRu":"На каких языках Вы говорите?","sample":"Ich spreche Russisch und ein bisschen Deutsch.","sampleRu":"Я говорю по-русски и немного по-немецки.","guide":"Скажите: Ich spreche ..."},
  {"id":"family","label":"Семейное положение","question":"Sind Sie verheiratet?","questionRu":"Вы женаты / замужем?","sample":"Ja, ich bin verheiratet.","sampleRu":"Да, я замужем / женат.","guide":"Можно ответить: Ja, ich bin verheiratet. / Nein, ich bin ledig."},
  {"id":"children","label":"Семья","question":"Haben Sie Kinder?","questionRu":"У Вас есть дети?","sample":"Ja, ich habe zwei Kinder.","sampleRu":"Да, у меня двое детей.","guide":"Скажите: Ich habe ... Kinder. / Nein, ich habe keine Kinder."},
  {"id":"home","label":"Где живёте","question":"Mit wem wohnen Sie?","questionRu":"С кем Вы живёте?","sample":"Ich wohne mit meiner Familie.","sampleRu":"Я живу со своей семьёй.","guide":"Скажите: Ich wohne mit ..."},
  {"id":"origin","label":"Откуда приехали","question":"Aus welcher Stadt kommen Sie?","questionRu":"Из какого города Вы приехали?","sample":"Ich komme aus Moskau.","sampleRu":"Я из Москвы.","guide":"Скажите: Ich komme aus ..."}
];
