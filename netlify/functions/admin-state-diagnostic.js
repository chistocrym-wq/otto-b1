import { json } from '../lib/email-otp.js';
import { readCurrentAdminSession } from '../lib/admin-auth.js';
import { getOttoUserStateRows } from '../lib/otto-supabase.js';

// Trusted function runtime context, never a request header or build-only CONTEXT.
const ALLOWED_CONTEXTS=new Set(['production','deploy-preview','branch-deploy']);
const ALLOWED_KEYS=[
 'otto-a1-lesen-progress-v2',
 'otto-lesen-teil2-progress-v1',
 'otto-training-resume-v1',
 'otto-module-task-completion-v1',
];
const PRIVATE_HEADERS={'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie',
 'X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'};
function validUserId(value){
 return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}
export default async function handler(req,context){
 if(!ALLOWED_CONTEXTS.has(String(context?.deploy?.context||'')))
  return json({error:'Not found'},404,PRIVATE_HEADERS);
 let admin;
 try{admin=readCurrentAdminSession(req);}
 catch{return json({code:'admin_auth_unavailable'},503,PRIVATE_HEADERS);}
 if(!admin)return json({authenticated:false,code:'not_authenticated'},401,PRIVATE_HEADERS);
 if(req.method!=='GET')return json({code:'method_not_allowed'},405,{...PRIVATE_HEADERS,Allow:'GET'});
 const userId=(new URL(req.url).searchParams.get('userId')||'').trim();
 if(!validUserId(userId))return json({code:'invalid_user_id'},400,PRIVATE_HEADERS);
 try{
  // SELECT only; user_state snapshots, never exam keys, arbitrary tables or writes.
  const rows=await getOttoUserStateRows(userId,ALLOWED_KEYS);
  const byKey=new Map(rows.filter(r=>ALLOWED_KEYS.includes(r.state_key)).map(r=>[r.state_key,r]));
  return json({authenticated:true,userId,
   state:ALLOWED_KEYS.map(key=>byKey.get(key)??{state_key:key,state_value:null,updated_at:null}),
  },200,PRIVATE_HEADERS);
 }catch(error){
  console.error('Admin user state read unavailable',error?.name||'unknown');
  return json({code:'state_diagnostic_failed'},503,PRIVATE_HEADERS);
 }
}
export const config={path:'/api/admin-state-diagnostic'};
