const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');

// Electron derives app.getPath('userData') from app.name, which otherwise
// defaults to package.json's "name" (the npm-safe slug, e.g.
// "dr-malek-dental-clinic-desktop") rather than the friendly productName —
// so without this, config.env would live under that slug instead of a
// folder someone browsing %AppData% would recognize. Must be set before any
// app.getPath() call.
app.setName('Dr. Malek Dental Clinic');

const PORT = 4000;
const OFFLINE_PAGE = path.join(__dirname, 'offline.html');

let backendProcess = null;
let mainWindow = null;
let backgroundPollTimer = null;

function resourcePath(...segments) {
  const base = app.isPackaged ? process.resourcesPath : path.join(__dirname, 'resources');
  return path.join(base, ...segments);
}

// Two ways this file can be seeded (see desktop/scripts/prepare-resources.js):
//   - Local mode (default today): DATABASE_URL/DIRECT_URL/SESSION_SECRET —
//     this machine spawns and runs the full backend itself.
//   - Remote mode (opt-in, built with DESKTOP_BACKEND_URL set): just
//     BACKEND_URL, pointing at an already-hosted HTTPS backend. No database
//     credential of any kind is ever bundled in this case — see
//     DEPLOYMENT.md. Kept in userData (NOT inside the installed app folder)
//     so it survives reinstalls/updates and can be edited by hand if the
//     connection details ever need to change — see CLOUD-DATABASE.md and
//     desktop/SECURITY-NOTES.md.
function ensureConfigFile() {
  const configPath = path.join(app.getPath('userData'), 'config.env');
  if (!fs.existsSync(configPath)) {
    const seedPath = resourcePath('server', 'config.seed.env');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.copyFileSync(seedPath, configPath);
  }
  return configPath;
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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

// A single health check against whichever backend this build is configured
// for (local loopback or a remote hosted URL). Resolves true only when the
// backend is up AND the health endpoint confirms the database is reachable
// (see server/src/app.js — /api/health checks the DB, not just Express).
function checkHealthOnce(healthUrl) {
  return new Promise((resolve) => {
    const client = healthUrl.startsWith('https:') ? https : http;
    const req = client.get(healthUrl, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve(res.statusCode === 200));
    });
    req.on('error', () => resolve(false));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Retries with a short, gently increasing backoff (0.5s, 0.5s, 1s, 1s, 2s,
// 2s, 3s, 3s, 3s, 3s — about 20s total) rather than a long fixed interval,
// so a database that's simply mid-autosuspend-wakeup (typically ~1s) resolves
// almost immediately, while a genuinely unreachable database doesn't block
// startup for longer than necessary before falling back to the offline page.
async function waitForHealthWithBackoff(healthUrl) {
  const delays = [500, 500, 1000, 1000, 2000, 2000, 3000, 3000, 3000, 3000];
  for (const delay of delays) {
    if (await checkHealthOnce(healthUrl)) return true;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return checkHealthOnce(healthUrl);
}

// While the offline page is showing, keep checking in the background at a
// relaxed pace (not blocking anything else) and swap back to the real app
// automatically the moment the database becomes reachable again — no restart
// or manual action required.
function startBackgroundRecoveryPoll(healthUrl, appUrl) {
  if (backgroundPollTimer) return;
  backgroundPollTimer = setInterval(async () => {
    const healthy = await checkHealthOnce(healthUrl);
    if (healthy && mainWindow && !mainWindow.isDestroyed()) {
      clearInterval(backgroundPollTimer);
      backgroundPollTimer = null;
      mainWindow.loadURL(appUrl);
    }
  }, 5000);
}

function stopBackgroundRecoveryPoll() {
  if (backgroundPollTimer) {
    clearInterval(backgroundPollTimer);
    backgroundPollTimer = null;
  }
}

function startBackend(config) {
  const backendEntry = resourcePath('server', 'src', 'server.js');
  const staticDir = resourcePath('client-dist');

  backendProcess = spawn(
    process.execPath,
    [backendEntry],
    {
      cwd: resourcePath('server'),
      env: {
        ...process.env,
        // Runs the backend under Electron's own bundled Node runtime instead
        // of a separately spawned node.exe — the doctor's computer never
        // needs Node.js installed at all.
        ELECTRON_RUN_AS_NODE: '1',
        DATABASE_URL: config.DATABASE_URL,
        DIRECT_URL: config.DIRECT_URL || config.DATABASE_URL,
        SESSION_SECRET: config.SESSION_SECRET,
        PORT: String(PORT),
        NODE_ENV: 'production',
        CLIENT_ORIGIN: `http://localhost:${PORT}`,
        STATIC_DIR: staticDir,
        SESSION_MAX_AGE_MINUTES: config.SESSION_MAX_AGE_MINUTES || '480',
        // Tells the backend it is only ever reachable over plain
        // http://localhost (see server/src/config/env.js) so session
        // cookies stay non-Secure — required for login to work here, since
        // this is genuinely loopback-only, unlike a hosted deployment.
        LOOPBACK_ONLY: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  backendProcess.stdout.on('data', (d) => console.log('[backend]', d.toString().trim()));
  backendProcess.stderr.on('data', (d) => console.error('[backend]', d.toString().trim()));
  backendProcess.on('exit', (code) => {
    console.log('[backend] exited with code', code);
    backendProcess = null;
  });
}

function stopBackend() {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
    backendProcess = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1000,
    minHeight: 650,
    title: 'Dr. Malek Dental Clinic',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.on('closed', () => {
    mainWindow = null;
    stopBackgroundRecoveryPoll();
  });
}

app.whenReady().then(async () => {
  const configPath = ensureConfigFile();
  const config = parseEnvFile(configPath);

  // Remote mode: config.env holds only an already-hosted HTTPS backend URL
  // — no database credential of any kind is ever bundled into this build.
  // See DEPLOYMENT.md and desktop/scripts/prepare-resources.js.
  const isRemote = Boolean(config.BACKEND_URL);
  let baseUrl;
  if (isRemote) {
    try {
      baseUrl = new URL(config.BACKEND_URL).origin;
    } catch {
      dialog.showErrorBox(
        'Dr. Malek Dental Clinic — Configuration Error',
        `BACKEND_URL in the app's config file is not a valid URL:\n\n${config.BACKEND_URL}`
      );
      app.quit();
      return;
    }
  } else {
    baseUrl = `http://localhost:${PORT}`;
    try {
      startBackend(config);
    } catch (err) {
      // A genuine packaging/startup failure (e.g. the backend process itself
      // could not be spawned) — not a connectivity problem, so there is
      // nothing to retry into. This is the one case that still stops here.
      dialog.showErrorBox(
        'Dr. Malek Dental Clinic — Startup Error',
        `The local server could not start:\n\n${err.message}`
      );
      app.quit();
      return;
    }
  }

  const appUrl = `${baseUrl}/login`;
  const healthUrl = `${baseUrl}/api/health`;

  const healthy = await waitForHealthWithBackoff(healthUrl);
  createWindow();
  if (healthy) {
    mainWindow.loadURL(appUrl);
  } else {
    // Database (or, in remote mode, the hosted backend itself) still
    // unreachable after ~20s of retrying — show the friendly tri-language
    // offline page instead of blocking startup any further, and keep
    // checking in the background so it recovers on its own.
    mainWindow.loadFile(OFFLINE_PAGE);
    startBackgroundRecoveryPoll(healthUrl, appUrl);
  }
});

app.on('window-all-closed', () => {
  stopBackgroundRecoveryPoll();
  stopBackend();
  app.quit();
});

app.on('before-quit', stopBackend);
app.on('will-quit', stopBackend);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
