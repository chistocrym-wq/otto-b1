import type { MultipleChoiceQuestion, TrueFalseQuestion } from '../types';

export interface LegacyReadingTask {
  id: string;
  title: string;
  instruction: string;
  text: string;
  questions: (MultipleChoiceQuestion | TrueFalseQuestion)[];
}

export const readingTasks: LegacyReadingTask[] = [
  {
    id: 'lesen-1',
    title: 'Teil 1: Briefe lesen',
    instruction: 'Lesen Sie die Briefe und kreuzen Sie die richtige Antwort an: A, B oder C.',
    text: `Liebe Frau Müller,\n\nich bin jeden Tag von 18 bis 20 Uhr im Fitnessstudio. Am Wochenende gehe ich oft schwimmen. Ich brauche keine Hilfe beim Einkaufen, aber danke für das Angebot! Am Samstagabend habe ich eine Party. Kommst du auch?\n\nViele Grüße\nAnna`,
    questions: [
      {
        id: 'l1q1',
        type: 'multiple-choice',
        prompt: 'Wann ist Anna im Fitnessstudio?',
        options: ['8–10 Uhr', '18–20 Uhr', '10–12 Uhr'],
        correctIndex: 1,
        explanation: 'Anna sagt: "ich bin jeden Tag von 18 bis 20 Uhr im Fitnessstudio."',
      },
      {
        id: 'l1q2',
        type: 'multiple-choice',
        prompt: 'Was macht Anna am Wochenende?',
        options: ['Sie geht schwimmen', 'Sie kauft ein', 'Sie arbeitet'],
        correctIndex: 0,
        explanation: 'Anna sagt: "Am Wochenende gehe ich oft schwimmen."',
      },
      {
        id: 'l1q3',
        type: 'multiple-choice',
        prompt: 'Braucht Anna Hilfe beim Einkaufen?',
        options: ['Ja', 'Nein', 'Vielleicht'],
        correctIndex: 1,
        explanation: 'Anna sagt: "Ich brauche keine Hilfe beim Einkaufen."',
      },
      {
        id: 'l1q4',
        type: 'multiple-choice',
        prompt: 'Was ist am Samstagabend?',
        options: ['Ein Geburtstag', 'Eine Party', 'Ein Treffen'],
        correctIndex: 1,
        explanation: 'Anna sagt: "Am Samstagabend habe ich eine Party."',
      },
    ],
  },
  {
    id: 'lesen-2',
    title: 'Teil 2: Informationen finden',
    instruction: 'Lesen Sie die Anzeige und beantworten Sie die Fragen mit Richtig (R) oder Falsch (F).',
    text: `Sprachkurs Deutsch in Berlin\n\nWir bieten einen Deutschkurs für Anfänger (A1) an.\n- Kursbeginn: 15. März\n- Kursdauer: 8 Wochen\n- Unterricht: Montag, Mittwoch, Freitag von 9–12 Uhr\n- Preis: 240 Euro (inkl. Material)\n- Anmeldefrist: 1. März\n- Ort: Sprachschule Berlin, Hauptstraße 12\n\nAnmeldung online unter: www.sprachschule-berlin.de`,
    questions: [
      {
        id: 'l2q1',
        type: 'true-false',
        prompt: 'Der Kurs ist für Anfänger (A1).',
        correctAnswer: true,
        explanation: 'Im Text steht: "einen Deutschkurs für Anfänger (A1)".',
      },
      {
        id: 'l2q2',
        type: 'true-false',
        prompt: 'Der Kurs beginnt am 1. März.',
        correctAnswer: false,
        explanation: 'Der Kurs beginnt am 15. März. Der 1. März ist die Anmeldefrist.',
      },
      {
        id: 'l2q3',
        type: 'true-false',
        prompt: 'Der Unterricht findet dreimal pro Woche statt.',
        correctAnswer: true,
        explanation: 'Der Unterricht ist am Montag, Mittwoch und Freitag.',
      },
      {
        id: 'l2q4',
        type: 'true-false',
        prompt: 'Das Material kostet extra.',
        correctAnswer: false,
        explanation: 'Im Text steht: "240 Euro (inkl. Material)".',
      },
    ],
  },
  {
    id: 'lesen-3',
    title: 'Teil 3: Wegbeschreibung lesen',
    instruction: 'Lesen Sie die E-Mail und beantworten Sie die Fragen.',
    text: `Hallo Thomas,\n\nvielen Dank für deine E-Mail. Du fragst nach dem Weg zum Restaurant. Das ist ganz einfach: Vom Bahnhof gehst du geradeaus bis zur Ampel. Dort biegst du links ab. Dann gehst du an der Post vorbei. Das Restaurant "Bella Italia" ist direkt neben der Apotheke. Die Bushaltestelle ist vor dem Restaurant. Du kannst auch mit dem Bus fahren: Linie 5, Haltestelle "Marktplatz".\n\nBis Samstag!\n\nLiebe Grüße\nSabine`,
    questions: [
      {
        id: 'l3q1',
        type: 'multiple-choice',
        prompt: 'Wo befindet sich das Restaurant?',
        options: ['Neben der Post', 'Neben der Apotheke', 'Am Bahnhof'],
        correctIndex: 1,
        explanation: 'Im Text steht: "Das Restaurant ist direkt neben der Apotheke."',
      },
      {
        id: 'l3q2',
        type: 'multiple-choice',
        prompt: 'Wie kommt man vom Bahnhof zum Restaurant?',
        options: ['Erst rechts, dann links', 'Geradeaus, dann links', 'Erst links, dann rechts'],
        correctIndex: 1,
        explanation: 'Im Text steht: "Vom Bahnhof gehst du geradeaus bis zur Ampel. Dort biegst du links ab."',
      },
      {
        id: 'l3q3',
        type: 'multiple-choice',
        prompt: 'Welche Buslinie fährt zum Restaurant?',
        options: ['Linie 5', 'Linie 3', 'Linie 8'],
        correctIndex: 0,
        explanation: 'Im Text steht: "Linie 5, Haltestelle Marktplatz."',
      },
      {
        id: 'l3q4',
        type: 'true-false',
        prompt: 'Die Bushaltestelle ist hinter dem Restaurant.',
        correctAnswer: false,
        explanation: 'Im Text steht: "Die Bushaltestelle ist vor dem Restaurant."',
      },
    ],
  },
];
