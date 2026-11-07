# PR20 — Live teacher commission implementation contract (NOT ACTIVE)

**Release status: NO-GO.** This file is planning/evidence for self-hosted PostgreSQL integration. Nothing in this document executes SQL, changes YooKassa, changes students or authorizes payouts. The TeacherPortal and admin pilot still show separate synthetic demo sums. Updated `payment-webhook.js` **optionally** calls the durable PostgreSQL commission service after confirming the student's subscription. The live service is disabled by default and no bank payout is performed.

## Confirmed payment path

* `POST /api/create-payment` obtains a signed student session and verified Email; creates a 1,500 RUB / 30-day YooKassa payment.
* YooKassa `payment.succeeded` webhook is **not trusted as proof by itself**. `netlify/lib/payment-provider.js` retrieves the payment by ID from the provider and validates paid/succeeded, exact amount, currency, test/live flag, OTTO user ID and payment reference.
* `netlify/functions/payment-webhook.js` confirms subscription via the existing idempotent `otto_a1.confirm_payment_and_extend_subscription` RPC. A repeated webhook gets `applied:false`. **This must continue to work even if the teacher ledger is unavailable.**
* Refund events are distinct. YooKassa sends `refund.succeeded`, not just `payment.canceled`. Updated `payment-webhook.js` processes `refund.succeeded` after provider-side `verifyRefund` and conditionally applies the verified refund to the ledger. It does not confuse `payment.canceled` with confirmed refund. The full external YooKassa **test shop** has not been exercised; bridge tests use injected provider responses. `payment.canceled` must not reverse an already successful unrelated payment.

Reference: https://yookassa.ru/developers/using-api/webhooks

## Durable schema and attribution prerequisites

An existing SQL proposal (`database/otto-teacher-partners-PREVIEW20-PROPOSAL.sql`) ends with `ROLLBACK` and has **never been applied**. The separate additive `database/otto-teacher-commissions-PREVIEW20-ISOLATED.sql` is executable and passed 6/6 PostgreSQL 16 migration/ledger tests plus 3/3 webhook/real-RPC bridge tests; **not applied in Production**. Current teacher partners/clicks/attributions/commission demonstrations live in separate Netlify Blob namespaces, not in PostgreSQL. Simply inserting a commission after a webhook would return `unattributed` for real users unless referral ownership is safely stored and verified in the same trusted ledger. Do not copy Preview teachers to Production or treat test IDs as live.

Before live activation, the authorized database owner must review and apply **reversible, isolated-test-validated** migrations for:
1. `teacher_partners` and `teacher_students`: unique verified partner ID, unique 30-day first-touch referral, student UUID foreign key and self-referral prevention; historic accounts must never become newly attributed by retroactive click matching.
2. `teacher_commissions`: immutable unique key `(provider, payment_environment, provider_payment_id)`, amount RUB 50000 minor units, category initial/renewal based on **confirmed previous payment history**, `test/live` status, teacher+student references and an idempotent source payment transaction reference.
3. `teacher_commission_events`: append-only unique external event ID for confirmed payment, partial/full refund, dispute and resolution. A refund's sum must not exceed original payment, and commission statuses `pending/approved/paid/reversed/disputed` must be traceable. A dispute or refund **after** a real payout creates a negative obligation for reconciliation, not a new automatic bank transfer.
4. `teacher_payout_allocations`: one commission cannot be assigned to two actual payouts; payouts remain `requested` until separately approved after legal/tax validation. No automated transfer logic.
5. Protected, transactionally serializable SECURITY DEFINER RPCs with `search_path` pinned; dedicated trusted backend role and grants. Never allow unauthenticated clients to call credit/refund RPCs or query foreign students.

Preserve all existing `otto_a1.users`, `user_identities`, `user_state`, `subscription_entitlements`, `payment_transactions` and original auth/session semantics. Never introduce a destructive migration for this feature.

## Safe webhook sequence after new schema and test-only restoration

For `payment.succeeded`: (1) verify via YooKassa GET; (2) execute existing subscription confirmation unchanged; (3) if **both** server feature approval and isolated ledger readiness are true, append immutable commission event using authoritative `payment_transactions` record + existing verified referral; (4) retry ledger-only failures via a durable outbox/reconciliation worker, never extend subscription twice and never block student access. A swallowed exception without a durable pending event would lose commissions, so a background reconciliation query is mandatory. One confirmed renewal is a second distinct payment and may earn another RUB 500 if legal partner terms explicitly permit it.

For `refund.succeeded`: re-verify refund by ID from YooKassa API, match to original confirmed payment ID and amount, idempotently insert refund event; on full refund mark commission reversed or create compensating obligation if previously approved/paid. On partial refund, apply an **approved** policy (full reversal vs proportional hold); do not invent a policy. Ensure dispute transitions and appeals are auditable.

Do not enable any of these paths in Production until migration, live/test reconciliation, refund policy and partner agreement are approved. Never create a real payout automatically.

## Required isolated real-infrastructure acceptance

Use self-hosted PostgreSQL/PostgREST on a different database and Netlify site, with test YooKassa provider or provider simulator and actual endpoint handlers. Run: referral click -> verified new student Email and Telegram login -> stable association -> test payment confirmed -> subscription state and teacher/admin sum +500 RUB -> same webhook 20 times/concurrently (one commission) -> second distinct 30-day payment (renewal +500) -> full refund and repeated refund (one reversal) -> partial refund -> dispute; no foreign student rows exposed. Verify all data persisted after process restart/new Netlify deploy. Test fail-closed feature gates, historic students, cancelled payments, expired referrals, self-referrals, wrong test/live flags, identity linking, and provider/API outage. Assert existing student subscription is unaffected even when accounting fails, then prove retry backfills the missed commission exactly once.

**No live PostgreSQL connection, read-only schema inventory, true backup and restored isolated deployment have been made available in this task.** Therefore no real API migration or live commission accounting can be certified.

## One-launch acceptance checklist for the owner

* Netlify: immutable currently Published deploy ID, previous deploy ID, context-scoped `OTTO_V20_*` server and `VITE_OTTO_V20_*` build flags, credentials unchanged; real deployed source and target IDs.
* Self-hosted PostgreSQL: actual `otto_a1` schema and RPC/grants audit; encrypted `pg_dump`, Netlify Blob export, verified restored copies, migrations **only on isolated copy**.
* YooKassa: approve legally defined partners/renewals/refund/dispute rules and enable correct verified provider events to a single safe webhook endpoint; real payout remains manually controlled.
* Release gates: 9/9 Actions on final SHA, Netlify Preview, end-to-end real restored-database tests for Email/Telegram, student progress and 31 exams, cross-version rollback with old tab, and teacher commission ledger; separate final user GO.

**NO-GO until these items are demonstrated.**
