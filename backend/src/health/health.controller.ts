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
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { db: 'ok' };
    } catch (err: any) {
      return { db: 'error', message: err?.message, code: err?.code };
    }
  }
}
