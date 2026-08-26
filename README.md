# Dr. Malek Abu Sholdom — Dental Clinic Management System

A private clinic management system: secure login, a day/week/month
appointment calendar, patient records with full visit/treatment history, and
full support for **Arabic, Hebrew, and English** (with correct RTL/LTR
switching). The frontend/backend run on the doctor's computer(s); patient
data lives in a cloud PostgreSQL database (Neon), so the same account and
data are reachable from any computer, not tied to one machine's disk — see
[CLOUD-DATABASE.md](CLOUD-DATABASE.md) for the full rationale and setup walkthrough.

This guide assumes **no prior programming experience**. Follow it top to
bottom the first time.

---

## 1. What's in this project

```
Dental-Clinic/
├── server/     Node.js/Express API + PostgreSQL database (Prisma ORM, hosted on Neon)
└── client/     React (Vite) frontend
```

The backend and frontend are two separate applications that talk to each
other over HTTP. You run both at the same time on your computer.

---

## 2. Required software

Install these once, in order:

1. **Node.js** (version 18 or newer — version 20+ recommended).
   Download from https://nodejs.org (choose the "LTS" version).
   After installing, verify it worked by opening a terminal and running:
   ```bash
   node -v
   npm -v
   ```
   Both commands should print a version number.

2. **Git** (optional, only if you want version control).
   https://git-scm.com/downloads

3. **A free Neon account** (cloud PostgreSQL) — https://neon.com. You do
   **not** need to install PostgreSQL yourself; Neon hosts it. See
   [CLOUD-DATABASE.md](CLOUD-DATABASE.md) section 4 for the 5-minute setup.

### Opening a terminal on Windows

Press `Win + R`, type `powershell`, press Enter. Or use the integrated
terminal in VS Code. All commands below work in PowerShell or Git Bash.

---

## 3. Why PostgreSQL on Neon (and not MongoDB/local SQLite)

The system uses **PostgreSQL** through **Prisma** (a type-safe database
toolkit for Node.js), hosted on **Neon** (managed cloud Postgres):

- **Reachable from any computer.** The doctor can open the app on a new
  computer, log in with the same credentials, and see the same patients and
  appointments immediately — nothing is tied to one machine's local disk.
- **Zero server administration.** Neon hosts, patches, and backs up the
  Postgres server itself; there is no database server to install or keep
  running on the clinic computer.
- **Scales far beyond one clinic's needs** (tens of thousands of patients,
  hundreds of thousands of appointments/visits) without any schema changes.
- **Full Prisma support**, including the same models, relations, and query
  code the app already used — this was a database *swap*, not an
  application rewrite.

An earlier version of this project used local SQLite (a single file on the
clinic computer) for simplicity during initial development. See
[CLOUD-DATABASE.md](CLOUD-DATABASE.md) for the full reasoning behind moving
to Neon specifically (vs. Supabase), exactly what changed, and how to
migrate existing local data.

---

## 4. Install dependencies

Open a terminal in the project folder and run:

```bash
cd server
npm install
cd ../client
npm install
```

This downloads all required packages into `node_modules` folders (these are
already excluded from Git via `.gitignore`).

---

## 5. Configure environment variables

Both `server` and `client` need a `.env` file. **Never commit `.env` to Git**
— only the `.env.example` templates are tracked.

### Backend (`server/.env`)

```bash
cd server
cp .env.example .env        # Windows PowerShell: copy .env.example .env
```

Open `server/.env` and set a real random `SESSION_SECRET`. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste the output as the value of `SESSION_SECRET` in `.env`.

Then set `DATABASE_URL` and `DIRECT_URL` to your Neon project's connection
strings (see [CLOUD-DATABASE.md](CLOUD-DATABASE.md) section 4 for exactly
where to find these in the Neon dashboard):
```
PORT=4000
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx-pooler.<region>.aws.neon.tech/dbname?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxxx.<region>.aws.neon.tech/dbname?sslmode=require"
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
SESSION_MAX_AGE_MINUTES=480
```

