import {createHash} from 'node:crypto';
import {getStore} from '@netlify/blobs';
import {json} from '../lib/email-otp.js';
import {readCurrentAdminSession} from '../lib/admin-auth.js';
import {getOtto30InventoryReadOnlyConfig,otto30Env} from '../lib/otto30-storage-config.js';
import {readVerifiedOwnerManifest} from '../lib/otto30-private.js';
import {E9R3_KEY_FILES} from '../lib/otto30-key-fingerprints.js';
const SITE='6cd5980e-1876-40f3-85e4-b227362b4d3d';
const allowed=new Set(['production','deploy-preview','branch-deploy']);
const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
export default async function handler(req,context){
 if(!allowed.has(String(context?.deploy?.context||'')))return json({code:'not_found'},404,headers);
 let admin;
 try{admin=readCurrentAdminSession(req);}catch{return json({code:'admin_auth_unavailable'},503,headers);}
 if(!admin)return json({code:'not_authenticated'},401,headers);
 if(req.method!=='GET')return json({code:'method_not_allowed'},405,{...headers,Allow:'GET'});
 const host=new URL(req.url).hostname.toLowerCase();
 const indicators={
  siteIdMatches:otto30Env('SITE_ID')===SITE,
  productionHostMatches:host===otto30Env('OTTO30_PRODUCTION_HOST').toLowerCase(),
  productionReleaseApproved:otto30Env('OTTO30_PRODUCTION_RELEASE_APPROVED')==='approved',
  studentAccessEnabled:otto30Env('OTTO30_PRODUCTION_STUDENT_ACCESS')==='enabled'
 };
 const config=getOtto30InventoryReadOnlyConfig(req,context);
 if(!config)return json({configured:false,indicators,ready:false,checkedPrivateKeys:0},200,headers);
 try{
  const manifest=await readVerifiedOwnerManifest(getStore(config.candidateStore));
  const store=getStore(config.keyStore);
  let verified=0;
  for(let n=1;n<=30;n++){
    const expected=E9R3_KEY_FILES[n];
    const bytes=await store.get('exam_'+String(n).padStart(2,'0')+'.key.json',{type:'arrayBuffer'});
    if(bytes&&expected&&bytes.byteLength===expected.bytes&&
      createHash('sha256').update(Buffer.from(bytes)).digest('hex')===expected.sha256)verified++;
  }
  return json({configured:true,mode:config.mode,indicators,
    ownerManifestReady:Boolean(manifest),checkedPrivateKeys:30,verifiedPrivateKeys:verified,
    expectedPrivateKeys:30,expectedPublicAssets:500,
    ready:Boolean(manifest)&&verified===30},200,headers);
 }catch(error){
  console.warn('OTTO30 inventory read unavailable',error?.name||'unknown');
  return json({code:'exam_inventory_unavailable'},503,headers);
 }
}
export const config={path:'/api/admin-otto30-readiness'};
