import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Institution ────────────────────────────────────────────────────────
  const institution = await prisma.institution.upsert({
    where: { id: 'seed-institution-01' },
    update: {},
    create: {
      id: 'seed-institution-01',
      name: 'Lycée Démonstration NovaBulletin',
      address: '12 Boulevard de la Paix, Lomé, Togo',
      phone: '+228 90 00 00 00',
      email: 'contact@demo.novabulletin.local',
      website: 'https://demo.novabulletin.local',
      motto: "L'excellence par le savoir",
      missionStatement: 'Former des citoyens compétents, responsables et engagés pour le développement du Togo.',
      academicSettings: {
        termSystem: 'TRIMESTRE',
        termsPerYear: 3,
        termNames: {
          fr: ['1er Trimestre', '2ème Trimestre', '3ème Trimestre'],
          en: ['First Term', 'Second Term', 'Third Term'],
        },
        gradingScale: { min: 0, max: 20 },
        passMark: 10,
        defaultLanguage: 'fr',
        feeGateEnabled: true,
        currency: 'XOF',
      },
      brandingSettings: {
        primaryColor: '#f97316',
        secondaryColor: '#0f766e',
        accentColor: '#ea580c',
        fontFamilyHeading: 'Open Sans',
        fontFamilyBody: 'Roboto',
      },
    },
  });

  console.log('✅ Institution:', institution.name);

  // ─── Users ──────────────────────────────────────────────────────────────
  const adminPw     = await hash('Admin@123');
  const teacherPw   = await hash('Teacher@123');
  const bursarPw    = await hash('Bursar@123');
  const parentPw    = await hash('Parent@123');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.novabulletin.local' },
    update: {},
    create: {
      email: 'admin@demo.novabulletin.local',
      password: adminPw,
      name: 'Admin Principal',
      role: 'ADMIN',
      institutionId: institution.id,
    },
  });

  const teacher1 = await prisma.user.upsert({
    where: { email: 'kofi.agbesi@demo.novabulletin.local' },
    update: {},
    create: {
      email: 'kofi.agbesi@demo.novabulletin.local',
      password: teacherPw,
      name: 'Kofi Agbesi',
      role: 'TEACHER',
      institutionId: institution.id,
      whatsappNumber: '+22890111111',
    },
  });

  const teacher2 = await prisma.user.upsert({
    where: { email: 'ama.dossou@demo.novabulletin.local' },
    update: {},
    create: {
      email: 'ama.dossou@demo.novabulletin.local',
      password: teacherPw,
      name: 'Ama Dossou',
      role: 'TEACHER',
      institutionId: institution.id,
      whatsappNumber: '+22890222222',
    },
  });

  await prisma.user.upsert({
    where: { email: 'bursar@demo.novabulletin.local' },
    update: {},
    create: {
      email: 'bursar@demo.novabulletin.local',
      password: bursarPw,
      name: 'Mensah Abla',
      role: 'BURSAR',
      institutionId: institution.id,
    },
  });

  const parent1 = await prisma.user.upsert({
    where: { email: 'parent.edem@demo.novabulletin.local' },
    update: {},
    create: {
      email: 'parent.edem@demo.novabulletin.local',
      password: parentPw,
      name: 'Edem Sossah',
      role: 'PARENT',
      institutionId: institution.id,
      whatsappNumber: '+22890333333',
    },
  });

  const parent2 = await prisma.user.upsert({
    where: { email: 'parent.akua@demo.novabulletin.local' },
    update: {},
    create: {
      email: 'parent.akua@demo.novabulletin.local',
      password: parentPw,
      name: 'Akua Mensah',
      role: 'PARENT',
      institutionId: institution.id,
      whatsappNumber: '+22890444444',
    },
  });

  console.log('✅ Users created');

  // ─── Subjects ───────────────────────────────────────────────────────────
  const subjectData = [
    { code: 'MATH',  nameFr: 'Mathématiques',     nameEn: 'Mathematics',   category: 'Sciences', passMark: 10 },
    { code: 'PC',    nameFr: 'Physique-Chimie',    nameEn: 'Physics-Chemistry', category: 'Sciences', passMark: 10 },
    { code: 'SVT',   nameFr: 'Sciences de la Vie', nameEn: 'Life Sciences', category: 'Sciences', passMark: 10 },
    { code: 'FR',    nameFr: 'Français',           nameEn: 'French',        category: 'Lettres',  passMark: 10 },
    { code: 'ANGL',  nameFr: 'Anglais',            nameEn: 'English',       category: 'Lettres',  passMark: 10 },
    { code: 'HIST',  nameFr: 'Histoire-Géographie',nameEn: 'History-Geography', category: 'Sciences Sociales', passMark: 10 },
    { code: 'PHILO', nameFr: 'Philosophie',        nameEn: 'Philosophy',    category: 'Lettres',  passMark: 10 },
    { code: 'EPS',   nameFr: 'Éducation Physique', nameEn: 'Physical Education', category: 'EPS', passMark: 10 },
    { code: 'ECON',  nameFr: 'Économie',           nameEn: 'Economics',     category: 'Sciences Sociales', passMark: 10 },
  ];

  const subjects: Record<string, any> = {};
  for (const s of subjectData) {
    subjects[s.code] = await prisma.subject.upsert({
      where: { institutionId_code: { institutionId: institution.id, code: s.code } },
      update: {},
      create: { ...s, institutionId: institution.id },
    });
  }
  console.log('✅ Subjects created');

  // ─── Classes ────────────────────────────────────────────────────────────
  const class6A = await prisma.class.upsert({
    where: { id: 'seed-class-6a' },
    update: {},
    create: {
      id: 'seed-class-6a',
      name: '6ème A',
      level: '6eme',
      section: 'A',
      capacity: 40,
      academicYear: '2024-2025',
      room: 'Salle 01',
      institutionId: institution.id,
      teacherId: teacher1.id,
    },
  });

  const classTleD = await prisma.class.upsert({
    where: { id: 'seed-class-tle-d' },
    update: {},
    create: {
      id: 'seed-class-tle-d',
      name: 'Terminale D',
      level: 'Terminale',
      series: 'D',
      capacity: 35,
      academicYear: '2024-2025',
      room: 'Salle 12',
      institutionId: institution.id,
      teacherId: teacher2.id,
    },
  });

  console.log('✅ Classes created');

  // ─── Assign subjects to classes ─────────────────────────────────────────
  const sixiemeSubjects = ['MATH', 'PC', 'SVT', 'FR', 'ANGL', 'HIST', 'EPS'];
  for (const code of sixiemeSubjects) {
    await prisma.classSubject.upsert({
      where: { classId_subjectId: { classId: class6A.id, subjectId: subjects[code].id } },
      update: {},
      create: {
        classId: class6A.id,
        subjectId: subjects[code].id,
        teacherId: teacher1.id,
      },
    });
  }

  const terminaleSubjects = ['MATH', 'PC', 'SVT', 'FR', 'ANGL', 'HIST', 'PHILO', 'EPS', 'ECON'];
  for (const code of terminaleSubjects) {
    await prisma.classSubject.upsert({
      where: { classId_subjectId: { classId: classTleD.id, subjectId: subjects[code].id } },
      update: {},
      create: {
        classId: classTleD.id,
        subjectId: subjects[code].id,
        teacherId: teacher2.id,
      },
    });
  }

  console.log('✅ Class subjects assigned');

  // ─── Students ───────────────────────────────────────────────────────────
  const student1 = await prisma.student.upsert({
    where: { admissionNumber: 'LYC-2024-001' },
    update: {},
    create: {
      admissionNumber: 'LYC-2024-001',
      dateOfBirth: new Date('2012-05-20'),
      institutionId: institution.id,
      parentId: parent1.id,
    },
  });

  const student2 = await prisma.student.upsert({
    where: { admissionNumber: 'LYC-2024-002' },
    update: {},
    create: {
      admissionNumber: 'LYC-2024-002',
      dateOfBirth: new Date('2012-09-14'),
      institutionId: institution.id,
      parentId: parent2.id,
    },
  });

  const student3 = await prisma.student.upsert({
    where: { admissionNumber: 'LYC-2024-101' },
    update: {},
    create: {
      admissionNumber: 'LYC-2024-101',
      dateOfBirth: new Date('2005-03-08'),
      institutionId: institution.id,
      parentId: parent1.id,
    },
  });

  console.log('✅ Students created');

  // ─── Enroll students in classes ─────────────────────────────────────────
  await prisma.classStudent.upsert({
    where: { classId_studentId_academicYear: { classId: class6A.id, studentId: student1.id, academicYear: '2024-2025' } },
    update: {},
    create: { classId: class6A.id, studentId: student1.id, academicYear: '2024-2025' },
  });

  await prisma.classStudent.upsert({
    where: { classId_studentId_academicYear: { classId: class6A.id, studentId: student2.id, academicYear: '2024-2025' } },
    update: {},
    create: { classId: class6A.id, studentId: student2.id, academicYear: '2024-2025' },
  });

  await prisma.classStudent.upsert({
    where: { classId_studentId_academicYear: { classId: classTleD.id, studentId: student3.id, academicYear: '2024-2025' } },
    update: {},
    create: { classId: classTleD.id, studentId: student3.id, academicYear: '2024-2025' },
  });

  console.log('✅ Students enrolled');

  // ─── Fees ───────────────────────────────────────────────────────────────
  const feeScolarite6e = await prisma.fee.upsert({
    where: { id: 'seed-fee-scol-6e-t1' },
    update: {},
    create: {
      id: 'seed-fee-scol-6e-t1',
      name: 'Frais de scolarité 6ème — T1',
      feeType: 'TUITION',
      amount: 45000,
      currency: 'XOF',
      academicYear: '2024-2025',
      term: '1er Trimestre',
      appliesToLevel: '6eme',
      institutionId: institution.id,
    },
  });

  await prisma.fee.upsert({
    where: { id: 'seed-fee-inscription' },
    update: {},
    create: {
      id: 'seed-fee-inscription',
      name: "Frais d'inscription 2024-2025",
      feeType: 'REGISTRATION',
      amount: 15000,
      currency: 'XOF',
      academicYear: '2024-2025',
      institutionId: institution.id,
    },
  });

  // Assign tuition fee to students in 6ème A
  await prisma.studentFee.upsert({
    where: { studentId_feeId_academicYear_term: { studentId: student1.id, feeId: feeScolarite6e.id, academicYear: '2024-2025', term: '1er Trimestre' } },
    update: {},
    create: { studentId: student1.id, feeId: feeScolarite6e.id, academicYear: '2024-2025', term: '1er Trimestre', amountDue: 45000 },
  });

  await prisma.studentFee.upsert({
    where: { studentId_feeId_academicYear_term: { studentId: student2.id, feeId: feeScolarite6e.id, academicYear: '2024-2025', term: '1er Trimestre' } },
    update: {},
    create: { studentId: student2.id, feeId: feeScolarite6e.id, academicYear: '2024-2025', term: '1er Trimestre', amountDue: 45000 },
  });

  console.log('✅ Fees and student fees created');

  // ─── Payment — student1 fee cleared ─────────────────────────────────────
  await prisma.payment.upsert({
    where: { receiptNumber: 'REC-2024-S1-T1' },
    update: {},
    create: {
      receiptNumber: 'REC-2024-S1-T1',
      studentId: student1.id,
      academicYear: '2024-2025',
      term: '1er Trimestre',
      amount: 45000,
      paymentMethod: 'CASH',
      paymentDate: new Date('2024-10-15'),
      recordedById: admin.id,
      institutionId: institution.id,
      notes: 'Paiement intégral — frais de scolarité T1',
    },
  });
  console.log('✅ Payment recorded for student1');

  // ─── Report Cards (bulletins de notes) ──────────────────────────────────
  // 6ème A — student1 (strong student, fees paid)
  const coefs6A: Record<string, number> = {
    MATH: 4, PC: 3, SVT: 3, FR: 4, ANGL: 3, HIST: 2, EPS: 2,
  };
  const grades6A_s1: Record<string, { i1: number; i2: number; devoir: number; compo: number }> = {
    MATH: { i1: 14, i2: 13, devoir: 13, compo: 15 },
    PC:   { i1: 11, i2: 10, devoir: 12, compo: 10 },
    SVT:  { i1: 16, i2: 15, devoir: 14, compo: 15 },
    FR:   { i1: 13, i2: 12, devoir: 12, compo: 14 },
    ANGL: { i1: 15, i2: 16, devoir: 14, compo: 16 },
    HIST: { i1: 12, i2: 13, devoir: 13, compo: 14 },
    EPS:  { i1: 17, i2: 18, devoir: 18, compo: 17 },
  };
  // moyenne = (i1 + i2 + devoir + 2*compo) / 5  (Togolese formula)
  function calcMoyenne(g: { i1: number; i2: number; devoir: number; compo: number }) {
    return Math.round(((g.i1 + g.i2 + g.devoir + 2 * g.compo) / 5) * 100) / 100;
  }
  function appreciation(m: number) {
    if (m >= 16) return 'TB';
    if (m >= 14) return 'B';
    if (m >= 12) return 'AB';
    if (m >= 10) return 'P';
    return 'F';
  }

  let totalWeighted6A_s1 = 0, totalCoef6A_s1 = 0;
  for (const code of Object.keys(grades6A_s1)) {
    const m = calcMoyenne(grades6A_s1[code]);
    totalWeighted6A_s1 += m * coefs6A[code];
    totalCoef6A_s1 += coefs6A[code];
  }
  const avg6A_s1 = Math.round((totalWeighted6A_s1 / totalCoef6A_s1) * 100) / 100;

  const grades6A_s2: Record<string, { i1: number; i2: number; devoir: number; compo: number }> = {
    MATH: { i1: 8,  i2: 9,  devoir: 9,  compo: 8  },
    PC:   { i1: 7,  i2: 8,  devoir: 8,  compo: 7  },
    SVT:  { i1: 11, i2: 10, devoir: 11, compo: 11 },
    FR:   { i1: 10, i2: 9,  devoir: 10, compo: 10 },
    ANGL: { i1: 12, i2: 11, devoir: 11, compo: 12 },
    HIST: { i1: 10, i2: 10, devoir: 10, compo: 10 },
    EPS:  { i1: 14, i2: 13, devoir: 14, compo: 13 },
  };
  let totalWeighted6A_s2 = 0, totalCoef6A_s2 = 0;
  for (const code of Object.keys(grades6A_s2)) {
    const m = calcMoyenne(grades6A_s2[code]);
    totalWeighted6A_s2 += m * coefs6A[code];
    totalCoef6A_s2 += coefs6A[code];
  }
  const avg6A_s2 = Math.round((totalWeighted6A_s2 / totalCoef6A_s2) * 100) / 100;

  // Terminale D — student3
  const coefsTermD: Record<string, number> = {
    MATH: 7, PC: 6, SVT: 5, FR: 3, ANGL: 3, HIST: 2, PHILO: 3, EPS: 2, ECON: 2,
  };
  const gradesTermD_s3: Record<string, { i1: number; i2: number; devoir: number; compo: number }> = {
    MATH:  { i1: 14, i2: 13, devoir: 15, compo: 14 },
    PC:    { i1: 12, i2: 13, devoir: 12, compo: 13 },
    SVT:   { i1: 13, i2: 14, devoir: 13, compo: 13 },
    FR:    { i1: 11, i2: 10, devoir: 11, compo: 11 },
    ANGL:  { i1: 13, i2: 14, devoir: 13, compo: 13 },
    HIST:  { i1: 12, i2: 11, devoir: 12, compo: 12 },
    PHILO: { i1: 11, i2: 12, devoir: 11, compo: 12 },
    EPS:   { i1: 16, i2: 17, devoir: 16, compo: 16 },
    ECON:  { i1: 12, i2: 11, devoir: 12, compo: 12 },
  };
  let totalWeightedTD = 0, totalCoefTD = 0;
  for (const code of Object.keys(gradesTermD_s3)) {
    const m = calcMoyenne(gradesTermD_s3[code]);
    totalWeightedTD += m * coefsTermD[code];
    totalCoefTD += coefsTermD[code];
  }
  const avgTD = Math.round((totalWeightedTD / totalCoefTD) * 100) / 100;

  function computeMentionSeed(avg: number): string {
    if (avg >= 18) return 'Excellent';
    if (avg >= 16) return 'Très Bien';
    if (avg >= 14) return 'Bien';
    if (avg >= 12) return 'Assez Bien';
    if (avg >= 10) return 'Passable';
    return 'Insuffisant';
  }

  // student1 rank=1, student2 rank=2 (both in 6A)
  const report6A_s1 = await prisma.reportCard.upsert({
    where: { studentId_academicYear_termNumber: { studentId: student1.id, academicYear: '2024-2025', termNumber: 1 } },
    update: {},
    create: {
      studentId:        student1.id,
      classId:          class6A.id,
      academicYear:     '2024-2025',
      termType:         'TRIMESTRE',
      termNumber:       1,
      termName:         '1er Trimestre',
      status:           'PUBLISHED',
      publishedAt:      new Date('2024-12-20'),
      overallAverage:   avg6A_s1,
      classRank:        1,
      classSize:        2,
      classHighest:     avg6A_s1,
      classLowest:      avg6A_s2,
      classAverage:     Math.round(((avg6A_s1 + avg6A_s2) / 2) * 100) / 100,
      mention:          computeMentionSeed(avg6A_s1),
      conductRating:    'BIEN',
      attendanceDays:   60,
      attendancePresent: 59,
      attendanceLate:   1,
      attendanceAbsent: 0,
      teacherComment:   'Élève sérieux, continue sur cette lancée.',
      principalComment: 'Bon trimestre, félicitations.',
      createdById:      teacher1.id,
    },
  });

  for (const code of Object.keys(grades6A_s1)) {
    const g  = grades6A_s1[code];
    const m  = calcMoyenne(g);
    const c  = coefs6A[code];
    await prisma.grade.upsert({
      where: { reportCardId_subjectId: { reportCardId: report6A_s1.id, subjectId: subjects[code].id } },
      update: {},
      create: {
        reportCardId:     report6A_s1.id,
        subjectId:        subjects[code].id,
        noteInterro1:     g.i1,
        noteInterro2:     g.i2,
        noteDevoir:       g.devoir,
        noteComposition:  g.compo,
        moyenneMatiere:   m,
        score:            m,
        coefficient:      c,
        weightedScore:    Math.round(m * c * 100) / 100,
        appreciation:     appreciation(m),
        teacherName:      teacher1.name,
      },
    });
  }

  const report6A_s2 = await prisma.reportCard.upsert({
    where: { studentId_academicYear_termNumber: { studentId: student2.id, academicYear: '2024-2025', termNumber: 1 } },
    update: {},
    create: {
      studentId:        student2.id,
      classId:          class6A.id,
      academicYear:     '2024-2025',
      termType:         'TRIMESTRE',
      termNumber:       1,
      termName:         '1er Trimestre',
      status:           'PUBLISHED',
      publishedAt:      new Date('2024-12-20'),
      overallAverage:   avg6A_s2,
      classRank:        2,
      classSize:        2,
      classHighest:     avg6A_s1,
      classLowest:      avg6A_s2,
      classAverage:     Math.round(((avg6A_s1 + avg6A_s2) / 2) * 100) / 100,
      mention:          computeMentionSeed(avg6A_s2),
      conductRating:    'PASSABLE',
      attendanceDays:   60,
      attendancePresent: 55,
      attendanceLate:   3,
      attendanceAbsent: 2,
      teacherComment:   'Des efforts sont encore nécessaires, surtout en sciences.',
      principalComment: 'Trimestre difficile, un soutien est recommandé.',
      createdById:      teacher1.id,
    },
  });

  for (const code of Object.keys(grades6A_s2)) {
    const g  = grades6A_s2[code];
    const m  = calcMoyenne(g);
    const c  = coefs6A[code];
    await prisma.grade.upsert({
      where: { reportCardId_subjectId: { reportCardId: report6A_s2.id, subjectId: subjects[code].id } },
      update: {},
      create: {
        reportCardId:     report6A_s2.id,
        subjectId:        subjects[code].id,
        noteInterro1:     g.i1,
        noteInterro2:     g.i2,
        noteDevoir:       g.devoir,
        noteComposition:  g.compo,
        moyenneMatiere:   m,
        score:            m,
        coefficient:      c,
        weightedScore:    Math.round(m * c * 100) / 100,
        appreciation:     appreciation(m),
        teacherName:      teacher1.name,
      },
    });
  }

  const reportTD_s3 = await prisma.reportCard.upsert({
    where: { studentId_academicYear_termNumber: { studentId: student3.id, academicYear: '2024-2025', termNumber: 1 } },
    update: {},
    create: {
      studentId:        student3.id,
      classId:          classTleD.id,
      academicYear:     '2024-2025',
      termType:         'TRIMESTRE',
      termNumber:       1,
      termName:         '1er Trimestre',
      status:           'PUBLISHED',
      publishedAt:      new Date('2024-12-20'),
      overallAverage:   avgTD,
      classRank:        1,
      classSize:        1,
      classHighest:     avgTD,
      classLowest:      avgTD,
      classAverage:     avgTD,
      mention:          computeMentionSeed(avgTD),
      conductRating:    'TRES_BIEN',
      attendanceDays:   60,
      attendancePresent: 60,
      attendanceLate:   0,
      attendanceAbsent: 0,
      teacherComment:   'Excellent travail, continue ainsi pour le bac.',
      principalComment: 'Tableau d\'honneur. Félicitations au conseil des professeurs.',
      honorCouncil:     true,
      createdById:      teacher2.id,
    },
  });

  for (const code of Object.keys(gradesTermD_s3)) {
    const g  = gradesTermD_s3[code];
    const m  = calcMoyenne(g);
    const c  = coefsTermD[code];
    await prisma.grade.upsert({
      where: { reportCardId_subjectId: { reportCardId: reportTD_s3.id, subjectId: subjects[code].id } },
      update: {},
      create: {
        reportCardId:     reportTD_s3.id,
        subjectId:        subjects[code].id,
        noteInterro1:     g.i1,
        noteInterro2:     g.i2,
        noteDevoir:       g.devoir,
        noteComposition:  g.compo,
        moyenneMatiere:   m,
        score:            m,
        coefficient:      c,
        weightedScore:    Math.round(m * c * 100) / 100,
        appreciation:     appreciation(m),
        teacherName:      teacher2.name,
      },
    });
  }

  console.log(`✅ Report cards seeded:`);
  console.log(`   student1 (6A T1): moyenne ${avg6A_s1}/20 — rank 1/2`);
  console.log(`   student2 (6A T1): moyenne ${avg6A_s2}/20 — rank 2/2`);
  console.log(`   student3 (TleD T1): moyenne ${avgTD}/20 — rank 1/1`);

  // ─── Summary ────────────────────────────────────────────────────────────
  console.log('\n✅ Seed complete!\n');
  console.log('  📌 LOGINS (all passwords as shown):');
  console.log('  ┌──────────────────────────────────────────────────────────────────┐');
  console.log('  │ Role    │ Email                                   │ Password      │');
  console.log('  ├──────────────────────────────────────────────────────────────────┤');
  console.log('  │ ADMIN   │ admin@demo.novabulletin.local           │ Admin@123     │');
  console.log('  │ TEACHER │ kofi.agbesi@demo.novabulletin.local     │ Teacher@123   │');
  console.log('  │ TEACHER │ ama.dossou@demo.novabulletin.local      │ Teacher@123   │');
  console.log('  │ BURSAR  │ bursar@demo.novabulletin.local          │ Bursar@123    │');
  console.log('  │ PARENT  │ parent.edem@demo.novabulletin.local     │ Parent@123    │');
  console.log('  │ PARENT  │ parent.akua@demo.novabulletin.local     │ Parent@123    │');
  console.log('  └──────────────────────────────────────────────────────────────────┘');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
