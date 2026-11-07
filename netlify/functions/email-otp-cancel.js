import {
  cancelChallenge,
  isValidEmail,
  json,
  normalizeEmail,
} from '../lib/email-otp.js';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });

  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const challengeId = typeof body.challengeId === 'string' ? body.challengeId.trim() : '';

  if (!isValidEmail(email) || !challengeId) {
    return json({ error: 'Некорректные данные.', code: 'invalid_request' }, 400);
  }

  const cancelled = await cancelChallenge({ challengeId, email });
  if (!cancelled) {
    return json({ error: 'Challenge does not match email.', code: 'challenge_mismatch' }, 409);
  }

  return json({ cancelled: true });
};

export const config = { path: '/api/email-otp-cancel' };
