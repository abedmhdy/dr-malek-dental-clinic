# Cloud Database Migration — SQLite → PostgreSQL (Neon)

This document covers the move from the local, single-computer SQLite
database to a cloud-hosted PostgreSQL database, so Dr. Malek can log in
from any computer and see the same patients, appointments, visit history,
and settings.

**Nothing about how the app works changed.** The frontend still only talks
to the backend API; the backend still uses Prisma; only the database engine
and its location changed (a local file → a cloud Postgres server).

---

## 1. Provider chosen: Neon

**Neon**, used purely as managed PostgreSQL (Supabase's own Auth product is
explicitly *not* used — the app keeps its existing Express/bcrypt/session
authentication, per your requirement).

**Why Neon over Supabase for this project specifically:**

- **Idle behavior fits a clinic's real usage pattern.** A dental clinic's
  database sits idle most of the day (only accessed during patient visits),
  and idle for stretches on weekends/holidays. Neon's free tier
  *autosuspends* a database after 5 minutes of inactivity and wakes it on
  the next query in about a second. Supabase's free tier *pauses the entire
  project* after 7 days of no usage, requiring a manual "unpause" click in
  the dashboard before the app works again — a bad fit for a clinic that
  might not open the app every single day.
- **Simpler surface area.** Supabase bundles Auth, Storage, Realtime, and
  Edge Functions alongside Postgres. Since none of those are used here, Neon
  (which is just a very well-supported managed Postgres, with first-class
  Prisma documentation for exactly the pooled/direct connection split this
  migration needs) avoids unused moving parts and dashboard surface.
- **Both are fully capable managed Postgres** for this app's needs — this
  was a close call between two good options, not "Supabase is unsuitable."

---

## 2. Files changed

| File | Change |
|---|---|
| `server/prisma/schema.prisma` | `datasource` provider `sqlite` → `postgresql`; added `directUrl`; added 2 composite indexes (`Appointment(date, startTime)`, `Visit(patientId, visitDate)`) |
| `server/prisma/migrations/20260826111534_init_postgres/` | New Postgres migration (tables, FKs, standard indexes) |
| `server/prisma/migrations/20260826111646_add_patient_search_and_sequence/` | New migration: `patient_number_seq` sequence + `pg_trgm` search indexes |
| `server/prisma/migrations_sqlite_archive/` | The old SQLite migration history, preserved (not deleted) for reference |
| `server/src/config/env.js` | Reads `DATABASE_URL`/`DIRECT_URL`; removed SQLite file-path logic |
| `server/.env.example` | Documents `DATABASE_URL` (pooled) + `DIRECT_URL` (direct) for Neon, with `sslmode=require` |
| `server/src/services/patientService.js` | `generatePatientNumber()` now uses an atomic Postgres sequence instead of "read max, add one" (safe under real concurrent multi-computer access); search/duplicate-check queries now pass `mode: 'insensitive'` (Postgres `LIKE` is case-sensitive by default, unlike SQLite) |
| `server/src/services/backupService.js` | Rewritten: SQLite file-copy → `pg_dump`/`pg_restore` against the cloud database |
| `server/src/controllers/backupController.js`, `src/scripts/backup.js` | Updated for the new async, `.sql`-based backup format |
| `server/src/scripts/restore.js` | **New** — CLI restore from a backup file |
| `server/src/scripts/migrateFromSqlite.js` | **New** — one-time data migration from the old `clinic.db` into Postgres |
| `server/package.json` | Added `better-sqlite3` dependency (reads the old file directly); added `restore` and `migrate-from-sqlite` scripts |
| Frontend (`client/`) | **No changes.** It never talked to the database directly — only to the backend API — so nothing there needed to change. |

---

## 3. Environment variables required

In `server/.env` (never committed — already in `.gitignore`):

```
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx-pooler.<region>.aws.neon.tech/dbname?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxxx.<region>.aws.neon.tech/dbname?sslmode=require"
```

