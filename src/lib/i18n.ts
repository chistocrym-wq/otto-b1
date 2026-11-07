import { useEffect, useMemo, useState } from 'react';

export type UiLanguage='ru'|'de';
export const UI_LANGUAGE_KEY='otto-a1-ui-language-v1';

/* A locale is shown as selectable only after the whole customer-facing interface
   has been translated and QA-checked. German remains in the architecture for the
   next localization pass, but is intentionally not advertised as available yet. */
export const UI_LANGUAGES:ReadonlyArray<{id:UiLanguage;label:string;native:string}>=[
  {id:'ru',label:'Русский',native:'Русский'},
];

const RU={
  today:'Сегодня',modules:'Разделы',readiness:'Готовность',account:'Кабинет',settings:'Настройки',home:'Главная',back:'Назад',continue:'Продолжить',start:'Начать',check:'Проверить',next:'Следующее задание',finish:'Завершить',result:'Результат',correct:'Правильно',wrong:'Неверно',showTranslation:'Показать перевод',hideTranslation:'Скрыть перевод',support:'Поддержка',news:'Новости',share:'Поделиться',mockExam:'Пробный экзамен',insufficient:'Недостаточно данных',trainingToday:'Ваша тренировка на сегодня',minutes:'мин',chooseSection:'Выбрать раздел',language:'Язык интерфейса',reminders:'Напоминания о тренировке',soundMic:'Звук и микрофон',install:'Установка приложения',profile:'Личный кабинет',sessions:'тренировочных сессий',studyTime:'времени в тренировках',recentActivity:'Последние занятия',weakAreas:'Слабые места',trainNow:'Что потренировать сейчас',save:'Сохранить',notificationPermission:'Разрешить уведомления',days:'Дни',time:'Время',notificationNote:'Напоминания работают, когда OTTO открыт. Фоновые уведомления доступны только на поддерживаемых устройствах.',userName:'Имя',edit:'Изменить',done:'Готово',allFour:'Все четыре навыка',notMeasured:'Пока не измерено',accuracy:'Точность',completed:'Выполнено',attempts:'Попытки',todayPlan:'План на сегодня',howTo:'Как заниматься в тренажёре?',useEye:'Перевод открывается по значку глаза.',uiLanguageHint:'Русский интерфейс полностью проверен. Другие языки появятся в выборе только после полной локализации всего приложения; немецкие учебные материалы остаются на немецком.',notificationSaved:'Напоминание сохранено',notificationDenied:'Уведомления запрещены в настройках браузера',notificationUnsupported:'Этот браузер не поддерживает системные уведомления',monday:'Пн',tuesday:'Вт',wednesday:'Ср',thursday:'Чт',friday:'Пт',saturday:'Сб',sunday:'Вс',
} as const;

/* Kept as a complete dictionary contract for the localization architecture.
   It is not user-selectable until every customer-facing page passes language QA. */
const DE:Record<keyof typeof RU,string>={
  today:'Heute',modules:'Bereiche',readiness:'Bereitschaft',account:'Konto',settings:'Einstellungen',home:'Start',back:'Zurück',continue:'Weiter',start:'Starten',check:'Prüfen',next:'Weiter',finish:'Beenden',result:'Ergebnis',correct:'Richtig',wrong:'Falsch',showTranslation:'Übersetzung zeigen',hideTranslation:'Übersetzung ausblenden',support:'Support',news:'Neuigkeiten',share:'Teilen',mockExam:'Probeprüfung',insufficient:'Noch nicht genug Daten',trainingToday:'Ihr Training für heute',minutes:'Min.',chooseSection:'Bereich wählen',language:'Sprache der Oberfläche',reminders:'Trainingserinnerungen',soundMic:'Ton und Mikrofon',install:'App installieren',profile:'Persönliches Konto',sessions:'Trainingseinheiten',studyTime:'Trainingszeit',recentActivity:'Letzte Aktivitäten',weakAreas:'Schwache Bereiche',trainNow:'Was jetzt trainieren?',save:'Speichern',notificationPermission:'Benachrichtigungen erlauben',days:'Tage',time:'Uhrzeit',notificationNote:'Die Web-Erinnerung funktioniert, solange OTTO geöffnet ist. Hintergrund-Push gibt es nur auf Plattformen mit eingerichteter System-Push-Subscription.',userName:'Name',edit:'Ändern',done:'Fertig',allFour:'Alle vier Fertigkeiten',notMeasured:'Noch nicht gemessen',accuracy:'Genauigkeit',completed:'Erledigt',attempts:'Versuche',todayPlan:'Plan für heute',howTo:'Wie trainiere ich mit OTTO?',useEye:'Die Übersetzung öffnet sich über das Augen-Symbol.',uiLanguageHint:'Diese Sprache wird erst freigeschaltet, wenn die gesamte Oberfläche vollständig lokalisiert und geprüft ist.',notificationSaved:'Erinnerung gespeichert',notificationDenied:'Der Browser hat Benachrichtigungen nicht erlaubt',notificationUnsupported:'Dieser Browser unterstützt keine Systembenachrichtigungen',monday:'Mo',tuesday:'Di',wednesday:'Mi',thursday:'Do',friday:'Fr',saturday:'Sa',sunday:'So',
};
export type UiKey=keyof typeof RU;
function read():UiLanguage{
  /* Only fully QA-approved locales may be restored as active. */
  try{return localStorage.getItem(UI_LANGUAGE_KEY)==='ru'?'ru':'ru'}catch{return'ru'}
}
export function setUiLanguage(lang:UiLanguage){
  const safe:UiLanguage=UI_LANGUAGES.some(item=>item.id===lang)?lang:'ru';
  try{localStorage.setItem(UI_LANGUAGE_KEY,safe)}catch{}
  document.documentElement.lang=safe;
  window.dispatchEvent(new CustomEvent('otto:language',{detail:safe}));
}
export function getUiLanguage(){return read()}
export function uiText(lang:UiLanguage,key:UiKey){return(lang==='de'?DE:RU)[key]||RU[key]}
export function useUiLanguage(){const[lang,setLang]=useState<UiLanguage>(read);useEffect(()=>{const f=()=>setLang(read());window.addEventListener('otto:language',f);return()=>window.removeEventListener('otto:language',f)},[]);return useMemo(()=>({lang,setLanguage:(v:UiLanguage)=>{setUiLanguage(v);setLang(read())},t:(key:UiKey)=>uiText(lang,key)}),[lang])}
