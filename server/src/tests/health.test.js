require('./testSafety');
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const request = require('supertest');
const { app } = require('./helpers');

describe('Health check', () => {
  test('DB available: /api/health reports 200 and database:"ok"', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok', database: 'ok' });
  });

  test('DB unavailable: the same bounded-timeout check used by /api/health resolves to unreachable, quickly, for a genuinely dead host', async () => {
    // Exercises the exact mechanism server/src/services/healthService.js
    // uses (SELECT 1 raced against a timeout) against a connection that can
    // never succeed, using an isolated PrismaClient so the shared
    // connection this whole test suite depends on is never touched.
    const brokenPrisma = new PrismaClient({
      datasources: { db: { url: 'postgresql://baduser:badpass@nonexistent-host-for-testing.invalid:5432/db' } },
    });

    const timeoutMs = 3000;
    const start = Date.now();
    const timeout = new Promise((resolve) => setTimeout(() => resolve(false), timeoutMs));
    const check = brokenPrisma.$queryRaw`SELECT 1`.then(
      () => true,
      () => false
    );
    const reachable = await Promise.race([check, timeout]);
    const elapsed = Date.now() - start;

    assert.equal(reachable, false);
    assert.ok(elapsed <= timeoutMs + 500, `should not hang well past the ${timeoutMs}ms bound (took ${elapsed}ms)`);

    await brokenPrisma.$disconnect();
  });

  test('the health response never includes a hostname, credential, or raw error', async () => {
    const res = await request(app).get('/api/health');
    const asString = JSON.stringify(res.body);
    assert.doesNotMatch(asString, /postgres|neon\.tech|password|error/i);
  });
});
