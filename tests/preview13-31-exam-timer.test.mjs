import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const route=read('src/features/mockExams30/Exam01Route.tsx');
const all=read('src/features/mockExams30/Exam30LegacyStyleReview.tsx');
const original=read('src/components/MockExam.tsx');
const app=read('src/App.tsx');
test('31 user-facing choices: legacy first plus 30 private, with untouched candidate IDs',()=>{
 assert.match(route,/31 пробный экзамен OTTO/);
 assert.match(route,/Пробный экзамен №1/);
 assert.match(route,/Array\.from\(\{length:30\}/);
 assert.match(route,/Пробный экзамен №\{n\+1\}/);
 assert.match(route,/displayNumber=\{selected\+1\}/);
 assert.match(route,/this\.openExam\(n\)/);
 assert.match(route,/renderOriginal\(timerEnabled,1/);
 assert.doesNotMatch(route,/Исходный пробный экзамен OTTO/);
});
test('timer choice is explicit and persistent, legacy remains timed by default',()=>{
 assert.match(route,/С таймером/);
 assert.match(route,/Без таймера/);
 assert.match(route,/TIMER_MODE_KEY/);
 assert.match(original,/timerEnabled\?\?localTimerEnabled/);
 assert.match(original,/if\(!timerEnabled\|\|time!==0/);
 assert.match(original,/timerEnabled\?fmt\(time\):'Без таймера'/);
 assert.match(app,/timerEnabled=\{timerEnabled\}/);
});
test('new exams use the legacy duration for each part and preserve scoring restrictions',()=>{
 assert.match(all,/horen:20\*60,lesen:25\*60,schreiben:20\*60,sprechen:15\*60/);
 assert.match(all,/deadlineRef\.current=timerEnabled\?Date\.now\(\)\+DURATIONS\[section\]\*1000:null/);
 assert.match(all,/setExpired\(previous=>/);
 assert.match(all,/timerEnabled\?formatTime\(remaining\):'Без таймера'/);
 assert.match(all,/Баллы и результат «сдан\/не сдан» не выставляются/);
 assert.match(all,/privateAssetProvider/);
});
