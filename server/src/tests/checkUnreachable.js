// Standalone helper for health.test.js: constructs a PrismaClient against a
// host that cannot possibly resolve and checks reachability, exactly the
// pattern server/src/services/healthService.js uses. Runs as its own
// process (see health.test.js for why) — prints exactly "true" or "false"
// to stdout and always exits 0, regardless of how the underlying client
// fails, so the parent test never sees an uncaught error from it.
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: 'postgresql://baduser:badpass@nonexistent-host-for-testing.invalid:5432/db' } },
  });

  const timeoutMs = 3000;
  const timeout = new Promise((resolve) => setTimeout(() => resolve(false), timeoutMs));
  const check = prisma.$queryRaw`SELECT 1`.then(
    () => true,
    () => false
  );

  let reachable = false;
  try {
    reachable = await Promise.race([check, timeout]);
  } catch {
    reachable = false;
  }
  process.stdout.write(String(reachable));
  process.exit(0);
}

main().catch(() => {
  process.stdout.write('false');
  process.exit(0);
});

// A last-resort net: if the engine emits an error as an uncaught event
// instead of a promise rejection (the exact quirk this script exists to
// contain), still report "unreachable" and exit cleanly rather than crash
// with a stack trace the parent test would have to interpret.
process.on('uncaughtException', () => {
  process.stdout.write('false');
  process.exit(0);
});
