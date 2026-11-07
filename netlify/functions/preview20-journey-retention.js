// Scheduled cleanup for consented 24-hour journey analytics only.
// Netlify runs scheduled functions on published deploys, not Deploy Previews.
import {getStore} from '@netlify/blobs';
import {v20StoreName} from '../lib/v20-deployment.js';
import {pruneExpiredJourneys} from '../lib/preview20-journey-retention.js';

const env=name=>String(globalThis.Netlify?.env?.get?.(name)||process.env[name]||'');
export default async function scheduledJourneyRetention(_req,context){
  // Deny unless the approved Production deploy has Journey separately enabled.
  if(context?.deploy?.context!=='production' || !context.deploy.id ||
     env('OTTO_V20_PRODUCTION_APPROVED')!=='true' ||
     env('OTTO_V20_JOURNEY_ENABLED')!=='true' ||
     env('OTTO_V20_PRODUCTION_ORIGIN')!=='https://otto-a1.netlify.app')
    return;
  const name=v20StoreName('JOURNEY',{mode:'production'});
  const store=getStore({name,consistency:'strong'});
  const result=await pruneExpiredJourneys(store,{now:Date.now(),maxScanned:1800});
  console.info('OTTO journey retention',result); // counts only, no identities
}
export const config={schedule:'@hourly'};
