import { rawSchreibenTeil1Part as part1 } from './teil1-part1';
import { rawSchreibenTeil1Part as part2 } from './teil1-part2';
import { rawSchreibenTeil1Part as part3 } from './teil1-part3';

export interface SchreibenFormRow {
  label: string;
  value: string;
  answer?: string;
}

export interface SchreibenTeil1Task {
  id: string;
  number: number;
  title: string;
  scenario: string;
  instruction: string;
  rows: SchreibenFormRow[];
}

type RawTask = readonly [number, string, string, readonly (readonly [string, string, string?])[]];
const RAW: readonly RawTask[] = [...part1, ...part2, ...part3] as unknown as readonly RawTask[];

export const schreibenTeil1Tasks: SchreibenTeil1Task[] = RAW.map(([number, title, scenario, rows]) => ({
  id: `schreiben-teil1-${number}`,
  number,
  title,
  scenario,
  instruction: 'Helfen Sie Ihrer Freundin / Ihrem Freund und schreiben Sie die fünf fehlenden Informationen in das Formular.',
  rows: rows.map((row) => ({
    label: row[0],
    value: row[1],
    ...(row[2] ? { answer: row[2] } : {}),
  })),
}));
