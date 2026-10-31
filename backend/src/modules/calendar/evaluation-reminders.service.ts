import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { SmsService } from '../sms/sms.service';
import { MailService } from '../mail/mail.service';
import { CalendarService } from './calendar.service';

const DAY_MS = 86400000;
// Après la (fin de la) date de l'évaluation, notes toujours incomplètes : rappel le lendemain, puis
// « en retard » au 3e jour et tous les 3 jours jusqu'au 30e. Calculé sur le jour : pas de doublon à gérer.
const LATE_AFTER = 3;
const REMIND_UNTIL = 30;
const shouldRemind = (daysSinceEnd: number) =>
  daysSinceEnd === 1 || (daysSinceEnd >= LATE_AFTER && daysSinceEnd <= REMIND_UNTIL && daysSinceEnd % 3 === 0);

const TYPE_LABEL: Record<string, string> = {
  INTERROGATION: 'Interrogation', DEVOIR: 'Devoir', COMPOSITION: 'Composition', EXAM: 'Examen',
};

export interface TeacherReminder {
  teacherId: string;
  teacherName: string;
  phone: string | null;
  email: string | null;
  late: boolean;
  lines: string[];
  channels?: string[];
}

/**
 * Rappel quotidien (7 h, heure de Lomé) aux professeurs dont les notes d'une évaluation programmée
 * par l'administration ne sont pas encore saisies (ou, pour la composition, la fiche pas signée) :
 * WhatsApp, sinon SMS, sinon e-mail. Même vérification que l'alerte du tableau de bord.
 */
@Injectable()
export class EvaluationRemindersService {
  private readonly logger = new Logger(EvaluationRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: CalendarService,
    private readonly whatsapp: WhatsAppService,
    private readonly sms: SmsService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  @Cron('0 7 * * *', { name: 'evaluation-reminders', timeZone: 'Africa/Lome' })
  async runDaily() {
    const institutions = await this.prisma.institution.findMany({
      where: { status: 'ACTIVE' as any },
      select: { id: true },
    });
    let sent = 0;
    for (const inst of institutions) {
      const res = await this.run(inst.id, false).catch((e) => {
        this.logger.error(`Rappels d'évaluation (${inst.id}) : ${e.message}`);
        return [] as TeacherReminder[];
      });
      sent += res.filter((r) => r.channels?.length).length;
    }
    this.logger.log(`Rappels d'évaluation : ${sent} professeur(s) prévenu(s)`);
  }

  /** Rappels d'une école ; `dryRun` : seulement la liste de ce qui serait envoyé (aucun message). */
  async run(institutionId: string, dryRun: boolean, at = new Date()): Promise<TeacherReminder[]> {
    const today = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()); // Lomé = UTC
    const [teachers, institution] = await Promise.all([
      this.prisma.user.findMany({
        where: { institutionId, role: 'TEACHER' as any, isActive: true },
        select: { id: true, name: true, email: true, whatsappNumber: true, language: true },
      }),
      this.prisma.institution.findUnique({ where: { id: institutionId }, select: { name: true, country: true } }),
    ]);
    const url = `${this.config.get('FRONTEND_URL', 'https://e-report-frontend.vercel.app')}/teacher`;
    const out: TeacherReminder[] = [];

    for (const teacher of teachers) {
      const evaluations = await this.calendar.myEvaluations(institutionId, teacher.id);
      const items: string[] = [];
      let late = false;
      for (const ev of evaluations) {
        if (ev.complete) continue;
        const end = Date.parse(new Date(ev.endDate ?? ev.startDate).toISOString().slice(0, 10));
        const daysSinceEnd = Math.round((today - end) / DAY_MS);
        if (!shouldRemind(daysSinceEnd)) continue;
        if (daysSinceEnd >= LATE_AFTER) late = true;
        const date = new Date(ev.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
        // Par classe et par manque (notes / signature) : les matières si 3 au plus, sinon leur nombre
        // (message court pour WhatsApp/SMS)
        const groups = new Map<string, string[]>();
        for (const f of ev.fiches.filter((x: any) => !x.complete)) {
          const key = `${f.className}|${f.missing === 'SIGNATURE' ? 'fiche à signer' : 'notes à saisir'}`;
          groups.set(key, [...(groups.get(key) ?? []), f.subjectName]);
        }
        const missing = [...groups].map(([key, subjects]) => {
          const [cls, what] = key.split('|');
          return `${cls}, ${what} (${subjects.length <= 3 ? subjects.join(', ') : `${subjects.length} matières`})`;
        }).join(' ; ');
        items.push(`• ${TYPE_LABEL[ev.type] ?? ev.type} « ${ev.title} » du ${date}${daysSinceEnd >= LATE_AFTER ? ` — en retard de ${daysSinceEnd} jours` : ''} : ${missing}`);
      }
      if (!items.length) continue;

      const head = late ? '⚠️ Notes en retard' : '📝 Notes à saisir';
      const lines = [
        `${head} — ${institution?.name ?? 'NovaBulletin'}`,
        `Bonjour ${teacher.name}, ces fiches de notes ne sont pas encore complètes :`,
        ...items,
      ];
      const reminder: TeacherReminder = {
        teacherId: teacher.id, teacherName: teacher.name, phone: teacher.whatsappNumber, email: teacher.email, late, lines,
      };
      out.push(reminder);
      if (dryRun) continue;

      // WhatsApp (Twilio) refuse au-delà de 1 600 caractères : liste coupée, le détail est sur le tableau de bord
      const footer = `\nSaisissez-les ici : ${url}`;
      let body = lines.join('\n');
      if (body.length + footer.length > 1500) body = `${body.slice(0, 1500 - footer.length - 2)}…`;
      const message = body + footer;
      const channels: string[] = [];
      if (teacher.whatsappNumber && this.whatsapp.enabled
        && await this.whatsapp.sendText(teacher.whatsappNumber, message, institution?.country).catch(() => false)) {
        channels.push('WHATSAPP');
      } else if (teacher.whatsappNumber && this.sms.enabled
        && await this.sms.sendText(teacher.whatsappNumber, message, institution?.country).catch(() => false)) {
        channels.push('SMS');
      }
      if (!channels.length && teacher.email
        && await this.mail.sendEvaluationReminder(teacher.email, lines[0], lines, url, late).catch(() => false)) {
        channels.push('EMAIL');
      }
      reminder.channels = channels;
    }
    return out;
  }
}
