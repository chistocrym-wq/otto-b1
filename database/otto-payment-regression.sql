BEGIN;

DO $regression$
DECLARE
  v_user uuid;
  v_unknown_user uuid := gen_random_uuid();
  v_ref1 uuid := gen_random_uuid();
  v_ref2 uuid := gen_random_uuid();
  v_ref3 uuid := gen_random_uuid();
  v_ref4 uuid := gen_random_uuid();
  v_payment1 text := 'regtest-' || gen_random_uuid()::text;
  v_payment2 text := 'regtest-' || gen_random_uuid()::text;
  v_payment3 text := 'regtest-' || gen_random_uuid()::text;
  v_payment4 text := 'regtest-' || gen_random_uuid()::text;
  v_bad_amount_payment text := 'regtest-' || gen_random_uuid()::text;
  v_bad_currency_payment text := 'regtest-' || gen_random_uuid()::text;
  v_unknown_user_payment text := 'regtest-' || gen_random_uuid()::text;
  v_mismatch_payment text := 'regtest-' || gen_random_uuid()::text;
  v_until1 timestamptz;
  v_until_duplicate timestamptz;
  v_until2 timestamptz;
  v_until3 timestamptz;
  v_until4 timestamptz;
  v_applied boolean;
  v_live_sentinel timestamptz;
  v_live_after timestamptz;
  v_read_test timestamptz;
  v_read_live timestamptz;
