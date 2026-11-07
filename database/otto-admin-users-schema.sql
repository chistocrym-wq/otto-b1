BEGIN;

ALTER TABLE otto_a1.users
  ADD COLUMN IF NOT EXISTS last_session_at timestamptz;

CREATE OR REPLACE FUNCTION otto_a1.touch_user_session(
  p_user_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, otto_a1, pg_temp
AS $$
  UPDATE otto_a1.users
  SET last_session_at = now()
  WHERE id = p_user_id;
$$;

REVOKE ALL
  ON FUNCTION otto_a1.touch_user_session(uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
  ON FUNCTION otto_a1.touch_user_session(uuid)
  TO otto_a1_api;

CREATE OR REPLACE FUNCTION otto_a1.support_admin_users(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  email text,
  telegram_id text,
  registered_at timestamptz,
  training_seconds bigint,
  last_session_at timestamptz,
  total_count bigint
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = otto_a1, public
AS $$
  WITH users_base AS (
    SELECT
      u.id AS user_id,
      COALESCE(NULLIF(btrim(p.name), ''), 'Без имени') AS user_name,
      (
        SELECT i.provider_user_id
        FROM otto_a1.user_identities i
        WHERE i.user_id = u.id
          AND i.provider = 'email'
          AND i.verified_at IS NOT NULL
        ORDER BY i.verified_at DESC
        LIMIT 1
      ) AS email,
      (
        SELECT i.provider_user_id
        FROM otto_a1.user_identities i
        WHERE i.user_id = u.id
          AND i.provider = 'telegram'
          AND i.verified_at IS NOT NULL
        ORDER BY i.verified_at DESC
        LIMIT 1
      ) AS telegram_id,
      u.created_at AS registered_at,
      COALESCE((
        SELECT sum(GREATEST(COALESCE(a.duration_seconds, 0), 0))::bigint
        FROM otto_a1.learning_activity a
        WHERE a.user_id = u.id
      ), 0::bigint) AS training_seconds,
      u.last_session_at
    FROM otto_a1.users u
    LEFT JOIN otto_a1.user_profiles p ON p.user_id = u.id
  )
  SELECT
    b.user_id,
    b.user_name,
    b.email,
    b.telegram_id,
    b.registered_at,
    b.training_seconds,
    b.last_session_at,
    count(*) OVER () AS total_count
  FROM users_base b
  ORDER BY b.registered_at DESC, b.user_id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL
  ON FUNCTION otto_a1.support_admin_users(integer, integer)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
  ON FUNCTION otto_a1.support_admin_users(integer, integer)
  TO otto_a1_api;

NOTIFY pgrst, 'reload schema';

COMMIT;
