require('./testSafety');
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loginAsNewDoctor, createTestPatient, unique, teardown } = require('./helpers');

// See health.test.js for why concurrency is forced to 1 across this suite.
describe('Appointments', { concurrency: 1 }, () => {
  test('create and edit an appointment', async () => {
    const { agent, csrfToken } = await loginAsNewDoctor();
    const patient = await createTestPatient();

    const create = await agent
      .post('/api/appointments')
      .set('X-CSRF-Token', csrfToken)
      .send({
        patientId: patient.id,
        date: '2027-01-11', // a Monday, far in the future, never collides with real data
        startTime: '10:00',
        duration: 30,
        treatmentType: 'EXAMINATION',
      });
    assert.equal(create.status, 201);
    assert.equal(create.body.status, 'SCHEDULED');
    assert.equal(create.body.endTime, '10:30');

    const edit = await agent
      .put(`/api/appointments/${create.body.id}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ startTime: '11:00' });
    assert.equal(edit.status, 200);
    assert.equal(edit.body.startTime, '11:00');
    assert.equal(edit.body.endTime, '11:30', 'endTime is recalculated from the new startTime + duration');
  });

  test('cancel marks the appointment CANCELLED rather than deleting it', async () => {
    const { agent, csrfToken } = await loginAsNewDoctor();
    const patient = await createTestPatient();
    const create = await agent
      .post('/api/appointments')
      .set('X-CSRF-Token', csrfToken)
      .send({ patientId: patient.id, date: '2027-01-12', startTime: '09:00', duration: 30, treatmentType: 'EXAMINATION' });

    const cancel = await agent.post(`/api/appointments/${create.body.id}/cancel`).set('X-CSRF-Token', csrfToken);
    assert.equal(cancel.status, 200);
    assert.equal(cancel.body.status, 'CANCELLED');

    const read = await agent.get(`/api/appointments/${create.body.id}`);
    assert.equal(read.status, 200, 'the row still exists, just cancelled');
    assert.equal(read.body.status, 'CANCELLED');
  });

  test('overlapping appointments for the same doctor are rejected', async () => {
    const { agent, csrfToken } = await loginAsNewDoctor();
    const patientA = await createTestPatient();
    const patientB = await createTestPatient();
    const date = '2027-01-13';

    const first = await agent
      .post('/api/appointments')
      .set('X-CSRF-Token', csrfToken)
      .send({ patientId: patientA.id, date, startTime: '14:00', duration: 30, treatmentType: 'EXAMINATION' });
    assert.equal(first.status, 201);

    // Exact same slot, different patient — must be blocked.
    const overlapping = await agent
      .post('/api/appointments')
      .set('X-CSRF-Token', csrfToken)
      .send({ patientId: patientB.id, date, startTime: '14:00', duration: 30, treatmentType: 'EXAMINATION' });
    assert.equal(overlapping.status, 409);
    assert.equal(overlapping.body.messageKey, 'errors.appointmentOverlap');

    // Partial overlap (starts mid-way through the first appointment) — also blocked.
    const partialOverlap = await agent
      .post('/api/appointments')
      .set('X-CSRF-Token', csrfToken)
      .send({ patientId: patientB.id, date, startTime: '14:15', duration: 30, treatmentType: 'EXAMINATION' });
    assert.equal(partialOverlap.status, 409);

    // Back-to-back (starts exactly when the first ends) — must be ALLOWED.
    const adjacent = await agent
      .post('/api/appointments')
      .set('X-CSRF-Token', csrfToken)
      .send({ patientId: patientB.id, date, startTime: '14:30', duration: 30, treatmentType: 'EXAMINATION' });
    assert.equal(adjacent.status, 201);
  });
});

test.after(teardown);
