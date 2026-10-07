import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Refresh tokens are stored as SHA-256. bcrypt only reads the first 72 bytes, which for a JWT is
// the header + the start of the user's payload — every token of a user would match every row.
const hashRefreshToken = (token: string) => createHash('sha256').update(token).digest('hex');
// Legacy bcrypt rows ($2…) are only checked for legacy tokens (issued before jti existed), so a
// new token can't slip through the 72-byte bcrypt prefix match. They expire within 7 days.
const refreshTokenMatches = async (token: string, stored: string, legacyToken: boolean) =>
  stored.startsWith('$2') ? legacyToken && bcrypt.compare(token, stored) : hashRefreshToken(token) === stored;
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  // ─── Validate email + password (used by LocalStrategy) ─────────────────
  async validateUser(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.isActive) return null;

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) return null;

    const { password: _, ...result } = user;
    return result;
  }

  // ─── Register ────────────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');

    const institution = await this.prisma.institution.findUnique({
      where: { id: dto.institutionId },
    });
    if (!institution) throw new NotFoundException('Institution not found');

    const saltRounds = this.config.get<number>('BCRYPT_SALT_ROUNDS', 12);
    const hashed = await bcrypt.hash(dto.password, Number(saltRounds));

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email,
        password: hashed,
        role: dto.role,
        institutionId: dto.institutionId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        institutionId: true,
        language: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.institutionId);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return { user, ...tokens };
  }

  /**
   * Accès à l'établissement : refusé s'il est suspendu ; après la fin de l'essai (ou d'un abonnement)
   * pour une école de 50 élèves ou plus, seul l'administrateur peut encore se connecter — pour payer
   * l'abonnement et débloquer les autres utilisateurs.
   */
  private async assertInstitutionAccess(user: { role: string; institutionId?: string | null }) {
    // SUPERADMIN users have no institution — skip institution status check
    if (user.role === 'SUPERADMIN' || !user.institutionId) return;
    const [institution, studentCount] = await Promise.all([
      (this.prisma as any).institution.findUnique({
        where: { id: user.institutionId },
        select: { status: true, subscriptionStatus: true, trialEndsAt: true },
      }),
      this.prisma.student.count({ where: { institutionId: user.institutionId } }),
    ]);

    if (institution && ['SUSPENDED', 'REJECTED'].includes(institution.status as string)) {
      throw new UnauthorizedException(
        'Votre établissement a été suspendu ou désactivé. Contactez le support.',
      );
    }

    if (institution && studentCount >= 50 && user.role !== 'ADMIN') {
      const trialExpired =
        institution.subscriptionStatus === 'TRIAL' &&
        institution.trialEndsAt &&
        new Date(institution.trialEndsAt) < new Date();
      const subExpired = institution.subscriptionStatus === 'EXPIRED';
      if (trialExpired || subExpired) {
        throw new UnauthorizedException(
          "La période d'essai de votre établissement est terminée. L'administrateur de l'école doit souscrire un abonnement pour rétablir l'accès.",
        );
      }
    }
  }

  // ─── Login ───────────────────────────────────────────────────────────────
  async login(user: any) {
    await this.assertInstitutionAccess(user);

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.institutionId,
    );
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    const fullUser = await this.prisma.user.findUnique({ where: { id: user.id } });

    // Auto-verify email for users who successfully log in with a password
    if (fullUser && !fullUser.emailVerifiedAt) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
      fullUser.emailVerifiedAt = new Date();
    }

    const { password: _, ...safeUser } = fullUser!;

    return { user: safeUser, ...tokens };
  }

  // ─── Get current user ────────────────────────────────────────────────────
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        institutionId: true,
        language: true,
        profileImage: true,
        whatsappNumber: true,
        whatsappVerified: true,
        notificationPreferences: true,
        isActive: true,
        emailVerifiedAt: true,
        createdAt: true,
        institution: {
          select: {
            id: true,
            name: true,
            logo: true,
            brandingSettings: true,
            academicSettings: true,
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');

    // Silently verify existing users who are actively using the app
    if (!user.emailVerifiedAt) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { emailVerifiedAt: new Date() },
      });
      return { ...user, emailVerifiedAt: new Date() };
    }

    return user;
  }

  // ─── Logout ──────────────────────────────────────────────────────────────
  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Logged out successfully' };
  }

  // ─── Refresh tokens ──────────────────────────────────────────────────────
  async refreshTokens(userId: string, refreshToken: string) {
    // A user can have several live sessions (phone + PC, several tabs): find the one this token belongs to,
    // not just any active row — otherwise every other session gets logged out on refresh.
    const active = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const legacyToken = !(this.jwt.decode(refreshToken) as { jti?: string } | null)?.jti;
    let stored: (typeof active)[number] | undefined;
    for (const row of active) {
      if (await refreshTokenMatches(refreshToken, row.token, legacyToken)) { stored = row; break; }
    }
    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('User not found');

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.institutionId);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  // ─── Forgot password ─────────────────────────────────────────────────────
  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) return { message: 'If that email exists, a reset link has been sent.' };

    // Invalidate existing reset tokens
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    const frontend = String(this.config.get('FRONTEND_URL') ?? '').split(',')[0].trim().replace(/\/+$/, '');
    const resetUrl = `${frontend}/reset-password?token=${token}`;
    // Lien envoyé par e-mail (sans SMTP configuré, le service d'envoi le signale dans les journaux)
    const sent = await this.mail.sendPasswordReset(user.email, resetUrl);
    if (!sent) console.warn(`[Password reset] Envoi de l'e-mail impossible pour ${user.email}`);

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  // ─── Reset password ──────────────────────────────────────────────────────
  async resetPassword(token: string, newPassword: string) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const saltRounds = this.config.get<number>('BCRYPT_SALT_ROUNDS', 12);
    const hashed = await bcrypt.hash(newPassword, Number(saltRounds));

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { password: hashed },
      }),
      this.prisma.passwordResetToken.update({
        where: { token },
        data: { usedAt: new Date() },
      }),
      // Revoke all refresh tokens (force re-login everywhere)
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Password reset successfully. Please log in.' };
  }

  // ─── Google OAuth — Login ────────────────────────────────────────────────
  async handleGoogleLogin(googleUser: {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
  }) {
    const email = googleUser.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) return { error: 'no_account' as const };
    if (!user.isActive) return { error: 'inactive' as const };

    // Block institution users whose institution is not ACTIVE
    if (user.role !== 'SUPERADMIN' && user.institutionId) {
      const [institution, studentCount] = await Promise.all([
        (this.prisma as any).institution.findUnique({
          where: { id: user.institutionId },
          select: { status: true, subscriptionStatus: true, trialEndsAt: true },
        }),
        this.prisma.student.count({ where: { institutionId: user.institutionId } }),
      ]);

      if (institution && ['SUSPENDED', 'REJECTED'].includes(institution.status as string)) {
        return { error: 'inactive' as const };
      }

      if (institution && studentCount >= 50) {
        const now = new Date();
        const trialExpired =
          institution.subscriptionStatus === 'TRIAL' &&
          institution.trialEndsAt &&
          new Date(institution.trialEndsAt) < now;
        const subExpired = institution.subscriptionStatus === 'EXPIRED';

        if (trialExpired || subExpired) {
          return { error: 'trial_expired' as const };
        }
      }
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.institutionId,
    );
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    const { password: _, ...safeUser } = user;
    return { user: safeUser, ...tokens };
  }

  // ─── Google OAuth — Register (pre-fill only) ─────────────────────────────
  handleGoogleRegister(googleUser: { name: string; email: string; googleId: string }) {
    return {
      name: googleUser.name,
      email: googleUser.email,
      googleId: googleUser.googleId,
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    institutionId: string | null,
  ) {
    const payload = { sub: userId, email, role, institutionId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwt.signAsync({ ...payload, jti: uuidv4() }, { // jti: two logins in the same second must not get identical tokens
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  // ─── Admin 2FA login ─────────────────────────────────────────────────────
  async requestAdminLoginOtp(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.isActive) throw new UnauthorizedException('Identifiants incorrects');

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) throw new UnauthorizedException('Identifiants incorrects');

    if (user.role !== 'ADMIN' && user.role !== 'BURSAR') {
      throw new UnauthorizedException('La double authentification est réservée aux administrateurs');
    }
    await this.assertInstitutionAccess(user);

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const saltRounds = this.config.get<number>('BCRYPT_SALT_ROUNDS', 12);
    const otpHash = await bcrypt.hash(otp, Number(saltRounds));
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpHash, otpExpiresAt },
    });

    // Code envoyé par e-mail. Sans SMTP (développement local), il est écrit dans les journaux du serveur.
    const sent = await this.mail.sendAdminLoginOtp(user.email, user.name, otp);
    if (!sent || !this.mail.isConfigured) {
      console.log(`[2FA OTP] To: ${user.email} | OTP: ${otp} | Expires: ${otpExpiresAt.toISOString()}`);
    }
    if (!sent) {
      throw new ServiceUnavailableException("Le code de connexion n'a pas pu être envoyé par e-mail. Réessayez dans un instant.");
    }

    return { requiresOtp: true, email: user.email, emailSent: this.mail.isConfigured };
  }

  async verifyAdminLoginOtp(email: string, otp: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.isActive) throw new UnauthorizedException('Compte introuvable ou inactif');
    if (!user.otpHash || !user.otpExpiresAt) throw new UnauthorizedException('Aucun code en attente — recommencez la connexion');
    if (user.otpExpiresAt < new Date()) throw new UnauthorizedException('Code OTP expiré (10 min). Recommencez la connexion');

    const valid = await bcrypt.compare(otp, user.otpHash);
    if (!valid) throw new UnauthorizedException('Code incorrect');

    // Clear OTP and issue tokens
    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpHash: null, otpExpiresAt: null },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.institutionId);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    const { password: _, otpHash: __, otpExpiresAt: ___, ...safeUser } = user as any;
    return { user: safeUser, ...tokens };
  }

  // ─── OTP login (first-time users) ────────────────────────────────────────
  async loginWithOtp(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || !user.isActive) throw new UnauthorizedException('Compte introuvable ou inactif');
    if (!user.otpHash || !user.otpExpiresAt) throw new UnauthorizedException('Aucun OTP actif pour ce compte');
    if (user.otpExpiresAt < new Date()) throw new UnauthorizedException('Code OTP expiré. Contactez l\'administrateur');

    const valid = await bcrypt.compare(otp, user.otpHash);
    if (!valid) throw new UnauthorizedException('Code OTP incorrect');

    // Generate short-lived token for password setup only
    const setupToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role, institutionId: user.institutionId, mustChangePassword: true },
      { secret: this.config.get<string>('JWT_SECRET'), expiresIn: '30m' },
    );

    return { setupToken, mustChangePassword: true, name: user.name, email: user.email };
  }

  // ─── Set password after OTP login ────────────────────────────────────────
  async setPassword(userId: string, newPassword: string) {
    const saltRounds = this.config.get<number>('BCRYPT_SALT_ROUNDS', 12);
    const hashed = await bcrypt.hash(newPassword, Number(saltRounds));

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashed,
        mustChangePassword: false,
        otpHash: null,
        otpExpiresAt: null,
        emailVerifiedAt: new Date(),
      },
    });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const tokens = await this.generateTokens(user.id, user.email, user.role, user.institutionId);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  private async saveRefreshToken(userId: string, refreshToken: string) {
    const hashed = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.refreshToken.create({
      data: { token: hashed, userId, expiresAt },
    });
  }
}
