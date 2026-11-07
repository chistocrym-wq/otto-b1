import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BookOpenCheck, ChevronRight, FileText, Globe2, LifeBuoy, LogOut, Play, Share2, Smartphone, Sparkles, Type, UserRound, Volume1, Volume2 } from 'lucide-react';
import { OttoScene } from '@/components/OttoScene';
import { OttoQuickTour } from '@/preview/OttoQuickTour';
import type { BottomTab } from '@/components/BottomNav';
import { LegalDocumentsModal } from '@/components/LegalDocumentsModal';
import { useTextSizePreference } from '@/hooks/useTextSizePreference';
import type { Gender, LearningMode, UserProfile } from '@/hooks/useUserProfile';
import { UI_LANGUAGES, useUiLanguage } from '@/lib/i18n';
import { notificationCapability, readReminder, requestNotifications, saveReminder, type ReminderSettings } from '@/lib/reminders';
import { canPromptInstall, isStandaloneApp, manualInstallHint, requestPwaInstall, subscribePwaInstall } from '@/lib/pwaInstall';
import { LEGAL_DOCUMENT_VERSION, type LegalDocumentId } from '@/lib/legal';
import { LEGAL_OPERATOR } from '@/lib/legalOperator';

type SpeechMode='normal'|'slow';
type OttoSpeechApi={play?:(text:string,options?:{mode?:SpeechMode})=>Promise<boolean>;setMode?:(mode:SpeechMode)=>void};
interface Props{
  onOpenSupport:()=>void;
  onOpenSupportReply:()=>void;
  onShare:()=>void|Promise<void>;
  profile:UserProfile|null;
  learningMode:LearningMode;
  onLearningModeChange:(mode:LearningMode)=>void;
  onGenderChange:(gender:Gender)=>void;
  onEditProfile:()=>void;
  onOpenAccount:()=>void;
  onLogout:()=>Promise<boolean>;
  supportUnread:number;
  previewOttoMode?:'learning'|'training';
  onPreviewOttoModeChange?:(mode:'learning'|'training')=>void;
  ottoTourUserId?:string;
  onTourNavigate:(tab:BottomTab)=>void;
}
function speechApi(){return(window as Window&{OttoSpeech?:OttoSpeechApi}).OttoSpeech}
const DAY_KEYS=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const;

