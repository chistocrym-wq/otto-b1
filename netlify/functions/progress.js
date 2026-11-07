import { json } from '../lib/email-otp.js';
import { readSession } from '../lib/otto-session.js';
import {
  getOttoLearningData,
  recordOttoLearningScore,
  resetOttoLearningData,
} from '../lib/otto-supabase.js';

export default async (req) => {
  const session = readSession(req);

  if (!session) {
    return json({
      authenticated: false,
      code: 'not_authenticated',
    }, 401);
  }

  if (req.method === 'GET') {
    try {
      const data = await getOttoLearningData(session.sub);

      return json({
        authenticated: true,
        ...data,
      });
    } catch (error) {
      console.error('Failed to load OTTO learning data:', error);

      return json({
        error: 'Learning data is temporarily unavailable.',
        code: 'progress_load_failed',
      }, 503);
    }
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));

    const activityId =
      typeof body.activityId === 'string'
        ? body.activityId.trim()
        : '';

    const moduleKey =
      typeof body.moduleKey === 'string'
        ? body.moduleKey.trim()
        : '';

    const score = Number(body.score);
    const total = Number(body.total);

    const durationSeconds = Math.max(
      0,
      Math.min(
        1800,
        Math.round(Number(body.durationSeconds) || 0)
      )
    );

    const occurredAt =
      typeof body.occurredAt === 'string' &&
      Number.isFinite(Date.parse(body.occurredAt))
        ? body.occurredAt
        : new Date().toISOString();

    if (
      !activityId ||
      activityId.length > 200 ||
      !moduleKey ||
      moduleKey.length > 100 ||
      !Number.isFinite(score) ||
      !Number.isFinite(total) ||
      total <= 0
    ) {
      return json({
        error: 'Invalid learning score.',
        code: 'invalid_progress',
      }, 400);
    }

    try {
      const result = await recordOttoLearningScore({
        userId: session.sub,
        activityId,
        moduleKey,
        score,
        total,
        durationSeconds,
        occurredAt,
      });

      return json({
        ok: true,
        result,
      });
    } catch (error) {
      console.error('Failed to save OTTO learning score:', error);

      return json({
        error: 'Learning score could not be saved.',
        code: 'progress_save_failed',
      }, 503);
    }
  }

  if (req.method === 'DELETE') {
    try {
      await resetOttoLearningData(session.sub);

      return json({
        ok: true,
      });
    } catch (error) {
      console.error('Failed to reset OTTO learning data:', error);

      return json({
        error: 'Learning data could not be reset.',
        code: 'progress_reset_failed',
      }, 503);
    }
  }

  return json(
    { error: 'Method not allowed' },
    405,
    { Allow: 'GET, POST, DELETE' }
  );
};

export const config = { path: '/api/progress' };
