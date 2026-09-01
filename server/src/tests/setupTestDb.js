// Run once (or whenever the schema changes) before `npm test`:
//   TEST_DATABASE_URL="postgresql://postgres:YOUR_LOCAL_PASSWORD@localhost:5432/dental_clinic_test" node src/tests/setupTestDb.js
// Creates the local test database if it doesn't exist yet, then pushes the
// current Prisma schema into it (schema-only sync — no migration history
// needed for a throwaway database that gets recreated freely).
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

async function main() {
  await ensureDatabaseExists();
  console.log('Pushing schema...');
  execFileSync(process.execPath, [PRISMA_CLI, 'db', 'push', '--skip-generate'], {
    cwd: __dirname + '/../..',
    env: { ...process.env, DATABASE_URL: testUrl, DIRECT_URL: testUrl },
    stdio: 'inherit',
  });
  console.log('Test database ready.');
}

main().catch((err) => {
  console.error('Test DB setup failed:', err.message);
  process.exit(1);
});
