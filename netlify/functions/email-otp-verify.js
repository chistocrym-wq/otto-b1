import {
  env,
  isValidEmail,
  json,
  normalizeEmail,
  verifyChallenge,
} from '../lib/email-otp.js';
import { verifyTelegramInitData } from '../lib/telegram-access.js';
import { getOttoVerifiedTelegramId, OTTO_LEGAL_VERSION, resolveVerifiedUser, saveOttoLegalAcceptance, touchOttoUserSession } from '../lib/otto-supabase.js';
import { createSessionCookie, readSession } from '../lib/otto-session.js';
import { preview20Guest } from '../lib/preview20-guest-trial.js';
import { teacherPilot } from '../lib/preview20-teachers.js';
import { getOttoAccountVerifiedAt } from '../lib/otto-supabase.js';
import { v20FeatureScope } from '../lib/v20-deployment.js';

export default async (req, context) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });

  const apiKey = env('UNISENDER_GO_API_KEY');
  if (!apiKey) {
    return json({ error: 'Email verification is not configured.', code: 'email_not_configured' }, 503);
  }

  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const challengeId = typeof body.challengeId === 'string' ? body.challengeId.trim() : '';
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const initData = typeof body.initData === 'string' ? body.initData : '';
  const legalAcceptance = body.legalAcceptance;

  if (!isValidEmail(email) || !challengeId || !/^\d{6}$/u.test(code)) {
    return json({ error: 'Некорректные данные проверки.', code: 'invalid_request' }, 400);
  }

  let result;
  try { result = await verifyChallenge({ challengeId, email, code, apiKey }); }
  catch (error) {
    console.error('OTTO OTP storage temporarily unavailable:', error?.name || 'unknown');
    return json({ error: 'Не удалось проверить код из-за временного сбоя сервера. Попробуйте позже.', code: 'otp_service_unavailable' }, 503, { 'Cache-Control': 'no-store' });
  }

  if (result.ok) {
    const telegramUser = initData ? verifyTelegramInitData(initData) : null;

    if (initData && !telegramUser) {
      return json({
        error: 'Telegram authorization is no longer valid. Reopen the Mini App and try again.',
        code: 'telegram_auth_invalid',
      }, 401);
    }

    let telegramUserId = telegramUser?.id ?? null;

    if (!telegramUserId) {
      const currentSession = readSession(req);
      if (currentSession) {
        try {
          const linkedTelegramId = await getOttoVerifiedTelegramId(currentSession.sub);
          const numericTelegramId = Number(linkedTelegramId);
          if (Number.isSafeInteger(numericTelegramId) && numericTelegramId > 0) {
            telegramUserId = numericTelegramId;
          }
        } catch (identityError) {
          console.error('Failed to resolve Telegram identity for OTP linking:', identityError?.name || 'unavailable');
          return json({ error: 'Сервер временно недоступен. Получите новый код после восстановления соединения.', code: 'account_sync_failed', recovery: 'request_new_otp' }, 503, { 'Cache-Control': 'no-store' });
        }
      }
    }

    try {
      const userId = await resolveVerifiedUser({
        email,
        telegramUserId,
      });

      // Ordinary registered Email logins must not depend on guest storage.
      // Only a valid signed guest cookie in an authorized guest environment
      // can trigger a trial-anchor lookup/link. Guest conversions still fail
      // closed if linking fails, so a guest cannot silently restart 72h trial.
      if (preview20Guest.hasGuestCookie(req, context)) {
        try {
          const verifiedAt = await getOttoAccountVerifiedAt(userId);
          await preview20Guest.linkNewRegistration(req, context, userId, verifiedAt);
        } catch (error) {
          console.error('Preview20 guest trial link failed:', error);
          return json({ code: 'guest_trial_link_unavailable' }, 503);
        }
      }

      // Referral attribution is optional and must not issue extra DB reads
      // when the server-side referral feature is disabled.
      if (v20FeatureScope(req, context, 'REFERRAL')) {
        try {
          const verifiedAt = await getOttoAccountVerifiedAt(userId);
          await teacherPilot.linkVerifiedUser(req, context, userId, verifiedAt);
        } catch (teacherError) {
          console.error('Preview20 teacher attribution unavailable:', teacherError);
        }
      }

      try {
        await touchOttoUserSession(userId);
      } catch (sessionVisitError) {
        console.error('Failed to record OTTO session visit after email verification:', sessionVisitError);
      }

      let legalPersisted = false;
      if (
        legalAcceptance?.accepted === true &&
        legalAcceptance?.documentVersion === OTTO_LEGAL_VERSION
      ) {
        try {
          await saveOttoLegalAcceptance(userId, {
            documentVersion: OTTO_LEGAL_VERSION,
            acceptanceMethod:
              legalAcceptance.acceptanceMethod === 'checkbox+button'
                ? 'checkbox+button'
                : 'checkbox',
            channel:
              legalAcceptance.channel === 'telegram' ||
              legalAcceptance.channel === 'pwa'
                ? legalAcceptance.channel
                : 'web',
            source: 'email_otp_registration',
          });
          legalPersisted = true;
        } catch (legalError) {
          console.error(
            'Failed to persist OTTO legal acceptance after OTP:',
            legalError,
          );
        }
      }

      return json({
        verified: true,
        userId,
        telegramLinked: Boolean(telegramUserId),
        legalPersisted,
      }, 200, {
        'Set-Cookie': createSessionCookie(userId),
      });
    } catch (error) {
      if (error?.message === 'identity_conflict') {
        console.warn('OTTO identity conflict detected during verified identity resolution.');
        return json({
          error: 'This email and Telegram account are already linked to different OTTO accounts.',
          code: 'identity_conflict',
        }, 409);
      }

      console.error('Failed to sync verified OTTO user:', error);
      return json({
        error: 'Сервер временно недоступен. Получите новый код после восстановления соединения.',
        code: 'account_sync_failed',
        recovery: 'request_new_otp',
      }, 503, { 'Cache-Control': 'no-store' });
    }
  }

  if (result.reason === 'expired') {
    return json({ error: 'Срок действия кода истёк. Отправьте новый код.', code: 'expired' }, 410);
  }
  if (result.reason === 'used') {
    return json({ error: 'Этот код уже использован. Отправьте новый код.', code: 'used' }, 409);
  }
  if (result.reason === 'too_many_attempts') {
    return json({ error: 'Слишком много неверных попыток. Отправьте новый код.', code: 'too_many_attempts' }, 429);
  }
  if (result.reason === 'not_found') {
    return json({ error: 'Срок действия кода истёк. Отправьте новый код.', code: 'expired' }, 410);
  }

  return json({
    error: 'Код не подходит. Проверьте цифры и попробуйте ещё раз.',
    code: 'invalid_code',
    attemptsRemaining: result.attemptsRemaining,
  }, 400);
};

export const config = { path: '/api/email-otp-verify' };
