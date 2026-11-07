import React from 'react';
import { T } from './labels.js';
import { Exam30LegacyStyleReview } from './Exam30LegacyStyleReview.js';
import { Exam30KeyAdmin } from './Exam30KeyAdmin.js';
import { Exam30MyResults } from './Exam30MyResults.js';
import type { ExamCandidate } from './schema.js';
import type { PrivateAssetProvider } from './media.js';
import {readCursor,saveCursor,readMode,saveMode,readLegacyDone,markLegacyDone,EXAM_LAST} from './examSequence.js';
import {readMockHistory} from '../../lib/mockExam.js';
import {progressKey} from './progress.js';

interface Props {onBack:()=>void;renderOriginal:(timerEnabled?:boolean,displayNumber?:number,onOriginalBack?:()=>void,onOriginalComplete?:()=>void)=>React.ReactNode;userId?:string;guest?:boolean}
type OwnerStatus={authorized:boolean;ready:boolean;expected:number;ownerUploadEnabled:boolean;userId?:string};
interface State {
 loading:boolean;owner:boolean;ready:boolean;ownerUploadEnabled:boolean;original:boolean;
 selected:number|null;exam:ExamCandidate|null;error:string;
 uploading:boolean;uploaded:number;statusText:string;timerEnabled:boolean;
 currentDisplay:number;reviewDisplay:number|null;legacyComplete:boolean;showResults:boolean;
}
const btn='min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-900';
const API='/api/otto30-private';
async function api(op:string,query?:Record<string,string>){
 const u=new URL(API,location.origin);u.searchParams.set('op',op);
 for(const [k,v] of Object.entries(query||{}))u.searchParams.set(k,v);
 return u.toString();
}
async function getJSON<T>(op:string,query?:Record<string,string>):Promise<T>{
 const response=await fetch(await api(op,query),{credentials:'same-origin',cache:'no-store'});
 if(!response.ok)throw Error('Приватный сервер вернул '+response.status+' ('+op+').');
 return await response.json() as T;
}
async function ownerPost(op:string,body:BodyInit|null,query?:Record<string,string>){
 const response=await fetch(await api(op,query),{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'x-otto30-owner-upload':'1','Content-Type':'application/octet-stream'},body});
 const result=await response.json().catch(()=>({code:'invalid_server_reply'})) as {ok?:boolean;code?:string;confirmed?:number};
 if(!response.ok||result.code)throw Error(result.code||'Ошибка загрузки '+response.status);
 return result;
}
function sourcePath(file:File):string{
 const full=(file.webkitRelativePath||file.name).replace(/\\/g,'/');
 for(const p of ['client_manifest.json','exams/','audio/','images/']){
  const i=full.lastIndexOf(p);
  if(i>=0&&(i===0||full[i-1]==='/'))return full.slice(i);
 }
 return '';
}
export class Exam01Route extends React.Component<Props,State> {
 state:State={loading:true,owner:false,ready:false,ownerUploadEnabled:false,original:false,selected:null,exam:null,error:'',
  uploading:false,uploaded:0,statusText:'',timerEnabled:true,currentDisplay:1,reviewDisplay:null,legacyComplete:false,showResults:false};
 private mounted=false;
 private legacySeen=new Set<string>();
 private legacyWatcher:number|null=null;
 private startOriginal=(review=false)=>{
  this.legacySeen=new Set(readMockHistory().map(attempt=>attempt.id));
  this.setState({original:true,selected:null,exam:null,reviewDisplay:review?1:null});
 };
 private checkOriginal=()=>{
  if(!this.mounted||!this.state.original||this.state.reviewDisplay!==null||this.state.currentDisplay!==1||this.state.legacyComplete)return;
  if(readMockHistory().some(attempt=>!this.legacySeen.has(attempt.id)))this.originalComplete();
 };
 private uid=()=>this.props.userId||'';
 private setTimerMode=(enabled:boolean)=>{
  if(this.uid())saveMode(localStorage,this.uid(),enabled);
  this.setState({timerEnabled:enabled});
 };
 componentDidMount(){
  this.mounted=true;
  this.legacyWatcher=window.setInterval(this.checkOriginal,1200);
  const userId=this.uid();
  if(userId)this.setState({timerEnabled:readMode(localStorage,userId),currentDisplay:readCursor(localStorage,userId),legacyComplete:readLegacyDone(localStorage,userId)});
  if(this.props.guest)this.setState({loading:false,owner:false,error:''});
  else void this.loadStatus();
 }
 componentWillUnmount(){this.mounted=false;if(this.legacyWatcher!==null)window.clearInterval(this.legacyWatcher);}
 private loadStatus=async()=>{
  if(this.props.guest){if(this.mounted)this.setState({loading:false,owner:false,error:''});return;}
  try{
   const res=await fetch(await api('status'),{credentials:'same-origin',cache:'no-store'});
   if(res.status===403){if(this.mounted)this.setState({loading:false,owner:false,error:'Сервер вернул 403: закрытый доступ к экзаменам не подтверждён.'});return;}
   if(!res.ok)throw Error('Статус закрытого хранилища: '+res.status);
   const result=await res.json() as OwnerStatus;
   if(this.mounted)this.setState({loading:false,owner:result.authorized,ready:result.ready,ownerUploadEnabled:result.ownerUploadEnabled===true});
  }catch(error){if(this.mounted)this.setState({loading:false,owner:false,error:String(error)});}
 };
 private openExam=async(number:number,review=false)=>{
  if(!this.state.ready){this.setState({error:'Экзаменационные задания ещё не загружены в закрытое хранилище.'});return;}
  this.setState({selected:number,exam:null,error:'',loading:true,original:false,reviewDisplay:review?number+1:null});
  try{
   const exam=await getJSON<ExamCandidate>('exam',{number:String(number)});
   if(this.mounted)this.setState({exam,loading:false});
  }catch(e){if(this.mounted)this.setState({selected:null,exam:null,reviewDisplay:null,loading:false,error:String(e)})}
 };
 private hasStartedCurrent=()=>{
  const id=this.uid();
  if(!id||this.state.currentDisplay===1)return this.state.legacyComplete;
  try{return localStorage.getItem(progressKey(id,'otto-a12-'+String(this.state.currentDisplay-1).padStart(2,'0')))!==null;}
  catch{return false;}
 };
 private openCurrent=()=>{
  const number=this.state.currentDisplay;
  if(number===1)this.startOriginal();
  else void this.openExam(number-1);
 };
 private openReview=(display:number)=>{
  if(display<1||display>=this.state.currentDisplay)return;
  if(display===1)this.startOriginal(true);
  else void this.openExam(display-1,true);
 };
 private openPrevious=()=>{
  const number=this.state.currentDisplay-1;
  if(number<1)return;
  this.openReview(number);
 };
 private next=()=>{
  const {currentDisplay}=this.state;
  if(currentDisplay>=EXAM_LAST)return;
  if(!this.uid())return;
  const nextDisplay=currentDisplay+1;
  if(!saveCursor(localStorage,this.uid(),nextDisplay)){this.setState({error:'Не удалось сохранить номер экзамена. Разрешите хранение данных в браузере.'});return;}
  this.setState({currentDisplay:nextDisplay,original:false,selected:null,exam:null,reviewDisplay:null,error:''},()=>{
   if(nextDisplay>1)void this.openExam(nextDisplay-1);
  });
 };
 private originalComplete=()=>{
  const userId=this.uid();
  if(!userId)return;
  const saved=markLegacyDone(localStorage,userId);
  this.setState({legacyComplete:saved,error:saved?'':'Не удалось сохранить завершение первого экзамена.'});
 };
 private media:PrivateAssetProvider=async(path)=>{
  const response=await fetch(await api('media',{path}),{credentials:'same-origin',cache:'no-store'});
  if(!response.ok)throw Error('Недоступен закрытый файл: '+response.status);
  return response.blob();
 };
 private upload=async(event:React.ChangeEvent<HTMLInputElement>)=>{
  const files=event.currentTarget.files;
  if(!files?.length)return;
  const map=new Map<string,File>();
  for(const file of Array.from(files)){
   const path=sourcePath(file);
   if(!path||map.has(path)||/\.key\.json$|\/private_data_NOT_PUBLIC\//i.test(path)){
    this.setState({error:'Требуется только очищенный пакет без закрытых ключей.'});return;
   }
   map.set(path,file);
  }
  if(map.size!==501||!map.has('client_manifest.json')){this.setState({error:'Нужна распакованная очищенная папка из 501 файла.'});return;}
  this.setState({uploading:true,error:'',uploaded:0,statusText:'Проверяю список материалов…'});
  try{
   const manifestFile=map.get('client_manifest.json')!;
   const manifest=JSON.parse(await manifestFile.text()) as {files:Record<string,{bytes:number;sha256:string}>};
   if(Object.keys(manifest.files||{}).length!==500)throw Error('Не найден манифест 500 исходных файлов.');
   for(const [path,file] of map){
    if(path==='client_manifest.json')continue;
    if(!manifest.files[path]||manifest.files[path].bytes!==file.size)throw Error('Неверный размер '+path);
   }
   await ownerPost('manifest',await manifestFile.arrayBuffer());
   const tasks=[...map].filter(([path])=>path!=='client_manifest.json');
   let index=0,uploaded=0;
   const worker=async()=>{
    while(index<tasks.length){
     const [path,file]=tasks[index++];
     await ownerPost('upload',file,{path});
     uploaded++;
     if(this.mounted&&uploaded%4===0)this.setState({uploaded,statusText:'Загружено '+uploaded+' / 500'});
    }
   };
   await Promise.all(Array.from({length:3},()=>worker()));
   this.setState({uploaded:500,statusText:'Сверяю закрытое хранилище: 20 защищённых проверок…'});
   for(let batch=0;batch<20;batch++){
     await ownerPost('finalize',null,{batch:String(batch)});
     if(this.mounted)this.setState({statusText:'Проверена группа '+(batch+1)+' / 20'});
   }
   await ownerPost('complete',null);
   if(this.mounted)this.setState({uploading:false,ready:true,statusText:'Все 30 экзаменов готовы в закрытом Preview 13.'});
  }catch(e){if(this.mounted)this.setState({uploading:false,error:String(e),statusText:'Загрузка прервана. Проверьте сообщение.'})}
  event.currentTarget.value='';
 };

