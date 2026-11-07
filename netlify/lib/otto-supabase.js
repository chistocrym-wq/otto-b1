import { env } from './telegram-access.js';

const SCHEMA = 'otto_a1';

function config() {
  const baseUrl = env('OTTO_SUPABASE_URL').replace(/\/+$/, '');
  const anonKey = env('OTTO_SUPABASE_ANON_KEY');
  const token = env('OTTO_SUPABASE_TOKEN');

  if (!baseUrl || !anonKey || !token) {
    throw new Error('otto_supabase_not_configured');
  }

  return { baseUrl, anonKey, token };
}

export async function resolveVerifiedUser({ email, telegramUserId = null }) {
  const { baseUrl, anonKey, token } = config();

  const response = await fetch(
    `${baseUrl}/rest/v1/rpc/resolve_verified_user`,
    {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Profile': SCHEMA,
        'Accept-Profile': SCHEMA,
      },
      body: JSON.stringify({
        p_email: email,
        p_telegram_user_id: telegramUserId == null ? null : String(telegramUserId),
      }),
    },
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      payload?.message === 'identity_conflict'
        ? 'identity_conflict'
        : 'otto_supabase_request_failed',
    );
    error.status = response.status;
    throw error;
  }

  if (typeof payload !== 'string' || !payload) {
    throw new Error('otto_supabase_invalid_response');
  }

  return payload;
}

export async function resolveTelegramUser(telegramUserId) {
  const existing = await findUserByTelegramId(telegramUserId);
  if (existing) return { userId: existing, created: false };

  const rows = await ottoSchemaRequest(
    '/rest/v1/rpc/resolve_telegram_user',
    {
      method: 'POST',
      body: {
        p_telegram_user_id: String(telegramUserId),
      },
    },
  );

  const row = Array.isArray(rows) ? rows[0] : rows;
  const userId =
    typeof row === 'string'
      ? row
      : typeof row?.user_id === 'string'
        ? row.user_id
        : '';

  if (!userId) {
    throw new Error('otto_supabase_invalid_response');
  }

  return {
    userId,
    created: row?.created === true,
  };
}

export async function findUserByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;

  const { baseUrl, anonKey, token } = config();

  const params = new URLSearchParams({
    select: 'user_id',
    provider: 'eq.email',
    provider_user_id: `eq.${normalizedEmail}`,
    verified_at: 'not.is.null',
    limit: '1',
  });

  const response = await fetch(
    `${baseUrl}/rest/v1/user_identities?${params.toString()}`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        'Accept-Profile': SCHEMA,
      },
    }
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error('otto_supabase_request_failed');
    error.status = response.status;
    throw error;
  }

  const userId = Array.isArray(payload) ? payload[0]?.user_id : null;
  return userId ? String(userId) : null;
}

export async function findUserByTelegramId(telegramUserId) {
  const { baseUrl, anonKey, token } = config();

  const params = new URLSearchParams({
    select: 'user_id',
    provider: 'eq.telegram',
    provider_user_id: `eq.${String(telegramUserId)}`,
    limit: '1',
  });

  const response = await fetch(
    `${baseUrl}/rest/v1/user_identities?${params.toString()}`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        'Accept-Profile': SCHEMA,
      },
    }
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error('otto_supabase_request_failed');
    error.status = response.status;
    throw error;
  }

  const userId = Array.isArray(payload) ? payload[0]?.user_id : null;
  return userId ? String(userId) : null;
}

