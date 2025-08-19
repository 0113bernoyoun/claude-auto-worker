import { Test } from '@nestjs/testing';
import { CliModule } from '../../../src/cli/cli.module';
import { ConfigCommand } from '../../../src/cli/commands/config.command';
import { HelpCommand } from '../../../src/cli/commands/help.command';
import { LogsCommand } from '../../../src/cli/commands/logs.command';
import { RunCommand } from '../../../src/cli/commands/run.command';
import { StatusCommand } from '../../../src/cli/commands/status.command';
import { ErrorHandlerService } from '../../../src/cli/services/error-handler.service';

describe('CliModule', () => {
  let module: CliModule;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CliModule],
    }).compile();
    module = moduleRef.get(CliModule);
  });

  describe('모듈 구성', () => {
    it('모듈이 성공적으로 생성되어야 함', () => {
      expect(module).toBeDefined();
    });

    it('모든 CLI 명령어가 등록되어야 함', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [CliModule],
      }).compile();

      expect(moduleRef.get(ConfigCommand)).toBeDefined();
      expect(moduleRef.get(HelpCommand)).toBeDefined();
      expect(moduleRef.get(StatusCommand)).toBeDefined();
      expect(moduleRef.get(LogsCommand)).toBeDefined();
      expect(moduleRef.get(RunCommand)).toBeDefined();
    });

    it('에러 핸들러 서비스가 등록되어야 함', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [CliModule],
      }).compile();

      expect(moduleRef.get(ErrorHandlerService)).toBeDefined();
    });
  });

  describe('의존성 주입', () => {
    it('모든 명령어가 필요한 의존성을 주입받아야 함', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [CliModule],
      }).compile();

      const configCommand = moduleRef.get(ConfigCommand);
      const helpCommand = moduleRef.get(HelpCommand);
      const statusCommand = moduleRef.get(StatusCommand);
      const logsCommand = moduleRef.get(LogsCommand);
      const runCommand = moduleRef.get(RunCommand);

      expect(configCommand).toBeDefined();
      expect(helpCommand).toBeDefined();
      expect(statusCommand).toBeDefined();
      expect(logsCommand).toBeDefined();
      expect(runCommand).toBeDefined();
    });
  });

  describe('모듈 초기화', () => {
    it('모듈 초기화 시 에러가 발생하지 않아야 함', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [CliModule],
      }).compile();

      await expect(moduleRef.init()).resolves.not.toThrow();
    });
  });
});
