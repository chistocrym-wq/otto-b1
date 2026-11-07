# OTTO A1 — Preview #20: release evidence, self-hosted PostgreSQL recovery and rollback

**Decision: NO-GO — leave PR #20 Draft and unmerged. No Production publish, changes to main, user accounts, subscription dates, Telegram configuration, payment configuration or live databases.**

Engineering inventory updated **2026-10-27**. Last all-green code HEAD prior to the present documentation/guest-CTA change: `84756dba0d129d13774e9709a182b43133213b0d`; Production `main` comparison SHA: `4e8b80678d7427d7a9ba2970dd910b29f9448fde`. For the exact latest candidate commit see [PR #20](https://github.com/chistocrym-wq/otto-a1/pull/20): this document cannot contain its own commit SHA. A new HEAD requires its own workflow status and immutable Preview deploy identity before release sign-off.

## Confirmed evidence; do not confuse with a live database rehearsal

At `84756dba...` all **nine applicable GitHub Actions** finished SUCCESS, and status `netlify/otto-a1/deploy-preview` finished SUCCESS. These cover the general CI, Preview20 production safety/cutover fixture, two Lesen checks, Schreiben, Sprechen, beginner layout, readable admin, and journey/browser suite. The older Preview19 mobile QA and generic browser walkthrough were SKIPPED, not successful evidence. The existing browser mock uses synthetic or intercepted APIs; the old/new API matrix uses synthetic records. Neither tests an authorized restored snapshot of the live database.

Latest focused code checks:
- **Email:** `netlify/functions/email-otp-verify.js` checks a verified signed guest cookie before attempting optional guest linking; normal Email OTP login avoids guest Blob reads and referral storage. `tests/profile-email.test.mjs` exercises ordinary Email login while guest/referral dependencies fail. A valid existing user is resolved by the existing `otto_a1.resolve_verified_user` RPC, not re-registered.
- **Telegram:** `src/components/Onboarding.tsx` provides `https://t.me/ottoA1_bot` or an explicitly configured approved Mini App URL alongside the existing Login Widget and Email alternative. The link itself does not send a registration API request. Existing Mini App `initData` validation and signed `otto_session` cookies stay in `netlify/functions/session.js`. The browser fallback and guest UI use intercepted browser testing; no BotFather settings or real Telegram messages were touched.
- **Sessions:** `netlify/lib/otto-session.js` signs the same `otto_session` cookie with `OTTO_SESSION_SECRET` and 30-day expiry. **Never rotate this secret as part of the release**: doing so would invalidate existing cookies.
- **Trial/paid:** regular Trial uses verified account timestamp (`getOttoAccountVerifiedAt`, profile fallback) with 72-hour duration; paid status uses `otto_a1.get_subscription_entitlement` with context-specific live/test environment. No guest, teacher or analytics feature may change existing IDs or paid expiry.
- **Progress and forms:** `netlify/functions/state.js` supports original keys, form/letter drafts, lock/deadline keys and per-user `exam-01` through `exam-30` keys. `src/lib/serverStateSync.ts` journals pending edits by verified owner and must never erase unuploaded state after a 503. The regression protecting same-user edits after an unavailable GET passed on the last all-green code HEAD. This is synthetic evidence, not a restored Production data test.
- **31 mock exams:** `netlify/lib/otto30-storage-config.js` uses the Production private asset stores for approved materials and a separate Preview20 synthetic attempts store. User saved answer/state data are not equivalent to archived exam audio/assets. Preserve both.

PR #20 preserves existing auth/payment/learning schema code, but now includes an **additive runnable commission migration** `database/otto-teacher-commissions-PREVIEW20-ISOLATED.sql` and a non-executed proposal `database/otto-teacher-partners-PREVIEW20-PROPOSAL.sql`. The runnable migration passed 6/6 isolated PostgreSQL 16 tests and the webhook + real SQL bridge passed 3/3. Neither was run on Production. Do not execute either in live PostgreSQL without a separately authorized financial launch, schema comparison and validated backup/restore. GitHub source is not proof of live schema compatibility.

## Actual architecture — self-hosted Supabase/PostgreSQL, not cloud Supabase

OTTO uses its **own PostgreSQL instance**, schema `otto_a1`, its own Supabase/PostgREST API endpoint, Netlify Functions and Netlify Blobs. Do **not** use supabase.com/dashboard or cloud Supabase backup instructions. The authorized infrastructure administrator must inspect the real local/server PostgreSQL host and its PostgREST configuration (read only); GitHub cannot reveal the live rows, grants, extensions, API schema cache or Netlify environment values.

Code-expected tables: `otto_a1.users`, `user_identities`, `user_profiles`, `user_state`, `learning_progress`, `learning_activity`, `subscription_entitlements` and `payment_transactions`. Code-expected RPCs: `resolve_verified_user`, `resolve_telegram_user`, `touch_user_session`, `get_subscription_entitlement`, `confirm_payment_and_extend_subscription`, `record_learning_score`, plus any others found in the real instance. Verify columns, primary/foreign keys, ACL/RLS policies, security-definer configuration, API role, RPC signatures and the actual PostgREST exposed schema; compare to deployed functions. Check actual local Postgres version and backup/PITR setup. A GitHub SQL file is **not** evidence that any of these tables or RPCs exist in the live instance.

### Read-only operator inventory for PostgreSQL

Use the self-hosted PostgreSQL host's approved administration terminal (or your own deployed database administration UI), with a SELECT-only role. Never paste credentials or identifying student data into GitHub or ChatGPT. Sample SQL, limited to metadata:

~~~sql
SELECT current_setting('server_version') AS postgres_version,
       current_database() AS database_name;

SELECT table_schema, table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'otto_a1'
ORDER BY table_name, ordinal_position;

SELECT schemaname, tablename, policyname, roles, cmd, permissive
FROM pg_policies WHERE schemaname = 'otto_a1'
ORDER BY tablename, policyname;

SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='otto_a1'
ORDER BY p.proname;

SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='otto_a1'
ORDER BY table_name, grantee;
~~~

The authorized operator should privately record per-table exact row counts and per-user salted/HMAC fingerprints for restored comparisons without exposing UUIDs, Email addresses, Telegram IDs, session cookies, drafts, recordings or payment references. Counts from `pg_stat_user_tables` are only estimates and are NOT accepted as exact backup proof. Read-only probes against the actual deployed PostgREST URL (provided privately by the operator) must check the expected `Accept-Profile: otto_a1` and existing RPC signatures without calling mutating functions. A `GET /api/state` with a test identity is safe only if confirmed not to mutate; do not touch real customer sessions.

## Determine the exact currently PUBLISHED Netlify deploy and rollback target (NOT VERIFIED)

The GitHub `main` SHA alone does not establish the currently published Netlify deploy ID.

Authorized Netlify operator:
1. Open the existing OTTO A1 project in the Netlify dashboard, then **Deploys**. Open the deploy labeled **Published** (NOT latest Preview), and record its immutable deploy ID, publish UTC time and source SHA. Open the previous successful production deploy and verify that it is still retained and has a usable permalink.
2. In Project configuration > Environment variables, privately confirm Production vs Deploy Preview scope of `OTTO_SUPABASE_URL`, API credentials and `OTTO_SESSION_SECRET` (presence, not values), plus the OTTO_V20 gates. Do not change them.
3. Record expected return target and approver. After a **separately authorized future release**, if the site fails, disable optional features first, then select the recorded successful old deploy and choose **Publish Deploy**. If automatic production publishing is enabled, secure/lock the returned deploy to prevent a subsequent build from silently overriding the rollback. Publishing a previous deploy reverts code, **not student records**. Never restore an old DB over newer work as a routine rollback.

Official Netlify procedure: https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/

## Snapshot self-hosted PostgreSQL and Netlify Blobs (NOT PERFORMED)

Before any export obtain named owner approval, read-only source access, verified source/target identifiers (they MUST differ), a consistent snapshot or recorded change window, encrypted/restricted destination, snapshot time, export retention, and a rollback plan. Do not create a test account or issue writes to Production to prove backups.

For the private operator's approved source PostgreSQL connection (`OTTO_PG_READONLY_DSN` is a placeholder, **not a required Netlify variable**), on a secured terminal:

~~~bash
umask 077
pg_dump --dbname="$OTTO_PG_READONLY_DSN" \
  --format=custom --schema=otto_a1 --no-owner --no-acl \
  --file=otto_a1_snapshot.dump
sha256sum otto_a1_snapshot.dump > otto_a1_snapshot.sha256
pg_restore --list otto_a1_snapshot.dump > otto_a1_snapshot.contents.txt
~~~

This `pg_dump` performs database reads. The authorized operator must verify that the source role really has SELECT privileges, identify every OTTO dependency outside `otto_a1` (roles, PostgREST auth, extensions, other schemas, local storage, encryption), and capture them separately. `--no-acl` intentionally excludes grants: restore target must get isolated/test-only grants after the operator reviews real grants; do not copy live credentials or trust this dump as a complete infrastructure backup. Protect/encrypt **the dump and any manifests** immediately with organization-approved encryption. SHA-256 verifies archive bytes only; per-table/per-record and Blob hashes are still required. For a point-in-time recovery guarantee, inspect and preserve the self-hosted PostgreSQL WAL/PITR or equivalent backups too; do not assume `pg_dump` alone can capture writes after snapshot time.

Netlify operator: inspect **Data & Storage > Blobs** and the deployed code. List actual site-wide stores and all deploy-specific stores separately; `listStores()` does not include deploy-specific stores. For each known site and deploy scope, use an audited, privileged read-only `list` / `get` / `getWithMetadata` exporter, capture every key, binary bytes, metadata, key count and per-object SHA-256. Do not call `set`, `setJSON`, `delete` or `deleteAll` on the live site. A read-only token, if supported, is preferable; otherwise supervise a strictly read-only export. Candidate source stores from code, **not a verified actual inventory**:

| Data | Site-wide Netlify Blob candidates |
|---|---|
| Exam materials | `otto30-production-owner-private-v1` |
| Private score keys | `otto30-production-private-score-keys-v1` |
| Saved exam scores/attempts | `otto30-production-private-scores-v1` |
| Email OTP and auxiliary access | `otto-email-otp`, `otto-access` |
| Preview-only attempts | `otto30-preview20-synthetic-attempts-v1` (NOT Production results) |

Inventory additional real admin, Telegram, support, journey, TTS, deploy stores and any local files. Never include private exam keys or student materials in CI artifacts. Netlify Blobs documentation: https://docs.netlify.com/build/data-and-storage/netlify-blobs/

## Restore and real API switch rehearsal (NOT PERFORMED)

1. Create an **independent PostgreSQL server/database** and **separate Netlify site** (different IDs and secrets), inaccessible to public traffic. Block real payments, webhooks, UniSender Email, Telegram sends, AI/TTS charging and scheduled jobs before connecting a restored dataset. No copied real OTP/session secret may be used for public authentication.
2. Only in that verified isolated target, restore the archive:
   ~~~bash
   pg_restore --dbname="$OTTO_ISOLATED_PG_DSN" --no-owner --no-acl \
     --exit-on-error otto_a1_snapshot.dump
   ~~~
   Confirm `OTTO_ISOLATED_PG_DSN` does NOT resolve to the live DB. Review/reapply isolated PostgREST role grants and schema configuration; reload schema cache as appropriate. Restore Netlify blobs only to separate siteID+deploy context.
3. Compare exact source/restored row counts, schema and RPC/RLS definitions, pseudonymized hashes and timestamps, all Email/Telegram identity links and stable user IDs, active/expired Trial anchors, paid expiration timestamps, payment references (hash only), profile/legal acceptance, `user_state` keys and learning history. Check all four modules, form and letter drafts, task results, all 31 exams' saved answers and scores, asset manifests, 450 MP3 hashes and private-score stores. Record mismatches or missing items; zero unexpected mismatches is required.
4. Using only authorized test identities on restored data, execute **real server Functions**, not just in-memory JavaScript mocks, in each combination: old client + old API; old client + new API; new client + new API; new client + rolled-back API. Verify saved answers for Hören, Lesen, Schreiben (form and letter), Sprechen and exams before/after. Open an old browser tab, initiate a task, switch the **isolated** API, finish/save the task and reload. Keep user IDs, access expiry, all prior answers, older tab writes and new writes unchanged. Test outage, duplicate requests, concurrent saving and rollback. Explicitly confirm offline `/api/state` GET 503 does not erase local pending edits.
5. Produce a restricted signed restoration report: snapshot timestamp, database and site **source/target IDs** (restricted), archived SHA-256, exact record/object counts and nonreversible hashes, list of lost/mismatched records, identity/session/trial/entitlement equality, all 31 exams and 450 audio objects, test environment isolation, restore run transcript, operator/date and rollback readiness. Public release note must show only totals and PASS/FAIL, no personal data.

The current synthetic old/new compatibility and archive checks are insufficient to approve a real cutover. Production backup or restore was **not** run by this PR task.

## Mandatory release gates and non-destructive rollback

| Gate | Status |
|---|---|
| 9/9 workflows and Netlify Preview at code baseline `84756dba` | **PASS; re-check final documentation/CTA HEAD** |
| Isolated PostgreSQL 16 migrations and webhook-RPC bridge | **PASS (6 SQL + 3 webhook; YooKassa/Blobs simulated)** |
| Real YooKassa test-shop webhook/refund | **NOT TESTED** |
| Email old account and Telegram bot fallback (source + synthetic tests) | **PASS on baseline; not live identity proof** |
| Existing session cookie algorithm and 72h Trial (source) | **UNCHANGED** |
| Additive commission SQL migration | **Tested on temporary PG16; NOT applied to Production** |
| Current published Netlify Production deploy ID | **NOT CONFIRMED** |
| Exact live self-hosted PostgreSQL schema/roles/RPC/counts | **NOT CONFIRMED** |
| Encrypted database and live Netlify Blob snapshots | **NOT TAKEN** |
| Independent full restore and hash/count validation | **NOT PERFORMED** |
| Real old/new API cutover and rollback on restored data | **NOT PERFORMED** |
| Owner explicitly authorizes merge/Production release | **NOT GRANTED** |

See the exact 2026-10-27 operator acceptance and single-command publication instructions in [PREVIEW20_OWNER_PUBLISH_RUNBOOK_20261027.md](PREVIEW20_OWNER_PUBLISH_RUNBOOK_20261027.md). The *historical* protected audit [38604491958](https://github.com/chistocrym-wq/otto-a1/actions/runs/38604491958) confirmed the rollback deploy `6acddaa9790643d38224f767` (SHA `94ef03f7be78f250f573f7a89b1bda8afd9277b7`) existed **on 2026-10-14**, with 450 matching audio objects and no Production writes. It did **not** publish the current Production deploy ID, perform backup, or restore students. Protected `otto-netlify-audit` credentials must never be exposed to unreviewed PR code.

Recommended rollout after separate GO only: preserve and lock old immutable deploy ID; freeze/capture encrypted snapshots and incremental write boundary; publish approved code with every new server feature OFF; validate same-user login, unchanged 72h Trial and paid subscription, saved all-four modules and 31 exams; then enable each optional feature in a separately approved stage. If any data-loss, auth or paid-access anomaly: stop, disable optional flags, publish old immutable Netlify deploy and reconcile writes since snapshot before any database restoration. Never auto-recreate accounts, reset Trial, overwrite new writes or rotate `OTTO_SESSION_SECRET`.

**NO-GO until live restore and full compatibility prove preservation of existing students, and the owner authorizes publication.**
