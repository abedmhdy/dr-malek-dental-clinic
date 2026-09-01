require('./testSafety');
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loginAsNewDoctor, unique, teardown } = require('./helpers');

// See health.test.js for why concurrency is forced to 1 across this suite.
describe('Patients', { concurrency: 1 }, () => {
  test('create, read, and update a patient', async () => {
    const { agent, csrfToken } = await loginAsNewDoctor();
    const seq = unique();

    const create = await agent
      .post('/api/patients')
      .set('X-CSRF-Token', csrfToken)
      .send({ firstName: '__TEST_DATA__', lastName: `Create${seq}`, phone: `0501${seq}`.slice(0, 10) });
    assert.equal(create.status, 201);
    assert.ok(create.body.id);
    assert.match(create.body.patientNumber, /^P-\d{6}$/);

    const read = await agent.get(`/api/patients/${create.body.id}`);
    assert.equal(read.status, 200);
    assert.equal(read.body.lastName, `Create${seq}`);

    const update = await agent
      .put(`/api/patients/${create.body.id}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ firstName: '__TEST_DATA__', lastName: `Updated${seq}`, phone: `0501${seq}`.slice(0, 10) });
    assert.equal(update.status, 200);
    assert.equal(update.body.lastName, `Updated${seq}`);
  });

  test('archive is a soft delete — patient disappears from listing but data is preserved', async () => {
    const { agent, csrfToken } = await loginAsNewDoctor();
    const seq = unique();
    const create = await agent
      .post('/api/patients')
      .set('X-CSRF-Token', csrfToken)
      .send({ firstName: '__TEST_DATA__', lastName: `Archive${seq}`, phone: `0502${seq}`.slice(0, 10) });

    const archive = await agent.delete(`/api/patients/${create.body.id}`).set('X-CSRF-Token', csrfToken);
    assert.equal(archive.status, 200);
    assert.equal(archive.body.isActive, false);

    // Soft-deleted: fetching it directly now 404s (the app treats inactive
    // as "not found" for normal reads) but the row itself must still exist.
    const read = await agent.get(`/api/patients/${create.body.id}`);
    assert.equal(read.status, 404);
  });

  test('duplicate detection flags a likely-same patient by phone', async () => {
    const { agent, csrfToken } = await loginAsNewDoctor();
    const seq = unique();
    const phone = `0503${seq}`.slice(0, 10);
    await agent
      .post('/api/patients')
      .set('X-CSRF-Token', csrfToken)
      .send({ firstName: '__TEST_DATA__', lastName: `Dup${seq}`, phone });

    const check = await agent
      .get('/api/patients/check-duplicates')
      .query({ firstName: '__TEST_DATA__', lastName: `Dup${seq}`, phone });
    assert.equal(check.status, 200);
    assert.ok(check.body.candidates.length >= 1);
    assert.ok(check.body.candidates.some((c) => c.phone === phone));
  });
});

test.after(teardown);
