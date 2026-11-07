// Production opt-in gate for Preview20 features. DENY by default.
// Being on a production hostname is NEVER sufficient to enable a feature.
export const V20_PREVIEW_ORIGIN='https://deploy-preview-20--otto-a1.netlify.app';
export const V20_PRODUCTION_ORIGIN='https://otto-a1.netlify.app';
export const V25_PREVIEW_ORIGIN='https://deploy-preview-25--otto-a1.netlify.app';
const FEATURE_NAMES=new Set(['ADMIN','JOURNEY','STUDY_TIME','TEACHERS','REFERRAL','GUEST']);
function configured(name){
  try { const value=globalThis.Netlify?.env?.get?.(name);if(typeof value==='string')return value; }catch{}
  return typeof process!=='undefined'?String(process.env?.[name]||''):'';
}
export function v20FeatureScope(req,context,feature,{readEnv=configured}={}){
  if(!FEATURE_NAMES.has(feature))return null;
  let origin;
  try{origin=new URL(req.url).origin;}catch{return null;}
  if(origin===V20_PREVIEW_ORIGIN&&context?.deploy?.context==='deploy-preview'&&
     typeof context.deploy.id==='string'&&context.deploy.id.length>0)
    return {mode:'preview',origin,deployId:context.deploy.id};
  // Preview25 is a separately scoped test deploy; never use Production Blobs.
  if(origin===V25_PREVIEW_ORIGIN&&context?.deploy?.context==='deploy-preview'&&
     typeof context.deploy.id==='string'&&context.deploy.id.length>0)
    return {mode:'preview25',origin,deployId:context.deploy.id};
  // Production needs an approved deploy, an exact allowlisted origin and
  // TWO server-side flags. Build flags alone can never authorize API requests.
  if(context?.deploy?.context!=='production'||typeof context.deploy.id!=='string'||!context.deploy.id)return null;
  if(readEnv('OTTO_V20_PRODUCTION_APPROVED')!=='true')return null;
  if(readEnv('OTTO_V20_'+feature+'_ENABLED')!=='true')return null;
  const configuredOrigin=readEnv('OTTO_V20_PRODUCTION_ORIGIN');
  if(!configuredOrigin||!configuredOrigin.startsWith('https://'))return null;
  let approved;
  try{
    const u=new URL(configuredOrigin);
    if(u.origin!==configuredOrigin||u.username||u.password||u.pathname!=='/'||u.search||u.hash)return null;
    approved=u.origin;
  }catch{return null;}
  if(origin!==approved)return null;
  return {mode:'production',origin,deployId:context.deploy.id};
}
export function v20SameOrigin(req,scope){
  if(!scope)return false;
  const site=req.headers.get('sec-fetch-site');
  return req.headers.get('origin')===scope.origin&&(!site||site==='same-origin');
}
export function v20StoreName(kind,scope){
  if(!scope)return null;
  const names={
    GUEST:['otto-preview20-guest-trial-v1','otto-v20-production-guest-trial-v1'],
    STUDY_TIME:['otto-preview20-study-time-v1','otto-v20-production-study-time-v1'],
    TEACHERS:['otto-preview20-teacher-pilot-v1','otto-v20-production-teacher-pilot-v1'],
    JOURNEY:['otto-preview20-journey-v1','otto-v20-production-journey-v1'],
  };
  const pair=names[kind];
  if(!pair)return null;
  if(scope.mode==='preview25')return pair[0].replace('preview20','preview25');
  return pair[scope.mode==='production'?1:0];
}
