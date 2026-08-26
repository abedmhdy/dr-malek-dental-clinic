const prisma = require('../db/prismaClient');

const DEFAULT_WORKING_HOURS = {
  0: { closed: true }, // Sunday
  1: { open: '09:00', close: '18:00' },
  2: { open: '09:00', close: '18:00' },
  3: { open: '09:00', close: '18:00' },
  4: { open: '09:00', close: '18:00' },
  5: { open: '09:00', close: '14:00' },
  6: { closed: true }, // Saturday
};

async function getSettings() {
  let settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings) {
    settings = await prisma.settings.create({ data: { id: 1 } });
  }
  return {
    ...settings,
    workingHours: JSON.parse(settings.workingHoursJson || JSON.stringify(DEFAULT_WORKING_HOURS)),
  };
}

async function updateSettings(data) {
  const payload = {};
  if (data.clinicNameEn !== undefined) payload.clinicNameEn = data.clinicNameEn;
  if (data.clinicNameAr !== undefined) payload.clinicNameAr = data.clinicNameAr;
  if (data.clinicNameHe !== undefined) payload.clinicNameHe = data.clinicNameHe;
  if (data.doctorNameEn !== undefined) payload.doctorNameEn = data.doctorNameEn;
  if (data.doctorNameAr !== undefined) payload.doctorNameAr = data.doctorNameAr;
  if (data.doctorNameHe !== undefined) payload.doctorNameHe = data.doctorNameHe;
  if (data.defaultLanguage !== undefined) payload.defaultLanguage = data.defaultLanguage;
  if (data.defaultAppointmentDuration !== undefined) payload.defaultAppointmentDuration = data.defaultAppointmentDuration;
  if (data.autoLockMinutes !== undefined) payload.autoLockMinutes = data.autoLockMinutes;
  if (data.workingHours !== undefined) payload.workingHoursJson = JSON.stringify(data.workingHours);

  await prisma.settings.upsert({
    where: { id: 1 },
    update: payload,
    create: { id: 1, ...payload },
  });
  return getSettings();
}

module.exports = { getSettings, updateSettings, DEFAULT_WORKING_HOURS };
