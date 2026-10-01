import {
  BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import * as mammoth from 'mammoth';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Role } from '../../common/enums/role.enum';
import { CreateExamPaperDto, ExamPaperKind, UpdateExamPaperDto } from './dto/exam-paper.dto';
import { sanitizeExamHtml } from './exam-paper-html';
import { buildExamPaperDocx } from './exam-paper-docx';

/** Fichiers acceptés : PDF, photos (formats lus par l'IA) et Word */
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const MAX_FILES = 10;
export const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

export const KIND_LABELS: Record<ExamPaperKind, string> = {
  DEVOIR_SURVEILLE: 'Devoir surveillé',
  COMPOSITION_MENSUELLE: 'Composition mensuelle',
  COMPOSITION_TRIMESTRIELLE: 'Composition trimestrielle',
  EXAMEN_BLANC: 'Examen blanc',
};

type Actor = { id: string; name?: string; role: Role | string; institutionId: string };

@Injectable()
export class ExamPapersService {
  private readonly logger = new Logger(ExamPapersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** Nom figé de la classe et de la matière (l'en-tête reste juste si elles sont renommées) */
  private async resolveNames(institutionId: string, classId?: string | null, subjectId?: string | null) {
    const [cls, subject] = await Promise.all([
      classId ? this.prisma.class.findFirst({ where: { id: classId, institutionId }, select: { id: true, name: true } }) : null,
      subjectId ? this.prisma.subject.findFirst({ where: { id: subjectId, institutionId }, select: { id: true, nameFr: true } }) : null,
    ]);
    if (classId && !cls) throw new BadRequestException('Classe introuvable');
    if (subjectId && !subject) throw new BadRequestException('Matière introuvable');
    return { className: cls?.name ?? null, subjectName: subject?.nameFr ?? null };
  }

  /**
   * Nouvelle épreuve : les fichiers sont conservés (Cloudinary) puis transcrits par l'IA. Si l'IA
   * échoue (crédit épuisé, illisible…), le brouillon est quand même créé, vide, avec le motif :
   * le professeur peut alors saisir le sujet à la main.
   */
  async create(actor: Actor, dto: CreateExamPaperDto, files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('Ajoutez au moins un fichier (PDF, photo ou Word).');
    if (files.length > MAX_FILES) throw new BadRequestException(`${MAX_FILES} fichiers au maximum.`);
    const total = files.reduce((s, f) => s + f.size, 0);
    if (total > MAX_TOTAL_BYTES) throw new BadRequestException('Fichiers trop lourds (20 Mo au total au maximum).');
    for (const f of files) {
      if (!IMAGE_MIMES.has(f.mimetype) && f.mimetype !== PDF_MIME && f.mimetype !== DOCX_MIME) {
        throw new BadRequestException(
          `« ${f.originalname} » : format non pris en charge. Utilisez un PDF, une photo (JPG, PNG, WEBP) ou un fichier Word (.docx).`,
        );
      }
    }

    const names = await this.resolveNames(actor.institutionId, dto.classId, dto.subjectId);

    // Conservation des fichiers d'origine (consultables par l'administration)
    const sourceFiles: { name: string; url: string | null; mime: string }[] = [];
    for (const f of files) {
      let url: string | null = null;
      if (this.cloudinary.enabled) {
        try {
          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          url = await this.cloudinary.uploadBuffer(f.buffer, 'novabulletin/epreuves', id, IMAGE_MIMES.has(f.mimetype) ? 'image' : 'raw');
        } catch (err: any) {
          this.logger.warn(`Upload épreuve échoué (${f.originalname}) : ${err?.message}`);
        }
      }
      sourceFiles.push({ name: f.originalname, url, mime: f.mimetype });
    }

    // Transcription par l'IA
    let transcription: Awaited<ReturnType<AiService['transcribeExamPaper']>> | null = null;
    let aiError: string | null = null;
    try {
      const docx = files.filter((f) => f.mimetype === DOCX_MIME);
      const extractedText = docx.length
        ? (await Promise.all(docx.map((f) => mammoth.extractRawText({ buffer: f.buffer })))).map((r) => r.value).join('\n\n')
        : undefined;
      transcription = await this.ai.transcribeExamPaper({
        files: files.filter((f) => f.mimetype !== DOCX_MIME).map((f) => ({ mime: f.mimetype, base64: f.buffer.toString('base64') })),
        extractedText,
      });
    } catch (err: any) {
      aiError = err?.message ?? "La transcription par l'IA a échoué.";
    }

    const t = transcription;
    const paper = await this.prisma.examPaper.create({
      data: {
        institutionId: actor.institutionId,
        authorId: actor.id,
        kind: dto.kind as any,
        classId: dto.classId ?? null,
        className: names.className ?? (t?.className || null),
        subjectId: dto.subjectId ?? null,
        subjectName: names.subjectName ?? (t?.subject || null),
        academicYear: dto.academicYear || t?.academicYear || '',
        // Valeurs saisies par le professeur prioritaires sur celles lues par l'IA
        title: dto.title || t?.title || KIND_LABELS[dto.kind],
        duration: dto.duration || t?.duration || null,
        coefficient: dto.coefficient || t?.coefficient || null,
        content: sanitizeExamHtml(t?.contentHtml ?? ''),
        sourceFiles,
      },
    });
    return { paper, aiError, warnings: t?.warnings || null };
  }

  async list(actor: Actor, status?: string) {
    const isAdmin = actor.role === Role.ADMIN;
    return this.prisma.examPaper.findMany({
      where: {
        institutionId: actor.institutionId,
        // Le professeur voit ses épreuves ; l'administration voit celles qui lui ont été soumises
        ...(isAdmin ? { status: status ? (status as any) : { not: 'DRAFT' } } : { authorId: actor.id, ...(status ? { status: status as any } : {}) }),
      },
      orderBy: [{ submittedAt: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true, kind: true, status: true, title: true, className: true, subjectName: true, academicYear: true,
        duration: true, coefficient: true, submittedAt: true, reviewedAt: true, updatedAt: true, adminComment: true,
        author: { select: { id: true, name: true } },
      },
    });
  }

  private async findForActor(actor: Actor, id: string) {
    const paper = await this.prisma.examPaper.findFirst({
      where: { id, institutionId: actor.institutionId },
      include: { author: { select: { id: true, name: true } } },
    });
    if (!paper) throw new NotFoundException('Épreuve introuvable');
    const isAuthor = paper.authorId === actor.id;
    const isAdmin = actor.role === Role.ADMIN;
    if (!isAuthor && !(isAdmin && paper.status !== 'DRAFT')) {
      throw new ForbiddenException("Vous n'avez pas accès à cette épreuve");
    }
    return paper;
  }

  async get(actor: Actor, id: string) {
    const paper = await this.findForActor(actor, id);
    const inst = await this.prisma.institution.findUnique({
      where: { id: actor.institutionId },
      select: { name: true, address: true },
    });
    return { ...paper, institution: inst };
  }

  /** Modification : par l'auteur, tant que l'épreuve est en préparation ou renvoyée pour correction */
  async update(actor: Actor, id: string, dto: UpdateExamPaperDto) {
    const paper = await this.findForActor(actor, id);
    if (paper.authorId !== actor.id) throw new ForbiddenException('Seul le professeur auteur peut modifier cette épreuve');
    if (paper.status !== 'DRAFT' && paper.status !== 'RETURNED') {
      throw new BadRequestException("L'épreuve a déjà été soumise : elle ne peut plus être modifiée.");
    }
    const data: Record<string, unknown> = {};
    if (dto.kind) data.kind = dto.kind;
    if (dto.academicYear !== undefined) data.academicYear = dto.academicYear;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.duration !== undefined) data.duration = dto.duration || null;
    if (dto.coefficient !== undefined) data.coefficient = dto.coefficient || null;
    if (dto.content !== undefined) data.content = sanitizeExamHtml(dto.content);
    if (dto.classId !== undefined || dto.subjectId !== undefined) {
      const names = await this.resolveNames(
        actor.institutionId,
        dto.classId !== undefined ? dto.classId || null : paper.classId,
        dto.subjectId !== undefined ? dto.subjectId || null : paper.subjectId,
      );
      if (dto.classId !== undefined) { data.classId = dto.classId || null; data.className = names.className; }
      if (dto.subjectId !== undefined) { data.subjectId = dto.subjectId || null; data.subjectName = names.subjectName; }
    }
    return this.prisma.examPaper.update({ where: { id }, data });
  }

  async submit(actor: Actor, id: string) {
    const paper = await this.findForActor(actor, id);
    if (paper.authorId !== actor.id) throw new ForbiddenException('Seul le professeur auteur peut soumettre cette épreuve');
    if (paper.status !== 'DRAFT' && paper.status !== 'RETURNED') throw new BadRequestException('Épreuve déjà soumise');
    if (!paper.content.trim()) throw new BadRequestException("Le sujet est vide : complétez l'épreuve avant de la soumettre.");
    return this.prisma.examPaper.update({
      where: { id },
      data: { status: 'SUBMITTED', submittedAt: new Date(), adminComment: null },
    });
  }

  /** Administration : renvoyer au professeur avec les corrections à faire */
  async returnToAuthor(actor: Actor, id: string, comment: string) {
    const paper = await this.findForActor(actor, id);
    if (paper.status !== 'SUBMITTED') throw new BadRequestException("Seule une épreuve soumise peut être renvoyée");
    return this.prisma.examPaper.update({
      where: { id },
      data: { status: 'RETURNED', adminComment: comment, reviewedAt: new Date(), reviewedByName: actor.name ?? null },
    });
  }

  /** Administration : épreuve imprimée */
  async markPrinted(actor: Actor, id: string) {
    const paper = await this.findForActor(actor, id);
    if (paper.status !== 'SUBMITTED') throw new BadRequestException("Seule une épreuve soumise peut être marquée imprimée");
    return this.prisma.examPaper.update({
      where: { id },
      data: { status: 'PRINTED', reviewedAt: new Date(), reviewedByName: actor.name ?? null },
    });
  }

  async remove(actor: Actor, id: string) {
    const paper = await this.findForActor(actor, id);
    if (paper.authorId !== actor.id) throw new ForbiddenException('Seul le professeur auteur peut supprimer cette épreuve');
    if (paper.status === 'SUBMITTED' || paper.status === 'PRINTED') {
      throw new BadRequestException("Une épreuve soumise ou imprimée ne peut pas être supprimée");
    }
    await this.prisma.examPaper.delete({ where: { id } });
    return { message: 'Épreuve supprimée' };
  }

  /** Document Word prêt à imprimer (en-tête de l'école + sujet) */
  async docx(actor: Actor, id: string): Promise<{ buffer: Buffer; filename: string }> {
    const paper = await this.get(actor, id);
    const buffer = await buildExamPaperDocx({
      schoolName: paper.institution?.name ?? '',
      schoolAddress: paper.institution?.address ?? '',
      title: paper.title,
      subjectName: paper.subjectName ?? '',
      academicYear: paper.academicYear,
      className: paper.className ?? '',
      duration: paper.duration ?? '',
      coefficient: paper.coefficient ?? '',
      content: paper.content,
    });
    const safe = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
    const filename = `epreuve-${safe(paper.subjectName ?? 'sujet')}-${safe(paper.className ?? '')}-${safe(paper.title)}.docx`.replace(/-+/g, '-');
    return { buffer, filename };
  }
}
