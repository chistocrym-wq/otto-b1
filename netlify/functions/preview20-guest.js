import { json } from '../lib/email-otp.js';
import { preview20Guest } from '../lib/preview20-guest-trial.js';

export default async function handler(req, context) {
  if (req.method !== 'POST') return json({ code: 'method_not_allowed' }, 405, { Allow: 'POST' });
  try {
    const result = await preview20Guest.start(req, context);
    if (result.status !== 200) return json({ code: result.code }, result.status);
    return json({
      guest: true, active: result.active, serverNow: new Date().toISOString(),
      trialStartedAt: new Date(result.startedAt).toISOString(),
      trialEndsAt: new Date(result.endsAt).toISOString()
    }, 200, result.cookie ? { 'Set-Cookie': result.cookie } : {});
  } catch (error) {
    console.error('Preview20 guest trial unavailable:', String(error?.message || error));
    return json({ code: 'guest_trial_unavailable' }, 503);
  }
}
export const config = { path: '/api/preview20-guest' };
