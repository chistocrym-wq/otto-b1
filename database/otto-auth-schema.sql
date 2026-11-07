BEGIN;

CREATE OR REPLACE FUNCTION otto_a1.resolve_telegram_user(
  p_telegram_user_id text
)
RETURNS TABLE (
  user_id uuid,
  created boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, otto_a1, pg_temp
AS $$
DECLARE
  v_telegram_user_id text := btrim(COALESCE(p_telegram_user_id, ''));
  v_user_id uuid;
  v_new_user_id uuid;
BEGIN
  IF v_telegram_user_id !~ '^[0-9]{1,20}$' THEN
    RAISE EXCEPTION 'invalid_telegram_user_id';
  END IF;

  SELECT i.user_id
  INTO v_user_id
  FROM otto_a1.user_identities i
  WHERE i.provider = 'telegram'
    AND i.provider_user_id = v_telegram_user_id
  ORDER BY i.verified_at DESC NULLS LAST
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    UPDATE otto_a1.user_identities
    SET verified_at = COALESCE(verified_at, now())
    WHERE user_id = v_user_id
      AND provider = 'telegram'
      AND provider_user_id = v_telegram_user_id;

    RETURN QUERY SELECT v_user_id, false;
    RETURN;
  END IF;

  INSERT INTO otto_a1.users DEFAULT VALUES
  RETURNING id INTO v_new_user_id;

  BEGIN
    INSERT INTO otto_a1.user_identities (
      user_id,
      provider,
      provider_user_id,
      verified_at
    )
    VALUES (
      v_new_user_id,
      'telegram',
      v_telegram_user_id,
      now()
    );
  EXCEPTION
    WHEN unique_violation THEN
      DELETE FROM otto_a1.users
      WHERE id = v_new_user_id;

      SELECT i.user_id
      INTO v_user_id
      FROM otto_a1.user_identities i
      WHERE i.provider = 'telegram'
        AND i.provider_user_id = v_telegram_user_id
      ORDER BY i.verified_at DESC NULLS LAST
      LIMIT 1;

      IF v_user_id IS NULL THEN
        RAISE;
      END IF;

      UPDATE otto_a1.user_identities
      SET verified_at = COALESCE(verified_at, now())
      WHERE user_id = v_user_id
        AND provider = 'telegram'
        AND provider_user_id = v_telegram_user_id;

      RETURN QUERY SELECT v_user_id, false;
      RETURN;
  END;

  RETURN QUERY SELECT v_new_user_id, true;
END;
$$;

REVOKE ALL
  ON FUNCTION otto_a1.resolve_telegram_user(text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
  ON FUNCTION otto_a1.resolve_telegram_user(text)
  TO otto_a1_api;

COMMIT;
