import { json } from '../lib/email-otp.js';
import { readSession } from '../lib/otto-session.js';

const PREVIEW_CONTEXTS=new Set(['deploy-preview','branch-deploy']);
const clean=(value,max=500)=>String(value??'').replace(/[\r\n\t]+/g,' ').slice(0,max);

export default async (req) => {
  if(!PREVIEW_CONTEXTS.has(String(process.env.CONTEXT||''))){
    return json({ error:'Not found' },404);
  }

  const session=readSession(req);
  if(!session){
    return json({ authenticated:false,code:'not_authenticated' },401);
  }

  if(req.method!=='POST'){
    return json({ error:'Method not allowed' },405,{Allow:'POST'});
  }

  const body=await req.json().catch(()=>({}));
  const moduleName=clean(body.module,40);
  const teil=Number.isFinite(Number(body.teil))?Number(body.teil):null;
  const taskIndex=Number.isFinite(Number(body.taskIndex))?Number(body.taskIndex):null;
  const action=clean(body.action,60);
  const message=clean(body.message,500);
  const userAgent=clean(body.userAgent,500);
  const viewport=clean(body.viewport,80);
  const standalone=body.standalone===true;

  console.info(
    'OTTO_CLIENT_DIAGNOSTIC',
    JSON.stringify({
      userId:String(session.sub),
      module:moduleName,
      teil,
      taskIndex,
      action,
      message,
      userAgent,
      viewport,
      standalone,
      at:new Date().toISOString(),
    })
  );

  return json({ok:true,userId:String(session.sub)});
};

export const config={path:'/api/client-diagnostic'};
