import { json } from '../lib/email-otp.js';
import { readSession } from '../lib/otto-session.js';
import { preview20Guest } from '../lib/preview20-guest-trial.js';
import { getPaymentEnvironment } from '../lib/payment-environment.js';
import {
  getOttoAccountVerifiedAt,
  getOttoSubscriptionEntitlement,
  getOttoUserProfile,
} from '../lib/otto-supabase.js';

export const TRIAL_MS = 3 * 24 * 60 * 60 * 1000;

function readDeveloperAllowlist() {
  try {
    const value = globalThis.Netlify?.env?.get?.('OTTO_DEVELOPER_USER_IDS');
    if (typeof value === 'string' && value.trim()) return value;
  } catch {
    // Fall through to process.env for local development/tests.
  }
  return typeof process !== 'undefined'
    ? String(process.env?.OTTO_DEVELOPER_USER_IDS || '')
    : '';
}

export function developerAccessAllowed(userId, allowlist = readDeveloperAllowlist()) {
  if (typeof userId !== 'string' || !userId.trim()) return false;
  const allowed = String(allowlist || '')
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  return allowed.includes(userId.trim());
}

export async function loadPaidSubscriptionState({
  userId,
  context,
  serverNow,
  getEntitlement = getOttoSubscriptionEntitlement,
}) {
  const environment = getPaymentEnvironment(context);

  if (!environment) {
    return {
      environment: null,
      subscriptionActive: false,
      subscriptionUntil: null,
    };
  }

  const entitlement = await getEntitlement(userId, environment);
  const rawSubscriptionUntil =
    typeof entitlement?.subscriptionUntil === 'string'
      ? entitlement.subscriptionUntil
      : null;

  const subscriptionUntilMs = Date.parse(rawSubscriptionUntil || '');
  const validSubscriptionUntil =
    Number.isFinite(subscriptionUntilMs)
      ? rawSubscriptionUntil
      : null;

  return {
    environment,
    subscriptionActive:
      Number.isFinite(subscriptionUntilMs) &&
      subscriptionUntilMs > serverNow,
    subscriptionUntil: validSubscriptionUntil,
  };
}

export function trainingAccessAllowed(trialActive, subscriptionActive) {
  return trialActive || subscriptionActive;
}

export default async (req, context) => {
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, { Allow: 'GET' });
  }

  const session = readSession(req);
  const serverNow = Date.now();

  if (!session) {
    try {
      const guest = await preview20Guest.read(req, context);
      if (guest) return json({
        authenticated: false, guest: true,
        serverNow: new Date(serverNow).toISOString(),
        trialActive: guest.active,
        trialStartedAt: new Date(guest.startedAt).toISOString(),
        trialEndsAt: new Date(guest.endsAt).toISOString(),
        subscriptionActive: false, subscriptionUntil: null,
        hasTrainingAccess: guest.active,
        reason: guest.active ? 'guest_trial_active' : 'guest_trial_expired'
      });
    } catch (error) {
      console.error('Preview20 guest access could not be verified:', error);
      return json({ code: 'guest_access_unavailable' }, 503);
    }
    return json({
      authenticated: false,
      serverNow: new Date(serverNow).toISOString(),
      trialActive: false,
      trialStartedAt: null,
      trialEndsAt: null,
      subscriptionActive: false,
      subscriptionUntil: null,
      hasTrainingAccess: false,
      reason: 'not_authenticated',
    });
  }

  try {
    const developerAccess = developerAccessAllowed(session.sub);
    const [verifiedAt, profile, paidSubscription] = await Promise.all([
      getOttoAccountVerifiedAt(session.sub),
      getOttoUserProfile(session.sub),
      loadPaidSubscriptionState({
        userId: session.sub,
        context,
        serverNow,
      }),
    ]);

    const trialSource = verifiedAt || profile?.createdAt || '';
    const effectiveTrialStart = await preview20Guest.registeredTrialStart(req, context, session.sub, trialSource);
    const trialStartedAtMs = Date.parse(effectiveTrialStart || '');

    if (!Number.isFinite(trialStartedAtMs)) {
      if (developerAccess) {
        return json({
          authenticated: true,
          userId: session.sub,
          serverNow: new Date(serverNow).toISOString(),
          trialActive: false,
          trialStartedAt: null,
          trialEndsAt: null,
          subscriptionActive: paidSubscription.subscriptionActive,
          subscriptionUntil: paidSubscription.subscriptionUntil,
          hasTrainingAccess: true,
          reason: 'developer_access',
        });
      }
      return json({
        error: 'Trial state is unavailable.',
        code: 'trial_start_missing',
      }, 503);
    }

    const trialEndsAtMs = trialStartedAtMs + TRIAL_MS;
    const trialActive = serverNow < trialEndsAtMs;
    const subscriptionActive = paidSubscription.subscriptionActive;
    const subscriptionUntil = paidSubscription.subscriptionUntil;
    const hasTrainingAccess =
      developerAccess ||
      trainingAccessAllowed(
        trialActive,
        subscriptionActive,
      );

    return json({
      authenticated: true,
      userId: session.sub,
      serverNow: new Date(serverNow).toISOString(),
      trialActive,
      trialStartedAt: new Date(trialStartedAtMs).toISOString(),
      trialEndsAt: new Date(trialEndsAtMs).toISOString(),
      subscriptionActive,
      subscriptionUntil,
      hasTrainingAccess,
      reason: developerAccess
        ? 'developer_access'
        : trialActive
          ? 'trial_active'
          : subscriptionActive
            ? 'subscription_active'
            : 'trial_expired',
    });
  } catch (error) {
    console.error('Failed to load OTTO account access:', error);
    return json({
      error: 'Access status is temporarily unavailable.',
      code: 'access_status_failed',
    }, 503);
  }
};

export const config = { path: '/api/account-access' };
