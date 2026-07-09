import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { UpdateAcademicSettingsDto } from './dto/update-academic-settings.dto';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';
import { encryptSecret } from '../../common/utils/crypto.util';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const createZip: (fmt: string, opts?: object) => NodeJS.ReadWriteStream & {
  append(src: string | Buffer, opts: { name: string }): void;
  finalize(): void;
} = require('archiver');
import { PassThrough } from 'stream';

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))];
  return lines.join('\r\n');
}

@Injectable()
export class InstitutionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      include: { brandingAssets: true },
    });
    if (!institution) throw new NotFoundException('Institution not found');
    return institution;
  }

  async update(institutionId: string, dto: UpdateInstitutionDto) {
    const existing = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true, brandingSettings: true },
    });
    if (!existing) throw new NotFoundException('Institution not found');

    const { circonscription, ...rest } = dto;
    const mergedBranding = {
      ...((existing.brandingSettings as Record<string, unknown>) ?? {}),
      ...(circonscription !== undefined && { circonscription }),
    };

    return this.prisma.institution.update({
      where: { id: institutionId },
      data: {
        ...rest,
        brandingSettings: mergedBranding as any,
      },
    });
  }

  async updateBranding(institutionId: string, dto: UpdateBrandingDto) {
    const existing = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { brandingSettings: true },
    });
    if (!existing) throw new NotFoundException('Institution not found');

    // Merge color/favicon fields into the brandingSettings JSON blob
    const currentBranding = (existing.brandingSettings as Record<string, unknown>) ?? {};
    const mergedBranding: Record<string, unknown> = { ...currentBranding, ...(dto.brandingSettings ?? {}) };
    if (dto.primaryColor !== undefined)      mergedBranding.primaryColor      = dto.primaryColor;
    if (dto.secondaryColor !== undefined)    mergedBranding.secondaryColor    = dto.secondaryColor;
    if (dto.faviconUrl !== undefined)        mergedBranding.faviconUrl        = dto.faviconUrl;
    if (dto.circonscription !== undefined)   mergedBranding.circonscription   = dto.circonscription;
    if (dto.bulletinFontFamily !== undefined) mergedBranding.bulletinFontFamily = dto.bulletinFontFamily;
    if (dto.bulletinFontSize   !== undefined) mergedBranding.bulletinFontSize   = dto.bulletinFontSize;
    if (dto.bulletinH1Size     !== undefined) mergedBranding.bulletinH1Size     = dto.bulletinH1Size;
    if (dto.bulletinH1Weight   !== undefined) mergedBranding.bulletinH1Weight   = dto.bulletinH1Weight;
    if (dto.bulletinH2Size     !== undefined) mergedBranding.bulletinH2Size     = dto.bulletinH2Size;
    if (dto.bulletinH2Weight   !== undefined) mergedBranding.bulletinH2Weight   = dto.bulletinH2Weight;
    if (dto.bulletinH3Size     !== undefined) mergedBranding.bulletinH3Size     = dto.bulletinH3Size;
    if (dto.bulletinH3Weight   !== undefined) mergedBranding.bulletinH3Weight   = dto.bulletinH3Weight;

    return this.prisma.institution.update({
      where: { id: institutionId },
      data: {
        ...(dto.logo    !== undefined && { logo:  dto.logo }),
        ...(dto.logoUrl !== undefined && { logo:  dto.logoUrl }),
        ...(dto.crest   !== undefined && { crest: dto.crest }),
        ...(dto.stamp   !== undefined && { stamp: dto.stamp }),
        ...(dto.schoolMotto !== undefined && { motto:    dto.schoolMotto }),
        ...(dto.address     !== undefined && { address:  dto.address }),
        ...(dto.phone       !== undefined && { phone:    dto.phone }),
        ...(dto.website     !== undefined && { website:  dto.website }),
        brandingSettings: mergedBranding as any,
      },
    });
  }

  async updateAcademicSettings(institutionId: string, dto: UpdateAcademicSettingsDto) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { academicSettings: true },
    });
    if (!institution) throw new NotFoundException('Institution not found');

    const current = (institution.academicSettings as Record<string, unknown>) ?? {};
    const merged = { ...current, ...dto } as Record<string, unknown>;

    return this.prisma.institution.update({
      where: { id: institutionId },
      data: { academicSettings: merged as object },
    });
  }

  /** Redacted view — the hash key is write-only and never returned. */
  async getPaymentSettings(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { notchpayPublicKey: true, notchpayHashKeyEnc: true },
    });
    if (!institution) throw new NotFoundException('Institution not found');

    return {
      notchpayPublicKey: institution.notchpayPublicKey ?? '',
      notchpayHashKeyConfigured: !!institution.notchpayHashKeyEnc,
    };
  }

  async updatePaymentSettings(institutionId: string, dto: UpdatePaymentSettingsDto) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true },
    });
    if (!institution) throw new NotFoundException('Institution not found');

    const data: Prisma.InstitutionUpdateInput = {};
    if (dto.notchpayPublicKey !== undefined) data.notchpayPublicKey = dto.notchpayPublicKey || null;
    if (dto.notchpayHashKey)  data.notchpayHashKeyEnc = encryptSecret(dto.notchpayHashKey);

    await this.prisma.institution.update({ where: { id: institutionId }, data });
    return this.getPaymentSettings(institutionId);
  }

  async exportAllData(institutionId: string): Promise<Buffer> {
    const institution = await this.prisma.institution.findUnique({ where: { id: institutionId } });
    if (!institution) throw new NotFoundException('Institution not found');

    const [students, classes, subjects, reportCards, payments] = await Promise.all([
      this.prisma.student.findMany({
        where: { institutionId },
        include: {
          user: { select: { name: true, email: true } },
          classes: { include: { class: { select: { name: true, academicYear: true } } } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.class.findMany({
        where: { institutionId },
        include: { teacher: { select: { name: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.subject.findMany({
        where: { institutionId },
        orderBy: { nameFr: 'asc' },
      }),
      this.prisma.reportCard.findMany({
        where: { class: { institutionId } },
        include: {
          student: { include: { user: { select: { name: true } } } },
          class: { select: { name: true } },
          grades: { include: { subject: { select: { nameFr: true } } } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: { institutionId },
        include: {
          student: { include: { user: { select: { name: true } } } },
        },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);

    const institutionCsv = toCsv([{
      Nom: institution.name,
      Pays: institution.country ?? '',
      'Devise nationale': institution.countryMotto ?? '',
      Adresse: institution.address ?? '',
      Téléphone: institution.phone ?? '',
      Email: institution.email ?? '',
      'Site web': institution.website ?? '',
      'Slogan': institution.motto ?? '',
    }]);

    const studentsCsv = toCsv(students.map((s) => {
      const latestClass = s.classes.sort((a, b) => b.academicYear.localeCompare(a.academicYear))[0];
      return {
        Matricule: s.admissionNumber,
        Nom: s.user?.name ?? '',
        Email: s.user?.email ?? '',
        'Date de naissance': s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('fr-FR') : '',
        Sexe: s.sex ?? '',
        Classe: latestClass?.class.name ?? '',
        'Année scolaire': latestClass?.class.academicYear ?? '',
        'Date inscription': new Date(s.enrollmentDate).toLocaleDateString('fr-FR'),
      };
    }));

    const classesCsv = toCsv(classes.map((c) => ({
      Nom: c.name,
      Niveau: c.level,
      Série: c.series ?? '',
      'Année scolaire': c.academicYear,
      'Professeur principal': c.teacher?.name ?? '',
      Capacité: c.capacity ?? '',
      Salle: c.room ?? '',
    })));

    const subjectsCsv = toCsv(subjects.map((s) => ({
      'Nom (FR)': s.nameFr,
      'Nom (EN)': s.nameEn,
      Code: s.code,
      Catégorie: s.category ?? '',
      Département: s.department ?? '',
      'Note de passage': s.passMark,
    })));

    const reportCardsCsv = toCsv(reportCards.map((r) => ({
      Élève: r.student.user?.name ?? r.student.admissionNumber,
      Matricule: r.student.admissionNumber,
      Classe: r.class.name,
      'Année scolaire': r.academicYear,
      Trimestre: r.termName,
      Statut: r.status,
      'Moyenne générale': r.overallAverage ?? '',
      Rang: r.classRank ?? '',
      'Effectif classe': r.classSize ?? '',
      Mention: r.mention ?? '',
      Conduite: r.conductRating ?? '',
      'Moy. classe': r.classAverage ?? '',
      'Plus forte moy.': r.classHighest ?? '',
      'Plus faible moy.': r.classLowest ?? '',
    })));

    const gradesCsv = toCsv(reportCards.flatMap((r) =>
      r.grades.map((g) => ({
        Élève: r.student.user?.name ?? r.student.admissionNumber,
        Matricule: r.student.admissionNumber,
        Classe: r.class.name,
        'Année scolaire': r.academicYear,
        Trimestre: r.termName,
        Matière: g.subject.nameFr,
        Interro1: g.noteInterro1 ?? '',
        Interro2: g.noteInterro2 ?? '',
        Interro3: g.noteInterro3 ?? '',
        Interro4: g.noteInterro4 ?? '',
        Devoir: g.noteDevoir ?? '',
        Composition: g.noteComposition ?? '',
        Moyenne: g.moyenneMatiere ?? '',
        Coefficient: g.coefficient,
        Points: g.weightedScore ?? '',
        Rang: g.rangMatiere ?? '',
        Appréciation: g.appreciation ?? '',
      })),
    ));

    const paymentsCsv = toCsv(payments.map((p) => ({
      Élève: p.student.user?.name ?? p.student.admissionNumber,
      Matricule: p.student.admissionNumber,
      'Année scolaire': p.academicYear,
      Trimestre: p.term ?? '',
      Montant: Number(p.amount),
      Devise: 'XOF',
      Méthode: p.paymentMethod,
      'N° reçu': p.receiptNumber,
      'N° référence': p.referenceNumber ?? '',
      Date: new Date(p.paymentDate).toLocaleDateString('fr-FR'),
      Notes: p.notes ?? '',
    })));

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const pass = new PassThrough();
      pass.on('data', (chunk) => chunks.push(chunk));
      pass.on('end', () => resolve(Buffer.concat(chunks)));
      pass.on('error', reject);

      const zip = createZip('zip', { zlib: { level: 6 } });
      zip.on('error', reject);
      zip.pipe(pass);

      const exportDate = new Date().toISOString().slice(0, 10);
      const prefix = `${institution.name.replace(/[^a-z0-9]/gi, '_')}_${exportDate}`;

      zip.append(institutionCsv, { name: `${prefix}/institution.csv` });
      zip.append(studentsCsv,    { name: `${prefix}/eleves.csv` });
      zip.append(classesCsv,     { name: `${prefix}/classes.csv` });
      zip.append(subjectsCsv,    { name: `${prefix}/matieres.csv` });
      zip.append(reportCardsCsv, { name: `${prefix}/bulletins.csv` });
      zip.append(gradesCsv,      { name: `${prefix}/notes.csv` });
      zip.append(paymentsCsv,    { name: `${prefix}/paiements.csv` });
      zip.finalize();
    });
  }

  private async ensureExists(institutionId: string) {
    const exists = await this.prisma.institution.findUnique({ where: { id: institutionId } });
    if (!exists) throw new NotFoundException('Institution not found');
  }
}