- **`DATABASE_URL`** — the app's normal connection, through Neon's pooler
  (hostname contains `-pooler`). Used for every request the running server
  makes.
- **`DIRECT_URL`** — the direct, unpooled connection (no `-pooler`). Used
  only by Prisma Migrate (`prisma migrate deploy` etc.) and by
  `pg_dump`/`pg_restore`, which need a stable session that a transaction
  pooler doesn't reliably provide.
- Both are **backend-only**. They are read from `server/.env` by
  `server/src/config/env.js` and never sent to, or reachable from, the
  frontend — the browser only ever talks to `VITE_API_URL` (the Express
  API), never to Postgres.

---

## 4. Creating the cloud database (Neon)

1. Go to https://neon.com and sign up (free — GitHub/Google/email).
2. Create a new **Project**. Pick a region close to the clinic (lower
   latency). Postgres version 16 or 17 — either works with this app.
3. On the project dashboard, click **Connect**. Neon shows you a
   connection string. There is a toggle for **"Pooled connection"** —
   copy it *twice*:
   - With "Pooled connection" **ON** → this is your `DATABASE_URL`. Add
     `&pgbouncer=true` to the end if it isn't already there.
   - With "Pooled connection" **OFF** → this is your `DIRECT_URL`.
4. Paste both into `server/.env` (copy `server/.env.example` first if you
   haven't already).
5. From `server/`, run:
   ```bash
   npx prisma migrate deploy
   ```
   This creates every table, index, and the `patient_number_seq` sequence
   in your new cloud database — the same schema that was tested locally.
6. Create the doctor's account in the *new* database:
   ```bash
   npm run create-admin
   ```
   (Do this even if you already had an account in the old SQLite database —
   accounts don't carry over automatically; see the migration script in
   Section 5 if you want to bring the *existing* account and its data over
   instead of starting fresh.)

---

## 5. Migrating existing data from the old SQLite database

If there is real (or demo) data already sitting in
`server/prisma/data/clinic.db` that you want to keep — rather than starting
fresh with `create-admin` — use the migration script instead of step 6
above.

**What it does, safely:**

1. Makes a timestamped copy of `clinic.db` into `server/backups/` before
   touching anything. **The original file is never modified or deleted.**
2. Reads every row from the old database (Users, Patients, Appointments,
   Visits, Settings, AuditLog).
3. Refuses to run if the target Postgres database already has any data in
   these tables (prevents accidental duplication) — unless you pass
   `--force`.
4. Writes everything inside a **single transaction**: if anything fails
   partway, nothing is committed.
5. Fixes up the id sequences and `patient_number_seq` afterward, so the
   *next* patient/appointment/etc. created through the app gets a fresh,
   non-colliding ID.
6. Counts rows in the source and the target and **fails loudly** if they
   don't match exactly.

**Steps:**

```bash
cd server
npx prisma migrate deploy          # make sure the Postgres schema exists
npm run migrate-from-sqlite         # dry run first if you want:
                                     #   npm run migrate-from-sqlite -- --dry-run
```

You'll see output like:

```
Source SQLite file: ...\clinic.db
Backed up source file to: ...\backups\pre-migration-sqlite-<timestamp>.db
Source row counts: { User: 1, Patient: 12, Appointment: 34, ... }
Target (Postgres) row counts before migration: { User: 0, Patient: 0, ... }
Starting migration inside a single transaction...
Target (Postgres) row counts after migration: { User: 1, Patient: 12, Appointment: 34, ... }
Migration verified: every table matches the source row count exactly.
```

**Verifying success:** the script itself verifies counts and exits with a
non-zero status and a clear error if anything is off — but you can also
open the app, log in with the doctor's *existing* username/password, and
confirm the patient list, calendar, and visit history all look right.

**Running it twice by accident:** the script checks the target for existing
data first and refuses outright with a clear message. Even bypassing that
with `--force`, the second run would still fail cleanly on a primary-key
conflict (IDs are preserved exactly) rather than silently duplicating rows.

**Rollback:** the old SQLite file is untouched and still fully functional —
point `DATABASE_URL` back at `file:./data/clinic.db` and revert
`schema.prisma`'s provider to `sqlite` (or just keep a copy of the
pre-migration `schema.prisma`/`.env` on hand) to go back to exactly the
previous local-only setup. Nothing about the migration is destructive to
the source.

