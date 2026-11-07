import { json } from './email-otp.js';
import { readSession } from './otto-session.js';
import { preview20Guest } from './preview20-guest-trial.js';
import { developerAccessAllowed, loadPaidSubscriptionState, TRIAL_MS } from '../functions/account-access.js';
import { getOttoAccountVerifiedAt, getOttoUserProfile } from './otto-supabase.js';

// Auth is enforced server-side before an AI request reaches the paid provider.
// Never trust a client-supplied user ID, trial flag, or access entitlement.
export async function requireOttoTrainingAccess(req, context) {
  let session;
  try { session = readSession(req); }
  catch { return json({ error: 'Не удалось проверить сессию.', code: 'session_unavailable' }, 503); }
  if (!session) {
    try {
      const guest = await preview20Guest.read(req, context);
      if (!guest) return json({ error: 'Необходимо войти в OTTO.', code: 'not_authenticated' }, 401);
      if (!guest.active) return json({ code: 'guest_trial_expired' }, 403);
      const quota = await preview20Guest.consumeAiCredit(req, context);
      return quota.allowed ? null : json({ code: quota.code }, quota.status);
    } catch (error) {
      console.error('Guest AI authorization unavailable:', error);
      return json({ code: 'guest_access_unavailable' }, 503);
    }
  }
  try {
    const now = Date.now();
    const developer = developerAccessAllowed(session.sub);
    const [verifiedAt, profile, paid] = await Promise.all([
      getOttoAccountVerifiedAt(session.sub),
      getOttoUserProfile(session.sub),
      loadPaidSubscriptionState({ userId: session.sub, context, serverNow: now }),
    ]);
    const anchor = await preview20Guest.registeredTrialStart(req, context, session.sub, verifiedAt || profile?.createdAt || '');
    const trialStarted = Date.parse(anchor || '');
    if (!Number.isFinite(trialStarted) && !developer) {
      return json({ error: 'Не удалось проверить начало trial.', code: 'trial_start_missing' }, 503);
    }
    if (!developer && !(now < trialStarted + TRIAL_MS) && !paid.subscriptionActive) {
      return json({ error: 'Пробный период завершён. Нужен доступ OTTO.', code: 'training_access_required' }, 403);
    }
    return null;
  } catch (error) {
    console.error('OTTO AI training access check failed:', error);
    return json({ error: 'Не удалось проверить доступ. Попробуйте снова.', code: 'access_status_failed' }, 503);
  }
}
