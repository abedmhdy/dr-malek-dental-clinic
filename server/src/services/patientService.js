const prisma = require('../db/prismaClient');
const AppError = require('../utils/AppError');

// Generates the next sequential, non-reused patient number (P-000001, ...)
// using a dedicated Postgres sequence (see migration
// 20260826_add_patient_number_sequence). nextval() is atomic at the database
// level, so two doctors/computers creating a patient at the same instant can
// never be handed the same number — unlike a "read max, add one" approach,
// which has a race window under real concurrent access.
async function generatePatientNumber() {
  const rows = await prisma.$queryRaw`SELECT nextval('patient_number_seq') AS seq`;
  const seq = Number(rows[0].seq);
  return `P-${String(seq).padStart(6, '0')}`;
}

function normalizePhone(phone) {
  return (phone || '').replace(/[\s\-()]/g, '');
}

// Flags likely duplicate patients by phone match or close name match.
// Does not block creation — the doctor decides.
//
// `mode: 'insensitive'` matters on Postgres specifically: unlike SQLite
// (whose LIKE is case-insensitive for ASCII by default), Postgres's `LIKE`/
// `contains` is case-sensitive unless told otherwise — without this, a
// search for "ahmed" would silently miss a patient named "Ahmed".
async function findPossibleDuplicates({ firstName, lastName, phone }) {
  const normalizedPhone = normalizePhone(phone);
  const candidates = await prisma.patient.findMany({
    where: {
      isActive: true,
      OR: [
        normalizedPhone ? { phone: { contains: normalizedPhone } } : undefined,
        {
          AND: [
            { firstName: { contains: firstName, mode: 'insensitive' } },
            { lastName: { contains: lastName, mode: 'insensitive' } },
          ],
        },
      ].filter(Boolean),
    },
    take: 5,
    select: {
      id: true,
      patientNumber: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
  });
  return candidates;
}

// fullName is derived on read (see toPatientDTO on the frontend/controller),
// not stored, so it can never drift when first/last name are edited later.
async function createPatient(data) {
  const patientNumber = await generatePatientNumber();
  return prisma.patient.create({
    data: {
      patientNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      secondaryPhone: data.secondaryPhone || null,
      email: data.email || null,
      dateOfBirth: data.dateOfBirth || null,
      gender: data.gender || null,
      address: data.address || null,
      notes: data.notes || null,
    },
  });
}

async function getPatientById(id) {
  const patient = await prisma.patient.findUnique({ where: { id: Number(id) } });
  if (!patient || !patient.isActive) {
    throw new AppError(404, 'errors.patientNotFound');
  }
  return patient;
}

async function updatePatient(id, data) {
  await getPatientById(id);
  return prisma.patient.update({
    where: { id: Number(id) },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      secondaryPhone: data.secondaryPhone || null,
      email: data.email || null,
      dateOfBirth: data.dateOfBirth || null,
      gender: data.gender || null,
      address: data.address || null,
      notes: data.notes || null,
    },
  });
}

// Soft delete only — patient clinical history must never disappear by accident.
async function archivePatient(id) {
  await getPatientById(id);
  return prisma.patient.update({
    where: { id: Number(id) },
    data: { isActive: false },
  });
}

async function listPatients({ page = 1, pageSize = 20 } = {}) {
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.patient.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.patient.count({ where: { isActive: true } }),
  ]);
  return { items, total, page, pageSize };
}

async function searchPatients(query) {
  const q = (query || '').trim();
  if (!q) return [];
  const normalizedPhone = normalizePhone(q);

  return prisma.patient.findMany({
    where: {
      isActive: true,
      OR: [
        { patientNumber: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: normalizedPhone || q } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 25,
  });
}

module.exports = {
  generatePatientNumber,
  findPossibleDuplicates,
  createPatient,
  getPatientById,
  updatePatient,
  archivePatient,
  listPatients,
  searchPatients,
};
