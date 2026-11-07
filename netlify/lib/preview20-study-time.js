import { getStore } from '@netlify/blobs';
import { readSession } from './otto-session.js';
import { readAdminSession } from './admin-auth.js';
import {v20FeatureScope,v20SameOrigin,v20StoreName} from './v20-deployment.js';

// Preview-only, persistent across deploys. Never writes existing score, trial or profile tables.
const storeName = 'otto-preview20-study-time-v1';
const path = id => 'study/' + id;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const categories = new Set(['otto','schreiben','lesen','horen','sprechen','review','practice']);
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type':'application/json', 'cache-control':'no-store' } });
function preview(req,context){return Boolean(v20FeatureScope(req,context,'STUDY_TIME'));}
function origin(req,context){return v20SameOrigin(req,v20FeatureScope(req,context,'STUDY_TIME'));}
export function mergeStudyIntervals(rows) {
  const intervals = rows.map(r=>[r.start,r.end]).sort((a,b)=>a[0]-b[0]);
  let total = 0, start = null, end = null;
  for (const [a,b] of intervals) {
    if (start === null) { start=a; end=b; }
    else if (a <= end) end=Math.max(end,b);
    else { total+=end-start; start=a; end=b; }
  }
  return Math.round((total+(start===null?0:end-start))/1000);
}
const summarize = rows => {
  const byModule={};
  for (const group of categories) byModule[group]=mergeStudyIntervals(rows.filter(row=>row.module===group));
  return {seconds:mergeStudyIntervals(rows),byModule,intervals:rows.length};
};
function validate(input,now) {
  if (!input||!uuid.test(String(input.id||''))||!categories.has(input.module)) return null;
  const start=Number(input.start),end=Number(input.end);
  if (!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||
      end<=start||end-start>20000||end-start<500||end>now+15000||start<now-14*86400000) return null;
  return {id:input.id,module:input.module,start,end};
}
export function studyTimeService({openStore=(scope)=>getStore({name:v20StoreName('STUDY_TIME',scope)||storeName,consistency:'strong'}),session=readSession,admin=readAdminSession,now=Date.now}={}) {
  async function record(req,context) {
    if (!preview(req,context)) return json({code:'not_found'},404);
    const identity=session(req);
    if (!identity?.sub) return json({code:'not_authenticated'},401);
    if (req.method==='GET') {
      try { const rows=(await openStore(v20FeatureScope(req,context,'STUDY_TIME')).get(path(identity.sub),{type:'json',consistency:'strong'}))?.rows||[];return json({ok:true,...summarize(rows)}); }
      catch {return json({code:'study_time_unavailable'},503);}
    }
    if (req.method!=='POST') return json({code:'method_not_allowed'},405);
    if (!origin(req,context)) return json({code:'invalid_origin'},403);
    const input=await req.json().catch(()=>null);
    if (!Array.isArray(input?.intervals)||input.intervals.length<1||input.intervals.length>40)return json({code:'invalid_batch'},400);
    const currentTime=now(),intervals=input.intervals.map(r=>validate(r,currentTime));
    if(intervals.some(r=>!r))return json({code:'invalid_interval'},400);
    try {
      const store=openStore(v20FeatureScope(req,context,'STUDY_TIME')),key=path(identity.sub);
      for(let attempt=0;attempt<8;attempt++){
        const previous=await store.getWithMetadata(key,{type:'json',consistency:'strong'});
        const rows=Array.isArray(previous?.data?.rows)?previous.data.rows:[];
        const known=new Set(rows.map(row=>row.id));
        const added=intervals.filter(row=>{if(known.has(row.id))return false;known.add(row.id);return true;});
        if(!added.length)return json({ok:true,accepted:intervals.map(row=>row.id),...summarize(rows)});
        // Keep the last 14 days. Older time is aggregated into historical sum,
        // which is displayed separately and not double-counted in the active window.
        const recent=rows.filter(row=>row.end>=currentTime-14*86400000);
        const archived=rows.filter(row=>row.end<currentTime-14*86400000);
        const historicalSeconds=Number(previous?.data?.historicalSeconds)||0;
        const newRows=[...recent,...added];
        if(newRows.length>35000)return json({code:'study_time_capacity'},429);
        const next={rows:newRows,historicalSeconds:historicalSeconds+mergeStudyIntervals(archived)};
        const options=previous?{onlyIfMatch:previous.etag}:{onlyIfNew:true};
        const result=await store.setJSON(key,next,options);
        if(result.modified)return json({ok:true,accepted:intervals.map(row=>row.id),...summarize(next.rows),historicalSeconds:next.historicalSeconds});
      }
      return json({code:'retry_conflict'},409);
    } catch {return json({code:'study_time_unavailable'},503);}
  }
  async function adminSummary(req,context) {
    if (!preview(req,context))return json({code:'not_found'},404);
    if (!admin(req))return json({code:'not_authenticated'},401);
    if(req.method!=='GET')return json({code:'method_not_allowed'},405);
    const id=new URL(req.url).searchParams.get('userId')||'';
    if(!uuid.test(id))return json({code:'invalid_user_id'},400);
    try{
      const entry=await openStore(v20FeatureScope(req,context,'STUDY_TIME')).get(path(id),{type:'json',consistency:'strong'});
      const summary=summarize(entry?.rows||[]);
      return json({ok:true,seconds:summary.seconds+(Number(entry?.historicalSeconds)||0),byModule:summary.byModule,intervals:summary.intervals});
    }catch{return json({code:'study_time_unavailable'},503);}
  }
  return {record,adminSummary};
}
