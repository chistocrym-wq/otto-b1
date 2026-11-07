import {teacherPilot} from '../lib/preview20-teachers.js';
export default teacherPilot.capture;
export const config={path:'/api/teacher-referral',rateLimit:{windowLimit:80,windowSize:60,aggregateBy:['ip','domain']}};
