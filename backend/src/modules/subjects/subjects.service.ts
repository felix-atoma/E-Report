import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

// Articles and prepositions to skip when building initials
const STOP_WORDS = new Set([
  'de', 'du', 'des', 'd', 'la', 'le', 'les', 'l',
  'et', 'ou', 'au', 'aux', 'un', 'une', 'en', 'à', 'a',
]);

function deriveCode(name: string): string {
  // Strip diacritics, lower-case, split on spaces and hyphens
  const words = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[\s\-_/]+/)
    .filter(Boolean);

  const significant = words.filter((w) => !STOP_WORDS.has(w));
  const base = significant.length > 0 ? significant : words;

  let code: string;
  if (base.length === 1) {
    // Single word → first 4 consonant-anchored chars (drop leading vowels after first char)
    code = base[0].slice(0, 4);
  } else {
    // Multiple words → first letter of each, up to 6
    code = base.map((w) => w[0]).join('').slice(0, 6);
  }

  return code.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'SUB';
}

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(institutionId: string) {
    return this.prisma.subject.findMany({
      where: { institutionId, isActive: true },
      orderBy: [{ category: 'asc' }, { nameFr: 'asc' }],
    });
  }

  async findOne(id: string, institutionId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, institutionId },
      include: {
        classSubjects: {
          include: {
            class: { select: { id: true, name: true, academicYear: true } },
            teacher: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    return subject;
  }

  async create(dto: CreateSubjectDto, institutionId: string) {
    const nameEn = dto.nameEn || dto.nameFr;
    const base   = dto.code ? dto.code.toUpperCase() : deriveCode(dto.nameFr);

    // Ensure uniqueness within the institution — append suffix if needed
    let code = base;
    let suffix = 2;
    while (await this.prisma.subject.findUnique({
      where: { institutionId_code: { institutionId, code } },
    })) {
      if (dto.code) throw new ConflictException(`Subject code '${code}' already exists`);
      code = `${base}${suffix}`;
      suffix++;
    }

    return this.prisma.subject.create({
      data: { ...dto, nameEn, code, institutionId },
    });
  }

  async update(id: string, dto: UpdateSubjectDto, institutionId: string) {
    await this.ensureExists(id, institutionId);

    if (dto.code) {
      const conflict = await this.prisma.subject.findFirst({
        where: { institutionId, code: dto.code, NOT: { id } },
      });
      if (conflict) throw new ConflictException(`Subject code '${dto.code}' already exists`);
    }

    return this.prisma.subject.update({ where: { id }, data: dto });
  }

  async deactivate(id: string, institutionId: string) {
    await this.ensureExists(id, institutionId);
    return this.prisma.subject.update({ where: { id }, data: { isActive: false } });
  }

  async bulkRemove(ids: string[], institutionId: string) {
    for (const id of ids) {
      try { await this.remove(id, institutionId); } catch { /* skip already-deleted or not-found */ }
    }
    return { deleted: ids.length };
  }

  async remove(id: string, institutionId: string) {
    await this.ensureExists(id, institutionId);
    await this.prisma.$transaction([
      this.prisma.timetableSlot.deleteMany({ where: { subjectId: id } }),
      this.prisma.subjectHoursLog.deleteMany({ where: { subjectId: id } }),
      this.prisma.subjectProgram.deleteMany({ where: { subjectId: id } }),
      this.prisma.gradeFiche.deleteMany({ where: { subjectId: id } }),
      this.prisma.grade.deleteMany({ where: { subjectId: id } }),
      this.prisma.classSubject.deleteMany({ where: { subjectId: id } }),
      this.prisma.subject.delete({ where: { id } }),
    ]);
    return { message: 'Subject deleted' };
  }

  private async ensureExists(id: string, institutionId: string) {
    const s = await this.prisma.subject.findFirst({ where: { id, institutionId } });
    if (!s) throw new NotFoundException('Subject not found');
  }
}
