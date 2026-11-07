-- PR20 isolated teacher commission ledger migration. NEVER run on Production without GO.
-- Requires otto_a1.payment_transactions and otto_a1.users already installed.
BEGIN;
CREATE TABLE IF NOT EXISTS otto_a1.teacher_accounting_partners(
  partner_id uuid PRIMARY KEY REFERENCES otto_a1.users(id),
  referral_code text NOT NULL UNIQUE CHECK(referral_code ~ '^OT-[A-Z2-9]{12}$'),
  terms_version text NOT NULL CHECK(length(terms_version)>0),
  registered_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS otto_a1.teacher_accounting_students(
  student_id uuid PRIMARY KEY REFERENCES otto_a1.users(id),
  partner_id uuid NOT NULL REFERENCES otto_a1.teacher_accounting_partners(partner_id),
  click_id uuid NOT NULL UNIQUE,
  clicked_at timestamptz NOT NULL,
  linked_at timestamptz NOT NULL,
  CHECK (student_id<>partner_id),
  CHECK (linked_at>=clicked_at),
  CHECK (linked_at<=clicked_at+interval '30 days')
);
CREATE TABLE IF NOT EXISTS otto_a1.teacher_accounting_commissions(
  payment_transaction_id uuid PRIMARY KEY REFERENCES otto_a1.payment_transactions(id),
  partner_id uuid NOT NULL REFERENCES otto_a1.teacher_accounting_partners(partner_id),
  student_id uuid NOT NULL REFERENCES otto_a1.users(id),
  environment text NOT NULL CHECK(environment IN ('test','live')),
  provider_payment_id text NOT NULL,
  category text NOT NULL CHECK(category IN ('initial','renewal')),
  amount_minor integer NOT NULL DEFAULT 50000 CHECK(amount_minor=50000),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','reversed','disputed','paid','review')),
  reversed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(environment,provider_payment_id)
);
CREATE TABLE IF NOT EXISTS otto_a1.teacher_accounting_refunds(
  provider_refund_id text PRIMARY KEY,
  payment_transaction_id uuid NOT NULL REFERENCES otto_a1.payment_transactions(id),
  amount_minor integer NOT NULL CHECK(amount_minor>0),
  environment text NOT NULL CHECK(environment IN ('test','live')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS teacher_accounting_commissions_partner_idx
  ON otto_a1.teacher_accounting_commissions(partner_id,created_at DESC);
CREATE INDEX IF NOT EXISTS teacher_accounting_refunds_payment_idx
  ON otto_a1.teacher_accounting_refunds(payment_transaction_id);
ALTER TABLE otto_a1.teacher_accounting_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE otto_a1.teacher_accounting_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE otto_a1.teacher_accounting_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE otto_a1.teacher_accounting_refunds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON otto_a1.teacher_accounting_partners,otto_a1.teacher_accounting_students,
 otto_a1.teacher_accounting_commissions,otto_a1.teacher_accounting_refunds
 FROM PUBLIC,anon,authenticated,otto_a1_api;

CREATE OR REPLACE FUNCTION otto_a1.teacher_accounting_register_partner(
 p_partner_id uuid,p_referral_code text,p_terms_version text,p_registered_at timestamptz
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,otto_a1,pg_temp AS $$
DECLARE old otto_a1.teacher_accounting_partners%ROWTYPE;
BEGIN
 IF p_partner_id IS NULL OR p_referral_code !~ '^OT-[A-Z2-9]{12}$'
 OR length(coalesce(p_terms_version,''))=0 OR p_registered_at IS NULL
 THEN RAISE EXCEPTION 'invalid_partner';END IF;
 INSERT INTO otto_a1.teacher_accounting_partners(partner_id,referral_code,terms_version,registered_at)
 VALUES(p_partner_id,p_referral_code,p_terms_version,p_registered_at)
 ON CONFLICT(partner_id) DO NOTHING;
 SELECT * INTO old FROM otto_a1.teacher_accounting_partners WHERE partner_id=p_partner_id;
 IF old.referral_code IS DISTINCT FROM p_referral_code OR old.terms_version IS DISTINCT FROM p_terms_version
 THEN RAISE EXCEPTION 'partner_conflict';END IF;
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION otto_a1.teacher_accounting_link_student(
 p_student_id uuid,p_partner_id uuid,p_click_id uuid,p_clicked_at timestamptz,p_linked_at timestamptz
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,otto_a1,pg_temp AS $$
DECLARE old otto_a1.teacher_accounting_students%ROWTYPE;
BEGIN
 IF p_student_id IS NULL OR p_partner_id IS NULL OR p_student_id=p_partner_id
 OR p_click_id IS NULL OR p_clicked_at IS NULL OR p_linked_at IS NULL
 OR p_linked_at<p_clicked_at OR p_linked_at>p_clicked_at+interval '30 days'
 OR p_clicked_at<now()-interval '90 days' OR p_linked_at>now()+interval '1 minute'
 THEN RAISE EXCEPTION 'invalid_attribution';END IF;
 -- No retroactive attribution: registration must follow the click, and
 -- the candidate must have no earlier confirmed payment.
 IF EXISTS(SELECT 1 FROM otto_a1.payment_transactions
  WHERE user_id=p_student_id AND confirmed_at<=p_linked_at)
 THEN RETURN false;END IF;
 INSERT INTO otto_a1.teacher_accounting_students(student_id,partner_id,click_id,clicked_at,linked_at)
 VALUES(p_student_id,p_partner_id,p_click_id,p_clicked_at,p_linked_at)
 ON CONFLICT(student_id) DO NOTHING;
 SELECT * INTO old FROM otto_a1.teacher_accounting_students WHERE student_id=p_student_id;
 RETURN old.partner_id=p_partner_id AND old.click_id=p_click_id;
END $$;

CREATE OR REPLACE FUNCTION otto_a1.teacher_accounting_credit_payment(
 p_environment text,p_payment_id text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,otto_a1,pg_temp AS $$
DECLARE tx otto_a1.payment_transactions%ROWTYPE; attributed otto_a1.teacher_accounting_students%ROWTYPE;
BEGIN
 IF p_environment NOT IN ('test','live') OR length(coalesce(p_payment_id,''))=0 THEN RETURN false;END IF;
 SELECT * INTO tx FROM otto_a1.payment_transactions t WHERE t.environment=p_environment
 AND t.provider='yookassa' AND t.provider_payment_id=p_payment_id AND t.provider_status='succeeded'
 AND t.amount_minor=150000 AND t.currency='RUB' AND
 ((t.environment='test' AND t.is_test=true) OR(t.environment='live' AND t.is_test=false))
 FOR UPDATE;
 IF NOT FOUND THEN RETURN false;END IF;
 SELECT * INTO attributed FROM otto_a1.teacher_accounting_students s
 WHERE s.student_id=tx.user_id AND s.linked_at<=tx.confirmed_at;
 IF NOT FOUND THEN RETURN false;END IF;
 -- All distinct succeeded payments for an attributed student can earn the
 -- fixed 500 RUB (initial AND renewal). Live enablement stays gated by the
 -- server flags and approved partner terms; no auto bank payout exists.
 -- Never recognize refunded payments even if refund arrived before the reconciliation.
 IF EXISTS(SELECT 1 FROM otto_a1.teacher_accounting_refunds r
 WHERE r.payment_transaction_id=tx.id) THEN RETURN false;END IF;
 INSERT INTO otto_a1.teacher_accounting_commissions(
 payment_transaction_id,partner_id,student_id,environment,provider_payment_id,category)
 VALUES(tx.id,attributed.partner_id,tx.user_id,tx.environment,tx.provider_payment_id,
 CASE WHEN EXISTS(SELECT 1 FROM otto_a1.payment_transactions prior
 WHERE prior.user_id=tx.user_id AND prior.environment=tx.environment
 AND (prior.confirmed_at,prior.id)<(tx.confirmed_at,tx.id))
 THEN 'renewal' ELSE 'initial' END)
 ON CONFLICT(payment_transaction_id) DO NOTHING;
 RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION otto_a1.teacher_accounting_record_refund(
 p_environment text,p_payment_id text,p_refund_id text,p_amount_minor integer
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,otto_a1,pg_temp AS $$
DECLARE tx otto_a1.payment_transactions%ROWTYPE; total bigint;
 prior_refund otto_a1.teacher_accounting_refunds%ROWTYPE;
BEGIN
 IF p_environment NOT IN ('test','live') OR length(coalesce(p_refund_id,''))<5
 OR coalesce(p_amount_minor,0)<=0 THEN RETURN false;END IF;
 SELECT * INTO tx FROM otto_a1.payment_transactions t
 WHERE t.provider='yookassa' AND t.provider_payment_id=p_payment_id AND t.environment=p_environment
 FOR UPDATE;
 IF NOT FOUND THEN RETURN false;END IF;
 SELECT * INTO prior_refund FROM otto_a1.teacher_accounting_refunds r WHERE r.provider_refund_id=p_refund_id;
 IF FOUND THEN
  IF prior_refund.payment_transaction_id<>tx.id OR prior_refund.amount_minor<>p_amount_minor OR prior_refund.environment<>p_environment
  THEN RAISE EXCEPTION 'refund_identity_conflict';END IF;
  RETURN false;
 END IF;
 SELECT coalesce(sum(r.amount_minor),0) INTO total FROM otto_a1.teacher_accounting_refunds r
 WHERE r.payment_transaction_id=tx.id;
 IF total+p_amount_minor>tx.amount_minor THEN RAISE EXCEPTION 'refund_exceeds_payment';END IF;
 INSERT INTO otto_a1.teacher_accounting_refunds(provider_refund_id,payment_transaction_id,amount_minor,environment)
 VALUES(p_refund_id,tx.id,p_amount_minor,p_environment)
 ON CONFLICT(provider_refund_id) DO NOTHING;
 IF NOT FOUND THEN RETURN false;END IF;
 -- Partial refund: manual review. Full refund: reverse if unpaid, otherwise dispute.
 UPDATE otto_a1.teacher_accounting_commissions SET
 status=CASE WHEN status='paid' THEN 'disputed'
   WHEN total+p_amount_minor<tx.amount_minor THEN 'review' ELSE 'reversed' END,
 reversed_at=CASE WHEN total+p_amount_minor>=tx.amount_minor THEN now() ELSE NULL END
 WHERE payment_transaction_id=tx.id;
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION otto_a1.teacher_accounting_pending_payments(
 p_environment text,p_limit integer DEFAULT 100
) RETURNS TABLE(payment_id text) LANGUAGE sql SECURITY DEFINER
SET search_path=pg_catalog,otto_a1,pg_temp AS $$
 SELECT t.provider_payment_id FROM otto_a1.payment_transactions t
 JOIN otto_a1.teacher_accounting_students s ON s.student_id=t.user_id AND s.linked_at<=t.confirmed_at
 LEFT JOIN otto_a1.teacher_accounting_commissions c ON c.payment_transaction_id=t.id
 WHERE t.environment=p_environment AND t.provider_status='succeeded'
 AND t.amount_minor=150000 AND t.currency='RUB'
 AND ((t.environment='test' AND t.is_test=true) OR (t.environment='live' AND t.is_test=false))
 AND c.payment_transaction_id IS NULL AND NOT EXISTS(
 SELECT 1 FROM otto_a1.teacher_accounting_refunds r WHERE r.payment_transaction_id=t.id)
 ORDER BY t.confirmed_at,t.id LIMIT LEAST(GREATEST(coalesce(p_limit,100),1),500)
$$;

-- Trusted-server-only summary with no student UUID, email, phone or answered task data.
CREATE OR REPLACE FUNCTION otto_a1.teacher_accounting_partner_report(
 p_partner_id uuid,p_environment text
) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,otto_a1,pg_temp AS $$
 SELECT jsonb_build_object(
   'test',p_environment='test',
   'registeredStudents',(SELECT count(*) FROM otto_a1.teacher_accounting_students s
     WHERE s.partner_id=p_partner_id),
   'confirmedPayments',count(*),
   'initialPayments',count(*) FILTER(WHERE c.category='initial'),
   'renewals',count(*) FILTER(WHERE c.category='renewal'),
   'earnedMinor',coalesce(sum(c.amount_minor) FILTER(WHERE c.status IN ('pending','paid')),0),
   'pendingMinor',coalesce(sum(c.amount_minor) FILTER(WHERE c.status='pending'),0),
   'paidMinor',coalesce(sum(c.amount_minor) FILTER(WHERE c.status='paid'),0),
   'underReview',count(*) FILTER(WHERE c.status IN ('review','disputed')),
   'reversed',count(*) FILTER(WHERE c.status='reversed'),
   'history',coalesce((SELECT jsonb_agg(to_jsonb(v)) FROM (
     SELECT c2.category,c2.amount_minor,c2.status,c2.created_at
     FROM otto_a1.teacher_accounting_commissions c2
     WHERE c2.partner_id=p_partner_id AND c2.environment=p_environment
     ORDER BY c2.created_at DESC LIMIT 100
   ) v),'[]'::jsonb)
 ) FROM otto_a1.teacher_accounting_commissions c
 WHERE c.partner_id=p_partner_id AND c.environment=p_environment
$$;
REVOKE ALL ON FUNCTION otto_a1.teacher_accounting_partner_report(uuid,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION otto_a1.teacher_accounting_partner_report(uuid,text) TO otto_a1_api;

REVOKE ALL ON FUNCTION otto_a1.teacher_accounting_register_partner(uuid,text,text,timestamptz),
 otto_a1.teacher_accounting_link_student(uuid,uuid,uuid,timestamptz,timestamptz),
 otto_a1.teacher_accounting_credit_payment(text,text),
 otto_a1.teacher_accounting_record_refund(text,text,text,integer),
 otto_a1.teacher_accounting_pending_payments(text,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION otto_a1.teacher_accounting_register_partner(uuid,text,text,timestamptz),
 otto_a1.teacher_accounting_link_student(uuid,uuid,uuid,timestamptz,timestamptz),
 otto_a1.teacher_accounting_credit_payment(text,text),
 otto_a1.teacher_accounting_record_refund(text,text,text,integer),
 otto_a1.teacher_accounting_pending_payments(text,integer) TO otto_a1_api;
NOTIFY pgrst,'reload schema';
COMMIT;
