export type LesenBinaryAnswer = 'richtig' | 'falsch';
export type LesenChoiceAnswer = 'a' | 'b';

export interface LesenStatement {
  statement: string;
  correct: LesenBinaryAnswer;
  explanation: string;
}

export interface LesenTextBlock {
  title: string;
  text: string;
  statements: LesenStatement[];
}

export interface LesenOption {
  label: string;
  heading: string;
  text: string;
}

export interface LesenChoiceTask {
  situation: string;
  a: LesenOption;
  b: LesenOption;
  correct: LesenChoiceAnswer;
  explanation: string;
}

export interface LesenNoticeTask {
  place: string;
  heading: string;
  text: string;
  statement: string;
  correct: LesenBinaryAnswer;
  explanation: string;
}

export interface LesenExamSet {
  id: string;
  title: string;
  subtitle: string;
  teil1: LesenTextBlock[];
  teil2: LesenChoiceTask[];
  teil3: LesenNoticeTask[];
}

export const lesenExamSets: LesenExamSet[] = [
  {
    id: 'lesen-test-1',
    title: 'Тест 1',
    subtitle: 'Работа, встреча, жильё, курсы и городские объявления',
    teil1: [
      {
        title: 'E-Mail von Marta',
        text: `Liebe Lena,\n\nich bin nächste Woche von Dienstag bis Donnerstag in Leipzig. Ich arbeite dort auf einer Messe. Am Mittwoch bin ich ab 18 Uhr frei. Mein Hotel ist am Augustusplatz. Treffen wir uns um 18.30 Uhr im Café Central?\n\nViele Grüße\nMarta`,
        statements: [
          {
            statement: 'Marta ist wegen der Arbeit in Leipzig.',
            correct: 'richtig',
            explanation: 'Marta schreibt, dass sie in Leipzig auf einer Messe arbeitet.',
          },
          {
            statement: 'Marta möchte Lena am Dienstagabend treffen.',
            correct: 'falsch',
            explanation: 'Sie hat am Mittwoch ab 18 Uhr Zeit und schlägt 18.30 Uhr vor.',
          },
        ],
      },
      {
        title: 'Termin in der Zahnarztpraxis',
        text: `Sehr geehrter Herr Bauer,\n\nIhr Termin in unserer Zahnarztpraxis ist am Freitag, 14. Juni, um 10.30 Uhr. Bitte kommen Sie zehn Minuten früher. Wenn Sie nicht kommen können, rufen Sie uns spätestens am Donnerstag bis 18 Uhr an.\n\nPraxis Dr. Weber`,
        statements: [
          {
            statement: 'Herr Bauer hat am Freitag um 10.30 Uhr einen Termin.',
            correct: 'richtig',
            explanation: 'Im Text steht: Freitag, 14. Juni, um 10.30 Uhr.',
          },
          {
            statement: 'Herr Bauer soll um 10.40 Uhr in der Praxis sein.',
            correct: 'falsch',
            explanation: 'Er soll zehn Minuten früher kommen, also ungefähr um 10.20 Uhr.',
          },
          {
            statement: 'Herr Bauer kann den Termin noch am Freitagmorgen absagen.',
            correct: 'falsch',
            explanation: 'Eine Absage ist spätestens am Donnerstag bis 18 Uhr möglich.',
          },
        ],
      },
    ],
    teil2: [
      {
        situation: 'Sie machen drei Monate ein Praktikum in München und suchen ein möbliertes Zimmer.',
        a: {
          label: 'www.zimmer-auf-zeit.de',
          heading: 'Möbliert wohnen in München',
          text: 'Zimmer und kleine Apartments für 2 bis 6 Monate. Küche und Internet inklusive. Ab 520 € im Monat.',
        },
        b: {
          label: 'www.immokauf-muenchen.de',
          heading: 'Wohnungen kaufen',
          text: 'Eigentumswohnungen in München und Umgebung. Beratung für Käufer. Termine nach Vereinbarung.',
        },
        correct: 'a',
        explanation: 'Für ein dreimonatiges Praktikum passt ein möbliertes Zimmer auf Zeit. Angebot b ist nur zum Kaufen.',
      },
      {
        situation: 'Ihr Flug landet am Sonntag um 5.30 Uhr in Berlin. Sie möchten mit dem Bus ins Zentrum fahren.',
        a: {
          label: 'www.airportbus-berlin.de',
          heading: 'AirportBus',
          text: 'Täglich von 5.00 bis 24.00 Uhr. Alle 20 Minuten vom Flughafen zum Hauptbahnhof.',
        },
        b: {
          label: 'www.autopark-flughafen.de',
          heading: 'Parken am Flughafen',
          text: 'Parkplätze ab 8 € pro Tag. Kostenloser Shuttle von Parkplatz P4 zum Terminal.',
        },
        correct: 'a',
        explanation: 'Sie brauchen einen Bus vom Flughafen ins Zentrum. Genau das bietet a ab 5 Uhr an.',
      },
      {
        situation: 'Sie arbeiten bis 17 Uhr und möchten einen Deutschkurs A1 am Abend besuchen.',
        a: {
          label: 'www.deutsch-am-abend.de',
          heading: 'Deutsch A1 am Abend',
          text: 'Dienstag und Donnerstag, 18.30–20.00 Uhr. Beginn: 6. September.',
        },
        b: {
          label: 'www.intensiv-deutsch.de',
          heading: 'Intensivkurs A1',
          text: 'Montag bis Freitag, 9.00–12.00 Uhr. Vier Wochen, 60 Unterrichtsstunden.',
        },
        correct: 'a',
        explanation: 'Nur Kurs a findet nach 17 Uhr statt.',
      },
      {
        situation: 'Sie möchten ein gebrauchtes Fahrrad kaufen und höchstens 200 Euro bezahlen.',
        a: {
          label: 'www.radmarkt24.de',
          heading: 'Gebrauchte Fahrräder',
          text: 'Cityräder geprüft und fahrbereit. Viele Modelle zwischen 120 und 190 Euro.',
        },
        b: {
          label: 'www.radservice-sued.de',
          heading: 'Fahrrad-Reparatur',
          text: 'Bremsen, Licht, Reifen und Inspektion. Reparaturen ab 25 Euro. Keine Fahrräder zum Verkauf.',
        },
        correct: 'a',
        explanation: 'Angebot a verkauft gebrauchte Fahrräder unter 200 Euro. Angebot b repariert nur.',
      },
      {
        situation: 'Sie möchten am Sonntagmittag vegetarisch essen gehen.',
        a: {
          label: 'www.cafe-morgenrot.de',
          heading: 'Café Morgenrot',
          text: 'Frühstück und Kuchen. Montag bis Samstag 8–18 Uhr. Sonntag geschlossen.',
        },
        b: {
          label: 'www.gruene-kueche.de',
          heading: 'Grüne Küche',
          text: 'Vegetarische Suppen, Pasta und Salate. Sonntag 12–21 Uhr geöffnet.',
        },
        correct: 'b',
        explanation: 'Nur b ist am Sonntagmittag geöffnet und bietet vegetarische Gerichte.',
      },
    ],
    teil3: [
      {
        place: 'An der Apotheke',
        heading: 'Öffnungszeiten',
        text: 'Montag–Freitag 8.00–19.00 Uhr\nSamstag 8.00–13.00 Uhr\nSonntag geschlossen',
        statement: 'Am Samstag um 12 Uhr können Sie hier Medikamente kaufen.',
        correct: 'richtig',
        explanation: 'Samstags ist die Apotheke bis 13 Uhr geöffnet.',
      },
      {
        place: 'Im Bürohaus',
        heading: 'Aufzug außer Betrieb',
        text: 'Der Aufzug ist bis Montag kaputt. Bitte benutzen Sie die Treppe.',
        statement: 'Heute können Sie mit dem Aufzug in den dritten Stock fahren.',
        correct: 'falsch',
        explanation: 'Der Aufzug ist außer Betrieb. Man muss die Treppe benutzen.',
      },
      {
        place: 'In der Stadtbibliothek',
        heading: 'Heute früher geschlossen',
        text: 'Wegen einer Veranstaltung schließen wir heute schon um 16 Uhr. Morgen wieder ab 10 Uhr geöffnet.',
        statement: 'Heute um 17 Uhr können Sie noch ein Buch ausleihen.',
        correct: 'falsch',
        explanation: 'Die Bibliothek schließt heute bereits um 16 Uhr.',
      },
      {
        place: 'Im Bahnhof',
        heading: 'Fahrkarten',
        text: 'Schalter: 6.00–20.00 Uhr\nFahrkartenautomaten: Tag und Nacht',
        statement: 'Um 21 Uhr können Sie am Automaten noch eine Fahrkarte kaufen.',
        correct: 'richtig',
        explanation: 'Die Automaten sind Tag und Nacht verfügbar.',
      },
      {
        place: 'Im Schwimmbad',
        heading: 'Freitagabend',
        text: 'Freitag 18.00–21.00 Uhr: Frauenschwimmen. Für Männer ist das Bad in dieser Zeit geschlossen.',
        statement: 'Ein Mann kann am Freitag um 19 Uhr hier schwimmen.',
        correct: 'falsch',
        explanation: 'Von 18 bis 21 Uhr ist am Freitag nur Frauenschwimmen.',
      },
    ],
  },
  {
    id: 'lesen-test-2',
    title: 'Тест 2',
    subtitle: 'Переезд, работа, сервисы, гостиница и транспорт',
    teil1: [
      {
        title: 'Nachricht von Daniel',
        text: `Hallo Eva,\n\nam Samstag ziehe ich in meine neue Wohnung. Der Transporter kommt um 9 Uhr. Kannst du mir ab 10 Uhr beim Tragen helfen? Um 13 Uhr bestellen wir Pizza für alle Helfer.\n\nDanke!\nDaniel`,
        statements: [
          {
            statement: 'Daniel zieht am Samstag um.',
            correct: 'richtig',
            explanation: 'Daniel schreibt ausdrücklich, dass er am Samstag umzieht.',
          },
          {
            statement: 'Eva soll schon um 9 Uhr kommen.',
            correct: 'falsch',
            explanation: 'Der Transporter kommt um 9 Uhr, aber Eva soll erst ab 10 Uhr helfen.',
          },
        ],
      },
      {
        title: 'Information zur Schulung',
        text: `Guten Tag Frau Ivanova,\n\nIhre Schulung ist am Montag und Dienstag in Raum 204. Am Montag arbeiten wir von 9 bis 16 Uhr. Am Dienstag endet die Schulung schon um 14 Uhr, weil danach eine Besprechung ist. Mittagessen ist an beiden Tagen inklusive. Bitte bringen Sie ein Notizbuch mit.`,
        statements: [
          {
            statement: 'Die Schulung dauert zwei Tage.',
            correct: 'richtig',
            explanation: 'Sie findet am Montag und Dienstag statt.',
          },
          {
            statement: 'Am Dienstag ist die Schulung bis 16 Uhr.',
            correct: 'falsch',
            explanation: 'Am Dienstag endet sie bereits um 14 Uhr.',
          },
          {
            statement: 'Frau Ivanova muss ihr Mittagessen selbst mitbringen.',
            correct: 'falsch',
            explanation: 'Im Text steht, dass das Mittagessen an beiden Tagen inklusive ist.',
          },
        ],
      },
    ],
    teil2: [
      {
        situation: 'Sie möchten am Montag ein Museum besuchen.',
        a: {
          label: 'www.museum-am-ring.de',
          heading: 'Museum am Ring',
          text: 'Dienstag bis Sonntag 10–18 Uhr. Montag geschlossen.',
        },
        b: {
          label: 'www.stadtmuseum-west.de',
          heading: 'Stadtmuseum West',
          text: 'Täglich 10–17 Uhr, außer Dienstag. Eintritt 8 Euro.',
        },
        correct: 'b',
        explanation: 'Museum b ist am Montag geöffnet. Museum a ist montags geschlossen.',
      },
      {
        situation: 'Ihre Waschmaschine ist kaputt. Sie brauchen heute nach 18 Uhr einen Reparaturdienst zu Hause.',
        a: {
          label: 'www.hausgeraete-hilfe.de',
          heading: 'Reparatur zu Hause',
          text: 'Techniker für Waschmaschinen und Geschirrspüler. Montag–Freitag bis 20 Uhr. Termin am selben Tag möglich.',
        },
        b: {
          label: 'www.elektro-kauf.de',
          heading: 'Neue Waschmaschinen',
          text: 'Große Auswahl. Lieferung in drei bis fünf Tagen. Kein Reparaturservice.',
        },
        correct: 'a',
        explanation: 'Nur a bietet Reparaturen zu Hause bis 20 Uhr an.',
      },
      {
        situation: 'Sie möchten am Samstagabend mit anderen Leuten Deutsch sprechen und neue Leute kennenlernen.',
        a: {
          label: 'www.sprachcafe-mitte.de',
          heading: 'Sprachcafé',
          text: 'Samstag 19 Uhr. Deutsch sprechen, Leute kennenlernen, Kaffee trinken. Eintritt frei.',
        },
        b: {
          label: 'www.deutsch-pruefung.de',
          heading: 'Prüfungsvorbereitung',
          text: 'Einzelunterricht online. Montag bis Freitag vormittags. Termine nur nach Anmeldung.',
        },
        correct: 'a',
        explanation: 'Das Sprachcafé findet am Samstagabend statt und ist zum Sprechen und Kennenlernen gedacht.',
      },
      {
        situation: 'Sie reisen mit zwei Kindern und suchen ein Hotel direkt am Hauptbahnhof. Frühstück soll inklusive sein.',
        a: {
          label: 'www.hotel-gleis7.de',
          heading: 'Hotel Gleis 7',
          text: 'Direkt gegenüber vom Hauptbahnhof. Familienzimmer. Frühstück im Preis inklusive.',
        },
        b: {
          label: 'www.hostel-am-park.de',
          heading: 'Hostel am Park',
          text: 'Vier Kilometer vom Bahnhof. Günstige Betten. Frühstück kostet 12 Euro extra.',
        },
        correct: 'a',
        explanation: 'a liegt direkt am Bahnhof, hat Familienzimmer und Frühstück inklusive.',
      },
      {
        situation: 'Sie studieren und möchten nur am Samstagvormittag ein paar Stunden arbeiten.',
        a: {
          label: 'www.baeckerei-jobs.de',
          heading: 'Aushilfe gesucht',
          text: 'Samstags 7–11 Uhr im Verkauf. Ideal für Studierende. Erfahrung nicht nötig.',
        },
        b: {
          label: 'www.kiosk-karriere.de',
          heading: 'Verkäufer/in Vollzeit',
          text: '40 Stunden pro Woche, Montag bis Freitag. Berufserfahrung erforderlich.',
        },
        correct: 'a',
        explanation: 'Nur a ist eine kurze Samstagsarbeit am Vormittag.',
      },
    ],
    teil3: [
      {
        place: 'An der Post',
        heading: 'Öffnungszeiten',
        text: 'Montag–Freitag 8.00–18.00 Uhr\nSamstag 9.00–12.00 Uhr',
        statement: 'Am Samstag um 11 Uhr ist die Post geöffnet.',
        correct: 'richtig',
        explanation: 'Samstags ist die Post von 9 bis 12 Uhr geöffnet.',
      },
      {
        place: 'Im Restaurant',
        heading: 'Küche',
        text: 'Dienstag–Sonntag 12.00–14.30 Uhr und 18.00–22.00 Uhr\nMontag Ruhetag',
        statement: 'Am Montagabend können Sie hier essen.',
        correct: 'falsch',
        explanation: 'Montag ist Ruhetag, also ist das Restaurant geschlossen.',
      },
      {
        place: 'Am Bahnsteig',
        heading: 'Achtung Gleisänderung',
        text: 'Der RE 418 nach Bonn fährt heute nicht von Gleis 5, sondern von Gleis 7.',
        statement: 'Für den Zug nach Bonn müssen Sie heute zu Gleis 5 gehen.',
        correct: 'falsch',
        explanation: 'Heute fährt der Zug von Gleis 7.',
      },
      {
        place: 'An der Arztpraxis',
        heading: 'Urlaub',
        text: 'Praxis Dr. Sommer geschlossen: 5.–16. August. Vertretung: Dr. Keller, Marktstraße 8.',
        statement: 'Während des Urlaubs können Patienten zu Dr. Keller gehen.',
        correct: 'richtig',
        explanation: 'Dr. Keller übernimmt ausdrücklich die Vertretung.',
      },
      {
        place: 'Auf einem Parkplatz',
        heading: 'Nur für Kunden',
        text: 'Parken nur während des Einkaufs. Maximal 90 Minuten. Bitte Parkscheibe benutzen.',
        statement: 'Sie können hier zwei Stunden parken, auch wenn Sie nicht einkaufen.',
        correct: 'falsch',
        explanation: 'Der Parkplatz ist nur für Kunden und höchstens 90 Minuten erlaubt.',
      },
    ],
  },
  {
    id: 'lesen-test-3',
    title: 'Тест 3',
    subtitle: 'Поездка, языковой курс, покупки, досуг и правила',
    teil1: [
      {
        title: 'Nachricht von Amir',
        text: `Hallo Julia,\n\nmein Zug aus Köln kommt um 13.42 Uhr in Hamburg an, Gleis 7. Ich bin schon ab 13.30 Uhr bei der Bäckerei in der Bahnhofshalle und warte dort auf dich. Ab 14 Uhr bin ich in einer Besprechung und kann nicht telefonieren.\n\nBis gleich!\nAmir`,
        statements: [
          {
            statement: 'Amirs Zug kommt nach 13.30 Uhr an.',
            correct: 'richtig',
            explanation: 'Der Zug kommt um 13.42 Uhr an.',
          },
          {
            statement: 'Amir wartet an der Information auf Julia.',
            correct: 'falsch',
            explanation: 'Er wartet bei der Bäckerei in der Bahnhofshalle.',
          },
        ],
      },
      {
        title: 'Deutsch A1 – Kursinformation',
        text: `Deutsch A1\nBeginn: 3. September\nUnterricht: Dienstag und Donnerstag, 18.00–19.30 Uhr\nKursgebühr: 180 Euro inklusive Kursbuch\nErster Unterrichtstag: Raum 5`,
        statements: [
          {
            statement: 'Der Unterricht ist zweimal pro Woche.',
            correct: 'richtig',
            explanation: 'Der Kurs findet am Dienstag und Donnerstag statt.',
          },
          {
            statement: 'Das Kursbuch kostet extra.',
            correct: 'falsch',
            explanation: 'Das Kursbuch ist in den 180 Euro inklusive.',
          },
          {
            statement: 'Der Kurs beginnt am 3. September.',
            correct: 'richtig',
            explanation: 'Das Datum steht direkt in der Kursinformation.',
          },
        ],
      },
    ],
    teil2: [
      {
        situation: 'Sie sind in Dresden und möchten mit dem Zug vor 12 Uhr in Berlin sein.',
        a: {
          label: 'www.bahnplan-a.de',
          heading: 'Dresden → Berlin',
          text: 'Abfahrt 9.20 Uhr · Ankunft 11.10 Uhr · direkt',
        },
        b: {
          label: 'www.bahnplan-b.de',
          heading: 'Dresden → Berlin',
          text: 'Abfahrt 11.30 Uhr · Ankunft 13.20 Uhr · direkt',
        },
        correct: 'a',
        explanation: 'Nur Verbindung a kommt vor 12 Uhr in Berlin an.',
      },
      {
        situation: 'Sie sind Anfänger und möchten am Abend schwimmen lernen.',
        a: {
          label: 'www.schwimmschule-nord.de',
          heading: 'Anfängerkurs Erwachsene',
          text: 'Mittwoch 19.00–20.00 Uhr. Keine Vorkenntnisse nötig.',
        },
        b: {
          label: 'www.sportbad-aktiv.de',
          heading: 'Training für Fortgeschrittene',
          text: 'Samstag 8.00 Uhr. Sicheres Schwimmen ist Voraussetzung.',
        },
        correct: 'a',
        explanation: 'a ist ausdrücklich für Anfänger und findet abends statt.',
      },
      {
        situation: 'Sie möchten mittags vegetarisch essen und weniger als 10 Euro bezahlen.',
        a: {
          label: 'www.mittag-gruen.de',
          heading: 'Mittagsmenü',
          text: 'Gemüsesuppe + Salat 8,50 €. Vegetarisch. Montag–Freitag 11.30–14.30 Uhr.',
        },
        b: {
          label: 'www.schnitzelhaus.de',
          heading: 'Tagesangebot',
          text: 'Schnitzel mit Pommes 13,90 €. Mittagstisch ab 12 Uhr.',
        },
        correct: 'a',
        explanation: 'a ist vegetarisch und kostet weniger als 10 Euro.',
      },
      {
        situation: 'Sie brauchen am Sonntag eine geöffnete Apotheke.',
        a: {
          label: 'www.apotheke-am-dom.de',
          heading: 'Notdienst am Sonntag',
          text: 'Diesen Sonntag 10.00–18.00 Uhr geöffnet. Eingang Schillerstraße.',
        },
        b: {
          label: 'www.apotheke-west.de',
          heading: 'Öffnungszeiten',
          text: 'Montag–Freitag 8.00–19.00 Uhr, Samstag 9.00–14.00 Uhr.',
        },
        correct: 'a',
        explanation: 'Nur Apotheke a ist am Sonntag geöffnet.',
      },
      {
        situation: 'Sie möchten für heute Abend online eine Theaterkarte kaufen.',
        a: {
          label: 'www.theater-info.de',
          heading: 'Spielplan und Informationen',
          text: 'Programm, Künstler und Anfahrt. Karten gibt es nur an der Abendkasse.',
        },
        b: {
          label: 'www.buehne-ticket.de',
          heading: 'Theaterkarten online',
          text: 'Vorstellungen heute ab 19 Uhr. Online buchen und Ticket aufs Handy laden.',
        },
        correct: 'b',
        explanation: 'Nur b ermöglicht eine Online-Buchung für heute Abend.',
      },
    ],
    teil3: [
      {
        place: 'An einer Bank',
        heading: 'Servicezeiten',
        text: 'Schalter: Montag–Freitag 9.00–16.00 Uhr\nGeldautomat: täglich 24 Stunden',
        statement: 'Am Sonntag können Sie am Automaten Geld abheben.',
        correct: 'richtig',
        explanation: 'Der Geldautomat ist täglich rund um die Uhr verfügbar.',
      },
      {
        place: 'In einem Café',
        heading: 'Bitte beachten',
        text: 'Kartenzahlung heute leider nicht möglich. Bitte nur bar bezahlen.',
        statement: 'Heute können Sie hier mit Kreditkarte bezahlen.',
        correct: 'falsch',
        explanation: 'Heute ist nur Barzahlung möglich.',
      },
      {
        place: 'An der Bushaltestelle',
        heading: 'Haltestelle verlegt',
        text: 'Ab 12. September hält Bus 24 nicht mehr hier. Neue Haltestelle: Bahnhofstraße, vor dem Kino.',
        statement: 'Am 15. September fährt Bus 24 noch von dieser Haltestelle ab.',
        correct: 'falsch',
        explanation: 'Seit dem 12. September ist die Haltestelle in der Bahnhofstraße.',
      },
      {
        place: 'In einer Praxis',
        heading: 'Mittwoch',
        text: 'Mittwochnachmittag keine Sprechstunde. In dringenden Fällen: 0176 555 40 20.',
        statement: 'Am Mittwoch um 16 Uhr können Sie einen normalen Termin in der Praxis haben.',
        correct: 'falsch',
        explanation: 'Mittwochnachmittag gibt es keine normale Sprechstunde.',
      },
      {
        place: 'Am Altglascontainer',
        heading: 'Einwurfzeiten',
        text: 'Montag–Samstag 7.00–20.00 Uhr\nSonntag kein Einwurf',
        statement: 'Am Samstag um 19 Uhr dürfen Sie hier Glas einwerfen.',
        correct: 'richtig',
        explanation: 'Samstags ist der Einwurf bis 20 Uhr erlaubt.',
      },
    ],
  },
];
