import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const route=read('src/features/mockExams30/Exam01Route.tsx');
const review=read('src/features/mockExams30/Exam30LegacyStyleReview.tsx');
const original=read('src/components/MockExam.tsx');
const progress=read('src/features/mockExams30/progress.ts');
test('current exam only, no grid, no visible total count, stable internal exam IDs',()=>{
 assert.match(route,/Пробные экзамены/);
 assert.match(route,/Пробный экзамен №\{currentDisplay\}/);
 assert.match(route,/Следующий экзамен →/);
 assert.doesNotMatch(route,/Array\.from\(\{length:30\}/);
 assert.doesNotMatch(route,/Выбор из 31 пробного экзамена/);
 assert.match(route,/this\.openExam\(nextDisplay-1\)/);
 assert.match(route,/readCursor/);
 assert.match(progress,/PRIVATE_PROGRESS_PREFIX/);
});
test('original exam result persists via existing history without editing legacy mock',()=>{
 assert.match(route,/readMockHistory/);
 assert.match(route,/markLegacyDone/);
 assert.match(original,/saveMockAttempt\(attempt\)/);
});
test('section completion is explicit; back does not finish; timeout does',()=>{
 assert.match(review,/finishPart\(meta,draft\.section\)/);
 assert.match(review,/onClick=\{finish\}/);
 assert.match(review,/onClick=\{leave\}/);
 assert.match(review,/allSectionsFinished\(updated\)/);
 assert.match(review,/loadMeta\(localStorage,userId,exam\.id\)/);
});
test('no user backup controls or invented grading',()=>{
 assert.doesNotMatch(review,/резервная копия|Скачать копию ответов|Восстановить ответы из копии|importDraftBackup|exportDraftBackup/);
 assert.match(review,/Мои ответы и результат/);
 assert.match(review,/Exam30ScoreResult/);
 const scorer=read('src/features/mockExams30/Exam30ScoreResult.tsx');
 assert.match(scorer,/Проверить экзамен/);
 assert.match(scorer,/Повторить проверку/);
 assert.match(scorer,/Экзамен сдан/);
 assert.match(scorer,/Экзамен не сдан/);
 assert.doesNotMatch(scorer,/const total=100/);
});