export function SettingsPage({onOpenSupport,onOpenSupportReply,onShare,profile,learningMode,onLearningModeChange,onGenderChange,onEditProfile,onOpenAccount,onLogout,supportUnread,previewOttoMode,onPreviewOttoModeChange,ottoTourUserId,onTourNavigate}:Props){
  const{lang,setLanguage,t}=useUiLanguage();
  const{textSize,setTextSize}=useTextSizePreference();
  const[voiceMode,setVoiceMode]=useState<SpeechMode>(()=>{try{return localStorage.getItem('ottoSpeechModeV1')==='slow'?'slow':'normal'}catch{return'normal'}});
  const[reminder,setReminder]=useState<ReminderSettings>(readReminder);
  const[permission,setPermission]=useState(()=>notificationCapability());
  const[notice,setNotice]=useState('');
  const[installNotice,setInstallNotice]=useState('');
  const[installing,setInstalling]=useState(false);
  const[,setInstallStateVersion]=useState(0);
  const[logoutConfirm,setLogoutConfirm]=useState(false);
  const[showOttoTour,setShowOttoTour]=useState(false);
  const[logoutBusy,setLogoutBusy]=useState(false);
  const[logoutError,setLogoutError]=useState('');
  const[legalDocument,setLegalDocument]=useState<LegalDocumentId|null>(null);
  useEffect(()=>{document.documentElement.lang=lang},[lang]);
  useEffect(()=>subscribePwaInstall(()=>setInstallStateVersion(v=>v+1)),[]);
  const changeVoice=(mode:SpeechMode)=>{setVoiceMode(mode);speechApi()?.setMode?.(mode);try{localStorage.setItem('ottoSpeechModeV1',mode)}catch{}};
  const testVoice=()=>void speechApi()?.play?.('Hallo. Ich heiße Otto. Schön, dass du da bist.',{mode:voiceMode});
  const toggleDay=(day:number)=>setReminder(v=>({...v,days:v.days.includes(day)?v.days.filter(x=>x!==day):[...v.days,day].sort()}));
  const enableNotifications=async()=>{const next=await requestNotifications();setPermission(next);setNotice(next==='granted'?t('notificationSaved'):next==='unsupported'?t('notificationUnsupported'):t('notificationDenied'))};
  const commitReminder=()=>{const next={...reminder,enabled:reminder.days.length>0};saveReminder(next);setReminder(next);setNotice(t('notificationSaved'))};
  const install=async()=>{setInstalling(true);setInstallNotice('');const result=await requestPwaInstall();setInstalling(false);if(result==='already-installed'){setInstallNotice(lang==='de'?'OTTO ist bereits als App installiert.':'OTTO уже установлен на этом устройстве.');return}if(result==='accepted'){setInstallNotice(lang==='de'?'Die Installation wurde gestartet.':'Началась установка приложения.');return}if(result==='dismissed'){setInstallNotice(lang==='de'?'Die Installation wurde abgebrochen. Sie können es später erneut versuchen.':'Установка отменена. Вы сможете повторить её позже.');return}setInstallNotice(manualInstallHint(lang))};
  const installed=isStandaloneApp();
  const promptReady=canPromptInstall();
  const confirmLogout=async()=>{if(logoutBusy)return;setLogoutBusy(true);setLogoutError('');const ok=await onLogout();if(!ok){setLogoutBusy(false);setLogoutError('Не удалось выйти из аккаунта. Проверьте соединение и попробуйте ещё раз.')} };
  return <div className="otto-hub-screen otto-settings-screen animate-fade-in">
    <section className="otto-page-hero"><div><p className="otto-kicker">{t('settings')}</p><h1>OTTO A1</h1><p className="mt-1 max-w-lg text-sm text-slate-600">{lang==='de'?'Profil, Lernmodus, Sprache, Erinnerungen und Audio.':'Профиль, режим обучения, язык, напоминания и звук.'}</p></div><div className="otto-page-hero-character" aria-hidden="true"><OttoScene scene="guide" className="otto-page-hero-scene"/></div></section>

    {supportUnread>0&&<button type="button" onClick={onOpenSupportReply} className="otto-support-reply-card mb-4 flex w-full items-center gap-3 rounded-[24px] p-4 text-left sm:p-5"><span className="otto-support-reply-icon relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl"><LifeBuoy/><span className="otto-support-reply-dot"/></span><span className="min-w-0 flex-1"><span className="otto-kicker otto-support-reply-kicker block">Поддержка OTTO</span><span className="otto-support-reply-title mt-1 block text-lg font-black">{supportUnread===1?'Есть новый ответ':'Есть новые ответы'}</span><span className="otto-support-reply-copy mt-1 block text-sm leading-6">{supportUnread===1?'Откройте переписку, чтобы прочитать ответ поддержки.':`Непрочитанных ответов: ${supportUnread}. Откройте переписку.`}</span></span><ChevronRight className="otto-support-reply-arrow h-5 w-5 shrink-0"/></button>}

    {previewOttoMode&&onPreviewOttoModeChange&&<section className="mt-4 rounded-[24px] border border-teal-100 bg-teal-50/55 p-4 shadow-[0_12px_32px_rgba(15,23,42,.06)] sm:p-5">
      <div className="flex items-start gap-3"><span className="otto-setting-icon"><Sparkles/></span><div className="min-w-0 flex-1"><p className="otto-kicker">РЕЖИМ OTTO</p><h2 className="text-xl font-black text-slate-950">Как вы хотите заниматься сейчас?</h2><p className="mt-1 text-sm leading-6 text-slate-600">Режим можно менять сколько угодно. Аккаунт, результаты и существующий экзаменационный прогресс не создаются заново.</p></div></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={()=>onPreviewOttoModeChange('learning')} aria-pressed={previewOttoMode==='learning'} className={`min-h-[88px] rounded-xl border px-4 text-left ${previewOttoMode==='learning'?'border-teal-500 bg-white text-teal-950':'border-slate-200 bg-white text-slate-600'}`}><b className="block">Обучение с OTTO</b><span className="mt-1 block text-xs leading-5">Слова, произношение, предложения и подготовка к заданиям.</span></button>
        <button type="button" onClick={()=>onPreviewOttoModeChange('training')} aria-pressed={previewOttoMode==='training'} className={`min-h-[88px] rounded-xl border px-4 text-left ${previewOttoMode==='training'?'border-teal-500 bg-white text-teal-950':'border-slate-200 bg-white text-slate-600'}`}><b className="block">Тренировка перед экзаменом</b><span className="mt-1 block text-xs leading-5">Существующий тренажёр Hören / Lesen / Schreiben / Sprechen.</span></button>
      </div>
      <button type="button" onClick={()=>setShowOttoTour(true)} className="mt-3 min-h-11 w-full rounded-xl border border-teal-200 bg-white px-4 text-sm font-bold text-teal-900">Как пользоваться OTTO</button>
    </section>}

    <section className="rounded-[24px] border border-white/90 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,.08)] sm:p-5">
      <div className="flex items-start gap-3"><span className="otto-setting-icon"><UserRound/></span><div className="min-w-0 flex-1"><p className="otto-kicker">Профиль</p><h2 className="text-xl font-black text-slate-950">{profile?.name || (profile?.authStatus==='guest'?'Гостевой режим':'Профиль пользователя')}</h2><p className="mt-1 break-words text-sm leading-6 text-slate-600">{profile ? (profile.authStatus==='guest'&&!profile.contact ? 'Прогресс сохраняется на этом устройстве. Зарегистрируйтесь позже, если захотите подтвердить профиль.' : `${profile.contactType==='email'?'Email':'Telegram'}: ${profile.contact}${profile.contactVerified?' · подтверждён':profile.authStatus==='guest'?' · гостевой режим':''}`) : 'Прогресс сохранён. Профиль можно заполнить позже.'}</p></div></div>
      {profile&&<fieldset className="mt-4"><legend className="text-sm font-bold text-slate-700">Ваш пол</legend><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={()=>onGenderChange('female')} aria-pressed={profile.gender==='female'} className={`min-h-12 rounded-xl border px-4 font-bold ${profile.gender==='female'?'border-[#076CD4] bg-[#A7E0F9] text-[#092F68]':'border-slate-200 bg-white text-slate-600'}`}>Женский</button><button type="button" onClick={()=>onGenderChange('male')} aria-pressed={profile.gender==='male'} className={`min-h-12 rounded-xl border px-4 font-bold ${profile.gender==='male'?'border-[#076CD4] bg-[#A7E0F9] text-[#092F68]':'border-slate-200 bg-white text-slate-600'}`}>Мужской</button></div>{!profile.gender&&<p className="mt-2 text-xs leading-5 text-slate-500">Пол не указан — используем нейтральные формулировки.</p>}</fieldset>}
      <div className="mt-4 grid gap-2 sm:grid-cols-2"><button type="button" onClick={onEditProfile} className="min-h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-700">{profile?.authStatus==='guest'&&!profile.contact?'Зарегистрироваться':profile?'Изменить профиль':'Создать профиль'}</button><button type="button" onClick={onOpenAccount} className="min-h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-700">Мой прогресс</button>{profile?.contactType==='email'&&!profile.contactVerified&&<button type="button" onClick={onEditProfile} className="min-h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-700 sm:col-span-2">Подтвердить email</button>}</div>
      <button type="button" onClick={()=>{setLogoutError('');setLogoutConfirm(true)}} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--otto-line-strong)] bg-[var(--otto-surface)] px-4 font-bold text-[var(--otto-muted)]"><LogOut className="h-4 w-4"/>Выйти из аккаунта</button>
      {logoutError&&<p role="alert" className="mt-2 text-sm font-semibold text-[var(--otto-danger)]">{logoutError}</p>}
    </section>

    <section className="mt-4 rounded-[24px] border border-white/90 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,.08)] sm:p-5">
      <div className="flex items-start gap-3"><span className="otto-setting-icon"><FileText/></span><div className="min-w-0 flex-1"><p className="otto-kicker">Документы</p><h2 className="text-xl font-black text-slate-950">Правовая информация</h2><p className="mt-1 text-sm leading-6 text-slate-600">Версия {LEGAL_DOCUMENT_VERSION} · {LEGAL_OPERATOR.name}</p></div></div>
      <div className="mt-4 grid gap-2">
        <button type="button" onClick={()=>setLegalDocument('privacy')} className="min-h-12 rounded-xl border border-slate-200 bg-white px-4 text-left font-bold text-slate-700">Политика обработки персональных данных</button>
        <button type="button" onClick={()=>setLegalDocument('consent')} className="min-h-12 rounded-xl border border-slate-200 bg-white px-4 text-left font-bold text-slate-700">Согласие на обработку персональных данных</button>
        <button type="button" onClick={()=>setLegalDocument('agreement')} className="min-h-12 rounded-xl border border-slate-200 bg-white px-4 text-left font-bold text-slate-700">Пользовательское соглашение OTTO</button>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">Вопросы о персональных данных и удалении аккаунта: {LEGAL_OPERATOR.email}</p>
    </section>

    <section className="mt-4 rounded-[24px] border border-white/90 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,.08)] sm:p-5">
      <div className="flex items-start gap-3"><span className="otto-setting-icon"><Type/></span><div><p className="otto-kicker">Интерфейс</p><h2 className="text-xl font-black text-slate-950">Размер текста</h2></div></div>
      <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Размер текста">
        <button type="button" onClick={()=>setTextSize('small')} aria-pressed={textSize==='small'} className={`min-h-12 rounded-xl border px-3 font-bold ${textSize==='small'?'border-[#076CD4] bg-[#A7E0F9] text-[#092F68]':'border-slate-200 bg-white text-slate-600'}`}>Мелкий</button>
        <button type="button" onClick={()=>setTextSize('medium')} aria-pressed={textSize==='medium'} className={`min-h-12 rounded-xl border px-3 font-bold ${textSize==='medium'?'border-[#076CD4] bg-[#A7E0F9] text-[#092F68]':'border-slate-200 bg-white text-slate-600'}`}>Средний</button>
        <button type="button" onClick={()=>setTextSize('large')} aria-pressed={textSize==='large'} className={`min-h-12 rounded-xl border px-3 font-bold ${textSize==='large'?'border-[#076CD4] bg-[#A7E0F9] text-[#092F68]':'border-slate-200 bg-white text-slate-600'}`}>Крупный</button>
      </div>
    </section>

    <section className="mt-4 rounded-[24px] border border-white/90 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,.08)] sm:p-5">
      <div className="flex items-start gap-3"><span className="otto-setting-icon"><BookOpenCheck/></span><div><p className="otto-kicker">Обучение</p><h2 className="text-xl font-black text-slate-950">Режим помощи Отто</h2></div></div>
      <p className="mt-3 text-sm leading-6 text-slate-600">Режим можно изменить в любой момент. Результаты и прогресс сохранятся.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2"><button type="button" onClick={()=>onLearningModeChange('guided')} aria-pressed={learningMode==='guided'} className={`min-h-[76px] rounded-xl border px-4 text-left ${learningMode==='guided'?'border-[#076CD4] bg-[#A7E0F9] text-[#092F68]':'border-slate-200 bg-white text-slate-600'}`}><b className="block">Начинаю с нуля</b><span className="mt-1 block text-xs leading-5">Короткие объяснения перед новыми типами заданий.</span></button><button type="button" onClick={()=>onLearningModeChange('direct')} aria-pressed={learningMode==='direct'} className={`min-h-[76px] rounded-xl border px-4 text-left ${learningMode==='direct'?'border-[#076CD4] bg-[#A7E0F9] text-[#092F68]':'border-slate-200 bg-white text-slate-600'}`}><b className="block">Я уже немного знаю немецкий</b><span className="mt-1 block text-xs leading-5">Сразу к тренировкам без дополнительного вступления.</span></button></div>
    </section>

    <section className="mt-4 rounded-[24px] border border-white/90 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,.08)] sm:p-5">
      <div className="flex items-start gap-3"><span className="otto-setting-icon"><Globe2/></span><div><p className="otto-kicker">{t('language')}</p><h2 className="text-xl font-black text-slate-950">{lang==='de'?'Oberflächensprache':'Язык приложения'}</h2></div></div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{t('uiLanguageHint')}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">{UI_LANGUAGES.map(item=><button key={item.id} type="button" onClick={()=>setLanguage(item.id)} className={`min-h-12 rounded-xl border px-4 font-bold ${lang===item.id?'border-[#076CD4] bg-[#A7E0F9] text-[#092F68]':'border-slate-200 bg-white text-slate-600'}`} aria-pressed={lang===item.id}>{item.native}</button>)}</div>
    </section>

    <section className="mt-4 rounded-[24px] border border-white/90 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,.08)] sm:p-5">
      <div className="flex items-start gap-3"><span className="otto-setting-icon"><Bell/></span><div><p className="otto-kicker">{t('reminders')}</p><h2 className="text-xl font-black text-slate-950">{lang==='de'?'Wann soll OTTO erinnern?':'Когда напомнить о тренировке?'}</h2></div></div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{t('notificationNote')}</p>
      <div className="mt-4"><p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">{t('days')}</p><div className="grid grid-cols-7 gap-1">{DAY_KEYS.map((key,day)=><button key={key} type="button" onClick={()=>toggleDay(day)} className={`min-h-10 rounded-lg border text-xs font-black ${reminder.days.includes(day)?'border-[#076CD4] bg-[#A7E0F9] text-[#092F68]':'border-slate-200 bg-white text-slate-500'}`}>{t(key)}</button>)}</div></div>
      <label className="mt-4 block text-xs font-black uppercase tracking-wider text-slate-400">{t('time')}<input type="time" value={reminder.time} onChange={e=>setReminder(v=>({...v,time:e.target.value}))} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900"/></label>
      <div className="mt-4 grid gap-2 sm:grid-cols-2"><button type="button" onClick={enableNotifications} className="min-h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-700">{permission==='granted'?(lang==='de'?'Benachrichtigungen erlaubt':'Уведомления разрешены'):t('notificationPermission')}</button><button type="button" onClick={commitReminder} className="min-h-12 rounded-xl bg-gradient-to-br from-[#28ADF7] via-[#1289E8] to-[#076CD4] px-4 font-black text-white">{t('save')}</button></div>
      {notice&&<p role="status" className="mt-3 rounded-xl bg-[#A7E0F9] px-3 py-2 text-sm text-slate-700">{notice}</p>}
    </section>

    <section className="otto-voice-settings mt-4" aria-labelledby="otto-voice-heading"><div className="otto-voice-heading-row"><span className="otto-setting-icon"><Volume2/></span><div><p className="otto-kicker">{lang==='de'?'OTTO-Stimme':'Фирменный голос'}</p><h2 id="otto-voice-heading">{lang==='de'?'Sprechtempo':'Как говорит Отто'}</h2></div></div><p className="otto-voice-copy">{lang==='de'?'Wählen Sie normales oder etwas langsameres Deutsch.':'Выберите обычный или более медленный темп немецкой речи.'}</p><div className="otto-voice-mode" role="group"><button type="button" className={voiceMode==='normal'?'is-active':''} onClick={()=>changeVoice('normal')}><Volume2/>{lang==='de'?'Normal':'Нормально'}</button><button type="button" className={voiceMode==='slow'?'is-active':''} onClick={()=>changeVoice('slow')}><Volume1/>{lang==='de'?'Langsamer':'Медленнее'}</button></div><button type="button" className="otto-voice-test" onClick={testVoice}><Play/>{lang==='de'?'OTTO anhören':'Послушать голос Отто'}</button></section>

    <section className="mt-4 rounded-[24px] border border-white/90 bg-white p-4 sm:p-5"><div className="flex gap-3"><span className="otto-setting-icon"><Smartphone/></span><div className="min-w-0 flex-1"><h2 className="font-black text-slate-950">{t('install')}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{installed?(lang==='de'?'OTTO läuft bereits als eigenständige App.':'OTTO уже установлен и запускается как отдельное приложение.'):(lang==='de'?'Installieren Sie OTTO auf diesem Gerät und öffnen Sie es anschließend wie eine normale App.':'Установите OTTO на устройство, чтобы запускать его как обычное приложение.')}</p><button type="button" onClick={()=>void install()} disabled={installing} className="mt-3 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-700 disabled:opacity-50">{installing?(lang==='de'?'Installation…':'Установка…'):installed?(lang==='de'?'App ist installiert':'Приложение установлено'):promptReady?(lang==='de'?'App installieren':'Установить приложение'):(lang==='de'?'App installieren':'Установить приложение')}</button>{installNotice&&<p role="status" className="mt-3 rounded-xl bg-[#A7E0F9] px-3 py-2 text-sm leading-6 text-slate-700">{installNotice}</p>}</div></div></section>

    <section className="mt-4 rounded-[24px] border border-white/90 bg-white p-4 sm:p-5"><div className="flex gap-3"><span className="otto-setting-icon"><LifeBuoy/></span><div className="min-w-0 flex-1"><h2 className="font-black text-slate-950">{lang==='de'?'Support kontaktieren':'Написать в поддержку'}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{lang==='de'?'Öffnen Sie den bereits vorhandenen OTTO-Supportbereich.':'Откройте раздел поддержки OTTO.'}</p><button type="button" onClick={onOpenSupport} className="mt-3 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-700">{lang==='de'?'Support öffnen':'Написать в поддержку'}</button></div></div></section>

    <section className="mt-4 rounded-[24px] border border-white/90 bg-white p-4 sm:p-5"><div className="flex gap-3"><span className="otto-setting-icon"><Share2/></span><div className="min-w-0 flex-1"><h2 className="font-black text-slate-950">{lang==='de'?'Teilen':'Поделиться'}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{lang==='de'?'Teilen Sie OTTO über das Systemmenü Ihres Geräts.':'Поделитесь OTTO через меню вашего устройства.'}</p><button type="button" onClick={()=>void onShare()} className="mt-3 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-700">{lang==='de'?'Teilen':'Поделиться'}</button></div></div></section>

    {legalDocument&&<LegalDocumentsModal documentId={legalDocument} onClose={()=>setLegalDocument(null)}/>}
    {showOttoTour&&<OttoQuickTour userId={ottoTourUserId} onClose={()=>setShowOttoTour(false)} onNavigate={tab=>{setShowOttoTour(false);onTourNavigate(tab)}}/>}

    {logoutConfirm&&createPortal(
      <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4" role="presentation" data-otto-logout-backdrop="true">
        <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[24px] border border-[var(--otto-line)] bg-[var(--otto-surface)] p-5 shadow-[0_24px_70px_rgba(16,42,58,.22)]" role="dialog" aria-modal="true" aria-labelledby="otto-logout-title">
          <div className="flex items-start gap-3"><span className="otto-setting-icon"><LogOut/></span><div className="min-w-0 flex-1"><h2 id="otto-logout-title" className="text-xl font-black text-[var(--otto-ink)]">Выйти из аккаунта?</h2><p className="mt-2 text-sm leading-6 text-[var(--otto-muted)]">Ваш прогресс и результаты сохранятся. Вы сможете снова войти с тем же e-mail или через Telegram.</p></div></div>
          <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" disabled={logoutBusy} onClick={()=>setLogoutConfirm(false)} className="min-h-12 rounded-xl border border-[var(--otto-line)] bg-[var(--otto-surface)] px-4 font-bold text-[var(--otto-muted)] disabled:opacity-50">Отмена</button><button type="button" disabled={logoutBusy} onClick={()=>void confirmLogout()} className="min-h-12 rounded-xl border border-[var(--otto-danger)] bg-[var(--otto-danger-soft)] px-4 font-black text-[var(--otto-danger)] disabled:opacity-50">{logoutBusy?'Выходим…':'Выйти'}</button></div>
        </div>
      </div>, document.body
    )}
  </div>;
}
