require('./testSafety');
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loginAsNewDoctor, createTestPatient, cleanupAllTestData } = require('./helpers');

describe('Visits and payments', () => {
  test('recording a visit adds it to the patient treatment history', async () => {
    const { agent, csrfToken } = await loginAsNewDoctor();
    const patient = await createTestPatient();

    const visit = await agent
      .post('/api/visits')
      .set('X-CSRF-Token', csrfToken)
      .send({ patientId: patient.id, treatmentType: 'CLEANING', treatmentDescription: 'Routine cleaning', visitDate: '2027-01-05' });
    assert.equal(visit.status, 201);

    const history = await agent.get(`/api/patients/${patient.id}/visits`);
    assert.equal(history.status, 200);
    assert.equal(history.body.length, 1);
    assert.equal(history.body[0].treatmentType, 'CLEANING');
  });

  test('payment recording and balance calculation are correct', async () => {
    const { agent, csrfToken } = await loginAsNewDoctor();
    const patient = await createTestPatient();

    const plan = await agent
      .post('/api/treatment-plans')
      .set('X-CSRF-Token', csrfToken)
      .send({ patientId: patient.id, title: 'Braces', totalPrice: '1000.00' });
    assert.equal(plan.status, 201);

    const payment1 = await agent
      .post('/api/payments')
      .set('X-CSRF-Token', csrfToken)
      .send({ patientId: patient.id, treatmentPlanId: plan.body.id, amount: '300.00', paymentDate: '2027-01-06', paymentMethod: 'CASH' });
    assert.equal(payment1.status, 201);

    const summaryAfterFirst = await agent.get(`/api/patients/${patient.id}/financial-summary`);
    assert.equal(summaryAfterFirst.body.overall.totalPaid, '300.00');
    assert.equal(summaryAfterFirst.body.overall.remaining, '700.00');

    const payment2 = await agent
      .post('/api/payments')
      .set('X-CSRF-Token', csrfToken)
      .send({ patientId: patient.id, treatmentPlanId: plan.body.id, amount: '250.50', paymentDate: '2027-01-07', paymentMethod: 'CREDIT_CARD' });
    assert.equal(payment2.status, 201);

    const summaryAfterSecond = await agent.get(`/api/patients/${patient.id}/financial-summary`);
    assert.equal(summaryAfterSecond.body.overall.totalPaid, '550.50');
    assert.equal(summaryAfterSecond.body.overall.remaining, '449.50');

    // A payment that would exceed the remaining balance is rejected.
    const overpay = await agent
      .post('/api/payments')
      .set('X-CSRF-Token', csrfToken)
      .send({ patientId: patient.id, treatmentPlanId: plan.body.id, amount: '999.00', paymentDate: '2027-01-08' });
    assert.equal(overpay.status, 409);
    assert.equal(overpay.body.messageKey, 'errors.paymentExceedsBalance');
  });

  test('voiding a payment excludes it from the balance but keeps it in history', async () => {
    const { agent, csrfToken } = await loginAsNewDoctor();
    const patient = await createTestPatient();

    const plan = await agent
      .post('/api/treatment-plans')
      .set('X-CSRF-Token', csrfToken)
      .send({ patientId: patient.id, title: 'Filling', totalPrice: '500.00' });

    const payment = await agent
      .post('/api/payments')
      .set('X-CSRF-Token', csrfToken)
      .send({ patientId: patient.id, treatmentPlanId: plan.body.id, amount: '200.00', paymentDate: '2027-01-09' });

    const beforeVoid = await agent.get(`/api/patients/${patient.id}/financial-summary`);
    assert.equal(beforeVoid.body.overall.remaining, '300.00');

    const voidRes = await agent
      .post(`/api/payments/${payment.body.id}/void`)
      .set('X-CSRF-Token', csrfToken)
      .send({ reason: 'Entered by mistake — test' });
    assert.equal(voidRes.status, 200);
    assert.ok(voidRes.body.voidedAt);

    // Balance reverts as if the voided payment never happened...
    const afterVoid = await agent.get(`/api/patients/${patient.id}/financial-summary`);
    assert.equal(afterVoid.body.overall.remaining, '500.00');

    // ...but the payment row itself is still visible in history, marked voided.
    const payments = await agent.get(`/api/patients/${patient.id}/payments`);
    const found = payments.body.find((p) => p.id === payment.body.id);
    assert.ok(found, 'voided payment must still appear in history');
    assert.ok(found.voidedAt);

    // A voided payment cannot be voided again.
    const doubleVoid = await agent
      .post(`/api/payments/${payment.body.id}/void`)
      .set('X-CSRF-Token', csrfToken)
      .send({ reason: 'again' });
    assert.equal(doubleVoid.status, 409);
    assert.equal(doubleVoid.body.messageKey, 'errors.paymentAlreadyVoided');
  });
});

test.after(cleanupAllTestData);
