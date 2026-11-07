export interface FreeSpeakingTopic {
  id: string;
  title: string;
  titleRu: string;
  questions: string[];
  guide: string[];
  sample: string;
}

export const freeSpeakingTopics: FreeSpeakingTopic[] = [
  {
    id: 'free-wohnen',
    title: 'Mein Wohnort',
    titleRu: 'Место жительства',
    questions: ['Wo wohnen Sie?', 'Wie ist Ihre Wohnung?', 'Was gibt es in der Nähe?'],
    guide: [
      'Ich wohne in …',
      'Meine Wohnung / mein Haus ist …',
      'In der Nähe gibt es …',
      'Ich mag meinen Wohnort, weil …',
    ],
    sample: 'Ich wohne in Hamburg. Meine Wohnung ist klein, aber schön. Sie hat zwei Zimmer und eine Küche. In der Nähe gibt es einen Supermarkt, eine Apotheke und einen Park. Ich mag meinen Wohnort, weil alles in der Nähe ist.',
  },
  {
    id: 'free-familie',
    title: 'Meine Familie',
    titleRu: 'Моя семья',
    questions: ['Wie groß ist Ihre Familie?', 'Was machen Ihre Familienmitglieder?', 'Was machen Sie gern zusammen?'],
    guide: [
      'Meine Familie ist …',
      'Ich habe …',
      'Meine / Mein … arbeitet als …',
      'Zusammen … wir gern …',
    ],
    sample: 'Meine Familie ist nicht sehr groß. Ich habe einen Sohn und eine Schwester. Meine Schwester arbeitet im Büro. Am Wochenende trinken wir zusammen Kaffee, gehen spazieren und sprechen viel.',
  },
  {
    id: 'free-arbeit',
    title: 'Meine Arbeit / mein Studium',
    titleRu: 'Работа / учёба',
    questions: ['Was machen Sie?', 'Wann arbeiten oder lernen Sie?', 'Was gefällt Ihnen daran?'],
    guide: [
      'Ich arbeite als … / Ich lerne …',
      'Ich arbeite / lerne von … bis …',
      'Bei der Arbeit …',
      'Ich mag …, weil …',
    ],
    sample: 'Ich arbeite als Verkäuferin. Ich arbeite von Montag bis Freitag. Meine Arbeit beginnt um neun Uhr. Ich spreche jeden Tag mit vielen Menschen. Das gefällt mir, weil die Arbeit interessant ist.',
  },
  {
    id: 'free-freizeit',
    title: 'Meine Freizeit',
    titleRu: 'Свободное время',
    questions: ['Was machen Sie in der Freizeit?', 'Wie oft machen Sie das?', 'Mit wem?'],
    guide: [
      'In meiner Freizeit …',
      'Ich … zweimal pro Woche.',
      'Am Wochenende …',
      'Oft mache ich das mit …',
    ],
    sample: 'In meiner Freizeit gehe ich gern ins Fitnessstudio. Ich trainiere zweimal pro Woche. Am Wochenende gehe ich oft spazieren oder treffe Freunde. Manchmal sehe ich abends einen Film.',
  },
  {
    id: 'free-alltag',
    title: 'Mein Alltag',
    titleRu: 'Мой обычный день',
    questions: ['Wann stehen Sie auf?', 'Was machen Sie am Vormittag?', 'Was machen Sie am Abend?'],
    guide: [
      'Ich stehe um … auf.',
      'Am Vormittag …',
      'Am Nachmittag …',
      'Am Abend …',
    ],
    sample: 'Ich stehe um sieben Uhr auf und frühstücke. Am Vormittag arbeite ich. Am Nachmittag kaufe ich ein oder mache Sport. Am Abend esse ich zu Hause und lese ein bisschen.',
  },
  {
    id: 'free-essen',
    title: 'Essen und Trinken',
    titleRu: 'Еда и напитки',
    questions: ['Was essen Sie gern?', 'Was trinken Sie?', 'Kochen Sie zu Hause?'],
    guide: [
      'Ich esse gern …',
      'Zum Frühstück …',
      'Ich trinke gern …',
      'Zu Hause koche ich …',
    ],
    sample: 'Ich esse gern Gemüse, Reis und Fisch. Zum Frühstück esse ich Brot und Käse. Ich trinke viel Wasser und morgens Kaffee. Zu Hause koche ich oft am Abend.',
  },
  {
    id: 'free-wochenende',
    title: 'Mein Wochenende',
    titleRu: 'Мои выходные',
    questions: ['Was machen Sie am Samstag?', 'Was machen Sie am Sonntag?', 'Treffen Sie Freunde oder Familie?'],
    guide: [
      'Am Samstag …',
      'Am Sonntag …',
      'Ich treffe …',
      'Wenn das Wetter gut ist, …',
    ],
    sample: 'Am Samstag schlafe ich etwas länger und gehe einkaufen. Am Nachmittag treffe ich Freunde. Am Sonntag besuche ich meine Familie. Wenn das Wetter gut ist, gehen wir zusammen spazieren.',
  },
  {
    id: 'free-urlaub',
    title: 'Mein Urlaub',
    titleRu: 'Мой отпуск',
    questions: ['Wohin fahren Sie gern?', 'Wie reisen Sie?', 'Was machen Sie im Urlaub?'],
    guide: [
      'Im Urlaub fahre ich gern nach …',
      'Ich reise mit …',
      'Dort … ich gern …',
      'Der Urlaub ist für mich …',
    ],
    sample: 'Im Urlaub fahre ich gern ans Meer. Ich reise meistens mit dem Zug oder mit dem Flugzeug. Dort schwimme ich, gehe spazieren und besuche Cafés. Urlaub ist für mich sehr wichtig.',
  },
];
