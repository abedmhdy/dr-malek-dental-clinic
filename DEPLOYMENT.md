# Hosting the backend — removing Neon credentials from the installer

## The problem this solves

Today, the desktop installer bundles the Neon `DATABASE_URL`, `DIRECT_URL`,
and `SESSION_SECRET` in plaintext (see `desktop/SECURITY-NOTES.md`) so the
app can run its own backend locally on the doctor's PC. Anyone who obtains
the installer file or the USB drive it shipped on can extract those
credentials.

The fix is architectural, not a config tweak: move the backend off the
doctor's PC entirely, onto a small always-on HTTPS host. The desktop app
then only ever needs to know that host's **public URL** — not a secret —
exactly the same way any normal web app's frontend only knows an API URL.

```
Before:  Desktop app  ──spawns──▶  local backend  ──▶  Neon   (DB creds on the PC)
After:   Desktop app  ──HTTPS───▶  hosted backend  ──▶  Neon   (DB creds only on the host)
```

Nothing about Neon itself changes — same project, same data, same schema.
Only *where the backend process runs* changes.

**No external account has been created and no cloud resource has been
provisioned as part of this work.** Everything below is preparation:
code that supports this mode, and the exact steps to do it yourself (or ask
for help doing) when you're ready. Nothing is billed until you complete
those steps on a platform of your choosing.

---

## What's already been prepared in the code

- `server/` was already fully hosting-ready before this change — it reads
  `DATABASE_URL`/`SESSION_SECRET`/etc. from environment variables regardless
  of where it runs, and already marks session cookies `Secure` under
  `NODE_ENV=production`.
- **Fixed as part of this work:** that `Secure`-cookie logic used to key off
  whether the app was serving static files (`STATIC_DIR`), which conflated
  "serves its own frontend" with "is loopback-only" — a hosted deployment
  that also serves its frontend would have kept insecure cookies. It's now
  a dedicated `LOOPBACK_ONLY` flag, set only by the desktop app's local
  mode. See `server/src/config/env.js` and `server/src/config/session.js`.
- `desktop/main.js` now supports a **remote mode**: if the app's config
  points at `BACKEND_URL` instead of a `DATABASE_URL`, it skips spawning any
  local backend and simply opens the window at that hosted URL — checking
  its database-aware `/api/health` first, exactly like local mode.
- `desktop/scripts/prepare-resources.js` now supports building that remote
  desktop variant: run it with `DESKTOP_BACKEND_URL` set, and the installer
  it produces contains **no database credential of any kind** — only the
  backend's public URL.
- Session storage is now `connect-pg-simple` (a `session` table in the same
  Neon database) instead of the in-memory store — a prerequisite for
  hosting, since a hosted platform can restart/redeploy the backend process
  at any time, and an in-memory store would silently log everyone out on
  every restart. Verified surviving a real backend restart.

## What you still need to decide and do

1. **Choose a host.** Recommended for this workload (one clinic, light
   traffic, a plain Node/Express app): **Render.com** — free-tier Web
   Services need no credit card, provision HTTPS automatically, and (like
   Neon) spin down after inactivity and wake on the next request in a
   handful of seconds, which the app's existing retry/offline-page logic
   already handles gracefully. Railway and Fly.io are comparable
   alternatives; a plain VPS (with a reverse proxy for HTTPS, e.g.
   Caddy) works too but is more manual upkeep. **Verify current pricing and
   terms yourself before signing up** — they change over time, and this is
   your decision to make, not something to assume on your behalf.
2. **Create the account and the service yourself** (or explicitly ask for
   help doing it interactively) — this is exactly the kind of external
   account/resource creation this task was told not to do automatically.
3. Follow the steps below once you've picked a host and are ready.

---

## Exact procedure (using Render as the example host)

### 1. Get the code into a place Render can deploy from

Render deploys from a Git repository. See the companion `GIT-SETUP.md` for
how to safely push this project to a **private** GitHub repository — do
that first if you haven't already.

### 2. Create the Web Service

In the Render dashboard: **New → Web Service**, connect the private repo.

| Setting | Value |
|---|---|
| Root Directory | *(leave blank — repo root)* |
| Build Command | `cd client && npm install && npm run build && cd ../server && npm install && npx prisma generate && mkdir -p public && cp -r ../client/dist/* public/` |
| Start Command | `cd server && npm start` |
| Instance Type | Free (or the smallest paid tier if you outgrow it) |

The build command does two things in one pass: builds the React frontend,
then copies its output into `server/public` so the backend can serve it
itself from the same origin — exactly mirroring how the desktop app serves
its own frontend today, just on a real host instead of loopback. This keeps
session cookies same-origin and avoids introducing cross-site cookie
complexity.

### 3. Set environment variables (Render dashboard → Environment)

| Key | Value |
|---|---|
| `DATABASE_URL` | Your existing Neon pooled connection string (from `server/.env`) |
| `DIRECT_URL` | Your existing Neon direct connection string |
| `SESSION_SECRET` | Your existing session secret, **or generate a new one** — see note below |
| `NODE_ENV` | `production` |
| `STATIC_DIR` | `public` |
| `PORT` | Render sets this automatically — do not override it |

Do **not** set `LOOPBACK_ONLY` — leaving it unset is what makes session
cookies properly `Secure` on this real HTTPS host.

**About `SESSION_SECRET`:** rotating it invalidates all currently logged-in
sessions (everyone just has to log in again — no data is affected). If
you're moving the *only* current deployment, reusing the same value is
fine. If both the old desktop-local backend and this new hosted one could
ever run at the same time pointed at the same database, that's harmless too
— they don't share session state.

### 4. Verify the hosted backend before touching the desktop app

Once Render finishes deploying, it gives you a URL like
`https://dr-malek-clinic.onrender.com`. Check:

```
https://dr-malek-clinic.onrender.com/api/health
```

should return `{"status":"ok","database":"ok"}`. Then open
`https://dr-malek-clinic.onrender.com/login` in a normal browser and confirm
you can log in with the doctor's existing credentials and see the existing
patients/appointments — this is the same Neon database, so everything
should already be there.

### 5. Rebuild the desktop app in remote mode

```bash
cd desktop
DESKTOP_BACKEND_URL=https://dr-malek-clinic.onrender.com npm run prepare-resources
npm run dist
```

This produces an installer that contains **no database credential at all**
— only that URL. Install it (it will prompt to replace the existing local
version) and confirm the app now loads the hosted backend instead of
spawning a local one.

### 6. Decommission the old local-mode secret

Once the hosted version is confirmed working end-to-end, the plaintext
`config.env` left behind by any previously-installed local-mode build (in
`%AppData%\Dr. Malek Dental Clinic\`) still contains the old credentials on
whatever machine it was installed on. Delete that file (or the whole
`%AppData%\Dr. Malek Dental Clinic` folder) on any machine that had the
old local-mode build installed, once you're sure you no longer need it as a
fallback.

---

## If you decide not to host it yet

Nothing forces this migration immediately — the current local-mode desktop
app keeps working exactly as it does today, unchanged, until you choose to
build and install a remote-mode version. This document exists so the switch
is a well-defined, low-risk procedure whenever you're ready, not an
open-ended redesign.
