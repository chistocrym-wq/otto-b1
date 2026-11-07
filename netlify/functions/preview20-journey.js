import {getStore} from '@netlify/blobs';
import {readSession} from '../lib/otto-session.js';
import {readAdminSession} from '../lib/admin-auth.js';
import {journeyService} from '../lib/preview20-journey-service.js';
import {v20StoreName} from '../lib/v20-deployment.js';

const service=journeyService({
 openStore:(scope)=>{
  const name=v20StoreName('JOURNEY',scope);
  if(!name)throw Error('journey_store_scope_required');
  return getStore({name,consistency:'strong'});
 },
 readUserSession:readSession,readAdminSession,
});
export default service.visitor;
export const config={
 path:'/api/preview20-journey',
 rateLimit:{windowLimit:80,windowSize:60,aggregateBy:['ip','domain']},
};
