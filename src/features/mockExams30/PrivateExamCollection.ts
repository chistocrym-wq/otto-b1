import type { ExamCandidate } from './schema.js';
import { validateExamCandidate } from './schema.js';
import { allAudioEntries } from './PrivateAudioCatalog.js';
import type { PrivateAssetProvider } from './media.js';

/** All data and media remain owner-selected browser File objects; no remote endpoints. */
export interface PrivateExamCollection {
  exam(number:number):ExamCandidate;
  assetForExam(number:number):PrivateAssetProvider;
  audioCount:number;
  imageBindingCount:number;
  imageCount:number;
  dispose():void;
  // Explicitly inspect all source MP3s through the very same provider used by React.
  checkAudioFiles():Promise<{checked:number;bytes:number;shaVerified:boolean}>;
}
interface EntryEvidence{bytes:number;sha256:string}
interface CandidateManifest{
  format:string;release:string;localOnly:boolean;hasAnswerKeys:boolean;
  files:Record<string,EntryEvidence>;
}
const candidateFileName=/^(?:exams\/exam_(?:0[1-9]|[12][0-9]|30)\.json|audio\/exam_(?:0[1-9]|[12][0-9]|30)\/task_(?:0[1-9]|1[0-5])\.mp3|images\/sprechen\/scene_(?:0[1-9]|1[0-9]|20)\.png|client_manifest\.json)$/;
const forbiddenPath=/(?:^|\/)(?:private_data_NOT_PUBLIC|answer_keys|\.env|credentials)(?:\/|$)|(?:\.key\.json$)|(?:^|\/)(?:answers|solutions)\b/i;
const expectedAudio=allAudioEntries();

function suffixPath(input:string):string|null{
  const normalized=input.replace(/\\/g,'/');
  for(const prefix of ['exams/','audio/','images/','client_manifest.json']){
    const index=normalized.lastIndexOf(prefix);
    if(index>=0&&(index===0||normalized[index-1]==='/')){
      const candidate=normalized.slice(index);
      if(candidateFileName.test(candidate))return candidate;
    }
  }
  return null;
}
function ensureObject(value:unknown):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Некорректный клиентский манифест');
  return value as Record<string,unknown>;
}
function asManifest(value:unknown):CandidateManifest{
  const obj=ensureObject(value);
  if(obj.format!=='OTTO30_OWNER_PRIVATE_CANDIDATE_V1'||obj.release!=='BLOCKED_FOR_RELEASE'||obj.localOnly!==true||obj.hasAnswerKeys!==false){
    throw Error('Требуется отдельный клиентский пакет без ключей ответов');
  }
  return obj as unknown as CandidateManifest;
}
function hex(buffer:ArrayBuffer):string{
  return Array.from(new Uint8Array(buffer),x=>x.toString(16).padStart(2,'0')).join('');
}
async function hashIfAvailable(file:File,expected:string):Promise<void>{
  if(typeof crypto==='undefined'||!crypto.subtle){
    const sample=await file.slice(0,64).arrayBuffer();
    if(sample.byteLength===0)throw Error('Не удалось прочитать байты: '+file.name);
    return; // Local file contexts may not support SubtleCrypto.
  }
  const digest=hex(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()));
  if(digest!==expected)throw Error('Контрольная сумма не совпала: '+file.name);
}
function validatePathEvidence(path:string,file:File,manifest:CandidateManifest):void{
  const item=manifest.files[path];
  if(!item||!Number.isSafeInteger(item.bytes)||item.bytes!==file.size||!/^[a-f0-9]{64}$/i.test(item.sha256)){
    throw Error('Файл не совпадает с клиентским манифестом: '+path);
  }
}

/** Reject a raw E9R3 archive directory if it contains PRIVATE keys; only sanitized export is accepted.
 * The manifest allows 30 JSON + 450 MP3 + 20 images, no other data.
 */
