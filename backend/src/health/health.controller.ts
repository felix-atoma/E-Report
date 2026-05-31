import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([]);
  }

  @Get('db')
  async dbCheck() {
    const results: Record<string, any> = {};
    for (const [key, fn] of Object.entries({
      users: () => this.prisma.user.count(),
      institutions: () => this.prisma.institution.count(),
      refreshTokens: () => this.prisma.refreshToken.count(),
      institutionStatus: () => this.prisma.institution.findFirst({ select: { status: true } }),
    })) {
      try {
        results[key] = await (fn as () => Promise<any>)();
      } catch (err: any) {
        results[key] = { error: err?.message, code: err?.code };
      }
    }
    return results;
  }
}
