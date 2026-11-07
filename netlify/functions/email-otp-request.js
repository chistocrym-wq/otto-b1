import {
  OTP_RESEND_MS,
  OTP_TTL_MS,
  activateChallenge,
  createChallenge,
  discardChallenge,
  env,
  isValidEmail,
  json,
  normalizeEmail,
  releaseOtpCooldown,
  reserveOtpRequest,
  sendOtpEmail,
} from '../lib/email-otp.js';
import { findUserByEmail, OTTO_LEGAL_VERSION } from '../lib/otto-supabase.js';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });

  const apiKey = env('UNISENDER_GO_API_KEY');
  const fromEmail = normalizeEmail(env('UNISENDER_FROM_EMAIL'));
  if (!apiKey || !isValidEmail(fromEmail)) {
    return json({ error: 'Email delivery is not configured.', code: 'email_not_configured' }, 503);
  }

  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const intent = body.intent === 'login' ? 'login' : 'register';
  const legalAcceptance = body.legalAcceptance;
  if (!isValidEmail(email)) {
    return json({ error: 'Некорректный email.', code: 'invalid_email' }, 400);
  }

  if (intent === 'register' && !(legalAcceptance?.accepted === true && legalAcceptance?.documentVersion === OTTO_LEGAL_VERSION)) {
    return json({ error: 'Необходимо согласие на обработку персональных данных.', code: 'legal_consent_required' }, 400);
  }

  let existingUserId = null;
  try {
    existingUserId = await findUserByEmail(email);
  } catch (error) {
    console.error('Failed to resolve OTTO email identity:', error?.name || 'unavailable');
    return json({
      error: 'Сервер аккаунтов временно недоступен. Попробуйте позже.',
      code: 'account_lookup_failed',
    }, 503, { 'Cache-Control': 'no-store' });
  }

  if (intent === 'register' && existingUserId) {
    return json({
      error: 'Этот e-mail уже зарегистрирован в OTTO.',
      code: 'email_registered',
    }, 409);
  }

  if (intent === 'login' && !existingUserId) {
    return json({
      error: 'Аккаунт с таким e-mail не найден.',
      code: 'account_not_found',
    }, 404);
  }

  const reservation = await reserveOtpRequest(req, email);
  if (!reservation.allowed) {
    return json({
      error: 'Слишком много запросов. Попробуйте позже.',
      code: 'rate_limited',
      retryAfter: reservation.retryAfter,
    }, 429, { 'Retry-After': String(reservation.retryAfter) });
  }

  const challenge = await createChallenge(email, apiKey);
  const sent = await sendOtpEmail({
    email,
    code: challenge.code,
    challengeId: challenge.challengeId,
    apiKey,
    fromEmail,
  });

  if (!sent.ok) {
    await Promise.all([
      discardChallenge(challenge.challengeId),
      releaseOtpCooldown(email),
    ]);
    return json({ error: 'Не удалось отправить код. Попробуйте ещё раз.', code: 'send_failed' }, 502);
  }

  await activateChallenge(email, challenge.challengeId, reservation.previousChallengeId);

  return json({
    challengeId: challenge.challengeId,
    expiresIn: Math.floor(OTP_TTL_MS / 1000),
    resendAfter: Math.floor(OTP_RESEND_MS / 1000),
  });
};

export const config = { path: '/api/email-otp-request' };
