# OTTO 31 — release gates (no Production publication)

Source revision: a9e1e84c3aca06a04c5522892aafe3bde34a7d4c.
Read-only audit: Actions 38604491958, 500 candidate assets, 30 private keys, no discrepancies. This is NOT editorial approval or an independent full-archive proof.

## Approved model is a separate immutable artifact
- Original exam #1 stays on its existing path; never renumber old student history.
- New private exam internal IDs 01–30 are UI exam #2–31.
- Owner signs a *separate* approved source manifest listing exact 500 SHA-256 checksums, 30 key SHA-256 checksums, source permissions for commercial use and editorial acceptance of questions, audio, images, key answer mapping, and AI-scoring criteria.
- Independent schema/release implementation should accept only a signed, immutable release manifest pinned to the exact hashes, not `commercialApproved:true` alone.
- The existing source bytes and `BLOCKED_FOR_RELEASE` / `PRIVATE_UNAPPROVED` metadata remain unchanged. Approved derivatives must be separately versioned and fully validated. Current validators intentionally reject them.
- Never expose private key blobs from the public exam/media endpoints. Result review only for session owner after scoring.
- Student read access requires both approved release inventory and existing paid/trial/developer entitlement; owner/content admin is not a payment class.
- Gate admin upload and all state-changing routes on authenticated subject, same-origin and explicit admin role; separately verify user scoring mutations accept valid student requests without requiring owner-upload headers.

## Production transfer: two phases, no authorization implicit
Script: `scripts/otto30-production-transfer.mjs`. A default invocation is read-only and first checks Netlify site metadata (site ID and Production host). It separately reads/checks Preview manifest and READY marker, exact bytes and SHA for all 500, 30 trusted private key fingerprints, and all Production target collisions.

No release flag, READY marker, scoring result or user state is written by the transfer script.
A later `--apply-production` requires explicit owner authorization in **server-only** environment variables:
`OTTO30_TRANSFER_WRITE_APPROVED=I_AUTHORIZE_530_PRIVATE_OBJECTS`;
`OTTO30_TRANSFER_TARGET_ID_CONFIRMED=<same exact target site UUID>`;
`OTTO30_TRANSFER_TARGET_HOST_CONFIRMED=otto-a1.netlify.app`.
These are NOT the actual student release switches. Keep `OTTO30_PRODUCTION_RELEASE_APPROVED` and `OTTO30_PRODUCTION_STUDENT_ACCESS` unset.
Every target write must use create-if-absent, refusal on differing bytes, then SHA-256 readback. Existing attempts/results must never be overwritten or deleted.
Do not run writing phase until approval and isolated end-to-end tests of the script.

## Accounts and recovery
Existing account/progress/history in Supabase schema `otto_a1`, signed `otto_session` cookie and original exam #1 state are immutable across the deployment.
Before release an admin must create an encrypted, restricted backup of relevant account/identity/profile, entitlements, subscription/payment, progress/activity, user_state, and original exam history. Restore it in a disposable isolated environment and reconcile row counts, foreign keys and per-user history. Never rotate session secrets.
Existing paid entitlements and trial durations must remain unchanged.
The new `otto30-production-private-scores-v1` store holds session-subject-scoped attempts. Preserve it across app rollback; restore on a second device using the same authenticated identity; do not trust a client-supplied subject. Test network-offline handling with retained local writes.

## Final cutover / rollback
- Verify exact live Netlify site and current immutable Production deploy ID and SHA; this is different from the verified historical deploy `6acddaa9790643d38224f767`.
- Verify Netlify team billing account in dashboard is allowed to deploy and keep the site running.
- Verify server-only environment, payment entitlements and AI services with ordinary paid/trial/expired users on a disposable site. Include exam #1, #2, middle and #31, independent student sessions, objective/form/letter/speech score, cross-device and offline recovery.
- Build from exactly pinned final commit, no change to OTTO design, voices, content or payment code, keep PR #13 unmerged until final owner authorization.
- Roll back APP deploy using the captured actual live deploy ID; never roll back or delete user state, scores or attempts.
- An explicit final owner's instruction is required before merging PR #13 or publishing any app.

Status as of 2026-10-14: NOT READY TO PUBLISH.