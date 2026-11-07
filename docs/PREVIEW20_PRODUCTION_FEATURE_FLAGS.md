# OTTO A1 — PR #20 Production feature flags and staged activation

**No flag changed. No Production deployment authorized.** Last all-green application-code baseline `84756dba0d129d13774e9709a182b43133213b0d` (9/9 GitHub Actions SUCCESS, Netlify Preview SUCCESS; PostgreSQL 6/6 + webhook/SQL bridge 3/3). The actual PR HEAD must be re-read for the final sign-off. Production `main`: `4e8b80678d7427d7a9ba2970dd910b29f9448fde`.

## Real infrastructure

OTTO runs on **self-hosted PostgreSQL** with `otto_a1`, a self-managed Supabase/PostgREST API, Netlify Functions and Netlify Blobs. There is no cloud Supabase project to inspect in supabase.com/dashboard. See `docs/PREVIEW20_RELEASE_READINESS_AND_ROLLBACK.md` for authorized local `psql`/`pg_dump` and isolated `pg_restore`, Netlify Blobs export, source/target isolation and four-version real-API rehearsal. No backup or restore was performed by GitHub tests.

## Fail-closed activation rules

No `OTTO_V20_*` server flags are turned on by default. Each Production API requires trusted Netlify deployment context `production`, nonempty immutable deploy ID, exact approved HTTPS origin, **BOTH** `OTTO_V20_PRODUCTION_APPROVED=true` **and** its own `OTTO_V20_<FEATURE>_ENABLED=true`, plus user session/admin role/consent where required. Never use an unreviewed hostname or Telegram domain for authorization. The common approval flag must stay OFF before a separately approved release.

Features and their server flag names:
- Existing admin upgrade: `OTTO_V20_ADMIN_ENABLED`.
- Consent-aware journey telemetry: `OTTO_V20_JOURNEY_ENABLED`.
- Active training time: `OTTO_V20_STUDY_TIME_ENABLED`.
- Teacher/blogger pilot: `OTTO_V20_TEACHERS_ENABLED`.
- Attribution/referral: `OTTO_V20_REFERRAL_ENABLED`.
- 72-hour guest + AI quota: `OTTO_V20_GUEST_ENABLED` (**KEEP OFF; high risk**).

Production client build switches (PUBLIC, not authorization): `VITE_OTTO_V20_PRODUCTION_APPROVED` with per-feature `VITE_OTTO_V20_ADMIN_ENABLED`, `VITE_OTTO_V20_JOURNEY_ENABLED`, `VITE_OTTO_V20_STUDY_TIME_ENABLED`, `VITE_OTTO_V20_TEACHERS_ENABLED`, `VITE_OTTO_V20_REFERRAL_ENABLED`, `VITE_OTTO_V20_GUEST_ENABLED`, `VITE_OTTO_V20_WELCOME_ENABLED`. The original admin/UI should remain the default while new switches are disabled; server gates must always be independent of the Vite variables.

The login and progress system `/api/session`, `/api/email-otp-verify`, `/api/account-access`, `/api/state`, and paid entitlement handlers remain critical **always-on** infrastructure: optional flags must not gate or migrate them, revoke old cookies, renumber tasks, reset Trial, expire payments, or alter local sync keys.

## Preview vs candidate future Production Blob stores

| Feature | Preview candidate | Production candidate |
|---|---|---|
| Guest | `otto-preview20-guest-trial-v1` | `otto-v20-production-guest-trial-v1` |
| Teacher pilot | `otto-preview20-teacher-pilot-v1` | `otto-v20-production-teacher-pilot-v1` |
| Study time | `otto-preview20-study-time-v1` | `otto-v20-production-study-time-v1` |
| Journey | `otto-preview20-journey-v1` | `otto-v20-production-journey-v1` |

These names are defined by source and are NOT a confirmed inventory of live Production stores. `getStore()` is site-wide; `getDeployStore()` is deploy-scoped. `listStores()` omits deploy stores. Current `preview20-teachers.js`, `preview20-journey.js` and `admin-journey.js` select their stores with `v20StoreName(kind, v20FeatureScope(req,context,...))` from trusted deploy context, **not** `process.env.CONTEXT`. Synthetic namespace isolation passed. Actual Production storage and retention still require operator verification.

Guest has server CAS-based unique AI-operation IDs, 60 credits and browser retry/fresh-attempt support, but it cannot restore a paid AI response lost after a successful debit. Retaining guest Trial anchors and bypassing legacy paid account access in Production still need explicit isolation/abuse testing before `GUEST` is authorized. The opt-in real commission code now exists and has passed isolated PostgreSQL 16 plus webhook-RPC tests with simulated YooKassa responses. **No live YooKassa test shop, Production migration, live ledger enablement or bank payouts have been authorized.**

## Proposed staged enablement — after independent GO and real backups only

0. **Baseline release stage, all new features OFF:** confirmed current immutable Netlify deploy + encrypted PostgreSQL/Blob backup and restore; old/new APIs tested on isolated recovered data; explicit owner authorization. Deploy code with unchanged `OTTO_SESSION_SECRET`, unchanged OTTO Supabase/PostgREST credentials and existing payment environment. Verify existing Email, Telegram Mini App, paid access, 72-hour Trial, drafts, all-four modules and 31 exams. Do not turn any feature on merely because its Preview tests passed.
1. **Welcome/learning UI**: separate reviewed client build flag, viewport acceptance, monitor old-client compatibility. Avoid replacing existing flow without a tested switch.
2. **New admin** (only authenticated existing admins), then **journey analytics** (only with opt-in and verified retention) as separately controlled features. Store selection now uses trusted deploy scope; verify real persistence and scheduled retention before enabling.
3. **Study time**: authenticated user only, isolated namespace, deduplication and recovery tested.
4. **Teacher pilot**, then **referral**: separate real Production Blob namespaces and role checks need authorization/verification. These flags alone must never activate live commissions or payouts.
5. **Guest 72h**: final *separate explicit* approval, 60-credit concurrency, registered Trial carryover, anti-abuse, reload retry and AI result loss explained; keep disabled until these pass. No real payout activation is part of this plan.

