import * as fs from 'fs';
import * as path from 'path';
import { ProjectConfigService } from '../../../src/config/project-config.service';

jest.mock('fs');

describe('ProjectConfigService', () => {
  const mockedFs = fs as jest.Mocked<typeof fs>;
  let service: ProjectConfigService;
  const cwd = '/tmp/project';

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ProjectConfigService();
    process.env = { ...process.env }; // ensure copy per test
    delete process.env.PORT;
    delete process.env.LOG_LEVEL;
    delete process.env.CLAUDE_API_KEY;
    delete process.env.CLAUDE_MODEL;
    delete process.env.CLAUDE_ENV;
  });

  function mockFile(filePath: string, content: string) {
    mockedFs.existsSync.mockImplementation((p: any) => p === filePath);
    mockedFs.statSync.mockImplementation((p: any) => ({ isFile: () => p === filePath } as any));
    mockedFs.readFileSync.mockImplementation((p: any) => {
      if (p === filePath) return content;
      throw new Error('File not found');
    });
    mockedFs.mkdirSync.mockImplementation(() => undefined as any);
    mockedFs.writeFileSync.mockImplementation(() => undefined as any);
  }

  it('returns defaults when no config file is found', () => {
    mockedFs.existsSync.mockReturnValue(false);
    const config = service.loadConfig(cwd);
    expect(config.port).toBe(5849);
    expect(config.apiPrefix).toBe('/api');
    expect(config.logging.level).toBe('info');
  });

  it('applies env overrides for defaults', () => {
    process.env.PORT = '6000';
    process.env.LOG_LEVEL = 'debug';
    mockedFs.existsSync.mockReturnValue(false);
    const config = service.loadConfig(cwd);
    expect(config.port).toBe(6000);
    expect(config.logging.level).toBe('debug');
  });

  it('loads YAML config file', () => {
    const p = path.join(cwd, 'claude-auto-worker.config.yaml');
    mockFile(p, 'port: 1234\napiPrefix: "/api"\nlogging:\n  level: "warn"\n');
    const cfg = service.loadConfig(cwd);
    expect(cfg.port).toBe(1234);
    expect(cfg.logging.level).toBe('warn');
  });

  it('loads JSON config file', () => {
    const p = path.join(cwd, 'claude-auto-worker.config.json');
    mockFile(p, JSON.stringify({ port: 4321, logging: { level: 'error' } }));
    const cfg = service.loadConfig(cwd);
    expect(cfg.port).toBe(4321);
    expect(cfg.logging.level).toBe('error');
  });

  it('applies environment overlay', () => {
    process.env.CLAUDE_ENV = 'production';
    const p = path.join(cwd, 'claude-auto-worker.config.yaml');
    mockFile(
      p,
      'port: 1111\nlogging:\n  level: info\nenvironments:\n  production:\n    logging:\n      level: error\n',
    );
    const cfg = service.loadConfig(cwd);
    expect(cfg.port).toBe(1111);
    expect(cfg.logging.level).toBe('error');
  });

  it('validates and throws on invalid config', () => {
    const p = path.join(cwd, 'claude-auto-worker.config.yaml');
    mockFile(p, 'apiPrefix: "not-starting-with-slash"\n');
    expect(() => service.loadConfig(cwd)).toThrow(/Invalid configuration/);
  });

  it('writes template to default path', () => {
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.statSync.mockImplementation(() => ({ isFile: () => false } as any));
    const dest = service.writeTemplate(undefined, true);
    expect(dest.endsWith('claude-auto-worker.config.yaml')).toBe(true);
    expect(mockedFs.writeFileSync).toHaveBeenCalled();
  });
});


