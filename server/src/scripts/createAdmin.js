// Creates (or resets the password of) the doctor's administrator account.
//
// Usage (interactive, recommended for Dr. Malek):
//   npm run create-admin
//
// Usage (non-interactive, e.g. for automated setup):
//   ADMIN_USERNAME=drmalek ADMIN_PASSWORD=SomeStrongPassword123 npm run create-admin
//
// The password is never printed, logged, or stored anywhere in plain text.
// Note: interactive input is not masked on-screen (Node has no dependency-
// free way to do that reliably across Windows terminals) — run this in a
// private location, or use the non-interactive env-var form instead.

const readline = require('readline');
const bcrypt = require('bcryptjs');
const prisma = require('../db/prismaClient');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('=== Dental Clinic — Administrator Account Setup ===\n');

  const username = process.env.ADMIN_USERNAME || (await ask('Username: '));
  const password = process.env.ADMIN_PASSWORD || (await ask('Password (min 8 characters, input is not masked): '));

  if (!username || username.length < 3) {
    console.error('Username must be at least 3 characters.');
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    await prisma.user.update({
      where: { username },
      data: { passwordHash, isActive: true, failedLoginCount: 0, lockedUntil: null },
    });
    console.log(`\nPassword updated for existing user "${username}".`);
  } else {
    await prisma.user.create({
      data: {
        username,
        passwordHash,
        fullNameEn: 'Dr. Malek Abu Sholdom',
        fullNameAr: 'د. مالك أبو شلدوم',
        fullNameHe: 'ד"ר מאלק אבו שלדום',
        role: 'DOCTOR',
      },
    });
    console.log(`\nAdministrator account "${username}" created successfully.`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Failed to create administrator account:', err.message);
  await prisma.$disconnect();
  process.exit(1);
});
