import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ProjectConfigService } from '../config/project-config.service';

interface MemoryWatchdogConfig {
  enabled: boolean;
  intervalMs: number;
  warnRssMb: number;
  restartRssMb: number;
  action: 'log' | 'exit';
}

@Injectable()
export class MemoryWatchdogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('MemoryWatchdog');
  private timer: NodeJS.Timeout | null = null;
  private cfg!: MemoryWatchdogConfig;

  constructor(private readonly projectConfig: ProjectConfigService) {}

  onModuleInit(): void {
    const resolved = this.projectConfig.getResolvedConfig() as any;
    const cfg: MemoryWatchdogConfig = {
      enabled: resolved?.monitoring?.memoryWatchdog?.enabled ?? true,
      intervalMs: resolved?.monitoring?.memoryWatchdog?.intervalMs ?? 15000,
      warnRssMb: resolved?.monitoring?.memoryWatchdog?.warnRssMb ?? 800,
      restartRssMb: resolved?.monitoring?.memoryWatchdog?.restartRssMb ?? 1024,
      action: resolved?.monitoring?.memoryWatchdog?.action ?? 'log',
    };
    this.cfg = cfg;

    if (!cfg.enabled) {
      this.logger.log('Memory watchdog disabled by configuration');
      return;
    }

    this.timer = setInterval(() => this.tick(), Math.max(1000, cfg.intervalMs));
    this.timer.unref?.();
    this.logger.log(
      `Memory watchdog started: warn=${cfg.warnRssMb}MB, restart=${cfg.restartRssMb}MB, every ${cfg.intervalMs}ms (action=${cfg.action})`,
    );
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick(): void {
    try {
      const mu = process.memoryUsage();
      const rssMb = Math.round((mu.rss / (1024 * 1024)) * 10) / 10;

      if (rssMb >= this.cfg.restartRssMb) {
        const msg = `RSS ${rssMb}MB exceeds restart threshold ${this.cfg.restartRssMb}MB`;
        if (this.cfg.action === 'exit') {
          this.logger.error(`${msg}. Exiting process for supervisor to restart...`);
          // Flush logs then exit
          setTimeout(() => process.exit(137), 100);
          return;
        }
        this.logger.error(`${msg}. Action=log (no exit).`);
      } else if (rssMb >= this.cfg.warnRssMb) {
        this.logger.warn(`High memory usage detected: RSS=${rssMb}MB (warn >= ${this.cfg.warnRssMb}MB)`);
      }
    } catch (err) {
      this.logger.error(`Watchdog tick error: ${(err as Error).message}`);
    }
  }
}


