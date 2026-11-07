import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const srcDir = path.join(root, 'assets-src');
const outDir = path.join(root, 'public', 'otto');
const outFile = path.join(outDir, 'otto-scenes.webp');
const EXPECTED_BYTES = 51546;
const EXPECTED_SHA256 = 'd75d2c90d8ea7d63bb2418276c606c4546932c3f94f8cf04c0d7778f08022ec5';

const parts = fs.readdirSync(srcDir)
  .filter((name) => /^otto-scenes-v17\.b64\.part\d+$/.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

if (parts.length !== 12) {
  throw new Error(`Expected 12 Otto v17 sprite parts, found ${parts.length}: ${parts.join(', ')}`);
}

const base64 = parts
  .map((name) => fs.readFileSync(path.join(srcDir, name), 'utf8').replace(/\s+/g, ''))
  .join('');

const buffer = Buffer.from(base64, 'base64');
const riff = buffer.subarray(0, 4).toString('ascii');
const webp = buffer.subarray(8, 12).toString('ascii');
const sha256 = createHash('sha256').update(buffer).digest('hex');

if (riff !== 'RIFF' || webp !== 'WEBP') {
  throw new Error(`Assembled Otto sprite is not a valid WebP (RIFF=${riff}, WEBP=${webp})`);
}

if (buffer.length !== EXPECTED_BYTES) {
  throw new Error(`Otto v17 sprite size mismatch: expected ${EXPECTED_BYTES}, got ${buffer.length}`);
}

if (sha256 !== EXPECTED_SHA256) {
  throw new Error(`Otto v17 sprite checksum mismatch: expected ${EXPECTED_SHA256}, got ${sha256}`);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, buffer);
console.log(`Built ${path.relative(root, outFile)} from ${parts.length} verified v17 parts (${buffer.length} bytes, sha256=${sha256})`);
