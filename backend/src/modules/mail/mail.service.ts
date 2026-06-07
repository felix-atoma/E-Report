import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

const OWNER_EMAIL_DEFAULT = 'felixatoma2@gmail.com';

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

interface SendParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly fromEmail: string;
  private readonly from: { name: string; email: string };
  private readonly fromSmtp: string;
  private readonly ownerEmail: string;
  private readonly provider: 'sendgrid' | 'smtp' | 'none';
  private smtpTransport: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    this.fromEmail = config.get<string>('MAIL_FROM', 'noreply@novabulletin.local');
    this.from = { name: 'NovaBulletin', email: this.fromEmail };
    this.fromSmtp = `NovaBulletin <${this.fromEmail}>`;
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

  // ─── Central send helper — adds deliverability headers to every email ───────
  private async send({ to, subject, html, text }: SendParams): Promise<boolean> {
    try {
      if (this.provider === 'sendgrid') {
        await sgMail.send({
          to,
          from: this.from,
          replyTo: this.fromEmail,
          subject,
          html,
          text,
          headers: {
            'List-Unsubscribe': `<mailto:${this.fromEmail}?subject=unsubscribe>`,
            'X-Entity-Ref-ID': `novabulletin-${Date.now()}`,
          },
        });
      } else if (this.provider === 'smtp' && this.smtpTransport) {
        await this.smtpTransport.sendMail({
          from: this.fromSmtp,
          to,
          replyTo: this.fromEmail,
          subject,
          html,
          text,
          headers: {
            'List-Unsubscribe': `<mailto:${this.fromEmail}?subject=unsubscribe>`,
          },
        });
      } else {
        this.logger.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
        return true;
      }
      this.logger.log(`Email sent to ${to} | ${subject}`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}`, err);
      return false;
    }
  }

  // ─── Bulletin ready ──────────────────────────────────────────────────────────
  async sendBulletinReady(payload: MailPayload): Promise<boolean> {
    const subject = `Bulletin de notes disponible - ${payload.termName} ${payload.academicYear}`;
    const html = this.buildBulletinEmail(payload);
    const text =
      `Bonjour,\n\n` +
      `Le bulletin de ${payload.studentName} pour ${payload.termName} ${payload.academicYear} est disponible.\n\n` +
      `Moyenne generale : ${payload.average}\n` +
      `Mention : ${payload.mention}\n\n` +
      (payload.pdfUrl ? `Telecharger le bulletin : ${payload.pdfUrl}\n\n` : '') +
      `NovaBulletin - ${payload.institutionName}`;

    this.logger.log(`Sending bulletin email to ${payload.to}`);
    return this.send({ to: payload.to, subject, html, text });
  }

  // ─── Password reset ──────────────────────────────────────────────────────────
  async sendPasswordReset(to: string, resetUrl: string): Promise<boolean> {
    const subject = 'Reinitialisation de votre mot de passe - NovaBulletin';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1e3a8a;">Reinitialisation de mot de passe</h2>
        <p>Vous avez demande a reinitialiser votre mot de passe.</p>
        <p>Cliquez sur le lien ci-dessous (valable 1 heure) :</p>
        <a href="${resetUrl}" style="display:inline-block;background:#1e3a8a;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;margin:16px 0;">
          Reinitialiser mon mot de passe
        </a>
        <p style="color:#6b7280;font-size:12px;">Si vous n'avez pas demande cette reinitialisation, ignorez cet email.</p>
      </div>`;
    const text =
      `Reinitialisation de mot de passe NovaBulletin\n\n` +
      `Vous avez demande a reinitialiser votre mot de passe.\n\n` +
      `Lien (valable 1 heure) : ${resetUrl}\n\n` +
      `Si vous n'avez pas fait cette demande, ignorez cet email.`;

    return this.send({ to, subject, html, text });
  }

  // ─── New school registration (to owner) ─────────────────────────────────────
  async sendSchoolRegistration(
    schoolName: string,
    city: string,
    adminEmail: string,
  ): Promise<boolean> {
    const subject = 'Nouvelle inscription - NovaBulletin';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
        <div style="background:#1e3a8a;color:#fff;padding:16px 20px;">
          <h2 style="margin:0;">Nouvelle inscription ecole</h2>
          <p style="margin:4px 0 0;opacity:0.85;">NovaBulletin — Tableau de bord super-admin</p>
        </div>
        <div style="padding:20px;">
          <p>Une nouvelle ecole vient de s'inscrire sur NovaBulletin et attend votre validation.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr>
              <td style="padding:8px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;">Nom de l'ecole</td>
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
    const text =
      `Nouvelle inscription ecole - NovaBulletin\n\n` +
      `Ecole : ${schoolName}\n` +
      `Ville : ${city}\n` +
      `Email admin : ${adminEmail}\n\n` +
      `Connectez-vous au tableau de bord pour approuver ou rejeter cette demande.`;

    this.logger.log(`Sending school registration notification to owner: ${this.ownerEmail}`);
    return this.send({ to: this.ownerEmail, subject, html, text });
  }

  // ─── School approval (delegates to login reminder) ───────────────────────────
  async sendSchoolApproval(
    adminName: string,
    adminEmail: string,
    schoolName: string,
  ): Promise<boolean> {
    return this.sendLoginReminder(adminName, adminEmail, schoolName, true);
  }

  // ─── Login reminder / approval notification ──────────────────────────────────
  async sendLoginReminder(
    adminName: string,
    adminEmail: string,
    schoolName: string,
    isFirstApproval = false,
  ): Promise<boolean> {
    const frontendUrl = this.config.get('FRONTEND_URL', 'https://e-report-frontend.vercel.app');
    const loginUrl = `${frontendUrl}/login`;

    const subject = isFirstApproval
      ? `Votre ecole a ete approuvee - NovaBulletin`
      : `Rappel de connexion - NovaBulletin`;
    const headline = isFirstApproval ? 'Compte active !' : 'Rappel : accedez a votre tableau de bord';
    const intro = isFirstApproval
      ? `Votre demande d'inscription pour l'etablissement <strong>${schoolName}</strong> a ete <strong style="color:#15803d;">approuvee</strong>. Vous pouvez maintenant vous connecter.`
      : `Votre etablissement <strong>${schoolName}</strong> est actif sur NovaBulletin. Connectez-vous pour configurer vos classes, enseignants et bulletins.`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
        <div style="background:#15803d;color:#fff;padding:16px 20px;">
          <h2 style="margin:0;">${headline}</h2>
          <p style="margin:4px 0 0;opacity:0.85;">NovaBulletin — Gestion scolaire</p>
        </div>
        <div style="padding:20px;">
          <p>Bonjour <strong>${adminName}</strong>,</p>
          <p>${intro}</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr>
              <td style="padding:8px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;">Email de connexion</td>
              <td style="padding:8px;border:1px solid #e5e7eb;">${adminEmail}</td>
            </tr>
            <tr>
              <td style="padding:8px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;">Mot de passe</td>
              <td style="padding:8px;border:1px solid #e5e7eb;">Celui choisi lors de votre inscription</td>
            </tr>
          </table>
          <div style="text-align:center;margin:24px 0;">
            <a href="${loginUrl}" style="display:inline-block;background:#15803d;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;">
              Acceder au tableau de bord
            </a>
          </div>
          <p style="color:#6b7280;font-size:13px;">
            Si vous avez oublie votre mot de passe, utilisez le lien <em>Mot de passe oublie</em> sur la page de connexion.
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
          <p style="color:#6b7280;font-size:11px;">NovaBulletin — Notification automatique</p>
        </div>
      </div>`;

    const text =
      `Bonjour ${adminName},\n\n` +
      (isFirstApproval
        ? `Votre etablissement ${schoolName} a ete approuve sur NovaBulletin.\n\n`
        : `Votre etablissement ${schoolName} est actif sur NovaBulletin.\n\n`) +
      `Email de connexion : ${adminEmail}\n` +
      `Mot de passe : celui choisi lors de votre inscription\n\n` +
      `Lien de connexion : ${loginUrl}\n\n` +
      `NovaBulletin — Notification automatique`;

    this.logger.log(`Sending ${isFirstApproval ? 'approval' : 'reminder'} email to: ${adminEmail}`);
    return this.send({ to: adminEmail, subject, html, text });
  }

  // ─── Welcome OTP ─────────────────────────────────────────────────────────────
  async sendWelcomeOtp(to: string, name: string, otp: string, institutionName: string): Promise<boolean> {
    const subject = `Bienvenue sur NovaBulletin - Votre code d'acces`;
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    const loginUrl = `${frontendUrl}/login-otp`;
    const year = new Date().getFullYear();

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 100%);border-radius:12px 12px 0 0;padding:36px 40px;text-align:center;">
          <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:50%;padding:14px;margin-bottom:12px;">
            <div style="width:36px;height:36px;background:#fff;border-radius:50%;display:inline-block;line-height:36px;text-align:center;">
              <span style="color:#1e3a8a;font-weight:900;font-size:18px;">N</span>
            </div>
          </div>
          <h1 style="color:#fff;margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px;">NovaBulletin</h1>
          <p style="color:#93c5fd;margin:6px 0 0;font-size:14px;">${institutionName}</p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="background:#ffffff;padding:40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">

          <p style="color:#6b7280;font-size:13px;margin:0 0 24px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Activation du compte</p>

          <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 16px;">Bonjour, ${name}</h2>

          <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 12px;">
            Votre compte a ete cree sur <strong>NovaBulletin</strong> par l'administration de <strong>${institutionName}</strong>.
          </p>
          <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 28px;">
            Pour acceder a votre espace, utilisez le code OTP ci-dessous lors de votre premiere connexion :
          </p>

          <!-- OTP Box -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding:0 0 28px;">
                <div style="display:inline-block;background:#f8fafc;border:2px solid #e0e7ff;border-radius:16px;padding:24px 48px;text-align:center;">
                  <p style="margin:0 0 6px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Code OTP</p>
                  <p style="margin:0;font-size:20px;font-weight:900;letter-spacing:4px;color:#1e3a8a;font-family:'Courier New',Courier,monospace;word-break:break-all;">${otp}</p>
                  <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">
                    Expire dans <strong style="color:#dc2626;">24 heures</strong>
                  </p>
                </div>
              </td>
            </tr>
          </table>

          <!-- Steps -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;margin-bottom:28px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">Comment se connecter</p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;vertical-align:top;">
                    <span style="display:inline-block;width:22px;height:22px;background:#1e3a8a;color:#fff;border-radius:50%;font-size:11px;font-weight:700;text-align:center;line-height:22px;margin-right:10px;">1</span>
                  </td>
                  <td style="padding:6px 0;color:#4b5563;font-size:14px;line-height:1.5;">
                    Cliquez sur le bouton ci-dessous ou rendez-vous sur <strong>NovaBulletin</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;vertical-align:top;">
                    <span style="display:inline-block;width:22px;height:22px;background:#1e3a8a;color:#fff;border-radius:50%;font-size:11px;font-weight:700;text-align:center;line-height:22px;margin-right:10px;">2</span>
                  </td>
                  <td style="padding:6px 0;color:#4b5563;font-size:14px;line-height:1.5;">
                    Entrez votre adresse email <strong>${to}</strong> et le code OTP
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;vertical-align:top;">
                    <span style="display:inline-block;width:22px;height:22px;background:#1e3a8a;color:#fff;border-radius:50%;font-size:11px;font-weight:700;text-align:center;line-height:22px;margin-right:10px;">3</span>
                  </td>
                  <td style="padding:6px 0;color:#4b5563;font-size:14px;line-height:1.5;">
                    Definissez votre mot de passe personnel
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td align="center">
                <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e3a8a,#1d4ed8);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.3px;">
                  Se connecter avec mon OTP
                </a>
              </td>
            </tr>
          </table>

          <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 20px;">
          <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:0;">
            Si vous n'etes pas a l'origine de cette inscription, ignorez cet email en toute securite.<br>
            Ce message a ete envoye automatiquement — merci de ne pas y repondre.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            &copy; ${year} <strong>NovaBulletin</strong> &middot; Plateforme de gestion des bulletins scolaires
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

    const text =
      `Bonjour ${name},\n\n` +
      `Votre compte a ete cree sur NovaBulletin par ${institutionName}.\n\n` +
      `Votre code OTP : ${otp}\n` +
      `(expire dans 24 heures)\n\n` +
      `Lien de connexion : ${loginUrl}\n\n` +
      `Etapes :\n` +
      `1. Allez sur NovaBulletin\n` +
      `2. Entrez votre email ${to} et le code OTP\n` +
      `3. Definissez votre mot de passe\n\n` +
      `Si vous n'etes pas a l'origine de cette inscription, ignorez cet email.`;

    return this.send({ to, subject, html, text });
  }

  private buildBulletinEmail(p: MailPayload): string {
    const pdfSection = p.pdfUrl
      ? `<a href="${p.pdfUrl}" style="display:inline-block;background:#1e3a8a;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;margin-top:12px;">
           Telecharger le bulletin (PDF)
         </a>`
      : `<p style="color:#dc2626;margin-top:8px;">
           Le bulletin sera disponible des que le solde des frais sera regle.
         </p>`;

    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
        <div style="background:#1e3a8a;color:#fff;padding:16px 20px;">
          <h2 style="margin:0;">Bulletin de Notes - ${p.termName}</h2>
          <p style="margin:4px 0 0;opacity:0.85;">${p.institutionName}</p>
        </div>
        <div style="padding:20px;">
          <p>Bonjour,</p>
          <p>Le bulletin de <strong>${p.studentName}</strong> pour <strong>${p.termName} ${p.academicYear}</strong> est disponible.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr>
              <td style="padding:8px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;">Moyenne generale</td>
              <td style="padding:8px;border:1px solid #e5e7eb;">${p.average}</td>
            </tr>
            <tr>
              <td style="padding:8px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;">Mention</td>
              <td style="padding:8px;border:1px solid #e5e7eb;">${p.mention}</td>
            </tr>
          </table>
          ${pdfSection}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
          <p style="color:#6b7280;font-size:11px;">NovaBulletin - ${p.institutionName}</p>
        </div>
      </div>`;
  }
}
