# OTTO Preview 13 — read-only Netlify audit for security review

Prepared on branch preview/task-linked-learning only. No real token used and no workflow dispatched.

Workflow: .github/workflows/otto-netlify-transfer-preflight.yml; manual workflow_dispatch, checkbox, branch guard, minimal GitHub permissions and pinned GitHub Actions. GitHub Secret NETLIFY_AUTH_TOKEN is injected only into the read step.

Existing site 6cd5980e-1876-40f3-85e4-b227362b4d3d; rollback Deploy ID 6acddaa9790643d38224f767; expected SHA 94ef03f7be78f250f573f7a89b1bda8afd9277b7.

The scanner reads existing site-scoped Preview Blobs: 500 candidate assets and 30 private keys; compares source manifest hashes and 450 recorded archive MP3 hashes, checks key fingerprints and structural compatibility, and reads rollback metadata. It does not log raw keys or user records. Archive-independent JSON/PNG proof is not available in the audio-only evidence file; do not call those matched to original archive. Editorial approval is separate.

IMPORTANT: Netlify personal access tokens may have write privileges independently of the read-only code. Review workflow before adding a temporary GitHub secret. Remove token after the audit. Do not run or request a token while under review.

GitHub requires workflow_dispatch files on the default branch for Actions Run workflow UI. Since main must remain untouched, this candidate stays in Preview and cannot be triggered in the normal Actions UI yet. After explicit approval only, authorize an isolated workflow-only addition to main, ensuring deploy triggers do not publish Preview.

Security checklist: no Production writes; no Netlify Blobs setters; no user data exports; no secret printing; no auto push trigger; no PR merge; no payment or PWA changes. This is not a backup or release procedure.
