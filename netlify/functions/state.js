import { json } from '../lib/email-otp.js';
import { readSession } from '../lib/otto-session.js';
import {
  deleteOttoUserState,
  getOttoUserState,
  saveOttoUserState,
} from '../lib/otto-supabase.js';

const ALLOWED_KEYS = new Set([
  'otto-a1-hoeren-progress-v2',
  'otto-a1-lesen-progress-v2',
  'otto-lesen-teil1-progress-v2',
  'otto-lesen-teil2-progress-v1',
  'otto-schreiben-path-stage',
  'otto-guided-module-intros-v1',
  'otto-a1-learning-profile-v1',
  'otto-a1-mock-attempts-v1',
  'otto-training-resume-v1',
  'otto-a1-reminder-v1',
  'otto-module-task-completion-v1',
  'otto-reference-intro-seen-v1',
  'otto-reference-smart-cards-v1',
]);

const LEARNING_KEY_PREFIXES = [
  'otto-preview-learning-v2:',
  'otto-preview-learning-location-v1:',
  'otto-preview-app-mode-v2:',
  'form_training_progress:',
  'otto-preview-hoeren-learning-v2:',
  'otto-preview-lesen-learning-v2:',
  'otto-preview-sprechen-learning-v1:',
  'otto-preview-schreiben-exact-v3:',
  'otto-preview-schreiben-practice-v1:',
];

function validKey(value, userId) {
  if (typeof value !== 'string' || typeof userId !== 'string') return false;
  if (ALLOWED_KEYS.has(value)) return true;
  if (LEARNING_KEY_PREFIXES.some(prefix => value === prefix + userId)) return true;
  const archivePrefix = 'otto-a1-archive-exam-v2:' + encodeURIComponent(userId) + ':';
  return value.startsWith(archivePrefix) &&
    /^exam-(?:0[1-9]|[12][0-9]|30):(?:stage|results|expired|final|horen-answers|lesen-answers|schreiben-form|schreiben-letter|schreiben-locked-form|schreiben-locked-letter|sprechen-scores|deadline-(?:horen|lesen|schreiben|sprechen)|horen-plays-(?:[1-9]|1[0-5]))$/.test(value.slice(archivePrefix.length));
}

export default async (req) => {
  const session = readSession(req);

  if (!session) {
    return json({
      authenticated: false,
      code: 'not_authenticated',
    }, 401);
  }

  if (req.method === 'GET') {
    try {
      const state =
        await getOttoUserState(session.sub);

      return json({
        authenticated: true,
        userId: session.sub,
        state,
      });
    } catch (error) {
      console.error('Failed to load OTTO state:', error);

      return json({
        error: 'State is temporarily unavailable.',
        code: 'state_load_failed',
      }, 503);
    }
  }

  if (req.method === 'PUT') {
    const body =
      await req.json().catch(() => ({}));

    const key = body.key;
    const value = body.value;

    if (
      !validKey(key, session.sub) ||
      typeof value !== 'string' ||
      value.length > 500000
    ) {
      return json({
        error: 'Invalid state data.',
        code: 'invalid_state',
      }, 400);
    }

    try {
      // Smart Cards only support addition. Union concurrent updates from two
      // tabs/devices rather than overwriting a newer saved collection.
      let nextValue = value;
      if (key === 'otto-reference-smart-cards-v1') {
        const current = await getOttoUserState(session.sub);
        const existing = JSON.parse(current[key] || '[]');
        const incoming = JSON.parse(value);
        if (!Array.isArray(existing) || !Array.isArray(incoming) ||
            incoming.some(v => typeof v !== 'string') || incoming.length > 200) {
          return json({ error: 'Invalid Smart Cards.', code: 'invalid_state' }, 400);
        }
        nextValue = JSON.stringify([...new Set([...existing, ...incoming])]);
      }
      await saveOttoUserState(
        session.sub,
        key,
        nextValue
      );

      return json({ ok: true });
    } catch (error) {
      console.error('Failed to save OTTO state:', error);

      return json({
        error: 'State could not be saved.',
        code: 'state_save_failed',
      }, 503);
    }
  }

  if (req.method === 'DELETE') {
    const body =
      await req.json().catch(() => ({}));

    const key = body.key;

    if (!validKey(key, session.sub)) {
      return json({
        error: 'Invalid state key.',
        code: 'invalid_state',
      }, 400);
    }

    try {
      await deleteOttoUserState(
        session.sub,
        key
      );

      return json({ ok: true });
    } catch (error) {
      console.error('Failed to delete OTTO state:', error);

      return json({
        error: 'State could not be deleted.',
        code: 'state_delete_failed',
      }, 503);
    }
  }

  return json(
    { error: 'Method not allowed' },
    405,
    { Allow: 'GET, PUT, DELETE' }
  );
};

export const config = { path: '/api/state' };
