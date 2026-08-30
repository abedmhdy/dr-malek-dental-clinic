const prisma = require('../db/prismaClient');

const DB_CHECK_TIMEOUT_MS = 3000;

// A minimal, side-effect-free query used only to prove the database
// connection is alive. Bounded by a manual timeout because Prisma/TCP
// connection attempts to an unreachable host can otherwise hang far longer
// than is useful for a health check (well past what a caller like Electron's
// startup sequence should ever wait).
async function isDatabaseReachable() {
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve(false), DB_CHECK_TIMEOUT_MS);
  });
  const check = prisma.$queryRaw`SELECT 1`.then(
    () => true,
    () => false
  );
  return Promise.race([check, timeout]);
}

module.exports = { isDatabaseReachable };
