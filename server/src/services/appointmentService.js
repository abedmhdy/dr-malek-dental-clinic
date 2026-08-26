const prisma = require('../db/prismaClient');
const AppError = require('../utils/AppError');
const { rangesOverlap, addMinutesToTimeStr } = require('../utils/dateUtils');

const VALID_STATUSES = [
  'SCHEDULED',
  'ARRIVED',
  'IN_TREATMENT',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
];

async function assertNoOverlap({ doctorId, date, startTime, endTime, excludeAppointmentId }) {
  const sameDay = await prisma.appointment.findMany({
    where: {
      doctorId: Number(doctorId),
      date,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      ...(excludeAppointmentId ? { id: { not: Number(excludeAppointmentId) } } : {}),
    },
    select: { id: true, startTime: true, endTime: true },
  });

  const conflict = sameDay.some((a) => rangesOverlap(startTime, endTime, a.startTime, a.endTime));
  if (conflict) {
    throw new AppError(409, 'errors.appointmentOverlap');
  }
}

async function createAppointment(data, doctorId) {
  const { patientId, date, startTime, duration, treatmentType, reason, notes } = data;
  const endTime = data.endTime || addMinutesToTimeStr(startTime, duration);

  if (!(startTime < endTime)) {
    throw new AppError(422, 'errors.endBeforeStart');
  }

  await assertNoOverlap({ doctorId, date, startTime, endTime });

  return prisma.appointment.create({
    data: {
      patientId: Number(patientId),
      doctorId: Number(doctorId),
      date,
      startTime,
      endTime,
      duration,
      treatmentType,
      reason: reason || null,
      notes: notes || null,
      status: 'SCHEDULED',
    },
  });
}

async function getAppointmentById(id) {
  const appt = await prisma.appointment.findUnique({
    where: { id: Number(id) },
    include: { patient: true, visit: true },
  });
  if (!appt) throw new AppError(404, 'errors.appointmentNotFound');
  return appt;
}

async function updateAppointment(id, data, doctorId) {
  const existing = await getAppointmentById(id);
  const date = data.date ?? existing.date;
  const startTime = data.startTime ?? existing.startTime;
  const duration = data.duration ?? existing.duration;
  const endTime = data.endTime || addMinutesToTimeStr(startTime, duration);

  if (!(startTime < endTime)) {
    throw new AppError(422, 'errors.endBeforeStart');
  }

  await assertNoOverlap({
    doctorId: doctorId ?? existing.doctorId,
    date,
    startTime,
    endTime,
    excludeAppointmentId: id,
  });

  return prisma.appointment.update({
    where: { id: Number(id) },
    data: {
      date,
      startTime,
      endTime,
      duration,
      treatmentType: data.treatmentType ?? existing.treatmentType,
      reason: data.reason ?? existing.reason,
      notes: data.notes ?? existing.notes,
      patientId: data.patientId ? Number(data.patientId) : existing.patientId,
    },
  });
}

async function setStatus(id, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new AppError(422, 'errors.invalidStatus');
  }
  await getAppointmentById(id);
  return prisma.appointment.update({ where: { id: Number(id) }, data: { status } });
}

// Cancellation is the safe, non-destructive default (see requirement #38).
async function cancelAppointment(id) {
  return setStatus(id, 'CANCELLED');
}

async function listByDateRange({ from, to, doctorId }) {
  return prisma.appointment.findMany({
    where: {
      date: { gte: from, lte: to },
      ...(doctorId ? { doctorId: Number(doctorId) } : {}),
    },
    include: { patient: true },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
}

async function listByPatient(patientId) {
  return prisma.appointment.findMany({
    where: { patientId: Number(patientId) },
    orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
  });
}

module.exports = {
  VALID_STATUSES,
  createAppointment,
  getAppointmentById,
  updateAppointment,
  setStatus,
  cancelAppointment,
  listByDateRange,
  listByPatient,
  assertNoOverlap,
};
