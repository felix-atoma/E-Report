import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  institutionId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      ignoreExpiration: false,
    });
  }

  // Every authenticated request used to re-read the user: one database round-trip per call.
  // Kept 30 s in memory — a deactivated or changed user takes effect within 30 s.
  private static readonly cache = new Map<string, { user: any; until: number }>();
  private static readonly TTL_MS = 30_000;

  async validate(payload: JwtPayload) {
    const hit = JwtStrategy.cache.get(payload.sub);
    if (hit && hit.until > Date.now()) return { ...hit.user };

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        institutionId: true,
        isActive: true,
        language: true,
      },
    });

    if (!user || !user.isActive) {
      JwtStrategy.cache.delete(payload.sub);
      throw new UnauthorizedException('User not found or inactive');
    }

    if (JwtStrategy.cache.size > 5000) JwtStrategy.cache.clear();
    JwtStrategy.cache.set(payload.sub, { user, until: Date.now() + JwtStrategy.TTL_MS });
    return user;
  }
}
