const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const env = require('./env');

// Persistent, production-safe session store: sessions live in a "session"
// table in the same Neon database (auto-created on first run if missing —
// additive only, never touches any existing table/data), so a backend
// restart (deploy, crash, PC reboot) no longer silently logs everyone out
// the way the in-memory store did, and it's safe for more than one backend
// process. Uses the same pooled DATABASE_URL the rest of the app already
// uses — plain parameterized queries work fine through PgBouncer's
// transaction-pooling mode, so no separate direct connection is needed here.
const store = new pgSession({
  conString: env.databaseUrl,
  tableName: 'session',
  createTableIfMissing: true,
  // Periodic expired-session cleanup — not user-facing. Disabled under test:
  // it's a long-lived setInterval that would otherwise keep every test-file
  // process alive indefinitely (a short test run has no need to prune
  // anything, and `node --test` waits for the process to exit naturally).
  pruneSessionInterval: env.nodeEnv === 'test' ? false : 60 * 60,
});

store.on('error', (err) => {
  // Never let a session-store hiccup crash the process — a request that
  // needs the store will still fail on its own with a normal error.
  console.error('Session store error:', err.message);
});

const sessionMiddleware = session({
  name: 'clinic.sid',
  store,
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    // Real hosted deployments (NODE_ENV=production — see DEPLOYMENT.md) sit
    // behind HTTPS and need Secure cookies, whether or not they also serve
    // the built frontend themselves. The packaged desktop app is also
    // NODE_ENV=production for its other hardening, but talks to itself over
    // plain http://localhost, so it explicitly sets LOOPBACK_ONLY=1 to be
    // excluded here — see server/src/config/env.js.
    secure: env.isProduction && !env.isLoopbackOnly,
    maxAge: env.sessionMaxAgeMinutes * 60 * 1000,
  },
});

module.exports = sessionMiddleware;
module.exports.store = store;
