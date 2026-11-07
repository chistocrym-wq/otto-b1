BEGIN;

CREATE TABLE otto_a1.subscription_entitlements (
  user_id uuid NOT NULL
    REFERENCES otto_a1.users(id)
    ON DELETE CASCADE,
  environment text NOT NULL
    CHECK (environment IN ('test', 'live')),
  subscription_until timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, environment)
);

CREATE TABLE otto_a1.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL
    REFERENCES otto_a1.users(id)
    ON DELETE RESTRICT,
  environment text NOT NULL
    CHECK (environment IN ('test', 'live')),
  provider text NOT NULL
    CHECK (provider = 'yookassa'),
  provider_payment_id text NOT NULL
    CHECK (char_length(btrim(provider_payment_id)) BETWEEN 1 AND 160),
  payment_reference uuid NOT NULL,
  amount_minor integer NOT NULL
    CHECK (amount_minor = 150000),
  currency text NOT NULL
    CHECK (currency = 'RUB'),
  period_days integer NOT NULL
    CHECK (period_days = 30),
  provider_status text NOT NULL
    CHECK (provider_status = 'succeeded'),
  is_test boolean NOT NULL,
  subscription_until_after timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT payment_transactions_environment_test_check
    CHECK (
      (environment = 'test' AND is_test = true)
      OR
      (environment = 'live' AND is_test = false)
    ),

  CONSTRAINT payment_transactions_provider_payment_unique
    UNIQUE (provider, provider_payment_id),

  CONSTRAINT payment_transactions_reference_unique
    UNIQUE (payment_reference)
);

CREATE INDEX payment_transactions_user_environment_confirmed_idx
  ON otto_a1.payment_transactions (
    user_id,
    environment,
    confirmed_at DESC
  );

ALTER TABLE otto_a1.subscription_entitlements
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE otto_a1.payment_transactions
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL
  ON TABLE otto_a1.subscription_entitlements
  FROM PUBLIC;

REVOKE ALL
  ON TABLE otto_a1.payment_transactions
  FROM PUBLIC;

REVOKE ALL
  ON TABLE otto_a1.subscription_entitlements
  FROM anon, authenticated, otto_a1_api;

REVOKE ALL
  ON TABLE otto_a1.payment_transactions
  FROM anon, authenticated, otto_a1_api;

GRANT USAGE
  ON SCHEMA otto_a1
  TO otto_a1_api;