BEGIN
  SELECT u.id
  INTO v_user
  FROM otto_a1.users u
  ORDER BY u.created_at ASC, u.id ASC
  LIMIT 1;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'regression_requires_existing_otto_user';
  END IF;

  DELETE FROM otto_a1.subscription_entitlements
  WHERE user_id = v_user
    AND environment = 'test';

  v_live_sentinel := now() + interval '123 days';

  INSERT INTO otto_a1.subscription_entitlements (
    user_id, environment, subscription_until, updated_at
  )
  VALUES (
    v_user, 'live', v_live_sentinel, now()
  )
  ON CONFLICT (user_id, environment)
  DO UPDATE
  SET
    subscription_until = EXCLUDED.subscription_until,
    updated_at = EXCLUDED.updated_at;

  SELECT r.subscription_until, r.applied
  INTO v_until1, v_applied
  FROM otto_a1.confirm_payment_and_extend_subscription(
    v_user, 'test', 'yookassa', v_payment1, v_ref1,
    150000, 'RUB', 30, 'succeeded', true
  ) r;

  IF v_applied IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'regression_case_1_not_applied';
  END IF;

  IF v_until1 <> now() + interval '30 days' THEN
    RAISE EXCEPTION 'regression_case_1_wrong_until';
  END IF;

  SELECT r.subscription_until, r.applied
  INTO v_until_duplicate, v_applied
  FROM otto_a1.confirm_payment_and_extend_subscription(
    v_user, 'test', 'yookassa', v_payment1, v_ref1,
    150000, 'RUB', 30, 'succeeded', true
  ) r;

  IF v_applied IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'regression_case_2_duplicate_was_applied';
  END IF;

  IF v_until_duplicate <> v_until1 THEN
    RAISE EXCEPTION 'regression_case_2_result_changed';
  END IF;

  SELECT e.subscription_until
  INTO v_read_test
  FROM otto_a1.subscription_entitlements e
  WHERE e.user_id = v_user
    AND e.environment = 'test';

  IF v_read_test <> v_until1 THEN
    RAISE EXCEPTION 'regression_case_2_entitlement_changed';
  END IF;

  SELECT r.subscription_until, r.applied
  INTO v_until2, v_applied
  FROM otto_a1.confirm_payment_and_extend_subscription(
    v_user, 'test', 'yookassa', v_payment2, v_ref2,
    150000, 'RUB', 30, 'succeeded', true
  ) r;

  IF v_applied IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'regression_case_3_not_applied';
  END IF;

  IF v_until2 <> v_until1 + interval '30 days' THEN
    RAISE EXCEPTION 'regression_case_3_wrong_extension';
  END IF;

  UPDATE otto_a1.subscription_entitlements
  SET subscription_until = now() - interval '1 day'
  WHERE user_id = v_user
    AND environment = 'test';

  SELECT r.subscription_until, r.applied
  INTO v_until3, v_applied
  FROM otto_a1.confirm_payment_and_extend_subscription(
    v_user, 'test', 'yookassa', v_payment3, v_ref3,
    150000, 'RUB', 30, 'succeeded', true
  ) r;

  IF v_until3 <> now() + interval '30 days' THEN
    RAISE EXCEPTION 'regression_case_4_expired_wrong_until';
  END IF;

  UPDATE otto_a1.subscription_entitlements
  SET subscription_until = now() + interval '10 days'
  WHERE user_id = v_user
    AND environment = 'test';

  SELECT r.subscription_until, r.applied
  INTO v_until4, v_applied
  FROM otto_a1.confirm_payment_and_extend_subscription(
    v_user, 'test', 'yookassa', v_payment4, v_ref4,
    150000, 'RUB', 30, 'succeeded', true
  ) r;

  IF v_until4 <> now() + interval '40 days' THEN
    RAISE EXCEPTION 'regression_case_5_active_wrong_until';
  END IF;

  SELECT e.subscription_until
  INTO v_live_after
  FROM otto_a1.subscription_entitlements e
  WHERE e.user_id = v_user
    AND e.environment = 'live';

  IF v_live_after <> v_live_sentinel THEN
    RAISE EXCEPTION 'regression_case_6_live_was_modified';
  END IF;

  BEGIN
    PERFORM *
    FROM otto_a1.confirm_payment_and_extend_subscription(
      v_user, 'test', 'yookassa', v_bad_amount_payment, gen_random_uuid(),
      99999, 'RUB', 30, 'succeeded', true
    );
    RAISE EXCEPTION 'regression_case_7_wrong_amount_accepted';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'payment_amount_invalid' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    PERFORM *
    FROM otto_a1.confirm_payment_and_extend_subscription(
      v_user, 'test', 'yookassa', v_bad_currency_payment, gen_random_uuid(),
      150000, 'USD', 30, 'succeeded', true
    );
    RAISE EXCEPTION 'regression_case_8_wrong_currency_accepted';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'payment_currency_invalid' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    PERFORM *
    FROM otto_a1.confirm_payment_and_extend_subscription(
      v_unknown_user, 'test', 'yookassa', v_unknown_user_payment, gen_random_uuid(),
      150000, 'RUB', 30, 'succeeded', true
    );
    RAISE EXCEPTION 'regression_case_9_unknown_user_accepted';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'payment_user_not_found' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    PERFORM *
    FROM otto_a1.confirm_payment_and_extend_subscription(
      v_unknown_user, 'test', 'yookassa', v_payment1, v_ref1,
      150000, 'RUB', 30, 'succeeded', true
    );
    RAISE EXCEPTION 'regression_case_10_conflict_accepted';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'payment_identity_conflict' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    PERFORM *
    FROM otto_a1.confirm_payment_and_extend_subscription(
      v_user, 'live', 'yookassa', v_mismatch_payment, gen_random_uuid(),
      150000, 'RUB', 30, 'succeeded', true
    );
    RAISE EXCEPTION 'regression_case_11_environment_mismatch_accepted';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'payment_environment_mismatch' THEN
        RAISE;
      END IF;
  END;

  SELECT r.subscription_until
  INTO v_read_test
  FROM otto_a1.get_subscription_entitlement(v_user, 'test') r;

  SELECT r.subscription_until
  INTO v_read_live
  FROM otto_a1.get_subscription_entitlement(v_user, 'live') r;

  IF v_read_test = v_read_live THEN
    RAISE EXCEPTION 'regression_case_12_environment_read_not_isolated';
  END IF;

  RAISE NOTICE 'PAYMENT REGRESSION SUITE: ALL CASES PASSED';
END;
$regression$;

ROLLBACK;
