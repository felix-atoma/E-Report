/**
 * One-time script to create the SUPERADMIN user.
 * Usage:
 *   cd backend
 *   SUPERADMIN_EMAIL=felixatoma2@gmail.com SUPERADMIN_PASSWORD=YourPass npx ts-node prisma/create-superadmin.ts
 *
 * Or just run with defaults (edit below):
 *   npx ts-node prisma/create-superadmin.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPERADMIN_EMAIL ?? 'felixatoma2@gmail.com';
  const name = process.env.SUPERADMIN_NAME ?? 'Felix Atoma';
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!password) {
    console.error('ERROR: Set SUPERADMIN_PASSWORD env var before running this script.');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role === 'SUPERADMIN') {
      // Update password only
      const hashed = await bcrypt.hash(password, 12);
      await prisma.user.update({ where: { email }, data: { password: hashed } });
      console.log(`✅ SUPERADMIN password updated for ${email}`);
    } else {
      console.error(`ERROR: ${email} already exists with role ${existing.role}. Aborting.`);
      process.exit(1);
    }
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: 'SUPERADMIN' as any,
      isActive: true,
      // institutionId is intentionally null for SUPERADMIN
    },
  });

  console.log(`✅ SUPERADMIN created: ${user.email} (id: ${user.id})`);
  console.log('   You can now log in at /login with role SUPERADMIN → redirects to /superadmin');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
