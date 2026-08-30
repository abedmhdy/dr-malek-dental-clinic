// Copies everything the packaged app needs to run at electron-builder's
// "extraResources" source (desktop/resources/) — the backend source +
// production node_modules, the built frontend, and a seed copy of the
// current Neon connection details (so the packaged app starts already
// pointed at the SAME database, satisfying "keep the existing Neon
// connection" without the doctor having to configure anything on day one).
//
// Deliberately excluded: server/prisma (schema/migrations aren't needed at
// runtime — only the already-generated client in node_modules is), any
// legacy local SQLite file, backups/, and the doctor's real .env is never
// copied verbatim — only the four keys the app actually needs are extracted
// into config.seed.env, so nothing else from the dev machine leaks in.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const SERVER_SRC = path.join(ROOT, 'server');
const CLIENT_DIST_SRC = path.join(ROOT, 'client/dist');
const OUT = path.join(__dirname, '../resources');

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest, { exclude = [] } = {}) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (exclude.includes(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, { exclude });
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

// Remote mode: set DESKTOP_BACKEND_URL to build a desktop app that talks to
// an already-hosted HTTPS backend instead of running one locally. In this
// mode NO database credential is ever bundled — the installer only ever
// contains an API URL, which is not a secret. See DEPLOYMENT.md.
//   DESKTOP_BACKEND_URL=https://your-backend.example.com npm run prepare-resources
function buildRemoteMode(backendUrl) {
  console.log('Preparing desktop/resources (REMOTE mode) ...');
  rmrf(OUT);

  try {
    // eslint-disable-next-line no-new
    new URL(backendUrl);
  } catch {
    throw new Error(`DESKTOP_BACKEND_URL is not a valid URL: ${backendUrl}`);
  }

  fs.mkdirSync(path.join(OUT, 'server'), { recursive: true });
  const seedContent = [
    '# Remote-mode seed: this build talks to an already-hosted backend, so no',
    '# database credential is bundled here at all — only its public URL.',
    '# Copied into %AppData%/Dr. Malek Dental Clinic/config.env on first',
    '# launch, and read from THAT copy on every launch after. See',
    '# DEPLOYMENT.md.',
    `BACKEND_URL=${backendUrl}`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT, 'server', 'config.seed.env'), seedContent, 'utf8');

  console.log('Done (remote mode). Resources ready in desktop/resources/ — no DB credentials bundled.');
}

// Local mode (default, unchanged): the desktop app runs the full backend
// itself, seeded with this build machine's current Neon connection details.
function buildLocalMode() {
  console.log('Preparing desktop/resources (LOCAL mode) ...');
  rmrf(OUT);

  console.log('  copying server/src ...');
  copyDir(path.join(SERVER_SRC, 'src'), path.join(OUT, 'server', 'src'));

  console.log('  copying server/node_modules (this is the slow step) ...');
  copyDir(path.join(SERVER_SRC, 'node_modules'), path.join(OUT, 'server', 'node_modules'));

  fs.copyFileSync(path.join(SERVER_SRC, 'package.json'), path.join(OUT, 'server', 'package.json'));

  console.log('  copying built frontend (client/dist) ...');
  if (!fs.existsSync(CLIENT_DIST_SRC)) {
    throw new Error('client/dist not found — run "npm run build" in client/ first.');
  }
  copyDir(CLIENT_DIST_SRC, path.join(OUT, 'client-dist'));

  console.log('  seeding server/config.seed.env from the current server/.env ...');
  const envPath = path.join(SERVER_SRC, '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('server/.env not found — cannot seed the Neon connection details.');
  }
  const parsed = parseEnvFile(envPath);
  for (const key of ['DATABASE_URL', 'DIRECT_URL', 'SESSION_SECRET']) {
    if (!parsed[key]) throw new Error(`server/.env is missing ${key} — cannot seed config.`);
  }
  const seedContent = [
    '# Seed copy seeded from server/.env at build time.',
    '# Copied into %AppData%/Dr. Malek Dental Clinic/config.env on first launch,',
    '# and read from THAT copy on every launch after — editing this bundled file',
    '# after install has no effect. See INSTALL-ON-DOCTOR-PC.md.',
    `DATABASE_URL=${parsed.DATABASE_URL}`,
    `DIRECT_URL=${parsed.DIRECT_URL || parsed.DATABASE_URL}`,
    `SESSION_SECRET=${parsed.SESSION_SECRET}`,
    `SESSION_MAX_AGE_MINUTES=${parsed.SESSION_MAX_AGE_MINUTES || '480'}`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT, 'server', 'config.seed.env'), seedContent, 'utf8');

  console.log('Done. Resources ready in desktop/resources/');
}

function main() {
  if (process.env.DESKTOP_BACKEND_URL) {
    buildRemoteMode(process.env.DESKTOP_BACKEND_URL);
  } else {
    buildLocalMode();
  }
}

main();
