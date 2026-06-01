import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';
import * as fs from 'fs';
import * as child_process from 'child_process';

@Public()
@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([]);
  }

  @Get('chrome')
  chromeCheck() {
    const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || 'not set';
    const exists = execPath !== 'not set' ? fs.existsSync(execPath) : false;
    const whichChrome = (() => { try { return child_process.execSync('which google-chrome-stable 2>/dev/null || which chromium-browser 2>/dev/null || which chromium 2>/dev/null || echo none').toString().trim(); } catch { return 'error'; } })();
    const skipDownload = process.env.PUPPETEER_SKIP_DOWNLOAD;
    return { execPath, exists, whichChrome, skipDownload };
  }
}
