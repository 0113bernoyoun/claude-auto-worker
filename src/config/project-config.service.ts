import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import Joi from 'joi';
import * as yaml from 'js-yaml';
import * as path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ProjectConfig {
  port: number;
  apiPrefix: string;
  logging: {
    level: LogLevel;
  };
  claude?: {
    apiKey?: string;
    model?: string;
  };
  dashboard?: {
    enabled?: boolean;
  };
  github?: {
    enabled?: boolean; // 전체 GitHub 통합 사용 여부
    mode?: 'auto' | 'cli' | 'token' | 'manual'; // 선택 모드
  };
  environments?: Record<string, Partial<ProjectConfig>>;
}

function createDefaultConfig(): ProjectConfig {
  return {
    port: Number(process.env.PORT) || 5849,
    apiPrefix: '/api',
    logging: {
      level: (process.env.LOG_LEVEL as LogLevel) || 'info',
    },
    claude: {
      apiKey: process.env.CLAUDE_API_KEY,
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-latest',
    },
    dashboard: {
      enabled: true,
    },
    github: {
      enabled: process.env.USE_GITHUB ? /^(1|true|yes)$/i.test(process.env.USE_GITHUB) : true,
      mode: (process.env.GITHUB_MODE as any) || 'auto',
    },
  };
}

const schema = Joi.object<ProjectConfig>({
  port: Joi.number().port().default(5849),
  apiPrefix: Joi.string().pattern(/^\//).default('/api'),
  logging: Joi.object({
    level: Joi.string().valid('debug', 'info', 'warn', 'error').default('info'),
  }).default({ level: 'info' }),
  claude: Joi.object({
    apiKey: Joi.string().optional(),
    model: Joi.string().default('claude-3-5-sonnet-latest'),
  }).default(),
  dashboard: Joi.object({
    enabled: Joi.boolean().default(true),
  }).default(),
  github: Joi.object({
    enabled: Joi.boolean().default(true),
    mode: Joi.string().valid('auto', 'cli', 'token', 'manual').default('auto'),
  }).default(),
  environments: Joi.object()
    .pattern(/^[a-zA-Z0-9_-]+$/, Joi.object({}).unknown(true))
    .optional(),
}).unknown(false);

@Injectable()
export class ProjectConfigService {
  private cached: ProjectConfig | null = null;
  private cachedPath: string | null = null;

  getConfigPath(cwd: string = process.cwd()): string | null {
    const candidates = [
      'claude-auto-worker.config.yaml',
      'claude-auto-worker.config.yml',
      'claude-auto-worker.config.json',
      path.join('config', 'claude-auto-worker.yaml'),
      path.join('config', 'claude-auto-worker.yml'),
      path.join('config', 'claude-auto-worker.json'),
      'claude.config.yaml',
      'claude.config.yml',
      'claude.config.json',
    ];

    for (const rel of candidates) {
      const abs = path.isAbsolute(rel) ? rel : path.join(cwd, rel);
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
        return abs;
      }
    }
    return null;
  }

  loadConfig(cwd?: string): ProjectConfig {
    if (this.cached) {
      return this.cached;
    }

    const configPath = this.getConfigPath(cwd);
    this.cachedPath = configPath;

    let loaded: Partial<ProjectConfig> = {};
    if (configPath) {
      const raw = fs.readFileSync(configPath, 'utf8');
      if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
        loaded = (yaml.load(raw) as any) || {};
      } else if (configPath.endsWith('.json')) {
        loaded = JSON.parse(raw);
      }
    }

    const env = process.env.CLAUDE_ENV || process.env.NODE_ENV;
    let merged: ProjectConfig = {
      ...createDefaultConfig(),
      ...(loaded as ProjectConfig),
    };

    if (env && loaded && typeof loaded === 'object' && (loaded as any).environments?.[env]) {
      merged = {
        ...merged,
        ...((loaded as any).environments[env] as Partial<ProjectConfig>),
      } as ProjectConfig;
    }

    const { value, error } = schema.validate(merged, {
      abortEarly: false,
      allowUnknown: false,
    });
    if (error) {
      const msg = error.details.map(d => d.message).join('; ');
      throw new Error(`Invalid configuration: ${msg}`);
    }

    this.cached = value;
    return this.cached;
  }

  getResolvedConfig(): ProjectConfig {
    return this.loadConfig();
  }

  getResolvedPath(): string | null {
    if (this.cachedPath) {
      return this.cachedPath;
    }
    this.cachedPath = this.getConfigPath();
    return this.cachedPath;
  }

  writeTemplate(targetPath?: string, force: boolean = false): string {
    const cwd = process.cwd();
    const dest = targetPath
      ? path.isAbsolute(targetPath)
        ? targetPath
        : path.join(cwd, targetPath)
      : path.join(cwd, 'claude-auto-worker.config.yaml');

    if (fs.existsSync(dest) && !force) {
      throw new Error(`Config file already exists at ${dest}. Use --force to overwrite.`);
    }

    const template: ProjectConfig = {
      port: 5849,
      apiPrefix: '/api',
      logging: { level: 'info' },
      claude: { apiKey: 'YOUR_CLAUDE_API_KEY', model: 'claude-3-5-sonnet-latest' },
      dashboard: { enabled: true },
      environments: {
        development: {
          logging: { level: 'debug' },
        },
        production: {
          logging: { level: 'warn' },
        },
      },
    };

    const yamlContent = yaml.dump(template, { lineWidth: 120, noRefs: true });
    const dir = path.dirname(dest);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dest, yamlContent, 'utf8');
    return dest;
  }
}
