import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
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

  // ─── Login ───────────────────────────────────────────────────────────────
  async login(user: any) {
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.institutionId,
    );
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    const fullUser = await this.prisma.user.findUnique({ where: { id: user.id } });
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
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    });

    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    const matches = await bcrypt.compare(refreshToken, stored.token);
    if (!matches) throw new UnauthorizedException('Invalid refresh token');

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

    // TODO: send actual email in Week 9 when EmailModule is wired
    const resetUrl = `${this.config.get('FRONTEND_URL')}/reset-password?token=${token}`;
    console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);

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

  // ─── Helpers ─────────────────────────────────────────────────────────────
  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    institutionId: string,
  ) {
    const payload = { sub: userId, email, role, institutionId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, refreshToken: string) {
    const hashed = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.refreshToken.create({
      data: { token: hashed, userId, expiresAt },
    });
  }
}
