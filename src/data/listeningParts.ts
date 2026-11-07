import { listeningTasks, type HorenTask } from './listening';

export type ListeningTeil = 1 | 2 | 3;
export type ListeningSituation = 'dialogue' | 'announcement' | 'voicemail' | 'message';

export const LISTENING_SITUATION_LABEL:Record<ListeningSituation,string> = {
  dialogue: 'Диалог',
  announcement: 'Объявление',
  voicemail: 'Телефонное сообщение',
  message: 'Короткое сообщение',
};

// Each source audioText was classified independently of its original list position.
// Nonmatching content stays as explicitly marked additional practice; no audio,
// questions, answer formats or original IDs are changed to imitate exam Teil.
const ASSIGNMENTS:ReadonlyArray<readonly [number,ListeningTeil,ListeningSituation]> = [
  [1,3,'voicemail'],
  [2,1,'dialogue'],
  [3,3,'announcement'],
  [4,1,'dialogue'],
  [5,3,'voicemail'],
  [6,2,'dialogue'],
  [7,2,'dialogue'],
  [8,2,'announcement'],
  [9,2,'dialogue'],
  [10,2,'voicemail'],
  [11,3,'voicemail'],
  [12,1,'dialogue'],
  [13,3,'announcement'],
  [14,1,'dialogue'],
  [15,3,'voicemail'],
  [16,1,'dialogue'],
  [17,1,'dialogue'],
  [18,3,'announcement'],
  [19,1,'dialogue'],
  [20,3,'message'],
  [21,1,'dialogue'],
  [22,3,'voicemail'],
  [23,1,'dialogue'],
  [24,3,'announcement'],
  [25,1,'dialogue'],
  [26,1,'dialogue'],
  [27,3,'message'],
  [28,1,'dialogue'],
  [29,3,'message'],
  [30,1,'dialogue'],
  [31,3,'announcement'],
  [32,1,'dialogue'],
  [33,3,'voicemail'],
  [34,1,'dialogue'],
  [35,3,'message'],
  [36,1,'dialogue'],
  [37,3,'message'],
  [38,1,'dialogue'],
  [39,3,'announcement'],
  [40,1,'dialogue'],
  [41,3,'voicemail'],
  [42,1,'dialogue'],
  [43,1,'dialogue'],
  [44,3,'message'],
  [45,1,'dialogue'],
  [46,2,'dialogue'],
  [47,2,'voicemail'],
  [48,2,'announcement'],
  [49,2,'dialogue'],
  [50,2,'dialogue'],
  [51,2,'voicemail'],
  [52,2,'dialogue'],
  [53,2,'dialogue'],
  [54,2,'announcement'],
  [55,2,'dialogue'],
  [56,2,'message'],
  [57,2,'dialogue'],
  [58,2,'announcement'],
  [59,2,'dialogue'],
  [60,2,'dialogue'],
  [61,2,'message'],
  [62,2,'dialogue'],
  [63,2,'voicemail'],
  [64,2,'dialogue'],
  [65,2,'dialogue'],
  [66,2,'dialogue'],
  [67,2,'message'],
  [68,2,'dialogue'],
  [69,2,'announcement'],
  [70,2,'dialogue'],
  [71,2,'voicemail'],
  [72,2,'dialogue'],
  [73,2,'dialogue'],
  [74,2,'announcement'],
  [75,2,'dialogue'],
  [76,2,'message'],
  [77,2,'dialogue'],
  [78,2,'dialogue'],
  [79,2,'voicemail'],
  [80,2,'dialogue'],
];

export interface ListeningInventoryEntry {
  task:HorenTask;
  teil:ListeningTeil;
  situation:ListeningSituation;
  additional:boolean;
}

const assignmentByNumber=new Map(ASSIGNMENTS.map(([number,teil,situation])=>[number,{teil,situation}]));
if(assignmentByNumber.size!==listeningTasks.length||ASSIGNMENTS.length!==listeningTasks.length){
  throw new Error('Hören inventory must contain every source task exactly once');
}

export const listeningInventory:ListeningInventoryEntry[]=listeningTasks.map(task=>{
  const placement=assignmentByNumber.get(task.number);
  if(!placement)throw new Error('Missing Hören classification: '+task.id);
  const {teil,situation}=placement;
  if((teil===2)!==(task.type==='true-false'))throw new Error('Changed Hören answer format: '+task.id);
  const additional=teil===2?situation!=='announcement':teil===3&&situation==='announcement';
  return {task,teil,situation,additional};
});

export const listeningTeilTasks:Record<ListeningTeil,HorenTask[]>={
  1:listeningInventory.filter(entry=>entry.teil===1).map(entry=>entry.task),
  2:listeningInventory.filter(entry=>entry.teil===2).map(entry=>entry.task),
  3:listeningInventory.filter(entry=>entry.teil===3).map(entry=>entry.task),
};

export function getListeningPlacement(task:HorenTask):ListeningInventoryEntry {
  const placement=listeningInventory.find(entry=>entry.task.id===task.id);
  if(!placement)throw new Error('Unknown Hören task: '+task.id);
  return placement;
}
