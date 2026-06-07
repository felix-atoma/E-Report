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
  language?: 'FR' | 'EN';
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly provider: 'META' | 'TWILIO' | 'NONE';
  private readonly ownerWhatsapp: string;

  // Meta
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly apiVersion = 'v18.0';

  // Twilio
  private readonly twilioSid: string;
  private readonly twilioToken: string;
  private readonly twilioFrom: string;

  constructor(private readonly config: ConfigService) {
    this.ownerWhatsapp = config.get<string>('OWNER_WHATSAPP', '');

    const requested = config.get<string>('WHATSAPP_PROVIDER', 'NONE').toUpperCase();

    this.phoneNumberId = config.get<string>('WHATSAPP_PHONE_NUMBER_ID', '');
    this.accessToken   = config.get<string>('WHATSAPP_ACCESS_TOKEN', '');
    this.twilioSid     = config.get<string>('TWILIO_ACCOUNT_SID', '');
    this.twilioToken   = config.get<string>('TWILIO_AUTH_TOKEN', '');
    this.twilioFrom    = config.get<string>('TWILIO_WHATSAPP_FROM', '');

    if (requested === 'TWILIO' && this.twilioSid && this.twilioToken && this.twilioFrom) {
      this.provider = 'TWILIO';
      this.logger.log('WhatsApp provider: Twilio');
    } else if (requested === 'META' && this.phoneNumberId && this.accessToken) {
      this.provider = 'META';
      this.logger.log('WhatsApp provider: Meta Cloud API');
    } else {
      this.provider = 'NONE';
      this.logger.warn('WhatsApp not configured — messages will be logged only');
    }
  }

  async sendBulletinReady(payload: WhatsAppBulletinPayload): Promise<boolean> {
    const message = this.buildMessage(payload);
    return this.send(payload.toPhone, message);
  }

  async sendSchoolRegistration(schoolName: string, city: string): Promise<boolean> {
    if (!this.ownerWhatsapp) {
      this.logger.warn('OWNER_WHATSAPP not configured — skipping');
      return false;
    }
    const message =
      `🏫 New school registered on NovaBulletin\n` +
      `📌 ${schoolName} — ${city}\n` +
      `Log in to the super-admin dashboard to approve.`;
    return this.send(this.ownerWhatsapp, message);
  }

  async sendDocumentMessage(toPhone: string, documentUrl: string, caption: string): Promise<boolean> {
    if (this.provider === 'TWILIO') {
      // Twilio sends docs as a media URL in a regular message
      return this.send(toPhone, `${caption}\n${documentUrl}`);
    }
    if (this.provider === 'META') {
      return this.sendMetaDocument(toPhone, documentUrl, caption);
    }
    this.logger.log(`[DEV WHATSAPP DOC] → ${toPhone}: ${documentUrl}`);
    return true;
  }

  // ─── Private send dispatcher ──────────────────────────────────────────────
  private async send(toPhone: string, message: string): Promise<boolean> {
    const phone = this.normalizePhone(toPhone);

    if (this.provider === 'NONE') {
      this.logger.log(`[DEV WHATSAPP] → ${phone}: ${message}`);
      return true;
    }

    try {
      if (this.provider === 'TWILIO') {
        await this.sendTwilio(phone, message);
      } else {
        await this.sendMeta(phone, message);
      }
      this.logger.log(`WhatsApp sent to ${phone}`);
      return true;
    } catch (err: any) {
      this.logger.error(`WhatsApp failed for ${phone}`, err?.response?.data ?? err?.message);
      return false;
    }
  }

  private async sendTwilio(phone: string, message: string): Promise<void> {
    const to = phone.startsWith('whatsapp:') ? phone : `whatsapp:+${phone}`;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioSid}/Messages.json`;
    const params = new URLSearchParams({
      From: this.twilioFrom,
      To: to,
      Body: message,
    });
    await axios.post(url, params.toString(), {
      auth: { username: this.twilioSid, password: this.twilioToken },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  private async sendMeta(phone: string, message: string): Promise<void> {
    await axios.post(
      `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`,
      { messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: message } },
      { headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' } },
    );
  }

  private async sendMetaDocument(toPhone: string, documentUrl: string, caption: string): Promise<boolean> {
    const phone = this.normalizePhone(toPhone);
    try {
      await axios.post(
        `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`,
        { messaging_product: 'whatsapp', to: phone, type: 'document', document: { link: documentUrl, caption } },
        { headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' } },
      );
      return true;
    } catch (err: any) {
      this.logger.error(`WhatsApp document failed for ${phone}`, err?.response?.data);
      return false;
    }
  }

  private buildMessage(p: WhatsAppBulletinPayload): string {
    const en = p.language === 'EN';
    const lines = en
      ? [
          `📋 *Report card available — ${p.termName} ${p.academicYear}*`,
          `📚 Student: ${p.studentName}`,
          `📊 Average: ${p.average}  |  Grade: ${p.mention}`,
          `🏫 ${p.institutionName}`,
        ]
      : [
          `📋 *Bulletin disponible — ${p.termName} ${p.academicYear}*`,
          `📚 Élève : ${p.studentName}`,
          `📊 Moyenne : ${p.average}  |  Mention : ${p.mention}`,
          `🏫 ${p.institutionName}`,
        ];

    if (p.pdfUrl) {
      lines.push(en
        ? `\n📥 Download: ${p.pdfUrl}`
        : `\n📥 Télécharger : ${p.pdfUrl}`);
    } else {
      lines.push(en
        ? '\n⚠️ Report card on hold — please settle outstanding school fees.'
        : '\n⚠️ Bulletin retenu — veuillez régulariser les frais scolaires.');
    }
    return lines.join('\n');
  }

  private normalizePhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-().+]/g, '');
    if (/^[279]\d{7}$/.test(cleaned)) cleaned = `228${cleaned}`;
    return cleaned;
  }
}
