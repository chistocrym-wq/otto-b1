import {studyTimeService} from '../lib/preview20-study-time.js';
const service=studyTimeService();
export default service.record;
export const config={path:'/api/preview20-study-time',rateLimit:{windowLimit:120,windowSize:60,aggregateBy:['ip','domain']}};
