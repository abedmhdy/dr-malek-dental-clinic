const prisma = require('../db/prismaClient');
const AppError = require('../utils/AppError');
const { todayStr } = require('../utils/dateUtils');

// Creates a visit record, optionally linked to the appointment it came from,
// and marks that appointment Completed (the "Complete Visit" workflow).
async function createVisit(data, doctorId) {
  const { patientId, appointmentId, treatmentType, treatmentDescription, notes, nextVisitRecommendedDate } = data;

  if (appointmentId) {
    const appt = await prisma.appointment.findUnique({ where: { id: Number(appointmentId) } });
    if (!appt) throw new AppError(404, 'errors.appointmentNotFound');
    const alreadyLinked = await prisma.visit.findUnique({ where: { appointmentId: Number(appointmentId) } });
    if (alreadyLinked) throw new AppError(409, 'errors.visitAlreadyExists');
  }

  const visit = await prisma.$transaction(async (tx) => {
    const created = await tx.visit.create({
      data: {
        patientId: Number(patientId),
        appointmentId: appointmentId ? Number(appointmentId) : null,
        doctorId: Number(doctorId),
        visitDate: data.visitDate || todayStr(),
        visitTime: data.visitTime || new Date().toTimeString().slice(0, 5),
        treatmentType,
        treatmentDescription: treatmentDescription || null,
        notes: notes || null,
        nextVisitRecommendedDate: nextVisitRecommendedDate || null,
      },
    });

    if (appointmentId) {
      await tx.appointment.update({
        where: { id: Number(appointmentId) },
        data: { status: 'COMPLETED' },
      });
    }

    return created;
  });

  return visit;
}

async function updateVisit(id, data) {
  const existing = await prisma.visit.findUnique({ where: { id: Number(id) } });
  if (!existing) throw new AppError(404, 'errors.visitNotFound');
  return prisma.visit.update({
    where: { id: Number(id) },
    data: {
      treatmentType: data.treatmentType ?? existing.treatmentType,
      treatmentDescription: data.treatmentDescription ?? existing.treatmentDescription,
      notes: data.notes ?? existing.notes,
      nextVisitRecommendedDate: data.nextVisitRecommendedDate ?? existing.nextVisitRecommendedDate,
    },
  });
}

async function listByPatient(patientId) {
  return prisma.visit.findMany({
    where: { patientId: Number(patientId) },
    orderBy: [{ visitDate: 'desc' }, { visitTime: 'desc' }],
    include: { doctor: { select: { fullNameEn: true, fullNameAr: true, fullNameHe: true } } },
  });
}

async function getVisitById(id) {
  const visit = await prisma.visit.findUnique({
    where: { id: Number(id) },
    include: { patient: true, doctor: true, appointment: true },
  });
  if (!visit) throw new AppError(404, 'errors.visitNotFound');
  return visit;
}

module.exports = { createVisit, updateVisit, listByPatient, getVisitById };