async function ottoSchemaRequest(path, { method = 'GET', body, prefer } = {}) {
  const { baseUrl, anonKey, token } = config();

  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${token}`,
    'Accept-Profile': SCHEMA,
    'Content-Profile': SCHEMA,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (prefer) {
    headers.Prefer = prefer;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error('otto_supabase_request_failed');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function getOttoVerifiedEmail(userId) {
  const params = new URLSearchParams({
    select: 'provider_user_id',
    user_id: `eq.${String(userId)}`,
    provider: 'eq.email',
    verified_at: 'not.is.null',
    order: 'verified_at.desc',
    limit: '1',
  });

  const rows = await ottoSchemaRequest(
    `/rest/v1/user_identities?${params.toString()}`,
  );

  const email =
    Array.isArray(rows) && typeof rows[0]?.provider_user_id === 'string'
      ? rows[0].provider_user_id.trim().toLowerCase()
      : '';

  return email || null;
}

export async function getOttoVerifiedTelegramId(userId) {
  const params = new URLSearchParams({
    select: 'provider_user_id',
    user_id: `eq.${String(userId)}`,
    provider: 'eq.telegram',
    verified_at: 'not.is.null',
    order: 'verified_at.desc',
    limit: '1',
  });

  const rows = await ottoSchemaRequest(
    `/rest/v1/user_identities?${params.toString()}`,
  );

  const value =
    Array.isArray(rows) && typeof rows[0]?.provider_user_id === 'string'
      ? rows[0].provider_user_id.trim()
      : '';

  return value || null;
}

export async function getOttoAccountVerifiedAt(userId) {
  const params = new URLSearchParams({
    select: 'verified_at',
    user_id: `eq.${String(userId)}`,
    verified_at: 'not.is.null',
    order: 'verified_at.asc',
    limit: '1',
  });

  const rows = await ottoSchemaRequest(
    `/rest/v1/user_identities?${params.toString()}`
  );

  const verifiedAt = Array.isArray(rows) ? rows[0]?.verified_at : null;

  if (
    typeof verifiedAt !== 'string' ||
    !Number.isFinite(Date.parse(verifiedAt))
  ) {
    return null;
  }

  return verifiedAt;
}

export async function getOttoUserProfile(userId) {
  const profileParams = new URLSearchParams({
    select: 'name,gender,learning_mode,onboarding_completed,created_at,updated_at',
    user_id: `eq.${String(userId)}`,
    limit: '1',
  });

  const identityParams = new URLSearchParams({
    select: 'provider,provider_user_id,verified_at',
    user_id: `eq.${String(userId)}`,
  });

  const [profiles, identities] = await Promise.all([
    ottoSchemaRequest(`/rest/v1/user_profiles?${profileParams.toString()}`),
    ottoSchemaRequest(`/rest/v1/user_identities?${identityParams.toString()}`),
  ]);

  const profile = Array.isArray(profiles) ? profiles[0] : null;
  if (!profile) return null;

  const list = Array.isArray(identities) ? identities : [];

  const verifiedEmail = list.find(
    (item) => item?.provider === 'email' && item?.verified_at
  );

  const verifiedTelegram = list.find(
    (item) => item?.provider === 'telegram' && item?.verified_at
  );

  const anyEmail = list.find((item) => item?.provider === 'email');
  const anyTelegram = list.find((item) => item?.provider === 'telegram');

  const identity =
    verifiedEmail ||
    verifiedTelegram ||
    anyEmail ||
    anyTelegram ||
    null;

  const contactType =
    identity?.provider === 'telegram' ? 'telegram' : 'email';

  const contact =
    typeof identity?.provider_user_id === 'string'
      ? identity.provider_user_id
      : '';

  const contactVerified = Boolean(identity?.verified_at);

  return {
    name: typeof profile.name === 'string' ? profile.name : '',
    contactType,
    contact,
    contactVerified,
    authStatus: contactVerified ? 'verified' : 'guest',
    gender:
      profile.gender === 'female' || profile.gender === 'male'
        ? profile.gender
        : undefined,
    learningMode:
      profile.learning_mode === 'guided' ? 'guided' : 'direct',
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
    onboardingCompleted: profile.onboarding_completed === true,
  };
}

export async function saveOttoUserProfile({
  userId,
  name,
  gender,
  learningMode,
  onboardingCompleted = true,
}) {
  const params = new URLSearchParams({
    on_conflict: 'user_id',
  });

  await ottoSchemaRequest(
    `/rest/v1/user_profiles?${params.toString()}`,
    {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: {
        user_id: String(userId),
        name: String(name || '').trim(),
        gender:
          gender === 'female' || gender === 'male'
            ? gender
            : null,
        learning_mode:
          learningMode === 'guided' ? 'guided' : 'direct',
        onboarding_completed: onboardingCompleted === true,
        updated_at: new Date().toISOString(),
      },
    }
  );

  return getOttoUserProfile(userId);
}

export async function touchOttoUserSession(userId) {
  await ottoSchemaRequest(
    '/rest/v1/rpc/touch_user_session',
    {
      method: 'POST',
      body: { p_user_id: String(userId) },
    }
  );
}

export async function getOttoLearningData(userId) {
  const progressParams = new URLSearchParams({
    select: 'module_key,completed,total,best_score,last_score,attempts,answered,correct,recent_scores,updated_at',
    user_id: `eq.${String(userId)}`,
  });

  const activityParams = new URLSearchParams({
    select: 'activity_id,module_key,score,total,percent,occurred_at,duration_seconds',
    user_id: `eq.${String(userId)}`,
    order: 'occurred_at.desc',
    limit: '300',
  });

  const [progressRows, activityRows] = await Promise.all([
    ottoSchemaRequest(
      `/rest/v1/learning_progress?${progressParams.toString()}`
    ),
    ottoSchemaRequest(
      `/rest/v1/learning_activity?${activityParams.toString()}`
    ),
  ]);

  const progress = {};

  for (const row of Array.isArray(progressRows) ? progressRows : []) {
    if (!row?.module_key) continue;

    progress[String(row.module_key)] = {
      completed: Number(row.completed) || 0,
      total: Number(row.total) || 0,
      bestScore: Number(row.best_score) || 0,
      lastScore: Number(row.last_score) || 0,
      attempts: Number(row.attempts) || 0,
      answered:
        row.answered == null
          ? undefined
          : Number(row.answered),
      correct:
        row.correct == null
          ? undefined
          : Number(row.correct),
      recentScores: Array.isArray(row.recent_scores)
        ? row.recent_scores.map(Number).filter(Number.isFinite)
        : [],
    };
  }

  const activity = (Array.isArray(activityRows) ? activityRows : [])
    .map((row) => ({
      id: String(row.activity_id || ''),
      module: String(row.module_key || ''),
      score: Number(row.score) || 0,
      total: Number(row.total) || 0,
      percent: Number(row.percent) || 0,
      at:
        typeof row.occurred_at === 'string'
          ? row.occurred_at
          : new Date().toISOString(),
      durationSeconds:
        Number(row.duration_seconds) || 0,
    }))
    .filter((row) => row.id && row.module);

  return { progress, activity };
}

export async function recordOttoLearningScore({
  userId,
  activityId,
  moduleKey,
  score,
  total,
  durationSeconds = 0,
  occurredAt,
}) {
  return ottoSchemaRequest(
    '/rest/v1/rpc/record_learning_score',
    {
      method: 'POST',
      body: {
        p_user_id: String(userId),
        p_activity_id: String(activityId),
        p_module_key: String(moduleKey),
        p_score: Number(score),
        p_total: Number(total),
        p_duration_seconds: Number(durationSeconds) || 0,
        p_occurred_at: occurredAt || new Date().toISOString(),
      },
    }
  );
}

export async function resetOttoLearningData(userId) {
  return ottoSchemaRequest(
    '/rest/v1/rpc/reset_learning_data',
    {
      method: 'POST',
      body: {
        p_user_id: String(userId),
      },
    }
  );
}

export async function getOttoUserState(userId) {
  const params = new URLSearchParams({
    select: 'state_key,state_value,updated_at',
    user_id: `eq.${String(userId)}`,
  });

  const rows = await ottoSchemaRequest(
    `/rest/v1/user_state?${params.toString()}`
  );

  const state = {};

  for (const row of Array.isArray(rows) ? rows : []) {
    const key =
      typeof row?.state_key === 'string'
        ? row.state_key
        : '';

    const raw =
      row?.state_value &&
      typeof row.state_value === 'object' &&
      typeof row.state_value.raw === 'string'
        ? row.state_value.raw
        : null;

    if (key && raw !== null) {
      state[key] = raw;
    }
  }

  return state;
}

export async function getOttoUserStateRows(userId, keys = []) {
  const params = new URLSearchParams({
    select: 'state_key,state_value,updated_at',
    user_id: `eq.${String(userId)}`,
    order: 'updated_at.desc',
  });

  if (Array.isArray(keys) && keys.length) {
    const safeKeys = keys
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .map((value) => `"${value.replace(/"/g, '')}"`)
      .join(',');
    if (safeKeys) params.set('state_key', `in.(${safeKeys})`);
  }

  const rows = await ottoSchemaRequest(
    `/rest/v1/user_state?${params.toString()}`
  );

  return (Array.isArray(rows) ? rows : []).map((row) => ({
    state_key: typeof row?.state_key === 'string' ? row.state_key : '',
    state_value:
      row?.state_value &&
      typeof row.state_value === 'object' &&
      typeof row.state_value.raw === 'string'
        ? row.state_value.raw
        : '',
    updated_at:
      typeof row?.updated_at === 'string'
        ? row.updated_at
        : null,
  })).filter((row) => row.state_key);
}

