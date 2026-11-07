import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Preview13 key administration visibility is independent from package-upload permission',()=>{
 const route=readFileSync(new URL('../src/features/mockExams30/Exam01Route.tsx',import.meta.url),'utf8');
 const admin=readFileSync(new URL('../src/features/mockExams30/Exam30KeyAdmin.tsx',import.meta.url),'utf8');
 assert.match(route,/owner&&ready&&!loading&&<Exam30KeyAdmin\/>/);
 assert.doesNotMatch(route,/owner&&ready&&!loading&&ownerUploadEnabled&&<Exam30KeyAdmin\/>/);
 assert.match(admin,/keyUploadAllowed/,'only server-approved key admins see upload interface');
 assert.match(admin,/fetch\(SCORES\+'\?op=inventory'/);
});
