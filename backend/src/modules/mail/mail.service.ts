import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as sgMail from '@sendgrid/mail';

// Re-export config reference for the owner email default
const OWNER_EMAIL_DEFAULT = 'atomafelix2@gmail.com';

export interface MailPayload {
  to: string;
  studentName: string;
  termName: string;
  academicYear: string;
  average: string;
  mention: string;
  pdfUrl: string | null;
  institutionName: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly fromEmail: string;
  private readonly ownerEmail: string;
  private readonly provider: 'sendgrid' | 'smtp' | 'none';
  private smtpTransport: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    this.fromEmail = config.get<string>('MAIL_FROM', 'noreply@novabulletin.local');
    this.ownerEmail = config.get<string>('OWNER_EMAIL', OWNER_EMAIL_DEFAULT);
    const sendgridKey = config.get<string>('SENDGRID_API_KEY', '');
    const smtpHost = config.get<string>('SMTP_HOST', '');

    if (sendgridKey && sendgridKey !== 'your_sendgrid_key') {
      sgMail.setApiKey(sendgridKey);
      this.provider = 'sendgrid';
      this.logger.log('Mail provider: SendGrid');
    } else if (smtpHost) {
      this.smtpTransport = nodemailer.createTransport({
        host: smtpHost,
        port: config.get<number>('SMTP_PORT', 587),
        secure: config.get<boolean>('SMTP_SECURE', false),
        auth: {
          user: config.get<string>('SMTP_USER', ''),
          pass: config.get<string>('SMTP_PASS', ''),
        },
      });
      this.provider = 'smtp';
      this.logger.log('Mail provider: SMTP');
    } else {
      this.provider = 'none';
      this.logger.warn('No mail provider configured — emails will be logged only');
    }
  }

  async sendBulletinReady(payload: MailPayload): Promise<boolean> {
    const subject = `Bulletin disponible — ${payload.termName} ${payload.academicYear}`;
    const html = this.buildBulletinEmail(payload);

    this.logger.log(`Sending bulletin email to ${payload.to}`);

    try {
      if (this.provider === 'sendgrid') {
        await sgMail.send({
          to: payload.to,
          from: this.fromEmail,
          subject,
          html,
        });
      } else if (this.provider === 'smtp' && this.smtpTransport) {
        await this.smtpTransport.sendMail({
          from: this.fromEmail,
          to: payload.to,
          subject,
          html,
        });
      } else {
        this.logger.log(`[DEV EMAIL] To: ${payload.to} | Subject: ${subject}`);
        return true;
      }
      this.logger.log(`Email sent to ${payload.to}`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email to ${payload.to}`, err);
      return false;
    }
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<boolean> {
    const subject = 'Réinitialisation de votre mot de passe — NovaBulletin';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1e3a8a;">Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p>Cliquez sur le lien ci-dessous (valable 1 heure) :</p>
        <a href="${resetUrl}" style="display:inline-block;background:#1e3a8a;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;margin:16px 0;">
          Réinitialiser mon mot de passe
        </a>
        <p style="color:#6b7280;font-size:12px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      </div>`;

    try {
      if (this.provider === 'sendgrid') {
        await sgMail.send({ to, from: this.fromEmail, subject, html });
      } else if (this.provider === 'smtp' && this.smtpTransport) {
        await this.smtpTransport.sendMail({ from: this.fromEmail, to, subject, html });
      } else {
        this.logger.log(`[DEV EMAIL] Password reset for ${to}: ${resetUrl}`);
      }
      return true;
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${to}`, err);
      return false;
    }
  }

  async sendSchoolRegistration(
    schoolName: string,
    city: string,
    adminEmail: string,
  ): Promise<boolean> {
    const to = this.ownerEmail;
    const subject = 'Nouvelle inscription école — NovaBulletin';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
        <div style="background:#1e3a8a;color:#fff;padding:16px 20px;">
          <h2 style="margin:0;">Nouvelle inscription école</h2>
          <p style="margin:4px 0 0;opacity:0.85;">NovaBulletin — Tableau de bord super-admin</p>
        </div>
        <div style="padding:20px;">
          <p>Une nouvelle école vient de s'inscrire sur NovaBulletin et attend votre validation.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr>
              <td style="padding:8px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;">Nom de l'école</td>
              <td style="padding:8px;border:1px solid #e5e7eb;">${schoolName}</td>
            </tr>
            <tr>
              <td style="padding:8px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;">Ville / Commune</td>
              <td style="padding:8px;border:1px solid #e5e7eb;">${city}</td>
            </tr>
            <tr>
              <td style="padding:8px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;">Email administrateur</td>
              <td style="padding:8px;border:1px solid #e5e7eb;">${adminEmail}</td>
            </tr>
          </table>
          <p>Connectez-vous au tableau de bord super-admin pour approuver, suspendre ou rejeter cette demande.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
          <p style="color:#6b7280;font-size:11px;">NovaBulletin — Notification automatique</p>
        </div>
      </div>`;

    this.logger.log(`Sending school registration notification to owner: ${to}`);
    try {
      if (this.provider === 'sendgrid') {
        await sgMail.send({ to, from: this.fromEmail, subject, html });
      } else if (this.provider === 'smtp' && this.smtpTransport) {
        await this.smtpTransport.sendMail({ from: this.fromEmail, to, subject, html });
      } else {
        this.logger.log(
          `[DEV EMAIL] School registration — ${schoolName} (${city}) — admin: ${adminEmail}`,
        );
        return true;
      }
      this.logger.log(`School registration email sent to owner`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send school registration email`, err);
      return false;
    }
  }

  async sendSchoolApproval(
    adminName: string,
    adminEmail: string,
    schoolName: string,
  ): Promise<boolean> {
    const subject = `✅ Votre école a été approuvée — NovaBulletin`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
        <div style="background:#15803d;color:#fff;padding:16px 20px;">
          <h2 style="margin:0;">Compte activé !</h2>
          <p style="margin:4px 0 0;opacity:0.85;">NovaBulletin — Gestion scolaire</p>
        </div>
        <div style="padding:20px;">
          <p>Bonjour <strong>${adminName}</strong>,</p>
          <p>Votre demande d'inscription pour l'établissement <strong>${schoolName}</strong> a été <strong style="color:#15803d;">approuvée</strong>.</p>
          <p>Vous pouvez maintenant vous connecter à votre espace administrateur avec votre email et votre mot de passe.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
          <p style="color:#6b7280;font-size:11px;">NovaBulletin — Notification automatique</p>
        </div>
      </div>`;

    this.logger.log(`Sending approval email to admin: ${adminEmail}`);
    try {
      if (this.provider === 'sendgrid') {
        await sgMail.send({ to: adminEmail, from: this.fromEmail, subject, html });
      } else if (this.provider === 'smtp' && this.smtpTransport) {
        await this.smtpTransport.sendMail({ from: this.fromEmail, to: adminEmail, subject, html });
      } else {
        this.logger.log(`[DEV EMAIL] Approval email → ${adminEmail} (${schoolName})`);
        return true;
      }
      return true;
    } catch (err) {
      this.logger.error(`Failed to send approval email to ${adminEmail}`, err);
      return false;
    }
  }

  async sendWelcomeOtp(to: string, name: string, otp: string, institutionName: string): Promise<boolean> {
    const subject = `Bienvenue sur NovaBulletin — Votre code de première connexion`;
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:#1e3a8a;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">NovaBulletin</h1>
          <p style="color:#93c5fd;margin:4px 0 0;">${institutionName}</p>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:32px;border-radius:0 0 8px 8px;">
          <h2 style="color:#1e3a8a;margin-top:0;">Bonjour ${name} 👋</h2>
          <p style="color:#374151;">Votre compte NovaBulletin a été créé par l'administration.</p>
          <p style="color:#374151;">Utilisez le code ci-dessous pour votre première connexion :</p>
          <div style="text-align:center;margin:28px 0;">
            <div style="display:inline-block;background:#f1f5f9;border:2px dashed #6366f1;border-radius:12px;padding:16px 40px;">
              <span style="font-size:36px;font-weight:900;letter-spacing:10px;color:#1e3a8a;font-family:'Courier New',monospace;">${otp}</span>
            </div>
            <p style="color:#6b7280;font-size:13px;margin-top:10px;">⏱ Ce code expire dans <strong>24 heures</strong></p>
          </div>
          <p style="color:#374151;">Connectez-vous sur <a href="${frontendUrl}/login-otp" style="color:#6366f1;font-weight:600;">${frontendUrl}/login-otp</a> avec votre adresse email et ce code.</p>
          <p style="color:#374151;">Vous serez ensuite invité(e) à définir votre propre mot de passe.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
          <p style="color:#9ca3af;font-size:12px;">Si vous n'attendiez pas ce message, ignorez cet email.</p>
        </div>
      </div>`;

    try {
      if (this.provider === 'sendgrid') {
        await sgMail.send({ to, from: this.fromEmail, subject, html });
      } else if (this.provider === 'smtp' && this.smtpTransport) {
        await this.smtpTransport.sendMail({ from: this.fromEmail, to, subject, html });
      } else {
        this.logger.log(`[DEV OTP] To: ${to} | Name: ${name} | OTP: ${otp}`);
        return true;
      }
      return true;
    } catch (err) {
      this.logger.error(`Failed to send welcome OTP to ${to}`, err);
      return false;
    }
  }

  private buildBulletinEmail(p: MailPayload): string {
    const pdfSection = p.pdfUrl
      ? `<a href="${p.pdfUrl}" style="display:inline-block;background:#1e3a8a;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;margin-top:12px;">
           Télécharger le bulletin (PDF)
         </a>`
      : `<p style="color:#dc2626;margin-top:8px;">
           Le bulletin sera disponible dès que le solde des frais sera réglé.
         </p>`;

    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
        <div style="background:#1e3a8a;color:#fff;padding:16px 20px;">
          <h2 style="margin:0;">Bulletin de Notes — ${p.termName}</h2>
          <p style="margin:4px 0 0;opacity:0.85;">${p.institutionName}</p>
        </div>
        <div style="padding:20px;">
          <p>Bonjour,</p>
          <p>Le bulletin de <strong>${p.studentName}</strong> pour <strong>${p.termName} ${p.academicYear}</strong> est disponible.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr>
              <td style="padding:8px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;">Moyenne générale</td>
              <td style="padding:8px;border:1px solid #e5e7eb;">${p.average}</td>
            </tr>
            <tr>
              <td style="padding:8px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;">Mention</td>
              <td style="padding:8px;border:1px solid #e5e7eb;">${p.mention}</td>
            </tr>
          </table>
          ${pdfSection}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
          <p style="color:#6b7280;font-size:11px;">NovaBulletin — ${p.institutionName}</p>
        </div>
      </div>`;
  }
}
