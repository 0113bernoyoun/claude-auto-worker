import { Test } from '@nestjs/testing';
import { ConfigCommand } from '../../cli/commands/config.command';
import { ProjectConfigService } from '../../config/project-config.service';

describe('ConfigCommand', () => {
  let command: ConfigCommand;
  let svc: ProjectConfigService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [ConfigCommand, ProjectConfigService],
    }).compile();
    command = moduleRef.get(ConfigCommand);
    svc = moduleRef.get(ProjectConfigService);
  });

  it('shows config without throwing', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    await command.run(['show'], {});
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('prints path when available', async () => {
    jest.spyOn(svc, 'getResolvedPath').mockReturnValue('/tmp/claude.yaml');
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    await command.run(['path'], {});
    expect(spy).toHaveBeenCalledWith('/tmp/claude.yaml');
    spy.mockRestore();
  });

  it('initializes template successfully', async () => {
    const spy = jest.spyOn(svc, 'writeTemplate').mockReturnValue('/tmp/claude.yaml');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    await command.run(['init'], { force: true });
    expect(spy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/Wrote template/));
    logSpy.mockRestore();
  });
});


