import chunk1 from './archive/gz01';
import chunk2 from './archive/gz02';
import chunk3 from './archive/gz03';
import chunk4 from './archive/gz04';
import chunk5 from './archive/gz05';

export type LesenArchiveChoiceAnswer = 'a' | 'b';

export interface LesenArchiveTeil1Statement {
  statement: string;
  correct: boolean;
  explanation: string;
}

export interface LesenArchiveTeil1Task {
  id: number;
  format: string;
  text: string;
  statements: LesenArchiveTeil1Statement[];
}

export interface LesenArchiveOption {
  url?: string;
  title?: string;
  lines?: string[];
  rows?: string[][];
}

export interface LesenArchiveTeil2Task {
  situation: string;
  format: 'site' | 'table' | 'notice';
  a: LesenArchiveOption;
  b: LesenArchiveOption;
  correct: LesenArchiveChoiceAnswer;
  why: string;
}

export interface LesenArchiveTeil3Task {
  place: string;
  heading: string;
  text: string[];
  statement: string;
  correct: 'Richtig' | 'Falsch';
  why: string;
}

export interface LesenArchiveData {
  teil1: LesenArchiveTeil1Task[];
  teil2: LesenArchiveTeil2Task[];
  teil3: LesenArchiveTeil3Task[];
}

const payload = chunk1 + chunk2 + chunk3 + chunk4 + chunk5;
let cachedArchive: Promise<LesenArchiveData> | null = null;

async function decodeArchive(): Promise<LesenArchiveData> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Этот браузер не поддерживает распаковку заданий Lesen.');
  }

  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const compressed = new Blob([bytes.buffer as ArrayBuffer]);
  const stream = compressed.stream().pipeThrough(new DecompressionStream('gzip'));
  const json = await new Response(stream).text();
  const archive = JSON.parse(json) as LesenArchiveData;

  if (archive.teil1.length !== 50 || archive.teil2.length !== 50 || archive.teil3.length !== 50) {
    throw new Error('Архив Lesen загружен не полностью.');
  }

  return archive;
}

export function loadLesenArchive(): Promise<LesenArchiveData> {
  if (!cachedArchive) cachedArchive = decodeArchive();
  return cachedArchive;
}
