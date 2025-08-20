import { Test } from '@nestjs/testing';
import { StatusCommand } from '../../../src/cli/commands/status.command';
import { cliTestHelpers } from '../../setup/cli.setup';
import { FileLoggerService } from '../../../src/core/file-logger.service';

describe('StatusCommand', () => {
  let command: StatusCommand;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [StatusCommand, FileLoggerService],
    }).compile();
    command = moduleRef.get(StatusCommand);
  });

  describe('상태 확인', () => {
    it('상태를 표시할 때 에러가 발생하지 않아야 함', async () => {
      const { outputs, restore } = cliTestHelpers.captureConsoleOutput();
      
      try {
        await command.run([], {});
        expect(outputs.some(o => o.type === 'log')).toBe(true);
      } finally {
        restore();
      }
    });

    it('상태 메시지에 적절한 정보가 포함되어야 함', async () => {
      const { outputs, restore } = cliTestHelpers.captureConsoleOutput();
      
      try {
        await command.run([], {});
        const statusOutput = outputs.find(o => o.type === 'log')?.message || '';
        expect(statusOutput).toContain('Status');
      } finally {
        restore();
      }
    });
  });

  describe('상세 상태', () => {
    it('상세 옵션이 있을 때 더 많은 정보를 표시해야 함', async () => {
      const { outputs, restore } = cliTestHelpers.captureConsoleOutput();
      
      try {
        await command.run([], { detailed: true });
        expect(outputs.some(o => o.type === 'log')).toBe(true);
      } finally {
        restore();
      }
    });
  });

  describe('에러 처리', () => {
    it('상태 확인 중 에러가 발생해도 적절히 처리되어야 함', async () => {
      const { outputs, restore } = cliTestHelpers.captureConsoleOutput();
      
      try {
        const result = await cliTestHelpers.catchErrors(() => 
          command.run([], {})
        );
        expect(outputs.some(o => o.type === 'log')).toBe(true);
      } finally {
        restore();
      }
    });
  });
});
