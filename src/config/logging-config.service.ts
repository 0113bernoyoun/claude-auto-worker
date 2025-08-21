import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { DEFAULT_LOGGING_CONFIG, LoggingConfig } from './logging-config.interface';

@Injectable()
export class LoggingConfigService {
  private config: LoggingConfig;
  private configPath: string;

  constructor() {
    this.configPath = this.getConfigFilePath();
    this.config = this.loadConfig();
  }

  private getConfigFilePath(): string {
    const base = process.env.LOG_CONFIG_DIR || process.cwd();
    return path.join(base, 'logging-config.yaml');
  }

  private loadConfig(): LoggingConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf-8');
        const loadedConfig = yaml.load(fileContent) as Partial<LoggingConfig>;
        return this.mergeConfig(DEFAULT_LOGGING_CONFIG, loadedConfig);
      }
    } catch (error) {
      console.warn(`Failed to load logging config from ${this.configPath}:`, error);
    }
    
    // 기본 설정으로 초기화하고 저장
    this.saveConfig(DEFAULT_LOGGING_CONFIG);
    return DEFAULT_LOGGING_CONFIG;
  }

  private mergeConfig(defaultConfig: LoggingConfig, userConfig: Partial<LoggingConfig>): LoggingConfig {
    return {
      ...defaultConfig,
      ...userConfig,
      levels: {
        ...defaultConfig.levels,
        ...userConfig.levels,
      },
      storage: {
        ...defaultConfig.storage,
        ...userConfig.storage,
        rotation: {
          ...defaultConfig.storage.rotation,
          ...userConfig.storage?.rotation,
        },
      },
      display: {
        ...defaultConfig.display,
        ...userConfig.display,
      },
      timeParsing: {
        ...defaultConfig.timeParsing,
        ...userConfig.timeParsing,
      },
    };
  }

  private saveConfig(config: LoggingConfig): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const yamlContent = yaml.dump(config, {
        indent: 2,
        lineWidth: 80,
        noRefs: true,
      });
      
      fs.writeFileSync(this.configPath, yamlContent, 'utf-8');
    } catch (error) {
      console.warn('Failed to save logging config:', error);
    }
  }

  getConfig(): LoggingConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<LoggingConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
    this.saveConfig(this.config);
  }

  // 특정 로그 레벨이 저장 가능한지 확인
  isLevelEnabled(level: string): boolean {
    const normalizedLevel = level.toLowerCase() as keyof LoggingConfig['levels'];
    return this.config.levels[normalizedLevel] ?? false;
  }

  // 로그 저장이 활성화되어 있는지 확인
  isStorageEnabled(): boolean {
    return this.config.storage.enabled;
  }

  // 설정 파일 경로 반환
  getConfigPath(): string {
    return this.configPath;
  }
}