---

## 6. How the doctor logs in on a new computer

1. Install Node.js on the new computer (see main `README.md`, section 2).
2. Copy the project folder (or `git clone` it) onto the new computer.
3. `npm install` in both `server/` and `client/`.
4. Copy `server/.env` from the first computer — **specifically the
   `DATABASE_URL`, `DIRECT_URL`, and `SESSION_SECRET` lines** — onto the new
   computer's `server/.env` (transfer this file securely: a USB drive or a
   password manager's secure note, never email/chat in plain text).
5. `npm run dev` in `server/` and `client/`, same as always.
6. Open `http://localhost:5173`, log in with the **same username and
   password** used on Computer A.
7. The same patients, appointments, and visit history appear immediately —
   they were never on Computer A's disk to begin with, only in the cloud
   database both computers now point to.

No database export/import is needed between computers — both simply point
at the same Neon project.

---

## 7. Backups

### Automatic (provider-side) — the primary safety net

Neon keeps a continuous history of database changes (point-in-time
recovery) that lets you restore to any moment within your plan's retention
window (the free plan includes some retention; paid plans extend it) —
without running anything yourself. Neon's **branching** feature also lets
you instantly create a full copy of the database (e.g. before a risky
change) from the dashboard in seconds. This is the recommended first line
of defense — check current retention details for your plan at
https://neon.com/docs/introduction/point-in-time-restore.

### Automatic backups (this app)

The backend now also runs its own periodic backup, independent of Neon's
PITR above. On every startup, and then every few hours while it keeps
running, it checks: *"is the last successful backup older than 24 hours (or
missing)?"* — if so, it runs one automatically via the same `pg_dump` path
as the manual button. This "check on startup + periodically after" design
(rather than a fixed clock time like "every day at 2am") is deliberate: the
desktop app is only running while the doctor has it open, so a fixed-time
schedule could be missed entirely on a day the app opens late or closes
early.

- **Check interval while running:** every 6 hours (`AUTO_BACKUP_CHECK_INTERVAL_HOURS`)
- **Backup considered stale after:** 24 hours since the last success (`AUTO_BACKUP_MAX_AGE_HOURS`)
- **Retention:** the 30 most recent backups are kept; older ones are deleted
  automatically after each successful backup (`BACKUP_RETENTION_COUNT`).
  Backups are never overwritten (each is uniquely timestamped) and the
  currently-newest backup is never pruned.
- **Status:** every attempt (automatic or manual) is recorded to
  `server/backups/backup-status.json` — last success, last failure (with a
  short, redacted reason — never the connection string), and the next
  scheduled check. This also appears in the app under **Settings → Backup
  Status**. Automatic runs are also written to the in-app audit log
  (`BACKUP_AUTO_CREATED` / `BACKUP_AUTO_FAILED`).
- All three env vars above are optional overrides — sensible defaults apply
  if unset.

### Manual backups (this app)

**From the app:** Settings → Backup → **Create Backup Now**. This runs
`pg_dump` against the database and saves a plain-SQL file to
`server/backups/clinic-backup-<timestamp>.sql`. Click **Download** to save
it to the computer's Downloads folder — from there, copy it to a USB drive
or external disk regularly, the same as before.

**From the command line:**
```bash
cd server
npm run backup
```

