import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dashboard, type Minutes } from '@/components/Dashboard';
import { BottomNav, type BottomTab } from '@/components/BottomNav';
import { GuidedModuleIntro, hasSeenGuidedModuleIntro, markGuidedModuleIntroSeen } from '@/components/GuidedModuleIntro';
import { MyErrorsPage } from '@/components/MyErrorsPage';
import { Onboarding } from '@/components/Onboarding';
import { Preview20Welcome } from '@/components/Preview20Welcome';
import { v20ClientEnabled } from '@/lib/v20ClientFeatures';
import { ProfileEditor } from '@/components/ProfileEditor';
import { OttoScene, type OttoSceneName } from '@/components/OttoScene';
import { OttoSplash } from '@/components/OttoSplash';
import { LegalGate } from '@/components/LegalGate';
import { SubscriptionPanel } from '@/components/SubscriptionPanel';
import { TrainingResumeButton } from '@/components/TrainingResumeButton';
import { FloatingOttoReferenceButtons, OttoReferenceOverlay, type OttoReferenceSection } from '@/components/OttoReferenceOverlay';
import { OttoReferenceEntryWelcome, hasSeenReferenceEntryWelcome, markReferenceEntryWelcomeSeen, clearReferenceEntryWelcomeForLogout } from '@/preview/OttoReferenceEntryWelcome';
import { OttoQuickTour, hasSeenOttoTour } from '@/preview/OttoQuickTour';
import { useProgress } from '@/hooks/useProgress';
import { useAccountAccess } from '@/hooks/useAccountAccess';
import { useLegalConsent } from '@/hooks/useLegalConsent';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getOttoProductMode } from '@/lib/productMode';
import { maybeSendReminder } from '@/lib/reminders';
import { hasModuleTaskCompletion, recordModuleTaskCompletion } from '@/lib/moduleTaskCompletion';
import { recordTaskResult } from '@/lib/taskResults';
import { clearActiveTrainingResume, readTrainingResume, saveTrainingResume, type ActiveTrainingDetail, type ActiveTrainingView, type TrainingResume } from '@/lib/trainingResume';
import { logoutSession } from '@/lib/accessClient';
import { updateStudyTime, studyTimeCleanup } from '@/lib/preview20StudyTime';
import { captureTeacherReferral } from '@/lib/preview20Referral';
import { clearLocalUserStateForLogout } from '@/lib/serverStateSync';
import { getSupportSummary, type SupportSummary } from '@/lib/supportClient';
import type { ModuleId } from '@/types';
import { LearningModePreview, PreviewModeChooser, readPreviewOttoMode, savePreviewOttoMode, type PreviewOttoMode } from '@/preview/TwoModeLearningPreview';
import './ottoDesignV2.css';import './ottoViewport.css';import './ottoSceneAssets.css';import './ottoSplash.css';import './ottoFinalPolish.css';import './ottoHomeReact.css';import './ottoUnifiedPages.css';import './ottoUnifiedPagesFix.css';import './ottoVisualSystem.css';import './ottoVisualPages.css';import './ottoUserFixes.css';import './ottoApprovedHome.css';import './ottoApprovedHomeFinal.css';import './ottoTextSafety.css';import './ottoRoadmapStages.css';import './ottoResponsivePreview.css';import './ottoReferenceEntryWelcome.css';import '@/data/lesen/registerExtraSets';

const Instructions=lazy(()=>import('@/components/Instructions').then(m=>({default:m.Instructions})));const ExamGuide=lazy(()=>import('@/components/ExamGuide').then(m=>({default:m.ExamGuide})));const MockExam=lazy(()=>import('@/components/MockExam').then(m=>({default:m.MockExam})));const ModulesHub=lazy(()=>import('@/components/ModulesHub').then(m=>({default:m.ModulesHub})));const AccountPage=lazy(()=>import('@/components/AccountPage').then(m=>({default:m.AccountPage})));const ReadinessPage=lazy(()=>import('@/components/ReadinessPage').then(m=>({default:m.ReadinessPage})));const PhraseSpeakingPractice=lazy(()=>import('@/components/PhraseSpeakingPractice').then(m=>({default:m.PhraseSpeakingPractice})));const SettingsPage=lazy(()=>import('@/components/SettingsPage').then(m=>({default:m.SettingsPage})));const NewsPage=lazy(()=>import('@/components/NewsPage').then(m=>({default:m.NewsPage})));const SupportPage=lazy(()=>import('@/components/SupportPage').then(m=>({default:m.SupportPage})));const DailyTrainingPage=lazy(()=>import('@/components/DailyTrainingPage').then(m=>({default:m.DailyTrainingPage})));const HowToTrainPage=lazy(()=>import('@/components/HowToTrainPage').then(m=>({default:m.HowToTrainPage})));const ReadingModule=lazy(()=>import('@/components/modules/ReadingModule').then(m=>({default:m.ReadingModule})));const ListeningModule=lazy(()=>import('@/components/modules/ListeningModule').then(m=>({default:m.ListeningModule})));const WritingModule=lazy(()=>import('@/components/modules/WritingModule').then(m=>({default:m.WritingModule})));const SpeakingModule=lazy(()=>import('@/components/modules/SpeakingModule').then(m=>({default:m.SpeakingModule})));

