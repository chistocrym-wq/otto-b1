// Client-facing feature visibility is build-time opt-in, never an authorization.
// Every corresponding API must independently enforce the server-side gate.
export const V20_PREVIEW_HOST='deploy-preview-20--otto-a1.netlify.app';
export const V20_PRODUCTION_HOST='otto-a1.netlify.app';
export const V25_PREVIEW_HOST='deploy-preview-25--otto-a1.netlify.app';
export type V20ClientFeature='admin'|'journey'|'studyTime'|'teachers'|'referral'|'guest'|'welcome';
export function v20ClientEnabled(feature:V20ClientFeature):boolean{
  if(typeof window==='undefined')return false;
  if(window.location.hostname===V20_PREVIEW_HOST||window.location.hostname===V25_PREVIEW_HOST)return true;
  if(window.location.hostname!==V20_PRODUCTION_HOST)return false;
  if(import.meta.env.VITE_OTTO_V20_PRODUCTION_APPROVED!=='true')return false;
  switch(feature){
    case 'admin':return import.meta.env.VITE_OTTO_V20_ADMIN_ENABLED==='true';
    case 'journey':return import.meta.env.VITE_OTTO_V20_JOURNEY_ENABLED==='true';
    case 'studyTime':return import.meta.env.VITE_OTTO_V20_STUDY_TIME_ENABLED==='true';
    case 'teachers':return import.meta.env.VITE_OTTO_V20_TEACHERS_ENABLED==='true';
    case 'referral':return import.meta.env.VITE_OTTO_V20_REFERRAL_ENABLED==='true';
    case 'guest':return import.meta.env.VITE_OTTO_V20_GUEST_ENABLED==='true';
    case 'welcome':return import.meta.env.VITE_OTTO_V20_WELCOME_ENABLED==='true';
    default:return false;
  }
}
