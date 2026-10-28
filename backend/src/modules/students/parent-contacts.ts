import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Contacts des parents d'une classe : nom, téléphone (WhatsApp / SMS) et e-mail. Enregistrer crée ou met à
 * jour le compte parent et le relie à l'élève — c'est ce compte que les notifications utilisent (bulletins,
 * reçus de paiement, rappels, absences). Frères et sœurs avec le même numéro : un seul compte parent.
 */
const digits = (p?: string | null) => String(p ?? '').replace(/\D/g, '');
const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

export async function listParentContacts(prisma: PrismaService, institutionId: string, classId: string) {
  const cls = await prisma.class.findFirst({ where: { id: classId, institutionId }, select: { id: true, name: true, academicYear: true } });
  if (!cls) throw new NotFoundException('Classe introuvable');
  const enrol = await prisma.classStudent.findMany({
    where: { classId, academicYear: cls.academicYear },
    select: {
      student: {
        select: {
          id: true, admissionNumber: true, fatherName: true, fatherPhone: true, motherName: true, motherPhone: true,
          user: { select: { name: true } },
          parent: { select: { id: true, name: true, whatsappNumber: true, email: true } },
        },
      },
    },
  });
  const rows = enrol.map(({ student: s }) => ({
    studentId: s.id,
    name: (s.user?.name ?? s.admissionNumber).trim(),
    admissionNumber: s.admissionNumber,
    parentName: s.parent?.name ?? s.fatherName ?? s.motherName ?? '',
    phone: s.parent?.whatsappNumber ?? s.fatherPhone ?? s.motherPhone ?? '',
    email: s.parent?.email && !/@noreply\.local$/i.test(s.parent.email) ? s.parent.email : '',
    hasAccount: !!s.parent,
  })).sort((a, b) => collator.compare(a.name, b.name));
  return { class: { id: cls.id, name: cls.name.trim(), academicYear: cls.academicYear }, rows };
}

export async function saveParentContacts(
  prisma: PrismaService, institutionId: string,
  rows: Array<{ studentId: string; parentName?: string; phone?: string; email?: string }>,
) {
  let created = 0, updated = 0, linked = 0, skipped = 0;
  const errors: string[] = [];
  for (const r of rows) {
    const phone = String(r.phone ?? '').trim();
    const email = String(r.email ?? '').trim().toLowerCase();
    const parentName = String(r.parentName ?? '').trim();
    if (!phone && !email) { skipped++; continue; }
    if (phone && digits(phone).length < 8) { errors.push(`Numéro invalide : ${phone}`); continue; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errors.push(`E-mail invalide : ${email}`); continue; }

    const student = await prisma.student.findFirst({
      where: { id: r.studentId, institutionId },
      select: { id: true, admissionNumber: true, user: { select: { name: true } }, parent: { select: { id: true, email: true } } },
    });
    if (!student) { skipped++; continue; }
    const studentName = student.user?.name ?? student.admissionNumber;

    try {
      // Compte parent déjà relié : mise à jour
      if (student.parent) {
        const emailFree = email && email !== student.parent.email
          ? !(await prisma.user.findUnique({ where: { email }, select: { id: true } })) : false;
        await prisma.user.update({
          where: { id: student.parent.id },
          data: {
            ...(phone ? { whatsappNumber: phone } : {}),
            ...(parentName ? { name: parentName } : {}),
            ...(emailFree ? { email } : {}),
          },
        });
        updated++;
        continue;
      }

      // Même parent pour un frère / une sœur : même e-mail, ou même numéro dans l'école
      let parent = email ? await prisma.user.findFirst({ where: { email, institutionId, role: 'PARENT' as any }, select: { id: true } }) : null;
      if (!parent && phone) {
        const candidates = await prisma.user.findMany({
          where: { institutionId, role: 'PARENT' as any, whatsappNumber: { not: null } },
          select: { id: true, whatsappNumber: true },
        });
        const d = digits(phone).slice(-8);
        parent = candidates.find((c) => digits(c.whatsappNumber).slice(-8) === d) ?? null;
      }
      if (parent) {
        await prisma.student.update({ where: { id: student.id }, data: { parentId: parent.id } });
        linked++;
        continue;
      }

      // Nouveau compte parent (connexion possible plus tard avec l'e-mail, s'il est fourni)
      let finalEmail = email;
      if (!finalEmail || await prisma.user.findUnique({ where: { email: finalEmail }, select: { id: true } })) {
        finalEmail = `parent-${digits(phone) || crypto.randomUUID().slice(0, 8)}-${student.admissionNumber}@noreply.local`.toLowerCase();
      }
      const user = await prisma.user.create({
        data: {
          name: parentName || `Parent de ${studentName}`,
          email: finalEmail,
          password: await bcrypt.hash(crypto.randomUUID(), 10),
          role: 'PARENT' as any,
          whatsappNumber: phone || null,
          institutionId,
          mustChangePassword: true,
        },
        select: { id: true },
      });
      await prisma.student.update({ where: { id: student.id }, data: { parentId: user.id } });
      created++;
    } catch (e: any) {
      errors.push(`${studentName} : ${e?.message ?? 'erreur'}`);
    }
  }
  if (!created && !updated && !linked && errors.length) throw new BadRequestException(errors.slice(0, 5).join(' · '));
  return { created, updated, linked, skipped, errors };
}
