import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface WhatsAppBulletinPayload {
  toPhone: string;
  studentName: string;
  termName: string;
  academicYear: string;
  average: string;
  mention: string;
  pdfUrl: string | null;
  institutionName: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly ownerWhatsapp: string;
  private readonly apiVersion = 'v18.0';
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.phoneNumberId = config.get<string>('WHATSAPP_PHONE_NUMBER_ID', '');
    this.accessToken = config.get<string>('WHATSAPP_ACCESS_TOKEN', '');
    this.ownerWhatsapp = config.get<string>('OWNER_WHATSAPP', '');
    this.enabled = !!(this.phoneNumberId && this.accessToken &&
      this.accessToken !== 'your_whatsapp_token');

    if (this.enabled) {
      this.logger.log('WhatsApp provider: Meta Cloud API');
    } else {
      this.logger.warn('WhatsApp not configured — messages will be logged only');
    }
  }

  async sendBulletinReady(payload: WhatsAppBulletinPayload): Promise<boolean> {
    const message = this.buildMessage(payload);
    const phone = this.normalizePhone(payload.toPhone);

    this.logger.log(`Sending WhatsApp to ${phone}`);

    if (!this.enabled) {
      this.logger.log(`[DEV WHATSAPP] → ${phone}: ${message}`);
      return true;
    }

    try {
      await axios.post(
        `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      this.logger.log(`WhatsApp sent to ${phone}`);
      return true;
    } catch (err: any) {
      const detail = err?.response?.data ?? err?.message;
      this.logger.error(`WhatsApp failed for ${phone}`, detail);
      return false;
    }
  }

  async sendSchoolRegistration(schoolName: string, city: string): Promise<boolean> {
    const phone = this.normalizePhone(this.ownerWhatsapp);
    const message =
      `🏫 Nouvelle école inscrite sur NovaBulletin\n` +
      `📌 ${schoolName} — ${city}\n` +
      `Connectez-vous au tableau de bord super-admin pour approuver.`;

    if (!this.ownerWhatsapp) {
      this.logger.warn('OWNER_WHATSAPP not configured — skipping WhatsApp notification');
      return false;
    }

    if (!this.enabled) {
      this.logger.log(`[DEV WHATSAPP] → ${phone}: ${message}`);
      return true;
    }

    try {
      await axios.post(
        `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      this.logger.log(`School registration WhatsApp sent to owner`);
      return true;
    } catch (err: any) {
      const detail = err?.response?.data ?? err?.message;
      this.logger.error(`School registration WhatsApp failed`, detail);
      return false;
    }
  }

  async sendDocumentMessage(toPhone: string, documentUrl: string, caption: string): Promise<boolean> {
    const phone = this.normalizePhone(toPhone);

    if (!this.enabled) {
      this.logger.log(`[DEV WHATSAPP DOCUMENT] → ${phone}: ${documentUrl}`);
      return true;
    }

    try {
      await axios.post(
        `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'document',
          document: { link: documentUrl, caption },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return true;
    } catch (err: any) {
      this.logger.error(`WhatsApp document send failed for ${phone}`, err?.response?.data);
      return false;
    }
  }

  private buildMessage(p: WhatsAppBulletinPayload): string {
    const lines = [
      `📋 *Bulletin disponible — ${p.termName} ${p.academicYear}*`,
      `📚 Élève : ${p.studentName}`,
      `📊 Moyenne : ${p.average}  |  Mention : ${p.mention}`,
      `🏫 ${p.institutionName}`,
    ];

    if (p.pdfUrl) {
      lines.push(`\n📥 Télécharger : ${p.pdfUrl}`);
    } else {
      lines.push('\n⚠️ Bulletin retenu — veuillez régulariser les frais scolaires pour y accéder.');
    }

    return lines.join('\n');
  }

  private normalizePhone(phone: string): string {
    // Strip spaces, dashes; ensure international format (no leading +)
    let cleaned = phone.replace(/[\s\-().]/g, '');
    if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
    // If Togolese local (8 digits starting with 9/2/7): prepend 228
    if (/^[279]\d{7}$/.test(cleaned)) cleaned = `228${cleaned}`;
    return cleaned;
  }
}
