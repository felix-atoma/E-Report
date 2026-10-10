import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { toE164 } from '../../common/utils/phone.util';

export { toE164 };

export interface SmsBulletinPayload {
  toPhone: string;
  studentName: string;
  termName: string;
  academicYear: string;
  average: string;
  mention: string;
  pdfUrl: string | null;
  institutionName: string;
  language?: 'FR' | 'EN';
  /** Pays de l'école : indicatif ajouté aux numéros saisis sans indicatif */
  country?: string | null;
}

/**
 * Envoi de SMS via Twilio (API REST, mêmes identifiants que WhatsApp).
 * Les messages sont écrits sans accents : un seul caractère accentué fait passer le SMS
 * en UCS-2 (70 caractères par segment au lieu de 160) et double le coût.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly provider: 'TWILIO' | 'NONE';
  private readonly twilioSid: string;
  private readonly twilioToken: string;
  private readonly from: string;

  constructor(config: ConfigService) {
    const requested = config.get<string>('SMS_PROVIDER', 'NONE').toUpperCase();
    this.twilioSid   = config.get<string>('TWILIO_ACCOUNT_SID', '');
    this.twilioToken = config.get<string>('TWILIO_AUTH_TOKEN', '');
    // Numéro Twilio (+1…) ou identifiant alphanumérique (ex. « NOVABULL », 11 caractères max)
    this.from        = config.get<string>('TWILIO_SMS_FROM', '');

    if (requested === 'TWILIO' && this.twilioSid && this.twilioToken && this.from) {
      this.provider = 'TWILIO';
      this.logger.log(`SMS provider: Twilio (from ${this.from})`);
    } else {
      this.provider = 'NONE';
      this.logger.warn('SMS not configured — no SMS notifications will be created');
    }
  }

  /** Faux quand aucun fournisseur n'est configuré : aucune notification SMS n'est alors créée. */
  get enabled(): boolean {
    return this.provider !== 'NONE';
  }

  async sendBulletinReady(payload: SmsBulletinPayload): Promise<boolean> {
    return this.send(payload.toPhone, this.buildBulletinMessage(payload), payload.country);
  }

  /** country : pays de l'école, pour les numéros saisis sans indicatif */
  async sendText(toPhone: string, message: string, country?: string | null): Promise<boolean> {
    return this.send(toPhone, toGsm(message), country);
  }

  private async send(toPhone: string, message: string, country?: string | null): Promise<boolean> {
    const to = toE164(toPhone, country);
    if (!to) {
      this.logger.warn(`SMS skipped — invalid phone number "${toPhone}"`);
      return false;
    }
    if (this.provider === 'NONE') {
      this.logger.log(`[DEV SMS] → ${to}: ${message}`);
      return false;
    }

    try {
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${this.twilioSid}/Messages.json`,
        new URLSearchParams({ From: this.from, To: to, Body: message }).toString(),
        {
          auth: { username: this.twilioSid, password: this.twilioToken },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15000,
        },
      );
      this.logger.log(`SMS sent to ${to}`);
      return true;
    } catch (err: any) {
      this.logger.error(`SMS failed for ${to}`, err?.response?.data ?? err?.message);
      return false;
    }
  }

  private buildBulletinMessage(p: SmsBulletinPayload): string {
    const en = p.language === 'EN';
    const parts = en
      ? [
          `${p.institutionName}: ${p.termName} ${p.academicYear} report card for ${p.studentName} is available.`,
          `Average: ${p.average}/20 (${p.mention}).`,
          p.pdfUrl ? `Download: ${p.pdfUrl}` : 'On hold - please settle outstanding school fees.',
        ]
      : [
          `${p.institutionName}: le bulletin du ${p.termName} ${p.academicYear} de ${p.studentName} est disponible.`,
          `Moyenne : ${p.average}/20 (${p.mention}).`,
          p.pdfUrl ? `Telecharger : ${p.pdfUrl}` : 'Bulletin retenu - veuillez regulariser les frais scolaires.',
        ];
    return toGsm(parts.join(' '));
  }
}

/** Supprime accents et caractères hors alphabet GSM-7 (garde le SMS à 160 caractères par segment). */
export function toGsm(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\x7E\n]/g, '');
}

