import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const basePrisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

// Auto-reconnect on P1001/P1017 (Supabase drops idle connections)
const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ args, query }) {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          return await query(args);
        } catch (e: any) {
          const code = e.code ?? e.errorCode;
          if ((code === 'P1001' || code === 'P1017') && attempt < 4) {
            const wait = 1500 * (attempt + 1);
            console.log(`  ⟳ Connection lost (${e.code}), retrying in ${wait}ms…`);
            await basePrisma.$disconnect();
            await new Promise((r) => setTimeout(r, wait));
            await basePrisma.$connect();
          } else {
            throw e;
          }
        }
      }
    },
  },
}) as unknown as PrismaClient;

// ── Name pools (Togolese) ─────────────────────────────────────────────────────
const MN = ['Kofi','Kwame','Komi','Kodjo','Kossi','Mawuli','Edem','Dodzi','Yawo','Selom','Kafui','Atsu','Amah','Agbeko','Senyo','Delali','Elikem','Kekeli','Fiogbe','Gbati','Egnonto','Kuami','Tchapo','Ablam','Togbé'];
const FN = ['Afi','Akua','Ama','Yawa','Abra','Akosua','Sena','Nana','Akpene','Dzidzor','Mawuéna','Céleste','Patience','Sedem','Yayra','Essivi','Afia','Abla','Worlasi','Enyonam','Solim','Mawunyo','Etonam','Foevi','Adjo'];
const SN = ['Amedzro','Dossou','Gbenou','Mensah','Lalle','Kokou','Afiwa','Amah','Agbevor','Kpodo','Blewu','Atsu','Glikpo','Dewotor','Amenuveve','Kossivi','Agbayizo','Ahlijah','Amavi','Nunyuie','Agbenu','Tetteh','Kpossu','Doe','Djalogue','Adjanohoun','Agbeko','Lawson','Sossah','Togbe','Kpakpo','Nyuiemedi','Amevor','Fiogbe','Aziawonou','Abalo','Aklesso','Amegadze','Assih','Atayi','Avegnon','Aziagbe','Badagbor','Bankole','Dade','Djaglo','Ekpe','Foli','Gnon','Honu'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const hash = (p: string) => bcrypt.hash(p, 12);

function calcMoy(i1: number, i2: number, d: number, c: number) {
  return Math.round(((i1 + i2 + d + 2 * c) / 5) * 100) / 100;
}
function appr(m: number) { return m >= 16 ? 'TB' : m >= 14 ? 'B' : m >= 12 ? 'AB' : m >= 10 ? 'P' : 'F'; }
function ment(a: number) {
  return a >= 18 ? 'Excellent' : a >= 16 ? 'Très Bien' : a >= 14 ? 'Bien'
    : a >= 12 ? 'Assez Bien' : a >= 10 ? 'Passable' : 'Insuffisant';
}
function conduct(a: number): 'TRES_BIEN'|'BIEN'|'PASSABLE'|'MEDIOCRE' {
  return a >= 14 ? 'TRES_BIEN' : a >= 12 ? 'BIEN' : a >= 10 ? 'PASSABLE' : 'MEDIOCRE';
}

// Deterministic grade generation per (studentIndex, subjectIndex, level)
function makeGrade(si: number, sj: number, lv: 'H'|'M'|'L') {
  const base = lv === 'H' ? 15 : lv === 'M' ? 10 : 5;
  const j = (si * 7 + sj * 13) % 4;
  const v = (n: number) => Math.min(20, Math.max(1, base + j + n));
  return { i1: v(0), i2: v(1), devoir: v(2), compo: v(0) };
}
function lvl(idx: number, total: number): 'H'|'M'|'L' {
  return idx < total * 0.2 ? 'H' : idx < total * 0.75 ? 'M' : 'L';
}

// Build 50 student definitions for a class (25M + 25F)
function makeDefs(code: string, baseYr: number) {
  const d: { admission: string; name: string; email: string; sex: 'M'|'F'; dob: string; pi: number }[] = [];
  for (let i = 0; i < 25; i++) {
    const yr = baseYr - (i % 3);
    d.push({
      admission: `LYC-${code}-M${String(i + 1).padStart(2, '0')}`,
      name: `${MN[i]} ${SN[i * 2 % SN.length]}`,
      email: `s.${code.toLowerCase()}.m${i + 1}@student.demo.novabulletin.local`,
      sex: 'M', dob: `${yr}-${String(1 + (i * 3) % 12).padStart(2, '0')}-${String(1 + (i * 7) % 28).padStart(2, '0')}`,
      pi: i % 6,
    });
  }
  for (let i = 0; i < 25; i++) {
    const yr = baseYr - (i % 3);
    d.push({
      admission: `LYC-${code}-F${String(i + 1).padStart(2, '0')}`,
      name: `${FN[i]} ${SN[(i * 2 + 1) % SN.length]}`,
      email: `s.${code.toLowerCase()}.f${i + 1}@student.demo.novabulletin.local`,
      sex: 'F', dob: `${yr}-${String(1 + (i * 5 + 2) % 12).padStart(2, '0')}-${String(1 + (i * 11 + 5) % 28).padStart(2, '0')}`,
      pi: i % 6,
    });
  }
  return d;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding database…');
  try { await basePrisma.$executeRawUnsafe('SET statement_timeout = 0'); } catch (_) {}

  // ── 1. Institution — update existing or create from scratch ──────────────
  const instData = {
    name: 'Lycée Démonstration NovaBulletin',
    address: '12 Boulevard de la Paix, Lomé, Togo',
    phone: '+228 90 00 00 00',
    motto: "L'excellence par le savoir",
    missionStatement: 'Former des citoyens compétents, responsables et engagés pour le développement du Togo.',
    academicSettings: {
      termSystem: 'TRIMESTRE', termsPerYear: 3,
      termNames: { fr: ['1er Trimestre', '2ème Trimestre', '3ème Trimestre'] },
      gradingScale: { min: 0, max: 20 }, passMark: 10, defaultLanguage: 'fr',
      feeGateEnabled: true, currency: 'XOF',
    },
    brandingSettings: { primaryColor: '#f97316', secondaryColor: '#0f766e', accentColor: '#ea580c' },
    isActive: true,
    status: 'ACTIVE' as any,
  };
  const existingInst = await prisma.institution.findFirst({ orderBy: { createdAt: 'asc' } });
  const inst = existingInst
    ? await prisma.institution.update({ where: { id: existingInst.id }, data: instData })
    : await prisma.institution.create({ data: instData });
  console.log('✅ Institution:', inst.name, `(id: ${inst.id})`);

  // ── 2. Clean student-related data (safe to re-run) ─────────────────────────
  // Clean ALL institutions' data so stale seed-institution-01 data is also removed
  await prisma.grade.deleteMany({});
  await prisma.gradeFiche.deleteMany({});
  await prisma.notificationLog.deleteMany({});
  await prisma.reportCard.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.studentFee.deleteMany({});
  await prisma.classStudent.deleteMany({});
  await prisma.timetableSlot.deleteMany({});
  await prisma.bulletin.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.courseMaterial.deleteMany({});
  await prisma.subjectHoursLog.deleteMany({});
  await prisma.subscriptionPayment.deleteMany({});
  await prisma.schoolDocument.deleteMany({});
  await prisma.libraryLoan.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.assignmentSubmission.deleteMany({});
  await prisma.quizAnswer.deleteMany({});
  await prisma.quizAttempt.deleteMany({});
  await prisma.quiz.deleteMany({});
  await prisma.assignment.deleteMany({});
  await prisma.mockExamGrade.deleteMany({});
  await prisma.mockExamSubjectFiche.deleteMany({});
  await prisma.mockExam.deleteMany({});
  await prisma.paymentIntent.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.disciplinaryRecord.deleteMany({});
  await prisma.alumniRecord.deleteMany({});
  await prisma.studentTransfer.deleteMany({});
  await prisma.nationalExamResult.deleteMany({});
  await prisma.healthRecord.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.user.deleteMany({ where: { role: 'STUDENT' } });
  // Remove stale seed classes (by fixed IDs) so upserts below re-create under the correct institution
  const seedClassIds = ['seed-class-6a','seed-class-3b','seed-class-2a','seed-class-tle-d'];
  await prisma.classSubject.deleteMany({ where: { classId: { in: seedClassIds } } });
  await prisma.programChapter.deleteMany({});
  await prisma.subjectProgram.deleteMany({});
  await prisma.class.deleteMany({ where: { id: { in: seedClassIds } } });
  // Remove the stale demo institution (seed-institution-01) and all its remaining data
  // Skip if the active institution IS seed-institution-01 to prevent self-deletion
  const staleId = 'seed-institution-01';
  if (inst.id !== staleId) {
    await prisma.fee.deleteMany({ where: { institutionId: staleId } });
    await prisma.subject.deleteMany({ where: { institutionId: staleId } });
    await prisma.user.deleteMany({ where: { institutionId: staleId } });
    await prisma.institution.deleteMany({ where: { id: staleId } });
  }
  console.log('🗑️  Cleaned student data');

  // ── 3. Passwords ────────────────────────────────────────────────────────────
  const [adminPw, teacherPw, bursarPw, parentPw, studentPw] = await Promise.all([
    hash('Admin@123'), hash('Teacher@123'), hash('Bursar@123'), hash('Parent@123'), hash('Student@123'),
  ]);

  // ── 4. Staff users — always update password so logins work after re-seed ────
  const adminData = { password: adminPw, name: 'Admin Principal', role: 'ADMIN' as const, institutionId: inst.id };
  const admin = await prisma.user.upsert({ where: { email: 'admin@demo.novabulletin.local' }, update: { password: adminPw, institutionId: inst.id, isActive: true }, create: { email: 'admin@demo.novabulletin.local', ...adminData } });
  const t1 = await prisma.user.upsert({ where: { email: 'kofi.agbesi@demo.novabulletin.local' }, update: { password: teacherPw, institutionId: inst.id, isActive: true }, create: { email: 'kofi.agbesi@demo.novabulletin.local', password: teacherPw, name: 'Kofi Agbesi', role: 'TEACHER', institutionId: inst.id, whatsappNumber: '+22890111111' } });
  const t2 = await prisma.user.upsert({ where: { email: 'ama.dossou@demo.novabulletin.local' }, update: { password: teacherPw, institutionId: inst.id, isActive: true }, create: { email: 'ama.dossou@demo.novabulletin.local', password: teacherPw, name: 'Ama Dossou', role: 'TEACHER', institutionId: inst.id, whatsappNumber: '+22890222222' } });
  const t3 = await prisma.user.upsert({ where: { email: 'edem.kpodo@demo.novabulletin.local' }, update: { password: teacherPw, institutionId: inst.id, isActive: true }, create: { email: 'edem.kpodo@demo.novabulletin.local', password: teacherPw, name: 'Edem Kpodo', role: 'TEACHER', institutionId: inst.id, whatsappNumber: '+22890333333' } });
  const t4 = await prisma.user.upsert({ where: { email: 'akosua.lawson@demo.novabulletin.local' }, update: { password: teacherPw, institutionId: inst.id, isActive: true }, create: { email: 'akosua.lawson@demo.novabulletin.local', password: teacherPw, name: 'Akosua Lawson', role: 'TEACHER', institutionId: inst.id, whatsappNumber: '+22890444444' } });
  await prisma.user.upsert({ where: { email: 'bursar@demo.novabulletin.local' }, update: { password: bursarPw, institutionId: inst.id, isActive: true }, create: { email: 'bursar@demo.novabulletin.local', password: bursarPw, name: 'Mensah Abla', role: 'BURSAR', institutionId: inst.id } });

  const parents = await Promise.all([
    prisma.user.upsert({ where: { email: 'parent.edem@demo.novabulletin.local' },    update: { password: parentPw, institutionId: inst.id }, create: { email: 'parent.edem@demo.novabulletin.local',    password: parentPw, name: 'Edem Sossah',     role: 'PARENT', institutionId: inst.id, whatsappNumber: '+22890500001' } }),
    prisma.user.upsert({ where: { email: 'parent.akua@demo.novabulletin.local' },    update: { password: parentPw, institutionId: inst.id }, create: { email: 'parent.akua@demo.novabulletin.local',    password: parentPw, name: 'Akua Mensah',     role: 'PARENT', institutionId: inst.id, whatsappNumber: '+22890500002' } }),
    prisma.user.upsert({ where: { email: 'parent.kodjo@demo.novabulletin.local' },   update: { password: parentPw, institutionId: inst.id }, create: { email: 'parent.kodjo@demo.novabulletin.local',   password: parentPw, name: 'Kodjo Agbevor',  role: 'PARENT', institutionId: inst.id, whatsappNumber: '+22890500003' } }),
    prisma.user.upsert({ where: { email: 'parent.yawa@demo.novabulletin.local' },    update: { password: parentPw, institutionId: inst.id }, create: { email: 'parent.yawa@demo.novabulletin.local',    password: parentPw, name: 'Yawa Tetteh',     role: 'PARENT', institutionId: inst.id, whatsappNumber: '+22890500004' } }),
    prisma.user.upsert({ where: { email: 'parent.kokou@demo.novabulletin.local' },   update: { password: parentPw, institutionId: inst.id }, create: { email: 'parent.kokou@demo.novabulletin.local',   password: parentPw, name: 'Kokou Amavi',    role: 'PARENT', institutionId: inst.id, whatsappNumber: '+22890500005' } }),
    prisma.user.upsert({ where: { email: 'parent.afua@demo.novabulletin.local' },    update: { password: parentPw, institutionId: inst.id }, create: { email: 'parent.afua@demo.novabulletin.local',    password: parentPw, name: 'Afua Lalle',     role: 'PARENT', institutionId: inst.id, whatsappNumber: '+22890500006' } }),
  ]);
  console.log('✅ Staff & parents');

  // ── 5. Subjects ─────────────────────────────────────────────────────────────
  const subDefs = [
    { code: 'MATH',  nameFr: 'Mathématiques',       nameEn: 'Mathematics',        category: 'Sciences',          passMark: 10 },
    { code: 'PC',    nameFr: 'Physique-Chimie',      nameEn: 'Physics-Chemistry',  category: 'Sciences',          passMark: 10 },
    { code: 'SVT',   nameFr: 'Sciences de la Vie',   nameEn: 'Life Sciences',      category: 'Sciences',          passMark: 10 },
    { code: 'FR',    nameFr: 'Français',             nameEn: 'French',             category: 'Lettres',           passMark: 10 },
    { code: 'ANGL',  nameFr: 'Anglais',              nameEn: 'English',            category: 'Lettres',           passMark: 10 },
    { code: 'HIST',  nameFr: 'Histoire-Géographie',  nameEn: 'History-Geography',  category: 'Sciences Sociales', passMark: 10 },
    { code: 'PHILO', nameFr: 'Philosophie',          nameEn: 'Philosophy',         category: 'Lettres',           passMark: 10 },
    { code: 'EPS',   nameFr: 'Éducation Physique',   nameEn: 'Physical Education', category: 'EPS',               passMark: 10 },
    { code: 'ECON',  nameFr: 'Économie',             nameEn: 'Economics',          category: 'Sciences Sociales', passMark: 10 },
  ];
  const subs: Record<string, any> = {};
  for (const s of subDefs) {
    subs[s.code] = await prisma.subject.upsert({
      where: { institutionId_code: { institutionId: inst.id, code: s.code } },
      update: {},
      create: { ...s, institutionId: inst.id },
    });
  }
  console.log('✅ Subjects');

  // ── 6. Classes ──────────────────────────────────────────────────────────────
  const class6A   = await prisma.class.upsert({ where: { id: 'seed-class-6a'    }, update: { teacherId: t1.id }, create: { id: 'seed-class-6a',     name: '6ème A',      level: '6eme',      section: 'A', capacity: 55, academicYear: '2024-2025', room: 'Salle 01', institutionId: inst.id, teacherId: t1.id } });
  const class3B   = await prisma.class.upsert({ where: { id: 'seed-class-3b'    }, update: { teacherId: t3.id }, create: { id: 'seed-class-3b',     name: '3ème B',      level: '3eme',      section: 'B', capacity: 55, academicYear: '2024-2025', room: 'Salle 06', institutionId: inst.id, teacherId: t3.id } });
  const class2A   = await prisma.class.upsert({ where: { id: 'seed-class-2a'    }, update: { teacherId: t4.id }, create: { id: 'seed-class-2a',     name: '2nde A',      level: '2nde',      section: 'A', capacity: 55, academicYear: '2024-2025', room: 'Salle 09', institutionId: inst.id, teacherId: t4.id } });
  const classTleD = await prisma.class.upsert({ where: { id: 'seed-class-tle-d' }, update: { teacherId: t2.id }, create: { id: 'seed-class-tle-d', name: 'Terminale D', level: 'Terminale', series: 'D', capacity: 55, academicYear: '2024-2025', room: 'Salle 12', institutionId: inst.id, teacherId: t2.id } });
  console.log('✅ Classes');

  // ── 7. Class subjects & coefficients ────────────────────────────────────────
  const classCfg: { cls: any; teacher: any; codes: string[]; coefs: Record<string, number> }[] = [
    { cls: class6A,   teacher: t1, codes: ['MATH','PC','SVT','FR','ANGL','HIST','EPS'],               coefs: { MATH:4, PC:3, SVT:3, FR:4, ANGL:3, HIST:2, EPS:2 } },
    { cls: class3B,   teacher: t3, codes: ['MATH','PC','SVT','FR','ANGL','HIST','EPS'],               coefs: { MATH:4, PC:3, SVT:3, FR:4, ANGL:3, HIST:2, EPS:2 } },
    { cls: class2A,   teacher: t4, codes: ['MATH','FR','ANGL','HIST','PHILO','ECON','EPS'],           coefs: { MATH:2, FR:5, ANGL:3, HIST:4, PHILO:2, ECON:2, EPS:2 } },
    { cls: classTleD, teacher: t2, codes: ['MATH','PC','SVT','FR','ANGL','HIST','PHILO','EPS','ECON'],coefs: { MATH:7, PC:6, SVT:5, FR:3, ANGL:3, HIST:2, PHILO:3, EPS:2, ECON:2 } },
  ];

  for (const { cls, teacher, codes } of classCfg) {
    for (const code of codes) {
      await prisma.classSubject.upsert({
        where: { classId_subjectId: { classId: cls.id, subjectId: subs[code].id } },
        update: { teacherId: teacher.id },
        create: { classId: cls.id, subjectId: subs[code].id, teacherId: teacher.id },
      });
    }
  }
  console.log('✅ Class subjects');

  // ── 8. Students (50 per class = 200 total) ──────────────────────────────────
  const AY = '2024-2025';

  async function createStudents(defs: ReturnType<typeof makeDefs>, classId: string) {
    await prisma.$disconnect();
    await prisma.$connect();
    try { await basePrisma.$executeRawUnsafe('SET statement_timeout = 0'); } catch (_) {}

    const users = await (prisma.user as any).createManyAndReturn({
      data: defs.map(d => ({ email: d.email, password: studentPw, name: d.name, role: 'STUDENT', institutionId: inst.id })),
    });

    const students = await (prisma.student as any).createManyAndReturn({
      data: defs.map((d, i) => ({ admissionNumber: d.admission, dateOfBirth: new Date(d.dob), sex: d.sex, institutionId: inst.id, userId: users[i].id, parentId: parents[d.pi].id })),
    });

    await prisma.classStudent.createMany({
      data: students.map((s: any) => ({ classId, studentId: s.id, academicYear: AY })),
    });

    return students;
  }

  const s6A   = await createStudents(makeDefs('6A',  2012), class6A.id);
  console.log(`  ↳ 6A done (${s6A.length})`);
  const s3B   = await createStudents(makeDefs('3B',  2009), class3B.id);
  console.log(`  ↳ 3B done (${s3B.length})`);
  const s2A   = await createStudents(makeDefs('2A',  2007), class2A.id);
  console.log(`  ↳ 2A done (${s2A.length})`);
  const sTleD = await createStudents(makeDefs('TLD', 2005), classTleD.id);
  console.log(`  ↳ TleD done (${sTleD.length})`);
  console.log(`✅ Students: ${s6A.length + s3B.length + s2A.length + sTleD.length} total (50 × 4 classes)`);

  // ── 9. Fees & payments ───────────────────────────────────────────────────────
  await prisma.$disconnect();
  await prisma.$connect();
  const fees = {
    '6eme':      await prisma.fee.upsert({ where: { id: 'seed-fee-6e-t1'  }, update: {}, create: { id: 'seed-fee-6e-t1',  name: 'Scolarité 6ème T1',      feeType: 'TUITION', amount: 45000, currency: 'XOF', academicYear: AY, term: '1er Trimestre', appliesToLevel: '6eme',      institutionId: inst.id } }),
    '3eme':      await prisma.fee.upsert({ where: { id: 'seed-fee-3e-t1'  }, update: {}, create: { id: 'seed-fee-3e-t1',  name: 'Scolarité 3ème T1',      feeType: 'TUITION', amount: 50000, currency: 'XOF', academicYear: AY, term: '1er Trimestre', appliesToLevel: '3eme',      institutionId: inst.id } }),
    '2nde':      await prisma.fee.upsert({ where: { id: 'seed-fee-2a-t1'  }, update: {}, create: { id: 'seed-fee-2a-t1',  name: 'Scolarité 2nde T1',      feeType: 'TUITION', amount: 52000, currency: 'XOF', academicYear: AY, term: '1er Trimestre', appliesToLevel: '2nde',      institutionId: inst.id } }),
    'Terminale': await prisma.fee.upsert({ where: { id: 'seed-fee-tle-t1' }, update: {}, create: { id: 'seed-fee-tle-t1', name: 'Scolarité Terminale T1',  feeType: 'TUITION', amount: 55000, currency: 'XOF', academicYear: AY, term: '1er Trimestre', appliesToLevel: 'Terminale', institutionId: inst.id } }),
    'inscr':     await prisma.fee.upsert({ where: { id: 'seed-fee-inscr'  }, update: {}, create: { id: 'seed-fee-inscr',  name: "Inscription 2024-2025",   feeType: 'REGISTRATION', amount: 15000, currency: 'XOF', academicYear: AY, institutionId: inst.id } }),
  };

  const studentFeeRows: any[] = [];
  const paymentRows: any[] = [];
  let recSeq = 1;

  function collectFee(studentId: string, fee: any, paid: boolean) {
    studentFeeRows.push({ studentId, feeId: fee.id, academicYear: AY, term: fee.term ?? '1er Trimestre', amountDue: fee.amount });
    if (paid) {
      paymentRows.push({ receiptNumber: `REC-2024-${String(recSeq++).padStart(4,'0')}`, studentId, academicYear: AY, term: fee.term ?? '1er Trimestre', amount: fee.amount, paymentMethod: 'CASH', paymentDate: new Date('2024-10-10'), recordedById: admin.id, institutionId: inst.id });
    }
  }

  // 6ème A: 42/50 paid, 3ème B: 47/50 paid, 2nde A: 45/50 paid, Terminale D: 48/50 paid
  for (let i = 0; i < s6A.length; i++)   collectFee(s6A[i].id,   fees['6eme'],      i < 42);
  for (let i = 0; i < s3B.length; i++)   collectFee(s3B[i].id,   fees['3eme'],      i < 47);
  for (let i = 0; i < s2A.length; i++)   collectFee(s2A[i].id,   fees['2nde'],      i < 45);
  for (let i = 0; i < sTleD.length; i++) collectFee(sTleD[i].id, fees['Terminale'], i < 48);

  await prisma.studentFee.createMany({ data: studentFeeRows });
  await prisma.payment.createMany({ data: paymentRows });
  console.log('✅ Fees & payments');

  // ── 10. Report cards + grades ────────────────────────────────────────────────
  await prisma.$disconnect();
  await prisma.$connect();
  async function seedTerm(
    students: any[], classId: string, codes: string[], coefs: Record<string,number>,
    teacher: any, termNumber: number, termName: string, publishedAt: Date,
  ) {
    const total = students.length;
    // Compute all averages first (for class stats + ranking)
    const computed = students.map((s, si) => {
      const level = lvl(si, total);
      let totalW = 0, totalC = 0;
      const gradeData = codes.map((code, sj) => {
        const gr = makeGrade(si, sj, level);
        const moy = calcMoy(gr.i1, gr.i2, gr.devoir, gr.compo);
        totalW += moy * coefs[code];
        totalC += coefs[code];
        return { code, ...gr, moy };
      });
      const avg = Math.round((totalW / totalC) * 100) / 100;
      return { s, gradeData, avg };
    });

    const avgs    = computed.map(c => c.avg);
    const sorted  = [...avgs].sort((a, b) => b - a);
    const highest = sorted[0];
    const lowest  = sorted[sorted.length - 1];
    const classAvg = Math.round(avgs.reduce((s, v) => s + v, 0) / avgs.length * 100) / 100;

    const rcData = computed.map(({ s, avg }, i) => ({
      studentId: s.id, classId, academicYear: AY,
      termType: 'TRIMESTRE', termNumber, termName,
      status: 'PUBLISHED', publishedAt,
      overallAverage: avg, classRank: sorted.indexOf(avg) + 1, classSize: total,
      classHighest: highest, classLowest: lowest, classAverage: classAvg,
      mention: ment(avg), conductRating: conduct(avg),
      attendanceDays: 60, attendancePresent: 60 - (i % 5),
      attendanceLate: i % 3, attendanceAbsent: (i % 4 === 0) ? 1 : 0,
      teacherComment: avg >= 14 ? 'Excellent travail, continuez sur cette lancée.' : avg >= 10 ? 'Des efforts encourageants, il faut persévérer.' : 'Des progrès importants sont nécessaires.',
      principalComment: avg >= 16 ? "Tableau d'honneur. Félicitations du conseil." : "Bon trimestre dans l'ensemble.",
      honorCouncil: avg >= 16,
      createdById: teacher.id,
    }));

    const createdRCs = await (prisma.reportCard as any).createManyAndReturn({ data: rcData });

    const gradeRows: any[] = [];
    for (let i = 0; i < computed.length; i++) {
      const { gradeData } = computed[i];
      const rcId = createdRCs[i].id;
      for (const gd of gradeData) {
        gradeRows.push({
          reportCardId: rcId, subjectId: subs[gd.code].id,
          noteInterro1: gd.i1, noteInterro2: gd.i2, noteDevoir: gd.devoir, noteComposition: gd.compo,
          moyenneMatiere: gd.moy, score: gd.moy, coefficient: coefs[gd.code],
          weightedScore: Math.round(gd.moy * coefs[gd.code] * 100) / 100,
          appreciation: appr(gd.moy), teacherName: teacher.name,
        });
      }
    }
    await prisma.grade.createMany({ data: gradeRows });
    return computed.length;
  }

  const t1Name = '1er Trimestre'; const t1Date = new Date('2024-12-20');
  const t2Name = '2ème Trimestre'; const t2Date = new Date('2025-04-05');
  const t3Name = '3ème Trimestre'; const t3Date = new Date('2025-07-10');

  // T1 — all 4 classes
  for (const { cls, teacher, codes, coefs } of classCfg) {
    const students = cls.id === class6A.id ? s6A : cls.id === class3B.id ? s3B : cls.id === class2A.id ? s2A : sTleD;
    await seedTerm(students, cls.id, codes, coefs, teacher, 1, t1Name, t1Date);
  }
  console.log('✅ Report cards T1 (200 students)');

  // T2 — Terminale D + 3ème B
  await prisma.$disconnect(); await prisma.$connect();
  await seedTerm(sTleD, classTleD.id, classCfg[3].codes, classCfg[3].coefs, t2, 2, t2Name, t2Date);
  await seedTerm(s3B,   class3B.id,   classCfg[1].codes, classCfg[1].coefs, t3, 2, t2Name, t2Date);
  console.log('✅ Report cards T2 (Terminale D + 3ème B)');

  // T3 — Terminale D only (bac prep)
  await prisma.$disconnect(); await prisma.$connect();
  await seedTerm(sTleD, classTleD.id, classCfg[3].codes, classCfg[3].coefs, t2, 3, t3Name, t3Date);
  console.log('✅ Report cards T3 (Terminale D)');

  // ── 11. Fiches de notes (GradeFiche) ─────────────────────────────────────────
  await prisma.$disconnect();
  await prisma.$connect();
  // T1: all 4 classes, all signed
  // T2: Terminale D (all signed), 3ème B (6/7 signed), 2nde A (not yet)
  // T3: Terminale D (all signed — bac prep done)

  async function seedFiches(classId: string, codes: string[], teacher: any, termNumber: number, termName: string, signedCount: number) {
    const rows = codes.map((code, i) => ({
      classId, subjectId: subs[code].id, academicYear: AY, termNumber, termName,
      signedAt:     i < signedCount ? new Date(`2024-12-${15 + (i % 5)}`) : null,
      signedByName: i < signedCount ? teacher.name : null,
      signedById:   i < signedCount ? teacher.id   : null,
    }));
    await prisma.gradeFiche.createMany({ data: rows });
  }

  // T1 — all 4 classes, fully signed
  for (const { cls, teacher, codes } of classCfg) {
    await seedFiches(cls.id, codes, teacher, 1, t1Name, codes.length);
  }
  // T2 — Terminale D (9/9 signed), 3ème B (6/7 signed), 2nde A (0 signed), 6ème A (0 signed)
  await seedFiches(classTleD.id, classCfg[3].codes, t2, 2, t2Name, 9);
  await seedFiches(class3B.id,   classCfg[1].codes, t3, 2, t2Name, 6);
  await seedFiches(class2A.id,   classCfg[2].codes, t4, 2, t2Name, 0);
  await seedFiches(class6A.id,   classCfg[0].codes, t1, 2, t2Name, 0);
  // T3 — Terminale D (all 9 signed), rest unsigned
  await seedFiches(classTleD.id, classCfg[3].codes, t2, 3, t3Name, 9);
  await seedFiches(class3B.id,   classCfg[1].codes, t3, 3, t3Name, 0);
  await seedFiches(class2A.id,   classCfg[2].codes, t4, 3, t3Name, 0);
  await seedFiches(class6A.id,   classCfg[0].codes, t1, 3, t3Name, 0);
  console.log('✅ Fiches de notes (3 trimestres × 4 classes)');

  // ── 12. Timetables ───────────────────────────────────────────────────────────
  const S = (code: string) => subs[code].id;

  // 6ème A
  await prisma.timetableSlot.createMany({ data: [
    { classId: class6A.id, institutionId: inst.id, academicYear: AY, subjectId: S('MATH'), teacherId: t1.id, dayOfWeek: 'LUNDI',    startTime: '07:30', endTime: '09:30', room: 'Salle 01' },
    { classId: class6A.id, institutionId: inst.id, academicYear: AY, subjectId: S('FR'),   teacherId: t1.id, dayOfWeek: 'LUNDI',    startTime: '09:30', endTime: '11:00', room: 'Salle 01' },
    { classId: class6A.id, institutionId: inst.id, academicYear: AY, subjectId: S('SVT'),  teacherId: t1.id, dayOfWeek: 'LUNDI',    startTime: '11:15', endTime: '12:15', room: 'Labo 2'   },
    { classId: class6A.id, institutionId: inst.id, academicYear: AY, subjectId: S('ANGL'), teacherId: t1.id, dayOfWeek: 'MARDI',    startTime: '07:30', endTime: '09:00', room: 'Salle 01' },
    { classId: class6A.id, institutionId: inst.id, academicYear: AY, subjectId: S('HIST'), teacherId: t1.id, dayOfWeek: 'MARDI',    startTime: '09:00', endTime: '10:00', room: 'Salle 01' },
    { classId: class6A.id, institutionId: inst.id, academicYear: AY, subjectId: S('EPS'),  teacherId: t1.id, dayOfWeek: 'MARDI',    startTime: '10:15', endTime: '12:15', room: 'Terrain'  },
    { classId: class6A.id, institutionId: inst.id, academicYear: AY, subjectId: S('MATH'), teacherId: t1.id, dayOfWeek: 'MERCREDI', startTime: '07:30', endTime: '09:30', room: 'Salle 01' },
    { classId: class6A.id, institutionId: inst.id, academicYear: AY, subjectId: S('PC'),   teacherId: t1.id, dayOfWeek: 'MERCREDI', startTime: '09:30', endTime: '11:00', room: 'Labo 1'   },
    { classId: class6A.id, institutionId: inst.id, academicYear: AY, subjectId: S('FR'),   teacherId: t1.id, dayOfWeek: 'JEUDI',    startTime: '07:30', endTime: '09:00', room: 'Salle 01' },
    { classId: class6A.id, institutionId: inst.id, academicYear: AY, subjectId: S('PC'),   teacherId: t1.id, dayOfWeek: 'JEUDI',    startTime: '09:00', endTime: '10:30', room: 'Labo 1'   },
    { classId: class6A.id, institutionId: inst.id, academicYear: AY, subjectId: S('HIST'), teacherId: t1.id, dayOfWeek: 'JEUDI',    startTime: '10:30', endTime: '11:30', room: 'Salle 01' },
    { classId: class6A.id, institutionId: inst.id, academicYear: AY, subjectId: S('SVT'),  teacherId: t1.id, dayOfWeek: 'VENDREDI', startTime: '07:30', endTime: '09:00', room: 'Labo 2'   },
    { classId: class6A.id, institutionId: inst.id, academicYear: AY, subjectId: S('ANGL'), teacherId: t1.id, dayOfWeek: 'VENDREDI', startTime: '09:00', endTime: '10:30', room: 'Salle 01' },
    { classId: class6A.id, institutionId: inst.id, academicYear: AY, subjectId: S('MATH'), teacherId: t1.id, dayOfWeek: 'VENDREDI', startTime: '10:30', endTime: '12:00', room: 'Salle 01' },
    { classId: class6A.id, institutionId: inst.id, academicYear: AY, subjectId: S('FR'),   teacherId: t1.id, dayOfWeek: 'SAMEDI',   startTime: '07:30', endTime: '09:00', room: 'Salle 01' },
    { classId: class6A.id, institutionId: inst.id, academicYear: AY, subjectId: S('EPS'),  teacherId: t1.id, dayOfWeek: 'SAMEDI',   startTime: '09:00', endTime: '11:00', room: 'Terrain'  },
  ]});

  // 3ème B
  await prisma.timetableSlot.createMany({ data: [
    { classId: class3B.id, institutionId: inst.id, academicYear: AY, subjectId: S('MATH'), teacherId: t3.id, dayOfWeek: 'LUNDI',    startTime: '07:30', endTime: '09:30', room: 'Salle 06' },
    { classId: class3B.id, institutionId: inst.id, academicYear: AY, subjectId: S('PC'),   teacherId: t3.id, dayOfWeek: 'LUNDI',    startTime: '09:30', endTime: '11:00', room: 'Labo 1'   },
    { classId: class3B.id, institutionId: inst.id, academicYear: AY, subjectId: S('SVT'),  teacherId: t3.id, dayOfWeek: 'LUNDI',    startTime: '11:15', endTime: '12:15', room: 'Labo 2'   },
    { classId: class3B.id, institutionId: inst.id, academicYear: AY, subjectId: S('FR'),   teacherId: t3.id, dayOfWeek: 'MARDI',    startTime: '07:30', endTime: '09:00', room: 'Salle 06' },
    { classId: class3B.id, institutionId: inst.id, academicYear: AY, subjectId: S('HIST'), teacherId: t3.id, dayOfWeek: 'MARDI',    startTime: '09:00', endTime: '10:00', room: 'Salle 06' },
    { classId: class3B.id, institutionId: inst.id, academicYear: AY, subjectId: S('ANGL'), teacherId: t3.id, dayOfWeek: 'MARDI',    startTime: '10:15', endTime: '11:45', room: 'Salle 06' },
    { classId: class3B.id, institutionId: inst.id, academicYear: AY, subjectId: S('MATH'), teacherId: t3.id, dayOfWeek: 'MERCREDI', startTime: '07:30', endTime: '09:30', room: 'Salle 06' },
    { classId: class3B.id, institutionId: inst.id, academicYear: AY, subjectId: S('EPS'),  teacherId: t3.id, dayOfWeek: 'MERCREDI', startTime: '09:30', endTime: '11:30', room: 'Terrain'  },
    { classId: class3B.id, institutionId: inst.id, academicYear: AY, subjectId: S('PC'),   teacherId: t3.id, dayOfWeek: 'JEUDI',    startTime: '07:30', endTime: '09:30', room: 'Labo 1'   },
    { classId: class3B.id, institutionId: inst.id, academicYear: AY, subjectId: S('SVT'),  teacherId: t3.id, dayOfWeek: 'JEUDI',    startTime: '09:30', endTime: '10:30', room: 'Labo 2'   },
    { classId: class3B.id, institutionId: inst.id, academicYear: AY, subjectId: S('HIST'), teacherId: t3.id, dayOfWeek: 'JEUDI',    startTime: '10:45', endTime: '11:45', room: 'Salle 06' },
    { classId: class3B.id, institutionId: inst.id, academicYear: AY, subjectId: S('ANGL'), teacherId: t3.id, dayOfWeek: 'VENDREDI', startTime: '07:30', endTime: '09:00', room: 'Salle 06' },
    { classId: class3B.id, institutionId: inst.id, academicYear: AY, subjectId: S('FR'),   teacherId: t3.id, dayOfWeek: 'VENDREDI', startTime: '09:00', endTime: '10:30', room: 'Salle 06' },
    { classId: class3B.id, institutionId: inst.id, academicYear: AY, subjectId: S('MATH'), teacherId: t3.id, dayOfWeek: 'VENDREDI', startTime: '10:30', endTime: '12:00', room: 'Salle 06' },
    { classId: class3B.id, institutionId: inst.id, academicYear: AY, subjectId: S('EPS'),  teacherId: t3.id, dayOfWeek: 'SAMEDI',   startTime: '07:30', endTime: '09:30', room: 'Terrain'  },
  ]});

  // 2nde A
  await prisma.timetableSlot.createMany({ data: [
    { classId: class2A.id, institutionId: inst.id, academicYear: AY, subjectId: S('FR'),    teacherId: t4.id, dayOfWeek: 'LUNDI',    startTime: '07:30', endTime: '09:30', room: 'Salle 09' },
    { classId: class2A.id, institutionId: inst.id, academicYear: AY, subjectId: S('HIST'),  teacherId: t4.id, dayOfWeek: 'LUNDI',    startTime: '09:30', endTime: '11:30', room: 'Salle 09' },
    { classId: class2A.id, institutionId: inst.id, academicYear: AY, subjectId: S('ANGL'),  teacherId: t4.id, dayOfWeek: 'LUNDI',    startTime: '11:30', endTime: '12:30', room: 'Salle 09' },
    { classId: class2A.id, institutionId: inst.id, academicYear: AY, subjectId: S('MATH'),  teacherId: t4.id, dayOfWeek: 'MARDI',    startTime: '07:30', endTime: '09:00', room: 'Salle 09' },
    { classId: class2A.id, institutionId: inst.id, academicYear: AY, subjectId: S('PHILO'), teacherId: t4.id, dayOfWeek: 'MARDI',    startTime: '09:00', endTime: '11:00', room: 'Salle 09' },
    { classId: class2A.id, institutionId: inst.id, academicYear: AY, subjectId: S('ECON'),  teacherId: t4.id, dayOfWeek: 'MARDI',    startTime: '11:00', endTime: '12:00', room: 'Salle 09' },
    { classId: class2A.id, institutionId: inst.id, academicYear: AY, subjectId: S('FR'),    teacherId: t4.id, dayOfWeek: 'MERCREDI', startTime: '07:30', endTime: '09:30', room: 'Salle 09' },
    { classId: class2A.id, institutionId: inst.id, academicYear: AY, subjectId: S('HIST'),  teacherId: t4.id, dayOfWeek: 'MERCREDI', startTime: '09:30', endTime: '11:00', room: 'Salle 09' },
    { classId: class2A.id, institutionId: inst.id, academicYear: AY, subjectId: S('ANGL'),  teacherId: t4.id, dayOfWeek: 'JEUDI',    startTime: '07:30', endTime: '09:00', room: 'Salle 09' },
    { classId: class2A.id, institutionId: inst.id, academicYear: AY, subjectId: S('PHILO'), teacherId: t4.id, dayOfWeek: 'JEUDI',    startTime: '09:00', endTime: '11:00', room: 'Salle 09' },
    { classId: class2A.id, institutionId: inst.id, academicYear: AY, subjectId: S('ECON'),  teacherId: t4.id, dayOfWeek: 'JEUDI',    startTime: '11:00', endTime: '12:00', room: 'Salle 09' },
    { classId: class2A.id, institutionId: inst.id, academicYear: AY, subjectId: S('MATH'),  teacherId: t4.id, dayOfWeek: 'VENDREDI', startTime: '07:30', endTime: '09:00', room: 'Salle 09' },
    { classId: class2A.id, institutionId: inst.id, academicYear: AY, subjectId: S('FR'),    teacherId: t4.id, dayOfWeek: 'VENDREDI', startTime: '09:00', endTime: '11:00', room: 'Salle 09' },
    { classId: class2A.id, institutionId: inst.id, academicYear: AY, subjectId: S('EPS'),   teacherId: t4.id, dayOfWeek: 'VENDREDI', startTime: '11:00', endTime: '12:30', room: 'Terrain'  },
    { classId: class2A.id, institutionId: inst.id, academicYear: AY, subjectId: S('HIST'),  teacherId: t4.id, dayOfWeek: 'SAMEDI',   startTime: '07:30', endTime: '09:00', room: 'Salle 09' },
    { classId: class2A.id, institutionId: inst.id, academicYear: AY, subjectId: S('ANGL'),  teacherId: t4.id, dayOfWeek: 'SAMEDI',   startTime: '09:00', endTime: '10:30', room: 'Salle 09' },
  ]});

  // Terminale D
  await prisma.timetableSlot.createMany({ data: [
    { classId: classTleD.id, institutionId: inst.id, academicYear: AY, subjectId: S('MATH'),  teacherId: t2.id, dayOfWeek: 'LUNDI',    startTime: '07:30', endTime: '09:30', room: 'Salle 12' },
    { classId: classTleD.id, institutionId: inst.id, academicYear: AY, subjectId: S('PC'),    teacherId: t2.id, dayOfWeek: 'LUNDI',    startTime: '09:30', endTime: '11:30', room: 'Labo 1'   },
    { classId: classTleD.id, institutionId: inst.id, academicYear: AY, subjectId: S('ANGL'),  teacherId: t2.id, dayOfWeek: 'LUNDI',    startTime: '11:30', endTime: '12:30', room: 'Salle 12' },
    { classId: classTleD.id, institutionId: inst.id, academicYear: AY, subjectId: S('SVT'),   teacherId: t2.id, dayOfWeek: 'MARDI',    startTime: '07:30', endTime: '09:30', room: 'Labo 2'   },
    { classId: classTleD.id, institutionId: inst.id, academicYear: AY, subjectId: S('FR'),    teacherId: t2.id, dayOfWeek: 'MARDI',    startTime: '09:30', endTime: '11:00', room: 'Salle 12' },
    { classId: classTleD.id, institutionId: inst.id, academicYear: AY, subjectId: S('PHILO'), teacherId: t2.id, dayOfWeek: 'MARDI',    startTime: '11:15', endTime: '12:15', room: 'Salle 12' },
    { classId: classTleD.id, institutionId: inst.id, academicYear: AY, subjectId: S('MATH'),  teacherId: t2.id, dayOfWeek: 'MERCREDI', startTime: '07:30', endTime: '09:30', room: 'Salle 12' },
    { classId: classTleD.id, institutionId: inst.id, academicYear: AY, subjectId: S('PC'),    teacherId: t2.id, dayOfWeek: 'MERCREDI', startTime: '09:30', endTime: '11:30', room: 'Labo 1'   },
    { classId: classTleD.id, institutionId: inst.id, academicYear: AY, subjectId: S('SVT'),   teacherId: t2.id, dayOfWeek: 'MERCREDI', startTime: '11:30', endTime: '12:30', room: 'Labo 2'   },
    { classId: classTleD.id, institutionId: inst.id, academicYear: AY, subjectId: S('HIST'),  teacherId: t2.id, dayOfWeek: 'JEUDI',    startTime: '07:30', endTime: '09:00', room: 'Salle 12' },
    { classId: classTleD.id, institutionId: inst.id, academicYear: AY, subjectId: S('ECON'),  teacherId: t2.id, dayOfWeek: 'JEUDI',    startTime: '09:00', endTime: '10:30', room: 'Salle 12' },
    { classId: classTleD.id, institutionId: inst.id, academicYear: AY, subjectId: S('EPS'),   teacherId: t2.id, dayOfWeek: 'JEUDI',    startTime: '10:30', endTime: '12:30', room: 'Terrain'  },
    { classId: classTleD.id, institutionId: inst.id, academicYear: AY, subjectId: S('MATH'),  teacherId: t2.id, dayOfWeek: 'VENDREDI', startTime: '07:30', endTime: '09:30', room: 'Salle 12' },
    { classId: classTleD.id, institutionId: inst.id, academicYear: AY, subjectId: S('PHILO'), teacherId: t2.id, dayOfWeek: 'VENDREDI', startTime: '09:30', endTime: '11:00', room: 'Salle 12' },
    { classId: classTleD.id, institutionId: inst.id, academicYear: AY, subjectId: S('FR'),    teacherId: t2.id, dayOfWeek: 'VENDREDI', startTime: '11:00', endTime: '12:00', room: 'Salle 12' },
    { classId: classTleD.id, institutionId: inst.id, academicYear: AY, subjectId: S('ANGL'),  teacherId: t2.id, dayOfWeek: 'SAMEDI',   startTime: '07:30', endTime: '09:00', room: 'Salle 12' },
    { classId: classTleD.id, institutionId: inst.id, academicYear: AY, subjectId: S('ECON'),  teacherId: t2.id, dayOfWeek: 'SAMEDI',   startTime: '09:00', endTime: '10:30', room: 'Salle 12' },
  ]});
  console.log('✅ Timetables (4 classes)');

  // ── 13. Bulletins (announcements) ────────────────────────────────────────────
  const bulletins = [
    { title: 'Bienvenue à la rentrée scolaire 2024-2025', type: 'ANNOUNCEMENT', audience: 'ALL', content: "Chers élèves, parents et membres du personnel,\n\nNous avons le plaisir de vous accueillir pour l'année scolaire 2024-2025. Cette nouvelle année est une opportunité de grandir, d'apprendre et de donner le meilleur de vous-même.\n\nLe calendrier scolaire est disponible auprès de l'administration. Les cours débutent le lundi 16 septembre 2024.\n\nBonne rentrée à tous !", publishedAt: new Date('2024-09-14') },
    { title: 'Réunion des parents — 1er Trimestre', type: 'MEETING', audience: 'PARENT', content: "Chers parents,\n\nNous vous invitons à la réunion de parents du 1er trimestre qui se tiendra le samedi 19 octobre 2024 à partir de 9h00 dans la grande salle.\n\nÀ l'ordre du jour :\n• Présentation des résultats du premier mois\n• Règlement intérieur et assiduité\n• Questions diverses\n\nVotre présence est vivement souhaitée.", publishedAt: new Date('2024-10-10') },
    { title: 'Résultats du 1er Trimestre disponibles', type: 'ANNOUNCEMENT', audience: 'ALL', content: "Les bulletins de notes du 1er trimestre sont désormais disponibles sur la plateforme NovaBulletin.\n\nConnectez-vous avec vos identifiants pour consulter les résultats de votre enfant.\n\nLes bulletins ont été envoyés par WhatsApp aux parents ayant fourni un numéro de contact.\n\nPour toute question, contactez l'administration.", publishedAt: new Date('2024-12-22') },
    { title: 'Paiement des frais — 2ème Trimestre', type: 'REMINDER', audience: 'PARENT', content: "Chers parents,\n\nNous vous rappelons que les frais de scolarité du 2ème trimestre sont à régler avant le 15 janvier 2025.\n\nModes de paiement acceptés :\n• Espèces au bureau de la scolarité\n• Mobile Money (T-Money / Flooz)\n• Virement bancaire\n\nLes élèves dont les frais ne sont pas à jour ne pourront pas recevoir leurs bulletins électroniques.\n\nMerci de votre compréhension.", publishedAt: new Date('2025-01-05') },
    { title: 'Tournoi sportif inter-classes — Inscription ouverte', type: 'EVENT', audience: 'ALL', content: "Un grand tournoi sportif inter-classes est organisé du 24 au 28 février 2025.\n\nDisciplines au programme :\n🏀 Basketball  |  ⚽ Football  |  🏐 Volleyball\n\nInscriptions auprès des professeurs d'EPS avant le 10 février 2025.\n\nPrix et récompenses pour les trois premiers de chaque discipline. Montrez l'esprit sportif de votre classe !", publishedAt: new Date('2025-01-20') },
    { title: 'Examens blancs du Baccalauréat — Terminale D', type: 'ANNOUNCEMENT', audience: 'ALL', content: "À l'attention des élèves de Terminale D,\n\nLes examens blancs du baccalauréat se tiendront du 10 au 14 mars 2025.\n\nMatières concernées : Mathématiques, Physique-Chimie, SVT, Français, Anglais, Philosophie.\n\nFeuilles de composition et convocations seront distribuées le 7 mars 2025.\n\nL'administration souhaite à tous les candidats une excellente préparation. Courage !", publishedAt: new Date('2025-02-25') },
    { title: 'Journée culturelle et artistique — 8 mars 2025', type: 'EVENT', audience: 'ALL', content: "À l'occasion de la Journée internationale des droits des femmes, le lycée organise une journée culturelle et artistique le samedi 8 mars 2025.\n\nAu programme :\n🎭 Sketchs et pièces de théâtre\n🎵 Concours de chants traditionnels\n📸 Exposition photos sur la femme togolaise\n\nLes classes sont invitées à présenter une œuvre ou une performance. Inscriptions auprès des délégués de classe avant le 28 février.", publishedAt: new Date('2025-02-15') },
    { title: 'Résultats du 2ème Trimestre — Terminale D & 3ème B', type: 'ANNOUNCEMENT', audience: 'ALL', content: "Les bulletins du 2ème trimestre pour les classes de Terminale D et 3ème B sont disponibles.\n\nFélicitations aux élèves ayant obtenu une moyenne générale supérieure ou égale à 16/20 — ils sont inscrits au tableau d'honneur.\n\nLes bulletins des autres classes suivront dans les prochains jours.\n\nL'administration encourage tous les élèves à poursuivre leurs efforts pour le 3ème trimestre.", publishedAt: new Date('2025-04-08') },
    { title: 'Conseil de discipline — Rappel du règlement intérieur', type: 'ANNOUNCEMENT', audience: 'ALL', content: "Suite à plusieurs incidents survenus ces dernières semaines, la Direction rappelle les points essentiels du règlement intérieur :\n\n• La ponctualité est obligatoire. Tout retard non justifié sera sanctionné.\n• L'utilisation des téléphones portables est interdite en classe.\n• Tout acte de violence ou d'incivilité entraîne une convocation devant le conseil de discipline.\n• L'uniforme scolaire est obligatoire du lundi au vendredi.\n\nNous comptons sur la coopération de tous.", publishedAt: new Date('2025-03-03') },
    { title: 'Préparation au BEPC — 3ème B', type: 'ANNOUNCEMENT', audience: 'ALL', content: "Aux élèves de 3ème B,\n\nLes inscriptions au BEPC (Brevet d'Études du Premier Cycle) sont ouvertes jusqu'au 28 février 2025.\n\nDocuments requis :\n• Extrait de naissance\n• 4 photos d'identité\n• Certificat de scolarité\n• Reçu de paiement des frais d'examen (7 500 FCFA)\n\nDéposez vos dossiers au service scolarité avant la date limite. Aucun dossier incomplet ne sera accepté.", publishedAt: new Date('2025-02-01') },
  ];

  for (const b of bulletins) {
    await prisma.bulletin.create({
      data: {
        title: b.title, content: b.content, type: b.type,
        targetAudience: b.audience, publishedAt: b.publishedAt,
        authorId: admin.id, institutionId: inst.id,
      },
    });
  }
  console.log(`✅ Bulletins (${bulletins.length} annonces)`);

  // ── 14b. Staff profiles ──────────────────────────────────────────────────
  const staffDefs = [
    { userId: t1.id, staffNumber: 'ENS-001', contractType: 'Titulaire', qualification: 'CAPES Mathématiques', specialization: 'Mathématiques & Physique', experienceYears: 8, nationality: 'Togolaise' },
    { userId: t2.id, staffNumber: 'ENS-002', contractType: 'Titulaire', qualification: 'CAPES Sciences', specialization: 'Sciences de la Vie et de la Terre', experienceYears: 6, nationality: 'Togolaise' },
    { userId: t3.id, staffNumber: 'ENS-003', contractType: 'Contractuel', qualification: 'Licence Mathématiques', specialization: 'Mathématiques & Informatique', experienceYears: 4, nationality: 'Togolaise' },
    { userId: t4.id, staffNumber: 'ENS-004', contractType: 'Titulaire', qualification: 'CAPES Lettres Modernes', specialization: 'Français & Philosophie', experienceYears: 10, nationality: 'Togolaise' },
  ];
  for (const sp of staffDefs) {
    await prisma.staffProfile.upsert({
      where: { userId: sp.userId },
      update: {},
      create: { ...sp, institutionId: inst.id, employmentDate: new Date('2020-09-01'), city: 'Lomé', isActive: true },
    });
  }
  console.log('✅ Staff profiles (4 teachers)');

  // ── 14c. Calendar events ─────────────────────────────────────────────────
  await prisma.calendarEvent.deleteMany({ where: { institutionId: inst.id } });
  const calEvents = [
    { title: 'Rentrée scolaire 2024-2025', type: 'EVENT',   startDate: new Date('2024-09-16'), color: '#16a34a', description: 'Début de l\'année scolaire 2024-2025' },
    { title: '1er Trimestre',              type: 'EVENT',   startDate: new Date('2024-09-16'), endDate: new Date('2024-12-20'), color: '#2563eb', description: 'Période du 1er trimestre' },
    { title: 'Vacances Toussaint',         type: 'HOLIDAY', startDate: new Date('2024-10-26'), endDate: new Date('2024-11-03'), color: '#f59e0b' },
    { title: 'Conseils de classe T1',      type: 'MEETING', startDate: new Date('2024-12-16'), endDate: new Date('2024-12-19'), color: '#7c3aed', description: 'Délibérations du 1er trimestre — toutes classes' },
    { title: 'Vacances de Noël',           type: 'HOLIDAY', startDate: new Date('2024-12-21'), endDate: new Date('2025-01-05'), color: '#f59e0b' },
    { title: '2ème Trimestre',             type: 'EVENT',   startDate: new Date('2025-01-06'), endDate: new Date('2025-04-05'), color: '#2563eb', description: 'Période du 2ème trimestre' },
    { title: 'Réunion parents — T1',       type: 'PARENT_MEETING', startDate: new Date('2025-01-18'), color: '#0891b2', description: 'Distribution des bulletins T1 et rencontre parents-professeurs' },
    { title: 'Examens blancs BAC — TleD',  type: 'EXAM',   startDate: new Date('2025-03-10'), endDate: new Date('2025-03-14'), color: '#dc2626', description: 'Examens blancs baccalauréat pour Terminale D' },
    { title: 'Journée culturelle',         type: 'CULTURAL', startDate: new Date('2025-03-08'), color: '#db2777', description: 'Journée internationale des droits des femmes — programme culturel' },
    { title: 'Tournoi sportif inter-classes', type: 'SPORT', startDate: new Date('2025-02-24'), endDate: new Date('2025-02-28'), color: '#ea580c' },
    { title: 'Vacances de Pâques',         type: 'HOLIDAY', startDate: new Date('2025-04-06'), endDate: new Date('2025-04-20'), color: '#f59e0b' },
    { title: '3ème Trimestre',             type: 'EVENT',   startDate: new Date('2025-04-21'), endDate: new Date('2025-07-10'), color: '#2563eb', description: 'Période du 3ème trimestre' },
    { title: 'Conseils de classe T2',      type: 'MEETING', startDate: new Date('2025-04-01'), endDate: new Date('2025-04-04'), color: '#7c3aed' },
    { title: 'BEPC — 3ème B',              type: 'EXAM',   startDate: new Date('2025-06-09'), endDate: new Date('2025-06-13'), color: '#dc2626', description: 'Brevet d\'Études du Premier Cycle' },
    { title: 'Baccalauréat — TleD',        type: 'EXAM',   startDate: new Date('2025-06-16'), endDate: new Date('2025-06-20'), color: '#991b1b', description: 'Examen national du Baccalauréat' },
    { title: 'Conseils de classe T3',      type: 'MEETING', startDate: new Date('2025-07-07'), endDate: new Date('2025-07-09'), color: '#7c3aed' },
    { title: 'Fin d\'année scolaire',      type: 'EVENT',   startDate: new Date('2025-07-11'), color: '#16a34a' },
  ];
  await prisma.calendarEvent.createMany({
    data: calEvents.map(e => ({ ...e, type: e.type as any, institutionId: inst.id, allDay: true, isPublic: true })),
  });
  console.log(`✅ Calendar events (${calEvents.length})`);

  // ── 14d. Subject programs (feuille de route) ─────────────────────────────

  const programDefs: { classId: string; code: string; chapters: { title: string; plan: string; duration: string; isCompleted: boolean }[] }[] = [
    { classId: classTleD.id, code: 'MATH', chapters: [
      { title: 'Fonctions numériques — Limites & Continuité', plan: 'Définition, limites, continuité, théorème des valeurs intermédiaires', duration: '4 semaines', isCompleted: true },
      { title: 'Dérivabilité & Étude de fonctions', plan: 'Dérivée, variations, extrema, courbes', duration: '4 semaines', isCompleted: true },
      { title: 'Primitives & Intégration', plan: 'Primitives usuelles, intégrale de Riemann, aire', duration: '3 semaines', isCompleted: true },
      { title: 'Suites numériques', plan: 'Suites arithmétiques, géométriques, convergence', duration: '3 semaines', isCompleted: false },
      { title: 'Probabilités & Statistiques', plan: 'Probabilités conditionnelles, loi binomiale, espérance', duration: '3 semaines', isCompleted: false },
    ]},
    { classId: classTleD.id, code: 'PC', chapters: [
      { title: 'Mécanique — Lois de Newton', plan: 'Dynamique du point, forces, énergie cinétique', duration: '3 semaines', isCompleted: true },
      { title: 'Oscillations & Ondes', plan: 'Pendule, ressort, ondes mécaniques', duration: '3 semaines', isCompleted: true },
      { title: 'Chimie organique', plan: 'Alcools, acides carboxyliques, estérification', duration: '4 semaines', isCompleted: false },
      { title: 'Électricité — Circuits RC & RL', plan: 'Charge, décharge, régimes transitoires', duration: '3 semaines', isCompleted: false },
    ]},
    { classId: classTleD.id, code: 'SVT', chapters: [
      { title: 'Génétique & Hérédité', plan: 'Lois de Mendel, ADN, mutation, génie génétique', duration: '4 semaines', isCompleted: true },
      { title: 'Immunologie', plan: 'Immunité innée et adaptative, vaccins, SIDA', duration: '3 semaines', isCompleted: true },
      { title: 'Géologie — Tectonique des plaques', plan: 'Dérive des continents, séismes, volcans', duration: '3 semaines', isCompleted: false },
    ]},
    { classId: class3B.id, code: 'MATH', chapters: [
      { title: 'Calcul algébrique', plan: 'Développement, factorisation, équations du 2nd degré', duration: '3 semaines', isCompleted: true },
      { title: 'Géométrie dans l\'espace', plan: 'Plans, droites, sections planes, volumes', duration: '3 semaines', isCompleted: true },
      { title: 'Statistiques & Probabilités', plan: 'Fréquences, moyennes, probabilités simples', duration: '2 semaines', isCompleted: false },
    ]},
    { classId: class3B.id, code: 'FR', chapters: [
      { title: 'Argumentation — Essai et dissertation', plan: 'Thèse, arguments, exemples, plan dialectique', duration: '3 semaines', isCompleted: true },
      { title: 'Littérature africaine', plan: 'Textes de Senghor, Beti, Oyono — analyse et commentaire', duration: '3 semaines', isCompleted: false },
    ]},
    { classId: class6A.id, code: 'MATH', chapters: [
      { title: 'Nombres entiers & décimaux', plan: 'Opérations, fractions, multiples et diviseurs', duration: '3 semaines', isCompleted: true },
      { title: 'Géométrie plane', plan: 'Droites, angles, triangles, quadrilatères, cercles', duration: '3 semaines', isCompleted: true },
      { title: 'Proportionnalité', plan: 'Tableaux de proportionnalité, pourcentages, règle de 3', duration: '2 semaines', isCompleted: false },
    ]},
  ];

  for (const pd of programDefs) {
    const prog = await prisma.subjectProgram.create({
      data: {
        classId: pd.classId,
        subjectId: subs[pd.code].id,
        academicYear: AY,
        description: `Programme de ${subs[pd.code].nameFr} — Année ${AY}`,
      },
    });
    await prisma.programChapter.createMany({
      data: pd.chapters.map((ch, i) => ({ programId: prog.id, order: i + 1, ...ch })),
    });
  }
  console.log(`✅ Subject programs (feuille de route — ${programDefs.length} programmes)`);

  // ── 14e. Assignments (devoirs à rendre) ──────────────────────────────────
  await prisma.assignmentSubmission.deleteMany({});
  await prisma.assignment.deleteMany({ where: { institutionId: inst.id } });

  const assignmentDefs = [
    { classId: classTleD.id, code: 'MATH', title: 'Devoir maison n°1 — Limites et continuité', instructions: 'Résoudre les exercices du fascicule pages 45-47. Présenter une copie double propre.', dueDate: new Date('2025-01-20'), status: 'PUBLISHED' as const, termNumber: 2 },
    { classId: classTleD.id, code: 'PC',   title: 'TP — Oscillateur harmonique', instructions: 'Rédiger un compte-rendu complet du TP réalisé en classe. Inclure schémas, mesures et conclusions.', dueDate: new Date('2025-01-25'), status: 'PUBLISHED' as const, termNumber: 2 },
    { classId: classTleD.id, code: 'FR',   title: 'Commentaire de texte — Senghor', instructions: 'Proposer un commentaire composé du poème "Femme noire" de L.S. Senghor. 3-4 pages.', dueDate: new Date('2025-02-03'), status: 'PUBLISHED' as const, termNumber: 2 },
    { classId: class3B.id,   code: 'MATH', title: 'Exercices — Équations du 2nd degré', instructions: 'Résoudre les 10 équations du polycopié distribué en classe. Montrer toutes les étapes.', dueDate: new Date('2025-01-22'), status: 'PUBLISHED' as const, termNumber: 2 },
    { classId: class3B.id,   code: 'FR',   title: 'Rédaction — Mon ambition professionnelle', instructions: 'Rédiger un texte argumentatif de 300-400 mots sur votre projet professionnel et les étapes pour y parvenir.', dueDate: new Date('2025-02-07'), status: 'PUBLISHED' as const, termNumber: 2 },
    { classId: class6A.id,   code: 'MATH', title: 'Calcul mental — Tables et fractions', instructions: 'Compléter la fiche de calcul mental distribuée. 20 questions, 10 minutes en classe vendredi.', dueDate: new Date('2025-01-17'), status: 'CLOSED' as const, termNumber: 2 },
    { classId: class2A.id,   code: 'HIST', title: 'Exposé — La colonisation en Afrique de l\'Ouest', instructions: 'Par binômes. Présentation orale de 10 minutes + diaporama. Choisir un pays parmi : Togo, Bénin, Côte d\'Ivoire, Sénégal.', dueDate: new Date('2025-02-14'), status: 'PUBLISHED' as const, termNumber: 2 },
    { classId: classTleD.id, code: 'MATH', title: 'Devoir maison n°2 — Suites et probabilités', instructions: 'Exercices complets sur les suites numériques et probabilités conditionnelles. Rendu obligatoire.', dueDate: new Date('2025-03-15'), status: 'DRAFT' as const, termNumber: 3 },
  ];

  for (const a of assignmentDefs) {
    const teacher = classCfg.find(c => c.cls.id === a.classId)?.teacher ?? t1;
    await prisma.assignment.create({
      data: {
        title: a.title, instructions: a.instructions, dueDate: a.dueDate,
        status: a.status, maxScore: 20, termNumber: a.termNumber,
        classId: a.classId, subjectId: subs[a.code].id,
        academicYear: AY, institutionId: inst.id, createdById: teacher.id,
      },
    });
  }
  console.log(`✅ Assignments (${assignmentDefs.length} devoirs)`);

  // ── 14f. Mock exam — Terminale D Examen Blanc ────────────────────────────
  const mockExam = await prisma.mockExam.create({
    data: {
      institutionId: inst.id,
      classId: classTleD.id,
      academicYear: AY,
      examType: 'BLANC',
      label: 'Examen Blanc BAC — Terminale D — Mars 2025',
      examDate: new Date('2025-03-10'),
      examEndDate: new Date('2025-03-14'),
      status: 'PUBLISHED' as any,
      createdById: admin.id,
    },
  });

  // Mock exam grades for Terminale D — all 9 subjects
  const mockGradeRows: any[] = [];
  const mockFicheRows: any[] = [];
  for (const code of classCfg[3].codes) {
    mockFicheRows.push({ mockExamId: mockExam.id, subjectId: subs[code].id, signedAt: new Date('2025-03-15'), signedByName: t2.name, signedById: t2.id });
    for (let si = 0; si < sTleD.length; si++) {
      const gr = makeGrade(si, classCfg[3].codes.indexOf(code), lvl(si, sTleD.length));
      mockGradeRows.push({
        mockExamId: mockExam.id,
        studentId: sTleD[si].id,
        subjectId: subs[code].id,
        score: calcMoy(gr.i1, gr.i2, gr.devoir, gr.compo),
        coefficient: classCfg[3].coefs[code],
      });
    }
  }
  await prisma.mockExamGrade.createMany({ data: mockGradeRows });
  await prisma.mockExamSubjectFiche.createMany({ data: mockFicheRows });
  console.log(`✅ Mock exam (Terminale D — ${mockGradeRows.length} notes)`);

  // ── 14g. Attendance — 20 school days (Oct–Nov 2024, T1) ─────────────────
  const attDates = [
    '2024-10-07','2024-10-08','2024-10-09','2024-10-10','2024-10-11',
    '2024-10-14','2024-10-15','2024-10-16','2024-10-17','2024-10-18',
    '2024-10-21','2024-10-22','2024-10-23','2024-10-24','2024-10-25',
    '2024-10-28','2024-10-29','2024-10-30','2024-10-31','2024-11-04',
  ].map(s => new Date(s));
  // Pattern: ~85% present, occasional LATE/ABSENT/EXCUSED per student-day combo
  const attStatuses = ['PRESENT','PRESENT','PRESENT','PRESENT','PRESENT','PRESENT','PRESENT','PRESENT','PRESENT','PRESENT','PRESENT','PRESENT','LATE','ABSENT','PRESENT','PRESENT','PRESENT','PRESENT','ABSENT','EXCUSED'] as const;
  const attRows: any[] = [];
  for (const { cls, students } of [
    { cls: class6A, students: s6A }, { cls: class3B, students: s3B },
    { cls: class2A, students: s2A }, { cls: classTleD, students: sTleD },
  ]) {
    for (let si = 0; si < students.length; si++) {
      for (let di = 0; di < attDates.length; di++) {
        attRows.push({
          studentId: students[si].id, classId: cls.id,
          institutionId: inst.id, date: attDates[di],
          status: attStatuses[(si * 7 + di * 3) % attStatuses.length],
          recordedBy: admin.id,
        });
      }
    }
  }
  await prisma.attendance.createMany({ data: attRows, skipDuplicates: true });
  console.log(`✅ Attendance (${attRows.length} records, ${attDates.length} days × 200 students)`);

  // ── 14h. Course materials (LMS) ──────────────────────────────────────────
  await prisma.courseMaterial.createMany({
    data: [
      // Terminale D
      { title: 'Cours — Limites et continuité', description: 'Cours complet T2 chapitres 1-3', type: 'DOCUMENT', url: 'https://example.com/docs/math-tled-limites.pdf', classId: classTleD.id, subjectId: subs['MATH'].id, academicYear: AY, termNumber: 2, uploadedById: t1.id, institutionId: inst.id },
      { title: 'Vidéo — Dérivées et primitives', description: 'Tutoriel vidéo 25 min', type: 'VIDEO', url: 'https://www.youtube.com/watch?v=example1', classId: classTleD.id, subjectId: subs['MATH'].id, academicYear: AY, termNumber: 2, uploadedById: t1.id, institutionId: inst.id },
      { title: 'TP numérique — Oscillateur', description: 'Simulation Phet oscillateur harmonique', type: 'LINK', url: 'https://phet.colorado.edu/fr/simulations/pendulum-lab', classId: classTleD.id, subjectId: subs['PC'].id, academicYear: AY, termNumber: 2, uploadedById: t2.id, institutionId: inst.id },
      { title: 'Cours — Génétique moléculaire', description: 'Chapitres ADN, réplication, transcription', type: 'DOCUMENT', url: 'https://example.com/docs/svt-tled-genetique.pdf', classId: classTleD.id, subjectId: subs['SVT'].id, academicYear: AY, termNumber: 2, uploadedById: t2.id, institutionId: inst.id },
      // 3ème B
      { title: 'Fascicule — Équations 2nd degré', description: 'Exercices corrigés niveau BEPC', type: 'DOCUMENT', url: 'https://example.com/docs/math-3b-eq2.pdf', classId: class3B.id, subjectId: subs['MATH'].id, academicYear: AY, termNumber: 2, uploadedById: t3.id, institutionId: inst.id },
      { title: 'Cours — La colonisation', description: 'Histoire Afrique de l\'Ouest 19ème siècle', type: 'DOCUMENT', url: 'https://example.com/docs/hist-3b-colonisation.pdf', classId: class3B.id, subjectId: subs['HIST'].id, academicYear: AY, termNumber: 2, uploadedById: t3.id, institutionId: inst.id },
      // 2nde A
      { title: 'Cours — Phonétique anglaise', description: 'Sons et prononciation niveau 2nde', type: 'LINK', url: 'https://www.bbc.co.uk/learningenglish/sounds', classId: class2A.id, subjectId: subs['ANGL'].id, academicYear: AY, termNumber: 1, uploadedById: t4.id, institutionId: inst.id },
      { title: 'Fiche — Notions d\'économie', description: 'Introduction aux circuits économiques', type: 'DOCUMENT', url: 'https://example.com/docs/econ-2a-intro.pdf', classId: class2A.id, subjectId: subs['ECON'].id, academicYear: AY, termNumber: 1, uploadedById: t4.id, institutionId: inst.id },
      // 6ème A
      { title: 'Cours — Fractions et décimaux', description: 'Notions fondamentales 6ème', type: 'DOCUMENT', url: 'https://example.com/docs/math-6a-fractions.pdf', classId: class6A.id, subjectId: subs['MATH'].id, academicYear: AY, termNumber: 1, uploadedById: t1.id, institutionId: inst.id },
      { title: 'Vidéo — La cellule vivante', description: 'Cours SVT animation 15 min', type: 'VIDEO', url: 'https://www.youtube.com/watch?v=example2', classId: class6A.id, subjectId: subs['SVT'].id, academicYear: AY, termNumber: 1, uploadedById: t1.id, institutionId: inst.id },
    ],
  });
  console.log('✅ Course materials (10 LMS resources)');

  // ── 14i. Assignment submissions ──────────────────────────────────────────
  const allAssignments = await prisma.assignment.findMany({
    where: { institutionId: inst.id, academicYear: AY, status: { in: ['PUBLISHED', 'CLOSED'] as any } },
    select: { id: true, classId: true, maxScore: true },
  });
  const subRows: any[] = [];
  for (const asgn of allAssignments) {
    const students = asgn.classId === classTleD.id ? sTleD
      : asgn.classId === class3B.id  ? s3B
      : asgn.classId === class2A.id  ? s2A : s6A;
    const submitCount = Math.floor(students.length * 0.78);
    for (let si = 0; si < submitCount; si++) {
      const score = si < submitCount * 0.7 ? Math.round((12 + (si % 8)) * 10) / 10 : undefined;
      subRows.push({
        assignmentId: asgn.id, studentId: students[si].id,
        content: `Travail rendu par ${students[si].id.slice(-4)}. Voir pièce jointe.`,
        status: score !== undefined ? 'GRADED' : 'SUBMITTED',
        score: score ?? null,
        submittedAt: new Date('2025-01-20T10:00:00'),
        gradedAt: score !== undefined ? new Date('2025-01-25T14:00:00') : null,
        gradedById: score !== undefined ? admin.id : null,
      });
    }
  }
  if (subRows.length) await prisma.assignmentSubmission.createMany({ data: subRows, skipDuplicates: true });
  console.log(`✅ Assignment submissions (${subRows.length} soumissions)`);

  // ── 14j. Quizzes with questions, options, and student attempts ───────────
  await prisma.$disconnect(); await prisma.$connect();
  // Quiz 1 — Mathématiques Terminale D
  const quizTleD = await prisma.quiz.create({
    data: {
      title: 'Quiz T2 — Limites et dérivées',
      description: 'Évaluation formative sur les chapitres 4 et 5.',
      status: 'CLOSED' as any, durationMinutes: 20, maxAttempts: 1,
      openAt: new Date('2025-01-20T08:00:00'), closeAt: new Date('2025-01-25T18:00:00'),
      classId: classTleD.id, subjectId: subs['MATH'].id, academicYear: AY, termNumber: 2,
      createdById: t1.id, institutionId: inst.id,
    },
  });
  const q1Defs = [
    { text: 'Quelle est la limite de (3x² + 2x) / x² quand x → +∞ ?', type: 'MCQ' as const, order: 1, pts: 2, opts: [{ text: '0', ok: false }, { text: '3', ok: true }, { text: '+∞', ok: false }, { text: '2', ok: false }] },
    { text: 'Une fonction dérivable en a est nécessairement continue en a.', type: 'TRUE_FALSE' as const, order: 2, pts: 1, opts: [{ text: 'Vrai', ok: true }, { text: 'Faux', ok: false }] },
    { text: 'La dérivée de f(x) = x³ est :', type: 'MCQ' as const, order: 3, pts: 2, opts: [{ text: 'x²', ok: false }, { text: '3x²', ok: true }, { text: '3x', ok: false }, { text: 'x⁴/4', ok: false }] },
    { text: 'Si f\'(a) > 0 alors f est croissante au voisinage de a.', type: 'TRUE_FALSE' as const, order: 4, pts: 1, opts: [{ text: 'Vrai', ok: true }, { text: 'Faux', ok: false }] },
    { text: 'La limite de sin(x)/x quand x → 0 est :', type: 'MCQ' as const, order: 5, pts: 2, opts: [{ text: '0', ok: false }, { text: '∞', ok: false }, { text: '1', ok: true }, { text: '-1', ok: false }] },
  ];
  const q1Built: { id: string; order: number; opts: { id: string; isCorrect: boolean }[] }[] = [];
  for (const qd of q1Defs) {
    const q = await prisma.quizQuestion.create({ data: { quizId: quizTleD.id, text: qd.text, type: qd.type, points: qd.pts, order: qd.order } });
    const opts = await Promise.all(qd.opts.map((o, i) => prisma.quizOption.create({ data: { questionId: q.id, text: o.text, isCorrect: o.ok, order: i + 1 } })));
    q1Built.push({ id: q.id, order: qd.order, opts: opts.map(o => ({ id: o.id, isCorrect: o.isCorrect })) });
  }
  const maxQ1 = q1Defs.reduce((s, q) => s + q.pts, 0);
  for (let si = 0; si < Math.min(18, sTleD.length); si++) {
    const att = await prisma.quizAttempt.create({ data: { quizId: quizTleD.id, studentId: sTleD[si].id, startedAt: new Date('2025-01-22T09:00:00'), submittedAt: new Date('2025-01-22T09:18:00'), maxScore: maxQ1 } });
    let earned = 0;
    for (const q of q1Built) {
      const pickCorrect = (si + q.order) % 4 !== 0;
      const chosen = pickCorrect ? q.opts.find(o => o.isCorrect)! : q.opts.find(o => !o.isCorrect)!;
      const pts = chosen.isCorrect ? q1Defs[q.order - 1].pts : 0;
      earned += pts;
      await prisma.quizAnswer.create({ data: { attemptId: att.id, questionId: q.id, selectedOptionId: chosen.id, isCorrect: chosen.isCorrect, pointsEarned: pts } });
    }
    await prisma.quizAttempt.update({ where: { id: att.id }, data: { score: earned } });
  }

  // Quiz 2 — Mathématiques 3ème B
  const quiz3B = await prisma.quiz.create({
    data: {
      title: 'Quiz T2 — Équations et inéquations',
      description: 'Révision BEPC : résolution d\'équations.',
      status: 'OPEN' as any, durationMinutes: 15, maxAttempts: 1,
      openAt: new Date('2025-01-22T08:00:00'), closeAt: new Date('2025-02-05T18:00:00'),
      classId: class3B.id, subjectId: subs['MATH'].id, academicYear: AY, termNumber: 2,
      createdById: t3.id, institutionId: inst.id,
    },
  });
  const q2Defs = [
    { text: 'La solution de 2x + 6 = 0 est :', type: 'MCQ' as const, order: 1, pts: 2, opts: [{ text: 'x = 3', ok: false }, { text: 'x = -3', ok: true }, { text: 'x = 6', ok: false }, { text: 'x = -6', ok: false }] },
    { text: 'L\'inéquation x > 0 est vérifiée par x = -1.', type: 'TRUE_FALSE' as const, order: 2, pts: 1, opts: [{ text: 'Vrai', ok: false }, { text: 'Faux', ok: true }] },
    { text: 'Le discriminant de x² - 5x + 6 = 0 est :', type: 'MCQ' as const, order: 3, pts: 2, opts: [{ text: '1', ok: true }, { text: '-1', ok: false }, { text: '5', ok: false }, { text: '36', ok: false }] },
  ];
  const q2Built: { id: string; order: number; opts: { id: string; isCorrect: boolean }[] }[] = [];
  for (const qd of q2Defs) {
    const q = await prisma.quizQuestion.create({ data: { quizId: quiz3B.id, text: qd.text, type: qd.type, points: qd.pts, order: qd.order } });
    const opts = await Promise.all(qd.opts.map((o, i) => prisma.quizOption.create({ data: { questionId: q.id, text: o.text, isCorrect: o.ok, order: i + 1 } })));
    q2Built.push({ id: q.id, order: qd.order, opts: opts.map(o => ({ id: o.id, isCorrect: o.isCorrect })) });
  }
  const maxQ2 = q2Defs.reduce((s, q) => s + q.pts, 0);
  for (let si = 0; si < Math.min(20, s3B.length); si++) {
    const att = await prisma.quizAttempt.create({ data: { quizId: quiz3B.id, studentId: s3B[si].id, startedAt: new Date('2025-01-24T10:00:00'), submittedAt: new Date('2025-01-24T10:14:00'), maxScore: maxQ2 } });
    let earned = 0;
    for (const q of q2Built) {
      const pickCorrect = (si + q.order) % 5 !== 0;
      const chosen = pickCorrect ? q.opts.find(o => o.isCorrect)! : q.opts.find(o => !o.isCorrect)!;
      const pts = chosen.isCorrect ? q2Defs[q.order - 1].pts : 0;
      earned += pts;
      await prisma.quizAnswer.create({ data: { attemptId: att.id, questionId: q.id, selectedOptionId: chosen.id, isCorrect: chosen.isCorrect, pointsEarned: pts } });
    }
    await prisma.quizAttempt.update({ where: { id: att.id }, data: { score: earned } });
  }
  console.log('✅ Quizzes (2 quizzes, questions, options, student attempts)');

  // ── 14k. Disciplinary records ────────────────────────────────────────────
  await prisma.disciplinaryRecord.createMany({
    data: [
      { studentId: sTleD[3].id, institutionId: inst.id, date: new Date('2024-11-05'), type: 'WARNING' as any, description: 'Utilisation du téléphone portable pendant le cours de Mathématiques.', sanction: 'Avertissement oral', recordedByName: t1.name, recordedById: t1.id, resolved: true },
      { studentId: s3B[7].id,   institutionId: inst.id, date: new Date('2024-11-12'), type: 'SUSPENSION' as any, description: 'Bagarre dans la cour de récréation avec un élève de 3ème A.', sanction: '3 jours de suspension', sanctionStart: new Date('2024-11-13'), sanctionEnd: new Date('2024-11-15'), recordedByName: admin.name, recordedById: admin.id, resolved: true },
      { studentId: s6A[12].id,  institutionId: inst.id, date: new Date('2024-10-22'), type: 'NOTE' as any, description: 'Oubli répété du matériel scolaire (3ème fois ce mois).', recordedByName: t1.name, recordedById: t1.id, resolved: false },
      { studentId: s2A[5].id,   institutionId: inst.id, date: new Date('2024-12-03'), type: 'WARNING' as any, description: 'Retard injustifié de 45 minutes sans excuse valable.', sanction: 'Avertissement écrit aux parents', recordedByName: t4.name, recordedById: t4.id, resolved: true },
      { studentId: sTleD[15].id,institutionId: inst.id, date: new Date('2025-01-09'), type: 'COMMENDATION' as any, description: 'Excellent comportement lors de l\'examen blanc. A aidé ses camarades à se préparer.', recordedByName: t2.name, recordedById: t2.id, resolved: false },
      { studentId: s3B[22].id,  institutionId: inst.id, date: new Date('2024-10-30'), type: 'NOTE' as any, description: 'Copie sur un camarade lors du devoir de Physique-Chimie.', sanction: 'Note annulée, devoir refait sous surveillance', recordedByName: t3.name, recordedById: t3.id, resolved: true },
      { studentId: s6A[30].id,  institutionId: inst.id, date: new Date('2025-01-15'), type: 'COMMENDATION' as any, description: 'Prix du meilleur élève au concours de lecture à voix haute inter-classes.', recordedByName: admin.name, recordedById: admin.id, resolved: false },
    ],
  });
  console.log('✅ Disciplinary records (7 records)');

  // ── 14l. Health records ──────────────────────────────────────────────────
  await prisma.healthRecord.createMany({
    data: [
      { institutionId: inst.id, studentId: s6A[4].id,   date: new Date('2024-10-15'), visitType: 'CONSULTATION' as any, complaint: 'Maux de tête et fatigue', diagnosis: 'Fatigue oculaire', treatment: 'Repos, recommandation de consulter un ophtalmologue', attendedByName: 'Infirmier Yao Atsou' },
      { institutionId: inst.id, studentId: s3B[10].id,  date: new Date('2024-11-03'), visitType: 'ACCIDENT' as any, complaint: 'Chute dans les escaliers, douleur genou droit', diagnosis: 'Contusion genou droit', treatment: 'Désinfection, bandage compressif, glace', attendedByName: 'Infirmier Yao Atsou' },
      { institutionId: inst.id, studentId: sTleD[8].id, date: new Date('2024-11-20'), visitType: 'CONSULTATION' as any, complaint: 'Douleurs abdominales sévères', diagnosis: 'Suspicion gastro-entérite', treatment: 'Référé à l\'hôpital de référence', referredToHospital: true, hospital: 'CHU Sylvanus Olympio, Lomé', attendedByName: 'Infirmier Yao Atsou' },
      { institutionId: inst.id, studentId: s2A[18].id,  date: new Date('2024-12-10'), visitType: 'VACCINATION' as any, complaint: 'Campagne de vaccination Méningite A', diagnosis: 'RAS', treatment: 'Vaccin administré', attendedByName: 'Équipe sanitaire MSHP' },
      { institutionId: inst.id, studentId: s6A[25].id,  date: new Date('2025-01-08'), visitType: 'DRESSING' as any, complaint: 'Plaie superficielle main droite (coupure lame crayon)', diagnosis: 'Plaie superficielle', treatment: 'Désinfection et pansement', attendedByName: 'Infirmier Yao Atsou' },
      { institutionId: inst.id, studentId: s3B[33].id,  date: new Date('2025-01-14'), visitType: 'CONSULTATION' as any, complaint: 'Fièvre 38.5°C, frissons', diagnosis: 'Possible paludisme', treatment: 'Test TDR positif, CTA prescrit, parents prévenus', referredToHospital: true, hospital: 'Clinique de l\'Espoir, Lomé', attendedByName: 'Infirmier Yao Atsou' },
    ],
  });
  console.log('✅ Health records (6 medical visits)');

  // ── 14m. National exam results (BEPC + BAC) ──────────────────────────────
  await prisma.$disconnect(); await prisma.$connect();
  // BEPC — 3ème B students (June 2024 — previous session)
  const bepcResults = ['ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','AJOURNE','AJOURNE','AJOURNE','ABSENT','ABSENT'] as const;
  const mentions = ['Passable','Passable','Assez Bien','Bien','Bien','Assez Bien','Passable','Assez Bien','Passable','Bien','Bien','Assez Bien','Passable','Passable','Assez Bien','Bien','Passable','Passable','Assez Bien','Bien','Passable','Passable','Assez Bien','Passable','Bien','Très Bien','Bien','Assez Bien','Passable','Passable','Bien','Assez Bien','Passable','Bien','Passable','Assez Bien','Passable','Bien','Passable','Passable','Assez Bien','Passable','Passable','Bien','Passable',null,null,null,null,null];
  const bepcRows = s3B.map((st: any, i: number) => ({
    institutionId: inst.id, studentId: st.id, examType: 'BEPC' as any,
    session: 'Juin 2024', academicYear: '2023-2024',
    registrationNumber: `BEPC-2024-${String(i + 1).padStart(4, '0')}`,
    center: 'CEG Agoè — Lomé', series: null,
    result: bepcResults[i] as any, mention: mentions[i],
    totalScore: bepcResults[i] === 'ADMIS' ? 90 + (i % 30) : bepcResults[i] === 'AJOURNE' ? 70 + i : null,
  }));
  await prisma.nationalExamResult.createMany({ data: bepcRows, skipDuplicates: true });

  // BAC — Terminale D (June 2025 — anticipated for demo purposes)
  const bacResults = ['ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','ADMIS','AJOURNE','AJOURNE','AJOURNE','AJOURNE','AJOURNE','ABSENT','ABSENT'] as const;
  const bacMentions = ['Passable','Passable','Assez Bien','Bien','Très Bien','Assez Bien','Passable','Assez Bien','Passable','Bien','Bien','Assez Bien','Passable','Passable','Assez Bien','Bien','Passable','Passable','Assez Bien','Bien','Passable','Passable','Assez Bien','Passable','Bien','Très Bien','Bien','Assez Bien','Passable','Passable','Bien','Assez Bien','Passable','Bien','Passable','Assez Bien','Passable','Bien','Passable','Passable','Assez Bien','Passable','Passable',null,null,null,null,null,null,null];
  const bacRows = sTleD.map((st: any, i: number) => ({
    institutionId: inst.id, studentId: st.id, examType: 'BAC' as any,
    session: 'Juin 2025', academicYear: '2024-2025',
    registrationNumber: `BAC-2025-D-${String(i + 1).padStart(4, '0')}`,
    center: 'Lycée de Tokoin — Lomé', series: 'D',
    result: bacResults[i] as any, mention: bacMentions[i],
    totalScore: bacResults[i] === 'ADMIS' ? 100 + (i % 40) : bacResults[i] === 'AJOURNE' ? 75 + i : null,
  }));
  await prisma.nationalExamResult.createMany({ data: bacRows, skipDuplicates: true });
  console.log(`✅ National exam results (${bepcRows.length} BEPC + ${bacRows.length} BAC)`);

  // ── 14n. Alumni records ──────────────────────────────────────────────────
  await prisma.$disconnect(); await prisma.$connect();
  // Create 6 "graduated" students from previous year (2023-2024 Terminale D)
  const alumniUserPw = await hash('Student@123');
  const alumniDefs = [
    { name: 'Komlan Mensah',    email: 'alumni.2024.1@demo.novabulletin.local', sex: 'M', dob: '2004-03-12', adm: 'LYC-TLD23-M01', result: 'ADMIS',    mention: 'Assez Bien', further: 'Université de Lomé — Licence Mathématiques' },
    { name: 'Abra Kpodo',       email: 'alumni.2024.2@demo.novabulletin.local', sex: 'F', dob: '2004-07-22', adm: 'LYC-TLD23-F01', result: 'ADMIS',    mention: 'Bien',       further: 'INSTI — Génie Civil' },
    { name: 'Dodzi Agbevor',    email: 'alumni.2024.3@demo.novabulletin.local', sex: 'M', dob: '2003-11-05', adm: 'LYC-TLD23-M02', result: 'ADMIS',    mention: 'Très Bien',  further: 'EAMAU — Architecture' },
    { name: 'Sena Atsu',        email: 'alumni.2024.4@demo.novabulletin.local', sex: 'F', dob: '2004-01-30', adm: 'LYC-TLD23-F02', result: 'ADMIS',    mention: 'Passable',   further: 'IAG — Gestion' },
    { name: 'Elikem Blewu',     email: 'alumni.2024.5@demo.novabulletin.local', sex: 'M', dob: '2003-09-18', adm: 'LYC-TLD23-M03', result: 'AJOURNE',  mention: null,         further: null },
    { name: 'Patience Dewotor', email: 'alumni.2024.6@demo.novabulletin.local', sex: 'F', dob: '2004-05-14', adm: 'LYC-TLD23-F03', result: 'ADMIS',    mention: 'Assez Bien', further: 'CREDEL — Infirmière' },
  ];
  const alumniUsers = await (prisma.user as any).createManyAndReturn({
    data: alumniDefs.map(a => ({ email: a.email, password: alumniUserPw, name: a.name, role: 'STUDENT', institutionId: inst.id })),
  });
  const alumniStudents = await (prisma.student as any).createManyAndReturn({
    data: alumniDefs.map((a, i) => ({ admissionNumber: a.adm, dateOfBirth: new Date(a.dob), sex: a.sex, institutionId: inst.id, userId: alumniUsers[i].id })),
  });
  await prisma.alumniRecord.createMany({
    data: alumniDefs.map((a, i) => ({
      studentId: alumniStudents[i].id, institutionId: inst.id,
      graduationYear: 2024, lastClass: 'Terminale D', examType: 'BAC', examSession: 'Juin 2024',
      examResult: a.result, nationalExamCenter: 'Lycée de Tokoin — Lomé',
      furtherEducation: a.further ?? null, contactPhone: null, notes: null,
      diplomaNumber: a.result === 'ADMIS' ? `BAC-D-2024-${String(i + 1).padStart(5, '0')}` : null,
    })),
  });
  console.log(`✅ Alumni records (${alumniDefs.length} diplômés 2024)`);

  // ── 14o. Student transfers ───────────────────────────────────────────────
  // Transfer IN — new student arriving from another school
  const transferInUser = await prisma.user.create({
    data: { email: 'transfer.in.2025@demo.novabulletin.local', password: alumniUserPw, name: 'Kodjo Tetteh', role: 'STUDENT', institutionId: inst.id },
  });
  const transferInStudent = await prisma.student.create({
    data: { admissionNumber: 'LYC-TRANS-IN-01', dateOfBirth: new Date('2007-06-10'), sex: 'M', institutionId: inst.id, userId: transferInUser.id },
  });
  await prisma.studentTransfer.create({
    data: {
      studentId: transferInStudent.id, institutionId: inst.id,
      direction: 'IN' as any, otherSchool: 'CEG Baguida', transferDate: new Date('2024-10-01'),
      academicYear: AY, reason: 'Déménagement familial à Lomé',
      processedByName: admin.name, processedById: admin.id,
    },
  });
  // Transfer OUT — existing student leaving
  await prisma.studentTransfer.create({
    data: {
      studentId: s2A[49].id, institutionId: inst.id,
      direction: 'OUT' as any, otherSchool: 'Lycée Bilingue de Kara',
      transferDate: new Date('2024-11-15'), academicYear: AY,
      reason: 'Mutation du parent fonctionnaire vers Kara',
      processedByName: admin.name, processedById: admin.id,
    },
  });
  console.log('✅ Student transfers (1 IN + 1 OUT)');

  // ── 14p. Inventory + library loans ──────────────────────────────────────
  const inventoryItems = await (prisma.inventoryItem as any).createManyAndReturn({
    data: [
      { institutionId: inst.id, name: 'Mathématiques Terminale D — Fascicule', category: 'BOOK', quantity: 40, condition: 'GOOD', location: 'Bibliothèque centrale', purchaseDate: new Date('2023-09-01'), purchaseValue: 4500 },
      { institutionId: inst.id, name: 'Sciences de la Vie et de la Terre — 3ème', category: 'BOOK', quantity: 35, condition: 'GOOD', location: 'Bibliothèque centrale', purchaseDate: new Date('2023-09-01'), purchaseValue: 3800 },
      { institutionId: inst.id, name: 'Histoire-Géographie — 6ème', category: 'BOOK', quantity: 45, condition: 'FAIR', location: 'Bibliothèque centrale', purchaseDate: new Date('2022-09-01'), purchaseValue: 3200 },
      { institutionId: inst.id, name: 'Dictionnaire Larousse Collège', category: 'BOOK', quantity: 20, condition: 'GOOD', location: 'Bibliothèque centrale', purchaseDate: new Date('2023-09-01'), purchaseValue: 12000 },
      { institutionId: inst.id, name: 'Physique-Chimie — 2nde', category: 'BOOK', quantity: 30, condition: 'GOOD', location: 'Bibliothèque centrale', purchaseDate: new Date('2023-09-01'), purchaseValue: 4200 },
      { institutionId: inst.id, name: 'Tables de laboratoire', category: 'FURNITURE', quantity: 8, condition: 'GOOD', location: 'Salle de sciences', purchaseDate: new Date('2020-06-01'), purchaseValue: 85000 },
      { institutionId: inst.id, name: 'Chaises salle de cours', category: 'FURNITURE', quantity: 220, condition: 'FAIR', location: 'Salles de cours', purchaseDate: new Date('2019-09-01'), purchaseValue: 8500 },
      { institutionId: inst.id, name: 'Ordinateurs portables enseignants', category: 'IT', quantity: 4, condition: 'GOOD', location: 'Salle des professeurs', purchaseDate: new Date('2022-01-15'), purchaseValue: 350000, supplier: 'Informatique Express Lomé' },
      { institutionId: inst.id, name: 'Projecteur datashow', category: 'IT', quantity: 2, condition: 'GOOD', location: 'Salle des professeurs', purchaseDate: new Date('2021-03-10'), purchaseValue: 180000 },
      { institutionId: inst.id, name: 'Microscopes optiques', category: 'LAB', quantity: 6, condition: 'GOOD', location: 'Laboratoire SVT', purchaseDate: new Date('2020-09-01'), purchaseValue: 120000 },
      { institutionId: inst.id, name: 'Ballon de football', category: 'SPORT', quantity: 4, condition: 'GOOD', location: 'Terrain de sport', purchaseDate: new Date('2023-09-01'), purchaseValue: 15000 },
      { institutionId: inst.id, name: 'Matelas de sol (sport)', category: 'SPORT', quantity: 10, condition: 'FAIR', location: 'Terrain de sport', purchaseDate: new Date('2021-01-01'), purchaseValue: 25000 },
    ],
  });
  // Library loans — books to students
  const bookItems = inventoryItems.filter((it: any) => it.category === 'BOOK');
  await prisma.libraryLoan.createMany({
    data: [
      { institutionId: inst.id, itemId: bookItems[0].id, studentId: sTleD[0].id, borrowerName: sTleD[0].id, loanDate: new Date('2025-01-10'), dueDate: new Date('2025-02-10'), issuedByName: admin.name },
      { institutionId: inst.id, itemId: bookItems[0].id, studentId: sTleD[5].id, borrowerName: sTleD[5].id, loanDate: new Date('2025-01-10'), dueDate: new Date('2025-02-10'), issuedByName: admin.name },
      { institutionId: inst.id, itemId: bookItems[1].id, studentId: s3B[2].id,   borrowerName: s3B[2].id,   loanDate: new Date('2024-11-15'), dueDate: new Date('2024-12-15'), isReturned: false, issuedByName: admin.name },
      { institutionId: inst.id, itemId: bookItems[2].id, studentId: s6A[8].id,   borrowerName: s6A[8].id,   loanDate: new Date('2024-10-20'), dueDate: new Date('2024-11-20'), returnDate: new Date('2024-11-18'), isReturned: true, issuedByName: admin.name },
      { institutionId: inst.id, itemId: bookItems[3].id, studentId: s2A[12].id,  borrowerName: s2A[12].id,  loanDate: new Date('2025-01-08'), dueDate: new Date('2025-02-08'), issuedByName: admin.name },
      { institutionId: inst.id, itemId: bookItems[4].id, studentId: s2A[20].id,  borrowerName: s2A[20].id,  loanDate: new Date('2025-01-12'), dueDate: new Date('2025-02-12'), issuedByName: admin.name },
      { institutionId: inst.id, itemId: bookItems[0].id, studentId: sTleD[15].id,borrowerName: sTleD[15].id,loanDate: new Date('2024-12-02'), dueDate: new Date('2025-01-02'), returnDate: new Date('2024-12-28'), isReturned: true, issuedByName: admin.name },
      { institutionId: inst.id, itemId: bookItems[1].id, studentId: s3B[18].id,  borrowerName: s3B[18].id,  loanDate: new Date('2024-12-10'), dueDate: new Date('2025-01-10'), issuedByName: admin.name },
    ],
  });
  console.log(`✅ Inventory (${inventoryItems.length} items) + library loans (8)`);

  // ── 14q. School documents ────────────────────────────────────────────────
  await prisma.schoolDocument.createMany({
    data: [
      { institutionId: inst.id, title: 'Circulaire n°01/2024 — Rentrée scolaire 2024-2025', category: 'CIRCULAR', fileUrl: 'https://example.com/docs/circulaire-rentree-2024.pdf', description: 'Modalités d\'organisation de la rentrée scolaire 2024-2025', uploadedById: admin.id, isPublic: true },
      { institutionId: inst.id, title: 'Emploi du temps T2 — Terminale D', category: 'SCHEDULE', fileUrl: 'https://example.com/docs/edt-t2-tle-d.pdf', description: 'Emploi du temps 2ème trimestre Terminale D', uploadedById: admin.id, isPublic: false },
      { institutionId: inst.id, title: 'Emploi du temps T2 — 3ème B', category: 'SCHEDULE', fileUrl: 'https://example.com/docs/edt-t2-3b.pdf', description: 'Emploi du temps 2ème trimestre 3ème B', uploadedById: admin.id, isPublic: false },
      { institutionId: inst.id, title: 'Rapport financier T1 2024-2025', category: 'FINANCIAL', fileUrl: 'https://example.com/docs/rapport-financier-t1-2024.pdf', description: 'Bilan des recettes et dépenses du 1er trimestre', uploadedById: admin.id, isPublic: false },
      { institutionId: inst.id, title: 'Contrat de travail — Kofi Agbesi', category: 'CONTRACT', fileUrl: 'https://example.com/docs/contrat-agbesi-2024.pdf', description: 'Contrat CDI enseignant Mathématiques', uploadedById: admin.id, isPublic: false },
      { institutionId: inst.id, title: 'PV Conseil d\'Établissement — Nov 2024', category: 'REPORT', fileUrl: 'https://example.com/docs/pv-conseil-nov2024.pdf', description: 'Procès-verbal du conseil d\'établissement du 18 novembre 2024', uploadedById: admin.id, isPublic: false },
    ],
  });
  console.log('✅ School documents (6 documents)');

  // ── 14r. Subject hours log (T1 + T2) ────────────────────────────────────
  const hoursLogRows: any[] = [];
  for (const { cls, codes } of classCfg) {
    for (const code of codes) {
      hoursLogRows.push({ subjectId: subs[code].id, classId: cls.id, academicYear: AY, termNumber: 1, termName: '1er Trimestre', heuresPrevues: 48, heuresEffectuees: 44, absences: Math.floor(Math.random() * 8), retards: Math.floor(Math.random() * 5) });
      hoursLogRows.push({ subjectId: subs[code].id, classId: cls.id, academicYear: AY, termNumber: 2, termName: '2ème Trimestre', heuresPrevues: 52, heuresEffectuees: 48, absences: Math.floor(Math.random() * 6), retards: Math.floor(Math.random() * 4) });
    }
  }
  await prisma.subjectHoursLog.createMany({ data: hoursLogRows, skipDuplicates: true });
  console.log(`✅ Subject hours log (${hoursLogRows.length} entries)`);

  // ── 14s. Subscription payment ────────────────────────────────────────────
  await prisma.subscriptionPayment.create({
    data: {
      institutionId: inst.id, plan: 'ANNUAL', tier: 'PRO' as any,
      amount: 200000, currency: 'XOF', method: 'MOMO_MANUAL' as any,
      status: 'APPROVED' as any, momoPhone: '+22890000001',
      momoReference: 'TM-2024-089123', momoOperator: 'TMoney',
      monthsGranted: 12, approvedAt: new Date('2024-09-05'),
    },
  });
  console.log('✅ Subscription payment (200 000 XOF ANNUAL/PRO — APPROVED)');

  // ── 14t. Announcements ───────────────────────────────────────────────────
  await prisma.announcement.createMany({
    data: [
      { title: 'Réunion parents d\'élèves — 25 janvier', body: 'Une réunion parents d\'élèves est organisée le samedi 25 janvier 2025 à 9h00 dans la grande salle. Présence obligatoire pour les parents de Terminale D et 3ème B. Ordre du jour : résultats T1, préparation BEPC/BAC.', audience: 'PARENTS' as any, isPinned: true, publishedAt: new Date('2025-01-10'), expiresAt: new Date('2025-01-26'), authorId: admin.id, institutionId: inst.id },
      { title: 'Calendrier des compositions T2 — 10 au 15 mars 2025', body: 'Les compositions du 2ème trimestre se dérouleront du lundi 10 au samedi 15 mars 2025. Les emplois du temps de composition seront affichés à l\'administration et partagés par classe. Les enseignants sont priés de déposer leurs sujets avant le 7 mars.', audience: 'ALL' as any, isPinned: true, publishedAt: new Date('2025-02-20'), authorId: admin.id, institutionId: inst.id },
      { title: 'Fermeture exceptionnelle — 28 janvier 2025', body: 'L\'établissement sera fermé le mardi 28 janvier 2025 à l\'occasion de la fête nationale. Les cours reprennent normalement le mercredi 29 janvier.', audience: 'ALL' as any, isPinned: false, publishedAt: new Date('2025-01-24'), expiresAt: new Date('2025-01-29'), authorId: admin.id, institutionId: inst.id },
      { title: 'Réunion pédagogique mensuelle — vendredi 31 janvier', body: 'Tous les enseignants sont convoqués à la réunion pédagogique mensuelle le vendredi 31 janvier à 14h30 en salle des professeurs. Thème : bilan des performances T1 et stratégies de remédiation.', audience: 'TEACHERS' as any, isPinned: false, publishedAt: new Date('2025-01-27'), expiresAt: new Date('2025-01-31'), authorId: admin.id, institutionId: inst.id },
      { title: 'Palmarès T1 — Félicitations aux meilleurs élèves', body: 'Le lycée félicite les 10 premiers élèves de chaque classe pour leurs excellents résultats du 1er trimestre. La cérémonie de remise des prix se tiendra lors de l\'assemblée générale de fin T1. Bravo à tous !', audience: 'ALL' as any, isPinned: false, publishedAt: new Date('2025-01-05'), authorId: admin.id, institutionId: inst.id },
      { title: 'Révisions BAC — Programme de soutien scolaire', body: 'Un programme de soutien scolaire pour les élèves de Terminale D est mis en place tous les samedis matin de 8h00 à 11h00. Matières : Mathématiques, Physique-Chimie, SVT. Inscription obligatoire auprès du prof principal.', audience: 'CLASS' as any, classId: classTleD.id, isPinned: true, publishedAt: new Date('2025-01-13'), authorId: t2.id, institutionId: inst.id },
    ],
  });
  console.log('✅ Announcements (6 announcements)');

  // ── 15. Superadmin ───────────────────────────────────────────────────────
  // Credentials come ONLY from env vars — never hardcoded
  const superEmail = process.env.SUPERADMIN_EMAIL;
  const superPass  = process.env.SUPERADMIN_PASSWORD;
  if (!superEmail || !superPass) {
    console.warn('⚠️  SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD not set — skipping superadmin upsert.');
    console.warn('   Set them in your .env file and re-run the seed to create the superadmin.');
  } else {
    await prisma.user.upsert({
      where: { email: superEmail },
      update: { password: await hash(superPass), role: 'SUPERADMIN' as any, isActive: true, institutionId: null },
      create: { name: 'Super Admin', email: superEmail, password: await hash(superPass), role: 'SUPERADMIN' as any, isActive: true },
    });
    console.log(`✅ Superadmin: ${superEmail}`);
  }

  // ── 16. Summary ──────────────────────────────────────────────────────────
  const totalStudents = s6A.length + s3B.length + s2A.length + sTleD.length;
  const totalRC = totalStudents + sTleD.length + s3B.length + sTleD.length;

  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║              ✅  SEED COMPLETE — NovaBulletin Demo                   ║
╠══════════════════════════════════════════════════════════════════════╣
║  📚 Classes        : 4 (6ème A · 3ème B · 2nde A · Terminale D)     ║
║  👥 Students       : ${totalStudents} + 6 alumni + 1 transfert              ║
║  📋 Report cards   : ~${totalRC} (T1×4 · T2×2 · T3×1)                    ║
║  📝 Grade fiches   : 3 trimestres × 4 classes                        ║
║  🗓  Timetables    : 4 classes (Lundi–Samedi)                        ║
║  📢 Bulletins      : 10 annonces + 6 announcements                  ║
║  👔 Staff profiles : 4 enseignants                                   ║
║  📅 Calendar       : 17 événements annuels                           ║
║  📖 Programmes     : 6 feuilles de route avec chapitres              ║
║  📌 Assignments    : 8 devoirs + soumissions élèves                  ║
║  📝 Examen blanc   : Terminale D (${mockGradeRows.length} notes BAC)                   ║
║  🏫 Présences      : 4000 enregistrements (20 jours)                 ║
║  🎯 Quizzes        : 2 quiz LMS + questions + tentatives élèves      ║
║  📁 LMS materials  : 10 ressources pédagogiques                      ║
║  ⚕️  Santé          : 6 visites infirmerie                            ║
║  ⚖️  Discipline     : 7 dossiers disciplinaires                       ║
║  🎓 Examen national: 50 BEPC (3ème B) + 50 BAC (Terminale D)        ║
║  🏛️  Alumni        : 6 diplômés 2024                                 ║
║  🔄 Transferts     : 1 arrivée + 1 départ                            ║
║  📦 Inventaire     : 12 items + 8 prêts bibliothèque                 ║
║  📄 Documents      : 6 documents administratifs                      ║
║  🕐 Heures cours   : ${hoursLogRows.length} entrées feuilles de route                  ║
║  💳 Abonnement     : 1 paiement ANNUAL/PRO approuvé                  ║
╠══════════════════════════════════════════════════════════════════════╣
║  DEMO LOGINS                                                         ║
║  ADMIN    admin@demo.novabulletin.local         Admin@123            ║
║  TEACHER  kofi.agbesi@demo.novabulletin.local   Teacher@123         ║
║  TEACHER  ama.dossou@demo.novabulletin.local    Teacher@123         ║
║  TEACHER  edem.kpodo@demo.novabulletin.local    Teacher@123         ║
║  TEACHER  akosua.lawson@demo.novabulletin.local Teacher@123         ║
║  BURSAR   bursar@demo.novabulletin.local        Bursar@123          ║
║  PARENT   parent.edem@demo.novabulletin.local   Parent@123          ║
║  STUDENT  s.6a.m1@student.demo.novabulletin.local  Student@123     ║
╠══════════════════════════════════════════════════════════════════════╣
║  SUPERADMIN → set SUPERADMIN_EMAIL + SUPERADMIN_PASSWORD in .env    ║
╚══════════════════════════════════════════════════════════════════════╝
`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
