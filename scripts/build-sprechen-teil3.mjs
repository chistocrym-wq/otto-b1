import { mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const srcDir = path.join(root, 'assets-src', 'sprechen-t3-direct');
const outDir = path.join(root, 'public', 'sprechen', 'teil3-cards');

const files = (await readdir(srcDir)).filter((name) => name.endsWith('.json')).sort();
if (files.length === 0) {
  throw new Error('Sprechen Teil 3 cards: no direct card packages found');
}

const cards = new Map();
for (const file of files) {
  const parsed = JSON.parse(await readFile(path.join(srcDir, file), 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error(`Sprechen Teil 3 cards: ${file} must contain an array`);
  }

  for (const item of parsed) {
    if (!item || typeof item.name !== 'string' || typeof item.data !== 'string') {
      throw new Error(`Sprechen Teil 3 cards: invalid entry in ${file}`);
    }
    if (!/^\d{3}\.webp$/.test(item.name)) {
      throw new Error(`Sprechen Teil 3 cards: invalid card name ${item.name}`);
    }
    if (cards.has(item.name)) {
      throw new Error(`Sprechen Teil 3 cards: duplicate card ${item.name}`);
    }

    const buffer = Buffer.from(item.data, 'base64');
    const isWebp =
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    if (!isWebp) {
      throw new Error(`Sprechen Teil 3 cards: ${item.name} is not a valid WebP file`);
    }

    cards.set(item.name, buffer);
  }
}

const expectedNames = Array.from({ length: 50 }, (_, index) => `${String(index + 1).padStart(3, '0')}.webp`);
if (cards.size !== expectedNames.length || expectedNames.some((name) => !cards.has(name))) {
  throw new Error(`Sprechen Teil 3 cards: expected exactly 50 cards 001–050, found ${cards.size}`);
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
for (const name of expectedNames) {
  await writeFile(path.join(outDir, name), cards.get(name));
}

console.log(`Built ${expectedNames.length} separate verified Sprechen Teil 3 cards in ${path.relative(root, outDir)} from ${files.length} direct packages.`);
