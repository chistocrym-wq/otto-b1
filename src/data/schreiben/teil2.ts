import { rawSchreibenTeil2Part as part1 } from './teil2-part1';
import { rawSchreibenTeil2Part as part2 } from './teil2-part2';
import { rawSchreibenTeil2Part as part3 } from './teil2-part3';
import { rawSchreibenTeil2Part as part4 } from './teil2-part4';

export interface SchreibenTeil2Task {
  id: string;
  number: number;
  title: string;
  situation: string;
  points: string[];
  minWords: number;
  maxWords: number;
}

type RawTask = readonly [number, string, readonly string[]];
const RAW: readonly RawTask[] = [...part1, ...part2, ...part3, ...part4] as unknown as readonly RawTask[];

export const schreibenTeil2Tasks: SchreibenTeil2Task[] = RAW.map(([number, situation, points]) => ({
  id: `schreiben-teil2-${number}`,
  number,
  title: `Aufgabe ${number}`,
  situation,
  points: [...points],
  minWords: 25,
  maxWords: 45,
}));