CREATE OR REPLACE FUNCTION
otto_a1.get_subscription_entitlement(
  p_user_id uuid,
  p_environment text
)
RETURNS TABLE (
  subscription_until timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, otto_a1, pg_temp
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'subscription_user_invalid';
  END IF;

  IF p_environment NOT IN ('test', 'live') THEN
    RAISE EXCEPTION 'subscription_environment_invalid';
  END IF;

  RETURN QUERY
  SELECT
    e.subscription_until,
    e.updated_at
  FROM otto_a1.subscription_entitlements e
  WHERE e.user_id = p_user_id
    AND e.environment = p_environment;
END;
$$;

CREATE OR REPLACE FUNCTION
otto_a1.confirm_payment_and_extend_subscription(
  p_user_id uuid,
  p_environment text,
  p_provider text,
  p_provider_payment_id text,
  p_payment_reference uuid,
  p_amount_minor integer,
  p_currency text,
  p_period_days integer,
  p_provider_status text,
  p_is_test boolean
)
RETURNS TABLE (
  environment text,
  provider_payment_id text,
  subscription_until timestamptz,
  applied boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, otto_a1, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_payment_id text;
  v_environment text;
  v_provider text;
  v_currency text;
  v_status text;
  v_existing otto_a1.payment_transactions%ROWTYPE;
  v_current_until timestamptz;
  v_new_until timestamptz;
BEGIN
  v_payment_id := btrim(COALESCE(p_provider_payment_id, ''));
  v_environment := lower(btrim(COALESCE(p_environment, '')));
  v_provider := lower(btrim(COALESCE(p_provider, '')));
  v_currency := upper(btrim(COALESCE(p_currency, '')));
  v_status := lower(btrim(COALESCE(p_provider_status, '')));

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'payment_user_invalid';
  END IF;

  IF v_environment NOT IN ('test', 'live') THEN
    RAISE EXCEPTION 'payment_environment_invalid';
  END IF;

  IF p_is_test IS NULL THEN
    RAISE EXCEPTION 'payment_test_flag_invalid';
  END IF;

  IF
    (v_environment = 'test' AND p_is_test <> true)
    OR
    (v_environment = 'live' AND p_is_test <> false)
  THEN
    RAISE EXCEPTION 'payment_environment_mismatch';
  END IF;

  IF v_provider <> 'yookassa' THEN
    RAISE EXCEPTION 'payment_provider_invalid';
  END IF;

  IF v_payment_id = '' THEN
    RAISE EXCEPTION 'payment_provider_id_invalid';
  END IF;

  IF p_payment_reference IS NULL THEN
    RAISE EXCEPTION 'payment_reference_invalid';
  END IF;

  IF p_amount_minor <> 150000 THEN
    RAISE EXCEPTION 'payment_amount_invalid';
  END IF;

  IF v_currency <> 'RUB' THEN
    RAISE EXCEPTION 'payment_currency_invalid';
  END IF;

  IF p_period_days <> 30 THEN
    RAISE EXCEPTION 'payment_period_invalid';
  END IF;

  IF v_status <> 'succeeded' THEN
    RAISE EXCEPTION 'payment_status_invalid';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_provider || ':payment:' || v_payment_id, 0)
  );

  SELECT *
  INTO v_existing
  FROM otto_a1.payment_transactions t
  WHERE t.provider = v_provider
    AND t.provider_payment_id = v_payment_id
  FOR UPDATE;

  IF FOUND THEN
    IF
      v_existing.user_id <> p_user_id
      OR v_existing.environment <> v_environment
      OR v_existing.payment_reference <> p_payment_reference
      OR v_existing.amount_minor <> p_amount_minor
      OR v_existing.currency <> v_currency
      OR v_existing.period_days <> p_period_days
      OR v_existing.provider_status <> v_status
      OR v_existing.is_test <> p_is_test
    THEN
      RAISE EXCEPTION 'payment_identity_conflict';
    END IF;

    RETURN QUERY
    SELECT
      v_existing.environment,
      v_existing.provider_payment_id,
      v_existing.subscription_until_after,
      false;

    RETURN;
  END IF;

  PERFORM 1
  FROM otto_a1.users u
  WHERE u.id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_user_not_found';
  END IF;

  PERFORM 1
  FROM otto_a1.payment_transactions t
  WHERE t.payment_reference = p_payment_reference;

  IF FOUND THEN
    RAISE EXCEPTION 'payment_reference_conflict';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'entitlement:' || p_user_id::text || ':' || v_environment,
      0
    )
  );

  SELECT e.subscription_until
  INTO v_current_until
  FROM otto_a1.subscription_entitlements e
  WHERE e.user_id = p_user_id
    AND e.environment = v_environment
  FOR UPDATE;

  v_new_until :=
    GREATEST(COALESCE(v_current_until, v_now), v_now)
    + make_interval(days => p_period_days);

  INSERT INTO otto_a1.payment_transactions (
    user_id,
    environment,
    provider,
    provider_payment_id,
    payment_reference,
    amount_minor,
    currency,
    period_days,
    provider_status,
    is_test,
    subscription_until_after,
    created_at,
    confirmed_at
  )
  VALUES (
    p_user_id,
    v_environment,
    v_provider,
    v_payment_id,
    p_payment_reference,
    p_amount_minor,
    v_currency,
    p_period_days,
    v_status,
    p_is_test,
    v_new_until,
    v_now,
    v_now
  );

  INSERT INTO otto_a1.subscription_entitlements (
    user_id,
    environment,
    subscription_until,
    updated_at
  )
  VALUES (
    p_user_id,
    v_environment,
    v_new_until,
    v_now
  )
  ON CONFLICT ON CONSTRAINT subscription_entitlements_pkey
  DO UPDATE
  SET
    subscription_until = EXCLUDED.subscription_until,
    updated_at = EXCLUDED.updated_at;

  RETURN QUERY
  SELECT
    v_environment,
    v_payment_id,
    v_new_until,
    true;
END;
$$;

REVOKE ALL
  ON FUNCTION otto_a1.get_subscription_entitlement(uuid, text)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL
  ON FUNCTION otto_a1.confirm_payment_and_extend_subscription(
    uuid, text, text, text, uuid, integer, text, integer, text, boolean
  )
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
  ON FUNCTION otto_a1.get_subscription_entitlement(uuid, text)
  TO otto_a1_api;

GRANT EXECUTE
  ON FUNCTION otto_a1.confirm_payment_and_extend_subscription(
    uuid, text, text, text, uuid, integer, text, integer, text, boolean
  )
  TO otto_a1_api;

COMMIT;
