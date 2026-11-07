import { lesenExamSets } from './examSets';
import { lesenExamSetsExtra } from './examSetsExtra';

for (const set of lesenExamSetsExtra) {
  if (!lesenExamSets.some((existing) => existing.id === set.id)) {
    lesenExamSets.push(set);
  }
}

// Content QA: arrival at 13:42 must happen before the meeting point time.
const test3 = lesenExamSets.find((set) => set.id === 'lesen-test-3');
if (test3?.teil1[0]) {
  test3.teil1[0].text = `Hallo Julia,\n\nmein Zug aus Köln kommt um 13.42 Uhr in Hamburg an, Gleis 7. Ich bin ab 13.50 Uhr bei der Bäckerei in der Bahnhofshalle und warte dort auf dich. Ab 14 Uhr bin ich in einer Besprechung und kann nicht telefonieren.\n\nBis gleich!\nAmir`;
}
