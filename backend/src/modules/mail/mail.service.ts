import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

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
  private readonly fromSmtp: string;
  private readonly ownerEmail: string;
  private readonly provider: 'smtp' | 'none';
  private smtpTransport: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    this.fromEmail = config.get<string>('MAIL_FROM', 'noreply@novabulletin.local');
    this.fromSmtp = `NovaBulletin <${this.fromEmail}>`;
    this.ownerEmail = config.get<string>('OWNER_EMAIL', OWNER_EMAIL_DEFAULT);
    const smtpHost = config.get<string>('SMTP_HOST', '');

    if (smtpHost) {
      // ConfigService returns raw env strings — "false" is truthy in JS, so parse explicitly
      const smtpPort = Number(config.get<string>('SMTP_PORT', '587'));
      const smtpSecure = config.get<string>('SMTP_SECURE', 'false') === 'true';
      this.smtpTransport = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: config.get<string>('SMTP_USER', ''),
          pass: config.get<string>('SMTP_PASS', ''),
        },
      });
      this.provider = 'smtp';
      this.logger.log(`Mail provider: SMTP (${smtpHost})`);
    } else {
      this.provider = 'none';
      this.logger.warn('No SMTP configured — emails will be logged only (set SMTP_HOST to enable)');
    }
  }

  // ─── Central send helper ────────────────────────────────────────────────────
  private async send({ to, subject, html, text }: SendParams): Promise<boolean> {
    try {
      if (this.provider === 'smtp' && this.smtpTransport) {
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

  // ─── Fee reminder (friendly / urgent) ────────────────────────────────────────
  async sendFeeReminder(payload: {
    to: string;
    parentName?: string;
    studentName: string;
    balance: string;
    institutionName: string;
    severity: 'FRIENDLY' | 'URGENT';
    language?: 'FR' | 'EN';
  }): Promise<boolean> {
    const en = payload.language === 'EN';
    const urgent = payload.severity === 'URGENT';
    const greeting = payload.parentName ? `${en ? 'Hello' : 'Bonjour'} ${payload.parentName},` : (en ? 'Hello,' : 'Bonjour,');

    const subject = urgent
      ? (en ? `URGENT - Unpaid fees for ${payload.studentName}` : `URGENT - Frais impayes pour ${payload.studentName}`)
      : (en ? `Reminder - School fees for ${payload.studentName}` : `Rappel - Frais scolaires de ${payload.studentName}`);

    const bodyLines = urgent
      ? en
        ? [
            `School fees for <strong>${payload.studentName}</strong> remain unpaid (<strong>${payload.balance}</strong>) for more than two months.`,
            `Without prompt payment, the school reserves the right to exclude the student in accordance with its internal regulations.`,
            `Please settle this matter urgently to avoid this measure.`,
          ]
        : [
            `Les frais scolaires de <strong>${payload.studentName}</strong> restent impayes (<strong>${payload.balance}</strong>) depuis plus de deux mois.`,
            `Sans regularisation rapide, l'etablissement se reserve le droit d'exclure l'eleve conformement a son reglement interieur.`,
            `Merci de regulariser la situation dans les plus brefs delais pour eviter cette mesure.`,
          ]
      : en
        ? [
            `This is a friendly reminder that school fees for <strong>${payload.studentName}</strong> have not yet been settled (<strong>${payload.balance}</strong> outstanding).`,
            `Please make payment as soon as possible so your child can continue to enjoy all school services.`,
          ]
        : [
            `Nous vous rappelons amicalement que les frais scolaires de <strong>${payload.studentName}</strong> ne sont pas encore regles (<strong>${payload.balance}</strong> restant).`,
            `Merci de proceder au paiement dans les meilleurs delais.`,
          ];

    const headerColor = urgent ? '#dc2626' : '#1e3a8a';
    const headline = urgent ? (en ? 'Important notice' : 'Avis important') : (en ? 'Fee reminder' : 'Rappel de frais');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
        <div style="background:${headerColor};color:#fff;padding:16px 20px;">
          <h2 style="margin:0;">${urgent ? '⚠️ ' : ''}${headline}</h2>
          <p style="margin:4px 0 0;opacity:0.85;">${payload.institutionName}</p>
        </div>
        <div style="padding:20px;">
          <p>${greeting}</p>
          ${bodyLines.map((l) => `<p>${l}</p>`).join('')}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
          <p style="color:#6b7280;font-size:11px;">NovaBulletin - ${en ? 'Automated notification' : 'Notification automatique'}</p>
        </div>
      </div>`;

    const text = `${greeting}\n\n${bodyLines.map((l) => l.replace(/<\/?strong>/g, '')).join('\n\n')}\n\n${payload.institutionName}`;

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
    const subject = `Bienvenue sur NovaBulletin, ${name} — votre code d'accès`;
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

          <p style="color:#6b7280;font-size:13px;margin:0 0 24px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Activation de votre compte</p>

          <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 16px;">Bienvenue, ${name} 👋</h2>

          <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 12px;">
            Nous sommes ravis de vous accueillir sur <strong>NovaBulletin</strong> ! Votre compte vient d'être créé par l'équipe de <strong>${institutionName}</strong>.
          </p>
          <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 28px;">
            Pour activer votre espace en toute sécurité, utilisez le code à usage unique ci-dessous lors de votre première connexion :
          </p>

          <!-- OTP Box -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding:0 0 28px;">
                <div style="display:inline-block;background:#f8fafc;border:2px solid #e0e7ff;border-radius:16px;padding:24px 48px;text-align:center;">
                  <p style="margin:0 0 6px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Votre code d'accès</p>
                  <p style="margin:0;font-size:20px;font-weight:900;letter-spacing:4px;color:#1e3a8a;font-family:'Courier New',Courier,monospace;word-break:break-all;">${otp}</p>
                  <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">
                    Valable pendant <strong style="color:#dc2626;">24 heures</strong>
                  </p>
                </div>
              </td>
            </tr>
          </table>

          <!-- Steps -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;margin-bottom:28px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">Comment activer votre compte</p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;vertical-align:top;">
                    <span style="display:inline-block;width:22px;height:22px;background:#1e3a8a;color:#fff;border-radius:50%;font-size:11px;font-weight:700;text-align:center;line-height:22px;margin-right:10px;">1</span>
                  </td>
                  <td style="padding:6px 0;color:#4b5563;font-size:14px;line-height:1.5;">
                    Cliquez sur le bouton ci-dessous pour ouvrir <strong>NovaBulletin</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;vertical-align:top;">
                    <span style="display:inline-block;width:22px;height:22px;background:#1e3a8a;color:#fff;border-radius:50%;font-size:11px;font-weight:700;text-align:center;line-height:22px;margin-right:10px;">2</span>
                  </td>
                  <td style="padding:6px 0;color:#4b5563;font-size:14px;line-height:1.5;">
                    Saisissez votre adresse email <strong>${to}</strong> ainsi que le code ci-dessus
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;vertical-align:top;">
                    <span style="display:inline-block;width:22px;height:22px;background:#1e3a8a;color:#fff;border-radius:50%;font-size:11px;font-weight:700;text-align:center;line-height:22px;margin-right:10px;">3</span>
                  </td>
                  <td style="padding:6px 0;color:#4b5563;font-size:14px;line-height:1.5;">
                    Choisissez votre mot de passe personnel — c'est tout, vous êtes prêt !
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
                  Activer mon compte
                </a>
              </td>
            </tr>
          </table>

          <p style="color:#4b5563;font-size:14px;line-height:1.7;margin:0 0 4px;">
            Une question ? L'équipe de <strong>${institutionName}</strong> est à votre disposition.
          </p>

          <hr style="border:none;border-top:1px solid #f3f4f6;margin:20px 0;">
          <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:0;">
            Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet email en toute sécurité.<br>
            Ce message a été envoyé automatiquement — merci de ne pas y répondre.
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
      `Bienvenue, ${name} !\n\n` +
      `Nous sommes ravis de vous accueillir sur NovaBulletin. Votre compte vient d'être créé par l'équipe de ${institutionName}.\n\n` +
      `Votre code d'accès : ${otp}\n` +
      `(valable pendant 24 heures)\n\n` +
      `Lien d'activation : ${loginUrl}\n\n` +
      `Comment activer votre compte :\n` +
      `1. Ouvrez NovaBulletin\n` +
      `2. Saisissez votre email ${to} et le code ci-dessus\n` +
      `3. Choisissez votre mot de passe personnel\n\n` +
      `Une question ? L'équipe de ${institutionName} est à votre disposition.\n\n` +
      `Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet email en toute sécurité.`;

    return this.send({ to, subject, html, text });
  }

  // ─── Subscription confirmation ───────────────────────────────────────────────
  async sendSubscriptionConfirmation(institutionName: string, to: string, plan: string, expiry: Date): Promise<boolean> {
    const planLabel = plan === 'ANNUAL' ? 'Annuel' : 'Mensuel';
    const expiryStr = expiry.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const subject = 'NovaBulletin - Abonnement activé';
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');

    const html = `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr>
        <td style="background:linear-gradient(135deg,#065f46 0%,#059669 100%);border-radius:12px 12px 0 0;padding:36px 40px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:26px;font-weight:800;">NovaBulletin</h1>
          <p style="color:#a7f3d0;margin:6px 0 0;font-size:14px;">Abonnement activé</p>
        </td>
      </tr>
      <tr>
        <td style="background:#fff;padding:40px;border:1px solid #e5e7eb;">
          <h2 style="color:#111827;font-size:22px;margin:0 0 16px;">Félicitations, ${institutionName} !</h2>
          <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 24px;">
            Votre paiement a été reçu et votre abonnement <strong>Plan ${planLabel}</strong> est maintenant actif.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:10px;margin-bottom:28px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 8px;color:#065f46;font-weight:700;">Détails de l'abonnement</p>
              <p style="margin:0 0 4px;color:#374151;font-size:14px;">Plan : <strong>${planLabel}</strong></p>
              <p style="margin:0;color:#374151;font-size:14px;">Valide jusqu'au : <strong>${expiryStr}</strong></p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td align="center">
              <a href="${frontendUrl}/admin" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;">
                Accéder à mon tableau de bord
              </a>
            </td></tr>
          </table>
          <p style="color:#9ca3af;font-size:12px;">Merci de faire confiance à NovaBulletin pour la gestion de votre établissement.</p>
        </td>
      </tr>
      <tr>
        <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:16px 40px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; ${new Date().getFullYear()} NovaBulletin</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`;

    const text =
      `Félicitations ${institutionName} !\n\n` +
      `Votre abonnement Plan ${planLabel} est actif.\n` +
      `Valide jusqu'au : ${expiryStr}\n\n` +
      `Accédez à votre tableau de bord : ${frontendUrl}/admin\n\n` +
      `Merci de faire confiance à NovaBulletin.`;

    return this.send({ to, subject, html, text });
  }

  async sendTrialExpiryWarning(
    adminName: string,
    adminEmail: string,
    schoolName: string,
    daysLeft: number,
  ): Promise<boolean> {
    const subject = `NovaBulletin — Votre essai expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`;
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    const urgentColor = daysLeft <= 1 ? '#dc2626' : '#d97706';

    const html = `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr>
        <td style="background:linear-gradient(135deg,${urgentColor} 0%,#f59e0b 100%);border-radius:12px 12px 0 0;padding:36px 40px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:26px;font-weight:800;">NovaBulletin</h1>
          <p style="color:#fef3c7;margin:6px 0 0;font-size:14px;">⏳ Votre essai expire bientôt</p>
        </td>
      </tr>
      <tr>
        <td style="background:#fff;padding:40px;border:1px solid #e5e7eb;">
          <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Bonjour ${adminName},</h2>
          <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 20px;">
            Votre période d'essai gratuit pour <strong>${schoolName}</strong> expire dans
            <strong style="color:${urgentColor};">${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong>.
          </p>
          <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 28px;">
            Après expiration, l'accès à la plateforme sera suspendu pour votre établissement.
            Souscrivez dès maintenant pour continuer sans interruption.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td align="center">
              <a href="${frontendUrl}/admin/subscription"
                style="display:inline-block;background:${urgentColor};color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;">
                Souscrire un abonnement →
              </a>
            </td></tr>
          </table>
          <p style="color:#9ca3af;font-size:12px;">Si vous avez des questions, répondez à cet email ou contactez le support.</p>
        </td>
      </tr>
      <tr>
        <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:16px 40px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; ${new Date().getFullYear()} NovaBulletin</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`;

    const text =
      `Bonjour ${adminName},\n\n` +
      `Votre période d'essai pour ${schoolName} expire dans ${daysLeft} jour(s).\n` +
      `Souscrivez dès maintenant : ${frontendUrl}/admin/subscription\n\n` +
      `NovaBulletin`;

    return this.send({ to: adminEmail, subject, html, text });
  }

  async sendTrialExpiredNotice(
    adminName: string,
    adminEmail: string,
    schoolName: string,
  ): Promise<boolean> {
    const subject = 'NovaBulletin — Votre accès a expiré';
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');

    const html = `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr>
        <td style="background:linear-gradient(135deg,#111827 0%,#374151 100%);border-radius:12px 12px 0 0;padding:36px 40px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:26px;font-weight:800;">NovaBulletin</h1>
          <p style="color:#9ca3af;margin:6px 0 0;font-size:14px;">🔒 Accès suspendu</p>
        </td>
      </tr>
      <tr>
        <td style="background:#fff;padding:40px;border:1px solid #e5e7eb;">
          <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Bonjour ${adminName},</h2>
          <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 20px;">
            La période d'essai gratuite de <strong>${schoolName}</strong> est terminée.
            L'accès à la plateforme a été suspendu.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:10px;margin-bottom:24px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0;color:#dc2626;font-size:14px;">
                ⚠️ Vos données sont conservées. Souscrivez un abonnement pour retrouver l'accès immédiatement.
              </p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td align="center">
              <a href="${frontendUrl}/admin/subscription"
                style="display:inline-block;background:#1e2a78;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;">
                Renouveler mon accès →
              </a>
            </td></tr>
          </table>
          <p style="color:#9ca3af;font-size:12px;">Vos données (élèves, bulletins, notes) sont préservées pendant 90 jours après l'expiration.</p>
        </td>
      </tr>
      <tr>
        <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:16px 40px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; ${new Date().getFullYear()} NovaBulletin</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`;

    const text =
      `Bonjour ${adminName},\n\n` +
      `La période d'essai de ${schoolName} est terminée et l'accès a été suspendu.\n` +
      `Vos données sont conservées. Souscrivez pour retrouver l'accès :\n` +
      `${frontendUrl}/admin/subscription\n\n` +
      `NovaBulletin`;

    return this.send({ to: adminEmail, subject, html, text });
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
