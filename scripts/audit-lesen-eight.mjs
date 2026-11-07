import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
const prefix='src/data/lesen/archive/gz';
const payload=Array.from({length:5},(_,i)=>fs.readFileSync(prefix+String(i+1).padStart(2,'0')+'.ts','utf8').match(/^export default '([^']+)';/)[1]).join('');
const archive=JSON.parse(zlib.gunzipSync(Buffer.from(payload,'base64')).toString('utf8'));
const ids={teil1:[33],teil2:[5,8,21,30,45],teil3:[10,39]};
const paths={};
for(const [teil,seq] of Object.entries(ids))for(const number of seq){paths[teil+'-'+String(number).padStart(3,'0')]=archive[teil][number-1];}
const sha=o=>crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');
const others={teil1:archive.teil1.filter((_,i)=>!ids.teil1.includes(i+1)),teil2:archive.teil2.filter((_,i)=>!ids.teil2.includes(i+1)),teil3:archive.teil3.filter((_,i)=>!ids.teil3.includes(i+1))};
console.log('LESEN_EIGHT_AUDIT_BEGIN');
console.log(JSON.stringify({lengths:[archive.teil1.length,archive.teil2.length,archive.teil3.length],baselineOther142:sha(others),tasks:paths},null,2));
console.log('LESEN_EIGHT_AUDIT_END');
