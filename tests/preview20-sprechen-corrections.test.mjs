import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root='src/data/';
const t2=fs.readFileSync(root+'speaking.ts','utf8');
const t3=fs.readFileSync(root+'speakingTeil3Archive.ts','utf8');
const baseline=JSON.parse(fs.readFileSync('tests/fixtures/preview20-sprechen-untouched.json','utf8'));
const part2=[...t2.slice(t2.indexOf('const teil2Themes'),t2.indexOf('export const speakingTeil2Cards')).matchAll(/^\s*\['([^']*)', '([^']*)', '([^']*)', '([^']*)'\],$/gm)].map(x=>x.slice(1,5));
const part3=[...t3.slice(t3.indexOf('const rawCards'),t3.indexOf('] as const;',t3.indexOf('const rawCards'))).matchAll(/^\s*\['([^']*)', '([^']*)', '([^']*)'\],$/gm)].map(x=>x.slice(1,4));
const questions={"1":"Wie hoch ist der Preis?","2":"Wie sind die Öffnungszeiten des Geschäfts?","3":"Wo kann ich Obst kaufen?","4":"Wo kann ich Einkäufe bezahlen?","5":"Wo finde ich einen Supermarkt?","6":"Haben Sie eine neue Tasche?","7":"Besuchen Sie Freunde am Wochenende?","8":"Gehen Sie am Wochenende ins Kino?","10":"Machen Sie am Wochenende einen Ausflug?","11":"Gehen Sie am Wochenende ins Restaurant?","17":"Wo wohnen Ihre Eltern?","22":"Was kochen Sie gerne?","23":"Trinken Sie gerne Wasser?","24":"Besuchen Sie gerne ein Restaurant?","27":"Haben Sie einen Balkon zu Hause?","28":"Haben Sie eine Küche zu Hause?","29":"Haben Sie nette Nachbarn?","31":"Wo finde ich den Bahnhof?","33":"Wo finde ich ein Hotel?","34":"Wann machen Sie Urlaub?","35":"Haben Sie einen Koffer für die Reise?","37":"Hören Sie in Ihrer Freizeit Musik?","42":"Besuchen Sie in Ihrer Freizeit einen Park?","45":"Haben Sie einen Arzttermin?","46":"Wo kann ich Medikamente kaufen?","50":"Haben Sie nette Kollegen bei der Arbeit?"},requests={"1":"Bringen Sie mir bitte Butter.","2":"Geben Sie mir bitte Mineralwasser.","4":"Geben Sie mir bitte einen Termin beim Arzt.","6":"Fahren Sie bitte zum Hauptbahnhof.","7":"Fahren Sie bitte zum Postamt.","14":"Zeigen Sie mir bitte das Auto.","15":"Verkaufen Sie mir bitte ein Fahrrad.","41":"Verkaufen Sie mir bitte ein Bett.","43":"Kaufen Sie mir bitte ein Sofa."};
test('Sprechen original 50 questions and 50 request cards and original ID generation',()=>{
 assert.equal(part2.length,50);assert.equal(part3.length,50);
 assert.match(t2,/id: \x60sprechen-t2-\$\{groupIndex \+ 1\}-\$\{cardIndex \+ 1\}\x60/);
 assert.match(t3,/id: \x60sprechen-t3-\$\{String\(imageIndex \+ 1\)\.padStart\(2, '0'\)\}\x60/);
});
test('All unaffected / not-checked cards stay byte-content identical, including Sport #39',()=>{
 for(let i=0;i<50;i++){
  if(baseline.teil2[i])assert.deepEqual(part2[i],baseline.teil2[i],`Teil 2 ${i+1}`);
  if(baseline.teil3[i])assert.deepEqual(part3[i],baseline.teil3[i],`Teil 3 ${i+1}`);
 }
 assert.equal(part2[38][0],'Sport');assert.equal(part2[38][2],'Welchen Sport machen Sie?');
});
test('All approved examples are grammatically formed questions, contain key tokens and retain themes',()=>{
 for(const [no,question] of Object.entries(questions)){
  const i=Number(no)-1,row=part2[i];
  assert.equal(row[2],question,'question '+no);
  assert(row[2].endsWith('?'),'A1 question ending');
  const keyword=row[0].toLowerCase();
  assert(row[2].toLowerCase().includes(keyword),'keyword appears in question '+no);
  assert(row[3].length>0,'example answer '+no);
 }
 assert.equal(part2[0][3],'Der Preis ist 20 Euro.');
 assert.equal(part2[1][3],'Von 8 bis 20 Uhr.');
 assert.equal(part2[33][3],'Ich mache Urlaub im August.');
});
test('All nine Teil 3 examples preserve original image keyword and partner reaction',()=>{
 for(const [no,request] of Object.entries(requests)){
  const i=Number(no)-1,row=part3[i];
  assert.equal(row[1],request,'request '+no);
  assert(row[1].includes(row[0])||['Fahrrad','Bett','Sofa','Termin'].includes(row[0]),'keyword '+no);
  assert(row[2].length>0,'reaction '+no);
 }
});
test('Recorder sends question/request as illustrative guide, not exact-match only',()=>{
 const recording=fs.readFileSync('src/components/sprechen/VoiceRecorder.tsx','utf8');
 const evaluation=fs.readFileSync('netlify/functions/check-sprechen.js','utf8');
 const learning=fs.readFileSync('src/preview/SprechenLearningStage.tsx','utf8');
 assert(recording.includes('sampleQuestion:string'));assert(recording.includes('sampleRequest:string'));
 assert(evaluation.includes('Пример — только ориентир:'));
 assert(evaluation.includes('не требуй грамматику выше A1'));
 assert(learning.includes('speakingTeil2Cards.slice(0,6)'));
 assert(learning.includes('speakingTeil3ArchiveCards.slice(0,6)'));
});
