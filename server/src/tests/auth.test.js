require('./testSafety');
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, loginAsNewDoctor, createTestDoctor, teardown } = require('./helpers');

describe('Authentication', () => {
  test('correct login succeeds and returns the safe user shape', async () => {
    const { user, username, password } = await createTestDoctor();
    const agent = request.agent(app);
    const me = await agent.get('/api/auth/me');
    const login = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', me.body.csrfToken)
      .send({ username, password });

    assert.equal(login.status, 200);
    assert.equal(login.body.user.username, username);
    assert.equal(login.body.user.id, user.id);
    assert.equal(login.body.user.passwordHash, undefined, 'password hash must never be returned');
  });

  test('wrong password is rejected with invalidCredentials, not a generic error', async () => {
    const { username } = await createTestDoctor();
    const agent = request.agent(app);
    const me = await agent.get('/api/auth/me');
    const login = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', me.body.csrfToken)
      .send({ username, password: 'definitely-wrong' });

    assert.equal(login.status, 401);
    assert.equal(login.body.messageKey, 'errors.invalidCredentials');
  });

  test('account locks out after 5 failed attempts', async () => {
    const { username } = await createTestDoctor();
    const agent = request.agent(app);
    const me = await agent.get('/api/auth/me');
    const csrf = me.body.csrfToken;

    let last;
    for (let i = 0; i < 5; i += 1) {
      last = await agent.post('/api/auth/login').set('X-CSRF-Token', csrf).send({ username, password: 'wrong' });
    }
    assert.equal(last.status, 401, 'the 5th wrong attempt is still just invalidCredentials');

    const sixth = await agent.post('/api/auth/login').set('X-CSRF-Token', csrf).send({ username, password: 'wrong' });
    assert.equal(sixth.status, 423);
    assert.equal(sixth.body.messageKey, 'errors.accountLocked');

    // The account stays locked even for a subsequent attempt.
    const seventh = await agent.post('/api/auth/login').set('X-CSRF-Token', csrf).send({ username, password: 'wrong' });
    assert.equal(seventh.status, 423);
  });

  test('unauthorized requests to protected API routes are rejected', async () => {
    const anon = request.agent(app);
    const res = await anon.get('/api/patients');
    assert.equal(res.status, 401);
    assert.equal(res.body.messageKey, 'errors.unauthorized');
  });

  test('logout clears the session so subsequent requests are unauthorized', async () => {
    const { agent, csrfToken } = await loginAsNewDoctor();

    const before = await agent.get('/api/patients');
    assert.equal(before.status, 200);

    const logout = await agent.post('/api/auth/logout').set('X-CSRF-Token', csrfToken);
    assert.equal(logout.status, 200);

    const after = await agent.get('/api/patients');
    assert.equal(after.status, 401);
  });
});

test.after(teardown);
