import { Test } from '@nestjs/testing';
import { GitService } from '../../git/git.service';
import { GIT_BASE_DIR } from '../../git/git.tokens';

describe('GitService (unit)', () => {
  it('should return false for repo checks when outside a git repo and warn only once', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        GitService,
        { provide: GIT_BASE_DIR, useValue: '/tmp' },
      ],
    }).compile();

    const service = moduleRef.get(GitService);
    (service as any).logger = { warn: jest.fn(), debug: jest.fn() };

    const isRepo = await service.isRepository();
    expect(isRepo).toBe(false);

    const first = await service.ensureRepo();
    expect(first).toBe(false);

    const second = await service.ensureRepo();
    expect(second).toBe(false);

    // ensure only first call warns, subsequent call uses debug
    const logger = (service as any).logger;
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledTimes(1);
  });

  it('should no-op commit/push when not a repo', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        GitService,
        { provide: GIT_BASE_DIR, useValue: '/tmp' },
      ],
    }).compile();

    const service = moduleRef.get(GitService);
    await expect(service.commitAll('msg')).resolves.toBeUndefined();
    await expect(service.pushCurrentBranch()).resolves.toBe(false);
  });
});


