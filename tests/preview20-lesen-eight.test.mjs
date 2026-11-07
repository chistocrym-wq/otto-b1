import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
const payload=Array.from({length:5},(_,i)=>fs.readFileSync('src/data/lesen/archive/gz'+String(i+1).padStart(2,'0')+'.ts','utf8').match(/^export default '([^']+)';/)[1]).join('');
const tasks=JSON.parse(zlib.gunzipSync(Buffer.from(payload,'base64')).toString('utf8'));
const sha=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const selected={teil1:new Set([32]),teil2:new Set([4,7,20,29,44]),teil3:new Set([9,38])};
test('gzip/base64 roundtrip and 150 stable source task indices',()=>{
 assert.deepEqual(Object.values(tasks).map(a=>a.length),[50,50,50]);
 assert.deepEqual(tasks.teil1.map(x=>x.id),Array.from({length:50},(_,i)=>i+1));
});
test('remaining 142 unmodified tasks have identical baseline sha256',()=>{
 const others=Object.fromEntries(Object.entries(selected).map(([k,ix])=>[k,tasks[k].filter((_,i)=>!ix.has(i))]));
 assert.equal(sha(others),'4053da5afd9a50db77f44c70e0e16958d3bf0e6c5b954ef4907b04da43b5b675');
});
test('Teil 1 number 33 truth key matches music-school original email',()=>{
 const t=tasks.teil1[32];
 assert.equal(t.id,33);assert.match(t.text,/im selben Gebäude wie die städtische Musikschule/);
 assert.equal(t.statements[2].statement,'Im neuen Gebäude befindet sich die städtische Musikschule.');
 assert.equal(t.statements[2].correct,true);
 assert.deepEqual(t.statements.slice(0,2).map(x=>x.correct),[false,false]);
});
test('Teil 2 #5 babysitting option A is available around the clock',()=>{
 const t=tasks.teil2[4];
 assert.equal(t.a.title,'Babysitting-Service');
 assert.deepEqual(t.a.lines,['Rund um die Uhr','Für Kinder jeden Alters','Bitte anrufen: 030/554217']);
 assert.equal(t.correct,'a');assert.match(t.situation,/Babysitter/);
});
test('Teil 2 #8 revised explanation is supported by train arrival cells',()=>{
 const t=tasks.teil2[7];
 assert.equal(t.why,'Nur Option A kommt am Vormittag an (08:30 Uhr), Option B erst am Nachmittag (13:55 Uhr)');
 assert.equal(t.a.rows[1][3],'08.30');assert.equal(t.b.rows[1][3],'13.55');assert.equal(t.correct,'a');
});
test('Teil 2 #21 bus situation requires fast transfer-free route',()=>{
 const t=tasks.teil2[20];
 assert.equal(t.situation,'Sie möchten mit dem Bus vom Hauptbahnhof zum Flughafen fahren, möglichst schnell und ohne Umsteigen');
 assert.equal(t.correct,'a');assert.equal(t.a.rows[0][4],'0:35');assert.equal(t.a.rows[0][5],'0');
 assert.equal(t.b.rows[0][4],'1:40');assert.equal(t.b.rows[0][5],'2');
});
test('Teil 2 #30 only requested used-car line changed and B remains key',()=>{
 const t=tasks.teil2[29];assert.equal(t.correct,'b');
 assert.equal(t.b.lines[0],'Gebrauchtwagen mit weniger als 50.000 km');
 assert.deepEqual(t.b.lines.slice(1),['TÜV neu, 1 Jahr Garantie','Preis ab 8.500 €']);
});
test('Teil 2 #45 B correctly scores and A fails after corrected furniture advertisement',()=>{
 const t=tasks.teil2[44];
 assert.equal(t.correct,'b');assert.equal(t.a.title,'Möbel zu verschenken');
 assert.deepEqual(t.b,{title:'Möbel gesucht',lines:['Suche gebrauchte Möbel. Bezahlung möglich.','Ich hole die Möbel selbst ab.','Bitte melden.']});
 assert.equal(t.why,'Angebot B passt zu Ihrer Situation.');
 const score=choice=>Number(choice===t.correct);
 assert.equal(score('b'),1);assert.equal(score('a'),0);
});
test('Teil 3 #10 statement is Richtig when ticket machine is out of order',()=>{
 const t=tasks.teil3[9];assert.deepEqual(t.text,['Dieser Automat ist','zurzeit außer Betrieb.','Karten bekommen Sie','am Schalter 2.']);
 assert.equal(t.statement,'Sie können an diesem Automaten gerade keine Fahrkarte kaufen.');assert.equal(t.correct,'Richtig');
});
test('Teil 3 #39 statement is Richtig when bank ATM is out of order',()=>{
 const t=tasks.teil3[38];assert(t.text.includes('ist zurzeit außer Betrieb.'));
 assert.equal(t.statement,'An diesem Geldautomaten kann man gerade kein Geld abheben');assert.equal(t.correct,'Richtig');
});
test('scoring and retry mechanics remain outside the archive data files',()=>{
 const module=fs.readFileSync('src/components/modules/ReadingModule.tsx','utf8');
 assert.match(module,/recordTaskResult\('lesen',key,add,answeredNow\)/);
 assert.match(module,/choice===t\.correct/);
 assert.match(module,/setIndex\(0\);setFinished\(false\)/);
 assert.match(module,/const STORAGE_KEY='otto-a1-lesen-progress-v2'/);
});
