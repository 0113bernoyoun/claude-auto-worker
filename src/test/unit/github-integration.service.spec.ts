import { Test } from '@nestjs/testing';
import { ProjectConfigService } from '../../config/project-config.service';
import { CommandRunnerService } from '../../core/command-runner.service';
import { GithubIntegrationService } from '../../git/github-integration.service';

describe('GithubIntegrationService (unit)', () => {
  it('should detect cli mode when gh is available and authed', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        GithubIntegrationService,
        {
          provide: ProjectConfigService,
          useValue: { getResolvedConfig: () => ({ github: { enabled: true, mode: 'auto' } }) },
        },
        {
          provide: CommandRunnerService,
          useValue: {
            runShell: jest.fn()
              .mockResolvedValueOnce({ code: 0 }) // gh --version
              .mockResolvedValueOnce({ code: 0 }), // gh auth status
          },
        },
      ],
    }).compile();

    const svc = moduleRef.get(GithubIntegrationService);
    await expect(svc.detectMode('auto')).resolves.toBe('cli');
  });

  it('should fallback to token mode when gh is not available but token exists', async () => {
    const prev = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = 'x';
    const moduleRef = await Test.createTestingModule({
      providers: [
        GithubIntegrationService,
        {
          provide: ProjectConfigService,
          useValue: { getResolvedConfig: () => ({ github: { enabled: true, mode: 'auto' } }) },
        },
        {
          provide: CommandRunnerService,
          useValue: {
            runShell: jest.fn().mockResolvedValue({ code: 1 }),
          },
        },
      ],
    }).compile();

    const svc = moduleRef.get(GithubIntegrationService);
    await expect(svc.detectMode('auto')).resolves.toBe('token');
    if (prev === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = prev;
  });

  it('should fall back to manual when neither gh nor token is available', async () => {
    const prev = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;
    const moduleRef = await Test.createTestingModule({
      providers: [
        GithubIntegrationService,
        {
          provide: ProjectConfigService,
          useValue: { getResolvedConfig: () => ({ github: { enabled: true, mode: 'auto' } }) },
        },
        {
          provide: CommandRunnerService,
          useValue: {
            runShell: jest.fn().mockResolvedValue({ code: 1 }),
          },
        },
      ],
    }).compile();

    const svc = moduleRef.get(GithubIntegrationService);
    await expect(svc.detectMode('auto')).resolves.toBe('manual');
    if (prev !== undefined) process.env.GITHUB_TOKEN = prev;
  });

  it('should force manual when github.enabled=false', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        GithubIntegrationService,
        {
          provide: ProjectConfigService,
          useValue: { getResolvedConfig: () => ({ github: { enabled: false, mode: 'cli' } }) },
        },
        {
          provide: CommandRunnerService,
          useValue: { runShell: jest.fn().mockResolvedValue({ code: 0 }) },
        },
      ],
    }).compile();

    const svc = moduleRef.get(GithubIntegrationService);
    const out = await svc.createPr({ owner: 'o', repo: 'r', base: 'main', head: 'feat', title: 't' }, 'cli');
    expect(out.mode).toBe('manual');
    expect(out.url).toContain('/compare/');
  });

  it('token mode: non-ok response should fall back to manual', async () => {
    const prev = (global as any).fetch;
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false });

    const moduleRef = await Test.createTestingModule({
      providers: [
        GithubIntegrationService,
        {
          provide: ProjectConfigService,
          useValue: { getResolvedConfig: () => ({ github: { enabled: true, mode: 'token' } }) },
        },
        {
          provide: CommandRunnerService,
          useValue: { runShell: jest.fn().mockResolvedValue({ code: 1 }) },
        },
      ],
    }).compile();

    process.env.GITHUB_TOKEN = 'x';
    const svc = moduleRef.get(GithubIntegrationService);
    const out = await svc.createPr({ owner: 'o', repo: 'r', base: 'main', head: 'feat', title: 't' });
    expect(out.mode).toBe('manual');
    expect(out.url).toContain('/compare/');
    if (prev) (global as any).fetch = prev; else delete (global as any).fetch;
    delete process.env.GITHUB_TOKEN;
  });

  it('cli mode: success should return compare URL when stdout unavailable', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        GithubIntegrationService,
        {
          provide: ProjectConfigService,
          useValue: { getResolvedConfig: () => ({ github: { enabled: true, mode: 'cli' } }) },
        },
        {
          provide: CommandRunnerService,
          useValue: {
            runShell: jest.fn()
              .mockResolvedValueOnce({ code: 0 }) // gh --version
              .mockResolvedValueOnce({ code: 0 }) // gh auth status
              .mockResolvedValueOnce({ code: 0 }), // gh pr create
          },
        },
      ],
    }).compile();

    const svc = moduleRef.get(GithubIntegrationService);
    const out = await svc.createPr({ owner: 'o', repo: 'r', base: 'main', head: 'feat', title: 't' });
    expect(out.mode).toBe('cli');
    expect(out.url).toContain('/compare/');
  });
});


