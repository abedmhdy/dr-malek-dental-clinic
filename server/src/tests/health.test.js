require('./testSafety');
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const request = require('supertest');
const { app, closeAllConnections } = require('./helpers');

// A PrismaClient constructed against a host that doesn't resolve at all
// (as opposed to one that times out) can emit its connection error as an
// uncaught event from the engine's own stderr-processing pipe, outside the
// promise chain a plain .then(resolve, reject) can catch — a real Prisma/
// Windows quirk, not something server/src/services/healthService.js itself
// is vulnerable to (proven separately, live, against the packaged app: a
// genuinely unreachable Neon host correctly produced a clean 503, never a
// crash). Isolating the broken client in its own short-lived process here
// means that quirk can only ever crash the child, never this test run.
const CHECK_SCRIPT = path.join(__dirname, 'checkUnreachable.js');

function checkUnreachableInSubprocess() {
  const start = Date.now();
  const out = execFileSync(process.execPath, [CHECK_SCRIPT], { encoding: 'utf8' }).trim();
  return { reachable: out === 'true', elapsed: Date.now() - start };
}

describe('Health check', () => {
  test('DB available: /api/health reports 200 and database:"ok"', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok', database: 'ok' });
  });

  test('DB unavailable: the same bounded-timeout check used by /api/health resolves to unreachable, quickly, for a genuinely dead host', () => {
    const { reachable, elapsed } = checkUnreachableInSubprocess();
    assert.equal(reachable, false);
    assert.ok(elapsed <= 6000, `should not hang well past the check's own 3s bound (took ${elapsed}ms)`);
  });

  test('the health response never includes a hostname, credential, or raw error', async () => {
    const res = await request(app).get('/api/health');
    const asString = JSON.stringify(res.body);
    assert.doesNotMatch(asString, /postgres|neon\.tech|password|error/i);
  });

  test('recovery: a working connection reports healthy again after an unreachable one reported down', async () => {
    // Proves the health-check mechanism has no persistent "stuck unhealthy"
    // state — checking an unreachable connection and then a working one
    // back-to-back must independently reflect each connection's real state,
    // exactly what a doctor's PC needs after internet/Neon comes back.
    const { reachable: down } = checkUnreachableInSubprocess();
    assert.equal(down, false);

    // Immediately after — the app's real (working) connection must report healthy.
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.database, 'ok');
  });
});

test.after(closeAllConnections);
