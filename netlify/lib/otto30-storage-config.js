const preview={
 mode:'preview13',host:'deploy-preview-13--otto-a1.netlify.app',
 candidateStore:'otto30-preview13-owner-private-v1',
 keyStore:'otto30-preview13-private-score-keys-v1',
 attemptStore:'otto30-preview13-private-scores-v1',
 ownerIds:'OTTO30_PREVIEW13_OWNER_IDS',keyAdminIds:'OTTO30_PREVIEW13_KEY_ADMIN_IDS',
 studentFlag:'OTTO30_PREVIEW13_STUDENT_ACCESS'
};
// Runtime Netlify Functions expose SITE_ID, not the build-only CONTEXT value.
// Keep the approved release bound to the audited Netlify site at request time.
const PRODUCTION_SITE_ID='6cd5980e-1876-40f3-85e4-b227362b4d3d';
const production={
 mode:'production',
 candidateStore:'otto30-production-owner-private-v1',
 keyStore:'otto30-production-private-score-keys-v1',
 attemptStore:'otto30-production-private-scores-v1',
 ownerIds:'OTTO30_PRODUCTION_OWNER_IDS',keyAdminIds:'OTTO30_PRODUCTION_KEY_ADMIN_IDS',
 studentFlag:'OTTO30_PRODUCTION_STUDENT_ACCESS'
};
export function otto30Env(name){
 return String(globalThis.Netlify?.env?.get?.(name)||process.env[name]||'').trim();
}
export function getOtto30Config(req){
  const p20Host='deploy-preview-20--otto-a1.netlify.app';
  if(new URL(req.url).origin==='https://'+p20Host) {
    // Same audited production exam assets, but NO production score writes or key uploads.
    // Production config and all previously released exam keys are untouched.
    const ctx=String(req.headers.get('x-nf-context')||'');
    void ctx;
    if(otto30Env('SITE_ID')!==PRODUCTION_SITE_ID) return null;
    return {...production,mode:'preview20',host:p20Host,
      attemptStore:'otto30-preview20-synthetic-attempts-v1',
      ownerIds:'OTTO_PREVIEW20_DISABLED_OWNER_IDS',
      keyAdminIds:'OTTO_PREVIEW20_DISABLED_KEY_ADMINS'};
  }
 const host=new URL(req.url).hostname.toLowerCase();
 if(host===preview.host)return preview;
 const approvedHost=otto30Env('OTTO30_PRODUCTION_HOST').toLowerCase();
 if(!approvedHost||host!==approvedHost||host===preview.host)return null;
 if(otto30Env('SITE_ID')!==PRODUCTION_SITE_ID||otto30Env('OTTO30_PRODUCTION_RELEASE_APPROVED')!=='approved')return null;
 return {...production,host:approvedHost};
}
export function otto30AdminAllowed(session,config,flag='ownerIds'){
 if(!session?.sub||!config)return false;
 const ids=otto30Env(config[flag]);
 return Boolean(ids)&&new Set(ids.split(/[\s,;]+/).filter(Boolean)).has(session.sub);
}

/** Read-only inventory resolver; never grants learner access. Use only after signed admin GET auth. */
export function getOtto30InventoryReadOnlyConfig(req,context){
 const c=String(context?.deploy?.context||'');
 if(c!=='production'&&c!=='deploy-preview')return null;
 if(otto30Env('SITE_ID')!==PRODUCTION_SITE_ID)return null;
 let host;
 try{const u=new URL(req.url);if(u.protocol!=='https:')return null;host=u.hostname.toLowerCase();}
 catch{return null;}
 const configured=otto30Env('OTTO30_PRODUCTION_HOST').toLowerCase();
 if(c==='production'&&(host==='otto-a1.netlify.app'||(configured&&host===configured)))
   return {...production,host,mode:'production-inventory-read-only'};
 if(c==='deploy-preview'&&host==='deploy-preview-25--otto-a1.netlify.app')
   return {...production,host,mode:'preview25-inventory-read-only'};
 return null;
}
