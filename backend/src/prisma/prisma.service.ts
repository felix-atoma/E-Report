import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  // Shared reconnect promise — prevents multiple parallel $disconnect/$connect calls
  private reconnecting: Promise<void> | null = null;

  constructor() {
    super();

    (this as any).$use(async (params: any, next: (p: any) => Promise<any>) => {
      try {
        return await next(params);
      } catch (err: any) {
        if (this.isIdleDropError(err)) {
          if (!this.reconnecting) {
            this.logger.warn('DB connection lost — reconnecting…');
            this.reconnecting = this.$disconnect()
              .catch(() => {})
              .then(() => this.$connect())
              .finally(() => { this.reconnecting = null; });
          }
          await this.reconnecting;
          return await next(params);
        }
        throw err;
      }
    });
  }

  // Only retry on actual Supabase idle-connection drops.
  // Pool exhaustion (P2024 / "Timed out fetching a new connection") must NOT
  // trigger reconnect — doing so makes the pool problem worse.
  private isIdleDropError(err: any): boolean {
    const code: string = err?.code ?? '';
    const msg: string  = err?.message ?? '';
    return (
      code === 'P1017' ||
      code === 'P1001' ||
      code === 'P1002' ||
      msg.includes('Server has closed the connection') ||
      msg.includes('ECONNRESET')
    );
  }

  async onModuleInit() {
    // Attempt connection but never crash the server on startup if DB is unreachable.
    // Prisma connects lazily on the first query anyway; this is just an early warm-up.
    try {
      await this.$connect();
      this.logger.log('DB connected');
    } catch (err: any) {
      this.logger.warn(`DB not reachable at startup (${err?.errorCode ?? err?.code ?? 'unknown'}) — will retry on first query`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
