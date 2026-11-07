import {teacherPilot} from '../lib/preview20-teachers.js';
export default teacherPilot.teacher;
export const config={path:'/api/teacher',rateLimit:{windowLimit:80,windowSize:60,aggregateBy:['ip','domain']}};
