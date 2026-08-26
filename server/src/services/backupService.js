const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const env = require('../config/env');

const BACKUPS_DIR = path.resolve(__dirname, '../../backups');

function ensureBackupsDir() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

// Prisma accepts a few query-string extensions (schema, pgbouncer,
// connection_limit, pool_timeout) that plain libpq tools like pg_dump/psql
// do not understand and will reject with "invalid URI query parameter".
// Strip them so a connection string copied straight out of .env always
// works with the Postgres client tools too.
const PRISMA_ONLY_PARAMS = ['schema', 'pgbouncer', 'connection_limit', 'pool_timeout'];
function sanitizeForLibpq(connectionString) {
  const url = new URL(connectionString);
  for (const param of PRISMA_ONLY_PARAMS) url.searchParams.delete(param);
  return url.toString();
}

// Locates pg_dump/psql. They ship with PostgreSQL but the Windows EDB
// installer does not always add them to PATH, so we also check the default
// install location before giving up with an actionable error.
function findPgBinary(name) {
  if (process.env.PG_BIN_DIR) {
    const candidate = path.join(process.env.PG_BIN_DIR, `${name}.exe`);
    if (fs.existsSync(candidate)) return candidate;
  }

  const winDefaultRoot = 'C:\\Program Files\\PostgreSQL';
  if (fs.existsSync(winDefaultRoot)) {
    const versions = fs
      .readdirSync(winDefaultRoot)
      .filter((v) => /^\d+/.test(v))
      .sort((a, b) => parseFloat(b) - parseFloat(a));
    for (const v of versions) {
      const candidate = path.join(winDefaultRoot, v, 'bin', `${name}.exe`);
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  return name; // fall back to PATH lookup; execFile will error clearly if missing
}

function runPgTool(binaryName, args) {
  return new Promise((resolve, reject) => {
    const bin = findPgBinary(binaryName);
    execFile(bin, args, { maxBuffer: 1024 * 1024 * 200 }, (err, stdout, stderr) => {
      if (err) {
        const hint =
          err.code === 'ENOENT'
            ? ` (${binaryName} not found — install the PostgreSQL client tools, or set PG_BIN_DIR to their "bin" folder)`
            : '';
        reject(new Error(`${binaryName} failed${hint}: ${stderr || err.message}`));
        return;
      }
      resolve(stdout);
    });
  });
}

// Dumps the live cloud database to a plain-SQL file using the direct
// (unpooled) connection — pg_dump needs a stable session, which PgBouncer's
// transaction-pooling mode does not reliably provide.
// --no-owner/--no-privileges make the dump portable to a different Neon
// project or a different Postgres host (e.g. during disaster recovery).
async function createBackup() {
  ensureBackupsDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destPath = path.join(BACKUPS_DIR, `clinic-backup-${stamp}.sql`);

  // pg_dump's argument parser expects the connection string LAST — flags
  // placed after a positional argument are otherwise treated as more
  // positional arguments and rejected ("too many command-line arguments").
  await runPgTool('pg_dump', [
    '--format=plain',
    '--no-owner',
    '--no-privileges',
    '--file',
    destPath,
    sanitizeForLibpq(env.directUrl),
  ]);

  return destPath;
}

function listBackups() {
  ensureBackupsDir();
  return fs
    .readdirSync(BACKUPS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => {
      const full = path.join(BACKUPS_DIR, f);
      const stat = fs.statSync(full);
      return { name: f, sizeBytes: stat.size, createdAt: stat.birthtime };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

// Restores a backup file into the CURRENT DATABASE_URL target. Intended for
// the documented "create a fresh empty Neon project, then restore" recovery
// flow, not for restoring on top of live data.
async function restoreBackup(fileName) {
  const fullPath = path.join(BACKUPS_DIR, fileName);
  if (!fs.existsSync(fullPath)) {
    throw new Error('Backup file not found: ' + fileName);
  }
  await runPgTool('psql', ['--file', fullPath, '--set', 'ON_ERROR_STOP=1', sanitizeForLibpq(env.directUrl)]);
}

module.exports = { createBackup, listBackups, restoreBackup, BACKUPS_DIR, findPgBinary };
