// Shared, allowlisted diagnostics contract. Never pass form values or request bodies.
export const PREVIEW_HOST = 'deploy-preview-20--otto-a1.netlify.app';
export const CONSENT_VERSION = 'preview20-journey-v2';
export const DETAIL_WINDOW_MS = 5 * 60 * 1000;
export const withinDetailWindow = (startedAt, now = Date.now()) => Number.isFinite(startedAt) && now - startedAt < DETAIL_WINDOW_MS;
export const SCOPES = {
  LegalGate:'Согласие и документы',
  SubscriptionPanel:'Доступ и подписка',
  App:'Главный экран',
  Onboarding:'Регистрация / вход',
  LearningModePreview:'Обучение с OTTO',
  PreviewModeChooser:'Выбор режима',
  OttoQuickTour:'Знакомство с OTTO',
  OttoReferenceEntryWelcome:'Знакомство со справочником',
  OttoReferenceOverlay:'Справочник',
  OttoReferenceOnboarding:'База для начинающих',
  HoerenLearningStage:'Hören · обучение',
  DetailedHoeren:'Hören · подробный пример',
  PracticeHoeren:'Hören · учебная практика',
  LesenLearningStage:'Lesen · обучение',
  SprechenLearningStage:'Sprechen · обучение',
  SchreibenLearningStage:'Schreiben · обучение',
  FormularLearningStage:'Schreiben · формуляр',
  ReadingModule:'Lesen · тренажёр',
  ListeningModule:'Hören · тренажёр',
  WritingModule:'Schreiben · тренажёр',
  SpeakingModule:'Sprechen · тренажёр',
};
export const AREAS = ['app','registration','learning','reference','practice'];
export const KINDS = ['page_ready','screen','section','action','blocked','interaction','time','operation','visibility','connection','feedback','session_confirmed','client_limit'];
export const OPS = ['otp_request','otp_verify','session','profile','access','state','progress','tts','speech_check','writing_check','frontend','audio','microphone'];
export const ACTIONS = ['continue','back','start','check','audio','login','register','request_code','resend_code','choose','other'];
export const OUTCOMES = ['start','ok','rejected','network','slow','unconfirmed','hidden','visible','offline','online','normal_unauthenticated'];
export const FEEDBACK = {
  busy:'Пока не было времени',
  login:'Не получается войти',
  code:'Не приходит код',
  unclear:'Не понимаю следующий шаг',
  technical:'Что-то не работает',
  difficult:'Слишком сложно',
  expected_other:'Ожидал(а) другое',
  other:'Другая причина',
  fine:'Всё получилось',
};
export const CODES = [
 'invalid_code','expired','used','too_many_attempts','identity_conflict','email_registered',
 'legal_consent_required','account_not_found','telegram_unavailable','telegram_not_linked',
 'telegram_auth_invalid','session_network_error','access_denied','not_authenticated',
 'profile_save_failed','state_load_failed','state_save_failed','network_error','timeout',
 'js_error','resource_error','audio_network','audio_decode','audio_unsupported','audio_aborted',
 'NotAllowedError','NotFoundError','NotReadableError','AbortError','SecurityError','TypeError','unknown',
 'required_fields','contact_unverified','consent_required','invalid_email','name_required','gender_required',
 'answer_required','next_step_not_observed','load_failed','access_ended','profile_failed'
];
export const LABELS = {
 welcome:'Приветствие',login:'Вход',register:'Регистрация',profile:'Профиль',otp:'Ввод кода',
 mode:'Выбор режима',email:'Email',telegram:'Telegram',intro:'Введение',selector:'Выбор части',
 part:'Выбранная часть',notStarted:'До начала',partIntro:'Объяснение части',detail:'Подробный разбор',
 practice:'Учебная практика',done:'Завершение',lesson:'Урок',categories:'Выбор темы',next:'Следующий шаг',
 form:'Формуляр',step2:'Шаг 2',step3:'Шаг 3',training:'Тренажёр',learning:'Обучение',
 home:'Главная',hub:'Разделы',schreiben:'Schreiben',lesen:'Lesen',horen:'Hören',sprechen:'Sprechen',
 reference:'Справочник',smartcards:'Карточки',alphabet:'Алфавит',reading:'Правила чтения',
 pronunciation:'Произношение',words:'Слова',nouns:'Существительные',verbs:'Глаголы',
 pronouns:'Местоимения',conjunctions:'Союзы',grammar:'Грамматика',numbers:'Числа',
 loading:'Загрузка',failed:'Ошибка загрузки',granted:'Доступ подтверждён',denied:'Доступ закрыт',
 guided:'С объяснениями',coach:'С поддержкой',solo:'Самостоятельно',teil1:'Teil 1',teil2:'Teil 2',teil3:'Teil 3',
 free:'Свободная практика',extra:'Дополнительная практика',menu:'Меню',letter:'Письмо',
 example:'Пример',explanation:'Объяснение',instructions:'Инструкция',result:'Результат',
 review:'Повторение',test:'Тест',request:'Запрос кода',verify:'Проверка кода',legal:'Согласие',
 'gmail-advice':'Подсказка о Gmail','access-ended':'Доступ закончился',
 'access-failed':'Не удалось проверить доступ','profile-failed':'Не удалось загрузить профиль',
 'mode-chooser':'Выбор режима',onboarding:'Оформление входа',consent:'Согласие',
 other:'Другой внутренний шаг'
};
const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const values=new Set(Object.keys(LABELS));
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const integer=(v,max)=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<=max?v:undefined;
export const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export const userUuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export const visitId=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}_\d{13}_[0-9a-f-]{36}$/.test(v)&&uuid(v.slice(-36));
export function cleanFrame(raw){
 const v=obj(raw);if(!hasOwn(SCOPES,v.scope)||!AREAS.includes(v.area))return null;
 const f={scope:v.scope,area:v.area};
 for(const key of ['view','phase','stage','step','mode']){
   if(typeof v[key]==='string')f[key]=values.has(v[key])?v[key]:'other';
   else if(integer(v[key],999999)!==undefined)f[key]=v[key];
 }
 for(const key of ['part','index'])if(integer(v[key],999999)!==undefined)f[key]=v[key];
 if(CODES.includes(v.blocker))f.blocker=v.blocker;
 return f;
}
export function frameLabel(frame){
 if(!frame)return 'Экран ещё не определён';
 const parts=[SCOPES[frame.scope]||'Экран'];
 for(const key of ['view','stage','phase','step']){
  if(frame[key]===undefined)continue;
  const v=typeof frame[key]==='number'?('шаг '+(frame[key]+1)):(LABELS[frame[key]]||'Другой шаг');
  if(!parts.includes(v))parts.push(v);
 }
 if(frame.part>=1&&frame.part<=3)parts.push('Teil '+frame.part);
 if(frame.index!==undefined)parts.push('позиция '+(frame.index+1));
 return parts.join(' → ');
}
export function cleanEvent(raw,now=Date.now()){
 const v=obj(raw);if(!uuid(v.id)||!KINDS.includes(v.kind)||v.kind==='session_confirmed')return null;
 const t=Date.parse(v.at);
 if(!Number.isFinite(t)||t>now+300000||t<now-86400000)return null;
 const e={id:v.id,kind:v.kind,at:new Date(t).toISOString()};
 if(v.frame!==undefined){e.frame=cleanFrame(v.frame);if(!e.frame)return null;}
 if(v.section!==undefined){
  if(typeof v.section!=='string'||v.section.length>100||!/^([A-Za-z]+)-\d{1,7}$/.test(v.section)||!hasOwn(SCOPES,v.section.split('-')[0]))return null;
  e.section=v.section;
 }
 if(v.operation!==undefined){if(!OPS.includes(v.operation))return null;e.operation=v.operation;}
 if(v.operationId!==undefined){if(!uuid(v.operationId))return null;e.operationId=v.operationId;}
 if(v.action!==undefined){if(!ACTIONS.includes(v.action))return null;e.action=v.action;}
 if(v.outcome!==undefined){if(!OUTCOMES.includes(v.outcome))return null;e.outcome=v.outcome;}
 if(v.code!==undefined)e.code=CODES.includes(v.code)?v.code:'unknown';
 if(v.status!==undefined){if(integer(v.status,599)===undefined)return null;e.status=v.status;}
 if(v.ms!==undefined){if(integer(v.ms,300000)===undefined)return null;e.ms=v.ms;}
 if(v.kind==='time'&&(!e.frame||!e.ms))return null;
 if(v.kind==='feedback'){
   if(!hasOwn(FEEDBACK,v.choice))return null;e.choice=v.choice;
   // Only predefined reason codes are stored; optional free text might
   // contain emails, OTPs, full names or student answers and is discarded.
   // The browser may display the user's comment locally, but not upload it.
 }
 return e;
}
export function summarizeVisit(record,now=Date.now()){
 const events=[...(record.events||[])].sort((a,b)=>(a.at||'').localeCompare(b.at||'')||(a.receivedAt||'').localeCompare(b.receivedAt||'')),timeline=events.filter(e=>e.kind!=='time');
 const lastScreenIndex=events.map(e=>e.kind).lastIndexOf('screen');
 const lastScreen=lastScreenIndex>=0?events[lastScreenIndex]:null;
 const lastSection=events.slice(Math.max(0,lastScreenIndex)).reverse().find(e=>e.kind==='section');
 const operations=new Map();
 for(const e of events)if(e.kind==='operation'&&e.operationId)operations.set(e.operationId,e);
 const problems=[...operations.values()].filter(e=>['network','rejected','slow','unconfirmed'].includes(e.outcome)).map(e=>({...e,recovered:events.some(later=>later.kind==='operation'&&later.operation===e.operation&&later.outcome==='ok'&&later.at>e.at)}));
 const time={app:0,registration:0,learning:0,reference:0,practice:0};
 for(const e of events)if(e.kind==='time'&&e.frame&&time[e.frame.area]!==undefined)time[e.frame.area]+=e.ms||0;
 const last=events[events.length-1];
 return {
  id:record.id,startedAt:record.startedAt,lastReceivedAt:record.lastReceivedAt,
  userId:record.userId||null,verifiedAt:record.verifiedAt||null,
  device:record.device,source:record.source||'unknown',eventCount:events.length,capped:record.capped===true||events.some(e=>e.kind==='client_limit'),
  lastScreen:lastScreen?.frame||null,lastSection:lastSection?.section||null,
  lastEventAt:last?.at||null,issues:problems.length,
  ongoing:now-Date.parse(record.lastReceivedAt||record.startedAt)<120000,
  time,hasPractice:events.some(e=>e.kind==='interaction'&&e.frame?.area==='practice'),
  hasLearning:events.some(e=>e.kind==='screen'&&['learning','reference'].includes(e.frame?.area)),
  feedbackCount:events.filter(e=>e.kind==='feedback').length,
  ...(record.detail?{events:timeline,problems}:{}),
 };
}
