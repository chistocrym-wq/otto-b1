# OTTO B1 — One repository, one Netlify Preview

For PR #1 of **chistocrym-wq/otto-b1** only.
Do not change OTTO A1, its Netlify site, payments or Production.
The B1 site is named **otto-b1-preview** and deploys are preview aliases only (no `--prod`).

## One repository for source and original MP3 archives

No separate audio repository, S3 bucket, presigned URLs or additional GitHub Secrets are required.

1. In **chistocrym-wq/otto-b1 → Releases → Draft a new release**, create a new tag **`b1-audio-source`** on the `feature/goethe-b1-content` branch.
2. Attach the three original source archives from the owner's computer with their exact names: `HT3.zip`, `HT4.zip`, `ST3.zip`.
3. Publish the release. GitHub Release allows individual assets up to 2 GiB. Do not try to commit the 340 MB archive using the GitHub file browser.
4. Re-run the PR workflows (or push a follow-up commit to the feature branch). They will download the three ZIPs from the **same B1 repository**, verify the original recordings, assemble the existing JSONL MP3 packages on the runner, and create an independent non-production Netlify Preview.
5. A success log prints the exact HTTPS URL. Do not merge PR #1 before validation.

### Netlify configuration

An independent Netlify site named **otto-b1-preview** is required. Use exactly these two GitHub Actions repository Secrets:

- `NETLIFY_B1_AUTH_TOKEN`: Netlify token for the user's account;
- `NETLIFY_B1_SITE_ID`: API ID of that independent B1 site.

The build verifies the site name starts with `otto-b1` and rejects links to a different repository. It does **not** use A1 credentials.

The 599 source MP3 records are indexed in `public-b1/b1/audio-index.json`; the currently missing assets are built on each preview runner from the original three ZIPs in this same repository's Release. The source archives are not included in the Netlify deployment.

### Important public visibility and publication rights

As of 2026-11-07, `chistocrym-wq/otto-b1` is **public**. Release attachments in a public repo are downloadable by others immediately, including the entire source audio archives. Converting the repository to private later cannot retract copies already downloaded. Before attaching these archives, confirm you are authorized to distribute their audio. A public Netlify Preview also exposes its playable media.

There is one known original absent recording `T3-030-P01`, while the 30 `Q01` entries are student-recording prompts, not missing MP3 assets.
