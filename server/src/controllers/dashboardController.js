const asyncHandler = require('../utils/asyncHandler');
const prisma = require('../db/prismaClient');
const { todayStr, addDaysToDateStr } = require('../utils/dateUtils');
const financeService = require('../services/financeService');

const summary = asyncHandler(async (req, res) => {
  const today = todayStr();
  const in7Days = addDaysToDateStr(today, 7);

  const [todayAppointments, upcomingCount, totalPatients, cancelledToday, completedToday, financeOverview] =
    await Promise.all([
      prisma.appointment.findMany({
        where: { date: today, status: { notIn: ['CANCELLED'] } },
        include: { patient: true },
        orderBy: { startTime: 'asc' },
      }),
      prisma.appointment.count({
        where: { date: { gt: today, lte: in7Days }, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
      }),
      prisma.patient.count({ where: { isActive: true } }),
      prisma.appointment.count({ where: { date: today, status: 'CANCELLED' } }),
      prisma.appointment.count({ where: { date: today, status: 'COMPLETED' } }),
      financeService.getClinicFinancialOverview(),
    ]);

  res.json({
    today,
    todayAppointments,
    counts: {
      today: todayAppointments.length,
      upcoming7Days: upcomingCount,
      totalPatients,
      cancelledToday,
      completedToday,
    },
    finance: financeOverview,
  });
});

module.exports = { summary };
