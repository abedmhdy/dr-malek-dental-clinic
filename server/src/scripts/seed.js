// Populates the database with obviously fictional demo data so the system
// can be explored without ever using a real patient's information.
// Safe to run multiple times (skips if demo patients already exist).

const bcrypt = require('bcryptjs');
const prisma = require('../db/prismaClient');
const { todayStr, addDaysToDateStr } = require('../utils/dateUtils');

async function main() {
  let doctor = await prisma.user.findUnique({ where: { username: 'drmalek' } });
  if (!doctor) {
    doctor = await prisma.user.create({
      data: {
        username: 'drmalek',
        passwordHash: await bcrypt.hash('ChangeMe123!', 12),
        fullNameEn: 'Dr. Malek Abu Sholdom',
        fullNameAr: 'د. مالك أبو شلدوم',
        fullNameHe: 'ד"ר מאלק אבו שלדום',
        role: 'DOCTOR',
      },
    });
    console.log('Created default doctor user "drmalek" / "ChangeMe123!" — change this password immediately.');
  }

  const existingDemo = await prisma.patient.findFirst({ where: { patientNumber: 'P-000001' } });
  if (existingDemo) {
    console.log('Demo data already present, skipping seed.');
    await prisma.$disconnect();
    return;
  }

  const demoPatients = [
    { firstName: 'Ahmed', lastName: 'Test', phone: '0500000001', dateOfBirth: '1990-04-12', gender: 'male' },
    { firstName: 'Sarah', lastName: 'Demo', phone: '0500000002', dateOfBirth: '1985-09-23', gender: 'female' },
    { firstName: 'David', lastName: 'Example', phone: '0500000003', dateOfBirth: '2001-01-05', gender: 'male' },
    { firstName: 'Layla', lastName: 'Sample', phone: '0500000004', dateOfBirth: '1998-07-30', gender: 'female' },
  ];

  const created = [];
  for (let i = 0; i < demoPatients.length; i += 1) {
    const p = demoPatients[i];
    const patientNumber = `P-${String(i + 1).padStart(6, '0')}`;
    const patient = await prisma.patient.create({ data: { ...p, patientNumber } });
    created.push(patient);
  }

  // These patient numbers were assigned by hand above (not via nextval()),
  // so patient_number_seq must be advanced to match — otherwise the next
  // *real* patient created through the app would collide with "P-000001".
  await prisma.$executeRawUnsafe(
    `SELECT setval('patient_number_seq', ${demoPatients.length}, true);`
  );

  const today = todayStr();
  const treatments = ['Examination', 'Cleaning', 'Orthodontic Adjustment', 'Consultation'];

  await prisma.appointment.create({
    data: {
      patientId: created[0].id,
      doctorId: doctor.id,
      date: today,
      startTime: '09:00',
      endTime: '09:30',
      duration: 30,
      treatmentType: treatments[2],
      status: 'SCHEDULED',
    },
  });
  await prisma.appointment.create({
    data: {
      patientId: created[1].id,
      doctorId: doctor.id,
      date: today,
      startTime: '09:30',
      endTime: '10:00',
      duration: 30,
      treatmentType: treatments[1],
      status: 'SCHEDULED',
    },
  });
  await prisma.appointment.create({
    data: {
      patientId: created[2].id,
      doctorId: doctor.id,
      date: addDaysToDateStr(today, 1),
      startTime: '10:30',
      endTime: '11:00',
      duration: 30,
      treatmentType: treatments[0],
      status: 'SCHEDULED',
    },
  });

  await prisma.visit.create({
    data: {
      patientId: created[0].id,
      doctorId: doctor.id,
      visitDate: addDaysToDateStr(today, -14),
      visitTime: '09:00',
      treatmentType: 'Orthodontic Adjustment',
      treatmentDescription: 'Wire adjusted, elastics changed.',
      notes: 'Patient tolerating treatment well.',
      nextVisitRecommendedDate: today,
    },
  });

  console.log(`Seeded ${created.length} demo patients and sample appointments/visits.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
