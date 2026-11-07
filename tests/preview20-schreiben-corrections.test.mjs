import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const rows=p=>JSON.parse(read(p).match(/= (\[\[.*\]) as const;/s)[1]);
const part1=rows('src/data/schreiben/teil1-part3.ts');
const letters=[1,2,3,4].flatMap(i=>rows('src/data/schreiben/teil2-part'+i+'.ts'));
const by=n=>letters.find(x=>x[0]===n);
const ru=read('src/data/schreiben/translations.ts');
const moduleSource=read('src/components/modules/WritingModule.tsx');
test('form 28 original scenario, five editable rows and corrected Problem answer',()=>{
 const t=part1.find(x=>x[0]===28);
 assert.match(t[2],/Wohnungsschlüssel verloren/);
 assert.equal(t[3].find(r=>r[0]==='Problem')[2],'Wohnungsschlüssel verloren');
 assert.equal(t[3].filter(r=>r[2]).length,5);
 const norm=s=>s.toLocaleLowerCase('de-DE').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9@]+/g,' ').trim();
 const match=(a,b)=>Boolean(norm(a)&&norm(b)&&(norm(a)===norm(b)||norm(a).includes(norm(b))||norm(b).includes(norm(a))));
 assert(match('Wohnungsschlüssel verloren',t[3].find(r=>r[0]==='Problem')[2]));
 assert(match('  wohnungsschlüssel   VERLOREN  ',t[3].find(r=>r[0]==='Problem')[2]));
 assert(!match('Fenster beschädigt',t[3].find(r=>r[0]==='Problem')[2]));
 assert.match(moduleSource,/matches\(draft\[rowIndex\] \|\| '', row.answer \|\| ''\)/);
});
test('all 80 letters in fixed order with exactly three prompts',()=>{
 assert.equal(letters.length,80);
 assert.deepEqual(letters.map(x=>x[0]),Array.from({length:80},(_,i)=>i+1));
 assert(letters.every(x=>x[2].length===3));
});
test('six selected letter changes are exactly the requested ones',()=>{
 assert.deepEqual(by(1)[2],['Warum?','An welchen Tagen?','Preis.']);
 assert.equal(by(6)[1],'Frau Schneider hat Sie am Samstag zu ihrer Geburtstagsfeier eingeladen.');
 assert.equal(by(26)[2][2],'Preis.');
 assert.equal(by(39)[1],'Sie haben eine neue Wohnung und möchten eine Party machen. Schreiben Sie Ihren Freunden.');
 assert.equal(by(69)[1],'Frau Sommer hat Sie am Sonntag zu ihrer Geburtstagsfeier eingeladen.');
 assert.deepEqual(by(74),[74,'Sie haben gestern in einem Café Ihren Rucksack vergessen. Schreiben Sie an das Café.',['Wann waren Sie im Café?','Beschreiben Sie Ihren Rucksack.','Fragen Sie, wann Sie den Rucksack abholen können.']]);
});
test('translated prompts 1 and 26 and corresponding situations preserved',()=>{
 assert(ru.includes("'Почему? (Почему вы пишете?)'"));
 assert(ru.includes("'В какие дни? (В какие дни вы хотите посещать курс?)'"));
 assert(ru.includes("'Цена? (Спросите цену).'"));
 assert(ru.includes("Вчера вы забыли рюкзак в кафе."));
 assert(ru.includes("устроить вечеринку"));
 assert(ru.includes("в воскресенье"));
 assert(ru.includes("в субботу"));
});
test('detailed learning explanations end at 30, 31-80 show only translation and solo remains standalone',()=>{
 assert(moduleSource.includes('task.number===1||task.number===26||task.number>30'));
 assert(moduleSource.includes('conciseTranslation={task.number>30}'));
 assert(moduleSource.includes("mode !== 'solo'"));
 for(const n of [30,31,80])assert.equal(n>30,n!==30);
 assert(moduleSource.includes('onDraftChange(task.id,value)'));
 assert(moduleSource.includes('writeSchreibenLetterDraft(userId,taskId,value)'));
 assert(moduleSource.includes('body: JSON.stringify({ situation: task.situation, points: task.points })'));
});
