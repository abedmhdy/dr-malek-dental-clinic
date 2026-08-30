# Backing up the source code — creating a private repository

## Why this matters

The project's Git history currently lives only on this one computer, as a
single old commit with a large amount of uncommitted work sitting on top of
it. If this machine is lost, stolen, or its disk fails, the *code* has no
backup — separate from the *data*, which is already safe in Neon. This
guide creates that safety net.

**No repository has been created on GitHub (or anywhere else) as part of
this work, and nothing has been pushed anywhere.** A clean local commit was
made (see below) so the current state is captured — creating the actual
remote and pushing to it are manual steps for you to take, exactly as
requested.

## What to check before you push, every time

Run this from the project root before every push:

```bash
node scripts/scan-secrets.js
```

It scans every file Git would include for anything that looks like a real
database connection string, private key, or session secret — not the
placeholder examples already in the docs (like `USER:PASSWORD@ep-example`).
It exits with an error and prints the exact file/line if it finds anything;
otherwise it prints "Safe to push." This is a plain Node script, not a Git
hook — nothing runs automatically, so it only protects you if you actually
run it. Get in the habit of running it right before `git push`, every time.

## What's already been verified safe

- `.env` files (which hold the real Neon credentials) are gitignored at the
  root, and were confirmed **never** committed, in any past commit.
- `desktop/resources/` (which briefly holds a plaintext copy of those same
  credentials during a desktop build) and `desktop/release/` (the built
  installers) are both gitignored and were confirmed never committed.
- `server/backups/` (backup `.sql` files and the backup-status log) is
  gitignored and was confirmed never committed.
- The project's full Git history was searched for connection-string
  patterns — every match found was a placeholder example in documentation
  (`USER:PASSWORD@ep-xxxx...`), not a real credential.
- `scripts/scan-secrets.js` (above) currently reports no findings.

## Step 1: create a PRIVATE repository

Do this yourself on whichever Git host you prefer (GitHub used as the
example — Do NOT do this automatically; this is deliberately a manual step
for you):

1. Go to https://github.com/new (log into your own account first).
2. Repository name: your choice (e.g. `dr-malek-dental-clinic`).
3. **Visibility: Private.** This is important — the codebase, while it
   contains no secrets, does describe the clinic's exact security posture
   and architecture, which is not something to publish openly.
4. Do **not** check "Initialize with a README" — this project already has
   one, and an auto-generated one would conflict.
5. Click **Create repository**. GitHub will show you a remote URL like
   `https://github.com/your-username/dr-malek-dental-clinic.git` — copy it.

## Step 2: connect this local repo to it and push

```bash
cd "C:\Users\User\Desktop\Dental-Clinic"
node scripts/scan-secrets.js
git remote add origin https://github.com/your-username/dr-malek-dental-clinic.git
git push -u origin master
```

(Replace the URL with the one GitHub gave you in Step 1.) You'll be
prompted to authenticate — GitHub no longer accepts a plain password here;
use a Personal Access Token (GitHub will guide you to create one) or GitHub
Desktop / the `gh` CLI if you prefer a GUI flow.

## Step 3: confirm it worked

Refresh the repository page on GitHub — you should see all the project's
files. Spot-check that `server/.env`, `desktop/resources/`, and
`desktop/release/` are **not** present in the file list (they shouldn't be
— this confirms `.gitignore` did its job on the actual push, not just
locally).

## From now on

Before shipping any future change:

```bash
git add -A
git status              # review what's about to be committed
node scripts/scan-secrets.js
git commit -m "..."
git push
```

This gives every future version of the app a corresponding commit to roll
back to, and a copy of the code that survives this one computer.
