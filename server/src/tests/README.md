# Automated tests

Covers authentication (login, wrong password, lockout, unauthorized access,
logout), patients (create/read/update, archive, duplicate detection),
appointments (create, edit, cancel, overlap prevention), visits/payments
(treatment history, payment recording, balance calculation, void), security
(CSRF rejection, protected routes, no secrets in API responses), and the
DB-aware health check (available/unavailable).

## Safety: these tests can never touch the real clinic database

Every test file starts with `require('./testSafety')`, which throws
immediately unless `DATABASE_URL` points at `localhost`/`127.0.0.1`. There
is no path by which this suite can run against Neon — even a mistaken
`.env` doesn't matter, since the guard checks the actual resolved hostname
at run time, not which file it came from.

Test data uses fictional patients/doctors (never anything resembling a real
person), and every record is tagged internally so cleanup can find and
delete exactly what a run created — see `helpers.js`.

## One-time setup (local Postgres)

Needs a local Postgres server — see the project root's `README.md` /
`CLOUD-DATABASE.md` for how one was installed for the backup/restore
tooling. Then, once:

```bash
cd server
TEST_DATABASE_URL="postgresql://postgres:YOUR_LOCAL_PASSWORD@localhost:5432/dental_clinic_test" node src/tests/setupTestDb.js
```

This creates a `dental_clinic_test` database on your local Postgres and
pushes the current schema into it. Re-run it any time the schema changes.

## Running the tests

```bash
cd server
DATABASE_URL="postgresql://postgres:YOUR_LOCAL_PASSWORD@localhost:5432/dental_clinic_test" \
DIRECT_URL="postgresql://postgres:YOUR_LOCAL_PASSWORD@localhost:5432/dental_clinic_test" \
NODE_ENV=test \
SESSION_SECRET=test_secret_not_used_in_production \
npm test
```

(Or put those in a `server/.env.test` file and load it before running —
whatever's convenient locally. They are never read from `server/.env`,
which stays pointed at the real Neon database.)