export async function importPrivateExamDirectory(source:Iterable<File>):Promise<PrivateExamCollection>{
  const map=new Map<string,File>();
  let scanned=0;
  for(const file of source){
    scanned++;
    const raw=(file.webkitRelativePath||file.name).replace(/\\/g,'/');
    if(forbiddenPath.test(raw))throw Error('Выбрана папка с закрытыми ключами. Используйте очищенный пакет владельца.');
    const path=suffixPath(raw);
    if(!path)throw Error('Посторонний файл в каталоге владельца: '+file.name);
    if(map.has(path))throw Error('Дублированный файл '+path);
    if(!file.size)throw Error('Пустой файл '+path);
    map.set(path,file);
  }
  if(scanned!==501||map.size!==501)throw Error(`В папке требуется 501 файл, найдено ${scanned}.`);
  const manifestFile=map.get('client_manifest.json');
  if(!manifestFile)throw Error('Не найден безопасный client_manifest.json');
  const manifest=asManifest(JSON.parse(await manifestFile.text()));
  if(Object.keys(manifest.files).length!==500)throw Error('Ожидалось 500 записей манифеста');
  for(const [path,file] of map){
    if(path==='client_manifest.json')continue;
    validatePathEvidence(path,file,manifest);
  }
  const exams=new Map<number,ExamCandidate>();
  for(let exam=1;exam<=30;exam++){
    const path=`exams/exam_${String(exam).padStart(2,'0')}.json`;
    const file=map.get(path);
    if(!file)throw Error('Отсутствует экзамен №'+exam);
    await hashIfAvailable(file,manifest.files[path].sha256);
    const item=validateExamCandidate(JSON.parse(await file.text()),exam);
    exams.set(exam,item);
  }
  for(const entry of expectedAudio){
    const file=map.get(entry.path);
    if(!file)throw Error('Нет MP3: '+entry.path);
  }
  const images=new Set<string>();
  let bindings=0;
  for(const exam of exams.values())for(const item of exam.sprechen.teil3){
    if(!map.has(item.imageUrl))throw Error('Не найдена исходная картинка: '+item.imageUrl);
    bindings++;images.add(item.imageUrl);
  }
  if(bindings!==60||images.size!==20)throw Error('Некорректные 60 привязок изображений');
  if(map.size!==501||[...map.keys()].filter(x=>x.startsWith('audio/')).length!==450)throw Error('MP3 не 450');
  let disposed=false;
  const cache=new Set<string>();
  async function get(path:string):Promise<Blob>{
    if(disposed)throw Error('Локальный пакет закрыт');
    if(!/^audio\/exam_(?:0[1-9]|[12][0-9]|30)\/task_(?:0[1-9]|1[0-5])\.mp3$/.test(path)&&
       !/^images\/sprechen\/scene_(?:0[1-9]|1[0-9]|20)\.png$/.test(path))throw Error('Недопустимый файл: '+path);
    const file=map.get(path);
    if(!file)throw Error('Файл отсутствует: '+path);
    if(!cache.has(path)){
      await hashIfAvailable(file,manifest.files[path].sha256);
      cache.add(path);
    }
    return file;
  }
  return {
    exam(number){if(!Number.isInteger(number)||number<1||number>30)throw Error('Номер экзамена 1–30');const exam=exams.get(number);if(!exam)throw Error('Нет экзамена');return exam;},
    assetForExam(number){
      if(!Number.isInteger(number)||number<1||number>30)throw Error('Недопустимый экзамен');
      const prefix=`audio/exam_${String(number).padStart(2,'0')}/`;
      const picturePaths=new Set(exams.get(number)?.sprechen.teil3.map(x=>x.imageUrl));
      return async path=>{
        if(!path.startsWith(prefix)&&!picturePaths.has(path))throw Error('Нельзя загрузить данные другого экзамена');
        return get(path);
      };
    },
    audioCount:450,imageCount:images.size,imageBindingCount:bindings,
    dispose(){disposed=true;cache.clear();exams.clear();map.clear();},
    async checkAudioFiles(){let checked=0;let bytes=0;for(const entry of expectedAudio){const file=await get(entry.path);bytes+=file.size;checked++;}return {checked,bytes,shaVerified:typeof crypto!=='undefined'&&Boolean(crypto.subtle)};}
  };
}
