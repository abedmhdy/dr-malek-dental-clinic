require('./testSafety');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../app');
const prisma = require('../db/prismaClient');
const sessionMiddleware = require('../config/session');

// Every fictional record created for tests carries this marker in a name/
// notes field so cleanup can find and remove exactly what a test created,
// never anything else — this suite always runs against an already-isolated
// local test database, but the extra marker costs nothing and makes intent
// explicit.
const TEST_MARKER = '__TEST_DATA__';

let counter = 0;
function unique() {
  counter += 1;
  return `${Date.now()}_${counter}`;
}

async function createTestDoctor() {
  const username = `test_doctor_${unique()}`;
  const password = 'TestPassword123!';
  const passwordHash = await bcrypt.hash(password, 4); // low cost factor — speed, not security, in tests
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      fullNameEn: TEST_MARKER,
      fullNameAr: TEST_MARKER,
      fullNameHe: TEST_MARKER,
      role: 'DOCTOR',
    },
  });
  return { user, username, password };
}

// Returns a logged-in supertest agent (persists the session cookie across
// requests, like a real browser) plus the CSRF token to send on
// state-changing requests, and the doctor user record.
async function loginAsNewDoctor() {
  const { user, username, password } = await createTestDoctor();
  const agent = request.agent(app);

  const me = await agent.get('/api/auth/me');
  const csrfToken = me.body.csrfToken;

  const login = await agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', csrfToken)
    .send({ username, password });

  if (login.status !== 200) {
    throw new Error(`Test login failed: ${JSON.stringify(login.body)}`);
  }

  return { agent, csrfToken: login.body.csrfToken, user };
}

async function createTestPatient(overrides = {}) {
  const seq = unique();
  return prisma.patient.create({
    data: {
      patientNumber: `T-${seq}`,
      firstName: TEST_MARKER,
      lastName: `Patient${seq}`,
      phone: `0500${seq}`.slice(0, 10),
      ...overrides,
    },
  });
}

// Deletes everything created by this marker, in FK-safe order. Only ever
// touches rows carrying TEST_MARKER — never a blanket delete.
async function cleanupAllTestData() {
  const testPatients = await prisma.patient.findMany({ where: { firstName: TEST_MARKER }, select: { id: true } });
  const patientIds = testPatients.map((p) => p.id);

  const testDoctors = await prisma.user.findMany({ where: { fullNameEn: TEST_MARKER }, select: { id: true } });
  const doctorIds = testDoctors.map((d) => d.id);

  await prisma.auditLog.deleteMany({ where: { userId: { in: doctorIds } } });
  await prisma.payment.deleteMany({ where: { patientId: { in: patientIds } } });
  await prisma.visit.deleteMany({ where: { patientId: { in: patientIds } } });
  await prisma.appointment.deleteMany({ where: { patientId: { in: patientIds } } });
  await prisma.treatmentPlan.deleteMany({ where: { patientId: { in: patientIds } } });
  await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
  await prisma.user.deleteMany({ where: { id: { in: doctorIds } } });
}

// Closes every long-lived connection/timer this test file's process opened
// (Prisma's pool, the session store's pool) so `node --test` sees the
// process exit naturally instead of hanging after the last test finishes.
async function closeAllConnections() {
  await prisma.$disconnect();
  await new Promise((resolve) => sessionMiddleware.store.close(resolve));
}

// Runs cleanup and connection teardown together — the one call every test
// file's `test.after(...)` should use.
async function teardown() {
  await cleanupAllTestData();
  await closeAllConnections();
}

module.exports = {
  app,
  prisma,
  TEST_MARKER,
  unique,
  createTestDoctor,
  loginAsNewDoctor,
  createTestPatient,
  cleanupAllTestData,
  closeAllConnections,
  teardown,
};