export async function saveOttoUserState(userId, key, rawValue) {
  const params = new URLSearchParams({
    on_conflict: 'user_id,state_key',
  });

  await ottoSchemaRequest(
    `/rest/v1/user_state?${params.toString()}`,
    {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: {
        user_id: String(userId),
        state_key: String(key),
        state_value: {
          raw: String(rawValue),
        },
        updated_at: new Date().toISOString(),
      },
    }
  );
}

export async function deleteOttoUserState(userId, key) {
  const params = new URLSearchParams({
    user_id: `eq.${String(userId)}`,
    state_key: `eq.${String(key)}`,
  });

  await ottoSchemaRequest(
    `/rest/v1/user_state?${params.toString()}`,
    {
      method: 'DELETE',
      prefer: 'return=minimal',
    }
  );
}


export const OTTO_LEGAL_VERSION = '2026-09-23-v1';

function legalStateKey(version) {
  return `otto-legal-acceptance:${String(version)}`;
}

export async function getOttoLegalAcceptance(
  userId,
  version = OTTO_LEGAL_VERSION,
) {
  const params = new URLSearchParams({
    select: 'state_value,updated_at',
    user_id: `eq.${String(userId)}`,
    state_key: `eq.${legalStateKey(version)}`,
    limit: '1',
  });

  const rows = await ottoSchemaRequest(
    `/rest/v1/user_state?${params.toString()}`,
  );

  const raw = Array.isArray(rows)
    ? rows[0]?.state_value?.raw
    : null;

  if (typeof raw !== 'string') return null;

  try {
    const record = JSON.parse(raw);

    if (
      record?.accepted !== true ||
      record?.documentVersion !== version ||
      typeof record?.acceptedAt !== 'string'
    ) {
      return null;
    }

    return record;
  } catch {
    return null;
  }
}

