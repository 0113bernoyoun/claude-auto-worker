import { Injectable } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { ProjectConfigService } from '../../config/project-config.service';

@Injectable()
@Command({
  name: 'config',
  description: 'Manage configuration for claude-auto-worker',
  arguments: '[action] [path]',
})
export class ConfigCommand extends CommandRunner {
  constructor(private readonly projectConfig: ProjectConfigService) {
    super();
  }

  @Option({
    flags: '-o, --output <path>',
    description: 'Output path for template (when action is "init")',
  })
  parseOutput(val: string): string {
    return val;
  }

  @Option({
    flags: '-f, --force',
    description: 'Overwrite existing file when generating template',
  })
  parseForce(val: string): boolean {
    return val === undefined || val === 'true';
  }

  @Option({
    flags: '-e, --env <name>',
    description: 'Environment name to preview (development, production, etc.)',
  })
  parseEnv(val: string): string {
    return val;
  }

  async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    const [action] = passedParams;
    const normalized = (action || 'show').toLowerCase();

    switch (normalized) {
      case 'show':
        this.show(options);
        break;
      case 'path':
        this.showPath();
        break;
      case 'init':
        await this.initTemplate(options);
        break;
      default:
        console.log(`Unknown action: ${action}`);
        console.log('Usage: claude-auto-worker config [show|path|init] [options]');
    }
  }

  private show(options?: Record<string, any>): void {
    if (options?.env) {
      process.env.CLAUDE_ENV = options.env;
    }
    try {
      const cfg = this.projectConfig.getResolvedConfig();
      console.log('🔧 Effective Configuration');
      console.log('==========================');
      console.log(JSON.stringify(cfg, null, 2));
      const p = this.projectConfig.getResolvedPath();
      console.log('');
      console.log(`Source: ${p ?? '(defaults + env only)'}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to load configuration:', message);
      process.exit(1);
    }
  }

  private showPath(): void {
    const p = this.projectConfig.getResolvedPath();
    if (p) {
      console.log(p);
    } else {
      console.log('(no config file found; using defaults and environment variables)');
    }
  }

  private async initTemplate(options?: Record<string, any>): Promise<void> {
    try {
      const dest = this.projectConfig.writeTemplate(options?.output, options?.force);
      console.log(`✅ Wrote template to ${dest}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to write template:', message);
      process.exit(1);
    }
  }
}
