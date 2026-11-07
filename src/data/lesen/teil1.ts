import type { ReadingTask } from '@/types';

/*
 * Goethe A1 Lesen — Teil 1
 *
 * 50 originale Trainingsaufgaben.
 * Eine Aufgabe = ein visueller Text + 2–4 Aussagen.
 * Die Aussagen werden immer als Richtig / Falsch geprüft.
 *
 * Die Aufgaben постепенно становятся сложнее:
 * 1–10: базовая ориентация в коротком сообщении
 * 11–25: больше деталей, времени и отрицаний
 * 26–40: более плотная информация и несколько деталей
 * 41–50: более длинные тексты и близкие по смыслу формулировки
 */

export const lesenTeil1Tasks: ReadingTask[] = [
  {
    id: 'teil1-001',
    title: 'Aufgabe 1',
    instruction: 'Lesen Sie die E-Mail. Sind die Aussagen richtig oder falsch?',
    visualType: 'email',
    visual: {
      sender: 'Karin',
      recipient: 'Li',
      subject: 'Dein Zug',
      body: `Hallo Li,
danke für deine Mail. Dein Zug kommt morgen um 12.36 Uhr in Hannover an. Ich bin ab 12.15 Uhr im Hauptbahnhof und warte vor der Auskunft. Du kannst mich am Vormittag auf meinem Handy erreichen.

Deine Karin`,
    },
    questions: [
      {
        id: 'teil1-001-q1',
        type: 'true-false',
        prompt: 'Li kommt morgen in Hannover an.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-001-q2',
        type: 'true-false',
        prompt: 'Der Zug kommt um Viertel vor zwölf an.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-001-q3',
        type: 'true-false',
        prompt: 'Karin wartet im Hauptbahnhof.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-002',
    title: 'Aufgabe 2',
    instruction: 'Lesen Sie den Brief. Sind die Aussagen richtig oder falsch?',
    visualType: 'letter',
    visual: {
      recipient: 'Carmen',
      date: 'Freitag',
      body: `Liebe Carmen,
am kommenden Sonntag habe ich Geburtstag. Ich möchte gern mit dir feiern und lade dich herzlich zu meiner Party am Samstagabend ein. Wir fangen um 21 Uhr an. Kannst du vielleicht einen Salat mitbringen? Wir feiern draußen im Garten.

Bis zum Wochenende
Ralf`,
    },
    questions: [
      {
        id: 'teil1-002-q1',
        type: 'true-false',
        prompt: 'Ralf hat am Sonntag Geburtstag.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-002-q2',
        type: 'true-false',
        prompt: 'Die Party ist am Samstagabend.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-002-q3',
        type: 'true-false',
        prompt: 'Die Party beginnt um 20 Uhr.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-002-q4',
        type: 'true-false',
        prompt: 'Carmen soll einen Salat mitbringen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-003',
    title: 'Aufgabe 3',
    instruction: 'Lesen Sie die Notiz. Sind die Aussagen richtig oder falsch?',
    visualType: 'note',
    visual: {
      title: 'Für Tom',
      message: `Bitte kauf auf dem Weg nach Hause Brot und zwei Flaschen Wasser. Milch haben wir noch. Ich komme heute erst um 19 Uhr nach Hause.
Mama`,
    },
    questions: [
      {
        id: 'teil1-003-q1',
        type: 'true-false',
        prompt: 'Tom soll Brot kaufen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-003-q2',
        type: 'true-false',
        prompt: 'Tom soll Milch kaufen.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-003-q3',
        type: 'true-false',
        prompt: 'Mama kommt heute um sieben Uhr nach Hause.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-004',
    title: 'Aufgabe 4',
    instruction: 'Lesen Sie die Nachricht. Sind die Aussagen richtig oder falsch?',
    visualType: 'sms',
    visual: {
      sender: 'Mia',
      date: 'Heute, 08:14',
      message: `Hallo Ben,
ich bin schon in der Schule. Der Unterricht beginnt heute erst um 9.30 Uhr. Komm bitte direkt in den Raum 4.
Mia`,
    },
    questions: [
      {
        id: 'teil1-004-q1',
        type: 'true-false',
        prompt: 'Mia ist schon in der Schule.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-004-q2',
        type: 'true-false',
        prompt: 'Der Unterricht beginnt um neun Uhr.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-005',
    title: 'Aufgabe 5',
    instruction: 'Lesen Sie die Postkarte. Sind die Aussagen richtig oder falsch?',
    visualType: 'postcard',
    visual: {
      title: 'Viele Grüße aus Hamburg!',
      message: `Liebe Oma,
wir sind seit Montag in Hamburg. Heute regnet es, deshalb bleiben wir am Nachmittag im Hotel. Morgen wollen wir den Hafen besuchen. Das Frühstück im Hotel ist sehr gut.
Liebe Grüße
Nina`,
    },
    questions: [
      {
        id: 'teil1-005-q1',
        type: 'true-false',
        prompt: 'Nina ist in Hamburg.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-005-q2',
        type: 'true-false',
        prompt: 'Heute ist das Wetter schön.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-005-q3',
        type: 'true-false',
        prompt: 'Morgen möchte Nina den Hafen besuchen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-006',
    title: 'Aufgabe 6',
    instruction: 'Lesen Sie die E-Mail. Sind die Aussagen richtig oder falsch?',
    visualType: 'email',
    visual: {
      sender: 'Sprachschule Nord',
      recipient: 'Frau Keller',
      subject: 'Kursbeginn',
      body: `Guten Tag Frau Keller,
der Deutschkurs beginnt am 3. April. Der Unterricht ist montags und mittwochs von 18 bis 20 Uhr. Bitte bringen Sie ein Heft und einen Stift mit.

Viele Grüße
Sprachschule Nord`,
    },
    questions: [
      {
        id: 'teil1-006-q1',
        type: 'true-false',
        prompt: 'Der Kurs beginnt im April.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-006-q2',
        type: 'true-false',
        prompt: 'Der Unterricht ist am Dienstag und Donnerstag.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-006-q3',
        type: 'true-false',
        prompt: 'Der Kurs ist am Abend.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-006-q4',
        type: 'true-false',
        prompt: 'Frau Keller braucht ein Heft.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-007',
    title: 'Aufgabe 7',
    instruction: 'Lesen Sie die Notiz. Sind die Aussagen richtig oder falsch?',
    visualType: 'fridge-note',
    visual: {
      title: 'Für Lisa',
      message: `Der Kuchen ist für morgen. Bitte nicht heute essen! Die Getränke stehen im Kühlschrank. Ich kaufe heute noch Obst.
Papa`,
    },
    questions: [
      {
        id: 'teil1-007-q1',
        type: 'true-false',
        prompt: 'Der Kuchen ist für morgen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-007-q2',
        type: 'true-false',
        prompt: 'Lisa soll den Kuchen heute essen.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-007-q3',
        type: 'true-false',
        prompt: 'Die Getränke sind im Kühlschrank.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-008',
    title: 'Aufgabe 8',
    instruction: 'Lesen Sie die Nachricht. Sind die Aussagen richtig oder falsch?',
    visualType: 'sms',
    visual: {
      sender: 'Jonas',
      date: 'Heute, 16:05',
      message: `Hi Sara,
ich kann heute leider nicht mit dir joggen. Ich muss länger arbeiten. Morgen habe ich aber Zeit. Wollen wir uns um 8 Uhr treffen?
Jonas`,
    },
    questions: [
      {
        id: 'teil1-008-q1',
        type: 'true-false',
        prompt: 'Jonas hat heute keine Zeit zum Joggen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-008-q2',
        type: 'true-false',
        prompt: 'Jonas muss heute früher nach Hause.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-008-q3',
        type: 'true-false',
        prompt: 'Jonas hat morgen Zeit.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-009',
    title: 'Aufgabe 9',
    instruction: 'Lesen Sie den Brief. Sind die Aussagen richtig oder falsch?',
    visualType: 'letter',
    visual: {
      recipient: 'Herrn Weber',
      date: '10. Mai',
      body: `Sehr geehrter Herr Weber,
Ihr Termin bei uns ist am Donnerstag um 14 Uhr. Bitte kommen Sie zehn Minuten früher und bringen Sie Ihren Pass mit.

Mit freundlichen Grüßen
Stadtbüro`,
    },
    questions: [
      {
        id: 'teil1-009-q1',
        type: 'true-false',
        prompt: 'Herr Weber hat am Donnerstag einen Termin.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-009-q2',
        type: 'true-false',
        prompt: 'Der Termin ist um 14.10 Uhr.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-009-q3',
        type: 'true-false',
        prompt: 'Herr Weber soll seinen Pass mitbringen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-010',
    title: 'Aufgabe 10',
    instruction: 'Lesen Sie die Notiz. Sind die Aussagen richtig oder falsch?',
    visualType: 'note',
    visual: {
      title: 'Hallo Anna!',
      message: `Ich bin beim Arzt. Danach gehe ich direkt zum Supermarkt. Kannst du bitte schon mal das Abendessen machen? Ich bin gegen 18.30 Uhr wieder da.
Julia`,
    },
    questions: [
      {
        id: 'teil1-010-q1',
        type: 'true-false',
        prompt: 'Julia ist beim Arzt.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-010-q2',
        type: 'true-false',
        prompt: 'Julia geht nach dem Arzt direkt nach Hause.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-010-q3',
        type: 'true-false',
        prompt: 'Anna soll das Abendessen machen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-010-q4',
        type: 'true-false',
        prompt: 'Julia kommt ungefähr um halb sieben zurück.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-011',
    title: 'Aufgabe 11',
    instruction: 'Lesen Sie die E-Mail. Sind die Aussagen richtig oder falsch?',
    visualType: 'email',
    visual: {
      sender: 'Thomas',
      recipient: 'Eva',
      subject: 'Samstag',
      body: `Hallo Eva,
am Samstag fahre ich zu meiner Schwester nach Köln. Ich komme erst am Sonntagabend zurück. Deshalb kann ich am Samstag nicht mit dir einkaufen gehen. Können wir am Montag gehen?
Viele Grüße
Thomas`,
    },
    questions: [
      {
        id: 'teil1-011-q1',
        type: 'true-false',
        prompt: 'Thomas fährt am Samstag nach Köln.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-011-q2',
        type: 'true-false',
        prompt: 'Thomas kommt am Samstagabend zurück.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-011-q3',
        type: 'true-false',
        prompt: 'Thomas kann am Samstag mit Eva einkaufen gehen.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-012',
    title: 'Aufgabe 12',
    instruction: 'Lesen Sie die Postkarte. Sind die Aussagen richtig oder falsch?',
    visualType: 'postcard',
    visual: {
      title: 'Liebe Grüße aus dem Urlaub',
      message: `Hallo Max,
wir sind jetzt am Meer. Das Wetter ist warm, aber heute ist es sehr windig. Wir gehen deshalb nicht schwimmen. Am Abend essen wir in einem kleinen Restaurant am Strand.
Bis bald
Lea`,
    },
    questions: [
      {
        id: 'teil1-012-q1',
        type: 'true-false',
        prompt: 'Lea ist am Meer.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-012-q2',
        type: 'true-false',
        prompt: 'Heute gehen sie schwimmen.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-013',
    title: 'Aufgabe 13',
    instruction: 'Lesen Sie die Notiz. Sind die Aussagen richtig oder falsch?',
    visualType: 'note',
    visual: {
      title: 'Für Peter',
      message: `Der Schlüssel für die Wohnung liegt bei Frau Maier im dritten Stock. Sie ist heute bis 20 Uhr zu Hause. Bitte hol den Schlüssel nach der Arbeit ab.
Papa`,
    },
    questions: [
      {
        id: 'teil1-013-q1',
        type: 'true-false',
        prompt: 'Peter soll den Schlüssel bei Frau Maier holen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-013-q2',
        type: 'true-false',
        prompt: 'Frau Maier wohnt im ersten Stock.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-013-q3',
        type: 'true-false',
        prompt: 'Frau Maier ist heute bis 20 Uhr zu Hause.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-014',
    title: 'Aufgabe 14',
    instruction: 'Lesen Sie die Nachricht. Sind die Aussagen richtig oder falsch?',
    visualType: 'sms',
    visual: {
      sender: 'Laura',
      date: 'Gestern, 21:10',
      message: `Hallo Paul,
mein Fahrrad ist wieder in Ordnung. Ich komme morgen mit dem Fahrrad zur Arbeit. Treffen wir uns um 8.15 Uhr vor dem Büro?
Liebe Grüße
Laura`,
    },
    questions: [
      {
        id: 'teil1-014-q1',
        type: 'true-false',
        prompt: 'Lauras Fahrrad ist wieder in Ordnung.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-014-q2',
        type: 'true-false',
        prompt: 'Laura kommt morgen mit dem Bus.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-014-q3',
        type: 'true-false',
        prompt: 'Laura möchte Paul um Viertel nach acht treffen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-015',
    title: 'Aufgabe 15',
    instruction: 'Lesen Sie die E-Mail. Sind die Aussagen richtig oder falsch?',
    visualType: 'email',
    visual: {
      sender: 'Hotel Adler',
      recipient: 'Familie Sommer',
      subject: 'Ihre Reservierung',
      body: `Guten Tag,
Ihr Zimmer ist vom 15. bis 18. Juni reserviert. Frühstück ist dabei. Die Anreise ist ab 15 Uhr möglich. Wir wünschen Ihnen eine gute Fahrt.
Ihr Hotel Adler`,
    },
    questions: [
      {
        id: 'teil1-015-q1',
        type: 'true-false',
        prompt: 'Das Zimmer ist im Juni reserviert.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-015-q2',
        type: 'true-false',
        prompt: 'Die Familie bleibt vier Nächte.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-015-q3',
        type: 'true-false',
        prompt: 'Das Frühstück ist inklusive.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-015-q4',
        type: 'true-false',
        prompt: 'Man kann ab 15 Uhr anreisen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-016',
    title: 'Aufgabe 16',
    instruction: 'Lesen Sie den Brief. Sind die Aussagen richtig oder falsch?',
    visualType: 'letter',
    visual: {
      recipient: 'Maria',
      date: 'Dienstag',
      body: `Liebe Maria,
leider kann ich heute nicht zu deinem Kurs kommen. Meine Tochter ist krank. Am Donnerstag bin ich wieder dabei. Kannst du mir bitte die Hausaufgaben schicken?
Liebe Grüße
Sophie`,
    },
    questions: [
      {
        id: 'teil1-016-q1',
        type: 'true-false',
        prompt: 'Sophie kommt heute zum Kurs.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-016-q2',
        type: 'true-false',
        prompt: 'Sophies Tochter ist krank.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-016-q3',
        type: 'true-false',
        prompt: 'Sophie möchte am Donnerstag wieder zum Kurs kommen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-017',
    title: 'Aufgabe 17',
    instruction: 'Lesen Sie die Notiz. Sind die Aussagen richtig oder falsch?',
    visualType: 'fridge-note',
    visual: {
      title: 'Einkauf',
      message: `Wir haben keine Eier mehr. Bitte kauf sechs Eier und etwas Käse. Brot brauchen wir nicht. Es ist noch genug da.
Mama`,
    },
    questions: [
      {
        id: 'teil1-017-q1',
        type: 'true-false',
        prompt: 'Es gibt keine Eier mehr.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-017-q2',
        type: 'true-false',
        prompt: 'Tom soll Brot kaufen.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-017-q3',
        type: 'true-false',
        prompt: 'Mama möchte Käse.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-018',
    title: 'Aufgabe 18',
    instruction: 'Lesen Sie die Nachricht. Sind die Aussagen richtig oder falsch?',
    visualType: 'sms',
    visual: {
      sender: 'Nora',
      date: 'Heute, 10:02',
      message: `Hi Ali,
ich bin heute bis 17 Uhr im Büro. Danach gehe ich direkt zum Zahnarzt. Ich rufe dich gegen 19 Uhr an. Bitte warte nicht auf mich zum Essen.
Nora`,
    },
    questions: [
      {
        id: 'teil1-018-q1',
        type: 'true-false',
        prompt: 'Nora arbeitet heute bis 17 Uhr.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-018-q2',
        type: 'true-false',
        prompt: 'Nora geht nach der Arbeit zum Arzt.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-018-q3',
        type: 'true-false',
        prompt: 'Nora möchte Ali gegen 19 Uhr anrufen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-018-q4',
        type: 'true-false',
        prompt: 'Ali soll mit dem Essen auf Nora warten.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-019',
    title: 'Aufgabe 19',
    instruction: 'Lesen Sie die Postkarte. Sind die Aussagen richtig oder falsch?',
    visualType: 'postcard',
    visual: {
      title: 'Aus München',
      message: `Liebe Eltern,
München gefällt uns sehr. Am Freitag waren wir im Museum, am Samstag auf dem Markt. Morgen fahren wir wieder nach Hause. Unser Zug fährt um 11.20 Uhr.
Viele Grüße
Paul und Jana`,
    },
    questions: [
      {
        id: 'teil1-019-q1',
        type: 'true-false',
        prompt: 'Paul und Jana sind in München.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-019-q2',
        type: 'true-false',
        prompt: 'Am Samstag waren sie im Museum.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-019-q3',
        type: 'true-false',
        prompt: 'Sie fahren morgen nach Hause.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-020',
    title: 'Aufgabe 20',
    instruction: 'Lesen Sie die E-Mail. Sind die Aussagen richtig oder falsch?',
    visualType: 'email',
    visual: {
      sender: 'Frau Braun',
      recipient: 'Herrn Koch',
      subject: 'Wohnungsbesichtigung',
      body: `Hallo Herr Koch,
Sie können die Wohnung am Mittwoch um 18 Uhr besichtigen. Die Wohnung ist im zweiten Stock. Bitte klingeln Sie bei „Braun“.
Viele Grüße
Frau Braun`,
    },
    questions: [
      {
        id: 'teil1-020-q1',
        type: 'true-false',
        prompt: 'Herr Koch kann die Wohnung am Mittwoch sehen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-020-q2',
        type: 'true-false',
        prompt: 'Die Wohnung ist im ersten Stock.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-020-q3',
        type: 'true-false',
        prompt: 'Herr Koch soll bei „Braun“ klingeln.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-021',
    title: 'Aufgabe 21',
    instruction: 'Lesen Sie die E-Mail. Sind die Aussagen richtig oder falsch?',
    visualType: 'email',
    visual: {
      sender: 'Claudia',
      recipient: 'Ben',
      subject: 'Der neue Arbeitsplatz',
      body: `Hallo Ben,
ich arbeite seit dieser Woche in einem neuen Büro. Das Büro ist kleiner als das alte, aber es ist sehr hell. In der Mittagspause gehe ich meistens mit meinen Kollegen in den Park. Am Freitag habe ich nur bis 13 Uhr Arbeit.
Viele Grüße
Claudia`,
    },
    questions: [
      {
        id: 'teil1-021-q1',
        type: 'true-false',
        prompt: 'Claudia arbeitet seit dieser Woche in einem neuen Büro.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-021-q2',
        type: 'true-false',
        prompt: 'Das neue Büro ist größer als das alte.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-021-q3',
        type: 'true-false',
        prompt: 'Claudia geht in der Mittagspause oft in den Park.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-021-q4',
        type: 'true-false',
        prompt: 'Am Freitag arbeitet Claudia bis zum Abend.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-022',
    title: 'Aufgabe 22',
    instruction: 'Lesen Sie den Brief. Sind die Aussagen richtig oder falsch?',
    visualType: 'letter',
    visual: {
      recipient: 'Carmen',
      date: 'Montag',
      body: `Liebe Carmen,
am kommenden Wochenende möchten wir mit unseren Freunden in den Bergen wandern. Am Samstag fahren wir früh los. Am Sonntag kommen wir am Nachmittag wieder. Wenn du Zeit hast, kannst du gern mitkommen. Wir haben noch einen Platz im Auto.
Bis bald
Ralf`,
    },
    questions: [
      {
        id: 'teil1-022-q1',
        type: 'true-false',
        prompt: 'Ralf möchte am Wochenende wandern gehen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-022-q2',
        type: 'true-false',
        prompt: 'Sie fahren am Samstag erst am Nachmittag los.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-023',
    title: 'Aufgabe 23',
    instruction: 'Lesen Sie die Notiz. Sind die Aussagen richtig oder falsch?',
    visualType: 'note',
    visual: {
      title: 'Für den Hausmeister',
      message: `Die Lampe im Flur funktioniert nicht. Bitte können Sie sie morgen reparieren? Ich bin ab 16 Uhr zu Hause. Vorher bin ich bei der Arbeit.
Danke
Anna Keller`,
    },
    questions: [
      {
        id: 'teil1-023-q1',
        type: 'true-false',
        prompt: 'Die Lampe im Flur ist kaputt.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-023-q2',
        type: 'true-false',
        prompt: 'Anna ist morgen den ganzen Tag zu Hause.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-023-q3',
        type: 'true-false',
        prompt: 'Der Hausmeister kann Anna ab 16 Uhr zu Hause finden.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-024',
    title: 'Aufgabe 24',
    instruction: 'Lesen Sie die Nachricht. Sind die Aussagen richtig oder falsch?',
    visualType: 'sms',
    visual: {
      sender: 'Murat',
      date: 'Heute, 12:48',
      message: `Hallo Lena,
danke für die Einladung! Ich komme gern am Samstag. Soll ich etwas zu essen mitbringen? Ich kann einen Salat machen. Sag mir bitte noch, wann die Party beginnt.
Murat`,
    },
    questions: [
      {
        id: 'teil1-024-q1',
        type: 'true-false',
        prompt: 'Murat möchte am Samstag kommen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-024-q2',
        type: 'true-false',
        prompt: 'Murat bringt auf jeden Fall einen Kuchen mit.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-024-q3',
        type: 'true-false',
        prompt: 'Murat kann einen Salat machen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-025',
    title: 'Aufgabe 25',
    instruction: 'Lesen Sie die Postkarte. Sind die Aussagen richtig oder falsch?',
    visualType: 'postcard',
    visual: {
      title: 'Grüße aus Dresden',
      message: `Hallo Oma,
wir sind heute in Dresden angekommen. Nach dem Mittagessen gehen wir in die Stadt. Morgen wollen wir ein Schloss besuchen. Leider ist unser Hotelzimmer sehr klein, aber es ist sauber.
Liebe Grüße
Lena`,
    },
    questions: [
      {
        id: 'teil1-025-q1',
        type: 'true-false',
        prompt: 'Lena ist heute in Dresden angekommen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-025-q2',
        type: 'true-false',
        prompt: 'Heute besuchen sie ein Schloss.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-025-q3',
        type: 'true-false',
        prompt: 'Das Hotelzimmer ist groß.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-025-q4',
        type: 'true-false',
        prompt: 'Das Hotelzimmer ist sauber.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-026',
    title: 'Aufgabe 26',
    instruction: 'Lesen Sie die E-Mail. Sind die Aussagen richtig oder falsch?',
    visualType: 'email',
    visual: {
      sender: 'Arztpraxis am Markt',
      recipient: 'Frau Neumann',
      subject: 'Terminänderung',
      body: `Guten Tag Frau Neumann,
Ihr Termin am Dienstag kann leider nicht stattfinden. Wir haben einen neuen Termin für Sie: Donnerstag, 11 Uhr. Wenn der neue Termin nicht passt, rufen Sie uns bitte an.
Ihre Arztpraxis`,
    },
    questions: [
      {
        id: 'teil1-026-q1',
        type: 'true-false',
        prompt: 'Der Termin am Dienstag findet statt.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-026-q2',
        type: 'true-false',
        prompt: 'Der neue Termin ist am Donnerstag.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-026-q3',
        type: 'true-false',
        prompt: 'Der neue Termin ist um 11 Uhr.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-026-q4',
        type: 'true-false',
        prompt: 'Frau Neumann soll anrufen, wenn der Termin nicht passt.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-027',
    title: 'Aufgabe 27',
    instruction: 'Lesen Sie die Notiz. Sind die Aussagen richtig oder falsch?',
    visualType: 'fridge-note',
    visual: {
      title: 'Heute Abend',
      message: `Bitte stell den Saft kalt und schneide die Tomaten. Das Brot liegt im Schrank. Um 19 Uhr kommen die Gäste. Ich bin noch in der Küche.
Papa`,
    },
    questions: [
      {
        id: 'teil1-027-q1',
        type: 'true-false',
        prompt: 'Der Saft soll kalt sein.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-027-q2',
        type: 'true-false',
        prompt: 'Das Brot liegt im Kühlschrank.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-027-q3',
        type: 'true-false',
        prompt: 'Die Gäste kommen um 19 Uhr.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-028',
    title: 'Aufgabe 28',
    instruction: 'Lesen Sie den Brief. Sind die Aussagen richtig oder falsch?',
    visualType: 'letter',
    visual: {
      recipient: 'Herrn Braun',
      date: 'Donnerstag',
      body: `Sehr geehrter Herr Braun,
Sie können Ihren neuen Ausweis am Freitag zwischen 8 und 12 Uhr bei uns abholen. Bitte bringen Sie den alten Ausweis mit. Am Samstag ist das Büro geschlossen.
Mit freundlichen Grüßen
Bürgerbüro`,
    },
    questions: [
      {
        id: 'teil1-028-q1',
        type: 'true-false',
        prompt: 'Herr Braun kann den Ausweis am Freitag abholen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-028-q2',
        type: 'true-false',
        prompt: 'Er kann nur am Samstag kommen.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-028-q3',
        type: 'true-false',
        prompt: 'Er soll seinen alten Ausweis mitbringen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-028-q4',
        type: 'true-false',
        prompt: 'Das Büro ist am Samstag geschlossen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-029',
    title: 'Aufgabe 29',
    instruction: 'Lesen Sie die Nachricht. Sind die Aussagen richtig oder falsch?',
    visualType: 'sms',
    visual: {
      sender: 'Emma',
      date: 'Heute, 18:30',
      message: `Hi Jonas,
ich bin gerade noch im Bus. Der Bus hat Verspätung. Ich bin wahrscheinlich erst um 19.15 Uhr am Bahnhof. Bitte warte dort auf mich.
Emma`,
    },
    questions: [
      {
        id: 'teil1-029-q1',
        type: 'true-false',
        prompt: 'Emma ist gerade im Bus.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-029-q2',
        type: 'true-false',
        prompt: 'Der Bus kommt früher als geplant.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-029-q3',
        type: 'true-false',
        prompt: 'Emma kommt wahrscheinlich um Viertel nach sieben am Bahnhof an.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-030',
    title: 'Aufgabe 30',
    instruction: 'Lesen Sie die E-Mail. Sind die Aussagen richtig oder falsch?',
    visualType: 'email',
    visual: {
      sender: 'Thomas',
      recipient: 'Lisa',
      subject: 'Der Kurs morgen',
      body: `Hallo Lisa,
morgen findet unser Deutschkurs nicht im Raum 3 statt. Der Raum ist geschlossen. Wir treffen uns deshalb im Raum 7, wie immer um 9 Uhr. Bitte sag das auch Maria.
Viele Grüße
Thomas`,
    },
    questions: [
      {
        id: 'teil1-030-q1',
        type: 'true-false',
        prompt: 'Der Kurs ist morgen in Raum 3.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-030-q2',
        type: 'true-false',
        prompt: 'Die Gruppe trifft sich in Raum 7.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-030-q3',
        type: 'true-false',
        prompt: 'Der Kurs beginnt morgen um 9 Uhr.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-030-q4',
        type: 'true-false',
        prompt: 'Thomas möchte, dass Lisa Maria informiert.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-031',
    title: 'Aufgabe 31',
    instruction: 'Lesen Sie den Brief. Sind die Aussagen richtig oder falsch?',
    visualType: 'letter',
    visual: {
      recipient: 'Nina',
      date: 'Samstag',
      body: `Liebe Nina,
am Montag kommt meine Mutter zu Besuch. Sie bleibt bis Mittwoch. Deshalb habe ich am Dienstag wenig Zeit. Am Mittwochabend können wir uns aber gern treffen. Hast du Zeit?
Viele Grüße
Eva`,
    },
    questions: [
      {
        id: 'teil1-031-q1',
        type: 'true-false',
        prompt: 'Evas Mutter kommt am Montag.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-031-q2',
        type: 'true-false',
        prompt: 'Evas Mutter bleibt bis Donnerstag.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-031-q3',
        type: 'true-false',
        prompt: 'Eva hat am Dienstag viel Zeit.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-031-q4',
        type: 'true-false',
        prompt: 'Eva möchte Nina am Mittwochabend treffen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-032',
    title: 'Aufgabe 32',
    instruction: 'Lesen Sie die Postkarte. Sind die Aussagen richtig oder falsch?',
    visualType: 'postcard',
    visual: {
      title: 'Urlaub auf dem Land',
      message: `Hallo ihr zwei,
wir wohnen in einem kleinen Haus auf dem Land. Hier ist es ruhig und sehr schön. Jeden Morgen essen wir draußen. Heute besuchen wir einen Markt im Dorf. Morgen fahren wir mit dem Bus in die Stadt.
Liebe Grüße
Sven`,
    },
    questions: [
      {
        id: 'teil1-032-q1',
        type: 'true-false',
        prompt: 'Sven wohnt auf dem Land.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-032-q2',
        type: 'true-false',
        prompt: 'Jeden Morgen essen sie im Restaurant.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-033',
    title: 'Aufgabe 33',
    instruction: 'Lesen Sie die Notiz. Sind die Aussagen richtig oder falsch?',
    visualType: 'note',
    visual: {
      title: 'Liebe Frau Roth',
      message: `Ihr Paket ist beim Nachbarn im Erdgeschoss. Er ist heute ab 18 Uhr zu Hause. Bitte holen Sie das Paket heute noch ab. Morgen ist niemand zu Hause.
Der Postbote`,
    },
    questions: [
      {
        id: 'teil1-033-q1',
        type: 'true-false',
        prompt: 'Das Paket ist beim Nachbarn.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-033-q2',
        type: 'true-false',
        prompt: 'Der Nachbar wohnt im zweiten Stock.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-033-q3',
        type: 'true-false',
        prompt: 'Frau Roth kann das Paket ab 18 Uhr holen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-033-q4',
        type: 'true-false',
        prompt: 'Morgen kann sie das Paket sicher holen.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-034',
    title: 'Aufgabe 34',
    instruction: 'Lesen Sie die E-Mail. Sind die Aussagen richtig oder falsch?',
    visualType: 'email',
    visual: {
      sender: 'Sportverein West',
      recipient: 'Mitglieder',
      subject: 'Samstag im Park',
      body: `Hallo zusammen,
am Samstag machen wir einen kleinen Sporttag im Park. Wir beginnen um 10 Uhr. Bitte bringt Wasser und bequeme Schuhe mit. Bei Regen findet der Sporttag am Sonntag statt.
Viele Grüße
Sportverein West`,
    },
    questions: [
      {
        id: 'teil1-034-q1',
        type: 'true-false',
        prompt: 'Der Sporttag ist am Samstag.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-034-q2',
        type: 'true-false',
        prompt: 'Der Sporttag beginnt um 12 Uhr.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-034-q3',
        type: 'true-false',
        prompt: 'Die Teilnehmer sollen Wasser mitbringen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-034-q4',
        type: 'true-false',
        prompt: 'Bei Regen findet die Veranstaltung trotzdem am Samstag statt.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-035',
    title: 'Aufgabe 35',
    instruction: 'Lesen Sie die Nachricht. Sind die Aussagen richtig oder falsch?',
    visualType: 'sms',
    visual: {
      sender: 'Daniel',
      date: 'Heute, 07:55',
      message: `Guten Morgen, Anna! Ich habe heute einen Termin im Krankenhaus und komme erst am Nachmittag ins Büro. Ich habe die Unterlagen schon auf deinen Tisch gelegt. Danke!
Daniel`,
    },
    questions: [
      {
        id: 'teil1-035-q1',
        type: 'true-false',
        prompt: 'Daniel hat heute einen Termin im Krankenhaus.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-035-q2',
        type: 'true-false',
        prompt: 'Daniel kommt heute früh ins Büro.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-035-q3',
        type: 'true-false',
        prompt: 'Die Unterlagen liegen auf Annas Tisch.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-036',
    title: 'Aufgabe 36',
    instruction: 'Lesen Sie den Brief. Sind die Aussagen richtig oder falsch?',
    visualType: 'letter',
    visual: {
      recipient: 'Frau Meier',
      date: '2. August',
      body: `Guten Tag Frau Meier,
wir haben Ihre Anmeldung bekommen. Der Sprachkurs beginnt am 10. August und dauert sechs Wochen. Der Unterricht ist immer dienstags und donnerstags am Abend.
Mit freundlichen Grüßen
Sprachzentrum`,
    },
    questions: [
      {
        id: 'teil1-036-q1',
        type: 'true-false',
        prompt: 'Die Anmeldung von Frau Meier ist angekommen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-036-q2',
        type: 'true-false',
        prompt: 'Der Kurs beginnt im September.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-036-q3',
        type: 'true-false',
        prompt: 'Der Kurs dauert sechs Wochen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-036-q4',
        type: 'true-false',
        prompt: 'Der Unterricht ist zweimal pro Woche.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-037',
    title: 'Aufgabe 37',
    instruction: 'Lesen Sie die Notiz. Sind die Aussagen richtig oder falsch?',
    visualType: 'fridge-note',
    visual: {
      title: 'Für heute',
      message: `Bitte deck den Tisch für vier Personen. Die Suppe ist schon fertig. Das Brot liegt im Korb. Um 20 Uhr kommen meine Eltern.
Mama`,
    },
    questions: [
      {
        id: 'teil1-037-q1',
        type: 'true-false',
        prompt: 'Der Tisch soll für vier Personen gedeckt werden.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-037-q2',
        type: 'true-false',
        prompt: 'Die Suppe muss noch gekocht werden.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-037-q3',
        type: 'true-false',
        prompt: 'Das Brot liegt im Korb.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-037-q4',
        type: 'true-false',
        prompt: 'Die Eltern kommen um 8 Uhr abends.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-038',
    title: 'Aufgabe 38',
    instruction: 'Lesen Sie die Postkarte. Sind die Aussagen richtig oder falsch?',
    visualType: 'postcard',
    visual: {
      title: 'Viele Grüße aus Wien',
      message: `Liebe Familie,
Wien ist wirklich schön. Am ersten Tag haben wir den Stephansdom besucht, gestern waren wir im Zoo. Heute regnet es, deshalb bleiben wir länger im Hotel. Morgen fahren wir nach Hause.
Bis bald
Julia`,
    },
    questions: [
      {
        id: 'teil1-038-q1',
        type: 'true-false',
        prompt: 'Julia ist in Wien.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-038-q2',
        type: 'true-false',
        prompt: 'Gestern war Julia im Zoo.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-038-q3',
        type: 'true-false',
        prompt: 'Heute bleibt sie wegen des Wetters länger im Hotel.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-038-q4',
        type: 'true-false',
        prompt: 'Morgen bleibt Julia in Wien.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-039',
    title: 'Aufgabe 39',
    instruction: 'Lesen Sie die E-Mail. Sind die Aussagen richtig oder falsch?',
    visualType: 'email',
    visual: {
      sender: 'Markt Müller',
      recipient: 'Herrn Seidel',
      subject: 'Ihre Bestellung',
      body: `Hallo Herr Seidel,
Ihre Bestellung ist fertig. Sie können sie heute bis 19 Uhr oder morgen zwischen 9 und 12 Uhr abholen. Bitte bringen Sie den Zettel mit.
Viele Grüße
Markt Müller`,
    },
    questions: [
      {
        id: 'teil1-039-q1',
        type: 'true-false',
        prompt: 'Die Bestellung ist fertig.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-039-q2',
        type: 'true-false',
        prompt: 'Herr Seidel kann sie nur heute abholen.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-039-q3',
        type: 'true-false',
        prompt: 'Morgen kann er die Bestellung am Vormittag abholen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-039-q4',
        type: 'true-false',
        prompt: 'Er soll den Abholschein mitbringen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-040',
    title: 'Aufgabe 40',
    instruction: 'Lesen Sie die Nachricht. Sind die Aussagen richtig oder falsch?',
    visualType: 'sms',
    visual: {
      sender: 'Sofia',
      date: 'Gestern, 20:16',
      message: `Hallo Kim,
ich habe am Freitag keine Zeit. Meine Schwester kommt zu Besuch. Am Samstag bin ich frei. Wollen wir dann zusammen ins Kino gehen? Der Film beginnt um 18.30 Uhr.
Sofia`,
    },
    questions: [
      {
        id: 'teil1-040-q1',
        type: 'true-false',
        prompt: 'Sofia hat am Freitag Zeit.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-040-q2',
        type: 'true-false',
        prompt: 'Sofias Schwester kommt am Freitag.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-040-q3',
        type: 'true-false',
        prompt: 'Sofia hat am Samstag Zeit.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-040-q4',
        type: 'true-false',
        prompt: 'Der Film beginnt um halb sieben.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-041',
    title: 'Aufgabe 41',
    instruction: 'Lesen Sie den Brief. Sind die Aussagen richtig oder falsch?',
    visualType: 'letter',
    visual: {
      recipient: 'Carmen',
      date: 'Mittwoch',
      body: `Liebe Carmen,
vielen Dank für deine Karte. Unsere Reise nach Berlin war sehr schön. Wir waren nur drei Tage dort, aber wir haben viel gesehen. Am ersten Tag waren wir im Museum, am zweiten Tag im Zoo. Am Sonntag sind wir am Abend wieder nach Hause gefahren.
Liebe Grüße
Ralf`,
    },
    questions: [
      {
        id: 'teil1-041-q1',
        type: 'true-false',
        prompt: 'Ralf war mit anderen Personen in Berlin.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-041-q2',
        type: 'true-false',
        prompt: 'Die Reise dauerte eine Woche.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-041-q3',
        type: 'true-false',
        prompt: 'Am ersten Tag waren sie im Museum.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-041-q4',
        type: 'true-false',
        prompt: 'Am Sonntag sind sie am Morgen nach Hause gefahren.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-042',
    title: 'Aufgabe 42',
    instruction: 'Lesen Sie die E-Mail. Sind die Aussagen richtig oder falsch?',
    visualType: 'email',
    visual: {
      sender: 'Anna',
      recipient: 'Peter',
      subject: 'Besuch am Wochenende',
      body: `Hallo Peter,
meine Eltern kommen schon am Freitag und bleiben bis Montag. Deshalb können wir uns am Samstag nicht bei mir treffen. Wenn du möchtest, können wir am Sonntagvormittag zusammen Kaffee trinken. Ich muss aber spätestens um 12 Uhr wieder zu Hause sein.
Bis bald
Anna`,
    },
    questions: [
      {
        id: 'teil1-042-q1',
        type: 'true-false',
        prompt: 'Annas Eltern kommen am Freitag.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-042-q2',
        type: 'true-false',
        prompt: 'Annas Eltern bleiben nur bis Samstag.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-042-q3',
        type: 'true-false',
        prompt: 'Anna kann sich am Samstag mit Peter treffen.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-042-q4',
        type: 'true-false',
        prompt: 'Anna hat am Sonntagvormittag Zeit.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-043',
    title: 'Aufgabe 43',
    instruction: 'Lesen Sie die Notiz. Sind die Aussagen richtig oder falsch?',
    visualType: 'note',
    visual: {
      title: 'Für meine Schwester',
      message: `Ich bin heute nicht zu Hause. Der Schlüssel liegt unter der Fußmatte. Bitte gieße die Blumen und mach das Fenster im Wohnzimmer zu. Es regnet heute Abend.
Danke
Laura`,
    },
    questions: [
      {
        id: 'teil1-043-q1',
        type: 'true-false',
        prompt: 'Laura ist heute zu Hause.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-043-q2',
        type: 'true-false',
        prompt: 'Der Schlüssel liegt unter der Fußmatte.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-044',
    title: 'Aufgabe 44',
    instruction: 'Lesen Sie die Postkarte. Sind die Aussagen richtig oder falsch?',
    visualType: 'postcard',
    visual: {
      title: 'Hallo aus Köln!',
      message: `Liebe Oma,
heute Morgen sind wir in Köln angekommen. Das Hotel liegt nicht weit vom Bahnhof. Nach dem Mittagessen wollen wir eine Stadtrundfahrt machen. Am Abend treffen wir Freunde, die hier wohnen. Morgen fahren wir weiter nach Bonn.
Liebe Grüße
Max`,
    },
    questions: [
      {
        id: 'teil1-044-q1',
        type: 'true-false',
        prompt: 'Max ist heute Morgen in Köln angekommen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-044-q2',
        type: 'true-false',
        prompt: 'Das Hotel ist weit vom Bahnhof entfernt.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-044-q3',
        type: 'true-false',
        prompt: 'Nach dem Mittagessen machen sie eine Stadtrundfahrt.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-044-q4',
        type: 'true-false',
        prompt: 'Morgen fahren sie zurück nach Hause.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-045',
    title: 'Aufgabe 45',
    instruction: 'Lesen Sie die E-Mail. Sind die Aussagen richtig oder falsch?',
    visualType: 'email',
    visual: {
      sender: 'Deutschschule Mitte',
      recipient: 'Lena',
      subject: 'Prüfung',
      body: `Hallo Lena,
die A1-Prüfung ist am Samstag. Bitte kommen Sie um 8.30 Uhr in die Schule. Die Prüfung beginnt um 9 Uhr. Bringen Sie bitte Ihren Pass und einen Kugelschreiber mit. Nach dem Schreiben gibt es eine kurze Pause.
Viele Grüße
Deutschschule Mitte`,
    },
    questions: [
      {
        id: 'teil1-045-q1',
        type: 'true-false',
        prompt: 'Die Prüfung ist am Samstag.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-045-q2',
        type: 'true-false',
        prompt: 'Lena soll erst um 9 Uhr in der Schule sein.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-045-q3',
        type: 'true-false',
        prompt: 'Die Prüfung beginnt um 9 Uhr.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-045-q4',
        type: 'true-false',
        prompt: 'Lena soll ihren Pass mitbringen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-046',
    title: 'Aufgabe 46',
    instruction: 'Lesen Sie die Nachricht. Sind die Aussagen richtig oder falsch?',
    visualType: 'sms',
    visual: {
      sender: 'Robert',
      date: 'Heute, 14:26',
      message: `Hallo Maria,
ich bin schon im Supermarkt. Wir haben keine Tomaten mehr. Soll ich auch Käse kaufen? Ich bin gegen 15 Uhr zu Hause. Ruf mich bitte an, wenn du noch etwas brauchst.
Robert`,
    },
    questions: [
      {
        id: 'teil1-046-q1',
        type: 'true-false',
        prompt: 'Robert ist im Supermarkt.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-046-q2',
        type: 'true-false',
        prompt: 'Zu Hause gibt es noch viele Tomaten.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-047',
    title: 'Aufgabe 47',
    instruction: 'Lesen Sie den Brief. Sind die Aussagen richtig oder falsch?',
    visualType: 'letter',
    visual: {
      recipient: 'Herrn Klein',
      date: 'Freitag',
      body: `Sehr geehrter Herr Klein,
wir können Ihren Termin am Montag leider nicht verschieben. Wenn Sie am Montag nicht kommen können, rufen Sie bitte bis heute 17 Uhr an. Einen neuen Termin können wir erst nächste Woche geben.
Mit freundlichen Grüßen
Praxis am Rathaus`,
    },
    questions: [
      {
        id: 'teil1-047-q1',
        type: 'true-false',
        prompt: 'Der Termin ist am Montag.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-047-q2',
        type: 'true-false',
        prompt: 'Herr Klein kann den Termin einfach auf Dienstag verschieben.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-047-q3',
        type: 'true-false',
        prompt: 'Er soll sich bis 17 Uhr melden, wenn er nicht kommen kann.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-047-q4',
        type: 'true-false',
        prompt: 'Ein neuer Termin ist noch am selben Tag möglich.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-048',
    title: 'Aufgabe 48',
    instruction: 'Lesen Sie die Notiz. Sind die Aussagen richtig oder falsch?',
    visualType: 'note',
    visual: {
      title: 'Heute',
      message: `Bitte bring den Schlüssel mit. Ich gehe um 16 Uhr zum Arzt und komme erst gegen 18 Uhr zurück. Das Abendessen steht im Kühlschrank. Du kannst schon um 17 Uhr essen.
Mama`,
    },
    questions: [
      {
        id: 'teil1-048-q1',
        type: 'true-false',
        prompt: 'Die Person soll den Schlüssel mitbringen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-048-q2',
        type: 'true-false',
        prompt: 'Mama geht um 16 Uhr zum Arzt.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-048-q3',
        type: 'true-false',
        prompt: 'Mama kommt um 17 Uhr zurück.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-048-q4',
        type: 'true-false',
        prompt: 'Das Abendessen ist im Kühlschrank.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-049',
    title: 'Aufgabe 49',
    instruction: 'Lesen Sie die E-Mail. Sind die Aussagen richtig oder falsch?',
    visualType: 'email',
    visual: {
      sender: 'Familie Wagner',
      recipient: 'Freunde',
      subject: 'Unser neues Haus',
      body: `Hallo ihr Lieben,
seit einem Monat wohnen wir in unserem neuen Haus. Es liegt etwas außerhalb der Stadt, aber die Bushaltestelle ist ganz in der Nähe. Im Garten haben wir viel Platz. Im nächsten Frühjahr möchten wir dort Blumen pflanzen. Besucht uns doch einmal am Samstag!
Viele Grüße
Familie Wagner`,
    },
    questions: [
      {
        id: 'teil1-049-q1',
        type: 'true-false',
        prompt: 'Die Familie wohnt seit einem Monat im neuen Haus.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-049-q2',
        type: 'true-false',
        prompt: 'Das Haus liegt mitten im Stadtzentrum.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      },
      {
        id: 'teil1-049-q3',
        type: 'true-false',
        prompt: 'Die Bushaltestelle ist in der Nähe.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-049-q4',
        type: 'true-false',
        prompt: 'Die Familie möchte erst im nächsten Frühjahr Blumen pflanzen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      }
    ],
  },

  {
    id: 'teil1-050',
    title: 'Aufgabe 50',
    instruction: 'Lesen Sie die Nachricht. Sind die Aussagen richtig oder falsch?',
    visualType: 'sms',
    visual: {
      sender: 'Julia',
      date: 'Heute, 18:02',
      message: `Hallo Tom,
danke für deine Nachricht. Am Donnerstag kann ich leider nicht kommen, weil ich einen Termin beim Arzt habe. Freitag passt aber gut. Wir können uns nach der Arbeit im Café neben dem Bahnhof treffen. Ich bin ab 17.30 Uhr dort.
Liebe Grüße
Julia`,
    },
    questions: [
      {
        id: 'teil1-050-q1',
        type: 'true-false',
        prompt: 'Julia kann am Donnerstag nicht kommen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-050-q2',
        type: 'true-false',
        prompt: 'Julia hat am Donnerstag einen Arzttermin.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-050-q3',
        type: 'true-false',
        prompt: 'Am Freitag möchte sie Tom im Café treffen.',
        correctAnswer: true,
        explanation: 'Die Aussage stimmt mit der Information im Text überein.',
      },
      {
        id: 'teil1-050-q4',
        type: 'true-false',
        prompt: 'Das Café ist weit vom Bahnhof entfernt.',
        correctAnswer: false,
        explanation: 'Die Aussage stimmt nicht mit der Information im Text überein.',
      }
    ],
  },
];
