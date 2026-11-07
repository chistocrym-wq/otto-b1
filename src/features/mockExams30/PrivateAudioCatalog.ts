/** Deterministic owner-only mapping. No MP3 bytes in source or Vite dist. */
export interface PrivateAudioEntry{exam:number;question:number;path:string}
export function audioPath(exam:number,question:number):string {
  if(!Number.isInteger(exam)||exam<1||exam>30)throw Error('Exam number must be 1–30');
  if(!Number.isInteger(question)||question<1||question>15)throw Error('Hören question must be 1–15');
  return `audio/exam_${String(exam).padStart(2,'0')}/task_${String(question).padStart(2,'0')}.mp3`;
}
export const PRIVATE_AUDIO_COUNT=450;
export function allAudioEntries():PrivateAudioEntry[] {
  return Array.from({length:30},(_,i)=>Array.from({length:15},(_,j)=>({exam:i+1,question:j+1,path:audioPath(i+1,j+1)}))).flat();
}
