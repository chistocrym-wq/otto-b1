import { json } from '../lib/email-otp.js';
import { readSession } from '../lib/otto-session.js';
import {
  getOttoUserProfile,
  saveOttoUserProfile,
} from '../lib/otto-supabase.js';

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
      const profile = await getOttoUserProfile(session.sub);

      return json({
        authenticated: true,
        userId: session.sub,
        profile,
      });
    } catch (error) {
      console.error('Failed to load OTTO profile:', error);

      return json({
        error: 'Profile is temporarily unavailable.',
        code: 'profile_load_failed',
      }, 503);
    }
  }

  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));

    const name =
      typeof body.name === 'string'
        ? body.name.trim()
        : '';

    const gender =
      body.gender === 'female' || body.gender === 'male'
        ? body.gender
        : undefined;

    const learningMode =
      body.learningMode === 'guided' || body.learningMode === 'direct'
        ? body.learningMode
        : null;

    if (!name || name.length > 120 || !learningMode) {
      return json({
        error: 'Invalid profile data.',
        code: 'invalid_profile',
      }, 400);
    }

    try {
      const profile = await saveOttoUserProfile({
        userId: session.sub,
        name,
        gender,
        learningMode,
        onboardingCompleted: body.onboardingCompleted !== false,
      });

      return json({
        authenticated: true,
        userId: session.sub,
        profile,
      });
    } catch (error) {
      console.error('Failed to save OTTO profile:', error);

      return json({
        error: 'Profile could not be saved.',
        code: 'profile_save_failed',
      }, 503);
    }
  }

  return json(
    { error: 'Method not allowed' },
    405,
    { Allow: 'GET, PUT' }
  );
};

export const config = { path: '/api/profile' };
