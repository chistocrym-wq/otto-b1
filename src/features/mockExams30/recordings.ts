/** Voice drafts stay only in this browser; there is no upload or score endpoint. */
const DB_NAME='otto30-exam01-recordings-v1';
const STORE='recordings';
function openDB():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    if(typeof indexedDB==='undefined'){reject(Error('IndexedDB unavailable'));return;}
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{
      if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'id'});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
export function recordingId(userId:string,taskId:string,examId='otto-a12-01'){
  if(!/^teil[123]-[a-z0-9]+$/.test(taskId))throw Error('invalid recording id');
  if(!/^otto-a12-(0[1-9]|[12][0-9]|30)$/.test(examId))throw Error('invalid exam id');
  return encodeURIComponent(userId)+':'+examId+':'+taskId;
}
export async function saveRecording(userId:string,taskId:string,blob:Blob,examId='otto-a12-01'):Promise<void>{
  const db=await openDB();
  try{
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put({id:recordingId(userId,taskId,examId),blob,at:new Date().toISOString()});
      tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });
  }finally{db.close();}
}
export async function readRecording(userId:string,taskId:string,examId='otto-a12-01'):Promise<Blob|null>{
  const db=await openDB();
  try{return await new Promise<Blob|null>((resolve,reject)=>{
    const req=db.transaction(STORE,'readonly').objectStore(STORE).get(recordingId(userId,taskId,examId));
    req.onsuccess=()=>resolve((req.result?.blob as Blob)||null);
    req.onerror=()=>reject(req.error);
  });}finally{db.close();}
}
/** Count only this user's exam #1 recordings; notes are not recorded answers. */
export async function countSavedRecordings(userId:string,examId='otto-a12-01'):Promise<number>{
  const db=await openDB();
  const prefix=encodeURIComponent(userId)+':'+examId+':';
  try{return await new Promise<number>((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly');
    const request=tx.objectStore(STORE).getAllKeys();
    request.onsuccess=()=>resolve(request.result.filter(key=>typeof key==='string'&&key.startsWith(prefix)).length);
    request.onerror=()=>reject(request.error);
    tx.onabort=()=>reject(tx.error);
  });}finally{db.close();}
}