**Requirement:** `pg_dump`/`psql` (the PostgreSQL command-line client
tools) must be installed on the machine running the backend. On Windows,
installing PostgreSQL itself (even if you don't use its local server)
provides these — see https://www.postgresql.org/download/windows/, or
install just the client tools. If they're installed somewhere not on the
system `PATH`, set `PG_BIN_DIR` in `server/.env` to their `bin` folder. If
these tools are missing, both manual and automatic backups fail cleanly
(recorded as a failure in Backup Status) — nothing else in the app is
affected.

### Restoring a backup

```bash
cd server
npm run restore -- clinic-backup-2026-01-15T09-00-00-000Z.sql
```

This restores into whatever database `DATABASE_URL`/`DIRECT_URL` currently
point to. For disaster recovery onto a **new** empty Neon project (e.g. the
original project was somehow lost), point `.env` at the new project first,
run `npx prisma migrate deploy` to create the schema, then run the restore.

### Testing that a backup is actually restorable

A backup file that has never been restored is unverified. Test this
periodically — **never against the live production database** — using a
disposable target instead:

1. **Easiest: a Neon branch.** In the Neon dashboard, create a branch of the
   project (an instant, separate copy). Copy that branch's connection
   strings into a scratch `.env` (or pass them inline), then run
   `npm run restore -- <backup-file>.sql` pointed at the branch. Check the
   row counts / spot-check a few patients and appointments, then delete the
   branch when done — the live database was never touched.
2. **Alternative: a throwaway local Postgres.** Install Postgres locally (or
   use a disposable Docker container), create an empty database, run
   `npx prisma migrate deploy` against it to build the schema, then restore
   the backup file into it and verify the data.

Either way, the goal is the same: confirm the `.sql` file actually contains
real, restorable data before trusting it as a disaster-recovery plan.

---

## 8. Verifying the migration succeeded

- The migration script's own count-comparison (Section 5) is the primary
  check — it fails loudly on any mismatch.
- Manually: log in as the doctor, open **Patients** and confirm the total
  count matches what you expect; open a patient with known visit history
  and confirm every visit is there; open the **Calendar** and confirm
  today's/upcoming appointments appear; check **Settings → Backup** works.
- Technical spot-check (optional), from `server/`:
  ```bash
  npx prisma studio
  ```
  opens a browser-based table viewer against whichever database `.env`
  currently points to.

---

## 9. Security notes

- **TLS is mandatory.** Every example connection string ends in
  `sslmode=require` — Neon enforces encrypted connections; never remove
  this.
- **Credentials never reach the frontend.** `DATABASE_URL`/`DIRECT_URL`
  exist only in `server/.env`, read only by the Node backend. The browser
  only ever calls `VITE_API_URL` (the Express API).
- **All existing security middleware is unchanged**: bcrypt password
  hashing, HTTP-only session cookies, CSRF token enforcement, login rate
  limiting + lockout, Helmet security headers, and the audit log all work
  identically — none of them are aware of, or affected by, which database
  engine is behind Prisma.
- **Rotate `.env` secrets if ever exposed.** If a `DATABASE_URL` is ever
  accidentally committed to Git, shared in chat, or otherwise exposed,
  reset the database password from the Neon dashboard immediately (this
  invalidates the old connection string) and update `.env` on every
  computer.
- **Neon dashboard access** is itself a credential to protect — anyone who
  can log into your Neon account can read the connection string and thus
  the database. Use a strong, unique password and enable 2FA on the Neon
  account.

### What is **not yet done** — required before real clinical use

This migration makes the data reachable from multiple computers, but on its
own it does **not** make this a HIPAA/GDPR-compliant clinical system. Before
storing real patient data:

- **No compliance claim is made here**, and none should be assumed. If this
  system needs to meet a specific regulatory framework (e.g. HIPAA in the
  US, GDPR in the EU, or a local health-data law), that requires a real
  assessment — a signed Business Associate Agreement with your cloud
  provider where applicable, a documented data retention/deletion policy,
  breach-notification procedures, and likely a professional security
  review. None of that is in scope of this code change and none of it has
  been verified.
- **HTTPS for the backend itself.** Right now `server/.env`'s
  `NODE_ENV=development` and the app runs over plain HTTP on localhost.
  Before hosting the *backend* itself somewhere reachable over the
  internet (as opposed to just its database), it must run behind HTTPS
  (session cookies are marked `Secure` automatically once
  `NODE_ENV=production`, which requires HTTPS to function) — see Section 10.
- **Session store.** It is currently in-memory (see the comment in
  `server/src/config/session.js`); this is fine for local use but should
  become a persistent store (e.g. `connect-pg-simple`, pointed at the same
  Postgres database) before multiple staff or higher traffic are expected.
- **Least-privilege database credentials.** The connection string Neon
  gives you by default is a full-access superuser-like role on that
  project. For extra defense-in-depth, consider creating a
  narrower-privilege Postgres role for the app to connect as.

---

## 10. Preparing for the backend itself to be hosted online later

Today, only the *database* is cloud-hosted — the Node backend still runs on
the doctor's own computer. If it is later deployed to a server too
(so the doctor doesn't need to keep a computer running as the "server"):

- Set `NODE_ENV=production` — this automatically marks session cookies
  `Secure` (HTTPS-only) and disables verbose error output.
- Put it behind HTTPS (a reverse proxy like Caddy/nginx with a free Let's
  Encrypt certificate, or the hosting platform's built-in HTTPS).
- Set `CLIENT_ORIGIN` to the real frontend URL (not `localhost`).
- Swap the in-memory session store for a persistent one (see Section 9).
- Nothing about the database layer needs to change — it's already
  cloud-hosted and reachable from wherever the backend ends up running.

---

## 11. Estimated monthly cost

Neon's **Free plan** (as of this writing — verify current terms at
https://neon.com/pricing, pricing changes over time):
- $0/month
- 0.5 GB storage, 100 compute-hours/month, autosuspend after 5 min idle

For one dental clinic's text-only records (no images/X-rays stored in this
version), 0.5 GB is a great deal of headroom — tens of thousands of
patient/appointment/visit rows easily fit in a fraction of that, and a
clinic's realistic daily usage pattern (open during business hours, idle
overnight/weekends) comfortably fits the compute-hour allowance. **Realistic
estimate: $0/month for a long time.**

If usage ever exceeds the free tier, Neon's paid tiers are pay-as-you-go
(metered hourly, no fixed monthly fee) — for a workload this light, that
would likely still be a small single-digit dollar amount per month, but
this is inherently variable and should be checked against current pricing
rather than assumed.

---

## 12. What happens if the internet is unavailable

This is the main real trade-off of moving off local SQLite: **the app
cannot function without internet access**, because every request now needs
to reach the cloud database. If the clinic's internet goes down:

- The doctor cannot log in, view the calendar, or record visits until
  connectivity is restored.
- No local fallback/offline mode exists in this version — that would be a
  substantial architecture change (a local cache + sync-when-reconnected
  layer), listed as a possible future improvement, not attempted here per
  your instruction not to redesign the app beyond the database swap.
- **Mitigation for now:** keep a mobile hotspot as a backup connection for
  the clinic computer, and keep regular manual backups (Section 7) so that,
  worst case, a recent snapshot of the data is always available even if the
  cloud database itself were ever unreachable for an extended period.

---

## 13. Recommended next steps

- Decide on and implement a specific compliance posture (HIPAA/GDPR/local
  equivalent) if this will hold real patient data — see Section 9's caveat.
- Move the session store to `connect-pg-simple` (same Postgres database) if
  the backend will be restarted often or multiple staff will use it
  concurrently.
- Host the backend itself online (Section 10) so a computer doesn't need to
  stay on as the "server" — Computer A and Computer B would then both just
  be browsers pointed at one URL.
- Consider a narrower-privilege Postgres role for the app's `DATABASE_URL`
  instead of the default Neon connection role.
- If patient dental images/X-rays are added later, they should go to
  object storage (e.g. S3-compatible), not into Postgres rows.
