/** Local-only text drafts for Schreiben A1 Teil 2.
 * The authenticated backend userId and the existing task ID form an isolated
 * storage key. This data is never included in progress/server synchronization.
 */
const PREFIX='otto-schreiben-teil2-text-draft-v1:';
const LETTER_ID=/^schreiben-teil2-\d+$/;

export function schreibenDraftStorageKey(userId:string|undefined|null,taskId:string):string|null{
  if(typeof userId!=='string'||!userId.trim()||!LETTER_ID.test(taskId))return null;
  return PREFIX+encodeURIComponent(userId)+':'+taskId;
}

export function readSchreibenLetterDraft(userId:string|undefined|null,taskId:string):string{
  const key=schreibenDraftStorageKey(userId,taskId);
  if(!key)return '';
  try{return localStorage.getItem(key)??''}catch{return ''}
}

export function readSchreibenLetterDrafts(userId:string|undefined|null,taskIds:readonly string[]):Record<string,string>{
  const result:Record<string,string>={};
  if(typeof userId!=='string'||!userId.trim())return result;
  for(const taskId of taskIds){
    const text=readSchreibenLetterDraft(userId,taskId);
    if(text!=='')result[taskId]=text;
  }
  return result;
}

export function writeSchreibenLetterDraft(userId:string|undefined|null,taskId:string,text:string):boolean{
  const key=schreibenDraftStorageKey(userId,taskId);
  if(!key||typeof text!=='string')return false;
  try{
    if(text==='')localStorage.removeItem(key);
    else localStorage.setItem(key,text);
    return true;
  }catch{
    // Quota, private mode or restricted webviews must not crash the editor.
    return false;
  }
}
