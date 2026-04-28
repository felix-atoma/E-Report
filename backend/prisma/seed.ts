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
        primaryColor: '#1e40af',
        secondaryColor: '#64748b',
        accentColor: '#f59e0b',
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

  await prisma.user.upsert({
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
