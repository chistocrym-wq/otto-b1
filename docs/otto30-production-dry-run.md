# OTTO 30 exams — Production readiness (NO RELEASE)

Status: BLOCKED. This document is a dry-run deployment specification, not authorization to publish.

## Immutable existing user data
- Keep the existing OTTO Production URL, Supabase schema, signed `otto_session` cookie, authentication secrets, account and payment entitlements.
- Do not clear browser localStorage / IndexedDB or replace legacy mock exam #1; it uses an independent progress/history path.
- Preserve `main` and record a known-good Production deploy ID plus SHA before eventual cutover. Back up user/progress/account data using restricted admin credentials, encrypt backups, and verify restore on a disposable site.
- New attempts remain partitioned by `session.sub`; never accept a user ID from the client when reading a result.

## Netlify migration, stage only
1. Identify the *actual* configured Production hostname and site ID in Netlify dashboard. Do not assume an address based on the preview name.
2. On a **separate disposable Netlify site**, create `otto30-production-candidates-v1`, `otto30-production-private-keys-v1`, `otto30-production-attempts-v1`. These names are illustrative until site-specific configuration is reviewed.
3. Read the owner's offline E9R3 manifest and approved source archive locally. Require 30 exam JSON files, 450 MP3, 20 images (500 assets total) plus 30 separately validated private key files, with exact bytes and SHA-256. Verify cross-linking (exam, task, audio, option ordering, answer key).
4. Production must have its **own hostname allowlist** and site-scoped Blobs. Preview and Production must not share a Blob namespace or deployment environment credentials. Fail closed when hostname, editorial approval or data inventory is missing.
5. Keep editorial flags `BLOCKED_FOR_RELEASE`, `commercialApproved:false`, `PRIVATE_UNAPPROVED` intact. The owner must sign off editorial/content/audio/rights acceptance before a release transformation is designed and independently tested. Never simply flip flags or remove validators.
6. Install the material into **disposable** Blobs only. Read each blob back, compare sizes and SHA-256 and compare key fingerprints; test admin and ordinary student routes. No writes to Production during preparation.
7. Production rollout must be gated by BOTH an owner-approved release flag and server-side trial/subscription/developer entitlement. Admin uploads require a separate privileged allowlist; keys are never returned by public APIs.
8. Require a verified private inventory of `installed:30` plus 500 asset checks before enabling pupils. Test with old paid / active trial / expired / new accounts, and two distinct sessions attempting cross-account IDs.
9. Test exam #1, #2, mid-range and #31 including objective scores, form, live Schreiben and five Sprechen AI calls; store and restore multiple attempts on another device. Set conservative per-user AI concurrency, spending alarms and provider quotas before broad access.

## PWA & rollback
- Preserve `manifest.webmanifest` id `/`, scope `/`, start URL `/?app=otto-a1-v20`, icons and existing Production hostname.
- HTML and SW no-store; immutable Vite hashes. On stale chunk show an opt-in refresh: never reload during letter drafting, recording or exams. Validate on Android/iOS and desktop.
- Roll back **application deploy only** using Netlify deploy UI to captured deploy ID, never delete attempt stores or overwrite student progress. Restore snapshots only via a documented, reversible, dry-run verified data procedure.

## Approval gates
- All CI / Browser E2E / mobile viewport / walkthrough green on exact SHA.
- Content and keys physically present, SHA-verified in separate site storage; editorial owner approval.
- Real multi-account and device tests, AI integrations and 1000-learner bounded load/cost verified.
- Backup restore tested and Netlify site billing/usage/limits checked directly in account dashboard.
- Written authorization from owner for merge and Production deploy.

## Implemented server-side environment isolation

`netlify/lib/otto30-storage-config.js` selects separate Production/Preview stores. Production is blocked unless the exact `OTTO30_PRODUCTION_HOST` matches, Netlify `CONTEXT=production` and explicit `OTTO30_PRODUCTION_RELEASE_APPROVED=approved`. Both approval and `OTTO30_PRODUCTION_STUDENT_ACCESS=enabled` must remain **unset** before owner signoff. Production owner and key admins use `OTTO30_PRODUCTION_OWNER_IDS` and `OTTO30_PRODUCTION_KEY_ADMIN_IDS`. All are server-only. This code **does not** copy or modify Production data. `BLOCKED_FOR_RELEASE` remains a release blocker; publishing needs editorial acceptance and a reviewed content schema.

## Implemented disposable-site migration
Run `node scripts/otto30-staging-migrate.mjs <assets> <manifest.json> <key-directory>` first, locally, using Node 22. It checks all 500 bytes+SHA-256 and all 30 server-only E9R3 key fingerprints, no network access or writes. Key directory must contain `exam_01.key.json` through `exam_30.key.json` (rename only local filenames if the private archive uses a different filename convention; never edit contents).
For an owner-created **disposable** Netlify site only: set locally `OTTO30_MIGRATION_DISPOSABLE_SITE_ID`, `OTTO30_LIVE_SITE_ID`, `NETLIFY_AUTH_TOKEN`, and `OTTO30_MIGRATION_DISPOSABLE_CONFIRMED=yes`. The two site IDs must differ. Execute the same command with `--apply-disposable`; it reads back every uploaded object, compares SHA-256, safely resumes after interruption and refuses conflicting data. A ready-for-release marker is NEVER written. Delete/disconnect the local token after verification, do not paste it into a chat or CI logs. `@netlify/blobs` API site scopes must always be specified explicitly in standalone scripts.


## Unified access rule for all 31 exams (owner decision, 13 October 2026)

- The existing OTTO signed session and **existing** paid/trial/developer entitlement are the only subscription eligibility criteria for exam #1 and private exams #2–31. The trial is still 72 hours per the existing server configuration; no extra examination plan or charge.
- While trial or a live-environment subscription is active, every exam is included in the same OTTO entitlement. When both lapse, all trainer views are blocked, including legacy mock #1, and private exam/material/scoring/history endpoints fail closed. The existing \`OTTO_DEVELOPER_USER_IDS\` exception remains.
- Expiration is **not** a deletion event. Keep account, original mock history, per-user exam drafts, attempt records, results, errors and educational progress intact. The same signed account regains them upon subscription renewal.
- Private exam admin IDs are for uploading/installing content and keys, not a separate paid-access product. Operational \`OTTO30_PRODUCTION_RELEASE_APPROVED\` and \`OTTO30_PRODUCTION_STUDENT_ACCESS\` are **release safety switches**, not extra payment entitlements; enable student access only after complete approved assets/keys inventory and final authorization.
- Do not release content still flagged \`BLOCKED_FOR_RELEASE\` or \`commercialApproved:false\` as if editorial approval were established. Obtain approval and verify all 500 materials and 30 server-only keys in isolated storage before enabling Production.
- QA: \`node --experimental-strip-types --test tests/otto31-unified-entitlement.test.mjs\` covers trial, paid, expired, restored, Production live/test separation, developer exception, direct API denial, and unchanged local progress. This synthetic fixture cannot verify actual Production accounts, purchases or backup restoration.
