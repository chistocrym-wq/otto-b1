import React from 'react';
import type { ExamCandidate, ListeningTask, ReadingTask, Section } from './schema.js';
import type { Exam01Draft, ObjectiveAnswer } from './progress.js';
import { emptyDraft, readDraft, saveDraft, withAnswer, withNavigation, countCompleted, exportDraftBackup, importDraftBackup } from './progress.js';
import { SingleAudioPlayer, type PrivateAssetProvider } from './media.js';
import { saveRecording, readRecording, countSavedRecordings } from './recordings.js';
import { OptionVisual } from './OptionVisual.js';
import { T } from './labels.js';

interface Props {
  exam: ExamCandidate;
  userId: string;
  onBack:()=>void;
  privateAssetProvider: PrivateAssetProvider;
  storage?: Pick<Storage,'getItem'|'setItem'>;
  showReviewImages?: boolean;
}
interface State {
  draft: Exam01Draft;
  menu: boolean;
  summary: boolean;
  mediaError: string;
  recording: boolean;
  recorded: boolean;
  currentVoiceUrl: string;
  imageUrl: string;
  recordedCount: number|null;
  voiceStorageMessage: string;
  backupMessage: string;
  storageWarning: string;
}
const sectionLabels: Record<Section,string>={horen:'Hören',lesen:'Lesen',schreiben:'Schreiben',sprechen:'Sprechen'};
const sections:Section[]=['horen','lesen','schreiben','sprechen'];
const btn='min-h-11 rounded-xl border-2 border-slate-200 bg-white px-4 py-2 font-bold text-slate-900';
const selectedBtn='min-h-11 rounded-xl border-2 px-4 py-2 font-bold text-slate-900';
const panel='rounded-2xl border border-slate-200 bg-white p-4 sm:p-6';