### Frontend (`client/.env`)

```bash
cd client
cp .env.example .env
```

Default is correct for local use:
```
VITE_API_URL=http://localhost:4000/api
```

---

## 6. Create the database tables

From the `server` folder, once `DATABASE_URL`/`DIRECT_URL` in `.env` point
to your Neon project:

```bash
npx prisma migrate deploy
```

This creates every table the app needs (users, patients, appointments,
visits, settings, audit log) in your cloud database, along with the search
and patient-ID indexes described in [CLOUD-DATABASE.md](CLOUD-DATABASE.md).

> Already have data in an old local `clinic.db` file you want to keep
> instead of starting fresh? Use the migration script instead — see
> [CLOUD-DATABASE.md](CLOUD-DATABASE.md) section 5.

---

## 7. Create the first doctor account (administrator setup)

**Do not** hard-code a password into any source file. Instead, run the setup
script and enter credentials interactively:

```bash
cd server
npm run create-admin
```

You'll be prompted for a username and a password (minimum 8 characters).
The password is hashed with bcrypt before being stored — it is never saved
or logged in plain text. Remember these credentials; you'll use them to log
in.

> Re-running `npm run create-admin` with an existing username safely resets
> that account's password (useful if the doctor forgets it).

### Optional: demo data

To explore the system with fictional sample patients/appointments (never
real patient data):

```bash
npm run seed
```

This creates a `drmalek` / `ChangeMe123!` account (only if it doesn't already
exist) plus a handful of clearly fictional demo patients ("Ahmed Test",
"Sarah Demo", etc.). **Change that password immediately via `create-admin`
before using the system for real**, or skip seeding entirely and only use
`create-admin`.

---

## 8. Start the application

You need **two terminals** open at the same time (one for the backend, one
for the frontend).

**Terminal 1 — backend:**
```bash
cd server
npm run dev
```
You should see: `Dental Clinic API listening on http://localhost:4000`

**Terminal 2 — frontend:**
```bash
cd client
npm run dev
```
You should see a `Local:` URL, typically `http://localhost:5173`.

## 9. Open the app

Open your browser to:

```
http://localhost:5173
```

You'll see the login screen with **Dr. Malek Abu Sholdom** and a language
switcher (العربية / עברית / English).

## 10. Log in

Enter the username and password you created in step 7. After logging in you
land on the Dashboard, showing today's date, today's appointments, and quick
actions.

## 11. Stop the servers

In each terminal, press `Ctrl + C`.

---

## 12. Daily use — quick tour

- **Calendar**: switch between Day / Week / Month. Click any open time slot
  to add an appointment; click an existing appointment to view details,
  change its status, reschedule, or cancel it.
- **Patients**: browse or search all patients; click a patient to open their
  file.
- **Patient profile**: shows contact info, next appointment, full visit
  timeline (newest first), and buttons to add a visit or a new appointment.
- **Start Visit → Complete Visit**: from an appointment, click "Start Visit",
  record the treatment and notes, and optionally schedule the follow-up
  appointment right away (Tomorrow / 1–3 weeks / 1 month / custom date).
- **Search**: find a patient instantly by name, patient ID, or phone number
  (works in all three languages).
- **Lock**: click "Lock" in the sidebar any time you step away — the doctor's
  password is required to resume. The system also auto-locks after a
  configurable period of inactivity (Settings → Security, default 15
  minutes).
- **Settings**: doctor/clinic names in all 3 languages, default appointment
  duration, working hours (each day configured independently — closed days
  supported), auto-lock timeout, and backups.

---

## 13. Backing up your data

Patient data lives in the cloud PostgreSQL (Neon) database. Neon itself
keeps point-in-time recovery history automatically — see
[CLOUD-DATABASE.md](CLOUD-DATABASE.md) section 7 for details. On top of
that, this app can create its own portable backups:

### Option A — from the app (recommended)

Go to **Settings → Backup → Create Backup Now**. This runs `pg_dump`
against the live database and saves a plain-SQL file to
`server/backups/clinic-backup-<timestamp>.sql`. Click **Download** next to
any backup to save it to your computer's Downloads folder — from there,
copy it to a USB drive or external disk regularly. This requires the
PostgreSQL command-line tools (`pg_dump`) to be available — see
CLOUD-DATABASE.md section 7 if you see an error about it.

### Option B — from the command line

```bash
cd server
npm run backup
```

### Restoring a backup

```bash
cd server
npm run restore -- clinic-backup-2026-01-15T09-00-00-000Z.sql
```

This restores into whatever database `DATABASE_URL`/`DIRECT_URL` in `.env`
currently point to. Full disaster-recovery steps (e.g. restoring into a
brand-new Neon project) are in [CLOUD-DATABASE.md](CLOUD-DATABASE.md)
section 7.

> Keep regular backups on a **separate drive** too, not only relying on the
> cloud provider. This project does not upload backups anywhere automatically
> beyond Neon's own built-in recovery — moving a downloaded backup file
> anywhere else is a deliberate, manual choice by the doctor.

### Exporting appointment/treatment lists (CSV)

- **Today's appointments**: Settings → Export, or the export link on the
  Dashboard.
- **A single patient's full treatment history**: open the patient's profile
  → Export. Only that one patient's data is included in the file.

---

## 14. Updating dependencies safely

Periodically check for updates, but test after upgrading — don't do this
right before a busy clinic day:

```bash
cd server && npm outdated && npm update
cd ../client && npm outdated && npm update
```

For major version upgrades (e.g. Prisma 5 → 6), read the package's release
notes first; major upgrades can change behavior.

---

## 15. Project structure (backend)

```
server/
├── prisma/
│   ├── schema.prisma      Database models (User, Patient, Appointment, Visit, Settings, AuditLog)
│   └── migrations/        Version-controlled database schema history
├── src/
│   ├── config/            Environment loading, session configuration
│   ├── controllers/       Request handlers (one per resource)
│   ├── middleware/        Auth guard, CSRF, rate limiting, validation, error handling
│   ├── routes/            Express routers, mounted under /api
│   ├── services/          Business logic (patients, appointments, visits, settings, backups, audit log)
│   ├── scripts/           create-admin, seed, backup CLI scripts
│   ├── db/                Shared Prisma client
│   ├── app.js              Express app wiring (security headers, CORS, sessions, routes)
│   └── server.js           Entry point — starts the HTTP server
```

## 16. Project structure (frontend)

```
client/
├── src/
│   ├── i18n/               Arabic, Hebrew, English translation files + i18next setup
│   ├── api/                One module per backend resource (axios wrapper with CSRF handling)
│   ├── context/             Auth (session, lock/auto-lock) and UI (toasts, confirm dialogs) providers
│   ├── components/
│   │   ├── layout/          Sidebar/header shell, language switcher, lock screen, protected route
│   │   ├── common/           Reusable UI: status badges, modals, empty states, treatment picker, phone actions
│   │   ├── patients/          Patient picker/typeahead, quick-add patient form
│   │   ├── appointments/      Appointment create/edit form, detail modal, visit workflow modal
│   │   └── calendar/           Day / Week / Month grid views
│   ├── pages/               One file per route (Login, Dashboard, Calendar, Patients, PatientProfile, Search, Settings, ...)
│   ├── utils/                Date/time formatting (locale-aware, no UTC drift), treatment catalog
│   └── styles/theme.css      The entire design system (RTL-aware, print-aware, responsive)
```

---

## 17. Security notes

- Passwords are hashed with **bcrypt** (cost factor 12) — never stored or
  logged in plain text.
