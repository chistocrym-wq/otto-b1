/** Only the candidate data contract is accepted. No private answer keys belong here. */
export type Teil = 1 | 2 | 3;
export type QuestionKind = 'multiple-choice' | 'true-false';
export type Section = 'horen' | 'lesen' | 'schreiben' | 'sprechen';
export interface ObjectiveTask {
  n: number;
  part: Teil;
  questionId: string;
  type: QuestionKind;
  prompt: string;
  options?: string[];
}
/** Visual choices are presentation metadata from the source archive, never answer keys. */
export type ListeningOptionVisual =
  | {kind:'label';label:string;alt?:string}
  | {kind:'photo-candidate';label:string;alt?:string;candidateAssetId?:string;mediaApproved?:boolean}
  | {kind:'icon';label:string;icon:string}
  | {kind:'day'|'route'|'floor'|'platform';label:string;short:string}
  | {kind:'price';label:string;icon?:string}
  | {kind:'clock';label:string;hour:number;minute:number};
export interface ListeningTask extends ObjectiveTask {
  title: string;
  audioUrl: string;
  audioStatus: string;
  audioWithRepeatedPlays?: number;
  repeatsManagedByExamTrack?: boolean;
  photoApproved?: boolean;
  optionVisuals?: ListeningOptionVisual[];
}
export interface ReadingTask extends ObjectiveTask {
  context: string;
  readingFormat: string;
}
export interface FormRow {label: string; value: string}
export interface SpeakingRequest {
  situation?: string;
  instruction?: string;
  imageAlt?: string;
  imageUrl: string;
  imageApproved: boolean;
  imageReviewStatus: string;
}
export interface ExamCandidate {
  id: string;
  title: string;
  candidateVersion: string;
  examReadiness: string;
  commercialApproved: boolean;
  requiresServerSideScoring: true;
  hoeren: ListeningTask[];
  lesen: ReadingTask[];
  schreiben: {
    part1: {scenario: string; rows: FormRow[]};
    part2: {situation: string; points: string[]; words: string; assessment: string};
  };
  sprechen: {
    teil1: string;
    teil2: {theme: string; keyword: string}[];
    teil3: SpeakingRequest[];
    assessment: string;
  };
  examRules: {durations: Record<Section,number|null>; release: string};
}
export type Exam01Candidate = ExamCandidate;
export function examIdForNumber(exam: number):string {
  if(!Number.isInteger(exam)||exam<1||exam>30)throw Error('Invalid exam number');
  return `otto-a12-${String(exam).padStart(2,'0')}`;
}
function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('EXAM01_SCHEMA: ' + message);
}
function safeRelativeMedia(path: string, folder: string): boolean {
  return typeof path === 'string' && path.startsWith(folder) &&
    !path.includes('..') && !path.includes('?') && !path.includes('#') &&
    /^[a-zA-Z0-9_./-]+$/.test(path);
}
function scanForSecretKeys(value: unknown, path = '', depth = 0): void {
  requireCondition(depth < 30,'invalid nesting');
  if (Array.isArray(value)) {value.forEach((v,i)=>scanForSecretKeys(v,path+'['+i+']',depth+1));return;}
  if (!value || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value)) {
    requireCondition(!/^(answer|answerIndex|correct|correctIndex|solution|expected|reviewTranscript|answerKey)$/i.test(key), 'sensitive field '+path+'.'+key);
    scanForSecretKeys(entry,path+'.'+key,depth+1);
  }
}
export function validateExamCandidate(value: unknown, examNumber: number): ExamCandidate {
  requireCondition(!!value && typeof value === 'object' && !Array.isArray(value),'object required');
  const v = value as Record<string,unknown>;
  const examId=examIdForNumber(examNumber);
  requireCondition(v.id===examId,'unexpected exam identity');
  requireCondition((v.examReadiness==='BLOCKED_FOR_RELEASE' && v.commercialApproved===false) || (v.examReadiness==='OWNER_APPROVED_FOR_RELEASE' && v.commercialApproved===true && (v.releaseAuthorization as {id?:string}|undefined)?.id==='OTTO31-OWNER-20261014-AUDIT-38604491958'),'owner approval required for released exam');
  requireCondition(v.requiresServerSideScoring===true,'server-only scoring required');
  requireCondition(Array.isArray(v.hoeren)&&v.hoeren.length===15,'15 Horen questions');
  requireCondition(Array.isArray(v.lesen)&&v.lesen.length===15,'15 Lesen questions');
  scanForSecretKeys(v);
  const exam=v as unknown as ExamCandidate;
  for (const [section,tasks,counts] of [
    ['hoeren',exam.hoeren,[6,4,5]],['lesen',exam.lesen,[5,5,5]]
  ] as const) {
    const seen=new Set<string>();
    for (let i=0;i<tasks.length;i++) {
      const task=tasks[i];
      requireCondition(task.n===i+1,section+': question numbering');
      requireCondition(task.questionId===`${examId}:${section}:${String(i+1).padStart(2,'0')}`,section+': question id');
      requireCondition(!seen.has(task.questionId),section+': duplicate');
      seen.add(task.questionId);
      requireCondition(task.type==='multiple-choice'||task.type==='true-false',section+': unsupported question kind');
      requireCondition(typeof task.prompt==='string'&&task.prompt.trim().length>0,section+': prompt');
      if(task.type==='multiple-choice')requireCondition(Array.isArray(task.options)&&task.options.length>=2,section+': option labels');
    }
    counts.forEach((count,i)=>requireCondition(tasks.filter(x=>x.part===i+1).length===count,section+': Teil count'));
  }
  exam.hoeren.forEach((t,i)=>{
    requireCondition(t.audioUrl===`audio/exam_${String(examNumber).padStart(2,'0')}/task_${String(i+1).padStart(2,'0')}.mp3`,'Horen audio correspondence');
    requireCondition(safeRelativeMedia(t.audioUrl,`audio/exam_${String(examNumber).padStart(2,'0')}/`),'Horen audio path');
    requireCondition(t.audioStatus===(v.examReadiness==='OWNER_APPROVED_FOR_RELEASE'?'OWNER_APPROVED_FOR_RELEASE':'GENERATED_EDGE_TTS_PREVIEW_NOT_PEDAGOGICALLY_APPROVED'),'audio approval gate');
    if(t.optionVisuals!==undefined){
      requireCondition(t.type==='multiple-choice'&&Array.isArray(t.options),'Horen visual answers require choices');
      requireCondition(Array.isArray(t.optionVisuals)&&t.optionVisuals.length===t.options.length,'Horen visual choice count');
      for(let j=0;j<t.optionVisuals.length;j++){
        const visual=t.optionVisuals[j];
        requireCondition(!!visual&&['label','photo-candidate','icon','day','route','floor','clock','price','platform'].includes(visual.kind),'Horen visual kind');
        requireCondition(typeof visual.label==='string'&&(visual.label===t.options[j]||(visual.kind==='price'&&visual.label.replace('.',',')===t.options[j])),'Horen visual label preserves option order');
        if(visual.kind==='clock')requireCondition(Number.isInteger(visual.hour)&&visual.hour>=0&&visual.hour<24&&Number.isInteger(visual.minute)&&visual.minute>=0&&visual.minute<60,'Horen clock range');
        if(visual.kind==='photo-candidate')requireCondition(visual.mediaApproved!==true,'unapproved photo must not be loaded');
      }
    }
  });
  requireCondition(Array.isArray(exam.schreiben?.part1?.rows)&&[6,7].includes(exam.schreiben.part1.rows.length),'Schreiben form');
  requireCondition(Array.isArray(exam.schreiben?.part2?.points)&&exam.schreiben.part2.points.length===3,'Schreiben letter');
  requireCondition(Array.isArray(exam.sprechen?.teil2)&&exam.sprechen.teil2.length===2,'Sprechen Teil 2');
  requireCondition(Array.isArray(exam.sprechen?.teil3)&&exam.sprechen.teil3.length===2,'Sprechen Teil 3');
  exam.sprechen.teil3.forEach(card=>requireCondition(safeRelativeMedia(card.imageUrl,'images/sprechen/'),'image path'));
  requireCondition(exam.examRules?.release===(v.examReadiness==='OWNER_APPROVED_FOR_RELEASE'?'OWNER_APPROVED':'BLOCKED'),'release lock');
  requireCondition(Object.values(exam.examRules?.durations||{}).every(value=>value===null||typeof value==='number'),'duration schema');
  return exam;
}
/** Compatibility for existing isolated candidate and unit tests. */
export function validateExam01(value:unknown):Exam01Candidate {
  return validateExamCandidate(value,1);
}
