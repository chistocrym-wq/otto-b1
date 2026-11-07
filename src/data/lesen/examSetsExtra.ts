import type { LesenExamSet } from './examSets';

export const lesenExamSetsExtra: LesenExamSet[] = [
  {
    id: 'lesen-test-4',
    title: 'Тест 4',
    subtitle: 'Врач, работа, поездки, покупки и городские сервисы',
    teil1: [
      {
        title: 'E-Mail von Frau Keller',
        text: `Guten Tag Herr Petrov,\n\nSie haben am Donnerstag um 15.30 Uhr einen Termin bei Dr. Reuter. Die Praxis ist jetzt in der Gartenstraße 18, nicht mehr in der Bahnhofstraße. Bitte bringen Sie Ihre Versicherungskarte mit.\n\nViele Grüße\nPraxis Reuter`,
        statements: [
          {
            statement: 'Herr Petrov hat am Donnerstag einen Arzttermin.',
            correct: 'richtig',
            explanation: 'Der Termin ist am Donnerstag um 15.30 Uhr.',
          },
          {
            statement: 'Die Praxis ist noch in der Bahnhofstraße.',
            correct: 'falsch',
            explanation: 'Die Praxis ist jetzt in der Gartenstraße 18.',
          },
        ],
      },
      {
        title: 'Nachricht von der Arbeit',
        text: `Hallo Mila,\n\nmorgen beginnt deine Schicht nicht wie sonst um 8 Uhr, sondern erst um 10 Uhr. Bitte komm direkt ins Büro im zweiten Stock. Um 12.30 Uhr machen wir gemeinsam Mittagspause. Am Nachmittag arbeitest du bis 18 Uhr.\n\nBis morgen\nTom`,
        statements: [
          {
            statement: 'Mila soll morgen um 10 Uhr mit der Arbeit anfangen.',
            correct: 'richtig',
            explanation: 'Tom schreibt, dass die Schicht morgen erst um 10 Uhr beginnt.',
          },
          {
            statement: 'Mila arbeitet morgen im ersten Stock.',
            correct: 'falsch',
            explanation: 'Sie soll direkt ins Büro im zweiten Stock kommen.',
          },
          {
            statement: 'Die Mittagspause ist um halb eins.',
            correct: 'richtig',
            explanation: '12.30 Uhr bedeutet halb eins.',
          },
        ],
      },
    ],
    teil2: [
      {
        situation: 'Sie möchten am Freitag nach 20 Uhr noch Lebensmittel kaufen.',
        a: {
          label: 'www.markt-am-tor.de',
          heading: 'Markt am Tor',
          text: 'Montag–Samstag 7.00–22.00 Uhr. Lebensmittel, Getränke, Drogerie.',
        },
        b: {
          label: 'www.laden-zentrum.de',
          heading: 'Laden Zentrum',
          text: 'Montag–Freitag 8.00–19.00 Uhr. Samstag 8.00–14.00 Uhr.',
        },
        correct: 'a',
        explanation: 'Nur Markt am Tor ist am Freitag nach 20 Uhr noch geöffnet.',
      },
      {
        situation: 'Sie möchten morgen früh mit dem Bus zum Flughafen fahren und spätestens um 7 Uhr dort sein.',
        a: {
          label: 'www.airport-linie.de',
          heading: 'Bus 91 zum Flughafen',
          text: 'Hauptbahnhof ab 5.45 Uhr · Flughafen an 6.25 Uhr. Nächste Fahrt 6.45–7.25 Uhr.',
        },
        b: {
          label: 'www.nachtbus.de',
          heading: 'Nachtbus N4',
          text: 'Freitag und Samstag 0.30–4.30 Uhr. Endstation: Hauptbahnhof.',
        },
        correct: 'a',
        explanation: 'Die erste Fahrt der Linie 91 erreicht den Flughafen um 6.25 Uhr.',
      },
      {
        situation: 'Sie möchten einen Computerkurs für Anfänger am Wochenende besuchen.',
        a: {
          label: 'www.pc-kurs-start.de',
          heading: 'Computer für Anfänger',
          text: 'Samstag 10–13 Uhr. E-Mail, Internet und Textverarbeitung. Keine Vorkenntnisse nötig.',
        },
        b: {
          label: 'www.web-profi.de',
          heading: 'Webdesign intensiv',
          text: 'Montag–Freitag 9–16 Uhr. Gute Computerkenntnisse erforderlich.',
        },
        correct: 'a',
        explanation: 'Angebot a ist für Anfänger und findet am Samstag statt.',
      },
      {
        situation: 'Sie suchen für eine Nacht ein günstiges Einzelzimmer mit Frühstück.',
        a: {
          label: 'www.pension-linde.de',
          heading: 'Pension Linde',
          text: 'Einzelzimmer 49 € pro Nacht inklusive Frühstück. WLAN kostenlos.',
        },
        b: {
          label: 'www.apartment-city.de',
          heading: 'Apartment City',
          text: 'Apartments ab drei Nächten. 85 € pro Nacht. Frühstück nicht angeboten.',
        },
        correct: 'a',
        explanation: 'Pension a erlaubt eine Nacht und Frühstück ist bereits im Preis.',
      },
      {
        situation: 'Sie möchten heute ein Paket verschicken. Es ist 17.30 Uhr.',
        a: {
          label: 'www.paketpunkt-west.de',
          heading: 'Paketpunkt West',
          text: 'Montag–Freitag 9–18 Uhr. Pakete annehmen und abholen.',
        },
        b: {
          label: 'www.postshop-ost.de',
          heading: 'Postshop Ost',
          text: 'Montag–Freitag 8–17 Uhr. Samstag 9–12 Uhr.',
        },
        correct: 'a',
        explanation: 'Um 17.30 Uhr ist nur Paketpunkt West noch geöffnet.',
      },
    ],
    teil3: [
      {
        place: 'Im Wohnhaus',
        heading: 'Wasser abgestellt',
        text: 'Dienstag von 9 bis 12 Uhr gibt es wegen Reparaturarbeiten kein Wasser.',
        statement: 'Am Dienstag um 10 Uhr können Sie normal duschen.',
        correct: 'falsch',
        explanation: 'Zwischen 9 und 12 Uhr ist das Wasser abgestellt.',
      },
      {
        place: 'Vor einem Geschäft',
        heading: 'Heute länger geöffnet',
        text: 'Nur heute: geöffnet bis 21 Uhr. Ab morgen wieder bis 18 Uhr.',
        statement: 'Heute können Sie um 20 Uhr noch einkaufen.',
        correct: 'richtig',
        explanation: 'Heute ist das Geschäft ausnahmsweise bis 21 Uhr geöffnet.',
      },
      {
        place: 'Im Hotel',
        heading: 'Frühstück',
        text: 'Montag–Freitag 6.30–10.00 Uhr\nSamstag und Sonntag 7.30–11.00 Uhr',
        statement: 'Am Sonntag bekommen Sie um 11.30 Uhr noch Frühstück.',
        correct: 'falsch',
        explanation: 'Am Sonntag endet das Frühstück um 11 Uhr.',
      },
      {
        place: 'An der U-Bahn',
        heading: 'Linie U2',
        text: 'Wegen Bauarbeiten fährt die U2 heute nur bis Alexanderplatz. Weiter mit Bus 200.',
        statement: 'Heute fährt die U2 ohne Umsteigen über Alexanderplatz hinaus.',
        correct: 'falsch',
        explanation: 'Am Alexanderplatz muss man auf Bus 200 umsteigen.',
      },
      {
        place: 'In der Volkshochschule',
        heading: 'Anmeldung',
        text: 'Kursanmeldung nur online oder persönlich. Telefonische Anmeldung ist nicht möglich.',
        statement: 'Sie können sich telefonisch für einen Kurs anmelden.',
        correct: 'falsch',
        explanation: 'Telefonische Anmeldung ist ausdrücklich ausgeschlossen.',
      },
    ],
  },
  {
    id: 'lesen-test-5',
    title: 'Тест 5',
    subtitle: 'Семья, встречи, транспорт, досуг и повседневные объявления',
    teil1: [
      {
        title: 'SMS von Katharina',
        text: `Hallo Jonas, der Geburtstag von Paul beginnt morgen nicht um 17 Uhr, sondern erst um 18 Uhr. Wir treffen uns um 17.30 Uhr vor dem Supermarkt und kaufen zusammen ein Geschenk. Bitte komm nicht mit dem Auto – bei Paul gibt es kaum Parkplätze. Katharina`,
        statements: [
          {
            statement: 'Pauls Geburtstag beginnt um 18 Uhr.',
            correct: 'richtig',
            explanation: 'Katharina schreibt, dass die Feier erst um 18 Uhr beginnt.',
          },
          {
            statement: 'Jonas soll Katharina um 17 Uhr vor dem Supermarkt treffen.',
            correct: 'falsch',
            explanation: 'Treffpunkt ist um 17.30 Uhr.',
          },
        ],
      },
      {
        title: 'E-Mail von der Kita',
        text: `Liebe Eltern,\n\nam Freitag schließen wir die Kita schon um 15 Uhr. Am Vormittag machen wir mit den Kindern einen Ausflug in den Tierpark. Bitte geben Sie Ihrem Kind eine Trinkflasche und eine Jacke mit. Das Mittagessen bekommen die Kinder wie immer in der Kita.\n\nViele Grüße\nIhr Kita-Team`,
        statements: [
          {
            statement: 'Die Kita schließt am Freitag früher als sonst.',
            correct: 'richtig',
            explanation: 'Am Freitag schließt die Kita bereits um 15 Uhr.',
          },
          {
            statement: 'Die Eltern müssen ihrem Kind Mittagessen mitgeben.',
            correct: 'falsch',
            explanation: 'Das Mittagessen bekommen die Kinder wie immer in der Kita.',
          },
          {
            statement: 'Die Kinder gehen am Freitag in den Tierpark.',
            correct: 'richtig',
            explanation: 'Für den Vormittag ist ein Ausflug in den Tierpark angekündigt.',
          },
        ],
      },
    ],
    teil2: [
      {
        situation: 'Sie möchten heute Abend einen Film auf Deutsch im Kino sehen.',
        a: {
          label: 'www.kino-metro.de',
          heading: 'Kino Metro',
          text: 'Heute 20.15 Uhr: „Sommernacht“ – deutscher Film. Karten online verfügbar.',
        },
        b: {
          label: 'www.filmclub-international.de',
          heading: 'Filmclub International',
          text: 'Heute 20 Uhr: französischer Film mit englischen Untertiteln.',
        },
        correct: 'a',
        explanation: 'Nur Kino Metro zeigt heute Abend einen deutschen Film.',
      },
      {
        situation: 'Sie möchten am Sonntag mit einem Fahrrad einen Ausflug machen, besitzen aber kein Fahrrad.',
        a: {
          label: 'www.radverleih-see.de',
          heading: 'Fahrradverleih am See',
          text: 'Samstag und Sonntag 8–19 Uhr. Citybikes ab 12 € pro Tag.',
        },
        b: {
          label: 'www.radwerkstatt.de',
          heading: 'Radwerkstatt',
          text: 'Reparaturen Montag–Freitag. Sonntag geschlossen. Kein Verleih.',
        },
        correct: 'a',
        explanation: 'a verleiht sonntags Fahrräder.',
      },
      {
        situation: 'Sie möchten Ihrer Mutter Blumen schicken und online bezahlen.',
        a: {
          label: 'www.blumen-direkt.de',
          heading: 'Blumen online bestellen',
          text: 'Lieferung in ganz Deutschland. Online-Zahlung mit Karte oder PayPal.',
        },
        b: {
          label: 'www.gartenverein.de',
          heading: 'Gartenverein Sonnenweg',
          text: 'Tipps für Gartenfreunde. Treffen jeden ersten Mittwoch im Monat.',
        },
        correct: 'a',
        explanation: 'Nur a verkauft und liefert Blumen mit Online-Zahlung.',
      },
      {
        situation: 'Sie möchten Ihre Tochter am Mittwoch nach der Schule zu einem Musikkurs schicken.',
        a: {
          label: 'www.musik-kinder.de',
          heading: 'Gitarre für Kinder',
          text: 'Mittwoch 16–17 Uhr. Für Kinder von 8 bis 12 Jahren. Instrumente können geliehen werden.',
        },
        b: {
          label: 'www.musik-abend.de',
          heading: 'Gitarre für Erwachsene',
          text: 'Mittwoch 20–21.30 Uhr. Mindestalter 18 Jahre.',
        },
        correct: 'a',
        explanation: 'a ist am Mittwochnachmittag und ausdrücklich für Kinder.',
      },
      {
        situation: 'Sie suchen einen Zug von Frankfurt nach Köln, der nach 18 Uhr abfährt.',
        a: {
          label: 'www.bahn-auskunft-a.de',
          heading: 'Frankfurt → Köln',
          text: 'Abfahrt 17.25 Uhr · Ankunft 18.34 Uhr · ICE',
        },
        b: {
          label: 'www.bahn-auskunft-b.de',
          heading: 'Frankfurt → Köln',
          text: 'Abfahrt 18.42 Uhr · Ankunft 19.51 Uhr · ICE',
        },
        correct: 'b',
        explanation: 'Nur Verbindung b fährt nach 18 Uhr ab.',
      },
    ],
    teil3: [
      {
        place: 'Am Spielplatz',
        heading: 'Bitte beachten',
        text: 'Spielplatz täglich von 8 bis 20 Uhr geöffnet. Hunde dürfen nicht hinein.',
        statement: 'Sie können Ihren Hund mit auf den Spielplatz nehmen.',
        correct: 'falsch',
        explanation: 'Hunde sind auf dem Spielplatz nicht erlaubt.',
      },
      {
        place: 'Im Supermarkt',
        heading: 'Kasse 1 geschlossen',
        text: 'Bitte benutzen Sie heute die Kassen 2 bis 5.',
        statement: 'Heute können Sie an Kasse 3 bezahlen.',
        correct: 'richtig',
        explanation: 'Die Kassen 2 bis 5 sind geöffnet.',
      },
      {
        place: 'Im Fitnessstudio',
        heading: 'Sauna',
        text: 'Die Sauna ist wegen Reparaturarbeiten bis Freitag geschlossen. Fitnessbereich normal geöffnet.',
        statement: 'Sie können heute trainieren, auch wenn die Sauna geschlossen ist.',
        correct: 'richtig',
        explanation: 'Nur die Sauna ist geschlossen; der Fitnessbereich bleibt geöffnet.',
      },
      {
        place: 'An einer Haustür',
        heading: 'Paket für Wohnung 4',
        text: 'Ihr Paket liegt bei Frau Lange in Wohnung 7. Abholung heute ab 18 Uhr.',
        statement: 'Bewohner von Wohnung 4 können ihr Paket heute um 17 Uhr abholen.',
        correct: 'falsch',
        explanation: 'Die Abholung ist erst ab 18 Uhr möglich.',
      },
      {
        place: 'Im Parkhaus',
        heading: 'Ausfahrt nachts',
        text: 'Einfahrt 6–22 Uhr. Ausfahrt mit Parkticket jederzeit möglich.',
        statement: 'Wenn Ihr Auto schon im Parkhaus steht, können Sie auch nach 22 Uhr herausfahren.',
        correct: 'richtig',
        explanation: 'Die Ausfahrt ist mit Parkticket jederzeit möglich.',
      },
    ],
  },
];
