// Synthetic QA data only. No real users, messages, contact details or access credentials.
export const SUBJECT='00000000-0000-4000-8000-000000000001';
export const SUBJECT2='00000000-0000-4000-8000-000000000002';
export function fixtureRows(){
 const result=(score,total,first,at)=>({score,total,firstScore:first,firstTotal:total,attempts:first===score?[{score,total,at}]:[{score:first,total,at:'2026-10-19T20:00:00Z'},{score,total,at}],corrected:first<score});
 const details={lesen:{
  '1-0':result(2,3,0,'2026-10-20T05:50:00Z'),'1-49':result(2,3,2,'2026-10-20T05:51:00Z'),
  '1-48':result(3,3,0,'2026-10-20T05:52:00Z'),'1-47':result(3,3,3,'2026-10-20T05:53:00Z'),
  '2-10':result(1,1,1,'2026-10-20T05:54:00Z'),'2-11':result(0,1,0,'2026-10-20T05:55:00Z'),
 },horen:{'horen-001':result(1,1,1,'2026-10-20T05:58:57Z')},schreiben:{},sprechen:{}};
 const data={
  'otto-a1-lesen-progress-v2':{'1':{nextIndex:2,completedTasks:5,answered:15,correct:7,credited:['1-0','1-1','1-49','1-48','1-47']},'2':{nextIndex:12,completedTasks:12,answered:12,correct:6,credited:Array.from({length:12},(_,i)=>'2-'+i)}},
  'otto-training-resume-v1':{activeTrainingView:'horen',activeTrainingDetail:'horen-teil3'},
  'otto-module-task-completion-v1':{taskResults:details,lesen:['1-0','1-1','1-49','1-48','1-47',...Array.from({length:12},(_,i)=>'2-'+i)],horen:Array.from({length:14},(_,i)=>'horen-'+String(i+1).padStart(3,'0')),schreiben:['w-1','w-2','w-3'],sprechen:['s-1','s-2','s-3','s-4','s-5']},
 };
 return [...Object.entries(data).map(([state_key,value])=>({state_key,state_value:JSON.stringify(value),updated_at:'2026-10-20T06:00:00Z'})),{state_key:'otto-lesen-teil2-progress-v1',state_value:null,updated_at:null}];
}
export const users=[{user_id:SUBJECT,user_name:'Тестовый ученик',email:null,telegram_id:null,registered_at:'2026-10-20T04:00:00Z',training_seconds:0,last_session_at:'2026-10-20T06:05:00Z',total_count:2},{user_id:SUBJECT2,user_name:'Тестовый аккаунт 2',email:null,telegram_id:null,registered_at:'2026-10-20T04:00:00Z',training_seconds:35,last_session_at:null,total_count:2}];
