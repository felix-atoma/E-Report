import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parseStudentCardCode, studentCardCode } from '../../common/utils/student-card.util';
import { schoolIdentity } from '../../common/utils/school-identity.util';

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

/** Données des cartes d'élève d'une classe (année de la classe), avec le code QR signé de chaque élève. */
export async function classCardsData(prisma: PrismaService, cls: any, institutionId: string) {
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { name: true, address: true, phone: true, logo: true, crest: true, stamp: true, country: true, brandingSettings: true },
  });
  const branding = (institution?.brandingSettings as Record<string, unknown>) ?? {};
  const ident = schoolIdentity(branding, institution?.name ?? '', cls.level);
  const seen = new Set<string>();
  const students = (cls.students ?? [])
    .filter((cs: any) => !cs.academicYear || cs.academicYear === cls.academicYear)
    .map((cs: any) => cs.student)
    .filter((s: any) => s && !seen.has(s.id) && seen.add(s.id))
    .map((s: any) => ({
      id: s.id,
      name: (s.user?.name ?? s.admissionNumber ?? '').trim(),
      admissionNumber: s.admissionNumber,
      sex: s.sex ?? null,
      dateOfBirth: s.dateOfBirth ?? null,
      photo: s.user?.profileImage ?? null,
      code: studentCardCode(s.id),
    }))
    .sort((a: any, b: any) => collator.compare(a.name, b.name));
  return {
    class: { id: cls.id, name: cls.name.trim(), academicYear: cls.academicYear },
    institution: {
      name: ident.name, address: institution?.address ?? null, phone: institution?.phone ?? null,
      logo: institution?.logo || institution?.crest || null, stamp: institution?.stamp ?? null, country: institution?.country ?? null,
      primaryColor: (branding.primaryColor as string) || '#002347',
      directorSignature: ident.directorSignature,
      directorName: ident.directorName,
    },
    students,
  };
}

/** Vérification publique d'une carte (QR) : informations limitées, jamais de notes ni de contacts. */
export async function verifyStudentCard(prisma: PrismaService, code: string) {
  const id = parseStudentCardCode(code);
  if (!id) throw new NotFoundException('Carte invalide');
  const student = await prisma.student.findUnique({
    where: { id },
    select: {
      admissionNumber: true, sex: true, dateOfBirth: true,
      user: { select: { name: true, profileImage: true } },
      institution: { select: { name: true, logo: true, crest: true, address: true, brandingSettings: true } },
      classes: { select: { academicYear: true, class: { select: { name: true, level: true } } }, orderBy: { academicYear: 'desc' }, take: 1 },
    },
  });
  if (!student) throw new NotFoundException('Carte invalide');
  const enrol = student.classes[0];
  return {
    valid: true,
    name: student.user?.name ?? student.admissionNumber,
    admissionNumber: student.admissionNumber,
    sex: student.sex,
    dateOfBirth: student.dateOfBirth,
    photo: student.user?.profileImage ?? null,
    className: enrol?.class?.name?.trim() ?? null,
    academicYear: enrol?.academicYear ?? null,
    school: { name: schoolIdentity(student.institution?.brandingSettings, student.institution?.name ?? '', enrol?.class?.level).name, logo: student.institution?.logo || student.institution?.crest || null, address: student.institution?.address ?? null },
  };
}
