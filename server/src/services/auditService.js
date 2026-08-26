const prisma = require('../db/prismaClient');

// Records a clinical/administrative action for accountability.
// `details` must never contain passwords, session tokens, or other secrets.
async function logAction({ userId, action, entityType, entityId, details, ipAddress }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        action,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        details: details ? JSON.stringify(details) : null,
        ipAddress: ipAddress ?? null,
      },
    });
  } catch (err) {
    // Auditing must never break the primary action.
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = { logAction };
