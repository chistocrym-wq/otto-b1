import {
  OTP_RESEND_MS, OTP_TTL_MS, activateChallenge, createChallenge,
  discardChallenge, env, isValidEmail, json, normalizeEmail,
  releaseOtpCooldown, reserveOtpRequest, sendOtpEmail, verifyChallenge,
} from '../lib/email-otp.js';
import { readSession } from '../lib/otto-session.js';
import { setOttoVerifiedEmail } from '../lib/profile-email.js';

// This is deliberately separate from registration/login. No caller-supplied
// userId or Telegram initData is used to select the account being changed.
export default async (req) => {
  if (req.method !== 'POST') return json({ code: 'method_not_allowed' }, 405, { Allow: 'POST' });

  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin) return json({ code: 'invalid_origin' }, 403);
  if (!(req.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) {
    return json({ code: 'invalid_content_type' }, 415);
  }

  try {
    const session = readSession(req);
    if (!session) return json({ code: 'not_authenticated' }, 401);

    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) return json({ code: 'invalid_email' }, 400);
    if (body.action !== 'request' && body.action !== 'verify') {
      return json({ code: 'invalid_request' }, 400);
    }

    const apiKey = env('UNISENDER_GO_API_KEY');
    if (!apiKey) return json({ code: 'email_not_configured' }, 503);
    const context = { purpose: 'profile-email', userId: session.sub };

    if (body.action === 'request') {
      const fromEmail = normalizeEmail(env('UNISENDER_FROM_EMAIL'));
      if (!isValidEmail(fromEmail)) return json({ code: 'email_not_configured' }, 503);

      const reservation = await reserveOtpRequest(req, email);
      if (!reservation.allowed) {
        return json({ code: 'rate_limited', retryAfter: reservation.retryAfter }, 429,
          { 'Retry-After': String(reservation.retryAfter) });
      }

      const challenge = await createChallenge(email, apiKey, context);
      let sent;
      try {
        sent = await sendOtpEmail({
          email, code: challenge.code, challengeId: challenge.challengeId, apiKey, fromEmail,
        });
      } catch {
        sent = { ok: false };
      }
      if (!sent.ok) {
        await Promise.all([discardChallenge(challenge.challengeId), releaseOtpCooldown(email)]);
        return json({ code: 'send_failed' }, 502);
      }
      await activateChallenge(email, challenge.challengeId, reservation.previousChallengeId);
      return json({
        challengeId: challenge.challengeId,
        expiresIn: Math.floor(OTP_TTL_MS / 1000),
        resendAfter: Math.floor(OTP_RESEND_MS / 1000),
      });
    }

    const challengeId = typeof body.challengeId === 'string' ? body.challengeId.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!challengeId || !/^\d{6}$/u.test(code)) return json({ code: 'invalid_request' }, 400);

    const result = await verifyChallenge({ challengeId, email, code, apiKey, context });
    if (!result.ok) {
      const codes = {
        expired: [410, 'expired'], not_found: [410, 'expired'], used: [409, 'used'],
        too_many_attempts: [429, 'too_many_attempts'], wrong_context: [400, 'invalid_request'],
      };
      const [status, reason] = codes[result.reason] || [400, 'invalid_code'];
      return json({ code: reason, attemptsRemaining: result.attemptsRemaining }, status);
    }

    // Keep the current session and its UUID. Never create a user or merge accounts.
    await setOttoVerifiedEmail(session.sub, email);
    return json({ verified: true, userId: session.sub });
  } catch (error) {
    if (error?.message === 'email_in_use') return json({ code: 'email_in_use' }, 409);
    if (error?.message === 'email_identity_changed') return json({ code: 'email_identity_changed' }, 409);
    console.error('Failed to verify OTTO profile email:', {
      message: error?.message, status: error?.status, code: error?.payload?.code,
    });
    return json({ code: 'profile_email_failed' }, 503);
  }
};

export const config = { path: '/api/profile-email' };
