import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();

    // Reconnect + retry once on Supabase idle-connection drops (P1017 / ECONNRESET)
    (this as any).$use(async (params: any, next: (p: any) => Promise<any>) => {
      try {
        return await next(params);
      } catch (err: any) {
        if (this.isConnectionError(err)) {
          this.logger.warn('DB connection lost — reconnecting and retrying…');
          await this.$disconnect().catch(() => {});
          await this.$connect();
          return await next(params);
        }
        throw err;
      }
    });
  }

  private isConnectionError(err: any): boolean {
    const code: string = err?.code ?? '';
    const msg: string = err?.message ?? '';
    return (
      code === 'P1017' ||
      code === 'P1001' ||
      code === 'P1002' ||
      msg.includes('Server has closed the connection') ||
      msg.includes('ECONNRESET') ||
      msg.includes('Connection pool timed out')
    );
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
