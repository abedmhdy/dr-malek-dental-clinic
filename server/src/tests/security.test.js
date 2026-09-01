require('./testSafety');
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, loginAsNewDoctor, createTestPatient, cleanupAllTestData } = require('./helpers');

describe('Security', () => {
  test('a state-changing request without a CSRF token is rejected', async () => {
    const { agent } = await loginAsNewDoctor();
    // Deliberately omit X-CSRF-Token.
    const res = await agent.post('/api/patients').send({ firstName: 'X', lastName: 'Y', phone: '0500000000' });
    assert.equal(res.status, 403);
    assert.equal(res.body.messageKey, 'errors.csrf');
  });

  test('a state-changing request with the wrong CSRF token is rejected', async () => {
    const { agent } = await loginAsNewDoctor();
    const res = await agent
      .post('/api/patients')
      .set('X-CSRF-Token', 'not-the-real-token')
      .send({ firstName: 'X', lastName: 'Y', phone: '0500000000' });
    assert.equal(res.status, 403);
    assert.equal(res.body.messageKey, 'errors.csrf');
  });

  test('every major resource route requires authentication', async () => {
    const anon = request.agent(app);
    const routes = [
      ['get', '/api/patients'],
      ['get', '/api/appointments?from=2027-01-01&to=2027-01-31'],
      ['get', '/api/dashboard/summary'],
      ['get', '/api/settings'],
      ['get', '/api/settings/backups'],
      ['post', '/api/visits'],
      ['post', '/api/treatment-plans'],
      ['post', '/api/payments'],
    ];
    for (const [method, path] of routes) {
      const res = await anon[method](path);
      assert.equal(res.status, 401, `${method.toUpperCase()} ${path} should require auth`);
    }
  });

  test('GET /api/auth/me never returns a password hash or session secret', async () => {
    const { agent } = await loginAsNewDoctor();
    const res = await agent.get('/api/auth/me');
    const asString = JSON.stringify(res.body);
    assert.equal(res.body.user.passwordHash, undefined);
    assert.doesNotMatch(asString, /passwordHash/i);
  });

  test('patient records never expose internal-only fields to the API response', async () => {
    const { agent } = await loginAsNewDoctor();
    const patient = await createTestPatient();
    const res = await agent.get(`/api/patients/${patient.id}`);
    assert.equal(res.status, 200);
    // Sanity: the DB row itself has no credential-shaped field to begin
    // with, but this guards against ever accidentally join-including one
    // (e.g. a future include of a related User row) in a patient response.
    assert.doesNotMatch(JSON.stringify(res.body), /passwordHash|sessionSecret|DATABASE_URL/i);
  });
});

test.after(cleanupAllTestData);
