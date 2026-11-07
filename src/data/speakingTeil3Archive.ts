export interface SpeakingTeil3ArchiveCard {
  id: string;
  imageIndex: number;
  alt: string;
  sampleRequest: string;
  sampleReaction: string;
}

const rawCards = [
  ['Butter', 'Bringen Sie mir bitte Butter.', 'Ja, natürlich. Hier bitte.'],
  ['Mineralwasser', 'Geben Sie mir bitte Mineralwasser.', 'Ja, gern. Hier bitte.'],
  ['Münzen', 'Geben Sie mir bitte die Münzen.', 'Ja, natürlich. Hier bitte.'],
  ['Termin', 'Geben Sie mir bitte einen Termin beim Arzt.', 'Ja, gern.'],
  ['Kein Essen und Trinken', 'Bitte essen und trinken Sie hier nicht.', 'Ja, natürlich.'],
  ['Hauptbahnhof', 'Fahren Sie bitte zum Hauptbahnhof.', 'Ja, gern.'],
  ['Postamt', 'Fahren Sie bitte zum Postamt.', 'Ja, gern.'],
  ['Taxi', 'Rufen Sie mir bitte ein Taxi.', 'Ja, gern.'],
  ['Kein Schwimmen', 'Bitte schwimmen Sie hier nicht.', 'Ja, natürlich.'],
  ['Rechnung', 'Bringen Sie mir bitte die Rechnung.', 'Ja, sofort.'],
  ['Schlüssel', 'Geben Sie mir bitte den Schlüssel.', 'Ja, natürlich. Hier bitte.'],
  ['Kaffee', 'Bringen Sie mir bitte einen Kaffee.', 'Ja, gern.'],
  ['Koffer', 'Helfen Sie mir bitte mit dem Koffer.', 'Ja, gern.'],
  ['Auto', 'Zeigen Sie mir bitte das Auto.', 'Ja, gern.'],
  ['Fahrrad', 'Verkaufen Sie mir bitte ein Fahrrad.', 'Ja, gern.'],
  ['Weinflasche', 'Öffnen Sie bitte die Weinflasche.', 'Ja, gern.'],
  ['Brathähnchen', 'Geben Sie mir bitte das Brathähnchen.', 'Ja, natürlich. Hier bitte.'],
  ['Käse', 'Geben Sie mir bitte den Käse.', 'Ja, natürlich. Hier bitte.'],
  ['Obst', 'Geben Sie mir bitte das Obst.', 'Ja, gern. Hier bitte.'],
  ['Zigarette', 'Geben Sie mir bitte eine Zigarette.', 'Ja, gern. Hier bitte.'],
  ['Telefon', 'Geben Sie mir bitte das Telefon.', 'Ja, gern. Hier bitte.'],
  ['Brot', 'Geben Sie mir bitte das Brot.', 'Ja, natürlich. Hier bitte.'],
  ['Milch', 'Geben Sie mir bitte die Milch.', 'Ja, natürlich. Hier bitte.'],
  ['Bananen', 'Geben Sie mir bitte die Bananen.', 'Ja, gern. Hier bitte.'],
  ['Apfel', 'Geben Sie mir bitte einen Apfel.', 'Ja, gern. Hier bitte.'],
  ['Käse', 'Geben Sie mir bitte den Käse.', 'Ja, natürlich. Hier bitte.'],
  ['Wasser', 'Geben Sie mir bitte ein Glas Wasser.', 'Ja, natürlich. Hier bitte.'],
  ['Tomate', 'Geben Sie mir bitte die Tomate.', 'Ja, gern. Hier bitte.'],
  ['Salat', 'Geben Sie mir bitte den Salat.', 'Ja, natürlich. Hier bitte.'],
  ['Kartoffeln', 'Geben Sie mir bitte die Kartoffeln.', 'Ja, gern. Hier bitte.'],
  ['Karotten', 'Geben Sie mir bitte die Karotten.', 'Ja, natürlich. Hier bitte.'],
  ['Zwiebel', 'Geben Sie mir bitte die Zwiebel.', 'Ja, gern. Hier bitte.'],
  ['Knoblauch', 'Geben Sie mir bitte den Knoblauch.', 'Ja, natürlich. Hier bitte.'],
  ['Ei', 'Geben Sie mir bitte ein Ei.', 'Ja, gern. Hier bitte.'],
  ['Fleisch', 'Geben Sie mir bitte das Fleisch.', 'Ja, natürlich. Hier bitte.'],
  ['Fisch', 'Geben Sie mir bitte den Fisch.', 'Ja, gern. Hier bitte.'],
  ['Schokolade', 'Geben Sie mir bitte die Schokolade.', 'Ja, natürlich. Hier bitte.'],
  ['Kuchen', 'Geben Sie mir bitte ein Stück Kuchen.', 'Ja, gern. Hier bitte.'],
  ['Stuhl', 'Bringen Sie mir bitte einen Stuhl.', 'Ja, gern.'],
  ['Tisch', 'Helfen Sie mir bitte mit dem Tisch.', 'Ja, gern.'],
  ['Bett', 'Verkaufen Sie mir bitte ein Bett.', 'Ja, gern.'],
  ['Schrank', 'Öffnen Sie bitte den Schrank.', 'Ja, natürlich.'],
  ['Sofa', 'Kaufen Sie mir bitte ein Sofa.', 'Ja, gern.'],
  ['Uhr', 'Zeigen Sie mir bitte die Uhr.', 'Ja, natürlich.'],
  ['Lampe', 'Machen Sie bitte die Lampe an.', 'Ja, gern.'],
  ['Fernseher', 'Machen Sie bitte den Fernseher an.', 'Ja, gern.'],
  ['Handy', 'Geben Sie mir bitte das Handy.', 'Ja, natürlich. Hier bitte.'],
  ['Computer', 'Zeigen Sie mir bitte den Computer.', 'Ja, gern.'],
  ['der Teller', 'Geben Sie mir bitte den Teller.', 'Ja, natürlich. Hier bitte.'],
  ['die Serviette', 'Geben Sie mir bitte eine Serviette.', 'Ja, gern. Hier bitte.'],
] as const;

export const speakingTeil3ArchiveCards: SpeakingTeil3ArchiveCard[] = rawCards.map(
  ([alt, sampleRequest, sampleReaction], imageIndex) => ({
    id: `sprechen-t3-${String(imageIndex + 1).padStart(2, '0')}`,
    imageIndex,
    alt,
    sampleRequest,
    sampleReaction,
  }),
);
