export type ModuleId = 'lesen' | 'horen' | 'schreiben' | 'sprechen';

export type QuestionType = 'multiple-choice' | 'true-false' | 'matching' | 'fill-blank';

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  explanation?: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: string[];
  correctIndex: number;
  promptRu?: string;
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true-false';
  correctAnswer: boolean;
  promptRu?: string;
}

export interface MatchingQuestion extends BaseQuestion {
  type: 'matching';
  items: string[];
  matches: string[];
  correctPairs: number[];
}

export interface FillBlankQuestion extends BaseQuestion {
  type: 'fill-blank';
  text: string;
  answer: string;
  alternatives?: string[];
}

export type Question = MultipleChoiceQuestion | TrueFalseQuestion | MatchingQuestion | FillBlankQuestion;

export type ReadingVisualType = 'sms' | 'email' | 'note' | 'fridge-note' | 'postcard' | 'letter';

export interface ReadingVisual {
  sender?: string;
  recipient?: string;
  subject?: string;
  date?: string;
  title?: string;
  message?: string;
  body?: string;
  signature?: string;
}

export interface ReadingTask {
  id: string;
  title: string;
  instruction: string;
  instructionRu?: string;
  visualType: ReadingVisualType;
  visual: ReadingVisual;
  questions: (MultipleChoiceQuestion | TrueFalseQuestion)[];
}

export interface ListeningTask {
  id: string;
  title: string;
  instruction: string;
  audioText: string;
  questions: (MultipleChoiceQuestion | TrueFalseQuestion)[];
}

export interface WritingTask {
  id: string;
  title: string;
  instruction: string;
  type: 'email' | 'message' | 'form';
  situation: string;
  points: string[];
  sampleAnswer: string;
  minWords: number;
  maxWords: number;
}

export interface SpeakingTask {
  id: string;
  title: string;
  instruction: string;
  type: 'introduction' | 'topic-card' | 'request';
  prompts: string[];
  sampleAnswer?: string;
  keywords?: string[];
}

export interface ModuleProgress {
  completed: number;
  total: number;
  bestScore: number;
  lastScore: number;
  attempts: number;
  answered?: number;
  correct?: number;
  recentScores?: number[];
}

export interface Progress {
  [key: string]: ModuleProgress;
}

export interface ActivityEntry {
  id: string;
  module: string;
  score: number;
  total: number;
  percent: number;
  at: string;
  durationSeconds?: number;
}

export type LesenTeil2VisualType = 'shop' | 'cinema' | 'school' | 'travel' | 'website' | 'housing' | 'doctor' | 'leisure' | 'restaurant' | 'classified' | 'parking' | 'service' | 'transport' | 'course' | 'job' | 'hotel';

export interface LesenTeil2Option {
  type: LesenTeil2VisualType;
  title: string;
  text: string;
}

export interface ReadingTeil2Task {
  id: string;
  title: string;
  situation: string;
  options: { a: LesenTeil2Option; b: LesenTeil2Option };
  correctAnswer: 'a' | 'b' | 'A' | 'B';
}