At every stage, allow server-side **kill switch** by turning the specific flag OFF; never switch off core email, Mini App or `/api/state`. Check support incidents, auth error rates, paid entitlements, state-save 503s, CPU/network utilization and old-tab compatibility. A feature rollout must be reversible without deleting data.

## Rollback prerequisites

1. Netlify operator must record **published Production deploy ID**, SHA, UTC and previous successful immutable deploy ID from **Deploys**. GitHub `main` SHA is not proof of which deploy is published. Inspect retention and lock capability. Do not click Publish Deploy until owner approval or a separately authorized emergency rollback.
2. Approved team must hold verified encrypted **self-hosted PostgreSQL** plus Blob backups, exact counts/hashes and a completed isolated restore, with recovered API tests. Store all secrets and PII outside repository and CI.
3. On a future critical regression: turn off faulty feature; republish the previous successful immutable Netlify deploy; lock publishing if needed; keep existing PostgreSQL and Blob data untouched. Check newer writes made after deployment and reconcile them before considering any database restore.
4. Never treat synthetic tests, Netlify deploy SUCCESS or a green CI as proof that existing live learners, subscriptions, local unsynced drafts, and 31 exam answers are recoverable.

## Actual activation matrix (source: v20-deployment.js, v20ClientFeatures.ts, commissionGate)

All Production server features require trusted `production` context and Deploy ID, `OTTO_V20_PRODUCTION_APPROVED=true`, `OTTO_V20_PRODUCTION_ORIGIN=https://otto-a1.netlify.app`, and the specific server flag. All client feature flags require the global **build-time** `VITE_OTTO_V20_PRODUCTION_APPROVED=true`. Vite flags cannot authorize a server API.

| Feature | Vite per-feature flag | Server per-feature flag | Release position |
|---|---|---|---|
| New welcome / refreshed learning | `VITE_OTTO_V20_WELCOME_ENABLED` | none | Code-ready; keep OFF before authorized production identity/data rehearsal |
| Readable admin | `VITE_OTTO_V20_ADMIN_ENABLED` | `OTTO_V20_ADMIN_ENABLED` | Code-ready; real admin ACL must be confirmed |
| Journey, opt-in, 24h retention | `VITE_OTTO_V20_JOURNEY_ENABLED` | `OTTO_V20_JOURNEY_ENABLED` | Consent and scheduled cleanup need real store check |
| Study time | `VITE_OTTO_V20_STUDY_TIME_ENABLED` | `OTTO_V20_STUDY_TIME_ENABLED` | Real store/identity check needed |
| Teachers | `VITE_OTTO_V20_TEACHERS_ENABLED` | `OTTO_V20_TEACHERS_ENABLED` | Real role/namespace check needed |
| Referral | `VITE_OTTO_V20_REFERRAL_ENABLED` | `OTTO_V20_REFERRAL_ENABLED` | Pair with Teachers, no live ledger implied |
| 72h Guest | `VITE_OTTO_V20_GUEST_ENABLED` | `OTTO_V20_GUEST_ENABLED` | **KEEP OFF** pending isolated live-equivalent Trial/abuse/AI result recovery acceptance |
| Real 500 RUB commissions | teacher/referral UI only | `OTTO_V20_COMMISSION_DB_READY=true`, `OTTO_V20_COMMISSION_LIVE_ENABLED=true` **plus TEACHERS + REFERRAL gates** | **KEEP OFF** until live schema-compatible migration, approved partner terms, YooKassa test shop |
| Test commission ledger | no separate flag | `OTTO_V20_COMMISSION_DB_READY=true`, `OTTO_V20_COMMISSION_TEST_ENABLED=true` plus TEACHERS + REFERRAL | Preview/test payment context only, not Production |

`getPaymentEnvironment` chooses `test` for `deploy-preview` and `live` for `production`, so test commissions cannot be used as proof of live payment integration. **WELCOME and GUEST are independent**; the guest CTA in `src/App.tsx` is now conditional on the guest client flag, not just welcome.

Do not change existing `OTTO_SESSION_SECRET`, `OTTO_SUPABASE_URL`, `OTTO_SUPABASE_ANON_KEY`, `OTTO_SUPABASE_TOKEN`, YooKassa and Telegram settings, `OTTO30_PRODUCTION_HOST` or `OTTO30_PRODUCTION_RELEASE_APPROVED`. The runnable commission SQL migration is **not needed** if the live ledger is OFF. No feature turns on merely because a Preview uses it.

See [PREVIEW20_OWNER_PUBLISH_RUNBOOK_20261027.md](PREVIEW20_OWNER_PUBLISH_RUNBOOK_20261027.md) for the precise owner authorization, current deploy evidence, release and non-destructive rollback.

**NO-GO for the requested complete release; Guest and real commissions are not approved for Production. No Production writes, new flags or bank payouts authorized.**