export async function saveOttoLegalAcceptance(
  userId,
  {
    documentVersion = OTTO_LEGAL_VERSION,
    acceptanceMethod = 'checkbox',
    channel = 'web',
    source = 'authenticated_gate',
  } = {},
) {
  const existing =
    await getOttoLegalAcceptance(
      userId,
      documentVersion,
    );

  if (existing) return existing;

  const record = {
    accepted: true,
    documentVersion,
    documents: {
      personalDataConsent: documentVersion,
      privacyPolicy: documentVersion,
      userAgreement: documentVersion,
    },
    acceptedAt: new Date().toISOString(),
    acceptanceMethod: String(
      acceptanceMethod || 'checkbox',
    ),
    channel: String(channel || 'web'),
    source: String(source || 'authenticated_gate'),
  };

  await saveOttoUserState(
    userId,
    legalStateKey(documentVersion),
    JSON.stringify(record),
  );

  return record;
}


export async function getOttoSubscriptionEntitlement(userId, environment) {
  const rows = await ottoSchemaRequest(
    '/rest/v1/rpc/get_subscription_entitlement',
    {
      method: 'POST',
      body: {
        p_user_id: String(userId),
        p_environment: String(environment),
      },
    },
  );

  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return null;

  return {
    subscriptionUntil:
      typeof row.subscription_until === 'string'
        ? row.subscription_until
        : null,
    updatedAt:
      typeof row.updated_at === 'string'
        ? row.updated_at
        : null,
  };
}

export async function confirmOttoPaymentAndExtendSubscription({
  userId,
  environment,
  provider,
  providerPaymentId,
  paymentReference,
  amountMinor,
  currency,
  periodDays,
  providerStatus,
  isTest,
}) {
  const rows = await ottoSchemaRequest(
    '/rest/v1/rpc/confirm_payment_and_extend_subscription',
    {
      method: 'POST',
      body: {
        p_user_id: String(userId),
        p_environment: String(environment),
        p_provider: String(provider),
        p_provider_payment_id: String(providerPaymentId),
        p_payment_reference: String(paymentReference),
        p_amount_minor: Number(amountMinor),
        p_currency: String(currency),
        p_period_days: Number(periodDays),
        p_provider_status: String(providerStatus),
        p_is_test: isTest === true,
      },
    },
  );

  const row = Array.isArray(rows) ? rows[0] : null;

  if (
    !row ||
    typeof row.environment !== 'string' ||
    typeof row.provider_payment_id !== 'string' ||
    typeof row.subscription_until !== 'string' ||
    typeof row.applied !== 'boolean'
  ) {
    throw new Error('otto_supabase_invalid_response');
  }

  return {
    environment: row.environment,
    providerPaymentId: row.provider_payment_id,
    subscriptionUntil: row.subscription_until,
    applied: row.applied,
  };
}
