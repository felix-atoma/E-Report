import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateSecurityCode(academicYear: string, termNumber: number): string {
  const parts = academicYear.split('-');
  const sy = (parts[0] ?? '').slice(-2);
  const ey = (parts[1] ?? String(Number(parts[0] ?? '2024') + 1)).slice(-2);
  const rand = (n: number) =>
    Array.from({ length: n }, () =>
      CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
    ).join('');
  return `${sy}${ey}T${termNumber}-${rand(4)}-${rand(4)}`;
}

async function main() {
  const missing = await prisma.reportCard.findMany({
    where: { status: 'PUBLISHED', securityCode: null },
    select: { id: true, academicYear: true, termNumber: true },
  });

  console.log(`Found ${missing.length} published report(s) missing a securityCode.`);

  for (const r of missing) {
    await prisma.reportCard.update({
      where: { id: r.id },
      data: { securityCode: generateSecurityCode(r.academicYear, r.termNumber) },
    });
  }

  console.log(`Backfilled ${missing.length} report(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
