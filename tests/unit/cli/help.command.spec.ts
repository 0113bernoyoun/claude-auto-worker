import { Test } from '@nestjs/testing';
import { HelpCommand } from '../../../src/cli/commands/help.command';
import { cliTestHelpers } from '../../setup/cli.setup';

describe('HelpCommand', () => {
  let command: HelpCommand;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [HelpCommand],
    }).compile();
    command = moduleRef.get(HelpCommand);
  });

  describe('기본 도움말', () => {
    it('도움말을 표시할 때 에러가 발생하지 않아야 함', async () => {
      const { outputs, restore } = cliTestHelpers.captureConsoleOutput();
      
      try {
        await command.run([]);
        expect(outputs.some(o => o.type === 'log')).toBe(true);
      } finally {
        restore();
      }
    });

    it('도움말 메시지에 프로젝트 이름이 포함되어야 함', async () => {
      const { outputs, restore } = cliTestHelpers.captureConsoleOutput();
      
      try {
        await command.run([]);
        expect(outputs.some(o => o.message.includes('claude-auto-worker'))).toBe(true);
      } finally {
        restore();
      }
    });
  });

  describe('특정 명령어 도움말', () => {
    it('특정 명령어에 대한 도움말을 표시할 수 있어야 함', async () => {
      const { outputs, restore } = cliTestHelpers.captureConsoleOutput();
      
      try {
        await command.run(['config']);
        expect(outputs.some(o => o.type === 'log')).toBe(true);
      } finally {
        restore();
      }
    });

    it('존재하지 않는 명령어에 대해 적절한 메시지를 표시해야 함', async () => {
      const { outputs, restore } = cliTestHelpers.captureConsoleOutput();
      
      try {
        await command.run(['nonexistent']);
        expect(outputs.some(o => o.type === 'log')).toBe(true);
      } finally {
        restore();
      }
    });
  });

  describe('명령어 목록', () => {
    it('사용 가능한 명령어 목록을 표시해야 함', async () => {
      const { outputs, restore } = cliTestHelpers.captureConsoleOutput();
      
      try {
        await command.run([]);
        const helpOutput = outputs.find(o => o.type === 'log')?.message || '';
        expect(helpOutput).toContain('config');
        expect(helpOutput).toContain('help');
      } finally {
        restore();
      }
    });
  });

  describe('에러 처리', () => {
    it('명령어 실행 중 에러가 발생해도 적절히 처리되어야 함', async () => {
      const { outputs, restore } = cliTestHelpers.captureConsoleOutput();
      
      try {
        const result = await cliTestHelpers.catchErrors(() => 
          command.run(['invalid'])
        );
        expect(outputs.some(o => o.type === 'log')).toBe(true);
      } finally {
        restore();
      }
    });
  });
});
