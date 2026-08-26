const asyncHandler = require('../utils/asyncHandler');
const patientService = require('../services/patientService');
const prisma = require('../db/prismaClient');

const search = asyncHandler(async (req, res) => {
  const q = req.query.q || '';
  const patients = await patientService.searchPatients(q);

  const withNextAppointment = await Promise.all(
    patients.map(async (p) => {
      const next = await prisma.appointment.findFirst({
        where: {
          patientId: p.id,
          status: { notIn: ['CANCELLED', 'COMPLETED', 'NO_SHOW'] },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      });
      return {
        id: p.id,
        patientNumber: p.patientNumber,
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone,
        nextAppointment: next ? { date: next.date, startTime: next.startTime } : null,
      };
    })
  );

  res.json(withNextAppointment);
});

module.exports = { search };
