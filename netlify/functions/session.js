import { json } from '../lib/email-otp.js';
import { preview20Guest } from '../lib/preview20-guest-trial.js';
import { teacherPilot } from '../lib/preview20-teachers.js';
import { v20FeatureScope } from '../lib/v20-deployment.js';
import { getOttoAccountVerifiedAt, getOttoVerifiedEmail } from '../lib/otto-supabase.js';
import {
  verifyTelegramInitData,
  verifyTelegramLoginData,
} from '../lib/telegram-access.js';
import {
  findUserByTelegramId,
  getOttoVerifiedTelegramId,
  resolveTelegramUser,
  touchOttoUserSession,
} from '../lib/otto-supabase.js';
import {
  clearSessionCookie,
  createSessionCookie,
  readSession,
} from '../lib/otto-session.js';

async function recordSessionVisit(userId) {
  try {
    await touchOttoUserSession(userId);
  } catch (error) {
    console.error('Failed to record OTTO session visit:', error);
  }
}

async function sessionPayload(session) {
  let telegramUserId = null;
  let verifiedEmail = null;
  try {
    verifiedEmail = await getOttoVerifiedEmail(session.sub);
  } catch (error) {
    console.error('Failed to resolve verified email for OTTO session:', error);
  }

  try {
    const raw = await getOttoVerifiedTelegramId(session.sub);
    if (raw && /^\d+$/u.test(raw)) {
      const numeric = Number(raw);
      if (Number.isSafeInteger(numeric) && numeric > 0) telegramUserId = numeric;
    }
  } catch (error) {
    console.error('Failed to resolve Telegram identity for OTTO session:', error);
  }

  const payload = {
    authenticated: true,
    userId: session.sub,
    telegramUserId,
  };

  const normalizedEmail =
    typeof verifiedEmail === 'string'
      ? verifiedEmail.trim().toLowerCase()
      : '';

  // Keep the long-standing session payload backward-compatible for Telegram-only
  // accounts/tests. Expose verifiedEmail only when it is actually an e-mail.
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(normalizedEmail)) {
    payload.verifiedEmail = normalizedEmail;
  }

  return payload;
}

export default async (req, context) => {
  if (req.method === 'GET') {
    const session = readSession(req);

    if (!session) {
      return json({ authenticated: false });
    }

    const shouldRecordVisit =
      new URL(req.url).searchParams.get('touch') === '1';

    if (shouldRecordVisit) {
      await recordSessionVisit(session.sub);
    }

    return json(await sessionPayload(session));
  }

  if (req.method === 'DELETE') {
    return json({ authenticated: false, loggedOut: true }, 200, {
      'Set-Cookie': clearSessionCookie(),
    });
  }


  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const initData = typeof body.initData === 'string' ? body.initData : '';
    const telegramAuth =
      body.telegramAuth && typeof body.telegramAuth === 'object'
        ? body.telegramAuth
        : null;
    const createIfMissing = body.createIfMissing === true;

    if (!initData && !telegramAuth) {
      return json({
        authenticated: false,
        code: 'telegram_auth_missing',
      }, 400);
    }

    const telegramUser = initData
      ? verifyTelegramInitData(initData)
      : verifyTelegramLoginData(telegramAuth);

    if (!telegramUser) {
      return json({
        authenticated: false,
        code: 'telegram_auth_invalid',
      }, 401);
    }

    try {
      const existingUserId = await findUserByTelegramId(telegramUser.id);

      if (!existingUserId && !createIfMissing) {
        return json({
          authenticated: false,
          code: 'account_not_found',
          telegramUserId: telegramUser.id,
        }, 404);
      }

      const resolved = existingUserId
        ? { userId: existingUserId, created: false }
        : await resolveTelegramUser(telegramUser.id);

      // New Telegram signups must not depend on Preview20 services when
      // their feature flags are disabled. Ordinary Mini App sessions retain
      // the existing ID, signed cookie, trial and paid access unchanged.
      if (resolved.created === true) {
        if (preview20Guest.hasGuestCookie(req, context)) {
          // Preserve the original guest trial anchor; if conversion fails,
          // do not issue a new-session cookie with a fresh 72-hour trial.
          const verifiedAt = await getOttoAccountVerifiedAt(resolved.userId);
          await preview20Guest.linkNewRegistration(req, context, resolved.userId, verifiedAt);
        }
        if (v20FeatureScope(req, context, 'REFERRAL')) {
          try {
            const verifiedAt = await getOttoAccountVerifiedAt(resolved.userId);
            await teacherPilot.linkVerifiedUser(req, context, resolved.userId, verifiedAt);
          } catch (error) {
            console.warn('Preview20 teacher attribution unavailable', error);
          }
        }
      }
      await recordSessionVisit(resolved.userId);

      return json({
        authenticated: true,
        userId: resolved.userId,
        telegramUserId: telegramUser.id,
        created: resolved.created === true,
      }, 200, {
        'Set-Cookie': createSessionCookie(resolved.userId),
      });
    } catch (error) {
      console.error('Failed to bootstrap OTTO Telegram session:', error);

      return json({
        authenticated: false,
        code: 'session_bootstrap_failed',
      }, 503);
    }
  }

  return json(
    { error: 'Method not allowed' },
    405,
    { Allow: 'GET, POST, DELETE' }
  );
};

export const config = { path: '/api/session' };