 render(){
  const {loading,owner,ready,ownerUploadEnabled,original,selected,exam,error,uploading,uploaded,statusText,timerEnabled,currentDisplay,legacyComplete,reviewDisplay,showResults}=this.state;
  if(this.props.guest)return <><aside role="status" className="mx-auto mb-3 max-w-4xl rounded-2xl border border-teal-200 bg-teal-50 px-4 py-4 text-sm leading-6 text-teal-950">
    <p className="font-black">Гостевой режим: пробный экзамен №1</p>
    <p className="mt-1">Остальные варианты экзаменов и проверка ответов к ним доступны авторизованным пользователям.</p>
    <a href="/?register=1" className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-teal-600 bg-white px-4 font-bold text-teal-900">Войти или зарегистрироваться</a>
   </aside>{this.props.renderOriginal(timerEnabled,1)}</>;
  if(!loading&&!owner)return <><aside role="alert" className="mx-auto mb-3 max-w-4xl rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><b>Новые экзамены пока недоступны.</b> {error||'Не удалось проверить разрешение владельца.'} <button type="button" className={btn+' ml-2'} onClick={()=>void this.loadStatus()}>Повторить проверку</button></aside>{this.props.renderOriginal()}</>;
  if(showResults&&owner&&ready)return <Exam30MyResults onBack={()=>this.setState({showResults:false})}/>;
  if(original)return <div className="pb-8 pt-14 sm:pt-0">
   <button type="button" className={btn+' mb-4'} onClick={()=>this.setState({original:false,reviewDisplay:null})}>← К пробным экзаменам</button>
   {this.props.renderOriginal(timerEnabled,1,()=>this.setState({original:false,reviewDisplay:null}))}
   {legacyComplete&&reviewDisplay===null&&currentDisplay===1&&<button type="button" className="mt-5 min-h-12 w-full rounded-xl bg-teal-700 px-5 font-black text-white" onClick={this.next}>Следующий экзамен →</button>}
   {reviewDisplay!==null&&<button type="button" className={btn+' mt-5 w-full'} onClick={()=>this.setState({original:false,reviewDisplay:null})}>Вернуться к текущему экзамену</button>}
  </div>;
  if(selected!==null&&exam)return <div className="pb-8 pt-14 sm:pt-0">
   <button type="button" className={btn+' mb-4'} onClick={()=>this.setState({selected:null,exam:null,reviewDisplay:null})}>← К пробным экзаменам</button>
   {reviewDisplay!==null&&reviewDisplay>1&&<button type="button" className={btn+' mb-4 ml-2'} onClick={()=>this.openReview(reviewDisplay-1)}>← Ранее пройденный экзамен</button>}
   <Exam30LegacyStyleReview key={selected} exam={exam} userId={this.uid()} privateAssetProvider={this.media}
    timerEnabled={timerEnabled} displayNumber={selected+1} showReviewImages
    onBack={()=>this.setState({selected:null,exam:null,reviewDisplay:null})}
    onNextExam={reviewDisplay===null&&currentDisplay===selected+1&&currentDisplay<EXAM_LAST?this.next:undefined}
    isCurrentExam={reviewDisplay===null&&currentDisplay===selected+1}
   />
  </div>;
  const activeCompleted=currentDisplay===1?legacyComplete:false;
  return <section className="mx-auto max-w-4xl pb-8" data-otto30-preview13-exams="true">
   <header className="mb-5 flex items-center gap-3 pt-14 sm:pt-0"><button type="button" className={btn} onClick={this.props.onBack}>{T.back}</button><h1 className="text-2xl font-black">Пробные экзамены</h1></header>
   {loading&&<p role="status">Проверяю защищённый доступ…</p>}
   {error&&<p role="alert" className="mb-4 rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p>}
   {owner&&!ready&&!loading&&!ownerUploadEnabled&&<p role="status" className="rounded-xl border bg-white p-4">Экзамены ещё не подготовлены. Загрузка доступна только администратору.</p>}
   {owner&&!ready&&!loading&&ownerUploadEnabled&&<section className="rounded-2xl border bg-white p-5">
     <h2 className="text-xl font-black">Первоначальная защищённая загрузка</h2>
     <p className="mt-2 text-sm leading-6 text-slate-700">Материалы загружаются один раз владельцем в закрытое хранилище. При прохождении экзаменов выбор папки не потребуется.</p>
     <input type="file" multiple ref={input=>{input?.setAttribute('webkitdirectory','');input?.setAttribute('directory','')}} disabled={uploading} onChange={e=>void this.upload(e)} aria-label="Однократная загрузка закрытого пакета владельца" className="mt-4 block w-full"/>
     {uploading&&<progress className="mt-4 w-full" max={500} value={uploaded}/>}
     {statusText&&<p role="status" className="mt-3 text-sm">{statusText}</p>}
     <button type="button" className={btn+' mt-4'} disabled={uploading} onClick={()=>void this.loadStatus()}>Повторно проверить доступ</button>
     {currentDisplay===1&&<button type="button" className={btn+' mt-4 ml-2'} onClick={this.openCurrent}>Пробный экзамен №1</button>}
   </section>}
   {owner&&ready&&!loading&&<section className="rounded-3xl bg-slate-950 p-6 text-white">
     <h2 className="text-2xl font-black">Пробный экзамен №{currentDisplay}</h2>
     <p className="mt-2 text-sm text-white/75">Hören · Lesen · Schreiben · Sprechen</p>
     <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Режим таймера">
      <button type="button" aria-pressed={timerEnabled} onClick={()=>this.setTimerMode(true)} className={btn+(timerEnabled?' border-teal-500 bg-teal-50':'')}>С таймером</button>
      <button type="button" aria-pressed={!timerEnabled} onClick={()=>this.setTimerMode(false)} className={btn+(!timerEnabled?' border-teal-500 bg-teal-50':'')}>Без таймера</button>
     </div>
     <button type="button" onClick={this.openCurrent} className="mt-5 min-h-12 w-full rounded-xl bg-teal-600 px-5 font-black text-white">{currentDisplay===1&&legacyComplete?'Просмотреть результат':this.hasStartedCurrent()?'Продолжить':'Начать'}</button>
     {activeCompleted&&currentDisplay<EXAM_LAST&&<button type="button" onClick={this.next} className="mt-3 min-h-12 w-full rounded-xl bg-white px-5 font-black text-teal-900">Следующий экзамен →</button>}
     {currentDisplay>1&&<button type="button" className="mt-3 min-h-11 w-full rounded-xl border border-white/40 px-4 font-semibold text-white" onClick={this.openPrevious}>Ранее пройденный экзамен №{currentDisplay-1}</button>}
     <button type="button" className="mt-3 min-h-11 w-full rounded-xl border border-white/40 px-4 font-semibold text-white" onClick={()=>this.setState({showResults:true})}>Мои результаты →</button>
   </section>}
   {owner&&ready&&!loading&&<Exam30KeyAdmin/>}
  </section>;
 }
}
