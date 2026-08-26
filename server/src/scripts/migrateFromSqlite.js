// One-time data migration: copies every row out of the old local SQLite
// database and into the PostgreSQL database currently configured in
// DATABASE_URL/DIRECT_URL, preserving primary keys and relationships.
//
// Usage:
//   npm run migrate-from-sqlite                 (uses the default sqlite path)
//   npm run migrate-from-sqlite -- --source=path\to\clinic.db
//   npm run migrate-from-sqlite -- --dry-run     (report counts only, write nothing)
//   npm run migrate-from-sqlite -- --force       (proceed even if the target already has rows)
//
// Safety:
//   - The source .db file is never modified or deleted.
//   - A timestamped copy of the source file is made into server/backups/
//     before anything else happens.
//   - If the target Postgres database already contains rows in any of these
//     tables, the script refuses to run unless --force is passed (running it
//     twice by accident would otherwise fail loudly on a primary-key
//     conflict anyway, since IDs are preserved as-is — but refusing up front
//     gives a clearer message).
//   - All inserts happen inside one Prisma transaction: if anything fails,
//     nothing is written to Postgres.
//   - Row counts are compared source-vs-target after the transaction commits;
//     any mismatch is reported as an error.

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const prisma = require('../db/prismaClient');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const sourceArg = args.find((a) => a.startsWith('--source='));
const SOURCE_PATH = sourceArg
  ? sourceArg.split('=').slice(1).join('=')
  : path.resolve(__dirname, '../../prisma/data/clinic.db');

const TABLES = ['User', 'Patient', 'Appointment', 'Visit', 'Settings', 'AuditLog'];

function backupSourceFile() {
  const backupsDir = path.resolve(__dirname, '../../backups');
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(backupsDir, `pre-migration-sqlite-${stamp}.db`);
  fs.copyFileSync(SOURCE_PATH, dest);
  return dest;
}

function toBool(v) {
  return v === null || v === undefined ? v : Boolean(v);
}
function toDate(v) {
  return v === null || v === undefined ? v : new Date(v);
}

function readSource(db) {
  const users = db.prepare('SELECT * FROM "User"').all().map((r) => ({
    ...r,
    isActive: toBool(r.isActive),
    lockedUntil: toDate(r.lockedUntil),
    createdAt: toDate(r.createdAt),
    updatedAt: toDate(r.updatedAt),
  }));
  const patients = db.prepare('SELECT * FROM "Patient"').all().map((r) => ({
    ...r,
    isActive: toBool(r.isActive),
    createdAt: toDate(r.createdAt),
    updatedAt: toDate(r.updatedAt),
  }));
  const appointments = db.prepare('SELECT * FROM "Appointment"').all().map((r) => ({
    ...r,
    createdAt: toDate(r.createdAt),
    updatedAt: toDate(r.updatedAt),
  }));
  const visits = db.prepare('SELECT * FROM "Visit"').all().map((r) => ({
    ...r,
    createdAt: toDate(r.createdAt),
    updatedAt: toDate(r.updatedAt),
  }));
  const settings = db.prepare('SELECT * FROM "Settings"').all().map((r) => ({
    ...r,
    updatedAt: toDate(r.updatedAt),
  }));
  const auditLogs = db.prepare('SELECT * FROM "AuditLog"').all().map((r) => ({
    ...r,
    createdAt: toDate(r.createdAt),
  }));

  return { users, patients, appointments, visits, settings, auditLogs };
}

// After inserting rows with explicit primary keys, Postgres's own
// auto-increment sequence is still at 1 — the very next INSERT without an
// explicit id (e.g. creating a new patient in the app) would collide with an
// existing row. This advances each sequence to MAX(id) after the import.
//
// patient_number_seq (used by generatePatientNumber() for "P-000123" style
// IDs) is a separate, hand-rolled sequence — not tied to any column — so it
// needs the same fix-up based on the highest numeric suffix already used,
// or the first patient created after migration would collide with "P-000001".
async function fixSequences(tx) {
  for (const table of ['User', 'Patient', 'Appointment', 'Visit', 'AuditLog']) {
    await tx.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1), true);`
    );
  }
  await tx.$executeRawUnsafe(
    `SELECT setval('patient_number_seq', COALESCE((SELECT MAX(CAST(SUBSTRING("patientNumber" FROM 3) AS INTEGER)) FROM "Patient"), 0), true);`
  );
}

async function main() {
  console.log(`Source SQLite file: ${SOURCE_PATH}`);
  if (!fs.existsSync(SOURCE_PATH)) {
    console.error('Source SQLite file not found. Pass --source=<path> if it is not at the default location.');
    process.exit(1);
  }

  const backupPath = backupSourceFile();
  console.log(`Backed up source file to: ${backupPath}`);

  const sqlite = new Database(SOURCE_PATH, { readonly: true });
  const data = readSource(sqlite);
  sqlite.close();

  const sourceCounts = {
    User: data.users.length,
    Patient: data.patients.length,
    Appointment: data.appointments.length,
    Visit: data.visits.length,
    Settings: data.settings.length,
    AuditLog: data.auditLogs.length,
  };
  console.log('Source row counts:', sourceCounts);

  const targetCounts = Object.fromEntries(
    await Promise.all(
      TABLES.map(async (t) => [t, await prisma[t.charAt(0).toLowerCase() + t.slice(1)].count()])
    )
  );
  console.log('Target (Postgres) row counts before migration:', targetCounts);

  const targetHasData = Object.values(targetCounts).some((c) => c > 0);
  if (targetHasData && !FORCE) {
    console.error(
      'The target PostgreSQL database already contains data. Refusing to proceed to avoid duplicating records.\n' +
        'Re-run with --force only if you are certain (e.g. you already verified this is expected).'
    );
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log('--dry-run set: no data was written. Counts above are what would be migrated.');
    await prisma.$disconnect();
    return;
  }

  console.log('Starting migration inside a single transaction...');
  await prisma.$transaction(
    async (tx) => {
      if (data.users.length) await tx.user.createMany({ data: data.users });
      if (data.patients.length) await tx.patient.createMany({ data: data.patients });
      if (data.appointments.length) await tx.appointment.createMany({ data: data.appointments });
      if (data.visits.length) await tx.visit.createMany({ data: data.visits });
      if (data.settings.length) await tx.settings.createMany({ data: data.settings });
      if (data.auditLogs.length) await tx.auditLog.createMany({ data: data.auditLogs });
      await fixSequences(tx);
    },
    { timeout: 5 * 60 * 1000 }
  );

  const finalCounts = Object.fromEntries(
    await Promise.all(
      TABLES.map(async (t) => [t, await prisma[t.charAt(0).toLowerCase() + t.slice(1)].count()])
    )
  );
  console.log('Target (Postgres) row counts after migration:', finalCounts);

  const mismatches = TABLES.filter((t) => finalCounts[t] !== sourceCounts[t]);
  if (mismatches.length > 0) {
    console.error('MISMATCH detected for tables:', mismatches);
    console.error('Do not use this database yet — investigate before pointing the app at it.');
    process.exit(1);
  }

  console.log('Migration verified: every table matches the source row count exactly.');
  console.log('The original SQLite file was left untouched at:', SOURCE_PATH);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Migration failed — no partial data was committed (transaction rolled back):', err.message);
  await prisma.$disconnect();
  process.exit(1);
});
