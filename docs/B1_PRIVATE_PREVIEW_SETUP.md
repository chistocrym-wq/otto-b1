# OTTO B1 — private audio and isolated Netlify Preview setup

These instructions apply **only** to `chistocrym-wq/otto-b1`, PR #1, `feature/goethe-b1-content`.
No merge to `main`. Do not copy OTTO A1 tokens, storage namespaces, or payment credentials.

## Verified inputs
- Three source ZIPs are available in the conversation environment: `HT3.zip`, `HT4.zip`, `ST3.zip`.
- Each ZIP passed its CRC check. The manifest maps 599 original MP3 filenames.
- The repository currently contains 136/599 source audio files. The remaining 463 are reconstructed **from originals** during the secure GitHub Actions build, not generated synthetically.
- The absent `T3-030-P01` was never supplied; 30 `Q01` placeholders represent student recordings, not partner MP3 files.

## No public GitHub Release required

**Never upload the source ZIPs to a public GitHub Release or commit them to this public repository unless you have distribution rights.**

Place the THREE source archives, not hundreds of individual MP3s, in a **private** object store (e.g. S3-compatible bucket).
Generate three **HTTPS presigned GET URLs**, valid long enough for CI (~24 hours or longer).
Enter those URLs as GitHub Actions repository secrets. Do not paste URLs or credentials into pull-request comments or chat.

The B1 PR workflow `b1-import-audio.yml` runs via `pull_request`, not `workflow_dispatch`, because the file is not in the default branch. It downloads and checks the originals on an ephemeral CI runner and never pushes the ZIPs or generated packs into the public repository. Its ZIPs are deleted after checks.

## Create a separate Netlify B1 site

The safest setup is an **independent blank Netlify site** named `otto-b1-preview`. Do **not** import the current `otto-b1` repository with automatic Production build from `main`: its `main` still contains the copied A1 application.
Create the empty site through Netlify management (or `netlify sites:create --name otto-b1-preview` while signed into the desired team). Production may contain only a placeholder; this workflow deploys **only** a non-production alias.

In GitHub repository → Settings → Secrets and variables → Actions → New repository secret,
add the following FIVE secrets:

| Secret | Value |
| --- | --- |
| `NETLIFY_B1_AUTH_TOKEN` | New Netlify personal access token (never use A1 credentials) |
| `NETLIFY_B1_SITE_ID` | API ID of the separate `otto-b1-preview` site, from Netlify Site configuration |
| `B1_AUDIO_HT3_URL` | Temporary private HTTPS GET URL for original `HT3.zip` |
| `B1_AUDIO_HT4_URL` | Temporary private HTTPS GET URL for original `HT4.zip` |
| `B1_AUDIO_ST3_URL` | Temporary private HTTPS GET URL for original `ST3.zip` |

GitHub masks secret values in logs. The scripts do not print URLs.
The workflow verifies the target site name begins `otto-b1`, and that a linked repo (if any) is `chistocrym-wq/otto-b1`.

## Running PR #1 preview

With all five secrets in place, push any change to `feature/goethe-b1-content` (or re-run the latest PR workflow).
The `pull_request` trigger launches:
- `OTTO B1 private audio import verification`: fetch originals, assemble real MP3 audio bundles in the ephemeral runner, run 599-audio integrity test.
- `OTTO B1 isolated Netlify Preview`: repeat import, verify all materials, typecheck and Vite build, deploy with **`netlify deploy --alias pr-1` without `--prod`**.

No ZIP files or private URLs are included in the deployed output. The deployed site does contain playable MP3 audio and German task content, because a **publicly viewable Preview makes its media publicly accessible**. Ensure publication rights before sharing the Preview.

A successful GitHub job prints the exact HTTPS preview URL in its job logs.

## Current blockers

Until a private object store contains the originals and all five secrets are configured, Netlify publication correctly stops before deploying.
No production release, account migration or payment activation is authorized.