- Sessions use **HTTP-only, SameSite=Lax cookies**; in production
  (`NODE_ENV=production`) cookies are also marked `Secure` (HTTPS only).
- **CSRF protection**: a per-session token is required as a custom header on
  every state-changing request; it cannot be forged from a third-party page.
- **Rate limiting** on the login endpoint plus **account lockout** after 5
  failed attempts (15 minutes) protect against brute-force guessing.
- All API routes except `/auth/login` and `/auth/me` require an active,
  authenticated session — there is no unauthenticated access to patient data.
- Security headers are set via **Helmet** (CSP, no-sniff, frame-ancestors
  'none', etc.).
- All input is validated server-side with `express-validator`; Prisma's
  parameterized queries prevent SQL/NoSQL injection.
- An **audit log** records logins, logouts, and all patient/appointment/visit
  create/update/cancel actions — it never stores passwords or session
  secrets.
- No analytics, trackers, ads, or third-party data sharing. No patient data
  is ever sent to an external AI or analytics service.
- **Database connections are TLS-encrypted** (`sslmode=require`) and the
  connection credentials exist only in `server/.env`, read only by the
  backend — the frontend never has database credentials and never talks to
  Postgres directly, only to the backend API. Full details, including what
  is *not* yet done for regulatory compliance (HIPAA/GDPR), are in
  [CLOUD-DATABASE.md](CLOUD-DATABASE.md) section 9 — read that before
  storing real patient data.

### Before real clinical use, also do this

- Change any seeded/demo credentials immediately (`npm run create-admin`).
- Keep `server/.env` (with your real `SESSION_SECRET` and database
  credentials) private — it's already excluded from Git via `.gitignore`.
- Read [CLOUD-DATABASE.md](CLOUD-DATABASE.md) section 9 for what compliance
  work (if any applies to your jurisdiction) has **not** been done here.
- If this is ever deployed beyond the clinic's own computer, set
  `NODE_ENV=production`, put it behind HTTPS, and use a persistent session
  store (see the code comment in `server/src/config/session.js`, and
  CLOUD-DATABASE.md section 10).

---

## 18. What is completed (version 1)

- Cloud PostgreSQL database (Neon) — reachable from any computer with the same login
- Secure authentication (bcrypt, sessions, CSRF, rate limiting, lockout, manual lock, auto-lock)
- Dashboard with today's date/appointments and summary counts
- Day / Week / Month calendar with click-to-add, overlap prevention, and configurable duration
- Full patient CRUD with sequential patient IDs, archive (non-destructive delete), and duplicate detection
- Visit/treatment history timeline with next-appointment scheduling workflow
- Instant patient search (name / ID / phone) across all three languages
- Arabic / Hebrew / English UI with automatic RTL/LTR switching
- Working-hours configuration per day, appointment duration presets + custom
- CSV export (today's appointments, a single patient's history) and one-click database backup/download
- Audit logging of all sensitive actions
- Responsive layout (desktop-first, works on tablet/mobile)
- Print-friendly patient profile

## 19. Recommended next improvements

- Drag-and-drop rescheduling on the calendar (currently: edit/reschedule via form)
- Host the backend itself online too (today only the database is cloud-hosted — see CLOUD-DATABASE.md section 10) so a computer doesn't need to stay on as the "server"
- A persistent session store (`connect-pg-simple`) + Electron/PWA wrapper for a double-click desktop launch (the architecture already supports this without rework)
- SMS/WhatsApp *automated* reminders (current WhatsApp button is manual/explicit only, by design)
- Multi-doctor and receptionist accounts (the `role` field and RBAC middleware already exist — only more granular per-route rules are needed)
- Dental images / X-ray attachments, treatment plans, invoicing
- Patient-facing portal
- A documented compliance review (HIPAA/GDPR or local equivalent) before storing real patient data — see CLOUD-DATABASE.md section 9