const Preview13OwnerExams=lazy(()=>import('@/features/mockExams30/Exam01Route').then(m=>({default:m.Exam01Route})));
type View=ModuleId|'instructions'|'exam-guide'|'mock-exam'|'modules'|'readiness'|'phrases-speaking'|'account'|'settings'|'news'|'support'|'daily-training'|'how-to-train'|'errors'|'reference'|null;
const moduleIds:ModuleId[]=['lesen','horen','schreiben','sprechen'];

export default function App(){
 const productMode=getOttoProductMode();
 const[view,setView]=useState<View>(null);
  const isPreview20 = v20ClientEnabled('welcome');
  // Welcome and guest access have independent Production flags.
  const guestEntryEnabled = v20ClientEnabled('guest');
  useEffect(()=>{if(isPreview20)void captureTeacherReferral();},[isPreview20]);
  const [guestConfirm,setGuestConfirm]=useState(false);
  const [guestError,setGuestError]=useState('');
  const [guestBusy,setGuestBusy]=useState(false);
  const registeringGuest=new URLSearchParams(window.location.search).has('register');
  const startGuest=async()=>{
    setGuestBusy(true);setGuestError('');
    try{
      const r=await fetch('/api/preview20-guest',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:'{}'});
      if(!r.ok)throw Error('guest_unavailable');
      window.location.reload();
    }catch{setGuestError('Гостевой вход сейчас недоступен. Попробуйте снова.');}
    finally{setGuestBusy(false);}
  };
  const [welcomeSeen,setWelcomeSeen] = useState(() => {
    try { return localStorage.getItem('otto-preview20-story-seen-v1') === '1'; } catch { return false; }
  });
  const [welcomeExistingLogin,setWelcomeExistingLogin] = useState(false);
  const finishWelcome = (existing: boolean) => {
    try { localStorage.setItem('otto-preview20-story-seen-v1','1'); } catch { /* restricted browsers */ }
    setWelcomeExistingLogin(existing);
    setWelcomeSeen(true);
  };
 const[,refreshTaskResults]=useState(0);
 useEffect(()=>{const refresh=()=>refreshTaskResults(n=>n+1);window.addEventListener('otto:task-results-changed',refresh);return()=>window.removeEventListener('otto:task-results-changed',refresh)},[]);
 const[dailyMinutes,setDailyMinutes]=useState<Minutes>(()=>{const resume=readTrainingResume();if(resume.activeTrainingView==='daily-training'&&resume.dailyTrainingMinutes)return resume.dailyTrainingMinutes;const s=Number(localStorage.getItem('otto-a1-session-minutes'));return s===5||s===15||s===30?s:15});
 const[trainingResume,setTrainingResume]=useState<TrainingResume>(readTrainingResume);
 const[actionNotice,setActionNotice]=useState<string|null>(null);
 const[pendingModule,setPendingModule]=useState<ModuleId|null>(null);
 const[profileEditorOpen,setProfileEditorOpen]=useState(false);
 const[supportUnread,setSupportUnread]=useState(0);
 const[supportLatestTicketId,setSupportLatestTicketId]=useState<string|null>(null);
 const[supportInitialTicketId,setSupportInitialTicketId]=useState<string|null>(null);
 const[previewOttoMode,setPreviewOttoMode]=useState<PreviewOttoMode|null>(null);
 const[previewModeLoaded,setPreviewModeLoaded]=useState(false);
 const[referenceEntryContinued,setReferenceEntryContinued]=useState(false);
 // The first-run tour writes localStorage; closing must also trigger a React render.
 const[tourDismissedUserId,setTourDismissedUserId]=useState<string|null>(null);
 const[referenceOverlayOpen,setReferenceOverlayOpen]=useState(false);
 const[referenceOverlayView,setReferenceOverlayView]=useState<'reference'|'smartcards'>('reference');
 const moduleStartedAt=useRef(Date.now());
 const{access:accountAccess,ready:accessReady,refresh:refreshAccess,remainingMs:trialRemainingMs,checkStatus:accessCheckStatus,connectionInterrupted}=useAccountAccess();
 const{progress,activity,recordScore,ready:progressReady}=useProgress(accountAccess.authenticated?accountAccess.userId:undefined);
 const{profile,completed,legacyUser,learningMode,ready:profileReady,authenticated:profileSessionAuthenticated,loadFailed:profileLoadFailed,saveProfile,profileSaveError,setGender,setLearningMode}=useUserProfile();
 useEffect(()=>{
   if(!accessReady)return;
   setPreviewOttoMode(readPreviewOttoMode(accountAccess.userId));
   setPreviewModeLoaded(true);
 },[accessReady,accountAccess.userId]);
 const choosePreviewOttoMode=useCallback((mode:PreviewOttoMode)=>{
   savePreviewOttoMode(mode,accountAccess.userId);
   setPreviewOttoMode(mode);
   setView(null);
   setPendingModule(null);
 },[accountAccess.userId]);
 const legalConsent=useLegalConsent(accountAccess.authenticated);
 const studyModule = accountAccess.authenticated && accountAccess.hasTrainingAccess && completed && previewModeLoaded
   ? previewOttoMode==='learning' ? 'otto' as const
   : view==='schreiben'||view==='lesen'||view==='horen'||view==='sprechen' ? view
   : view==='errors' ? 'review' as const
   : view==='phrases-speaking'||view==='daily-training' ? 'practice' as const : null : null;
 useEffect(()=>{
   updateStudyTime(accountAccess.authenticated?accountAccess.userId:undefined,studyModule);
   return ()=>studyTimeCleanup();
 },[accountAccess.authenticated,accountAccess.userId,studyModule]);
 const back=useCallback(()=>setView(null),[]);
 const openSupport=useCallback(()=>{setSupportInitialTicketId(null);setView('support')},[]);
 const openSupportReply=useCallback(()=>{setSupportInitialTicketId(supportLatestTicketId);setView('support')},[supportLatestTicketId]);
 const updateTrainingResume=useCallback((patch:Partial<TrainingResume>)=>{saveTrainingResume(patch);setTrainingResume(readTrainingResume())},[]);
 const activateTraining=useCallback((activeTrainingView:ActiveTrainingView,activeTrainingDetail:ActiveTrainingDetail|null=null,dailyTrainingMinutes:Minutes|null=null)=>{updateTrainingResume({activeTrainingView,activeTrainingDetail,dailyTrainingMinutes:activeTrainingView==='daily-training'?dailyTrainingMinutes:null})},[updateTrainingResume]);
 const finishTraining=useCallback(()=>{clearActiveTrainingResume();setTrainingResume(readTrainingResume())},[]);
 const enterModule=useCallback((module:ModuleId)=>{moduleStartedAt.current=Date.now();activateTraining(module);setView(module)},[activateTraining]);
 const openRealSchreibenFromLearning=useCallback(()=>{
   savePreviewOttoMode('training',accountAccess.userId);
   setPreviewOttoMode('training');
   setPendingModule(null);
   setProfileEditorOpen(false);
   enterModule('schreiben');
 },[accountAccess.userId,enterModule]);
 const openRealModuleFromLearning=useCallback((module:'lesen'|'horen'|'sprechen')=>{
   savePreviewOttoMode('training',accountAccess.userId);
   setPreviewOttoMode('training');
   setPendingModule(null);
   setProfileEditorOpen(false);
   enterModule(module);
 },[accountAccess.userId,enterModule]);
 const openModule=useCallback((module:ModuleId)=>{
   if(learningMode==='guided'&&!hasSeenGuidedModuleIntro(module)){setPendingModule(module);return}
   enterModule(module)
 },[enterModule,learningMode]);
 const openDailyTraining=useCallback((minutes:Minutes)=>{setDailyMinutes(minutes);activateTraining('daily-training',null,minutes);setView('daily-training')},[activateTraining]);
 const openPhraseTraining=useCallback(()=>{activateTraining('phrases-speaking');setView('phrases-speaking')},[activateTraining]);
 const updateTrainingDetail=useCallback((activeTrainingView:ActiveTrainingView,activeTrainingDetail:ActiveTrainingDetail|null)=>{activateTraining(activeTrainingView,activeTrainingDetail,activeTrainingView==='daily-training'?dailyMinutes:null)},[activateTraining,dailyMinutes]);
 const returnToTraining=useCallback(()=>{const resume=readTrainingResume();if(!resume.activeTrainingView)return;setTrainingResume(resume);setPendingModule(null);setProfileEditorOpen(false);if(resume.activeTrainingView==='daily-training'&&resume.dailyTrainingMinutes)setDailyMinutes(resume.dailyTrainingMinutes);moduleStartedAt.current=Date.now();setView(resume.activeTrainingView)},[]);
 useEffect(()=>{const t=window.Telegram?.WebApp;if(t){t.ready();t.expand()}},[]);
 useEffect(()=>{if(completed)void refreshAccess()},[completed,refreshAccess]);
 useEffect(()=>{void maybeSendReminder();const id=window.setInterval(()=>void maybeSendReminder(),30000);const onFocus=()=>void maybeSendReminder();window.addEventListener('focus',onFocus);return()=>{window.clearInterval(id);window.removeEventListener('focus',onFocus)}},[]);
 useEffect(()=>{if(view&&(moduleIds.includes(view as ModuleId)||view==='phrases-speaking'))moduleStartedAt.current=Date.now()},[view]);
 useEffect(()=>{const b=window.Telegram?.WebApp.BackButton;if(!b)return;if(view===null){b.hide();return}b.show();b.onClick(back);return()=>{b.offClick(back)}},[back,view]);
 useEffect(()=>{if(!actionNotice)return;const id=window.setTimeout(()=>setActionNotice(null),2600);return()=>window.clearTimeout(id)},[actionNotice]);
 const logout=useCallback(async()=>{const ok=await logoutSession();if(!ok)return false;clearReferenceEntryWelcomeForLogout(accountAccess.userId);clearLocalUserStateForLogout();window.location.reload();return true},[accountAccess.userId]);
 const applySupportSummary=useCallback((summary:SupportSummary)=>{setSupportUnread(summary.unreadCount);setSupportLatestTicketId(summary.latestTicketId)},[]);
 const refreshSupportUnread=useCallback(async()=>{
   if(!accountAccess.authenticated){setSupportUnread(0);setSupportLatestTicketId(null);return}
   try{applySupportSummary(await getSupportSummary())}catch{}
 },[accountAccess.authenticated,applySupportSummary]);
 useEffect(()=>{if(!accountAccess.authenticated)return;void refreshSupportUnread();const id=window.setInterval(()=>void refreshSupportUnread(),60000);const onFocus=()=>void refreshSupportUnread();const onVisibility=()=>{if(document.visibilityState==='visible')void refreshSupportUnread()};window.addEventListener('focus',onFocus);document.addEventListener('visibilitychange',onVisibility);return()=>{window.clearInterval(id);window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onVisibility)}},[accountAccess.authenticated,refreshSupportUnread]);
 useEffect(()=>{if(accountAccess.authenticated&&(view==='settings'||view==='support'))void refreshSupportUnread()},[accountAccess.authenticated,view,refreshSupportUnread]);
 const shareApp=useCallback(async()=>{const url=window.location.href.split('?')[0];const data={title:'OTTO — Zertifikat A1',text:'OTTO A1 — тренажёр для подготовки к экзамену',url};try{if(navigator.share){await navigator.share(data);return}if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);setActionNotice('Ссылка скопирована');return}window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(data.text)}`,'_blank','noopener,noreferrer')}catch(error){if(error instanceof DOMException&&error.name==='AbortError')return;setActionNotice('Не удалось открыть меню «Поделиться». Попробуйте ещё раз.')}},[]);
 const complete=(module:ModuleId)=>(score:number,total:number,taskId?:string)=>{
  const elapsed=Math.max(0,(Date.now()-moduleStartedAt.current)/1000);
  if(taskId){
    const already=hasModuleTaskCompletion(module,taskId);
    recordTaskResult(module,taskId,score,total);
    if(!already){recordScore(module,score,total,elapsed);recordModuleTaskCompletion(module,taskId)}
  }else recordScore(module,score,total,elapsed);
  moduleStartedAt.current=Date.now();
 };
 const recordMockModule=useCallback((_module:ModuleId,_percent:number)=>{ /* Exam attempts are recorded separately by saveMockAttempt. */ },[]);
 const viewClass=`otto-view-${view??'home'}`;
 const referenceShortcutsInScroll=view==='mock-exam'||view==='horen'||view==='lesen';
 const activeTab=useMemo<BottomTab>(()=>{
   if(productMode==='basic'){
     if(view==='modules'||(view!==null&&moduleIds.includes(view as ModuleId)))return'modules';
     if(view==='account')return'account';
     if(view==='settings'||view==='support')return'settings';
     return'home';
   }
   if(view==='mock-exam')return'mock-exam';if(view==='errors')return'errors';if(view==='news')return'news';if(view==='reference'||view==='instructions'||view==='exam-guide'||view==='how-to-train'||view==='account')return'reference';if(view==='settings'||view==='support')return'settings';return'home'
 },[productMode,view]);
 const companionScene=useMemo<OttoSceneName|null>(()=>{if(view==='lesen')return'lesen';if(view==='horen')return'horen';if(view==='schreiben')return'schreiben';if(view==='sprechen'||view==='phrases-speaking'||view==='instructions'||view==='exam-guide'||view==='how-to-train'||view==='reference')return'guide';if(view==='mock-exam')return'exam';if(view==='readiness'||view==='news'||view==='daily-training'||view==='errors')return'home';return null},[view]);
 const navigateBottom=useCallback((tab:BottomTab)=>{if(tab==='home')setView(null);if(tab==='modules')setView('modules');if(tab==='account')setView('account');if(tab==='mock-exam')setView('mock-exam');if(tab==='errors')setView('errors');if(tab==='reference'){setReferenceOverlayView('reference');setReferenceOverlayOpen(true)}if(tab==='news')setView('news');if(tab==='learning')choosePreviewOttoMode('learning');if(tab==='settings')setView('settings')},[choosePreviewOttoMode]);
 const navigateFromTour=(tab:BottomTab)=>{if(tab!=='learning')choosePreviewOttoMode('training');navigateBottom(tab)};
 const showTrainingResumeButton=Boolean(view!==null&&trainingResume.activeTrainingView&&!pendingModule&&view!==trainingResume.activeTrainingView);
 const referenceInitialSection=useMemo<OttoReferenceSection>(()=>{
   if(view==='sprechen'){
     if(trainingResume.activeTrainingDetail==='sprechen-teil3')return'oral_requests';
     if(trainingResume.activeTrainingDetail==='sprechen-teil2')return'oral_questions';
     if(trainingResume.activeTrainingDetail==='sprechen-teil1')return'oral_teil1';
     return'oral_exam';
   }
   if(view==='schreiben'){
     if(trainingResume.activeTrainingDetail==='schreiben-teil1')return'written_schreiben_1';
     if(trainingResume.activeTrainingDetail==='schreiben-guided'||trainingResume.activeTrainingDetail==='schreiben-coach'||trainingResume.activeTrainingDetail==='schreiben-solo')return'written_schreiben_2';
     return'written_exam';
   }
   return'reference_home';
 },[trainingResume.activeTrainingDetail,view]);
 const referenceReturnState=useMemo(()=>[
   'training',
   view??'home',
   trainingResume.activeTrainingView??'none',
   trainingResume.activeTrainingDetail??'none',
 ].join(':'),[trainingResume.activeTrainingDetail,trainingResume.activeTrainingView,view]);
 if(!profileReady||!progressReady||!accessReady){return <OttoSplash/>}
 if(accessCheckStatus==='failed'){return <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-[var(--otto-bg)] p-6 text-center text-[var(--otto-ink)]"><h1 className="text-2xl font-bold">Не удалось проверить доступ. Попробовать снова.</h1><button type="button" onClick={()=>void refreshAccess()} className="min-h-12 rounded-xl border border-teal-300 bg-white px-6 font-bold">Попробовать снова</button></div>}
 if(accessCheckStatus==='loading'){return <OttoSplash/>}
 if(profileLoadFailed){return <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-[var(--otto-bg)] p-6 text-center text-[var(--otto-ink)]"><h1 className="text-2xl font-bold">Не удалось загрузить профиль. Проверьте соединение.</h1><button type="button" onClick={()=>window.location.reload()} className="min-h-12 rounded-xl border border-teal-300 bg-white px-6 font-bold">Попробовать снова</button></div>}
 if(!accountAccess.authenticated&&(!accountAccess.guest||registeringGuest)){
    if(isPreview20&&!welcomeSeen&&!registeringGuest)return <Preview20Welcome onContinue={()=>finishWelcome(false)} onExisting={()=>finishWelcome(true)}/>;
    if(guestConfirm)return <main className="flex min-h-dvh items-center justify-center bg-[#f7f1e8] p-4"><section className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"><h1 className="text-2xl font-bold">Попробовать без регистрации?</h1><p className="mt-4 leading-7">Без регистрации прогресс, ошибки и история не сохраняются. Пробный доступ длится 72 часа с первого гостевого входа. При последующей регистрации время не начинается заново.</p>{guestError&&<p role="alert" className="text-red-700">{guestError}</p>}<button onClick={()=>void startGuest()} disabled={guestBusy} className="mt-5 min-h-12 w-full rounded-xl bg-[#176554] px-4 font-bold text-white">{guestBusy?'Открываем…':'Понятно, войти гостем'}</button><button onClick={()=>setGuestConfirm(false)} className="mt-2 min-h-12 w-full rounded-xl border border-[#176554]">Назад</button></section></main>;
    return <Onboarding onComplete={saveProfile} saveError={profileSaveError} authenticatedSession={false} initialStep={welcomeExistingLogin?'login':undefined} onGuest={guestEntryEnabled&&!registeringGuest?()=>setGuestConfirm(true):undefined}/>;
  }
const guestUserId=accountAccess.guest?'preview20-guest-local':undefined;
  const needsOnboarding=!accountAccess.guest&&!completed&&!legacyUser;
 if(needsOnboarding){return <Onboarding onComplete={saveProfile} saveError={profileSaveError} initialProfile={profile} authenticatedSession={accountAccess.authenticated && profileSessionAuthenticated}/>} 
 if(accountAccess.authenticated&&!legalConsent.ready){return <OttoSplash/>}
 if(accountAccess.authenticated&&!legalConsent.accepted){return <LegalGate onAccept={legalConsent.accept} error={legalConsent.error}/>}

 if(profileEditorOpen&&profile){return <ProfileEditor profile={profile} onCancel={()=>setProfileEditorOpen(false)} onSave={async draft=>{if(await saveProfile(draft)){setProfileEditorOpen(false);void refreshAccess()}}}/>}
 if(accountAccess.guest&&!accountAccess.hasTrainingAccess){return <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6 text-center"><h1 className="text-2xl font-bold">Гостевой пробный доступ завершён</h1><p>Срок 72 часа истёк. Регистрация не продлевает бесплатный доступ.</p><button onClick={()=>window.location.assign('/?register=1')} className="min-h-12 rounded-xl bg-[#176554] px-4 text-white">Зарегистрироваться</button></main>;}
  if(accountAccess.authenticated&&!accountAccess.hasTrainingAccess){return <SubscriptionPanel trialEndsAt={accountAccess.trialEndsAt} onEditProfile={()=>setProfileEditorOpen(true)} onLogout={()=>void logout()}/>}
 if(!previewModeLoaded){return <OttoSplash/>}
 if(!previewOttoMode){
   if(!hasSeenOttoTour(accountAccess.userId??guestUserId)&&tourDismissedUserId!==(accountAccess.userId??guestUserId))return <OttoQuickTour userId={accountAccess.userId??guestUserId} onClose={()=>{setReferenceEntryContinued(false);setTourDismissedUserId(accountAccess.userId??guestUserId??null)}} onNavigate={navigateFromTour} supportUnread={supportUnread>0}/>;
   return <PreviewModeChooser onChoose={choosePreviewOttoMode}/>;
 }
 if(previewOttoMode==='learning'&&!referenceEntryContinued&&!hasSeenReferenceEntryWelcome(accountAccess.userId)){
   const finishReference=()=>{markReferenceEntryWelcomeSeen(accountAccess.userId);setReferenceEntryContinued(true)};
   return <OttoReferenceEntryWelcome
     onReference={()=>{try{window.sessionStorage.setItem('otto-preview-reference-route:'+accountAccess.userId,'reference')}catch{}finishReference()}}
     onLater={()=>{try{window.sessionStorage.setItem('otto-preview-reference-route:'+accountAccess.userId,'hub')}catch{}finishReference()}}
   />;
 }
 const connectionNotice=connectionInterrupted&&accessCheckStatus==='granted'?<div role="status" className="fixed bottom-24 left-1/2 z-[205] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-amber-200 bg-white/95 px-4 py-3 text-center text-sm font-semibold text-amber-900 shadow-lg">Нет соединения с сервером. Ответы сохраняются на устройстве; проверка доступа повторится.</div>:null;
 if(previewOttoMode==='learning'){return <>{connectionNotice}<LearningModePreview userId={accountAccess.userId??guestUserId} onSwitchToTraining={()=>choosePreviewOttoMode('training')} onOpenRealSchreiben={openRealSchreibenFromLearning} onOpenRealModule={openRealModuleFromLearning} onTourNavigate={navigateFromTour} bottomNav={openStudyBase=><BottomNav active="learning" mode="full" supportUnread={supportUnread>0} onNavigate={tab=>{if(tab==='learning'){openStudyBase();return;}choosePreviewOttoMode('training');if(tab==='mock-exam')setView('mock-exam');else if(tab==='errors')setView('errors');else if(tab==='settings')setView('settings');else setView(null)}}/>}/></>} 
 return <>{connectionNotice}<OttoSplash/><div className={`telegram-app otto-skin otto-app-shell ${viewClass}`}><div className="otto-backdrop" aria-hidden="true"><div className="otto-glow otto-glow-a"/><div className="otto-glow otto-glow-b"/><div className="otto-line-art"/></div><main className="otto-app-content relative z-10 mx-auto max-w-4xl"><div className={view===null?'otto-home-screen':'otto-inner-screen'}>
 {referenceShortcutsInScroll&&!referenceOverlayOpen&&<div className="otto-reference-workarea-dock"><FloatingOttoReferenceButtons onReference={()=>{setReferenceOverlayView('reference');setReferenceOverlayOpen(true)}} onSmartCards={()=>{setReferenceOverlayView('smartcards');setReferenceOverlayOpen(true)}}/></div>}
 {showTrainingResumeButton&&<TrainingResumeButton onClick={returnToTraining}/>} 
 {pendingModule&&<GuidedModuleIntro module={pendingModule} onBack={()=>setPendingModule(null)} onContinue={()=>{const module=pendingModule;markGuidedModuleIntroSeen(module);setPendingModule(null);enterModule(module)}}/>}
 {!pendingModule&&view===null&&productMode==='full'&&<Dashboard onSelectModule={openModule} onOpenInstructions={()=>setView('instructions')} onOpenExamGuide={()=>setView('exam-guide')} onOpenMockExam={()=>setView('mock-exam')} onOpenNews={()=>setView('news')} onOpenAccount={()=>setView('account')} onOpenSettings={()=>setView('settings')} onOpenReadiness={()=>setView('readiness')} onShare={shareApp} onOpenSupport={openSupport} onOpenDailyTraining={openDailyTraining} onOpenHowTo={()=>setView('how-to-train')} progress={progress} activity={activity} trialRemainingMs={(accountAccess.authenticated||accountAccess.guest)&&accountAccess.trialActive?trialRemainingMs:0} canPurchaseAccess={accountAccess.authenticated&&accountAccess.trialActive&&!accountAccess.subscriptionActive} subscriptionActive={accountAccess.subscriptionActive} subscriptionUntil={accountAccess.subscriptionUntil} guest={accountAccess.guest} onRegister={()=>window.location.assign('/?register=1')}/>}<Suspense fallback={<div className="otto-route-loading" aria-hidden="true"/>}>{!pendingModule&&view===null&&productMode==='basic'&&<ModulesHub progress={progress} onSelectModule={openModule}/>} {!pendingModule&&view==='modules'&&<ModulesHub progress={progress} onSelectModule={openModule}/>} {!pendingModule&&view==='daily-training'&&productMode==='full'&&<DailyTrainingPage minutes={dailyMinutes} progress={progress} onBack={back} onSelectModule={openModule}/>} {!pendingModule&&view==='how-to-train'&&productMode==='full'&&<HowToTrainPage onBack={back}/>} {!pendingModule&&view==='readiness'&&productMode==='full'&&<ReadinessPage progress={progress} activity={activity} onBack={back} onSelectModule={openModule} onOpenMockExam={()=>setView('mock-exam')} onOpenPhrases={openPhraseTraining}/>} {!pendingModule&&view==='phrases-speaking'&&productMode==='full'&&<PhraseSpeakingPractice onBack={()=>setView('readiness')} onOpenWriting={()=>openModule('schreiben')} onComplete={complete('sprechen')}/>} {!pendingModule&&view==='account'&&<AccountPage progress={progress} activity={activity}/>} {!pendingModule&&view==='settings'&&<SettingsPage profile={profile} learningMode={learningMode} onLearningModeChange={setLearningMode} onGenderChange={setGender} onEditProfile={()=>setProfileEditorOpen(true)} onOpenAccount={()=>setView('account')} onOpenSupport={openSupport} onOpenSupportReply={openSupportReply} onShare={shareApp} onLogout={logout} supportUnread={supportUnread} previewOttoMode={previewOttoMode} onPreviewOttoModeChange={choosePreviewOttoMode} ottoTourUserId={accountAccess.userId} onTourNavigate={navigateFromTour}/>} {!pendingModule&&view==='news'&&<NewsPage onBack={back}/>} {!pendingModule&&view==='support'&&<SupportPage onBack={()=>{setSupportInitialTicketId(null);back()}} initialTicketId={supportInitialTicketId} onSummaryChange={applySupportSummary}/>} {!pendingModule&&view==='instructions'&&<Instructions onBack={back}/>} {!pendingModule&&view==='exam-guide'&&<ExamGuide onBack={back}/>} {!pendingModule&&view==='mock-exam'&&<Preview13OwnerExams guest={accountAccess.guest===true} userId={accountAccess.userId??guestUserId} onBack={back} renderOriginal={(timerEnabled,displayNumber,onOriginalBack)=><MockExam userId={accountAccess.userId??guestUserId} onBack={onOriginalBack??back} onRecordModule={recordMockModule} timerEnabled={timerEnabled} displayNumber={displayNumber}/>}/>} {!pendingModule&&view==='errors'&&<MyErrorsPage userId={accountAccess.userId??guestUserId} progress={progress} activity={activity} onSelectModule={openModule}/>} {!pendingModule&&view==='lesen'&&<ReadingModule guest={accountAccess.guest===true} userId={accountAccess.userId??guestUserId} onBack={back} onComplete={complete('lesen')} initialPart={trainingResume.activeTrainingView==='lesen'?(trainingResume.activeTrainingDetail==='lesen-teil1'?1:trainingResume.activeTrainingDetail==='lesen-teil2'?2:trainingResume.activeTrainingDetail==='lesen-teil3'?3:null):null} onTrainingRouteChange={detail=>updateTrainingDetail('lesen',detail)} onTrainingComplete={finishTraining}/>} {!pendingModule&&view==='horen'&&<ListeningModule guest={accountAccess.guest===true} userId={accountAccess.userId??guestUserId} onBack={back} onComplete={complete('horen')} initialTeil={trainingResume.activeTrainingView==='horen'?(trainingResume.activeTrainingDetail==='horen-teil1'?1:trainingResume.activeTrainingDetail==='horen-teil2'?2:trainingResume.activeTrainingDetail==='horen-teil3'?3:null):null} onTrainingRouteChange={detail=>updateTrainingDetail('horen',detail)}/>} {!pendingModule&&view==='schreiben'&&<WritingModule guest={accountAccess.guest===true} key={accountAccess.userId??'unverified-account'} userId={accountAccess.authenticated?accountAccess.userId:guestUserId} onBack={back} onComplete={complete('schreiben')} initialScreen={trainingResume.activeTrainingView==='schreiben'?(trainingResume.activeTrainingDetail==='schreiben-teil1'?'list1':trainingResume.activeTrainingDetail==='schreiben-teil2'?'list2':trainingResume.activeTrainingDetail==='schreiben-guided'?'guided':trainingResume.activeTrainingDetail==='schreiben-coach'?'coach':trainingResume.activeTrainingDetail==='schreiben-solo'?'solo':null):null} onTrainingRouteChange={detail=>updateTrainingDetail('schreiben',detail)} onTrainingComplete={finishTraining}/>} {!pendingModule&&view==='sprechen'&&<SpeakingModule guest={accountAccess.guest===true} userId={accountAccess.userId??guestUserId} onBack={back} onComplete={complete('sprechen')} initialScreen={trainingResume.activeTrainingView==='sprechen'?(trainingResume.activeTrainingDetail==='sprechen-teil1'?'teil1':trainingResume.activeTrainingDetail==='sprechen-teil2'?'teil2':trainingResume.activeTrainingDetail==='sprechen-teil3'?'teil3':trainingResume.activeTrainingDetail==='sprechen-free'?'free':trainingResume.activeTrainingDetail==='sprechen-extra'?'extra':null):null} onTrainingRouteChange={detail=>updateTrainingDetail('sprechen',detail)} onTrainingComplete={finishTraining}/>}</Suspense>
 </div></main>{!pendingModule&&companionScene&&<div className={`otto-companion otto-companion-${companionScene}`} aria-hidden="true"><OttoScene scene={companionScene} className="otto-companion-scene"/></div>}{actionNotice&&<div className="otto-action-toast" role="status">{actionNotice}</div>}
 {!referenceShortcutsInScroll&&!referenceOverlayOpen&&<FloatingOttoReferenceButtons onReference={()=>{setReferenceOverlayView('reference');setReferenceOverlayOpen(true)}} onSmartCards={()=>{setReferenceOverlayView('smartcards');setReferenceOverlayOpen(true)}}/>}
 <OttoReferenceOverlay open={referenceOverlayOpen} initialView={referenceOverlayView} initialSection={referenceInitialSection} returnState={referenceReturnState} onClose={()=>setReferenceOverlayOpen(false)}/>
 <BottomNav active={activeTab} onNavigate={navigateBottom} mode={productMode} supportUnread={supportUnread>0}/></div></>;
}
