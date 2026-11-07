export type HorenTask =
  | {
      id: string;
      number: number;
      title: string;
      type: 'multiple-choice';
      instruction: string;
      audioText: string;
      prompt: string;
      options: string[];
      correctIndex: number;
    }
  | {
      id: string;
      number: number;
      title: string;
      type: 'true-false';
      instruction: string;
      audioText: string;
      prompt: string;
      correctAnswer: boolean;
    };

const ABC_INSTRUCTION =
  'Sie hören einen kurzen Text. Lesen Sie zuerst die Aufgabe. Hören Sie dann den Text.';

const TF_INSTRUCTION =
  'Sie hören einen kurzen Text. Lesen Sie zuerst die Aussage. Hören Sie dann den Text.';

export const listeningTasks: HorenTask[] = [
  {
    id: 'horen-001',
    number: 1,
    title: 'Telefonnachricht',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Anna: Hallo Julia, hier ist Anna. Ich komme heute etwas später. Der Bus hat Verspätung. Wir treffen uns um sechs Uhr vor dem Kino. Bis später!',
    prompt: 'Wann treffen sich Anna und Julia?',
    options: ['um fünf Uhr', 'um sechs Uhr', 'um sieben Uhr'],
    correctIndex: 1,
  },

  {
    id: 'horen-002',
    number: 2,
    title: 'Im Geschäft',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Verkäuferin: Guten Tag. Kann ich Ihnen helfen? Mann: Ja, ich suche ein T-Shirt für meine Tochter. Verkäuferin: Welche Größe braucht sie? Mann: Größe S. Haben Sie das T-Shirt auch in Rot? Verkäuferin: Ja, hier ist ein rotes T-Shirt.',
    prompt: 'Welche Farbe möchte der Mann?',
    options: ['Blau', 'Grün', 'Rot'],
    correctIndex: 2,
  },

  {
    id: 'horen-003',
    number: 3,
    title: 'Am Bahnhof',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Ansage: Achtung, bitte! Der Zug nach Köln fährt heute nicht von Gleis drei. Der Zug fährt von Gleis fünf. Die Abfahrt ist um zehn Uhr zwanzig.',
    prompt: 'Von welchem Gleis fährt der Zug nach Köln?',
    options: ['Gleis 3', 'Gleis 4', 'Gleis 5'],
    correctIndex: 2,
  },

  {
    id: 'horen-004',
    number: 4,
    title: 'In der Schule',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Lehrerin: Paul, hast du heute deine Hausaufgaben? Paul: Nein, leider nicht. Ich habe gestern lange gearbeitet. Lehrerin: Du arbeitest nach der Schule? Paul: Ja, ich helfe in einem Café.',
    prompt: 'Warum hat Paul keine Hausaufgaben?',
    options: ['Er war krank.', 'Er hat gearbeitet.', 'Er war bei einem Freund.'],
    correctIndex: 1,
  },

  {
    id: 'horen-005',
    number: 5,
    title: 'Telefonnachricht',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Lena: Hallo Maria, hier ist Lena. Ich kann heute nicht zum Sport kommen. Ich habe einen Termin beim Arzt. Wir sehen uns morgen. Tschüss!',
    prompt: 'Warum kann Lena heute nicht zum Sport kommen?',
    options: ['Sie arbeitet.', 'Sie hat einen Arzttermin.', 'Sie ist im Kino.'],
    correctIndex: 1,
  },

  {
    id: 'horen-006',
    number: 6,
    title: 'Kurzes Gespräch',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Sara: Was machst du heute Nachmittag? Tom: Ich gehe mit meiner Schwester ins Schwimmbad. Sara: Und wann kommst du zurück? Tom: Gegen sechs Uhr.',
    prompt: 'Tom geht heute Nachmittag ins Schwimmbad.',
    correctAnswer: true,
  },

  {
    id: 'horen-007',
    number: 7,
    title: 'Kurzes Gespräch',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Frau: Wann fährt der Bus nach Bonn? Mann: Um zwei Uhr. Frau: Fährt der nächste Bus auch nach Bonn? Mann: Nein, der nächste Bus fährt nach Köln.',
    prompt: 'Der nächste Bus fährt nach Bonn.',
    correctAnswer: false,
  },

  {
    id: 'horen-008',
    number: 8,
    title: 'Ansage im Supermarkt',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Ansage: Liebe Kunden, heute haben wir frische Äpfel im Angebot. Ein Kilo kostet nur zwei Euro. Die Äpfel finden Sie gleich am Eingang.',
    prompt: 'Ein Kilo Äpfel kostet zwei Euro.',
    correctAnswer: true,
  },

  {
    id: 'horen-009',
    number: 9,
    title: 'Kurzes Gespräch',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Anna: Hast du am Samstag Zeit? Paul: Leider nicht. Ich muss arbeiten. Anna: Schade. Dann vielleicht am Sonntag? Paul: Ja, am Sonntag habe ich Zeit.',
    prompt: 'Paul arbeitet am Sonntag.',
    correctAnswer: false,
  },

  {
    id: 'horen-010',
    number: 10,
    title: 'Telefonnachricht',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Max: Hallo Lisa, hier ist Max. Ich komme morgen um neun Uhr zu dir. Bitte vergiss nicht, den Schlüssel für mich zu lassen. Bis morgen!',
    prompt: 'Max kommt morgen um neun Uhr.',
    correctAnswer: true,
  },

  {
    id: 'horen-011',
    number: 11,
    title: 'Telefonnachricht',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Hallo Nina, hier ist Laura. Ich kann heute leider nicht zum Deutschkurs kommen. Meine kleine Schwester ist krank, und ich muss zu Hause bleiben. Morgen bin ich wieder im Kurs.',
    prompt: 'Warum kommt Laura heute nicht zum Deutschkurs?',
    options: ['Sie arbeitet.', 'Ihre Schwester ist krank.', 'Sie hat einen Arzttermin.'],
    correctIndex: 1,
  },

  {
    id: 'horen-012',
    number: 12,
    title: 'Im Café',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Kellnerin: Guten Tag. Was möchten Sie? Frau: Einen Kaffee, bitte. Kellnerin: Mit Milch? Frau: Ja, mit Milch und Zucker. Und ein Stück Kuchen, bitte.',
    prompt: 'Was bestellt die Frau?',
    options: ['Tee und Kuchen', 'Kaffee und Kuchen', 'Kaffee und Brot'],
    correctIndex: 1,
  },

  {
    id: 'horen-013',
    number: 13,
    title: 'Am Bahnhof',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Achtung, bitte! Der Zug nach Köln fährt heute von Gleis fünf. Die Abfahrt ist um zehn Uhr zwanzig. Bitte steigen Sie jetzt ein.',
    prompt: 'Von welchem Gleis fährt der Zug?',
    options: ['Gleis 3', 'Gleis 4', 'Gleis 5'],
    correctIndex: 2,
  },

  {
    id: 'horen-014',
    number: 14,
    title: 'Zu Hause',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Mutter: Tim, kannst du bitte den Tisch decken? Tim: Ja, gleich. Mutter: Und bring bitte die Gläser aus der Küche. Tim: Okay, Mama.',
    prompt: 'Was soll Tim bringen?',
    options: ['Teller', 'Gläser', 'Tassen'],
    correctIndex: 1,
  },

  {
    id: 'horen-015',
    number: 15,
    title: 'Telefonnachricht',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Hallo Emma, hier ist Sarah. Ich bin schon im Park. Ich sitze auf der Bank neben dem großen Baum. Komm bitte dorthin.',
    prompt: 'Wo wartet Sarah?',
    options: ['vor dem Café', 'neben dem großen Baum', 'an der Bushaltestelle'],
    correctIndex: 1,
  },

  {
    id: 'horen-016',
    number: 16,
    title: 'Im Supermarkt',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Mann: Entschuldigung, wo finde ich das Brot? Mitarbeiterin: Hinten links, neben der Milch. Mann: Und die Äpfel? Mitarbeiterin: Die finden Sie vorne am Eingang.',
    prompt: 'Wo ist das Brot?',
    options: ['hinten links', 'vorne rechts', 'neben dem Eingang'],
    correctIndex: 0,
  },

  {
    id: 'horen-017',
    number: 17,
    title: 'Das Wochenende',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Paul: Was machst du am Sonntag, Lisa? Lisa: Ich besuche meine Großeltern. Paul: Fährst du mit dem Auto? Lisa: Nein, ich fahre mit dem Zug.',
    prompt: 'Wen besucht Lisa?',
    options: ['ihre Eltern', 'ihre Freunde', 'ihre Großeltern'],
    correctIndex: 2,
  },

  {
    id: 'horen-018',
    number: 18,
    title: 'Ansage im Bus',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Nächste Haltestelle: Rathaus. Bitte steigen Sie dort aus, wenn Sie zum Stadtzentrum möchten.',
    prompt: 'Wo soll man aussteigen?',
    options: ['am Rathaus', 'am Bahnhof', 'am Markt'],
    correctIndex: 0,
  },

  {
    id: 'horen-019',
    number: 19,
    title: 'Ein Termin',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Frau: Wann können Sie kommen? Mann: Am Montag kann ich leider nicht. Am Dienstag habe ich Zeit. Frau: Gut. Dann Dienstag um zehn Uhr.',
    prompt: 'Wann ist der Termin?',
    options: ['Montag um zehn', 'Dienstag um zehn', 'Dienstag um elf'],
    correctIndex: 1,
  },

  {
    id: 'horen-020',
    number: 20,
    title: 'Kurze Nachricht',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Hallo Ben, hier ist Max. Bitte kauf auf dem Heimweg eine Flasche Wasser und zwei Bananen. Brot haben wir noch zu Hause.',
    prompt: 'Was soll Ben kaufen?',
    options: ['Brot und Milch', 'Wasser und Bananen', 'Saft und Äpfel'],
    correctIndex: 1,
  },

  {
    id: 'horen-021',
    number: 21,
    title: 'Die Familie',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Frau: Wie alt ist deine Tochter? Mann: Sie ist acht Jahre alt. Frau: Geht sie schon zur Schule? Mann: Ja, sie geht in die zweite Klasse.',
    prompt: 'Wie alt ist die Tochter?',
    options: ['sieben', 'acht', 'neun'],
    correctIndex: 1,
  },

  {
    id: 'horen-022',
    number: 22,
    title: 'Telefonnachricht',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Hallo Daniel, hier ist Emma. Heute Abend gehen wir nicht ins Kino. Wir treffen uns im Café neben dem Bahnhof. Bis später!',
    prompt: 'Wo treffen sie sich?',
    options: ['im Café', 'im Kino', 'im Park'],
    correctIndex: 0,
  },

  {
    id: 'horen-023',
    number: 23,
    title: 'Im Hotel',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Gast: Haben Sie noch ein Zimmer für heute Nacht? Rezeptionistin: Ja, ein Einzelzimmer. Gast: Gibt es auch Frühstück? Rezeptionistin: Ja, natürlich. Gast: Gut, dann nehme ich das Zimmer.',
    prompt: 'Welches Zimmer nimmt der Mann?',
    options: ['ein Doppelzimmer', 'ein Einzelzimmer', 'ein Familienzimmer'],
    correctIndex: 1,
  },

  {
    id: 'horen-024',
    number: 24,
    title: 'Ansage im Bus',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Liebe Fahrgäste! Der Bus Nummer zwölf fährt heute nicht. Bitte nehmen Sie den Bus Nummer fünfzehn.',
    prompt: 'Welchen Bus sollen die Fahrgäste nehmen?',
    options: ['Bus 12', 'Bus 14', 'Bus 15'],
    correctIndex: 2,
  },

  {
    id: 'horen-025',
    number: 25,
    title: 'In der Bäckerei',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Verkäuferin: Guten Morgen. Was darf es sein? Mann: Zwei Brötchen und ein Croissant, bitte. Verkäuferin: Sonst noch etwas? Mann: Nein, danke.',
    prompt: 'Was kauft der Mann?',
    options: [
      'zwei Brötchen und ein Croissant',
      'ein Brot und zwei Brötchen',
      'drei Croissants',
    ],
    correctIndex: 0,
  },

  {
    id: 'horen-026',
    number: 26,
    title: 'Ein Kurs',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Anna: Wann beginnt dein Deutschkurs? Peter: Um halb sieben. Anna: Jeden Tag? Peter: Nein, nur Montag und Mittwoch.',
    prompt: 'Wann beginnt der Kurs?',
    options: ['um sechs Uhr', 'um halb sieben', 'um sieben Uhr'],
    correctIndex: 1,
  },

  {
    id: 'horen-027',
    number: 27,
    title: 'Kurze Nachricht',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Hallo Lisa, ich bin heute Nachmittag zu Hause. Wenn du möchtest, kannst du um vier Uhr kommen. Ich muss erst um sechs Uhr wieder weg.',
    prompt: 'Wann kann Lisa kommen?',
    options: ['um drei Uhr', 'um vier Uhr', 'um fünf Uhr'],
    correctIndex: 1,
  },

  {
    id: 'horen-028',
    number: 28,
    title: 'Beim Arzt',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Arzt: Was fehlt Ihnen? Frau: Ich habe seit gestern starke Halsschmerzen. Arzt: Haben Sie auch Fieber? Frau: Nein, Fieber habe ich nicht.',
    prompt: 'Was hat die Frau?',
    options: ['Halsschmerzen', 'Bauchschmerzen', 'Zahnschmerzen'],
    correctIndex: 0,
  },

  {
    id: 'horen-029',
    number: 29,
    title: 'Kurze Nachricht',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Hallo Tom, ich habe deinen Regenschirm. Du hast ihn gestern bei mir vergessen. Ich bringe ihn morgen mit in die Schule.',
    prompt: 'Was bringt die Person morgen mit?',
    options: ['einen Rucksack', 'einen Regenschirm', 'ein Buch'],
    correctIndex: 1,
  },

  {
    id: 'horen-030',
    number: 30,
    title: 'Das Wochenende',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Mann: Fährst du am Wochenende weg? Frau: Nein, ich bleibe zu Hause. Mann: Was machst du dann? Frau: Ich backe einen Kuchen für meine Familie.',
    prompt: 'Was macht die Frau am Wochenende?',
    options: ['Sie fährt weg.', 'Sie arbeitet.', 'Sie backt einen Kuchen.'],
    correctIndex: 2,
  },

  {
    id: 'horen-031',
    number: 31,
    title: 'Im Kaufhaus',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Liebe Kunden, die Kasse Nummer vier ist heute geschlossen. Bitte benutzen Sie die Kassen eins bis drei.',
    prompt: 'Welche Kassen sind geöffnet?',
    options: ['eins bis drei', 'nur vier', 'vier und fünf'],
    correctIndex: 0,
  },

  {
    id: 'horen-032',
    number: 32,
    title: 'Ein Geburtstagsgeschenk',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Frau: Was schenken wir Maria zum Geburtstag? Mann: Wie wäre es mit einem Buch? Frau: Ja, das ist eine gute Idee. Sie liest sehr gern.',
    prompt: 'Was schenken sie Maria?',
    options: ['Blumen', 'ein Buch', 'eine Tasche'],
    correctIndex: 1,
  },

  {
    id: 'horen-033',
    number: 33,
    title: 'Telefonnachricht',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Hallo Julia, hier ist Eva. Ich komme heute mit dem Fahrrad zu dir. Mein Auto ist kaputt. Bis gleich!',
    prompt: 'Wie kommt Eva zu Julia?',
    options: ['mit dem Auto', 'mit dem Bus', 'mit dem Fahrrad'],
    correctIndex: 2,
  },

  {
    id: 'horen-034',
    number: 34,
    title: 'In der Familie',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Sohn: Mama, wann essen wir heute? Mutter: Um sieben Uhr. Sohn: Kann ich vorher einen Apfel haben? Mutter: Natürlich.',
    prompt: 'Wann isst die Familie?',
    options: ['um sechs Uhr', 'um sieben Uhr', 'um acht Uhr'],
    correctIndex: 1,
  },

  {
    id: 'horen-035',
    number: 35,
    title: 'Kurze Nachricht',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Hallo Nina. Morgen ist unser Treffen nicht im Büro. Wir treffen uns im Konferenzraum im zweiten Stock. Bis morgen!',
    prompt: 'Wo ist das Treffen?',
    options: ['im Büro', 'im Konferenzraum im zweiten Stock', 'im ersten Stock'],
    correctIndex: 1,
  },

  {
    id: 'horen-036',
    number: 36,
    title: 'Im Reisebüro',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Mitarbeiterin: Wohin möchten Sie im August reisen? Mann: Nach Spanien. Mitarbeiterin: Allein oder mit Ihrer Familie? Mann: Mit meiner Frau.',
    prompt: 'Wohin möchte der Mann reisen?',
    options: ['nach Italien', 'nach Spanien', 'nach Frankreich'],
    correctIndex: 1,
  },

  {
    id: 'horen-037',
    number: 37,
    title: 'Kurze Nachricht',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Hallo Eva, ich habe heute meinen Schlüssel verloren. Ich habe schon überall gesucht. Wenn du ihn findest, ruf mich bitte an.',
    prompt: 'Was hat Eva verloren?',
    options: ['ihre Tasche', 'ihr Handy', 'ihren Schlüssel'],
    correctIndex: 2,
  },

  {
    id: 'horen-038',
    number: 38,
    title: 'Im Restaurant',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Kellner: Was möchten Sie essen? Frau: Eine Suppe, bitte. Kellner: Möchten Sie auch einen Salat? Frau: Nein, danke. Ich nehme nur die Suppe.',
    prompt: 'Was isst die Frau?',
    options: ['eine Suppe', 'einen Salat', 'ein Sandwich'],
    correctIndex: 0,
  },

  {
    id: 'horen-039',
    number: 39,
    title: 'In der Schule',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Liebe Schülerinnen und Schüler! Morgen beginnt der Unterricht für die Klasse fünf erst um zehn Uhr. Die erste Stunde fällt aus.',
    prompt: 'Wann beginnt der Unterricht?',
    options: ['um acht Uhr', 'um neun Uhr', 'um zehn Uhr'],
    correctIndex: 2,
  },

  {
    id: 'horen-040',
    number: 40,
    title: 'Kurzes Gespräch',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Frau: Hast du schon ein Geschenk für deinen Bruder? Mann: Ja. Ich war gestern im Geschäft und habe ein neues Handy gekauft.',
    prompt: 'Was hat der Mann gekauft?',
    options: ['ein Buch', 'ein Handy', 'einen Pullover'],
    correctIndex: 1,
  },

  {
    id: 'horen-041',
    number: 41,
    title: 'Telefonnachricht',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Hallo Maria, hier ist Lena. Ich komme heute nicht zum Sport. Ich muss länger arbeiten. Vielleicht können wir uns morgen treffen?',
    prompt: 'Warum kommt Lena heute nicht zum Sport?',
    options: ['Sie ist krank.', 'Sie arbeitet länger.', 'Sie fährt weg.'],
    correctIndex: 1,
  },

  {
    id: 'horen-042',
    number: 42,
    title: 'Am Bahnhof',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Frau: Entschuldigung, wann fährt der nächste Zug nach Hamburg? Mitarbeiter: Um Viertel nach drei. Frau: Und von welchem Gleis? Mitarbeiter: Von Gleis zwei.',
    prompt: 'Wann fährt der Zug?',
    options: ['um 14:15 Uhr', 'um 15:15 Uhr', 'um 15:30 Uhr'],
    correctIndex: 1,
  },

  {
    id: 'horen-043',
    number: 43,
    title: 'Im Geschäft',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Verkäuferin: Möchten Sie die Jacke anprobieren? Frau: Ja, gern. Haben Sie sie auch in Blau? Verkäuferin: Ja, hier bitte. Frau: Die gefällt mir gut.',
    prompt: 'Welche Farbe möchte die Frau?',
    options: ['Schwarz', 'Rot', 'Blau'],
    correctIndex: 2,
  },

  {
    id: 'horen-044',
    number: 44,
    title: 'Kurze Nachricht',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Hallo Paul, ich bin heute Abend nicht zu Hause. Ich bin bei meiner Freundin Anna. Meine Mutter ist aber zu Hause.',
    prompt: 'Wo ist Pauls Mutter?',
    options: ['bei Anna', 'zu Hause', 'im Kino'],
    correctIndex: 1,
  },

  {
    id: 'horen-045',
    number: 45,
    title: 'Im Café',
    type: 'multiple-choice',
    instruction: ABC_INSTRUCTION,
    audioText:
      'Mann: Was möchtest du essen? Frau: Ein Käsebrötchen. Mann: Und möchtest du etwas trinken? Frau: Ja, einen Orangensaft.',
    prompt: 'Was trinkt die Frau?',
    options: ['Kaffee', 'Wasser', 'Orangensaft'],
    correctIndex: 2,
  },

  {
    id: 'horen-046',
    number: 46,
    title: 'Kurzes Gespräch',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Anna: Hast du heute Zeit? Paul: Nein, leider nicht. Ich muss bis fünf Uhr arbeiten. Anna: Dann treffen wir uns morgen.',
    prompt: 'Paul arbeitet heute bis fünf Uhr.',
    correctAnswer: true,
  },

  {
    id: 'horen-047',
    number: 47,
    title: 'Telefonnachricht',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Hallo Lisa, hier ist Tom. Ich komme morgen nicht mit dem Bus. Mein Vater fährt mich mit dem Auto zur Schule.',
    prompt: 'Tom fährt morgen mit dem Bus zur Schule.',
    correctAnswer: false,
  },

  {
    id: 'horen-048',
    number: 48,
    title: 'Am Bahnhof',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Achtung, bitte! Der Zug nach München fährt heute von Gleis sieben. Die Abfahrt ist um neun Uhr.',
    prompt: 'Der Zug nach München fährt von Gleis sieben.',
    correctAnswer: true,
  },

  {
    id: 'horen-049',
    number: 49,
    title: 'Im Café',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Kellner: Möchten Sie einen Kaffee? Frau: Nein, danke. Ich möchte einen Tee.',
    prompt: 'Die Frau möchte Kaffee.',
    correctAnswer: false,
  },

  {
    id: 'horen-050',
    number: 50,
    title: 'Kurzes Gespräch',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Frau: Wo ist deine Schwester? Mann: Sie ist heute in der Schule. Frau: Und wann kommt sie nach Hause? Mann: Um zwei Uhr.',
    prompt: 'Die Schwester ist heute in der Schule.',
    correctAnswer: true,
  },

  {
    id: 'horen-051',
    number: 51,
    title: 'Telefonnachricht',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Hallo Peter, hier ist Maria. Ich kann heute nicht zum Essen kommen. Ich habe Kopfschmerzen und bleibe zu Hause.',
    prompt: 'Maria geht heute zum Essen.',
    correctAnswer: false,
  },

  {
    id: 'horen-052',
    number: 52,
    title: 'Ein Termin',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Mann: Wann ist dein Arzttermin? Frau: Am Donnerstag um neun Uhr. Mann: Früh! Frau: Ja.',
    prompt: 'Die Frau hat am Donnerstag einen Arzttermin.',
    correctAnswer: true,
  },

  {
    id: 'horen-053',
    number: 53,
    title: 'Im Supermarkt',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Frau: Haben wir noch Milch? Mann: Nein. Wir müssen heute Milch kaufen. Frau: Brot brauchen wir auch.',
    prompt: 'Zu Hause gibt es noch Milch.',
    correctAnswer: false,
  },

  {
    id: 'horen-054',
    number: 54,
    title: 'Kurze Ansage',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Liebe Kunden! Heute schließt unser Geschäft schon um sechs Uhr. Morgen haben wir wieder bis acht Uhr geöffnet.',
    prompt: 'Heute ist das Geschäft bis acht Uhr geöffnet.',
    correctAnswer: false,
  },

  {
    id: 'horen-055',
    number: 55,
    title: 'Das Wochenende',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Tom: Was machst du am Samstag? Lisa: Ich fahre zu meiner Oma. Tom: Mit dem Zug? Lisa: Ja.',
    prompt: 'Lisa besucht am Samstag ihre Oma.',
    correctAnswer: true,
  },

  {
    id: 'horen-056',
    number: 56,
    title: 'Kurze Nachricht',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Hallo Anna. Ich bin noch im Büro. Ich komme erst um sieben Uhr nach Hause. Das Essen steht schon im Kühlschrank.',
    prompt: 'Die Person kommt um sieben Uhr nach Hause.',
    correctAnswer: true,
  },

  {
    id: 'horen-057',
    number: 57,
    title: 'Kurzes Gespräch',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Frau: Kommst du heute ins Kino? Mann: Nein, ich muss für die Prüfung lernen. Frau: Dann vielleicht morgen.',
    prompt: 'Der Mann geht heute ins Kino.',
    correctAnswer: false,
  },

  {
    id: 'horen-058',
    number: 58,
    title: 'Ansage im Bus',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Nächste Haltestelle: Bahnhof. Danach fährt der Bus weiter zum Rathaus.',
    prompt: 'Der Bus fährt als Nächstes zum Bahnhof.',
    correctAnswer: true,
  },

  {
    id: 'horen-059',
    number: 59,
    title: 'Kurzes Gespräch',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Anna: Wo hast du meine Tasche? Paul: Im Auto. Anna: Ah, danke!',
    prompt: 'Die Tasche ist im Auto.',
    correctAnswer: true,
  },

  {
    id: 'horen-060',
    number: 60,
    title: 'Im Geschäft',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Verkäuferin: Die Schuhe kosten 40 Euro. Mann: Nein, danke. Das ist zu teuer.',
    prompt: 'Die Schuhe kosten 40 Euro.',
    correctAnswer: true,
  },

  {
    id: 'horen-061',
    number: 61,
    title: 'Kurze Nachricht',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Hallo Julia, ich bin heute krank. Ich gehe nicht zur Arbeit. Ich bleibe den ganzen Tag zu Hause.',
    prompt: 'Julia geht heute zur Arbeit.',
    correctAnswer: false,
  },

  {
    id: 'horen-062',
    number: 62,
    title: 'In der Schule',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Lehrer: Morgen schreiben wir einen Test. Schüler: In Mathematik? Lehrer: Nein, in Deutsch.',
    prompt: 'Morgen gibt es einen Deutschtest.',
    correctAnswer: true,
  },

  {
    id: 'horen-063',
    number: 63,
    title: 'Telefonnachricht',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Hallo Ben, hier ist Max. Ich habe dein Buch bei mir. Ich bringe es morgen mit.',
    prompt: 'Max hat Bens Buch.',
    correctAnswer: true,
  },

  {
    id: 'horen-064',
    number: 64,
    title: 'Kurzes Gespräch',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Frau: Wann hast du Fußballtraining? Mann: Am Mittwoch. Frau: Immer am Mittwoch? Mann: Ja.',
    prompt: 'Der Mann hat am Donnerstag Fußballtraining.',
    correctAnswer: false,
  },

  {
    id: 'horen-065',
    number: 65,
    title: 'Zu Hause',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Mutter: Wo ist dein Bruder? Sohn: Im Garten. Er spielt Fußball.',
    prompt: 'Der Bruder ist im Garten.',
    correctAnswer: true,
  },

  {
    id: 'horen-066',
    number: 66,
    title: 'Im Restaurant',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Kellner: Möchten Sie ein Eis? Mann: Ja, Schokolade bitte. Kellner: Sonst noch etwas? Mann: Nein, danke.',
    prompt: 'Der Mann bestellt ein Schokoladeneis.',
    correctAnswer: true,
  },

  {
    id: 'horen-067',
    number: 67,
    title: 'Kurze Nachricht',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Hallo Lisa, ich kann heute leider nicht kommen. Mein Zug hat Verspätung. Ich komme morgen.',
    prompt: 'Lisa kommt heute.',
    correctAnswer: false,
  },

  {
    id: 'horen-068',
    number: 68,
    title: 'Ein Einkauf',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Mann: Was hast du gekauft? Frau: Zwei Äpfel und ein Brot. Mann: Und Milch? Frau: Nein, Milch brauchen wir nicht.',
    prompt: 'Die Frau hat zwei Äpfel gekauft.',
    correctAnswer: true,
  },

  {
    id: 'horen-069',
    number: 69,
    title: 'Kurze Ansage',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Achtung! Heute fährt der Bus 20 nicht. Bitte benutzen Sie den Bus 21.',
    prompt: 'Heute fährt der Bus 20.',
    correctAnswer: false,
  },

  {
    id: 'horen-070',
    number: 70,
    title: 'Die Familie',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Frau: Wann kommt dein Vater? Mann: Am Sonntag. Frau: Bleibt er lange? Mann: Nur bis Montag.',
    prompt: 'Der Vater kommt am Sonntag.',
    correctAnswer: true,
  },

  {
    id: 'horen-071',
    number: 71,
    title: 'Telefonnachricht',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Hallo Anna, ich bin im Büro. Ich kann heute erst um acht Uhr nach Hause kommen. Bitte warte nicht mit dem Essen.',
    prompt: 'Die Person kommt heute um acht Uhr nach Hause.',
    correctAnswer: true,
  },

  {
    id: 'horen-072',
    number: 72,
    title: 'Im Geschäft',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Frau: Haben Sie diese Tasche auch in Schwarz? Verkäuferin: Nein, nur in Braun und Blau. Frau: Dann nehme ich die blaue.',
    prompt: 'Die Frau kauft eine schwarze Tasche.',
    correctAnswer: false,
  },

  {
    id: 'horen-073',
    number: 73,
    title: 'Kurzes Gespräch',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Tom: Was machst du morgen? Eva: Ich gehe zum Arzt. Tom: Am Vormittag? Eva: Ja, um elf Uhr.',
    prompt: 'Eva hat morgen einen Arzttermin.',
    correctAnswer: true,
  },

  {
    id: 'horen-074',
    number: 74,
    title: 'Im Kaufhaus',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Liebe Kunden! Die Abteilung für Kinderkleidung ist heute im zweiten Stock. Der Eingang ist rechts.',
    prompt: 'Die Kinderkleidung ist im ersten Stock.',
    correctAnswer: false,
  },

  {
    id: 'horen-075',
    number: 75,
    title: 'Freizeit',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Mann: Gehst du heute schwimmen? Frau: Nein, ich gehe mit meiner Freundin spazieren. Mann: Im Park? Frau: Ja.',
    prompt: 'Die Frau geht heute spazieren.',
    correctAnswer: true,
  },

  {
    id: 'horen-076',
    number: 76,
    title: 'Kurze Nachricht',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Hallo Peter, ich bin morgen den ganzen Tag bei meiner Tante. Ruf mich bitte am Abend an.',
    prompt: 'Die Person ist morgen zu Hause.',
    correctAnswer: false,
  },

  {
    id: 'horen-077',
    number: 77,
    title: 'In der Familie',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Tochter: Was gibt es heute zum Abendessen? Mutter: Nudeln mit Tomatensoße. Tochter: Super!',
    prompt: 'Die Familie isst heute Nudeln.',
    correctAnswer: true,
  },

  {
    id: 'horen-078',
    number: 78,
    title: 'Am Bahnhof',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Frau: Wann fährt der Zug nach Berlin? Mitarbeiter: Um halb vier. Frau: Also um 15:30 Uhr? Mitarbeiter: Ja, genau.',
    prompt: 'Der Zug fährt um 15:30 Uhr.',
    correctAnswer: true,
  },

  {
    id: 'horen-079',
    number: 79,
    title: 'Telefonnachricht',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Hallo Maria, hier ist Paul. Ich habe heute Abend keine Zeit. Ich muss für meine Deutschprüfung lernen. Wir sehen uns morgen.',
    prompt: 'Paul muss heute Abend Deutsch lernen.',
    correctAnswer: true,
  },

  {
    id: 'horen-080',
    number: 80,
    title: 'Kurzes Gespräch',
    type: 'true-false',
    instruction: TF_INSTRUCTION,
    audioText:
      'Anna: Hast du morgen Nachmittag Zeit? Julia: Ja. Anna: Dann treffen wir uns um drei Uhr im Café? Julia: Ja, gern.',
    prompt: 'Anna und Julia treffen sich morgen um drei Uhr.',
    correctAnswer: true,
  },
];