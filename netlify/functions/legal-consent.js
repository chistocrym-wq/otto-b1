import { json } from '../lib/email-otp.js';
import {
  OTTO_LEGAL_VERSION,
  getOttoLegalAcceptance,
  saveOttoLegalAcceptance,
} from '../lib/otto-supabase.js';
import { readSession } from '../lib/otto-session.js';

function normalizeChannel(value) {
  return value === 'telegram' || value === 'pwa' ? value : 'web';
}

export default async (req) => {
  const session = readSession(req);

  if (!session) {
    return json({ authenticated: false, code: 'not_authenticated' }, 401);
  }

  if (req.method === 'GET') {
    try {
      const record = await getOttoLegalAcceptance(session.sub, OTTO_LEGAL_VERSION);

      return json({
        authenticated: true,
        accepted: Boolean(record),
        documentVersion: OTTO_LEGAL_VERSION,
        acceptedAt: record?.acceptedAt || null,
      });
    } catch (error) {
      console.error('Failed to load OTTO legal acceptance:', error);
      return json({
        error: 'Legal status is temporarily unavailable.',
        code: 'legal_status_failed',
      }, 503);
    }
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));

    if (
      body.accepted !== true ||
      body.documentVersion !== OTTO_LEGAL_VERSION
    ) {
      return json({
        error: 'Current legal consent is required.',
        code: 'legal_consent_required',
      }, 400);
    }

    try {
      const record = await saveOttoLegalAcceptance(session.sub, {
        documentVersion: OTTO_LEGAL_VERSION,
        acceptanceMethod:
          body.acceptanceMethod === 'checkbox+button'
            ? 'checkbox+button'
            : 'checkbox',
        channel: normalizeChannel(body.channel),
        source: 'authenticated_gate',
      });

      return json({
        accepted: true,
        documentVersion: OTTO_LEGAL_VERSION,
        acceptedAt: record.acceptedAt,
      });
    } catch (error) {
      console.error('Failed to save OTTO legal acceptance:', error);
      return json({
        error: 'Legal consent could not be saved.',
        code: 'legal_save_failed',
      }, 503);
    }
  }

  return json(
    { error: 'Method not allowed' },
    405,
    { Allow: 'GET, POST' },
  );
};

export const config = { path: '/api/legal-consent' };
