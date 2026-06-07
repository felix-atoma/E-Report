import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function toCsvRow(values: (string | number | null | undefined)[]): string {
  return values
    .map((v) => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return s.includes(',') || s.includes('\n') || s.includes('"') ? `"${s}"` : s;
    })
    .join(',');
}

function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const bom = '﻿';
  const lines = [toCsvRow(headers), ...rows.map(toCsvRow)];
  return bom + lines.join('\r\n');
}

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Student census ────────────────────────────────────────────────────────

  async studentCensus(institutionId: string): Promise<string> {
    const students = await this.prisma.student.findMany({
      where: { institutionId },
      include: {
        user:    { select: { name: true, email: true } },
        classes: { include: { class: { select: { name: true } } }, take: 1 },
      },
      orderBy: [{ classes: { _count: 'asc' } }, { admissionNumber: 'asc' }],
    });

    const headers = [
      'N° Matricule', 'Nom complet', 'Sexe', 'Date de naissance',
      'Classe', 'Statut', 'Email parent',
    ];

    const rows = students.map((s) => [
      s.admissionNumber ?? '',
      s.user?.name ?? '',
      s.sex ?? '',
      s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('fr-FR') : '',
      s.classes?.[0]?.class?.name ?? '',
      s.studentStatus ?? 'ACTIVE',
      s.user?.email ?? '',
    ]);

    return buildCsv(headers, rows);
  }

  // ── Class results ─────────────────────────────────────────────────────────

  async classResults(institutionId: string, academicYear: string, termName: string): Promise<string> {
    const reports = await (this.prisma as any).reportCard.findMany({
      where: {
        student: { institutionId },
        academicYear,
        termName,
        status: 'PUBLISHED',
      },
      include: {
        student: {
          include: {
            user:    { select: { name: true } },
            classes: { include: { class: { select: { name: true } } }, take: 1 },
          },
        },
      },
      orderBy: { overallAverage: 'desc' },
    });

    const headers = [
      'Rang', 'N° Matricule', 'Nom complet', 'Classe',
      'Année scolaire', 'Trimestre', 'Moyenne /20', 'Mention',
    ];

    const rows = reports.map((r: any, idx: number) => [
      idx + 1,
      r.student?.admissionNumber ?? '',
      r.student?.user?.name ?? '',
      r.student?.classes?.[0]?.class?.name ?? '',
      r.academicYear ?? '',
      r.termName ?? '',
      r.overallAverage != null ? Number(r.overallAverage).toFixed(2) : '',
      r.mention ?? '',
    ]);

    return buildCsv(headers, rows);
  }

  // ── Fee report ────────────────────────────────────────────────────────────

  async feeReport(institutionId: string, academicYear: string): Promise<string> {
    const db = this.prisma as any;

    const fees = await db.studentFee.findMany({
      where: { student: { institutionId }, academicYear },
      include: {
        student: {
          include: {
            user:    { select: { name: true } },
            classes: { include: { class: { select: { name: true } } }, take: 1 },
          },
        },
        fee: { select: { name: true, feeType: true } },
      },
      orderBy: { student: { admissionNumber: 'asc' } },
    });

    const headers = [
      'N° Matricule', 'Nom complet', 'Classe', 'Type de frais',
      'Montant dû (XOF)', 'Exempté', 'Année scolaire',
    ];

    const rows = fees.map((f: any) => [
      f.student?.admissionNumber ?? '',
      f.student?.user?.name ?? '',
      f.student?.classes?.[0]?.class?.name ?? '',
      f.fee?.name ?? '',
      Number(f.amountDue),
      f.isExempt ? 'Oui' : 'Non',
      f.academicYear ?? '',
    ]);

    return buildCsv(headers, rows);
  }
}
