import { env, json } from '../lib/telegram-access.js';

export default async (req) => {
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, { Allow: 'GET' });
  }

  const baseUrl = env('OTTO_SUPABASE_URL').replace(/\/+$/, '');
  const anonKey = env('OTTO_SUPABASE_ANON_KEY');
  const token = env('OTTO_SUPABASE_TOKEN');

  if (!baseUrl || !anonKey || !token) {
    return json({
      ok: false,
      error: 'Supabase configuration incomplete',
    }, 500);
  }

  try {
    const response = await fetch(
      `${baseUrl}/rest/v1/users?select=id&limit=1`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
          'Accept-Profile': 'otto_a1',
        },
      }
    );

    if (!response.ok) {
      return json({
        ok: false,
        status: response.status,
        error: 'Supabase request failed',
      }, 502);
    }

    const rows = await response.json();

    return json({
      ok: true,
      status: response.status,
      schema: 'otto_a1',
      rows: Array.isArray(rows) ? rows.length : null,
    });
  } catch {
    return json({
      ok: false,
      error: 'Supabase connection failed',
    }, 502);
  }
};

export const config = { path: '/api/supabase-health' };
