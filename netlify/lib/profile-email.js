import { env } from './email-otp.js';

// Same production credentials/schema as otto-supabase.js; no Supabase Auth or
// generic signup resolver is involved in an authenticated profile email change.
async function identityRequest(path, { method = 'GET', body, prefer } = {}) {
  const baseUrl = env('OTTO_SUPABASE_URL').replace(/\/+$/, '');
  const anonKey = env('OTTO_SUPABASE_ANON_KEY');
  const token = env('OTTO_SUPABASE_TOKEN');
  if (!baseUrl || !anonKey || !token) throw new Error('otto_supabase_not_configured');
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      apikey: anonKey, Authorization: `Bearer ${token}`,
      'Accept-Profile': 'otto_a1', 'Content-Profile': 'otto_a1',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(prefer ? { Prefer: prefer } : {}),
    },
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

// Change only the email identity of an authenticated OTTO UUID. The generic
// signup resolver cannot do this safely for an email-only session (it takes no
// target userId). Do not upsert on provider/email: that could reassign an owner.
export async function setOttoVerifiedEmail(userId, email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(normalizedEmail) || normalizedEmail.length > 254) {
    throw new Error('invalid_email');
  }
  const ownParams = new URLSearchParams({
    select: 'user_id,provider_user_id,verified_at',
    user_id: `eq.${String(userId)}`, provider: 'eq.email', limit: '2',
  });
  const ownerParams = new URLSearchParams({
    select: 'user_id', provider: 'eq.email',
    provider_user_id: `eq.${normalizedEmail}`, limit: '2',
  });
  const [ownRows, owners] = await Promise.all([
    identityRequest(`/rest/v1/user_identities?${ownParams}`),
    identityRequest(`/rest/v1/user_identities?${ownerParams}`),
  ]);
  if (!Array.isArray(ownRows) || !Array.isArray(owners)) throw new Error('otto_supabase_invalid_response');
  if (owners.some((row) => row.user_id !== String(userId))) throw new Error('email_in_use');
  // Ambiguous historical identities must be diagnosed, not silently deleted.
  if (ownRows.length > 1) throw new Error('email_identity_changed');
  const current = ownRows[0];
  if (current?.provider_user_id === normalizedEmail && current.verified_at) return;

  let rows;
  try {
    if (current) {
      const params = new URLSearchParams({
        user_id: `eq.${String(userId)}`, provider: 'eq.email',
        provider_user_id: `eq.${current.provider_user_id}`,
      });
      rows = await identityRequest(`/rest/v1/user_identities?${params}`, {
        method: 'PATCH', prefer: 'return=representation',
        body: { provider_user_id: normalizedEmail, verified_at: new Date().toISOString() },
      });
    } else {
      rows = await identityRequest('/rest/v1/user_identities', {
        method: 'POST', prefer: 'return=representation',
        body: {
          user_id: String(userId), provider: 'email',
          provider_user_id: normalizedEmail, verified_at: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    // A concurrent claimant must not turn into an account merge.
    if (error?.payload?.code === '23505') throw new Error('email_in_use');
    throw error;
  }
  if (!Array.isArray(rows) || rows.length !== 1 ||
      rows[0].user_id !== String(userId) || rows[0].provider_user_id !== normalizedEmail) {
    throw new Error('email_identity_changed');
  }
}
