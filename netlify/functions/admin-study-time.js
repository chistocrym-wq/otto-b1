import {studyTimeService} from '../lib/preview20-study-time.js';
const service=studyTimeService();
export default service.adminSummary;
export const config={path:'/api/admin-study-time'};
