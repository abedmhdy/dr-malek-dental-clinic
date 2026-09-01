// Run once (or whenever the schema changes) before `npm test`:
//   TEST_DATABASE_URL="postgresql://postgres:YOUR_LOCAL_PASSWORD@localhost:5432/dental_clinic_test" node src/tests/setupTestDb.js
// Creates the local test database if it doesn't exist yet, then applies the
// real migration history (`prisma migrate deploy`) — NOT `db push`, which
// only syncs what's expressible in schema.prisma and silently skips raw SQL
// a migration file contains directly (e.g. this project's patient-number
// sequence), leaving the test database subtly out of sync with production.
const { execFileSync } = require('child_process');
const { Client } = require('pg');

// Invokes Prisma's CLI entry point directly with the current Node binary,
// rather than shelling out to `npx` (which needs shell:true on Windows —
// a real footgun if these args were ever user-controlled; they aren't
// here, but there's no reason to carry the risk when this is just as easy).
const PRISMA_CLI = require.resolve('prisma/build/index.js');

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  console.error('Set TEST_DATABASE_URL to a local (localhost/127.0.0.1) Postgres connection string first.');
  process.exit(1);
}

const parsed = new URL(testUrl);
if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
  console.error('Refusing: TEST_DATABASE_URL must point at localhost — never a real/remote database.');
  process.exit(1);
}
const dbName = parsed.pathname.replace(/^\//, '');

async function ensureDatabaseExists() {
  const adminUrl = new URL(testUrl);
  adminUrl.pathname = '/postgres'; // connect to the default maintenance DB to run CREATE DATABASE
  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (exists.rowCount === 0) {
      // Database names can't be parameterized — safe here because dbName
      // comes from a connection string only this developer controls, never
      // from user input.
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Created database "${dbName}".`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } finally {
    await client.end();
  }
}

// connect-pg-simple's own createTableIfMissing races itself when several
// test files (each a separate process, per node --test's default
// concurrency) hit it at the same instant — "IF NOT EXISTS" isn't atomic
// across concurrent connections at the Postgres catalog level. Creating it
// once, upfront, serially, avoids that race entirely — every test file's
// createTableIfMissing then finds it already there and does nothing.
async function ensureSessionTable() {
  const client = new Client({ connectionString: testUrl });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      ) WITH (OIDS=FALSE);
    `);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey' AND conrelid = '"session"'::regclass
        ) THEN
          ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
        END IF;
      END $$;
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");`);
  } finally {
    await client.end();
  }
}

async function main() {
  await ensureDatabaseExists();
  console.log('Applying migrations...');
  execFileSync(process.execPath, [PRISMA_CLI, 'migrate', 'deploy'], {
    cwd: __dirname + '/../..',
    env: { ...process.env, DATABASE_URL: testUrl, DIRECT_URL: testUrl },
    stdio: 'inherit',
  });
  await ensureSessionTable();
  console.log('Test database ready.');
}

main().catch((err) => {
  console.error('Test DB setup failed:', err.message);
  process.exit(1);
});
