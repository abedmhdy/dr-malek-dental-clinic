const path = require('path');
require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  sessionSecret: required('SESSION_SECRET', process.env.NODE_ENV === 'test' ? 'test_secret' : undefined),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  sessionMaxAgeMinutes: parseInt(process.env.SESSION_MAX_AGE_MINUTES || '480', 10),
  // Cloud PostgreSQL connection strings. Never logged, never sent to the
  // frontend. See server/.env.example for how to obtain these from Neon.
  databaseUrl: required('DATABASE_URL', process.env.NODE_ENV === 'test' ? 'postgresql://test' : undefined),
  directUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
  // Set by the packaged Electron desktop app when it serves the built
  // frontend itself (see desktop/main.js). Also used by a hosted backend
  // deployment that chooses to serve the frontend from the same origin
  // (see DEPLOYMENT.md) — NOT specific to loopback-only, so this must stay
  // decoupled from `isLoopbackOnly` below.
  // path.resolve() converts a relative value (e.g. a hosted deployment's
  // STATIC_DIR=public, resolved against the working directory the start
  // command runs from) to absolute, and leaves an already-absolute value
  // (the desktop app always passes one) unchanged — res.sendFile() throws
  // if given a relative path with no `root` option, so this must never be
  // relative by the time app.js uses it.
  staticDir: process.env.STATIC_DIR ? path.resolve(process.env.STATIC_DIR) : null,
  // Set ONLY by the packaged Electron desktop app (never by a hosted
  // deployment) — true means the server is reachable exclusively over plain
  // http://localhost (loopback, never a real network), so cookies must NOT
  // be marked Secure even when NODE_ENV=production, or the browser would
  // silently refuse to store the session cookie and login would appear to
  // "not work". A hosted backend is reachable over a real network and must
  // NOT set this, even if it also happens to serve static files.
  isLoopbackOnly: process.env.LOOPBACK_ONLY === '1',
};

module.exports = env;