export class Exam01Review extends React.Component<Props,State> {
  private audio=new SingleAudioPlayer();
  private voice:MediaRecorder|null=null;
  private voiceStream:MediaStream|null=null;
  private voiceChunks:Blob[]=[];
  private imageSource:string|null=null;
  private imageRequest=0;
  private mounted=false;
  private localVoice=new Map<string,Blob>();
  private voiceRequest=0;
  constructor(props:Props){
    super(props);
    let draft=emptyDraft(props.exam.id);
    try{draft=readDraft(props.storage??localStorage,props.userId,props.exam.id);}catch{}
    this.state={draft,menu:true,summary:false,mediaError:'',recording:false,recorded:false,currentVoiceUrl:'',imageUrl:'',recordedCount:null,voiceStorageMessage:'',backupMessage:'',storageWarning:''};
  }
  componentDidMount(){this.mounted=true;void this.refreshPrivateImage();void this.refreshVoice();void this.refreshRecordingCount();}
  componentDidUpdate(_previousProps:Props,previousState:State){
    const old=previousState.draft,now=this.state.draft;
    if(old.index!==now.index||old.section!==now.section){
      this.audio.stop();this.stopVoice();void this.refreshPrivateImage();void this.refreshVoice();
    }
  }
  componentWillUnmount(){
    this.mounted=false;this.audio.dispose();this.stopVoice();
    if(this.imageSource)URL.revokeObjectURL(this.imageSource);
    if(this.state.currentVoiceUrl)URL.revokeObjectURL(this.state.currentVoiceUrl);
    this.localVoice.clear();
  }
  private write=(draft:Exam01Draft)=>{
    let warning='';
    try{saveDraft(this.props.storage??localStorage,this.props.userId,draft);}
    catch{warning='Не удалось автоматически сохранить изменения. Скачайте копию ответов перед выходом.';}
    this.setState({draft,storageWarning:warning});
  };
  private download=(blob:Blob,name:string)=>{
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download=name;
    document.body.appendChild(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1500);
  };
  private exportBackup=()=>{
    this.download(new Blob([exportDraftBackup(this.state.draft)],{type:'application/json'}),'OTTO_${this.props.exam.id}_my_answers.json');
    this.setState({backupMessage:'Копия ответов скачана. Храните файл на своём устройстве.'});
  };
  private restoreBackup=async(file:File|undefined)=>{
    if(!file)return;
    try{
      if(file.size>200000)throw Error('Файл слишком большой');
      const restored=importDraftBackup(await file.text(),this.props.exam.id);
      this.write(restored);
      this.setState({menu:true,summary:false,backupMessage:'Ответы восстановлены из локальной копии.'});
      void this.refreshVoice();
    }catch{this.setState({backupMessage:'Не удалось восстановить копию. Оригинальные ответы не изменены.'});}
  };
  private refreshRecordingCount=async()=>{
    try{const recordedCount=await countSavedRecordings(this.props.userId,this.props.exam.id);if(this.mounted)this.setState({recordedCount});}
    catch{if(this.mounted)this.setState({recordedCount:null});}
  };
  private showSummary=()=>{this.audio.stop();void this.refreshRecordingCount();this.setState({summary:true,menu:false});};
  private changeSection=(section:Section)=>{
    this.audio.stop();
    this.write(withNavigation(this.state.draft,section,this.state.draft.indices[section]??0));
    this.setState({menu:false,summary:false,mediaError:''});
  };
  private changeIndex=(index:number)=>{
    this.audio.stop();
    this.write(withNavigation(this.state.draft,this.state.draft.section,index));
    this.setState({mediaError:''});
  };
  private setObjective=(id:string,value:ObjectiveAnswer)=>{
    const section=this.state.draft.section;
    if(section==='horen'||section==='lesen')this.write(withAnswer(this.state.draft,section,id,value));
  };
  private playAudio=async(task:ListeningTask)=>{
    try{this.setState({mediaError:''});await this.audio.play(task.audioUrl,this.props.privateAssetProvider);}
    catch{if(this.mounted)this.setState({mediaError:'Аудиозапись недоступна для локального просмотра.'});}
  };
  private activeVoiceTask():string{
    return this.state.draft.index===0?'teil1-intro':this.state.draft.index<3?'teil2-'+this.state.draft.index:'teil3-'+(this.state.draft.index-2);
  }
  private refreshVoice=async()=>{
    const request=++this.voiceRequest;
    if(this.state.currentVoiceUrl)URL.revokeObjectURL(this.state.currentVoiceUrl);
    if(this.state.draft.section!=='sprechen'){
      if(this.mounted)this.setState({currentVoiceUrl:'',recorded:false,voiceStorageMessage:''});
      return;
    }
    const id=this.activeVoiceTask();
    let blob:Blob|null=null;
    try{blob=await readRecording(this.props.userId,id,this.props.exam.id);}catch{}
    blob=blob??this.localVoice.get(id)??null;
    if(!this.mounted||request!==this.voiceRequest||this.state.draft.section!=='sprechen'||id!==this.activeVoiceTask())return;
    const url=blob?URL.createObjectURL(blob):'';
    this.setState({currentVoiceUrl:url,recorded:Boolean(blob)});
  };
  private startVoice=async()=>{
    if(this.voice)return;
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
      this.setState({mediaError:'В этом браузере запись с микрофона недоступна. Проверьте разрешения и безопасный локальный режим.'});return;
    }
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      if(!this.mounted){stream.getTracks().forEach(x=>x.stop());return;}
      const recorder=new MediaRecorder(stream);
      this.voiceStream=stream;this.voiceChunks=[];this.voice=recorder;
      const taskId=this.activeVoiceTask();
      recorder.ondataavailable=event=>{if(event.data.size)this.voiceChunks.push(event.data);};
      recorder.onerror=()=>{if(this.mounted)this.setState({mediaError:'Ошибка записи микрофона. Повторите попытку.'});};
      recorder.onstop=()=>{
        stream.getTracks().forEach(x=>x.stop());this.voiceStream=null;this.voice=null;
        const blob=new Blob(this.voiceChunks,{type:recorder.mimeType||'audio/webm'});
        this.voiceChunks=[];
        if(this.mounted)this.setState({recording:false});
        if(!blob.size){if(this.mounted)this.setState({mediaError:'Микрофон не создал запись.'});return;}
        this.localVoice.set(taskId,blob);
        void this.refreshVoice();
        void saveRecording(this.props.userId,taskId,blob,this.props.exam.id).then(()=>{
          if(!this.mounted)return;
          this.setState({voiceStorageMessage:'Запись сохранена на этом устройстве.'});
          void this.refreshRecordingCount();
        }).catch(()=>{
          if(this.mounted)this.setState({voiceStorageMessage:'Постоянное хранение записи недоступно. Скачайте аудиофайл: после обновления оно может исчезнуть.'});
        });
      };
      recorder.start();
      this.setState({recording:true,mediaError:'',voiceStorageMessage:''});
    }catch{if(this.mounted)this.setState({recording:false,mediaError:'Не удалось получить доступ к микрофону. Проверьте разрешения браузера.'});}
  };
  private stopVoice=()=>{
    if(this.voice?.state==='recording')this.voice.stop();
    this.voiceStream?.getTracks().forEach(x=>x.stop());
  };
  private downloadVoice=async()=>{
    const id=this.activeVoiceTask();
    let blob=this.localVoice.get(id)??null;
    if(!blob)try{blob=await readRecording(this.props.userId,id,this.props.exam.id);}catch{}
    if(!blob){this.setState({voiceStorageMessage:'Запись отсутствует или недоступна.'});return;}
    this.download(blob,`OTTO_${this.props.exam.id}_${id}.${blob.type.includes('ogg')?'ogg':blob.type.includes('mp4')?'m4a':blob.type.includes('wav')?'wav':'webm'}`);
  };
  private restoreVoice=async(file:File|undefined)=>{
    if(!file)return;
    if(file.size>20000000||!file.size||!(/^(audio\/|video\/)/.test(file.type)||/\.(webm|ogg|m4a|mp4|wav)$/i.test(file.name))){
      this.setState({voiceStorageMessage:'Выберите аудиофайл до 20 МБ.'});return;
    }
    const id=this.activeVoiceTask();this.localVoice.set(id,file);
    void this.refreshVoice();
    try{await saveRecording(this.props.userId,id,file,this.props.exam.id);this.setState({voiceStorageMessage:'Аудиозапись импортирована и сохранена.'});void this.refreshRecordingCount();}
    catch{this.setState({voiceStorageMessage:'Аудиозапись восстановлена временно. Сохранение на устройстве недоступно; оставьте копию файла.'});}
  };
  private refreshPrivateImage=async()=>{
    const state=this.state.draft;
    const number=state.index-3;
    const path=this.props.showReviewImages&&state.section==='sprechen'&&number>=0?this.props.exam.sprechen.teil3[number]?.imageUrl:'';
    const request=++this.imageRequest;
    if(this.imageSource){URL.revokeObjectURL(this.imageSource);this.imageSource=null;}
    if(!path){if(this.mounted)this.setState({imageUrl:''});return;}
    try{
      const blob=await this.props.privateAssetProvider(path);
      if(!this.mounted||request!==this.imageRequest)return;
      const url=URL.createObjectURL(blob);
      this.imageSource=url;this.setState({imageUrl:url});
    }catch{if(this.mounted)this.setState({imageUrl:''});}
  };
  private choice=(task:ListeningTask|ReadingTask)=>{
    const section=this.state.draft.section as 'horen'|'lesen';
    const answer=this.state.draft.objective[section][task.questionId];
    const values:ObjectiveAnswer[]=task.type==='true-false'?[true,false]:((task.options||[]).map((_,i)=>i));
    const labels=task.type==='true-false'?[T.true,T.false]:(task.options||[]);
    return <div className="mt-4 grid gap-2 sm:grid-cols-2" role="group" aria-label={T.choose}>
      {values.map((val,i)=><button type="button" key={String(val)} onClick={()=>this.setObjective(task.questionId,val)}
        className={answer===val?selectedBtn:btn} aria-pressed={answer===val}
        style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,textAlign:'center',minWidth:0,minHeight:62,...(answer===val?{borderColor:'#0ea5e9',background:'#f0f9ff'}:{})}}>
        {section==='horen'&&<OptionVisual visual={(task as ListeningTask).optionVisuals?.[i]}/>}
        <span style={{overflowWrap:'normal',wordBreak:'normal',hyphens:'none',maxWidth:'100%'}}>{labels[i]}</span>
      </button>)}
    </div>;
  };
  private objectiveView(section:'horen'|'lesen'){
    const {draft}=this.state;
    const task=(section==='horen'?this.props.exam.hoeren:this.props.exam.lesen)[draft.index];
    if(!task)return null;
    return <section className={panel}>
      <p className="text-sm font-black uppercase tracking-wider text-teal-800">Teil {task.part} - {T.question} {task.n} / 15</p>
      {section==='horen'&&<>
        <h2 className="mt-2 text-2xl font-black text-slate-900">{(task as ListeningTask).title}</h2>
        <div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" className={btn} onClick={()=>void this.playAudio(task as ListeningTask)}>{T.play}</button><button type="button" className={btn} onClick={()=>this.audio.stop()}>{T.stop}</button></div>
        <p className="mt-2 text-xs text-slate-500">{T.audioPreview}</p>
      </>}
      {section==='lesen'&&<p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-lg leading-7 text-slate-900">{(task as ReadingTask).context}</p>}
      <p className="mt-4 text-lg font-bold leading-7 text-slate-900">{task.prompt}</p>
      {this.choice(task)}
    </section>;
  }
  private schreibenView(){
    const {draft}=this.state;
    const {part1,part2}=this.props.exam.schreiben;
    if(draft.index===0)return <section className={panel}>
      <p className="text-xs font-black uppercase tracking-wider text-teal-800">Schreiben · Teil 1</p>
      <h2 className="mt-2 text-2xl font-black">{T.form}</h2>
      <p className="mt-4 whitespace-pre-wrap text-lg leading-7">{part1.scenario}</p>
      <div className="mt-5 grid gap-3">{part1.rows.map((field,i)=><label key={i} className="block text-sm font-bold text-slate-800">
        <span>{field.label}</span>
        <input className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-normal" disabled={Boolean(field.value)} value={field.value||draft.form[String(i)]||''} onChange={(ev:React.ChangeEvent<HTMLInputElement>)=>this.write({...draft,form:{...draft.form,[i]:ev.target.value}})} />
      </label>)}</div>
    </section>;
    return <section className={panel}>
      <p className="text-xs font-black uppercase tracking-wider text-teal-800">Schreiben · Teil 2</p>
      <h2 className="mt-2 text-2xl font-black">{T.letter}</h2>
      <p className="mt-4 whitespace-pre-wrap text-lg leading-7">{part2.situation}</p>
      <ul className="mt-4 list-disc space-y-1 pl-5">{part2.points.map((point,i)=><li key={i}>{point}</li>)}</ul>
      <textarea rows={8} className="mt-5 w-full rounded-xl border border-slate-300 p-3 text-lg" value={draft.letter} onChange={(ev:React.ChangeEvent<HTMLTextAreaElement>)=>this.write({...draft,letter:ev.target.value})}/>
      <p className="mt-1 text-xs text-slate-500">{part2.words}</p>
    </section>;
  }
  private sprechenView(){
    const {draft}=this.state;
    const n=draft.index;
    const cards=this.props.exam.sprechen;
    const description=n===0?'Teil 1':n<3?'Teil 2':'Teil 3';
    const key=this.activeVoiceTask();
    const line=n===0?(cards.teil1==='self-introduction'?T.selfIntroduction:cards.teil1):n<3?cards.teil2[n-1].theme+' · '+cards.teil2[n-1].keyword:'Сформулируйте вежливую просьбу по картинке на немецком языке.';
    return <section className={panel}>
      <p className="text-xs font-black uppercase tracking-wider text-teal-800">Sprechen · {description}</p>
      <h2 className="mt-3 text-2xl font-black text-slate-900">{line}</h2>
      {n>=3&&!this.props.showReviewImages&&<p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">Изображение сохранено в локальном пакете, но ожидает согласования просмотра.</p>}
      {n>=3&&this.state.imageUrl&&<img className="mt-4 max-h-[360px] w-full rounded-xl object-contain" src={this.state.imageUrl} alt="Иллюстрация для вежливой просьбы"/>}
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={()=>void (this.state.recording?this.stopVoice():this.startVoice())}>{this.state.recording?T.stop:T.record}</button>
        {this.state.currentVoiceUrl&&<audio controls src={this.state.currentVoiceUrl} aria-label={T.listenRecord}/>}
        {this.state.currentVoiceUrl&&<button type="button" className={btn} onClick={()=>void this.downloadVoice()}>Скачать свою запись</button>}
        <label className={btn}>Загрузить запись<input type="file" accept="audio/*,.webm,.ogg,.m4a,.wav" style={{display:'block',width:'100%',fontSize:12,marginTop:4}} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>void this.restoreVoice(event.target.files?.[0])}/></label>
      </div>
      <label className="mt-4 block text-sm font-bold">{T.notes}<textarea rows={4} className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-base font-normal" value={draft.speakingNotes[key]||''} onChange={(ev:React.ChangeEvent<HTMLTextAreaElement>)=>this.write({...draft,speakingNotes:{...draft.speakingNotes,[key]:ev.target.value}})}/></label>
      {this.state.voiceStorageMessage&&<p role="status" className="mt-2 rounded-xl border p-3 text-sm">{this.state.voiceStorageMessage}</p>}
      <p className="mt-2 text-xs text-slate-500">{T.ungraded}</p>
    </section>;
  }
  private summaryView(){
    const done=countCompleted(this.state.draft);
    return <section className={panel} role="status"><h2 className="text-2xl font-black">{T.summary}</h2>
      <p className="mt-3"><b>Hören:</b> отвечено {done.horen} из 15; <b>Lesen:</b> отвечено {done.lesen} из 15</p>
      <p className="mt-2"><b>Schreiben:</b> заполнено {done.form} из {this.props.exam.schreiben.part1.rows.length} полей формуляра; письмо — {done.letter?'черновик сохранён':'не заполнено'}</p>
      <p className="mt-2"><b>Sprechen:</b> заметки к {done.speakingNotes} из 5 заданий (не результат оценки)</p>
      <p className="mt-2">{this.state.recordedCount===null?'Аудиозаписи: постоянное хранение недоступно или ещё не проверено.':`Аудиозаписи: сохранено ${this.state.recordedCount} из 5 заданий.`}</p>
      <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-900">{T.ungraded}</p>
      <button type="button" className={btn+' mt-4'} onClick={()=>this.setState({summary:false,menu:true})}>{T.selection}</button>
    </section>;
  }
  render(){
    const {draft,menu,summary,mediaError}=this.state;
    const max=draft.section==='schreiben'?1:draft.section==='sprechen'?4:14;
    return <div className="mx-auto w-full max-w-4xl pb-12" data-exam-id={this.props.exam.id}>
      <header className="mb-5 flex items-center gap-3 rounded-xl p-3" style={{background:'#A7E0F9'}}><button className={btn} type="button" onClick={menu?this.props.onBack:()=>{this.audio.stop();this.setState({menu:true,summary:false})}}>{T.back}</button><div><h1 className="text-2xl font-black text-slate-950">{T.exam}</h1><p className="text-sm text-slate-600">Goethe A1 · закрытый локальный просмотр</p></div></header>
      <p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-900">{T.blocked}</p>
      {this.state.storageWarning&&<p className="mb-3 rounded-xl border p-3 text-sm" role="alert">{this.state.storageWarning}</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={this.exportBackup}>{T.backup}</button>
        <label className={btn}>{T.restore}<input type="file" accept="application/json,.json" style={{display:'block',width:'100%',fontSize:12,marginTop:4}} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>void this.restoreBackup(event.target.files?.[0])}/></label>
      </div>
      {this.state.backupMessage&&<p className="mb-4 rounded-xl border p-3 text-sm" role="status">{this.state.backupMessage}</p>}
      {menu&&!summary&&<><p className="mb-4 text-sm text-slate-600">{T.save}</p><div className="grid gap-3 sm:grid-cols-2">{sections.map(section=><button type="button" key={section} className={btn+' min-h-[80px] text-left'} onClick={()=>this.changeSection(section)}><strong>{sectionLabels[section]}</strong><span className="mt-1 block text-xs font-normal text-slate-500">Позиция: {this.state.draft.indices[section]+1} из {section==='schreiben'?2:section==='sprechen'?5:15} · без оценки</span></button>)}</div><button type="button" className={btn+' mt-4 w-full'} onClick={this.showSummary}>{T.summary}</button></>}
      {!menu&&!summary&&<>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950 p-3 text-white"><b>{sectionLabels[draft.section]}</b><span>{draft.index+1} / {max+1}</span></div>
        <p className="mb-3 text-xs text-slate-600">{T.timer}</p>
        {(draft.section==='horen'||draft.section==='lesen')?this.objectiveView(draft.section):draft.section==='schreiben'?this.schreibenView():this.sprechenView()}
        {mediaError&&<p role="alert" className="mt-3 text-red-700">{mediaError}</p>}
        <nav className="mt-5 grid grid-cols-2 gap-3"><button type="button" className={btn} onClick={()=>this.changeIndex(Math.max(0,draft.index-1))} disabled={draft.index===0}>{T.back}</button><button type="button" className={btn} onClick={()=>draft.index>=max?this.setState({menu:true}):this.changeIndex(draft.index+1)}>{draft.index>=max?T.selection:T.next}</button></nav>
        {draft.index<max&&<button type="button" className={btn+' mt-3 w-full'} onClick={()=>{this.audio.stop();this.setState({menu:true})}}>{T.selection}</button>}
      </>}
      {summary&&this.summaryView()}
    </div>;
  }
}
