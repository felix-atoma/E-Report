import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

function mention(avg: number) {
  return avg >= 18 ? 'Excellent' : avg >= 16 ? 'Très Bien' : avg >= 14 ? 'Bien'
    : avg >= 12 ? 'Assez Bien' : avg >= 10 ? 'Passable' : 'Insuffisant';
}
function conduct(avg: number): 'TRES_BIEN' | 'BIEN' | 'PASSABLE' | 'MEDIOCRE' {
  return avg >= 14 ? 'TRES_BIEN' : avg >= 12 ? 'BIEN' : avg >= 10 ? 'PASSABLE' : 'MEDIOCRE';
}

// 6 students — each pair (T1_avg → T2_avg) shows a different at-risk scenario
const SCENARIOS: Array<{ t2Avg: number; label: string }> = [
  { t2Avg: 6.75,  label: 'Chute catastrophique + en échec' },
  { t2Avg: 8.00,  label: 'Forte baisse + en échec' },
  { t2Avg: 7.25,  label: 'Chute sévère + en échec' },
  { t2Avg: 9.50,  label: 'Baisse marquée, juste sous la moyenne' },
  { t2Avg: 9.00,  label: 'Forte baisse + en échec' },
  { t2Avg: 11.50, label: 'Baisse > 1.5 points (toujours passant)' },
];

async function main() {
  console.log('🎯 Injecting at-risk test data into 3ème B T2 report cards…\n');

  const inst = await prisma.institution.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!inst) throw new Error('No institution found — run seed.ts first.');

  const cls = await prisma.class.findFirst({ where: { id: 'seed-class-3b' } });
  if (!cls) throw new Error('Class 3B (seed-class-3b) not found — run seed.ts first.');

  const enrollments = await prisma.classStudent.findMany({
    where: { classId: cls.id, academicYear: '2024-2025' },
    include: { student: { include: { user: { select: { name: true } } } } },
    take: 6,
  });
  if (enrollments.length < 6) {
    throw new Error(`Expected 6 students in 3ème B, found ${enrollments.length} — run seed.ts first.`);
  }

  for (let i = 0; i < enrollments.length; i++) {
    const enrollment = enrollments[i] as any;
    const studentId = enrollment.studentId as string;
    const student   = enrollment.student as any;
    const { t2Avg, label } = SCENARIOS[i];
    const name = student.user?.name ?? student.admissionNumber;

    const [t1, t2] = await Promise.all([
      prisma.reportCard.findFirst({ where: { studentId, academicYear: '2024-2025', termNumber: 1 } }),
      prisma.reportCard.findFirst({ where: { studentId, academicYear: '2024-2025', termNumber: 2 } }),
    ]);

    if (!t2) {
      console.log(`  ⚠  No T2 for ${name} — skipping`);
      continue;
    }

    await prisma.reportCard.update({
      where: { id: t2.id },
      data: {
        overallAverage: t2Avg,
        mention: mention(t2Avg),
        conductRating: conduct(t2Avg),
        teacherComment: t2Avg < 10
          ? "Les résultats sont très préoccupants ce trimestre. Une aide immédiate est nécessaire pour éviter un redoublement."
          : "Forte baisse des résultats par rapport au trimestre précédent. Des efforts urgents sont requis.",
      },
    });

    const t1Avg = t1?.overallAverage != null ? Number(t1.overallAverage) : null;
    const drop  = t1Avg != null ? Math.round((t1Avg - t2Avg) * 100) / 100 : null;
    console.log(
      `  ✅ ${name.padEnd(30)} T1=${t1Avg?.toFixed(2) ?? '??'} → T2=${t2Avg.toFixed(2)}` +
      (drop != null ? `  (chute: ${drop > 0 ? '-' : '+'}${Math.abs(drop).toFixed(2)})` : '') +
      `  [${label}]`
    );
  }

  console.log('\n✅ Done. Open the Admin Dashboard to see the at-risk alert.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
