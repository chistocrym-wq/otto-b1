-- OTTO A1 teacher partnership PROPOSAL, PR20 ONLY.
-- DO NOT APPLY TO PRODUCTION. Supabase migration requires separate approval.
-- Prototype currently uses segregated preview-only Netlify Blobs.
BEGIN;
CREATE TABLE IF NOT EXISTS otto_a1.teacher_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES otto_a1.users(id),
  referral_code text NOT NULL UNIQUE CHECK (referral_code ~ '^OT-[A-Z2-9]{12}$'),
  display_name text NOT NULL,
  reward_minor integer NOT NULL DEFAULT 50000 CHECK (reward_minor=50000),
  is_blocked boolean NOT NULL DEFAULT false,
  contract_version text NOT NULL,
  contract_accepted_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS otto_a1.teacher_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES otto_a1.teacher_partners(id),
  referral_token_hash text NOT NULL UNIQUE,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  channel text NOT NULL CHECK (channel IN ('web','telegram')),
  linked_user_id uuid REFERENCES otto_a1.users(id),
  CHECK (expires_at > clicked_at)
);
CREATE INDEX IF NOT EXISTS teacher_referrals_owner_clicked ON otto_a1.teacher_referrals (teacher_id, clicked_at DESC);
CREATE TABLE IF NOT EXISTS otto_a1.teacher_students (
  user_id uuid PRIMARY KEY REFERENCES otto_a1.users(id),
  teacher_id uuid NOT NULL REFERENCES otto_a1.teacher_partners(id),
  referral_id uuid NOT NULL UNIQUE REFERENCES otto_a1.teacher_referrals(id),
  linked_at timestamptz NOT NULL DEFAULT now(),
  attribution_rule text NOT NULL DEFAULT 'first_valid_30d' CHECK (attribution_rule='first_valid_30d'),
  CONSTRAINT teacher_no_self_referral CHECK (user_id <> teacher_id)
);
CREATE INDEX IF NOT EXISTS teacher_students_teacher ON otto_a1.teacher_students(teacher_id);
CREATE TABLE IF NOT EXISTS otto_a1.teacher_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES otto_a1.teacher_partners(id),
  student_user_id uuid NOT NULL REFERENCES otto_a1.users(id),
  payment_transaction_id uuid NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'yookassa',
  provider_payment_id text NOT NULL,
  payment_environment text NOT NULL CHECK (payment_environment IN ('test','live')),
  payment_amount_minor bigint NOT NULL CHECK (payment_amount_minor > 0),
  commission_rule text NOT NULL DEFAULT 'fixed_500_rub_per_payment' CHECK (commission_rule='fixed_500_rub_per_payment'),
  commission_amount_minor bigint NOT NULL CHECK (commission_amount_minor >= 0),
  currency text NOT NULL DEFAULT 'RUB' CHECK(currency='RUB'),
  category text NOT NULL CHECK (category IN ('initial','renewal')),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','paid','reversed','disputed')),
  paid_at timestamptz,
  reversed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, payment_environment, provider_payment_id)
);
CREATE INDEX IF NOT EXISTS teacher_commissions_owner ON otto_a1.teacher_commissions(teacher_id,created_at DESC);
CREATE TABLE IF NOT EXISTS otto_a1.teacher_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES otto_a1.teacher_partners(id),
  payout_reference text NOT NULL UNIQUE,
  total_minor bigint NOT NULL CHECK(total_minor>0),
  currency text NOT NULL DEFAULT 'RUB' CHECK(currency='RUB'),
  status text NOT NULL CHECK(status IN ('requested','verified','processing','paid','failed','cancelled')),
  recipient_verified boolean NOT NULL DEFAULT false,
  payout_environment text NOT NULL CHECK(payout_environment IN ('test','live')),
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Permissions: runtime partner identity must always be resolved via signed
-- server session; never accept teacher_id from client as authentication.
-- No teacher SELECT on user_identities, learning_activity, user_state or
-- teacher_students: expose privacy-safe totals/aliases through server APIs.
REVOKE ALL ON
 otto_a1.teacher_partners,otto_a1.teacher_referrals,
 otto_a1.teacher_students,otto_a1.teacher_commissions,
 otto_a1.teacher_payouts
FROM PUBLIC,anon,authenticated;
-- Deployment checklist: audited SECURITY DEFINER service routines, grants only
-- to trusted API role, separate immutable commission event log and payout
-- allocations (many-to-many) before enabling LIVE operations.
ROLLBACK;
