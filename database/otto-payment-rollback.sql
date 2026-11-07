BEGIN;

REVOKE ALL
  ON FUNCTION otto_a1.confirm_payment_and_extend_subscription(
    uuid, text, text, text, uuid, integer, text, integer, text, boolean
  )
  FROM PUBLIC, anon, authenticated, otto_a1_api;

REVOKE ALL
  ON FUNCTION otto_a1.get_subscription_entitlement(uuid, text)
  FROM PUBLIC, anon, authenticated, otto_a1_api;

DROP FUNCTION IF EXISTS
  otto_a1.confirm_payment_and_extend_subscription(
    uuid, text, text, text, uuid, integer, text, integer, text, boolean
  );

DROP FUNCTION IF EXISTS
  otto_a1.get_subscription_entitlement(uuid, text);

DROP TABLE IF EXISTS
  otto_a1.payment_transactions;

DROP TABLE IF EXISTS
  otto_a1.subscription_entitlements;

COMMIT;
